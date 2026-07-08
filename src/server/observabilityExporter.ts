import type { BackendRuntimeProfileId } from "./backendProfiles";

export type ObservabilityExporterProfileId = BackendRuntimeProfileId;
export type ObservabilityExporterFoundationStatus = "local_ready" | "scaffolded" | "blocked";
export type ObservabilityExporterMode = "dry_run" | "metadata_only" | "production_required";
export type ObservabilityExporterOperation =
  | "metrics"
  | "logs"
  | "traces"
  | "alerts"
  | "retry"
  | "dead_letter"
  | "sampling"
  | "redaction";
export type ObservabilityExporterDiagnosticSeverity = "error" | "warning" | "info";
export type ObservabilityExporterDiagnosticCode =
  | "UNKNOWN_OBSERVABILITY_PROFILE"
  | "OBSERVABILITY_EXPORTER_MISSING"
  | "OBSERVABILITY_EXPORTER_UNSUPPORTED"
  | "OBSERVABILITY_ENDPOINT_MISSING"
  | "OBSERVABILITY_CREDENTIALS_MISSING"
  | "OBSERVABILITY_SINK_MISSING"
  | "OBSERVABILITY_METRIC_NAMESPACE_MISSING"
  | "OBSERVABILITY_RETENTION_POLICY_MISSING"
  | "OBSERVABILITY_TRACE_COLLECTOR_MISSING"
  | "OBSERVABILITY_LOG_SINK_MISSING"
  | "OBSERVABILITY_ALERT_ROUTING_MISSING"
  | "OBSERVABILITY_RETRY_DEAD_LETTER_POLICY_MISSING"
  | "OBSERVABILITY_REDACTION_POLICY_MISSING"
  | "OBSERVABILITY_RUNBOOK_MISSING"
  | "UNKNOWN_OBSERVABILITY_EVENT_CATEGORY"
  | "MISSING_TRACE_ID"
  | "UNSAFE_METRIC_NAME"
  | "UNSAFE_OBSERVABILITY_LABELS"
  | "UNSAFE_SOURCE_RUNTIME"
  | "INVALID_OBSERVABILITY_TIMESTAMP"
  | "UNSAFE_PAYLOAD_REFERENCE"
  | "OBSERVABILITY_DRY_RUN_DROPPED"
  | "UNSAFE_OBSERVABILITY_CONFIG";
export type ObservabilityPreconditionArea =
  | "alerts"
  | "auth"
  | "exporter"
  | "logs"
  | "metrics"
  | "redaction"
  | "retention"
  | "retry"
  | "runbook"
  | "sink"
  | "traces";
export type ObservabilityEventCategory =
  | "api"
  | "backend"
  | "contract"
  | "provider"
  | "queue"
  | "reward"
  | "scheduler"
  | "storage"
  | "worker";
export type ObservabilitySourceRuntime =
  | "api-runtime"
  | "backend-service"
  | "backend-smoke"
  | "queue-provider-adapter"
  | "queue-runtime"
  | "scheduler-runtime"
  | "server-readiness"
  | "worker-idempotency-store"
  | "worker-lease-store";
export type ObservabilityDryRunLabelValue = boolean | number | string;
export type ObservabilityDryRunStatus = "accepted_dry_run" | "rejected" | "dropped_with_diagnostic";

export interface ObservabilityExporterNoLiveFlags {
  liveAlertRoutingEnabled: false;
  liveAnalyticsIngestionEnabled: false;
  liveContractCallsEnabled: false;
  liveDeadLetterPublishingEnabled: false;
  liveLogExportEnabled: false;
  liveMetricsExportEnabled: false;
  liveObjectStorageEnabled: false;
  liveProviderCallsEnabled: false;
  liveQueuePublishingEnabled: false;
  liveRetryExecutionEnabled: false;
  liveRewardDistributionEnabled: false;
  liveTelemetryExportEnabled: false;
  liveTraceExportEnabled: false;
  liveWorkerExecutionEnabled: false;
}

export interface ObservabilityExporterProductionPrecondition {
  area: ObservabilityPreconditionArea;
  diagnosticCode: ObservabilityExporterDiagnosticCode;
  field: string;
  id: string;
  message: string;
  requiredBeforeProduction: true;
  requiredConfigKeys: string[];
  status: "blocked" | "deferred";
}

export interface ObservabilityExporterDiagnostic {
  code: ObservabilityExporterDiagnosticCode;
  field: string;
  message: string;
  severity: ObservabilityExporterDiagnosticSeverity;
}

export interface ObservabilityExporterOperationCapability {
  liveEnabled: false;
  operation: ObservabilityExporterOperation;
  operatorNextAction: string;
  requiredBeforeProduction: boolean;
  requiredConfigKeys: string[];
  supported: boolean;
}

