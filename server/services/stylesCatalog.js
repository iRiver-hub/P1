/**
 * Single source of truth for magnet art styles (server).
 * dim: "3d" = epoxy dome, "2d" = flat print
 *
 * style.prompt = artistic direction only (product/background constraints live in aiGenerate.js)
 */
const STYLES_CATALOG = {
  "3d-cartoon": {
    name: "Cute 3D Cartoon",
    nameZh: "可爱 3D 卡通",
    description: "Adorable cartoon · epoxy dome",
    descZh: "Q版卡通 · 滴胶立体",
    category: "3d",
    dim: "3d",
    emoji: "🧸",
    sku: "MAG-3D-CARTOON",
    prompt:
      "Cute 3D cartoon figurine style: smooth rounded sculpt, soft shading, warm saturated colors, friendly expressive eyes, toy-like collectible look."
  },
  "3d-chibi": {
    name: "Chibi 3D",
    nameZh: "Q版大头立体",
    description: "Big-head chibi · epoxy dome",
    descZh: "大头 Q 版 · 滴胶立体",
    category: "3d",
    dim: "3d",
    emoji: "🎀",
    sku: "MAG-3D-CHIBI",
    prompt:
      "Chibi big-head style: oversized head (~2/3 of height), tiny simplified body, kawaii proportions, clean cute linework, pastel-bright palette."
  },
  clay: {
    name: "Clay World",
    nameZh: "黏土世界",
    description: "Claymation look · epoxy dome",
    descZh: "黏土动画风 · 滴胶立体",
    category: "3d",
    dim: "3d",
    emoji: "🪅",
    sku: "MAG-3D-CLAY",
    prompt:
      "Stop-motion claymation style: soft hand-sculpted forms, subtle fingerprint texture, matte pastel clay colors, gentle handmade charm."
  },
  anime: {
    name: "Anime Style",
    nameZh: "动漫风格",
    description: "Japanese anime · epoxy dome",
    descZh: "日系动漫 · 滴胶立体",
    category: "3d",
    dim: "3d",
    emoji: "🌸",
    sku: "MAG-3D-ANIME",
    prompt:
      "Japanese anime illustration style: clean cel shading, crisp outlines, vivid hair and eye highlights, polished character-art finish."
  },
  resin: {
    name: "Resin Art",
    nameZh: "树脂艺术",
    description: "Crystal resin collectible",
    descZh: "透明树脂 · 收藏级",
    category: "3d",
    dim: "3d",
    emoji: "💎",
    sku: "MAG-3D-RESIN",
    prompt:
      "Premium clear resin collectible style: jewel-like depth, glossy transparent layers, refined miniature figurine detailing, subtle metallic edge accent."
  },
  ceramic: {
    name: "Ceramic Art",
    nameZh: "陶瓷艺术",
    description: "Glazed ceramic texture",
    descZh: "釉面陶瓷质感",
    category: "3d",
    dim: "3d",
    emoji: "🏺",
    sku: "MAG-3D-CERAMIC",
    prompt:
      "Hand-glazed ceramic figurine style: tactile glaze sheen, hand-painted details, artisan craft texture, earthy refined color palette."
  },
  watercolor: {
    name: "Watercolor",
    nameZh: "水彩画",
    description: "Soft watercolor washes",
    descZh: "柔和水彩晕染",
    category: "art",
    dim: "2d",
    emoji: "🖌️",
    sku: "MAG-2D-WATERCOLOR",
    prompt:
      "Soft watercolor illustration: gentle color washes, bleeding edges, light paper grain, airy translucent layers, artistic hand-painted feel."
  },
  "oil-painting": {
    name: "Oil Painting",
    nameZh: "油画",
    description: "Classic oil brush strokes",
    descZh: "经典油画笔触",
    category: "art",
    dim: "2d",
    emoji: "🖼️",
    sku: "MAG-2D-OIL",
    prompt:
      "Classic oil painting style: visible brush strokes, rich impasto texture, warm deep pigments, fine-art portrait rendering."
  },
  "pop-art": {
    name: "Pop Art",
    nameZh: "波普艺术",
    description: "Bold comic pop art",
    descZh: "鲜明波普漫画风",
    category: "art",
    dim: "2d",
    emoji: "🎨",
    sku: "MAG-2D-POP",
    prompt:
      "Bold pop-art comic style: halftone dots, high-contrast outlines, vivid saturated primaries, graphic poster energy."
  },
  "pixel-art": {
    name: "Pixel Art",
    nameZh: "像素艺术",
    description: "Retro 8-bit game style",
    descZh: "复古像素游戏风",
    category: "art",
    dim: "2d",
    emoji: "👾",
    sku: "MAG-2D-PIXEL",
    prompt:
      "Retro 8-bit pixel art style: crisp square pixels, limited nostalgic palette, readable silhouette at small size, game-sprite charm."
  },
  "flat-outline": {
    name: "Flat Outline",
    nameZh: "平面描边",
    description: "Clean outline · matte print",
    descZh: "清晰描边 · 哑光印刷",
    category: "art",
    dim: "2d",
    emoji: "✏️",
    sku: "MAG-2D-FLAT",
    prompt:
      "Clean flat graphic style: bold uniform outline, flat color fills, minimal shading, sticker-like clarity and strong silhouette."
  }
};

const CATEGORY_LABELS = {
  "3d": { en: "3D Epoxy Styles", zh: "3D 滴胶立体" },
  art: { en: "Artistic Flat Styles", zh: "艺术平面风格" }
};

function getStyle(styleId) {
  return STYLES_CATALOG[styleId] || null;
}

function getStyleDim(styleId) {
  const s = getStyle(styleId);
  return s ? s.dim : "3d";
}

function listStylesForApi() {
  return Object.entries(STYLES_CATALOG).map(([id, s]) => ({
    id,
    name: s.name,
    nameZh: s.nameZh,
    description: s.description,
    descZh: s.descZh,
    category: s.category,
    dim: s.dim,
    emoji: s.emoji,
    sku: s.sku
  }));
}

module.exports = {
  STYLES_CATALOG,
  CATEGORY_LABELS,
  getStyle,
  getStyleDim,
  listStylesForApi
};
