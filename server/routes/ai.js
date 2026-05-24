const express = require("express");
const router = express.Router();

// Seedream API configuration - loaded from environment variables in production
const SEEDREAM_API_KEY = process.env.SEEDREAM_API_KEY || "ark-0e32b23e-a8dc-4718-a6a4-94f50dadc430-d0bd9";
const SEEDREAM_ENDPOINT = process.env.SEEDREAM_ENDPOINT || "https://api.seedream.ai/v1/image/generate";

router.post("/generate", async (req, res) => {
  const { prompt, image, negative_prompt, styleId } = req.body;

  if (!prompt || !image) {
    return res.status(400).json({ error: "Missing required parameters: prompt and image" });
  }

  // Strict content filtering: ensure the request is about fridge magnets
  const lowerPrompt = prompt.toLowerCase();
  const fridgeKeywords = ["fridge magnet", "refrigerator magnet", "magnet design", "fridge"];
  const hasFridgeKeyword = fridgeKeywords.some(kw => lowerPrompt.includes(kw));

  if (!hasFridgeKeyword) {
    return res.status(400).json({
      error: "Content restricted: only fridge magnet generation is supported. All prompts must include fridge magnet related keywords."
    });
  }

  const forbiddenKeywords = ["nude", "nsfw", "porn", "violence", "weapon", "gore", "hate"];
  if (forbiddenKeywords.some(kw => lowerPrompt.includes(kw))) {
    return res.status(400).json({ error: "Content policy violation: inappropriate content detected." });
  }

  try {
    const response = await fetch(SEEDREAM_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + SEEDREAM_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: prompt,
        image: image,
        mode: "transform",
        negative_prompt: negative_prompt || "text, watermark, logo, signature, blurry, low quality, distorted, person, human, face, nude, nsfw, not a fridge magnet, not a magnet, irrelevant objects, dangerous content, offensive content",
        width: 1024,
        height: 1024
      })
    });

    let data;
    try {
      data = await response.json();
    } catch {
      const text = await response.text();
      return res.status(502).json({ error: "AI service returned invalid response: " + text.substring(0, 200) });
    }

    if (!response.ok) {
      const errorMsg = data.error || data.message || "AI service request failed";
      return res.status(response.status).json({ error: errorMsg });
    }

    // Handle different response formats from Seedream
    if (data.output && data.output.image_url) {
      return res.json({ image_url: data.output.image_url });
    } else if (data.data && data.data.length > 0 && data.data[0].url) {
      return res.json({ image_url: data.data[0].url });
    } else if (data.url) {
      return res.json({ image_url: data.url });
    } else {
      return res.status(502).json({ error: "AI service returned unexpected response format" });
    }
  } catch (err) {
    console.error("AI generation error:", err.message);
    return res.status(502).json({ error: "Failed to connect to AI service: " + err.message });
  }
});

module.exports = router;