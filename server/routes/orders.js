const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "river-magnet-dev-secret-2024";
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

// Auth middleware
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

// Submit a new order
router.post("/", requireAuth, (req, res) => {
  const { quantity, size, shippingName, shippingAddress, shippingCity, shippingState, shippingZip, shippingCountry, email, notes } = req.body;

  // Validate required fields
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
    quantity: parseInt(quantity),
    size: size || "Standard (8x10 cm)",
    shippingName: shippingName,
    shippingAddress: shippingAddress,
    shippingCity: shippingCity,
    shippingState: shippingState || "",
    shippingZip: shippingZip || "",
    shippingCountry: shippingCountry,
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
      quantity: order.quantity,
      size: order.size,
      createdAt: order.createdAt
    }
  });
});

// Get user's orders
router.get("/", requireAuth, (req, res) => {
  const db = loadOrders();
  const userOrders = db.orders
    .filter(o => o.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(o => ({
      id: o.id,
      status: o.status,
      quantity: o.quantity,
      size: o.size,
      createdAt: o.createdAt
    }));

  res.json({ orders: userOrders });
});

// Get single order
router.get("/:id", requireAuth, (req, res) => {
  const db = loadOrders();
  const order = db.orders.find(o => o.id === parseInt(req.params.id) && o.userId === req.user.id);

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  res.json({ order });
});

module.exports = router;