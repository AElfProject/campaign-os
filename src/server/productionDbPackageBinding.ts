import type { BackendRuntimeProfileId } from "./backendProfiles";
import { resolveBackendRuntimeProfile } from "./backendProfiles";
import {
  productionDatabaseRequiredStoreIds,
  productionDatabaseStoreRegistry,
} from "./productionDatabase";
import type { BackendStoreId } from "./persistenceAdapterPort";

export type ProductionDbPackageBindingProfileId = BackendRuntimeProfileId;
export type ProductionDbPackageBindingStatus = "local_ready" | "scaffolded" | "blocked";
export type ProductionDbPackageBindingMode = "dry_run" | "metadata_only" | "production_required";
export type ProductionDbPackageFamily = "postgresql-compatible-relational";
export type ProductionDbPackageProviderKind = "managed-postgresql-compatible";
export type ProductionDbPackageDriverKind = "node-postgres-compatible";
export type ProductionDbPackageImportPosture = "metadata_only_no_import";
export type ProductionDbPackageHealthStatus = "local_ok" | "metadata_only" | "blocked";
export type ProductionDbPackageDiagnosticSeverity = "error" | "warning" | "info";
export type ProductionDbPackagePreconditionArea =
  | "activation"
  | "binding"
  | "connection"
  | "migration"
  | "observability"
  | "package"
  | "pooling"
  | "provider"
  | "rollback"
  | "runbook"
  | "secrets";
export type ProductionDbPackageDiagnosticCode =
  | "UNKNOWN_PRODUCTION_DB_PACKAGE_BINDING_PROFILE"
  | "UNKNOWN_PRODUCTION_DB_PACKAGE_BINDING_MODE"
  | "UNKNOWN_PRODUCTION_DB_PACKAGE_FAMILY"
  | "PRODUCTION_DB_PACKAGE_UNSUPPORTED"
  | "PRODUCTION_DB_PROVIDER_UNSUPPORTED"
  | "PRODUCTION_DB_DRIVER_UNSUPPORTED"
  | "PRODUCTION_DB_PACKAGE_REFERENCE_MISSING"
  | "PRODUCTION_DB_PACKAGE_BINDING_MISSING"
  | "PRODUCTION_DB_PROVIDER_SELECTION_MISSING"
  | "PRODUCTION_DB_CONNECTION_REFERENCE_MISSING"
  | "PRODUCTION_DB_SECRET_MANAGER_REFERENCE_MISSING"
  | "PRODUCTION_DB_CONNECTION_POOL_POLICY_MISSING"
  | "PRODUCTION_DB_MIGRATION_APPROVAL_MISSING"
  | "PRODUCTION_DB_ROLLBACK_BACKUP_MISSING"
  | "PRODUCTION_DB_OBSERVABILITY_MISSING"
  | "PRODUCTION_DB_RUNBOOK_MISSING"
  | "PRODUCTION_DB_LIVE_ENABLEMENT_MISSING"
  | "PRODUCTION_DB_PACKAGE_CONFIG_REDACTED"
  | "UNSAFE_PRODUCTION_DB_PACKAGE_BINDING_CONFIG";

export interface ProductionDbPackageNoLiveFlags {
  browserBundleAllowed: false;
  dbClientConstructed: false;
  liveConnectionAttempted: false;
  liveContractWritesEnabled: false;
  liveMigrationExecutionEnabled: false;
  liveProductionMutationEnabled: false;
  liveProviderCallsEnabled: false;
  liveQueryExecutionEnabled: false;
  liveRewardCustodyEnabled: false;
  liveRewardDistributionEnabled: false;
  liveStorageWritesEnabled: false;
  liveTransactionExecutionEnabled: false;
  secretValueExposed: false;
}

export interface ProductionDbPackageDefinition {
  browserBundleAllowed: false;
  driverKind: ProductionDbPackageDriverKind;
  family: ProductionDbPackageFamily;
  importPosture: ProductionDbPackageImportPosture;
  packageName: "pg";
  packageRef: "npm:pg";
  postgresqlCompatible: true;
  providerKind: ProductionDbPackageProviderKind;
  relationalCompatible: true;
  serverOnly: true;
}

export interface ProductionDbPackagePrecondition {
  area: ProductionDbPackagePreconditionArea;
  diagnosticCode: ProductionDbPackageDiagnosticCode;
  field: string;
  id: string;
  message: string;
  requiredBeforeProduction: true;
  requiredConfigKeys: string[];
  status: "blocked" | "deferred";
}

export interface ProductionDbPackageDiagnostic {
  code: ProductionDbPackageDiagnosticCode;
  field: string;
  message: string;
  severity: ProductionDbPackageDiagnosticSeverity;
}

export interface ProductionDbPackageHealthCheck {
  driverClientConstructionAttempted: false;
  lastCheckedAt: string;
  liveDbHealthCheckAttempted: false;
  packageImportAttempted: false;
  status: ProductionDbPackageHealthStatus;
}

