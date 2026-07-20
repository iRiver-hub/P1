const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "river.db");

let db = null;
let SQL = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TEXT NOT NULL,
  last_login TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  lang_key TEXT,
  width_cm REAL,
  height_cm REAL,
  price REAL NOT NULL,
  active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS discount_tiers (
  min_qty INTEGER PRIMARY KEY,
  percent INTEGER NOT NULL,
  lang_key TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  username TEXT,
  status TEXT DEFAULT 'pending',
  subtotal REAL,
  discount_percent INTEGER DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  total REAL,
  shipping_name TEXT,
  shipping_address TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_zip TEXT,
  shipping_country TEXT,
  email TEXT,
  notes TEXT,
  stripe_session_id TEXT,
  payment_status TEXT DEFAULT 'unpaid',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  design_id INTEGER,
  session_id INTEGER,
  style_id TEXT,
  dim TEXT,
  preview_image TEXT,
  size_id TEXT,
  size_label TEXT,
  fridge_type TEXT,
  quantity INTEGER,
  unit_price REAL
);

CREATE TABLE IF NOT EXISTS shipments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER UNIQUE NOT NULL,
  carrier TEXT,
  tracking_no TEXT,
  shipped_at TEXT
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  amount REAL,
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'pending',
  paid_at TEXT
);

CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;

function persist() {
  if (!db) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function run(sql, params = []) {
  db.run(sql, params);
  persist();
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function runReturning(sql, params = []) {
  db.run(sql, params);
  const row = get("SELECT last_insert_rowid() AS id");
  persist();
  return row ? row.id : null;
}

function migrateSchema() {
  const cols = all("PRAGMA table_info(orders)").map((c) => c.name);
  if (!cols.includes("addon_total")) run("ALTER TABLE orders ADD COLUMN addon_total REAL DEFAULT 0");
  if (!cols.includes("shipping_fee")) run("ALTER TABLE orders ADD COLUMN shipping_fee REAL DEFAULT 0");
  if (!cols.includes("addons")) run("ALTER TABLE orders ADD COLUMN addons TEXT DEFAULT '[]'");
}

function seedDefaults() {
  const productCount = get("SELECT COUNT(*) AS c FROM products").c;
  if (productCount === 0) {
    const products = [
      ["mini", "size-mini", 5, 6, 7.99, 1, 1],
      ["standard", "size-standard", 8, 10, 11.99, 1, 2],
      ["large", "size-large", 12, 15, 16.99, 1, 3]
    ];
    products.forEach((p) => {
      run("INSERT INTO products (id, lang_key, width_cm, height_cm, price, active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)", p);
    });
  }

  const tierCount = get("SELECT COUNT(*) AS c FROM discount_tiers").c;
  if (tierCount === 0) {
    [
      [2, 5, "discount-tier-1"],
      [4, 10, "discount-tier-2"],
      [7, 15, "discount-tier-3"]
    ].forEach((t) => {
      run("INSERT INTO discount_tiers (min_qty, percent, lang_key) VALUES (?, ?, ?)", t);
    });
  }
}

function migrateFromJson() {
  const migrated = get("SELECT value FROM meta WHERE key = 'json_migrated'");
  if (migrated && migrated.value === "1") return;

  const usersFile = path.join(__dirname, "..", "users.json");
  if (fs.existsSync(usersFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(usersFile, "utf8"));
      (data.users || []).forEach((u) => {
        const exists = get("SELECT id FROM users WHERE username = ?", [u.username]);
        if (!exists) {
          run(
            "INSERT INTO users (id, username, email, password, role, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [u.id, u.username, u.email, u.password, u.role || "user", u.created_at || new Date().toISOString(), u.last_login || null]
          );
        }
      });
      const maxId = get("SELECT MAX(id) AS m FROM users");
      if (maxId && maxId.m) {
        run("INSERT OR REPLACE INTO meta (key, value) VALUES ('users_next_id', ?)", [String(maxId.m + 1)]);
      }
    } catch (e) {
      console.warn("users.json migration skipped:", e.message);
    }
  }

  const ordersFile = path.join(__dirname, "..", "orders.json");
  if (fs.existsSync(ordersFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(ordersFile, "utf8"));
      (data.orders || []).forEach((o) => {
        const exists = get("SELECT id FROM orders WHERE id = ?", [o.id]);
        if (exists) return;

        run(
          `INSERT INTO orders (id, user_id, username, status, subtotal, discount_percent, discount_amount, total,
            shipping_name, shipping_address, shipping_city, shipping_state, shipping_zip, shipping_country,
            email, notes, payment_status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            o.id, o.userId, o.username || "", o.status || "pending",
            o.subtotal || 0, o.discountPercent || 0, o.discountAmount || 0, o.total || 0,
            o.shippingName || "", o.shippingAddress || "", o.shippingCity || "",
            o.shippingState || "", o.shippingZip || "", o.shippingCountry || "",
            o.email || "", o.notes || "", o.paymentStatus || "unpaid",
            o.createdAt || new Date().toISOString(), o.updatedAt || new Date().toISOString()
          ]
        );

        const items = o.items || (o.designId ? [{
          designId: o.designId, sessionId: o.sessionId, styleId: o.styleId, dim: o.dim,
          previewImage: o.previewImage, sizeId: "standard", size: o.size, quantity: o.quantity, unitPrice: 9.99
        }] : []);

        items.forEach((item) => {
          run(
            `INSERT INTO order_items (order_id, design_id, session_id, style_id, dim, preview_image, size_id, size_label, fridge_type, quantity, unit_price)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              o.id, item.designId || null, item.sessionId || null, item.styleId || "",
              item.dim || "", item.previewImage || item.previewUrl || "", item.sizeId || "standard",
              item.size || item.sizeLabel || "", item.fridgeType || "french-door",
              item.quantity || 1, item.unitPrice || 9.99
            ]
          );
        });
      });
    } catch (e) {
      console.warn("orders.json migration skipped:", e.message);
    }
  }

  const contactsFile = path.join(__dirname, "..", "contacts.json");
  if (fs.existsSync(contactsFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(contactsFile, "utf8"));
      const list = Array.isArray(data) ? data : data.contacts || [];
      list.forEach((c) => {
        run(
          "INSERT INTO contacts (name, email, subject, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          [c.name, c.email, c.subject || "", c.message, c.status || "new", c.createdAt || new Date().toISOString()]
        );
      });
    } catch (e) {
      console.warn("contacts.json migration skipped:", e.message);
    }
  }

  run("INSERT OR REPLACE INTO meta (key, value) VALUES ('json_migrated', '1')");
}

async function initDatabase() {
  if (db) return db;
  SQL = await initSqlJs();
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.exec(SCHEMA);
  migrateSchema();
  seedDefaults();
  migrateFromJson();
  persist();
  return db;
}

function getDb() {
  if (!db) throw new Error("Database not initialized. Call initDatabase() first.");
  return db;
}

module.exports = {
  initDatabase,
  getDb,
  run,
  get,
  all,
  runReturning,
  persist,
  DB_PATH
};
