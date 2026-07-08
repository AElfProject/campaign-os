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
import {
  createLiveQueuePublishingReadiness,
  type LiveQueuePublisher,
  type LiveQueuePublishingDiagnosticCode,
  type LiveQueuePublishingReadinessSummary,
} from "./liveQueuePublishingReadiness";
import type {
  RedisBrokerConnectionDiagnosticCode,
  RedisBrokerConnectionReadinessSummary,
} from "./redisBrokerConnectionReadiness";

export type LiveQueueConsumeProfileId = BackendRuntimeProfileId;
export type LiveQueueConsumeMode = "dry_run" | "metadata_only" | "production_required";
export type LiveQueueConsumeStatus = "disabled" | "scaffolded" | "blocked" | "ready" | "failed";
export type LiveQueueConsumeActivationStatus =
  | "disabled"
  | "metadata_only"
  | "activation_required"
  | "explicitly_enabled";
export type LiveQueueConsumeDiagnosticSeverity = "error" | "warning" | "info";
export type LiveQueueConsumeDecision =
  | "ack"
  | "blocked"
  | "dead_letter"
  | "drop_duplicate"
  | "hold_manual_review"
  | "retry";
export type LiveQueueHandlerStatus =
  | "completed"
  | "duplicate"
  | "failed"
  | "lease_conflict"
  | "manual_review"
  | "non_retryable_failure"
  | "retryable_failure";
export type LiveQueueConsumerOperationStatus = "accepted" | "rejected" | "failed";
export type LiveQueueConsumeDiagnosticCode =
  | "UNKNOWN_LIVE_QUEUE_CONSUME_PROFILE"
  | "UNKNOWN_LIVE_QUEUE_CONSUME_MODE"
  | "LIVE_QUEUE_CONSUME_ACTIVATION_MISSING"
  | "LIVE_QUEUE_CONSUMER_MISSING"
  | "LIVE_QUEUE_HANDLER_REGISTRY_MISSING"
  | "LIVE_QUEUE_PUBLISHING_HANDOFF_MISSING"
  | "LIVE_QUEUE_ROUTE_MISSING"
  | "LIVE_QUEUE_DEAD_LETTER_ROUTE_MISSING"
  | "LIVE_QUEUE_PAYLOAD_POLICY_MISSING"
  | "LIVE_QUEUE_IDEMPOTENCY_HANDOFF_MISSING"
  | "LIVE_QUEUE_LEASE_HANDOFF_MISSING"
  | "LIVE_QUEUE_RETRY_POLICY_MISSING"
  | "LIVE_QUEUE_OBSERVABILITY_HANDOFF_MISSING"
  | "LIVE_QUEUE_RUNBOOK_MISSING"
  | "LIVE_QUEUE_REDACTION_POLICY_MISSING"
  | "LIVE_QUEUE_CONSUME_UNSAFE_CONFIG"
  | "LIVE_QUEUE_CONSUME_NOT_READY"
  | "LIVE_QUEUE_MISSING_TRACE_ID"
  | "LIVE_QUEUE_UNKNOWN_QUEUE_ID"
  | "LIVE_QUEUE_UNKNOWN_JOB_ID"
  | "LIVE_QUEUE_MISMATCHED_QUEUE_JOB"
  | "LIVE_QUEUE_MISSING_PAYLOAD_REFERENCE"
  | "LIVE_QUEUE_UNSAFE_PAYLOAD_REFERENCE"
  | "LIVE_QUEUE_MISSING_IDEMPOTENCY_REFERENCE"
  | "LIVE_QUEUE_UNSAFE_IDEMPOTENCY_REFERENCE"
  | "LIVE_QUEUE_MISSING_LEASE_REFERENCE"
  | "LIVE_QUEUE_UNSAFE_LEASE_REFERENCE"
  | "LIVE_QUEUE_UNSAFE_FENCING_REFERENCE"
  | "LIVE_QUEUE_INVALID_ATTEMPT"
  | "LIVE_QUEUE_HANDLER_MISSING"
  | "LIVE_QUEUE_HANDLER_FAILED"
  | "LIVE_QUEUE_HANDLER_RETRYABLE_FAILURE"
  | "LIVE_QUEUE_HANDLER_NON_RETRYABLE_FAILURE"
  | "LIVE_QUEUE_CONSUMER_FAILED"
  | "LIVE_QUEUE_CONSUMER_REJECTED"
  | "LIVE_QUEUE_DUPLICATE_IDEMPOTENCY_REFERENCE"
  | "LIVE_QUEUE_LEASE_CONFLICT"
  | "LIVE_QUEUE_DEAD_LETTER_UNAVAILABLE"
  | BullmqConstructionDiagnosticCode
  | RedisBrokerConnectionDiagnosticCode
  | LiveQueuePublishingDiagnosticCode;
export type LiveQueueConsumePreconditionArea =
  | "activation"
  | "construction"
  | "consumer"
  | "dead_letter"
  | "handler"
  | "idempotency"
  | "lease"
  | "observability"
  | "payload"
  | "publishing"
  | "queue"
  | "redaction"
  | "retry"
  | "runbook";

