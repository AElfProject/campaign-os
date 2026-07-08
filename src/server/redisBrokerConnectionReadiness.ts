import type { BackendRuntimeProfileId } from "./backendProfiles";

export type RedisBrokerConnectionProfileId = BackendRuntimeProfileId;
export type RedisBrokerConnectionStatus = "local_ready" | "scaffolded" | "blocked";
export type RedisBrokerConnectionMode = "dry_run" | "metadata_only" | "production_required";
export type RedisBrokerProviderKind = "redis-compatible";
export type RedisBrokerEndpointReferenceStatus = "not_configured" | "reference_only" | "blocked";
export type RedisBrokerCredentialReferenceStatus = "not_configured" | "reference_only" | "blocked";
export type RedisBrokerTlsPolicyStatus = "not_configured" | "required" | "validated_reference";
export type RedisBrokerDatabaseSelectionStatus = "not_configured" | "reference_only" | "blocked";
export type RedisBrokerPolicyStatus = "not_configured" | "configured" | "blocked";
export type RedisBrokerHandoffStatus = "not_configured" | "reference_only" | "deferred";
export type RedisBrokerHealthCheckMode = "disabled" | "metadata_only" | "activation_required";
export type RedisBrokerHealthStatus = "local_ok" | "metadata_only" | "blocked";
export type RedisBrokerConnectionDiagnosticSeverity = "error" | "warning" | "info";
export type RedisBrokerConnectionDiagnosticCode =
  | "UNKNOWN_REDIS_BROKER_CONNECTION_PROFILE"
  | "UNKNOWN_REDIS_BROKER_CONNECTION_MODE"
  | "UNKNOWN_REDIS_BROKER_PROVIDER_KIND"
  | "REDIS_BROKER_ENDPOINT_REFERENCE_MISSING"
  | "REDIS_BROKER_CREDENTIALS_REFERENCE_MISSING"
  | "REDIS_BROKER_TLS_POLICY_MISSING"
  | "REDIS_BROKER_DATABASE_SELECTION_MISSING"
  | "REDIS_BROKER_TIMEOUT_POLICY_MISSING"
  | "REDIS_BROKER_RETRY_BACKOFF_POLICY_MISSING"
  | "REDIS_BROKER_CIRCUIT_BREAKER_POLICY_MISSING"
  | "REDIS_BROKER_OBSERVABILITY_HANDOFF_MISSING"
  | "REDIS_BROKER_RUNBOOK_MISSING"
  | "REDIS_BROKER_HEALTH_CHECK_ENABLEMENT_MISSING"
  | "REDIS_BROKER_HEALTH_CHECK_ADAPTER_FAILED"
  | "REDIS_BROKER_HEALTH_CHECK_LIVE_ATTEMPT_BLOCKED"
  | "UNSAFE_REDIS_BROKER_CONNECTION_CONFIG";
export type RedisBrokerConnectionPreconditionArea =
  | "activation"
  | "circuit_breaker"
  | "credentials"
  | "database"
  | "endpoint"
  | "observability"
  | "retry"
  | "runbook"
  | "timeout"
  | "tls";

export interface RedisBrokerConnectionNoLiveFlags {
  browserBundleAllowed: false;
  liveBrokerConnectionAttempted: false;
  liveBrokerHealthCheckAttempted: false;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  queueClientConstructed: false;
  queueEventsConstructed: false;
  sdkClientConstructed: false;
  workerConstructed: false;
}

export interface RedisBrokerConnectionProductionPrecondition {
  area: RedisBrokerConnectionPreconditionArea;
  diagnosticCode: RedisBrokerConnectionDiagnosticCode;
  field: string;
  id: string;
  message: string;
  requiredBeforeProduction: true;
  requiredConfigKeys: string[];
  status: "blocked" | "deferred";
}

export interface RedisBrokerConnectionDiagnostic {
  code: RedisBrokerConnectionDiagnosticCode;
  field: string;
  message: string;
  severity: RedisBrokerConnectionDiagnosticSeverity;
}

export interface RedisBrokerHealthCheckRequest {
  connectionId: string;
  healthCheckMode: RedisBrokerHealthCheckMode;
  mode: RedisBrokerConnectionMode;
  packageBindingId: string;
  profileId: RedisBrokerConnectionProfileId;
  providerKind: RedisBrokerProviderKind;
  requiredConfigKeys: string[];
}

export interface RedisBrokerHealthCheckAdapterResult {
  adapterId: string;
  checkedAt?: string;
  liveBrokerHealthCheckAttempted: false;
  metadataOnly: true;
  networkCallAttempted: false;
  productionReady: false;
}

export interface RedisBrokerHealthCheckAdapter {
  adapterId: string;
  check: (request: RedisBrokerHealthCheckRequest) => RedisBrokerHealthCheckAdapterResult;
  mode: "metadata_only";
}

export interface RedisBrokerConnectionHealthCheck {
  adapterId: string;
  checkedAt: string;
  healthCheckMode: RedisBrokerHealthCheckMode;
  liveBrokerHealthCheckAttempted: false;
  metadataOnly: true;
  networkCallAttempted: false;
  productionReady: false;
  status: RedisBrokerHealthStatus;
}

