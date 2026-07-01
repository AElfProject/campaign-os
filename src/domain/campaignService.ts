import {
  createAdminOpsReadModel,
  createAdvancedAnalyticsReadiness,
  createAiContentPackWorkbench,
  createCampaignLifecycleOperations,
  createExportArtifact,
  createExportConfirmationReadinessGate,
  createExportPreview,
  createLaunchConsoleCampaignBundles,
  createParticipationReadModel,
  createProviderEvidenceRegistry,
  createProjectCampaignCommandCenter,
  createTranslationManagerReadModel,
  createVerificationPipelineReadinessGate,
  deriveParticipantTaskStates,
  verificationBoundary,
} from "./campaign";
import { createApiSkillContractSurface } from "./apiSkillContracts";
import {
  campaignDetail,
  campaignTasks,
  walletAdapterFixtures,
} from "./fixtures";
import {
  EXPORT_CSV_COLUMNS,
  campaignLifecycleStatuses,
  supportedLocales,
  type AccountType,
  type AdvancedAnalyticsReadinessSurface,
  type AiContentArtifactChannel,
  type ApiSkillApiGroup,
  type ApiSkillContractReadiness,
  type ApiSkillFieldGroup,
  type CampaignShellDetail,
  type CampaignLifecycleOperations,
  type CampaignStatus,
  type ContractMode,
  type ExportConfirmationReadinessGate,
  type ExportArtifact,
  type ExportContractRootMode,
  type ExportCsvColumn,
  type ExportPreviewMode,
  type ExportPreviewRow,
  type LocalizedText,
  type LaunchConsoleCampaignBundleSurface,
  type DimensionSplit,
  type NormalizedWalletSession,
  type ParticipantSnapshot,
  type ProviderEvidenceRegistry,
  type PublishReadiness,
  type SupportedLocale,
  type TaskVerificationStatus,
  type VerificationEvidence,
  type VerificationEvidenceSource,
  type VerificationManualReviewState,
  type VerificationPipelineReadinessGate,
  type VerificationProviderState,
  type VerificationType,
  type WalletAdapterFixture,
  type WalletCapability,
  type WalletCompatibility,
  type WalletNetwork,
  type WalletPolicy,
  type WalletSource,
} from "./types";
import { normalizeWalletSession } from "./wallet";

export type LocalServiceErrorCode =
  | "CAMPAIGN_NOT_FOUND"
  | "TASK_NOT_FOUND"
  | "PARTICIPANT_NOT_FOUND"
  | "WALLET_NOT_FOUND"
  | "WALLET_NOT_VERIFIED"
  | "UNSUPPORTED_LOCALE"
  | "UNSUPPORTED_EXPORT_MODE"
  | "INVALID_REQUEST";

export type LocalServiceReadiness = ApiSkillContractReadiness;

export interface LocalServiceError {
  code: LocalServiceErrorCode;
  field?: string;
  message: LocalizedText;
}

export type LocalServiceResult<T> =
  | {
      ok: true;
      payload: T;
      boundary: LocalizedText;
      error?: never;
    }
  | {
      ok: false;
      error: LocalServiceError;
      boundary: LocalizedText;
      payload?: never;
    };

export interface CreateWalletSessionRequest {
  address?: string;
  adapterName?: string;
  chainId?: string;
  fixtureId?: string;
  network?: WalletNetwork | string;
  signature?: string;
  walletPolicy?: WalletPolicy;
}

export interface CreateCampaignRequest {
  contractMode?: ContractMode;
  defaultLocale?: SupportedLocale;
  endTime: string;
  metadataHash?: string;
  metadataUri?: string;
  ownerAddress: string;
  projectId: string;
  rewardDescription: string;
  rewardDisclaimerHash?: string;
  startTime: string;
  status?: CampaignStatus;
  supportedLocales?: SupportedLocale[];
  walletPolicy?: WalletPolicy;
}

export interface LocalCampaignDraft {
  contractMode: ContractMode;
  defaultLocale: "en-US";
  endTime: string;
  id: string;
  metadataHash?: string;
  metadataUri?: string;
  ownerAddress: string;
  projectId: string;
  publishReadiness: PublishReadiness;
  rewardBoundary: LocalizedText;
  rewardDescription: string;
  rewardDisclaimerHash?: string;
  startTime: string;
  status: CampaignStatus;
  supportedLocales: SupportedLocale[];
  walletPolicy: WalletPolicy;
}

export interface AddTaskRequest {
  campaignId: string;
  evidenceRule: Record<string, string | number | boolean>;
  points: number;
  required: boolean;
  templateCode: string;
  verificationType: VerificationType;
  walletCompatibility: WalletCompatibility;
}

export interface LocalTaskDraft extends AddTaskRequest {
  id: string;
}

export interface VerifyTaskRequest {
  accountType: AccountType;
  campaignId: string;
  taskId: string;
  walletAddress: string;
  walletSource: WalletSource;
}

