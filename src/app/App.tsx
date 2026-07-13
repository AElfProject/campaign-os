import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProjectOwnerCampaignApiBridge } from "../api/projectOwnerCampaignApiBridge";
import {
  createWalletSessionApiLoadingState,
  createWalletSessionApiSeededFallbackState,
  submitWalletSessionApiPreview,
  type WalletSessionApiBridgeState,
  type WalletSessionPreviewRequest,
} from "../api/walletSessionApiBridge";
import {
  campaignDetail,
  createCampaignShareCardReadiness,
  parseCampaignRoutePath,
  walletOptions,
  walletSessions,
  type CampaignMetadataField,
  type NormalizedWalletSession,
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
import { createOwnerSessionKey } from "../components/panels/project-console/ownerCampaignWorkflow";
import { UserAppPanel } from "../components/panels/user-app/UserAppPanel";
import { WalletConnectModal } from "../components/wallet/WalletConnectModal";

type BusinessContentLocale = Exclude<SupportedLocale, "ja-JP" | "ko-KR" | "vi-VN" | "id-ID" | "tr-TR" | "es-ES">;

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
    walletConnectedAction: "Manage wallet connection",
    walletPreviewConnect: "Connect Wallet",
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
    walletConnectedAction: "管理钱包连接",
    walletPreviewConnect: "连接钱包",
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
    walletConnectedAction: "管理錢包連接",
    walletPreviewConnect: "連接錢包",
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
    walletConnectedAction: "Manage wallet connection",
    walletPreviewConnect: "Connect Wallet",
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
    walletConnectedAction: "Manage wallet connection",
    walletPreviewConnect: "Connect Wallet",
    localeLabel: "Language",
    project: "Project Console",
    shellTitle: "Campaign operations shell",
    userTitle: "User App",
  },
  "vi-VN": {
    adminTitle: "Admin/Ops",
    brand: "aelf Campaign OS",
    browserLocalePromptDismiss: "Keep English",
    browserLocalePromptMessage: "Vietnamese is active with English fallback for business copy.",
    browserLocalePromptSwitch: "Switch to Vietnamese",
    productAnalytics: "Analytics",
    productCampaigns: "Campaigns",
    productCreate: "Create",
    productExport: "Export",
    walletConnectedAction: "Manage wallet connection",
    walletPreviewConnect: "Connect Wallet",
    localeLabel: "Language",
    project: "Project Console",
    shellTitle: "Campaign operations shell",
    userTitle: "User App",
  },
  "id-ID": {
    adminTitle: "Admin/Ops",
    brand: "aelf Campaign OS",
    browserLocalePromptDismiss: "Keep English",
    browserLocalePromptMessage: "Indonesian is active with English fallback for business copy.",
    browserLocalePromptSwitch: "Switch to Indonesian",
    productAnalytics: "Analytics",
    productCampaigns: "Campaigns",
    productCreate: "Create",
    productExport: "Export",
    walletConnectedAction: "Manage wallet connection",
    walletPreviewConnect: "Connect Wallet",
    localeLabel: "Language",
    project: "Project Console",
    shellTitle: "Campaign operations shell",
    userTitle: "User App",
  },
  "tr-TR": {
    adminTitle: "Admin/Ops",
    brand: "aelf Campaign OS",
    browserLocalePromptDismiss: "Keep English",
    browserLocalePromptMessage: "Turkish is active with English fallback for business copy.",
    browserLocalePromptSwitch: "Switch to Turkish",
    productAnalytics: "Analytics",
    productCampaigns: "Campaigns",
    productCreate: "Create",
    productExport: "Export",
    walletConnectedAction: "Manage wallet connection",
    walletPreviewConnect: "Connect Wallet",
    localeLabel: "Language",
    project: "Project Console",
    shellTitle: "Campaign operations shell",
    userTitle: "User App",
  },
  "es-ES": {
    adminTitle: "Admin/Ops",
    brand: "aelf Campaign OS",
    browserLocalePromptDismiss: "Keep English",
    browserLocalePromptMessage: "Spanish is active with English fallback for business copy.",
    browserLocalePromptSwitch: "Switch to Spanish",
    productAnalytics: "Analytics",
    productCampaigns: "Campaigns",
    productCreate: "Create",
    productExport: "Export",
    walletConnectedAction: "Manage wallet connection",
    walletPreviewConnect: "Connect Wallet",
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

const walletSessionApiBaseUrl = () => import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL as string | undefined;

const headerWalletPreviewRequest: WalletSessionPreviewRequest = {
  adapterName: "PortkeyAAWallet",
  fixtureId: "sess-aa-001",
};

const isIssuedOwnerSessionReady = (
  state: WalletSessionApiBridgeState,
  session: NormalizedWalletSession | null,
) => Boolean(
  session
  && state.source === "api_runtime"
  && state.status === "connected"
  && state.repository?.sessionId === session.sessionId
  && session.issuer?.valid === true,
);

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

export interface AppProps {
  ownerCampaignBridge?: ProjectOwnerCampaignApiBridge;
}

export const App = ({ ownerCampaignBridge }: AppProps = {}) => {
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
  const [headerWalletModalOpen, setHeaderWalletModalOpen] = useState(false);
  const [headerWalletSessionBridgeState, setHeaderWalletSessionBridgeState] =
    useState<WalletSessionApiBridgeState>(() => createWalletSessionApiSeededFallbackState(
      headerWalletPreviewRequest,
    ));
  const [headerWalletSession, setHeaderWalletSession] =
    useState<NormalizedWalletSession | null>(null);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [activeCampaignSessionKey, setActiveCampaignSessionKey] = useState<string | null>(null);
  const ownerSessionReady = isIssuedOwnerSessionReady(
    headerWalletSessionBridgeState,
    headerWalletSession,
  );
  const ownerSessionKey = createOwnerSessionKey(
    ownerSessionReady ? headerWalletSession : null,
  );
  const controlledActiveCampaignId = activeCampaignSessionKey === ownerSessionKey
    ? activeCampaignId
    : null;
  const copy = surfaceCopy[locale];
  const contentLocale: BusinessContentLocale = locale === "zh-CN" ? "zh-CN" : "en-US";
  const walletModalLocale: BusinessContentLocale =
    locale === "zh-CN" || locale === "zh-TW" ? locale : "en-US";
  const shareCard = useMemo(
    () => createCampaignShareCardReadiness(campaignDetail, locale),
    [locale],
  );

  useEffect(() => {
    applyCampaignMetadata(shareCard.metadataFields);
  }, [shareCard]);

  useEffect(() => {
    setActiveCampaignId(null);
    setActiveCampaignSessionKey(ownerSessionKey);
  }, [ownerSessionKey]);

  const changeActiveCampaignId = useCallback((campaignId: string | null) => {
    if (!ownerSessionKey || !campaignId) {
      setActiveCampaignId(null);
      setActiveCampaignSessionKey(ownerSessionKey);
      return;
    }

    setActiveCampaignSessionKey(ownerSessionKey);
    setActiveCampaignId(campaignId);
  }, [ownerSessionKey]);

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

  const connectHeaderPreviewWallet = async () => {
    setHeaderWalletSessionBridgeState(createWalletSessionApiLoadingState(headerWalletPreviewRequest));

    const nextState = await submitWalletSessionApiPreview({
      config: {
        baseUrl: walletSessionApiBaseUrl(),
        tracePrefix: "header-wallet-session",
      },
      request: headerWalletPreviewRequest,
    });

    setHeaderWalletSessionBridgeState(nextState);

    if (nextState.session) {
      setHeaderWalletSession(nextState.session);
      setHeaderWalletModalOpen(false);
    }
  };

  return (
    <>
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
        onWalletAction={() => setHeaderWalletModalOpen(true)}
        productNavigation={productNavigation}
        shellTitle={copy.shellTitle}
        surfaces={surfaces}
        walletActionLabel={copy.walletPreviewConnect}
        walletConnectedActionLabel={copy.walletConnectedAction}
        walletSession={headerWalletSession}
      >
        {activeSurface === "project" ? (
          <ProjectConsole
            activeCampaignId={controlledActiveCampaignId}
            activeWorkspace={activeProjectWorkspace}
            locale={contentLocale}
            onActiveCampaignIdChange={changeActiveCampaignId}
            onOwnerReconnect={() => setHeaderWalletModalOpen(true)}
            onWorkspaceChange={selectProjectWorkspace}
            ownerCampaignBridge={ownerCampaignBridge}
            ownerSession={headerWalletSession}
            ownerSessionReady={ownerSessionReady}
          />
        ) : activeSurface === "user" ? (
          <UserAppPanel locale={contentLocale} shareLocale={locale} walletModalLocale={walletModalLocale} />
        ) : (
          <AdminOpsPanel locale={contentLocale} />
        )}
      </AppLayout>
      {headerWalletModalOpen ? (
        <WalletConnectModal
          locale={walletModalLocale}
          onClose={() => setHeaderWalletModalOpen(false)}
          onPreviewConnect={connectHeaderPreviewWallet}
          options={walletOptions}
          walletSessionBridgeState={headerWalletSessionBridgeState}
        />
      ) : null}
    </>
  );
};