export interface RedisBrokerConnectionReadinessProjection {
  blockerCount: number;
  browserBundleAllowed: false;
  circuitBreakerPolicyStatus: RedisBrokerPolicyStatus;
  connectionId: string;
  credentialReferenceStatus: RedisBrokerCredentialReferenceStatus;
  databaseSelectionStatus: RedisBrokerDatabaseSelectionStatus;
  diagnosticCodes: RedisBrokerConnectionDiagnosticCode[];
  endpointReferenceStatus: RedisBrokerEndpointReferenceStatus;
  healthCheckMode: RedisBrokerHealthCheckMode;
  liveBrokerConnectionAttempted: false;
  liveBrokerHealthCheckAttempted: false;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode: RedisBrokerConnectionMode;
  observabilityHandoffStatus: RedisBrokerHandoffStatus;
  operatorRunbookStatus: RedisBrokerHandoffStatus;
  packageBindingId: string;
  productionReady: false;
  providerKind: RedisBrokerProviderKind;
  queueClientConstructed: false;
  queueEventsConstructed: false;
  requiredConfigKeys: string[];
  retryBackoffPolicyStatus: RedisBrokerPolicyStatus;
  sdkClientConstructed: false;
  status: RedisBrokerConnectionStatus;
  timeoutPolicyStatus: RedisBrokerPolicyStatus;
  tlsPolicyStatus: RedisBrokerTlsPolicyStatus;
  valid: boolean;
  workerConstructed: false;
}

export interface RedisBrokerConnectionReadinessRegistration {
  circuitBreakerPolicyStatus: RedisBrokerPolicyStatus;
  connectionId: string;
  credentialReferenceStatus: RedisBrokerCredentialReferenceStatus;
  databaseSelectionStatus: RedisBrokerDatabaseSelectionStatus;
  endpointReferenceStatus: RedisBrokerEndpointReferenceStatus;
  healthCheck: RedisBrokerConnectionHealthCheck;
  healthCheckMode: RedisBrokerHealthCheckMode;
  mode: RedisBrokerConnectionMode;
  observabilityHandoffStatus: RedisBrokerHandoffStatus;
  operatorRunbookStatus: RedisBrokerHandoffStatus;
  packageBindingId: string;
  providerKind: RedisBrokerProviderKind;
  requiredConfigKeys: string[];
  retryBackoffPolicyStatus: RedisBrokerPolicyStatus;
  status: RedisBrokerConnectionStatus;
  timeoutPolicyStatus: RedisBrokerPolicyStatus;
  tlsPolicyStatus: RedisBrokerTlsPolicyStatus;
}

export interface RedisBrokerConnectionReadinessSummary extends RedisBrokerConnectionReadinessRegistration {
  blockerCount: number;
  browserBundleAllowed: false;
  diagnosticCodes: RedisBrokerConnectionDiagnosticCode[];
  diagnostics: RedisBrokerConnectionDiagnostic[];
  id: "campaign-os-redis-broker-connection-readiness";
  liveBrokerConnectionAttempted: false;
  liveBrokerHealthCheckAttempted: false;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  noLiveFlags: RedisBrokerConnectionNoLiveFlags;
  preconditions: RedisBrokerConnectionProductionPrecondition[];
  productionReady: false;
  profileId: RedisBrokerConnectionProfileId;
  queueClientConstructed: false;
  queueEventsConstructed: false;
  readiness: RedisBrokerConnectionReadinessProjection;
  sdkClientConstructed: false;
  valid: boolean;
  workerConstructed: false;
}

export interface CreateRedisBrokerConnectionReadinessOptions {
  connectionId?: string;
  env?: Record<string, unknown>;
  healthCheckAdapter?: RedisBrokerHealthCheckAdapter;
  mode?: string;
  packageBindingId?: string;
  profileId?: string;
  providerKind?: string;
}

const FOUNDATION_ID = "campaign-os-redis-broker-connection-readiness" as const;
const HEALTH_CHECK_TIMESTAMP = "2026-07-08T04:00:00Z";
const REDACTED_VALUE = "[redacted]";
const RAW_BROKER_PAYLOAD_VALUE = "[redacted-redis-broker-payload]";
const LOCAL_CONNECTION_ID = "redis-broker-connection-local";
const STAGING_CONNECTION_ID = "redis-broker-connection-staging";
const PRODUCTION_CONNECTION_ID = "redis-broker-connection-production";
const LOCAL_PACKAGE_BINDING_ID = "bullmq-redis-package-binding-local";
const STAGING_PACKAGE_BINDING_ID = "bullmq-redis-package-binding-staging";
const PRODUCTION_PACKAGE_BINDING_ID = "bullmq-redis-package-binding-production";
const APPROVED_PROVIDER_KIND = "redis-compatible" as const;

export const SUPPORTED_REDIS_BROKER_CONNECTION_PROFILES: RedisBrokerConnectionProfileId[] = [
  "local-review",
  "staging-scaffold",
  "production-required",
];

export const redisBrokerConnectionNoLiveFlags: RedisBrokerConnectionNoLiveFlags = {
  browserBundleAllowed: false,
  liveBrokerConnectionAttempted: false,
  liveBrokerHealthCheckAttempted: false,
  liveQueuePublishingEnabled: false,
  liveWorkerExecutionEnabled: false,
  queueClientConstructed: false,
  queueEventsConstructed: false,
  sdkClientConstructed: false,
  workerConstructed: false,
};

