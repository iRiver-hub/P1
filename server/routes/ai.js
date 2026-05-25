const express = require("express");
const router = express.Router();

// ─── Volcengine Ark (Seedream) API Configuration ──────────────────────────
const ARK_API_KEY = process.env.SEEDREAM_API_KEY || "ark-0e32b23e-a8dc-4718-a6a4-94f50dadc430-d0bd9";
const ARK_BASE = process.env.SEEDREAM_ENDPOINT || "https://ark.cn-beijing.volces.com/api/v3";
const PRIMARY_MODEL = process.env.SEEDREAM_MODEL || "doubao-seedream-4-5-251128";
const FALLBACK_MODEL = "doubao-seedream-4-0-250828";
const GENERATION_TIMEOUT_MS = 120000;

// ─── Fridge Magnet Prompt Templates ────────────────────────────────────────
// ALL prompts generate: 3D magnet product ON a refrigerator door in a kitchen.
// This ensures every output is a consistent "magnet on fridge" showcase.

const STYLE_PROMPTS = {
  "3d-cartoon": {
    en: "A cute 3D cartoon style refrigerator magnet attached to a modern stainless steel French-door refrigerator. The magnet is a thick dimensional product with glossy resin surface, about 8mm thick, preserving the subject's features as an adorable cartoon character with smooth rounded edges. The refrigerator is in a clean bright modern kitchen with soft natural window lighting. Professional commercial product photography, shallow depth of field with the magnet in sharp focus and the refrigerator slightly blurred. The scene looks like a premium product listing photo.",
    zh: "一个可爱的3D卡通风格冰箱贴，吸附在一台现代不锈钢法式对开门冰箱上。冰箱贴是厚重的立体产品，约8毫米厚，高光泽树脂表面，将照片主体的特征转化为可爱的卡通角色，边缘圆润光滑。冰箱位于明亮干净的现代厨房中，柔和自然光从窗户照入。专业商业产品摄影，浅景深，冰箱贴清晰对焦，冰箱背景略微虚化。整个画面如同一张高级产品展示照片。"
  },
  "ceramic": {
    en: "A handcrafted ceramic style 3D refrigerator magnet attached to a modern stainless steel French-door refrigerator. The magnet is a thick glazed ceramic product with visible tactile texture and subtle hand-painted details, featuring the subject transformed into ceramic art. The magnet has dimensional depth, glossy glaze finish with slight color variations typical of kiln-fired ceramics. The refrigerator is in a clean bright kitchen with soft natural light. Professional product photography, shallow depth of field, the magnet in sharp focus.",
    zh: "一个手工陶瓷风格的3D冰箱贴，吸附在一台现代不锈钢法式对开门冰箱上。冰箱贴是厚重的釉面陶瓷产品，具有可见的手工质感和手绘细节，将主体转化为陶瓷艺术品。冰箱贴有立体深度，亮光釉面，带有陶瓷烧制特有的微妙色彩变化。冰箱位于干净明亮的厨房中，柔和自然光照明。专业产品摄影，浅景深，冰箱贴清晰对焦。"
  },
  "resin": {
    en: "A premium resin art 3D refrigerator magnet attached to a modern stainless steel French-door refrigerator. The magnet is a luxury collectible with crystal-clear resin encapsulation, the subject rendered as a detailed 3D figurine suspended within the resin layer. The magnet has dramatic dimensional depth, high gloss mirror-like surface, and metallic silver border edge. The refrigerator is in an elegant modern kitchen with soft ambient lighting. Premium product photography, shallow depth of field, the magnet in razor-sharp focus.",
    zh: "一个高级树脂艺术3D冰箱贴，吸附在一台现代不锈钢法式对开门冰箱上。冰箱贴是奢侈收藏品级别，水晶般透明的树脂封装，主体被制作成精细的3D立体人偶悬浮在树脂层中。冰箱贴具有戏剧性的立体深度，镜面般高光泽表面，银色金属边框。冰箱位于优雅的现代厨房中，柔和环境光。高级产品摄影，浅景深，冰箱贴极致清晰对焦。"
  },
  "pop-art": {
    en: "A vibrant pop art style 3D refrigerator magnet attached to a modern stainless steel French-door refrigerator. The magnet is a thick glossy product with bold pop art comic halftone dots, vivid saturated colors, and strong graphic outlines, featuring the subject in retro pop art illustration style. The magnet has pronounced 3D thickness, glossy finish, and a colorful border. The refrigerator is in a bright modern kitchen with natural lighting. Bold commercial product photography, shallow depth of field, the magnet in sharp focus.",
    zh: "一个鲜艳的波普艺术风格3D冰箱贴，吸附在一台现代不锈钢法式对开门冰箱上。冰箱贴是厚重的高光泽产品，带有大胆的波普艺术漫画网点、高饱和鲜艳色彩和强烈的图形轮廓线，将主体转化为复古波普艺术插画风格。冰箱贴具有明显的3D厚度，高光表面，彩色边框。冰箱位于明亮的现代厨房中，自然光照明。大胆的商业产品摄影，浅景深，冰箱贴清晰对焦。"
  }
};

