import {
  apiSkillContractRegistry,
  createApiSkillContractSurface,
} from "../domain/apiSkillContracts";
import {
  generateCampaignTasksPreview,
  type AddTaskRequest,
  type CheckEligibilityRequest,
  type CreateCampaignRequest,
  type CreateWalletSessionRequest,
  type ExportWinnersRequest,
  type ExportWinnersResponse,
  type GenerateCampaignPostsRequest,
  type GenerateCampaignTasksRequest,
  type GenerateI18nDraftRequest,
  type GetCompanionContractReadinessRequest,
  type GetContractTransparencyRequest,
  type GetDeliveryChecklistReadinessRequest,
  type GetCampaignAnalyticsRequest,
  type GetCampaignDetailRequest,
  type GetCampaignLifecycleOperationsRequest,
  type GetLaunchConsoleCampaignBundlesRequest,
  type GetProviderEvidenceRegistryRequest,
  type GetVerificationPipelineReadinessRequest,
  type ListCampaignsRequest,
  type LocalCampaignDraft,
  type LocalServiceError,
  type LocalServiceResult,
  type LocalTaskDraft,
  type SummarizeCampaignRequest,
  type VerifyTaskRequest,
  type VerifyTaskResponse,
} from "../domain/campaignService";
import {
  createDeliveryChecklistReadinessConsole,
  createLaunchConsoleCampaignBundles,
  createLocalExportFileHandoff,
} from "../domain/campaign";
import { createPublishGateDecisionCenter, seededCampaignDraft } from "../domain/builder";
import { campaignDetail } from "../domain/fixtures";
import {
  exportArtifactRegistryForbiddenFields,
  type ExportArtifactRegistryRecord,
} from "./exportArtifactRegistry";
import {
  createPublishDeliveryReview,
  type PublishDeliveryReviewBackendRuntimeInput,
  type PublishDeliveryReviewRepositoryEvidenceInput,
} from "../domain/publishDeliveryReview";
import { createPointsRankingLedgerRuntime } from "../domain/pointsRankingLedgerRuntime";
import { createServerAnalyticsIngestionRuntimeReadiness } from "./analyticsIngestionRuntime";
import { createServerContractWriterRuntimeReadiness } from "./contractWriterRuntime";
import {
  createServerProjectOwnerFundingProofReviewBridge,
  type ProjectOwnerFundingProofPackageInput,
} from "./projectOwnerFundingProofReviewBridge";
import { createServerProductionDatabaseHandoffReadiness } from "./productionDatabaseHandoffReadiness";
import { createServerRewardDistributionHandoffReadiness } from "./rewardDistributionHandoffRuntime";
import {
  createServiceDegradationGovernance,
  createServiceRegistry,
} from "../domain/serviceRegistry";
import type {
  ExportArtifact,
  AgentWalletActionReadinessRequest,
  CampaignLifecycleOperations,
  CampaignDiscoveryDetail,
  CampaignDiscoveryItem,
  CampaignDiscoveryReadModel,
  CampaignDiscoverySummary,
  ExportConfirmationReadinessGate,
  LaunchConsoleCampaignBundleSurface,
  LocalizedText,
  NormalizedWalletSession,
  ProviderEvidenceRegistry,
  VerificationPipelineReadinessGate,
  VerificationEvidenceSource,
  VerificationProviderId,
  PointsRankingLedgerRuntime,
  PublishDeliveryReview,
  ExportPreviewMode,
  LocalExportFileHandoff,
} from "../domain/types";
import {
  apiRuntimeRoutes,
  createApiRuntimeContractCoverage,
  type ApiRuntimeRouteId,
} from "./routes";
import {
  createBackendDatabaseAdapterRuntimeSummary,
  createBackendPersistenceRuntimeSummary,
  type BackendServiceReadinessReport,
} from "./backendService";
import {
  createObjectStorageExportReadiness,
  type ObjectStorageExportReadiness,
} from "./objectStorageExportRuntime";
import { createProductionBackendReadinessSummary } from "./productionBackendReadiness";
import {
  CampaignDbRepositoryError,
  type CampaignDbAddTaskDraftInput,
  type CampaignDbCreateDraftInput,
  type CampaignDbDraft,
  type CampaignDbEligibilityProjection,
  type CampaignDbExportArtifact,
  type CampaignDbExportProjection,
  type CampaignDbExportReadinessProjection,
  type CampaignDbListFilter,
  type CampaignDbReadProjection,
  type CampaignDbTaskCompletion,
  type CampaignDbTaskEvidenceRecord,
  type CampaignDbTaskDraft,
  type CampaignDbTaskVerificationProjection,
  type CampaignDbI18nDraftProjection,
} from "./campaignDbRepository";
import { createBackendTopologyReport } from "./topology";
import { createRuntimeSafety } from "./envelope";
import {
  ApiRuntimeError,
  invalidCampaign,
  invalidRequest,
  invalidTask,
  unsupportedExportMode,
  unsupportedLocale,
} from "./errors";
import type { ApiRuntimeHandler, ApiRuntimeHandlerContext } from "./apiRuntime";
import {
  apiRuntimeServiceGroups,
  createApiRuntimeCapabilityCatalog,
} from "./capabilities";
import { createApiFoundationReport } from "./apiFoundation";
import { createApiServicePortReport } from "./servicePorts";
import {
  persistenceBoundary,
  type CampaignOsPersistenceRecordInput,
  type PersistenceRecordKind,
  type PersistenceSummary,
} from "./persistence";
import { resolveApiServerRuntimeContract } from "./serverRuntime";
import {
  bodyRecord,
  campaignPostChannel,
  campaignPostContentKeyArray,
  exportContractRootMode,
  exportFormat,
  isJsonRecord,
  optionalAccountType,
  optionalLocaleArray,
  optionalLocale,
  optionalString,
  optionalWalletSource,
  requiredAgentWalletHumanApprovalState,
  requiredAccountType,
  requiredBoolean,
  requiredNumber,
  requiredNonEmptyStringArray,
  requiredOwnerRole,
  requiredRecord,
  requiredRouteParam,
  requiredString,
  requiredVerificationType,
  requiredWalletCompatibility,
  requiredWalletNetwork,
  requiredWalletPolicy,
  requiredWalletSource,
  summaryPeriod,
} from "./validation";
import {
  issueLocalSessionArtifact,
  type SessionIssuerResult,
} from "./sessionIssuer";
import {
  verifyWalletProofLocally,
  type WalletProofVerificationResult,
} from "./walletProofVerifier";

const localErrorToRuntimeError = (
  error: LocalServiceError,
  context: ApiRuntimeHandlerContext,
) => {
  const body = isJsonRecord(context.body) ? context.body : {};
  const campaignId = optionalString(context.params.campaignId) ?? optionalString(body.campaignId);
  const taskId = optionalString(context.params.taskId) ?? optionalString(body.taskId);

  switch (error.code) {
    case "CAMPAIGN_NOT_FOUND":
      return invalidCampaign(campaignId ?? "unknown-campaign");
    case "TASK_NOT_FOUND":
      return invalidTask(taskId ?? "unknown-task");
    case "UNSUPPORTED_LOCALE":
      return unsupportedLocale(
        optionalString(body.targetLocale)
          ?? optionalString(body.sourceLocale)
          ?? optionalString(body.defaultLocale)
          ?? optionalString(context.query.locale)
          ?? "unknown-locale",
      );
    case "UNSUPPORTED_EXPORT_MODE":
      return unsupportedExportMode(
        optionalString(body.contractRootMode) ?? optionalString(body.format) ?? "unknown-export-mode",
      );
    default:
      return invalidRequest(error.field ?? "request", error.message["en-US"]);
  }
};

const unwrapLocalResult = <TPayload>(
  result: LocalServiceResult<TPayload>,
  context: ApiRuntimeHandlerContext,
) => {
  if (!result.ok) {
    throw localErrorToRuntimeError(result.error, context);
  }

  return {
    boundary: result.boundary,
    payload: result.payload,
  };
};

const persistLocalResult = async <TPayload>(
  result: LocalServiceResult<TPayload>,
  context: ApiRuntimeHandlerContext,
  createRecordInput: (payload: TPayload) => Omit<
    CampaignOsPersistenceRecordInput,
    "kind" | "routeId" | "traceId"
  > & {
    kind: PersistenceRecordKind;
    summary?: PersistenceSummary;
  },
  options: {
    tolerateAuditFailureAfterCommit?: boolean;
  } = {},
) => {
  const response = unwrapLocalResult(result, context);
  const recordInput = {
    ...createRecordInput(response.payload),
    routeId: context.route.id,
    traceId: context.traceId,
  };

  try {
    const record = await context.repository.record(recordInput);

    return {
      ...response,
      persistence: {
        kind: record.kind,
        recordId: record.id,
      },
    };
  } catch (error) {
    if (
      !options.tolerateAuditFailureAfterCommit
      || !(error instanceof ApiRuntimeError)
      || error.body.code !== "PERSISTENCE_UNAVAILABLE"
    ) {
      throw error;
    }

    return {
      ...response,
      persistence: {
        code: "PERSISTENCE_UNAVAILABLE" as const,
        kind: recordInput.kind,
        operation: "record" as const,
        status: "unavailable" as const,
        traceId: context.traceId,
      },
    };
  }
};

const campaignDbI18nDiagnosticToRuntimeError = (
  error: CampaignDbRepositoryError,
  request: GenerateI18nDraftRequest,
) => {
  const diagnostic = error.diagnostics[0];

  if (diagnostic?.code === "CAMPAIGN_DB_I18N_UNSUPPORTED_SOURCE_LOCALE") {
    return unsupportedLocale(request.sourceLocale);
  }

  if (diagnostic?.code === "CAMPAIGN_DB_I18N_UNSUPPORTED_TARGET_LOCALE") {
    return unsupportedLocale(request.targetLocale);
  }

  if (diagnostic?.code === "CAMPAIGN_DB_I18N_CAMPAIGN_NOT_FOUND") {
    return invalidCampaign(request.campaignId);
  }

  return invalidRequest(
    diagnostic?.field ?? "request",
    diagnostic?.message ?? "Campaign DB i18n draft request is invalid.",
  );
};

const createTaskDraftResponse = (
  request: AddTaskRequest,
  id = `local-task-${request.templateCode}`,
): Extract<LocalServiceResult<LocalTaskDraft>, { ok: true }> => ({
  ok: true,
  boundary: campaignDbBoundary,
  payload: {
    ...request,
    id,
  },
});

const createCampaignRequest = (context: ApiRuntimeHandlerContext): CreateCampaignRequest => {
  const body = bodyRecord(context.body);

  return {
    ...body,
    duration: requiredString(body, "duration"),
    endTime: requiredString(body, "endTime"),
    goal: requiredString(body, "goal"),
    ownerAddress: requiredString(body, "ownerAddress"),
    projectId: requiredString(body, "projectId"),
    rewardDescription: requiredString(body, "rewardDescription"),
    startTime: requiredString(body, "startTime"),
  } as CreateCampaignRequest;
};

const addTaskRequest = (context: ApiRuntimeHandlerContext): AddTaskRequest => {
  const body = bodyRecord(context.body);

  return {
    ...body,
    campaignId: requiredRouteParam(context.params, "campaignId"),
    evidenceRule: requiredRecord(body, "evidenceRule"),
    points: requiredNumber(body, "points"),
    required: requiredBoolean(body, "required"),
    templateCode: requiredString(body, "templateCode"),
    verificationType: requiredVerificationType(body),
    walletCompatibility: requiredWalletCompatibility(body),
  };
};

const campaignDbTaskDraftInput = (request: AddTaskRequest): CampaignDbAddTaskDraftInput => ({
  campaignId: request.campaignId,
  evidenceRule: request.evidenceRule,
  points: request.points,
  required: request.required,
  templateCode: request.templateCode,
  verificationType: request.verificationType,
  walletCompatibility: request.walletCompatibility,
});