export const redisBrokerConnectionProductionPreconditions: RedisBrokerConnectionProductionPrecondition[] = [
  precondition("endpoint", "REDIS_BROKER_ENDPOINT_REFERENCE_MISSING", "CAMPAIGN_OS_REDIS_URL", "redis-broker-endpoint-reference", "Redis endpoint reference is required before broker connection readiness can advance."),
  precondition("credentials", "REDIS_BROKER_CREDENTIALS_REFERENCE_MISSING", "CAMPAIGN_OS_REDIS_CREDENTIALS", "redis-broker-credentials-reference", "Redis credential reference is required before broker connection readiness can advance."),
  precondition("tls", "REDIS_BROKER_TLS_POLICY_MISSING", "CAMPAIGN_OS_REDIS_TLS_POLICY", "redis-broker-tls-policy", "Redis TLS policy reference is required before broker health-check activation."),
  precondition("database", "REDIS_BROKER_DATABASE_SELECTION_MISSING", "CAMPAIGN_OS_REDIS_DATABASE", "redis-broker-database-selection", "Redis database selection reference is required before broker health-check activation."),
  precondition("timeout", "REDIS_BROKER_TIMEOUT_POLICY_MISSING", "CAMPAIGN_OS_REDIS_CONNECTION_TIMEOUT_MS", "redis-broker-timeout-policy", "Redis connection timeout policy is required before broker health-check activation."),
  precondition("retry", "REDIS_BROKER_RETRY_BACKOFF_POLICY_MISSING", "CAMPAIGN_OS_REDIS_RETRY_BACKOFF_POLICY", "redis-broker-retry-backoff-policy", "Redis retry/backoff policy is required before broker health-check activation."),
  precondition("circuit_breaker", "REDIS_BROKER_CIRCUIT_BREAKER_POLICY_MISSING", "CAMPAIGN_OS_REDIS_CIRCUIT_BREAKER_POLICY", "redis-broker-circuit-breaker-policy", "Redis circuit-breaker policy is required before broker health-check activation."),
  precondition("observability", "REDIS_BROKER_OBSERVABILITY_HANDOFF_MISSING", "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL", "redis-broker-observability-handoff", "Observability exporter handoff is required before broker health-check activation.", undefined, "deferred"),
  precondition("runbook", "REDIS_BROKER_RUNBOOK_MISSING", "CAMPAIGN_OS_OPERATOR_RUNBOOK_URL", "redis-broker-operator-runbook", "Operator runbook reference is required before broker health-check activation.", undefined, "deferred"),
  precondition("activation", "REDIS_BROKER_HEALTH_CHECK_ENABLEMENT_MISSING", "CAMPAIGN_OS_REDIS_BROKER_HEALTH_CHECK_ENABLEMENT", "redis-broker-health-check-enable-gate", "Explicit broker health-check enablement is required before broker health-check activation."),
];

export const metadataOnlyRedisBrokerHealthCheckAdapter: RedisBrokerHealthCheckAdapter = {
  adapterId: "metadata-only-redis-broker-health-check",
  check: () => ({
    adapterId: "metadata-only-redis-broker-health-check",
    checkedAt: HEALTH_CHECK_TIMESTAMP,
    liveBrokerHealthCheckAttempted: false,
    metadataOnly: true,
    networkCallAttempted: false,
    productionReady: false,
  }),
  mode: "metadata_only",
};

export const createRedisBrokerConnectionReadiness = (
  options: CreateRedisBrokerConnectionReadinessOptions = {},
): RedisBrokerConnectionReadinessSummary => {
  const env = options.env ?? {};
  const profileResolution = resolveProfile(options.profileId);
  const modeResolution = resolveMode(profileResolution.profileId, options.mode);
  const providerKindResolution = resolveProviderKind(options.providerKind, env);
  const connectionResolution = resolveConnectionId(options.connectionId, env, profileResolution.profileId);
  const packageBindingResolution = resolvePackageBindingId(options.packageBindingId, env, profileResolution.profileId);
  const productionDiagnostics =
    profileResolution.profileId === "production-required" ? createProductionDiagnostics(env) : [];
  const unsafeDiagnostics = createUnsafeConfigDiagnostics(env);
  const baseDiagnostics = [
    ...profileResolution.diagnostics,
    ...modeResolution.diagnostics,
    ...providerKindResolution.diagnostics,
    ...connectionResolution.diagnostics,
    ...packageBindingResolution.diagnostics,
    ...unsafeDiagnostics,
    ...productionDiagnostics,
  ];
  const healthCheckMode = resolveHealthCheckMode(profileResolution.profileId, env, baseDiagnostics);
  const healthAdapterResolution = resolveHealthCheckAdapter({
    adapter: options.healthCheckAdapter ?? metadataOnlyRedisBrokerHealthCheckAdapter,
    connectionId: connectionResolution.connectionId,
    healthCheckMode,
    mode: modeResolution.mode,
    packageBindingId: packageBindingResolution.packageBindingId,
    profileId: profileResolution.profileId,
    providerKind: providerKindResolution.providerKind,
  });
  const diagnostics = [...baseDiagnostics, ...healthAdapterResolution.diagnostics];
  const blockerCount = diagnostics.filter((item) => item.severity === "error").length;
  const status = resolveStatus(profileResolution.profileId, blockerCount);
  const valid = profileResolution.valid
    && modeResolution.valid
    && providerKindResolution.valid
    && connectionResolution.valid
    && packageBindingResolution.valid
    && blockerCount === 0;
  const postures = createPostures(profileResolution.profileId, env);
  const healthCheck = createHealthCheck({
    adapterId: healthAdapterResolution.adapterId,
    healthCheckMode,
    status,
  });
  const registration = createRegistration({
    connectionId: connectionResolution.connectionId,
    healthCheck,
    healthCheckMode,
    mode: modeResolution.mode,
    packageBindingId: packageBindingResolution.packageBindingId,
    postures,
    providerKind: providerKindResolution.providerKind,
    status,
  });
  const readiness = createReadinessProjection({
    blockerCount,
    connectionId: connectionResolution.connectionId,
    diagnostics,
    healthCheckMode,
    mode: modeResolution.mode,
    packageBindingId: packageBindingResolution.packageBindingId,
    postures,
    providerKind: providerKindResolution.providerKind,
    status,
    valid,
  });

  return {
    ...registration,
    blockerCount,
    browserBundleAllowed: false,
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    id: FOUNDATION_ID,
    liveBrokerConnectionAttempted: false,
    liveBrokerHealthCheckAttempted: false,
    liveQueuePublishingEnabled: false,
    liveWorkerExecutionEnabled: false,
    noLiveFlags: redisBrokerConnectionNoLiveFlags,
    preconditions: redisBrokerConnectionProductionPreconditions.map((item) => ({ ...item })),
    productionReady: false,
    profileId: profileResolution.profileId,
    queueClientConstructed: false,
    queueEventsConstructed: false,
    readiness,
    sdkClientConstructed: false,
    valid,
    workerConstructed: false,
  };
};

