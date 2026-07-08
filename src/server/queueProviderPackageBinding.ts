import type { BackendRuntimeProfileId } from "./backendProfiles";
import {
  createRedisBrokerConnectionReadiness,
  type RedisBrokerConnectionDiagnosticCode,
  type RedisBrokerConnectionMode,
  type RedisBrokerConnectionStatus,
  type RedisBrokerCredentialReferenceStatus,
  type RedisBrokerDatabaseSelectionStatus,
  type RedisBrokerEndpointReferenceStatus,
  type RedisBrokerHealthCheckMode,
  type RedisBrokerHandoffStatus,
  type RedisBrokerPolicyStatus,
  type RedisBrokerProviderKind,
  type RedisBrokerTlsPolicyStatus,
} from "./redisBrokerConnectionReadiness";

export type QueueProviderPackageBindingProfileId = BackendRuntimeProfileId;
export type QueueProviderPackageBindingStatus = "local_ready" | "scaffolded" | "blocked";
export type QueueProviderPackageBindingMode = "dry_run" | "metadata_only" | "production_required";
export type QueueProviderPackageFamily = "bullmq-redis-compatible";
export type QueueProviderPackageProviderKind = "redis-compatible";
export type QueueProviderPackageImportPosture =
  | "declared_dependency_metadata"
  | "metadata_only_no_import"
  | "runtime_import_blocked";
export type QueueProviderBrokerConnectionPosture =
  | "not_configured"
  | "reference_only"
  | "blocked_until_activation";
export type QueueProviderPackageDiagnosticSeverity = "error" | "warning" | "info";
export type QueueProviderPackageDiagnosticCode =
  | "UNKNOWN_QUEUE_PROVIDER_PACKAGE_BINDING_PROFILE"
  | "UNKNOWN_QUEUE_PROVIDER_PACKAGE_BINDING_MODE"
  | "UNKNOWN_QUEUE_PROVIDER_PACKAGE_FAMILY"
  | "QUEUE_PROVIDER_PACKAGE_MISSING"
  | "QUEUE_PROVIDER_PACKAGE_UNSUPPORTED"
  | "QUEUE_PROVIDER_PACKAGE_BINDING_MISSING"
  | "QUEUE_PROVIDER_PACKAGE_PROVIDER_KIND_MISSING"
  | "QUEUE_PROVIDER_PACKAGE_REDIS_ENDPOINT_MISSING"
  | "QUEUE_PROVIDER_PACKAGE_CREDENTIALS_MISSING"
  | "QUEUE_PROVIDER_PACKAGE_WORKER_QUEUE_MISSING"
  | "QUEUE_PROVIDER_PACKAGE_DEAD_LETTER_QUEUE_MISSING"
  | "QUEUE_PROVIDER_PACKAGE_RETRY_POLICY_MISSING"
  | "QUEUE_PROVIDER_PACKAGE_IDEMPOTENCY_STORE_MISSING"
  | "QUEUE_PROVIDER_PACKAGE_WORKER_LEASE_MISSING"
  | "QUEUE_PROVIDER_PACKAGE_OBSERVABILITY_MISSING"
  | "QUEUE_PROVIDER_PACKAGE_RUNBOOK_MISSING"
  | "QUEUE_PROVIDER_PACKAGE_LIVE_ENABLEMENT_MISSING"
  | "UNSAFE_QUEUE_PROVIDER_PACKAGE_BINDING_CONFIG"
  | RedisBrokerConnectionDiagnosticCode;
export type QueueProviderPackagePreconditionArea =
  | "activation"
  | "binding"
  | "broker"
  | "credentials"
  | "dead_letter"
  | "idempotency"
  | "lease"
  | "observability"
  | "package"
  | "provider"
  | "queue"
  | "retry"
  | "runbook";
export type QueueProviderPackageHealthStatus = "local_ok" | "metadata_only" | "blocked";

