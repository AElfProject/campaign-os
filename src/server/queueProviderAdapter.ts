import type { BackendRuntimeProfileId } from "./backendProfiles";
import {
  createObservabilityExporterFoundation,
  type ObservabilityExporterDiagnosticCode,
  type ObservabilityExporterFoundationStatus,
  type ObservabilityExporterMode,
  type ObservabilityExporterOperationCapability,
} from "./observabilityExporter";
import {
  createQueueProviderDriverFoundation,
  type QueueProviderDriverDiagnosticCode,
  type QueueProviderDriverFoundationStatus,
  type QueueProviderDriverMode,
  type QueueProviderDriverConsumeAttemptPolicy,
  type QueueProviderDriverConsumePosture,
  type QueueProviderDriverConsumeReadinessSummary,
  type QueueProviderDriverConsumeResultStatus,
  type QueueProviderDriverOperationCapability,
  type QueueProviderDriverPublishAttemptPolicy,
  type QueueProviderDriverPublishPosture,
  type QueueProviderDriverPublishResultStatus,
  type QueueProviderDriverPublishingReadinessSummary,
  type QueueProviderDriverSdkBindingSummary,
} from "./queueProviderDriver";
import type { QueueDegradedOutcome } from "./queueRuntime";

export type QueueProviderAdapterProfileId = BackendRuntimeProfileId;
export type QueueProviderAdapterFoundationStatus = "local_ready" | "scaffolded" | "blocked";
export type QueueProviderAdapterMode = "dry_run" | "metadata_only" | "production_required";
export type QueueProviderOperation =
  | "publish"
  | "delayed_publish"
  | "ack"
  | "nack"
  | "lease"
  | "retry"
  | "dead_letter"
  | "metrics";
export type QueueProviderDiagnosticSeverity = "error" | "warning" | "info";
export type QueueProviderDiagnosticCode =
  | "UNKNOWN_QUEUE_PROVIDER_PROFILE"
  | "QUEUE_PROVIDER_MISSING"
  | "QUEUE_PROVIDER_UNSUPPORTED"
  | "QUEUE_PROVIDER_ENDPOINT_MISSING"
  | "QUEUE_PROVIDER_CREDENTIALS_MISSING"
  | "QUEUE_PROVIDER_DEAD_LETTER_MISSING"
  | "QUEUE_PROVIDER_RETRY_POLICY_MISSING"
  | "QUEUE_PROVIDER_IDEMPOTENCY_STORE_MISSING"
  | "QUEUE_PROVIDER_WORKER_LEASE_MISSING"
  | "QUEUE_PROVIDER_OBSERVABILITY_MISSING"
  | "UNSAFE_QUEUE_PROVIDER_CONFIG"
  | QueueProviderDriverDiagnosticCode;
export type QueueProviderPreconditionArea =
  | "auth"
  | "dead_letter"
  | "idempotency"
  | "lease"
  | "observability"
  | "provider"
  | "queue"
  | "retry";

export interface QueueProviderAdapterNoLiveFlags {
  liveAiCallsEnabled: false;
  liveAnalyticsIngestionEnabled: false;
  liveContractCallsEnabled: false;
  liveCronExecutionEnabled: false;
  liveObjectStorageEnabled: false;
  liveProviderCallsEnabled: false;
  liveQueuePublishingEnabled: false;
  liveRewardDistributionEnabled: false;
  liveSchedulerExecutionEnabled: false;
  liveSocialCallsEnabled: false;
  liveWorkerExecutionEnabled: false;
}

export interface QueueProviderProductionPrecondition {
  area: QueueProviderPreconditionArea;
  diagnosticCode: QueueProviderDiagnosticCode;
  field: string;
  id: string;
  message: string;
  requiredBeforeProduction: true;
  requiredConfigKeys: string[];
  status: "blocked" | "deferred";
}

export interface QueueProviderDiagnostic {
  code: QueueProviderDiagnosticCode;
  field: string;
  message: string;
  severity: QueueProviderDiagnosticSeverity;
}

export interface QueueProviderOperationCapability {
  degradedOutcome: QueueDegradedOutcome;
  liveEnabled: false;
  operation: QueueProviderOperation;
  operatorNextAction: string;
  requiredBeforeProduction: boolean;
  requiredConfigKeys: string[];
  supported: boolean;
}

export interface QueueProviderObservabilityExporterSummary {
  adapterId: string;
  blockerCount: number;
  diagnosticCodes: ObservabilityExporterDiagnosticCode[];
  disabledLiveOperationCount: number;
  exporterId: string;
  liveAlertRoutingEnabled: false;
  liveLogExportEnabled: false;
  liveMetricsExportEnabled: false;
  liveTelemetryExportEnabled: false;
  liveTraceExportEnabled: false;
  metricNamespace: string;
  mode: ObservabilityExporterMode;
  operationCapabilities: ObservabilityExporterOperationCapability[];
  operationCount: number;
  productionReady: false;
  requiredConfigKeys: string[];
  sinkId: string;
  status: ObservabilityExporterFoundationStatus;
  valid: boolean;
}

export interface QueueProviderDriverSummary {
  activationGateSatisfied: boolean;
  blockerCount: number;
  deadLetterRouteCount: number;
  diagnosticCodes: QueueProviderDriverDiagnosticCode[];
  disabledLiveOperationCount: number;
  driverId: string;
  liveQueueConsumptionEnabled: false;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode: QueueProviderDriverMode;
  operationCapabilities: QueueProviderDriverOperationCapability[];
  operationCount: number;
  productionReady: false;
  providerId: string;
  consumePosture: QueueProviderDriverConsumePosture;
  consumingReadiness: QueueProviderDriverConsumeReadinessSummary;
  publishPosture: QueueProviderDriverPublishPosture;
  publishingReadiness: QueueProviderDriverPublishingReadinessSummary;
  queueRouteCount: number;
  requiredConfigKeys: string[];
  sdkBinding: QueueProviderDriverSdkBindingSummary;
  status: QueueProviderDriverFoundationStatus;
  valid: boolean;
}

