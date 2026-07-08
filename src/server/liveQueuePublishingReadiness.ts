import type { BackendRuntimeProfileId } from "./backendProfiles";
import {
  createBullmqConstructionReadiness,
  type BullmqConstructionDiagnosticCode,
  type BullmqConstructionFactory,
  type BullmqConstructionReadinessSummary,
} from "./bullmqConstructionReadiness";
import {
  queueProviderDriverDeadLetterRoutes,
  queueProviderDriverQueueRoutes,
} from "./queueProviderDriver";
import type {
  RedisBrokerConnectionDiagnosticCode,
  RedisBrokerConnectionReadinessSummary,
} from "./redisBrokerConnectionReadiness";

export type LiveQueuePublishingProfileId = BackendRuntimeProfileId;
export type LiveQueuePublishingMode = "dry_run" | "metadata_only" | "production_required";
export type LiveQueuePublishingStatus = "disabled" | "scaffolded" | "blocked" | "ready" | "failed";
export type LiveQueuePublishingActivationStatus =
  | "disabled"
  | "metadata_only"
  | "activation_required"
  | "explicitly_enabled";
export type LiveQueuePublishingDiagnosticSeverity = "error" | "warning" | "info";
export type LiveQueuePublishingDiagnosticCode =
  | "UNKNOWN_LIVE_QUEUE_PUBLISHING_PROFILE"
  | "UNKNOWN_LIVE_QUEUE_PUBLISHING_MODE"
  | "LIVE_QUEUE_PUBLISHING_ACTIVATION_MISSING"
  | "LIVE_QUEUE_PUBLISHER_MISSING"
  | "LIVE_QUEUE_ROUTE_MISSING"
  | "LIVE_QUEUE_DEAD_LETTER_ROUTE_MISSING"
  | "LIVE_QUEUE_PAYLOAD_POLICY_MISSING"
  | "LIVE_QUEUE_IDEMPOTENCY_HANDOFF_MISSING"
  | "LIVE_QUEUE_LEASE_HANDOFF_MISSING"
  | "LIVE_QUEUE_OBSERVABILITY_HANDOFF_MISSING"
  | "LIVE_QUEUE_RUNBOOK_MISSING"
  | "LIVE_QUEUE_REDACTION_POLICY_MISSING"
  | "LIVE_QUEUE_PUBLISHING_UNSAFE_CONFIG"
  | "LIVE_QUEUE_PUBLISHING_NOT_READY"
  | "LIVE_QUEUE_MISSING_TRACE_ID"
  | "LIVE_QUEUE_UNKNOWN_QUEUE_ID"
  | "LIVE_QUEUE_UNKNOWN_JOB_ID"
  | "LIVE_QUEUE_MISMATCHED_QUEUE_JOB"
  | "LIVE_QUEUE_MISSING_PAYLOAD_REFERENCE"
  | "LIVE_QUEUE_UNSAFE_PAYLOAD_REFERENCE"
  | "LIVE_QUEUE_MISSING_IDEMPOTENCY_REFERENCE"
  | "LIVE_QUEUE_UNSAFE_IDEMPOTENCY_REFERENCE"
  | "LIVE_QUEUE_INVALID_ATTEMPT"
  | "LIVE_QUEUE_PUBLISHER_FAILED"
  | "LIVE_QUEUE_PUBLISHER_REJECTED"
  | "LIVE_QUEUE_DUPLICATE_IDEMPOTENCY_REFERENCE"
  | BullmqConstructionDiagnosticCode
  | RedisBrokerConnectionDiagnosticCode;
export type LiveQueuePublishingPreconditionArea =
  | "activation"
  | "broker"
  | "construction"
  | "dead_letter"
  | "idempotency"
  | "lease"
  | "observability"
  | "payload"
  | "publisher"
  | "queue"
  | "redaction"
  | "runbook";

export interface LiveQueuePublishingNoLiveSideEffects {
  ack: false;
  analyticsWrites: false;
  contractCalls: false;
  deadLetter: false;
  nack: false;
  objectStorageWrites: false;
  providerCalls: false;
  queueConsumption: false;
  retry: false;
  rewardDistribution: false;
  schedulerExecution: false;
  telemetryExport: false;
  workerExecution: false;
}

