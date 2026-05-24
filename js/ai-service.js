(function () {
  const AI_STYLES = [
    { id: "3d-cartoon", name: "3D Cartoon", prompt: "3D cartoon style refrigerator magnet, cute character, vibrant colors, soft lighting, plastic material texture, white border, rounded corners, fridge magnet design, isolated on white background" },
    { id: "clay-world", name: "Clay Art", prompt: "Claymation style refrigerator magnet, clay-like texture, handcrafted feel, warm soft lighting, white border, rounded corners, fridge magnet design, isolated on white background" },
    { id: "pixel-art", name: "Pixel Art", prompt: "Pixel art style refrigerator magnet, retro 16-bit video game aesthetic, vibrant colors, white border, rounded corners, fridge magnet design, isolated on white background" },
    { id: "anime", name: "Anime Style", prompt: "Anime style refrigerator magnet, Japanese animation aesthetic, clean linework, vibrant eyes, white border, rounded corners, fridge magnet design, isolated on white background" },
    { id: "watercolor", name: "Watercolor", prompt: "Watercolor painting style refrigerator magnet, soft brush strokes, delicate paper texture, pastel colors, white border, rounded corners, fridge magnet design, isolated on white background" },
    { id: "oil-painting", name: "Oil Painting", prompt: "Oil painting style refrigerator magnet, classical art technique, rich textures, museum quality, white border, rounded corners, fridge magnet design, isolated on white background" }
  ];

  // API now proxied through our backend server. No API key exposed to browser.
  var API_BASE = "http://localhost:3000/api";

  window.AIService = {
    getStyles: function () {
      return AI_STYLES;
    },

    getStyleById: function (id) {
      return AI_STYLES.find(function (s) { return s.id === id; });
    },

    isConfigured: function () {
      // Configuration is now server-side; always return true to allow attempt
      return true;
    },

    generate: function (sourceImage, styleId, onProgress, onSuccess, onError) {
      var style = this.getStyleById(styleId);
      if (!style) {
        onError("Unknown style option");
        return;
      }

      if (!sourceImage) {
        onError("Please upload a photo first");
        return;
      }

      onProgress("Preparing image...");

      var canvas = document.createElement("canvas");
      var ctx = canvas.getContext("2d");
      canvas.width = 1024;
      canvas.height = 1024;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      var imgRatio = sourceImage.naturalWidth / sourceImage.naturalHeight;
      var drawW, drawH, drawX, drawY;

      if (imgRatio > 1) {
        drawW = canvas.width;
        drawH = canvas.width / imgRatio;
        drawX = 0;
        drawY = (canvas.height - drawH) / 2;
      } else {
        drawH = canvas.height;
        drawW = canvas.height * imgRatio;
        drawX = (canvas.width - drawW) / 2;
        drawY = 0;
      }

      ctx.drawImage(sourceImage, drawX, drawY, drawW, drawH);

      // Strict prompt: always about fridge magnets
      var stylePrompt = "fridge magnet, 3D refrigerator magnet product photo, " + style.prompt + ", high quality, detailed texture, product photography, white border frame, glossy finish";
      var negativePrompt = "text, watermark, logo, signature, blurry, low quality, distorted, person, human, face, nude, nsfw, not a fridge magnet, not a magnet, irrelevant objects, dangerous content, offensive content";

      canvas.toBlob(function (blob) {
        if (!blob) {
          onError("Image processing failed");
          return;
        }

        var reader = new FileReader();
        reader.onloadend = function() {
          var base64Image = reader.result.split(',')[1];

          onProgress("Generating fridge magnet with AI...");

          var requestBody = {
            prompt: stylePrompt,
            image: base64Image,
            negative_prompt: negativePrompt,
            styleId: styleId
          };

          var xhr = new XMLHttpRequest();
          xhr.open("POST", API_BASE + "/ai/generate");
          xhr.setRequestHeader("Content-Type", "application/json");

          xhr.onload = function () {
            if (xhr.status === 200) {
              try {
                var data = JSON.parse(xhr.responseText);
                if (data.image_url) {
                  var img = new Image();
                  img.onload = function () {
                    onSuccess(img);
                  };
                  img.onerror = function () {
                    onError("Failed to load generated image");
                  };
                  img.crossOrigin = "anonymous";
                  img.src = data.image_url;
                } else {
                  onError("AI service response format error");
                }
              } catch (e) {
                onError("Failed to parse AI response");
              }
            } else if (xhr.status === 400) {
              try {
                var errData = JSON.parse(xhr.responseText);
                onError(errData.error || "Invalid request");
              } catch (e) {
                onError("Invalid request");
              }
            } else if (xhr.status === 401 || xhr.status === 403) {
              onError("AI service not authorized on server. Please contact support.");
            } else if (xhr.status === 429) {
              onError("Too many requests, please try again later");
            } else if (xhr.status === 502) {
              try {
                var errData2 = JSON.parse(xhr.responseText);
                onError("AI service error: " + (errData2.error || "Unknown"));
              } catch (e) {
                onError("AI service temporarily unavailable");
              }
            } else {
              try {
                var errData3 = JSON.parse(xhr.responseText);
                onError(errData3.error || "AI service request failed (code: " + xhr.status + ")");
              } catch (e) {
                onError("AI service request failed (code: " + xhr.status + ")");
              }
            }
          };

          xhr.onerror = function () {
            onError("Network error. Is the server running? Start server with: cd server && npm start");
          };

          xhr.send(JSON.stringify(requestBody));
        };
        reader.readAsDataURL(blob);
      }, "image/png");
    }
  };
})();