export interface QueueProviderAdapterReadinessProjection {
  adapterId: string;
  blockerCount: number;
  diagnosticCodes: QueueProviderDiagnosticCode[];
  disabledLiveOperationCount: number;
  driverActivationGateSatisfied: boolean;
  driverBlockerCount: number;
  driverDeadLetterRouteCount: number;
  driverDiagnosticCodes: QueueProviderDriverDiagnosticCode[];
  driverDisabledLiveOperationCount: number;
  driverId: string;
  driverLiveQueueConsumptionEnabled: false;
  driverLiveQueuePublishingEnabled: false;
  driverLiveWorkerExecutionEnabled: false;
  driverMode: QueueProviderDriverMode;
  driverOperationCount: number;
  driverProductionReady: false;
  driverProviderId: string;
  driverConsumeAckAttempted: false;
  driverConsumeAttemptPolicy: QueueProviderDriverConsumeAttemptPolicy;
  driverConsumeDeadLetterAttempted: false;
  driverConsumeDiagnosticCodes: QueueProviderDriverConsumePosture["diagnosticCodes"];
  driverConsumeNackAttempted: false;
  driverConsumeRequestEvaluated: false;
  driverConsumeResultStatus: QueueProviderDriverConsumeResultStatus;
  driverConsumeRetryScheduled: false;
  driverConsumingActivationStatus: QueueProviderDriverConsumeReadinessSummary["activationStatus"];
  driverConsumingBlockerCount: number;
  driverConsumingConsumerId: string;
  driverConsumingConsumerProvided: boolean;
  driverConsumingHandlerRegistryProvided: boolean;
  driverConsumingLiveConsumeAttempted: boolean;
  driverConsumingLiveQueueConsumptionEnabled: boolean;
  driverConsumingNoLiveSideEffects: QueueProviderDriverConsumeReadinessSummary["noLiveSideEffects"];
  driverConsumingProductionReady: false;
  driverConsumingRequiredConfigKeys: string[];
  driverConsumingStatus: QueueProviderDriverConsumeReadinessSummary["status"];
  driverPublishAttemptPolicy: QueueProviderDriverPublishAttemptPolicy;
  driverPublishDiagnosticCodes: QueueProviderDriverPublishPosture["diagnosticCodes"];
  driverPublishRequestEvaluated: boolean;
  driverPublishResultStatus: QueueProviderDriverPublishResultStatus;
  driverPublishingActivationStatus: QueueProviderDriverPublishingReadinessSummary["activationStatus"];
  driverPublishingBlockerCount: number;
  driverPublishingLivePublishAttempted: boolean;
  driverPublishingLiveQueuePublishingEnabled: boolean;
  driverPublishingNoLiveSideEffects: QueueProviderDriverPublishingReadinessSummary["noLiveSideEffects"];
  driverPublishingPublisherId: string;
  driverPublishingPublisherProvided: boolean;
  driverPublishingRequiredConfigKeys: string[];
  driverPublishingStatus: QueueProviderDriverPublishingReadinessSummary["status"];
  driverQueueRouteCount: number;
  driverRequiredConfigKeys: string[];
  driverSdkBindingBlockerCount: number;
  driverSdkBindingDiagnosticCodes: QueueProviderDriverSdkBindingSummary["diagnosticCodes"];
  driverSdkBindingDisabledLiveOperationCount: number;
  driverSdkBindingId: string;
  driverSdkBindingLiveProviderCallAttempted: false;
  driverSdkBindingLiveQueuePublishingEnabled: false;
  driverSdkBindingLiveWorkerExecutionEnabled: false;
  driverSdkBindingMode: QueueProviderDriverSdkBindingSummary["mode"];
  driverSdkBindingOperationCount: number;
  driverSdkBindingPackageBindingBrokerConnectionBlockerCount: number;
  driverSdkBindingPackageBindingBrokerConnectionDiagnosticCodes: QueueProviderDriverSdkBindingSummary["packageBinding"]["brokerConnectionDiagnosticCodes"];
  driverSdkBindingPackageBindingBrokerConnectionHealthCheckMode: QueueProviderDriverSdkBindingSummary["packageBinding"]["brokerConnectionHealthCheckMode"];
  driverSdkBindingPackageBindingBrokerConnectionId: string;
  driverSdkBindingPackageBindingBrokerConnectionRequiredConfigKeys: string[];
  driverSdkBindingPackageBindingBrokerConnectionStatus: QueueProviderDriverSdkBindingSummary["packageBinding"]["brokerConnectionStatus"];
  driverSdkBindingPackageBindingBlockerCount: number;
  driverSdkBindingPackageBindingBrowserBundleAllowed: false;
  driverSdkBindingPackageBindingBullmqConstructionAttempted: boolean;
  driverSdkBindingPackageBindingBullmqConstructionBlockerCount: number;
  driverSdkBindingPackageBindingBullmqConstructionDiagnosticCodes: QueueProviderDriverSdkBindingSummary["packageBinding"]["bullmqConstructionDiagnosticCodes"];
  driverSdkBindingPackageBindingBullmqConstructionFactoryInvoked: boolean;
  driverSdkBindingPackageBindingBullmqConstructionId: string;
  driverSdkBindingPackageBindingBullmqConstructionProductionReady: false;
  driverSdkBindingPackageBindingBullmqConstructionStatus: QueueProviderDriverSdkBindingSummary["packageBinding"]["bullmqConstructionStatus"];
  driverSdkBindingPackageBindingDiagnosticCodes: QueueProviderDriverSdkBindingSummary["packageBinding"]["diagnosticCodes"];
  driverSdkBindingPackageBindingFamily: QueueProviderDriverSdkBindingSummary["packageBinding"]["family"];
  driverSdkBindingPackageBindingId: string;
  driverSdkBindingPackageBindingLiveBrokerConnectionAttempted: false;
  driverSdkBindingPackageBindingLiveBrokerHealthCheckAttempted: false;
  driverSdkBindingPackageBindingLiveQueuePublishingEnabled: false;
  driverSdkBindingPackageBindingLiveWorkerExecutionEnabled: false;
  driverSdkBindingPackageBindingPackageName: "bullmq";
  driverSdkBindingPackageBindingPackageRef: "npm:bullmq";
  driverSdkBindingPackageBindingQueueClientConstructed: boolean;
  driverSdkBindingPackageBindingQueueEventsConstructed: boolean;
  driverSdkBindingPackageBindingSdkClientConstructed: false;
  driverSdkBindingPackageBindingStatus: QueueProviderDriverSdkBindingSummary["packageBinding"]["status"];
  driverSdkBindingPackageBindingWorkerConstructed: boolean;
  driverSdkBindingProductionReady: false;
  driverSdkBindingProviderKind: QueueProviderDriverSdkBindingSummary["providerKind"];
  driverSdkBindingQueueRouteCount: number;
  driverSdkBindingRequiredConfigKeys: string[];
  driverSdkBindingSdkClientConstructed: false;
  driverSdkBindingSdkPackageRef: string;
  driverSdkBindingStatus: QueueProviderDriverSdkBindingSummary["status"];
  driverSdkBindingValid: boolean;
  driverStatus: QueueProviderDriverFoundationStatus;
  driverValid: boolean;
  liveQueueConsumptionEnabled: false;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode: QueueProviderAdapterMode;
  observabilityExporterBlockerCount: number;
  observabilityExporterDiagnosticCodes: ObservabilityExporterDiagnosticCode[];
  observabilityExporterId: string;
  observabilityExporterLiveTelemetryExportEnabled: false;
  observabilityExporterMode: ObservabilityExporterMode;
  observabilityExporterRequiredConfigKeys: string[];
  observabilityExporterSinkId: string;
  observabilityExporterStatus: ObservabilityExporterFoundationStatus;
  operationCount: number;
  productionReady: false;
  providerId: string;
  requiredConfigKeys: string[];
}