export interface LiveQueuePublishingProductionPrecondition {
  area: LiveQueuePublishingPreconditionArea;
  diagnosticCode: LiveQueuePublishingDiagnosticCode;
  field: string;
  id: string;
  message: string;
  requiredBeforeProduction: true;
  requiredConfigKeys: string[];
  status: "blocked" | "deferred";
}

export interface LiveQueuePublishingDiagnostic {
  code: LiveQueuePublishingDiagnosticCode;
  field: string;
  message: string;
  severity: LiveQueuePublishingDiagnosticSeverity;
}

export interface LiveQueuePublishRequest {
  attempt: number;
  idempotencyReference: string;
  jobId: string;
  operatorContext?: Record<string, string>;
  payloadHash?: string;
  payloadReference: string;
  queueId: string;
  requestedAt?: string;
  traceId: string;
}

export interface LiveQueuePublisherRequest extends LiveQueuePublishRequest {
  activationStatus: LiveQueuePublishingActivationStatus;
  mode: LiveQueuePublishingMode;
  profileId: LiveQueuePublishingProfileId;
  publisherId: string;
}

export interface LiveQueuePublisherResult {
  diagnosticCodes?: LiveQueuePublishingDiagnosticCode[];
  diagnostics?: LiveQueuePublishingDiagnostic[];
  operationId?: string;
  providerReference?: string;
  status: "accepted" | "duplicate" | "rejected" | "failed";
}

export interface LiveQueuePublisher {
  publish: (request: LiveQueuePublisherRequest) => LiveQueuePublisherResult;
  publisherId: string;
}

export interface LiveQueuePublishResult {
  diagnosticCodes: LiveQueuePublishingDiagnosticCode[];
  diagnostics: LiveQueuePublishingDiagnostic[];
  idempotencyReference?: string;
  jobId?: string;
  livePublishAttempted: boolean;
  noLiveSideEffects: LiveQueuePublishingNoLiveSideEffects;
  operationId?: string;
  payloadHash?: string;
  payloadReference?: string;
  providerReference?: string;
  published: boolean;
  publisherErrorRedacted?: unknown;
  queueId?: string;
  requestedAt?: string;
  status: "accepted" | "rejected" | "duplicate" | "failed" | "blocked_by_gate";
  traceId?: string;
}

export interface LiveQueuePublishingReadinessProjection {
  activationStatus: LiveQueuePublishingActivationStatus;
  blockerCount: number;
  diagnosticCodes: LiveQueuePublishingDiagnosticCode[];
  livePublishAttempted: boolean;
  liveQueuePublishingEnabled: boolean;
  mode: LiveQueuePublishingMode;
  productionReady: false;
  publishAttemptAllowed: boolean;
  publisherId: string;
  status: LiveQueuePublishingStatus;
  valid: boolean;
}

export interface LiveQueuePublishingReadinessSummary {
  activationStatus: LiveQueuePublishingActivationStatus;
  blockerCount: number;
  brokerReadiness: RedisBrokerConnectionReadinessSummary;
  bullmqConstruction: BullmqConstructionReadinessSummary;
  diagnosticCodes: LiveQueuePublishingDiagnosticCode[];
  diagnostics: LiveQueuePublishingDiagnostic[];
  id: "campaign-os-live-queue-publishing-readiness";
  livePublishAttempted: false;
  liveQueuePublishingEnabled: boolean;
  mode: LiveQueuePublishingMode;
  noLiveSideEffects: LiveQueuePublishingNoLiveSideEffects;
  preconditions: LiveQueuePublishingProductionPrecondition[];
  productionReady: false;
  profileId: LiveQueuePublishingProfileId;
  publishAttemptAllowed: boolean;
  publisherId: string;
  publisherProvided: boolean;
  readiness: LiveQueuePublishingReadinessProjection;
  requiredConfigKeys: string[];
  status: LiveQueuePublishingStatus;
  valid: boolean;
}

export interface CreateLiveQueuePublishingReadinessOptions {
  constructionFactory?: BullmqConstructionFactory;
  env?: Record<string, unknown>;
  mode?: string;
  profileId?: string;
  publisher?: LiveQueuePublisher;
}

export interface EvaluateLiveQueuePublishRequestOptions {
  publisher?: LiveQueuePublisher;
  readiness?: LiveQueuePublishingReadinessSummary;
}

