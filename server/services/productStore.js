const { run, get, all } = require("../db/database");

const ADDONS = {
  giftBox: { id: "giftBox", price: 3.99, label: "Gift box packaging" },
  proRetouch: { id: "proRetouch", price: 4.99, label: "Pro retouch & cutout review" },
  rush: { id: "rush", price: 7.99, label: "Rush production 24h" }
};

const SHIPPING = { flatRate: 4.99, freeThreshold: 35 };

function calcAddonTotal(addonIds) {
  let total = 0;
  (addonIds || []).forEach((id) => {
    if (ADDONS[id]) total += ADDONS[id].price;
  });
  return Math.round(total * 100) / 100;
}

function calcShippingFee(merchandiseTotal, shippingCountry) {
  if (!shippingCountry || shippingCountry === "CN") return 0;
  return merchandiseTotal >= SHIPPING.freeThreshold ? 0 : SHIPPING.flatRate;
}

function getAddonLabels(addonIds) {
  return (addonIds || []).filter((id) => ADDONS[id]).map((id) => ({ id, label: ADDONS[id].label, price: ADDONS[id].price }));
}

function listProducts(activeOnly = false) {
  let sql = "SELECT * FROM products";
  if (activeOnly) sql += " WHERE active = 1";
  sql += " ORDER BY sort_order ASC";
  return all(sql).map(mapProduct);
}

function mapProduct(row) {
  return {
    id: row.id,
    langKey: row.lang_key,
    widthCm: row.width_cm,
    heightCm: row.height_cm,
    price: row.price,
    active: !!row.active,
    sortOrder: row.sort_order
  };
}

function getProduct(id) {
  const row = get("SELECT * FROM products WHERE id = ?", [id]);
  return row ? mapProduct(row) : null;
}

function updateProduct(id, patch) {
  const fields = [];
  const values = [];
  const map = {
    langKey: "lang_key",
    widthCm: "width_cm",
    heightCm: "height_cm",
    price: "price",
    active: "active",
    sortOrder: "sort_order"
  };
  Object.keys(map).forEach((key) => {
    if (patch[key] !== undefined) {
      fields.push(`${map[key]} = ?`);
      values.push(key === "active" ? (patch[key] ? 1 : 0) : patch[key]);
    }
  });
  if (!fields.length) return getProduct(id);
  values.push(id);
  run(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`, values);
  return getProduct(id);
}

function listDiscountTiers() {
  return all("SELECT * FROM discount_tiers ORDER BY min_qty ASC").map((row) => ({
    minQty: row.min_qty,
    percent: row.percent,
    langKey: row.lang_key
  }));
}

function getDiscountPercent(totalQty) {
  const tiers = listDiscountTiers().sort((a, b) => b.minQty - a.minQty);
  for (const tier of tiers) {
    if (totalQty >= tier.minQty) return tier.percent;
  }
  return 0;
}

function getCatalogForClient() {
  return {
    sizes: listProducts(true),
    discountTiers: listDiscountTiers()
  };
}

module.exports = {
  listProducts,
  getProduct,
  updateProduct,
  listDiscountTiers,
  getDiscountPercent,
  getCatalogForClient,
  ADDONS,
  SHIPPING,
  calcAddonTotal,
  calcShippingFee,
  getAddonLabels
};