export interface QueueProviderAdapterFoundationSummary {
  adapterId: string;
  blockerCount: number;
  diagnosticCodes: QueueProviderDiagnosticCode[];
  diagnostics: QueueProviderDiagnostic[];
  driver: QueueProviderDriverSummary;
  id: "campaign-os-queue-provider-adapter-foundation";
  mode: QueueProviderAdapterMode;
  noLiveFlags: QueueProviderAdapterNoLiveFlags;
  observabilityExporter: QueueProviderObservabilityExporterSummary;
  operationCapabilities: QueueProviderOperationCapability[];
  preconditions: QueueProviderProductionPrecondition[];
  productionReady: false;
  profileId: QueueProviderAdapterProfileId;
  providerId: string;
  readiness: QueueProviderAdapterReadinessProjection;
  status: QueueProviderAdapterFoundationStatus;
  valid: boolean;
}

export interface CreateQueueProviderAdapterFoundationOptions {
  env?: Record<string, unknown>;
  profileId?: string;
  providerId?: string;
}

const REDACTED_VALUE = "[redacted]";
const RAW_PROVIDER_PAYLOAD_VALUE = "[redacted-provider-payload]";
const FOUNDATION_ID = "campaign-os-queue-provider-adapter-foundation" as const;

export const SUPPORTED_QUEUE_PROVIDER_ADAPTER_PROFILES: QueueProviderAdapterProfileId[] = [
  "local-review",
  "staging-scaffold",
  "production-required",
];

export const queueProviderAdapterNoLiveFlags: QueueProviderAdapterNoLiveFlags = {
  liveAiCallsEnabled: false,
  liveAnalyticsIngestionEnabled: false,
  liveContractCallsEnabled: false,
  liveCronExecutionEnabled: false,
  liveObjectStorageEnabled: false,
  liveProviderCallsEnabled: false,
  liveQueuePublishingEnabled: false,
  liveRewardDistributionEnabled: false,
  liveSchedulerExecutionEnabled: false,
  liveSocialCallsEnabled: false,
  liveWorkerExecutionEnabled: false,
};