export interface VerifyTaskResponse {
  accountType: AccountType;
  canonicalEvidenceSource: VerificationEvidenceSource;
  campaignId: string;
  evidence: VerificationEvidence;
  evidenceHash: string;
  evidenceSource: string;
  manualReview: VerificationManualReviewState;
  nextAction: LocalizedText;
  pointsAwarded: number;
  pointsAvailable: number;
  provider: VerificationProviderState;
  riskFlags: string[];
  status: Exclude<TaskVerificationStatus, "ready">;
  taskId: string;
  walletAddress: string;
  walletSource: WalletSource;
}

export interface CheckEligibilityRequest {
  accountType?: AccountType;
  campaignId: string;
  walletAddress: string;
  walletSource?: WalletSource;
}

export interface GetVerificationPipelineReadinessRequest {
  campaignId: string;
}

export interface GetProviderEvidenceRegistryRequest {
  campaignId: string;
}

export interface GetCampaignLifecycleOperationsRequest {
  campaignId: string;
}

export interface GetLaunchConsoleCampaignBundlesRequest {
  campaignId: string;
}

export interface CheckEligibilityResponse {
  accountType: AccountType;
  campaignId: string;
  eligible: boolean;
  localePreference: SupportedLocale;
  missingTasks: string[];
  nextAction: LocalizedText;
  riskFlags: string[];
  score: number;
  status: "eligible" | "not_eligible" | "pending" | "risk_flagged" | "ended";
  walletAddress: string;
  walletSource: WalletSource;
  walletTypeVerified: boolean;
}

export interface GenerateI18nDraftRequest {
  campaignId: string;
  contentKeys: string[];
  sourceLocale: SupportedLocale;
  targetLocale: SupportedLocale;
}

export interface GenerateI18nDraftResponse {
  aiDraft: boolean;
  contentKeys: string[];
  draft: Record<string, string>;
  fallbackToEnglish: boolean;
  humanReviewRequired: boolean;
  noAutoPublishNotice: LocalizedText;
  sourceLocale: "en-US";
  targetLocale: Exclude<SupportedLocale, "en-US">;
}

export interface GetCampaignAnalyticsRequest {
  campaignId: string;
}

export interface GetAdvancedAnalyticsReadinessRequest {
  campaignId: string;
}

export interface GenerateCampaignPostsRequest {
  campaignId: string;
  channel: AiContentArtifactChannel;
  sourceLocale: SupportedLocale;
  targetLocales: SupportedLocale[];
}

export interface SummarizeCampaignRequest {
  campaignId: string;
  period: "daily" | "weekly";
}

export interface ExportWinnersRequest {
  campaignId: string;
  contractRootMode: ExportContractRootMode;
  format: ExportPreviewMode;
  includeLocalePreference: boolean;
  includeRiskFlags: boolean;
  includeWalletType: boolean;
}

export interface ExportWinnersResponse {
  artifact: ExportArtifact;
  campaignId: string;
  columns: readonly ExportCsvColumn[];
  confirmation: ReturnType<typeof createExportPreview>["confirmation"];
  disclaimer: string;
  exportReadiness: ExportConfirmationReadinessGate;
  format: ExportPreviewMode;
  rows: ExportPreviewRow[];
  readyRows: number;
  reviewRequiredRows: number;
  blockedRows: number;
  contractRootMode: "none";
}

export interface LocalServiceCoverageSummary {
  blockedCount: number;
  coveredApiGroups: ApiSkillApiGroup[];
  coveredFieldGroups: ApiSkillFieldGroup[];
  localOnlyCount: number;
  readyCount: number;
  reviewRequiredCount: number;
  sampleResponseIds: string[];
  serviceNames: string[];
  totalServices: number;
  verificationBoundary: LocalizedText;
  boundary: LocalizedText;
}

