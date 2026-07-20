const express = require("express");
const jwt = require("jsonwebtoken");
const store = require("../services/designStore");
const { JWT_SECRET } = require("../lib/authMiddleware");

const router = express.Router();

const TINY_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Login required" });
  }
  try {
    req.user = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Session expired" });
  }
}

router.post("/seed-design", requireAuth, (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }

  try {
    const session = store.createSession(req.user.id);
    store.saveDataUri(session.id, "original.png", TINY_PNG);
    const filename = store.saveDataUri(session.id, "candidate-1.png", TINY_PNG);
    const candidate = store.addCandidate(session.id, filename, "3d-cartoon", "3d");
    const result = store.confirmDesign(session.id, candidate.id, req.user.id);
    if (!result.success) return res.status(400).json({ error: result.error });

    res.json({
      designId: result.design.id,
      sessionId: session.id,
      previewUrl: `/api/designs/sessions/${session.id}/images/${filename}`,
      message: "Test design confirmed (dev only)"
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
