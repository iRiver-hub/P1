(function () {
  if (!AdminAPI.getToken()) {
    location.href = "index.html";
    return;
  }

  var titles = {
    dashboard: "概览",
    orders: "订单管理",
    designs: "设计库",
    contacts: "留言管理",
    products: "商品 / SKU",
    users: "用户",
    audit: "审计日志"
  };

  var content = document.getElementById("content");
  var pageTitle = document.getElementById("page-title");
  var currentView = "dashboard";
  var selectedOrderId = null;

  function badge(status) {
    return '<span class="badge badge--' + status + '">' + status + '</span>';
  }

  function fmtMoney(n) {
    return "$" + Number(n || 0).toFixed(2);
  }

  function fmtDate(s) {
    return (s || "").slice(0, 19).replace("T", " ");
  }

  function setView(view) {
    currentView = view;
    pageTitle.textContent = titles[view] || view;
    document.querySelectorAll(".nav-item").forEach(function (el) {
      el.classList.toggle("active", el.getAttribute("data-view") === view);
    });
    if (view === "dashboard") renderDashboard();
    else if (view === "orders") selectedOrderId ? renderOrderDetail(selectedOrderId) : renderOrders();
    else if (view === "designs") renderDesigns();
    else if (view === "contacts") renderContacts();
    else if (view === "products") renderProducts();
    else if (view === "users") renderUsers();
    else if (view === "audit") renderAudit();
  }

  function renderDashboard() {
    content.innerHTML = '<div class="empty">加载中...</div>';
    AdminAPI.getStats().then(function (data) {
      var s = data.stats;
      content.innerHTML =
        '<div class="stats-grid">' +
        statCard("今日订单", s.ordersToday) +
        statCard("今日收入", fmtMoney(s.revenueToday)) +
        statCard("待处理", s.pendingOrders) +
        statCard("总订单", s.totalOrders) +
        statCard("总收入", fmtMoney(s.totalRevenue)) +
        statCard("新留言", s.newContacts) +
        statCard("用户数", data.userCount) +
        statCard("设计数", data.designCount) +
        '</div>' +
        '<div class="panel"><div class="panel__head"><h3>快捷操作</h3></div><div class="panel__body detail-section">' +
        '<button class="btn btn--primary btn--sm" data-go="orders">查看订单</button> ' +
        '<button class="btn btn--ghost btn--sm" data-go="contacts">查看留言</button> ' +
        '<button class="btn btn--ghost btn--sm" data-go="products">管理商品</button>' +
        '</div></div>';
    }).catch(showError);
  }

  function statCard(label, value) {
    return '<div class="stat-card"><div class="stat-card__label">' + label + '</div><div class="stat-card__value">' + value + '</div></div>';
  }

  function renderOrders() {
    selectedOrderId = null;
    var status = document.getElementById("order-filter") ? document.getElementById("order-filter").value : "";
    content.innerHTML =
      '<div class="panel"><div class="panel__head"><h3>全部订单</h3>' +
      '<div class="toolbar"><select id="order-filter"><option value="">全部状态</option>' +
      ['pending','paid','in_production','shipped','delivered','cancelled','refunded'].map(function (s) {
        return '<option value="' + s + '"' + (status === s ? ' selected' : '') + '>' + s + '</option>';
      }).join('') +
      '<button class="btn btn--ghost btn--sm" id="order-refresh">刷新</button></div></div>' +
      '<div class="panel__body" id="orders-table"><div class="empty">加载中...</div></div></div>';

    document.getElementById("order-filter").addEventListener("change", renderOrders);
    document.getElementById("order-refresh").addEventListener("click", renderOrders);

    AdminAPI.getOrders(status || undefined).then(function (data) {
      var orders = data.orders || [];
      if (!orders.length) {
        document.getElementById("orders-table").innerHTML = '<div class="empty">暂无订单</div>';
        return;
      }
      document.getElementById("orders-table").innerHTML =
        '<table><thead><tr><th>ID</th><th>用户</th><th>金额</th><th>数量</th><th>状态</th><th>支付</th><th>时间</th><th></th></tr></thead><tbody>' +
        orders.map(function (o) {
          return '<tr><td>#' + o.id + '</td><td>' + (o.username || o.userId) + '</td><td>' + fmtMoney(o.total) + '</td>' +
            '<td>' + o.totalQuantity + '</td><td>' + badge(o.status) + '</td><td>' + badge(o.paymentStatus) + '</td>' +
            '<td>' + fmtDate(o.createdAt) + '</td><td><button class="btn btn--ghost btn--sm" data-order-id="' + o.id + '">详情</button></td></tr>';
        }).join('') + '</tbody></table>';
    }).catch(showError);
  }

  function renderOrderDetail(id) {
    selectedOrderId = id;
    content.innerHTML = '<div class="empty">加载订单 #' + id + '...</div>';
    AdminAPI.getOrder(id).then(function (data) {
      var o = data.order;
      var statusOptions = ['pending','paid','in_production','shipped','delivered','cancelled','refunded']
        .map(function (s) { return '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('');

      var itemsHtml = (o.items || []).map(function (item) {
        var preview = item.designId
          ? '<a href="' + AdminAPI.previewUrl(item.designId) + '" target="_blank"><img class="preview-img" src="' + AdminAPI.previewUrl(item.designId) + '" alt="" /></a>'
          : '—';
        return '<tr><td>#' + item.designId + '</td><td>' + item.styleId + '</td><td>' + (item.sizeLabel || item.size) + '</td><td>' + item.quantity + '</td><td>' + fmtMoney(item.unitPrice * item.quantity) + '</td><td>' + preview + '</td></tr>';
      }).join('');

      content.innerHTML =
        '<div class="toolbar" style="margin-bottom:16px">' +
        '<button class="btn btn--ghost btn--sm" id="back-orders">← 返回列表</button>' +
        '<a class="btn btn--primary btn--sm" href="' + AdminAPI.productionPackUrl(o.id) + '" target="_blank" id="export-pack">导出生产包</a>' +
        '</div>' +
        '<div class="detail-grid">' +
        '<div class="panel"><div class="panel__head"><h3>订单 #' + o.id + '</h3>' + badge(o.status) + '</div><div class="detail-section">' +
        detailRow('用户', o.username || o.userId) +
        detailRow('邮箱', o.email) +
        detailRow('小计', fmtMoney(o.subtotal)) +
        detailRow('折扣', o.discountPercent ? o.discountPercent + '% (-' + fmtMoney(o.discountAmount) + ')' : '—') +
        detailRow('总计', fmtMoney(o.total)) +
        detailRow('加购', (o.addons && o.addons.length) ? o.addons.join(', ') + ' ($' + (o.addonTotal || 0).toFixed(2) + ')' : '—') +
        detailRow('运费', o.shippingFee ? fmtMoney(o.shippingFee) : '—') +
        detailRow('支付', o.paymentStatus) +
        detailRow('创建', fmtDate(o.createdAt)) +
        detailRow('备注', o.notes || '—') +
        '<div style="margin-top:16px"><label style="font-size:.85rem;color:var(--muted)">更改状态</label>' +
        '<div class="toolbar" style="margin-top:8px"><select id="status-select">' + statusOptions + '</select>' +
        '<button class="btn btn--primary btn--sm" id="status-save">更新</button></div></div>' +
        (o.status === 'paid' || o.status === 'in_production' ? '<button class="btn btn--primary btn--sm" style="margin-top:12px" id="open-ship">填写物流并发货</button>' : '') +
        (o.shipment ? detailRow('物流', o.shipment.carrier + ' · ' + o.shipment.trackingNo) : '') +
        '</div></div>' +
        '<div class="panel"><div class="panel__head"><h3>收货地址</h3></div><div class="detail-section">' +
        detailRow('姓名', o.shippingName) +
        detailRow('地址', o.shippingAddress) +
        detailRow('城市', o.shippingCity + (o.shippingState ? ', ' + o.shippingState : '')) +
        detailRow('邮编', o.shippingZip || '—') +
        detailRow('国家', o.shippingCountry) +
        '</div></div></div>' +
        '<div class="panel"><div class="panel__head"><h3>订单商品</h3></div><div class="panel__body">' +
        '<table><thead><tr><th>设计</th><th>风格</th><th>尺寸</th><th>数量</th><th>小计</th><th>预览</th></tr></thead><tbody>' + itemsHtml + '</tbody></table></div></div>';

      document.getElementById("back-orders").addEventListener("click", function () { selectedOrderId = null; renderOrders(); });
      document.getElementById("status-save").addEventListener("click", function () {
        AdminAPI.updateOrderStatus(o.id, document.getElementById("status-select").value)
          .then(function () { renderOrderDetail(o.id); })
          .catch(showError);
      });
      var shipBtn = document.getElementById("open-ship");
      if (shipBtn) {
        shipBtn.addEventListener("click", function () {
          document.getElementById("ship-order-id").value = o.id;
          document.getElementById("ship-modal").classList.add("show");
        });
      }
      var exportBtn = document.getElementById("export-pack");
      if (exportBtn) {
        exportBtn.addEventListener("click", function (e) {
          e.preventDefault();
          fetch(AdminAPI.productionPackUrl(o.id), {
            headers: { Authorization: "Bearer " + AdminAPI.getToken() }
          }).then(function (res) {
            if (!res.ok) throw new Error("Export failed");
            return res.blob();
          }).then(function (blob) {
            var a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "order-" + o.id + "-production.zip";
            a.click();
          }).catch(showError);
        });
      }
    }).catch(showError);
  }

  function detailRow(label, value) {
    return '<div class="detail-row"><span style="color:var(--muted)">' + label + '</span><span>' + (value || '—') + '</span></div>';
  }

  function renderDesigns() {
    content.innerHTML = '<div class="panel"><div class="panel__body"><div class="empty">加载中...</div></div></div>';
    AdminAPI.getDesigns().then(function (data) {
      var designs = data.designs || [];
      content.innerHTML =
        '<div class="panel"><div class="panel__head"><h3>已确认设计 (' + designs.length + ')</h3></div><div class="panel__body">' +
        (designs.length ? '<table><thead><tr><th>ID</th><th>用户</th><th>风格</th><th>Session</th><th>锁定时间</th><th>预览</th></tr></thead><tbody>' +
        designs.map(function (d) {
          return '<tr><td>#' + d.id + '</td><td>' + (d.userId || '—') + '</td><td>' + d.styleId + '</td><td>#' + d.sessionId + '</td><td>' + fmtDate(d.lockedAt) + '</td>' +
            '<td><a href="' + AdminAPI.previewUrl(d.id) + '" target="_blank">查看</a></td></tr>';
        }).join('') + '</tbody></table>' : '<div class="empty">暂无设计</div>') + '</div></div>';
    }).catch(showError);
  }

  function renderContacts() {
    content.innerHTML = '<div class="panel"><div class="panel__body"><div class="empty">加载中...</div></div></div>';
    AdminAPI.getContacts().then(function (data) {
      var list = data.contacts || [];
      content.innerHTML =
        '<div class="panel"><div class="panel__head"><h3>用户留言 (' + list.length + ')</h3></div><div class="panel__body">' +
        (list.length ? '<table><thead><tr><th>ID</th><th>姓名</th><th>邮箱</th><th>主题</th><th>状态</th><th>时间</th><th>操作</th></tr></thead><tbody>' +
        list.map(function (c) {
          return '<tr><td>#' + c.id + '</td><td>' + c.name + '</td><td>' + c.email + '</td><td>' + (c.subject || '—') + '</td><td>' + badge(c.status) + '</td><td>' + fmtDate(c.createdAt) + '</td>' +
            '<td><select data-contact-id="' + c.id + '" class="contact-status"><option value="new"' + (c.status === 'new' ? ' selected' : '') + '>new</option><option value="read"' + (c.status === 'read' ? ' selected' : '') + '>read</option><option value="replied"' + (c.status === 'replied' ? ' selected' : '') + '>replied</option></select></td></tr>' +
            '<tr><td colspan="7" style="color:var(--muted);font-size:.85rem">' + escapeHtml(c.message) + '</td></tr>';
        }).join('') + '</tbody></table>' : '<div class="empty">暂无留言</div>') + '</div></div>';
    }).catch(showError);
  }

  function renderProducts() {
    content.innerHTML = '<div class="empty">加载中...</div>';
    AdminAPI.getProducts().then(function (data) {
      var products = data.products || [];
      content.innerHTML =
        '<div class="panel"><div class="panel__head"><h3>SKU 定价</h3></div><div class="panel__body">' +
        '<table><thead><tr><th>ID</th><th>尺寸 (cm)</th><th>价格 USD</th><th>状态</th><th>操作</th></tr></thead><tbody>' +
        products.map(function (p) {
          return '<tr data-product-id="' + p.id + '"><td>' + p.id + '</td><td>' + p.widthCm + '×' + p.heightCm + '</td>' +
            '<td><input type="number" step="0.01" value="' + p.price + '" data-field="price" style="width:90px" /></td>' +
            '<td>' + (p.active ? '上架' : '下架') + '</td>' +
            '<td><button class="btn btn--primary btn--sm" data-save-product="' + p.id + '">保存</button></td></tr>';
        }).join('') + '</tbody></table></div></div>' +
        '<div class="panel"><div class="panel__head"><h3>批量折扣</h3></div><div class="panel__body detail-section">' +
        (data.discountTiers || []).map(function (t) {
          return detailRow(t.minQty + '+ 件', t.percent + '% off');
        }).join('') + '</div></div>';
    }).catch(showError);
  }

  function renderUsers() {
    content.innerHTML = '<div class="empty">加载中...</div>';
    AdminAPI.getUsers().then(function (data) {
      var users = data.users || [];
      content.innerHTML =
        '<div class="panel"><div class="panel__head"><h3>注册用户 (' + data.total + ')</h3></div><div class="panel__body">' +
        '<table><thead><tr><th>ID</th><th>用户名</th><th>邮箱</th><th>角色</th><th>注册</th><th>最后登录</th></tr></thead><tbody>' +
        users.map(function (u) {
          return '<tr><td>#' + u.id + '</td><td>' + u.username + '</td><td>' + u.email + '</td><td>' + (u.role || 'user') + '</td><td>' + fmtDate(u.created_at) + '</td><td>' + fmtDate(u.last_login) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }).catch(showError);
  }

  function renderAudit() {
    content.innerHTML = '<div class="empty">加载中...</div>';
    AdminAPI.getAudit().then(function (data) {
      var logs = data.logs || [];
      content.innerHTML =
        '<div class="panel"><div class="panel__head"><h3>审计日志</h3></div><div class="panel__body">' +
        (logs.length ? '<table><thead><tr><th>时间</th><th>操作者</th><th>动作</th><th>对象</th><th>详情</th></tr></thead><tbody>' +
        logs.map(function (l) {
          return '<tr><td>' + fmtDate(l.createdAt) + '</td><td>' + l.actor + '</td><td>' + l.action + '</td><td>' + l.entityType + ' #' + l.entityId + '</td><td><code>' + escapeHtml(JSON.stringify(l.details)) + '</code></td></tr>';
        }).join('') + '</tbody></table>' : '<div class="empty">暂无日志</div>') + '</div></div>';
    }).catch(showError);
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function showError(err) {
    content.innerHTML = '<div class="panel"><div class="panel__body"><p class="err">' + escapeHtml(err.message || String(err)) + '</p></div></div>';
  }

  document.querySelectorAll(".nav-item").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      selectedOrderId = null;
      setView(el.getAttribute("data-view"));
    });
  });

  document.getElementById("logout-btn").addEventListener("click", function () {
    AdminAPI.clearToken();
    location.href = "index.html";
  });

  document.getElementById("content").addEventListener("click", function (e) {
    var orderBtn = e.target.closest("[data-order-id]");
    if (orderBtn) {
      renderOrderDetail(parseInt(orderBtn.getAttribute("data-order-id"), 10));
      return;
    }
    var goBtn = e.target.closest("[data-go]");
    if (goBtn) setView(goBtn.getAttribute("data-go"));
    var saveBtn = e.target.closest("[data-save-product]");
    if (saveBtn) {
      var row = saveBtn.closest("tr");
      var price = parseFloat(row.querySelector('[data-field="price"]').value);
      AdminAPI.updateProduct(saveBtn.getAttribute("data-save-product"), { price: price })
        .then(function () { alert("已保存"); })
        .catch(function (err) { alert(err.message); });
    }
  });

  document.getElementById("content").addEventListener("change", function (e) {
    if (e.target.classList.contains("contact-status")) {
      var id = parseInt(e.target.getAttribute("data-contact-id"), 10);
      AdminAPI.updateContact(id, e.target.value).catch(function (err) { alert(err.message); });
    }
  });

  document.getElementById("ship-cancel").addEventListener("click", function () {
    document.getElementById("ship-modal").classList.remove("show");
  });

  document.getElementById("ship-submit").addEventListener("click", function () {
    var id = parseInt(document.getElementById("ship-order-id").value, 10);
    var carrier = document.getElementById("ship-carrier").value.trim();
    var tracking = document.getElementById("ship-tracking").value.trim();
    if (!carrier || !tracking) { alert("请填写快递公司和运单号"); return; }
    AdminAPI.shipOrder(id, carrier, tracking).then(function () {
      document.getElementById("ship-modal").classList.remove("show");
      renderOrderDetail(id);
    }).catch(function (err) { alert(err.message); });
  });

  setView("dashboard");
})();
