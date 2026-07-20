const { run, get, all, runReturning } = require("../db/database");

function mapOrder(row, items, shipment, payment) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    status: row.status,
    subtotal: row.subtotal,
    discountPercent: row.discount_percent,
    discountAmount: row.discount_amount,
    addonTotal: row.addon_total || 0,
    shippingFee: row.shipping_fee || 0,
    addons: JSON.parse(row.addons || "[]"),
    total: row.total,
    shippingName: row.shipping_name,
    shippingAddress: row.shipping_address,
    shippingCity: row.shipping_city,
    shippingState: row.shipping_state,
    shippingZip: row.shipping_zip,
    shippingCountry: row.shipping_country,
    email: row.email,
    notes: row.notes,
    stripeSessionId: row.stripe_session_id,
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: items || [],
    itemCount: items ? items.length : 0,
    totalQuantity: items ? items.reduce((s, i) => s + (i.quantity || 0), 0) : 0,
    shipment: shipment || null,
    payment: payment || null,
    designId: items && items[0] ? items[0].designId : null,
    sessionId: items && items[0] ? items[0].sessionId : null,
    styleId: items && items[0] ? items[0].styleId : null,
    quantity: items ? items.reduce((s, i) => s + (i.quantity || 0), 0) : 0
  };
}

function mapItem(row) {
  return {
    id: row.id,
    designId: row.design_id,
    sessionId: row.session_id,
    styleId: row.style_id,
    dim: row.dim,
    previewImage: row.preview_image,
    previewUrl: row.preview_image,
    sizeId: row.size_id,
    size: row.size_label,
    sizeLabel: row.size_label,
    fridgeType: row.fridge_type,
    quantity: row.quantity,
    unitPrice: row.unit_price
  };
}

function getOrderItems(orderId) {
  return all("SELECT * FROM order_items WHERE order_id = ?", [orderId]).map(mapItem);
}

function getShipment(orderId) {
  const row = get("SELECT * FROM shipments WHERE order_id = ?", [orderId]);
  if (!row) return null;
  return { carrier: row.carrier, trackingNo: row.tracking_no, shippedAt: row.shipped_at };
}

function getPayment(orderId) {
  const row = get("SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1", [orderId]);
  if (!row) return null;
  return {
    id: row.id,
    stripeSessionId: row.stripe_session_id,
    stripePaymentIntent: row.stripe_payment_intent,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    paidAt: row.paid_at
  };
}

function getOrderById(id) {
  const row = get("SELECT * FROM orders WHERE id = ?", [id]);
  return mapOrder(row, getOrderItems(id), getShipment(id), getPayment(id));
}

function createOrder(data) {
  const now = new Date().toISOString();
  const orderId = runReturning(
    `INSERT INTO orders (user_id, username, status, subtotal, discount_percent, discount_amount, addon_total, shipping_fee, addons, total,
      shipping_name, shipping_address, shipping_city, shipping_state, shipping_zip, shipping_country,
      email, notes, payment_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.userId, data.username || "", data.status || "pending",
      data.subtotal, data.discountPercent || 0, data.discountAmount || 0,
      data.addonTotal || 0, data.shippingFee || 0, JSON.stringify(data.addons || []),
      data.total,
      data.shippingName, data.shippingAddress, data.shippingCity,
      data.shippingState || "", data.shippingZip || "", data.shippingCountry,
      data.email || "", data.notes || "", data.paymentStatus || "unpaid", now, now
    ]
  );

  (data.items || []).forEach((item) => {
    run(
      `INSERT INTO order_items (order_id, design_id, session_id, style_id, dim, preview_image, size_id, size_label, fridge_type, quantity, unit_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId, item.designId, item.sessionId || null, item.styleId || "", item.dim || "",
        item.previewImage || item.previewUrl || "", item.sizeId || "standard",
        item.size || item.sizeLabel || "", item.fridgeType || "french-door",
        item.quantity, item.unitPrice
      ]
    );
  });

  return getOrderById(orderId);
}

function updateOrder(id, patch) {
  const fields = [];
  const values = [];
  const map = {
    status: "status",
    paymentStatus: "payment_status",
    stripeSessionId: "stripe_session_id",
    subtotal: "subtotal",
    discountPercent: "discount_percent",
    discountAmount: "discount_amount",
    total: "total",
    notes: "notes"
  };

  Object.keys(map).forEach((key) => {
    if (patch[key] !== undefined) {
      fields.push(`${map[key]} = ?`);
      values.push(patch[key]);
    }
  });

  if (!fields.length) return getOrderById(id);

  fields.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);
  run(`UPDATE orders SET ${fields.join(", ")} WHERE id = ?`, values);
  return getOrderById(id);
}

