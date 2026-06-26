import { useCallback, useMemo, useState } from "react";
import { defaultLocale, resolveLocale, type SupportedLocale } from "../domain";
import { translate, type MessageKey } from "./messages";

export const useLocale = (initialLocale: string = defaultLocale) => {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => resolveLocale(initialLocale));

  const setLocale = useCallback((nextLocale: string) => {
    setLocaleState(resolveLocale(nextLocale));
  }, []);

  return useMemo(
    () => ({
      locale,
      setLocale,
      t: (key: MessageKey) => translate(locale, key),
    }),
    [locale, setLocale],
  );
};