export interface ProductionDbPackageStoreCoverage {
  coveredByBinding: true;
  label: string;
  migrationRequired: boolean;
  ownerServiceId: string;
  schemaVersion: string;
  storeId: BackendStoreId;
}

export interface ProductionDbPackageRegistration {
  bindingId: string;
  definition: ProductionDbPackageDefinition;
  driverId: string;
  healthCheck: ProductionDbPackageHealthCheck;
  mode: ProductionDbPackageBindingMode;
  providerId: string;
  requiredConfigKeys: string[];
  status: ProductionDbPackageBindingStatus;
}

export interface ProductionDbPackageReadinessProjection {
  bindingId: string;
  blockerCount: number;
  browserBundleAllowed: false;
  dbClientConstructed: false;
  diagnosticCodes: ProductionDbPackageDiagnosticCode[];
  driverId: string;
  driverKind: ProductionDbPackageDriverKind;
  family: ProductionDbPackageFamily;
  importPosture: ProductionDbPackageImportPosture;
  liveConnectionAttempted: false;
  liveContractWritesEnabled: false;
  liveMigrationExecutionEnabled: false;
  liveProductionMutationEnabled: false;
  liveProviderCallsEnabled: false;
  liveQueryExecutionEnabled: false;
  liveRewardCustodyEnabled: false;
  liveRewardDistributionEnabled: false;
  liveStorageWritesEnabled: false;
  liveTransactionExecutionEnabled: false;
  mode: ProductionDbPackageBindingMode;
  noLiveFlags: ProductionDbPackageNoLiveFlags;
  packageName: "pg";
  packageRef: "npm:pg";
  productionReady: false;
  providerId: string;
  providerKind: ProductionDbPackageProviderKind;
  requiredConfigKeys: string[];
  requiredStoreIds: BackendStoreId[];
  secretValueExposed: false;
  status: ProductionDbPackageBindingStatus;
  storeCoverage: ProductionDbPackageStoreCoverage[];
  valid: boolean;
}

export interface ProductionDbPackageBindingSummary extends ProductionDbPackageRegistration {
  blockerCount: number;
  diagnosticCodes: ProductionDbPackageDiagnosticCode[];
  diagnostics: ProductionDbPackageDiagnostic[];
  id: "campaign-os-production-db-package-binding-foundation";
  noLiveFlags: ProductionDbPackageNoLiveFlags;
  preconditions: ProductionDbPackagePrecondition[];
  productionReady: false;
  profileId: ProductionDbPackageBindingProfileId;
  readiness: ProductionDbPackageReadinessProjection;
  redactedConfigKeys: string[];
  requiredStoreIds: BackendStoreId[];
  storeCoverage: ProductionDbPackageStoreCoverage[];
  unsafeConfigKeys: string[];
  valid: boolean;
}

export interface CreateProductionDbPackageBindingOptions {
  bindingId?: string;
  driverId?: string;
  env?: Record<string, unknown>;
  family?: string;
  mode?: string;
  packageName?: string;
  profileId?: string;
  providerId?: string;
  providerKind?: string;
}

const FOUNDATION_ID = "campaign-os-production-db-package-binding-foundation" as const;
const HEALTH_CHECK_TIMESTAMP = "2026-07-10T21:00:00Z";
const REDACTED_VALUE = "[redacted]";
const RAW_PACKAGE_PAYLOAD_VALUE = "[redacted-production-db-package-payload]";
const LOCAL_BINDING_ID = "campaign-os-postgresql-package-binding-local";
const STAGING_BINDING_ID = "campaign-os-postgresql-package-binding-staging";
const PRODUCTION_BINDING_ID = "campaign-os-postgresql-package-binding-production";
const APPROVED_PACKAGE_NAME = "pg" as const;
const APPROVED_PACKAGE_REF = "npm:pg" as const;
const APPROVED_PACKAGE_FAMILY = "postgresql-compatible-relational" as const;
const APPROVED_PROVIDER_KIND = "managed-postgresql-compatible" as const;
const APPROVED_DRIVER_KIND = "node-postgres-compatible" as const;
const APPROVED_PROVIDER_ID = "campaign-os-postgresql-provider-deferred";
const APPROVED_DRIVER_ID = "campaign-os-node-postgres-driver-deferred";

export const SUPPORTED_PRODUCTION_DB_PACKAGE_BINDING_PROFILES: ProductionDbPackageBindingProfileId[] = [
  "local-review",
  "staging-scaffold",
  "production-required",
];

export const productionDbPackageNoLiveFlags: ProductionDbPackageNoLiveFlags = {
  browserBundleAllowed: false,
  dbClientConstructed: false,
  liveConnectionAttempted: false,
  liveContractWritesEnabled: false,
  liveMigrationExecutionEnabled: false,
  liveProductionMutationEnabled: false,
  liveProviderCallsEnabled: false,
  liveQueryExecutionEnabled: false,
  liveRewardCustodyEnabled: false,
  liveRewardDistributionEnabled: false,
  liveStorageWritesEnabled: false,
  liveTransactionExecutionEnabled: false,
  secretValueExposed: false,
};

