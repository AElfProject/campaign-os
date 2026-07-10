import type { BackendRuntimeProfile, BackendRuntimeProfileId } from "./backendProfiles";
import {
  createBackendServiceReadinessReport,
  type BackendServiceReadinessReport,
} from "./backendService";
import type { BackendRuntimeBootstrapContract } from "./backendRuntimeBootstrap";
import type { BackendRuntimeActivationContract } from "./backendRuntimeActivation";
import { apiRuntimeRoutes } from "./routes";
import {
  resolveApiServerRuntimeContract,
  type ApiServerRuntimeContract,
  type ResolveApiServerRuntimeContractOptions,
} from "./serverRuntime";
import { contractWriterRequiredConfigKeys } from "../domain/contractWriterRuntime";

export type CampaignOsApiServiceStatus = "ready" | "blocked" | "deferred" | "stopped";
export type CampaignOsApiServiceDiagnosticSeverity = "error" | "warning" | "info";
export type CampaignOsApiServiceAttachPointStatus = "ready" | "blocked" | "deferred";
export type CampaignOsApiServiceAttachPointArea =
  | "database"
  | "auth"
  | "worker"
  | "scheduler"
  | "provider"
  | "contract"
  | "storage"
  | "analytics"
  | "reward"
  | "deployment"
  | "observability";
export type CampaignOsApiServiceAttachPointId =
  | "live-database-driver"
  | "migration-executor"
  | "wallet-proof-verifier"
  | "session-issuer"
  | "project-membership-store"
  | "verification-worker"
  | "scheduler"
  | "provider-adapters"
  | "contract-writer"
  | "object-storage"
  | "analytics-ingestion"
  | "reward-custody"
  | "reward-distribution"
  | "deployment-config"
  | "observability-exporter";
export type CampaignOsApiServiceDiagnosticCode =
  | "API_SERVICE_RUNTIME_INVALID"
  | "API_SERVICE_BACKEND_READINESS_INVALID"
  | "API_SERVICE_PRODUCTION_BLOCKED"
  | "API_SERVICE_SHUTDOWN_IN_PROGRESS"
  | "API_SERVICE_STOPPED";
export type CampaignOsApiServiceShutdownState = "running" | "stopping" | "stopped";

export interface CampaignOsApiServiceDiagnostic {
  code: CampaignOsApiServiceDiagnosticCode;
  field: string;
  message: string;
  severity: CampaignOsApiServiceDiagnosticSeverity;
}

export interface CampaignOsApiServiceAttachPoint {
  area: CampaignOsApiServiceAttachPointArea;
  attachPoint: string;
  blockedBy: string[];
  id: CampaignOsApiServiceAttachPointId;
  localContractReady?: boolean;
  requiredBeforeProduction: boolean;
  productionReady?: false;
  status: CampaignOsApiServiceAttachPointStatus;
}

export interface CampaignOsApiServiceComposition {
  activation: BackendRuntimeActivationContract;
  apiRuntime: {
    handlerSource: "createCampaignOsApiRuntime";
    metadataRouteIds: string[];
    routeCount: number;
    routeIds: string[];
  };
  authEnforcement: {
    liveSigningExecuted: false;
    liveVerificationExecuted: false;
    localProofVerifierContractReady: true;
    localSessionIssuerContractReady: true;
    localEnforcedRouteCount: number;
    mode: BackendServiceReadinessReport["authEnforcement"]["mode"];
    productionProofVerifierReady: false;
    productionProjectOwnershipSourceReady: false;
    productionSessionIssuerReady: false;
  };
  backendRuntimeBootstrap: {
    deferredDependencyIds: string[];
    id: BackendRuntimeBootstrapContract["id"];
    status: BackendRuntimeBootstrapContract["status"];
    valid: boolean;
  };
  backendService: {
    entrypointId: string;
    profileId: BackendRuntimeProfileId;
    valid: boolean;
  };
  databaseAdapterRuntime: {
    liveConnectionAttempted: false;
    liveQueryExecutionEnabled: false;
    status: BackendServiceReadinessReport["databaseAdapterRuntime"]["status"];
    valid: boolean;
  };
  persistenceRuntime: {
    liveConnectionAttempted: false;
    liveExecutionEnabled: false;
    status: BackendServiceReadinessReport["persistenceRuntime"]["status"];
    valid: boolean;
  };
  serverRuntime: {
    host: string;
    port: number;
    profileId: BackendRuntimeProfileId;
    requestGuardTraceHeader: "x-campaign-os-trace-id";
    valid: boolean;
  };
}