export interface LiveQueueConsumeNoLiveSideEffects {
  ack: false;
  analyticsWrites: false;
  contractCalls: false;
  deadLetter: false;
  handlerSideEffects: false;
  nack: false;
  objectStorageWrites: false;
  providerCalls: false;
  publishFallback: false;
  retry: false;
  rewardDistribution: false;
  schedulerExecution: false;
  telemetryExport: false;
  workerExecution: false;
}

export interface LiveQueueConsumeProductionPrecondition {
  area: LiveQueueConsumePreconditionArea;
  diagnosticCode: LiveQueueConsumeDiagnosticCode;
  field: string;
  id: string;
  message: string;
  requiredBeforeProduction: true;
  requiredConfigKeys: string[];
  status: "blocked" | "deferred";
}

export interface LiveQueueConsumeDiagnostic {
  code: LiveQueueConsumeDiagnosticCode;
  field: string;
  message: string;
  severity: LiveQueueConsumeDiagnosticSeverity;
}

export interface LiveQueueConsumeMessage {
  attempt: number;
  fencingTokenReference?: string;
  idempotencyReference: string;
  jobId: string;
  leaseReference: string;
  operatorContext?: Record<string, string>;
  payloadHash?: string;
  payloadReference: string;
  queueId: string;
  requestedAt?: string;
  reservedAt?: string;
  traceId: string;
}

export interface LiveQueueConsumerOperationResult {
  diagnosticCodes?: LiveQueueConsumeDiagnosticCode[];
  diagnostics?: LiveQueueConsumeDiagnostic[];
  operationId?: string;
  status: LiveQueueConsumerOperationStatus;
}

export interface LiveQueueConsumer {
  ack?: (message: LiveQueueConsumeMessage) => LiveQueueConsumerOperationResult;
  consumerId: string;
  deadLetter?: (message: LiveQueueConsumeMessage) => LiveQueueConsumerOperationResult;
  nack?: (message: LiveQueueConsumeMessage) => LiveQueueConsumerOperationResult;
  reserve?: (message: LiveQueueConsumeMessage) => LiveQueueConsumerOperationResult;
  retry?: (message: LiveQueueConsumeMessage) => LiveQueueConsumerOperationResult;
}

export interface LiveQueueHandlerResult {
  diagnosticCodes?: LiveQueueConsumeDiagnosticCode[];
  diagnostics?: LiveQueueConsumeDiagnostic[];
  operationId?: string;
  status: LiveQueueHandlerStatus;
}

export interface LiveQueueHandler {
  handlerId: string;
  handle: (message: LiveQueueConsumeMessage) => LiveQueueHandlerResult;
  jobIds: string[];
}

export interface LiveQueueConsumeReadinessProjection {
  activationStatus: LiveQueueConsumeActivationStatus;
  blockerCount: number;
  consumeAttemptAllowed: boolean;
  consumerId: string;
  diagnosticCodes: LiveQueueConsumeDiagnosticCode[];
  handlerRegistryProvided: boolean;
  liveConsumeAttempted: false;
  liveQueueConsumptionEnabled: boolean;
  mode: LiveQueueConsumeMode;
  productionReady: false;
  status: LiveQueueConsumeStatus;
  valid: boolean;
}

export interface LiveQueueConsumeReadinessSummary {
  activationStatus: LiveQueueConsumeActivationStatus;
  blockerCount: number;
  brokerReadiness: RedisBrokerConnectionReadinessSummary;
  bullmqConstruction: BullmqConstructionReadinessSummary;
  consumeAttemptAllowed: boolean;
  consumerId: string;
  consumerProvided: boolean;
  diagnosticCodes: LiveQueueConsumeDiagnosticCode[];
  diagnostics: LiveQueueConsumeDiagnostic[];
  handlerRegistryProvided: boolean;
  id: "campaign-os-live-queue-consume-loop-readiness";
  liveConsumeAttempted: false;
  liveQueueConsumptionEnabled: boolean;
  mode: LiveQueueConsumeMode;
  noLiveSideEffects: LiveQueueConsumeNoLiveSideEffects;
  preconditions: LiveQueueConsumeProductionPrecondition[];
  productionReady: false;
  profileId: LiveQueueConsumeProfileId;
  publishingReadiness: LiveQueuePublishingReadinessSummary;
  readiness: LiveQueueConsumeReadinessProjection;
  requiredConfigKeys: string[];
  status: LiveQueueConsumeStatus;
  valid: boolean;
}

export interface CreateLiveQueueConsumeLoopReadinessOptions {
  constructionFactory?: BullmqConstructionFactory;
  consumer?: LiveQueueConsumer;
  env?: Record<string, unknown>;
  handlers?: LiveQueueHandler[];
  liveQueuePublisher?: LiveQueuePublisher;
  liveQueuePublishingReadiness?: LiveQueuePublishingReadinessSummary;
  mode?: string;
  profileId?: string;
}

export interface EvaluateLiveQueueConsumeMessageOptions {
  consumer?: LiveQueueConsumer;
  handlers?: LiveQueueHandler[];
  readiness?: LiveQueueConsumeReadinessSummary;
}