export const productionDbPackageDefinitions: ProductionDbPackageDefinition[] = [
  {
    browserBundleAllowed: false,
    driverKind: APPROVED_DRIVER_KIND,
    family: APPROVED_PACKAGE_FAMILY,
    importPosture: "metadata_only_no_import",
    packageName: APPROVED_PACKAGE_NAME,
    packageRef: APPROVED_PACKAGE_REF,
    postgresqlCompatible: true,
    providerKind: APPROVED_PROVIDER_KIND,
    relationalCompatible: true,
    serverOnly: true,
  },
];

export const productionDbPackageProductionPreconditions: ProductionDbPackagePrecondition[] = [
  precondition("package", "PRODUCTION_DB_PACKAGE_REFERENCE_MISSING", "CAMPAIGN_OS_DATABASE_PACKAGE", "production-db-package-reference", "Approved PostgreSQL-compatible DB package reference is required before live database integration."),
  precondition("binding", "PRODUCTION_DB_PACKAGE_BINDING_MISSING", "CAMPAIGN_OS_DATABASE_PACKAGE_BINDING", "production-db-package-binding-registration", "Production DB package binding registration is required before live database integration."),
  precondition("provider", "PRODUCTION_DB_PROVIDER_SELECTION_MISSING", "CAMPAIGN_OS_DATABASE_PROVIDER", "production-db-provider-selection", "Production DB provider selection is required before live database integration."),
  precondition("connection", "PRODUCTION_DB_CONNECTION_REFERENCE_MISSING", "CAMPAIGN_OS_DATABASE_URL", "production-db-connection-reference", "Production DB connection reference is required before live database integration."),
  precondition("secrets", "PRODUCTION_DB_SECRET_MANAGER_REFERENCE_MISSING", "CAMPAIGN_OS_DATABASE_SECRET_REF", "production-db-secret-manager-reference", "Secret manager reference is required before live database integration."),
  precondition("pooling", "PRODUCTION_DB_CONNECTION_POOL_POLICY_MISSING", "CAMPAIGN_OS_DATABASE_POOL_POLICY", "production-db-connection-pool-policy", "Connection pool policy is required before live database integration."),
  precondition("migration", "PRODUCTION_DB_MIGRATION_APPROVAL_MISSING", "CAMPAIGN_OS_DATABASE_MIGRATION_APPROVAL", "production-db-migration-approval", "Migration approval reference is required before live database integration."),
  precondition("rollback", "PRODUCTION_DB_ROLLBACK_BACKUP_MISSING", "CAMPAIGN_OS_DATABASE_ROLLBACK_BACKUP_PLAN", "production-db-rollback-backup-plan", "Rollback and backup plan reference is required before live database integration."),
  precondition("observability", "PRODUCTION_DB_OBSERVABILITY_MISSING", "CAMPAIGN_OS_DATABASE_OBSERVABILITY_REF", "production-db-observability-reference", "Observability reference is required before production database visibility.", undefined, "deferred"),
  precondition("runbook", "PRODUCTION_DB_RUNBOOK_MISSING", "CAMPAIGN_OS_DATABASE_RUNBOOK_URL", "production-db-runbook", "Operator runbook reference is required before live database integration.", undefined, "deferred"),
  precondition("activation", "PRODUCTION_DB_LIVE_ENABLEMENT_MISSING", "CAMPAIGN_OS_DATABASE_LIVE_ENABLEMENT", "production-db-live-enable-gate", "Explicit live DB enablement gate is required before live database integration."),
];