export type QueueProviderSdkBindingMetricsMetadataStatus =
  | "activation_gate_disabled"
  | "configured_metadata_only"
  | "missing_required_config";

export interface QueueProviderSdkBindingMetricsMetadata {
  activationGateSatisfied: boolean;
  configuredConfigKeys: string[];
  handoffMode: "metadata_only";
  liveAlertRoutingEnabled: false;
  liveLogExportEnabled: false;
  liveMetricsExportEnabled: false;
  liveTelemetryExportEnabled: false;
  liveTraceExportEnabled: false;
  requiredConfigKeys: string[];
  source: "queue-provider-sdk-binding-readiness";
  status: QueueProviderSdkBindingMetricsMetadataStatus;
  vendorSdkCallsEnabled: false;
}

export interface ObservabilityExporterReadinessProjection {
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
  operationCount: number;
  productionReady: false;
  queueProviderSdkBindingMetricsMetadata: QueueProviderSdkBindingMetricsMetadata;
  requiredConfigKeys: string[];
  sinkId: string;
  status: ObservabilityExporterFoundationStatus;
}

export interface ObservabilityExporterFoundationSummary {
  adapterId: string;
  blockerCount: number;
  diagnosticCodes: ObservabilityExporterDiagnosticCode[];
  diagnostics: ObservabilityExporterDiagnostic[];
  exporterId: string;
  id: "campaign-os-observability-exporter-foundation";
  metricNamespace: string;
  mode: ObservabilityExporterMode;
  noLiveFlags: ObservabilityExporterNoLiveFlags;
  operationCapabilities: ObservabilityExporterOperationCapability[];
  preconditions: ObservabilityExporterProductionPrecondition[];
  productionReady: false;
  profileId: ObservabilityExporterProfileId;
  readiness: ObservabilityExporterReadinessProjection;
  sinkId: string;
  status: ObservabilityExporterFoundationStatus;
  valid: boolean;
}

export interface CreateObservabilityExporterFoundationOptions {
  env?: Record<string, unknown>;
  exporterId?: string;
  metricNamespace?: string;
  profileId?: string;
  sinkId?: string;
}

export interface ObservabilityDryRunRequest {
  captureMode?: "capture" | "drop";
  eventCategory: string;
  labels?: Record<string, ObservabilityDryRunLabelValue>;
  metricName: string;
  observedAt?: string;
  operation: ObservabilityExporterOperation;
  payloadReference?: string;
  sourceRuntime: string;
  traceId: string;
}

export interface ObservabilityDryRunResult {
  accepted: boolean;
  diagnosticCodes: ObservabilityExporterDiagnosticCode[];
  diagnostics: ObservabilityExporterDiagnostic[];
  eventCategory?: ObservabilityEventCategory;
  labels?: Record<string, ObservabilityDryRunLabelValue>;
  liveAlertRoutingEnabled: false;
  liveLogExportEnabled: false;
  liveMetricsExportEnabled: false;
  liveTelemetryExportAttempted: false;
  liveTraceExportEnabled: false;
  metricName?: string;
  observedAt?: string;
  operation?: ObservabilityExporterOperation;
  payloadReference?: string;
  productionWriteAttempted: false;
  sourceRuntime?: ObservabilitySourceRuntime;
  status: ObservabilityDryRunStatus;
  traceId?: string;
}

const FOUNDATION_ID = "campaign-os-observability-exporter-foundation" as const;
const REDACTED_VALUE = "[redacted]";
const RAW_OBSERVABILITY_PAYLOAD_VALUE = "[redacted-observability-payload]";
const DEFAULT_METRIC_NAMESPACE = "campaign-os-runtime";
const QUEUE_PROVIDER_SDK_BINDING_REQUIRED_CONFIG_KEYS = [
  "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE",
  "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_BINDING",
  "CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER",
  "CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT",
  "CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS",
  "CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT",
] as const;

export const SUPPORTED_OBSERVABILITY_EXPORTER_PROFILES: ObservabilityExporterProfileId[] = [
  "local-review",
  "staging-scaffold",
  "production-required",
];

export const observabilityExporterNoLiveFlags: ObservabilityExporterNoLiveFlags = {
  liveAlertRoutingEnabled: false,
  liveAnalyticsIngestionEnabled: false,
  liveContractCallsEnabled: false,
  liveDeadLetterPublishingEnabled: false,
  liveLogExportEnabled: false,
  liveMetricsExportEnabled: false,
  liveObjectStorageEnabled: false,
  liveProviderCallsEnabled: false,
  liveQueuePublishingEnabled: false,
  liveRetryExecutionEnabled: false,
  liveRewardDistributionEnabled: false,
  liveTelemetryExportEnabled: false,
  liveTraceExportEnabled: false,
  liveWorkerExecutionEnabled: false,
};