const verifyTaskRequest = (context: ApiRuntimeHandlerContext): VerifyTaskRequest => {
  const body = bodyRecord(context.body);

  return {
    accountType: requiredAccountType(body),
    campaignId: requiredString(body, "campaignId"),
    taskId: requiredRouteParam(context.params, "taskId"),
    walletAddress: requiredString(body, "walletAddress"),
    walletSource: requiredWalletSource(body),
  };
};

const listCampaignRequest = (context: ApiRuntimeHandlerContext): ListCampaignsRequest => ({
  consumerSurface: context.query.consumerSurface as ListCampaignsRequest["consumerSurface"],
  status: context.query.status as ListCampaignsRequest["status"],
  walletAddress: context.query.walletAddress,
});

const campaignDetailRequest = (context: ApiRuntimeHandlerContext): GetCampaignDetailRequest => ({
  ...listCampaignRequest(context),
  campaignId: requiredRouteParam(context.params, "campaignId"),
});

const campaignDbListFilter = (context: ApiRuntimeHandlerContext): CampaignDbListFilter => ({
  limit: optionalString(context.query.limit) ? Number(optionalString(context.query.limit)) : undefined,
  ownerAddress: context.query.ownerAddress,
  projectId: context.query.projectId,
  status: context.query.status,
});

const editableOwnerCampaignStatuses = new Set(["draft", "ai_draft", "human_review", "scheduled", "paused"]);

const ownerCampaignListStatus = (value: string | undefined) => {
  if (value === undefined) {
    return undefined;
  }

  if (!editableOwnerCampaignStatuses.has(value)) {
    throw invalidRequest("status", "Owner campaign recovery status must be an editable lifecycle value.");
  }

  return value;
};

const ownerCampaignListLimit = (value: string | undefined) => {
  if (value === undefined) {
    return 100;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw invalidRequest("limit", "Owner campaign recovery limit must be an integer from 1 to 100.");
  }

  return Math.min(parsed, 100);
};

const issuedOwnerAddress = (context: ApiRuntimeHandlerContext) => {
  const address = context.auth?.session?.address;

  if (!address) {
    throw invalidRequest("authSession", "Issued owner session is required for owner campaign recovery.");
  }

  return address;
};

const ownerCampaignDbListFilter = (context: ApiRuntimeHandlerContext): CampaignDbListFilter => ({
  limit: ownerCampaignListLimit(optionalString(context.query.limit)),
  ownerAddress: issuedOwnerAddress(context),
  projectId: requiredRouteParam(context.params, "projectId"),
  status: ownerCampaignListStatus(optionalString(context.query.status)),
});

const localized = (enUS: string, zhCN = enUS, zhTW = enUS): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
});

const campaignDbBoundary = localized(
  "Campaign draft is routed through the Campaign DB repository boundary in deterministic local-review mode.",
  "活动草稿通过 Campaign DB repository 边界在 deterministic local-review 模式下路由。",
);

const campaignDbCta = {
  kind: "start" as const,
  label: localized("Start campaign", "开始活动"),
  reason: localized(
    "Draft is available through the repository-backed Campaign API read model.",
    "草稿已通过 repository-backed Campaign API read model 可读。",
  ),
};

const createCampaignDbSummary = (
  drafts: readonly CampaignDbReadProjection[],
) => ({
  createdViaRepository: true,
  draftCount: drafts.length,
  repositoryId: "campaign-db-repository-runtime",
  storeId: "campaign-db",
  taskDraftCount: drafts.reduce((total, draft) => total + draft.tasks.length, 0),
});

const createCampaignDiscoverySummary = (
  items: readonly CampaignDiscoveryItem[],
): CampaignDiscoverySummary => ({
  appHubReadyCount: items.filter((item) => item.consumerSurfaces.includes("app_hub")).length,
  endedCount: items.filter((item) =>
    item.status === "ended" || item.status === "exported" || item.status === "archived"
  ).length,
  forecastReadyCount: items.filter((item) => item.consumerSurfaces.includes("forecast")).length,
  liveCount: items.filter((item) => item.status === "live").length,
  portfolioReadyCount: items.filter((item) => item.consumerSurfaces.includes("portfolio")).length,
  scheduledCount: items.filter(
    (item) =>
      item.status === "scheduled" ||
      item.status === "draft" ||
      item.status === "ai_draft" ||
      item.status === "human_review",
  ).length,
  topCampaignId: items[0]?.id ?? "",
  totalCampaigns: items.length,
});

const localWalletProofEvaluationTime = "2026-07-07T00:00:00.000Z";
const localWalletProofTtlSeconds = 3600;

const proofBlockingWalletStatuses: ReadonlySet<NormalizedWalletSession["verificationStatus"]> =
  new Set([
    "account_restricted",
    "extension_not_installed",
    "unsupported_wallet",
    "wrong_chain",
  ]);

const createWalletProofResult = (
  request: CreateWalletSessionRequest,
  payload: NormalizedWalletSession,
): WalletProofVerificationResult => {
  const proofType = payload.verificationStatus === "address_only" ? "address_only" : undefined;
  const shouldBlockProof = proofBlockingWalletStatuses.has(payload.verificationStatus);

  return verifyWalletProofLocally({
    accountTypeHint: request.accountTypeHint ?? payload.accountType,
    address: payload.address,
    adapterName: request.adapterName ?? payload.walletName,
    chainId: shouldBlockProof ? "unsupported_session_state" : payload.chainId,
    maxAgeSeconds: 300,
    network: payload.network,
    nonce: request.nonce ?? `local-nonce:${payload.sessionId}`,
    now: request.proofEvaluatedAt ?? localWalletProofEvaluationTime,
    observedInput: request,
    proofIssuedAt: request.proofIssuedAt ?? payload.connectedAt ?? localWalletProofEvaluationTime,
    proofType,
    productionRequired: request.productionRequired ?? false,
    signature: request.signature,
    signaturePresent: request.signaturePresent ?? payload.signatureStatus === "signed",
    walletSourceHint: request.walletSourceHint ?? payload.walletSource,
  });
};

const createWalletSessionProofSummary = (
  proofResult: WalletProofVerificationResult,
): NonNullable<NormalizedWalletSession["proof"]> => ({
  diagnosticCodes: proofResult.diagnostics.map((item) => item.code),
  liveVerificationExecuted: proofResult.liveVerificationExecuted,
  proofType: proofResult.proofType,
  status: proofResult.status,
  trustLevel: proofResult.trustLevel,
});

const createWalletSessionIssuerSummary = (
  issuerResult: SessionIssuerResult,
): NonNullable<NormalizedWalletSession["issuer"]> => ({
  artifactType: issuerResult.artifactType,
  cookieIssued: issuerResult.cookieIssued,
  diagnosticCodes: issuerResult.diagnosticCodes,
  issuerMode: issuerResult.issuerMode,
  jwtIssued: issuerResult.jwtIssued,
  liveSigningExecuted: issuerResult.liveSigningExecuted,
  referenceId: issuerResult.referenceId,
  ttlSeconds: issuerResult.ttlSeconds,
  valid: issuerResult.valid,
});

const createWalletSessionProductionReadinessSummary = (
  proofResult: WalletProofVerificationResult,
  issuerResult: SessionIssuerResult,
): NonNullable<NormalizedWalletSession["productionReadiness"]> => ({
  blockedDependencyIds: Array.from(new Set([
    ...proofResult.productionReadiness.blockedDependencyIds,
    ...issuerResult.productionReadiness.blockedDependencyIds,
  ])),
  liveSigningReady: false,
  liveVerifierReady: proofResult.productionReadiness.liveVerifierReady,
  productionReady: false,
  productionRequired: proofResult.productionReadiness.required,
  productionSessionStoreReady: issuerResult.productionReadiness.productionSessionStoreReady,
  secretManagerReady: issuerResult.productionReadiness.secretManagerReady,
  signingKeyReady: issuerResult.productionReadiness.signingKeyReady,
});

const enrichWalletSessionWithProofMetadata = (
  request: CreateWalletSessionRequest,
  payload: NormalizedWalletSession,
): NormalizedWalletSession => {
  const proofResult = createWalletProofResult(request, payload);
  const issuerResult = issueLocalSessionArtifact({
    issuedAt: request.proofEvaluatedAt ?? localWalletProofEvaluationTime,
    observedInput: request,
    productionRequired: request.productionRequired ?? false,
    proofResult,
    sessionId: payload.sessionId,
    ttlSeconds: localWalletProofTtlSeconds,
  });

  return {
    ...payload,
    proof: createWalletSessionProofSummary(proofResult),
    issuer: createWalletSessionIssuerSummary(issuerResult),
    productionReadiness: createWalletSessionProductionReadinessSummary(proofResult, issuerResult),
  };
};

const normalizeWalletSessionRepositoryLastSeenAt = (
  request: CreateWalletSessionRequest,
  payload: NormalizedWalletSession,
) => {
  const candidate = request.proofEvaluatedAt ?? payload.lastSeenAt ?? payload.connectedAt;

  if (!candidate) {
    return undefined;
  }

  const timestamp = Date.parse(candidate);

  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : payload.lastSeenAt;
};

const walletSessionRepositoryPayload = (
  request: CreateWalletSessionRequest,
  payload: NormalizedWalletSession,
): NormalizedWalletSession => {
  const lastSeenAt = normalizeWalletSessionRepositoryLastSeenAt(request, payload);

  return lastSeenAt
    ? {
      ...payload,
      lastSeenAt,
    }
    : payload;
};

const createCampaignDbTaskSummary = (task: CampaignDbTaskDraft) => ({
  points: task.points,
  required: task.required,
  taskId: task.id,
  title: localized(task.templateCode, task.templateCode),
  verificationType: task.verificationType,
});

const campaignDbDraftToDiscoveryItem = (draft: CampaignDbReadProjection): CampaignDiscoveryItem => ({
  boundary: campaignDbBoundary,
  campaignType: localized("Repository Draft", "Repository 草稿"),
  consumerSurfaces: ["user_app", "app_hub", "portfolio", "forecast"],
  coreTasks: draft.tasks.map(createCampaignDbTaskSummary),
  cta: campaignDbCta,
  endTime: draft.endTime,
  id: draft.id,
  points: 0,
  slug: draft.id,
  startTime: draft.startTime,
  status: draft.status,
  subtitle: localized(draft.rewardDescription, draft.rewardDescription),
  supportedLocales: [...draft.supportedLocales],
  tags: [
    localized(draft.projectId, draft.projectId),
    localized("Repository-backed", "Repository-backed"),
  ],
  timeWindow: localized(draft.duration, draft.duration),
  title: localized(draft.goal, draft.goal),
  walletPolicy: draft.walletPolicy,
});

const createCampaignDbTaskMetadata = (task: CampaignDbTaskDraft) => ({
  createdViaRepository: true,
  repositoryId: "campaign-db-repository-runtime",
  storeId: "campaign-db" as const,
  taskId: task.id,
});

const createCampaignDbCompletionMetadata = (completion: CampaignDbTaskCompletion) => ({
  completionId: completion.id,
  createdViaRepository: true,
  ...(completion.evidenceId ? { evidenceId: completion.evidenceId } : {}),
  repositoryId: "campaign-db-repository-runtime",
  storeId: "campaign-db" as const,
  taskId: completion.taskId,
});

const createCampaignDbEvidenceMetadata = (evidence: CampaignDbTaskEvidenceRecord) => ({
  createdViaRepository: true,
  ...(evidence.completionId ? { completionId: evidence.completionId } : {}),
  evidenceHash: evidence.evidenceHash,
  evidenceId: evidence.id,
  ...(evidence.evidenceRef ? { evidenceRef: evidence.evidenceRef } : {}),
  evidenceSource: evidence.evidenceSource,
  liveContractExecuted: evidence.liveContractExecuted,
  liveProviderExecuted: evidence.liveProviderExecuted,
  liveRewardExecuted: evidence.liveRewardExecuted,
  liveStorageExecuted: evidence.liveStorageExecuted,
  repositoryId: "campaign-db-repository-runtime",
  status: evidence.status,
  storeId: "campaign-db" as const,
  taskId: evidence.taskId,
});

const toCanonicalEvidenceSource = (
  evidenceSource: CampaignDbTaskCompletion["evidenceSource"],
): VerificationEvidenceSource =>
  evidenceSource === "MANUAL" ? "MANUAL_REVIEW" : evidenceSource;