export interface CampaignOsApiServiceReadiness {
  authProductionBlockerIds: string[];
  blockedDependencyIds: CampaignOsApiServiceAttachPointId[];
  contractWriteEnabled: false;
  deferredDependencyIds: CampaignOsApiServiceAttachPointId[];
  deployableBoundaryReady: boolean;
  liveConnectionAttempted: false;
  liveSideEffectsEnabled: false;
  productionReady: false;
  workerExecutionEnabled: false;
}

export interface CampaignOsApiServiceShutdown {
  activeRequestCount: number;
  closedAt?: string;
  shutdownTimeoutMs: number;
  state: CampaignOsApiServiceShutdownState;
  stopStartedAt?: string;
}

export interface CampaignOsApiServiceContract {
  attachMap: CampaignOsApiServiceAttachPoint[];
  composition: CampaignOsApiServiceComposition;
  diagnostics: CampaignOsApiServiceDiagnostic[];
  diagnosticCodes: CampaignOsApiServiceDiagnosticCode[];
  host: string;
  id: "campaign-os-api-service";
  port: number;
  profile: BackendRuntimeProfile;
  profileId: BackendRuntimeProfileId;
  readiness: CampaignOsApiServiceReadiness;
  runtimeVersion: string;
  shutdown: CampaignOsApiServiceShutdown;
  startedAt: string;
  status: CampaignOsApiServiceStatus;
  supportMode: BackendRuntimeProfile["supportMode"];
  valid: boolean;
}

export interface CampaignOsApiServiceConfig extends ResolveApiServerRuntimeContractOptions {
  now?: Date;
  shutdownState?: Partial<Omit<CampaignOsApiServiceShutdown, "shutdownTimeoutMs">>;
}

