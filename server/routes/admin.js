const express = require("express");
const path = require("path");
const fs = require("fs");
const store = require("../services/designStore");

const router = express.Router();
const ADMIN_KEY = process.env.ADMIN_KEY || "river-admin-dev";

function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"] || req.query.key;
  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: "Invalid admin key" });
  }
  next();
}

router.use(requireAdmin);

router.get("/orders", (req, res) => {
  const ordersFile = path.join(__dirname, "..", "orders.json");
  let orders = [];
  try {
    if (fs.existsSync(ordersFile)) {
      orders = JSON.parse(fs.readFileSync(ordersFile, "utf8")).orders || [];
    }
  } catch (e) {
    return res.status(500).json({ error: "Failed to load orders" });
  }
  res.json({ orders: orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});

router.get("/designs", (req, res) => {
  res.json({
    designs: store.listDesignsForAdmin(),
    sessions: store.listSessionsForAdmin()
  });
});

router.get("/designs/:designId/preview", (req, res) => {
  const design = store.getDesign(parseInt(req.params.designId, 10));
  if (!design) return res.status(404).json({ error: "Design not found" });
  const filePath = path.join(store.sessionDir(design.sessionId), design.previewImage);
  res.sendFile(filePath, (err) => {
    if (err) res.status(404).json({ error: "Preview not found" });
  });
});

module.exports = router;
