import type { BackendRuntimeProfileId } from "./backendProfiles";
import {
  resolveBackendConfigContract,
  sanitizeBackendConfigDiagnosticValue,
  type BackendConfigContractOptions,
} from "./config";

export type ProductionPersistenceRuntimeStatus =
  | "active_local"
  | "boundary_ready"
  | "dry_run_ready"
  | "blocked";
export type ProductionPersistenceAdapterKind =
  | "memory"
  | "local_json"
  | "deterministic_test"
  | "production_deferred";
export type ConnectionConfigState =
  | "not_configured"
  | "configured_redacted"
  | "invalid"
  | "deferred";
export type TransactionCapabilityMode = "none" | "deterministic_test" | "deferred_live";
export type ProductionPersistenceDiagnosticSeverity = "error" | "warning" | "info";
export type ProductionPersistenceDiagnosticCode =
  | "PRODUCTION_PERSISTENCE_CONFIG_REQUIRED"
  | "PRODUCTION_PERSISTENCE_DRIVER_UNSUPPORTED"
  | "PRODUCTION_PERSISTENCE_SECRET_REDACTED"
  | "PRODUCTION_PERSISTENCE_LIVE_CONNECTION_DEFERRED";

export interface ProductionPersistenceRuntimeDiagnostic {
  code: ProductionPersistenceDiagnosticCode;
  field: string;
  message: string;
  severity: ProductionPersistenceDiagnosticSeverity;
}

export interface ConnectionConfigSummary {
  configuredKeys: string[];
  diagnostics: ProductionPersistenceRuntimeDiagnostic[];
  missingKeys: string[];
  redactedFields: string[];
  requiredKeys: string[];
  safeLabel: string;
  state: ConnectionConfigState;
}

export interface ProductionPersistenceStoreCoverage {
  entities: string[];
  id: string;
  label: string;
  ownerServiceId: string;
  required: boolean;
  runtimeState: "covered" | "deferred" | "blocked";
  schemaVersion: string;
}

export interface TransactionCapabilitySummary {
  mode: TransactionCapabilityMode;
  supported: boolean;
  unitOfWorkId: string;
}

export interface DeferredPersistenceDependency {
  blockedBy: string[];
  id: string;
  label: string;
  requiredBeforeProduction: boolean;
  status: "planned" | "deferred" | "blocked";
}

export interface ProductionPersistenceRuntimeContract {
  activeDriverId: string;
  adapterKind: ProductionPersistenceAdapterKind;
  connection: ConnectionConfigSummary;
  deferredDependencies: DeferredPersistenceDependency[];
  diagnostics: ProductionPersistenceRuntimeDiagnostic[];
  id: "campaign-os-production-persistence-runtime";
  liveConnectionAttempted: false;
  profileId: BackendRuntimeProfileId;
  requestedDriverId?: string;
  schemaVersion: "v0.2.0";
  status: ProductionPersistenceRuntimeStatus;
  stores: ProductionPersistenceStoreCoverage[];
  supportMode: string;
  transaction: TransactionCapabilitySummary;
  valid: boolean;
}

export interface CreateConnectionConfigSummaryOptions {
  env?: Record<string, string | undefined>;
  profileId?: BackendRuntimeProfileId;
  requiredKeys?: readonly string[];
}

export interface CreateProductionPersistenceRuntimeContractOptions
  extends BackendConfigContractOptions {
  requestedDriverId?: string;
}

const REDACTED_VALUE = "[redacted]";
const notConfiguredLabel = "not_configured";
const productionConnectionConfigKeys = [
  "CAMPAIGN_OS_DATABASE_URL",
  "CAMPAIGN_OS_DATABASE_PASSWORD",
  "CAMPAIGN_OS_DATABASE_TOKEN",
  "CAMPAIGN_OS_DATABASE_BEARER",
  "CAMPAIGN_OS_DATABASE_PRIVATE_KEY",
  "CAMPAIGN_OS_DATABASE_SIGNED_URL",
  "CAMPAIGN_OS_DATABASE_OBJECT_KEY",
  "CAMPAIGN_OS_DATABASE_MNEMONIC",
  "CAMPAIGN_OS_DATABASE_SIGNATURE",
] as const;

const supportedDriverIds = [
  "campaign-os-memory-adapter",
  "campaign-os-local-json-adapter",
  "campaign-os-deterministic-test-adapter",
  "campaign-os-production-db-adapter",
] as const;