const FOUNDATION_ID = "campaign-os-live-queue-publishing-readiness" as const;
const REDACTED_VALUE = "[redacted]";
const RAW_PUBLISHING_PAYLOAD_VALUE = "[redacted-live-queue-publishing-payload]";
const runtimePublishers = new WeakMap<LiveQueuePublishingReadinessSummary, LiveQueuePublisher>();

export const liveQueuePublishingNoLiveSideEffects: LiveQueuePublishingNoLiveSideEffects = {
  ack: false,
  analyticsWrites: false,
  contractCalls: false,
  deadLetter: false,
  nack: false,
  objectStorageWrites: false,
  providerCalls: false,
  queueConsumption: false,
  retry: false,
  rewardDistribution: false,
  schedulerExecution: false,
  telemetryExport: false,
  workerExecution: false,
};

export const liveQueuePublishingProductionPreconditions: LiveQueuePublishingProductionPrecondition[] = [
  precondition("activation", "LIVE_QUEUE_PUBLISHING_ACTIVATION_MISSING", "CAMPAIGN_OS_LIVE_QUEUE_PUBLISHING_ENABLEMENT", "live-queue-publishing-activation", "Explicit live queue publishing activation is required before publishing can advance."),
  precondition("publisher", "LIVE_QUEUE_PUBLISHER_MISSING", "CAMPAIGN_OS_LIVE_QUEUE_PUBLISHER", "live-queue-publisher", "Live queue publisher reference is required before publishing can advance."),
  precondition("queue", "LIVE_QUEUE_ROUTE_MISSING", "CAMPAIGN_OS_WORKER_QUEUE_URL", "live-queue-route", "Worker queue route reference is required before publishing can advance."),
  precondition("dead_letter", "LIVE_QUEUE_DEAD_LETTER_ROUTE_MISSING", "CAMPAIGN_OS_DEAD_LETTER_QUEUE", "live-queue-dead-letter-route", "Dead-letter route reference is required before publishing can advance."),
  precondition("payload", "LIVE_QUEUE_PAYLOAD_POLICY_MISSING", "CAMPAIGN_OS_PAYLOAD_REFERENCE_POLICY", "live-queue-payload-reference-policy", "Payload reference policy is required before publishing can advance."),
  precondition("idempotency", "LIVE_QUEUE_IDEMPOTENCY_HANDOFF_MISSING", "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL", "live-queue-idempotency-handoff", "Idempotency handoff is required before publishing can advance."),
  precondition("lease", "LIVE_QUEUE_LEASE_HANDOFF_MISSING", "CAMPAIGN_OS_WORKER_LEASE_STORE_URL", "live-queue-lease-handoff", "Worker lease handoff is required before publishing can advance."),
  precondition("observability", "LIVE_QUEUE_OBSERVABILITY_HANDOFF_MISSING", "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL", "live-queue-observability-handoff", "Observability handoff is required before publishing can advance.", undefined, "deferred"),
  precondition("runbook", "LIVE_QUEUE_RUNBOOK_MISSING", "CAMPAIGN_OS_OPERATOR_RUNBOOK_URL", "live-queue-runbook", "Operator runbook reference is required before publishing can advance.", undefined, "deferred"),
  precondition("redaction", "LIVE_QUEUE_REDACTION_POLICY_MISSING", "CAMPAIGN_OS_PUBLISHER_REDACTION_POLICY", "live-queue-redaction-policy", "Publisher redaction policy is required before publishing can advance."),
];

