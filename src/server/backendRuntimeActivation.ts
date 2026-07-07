import {
  productionBackendRequiredConfigKeys,
  type BackendRuntimeProfile,
  type BackendRuntimeProfileId,
} from "./backendProfiles";
import {
  queueRuntimeProductionPreconditions,
  type QueueRuntimePreconditionArea,
} from "./queueRuntime";
import {
  schedulerRuntimeProductionPreconditions,
  type SchedulerRuntimePreconditionArea,
} from "./schedulerRuntime";
import type { ApiServerRuntimeContract } from "./serverRuntime";
import { workerSchedulerProductionPreconditions } from "./workerSchedulerRuntime";

export type RuntimeActivationConfigCategory =
  | "server"
  | "cors"
  | "profile"
  | "database"
  | "auth"
  | "queue"
  | "provider"
  | "worker"
  | "scheduler"
  | "contract"
  | "storage"
  | "observability"
  | "analytics"
  | "reward";
export type RuntimeActivationConfigStatus = "supported" | "deferred" | "blocked";
export type ProductionRuntimeDependencyStatus = "blocked" | "deferred";
export type ProductionRuntimeDependencyArea =
  | "database"
  | "auth"
  | "queue"
  | "provider"
  | "worker"
  | "scheduler"
  | "contract"
  | "storage"
  | "observability"
  | "analytics"
  | "reward"
  | "deployment";

export interface RuntimeActivationConfigKey {
  category: RuntimeActivationConfigCategory;
  key: string;
  redacted: true;
  required: boolean;
  requiredFor: BackendRuntimeProfileId | "future-production";
  status: RuntimeActivationConfigStatus;
}

export interface ProductionRuntimeDependencyBlocker {
  area: ProductionRuntimeDependencyArea;
  attachPoint: string;
  blockedBy: string[];
  id: string;
  requiredBeforeProduction: true;
  status: ProductionRuntimeDependencyStatus;
}

export interface BackendRuntimeTracePolicy {
  failureEnvelopeTraceId: true;
  startupLogIncludesTracePolicy: true;
  successEnvelopeTraceId: true;
  traceHeaderName: "x-campaign-os-trace-id";
}

export interface BackendRuntimeShutdownHandoff {
  idempotentStop: true;
  shutdownTimeoutMs: number;
}

export interface BackendDeploymentHandoff {
  contractsEndpoint: "/api/contracts";
  environmentKeys: RuntimeActivationConfigKey[];
  healthEndpoint: "/api/health";
  requiredBeforeProduction: string[];
  runtimeTarget: "api_service";
  shutdown: BackendRuntimeShutdownHandoff;
  smokeCommand: "npm run server:smoke";
  startCommand: "npm run server:start";
  tracePolicy: BackendRuntimeTracePolicy;
}

export interface BackendRuntimeActivationContract {
  contractsEndpoint: "/api/contracts";
  deploymentHandoff: BackendDeploymentHandoff;
  entrypointPath: "src/server/server.ts";
  healthEndpoint: "/api/health";
  id: "campaign-os-backend-runtime-activation";
  liveSideEffectsEnabled: false;
  packageCommands: {
    smoke: "npm run server:smoke";
    start: "npm run server:start";
  };
  productionDependencyBlockers: ProductionRuntimeDependencyBlocker[];
  productionReady: false;
  profileId: BackendRuntimeProfileId;
  runtimeTarget: "node-http-api-service";
  runtimeVersion: string;
  supportMode: BackendRuntimeProfile["supportMode"];
  tracePolicy: BackendRuntimeTracePolicy;
}

export interface CreateBackendRuntimeActivationContractOptions {
  runtime: ApiServerRuntimeContract;
}

const configKey = (
  key: string,
  category: RuntimeActivationConfigCategory,
  status: RuntimeActivationConfigStatus,
  requiredFor: RuntimeActivationConfigKey["requiredFor"] = "future-production",
): RuntimeActivationConfigKey => ({
  category,
  key,
  redacted: true,
  required: requiredFor === "production-required" || productionBackendRequiredConfigKeys.includes(
    key as (typeof productionBackendRequiredConfigKeys)[number],
  ),
  requiredFor,
  status,
});

const queueRuntimeConfigCategory = (
  area: QueueRuntimePreconditionArea,
): RuntimeActivationConfigCategory => {
  if (area === "queue" || area === "dead_letter") {
    return "queue";
  }

  if (area === "retry") {
    return "scheduler";
  }

  if (area === "idempotency" || area === "lease") {
    return "worker";
  }

  return area;
};

