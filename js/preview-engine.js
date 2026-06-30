/**
 * Preview pipeline: edge flood background removal → alpha mask → scaled compositing
 */
(function () {
  var cache = {};

  function sampleBgColor(data, w, h) {
    var pts = [];
    for (var x = 0; x < w; x++) { pts.push([x, 0], [x, h - 1]); }
    for (var y = 1; y < h - 1; y++) { pts.push([0, y], [w - 1, y]); }
    var r = 0, g = 0, b = 0, n = 0;
    pts.forEach(function (pt) {
      var i = (pt[1] * w + pt[0]) * 4;
      r += data[i]; g += data[i + 1]; b += data[i + 2];
      n++;
    });
    return { r: r / n, g: g / n, b: b / n };
  }

  function colorDist(r1, g1, b1, r2, g2, b2) {
    return Math.sqrt((r1 - r2) * (r1 - r2) + (g1 - g2) * (g1 - g2) + (b1 - b2) * (b1 - b2));
  }

  function saturation(r, g, b) {
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max === 0) return 0;
    return (max - min) / max;
  }

  function isBackground(r, g, b, bg, threshold) {
    var dist = colorDist(r, g, b, bg.r, bg.g, bg.b);
    var lum = 0.299 * r + 0.587 * g + 0.114 * b;
    var sat = saturation(r, g, b);
    if (dist < threshold) return true;
    if (lum > 235 && sat < 0.12 && dist < threshold + 25) return true;
    if (lum > 248) return true;
    return false;
  }

  function floodRemoveBackground(data, w, h, bg, threshold) {
    var visited = new Uint8Array(w * h);
    var queue = [];
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    function tryPush(x, y) {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      var idx = y * w + x;
      if (visited[idx]) return;
      var i = idx * 4;
      if (!isBackground(data[i], data[i + 1], data[i + 2], bg, threshold)) return;
      visited[idx] = 1;
      queue.push(idx);
    }

    for (var x = 0; x < w; x++) { tryPush(x, 0); tryPush(x, h - 1); }
    for (var y = 0; y < h; y++) { tryPush(0, y); tryPush(w - 1, y); }

    while (queue.length) {
      var idx = queue.pop();
      var i = idx * 4;
      data[i + 3] = 0;
      var cx = idx % w, cy = (idx - cx) / w;
      for (var d = 0; d < 4; d++) tryPush(cx + dirs[d][0], cy + dirs[d][1]);
    }

    for (var j = 0; j < data.length; j += 4) {
      if (data[j + 3] === 0) continue;
      var dist = colorDist(data[j], data[j + 1], data[j + 2], bg.r, bg.g, bg.b);
      if (dist < threshold + 22) {
        data[j + 3] = Math.min(data[j + 3], Math.round(((dist - threshold) / 22) * 255));
      }
    }
  }

  function erodeAlphaFringe(data, w, h) {
    var alpha = new Uint8Array(w * h);
    for (var i = 0; i < w * h; i++) alpha[i] = data[i * 4 + 3];
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var idx = y * w + x;
        if (alpha[idx] < 20) continue;
        var neighbors = 0;
        for (var dy = -1; dy <= 1; dy++) {
          for (var dx = -1; dx <= 1; dx++) {
            if (alpha[(y + dy) * w + (x + dx)] > 200) neighbors++;
          }
        }
        if (neighbors < 5 && alpha[idx] < 180) data[idx * 4 + 3] = Math.round(alpha[idx] * 0.4);
      }
    }
  }

  function findBounds(data, w, h) {
    var minX = w, minY = h, maxX = 0, maxY = 0, found = false;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 24) {
          found = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!found) return { x: 0, y: 0, w: w, h: h };
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }

  function processImage(img, dim) {
    var key = (img.src || "local") + "|" + (dim || "3d");
    if (cache[key]) return Promise.resolve(cache[key]);

    return new Promise(function (resolve) {
      var w = img.naturalWidth || img.width;
      var h = img.naturalHeight || img.height;
      var maxSide = 1024;
      var sc = Math.min(1, maxSide / Math.max(w, h));
      var tw = Math.round(w * sc);
      var th = Math.round(h * sc);

      var src = document.createElement("canvas");
      src.width = tw; src.height = th;
      var sctx = src.getContext("2d");
      sctx.drawImage(img, 0, 0, tw, th);
      var imageData = sctx.getImageData(0, 0, tw, th);
      var data = imageData.data;
      var bg = sampleBgColor(data, tw, th);
      var threshold = dim === "2d" ? 32 : 36;

      floodRemoveBackground(data, tw, th, bg, threshold);
      erodeAlphaFringe(data, tw, th);

      sctx.putImageData(imageData, 0, 0);
      var bounds = findBounds(data, tw, th);
      var pad = Math.max(2, Math.round(Math.max(bounds.w, bounds.h) * 0.02));
      bounds = {
        x: Math.max(0, bounds.x - pad),
        y: Math.max(0, bounds.y - pad),
        w: Math.min(tw - Math.max(0, bounds.x - pad), bounds.w + pad * 2),
        h: Math.min(th - Math.max(0, bounds.y - pad), bounds.h + pad * 2)
      };

      resolve({
        canvas: src,
        bounds: bounds,
        width: tw,
        height: th,
        dim: dim || "3d",
        bgRemoved: true
      });
    }).then(function (result) {
      cache[key] = result;
      return result;
    });
  }

  function drawMaskedImage(ctx, processed, dx, dy, dw, dh, dim) {
    var src = processed.canvas;
    var b = processed.bounds;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = dim === "3d" ? 14 : 8;
    ctx.shadowOffsetX = dim === "3d" ? 3 : 2;
    ctx.shadowOffsetY = dim === "3d" ? 6 : 3;
    ctx.drawImage(src, b.x, b.y, b.w, b.h, dx, dy, dw, dh);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.globalCompositeOperation = "source-atop";
    if (dim === "3d") {
      var edgeGrad = ctx.createLinearGradient(dx, dy + dh * 0.55, dx, dy + dh);
      edgeGrad.addColorStop(0, "rgba(0,0,0,0)");
      edgeGrad.addColorStop(1, "rgba(0,0,0,0.2)");
      ctx.fillStyle = edgeGrad;
      ctx.fillRect(dx, dy, dw, dh);
      var gloss = ctx.createLinearGradient(dx, dy, dx, dy + dh * 0.42);
      gloss.addColorStop(0, "rgba(255,255,255,0.32)");
      gloss.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gloss;
      ctx.fillRect(dx, dy, dw, dh * 0.45);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }

  function calcFit(bounds, areaW, areaH, margin) {
    margin = margin || 0.1;
    var mw = areaW * (1 - margin * 2);
    var mh = areaH * (1 - margin * 2);
    var scale = Math.min(mw / bounds.w, mh / bounds.h);
    return { dw: bounds.w * scale, dh: bounds.h * scale };
  }

  function drawDimLine(ctx, x1, y1, x2, y2, label, opts) {
    opts = opts || {};
    ctx.save();
    ctx.strokeStyle = opts.color || "rgba(6,182,212,0.85)";
    ctx.fillStyle = opts.color || "rgba(6,182,212,0.95)";
    ctx.lineWidth = 1.5;
    ctx.font = "600 11px system-ui,sans-serif";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    var cap = 5;
    if (Math.abs(x2 - x1) > Math.abs(y2 - y1)) {
      ctx.beginPath();
      ctx.moveTo(x1, y1 - cap); ctx.lineTo(x1, y1 + cap);
      ctx.moveTo(x2, y2 - cap); ctx.lineTo(x2, y2 + cap);
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(label, (x1 + x2) / 2, Math.min(y1, y2) - 4);
    } else {
      ctx.beginPath();
      ctx.moveTo(x1 - cap, y1); ctx.lineTo(x1 + cap, y1);
      ctx.moveTo(x2 - cap, y2); ctx.lineTo(x2 + cap, y2);
      ctx.stroke();
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(label, Math.max(x1, x2) + 6, (y1 + y2) / 2);
    }
    ctx.restore();
  }

  function drawScaleAnnotations(ctx, scene, layout) {
    if (!scene || !layout) return;
    var R = scene.REAL || { fridgeWidthCm: 91, fridgeHeightCm: 178, magnetWidthCm: 9, magnetHeightCm: 11 };
    var f = scene.FRIDGE;
    var barPx = scene.getScaleBarPx ? scene.getScaleBarPx() : 33;
    var barCm = scene.getScaleBarCm ? scene.getScaleBarCm() : 10;

    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 1;
    var bx = 14, by = 12;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, barPx + 36, 22, 4);
    else ctx.rect(bx, by, barPx + 36, 22);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#334155";
    ctx.fillRect(bx + 8, by + 14, barPx, 3);
    ctx.font = "600 10px system-ui,sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(barCm + " cm", bx + 8 + barPx + 4, by + 17);

    if (layout.mode === "fridge" && f) {
      drawDimLine(ctx, f.x - 18, f.y, f.x - 18, f.y + f.h, "H " + R.fridgeHeightCm + "cm", { color: "rgba(99,102,241,0.9)" });
      drawDimLine(ctx, f.x, f.y + f.h + 16, f.x + f.w, f.y + f.h + 16, "W " + R.fridgeWidthCm + "cm", { color: "rgba(99,102,241,0.9)" });
      if (layout.magnetRect) {
        var m = layout.magnetRect;
        drawDimLine(ctx, m.x + m.w + 12, m.y, m.x + m.w + 12, m.y + m.h, m.hCm + "cm", { color: "rgba(234,88,12,0.95)" });
        drawDimLine(ctx, m.x, m.y - 10, m.x + m.w, m.y - 10, m.wCm + "cm", { color: "rgba(234,88,12,0.95)" });
      }
    }

    if (layout.mode === "product" && layout.magnetRect) {
      var pm = layout.magnetRect;
      drawDimLine(ctx, pm.x, pm.y + pm.h + 14, pm.x + pm.w, pm.y + pm.h + 14, "W " + R.magnetWidthCm + "cm", { color: "rgba(234,88,12,0.95)" });
      drawDimLine(ctx, pm.x + pm.w + 14, pm.y, pm.x + pm.w + 14, pm.y + pm.h, "H " + R.magnetHeightCm + "cm", { color: "rgba(234,88,12,0.95)" });
      if (layout.dim === "3d") {
        ctx.font = "500 10px system-ui,sans-serif";
        ctx.fillStyle = "rgba(234,88,12,0.9)";
        ctx.textAlign = "left";
        ctx.fillText("T ≈ " + (R.magnetThickness3dCm || 0.8) + "cm", pm.x, pm.y + pm.h + 32);
      }
    }
    ctx.restore();
  }

  function magnetLayout(scene, content, magnetArea) {
    if (!content) return null;
    var fit = calcFit(content.bounds, magnetArea.w, magnetArea.h, 0.08);
    var dx = magnetArea.x + (magnetArea.w - fit.dw) / 2;
    var dy = magnetArea.y + (magnetArea.h - fit.dh) / 2;
    var pxPerCm = scene.pxPerCm || 3;
    return {
      x: dx, y: dy, w: fit.dw, h: fit.dh,
      wCm: (fit.dw / pxPerCm).toFixed(1),
      hCm: (fit.dh / pxPerCm).toFixed(1)
    };
  }

  window.PreviewEngine = {
    processImage: processImage,
    clearCache: function () { cache = {}; },
    drawScaleAnnotations: drawScaleAnnotations,

    drawFridgeScene: function (ctx, W, H, drawFridgeBg, magnetArea, content, scene) {
      ctx.clearRect(0, 0, W, H);
      drawFridgeBg(ctx);
      var layout = { mode: "fridge", magnetRect: null };
      if (content) {
        var fit = calcFit(content.bounds, magnetArea.w, magnetArea.h, 0.08);
        var dx = magnetArea.x + (magnetArea.w - fit.dw) / 2;
        var dy = magnetArea.y + (magnetArea.h - fit.dh) / 2;
        drawMaskedImage(ctx, content, dx, dy, fit.dw, fit.dh, content.dim);
        layout.magnetRect = magnetLayout(scene || {}, content, magnetArea);
      }
      drawScaleAnnotations(ctx, scene, layout);
      return layout;
    },

    drawProductCloseup: function (ctx, W, H, content, scene) {
      ctx.clearRect(0, 0, W, H);
      var bg = ctx.createRadialGradient(W / 2, H / 2, 30, W / 2, H / 2, Math.max(W, H) * 0.65);
      bg.addColorStop(0, "#f4f6f8");
      bg.addColorStop(1, "#e2e8f0");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      var layout = { mode: "product", magnetRect: null, dim: content ? content.dim : "3d" };
      if (!content) {
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.font = "500 15px system-ui,sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Product preview", W / 2, H / 2);
        drawScaleAnnotations(ctx, scene, layout);
        return layout;
      }

      var fit = calcFit(content.bounds, W * 0.55, H * 0.55, 0);
      var dx = (W - fit.dw) / 2;
      var dy = (H - fit.dh) / 2 - 10;
      drawMaskedImage(ctx, content, dx, dy, fit.dw, fit.dh, content.dim);
      var pxPerCm = (scene && scene.pxPerCm) || 3;
      layout.magnetRect = { x: dx, y: dy, w: fit.dw, h: fit.dh, wCm: (fit.dw / pxPerCm).toFixed(1), hCm: (fit.dh / pxPerCm).toFixed(1) };
      layout.dim = content.dim;
      drawScaleAnnotations(ctx, scene, layout);
      return layout;
    },

    drawPhotoOnFridge: function (ctx, W, H, drawFridgeBg, magnetArea, img, scene) {
      ctx.clearRect(0, 0, W, H);
      drawFridgeBg(ctx);
      drawScaleAnnotations(ctx, scene, { mode: "fridge", magnetRect: null });
      var mx = magnetArea.x, my = magnetArea.y, mw = magnetArea.w, mh = magnetArea.h;
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "rgba(6,182,212,0.5)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(mx, my, mw, mh);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(6,182,212,0.08)";
      ctx.fillRect(mx, my, mw, mh);
      ctx.fillStyle = "rgba(51,65,85,0.55)";
      ctx.font = "500 11px system-ui,sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(scene && scene.getMagnetLabel ? scene.getMagnetLabel() : "~9×11 cm", mx + mw / 2, my + mh / 2);
      ctx.restore();
    }
  };
})();