export const createLiveQueuePublishingReadiness = (
  options: CreateLiveQueuePublishingReadinessOptions = {},
): LiveQueuePublishingReadinessSummary => {
  const env = options.env ?? {};
  const profileResolution = resolveProfile(options.profileId);
  const modeResolution = resolveMode(profileResolution.profileId, options.mode);
  const activationStatus = resolveActivationStatus(profileResolution.profileId, env);
  const bullmqConstruction = createBullmqConstructionReadiness({
    constructionFactory: options.constructionFactory,
    env,
    profileId: profileResolution.profileId,
  });
  const brokerReadiness = bullmqConstruction.brokerReadiness;
  const unsafeDiagnostics = createUnsafeConfigDiagnostics(env, options.publisher);
  const productionDiagnostics =
    profileResolution.profileId === "production-required" ? createProductionDiagnostics(env, options.publisher) : [];
  const dependencyDiagnostics =
    profileResolution.profileId === "production-required" ? createDependencyDiagnostics(bullmqConstruction) : [];
  const diagnostics = [
    ...profileResolution.diagnostics,
    ...modeResolution.diagnostics,
    ...unsafeDiagnostics,
    ...productionDiagnostics,
    ...dependencyDiagnostics,
  ];
  const blockerCount = diagnostics.filter((item) => item.severity === "error").length;
  const publishAttemptAllowed = profileResolution.profileId === "production-required"
    && activationStatus === "explicitly_enabled"
    && Boolean(options.publisher)
    && bullmqConstruction.queueClientConstructed
    && blockerCount === 0;
  const liveQueuePublishingEnabled = publishAttemptAllowed;
  const status = resolveReadinessStatus(profileResolution.profileId, blockerCount, publishAttemptAllowed);
  const valid = profileResolution.valid
    && modeResolution.valid
    && blockerCount === 0
    && (profileResolution.profileId !== "production-required" || publishAttemptAllowed);
  const publisherId = resolvePublisherId(options.publisher);
  const readiness = createReadinessProjection({
    activationStatus,
    blockerCount,
    diagnosticCodes: diagnostics.map((item) => item.code),
    liveQueuePublishingEnabled,
    mode: modeResolution.mode,
    publishAttemptAllowed,
    publisherId,
    status,
    valid,
  });

  const summary: LiveQueuePublishingReadinessSummary = {
    activationStatus,
    blockerCount,
    brokerReadiness,
    bullmqConstruction,
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    id: FOUNDATION_ID,
    livePublishAttempted: false,
    liveQueuePublishingEnabled,
    mode: modeResolution.mode,
    noLiveSideEffects: liveQueuePublishingNoLiveSideEffects,
    preconditions: liveQueuePublishingProductionPreconditions.map((item) => ({ ...item })),
    productionReady: false,
    profileId: profileResolution.profileId,
    publishAttemptAllowed,
    publisherId,
    publisherProvided: Boolean(options.publisher),
    readiness,
    requiredConfigKeys: getRequiredConfigKeys(),
    status,
    valid,
  };

  if (options.publisher) {
    runtimePublishers.set(summary, options.publisher);
  }

  return summary;
};

export const evaluateLiveQueuePublishRequest = (
  request: LiveQueuePublishRequest,
  options: EvaluateLiveQueuePublishRequestOptions = {},
): LiveQueuePublishResult => {
  const readiness = options.readiness ?? createLiveQueuePublishingReadiness({ profileId: "local-review" });
  const publisher = options.publisher ?? runtimePublishers.get(readiness);
  const requestDiagnostics = validatePublishRequest(request, readiness);

  if (!readiness.publishAttemptAllowed || !publisher) {
    const diagnostics = readiness.publishAttemptAllowed
      ? requestDiagnostics
      : [
        ...requestDiagnostics,
        diagnostic(
          "LIVE_QUEUE_PUBLISHING_NOT_READY",
          "readiness",
          "Live queue publishing is not ready for this request.",
        ),
      ];

    return createPublishResult(request, "blocked_by_gate", false, false, diagnostics);
  }

  if (requestDiagnostics.length > 0) {
    return createPublishResult(request, "rejected", false, false, requestDiagnostics);
  }

  try {
    const publisherResult = publisher.publish({
      ...request,
      activationStatus: readiness.activationStatus,
      mode: readiness.mode,
      profileId: readiness.profileId,
      publisherId: readiness.publisherId,
    });
    const diagnostics = [
      ...(publisherResult.diagnostics ?? []),
      ...(publisherResult.diagnosticCodes ?? []).map((code) =>
        diagnostic(code, "publisher", `Publisher returned ${code}.`),
      ),
    ];
    const status = publisherResult.status;

    return {
      ...createPublishResult(request, status, true, status === "accepted", diagnostics),
      operationId: sanitizeOptionalPublishingString(publisherResult.operationId),
      providerReference: sanitizeOptionalPublishingString(publisherResult.providerReference),
    };
  } catch (error) {
    return {
      ...createPublishResult(
        request,
        "failed",
        true,
        false,
        [
          diagnostic(
            "LIVE_QUEUE_PUBLISHER_FAILED",
            "publisher",
            "Live queue publisher failed with redacted error detail.",
          ),
        ],
      ),
      publisherErrorRedacted: redactLiveQueuePublishingValue(error),
    };
  }
};

