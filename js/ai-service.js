(function () {
  var AI_STYLES = [
    { id: "3d-cartoon", name: "Cute 3D Cartoon", desc: "Epoxy dome · contour cut" },
    { id: "3d-chibi", name: "Chibi 3D", desc: "Big-head chibi · epoxy dome" },
    { id: "flat-outline", name: "Flat Outline", desc: "2D print · clean outline" }
  ];

  var API_BASE = window.API_BASE || "http://localhost:3000/api";

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
      xhr.onload = function () { onResult(xhr.status === 200, xhr.status === 200 ? "AI service is ready" : "AI service unavailable"); };
      xhr.onerror = function () { onResult(false, "Cannot reach AI server"); };
      xhr.ontimeout = function () { onResult(false, "AI server connection timed out"); };
      xhr.send();
    }
  };
})();
