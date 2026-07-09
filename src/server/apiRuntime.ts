import { createCampaignOsLocalService, type CampaignOsLocalService } from "../domain/campaignService";
import {
  resolveCampaignOsRuntimeConfig,
  type CampaignOsRuntimeConfig,
  type CampaignOsRuntimeConfigOptions,
} from "./config";
import type { ApiRuntimeEnvelope } from "./envelope";
import { createFailureEnvelope, createSuccessEnvelope } from "./envelope";
import {
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
  type CreateCampaignDbRepositoryOptions,
} from "./campaignDbRepository";
import {
  createCampaignOsRepository,
  type CampaignOsRepository,
} from "./persistence";
import {
  evaluateAuthEnforcement,
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
}

export type ApiRuntimeHandler = (context: ApiRuntimeHandlerContext) => unknown | Promise<unknown>;
export type BackendServiceReadinessFactory = () => BackendServiceReadinessReport;

export interface CampaignOsApiRuntime {
  handle(request: ApiRuntimeRequest): Promise<ApiRuntimeResponse>;
}

interface ApiRuntimeRouteMatcher {
  match(pathname: string): Record<string, string> | undefined;
  route: ApiRuntimeRouteContract;
}

export interface CreateCampaignOsApiRuntimeOptions {
  backendServiceReadiness?: BackendServiceReadinessFactory;
  campaignDbRepository?: CampaignDbRepository;
  campaignDbRepositoryOptions?: CreateCampaignDbRepositoryOptions;
  exportArtifactRegistry?: ExportArtifactRegistry;
  repository?: CampaignOsRepository;
  runtimeConfig?: CampaignOsRuntimeConfig;
  runtimeConfigOptions?: CampaignOsRuntimeConfigOptions;
  service?: CampaignOsLocalService;
  version?: string;
}

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
  data,
  readiness,
  routeId,
}: {
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
  const wrap = async <TResult>(operation: string, run: () => Promise<TResult>) => {
    try {
      return await run();
    } catch (error) {
      if (error instanceof CampaignDbRepositoryError) {
        const firstDiagnostic = error.diagnostics[0];

        if (firstDiagnostic?.code !== "CAMPAIGN_DB_PRODUCTION_DEFERRED") {
          throw invalidRequest(
            firstDiagnostic?.field ?? "campaignDb",
            firstDiagnostic?.message ?? "Campaign DB repository rejected the request.",
          );
        }
      }

      throw persistenceUnavailable(operation);
    }
  };

  return {
    addTaskDraft: (input, context) =>
      wrap("campaignDb.addTaskDraft", () => repository.addTaskDraft(input, context)),
    checkEligibility: (input, context) =>
      wrap("campaignDb.checkEligibility", () => repository.checkEligibility!(input, context)),
    createDraft: (input, context) =>
      wrap("campaignDb.createDraft", () => repository.createDraft(input, context)),
    getById: (campaignId, context) =>
      wrap("campaignDb.getById", () => repository.getById(campaignId, context)),
    getEvents: () => repository.getEvents(),
    getExportReadiness: (input, context) =>
      wrap("campaignDb.getExportReadiness", () => repository.getExportReadiness!(input, context)),
    health: () => wrap("campaignDb.health", () => repository.health()),
    list: (filter, context) =>
      wrap("campaignDb.list", () => repository.list(filter, context)),
    projectExport: (input, context) =>
      wrap("campaignDb.projectExport", () => repository.projectExport!(input, context)),
    reset: () => wrap("campaignDb.reset", () => repository.reset()),
    upsertTaskCompletion: (input, context) =>
      wrap("campaignDb.upsertTaskCompletion", () => repository.upsertTaskCompletion!(input, context)),
  };
};

export const createCampaignOsApiRuntime = ({
  backendServiceReadiness,
  campaignDbRepository,
  campaignDbRepositoryOptions,
  exportArtifactRegistry = createExportArtifactRegistry(),
  repository,
  runtimeConfig,
  runtimeConfigOptions,
  service = createCampaignOsLocalService(),
  version,
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
  const safeRepository = createSafeRepository(
    repository ?? createCampaignOsRepository(resolvedConfig.persistence),
  );
  const safeCampaignDbRepository = createSafeCampaignDbRepository(
    campaignDbRepository ?? createCampaignDbRepository(campaignDbRepositoryOptions),
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

  return {
    handle: async (request) => {
      const traceId = createTraceId(request.headers);

      try {
        if (configError) {
          throw invalidRequest("runtimeConfig.persistence.mode", "Unsupported local runtime configuration.");
        }

        const method = normalizeMethod(request.method);
        const { pathname, query } = parseRequestTarget(request.path);
        const { matcher, params } = findMatchingRoute(matchers, method, pathname);
        const body = parseBody(request, method);
        if (shouldEvaluateLocalAuth(matcher.route.id)) {
          const authDecision = evaluateAuthEnforcement({
            headers: request.headers,
            ownerAddress: ownerAddressFromBody(body),
            routeId: matcher.route.id,
          });

          if (!authDecision.allowed) {
            throw authErrorFromDecision(authDecision);
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
          service,
          traceId,
          version: runtimeVersion,
        });
        const responseData = shouldAttachDatabaseReadiness(matcher.route.id)
          ? withBackendServiceReadinessMetadata({
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
