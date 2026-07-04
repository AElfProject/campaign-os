import {
  createAdminOpsReadModel,
  createAdvancedAnalyticsReadiness,
  createAiContentPackWorkbench,
  createAntiSybilV2GraphReadiness,
  createCampaignDiscoveryReadModel,
  createCampaignLifecycleOperations,
  createExportArtifact,
  createExportConfirmationReadinessGate,
  createExportFulfillmentReadiness,
  createExportPreview,
  createLaunchConsoleCampaignBundles,
  createParticipationReadModel,
  createProviderEvidenceRegistry,
  createProjectCampaignCommandCenter,
  createTaskVerificationActionResult,
  createTranslationManagerReadModel,
  createVerificationPipelineReadinessGate,
  deriveTaskVerificationAction,
  deriveParticipantTaskStates,
  executeI18nReviewAction,
  verificationBoundary,
} from "./campaign";
import { createApiSkillContractSurface } from "./apiSkillContracts";
import {
  taskTemplateLibrary,
  type TaskTemplate,
} from "./builder";
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
  type AgentWalletActionAllowedOperation,
  type AgentWalletActionAuditTrail,
  type AgentWalletActionHumanApprovalState,
  type AgentWalletActionIntent,
  type AgentWalletActionReadinessRequest,
  type AgentWalletActionReadinessResponse,
  type AgentWalletActionReadinessState,
  type AntiSybilV2GraphReadiness,
  type AiContentArtifactChannel,
  type AiContentArtifactType,
  type ApiSkillApiGroup,
  type ApiSkillContractReadiness,
  type ApiSkillFieldGroup,
  type CampaignDiscoveryConsumerSurface,
  type CampaignDiscoveryDetail,
  type CampaignDiscoveryItem,
  type CampaignDiscoveryReadModel,
  type CampaignShellDetail,
  type CampaignLifecycleOperations,
  type CampaignStatus,
  type ContractMode,
  type ExportConfirmationReadinessGate,
  type ExportArtifact,
  type ExportContractRootMode,
  type ExportCsvColumn,
  type ExportFulfillmentReadiness,
  type ExportPreviewMode,
  type ExportPreviewRow,
  type LocalizedText,
  type I18nReviewAction,
  type I18nReviewActionAuditTrail,
  type I18nReviewActionId,
  type I18nReviewActionResult,
  type LaunchConsoleCampaignBundleSurface,
  type DimensionSplit,
  type NormalizedWalletSession,
  type ParticipantSnapshot,
  type ProviderEvidenceRegistry,
  type PublishReadiness,
  type ReferralRiskTier,
  type ReferralWalletRiskMetric,
  type SupportedLocale,
  type TranslationManagerReadModel,
  type TaskVerificationStatus,
  type TaskVerificationActionKind,
  type TaskVerificationActionProof,
  type TaskVerificationActionRequest,
  type TaskVerificationActionResult,
  type TaskVerificationProofType,
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
  duration: string;
  endTime: string;
  goal: string;
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
  duration: string;
  endTime: string;
  goal: string;
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

export interface ExecuteTaskVerificationActionRequest extends VerifyTaskRequest, TaskVerificationActionRequest {}