export interface LiveQueueConsumeResult {
  ackAttempted: boolean;
  consumerErrorRedacted?: unknown;
  deadLetterAttempted: boolean;
  decision: LiveQueueConsumeDecision;
  diagnosticCodes: LiveQueueConsumeDiagnosticCode[];
  diagnostics: LiveQueueConsumeDiagnostic[];
  handlerErrorRedacted?: unknown;
  handlerExecuted: boolean;
  idempotencyReference?: string;
  jobId?: string;
  leaseReference?: string;
  liveConsumeAttempted: boolean;
  nackAttempted: boolean;
  noLiveSideEffects: LiveQueueConsumeNoLiveSideEffects;
  operationId?: string;
  payloadHash?: string;
  payloadReference?: string;
  published: false;
  queueId?: string;
  requestedAt?: string;
  retryScheduled: boolean;
  status: "accepted" | "blocked_by_gate" | "duplicate_existing" | "failed" | "lease_conflict" | "manual_review" | "rejected";
  traceId?: string;
}

const FOUNDATION_ID = "campaign-os-live-queue-consume-loop-readiness" as const;
const REDACTED_VALUE = "[redacted]";
const RAW_CONSUME_PAYLOAD_VALUE = "[redacted-live-queue-consume-payload]";
const runtimeSeams = new WeakMap<
  LiveQueueConsumeReadinessSummary,
  { consumer?: LiveQueueConsumer; handlers: LiveQueueHandler[] }
>();
const maxAttemptsByJobId = new Map<string, number>(
  queueProviderDriverQueueRoutes
    .flatMap((route) => route.jobIds)
    .map((jobId) => [jobId, resolveDefaultMaxAttempts(jobId)]),
);

export const liveQueueConsumeNoLiveSideEffects: LiveQueueConsumeNoLiveSideEffects = {
  ack: false,
  analyticsWrites: false,
  contractCalls: false,
  deadLetter: false,
  handlerSideEffects: false,
  nack: false,
  objectStorageWrites: false,
  providerCalls: false,
  publishFallback: false,
  retry: false,
  rewardDistribution: false,
  schedulerExecution: false,
  telemetryExport: false,
  workerExecution: false,
};

export const liveQueueConsumeProductionPreconditions: LiveQueueConsumeProductionPrecondition[] = [
  precondition("activation", "LIVE_QUEUE_CONSUME_ACTIVATION_MISSING", "CAMPAIGN_OS_LIVE_QUEUE_CONSUME_ENABLEMENT", "live-queue-consume-activation", "Explicit live queue consume activation is required before consumption can advance."),
  precondition("consumer", "LIVE_QUEUE_CONSUMER_MISSING", "CAMPAIGN_OS_LIVE_QUEUE_CONSUMER", "live-queue-consumer", "Live queue consumer reference is required before consumption can advance."),
  precondition("handler", "LIVE_QUEUE_HANDLER_REGISTRY_MISSING", "CAMPAIGN_OS_CONSUME_HANDLER_REGISTRY", "live-queue-handler-registry", "Handler registry reference is required before consumption can advance."),
  precondition("publishing", "LIVE_QUEUE_PUBLISHING_HANDOFF_MISSING", "CAMPAIGN_OS_LIVE_QUEUE_PUBLISHING_ENABLEMENT", "live-queue-publishing-handoff", "Live queue publishing readiness handoff is required before consumption can advance."),
  precondition("queue", "LIVE_QUEUE_ROUTE_MISSING", "CAMPAIGN_OS_WORKER_QUEUE_URL", "live-queue-consume-route", "Worker queue route reference is required before consumption can advance."),
  precondition("dead_letter", "LIVE_QUEUE_DEAD_LETTER_ROUTE_MISSING", "CAMPAIGN_OS_DEAD_LETTER_QUEUE", "live-queue-consume-dead-letter-route", "Dead-letter route reference is required before consumption can advance."),
  precondition("payload", "LIVE_QUEUE_PAYLOAD_POLICY_MISSING", "CAMPAIGN_OS_PAYLOAD_REFERENCE_POLICY", "live-queue-consume-payload-reference-policy", "Payload reference policy is required before consumption can advance."),
  precondition("idempotency", "LIVE_QUEUE_IDEMPOTENCY_HANDOFF_MISSING", "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL", "live-queue-consume-idempotency-handoff", "Idempotency handoff is required before consumption can advance."),
  precondition("lease", "LIVE_QUEUE_LEASE_HANDOFF_MISSING", "CAMPAIGN_OS_WORKER_LEASE_STORE_URL", "live-queue-consume-lease-handoff", "Worker lease handoff is required before consumption can advance."),
  precondition("retry", "LIVE_QUEUE_RETRY_POLICY_MISSING", "CAMPAIGN_OS_RETRY_POLICY", "live-queue-consume-retry-policy", "Retry policy is required before consumption can advance."),
  precondition("observability", "LIVE_QUEUE_OBSERVABILITY_HANDOFF_MISSING", "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL", "live-queue-consume-observability-handoff", "Observability handoff is required before consumption can advance.", undefined, "deferred"),
  precondition("runbook", "LIVE_QUEUE_RUNBOOK_MISSING", "CAMPAIGN_OS_OPERATOR_RUNBOOK_URL", "live-queue-consume-runbook", "Operator runbook reference is required before consumption can advance.", undefined, "deferred"),
  precondition("redaction", "LIVE_QUEUE_REDACTION_POLICY_MISSING", "CAMPAIGN_OS_PUBLISHER_REDACTION_POLICY", "live-queue-consume-redaction-policy", "Consumer redaction policy is required before consumption can advance."),
];

