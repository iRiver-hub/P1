/**
 * API flow verification (no AI call — uses mock upload only)
 * Run: node scripts/verify-flow.js
 */
const http = require("http");

const BASE = process.env.API_BASE || "http://localhost:3000";

// 1x1 red PNG
const TINY_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function request(method, path, body, headers) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers: { "Content-Type": "application/json", ...headers } };
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

  console.log("River Magnets API Verification\nBase: " + BASE + "\n");

  const health = await request("GET", "/api/health");
  ok("Health check", health.status === 200, health.json.status);

  const styles = await request("GET", "/api/ai/styles");
  ok("11 art styles", (styles.json.styles?.length || 0) >= 11, "count=" + (styles.json.styles?.length || 0));

  const session = await request("POST", "/api/designs/sessions");
  ok("Create session", session.status === 201, "id=" + session.json.sessionId);
  const sid = session.json.sessionId;

  const upload = await request("POST", "/api/designs/sessions/" + sid + "/upload", { image: TINY_PNG });
  ok("Upload image", upload.status === 200, upload.json.originalImage);

  const getSession = await request("GET", "/api/designs/sessions/" + sid);
  ok("Get session", getSession.json.session?.hasOriginal === true);

  const register = await request("POST", "/api/auth/register", {
    username: "verify_" + Date.now(),
    email: "verify" + Date.now() + "@test.com",
    password: "test123456"
  });
  ok("Register user", register.status === 201);
  const token = register.json.token;

  // Generate may fail without valid AI key/model — report separately
  const gen = await request("POST", "/api/designs/sessions/" + sid + "/generate", { styleId: "3d-cartoon", dim: "3d" });
  if (gen.status === 200) {
    ok("AI generate", true, "candidate #" + gen.json.candidate?.id);
    const confirm = await request("POST", "/api/designs/sessions/" + sid + "/confirm", { candidateId: gen.json.candidate.id }, { Authorization: "Bearer " + token });
    ok("Confirm design", confirm.status === 201, "designId=" + confirm.json.designId);

    const order = await request("POST", "/api/orders", {
      designId: confirm.json.designId,
      quantity: 1,
      shippingName: "Test User",
      shippingAddress: "123 Test St",
      shippingCity: "Test City",
      shippingCountry: "US"
    }, { Authorization: "Bearer " + token });
    ok("Place order with designId", order.status === 201, "order #" + order.json.order?.id);

    const orderNoDesign = await request("POST", "/api/orders", {
      quantity: 1,
      shippingName: "X",
      shippingAddress: "Y",
      shippingCity: "Z",
      shippingCountry: "US"
    }, { Authorization: "Bearer " + token });
    ok("Reject order without designId", orderNoDesign.status === 400);
  } else {
    ok("AI generate", false, gen.json.error || "status " + gen.status);
    console.log("\n⚠ AI generation skipped — confirm/order steps need manual UI test.");
    console.log("  Ensure SEEDREAM_API_KEY is set and models are activated.\n");
  }

  const admin = await request("GET", "/api/admin/orders", null, { "X-Admin-Key": "river-admin-dev" });
  ok("Admin orders API", admin.status === 200, "orders=" + (admin.json.orders?.length ?? 0));

  const failed = results.filter((r) => !r.pass);
  console.log("\n" + results.filter((r) => r.pass).length + "/" + results.length + " passed");
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  console.error("Is the server running? cd server && npm start");
  process.exit(1);
});