const schedulerRuntimeConfigCategory = (
  area: SchedulerRuntimePreconditionArea,
): RuntimeActivationConfigCategory => {
  if (area === "auth") {
    return "auth";
  }

  if (area === "queue" || area === "dead_letter") {
    return "queue";
  }

  if (area === "observability") {
    return "observability";
  }

  return "scheduler";
};

const schedulerRuntimeDependencyArea = (
  area: SchedulerRuntimePreconditionArea,
): ProductionRuntimeDependencyArea => {
  if (area === "auth") {
    return "auth";
  }

  if (area === "queue" || area === "dead_letter") {
    return "queue";
  }

  if (area === "observability") {
    return "observability";
  }

  return "scheduler";
};

export const runtimeActivationConfigKeys: RuntimeActivationConfigKey[] = [
  configKey("CAMPAIGN_OS_API_HOST", "server", "supported", "local-review"),
  configKey("CAMPAIGN_OS_API_PORT", "server", "supported", "local-review"),
  configKey("CAMPAIGN_OS_API_VERSION", "server", "supported", "local-review"),
  configKey("CAMPAIGN_OS_API_MAX_BODY_BYTES", "server", "supported", "local-review"),
  configKey("CAMPAIGN_OS_API_SHUTDOWN_TIMEOUT_MS", "server", "supported", "local-review"),
  configKey("CAMPAIGN_OS_API_CORS_ENABLED", "cors", "supported", "local-review"),
  configKey("CAMPAIGN_OS_API_CORS_ORIGINS", "cors", "supported", "local-review"),
  configKey("CAMPAIGN_OS_BACKEND_PROFILE", "profile", "supported", "local-review"),
  configKey("CAMPAIGN_OS_DATABASE_URL", "database", "blocked", "production-required"),
  configKey("CAMPAIGN_OS_AUTH_SECRET", "auth", "blocked", "production-required"),
  configKey("CAMPAIGN_OS_PROVIDER_REGISTRY_URL", "provider", "deferred", "production-required"),
  ...schedulerRuntimeProductionPreconditions.flatMap((precondition) =>
    precondition.requiredConfigKeys.map((key) =>
      configKey(
        key,
        schedulerRuntimeConfigCategory(precondition.area),
        precondition.status,
        "production-required",
      ),
    ),
  ),
  ...workerSchedulerProductionPreconditions.flatMap((precondition) =>
    precondition.requiredConfigKeys.map((key) =>
      configKey(
        key,
        precondition.area === "idempotency" || precondition.area === "lease"
          ? "worker"
          : precondition.area,
        precondition.status,
        key === "CAMPAIGN_OS_DEGRADATION_POLICY" ? "future-production" : "production-required",
      ),
    ),
  ),
  ...queueRuntimeProductionPreconditions.flatMap((precondition) =>
    precondition.requiredConfigKeys.map((key) =>
      configKey(
        key,
        queueRuntimeConfigCategory(precondition.area),
        precondition.status,
        key === "CAMPAIGN_OS_DEGRADATION_POLICY" ? "future-production" : "production-required",
      ),
    ),
  ),
  configKey("CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT", "contract", "blocked", "production-required"),
  configKey("CAMPAIGN_OS_OBJECT_STORAGE_BUCKET", "storage", "deferred"),
  configKey("CAMPAIGN_OS_ANALYTICS_WAREHOUSE_URL", "analytics", "deferred"),
  configKey("CAMPAIGN_OS_REWARD_CUSTODY_ACCOUNT", "reward", "blocked"),
  configKey("CAMPAIGN_OS_REWARD_DISTRIBUTION_QUEUE", "reward", "blocked"),
];

const uniqueConfigKeys = new Map<string, RuntimeActivationConfigKey>();

for (const activationConfigKey of runtimeActivationConfigKeys) {
  const existingConfigKey = uniqueConfigKeys.get(activationConfigKey.key);

  uniqueConfigKeys.set(activationConfigKey.key, {
    ...activationConfigKey,
    required: activationConfigKey.required || existingConfigKey?.required === true,
    requiredFor:
      activationConfigKey.requiredFor === "production-required" ||
      existingConfigKey?.requiredFor === "production-required"
        ? "production-required"
        : activationConfigKey.requiredFor,
    status:
      activationConfigKey.status === "blocked" || existingConfigKey?.status === "blocked"
        ? "blocked"
        : activationConfigKey.status,
  });
}

export const runtimeActivationEnvironmentKeys = [...uniqueConfigKeys.values()];

