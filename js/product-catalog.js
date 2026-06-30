(function () {
  var SIZES = {
    mini: {
      id: "mini",
      langKey: "size-mini",
      widthCm: 5,
      heightCm: 6,
      price: 6.99
    },
    standard: {
      id: "standard",
      langKey: "size-standard",
      widthCm: 8,
      heightCm: 10,
      price: 9.99
    },
    large: {
      id: "large",
      langKey: "size-large",
      widthCm: 12,
      heightCm: 15,
      price: 14.99
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

  function formatMoney(n) {
    return "$" + Number(n).toFixed(2);
  }

  window.ProductCatalog = {
    SIZES: SIZES,
    FRIDGE_TYPES: FRIDGE_TYPES,
    DISCOUNT_TIERS: DISCOUNT_TIERS,
    getSize: getSize,
    getFridgeType: getFridgeType,
    getSizeLabel: getSizeLabel,
    getDiscountPercent: getDiscountPercent,
    calcTotals: calcTotals,
    formatMoney: formatMoney,
    sizeList: function () { return [SIZES.mini, SIZES.standard, SIZES.large]; }
  };
})();
