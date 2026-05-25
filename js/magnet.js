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

  function setStatus(text) { if (statusEl) statusEl.textContent = text; }

  function setReadyState(hasImage) {
    if (aiControls) aiControls.disabled = !hasImage;
    if (aiGenerateBtn) aiGenerateBtn.disabled = !hasImage || isGenerating;
    if (downloadBtn) downloadBtn.setAttribute("data-has-image", hasImage ? "true" : "false");
    if (window.updateCustomizerAccess) window.updateCustomizerAccess();
  }

  function revokeObjectUrl() { if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; } }

  function getSelectedShape() { var el = document.querySelector("[data-shape-btn].shape-btn--active"); return el ? el.getAttribute("data-shape") : "square"; }
  function getSelectedStyle() { var el = styleGrid?.querySelector('input[name="ai-style"]:checked'); return el ? el.value : null; }

  function loadFile(file) {
    if (!file || !file.type.startsWith("image/")) { setStatus("Please select a valid image file."); return; }
    revokeObjectUrl(); objectUrl = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      sourceImage = img; originalImage = img; aiGeneratedImage = null;
      setReadyState(true);
      setStatus("Photo loaded. Select a style and click Generate.");
      render();
    };
    img.onerror = function () { sourceImage = null; setReadyState(false); setStatus("Cannot read this image."); };
    img.src = objectUrl;
  }

  function drawPlaceholder() {
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#e8ecf1"); grad.addColorStop(0.5, "#dce0e8"); grad.addColorStop(1, "#c8cdd6");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W / 2, 50); ctx.lineTo(W / 2, H - 180); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(W / 2 + 40, H * 0.35); ctx.lineTo(W / 2 + 40, H * 0.55); ctx.stroke();
    ctx.fillStyle = "rgba(15,23,42,0.35)"; ctx.font = "600 18px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("Upload a photo to get started", W / 2, H / 2);
    ctx.font = "400 13px system-ui, sans-serif"; ctx.fillStyle = "rgba(15,23,42,0.22)";
    ctx.fillText("Your 3D magnet preview will appear here", W / 2, H / 2 + 30);
  }

  function drawImagePreview(img) {
    ctx.clearRect(0, 0, W, H);
    var imgW = img.naturalWidth || img.width, imgH = img.naturalHeight || img.height;
    var scale = Math.min(W / imgW, H / imgH, 1);
    var dw = imgW * scale, dh = imgH * scale, dx = (W - dw) / 2, dy = (H - dh) / 2;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.15)"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6;
    ctx.fillStyle = "#f0f0f0"; ctx.fillRect(dx - 2, dy - 2, dw + 4, dh + 4);
    ctx.restore();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 3;
    ctx.strokeRect(dx + 1, dy + 1, dw - 2, dh - 2);
  }

  function render() { if (!sourceImage) drawPlaceholder(); else drawImagePreview(sourceImage); }

  fileInput?.addEventListener("change", function (e) { var f = e.target.files && e.target.files[0]; if (f) loadFile(f); });
  dropzone?.addEventListener("dragover", function (e) { e.preventDefault(); dropzone.dataset.dragActive = "true"; });
  dropzone?.addEventListener("dragleave", function () { dropzone.dataset.dragActive = "false"; });
  dropzone?.addEventListener("drop", function (e) { e.preventDefault(); dropzone.dataset.dragActive = "false"; var f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) loadFile(f); });

  document.querySelectorAll("[data-shape-btn]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("[data-shape-btn]").forEach(function (s) { s.classList.remove("shape-btn--active"); });
      btn.classList.add("shape-btn--active");
    });
  });

  // Style card click handler — activate parent card for :has fallback
  styleGrid?.addEventListener("click", function (e) {
    var card = e.target.closest(".style-card");
    if (!card) return;
    styleGrid.querySelectorAll(".style-card").forEach(function (s) { s.classList.remove("style-card--active"); });
    card.classList.add("style-card--active");
  });

  downloadBtn?.addEventListener("click", function () {
    if (!window.AuthService || !window.AuthService.isLoggedIn()) { setStatus("Please login or sign up to download preview"); if (window.openAuthModal) window.openAuthModal("login"); return; }
    if (!sourceImage) return;
    render();
    canvas.toBlob(function (blob) {
      if (!blob) { setStatus("Export failed."); return; }
      var a = document.createElement("a"); var url = URL.createObjectURL(blob);
      a.href = url; a.download = "river-magnet-preview-" + Date.now() + ".png"; a.click();
      URL.revokeObjectURL(url); setStatus("Preview downloaded! Ready to order.");
    }, "image/png", 1);
  });

  aiGenerateBtn?.addEventListener("click", function () {
    if (!sourceImage || !window.AIService || isGenerating) return;
    var styleId = getSelectedStyle(); if (!styleId) { setStatus("Please select a style first"); return; }
    var shape = getSelectedShape();
    isGenerating = true; setReadyState(true);
    setStatus("Generating your 3D magnet... (15-30 seconds)");
    window.AIService.generate(sourceImage, styleId, shape,
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