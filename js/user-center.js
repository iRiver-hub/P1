(function () {
  var API_BASE = window.API_BASE || "http://localhost:3000/api";

  function statusLabel(status) {
    var map = {
      pending: "待支付",
      paid: "已支付",
      in_production: "生产中",
      shipped: "已发货",
      delivered: "已完成",
      cancelled: "已取消",
      refunded: "已退款"
    };
    return map[status] || status;
  }

  function fmtMoney(n) {
    return "$" + Number(n || 0).toFixed(2);
  }

  function fmtDate(s) {
    return (s || "").slice(0, 10);
  }

  function loadOrders() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", API_BASE + "/orders");
    xhr.setRequestHeader("Authorization", "Bearer " + window.AuthService.getToken());
    xhr.onload = function () {
      var list = document.getElementById("orders-list");
      if (xhr.status !== 200) {
        list.innerHTML = "<p>Failed to load orders.</p>";
        return;
      }
      var data = JSON.parse(xhr.responseText);
      var orders = data.orders || [];
      if (!orders.length) {
        list.innerHTML = "<p>No orders yet. <a href=\"../index.html#customizer\">Create your first magnet</a></p>";
        return;
      }
      list.innerHTML = orders.map(function (o) {
        var items = (o.items || []).map(function (i) {
          return "<li>Design #" + i.designId + " × " + i.quantity + " — " + (i.styleId || "") + "</li>";
        }).join("");
        var payBtn = (o.paymentStatus !== "paid" && o.status === "pending")
          ? "<button class=\"btn btn--primary btn--sm pay-btn\" data-pay-order=\"" + o.id + "\">Pay Now</button>"
          : "";
        var tracking = o.shipment
          ? "<p class=\"order-card__meta\">Tracking: " + o.shipment.carrier + " " + o.shipment.trackingNo + "</p>"
          : "";
        return (
          "<article class=\"order-card\">" +
          "<div class=\"order-card__head\">" +
          "<div><strong>Order #" + o.id + "</strong><div class=\"order-card__meta\">" + fmtDate(o.createdAt) + "</div></div>" +
          "<div><span class=\"status-badge " + o.status + "\">" + statusLabel(o.status) + "</span> " +
          "<strong>" + fmtMoney(o.total) + "</strong></div></div>" +
          "<ul class=\"order-items\">" + items + "</ul>" +
          tracking + payBtn +
          "</article>"
        );
      }).join("");
    };
    xhr.send();
  }

  function checkPaymentBanner() {
    var params = new URLSearchParams(location.search);
    if (params.get("payment") === "success") {
      var banner = document.getElementById("payment-banner");
      banner.textContent = "Payment successful! Order #" + (params.get("order") || "") + " is confirmed.";
      banner.hidden = false;
    }
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-pay-order]");
    if (!btn) return;
    var orderId = btn.getAttribute("data-pay-order");
    var xhr = new XMLHttpRequest();
    xhr.open("POST", API_BASE + "/payments/create-checkout/" + orderId);
    xhr.setRequestHeader("Authorization", "Bearer " + window.AuthService.getToken());
    xhr.onload = function () {
      var data = JSON.parse(xhr.responseText);
      if (data.checkoutUrl) location.href = data.checkoutUrl;
      else alert(data.error || "Payment unavailable");
    };
    xhr.send();
  });

  window.addEventListener("DOMContentLoaded", function () {
    checkPaymentBanner();
    if (!window.AuthService.isLoggedIn()) {
      document.getElementById("login-prompt").hidden = false;
      return;
    }
    var user = window.AuthService.getUser();
    document.getElementById("user-name").textContent = user.username;
    document.getElementById("account-content").hidden = false;
    loadOrders();
  });
})();