export const observabilityExporterProductionPreconditions: ObservabilityExporterProductionPrecondition[] = [
  {
    area: "exporter",
    diagnosticCode: "OBSERVABILITY_EXPORTER_MISSING",
    field: "CAMPAIGN_OS_OBSERVABILITY_EXPORTER",
    id: "observability-exporter-selection",
    message: "Observability exporter selection is required before live telemetry export.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_OBSERVABILITY_EXPORTER"],
    status: "blocked",
  },
  {
    area: "exporter",
    diagnosticCode: "OBSERVABILITY_ENDPOINT_MISSING",
    field: "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
    id: "observability-exporter-endpoint",
    message: "Observability exporter endpoint is required before live telemetry export.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL"],
    status: "blocked",
  },
  {
    area: "auth",
    diagnosticCode: "OBSERVABILITY_CREDENTIALS_MISSING",
    field: "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_CREDENTIALS",
    id: "observability-exporter-credentials",
    message: "Observability exporter credentials are required before live telemetry export.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_OBSERVABILITY_EXPORTER_CREDENTIALS"],
    status: "blocked",
  },
  {
    area: "sink",
    diagnosticCode: "OBSERVABILITY_SINK_MISSING",
    field: "CAMPAIGN_OS_OBSERVABILITY_SINK",
    id: "observability-sink-registration",
    message: "Metrics sink registration is required before live observability export.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_OBSERVABILITY_SINK"],
    status: "blocked",
  },
  {
    area: "metrics",
    diagnosticCode: "OBSERVABILITY_METRIC_NAMESPACE_MISSING",
    field: "CAMPAIGN_OS_OBSERVABILITY_METRIC_NAMESPACE",
    id: "observability-metric-namespace",
    message: "Metric namespace is required before live metrics export.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_OBSERVABILITY_METRIC_NAMESPACE"],
    status: "blocked",
  },
  {
    area: "retention",
    diagnosticCode: "OBSERVABILITY_RETENTION_POLICY_MISSING",
    field: "CAMPAIGN_OS_OBSERVABILITY_RETENTION_DAYS",
    id: "observability-retention-policy",
    message: "Retention policy is required before live observability storage.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_OBSERVABILITY_RETENTION_DAYS"],
    status: "blocked",
  },
  {
    area: "traces",
    diagnosticCode: "OBSERVABILITY_TRACE_COLLECTOR_MISSING",
    field: "CAMPAIGN_OS_OBSERVABILITY_TRACE_COLLECTOR_URL",
    id: "observability-trace-collector",
    message: "Trace collector is required before live trace export.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_OBSERVABILITY_TRACE_COLLECTOR_URL"],
    status: "blocked",
  },
  {
    area: "logs",
    diagnosticCode: "OBSERVABILITY_LOG_SINK_MISSING",
    field: "CAMPAIGN_OS_OBSERVABILITY_LOG_SINK_URL",
    id: "observability-log-sink",
    message: "Structured log sink is required before live log export.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_OBSERVABILITY_LOG_SINK_URL"],
    status: "blocked",
  },
  {
    area: "alerts",
    diagnosticCode: "OBSERVABILITY_ALERT_ROUTING_MISSING",
    field: "CAMPAIGN_OS_OBSERVABILITY_ALERT_ROUTING",
    id: "observability-alert-routing",
    message: "Alert routing policy is required before live alert delivery.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_OBSERVABILITY_ALERT_ROUTING"],
    status: "blocked",
  },
  {
    area: "retry",
    diagnosticCode: "OBSERVABILITY_RETRY_DEAD_LETTER_POLICY_MISSING",
    field: "CAMPAIGN_OS_OBSERVABILITY_RETRY_DEAD_LETTER_POLICY",
    id: "observability-retry-dead-letter-policy",
    message: "Retry and dead-letter policy is required before live exporter retry handling.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_OBSERVABILITY_RETRY_DEAD_LETTER_POLICY"],
    status: "blocked",
  },
  {
    area: "redaction",
    diagnosticCode: "OBSERVABILITY_REDACTION_POLICY_MISSING",
    field: "CAMPAIGN_OS_OBSERVABILITY_REDACTION_POLICY",
    id: "observability-redaction-policy",
    message: "Redaction policy is required before live observability payload handling.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_OBSERVABILITY_REDACTION_POLICY"],
    status: "blocked",
  },
  {
    area: "runbook",
    diagnosticCode: "OBSERVABILITY_RUNBOOK_MISSING",
    field: "CAMPAIGN_OS_OBSERVABILITY_RUNBOOK_URL",
    id: "observability-operator-runbook",
    message: "Operator runbook is required before production observability handoff.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_OBSERVABILITY_RUNBOOK_URL"],
    status: "deferred",
  },
];

