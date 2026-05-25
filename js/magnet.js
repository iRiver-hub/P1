(function () {
  var canvas = document.getElementById("magnet-canvas");
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext("2d");
  var fileInput = document.querySelector("[data-file-input]");
  var dropzone = document.querySelector("[data-dropzone]");
  var statusEl = document.querySelector("[data-status]");
  var aiControls = document.querySelector("[data-ai-controls]");
  var downloadBtn = document.querySelector("[data-download-btn]");
  var aiGenerateBtn = document.querySelector("[data-ai-generate-btn]");
  var styleGrid = document.querySelector("[data-style-grid]");

  var sourceImage = null;
  var originalImage = null;
  var aiGeneratedImage = null;
  var objectUrl = null;
  var isGenerating = false;
  var W = canvas.width, H = canvas.height;

  // ─── Fridge geometry constants ──────────────────────────────────────
  var FRIDGE = { x: 50, y: 15, w: 780, h: 690, centerGapX: 440, doorGapY: 550 };

  // Magnet placement area on right upper door (centered)
  var MAGNET = { x: 475, y: 70, w: 330, h: 440 };

  function setStatus(text) { if (statusEl) statusEl.textContent = text; }

  function setReadyState(hasImage) {
    if (aiControls) aiControls.disabled = !hasImage;
    if (aiGenerateBtn) aiGenerateBtn.disabled = !hasImage || isGenerating;
    if (downloadBtn) downloadBtn.setAttribute("data-has-image", hasImage ? "true" : "false");
    if (window.updateCustomizerAccess) window.updateCustomizerAccess();
  }

  function revokeObjectUrl() { if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; } }

  function getSelectedDim() { var el = document.querySelector("[data-dim-btn].dim-btn--active"); return el ? el.getAttribute("data-dim") : "3d"; }
  function getSelectedStyle() { var el = styleGrid?.querySelector('input[name="ai-style"]:checked'); return el ? el.value : null; }

  // ─── Fridge Background Drawing ──────────────────────────────────────

  function drawFridgeBackground() {
    // Fill entire canvas with warm kitchen background
    var bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#f5f0eb"); bgGrad.addColorStop(1, "#e8e2da");
    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);

    // Counter / wall line
    ctx.fillStyle = "#d4cfc8"; ctx.fillRect(0, H - 10, W, 12);

    var fx = FRIDGE.x, fy = FRIDGE.y, fw = FRIDGE.w, fh = FRIDGE.h;

    // Fridge body — rounded rectangle
    var fr = 14; // corner radius
    ctx.beginPath();
    ctx.moveTo(fx + fr, fy); ctx.lineTo(fx + fw - fr, fy);
    ctx.quadraticCurveTo(fx + fw, fy, fx + fw, fy + fr);
    ctx.lineTo(fx + fw, fy + fh - fr);
    ctx.quadraticCurveTo(fx + fw, fy + fh, fx + fw - fr, fy + fh);
    ctx.lineTo(fx + fr, fy + fh);
    ctx.quadraticCurveTo(fx, fy + fh, fx, fy + fh - fr);
    ctx.lineTo(fx, fy + fr); ctx.quadraticCurveTo(fx, fy, fx + fr, fy);
    ctx.closePath();

    // Stainless steel brushed gradient
    var ssGrad = ctx.createLinearGradient(fx, 0, fx + fw, 0);
    ssGrad.addColorStop(0, "#c8ccd0"); ssGrad.addColorStop(0.15, "#d8dce0");
    ssGrad.addColorStop(0.3, "#c4c8cc"); ssGrad.addColorStop(0.5, "#dce0e4");
    ssGrad.addColorStop(0.7, "#c4c8cc"); ssGrad.addColorStop(0.85, "#d8dce0");
    ssGrad.addColorStop(1, "#bcc0c4");
    ctx.fillStyle = ssGrad;
    ctx.fill();
    ctx.clip(); // clip to fridge body for all subsequent door drawing

    // Brushed metal horizontal lines
    ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1;
    for (var i = fy; i < fy + fh; i += 8) {
      ctx.beginPath(); ctx.moveTo(fx, i); ctx.lineTo(fx + fw, i); ctx.stroke();
    }

    // ── Door gap: vertical center line ──
    var cgx = FRIDGE.centerGapX;
    ctx.fillStyle = "#2a2a2e";
    ctx.fillRect(cgx - 3, fy, 6, FRIDGE.doorGapY - fy);

    // ── Door gap: horizontal line (upper doors / freezer) ──
    ctx.fillRect(fx, FRIDGE.doorGapY - 2, fw, 4);

    // ── Left door handle ──
    ctx.fillStyle = "#d4d8dc";
    ctx.shadowColor = "rgba(0,0,0,0.15)"; ctx.shadowBlur = 4; ctx.shadowOffsetX = 2;
    roundRect(fx + 28, fy + 100, 10, 240, 5);
    ctx.fill();
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0;

    // ── Right door handle ──
    ctx.fillStyle = "#d4d8dc";
    ctx.shadowColor = "rgba(0,0,0,0.15)"; ctx.shadowBlur = 4; ctx.shadowOffsetX = 2;
    roundRect(fx + fw - 38, fy + 100, 10, 240, 5);
    ctx.fill();
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0;

    // ── Freezer handle (horizontal bar) ──
    ctx.fillStyle = "#d4d8dc";
    ctx.shadowColor = "rgba(0,0,0,0.12)"; ctx.shadowBlur = 3; ctx.shadowOffsetY = 2;
    roundRect(fx + 240, FRIDGE.doorGapY + 30, 300, 8, 4);
    ctx.fill();
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    // ── Subtle fridge edge highlight ──
    ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(fx + fr, fy); ctx.lineTo(fx + fw - fr, fy); ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.1)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(fx + fr, fy + fh); ctx.lineTo(fx + fw - fr, fy + fh); ctx.stroke();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ─── Magnet compositing ─────────────────────────────────────────────

  function drawPlaceholderMagnet() {
    // Empty magnet area with dashed outline
    var mx = MAGNET.x, my = MAGNET.y, mw = MAGNET.w, mh = MAGNET.h;
    ctx.save();
    ctx.beginPath();
    roundRect(mx, my, mw, mh, 16);
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    ctx.fill();

    // Placeholder text
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.font = "500 15px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("Your magnet", mx + mw / 2, my + mh / 2 - 8);
    ctx.fillText("will appear here", mx + mw / 2, my + mh / 2 + 14);
    ctx.restore();
  }

  function drawMagnetOnFridge(img) {
    var mx = MAGNET.x, my = MAGNET.y, mw = MAGNET.w, mh = MAGNET.h;

    // Scale image to fit magnet area
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    var scale = Math.min(mw / iw, mh / ih);
    var dw = iw * scale, dh = ih * scale;
    var dx = mx + (mw - dw) / 2, dy = my + (mh - dh) / 2;

    ctx.save();

    // ── Shadow behind magnet ──
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;

    // White border / backing
    ctx.fillStyle = "#ffffff";
    roundRect(dx - 6, dy - 6, dw + 12, dh + 12, 12);
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Clip to magnet shape and draw image
    ctx.beginPath();
    roundRect(dx, dy, dw, dh, 8);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);

    // Subtle inner highlight (glossy top)
    var hlGrad = ctx.createLinearGradient(dx, dy, dx, dy + dh * 0.5);
    hlGrad.addColorStop(0, "rgba(255,255,255,0.18)");
    hlGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hlGrad;
    ctx.fillRect(dx, dy, dw, dh * 0.5);
    ctx.restore();
  }

  function drawPhotoPreview(img) {
    var mx = MAGNET.x, my = MAGNET.y, mw = MAGNET.w, mh = MAGNET.h;
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    var scale = Math.min((mw - 20) / iw, (mh - 20) / ih);
    var dw = iw * scale, dh = ih * scale;
    var dx = mx + (mw - dw) / 2, dy = my + (mh - dh) / 2;

    ctx.save();
    // Shadow
    ctx.shadowColor = "rgba(0,0,0,0.2)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    ctx.fillStyle = "#ffffff";
    roundRect(dx - 4, dy - 4, dw + 8, dh + 8, 10);
    ctx.fill();
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    ctx.beginPath();
    roundRect(dx, dy, dw, dh, 6);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);

    // Overlay label
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.font = "500 12px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Select style & generate", mx + mw / 2, dy + dh + 18);
    ctx.restore();
  }

  // ─── Main render ────────────────────────────────────────────────────

  function render() {
    ctx.clearRect(0, 0, W, H);
    drawFridgeBackground();
    if (aiGeneratedImage) drawMagnetOnFridge(aiGeneratedImage);
    else if (sourceImage) drawPhotoPreview(sourceImage);
    else drawPlaceholderMagnet();
  }

  // ─── File handling ──────────────────────────────────────────────────

  function loadFile(file) {
    if (!file || !file.type.startsWith("image/")) { setStatus("Please select a valid image file."); return; }
    revokeObjectUrl(); objectUrl = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      sourceImage = img; originalImage = img; aiGeneratedImage = null;
      setReadyState(true);
      setStatus("Photo loaded. Choose type, style and generate!");
      render();
    };
    img.onerror = function () { sourceImage = null; setReadyState(false); setStatus("Cannot read this image."); };
    img.src = objectUrl;
  }

  fileInput?.addEventListener("change", function (e) { var f = e.target.files && e.target.files[0]; if (f) loadFile(f); });
  dropzone?.addEventListener("dragover", function (e) { e.preventDefault(); dropzone.dataset.dragActive = "true"; });
  dropzone?.addEventListener("dragleave", function () { dropzone.dataset.dragActive = "false"; });
  dropzone?.addEventListener("drop", function (e) { e.preventDefault(); dropzone.dataset.dragActive = "false"; var f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) loadFile(f); });

  // ─── 2D / 3D toggle ─────────────────────────────────────────────────
  document.querySelectorAll("[data-dim-btn]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("[data-dim-btn]").forEach(function (s) { s.classList.remove("dim-btn--active"); });
      btn.classList.add("dim-btn--active");
    });
  });

  // ─── Style card click ───────────────────────────────────────────────
  styleGrid?.addEventListener("click", function (e) {
    var card = e.target.closest(".style-card");
    if (!card) return;
    styleGrid.querySelectorAll(".style-card").forEach(function (s) { s.classList.remove("style-card--active"); });
    card.classList.add("style-card--active");
  });

  // ─── Download ───────────────────────────────────────────────────────
  downloadBtn?.addEventListener("click", function () {
    if (!window.AuthService || !window.AuthService.isLoggedIn()) { setStatus("Please login or sign up to download preview"); if (window.openAuthModal) window.openAuthModal("login"); return; }
    if (!aiGeneratedImage && !sourceImage) return;
    render();
    canvas.toBlob(function (blob) {
      if (!blob) { setStatus("Export failed."); return; }
      var a = document.createElement("a"); var url = URL.createObjectURL(blob);
      a.href = url; a.download = "river-magnet-preview-" + Date.now() + ".png"; a.click();
      URL.revokeObjectURL(url); setStatus("Preview downloaded! Ready to order.");
    }, "image/png", 1);
  });

  // ─── AI Generate ────────────────────────────────────────────────────
  aiGenerateBtn?.addEventListener("click", function () {
    if (!sourceImage || !window.AIService || isGenerating) return;
    var styleId = getSelectedStyle(); if (!styleId) { setStatus("Please select a style first"); return; }
    var dim = getSelectedDim();
    isGenerating = true; setReadyState(true);
    setStatus("AI is creating your magnet... (15-30 seconds)");
    window.AIService.generate(sourceImage, styleId, dim,
      function onProgress(text) { setStatus(text); },
      function onSuccess(generatedImg) {
        aiGeneratedImage = generatedImg; sourceImage = generatedImg;
        setReadyState(true);
        setStatus("Your magnet is ready! Download or order now.");
        render(); isGenerating = false;
      },
      function onError(msg) { setStatus("Generation failed: " + msg); isGenerating = false; setReadyState(true); }
    );
  });

  render(); setReadyState(false);
})();