export const campaignOsApiServiceAttachMap: CampaignOsApiServiceAttachPoint[] = [
  {
    area: "database",
    attachPoint: "src/server/databaseAdapterRuntime.ts",
    blockedBy: ["production DB driver package", "connection pool implementation"],
    id: "live-database-driver",
    requiredBeforeProduction: true,
    status: "blocked",
  },
  {
    area: "database",
    attachPoint: "src/server/databaseMigrationHandoff.ts",
    blockedBy: ["live migration runner", "migration approval gate"],
    id: "migration-executor",
    requiredBeforeProduction: true,
    status: "blocked",
  },
  {
    area: "auth",
    attachPoint: "src/server/authSession.ts",
    blockedBy: ["live wallet verifier", "auth nonce store"],
    id: "wallet-proof-verifier",
    localContractReady: true,
    productionReady: false,
    requiredBeforeProduction: true,
    status: "ready",
  },
  {
    area: "auth",
    attachPoint: "src/server/authSession.ts",
    blockedBy: ["session signing key", "secret manager", "production session store", "live wallet verifier"],
    id: "session-issuer",
    localContractReady: true,
    productionReady: false,
    requiredBeforeProduction: true,
    status: "ready",
  },
  {
    area: "auth",
    attachPoint: "src/server/authEnforcement.ts",
    blockedBy: ["organization membership store", "project ownership source"],
    id: "project-membership-store",
    requiredBeforeProduction: true,
    status: "blocked",
  },
  {
    area: "worker",
    attachPoint: "src/server/backendService.ts",
    blockedBy: ["queue provider selection", "worker runtime mission"],
    id: "verification-worker",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    area: "scheduler",
    attachPoint: "src/server/backendService.ts",
    blockedBy: ["scheduler runtime", "retry and backoff policy"],
    id: "scheduler",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    area: "provider",
    attachPoint: "src/server/servicePorts.ts",
    blockedBy: ["provider registry", "degradation policy", "service credentials"],
    id: "provider-adapters",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    area: "contract",
    attachPoint: "src/server/servicePorts.ts",
    blockedBy: [...contractWriterRequiredConfigKeys],
    id: "contract-writer",
    requiredBeforeProduction: true,
    status: "blocked",
  },
  {
    area: "storage",
    attachPoint: "src/server/persistenceAdapterPort.ts",
    blockedBy: ["object storage adapter", "signed URL safety review"],
    id: "object-storage",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    area: "analytics",
    attachPoint: "src/server/persistenceAdapterPort.ts",
    blockedBy: ["analytics warehouse adapter", "event ingestion contract"],
    id: "analytics-ingestion",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    area: "reward",
    attachPoint: "src/server/servicePorts.ts",
    blockedBy: ["reward custody mission", "finance/security review"],
    id: "reward-custody",
    requiredBeforeProduction: true,
    status: "blocked",
  },
  {
    area: "reward",
    attachPoint: "src/server/servicePorts.ts",
    blockedBy: ["reward distribution mission", ...contractWriterRequiredConfigKeys],
    id: "reward-distribution",
    requiredBeforeProduction: true,
    status: "blocked",
  },
  {
    area: "deployment",
    attachPoint: "deployment/runtime-config",
    blockedBy: ["container image", "reverse proxy", "runtime environment config"],
    id: "deployment-config",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    area: "observability",
    attachPoint: "observability/exporter",
    blockedBy: ["metrics exporter", "structured log sink", "trace collector"],
    id: "observability-exporter",
    requiredBeforeProduction: true,
    status: "deferred",
  },
];

const diagnostic = (
  code: CampaignOsApiServiceDiagnosticCode,
  field: string,
  message: string,
  severity: CampaignOsApiServiceDiagnosticSeverity = "error",
): CampaignOsApiServiceDiagnostic => ({
  code,
  field,
  message,
  severity,
});

const createShutdown = (
  runtimeContract: ApiServerRuntimeContract,
  shutdownState: CampaignOsApiServiceConfig["shutdownState"],
): CampaignOsApiServiceShutdown => ({
  activeRequestCount: shutdownState?.activeRequestCount ?? 0,
  closedAt: shutdownState?.closedAt,
  shutdownTimeoutMs: runtimeContract.shutdown.shutdownTimeoutMs,
  state: shutdownState?.state ?? "running",
  stopStartedAt: shutdownState?.stopStartedAt,
});

