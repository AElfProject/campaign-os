import { supportedLocales, type SupportedLocale } from "./types";

export const defaultLocale: SupportedLocale = "en-US";
export const fallbackLocale: SupportedLocale = "en-US";

export type LocalePreferenceSource = "url" | "profile" | "storage" | "default";

export interface LocalePreferenceCandidates {
  profileLocale?: string | null;
  storedLocale?: string | null;
  urlLocale?: string | null;
}

export interface LocalePreferenceResolution {
  locale: SupportedLocale;
  source: LocalePreferenceSource;
}

export const isSupportedLocale = (locale: string): locale is SupportedLocale =>
  (supportedLocales as readonly string[]).includes(locale);

export const resolveLocale = (requestedLocale?: string | null): SupportedLocale => {
  if (requestedLocale && isSupportedLocale(requestedLocale)) {
    return requestedLocale;
  }

  return defaultLocale;
};

export const resolveLocalePreference = ({
  profileLocale,
  storedLocale,
  urlLocale,
}: LocalePreferenceCandidates = {}): LocalePreferenceResolution => {
  const candidates: Array<[LocalePreferenceSource, string | null | undefined]> = [
    ["url", urlLocale],
    ["profile", profileLocale],
    ["storage", storedLocale],
  ];

  for (const [source, locale] of candidates) {
    if (locale && isSupportedLocale(locale)) {
      return { locale, source };
    }
  }

  return { locale: defaultLocale, source: "default" };
};

export const isChineseBrowserLanguage = (language: string) =>
  language.trim().toLowerCase() === "zh" ||
  language.trim().toLowerCase().startsWith("zh-");

export const shouldRecommendChineseLocale = ({
  browserLanguages,
  promptDismissed,
  resolution,
}: {
  browserLanguages: readonly string[];
  promptDismissed: boolean;
  resolution: LocalePreferenceResolution;
}) =>
  !promptDismissed &&
  resolution.source === "default" &&
  browserLanguages.some(isChineseBrowserLanguage);

export const getLocalizedText = (
  text: Record<SupportedLocale, string>,
  locale: SupportedLocale,
) => text[locale] || text[fallbackLocale];
