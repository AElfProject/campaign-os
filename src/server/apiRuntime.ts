import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { join } from "node:path";
import { createCampaignOsLocalService, type CampaignOsLocalService } from "../domain/campaignService";
import {
  CampaignOsCampaignDbConfigError,
  resolveCampaignOsCampaignDbConfig,
  resolveCampaignOsRuntimeConfig,
  type CampaignOsCampaignDbConfig,
  type CampaignOsCampaignDbPoolConfig,
  type CampaignOsRuntimeConfig,
  type CampaignOsRuntimeConfigOptions,
} from "./config";
import type { ApiRuntimeEnvelope } from "./envelope";
import { createFailureEnvelope, createSuccessEnvelope } from "./envelope";
import {
  ApiRuntimeError,
  authForbidden,
  authSessionInvalid,
  authSessionRequired,
  invalidRequest,
  malformedJson,
  methodNotAllowed,
  persistenceUnavailable,
  routeNotFound,
  toApiRuntimeErrorBody,
} from "./errors";
import type { ApiRuntimeRouteContract } from "./contracts";
import { apiRuntimeRoutes } from "./routes";
import { createApiRuntimeHandlers } from "./handlers";
import {
  createBackendDatabaseAdapterRuntimeSummary,
  createBackendPersistenceRuntimeSummary,
  createBackendServiceReadinessReport,
  type BackendServiceReadinessReport,
} from "./backendService";
import type { BackendRuntimeActivationContract } from "./backendRuntimeActivation";
import {
  CampaignDbRepositoryError,
  createCampaignDbRepository,
  type CampaignDbRepository,
  type CampaignDbRepositoryHealth,
  type CreateCampaignDbRepositoryOptions,
} from "./campaignDbRepository";
import {
  createPostgresCampaignDurableStore,
  PostgresCampaignStoreError,
  type PostgresCampaignStorePool,
} from "./postgresCampaignDurableStore";
import {
  WalletSessionRepositoryError,
  createWalletSessionRepository,
  type CreateWalletSessionRepositoryOptions,
  type WalletSessionRepository,
} from "./walletSessionRepository";
import {
  createCampaignOsRepository,
  type CampaignOsRepository,
} from "./persistence";
import {
  evaluateIssuedAuthEnforcement,
  type AuthEnforcementDecision,
} from "./authEnforcement";
import { getProtectedRouteAuth } from "./authSession";
import {
  createExportArtifactRegistry,
  type ExportArtifactRegistry,
} from "./exportArtifactRegistry";

export type ApiRuntimeHeaders = Record<string, string | readonly string[] | undefined>;

export interface ApiRuntimeRequest {
  body?: string | unknown;
  headers?: ApiRuntimeHeaders;
  method: string;
  path: string;
}

export interface ApiRuntimeResponse<TPayload = unknown> {
  body: ApiRuntimeEnvelope<TPayload>;
  headers: Record<string, string>;
  status: number;
}

export interface ApiRuntimeHandlerContext {
  backendServiceReadiness: BackendServiceReadinessFactory;
  body: unknown;
  campaignDbRepository: CampaignDbRepository;
  exportArtifactRegistry: ExportArtifactRegistry;
  params: Record<string, string>;
  repository: CampaignOsRepository;
  query: Record<string, string>;
  route: ApiRuntimeRouteContract;
  service: CampaignOsLocalService;
  traceId: string;
  version: string;
  walletSessionRepository: WalletSessionRepository;
  auth?: AuthEnforcementDecision;
}

export type ApiRuntimeHandler = (context: ApiRuntimeHandlerContext) => unknown | Promise<unknown>;
export type BackendServiceReadinessFactory = () => BackendServiceReadinessReport;

export interface CampaignOsApiRuntime {
  close(): Promise<void>;
  handle(request: ApiRuntimeRequest): Promise<ApiRuntimeResponse>;
}

class ApiRuntimeResourceCloseError extends Error {
  readonly failureCount: number;

  constructor(failures: readonly unknown[]) {
    super("Campaign OS API runtime resource shutdown failed.");
    this.name = "ApiRuntimeResourceCloseError";
    this.failureCount = failures.length;
  }
}

export interface CampaignDbRuntimePool extends PostgresCampaignStorePool {
  onError(listener: (error: unknown) => void): void;
}

export type CampaignDbPoolFactory = (
  config: CampaignOsCampaignDbPoolConfig,
) => CampaignDbRuntimePool;

const campaignDbRequire = createRequire(
  import.meta.url.startsWith("file:") ? import.meta.url : join(process.cwd(), "package.json"),
);

const createCampaignDbAuthoritativeService = (
  service: CampaignOsLocalService,
): CampaignOsLocalService => {
  const authoritativeMissId = "__campaign_db_authoritative_miss__";

  return {
    ...service,
    addTask: (request) => service.addTask({ ...request, campaignId: authoritativeMissId }),
    checkEligibility: (request) => service.checkEligibility({
      ...request,
      campaignId: authoritativeMissId,
    }),
    exportWinners: (request) => service.exportWinners({
      ...request,
      campaignId: authoritativeMissId,
    }),
    getCampaignDetail: (request) => service.getCampaignDetail({
      ...request,
      campaignId: authoritativeMissId,
    }),
    getExportConfirmationReadiness: (request) => service.getExportConfirmationReadiness({
      ...request,
      campaignId: authoritativeMissId,
    }),
    listCampaigns: (request) => {
      const result = service.listCampaigns(request);

      if (!result.ok) {
        return result;
      }

      return {
        ...result,
        payload: {
          ...result.payload,
          campaignId: "campaign-db",
          details: [],
          items: [],
          summary: {
            appHubReadyCount: 0,
            endedCount: 0,
            forecastReadyCount: 0,
            liveCount: 0,
            portfolioReadyCount: 0,
            scheduledCount: 0,
            topCampaignId: "",
            totalCampaigns: 0,
          },
        },
      };
    },
    verifyTask: (request) => service.verifyTask({
      ...request,
      campaignId: authoritativeMissId,
    }),
  };
};

