(function () {
  window.getApiBase = function () {
    if (window.RIVER_API_BASE) return window.RIVER_API_BASE;
    var host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return "http://localhost:3000/api";
    return "http://localhost:3000/api";
  };
  window.API_BASE = window.getApiBase();
})();
