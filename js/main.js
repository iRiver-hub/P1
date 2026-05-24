(function () {
  const STORAGE_KEY = "river-site-theme";
  const root = document.documentElement;

  function getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function setStoredTheme(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
  }

  function resolveTheme() {
    const stored = getStoredTheme();
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    setStoredTheme(theme);
  }

  applyTheme(resolveTheme());

  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
    if (!getStoredTheme()) applyTheme(e.matches ? "light" : "dark");
  });

  document.querySelector("[data-theme-toggle]")?.addEventListener("click", () => {
    const next = root.dataset.theme === "light" ? "dark" : "light";
    applyTheme(next);
  });

  document.querySelector("[data-year]")?.appendChild(
    document.createTextNode(String(new Date().getFullYear()))
  );

  // Hamburger menu toggle
  var hamburger = document.querySelector("[data-hamburger]");
  var nav = document.querySelector(".nav");

  hamburger?.addEventListener("click", function () {
    var isOpen = nav?.getAttribute("data-nav-open") === "true";
    var next = !isOpen;
    if (nav) nav.setAttribute("data-nav-open", String(next));
    hamburger.setAttribute("aria-expanded", String(next));
    hamburger.setAttribute("aria-label", next ? "Close menu" : "Open menu");
  });

  // Close menu on nav link click
  nav?.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      nav.setAttribute("data-nav-open", "false");
      if (hamburger) {
        hamburger.setAttribute("aria-expanded", "false");
        hamburger.setAttribute("aria-label", "Open menu");
      }
    });
  });
// Cookie consent
  var cookieBanner = document.querySelector("[data-cookie-banner]");
  if (cookieBanner && !localStorage.getItem("cookie-consent")) {
    cookieBanner.style.display = "block";
  }
  document.querySelector("[data-cookie-accept]")?.addEventListener("click", function () {
    localStorage.setItem("cookie-consent", "true");
    if (cookieBanner) cookieBanner.style.display = "none";
  });
})();