interface ApiRuntimeRouteMatcher {
  match(pathname: string): Record<string, string> | undefined;
  route: ApiRuntimeRouteContract;
}

export interface CreateCampaignOsApiRuntimeOptions {
  backendServiceReadiness?: BackendServiceReadinessFactory;
  campaignDbConfig?: CampaignOsCampaignDbConfig;
  campaignDbPoolFactory?: CampaignDbPoolFactory;
  campaignDbRepository?: CampaignDbRepository;
  campaignDbRepositoryOptions?: CreateCampaignDbRepositoryOptions;
  exportArtifactRegistry?: ExportArtifactRegistry;
  logger?: Pick<Console, "error"> | false;
  repository?: CampaignOsRepository;
  runtimeConfig?: CampaignOsRuntimeConfig;
  runtimeConfigOptions?: CampaignOsRuntimeConfigOptions;
  service?: CampaignOsLocalService;
  version?: string;
  walletSessionRepository?: WalletSessionRepository;
  walletSessionRepositoryOptions?: CreateWalletSessionRepositoryOptions;
}

const createPgCampaignPool: CampaignDbPoolFactory = (config) => {
  const { Pool } = campaignDbRequire("pg") as typeof import("pg");
  const pool = new Pool(config);

  return {
    connect: async () => {
      const client = await pool.connect();

      return {
        query: async (text, values = []) => {
          const result = await client.query(text, values);

          return { rows: result.rows as Array<Record<string, unknown>> };
        },
        release: () => client.release(),
      };
    },
    end: async () => pool.end(),
    onError: (listener) => {
      pool.on("error", listener);
    },
    query: async (text, values = []) => {
      const result = await pool.query(text, values);

      return { rows: result.rows as Array<Record<string, unknown>> };
    },
  };
};

let generatedTraceSequence = 0;

const responseHeaders = (traceId: string): Record<string, string> => ({
  "content-type": "application/json; charset=utf-8",
  "x-campaign-os-trace-id": traceId,
});

const normalizeMethod = (method: string) => method.trim().toUpperCase();

const normalizePathname = (pathname: string) => {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname || "/";
};

const splitPath = (path: string) =>
  normalizePathname(path)
    .split("/")
    .filter(Boolean);

const compileRouteMatcher = (route: ApiRuntimeRouteContract): ApiRuntimeRouteMatcher => {
  const routeSegments = splitPath(route.path);

  return {
    route,
    match: (pathname) => {
      const requestSegments = splitPath(pathname);

      if (requestSegments.length !== routeSegments.length) {
        return undefined;
      }

      const params: Record<string, string> = {};

      for (let index = 0; index < routeSegments.length; index += 1) {
        const routeSegment = routeSegments[index];
        const requestSegment = requestSegments[index];

        if (routeSegment.startsWith(":")) {
          params[routeSegment.slice(1)] = decodeURIComponent(requestSegment);
          continue;
        }

        if (routeSegment !== requestSegment) {
          return undefined;
        }
      }

      return params;
    },
  };
};

const getHeader = (headers: ApiRuntimeHeaders | undefined, name: string): string | undefined => {
  if (!headers) {
    return undefined;
  }

  const normalizedName = name.toLowerCase();
  const match = Object.entries(headers).find(([key]) => key.toLowerCase() === normalizedName)?.[1];

  if (Array.isArray(match)) {
    return match[0];
  }

  return typeof match === "string" ? match : undefined;
};

const createTraceId = (headers?: ApiRuntimeHeaders) => {
  const callerTraceId = getHeader(headers, "x-campaign-os-trace-id")?.trim();

  if (callerTraceId) {
    return callerTraceId;
  }

  generatedTraceSequence += 1;

  return `campaign-os-trace-${Date.now().toString(36)}-${generatedTraceSequence}`;
};

const parseQuery = (searchParams: URLSearchParams): Record<string, string> =>
  Object.fromEntries(Array.from(searchParams.entries()));

const parseRequestTarget = (path: string) => {
  const url = new URL(path || "/", "http://127.0.0.1");

  return {
    pathname: normalizePathname(url.pathname),
    query: parseQuery(url.searchParams),
  };
};

const parseBody = (request: ApiRuntimeRequest, method: string) => {
  if (method !== "POST") {
    return undefined;
  }

  if (request.body === undefined || request.body === "") {
    return {};
  }

  if (typeof request.body !== "string") {
    return request.body;
  }

  try {
    return JSON.parse(request.body) as unknown;
  } catch {
    throw malformedJson();
  }
};