export const observabilityExporterOperationCapabilities: ObservabilityExporterOperationCapability[] = [
  capability("metrics", true, true, ["CAMPAIGN_OS_OBSERVABILITY_METRIC_NAMESPACE"]),
  capability("logs", true, true, ["CAMPAIGN_OS_OBSERVABILITY_LOG_SINK_URL"]),
  capability("traces", true, true, ["CAMPAIGN_OS_OBSERVABILITY_TRACE_COLLECTOR_URL"]),
  capability("alerts", true, true, ["CAMPAIGN_OS_OBSERVABILITY_ALERT_ROUTING"]),
  capability("retry", true, true, ["CAMPAIGN_OS_OBSERVABILITY_RETRY_DEAD_LETTER_POLICY"]),
  capability("dead_letter", true, true, ["CAMPAIGN_OS_OBSERVABILITY_RETRY_DEAD_LETTER_POLICY"]),
  capability("sampling", true, false, ["CAMPAIGN_OS_OBSERVABILITY_RETENTION_DAYS"]),
  capability("redaction", true, true, ["CAMPAIGN_OS_OBSERVABILITY_REDACTION_POLICY"]),
];

export const observabilityEventCategories: ObservabilityEventCategory[] = [
  "api",
  "backend",
  "contract",
  "provider",
  "queue",
  "reward",
  "scheduler",
  "storage",
  "worker",
];

export const observabilitySourceRuntimes: ObservabilitySourceRuntime[] = [
  "api-runtime",
  "backend-service",
  "backend-smoke",
  "queue-provider-adapter",
  "queue-runtime",
  "scheduler-runtime",
  "server-readiness",
  "worker-idempotency-store",
  "worker-lease-store",
];

export const createObservabilityExporterFoundation = (
  options: CreateObservabilityExporterFoundationOptions = {},
): ObservabilityExporterFoundationSummary => {
  const env = options.env ?? {};
  const profileResolution = resolveProfile(options.profileId);
  const mode = resolveMode(profileResolution.profileId);
  const exporterResolution = resolveExporterId(options.exporterId, env, profileResolution.profileId);
  const sinkResolution = resolveSinkId(options.sinkId, env, profileResolution.profileId);
  const namespaceResolution = resolveMetricNamespace(options.metricNamespace, env);
  const productionDiagnostics =
    profileResolution.profileId === "production-required" ? createProductionDiagnostics(env) : [];
  const diagnostics = [
    ...profileResolution.diagnostics,
    ...exporterResolution.diagnostics,
    ...sinkResolution.diagnostics,
    ...namespaceResolution.diagnostics,
    ...productionDiagnostics,
  ];
  const blockerCount = diagnostics.filter((item) => item.severity === "error").length;
  const status = resolveStatus(profileResolution.profileId, blockerCount);
  const adapterId = `${exporterResolution.exporterId}-observability-exporter-adapter`;
  const readiness = createReadinessProjection({
    adapterId,
    blockerCount,
    diagnostics,
    env,
    exporterId: exporterResolution.exporterId,
    metricNamespace: namespaceResolution.metricNamespace,
    mode,
    sinkId: sinkResolution.sinkId,
    status,
  });

  return {
    adapterId,
    blockerCount,
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    exporterId: exporterResolution.exporterId,
    id: FOUNDATION_ID,
    metricNamespace: namespaceResolution.metricNamespace,
    mode,
    noLiveFlags: observabilityExporterNoLiveFlags,
    operationCapabilities: observabilityExporterOperationCapabilities.map((item) => ({ ...item })),
    preconditions: observabilityExporterProductionPreconditions.map((item) => ({ ...item })),
    productionReady: false,
    profileId: profileResolution.profileId,
    readiness,
    sinkId: sinkResolution.sinkId,
    status,
    valid:
      profileResolution.valid
      && exporterResolution.valid
      && sinkResolution.valid
      && namespaceResolution.valid
      && blockerCount === 0,
  };
};

