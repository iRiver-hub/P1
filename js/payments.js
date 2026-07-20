(function () {
  var config = null;
  var configPromise = null;

  function fetchConfig() {
    if (configPromise) return configPromise;
    configPromise = new Promise(function (resolve) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", (window.API_BASE || "") + "/payments/config");
      xhr.onload = function () {
        try {
          config = JSON.parse(xhr.responseText);
          config.enabled = !!(config.stripeEnabled || config.enabled);
        } catch (e) {
          config = { enabled: false, stripeEnabled: false };
        }
        resolve(config);
      };
      xhr.onerror = function () {
        config = { enabled: false, stripeEnabled: false };
        resolve(config);
      };
      xhr.send();
    });
    return configPromise;
  }

  function isEnabled() {
    return config && config.enabled;
  }

  function handleReturnParams() {
    var params = new URLSearchParams(window.location.search);
    var payment = params.get("payment");
    var orderId = params.get("order") || params.get("order_id");
    if (!payment) return;

    var checkout = document.getElementById("checkout");
    if (checkout) checkout.scrollIntoView({ behavior: "smooth" });

    var successEl = document.querySelector("[data-order-success]");
    var errorEl = document.querySelector("[data-order-error]");

    if (payment === "success" && successEl) {
      successEl.innerHTML = "<strong>" + (window.t ? window.t("payment-success-title") : "Payment successful!") + "</strong><br>" +
        (window.t ? window.t("payment-success-body") : "Thank you! Order") + " #" + (orderId || "") + ". " +
        "<a href=\"user-center.html\">" + (window.t ? window.t("nav-account") : "View my orders") + "</a>";
      successEl.style.display = "block";
      if (window.CartService) window.CartService.clear();
      if (errorEl) errorEl.style.display = "none";
    } else if (payment === "cancelled" && errorEl) {
      errorEl.textContent = window.t ? window.t("payment-cancelled") : "Payment cancelled. Your order was not charged.";
      errorEl.style.display = "block";
    }

    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, "", window.location.pathname + window.location.hash);
    }
  }

  window.PaymentService = {
    fetchConfig: fetchConfig,
    isEnabled: isEnabled,
    handleReturnParams: handleReturnParams
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", handleReturnParams);
  } else {
    handleReturnParams();
  }

  fetchConfig().then(function () {
    if (isEnabled()) {
      document.querySelectorAll("[data-place-order-btn] .checkout-submit__label").forEach(function (el) {
        if (window.t) el.textContent = window.t("btn-pay-card");
        else el.textContent = "Pay with Card";
      });
    }
  });
})();
