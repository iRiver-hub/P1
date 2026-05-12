(function () {
  const AI_STYLES = [
    { id: "3d-cartoon", name: "3D卡通", prompt: "3D cartoon style refrigerator magnet, cute vibrant colors, soft lighting, plastic material texture, white border, rounded corners" },
    { id: "clay-world", name: "粘土世界", prompt: "Claymation style refrigerator magnet, clay-like texture, handcrafted feel, warm soft lighting, white border, rounded corners" },
    { id: "pixel-art", name: "像素游戏", prompt: "Pixel art style refrigerator magnet, retro 16-bit video game aesthetic, vibrant colors, white border, rounded corners" },
    { id: "anime", name: "动漫风格", prompt: "Anime style refrigerator magnet, Japanese animation aesthetic, clean linework, vibrant eyes, white border, rounded corners" },
    { id: "watercolor", name: "水彩画", prompt: "Watercolor painting style refrigerator magnet, soft brush strokes, delicate paper texture, pastel colors, white border, rounded corners" },
    { id: "oil-painting", name: "油画风格", prompt: "Oil painting style refrigerator magnet, classical art technique, rich textures, museum quality, white border, rounded corners" }
  ];

  const API_CONFIG = {
    endpoint: "",
    isConfigured: false
  };

  window.AIService = {
    getStyles: function () {
      return AI_STYLES;
    },

    getStyleById: function (id) {
      return AI_STYLES.find(function (s) { return s.id === id; });
    },

    configure: function (config) {
      if (config.endpoint) API_CONFIG.endpoint = config.endpoint;
      if (config.isConfigured !== undefined) API_CONFIG.isConfigured = config.isConfigured;
    },

    isConfigured: function () {
      return API_CONFIG.isConfigured && API_CONFIG.endpoint && API_CONFIG.endpoint.length > 0;
    },

    generate: function (sourceImage, styleId, onProgress, onSuccess, onError) {
      var style = this.getStyleById(styleId);
      if (!style) {
        onError("未知的风格选项");
        return;
      }

      if (!this.isConfigured()) {
        onError("AI 服务正在配置中，请稍后再试");
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
      var stylePrompt = style.prompt + ", refrigerator magnet design";

      canvas.toBlob(function (blob) {
        if (!blob) {
          onError("图像处理失败");
          return;
        }

        var formData = new FormData();
        formData.append("image", blob, "source.png");
        formData.append("prompt", stylePrompt);
        formData.append("style", styleId);

        var xhr = new XMLHttpRequest();
        xhr.open("POST", API_CONFIG.endpoint);

        xhr.onload = function () {
          if (xhr.status === 200) {
            try {
              var data = JSON.parse(xhr.responseText);
              if (data.url) {
                var img = new Image();
                img.onload = function () {
                  onSuccess(img);
                };
                img.onerror = function () {
                  onError("无法加载生成的图像");
                };
                img.crossOrigin = "anonymous";
                img.src = data.url;
              } else if (data.error) {
                onError(data.error);
              } else {
                onError("AI 服务响应格式错误");
              }
            } catch (e) {
              onError("解析 AI 响应失败");
            }
          } else if (xhr.status === 401 || xhr.status === 403) {
            onError("AI 服务未授权，请联系网站管理员");
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
    }
  };
})();