export const createProductionDbPackageBinding = (
  options: CreateProductionDbPackageBindingOptions = {},
): ProductionDbPackageBindingSummary => {
  const env = options.env ?? {};
  const profileResolution = resolveProfile(options.profileId);
  const modeResolution = resolveMode(profileResolution.profileId, options.mode);
  const familyResolution = resolveFamily(options.family, env);
  const packageResolution = resolvePackageName(options.packageName, env);
  const providerKindResolution = resolveProviderKind(options.providerKind, env);
  const providerResolution = resolveProviderId(options.providerId, env);
  const driverResolution = resolveDriverId(options.driverId, env);
  const bindingResolution = resolveBindingId(options.bindingId, env, profileResolution.profileId);
  const unsafeConfigDiagnostics = createUnsafeConfigDiagnostics(env);
  const productionDiagnostics =
    profileResolution.profileId === "production-required" ? createProductionDiagnostics(env) : [];
  const diagnostics = [
    ...profileResolution.diagnostics,
    ...modeResolution.diagnostics,
    ...familyResolution.diagnostics,
    ...packageResolution.diagnostics,
    ...providerKindResolution.diagnostics,
    ...providerResolution.diagnostics,
    ...driverResolution.diagnostics,
    ...bindingResolution.diagnostics,
    ...unsafeConfigDiagnostics,
    ...productionDiagnostics,
  ];
  const blockerCount = diagnostics.filter((item) => item.severity === "error").length;
  const status = resolveStatus(profileResolution.profileId, blockerCount);
  const valid = profileResolution.valid
    && modeResolution.valid
    && familyResolution.valid
    && packageResolution.valid
    && providerKindResolution.valid
    && providerResolution.valid
    && driverResolution.valid
    && bindingResolution.valid
    && blockerCount === 0;
  const definition = createDefinition();
  const storeCoverage = createStoreCoverage();
  const healthCheck = createHealthCheck(status);
  const requiredConfigKeys = createRequiredConfigKeys();
  const diagnosticCodes = diagnostics.map((item) => item.code);
  const redactedConfigKeys = createRedactedConfigKeys(env);
  const unsafeConfigKeys = createUnsafeConfigKeys(env);
  const registration = createRegistration({
    bindingId: bindingResolution.bindingId,
    definition,
    driverId: driverResolution.driverId,
    healthCheck,
    mode: modeResolution.mode,
    providerId: providerResolution.providerId,
    requiredConfigKeys,
    status,
  });
  const readiness = createReadinessProjection({
    bindingId: bindingResolution.bindingId,
    blockerCount,
    diagnosticCodes,
    driverId: driverResolution.driverId,
    mode: modeResolution.mode,
    providerId: providerResolution.providerId,
    requiredConfigKeys,
    status,
    storeCoverage,
    valid,
  });

  return {
    ...registration,
    blockerCount,
    diagnosticCodes,
    diagnostics,
    id: FOUNDATION_ID,
    noLiveFlags: { ...productionDbPackageNoLiveFlags },
    preconditions: productionDbPackageProductionPreconditions.map(clonePrecondition),
    productionReady: false,
    profileId: profileResolution.profileId,
    readiness,
    redactedConfigKeys,
    requiredStoreIds: [...productionDatabaseRequiredStoreIds],
    storeCoverage,
    unsafeConfigKeys,
    valid,
  };
};

export const getProductionDbPackageBindingRegistration = (
  bindingId: string = LOCAL_BINDING_ID,
): ProductionDbPackageRegistration | undefined => {
  const binding = sanitizeProductionDbPackageString(bindingId);

  if (binding === LOCAL_BINDING_ID) {
    return createRegistration({
      bindingId: LOCAL_BINDING_ID,
      definition: createDefinition(),
      driverId: APPROVED_DRIVER_ID,
      healthCheck: createHealthCheck("local_ready"),
      mode: "dry_run",
      providerId: APPROVED_PROVIDER_ID,
      requiredConfigKeys: createRequiredConfigKeys(),
      status: "local_ready",
    });
  }

  if (binding === STAGING_BINDING_ID) {
    return createRegistration({
      bindingId: STAGING_BINDING_ID,
      definition: createDefinition(),
      driverId: APPROVED_DRIVER_ID,
      healthCheck: createHealthCheck("scaffolded"),
      mode: "metadata_only",
      providerId: APPROVED_PROVIDER_ID,
      requiredConfigKeys: createRequiredConfigKeys(),
      status: "scaffolded",
    });
  }

  if (binding === PRODUCTION_BINDING_ID) {
    return createRegistration({
      bindingId: PRODUCTION_BINDING_ID,
      definition: createDefinition(),
      driverId: APPROVED_DRIVER_ID,
      healthCheck: createHealthCheck("blocked"),
      mode: "production_required",
      providerId: APPROVED_PROVIDER_ID,
      requiredConfigKeys: createRequiredConfigKeys(),
      status: "blocked",
    });
  }

  return undefined;
};

export const redactProductionDbPackageValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => redactProductionDbPackageValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (isSensitiveProductionDbPackageKey(key)) {
          return [key, REDACTED_VALUE];
        }

        return [key, redactProductionDbPackageValue(nestedValue)];
      }),
    );
  }

  if (typeof value !== "string") {
    return value;
  }

  if (isRawProductionDbPackagePayload(value)) {
    return RAW_PACKAGE_PAYLOAD_VALUE;
  }

  if (isUnsafeProductionDbPackageString(value)) {
    return REDACTED_VALUE;
  }

  return value;
};

function precondition(
  area: ProductionDbPackagePreconditionArea,
  diagnosticCode: ProductionDbPackageDiagnosticCode,
  field: string,
  id: string,
  message: string,
  requiredConfigKeys = [field],
  status: ProductionDbPackagePrecondition["status"] = "blocked",
): ProductionDbPackagePrecondition {
  return {
    area,
    diagnosticCode,
    field,
    id,
    message,
    requiredBeforeProduction: true,
    requiredConfigKeys,
    status,
  };
}

function clonePrecondition(precondition: ProductionDbPackagePrecondition): ProductionDbPackagePrecondition {
  return {
    ...precondition,
    requiredConfigKeys: [...precondition.requiredConfigKeys],
  };
}