export const createLiveQueueConsumeLoopReadiness = (
  options: CreateLiveQueueConsumeLoopReadinessOptions = {},
): LiveQueueConsumeReadinessSummary => {
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
  const publishingReadiness = options.liveQueuePublishingReadiness
    ?? createLiveQueuePublishingReadiness({
      constructionFactory: options.constructionFactory,
      env,
      profileId: profileResolution.profileId,
      publisher: options.liveQueuePublisher,
    });
  const handlers = options.handlers ?? [];
  const unsafeDiagnostics = createUnsafeConfigDiagnostics(env, options.consumer);
  const productionDiagnostics = profileResolution.profileId === "production-required"
    ? createProductionDiagnostics(env, options.consumer, handlers)
    : [];
  const dependencyDiagnostics = profileResolution.profileId === "production-required"
    ? createDependencyDiagnostics(bullmqConstruction, publishingReadiness)
    : [];
  const diagnostics = [
    ...profileResolution.diagnostics,
    ...modeResolution.diagnostics,
    ...unsafeDiagnostics,
    ...productionDiagnostics,
    ...dependencyDiagnostics,
  ];
  const blockerCount = diagnostics.filter((item) => item.severity === "error").length;
  const consumeAttemptAllowed = profileResolution.profileId === "production-required"
    && activationStatus === "explicitly_enabled"
    && Boolean(options.consumer)
    && handlers.length > 0
    && bullmqConstruction.workerConstructed
    && publishingReadiness.liveQueuePublishingEnabled
    && blockerCount === 0;
  const liveQueueConsumptionEnabled = consumeAttemptAllowed;
  const status = resolveReadinessStatus(profileResolution.profileId, blockerCount, consumeAttemptAllowed);
  const valid = profileResolution.valid
    && modeResolution.valid
    && blockerCount === 0
    && (profileResolution.profileId !== "production-required" || consumeAttemptAllowed);
  const consumerId = resolveConsumerId(options.consumer);
  const readiness = createReadinessProjection({
    activationStatus,
    blockerCount,
    consumeAttemptAllowed,
    consumerId,
    diagnosticCodes: diagnostics.map((item) => item.code),
    handlerRegistryProvided: handlers.length > 0,
    liveQueueConsumptionEnabled,
    mode: modeResolution.mode,
    status,
    valid,
  });
  const summary: LiveQueueConsumeReadinessSummary = {
    activationStatus,
    blockerCount,
    brokerReadiness,
    bullmqConstruction,
    consumeAttemptAllowed,
    consumerId,
    consumerProvided: Boolean(options.consumer),
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    handlerRegistryProvided: handlers.length > 0,
    id: FOUNDATION_ID,
    liveConsumeAttempted: false,
    liveQueueConsumptionEnabled,
    mode: modeResolution.mode,
    noLiveSideEffects: liveQueueConsumeNoLiveSideEffects,
    preconditions: liveQueueConsumeProductionPreconditions.map((item) => ({ ...item })),
    productionReady: false,
    profileId: profileResolution.profileId,
    publishingReadiness,
    readiness,
    requiredConfigKeys: getRequiredConfigKeys(),
    status,
    valid,
  };

  if (options.consumer || handlers.length > 0) {
    runtimeSeams.set(summary, { consumer: options.consumer, handlers });
  }

  return summary;
};