const toProviderId = (
  evidenceSource: CampaignDbTaskCompletion["evidenceSource"],
): VerificationProviderId => {
  switch (evidenceSource) {
    case "AEFINDER":
      return "aefinder";
    case "AELFSCAN":
      return "aelfscan";
    case "DAPP_API":
      return "dapp_api";
    case "SOCIAL_API":
      return "social_api";
    case "MANUAL":
    default:
      return "manual_review";
  }
};

const createRepositoryCompletionResponse = (
  completion: CampaignDbTaskCompletion,
  task: CampaignDbTaskDraft,
  evidence?: CampaignDbTaskEvidenceRecord,
) => ({
  accountType: completion.accountType,
  campaignId: completion.campaignId,
  canonicalEvidenceSource: toCanonicalEvidenceSource(evidence?.evidenceSource ?? completion.evidenceSource),
  evidence: {
    capturedAt: evidence?.capturedAt ?? completion.updatedAt,
    evidenceHash: evidence?.evidenceHash ?? completion.evidenceHash ?? `evidence-hash:${completion.taskId}`,
    evidenceId: evidence?.id ?? completion.evidenceId ?? `campaign-db-evidence-${completion.id}`,
    live: false,
    source: toCanonicalEvidenceSource(evidence?.evidenceSource ?? completion.evidenceSource),
    sourceLabel: localized(
      "Campaign DB local evidence",
      "Campaign DB local evidence",
    ),
  },
  ...(evidence?.id ?? completion.evidenceId ? { evidenceId: evidence?.id ?? completion.evidenceId } : {}),
  ...(evidence?.evidenceRef ? { evidenceRef: evidence.evidenceRef } : {}),
  evidenceHash: evidence?.evidenceHash ?? completion.evidenceHash ?? `evidence-hash:${completion.taskId}`,
  evidenceSource: evidence?.evidenceSource ?? completion.evidenceSource,
  liveContractExecuted: evidence?.liveContractExecuted ?? false,
  liveProviderExecuted: evidence?.liveProviderExecuted ?? false,
  liveRewardExecuted: evidence?.liveRewardExecuted ?? false,
  liveStorageExecuted: evidence?.liveStorageExecuted ?? false,
  manualReview: {
    queued: completion.status === "manual_review",
    ...(completion.status === "manual_review"
      ? { reason: localized("Repository task requires manual review.", "Repository task requires manual review.") }
      : {}),
    severity: completion.status === "manual_review" ? "warning" as const : "info" as const,
  },
  nextAction: localized(
    completion.status === "completed"
      ? "Repository task completion recorded locally."
      : "Repository task completion requires local review.",
    completion.status === "completed"
      ? "Repository task completion recorded locally."
      : "Repository task completion requires local review.",
  ),
  pointsAwarded: completion.pointsAwarded,
  pointsAvailable: task.points,
  provider: {
    fallbackReason: localized(
      "Repository-created campaign uses deterministic local completion metadata.",
      "Repository-created campaign uses deterministic local completion metadata.",
    ),
    nextAdapterStep: localized(
      "Connect live verification adapter in a later mission.",
      "Connect live verification adapter in a later mission.",
    ),
    providerId: toProviderId(completion.evidenceSource),
    readiness: "local_only" as const,
  },
  riskFlags: [],
  status: completion.status,
  taskId: completion.taskId,
  walletAddress: completion.walletAddress,
  walletSource: completion.walletSource,
});

const createRepositoryEligibilityResponse = (
  projection: CampaignDbEligibilityProjection,
) => ({
  accountType: projection.accountType,
  campaignId: projection.campaignId,
  eligible: projection.eligible,
  localePreference: projection.localePreference,
  missingTasks: projection.missingTasks,
  campaignDbEvidence: projection.evidence.map(createCampaignDbEvidenceMetadata),
  nextAction: localized(
    projection.eligible
      ? "Repository campaign eligibility is satisfied locally."
      : "Complete the missing repository campaign tasks before eligibility review.",
    projection.eligible
      ? "Repository campaign eligibility is satisfied locally."
      : "Complete the missing repository campaign tasks before eligibility review.",
  ),
  riskFlags: projection.riskFlags,
  score: projection.score,
  status: projection.status,
  walletAddress: projection.walletAddress,
  walletSource: projection.walletSource,
  walletTypeVerified: projection.walletTypeVerified,
});

const createRepositoryI18nDraftResponse = (
  projection: CampaignDbI18nDraftProjection,
) => ({
  aiDraft: projection.draft.aiDraft,
  campaignId: projection.draft.campaignId,
  contentKeys: projection.draft.contentKeys,
  draft: projection.draft.draft,
  fallbackToEnglish: projection.draft.fallbackToEnglish,
  humanReviewRequired: projection.draft.humanReviewRequired,
  noAutoPublishNotice: localized(
    "AI generated translation cannot auto-publish before human review.",
    "AI 生成翻译必须经过人工审核后才能发布。",
    "AI generated translation cannot auto-publish before human review.",
  ),
  sourceLocale: projection.draft.sourceLocale,
  targetLocale: projection.draft.targetLocale,
});

const createCampaignDbMetadata = (repository: {
  adapterId: string;
  createdViaRepository: true;
  repositoryId: string;
  storeId: "campaign-db";
}) => ({
  adapterId: repository.adapterId,
  createdViaRepository: repository.createdViaRepository,
  repositoryId: repository.repositoryId,
  storeId: repository.storeId,
});

const exportProjectionBoundary = localized(
  "Campaign DB repository export projection is local-review only. No export file, storage write, signed URL, contract root, contract transaction, reward custody, or reward distribution is executed.",
  "Campaign DB repository 导出投影仅用于本地审核。不会生成导出文件、写入存储、生成 signed URL、写入合约 root、执行合约交易、托管奖励或发奖。",
);

const createRepositoryExportPreviewResponse = (
  projection: CampaignDbExportProjection,
) => ({
  artifact: projection.artifact,
  blockedRows: projection.blockedRows,
  boundary: exportProjectionBoundary,
  campaignId: projection.campaignId,
  columns: projection.columns,
  contractRootMode: projection.contractRootMode,
  disclaimer: projection.disclaimer,
  exportBatchId: projection.exportBatchId,
  exportReadiness: projection.exportReadiness,
  format: projection.format,
  readyRows: projection.readyRows,
  reviewRequiredRows: projection.reviewRequiredRows,
  rows: projection.rows,
});

type RepositoryExportPreviewResponse = ReturnType<typeof createRepositoryExportPreviewResponse>;
type ExportPreviewRegistryPayload = ExportWinnersResponse | RepositoryExportPreviewResponse;

const isRepositoryExportPreviewResponse = (
  payload: ExportPreviewRegistryPayload,
): payload is RepositoryExportPreviewResponse => "exportBatchId" in payload;

const repositoryArtifactForRegistry = (
  artifact: CampaignDbExportArtifact,
  payload: RepositoryExportPreviewResponse,
): ExportArtifact => ({
  batchId: payload.exportBatchId,
  campaignId: artifact.campaignId,
  extension: artifact.format,
  fileName: `${artifact.campaignId}-${payload.exportBatchId}-local-review.${artifact.format}`,
  format: artifact.format,
  metadata: {
    blockedRows: payload.blockedRows,
    checksum: artifact.checksum,
    checksumAlgorithm: artifact.checksumAlgorithm,
    columns: artifact.columns,
    generatedMode: artifact.generatedMode,
    payloadBytes: artifact.payloadBytes,
    readyRows: payload.readyRows,
    reviewRequiredRows: payload.reviewRequiredRows,
    totalRows: payload.rows.length,
  },
  mimeType: artifact.mimeType,
  payload: artifact.format === "csv"
    ? artifact.csvPreview ?? ""
    : JSON.stringify(artifact.jsonPreview ?? []),
  safety: {
    boundary: exportProjectionBoundary,
    localOnly: true,
    noContractRoot: true,
    noContractTransaction: true,
    noDownloadUrl: true,
    noRewardCustody: true,
    noRewardDistribution: true,
    noStorageWrite: true,
    rewardDistributionOwner: "campaign_project",
    verifiedRecordsOnly: true,
  },
});

const artifactForRegistry = (payload: ExportPreviewRegistryPayload): ExportArtifact =>
  isRepositoryExportPreviewResponse(payload)
    ? repositoryArtifactForRegistry(payload.artifact, payload)
    : payload.artifact;

const withExportArtifactRegistry = (
  response: {
    payload: ExportPreviewRegistryPayload;
  },
  context: ApiRuntimeHandlerContext,
) => {
  if (!response.payload.artifact) {
    return response;
  }

  const registryArtifact = artifactForRegistry(response.payload);
  const registration = context.exportArtifactRegistry.register(
    registryArtifact,
    {
      routeId: context.route.id,
      traceId: context.traceId,
    },
  );

  if (!registration.ok) {
    throw invalidRequest(
      registration.diagnostics[0]?.field ?? "artifact",
      registration.diagnostics[0]?.message
        ?? "Export artifact registry rejected the local export artifact.",
    );
  }

  return {
    ...response,
    payload: {
      ...response.payload,
      artifactRegistry: registration.record,
    },
  };
};

interface LocalExportFileHandoffPayload {
  artifactId: string;
  auditDetail: {
    batchId: string;
    checksum: string;
    checksumAlgorithm: string;
    fileName: string;
    payloadBytes: number;
    previewRouteId: string;
    previewTraceId: string;
    retentionState: LocalExportFileHandoff["retention"]["state"];
    source: "deterministic_local_export";
  };
  campaignId: string;
  handoff: LocalExportFileHandoff;
  safety: LocalExportFileHandoff["safety"];
}

const localExportFileAllowedQueryFields = new Set(["format", "now"]);
const localExportFileModeFields = new Set(["mode", "exportMode", "contractRootMode"]);
const localExportFileForbiddenQueryFields = new Map(
  exportArtifactRegistryForbiddenFields.map((field) => [field.toLowerCase(), field]),
);

const validateLocalExportFileQuery = (context: ApiRuntimeHandlerContext) => {
  for (const field of Object.keys(context.query)) {
    const forbiddenField = localExportFileForbiddenQueryFields.get(field.toLowerCase());

    if (forbiddenField) {
      throw invalidRequest(
        forbiddenField,
        "Unsafe local export file handoff request fields are not accepted.",
      );
    }

    if (localExportFileModeFields.has(field)) {
      throw unsupportedExportMode("local-file-handoff-mode-override");
    }

    if (!localExportFileAllowedQueryFields.has(field)) {
      throw invalidRequest(
        field,
        "Unsupported local export file handoff query field.",
      );
    }
  }
};

const localExportFileReferenceNow = (
  record: ExportArtifactRegistryRecord,
  now: string | undefined,
) => {
  if (now === undefined) {
    return Date.parse(record.createdAt);
  }

  const parsed = Date.parse(now);

  if (!Number.isFinite(parsed)) {
    throw invalidRequest("now", "now must be an ISO timestamp for local export file handoff review.");
  }

  return parsed;
};

const localExportFileRetentionState = (
  record: ExportArtifactRegistryRecord,
  now: string | undefined,
): LocalExportFileHandoff["retention"]["state"] => {
  const expiresAt = Date.parse(record.expiresAt);
  const referenceNow = localExportFileReferenceNow(record, now);

  return Number.isFinite(expiresAt) && expiresAt <= referenceNow ? "expired" : "active";
};

const localExportFileFormat = (
  record: ExportArtifactRegistryRecord,
  context: ApiRuntimeHandlerContext,
): ExportPreviewMode => {
  if (context.query.format === undefined) {
    return record.format;
  }

  const requestedFormat = exportFormat(context.query.format);

  if (requestedFormat !== record.format) {
    throw invalidRequest(
      "format",
      "Requested local export file format must match the registered artifact format.",
    );
  }

  return requestedFormat;
};

