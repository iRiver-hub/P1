(function () {
  var SIZES = {
    mini: {
      id: "mini",
      langKey: "size-mini",
      widthCm: 5,
      heightCm: 6,
      price: 7.99
    },
    standard: {
      id: "standard",
      langKey: "size-standard",
      widthCm: 8,
      heightCm: 10,
      price: 11.99
    },
    large: {
      id: "large",
      langKey: "size-large",
      widthCm: 12,
      heightCm: 15,
      price: 16.99
    }
  };

  var FRIDGE_TYPES = {
    "french-door": { id: "french-door", widthCm: 91, heightCm: 178 },
    "side-by-side": { id: "side-by-side", widthCm: 106, heightCm: 178 }
  };

  var DISCOUNT_TIERS = [
    { minQty: 7, percent: 15, langKey: "discount-tier-3" },
    { minQty: 4, percent: 10, langKey: "discount-tier-2" },
    { minQty: 2, percent: 5, langKey: "discount-tier-1" }
  ];

  var ADDONS = {
    giftBox: { id: "giftBox", langKey: "addon-gift-box", price: 3.99 },
    proRetouch: { id: "proRetouch", langKey: "addon-pro-retouch", price: 4.99 },
    rush: { id: "rush", langKey: "addon-rush", price: 7.99 }
  };

  var BUNDLES = {
    couple: {
      id: "couple",
      langKey: "bundle-couple",
      sizeId: "standard",
      quantity: 2,
      price: 21.99
    },
    family6: {
      id: "family6",
      langKey: "bundle-family6",
      sizeId: "mini",
      quantity: 6,
      price: 39.99
    },
    memory9: {
      id: "memory9",
      langKey: "bundle-memory9",
      sizeId: "mini",
      quantity: 9,
      price: 54.99
    }
  };

  var SHIPPING = {
    flatRate: 4.99,
    freeThreshold: 35
  };

  function getSize(id) {
    return SIZES[id] || SIZES.standard;
  }

  function getFridgeType(id) {
    return FRIDGE_TYPES[id] || FRIDGE_TYPES["french-door"];
  }

  function getSizeLabel(sizeId) {
    var s = getSize(sizeId);
    if (window.t) {
      var translated = window.t(s.langKey);
      if (translated && translated !== s.langKey) return translated;
    }
    return s.widthCm + "\u00d7" + s.heightCm + " cm";
  }

  function getDiscountPercent(totalQty) {
    for (var i = 0; i < DISCOUNT_TIERS.length; i++) {
      if (totalQty >= DISCOUNT_TIERS[i].minQty) return DISCOUNT_TIERS[i].percent;
    }
    return 0;
  }

  function calcTotals(items) {
    var subtotal = 0;
    var totalQty = 0;
    items.forEach(function (item) {
      subtotal += item.unitPrice * item.quantity;
      totalQty += item.quantity;
    });
    var discountPercent = getDiscountPercent(totalQty);
    var discountAmount = Math.round(subtotal * discountPercent) / 100;
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalQty: totalQty,
      discountPercent: discountPercent,
      discountAmount: Math.round(discountAmount * 100) / 100,
      total: Math.round((subtotal - discountAmount) * 100) / 100
    };
  }

  function getSelectedAddons() {
    var ids = [];
    document.querySelectorAll("[data-order-addon]:checked").forEach(function (el) {
      var id = el.getAttribute("data-order-addon");
      if (id) ids.push(id);
    });
    return ids;
  }

  function calcAddonTotal(addonIds) {
    var total = 0;
    (addonIds || []).forEach(function (id) {
      if (ADDONS[id]) total += ADDONS[id].price;
    });
    return Math.round(total * 100) / 100;
  }

  function calcShippingFee(merchandiseTotal, shippingCountry) {
    if (!shippingCountry || shippingCountry === "CN") return 0;
    return merchandiseTotal >= SHIPPING.freeThreshold ? 0 : SHIPPING.flatRate;
  }

  function calcCheckoutTotals(items, options) {
    options = options || {};
    var base = calcTotals(items);
    var addonIds = options.addons || getSelectedAddons();
    var addonTotal = calcAddonTotal(addonIds);
    var merchandiseTotal = base.total;
    var shippingFee = calcShippingFee(merchandiseTotal, options.shippingCountry);
    return Object.assign({}, base, {
      addons: addonIds,
      addonTotal: addonTotal,
      shippingFee: shippingFee,
      total: Math.round((merchandiseTotal + addonTotal + shippingFee) * 100) / 100
    });
  }

  function formatMoney(n) {
    return "$" + Number(n).toFixed(2);
  }

  function sizeList() { return [SIZES.mini, SIZES.standard, SIZES.large]; }

  function applyCatalog(catalog) {
    if (!catalog || !catalog.sizes) return;
    catalog.sizes.forEach(function (s) {
      SIZES[s.id] = {
        id: s.id,
        langKey: s.langKey || ("size-" + s.id),
        widthCm: s.widthCm,
        heightCm: s.heightCm,
        price: s.price
      };
    });
    if (catalog.discountTiers && catalog.discountTiers.length) {
      DISCOUNT_TIERS.length = 0;
      catalog.discountTiers.forEach(function (t) {
        DISCOUNT_TIERS.push({ minQty: t.minQty, percent: t.percent, langKey: t.langKey });
      });
    }
  }

  if (window.API_BASE) {
    fetch(window.API_BASE + "/products/catalog")
      .then(function (r) { return r.json(); })
      .then(applyCatalog)
      .catch(function () {});
  }

  window.ProductCatalog = {
    SIZES: SIZES,
    FRIDGE_TYPES: FRIDGE_TYPES,
    DISCOUNT_TIERS: DISCOUNT_TIERS,
    ADDONS: ADDONS,
    BUNDLES: BUNDLES,
    SHIPPING: SHIPPING,
    getSize: getSize,
    getFridgeType: getFridgeType,
    getSizeLabel: getSizeLabel,
    getDiscountPercent: getDiscountPercent,
    calcTotals: calcTotals,
    calcCheckoutTotals: calcCheckoutTotals,
    getSelectedAddons: getSelectedAddons,
    formatMoney: formatMoney,
    sizeList: sizeList,
    applyCatalog: applyCatalog
  };
})();