export interface QueueProviderPackageNoLiveFlags {
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

export interface QueueProviderPackageDefinition {
  browserBundleAllowed: false;
  family: QueueProviderPackageFamily;
  importPosture: QueueProviderPackageImportPosture;
  packageName: "bullmq";
  packageRef: "npm:bullmq";
  providerKind: QueueProviderPackageProviderKind;
  redisCompatible: true;
  serverOnly: true;
}

export interface QueueProviderPackagePrecondition {
  area: QueueProviderPackagePreconditionArea;
  diagnosticCode: QueueProviderPackageDiagnosticCode;
  field: string;
  id: string;
  message: string;
  requiredBeforeProduction: true;
  requiredConfigKeys: string[];
  status: "blocked" | "deferred";
}

export interface QueueProviderPackageDiagnostic {
  code: QueueProviderPackageDiagnosticCode;
  field: string;
  message: string;
  severity: QueueProviderPackageDiagnosticSeverity;
}

export interface QueueProviderPackageHealthCheck {
  lastCheckedAt: string;
  liveBrokerHealthCheckAttempted: false;
  packageImportAttempted: false;
  sdkClientConstructionAttempted: false;
  status: QueueProviderPackageHealthStatus;
}

export interface QueueProviderPackageBrokerConnectionSummary {
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

export interface QueueProviderPackageReadinessProjection {
  bindingId: string;
  blockerCount: number;
  brokerConnection: QueueProviderPackageBrokerConnectionSummary;
  brokerConnectionBlockerCount: number;
  brokerConnectionDiagnosticCodes: RedisBrokerConnectionDiagnosticCode[];
  brokerConnectionHealthCheckMode: RedisBrokerHealthCheckMode;
  brokerConnectionId: string;
  brokerConnectionPosture: QueueProviderBrokerConnectionPosture;
  brokerConnectionRequiredConfigKeys: string[];
  brokerConnectionStatus: RedisBrokerConnectionStatus;
  browserBundleAllowed: false;
  diagnosticCodes: QueueProviderPackageDiagnosticCode[];
  family: QueueProviderPackageFamily;
  importPosture: QueueProviderPackageImportPosture;
  liveBrokerConnectionAttempted: false;
  liveBrokerHealthCheckAttempted: false;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode: QueueProviderPackageBindingMode;
  packageName: "bullmq";
  packageRef: "npm:bullmq";
  productionReady: false;
  providerKind: QueueProviderPackageProviderKind;
  queueClientConstructed: false;
  queueEventsConstructed: false;
  requiredConfigKeys: string[];
  sdkClientConstructed: false;
  status: QueueProviderPackageBindingStatus;
  valid: boolean;
  workerConstructed: false;
}

export interface QueueProviderPackageRegistration {
  bindingId: string;
  brokerConnection: QueueProviderPackageBrokerConnectionSummary;
  brokerConnectionPosture: QueueProviderBrokerConnectionPosture;
  definition: QueueProviderPackageDefinition;
  healthCheck: QueueProviderPackageHealthCheck;
  mode: QueueProviderPackageBindingMode;
  requiredConfigKeys: string[];
  status: QueueProviderPackageBindingStatus;
}

export interface QueueProviderPackageBindingSummary extends QueueProviderPackageRegistration {
  blockerCount: number;
  diagnosticCodes: QueueProviderPackageDiagnosticCode[];
  diagnostics: QueueProviderPackageDiagnostic[];
  id: "campaign-os-queue-provider-package-binding-foundation";
  liveBrokerConnectionAttempted: false;
  liveBrokerHealthCheckAttempted: false;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  noLiveFlags: QueueProviderPackageNoLiveFlags;
  preconditions: QueueProviderPackagePrecondition[];
  productionReady: false;
  profileId: QueueProviderPackageBindingProfileId;
  queueClientConstructed: false;
  queueEventsConstructed: false;
  readiness: QueueProviderPackageReadinessProjection;
  sdkClientConstructed: false;
  valid: boolean;
  workerConstructed: false;
}

export interface CreateQueueProviderPackageBindingOptions {
  bindingId?: string;
  env?: Record<string, unknown>;
  family?: string;
  mode?: string;
  packageName?: string;
  profileId?: string;
  providerKind?: string;
}

const FOUNDATION_ID = "campaign-os-queue-provider-package-binding-foundation" as const;
const HEALTH_CHECK_TIMESTAMP = "2026-07-08T02:00:00Z";
const REDACTED_VALUE = "[redacted]";
const RAW_PACKAGE_PAYLOAD_VALUE = "[redacted-queue-provider-package-payload]";
const LOCAL_BINDING_ID = "bullmq-redis-package-binding-local";
const STAGING_BINDING_ID = "bullmq-redis-package-binding-staging";
const PRODUCTION_BINDING_ID = "bullmq-redis-package-binding-production";
const APPROVED_PACKAGE_NAME = "bullmq" as const;
const APPROVED_PACKAGE_REF = "npm:bullmq" as const;
const APPROVED_PACKAGE_FAMILY = "bullmq-redis-compatible" as const;
const APPROVED_PROVIDER_KIND = "redis-compatible" as const;

export const SUPPORTED_QUEUE_PROVIDER_PACKAGE_BINDING_PROFILES: QueueProviderPackageBindingProfileId[] = [
  "local-review",
  "staging-scaffold",
  "production-required",
];

export const queueProviderPackageNoLiveFlags: QueueProviderPackageNoLiveFlags = {
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

export const queueProviderPackageDefinitions: QueueProviderPackageDefinition[] = [
  {
    browserBundleAllowed: false,
    family: APPROVED_PACKAGE_FAMILY,
    importPosture: "declared_dependency_metadata",
    packageName: APPROVED_PACKAGE_NAME,
    packageRef: APPROVED_PACKAGE_REF,
    providerKind: APPROVED_PROVIDER_KIND,
    redisCompatible: true,
    serverOnly: true,
  },
];

export const queueProviderPackageProductionPreconditions: QueueProviderPackagePrecondition[] = [
  precondition("package", "QUEUE_PROVIDER_PACKAGE_MISSING", "CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE", "queue-provider-package-approved-dependency", "Approved queue provider package dependency is required before live broker integration."),
  precondition("binding", "QUEUE_PROVIDER_PACKAGE_BINDING_MISSING", "CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING", "queue-provider-package-binding-registration", "Queue provider package binding registration is required before live broker integration."),
  precondition("provider", "QUEUE_PROVIDER_PACKAGE_PROVIDER_KIND_MISSING", "CAMPAIGN_OS_QUEUE_PROVIDER_KIND", "queue-provider-package-provider-kind", "Redis-compatible queue provider kind is required before live broker integration."),
  precondition("broker", "QUEUE_PROVIDER_PACKAGE_REDIS_ENDPOINT_MISSING", "CAMPAIGN_OS_REDIS_URL", "queue-provider-package-redis-endpoint-reference", "Redis endpoint/reference is required before BullMQ broker connection."),
  precondition("credentials", "QUEUE_PROVIDER_PACKAGE_CREDENTIALS_MISSING", "CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS", "queue-provider-package-credentials-reference", "Queue provider credentials reference is required before live broker integration."),
  precondition("queue", "QUEUE_PROVIDER_PACKAGE_WORKER_QUEUE_MISSING", "CAMPAIGN_OS_WORKER_QUEUE_URL", "queue-provider-package-worker-queue", "Worker queue route is required before live queue publishing."),
  precondition("dead_letter", "QUEUE_PROVIDER_PACKAGE_DEAD_LETTER_QUEUE_MISSING", "CAMPAIGN_OS_DEAD_LETTER_QUEUE", "queue-provider-package-dead-letter-queue", "Dead-letter queue route is required before live retry handling."),
  precondition("retry", "QUEUE_PROVIDER_PACKAGE_RETRY_POLICY_MISSING", "CAMPAIGN_OS_WORKER_RETRY_POLICY", "queue-provider-package-retry-degradation-policy", "Retry and degradation policy is required before live retry handling.", ["CAMPAIGN_OS_WORKER_RETRY_POLICY", "CAMPAIGN_OS_DEGRADATION_POLICY"]),
  precondition("idempotency", "QUEUE_PROVIDER_PACKAGE_IDEMPOTENCY_STORE_MISSING", "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL", "queue-provider-package-idempotency-store", "Idempotency store handoff is required before live queue publishing."),
  precondition("lease", "QUEUE_PROVIDER_PACKAGE_WORKER_LEASE_MISSING", "CAMPAIGN_OS_WORKER_LEASE_STORE_URL", "queue-provider-package-worker-lease-store", "Worker lease store handoff is required before live worker execution."),
  precondition("observability", "QUEUE_PROVIDER_PACKAGE_OBSERVABILITY_MISSING", "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL", "queue-provider-package-observability-exporter", "Observability exporter handoff is required before production queue visibility.", undefined, "deferred"),
  precondition("runbook", "QUEUE_PROVIDER_PACKAGE_RUNBOOK_MISSING", "CAMPAIGN_OS_OPERATOR_RUNBOOK_URL", "queue-provider-package-operator-runbook", "Operator runbook reference is required before live queue package activation.", undefined, "deferred"),
  precondition("activation", "QUEUE_PROVIDER_PACKAGE_LIVE_ENABLEMENT_MISSING", "CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT", "queue-provider-package-live-enable-gate", "Explicit live queue enablement gate is required before live broker connection."),
];

export const createQueueProviderPackageBinding = (
  options: CreateQueueProviderPackageBindingOptions = {},
): QueueProviderPackageBindingSummary => {
  const env = options.env ?? {};
  const profileResolution = resolveProfile(options.profileId);
  const modeResolution = resolveMode(profileResolution.profileId, options.mode);
  const familyResolution = resolveFamily(options.family, env);
  const providerKindResolution = resolveProviderKind(options.providerKind, env);
  const packageResolution = resolvePackageName(options.packageName, env);
  const bindingResolution = resolveBindingId(options.bindingId, env, profileResolution.profileId);
  const brokerConnectionFoundation = createRedisBrokerConnectionReadiness({
    env,
    packageBindingId: bindingResolution.bindingId,
    profileId: profileResolution.profileId,
  });
  const brokerConnection = createBrokerConnectionSummary(brokerConnectionFoundation);
  const productionDiagnostics =
    profileResolution.profileId === "production-required" ? createProductionDiagnostics(env) : [];
  const diagnostics = [
    ...profileResolution.diagnostics,
    ...modeResolution.diagnostics,
    ...familyResolution.diagnostics,
    ...providerKindResolution.diagnostics,
    ...packageResolution.diagnostics,
    ...bindingResolution.diagnostics,
    ...productionDiagnostics,
    ...brokerConnectionFoundation.diagnosticCodes.map((code) =>
      diagnostic(
        code,
        "redisBrokerConnectionReadiness",
        `Redis broker connection readiness reports ${code}.`,
      ),
    ),
  ];
  const blockerCount = diagnostics.filter((item) => item.severity === "error").length;
  const status = resolveStatus(profileResolution.profileId, blockerCount);
  const valid = profileResolution.valid
    && modeResolution.valid
    && familyResolution.valid
    && providerKindResolution.valid
    && packageResolution.valid
    && bindingResolution.valid
    && brokerConnection.valid
    && blockerCount === 0;
  const definition = createDefinition();
  const brokerConnectionPosture = resolveBrokerConnectionPosture(profileResolution.profileId, env);
  const registration = createRegistration({
    bindingId: bindingResolution.bindingId,
    brokerConnection,
    brokerConnectionPosture,
    definition,
    healthCheck: createHealthCheck(status),
    mode: modeResolution.mode,
    status,
  });
  const readiness = createReadinessProjection({
    bindingId: bindingResolution.bindingId,
    blockerCount,
    brokerConnection,
    brokerConnectionPosture,
    diagnostics,
    mode: modeResolution.mode,
    status,
    valid,
  });

  return {
    ...registration,
    blockerCount,
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    id: FOUNDATION_ID,
    liveBrokerConnectionAttempted: false,
    liveBrokerHealthCheckAttempted: false,
    liveQueuePublishingEnabled: false,
    liveWorkerExecutionEnabled: false,
    noLiveFlags: queueProviderPackageNoLiveFlags,
    preconditions: queueProviderPackageProductionPreconditions.map((item) => ({ ...item })),
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

export const getQueueProviderPackageBindingRegistration = (
  bindingId: string = LOCAL_BINDING_ID,
): QueueProviderPackageRegistration | undefined => {
  const binding = sanitizeQueueProviderPackageString(bindingId);

  if (binding === LOCAL_BINDING_ID) {
    return createRegistration({
      bindingId: LOCAL_BINDING_ID,
      brokerConnection: createBrokerConnectionSummary(
        createRedisBrokerConnectionReadiness({
          packageBindingId: LOCAL_BINDING_ID,
          profileId: "local-review",
        }),
      ),
      brokerConnectionPosture: "not_configured",
      definition: createDefinition(),
      healthCheck: createHealthCheck("local_ready"),
      mode: "dry_run",
      status: "local_ready",
    });
  }

  if (binding === STAGING_BINDING_ID) {
    return createRegistration({
      bindingId: STAGING_BINDING_ID,
      brokerConnection: createBrokerConnectionSummary(
        createRedisBrokerConnectionReadiness({
          packageBindingId: STAGING_BINDING_ID,
          profileId: "staging-scaffold",
        }),
      ),
      brokerConnectionPosture: "reference_only",
      definition: createDefinition(),
      healthCheck: createHealthCheck("scaffolded"),
      mode: "metadata_only",
      status: "scaffolded",
    });
  }

  if (binding === PRODUCTION_BINDING_ID) {
    return createRegistration({
      bindingId: PRODUCTION_BINDING_ID,
      brokerConnection: createBrokerConnectionSummary(
        createRedisBrokerConnectionReadiness({
          packageBindingId: PRODUCTION_BINDING_ID,
          profileId: "production-required",
        }),
      ),
      brokerConnectionPosture: "blocked_until_activation",
      definition: createDefinition(),
      healthCheck: createHealthCheck("blocked"),
      mode: "production_required",
      status: "blocked",
    });
  }

  return undefined;
};

export const redactQueueProviderPackageValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => redactQueueProviderPackageValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (isSensitiveQueueProviderPackageKey(key)) {
          return [key, REDACTED_VALUE];
        }

        return [key, redactQueueProviderPackageValue(nestedValue)];
      }),
    );
  }

