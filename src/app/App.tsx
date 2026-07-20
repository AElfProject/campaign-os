import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles.css";
import {
  createAdminDurableReviewApiBridge,
  type AdminDurableReviewApiBridge,
} from "../api/adminDurableReviewApiBridge";
import {
  createLiveWalletAuthenticationApiBridge,
  extractCanonicalWalletAuthenticationNonce,
  type LiveWalletAuthenticationApiBridge,
  type LiveWalletAuthenticationFailure,
  type LiveWalletAuthenticationMode,
} from "../api/liveWalletAuthenticationApiBridge";
import {
  createParticipantJourneyApiBridge,
  type ParticipantJourneyApiBridge,
  type ParticipantJourneyDurableSession,
  type ParticipantJourneyFailure,
  type ParticipantJourneyMode,
} from "../api/participantJourneyApiBridge";
import type { ProjectOwnerCampaignApiBridge } from "../api/projectOwnerCampaignApiBridge";
import {
  createTaskTemplateCatalogApiBridge,
  type TaskTemplateCatalogApiBridge,
} from "../api/taskTemplateCatalogApiBridge";
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
  createParticipantAuthenticationWorkflowState,
  participantAuthenticationWorkflowReducer,
  selectParticipantAuthenticationAction,
  type ParticipantAuthenticationEffectCommand,
  type ParticipantAuthenticationFailure,
  type ParticipantAuthenticationWorkflowEvent,
  type ParticipantAuthenticationWorkflowState,
} from "../components/panels/user-app/participantJourneyWorkflow";
import {
  normalizeStageReviewIdentity,
  WalletConnectModal,
  type LiveWalletModalAuthentication,
  type StageReviewIdentity,
} from "../components/wallet/WalletConnectModal";
import {
  truncateLiveWalletAddress,
  type LiveWalletAuthenticationStatusName,
  type LiveWalletAuthenticationViewState,
} from "../components/wallet/LiveWalletAuthenticationStatus";
import type { LiveWalletOption } from "../components/wallet/WalletOptionCards";
import {
  WalletClientError,
  type WalletClient,
  type WalletClientAdapterAvailability,
  type WalletClientEvent,
  type WalletClientProof,
} from "../wallet/walletClient";
import {
  createDefaultAelfWebLoginBrowserWalletClient,
  type AelfWebLoginBrowserSafeEnv,
} from "../wallet/aelfWebLoginWalletClient";

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
const isTaskTemplateCatalogEnabled = () =>
  import.meta.env.VITE_CAMPAIGN_OS_TASK_TEMPLATE_CATALOG_ENABLED === "1";

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

type ActiveLiveWalletAuthenticationMode = Extract<
  LiveWalletAuthenticationMode,
  "live_local_stage" | "live_production"
>;

interface ReadyLiveWalletAppComposition {
  readonly bridge: LiveWalletAuthenticationApiBridge;
  readonly client: WalletClient;
  readonly mode: ActiveLiveWalletAuthenticationMode;
  readonly options: readonly LiveWalletOption[];
  readonly status: "ready";
}

interface UnavailableLiveWalletAppComposition {
  readonly mode: ActiveLiveWalletAuthenticationMode;
  readonly options: readonly [];
  readonly status: "unavailable";
}

export type LiveWalletAppComposition =
  | ReadyLiveWalletAppComposition
  | UnavailableLiveWalletAppComposition;

export interface LiveWalletAppBrowserEnv extends AelfWebLoginBrowserSafeEnv {
  readonly VITE_CAMPAIGN_OS_API_BASE_URL?: string;
  readonly VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED?: string;
}

export interface CreateDefaultLiveWalletAppCompositionOptions {
  readonly browserGlobal?: unknown;
  readonly env: LiveWalletAppBrowserEnv;
}

export const createDefaultLiveWalletAppComposition = ({
  browserGlobal = globalThis,
  env,
}: CreateDefaultLiveWalletAppCompositionOptions): LiveWalletAppComposition | undefined => {
  const mode: ActiveLiveWalletAuthenticationMode =
    env.VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED === "1"
      ? "live_local_stage"
      : "live_production";
  const wallet = createDefaultAelfWebLoginBrowserWalletClient({
    browserGlobal,
    env,
    runtime: {
      appName: "aelf Campaign OS",
      chainId: "AELF",
      network: mode === "live_local_stage" ? "testnet" : "mainnet",
    },
  });

  if (wallet.status === "disabled") {
    return undefined;
  }

  if (wallet.status !== "ready") {
    return Object.freeze({
      mode,
      options: Object.freeze([]) as readonly [],
      status: "unavailable",
    });
  }

  return Object.freeze({
    bridge: createLiveWalletAuthenticationApiBridge({
      config: {
        baseUrl: env.VITE_CAMPAIGN_OS_API_BASE_URL,
        mode,
        tracePrefix: "participant-wallet-auth",
      },
    }),
    client: wallet.client,
    mode,
    options: wallet.options,
    status: "ready",
  });
};

