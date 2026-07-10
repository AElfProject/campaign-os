import type { BackendRuntimeProfileId } from "./backendProfiles";
import type { BackendStoreId } from "./persistenceAdapterPort";
import { productionDatabaseRequiredStoreIds } from "./productionDatabase";
import {
  createProductionDbPackageBinding,
  type ProductionDbPackageBindingStatus,
  type ProductionDbPackageDiagnosticCode,
  type ProductionDbPackageNoLiveFlags,
} from "./productionDbPackageBinding";

export type DatabaseProviderKind =
  | "deterministic_test"
  | "managed_relational_deferred"
  | "self_hosted_relational_deferred";
export type DatabaseProviderStatus = "available" | "deferred" | "blocked";
export type DatabaseDriverStatus = "available" | "deferred" | "blocked";
export type DatabaseProviderSideEffectPolicy = "none" | "live_external_deferred";
export type DatabaseProviderDiagnosticCode =
  | "DATABASE_PROVIDER_NOT_FOUND"
  | "DATABASE_DRIVER_NOT_FOUND"
  | "DATABASE_PROVIDER_DRIVER_MISMATCH"
  | "DATABASE_PROVIDER_DRIVER_UNKNOWN"
  | "DATABASE_DRIVER_STORE_UNSUPPORTED"
  | "DATABASE_DRIVER_PRODUCTION_DEFERRED"
  | "DATABASE_PROVIDER_PRODUCTION_UNSUPPORTED";