export const queueProviderAdapterProductionPreconditions: QueueProviderProductionPrecondition[] = [
  {
    area: "provider",
    diagnosticCode: "QUEUE_PROVIDER_MISSING",
    field: "CAMPAIGN_OS_QUEUE_PROVIDER",
    id: "queue-provider-selection",
    message: "Queue provider selection is required before live queue provider publishing.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_QUEUE_PROVIDER"],
    status: "blocked",
  },
  {
    area: "provider",
    diagnosticCode: "QUEUE_PROVIDER_ENDPOINT_MISSING",
    field: "CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT",
    id: "queue-provider-endpoint",
    message: "Queue provider endpoint is required before live queue provider publishing.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT"],
    status: "blocked",
  },
  {
    area: "auth",
    diagnosticCode: "QUEUE_PROVIDER_CREDENTIALS_MISSING",
    field: "CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS",
    id: "queue-provider-credentials",
    message: "Queue provider credentials are required before live provider calls.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS"],
    status: "blocked",
  },
  {
    area: "queue",
    diagnosticCode: "QUEUE_PROVIDER_ENDPOINT_MISSING",
    field: "CAMPAIGN_OS_WORKER_QUEUE_URL",
    id: "queue-provider-worker-queue-url",
    message: "Worker queue URL is required before live queue provider publishing.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_WORKER_QUEUE_URL"],
    status: "blocked",
  },
  {
    area: "dead_letter",
    diagnosticCode: "QUEUE_PROVIDER_DEAD_LETTER_MISSING",
    field: "CAMPAIGN_OS_DEAD_LETTER_QUEUE",
    id: "queue-provider-dead-letter",
    message: "Dead-letter queue is required before live provider retry failures.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_DEAD_LETTER_QUEUE"],
    status: "blocked",
  },
  {
    area: "retry",
    diagnosticCode: "QUEUE_PROVIDER_RETRY_POLICY_MISSING",
    field: "CAMPAIGN_OS_WORKER_RETRY_POLICY",
    id: "queue-provider-retry-policy",
    message: "Retry and degradation policy are required before live provider retries.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_WORKER_RETRY_POLICY", "CAMPAIGN_OS_DEGRADATION_POLICY"],
    status: "blocked",
  },
  {
    area: "idempotency",
    diagnosticCode: "QUEUE_PROVIDER_IDEMPOTENCY_STORE_MISSING",
    field: "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL",
    id: "queue-provider-idempotency-store",
    message: "Idempotency store is required before live provider publishing can avoid duplicate side effects.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_IDEMPOTENCY_STORE_URL"],
    status: "blocked",
  },
  {
    area: "lease",
    diagnosticCode: "QUEUE_PROVIDER_WORKER_LEASE_MISSING",
    field: "CAMPAIGN_OS_WORKER_LEASE_STORE_URL",
    id: "queue-provider-worker-lease",
    message: "Worker lease store is required before concurrent live worker/provider execution.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_WORKER_LEASE_STORE_URL"],
    status: "blocked",
  },
  {
    area: "observability",
    diagnosticCode: "QUEUE_PROVIDER_OBSERVABILITY_MISSING",
    field: "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
    id: "queue-provider-observability",
    message: "Observability exporter is required before production queue provider visibility.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL"],
    status: "deferred",
  },
];

export const queueProviderOperationCapabilities: QueueProviderOperationCapability[] = [
  capability("publish", true, true, ["CAMPAIGN_OS_WORKER_QUEUE_URL"], "pending"),
  capability("delayed_publish", true, true, ["CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT"], "metadata_only"),
  capability("ack", true, true, ["CAMPAIGN_OS_WORKER_QUEUE_URL"], "blocked"),
  capability("nack", true, true, ["CAMPAIGN_OS_WORKER_QUEUE_URL"], "manual_review"),
  capability("lease", true, true, ["CAMPAIGN_OS_WORKER_LEASE_STORE_URL"], "blocked"),
  capability("retry", true, true, ["CAMPAIGN_OS_WORKER_RETRY_POLICY"], "manual_review"),
  capability("dead_letter", true, true, ["CAMPAIGN_OS_DEAD_LETTER_QUEUE"], "manual_review"),
  capability("metrics", true, false, ["CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL"], "metadata_only"),
];

export const createQueueProviderAdapterFoundation = (
  options: CreateQueueProviderAdapterFoundationOptions = {},
): QueueProviderAdapterFoundationSummary => {
  const env = options.env ?? {};
  const profileResolution = resolveProfile(options.profileId);
  const mode = resolveMode(profileResolution.profileId);
  const providerResolution = resolveProviderId(options.providerId, env, profileResolution.profileId);
  const productionDiagnostics =
    profileResolution.profileId === "production-required" ? createProductionDiagnostics(env) : [];
  const observabilityExporter = createObservabilityExporterSummary(
    createObservabilityExporterFoundation({
      env,
      profileId: profileResolution.profileId,
    }),
  );
  const driver = createDriverSummary(
    createQueueProviderDriverFoundation({
      env,
      profileId: profileResolution.profileId,
      providerId: mapAdapterProviderToDriverProvider(providerResolution.providerId),
    }),
  );
  const diagnostics = [
    ...profileResolution.diagnostics,
    ...providerResolution.diagnostics,
    ...productionDiagnostics,
    ...driver.diagnosticCodes.map((code) =>
      diagnostic(
        code,
        "queueProviderDriver",
        `Queue provider driver readiness reports ${code}.`,
      ),
    ),
  ];
  const blockerCount = diagnostics.filter((item) => item.severity === "error").length;
  const providerId = providerResolution.providerId;
  const adapterId = `${providerId}-queue-provider-adapter`;
  const readiness = createReadinessProjection({
    adapterId,
    blockerCount,
    diagnostics,
    driver,
    mode,
    observabilityExporter,
    providerId,
  });

  return {
    adapterId,
    blockerCount,
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    driver,
    id: FOUNDATION_ID,
    mode,
    noLiveFlags: queueProviderAdapterNoLiveFlags,
    observabilityExporter,
    operationCapabilities: queueProviderOperationCapabilities.map((item) => ({ ...item })),
    preconditions: queueProviderAdapterProductionPreconditions.map((item) => ({ ...item })),
    productionReady: false,
    profileId: profileResolution.profileId,
    providerId,
    readiness,
    status: resolveStatus(profileResolution.profileId, blockerCount),
    valid: profileResolution.valid && providerResolution.valid && blockerCount === 0,
  };
};

export const redactQueueProviderAdapterValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => redactQueueProviderAdapterValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (isSensitiveProviderKey(key)) {
          return [key, REDACTED_VALUE];
        }

        return [key, redactQueueProviderAdapterValue(nestedValue)];
      }),
    );
  }

  if (typeof value !== "string") {
    return value;
  }

  if (isRawProviderPayload(value)) {
    return RAW_PROVIDER_PAYLOAD_VALUE;
  }

  if (isUnsafeProviderString(value)) {
    return REDACTED_VALUE;
  }

  return value;
};

function capability(
  operation: QueueProviderOperation,
  supported: boolean,
  requiredBeforeProduction: boolean,
  requiredConfigKeys: string[],
  degradedOutcome: QueueDegradedOutcome,
): QueueProviderOperationCapability {
  return {
    degradedOutcome,
    liveEnabled: false,
    operation,
    operatorNextAction: operationNextAction(operation),
    requiredBeforeProduction,
    requiredConfigKeys,
    supported,
  };
}

function operationNextAction(operation: QueueProviderOperation): string {
  const labels: Record<QueueProviderOperation, string> = {
    ack: "Keep ack metadata disabled until a live worker lease and provider adapter are approved.",
    dead_letter: "Route failed work to manual review until dead-letter queue handling is approved.",
    delayed_publish: "Keep delayed publish as schedule/queue metadata until live provider scheduling is approved.",
    lease: "Keep worker leasing blocked until a lease store is configured.",
    metrics: "Expose local metadata only until an observability exporter is configured.",
    nack: "Keep nack handling under manual review until live worker/provider failure semantics are approved.",
    publish: "Use dry-run enqueue metadata only; do not publish live queue messages.",
    retry: "Use retry policy metadata only until idempotency and retry stores are configured.",
  };

  return labels[operation];
}

const diagnostic = (
  code: QueueProviderDiagnosticCode,
  field: string,
  message: string,
  severity: QueueProviderDiagnosticSeverity = "error",
): QueueProviderDiagnostic => ({
  code,
  field,
  message,
  severity,
});

const hasConfiguredValue = (env: Record<string, unknown>, keys: readonly string[]): boolean =>
  keys.every((key) => {
    const value = env[key];

    return typeof value === "string" ? value.trim().length > 0 : value !== undefined && value !== null;
  });

const createProductionDiagnostics = (
  env: Record<string, unknown>,
): QueueProviderDiagnostic[] =>
  queueProviderAdapterProductionPreconditions
    .filter((item) => !hasConfiguredValue(env, item.requiredConfigKeys))
    .map((item) => diagnostic(item.diagnosticCode, item.field, item.message));

const isQueueProviderAdapterProfileId = (value: string): value is QueueProviderAdapterProfileId =>
  SUPPORTED_QUEUE_PROVIDER_ADAPTER_PROFILES.includes(value as QueueProviderAdapterProfileId);

const resolveProfile = (
  requestedProfileId: string | undefined,
): { diagnostics: QueueProviderDiagnostic[]; profileId: QueueProviderAdapterProfileId; valid: boolean } => {
  const profileId = requestedProfileId ?? "local-review";

  if (isQueueProviderAdapterProfileId(profileId)) {
    return {
      diagnostics: [],
      profileId,
      valid: true,
    };
  }

  return {
    diagnostics: [
      diagnostic(
        "UNKNOWN_QUEUE_PROVIDER_PROFILE",
        "profileId",
        `Unsupported queue provider adapter profile: ${sanitizeProviderString(profileId)}`,
      ),
    ],
    profileId: "production-required",
    valid: false,
  };
};

const resolveProviderId = (
  requestedProviderId: string | undefined,
  env: Record<string, unknown>,
  profileId: QueueProviderAdapterProfileId,
): { diagnostics: QueueProviderDiagnostic[]; providerId: string; valid: boolean } => {
  const envProvider = env.CAMPAIGN_OS_QUEUE_PROVIDER;
  const rawProviderId =
    requestedProviderId
    ?? (typeof envProvider === "string" && envProvider.trim().length > 0 ? envProvider : undefined)
    ?? (profileId === "production-required" ? "missing-provider" : "local-dry-run");

  if (isUnsafeProviderString(rawProviderId) || !isSafeProviderId(rawProviderId)) {
    return {
      diagnostics: [
        diagnostic("UNSAFE_QUEUE_PROVIDER_CONFIG", "providerId", "Queue provider id contains unsafe material."),
      ],
      providerId: "blocked-provider",
      valid: false,
    };
  }

  return {
    diagnostics: isSupportedProviderId(rawProviderId)
      ? []
      : [
        diagnostic(
          "QUEUE_PROVIDER_UNSUPPORTED",
          "providerId",
          `Queue provider is not supported by this no-live adapter foundation: ${sanitizeProviderString(rawProviderId)}`,
        ),
      ],
    providerId: rawProviderId,
    valid: isSupportedProviderId(rawProviderId),
  };
};

const resolveMode = (profileId: QueueProviderAdapterProfileId): QueueProviderAdapterMode => {
  if (profileId === "local-review") {
    return "dry_run";
  }

  if (profileId === "staging-scaffold") {
    return "metadata_only";
  }

  return "production_required";
};

const resolveStatus = (
  profileId: QueueProviderAdapterProfileId,
  blockerCount: number,
): QueueProviderAdapterFoundationStatus => {
  if (blockerCount > 0) {
    return "blocked";
  }

  return profileId === "local-review" ? "local_ready" : "scaffolded";
};

