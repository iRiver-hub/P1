const express = require("express");
const path = require("path");
const store = require("../services/designStore");
const { generateMagnetImage, getStyleDim } = require("../services/aiGenerate");
const { requireAuth, optionalAuth } = require("../lib/authMiddleware");

const router = express.Router();
const MAX_CANDIDATES = 3;

router.post("/sessions", optionalAuth, (req, res) => {
  const session = store.createSession(req.user?.id || null);
  res.status(201).json({ sessionId: session.id, status: session.status });
});

router.post("/sessions/:sessionId/upload", optionalAuth, (req, res) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const session = store.getSession(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.status === "confirmed") return res.status(400).json({ error: "Session is locked after confirmation" });

  const { image } = req.body;
  if (!image) return res.status(400).json({ error: "Missing image" });

  try {
    const filename = store.saveDataUri(sessionId, "original.png", image);
    const updated = store.updateSession(sessionId, {
      originalImage: filename,
      userId: req.user?.id || session.userId
    });
    res.json({ sessionId: updated.id, originalImage: filename, status: updated.status });
  } catch (e) {
    res.status(400).json({ error: e.message || "Failed to save image" });
  }
});

router.post("/sessions/:sessionId/generate", optionalAuth, async (req, res) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const session = store.getSession(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.status === "confirmed") return res.status(400).json({ error: "Session is locked" });
  if (!session.originalImage) return res.status(400).json({ error: "Upload a photo first" });
  if (session.candidates.length >= MAX_CANDIDATES) {
    return res.status(400).json({ error: `Maximum ${MAX_CANDIDATES} candidates per session. Confirm one or start a new session.` });
  }

  const { styleId, dim, lang } = req.body;
  if (!styleId) return res.status(400).json({ error: "styleId is required" });

  const effectiveDim = dim || getStyleDim(styleId);
  const originalDataUri = store.readImageAsDataUri(sessionId, session.originalImage);
  if (!originalDataUri) return res.status(400).json({ error: "Original image not found" });

  const result = await generateMagnetImage(originalDataUri, styleId, effectiveDim, lang);
  if (!result.success) {
    const err = result.error;
    return res.status(err.status === 429 ? 429 : 502).json({ error: err.msg || "AI generation failed" });
  }

  try {
    const candidateIndex = session.candidates.length + 1;
    const filename = store.saveDataUri(sessionId, `candidate-${candidateIndex}.png`, result.imageDataUri);
    const candidate = store.addCandidate(sessionId, filename, styleId, effectiveDim);
    store.updateSession(sessionId, { styleId, dim: effectiveDim, userId: req.user?.id || session.userId });

    res.json({
      candidate: {
        id: candidate.id,
        styleId: candidate.styleId,
        dim: candidate.dim,
        previewUrl: `/api/designs/sessions/${sessionId}/images/${filename}`,
        createdAt: candidate.createdAt
      },
      candidatesRemaining: MAX_CANDIDATES - session.candidates.length - 1
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to save generated image" });
  }
});

router.get("/sessions/:sessionId", (req, res) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const session = store.getSession(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });

  res.json({
    session: {
      id: session.id,
      status: session.status,
      styleId: session.styleId,
      dim: session.dim,
      hasOriginal: !!session.originalImage,
      confirmedDesignId: session.confirmedDesignId,
      candidates: session.candidates.map((c) => ({
        id: c.id,
        styleId: c.styleId,
        dim: c.dim,
        previewUrl: `/api/designs/sessions/${sessionId}/images/${c.imageFilename}`,
        createdAt: c.createdAt
      }))
    }
  });
});

const SAFE_FILENAME = /^[a-zA-Z0-9._-]+$/;

router.get("/sessions/:sessionId/images/:filename", (req, res) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const filename = path.basename(req.params.filename);
  if (!SAFE_FILENAME.test(filename)) {
    return res.status(400).json({ error: "Invalid filename" });
  }
  const baseDir = path.resolve(store.sessionDir(sessionId));
  const filePath = path.resolve(baseDir, filename);
  if (!filePath.startsWith(baseDir)) return res.status(400).json({ error: "Invalid path" });
  res.sendFile(filePath, (err) => {
    if (err) res.status(404).json({ error: "Image not found" });
  });
});

router.post("/sessions/:sessionId/confirm", requireAuth, (req, res) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const { candidateId } = req.body;
  if (!candidateId) return res.status(400).json({ error: "candidateId is required" });

  const result = store.confirmDesign(sessionId, candidateId, req.user.id);
  if (!result.success) return res.status(400).json({ error: result.error });

  const design = result.design;
  res.status(201).json({
    designId: design.id,
    styleId: design.styleId,
    dim: design.dim,
    previewUrl: `/api/designs/sessions/${sessionId}/images/${design.previewImage}`,
    lockedAt: design.lockedAt,
    message: "Design confirmed and locked for production"
  });
});

router.get("/:designId", requireAuth, (req, res) => {
  const design = store.getDesignForUser(parseInt(req.params.designId, 10), req.user.id);
  if (!design) return res.status(404).json({ error: "Design not found" });

  res.json({
    design: {
      id: design.id,
      sessionId: design.sessionId,
      styleId: design.styleId,
      dim: design.dim,
      status: design.status,
      previewUrl: `/api/designs/sessions/${design.sessionId}/images/${design.previewImage}`,
      lockedAt: design.lockedAt
    }
  });
});

module.exports = router;
