import {
  resolveBackendConfigContract,
  type BackendConfigContract,
  type BackendConfigContractOptions,
} from "./config";
import { createApiFoundationReport, type ApiFoundationReport } from "./apiFoundation";
import { createApiServicePortReport, type ApiServicePortReport } from "./servicePorts";
import { apiRuntimeRoutes } from "./routes";
import { createBackendTopologyReport, type BackendTopologyReport } from "./topology";
import {
  createMigrationManifest,
  type MigrationManifest,
} from "./migrationManifest";
import {
  createPersistenceAdapterPortReport,
  type PersistenceAdapterPortReport,
} from "./persistenceAdapterPort";

export type BackendAttachPointArea =
  | "production-persistence"
  | "auth-session"
  | "provider-adapters"
  | "worker-queue"
  | "scheduler"
  | "contract-writer"
  | "object-storage-export"
  | "reward-custody"
  | "reward-distribution"
  | "analytics-warehouse";
export type BackendAttachPointStatus = "local-only" | "scaffold" | "deferred" | "blocked";
export type BackendReadinessDiagnosticCode =
  | "BACKEND_CONFIG_BLOCKED"
  | "PERSISTENCE_ADAPTER_INVALID"
  | "MIGRATION_MANIFEST_INVALID"
  | "API_FOUNDATION_INVALID"
  | "TOPOLOGY_INVALID"
  | "SERVICE_PORTS_INVALID"
  | "ROUTE_COUNT_MISMATCH"
  | "ATTACH_POINT_MISSING";

export interface BackendAttachPoint {
  area: BackendAttachPointArea;
  attachPoint: string;
  blockedBy: string[];
  currentStatus: BackendAttachPointStatus;
  note: string;
  requiredBeforeProduction: boolean;
}

