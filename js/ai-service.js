(function () {
  const AI_STYLES = [
    { id: "3d-cartoon", name: "3D卡通", prompt: "3D cartoon style, cute and vibrant colors, soft lighting, plastic material texture" },
    { id: "clay-world", name: "粘土世界", prompt: "Claymation style, clay-like texture, handcrafted feel, warm soft lighting" },
    { id: "pixel-art", name: "像素游戏", prompt: "Pixel art style, retro video game aesthetic, 16-bit era, vibrant colors" },
    { id: "anime", name: "动漫风格", prompt: "Anime style, Japanese animation aesthetic, clean linework, vibrant eyes" },
    { id: "watercolor", name: "水彩画", prompt: "Watercolor painting style, soft brush strokes, delicate paper texture, pastel colors" },
    { id: "oil-painting", name: "油画风格", prompt: "Oil painting style, classical art technique, rich textures, museum quality" }
  ];

  const API_CONFIG = {
    provider: "openai",
    apiKey: localStorage.getItem("ai-api-key") || "",
    endpoint: "https://api.openai.com/v1/images/edits",
    model: "dall-e-2"
  };

  window.AIService = {
    getStyles: function () {
      return AI_STYLES;
    },

    getStyleById: function (id) {
      return AI_STYLES.find(function (s) { return s.id === id; });
    },

    configure: function (config) {
      if (config.apiKey) {
        API_CONFIG.apiKey = config.apiKey;
        try {
          localStorage.setItem("ai-api-key", config.apiKey);
        } catch (e) {}
      }
      if (config.provider) API_CONFIG.provider = config.provider;
      if (config.endpoint) API_CONFIG.endpoint = config.endpoint;
      if (config.model) API_CONFIG.model = config.model;
    },

    isConfigured: function () {
      return API_CONFIG.apiKey && API_CONFIG.apiKey.length > 0;
    },

    generate: function (sourceImage, styleId, onProgress, onSuccess, onError) {
      var style = this.getStyleById(styleId);
      if (!style) {
        onError("未知的风格选项");
        return;
      }

      if (!this.isConfigured()) {
        onError("请先配置 AI API 密钥");
        return;
      }

      if (!sourceImage) {
        onError("请先上传一张图片");
        return;
      }

      onProgress("正在连接 AI 服务...");

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

      var me = this;

      if (API_CONFIG.provider === "openai") {
        this.callOpenAI(canvas, style.prompt, onProgress, onSuccess, onError);
      } else if (API_CONFIG.provider === "stability") {
        this.callStabilityAI(canvas, style.prompt, onProgress, onSuccess, onError);
      } else {
        onError("不支持的 AI 服务提供商");
      }
    },

    callOpenAI: function (canvas, stylePrompt, onProgress, onSuccess, onError) {
      onProgress("正在生成图像，请稍候...");

      canvas.toBlob(function (blob) {
        if (!blob) {
          onError("图像处理失败");
          return;
        }

        var formData = new FormData();
        formData.append("image", blob, "source.png");
        formData.append("prompt", stylePrompt);
        formData.append("n", "1");
        formData.append("size", "1024x1024");

        var xhr = new XMLHttpRequest();
        xhr.open("POST", API_CONFIG.endpoint);

        if (API_CONFIG.apiKey.startsWith("sk-")) {
          xhr.setRequestHeader("Authorization", "Bearer " + API_CONFIG.apiKey);
        }

        xhr.onload = function () {
          if (xhr.status === 200) {
            try {
              var data = JSON.parse(xhr.responseText);
              if (data.data && data.data[0] && data.data[0].url) {
                var img = new Image();
                img.onload = function () {
                  onSuccess(img);
                };
                img.onerror = function () {
                  onError("无法加载生成的图像");
                };
                img.crossOrigin = "anonymous";
                img.src = data.data[0].url;
              } else if (data.error) {
                onError(data.error.message || "AI 服务返回错误");
              } else {
                onError("AI 服务响应格式错误");
              }
            } catch (e) {
              onError("解析 AI 响应失败");
            }
          } else if (xhr.status === 401) {
            onError("API 密钥无效，请检查配置");
          } else if (xhr.status === 429) {
            onError("请求过于频繁，请稍后再试");
          } else {
            onError("AI 服务请求失败 (错误码: " + xhr.status + ")");
          }
        };

        xhr.onerror = function () {
          onError("网络错误，无法连接 AI 服务");
        };

        xhr.upload.onprogress = function (e) {
          if (e.lengthComputable) {
            var pct = Math.round((e.loaded / e.total) * 50);
            onProgress("正在上传图像... " + pct + "%");
          }
        };

        xhr.send(formData);
      }, "image/png");
    },

    callStabilityAI: function (canvas, stylePrompt, onProgress, onSuccess, onError) {
      onProgress("正在生成图像，请稍候...");

      canvas.toBlob(function (blob) {
        if (!blob) {
          onError("图像处理失败");
          return;
        }

        var formData = new FormData();
        formData.append("init_image", blob);
        formData.append("text_prompts[0][text]", stylePrompt);
        formData.append("text_prompts[0][weight]", "1");
        formData.append("cfg_scale", "7");
        formData.append("samples", "1");
        formData.append("steps", "30");

        var engineId = "stable-diffusion-xl-1024-v1-0";
        var endpoint = "https://api.stability.ai/v1/generation/" + engineId + "/image-to-image/mixed";

        var xhr = new XMLHttpRequest();
        xhr.open("POST", endpoint);

        xhr.setRequestHeader("Authorization", "Bearer " + API_CONFIG.apiKey);

        xhr.onload = function () {
          if (xhr.status === 200) {
            try {
              var data = JSON.parse(xhr.responseText);
              if (data.artifacts && data.artifacts[0] && data.artifacts[0].base64) {
                var img = new Image();
                img.onload = function () {
                  onSuccess(img);
                };
                img.onerror = function () {
                  onError("无法加载生成的图像");
                };
                img.src = "data:image/png;base64," + data.artifacts[0].base64;
              } else if (data.message) {
                onError(data.message);
              } else {
                onError("AI 服务响应格式错误");
              }
            } catch (e) {
              onError("解析 AI 响应失败");
            }
          } else if (xhr.status === 401) {
            onError("API 密钥无效，请检查配置");
          } else if (xhr.status === 429) {
            onError("请求过于频繁，请稍后再试");
          } else {
            var errMsg = "AI 服务请求失败";
            try {
              var errData = JSON.parse(xhr.responseText);
              if (errData.message) errMsg += ": " + errData.message;
            } catch (e) {}
            onError(errMsg);
          }
        };

        xhr.onerror = function () {
          onError("网络错误，无法连接 AI 服务");
        };

        xhr.upload.onprogress = function (e) {
          if (e.lengthComputable) {
            var pct = Math.round((e.loaded / e.total) * 50);
            onProgress("正在上传图像... " + pct + "%");
          }
        };

        xhr.send(formData);
      }, "image/png");
    }
  };

  window.addEventListener("DOMContentLoaded", function () {
    var settingsBtn = document.querySelector("[data-api-settings-btn]");
    var settingsPanel = document.querySelector("[data-api-settings-panel]");
    var apiKeyInput = document.querySelector("[data-api-key-input]");
    var saveApiKeyBtn = document.querySelector("[data-save-api-key-btn]");
    var providerSelect = document.querySelector("[data-provider-select]");

    if (settingsBtn && settingsPanel) {
      settingsBtn.addEventListener("click", function () {
        var isVisible = settingsPanel.style.display !== "none";
        settingsPanel.style.display = isVisible ? "none" : "block";

        if (!isVisible && apiKeyInput) {
          apiKeyInput.value = localStorage.getItem("ai-api-key") || "";
        }
      });
    }

    if (saveApiKeyBtn) {
      saveApiKeyBtn.addEventListener("click", function () {
        var key = apiKeyInput ? apiKeyInput.value.trim() : "";
        var provider = providerSelect ? providerSelect.value : "openai";

        window.AIService.configure({
          apiKey: key,
          provider: provider
        });

        if (settingsPanel) settingsPanel.style.display = "none";
        alert("设置已保存");
      });
    }
  });
})();
