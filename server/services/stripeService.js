const Stripe = require("stripe");
const orderStore = require("./orderStore");
const orderService = require("./orderService");
const emailService = require("./emailService");
const productStore = require("./productStore");

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const APP_URL = process.env.APP_URL || "http://localhost:3000";

let stripe = null;
if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY);
}

function isEnabled() {
  return !!stripe;
}

async function createCheckoutSession(order) {
  if (!stripe) {
    return { success: false, error: "Stripe is not configured. Set STRIPE_SECRET_KEY." };
  }

  const lineItems = (order.items || []).map((item) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: `Custom Magnet #${item.designId}`,
        description: `${item.styleId || "custom"} � ${item.sizeLabel || item.size || "Standard"}`
      },
      unit_amount: Math.round(item.unitPrice * 100)
    },
    quantity: item.quantity
  }));

  if (order.discountAmount > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: `Volume discount (${order.discountPercent}%)` },
        unit_amount: -Math.round(order.discountAmount * 100)
      },
      quantity: 1
    });
  }

  productStore.getAddonLabels(order.addons).forEach((addon) => {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: addon.label },
        unit_amount: Math.round(addon.price * 100)
      },
      quantity: 1
    });
  });

  if (order.shippingFee > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Shipping" },
        unit_amount: Math.round(order.shippingFee * 100)
      },
      quantity: 1
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: lineItems,
    customer_email: order.email || undefined,
    metadata: { orderId: String(order.id) },
    success_url: `${APP_URL}/user-center.html?payment=success&order=${order.id}`,
    cancel_url: `${APP_URL}/index.html?payment=cancelled&order=${order.id}#checkout`
  });

  orderStore.updateOrder(order.id, { stripeSessionId: session.id });
  orderStore.createPayment(order.id, {
    stripeSessionId: session.id,
    amount: order.total,
    currency: "usd",
    status: "pending"
  });

  return { success: true, sessionId: session.id, url: session.url };
}

async function handleWebhook(rawBody, signature) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return { success: false, error: "Webhook not configured" };
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return { success: false, error: `Webhook signature failed: ${e.message}` };
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = parseInt(session.metadata?.orderId, 10);
    if (!orderId) return { success: false, error: "Missing orderId in metadata" };

    if (session.payment_status !== "paid") {
      return { success: true, ignored: "unpaid session", paymentStatus: session.payment_status };
    }

    orderStore.markPaymentPaid(orderId, session.id, session.payment_intent);
    const result = orderService.markPaid(orderId, "stripe");
    const order = orderStore.getOrderById(orderId);
    if (order) {
      await emailService.paymentSuccessEmail(order);
    }
    return { success: true, orderId, status: result.order?.status };
  }

  if (event.type === "checkout.session.async_payment_failed" || event.type === "payment_intent.payment_failed") {
    const session = event.data.object;
    const orderId = parseInt(session.metadata?.orderId, 10);
    if (orderId) {
      orderStore.markPaymentFailed(orderId, session.id, session.payment_intent);
    }
    return { success: true, orderId, ignored: event.type, note: "payment failed" };
  }

  return { success: true, ignored: event.type };
}

module.exports = { isEnabled, createCheckoutSession, handleWebhook, stripe };
