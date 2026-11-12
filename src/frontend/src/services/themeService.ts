import brand from "../../marketplace-brand.json";

type MarketplaceTheme = "market-light" | "market-dark";
type AppTheme = MarketplaceTheme | "black";
export type MarketplaceThemePreference = "system" | "light" | "dark";

const themeKey = "property-marketplace:theme";
const minute = 60_000;

function systemQueries() {
  return {
    dark: window.matchMedia?.("(prefers-color-scheme: dark)"),
    light: window.matchMedia?.("(prefers-color-scheme: light)"),
  };
}

function systemTheme({
  dark,
  light,
}: ReturnType<typeof systemQueries>): MarketplaceTheme | undefined {
  if (dark?.matches) return "market-dark";
  if (light?.matches) return "market-light";
}

function localTimeTheme(): MarketplaceTheme {
  const hour = new Date().getHours();
  return hour >= 7 && hour < 19 ? "market-light" : "market-dark";
}

function listenForSchemeChange(query: MediaQueryList, refresh: () => void) {
  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", refresh);
    return () => query.removeEventListener("change", refresh);
  }
  query.addListener?.(refresh);
  return () => query.removeListener?.(refresh);
}

export const themeService = {
  getMarketplacePreference(): MarketplaceThemePreference {
    try {
      const saved = localStorage.getItem(themeKey);
      if (saved === "dark" || saved === "market-dark") return "dark";
      if (saved === "light" || saved === "market-light") return "light";
    } catch {
      // Follow the system when browser storage is unavailable.
    }
    return "system";
  },
  saveMarketplacePreference(preference: MarketplaceThemePreference) {
    try {
      localStorage.setItem(themeKey, preference);
    } catch {
      // The selected palette still applies to the current view.
    }
  },
  watchMarketplaceTheme(preference: MarketplaceThemePreference): () => void {
    if (preference !== "system") {
      this.apply(`market-${preference}`);
      return () => {};
    }

    const queries = systemQueries();
    let timer: number | undefined;
    let applied: MarketplaceTheme | undefined;
    const refresh = () => {
      const system = systemTheme(queries);
      if (system && timer !== undefined) {
        window.clearInterval(timer);
        timer = undefined;
      } else if (!system && timer === undefined) {
        timer = window.setInterval(refresh, minute);
      }

      const next = system ?? localTimeTheme();
      if (next !== applied) {
        applied = next;
        this.apply(next);
      }
    };
    const stopListening = Object.values(queries).flatMap((query) =>
      query ? [listenForSchemeChange(query, refresh)] : [],
    );
    refresh();
    return () => {
      for (const stop of stopListening) stop();
      window.clearInterval(timer);
    };
  },
  apply(theme: AppTheme) {
    document.documentElement.dataset.theme = theme;
    const club = theme === "black";
    document.title = club ? "ChillPong" : brand.name;
    document
      .querySelector('meta[property="og:title"]')
      ?.setAttribute("content", document.title);
    const themeColor = club
      ? "#101010"
      : theme === "market-dark"
        ? brand.themeDark
        : brand.themeLight;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", themeColor);
    const manifest = document.getElementById("app-manifest");
    const manifestHref = club ? "/site.webmanifest" : brand.manifest;
    if (manifest && manifest.getAttribute("href") !== manifestHref) {
      manifest.setAttribute("href", manifestHref);
    }
  },
  initialize() {
    const legacyPath = /^\/(?:tournaments|players|users)(?:\/|$)/;
    if (legacyPath.test(window.location.pathname)) {
      this.apply("black");
      return;
    }
    const preference = this.getMarketplacePreference();
    this.apply(
      preference === "system"
        ? (systemTheme(systemQueries()) ?? localTimeTheme())
        : `market-${preference}`,
    );
  },
};
