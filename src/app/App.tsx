import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createAdminDurableReviewApiBridge,
  type AdminDurableReviewApiBridge,
} from "../api/adminDurableReviewApiBridge";
import {
  createParticipantJourneyApiBridge,
  type ParticipantJourneyApiBridge,
  type ParticipantJourneyMode,
} from "../api/participantJourneyApiBridge";
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
import {
  normalizeStageReviewIdentity,
  WalletConnectModal,
  type StageReviewIdentity,
} from "../components/wallet/WalletConnectModal";

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
const isStageReviewModeEnabled = () =>
  import.meta.env.VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED === "1";

const stageReviewHeaderStyle = `
[data-app-controls] > button {
  flex-direction: column !important;
  gap: 2px !important;
}

[data-app-controls] > button > span {
  white-space: nowrap !important;
}

[data-app-controls] > button > span[aria-hidden="true"] {
  display: none !important;
}
`;

type StageReviewFixtureRequest = Readonly<Required<Pick<
  WalletSessionPreviewRequest,
  "adapterName" | "fixtureId"
>>>;

const stageReviewFixtureRequests = {
  admin: {
    adapterName: "PortkeyAAWallet",
    fixtureId: "sess-aa-001",
  },
  owner: {
    adapterName: "PortkeyAAWallet",
    fixtureId: "sess-aa-001",
  },
  "participant-a": {
    adapterName: "PortkeyDiscoverWallet",
    fixtureId: "sess-eoa-app-001",
  },
  "participant-b": {
    adapterName: "PortkeyExtensionWallet",
    fixtureId: "sess-eoa-001",
  },
} as const satisfies Readonly<Record<StageReviewIdentity, StageReviewFixtureRequest>>;

const stageReviewSurfaceByIdentity = {
  admin: "admin",
  owner: "project",
  "participant-a": "user",
  "participant-b": "user",
} as const satisfies Readonly<Record<StageReviewIdentity, SurfaceKey>>;

const headerWalletPreviewFixtureRequest = stageReviewFixtureRequests.owner;