const deterministicExportArtifactForRecord = async (
  record: ExportArtifactRegistryRecord,
  format: ExportPreviewMode,
  context: ApiRuntimeHandlerContext,
): Promise<ExportArtifact> => {
  const request: ExportWinnersRequest = {
    campaignId: record.campaignId,
    contractRootMode: "none",
    format,
    includeLocalePreference: true,
    includeRiskFlags: true,
    includeWalletType: true,
  };
  const localResult = context.service.exportWinners(request);

  if (localResult.ok) {
    return localResult.payload.artifact;
  }

  if (localResult.error.code === "CAMPAIGN_NOT_FOUND" && context.campaignDbRepository.projectExport) {
    const campaignDbDraft = await context.campaignDbRepository.getById(record.campaignId, {
      traceId: context.traceId,
    });

    if (campaignDbDraft) {
      const projection = await context.campaignDbRepository.projectExport(request, {
        traceId: context.traceId,
      });
      const payload = createRepositoryExportPreviewResponse(projection);

      return repositoryArtifactForRegistry(projection.artifact, payload);
    }
  }

  throw localErrorToRuntimeError(localResult.error, context);
};

const assertLocalExportFileArtifactMatchesRecord = (
  artifact: ExportArtifact,
  record: ExportArtifactRegistryRecord,
) => {
  const matchesRecord = artifact.campaignId === record.campaignId
    && artifact.batchId === record.batchId
    && artifact.format === record.format
    && artifact.fileName === record.fileName
    && artifact.mimeType === record.mimeType
    && artifact.metadata.checksum === record.checksum
    && artifact.metadata.checksumAlgorithm === record.checksumAlgorithm
    && artifact.metadata.payloadBytes === record.payloadBytes
    && artifact.metadata.totalRows === record.totalRows
    && artifact.metadata.readyRows === record.readyRows
    && artifact.metadata.reviewRequiredRows === record.reviewRequiredRows
    && artifact.metadata.blockedRows === record.blockedRows;

  if (!matchesRecord) {
    throw invalidRequest(
      "artifactId",
      "Local export file handoff record does not match the deterministic export artifact.",
    );
  }
};

const localExportFileHandoffPayload = async (
  context: ApiRuntimeHandlerContext,
): Promise<{
  boundary: LocalExportFileHandoff["boundary"];
  payload: LocalExportFileHandoffPayload;
}> => {
  validateLocalExportFileQuery(context);

  const result = context.exportArtifactRegistry.get({
    artifactId: requiredRouteParam(context.params, "artifactId"),
    campaignId: requiredRouteParam(context.params, "campaignId"),
  });

  if (!result.ok) {
    throw invalidRequest(
      result.diagnostics[0]?.field ?? "artifactId",
      result.diagnostics[0]?.message ?? "Export artifact audit record was not found.",
    );
  }

  const record = result.payload.record;
  const requestedFormat = localExportFileFormat(record, context);
  const retentionState = localExportFileRetentionState(record, optionalString(context.query.now));

  if (retentionState === "expired") {
    throw invalidRequest(
      "retention",
      "LOCAL_EXPORT_FILE_EXPIRED: local export file handoff retention has expired.",
    );
  }

  const artifact = await deterministicExportArtifactForRecord(record, requestedFormat, context);

  assertLocalExportFileArtifactMatchesRecord(artifact, record);

  const handoff = createLocalExportFileHandoff(artifact, {
    artifactId: record.artifactId,
    retention: {
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      mode: record.retention.mode,
      productionStorageBacked: false,
      purgeRequired: record.retention.purgeRequired,
      state: retentionState,
      ttlHours: record.retention.ttlHours,
    },
    traceId: context.traceId,
  });

  return {
    boundary: handoff.boundary,
    payload: {
      artifactId: record.artifactId,
      auditDetail: {
        batchId: record.batchId,
        checksum: record.checksum,
        checksumAlgorithm: record.checksumAlgorithm,
        fileName: record.fileName,
        payloadBytes: record.payloadBytes,
        previewRouteId: record.routeId,
        previewTraceId: record.traceId,
        retentionState,
        source: "deterministic_local_export",
      },
      campaignId: record.campaignId,
      handoff,
      safety: handoff.safety,
    },
  };
};

const createRepositoryExportReadinessResponse = (
  readiness: CampaignDbExportReadinessProjection,
): CampaignDbExportReadinessProjection => readiness;

const campaignDbDraftToDiscoveryDetail = (
  draft: CampaignDbReadProjection,
): CampaignDiscoveryDetail => {
  const item = campaignDbDraftToDiscoveryItem(draft);

  return {
    appHubContext: campaignDbBoundary,
    boundary: campaignDbBoundary,
    eligibilityEntry: localized(
      "Eligibility remains deferred for repository-created campaign drafts.",
      "Repository 创建的活动草稿暂不执行资格校验。",
    ),
    forecastContext: campaignDbBoundary,
    item,
    portfolioContext: campaignDbBoundary,
    rewardBoundary: localized(draft.rewardDescription, draft.rewardDescription),
    tasks: item.coreTasks,
  };
};

const mergeCampaignDbDraftsIntoDiscovery = (
  discovery: CampaignDiscoveryReadModel,
  drafts: readonly CampaignDbReadProjection[],
) => {
  const draftDetails = drafts.map(campaignDbDraftToDiscoveryDetail);
  const items = [...draftDetails.map((detail) => detail.item), ...discovery.items];
  const details = [...draftDetails, ...discovery.details];

  return {
    ...discovery,
    campaignDb: createCampaignDbSummary(drafts),
    details,
    items,
    summary: createCampaignDiscoverySummary(items),
  };
};

const campaignDbDraftsToOwnerDiscovery = (
  drafts: readonly CampaignDbReadProjection[],
): CampaignDiscoveryReadModel & {
  campaignDb: ReturnType<typeof createCampaignDbSummary>;
} => {
  const details = drafts.map(campaignDbDraftToDiscoveryDetail);
  const items = details.map((detail) => detail.item);

  return {
    boundary: campaignDbBoundary,
    campaignDb: createCampaignDbSummary(drafts),
    campaignId: "campaign-db-owner-recovery",
    details,
    items,
    nextAction: localized(
      "Continue editing repository-backed campaign drafts.",
      "继续编辑 repository-backed 活动草稿。",
    ),
    summary: createCampaignDiscoverySummary(items),
  };
};

const campaignDbCreateDraftInput = (
  payload: LocalCampaignDraft,
): CampaignDbCreateDraftInput => ({
  contractMode: payload.contractMode,
  defaultLocale: payload.defaultLocale,
  duration: payload.duration,
  endTime: payload.endTime,
  goal: payload.goal,
  metadataHash: payload.metadataHash,
  metadataUri: payload.metadataUri,
  ownerAddress: payload.ownerAddress,
  projectId: payload.projectId,
  publishReadiness: payload.publishReadiness,
  rewardDescription: payload.rewardDescription,
  rewardDisclaimerHash: payload.rewardDisclaimerHash,
  startTime: payload.startTime,
  status: payload.status,
  supportedLocales: payload.supportedLocales,
  walletPolicy: payload.walletPolicy,
});

const campaignDbCreateDraftInputFromRequest = (
  request: CreateCampaignRequest,
): CampaignDbCreateDraftInput => ({
  contractMode: request.contractMode,
  defaultLocale: request.defaultLocale,
  duration: request.duration,
  endTime: request.endTime,
  goal: request.goal,
  metadataHash: request.metadataHash,
  metadataUri: request.metadataUri,
  ownerAddress: request.ownerAddress,
  projectId: request.projectId,
  rewardDescription: request.rewardDescription,
  rewardDisclaimerHash: request.rewardDisclaimerHash,
  startTime: request.startTime,
  status: request.status,
  supportedLocales: request.supportedLocales,
  walletPolicy: request.walletPolicy,
});

const campaignDbDraftToLocalCampaignDraft = (
  draft: CampaignDbDraft,
): LocalCampaignDraft => ({
  contractMode: draft.contractMode,
  defaultLocale: draft.defaultLocale,
  duration: draft.duration,
  endTime: draft.endTime,
  goal: draft.goal,
  id: draft.id,
  ...(draft.metadataHash ? { metadataHash: draft.metadataHash } : {}),
  ...(draft.metadataUri ? { metadataUri: draft.metadataUri } : {}),
  ownerAddress: draft.ownerAddress,
  projectId: draft.projectId,
  publishReadiness: draft.publishReadiness,
  rewardBoundary: campaignDbBoundary,
  rewardDescription: draft.rewardDescription,
  ...(draft.rewardDisclaimerHash ? { rewardDisclaimerHash: draft.rewardDisclaimerHash } : {}),
  startTime: draft.startTime,
  status: draft.status,
  supportedLocales: draft.supportedLocales,
  walletPolicy: draft.walletPolicy,
});

const campaignDbLifecycleLimitedBoundary = localized(
  "Campaign DB draft is available for limited local lifecycle/readiness inspection only. Full seeded lifecycle gates are not available for repository-created drafts.",
  "Campaign DB 草稿仅支持有限的本地 lifecycle/readiness 检查。Repository 创建的草稿不提供完整 seeded lifecycle gate。",
);

const campaignDbDraftToLifecycleLimitedProjection = (draft: CampaignDbReadProjection) => ({
  boundary: campaignDbLifecycleLimitedBoundary,
  campaignId: draft.id,
  code: "CAMPAIGN_DB_DRAFT_LIFECYCLE_LIMITED",
  contractMode: draft.contractMode,
  diagnostic: {
    code: "CAMPAIGN_DB_DRAFT_LIFECYCLE_LIMITED",
    fullSeededLifecycleAvailable: false,
    message: localized(
      "Repository-created campaign draft lacks the seeded shell detail required for full lifecycle, launch, provider, and export readiness gates.",
      "Repository 创建的活动草稿缺少完整 lifecycle、launch、provider 与 export readiness gate 所需的 seeded shell detail。",
    ),
  },
  fullSeededLifecycleAvailable: false,
  publishReadiness: draft.publishReadiness,
  source: "campaign_db_draft" as const,
  status: draft.status,
  supportedLocales: [...draft.supportedLocales],
  walletPolicy: draft.walletPolicy,
});

const campaignIdRequest = (
  context: ApiRuntimeHandlerContext,
): GetCampaignAnalyticsRequest => ({
  campaignId: requiredRouteParam(context.params, "campaignId"),
});

const campaignLifecycleRequest = (
  context: ApiRuntimeHandlerContext,
): GetCampaignLifecycleOperationsRequest => campaignIdRequest(context);

const launchConsoleRequest = (
  context: ApiRuntimeHandlerContext,
): GetLaunchConsoleCampaignBundlesRequest => campaignIdRequest(context);

const deliveryChecklistReadinessRequest = (
  context: ApiRuntimeHandlerContext,
): GetDeliveryChecklistReadinessRequest => campaignIdRequest(context);

const companionContractReadinessRequest = (
  context: ApiRuntimeHandlerContext,
): GetCompanionContractReadinessRequest => campaignIdRequest(context);

const contractTransparencyRequest = (
  context: ApiRuntimeHandlerContext,
): GetContractTransparencyRequest => campaignIdRequest(context);

const verificationPipelineReadinessRequest = (
  context: ApiRuntimeHandlerContext,
): GetVerificationPipelineReadinessRequest => campaignIdRequest(context);

const providerEvidenceRegistryRequest = (
  context: ApiRuntimeHandlerContext,
): GetProviderEvidenceRegistryRequest => campaignIdRequest(context);

const unwrapCampaignReadinessOrDraft = async <TPayload>(
  context: ApiRuntimeHandlerContext,
  result: LocalServiceResult<TPayload>,
) => {
  if (result.ok || result.error.code !== "CAMPAIGN_NOT_FOUND") {
    return unwrapLocalResult(result, context);
  }

  const campaignId = requiredRouteParam(context.params, "campaignId");
  const campaignDbDraft = await context.campaignDbRepository.getById(campaignId, {
    traceId: context.traceId,
  });

  if (campaignDbDraft) {
    return {
      boundary: campaignDbLifecycleLimitedBoundary,
      campaignDb: {
        adapterId: campaignDbDraft.repository.adapterId,
        createdViaRepository: true,
        repositoryId: campaignDbDraft.repository.repositoryId,
        storeId: campaignDbDraft.repository.storeId,
      },
      payload: campaignDbDraftToLifecycleLimitedProjection(campaignDbDraft),
    };
  }

  return unwrapLocalResult(result, context);
};

