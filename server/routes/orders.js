const express = require("express");
const jwt = require("jsonwebtoken");
const store = require("../services/designStore");
const orderStore = require("../services/orderStore");
const productStore = require("../services/productStore");
const emailService = require("../services/emailService");
const stripeService = require("../services/stripeService");
const { JWT_SECRET } = require("../lib/authMiddleware");

const router = express.Router();

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Login required to place orders" });
  }
  try {
    req.user = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Session expired, please login again" });
  }
}

function validateAndBuildItems(items, userId) {
  const validatedItems = [];
  let computedSubtotal = 0;
  let totalQty = 0;

  for (const item of items) {
    if (!item.designId || !item.quantity) {
      return { error: "Each cart item must include designId and quantity" };
    }
    if (item.quantity < 1 || item.quantity > 100) {
      return { error: "Quantity must be between 1 and 100 per item" };
    }

    const design = store.getDesignForUser(parseInt(item.designId, 10), userId);
    if (!design) {
      return { error: `Design #${item.designId} not found. Please confirm your design first.` };
    }
    if (design.status !== "confirmed") {
      return { error: `Design #${item.designId} must be confirmed before ordering` };
    }

    const product = productStore.getProduct(item.sizeId || "standard");
    const unitPrice = product ? product.price : parseFloat(item.unitPrice) || 9.99;
    computedSubtotal += unitPrice * item.quantity;
    totalQty += item.quantity;

    validatedItems.push({
      designId: design.id,
      sessionId: design.sessionId,
      styleId: item.styleId || design.styleId,
      dim: item.dim || design.dim,
      previewImage: item.previewUrl || design.previewImage,
      sizeId: item.sizeId || "standard",
      size: item.size || "Standard (8x10 cm)",
      sizeLabel: item.size || "Standard (8x10 cm)",
      fridgeType: item.fridgeType || "french-door",
      quantity: parseInt(item.quantity, 10),
      unitPrice
    });
  }

  const discountPct = productStore.getDiscountPercent(totalQty);
  const computedDiscount = Math.round(computedSubtotal * discountPct) / 100;
  const merchandiseTotal = Math.round((computedSubtotal - computedDiscount) * 100) / 100;

  return {
    validatedItems,
    computedSubtotal: Math.round(computedSubtotal * 100) / 100,
    totalQty,
    discountPct,
    computedDiscount,
    merchandiseTotal
  };
}

function buildOrderTotals(built, addons, shippingCountry) {
  const addonIds = Array.isArray(addons) ? addons.filter((id) => productStore.ADDONS[id]) : [];
  const addonTotal = productStore.calcAddonTotal(addonIds);
  const shippingFee = productStore.calcShippingFee(built.merchandiseTotal, shippingCountry);
  const total = Math.round((built.merchandiseTotal + addonTotal + shippingFee) * 100) / 100;
  return { addonIds, addonTotal, shippingFee, total };
}

function orderSummary(order) {
  return {
    id: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    itemCount: order.itemCount,
    totalQuantity: order.totalQuantity,
    discountPercent: order.discountPercent,
    total: order.total,
    createdAt: order.createdAt
  };
}

router.post("/batch", requireAuth, async (req, res) => {
  const {
    items,
    addons,
    shippingName,
    shippingAddress,
    shippingCity,
    shippingState,
    shippingZip,
    shippingCountry,
    email,
    notes,
    skipPayment
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Cart is empty" });
  }

  if (!shippingName || !shippingAddress || !shippingCity || !shippingCountry) {
    return res.status(400).json({ error: "Please fill in all required fields: name, address, city, country" });
  }

  const built = validateAndBuildItems(items, req.user.id);
  if (built.error) return res.status(400).json({ error: built.error });

  const extras = buildOrderTotals(built, addons, shippingCountry);

  const order = orderStore.createOrder({
    userId: req.user.id,
    username: req.user.username,
    status: "pending",
    paymentStatus: "unpaid",
    subtotal: built.computedSubtotal,
    discountPercent: built.discountPct,
    discountAmount: built.computedDiscount,
    addonTotal: extras.addonTotal,
    shippingFee: extras.shippingFee,
    addons: extras.addonIds,
    total: extras.total,
    shippingName,
    shippingAddress,
    shippingCity,
    shippingState,
    shippingZip,
    shippingCountry,
    email: email || req.user.email || "",
    notes: notes || "",
    items: built.validatedItems
  });

  await emailService.orderConfirmationEmail(order);

  if (stripeService.isEnabled() && !skipPayment) {
    const checkout = await stripeService.createCheckoutSession(order);
    if (checkout.success) {
      return res.status(201).json({
        message: "Order created. Redirecting to payment...",
        order: orderSummary(order),
        checkoutUrl: checkout.url,
        requiresPayment: true
      });
    }
  }

  res.status(201).json({
    message: "Order placed successfully! We will contact you shortly.",
    order: orderSummary(order),
    requiresPayment: false
  });
});

router.post("/", requireAuth, async (req, res) => {
  const {
    designId,
    quantity,
    size,
    sizeId,
    shippingName,
    shippingAddress,
    shippingCity,
    shippingState,
    shippingZip,
    shippingCountry,
    email,
    notes
  } = req.body;

  if (!designId) {
    return res.status(400).json({ error: "Please confirm your design before placing an order" });
  }

  const built = validateAndBuildItems([{
    designId,
    quantity,
    sizeId: sizeId || "standard",
    size,
    unitPrice: req.body.unitPrice
  }], req.user.id);

  if (built.error) return res.status(400).json({ error: built.error });

  const extras = buildOrderTotals(built, req.body.addons, shippingCountry);

  const order = orderStore.createOrder({
    userId: req.user.id,
    username: req.user.username,
    status: "pending",
    paymentStatus: "unpaid",
    subtotal: built.computedSubtotal,
    discountPercent: built.discountPct,
    discountAmount: built.computedDiscount,
    addonTotal: extras.addonTotal,
    shippingFee: extras.shippingFee,
    addons: extras.addonIds,
    total: extras.total,
    shippingName,
    shippingAddress,
    shippingCity,
    shippingState,
    shippingZip,
    shippingCountry,
    email: email || req.user.email || "",
    notes: notes || "",
    items: built.validatedItems
  });

  await emailService.orderConfirmationEmail(order);

  if (stripeService.isEnabled()) {
    const checkout = await stripeService.createCheckoutSession(order);
    if (checkout.success) {
      return res.status(201).json({
        message: "Order created. Redirecting to payment...",
        order: orderSummary(order),
        checkoutUrl: checkout.url,
        requiresPayment: true
      });
    }
  }

  res.status(201).json({
    message: "Order placed successfully!",
    order: {
      id: order.id,
      designId: order.designId,
      styleId: order.styleId,
      status: order.status,
      quantity: order.quantity,
      size: order.size,
      createdAt: order.createdAt
    }
  });
});

router.get("/", requireAuth, (req, res) => {
  res.json({ orders: orderStore.listOrdersByUser(req.user.id) });
});

router.get("/:id", requireAuth, (req, res) => {
  const order = orderStore.getOrderById(parseInt(req.params.id, 10));
  if (!order || order.userId !== req.user.id) {
    return res.status(404).json({ error: "Order not found" });
  }
  res.json({ order });
});

module.exports = router;