const createReadinessProjection = ({
  adapterId,
  blockerCount,
  diagnostics,
  driver,
  mode,
  observabilityExporter,
  providerId,
}: {
  adapterId: string;
  blockerCount: number;
  diagnostics: readonly QueueProviderDiagnostic[];
  driver: QueueProviderDriverSummary;
  mode: QueueProviderAdapterMode;
  observabilityExporter: QueueProviderObservabilityExporterSummary;
  providerId: string;
}): QueueProviderAdapterReadinessProjection => ({
  adapterId,
  blockerCount,
  diagnosticCodes: diagnostics.map((item) => item.code),
  disabledLiveOperationCount: queueProviderOperationCapabilities.filter((item) => item.liveEnabled === false).length,
  driverActivationGateSatisfied: driver.activationGateSatisfied,
  driverBlockerCount: driver.blockerCount,
  driverDeadLetterRouteCount: driver.deadLetterRouteCount,
  driverDiagnosticCodes: driver.diagnosticCodes,
  driverDisabledLiveOperationCount: driver.disabledLiveOperationCount,
  driverId: driver.driverId,
  driverLiveQueueConsumptionEnabled: false,
  driverLiveQueuePublishingEnabled: false,
  driverLiveWorkerExecutionEnabled: false,
  driverMode: driver.mode,
  driverOperationCount: driver.operationCount,
  driverProductionReady: false,
  driverProviderId: driver.providerId,
  driverConsumeAckAttempted: false,
  driverConsumeAttemptPolicy: driver.consumePosture.attemptPolicy,
  driverConsumeDeadLetterAttempted: false,
  driverConsumeDiagnosticCodes: [...driver.consumePosture.diagnosticCodes],
  driverConsumeNackAttempted: false,
  driverConsumeRequestEvaluated: false,
  driverConsumeResultStatus: driver.consumePosture.resultStatus,
  driverConsumeRetryScheduled: false,
  driverConsumingActivationStatus: driver.consumingReadiness.activationStatus,
  driverConsumingBlockerCount: driver.consumingReadiness.blockerCount,
  driverConsumingConsumerId: driver.consumingReadiness.consumerId,
  driverConsumingConsumerProvided: driver.consumingReadiness.consumerProvided,
  driverConsumingHandlerRegistryProvided: driver.consumingReadiness.handlerRegistryProvided,
  driverConsumingLiveConsumeAttempted: false,
  driverConsumingLiveQueueConsumptionEnabled: driver.consumingReadiness.liveQueueConsumptionEnabled,
  driverConsumingNoLiveSideEffects: { ...driver.consumingReadiness.noLiveSideEffects },
  driverConsumingProductionReady: false,
  driverConsumingRequiredConfigKeys: [...driver.consumingReadiness.requiredConfigKeys],
  driverConsumingStatus: driver.consumingReadiness.status,
  driverPublishAttemptPolicy: driver.publishPosture.attemptPolicy,
  driverPublishDiagnosticCodes: [...driver.publishPosture.diagnosticCodes],
  driverPublishRequestEvaluated: driver.publishPosture.publishRequestEvaluated,
  driverPublishResultStatus: driver.publishPosture.resultStatus,
  driverPublishingActivationStatus: driver.publishingReadiness.activationStatus,
  driverPublishingBlockerCount: driver.publishingReadiness.blockerCount,
  driverPublishingLivePublishAttempted: driver.publishPosture.livePublishAttempted,
  driverPublishingLiveQueuePublishingEnabled: driver.publishingReadiness.liveQueuePublishingEnabled,
  driverPublishingNoLiveSideEffects: { ...driver.publishingReadiness.noLiveSideEffects },
  driverPublishingPublisherId: driver.publishingReadiness.publisherId,
  driverPublishingPublisherProvided: driver.publishingReadiness.publisherProvided,
  driverPublishingRequiredConfigKeys: [...driver.publishingReadiness.requiredConfigKeys],
  driverPublishingStatus: driver.publishingReadiness.status,
  driverQueueRouteCount: driver.queueRouteCount,
  driverRequiredConfigKeys: driver.requiredConfigKeys,
  driverSdkBindingBlockerCount: driver.sdkBinding.blockerCount,
  driverSdkBindingDiagnosticCodes: driver.sdkBinding.diagnosticCodes,
  driverSdkBindingDisabledLiveOperationCount: driver.sdkBinding.disabledLiveOperationCount,
  driverSdkBindingId: driver.sdkBinding.bindingId,
  driverSdkBindingLiveProviderCallAttempted: false,
  driverSdkBindingLiveQueuePublishingEnabled: false,
  driverSdkBindingLiveWorkerExecutionEnabled: false,
  driverSdkBindingMode: driver.sdkBinding.mode,
  driverSdkBindingOperationCount: driver.sdkBinding.operationCount,
  driverSdkBindingPackageBindingBrokerConnectionBlockerCount: driver.sdkBinding.packageBinding.brokerConnectionBlockerCount,
  driverSdkBindingPackageBindingBrokerConnectionDiagnosticCodes: driver.sdkBinding.packageBinding.brokerConnectionDiagnosticCodes,
  driverSdkBindingPackageBindingBrokerConnectionHealthCheckMode: driver.sdkBinding.packageBinding.brokerConnectionHealthCheckMode,
  driverSdkBindingPackageBindingBrokerConnectionId: driver.sdkBinding.packageBinding.brokerConnectionId,
  driverSdkBindingPackageBindingBrokerConnectionRequiredConfigKeys: driver.sdkBinding.packageBinding.brokerConnectionRequiredConfigKeys,
  driverSdkBindingPackageBindingBrokerConnectionStatus: driver.sdkBinding.packageBinding.brokerConnectionStatus,
  driverSdkBindingPackageBindingBlockerCount: driver.sdkBinding.packageBinding.blockerCount,
  driverSdkBindingPackageBindingBrowserBundleAllowed: false,
  driverSdkBindingPackageBindingBullmqConstructionAttempted: driver.sdkBinding.packageBinding.bullmqConstructionAttempted,
  driverSdkBindingPackageBindingBullmqConstructionBlockerCount: driver.sdkBinding.packageBinding.bullmqConstructionBlockerCount,
  driverSdkBindingPackageBindingBullmqConstructionDiagnosticCodes: driver.sdkBinding.packageBinding.bullmqConstructionDiagnosticCodes,
  driverSdkBindingPackageBindingBullmqConstructionFactoryInvoked: driver.sdkBinding.packageBinding.bullmqConstructionFactoryInvoked,
  driverSdkBindingPackageBindingBullmqConstructionId: driver.sdkBinding.packageBinding.bullmqConstructionId,
  driverSdkBindingPackageBindingBullmqConstructionProductionReady: false,
  driverSdkBindingPackageBindingBullmqConstructionStatus: driver.sdkBinding.packageBinding.bullmqConstructionStatus,
  driverSdkBindingPackageBindingDiagnosticCodes: driver.sdkBinding.packageBinding.diagnosticCodes,
  driverSdkBindingPackageBindingFamily: driver.sdkBinding.packageBinding.family,
  driverSdkBindingPackageBindingId: driver.sdkBinding.packageBinding.bindingId,
  driverSdkBindingPackageBindingLiveBrokerConnectionAttempted: false,
  driverSdkBindingPackageBindingLiveBrokerHealthCheckAttempted: false,
  driverSdkBindingPackageBindingLiveQueuePublishingEnabled: false,
  driverSdkBindingPackageBindingLiveWorkerExecutionEnabled: false,
  driverSdkBindingPackageBindingPackageName: driver.sdkBinding.packageBinding.packageName,
  driverSdkBindingPackageBindingPackageRef: driver.sdkBinding.packageBinding.packageRef,
  driverSdkBindingPackageBindingQueueClientConstructed: driver.sdkBinding.packageBinding.queueClientConstructed,
  driverSdkBindingPackageBindingQueueEventsConstructed: driver.sdkBinding.packageBinding.queueEventsConstructed,
  driverSdkBindingPackageBindingSdkClientConstructed: false,
  driverSdkBindingPackageBindingStatus: driver.sdkBinding.packageBinding.status,
  driverSdkBindingPackageBindingWorkerConstructed: driver.sdkBinding.packageBinding.workerConstructed,
  driverSdkBindingProductionReady: false,
  driverSdkBindingProviderKind: driver.sdkBinding.providerKind,
  driverSdkBindingQueueRouteCount: driver.sdkBinding.queueRouteCount,
  driverSdkBindingRequiredConfigKeys: driver.sdkBinding.requiredConfigKeys,
  driverSdkBindingSdkClientConstructed: false,
  driverSdkBindingSdkPackageRef: driver.sdkBinding.sdkPackageRef,
  driverSdkBindingStatus: driver.sdkBinding.status,
  driverSdkBindingValid: driver.sdkBinding.valid,
  driverStatus: driver.status,
  driverValid: driver.valid,
  liveQueueConsumptionEnabled: false,
  liveQueuePublishingEnabled: false,
  liveWorkerExecutionEnabled: false,
  mode,
  observabilityExporterBlockerCount: observabilityExporter.blockerCount,
  observabilityExporterDiagnosticCodes: observabilityExporter.diagnosticCodes,
  observabilityExporterId: observabilityExporter.exporterId,
  observabilityExporterLiveTelemetryExportEnabled: false,
  observabilityExporterMode: observabilityExporter.mode,
  observabilityExporterRequiredConfigKeys: observabilityExporter.requiredConfigKeys,
  observabilityExporterSinkId: observabilityExporter.sinkId,
  observabilityExporterStatus: observabilityExporter.status,
  operationCount: queueProviderOperationCapabilities.length,
  productionReady: false,
  providerId,
  requiredConfigKeys: [
    ...new Set([
      ...queueProviderAdapterProductionPreconditions.flatMap((item) => item.requiredConfigKeys),
      ...driver.requiredConfigKeys,
      ...driver.publishingReadiness.requiredConfigKeys,
      ...driver.sdkBinding.requiredConfigKeys,
      ...driver.sdkBinding.packageBinding.brokerConnectionRequiredConfigKeys,
    ]),
  ],
});

