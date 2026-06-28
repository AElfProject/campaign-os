import { useState } from "react";
import { walletSessions, type SupportedLocale } from "../domain";
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
} satisfies Record<SupportedLocale, Record<string, string>>;

export const App = () => {
  const {
    acceptBrowserLocalePrompt,
    dismissBrowserLocalePrompt,
    locale,
    setLocale,
    shouldShowBrowserLocalePrompt,
  } = useLocale();
  const [activeSurface, setActiveSurface] = useState<SurfaceKey>("project");
  const copy = surfaceCopy[locale];
  const connectedWallet = walletSessions[0];

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
        <ProjectConsole locale={locale} />
      ) : activeSurface === "user" ? (
        <UserAppPanel locale={locale} />
      ) : (
        <AdminOpsPanel locale={locale} />
      )}
    </AppLayout>
  );
};
