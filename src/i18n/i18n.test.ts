import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { messages, translate, type MessageKey } from "./messages";
import {
  browserLocalePromptDismissedStorageKey,
  localePreferenceStorageKey,
  useLocale,
} from "./useLocale";

const canonicalEnglishSchemaMessages = {
  "common.connectWallet": "Connect Wallet",
  "common.chooseWallet": "Choose how you want to join this campaign.",
  "common.defaultLanguage": "Default language: English",
  "common.language": "English",
  "common.exportNotReward": "Export winners ≠ distribute rewards.",
  "common.privateKeyWarning": "Campaign OS never asks for your private key.",
  "wallet.recommended": "Recommended for new users",
  "wallet.portkeyAA": "Portkey AA Wallet",
  "wallet.portkeyEOAApp": "Portkey EOA App",
  "wallet.portkeyEOAExtension": "Portkey EOA Extension",
  "wallet.nightElf": "NightElf Wallet",
  "wallet.agentSkill": "Agent Skill Wallet",
  "wallet.anyWallet": "Any wallet",
  "wallet.aaOnly": "AA only",
  "wallet.eoaOnly": "EOA only",
  "campaign.aiPlanner": "AI Campaign Planner",
  "campaign.taskBuilder": "Task Builder",
  "campaign.rewardsEligibility": "Rewards & Eligibility",
  "campaign.translationManager": "Translation Manager",
  "campaign.contractImpact": "Contract Impact Review",
  "campaign.eligibilityChecker": "Eligibility Checker",
} as const satisfies Record<MessageKey, string>;

const canonicalSchemaKeys = Object.keys(canonicalEnglishSchemaMessages).sort() as MessageKey[];

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

  it("keeps runtime keys aligned to the v0.2 i18n schema", () => {
    expect(Object.keys(messages["en-US"]).sort()).toEqual(canonicalSchemaKeys);
    expect(Object.keys(messages["zh-CN"]).sort()).toEqual(canonicalSchemaKeys);
    expect(Object.keys(messages["zh-TW"]).sort()).toEqual(canonicalSchemaKeys);
    expect(Object.keys(messages["ja-JP"]).sort()).toEqual(canonicalSchemaKeys);
    expect(Object.keys(messages["ko-KR"]).sort()).toEqual(canonicalSchemaKeys);
    expect(Object.keys(messages["vi-VN"]).sort()).toEqual(canonicalSchemaKeys);
    expect(Object.keys(messages["id-ID"]).sort()).toEqual(canonicalSchemaKeys);
    expect(Object.keys(messages["tr-TR"]).sort()).toEqual(canonicalSchemaKeys);
    expect(Object.keys(messages["es-ES"]).sort()).toEqual(canonicalSchemaKeys);
  });

  it("keeps English values equal to the v0.2 i18n schema", () => {
    expect(messages["en-US"]).toEqual(canonicalEnglishSchemaMessages);
  });

  it("provides complete Chinese copy for every canonical schema key", () => {
    for (const key of canonicalSchemaKeys) {
      expect(messages["zh-CN"][key].trim()).not.toBe("");
      expect(messages["zh-TW"][key].trim()).not.toBe("");
    }
  });

  it("keeps ja-JP runtime messages on explicit English fallback copy", () => {
    expect(messages["ja-JP"]["common.language"]).toBe("日本語");
    expect(translate("ja-JP", "common.connectWallet")).toBe("Connect Wallet");
    expect(translate("ja-JP", "campaign.translationManager")).toBe("Translation Manager");
    expect(translate("ja-JP", "common.defaultLanguage")).toContain("English fallback");
  });

  it("keeps ko-KR runtime messages on explicit English fallback copy", () => {
    expect(messages["ko-KR"]["common.language"]).toBe("한국어");
    expect(translate("ko-KR", "common.connectWallet")).toBe("Connect Wallet");
    expect(translate("ko-KR", "campaign.translationManager")).toBe("Translation Manager");
    expect(translate("ko-KR", "common.defaultLanguage")).toContain("English fallback");
  });

  it("keeps vi-VN runtime messages on explicit English fallback copy", () => {
    expect(messages["vi-VN"]["common.language"]).toBe("Tiếng Việt");
    expect(translate("vi-VN", "common.connectWallet")).toBe("Connect Wallet");
    expect(translate("vi-VN", "campaign.translationManager")).toBe("Translation Manager");
    expect(translate("vi-VN", "common.defaultLanguage")).toContain("English fallback");
  });

  it("keeps id-ID runtime messages on explicit English fallback copy", () => {
    expect(messages["id-ID"]["common.language"]).toBe("Bahasa Indonesia");
    expect(translate("id-ID", "common.connectWallet")).toBe("Connect Wallet");
    expect(translate("id-ID", "campaign.translationManager")).toBe("Translation Manager");
    expect(translate("id-ID", "common.defaultLanguage")).toContain("English fallback");
  });

  it("keeps tr-TR runtime messages on explicit English fallback copy", () => {
    expect(messages["tr-TR"]["common.language"]).toBe("Turkish");
    expect(translate("tr-TR", "common.connectWallet")).toBe("Connect Wallet");
    expect(translate("tr-TR", "campaign.translationManager")).toBe("Translation Manager");
    expect(translate("tr-TR", "common.defaultLanguage")).toContain("English fallback");
  });

  it("keeps es-ES runtime messages on explicit English fallback copy", () => {
    expect(messages["es-ES"]["common.language"]).toBe("Spanish");
    expect(translate("es-ES", "common.connectWallet")).toBe("Connect Wallet");
    expect(translate("es-ES", "campaign.translationManager")).toBe("Translation Manager");
    expect(translate("es-ES", "common.defaultLanguage")).toContain("English fallback");
  });

  it("provides English, Simplified Chinese, and Traditional Chinese UI copy", () => {
    expect(translate("en-US", "common.connectWallet")).toBe("Connect Wallet");
    expect(translate("zh-CN", "common.connectWallet")).toBe("连接钱包");
    expect(translate("zh-TW", "common.connectWallet")).toBe("連接錢包");
    expect(translate("en-US", "campaign.translationManager")).toBe("Translation Manager");
    expect(translate("zh-TW", "wallet.anyWallet")).toBe("任意錢包");
  });

  it("keeps export responsibility explicit in all MVP locales", () => {
    expect(translate("en-US", "common.exportNotReward")).toBe("Export winners ≠ distribute rewards.");
    expect(translate("zh-CN", "common.exportNotReward")).toContain("≠ 发奖");
    expect(translate("zh-TW", "common.exportNotReward")).toContain("≠ 發獎");
  });

  it("restores and persists supported locale preferences", () => {
    window.localStorage.setItem(localePreferenceStorageKey, "ko-KR");

    const { result } = renderHook(() => useLocale());

    expect(result.current.locale).toBe("ko-KR");
    expect(result.current.localeSource).toBe("storage");

    act(() => result.current.setLocale("en-US"));

    expect(result.current.locale).toBe("en-US");
    expect(window.localStorage.getItem(localePreferenceStorageKey)).toBe("en-US");
  });

  it("uses URL locale before stored locale for initial resolution", () => {
    window.localStorage.setItem(localePreferenceStorageKey, "en-US");

    const { result } = renderHook(() => useLocale("ko-KR"));

    expect(result.current.locale).toBe("ko-KR");
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