export interface DatabaseProviderDiagnostic {
  code: DatabaseProviderDiagnosticCode;
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface DatabaseProviderDescriptor {
  driverIds: string[];
  id: string;
  kind: DatabaseProviderKind;
  label: string;
  requiresNetwork: boolean;
  requiresSecretManager: boolean;
  sideEffectPolicy: DatabaseProviderSideEffectPolicy;
  status: DatabaseProviderStatus;
}

export interface DatabaseDriverCapabilityDescriptor {
  adHocRawSql: boolean;
  parameterizedQueries: boolean;
  pooling: boolean;
  requiresNetwork: boolean;
  requiresSecretManager: boolean;
  transactions: boolean;
}

export interface DatabaseDriverPackageBindingDescriptor {
  bindingId: string;
  blockerCount: number;
  diagnosticCodes: ProductionDbPackageDiagnosticCode[];
  driverId: string;
  noLiveFlags: ProductionDbPackageNoLiveFlags;
  packageName: "pg";
  packageRef: "npm:pg";
  productionReady: false;
  providerId: string;
  requiredConfigKeys: string[];
  requiredStoreIds: BackendStoreId[];
  status: ProductionDbPackageBindingStatus;
  valid: boolean;
}

export interface DatabaseDriverDescriptor {
  capability: DatabaseDriverCapabilityDescriptor;
  deferredBy: string[];
  id: string;
  label: string;
  packageBinding: DatabaseDriverPackageBindingDescriptor;
  providerId: string;
  requiredConfigKeys: string[];
  status: DatabaseDriverStatus;
  supportedStoreIds: BackendStoreId[];
  supportsConnectionPool: boolean;
  supportsMigrations: boolean;
  supportsTransactions: boolean;
}

export interface DatabaseProviderRegistryReport {
  activeDriver?: DatabaseDriverDescriptor;
  activeProvider?: DatabaseProviderDescriptor;
  drivers: DatabaseDriverDescriptor[];
  providers: DatabaseProviderDescriptor[];
  selectedDriverId: string;
  selectedProviderId: string;
  validation: {
    issues: DatabaseProviderDiagnostic[];
    valid: boolean;
  };
}

export interface CreateDatabaseProviderRegistryReportOptions {
  driverId?: string;
  drivers?: readonly DatabaseDriverDescriptor[];
  profileId?: BackendRuntimeProfileId;
  providerId?: string;
  providers?: readonly DatabaseProviderDescriptor[];
}

const REDACTED_VALUE = "[redacted]";
const defaultLocalProviderId = "campaign-os-deterministic-test-db";
const defaultLocalDriverId = "campaign-os-deterministic-test-driver";
const defaultProductionProviderId = "campaign-os-provider-deferred";
const defaultProductionDriverId = "campaign-os-production-driver-deferred";

export const databaseProviderDescriptors: DatabaseProviderDescriptor[] = [
  {
    driverIds: [defaultLocalDriverId],
    id: defaultLocalProviderId,
    kind: "deterministic_test",
    label: "Campaign OS deterministic test database",
    requiresNetwork: false,
    requiresSecretManager: false,
    sideEffectPolicy: "none",
    status: "available",
  },
  {
    driverIds: [defaultProductionDriverId],
    id: defaultProductionProviderId,
    kind: "managed_relational_deferred",
    label: "Campaign OS production database provider selection",
    requiresNetwork: true,
    requiresSecretManager: true,
    sideEffectPolicy: "live_external_deferred",
    status: "deferred",
  },
  {
    driverIds: ["campaign-os-managed-postgres-driver-deferred"],
    id: "campaign-os-managed-postgres-deferred",
    kind: "managed_relational_deferred",
    label: "Managed PostgreSQL provider candidate",
    requiresNetwork: true,
    requiresSecretManager: true,
    sideEffectPolicy: "live_external_deferred",
    status: "deferred",
  },
  {
    driverIds: ["campaign-os-self-hosted-relational-driver-deferred"],
    id: "campaign-os-self-hosted-relational-deferred",
    kind: "self_hosted_relational_deferred",
    label: "Self-hosted relational provider candidate",
    requiresNetwork: true,
    requiresSecretManager: true,
    sideEffectPolicy: "live_external_deferred",
    status: "deferred",
  },
];

const productionDriverDeferredBy = [
  "driver package selection mission",
  "database deployment environment mission",
  "schema migration implementation mission",
  "connection pool implementation mission",
  "migration lock mission",
  "backup and restore plan mission",
  "secret manager integration mission",
  "observability exporter mission",
] as const;

export const databaseDriverDescriptors: DatabaseDriverDescriptor[] = [
  {
    capability: {
      adHocRawSql: false,
      parameterizedQueries: true,
      pooling: false,
      requiresNetwork: false,
      requiresSecretManager: false,
      transactions: true,
    },
    deferredBy: [],
    id: defaultLocalDriverId,
    label: "Campaign OS deterministic database driver",
    packageBinding: createDatabaseDriverPackageBindingDescriptor("local-review"),
    providerId: defaultLocalProviderId,
    requiredConfigKeys: [],
    status: "available",
    supportedStoreIds: [...productionDatabaseRequiredStoreIds],
    supportsConnectionPool: false,
    supportsMigrations: false,
    supportsTransactions: true,
  },
  {
    capability: {
      adHocRawSql: false,
      parameterizedQueries: true,
      pooling: true,
      requiresNetwork: true,
      requiresSecretManager: true,
      transactions: true,
    },
    deferredBy: [...productionDriverDeferredBy],
    id: defaultProductionDriverId,
    label: "Campaign OS production database driver placeholder",
    packageBinding: createDatabaseDriverPackageBindingDescriptor("production-required"),
    providerId: defaultProductionProviderId,
    requiredConfigKeys: ["CAMPAIGN_OS_DATABASE_URL"],
    status: "deferred",
    supportedStoreIds: [...productionDatabaseRequiredStoreIds],
    supportsConnectionPool: true,
    supportsMigrations: true,
    supportsTransactions: true,
  },
  {
    capability: {
      adHocRawSql: false,
      parameterizedQueries: true,
      pooling: true,
      requiresNetwork: true,
      requiresSecretManager: true,
      transactions: true,
    },
    deferredBy: [...productionDriverDeferredBy],
    id: "campaign-os-managed-postgres-driver-deferred",
    label: "Managed PostgreSQL driver candidate",
    packageBinding: createDatabaseDriverPackageBindingDescriptor("production-required"),
    providerId: "campaign-os-managed-postgres-deferred",
    requiredConfigKeys: ["CAMPAIGN_OS_DATABASE_URL"],
    status: "deferred",
    supportedStoreIds: [...productionDatabaseRequiredStoreIds],
    supportsConnectionPool: true,
    supportsMigrations: true,
    supportsTransactions: true,
  },
  {
    capability: {
      adHocRawSql: false,
      parameterizedQueries: true,
      pooling: true,
      requiresNetwork: true,
      requiresSecretManager: true,
      transactions: true,
    },
    deferredBy: [...productionDriverDeferredBy],
    id: "campaign-os-self-hosted-relational-driver-deferred",
    label: "Self-hosted relational driver candidate",
    packageBinding: createDatabaseDriverPackageBindingDescriptor("production-required"),
    providerId: "campaign-os-self-hosted-relational-deferred",
    requiredConfigKeys: ["CAMPAIGN_OS_DATABASE_URL"],
    status: "deferred",
    supportedStoreIds: [...productionDatabaseRequiredStoreIds],
    supportsConnectionPool: true,
    supportsMigrations: true,
    supportsTransactions: true,
  },
];

const knownStoreIds = new Set<BackendStoreId>(productionDatabaseRequiredStoreIds);

const cloneProvider = (
  provider: DatabaseProviderDescriptor,
  status = provider.status,
): DatabaseProviderDescriptor => ({
  ...provider,
  driverIds: [...provider.driverIds],
  status,
});

const cloneDriver = (
  driver: DatabaseDriverDescriptor,
  status = driver.status,
  profileId: BackendRuntimeProfileId = "local-review",
): DatabaseDriverDescriptor => ({
  ...driver,
  capability: { ...driver.capability },
  deferredBy: [...driver.deferredBy],
  packageBinding: createDatabaseDriverPackageBindingDescriptor(profileId),
  requiredConfigKeys: [...driver.requiredConfigKeys],
  status,
  supportedStoreIds: [...driver.supportedStoreIds],
});

function createDatabaseDriverPackageBindingDescriptor(
  profileId: BackendRuntimeProfileId,
): DatabaseDriverPackageBindingDescriptor {
  const packageBinding = createProductionDbPackageBinding({ profileId });

  return {
    bindingId: packageBinding.bindingId,
    blockerCount: packageBinding.blockerCount,
    diagnosticCodes: [...packageBinding.diagnosticCodes],
    driverId: packageBinding.driverId,
    noLiveFlags: { ...packageBinding.noLiveFlags },
    packageName: packageBinding.definition.packageName,
    packageRef: packageBinding.definition.packageRef,
    productionReady: false,
    providerId: packageBinding.providerId,
    requiredConfigKeys: [...packageBinding.requiredConfigKeys],
    requiredStoreIds: [...packageBinding.requiredStoreIds],
    status: packageBinding.status,
    valid: packageBinding.valid,
  };
}

const safeRegistryValue = (value: string) =>
  /^[a-z0-9-]+$/i.test(value) ? value : REDACTED_VALUE;

const issue = (
  code: DatabaseProviderDiagnosticCode,
  field: string,
  message: string,
  severity: DatabaseProviderDiagnostic["severity"] = "error",
): DatabaseProviderDiagnostic => ({
  code,
  field,
  message,
  severity,
});

const validateDescriptorGraph = ({
  drivers,
  providers,
}: {
  drivers: readonly DatabaseDriverDescriptor[];
  providers: readonly DatabaseProviderDescriptor[];
}): DatabaseProviderDiagnostic[] => {
  const diagnostics: DatabaseProviderDiagnostic[] = [];
  const providerIds = new Set(providers.map((provider) => provider.id));
  const driverIds = new Set(drivers.map((driver) => driver.id));

  for (const provider of providers) {
    for (const driverId of provider.driverIds) {
      if (!driverIds.has(driverId)) {
        diagnostics.push(
          issue(
            "DATABASE_PROVIDER_DRIVER_UNKNOWN",
            provider.id,
            `Database provider '${provider.id}' references unknown driver '${driverId}'.`,
          ),
        );
      }
    }
  }

  for (const driver of drivers) {
    if (!providerIds.has(driver.providerId)) {
      diagnostics.push(
        issue(
          "DATABASE_PROVIDER_NOT_FOUND",
          driver.providerId,
          `Database driver '${driver.id}' references unknown provider '${driver.providerId}'.`,
        ),
      );
    }

    for (const storeId of driver.supportedStoreIds) {
      if (!knownStoreIds.has(storeId)) {
        diagnostics.push(
          issue(
            "DATABASE_DRIVER_STORE_UNSUPPORTED",
            storeId,
            `Database driver '${driver.id}' references unsupported store '${storeId}'.`,
          ),
        );
      }
    }
  }

  return diagnostics;
};

const selectDefaultProviderId = (profileId: BackendRuntimeProfileId) =>
  profileId === "production-required" ? defaultProductionProviderId : defaultLocalProviderId;

const selectDefaultDriverId = (profileId: BackendRuntimeProfileId) =>
  profileId === "production-required" ? defaultProductionDriverId : defaultLocalDriverId;

export const createDatabaseProviderRegistryReport = ({
  driverId,
  drivers = databaseDriverDescriptors,
  profileId = "local-review",
  providerId,
  providers = databaseProviderDescriptors,
}: CreateDatabaseProviderRegistryReportOptions = {}): DatabaseProviderRegistryReport => {
  const rawProviderId = providerId ?? selectDefaultProviderId(profileId);
  const provider = providers.find((item) => item.id === rawProviderId);
  const rawDriverId = driverId ?? provider?.driverIds[0] ?? selectDefaultDriverId(profileId);
  const driver = drivers.find((item) => item.id === rawDriverId);
  const diagnostics = validateDescriptorGraph({ drivers, providers });

  if (!provider) {
    diagnostics.push(
      issue(
        "DATABASE_PROVIDER_NOT_FOUND",
        "providerId",
        `Database provider '${safeRegistryValue(rawProviderId)}' is not registered.`,
      ),
    );
  }

  if (!driver) {
    diagnostics.push(
      issue(
        "DATABASE_DRIVER_NOT_FOUND",
        "driverId",
        `Database driver '${safeRegistryValue(rawDriverId)}' is not registered.`,
      ),
    );
  }

  if (provider && driver && driver.providerId !== provider.id) {
    diagnostics.push(
      issue(
        "DATABASE_PROVIDER_DRIVER_MISMATCH",
        "driverId",
        `Database driver '${driver.id}' belongs to provider '${driver.providerId}', not '${provider.id}'.`,
      ),
    );
  }

  if (profileId === "production-required" && provider?.kind === "deterministic_test") {
    diagnostics.push(
      issue(
        "DATABASE_PROVIDER_PRODUCTION_UNSUPPORTED",
        "providerId",
        "Deterministic test database provider cannot satisfy production-required readiness.",
      ),
    );
  }

  if (profileId === "production-required" && driver && driver.status !== "available") {
    diagnostics.push(
      issue(
        "DATABASE_DRIVER_PRODUCTION_DEFERRED",
        "driverId",
        `Database driver '${driver.id}' is deferred until production DB preconditions are implemented.`,
      ),
    );
  }

  const reportProviderStatus = (item: DatabaseProviderDescriptor): DatabaseProviderStatus =>
    profileId === "production-required" && item.id === provider?.id && item.status === "deferred"
      ? "blocked"
      : item.status;
  const reportDriverStatus = (item: DatabaseDriverDescriptor): DatabaseDriverStatus =>
    profileId === "production-required" && item.id === driver?.id && item.status === "deferred"
      ? "blocked"
      : item.status;
  const reportProviders = providers.map((item) => cloneProvider(item, reportProviderStatus(item)));
  const reportDrivers = drivers.map((item) =>
    cloneDriver(item, reportDriverStatus(item), profileId)
  );

  return {
    activeDriver: driver ? cloneDriver(driver, reportDriverStatus(driver), profileId) : undefined,
    activeProvider: provider ? cloneProvider(provider, reportProviderStatus(provider)) : undefined,
    drivers: reportDrivers,
    providers: reportProviders,
    selectedDriverId: driver ? driver.id : safeRegistryValue(rawDriverId),
    selectedProviderId: provider ? provider.id : safeRegistryValue(rawProviderId),
    validation: {
      issues: diagnostics,
      valid: diagnostics.every((diagnostic) => diagnostic.severity !== "error"),
    },
  };
};
