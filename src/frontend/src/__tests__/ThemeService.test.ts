import { themeService } from "@/services/themeService";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storageKey = "property-marketplace:theme";

function mockSystemPreference(initial: "light" | "dark" | "unavailable") {
  function createQuery(scheme: "light" | "dark") {
    return Object.assign(new EventTarget(), {
      media: `(prefers-color-scheme: ${scheme})`,
      matches: initial === scheme,
    });
  }

  const dark = createQuery("dark");
  const light = createQuery("light");
  vi.stubGlobal("matchMedia", (query: string) =>
    query.includes("dark") ? dark : light,
  );

  return (preference: "light" | "dark") => {
    dark.matches = preference === "dark";
    light.matches = preference === "light";
    for (const query of [dark, light]) {
      query.dispatchEvent(
        Object.assign(new Event("change"), {
          matches: query.matches,
          media: query.media,
        }),
      );
    }
  };
}

function appliedTheme() {
  return document.documentElement.dataset.theme;
}

describe("marketplace theme preferences", () => {
  let stopWatching: (() => void) | undefined;

  beforeEach(() => {
    localStorage.removeItem(storageKey);
    document.documentElement.removeAttribute("data-theme");
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    stopWatching?.();
    stopWatching = undefined;
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.removeItem(storageKey);
    window.history.replaceState(null, "", "/");
  });

  it("starts with the system palette when no choice has been saved", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 13, 12));
    mockSystemPreference("dark");

    themeService.initialize();

    expect(themeService.getMarketplacePreference()).toBe("system");
    expect(appliedTheme()).toBe("market-dark");
  });

  it.each([
    ["market-light", "light"],
    ["market-dark", "dark"],
    ["unknown", "system"],
  ] as const)("reads the stored value %s as %s", (stored, preference) => {
    localStorage.setItem(storageKey, stored);
    expect(themeService.getMarketplacePreference()).toBe(preference);
  });

  it.each(["system", "light", "dark"] as const)(
    "persists %s as a canonical preference",
    (preference) => {
      themeService.saveMarketplacePreference(preference);

      expect(localStorage.getItem(storageKey)).toBe(preference);
      expect(themeService.getMarketplacePreference()).toBe(preference);
    },
  );

  it("keeps an explicit palette when the system preference changes", () => {
    const changeSystemPreference = mockSystemPreference("dark");
    themeService.saveMarketplacePreference("light");

    themeService.initialize();
    stopWatching = themeService.watchMarketplaceTheme(
      themeService.getMarketplacePreference(),
    );
    expect(appliedTheme()).toBe("market-light");

    changeSystemPreference("light");
    changeSystemPreference("dark");
    expect(appliedTheme()).toBe("market-light");
  });

  it("follows live system changes until the watcher is stopped", () => {
    const changeSystemPreference = mockSystemPreference("light");

    stopWatching = themeService.watchMarketplaceTheme("system");
    expect(appliedTheme()).toBe("market-light");
    changeSystemPreference("dark");
    expect(appliedTheme()).toBe("market-dark");

    stopWatching();
    stopWatching = undefined;
    changeSystemPreference("light");
    expect(appliedTheme()).toBe("market-dark");
  });

  it.each(["missing", "unavailable"] as const)(
    "rechecks the 07:00 and 19:00 local thresholds when the system preference is %s",
    (systemPreference) => {
      if (systemPreference === "missing")
        vi.stubGlobal("matchMedia", undefined);
      else mockSystemPreference("unavailable");
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 10, 13, 6, 59));

      stopWatching = themeService.watchMarketplaceTheme("system");
      expect(appliedTheme()).toBe("market-dark");
      vi.advanceTimersByTime(60_000);
      expect(appliedTheme()).toBe("market-light");
      vi.advanceTimersByTime(12 * 60 * 60_000);
      expect(appliedTheme()).toBe("market-dark");

      stopWatching();
      stopWatching = undefined;
      vi.advanceTimersByTime(12 * 60 * 60_000);
      expect(appliedTheme()).toBe("market-dark");
    },
  );

  it("uses the club palette on legacy routes and restores the marketplace preference", () => {
    mockSystemPreference("light");
    themeService.saveMarketplacePreference("dark");

    window.history.replaceState(null, "", "/tournaments/42");
    themeService.initialize();
    expect(appliedTheme()).toBe("black");

    window.history.replaceState(null, "", "/properties/example");
    themeService.initialize();
    expect(appliedTheme()).toBe("market-dark");
  });
});
