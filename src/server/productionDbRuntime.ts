import type { BackendRuntimeProfileId } from "./backendProfiles";
import { resolveBackendRuntimeProfile } from "./backendProfiles";
import { sanitizeBackendConfigDiagnosticValue } from "./config";
import {
  createDatabaseProviderRegistryReport,
  type DatabaseDriverDescriptor,
  type DatabaseProviderDiagnostic,
} from "./databaseProviderRegistry";
import {
  defaultSchemaMigrations,
} from "./migrationRunner";
import {
  productionDatabaseRequiredStoreIds,
  productionDatabaseStoreRegistry,
} from "./productionDatabase";
import {
  createProductionDbPackageBinding,
  type ProductionDbPackageBindingSummary,
} from "./productionDbPackageBinding";
import type { BackendStoreId } from "./persistenceAdapterPort";

export type ProductionDbRuntimeStatus = "ready" | "blocked" | "closed" | "failed";
export type ProductionDbConnectionState =
  | "not_configured"
  | "configured_redacted"
  | "connecting"
  | "ready"
  | "blocked"
  | "closed"
  | "failed";
export type ProductionDbMigrationGateStatus = "not_required_for_fixture" | "blocked" | "ready";
export type ProductionDbDiagnosticSeverity = "error" | "warning" | "info";
export type ProductionDbDiagnosticCode =
  | DatabaseProviderDiagnostic["code"]
  | "PRODUCTION_DB_CONFIG_REQUIRED"
  | "PRODUCTION_DB_DRIVER_DEFERRED"
  | "PRODUCTION_DB_DRIVER_NOT_PRODUCTION_READY"
  | "PRODUCTION_DB_MIGRATION_GATE_BLOCKED"
  | "PRODUCTION_DB_SECRET_REDACTED"
  | "PRODUCTION_DB_CONNECTION_FAILED"
  | "PRODUCTION_DB_PROFILE_UNSUPPORTED";

export interface ProductionDbDiagnostic {
  code: ProductionDbDiagnosticCode;
  field: string;
  message: string;
  severity: ProductionDbDiagnosticSeverity;
}

export interface ProductionDbDriverSummary {
  capability: {
    adHocRawSql: boolean;
    parameterizedQueries: boolean;
    pooling: boolean;
    requiresNetwork: boolean;
    requiresSecretManager: boolean;
    transactions: boolean;
  };
  deferredBy: string[];
  deterministicFixture: boolean;
  driverId: string;
  label: string;
  productionReady: boolean;
  providerId: string;
  status: string;
  supportedStoreIds: BackendStoreId[];
}

export interface ProductionDbConnectionLifecycle {
  attemptCount: number;
  closeCount: number;
  configuredKeyCount: number;
  liveConnectionAttempted: false;
  missingConfigKeys: string[];
  redactedFields: string[];
  requiredConfigKeys: string[];
  safeLabel: string;
  state: ProductionDbConnectionState;
}

export interface ProductionDbQueryCapability {
  adHocRawSqlEnabled: false;
  liveQueryExecutionEnabled: false;
  parameterizedQueries: boolean;
  supportedOperations: string[];
  supportedStoreIds: BackendStoreId[];
  transactions: boolean;
}

export interface ProductionDbMigrationGateSummary {
  approvalRequired: boolean;
  diagnosticCodes: ProductionDbDiagnosticCode[];
  liveExecutionEnabled: false;
  pendingMigrationIds: string[];
  rollbackMetadataReady: boolean;
  rollbackPlanId: "campaign-os-production-db-rollback-v0.2";
  status: ProductionDbMigrationGateStatus;
}

export interface ProductionDbRuntimeContract {
  connection: ProductionDbConnectionLifecycle;
  diagnostics: ProductionDbDiagnostic[];
  driver: ProductionDbDriverSummary;
  driverId: string;
  id: "campaign-os-production-db-runtime-v1";
  liveConnectionAttempted: false;
  liveQueryExecutionEnabled: false;
  migrationGate: ProductionDbMigrationGateSummary;
  ownerStores: BackendStoreId[];
  packageBinding: ProductionDbPackageBindingSummary;
  packageBindingBlockerCount: number;
  packageBindingDiagnosticCodes: ProductionDbPackageBindingSummary["diagnosticCodes"];
  packageBindingProductionReady: false;
  packageBindingStatus: ProductionDbPackageBindingSummary["status"];
  profileId: BackendRuntimeProfileId;
  providerId: string;
  queryCapability: ProductionDbQueryCapability;
  schemaManifestId: "campaign-os-production-db-schema-v0.2";
  status: ProductionDbRuntimeStatus;
  valid: boolean;
}