const createDriverSummary = (
  driver: ReturnType<typeof createQueueProviderDriverFoundation>,
): QueueProviderDriverSummary => ({
  activationGateSatisfied: driver.readiness.activationGateSatisfied,
  blockerCount: driver.blockerCount,
  deadLetterRouteCount: driver.readiness.deadLetterRouteCount,
  diagnosticCodes: driver.diagnosticCodes,
  disabledLiveOperationCount: driver.readiness.disabledLiveOperationCount,
  driverId: driver.driverId,
  liveQueueConsumptionEnabled: false,
  liveQueuePublishingEnabled: false,
  liveWorkerExecutionEnabled: false,
  mode: driver.mode,
  operationCapabilities: driver.operationCapabilities.map((item) => ({ ...item })),
  operationCount: driver.readiness.operationCount,
  productionReady: false,
  providerId: driver.providerId,
  consumePosture: {
    ...driver.consumePosture,
    diagnosticCodes: [...driver.consumePosture.diagnosticCodes],
    noLiveSideEffects: { ...driver.consumePosture.noLiveSideEffects },
  },
  consumingReadiness: {
    ...driver.consumingReadiness,
    diagnosticCodes: [...driver.consumingReadiness.diagnosticCodes],
    noLiveSideEffects: { ...driver.consumingReadiness.noLiveSideEffects },
    requiredConfigKeys: [...driver.consumingReadiness.requiredConfigKeys],
  },
  publishPosture: {
    ...driver.publishPosture,
    diagnosticCodes: [...driver.publishPosture.diagnosticCodes],
    noLiveSideEffects: { ...driver.publishPosture.noLiveSideEffects },
  },
  publishingReadiness: {
    ...driver.publishingReadiness,
    diagnosticCodes: [...driver.publishingReadiness.diagnosticCodes],
    noLiveSideEffects: { ...driver.publishingReadiness.noLiveSideEffects },
    requiredConfigKeys: [...driver.publishingReadiness.requiredConfigKeys],
  },
  queueRouteCount: driver.readiness.queueRouteCount,
  requiredConfigKeys: driver.readiness.requiredConfigKeys,
  sdkBinding: {
    ...driver.sdkBinding,
    brokerConnectionDiagnosticCodes: [...driver.sdkBinding.brokerConnectionDiagnosticCodes],
    brokerConnectionRequiredConfigKeys: [...driver.sdkBinding.brokerConnectionRequiredConfigKeys],
    diagnosticCodes: [...driver.sdkBinding.diagnosticCodes],
    operationCapabilities: driver.sdkBinding.operationCapabilities.map((item) => ({ ...item })),
    packageBinding: {
      ...driver.sdkBinding.packageBinding,
      brokerConnection: {
        ...driver.sdkBinding.packageBinding.brokerConnection,
        diagnosticCodes: [...driver.sdkBinding.packageBinding.brokerConnection.diagnosticCodes],
        requiredConfigKeys: [...driver.sdkBinding.packageBinding.brokerConnection.requiredConfigKeys],
      },
      brokerConnectionDiagnosticCodes: [...driver.sdkBinding.packageBinding.brokerConnectionDiagnosticCodes],
      brokerConnectionRequiredConfigKeys: [...driver.sdkBinding.packageBinding.brokerConnectionRequiredConfigKeys],
      diagnosticCodes: [...driver.sdkBinding.packageBinding.diagnosticCodes],
      requiredConfigKeys: [...driver.sdkBinding.packageBinding.requiredConfigKeys],
    },
    requiredConfigKeys: [...driver.sdkBinding.requiredConfigKeys],
  },
  status: driver.status,
  valid: driver.valid,
});