const requiredStoreCoverages: ProductionPersistenceStoreCoverage[] = [
  {
    entities: ["Campaign", "CampaignStatus", "PublishChecklist", "ContractModeMetadata"],
    id: "campaign-db",
    label: "Campaign DB",
    ownerServiceId: "campaign-service",
    required: true,
    runtimeState: "covered",
    schemaVersion: "v0.2.0",
  },
  {
    entities: ["NormalizedWalletSession", "AccountTypeProof", "WalletSourceProof"],
    id: "wallet-session-db",
    label: "Wallet Session DB",
    ownerServiceId: "wallet-session-service",
    required: true,
    runtimeState: "covered",
    schemaVersion: "v0.2.0",
  },
  {
    entities: ["CampaignTask", "TaskCompletion", "EvidenceHash", "ManualReviewState"],
    id: "task-evidence-db",
    label: "Task Evidence DB",
    ownerServiceId: "verification-service",
    required: true,
    runtimeState: "covered",
    schemaVersion: "v0.2.0",
  },
  {
    entities: ["I18nContentRevision", "LocaleDraft", "HumanReviewState"],
    id: "i18n-content-db",
    label: "i18n Content DB",
    ownerServiceId: "i18n-content-service",
    required: true,
    runtimeState: "covered",
    schemaVersion: "v0.2.0",
  },
  {
    entities: ["RiskEvent", "ParticipantRiskFlag", "ReferralRiskReview"],
    id: "risk-event-db",
    label: "Risk Event DB",
    ownerServiceId: "risk-intelligence-service",
    required: true,
    runtimeState: "covered",
    schemaVersion: "v0.2.0",
  },
  {
    entities: ["PointsLedgerEntry", "ParticipantScore", "LeaderboardProjection"],
    id: "points-ledger",
    label: "Points Ledger",
    ownerServiceId: "points-ranking-service",
    required: true,
    runtimeState: "covered",
    schemaVersion: "v0.2.0",
  },
];

export const productionPersistenceDeferredDependencies: DeferredPersistenceDependency[] = [
  {
    blockedBy: ["database provider selection mission"],
    id: "db-provider-selection",
    label: "DB provider selection",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["driver package approval mission"],
    id: "driver-package",
    label: "Driver package",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["connection pooling mission"],
    id: "connection-pool",
    label: "Connection pool",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["protected migration executor mission"],
    id: "migration-executor",
    label: "Migration executor",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["migration lock mission"],
    id: "migration-lock",
    label: "Migration lock",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["backup and restore runbook mission"],
    id: "backup-restore-plan",
    label: "Backup and restore plan",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["secret manager integration mission"],
    id: "secret-manager",
    label: "Secret manager",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["observability exporter mission"],
    id: "observability-exporter",
    label: "Observability exporter",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["analytics warehouse adapter mission"],
    id: "analytics-warehouse",
    label: "Analytics warehouse",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["object storage export adapter mission"],
    id: "object-storage-export",
    label: "Object storage export",
    requiredBeforeProduction: true,
    status: "deferred",
  },
];

const isSupportedDriverId = (value: string): value is (typeof supportedDriverIds)[number] =>
  supportedDriverIds.some((driverId) => driverId === value);

const hasConfiguredValue = (value: string | undefined): value is string =>
  value !== undefined && value.trim().length > 0;

const missingRequiredKeys = (
  env: Record<string, string | undefined>,
  requiredKeys: readonly string[],
): string[] => requiredKeys.filter((key) => !hasConfiguredValue(env[key]));

const secretRedactedDiagnostic = (field: string): ProductionPersistenceRuntimeDiagnostic => ({
  code: "PRODUCTION_PERSISTENCE_SECRET_REDACTED",
  field,
  message: `Production persistence config '${field}' was redacted from readiness diagnostics.`,
  severity: "info",
});

const missingConfigDiagnostic = (field: string): ProductionPersistenceRuntimeDiagnostic => ({
  code: "PRODUCTION_PERSISTENCE_CONFIG_REQUIRED",
  field,
  message: `Required production persistence config '${field}' is not configured.`,
  severity: "error",
});

const unsupportedDriverDiagnostic = (value: string): ProductionPersistenceRuntimeDiagnostic => ({
  code: "PRODUCTION_PERSISTENCE_DRIVER_UNSUPPORTED",
  field: "CAMPAIGN_OS_PERSISTENCE_DRIVER",
  message: `Unsupported production persistence driver: ${
    isSupportedDriverId(value) ? value : REDACTED_VALUE
  }.`,
  severity: "error",
});

export const createConnectionConfigSummary = ({
  env = typeof process === "undefined" ? {} : process.env,
  profileId = "local-review",
  requiredKeys = ["CAMPAIGN_OS_DATABASE_URL"],
}: CreateConnectionConfigSummaryOptions = {}): ConnectionConfigSummary => {
  const configuredKeys = productionConnectionConfigKeys.filter((key) => hasConfiguredValue(env[key]));
  const missingKeys = profileId === "production-required"
    ? missingRequiredKeys(env, requiredKeys)
    : [];
  const redactedFields = configuredKeys.filter((key) =>
    sanitizeBackendConfigDiagnosticValue(key, env[key]) === REDACTED_VALUE,
  );
  const diagnostics = [
    ...missingKeys.map(missingConfigDiagnostic),
    ...redactedFields.map(secretRedactedDiagnostic),
  ];
  const state: ConnectionConfigState =
    configuredKeys.length > 0 ? "configured_redacted" : missingKeys.length > 0 ? "invalid" : "not_configured";

  return {
    configuredKeys,
    diagnostics,
    missingKeys,
    redactedFields,
    requiredKeys: [...requiredKeys],
    safeLabel: configuredKeys.length > 0 ? REDACTED_VALUE : notConfiguredLabel,
    state,
  };
};

