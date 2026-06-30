(function () {
  var CLASSIC_ORDER = [
    "3d-cartoon", "ceramic", "resin",
    "pop-art", "watercolor", "oil-painting",
    "pixel-art", "anime", "clay"
  ];

  var CATALOG = [
    { id: "3d-cartoon", emoji: "🧸", langKey: "style-3d-cartoon" },
    { id: "ceramic", emoji: "🏺", langKey: "style-ceramic" },
    { id: "resin", emoji: "💎", langKey: "style-resin" },
    { id: "pop-art", emoji: "🎨", langKey: "style-pop-art" },
    { id: "watercolor", emoji: "🖌️", langKey: "style-watercolor" },
    { id: "oil-painting", emoji: "🖼️", langKey: "style-oil-painting" },
    { id: "pixel-art", emoji: "👾", langKey: "style-pixel-art" },
    { id: "anime", emoji: "🌸", langKey: "style-anime" },
    { id: "clay", emoji: "🪅", langKey: "style-clay" }
  ];

  var dimMap = {
    "3d-cartoon": "3d", ceramic: "3d", resin: "3d", anime: "3d", clay: "3d",
    "pop-art": "2d", watercolor: "2d", "oil-painting": "2d", "pixel-art": "2d"
  };

  function renderGrid(styles) {
    var grid = document.querySelector("[data-style-grid]");
    if (!grid) return;
    grid.innerHTML = "";
    grid.className = "style-grid-v2";

    var byId = {};
    styles.forEach(function (s) { byId[s.id] = s; });

    CLASSIC_ORDER.forEach(function (id, idx) {
      var s = byId[id] || CATALOG.find(function (c) { return c.id === id; });
      if (!s) return;
      var label = document.createElement("label");
      label.className = "style-card" + (idx === 0 ? " style-card--active" : "");
      label.innerHTML =
        '<input type="radio" name="ai-style" value="' + s.id + '"' + (idx === 0 ? " checked" : "") + " />" +
        '<span class="style-card__preview"><span class="style-card__emoji">' + (s.emoji || "🧲") + "</span></span>" +
        '<span class="style-card__name" data-lang-key="' + s.langKey + '"></span>';
      grid.appendChild(label);
    });

    if (window.applyLang) {
      var lang = "en";
      try { lang = localStorage.getItem("river-lang") || "en"; } catch (e) {}
      window.applyLang(lang);
    }
  }

  function loadFromApi() {
    return new Promise(function (resolve) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", (window.API_BASE || "") + "/ai/styles");
      xhr.timeout = 5000;
      xhr.onload = function () {
        if (xhr.status !== 200) { resolve(CATALOG); return; }
        try {
          var data = JSON.parse(xhr.responseText);
          var mapped = (data.styles || []).map(function (s) {
            var local = CATALOG.find(function (c) { return c.id === s.id; });
            if (!local) return null;
            return {
              id: s.id,
              emoji: s.emoji || local.emoji,
              langKey: local.langKey
            };
          }).filter(Boolean);
          resolve(mapped.length ? mapped : CATALOG);
        } catch (e) { resolve(CATALOG); }
      };
      xhr.onerror = function () { resolve(CATALOG); };
      xhr.ontimeout = function () { resolve(CATALOG); };
      xhr.send();
    });
  }

  window.StylesCatalog = {
    getDim: function (styleId) { return dimMap[styleId] || "3d"; },
    getAll: function () { return CATALOG.slice(); }
  };

  loadFromApi().then(renderGrid);
})();
