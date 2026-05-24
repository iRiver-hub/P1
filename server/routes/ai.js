const express = require("express");
const router = express.Router();

// ─── Volcengine Ark (Seedream) API Configuration ──────────────────────────
const ARK_API_KEY = process.env.SEEDREAM_API_KEY || "ark-0e32b23e-a8dc-4718-a6a4-94f50dadc430-d0bd9";
const ARK_BASE = process.env.SEEDREAM_ENDPOINT || "https://ark.cn-beijing.volces.com/api/v3";
// Seedream 4.5: latest & recommended. 4.0: doubao-seedream-4-0-250828
const PRIMARY_MODEL = process.env.SEEDREAM_MODEL || "doubao-seedream-4-5-251128";
const FALLBACK_MODEL = "doubao-seedream-4-0-250828";
const GENERATION_TIMEOUT_MS = 120000; // 2 minutes

// ─── Fridge Magnet Prompt Templates ────────────────────────────────────────
// Each style has a complete, standalone prompt engineered specifically
// to produce a realistic refrigerator magnet product photo output.
// The prompt works in image-to-image mode: user's photo provides the subject,
// the prompt describes the transformation into a fridge magnet.

const STYLE_PROMPTS = {
  "3d-cartoon": {
    zh: "将这张照片制作成一个3D卡通风格的冰箱贴。冰箱贴是具有立体厚度的实物产品，白色圆形边框，表面光滑有光泽，呈现塑料质感。保留照片中主体人物/动物的特征和神态，转化为可爱的卡通造型。产品摄影风格，浅色背景，柔光照明，高清晰度，商业级品质。",
    en: "Transform this photo into a 3D cartoon style refrigerator magnet. The magnet is a physical product with dimensional thickness, white rounded border frame, glossy smooth surface with plastic material texture. Preserve the key features and expression of the subject in the photo, converting them into a cute cartoon character. Product photography style, light clean background, soft studio lighting, high definition, commercial quality."
  },
  "clay-world": {
    zh: "将这张照片制作成一个黏土艺术风格的冰箱贴。冰箱贴具有手工黏土的质感和纹理，白色边框，圆角设计，立体凸起效果。照片主体转化为可爱的黏土手工造型，呈现温暖的手工感。产品摄影，干净背景，柔和暖光，高质量，细腻纹理。",
    en: "Transform this photo into a clay art style refrigerator magnet. The magnet features handcrafted clay texture and tactile quality, white border frame, rounded corners, dimensional raised effect. The subject from the photo becomes a cute clay figurine with warm handcrafted feel. Product photography, clean background, soft warm lighting, high quality, fine grain texture."
  },
  "pixel-art": {
    zh: "将这张照片制作成一个像素艺术风格的冰箱贴。冰箱贴是实物产品，白色边框，方形像素块质感，复古游戏美学。照片中的主体以16-bit像素风格重新演绎，色彩鲜艳明快。产品摄影，干净背景，清晰光照，高清晰度。",
    en: "Transform this photo into a pixel art style refrigerator magnet. The magnet is a physical product with white border frame, visible pixel block texture, retro video game aesthetic. The subject from the photo is recreated in 16-bit pixel art style with vibrant colors. Product photography, clean background, clear lighting, high definition."
  },
  "anime": {
    zh: "将这张照片制作成一个日式动漫风格的冰箱贴。冰箱贴是实物产品，白色边框，光面质感。保留照片中主体的特征，以精美的日式动画风格重新绘制，干净利落的线条，柔和色彩。产品摄影风格，浅色背景，柔和光照。",
    en: "Transform this photo into an anime style refrigerator magnet. The magnet is a physical product with white border frame, glossy finish. Preserve the subject's features from the photo, redrawn in refined Japanese anime art style with clean linework and soft colors. Product photography style, light background, soft lighting."
  },
  "watercolor": {
    zh: "将这张照片制作成一个水彩画风格的冰箱贴。冰箱贴是实物产品，白色边框，具有水彩画纸的细腻纹理质感。照片主体以柔和的水彩技法表现，色彩淡雅通透，笔触自然流淌。产品摄影，干净背景，柔和自然光。",
    en: "Transform this photo into a watercolor painting style refrigerator magnet. The magnet is a physical product with white border frame, featuring delicate watercolor paper texture. The subject from the photo is rendered with soft watercolor techniques, gentle flowing brush strokes, translucent pastel colors. Product photography, clean background, soft natural light."
  },
  "oil-painting": {
    zh: "将这张照片制作成一个古典油画风格的冰箱贴。冰箱贴是实物产品，白色边框，表面呈现油画的厚重笔触肌理。照片主体以古典油画技法重新创作，层次丰富，色彩浓郁，具有博物馆级艺术品质。产品摄影，深色背景衬托，专业画廊灯光。",
    en: "Transform this photo into a classical oil painting style refrigerator magnet. The magnet is a physical product with white border frame, surface showing rich impasto brush stroke texture. The subject from the photo is recreated using classical oil painting techniques with layered depth and rich saturated colors, museum-quality artistry. Product photography, dark elegant background, professional gallery lighting."
  }
};