export interface CampaignOsLocalService {
  addTask(request: AddTaskRequest): LocalServiceResult<LocalTaskDraft>;
  checkEligibility(request: CheckEligibilityRequest): LocalServiceResult<CheckEligibilityResponse>;
  createCampaign(request: CreateCampaignRequest): LocalServiceResult<LocalCampaignDraft>;
  createWalletSession(request: CreateWalletSessionRequest): LocalServiceResult<NormalizedWalletSession>;
  exportWinners(request: ExportWinnersRequest): LocalServiceResult<ExportWinnersResponse>;
  generateCampaignPosts(request: GenerateCampaignPostsRequest): LocalServiceResult<{
    artifacts: ReturnType<typeof createAiContentPackWorkbench>["artifacts"];
    boundary: ReturnType<typeof createAiContentPackWorkbench>["boundary"];
    humanReviewRequired: boolean;
    noAutoPublishNotice: LocalizedText;
  }>;
  generateI18nDraft(request: GenerateI18nDraftRequest): LocalServiceResult<GenerateI18nDraftResponse>;
  getCampaignAnalytics(request: GetCampaignAnalyticsRequest): LocalServiceResult<
    ReturnType<typeof createProjectCampaignCommandCenter>["analyticsExport"]
  >;
  getAdvancedAnalyticsReadiness(
    request: GetAdvancedAnalyticsReadinessRequest,
  ): LocalServiceResult<AdvancedAnalyticsReadinessSurface>;
  getVerificationPipelineReadiness(
    request: GetVerificationPipelineReadinessRequest,
  ): LocalServiceResult<VerificationPipelineReadinessGate>;
  getProviderEvidenceRegistry(
    request: GetProviderEvidenceRegistryRequest,
  ): LocalServiceResult<ProviderEvidenceRegistry>;
  getExportConfirmationReadiness(
    request: GetCampaignAnalyticsRequest,
  ): LocalServiceResult<ExportConfirmationReadinessGate>;
  getCampaignLifecycleOperations(
    request: GetCampaignLifecycleOperationsRequest,
  ): LocalServiceResult<CampaignLifecycleOperations>;
  getLaunchConsoleCampaignBundles(
    request: GetLaunchConsoleCampaignBundlesRequest,
  ): LocalServiceResult<LaunchConsoleCampaignBundleSurface>;
  getCoverageSummary(): LocalServiceResult<LocalServiceCoverageSummary>;
  summarizeCampaign(request: SummarizeCampaignRequest): LocalServiceResult<{
    campaignId: string;
    localeMetrics: ReturnType<typeof createProjectCampaignCommandCenter>["analyticsExport"]["localeSplit"];
    period: "daily" | "weekly";
    reportCards: ReturnType<typeof createAdminOpsReadModel>["aiReports"];
    riskSummary: ReturnType<typeof createAdminOpsReadModel>["riskSignals"];
    walletTypeMetrics: ReturnType<typeof createProjectCampaignCommandCenter>["analyticsExport"]["walletSplit"];
  }>;
  verifyTask(request: VerifyTaskRequest): LocalServiceResult<VerifyTaskResponse>;
}

export const serviceBoundary: LocalizedText = {
  "en-US":
    "No live API, wallet SDK, provider, secret storage, storage-backed export file, reward distribution, contract call, or contract root write is executed. No live analytics SDK, event warehouse, or billing is executed. Responses are seeded/local read models only, including local export artifacts and advanced analytics readiness.",
  "zh-CN":
    "不会调用实时 API、analytics SDK、事件仓库、billing、钱包 SDK、provider、secret 存储、storage-backed 导出文件、奖励发放、合约调用或合约 root 写入。响应仅来自 seeded/本地 read model，包括本地导出 artifact 与高级分析准备度。",
  "zh-TW":
    "No live API, wallet SDK, provider, secret storage, storage-backed export file, reward distribution, contract call, or contract root write is executed. No live analytics SDK, event warehouse, or billing is executed. Responses are seeded/local read models only, including local export artifacts and advanced analytics readiness.",
};

const rewardBoundary: LocalizedText = {
  "en-US": "Rewards are provided by the campaign project. Export winners does not distribute rewards.",
  "zh-CN": "奖励由活动项目方提供。导出 winners 不等于发奖。",
  "zh-TW": "Rewards are provided by the campaign project. Export winners does not distribute rewards.",
};

const noAutoPublishNotice: LocalizedText = {
  "en-US": "AI generated translation cannot auto-publish before human review.",
  "zh-CN": "AI 生成翻译必须经过人工审核后才能发布。",
  "zh-TW": "AI generated translation cannot auto-publish before human review.",
};

const success = <T>(payload: T): LocalServiceResult<T> => ({
  ok: true,
  payload,
  boundary: serviceBoundary,
});

const failure = <T>(
  code: LocalServiceErrorCode,
  field: string,
  enUS: string,
  zhCN: string,
): LocalServiceResult<T> => ({
  ok: false,
  error: {
    code,
    field,
    message: {
      "en-US": enUS,
      "zh-CN": zhCN,
      "zh-TW": enUS,
    },
  },
  boundary: serviceBoundary,
});

const isSupportedServiceLocale = (locale: string): locale is SupportedLocale =>
  supportedLocales.includes(locale as SupportedLocale);

const hasOnlySupportedLocales = (locales: readonly string[]) =>
  locales.length === supportedLocales.length &&
  supportedLocales.every((locale) => locales.includes(locale));

const isSupportedCampaignStatus = (status: string): status is CampaignStatus =>
  campaignLifecycleStatuses.includes(status as CampaignStatus);

const parseCampaignTimestamp = (value: string): number | undefined => {
  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : undefined;
};

const isSupportedDraftTargetLocale = (
  locale: SupportedLocale,
): locale is Exclude<SupportedLocale, "en-US"> => locale !== "en-US" && isSupportedServiceLocale(locale);

const findCampaign = (campaignId: string): CampaignShellDetail | undefined =>
  campaignDetail.id === campaignId ? campaignDetail : undefined;

const findParticipant = (
  campaign: CampaignShellDetail,
  walletAddress: string,
): ParticipantSnapshot | undefined =>
  campaign.participants.find((participant) => participant.walletAddress === walletAddress);

const requiredMissingTemplateCodes = (
  campaign: CampaignShellDetail,
  missingTaskIds: string[],
) =>
  missingTaskIds.map(
    (taskId) =>
      campaign.tasks.find((task) => task.id === taskId)?.templateCode ?? taskId,
  );

