import { useState } from "react";
import { walletSessions, type SupportedLocale } from "../domain";
import { useLocale } from "../i18n/useLocale";
import {
  AppLayout,
  SurfacePlaceholder,
  type SurfaceKey,
} from "../components/layout/AppLayout";
import { ProjectConsole } from "../components/panels/project-console/ProjectConsole";
import { UserAppPanel } from "../components/panels/user-app/UserAppPanel";

const surfaceCopy = {
  "en-US": {
    adminAction: "Placeholder",
    adminDescription:
      "Admin/Ops implementation is reserved for WP05; this anchor keeps the surface discoverable without overclaiming review tooling.",
    adminTitle: "Admin/Ops",
    brand: "aelf Campaign OS",
    localeLabel: "Language",
    project: "Project Console",
    shellTitle: "Campaign operations shell",
    userTitle: "User App",
  },
  "zh-CN": {
    adminAction: "占位",
    adminDescription:
      "Admin/Ops 实现在 WP05 交付；当前只保留入口，避免过度声明审核工具已完成。",
    adminTitle: "管理员/Ops",
    brand: "aelf Campaign OS",
    localeLabel: "语言",
    project: "项目控制台",
    shellTitle: "活动运营工作台",
    userTitle: "用户应用",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

export const App = () => {
  const { locale, setLocale } = useLocale();
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
        <SurfacePlaceholder
          action={copy.adminAction}
          description={copy.adminDescription}
          title={copy.adminTitle}
        />
      )}
    </AppLayout>
  );
};