const createPublishDeliveryReviewBackendRuntimeInput = (
  report: BackendServiceReadinessReport,
): PublishDeliveryReviewBackendRuntimeInput => {
  const routeCountByReadiness = (readiness: "ready" | "review_required" | "blocked") =>
    apiRuntimeRoutes.filter((route) => route.readiness === readiness).length;
  const validationBlockers = report.validation.issues.map((issue) => ({
    code: issue.code,
    field: issue.field,
    message: issue.message,
    severity: issue.severity,
  }));
  const dependencyBlockers = [
    ...report.apiService.blockedDependencyIds,
    ...report.apiService.deferredDependencyIds,
  ].map((dependencyId) => ({
    code: "PRODUCTION_DEPENDENCY_DEFERRED",
    field: dependencyId,
    message: `${dependencyId} is not active in the local-review runtime.`,
    severity: "warning" as const,
  }));

  return {
    noLiveSideEffects: {
      analyticsWarehouseWriteExecuted: false,
      contractWriteExecuted: report.apiService.contractWriteEnabled,
      migrationRunnerExecuted: report.persistenceFoundation.liveMigrationExecutionEnabled,
      productionDatabaseWriteExecuted: report.persistenceFoundation.liveQueryExecutionEnabled,
      providerCallExecuted: report.providerClientReadiness.liveProviderCallsAttempted,
      queueExecutionExecuted: report.queueRuntimeFoundation.dryRunEnqueue.liveQueuePublishingEnabled,
      rewardCustodyExecuted: false,
      rewardDistributionExecuted: false,
      schedulerExecutionExecuted: false,
      storageWriteExecuted: false,
      walletSignatureExecuted: report.authSessionFoundation.liveSigningExecuted,
    },
    productionDependencyBlockers: [...validationBlockers, ...dependencyBlockers],
    productionReady: report.apiService.productionReady,
    profileId: report.apiService.profileId,
    routeCoverage: {
      blockedCount: routeCountByReadiness("blocked"),
      readyCount: routeCountByReadiness("ready"),
      reviewRequiredCount: routeCountByReadiness("review_required"),
      routeCount: apiRuntimeRoutes.length,
    },
    status: report.apiService.productionReady
      ? "ready"
      : report.validation.issues.length > 0
        ? "blocked"
        : "scaffold",
  };
};

const repositoryEvidenceFromTaskEvidence = (
  taskEvidence: readonly CampaignDbTaskEvidenceRecord[],
  draft?: CampaignDbReadProjection,
): PublishDeliveryReviewRepositoryEvidenceInput => {
  const evidenceWithHash = taskEvidence.filter((evidence) => evidence.evidenceHash.trim().length > 0);
  const completedEvidenceCount = taskEvidence.filter((evidence) => evidence.status === "completed").length;
  const manualReviewEvidenceCount = taskEvidence.filter((evidence) => evidence.status === "manual_review").length;
  const failedEvidenceCount = taskEvidence.filter((evidence) => evidence.status === "failed").length;

  return {
    available: Boolean(draft) || taskEvidence.length > 0,
    completedEvidenceCount,
    createdViaRepository: draft?.repository.createdViaRepository,
    evidenceHashCoverage: taskEvidence.length > 0 ? evidenceWithHash.length / taskEvidence.length : 0,
    failedEvidenceCount,
    manualReviewEvidenceCount,
    repositoryId: draft?.repository.repositoryId,
    storeId: draft?.repository.storeId,
    taskEvidenceCount: taskEvidence.length,
  };
};

const createRepositoryEvidenceInput = async (
  context: ApiRuntimeHandlerContext,
  campaignId: string,
): Promise<PublishDeliveryReviewRepositoryEvidenceInput> => {
  const campaignDbDraft = await context.campaignDbRepository.getById(campaignId, {
    traceId: context.traceId,
  });
  const taskEvidence = context.campaignDbRepository.listTaskEvidence
    ? await context.campaignDbRepository.listTaskEvidence({ campaignId }, { traceId: context.traceId })
    : [];
  const repositoryEvidence = repositoryEvidenceFromTaskEvidence(taskEvidence, campaignDbDraft);

  if (campaignDbDraft && context.campaignDbRepository.projectExport) {
    try {
      const projection = await context.campaignDbRepository.projectExport({
        campaignId,
        contractRootMode: "none",
        format: "json",
        includeLocalePreference: true,
        includeRiskFlags: true,
        includeWalletType: true,
      }, {
        traceId: context.traceId,
      });
      const exportRowsWithEvidence = projection.rows.filter((row) => row.evidenceHashes.length > 0).length;
      const exportEvidenceHashCount = projection.rows.reduce(
        (total, row) => total + row.evidenceHashes.length,
        0,
      );

      return {
        ...repositoryEvidence,
        available: true,
        exportRowsWithEvidence,
        evidenceHashCoverage: Math.max(
          repositoryEvidence.evidenceHashCoverage ?? 0,
          projection.rows.length > 0 ? exportRowsWithEvidence / projection.rows.length : 0,
          taskEvidence.length > 0 ? exportEvidenceHashCount / taskEvidence.length : 0,
        ),
      };
    } catch (error) {
      if (error instanceof CampaignDbRepositoryError) {
        return repositoryEvidence;
      }

      throw error;
    }
  }

  return repositoryEvidence;
};

const createPublishDeliveryReviewPayload = async (
  context: ApiRuntimeHandlerContext,
): Promise<{ boundary: LocalizedText; payload: PublishDeliveryReview }> => {
  const campaignId = requiredRouteParam(context.params, "campaignId");
  const detailResult = context.service.getCampaignDetail({ campaignId });
  const campaignDbDraft = await context.campaignDbRepository.getById(campaignId, {
    traceId: context.traceId,
  });

  if (!detailResult.ok && !campaignDbDraft) {
    unwrapLocalResult(detailResult, context);
    throw invalidCampaign(campaignId);
  }

  const launchResult = detailResult.ok
    ? context.service.getLaunchConsoleCampaignBundles({ campaignId })
    : {
      boundary: campaignDbBoundary,
      ok: true as const,
      payload: createLaunchConsoleCampaignBundles(campaignDetail),
    };
  const deliveryResult = detailResult.ok
    ? context.service.getDeliveryChecklistReadiness({ campaignId })
    : {
      boundary: campaignDbBoundary,
      ok: true as const,
      payload: {
        campaignId,
        ...createDeliveryChecklistReadinessConsole(),
      },
    };
  const launchResponse = unwrapLocalResult(launchResult, context);
  const deliveryResponse = unwrapLocalResult(deliveryResult, context);
  const backendRuntime = createPublishDeliveryReviewBackendRuntimeInput(
    context.backendServiceReadiness(),
  );
  const repositoryEvidence = await createRepositoryEvidenceInput(context, campaignId);

  return {
    boundary: context.route.boundary,
    payload: createPublishDeliveryReview({
      backendRuntime,
      campaignId,
      deliveryChecklist: deliveryResponse.payload,
      diagnostics: detailResult.ok
        ? []
        : [
          {
            code: "CAMPAIGN_DB_DRAFT_REVIEW_SCAFFOLD",
            message: localized(
              "Repository-created drafts use the local seeded publish and delivery review scaffold until full draft-to-builder projection lands.",
              "Repository 创建的草稿暂用本地 seeded 发布与交付 review scaffold，直到完整 draft-to-builder projection 落地。",
            ),
            severity: "info",
            source: "campaignDb",
          },
        ],
      launchBundles: launchResponse.payload,
      publishGate: createPublishGateDecisionCenter(seededCampaignDraft),
      repositoryEvidence,
      traceId: context.traceId,
    }),
  };
};

const createPointsRankingLedgerRuntimePayload = (
  context: ApiRuntimeHandlerContext,
): { boundary: LocalizedText; payload: PointsRankingLedgerRuntime } => {
  const campaignId = requiredRouteParam(context.params, "campaignId");
  const detailResult = context.service.getCampaignDetail({ campaignId });

  if (!detailResult.ok) {
    unwrapLocalResult(detailResult, context);
    throw invalidCampaign(campaignId);
  }

  return {
    boundary: context.route.boundary,
    payload: createPointsRankingLedgerRuntime(campaignDetail, {
      source: "api_runtime",
      traceId: context.traceId,
    }),
  };
};

const createObjectStorageExportRuntimeManifest = () => ({
  artifacts: campaignDetail.exportPreview.rows[0]?.exportBatchId
    ? [{
      batchId: campaignDetail.exportPreview.rows[0].exportBatchId,
      format: "csv",
    }]
    : [],
  retentionClass: "review_only" as const,
});

const createObjectStorageExportReadinessPayload = (
  context: ApiRuntimeHandlerContext,
): {
  boundary: LocalizedText;
  payload: ObjectStorageExportReadiness & {
    campaignId: string;
    source: "api_runtime";
    traceId: string;
  };
} => {
  const campaignId = requiredRouteParam(context.params, "campaignId");
  const detailResult = context.service.getCampaignDetail({ campaignId });

  if (!detailResult.ok) {
    unwrapLocalResult(detailResult, context);
    throw invalidCampaign(campaignId);
  }

  return {
    boundary: context.route.boundary,
    payload: {
      ...createObjectStorageExportReadiness({
        manifest: {
          ...createObjectStorageExportRuntimeManifest(),
          traceId: context.traceId,
        },
      }),
      campaignId,
      source: "api_runtime",
      traceId: context.traceId,
    },
  };
};

const createAnalyticsIngestionRuntimeReadinessPayload = (
  context: ApiRuntimeHandlerContext,
) => {
  const campaignId = requiredRouteParam(context.params, "campaignId");
  const detailResult = context.service.getCampaignDetail({ campaignId });

  if (!detailResult.ok) {
    unwrapLocalResult(detailResult, context);
    throw invalidCampaign(campaignId);
  }

  return {
    boundary: context.route.boundary,
    payload: createServerAnalyticsIngestionRuntimeReadiness({
      campaign: campaignDetail,
      traceId: context.traceId,
    }),
  };
};

const createContractWriterRuntimeReadinessPayload = (
  context: ApiRuntimeHandlerContext,
) => {
  const campaignId = requiredRouteParam(context.params, "campaignId");
  const detailResult = context.service.getCampaignDetail({ campaignId });

  if (!detailResult.ok) {
    unwrapLocalResult(detailResult, context);
    throw invalidCampaign(campaignId);
  }

  return {
    boundary: context.route.boundary,
    payload: createServerContractWriterRuntimeReadiness({
      campaign: campaignDetail,
      traceId: context.traceId,
    }),
  };
};

const createRewardDistributionHandoffReadinessPayload = (
  context: ApiRuntimeHandlerContext,
) => {
  const campaignId = requiredRouteParam(context.params, "campaignId");
  const detailResult = context.service.getCampaignDetail({ campaignId });

  if (!detailResult.ok) {
    unwrapLocalResult(detailResult, context);
    throw invalidCampaign(campaignId);
  }

  return {
    boundary: context.route.boundary,
    payload: createServerRewardDistributionHandoffReadiness({
      campaign: campaignDetail,
      traceId: context.traceId,
    }),
  };
};

const createProjectOwnerFundingProofReviewBridgePayload = (
  context: ApiRuntimeHandlerContext,
  proofPackage?: ProjectOwnerFundingProofPackageInput,
) => {
  const campaignId = requiredRouteParam(context.params, "campaignId");
  const detailResult = context.service.getCampaignDetail({ campaignId });

  if (!detailResult.ok) {
    unwrapLocalResult(detailResult, context);
    throw invalidCampaign(campaignId);
  }

  return {
    boundary: context.route.boundary,
    payload: createServerProjectOwnerFundingProofReviewBridge({
      campaign: campaignDetail,
      proofPackage,
      traceId: context.traceId,
    }),
  };
};

