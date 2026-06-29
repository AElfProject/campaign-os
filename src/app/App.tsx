import { useEffect, useMemo, useState } from "react";
import {
  campaignDetail,
  createCampaignShareCardReadiness,
  parseCampaignRoutePath,
  walletSessions,
  type CampaignMetadataField,
  type SupportedLocale,
} from "../domain";
import { useLocale } from "../i18n/useLocale";
import {
  AppLayout,
  type SurfaceKey,
} from "../components/layout/AppLayout";
import { AdminOpsPanel } from "../components/panels/admin-ops/AdminOpsPanel";
import { ProjectConsole } from "../components/panels/project-console/ProjectConsole";
import { UserAppPanel } from "../components/panels/user-app/UserAppPanel";

const surfaceCopy = {
  "en-US": {
    adminTitle: "Admin/Ops",
    brand: "aelf Campaign OS",
    browserLocalePromptDismiss: "Keep English",
    browserLocalePromptMessage: "Your browser language is Chinese. Switch to 简体中文?",
    browserLocalePromptSwitch: "Switch to 简体中文",
    localeLabel: "Language",
    project: "Project Console",
    shellTitle: "Campaign operations shell",
    userTitle: "User App",
  },
  "zh-CN": {
    adminTitle: "管理员/Ops",
    brand: "aelf Campaign OS",
    browserLocalePromptDismiss: "继续使用 English",
    browserLocalePromptMessage: "浏览器语言为中文。切换到简体中文？",
    browserLocalePromptSwitch: "切换到简体中文",
    localeLabel: "语言",
    project: "项目控制台",
    shellTitle: "活动运营工作台",
    userTitle: "用户应用",
  },
  "zh-TW": {
    adminTitle: "管理員/Ops",
    brand: "aelf Campaign OS",
    browserLocalePromptDismiss: "繼續使用 English",
    browserLocalePromptMessage: "瀏覽器語言為中文。切換到簡體中文？",
    browserLocalePromptSwitch: "切換到簡體中文",
    localeLabel: "語言",
    project: "專案控制台",
    shellTitle: "活動營運工作台",
    userTitle: "使用者應用",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

const readBrowserPathname = () => {
  if (typeof window === "undefined") {
    return "/";
  }

  return window.location.pathname || "/";
};

const findMetadataTag = (
  attributeName: "name" | "property",
  attributeValue: string,
) =>
  Array.from(document.head.querySelectorAll("meta")).find(
    (meta) => meta.getAttribute(attributeName) === attributeValue,
  );

const applyCampaignMetadata = (fields: readonly CampaignMetadataField[]) => {
  if (typeof document === "undefined") {
    return;
  }

  for (const field of fields) {
    if (field.kind === "document-title") {
      document.title = field.content;
      continue;
    }

    const attributeName = field.kind === "meta-property" ? "property" : "name";
    const meta =
      findMetadataTag(attributeName, field.name) ?? document.createElement("meta");

    meta.setAttribute(attributeName, field.name);
    meta.setAttribute("content", field.content);

    if (!meta.parentElement) {
      document.head.appendChild(meta);
    }
  }
};

export const App = () => {
  const routeContext = useMemo(
    () => parseCampaignRoutePath(readBrowserPathname()),
    [],
  );
  const {
    acceptBrowserLocalePrompt,
    dismissBrowserLocalePrompt,
    locale,
    setLocale,
    shouldShowBrowserLocalePrompt,
  } = useLocale(routeContext.urlLocale ?? undefined);
  const [activeSurface, setActiveSurface] = useState<SurfaceKey>("project");
  const copy = surfaceCopy[locale];
  const contentLocale: SupportedLocale = locale === "zh-TW" ? "en-US" : locale;
  const connectedWallet = walletSessions[0];
  const shareCard = useMemo(
    () => createCampaignShareCardReadiness(campaignDetail, locale),
    [locale],
  );

  useEffect(() => {
    applyCampaignMetadata(shareCard.metadataFields);
  }, [shareCard]);

  const surfaces = [
    { key: "project" as const, label: copy.project },
    { key: "user" as const, label: copy.userTitle },
    { key: "admin" as const, label: copy.adminTitle },
  ];

  return (
    <AppLayout
      activeSurface={activeSurface}
      brand={copy.brand}
      browserLocalePrompt={
        shouldShowBrowserLocalePrompt
          ? {
              dismissLabel: copy.browserLocalePromptDismiss,
              message: copy.browserLocalePromptMessage,
              onDismiss: dismissBrowserLocalePrompt,
              onSwitch: acceptBrowserLocalePrompt,
              switchLabel: copy.browserLocalePromptSwitch,
            }
          : undefined
      }
      locale={locale}
      localeLabel={copy.localeLabel}
      onLocaleChange={setLocale}
      onSurfaceChange={setActiveSurface}
      shellTitle={copy.shellTitle}
      surfaces={surfaces}
      walletSession={connectedWallet}
    >
      {activeSurface === "project" ? (
        <ProjectConsole locale={contentLocale} />
      ) : activeSurface === "user" ? (
        <UserAppPanel locale={contentLocale} shareLocale={locale} />
      ) : (
        <AdminOpsPanel locale={contentLocale} />
      )}
    </AppLayout>
  );
};
