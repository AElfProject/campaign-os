import type { BackendRuntimeProfileId } from "./backendProfiles";
import {
  createBackendRuntimeActivationContract,
  type BackendRuntimeActivationContract,
} from "./backendRuntimeActivation";
import type { BackendServiceReadinessReport } from "./backendService";
import type { ApiServerRuntimeContract } from "./serverRuntime";

export type BackendRuntimeBootstrapStatus = "ready" | "blocked" | "deferred";
export type BackendRuntimeBootstrapDiagnosticSeverity = "error" | "warning" | "info";
export type BackendRuntimeBootstrapDiagnosticCode =
  | "BACKEND_RUNTIME_BOOTSTRAP_PRODUCTION_BLOCKED"
  | "BACKEND_RUNTIME_BOOTSTRAP_SERVER_RUNTIME_INVALID"
  | "BACKEND_RUNTIME_BOOTSTRAP_BACKEND_READINESS_INVALID"
  | "BACKEND_RUNTIME_BOOTSTRAP_SHUTDOWN_IN_PROGRESS"
  | "BACKEND_RUNTIME_BOOTSTRAP_STOPPED";

export type BackendRuntimeDeferredDependencyArea =
  | "deployment"
  | "database"
  | "auth"
  | "provider"
  | "worker"
  | "scheduler"
  | "contract"
  | "storage"
  | "observability"
  | "analytics"
  | "reward";

export type BackendRuntimeDeferredDependencyStatus = "deferred" | "blocked";
export type BackendRuntimeShutdownState = "running" | "stopping" | "stopped";

export interface BackendRuntimeBootstrapDiagnostic {
  code: BackendRuntimeBootstrapDiagnosticCode;
  field: string;
  message: string;
  severity: BackendRuntimeBootstrapDiagnosticSeverity;
}

export interface BackendRuntimeTracePolicy {
  failureEnvelopeTraceId: true;
  startupLogIncludesTracePolicy: true;
  successEnvelopeTraceId: true;
  traceHeaderName: "x-campaign-os-trace-id";
}

export interface BackendRuntimeStartupSummary {
  allowedOriginCount: number;
  attachPointCount: number;
  blockedAttachPointCount: number;
  corsEnabled: boolean;
  deferredAttachPointIds: string[];
  diagnosticCodes: string[];
  host: string;
  port: number;
  profileId: BackendRuntimeProfileId;
  runtimeVersion: string;
  startedAt: string;
  supportMode: string;
  valid: boolean;
}

export interface BackendRuntimeRequestGuardSummary {
  guardedFailureEnvelope: true;
  jsonContentTypes: string[];
  maxBodyBytes: number;
  traceHeaderName: "x-campaign-os-trace-id";
}

export interface BackendRuntimeShutdownSummary {
  activeRequestCount: number;
  closedAt?: string;
  shutdownTimeoutMs: number;
  state: BackendRuntimeShutdownState;
  stopStartedAt?: string;
}

export interface BackendRuntimeDeferredDependency {
  area: BackendRuntimeDeferredDependencyArea;
  blockedBy: string[];
  id: string;
  label: string;
  requiredBeforeProduction: true;
  status: BackendRuntimeDeferredDependencyStatus;
}

export interface BackendRuntimeReadinessProjection {
  authSession: {
    status: BackendServiceReadinessReport["authSession"]["status"];
    valid: boolean;
    verificationMode: BackendServiceReadinessReport["authSession"]["proofBoundary"]["verificationMode"];
  };
  backend: {
    diagnosticCodes: string[];
    entrypointId: string;
    supportMode: string;
    valid: boolean;
  };
  databaseAdapterRuntime: {
    diagnosticCodes: string[];
    liveConnectionAttempted: false;
    liveQueryExecutionEnabled: false;
    status: BackendServiceReadinessReport["databaseAdapterRuntime"]["status"];
    valid: boolean;
  };
  persistenceRuntime: {
    diagnosticCodes: string[];
    liveConnectionAttempted: false;
    liveExecutionEnabled: false;
    status: BackendServiceReadinessReport["persistenceRuntime"]["status"];
    valid: boolean;
  };
}

export interface BackendRuntimeBootstrapContract {
  activation: BackendRuntimeActivationContract;
  deferredDependencies: BackendRuntimeDeferredDependency[];
  deferredDependencyIds: string[];
  diagnosticCodes: BackendRuntimeBootstrapDiagnosticCode[];
  diagnostics: BackendRuntimeBootstrapDiagnostic[];
  id: "campaign-os-backend-runtime-bootstrap";
  profileId: BackendRuntimeProfileId;
  readiness: BackendRuntimeReadinessProjection;
  requestGuard: BackendRuntimeRequestGuardSummary;
  runtimeVersion: string;
  shutdown: BackendRuntimeShutdownSummary;
  startup: BackendRuntimeStartupSummary;
  status: BackendRuntimeBootstrapStatus;
  supportMode: string;
  tracePolicy: BackendRuntimeTracePolicy;
  uptimeMs: number;
  valid: boolean;
}

