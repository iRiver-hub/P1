const { STYLES_CATALOG, getStyle, getStyleDim, listStylesForApi } = require("./stylesCatalog");

const ARK_API_KEY = process.env.SEEDREAM_API_KEY;
const ARK_BASE = process.env.SEEDREAM_ENDPOINT || "https://ark.cn-beijing.volces.com/api/v3";
const PRIMARY_MODEL = process.env.SEEDREAM_MODEL || "doubao-seedream-4-5-251128";
const FALLBACK_MODEL = "doubao-seedream-4-0-250828";
const GENERATION_TIMEOUT_MS = 120000;

if (!ARK_API_KEY) {
  console.warn("WARNING: SEEDREAM_API_KEY is not set. /api/ai/generate will return 503.");
}

const DIM_PREFIX = {
  "3d":
    "Transform the uploaded photo into ONE custom refrigerator magnet product. Thick 3D epoxy-dome fridge magnet (~8mm), glossy resin coating, contour die-cut following the subject silhouette (no rectangle, no frame). ",
  "2d":
    "Transform the uploaded photo into ONE custom flat die-cut refrigerator magnet product. Matte printed surface, contour cut along the subject outline (no rectangle, no frame). "
};

const DIM_SUFFIX = {
  "3d":
    " Single magnet centered in frame. Slight 3/4 product angle showing epoxy dome depth and soft specular highlights. Pure white seamless studio background, subtle contact shadow beneath. Professional e-commerce product photo, sharp focus, high detail. No text, logo, watermark, extra props, hands, or scene. Preserve the subject's recognizable face, expression, and identity from the source photo.",
  "2d":
    " Single magnet centered in frame. Flat or very slight angle, matte print look. Pure white seamless background. Professional e-commerce product photo, sharp focus. No text, logo, watermark, extra props, or scene. Preserve the subject's recognizable face, expression, and identity from the source photo."
};

function buildPrompt(styleId, dim, lang) {
  const style = getStyle(styleId) || getStyle("3d-cartoon");
  const effectiveDim = dim || style.dim || "3d";
  const prefix = DIM_PREFIX[effectiveDim] || DIM_PREFIX["3d"];
  const suffix = DIM_SUFFIX[effectiveDim] || DIM_SUFFIX["3d"];
  const zhTag =
    lang === "zh"
      ? " 基于上传照片生成，单主体，白底产品图，保持人物五官与神态可识别。"
      : "";
  return prefix + style.prompt + suffix + zhTag;
}

function normalizeImage(imageData) {
  if (!imageData) return null;
  if (typeof imageData === "string" && imageData.startsWith("data:image/")) return imageData;
  if (typeof imageData === "string" && imageData.length > 100) return "data:image/png;base64," + imageData;
  return null;
}

async function callSeedream(image, prompt) {
  const modelsToTry = [PRIMARY_MODEL, FALLBACK_MODEL];
  let lastError = null;

  for (const model of modelsToTry) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

    try {
      const arkResponse = await fetch(`${ARK_BASE}/images/generations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${ARK_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          image,
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
        lastError = { status: 502, msg: "Non-JSON response from AI" };
        continue;
      }

      const errorMsg = data.error?.message || data.error?.code || data.message || "";
      if (!arkResponse.ok && errorMsg.includes("not activated")) {
        lastError = { status: 502, msg: `Model ${model} not activated` };
        continue;
      }
      if (!arkResponse.ok) {
        return { success: false, error: { status: arkResponse.status, msg: errorMsg || `HTTP ${arkResponse.status}` } };
      }

      const imageUrl = data.data?.[0]?.url || data.url || data.output?.image_url;
      if (!imageUrl) {
        return { success: false, error: { status: 502, msg: "Unexpected AI response format" } };
      }

      try {
        const imgResponse = await fetch(imageUrl);
        if (!imgResponse.ok) {
          lastError = { status: 502, msg: `CDN download failed (HTTP ${imgResponse.status})` };
          continue;
        }
        const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
        const contentType = imgResponse.headers.get("content-type") || "image/png";
        return { success: true, imageDataUri: `data:${contentType};base64,${imgBuffer.toString("base64")}` };
      } catch (downloadErr) {
        lastError = { status: 502, msg: `Download failed: ${downloadErr.message}` };
      }
    } catch (err) {
      clearTimeout(timeout);
      lastError = {
        status: 502,
        msg: err.name === "AbortError" ? "Generation timed out" : `Network error: ${err.message}`
      };
    }
  }
  return { success: false, error: lastError || { status: 502, msg: "All models exhausted" } };
}

async function generateMagnetImage(rawImage, styleId, dim, lang) {
  if (!ARK_API_KEY) return { success: false, error: { status: 503, msg: "AI generation is not configured." } };
  const image = normalizeImage(rawImage);
  if (!image) return { success: false, error: { status: 400, msg: "Invalid image data" } };
  if (!getStyle(styleId)) return { success: false, error: { status: 400, msg: "Style not available" } };
  const effectiveDim = dim || getStyleDim(styleId);
  const prompt = buildPrompt(styleId, effectiveDim, lang || "en");
  return callSeedream(image, prompt);
}

function getProductionStyles() {
  return listStylesForApi();
}

module.exports = {
  buildPrompt,
  normalizeImage,
  callSeedream,
  generateMagnetImage,
  getProductionStyles,
  getStyleDim
};
