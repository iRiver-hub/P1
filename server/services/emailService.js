const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "River Magnets <noreply@rivermagnets.com>";
const APP_URL = process.env.APP_URL || "http://localhost:5500";

async function sendEmail(to, subject, html) {
  if (!to) return { sent: false, reason: "no_recipient" };

  if (!RESEND_API_KEY) {
    console.log(`[email stub] To: ${to} | Subject: ${subject}`);
    return { sent: false, reason: "stub", preview: html.slice(0, 200) };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html })
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("Email send failed:", data);
      return { sent: false, reason: data.message || "send_failed" };
    }
    return { sent: true, id: data.id };
  } catch (e) {
    console.error("Email error:", e.message);
    return { sent: false, reason: e.message };
  }
}

function orderConfirmationEmail(order) {
  if (!order) return { sent: false, reason: "no_order" };
  const itemsHtml = (order.items || [])
    .map((i) => `<li>#${i.designId} � ${i.quantity} � $${(i.unitPrice * i.quantity).toFixed(2)}</li>`)
    .join("");

  return sendEmail(
    order.email,
    `Order #${order.id} received � River Magnets`,
    `<h2>Thank you for your order!</h2>
     <p>Hi ${order.shippingName},</p>
     <p>We received order <strong>#${order.id}</strong>.</p>
     <ul>${itemsHtml}</ul>
     <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
     <p>Status: ${order.paymentStatus === "paid" ? "Paid" : "Pending payment"}</p>
     <p><a href="${APP_URL}/user-center.html">View your orders</a></p>`
  );
}

function paymentSuccessEmail(order) {
  return sendEmail(
    order.email,
    `Payment confirmed � Order #${order.id}`,
    `<h2>Payment received!</h2>
     <p>Hi ${order.shippingName},</p>
     <p>Your payment for order <strong>#${order.id}</strong> ($${order.total.toFixed(2)}) was successful.</p>
     <p>We will start production shortly. Estimated delivery: 2�3 weeks.</p>`
  );
}

function shipmentEmail(order) {
  const s = order.shipment;
  if (!s) return { sent: false, reason: "no_shipment" };
  return sendEmail(
    order.email,
    `Your order #${order.id} has shipped!`,
    `<h2>Your magnets are on the way!</h2>
     <p>Hi ${order.shippingName},</p>
     <p>Order <strong>#${order.id}</strong> has been shipped.</p>
     <p><strong>Carrier:</strong> ${s.carrier}<br>
     <strong>Tracking:</strong> ${s.trackingNo}</p>`
  );
}

function welcomeEmail(user) {
  return sendEmail(
    user.email,
    "Welcome to River Magnets!",
    `<h2>Welcome, ${user.username}!</h2>
     <p>Start creating custom fridge magnets from your photos.</p>
     <p><a href="${APP_URL}">Create your first magnet</a></p>`
  );
}

module.exports = {
  sendEmail,
  orderConfirmationEmail,
  paymentSuccessEmail,
  shipmentEmail,
  welcomeEmail
};