export interface BackendRuntimeBootstrapShutdownState {
  activeRequestCount: number;
  closedAt?: string;
  state: BackendRuntimeShutdownState;
  stopStartedAt?: string;
}

export interface CreateBackendRuntimeBootstrapContractOptions {
  backendReadiness: BackendServiceReadinessReport;
  contract: ApiServerRuntimeContract;
  now?: Date;
  shutdownState?: BackendRuntimeBootstrapShutdownState;
}

export const backendRuntimeBootstrapDeferredDependencies: BackendRuntimeDeferredDependency[] = [
  {
    area: "deployment",
    blockedBy: ["container image", "reverse proxy", "runtime environment config"],
    id: "deployment-config",
    label: "Deployment configuration",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    area: "database",
    blockedBy: ["driver package selection", "connection pool implementation"],
    id: "production-database-driver",
    label: "Production database driver",
    requiredBeforeProduction: true,
    status: "blocked",
  },
  {
    area: "database",
    blockedBy: ["schema migration implementation", "migration approval gate"],
    id: "database-migration-executor",
    label: "Database migration executor",
    requiredBeforeProduction: true,
    status: "blocked",
  },
  {
    area: "auth",
    blockedBy: ["wallet signature verifier", "session issuer", "RBAC enforcement"],
    id: "auth-middleware",
    label: "Auth middleware",
    requiredBeforeProduction: true,
    status: "blocked",
  },
  {
    area: "provider",
    blockedBy: ["provider registry", "degradation policy", "service credentials"],
    id: "provider-adapters",
    label: "Provider adapters",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    area: "worker",
    blockedBy: ["queue provider selection", "worker runtime mission"],
    id: "worker-ingress",
    label: "Worker ingress",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    area: "scheduler",
    blockedBy: ["scheduler runtime", "retry and backoff policy"],
    id: "scheduler",
    label: "Scheduler",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    area: "contract",
    blockedBy: ["contract writer mission", "signer policy", "contract ops review"],
    id: "contract-writer",
    label: "Contract writer",
    requiredBeforeProduction: true,
    status: "blocked",
  },
  {
    area: "storage",
    blockedBy: ["object storage adapter", "signed URL safety review"],
    id: "object-storage-export",
    label: "Object storage export",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    area: "observability",
    blockedBy: ["metrics exporter", "structured log sink", "trace collector"],
    id: "observability-exporter",
    label: "Observability exporter",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    area: "analytics",
    blockedBy: ["analytics warehouse adapter", "event ingestion contract"],
    id: "analytics-warehouse",
    label: "Analytics warehouse",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    area: "reward",
    blockedBy: ["reward custody mission", "finance/security review"],
    id: "reward-custody",
    label: "Reward custody",
    requiredBeforeProduction: true,
    status: "blocked",
  },
  {
    area: "reward",
    blockedBy: ["reward distribution mission", "contract writer mission"],
    id: "reward-distribution",
    label: "Reward distribution",
    requiredBeforeProduction: true,
    status: "blocked",
  },
];

const defaultShutdownState = (): BackendRuntimeBootstrapShutdownState => ({
  activeRequestCount: 0,
  state: "running",
});

const diagnostic = (
  code: BackendRuntimeBootstrapDiagnosticCode,
  field: string,
  message: string,
  severity: BackendRuntimeBootstrapDiagnosticSeverity = "error",
): BackendRuntimeBootstrapDiagnostic => ({
  code,
  field,
  message,
  severity,
});

const createStartupSummary = (
  contract: ApiServerRuntimeContract,
): BackendRuntimeStartupSummary => ({
  allowedOriginCount: contract.corsPolicy.allowedOrigins.length,
  attachPointCount: contract.attachMap.length,
  blockedAttachPointCount: contract.attachMap.filter((attachPoint) => attachPoint.status === "blocked").length,
  corsEnabled: contract.corsPolicy.enabled,
  deferredAttachPointIds: contract.attachMap.map((attachPoint) => attachPoint.id),
  diagnosticCodes: contract.diagnostics.map((item) => item.code),
  host: contract.host,
  port: contract.port,
  profileId: contract.profileId,
  runtimeVersion: contract.runtimeVersion,
  startedAt: contract.startedAt,
  supportMode: contract.supportMode,
  valid: contract.valid,
});

