const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const store = require("../services/designStore");
const { JWT_SECRET } = require("../lib/authMiddleware");

const router = express.Router();
const ORDERS_FILE = path.join(__dirname, "..", "orders.json");

function loadOrders() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
    }
  } catch (e) {
    console.error("Error loading orders:", e.message);
  }
  return { orders: [], nextId: 1 };
}

function saveOrders(data) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(data, null, 2), "utf8");
}

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

router.post("/batch", requireAuth, (req, res) => {
  const {
    items,
    subtotal,
    discountPercent,
    discountAmount,
    total,
    shippingName,
    shippingAddress,
    shippingCity,
    shippingState,
    shippingZip,
    shippingCountry,
    email,
    notes
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Cart is empty" });
  }

  if (!shippingName || !shippingAddress || !shippingCity || !shippingCountry) {
    return res.status(400).json({ error: "Please fill in all required fields: name, address, city, country" });
  }

  const validatedItems = [];
  let computedSubtotal = 0;
  let totalQty = 0;

  for (const item of items) {
    if (!item.designId || !item.quantity) {
      return res.status(400).json({ error: "Each cart item must include designId and quantity" });
    }
    if (item.quantity < 1 || item.quantity > 100) {
      return res.status(400).json({ error: "Quantity must be between 1 and 100 per item" });
    }

    const design = store.getDesignForUser(parseInt(item.designId, 10), req.user.id);
    if (!design) {
      return res.status(400).json({ error: `Design #${item.designId} not found. Please confirm your design first.` });
    }
    if (design.status !== "confirmed") {
      return res.status(400).json({ error: `Design #${item.designId} must be confirmed before ordering` });
    }

    const unitPrice = parseFloat(item.unitPrice) || 9.99;
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
      fridgeType: item.fridgeType || "french-door",
      quantity: parseInt(item.quantity, 10),
      unitPrice
    });
  }

  let discountPct = 0;
  if (totalQty >= 7) discountPct = 15;
  else if (totalQty >= 4) discountPct = 10;
  else if (totalQty >= 2) discountPct = 5;

  const computedDiscount = Math.round(computedSubtotal * discountPct) / 100;
  const computedTotal = Math.round((computedSubtotal - computedDiscount) * 100) / 100;

  const db = loadOrders();
  const order = {
    id: db.nextId,
    userId: req.user.id,
    username: req.user.username,
    items: validatedItems,
    itemCount: validatedItems.length,
    totalQuantity: totalQty,
    subtotal: Math.round(computedSubtotal * 100) / 100,
    discountPercent: discountPct,
    discountAmount: computedDiscount,
    total: computedTotal,
    shippingName,
    shippingAddress,
    shippingCity,
    shippingState: shippingState || "",
    shippingZip: shippingZip || "",
    shippingCountry,
    email: email || req.user.email || "",
    notes: notes || "",
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.orders.push(order);
  db.nextId++;
  saveOrders(db);

  res.status(201).json({
    message: "Order placed successfully! We will contact you shortly.",
    order: {
      id: order.id,
      status: order.status,
      itemCount: order.itemCount,
      totalQuantity: order.totalQuantity,
      discountPercent: order.discountPercent,
      total: order.total,
      createdAt: order.createdAt
    }
  });
});

router.post("/", requireAuth, (req, res) => {
  const {
    designId,
    quantity,
    size,
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

  const design = store.getDesignForUser(parseInt(designId, 10), req.user.id);
  if (!design) {
    return res.status(400).json({ error: "Design not found. Please confirm your design first." });
  }
  if (design.status !== "confirmed") {
    return res.status(400).json({ error: "Design must be confirmed before ordering" });
  }

  if (!quantity || !shippingName || !shippingAddress || !shippingCity || !shippingCountry) {
    return res.status(400).json({ error: "Please fill in all required fields: name, address, city, country, and quantity" });
  }

  if (quantity < 1 || quantity > 100) {
    return res.status(400).json({ error: "Quantity must be between 1 and 100" });
  }

  const db = loadOrders();

  const order = {
    id: db.nextId,
    userId: req.user.id,
    username: req.user.username,
    designId: design.id,
    sessionId: design.sessionId,
    styleId: design.styleId,
    dim: design.dim,
    previewImage: design.previewImage,
    quantity: parseInt(quantity, 10),
    size: size || "Standard (8x10 cm)",
    shippingName,
    shippingAddress,
    shippingCity,
    shippingState: shippingState || "",
    shippingZip: shippingZip || "",
    shippingCountry,
    email: email || req.user.email || "",
    notes: notes || "",
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.orders.push(order);
  db.nextId++;
  saveOrders(db);

  res.status(201).json({
    message: "Order placed successfully! We will contact you shortly.",
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
  const db = loadOrders();
  const userOrders = db.orders
    .filter((o) => o.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((o) => ({
      id: o.id,
      designId: o.designId,
      styleId: o.styleId,
      status: o.status,
      quantity: o.quantity || o.totalQuantity,
      size: o.size,
      itemCount: o.itemCount,
      totalQuantity: o.totalQuantity,
      discountPercent: o.discountPercent,
      total: o.total,
      items: o.items,
      createdAt: o.createdAt
    }));

  res.json({ orders: userOrders });
});

router.get("/:id", requireAuth, (req, res) => {
  const db = loadOrders();
  const order = db.orders.find((o) => o.id === parseInt(req.params.id, 10) && o.userId === req.user.id);

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  res.json({ order });
});

module.exports = router;
