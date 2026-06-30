(function () {
  var CART_KEY = "river-cart";

  function load() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function save(items) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) {}
    updateUI();
  }

  function uid() {
    return "c_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  }

  function formatMoney(n) {
    if (window.ProductCatalog) return window.ProductCatalog.formatMoney(n);
    return "$" + Number(n).toFixed(2);
  }

  function calcTotals(items) {
    if (window.ProductCatalog) return window.ProductCatalog.calcTotals(items);
    var subtotal = items.reduce(function (s, i) { return s + i.unitPrice * i.quantity; }, 0);
    var totalQty = items.reduce(function (s, i) { return s + i.quantity; }, 0);
    return { subtotal: subtotal, totalQty: totalQty, discountPercent: 0, discountAmount: 0, total: subtotal };
  }

  function itemSizeText(item) {
    if (window.ProductCatalog && item.sizeId) {
      return window.ProductCatalog.getSizeLabel(item.sizeId);
    }
    if (item.widthCm && item.heightCm) {
      return item.widthCm + "\u00d7" + item.heightCm + " cm";
    }
    return item.sizeLabel || "";
  }

  window.CartService = {
    getItems: load,

    addItem: function (item) {
      var items = load();
      var existing = items.find(function (i) {
        if (item.sessionId && item.candidateId) {
          return i.sessionId === item.sessionId && i.candidateId === item.candidateId && i.sizeId === item.sizeId;
        }
        return i.designId === item.designId && i.sizeId === item.sizeId;
      });
      if (existing) {
        existing.quantity += item.quantity || 1;
      } else {
        items.push({
          cartId: uid(),
          designId: item.designId || null,
          sessionId: item.sessionId || null,
          candidateId: item.candidateId || null,
          styleId: item.styleId,
          sizeId: item.sizeId,
          sizeLabel: item.sizeLabel,
          widthCm: item.widthCm,
          heightCm: item.heightCm,
          unitPrice: item.unitPrice,
          quantity: item.quantity || 1,
          previewUrl: item.previewUrl,
          fridgeType: item.fridgeType || "french-door",
          dim: item.dim
        });
      }
      save(items);
      return items;
    },

    updateQty: function (cartId, quantity) {
      var items = load();
      var item = items.find(function (i) { return i.cartId === cartId; });
      if (!item) return items;
      item.quantity = Math.max(1, Math.min(100, quantity));
      save(items);
      return items;
    },

    removeItem: function (cartId) {
      var items = load().filter(function (i) { return i.cartId !== cartId; });
      save(items);
      return items;
    },

    clear: function () {
      save([]);
    },

    getTotals: function () {
      return calcTotals(load());
    },

    getCount: function () {
      return load().reduce(function (n, i) { return n + i.quantity; }, 0);
    }
  };

  function imageUrl(path) {
    if (!path) return "";
    if (path.startsWith("http") || path.startsWith("data:")) return path;
    if (!window.API_BASE) return path;
    return window.API_BASE.replace(/\/api\/?$/, "") + path;
  }

  function renderLinesHtml(items, compact) {
    if (!items.length) {
      return "";
    }
    return items.map(function (item) {
      var lineTotal = formatMoney(item.unitPrice * item.quantity);
      var meta = item.styleId + " \u00b7 " + itemSizeText(item);
      if (compact) {
        return (
          "<div class=\"cart-line cart-line--compact\" data-cart-id=\"" + item.cartId + "\">" +
          "<img class=\"cart-line__img\" src=\"" + imageUrl(item.previewUrl) + "\" alt=\"\" width=\"48\" height=\"48\" loading=\"lazy\" />" +
          "<div class=\"cart-line__main\">" +
          "<strong class=\"cart-line__title\">#" + (item.designId || item.candidateId) + "</strong>" +
          "<span class=\"cart-line__meta\">" + meta + "</span>" +
          "</div>" +
          "<div class=\"cart-line__actions\">" +
          "<div class=\"cart-line__qty\">" +
          "<button type=\"button\" class=\"cart-qty-btn\" data-cart-minus aria-label=\"Decrease\">-</button>" +
          "<span>" + item.quantity + "</span>" +
          "<button type=\"button\" class=\"cart-qty-btn\" data-cart-plus aria-label=\"Increase\">+</button>" +
          "</div>" +
          "<span class=\"cart-line__subtotal\">" + lineTotal + "</span>" +
          "<button type=\"button\" class=\"cart-line__remove\" data-cart-remove aria-label=\"Remove\">\u00d7</button>" +
          "</div></div>"
        );
      }
      return (
        "<div class=\"cart-line\" data-cart-id=\"" + item.cartId + "\">" +
        "<img class=\"cart-line__img\" src=\"" + imageUrl(item.previewUrl) + "\" alt=\"\" width=\"56\" height=\"56\" loading=\"lazy\" />" +
        "<div class=\"cart-line__info\">" +
        "<strong>#" + (item.designId || item.candidateId) + "</strong>" +
        "<span>" + meta + "</span>" +
        "</div>" +
        "<div class=\"cart-line__qty\">" +
        "<button type=\"button\" class=\"cart-qty-btn\" data-cart-minus aria-label=\"Decrease\">-</button>" +
        "<span>" + item.quantity + "</span>" +
        "<button type=\"button\" class=\"cart-qty-btn\" data-cart-plus aria-label=\"Increase\">+</button>" +
        "</div>" +
        "<span class=\"cart-line__subtotal\">" + lineTotal + "</span>" +
        "<button type=\"button\" class=\"cart-line__remove\" data-cart-remove aria-label=\"Remove\">\u00d7</button>" +
        "</div>"
      );
    }).join("");
  }

  function openCartDrawer() {
    var drawer = document.querySelector("[data-cart-drawer]");
    if (!drawer) return;
    drawer.hidden = false;
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("cart-drawer-open");
  }

  function closeCartDrawer() {
    var drawer = document.querySelector("[data-cart-drawer]");
    if (!drawer) return;
    drawer.hidden = true;
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("cart-drawer-open");
  }

  function setPromoText(el, totals) {
    if (!el) return;
    if (totals.discountPercent > 0) {
      el.removeAttribute("data-lang-key");
      var tpl = window.t ? window.t("discount-applied") : "{n}% off applied";
      el.textContent = tpl.replace("{n}", String(totals.discountPercent));
      el.classList.add("checkout-promo--active");
    } else if (totals.totalQty === 1) {
      el.setAttribute("data-lang-key", "discount-promo-hint");
      el.classList.remove("checkout-promo--active");
      if (window.t) el.textContent = window.t("discount-promo-hint");
    } else {
      el.setAttribute("data-lang-key", "discount-promo");
      el.classList.remove("checkout-promo--active");
      if (window.t) el.textContent = window.t("discount-promo");
    }
  }

  function updateUI() {
    var items = load();
    var totals = calcTotals(items);
    var count = totals.totalQty;
    var hasItems = items.length > 0;

    document.querySelectorAll("[data-cart-count]").forEach(function (el) {
      el.textContent = String(count);
      el.hidden = count === 0;
    });

    var checkoutLines = document.querySelector("[data-cart-lines]");
    if (checkoutLines) {
      checkoutLines.innerHTML = renderLinesHtml(items, true);
      checkoutLines.hidden = !hasItems;
    }

    var drawerLines = document.querySelector("[data-cart-drawer-lines]");
    if (drawerLines) {
      if (!hasItems) {
        drawerLines.innerHTML = "<p class=\"cart-empty\" data-lang-key=\"cart-empty\">" + (window.t ? window.t("cart-empty") : "Your cart is empty.") + "</p>";
      } else {
        drawerLines.innerHTML = renderLinesHtml(items, false);
      }
    }

    var subEl = document.querySelector("[data-cart-subtotal]");
    var discEl = document.querySelector("[data-cart-discount]");
    var discRow = document.querySelector("[data-cart-discount-row]");
    var totalEl = document.querySelector("[data-cart-total]");
    var drawerSub = document.querySelector("[data-cart-drawer-subtotal]");
    var drawerDisc = document.querySelector("[data-cart-drawer-discount]");
    var drawerDiscRow = document.querySelector("[data-cart-drawer-discount-row]");
    var drawerTotal = document.querySelector("[data-cart-drawer-total]");
    var banner = document.querySelector("[data-discount-banner]");
    var drawerPromo = document.querySelector("[data-cart-drawer-promo]");

    if (subEl) subEl.textContent = formatMoney(totals.subtotal);
    if (drawerSub) drawerSub.textContent = formatMoney(totals.subtotal);
    if (totalEl) totalEl.textContent = formatMoney(totals.total);
    if (drawerTotal) drawerTotal.textContent = formatMoney(totals.total);
    if (discEl) discEl.textContent = "-" + formatMoney(totals.discountAmount);
    if (drawerDisc) drawerDisc.textContent = "-" + formatMoney(totals.discountAmount);
    if (discRow) discRow.hidden = totals.discountPercent === 0;
    if (drawerDiscRow) drawerDiscRow.hidden = totals.discountPercent === 0;

    setPromoText(banner, totals);
    setPromoText(drawerPromo, totals);

    var placeBtn = document.querySelector("[data-place-order-btn]");
    var amountEl = document.querySelector("[data-place-order-total]");
    var warning = document.querySelector("[data-checkout-design-warning]");
    var totalsBlock = document.querySelector(".checkout-summary__totals");
    var orderConfirm = document.querySelector("[data-order-confirm-check]");

    if (placeBtn) placeBtn.disabled = !hasItems || (orderConfirm && !orderConfirm.checked);
    if (amountEl) {
      amountEl.textContent = hasItems ? formatMoney(totals.total) : "";
      amountEl.hidden = !hasItems;
    }
    if (warning) warning.hidden = hasItems;
    if (totalsBlock) totalsBlock.hidden = !hasItems;
    if (banner) banner.hidden = !hasItems;
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-cart-open]")) {
      e.preventDefault();
      openCartDrawer();
      return;
    }
    if (e.target.closest("[data-cart-drawer-close]")) {
      e.preventDefault();
      closeCartDrawer();
      return;
    }
    if (e.target.closest("[data-cart-drawer-checkout]")) {
      closeCartDrawer();
      return;
    }

    var line = e.target.closest(".cart-line");
    if (!line) return;
    var id = line.getAttribute("data-cart-id");
    if (e.target.closest("[data-cart-remove]")) {
      window.CartService.removeItem(id);
    } else if (e.target.closest("[data-cart-minus]")) {
      var item = load().find(function (i) { return i.cartId === id; });
      if (item) window.CartService.updateQty(id, item.quantity - 1);
    } else if (e.target.closest("[data-cart-plus]")) {
      var item2 = load().find(function (i) { return i.cartId === id; });
      if (item2) window.CartService.updateQty(id, item2.quantity + 1);
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeCartDrawer();
  });

  document.addEventListener("change", function (e) {
    if (e.target.matches("[data-order-confirm-check]")) updateUI();
  });

  window.updateCartUI = updateUI;
  window.openCartDrawer = openCartDrawer;
  window.closeCartDrawer = closeCartDrawer;
  updateUI();
})();
