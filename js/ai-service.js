(function () {
  // ─── Style Definitions (for UI display only) ───────────────────────────
  // Prompts are now entirely server-side in server/routes/ai.js
  // This ensures consistent prompt engineering and API key security.

  var AI_STYLES = [
    { id: "3d-cartoon", name: "3D Cartoon", desc: "Playful 3D cartoon with glossy finish" },
    { id: "clay-world", name: "Clay Art", desc: "Handcrafted clay texture, warm and tactile" },
    { id: "pixel-art", name: "Pixel Art", desc: "Retro 16-bit pixel art aesthetic" },
    { id: "anime", name: "Anime Style", desc: "Japanese anime with clean lines" },
    { id: "watercolor", name: "Watercolor", desc: "Soft flowing watercolor brush strokes" },
    { id: "oil-painting", name: "Oil Painting", desc: "Classical oil with rich impasto texture" }
  ];

  // Backend proxy – no API key exposed to browser
  var API_BASE = (function () {
    // In production (GitHub Pages), point to your deployed backend
    // For local dev, use localhost:3000
    var host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:3000/api";
    }
    // TODO: Replace with your deployed backend URL
    // e.g., "https://river-magnet-api.onrender.com/api"
    return "http://localhost:3000/api";
  })();

  // ─── Public API ────────────────────────────────────────────────────────

  window.AIService = {

    /** Get all available AI styles */
    getStyles: function () {
      return AI_STYLES;
    },

    /** Get a style by its ID */
    getStyleById: function (id) {
      for (var i = 0; i < AI_STYLES.length; i++) {
        if (AI_STYLES[i].id === id) return AI_STYLES[i];
      }
      return null;
    },

    /** Check if the AI service is configured and reachable */
    isConfigured: function () {
      // Always return true – actual availability determined at request time
      return true;
    },

    /**
     * Check backend health
     * @param {Function} onResult - callback(ok: boolean, message: string)
     */
    checkHealth: function (onResult) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", API_BASE + "/ai/styles");
      xhr.timeout = 5000;
      xhr.onload = function () {
        if (xhr.status === 200) {
          onResult(true, "AI service is ready");
        } else {
          onResult(false, "AI service unavailable (HTTP " + xhr.status + ")");
        }
      };
      xhr.onerror = function () {
        onResult(false, "Cannot reach AI server. Start with: cd server && npm start");
      };
      xhr.ontimeout = function () {
        onResult(false, "AI server connection timed out");
      };
      xhr.send();
    },

    /**
     * Generate a fridge magnet image using Seedream AI.
     *
     * Flow:
     *   1. Source image → resize to 1024×1024 on white canvas
     *   2. Convert to PNG data URI (format required by Volcengine Ark API)
     *   3. POST to backend proxy, which calls Seedream with strict prompts
     *   4. Backend returns a CDN URL for the generated image
     *   5. Load the URL as an Image object → callback
     *
     * @param {HTMLImageElement} sourceImage - user's uploaded photo
     * @param {string} styleId - one of the AI_STYLES IDs
     * @param {Function} onProgress - callback(message: string)
     * @param {Function} onSuccess - callback(img: HTMLImageElement)
     * @param {Function} onError - callback(message: string)
     */
    generate: function (sourceImage, styleId, onProgress, onSuccess, onError) {
      var style = this.getStyleById(styleId);
      if (!style) {
        onError("Unknown style option. Please refresh the page and try again.");
        return;
      }

      if (!sourceImage || !sourceImage.naturalWidth) {
        onError("No valid photo loaded. Please upload an image first.");
        return;
      }

      // ── Step 1: Resize image to 1024×1024 on white canvas ──
      onProgress("Preparing image...");

      var canvas = document.createElement("canvas");
      var ctx = canvas.getContext("2d");
      canvas.width = 1024;
      canvas.height = 1024;

      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Cover-fit: center-crop to fill square
      var imgRatio = sourceImage.naturalWidth / sourceImage.naturalHeight;
      var drawW, drawH, drawX, drawY;

      if (imgRatio > 1) {
        // Landscape: fit to height
        drawH = canvas.height;
        drawW = canvas.height * imgRatio;
        drawX = -(drawW - canvas.width) / 2;
        drawY = 0;
      } else {
        // Portrait or square: fit to width
        drawW = canvas.width;
        drawH = canvas.width / imgRatio;
        drawX = 0;
        drawY = -(drawH - canvas.height) / 2;
      }

      ctx.drawImage(sourceImage, drawX, drawY, drawW, drawH);

      // ── Step 2: Convert to PNG data URI ──
      var dataUri;
      try {
        dataUri = canvas.toDataURL("image/png", 0.95);
      } catch (e) {
        onError("Failed to process image. The photo may be too large.");
        return;
      }

      // ── Step 3: Send to backend ──
      onProgress("Generating fridge magnet with AI... (may take 15-30 seconds)");

      // Detect user language preference (stored by lang.js)
      var userLang = "en";
      try {
        var stored = localStorage.getItem("river-lang");
        if (stored === "zh") userLang = "zh";
      } catch (e) { /* ignore */ }

      var requestBody = {
        image: dataUri,
        styleId: styleId,
        lang: userLang
      };

      var xhr = new XMLHttpRequest();
      xhr.open("POST", API_BASE + "/ai/generate");
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.timeout = 130000; // slightly longer than server timeout

      xhr.onload = function () {
        if (xhr.status === 200) {
          try {
            var data = JSON.parse(xhr.responseText);
            if (!data.image_url) {
              onError("AI service returned success but no image URL");
              return;
            }

            // ── Step 4: Load generated image ──
            onProgress("Loading generated image...");

            var img = new Image();
            img.crossOrigin = "anonymous";

            img.onload = function () {
              onProgress("Generation complete!");
              onSuccess(img);
            };

            img.onerror = function () {
              // Some CDN URLs might not allow cross-origin from localhost
              // Try loading via a proxy or fallback
              onError("Generated image loaded but cannot be displayed. The CDN may block cross-origin access from this domain.");
            };

            img.src = data.image_url;

          } catch (e) {
            onError("Failed to parse AI service response: " + e.message);
          }
        } else if (xhr.status === 400) {
          try {
            var errData = JSON.parse(xhr.responseText);
            onError(errData.error || "Invalid request. Please try a different photo.");
          } catch (e) {
            onError("Invalid request (400). Please try a different photo.");
          }
        } else if (xhr.status === 429) {
          onError("Too many requests. Please wait a moment and try again.");
        } else if (xhr.status === 502) {
          try {
            var errData2 = JSON.parse(xhr.responseText);
            onError("AI generation failed: " + (errData2.error || "service temporarily unavailable"));
          } catch (e) {
            onError("AI service temporarily unavailable. Please try again later.");
          }
        } else {
          try {
            var errData3 = JSON.parse(xhr.responseText);
            onError(errData3.error || "Request failed (code: " + xhr.status + ")");
          } catch (e) {
            onError("Request failed (code: " + xhr.status + "). Please try again.");
          }
        }
      };

      xhr.onerror = function () {
        onError(
          "Cannot connect to AI server. Make sure the backend is running:\n" +
          "  cd server && npm start\n" +
          "Then refresh this page."
        );
      };

      xhr.ontimeout = function () {
        onError("AI generation timed out. The image may be too complex. Try a simpler photo.");
      };

      xhr.send(JSON.stringify(requestBody));
    }
  };
})();