const projectOwnerFundingProofPackageInput = (
  context: ApiRuntimeHandlerContext,
): ProjectOwnerFundingProofPackageInput => (
  bodyRecord(context.body) as ProjectOwnerFundingProofPackageInput
);

const createProviderReadinessResult = (
  pipeline: LocalServiceResult<VerificationPipelineReadinessGate>,
  providerEvidenceRegistry: LocalServiceResult<ProviderEvidenceRegistry>,
): LocalServiceResult<{
  campaignId: string;
  pipeline: VerificationPipelineReadinessGate;
  providerEvidenceRegistry: ProviderEvidenceRegistry;
}> => {
  if (!pipeline.ok) {
    return pipeline;
  }

  if (!providerEvidenceRegistry.ok) {
    return providerEvidenceRegistry;
  }

  return {
    boundary: pipeline.boundary,
    ok: true,
    payload: {
      campaignId: providerEvidenceRegistry.payload.campaignId,
      pipeline: pipeline.payload,
      providerEvidenceRegistry: providerEvidenceRegistry.payload,
    },
  };
};

const canUseCampaignDbCreateFallback = (error: LocalServiceError) =>
  error.code === "UNSUPPORTED_LOCALE" && error.field === "supportedLocales";

const eligibilityRequest = (context: ApiRuntimeHandlerContext): CheckEligibilityRequest => {
  const walletAddress = context.query.walletAddress ?? context.query.address;

  if (!walletAddress) {
    throw invalidRequest("walletAddress", "Eligibility checks require walletAddress or address query.");
  }

  return {
    accountType: optionalAccountType(context.query.accountType),
    campaignId: requiredRouteParam(context.params, "campaignId"),
    walletAddress,
    walletSource: optionalWalletSource(context.query.walletSource),
  };
};

const exportRequest = (context: ApiRuntimeHandlerContext): ExportWinnersRequest => {
  const body = bodyRecord(context.body);

  return {
    campaignId: requiredRouteParam(context.params, "campaignId"),
    contractRootMode: exportContractRootMode(body.contractRootMode),
    format: exportFormat(body.format),
    includeLocalePreference: body.includeLocalePreference !== false,
    includeRiskFlags: body.includeRiskFlags !== false,
    includeWalletType: body.includeWalletType !== false,
  };
};

const exportArtifactAuditListRequest = (context: ApiRuntimeHandlerContext) => ({
  artifactId: optionalString(context.query.artifactId),
  batchId: optionalString(context.query.batchId),
  campaignId: requiredRouteParam(context.params, "campaignId"),
  format: optionalString(context.query.format),
  retentionState: optionalString(context.query.retentionState),
  traceId: optionalString(context.query.traceId),
});

const exportArtifactAuditDetailRequest = (context: ApiRuntimeHandlerContext) => ({
  artifactId: requiredRouteParam(context.params, "artifactId"),
  campaignId: requiredRouteParam(context.params, "campaignId"),
});

const i18nDraftRequest = (context: ApiRuntimeHandlerContext): GenerateI18nDraftRequest => {
  const body = bodyRecord(context.body);

  return {
    campaignId: requiredRouteParam(context.params, "campaignId"),
    contentKeys: Array.isArray(body.contentKeys)
      ? body.contentKeys.filter((key): key is string => typeof key === "string")
      : ["title", "description", "rewardDisclaimer"],
    sourceLocale: optionalLocale(body.sourceLocale, "sourceLocale") ?? "en-US",
    targetLocale: optionalLocale(body.targetLocale ?? context.query.locale, "targetLocale") ?? "zh-CN",
  };
};

const agentWalletActionRequest = (context: ApiRuntimeHandlerContext): AgentWalletActionReadinessRequest => {
  const body = bodyRecord(context.body);

  return {
    actionIntent: requiredString(body, "actionIntent"),
    agentId: requiredString(body, "agentId"),
    campaignId: requiredString(body, "campaignId"),
    chainId: requiredString(body, "chainId"),
    evidencePurpose: requiredString(body, "evidencePurpose"),
    humanApprovalState: requiredAgentWalletHumanApprovalState(body),
    network: requiredWalletNetwork(body),
    operatorRole: requiredOwnerRole(body),
    taskId: requiredString(body, "taskId"),
    walletSource: requiredWalletSource(body),
  };
};

const generateCampaignTasksRequest = (context: ApiRuntimeHandlerContext): GenerateCampaignTasksRequest => {
  const body = bodyRecord(context.body);

  return {
    campaignId: requiredRouteParam(context.params, "campaignId"),
    goal: requiredString(body, "goal"),
    product: requiredString(body, "product"),
    targetUsers: requiredNonEmptyStringArray(body, "targetUsers"),
    walletPolicy: requiredWalletPolicy(body),
  };
};

const generateCampaignPostsRequest = (context: ApiRuntimeHandlerContext): GenerateCampaignPostsRequest => {
  const body = bodyRecord(context.body);

  return {
    campaignId: requiredRouteParam(context.params, "campaignId"),
    channel: campaignPostChannel(body),
    contentKeys: campaignPostContentKeyArray(body.contentKeys),
    sourceLocale: optionalLocale(body.sourceLocale, "sourceLocale"),
    targetLocales: optionalLocaleArray(body.targetLocales),
  };
};

const summarizeCampaignRequest = (context: ApiRuntimeHandlerContext): SummarizeCampaignRequest => ({
  campaignId: requiredRouteParam(context.params, "campaignId"),
  period: summaryPeriod(context.query.period),
});

const createApiFoundationRuntimeMetadata = () => {
  const foundation = createApiFoundationReport();
  const servicePorts = createApiServicePortReport({ foundation });

  return {
    coverage: foundation.coverage,
    envelopes: {
      error: foundation.errorEnvelopes,
      success: foundation.responseEnvelopes,
    },
    requestContracts: foundation.requestContracts,
    requestFields: foundation.requestFields,
    routes: foundation.routes,
    servicePorts,
    surfaces: foundation.surfaces,
    validation: foundation.validation,
  };
};

const backendServiceEntrypointMetadata = (report: BackendServiceReadinessReport) => ({
  foundationValidationValid: report.entrypoint.foundationValidationValid,
  id: report.entrypoint.id,
  label: report.entrypoint.label,
  profileId: report.entrypoint.profileId,
  routeCount: report.entrypoint.routeCount,
  runtimeName: report.entrypoint.runtimeName,
  supportMode: report.entrypoint.supportMode,
  version: report.entrypoint.version,
});

const backendConfigContractSummary = (report: BackendServiceReadinessReport) => ({
  diagnosticCodes: report.config.diagnostics.map((diagnostic) => diagnostic.code),
  diagnosticsCount: report.config.diagnostics.length,
  hostConfigured: Boolean(report.config.host),
  persistenceMode: report.config.persistenceMode,
  portConfigured: Number.isFinite(report.config.port),
  productionReadiness: {
    deferredCapabilities: report.config.productionReadiness.deferredCapabilities,
    missingConfigKeyCount: report.config.productionReadiness.missingConfigKeys.length,
    requiredConfigKeyCount: report.config.productionReadiness.requiredConfigKeys.length,
    status: report.config.productionReadiness.status,
  },
  profileId: report.config.profileId,
  requestedProfileId: report.config.requestedProfileId,
  valid: report.config.valid,
});

const backendPersistenceAdapterSummary = (report: BackendServiceReadinessReport) => ({
  activeAdapter: {
    durable: report.persistenceAdapters.activeAdapter.durable,
    id: report.persistenceAdapters.activeAdapter.id,
    kind: report.persistenceAdapters.activeAdapter.kind,
    localOnly: report.persistenceAdapters.activeAdapter.localOnly,
    status: report.persistenceAdapters.activeAdapter.status,
  },
  adapterCount: report.persistenceAdapters.adapters.length,
  productionAdapterStatuses: report.persistenceAdapters.adapters
    .filter((adapter) => adapter.kind === "production_deferred")
    .map((adapter) => ({
      id: adapter.id,
      status: adapter.status,
    })),
  storeCount: report.persistenceAdapters.stores.length,
  validationIssueCount: report.persistenceAdapters.validation.issues.length,
  valid: report.persistenceAdapters.validation.valid,
});

const backendMigrationManifestSummary = (report: BackendServiceReadinessReport) => ({
  manifestVersion: report.migration.manifestVersion,
  noDestructiveOperations: report.migration.noDestructiveOperations,
  noLiveMigrationCommand: report.migration.noLiveMigrationCommand,
  noMigrationRunner: report.migration.noMigrationRunner,
  runnerStatus: report.migration.runnerStatus,
  storeCount: report.migration.stores.length,
  validationIssueCount: report.migration.validation.issues.length,
  valid: report.migration.validation.valid,
});

const createBackendRuntimeBootstrapMetadata = (
  report: BackendServiceReadinessReport,
) => ({
  deferredDependencyIds: report.backendRuntimeBootstrap.deferredDependencyIds,
  diagnosticCodes: report.backendRuntimeBootstrap.diagnosticCodes,
  diagnostics: report.backendRuntimeBootstrap.diagnostics,
  id: report.backendRuntimeBootstrap.id,
  profileId: report.backendRuntimeBootstrap.profileId,
  readiness: report.backendRuntimeBootstrap.readiness,
  requestGuard: report.backendRuntimeBootstrap.requestGuard,
  runtimeVersion: report.backendRuntimeBootstrap.runtimeVersion,
  shutdown: report.backendRuntimeBootstrap.shutdown,
  startup: report.backendRuntimeBootstrap.startup,
  status: report.backendRuntimeBootstrap.status,
  supportMode: report.backendRuntimeBootstrap.supportMode,
  tracePolicy: report.backendRuntimeBootstrap.tracePolicy,
  uptimeMs: report.backendRuntimeBootstrap.uptimeMs,
  valid: report.backendRuntimeBootstrap.valid,
});

const createBackendServiceHealthMetadata = (
  report: BackendServiceReadinessReport,
  traceId: string,
) => ({
  adapterStatus: report.persistenceAdapters.activeAdapter.status,
  apiFoundationValidationIssueCount: report.apiFoundation.validation.issues.length,
  analyticsIngestionRuntime: report.analyticsIngestionRuntime,
  authSessionFoundation: report.authSessionFoundation,
  backendRuntimeBootstrap: createBackendRuntimeBootstrapMetadata(report),
  contractWriterRuntime: report.contractWriterRuntime,
  entrypoint: backendServiceEntrypointMetadata(report),
  entrypointId: report.entrypoint.id,
  databaseAdapterRuntime: createBackendDatabaseAdapterRuntimeSummary(report.databaseAdapterRuntime),
  migrationRunnerStatus: report.migration.runnerStatus,
  objectStorageExportRuntime: report.objectStorageExportRuntime,
  persistenceFoundation: report.persistenceFoundation,
  persistenceRuntime: createBackendPersistenceRuntimeSummary(report.persistenceRuntime),
  projectOwnerFundingProofReviewBridge: report.projectOwnerFundingProofReviewBridge,
  rewardDistributionHandoffRuntime: report.rewardDistributionHandoffRuntime,
  profile: {
    id: report.profile.id,
    status: report.profile.status,
    supportMode: report.profile.supportMode,
  },
  profileId: report.profile.id,
  traceId,
  validation: {
    issueCount: report.validation.issues.length,
    issues: report.validation.issues,
    valid: report.validation.valid,
  },
});

