(function () {
  var TOKEN_KEY = "river-admin-token";

  function getApiRoot() {
    if (window.RIVER_API_BASE) return window.RIVER_API_BASE.replace(/\/api\/?$/, "");
    var loc = window.location;
    if (loc.port === "3000" || loc.port === "3001") return loc.origin;
    if (loc.hostname === "localhost" || loc.hostname === "127.0.0.1") return "http://localhost:3000";
    return loc.protocol + "//" + loc.hostname + ":3000";
  }

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }

  function setToken(token) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch (e) {}
  }

  function clearToken() {
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
  }

  function request(method, path, body) {
    var headers = { "Content-Type": "application/json" };
    var token = getToken();
    if (token) headers.Authorization = "Bearer " + token;

    return fetch(getApiRoot() + path, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.error || "Request failed");
        return data;
      });
    });
  }

  window.AdminAPI = {
    getApiRoot: getApiRoot,
    getToken: getToken,
    setToken: setToken,
    clearToken: clearToken,
    login: function (username, password) {
      return request("POST", "/api/admin/login", { username: username, password: password });
    },
    getStats: function () { return request("GET", "/api/admin/stats"); },
    getOrders: function (status) {
      var q = status ? "?status=" + encodeURIComponent(status) : "";
      return request("GET", "/api/admin/orders" + q);
    },
    getOrder: function (id) { return request("GET", "/api/admin/orders/" + id); },
    updateOrderStatus: function (id, status) {
      return request("PATCH", "/api/admin/orders/" + id + "/status", { status: status });
    },
    shipOrder: function (id, carrier, trackingNo) {
      return request("POST", "/api/admin/orders/" + id + "/ship", { carrier: carrier, trackingNo: trackingNo });
    },
    productionPackUrl: function (id) {
      return getApiRoot() + "/api/admin/orders/" + id + "/production-pack";
    },
    getDesigns: function () { return request("GET", "/api/admin/designs"); },
    previewUrl: function (designId) {
      return getApiRoot() + "/api/admin/designs/" + designId + "/preview";
    },
    getContacts: function (status) {
      var q = status ? "?status=" + encodeURIComponent(status) : "";
      return request("GET", "/api/admin/contacts" + q);
    },
    updateContact: function (id, status) {
      return request("PATCH", "/api/admin/contacts/" + id, { status: status });
    },
    getProducts: function () { return request("GET", "/api/admin/products"); },
    updateProduct: function (id, patch) {
      return request("PUT", "/api/admin/products/" + id, patch);
    },
    getUsers: function () { return request("GET", "/api/admin/users"); },
    getAudit: function () { return request("GET", "/api/admin/audit"); }
  };
})();
