const express = require("express");
const jwt = require("jsonwebtoken");
const stripeService = require("../services/stripeService");
const orderStore = require("../services/orderStore");
const { JWT_SECRET } = require("../lib/authMiddleware");

const router = express.Router();

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Login required" });
  }
  try {
    req.user = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Session expired" });
  }
}

router.get("/config", (req, res) => {
  const enabled = stripeService.isEnabled();
  res.json({ stripeEnabled: enabled, enabled });
});

router.post("/create-checkout/:orderId", requireAuth, async (req, res) => {
  const order = orderStore.getOrderById(parseInt(req.params.orderId, 10));
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.userId !== req.user.id) return res.status(403).json({ error: "Access denied" });

  if (order.paymentStatus === "paid") {
    return res.status(400).json({ error: "Order already paid" });
  }

  const checkout = await stripeService.createCheckoutSession(order);
  if (!checkout.success) return res.status(502).json({ error: checkout.error });
  res.json({ checkoutUrl: checkout.url, sessionId: checkout.sessionId });
});

module.exports = router;
