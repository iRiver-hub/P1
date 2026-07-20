(function () {
  function resolveApiBase() {
    if (window.RIVER_API_BASE) return window.RIVER_API_BASE;
    var loc = window.location;
    if (loc.port === "3000" || loc.port === "3001") {
      return loc.origin + "/api";
    }
    if (loc.hostname === "localhost" || loc.hostname === "127.0.0.1") {
      return "http://localhost:3000/api";
    }
    if (loc.hostname.includes("github.io")) {
      return "https://api.rivermagnets.com/api";
    }
    return loc.protocol + "//" + loc.hostname + ":3000/api";
  }

  window.getApiBase = resolveApiBase;
  window.API_BASE = resolveApiBase();
})();
