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
  type ProductDestinationKey,
  type SurfaceKey,
} from "../components/layout/AppLayout";
import { AdminOpsPanel } from "../components/panels/admin-ops/AdminOpsPanel";
import {
  ProjectConsole,
  type ProjectWorkspaceKey,
} from "../components/panels/project-console/ProjectConsole";
import { UserAppPanel } from "../components/panels/user-app/UserAppPanel";

type BusinessContentLocale = Exclude<SupportedLocale, "ja-JP" | "ko-KR">;

const surfaceCopy = {
  "en-US": {
    adminTitle: "Admin/Ops",
    brand: "aelf Campaign OS",
    browserLocalePromptDismiss: "Keep English",
    browserLocalePromptMessage: "Your browser language is Chinese. Switch to 简体中文?",
    browserLocalePromptSwitch: "Switch to 简体中文",
    productAnalytics: "Analytics",
    productCampaigns: "Campaigns",
    productCreate: "Create",
    productExport: "Export",
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
    productAnalytics: "分析",
    productCampaigns: "活动",
    productCreate: "创建",
    productExport: "导出",
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
    productAnalytics: "分析",
    productCampaigns: "活動",
    productCreate: "建立",
    productExport: "匯出",
    localeLabel: "語言",
    project: "專案控制台",
    shellTitle: "活動營運工作台",
    userTitle: "使用者應用",
  },
  "ja-JP": {
    adminTitle: "Admin/Ops",
    brand: "aelf Campaign OS",
    browserLocalePromptDismiss: "Keep English",
    browserLocalePromptMessage: "Japanese is active with English fallback for business copy.",
    browserLocalePromptSwitch: "Switch to Japanese",
    productAnalytics: "Analytics",
    productCampaigns: "Campaigns",
    productCreate: "Create",
    productExport: "Export",
    localeLabel: "Language",
    project: "Project Console",
    shellTitle: "Campaign operations shell",
    userTitle: "User App",
  },
  "ko-KR": {
    adminTitle: "Admin/Ops",
    brand: "aelf Campaign OS",
    browserLocalePromptDismiss: "Keep English",
    browserLocalePromptMessage: "Korean is active with English fallback for business copy.",
    browserLocalePromptSwitch: "Switch to Korean",
    productAnalytics: "Analytics",
    productCampaigns: "Campaigns",
    productCreate: "Create",
    productExport: "Export",
    localeLabel: "Language",
    project: "Project Console",
    shellTitle: "Campaign operations shell",
    userTitle: "User App",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

const productDestinationWorkspaceMap: Record<ProductDestinationKey, ProjectWorkspaceKey> = {
  analytics: "analytics",
  campaigns: "campaigns",
  create: "create",
  export: "export",
};

const workspaceProductDestinationMap: Partial<Record<ProjectWorkspaceKey, ProductDestinationKey>> = {
  analytics: "analytics",
  campaigns: "campaigns",
  create: "create",
  export: "export",
};

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
  const [activeProductDestination, setActiveProductDestination] =
    useState<ProductDestinationKey>("campaigns");
  const [activeProjectWorkspace, setActiveProjectWorkspace] =
    useState<ProjectWorkspaceKey>("campaigns");
  const [activeSurface, setActiveSurface] = useState<SurfaceKey>("project");
  const copy = surfaceCopy[locale];
  const contentLocale: BusinessContentLocale = locale === "zh-CN" ? "zh-CN" : "en-US";
  const walletModalLocale: BusinessContentLocale =
    locale === "zh-CN" || locale === "zh-TW" ? locale : "en-US";
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
  const productNavigation = [
    { key: "campaigns" as const, label: copy.productCampaigns },
    { key: "create" as const, label: copy.productCreate },
    { key: "analytics" as const, label: copy.productAnalytics },
    { key: "export" as const, label: copy.productExport },
  ];

  const selectProductDestination = (destination: ProductDestinationKey) => {
    setActiveProductDestination(destination);
    setActiveProjectWorkspace(productDestinationWorkspaceMap[destination]);
    setActiveSurface("project");
  };

  const selectProjectWorkspace = (workspace: ProjectWorkspaceKey) => {
    setActiveProjectWorkspace(workspace);

    const destination = workspaceProductDestinationMap[workspace];

    if (destination) {
      setActiveProductDestination(destination);
    }
  };

  return (
    <AppLayout
      activeProductDestination={activeProductDestination}
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
      onProductDestinationChange={selectProductDestination}
      onSurfaceChange={setActiveSurface}
      productNavigation={productNavigation}
      shellTitle={copy.shellTitle}
      surfaces={surfaces}
      walletSession={connectedWallet}
    >
      {activeSurface === "project" ? (
        <ProjectConsole
          activeWorkspace={activeProjectWorkspace}
          locale={contentLocale}
          onWorkspaceChange={selectProjectWorkspace}
        />
      ) : activeSurface === "user" ? (
        <UserAppPanel locale={contentLocale} shareLocale={locale} walletModalLocale={walletModalLocale} />
      ) : (
        <AdminOpsPanel locale={contentLocale} />
      )}
    </AppLayout>
  );
};
