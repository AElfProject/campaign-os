import { supportedLocales, type SupportedLocale } from "./types";

export const defaultLocale: SupportedLocale = "en-US";
export const fallbackLocale: SupportedLocale = "en-US";

export const isSupportedLocale = (locale: string): locale is SupportedLocale =>
  (supportedLocales as readonly string[]).includes(locale);

export const resolveLocale = (requestedLocale?: string | null): SupportedLocale => {
  if (requestedLocale && isSupportedLocale(requestedLocale)) {
    return requestedLocale;
  }

  return defaultLocale;
};

export const getLocalizedText = (
  text: Record<SupportedLocale, string>,
  locale: SupportedLocale,
) => text[locale] || text[fallbackLocale];