const createComposition = (
  runtimeContract: ApiServerRuntimeContract,
  backendReadiness: BackendServiceReadinessReport,
): CampaignOsApiServiceComposition => ({
  activation: backendReadiness.backendRuntimeBootstrap.activation,
  apiRuntime: {
    handlerSource: "createCampaignOsApiRuntime",
    metadataRouteIds: apiRuntimeRoutes
      .filter((route) => route.serviceGroup === "runtime")
      .map((route) => route.id),
    routeCount: apiRuntimeRoutes.length,
    routeIds: apiRuntimeRoutes.map((route) => route.id),
  },
  authEnforcement: {
    liveSigningExecuted: backendReadiness.authEnforcement.liveSigningExecuted,
    liveVerificationExecuted: backendReadiness.authEnforcement.liveVerificationExecuted,
    localProofVerifierContractReady: backendReadiness.authEnforcement.localProofVerifierContractReady,
    localSessionIssuerContractReady: backendReadiness.authEnforcement.localSessionIssuerContractReady,
    localEnforcedRouteCount: backendReadiness.authEnforcement.localEnforcedRouteCount,
    mode: backendReadiness.authEnforcement.mode,
    productionProofVerifierReady: backendReadiness.authEnforcement.productionProofVerifierReady,
    productionProjectOwnershipSourceReady: backendReadiness.authEnforcement.productionProjectOwnershipSourceReady,
    productionSessionIssuerReady: backendReadiness.authEnforcement.productionSessionIssuerReady,
  },
  backendRuntimeBootstrap: {
    deferredDependencyIds: backendReadiness.backendRuntimeBootstrap.deferredDependencyIds,
    id: backendReadiness.backendRuntimeBootstrap.id,
    status: backendReadiness.backendRuntimeBootstrap.status,
    valid: backendReadiness.backendRuntimeBootstrap.valid,
  },
  backendService: {
    entrypointId: backendReadiness.entrypoint.id,
    profileId: backendReadiness.config.profileId,
    valid: backendReadiness.validation.valid,
  },
  databaseAdapterRuntime: {
    liveConnectionAttempted: backendReadiness.databaseAdapterRuntime.liveConnectionAttempted,
    liveQueryExecutionEnabled: backendReadiness.databaseAdapterRuntime.liveQueryExecutionEnabled,
    status: backendReadiness.databaseAdapterRuntime.status,
    valid: backendReadiness.databaseAdapterRuntime.valid,
  },
  persistenceRuntime: {
    liveConnectionAttempted: backendReadiness.persistenceRuntime.liveConnectionAttempted,
    liveExecutionEnabled: backendReadiness.persistenceRuntime.migrationGate.liveExecutionEnabled,
    status: backendReadiness.persistenceRuntime.status,
    valid: backendReadiness.persistenceRuntime.valid,
  },
  serverRuntime: {
    host: runtimeContract.host,
    port: runtimeContract.port,
    profileId: runtimeContract.profileId,
    requestGuardTraceHeader: runtimeContract.requestGuard.traceHeaderName,
    valid: runtimeContract.valid,
  },
});

const createDiagnostics = ({
  backendReadiness,
  runtimeContract,
  shutdown,
}: {
  backendReadiness: BackendServiceReadinessReport;
  runtimeContract: ApiServerRuntimeContract;
  shutdown: CampaignOsApiServiceShutdown;
}): CampaignOsApiServiceDiagnostic[] => {
  const diagnostics: CampaignOsApiServiceDiagnostic[] = [];

  if (!runtimeContract.valid) {
    diagnostics.push(diagnostic(
      "API_SERVICE_RUNTIME_INVALID",
      "serverRuntime",
      "Campaign OS API server runtime contract is blocked.",
    ));
  }

  if (!backendReadiness.validation.valid) {
    diagnostics.push(diagnostic(
      "API_SERVICE_BACKEND_READINESS_INVALID",
      "backendReadiness",
      "Campaign OS backend readiness validation is blocked.",
    ));
  }

  if (runtimeContract.profileId === "production-required") {
    diagnostics.push(diagnostic(
      "API_SERVICE_PRODUCTION_BLOCKED",
      "profileId",
      "Production-required API service bootstrap is blocked until live production dependencies are implemented.",
    ));
  }

  if (shutdown.state === "stopping") {
    diagnostics.push(diagnostic(
      "API_SERVICE_SHUTDOWN_IN_PROGRESS",
      "shutdown",
      "Campaign OS API service bootstrap is shutting down.",
      "warning",
    ));
  }

  if (shutdown.state === "stopped") {
    diagnostics.push(diagnostic(
      "API_SERVICE_STOPPED",
      "shutdown",
      "Campaign OS API service bootstrap is stopped.",
    ));
  }

  return diagnostics;
};