function createDefinition(): ProductionDbPackageDefinition {
  return {
    ...productionDbPackageDefinitions[0],
  };
}

function createRegistration(input: {
  bindingId: string;
  definition: ProductionDbPackageDefinition;
  driverId: string;
  healthCheck: ProductionDbPackageHealthCheck;
  mode: ProductionDbPackageBindingMode;
  providerId: string;
  requiredConfigKeys: string[];
  status: ProductionDbPackageBindingStatus;
}): ProductionDbPackageRegistration {
  return {
    bindingId: input.bindingId,
    definition: { ...input.definition },
    driverId: input.driverId,
    healthCheck: { ...input.healthCheck },
    mode: input.mode,
    providerId: input.providerId,
    requiredConfigKeys: [...input.requiredConfigKeys],
    status: input.status,
  };
}

function createReadinessProjection(input: {
  bindingId: string;
  blockerCount: number;
  diagnosticCodes: ProductionDbPackageDiagnosticCode[];
  driverId: string;
  mode: ProductionDbPackageBindingMode;
  providerId: string;
  requiredConfigKeys: string[];
  status: ProductionDbPackageBindingStatus;
  storeCoverage: ProductionDbPackageStoreCoverage[];
  valid: boolean;
}): ProductionDbPackageReadinessProjection {
  return {
    bindingId: input.bindingId,
    blockerCount: input.blockerCount,
    browserBundleAllowed: false,
    dbClientConstructed: false,
    diagnosticCodes: [...input.diagnosticCodes],
    driverId: input.driverId,
    driverKind: APPROVED_DRIVER_KIND,
    family: APPROVED_PACKAGE_FAMILY,
    importPosture: "metadata_only_no_import",
    liveConnectionAttempted: false,
    liveContractWritesEnabled: false,
    liveMigrationExecutionEnabled: false,
    liveProductionMutationEnabled: false,
    liveProviderCallsEnabled: false,
    liveQueryExecutionEnabled: false,
    liveRewardCustodyEnabled: false,
    liveRewardDistributionEnabled: false,
    liveStorageWritesEnabled: false,
    liveTransactionExecutionEnabled: false,
    mode: input.mode,
    noLiveFlags: { ...productionDbPackageNoLiveFlags },
    packageName: APPROVED_PACKAGE_NAME,
    packageRef: APPROVED_PACKAGE_REF,
    productionReady: false,
    providerId: input.providerId,
    providerKind: APPROVED_PROVIDER_KIND,
    requiredConfigKeys: [...input.requiredConfigKeys],
    requiredStoreIds: [...productionDatabaseRequiredStoreIds],
    secretValueExposed: false,
    status: input.status,
    storeCoverage: input.storeCoverage.map((item) => ({ ...item })),
    valid: input.valid,
  };
}

function createHealthCheck(status: ProductionDbPackageBindingStatus): ProductionDbPackageHealthCheck {
  return {
    driverClientConstructionAttempted: false,
    lastCheckedAt: HEALTH_CHECK_TIMESTAMP,
    liveDbHealthCheckAttempted: false,
    packageImportAttempted: false,
    status: status === "local_ready" ? "local_ok" : status === "scaffolded" ? "metadata_only" : "blocked",
  };
}

function createStoreCoverage(): ProductionDbPackageStoreCoverage[] {
  return productionDatabaseStoreRegistry.map((store) => ({
    coveredByBinding: true,
    label: store.label,
    migrationRequired: store.migrationRequired,
    ownerServiceId: store.ownerServiceId,
    schemaVersion: store.schemaVersion,
    storeId: store.id,
  }));
}

function createRequiredConfigKeys(): string[] {
  return [
    ...new Set(productionDbPackageProductionPreconditions.flatMap((item) => item.requiredConfigKeys)),
  ];
}

function diagnostic(
  code: ProductionDbPackageDiagnosticCode,
  field: string,
  message: string,
  severity: ProductionDbPackageDiagnosticSeverity = "error",
): ProductionDbPackageDiagnostic {
  return {
    code,
    field,
    message,
    severity,
  };
}

function resolveProfile(
  requestedProfileId: string | undefined,
): {
  diagnostics: ProductionDbPackageDiagnostic[];
  profileId: ProductionDbPackageBindingProfileId;
  valid: boolean;
} {
  const resolved = resolveBackendRuntimeProfile(requestedProfileId);

  if (resolved.valid) {
    return {
      diagnostics: [],
      profileId: resolved.profile.id,
      valid: true,
    };
  }

  return {
    diagnostics: [
      diagnostic(
        "UNKNOWN_PRODUCTION_DB_PACKAGE_BINDING_PROFILE",
        "profileId",
        `Unsupported production DB package binding profile: ${sanitizeProductionDbPackageString(resolved.requestedProfileId)}`,
      ),
    ],
    profileId: resolved.profile.id,
    valid: false,
  };
}