const validateEligibilityWalletProvenance = (
  request: CheckEligibilityRequest,
  participant: ParticipantSnapshot,
): LocalServiceResult<CheckEligibilityResponse> | undefined => {
  const hasAccountType = request.accountType !== undefined;
  const hasWalletSource = request.walletSource !== undefined;

  if (!hasAccountType && !hasWalletSource) {
    return undefined;
  }

  if (
    !hasAccountType ||
    !hasWalletSource ||
    request.accountType !== participant.accountType ||
    request.walletSource !== participant.walletSource
  ) {
    return failure(
      "INVALID_REQUEST",
      "walletProvenance",
      "Eligibility wallet provenance requires accountType and walletSource to be supplied together and match the local participant wallet metadata.",
      "资格检查的钱包来源信息要求 accountType 与 walletSource 同时提供，并且必须匹配本地参与者钱包元数据。",
    );
  }

  return undefined;
};

const validateTaskWalletProvenance = (
  request: VerifyTaskRequest,
  participant: ParticipantSnapshot,
): LocalServiceResult<VerifyTaskResponse> | undefined => {
  if (
    request.accountType !== participant.accountType ||
    request.walletSource !== participant.walletSource
  ) {
    return failure(
      "INVALID_REQUEST",
      "walletProvenance",
      "Task verification wallet provenance must match the local participant wallet metadata before evidence or points can be returned.",
      "任务验证的钱包来源信息必须匹配本地参与者钱包元数据，才能返回 evidence 或积分结果。",
    );
  }

  return undefined;
};

const toVerificationStatus = (
  status: TaskVerificationStatus,
): Exclude<TaskVerificationStatus, "ready"> => (status === "ready" ? "pending" : status);

const completeLocaleSplit = (
  split: readonly DimensionSplit[],
  locales: readonly SupportedLocale[],
): DimensionSplit[] => {
  const splitByLabel = new Map(split.map((row) => [row.label, row]));

  return locales.map((locale) => splitByLabel.get(locale) ?? {
    count: 0,
    id: locale,
    label: locale,
    percentage: 0,
  });
};

interface DirectWalletAdapterMetadata {
  accountType: AccountType;
  audience: WalletAdapterFixture["audience"];
  capabilities: WalletCapability[];
  recommended: boolean;
  walletName: string;
  walletSource: WalletSource;
}

const directWalletAdapters: Record<string, DirectWalletAdapterMetadata> = {
  NightElfWallet: {
    accountType: "EOA",
    audience: "EXISTING_USER",
    capabilities: ["SIGN_MESSAGE", "CONTRACT_VIEW"],
    recommended: false,
    walletName: "NightElf Wallet",
    walletSource: "NIGHTELF",
  },
  PortkeyAAWallet: {
    accountType: "AA",
    audience: "NORMAL_USER",
    capabilities: ["SIGN_MESSAGE", "VIEW_BALANCE", "CONTRACT_VIEW", "EBRIDGE"],
    recommended: true,
    walletName: "Portkey AA Wallet",
    walletSource: "PORTKEY_AA",
  },
  PortkeyDiscoverWallet: {
    accountType: "EOA",
    audience: "EXISTING_USER",
    capabilities: ["SIGN_MESSAGE", "SEND_TRANSACTION", "CONTRACT_VIEW", "EBRIDGE"],
    recommended: false,
    walletName: "Portkey EOA App",
    walletSource: "PORTKEY_EOA_APP",
  },
  PortkeyExtensionWallet: {
    accountType: "EOA",
    audience: "EXISTING_USER",
    capabilities: ["SIGN_MESSAGE", "SEND_TRANSACTION", "CONTRACT_VIEW", "EBRIDGE"],
    recommended: false,
    walletName: "Portkey EOA Extension",
    walletSource: "PORTKEY_EOA_EXTENSION",
  },
};

const hasDirectWalletSessionFields = (request: CreateWalletSessionRequest) =>
  request.address !== undefined ||
  request.chainId !== undefined ||
  request.network !== undefined ||
  request.signature !== undefined;

const toWalletNetwork = (network: CreateWalletSessionRequest["network"]): WalletNetwork => {
  if (network === "mainnet" || network === "testnet") {
    return network;
  }

  return "unknown";
};

const toLocalSessionIdPart = (value: string | undefined, fallback: string) => {
  const normalized = value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return normalized ? normalized.slice(0, 48) : fallback;
};