const createReadiness = (
  backendReadiness: BackendServiceReadinessReport,
  diagnostics: readonly CampaignOsApiServiceDiagnostic[],
): CampaignOsApiServiceReadiness => {
  const blockedDependencyIds = campaignOsApiServiceAttachMap
    .filter((attachPoint) => attachPoint.status === "blocked")
    .map((attachPoint) => attachPoint.id);
  const deferredDependencyIds = campaignOsApiServiceAttachMap
    .filter((attachPoint) => attachPoint.status === "deferred")
    .map((attachPoint) => attachPoint.id);
  const blocked = diagnostics.some((item) => item.severity === "error");

  return {
    authProductionBlockerIds: backendReadiness.authSession.authContracts.blockedDependencyIds,
    blockedDependencyIds,
    contractWriteEnabled: false,
    deferredDependencyIds,
    deployableBoundaryReady: !blocked,
    liveConnectionAttempted: false,
    liveSideEffectsEnabled: false,
    productionReady: false,
    workerExecutionEnabled: false,
  };
};

const resolveStatus = ({
  diagnostics,
  shutdown,
}: {
  diagnostics: readonly CampaignOsApiServiceDiagnostic[];
  shutdown: CampaignOsApiServiceShutdown;
}): CampaignOsApiServiceStatus => {
  if (shutdown.state === "stopped") {
    return "stopped";
  }

  if (shutdown.state === "stopping") {
    return "deferred";
  }

  return diagnostics.some((item) => item.severity === "error") ? "blocked" : "ready";
};

export const createCampaignOsApiServiceContract = ({
  allowedCorsOrigins,
  env,
  host,
  maxBodyBytes,
  now,
  port,
  profileId,
  shutdownState,
  shutdownTimeoutMs,
  startedAt,
  version,
}: CampaignOsApiServiceConfig = {}): CampaignOsApiServiceContract => {
  const runtimeContract = resolveApiServerRuntimeContract({
    allowedCorsOrigins,
    env,
    host,
    maxBodyBytes,
    port,
    profileId,
    shutdownTimeoutMs,
    startedAt,
    version,
  });
  const backendReadiness = createBackendServiceReadinessReport({
    configOptions: {
      env,
      host: runtimeContract.host,
      port: runtimeContract.port,
      profileId: runtimeContract.profileId,
      version: runtimeContract.runtimeVersion,
    },
    generatedAt: runtimeContract.startedAt,
    serverRuntimeOptions: {
      allowedCorsOrigins,
      env,
      host: runtimeContract.host,
      maxBodyBytes: runtimeContract.requestGuard.maxBodyBytes,
      port: runtimeContract.port,
      profileId: runtimeContract.profileId,
      shutdownTimeoutMs: runtimeContract.shutdown.shutdownTimeoutMs,
      startedAt: runtimeContract.startedAt,
      version: runtimeContract.runtimeVersion,
    },
  });
  const shutdown = createShutdown(runtimeContract, shutdownState);
  const diagnostics = createDiagnostics({
    backendReadiness,
    runtimeContract,
    shutdown,
  });
  const status = resolveStatus({ diagnostics, shutdown });
  const readiness = createReadiness(backendReadiness, diagnostics);
  const generatedAt = now?.toISOString();

  return {
    attachMap: campaignOsApiServiceAttachMap,
    composition: createComposition(runtimeContract, backendReadiness),
    diagnostics,
    diagnosticCodes: diagnostics.map((item) => item.code),
    host: runtimeContract.host,
    id: "campaign-os-api-service",
    port: runtimeContract.port,
    profile: runtimeContract.profile,
    profileId: runtimeContract.profileId,
    readiness,
    runtimeVersion: runtimeContract.runtimeVersion,
    shutdown,
    startedAt: generatedAt && Number.isNaN(Date.parse(runtimeContract.startedAt))
      ? generatedAt
      : runtimeContract.startedAt,
    status,
    supportMode: runtimeContract.supportMode,
    valid: diagnostics.every((item) => item.severity !== "error"),
  };
};
