import {
  apiSkillContractRegistry,
  createApiSkillContractSurface,
} from "../domain/apiSkillContracts";
import {
  type AddTaskRequest,
  type CheckEligibilityRequest,
  type CreateCampaignRequest,
  type CreateWalletSessionRequest,
  type ExportWinnersRequest,
  type GenerateI18nDraftRequest,
  type GetCampaignAnalyticsRequest,
  type GetCampaignDetailRequest,
  type ListCampaignsRequest,
  type LocalCampaignDraft,
  type LocalServiceError,
  type LocalServiceResult,
  type VerifyTaskRequest,
} from "../domain/campaignService";
import {
  createServiceDegradationGovernance,
  createServiceRegistry,
} from "../domain/serviceRegistry";
import type {
  CampaignDiscoveryDetail,
  CampaignDiscoveryItem,
  CampaignDiscoveryReadModel,
  CampaignDiscoverySummary,
  LocalizedText,
} from "../domain/types";
import type { ApiRuntimeRouteId } from "./routes";
import { apiRuntimeRoutes, createApiRuntimeContractCoverage } from "./routes";
import {
  createBackendDatabaseAdapterRuntimeSummary,
  createBackendPersistenceRuntimeSummary,
  type BackendServiceReadinessReport,
} from "./backendService";
import type {
  CampaignDbCreateDraftInput,
  CampaignDbDraft,
  CampaignDbListFilter,
  CampaignDbReadProjection,
} from "./campaignDbRepository";
import { createBackendTopologyReport } from "./topology";
import { createRuntimeSafety } from "./envelope";
import {
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
import {
  bodyRecord,
  exportContractRootMode,
  exportFormat,
  isJsonRecord,
  optionalAccountType,
  optionalLocale,
  optionalString,
  optionalWalletSource,
  requiredAccountType,
  requiredBoolean,
  requiredNumber,
  requiredRecord,
  requiredRouteParam,
  requiredString,
  requiredVerificationType,
  requiredWalletCompatibility,
  requiredWalletSource,
} from "./validation";

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
) => {
  const response = unwrapLocalResult(result, context);
  const record = await context.repository.record({
    ...createRecordInput(response.payload),
    routeId: context.route.id,
    traceId: context.traceId,
  });

  return {
    ...response,
    persistence: {
      kind: record.kind,
      recordId: record.id,
    },
  };
};

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
  ownerAddress: context.query.ownerAddress,
  projectId: context.query.projectId,
  status: context.query.status,
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

const createCampaignDbTaskSummary = (draft: CampaignDbDraft) => ({
  points: 0,
  required: false,
  taskId: `${draft.id}-repository-draft`,
  title: localized("Repository draft", "Repository 草稿"),
  verificationType: "MANUAL" as const,
});

const campaignDbDraftToDiscoveryItem = (draft: CampaignDbDraft): CampaignDiscoveryItem => ({
  boundary: campaignDbBoundary,
  campaignType: localized("Repository Draft", "Repository 草稿"),
  consumerSurfaces: ["user_app", "app_hub", "portfolio", "forecast"],
  coreTasks: [createCampaignDbTaskSummary(draft)],
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

const campaignDbDraftToDiscoveryDetail = (
  draft: CampaignDbDraft,
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
  backendRuntimeBootstrap: createBackendRuntimeBootstrapMetadata(report),
  entrypoint: backendServiceEntrypointMetadata(report),
  entrypointId: report.entrypoint.id,
  databaseAdapterRuntime: createBackendDatabaseAdapterRuntimeSummary(report.databaseAdapterRuntime),
  migrationRunnerStatus: report.migration.runnerStatus,
  persistenceRuntime: createBackendPersistenceRuntimeSummary(report.persistenceRuntime),
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
  databaseAdapterRuntime: createBackendDatabaseAdapterRuntimeSummary(report.databaseAdapterRuntime),
  deferredProductionCapabilities: report.profile.deferredCapabilities,
  entrypoint: backendServiceEntrypointMetadata(report),
  migrationManifest: backendMigrationManifestSummary(report),
  persistenceAdapterPort: backendPersistenceAdapterSummary(report),
  persistenceRuntime: createBackendPersistenceRuntimeSummary(report.persistenceRuntime),
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
      "persistenceRuntime",
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

export const createApiRuntimeHandlers = (): Record<ApiRuntimeRouteId, ApiRuntimeHandler> => ({
  "runtime.health": async (context) => {
    const apiFoundation = createApiFoundationRuntimeMetadata();
    const backendService = context.backendServiceReadiness();
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
      routes: apiRuntimeRoutes,
      serviceGroups: apiRuntimeServiceGroups,
      topology,
    };
  },
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
  "wallet.session.create": (context) =>
    persistLocalResult(
      context.service.createWalletSession(bodyRecord(context.body) as CreateWalletSessionRequest),
      context,
      (payload) => ({
        accountType: payload.accountType,
        kind: "wallet_session",
        summary: {
          accountType: payload.accountType,
          chainId: payload.chainId,
          network: payload.network,
          walletSource: payload.walletSource,
        },
        walletAddress: payload.address,
        walletSource: payload.walletSource,
      }),
    ),
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
  "campaigns.create": async (context) => {
    const response = unwrapLocalResult(
      context.service.createCampaign(createCampaignRequest(context)),
      context,
    );
    const campaignDbDraft = await context.campaignDbRepository.createDraft(
      campaignDbCreateDraftInput(response.payload),
      { traceId: context.traceId },
    );
    const record = await context.repository.record({
      campaignId: campaignDbDraft.id,
      kind: "campaign_draft",
      routeId: context.route.id,
      summary: {
        contractMode: response.payload.contractMode,
        projectId: response.payload.projectId,
        status: response.payload.status,
        walletPolicy: response.payload.walletPolicy,
      },
      traceId: context.traceId,
      walletAddress: response.payload.ownerAddress,
    });

    return {
      ...response,
      campaignDb: {
        createdViaRepository: true,
        draftId: campaignDbDraft.id,
        storeId: "campaign-db",
      },
      payload: {
        ...response.payload,
        id: campaignDbDraft.id,
      },
      persistence: {
        kind: record.kind,
        recordId: record.id,
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
  "campaigns.tasks.add": (context) =>
    persistLocalResult(
      context.service.addTask(addTaskRequest(context)),
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
    ),
  "tasks.verify": (context) =>
    persistLocalResult(
      context.service.verifyTask(verifyTaskRequest(context)),
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
    ),
  "campaigns.eligibility": (context) =>
    unwrapLocalResult(context.service.checkEligibility(eligibilityRequest(context)), context),
  "campaigns.analytics": (context) =>
    unwrapLocalResult(
      context.service.getCampaignAnalytics({
        campaignId: context.params.campaignId,
      } satisfies GetCampaignAnalyticsRequest),
      context,
    ),
  "campaigns.i18n.generate": (context) =>
    persistLocalResult(
      context.service.generateI18nDraft(i18nDraftRequest(context)),
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
    ),
  "campaigns.export.preview": (context) =>
    persistLocalResult(
      context.service.exportWinners(exportRequest(context)),
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
    ),
});