export const captureObservabilityDryRun = (
  request: ObservabilityDryRunRequest,
): ObservabilityDryRunResult => {
  const diagnostics = validateDryRunRequest(request);
  const validationPassed = diagnostics.length === 0;
  const shouldDrop = validationPassed && request.captureMode === "drop";
  const finalDiagnostics = shouldDrop
    ? [
      ...diagnostics,
      diagnostic(
        "OBSERVABILITY_DRY_RUN_DROPPED",
        "captureMode",
        "Observability dry-run was intentionally dropped without a live export.",
        "info",
      ),
    ]
    : diagnostics;
  const accepted = validationPassed && !shouldDrop;
  const redactedRequest = redactObservabilityExporterValue(request) as ObservabilityDryRunRequest;

  return {
    accepted,
    diagnosticCodes: finalDiagnostics.map((item) => item.code),
    diagnostics: finalDiagnostics,
    eventCategory: accepted || shouldDrop ? request.eventCategory as ObservabilityEventCategory : undefined,
    labels: accepted || shouldDrop ? redactedRequest.labels : undefined,
    liveAlertRoutingEnabled: false,
    liveLogExportEnabled: false,
    liveMetricsExportEnabled: false,
    liveTelemetryExportAttempted: false,
    liveTraceExportEnabled: false,
    metricName: accepted || shouldDrop ? request.metricName : undefined,
    observedAt: accepted || shouldDrop ? request.observedAt : undefined,
    operation: accepted || shouldDrop ? request.operation : undefined,
    payloadReference: accepted || shouldDrop ? redactedRequest.payloadReference : undefined,
    productionWriteAttempted: false,
    sourceRuntime: accepted || shouldDrop ? request.sourceRuntime as ObservabilitySourceRuntime : undefined,
    status: shouldDrop ? "dropped_with_diagnostic" : accepted ? "accepted_dry_run" : "rejected",
    traceId: accepted || shouldDrop ? request.traceId : undefined,
  };
};

export const redactObservabilityExporterValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => redactObservabilityExporterValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (isSensitiveObservabilityKey(key) && !isSafeSerializableObservabilityKey(key, nestedValue)) {
          return [key, REDACTED_VALUE];
        }

        return [key, redactObservabilityExporterValue(nestedValue)];
      }),
    );
  }

  if (typeof value !== "string") {
    return value;
  }

  if (isRawObservabilityPayload(value)) {
    return RAW_OBSERVABILITY_PAYLOAD_VALUE;
  }

  if (isUnsafeObservabilityString(value)) {
    return REDACTED_VALUE;
  }

  return value;
};

function capability(
  operation: ObservabilityExporterOperation,
  supported: boolean,
  requiredBeforeProduction: boolean,
  requiredConfigKeys: string[],
): ObservabilityExporterOperationCapability {
  return {
    liveEnabled: false,
    operation,
    operatorNextAction: operationNextAction(operation),
    requiredBeforeProduction,
    requiredConfigKeys,
    supported,
  };
}

function operationNextAction(operation: ObservabilityExporterOperation): string {
  const labels: Record<ObservabilityExporterOperation, string> = {
    alerts: "Expose alert routing metadata only; do not deliver live alerts.",
    dead_letter: "Expose dead-letter posture only; do not publish dead-letter telemetry.",
    logs: "Keep structured log export metadata-only until a live sink is approved.",
    metrics: "Capture local dry-run metrics metadata only; do not export metrics.",
    redaction: "Apply local redaction rules before any diagnostics are serialized.",
    retry: "Expose retry policy metadata only; do not schedule live exporter retries.",
    sampling: "Expose sampling posture only; do not sample live production streams.",
    traces: "Capture trace references locally only; do not export spans.",
  };

  return labels[operation];
}

