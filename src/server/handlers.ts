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
  type LocalServiceError,
  type LocalServiceResult,
  type VerifyTaskRequest,
} from "../domain/campaignService";
import {
  createServiceDegradationGovernance,
  createServiceRegistry,
} from "../domain/serviceRegistry";
import type { ApiRuntimeRouteId } from "./routes";
import { apiRuntimeRoutes, createApiRuntimeContractCoverage } from "./routes";
import {
  createBackendPersistenceRuntimeSummary,
  type BackendServiceReadinessReport,
} from "./backendService";
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

const createBackendServiceHealthMetadata = (
  report: BackendServiceReadinessReport,
  traceId: string,
) => ({
  adapterStatus: report.persistenceAdapters.activeAdapter.status,
  apiFoundationValidationIssueCount: report.apiFoundation.validation.issues.length,
  entrypoint: backendServiceEntrypointMetadata(report),
  entrypointId: report.entrypoint.id,
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
  configContract: backendConfigContractSummary(report),
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
  "campaigns.list": (context) =>
    unwrapLocalResult(context.service.listCampaigns(listCampaignRequest(context)), context),
  "campaigns.create": (context) =>
    persistLocalResult(
      context.service.createCampaign(createCampaignRequest(context)),
      context,
      (payload) => ({
        campaignId: payload.id,
        kind: "campaign_draft",
        summary: {
          contractMode: payload.contractMode,
          projectId: payload.projectId,
          status: payload.status,
          walletPolicy: payload.walletPolicy,
        },
        walletAddress: payload.ownerAddress,
      }),
    ),
  "campaigns.detail": (context) =>
    unwrapLocalResult(context.service.getCampaignDetail(campaignDetailRequest(context)), context),
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