function resolveMode(
  profileId: ProductionDbPackageBindingProfileId,
  requestedMode: string | undefined,
): { diagnostics: ProductionDbPackageDiagnostic[]; mode: ProductionDbPackageBindingMode; valid: boolean } {
  const defaultMode = profileId === "local-review"
    ? "dry_run"
    : profileId === "staging-scaffold"
      ? "metadata_only"
      : "production_required";

  if (!requestedMode) {
    return {
      diagnostics: [],
      mode: defaultMode,
      valid: true,
    };
  }

  if (isProductionDbPackageBindingMode(requestedMode) && !isUnsafeProductionDbPackageString(requestedMode)) {
    return {
      diagnostics: [],
      mode: requestedMode,
      valid: true,
    };
  }

  return {
    diagnostics: [
      diagnostic(
        "UNKNOWN_PRODUCTION_DB_PACKAGE_BINDING_MODE",
        "mode",
        `Unsupported production DB package binding mode: ${sanitizeProductionDbPackageString(requestedMode)}`,
      ),
    ],
    mode: "production_required",
    valid: false,
  };
}

function resolveFamily(
  requestedFamily: string | undefined,
  env: Record<string, unknown>,
): { diagnostics: ProductionDbPackageDiagnostic[]; family: ProductionDbPackageFamily; valid: boolean } {
  const envFamily = env.CAMPAIGN_OS_DATABASE_PACKAGE_FAMILY;
  const rawFamily =
    requestedFamily
    ?? (typeof envFamily === "string" && envFamily.trim().length > 0 ? envFamily : undefined)
    ?? APPROVED_PACKAGE_FAMILY;

  if (isUnsafeProductionDbPackageString(rawFamily) || !isSafeLabel(rawFamily)) {
    return {
      diagnostics: [
        diagnostic("UNSAFE_PRODUCTION_DB_PACKAGE_BINDING_CONFIG", "family", "Production DB package family contains unsafe material."),
      ],
      family: APPROVED_PACKAGE_FAMILY,
      valid: false,
    };
  }

  if (rawFamily !== APPROVED_PACKAGE_FAMILY) {
    return {
      diagnostics: [
        diagnostic(
          "UNKNOWN_PRODUCTION_DB_PACKAGE_FAMILY",
          "family",
          `Production DB package family is not supported: ${sanitizeProductionDbPackageString(rawFamily)}`,
        ),
      ],
      family: APPROVED_PACKAGE_FAMILY,
      valid: false,
    };
  }

  return {
    diagnostics: [],
    family: rawFamily,
    valid: true,
  };
}

function resolvePackageName(
  requestedPackageName: string | undefined,
  env: Record<string, unknown>,
): { diagnostics: ProductionDbPackageDiagnostic[]; packageName: "pg"; valid: boolean } {
  const envPackage = env.CAMPAIGN_OS_DATABASE_PACKAGE;
  const rawPackageName =
    requestedPackageName
    ?? (typeof envPackage === "string" && envPackage.trim().length > 0 ? envPackage : undefined)
    ?? APPROVED_PACKAGE_NAME;

  if (isUnsafeProductionDbPackageString(rawPackageName) || !isSafePackageName(rawPackageName)) {
    return {
      diagnostics: [
        diagnostic("UNSAFE_PRODUCTION_DB_PACKAGE_BINDING_CONFIG", "packageName", "Production DB package name contains unsafe material."),
      ],
      packageName: APPROVED_PACKAGE_NAME,
      valid: false,
    };
  }

  if (rawPackageName !== APPROVED_PACKAGE_NAME && rawPackageName !== APPROVED_PACKAGE_REF) {
    return {
      diagnostics: [
        diagnostic(
          "PRODUCTION_DB_PACKAGE_UNSUPPORTED",
          "packageName",
          `Production DB package is not approved for this binding: ${sanitizeProductionDbPackageString(rawPackageName)}`,
        ),
      ],
      packageName: APPROVED_PACKAGE_NAME,
      valid: false,
    };
  }

  return {
    diagnostics: [],
    packageName: APPROVED_PACKAGE_NAME,
    valid: true,
  };
}

function resolveProviderKind(
  requestedProviderKind: string | undefined,
  env: Record<string, unknown>,
): {
  diagnostics: ProductionDbPackageDiagnostic[];
  providerKind: ProductionDbPackageProviderKind;
  valid: boolean;
} {
  const envProviderKind = env.CAMPAIGN_OS_DATABASE_PROVIDER_KIND;
  const rawProviderKind =
    requestedProviderKind
    ?? (typeof envProviderKind === "string" && envProviderKind.trim().length > 0 ? envProviderKind : undefined)
    ?? APPROVED_PROVIDER_KIND;

  if (isUnsafeProductionDbPackageString(rawProviderKind) || !isSafeLabel(rawProviderKind)) {
    return {
      diagnostics: [
        diagnostic("UNSAFE_PRODUCTION_DB_PACKAGE_BINDING_CONFIG", "providerKind", "Production DB provider kind contains unsafe material."),
      ],
      providerKind: APPROVED_PROVIDER_KIND,
      valid: false,
    };
  }

  if (rawProviderKind !== APPROVED_PROVIDER_KIND) {
    return {
      diagnostics: [
        diagnostic(
          "PRODUCTION_DB_PROVIDER_UNSUPPORTED",
          "providerKind",
          `Production DB provider kind is not supported: ${sanitizeProductionDbPackageString(rawProviderKind)}`,
        ),
      ],
      providerKind: APPROVED_PROVIDER_KIND,
      valid: false,
    };
  }

  return {
    diagnostics: [],
    providerKind: APPROVED_PROVIDER_KIND,
    valid: true,
  };
}