export interface ExecuteTaskVerificationActionResponse extends TaskVerificationActionResult {
  accountType: AccountType;
  campaignId: string;
  canonicalEvidenceSource: VerificationEvidenceSource;
  evidenceHash: string;
  evidenceSource: string;
  proof?: TaskVerificationActionProof;
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

export interface GetAntiSybilV2GraphReadinessRequest {
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

export interface ExecuteI18nReviewActionRequest {
  actionId: I18nReviewActionId | (string & {});
  campaignId: string;
  reviewer?: string;
  targetLocale: SupportedLocale | (string & {});
}

export interface ExecuteI18nReviewActionResponse {
  action: I18nReviewAction;
  actions: I18nReviewAction[];
  auditTrail: I18nReviewActionAuditTrail;
  boundary: LocalizedText;
  campaignId: string;
  nextAction: LocalizedText;
  targetLocale: SupportedLocale | (string & {});
  translationManager: TranslationManagerReadModel;
  updatedRevisions: I18nReviewActionResult["updatedRevisions"];
}

export interface GenerateCampaignTasksRequest {
  campaignId: string;
  goal: string;
  product: string;
  targetUsers: string[];
  walletPolicy: WalletPolicy;
}

export type GeneratedCampaignTaskVerificationType = VerificationType | "REFERRAL";

export interface GeneratedCampaignTask {
  campaignId: string;
  evidenceRule: Record<string, string | number | boolean>;
  id: string;
  instructionKey: string;
  points: number;
  required: boolean;
  templateCode: string;
  titleKey: string;
  verificationType: GeneratedCampaignTaskVerificationType;
  walletCompatibility: WalletCompatibility;
}

export interface GeneratedCampaignTaskPointRule {
  points: number;
  required: boolean;
  templateCode: string;
}

export interface GeneratedCampaignTaskWalletCompatibility {
  templateCode: string;
  walletCompatibility: WalletCompatibility;
}

export interface GenerateCampaignTasksResponse {
  boundary: LocalizedText;
  campaignId: string;
  humanReviewRequired: boolean;
  pointRules: GeneratedCampaignTaskPointRule[];
  taskList: GeneratedCampaignTask[];
  walletCompatibility: GeneratedCampaignTaskWalletCompatibility[];
}

export interface ListCampaignsRequest {
  consumerSurface?: CampaignDiscoveryConsumerSurface;
  status?: CampaignStatus;
  walletAddress?: string;
}

export interface GetCampaignDetailRequest extends ListCampaignsRequest {
  campaignId: string;
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
  contentKeys?: GeneratedCampaignPostContentKey[];
  sourceLocale?: SupportedLocale;
  targetLocales?: SupportedLocale[];
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
  exportFulfillmentReadiness: ExportFulfillmentReadiness;
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

interface WalletLocaleMetric {
  id: string;
  label: string;
  walletType: AccountType;
  locale: SupportedLocale;
  count: number;
  percentage: number;
}

export interface CampaignOsLocalService {
  addTask(request: AddTaskRequest): LocalServiceResult<LocalTaskDraft>;
  checkEligibility(request: CheckEligibilityRequest): LocalServiceResult<CheckEligibilityResponse>;
  createCampaign(request: CreateCampaignRequest): LocalServiceResult<LocalCampaignDraft>;
  createWalletSession(request: CreateWalletSessionRequest): LocalServiceResult<NormalizedWalletSession>;
  exportWinners(request: ExportWinnersRequest): LocalServiceResult<ExportWinnersResponse>;
  executeTaskVerificationAction(
    request: ExecuteTaskVerificationActionRequest,
  ): LocalServiceResult<ExecuteTaskVerificationActionResponse>;
  generateCampaignTasks(request: GenerateCampaignTasksRequest): LocalServiceResult<GenerateCampaignTasksResponse>;
  generateCampaignPosts(request: GenerateCampaignPostsRequest): LocalServiceResult<{
    artifacts: ReturnType<typeof createAiContentPackWorkbench>["artifacts"];
    boundary: ReturnType<typeof createAiContentPackWorkbench>["boundary"];
    humanReviewRequired: boolean;
    noAutoPublishNotice: LocalizedText;
  }>;
  generateI18nDraft(request: GenerateI18nDraftRequest): LocalServiceResult<GenerateI18nDraftResponse>;
  executeI18nReviewAction(
    request: ExecuteI18nReviewActionRequest,
  ): LocalServiceResult<ExecuteI18nReviewActionResponse>;
  getCampaignDetail(request: GetCampaignDetailRequest): LocalServiceResult<CampaignDiscoveryDetail>;
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
  getAntiSybilV2GraphReadiness(
    request: GetAntiSybilV2GraphReadinessRequest,
  ): LocalServiceResult<AntiSybilV2GraphReadiness>;
  getCoverageSummary(): LocalServiceResult<LocalServiceCoverageSummary>;
  listCampaigns(request?: ListCampaignsRequest): LocalServiceResult<CampaignDiscoveryReadModel>;
  requestAgentWalletAction(
    request: AgentWalletActionReadinessRequest,
  ): LocalServiceResult<AgentWalletActionReadinessResponse>;
  summarizeCampaign(request: SummarizeCampaignRequest): LocalServiceResult<{
    campaignId: string;
    localeMetrics: ReturnType<typeof createProjectCampaignCommandCenter>["analyticsExport"]["localeSplit"];
    period: "daily" | "weekly";
    reportCards: ReturnType<typeof createAdminOpsReadModel>["aiReports"];
    referralWalletRiskMetrics: ReferralWalletRiskMetric[];
    riskSummary: ReturnType<typeof createAdminOpsReadModel>["riskSignals"];
    walletLocaleMetrics: WalletLocaleMetric[];
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

const generatedCampaignTasksBoundary: LocalizedText = {
  "en-US":
    "No live task generation provider, template registry, wallet SDK, verification provider, storage write, reward distribution, contract call, or publish mutation is executed. Generated tasks are seeded/local Task Template Library projections only.",
  "zh-CN":
    "不会调用实时任务生成 provider、模板 registry、钱包 SDK、验证 provider、storage 写入、奖励发放、合约调用或发布变更。生成任务仅来自 seeded/本地任务模板库投影。",
  "zh-TW":
    "No live task generation provider, template registry, wallet SDK, verification provider, storage write, reward distribution, contract call, or publish mutation is executed. Generated tasks are seeded/local Task Template Library projections only.",
};

const agentWalletActionBoundary: LocalizedText = {
  "en-US":
    "Internal Agent Skill wallet action readiness only. No live API, Agent Skill package execution or import, wallet SDK/provider call, credential handling, signing, transaction send, contract send/write, export file/root write, reward custody, or reward distribution is executed.",
  "zh-CN":
    "仅内部 Agent Skill 钱包动作 readiness。不会执行实时 API、Agent Skill 包执行或导入、钱包 SDK/provider 调用、凭证处理、签名、交易发送、合约发送/写入、导出文件/root 写入、奖励托管或发奖。",
  "zh-TW":
    "Internal Agent Skill wallet action readiness only. No live API, Agent Skill package execution or import, wallet SDK/provider call, credential handling, signing, transaction send, contract send/write, export file/root write, reward custody, or reward distribution is executed.",
};

const agentWalletReviewOnlyReason: LocalizedText = {
  "en-US":
    "This Agent Skill wallet intent is review-only in the local facade; operators can inspect readiness, but execution remains unavailable.",
  "zh-CN": "该 Agent Skill 钱包意图在本地 facade 中仅用于审核；运营方可检查 readiness，但执行能力保持不可用。",
  "zh-TW":
    "This Agent Skill wallet intent is review-only in the local facade; operators can inspect readiness, but execution remains unavailable.",
};

const agentWalletBlockedReason: LocalizedText = {
  "en-US":
    "This Agent Skill wallet intent is blocked because it would require live wallet, contract, export, or reward execution that this local facade must not perform.",
  "zh-CN": "该 Agent Skill 钱包意图已阻断，因为它需要真实钱包、合约、导出或发奖执行，而本地 facade 不允许执行这些动作。",
  "zh-TW":
    "This Agent Skill wallet intent is blocked because it would require live wallet, contract, export, or reward execution that this local facade must not perform.",
};

const agentWalletReviewNextAction: LocalizedText = {
  "en-US":
    "Complete operator review, attach audited evidence, and keep any future execution design in a separate approval path.",
  "zh-CN": "完成 operator review、附上已审计 evidence，并将任何未来执行设计放入单独审批路径。",
  "zh-TW":
    "Complete operator review, attach audited evidence, and keep any future execution design in a separate approval path.",
};

const agentWalletBlockedNextAction: LocalizedText = {
  "en-US":
    "Keep the request blocked until human approval, custody design, audited evidence, and execution runbooks are separately approved.",
  "zh-CN": "保持该请求阻断，直到人工审批、托管设计、已审计 evidence 与执行 runbook 分别获批。",
  "zh-TW":
    "Keep the request blocked until human approval, custody design, audited evidence, and execution runbooks are separately approved.",
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

const toUtcDateKey = (value: string): string | undefined => {
  const timestamp = parseCampaignTimestamp(value.trim());

  return timestamp === undefined ? undefined : new Date(timestamp).toISOString().slice(0, 10);
};

const isDurationCoherentWithWindow = (
  duration: string,
  startTime: string,
  endTime: string,
) => {
  const [durationStart, durationEnd, ...extraParts] = duration.split("/").map((part) => part.trim());

  if (!durationStart || !durationEnd || extraParts.length > 0) {
    return false;
  }

  return (
    toUtcDateKey(durationStart) === toUtcDateKey(startTime) &&
    toUtcDateKey(durationEnd) === toUtcDateKey(endTime)
  );
};

const isSupportedDraftTargetLocale = (
  locale: SupportedLocale,
): locale is Exclude<SupportedLocale, "en-US"> => locale !== "en-US" && isSupportedServiceLocale(locale);

const defaultGeneratedPostTargetLocales: readonly Exclude<SupportedLocale, "en-US">[] = [
  "zh-CN",
  "zh-TW",
  "ja-JP",
  "ko-KR",
  "vi-VN",
  "id-ID",
];

const isSupportedGeneratedPostTargetLocale = (
  locale: SupportedLocale,
): locale is Exclude<SupportedLocale, "en-US"> => isSupportedDraftTargetLocale(locale);

const generatedCampaignPostContentKeys = [
  "title",
  "description",
  "rewardDisclaimer",
  "socialPost",
  "faq",
] as const;

export type GeneratedCampaignPostContentKey = (typeof generatedCampaignPostContentKeys)[number];

const channelCopyContentKeys = new Set<GeneratedCampaignPostContentKey>([
  "title",
  "description",
  "rewardDisclaimer",
  "socialPost",
]);

const isGeneratedCampaignPostContentKey = (
  key: string,
): key is GeneratedCampaignPostContentKey =>
  generatedCampaignPostContentKeys.includes(key as GeneratedCampaignPostContentKey);

const filterGeneratedCampaignPostArtifacts = (
  artifacts: ReturnType<typeof createAiContentPackWorkbench>["artifacts"],
  channel: AiContentArtifactChannel,
  contentKeys?: readonly GeneratedCampaignPostContentKey[],
): ReturnType<typeof createAiContentPackWorkbench>["artifacts"] => {
  if (!contentKeys) {
    const channelArtifacts = artifacts.filter((artifact) => artifact.channel === channel);

    return channelArtifacts.length > 0 ? channelArtifacts : artifacts;
  }

  const selectedChannels = new Set<AiContentArtifactChannel>();
  const selectedTypes = new Set<AiContentArtifactType>();

  for (const key of contentKeys) {
    if (channelCopyContentKeys.has(key)) {
      selectedChannels.add(channel);
    }

    if (key === "faq") {
      selectedTypes.add("faq");
    }
  }

  return artifacts.filter(
    (artifact) => selectedChannels.has(artifact.channel) || selectedTypes.has(artifact.type),
  );
};

const findCampaign = (campaignId: string): CampaignShellDetail | undefined =>
  campaignDetail.id === campaignId ? campaignDetail : undefined;

const reviewOnlyAgentWalletActionIntents = [
  "balance_query",
  "contract_view_review",
  "batch_data_check",
  "qa_smoke_test",
] as const satisfies readonly AgentWalletActionIntent[];

const blockedAgentWalletActionIntents = [
  "private_key_handling",
  "user_delegated_signing",
  "transfer",
  "contract_send",
  "reward_distribution",
  "export_generation",
  "root_write",
] as const satisfies readonly AgentWalletActionIntent[];

const isReviewOnlyAgentWalletActionIntent = (
  intent: string,
): intent is (typeof reviewOnlyAgentWalletActionIntents)[number] =>
  reviewOnlyAgentWalletActionIntents.includes(intent as (typeof reviewOnlyAgentWalletActionIntents)[number]);

const isBlockedAgentWalletActionIntent = (
  intent: string,
): intent is (typeof blockedAgentWalletActionIntents)[number] =>
  blockedAgentWalletActionIntents.includes(intent as (typeof blockedAgentWalletActionIntents)[number]);

const isKnownAgentWalletActionIntent = (intent: string): intent is AgentWalletActionIntent =>
  isReviewOnlyAgentWalletActionIntent(intent) || isBlockedAgentWalletActionIntent(intent);

const isApprovedOrReviewPending = (
  state: AgentWalletActionHumanApprovalState | undefined,
): state is Exclude<AgentWalletActionHumanApprovalState, "not_requested"> =>
  state === "pending_review" || state === "approved" || state === "rejected";

const isSupportedAgentWalletNetwork = (
  chainId: string,
  network: WalletNetwork,
): network is Exclude<WalletNetwork, "unknown"> =>
  chainId.trim() === "AELF" && (network === "mainnet" || network === "testnet");

const createAgentWalletActionReadiness = (
  request: AgentWalletActionReadinessRequest & {
    actionIntent: AgentWalletActionIntent;
    humanApprovalState: Exclude<AgentWalletActionHumanApprovalState, "not_requested">;
    network: Exclude<WalletNetwork, "unknown">;
    walletSource: "AGENT_SKILL";
  },
): AgentWalletActionReadinessResponse => {
  const blocked = isBlockedAgentWalletActionIntent(request.actionIntent);
  const actionState: AgentWalletActionReadinessState = blocked ? "blocked" : "review_required";
  const allowedOperation: AgentWalletActionAllowedOperation = blocked
    ? "blocked_no_execution"
    : "readiness_review_only";
  const auditTrail: AgentWalletActionAuditTrail = {
    actionIntent: request.actionIntent,
    agentId: request.agentId.trim(),
    campaignId: request.campaignId,
    chainId: request.chainId.trim(),
    evidencePurpose: request.evidencePurpose.trim(),
    executionAttempted: false,
    humanApprovalState: request.humanApprovalState,
    network: request.network,
    operatorRole: request.operatorRole,
    sensitiveMaterialHandled: false,
    taskId: request.taskId,
    walletSource: request.walletSource,
  };

  return {
    actionIntent: request.actionIntent,
    actionState,
    allowedOperation,
    auditTrail,
    blockedReason: blocked ? agentWalletBlockedReason : agentWalletReviewOnlyReason,
    campaignId: request.campaignId,
    nextReviewAction: blocked ? agentWalletBlockedNextAction : agentWalletReviewNextAction,
    noContractWrite: true,
    noExportFile: true,
    noPrivateKeyBoundary: true,
    noRewardDistribution: true,
    noSignatureExecution: true,
    noTransactionExecution: true,
    taskId: request.taskId,
    walletSource: request.walletSource,
  };
};

const createDiscoverySummary = (
  items: CampaignDiscoveryItem[],
): CampaignDiscoveryReadModel["summary"] => ({
  totalCampaigns: items.length,
  liveCount: items.filter((item) => item.status === "live").length,
  scheduledCount: items.filter(
    (item) =>
      item.status === "scheduled" ||
      item.status === "draft" ||
      item.status === "ai_draft" ||
      item.status === "human_review",
  ).length,
  endedCount: items.filter((item) =>
    item.status === "ended" || item.status === "exported" || item.status === "archived"
  ).length,
  appHubReadyCount: items.filter((item) => item.consumerSurfaces.includes("app_hub")).length,
  portfolioReadyCount: items.filter((item) => item.consumerSurfaces.includes("portfolio")).length,
  forecastReadyCount: items.filter((item) => item.consumerSurfaces.includes("forecast")).length,
  topCampaignId: items[0]?.id ?? "",
});

const filterCampaignDiscovery = (
  discovery: CampaignDiscoveryReadModel,
  request: ListCampaignsRequest = {},
): CampaignDiscoveryReadModel => {
  const items = discovery.items.filter((item) => {
    const surfaceMatches = request.consumerSurface
      ? item.consumerSurfaces.includes(request.consumerSurface)
      : true;
    const statusMatches = request.status ? item.status === request.status : true;

    return surfaceMatches && statusMatches;
  });
  const itemIds = new Set(items.map((item) => item.id));

  return {
    ...discovery,
    items,
    details: discovery.details.filter((detail) => itemIds.has(detail.item.id)),
    summary: createDiscoverySummary(items),
  };
};

const supportedGeneratedCampaignTaskWalletPolicies = ["ANY", "AA_ONLY", "EOA_ONLY"] as const satisfies readonly WalletPolicy[];

const isSupportedGeneratedCampaignTaskWalletPolicy = (walletPolicy: string): walletPolicy is WalletPolicy =>
  supportedGeneratedCampaignTaskWalletPolicies.includes(walletPolicy as WalletPolicy);

const taskTemplateCode = (template: TaskTemplate) =>
  template.id.startsWith("tpl-") ? template.id.slice(4) : template.id;

const taskTemplateLocaleKeyPrefix = (template: TaskTemplate) =>
  `task.${taskTemplateCode(template)}`;

const matchesGeneratedCampaignTaskWalletPolicy = (
  template: TaskTemplate,
  walletPolicy: WalletPolicy,
) => {
  if (walletPolicy === "AA_ONLY") {
    return template.walletCompatibility === "ANY" || template.walletCompatibility === "AA_ONLY";
  }
  if (walletPolicy === "EOA_ONLY") {
    return template.walletCompatibility === "ANY" || template.walletCompatibility === "EOA_ONLY";
  }

  return true;
};

const createGeneratedCampaignTask = (
  campaignId: string,
  request: GenerateCampaignTasksRequest,
  template: TaskTemplate,
): GeneratedCampaignTask => {
  const templateCode = taskTemplateCode(template);
  const localeKeyPrefix = taskTemplateLocaleKeyPrefix(template);

  return {
    campaignId,
    evidenceRule: {
      category: template.category,
      goal: request.goal.trim(),
      product: request.product.trim(),
      source: "LOCAL_SEEDED",
      targetUsers: request.targetUsers.map((targetUser) => targetUser.trim()).filter(Boolean).join(","),
      templateId: template.id,
    },
    id: `local-task-${templateCode}`,
    instructionKey: `${localeKeyPrefix}.instruction`,
    points: template.defaultPoints,
    required: template.requiredByDefault,
    templateCode,
    titleKey: `${localeKeyPrefix}.title`,
    verificationType: template.verificationType,
    walletCompatibility: template.walletCompatibility,
  };
};

const createGeneratedCampaignTasksResponse = (
  campaignId: string,
  request: GenerateCampaignTasksRequest,
): GenerateCampaignTasksResponse => {
  const taskList = taskTemplateLibrary
    .filter((template) => matchesGeneratedCampaignTaskWalletPolicy(template, request.walletPolicy))
    .map((template) => createGeneratedCampaignTask(campaignId, request, template));

  return {
    boundary: generatedCampaignTasksBoundary,
    campaignId,
    humanReviewRequired: true,
    pointRules: taskList.map((task) => ({
      points: task.points,
      required: task.required,
      templateCode: task.templateCode,
    })),
    taskList,
    walletCompatibility: taskList.map((task) => ({
      templateCode: task.templateCode,
      walletCompatibility: task.walletCompatibility,
    })),
  };
};

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
  request: Pick<VerifyTaskRequest, "accountType" | "walletSource">,
  participant: ParticipantSnapshot,
): LocalServiceResult<never> | undefined => {
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

const isAllowedTaskAction = (
  requested: TaskVerificationActionKind,
  allowed: TaskVerificationActionKind,
) => requested === allowed || (allowed === "view_review" && requested === "submit_proof");

const isSupportedTaskVerificationProofType = (
  proofType: TaskVerificationProofType | undefined,
) => proofType === undefined || ["screenshot", "url", "manual_note"].includes(proofType);

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

const walletLocaleKey = (walletType: AccountType, locale: SupportedLocale) => `${walletType}:${locale}`;

const createWalletLocaleMetrics = (
  participants: readonly ParticipantSnapshot[],
  walletSplit: readonly DimensionSplit[],
  locales: readonly SupportedLocale[],
): WalletLocaleMetric[] => {
  const total = participants.length || 1;
  const countsByWalletLocale = new Map<AccountType | string, number>();

  for (const participant of participants) {
    const key = walletLocaleKey(participant.accountType, participant.localePreference);
    countsByWalletLocale.set(key, (countsByWalletLocale.get(key) ?? 0) + 1);
  }

  return walletSplit.flatMap((walletMetric) => {
    const walletType = walletMetric.label as AccountType;

    return locales.map((locale) => {
      const count = countsByWalletLocale.get(walletLocaleKey(walletType, locale)) ?? 0;

      return {
        count,
        id: `wallet-locale-${walletType.toLowerCase()}-${locale.toLowerCase()}`,
        label: `${walletType} / ${locale}`,
        locale,
        percentage: Math.round((count / total) * 100),
        walletType,
      };
    });
  });
};

const referralRiskTierFor = (participant: ParticipantSnapshot): ReferralRiskTier =>
  participant.riskFlags.length > 0 || (participant.referralSummary?.riskFlags.length ?? 0) > 0
    ? "needs_review"
    : "low_risk";

const referralWalletRiskKey = (walletType: AccountType, riskTier: ReferralRiskTier) =>
  `${walletType}:${riskTier}`;

const referralWalletRiskLabel = (walletType: AccountType, riskTier: ReferralRiskTier) =>
  `${walletType} / ${riskTier.replace("_", " ")}`;

const roundRate = (value: number) => Math.round(value * 100) / 100;

const createReferralWalletRiskMetrics = (
  participants: readonly ParticipantSnapshot[],
): ReferralWalletRiskMetric[] => {
  const metricsByKey = new Map<string, ReferralWalletRiskMetric>();

  for (const participant of participants) {
    const walletType = participant.accountType;
    const riskTier = referralRiskTierFor(participant);
    const key = referralWalletRiskKey(walletType, riskTier);
    const existing = metricsByKey.get(key) ?? {
      conversionRate: 0,
      id: `referral-wallet-risk-${walletType.toLowerCase()}-${riskTier.replace("_", "-")}`,
      invitedCount: 0,
      label: referralWalletRiskLabel(walletType, riskTier),
      participantCount: 0,
      qualifiedInvitees: 0,
      riskTier,
      walletType,
    };
    const referral = participant.referralSummary;

    existing.participantCount += 1;
    existing.invitedCount += referral?.invitedCount ?? 0;
    existing.qualifiedInvitees += referral?.qualifiedInvitees ?? 0;
    metricsByKey.set(key, existing);
  }

  const walletOrder: AccountType[] = ["AA", "EOA", "UNKNOWN"];
  const tierOrder: ReferralRiskTier[] = ["low_risk", "needs_review"];

  return Array.from(metricsByKey.values())
    .map((metric) => ({
      ...metric,
      conversionRate: metric.invitedCount === 0 ? 0 : roundRate(metric.qualifiedInvitees / metric.invitedCount),
    }))
    .sort((left, right) =>
      walletOrder.indexOf(left.walletType) - walletOrder.indexOf(right.walletType) ||
      tierOrder.indexOf(left.riskTier) - tierOrder.indexOf(right.riskTier)
    );
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
    const goal = request.goal.trim();
    const duration = request.duration.trim();

    if (!request.ownerAddress.trim()) {
      return failure(
        "INVALID_REQUEST",
        "ownerAddress",
        "Campaign ownerAddress is required before a local campaign draft can be created.",
        "创建本地活动草稿前必须提供活动 ownerAddress。",
      );
    }

    if (!goal) {
      return failure(
        "INVALID_REQUEST",
        "goal",
        "Campaign goal is required before a local campaign draft can be created.",
        "创建本地活动草稿前必须提供活动目标。",
      );
    }

    if (!duration) {
      return failure(
        "INVALID_REQUEST",
        "duration",
        "Campaign duration is required before a local campaign draft can be created.",
        "创建本地活动草稿前必须提供活动周期。",
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
        "Only the exact activated locale set en-US, zh-CN, zh-TW, ja-JP, ko-KR, vi-VN, and id-ID is supported by this local runtime.",
        "当前本地运行时仅支持完整已激活语言集合 en-US、zh-CN、zh-TW、ja-JP、ko-KR、vi-VN 与 id-ID。",
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

    if (!isDurationCoherentWithWindow(duration, request.startTime, request.endTime)) {
      return failure(
        "INVALID_REQUEST",
        "duration",
        "Campaign duration must match the startTime and endTime dates.",
        "活动 duration 必须与 startTime 和 endTime 日期一致。",
      );
    }

    return success({
      contractMode: request.contractMode ?? "OFF_CHAIN_MVP",
      defaultLocale,
      duration,
      endTime: request.endTime,
      goal,
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

  listCampaigns: (request = {}) => {
    const participant = request.walletAddress
      ? findParticipant(campaignDetail, request.walletAddress)
      : undefined;
    const discovery = createCampaignDiscoveryReadModel(campaignDetail, participant);

    return success(filterCampaignDiscovery(discovery, request));
  },

  getCampaignDetail: (request) => {
    const participant = request.walletAddress
      ? findParticipant(campaignDetail, request.walletAddress)
      : undefined;
    const discovery = filterCampaignDiscovery(
      createCampaignDiscoveryReadModel(campaignDetail, participant),
      request,
    );
    const detail = discovery.details.find((candidate) => candidate.item.id === request.campaignId);

    if (!detail) {
      return failure(
        "CAMPAIGN_NOT_FOUND",
        "campaignId",
        "Campaign is not available in the local discovery facade.",
        "本地 discovery facade 中不存在该活动。",
      );
    }

    return success(detail);
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

  generateCampaignTasks: (request) => {
    const campaign = findCampaign(request.campaignId);

    if (!campaign) {
      return failure(
        "CAMPAIGN_NOT_FOUND",
        "campaignId",
        "Campaign is not available in the local service facade.",
        "本地 service facade 中不存在该活动。",
      );
    }

    if (!request.goal.trim()) {
      return failure(
        "INVALID_REQUEST",
        "goal",
        "Campaign task generation requires a non-empty goal.",
        "生成活动任务前必须提供非空活动目标。",
      );
    }

    if (!request.product.trim()) {
      return failure(
        "INVALID_REQUEST",
        "product",
        "Campaign task generation requires a non-empty product.",
        "生成活动任务前必须提供非空产品上下文。",
      );
    }

    if (request.targetUsers.filter((targetUser) => targetUser.trim()).length === 0) {
      return failure(
        "INVALID_REQUEST",
        "targetUsers",
        "Campaign task generation requires at least one target user segment.",
        "生成活动任务前必须至少提供一个目标用户分层。",
      );
    }

    if (!isSupportedGeneratedCampaignTaskWalletPolicy(request.walletPolicy)) {
      return failure(
        "INVALID_REQUEST",
        "walletPolicy",
        "Campaign task generation walletPolicy must be ANY, AA_ONLY, or EOA_ONLY.",
        "生成活动任务的 walletPolicy 必须为 ANY、AA_ONLY 或 EOA_ONLY。",
      );
    }

    return success(createGeneratedCampaignTasksResponse(campaign.id, request));
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

  requestAgentWalletAction: (request) => {
    const campaign = findCampaign(request.campaignId);

    if (!campaign) {
      return failure(
        "CAMPAIGN_NOT_FOUND",
        "campaignId",
        "Campaign is not available in the local Agent Skill wallet action facade.",
        "本地 Agent Skill 钱包动作 facade 中不存在该活动。",
      );
    }

    const task = campaign.tasks.find((candidate) => candidate.id === request.taskId);

    if (!task) {
      return failure(
        "TASK_NOT_FOUND",
        "taskId",
        "Task is not available in the local Agent Skill wallet action facade.",
        "本地 Agent Skill 钱包动作 facade 中不存在该任务。",
      );
    }

    if (request.walletSource !== "AGENT_SKILL") {
      return failure(
        "INVALID_REQUEST",
        "walletSource",
        "Agent wallet action readiness requires walletSource to be AGENT_SKILL.",
        "Agent 钱包动作 readiness 要求 walletSource 必须为 AGENT_SKILL。",
      );
    }

    if (!isApprovedOrReviewPending(request.humanApprovalState)) {
      return failure(
        "INVALID_REQUEST",
        "humanApprovalState",
        "Agent wallet action readiness requires a human approval state other than not_requested.",
        "Agent 钱包动作 readiness 要求人工审批状态不能缺失，也不能为 not_requested。",
      );
    }

    if (!isSupportedAgentWalletNetwork(request.chainId, request.network)) {
      return failure(
        "INVALID_REQUEST",
        "chainId",
        "Agent wallet action readiness supports only local AELF mainnet or testnet review contexts.",
        "Agent 钱包动作 readiness 仅支持本地 AELF mainnet 或 testnet 审核上下文。",
      );
    }

    if (!isKnownAgentWalletActionIntent(request.actionIntent)) {
      return failure(
        "INVALID_REQUEST",
        "actionIntent",
        "Agent wallet action readiness received an unsupported action intent.",
        "Agent 钱包动作 readiness 收到了不支持的动作意图。",
      );
    }

    return {
      ok: true,
      payload: createAgentWalletActionReadiness({
        ...request,
        actionIntent: request.actionIntent,
        humanApprovalState: request.humanApprovalState,
        network: request.network,
        walletSource: request.walletSource,
      }),
      boundary: agentWalletActionBoundary,
    };
  },

  executeTaskVerificationAction: (request) => {
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

    const action = deriveTaskVerificationAction(task, taskState);

    if (!isAllowedTaskAction(request.kind, action.kind)) {
      return failure(
        "INVALID_REQUEST",
        "kind",
        `Task action ${request.kind} is not allowed while the local task action is ${action.kind}.`,
        `当前本地任务动作是 ${action.kind}，不允许执行 ${request.kind}。`,
      );
    }

    if (request.kind === "submit_proof" && !request.proofType) {
      return failure(
        "INVALID_REQUEST",
        "proofType",
        "Submit proof requires a local proof type and does not upload files.",
        "提交证明需要提供本地 proofType，且不会上传文件。",
      );
    }

    if (!isSupportedTaskVerificationProofType(request.proofType)) {
      return failure(
        "INVALID_REQUEST",
        "proofType",
        "Task verification proof type must be screenshot, url, or manual_note.",
        "任务验证 proofType 必须是 screenshot、url 或 manual_note。",
      );
    }

    const result = createTaskVerificationActionResult(
      task,
      taskState,
      request.kind,
      request.proofType,
    );

    return success({
      ...result,
      accountType: participant.accountType,
      campaignId: campaign.id,
      canonicalEvidenceSource: result.evidence.source,
      evidenceHash: result.evidence.evidenceHash,
      evidenceSource: taskState.evidenceSource,
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
        "Only en-US source and zh-CN, zh-TW, ja-JP, or ko-KR target drafts are supported.",
        "当前仅支持 en-US 源文案与 zh-CN、zh-TW、ja-JP 或 ko-KR 目标草稿。",
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

  executeI18nReviewAction: (request) => {
    const campaign = findCampaign(request.campaignId);

    if (!campaign) {
      return failure(
        "CAMPAIGN_NOT_FOUND",
        "campaignId",
        "Campaign is not available in the local service facade.",
        "本地 service facade 中不存在该活动。",
      );
    }

    const result = executeI18nReviewAction(campaign, {
      actionId: request.actionId,
      reviewer: request.reviewer,
      targetLocale: request.targetLocale,
    });

    if (!result.ok) {
      return failure(
        result.error?.code === "UNSUPPORTED_LOCALE" ? "UNSUPPORTED_LOCALE" : "INVALID_REQUEST",
        result.error?.field ?? "actionId",
        result.error?.message["en-US"] ?? "Local i18n review action is not available.",
        result.error?.message["zh-CN"] ?? "本地 i18n 审核动作不可用。",
      );
    }

    return success({
      action: result.action,
      actions: result.actions,
      auditTrail: result.auditTrail,
      boundary: result.boundary,
      campaignId: result.campaignId,
      nextAction: result.nextAction,
      targetLocale: result.targetLocale,
      translationManager: result.translationManager,
      updatedRevisions: result.updatedRevisions,
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

    const sourceLocale = request.sourceLocale ?? "en-US";

    if (sourceLocale !== "en-US") {
      return failure(
        "UNSUPPORTED_LOCALE",
        "sourceLocale",
        "Campaign posts support en-US source content only.",
        "活动帖子仅支持 en-US 源内容。",
      );
    }

    const targetLocales = request.targetLocales ?? defaultGeneratedPostTargetLocales;

    if (
      targetLocales.length === 0 ||
      targetLocales.some((locale) => !isSupportedGeneratedPostTargetLocale(locale))
    ) {
      return failure(
        "UNSUPPORTED_LOCALE",
        "targetLocales",
        "Campaign posts support activated target locales zh-CN, zh-TW, ja-JP, ko-KR, vi-VN, and id-ID only.",
        "活动帖子仅支持已激活目标语言 zh-CN、zh-TW、ja-JP、ko-KR、vi-VN 与 id-ID。",
      );
    }

    if (
      request.contentKeys &&
      (!Array.isArray(request.contentKeys) ||
        request.contentKeys.length === 0 ||
        request.contentKeys.some((key) => !isGeneratedCampaignPostContentKey(key)))
    ) {
      return failure(
        "INVALID_REQUEST",
        "contentKeys",
        "Campaign posts contentKeys must include supported content keys only.",
        "活动帖子 contentKeys 仅支持已定义的内容键。",
      );
    }

    const workbench = createAiContentPackWorkbench(campaign);
    const artifacts = filterGeneratedCampaignPostArtifacts(
      workbench.artifacts,
      request.channel,
      request.contentKeys,
    );

    return success({
      artifacts,
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
    const localeMetrics = completeLocaleSplit(commandCenter.analyticsExport.localeSplit, campaign.supportedLocales);
    const walletTypeMetrics = commandCenter.analyticsExport.walletSplit;

    return success({
      campaignId: campaign.id,
      localeMetrics,
      period: request.period,
      reportCards: adminOps.aiReports,
      referralWalletRiskMetrics: createReferralWalletRiskMetrics(campaign.participants),
      riskSummary: adminOps.riskSignals,
      walletLocaleMetrics: createWalletLocaleMetrics(campaign.participants, walletTypeMetrics, campaign.supportedLocales),
      walletTypeMetrics,
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
      exportFulfillmentReadiness: createExportFulfillmentReadiness(campaign),
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

  getAntiSybilV2GraphReadiness: (request) => {
    const campaign = findCampaign(request.campaignId);

    if (!campaign) {
      return failure(
        "CAMPAIGN_NOT_FOUND",
        "campaignId",
        "Campaign is not available in the local service facade.",
        "本地 service facade 中不存在该活动。",
      );
    }

    return success(createAntiSybilV2GraphReadiness(campaign));
  },

  getCoverageSummary: () => {
    const surface = createApiSkillContractSurface();
    const serviceNames = [
      "createWalletSession",
      "createCampaign",
      "listCampaigns",
      "getCampaignDetail",
      "addTask",
      "generateCampaignTasks",
      "requestAgentWalletAction",
      "verifyTask",
      "executeTaskVerificationAction",
      "checkEligibility",
      "generateI18nDraft",
      "executeI18nReviewAction",
      "getCampaignAnalytics",
      "getAdvancedAnalyticsReadiness",
      "exportWinners",
      "getVerificationPipelineReadiness",
      "getProviderEvidenceRegistry",
      "getExportConfirmationReadiness",
      "getCampaignLifecycleOperations",
      "getLaunchConsoleCampaignBundles",
      "getAntiSybilV2GraphReadiness",
      "generateCampaignPosts",
      "summarizeCampaign",
    ];
    const coveredApiGroups: ApiSkillApiGroup[] = [
      "wallet_session",
      "campaign_creation",
      "campaign_discovery",
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
      reviewRequiredCount: surface.summary.reviewRequiredCount + 3,
      sampleResponseIds: [
        "createWalletSession",
        "createCampaign",
        "listCampaigns",
        "getCampaignDetail",
        "addTask",
        "generateCampaignTasks",
        "requestAgentWalletAction",
        "generateI18nDraft",
        "executeI18nReviewAction",
        "verifyTask",
        "executeTaskVerificationAction",
        "checkEligibility",
        "getAdvancedAnalyticsReadiness",
        "getVerificationPipelineReadiness",
        "getProviderEvidenceRegistry",
        "getExportConfirmationReadiness",
        "getCampaignLifecycleOperations",
        "getLaunchConsoleCampaignBundles",
        "getAntiSybilV2GraphReadiness",
        "exportWinners",
      ],
      serviceNames,
      totalServices: serviceNames.length,
      verificationBoundary,
      boundary: serviceBoundary,
    });
  },
});
