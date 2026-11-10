import brand from "../../marketplace-brand.json";

type MarketplaceTheme = "market-light" | "market-dark";
type AppTheme = MarketplaceTheme | "black";

const themeKey = "property-marketplace:theme";

export const themeService = {
  getMarketplaceTheme(): MarketplaceTheme {
    try {
      if (localStorage.getItem(themeKey) === "market-dark")
        return "market-dark";
    } catch {
      // Use the light palette when browser storage is unavailable.
    }
    return "market-light";
  },
  saveMarketplaceTheme(theme: MarketplaceTheme) {
    try {
      localStorage.setItem(themeKey, theme);
    } catch {
      // The selected palette still applies to the current view.
    }
  },
  apply(theme: AppTheme) {
    document.documentElement.dataset.theme = theme;
    const club = theme === "black";
    document.title = club ? "ChillPong" : brand.name;
    document
      .querySelector('meta[property="og:title"]')
      ?.setAttribute("content", document.title);
    document
      .getElementById("app-icon")
      ?.setAttribute("href", club ? "/favicon.ico" : brand.icon);
    const manifest = document.getElementById("club-manifest");
    const touchIcon = document.getElementById("club-touch-icon");
    if (club) {
      manifest?.setAttribute("href", "/site.webmanifest");
      touchIcon?.setAttribute("href", "/apple-touch-icon.png");
    } else {
      manifest?.removeAttribute("href");
      touchIcon?.removeAttribute("href");
    }
  },
  initialize() {
    const legacyPath = /^\/(?:tournaments|players|users)(?:\/|$)/;
    this.apply(
      legacyPath.test(window.location.pathname)
        ? "black"
        : this.getMarketplaceTheme(),
    );
  },
};