export const redactLiveQueuePublishingValue = (value: unknown): unknown => {
  if (value instanceof Error) {
    return REDACTED_VALUE;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactLiveQueuePublishingValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (isSensitivePublishingKey(key)) {
          return [key, REDACTED_VALUE];
        }

        return [key, redactLiveQueuePublishingValue(nestedValue)];
      }),
    );
  }

  if (typeof value !== "string") {
    return value;
  }

  if (isRawPublishingPayload(value)) {
    return RAW_PUBLISHING_PAYLOAD_VALUE;
  }

  if (isUnsafePublishingString(value)) {
    return REDACTED_VALUE;
  }

  return value;
};

function precondition(
  area: LiveQueuePublishingPreconditionArea,
  diagnosticCode: LiveQueuePublishingDiagnosticCode,
  field: string,
  id: string,
  message: string,
  requiredConfigKeys = [field],
  status: LiveQueuePublishingProductionPrecondition["status"] = "blocked",
): LiveQueuePublishingProductionPrecondition {
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

function createReadinessProjection(input: {
  activationStatus: LiveQueuePublishingActivationStatus;
  blockerCount: number;
  diagnosticCodes: LiveQueuePublishingDiagnosticCode[];
  liveQueuePublishingEnabled: boolean;
  mode: LiveQueuePublishingMode;
  publishAttemptAllowed: boolean;
  publisherId: string;
  status: LiveQueuePublishingStatus;
  valid: boolean;
}): LiveQueuePublishingReadinessProjection {
  return {
    activationStatus: input.activationStatus,
    blockerCount: input.blockerCount,
    diagnosticCodes: input.diagnosticCodes,
    livePublishAttempted: false,
    liveQueuePublishingEnabled: input.liveQueuePublishingEnabled,
    mode: input.mode,
    productionReady: false,
    publishAttemptAllowed: input.publishAttemptAllowed,
    publisherId: input.publisherId,
    status: input.status,
    valid: input.valid,
  };
}

function createProductionDiagnostics(
  env: Record<string, unknown>,
  publisher: LiveQueuePublisher | undefined,
): LiveQueuePublishingDiagnostic[] {
  return liveQueuePublishingProductionPreconditions
    .filter((item) => {
      if (item.diagnosticCode === "LIVE_QUEUE_PUBLISHER_MISSING") {
        return !publisher;
      }

      return item.requiredConfigKeys.some((key) => !hasUsableValue(env[key]));
    })
    .map((item) => diagnostic(item.diagnosticCode, item.field, item.message));
}

function createDependencyDiagnostics(
  bullmqConstruction: BullmqConstructionReadinessSummary,
): LiveQueuePublishingDiagnostic[] {
  return bullmqConstruction.diagnostics.map((item) => ({
    code: item.code,
    field: item.field,
    message: item.message,
    severity: item.severity,
  }));
}

function createUnsafeConfigDiagnostics(
  env: Record<string, unknown>,
  publisher?: LiveQueuePublisher,
): LiveQueuePublishingDiagnostic[] {
  const unsafeValues = [
    env.CAMPAIGN_OS_LIVE_QUEUE_PUBLISHING_ENABLEMENT,
    env.CAMPAIGN_OS_LIVE_QUEUE_PUBLISHER,
    publisher?.publisherId,
  ];
  const hasUnsafeValue = unsafeValues.some((value) =>
    typeof value === "string" && isUnsafePublishingString(value),
  );

  return hasUnsafeValue
    ? [
      diagnostic(
        "LIVE_QUEUE_PUBLISHING_UNSAFE_CONFIG",
        "liveQueuePublishingConfig",
        "Live queue publishing configuration contains unsafe raw material and was redacted.",
      ),
    ]
    : [];
}

function validatePublishRequest(
  request: LiveQueuePublishRequest,
  readiness: LiveQueuePublishingReadinessSummary,
): LiveQueuePublishingDiagnostic[] {
  const diagnostics: LiveQueuePublishingDiagnostic[] = [];

  if (!hasUsableValue(request.traceId)) {
    diagnostics.push(diagnostic("LIVE_QUEUE_MISSING_TRACE_ID", "traceId", "Trace id is required before live publishing."));
  }

  if (!isKnownQueueId(request.queueId)) {
    diagnostics.push(diagnostic("LIVE_QUEUE_UNKNOWN_QUEUE_ID", "queueId", "Queue id is not registered for live publishing."));
  }

  if (!isKnownJobId(request.jobId)) {
    diagnostics.push(diagnostic("LIVE_QUEUE_UNKNOWN_JOB_ID", "jobId", "Job id is not registered for live publishing."));
  } else if (!isJobAllowedOnQueue(request.queueId, request.jobId)) {
    diagnostics.push(diagnostic("LIVE_QUEUE_MISMATCHED_QUEUE_JOB", "jobId", "Job id is not allowed on the requested queue."));
  }

  if (!hasPresentValue(request.payloadReference) && !hasPresentValue(request.payloadHash)) {
    diagnostics.push(diagnostic("LIVE_QUEUE_MISSING_PAYLOAD_REFERENCE", "payloadReference", "Payload reference or hash is required before live publishing."));
  }

  if (hasUnsafeReference(request.payloadReference) || (request.payloadHash && hasUnsafeReference(request.payloadHash))) {
    diagnostics.push(diagnostic("LIVE_QUEUE_UNSAFE_PAYLOAD_REFERENCE", "payloadReference", "Payload reference contains unsafe raw material and was redacted."));
  }

  if (!hasPresentValue(request.idempotencyReference)) {
    diagnostics.push(diagnostic("LIVE_QUEUE_MISSING_IDEMPOTENCY_REFERENCE", "idempotencyReference", "Idempotency reference is required before live publishing."));
  } else if (hasUnsafeReference(request.idempotencyReference)) {
    diagnostics.push(diagnostic("LIVE_QUEUE_UNSAFE_IDEMPOTENCY_REFERENCE", "idempotencyReference", "Idempotency reference contains unsafe raw material and was redacted."));
  }

  if (!Number.isInteger(request.attempt) || request.attempt < 1) {
    diagnostics.push(diagnostic("LIVE_QUEUE_INVALID_ATTEMPT", "attempt", "Attempt must be a positive integer."));
  }

  if (readiness.status === "failed") {
    diagnostics.push(diagnostic("LIVE_QUEUE_PUBLISHER_FAILED", "readiness", "Live queue publishing readiness is failed."));
  }

  return diagnostics;
}

function createPublishResult(
  request: LiveQueuePublishRequest,
  status: LiveQueuePublishResult["status"],
  livePublishAttempted: boolean,
  published: boolean,
  diagnostics: LiveQueuePublishingDiagnostic[],
): LiveQueuePublishResult {
  return {
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    idempotencyReference: sanitizeOptionalPublishingString(request.idempotencyReference),
    jobId: sanitizeOptionalPublishingString(request.jobId),
    livePublishAttempted,
    noLiveSideEffects: liveQueuePublishingNoLiveSideEffects,
    payloadHash: sanitizeOptionalPublishingString(request.payloadHash),
    payloadReference: sanitizeOptionalPublishingString(request.payloadReference),
    published,
    queueId: sanitizeOptionalPublishingString(request.queueId),
    requestedAt: sanitizeOptionalPublishingString(request.requestedAt),
    status,
    traceId: sanitizeOptionalPublishingString(request.traceId),
  };
}

function resolveReadinessStatus(
  profileId: LiveQueuePublishingProfileId,
  blockerCount: number,
  publishAttemptAllowed: boolean,
): LiveQueuePublishingStatus {
  if (profileId === "local-review") {
    return blockerCount === 0 ? "disabled" : "blocked";
  }

  if (profileId === "staging-scaffold") {
    return blockerCount === 0 ? "scaffolded" : "blocked";
  }

  if (blockerCount > 0) {
    return "blocked";
  }

  return publishAttemptAllowed ? "ready" : "blocked";
}

function resolveProfile(profileId?: string): {
  diagnostics: LiveQueuePublishingDiagnostic[];
  profileId: LiveQueuePublishingProfileId;
  valid: boolean;
} {
  if (!profileId || profileId === "local-review" || profileId === "staging-scaffold" || profileId === "production-required") {
    return {
      diagnostics: [],
      profileId: (profileId as LiveQueuePublishingProfileId | undefined) ?? "local-review",
      valid: true,
    };
  }

  return {
    diagnostics: [
      diagnostic(
        "UNKNOWN_LIVE_QUEUE_PUBLISHING_PROFILE",
        "profileId",
        "Unknown live queue publishing profile.",
      ),
    ],
    profileId: "local-review",
    valid: false,
  };
}

function resolveMode(profileId: LiveQueuePublishingProfileId, mode?: string): {
  diagnostics: LiveQueuePublishingDiagnostic[];
  mode: LiveQueuePublishingMode;
  valid: boolean;
} {
  const defaultMode = profileId === "local-review"
    ? "dry_run"
    : profileId === "staging-scaffold"
      ? "metadata_only"
      : "production_required";

  if (!mode) {
    return { diagnostics: [], mode: defaultMode, valid: true };
  }

  if (mode === "dry_run" || mode === "metadata_only" || mode === "production_required") {
    return { diagnostics: [], mode, valid: true };
  }

  return {
    diagnostics: [
      diagnostic(
        "UNKNOWN_LIVE_QUEUE_PUBLISHING_MODE",
        "mode",
        "Unknown live queue publishing mode.",
      ),
    ],
    mode: defaultMode,
    valid: false,
  };
}

function resolveActivationStatus(
  profileId: LiveQueuePublishingProfileId,
  env: Record<string, unknown>,
): LiveQueuePublishingActivationStatus {
  if (profileId === "local-review") {
    return "disabled";
  }

  if (profileId === "staging-scaffold") {
    return "metadata_only";
  }

  return env.CAMPAIGN_OS_LIVE_QUEUE_PUBLISHING_ENABLEMENT === "explicitly-enabled"
    ? "explicitly_enabled"
    : "activation_required";
}

function resolvePublisherId(publisher?: LiveQueuePublisher): string {
  return publisher ? sanitizePublishingString(publisher.publisherId) : "not_configured";
}

function diagnostic(
  code: LiveQueuePublishingDiagnosticCode,
  field: string,
  message: string,
  severity: LiveQueuePublishingDiagnosticSeverity = "error",
): LiveQueuePublishingDiagnostic {
  return {
    code,
    field,
    message: sanitizePublishingString(message),
    severity,
  };
}

function getRequiredConfigKeys(): string[] {
  return Array.from(new Set(liveQueuePublishingProductionPreconditions.flatMap((item) => item.requiredConfigKeys)));
}

function isKnownQueueId(queueId: string): boolean {
  return queueProviderDriverQueueRoutes.some((route) => route.queueId === queueId);
}

function isKnownJobId(jobId: string): boolean {
  return queueProviderDriverQueueRoutes.some((route) => route.jobIds.includes(jobId));
}

function isJobAllowedOnQueue(queueId: string, jobId: string): boolean {
  return queueProviderDriverQueueRoutes.some((route) => route.queueId === queueId && route.jobIds.includes(jobId));
}

function hasUnsafeReference(value: string | undefined): boolean {
  return typeof value === "string" && (!isSafeReference(value) || isUnsafePublishingString(value));
}

function hasUsableValue(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0 && !isUnsafePublishingString(value);
}

function hasPresentValue(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function sanitizeOptionalPublishingString(value: string | undefined): string | undefined {
  return value === undefined ? undefined : sanitizePublishingString(value);
}

function sanitizePublishingString(value: string): string {
  if (isRawPublishingPayload(value)) {
    return RAW_PUBLISHING_PAYLOAD_VALUE;
  }

  if (isUnsafePublishingString(value)) {
    return REDACTED_VALUE;
  }

  return value;
}

function isSafeReference(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9:._/-]{1,160}$/.test(value);
}

function isSensitivePublishingKey(key: string): boolean {
  return /api[-_]?key|bearer|credential|idempotency[-_]?(key|token)|job[-_]?data|object[-_]?key|payload|private[-_]?key|provider[-_]?payload|redis[-_]?url|secret|signed[-_]?url|stack|token|wallet/i.test(key);
}

function isRawPublishingPayload(value: string): boolean {
  return /[{[]|payload|jobData|wallet|walletAddress|private|stack/i.test(value);
}

function isUnsafePublishingString(value: string): boolean {
  return /redis:\/\/[^@\s]+:[^@\s]+@|bearer\s+|credential|ELF_[A-Za-z0-9_]+|private[-_]?key|secret|signed-url|signature=|token=|wallet[-_]?address|X-Amz-Signature/i.test(value);
}
