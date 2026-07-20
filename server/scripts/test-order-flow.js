/**
 * End-to-end order test without AI (uses /api/dev/seed-design)
 * Run: npm run test:order  (server must be running)
 */
const http = require("http");

const BASE = process.env.API_BASE || "http://localhost:3000";

function request(method, path, body, headers) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { "Content-Type": "application/json", ...headers }
    };
    const req = http.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        let json;
        try { json = JSON.parse(data); } catch { json = { raw: data }; }
        resolve({ status: res.statusCode, json });
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const results = [];
  const ok = (name, cond, detail) => {
    results.push({ name, pass: !!cond, detail });
    console.log((cond ? "✓" : "✗") + " " + name + (detail ? " — " + detail : ""));
  };

  console.log("Order E2E Test (no AI)\nBase: " + BASE + "\n");

  const health = await request("GET", "/api/health");
  ok("Health", health.status === 200);

  const suffix = Date.now();
  const register = await request("POST", "/api/auth/register", {
    username: "e2e_" + suffix,
    email: "e2e" + suffix + "@test.com",
    password: "test123456"
  });
  ok("Register", register.status === 201);
  const token = register.json.token;
  const auth = { Authorization: "Bearer " + token };

  const seed = await request("POST", "/api/dev/seed-design", {}, auth);
  ok("Seed test design", seed.status === 200, "designId=" + seed.json.designId);

  const order = await request("POST", "/api/orders/batch", {
    items: [{
      designId: seed.json.designId,
      styleId: "3d-cartoon",
      sizeId: "standard",
      quantity: 2,
      unitPrice: 11.99
    }],
    addons: ["giftBox"],
    shippingName: "E2E User",
    shippingAddress: "123 Test St",
    shippingCity: "Portland",
    shippingCountry: "US",
    email: "e2e" + suffix + "@test.com"
  }, auth);

  ok("Place batch order", order.status === 201, "order #" + order.json.order?.id + " total=$" + order.json.order?.total);

  const adminLogin = await request("POST", "/api/admin/login", {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "admin123"
  });
  ok("Admin login", adminLogin.status === 200);

  const orderId = order.json.order?.id;
  const adminAuth = { Authorization: "Bearer " + adminLogin.json.token };

  const paid = await request("PATCH", "/api/admin/orders/" + orderId + "/status", { status: "paid" }, adminAuth);
  ok("Mark paid", paid.status === 200, paid.json.order?.status);

  const prod = await request("PATCH", "/api/admin/orders/" + orderId + "/status", { status: "in_production" }, adminAuth);
  ok("Mark in_production", prod.status === 200);

  const ship = await request("POST", "/api/admin/orders/" + orderId + "/ship", {
    carrier: "USPS",
    trackingNo: "940011189922" + suffix
  }, adminAuth);
  ok("Ship order", ship.status === 200, ship.json.order?.status);

  const stats = await request("GET", "/api/admin/stats", null, adminAuth);
  ok("Dashboard stats", stats.status === 200, "ordersToday=" + stats.json.stats?.ordersToday);

  const failed = results.filter((r) => !r.pass);
  console.log("\n" + results.filter((r) => r.pass).length + "/" + results.length + " passed");
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