// Default prompt when style not found
const DEFAULT_PROMPT = {
  zh: "将这张照片制作成一个冰箱贴。冰箱贴是实物产品，白色边框，圆角设计，光滑表面。保留照片中主体的关键特征。产品摄影，干净背景，专业照明，高质量。",
  en: "Transform this photo into a refrigerator magnet. The magnet is a physical product with white border frame, rounded corners, glossy surface. Preserve the key features of the subject from the photo. Product photography, clean background, professional lighting, high quality."
};

// Universal negative prompt: strictly prevent non-magnet output
const UNIVERSAL_NEGATIVE = "text, watermark, logo, signature, letters, words, frame border decoration, blurry, low quality, jpeg artifacts, distorted face, extra limbs, bad anatomy, nude, nsfw, gore, violence, weapon, person standing, full body photograph, original photo style, not a magnet, not a product, abstract art, surreal, background scene, landscape";

/**
 * Build the complete generation prompt by combining the styled template
 * with fridge magnet physical description.
 */
function buildPrompt(styleId, lang) {
  const templates = STYLE_PROMPTS[styleId] || DEFAULT_PROMPT;
  // Prefer English prompt (better results with Seedream); fallback to Chinese
  const prompt = templates.en || templates.zh;

  // Append universal fridge magnet physical constraints
  const tail = "The output MUST be a single refrigerator magnet product photo. The magnet is a standalone physical object with white glossy border frame, rounded corners, dimensional thickness, placed flat on a plain clean surface. Top-down product photography angle. No human hands holding the magnet. No background scenes. The magnet is the ONLY object in frame.";
  return prompt + " " + tail;
}

/**
 * Validate and sanitize the incoming base64 image data.
 * Ensures it has the proper data URI prefix required by Seedream API.
 */
function normalizeImage(imageData) {
  if (!imageData) return null;

  // Already has data URI prefix
  if (typeof imageData === "string" && imageData.startsWith("data:image/")) {
    return imageData;
  }

  // Raw base64 – add PNG prefix (the frontend resizes to PNG on white canvas)
  if (typeof imageData === "string" && imageData.length > 100) {
    return "data:image/png;base64," + imageData;
  }

  return null;
}

// ─── Route: POST /api/ai/generate ──────────────────────────────────────────