interface LiveWalletChallengeMaterial {
  readonly challengeId: string;
  readonly message: string;
}

interface LiveWalletAuthenticationController {
  readonly cancelPending: () => void;
  readonly headerLabel: string | null;
  readonly modal: LiveWalletModalAuthentication | undefined;
  readonly reportPrivateFailure: (failure: ParticipantJourneyFailure) => void;
  readonly session: ParticipantJourneyDurableSession | null;
  readonly state: ParticipantAuthenticationWorkflowState;
}

const isReadyLiveWalletComposition = (
  composition: LiveWalletAppComposition | undefined,
): composition is ReadyLiveWalletAppComposition => composition?.status === "ready";

const createUnavailableLiveWalletAuthenticationState = (
): ParticipantAuthenticationWorkflowState => {
  const restoring = participantAuthenticationWorkflowReducer(
    createParticipantAuthenticationWorkflowState(),
    { type: "restore_requested" },
  ).state;

  return participantAuthenticationWorkflowReducer(restoring, {
    failure: {
      code: "WALLET_CLIENT_ADAPTER_UNAVAILABLE",
      httpStatus: null,
      retryAfterMs: null,
      traceId: null,
    },
    outcome: "unavailable",
    sessionEpoch: restoring.sessionEpoch,
    type: "restore_completed",
    walletEpoch: restoring.walletEpoch,
  }).state;
};

const liveStatusByWorkflowStatus = {
  authenticating: "authenticating",
  challengeReady: "challenge_ready",
  connecting: "connecting",
  disconnected: "disconnected",
  expired: "expired",
  failed: "failed",
  loggingOut: "logging_out",
  rateLimited: "failed",
  ready: "ready",
  restoring: "restoring",
  revoked: "revoked",
  rotating: "rotating",
  signing: "signing",
  unavailable: "unavailable",
} as const satisfies Record<
  ParticipantAuthenticationWorkflowState["status"],
  LiveWalletAuthenticationStatusName
>;

const safeLiveAuthenticationIdentifier = (
  value: unknown,
  maximumLength = 160,
): value is string => typeof value === "string"
  && value.length > 0
  && value.length <= maximumLength
  && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value);

const workflowFailureFromBridge = (
  failure: LiveWalletAuthenticationFailure,
): ParticipantAuthenticationFailure => ({
  code: safeLiveAuthenticationIdentifier(failure.code, 128)
    ? failure.code
    : "AUTH_BRIDGE_FAILED",
  httpStatus: failure.httpStatus ?? null,
  retryAfterMs: null,
  traceId: safeLiveAuthenticationIdentifier(failure.traceId, 128)
    ? failure.traceId
    : null,
});

const workflowFailureFromUnknown = (
  error: unknown,
  fallbackCode: string,
): ParticipantAuthenticationFailure => {
  if (error instanceof WalletClientError) {
    return {
      code: error.code,
      httpStatus: null,
      retryAfterMs: null,
      traceId: error.traceId ?? null,
    };
  }

  return {
    code: fallbackCode,
    httpStatus: null,
    retryAfterMs: null,
    traceId: null,
  };
};

const restoreOutcomeFromFailure = (
  failure: LiveWalletAuthenticationFailure,
) => {
  if (failure.httpStatus === 401) {
    return /EXPIRED|TIMEOUT/.test(failure.code) ? "expired" : "disconnected";
  }
  if (failure.httpStatus === 403) {
    return "revoked";
  }
  if (failure.httpStatus === 429) {
    return "rateLimited";
  }
  if (
    failure.httpStatus === 503
    || failure.category === "configuration"
    || failure.category === "network"
    || failure.category === "timeout"
    || failure.category === "unavailable"
  ) {
    return "unavailable";
  }
  return "failed";
};

const mergeLiveWalletAvailability = (
  options: readonly LiveWalletOption[],
  availability: readonly WalletClientAdapterAvailability[],
): readonly LiveWalletOption[] => {
  const availabilityById = new Map(
    availability.map((entry) => [entry.adapterId, entry]),
  );

  return options.map((option) => {
    const runtime = availabilityById.get(option.adapterId);
    return {
      ...option,
      recommended: runtime?.recommended ?? false,
      status: runtime?.status ?? "unavailable",
    };
  });
};

const unavailableLiveWalletOptions = (
  options: readonly LiveWalletOption[],
): readonly LiveWalletOption[] => options.map((option) => ({
  ...option,
  recommended: false,
  status: "unavailable",
}));

const allLiveWalletOptionsUnavailable = (
  options: readonly LiveWalletOption[],
): boolean => options.length > 0
  && options.every(({ status }) => status === "unavailable");

