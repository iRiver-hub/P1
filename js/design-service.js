(function () {
  var SESSION_KEY = "river-design-session";
  var CONFIRMED_DESIGN_KEY = "river-confirmed-design";

  function apiRequest(method, path, body, withAuth) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open(method, window.API_BASE + path);
      xhr.setRequestHeader("Content-Type", "application/json");
      if (withAuth && window.AuthService) {
        var token = window.AuthService.getToken();
        if (token) xhr.setRequestHeader("Authorization", "Bearer " + token);
      }
      xhr.timeout = method === "POST" && path.indexOf("/generate") !== -1 ? 130000 : 30000;
      xhr.onload = function () {
        var data;
        try { data = JSON.parse(xhr.responseText); } catch (e) { data = {}; }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data.error || "Request failed (" + xhr.status + ")"));
      };
      xhr.onerror = function () { reject(new Error("Network error. Is the server running?")); };
      xhr.ontimeout = function () { reject(new Error("Request timed out")); };
      xhr.send(body ? JSON.stringify(body) : null);
    });
  }

  function getSessionId() {
    try { return parseInt(localStorage.getItem(SESSION_KEY), 10) || null; } catch (e) { return null; }
  }

  function setSessionId(id) {
    try { localStorage.setItem(SESSION_KEY, String(id)); } catch (e) {}
  }

  function getConfirmedDesign() {
    try {
      var raw = localStorage.getItem(CONFIRMED_DESIGN_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function setConfirmedDesign(design) {
    try { localStorage.setItem(CONFIRMED_DESIGN_KEY, JSON.stringify(design)); } catch (e) {}
  }

  function clearConfirmedDesign() {
    try { localStorage.removeItem(CONFIRMED_DESIGN_KEY); } catch (e) {}
  }

  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  window.DesignService = {
    getSessionId: getSessionId,
    setSessionId: setSessionId,
    clearSession: clearSession,
    getConfirmedDesign: getConfirmedDesign,
    setConfirmedDesign: setConfirmedDesign,
    clearConfirmedDesign: clearConfirmedDesign,

    createSession: function () {
      return apiRequest("POST", "/designs/sessions", null, false).then(function (data) {
        setSessionId(data.sessionId);
        return data.sessionId;
      });
    },

    ensureSession: function () {
      var existing = getSessionId();
      if (existing) {
        return apiRequest("GET", "/designs/sessions/" + existing, null, false)
          .then(function (data) {
            var s = data.session;
            if (s.status === "confirmed" || s.candidates.length >= 3) {
              return window.DesignService.createSession();
            }
            return existing;
          })
          .catch(function () { return window.DesignService.createSession(); });
      }
      return window.DesignService.createSession();
    },

    uploadImage: function (sessionId, dataUri) {
      return apiRequest("POST", "/designs/sessions/" + sessionId + "/upload", { image: dataUri }, true);
    },

    generateCandidate: function (sessionId, styleId, dim) {
      var lang = "en";
      try { if (localStorage.getItem("river-lang") === "zh") lang = "zh"; } catch (e) {}
      return apiRequest("POST", "/designs/sessions/" + sessionId + "/generate", { styleId: styleId, dim: dim, lang: lang }, true);
    },

    getSession: function (sessionId) {
      return apiRequest("GET", "/designs/sessions/" + sessionId, null, false);
    },

    confirmCandidate: function (sessionId, candidateId) {
      return apiRequest("POST", "/designs/sessions/" + sessionId + "/confirm", { candidateId: candidateId }, true);
    },

    imageUrl: function (previewPath) {
      if (!previewPath) return "";
      if (previewPath.startsWith("http") || previewPath.startsWith("data:")) return previewPath;
      var origin = window.API_BASE.replace(/\/api\/?$/, "");
      return origin + previewPath;
    }
  };
})();