  if (typeof value !== "string") {
    return value;
  }

  if (isRawQueueProviderPackagePayload(value)) {
    return RAW_PACKAGE_PAYLOAD_VALUE;
  }

  if (isUnsafeQueueProviderPackageString(value)) {
    return REDACTED_VALUE;
  }

  return value;
};

function precondition(
  area: QueueProviderPackagePreconditionArea,
  diagnosticCode: QueueProviderPackageDiagnosticCode,
  field: string,
  id: string,
  message: string,
  requiredConfigKeys = [field],
  status: QueueProviderPackagePrecondition["status"] = "blocked",
): QueueProviderPackagePrecondition {
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

function createDefinition(): QueueProviderPackageDefinition {
  return {
    ...queueProviderPackageDefinitions[0],
  };
}

function createRegistration(input: {
  bindingId: string;
  brokerConnection: QueueProviderPackageBrokerConnectionSummary;
  brokerConnectionPosture: QueueProviderBrokerConnectionPosture;
  definition: QueueProviderPackageDefinition;
  healthCheck: QueueProviderPackageHealthCheck;
  mode: QueueProviderPackageBindingMode;
  status: QueueProviderPackageBindingStatus;
}): QueueProviderPackageRegistration {
  return {
    bindingId: input.bindingId,
    brokerConnection: cloneBrokerConnectionSummary(input.brokerConnection),
    brokerConnectionPosture: input.brokerConnectionPosture,
    definition: { ...input.definition },
    healthCheck: input.healthCheck,
    mode: input.mode,
    requiredConfigKeys: [
      ...new Set([
        ...queueProviderPackageProductionPreconditions.flatMap((item) => item.requiredConfigKeys),
        ...input.brokerConnection.requiredConfigKeys,
      ]),
    ],
    status: input.status,
  };
}

function createReadinessProjection(input: {
  bindingId: string;
  blockerCount: number;
  brokerConnection: QueueProviderPackageBrokerConnectionSummary;
  brokerConnectionPosture: QueueProviderBrokerConnectionPosture;
  diagnostics: readonly QueueProviderPackageDiagnostic[];
  mode: QueueProviderPackageBindingMode;
  status: QueueProviderPackageBindingStatus;
  valid: boolean;
}): QueueProviderPackageReadinessProjection {
  return {
    bindingId: input.bindingId,
    blockerCount: input.blockerCount,
    brokerConnection: cloneBrokerConnectionSummary(input.brokerConnection),
    brokerConnectionBlockerCount: input.brokerConnection.blockerCount,
    brokerConnectionDiagnosticCodes: [...input.brokerConnection.diagnosticCodes],
    brokerConnectionHealthCheckMode: input.brokerConnection.healthCheckMode,
    brokerConnectionId: input.brokerConnection.connectionId,
    brokerConnectionPosture: input.brokerConnectionPosture,
    brokerConnectionRequiredConfigKeys: [...input.brokerConnection.requiredConfigKeys],
    brokerConnectionStatus: input.brokerConnection.status,
    browserBundleAllowed: false,
    diagnosticCodes: input.diagnostics.map((item) => item.code),
    family: APPROVED_PACKAGE_FAMILY,
    importPosture: "declared_dependency_metadata",
    liveBrokerConnectionAttempted: false,
    liveBrokerHealthCheckAttempted: false,
    liveQueuePublishingEnabled: false,
    liveWorkerExecutionEnabled: false,
    mode: input.mode,
    packageName: APPROVED_PACKAGE_NAME,
    packageRef: APPROVED_PACKAGE_REF,
    productionReady: false,
    providerKind: APPROVED_PROVIDER_KIND,
    queueClientConstructed: false,
    queueEventsConstructed: false,
    requiredConfigKeys: [
      ...new Set([
        ...queueProviderPackageProductionPreconditions.flatMap((item) => item.requiredConfigKeys),
        ...input.brokerConnection.requiredConfigKeys,
      ]),
    ],
    sdkClientConstructed: false,
    status: input.status,
    valid: input.valid,
    workerConstructed: false,
  };
}

function createBrokerConnectionSummary(
  brokerConnection: ReturnType<typeof createRedisBrokerConnectionReadiness>,
): QueueProviderPackageBrokerConnectionSummary {
  return {
    blockerCount: brokerConnection.blockerCount,
    browserBundleAllowed: false,
    circuitBreakerPolicyStatus: brokerConnection.circuitBreakerPolicyStatus,
    connectionId: brokerConnection.connectionId,
    credentialReferenceStatus: brokerConnection.credentialReferenceStatus,
    databaseSelectionStatus: brokerConnection.databaseSelectionStatus,
    diagnosticCodes: [...brokerConnection.diagnosticCodes],
    endpointReferenceStatus: brokerConnection.endpointReferenceStatus,
    healthCheckMode: brokerConnection.healthCheckMode,
    liveBrokerConnectionAttempted: false,
    liveBrokerHealthCheckAttempted: false,
    liveQueuePublishingEnabled: false,
    liveWorkerExecutionEnabled: false,
    mode: brokerConnection.mode,
    observabilityHandoffStatus: brokerConnection.observabilityHandoffStatus,
    operatorRunbookStatus: brokerConnection.operatorRunbookStatus,
    productionReady: false,
    providerKind: brokerConnection.providerKind,
    queueClientConstructed: false,
    queueEventsConstructed: false,
    requiredConfigKeys: [...brokerConnection.readiness.requiredConfigKeys],
    retryBackoffPolicyStatus: brokerConnection.retryBackoffPolicyStatus,
    sdkClientConstructed: false,
    status: brokerConnection.status,
    timeoutPolicyStatus: brokerConnection.timeoutPolicyStatus,
    tlsPolicyStatus: brokerConnection.tlsPolicyStatus,
    valid: brokerConnection.valid,
    workerConstructed: false,
  };
}

function cloneBrokerConnectionSummary(
  brokerConnection: QueueProviderPackageBrokerConnectionSummary,
): QueueProviderPackageBrokerConnectionSummary {
  return {
    ...brokerConnection,
    diagnosticCodes: [...brokerConnection.diagnosticCodes],
    requiredConfigKeys: [...brokerConnection.requiredConfigKeys],
  };
}

function createHealthCheck(status: QueueProviderPackageBindingStatus): QueueProviderPackageHealthCheck {
  return {
    lastCheckedAt: HEALTH_CHECK_TIMESTAMP,
    liveBrokerHealthCheckAttempted: false,
    packageImportAttempted: false,
    sdkClientConstructionAttempted: false,
    status: status === "local_ready" ? "local_ok" : status === "scaffolded" ? "metadata_only" : "blocked",
  };
}

function diagnostic(
  code: QueueProviderPackageDiagnosticCode,
  field: string,
  message: string,
  severity: QueueProviderPackageDiagnosticSeverity = "error",
): QueueProviderPackageDiagnostic {
  return {
    code,
    field,
    message,
    severity,
  };
}

function resolveProfile(
  requestedProfileId: string | undefined,
): { diagnostics: QueueProviderPackageDiagnostic[]; profileId: QueueProviderPackageBindingProfileId; valid: boolean } {
  const profileId = requestedProfileId ?? "local-review";

  if (isQueueProviderPackageBindingProfileId(profileId)) {
    return {
      diagnostics: [],
      profileId,
      valid: true,
    };
  }

  return {
    diagnostics: [
      diagnostic(
        "UNKNOWN_QUEUE_PROVIDER_PACKAGE_BINDING_PROFILE",
        "profileId",
        `Unsupported queue provider package binding profile: ${sanitizeQueueProviderPackageString(profileId)}`,
      ),
    ],
    profileId: "production-required",
    valid: false,
  };
}

function resolveMode(
  profileId: QueueProviderPackageBindingProfileId,
  requestedMode: string | undefined,
): { diagnostics: QueueProviderPackageDiagnostic[]; mode: QueueProviderPackageBindingMode; valid: boolean } {
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

  if (isQueueProviderPackageBindingMode(requestedMode) && !isUnsafeQueueProviderPackageString(requestedMode)) {
    return {
      diagnostics: [],
      mode: requestedMode,
      valid: true,
    };
  }

  return {
    diagnostics: [
      diagnostic(
        "UNKNOWN_QUEUE_PROVIDER_PACKAGE_BINDING_MODE",
        "mode",
        `Unsupported queue provider package binding mode: ${sanitizeQueueProviderPackageString(requestedMode)}`,
      ),
    ],
    mode: "production_required",
    valid: false,
  };
}

function resolveFamily(
  requestedFamily: string | undefined,
  env: Record<string, unknown>,
): { diagnostics: QueueProviderPackageDiagnostic[]; family: QueueProviderPackageFamily; valid: boolean } {
  const envFamily = env.CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_FAMILY;
  const rawFamily =
    requestedFamily
    ?? (typeof envFamily === "string" && envFamily.trim().length > 0 ? envFamily : undefined)
    ?? APPROVED_PACKAGE_FAMILY;

  if (isUnsafeQueueProviderPackageString(rawFamily) || !isSafeLabel(rawFamily)) {
    return {
      diagnostics: [
        diagnostic("UNSAFE_QUEUE_PROVIDER_PACKAGE_BINDING_CONFIG", "family", "Queue provider package family contains unsafe material."),
      ],
      family: APPROVED_PACKAGE_FAMILY,
      valid: false,
    };
  }

  if (rawFamily !== APPROVED_PACKAGE_FAMILY) {
    return {
      diagnostics: [
        diagnostic(
          "UNKNOWN_QUEUE_PROVIDER_PACKAGE_FAMILY",
          "family",
          `Queue provider package family is not supported: ${sanitizeQueueProviderPackageString(rawFamily)}`,
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

function resolveProviderKind(
  requestedProviderKind: string | undefined,
  env: Record<string, unknown>,
): { diagnostics: QueueProviderPackageDiagnostic[]; providerKind: QueueProviderPackageProviderKind; valid: boolean } {
  const envProviderKind = env.CAMPAIGN_OS_QUEUE_PROVIDER_KIND;
  const rawProviderKind =
    requestedProviderKind
    ?? (typeof envProviderKind === "string" && envProviderKind.trim().length > 0 ? envProviderKind : undefined)
    ?? APPROVED_PROVIDER_KIND;

  if (isUnsafeQueueProviderPackageString(rawProviderKind) || !isSafeLabel(rawProviderKind)) {
    return {
      diagnostics: [
        diagnostic("UNSAFE_QUEUE_PROVIDER_PACKAGE_BINDING_CONFIG", "providerKind", "Queue provider package provider kind contains unsafe material."),
      ],
      providerKind: APPROVED_PROVIDER_KIND,
      valid: false,
    };
  }

  if (rawProviderKind !== APPROVED_PROVIDER_KIND) {
    return {
      diagnostics: [
        diagnostic(
          "QUEUE_PROVIDER_PACKAGE_UNSUPPORTED",
          "providerKind",
          `Queue provider package provider kind is not supported: ${sanitizeQueueProviderPackageString(rawProviderKind)}`,
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

function resolvePackageName(
  requestedPackageName: string | undefined,
  env: Record<string, unknown>,
): { diagnostics: QueueProviderPackageDiagnostic[]; packageName: "bullmq"; valid: boolean } {
  const envPackage = env.CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE;
  const rawPackageName =
    requestedPackageName
    ?? (typeof envPackage === "string" && envPackage.trim().length > 0 ? envPackage : undefined)
    ?? APPROVED_PACKAGE_NAME;

  if (isUnsafeQueueProviderPackageString(rawPackageName) || !isSafePackageName(rawPackageName)) {
    return {
      diagnostics: [
        diagnostic("UNSAFE_QUEUE_PROVIDER_PACKAGE_BINDING_CONFIG", "packageName", "Queue provider package name contains unsafe material."),
      ],
      packageName: APPROVED_PACKAGE_NAME,
      valid: false,
    };
  }

  if (rawPackageName !== APPROVED_PACKAGE_NAME && rawPackageName !== APPROVED_PACKAGE_REF) {
    return {
      diagnostics: [
        diagnostic(
          "QUEUE_PROVIDER_PACKAGE_UNSUPPORTED",
          "packageName",
          `Queue provider package is not approved for this binding: ${sanitizeQueueProviderPackageString(rawPackageName)}`,
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

function resolveBindingId(
  requestedBindingId: string | undefined,
  env: Record<string, unknown>,
  profileId: QueueProviderPackageBindingProfileId,
): { bindingId: string; diagnostics: QueueProviderPackageDiagnostic[]; valid: boolean } {
  const envBinding = env.CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING;
  const rawBindingId =
    requestedBindingId
    ?? (typeof envBinding === "string" && envBinding.trim().length > 0 ? envBinding : undefined)
    ?? (profileId === "staging-scaffold"
      ? STAGING_BINDING_ID
      : profileId === "production-required"
        ? PRODUCTION_BINDING_ID
        : LOCAL_BINDING_ID);

  if (isUnsafeQueueProviderPackageString(rawBindingId) || !isSafeLabel(rawBindingId)) {
    return {
      bindingId: "blocked-package-binding",
      diagnostics: [
        diagnostic("UNSAFE_QUEUE_PROVIDER_PACKAGE_BINDING_CONFIG", "bindingId", "Queue provider package binding id contains unsafe material."),
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

function createProductionDiagnostics(env: Record<string, unknown>): QueueProviderPackageDiagnostic[] {
  return queueProviderPackageProductionPreconditions
    .filter((item) => {
      if (item.diagnosticCode === "QUEUE_PROVIDER_PACKAGE_LIVE_ENABLEMENT_MISSING") {
        return !isActivationGateSatisfied(env);
      }

      return !hasConfiguredValue(env, item.requiredConfigKeys);
    })
    .map((item) => diagnostic(item.diagnosticCode, item.field, item.message));
}

function resolveStatus(
  profileId: QueueProviderPackageBindingProfileId,
  blockerCount: number,
): QueueProviderPackageBindingStatus {
  if (blockerCount > 0) {
    return "blocked";
  }

  return profileId === "local-review" ? "local_ready" : "scaffolded";
}

function resolveBrokerConnectionPosture(
  profileId: QueueProviderPackageBindingProfileId,
  env: Record<string, unknown>,
): QueueProviderBrokerConnectionPosture {
  if (profileId === "local-review") {
    return "not_configured";
  }

  if (hasConfiguredValue(env, ["CAMPAIGN_OS_REDIS_URL"])) {
    return "reference_only";
  }

  return "blocked_until_activation";
}

function hasConfiguredValue(env: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.every((key) => {
    const value = env[key];

    if (typeof value === "string") {
      return value.trim().length > 0 && !isUnsafeQueueProviderPackageString(value);
    }

    return value !== undefined && value !== null;
  });
}

function isActivationGateSatisfied(env: Record<string, unknown>): boolean {
  const value = env.CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT;

  return typeof value === "string" && value.trim() === "explicitly-enabled";
}

function isQueueProviderPackageBindingProfileId(value: string): value is QueueProviderPackageBindingProfileId {
  return SUPPORTED_QUEUE_PROVIDER_PACKAGE_BINDING_PROFILES.includes(value as QueueProviderPackageBindingProfileId);
}

function isQueueProviderPackageBindingMode(value: string): value is QueueProviderPackageBindingMode {
  return value === "dry_run" || value === "metadata_only" || value === "production_required";
}

function sanitizeQueueProviderPackageString(value: string): string {
  const redacted = redactQueueProviderPackageValue(value);

  return typeof redacted === "string" ? redacted : REDACTED_VALUE;
}

function isSafeLabel(value: string): boolean {
  return /^[a-z][a-z0-9-]{2,95}$/i.test(value);
}

function isSafePackageName(value: string): boolean {
  return value === APPROVED_PACKAGE_NAME || value === APPROVED_PACKAGE_REF;
}

function isSensitiveQueueProviderPackageKey(key: string): boolean {
  return /api[-_]?key|bearer|credential|lease[-_]?token|object[-_]?key|payload|private[-_]?key|provider[-_]?response|queue[-_]?url|redis[-_]?url|secret|signed[-_]?url|token|webhook|wallet/i.test(
    key,
  );
}

function isUnsafeQueueProviderPackageString(value: string): boolean {
  return isCredentialedUrl(value)
    || isLikelyObjectKey(value)
    || isSensitiveQueueProviderPackageString(value)
    || isWalletAddressString(value)
    || isRawQueueProviderPackagePayload(value);
}

function isSensitiveQueueProviderPackageString(value: string): boolean {
  return /(api[-_]?key|bearer\s+|hook-secret|lease-token|private[-_]?key|queue-secret|secret|token=|worker-token|x-amz-signature=|signed-url|webhook-secret)/i.test(
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

function isRawQueueProviderPackagePayload(value: string): boolean {
  const trimmed = value.trim();

  return (trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"));
}