const createHeaderWalletPreviewRequest = (
  fixtureRequest: StageReviewFixtureRequest = headerWalletPreviewFixtureRequest,
  proofEvaluatedAt = Date.now(),
): WalletSessionPreviewRequest => {
  return {
    ...fixtureRequest,
    proofEvaluatedAt: new Date(proofEvaluatedAt).toISOString(),
    proofIssuedAt: new Date(proofEvaluatedAt - 1_000).toISOString(),
    signature: globalThis.crypto.randomUUID(),
  };
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

const isIssuedVerifiedWalletSessionReady = (
  state: WalletSessionApiBridgeState,
  session: NormalizedWalletSession | null,
) => Boolean(
  isIssuedOwnerSessionReady(state, session)
  && session
  && (session.accountType === "AA" || session.accountType === "EOA")
  && session.verificationStatus === "verified"
  && session.signatureStatus === "signed"
  && session.walletTypeVerified
  && session.walletSource !== "AGENT_SKILL"
  && session.capabilities.includes("SIGN_MESSAGE")
  && !session.capabilities.includes("INTERNAL_AUTOMATION")
  && session.proof?.proofType === "wallet_signature"
  && session.proof.status === "verified"
  && session.proof.trustLevel === "verified_local",
);

const isStageReviewIdentitySessionReady = (
  state: WalletSessionApiBridgeState,
  identity: StageReviewIdentity,
) => {
  const session = state.session ?? null;
  const fixtureId = stageReviewFixtureRequests[identity].fixtureId;
  const expectedSession = walletSessions.find((candidate) => candidate.sessionId === fixtureId);

  return Boolean(
    isIssuedVerifiedWalletSessionReady(state, session)
    && state.request.fixtureId === fixtureId
    && expectedSession
    && session?.accountType === expectedSession.accountType
    && session.address === expectedSession.address
    && session.chainId === expectedSession.chainId
    && session.network === expectedSession.network
    && session.walletSource === expectedSession.walletSource,
  );
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

export interface AppProps {
  adminDurableReviewBridge?: AdminDurableReviewApiBridge;
  ownerCampaignBridge?: ProjectOwnerCampaignApiBridge;
  participantJourneyBridge?: ParticipantJourneyApiBridge;
}

export const App = ({
  adminDurableReviewBridge,
  ownerCampaignBridge,
  participantJourneyBridge,
}: AppProps = {}) => {
  const stageReviewMode = isStageReviewModeEnabled();
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
      headerWalletPreviewFixtureRequest,
    ));
  const [headerWalletSession, setHeaderWalletSession] =
    useState<NormalizedWalletSession | null>(null);
  const [selectedStageReviewIdentity, setSelectedStageReviewIdentity] =
    useState<StageReviewIdentity>("owner");
  const [connectedStageReviewIdentity, setConnectedStageReviewIdentity] =
    useState<StageReviewIdentity | null>(null);
  const activeHeaderWalletRequestId = useRef(0);
  const latestHeaderWalletProofEvaluatedAt = useRef(0);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [activeCampaignSessionKey, setActiveCampaignSessionKey] = useState<string | null>(null);
  const apiBaseUrl = walletSessionApiBaseUrl();
  const participantJourneyMode: ParticipantJourneyMode = stageReviewMode || apiBaseUrl?.trim()
    ? "durable"
    : "seeded_preview";
  const resolvedParticipantJourneyBridge = useMemo(
    () => participantJourneyBridge ?? createParticipantJourneyApiBridge({
      config: {
        baseUrl: apiBaseUrl,
        tracePrefix: "participant-user-app",
      },
    }),
    [apiBaseUrl, participantJourneyBridge],
  );
  const resolvedAdminDurableReviewBridge = useMemo(
    () => adminDurableReviewBridge ?? createAdminDurableReviewApiBridge({
      config: {
        baseUrl: apiBaseUrl,
        tracePrefix: "admin-durable-review",
      },
    }),
    [adminDurableReviewBridge, apiBaseUrl],
  );
  const issuedOwnerSessionReady = isIssuedOwnerSessionReady(
    headerWalletSessionBridgeState,
    headerWalletSession,
  );
  const issuedParticipantSessionReady = isIssuedVerifiedWalletSessionReady(
    headerWalletSessionBridgeState,
    headerWalletSession,
  );
  const connectedStageSessionReady = connectedStageReviewIdentity !== null
    && isStageReviewIdentitySessionReady(
      headerWalletSessionBridgeState,
      connectedStageReviewIdentity,
    );
  const ownerSessionReady = issuedOwnerSessionReady && (
    !stageReviewMode
    || (connectedStageReviewIdentity === "owner" && connectedStageSessionReady)
  );
  const participantSessionReady = issuedParticipantSessionReady && (
    !stageReviewMode
    || (
      (connectedStageReviewIdentity === "participant-a"
        || connectedStageReviewIdentity === "participant-b")
      && connectedStageSessionReady
    )
  );
  const adminSessionReady = issuedOwnerSessionReady && (
    !stageReviewMode
    || (connectedStageReviewIdentity === "admin" && connectedStageSessionReady)
  );
  const ownerSessionKey = createOwnerSessionKey(
    ownerSessionReady ? headerWalletSession : null,
  );
  const controlledActiveCampaignId = activeCampaignSessionKey === ownerSessionKey
    ? activeCampaignId
    : null;
  const copy = surfaceCopy[locale];
  const stageReviewProps = { stageReviewMode };
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

  useEffect(() => () => {
    activeHeaderWalletRequestId.current += 1;
  }, []);

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
  ].filter(({ key }) => !stageReviewMode || key === "campaigns" || key === "create");

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

  const openHeaderWalletModal = useCallback(() => {
    setHeaderWalletModalOpen(true);
  }, []);

  const closeHeaderWalletModal = useCallback(() => {
    activeHeaderWalletRequestId.current += 1;
    setHeaderWalletSessionBridgeState((state) => state.loading
      ? createWalletSessionApiSeededFallbackState(
          stageReviewFixtureRequests[stageReviewMode ? selectedStageReviewIdentity : "owner"],
        )
      : state);
    setHeaderWalletModalOpen(false);
  }, [selectedStageReviewIdentity, stageReviewMode]);

  const changeStageReviewIdentity = useCallback((identity: StageReviewIdentity) => {
    if (!stageReviewMode) {
      return;
    }

    const nextIdentity = normalizeStageReviewIdentity(identity);

    activeHeaderWalletRequestId.current += 1;
    setSelectedStageReviewIdentity(nextIdentity);
    setConnectedStageReviewIdentity(null);
    setHeaderWalletSession(null);
    setHeaderWalletSessionBridgeState(createWalletSessionApiSeededFallbackState(
      stageReviewFixtureRequests[nextIdentity],
    ));
  }, [stageReviewMode]);

  const connectHeaderPreviewWallet = async (requestedIdentity?: StageReviewIdentity) => {
    const reviewIdentity = stageReviewMode
      ? normalizeStageReviewIdentity(requestedIdentity ?? selectedStageReviewIdentity)
      : "owner";
    const proofEvaluatedAt = Math.max(
      Date.now(),
      latestHeaderWalletProofEvaluatedAt.current + 1,
    );
    const request = createHeaderWalletPreviewRequest(
      stageReviewFixtureRequests[reviewIdentity],
      proofEvaluatedAt,
    );
    const requestId = activeHeaderWalletRequestId.current + 1;

    latestHeaderWalletProofEvaluatedAt.current = proofEvaluatedAt;
    activeHeaderWalletRequestId.current = requestId;
    setConnectedStageReviewIdentity(null);
    setHeaderWalletSession(null);
    setHeaderWalletSessionBridgeState(createWalletSessionApiLoadingState(request));

    const nextState = await submitWalletSessionApiPreview({
      config: {
        baseUrl: walletSessionApiBaseUrl(),
        tracePrefix: "header-wallet-session",
      },
      request,
    });

    if (activeHeaderWalletRequestId.current !== requestId) {
      return;
    }

    setHeaderWalletSessionBridgeState(nextState);

    const stageSessionReady = !stageReviewMode
      || isStageReviewIdentitySessionReady(nextState, reviewIdentity);

    if (nextState.session && stageSessionReady) {
      setHeaderWalletSession(nextState.session);
      if (stageReviewMode) {
        setConnectedStageReviewIdentity(reviewIdentity);
        setActiveSurface(stageReviewSurfaceByIdentity[reviewIdentity]);
      }
      setHeaderWalletModalOpen(false);
    }
  };

  return (
    <>
      {stageReviewMode ? (
        <style data-testid="stage-review-header-style">{stageReviewHeaderStyle}</style>
      ) : null}
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
        onWalletAction={openHeaderWalletModal}
        productNavigation={productNavigation}
        shellTitle={copy.shellTitle}
        surfaces={surfaces}
        walletActionLabel={copy.walletPreviewConnect}
        walletConnectedActionLabel={copy.walletConnectedAction}
        walletSession={headerWalletSession}
      >
        {activeSurface === "project" ? (
          <ProjectConsole
            {...stageReviewProps}
            activeCampaignId={controlledActiveCampaignId}
            activeWorkspace={activeProjectWorkspace}
            locale={contentLocale}
            onActiveCampaignIdChange={changeActiveCampaignId}
            onOwnerReconnect={openHeaderWalletModal}
            onWorkspaceChange={selectProjectWorkspace}
            ownerCampaignBridge={ownerCampaignBridge}
            ownerSession={ownerSessionReady ? headerWalletSession : null}
            ownerSessionReady={ownerSessionReady}
          />
        ) : activeSurface === "user" ? (
          <UserAppPanel
            bridge={resolvedParticipantJourneyBridge}
            locale={contentLocale}
            mode={participantJourneyMode}
            onReconnect={openHeaderWalletModal}
            session={participantSessionReady ? headerWalletSession : null}
            sessionReady={participantSessionReady}
            shareLocale={locale}
            walletModalLocale={walletModalLocale}
          />
        ) : (
          <AdminOpsPanel
            {...stageReviewProps}
            durableReviewBridge={resolvedAdminDurableReviewBridge}
            locale={locale}
            onDurableReviewReconnect={openHeaderWalletModal}
            session={adminSessionReady ? headerWalletSession : null}
          />
        )}
      </AppLayout>
      {headerWalletModalOpen ? (
        <WalletConnectModal
          locale={walletModalLocale}
          onClose={closeHeaderWalletModal}
          onPreviewConnect={connectHeaderPreviewWallet}
          onReviewIdentityChange={changeStageReviewIdentity}
          options={walletOptions}
          selectedReviewIdentity={selectedStageReviewIdentity}
          stageReviewMode={stageReviewMode}
          walletSessionBridgeState={headerWalletSessionBridgeState}
        />
      ) : null}
    </>
  );
};
