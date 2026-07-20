const express = require("express");
const path = require("path");
const fs = require("fs");
const AdmZip = require("adm-zip");
const store = require("../services/designStore");
const orderStore = require("../services/orderStore");
const contactStore = require("../services/contactStore");
const productStore = require("../services/productStore");
const userStore = require("../services/userStore");
const orderService = require("../services/orderService");
const emailService = require("../services/emailService");
const auditService = require("../services/auditService");
const { requireAdmin, adminLogin } = require("../lib/adminAuth");

const router = express.Router();

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }
  const result = adminLogin(username, password);
  if (!result.success) return res.status(401).json({ error: result.error });
  res.json({ token: result.token, user: result.user });
});

router.use(requireAdmin);

router.get("/stats", (req, res) => {
  res.json({
    stats: orderStore.getStats(),
    userCount: userStore.countUsers(),
    designCount: store.listDesignsForAdmin().length
  });
});

router.get("/orders", (req, res) => {
  const filters = {};
  if (req.query.status) filters.status = req.query.status;
  if (req.query.limit) filters.limit = parseInt(req.query.limit, 10);
  res.json({ orders: orderStore.listAllOrders(filters) });
});

router.get("/orders/:id", (req, res) => {
  const order = orderStore.getOrderById(parseInt(req.params.id, 10));
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json({ order });
});

router.patch("/orders/:id/status", async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "status is required" });

  const result = orderService.updateStatus(
    parseInt(req.params.id, 10),
    status,
    req.admin.username
  );
  if (!result.success) return res.status(400).json({ error: result.error });

  const order = result.order;
  if (status === "shipped" && order.shipment) {
    await emailService.shipmentEmail(order);
  }

  res.json({ order: result.order });
});

router.post("/orders/:id/ship", async (req, res) => {
  const { carrier, trackingNo } = req.body;
  const result = orderService.shipOrder(
    parseInt(req.params.id, 10),
    carrier,
    trackingNo,
    req.admin.username
  );
  if (!result.success) return res.status(400).json({ error: result.error });

  await emailService.shipmentEmail(result.order);
  res.json({ order: result.order });
});

router.get("/orders/:id/production-pack", (req, res) => {
  const order = orderStore.getOrderById(parseInt(req.params.id, 10));
  if (!order) return res.status(404).json({ error: "Order not found" });

  const zip = new AdmZip();

  const manifest = {
    orderId: order.id,
    customer: order.shippingName,
    email: order.email,
    address: {
      line1: order.shippingAddress,
      city: order.shippingCity,
      state: order.shippingState,
      zip: order.shippingZip,
      country: order.shippingCountry
    },
    items: order.items.map((item) => ({
      designId: item.designId,
      styleId: item.styleId,
      size: item.sizeLabel || item.size,
      quantity: item.quantity
    })),
    exportedAt: new Date().toISOString()
  };

  zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2), "utf8"));

  order.items.forEach((item) => {
    if (!item.sessionId || !item.previewImage) return;
    const safePreview = path.basename(item.previewImage);
    if (!/^[a-zA-Z0-9._-]+$/.test(safePreview)) return;
    const filePath = path.join(store.sessionDir(item.sessionId), safePreview);
    const resolvedFilePath = path.resolve(filePath);
    const resolvedBaseDir = path.resolve(store.sessionDir(item.sessionId));
    if (!resolvedFilePath.startsWith(resolvedBaseDir)) return;
    if (fs.existsSync(filePath)) {
      zip.addLocalFile(filePath, "", `design-${item.designId}-${safePreview}`);
    }
  });

  auditService.log(req.admin.username, "order.export", "order", String(order.id), {});

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename=order-${order.id}-production.zip`);
  res.send(zip.toBuffer());
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
  const safePreview = path.basename(design.previewImage);
  if (!/^[a-zA-Z0-9._-]+$/.test(safePreview)) {
    return res.status(400).json({ error: "Invalid preview filename" });
  }
  const baseDir = path.resolve(store.sessionDir(design.sessionId));
  const filePath = path.resolve(baseDir, safePreview);
  if (!filePath.startsWith(baseDir)) return res.status(400).json({ error: "Invalid path" });
  res.sendFile(filePath, (err) => {
    if (err) res.status(404).json({ error: "Preview not found" });
  });
});

router.get("/contacts", (req, res) => {
  res.json({ contacts: contactStore.listContacts(req.query.status) });
});

router.patch("/contacts/:id", (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "status is required" });
  const contact = contactStore.updateContactStatus(parseInt(req.params.id, 10), status);
  if (!contact) return res.status(404).json({ error: "Contact not found" });
  res.json({ contact });
});

router.get("/products", (req, res) => {
  res.json({
    products: productStore.listProducts(),
    discountTiers: productStore.listDiscountTiers()
  });
});

router.put("/products/:id", (req, res) => {
  const product = productStore.updateProduct(req.params.id, req.body);
  if (!product) return res.status(404).json({ error: "Product not found" });
  auditService.log(req.admin.username, "product.update", "product", req.params.id, req.body);
  res.json({ product });
});

router.get("/users", (req, res) => {
  res.json({ users: userStore.listUsers(200, 0), total: userStore.countUsers() });
});

router.get("/audit", (req, res) => {
  res.json({ logs: auditService.listRecent(100) });
});

module.exports = router;
