(function () {
  // ─── Style Definitions (for UI display only) ───────────────────────────
  var AI_STYLES = [
    { id: "3d-cartoon", name: "Cute 3D Cartoon", desc: "Adorable cartoon character with glossy resin finish" },
    { id: "ceramic", name: "Handcrafted Ceramic", desc: "Glazed ceramic texture with handcrafted warmth" },
    { id: "resin", name: "Premium Resin Art", desc: "Crystal-clear resin collectible with mirror gloss" },
    { id: "pop-art", name: "Vibrant Pop Art", desc: "Bold comic pop art with vivid saturated colors" }
  ];

  var API_BASE = (function () {
    var host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return "http://localhost:3000/api";
    return "http://localhost:3000/api";
  })();

  window.AIService = {
    getStyles: function () { return AI_STYLES; },
    getStyleById: function (id) {
      for (var i = 0; i < AI_STYLES.length; i++) { if (AI_STYLES[i].id === id) return AI_STYLES[i]; }
      return null;
    },
    isConfigured: function () { return true; },
    checkHealth: function (onResult) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", API_BASE + "/ai/styles");
      xhr.timeout = 5000;
      xhr.onload = function () { onResult(xhr.status === 200, xhr.status === 200 ? "AI service is ready" : "AI service unavailable (HTTP " + xhr.status + ")"); };
      xhr.onerror = function () { onResult(false, "Cannot reach AI server. Start with: cd server && npm start"); };
      xhr.ontimeout = function () { onResult(false, "AI server connection timed out"); };
      xhr.send();
    },
    generate: function (sourceImage, styleId, shape, onProgress, onSuccess, onError) {
      var style = this.getStyleById(styleId);
      if (!style) { onError("Unknown style option. Please refresh the page and try again."); return; }
      if (!sourceImage || !sourceImage.naturalWidth) { onError("No valid photo loaded. Please upload an image first."); return; }

      onProgress("Preparing image...");
      var canvas = document.createElement("canvas");
      var ctx = canvas.getContext("2d");
      canvas.width = 1024; canvas.height = 1024;
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      var imgRatio = sourceImage.naturalWidth / sourceImage.naturalHeight;
      var drawW, drawH, drawX, drawY;
      if (imgRatio > 1) { drawH = canvas.height; drawW = canvas.height * imgRatio; drawX = -(drawW - canvas.width) / 2; drawY = 0; }
      else { drawW = canvas.width; drawH = canvas.width / imgRatio; drawX = 0; drawY = -(drawH - canvas.height) / 2; }
      ctx.drawImage(sourceImage, drawX, drawY, drawW, drawH);

      var dataUri;
      try { dataUri = canvas.toDataURL("image/png", 0.95); } catch (e) { onError("Failed to process image. The photo may be too large."); return; }

      onProgress("Generating fridge magnet with AI... (may take 15-30 seconds)");
      var userLang = "en";
      try { var stored = localStorage.getItem("river-lang"); if (stored === "zh") userLang = "zh"; } catch (e) {}

      var requestBody = { image: dataUri, styleId: styleId, shape: shape || "square", lang: userLang };
      var xhr = new XMLHttpRequest();
      xhr.open("POST", API_BASE + "/ai/generate");
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.timeout = 130000;

      xhr.onload = function () {
        if (xhr.status === 200) {
          try {
            var data = JSON.parse(xhr.responseText);
            if (!data.image_data_uri) { onError("AI service returned success but no image data"); return; }
            onProgress("Loading generated image...");
            var img = new Image();
            img.onload = function () { onProgress("Generation complete!"); onSuccess(img); };
            img.onerror = function () { onError("Failed to decode generated image data"); };
            img.src = data.image_data_uri;
          } catch (e) { onError("Failed to parse AI service response: " + e.message); }
        } else {
          try { var errData = JSON.parse(xhr.responseText); onError("AI generation failed: " + (errData.error || "service error")); }
          catch (e) { onError("AI generation failed (code: " + xhr.status + ")"); }
        }
      };
      xhr.onerror = function () { onError("Cannot connect to AI server. Make sure backend is running: cd server && npm start"); };
      xhr.ontimeout = function () { onError("AI generation timed out. Try a simpler photo."); };
      xhr.send(JSON.stringify(requestBody));
    }
  };
})();