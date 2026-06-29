import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { translate } from "./messages";
import {
  browserLocalePromptDismissedStorageKey,
  localePreferenceStorageKey,
  useLocale,
} from "./useLocale";

const setNavigatorLanguages = (languages: readonly string[]) => {
  Object.defineProperty(window.navigator, "languages", {
    configurable: true,
    value: languages,
  });
  Object.defineProperty(window.navigator, "language", {
    configurable: true,
    value: languages[0] ?? "en-US",
  });
};

describe("i18n messages", () => {
  afterEach(() => {
    window.localStorage.clear();
    setNavigatorLanguages(["en-US"]);
    vi.restoreAllMocks();
  });

  it("provides English, Simplified Chinese, and Traditional Chinese UI copy", () => {
    expect(translate("en-US", "action.connectWallet")).toBe("Connect Wallet");
    expect(translate("zh-CN", "action.connectWallet")).toBe("连接钱包");
    expect(translate("zh-TW", "action.connectWallet")).toBe("連接錢包");
    expect(translate("zh-TW", "locale.traditionalChinese")).toBe("繁體中文");
  });

  it("keeps export responsibility explicit in all MVP locales", () => {
    expect(translate("en-US", "export.disclaimer")).toContain("does not distribute rewards");
    expect(translate("zh-CN", "export.disclaimer")).toContain("不等于发奖");
    expect(translate("zh-TW", "export.disclaimer")).toContain("不等於發獎");
  });

  it("restores and persists supported locale preferences", () => {
    window.localStorage.setItem(localePreferenceStorageKey, "zh-TW");

    const { result } = renderHook(() => useLocale());

    expect(result.current.locale).toBe("zh-TW");
    expect(result.current.localeSource).toBe("storage");

    act(() => result.current.setLocale("en-US"));

    expect(result.current.locale).toBe("en-US");
    expect(window.localStorage.getItem(localePreferenceStorageKey)).toBe("en-US");
  });

  it("uses URL locale before stored locale for initial resolution", () => {
    window.localStorage.setItem(localePreferenceStorageKey, "en-US");

    const { result } = renderHook(() => useLocale("zh-CN"));

    expect(result.current.locale).toBe("zh-CN");
    expect(result.current.localeSource).toBe("url");
  });

  it("keeps Chinese browser language as a prompt-only recommendation", () => {
    setNavigatorLanguages(["zh-TW"]);

    const { result } = renderHook(() => useLocale());

    expect(result.current.locale).toBe("en-US");
    expect(result.current.localeSource).toBe("default");
    expect(result.current.shouldShowBrowserLocalePrompt).toBe(true);

    act(() => result.current.acceptBrowserLocalePrompt());

    expect(result.current.locale).toBe("zh-CN");
    expect(result.current.shouldShowBrowserLocalePrompt).toBe(false);
    expect(window.localStorage.getItem(localePreferenceStorageKey)).toBe("zh-CN");
  });

  it("dismisses browser language prompt without changing locale", () => {
    setNavigatorLanguages(["zh-Hans-CN"]);

    const { result, rerender } = renderHook(() => useLocale());

    expect(result.current.locale).toBe("en-US");
    expect(result.current.shouldShowBrowserLocalePrompt).toBe(true);

    act(() => result.current.dismissBrowserLocalePrompt());
    rerender();

    expect(result.current.locale).toBe("en-US");
    expect(result.current.shouldShowBrowserLocalePrompt).toBe(false);
    expect(window.localStorage.getItem(browserLocalePromptDismissedStorageKey)).toBe("true");
  });

  it("falls back safely when locale storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked storage");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked storage");
    });

    const { result } = renderHook(() => useLocale());

    expect(result.current.locale).toBe("en-US");

    act(() => result.current.setLocale("zh-TW"));

    expect(result.current.locale).toBe("zh-TW");
  });
});