/**
 * Call Seedream API with automatic model fallback.
 * Tries PRIMARY_MODEL first; if account hasn't activated it, retries with FALLBACK_MODEL.
 */
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
        headers: {
          "Authorization": `Bearer ${ARK_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          image: image,
          size: "2048x2048",
          sequential_image_generation: "disabled",
          response_format: "url",
          watermark: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      let data;
      try {
        data = await arkResponse.json();
      } catch {
        const text = await arkResponse.text().catch(() => "No response body");
        lastError = { status: 502, msg: "AI service returned non-JSON response: " + text.substring(0, 200) };
        continue;
      }

      // Check for "not activated" error → try next model
      const errorMsg = data.error?.message || data.error?.code || data.message || "";
      if (!arkResponse.ok && errorMsg.includes("not activated")) {
        console.log(`Model ${model} not activated, trying next...`);
        lastError = { status: 502, msg: `Model ${model} not activated` };
        continue;
      }

      if (!arkResponse.ok) {
        const msg = errorMsg || `HTTP ${arkResponse.status}`;
        console.error(`Seedream API error (${model}):`, JSON.stringify(data).substring(0, 500));
        return { success: false, error: { status: arkResponse.status, msg } };
      }

      // Extract image URL
      let imageUrl = null;
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        imageUrl = data.data[0].url;
      } else if (data.url) {
        imageUrl = data.url;
      } else if (data.output && data.output.image_url) {
        imageUrl = data.output.image_url;
      }

      if (!imageUrl) {
        console.error(`Seedream unexpected response (${model}):`, JSON.stringify(data).substring(0, 500));
        return { success: false, error: { status: 502, msg: "AI service returned unexpected response format" } };
      }

      console.log(`Seedream success: model=${model}, url=${imageUrl.substring(0, 80)}...`);

      // Download the image from CDN and convert to base64
      // This avoids CORS issues when the frontend tries to load the CDN URL
      try {
        const imgResponse = await fetch(imageUrl);
        if (!imgResponse.ok) {
          lastError = { status: 502, msg: `Failed to download generated image from CDN (HTTP ${imgResponse.status})` };
          continue;
        }
        const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
        const contentType = imgResponse.headers.get("content-type") || "image/png";
        const base64 = imgBuffer.toString("base64");
        const dataUri = `data:${contentType};base64,${base64}`;
        return { success: true, imageDataUri: dataUri };
      } catch (downloadErr) {
        lastError = { status: 502, msg: `Failed to download generated image: ${downloadErr.message}` };
        continue;
      }

    } catch (err) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        lastError = { status: 502, msg: "AI generation timed out" };
      } else {
        lastError = { status: 502, msg: `Network error: ${err.message}` };
      }
    }
  }

  return { success: false, error: lastError || { status: 502, msg: "All models exhausted" } };
}

router.post("/generate", async (req, res) => {
  const { prompt: customPrompt, image: rawImage, styleId, lang } = req.body;

  // --- Parameter validation ---
  if (!rawImage) {
    return res.status(400).json({ error: "Missing required parameter: image" });
  }

  const image = normalizeImage(rawImage);
  if (!image) {
    return res.status(400).json({ error: "Invalid image data format" });
  }

  // --- Content filtering ---
  const forbiddenKeywords = ["nude", "nsfw", "porn", "violence", "weapon", "gore", "hate"];
  const checkText = (customPrompt || "").toLowerCase();
  if (forbiddenKeywords.some(kw => checkText.includes(kw))) {
    return res.status(400).json({ error: "Content policy violation: inappropriate content detected." });
  }

  // --- Build prompt ---
  const prompt = customPrompt || buildPrompt(styleId || "3d-cartoon", lang || "en");

  // --- Call Seedream API with automatic model fallback ---
  const result = await callSeedream(image, prompt);

  if (!result.success) {
    const err = result.error;
    if (err.status === 401 || err.status === 403) {
      return res.status(502).json({ error: "AI service authentication failed. Please check API key configuration." });
    }
    if (err.status === 429) {
      return res.status(429).json({ error: "AI service rate limit exceeded. Please try again in a minute." });
    }
    const msg = err.msg || "Unknown error";
    if (msg.includes("not activated")) {
      return res.status(502).json({
        error: "AI model not activated. Please go to https://console.volcengine.com/ark/region:ark+cn-beijing/openManagement and activate doubao-seedream-4-5-251128 or doubao-seedream-4-0-250828"
      });
    }
    if (msg.includes("content")) {
      return res.status(400).json({ error: "AI service rejected content. Please try a different photo or style." });
    }
    return res.status(502).json({ error: `AI service error: ${msg}` });
  }

  console.log(`Seedream generation success: style=${styleId}, model used`);
  return res.json({ image_data_uri: result.imageDataUri });
});

// ─── Route: GET /api/ai/styles ─────────────────────────────────────────────
// Returns available styles with metadata for frontend display

router.get("/styles", (req, res) => {
  res.json({
    styles: [
      { id: "3d-cartoon", name: "3D Cartoon", description: "Playful 3D cartoon character style with glossy finish" },
      { id: "clay-world", name: "Clay Art", description: "Handcrafted clay texture with warm tactile feel" },
      { id: "pixel-art", name: "Pixel Art", description: "Retro 16-bit video game pixel aesthetic" },
      { id: "anime", name: "Anime Style", description: "Japanese anime art with clean lines and soft colors" },
      { id: "watercolor", name: "Watercolor", description: "Delicate watercolor with flowing brush strokes" },
      { id: "oil-painting", name: "Oil Painting", description: "Classical oil painting with rich impasto texture" }
    ]
  });
});

module.exports = router;