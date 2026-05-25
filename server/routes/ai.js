const express = require("express");
const router = express.Router();

// ─── Volcengine Ark (Seedream) API Configuration ──────────────────────────
const ARK_API_KEY = process.env.SEEDREAM_API_KEY || "ark-0e32b23e-a8dc-4718-a6a4-94f50dadc430-d0bd9";
const ARK_BASE = process.env.SEEDREAM_ENDPOINT || "https://ark.cn-beijing.volces.com/api/v3";
const PRIMARY_MODEL = process.env.SEEDREAM_MODEL || "doubao-seedream-4-5-251128";
const FALLBACK_MODEL = "doubao-seedream-4-0-250828";
const GENERATION_TIMEOUT_MS = 120000;

// ─── Magnet-Only Prompt Templates ─────────────────────────────────────────
// AI generates ONLY the die-cut magnet product on white background.
// Frontend composites the magnet onto a fixed fridge illustration.

const STYLE_PROMPTS = {
  "3d-cartoon": "A cute cartoon-style die-cut refrigerator magnet featuring the subject transformed into an adorable cartoon character with smooth rounded features and glossy surface. The magnet is cut to the natural contour shape of the character, no rectangular border.",
  "ceramic": "A handcrafted ceramic-style die-cut refrigerator magnet featuring the subject as glazed ceramic art with visible tactile texture and subtle hand-painted details. The magnet follows organic contour shape, no frame.",
  "resin": "A premium crystal-clear resin art die-cut refrigerator magnet featuring the subject rendered as a detailed figurine encapsulated within transparent resin. Contour-cut shape with metallic border edge.",
  "pop-art": "A bold pop art style die-cut refrigerator magnet featuring the subject with comic halftone dots, vivid saturated colors, and strong graphic outlines in retro pop art style. Contour-cut to the subject shape.",
  "watercolor": "A soft watercolor painting style die-cut refrigerator magnet featuring the subject with gentle color washes, bleeding edges, and artistic paper texture. Organic contour-cut shape.",
  "oil-painting": "A classic oil painting style die-cut refrigerator magnet featuring the subject with visible brush strokes, rich impasto texture, and warm oil pigment colors. Contour-cut organic shape.",
  "pixel-art": "A retro pixel art style die-cut refrigerator magnet featuring the subject as a pixel game character with crisp square pixels, limited color palette, and nostalgic 8-bit aesthetic. Contour silhouette cut.",
  "anime": "A Japanese anime illustration style die-cut refrigerator magnet featuring the subject with clean line art, cel-shaded coloring, large expressive features, and vibrant screentone patterns. Contour-cut shape.",
  "clay": "A stop-motion claymation style die-cut refrigerator magnet featuring the subject as a clay figure with fingerprint textures, soft rounded forms, and matte pastel colors. Organic contour-cut shape."
};

// ─── 2D vs 3D prefix ────────────────────────────────────────────────────
const DIM_PREFIX = {
  "3d": "A thick 3D epoxy dome refrigerator magnet with glossy resin dome on top creating dimensional depth, approximately 8mm thick. ",
  "2d": "A flat 2D die-cut printed refrigerator magnet. "
};

const DIM_SUFFIX = {
  "3d": " slightly angled view to show 3D thickness and epoxy dome effect. The magnet has visible dimensional depth with a glossy raised resin layer on top. Isolated product on plain white studio background with clean shadow directly underneath. Professional product photography, studio lighting. No text, no watermarks.",
  "2d": " flat top-down view showing the contour-cut edges. The magnet is completely flat with matte finish. Isolated product on plain white studio background with no shadow on the background. Professional product photography, even studio lighting. No text, no watermarks."
};

function buildPrompt(styleId, dim, lang) {
  const styleDesc = STYLE_PROMPTS[styleId] || STYLE_PROMPTS["3d-cartoon"];
  const prefix = DIM_PREFIX[dim] || DIM_PREFIX["3d"];
  const suffix = DIM_SUFFIX[dim] || DIM_SUFFIX["3d"];

  // Language-specific quality tag
  const zhTag = lang === "zh" ? " 高质量产品图。" : "";

  return prefix + styleDesc + suffix + zhTag;
}

function normalizeImage(imageData) {
  if (!imageData) return null;
  if (typeof imageData === "string" && imageData.startsWith("data:image/")) return imageData;
  if (typeof imageData === "string" && imageData.length > 100) return "data:image/png;base64," + imageData;
  return null;
}

// ─── callSeedream with automatic model fallback ──────────────────────────

