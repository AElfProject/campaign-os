import { useCallback, useMemo, useState } from "react";
import {
  defaultLocale,
  isSupportedLocale,
  resolveLocale,
  resolveLocalePreference,
  shouldRecommendChineseLocale,
  type LocalePreferenceSource,
  type SupportedLocale,
} from "../domain";
import { translate, type MessageKey } from "./messages";

export const localePreferenceStorageKey = "campaign-os.localePreference";
export const browserLocalePromptDismissedStorageKey =
  "campaign-os.browserLocalePromptDismissed";

const safeGetLocalStorageValue = (key: string) => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetLocalStorageValue = (key: string, value: string) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Keep the in-memory locale usable when browser storage is blocked.
  }
};

const readStoredLocale = () => {
  const storedLocale = safeGetLocalStorageValue(localePreferenceStorageKey);

  return storedLocale && isSupportedLocale(storedLocale) ? storedLocale : null;
};

const readPromptDismissed = () =>
  safeGetLocalStorageValue(browserLocalePromptDismissedStorageKey) === "true";

const getBrowserLanguages = () => {
  if (typeof window === "undefined") {
    return [];
  }

  const languages = window.navigator.languages?.length
    ? window.navigator.languages
    : [window.navigator.language].filter(Boolean);

  return [...languages];
};

export const useLocale = (initialLocale?: string) => {
  const [localeState, setLocaleState] = useState<{
    locale: SupportedLocale;
    source: LocalePreferenceSource;
  }>(() => {
    const resolution = resolveLocalePreference({
      storedLocale: readStoredLocale(),
      urlLocale: initialLocale,
    });

    return { locale: resolution.locale, source: resolution.source };
  });
  const [browserPromptDismissed, setBrowserPromptDismissed] = useState(readPromptDismissed);

  const setLocale = useCallback((nextLocale: string) => {
    const resolvedLocale = resolveLocale(nextLocale);

    safeSetLocalStorageValue(localePreferenceStorageKey, resolvedLocale);
    setLocaleState({ locale: resolvedLocale, source: "storage" });
  }, []);

  const shouldShowBrowserLocalePrompt = shouldRecommendChineseLocale({
    browserLanguages: getBrowserLanguages(),
    promptDismissed: browserPromptDismissed,
    resolution: localeState,
  });

  const acceptBrowserLocalePrompt = useCallback(() => {
    safeSetLocalStorageValue(localePreferenceStorageKey, "zh-CN");
    safeSetLocalStorageValue(browserLocalePromptDismissedStorageKey, "true");
    setBrowserPromptDismissed(true);
    setLocaleState({ locale: "zh-CN", source: "storage" });
  }, []);

  const dismissBrowserLocalePrompt = useCallback(() => {
    safeSetLocalStorageValue(browserLocalePromptDismissedStorageKey, "true");
    setBrowserPromptDismissed(true);
  }, []);

  return useMemo(
    () => ({
      acceptBrowserLocalePrompt,
      dismissBrowserLocalePrompt,
      locale: localeState.locale,
      localeSource: localeState.source,
      setLocale,
      shouldShowBrowserLocalePrompt,
      t: (key: MessageKey) => translate(localeState.locale, key),
    }),
    [
      acceptBrowserLocalePrompt,
      dismissBrowserLocalePrompt,
      localeState.locale,
      localeState.source,
      setLocale,
      shouldShowBrowserLocalePrompt,
    ],
  );
};