function resolveProviderId(
  requestedProviderId: string | undefined,
  env: Record<string, unknown>,
): { diagnostics: ProductionDbPackageDiagnostic[]; providerId: string; valid: boolean } {
  const envProviderId = env.CAMPAIGN_OS_DATABASE_PROVIDER;
  const rawProviderId =
    requestedProviderId
    ?? (typeof envProviderId === "string" && envProviderId.trim().length > 0 ? envProviderId : undefined)
    ?? APPROVED_PROVIDER_ID;

  if (isUnsafeProductionDbPackageString(rawProviderId) || !isSafeLabel(rawProviderId)) {
    return {
      diagnostics: [
        diagnostic("UNSAFE_PRODUCTION_DB_PACKAGE_BINDING_CONFIG", "providerId", "Production DB provider id contains unsafe material."),
      ],
      providerId: APPROVED_PROVIDER_ID,
      valid: false,
    };
  }

  if (rawProviderId !== APPROVED_PROVIDER_ID) {
    return {
      diagnostics: [
        diagnostic(
          "PRODUCTION_DB_PROVIDER_UNSUPPORTED",
          "providerId",
          `Production DB provider id is not supported: ${sanitizeProductionDbPackageString(rawProviderId)}`,
        ),
      ],
      providerId: APPROVED_PROVIDER_ID,
      valid: false,
    };
  }

  return {
    diagnostics: [],
    providerId: APPROVED_PROVIDER_ID,
    valid: true,
  };
}

function resolveDriverId(
  requestedDriverId: string | undefined,
  env: Record<string, unknown>,
): { diagnostics: ProductionDbPackageDiagnostic[]; driverId: string; valid: boolean } {
  const envDriverId = env.CAMPAIGN_OS_DATABASE_DRIVER;
  const rawDriverId =
    requestedDriverId
    ?? (typeof envDriverId === "string" && envDriverId.trim().length > 0 ? envDriverId : undefined)
    ?? APPROVED_DRIVER_ID;

  if (isUnsafeProductionDbPackageString(rawDriverId) || !isSafeLabel(rawDriverId)) {
    return {
      diagnostics: [
        diagnostic("UNSAFE_PRODUCTION_DB_PACKAGE_BINDING_CONFIG", "driverId", "Production DB driver id contains unsafe material."),
      ],
      driverId: APPROVED_DRIVER_ID,
      valid: false,
    };
  }

  if (rawDriverId !== APPROVED_DRIVER_ID) {
    return {
      diagnostics: [
        diagnostic(
          "PRODUCTION_DB_DRIVER_UNSUPPORTED",
          "driverId",
          `Production DB driver id is not supported: ${sanitizeProductionDbPackageString(rawDriverId)}`,
        ),
      ],
      driverId: APPROVED_DRIVER_ID,
      valid: false,
    };
  }

  return {
    diagnostics: [],
    driverId: APPROVED_DRIVER_ID,
    valid: true,
  };
}

function resolveBindingId(
  requestedBindingId: string | undefined,
  env: Record<string, unknown>,
  profileId: ProductionDbPackageBindingProfileId,
): { bindingId: string; diagnostics: ProductionDbPackageDiagnostic[]; valid: boolean } {
  const envBinding = env.CAMPAIGN_OS_DATABASE_PACKAGE_BINDING;
  const rawBindingId =
    requestedBindingId
    ?? (typeof envBinding === "string" && envBinding.trim().length > 0 ? envBinding : undefined)
    ?? (profileId === "staging-scaffold"
      ? STAGING_BINDING_ID
      : profileId === "production-required"
        ? PRODUCTION_BINDING_ID
        : LOCAL_BINDING_ID);

  if (isUnsafeProductionDbPackageString(rawBindingId) || !isSafeLabel(rawBindingId)) {
    return {
      bindingId: "blocked-production-db-package-binding",
      diagnostics: [
        diagnostic("UNSAFE_PRODUCTION_DB_PACKAGE_BINDING_CONFIG", "bindingId", "Production DB package binding id contains unsafe material."),
      ],
      valid: false,
    };
  }

  return {
    bindingId: rawBindingId,
    diagnostics: [],
    valid: true,
  };
}

