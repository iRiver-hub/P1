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
})();