function listOrdersByUser(userId) {
  const rows = all("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", [userId]);
  return rows.map((r) => mapOrder(r, getOrderItems(r.id), getShipment(r.id), getPayment(r.id)));
}

function listAllOrders(filters = {}) {
  let sql = "SELECT * FROM orders WHERE 1=1";
  const params = [];
  const allowedStatuses = ["pending", "paid", "in_production", "shipped", "delivered", "cancelled", "refunded"];
  const allowedPaymentStatuses = ["unpaid", "paid", "failed", "refunded"];

  if (filters.status) {
    if (!allowedStatuses.includes(filters.status)) {
      throw new Error("Invalid status filter");
    }
    sql += " AND status = ?";
    params.push(filters.status);
  }
  if (filters.paymentStatus) {
    if (!allowedPaymentStatuses.includes(filters.paymentStatus)) {
      throw new Error("Invalid paymentStatus filter");
    }
    sql += " AND payment_status = ?";
    params.push(filters.paymentStatus);
  }

  sql += " ORDER BY created_at DESC";
  if (filters.limit) {
    const limit = parseInt(filters.limit, 10);
    if (Number.isNaN(limit) || limit <= 0) {
      throw new Error("Invalid limit filter");
    }
    sql += " LIMIT ?";
    params.push(limit);
  }

  const rows = all(sql, params);
  return rows.map((r) => mapOrder(r, getOrderItems(r.id), getShipment(r.id), getPayment(r.id)));
}

function upsertShipment(orderId, carrier, trackingNo) {
  const existing = get("SELECT id FROM shipments WHERE order_id = ?", [orderId]);
  const shippedAt = new Date().toISOString();
  if (existing) {
    run("UPDATE shipments SET carrier = ?, tracking_no = ?, shipped_at = ? WHERE order_id = ?", [carrier, trackingNo, shippedAt, orderId]);
  } else {
    run("INSERT INTO shipments (order_id, carrier, tracking_no, shipped_at) VALUES (?, ?, ?, ?)", [orderId, carrier, trackingNo, shippedAt]);
  }
  return getShipment(orderId);
}

function createPayment(orderId, data) {
  runReturning(
    "INSERT INTO payments (order_id, stripe_session_id, amount, currency, status) VALUES (?, ?, ?, ?, ?)",
    [orderId, data.stripeSessionId || null, data.amount, data.currency || "usd", data.status || "pending"]
  );
}

function markPaymentPaid(orderId, stripeSessionId, paymentIntent) {
  const now = new Date().toISOString();
  run(
    "UPDATE payments SET status = 'paid', stripe_payment_intent = ?, paid_at = ? WHERE order_id = ? AND stripe_session_id = ?",
    [paymentIntent || null, now, orderId, stripeSessionId]
  );
  updateOrder(orderId, { paymentStatus: "paid", status: "paid" });
}

function markPaymentFailed(orderId, stripeSessionId, paymentIntent) {
  const now = new Date().toISOString();
  run(
    "UPDATE payments SET status = 'failed', stripe_payment_intent = ?, updated_at = ? WHERE order_id = ? AND stripe_session_id = ?",
    [paymentIntent || null, now, orderId, stripeSessionId]
  );
  updateOrder(orderId, { paymentStatus: "failed" });
}

function getOrderByStripeSession(sessionId) {
  const row = get("SELECT * FROM orders WHERE stripe_session_id = ?", [sessionId]);
  if (!row) return null;
  return mapOrder(row, getOrderItems(row.id), getShipment(row.id), getPayment(row.id));
}

function getStats() {
  const today = new Date().toISOString().slice(0, 10);
  const ordersToday = get("SELECT COUNT(*) AS c FROM orders WHERE created_at LIKE ?", [`${today}%`]).c;
  const revenueToday = get("SELECT COALESCE(SUM(total), 0) AS s FROM orders WHERE payment_status = 'paid' AND created_at LIKE ?", [`${today}%`]).s;
  const pendingOrders = get("SELECT COUNT(*) AS c FROM orders WHERE status IN ('pending', 'paid')").c;
  const totalOrders = get("SELECT COUNT(*) AS c FROM orders").c;
  const totalRevenue = get("SELECT COALESCE(SUM(total), 0) AS s FROM orders WHERE payment_status = 'paid'").s;
  const newContacts = get("SELECT COUNT(*) AS c FROM contacts WHERE status = 'new'").c;

  return {
    ordersToday,
    revenueToday: Math.round(revenueToday * 100) / 100,
    pendingOrders,
    totalOrders,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    newContacts
  };
}

module.exports = {
  createOrder,
  getOrderById,
  updateOrder,
  listOrdersByUser,
  listAllOrders,
  upsertShipment,
  createPayment,
  markPaymentPaid,
  markPaymentFailed,
  getOrderByStripeSession,
  getStats,
  getOrderItems
};