const createRuntimeConfigBlockedError = (error: unknown) => {
  if (error instanceof CampaignOsCampaignDbConfigError) {
    return new ApiRuntimeError({
      code: "INVALID_REQUEST",
      details: {
        diagnosticCodes: [error.code],
        fallbackUsed: false,
        field: error.field,
        persistenceMode: "postgres",
        reason: "Invalid Campaign DB runtime configuration.",
        status: "blocked",
      },
      message: {
        "en-US": "The Campaign DB runtime configuration is blocked.",
        "zh-CN": "Campaign DB runtime 配置被阻断。",
        "zh-TW": "Campaign DB runtime 設定被阻斷。",
      },
      status: 400,
    });
  }

  const message = error instanceof Error ? error.message : "";
  const missingLocalJsonDir = message.includes("local_json persistence requires");
  const unsupportedPersistenceMode = message.includes("Unsupported Campaign OS persistence mode");
  const diagnosticCode = missingLocalJsonDir
    ? "MISSING_LOCAL_PERSISTENCE_DIR"
    : unsupportedPersistenceMode
      ? "UNSUPPORTED_PERSISTENCE_MODE"
      : "RUNTIME_CONFIG_INVALID";
  const field = missingLocalJsonDir
    ? "runtimeConfig.persistence.localDataDir"
    : unsupportedPersistenceMode
      ? "runtimeConfig.persistence.mode"
      : "runtimeConfig";

  return new ApiRuntimeError({
    code: "INVALID_REQUEST",
    details: {
      diagnosticCodes: [diagnosticCode],
      fallbackUsed: false,
      field,
      persistenceMode: missingLocalJsonDir ? "local_json" : "unknown",
      reason: missingLocalJsonDir
        ? "local_json persistence requires CAMPAIGN_OS_PERSISTENCE_DIR or persistence.localDataDir."
        : unsupportedPersistenceMode
          ? "Unsupported Campaign OS persistence mode."
          : "Invalid local Campaign OS runtime configuration.",
      status: "blocked",
    },
    message: {
      "en-US": "The local Campaign OS runtime configuration is blocked.",
      "zh-CN": "本地 Campaign OS runtime 配置被阻断。",
      "zh-TW": "本地 Campaign OS runtime 設定被阻斷。",
    },
    status: 400,
  });
};