export const productionRuntimeDependencyBlockers: ProductionRuntimeDependencyBlocker[] = [
  {
    area: "deployment",
    attachPoint: "deployment/runtime-config",
    blockedBy: ["container image", "reverse proxy", "runtime environment config"],
    id: "deployment-config",
    requiredBeforeProduction: true,
    status: "deferred",
  },
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
    attachPoint: "src/server/walletProofVerifier.ts",
    blockedBy: ["live wallet proof verifier", "auth nonce store"],
    id: "wallet-proof-verifier",
    requiredBeforeProduction: true,
    status: "blocked",
  },
  {
    area: "auth",
    attachPoint: "src/server/sessionIssuer.ts",
    blockedBy: ["session signing key", "secret manager", "production session store"],
    id: "session-issuer",
    requiredBeforeProduction: true,
    status: "blocked",
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
    area: "provider",
    attachPoint: "src/server/servicePorts.ts",
    blockedBy: ["provider registry", "degradation policy", "service credentials"],
    id: "provider-adapters",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  ...schedulerRuntimeProductionPreconditions.map<ProductionRuntimeDependencyBlocker>((precondition) => ({
    area: schedulerRuntimeDependencyArea(precondition.area),
    attachPoint: "src/server/schedulerRuntime.ts",
    blockedBy: [...precondition.requiredConfigKeys],
    id: `scheduler-runtime-${precondition.id}`,
    requiredBeforeProduction: true,
    status: precondition.status,
  })),
  ...workerSchedulerProductionPreconditions.map<ProductionRuntimeDependencyBlocker>((precondition) => ({
    area:
      precondition.area === "idempotency" || precondition.area === "lease"
        ? "worker"
        : precondition.area,
    attachPoint: "src/server/workerSchedulerRuntime.ts",
    blockedBy: [...precondition.requiredConfigKeys],
    id: precondition.id,
    requiredBeforeProduction: true,
    status: precondition.status,
  })),
  ...queueRuntimeProductionPreconditions.map<ProductionRuntimeDependencyBlocker>((precondition) => ({
    area: queueRuntimeConfigCategory(precondition.area) as ProductionRuntimeDependencyArea,
    attachPoint: "src/server/queueRuntime.ts",
    blockedBy: [...precondition.requiredConfigKeys],
    id: precondition.id,
    requiredBeforeProduction: true,
    status: precondition.status,
  })),
  {
    area: "contract",
    attachPoint: "src/server/servicePorts.ts",
    blockedBy: ["contract writer mission", "signer policy", "contract ops review"],
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
    area: "observability",
    attachPoint: "observability/exporter",
    blockedBy: ["metrics exporter", "structured log sink", "trace collector"],
    id: "observability-exporter",
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
    blockedBy: ["reward distribution mission", "contract writer mission"],
    id: "reward-distribution",
    requiredBeforeProduction: true,
    status: "blocked",
  },
];

export const productionRuntimeDependencyBlockerIds = productionRuntimeDependencyBlockers.map(
  (blocker) => blocker.id,
);

export const backendRuntimeTracePolicy: BackendRuntimeTracePolicy = {
  failureEnvelopeTraceId: true,
  startupLogIncludesTracePolicy: true,
  successEnvelopeTraceId: true,
  traceHeaderName: "x-campaign-os-trace-id",
};

export const createBackendRuntimeActivationContract = ({
  runtime,
}: CreateBackendRuntimeActivationContractOptions): BackendRuntimeActivationContract => {
  const shutdown = {
    idempotentStop: true,
    shutdownTimeoutMs: runtime.shutdown.shutdownTimeoutMs,
  } as const;
  const deploymentHandoff: BackendDeploymentHandoff = {
    contractsEndpoint: "/api/contracts",
    environmentKeys: runtimeActivationEnvironmentKeys.map((item) => ({ ...item })),
    healthEndpoint: "/api/health",
    requiredBeforeProduction: [...productionRuntimeDependencyBlockerIds],
    runtimeTarget: "api_service",
    shutdown,
    smokeCommand: "npm run server:smoke",
    startCommand: "npm run server:start",
    tracePolicy: backendRuntimeTracePolicy,
  };

  return {
    contractsEndpoint: "/api/contracts",
    deploymentHandoff,
    entrypointPath: "src/server/server.ts",
    healthEndpoint: "/api/health",
    id: "campaign-os-backend-runtime-activation",
    liveSideEffectsEnabled: false,
    packageCommands: {
      smoke: "npm run server:smoke",
      start: "npm run server:start",
    },
    productionDependencyBlockers: productionRuntimeDependencyBlockers.map((item) => ({
      ...item,
      blockedBy: [...item.blockedBy],
    })),
    productionReady: false,
    profileId: runtime.profileId,
    runtimeTarget: "node-http-api-service",
    runtimeVersion: runtime.runtimeVersion,
    supportMode: runtime.supportMode,
    tracePolicy: backendRuntimeTracePolicy,
  };
};
