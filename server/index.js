const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const aiRoutes = require("./routes/ai");

const app = express();
const PORT = process.env.PORT || 3000;

// Increase body size limit for base64 images (up to 10MB)
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/orders", require("./routes/orders"));
app.use("/api/contact", require("./routes/contact"));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`River Magnet Server running on port ${PORT}`);
  console.log(`AI service: ${process.env.SEEDREAM_API_KEY ? "Configured" : "Not configured"}`);
});