export interface CreateProductionDbRuntimeContractOptions {
  driverId?: string;
  env?: Record<string, string | undefined>;
  failureReason?: string;
  profileId?: string;
  providerId?: string;
}

export interface ProductionDbRuntime {
  close(): ProductionDbRuntimeContract;
  init(): ProductionDbRuntimeContract;
  snapshot(): ProductionDbRuntimeContract;
}

const REDACTED_VALUE = "[redacted]";
const SCHEMA_MANIFEST_ID = "campaign-os-production-db-schema-v0.2" as const;
const productionDbConfigKeys = [
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

const hasConfiguredValue = (value: string | undefined): value is string =>
  value !== undefined && value.trim().length > 0;

const diagnostic = (
  code: ProductionDbDiagnosticCode,
  field: string,
  message: string,
  severity: ProductionDbDiagnosticSeverity = "error",
): ProductionDbDiagnostic => ({
  code,
  field,
  message,
  severity,
});

const mapProviderDiagnostic = (issue: DatabaseProviderDiagnostic): ProductionDbDiagnostic => ({
  code: issue.code,
  field: issue.field,
  message: issue.message,
  severity: issue.severity,
});

const createDriverSummary = (
  driver: DatabaseDriverDescriptor | undefined,
  providerId: string,
): ProductionDbDriverSummary => {
  const deterministicFixture = driver?.id === "campaign-os-deterministic-test-driver";

  return {
    capability: driver
      ? { ...driver.capability }
      : {
        adHocRawSql: false,
        parameterizedQueries: false,
        pooling: false,
        requiresNetwork: true,
        requiresSecretManager: true,
        transactions: false,
      },
    deferredBy: driver ? [...driver.deferredBy] : [],
    deterministicFixture,
    driverId: driver?.id ?? "unresolved",
    label: driver?.label ?? "Unresolved production DB driver",
    productionReady: Boolean(driver && driver.status === "available" && !deterministicFixture),
    providerId: driver?.providerId ?? providerId,
    status: driver?.status ?? "blocked",
    supportedStoreIds: driver ? [...driver.supportedStoreIds] : [],
  };
};

const createConnectionLifecycle = ({
  driver,
  env,
  failureReason,
  profileId,
}: {
  driver?: DatabaseDriverDescriptor;
  env: Record<string, string | undefined>;
  failureReason?: string;
  profileId: BackendRuntimeProfileId;
}): {
  connection: ProductionDbConnectionLifecycle;
  diagnostics: ProductionDbDiagnostic[];
} => {
  const requiredConfigKeys = driver?.requiredConfigKeys ?? ["CAMPAIGN_OS_DATABASE_URL"];
  const configuredKeys = productionDbConfigKeys.filter((key) => hasConfiguredValue(env[key]));
  const missingConfigKeys =
    profileId === "production-required"
      ? requiredConfigKeys.filter((key) => !hasConfiguredValue(env[key]))
      : [];
  const redactedFields = configuredKeys.filter(
    (key) => sanitizeBackendConfigDiagnosticValue(key, env[key]) === REDACTED_VALUE,
  );
  const diagnostics = [
    ...missingConfigKeys.map((key) =>
      diagnostic(
        "PRODUCTION_DB_CONFIG_REQUIRED",
        key,
        `Required production DB config '${key}' is not configured.`,
      ),
    ),
    ...redactedFields.map((key) =>
      diagnostic(
        "PRODUCTION_DB_SECRET_REDACTED",
        key,
        `Production DB config '${key}' was redacted from runtime metadata.`,
        "info",
      ),
    ),
  ];

  if (failureReason) {
    diagnostics.push(
      diagnostic(
        "PRODUCTION_DB_CONNECTION_FAILED",
        "connection",
        `Production DB runtime connection failed: ${REDACTED_VALUE}`,
      ),
    );
  }

  const state: ProductionDbConnectionState = failureReason
    ? "failed"
    : missingConfigKeys.length > 0
      ? "blocked"
      : configuredKeys.length > 0
        ? "configured_redacted"
        : driver?.id === "campaign-os-deterministic-test-driver"
          ? "ready"
          : "not_configured";

  return {
    connection: {
      attemptCount: 0,
      closeCount: 0,
      configuredKeyCount: configuredKeys.length,
      liveConnectionAttempted: false,
      missingConfigKeys,
      redactedFields,
      requiredConfigKeys: [...requiredConfigKeys],
      safeLabel:
        configuredKeys.length > 0
          ? REDACTED_VALUE
          : driver?.id === "campaign-os-deterministic-test-driver"
            ? "deterministic_fixture"
            : "not_configured",
      state,
    },
    diagnostics,
  };
};

const createQueryCapability = (driver: ProductionDbDriverSummary): ProductionDbQueryCapability => ({
  adHocRawSqlEnabled: false,
  liveQueryExecutionEnabled: false,
  parameterizedQueries: driver.capability.parameterizedQueries,
  supportedOperations: ["select", "count", "lookup", "insert", "update", "delete", "upsert"],
  supportedStoreIds: [...driver.supportedStoreIds],
  transactions: driver.capability.transactions,
});

const createMigrationGate = ({
  diagnostics,
  deterministicFixture,
  profileId,
}: {
  deterministicFixture: boolean;
  diagnostics: readonly ProductionDbDiagnostic[];
  profileId: BackendRuntimeProfileId;
}): ProductionDbMigrationGateSummary => {
  if (deterministicFixture && profileId !== "production-required") {
    return {
      approvalRequired: false,
      diagnosticCodes: diagnostics.map((item) => item.code),
      liveExecutionEnabled: false,
      pendingMigrationIds: defaultSchemaMigrations.map((migration) => migration.id),
      rollbackMetadataReady: false,
      rollbackPlanId: "campaign-os-production-db-rollback-v0.2",
      status: "not_required_for_fixture",
    };
  }

  return {
    approvalRequired: true,
    diagnosticCodes: diagnostics.map((item) => item.code),
    liveExecutionEnabled: false,
    pendingMigrationIds: defaultSchemaMigrations.map((migration) => migration.id),
    rollbackMetadataReady: false,
    rollbackPlanId: "campaign-os-production-db-rollback-v0.2",
    status: "blocked",
  };
};

const createSchemaDiagnostics = (driver: ProductionDbDriverSummary): ProductionDbDiagnostic[] =>
  productionDatabaseRequiredStoreIds
    .filter((storeId) => !driver.supportedStoreIds.includes(storeId))
    .map((storeId) =>
      diagnostic(
        "DATABASE_DRIVER_STORE_UNSUPPORTED",
        storeId,
        `Production DB driver '${driver.driverId}' does not support required store '${storeId}'.`,
      ),
    );

const resolveRuntimeStatus = ({
  connection,
  diagnostics,
}: {
  connection: ProductionDbConnectionLifecycle;
  diagnostics: readonly ProductionDbDiagnostic[];
}): ProductionDbRuntimeStatus => {
  if (connection.state === "failed") {
    return "failed";
  }

  if (diagnostics.some((item) => item.severity === "error")) {
    return "blocked";
  }

  return "ready";
};

export const createProductionDbRuntimeContract = ({
  driverId,
  env = typeof process === "undefined" ? {} : process.env,
  failureReason,
  profileId,
  providerId,
}: CreateProductionDbRuntimeContractOptions = {}): ProductionDbRuntimeContract => {
  const profileResolution = resolveBackendRuntimeProfile(
    profileId ?? env.CAMPAIGN_OS_BACKEND_PROFILE,
  );
  const registry = createDatabaseProviderRegistryReport({
    driverId: driverId ?? env.CAMPAIGN_OS_DATABASE_DRIVER,
    profileId: profileResolution.profile.id,
    providerId: providerId ?? env.CAMPAIGN_OS_DATABASE_PROVIDER,
  });
  const driver = createDriverSummary(registry.activeDriver, registry.selectedProviderId);
  const connectionResult = createConnectionLifecycle({
    driver: registry.activeDriver,
    env,
    failureReason,
    profileId: profileResolution.profile.id,
  });
  const packageBinding = createProductionDbPackageBinding({
    env,
    profileId: profileResolution.profile.id,
  });
  const preGateDiagnostics: ProductionDbDiagnostic[] = [
    ...profileResolution.diagnostics.map((item) =>
      diagnostic("PRODUCTION_DB_PROFILE_UNSUPPORTED", item.field, item.message, item.severity),
    ),
    ...registry.validation.issues.map(mapProviderDiagnostic),
    ...connectionResult.diagnostics,
    ...createSchemaDiagnostics(driver),
  ];
  const requiresProductionGate = profileResolution.profile.id === "production-required";

  if (requiresProductionGate && registry.activeDriver?.status !== "available") {
    preGateDiagnostics.push(
      diagnostic(
        "PRODUCTION_DB_DRIVER_DEFERRED",
        "driverId",
        `Production DB driver '${registry.selectedDriverId}' is deferred until production prerequisites pass.`,
      ),
    );
  }

  if (requiresProductionGate && !driver.productionReady) {
    preGateDiagnostics.push(
      diagnostic(
        "PRODUCTION_DB_DRIVER_NOT_PRODUCTION_READY",
        "driverId",
        `Production DB driver '${registry.selectedDriverId}' is not production-ready.`,
      ),
    );
  }

  const migrationGate = createMigrationGate({
    deterministicFixture: driver.deterministicFixture,
    diagnostics: preGateDiagnostics,
    profileId: profileResolution.profile.id,
  });
  const diagnostics = [
    ...preGateDiagnostics,
    ...(migrationGate.status === "blocked"
      ? [
        diagnostic(
          "PRODUCTION_DB_MIGRATION_GATE_BLOCKED",
          "migrationGate",
          "Production DB runtime live activation is blocked until schema, approval, and rollback prerequisites pass.",
        ),
      ]
      : []),
  ];
  const status = resolveRuntimeStatus({
    connection: connectionResult.connection,
    diagnostics,
  });

  return {
    connection: connectionResult.connection,
    diagnostics,
    driver,
    driverId: registry.selectedDriverId,
    id: "campaign-os-production-db-runtime-v1",
    liveConnectionAttempted: false,
    liveQueryExecutionEnabled: false,
    migrationGate: {
      ...migrationGate,
      diagnosticCodes: diagnostics.map((item) => item.code),
    },
    ownerStores: productionDatabaseStoreRegistry.map((store) => store.id),
    packageBinding,
    packageBindingBlockerCount: packageBinding.blockerCount,
    packageBindingDiagnosticCodes: [...packageBinding.diagnosticCodes],
    packageBindingProductionReady: false,
    packageBindingStatus: packageBinding.status,
    profileId: profileResolution.profile.id,
    providerId: registry.selectedProviderId,
    queryCapability: createQueryCapability(driver),
    schemaManifestId: SCHEMA_MANIFEST_ID,
    status,
    valid: status === "ready" && profileResolution.valid,
  };
};

export const createProductionDbRuntime = (
  options: CreateProductionDbRuntimeContractOptions = {},
): ProductionDbRuntime => {
  let initialized = false;
  let closed = false;
  const baseContract = createProductionDbRuntimeContract(options);

  const withLifecycle = (): ProductionDbRuntimeContract => {
    const connection = {
      ...baseContract.connection,
      attemptCount: initialized ? 1 : 0,
      closeCount: closed ? 1 : 0,
      state: closed ? "closed" as const : baseContract.connection.state,
    };

    return {
      ...baseContract,
      connection,
      status: closed ? "closed" : baseContract.status,
      valid: closed ? false : baseContract.valid,
    };
  };

  return {
    close: () => {
      initialized = true;
      closed = true;

      return withLifecycle();
    },
    init: () => {
      if (!closed) {
        initialized = true;
      }

      return withLifecycle();
    },
    snapshot: () => withLifecycle(),
  };
};
