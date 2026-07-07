import {
  DEFAULT_BACKEND_RUNTIME_PROFILE_ID,
  deferredProductionBackendCapabilities,
  isBackendRuntimeProfileId,
  productionBackendRequiredConfigKeys,
  resolveBackendRuntimeProfile,
  type BackendRuntimeProfile,
  type BackendRuntimeProfileId,
} from "./backendProfiles";
import { queueRuntimeProductionPreconditions } from "./queueRuntime";
import { schedulerRuntimeProductionPreconditions } from "./schedulerRuntime";

export type CampaignOsPersistenceMode = "memory" | "local_json";

export type BackendConfigContractStatus = "ready" | "scaffold" | "blocked";
export type BackendConfigDiagnosticSeverity = "error" | "warning" | "info";
export type BackendConfigDiagnosticCode =
  | "UNKNOWN_BACKEND_PROFILE"
  | "UNSUPPORTED_PERSISTENCE_MODE"
  | "MISSING_PRODUCTION_CONFIG"
  | "PRODUCTION_CAPABILITY_DEFERRED"
  | "PRODUCTION_CAPABILITY_ENABLEMENT_BLOCKED";

export interface CampaignOsPersistenceConfig {
  adapterLabel: string;
  localDataDir?: string;
  mode: CampaignOsPersistenceMode;
  productionDriverId?: string;
}

export interface CampaignOsRuntimeConfig {
  persistence: CampaignOsPersistenceConfig;
  version: string;
}

export interface CampaignOsRuntimeConfigOptions {
  env?: Record<string, string | undefined>;
  persistence?: Partial<CampaignOsPersistenceConfig>;
  version?: string;
}

export interface BackendConfigDiagnostic {
  code: BackendConfigDiagnosticCode;
  field: string;
  message: string;
  severity: BackendConfigDiagnosticSeverity;
}

export interface BackendConfigContractOptions {
  env?: Record<string, string | undefined>;
  host?: string;
  persistence?: Partial<CampaignOsPersistenceConfig> & {
    mode?: string;
  };
  port?: number;
  profileId?: string;
  version?: string;
}

export interface BackendConfigContract {
  diagnostics: BackendConfigDiagnostic[];
  host: string;
  persistenceDirectory?: string;
  persistenceMode: CampaignOsPersistenceMode;
  productionPersistence: {
    liveMigrationApproval: boolean;
    requestedDriverId?: string;
  };
  port: number;
  productionReadiness: {
    deferredCapabilities: string[];
    missingConfigKeys: string[];
    requiredConfigKeys: string[];
    status: BackendConfigContractStatus;
  };
  profile: BackendRuntimeProfile;
  profileId: BackendRuntimeProfileId;
  requestedProfileId: string;
  valid: boolean;
  version: string;
}

const DEFAULT_VERSION = "0.2.0-local";
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 5174;
const REDACTED_VALUE = "[redacted]";
const forbiddenConfigKeyFragments = [
  "apikey",
  "bearer",
  "credentials",
  "endpoint",
  "mnemonic",
  "objectkey",
  "password",
  "provider",
  "providercredentials",
  "private",
  "queue",
  "authorization",
  "lease",
  "secret",
  "seed",
  "signature",
  "signedurl",
  "token",
  "url",
];

const isPersistenceMode = (value: string | undefined): value is CampaignOsPersistenceMode =>
  value === "memory" || value === "local_json";

const normalizeSecretKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

const isSecretLikeConfigKey = (key: string) => {
  const normalizedKey = normalizeSecretKey(key);

  return forbiddenConfigKeyFragments.some((fragment) => normalizedKey.includes(fragment));
};

export const sanitizeBackendConfigDiagnosticValue = (
  key: string,
  value: string | undefined,
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return isSecretLikeConfigKey(key) ? REDACTED_VALUE : value;
};

const resolvePersistenceMode = (
  requestedMode: string | undefined,
  explicitMode: string | undefined,
): CampaignOsPersistenceMode => {
  if (isPersistenceMode(requestedMode)) {
    return requestedMode;
  }

  if (explicitMode !== undefined) {
    throw new Error(`Unsupported Campaign OS persistence mode: ${explicitMode}`);
  }

  return "memory";
};

const resolveBackendPersistenceMode = (
  requestedMode: string | undefined,
): {
  diagnostics: BackendConfigDiagnostic[];
  mode: CampaignOsPersistenceMode;
} => {
  if (isPersistenceMode(requestedMode)) {
    return {
      diagnostics: [],
      mode: requestedMode,
    };
  }

  if (requestedMode !== undefined) {
    return {
      diagnostics: [
        {
          code: "UNSUPPORTED_PERSISTENCE_MODE",
          field: "persistenceMode",
          message: `Unsupported Campaign OS persistence mode: ${sanitizeBackendConfigDiagnosticValue(
            "persistenceMode",
            requestedMode,
          )}`,
          severity: "error",
        },
      ],
      mode: "memory",
    };
  }

  return {
    diagnostics: [],
    mode: "memory",
  };
};