async function callSeedream(image, prompt) {
  const modelsToTry = [PRIMARY_MODEL, FALLBACK_MODEL];
  let lastError = null;

  for (const model of modelsToTry) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

    try {
      console.log(`Trying model: ${model}...`);
      const arkResponse = await fetch(`${ARK_BASE}/images/generations`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${ARK_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt, image, size: "2048x2048", sequential_image_generation: "disabled", response_format: "url", watermark: false }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      let data;
      try { data = await arkResponse.json(); }
      catch { const text = await arkResponse.text().catch(() => "No response body"); lastError = { status: 502, msg: "Non-JSON: " + text.substring(0, 200) }; continue; }

      const errorMsg = data.error?.message || data.error?.code || data.message || "";
      if (!arkResponse.ok && errorMsg.includes("not activated")) { console.log(`Model ${model} not activated, trying next...`); lastError = { status: 502, msg: `Model ${model} not activated` }; continue; }
      if (!arkResponse.ok) { console.error(`Seedream error (${model}):`, JSON.stringify(data).substring(0, 500)); return { success: false, error: { status: arkResponse.status, msg: errorMsg || `HTTP ${arkResponse.status}` } }; }

      let imageUrl = null;
      if (data.data?.[0]?.url) imageUrl = data.data[0].url;
      else if (data.url) imageUrl = data.url;
      else if (data.output?.image_url) imageUrl = data.output.image_url;

      if (!imageUrl) { console.error(`Seedream bad response (${model}):`, JSON.stringify(data).substring(0, 500)); return { success: false, error: { status: 502, msg: "Unexpected response format" } }; }

      console.log(`Seedream success: model=${model}, url=${imageUrl.substring(0, 80)}...`);

      try {
        const imgResponse = await fetch(imageUrl);
        if (!imgResponse.ok) { lastError = { status: 502, msg: `CDN download failed (HTTP ${imgResponse.status})` }; continue; }
        const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
        const contentType = imgResponse.headers.get("content-type") || "image/png";
        return { success: true, imageDataUri: `data:${contentType};base64,${imgBuffer.toString("base64")}` };
      } catch (downloadErr) { lastError = { status: 502, msg: `Download failed: ${downloadErr.message}` }; }
    } catch (err) {
      clearTimeout(timeout);
      lastError = { status: 502, msg: err.name === "AbortError" ? "Generation timed out" : `Network error: ${err.message}` };
    }
  }
  return { success: false, error: lastError || { status: 502, msg: "All models exhausted" } };
}

// ─── POST /api/ai/generate ────────────────────────────────────────────────

router.post("/generate", async (req, res) => {
  const { prompt: customPrompt, image: rawImage, styleId, dim, lang } = req.body;
  if (!rawImage) return res.status(400).json({ error: "Missing required parameter: image" });
  const image = normalizeImage(rawImage);
  if (!image) return res.status(400).json({ error: "Invalid image data format" });
  const forbiddenKeywords = ["nude", "nsfw", "porn", "violence", "weapon", "gore", "hate"];
  if (forbiddenKeywords.some(kw => (customPrompt || "").toLowerCase().includes(kw))) return res.status(400).json({ error: "Content policy violation." });

  const prompt = customPrompt || buildPrompt(styleId || "3d-cartoon", dim || "3d", lang || "en");
  const result = await callSeedream(image, prompt);

  if (!result.success) {
    const err = result.error;
    if (err.status === 401 || err.status === 403) return res.status(502).json({ error: "AI authentication failed. Check API key." });
    if (err.status === 429) return res.status(429).json({ error: "Rate limit exceeded. Try again in a minute." });
    const msg = err.msg || "Unknown error";
    if (msg.includes("not activated")) return res.status(502).json({ error: "AI model not activated. Go to https://console.volcengine.com/ark/region:ark+cn-beijing/openManagement and activate doubao-seedream-4-5-251128 or doubao-seedream-4-0-250828" });
    if (msg.includes("content")) return res.status(400).json({ error: "Content rejected by AI. Try a different photo." });
    return res.status(502).json({ error: `AI service error: ${msg}` });
  }

  console.log(`Seedream success: style=${styleId}, dim=${dim}`);
  return res.json({ image_data_uri: result.imageDataUri });
});

// ─── GET /api/ai/styles ───────────────────────────────────────────────────

router.get("/styles", (req, res) => {
  res.json({
    styles: [
      { id: "3d-cartoon", name: "Cute Cartoon", description: "Adorable cartoon character style" },
      { id: "ceramic", name: "Ceramic Art", description: "Handcrafted glazed ceramic texture" },
      { id: "resin", name: "Resin Art", description: "Crystal-clear resin collectible" },
      { id: "pop-art", name: "Pop Art", description: "Bold comic pop art style" },
      { id: "watercolor", name: "Watercolor", description: "Soft watercolor painting style" },
      { id: "oil-painting", name: "Oil Painting", description: "Classic oil painting texture" },
      { id: "pixel-art", name: "Pixel Art", description: "Retro pixel game art style" },
      { id: "anime", name: "Anime Style", description: "Japanese anime illustration" },
      { id: "clay", name: "Clay World", description: "Stop-motion claymation look" }
    ]
  });
});

module.exports = router;