export const evaluateLiveQueueConsumeMessage = (
  message: LiveQueueConsumeMessage,
  options: EvaluateLiveQueueConsumeMessageOptions = {},
): LiveQueueConsumeResult => {
  const readiness = options.readiness ?? createLiveQueueConsumeLoopReadiness({ profileId: "local-review" });
  const runtime = runtimeSeams.get(readiness);
  const consumer = options.consumer ?? runtime?.consumer;
  const handlers = options.handlers ?? runtime?.handlers ?? [];
  const messageDiagnostics = validateConsumeMessage(message, readiness);

  if (!readiness.consumeAttemptAllowed || !consumer) {
    const diagnostics = readiness.consumeAttemptAllowed
      ? messageDiagnostics
      : [
        ...messageDiagnostics,
        diagnostic("LIVE_QUEUE_CONSUME_NOT_READY", "readiness", "Live queue consumption is not ready for this message."),
      ];

    return createConsumeResult(message, "blocked_by_gate", "blocked", false, false, diagnostics);
  }

  if (messageDiagnostics.length > 0) {
    return createConsumeResult(message, "rejected", "blocked", false, false, messageDiagnostics);
  }

  const handler = handlers.find((item) => item.jobIds.includes(message.jobId));

  if (!handler) {
    return createConsumeResult(
      message,
      "rejected",
      "blocked",
      false,
      false,
      [diagnostic("LIVE_QUEUE_HANDLER_MISSING", "jobId", "No live queue handler is registered for this job.")],
    );
  }

  try {
    const reserveResult = consumer.reserve?.(message);
    const reserveDiagnostics = diagnosticsFromOperationResult(reserveResult, "consumer");

    if (reserveResult?.status === "rejected" || reserveResult?.status === "failed") {
      return createConsumeResult(
        message,
        "failed",
        "retry",
        true,
        false,
        reserveDiagnostics.length > 0
          ? reserveDiagnostics
          : [diagnostic("LIVE_QUEUE_CONSUMER_REJECTED", "consumer", "Live queue consumer rejected the message.")],
      );
    }
  } catch (error) {
    return {
      ...createConsumeResult(
        message,
        "failed",
        "retry",
        true,
        false,
        [diagnostic("LIVE_QUEUE_CONSUMER_FAILED", "consumer", "Live queue consumer failed with redacted error detail.")],
      ),
      consumerErrorRedacted: redactLiveQueueConsumeValue(error),
    };
  }

  let handlerResult: LiveQueueHandlerResult;

  try {
    handlerResult = handler.handle(message);
  } catch (error) {
    return {
      ...createConsumeResult(
        message,
        "failed",
        resolveFailureDecision(message),
        true,
        true,
        [diagnostic("LIVE_QUEUE_HANDLER_FAILED", "handler", "Live queue handler failed with redacted error detail.")],
      ),
      handlerErrorRedacted: redactLiveQueueConsumeValue(error),
    };
  }

  const outcome = resolveHandlerOutcome(message, handlerResult);
  const settled = settleConsumerDecision(consumer, message, outcome.decision);

  return {
    ...createConsumeResult(
      message,
      outcome.status,
      outcome.decision,
      true,
      true,
      [
        ...diagnosticsFromHandlerResult(handlerResult),
        ...settled.diagnostics,
      ],
    ),
    operationId: sanitizeOptionalConsumeString(handlerResult.operationId ?? settled.operationId),
  };
};

export const redactLiveQueueConsumeValue = (value: unknown): unknown => {
  if (value instanceof Error) {
    return REDACTED_VALUE;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactLiveQueueConsumeValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (isSensitiveConsumeKey(key)) {
          return [key, REDACTED_VALUE];
        }

        return [key, redactLiveQueueConsumeValue(nestedValue)];
      }),
    );
  }

  if (typeof value !== "string") {
    return value;
  }

  if (isRawConsumePayload(value)) {
    return RAW_CONSUME_PAYLOAD_VALUE;
  }

  if (isUnsafeConsumeString(value)) {
    return REDACTED_VALUE;
  }

  return value;
};

function precondition(
  area: LiveQueueConsumePreconditionArea,
  diagnosticCode: LiveQueueConsumeDiagnosticCode,
  field: string,
  id: string,
  message: string,
  requiredConfigKeys = [field],
  status: LiveQueueConsumeProductionPrecondition["status"] = "blocked",
): LiveQueueConsumeProductionPrecondition {
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
  activationStatus: LiveQueueConsumeActivationStatus;
  blockerCount: number;
  consumeAttemptAllowed: boolean;
  consumerId: string;
  diagnosticCodes: LiveQueueConsumeDiagnosticCode[];
  handlerRegistryProvided: boolean;
  liveQueueConsumptionEnabled: boolean;
  mode: LiveQueueConsumeMode;
  status: LiveQueueConsumeStatus;
  valid: boolean;
}): LiveQueueConsumeReadinessProjection {
  return {
    activationStatus: input.activationStatus,
    blockerCount: input.blockerCount,
    consumeAttemptAllowed: input.consumeAttemptAllowed,
    consumerId: input.consumerId,
    diagnosticCodes: input.diagnosticCodes,
    handlerRegistryProvided: input.handlerRegistryProvided,
    liveConsumeAttempted: false,
    liveQueueConsumptionEnabled: input.liveQueueConsumptionEnabled,
    mode: input.mode,
    productionReady: false,
    status: input.status,
    valid: input.valid,
  };
}

function createProductionDiagnostics(
  env: Record<string, unknown>,
  consumer: LiveQueueConsumer | undefined,
  handlers: LiveQueueHandler[],
): LiveQueueConsumeDiagnostic[] {
  return liveQueueConsumeProductionPreconditions
    .filter((item) => {
      if (item.diagnosticCode === "LIVE_QUEUE_CONSUMER_MISSING") {
        return !consumer;
      }

      if (item.diagnosticCode === "LIVE_QUEUE_HANDLER_REGISTRY_MISSING") {
        return handlers.length === 0;
      }

      return item.requiredConfigKeys.some((key) => !hasUsableValue(env[key]));
    })
    .map((item) => diagnostic(item.diagnosticCode, item.field, item.message));
}

function createDependencyDiagnostics(
  bullmqConstruction: BullmqConstructionReadinessSummary,
  publishingReadiness: LiveQueuePublishingReadinessSummary,
): LiveQueueConsumeDiagnostic[] {
  return [
    ...bullmqConstruction.diagnostics.map((item) => ({
      code: item.code,
      field: item.field,
      message: item.message,
      severity: item.severity,
    })),
    ...publishingReadiness.diagnostics.map((item) => ({
      code: item.code,
      field: item.field,
      message: item.message,
      severity: item.severity,
    })),
  ];
}