const sanitizeAdapterLabel = (mode: CampaignOsPersistenceMode, localDataDir?: string) => {
  if (mode === "memory") {
    return "memory";
  }

  if (!localDataDir) {
    return "local_json";
  }

  const trimmedPath = localDataDir.replace(/\/+$/, "");
  const lastSegment = trimmedPath.split(/[\\/]/).filter(Boolean).pop();

  return lastSegment ? `local_json:${lastSegment}` : "local_json";
};

const resolvePort = (
  explicitPort: number | undefined,
  envPort: string | undefined,
): number => {
  if (explicitPort !== undefined) {
    return explicitPort;
  }

  const parsedEnvPort = Number.parseInt(envPort ?? "", 10);

  return Number.isFinite(parsedEnvPort) && parsedEnvPort > 0 ? parsedEnvPort : DEFAULT_PORT;
};

const missingRequiredConfigKeys = (
  env: Record<string, string | undefined>,
  requiredConfigKeys: readonly string[],
): string[] => requiredConfigKeys.filter((key) => !env[key]);

const uniqueStrings = (values: readonly string[]): string[] => Array.from(new Set(values));

const queueRuntimeRequiredConfigKeys = uniqueStrings(
  queueRuntimeProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys),
);

const schedulerRuntimeRequiredConfigKeys = uniqueStrings(
  schedulerRuntimeProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys),
);

const backendProductionReadinessRequiredConfigKeys = uniqueStrings([
  ...productionBackendRequiredConfigKeys,
  ...schedulerRuntimeRequiredConfigKeys,
  ...queueRuntimeRequiredConfigKeys,
]);

const productionCapabilityDiagnostics = (): BackendConfigDiagnostic[] =>
  deferredProductionBackendCapabilities.map((capabilityId) => ({
    code: "PRODUCTION_CAPABILITY_DEFERRED",
    field: capabilityId,
    message:
      capabilityId === "worker_queue" || capabilityId === "scheduler"
        ? `Production capability '${capabilityId}' is deferred until queue runtime preconditions are configured.`
        : `Production capability '${capabilityId}' is deferred in Mission 168 backend scaffold.`,
    severity: "warning",
  }));

const productionCapabilityEnablementEnvKeys = {
  auth_session: "CAMPAIGN_OS_ENABLE_AUTH_SESSION",
  contract_writer: "CAMPAIGN_OS_ENABLE_CONTRACT_WRITER",
  migration_runner: "CAMPAIGN_OS_ENABLE_MIGRATION_RUNNER",
  object_storage_export: "CAMPAIGN_OS_ENABLE_OBJECT_STORAGE_EXPORT",
  production_database: "CAMPAIGN_OS_ENABLE_PRODUCTION_DATABASE",
  provider_adapters: "CAMPAIGN_OS_ENABLE_PROVIDER_ADAPTERS",
  reward_custody: "CAMPAIGN_OS_ENABLE_REWARD_CUSTODY",
  reward_distribution: "CAMPAIGN_OS_ENABLE_REWARD_DISTRIBUTION",
  scheduler: "CAMPAIGN_OS_ENABLE_SCHEDULER",
  worker_queue: "CAMPAIGN_OS_ENABLE_WORKER_QUEUE",
} as const satisfies Partial<Record<(typeof deferredProductionBackendCapabilities)[number], string>>;

const isEnabledFlag = (value: string | undefined) => value?.toLowerCase() === "true" || value === "1";

const sanitizeProductionPersistenceDriverId = (value: string | undefined): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return /^[a-z0-9-]+$/i.test(value) ? value : REDACTED_VALUE;
};

const blockedProductionCapabilityEnablementDiagnostics = (
  env: Record<string, string | undefined>,
): BackendConfigDiagnostic[] =>
  Object.entries(productionCapabilityEnablementEnvKeys)
    .filter(([, envKey]) => isEnabledFlag(env[envKey]))
    .map(([capabilityId, envKey]) => ({
      code: "PRODUCTION_CAPABILITY_ENABLEMENT_BLOCKED",
      field: envKey,
      message: `Production capability '${capabilityId}' cannot be enabled by Mission 168 backend scaffold.`,
      severity: "error",
    }));