const createBackendServiceContractMetadata = (report: BackendServiceReadinessReport) => ({
  attachMapAreas: report.attachMap.map((attachPoint) => ({
    area: attachPoint.area,
    currentStatus: attachPoint.currentStatus,
    requiredBeforeProduction: attachPoint.requiredBeforeProduction,
  })),
  backendRuntimeBootstrap: createBackendRuntimeBootstrapMetadata(report),
  configContract: backendConfigContractSummary(report),
  analyticsIngestionRuntime: report.analyticsIngestionRuntime,
  authSessionFoundation: report.authSessionFoundation,
  contractWriterRuntime: report.contractWriterRuntime,
  databaseAdapterRuntime: createBackendDatabaseAdapterRuntimeSummary(report.databaseAdapterRuntime),
  deferredProductionCapabilities: report.profile.deferredCapabilities,
  entrypoint: backendServiceEntrypointMetadata(report),
  migrationManifest: backendMigrationManifestSummary(report),
  objectStorageExportRuntime: report.objectStorageExportRuntime,
  persistenceAdapterPort: backendPersistenceAdapterSummary(report),
  persistenceFoundation: report.persistenceFoundation,
  persistenceRuntime: createBackendPersistenceRuntimeSummary(report.persistenceRuntime),
  projectOwnerFundingProofReviewBridge: report.projectOwnerFundingProofReviewBridge,
  rewardDistributionHandoffRuntime: report.rewardDistributionHandoffRuntime,
  profile: {
    allowedCapabilities: report.profile.allowedCapabilities,
    deferredCapabilities: report.profile.deferredCapabilities,
    externalNetworkAllowed: report.profile.externalNetworkAllowed,
    id: report.profile.id,
    status: report.profile.status,
    supportMode: report.profile.supportMode,
  },
  reportShape: {
    sections: [
      "entrypoint",
      "profile",
      "config",
      "backendRuntimeBootstrap",
      "databaseAdapterRuntime",
      "persistenceAdapters",
      "persistenceFoundation",
      "persistenceRuntime",
      "projectOwnerFundingProofReviewBridge",
      "rewardDistributionHandoffRuntime",
      "migration",
      "apiFoundation",
      "topology",
      "attachMap",
      "validation",
    ],
    validationIssueCount: report.validation.issues.length,
    valid: report.validation.valid,
  },
});

const createSafeReadinessEnv = (report: BackendServiceReadinessReport) => {
  const missingKeys = new Set(report.config.productionReadiness.missingConfigKeys);

  return Object.fromEntries(
    report.config.productionReadiness.requiredConfigKeys.map((key) => [
      key,
      missingKeys.has(key) ? undefined : "configured",
    ]),
  );
};

const createProductionBackendReadinessMetadata = (
  report: BackendServiceReadinessReport,
) => {
  const env = createSafeReadinessEnv(report);

  return createProductionBackendReadinessSummary({
    activation: report.backendRuntimeBootstrap.activation,
    env,
    generatedAt: report.backendRuntimeBootstrap.startup.startedAt,
    routeCoverage: createApiRuntimeContractCoverage(),
    runtime: resolveApiServerRuntimeContract({
      env,
      host: report.config.host,
      port: report.config.port,
      profileId: report.config.profileId,
      shutdownTimeoutMs: report.backendRuntimeBootstrap.shutdown.shutdownTimeoutMs,
      startedAt: report.backendRuntimeBootstrap.startup.startedAt,
      version: report.config.version,
    }),
  });
};