function createUnsafeConfigDiagnostics(
  env: Record<string, unknown>,
  consumer?: LiveQueueConsumer,
): LiveQueueConsumeDiagnostic[] {
  const unsafeValues = [
    env.CAMPAIGN_OS_LIVE_QUEUE_CONSUME_ENABLEMENT,
    env.CAMPAIGN_OS_LIVE_QUEUE_CONSUMER,
    consumer?.consumerId,
  ];

  return unsafeValues.some((value) => typeof value === "string" && isUnsafeConsumeString(value))
    ? [
      diagnostic(
        "LIVE_QUEUE_CONSUME_UNSAFE_CONFIG",
        "liveQueueConsumeConfig",
        "Live queue consume configuration contains unsafe raw material and was redacted.",
      ),
    ]
    : [];
}

function validateConsumeMessage(
  message: LiveQueueConsumeMessage,
  readiness: LiveQueueConsumeReadinessSummary,
): LiveQueueConsumeDiagnostic[] {
  const diagnostics: LiveQueueConsumeDiagnostic[] = [];

  if (!hasUsableValue(message.traceId)) {
    diagnostics.push(diagnostic("LIVE_QUEUE_MISSING_TRACE_ID", "traceId", "Trace id is required before live consumption."));
  }

  if (!isKnownQueueId(message.queueId)) {
    diagnostics.push(diagnostic("LIVE_QUEUE_UNKNOWN_QUEUE_ID", "queueId", "Queue id is not registered for live consumption."));
  }

  if (!isKnownJobId(message.jobId)) {
    diagnostics.push(diagnostic("LIVE_QUEUE_UNKNOWN_JOB_ID", "jobId", "Job id is not registered for live consumption."));
  } else if (!isJobAllowedOnQueue(message.queueId, message.jobId)) {
    diagnostics.push(diagnostic("LIVE_QUEUE_MISMATCHED_QUEUE_JOB", "jobId", "Job id is not allowed on the requested queue."));
  }

  if (!hasPresentValue(message.payloadReference) && !hasPresentValue(message.payloadHash)) {
    diagnostics.push(diagnostic("LIVE_QUEUE_MISSING_PAYLOAD_REFERENCE", "payloadReference", "Payload reference or hash is required before live consumption."));
  }

  if (hasUnsafeReference(message.payloadReference) || (message.payloadHash && hasUnsafeReference(message.payloadHash))) {
    diagnostics.push(diagnostic("LIVE_QUEUE_UNSAFE_PAYLOAD_REFERENCE", "payloadReference", "Payload reference contains unsafe raw material and was redacted."));
  }

  if (!hasPresentValue(message.idempotencyReference)) {
    diagnostics.push(diagnostic("LIVE_QUEUE_MISSING_IDEMPOTENCY_REFERENCE", "idempotencyReference", "Idempotency reference is required before live consumption."));
  } else if (hasUnsafeReference(message.idempotencyReference)) {
    diagnostics.push(diagnostic("LIVE_QUEUE_UNSAFE_IDEMPOTENCY_REFERENCE", "idempotencyReference", "Idempotency reference contains unsafe raw material and was redacted."));
  }

  if (!hasPresentValue(message.leaseReference)) {
    diagnostics.push(diagnostic("LIVE_QUEUE_MISSING_LEASE_REFERENCE", "leaseReference", "Lease reference is required before live consumption."));
  } else if (hasUnsafeReference(message.leaseReference)) {
    diagnostics.push(diagnostic("LIVE_QUEUE_UNSAFE_LEASE_REFERENCE", "leaseReference", "Lease reference contains unsafe raw material and was redacted."));
  }

  if (message.fencingTokenReference && hasUnsafeReference(message.fencingTokenReference)) {
    diagnostics.push(diagnostic("LIVE_QUEUE_UNSAFE_FENCING_REFERENCE", "fencingTokenReference", "Fencing token reference contains unsafe raw material and was redacted."));
  }

  if (!Number.isInteger(message.attempt) || message.attempt < 1 || message.attempt > getMaxAttempts(message.jobId)) {
    diagnostics.push(diagnostic("LIVE_QUEUE_INVALID_ATTEMPT", "attempt", "Attempt must be a positive integer within the retry policy limit."));
  }

  if (readiness.status === "failed") {
    diagnostics.push(diagnostic("LIVE_QUEUE_CONSUMER_FAILED", "readiness", "Live queue consume readiness is failed."));
  }

  return diagnostics;
}

function resolveHandlerOutcome(
  message: LiveQueueConsumeMessage,
  handlerResult: LiveQueueHandlerResult,
): { decision: LiveQueueConsumeDecision; status: LiveQueueConsumeResult["status"] } {
  switch (handlerResult.status) {
    case "completed":
      return { decision: "ack", status: "accepted" };
    case "duplicate":
      return { decision: "drop_duplicate", status: "duplicate_existing" };
    case "lease_conflict":
      return { decision: message.attempt >= getMaxAttempts(message.jobId) ? "dead_letter" : "retry", status: "lease_conflict" };
    case "manual_review":
      return { decision: "hold_manual_review", status: "manual_review" };
    case "non_retryable_failure":
      return { decision: hasDeadLetterRoute(message.queueId) ? "dead_letter" : "hold_manual_review", status: "failed" };
    case "retryable_failure":
      return {
        decision: resolveFailureDecision(message),
        status: message.attempt < getMaxAttempts(message.jobId) ? "accepted" : "failed",
      };
    case "failed":
      return { decision: resolveFailureDecision(message), status: "failed" };
  }
}

