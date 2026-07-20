(function () {
  var currentStep = 1;
  var maxStep = 5;
  var stepsEl = document.querySelector("[data-wizard-steps]");
  var panels = document.querySelectorAll("[data-wizard-panel]");

  function updateUI() {
    if (stepsEl) {
      stepsEl.querySelectorAll("[data-wizard-step-indicator]").forEach(function (el) {
        var step = parseInt(el.getAttribute("data-wizard-step-indicator"), 10);
        el.classList.toggle("wizard-step--active", step === currentStep);
        el.classList.toggle("wizard-step--done", step < currentStep);
      });
    }
    panels.forEach(function (panel) {
      var step = parseInt(panel.getAttribute("data-wizard-panel"), 10);
      panel.hidden = step !== currentStep;
    });
    var backBtn = document.querySelector("[data-wizard-back]");
    var nextBtn = document.querySelector("[data-wizard-next]");
    if (backBtn) backBtn.disabled = currentStep <= 1;
    if (nextBtn) nextBtn.style.display = currentStep >= maxStep ? "none" : "";
  }

  function goTo(step) {
    currentStep = Math.max(1, Math.min(maxStep, step));
    updateUI();
    if (window.onWizardStepChange) window.onWizardStepChange(currentStep);
  }

  document.querySelector("[data-wizard-back]")?.addEventListener("click", function () { goTo(currentStep - 1); });
  document.querySelector("[data-wizard-next]")?.addEventListener("click", function () {
    if (currentStep === 1 && window.customizerHasPhoto && !window.customizerHasPhoto()) {
      var statusEl = document.querySelector("[data-status]");
      if (statusEl) statusEl.textContent = window.t ? window.t("wizard-need-photo") : "Please upload a photo first.";
      return;
    }
    if (currentStep === 2) {
      var styleEl = document.querySelector('input[name="ai-style"]:checked');
      if (!styleEl) {
        var statusEl2 = document.querySelector("[data-status]");
        if (statusEl2) statusEl2.textContent = window.t ? window.t("wizard-need-style") : "Please select a style first.";
        return;
      }
    }
    if (currentStep === 3 && window.customizerHasSelection && !window.customizerHasSelection()) {
      var statusEl3 = document.querySelector("[data-status]");
      if (statusEl3) statusEl3.textContent = window.t ? window.t("wizard-need-generate") : "Please generate a preview first.";
      return;
    }
    if (currentStep === 4 && window.customizerHasSelection && !window.customizerHasSelection()) {
      var statusEl4 = document.querySelector("[data-status]");
      if (statusEl4) statusEl4.textContent = window.t ? window.t("wizard-need-selection") : "Please select a preview option above.";
      return;
    }
    goTo(currentStep + 1);
  });

  stepsEl?.querySelectorAll("[data-wizard-step-indicator]").forEach(function (el) {
    el.addEventListener("click", function () {
      var target = parseInt(el.getAttribute("data-wizard-step-indicator"), 10);
      if (target <= currentStep || el.classList.contains("wizard-step--done")) goTo(target);
    });
  });

  window.Wizard = { goTo: goTo, getStep: function () { return currentStep; } };
  updateUI();
})();
