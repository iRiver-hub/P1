require("dotenv").config({ quiet: true });
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const rateLimit = require("express-rate-limit");
const { initDatabase } = require("./db/database");
const stripeService = require("./services/stripeService");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

const PROTECTED_PATHS = [
  "/server",
  "/.env",
  "/server/.env",
  "/server/data",
  "/server/scripts",
  "/server/db",
  "/server/routes",
  "/server/services",
  "/server/lib",
  "/docs",
  "/.git",
  "/.gitignore",
  "/package-lock.json",
  "/PROJECT_TRACKER.md"
];

app.use((req, res, next) => {
  const normalized = path.normalize(req.path).toLowerCase().replace(/\\/g, "/");
  if (PROTECTED_PATHS.some((p) => normalized === p || normalized.startsWith(p + "/"))) {
    return res.status(404).send("Not found");
  }
  next();
});

const corsOrigins = (process.env.CORS_ORIGINS ||
  "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5500,http://127.0.0.1:5500")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || corsOrigins.includes(origin) || corsOrigins.includes("*")) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));

app.post("/api/payments/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["stripe-signature"];
  const result = await stripeService.handleWebhook(req.body, signature);
  if (!result.success) return res.status(400).json({ error: result.error });
  res.json({ received: true });
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many requests, please try again later" }
});

app.use("/api/", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/admin/login", authLimiter);

app.use("/api/auth", require("./routes/auth"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/designs", require("./routes/designs"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/contact", require("./routes/contact"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/products", require("./routes/products"));

if (process.env.NODE_ENV !== "production") {
  app.use("/api/dev", require("./routes/dev"));
}

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    stripe: stripeService.isEnabled(),
    database: "sql.js",
    static: process.env.SERVE_STATIC !== "false"
  });
});

if (process.env.SERVE_STATIC !== "false") {
  if (fs.existsSync(PUBLIC_DIR)) {
    app.use(express.static(PUBLIC_DIR));
    app.get("/", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));
  } else {
    app.use(express.static(ROOT, {
      dotfiles: "deny",
      index: ["index.html"],
      setHeaders: (res, filePath) => {
        const relative = path.relative(ROOT, filePath).toLowerCase().replace(/\\/g, "/");
        if (relative.startsWith("server/") || relative.startsWith("docs/") || relative.startsWith(".git")) {
          res.status(404).send("Not found");
        }
      }
    }));
    app.get("/", (req, res) => res.sendFile(path.join(ROOT, "index.html")));
  }
}

async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`River Magnet Server running on http://localhost:${PORT}`);
    console.log(`  Storefront : http://localhost:${PORT}/index.html`);
    console.log(`  Admin      : http://localhost:${PORT}/admin/index.html`);
    console.log(`  User center: http://localhost:${PORT}/user-center.html`);
    console.log(`AI: ${process.env.SEEDREAM_API_KEY ? "env key" : "built-in key"}`);
    console.log(`Stripe: ${stripeService.isEnabled() ? "enabled" : "disabled"}`);
    console.log(`Admin login: ${process.env.ADMIN_USERNAME || "admin"} / ****`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