export const getRedisBrokerConnectionReadinessRegistration = (
  connectionId: string = LOCAL_CONNECTION_ID,
): RedisBrokerConnectionReadinessRegistration | undefined => {
  const brokerConnectionId = sanitizeRedisBrokerConnectionString(connectionId);

  if (brokerConnectionId === LOCAL_CONNECTION_ID) {
    return createRegistration({
      connectionId: LOCAL_CONNECTION_ID,
      healthCheck: createHealthCheck({
        adapterId: metadataOnlyRedisBrokerHealthCheckAdapter.adapterId,
        healthCheckMode: "disabled",
        status: "local_ready",
      }),
      healthCheckMode: "disabled",
      mode: "dry_run",
      packageBindingId: LOCAL_PACKAGE_BINDING_ID,
      postures: createPostures("local-review", {}),
      providerKind: APPROVED_PROVIDER_KIND,
      status: "local_ready",
    });
  }

  if (brokerConnectionId === STAGING_CONNECTION_ID) {
    return createRegistration({
      connectionId: STAGING_CONNECTION_ID,
      healthCheck: createHealthCheck({
        adapterId: metadataOnlyRedisBrokerHealthCheckAdapter.adapterId,
        healthCheckMode: "metadata_only",
        status: "scaffolded",
      }),
      healthCheckMode: "metadata_only",
      mode: "metadata_only",
      packageBindingId: STAGING_PACKAGE_BINDING_ID,
      postures: createPostures("staging-scaffold", {}),
      providerKind: APPROVED_PROVIDER_KIND,
      status: "scaffolded",
    });
  }

  if (brokerConnectionId === PRODUCTION_CONNECTION_ID) {
    return createRegistration({
      connectionId: PRODUCTION_CONNECTION_ID,
      healthCheck: createHealthCheck({
        adapterId: metadataOnlyRedisBrokerHealthCheckAdapter.adapterId,
        healthCheckMode: "activation_required",
        status: "blocked",
      }),
      healthCheckMode: "activation_required",
      mode: "production_required",
      packageBindingId: PRODUCTION_PACKAGE_BINDING_ID,
      postures: createPostures("production-required", {}),
      providerKind: APPROVED_PROVIDER_KIND,
      status: "blocked",
    });
  }

  return undefined;
};

export const redactRedisBrokerConnectionValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => redactRedisBrokerConnectionValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (isSensitiveRedisBrokerConnectionKey(key)) {
          return [key, REDACTED_VALUE];
        }

        return [key, redactRedisBrokerConnectionValue(nestedValue)];
      }),
    );
  }

  if (typeof value !== "string") {
    return value;
  }

  if (isRawRedisBrokerPayload(value)) {
    return RAW_BROKER_PAYLOAD_VALUE;
  }

  if (isUnsafeRedisBrokerConnectionString(value)) {
    return REDACTED_VALUE;
  }

  return value;
};