const createDirectWalletFixture = (
  request: CreateWalletSessionRequest,
): WalletAdapterFixture => {
  const adapterName = request.adapterName?.trim() || "UnsupportedWallet";
  const address = request.address?.trim();
  const metadata = directWalletAdapters[adapterName];
  const hasAddress = Boolean(address);
  const supported = Boolean(metadata);

  return {
    id: `local-direct-${toLocalSessionIdPart(adapterName, "adapter")}-${toLocalSessionIdPart(address, "address")}`,
    adapterName,
    walletName: metadata?.walletName ?? adapterName,
    address: hasAddress ? address : undefined,
    accountType: metadata?.accountType ?? "UNKNOWN",
    walletSource: metadata?.walletSource ?? "OTHER",
    chainId: request.chainId?.trim() || "unknown",
    network: toWalletNetwork(request.network),
    capabilities: metadata ? [...metadata.capabilities] : ["ADDRESS_ONLY"],
    signatureRequired: true,
    signaturePresent: supported && Boolean(request.signature?.trim()),
    supported,
    allowedByCampaignPolicy: supported,
    addressOnly: !hasAddress,
    recommended: metadata?.recommended ?? false,
    audience: metadata?.audience ?? "EXISTING_USER",
  };
};

export const createCampaignOsLocalService = (): CampaignOsLocalService => ({
  createWalletSession: (request) => {
    const requestedFixture = request.fixtureId
      ? walletAdapterFixtures.find((candidate) => candidate.id === request.fixtureId)
      : undefined;
    const fixture = requestedFixture
      ?? (hasDirectWalletSessionFields(request)
        ? createDirectWalletFixture(request)
        : walletAdapterFixtures.find(
          (candidate) => request.adapterName && candidate.adapterName === request.adapterName,
        ));

    if (!fixture) {
      return failure(
        "WALLET_NOT_FOUND",
        "fixtureId",
        "Wallet fixture is not available in the local service facade.",
        "本地 service facade 中不存在该钱包 fixture。",
      );
    }

    return success(normalizeWalletSession(fixture, request.walletPolicy ?? "ANY"));
  },

  createCampaign: (request) => {
    if (!request.ownerAddress.trim()) {
      return failure(
        "INVALID_REQUEST",
        "ownerAddress",
        "Campaign ownerAddress is required before a local campaign draft can be created.",
        "创建本地活动草稿前必须提供活动 ownerAddress。",
      );
    }

    const status = request.status ?? "draft";
    if (!isSupportedCampaignStatus(status)) {
      return failure(
        "INVALID_REQUEST",
        "status",
        "Campaign status must be one of the supported lifecycle statuses.",
        "活动 status 必须属于受支持的 lifecycle 状态集合。",
      );
    }

    const defaultLocale = request.defaultLocale ?? "en-US";
    if (defaultLocale !== "en-US") {
      return failure(
        "UNSUPPORTED_LOCALE",
        "defaultLocale",
        "Only en-US is supported as the default locale in this local runtime.",
        "当前本地运行时仅支持 en-US 作为默认语言。",
      );
    }

    const requestedLocales = request.supportedLocales ?? [...supportedLocales];

    if (!hasOnlySupportedLocales(requestedLocales)) {
      return failure(
        "UNSUPPORTED_LOCALE",
        "supportedLocales",
        "Only the exact MVP locale set en-US, zh-CN, and zh-TW is supported by this local runtime.",
        "当前本地运行时仅支持完整 MVP 语言集合 en-US、zh-CN 与 zh-TW。",
      );
    }

    const startTimestamp = parseCampaignTimestamp(request.startTime);
    const endTimestamp = parseCampaignTimestamp(request.endTime);
    if (startTimestamp === undefined || endTimestamp === undefined || endTimestamp <= startTimestamp) {
      return failure(
        "INVALID_REQUEST",
        "timeWindow",
        "Campaign startTime and endTime must be valid timestamps, and endTime must be later than startTime.",
        "活动 startTime 与 endTime 必须是有效时间戳，并且 endTime 必须晚于 startTime。",
      );
    }

    return success({
      contractMode: request.contractMode ?? "OFF_CHAIN_MVP",
      defaultLocale,
      endTime: request.endTime,
      id: `local-${request.projectId}-campaign`,
      ...(request.metadataHash ? { metadataHash: request.metadataHash } : {}),
      ...(request.metadataUri ? { metadataUri: request.metadataUri } : {}),
      ownerAddress: request.ownerAddress,
      projectId: request.projectId,
      publishReadiness: {
        blockers: [],
        ready: true,
        warnings: [],
      },
      rewardBoundary,
      rewardDescription: request.rewardDescription,
      ...(request.rewardDisclaimerHash ? { rewardDisclaimerHash: request.rewardDisclaimerHash } : {}),
      startTime: request.startTime,
      status,
      supportedLocales: [...supportedLocales],
      walletPolicy: request.walletPolicy ?? "ANY",
    });
  },

  addTask: (request) => {
    if (!findCampaign(request.campaignId)) {
      return failure(
        "CAMPAIGN_NOT_FOUND",
        "campaignId",
        "Campaign is not available in the local service facade.",
        "本地 service facade 中不存在该活动。",
      );
    }

    if (!request.templateCode.trim() || request.points < 0) {
      return failure(
        "INVALID_REQUEST",
        "templateCode",
        "Task template code and non-negative points are required.",
        "任务 template code 与非负积分为必填项。",
      );
    }

    return success({
      ...request,
      id: `local-task-${request.templateCode}`,
    });
  },

  verifyTask: (request) => {
    const campaign = findCampaign(request.campaignId);

    if (!campaign) {
      return failure(
        "CAMPAIGN_NOT_FOUND",
        "campaignId",
        "Campaign is not available in the local service facade.",
        "本地 service facade 中不存在该活动。",
      );
    }

    const task = campaign.tasks.find((candidate) => candidate.id === request.taskId);

    if (!task) {
      return failure(
        "TASK_NOT_FOUND",
        "taskId",
        "Task is not available in the local service facade.",
        "本地 service facade 中不存在该任务。",
      );
    }

    const participant = findParticipant(campaign, request.walletAddress);

    if (!participant) {
      return failure(
        "PARTICIPANT_NOT_FOUND",
        "walletAddress",
        "Participant wallet is not available in the local service facade.",
        "本地 service facade 中不存在该参与钱包。",
      );
    }

    const provenanceFailure = validateTaskWalletProvenance(request, participant);

    if (provenanceFailure) {
      return provenanceFailure;
    }

    const taskState = deriveParticipantTaskStates(campaign.tasks, participant).find(
      (state) => state.taskId === task.id,
    );

    if (!taskState) {
      return failure(
        "TASK_NOT_FOUND",
        "taskId",
        "Task state is not available in the local service facade.",
        "本地 service facade 中不存在该任务状态。",
      );
    }

    return success({
      accountType: participant.accountType,
      canonicalEvidenceSource: taskState.canonicalEvidenceSource,
      campaignId: campaign.id,
      evidence: taskState.evidence,
      evidenceHash: taskState.evidence.evidenceHash,
      evidenceSource: taskState.evidenceSource,
      manualReview: taskState.manualReview,
      nextAction: taskState.nextAction,
      pointsAwarded: taskState.pointsAwarded,
      pointsAvailable: taskState.pointsAvailable,
      provider: taskState.provider,
      riskFlags: taskState.riskFlags,
      status: toVerificationStatus(taskState.status),
      taskId: task.id,
      walletAddress: participant.walletAddress,
      walletSource: participant.walletSource,
    });
  },

  checkEligibility: (request) => {
    const campaign = findCampaign(request.campaignId);

    if (!campaign) {
      return failure(
        "CAMPAIGN_NOT_FOUND",
        "campaignId",
        "Campaign is not available in the local service facade.",
        "本地 service facade 中不存在该活动。",
      );
    }

    const participant = findParticipant(campaign, request.walletAddress);

    if (!participant) {
      return failure(
        "PARTICIPANT_NOT_FOUND",
        "walletAddress",
        "Participant wallet is not available in the local service facade.",
        "本地 service facade 中不存在该参与钱包。",
      );
    }

    const provenanceFailure = validateEligibilityWalletProvenance(request, participant);

    if (provenanceFailure) {
      return provenanceFailure;
    }

    const participation = createParticipationReadModel(campaign, participant);
    const walletStatus = participation.eligibility.walletStatus;

    if (!walletStatus) {
      return failure(
        "WALLET_NOT_FOUND",
        "walletAddress",
        "Wallet session is not available in the local service facade.",
        "本地 service facade 中不存在该钱包会话。",
      );
    }

    return success({
      accountType: participant.accountType,
      campaignId: campaign.id,
      eligible: participation.eligibility.status === "eligible",
      localePreference: participant.localePreference,
      missingTasks:
        walletStatus.missingTasks.length > 0
          ? walletStatus.missingTasks
          : requiredMissingTemplateCodes(campaign, participation.eligibility.missingTaskIds),
      nextAction: participation.eligibility.nextAction,
      riskFlags: participation.eligibility.riskFlags,
      score: participation.eligibility.score,
      status: participation.eligibility.status,
      walletAddress: participant.walletAddress,
      walletSource: participant.walletSource,
      walletTypeVerified: walletStatus.walletTypeVerified,
    });
  },

  generateI18nDraft: (request) => {
    const campaign = findCampaign(request.campaignId);

    if (!campaign) {
      return failure(
        "CAMPAIGN_NOT_FOUND",
        "campaignId",
        "Campaign is not available in the local service facade.",
        "本地 service facade 中不存在该活动。",
      );
    }

    if (
      request.sourceLocale !== "en-US" ||
      !isSupportedDraftTargetLocale(request.targetLocale)
    ) {
      return failure(
        "UNSUPPORTED_LOCALE",
        "targetLocale",
        "Only en-US source and zh-CN or zh-TW target drafts are supported.",
        "当前仅支持 en-US 源文案与 zh-CN 或 zh-TW 目标草稿。",
      );
    }

    const translationManager = createTranslationManagerReadModel(campaign);
    const sourcePanel = translationManager.panels.find((panel) => panel.locale === "en-US");
    const targetPanel = translationManager.panels.find(
      (panel) => panel.locale === request.targetLocale,
    );

    if (!targetPanel) {
      return failure(
        "UNSUPPORTED_LOCALE",
        "targetLocale",
        "Requested target locale is not available in the campaign.",
        "活动中不存在请求的目标语言。",
      );
    }

    const sourceFields: Record<string, string> = {
      description: targetPanel.description || sourcePanel?.description || "",
      rewardDisclaimer: targetPanel.rewardDisclaimer || sourcePanel?.rewardDisclaimer || "",
      socialPost: targetPanel.socialPost || sourcePanel?.socialPost || "",
      title: targetPanel.title || sourcePanel?.title || "",
    };

    return success({
      aiDraft: targetPanel.aiDraft,
      contentKeys: request.contentKeys,
      draft: Object.fromEntries(
        request.contentKeys.map((key) => [key, sourceFields[key] ?? ""]),
      ),
      fallbackToEnglish: targetPanel.fallbackToEnglish,
      humanReviewRequired: !targetPanel.humanReviewed,
      noAutoPublishNotice,
      sourceLocale: "en-US",
      targetLocale: request.targetLocale,
    });
  },

  getCampaignAnalytics: (request) => {
    const campaign = findCampaign(request.campaignId);

    if (!campaign) {
      return failure(
        "CAMPAIGN_NOT_FOUND",
        "campaignId",
        "Campaign is not available in the local service facade.",
        "本地 service facade 中不存在该活动。",
      );
    }

    const analyticsExport = createProjectCampaignCommandCenter(campaign).analyticsExport;

    return success({
      ...analyticsExport,
      localeSplit: completeLocaleSplit(analyticsExport.localeSplit, campaign.supportedLocales),
    });
  },

  getAdvancedAnalyticsReadiness: (request) => {
    const campaign = findCampaign(request.campaignId);

    if (!campaign) {
      return failure(
        "CAMPAIGN_NOT_FOUND",
        "campaignId",
        "Campaign is not available in the local service facade.",
        "本地 service facade 中不存在该活动。",
      );
    }

    return success(createAdvancedAnalyticsReadiness(campaign));
  },

  getVerificationPipelineReadiness: (request) => {
    const campaign = findCampaign(request.campaignId);

    if (!campaign) {
      return failure(
        "CAMPAIGN_NOT_FOUND",
        "campaignId",
        "Campaign is not available in the local service facade.",
        "本地 service facade 中不存在该活动。",
      );
    }

    return success(createVerificationPipelineReadinessGate(campaign));
  },

  getProviderEvidenceRegistry: (request) => {
    const campaign = findCampaign(request.campaignId);

    if (!campaign) {
      return failure(
        "CAMPAIGN_NOT_FOUND",
        "campaignId",
        "Campaign is not available in the local service facade.",
        "本地 service facade 中不存在该活动。",
      );
    }

    return success(createProviderEvidenceRegistry(campaign));
  },

  generateCampaignPosts: (request) => {
    const campaign = findCampaign(request.campaignId);

    if (!campaign) {
      return failure(
        "CAMPAIGN_NOT_FOUND",
        "campaignId",
        "Campaign is not available in the local service facade.",
        "本地 service facade 中不存在该活动。",
      );
    }

    if (
      request.sourceLocale !== "en-US" ||
      request.targetLocales.some((locale) => !isSupportedServiceLocale(locale))
    ) {
      return failure(
        "UNSUPPORTED_LOCALE",
        "targetLocales",
        "Campaign posts support MVP target locales zh-CN and zh-TW only.",
        "活动帖子仅支持 MVP 目标语言 zh-CN 与 zh-TW。",
      );
    }

    const workbench = createAiContentPackWorkbench(campaign);
    const artifacts = workbench.artifacts.filter(
      (artifact) => artifact.channel === request.channel,
    );

    return success({
      artifacts: artifacts.length > 0 ? artifacts : workbench.artifacts,
      boundary: workbench.boundary,
      humanReviewRequired: true,
      noAutoPublishNotice,
    });
  },

  summarizeCampaign: (request) => {
    const campaign = findCampaign(request.campaignId);

    if (!campaign) {
      return failure(
        "CAMPAIGN_NOT_FOUND",
        "campaignId",
        "Campaign is not available in the local service facade.",
        "本地 service facade 中不存在该活动。",
      );
    }

    const commandCenter = createProjectCampaignCommandCenter(campaign);
    const adminOps = createAdminOpsReadModel(campaign);

    return success({
      campaignId: campaign.id,
      localeMetrics: completeLocaleSplit(commandCenter.analyticsExport.localeSplit, campaign.supportedLocales),
      period: request.period,
      reportCards: adminOps.aiReports,
      riskSummary: adminOps.riskSignals,
      walletTypeMetrics: commandCenter.analyticsExport.walletSplit,
    });
  },

  exportWinners: (request) => {
    const campaign = findCampaign(request.campaignId);

    if (!campaign) {
      return failure(
        "CAMPAIGN_NOT_FOUND",
        "campaignId",
        "Campaign is not available in the local service facade.",
        "本地 service facade 中不存在该活动。",
      );
    }

    if (!["csv", "json"].includes(request.format) || request.contractRootMode !== "none") {
      return failure(
        "UNSUPPORTED_EXPORT_MODE",
        !["csv", "json"].includes(request.format) ? "format" : "contractRootMode",
        "Only local CSV or JSON preview with contractRootMode none is supported.",
        "当前仅支持 contractRootMode 为 none 的本地 CSV 或 JSON 预览。",
      );
    }

    if (!request.includeWalletType) {
      return failure(
        "INVALID_REQUEST",
        "includeWalletType",
        "Export artifacts must include wallet type and wallet source for v0.2 review.",
        "v0.2 审核要求导出 artifact 包含钱包类型与钱包来源。",
      );
    }

    if (!request.includeLocalePreference) {
      return failure(
        "INVALID_REQUEST",
        "includeLocalePreference",
        "Export artifacts must include locale preference for v0.2 review.",
        "v0.2 审核要求导出 artifact 包含语言偏好。",
      );
    }

    if (!request.includeRiskFlags) {
      return failure(
        "INVALID_REQUEST",
        "includeRiskFlags",
        "Export artifacts must include risk flags for v0.2 review.",
        "v0.2 审核要求导出 artifact 包含风险标记。",
      );
    }

    const preview = createExportPreview(
      campaign.id,
      campaign.participants,
      campaignTasks,
      campaign.walletSessions,
    );
    const rows = preview.rows;
    const artifact = createExportArtifact(preview, request.format);

    return success({
      artifact,
      blockedRows: rows.filter((row) => row.rowStatus === "blocked").length,
      campaignId: campaign.id,
      columns: EXPORT_CSV_COLUMNS,
      confirmation: preview.confirmation,
      contractRootMode: request.contractRootMode,
      disclaimer: preview.disclaimer,
      exportReadiness: createExportConfirmationReadinessGate(campaign),
      format: request.format,
      readyRows: rows.filter((row) => row.rowStatus === "ready").length,
      reviewRequiredRows: rows.filter((row) => row.rowStatus === "review_required").length,
      rows,
    });
  },

  getExportConfirmationReadiness: (request) => {
    const campaign = findCampaign(request.campaignId);

    if (!campaign) {
      return failure(
        "CAMPAIGN_NOT_FOUND",
        "campaignId",
        "Campaign is not available in the local service facade.",
        "本地 service facade 中不存在该活动。",
      );
    }

    return success(createExportConfirmationReadinessGate(campaign));
  },

  getCampaignLifecycleOperations: (request) => {
    const campaign = findCampaign(request.campaignId);

    if (!campaign) {
      return failure(
        "CAMPAIGN_NOT_FOUND",
        "campaignId",
        "Campaign is not available in the local service facade.",
        "本地 service facade 中不存在该活动。",
      );
    }

    return success(createCampaignLifecycleOperations(campaign));
  },

  getLaunchConsoleCampaignBundles: (request) => {
    const campaign = findCampaign(request.campaignId);

    if (!campaign) {
      return failure(
        "CAMPAIGN_NOT_FOUND",
        "campaignId",
        "Campaign is not available in the local service facade.",
        "本地 service facade 中不存在该活动。",
      );
    }

    return success(createLaunchConsoleCampaignBundles(campaign));
  },

  getCoverageSummary: () => {
    const surface = createApiSkillContractSurface();
    const serviceNames = [
      "createWalletSession",
      "createCampaign",
      "addTask",
      "verifyTask",
      "checkEligibility",
      "generateI18nDraft",
      "getCampaignAnalytics",
      "getAdvancedAnalyticsReadiness",
      "exportWinners",
      "getVerificationPipelineReadiness",
      "getProviderEvidenceRegistry",
      "getExportConfirmationReadiness",
      "getCampaignLifecycleOperations",
      "getLaunchConsoleCampaignBundles",
      "generateCampaignPosts",
      "summarizeCampaign",
    ];
    const coveredApiGroups: ApiSkillApiGroup[] = [
      "wallet_session",
      "campaign_creation",
      "task_generation",
      "task_verification",
      "eligibility",
      "analytics",
      "export",
      "campaign_summary",
      "content_generation",
    ];
    const coveredFieldGroups: ApiSkillFieldGroup[] = [
      "wallet",
      "locale",
      "contract",
      "export",
      "evidence",
      "analytics",
      "campaign",
      "task",
      "content",
      "risk",
    ];

    return success({
      blockedCount: surface.summary.blockedCount,
      coveredApiGroups,
      coveredFieldGroups,
      localOnlyCount: surface.summary.localOnlyCount + 3,
      readyCount: surface.summary.readyCount + 1,
      reviewRequiredCount: surface.summary.reviewRequiredCount + 2,
      sampleResponseIds: [
        "createWalletSession",
        "createCampaign",
        "verifyTask",
        "checkEligibility",
        "getAdvancedAnalyticsReadiness",
        "getVerificationPipelineReadiness",
        "getProviderEvidenceRegistry",
        "getExportConfirmationReadiness",
        "getCampaignLifecycleOperations",
        "getLaunchConsoleCampaignBundles",
        "exportWinners",
      ],
      serviceNames,
      totalServices: serviceNames.length,
      verificationBoundary,
      boundary: serviceBoundary,
    });
  },
});