const createBackendServiceReadinessFactory = ({
  resolvedConfig,
  runtimeConfigOptions,
  version,
}: {
  resolvedConfig: CampaignOsRuntimeConfig;
  runtimeConfigOptions?: CampaignOsRuntimeConfigOptions;
  version: string;
}): BackendServiceReadinessFactory => {
  let report: BackendServiceReadinessReport | undefined;

  return () => {
    report ??= createBackendServiceReadinessReport({
      configOptions: {
        ...runtimeConfigOptions,
        persistence: {
          ...runtimeConfigOptions?.persistence,
          ...resolvedConfig.persistence,
        },
        version,
      },
    });

    return report;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const ownerAddressFromBody = (body: unknown) =>
  isRecord(body) && typeof body.ownerAddress === "string" ? body.ownerAddress : undefined;

const shouldEvaluateLocalAuth = (routeId: string) =>
  getProtectedRouteAuth(routeId)?.enforcementStatus === "local_enforced";

const campaignOwnerRouteIds = new Set([
  "campaigns.tasks.add",
  "campaigns.tasks.generate",
]);

const authErrorFromDecision = (decision: AuthEnforcementDecision) => {
  const details = {
    ...decision.safeDetails,
    diagnosticCode: decision.diagnostic?.code,
    field: decision.diagnostic?.field,
    message: decision.diagnostic?.message,
  };

  if (decision.httpStatus === 401) {
    return decision.diagnostic?.code === "AUTH_SESSION_REQUIRED"
      ? authSessionRequired(details)
      : authSessionInvalid(details);
  }

  return authForbidden(details);
};

const ownerAddressFromCampaignDb = async ({
  campaignDbRepository,
  campaignId,
  traceId,
}: {
  campaignDbRepository: CampaignDbRepository;
  campaignId: string | undefined;
  traceId: string;
}) => {
  if (!campaignId) {
    return undefined;
  }

  const campaign = await campaignDbRepository.getById(campaignId, { traceId });

  return campaign?.ownerAddress;
};

const createHealthDatabaseReadinessMetadata = (
  report: BackendServiceReadinessReport,
) => ({
  adapterStatus: report.databaseReadiness.adapter.status,
  migrationPlanStatus: report.databaseReadiness.migrationPlan.status,
  requiredStoreCount: report.databaseReadiness.stores.length,
  validationIssueCount: report.databaseReadiness.validation.issues.length,
  valid: report.databaseReadiness.validation.valid,
});

const createContractDatabaseReadinessMetadata = (
  report: BackendServiceReadinessReport,
) => ({
  adapter: {
    id: report.databaseReadiness.adapter.id,
    localReviewOnly: report.databaseReadiness.adapter.localReviewOnly,
    readinessLabel: report.databaseReadiness.adapter.readinessLabel,
    requiresConnectionString: report.databaseReadiness.adapter.requiresConnectionString,
    requiresMigrationRunner: report.databaseReadiness.adapter.requiresMigrationRunner,
    status: report.databaseReadiness.adapter.status,
  },
  migrationPlan: {
    blockedMigrationIds: report.databaseReadiness.migrationPlan.blockedMigrationIds,
    dryRun: report.databaseReadiness.migrationPlan.dryRun,
    liveExecutionEnabled: report.databaseReadiness.migrationPlan.liveExecutionEnabled,
    pendingMigrationIds: report.databaseReadiness.migrationPlan.pendingMigrationIds,
    planId: report.databaseReadiness.migrationPlan.planId,
    profileId: report.databaseReadiness.migrationPlan.profileId,
    status: report.databaseReadiness.migrationPlan.status,
    validation: report.databaseReadiness.migrationPlan.validation,
  },
  requiredStores: report.databaseReadiness.stores.map((store) => ({
    id: store.id,
    migrationRequired: store.migrationRequired,
    ownerServiceId: store.ownerServiceId,
    productionMode: store.productionMode,
    readiness: store.readiness,
    schemaVersion: store.schemaVersion,
  })),
  validation: report.databaseReadiness.validation,
});

const createPersistenceRuntimeMetadata = (
  report: BackendServiceReadinessReport,
) => createBackendPersistenceRuntimeSummary(report.persistenceRuntime);

const createDatabaseAdapterRuntimeMetadata = (
  report: BackendServiceReadinessReport,
) => createBackendDatabaseAdapterRuntimeSummary(report.databaseAdapterRuntime);

const createDatabaseAdapterRuntimeContractMetadata = (
  report: BackendServiceReadinessReport,
) => ({
  ...createBackendDatabaseAdapterRuntimeSummary(report.databaseAdapterRuntime),
  productionDbRuntime: report.databaseAdapterRuntime.productionDbRuntime,
});

const createHealthAuthSessionMetadata = (
  report: BackendServiceReadinessReport,
) => ({
  agentCredentialBoundary: report.authSession.agentCredentialBoundary,
  foundation: {
    blockedDependencyIds: report.authSessionFoundation.blockedDependencyIds,
    blockerCount: report.authSessionFoundation.blockerCount,
    diagnosticCodes: report.authSessionFoundation.diagnosticCodes,
    liveSideEffectsEnabled: report.authSessionFoundation.liveSideEffectsEnabled,
    liveSigningExecuted: report.authSessionFoundation.liveSigningExecuted,
    liveVerificationExecuted: report.authSessionFoundation.liveVerificationExecuted,
    productionReady: report.authSessionFoundation.productionReady,
    status: report.authSessionFoundation.status,
    valid: report.authSessionFoundation.valid,
  },
  diagnosticCodes: report.authSession.validation.issues.map((issue) => issue.code),
  profileId: report.authSession.profileId,
  proofStatus: report.authSession.proofBoundary.status,
  protectedRouteCount: report.authSession.protectedRouteCount,
  roleCount: report.authSession.rolePolicy.roleCount,
  status: report.authSession.status,
  validationIssueCount: report.authSession.validation.issues.length,
  valid: report.authSession.validation.valid,
  verificationMode: report.authSession.proofBoundary.verificationMode,
});

const createProviderClientReadinessMetadata = (
  report: BackendServiceReadinessReport,
) => ({
  activationInventory: report.providerClientReadiness.activationInventory,
  activationStatus: report.providerClientReadiness.activationStatus,
  blockerCount: report.providerClientReadiness.blockerCount,
  diagnosticCodes: report.providerClientReadiness.diagnosticCodes,
  downstreamLiveFlags: report.providerClientReadiness.downstreamLiveFlags,
  id: report.providerClientReadiness.id,
  liveProviderCallsAttempted: report.providerClientReadiness.liveProviderCallsAttempted,
  policy: report.providerClientReadiness.policy,
  productionReady: report.providerClientReadiness.productionReady,
  providerHttpRuntime: {
    activationStatus: report.providerClientReadiness.providerHttpRuntime.activationStatus,
    blockerCount: report.providerClientReadiness.providerHttpRuntime.blockerCount,
    configuredCategories: report.providerClientReadiness.providerHttpRuntime.configuredCategories,
    diagnosticCodes: report.providerClientReadiness.providerHttpRuntime.diagnosticCodes,
    downstreamLiveFlags: report.providerClientReadiness.providerHttpRuntime.downstreamLiveFlags,
    endpointCount: report.providerClientReadiness.providerHttpRuntime.endpointCount,
    liveHttpCallsAttempted: report.providerClientReadiness.providerHttpRuntime.liveHttpCallsAttempted,
    productionReady: report.providerClientReadiness.providerHttpRuntime.productionReady,
    runtimeId: report.providerClientReadiness.providerHttpRuntime.id,
    status: report.providerClientReadiness.providerHttpRuntime.status,
    transportProvided: report.providerClientReadiness.providerHttpRuntime.transportProvided,
    valid: report.providerClientReadiness.providerHttpRuntime.valid,
  },
  providerClientsEnabled: report.providerClientReadiness.providerClientsEnabled,
  providerClientsProvided: report.providerClientReadiness.providerClientsProvided,
  queueHandoff: report.providerClientReadiness.queueHandoff,
  redacted: true,
  registry: {
    clientCount: report.providerClientReadiness.registry.clients.length,
    providerGroups: report.providerClientReadiness.registry.providerGroups,
  },
  requiredConfigKeys: report.providerClientReadiness.requiredConfigKeys,
  status: report.providerClientReadiness.status,
  valid: report.providerClientReadiness.valid,
});

const createApiServiceMetadata = (
  report: BackendServiceReadinessReport,
) => ({
  activation: createHealthActivationMetadata(report.backendRuntimeBootstrap.activation),
  attachPointCount: report.apiService.attachPointCount,
  blockedDependencyIds: report.apiService.blockedDependencyIds,
  contractWriteEnabled: report.apiService.contractWriteEnabled,
  deferredDependencyIds: report.apiService.deferredDependencyIds,
  deployableBoundaryReady: report.apiService.deployableBoundaryReady,
  diagnosticCodes: report.apiService.diagnosticCodes,
  id: report.apiService.id,
  liveConnectionAttempted: report.apiService.liveConnectionAttempted,
  liveSideEffectsEnabled: report.apiService.liveSideEffectsEnabled,
  productionReady: report.apiService.productionReady,
  profileId: report.apiService.profileId,
  runtimeVersion: report.apiService.runtimeVersion,
  status: report.apiService.status,
  workerExecutionEnabled: report.apiService.workerExecutionEnabled,
});

const createHealthActivationMetadata = (
  activation: BackendRuntimeActivationContract,
) => ({
  deploymentHandoff: {
    contractsEndpoint: activation.deploymentHandoff.contractsEndpoint,
    healthEndpoint: activation.deploymentHandoff.healthEndpoint,
    runtimeTarget: activation.deploymentHandoff.runtimeTarget,
    shutdown: activation.deploymentHandoff.shutdown,
    smokeCommand: activation.deploymentHandoff.smokeCommand,
    startCommand: activation.deploymentHandoff.startCommand,
    tracePolicy: activation.deploymentHandoff.tracePolicy,
  },
  id: activation.id,
  liveSideEffectsEnabled: activation.liveSideEffectsEnabled,
  productionReady: activation.productionReady,
  runtimeTarget: activation.runtimeTarget,
});

const createContractAuthSessionMetadata = (
  report: BackendServiceReadinessReport,
) => ({
  agentCredentialBoundary: report.authSession.agentCredentialBoundary,
  authContracts: report.authSession.authContracts,
  deferredDependencyIds: report.authSession.deferredDependencyIds,
  foundation: report.authSessionFoundation,
  profileId: report.authSession.profileId,
  proofBoundary: report.authSession.proofBoundary,
  protectedRoutes: report.authSession.protectedRoutes.map((route) => ({
    enforcementStatus: route.enforcementStatus,
    productionDependencyIds: route.productionDependencyIds,
    proofRequired: route.proofRequired,
    requiredRoles: route.requiredRoles,
    routeGroup: route.routeGroup,
    routeId: route.routeId,
    routeSource: route.routeSource,
    sessionRequired: route.sessionRequired,
  })),
  rolePolicy: report.authSession.rolePolicy,
  sessionContract: report.authSession.sessionContract,
  status: report.authSession.status,
  validation: {
    diagnosticCodes: report.authSession.validation.issues.map((issue) => issue.code),
    issueCount: report.authSession.validation.issues.length,
    valid: report.authSession.validation.valid,
  },
});

const appendReportShapeSections = (sections: unknown, sectionIds: string[]) => {
  const currentSections = Array.isArray(sections)
    ? sections.filter((section): section is string => typeof section === "string")
    : [];

  return Array.from(new Set([...currentSections, ...sectionIds]));
};

const withBackendServiceReadinessMetadata = ({
  campaignDatabase,
  data,
  readiness,
  routeId,
}: {
  campaignDatabase: CampaignDbRepositoryHealth;
  data: unknown;
  readiness: BackendServiceReadinessReport;
  routeId: ApiRuntimeRouteContract["id"];
}) => {
  if (!isRecord(data) || !isRecord(data.backendService)) {
    return data;
  }

  if (routeId === "runtime.health") {
    return {
      ...data,
      apiService: createApiServiceMetadata(readiness),
      campaignDatabase,
      backendService: {
        ...data.backendService,
        activation: createHealthActivationMetadata(readiness.backendRuntimeBootstrap.activation),
        apiService: createApiServiceMetadata(readiness),
        authSession: createHealthAuthSessionMetadata(readiness),
        databaseAdapterRuntime: createDatabaseAdapterRuntimeMetadata(readiness),
        databaseReadiness: createHealthDatabaseReadinessMetadata(readiness),
        persistenceRuntime: createPersistenceRuntimeMetadata(readiness),
        providerClientReadiness: createProviderClientReadinessMetadata(readiness),
      },
    };
  }

  if (routeId === "runtime.contracts") {
    return {
      ...data,
      activation: readiness.backendRuntimeBootstrap.activation,
      campaignDatabase,
      apiService: {
        ...createApiServiceMetadata(readiness),
        attachMap: readiness.apiService.blockedDependencyIds
          .map((id) => ({ id, status: "blocked" }))
          .concat(readiness.apiService.deferredDependencyIds.map((id) => ({ id, status: "deferred" }))),
      },
      backendService: {
        ...data.backendService,
        activation: readiness.backendRuntimeBootstrap.activation,
        apiService: createApiServiceMetadata(readiness),
        authSession: createContractAuthSessionMetadata(readiness),
        databaseAdapterRuntime: createDatabaseAdapterRuntimeContractMetadata(readiness),
        databaseReadiness: createContractDatabaseReadinessMetadata(readiness),
        persistenceRuntime: createPersistenceRuntimeMetadata(readiness),
        providerClientReadiness: createProviderClientReadinessMetadata(readiness),
        reportShape: isRecord(data.backendService.reportShape)
          ? {
            ...data.backendService.reportShape,
            sections: appendReportShapeSections(data.backendService.reportShape.sections, [
              "apiService",
              "authSession",
              "authSessionFoundation",
              "databaseAdapterRuntime",
              "databaseReadiness",
              "persistenceRuntime",
              "productionDbRuntime",
              "providerClientReadiness",
            ]),
          }
          : data.backendService.reportShape,
      },
    };
  }

  return data;
};

const findMatchingRoute = (
  matchers: readonly ApiRuntimeRouteMatcher[],
  method: string,
  pathname: string,
) => {
  const pathMatches = matchers
    .map((matcher) => ({ matcher, params: matcher.match(pathname) }))
    .filter((match): match is { matcher: ApiRuntimeRouteMatcher; params: Record<string, string> } =>
      Boolean(match.params),
    );

  const methodMatch = pathMatches.find(({ matcher }) => matcher.route.method === method);

  if (methodMatch) {
    return methodMatch;
  }

  if (pathMatches.length > 0) {
    throw methodNotAllowed(
      method,
      pathname,
      pathMatches.map(({ matcher }) => matcher.route.method),
    );
  }

  throw routeNotFound(method, pathname);
};

const createSafeRepository = (repository: CampaignOsRepository): CampaignOsRepository => {
  let initializePromise: Promise<void> | undefined;

  const wrap = async <TResult>(operation: string, run: () => Promise<TResult>) => {
    try {
      return await run();
    } catch {
      throw persistenceUnavailable(operation);
    }
  };

  const initialize = () => {
    initializePromise ??= wrap("initialize", () => repository.initialize());

    return initializePromise;
  };

  const afterInitialize = async <TResult>(operation: string, run: () => Promise<TResult>) => {
    await initialize();

    return wrap(operation, run);
  };

  return {
    initialize,
    record: (input) => afterInitialize("record", () => repository.record(input)),
    reset: repository.reset ? () => afterInitialize("reset", () => repository.reset?.() ?? Promise.resolve()) : undefined,
    snapshot: () => afterInitialize("snapshot", () => repository.snapshot()),
    health: () => afterInitialize("health", () => repository.health()),
  };
};

const createSafeCampaignDbRepository = (
  repository: CampaignDbRepository,
): CampaignDbRepository => {
  const unavailable = (operation: string, diagnosticCode?: string) => {
    const error = persistenceUnavailable(operation);

    return diagnosticCode
      ? new ApiRuntimeError({
        ...error.body,
        details: {
          ...error.body.details,
          diagnosticCode,
        },
      })
      : error;
  };
  const wrap = async <TResult>(operation: string, run: () => Promise<TResult>) => {
    try {
      return await run();
    } catch (error) {
      if (error instanceof CampaignDbRepositoryError) {
        const firstDiagnostic = error.diagnostics[0];

        if (operation === "campaignDb.generateI18nDraft") {
          if (
            firstDiagnostic
            && [
              "CAMPAIGN_DB_I18N_CAMPAIGN_NOT_FOUND",
              "CAMPAIGN_DB_I18N_REQUIRED_FIELD_MISSING",
              "CAMPAIGN_DB_I18N_UNSUPPORTED_SOURCE_LOCALE",
              "CAMPAIGN_DB_I18N_UNSUPPORTED_TARGET_LOCALE",
            ].includes(firstDiagnostic.code)
          ) {
            throw error;
          }

          throw unavailable(operation, firstDiagnostic?.code);
        }

        if (
          firstDiagnostic?.code !== "CAMPAIGN_DB_PRODUCTION_DEFERRED"
          && !firstDiagnostic?.code.startsWith("CAMPAIGN_DURABLE_STORE_")
          && !firstDiagnostic?.code.startsWith("POSTGRES_CAMPAIGN_STORE_")
        ) {
          throw invalidRequest(
            firstDiagnostic?.field ?? "campaignDb",
            firstDiagnostic?.message ?? "Campaign DB repository rejected the request.",
          );
        }

        throw unavailable(operation, firstDiagnostic?.code);
      }

      if (error instanceof PostgresCampaignStoreError) {
        throw unavailable(operation, error.code);
      }

      throw unavailable(operation);
    }
  };

  return {
    addTaskDraft: (input, context) =>
      wrap("campaignDb.addTaskDraft", () => repository.addTaskDraft(input, context)),
    bindReferral: (input, context) =>
      wrap("campaignDb.bindReferral", () => repository.bindReferral!(input, context)),
    checkEligibility: (input, context) =>
      wrap("campaignDb.checkEligibility", () => repository.checkEligibility!(input, context)),
    close: () => wrap(
      "campaignDb.close",
      () => repository.close?.() ?? Promise.resolve(),
    ),
    createDraft: (input, context) =>
      wrap("campaignDb.createDraft", () => repository.createDraft(input, context)),
    getById: (campaignId, context) =>
      wrap("campaignDb.getById", () => repository.getById(campaignId, context)),
    getEvents: () => repository.getEvents(),
    generateI18nDraft: (input, context) =>
      wrap("campaignDb.generateI18nDraft", () => repository.generateI18nDraft!(input, context)),
    getExportReadiness: (input, context) =>
      wrap("campaignDb.getExportReadiness", () => repository.getExportReadiness!(input, context)),
    getParticipant: (campaignId, walletAddress, context) =>
      wrap(
        "campaignDb.getParticipant",
        () => repository.getParticipant!(campaignId, walletAddress, context),
      ),
    getReferralBinding: (campaignId, inviteeWalletAddress, context) =>
      wrap(
        "campaignDb.getReferralBinding",
        () => repository.getReferralBinding!(campaignId, inviteeWalletAddress, context),
      ),
    health: (context) => wrap("campaignDb.health", () => repository.health(context)),
    list: (filter, context) =>
      wrap("campaignDb.list", () => repository.list(filter, context)),
    listTaskEvidence: (filter, context) =>
      wrap("campaignDb.listTaskEvidence", () => repository.listTaskEvidence!(filter, context)),
    listParticipants: (filter, context) =>
      wrap("campaignDb.listParticipants", () => repository.listParticipants!(filter, context)),
    listReferralBindings: (filter, context) =>
      wrap(
        "campaignDb.listReferralBindings",
        () => repository.listReferralBindings!(filter, context),
      ),
    markReferralQualified: (input, context) =>
      wrap(
        "campaignDb.markReferralQualified",
        () => repository.markReferralQualified!(input, context),
      ),
    projectExport: (input, context) =>
      wrap("campaignDb.projectExport", () => repository.projectExport!(input, context)),
    reset: () => wrap("campaignDb.reset", () => repository.reset()),
    upsertTaskCompletion: (input, context) =>
      wrap("campaignDb.upsertTaskCompletion", () => repository.upsertTaskCompletion!(input, context)),
    upsertParticipant: (input, context) =>
      wrap("campaignDb.upsertParticipant", () => repository.upsertParticipant!(input, context)),
    upsertTaskEvidence: (input, context) =>
      wrap("campaignDb.upsertTaskEvidence", () => repository.upsertTaskEvidence!(input, context)),
    upsertTaskVerification: (input, context) =>
      wrap("campaignDb.upsertTaskVerification", () => repository.upsertTaskVerification!(input, context)),
  };
};

const createSafeWalletSessionRepository = (
  repository: WalletSessionRepository,
): WalletSessionRepository => {
  const wrap = async <TResult>(operation: string, run: () => Promise<TResult>) => {
    try {
      return await run();
    } catch (error) {
      if (error instanceof WalletSessionRepositoryError) {
        const firstDiagnostic = error.diagnostics[0];

        if (firstDiagnostic?.code === "WALLET_SESSION_REQUIRED_FIELD_MISSING") {
          throw invalidRequest(
            firstDiagnostic.field,
            firstDiagnostic.message,
          );
        }
      }

      throw persistenceUnavailable(operation);
    }
  };

  return {
    close: () => wrap("walletSessionRepository.close", () => repository.close()),
    getBySessionId: (sessionId, context) =>
      wrap("walletSessionRepository.getBySessionId", () => repository.getBySessionId(sessionId, context)),
    health: () => wrap("walletSessionRepository.health", () => repository.health()),
    list: (filter, context) =>
      wrap("walletSessionRepository.list", () => repository.list(filter, context)),
    reset: () => wrap("walletSessionRepository.reset", () => repository.reset()),
    upsertSession: (session, context) =>
      wrap("walletSessionRepository.upsertSession", () => repository.upsertSession(session, context)),
  };
};

export const createCampaignOsApiRuntime = ({
  backendServiceReadiness,
  campaignDbConfig,
  campaignDbPoolFactory = createPgCampaignPool,
  campaignDbRepository,
  campaignDbRepositoryOptions,
  exportArtifactRegistry = createExportArtifactRegistry(),
  logger = console,
  repository,
  runtimeConfig,
  runtimeConfigOptions,
  service = createCampaignOsLocalService(),
  version,
  walletSessionRepository,
  walletSessionRepositoryOptions,
}: CreateCampaignOsApiRuntimeOptions = {}): CampaignOsApiRuntime => {
  let configError: unknown;
  const resolvedConfig = (() => {
    if (runtimeConfig) {
      return runtimeConfig;
    }

    try {
      return resolveCampaignOsRuntimeConfig({
        ...runtimeConfigOptions,
        version,
      });
    } catch (error) {
      configError = error;

      return resolveCampaignOsRuntimeConfig({
        persistence: {
          mode: "memory",
        },
        version,
      });
    }
  })();
  const resolvedCampaignDbConfig = (() => {
    if (campaignDbConfig) {
      return campaignDbConfig;
    }

    try {
      return resolveCampaignOsCampaignDbConfig({
        env: runtimeConfigOptions?.env,
      });
    } catch (error) {
      configError ??= error;

      return resolveCampaignOsCampaignDbConfig({ env: {} });
    }
  })();
  const safeRepository = createSafeRepository(
    repository ?? createCampaignOsRepository(resolvedConfig.persistence),
  );
  const composedCampaignDbRepository = campaignDbRepository ?? (() => {
    if (resolvedCampaignDbConfig.mode !== "postgres") {
      return createCampaignDbRepository(campaignDbRepositoryOptions);
    }

    const pool = campaignDbPoolFactory(resolvedCampaignDbConfig.pool);
    pool.onError(() => {
      if (logger) {
        logger.error(
          `[campaign-os-api-runtime] campaign_db_pool_error code=CAMPAIGN_DB_POOL_BACKGROUND_ERROR traceId=${randomUUID()}`,
        );
      }
    });
    const durableStore = createPostgresCampaignDurableStore({
      boundedListLimit: campaignDbRepositoryOptions?.boundedListLimit,
      ownsPool: true,
      pool,
    });

    return createCampaignDbRepository({
      ...campaignDbRepositoryOptions,
      durableStore,
      mode: "postgres",
      now: campaignDbRepositoryOptions?.now ?? (() => new Date().toISOString()),
    });
  })();
  const safeCampaignDbRepository = createSafeCampaignDbRepository(
    composedCampaignDbRepository,
  );
  const safeWalletSessionRepository = createSafeWalletSessionRepository(
    walletSessionRepository ?? createWalletSessionRepository(walletSessionRepositoryOptions),
  );
  const handlers = createApiRuntimeHandlers();
  const matchers = apiRuntimeRoutes.map(compileRouteMatcher);
  const runtimeVersion = version ?? resolvedConfig.version;
  const getBackendServiceReadiness =
    backendServiceReadiness
    ?? createBackendServiceReadinessFactory({
      resolvedConfig,
      runtimeConfigOptions,
      version: runtimeVersion,
    });
  const shouldAttachDatabaseReadiness = (routeId: ApiRuntimeRouteContract["id"]) =>
    routeId === "runtime.health" || routeId === "runtime.contracts";
  const activeService = resolvedCampaignDbConfig.mode === "postgres"
    ? createCampaignDbAuthoritativeService(service)
    : service;
  let closePromise: Promise<void> | undefined;
  const close = (): Promise<void> => {
    closePromise ??= Promise.allSettled([
      safeCampaignDbRepository.close?.() ?? Promise.resolve(),
      safeWalletSessionRepository.close(),
    ]).then((results) => {
      const failures = results
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map((result) => result.reason as unknown);

      if (failures.length === 1) {
        throw failures[0];
      }

      if (failures.length > 1) {
        throw new ApiRuntimeResourceCloseError(failures);
      }
    });

    return closePromise;
  };

  return {
    close,
    handle: async (request) => {
      const traceId = createTraceId(request.headers);

      try {
        if (configError) {
          throw createRuntimeConfigBlockedError(configError);
        }

        const method = normalizeMethod(request.method);
        const { pathname, query } = parseRequestTarget(request.path);
        const { matcher, params } = findMatchingRoute(matchers, method, pathname);
        const body = parseBody(request, method);
        let authDecision: AuthEnforcementDecision | undefined;
        if (shouldEvaluateLocalAuth(matcher.route.id)) {
          authDecision = await evaluateIssuedAuthEnforcement({
            headers: request.headers,
            issuedSessionLookup: safeWalletSessionRepository.getBySessionId,
            ownerAddress: ownerAddressFromBody(body),
            routeId: matcher.route.id,
            traceId,
          });

          if (!authDecision.allowed) {
            throw authErrorFromDecision(authDecision);
          }

          if (campaignOwnerRouteIds.has(matcher.route.id)) {
            const ownerAddress = await ownerAddressFromCampaignDb({
              campaignDbRepository: safeCampaignDbRepository,
              campaignId: params.campaignId,
              traceId,
            });

            if (ownerAddress) {
              authDecision = await evaluateIssuedAuthEnforcement({
                headers: request.headers,
                issuedSessionLookup: safeWalletSessionRepository.getBySessionId,
                ownerAddress,
                routeId: matcher.route.id,
                traceId,
              });

              if (!authDecision.allowed) {
                throw authErrorFromDecision(authDecision);
              }
            }
          }
        }

        const handler = handlers[matcher.route.id];
        let requestReadiness: BackendServiceReadinessReport | undefined;
        const requestBackendServiceReadiness = () => {
          requestReadiness ??= getBackendServiceReadiness();

          return requestReadiness;
        };
        const data = await handler({
          backendServiceReadiness: requestBackendServiceReadiness,
          body,
          campaignDbRepository: safeCampaignDbRepository,
          exportArtifactRegistry,
          params,
          repository: safeRepository,
          query,
          route: matcher.route,
          service: activeService,
          traceId,
          version: runtimeVersion,
          walletSessionRepository: safeWalletSessionRepository,
          auth: authDecision,
        });
        const attachDatabaseReadiness = shouldAttachDatabaseReadiness(matcher.route.id);
        const campaignDatabase = attachDatabaseReadiness
          ? await safeCampaignDbRepository.health({ traceId })
          : undefined;
        const responseData = attachDatabaseReadiness && campaignDatabase
          ? withBackendServiceReadinessMetadata({
            campaignDatabase,
            data,
            readiness: requestBackendServiceReadiness(),
            routeId: matcher.route.id,
          })
          : data;

        return {
          body: createSuccessEnvelope({
            data: responseData,
            routeCount: apiRuntimeRoutes.length,
            traceId,
            version: runtimeVersion,
          }),
          headers: responseHeaders(traceId),
          status: 200,
        };
      } catch (error) {
        const runtimeError = toApiRuntimeErrorBody(error);

        return {
          body: createFailureEnvelope({
            error: runtimeError,
            routeCount: apiRuntimeRoutes.length,
            traceId,
            version: runtimeVersion,
          }),
          headers: responseHeaders(traceId),
          status: runtimeError.status,
        };
      }
    },
  };
};