function precondition(
  area: RedisBrokerConnectionPreconditionArea,
  diagnosticCode: RedisBrokerConnectionDiagnosticCode,
  field: string,
  id: string,
  message: string,
  requiredConfigKeys = [field],
  status: RedisBrokerConnectionProductionPrecondition["status"] = "blocked",
): RedisBrokerConnectionProductionPrecondition {
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

function createRegistration(input: {
  connectionId: string;
  healthCheck: RedisBrokerConnectionHealthCheck;
  healthCheckMode: RedisBrokerHealthCheckMode;
  mode: RedisBrokerConnectionMode;
  packageBindingId: string;
  postures: RedisBrokerConnectionPostures;
  providerKind: RedisBrokerProviderKind;
  status: RedisBrokerConnectionStatus;
}): RedisBrokerConnectionReadinessRegistration {
  return {
    circuitBreakerPolicyStatus: input.postures.circuitBreakerPolicyStatus,
    connectionId: input.connectionId,
    credentialReferenceStatus: input.postures.credentialReferenceStatus,
    databaseSelectionStatus: input.postures.databaseSelectionStatus,
    endpointReferenceStatus: input.postures.endpointReferenceStatus,
    healthCheck: input.healthCheck,
    healthCheckMode: input.healthCheckMode,
    mode: input.mode,
    observabilityHandoffStatus: input.postures.observabilityHandoffStatus,
    operatorRunbookStatus: input.postures.operatorRunbookStatus,
    packageBindingId: input.packageBindingId,
    providerKind: input.providerKind,
    requiredConfigKeys: getRequiredConfigKeys(),
    retryBackoffPolicyStatus: input.postures.retryBackoffPolicyStatus,
    status: input.status,
    timeoutPolicyStatus: input.postures.timeoutPolicyStatus,
    tlsPolicyStatus: input.postures.tlsPolicyStatus,
  };
}

function createReadinessProjection(input: {
  blockerCount: number;
  connectionId: string;
  diagnostics: readonly RedisBrokerConnectionDiagnostic[];
  healthCheckMode: RedisBrokerHealthCheckMode;
  mode: RedisBrokerConnectionMode;
  packageBindingId: string;
  postures: RedisBrokerConnectionPostures;
  providerKind: RedisBrokerProviderKind;
  status: RedisBrokerConnectionStatus;
  valid: boolean;
}): RedisBrokerConnectionReadinessProjection {
  return {
    blockerCount: input.blockerCount,
    browserBundleAllowed: false,
    circuitBreakerPolicyStatus: input.postures.circuitBreakerPolicyStatus,
    connectionId: input.connectionId,
    credentialReferenceStatus: input.postures.credentialReferenceStatus,
    databaseSelectionStatus: input.postures.databaseSelectionStatus,
    diagnosticCodes: input.diagnostics.map((item) => item.code),
    endpointReferenceStatus: input.postures.endpointReferenceStatus,
    healthCheckMode: input.healthCheckMode,
    liveBrokerConnectionAttempted: false,
    liveBrokerHealthCheckAttempted: false,
    liveQueuePublishingEnabled: false,
    liveWorkerExecutionEnabled: false,
    mode: input.mode,
    observabilityHandoffStatus: input.postures.observabilityHandoffStatus,
    operatorRunbookStatus: input.postures.operatorRunbookStatus,
    packageBindingId: input.packageBindingId,
    productionReady: false,
    providerKind: input.providerKind,
    queueClientConstructed: false,
    queueEventsConstructed: false,
    requiredConfigKeys: getRequiredConfigKeys(),
    retryBackoffPolicyStatus: input.postures.retryBackoffPolicyStatus,
    sdkClientConstructed: false,
    status: input.status,
    timeoutPolicyStatus: input.postures.timeoutPolicyStatus,
    tlsPolicyStatus: input.postures.tlsPolicyStatus,
    valid: input.valid,
    workerConstructed: false,
  };
}

function createHealthCheck(input: {
  adapterId: string;
  healthCheckMode: RedisBrokerHealthCheckMode;
  status: RedisBrokerConnectionStatus;
}): RedisBrokerConnectionHealthCheck {
  return {
    adapterId: input.adapterId,
    checkedAt: HEALTH_CHECK_TIMESTAMP,
    healthCheckMode: input.healthCheckMode,
    liveBrokerHealthCheckAttempted: false,
    metadataOnly: true,
    networkCallAttempted: false,
    productionReady: false,
    status: input.status === "local_ready" ? "local_ok" : input.status === "scaffolded" ? "metadata_only" : "blocked",
  };
}

function diagnostic(
  code: RedisBrokerConnectionDiagnosticCode,
  field: string,
  message: string,
  severity: RedisBrokerConnectionDiagnosticSeverity = "error",
): RedisBrokerConnectionDiagnostic {
  return {
    code,
    field,
    message,
    severity,
  };
}

function resolveProfile(
  requestedProfileId: string | undefined,
): { diagnostics: RedisBrokerConnectionDiagnostic[]; profileId: RedisBrokerConnectionProfileId; valid: boolean } {
  const profileId = requestedProfileId ?? "local-review";

  if (isRedisBrokerConnectionProfileId(profileId) && !isUnsafeRedisBrokerConnectionString(profileId)) {
    return {
      diagnostics: [],
      profileId,
      valid: true,
    };
  }

  return {
    diagnostics: [
      diagnostic(
        "UNKNOWN_REDIS_BROKER_CONNECTION_PROFILE",
        "profileId",
        `Unsupported Redis broker connection profile: ${sanitizeRedisBrokerConnectionString(profileId)}`,
      ),
    ],
    profileId: "production-required",
    valid: false,
  };
}

function resolveMode(
  profileId: RedisBrokerConnectionProfileId,
  requestedMode: string | undefined,
): { diagnostics: RedisBrokerConnectionDiagnostic[]; mode: RedisBrokerConnectionMode; valid: boolean } {
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

  if (isRedisBrokerConnectionMode(requestedMode) && !isUnsafeRedisBrokerConnectionString(requestedMode)) {
    return {
      diagnostics: [],
      mode: requestedMode,
      valid: true,
    };
  }

  return {
    diagnostics: [
      diagnostic(
        "UNKNOWN_REDIS_BROKER_CONNECTION_MODE",
        "mode",
        `Unsupported Redis broker connection mode: ${sanitizeRedisBrokerConnectionString(requestedMode)}`,
      ),
    ],
    mode: "production_required",
    valid: false,
  };
}

function resolveProviderKind(
  requestedProviderKind: string | undefined,
  env: Record<string, unknown>,
): { diagnostics: RedisBrokerConnectionDiagnostic[]; providerKind: RedisBrokerProviderKind; valid: boolean } {
  const envProviderKind = env.CAMPAIGN_OS_QUEUE_PROVIDER_KIND;
  const rawProviderKind =
    requestedProviderKind
    ?? (typeof envProviderKind === "string" && envProviderKind.trim().length > 0 ? envProviderKind : undefined)
    ?? APPROVED_PROVIDER_KIND;

  if (isUnsafeRedisBrokerConnectionString(rawProviderKind) || !isSafeLabel(rawProviderKind)) {
    return {
      diagnostics: [
        diagnostic("UNSAFE_REDIS_BROKER_CONNECTION_CONFIG", "providerKind", "Redis broker provider kind contains unsafe material."),
      ],
      providerKind: APPROVED_PROVIDER_KIND,
      valid: false,
    };
  }

  if (rawProviderKind !== APPROVED_PROVIDER_KIND) {
    return {
      diagnostics: [
        diagnostic(
          "UNKNOWN_REDIS_BROKER_PROVIDER_KIND",
          "providerKind",
          `Redis broker provider kind is not supported: ${sanitizeRedisBrokerConnectionString(rawProviderKind)}`,
        ),
      ],
      providerKind: APPROVED_PROVIDER_KIND,
      valid: false,
    };
  }

  return {
    diagnostics: [],
    providerKind: rawProviderKind,
    valid: true,
  };
}

function resolveConnectionId(
  requestedConnectionId: string | undefined,
  env: Record<string, unknown>,
  profileId: RedisBrokerConnectionProfileId,
): { connectionId: string; diagnostics: RedisBrokerConnectionDiagnostic[]; valid: boolean } {
  const envConnectionId = env.CAMPAIGN_OS_REDIS_BROKER_CONNECTION_ID;
  const rawConnectionId =
    requestedConnectionId
    ?? (typeof envConnectionId === "string" && envConnectionId.trim().length > 0 ? envConnectionId : undefined)
    ?? (profileId === "staging-scaffold"
      ? STAGING_CONNECTION_ID
      : profileId === "production-required"
        ? PRODUCTION_CONNECTION_ID
        : LOCAL_CONNECTION_ID);

  if (isUnsafeRedisBrokerConnectionString(rawConnectionId) || !isSafeLabel(rawConnectionId)) {
    return {
      connectionId: "blocked-redis-broker-connection",
      diagnostics: [
        diagnostic("UNSAFE_REDIS_BROKER_CONNECTION_CONFIG", "connectionId", "Redis broker connection id contains unsafe material."),
      ],
      valid: false,
    };
  }

  return {
    connectionId: rawConnectionId,
    diagnostics: [],
    valid: true,
  };
}

function resolvePackageBindingId(
  requestedPackageBindingId: string | undefined,
  env: Record<string, unknown>,
  profileId: RedisBrokerConnectionProfileId,
): { diagnostics: RedisBrokerConnectionDiagnostic[]; packageBindingId: string; valid: boolean } {
  const envPackageBindingId = env.CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING;
  const rawPackageBindingId =
    requestedPackageBindingId
    ?? (typeof envPackageBindingId === "string" && envPackageBindingId.trim().length > 0
      ? envPackageBindingId
      : undefined)
    ?? (profileId === "staging-scaffold"
      ? STAGING_PACKAGE_BINDING_ID
      : profileId === "production-required"
        ? PRODUCTION_PACKAGE_BINDING_ID
        : LOCAL_PACKAGE_BINDING_ID);

  if (isUnsafeRedisBrokerConnectionString(rawPackageBindingId) || !isSafeLabel(rawPackageBindingId)) {
    return {
      diagnostics: [
        diagnostic("UNSAFE_REDIS_BROKER_CONNECTION_CONFIG", "packageBindingId", "Redis broker package binding id contains unsafe material."),
      ],
      packageBindingId: "blocked-package-binding",
      valid: false,
    };
  }

  return {
    diagnostics: [],
    packageBindingId: rawPackageBindingId,
    valid: true,
  };
}

function createProductionDiagnostics(env: Record<string, unknown>): RedisBrokerConnectionDiagnostic[] {
  return redisBrokerConnectionProductionPreconditions
    .filter((item) => {
      if (item.diagnosticCode === "REDIS_BROKER_HEALTH_CHECK_ENABLEMENT_MISSING") {
        return !isBrokerHealthCheckEnabled(env);
      }

      return !hasConfiguredValue(env, item.requiredConfigKeys);
    })
    .map((item) => diagnostic(item.diagnosticCode, item.field, item.message));
}

function createUnsafeConfigDiagnostics(env: Record<string, unknown>): RedisBrokerConnectionDiagnostic[] {
  const unsafeFields = [
    "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
    "CAMPAIGN_OS_OPERATOR_RUNBOOK_URL",
    "CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING",
    "CAMPAIGN_OS_REDIS_BROKER_CONNECTION_ID",
    "CAMPAIGN_OS_REDIS_BROKER_HEALTH_CHECK_ENABLEMENT",
    "CAMPAIGN_OS_REDIS_CIRCUIT_BREAKER_POLICY",
    "CAMPAIGN_OS_REDIS_CONNECTION_TIMEOUT_MS",
    "CAMPAIGN_OS_REDIS_CREDENTIALS",
    "CAMPAIGN_OS_REDIS_DATABASE",
    "CAMPAIGN_OS_REDIS_RETRY_BACKOFF_POLICY",
    "CAMPAIGN_OS_REDIS_TLS_POLICY",
    "CAMPAIGN_OS_REDIS_URL",
  ];

  return unsafeFields
    .filter((field) => {
      const value = env[field];

      return typeof value === "string" && isUnsafeRedisBrokerConnectionString(value);
    })
    .map((field) => diagnostic("UNSAFE_REDIS_BROKER_CONNECTION_CONFIG", field, "Redis broker readiness config contains unsafe material."));
}

function resolveHealthCheckAdapter(input: {
  adapter: RedisBrokerHealthCheckAdapter;
  connectionId: string;
  healthCheckMode: RedisBrokerHealthCheckMode;
  mode: RedisBrokerConnectionMode;
  packageBindingId: string;
  profileId: RedisBrokerConnectionProfileId;
  providerKind: RedisBrokerProviderKind;
}): { adapterId: string; diagnostics: RedisBrokerConnectionDiagnostic[] } {
  try {
    const result = input.adapter.check({
      connectionId: input.connectionId,
      healthCheckMode: input.healthCheckMode,
      mode: input.mode,
      packageBindingId: input.packageBindingId,
      profileId: input.profileId,
      providerKind: input.providerKind,
      requiredConfigKeys: getRequiredConfigKeys(),
    });
    const attemptedLiveHealthCheck = result.liveBrokerHealthCheckAttempted !== false
      || result.networkCallAttempted !== false
      || result.productionReady !== false;

    return {
      adapterId: resolveSafeAdapterId(result.adapterId || input.adapter.adapterId),
      diagnostics: attemptedLiveHealthCheck
        ? [
          diagnostic(
            "REDIS_BROKER_HEALTH_CHECK_LIVE_ATTEMPT_BLOCKED",
            "healthCheckAdapter",
            "Redis broker health-check adapter attempted live behavior during metadata-only readiness.",
          ),
        ]
        : [],
    };
  } catch {
    return {
      adapterId: resolveSafeAdapterId(input.adapter.adapterId),
      diagnostics: [
        diagnostic(
          "REDIS_BROKER_HEALTH_CHECK_ADAPTER_FAILED",
          "healthCheckAdapter",
          "Redis broker health-check adapter failed before live readiness could be established.",
        ),
      ],
    };
  }
}

function resolveSafeAdapterId(adapterId: string): string {
  if (isUnsafeRedisBrokerConnectionString(adapterId) || !isSafeLabel(adapterId)) {
    return "blocked-health-check-adapter";
  }

  return adapterId;
}

function resolveStatus(
  profileId: RedisBrokerConnectionProfileId,
  blockerCount: number,
): RedisBrokerConnectionStatus {
  if (blockerCount > 0) {
    return "blocked";
  }

  return profileId === "local-review" ? "local_ready" : "scaffolded";
}

function resolveHealthCheckMode(
  profileId: RedisBrokerConnectionProfileId,
  env: Record<string, unknown>,
  diagnostics: readonly RedisBrokerConnectionDiagnostic[],
): RedisBrokerHealthCheckMode {
  if (profileId === "local-review") {
    return "disabled";
  }

  if (profileId === "staging-scaffold") {
    return "metadata_only";
  }

  return diagnostics.length === 0 && isBrokerHealthCheckEnabled(env) ? "metadata_only" : "activation_required";
}

interface RedisBrokerConnectionPostures {
  circuitBreakerPolicyStatus: RedisBrokerPolicyStatus;
  credentialReferenceStatus: RedisBrokerCredentialReferenceStatus;
  databaseSelectionStatus: RedisBrokerDatabaseSelectionStatus;
  endpointReferenceStatus: RedisBrokerEndpointReferenceStatus;
  observabilityHandoffStatus: RedisBrokerHandoffStatus;
  operatorRunbookStatus: RedisBrokerHandoffStatus;
  retryBackoffPolicyStatus: RedisBrokerPolicyStatus;
  timeoutPolicyStatus: RedisBrokerPolicyStatus;
  tlsPolicyStatus: RedisBrokerTlsPolicyStatus;
}

function createPostures(
  profileId: RedisBrokerConnectionProfileId,
  env: Record<string, unknown>,
): RedisBrokerConnectionPostures {
  return {
    circuitBreakerPolicyStatus: resolvePolicyStatus(profileId, env, ["CAMPAIGN_OS_REDIS_CIRCUIT_BREAKER_POLICY"]),
    credentialReferenceStatus: resolveReferenceStatus(profileId, env, ["CAMPAIGN_OS_REDIS_CREDENTIALS"]),
    databaseSelectionStatus: resolveReferenceStatus(profileId, env, ["CAMPAIGN_OS_REDIS_DATABASE"]),
    endpointReferenceStatus: resolveReferenceStatus(profileId, env, ["CAMPAIGN_OS_REDIS_URL"]),
    observabilityHandoffStatus: resolveHandoffStatus(profileId, env, ["CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL"]),
    operatorRunbookStatus: resolveHandoffStatus(profileId, env, ["CAMPAIGN_OS_OPERATOR_RUNBOOK_URL"]),
    retryBackoffPolicyStatus: resolvePolicyStatus(profileId, env, ["CAMPAIGN_OS_REDIS_RETRY_BACKOFF_POLICY"]),
    timeoutPolicyStatus: resolvePolicyStatus(profileId, env, ["CAMPAIGN_OS_REDIS_CONNECTION_TIMEOUT_MS"]),
    tlsPolicyStatus: hasConfiguredValue(env, ["CAMPAIGN_OS_REDIS_TLS_POLICY"])
      ? "validated_reference"
      : profileId === "production-required"
        ? "required"
        : "not_configured",
  };
}

function resolveReferenceStatus(
  profileId: RedisBrokerConnectionProfileId,
  env: Record<string, unknown>,
  keys: readonly string[],
): RedisBrokerEndpointReferenceStatus {
  if (hasConfiguredValue(env, keys)) {
    return "reference_only";
  }

  return profileId === "production-required" ? "blocked" : "not_configured";
}

function resolvePolicyStatus(
  profileId: RedisBrokerConnectionProfileId,
  env: Record<string, unknown>,
  keys: readonly string[],
): RedisBrokerPolicyStatus {
  if (hasConfiguredValue(env, keys)) {
    return "configured";
  }

  return profileId === "production-required" ? "blocked" : "not_configured";
}

function resolveHandoffStatus(
  profileId: RedisBrokerConnectionProfileId,
  env: Record<string, unknown>,
  keys: readonly string[],
): RedisBrokerHandoffStatus {
  if (hasConfiguredValue(env, keys)) {
    return "reference_only";
  }

  return profileId === "production-required" ? "deferred" : "not_configured";
}

function hasConfiguredValue(env: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.every((key) => {
    const value = env[key];

    if (typeof value === "string") {
      return value.trim().length > 0 && !isUnsafeRedisBrokerConnectionString(value);
    }

    return value !== undefined && value !== null;
  });
}

function isBrokerHealthCheckEnabled(env: Record<string, unknown>): boolean {
  const value = env.CAMPAIGN_OS_REDIS_BROKER_HEALTH_CHECK_ENABLEMENT;

  return typeof value === "string" && value.trim() === "explicitly-enabled";
}

function isRedisBrokerConnectionProfileId(value: string): value is RedisBrokerConnectionProfileId {
  return SUPPORTED_REDIS_BROKER_CONNECTION_PROFILES.includes(value as RedisBrokerConnectionProfileId);
}

function isRedisBrokerConnectionMode(value: string): value is RedisBrokerConnectionMode {
  return value === "dry_run" || value === "metadata_only" || value === "production_required";
}

function getRequiredConfigKeys(): string[] {
  return [
    ...new Set(redisBrokerConnectionProductionPreconditions.flatMap((item) => item.requiredConfigKeys)),
  ];
}

function sanitizeRedisBrokerConnectionString(value: string): string {
  const redacted = redactRedisBrokerConnectionValue(value);

  return typeof redacted === "string" ? redacted : REDACTED_VALUE;
}

function isSafeLabel(value: string): boolean {
  return /^[a-z][a-z0-9-]{2,95}$/i.test(value);
}

function isSensitiveRedisBrokerConnectionKey(key: string): boolean {
  return /api[-_]?key|bearer|credential|idempotency[-_]?key|lease[-_]?token|object[-_]?key|password|payload|private[-_]?key|provider[-_]?response|queue[-_]?url|redis[-_]?url|secret|signed[-_]?url|token|webhook|wallet/i.test(
    key,
  );
}

function isUnsafeRedisBrokerConnectionString(value: string): boolean {
  return isCredentialedUrl(value)
    || isLikelyObjectKey(value)
    || isSensitiveRedisBrokerConnectionString(value)
    || isWalletAddressString(value)
    || isRawRedisBrokerPayload(value);
}

function isSensitiveRedisBrokerConnectionString(value: string): boolean {
  return /(api[-_]?key|bearer\s+|hook[-_]?secret|idempotency[-_]?key|lease[-_]?token|password=|private[-_]?key|provider[-_]?secret|queue[-_]?secret|secret|token=|worker[-_]?token|x-amz-signature=|signed-url|webhook[-_]?secret)/i.test(
    value,
  );
}

function isCredentialedUrl(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s:@]+@/i.test(value);
}

function isLikelyObjectKey(value: string): boolean {
  return /\b(s3|gs|oss):\/\/[^\s]+/i.test(value) || /\b[A-Z0-9]{20,}\/[A-Za-z0-9/_=-]{20,}/.test(value);
}

function isWalletAddressString(value: string): boolean {
  return /\bELF_[A-Za-z0-9_]{8,}\b/.test(value) || /\b0x[a-fA-F0-9]{40}\b/.test(value);
}

function isRawRedisBrokerPayload(value: string): boolean {
  const trimmed = value.trim();

  return (trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"));
}