function resolveFailureDecision(message: LiveQueueConsumeMessage): LiveQueueConsumeDecision {
  if (message.attempt < getMaxAttempts(message.jobId)) {
    return "retry";
  }

  return hasDeadLetterRoute(message.queueId) ? "dead_letter" : "hold_manual_review";
}

function settleConsumerDecision(
  consumer: LiveQueueConsumer,
  message: LiveQueueConsumeMessage,
  decision: LiveQueueConsumeDecision,
): { diagnostics: LiveQueueConsumeDiagnostic[]; operationId?: string } {
  try {
    const operation = decision === "ack"
      ? consumer.ack?.(message)
      : decision === "retry"
        ? consumer.retry?.(message) ?? consumer.nack?.(message)
        : decision === "dead_letter"
          ? consumer.deadLetter?.(message)
          : decision === "drop_duplicate"
            ? consumer.nack?.(message)
            : undefined;

    return {
      diagnostics: diagnosticsFromOperationResult(operation, "consumer"),
      operationId: sanitizeOptionalConsumeString(operation?.operationId),
    };
  } catch (error) {
    return {
      diagnostics: [
        diagnostic("LIVE_QUEUE_CONSUMER_FAILED", "consumer", "Live queue consumer failed with redacted error detail."),
      ],
      operationId: sanitizeOptionalConsumeString(JSON.stringify(redactLiveQueueConsumeValue(error))),
    };
  }
}

function diagnosticsFromHandlerResult(result: LiveQueueHandlerResult): LiveQueueConsumeDiagnostic[] {
  const statusDiagnostics: LiveQueueConsumeDiagnostic[] = result.status === "retryable_failure"
    ? [diagnostic("LIVE_QUEUE_HANDLER_RETRYABLE_FAILURE", "handler", "Live queue handler returned a retryable failure.")]
    : result.status === "non_retryable_failure"
      ? [diagnostic("LIVE_QUEUE_HANDLER_NON_RETRYABLE_FAILURE", "handler", "Live queue handler returned a non-retryable failure.")]
      : result.status === "duplicate"
        ? [diagnostic("LIVE_QUEUE_DUPLICATE_IDEMPOTENCY_REFERENCE", "handler", "Live queue handler returned duplicate idempotency.")]
        : result.status === "lease_conflict"
          ? [diagnostic("LIVE_QUEUE_LEASE_CONFLICT", "handler", "Live queue handler returned lease conflict.")]
          : [];

  return [
    ...statusDiagnostics,
    ...(result.diagnostics ?? []),
    ...(result.diagnosticCodes ?? []).map((code) => diagnostic(code, "handler", `Handler returned ${code}.`)),
  ];
}

function diagnosticsFromOperationResult(
  result: LiveQueueConsumerOperationResult | undefined,
  field: string,
): LiveQueueConsumeDiagnostic[] {
  if (!result) {
    return [];
  }

  const statusDiagnostics = result.status === "rejected"
    ? [diagnostic("LIVE_QUEUE_CONSUMER_REJECTED", field, "Live queue consumer rejected the operation.")]
    : result.status === "failed"
      ? [diagnostic("LIVE_QUEUE_CONSUMER_FAILED", field, "Live queue consumer failed the operation.")]
      : [];

  return [
    ...statusDiagnostics,
    ...(result.diagnostics ?? []),
    ...(result.diagnosticCodes ?? []).map((code) => diagnostic(code, field, `Consumer returned ${code}.`)),
  ];
}

function createConsumeResult(
  message: LiveQueueConsumeMessage,
  status: LiveQueueConsumeResult["status"],
  decision: LiveQueueConsumeDecision,
  liveConsumeAttempted: boolean,
  handlerExecuted: boolean,
  diagnostics: LiveQueueConsumeDiagnostic[],
): LiveQueueConsumeResult {
  return {
    ackAttempted: decision === "ack",
    deadLetterAttempted: decision === "dead_letter",
    decision,
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    handlerExecuted,
    idempotencyReference: sanitizeOptionalConsumeString(message.idempotencyReference),
    jobId: sanitizeOptionalConsumeString(message.jobId),
    leaseReference: sanitizeOptionalConsumeString(message.leaseReference),
    liveConsumeAttempted,
    nackAttempted: decision === "retry",
    noLiveSideEffects: liveQueueConsumeNoLiveSideEffects,
    payloadHash: sanitizeOptionalConsumeString(message.payloadHash),
    payloadReference: sanitizeOptionalConsumeString(message.payloadReference),
    published: false,
    queueId: sanitizeOptionalConsumeString(message.queueId),
    requestedAt: sanitizeOptionalConsumeString(message.requestedAt),
    retryScheduled: decision === "retry",
    status,
    traceId: sanitizeOptionalConsumeString(message.traceId),
  };
}

