const express = require("express");
const { generateMagnetImage, getProductionStyles } = require("../services/aiGenerate");

const router = express.Router();

router.post("/generate", async (req, res) => {
  const { image: rawImage, styleId, dim, lang } = req.body;
  if (!rawImage) return res.status(400).json({ error: "Missing required parameter: image" });

  const forbiddenKeywords = ["nude", "nsfw", "porn", "violence", "weapon", "gore", "hate"];
  const customPrompt = req.body.prompt || "";
  if (forbiddenKeywords.some((kw) => customPrompt.toLowerCase().includes(kw))) {
    return res.status(400).json({ error: "Content policy violation." });
  }

  const effectiveDim = styleId === "flat-outline" ? "2d" : (dim || "3d");
  const result = await generateMagnetImage(rawImage, styleId || "3d-cartoon", effectiveDim, lang || "en");

  if (!result.success) {
    const err = result.error;
    if (err.status === 401 || err.status === 403) return res.status(502).json({ error: "AI authentication failed. Check API key." });
    if (err.status === 429) return res.status(429).json({ error: "Rate limit exceeded. Try again in a minute." });
    const msg = err.msg || "Unknown error";
    if (msg.includes("not activated")) {
      return res.status(502).json({ error: "AI model not activated. Check Volcengine Ark console." });
    }
    if (msg.includes("content")) return res.status(400).json({ error: "Content rejected by AI. Try a different photo." });
    return res.status(502).json({ error: `AI service error: ${msg}` });
  }

  return res.json({ image_data_uri: result.imageDataUri });
});

router.get("/styles", (req, res) => {
  res.json({ styles: getProductionStyles() });
});

module.exports = router;