const useLiveWalletAuthentication = (
  composition: LiveWalletAppComposition | undefined,
  onUnavailableRetry?: () => void,
): LiveWalletAuthenticationController => {
  const [state, setState] = useState<ParticipantAuthenticationWorkflowState>(
    () => composition?.status === "unavailable"
      ? createUnavailableLiveWalletAuthenticationState()
      : createParticipantAuthenticationWorkflowState(),
  );
  const [options, setOptions] = useState<readonly LiveWalletOption[]>(
    () => composition?.options ?? [],
  );
  const stateRef = useRef(state);
  const mountedRef = useRef(true);
  const activeControllerRef = useRef<AbortController | null>(null);
  const selectedAdapterIdRef = useRef<string | null>(null);
  const challengeMaterialRef = useRef<LiveWalletChallengeMaterial | null>(null);
  const proofRef = useRef<WalletClientProof | null>(null);
  const walletSubscriptionReadyRef = useRef(false);
  const pendingResourceCloseRef = useRef<{
    cancelled: boolean;
    composition: ReadyLiveWalletAppComposition;
  } | null>(null);
  const executeCommandRef = useRef<(
    command: ParticipantAuthenticationEffectCommand,
  ) => void>();

  stateRef.current = state;

  const abortActiveRequest = useCallback(() => {
    activeControllerRef.current?.abort();
    activeControllerRef.current = null;
  }, []);

  const commit = useCallback((event: ParticipantAuthenticationWorkflowEvent) => {
    const previous = stateRef.current;
    const reduction = participantAuthenticationWorkflowReducer(previous, event);
    if (reduction.writeCount === 0) {
      return reduction;
    }

    if (
      reduction.state.sessionEpoch !== previous.sessionEpoch
      || reduction.state.walletEpoch !== previous.walletEpoch
    ) {
      abortActiveRequest();
      challengeMaterialRef.current = null;
      proofRef.current = null;
    }

    stateRef.current = reduction.state;
    if (mountedRef.current) {
      setState(reduction.state);
    }
    for (const command of reduction.commands) {
      queueMicrotask(() => executeCommandRef.current?.(command));
    }
    return reduction;
  }, [abortActiveRequest]);

  const commandTargetsCurrentEpoch = useCallback((
    command: ParticipantAuthenticationEffectCommand,
  ) => command.sessionEpoch === stateRef.current.sessionEpoch
    && command.walletEpoch === stateRef.current.walletEpoch,
  []);

  const startCommand = useCallback((
    command: ParticipantAuthenticationEffectCommand,
  ): AbortController | null => {
    if (
      !isReadyLiveWalletComposition(composition)
      || !mountedRef.current
      || !walletSubscriptionReadyRef.current
      || !commandTargetsCurrentEpoch(command)
    ) {
      return null;
    }
    abortActiveRequest();
    const controller = new AbortController();
    activeControllerRef.current = controller;
    return controller;
  }, [abortActiveRequest, commandTargetsCurrentEpoch, composition]);

  const finishCommand = useCallback((controller: AbortController) => {
    if (activeControllerRef.current === controller) {
      activeControllerRef.current = null;
    }
  }, []);

  const failCommand = useCallback((
    command: ParticipantAuthenticationEffectCommand,
    controller: AbortController,
    failure: ParticipantAuthenticationFailure,
  ) => {
    finishCommand(controller);
    if (!controller.signal.aborted && mountedRef.current) {
      commit({
        failure,
        operation: command.type === "connect_wallet"
          ? "connect"
          : command.type === "request_challenge"
            ? "challenge"
            : command.type === "sign_challenge"
              ? "sign"
              : command.type === "authenticate_session"
                ? "authenticate"
                : command.type === "restore_session"
                  ? "restore"
                  : command.type === "rotate_session"
                    ? "rotate"
                    : "logout",
        sessionEpoch: command.sessionEpoch,
        type: "operation_failed",
        walletEpoch: command.walletEpoch,
      });
    }
  }, [commit, finishCommand]);

  const executeCommand = useCallback((command: ParticipantAuthenticationEffectCommand) => {
    if (!isReadyLiveWalletComposition(composition)) {
      return;
    }
    const readyComposition = composition;
    const controller = startCommand(command);
    if (!controller) {
      return;
    }
    const epochs = {
      sessionEpoch: command.sessionEpoch,
      walletEpoch: command.walletEpoch,
    };
    const context = { signal: controller.signal };

    void (async () => {
      try {
        if (command.type === "connect_wallet") {
          const adapterId = selectedAdapterIdRef.current;
          if (!adapterId) {
            throw new WalletClientError("WALLET_CLIENT_INPUT_INVALID");
          }
          const wallet = await readyComposition.client.connect(adapterId, controller.signal);
          finishCommand(controller);
          if (!controller.signal.aborted && mountedRef.current) {
            commit({ ...epochs, type: "wallet_connected", wallet });
          }
          return;
        }

        if (command.type === "request_challenge") {
          if (!(["AELF", "tDVV", "tDVW"] as const).includes(
            command.chainId as "AELF" | "tDVV" | "tDVW",
          )) {
            throw new WalletClientError("WALLET_CLIENT_INPUT_INVALID", {
              adapterId: command.adapterId,
            });
          }
          const result = await readyComposition.bridge.issueChallenge({
            adapterId: command.adapterId,
            ...(command.caHashHint === undefined ? {} : { caHash: command.caHashHint }),
            chainId: command.chainId as "AELF" | "tDVV" | "tDVW",
            network: command.network,
            walletAddress: command.walletAddressHint,
          }, context);
          finishCommand(controller);
          if (controller.signal.aborted || !mountedRef.current) {
            return;
          }
          if (!result.ok) {
            commit({
              ...epochs,
              failure: workflowFailureFromBridge(result),
              operation: "challenge",
              type: "operation_failed",
            });
            return;
          }
          challengeMaterialRef.current = {
            challengeId: result.challenge.challengeId,
            message: result.challenge.message,
          };
          const challengeReduction = commit({
            ...epochs,
            challenge: {
              challengeId: result.challenge.challengeId,
              expiresAt: result.challenge.expiresAt,
            },
            type: "challenge_succeeded",
          });
          if (challengeReduction.state.status === "challengeReady") {
            commit({ type: "sign_requested" });
          }
          return;
        }

        if (command.type === "sign_challenge") {
          const material = challengeMaterialRef.current;
          if (!material || material.challengeId !== command.challengeId) {
            throw new WalletClientError("WALLET_CLIENT_INPUT_INVALID");
          }
          const proof = await readyComposition.client.signMessage({
            exactMessageBytes: new TextEncoder().encode(material.message),
            signal: controller.signal,
          });
          finishCommand(controller);
          if (!controller.signal.aborted && mountedRef.current) {
            proofRef.current = proof;
            commit({ ...epochs, type: "sign_succeeded" });
          }
          return;
        }

        if (command.type === "authenticate_session") {
          const material = challengeMaterialRef.current;
          const proof = proofRef.current;
          if (!material || material.challengeId !== command.challengeId || !proof) {
            throw new WalletClientError("WALLET_CLIENT_INPUT_INVALID");
          }
          const nonceResult = extractCanonicalWalletAuthenticationNonce(material.message);
          if (!nonceResult.ok) {
            failCommand(command, controller, {
              code: nonceResult.code,
              httpStatus: null,
              retryAfterMs: null,
              traceId: null,
            });
            return;
          }
          const result = await readyComposition.bridge.issueSession({
            ...(proof.adapterProof === undefined ? {} : { adapterProof: proof.adapterProof }),
            challengeId: material.challengeId,
            message: material.message,
            nonce: nonceResult.nonce,
            ...(proof.publicKey === undefined ? {} : { publicKey: proof.publicKey }),
            signature: proof.signature,
          }, context);
          finishCommand(controller);
          if (controller.signal.aborted || !mountedRef.current) {
            return;
          }
          if (result.ok) {
            challengeMaterialRef.current = null;
            proofRef.current = null;
            commit({ ...epochs, participant: result.session, type: "authenticate_succeeded" });
          } else {
            commit({
              ...epochs,
              failure: workflowFailureFromBridge(result),
              operation: "authenticate",
              type: "operation_failed",
            });
          }
          return;
        }

        if (command.type === "restore_session") {
          const result = await readyComposition.bridge.getCurrentSession(context);
          finishCommand(controller);
          if (controller.signal.aborted || !mountedRef.current) {
            return;
          }
          commit(result.ok
            ? {
                ...epochs,
                outcome: "ready",
                participant: result.session,
                type: "restore_completed",
              }
            : {
                ...epochs,
                failure: workflowFailureFromBridge(result),
                outcome: restoreOutcomeFromFailure(result),
                type: "restore_completed",
              });
          return;
        }

        if (command.type === "rotate_session") {
          const result = await readyComposition.bridge.rotateSession(context);
          finishCommand(controller);
          if (controller.signal.aborted || !mountedRef.current) {
            return;
          }
          if (result.ok) {
            commit({ ...epochs, participant: result.session, type: "rotation_succeeded" });
          } else {
            commit({
              ...epochs,
              failure: workflowFailureFromBridge(result),
              operation: "rotate",
              type: "operation_failed",
            });
          }
          return;
        }

        const result = await readyComposition.bridge.logout(context);
        try {
          await readyComposition.client.disconnect();
        } catch {
          // Server logout remains authoritative; local wallet cleanup is best effort.
        }
        finishCommand(controller);
        if (!controller.signal.aborted && mountedRef.current) {
          commit(result.ok
            ? { ...epochs, failure: null, ok: true, type: "logout_completed" }
            : {
                ...epochs,
                failure: workflowFailureFromBridge(result),
                ok: false,
                type: "logout_completed",
              });
        }
      } catch (error) {
        failCommand(
          command,
          controller,
          workflowFailureFromUnknown(error, "AUTH_WALLET_OPERATION_FAILED"),
        );
      }
    })();
  }, [commit, composition, failCommand, finishCommand, startCommand]);

  executeCommandRef.current = executeCommand;

  const invalidateWalletContext = useCallback((event: WalletClientEvent) => {
    if (!isReadyLiveWalletComposition(composition) || !mountedRef.current) {
      return;
    }
    const readyComposition = composition;
    selectedAdapterIdRef.current = null;
    const reason = event.type === "account_changed"
      ? "account_changed"
      : event.type === "chain_changed"
        ? "chain_changed"
        : "provider_disconnected";
    commit({ reason, type: "wallet_context_changed" });

    const cleanupController = new AbortController();
    activeControllerRef.current = cleanupController;
    void readyComposition.bridge.logout({ signal: cleanupController.signal }).finally(() => {
      if (activeControllerRef.current === cleanupController) {
        activeControllerRef.current = null;
      }
    });
    readyComposition.bridge.clearLocalSession();
    void readyComposition.client.disconnect().catch(() => undefined);
  }, [commit, composition]);

  useEffect(() => {
    mountedRef.current = true;
    walletSubscriptionReadyRef.current = false;
    if (!composition) {
      const disconnected = createParticipantAuthenticationWorkflowState();
      stateRef.current = disconnected;
      setState(disconnected);
      setOptions([]);
      return () => {
        mountedRef.current = false;
        abortActiveRequest();
      };
    }

    if (!isReadyLiveWalletComposition(composition)) {
      const unavailable = createUnavailableLiveWalletAuthenticationState();
      stateRef.current = unavailable;
      setState(unavailable);
      setOptions([]);
      return () => {
        mountedRef.current = false;
        abortActiveRequest();
      };
    }

    const readyComposition = composition;
    let effectActive = true;
    const pendingClose = pendingResourceCloseRef.current;
    if (pendingClose?.composition === readyComposition) {
      pendingClose.cancelled = true;
      pendingResourceCloseRef.current = null;
    }

    stateRef.current = createParticipantAuthenticationWorkflowState();
    setState(stateRef.current);
    setOptions(readyComposition.options);
    let unsubscribe: () => void = () => undefined;
    try {
      unsubscribe = readyComposition.client.subscribeAccountAndChain(invalidateWalletContext);
      walletSubscriptionReadyRef.current = true;
    } catch {
      const unavailable = createUnavailableLiveWalletAuthenticationState();
      stateRef.current = unavailable;
      setState(unavailable);
      setOptions(unavailableLiveWalletOptions(readyComposition.options));
    }
    if (walletSubscriptionReadyRef.current) {
      void readyComposition.client.listAvailableWallets().then((availability) => {
        if (effectActive && mountedRef.current) {
          setOptions(mergeLiveWalletAvailability(readyComposition.options, availability));
        }
      }).catch(() => {
        if (effectActive && mountedRef.current) {
          setOptions(unavailableLiveWalletOptions(readyComposition.options));
        }
      });
      commit({ type: "restore_requested" });
    }

    return () => {
      effectActive = false;
      mountedRef.current = false;
      walletSubscriptionReadyRef.current = false;
      abortActiveRequest();
      unsubscribe();
      const resourceClose = {
        cancelled: false,
        composition: readyComposition,
      };
      pendingResourceCloseRef.current = resourceClose;
      queueMicrotask(() => {
        if (resourceClose.cancelled) {
          return;
        }
        if (pendingResourceCloseRef.current === resourceClose) {
          pendingResourceCloseRef.current = null;
        }
        void readyComposition.client.close().catch(() => undefined);
        readyComposition.bridge.close();
      });
    };
  }, [abortActiveRequest, commit, composition, invalidateWalletContext]);

  const connect = useCallback((adapterId: string) => {
    if (!isReadyLiveWalletComposition(composition)) {
      return;
    }
    const option = options.find((candidate) => candidate.adapterId === adapterId);
    if (!option || option.status !== "available") {
      return;
    }
    selectedAdapterIdRef.current = adapterId;
    commit({ type: "connect_requested" });
  }, [commit, composition, options]);

  const retry = useCallback(() => {
    if (composition?.status === "unavailable") {
      onUnavailableRetry?.();
      const unavailable = createUnavailableLiveWalletAuthenticationState();
      stateRef.current = unavailable;
      if (mountedRef.current) {
        setState(unavailable);
      }
      return;
    }
    if (
      isReadyLiveWalletComposition(composition)
      && !stateRef.current.privateParticipant.session
      && allLiveWalletOptionsUnavailable(options)
    ) {
      selectedAdapterIdRef.current = null;
      onUnavailableRetry?.();
      const unavailable = createUnavailableLiveWalletAuthenticationState();
      stateRef.current = unavailable;
      if (mountedRef.current) {
        setState(unavailable);
      }
      return;
    }
    if (
      isReadyLiveWalletComposition(composition)
      && !walletSubscriptionReadyRef.current
    ) {
      onUnavailableRetry?.();
      const unavailable = createUnavailableLiveWalletAuthenticationState();
      stateRef.current = unavailable;
      if (mountedRef.current) {
        setState(unavailable);
      }
      return;
    }
    const action = selectParticipantAuthenticationAction(stateRef.current);
    if (action === "connect" && selectedAdapterIdRef.current === null) {
      commit({ reason: "role_changed", type: "scope_invalidated" });
      if (composition?.status === "ready") {
        composition.bridge.clearLocalSession();
      }
      return;
    }
    commit(action === "connect"
      ? { type: "connect_requested" }
      : action === "restore"
        ? { type: "restore_requested" }
        : action === "sign"
          ? { type: "sign_requested" }
          : { type: "retry_requested" });
  }, [commit, composition, onUnavailableRetry, options]);

  const logout = useCallback(() => {
    commit({ type: "logout_requested" });
  }, [commit]);

  const rotate = useCallback(() => {
    commit({ type: "rotation_requested" });
  }, [commit]);

  const cancelPending = useCallback(() => {
    if (!isReadyLiveWalletComposition(composition) || stateRef.current.status === "ready") {
      return;
    }
    selectedAdapterIdRef.current = null;
    commit({ reason: "role_changed", type: "scope_invalidated" });
    composition.bridge.clearLocalSession();
    void composition.client.disconnect().catch(() => undefined);
  }, [commit, composition]);

  const reportPrivateFailure = useCallback((failure: ParticipantJourneyFailure) => {
    if (
      !isReadyLiveWalletComposition(composition)
      || !stateRef.current.privateParticipant.session
    ) {
      return;
    }
    const current = stateRef.current;
    commit({
      failure: {
        code: safeLiveAuthenticationIdentifier(failure.code, 128)
          ? failure.code
          : "AUTH_PRIVATE_REQUEST_FAILED",
        httpStatus: failure.httpStatus ?? null,
        retryAfterMs: null,
        traceId: safeLiveAuthenticationIdentifier(failure.traceId, 128)
          ? failure.traceId
          : null,
      },
      sessionEpoch: current.sessionEpoch,
      type: "private_request_failed",
      walletEpoch: current.walletEpoch,
    });
    if (failure.httpStatus === 401 || failure.httpStatus === 403) {
      composition.bridge.clearLocalSession();
    }
  }, [commit, composition]);

  const session = state.privateParticipant.session;
  const registryUnavailable = !session && allLiveWalletOptionsUnavailable(options);
  const viewState: LiveWalletAuthenticationViewState = {
    ...(state.privateParticipant.wallet?.adapterId
      ? { activeAdapterId: state.privateParticipant.wallet.adapterId }
      : selectedAdapterIdRef.current
        ? { activeAdapterId: selectedAdapterIdRef.current }
        : {}),
    ...(state.failure
      ? {
          diagnostic: {
            code: state.failure.code,
            ...(state.failure.traceId ? { traceId: state.failure.traceId } : {}),
          },
        }
      : {}),
    status: registryUnavailable ? "unavailable" : liveStatusByWorkflowStatus[state.status],
    ...(session && (session.accountType === "AA" || session.accountType === "EOA")
      ? {
          wallet: {
            accountType: session.accountType,
            address: session.walletAddress,
            label: "Live wallet session",
          },
        }
      : {}),
  };
  const modal = composition
    ? {
        onConnect: connect,
        onLogout: logout,
        onRetry: retry,
        onRotate: rotate,
        options,
        state: viewState,
      }
    : undefined;
  const headerLabel = session
    ? `Verified ${session.accountType} · ${truncateLiveWalletAddress(session.walletAddress)}`
    : null;

  return {
    cancelPending,
    headerLabel,
    modal,
    reportPrivateFailure,
    session,
    state,
  };
};