const missingProductionConfigDiagnostics = (
  missingConfigKeys: readonly string[],
): BackendConfigDiagnostic[] =>
  missingConfigKeys.map((key) => ({
    code: "MISSING_PRODUCTION_CONFIG",
    field: key,
    message: `Required production config '${key}' is not configured.`,
    severity: "error",
  }));

export const resolveBackendConfigContract = ({
  env = typeof process === "undefined" ? {} : process.env,
  host = env.CAMPAIGN_OS_API_HOST ?? DEFAULT_HOST,
  persistence = {},
  port,
  profileId,
  version,
}: BackendConfigContractOptions = {}): BackendConfigContract => {
  const requestedProfileId = profileId ?? env.CAMPAIGN_OS_BACKEND_PROFILE ?? DEFAULT_BACKEND_RUNTIME_PROFILE_ID;
  const profileResolution = resolveBackendRuntimeProfile(requestedProfileId);
  const requestedPersistenceMode = persistence.mode ?? env.CAMPAIGN_OS_PERSISTENCE_MODE;
  const persistenceModeResolution = resolveBackendPersistenceMode(requestedPersistenceMode);
  const profile = profileResolution.profile;
  const missingConfigKeys =
    profile.id === "production-required"
      ? missingRequiredConfigKeys(env, backendProductionReadinessRequiredConfigKeys)
      : [];
  const deferredDiagnostics =
    profile.id === "local-review" || profile.id === "staging-scaffold"
      ? productionCapabilityDiagnostics()
      : [];
  const blockedEnablementDiagnostics =
    profile.id === "local-review" || profile.id === "staging-scaffold"
      ? blockedProductionCapabilityEnablementDiagnostics(env)
      : [];
  const diagnostics: BackendConfigDiagnostic[] = [
    ...profileResolution.diagnostics.map<BackendConfigDiagnostic>((diagnostic) => ({
      code: "UNKNOWN_BACKEND_PROFILE",
      field: diagnostic.field,
      message: diagnostic.message,
      severity: diagnostic.severity,
    })),
    ...persistenceModeResolution.diagnostics,
    ...missingProductionConfigDiagnostics(missingConfigKeys),
    ...blockedEnablementDiagnostics,
    ...deferredDiagnostics,
  ];
  const blockingIssueCount = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
  const status: BackendConfigContractStatus =
    blockingIssueCount > 0 ? "blocked" : profile.status === "ready" ? "ready" : "scaffold";

  return {
    diagnostics,
    host,
    persistenceDirectory:
      persistenceModeResolution.mode === "local_json"
        ? persistence.localDataDir ?? env.CAMPAIGN_OS_PERSISTENCE_DIR
        : undefined,
    persistenceMode: persistenceModeResolution.mode,
    productionPersistence: {
      liveMigrationApproval: isEnabledFlag(env.CAMPAIGN_OS_APPROVE_LIVE_MIGRATIONS),
      requestedDriverId: sanitizeProductionPersistenceDriverId(
        persistence.productionDriverId ?? env.CAMPAIGN_OS_PERSISTENCE_DRIVER,
      ),
    },
    port: resolvePort(port, env.CAMPAIGN_OS_API_PORT),
    productionReadiness: {
      deferredCapabilities: [...profile.deferredCapabilities],
      missingConfigKeys,
      requiredConfigKeys:
        profile.id === "production-required"
          ? backendProductionReadinessRequiredConfigKeys
          : backendProductionReadinessRequiredConfigKeys,
      status,
    },
    profile,
    profileId: profile.id,
    requestedProfileId,
    valid: blockingIssueCount === 0 && profileResolution.valid,
    version: version ?? env.CAMPAIGN_OS_API_VERSION ?? DEFAULT_VERSION,
  };
};

export const resolveCampaignOsRuntimeConfig = ({
  env = typeof process === "undefined" ? {} : process.env,
  persistence = {},
  version,
}: CampaignOsRuntimeConfigOptions = {}): CampaignOsRuntimeConfig => {
  const explicitMode = persistence.mode ?? env.CAMPAIGN_OS_PERSISTENCE_MODE;
  const mode = resolvePersistenceMode(explicitMode, explicitMode);
  const localDataDir = persistence.localDataDir ?? env.CAMPAIGN_OS_PERSISTENCE_DIR;
  const adapterLabel = persistence.adapterLabel ?? sanitizeAdapterLabel(mode, localDataDir);

  return {
    persistence: {
      adapterLabel,
      localDataDir: mode === "local_json" ? localDataDir : undefined,
      mode,
    },
    version: version ?? env.CAMPAIGN_OS_API_VERSION ?? DEFAULT_VERSION,
  };
};
