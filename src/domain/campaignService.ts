import {
  createAdminOpsReadModel,
  createAiContentPackWorkbench,
  createExportConfirmationReadinessGate,
  createExportPreview,
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
  supportedLocales,
  type AccountType,
  type AiContentArtifactChannel,
  type ApiSkillApiGroup,
  type ApiSkillContractReadiness,
  type ApiSkillFieldGroup,
  type CampaignShellDetail,
  type ContractMode,
  type ExportConfirmationReadinessGate,
  type ExportContractRootMode,
  type ExportCsvColumn,
  type ExportPreviewMode,
  type ExportPreviewRow,
  type LocalizedText,
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
  type WalletCompatibility,
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
  adapterName?: string;
  fixtureId?: string;
  walletPolicy?: WalletPolicy;
}

export interface CreateCampaignRequest {
  projectId: string;
  rewardDescription: string;
  supportedLocales?: SupportedLocale[];
  walletPolicy?: WalletPolicy;
  contractMode?: ContractMode;
}

export interface LocalCampaignDraft {
  id: string;
  projectId: string;
  defaultLocale: "en-US";
  supportedLocales: SupportedLocale[];
  walletPolicy: WalletPolicy;
  contractMode: ContractMode;
  publishReadiness: PublishReadiness;
  rewardBoundary: LocalizedText;
  rewardDescription: string;
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
  campaignId: string;
  walletAddress: string;
}

export interface GetVerificationPipelineReadinessRequest {
  campaignId: string;
}

export interface GetProviderEvidenceRegistryRequest {
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
  getVerificationPipelineReadiness(
    request: GetVerificationPipelineReadinessRequest,
  ): LocalServiceResult<VerificationPipelineReadinessGate>;
  getProviderEvidenceRegistry(
    request: GetProviderEvidenceRegistryRequest,
  ): LocalServiceResult<ProviderEvidenceRegistry>;
  getExportConfirmationReadiness(
    request: GetCampaignAnalyticsRequest,
  ): LocalServiceResult<ExportConfirmationReadinessGate>;
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
    "No live API, wallet SDK, provider, secret storage, real export file, reward distribution, contract call, or contract root write is executed. Responses are seeded/local read models only.",
  "zh-CN":
    "不会调用实时 API、钱包 SDK、provider、secret 存储、真实导出文件、奖励发放、合约调用或合约 root 写入。响应仅来自 seeded/本地 read model。",
  "zh-TW":
    "No live API, wallet SDK, provider, secret storage, real export file, reward distribution, contract call, or contract root write is executed. Responses are seeded/local read models only.",
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

export const createCampaignOsLocalService = (): CampaignOsLocalService => ({
  createWalletSession: (request) => {
    const fixture =
      walletAdapterFixtures.find((candidate) => candidate.id === request.fixtureId) ??
      walletAdapterFixtures.find(
        (candidate) => request.adapterName && candidate.adapterName === request.adapterName,
      );

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
    const requestedLocales = request.supportedLocales ?? [...supportedLocales];

    if (!hasOnlySupportedLocales(requestedLocales)) {
      return failure(
        "UNSUPPORTED_LOCALE",
        "supportedLocales",
        "Only the exact MVP locale set en-US, zh-CN, and zh-TW is supported by this local runtime.",
        "当前本地运行时仅支持完整 MVP 语言集合 en-US、zh-CN 与 zh-TW。",
      );
    }

    return success({
      contractMode: request.contractMode ?? "OFF_CHAIN_MVP",
      defaultLocale: "en-US",
      id: `local-${request.projectId}-campaign`,
      projectId: request.projectId,
      publishReadiness: {
        blockers: [],
        ready: true,
        warnings: [],
      },
      rewardBoundary,
      rewardDescription: request.rewardDescription,
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
      accountType: request.accountType,
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
      walletSource: request.walletSource,
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

    const preview = createExportPreview(
      campaign.id,
      campaign.participants,
      campaignTasks,
      campaign.walletSessions,
    );
    const rows = preview.rows;

    return success({
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
      "exportWinners",
      "getVerificationPipelineReadiness",
      "getProviderEvidenceRegistry",
      "getExportConfirmationReadiness",
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
      "content_generation",
      "campaign_summary",
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
      localOnlyCount: surface.summary.localOnlyCount + 2,
      readyCount: surface.summary.readyCount + 1,
      reviewRequiredCount: surface.summary.reviewRequiredCount + 1,
      sampleResponseIds: [
        "createWalletSession",
        "createCampaign",
        "verifyTask",
        "checkEligibility",
        "getVerificationPipelineReadiness",
        "getProviderEvidenceRegistry",
        "getExportConfirmationReadiness",
        "exportWinners",
      ],
      serviceNames,
      totalServices: serviceNames.length,
      verificationBoundary,
      boundary: serviceBoundary,
    });
  },
});
