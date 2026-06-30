(function () {
  var canvas = document.getElementById("magnet-canvas");
  if (!canvas || !canvas.getContext || !window.PreviewEngine) return;

  var ctx = canvas.getContext("2d");
  var fileInput = document.querySelector("[data-file-input]");
  var dropzone = document.querySelector("[data-dropzone]");
  var statusEl = document.querySelector("[data-status]");
  var aiControls = document.querySelector("[data-ai-controls]");
  var aiGenerateBtn = document.querySelector("[data-ai-generate-btn]");
  var candidatesEl = document.querySelector("[data-candidates-strip]");
  var downloadBtn = document.querySelector("[data-download-btn]");
  var styleGrid = document.querySelector("[data-style-grid]");
  var progressEl = document.querySelector("[data-generate-progress]");
  var progressFill = document.querySelector("[data-generate-progress-fill]");
  var progressStep = document.querySelector("[data-generate-progress-step]");
  var previewTabs = document.querySelector("[data-preview-tabs]");

  var sessionId = null;
  var originalImage = null;
  var objectUrl = null;
  var candidates = [];
  var selectedCandidateId = null;
  var processedContent = null;
  var selectedDim = "3d";
  var previewMode = "fridge";
  var isGenerating = false;
  var scene = window.FRIDGE_SCENE || { W: 880, H: 720, FRIDGE: { x: 268, y: 32, w: 344, h: 636 }, centerGapX: 440, doorGapY: 490, MAGNET: { x: 468, y: 120, w: 118, h: 148 }, counterY: 706 };
  var W = scene.W, H = scene.H;
  var FRIDGE = scene.FRIDGE;
  var MAGNET = scene.MAGNET;

  function refreshScene() {
    if (window.FridgeScene) scene = window.FridgeScene.getScene();
    W = scene.W; H = scene.H;
    FRIDGE = scene.FRIDGE;
    MAGNET = scene.MAGNET;
  }

  function configureScene(opts) {
    if (!window.FridgeScene) return;
    window.FridgeScene.configure(opts);
    refreshScene();
    renderSizeUI();
    render();
  }

  function setStatus(text) { if (statusEl) statusEl.textContent = text; }

  function getSelectedDim() {
    var el = document.querySelector("[data-dim-btn].dim-btn--active");
    return el ? el.getAttribute("data-dim") : "3d";
  }

  function setReadyState(hasImage) {
    if (aiControls) aiControls.disabled = !hasImage;
    if (aiGenerateBtn) aiGenerateBtn.disabled = !hasImage || isGenerating;
    if (window.updateCustomizerAccess) window.updateCustomizerAccess();
  }

  function getSelectedStyle() {
    var el = styleGrid?.querySelector('input[name="ai-style"]:checked');
    return el ? el.value : "3d-cartoon";
  }

  function getEffectiveDim(styleId) {
    if (window.StylesCatalog) return window.StylesCatalog.getDim(styleId);
    return styleId === "flat-outline" || styleId === "watercolor" || styleId === "oil-painting" || styleId === "pop-art" || styleId === "pixel-art" ? "2d" : "3d";
  }

  function revokeObjectUrl() { if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; } }

  function showProgress(show, pct, stepText) {
    if (progressEl) progressEl.hidden = !show;
    if (progressFill) progressFill.style.width = (pct || 0) + "%";
    if (progressStep && stepText) progressStep.textContent = stepText;
  }

  function loadImageFromUrl(url) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("Failed to load image")); };
      img.src = url;
    });
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y);
    g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
  }

  function drawFridgeBackground(c) {
    if (window.FridgeScene && window.FridgeScene.drawFridgeBackground) {
      window.FridgeScene.drawFridgeBackground(c || ctx, scene);
      return;
    }
    var g = c || ctx;
    g.fillStyle = "#ebe6df";
    g.fillRect(0, 0, W, H);
  }

  function drawPlaceholderMagnet() {
    var mx = MAGNET.x, my = MAGNET.y, mw = MAGNET.w, mh = MAGNET.h;
    ctx.save();
    roundRect(ctx, mx, my, mw, mh, 16);
    ctx.setLineDash([8, 6]); ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = "rgba(0,0,0,0.06)"; ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.font = "500 15px system-ui,sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("Your magnet", mx + mw / 2, my + mh / 2 - 8);
    ctx.fillText("will appear here", mx + mw / 2, my + mh / 2 + 14);
    ctx.restore();
  }

  function render() {
    var layout = null;
    if (previewMode === "product") {
      layout = window.PreviewEngine.drawProductCloseup(ctx, W, H, processedContent, scene);
    } else if (processedContent) {
      layout = window.PreviewEngine.drawFridgeScene(ctx, W, H, drawFridgeBackground, MAGNET, processedContent, scene);
    } else if (originalImage) {
      window.PreviewEngine.drawPhotoOnFridge(ctx, W, H, drawFridgeBackground, MAGNET, originalImage, scene);
    } else {
      ctx.clearRect(0, 0, W, H);
      drawFridgeBackground();
      drawPlaceholderMagnet();
      if (window.PreviewEngine.drawScaleAnnotations) {
        window.PreviewEngine.drawScaleAnnotations(ctx, scene, { mode: "fridge", magnetRect: null });
      }
    }
    updateScalePanel(layout);
  }

  function updateScalePanel(layout) {
    var panel = document.querySelector("[data-preview-scale]");
    if (!panel || !scene.getFridgeLabel) return;
    var fridgeEl = panel.querySelector("[data-scale-fridge]");
    var magnetEl = panel.querySelector("[data-scale-magnet]");
    var ratioEl = panel.querySelector("[data-scale-ratio]");
    var bgEl = panel.querySelector("[data-scale-bg]");
    if (fridgeEl) fridgeEl.textContent = scene.getFridgeLabel();
    if (magnetEl) {
      if (layout && layout.magnetRect && processedContent) {
        magnetEl.textContent = layout.magnetRect.wCm + " × " + layout.magnetRect.hCm + " cm";
      } else if (scene.getMagnetLabel) {
        magnetEl.textContent = scene.getMagnetLabel();
      }
    }
    if (ratioEl && scene.REAL) {
      var pct = ((scene.REAL.magnetHeightCm / scene.REAL.fridgeHeightCm) * 100).toFixed(1);
      ratioEl.textContent = pct + "%";
    }
    if (bgEl) {
      bgEl.hidden = !processedContent;
    }
  }

  function updateCandidateThumbMask(candidateId, processed) {
    if (!candidatesEl || !processed) return;
    var btn = candidatesEl.querySelector('[data-candidate-id="' + candidateId + '"]');
    if (!btn) return;
    var img = btn.querySelector("img");
    if (!img) return;
    var b = processed.bounds;
    var thumb = document.createElement("canvas");
    thumb.width = 72; thumb.height = 72;
    var tctx = thumb.getContext("2d");
    tctx.fillStyle = "#f1f5f9";
    tctx.fillRect(0, 0, 72, 72);
    var sc = Math.min(68 / b.w, 68 / b.h);
    var dw = b.w * sc, dh = b.h * sc;
    tctx.drawImage(processed.canvas, b.x, b.y, b.w, b.h, (72 - dw) / 2, (72 - dh) / 2, dw, dh);
    img.src = thumb.toDataURL("image/png");
  }

  function updateCandidateUI() {
    if (!candidatesEl) return;
    candidatesEl.innerHTML = "";
    if (candidates.length === 0) { candidatesEl.hidden = true; return; }
    candidatesEl.hidden = false;
    candidates.forEach(function (c, idx) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "candidate-thumb" + (c.id === selectedCandidateId ? " candidate-thumb--active" : "");
      btn.setAttribute("data-candidate-id", c.id);
      var img = document.createElement("img");
      img.src = window.DesignService.imageUrl(c.previewUrl);
      img.alt = "Option " + (idx + 1);
      img.className = "candidate-thumb__img";
      btn.appendChild(img);
      var label = document.createElement("span");
      label.textContent = "#" + (idx + 1);
      btn.appendChild(label);
      btn.addEventListener("click", function () { selectCandidate(c.id); });
      candidatesEl.appendChild(btn);
    });
    if (selectedCandidateId && processedContent) {
      updateCandidateThumbMask(selectedCandidateId, processedContent);
    }
  }

  function selectCandidate(id) {
    selectedCandidateId = id;
    var cand = candidates.find(function (c) { return c.id === id; });
    if (!cand) return;
    selectedDim = cand.dim || getEffectiveDim(cand.styleId);
    setStatus("Processing preview mask...");
    loadImageFromUrl(window.DesignService.imageUrl(cand.previewUrl)).then(function (img) {
      return window.PreviewEngine.processImage(img, selectedDim);
    }).then(function (processed) {
      processedContent = processed;
      render();
      updateCandidateUI();
      updateCandidateThumbMask(cand.id, processed);
      updateConfirmState();
      setStatus(window.t ? window.t("status-preview-ready") : "Preview ready. Compare options or add to cart.");
    }).catch(function () { setStatus("Failed to load candidate preview"); });
  }

  function updateConfirmState() {
    var hasSelection = !!selectedCandidateId;
    if (downloadBtn) {
      downloadBtn.disabled = !hasSelection;
      downloadBtn.setAttribute("data-has-image", hasSelection ? "true" : "false");
    }
    var orderActions = document.querySelector("[data-customizer-actions]");
    if (orderActions) orderActions.hidden = !hasSelection;
    if (window.updateCustomizerAccess) window.updateCustomizerAccess();
    if (window.updateCheckoutDesign) window.updateCheckoutDesign();
    if (window.updateCartBar) window.updateCartBar();
  }

  function syncSessionFromServer() {
    if (!sessionId) return Promise.resolve();
    return window.DesignService.getSession(sessionId).then(function (data) {
      candidates = data.session.candidates || [];
      if (candidates.length && !selectedCandidateId) selectCandidate(candidates[candidates.length - 1].id);
      else updateCandidateUI();
    }).catch(function () {});
  }

  function fileToDataUri(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function loadFile(file) {
    if (!file || !file.type.startsWith("image/")) { setStatus("Please select a valid image file."); return; }
    revokeObjectUrl();
    window.PreviewEngine.clearCache();
    objectUrl = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      originalImage = img;
      processedContent = null;
      candidates = [];
      selectedCandidateId = null;
      window.DesignService.clearConfirmedDesign();
      window.DesignService.clearSession();
      sessionId = null;
      render();
      updateCandidateUI();
      updateConfirmState();
      setReadyState(true);
      setStatus(window.t ? window.t("status-photo-loaded") : "Photo loaded. Choose type, style and generate!");
      fileToDataUri(file).then(function (dataUri) {
        return window.DesignService.createSession().then(function (sid) {
          sessionId = sid;
          return window.DesignService.uploadImage(sid, dataUri);
        });
      }).catch(function (err) { setStatus("Upload failed: " + err.message); });
    };
    img.onerror = function () { setStatus("Cannot read this image."); };
    img.src = objectUrl;
  }

  fileInput?.addEventListener("change", function (e) { var f = e.target.files && e.target.files[0]; if (f) loadFile(f); });
  dropzone?.addEventListener("dragover", function (e) { e.preventDefault(); dropzone.dataset.dragActive = "true"; });
  dropzone?.addEventListener("dragleave", function () { dropzone.dataset.dragActive = "false"; });
  dropzone?.addEventListener("drop", function (e) {
    e.preventDefault(); dropzone.dataset.dragActive = "false";
    var f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) loadFile(f);
  });

  document.querySelectorAll("[data-dim-btn]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("[data-dim-btn]").forEach(function (s) { s.classList.remove("dim-btn--active"); });
      btn.classList.add("dim-btn--active");
      selectedDim = btn.getAttribute("data-dim");
    });
  });

  styleGrid?.addEventListener("click", function (e) {
    var card = e.target.closest(".style-card");
    if (!card) return;
    styleGrid.querySelectorAll(".style-card").forEach(function (s) { s.classList.remove("style-card--active"); });
    card.classList.add("style-card--active");
  });

  previewTabs?.addEventListener("click", function (e) {
    var tab = e.target.closest("[data-preview-tab]");
    if (!tab) return;
    previewMode = tab.getAttribute("data-preview-tab");
    previewTabs.querySelectorAll(".preview-tab").forEach(function (t) {
      t.classList.toggle("preview-tab--active", t === tab);
    });
    render();
  });

  aiGenerateBtn?.addEventListener("click", function () {
    if (!originalImage) {
      setStatus(window.t ? window.t("wizard-need-photo") : "Please upload a photo first.");
      return;
    }
    if (isGenerating || !window.DesignService) return;
    var styleId = getSelectedStyle();
    if (!styleId) { setStatus(window.t ? window.t("wizard-need-style") : "Please select a style first"); return; }
    if (candidates.length >= 3) {
      setStatus("Maximum 3 options. Pick one below or upload a new photo to start over.");
      return;
    }

    isGenerating = true;
    setReadyState(true);
    showProgress(true, 8, "Preparing image...");
    setStatus("AI is creating your magnet... (15–30 seconds)");

    var progressTimer = setInterval(function () {
      var w = parseFloat(progressFill?.style.width || "8");
      if (w < 85) showProgress(true, w + 4, progressStep?.textContent || "");
    }, 2000);

    window.DesignService.ensureSession().then(function (sid) {
      sessionId = sid;
      showProgress(true, 20, "Sending to AI (15–30 sec)...");
      return window.DesignService.generateCandidate(sid, styleId, getSelectedDim());
    }).then(function (data) {
      showProgress(true, 92, "Removing background & compositing...");
      candidates.push(data.candidate);
      return new Promise(function (resolve) {
        selectCandidate(data.candidate.id);
        setTimeout(resolve, 400);
      });
    }).then(function () {
      clearInterval(progressTimer);
      showProgress(true, 100, "Done!");
      setTimeout(function () { showProgress(false); }, 800);
      setStatus(window.t ? window.t("status-option-ready") : "Option ready! Compare up to 3, then add to cart.");
      isGenerating = false;
      setReadyState(true);
    }).catch(function (err) {
      clearInterval(progressTimer);
      showProgress(false);
      var msg = err.message || "Unknown error";
      if (msg.indexOf("Maximum") !== -1 || msg.indexOf("locked") !== -1) {
        msg += " Try uploading a new photo to start a fresh session.";
      }
      setStatus("Generation failed: " + msg);
      isGenerating = false;
      setReadyState(!!originalImage);
    });
  });

  downloadBtn?.addEventListener("click", function () {
    if (!window.AuthService?.isLoggedIn()) {
      setStatus("Please login to download preview");
      if (window.openAuthModal) window.openAuthModal("login");
      return;
    }
    if (!processedContent) return;
    render();
    canvas.toBlob(function (blob) {
      if (!blob) return;
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "river-magnet-preview-" + Date.now() + ".png";
      a.click();
      URL.revokeObjectURL(a.href);
    }, "image/png", 1);
  });

  window.updateCheckoutDesign = function () {
    if (window.updateCartUI) window.updateCartUI();
  };

  function getLang() {
    return localStorage.getItem("river-lang") || "en";
  }

  function renderSizeUI() {
    if (!window.ProductCatalog || !window.FridgeScene) return;
    var activeId = window.FridgeScene.getState().sizeId;
    var optionsEl = document.querySelector("[data-size-options]");
    var lang = getLang();
    var maxH = 36;

    if (optionsEl) {
      optionsEl.innerHTML = window.ProductCatalog.sizeList().map(function (s) {
        var scale = maxH / s.heightCm;
        var w = Math.max(10, Math.round(s.widthCm * scale));
        var h = Math.max(12, Math.round(s.heightCm * scale));
        var active = s.id === activeId ? " size-chip--active" : "";
        var shortLabel = s.widthCm + "×" + s.heightCm;
        var name = lang === "zh"
          ? (s.id === "mini" ? "迷你" : s.id === "large" ? "大号" : "标准")
          : (s.id === "mini" ? "Mini" : s.id === "large" ? "Large" : "Std");
        return (
          '<button type="button" class="size-chip' + active + '" data-size-id="' + s.id + '" title="' + shortLabel + ' cm">' +
          '<span class="size-chip__rect" style="width:' + w + "px;height:" + h + 'px"></span>' +
          "<span class=\"size-chip__text\">" + name + " " + shortLabel + "</span></button>"
        );
      }).join("");
    }
  }

  document.querySelector("[data-product-options]")?.addEventListener("click", function (e) {
    var sizeBtn = e.target.closest("[data-size-id]");
    if (sizeBtn) configureScene({ sizeId: sizeBtn.getAttribute("data-size-id") });
  });

  document.querySelectorAll("[data-add-to-cart]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (!selectedCandidateId || !sessionId) {
        setStatus(window.t ? window.t("wizard-need-selection") : "Please select a preview option first.");
        return;
      }
      var cand = candidates.find(function (c) { return c.id === selectedCandidateId; });
      if (!cand || !window.CartService || !window.ProductCatalog) return;
      var st = window.FridgeScene.getState();
      var size = window.ProductCatalog.getSize(st.sizeId);
      var lang = getLang();
      window.CartService.addItem({
        sessionId: sessionId,
        candidateId: selectedCandidateId,
        styleId: cand.styleId,
        sizeId: size.id,
        sizeLabel: window.ProductCatalog.getSizeLabel(size.id),
        widthCm: size.widthCm,
        heightCm: size.heightCm,
        unitPrice: size.price,
        previewUrl: cand.previewUrl,
        fridgeType: st.fridgeType,
        dim: cand.dim || selectedDim
      });
      setStatus(lang === "zh" ? "已加入购物车！下单时再确认生产。" : "Added to cart! Confirm for production at checkout.");
      if (window.updateCartUI) window.updateCartUI();
      if (window.openCartDrawer) window.openCartDrawer();
    });
  });

  window.updateCartBar = function () {
    var bar = document.querySelector("[data-cart-bar]");
    if (bar) bar.hidden = !selectedCandidateId;
  };

  window.customizerHasSelection = function () { return !!selectedCandidateId; };

  refreshScene();
  renderSizeUI();
  window.renderProductOptions = renderSizeUI;
  window.customizerHasPhoto = function () { return !!originalImage; };

  setReadyState(false);
  sessionId = window.DesignService ? window.DesignService.getSessionId() : null;
  if (sessionId) syncSessionFromServer();
  render();
  updateConfirmState();
  if (window.updateOrderButtonState) window.updateOrderButtonState();
  if (window.updateCartBar) window.updateCartBar();
})();