// ─── Shape descriptions (appended to prompt) ─────────────────────────────
const SHAPE_DESCRIPTIONS = {
  round: { en: "The magnet is circular/round shaped.", zh: "冰箱贴是圆形/圆形的。" },
  square: { en: "The magnet is a rounded square shape with slightly rounded corners.", zh: "冰箱贴是圆角方形，四角略微圆润。" }
};

function buildPrompt(styleId, shape, lang) {
  const templates = STYLE_PROMPTS[styleId] || STYLE_PROMPTS["3d-cartoon"];
  const shapeDesc = SHAPE_DESCRIPTIONS[shape] || SHAPE_DESCRIPTIONS["square"];
  const prompt = (templates.en || templates.zh) + " " + (shapeDesc.en || shapeDesc.zh);
  const tail = "The refrigerator is always the same model: a modern stainless steel French-door refrigerator with two upper doors and a bottom freezer drawer, silver metallic finish. The kitchen is clean, bright, with white walls and soft daylight. The magnet is always clearly visible on the upper door area. No people, no hands, no text, no watermarks.";
  return prompt + " " + tail;
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
  const { prompt: customPrompt, image: rawImage, styleId, shape, lang } = req.body;
  if (!rawImage) return res.status(400).json({ error: "Missing required parameter: image" });
  const image = normalizeImage(rawImage);
  if (!image) return res.status(400).json({ error: "Invalid image data format" });
  const forbiddenKeywords = ["nude", "nsfw", "porn", "violence", "weapon", "gore", "hate"];
  if (forbiddenKeywords.some(kw => (customPrompt || "").toLowerCase().includes(kw))) return res.status(400).json({ error: "Content policy violation." });

  const prompt = customPrompt || buildPrompt(styleId || "3d-cartoon", shape || "square", lang || "en");
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

  console.log(`Seedream success: style=${styleId}`);
  return res.json({ image_data_uri: result.imageDataUri });
});

// ─── GET /api/ai/styles ───────────────────────────────────────────────────

router.get("/styles", (req, res) => {
  res.json({
    styles: [
      { id: "3d-cartoon", name: "Cute 3D Cartoon", description: "Adorable 3D cartoon character with glossy resin finish" },
      { id: "ceramic", name: "Handcrafted Ceramic", description: "Glazed ceramic texture with warm handcrafted feel" },
      { id: "resin", name: "Premium Resin Art", description: "Crystal-clear resin collectible with mirror gloss" },
      { id: "pop-art", name: "Vibrant Pop Art", description: "Bold comic-style pop art with vivid saturated colors" }
    ]
  });
});

module.exports = router;