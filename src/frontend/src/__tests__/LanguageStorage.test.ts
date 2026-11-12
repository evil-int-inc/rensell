import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});
afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("language startup", () => {
  it.each(["en", "ru", "ka"])(
    "restores saved %s before the first render",
    async (language) => {
      localStorage.setItem("chillpong.language", language);
      const i18n = await import("@/i18n");
      expect(i18n.getLanguage()).toBe(language);
      expect(document.documentElement.lang).toBe(language);
    },
  );

  it.each([null, "fr", "geo", "", "garbage"])(
    "uses Russian with missing or unsupported storage (%s)",
    async (stored) => {
      if (stored !== null) localStorage.setItem("chillpong.language", stored);
      const i18n = await import("@/i18n");
      expect(i18n.getLanguage()).toBe("ru");
      expect(document.documentElement.lang).toBe("ru");
    },
  );

  it("defaults to Russian when reading storage throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage disabled");
    });
    const i18n = await import("@/i18n");
    expect(i18n.getLanguage()).toBe("ru");
  });
});
