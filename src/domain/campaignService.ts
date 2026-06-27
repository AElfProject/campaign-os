import {
  createAdminOpsReadModel,
  createAiContentPackWorkbench,
  createExportPreview,
  createParticipationReadModel,
  createProjectCampaignCommandCenter,
  createTranslationManagerReadModel,
  deriveParticipantTaskStates,
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
  type ExportCsvColumn,
  type ExportPreviewRow,
  type LocalizedText,
  type NormalizedWalletSession,
  type ParticipantSnapshot,
  type PublishReadiness,
  type SupportedLocale,
  type TaskVerificationStatus,
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
  campaignId: string;
  evidenceHash: string;
  evidenceSource: string;
  pointsAwarded: number;
  pointsAvailable: number;
  status: Exclude<TaskVerificationStatus, "ready">;
  taskId: string;
  walletAddress: string;
  walletSource: WalletSource;
}

export interface CheckEligibilityRequest {
  campaignId: string;
  walletAddress: string;
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
  targetLocale: "zh-CN";
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
  contractRootMode: "none";
  format: "csv";
  includeLocalePreference: boolean;
  includeRiskFlags: boolean;
  includeWalletType: boolean;
}

export interface ExportWinnersResponse {
  campaignId: string;
  columns: readonly ExportCsvColumn[];
  confirmation: ReturnType<typeof createExportPreview>["confirmation"];
  disclaimer: string;
  format: "csv";
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
};

const rewardBoundary: LocalizedText = {
  "en-US": "Rewards are provided by the campaign project. Export winners does not distribute rewards.",
  "zh-CN": "奖励由活动项目方提供。导出 winners 不等于发奖。",
};

const noAutoPublishNotice: LocalizedText = {
  "en-US": "AI generated translation cannot auto-publish before human review.",
  "zh-CN": "AI 生成翻译必须经过人工审核后才能发布。",
};

const evidenceHashFor = (taskId: string, walletAddress: string) =>
  `demo-${taskId}-${walletAddress.slice(0, 3)}`;

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
    },
  },
  boundary: serviceBoundary,
});

const isSupportedServiceLocale = (locale: string): locale is SupportedLocale =>
  supportedLocales.includes(locale as SupportedLocale);

const hasOnlySupportedLocales = (locales: readonly string[]) =>
  locales.length === supportedLocales.length &&
  supportedLocales.every((locale) => locales.includes(locale));

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
        "Only en-US and zh-CN are supported by this local runtime.",
        "当前本地运行时仅支持 en-US 与 zh-CN。",
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
      campaignId: campaign.id,
      evidenceHash: evidenceHashFor(task.id, participant.walletAddress),
      evidenceSource: taskState.evidenceSource,
      pointsAwarded: taskState.pointsAwarded,
      pointsAvailable: taskState.pointsAvailable,
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
      request.targetLocale !== "zh-CN" ||
      !isSupportedServiceLocale(request.targetLocale)
    ) {
      return failure(
        "UNSUPPORTED_LOCALE",
        "targetLocale",
        "Only en-US source and zh-CN target drafts are supported.",
        "当前仅支持 en-US 源文案与 zh-CN 目标草稿。",
      );
    }

    const targetPanel = createTranslationManagerReadModel(campaign).panels.find(
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
      description: targetPanel.description,
      rewardDisclaimer: targetPanel.rewardDisclaimer,
      socialPost: targetPanel.socialPost,
      title: targetPanel.title,
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
      targetLocale: "zh-CN",
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

    return success(createProjectCampaignCommandCenter(campaign).analyticsExport);
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
        "Campaign posts support en-US plus zh-CN only.",
        "活动帖子仅支持 en-US 与 zh-CN。",
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
      localeMetrics: commandCenter.analyticsExport.localeSplit,
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

    if (request.format !== "csv" || request.contractRootMode !== "none") {
      return failure(
        "UNSUPPORTED_EXPORT_MODE",
        request.format !== "csv" ? "format" : "contractRootMode",
        "Only local CSV preview with contractRootMode none is supported.",
        "当前仅支持 contractRootMode 为 none 的本地 CSV 预览。",
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
      format: "csv",
      readyRows: rows.filter((row) => row.rowStatus === "ready").length,
      reviewRequiredRows: rows.filter((row) => row.rowStatus === "review_required").length,
      rows,
    });
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
        "checkEligibility",
        "exportWinners",
      ],
      serviceNames,
      totalServices: serviceNames.length,
      boundary: serviceBoundary,
    });
  },
});