function createProductionDiagnostics(env: Record<string, unknown>): ProductionDbPackageDiagnostic[] {
  return productionDbPackageProductionPreconditions
    .filter((item) => {
      if (item.diagnosticCode === "PRODUCTION_DB_LIVE_ENABLEMENT_MISSING") {
        return !isActivationGateSatisfied(env);
      }

      return !hasConfiguredValue(env, item.requiredConfigKeys);
    })
    .map((item) => diagnostic(item.diagnosticCode, item.field, item.message));
}

function createUnsafeConfigDiagnostics(env: Record<string, unknown>): ProductionDbPackageDiagnostic[] {
  return createUnsafeConfigKeys(env).map((field) =>
    diagnostic(
      "UNSAFE_PRODUCTION_DB_PACKAGE_BINDING_CONFIG",
      field,
      `Production DB package binding config '${field}' contains unsafe material and was redacted.`,
    )
  );
}

function resolveStatus(
  profileId: ProductionDbPackageBindingProfileId,
  blockerCount: number,
): ProductionDbPackageBindingStatus {
  if (blockerCount > 0) {
    return "blocked";
  }

  return profileId === "local-review" ? "local_ready" : "scaffolded";
}

function hasConfiguredValue(env: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.every((key) => {
    const value = env[key];

    if (typeof value === "string") {
      return value.trim().length > 0 && !isUnsafeProductionDbPackageString(value);
    }

    return value !== undefined && value !== null;
  });
}

function isActivationGateSatisfied(env: Record<string, unknown>): boolean {
  const value = env.CAMPAIGN_OS_DATABASE_LIVE_ENABLEMENT;

  return typeof value === "string" && value.trim() === "explicitly-enabled";
}

function createRedactedConfigKeys(env: Record<string, unknown>): string[] {
  return Object.keys(env)
    .filter((key) => isSensitiveProductionDbPackageKey(key) || isUnsafeProductionDbPackageValue(env[key]))
    .sort();
}

function createUnsafeConfigKeys(env: Record<string, unknown>): string[] {
  return Object.entries(env)
    .filter(([, value]) => isUnsafeProductionDbPackageValue(value))
    .map(([key]) => key)
    .sort();
}

function isUnsafeProductionDbPackageValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => isUnsafeProductionDbPackageValue(item));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).some(([key, nestedValue]) =>
      isSensitiveProductionDbPackageKey(key) || isUnsafeProductionDbPackageValue(nestedValue)
    );
  }

  return typeof value === "string" && isUnsafeProductionDbPackageString(value);
}

function isProductionDbPackageBindingMode(value: string): value is ProductionDbPackageBindingMode {
  return value === "dry_run" || value === "metadata_only" || value === "production_required";
}

function isSafeLabel(value: string): boolean {
  return /^[a-z0-9][a-z0-9:-]*$/i.test(value);
}

function isSafePackageName(value: string): boolean {
  return /^[a-z][a-z0-9-]*$/i.test(value) || value === APPROVED_PACKAGE_REF;
}

function sanitizeProductionDbPackageString(value: string): string {
  if (isRawProductionDbPackagePayload(value)) {
    return RAW_PACKAGE_PAYLOAD_VALUE;
  }

  if (isUnsafeProductionDbPackageString(value)) {
    return REDACTED_VALUE;
  }

  return value;
}

function isRawProductionDbPackagePayload(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  return normalized.startsWith("{")
    || normalized.startsWith("[")
    || normalized.includes("provider payload")
    || normalized.includes("database payload")
    || normalized.includes("raw provider")
    || normalized.includes("raw database")
    || normalized.includes("\"database\"")
    || normalized.includes("\"provider\"");
}

function isUnsafeProductionDbPackageString(value: string): boolean {
  const normalized = value.toLowerCase();

  return normalized.includes("://")
    || normalized.includes("password")
    || normalized.includes("passwd")
    || normalized.includes("secret=")
    || normalized.includes("secret:")
    || normalized.includes("token=")
    || normalized.includes("access_token")
    || normalized.includes("private_key")
    || normalized.includes("private-key")
    || normalized.includes("private key")
    || normalized.includes("-----begin")
    || normalized.includes("mnemonic")
    || normalized.includes("signature")
    || normalized.includes("x-amz-")
    || normalized.includes("bearer ")
    || normalized.includes("object-key")
    || normalized.includes("object_key")
    || isRawProductionDbPackagePayload(value);
}

function isSensitiveProductionDbPackageKey(key: string): boolean {
  const normalized = key.toLowerCase();

  return normalized.includes("password")
    || normalized.includes("secret")
    || normalized.includes("token")
    || normalized.includes("private")
    || normalized.includes("signed")
    || normalized.includes("object")
    || normalized.includes("mnemonic")
    || normalized.includes("signature")
    || normalized.includes("credential")
    || normalized.includes("connectionstring")
    || normalized.endsWith("url")
    || normalized.endsWith("dsn")
    || normalized.includes("payload");
}