const createReadinessProjection = (
  backendReadiness: BackendServiceReadinessReport,
): BackendRuntimeReadinessProjection => ({
  authSession: {
    status: backendReadiness.authSession.status,
    valid: backendReadiness.authSession.validation.valid,
    verificationMode: backendReadiness.authSession.proofBoundary.verificationMode,
  },
  backend: {
    diagnosticCodes: backendReadiness.validation.issues.map((issue) => issue.code),
    entrypointId: backendReadiness.entrypoint.id,
    supportMode: backendReadiness.entrypoint.supportMode,
    valid: backendReadiness.validation.valid,
  },
  databaseAdapterRuntime: {
    diagnosticCodes: backendReadiness.databaseAdapterRuntime.diagnostics.map((item) => item.code),
    liveConnectionAttempted: backendReadiness.databaseAdapterRuntime.liveConnectionAttempted,
    liveQueryExecutionEnabled: backendReadiness.databaseAdapterRuntime.liveQueryExecutionEnabled,
    status: backendReadiness.databaseAdapterRuntime.status,
    valid: backendReadiness.databaseAdapterRuntime.valid
      && backendReadiness.databaseAdapterRuntime.migrationHandoff.valid,
  },
  persistenceRuntime: {
    diagnosticCodes: backendReadiness.persistenceRuntime.diagnostics.map((item) => item.code),
    liveConnectionAttempted: backendReadiness.persistenceRuntime.liveConnectionAttempted,
    liveExecutionEnabled: backendReadiness.persistenceRuntime.migrationGate.liveExecutionEnabled,
    status: backendReadiness.persistenceRuntime.status,
    valid: backendReadiness.persistenceRuntime.valid
      && backendReadiness.persistenceRuntime.migrationGate.status !== "blocked",
  },
});

const createDiagnostics = ({
  backendReadiness,
  contract,
  shutdownState,
}: {
  backendReadiness: BackendServiceReadinessReport;
  contract: ApiServerRuntimeContract;
  shutdownState: BackendRuntimeBootstrapShutdownState;
}): BackendRuntimeBootstrapDiagnostic[] => {
  const diagnostics: BackendRuntimeBootstrapDiagnostic[] = [];

  if (!contract.valid) {
    diagnostics.push(diagnostic(
      "BACKEND_RUNTIME_BOOTSTRAP_SERVER_RUNTIME_INVALID",
      "serverRuntime",
      "API server runtime contract is blocked.",
    ));
  }

  if (!backendReadiness.validation.valid) {
    diagnostics.push(diagnostic(
      "BACKEND_RUNTIME_BOOTSTRAP_BACKEND_READINESS_INVALID",
      "backendReadiness",
      "Backend service readiness validation is blocked.",
    ));
  }

  if (contract.profileId === "production-required") {
    diagnostics.push(diagnostic(
      "BACKEND_RUNTIME_BOOTSTRAP_PRODUCTION_BLOCKED",
      "profileId",
      "Production-required backend runtime bootstrap is blocked until production dependencies are implemented.",
    ));
  }

  if (shutdownState.state === "stopping") {
    diagnostics.push(diagnostic(
      "BACKEND_RUNTIME_BOOTSTRAP_SHUTDOWN_IN_PROGRESS",
      "shutdown",
      "Backend runtime bootstrap is shutting down.",
      "warning",
    ));
  }

  if (shutdownState.state === "stopped") {
    diagnostics.push(diagnostic(
      "BACKEND_RUNTIME_BOOTSTRAP_STOPPED",
      "shutdown",
      "Backend runtime bootstrap is stopped.",
    ));
  }

  return diagnostics;
};

const resolveStatus = ({
  diagnostics,
  shutdownState,
}: {
  diagnostics: readonly BackendRuntimeBootstrapDiagnostic[];
  shutdownState: BackendRuntimeBootstrapShutdownState;
}): BackendRuntimeBootstrapStatus => {
  if (shutdownState.state === "stopping") {
    return "deferred";
  }

  return diagnostics.some((item) => item.severity === "error") ? "blocked" : "ready";
};

export const createBackendRuntimeBootstrapContract = ({
  backendReadiness,
  contract,
  now = new Date(),
  shutdownState = defaultShutdownState(),
}: CreateBackendRuntimeBootstrapContractOptions): BackendRuntimeBootstrapContract => {
  const diagnostics = createDiagnostics({
    backendReadiness,
    contract,
    shutdownState,
  });
  const status = resolveStatus({ diagnostics, shutdownState });
  const uptimeMs = Math.max(0, now.getTime() - Date.parse(contract.startedAt));
  const valid = diagnostics.every((item) => item.severity !== "error");
  const activation = createBackendRuntimeActivationContract({ runtime: contract });

  return {
    activation,
    deferredDependencies: backendRuntimeBootstrapDeferredDependencies,
    deferredDependencyIds: backendRuntimeBootstrapDeferredDependencies.map((dependency) => dependency.id),
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    id: "campaign-os-backend-runtime-bootstrap",
    profileId: contract.profileId,
    readiness: createReadinessProjection(backendReadiness),
    requestGuard: {
      guardedFailureEnvelope: true,
      jsonContentTypes: contract.requestGuard.jsonContentTypes,
      maxBodyBytes: contract.requestGuard.maxBodyBytes,
      traceHeaderName: contract.requestGuard.traceHeaderName,
    },
    runtimeVersion: contract.runtimeVersion,
    shutdown: {
      ...shutdownState,
      shutdownTimeoutMs: contract.shutdown.shutdownTimeoutMs,
    },
    startup: createStartupSummary(contract),
    status,
    supportMode: contract.supportMode,
    tracePolicy: {
      failureEnvelopeTraceId: true,
      startupLogIncludesTracePolicy: true,
      successEnvelopeTraceId: true,
      traceHeaderName: contract.requestGuard.traceHeaderName,
    },
    uptimeMs,
    valid,
  };
};