const createObservabilityExporterSummary = (
  observabilityExporter: ReturnType<typeof createObservabilityExporterFoundation>,
): QueueProviderObservabilityExporterSummary => ({
  adapterId: observabilityExporter.adapterId,
  blockerCount: observabilityExporter.blockerCount,
  diagnosticCodes: observabilityExporter.diagnosticCodes,
  disabledLiveOperationCount: observabilityExporter.readiness.disabledLiveOperationCount,
  exporterId: observabilityExporter.exporterId,
  liveAlertRoutingEnabled: false,
  liveLogExportEnabled: false,
  liveMetricsExportEnabled: false,
  liveTelemetryExportEnabled: false,
  liveTraceExportEnabled: false,
  metricNamespace: observabilityExporter.metricNamespace,
  mode: observabilityExporter.mode,
  operationCapabilities: observabilityExporter.operationCapabilities.map((item) => ({ ...item })),
  operationCount: observabilityExporter.readiness.operationCount,
  productionReady: false,
  requiredConfigKeys: observabilityExporter.readiness.requiredConfigKeys,
  sinkId: observabilityExporter.sinkId,
  status: observabilityExporter.status,
  valid: observabilityExporter.valid,
});

const sanitizeProviderString = (value: string): string => {
  const redacted = redactQueueProviderAdapterValue(value);

  return typeof redacted === "string" ? redacted : REDACTED_VALUE;
};

const mapAdapterProviderToDriverProvider = (providerId: string): string => {
  const mapping: Record<string, string> = {
    "local-dry-run": "local-fake",
    "metadata-only": "metadata-only",
    "production-queue-provider": "production-queue-provider",
  };

  return mapping[providerId] ?? providerId;
};

const isSupportedProviderId = (value: string): boolean =>
  value === "local-dry-run" || value === "metadata-only" || value === "production-queue-provider";

const isSafeProviderId = (value: string): boolean =>
  /^[a-z][a-z0-9-]{2,63}$/i.test(value);

const isSensitiveProviderKey = (key: string): boolean =>
  /api[-_]?key|bearer|credential|lease[-_]?token|object[-_]?key|payload|private[-_]?key|provider[-_]?url|queue[-_]?url|secret|signed[-_]?url|token|webhook|wallet/i.test(
    key,
  );

const isUnsafeProviderString = (value: string): boolean =>
  isCredentialedUrl(value)
  || isLikelyObjectKey(value)
  || isSensitiveProviderString(value)
  || isWalletAddressString(value)
  || isRawProviderPayload(value);

const isSensitiveProviderString = (value: string): boolean =>
  /(api[-_]?key|bearer\s+|hook-secret|lease-token|private[-_]?key|queue-secret|secret|token=|worker-token|x-amz-signature=|signed-url)/i.test(
    value,
  );

const isCredentialedUrl = (value: string): boolean => {
  try {
    const url = new URL(value);

    return Boolean(url.username || url.password || url.searchParams.size > 0);
  } catch {
    return false;
  }
};

const isLikelyObjectKey = (value: string): boolean =>
  /^[a-z0-9][a-z0-9-_]*\/.+\.(csv|json|jsonl|parquet|zip)$/i.test(value)
  || /(^|\/)(exports?|evidence|attachments?|queue-payloads?)\/.+\.(csv|json|jsonl|parquet|zip)$/i.test(value);

const isWalletAddressString = (value: string): boolean =>
  /ELF_[A-Za-z0-9_]+|wallet[-_]?address/i.test(value);

const isRawProviderPayload = (value: string): boolean => {
  const trimmed = value.trim();

  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
    return false;
  }

  return /address|job|payload|provider|queue|task|wallet/i.test(trimmed);
};
