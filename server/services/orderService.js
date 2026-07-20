const orderStore = require("./orderStore");
const audit = require("./auditService");

const VALID_TRANSITIONS = {
  pending: ["paid", "cancelled"],
  paid: ["in_production", "cancelled", "refunded"],
  in_production: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
  refunded: []
};

const STATUS_LABELS = {
  pending: "???",
  paid: "???",
  in_production: "???",
  shipped: "???",
  delivered: "???",
  cancelled: "???",
  refunded: "???"
};

function canTransition(from, to) {
  return (VALID_TRANSITIONS[from] || []).includes(to);
}

function updateStatus(orderId, newStatus, actor = "system") {
  const order = orderStore.getOrderById(orderId);
  if (!order) return { success: false, error: "Order not found" };

  if (!canTransition(order.status, newStatus)) {
    return {
      success: false,
      error: `Cannot change status from '${order.status}' to '${newStatus}'`
    };
  }

  const updated = orderStore.updateOrder(orderId, { status: newStatus });
  audit.log(actor, "order.status_change", "order", String(orderId), {
    from: order.status,
    to: newStatus
  });

  return { success: true, order: updated };
}

function shipOrder(orderId, carrier, trackingNo, actor = "admin") {
  const order = orderStore.getOrderById(orderId);
  if (!order) return { success: false, error: "Order not found" };

  if (!["paid", "in_production"].includes(order.status)) {
    return { success: false, error: "Order must be paid or in production before shipping" };
  }

  if (!carrier || !trackingNo) {
    return { success: false, error: "Carrier and tracking number are required" };
  }

  orderStore.upsertShipment(orderId, carrier, trackingNo);
  const result = updateStatus(orderId, "shipped", actor);
  audit.log(actor, "order.ship", "order", String(orderId), { carrier, trackingNo });
  return result;
}

function markPaid(orderId, actor = "stripe") {
  const order = orderStore.getOrderById(orderId);
  if (!order) return { success: false, error: "Order not found" };
  if (order.status === "paid") return { success: true, order };

  if (order.status === "pending") {
    orderStore.updateOrder(orderId, { paymentStatus: "paid" });
    return updateStatus(orderId, "paid", actor);
  }

  return { success: false, error: "Invalid order state for payment" };
}

module.exports = {
  VALID_TRANSITIONS,
  STATUS_LABELS,
  canTransition,
  updateStatus,
  shipOrder,
  markPaid
};