export const createApiRuntimeHandlers = (): Record<ApiRuntimeRouteId, ApiRuntimeHandler> => ({
  "runtime.health": async (context) => {
    const apiFoundation = createApiFoundationRuntimeMetadata();
    const backendService = context.backendServiceReadiness();
    const productionBackendReadiness = createProductionBackendReadinessMetadata(backendService);
    const coverage = context.service.getCoverageSummary();
    const services = createServiceDegradationGovernance();
    const persistence = await context.repository.health();
    const topology = createBackendTopologyReport({
      knownRouteIds: apiRuntimeRoutes.map((route) => route.id),
    });

    return {
      apiFoundation,
      backendService: createBackendServiceHealthMetadata(backendService, context.traceId),
      boundary: coverage.boundary,
      mode: "local_seeded",
      capabilities: createApiRuntimeCapabilityCatalog(),
      persistence,
      productionBackendReadiness,
      routeCount: apiRuntimeRoutes.length,
      safety: createRuntimeSafety(),
      serviceGroups: apiRuntimeServiceGroups,
      serviceReadiness: coverage.ok
        ? {
            blockedCount: coverage.payload.blockedCount,
            localOnlyCount: coverage.payload.localOnlyCount,
            readyCount: coverage.payload.readyCount,
            reviewRequiredCount: coverage.payload.reviewRequiredCount,
            totalServices: coverage.payload.totalServices,
          }
        : undefined,
      serviceRegistry: services.summary,
      status: "ok",
      topology: {
        coverage: topology.coverage,
        profileReadiness: topology.profileReadiness,
        validation: topology.validation,
      },
      version: context.version,
    };
  },
  "runtime.contracts": async (context) => {
    const apiFoundation = createApiFoundationRuntimeMetadata();
    const backendService = context.backendServiceReadiness();
    const productionBackendReadiness = createProductionBackendReadinessMetadata(backendService);
    const persistence = await context.repository.health();
    const topology = createBackendTopologyReport({
      knownRouteIds: apiRuntimeRoutes.map((route) => route.id),
    });

    return {
      apiFoundation,
      apiSkillContracts: apiSkillContractRegistry,
      apiSkillSurface: createApiSkillContractSurface(),
      backendService: createBackendServiceContractMetadata(backendService),
      coverage: createApiRuntimeContractCoverage(),
      capabilities: createApiRuntimeCapabilityCatalog(),
      persistence: {
        boundary: persistenceBoundary,
        health: persistence,
      },
      productionBackendReadiness,
      routes: apiRuntimeRoutes,
      serviceGroups: apiRuntimeServiceGroups,
      topology,
    };
  },
  "backend.production-database.handoff-readiness": (context) => ({
    boundary: context.route.boundary,
    payload: createServerProductionDatabaseHandoffReadiness({
      traceId: context.traceId,
    }),
  }),
  "runtime.services": () => {
    const registry = createServiceRegistry();
    const governance = createServiceDegradationGovernance();

    return {
      boundary: governance.boundary,
      entries: registry.entries,
      governance,
      summary: governance.summary,
    };
  },
  "agent.wallet.action.review": (context) =>
    unwrapLocalResult(context.service.requestAgentWalletAction(agentWalletActionRequest(context)), context),
  "wallet.session.create": async (context) => {
    const request = bodyRecord(context.body) as CreateWalletSessionRequest;
    const result = context.service.createWalletSession(request);
    if (!result.ok) {
      return unwrapLocalResult(result, context);
    }

    const enrichedResult = {
      ...result,
      payload: walletSessionRepositoryPayload(
        request,
        enrichWalletSessionWithProofMetadata(request, result.payload),
      ),
    };

    const repositoryResult = await context.walletSessionRepository.upsertSession(
      enrichedResult.payload,
      { traceId: context.traceId },
    );

    const response = await persistLocalResult(
      enrichedResult,
      context,
      (payload) => ({
        accountType: payload.accountType,
        kind: "wallet_session",
        summary: {
          accountType: payload.accountType,
          chainId: payload.chainId,
          issuerMode: payload.issuer?.issuerMode ?? "not_evaluated",
          liveSigningExecuted: payload.issuer?.liveSigningExecuted ?? false,
          liveVerificationExecuted: payload.proof?.liveVerificationExecuted ?? false,
          network: payload.network,
          productionReady: payload.productionReadiness?.productionReady ?? false,
          proofStatus: payload.proof?.status ?? "not_evaluated",
          proofTrustLevel: payload.proof?.trustLevel ?? "untrusted",
          walletSource: payload.walletSource,
        },
        walletAddress: payload.address,
        walletSource: payload.walletSource,
      }),
    );

    return {
      ...response,
      walletSessionRepository: repositoryResult.metadata,
    };
  },
  "campaigns.list": async (context) => {
    const response = unwrapLocalResult(
      context.service.listCampaigns(listCampaignRequest(context)),
      context,
    );
    const drafts = await context.campaignDbRepository.list(campaignDbListFilter(context), {
      traceId: context.traceId,
    });

    return {
      ...response,
      payload: mergeCampaignDbDraftsIntoDiscovery(response.payload, drafts),
    };
  },
  "campaigns.owner.list": async (context) => {
    const drafts = await context.campaignDbRepository.list(ownerCampaignDbListFilter(context), {
      traceId: context.traceId,
    });

    return {
      boundary: campaignDbBoundary,
      payload: campaignDbDraftsToOwnerDiscovery(drafts),
    };
  },
  "campaigns.create": async (context) => {
    const request = createCampaignRequest(context);
    const localResult = context.service.createCampaign(request);

    if (!localResult.ok && !canUseCampaignDbCreateFallback(localResult.error)) {
      throw localErrorToRuntimeError(localResult.error, context);
    }

    const campaignDbDraft = await context.campaignDbRepository.createDraft(
      localResult.ok
        ? campaignDbCreateDraftInput(localResult.payload)
        : campaignDbCreateDraftInputFromRequest(request),
      { traceId: context.traceId },
    );
    const payload = {
      ...(localResult.ok
        ? localResult.payload
        : campaignDbDraftToLocalCampaignDraft(campaignDbDraft)),
      id: campaignDbDraft.id,
    };
    const response = await persistLocalResult({
      boundary: localResult.ok ? localResult.boundary : campaignDbBoundary,
      ok: true,
      payload,
    }, context, (persistedPayload) => ({
      campaignId: campaignDbDraft.id,
      kind: "campaign_draft",
      summary: {
        contractMode: persistedPayload.contractMode,
        projectId: persistedPayload.projectId,
        status: persistedPayload.status,
        walletPolicy: persistedPayload.walletPolicy,
      },
      walletAddress: persistedPayload.ownerAddress,
    }), {
      tolerateAuditFailureAfterCommit: true,
    });

    return {
      ...response,
      campaignDb: {
        createdViaRepository: true,
        draftId: campaignDbDraft.id,
        storeId: "campaign-db",
      },
    };
  },
  "campaigns.detail": async (context) => {
    const request = campaignDetailRequest(context);
    const campaignDbDraft = await context.campaignDbRepository.getById(request.campaignId, {
      traceId: context.traceId,
    });

    if (campaignDbDraft) {
      return {
        boundary: campaignDbBoundary,
        campaignDb: {
          adapterId: campaignDbDraft.repository.adapterId,
          createdViaRepository: true,
          repositoryId: campaignDbDraft.repository.repositoryId,
          storeId: campaignDbDraft.repository.storeId,
        },
        payload: campaignDbDraftToDiscoveryDetail(campaignDbDraft),
      };
    }

    return unwrapLocalResult(context.service.getCampaignDetail(request), context);
  },
  "campaigns.lifecycle": (context) =>
    unwrapCampaignReadinessOrDraft<CampaignLifecycleOperations>(
      context,
      context.service.getCampaignLifecycleOperations(campaignLifecycleRequest(context)),
    ),
  "campaigns.launch.readiness": (context) =>
    unwrapCampaignReadinessOrDraft<LaunchConsoleCampaignBundleSurface>(
      context,
      context.service.getLaunchConsoleCampaignBundles(launchConsoleRequest(context)),
    ),
  "campaigns.delivery.readiness": (context) =>
    unwrapLocalResult(
      context.service.getDeliveryChecklistReadiness(deliveryChecklistReadinessRequest(context)),
      context,
    ),
  "campaigns.publish.delivery.review": (context) => createPublishDeliveryReviewPayload(context),
  "campaigns.points.ranking.ledger.runtime": (context) => createPointsRankingLedgerRuntimePayload(context),
  "campaigns.analytics.ingestion.readiness": (context) => createAnalyticsIngestionRuntimeReadinessPayload(context),
  "campaigns.contract.writer.readiness": (context) => createContractWriterRuntimeReadinessPayload(context),
  "campaigns.reward.distribution.handoff.readiness": (context) =>
    createRewardDistributionHandoffReadinessPayload(context),
  "campaigns.reward.funding-proof.review": (context) =>
    createProjectOwnerFundingProofReviewBridgePayload(context),
  "campaigns.reward.funding-proof.review.submit": (context) =>
    createProjectOwnerFundingProofReviewBridgePayload(
      context,
      projectOwnerFundingProofPackageInput(context),
    ),
  "campaigns.export.storage.readiness": (context) => createObjectStorageExportReadinessPayload(context),
  "campaigns.companion.contract.readiness": (context) =>
    unwrapLocalResult(
      context.service.getCompanionContractReadiness(companionContractReadinessRequest(context)),
      context,
    ),
  "campaigns.contract.transparency": (context) =>
    unwrapLocalResult(
      context.service.getContractTransparency(contractTransparencyRequest(context)),
      context,
    ),
  "campaigns.provider.readiness": (context) =>
    unwrapCampaignReadinessOrDraft(
      context,
      createProviderReadinessResult(
        context.service.getVerificationPipelineReadiness(verificationPipelineReadinessRequest(context)),
        context.service.getProviderEvidenceRegistry(providerEvidenceRegistryRequest(context)),
      ),
    ),
  "campaigns.tasks.add": async (context) => {
    const request = addTaskRequest(context);
    const campaignDbDraft = await context.campaignDbRepository.getById(request.campaignId, {
      traceId: context.traceId,
    });
    const localResult = context.service.addTask(request);
    const campaignDbTask = campaignDbDraft
      ? await context.campaignDbRepository.addTaskDraft(campaignDbTaskDraftInput(request), {
        traceId: context.traceId,
      })
      : undefined;
    const result: LocalServiceResult<LocalTaskDraft> = campaignDbTask
      ? createTaskDraftResponse(request, campaignDbTask.id)
      : localResult;
    const response = await persistLocalResult(
      result,
      context,
      (payload) => ({
        campaignId: payload.campaignId,
        kind: "task_draft",
        summary: {
          points: payload.points,
          required: payload.required,
          templateCode: payload.templateCode,
          verificationType: payload.verificationType,
          walletCompatibility: payload.walletCompatibility,
        },
        taskId: payload.id,
      }),
      { tolerateAuditFailureAfterCommit: Boolean(campaignDbTask) },
    );

    return campaignDbTask
      ? {
        ...response,
        campaignDbTask: createCampaignDbTaskMetadata(campaignDbTask),
      }
      : response;
  },
  "campaigns.tasks.generate": async (context) => {
    const request = generateCampaignTasksRequest(context);
    const localResult = context.service.generateCampaignTasks(request);

    if (localResult.ok || localResult.error.code !== "CAMPAIGN_NOT_FOUND") {
      return unwrapLocalResult(localResult, context);
    }

    const campaignDbDraft = await context.campaignDbRepository.getById(request.campaignId, {
      traceId: context.traceId,
    });

    if (!campaignDbDraft) {
      return unwrapLocalResult(localResult, context);
    }

    return unwrapLocalResult(
      generateCampaignTasksPreview({
        ...request,
        campaignId: campaignDbDraft.id,
      }),
      context,
    );
  },
  "tasks.verify": async (context) => {
    const request = verifyTaskRequest(context);
    const localResult = context.service.verifyTask(request);
    let campaignDbCompletion: CampaignDbTaskCompletion | undefined;
    let campaignDbEvidence: CampaignDbTaskEvidenceRecord | undefined;
    let result: LocalServiceResult<VerifyTaskResponse> = localResult;

    if (!localResult.ok && localResult.error.code === "CAMPAIGN_NOT_FOUND") {
      const campaignDbDraft = await context.campaignDbRepository.getById(request.campaignId, {
        traceId: context.traceId,
      });
      const campaignDbTask = campaignDbDraft?.tasks.find((task) => task.id === request.taskId);

      if (campaignDbDraft && !campaignDbTask) {
        throw invalidTask(request.taskId);
      }

      if (campaignDbDraft && campaignDbTask) {
        const verification = await context.campaignDbRepository.upsertTaskVerification!({
          accountType: request.accountType,
          campaignId: request.campaignId,
          evidenceHash: `evidence-hash:${campaignDbTask.id}`,
          taskId: request.taskId,
          walletAddress: request.walletAddress,
          walletSource: request.walletSource,
        }, {
          traceId: context.traceId,
        }) satisfies CampaignDbTaskVerificationProjection;
        campaignDbCompletion = verification.completion;
        campaignDbEvidence = verification.evidence;
        result = {
          boundary: campaignDbBoundary,
          ok: true,
          payload: createRepositoryCompletionResponse(campaignDbCompletion, campaignDbTask, campaignDbEvidence),
        };
      }
    }

    const response = await persistLocalResult(
      result,
      context,
      (payload) => ({
        accountType: payload.accountType,
        campaignId: payload.campaignId,
        kind: "verification_attempt",
        summary: {
          evidenceSource: payload.evidenceSource,
          pointsAwarded: payload.pointsAwarded,
          riskFlags: payload.riskFlags,
          status: payload.status,
        },
        taskId: payload.taskId,
        walletAddress: payload.walletAddress,
        walletSource: payload.walletSource,
      }),
      { tolerateAuditFailureAfterCommit: Boolean(campaignDbCompletion) },
    );

    return campaignDbCompletion
      ? {
        ...response,
        campaignDbCompletion: createCampaignDbCompletionMetadata(campaignDbCompletion),
        ...(campaignDbEvidence ? { campaignDbEvidence: createCampaignDbEvidenceMetadata(campaignDbEvidence) } : {}),
      }
      : response;
  },
  "campaigns.eligibility": async (context) => {
    const request = eligibilityRequest(context);
    const localResult = context.service.checkEligibility(request);

    if (localResult.ok || localResult.error.code !== "CAMPAIGN_NOT_FOUND") {
      return unwrapLocalResult(localResult, context);
    }

    const campaignDbDraft = await context.campaignDbRepository.getById(request.campaignId, {
      traceId: context.traceId,
    });

    if (!campaignDbDraft) {
      return unwrapLocalResult(localResult, context);
    }

    const projection = await context.campaignDbRepository.checkEligibility!({
      accountType: request.accountType,
      campaignId: request.campaignId,
      walletAddress: request.walletAddress,
      walletSource: request.walletSource,
    }, {
      traceId: context.traceId,
    });

    return {
      boundary: campaignDbBoundary,
      campaignDb: {
        adapterId: projection.repository.adapterId,
        createdViaRepository: projection.repository.createdViaRepository,
        repositoryId: projection.repository.repositoryId,
        storeId: projection.repository.storeId,
      },
      payload: createRepositoryEligibilityResponse(projection),
    };
  },
  "campaigns.analytics": (context) =>
    unwrapLocalResult(
      context.service.getCampaignAnalytics({
        campaignId: context.params.campaignId,
      } satisfies GetCampaignAnalyticsRequest),
      context,
    ),
  "campaigns.summary": (context) =>
    unwrapLocalResult(context.service.summarizeCampaign(summarizeCampaignRequest(context)), context),
  "campaigns.i18n.generate": async (context) => {
    const request = i18nDraftRequest(context);
    const localResult = context.service.generateI18nDraft(request);
    let campaignDb: ReturnType<typeof createCampaignDbMetadata> | undefined;
    let result = localResult;

    if (!localResult.ok && localResult.error.code === "CAMPAIGN_NOT_FOUND") {
      const campaignDbDraft = await context.campaignDbRepository.getById(request.campaignId, {
        traceId: context.traceId,
      });

      if (campaignDbDraft && context.campaignDbRepository.generateI18nDraft) {
        try {
          const projection = await context.campaignDbRepository.generateI18nDraft({
            campaignId: request.campaignId,
            contentKeys: request.contentKeys,
            sourceLocale: request.sourceLocale,
            targetLocale: request.targetLocale,
          }, {
            traceId: context.traceId,
          });

          campaignDb = createCampaignDbMetadata(projection.repository);
          result = {
            boundary: campaignDbBoundary,
            ok: true,
            payload: createRepositoryI18nDraftResponse(projection),
          };
        } catch (error) {
          if (error instanceof CampaignDbRepositoryError) {
            throw campaignDbI18nDiagnosticToRuntimeError(error, request);
          }

          throw error;
        }
      }
    }

    const response = await persistLocalResult(
      result,
      context,
      (payload) => ({
        campaignId: context.params.campaignId,
        kind: "i18n_draft",
        locale: payload.targetLocale,
        summary: {
          contentKeys: payload.contentKeys,
          humanReviewRequired: payload.humanReviewRequired,
          sourceLocale: payload.sourceLocale,
          targetLocale: payload.targetLocale,
        },
      }),
      { tolerateAuditFailureAfterCommit: Boolean(campaignDb) },
    );

    return campaignDb
      ? {
        ...response,
        campaignDb,
      }
      : response;
  },
  "campaigns.posts.generate": (context) =>
    unwrapLocalResult(context.service.generateCampaignPosts(generateCampaignPostsRequest(context)), context),
  "campaigns.export.preview": async (context) => {
    const request = exportRequest(context);
    const localResult = context.service.exportWinners(request);
    let campaignDb: ReturnType<typeof createCampaignDbMetadata> | undefined;
    let result: LocalServiceResult<ExportWinnersResponse | RepositoryExportPreviewResponse> = localResult;

    if (!localResult.ok && localResult.error.code === "CAMPAIGN_NOT_FOUND") {
      const campaignDbDraft = await context.campaignDbRepository.getById(request.campaignId, {
        traceId: context.traceId,
      });

      if (campaignDbDraft && context.campaignDbRepository.projectExport) {
        const projection = await context.campaignDbRepository.projectExport({
          campaignId: request.campaignId,
          contractRootMode: request.contractRootMode,
          format: request.format,
          includeLocalePreference: request.includeLocalePreference,
          includeRiskFlags: request.includeRiskFlags,
          includeWalletType: request.includeWalletType,
        }, {
          traceId: context.traceId,
        });
        campaignDb = createCampaignDbMetadata(projection.repository);
        result = {
          boundary: exportProjectionBoundary,
          ok: true,
          payload: createRepositoryExportPreviewResponse(projection),
        };
      }
    }

    const response = await persistLocalResult(
      result,
      context,
      (payload) => ({
        campaignId: payload.campaignId,
        kind: "export_preview",
        summary: {
          blockedRows: payload.blockedRows,
          contractRootMode: payload.contractRootMode,
          format: payload.format,
          readyRows: payload.readyRows,
          reviewRequiredRows: payload.reviewRequiredRows,
        },
      }),
    );

    const registeredResponse = withExportArtifactRegistry(response, context);

    return campaignDb
      ? {
        ...registeredResponse,
        campaignDb,
      }
      : registeredResponse;
  },
  "campaigns.export.readiness": async (context) => {
    const request = campaignIdRequest(context);
    const localResult = context.service.getExportConfirmationReadiness(request);

    if (localResult.ok || localResult.error.code !== "CAMPAIGN_NOT_FOUND") {
      return unwrapLocalResult(localResult, context);
    }

    const campaignDbDraft = await context.campaignDbRepository.getById(request.campaignId, {
      traceId: context.traceId,
    });

    if (!campaignDbDraft) {
      return unwrapLocalResult(localResult, context);
    }

    if (!context.campaignDbRepository.getExportReadiness) {
      return unwrapLocalResult(localResult, context);
    }

    const readiness = await context.campaignDbRepository.getExportReadiness({
      campaignId: request.campaignId,
    }, {
      traceId: context.traceId,
    });

    return {
      boundary: exportProjectionBoundary,
      campaignDb: createCampaignDbMetadata(readiness.repository),
      payload: createRepositoryExportReadinessResponse(readiness),
    };
  },
  "campaigns.export.artifacts.list": (context) => {
    const result = context.exportArtifactRegistry.list(exportArtifactAuditListRequest(context));

    if (!result.ok) {
      throw invalidRequest(
        result.diagnostics[0]?.field ?? "exportArtifactAudit",
        result.diagnostics[0]?.message ?? "Export artifact audit list rejected the request.",
      );
    }

    return {
      boundary: result.payload.boundary,
      payload: result.payload,
    };
  },
  "campaigns.export.artifacts.detail": (context) => {
    const result = context.exportArtifactRegistry.get(exportArtifactAuditDetailRequest(context));

    if (!result.ok) {
      throw invalidRequest(
        result.diagnostics[0]?.field ?? "exportArtifactAudit",
        result.diagnostics[0]?.message ?? "Export artifact audit record was not found.",
      );
    }

    return {
      boundary: result.payload.boundary,
      payload: result.payload,
    };
  },
  "campaigns.export.artifacts.file": (context) => localExportFileHandoffPayload(context),
});
