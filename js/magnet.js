(function () {
  const canvas = document.getElementById("magnet-canvas");
  if (!canvas || !canvas.getContext) return;

  const ctx = canvas.getContext("2d");
  const fileInput = document.querySelector("[data-file-input]");
  const dropzone = document.querySelector("[data-dropzone]");
  const statusEl = document.querySelector("[data-status]");
  const controls = document.querySelector("[data-controls]");
  const radiusRange = document.querySelector("[data-radius-range]");
  const frameRange = document.querySelector("[data-frame-range]");
  const shadowRange = document.querySelector("[data-shadow-range]");
  const radiusValue = document.querySelector("[data-radius-value]");
  const frameValue = document.querySelector("[data-frame-value]");
  const shadowValue = document.querySelector("[data-shadow-value]");
  const glossToggle = document.querySelector("[data-gloss-toggle]");
  const renderBtn = document.querySelector("[data-render-btn]");
  const downloadBtn = document.querySelector("[data-download-btn]");

  let sourceImage = null;
  let objectUrl = null;

  const W = canvas.width;
  const H = canvas.height;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function setReadyState(hasImage) {
    if (controls) controls.disabled = !hasImage;
    if (renderBtn) renderBtn.disabled = !hasImage;
    if (downloadBtn) downloadBtn.disabled = !hasImage;
  }

  function revokeObjectUrl() {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
  }

  function loadFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      setStatus("请选择有效的图片文件。");
      return;
    }
    revokeObjectUrl();
    objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      sourceImage = img;
      setReadyState(true);
      setStatus(`已载入：${file.name}（${img.naturalWidth}×${img.naturalHeight}）`);
      render();
    };
    img.onerror = () => {
      sourceImage = null;
      setReadyState(false);
      setStatus("图片无法读取，请换一张试试。");
    };
    img.src = objectUrl;
  }

  function roundRectPath(context, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + w, y, x + w, y + h, radius);
    context.arcTo(x + w, y + h, x, y + h, radius);
    context.arcTo(x, y + h, x, y, radius);
    context.arcTo(x, y, x + w, y, radius);
    context.closePath();
  }

  function drawFridgeBackground(context, width, height) {
    const grd = context.createLinearGradient(0, 0, width, height);
    grd.addColorStop(0, "#c8d0dc");
    grd.addColorStop(0.45, "#aeb8c9");
    grd.addColorStop(1, "#9aa5b8");
    context.fillStyle = grd;
    context.fillRect(0, 0, width, height);

    context.save();
    context.globalAlpha = 0.12;
    for (let x = 0; x < width; x += 40) {
      context.fillStyle = x % 80 === 0 ? "#ffffff" : "#e2e8f0";
      context.fillRect(x, 0, 20, height);
    }
    context.restore();

    context.strokeStyle = "rgba(255,255,255,0.25)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, height * 0.35);
    context.bezierCurveTo(width * 0.3, height * 0.25, width * 0.65, height * 0.45, width, height * 0.32);
    context.stroke();
  }

  function drawImageCover(context, img, dx, dy, dw, dh) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (!iw || !ih) return;

    const scale = Math.max(dw / iw, dh / ih);
    const sw = dw / scale;
    const sh = dh / scale;
    const sx = (iw - sw) / 2;
    const sy = (ih - sh) / 2;

    context.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  function render() {
    if (!sourceImage) {
      drawFridgeBackground(ctx, W, H);
      ctx.fillStyle = "rgba(15,23,42,0.45)";
      ctx.font = "600 20px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("上传图片后显示冰箱贴预览", W / 2, H / 2);
      return;
    }

    const radius = Number(radiusRange?.value || 18);
    const frame = Number(frameRange?.value || 14);
    const shadowPct = Number(shadowRange?.value || 50) / 100;
    const gloss = glossToggle?.checked !== false;

    if (radiusValue) radiusValue.textContent = String(radius);
    if (frameValue) frameValue.textContent = String(frame);
    if (shadowValue) shadowValue.textContent = String(Math.round(shadowPct * 100));

    drawFridgeBackground(ctx, W, H);

    const magnetW = Math.min(340, W * 0.42);
    const magnetH = magnetW * 1.28;
    const cx = W / 2;
    const cy = H / 2 - 10;

    const x = cx - magnetW / 2;
    const y = cy - magnetH / 2;

    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${0.22 + shadowPct * 0.35})`;
    ctx.shadowBlur = 18 + shadowPct * 28;
    ctx.shadowOffsetY = 10 + shadowPct * 14;
    ctx.fillStyle = "#f1f5f9";
    roundRectPath(ctx, x, y, magnetW, magnetH, radius + 4);
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundRectPath(ctx, x, y, magnetW, magnetH, radius + 2);
    ctx.clip();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, magnetW, magnetH);

    const innerX = x + frame;
    const innerY = y + frame;
    const innerW = magnetW - frame * 2;
    const innerH = magnetH - frame * 2;
    const innerR = Math.max(4, radius - 6);

    ctx.save();
    roundRectPath(ctx, innerX, innerY, innerW, innerH, innerR);
    ctx.clip();
    drawImageCover(ctx, sourceImage, innerX, innerY, innerW, innerH);
    ctx.restore();

    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2;
    roundRectPath(ctx, innerX + 0.5, innerY + 0.5, innerW - 1, innerH - 1, innerR);
    ctx.stroke();

    if (gloss) {
      const glossGrad = ctx.createLinearGradient(x, y, x + magnetW, y + magnetH);
      glossGrad.addColorStop(0, "rgba(255,255,255,0.55)");
      glossGrad.addColorStop(0.35, "rgba(255,255,255,0.08)");
      glossGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.save();
      roundRectPath(ctx, x, y, magnetW, magnetH, radius + 2);
      ctx.clip();
      ctx.fillStyle = glossGrad;
      ctx.fillRect(x, y, magnetW, magnetH);
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = "rgba(15,23,42,0.08)";
    ctx.lineWidth = 1;
    roundRectPath(ctx, x + 0.5, y + 0.5, magnetW - 1, magnetH - 1, radius + 2);
    ctx.stroke();
    ctx.restore();
  }

  fileInput?.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) loadFile(file);
  });

  dropzone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.dataset.dragActive = "true";
  });

  dropzone?.addEventListener("dragleave", () => {
    dropzone.dataset.dragActive = "false";
  });

  dropzone?.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.dataset.dragActive = "false";
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) loadFile(file);
  });

  ["input", "change"].forEach((ev) => {
    radiusRange?.addEventListener(ev, () => sourceImage && render());
    frameRange?.addEventListener(ev, () => sourceImage && render());
    shadowRange?.addEventListener(ev, () => sourceImage && render());
  });
  glossToggle?.addEventListener("change", () => sourceImage && render());

  renderBtn?.addEventListener("click", () => render());

  downloadBtn?.addEventListener("click", () => {
    if (!sourceImage) return;
    render();
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setStatus("导出失败，请重试。");
          return;
        }
        const a = document.createElement("a");
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = `river-magnet-preview-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setStatus("已下载预览 PNG（示意图）。");
      },
      "image/png",
      1
    );
  });

  render();
  setReadyState(false);
})();