function resolveReadinessStatus(
  profileId: LiveQueueConsumeProfileId,
  blockerCount: number,
  consumeAttemptAllowed: boolean,
): LiveQueueConsumeStatus {
  if (profileId === "local-review") {
    return blockerCount === 0 ? "disabled" : "blocked";
  }

  if (profileId === "staging-scaffold") {
    return blockerCount === 0 ? "scaffolded" : "blocked";
  }

  if (blockerCount > 0) {
    return "blocked";
  }

  return consumeAttemptAllowed ? "ready" : "blocked";
}

function resolveProfile(profileId?: string): {
  diagnostics: LiveQueueConsumeDiagnostic[];
  profileId: LiveQueueConsumeProfileId;
  valid: boolean;
} {
  if (!profileId || profileId === "local-review" || profileId === "staging-scaffold" || profileId === "production-required") {
    return {
      diagnostics: [],
      profileId: (profileId as LiveQueueConsumeProfileId | undefined) ?? "local-review",
      valid: true,
    };
  }

  return {
    diagnostics: [
      diagnostic("UNKNOWN_LIVE_QUEUE_CONSUME_PROFILE", "profileId", "Unknown live queue consume profile."),
    ],
    profileId: "local-review",
    valid: false,
  };
}

function resolveMode(profileId: LiveQueueConsumeProfileId, mode?: string): {
  diagnostics: LiveQueueConsumeDiagnostic[];
  mode: LiveQueueConsumeMode;
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
      diagnostic("UNKNOWN_LIVE_QUEUE_CONSUME_MODE", "mode", "Unknown live queue consume mode."),
    ],
    mode: defaultMode,
    valid: false,
  };
}

function resolveActivationStatus(
  profileId: LiveQueueConsumeProfileId,
  env: Record<string, unknown>,
): LiveQueueConsumeActivationStatus {
  if (profileId === "local-review") {
    return "disabled";
  }

  if (profileId === "staging-scaffold") {
    return "metadata_only";
  }

  return env.CAMPAIGN_OS_LIVE_QUEUE_CONSUME_ENABLEMENT === "explicitly-enabled"
    ? "explicitly_enabled"
    : "activation_required";
}

function resolveConsumerId(consumer?: LiveQueueConsumer): string {
  return consumer ? sanitizeConsumeString(consumer.consumerId) : "not_configured";
}

function diagnostic(
  code: LiveQueueConsumeDiagnosticCode,
  field: string,
  message: string,
  severity: LiveQueueConsumeDiagnosticSeverity = "error",
): LiveQueueConsumeDiagnostic {
  return {
    code,
    field,
    message: sanitizeConsumeString(message),
    severity,
  };
}

function getRequiredConfigKeys(): string[] {
  return Array.from(new Set(liveQueueConsumeProductionPreconditions.flatMap((item) => item.requiredConfigKeys)));
}

function getMaxAttempts(jobId: string): number {
  return maxAttemptsByJobId.get(jobId) ?? 1;
}

function hasDeadLetterRoute(queueId: string): boolean {
  return queueProviderDriverDeadLetterRoutes.some((route) => route.queueId === queueId);
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
  return typeof value === "string" && (!isSafeReference(value) || isUnsafeConsumeString(value));
}

function hasUsableValue(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0 && !isUnsafeConsumeString(value);
}

function hasPresentValue(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function sanitizeOptionalConsumeString(value: string | undefined): string | undefined {
  return value === undefined ? undefined : sanitizeConsumeString(value);
}

function sanitizeConsumeString(value: string): string {
  if (isRawConsumePayload(value)) {
    return RAW_CONSUME_PAYLOAD_VALUE;
  }

  if (isUnsafeConsumeString(value)) {
    return REDACTED_VALUE;
  }

  return value;
}

function isSafeReference(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9:._/-]{1,160}$/.test(value);
}

function isSensitiveConsumeKey(key: string): boolean {
  return /api[-_]?key|bearer|credential|fencing[-_]?(key|token|reference)|idempotency[-_]?(key|token)|job[-_]?data|lease[-_]?(key|token)|object[-_]?key|payload|private[-_]?key|provider[-_]?payload|redis[-_]?url|secret|signed[-_]?url|stack|token|wallet/i.test(key);
}

function isRawConsumePayload(value: string): boolean {
  return /[{[]|payload|jobData|wallet|walletAddress|private|stack/i.test(value);
}

function isUnsafeConsumeString(value: string): boolean {
  return /redis:\/\/[^@\s]+:[^@\s]+@|bearer\s+|credential|ELF_[A-Za-z0-9_]+|lease-token|private[-_]?key|secret|signed-url|signature=|token=|wallet[-_]?address|X-Amz-Signature/i.test(value);
}

function resolveDefaultMaxAttempts(jobId: string): number {
  if (
    jobId === "contract-sync-handoff-worker"
    || jobId === "export-preparation-worker"
    || jobId === "reward-distribution-handoff-worker"
  ) {
    return 1;
  }

  if (
    jobId === "ai-ops-report-worker"
    || jobId === "campaign-lifecycle-worker"
    || jobId === "stale-review-cleanup-worker"
  ) {
    return 2;
  }

  return 3;
}