export interface AppProps {
  adminDurableReviewBridge?: AdminDurableReviewApiBridge;
  liveWalletAuthentication?: LiveWalletAppComposition;
  ownerCampaignBridge?: ProjectOwnerCampaignApiBridge;
  participantJourneyBridge?: ParticipantJourneyApiBridge;
  taskTemplateCatalogBridge?: TaskTemplateCatalogApiBridge;
}

export const App = ({
  adminDurableReviewBridge,
  liveWalletAuthentication,
  ownerCampaignBridge,
  participantJourneyBridge,
  taskTemplateCatalogBridge,
}: AppProps = {}) => {
  const [defaultLiveWalletRetryEpoch, setDefaultLiveWalletRetryEpoch] = useState(0);
  const defaultLiveWalletAuthentication = useMemo(
    () => liveWalletAuthentication ?? createDefaultLiveWalletAppComposition({
      env: {
        VITE_CAMPAIGN_OS_API_BASE_URL: import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL,
        VITE_CAMPAIGN_OS_LIVE_WALLET_AUTH_ENABLED:
          import.meta.env.VITE_CAMPAIGN_OS_LIVE_WALLET_AUTH_ENABLED,
        VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED:
          import.meta.env.VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED,
        VITE_CAMPAIGN_OS_WALLET_ADAPTERS_JSON:
          import.meta.env.VITE_CAMPAIGN_OS_WALLET_ADAPTERS_JSON,
      },
    }),
    [defaultLiveWalletRetryEpoch, liveWalletAuthentication],
  );
  const retryDefaultLiveWalletComposition = useCallback(() => {
    if (liveWalletAuthentication !== undefined) {
      return;
    }
    setDefaultLiveWalletRetryEpoch((epoch) =>
      epoch < Number.MAX_SAFE_INTEGER ? epoch + 1 : 0);
  }, [liveWalletAuthentication]);
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
  const activeSurfaceRef = useRef<SurfaceKey>("project");
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
  const [participantLifecycleEpoch, setParticipantLifecycleEpoch] = useState(0);
  const liveWalletController = useLiveWalletAuthentication(
    defaultLiveWalletAuthentication,
    retryDefaultLiveWalletComposition,
  );
  const liveWalletMode = defaultLiveWalletAuthentication !== undefined;
  const activeHeaderWalletRequestId = useRef(0);
  const latestHeaderWalletProofEvaluatedAt = useRef(0);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [activeCampaignSessionKey, setActiveCampaignSessionKey] = useState<string | null>(null);
  const apiBaseUrl = walletSessionApiBaseUrl();
  const taskTemplateCatalogMode = isTaskTemplateCatalogEnabled()
    ? "configured" as const
    : "disabled_demo" as const;
  const resolvedTaskTemplateCatalogBridge = useMemo(
    () => taskTemplateCatalogMode === "configured"
      ? taskTemplateCatalogBridge ?? createTaskTemplateCatalogApiBridge({
        config: {
          baseUrl: apiBaseUrl,
          tracePrefix: "project-console-task-template-catalog",
        },
      })
      : undefined,
    [apiBaseUrl, taskTemplateCatalogBridge, taskTemplateCatalogMode],
  );
  const pendingTaskTemplateCatalogCloseRef = useRef<{
    bridge: TaskTemplateCatalogApiBridge;
    cancelled: boolean;
  } | null>(null);
  const participantJourneyMode: ParticipantJourneyMode = liveWalletMode
    || stageReviewMode
    || apiBaseUrl?.trim()
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
  const ownerSessionReady = !liveWalletMode && issuedOwnerSessionReady && (
    !stageReviewMode
    || (connectedStageReviewIdentity === "owner" && connectedStageSessionReady)
  );
  const participantSessionReady = liveWalletMode
    ? liveWalletController.session !== null
    : issuedParticipantSessionReady && (
        !stageReviewMode
        || (
          (connectedStageReviewIdentity === "participant-a"
            || connectedStageReviewIdentity === "participant-b")
          && connectedStageSessionReady
        )
      );
  const adminSessionReady = !liveWalletMode && issuedOwnerSessionReady && (
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

  useEffect(() => {
    const retainedBridge = resolvedTaskTemplateCatalogBridge ?? taskTemplateCatalogBridge;
    const pendingClose = pendingTaskTemplateCatalogCloseRef.current;
    if (pendingClose && pendingClose.bridge === retainedBridge) {
      pendingClose.cancelled = true;
      pendingTaskTemplateCatalogCloseRef.current = null;
    }

    if (!resolvedTaskTemplateCatalogBridge || taskTemplateCatalogBridge) {
      return undefined;
    }
    const ownedBridge = resolvedTaskTemplateCatalogBridge;

    return () => {
      const resourceClose = { bridge: ownedBridge, cancelled: false };
      pendingTaskTemplateCatalogCloseRef.current = resourceClose;
      queueMicrotask(() => {
        if (resourceClose.cancelled) {
          return;
        }
        if (pendingTaskTemplateCatalogCloseRef.current === resourceClose) {
          pendingTaskTemplateCatalogCloseRef.current = null;
        }
        ownedBridge.close();
      });
    };
  }, [resolvedTaskTemplateCatalogBridge, taskTemplateCatalogBridge]);

  useEffect(() => () => {
    activeHeaderWalletRequestId.current += 1;
  }, []);

  const advanceParticipantLifecycle = useCallback(() => {
    setParticipantLifecycleEpoch((epoch) => epoch + 1);
  }, []);

  useEffect(() => {
    if (liveWalletMode) {
      advanceParticipantLifecycle();
    }
  }, [
    advanceParticipantLifecycle,
    liveWalletController.state.sessionEpoch,
    liveWalletController.state.walletEpoch,
    liveWalletMode,
  ]);

  useEffect(() => {
    if (liveWalletController.session) {
      setHeaderWalletModalOpen(false);
    }
  }, [liveWalletController.session]);

  const changeActiveSurface = useCallback((nextSurface: SurfaceKey) => {
    if (activeSurfaceRef.current === nextSurface) {
      return;
    }

    activeSurfaceRef.current = nextSurface;
    if (nextSurface === "user") {
      advanceParticipantLifecycle();
    }
    setActiveSurface(nextSurface);
  }, [advanceParticipantLifecycle]);

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
    changeActiveSurface("project");
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
    if (liveWalletMode) {
      liveWalletController.cancelPending();
      setHeaderWalletModalOpen(false);
      return;
    }
    activeHeaderWalletRequestId.current += 1;
    setHeaderWalletSessionBridgeState((state) => state.loading
      ? createWalletSessionApiSeededFallbackState(
          stageReviewFixtureRequests[stageReviewMode ? selectedStageReviewIdentity : "owner"],
        )
      : state);
    setHeaderWalletModalOpen(false);
  }, [
    liveWalletController,
    liveWalletMode,
    selectedStageReviewIdentity,
    stageReviewMode,
  ]);

  const changeStageReviewIdentity = useCallback((identity: StageReviewIdentity) => {
    if (!stageReviewMode) {
      return;
    }

    const nextIdentity = normalizeStageReviewIdentity(identity);

    if (nextIdentity === selectedStageReviewIdentity) {
      return;
    }

    activeHeaderWalletRequestId.current += 1;
    advanceParticipantLifecycle();
    setSelectedStageReviewIdentity(nextIdentity);
    setConnectedStageReviewIdentity(null);
    setHeaderWalletSession(null);
    setHeaderWalletSessionBridgeState(createWalletSessionApiSeededFallbackState(
      stageReviewFixtureRequests[nextIdentity],
    ));
  }, [advanceParticipantLifecycle, selectedStageReviewIdentity, stageReviewMode]);

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
    advanceParticipantLifecycle();
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
      advanceParticipantLifecycle();
      setHeaderWalletSession(nextState.session);
      if (stageReviewMode) {
        setConnectedStageReviewIdentity(reviewIdentity);
        changeActiveSurface(stageReviewSurfaceByIdentity[reviewIdentity]);
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
        onSurfaceChange={changeActiveSurface}
        onWalletAction={openHeaderWalletModal}
        productNavigation={productNavigation}
        shellTitle={copy.shellTitle}
        surfaces={surfaces}
        walletActionLabel={liveWalletController.headerLabel ?? copy.walletPreviewConnect}
        walletConnectedActionLabel={copy.walletConnectedAction}
        walletSession={liveWalletMode ? null : headerWalletSession}
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
            taskTemplateCatalogBridge={resolvedTaskTemplateCatalogBridge}
            taskTemplateCatalogMode={taskTemplateCatalogMode}
            taskTemplateCatalogSessionKey={ownerSessionKey}
          />
        ) : activeSurface === "user" ? (
          <UserAppPanel
            bridge={resolvedParticipantJourneyBridge}
            liveSession={liveWalletController.session}
            locale={contentLocale}
            mode={participantJourneyMode}
            onAuthenticationFailure={liveWalletController.reportPrivateFailure}
            onReconnect={openHeaderWalletModal}
            participantLifecycleEpoch={participantLifecycleEpoch}
            session={liveWalletMode
              ? null
              : participantSessionReady
                ? headerWalletSession
                : null}
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
          liveAuthentication={liveWalletController.modal}
          locale={walletModalLocale}
          onClose={closeHeaderWalletModal}
          onPreviewConnect={liveWalletMode ? undefined : connectHeaderPreviewWallet}
          onReviewIdentityChange={liveWalletMode ? undefined : changeStageReviewIdentity}
          options={walletOptions}
          selectedReviewIdentity={selectedStageReviewIdentity}
          stageReviewMode={stageReviewMode}
          walletSessionBridgeState={liveWalletMode ? undefined : headerWalletSessionBridgeState}
        />
      ) : null}
    </>
  );
};