const resolveDriver = ({
  requestedDriverId,
  persistenceMode,
  profileId,
}: {
  persistenceMode: "memory" | "local_json";
  profileId: BackendRuntimeProfileId;
  requestedDriverId?: string;
}): {
  activeDriverId: string;
  adapterKind: ProductionPersistenceAdapterKind;
  diagnostics: ProductionPersistenceRuntimeDiagnostic[];
} => {
  if (requestedDriverId && !isSupportedDriverId(requestedDriverId)) {
    return {
      activeDriverId: "campaign-os-memory-adapter",
      adapterKind: "memory",
      diagnostics: [unsupportedDriverDiagnostic(requestedDriverId)],
    };
  }

  if (requestedDriverId === "campaign-os-deterministic-test-adapter") {
    return {
      activeDriverId: requestedDriverId,
      adapterKind: "deterministic_test",
      diagnostics: [],
    };
  }

  if (profileId === "production-required" || requestedDriverId === "campaign-os-production-db-adapter") {
    return {
      activeDriverId: "campaign-os-production-db-adapter",
      adapterKind: "production_deferred",
      diagnostics: [
        {
          code: "PRODUCTION_PERSISTENCE_LIVE_CONNECTION_DEFERRED",
          field: "activeDriverId",
          message: "Production database driver is a runtime boundary only; live connection is deferred.",
          severity: "warning",
        },
      ],
    };
  }

  if (persistenceMode === "local_json" || requestedDriverId === "campaign-os-local-json-adapter") {
    return {
      activeDriverId: "campaign-os-local-json-adapter",
      adapterKind: "local_json",
      diagnostics: [],
    };
  }

  return {
    activeDriverId: "campaign-os-memory-adapter",
    adapterKind: "memory",
    diagnostics: [],
  };
};

const resolveRuntimeStatus = ({
  adapterKind,
  diagnostics,
}: {
  adapterKind: ProductionPersistenceAdapterKind;
  diagnostics: readonly ProductionPersistenceRuntimeDiagnostic[];
}): ProductionPersistenceRuntimeStatus => {
  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return "blocked";
  }

  return adapterKind === "production_deferred" ? "boundary_ready" : "active_local";
};

const createTransactionSummary = (
  adapterKind: ProductionPersistenceAdapterKind,
): TransactionCapabilitySummary => {
  if (adapterKind === "deterministic_test") {
    return {
      mode: "deterministic_test",
      supported: true,
      unitOfWorkId: "deterministic-test-unit-of-work",
    };
  }

  if (adapterKind === "production_deferred") {
    return {
      mode: "deferred_live",
      supported: false,
      unitOfWorkId: "production-unit-of-work-deferred",
    };
  }

  return {
    mode: "none",
    supported: false,
    unitOfWorkId: "local-unit-of-work-unavailable",
  };
};

export const createProductionPersistenceRuntimeContract = ({
  env = typeof process === "undefined" ? {} : process.env,
  requestedDriverId,
  ...configOptions
}: CreateProductionPersistenceRuntimeContractOptions = {}): ProductionPersistenceRuntimeContract => {
  const backendConfig = resolveBackendConfigContract({ env, ...configOptions });
  const rawRequestedDriverId = requestedDriverId ?? env.CAMPAIGN_OS_PERSISTENCE_DRIVER;
  const safeRequestedDriverId =
    rawRequestedDriverId && isSupportedDriverId(rawRequestedDriverId)
      ? rawRequestedDriverId
      : rawRequestedDriverId
        ? REDACTED_VALUE
        : undefined;
  const connection = createConnectionConfigSummary({
    env,
    profileId: backendConfig.profileId,
  });
  const driver = resolveDriver({
    persistenceMode: backendConfig.persistenceMode,
    profileId: backendConfig.profileId,
    requestedDriverId: rawRequestedDriverId,
  });
  const diagnostics = [...connection.diagnostics, ...driver.diagnostics];
  const status = resolveRuntimeStatus({
    adapterKind: driver.adapterKind,
    diagnostics,
  });

  return {
    activeDriverId: driver.activeDriverId,
    adapterKind: driver.adapterKind,
    connection,
    deferredDependencies: productionPersistenceDeferredDependencies,
    diagnostics,
    id: "campaign-os-production-persistence-runtime",
    liveConnectionAttempted: false,
    profileId: backendConfig.profileId,
    requestedDriverId: safeRequestedDriverId,
    schemaVersion: "v0.2.0",
    status,
    stores: requiredStoreCoverages,
    supportMode: backendConfig.profile.supportMode,
    transaction: createTransactionSummary(driver.adapterKind),
    valid: !diagnostics.some((diagnostic) => diagnostic.severity === "error"),
  };
};