const diagnostic = (
  code: ObservabilityExporterDiagnosticCode,
  field: string,
  message: string,
  severity: ObservabilityExporterDiagnosticSeverity = "error",
): ObservabilityExporterDiagnostic => ({
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

const isQueueProviderSdkBindingActivationGateSatisfied = (env: Record<string, unknown>): boolean => {
  const value = env.CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT;

  return typeof value === "string" && /^(enabled|explicitly-enabled|true)$/i.test(value.trim());
};

const createProductionDiagnostics = (
  env: Record<string, unknown>,
): ObservabilityExporterDiagnostic[] =>
  observabilityExporterProductionPreconditions
    .filter((item) => !hasConfiguredValue(env, item.requiredConfigKeys))
    .map((item) => diagnostic(item.diagnosticCode, item.field, item.message));

const isObservabilityExporterProfileId = (value: string): value is ObservabilityExporterProfileId =>
  SUPPORTED_OBSERVABILITY_EXPORTER_PROFILES.includes(value as ObservabilityExporterProfileId);

const resolveProfile = (
  requestedProfileId: string | undefined,
): { diagnostics: ObservabilityExporterDiagnostic[]; profileId: ObservabilityExporterProfileId; valid: boolean } => {
  const profileId = requestedProfileId ?? "local-review";

  if (isObservabilityExporterProfileId(profileId)) {
    return {
      diagnostics: [],
      profileId,
      valid: true,
    };
  }

  return {
    diagnostics: [
      diagnostic(
        "UNKNOWN_OBSERVABILITY_PROFILE",
        "profileId",
        `Unsupported observability exporter profile: ${sanitizeObservabilityString(profileId)}`,
      ),
    ],
    profileId: "production-required",
    valid: false,
  };
};

const resolveExporterId = (
  requestedExporterId: string | undefined,
  env: Record<string, unknown>,
  profileId: ObservabilityExporterProfileId,
): { diagnostics: ObservabilityExporterDiagnostic[]; exporterId: string; valid: boolean } => {
  const envExporter = env.CAMPAIGN_OS_OBSERVABILITY_EXPORTER;
  const rawExporterId =
    requestedExporterId
    ?? (typeof envExporter === "string" && envExporter.trim().length > 0 ? envExporter : undefined)
    ?? (profileId === "production-required" ? "missing-observability-exporter" : "local-dry-run");

  if (isUnsafeObservabilityString(rawExporterId) || !isSafeIdentifier(rawExporterId)) {
    return {
      diagnostics: [
        diagnostic("UNSAFE_OBSERVABILITY_CONFIG", "exporterId", "Observability exporter id contains unsafe material."),
      ],
      exporterId: "blocked-observability-exporter",
      valid: false,
    };
  }

  return {
    diagnostics: isSupportedExporterId(rawExporterId)
      ? []
      : [
        diagnostic(
          "OBSERVABILITY_EXPORTER_UNSUPPORTED",
          "exporterId",
          `Observability exporter is not supported by this no-live foundation: ${sanitizeObservabilityString(
            rawExporterId,
          )}`,
        ),
      ],
    exporterId: rawExporterId,
    valid: isSupportedExporterId(rawExporterId),
  };
};

const resolveSinkId = (
  requestedSinkId: string | undefined,
  env: Record<string, unknown>,
  profileId: ObservabilityExporterProfileId,
): { diagnostics: ObservabilityExporterDiagnostic[]; sinkId: string; valid: boolean } => {
  const envSink = env.CAMPAIGN_OS_OBSERVABILITY_SINK;
  const rawSinkId =
    requestedSinkId
    ?? (typeof envSink === "string" && envSink.trim().length > 0 ? envSink : undefined)
    ?? (profileId === "production-required" ? "missing-observability-sink" : "local-metrics-sink");

  if (isUnsafeObservabilityString(rawSinkId) || !isSafeIdentifier(rawSinkId)) {
    return {
      diagnostics: [
        diagnostic("UNSAFE_OBSERVABILITY_CONFIG", "sinkId", "Observability sink id contains unsafe material."),
      ],
      sinkId: "blocked-observability-sink",
      valid: false,
    };
  }

  return {
    diagnostics: isSupportedSinkId(rawSinkId)
      ? []
      : [
        diagnostic(
          "OBSERVABILITY_EXPORTER_UNSUPPORTED",
          "sinkId",
          `Observability sink is not supported by this no-live foundation: ${sanitizeObservabilityString(rawSinkId)}`,
        ),
      ],
    sinkId: rawSinkId,
    valid: isSupportedSinkId(rawSinkId),
  };
};

const resolveMetricNamespace = (
  requestedMetricNamespace: string | undefined,
  env: Record<string, unknown>,
): { diagnostics: ObservabilityExporterDiagnostic[]; metricNamespace: string; valid: boolean } => {
  const envNamespace = env.CAMPAIGN_OS_OBSERVABILITY_METRIC_NAMESPACE;
  const metricNamespace =
    requestedMetricNamespace
    ?? (typeof envNamespace === "string" && envNamespace.trim().length > 0 ? envNamespace.trim() : undefined)
    ?? DEFAULT_METRIC_NAMESPACE;

  if (isSafeMetricNamespace(metricNamespace) && !isUnsafeObservabilityString(metricNamespace)) {
    return {
      diagnostics: [],
      metricNamespace,
      valid: true,
    };
  }

  return {
    diagnostics: [
      diagnostic("UNSAFE_OBSERVABILITY_CONFIG", "metricNamespace", "Metric namespace contains unsafe material."),
    ],
    metricNamespace: "blocked-observability-namespace",
    valid: false,
  };
};

const resolveMode = (profileId: ObservabilityExporterProfileId): ObservabilityExporterMode => {
  if (profileId === "local-review") {
    return "dry_run";
  }

  if (profileId === "staging-scaffold") {
    return "metadata_only";
  }

  return "production_required";
};

const resolveStatus = (
  profileId: ObservabilityExporterProfileId,
  blockerCount: number,
): ObservabilityExporterFoundationStatus => {
  if (blockerCount > 0) {
    return "blocked";
  }

  return profileId === "local-review" ? "local_ready" : "scaffolded";
};

const createReadinessProjection = ({
  adapterId,
  blockerCount,
  diagnostics,
  env,
  exporterId,
  metricNamespace,
  mode,
  sinkId,
  status,
}: {
  adapterId: string;
  blockerCount: number;
  diagnostics: readonly ObservabilityExporterDiagnostic[];
  env: Record<string, unknown>;
  exporterId: string;
  metricNamespace: string;
  mode: ObservabilityExporterMode;
  sinkId: string;
  status: ObservabilityExporterFoundationStatus;
}): ObservabilityExporterReadinessProjection => ({
  adapterId,
  blockerCount,
  diagnosticCodes: diagnostics.map((item) => item.code),
  disabledLiveOperationCount: observabilityExporterOperationCapabilities.filter((item) => item.liveEnabled === false)
    .length,
  exporterId,
  liveAlertRoutingEnabled: false,
  liveLogExportEnabled: false,
  liveMetricsExportEnabled: false,
  liveTelemetryExportEnabled: false,
  liveTraceExportEnabled: false,
  metricNamespace,
  mode,
  operationCount: observabilityExporterOperationCapabilities.length,
  productionReady: false,
  queueProviderSdkBindingMetricsMetadata: createQueueProviderSdkBindingMetricsMetadata(env),
  requiredConfigKeys: [
    ...new Set(observabilityExporterProductionPreconditions.flatMap((item) => item.requiredConfigKeys)),
  ],
  sinkId,
  status,
});

const createQueueProviderSdkBindingMetricsMetadata = (
  env: Record<string, unknown>,
): QueueProviderSdkBindingMetricsMetadata => {
  const configuredConfigKeys = QUEUE_PROVIDER_SDK_BINDING_REQUIRED_CONFIG_KEYS.filter((key) =>
    hasConfiguredValue(env, [key]),
  );
  const activationGateSatisfied = isQueueProviderSdkBindingActivationGateSatisfied(env);
  const hasRequiredConfig = configuredConfigKeys.length === QUEUE_PROVIDER_SDK_BINDING_REQUIRED_CONFIG_KEYS.length;

  return {
    activationGateSatisfied,
    configuredConfigKeys: [...configuredConfigKeys],
    handoffMode: "metadata_only",
    liveAlertRoutingEnabled: false,
    liveLogExportEnabled: false,
    liveMetricsExportEnabled: false,
    liveTelemetryExportEnabled: false,
    liveTraceExportEnabled: false,
    requiredConfigKeys: [...QUEUE_PROVIDER_SDK_BINDING_REQUIRED_CONFIG_KEYS],
    source: "queue-provider-sdk-binding-readiness",
    status: !hasRequiredConfig
      ? "missing_required_config"
      : activationGateSatisfied
        ? "configured_metadata_only"
        : "activation_gate_disabled",
    vendorSdkCallsEnabled: false,
  };
};

const validateDryRunRequest = (
  request: ObservabilityDryRunRequest,
): ObservabilityExporterDiagnostic[] => {
  const diagnostics: ObservabilityExporterDiagnostic[] = [];

  if (!request.traceId.trim()) {
    diagnostics.push(diagnostic("MISSING_TRACE_ID", "traceId", "Trace id is required for observability dry-run."));
  }

  if (!isKnownEventCategory(request.eventCategory)) {
    diagnostics.push(
      diagnostic(
        "UNKNOWN_OBSERVABILITY_EVENT_CATEGORY",
        "eventCategory",
        "Event category is not part of the observability dry-run catalog.",
      ),
    );
  }

  if (!isSafeMetricName(request.metricName) || isUnsafeObservabilityString(request.metricName)) {
    diagnostics.push(diagnostic("UNSAFE_METRIC_NAME", "metricName", "Metric name contains unsafe material."));
  }

  if (!isSafeLabels(request.labels)) {
    diagnostics.push(
      diagnostic("UNSAFE_OBSERVABILITY_LABELS", "labels", "Metric labels contain unsafe material."),
    );
  }

  if (!isKnownSourceRuntime(request.sourceRuntime) || isUnsafeObservabilityString(request.sourceRuntime)) {
    diagnostics.push(
      diagnostic("UNSAFE_SOURCE_RUNTIME", "sourceRuntime", "Source runtime is not safe for observability dry-run."),
    );
  }

  if (request.observedAt && Number.isNaN(Date.parse(request.observedAt))) {
    diagnostics.push(
      diagnostic("INVALID_OBSERVABILITY_TIMESTAMP", "observedAt", "Observability dry-run timestamp is invalid."),
    );
  }

  if (
    request.payloadReference
    && (!isSafeReference(request.payloadReference) || isUnsafeObservabilityString(request.payloadReference))
  ) {
    diagnostics.push(
      diagnostic("UNSAFE_PAYLOAD_REFERENCE", "payloadReference", "Payload reference is unsafe."),
    );
  }

  return diagnostics;
};

const isKnownEventCategory = (value: string): value is ObservabilityEventCategory =>
  observabilityEventCategories.includes(value as ObservabilityEventCategory);

const isKnownSourceRuntime = (value: string): value is ObservabilitySourceRuntime =>
  observabilitySourceRuntimes.includes(value as ObservabilitySourceRuntime);

const isSafeLabels = (labels: Record<string, ObservabilityDryRunLabelValue> | undefined): boolean => {
  if (!labels) {
    return true;
  }

  return Object.entries(labels).every(([key, value]) => {
    if (!isSafeLabelKey(key) || isSensitiveObservabilityKey(key)) {
      return false;
    }

    if (typeof value === "string") {
      return isSafeLabelValue(value) && !isUnsafeObservabilityString(value);
    }

    if (typeof value === "number") {
      return Number.isFinite(value);
    }

    return typeof value === "boolean";
  });
};

const sanitizeObservabilityString = (value: string): string => {
  const redacted = redactObservabilityExporterValue(value);

  return typeof redacted === "string" ? redacted : REDACTED_VALUE;
};

const isSupportedExporterId = (value: string): boolean =>
  value === "local-dry-run" || value === "metadata-only" || value === "production-observability-exporter";

const isSupportedSinkId = (value: string): boolean =>
  value === "local-metrics-sink" || value === "metadata-only" || value === "production-metrics-sink";

const isSafeIdentifier = (value: string): boolean =>
  /^[a-z][a-z0-9-]{2,63}$/i.test(value);

const isSafeMetricNamespace = (value: string): boolean =>
  /^[a-z][a-z0-9-]{1,63}(?:\.[a-z][a-z0-9-]{1,63}){0,4}$/i.test(value);

const isSafeMetricName = (value: string): boolean =>
  /^[a-z][a-z0-9_]{1,63}(?:\.[a-z][a-z0-9_]{1,63}){0,7}$/i.test(value);

const isSafeLabelKey = (value: string): boolean =>
  /^[a-z][a-z0-9_]{1,47}$/i.test(value);

const isSafeLabelValue = (value: string): boolean =>
  /^[a-z0-9][a-z0-9:_./-]{0,127}$/i.test(value);

const isSafeReference = (value: string): boolean =>
  /^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9-]*(?::[a-z0-9][a-z0-9-]*)*$/i.test(value);

const isSafeSerializableObservabilityKey = (key: string, value: unknown): boolean =>
  /^(labels|payloadReference|sourceRuntime|traceId)$/i.test(key)
  && (
    typeof value !== "string"
    || (isSafeLabelValue(value) && !isUnsafeObservabilityString(value))
    || (isSafeReference(value) && !isUnsafeObservabilityString(value))
  );

const isSensitiveObservabilityKey = (key: string): boolean =>
  /alert[-_]?(hook|webhook|routing)|api[-_]?key|bearer|contract[-_]?payload|credential|endpoint|evidence[-_]?payload|log[-_]?payload|object[-_]?key|payload|private[-_]?key|provider[-_]?payload|queue[-_]?payload|reward[-_]?payload|secret|signed[-_]?url|token|trace[-_]?payload|wallet|webhook|worker[-_]?payload/i.test(
    key,
  );

const isUnsafeObservabilityString = (value: string): boolean =>
  isCredentialedUrl(value)
  || isLikelyObjectKey(value)
  || isSensitiveObservabilityString(value)
  || isWalletAddressString(value)
  || isRawObservabilityPayload(value);

const isSensitiveObservabilityString = (value: string): boolean =>
  /(api[-_]?key|bearer\s+|credential|hook-secret|private[-_]?key|queue-secret|secret|token=|webhook-secret|worker-token|x-amz-signature=|signed-url)/i.test(
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
  || /(^|\/)(exports?|evidence|attachments?|logs?|metrics?|observability|queue-payloads?|traces?)\/.+\.(csv|json|jsonl|parquet|zip)$/i.test(value);

const isWalletAddressString = (value: string): boolean =>
  /ELF_[A-Za-z0-9_]+|wallet[-_]?address/i.test(value);

const isRawObservabilityPayload = (value: string): boolean => {
  const trimmed = value.trim();

  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
    return false;
  }

  return /address|contract|credential|evidence|payload|provider|queue|reward|task|token|trace|wallet|worker/i.test(
    trimmed,
  );
};