export interface BackendReadinessDiagnostic {
  code: BackendReadinessDiagnosticCode;
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface BackendServiceEntrypoint {
  foundationValidationValid: boolean;
  id: string;
  label: string;
  profileId: string;
  routeCount: number;
  routeIds: string[];
  runtimeName: string;
  supportMode: string;
  version: string;
}

export interface BackendServiceReadinessReport {
  apiFoundation: {
    coverage: ApiFoundationReport["coverage"];
    servicePorts: ApiServicePortReport;
    validation: ApiFoundationReport["validation"];
  };
  attachMap: BackendAttachPoint[];
  config: BackendConfigContract;
  entrypoint: BackendServiceEntrypoint;
  migration: MigrationManifest;
  persistenceAdapters: PersistenceAdapterPortReport;
  profile: BackendConfigContract["profile"];
  topology: {
    coverage: BackendTopologyReport["coverage"];
    profileReadiness: BackendTopologyReport["profileReadiness"];
    validation: BackendTopologyReport["validation"];
  };
  validation: {
    issues: BackendReadinessDiagnostic[];
    valid: boolean;
  };
}

export interface CreateBackendServiceReadinessReportOptions {
  configOptions?: BackendConfigContractOptions;
  generatedAt?: string;
}

const requiredAttachPointAreas: BackendAttachPointArea[] = [
  "production-persistence",
  "auth-session",
  "provider-adapters",
  "worker-queue",
  "scheduler",
  "contract-writer",
  "object-storage-export",
  "reward-custody",
  "reward-distribution",
  "analytics-warehouse",
];

export const backendAttachMap: BackendAttachPoint[] = [
  {
    area: "production-persistence",
    attachPoint: "src/server/persistence.ts:createCampaignOsRepository",
    blockedBy: ["production database adapter mission", "migration runner mission"],
    currentStatus: "blocked",
    note: "Current memory/local JSON adapters stay active; production DB adapter is metadata-only.",
    requiredBeforeProduction: true,
  },
  {
    area: "auth-session",
    attachPoint: "src/server/apiRuntime.ts:ApiRuntimeHandlerContext",
    blockedBy: ["auth/session mission", "wallet signature verification mission"],
    currentStatus: "deferred",
    note: "No bearer token, RBAC, OAuth, session cookie, or wallet signature verification is active.",
    requiredBeforeProduction: true,
  },
  {
    area: "provider-adapters",
    attachPoint: "src/server/servicePorts.ts",
    blockedBy: ["provider adapter registry mission", "service degradation policy"],
    currentStatus: "deferred",
    note: "AeFinder, AelfScan, dApp, social, AI, wallet, and analytics providers remain deferred.",
    requiredBeforeProduction: true,
  },
  {
    area: "worker-queue",
    attachPoint: "src/server/backendService.ts",
    blockedBy: ["worker runtime mission", "queue provider selection"],
    currentStatus: "deferred",
    note: "No background processor or queue consumer runs in this scaffold.",
    requiredBeforeProduction: true,
  },
  {
    area: "scheduler",
    attachPoint: "src/server/backendService.ts",
    blockedBy: ["scheduler runtime mission", "retry/backoff policy"],
    currentStatus: "deferred",
    note: "No cron, delayed job, or scheduled campaign processor runs in this scaffold.",
    requiredBeforeProduction: true,
  },
  {
    area: "contract-writer",
    attachPoint: "src/server/servicePorts.ts",
    blockedBy: ["contract writer mission", "wallet signer policy", "contract ops review"],
    currentStatus: "blocked",
    note: "Contract writes, reward roots, and on-chain mutation are explicitly disabled.",
    requiredBeforeProduction: true,
  },
  {
    area: "object-storage-export",
    attachPoint: "src/server/persistenceAdapterPort.ts",
    blockedBy: ["object storage adapter mission", "signed URL safety review"],
    currentStatus: "deferred",
    note: "Exports remain local previews; storage-backed fulfillment is not active.",
    requiredBeforeProduction: true,
  },
  {
    area: "reward-custody",
    attachPoint: "src/server/servicePorts.ts",
    blockedBy: ["reward custody mission", "finance/security review"],
    currentStatus: "blocked",
    note: "Reward custody and escrow are not implemented by the backend scaffold.",
    requiredBeforeProduction: true,
  },
  {
    area: "reward-distribution",
    attachPoint: "src/server/servicePorts.ts",
    blockedBy: ["reward distribution mission", "contract writer mission"],
    currentStatus: "blocked",
    note: "No payout, claim, or reward distribution flow is active.",
    requiredBeforeProduction: true,
  },
  {
    area: "analytics-warehouse",
    attachPoint: "src/server/persistenceAdapterPort.ts",
    blockedBy: ["analytics warehouse adapter mission", "event ingestion contract"],
    currentStatus: "deferred",
    note: "Current analytics are local/read-model only; warehouse ingestion is deferred.",
    requiredBeforeProduction: true,
  },
];

const errorDiagnostic = (
  code: BackendReadinessDiagnosticCode,
  field: string,
  message: string,
): BackendReadinessDiagnostic => ({
  code,
  field,
  message,
  severity: "error",
});

const createValidationIssues = ({
  apiFoundation,
  attachMap,
  config,
  entrypoint,
  migration,
  persistenceAdapters,
  servicePorts,
  topology,
}: {
  apiFoundation: ApiFoundationReport;
  attachMap: readonly BackendAttachPoint[];
  config: BackendConfigContract;
  entrypoint: BackendServiceEntrypoint;
  migration: MigrationManifest;
  persistenceAdapters: PersistenceAdapterPortReport;
  servicePorts: ApiServicePortReport;
  topology: BackendTopologyReport;
}): BackendReadinessDiagnostic[] => {
  const issues: BackendReadinessDiagnostic[] = [];

  if (!config.valid) {
    issues.push(errorDiagnostic("BACKEND_CONFIG_BLOCKED", "config", "Backend config contract is blocked."));
  }

  if (!persistenceAdapters.validation.valid) {
    issues.push(
      errorDiagnostic("PERSISTENCE_ADAPTER_INVALID", "persistenceAdapters", "Persistence adapter port validation failed."),
    );
  }

  if (!migration.validation.valid) {
    issues.push(errorDiagnostic("MIGRATION_MANIFEST_INVALID", "migration", "Migration manifest validation failed."));
  }

  if (!apiFoundation.validation.valid) {
    issues.push(errorDiagnostic("API_FOUNDATION_INVALID", "apiFoundation", "API foundation validation failed."));
  }

  if (!topology.validation.valid) {
    issues.push(errorDiagnostic("TOPOLOGY_INVALID", "topology", "Backend topology validation failed."));
  }

  if (!servicePorts.validation.valid) {
    issues.push(errorDiagnostic("SERVICE_PORTS_INVALID", "servicePorts", "API service port validation failed."));
  }

  if (entrypoint.routeCount !== apiFoundation.coverage.routeCount) {
    issues.push(
      errorDiagnostic(
        "ROUTE_COUNT_MISMATCH",
        "entrypoint.routeCount",
        "Backend entrypoint route count must match API foundation route count.",
      ),
    );
  }

  const attachPointAreas = new Set(attachMap.map((item) => item.area));
  for (const area of requiredAttachPointAreas) {
    if (!attachPointAreas.has(area)) {
      issues.push(errorDiagnostic("ATTACH_POINT_MISSING", area, `Missing backend attach point for ${area}.`));
    }
  }

  return issues;
};

export const createBackendServiceReadinessReport = ({
  configOptions,
  generatedAt = new Date(0).toISOString(),
}: CreateBackendServiceReadinessReportOptions = {}): BackendServiceReadinessReport => {
  const config = resolveBackendConfigContract(configOptions);
  const apiFoundation = createApiFoundationReport({ generatedAt });
  const servicePorts = createApiServicePortReport({ foundation: apiFoundation });
  const topology = createBackendTopologyReport({
    generatedAt,
    knownRouteIds: apiRuntimeRoutes.map((route) => route.id),
  });
  const persistenceAdapters = createPersistenceAdapterPortReport({
    persistenceMode: config.persistenceMode,
    profileId: config.profileId,
  });
  const migration = createMigrationManifest({ profileId: config.profileId });
  const entrypoint: BackendServiceEntrypoint = {
    foundationValidationValid: apiFoundation.validation.valid,
    id: "campaign-os-backend-service",
    label: "Campaign OS Backend Service",
    profileId: config.profileId,
    routeCount: apiRuntimeRoutes.length,
    routeIds: apiRuntimeRoutes.map((route) => route.id),
    runtimeName: "campaign-os-api-runtime",
    supportMode: "local_seeded",
    version: config.version,
  };
  const validationIssues = createValidationIssues({
    apiFoundation,
    attachMap: backendAttachMap,
    config,
    entrypoint,
    migration,
    persistenceAdapters,
    servicePorts,
    topology,
  });

  return {
    apiFoundation: {
      coverage: apiFoundation.coverage,
      servicePorts,
      validation: apiFoundation.validation,
    },
    attachMap: backendAttachMap,
    config,
    entrypoint,
    migration,
    persistenceAdapters,
    profile: config.profile,
    topology: {
      coverage: topology.coverage,
      profileReadiness: topology.profileReadiness,
      validation: topology.validation,
    },
    validation: {
      issues: validationIssues,
      valid: validationIssues.length === 0,
    },
  };
};
