import type { BackendRuntimeProfileId } from "./backendProfiles";

export type ProviderClientProfileId = BackendRuntimeProfileId;
export type ProviderClientReadinessStatus = "disabled" | "blocked" | "failed" | "activated";
export type ProviderClientActivationStatus =
  | "disabled"
  | "metadata_only"
  | "activation_required"
  | "explicitly_enabled";
export type ProviderVerificationType = "WALLET" | "ON_CHAIN" | "DAPP_API" | "SOCIAL" | "MANUAL";
export type ProviderVerificationOutcome =
  | "blocked"
  | "completed"
  | "disable_provider_task_templates"
  | "failed"
  | "manual_review"
  | "pending";
export type ProviderClientResponseStatus =
  | "completed"
  | "duplicate"
  | "failed"
  | "lease_conflict"
  | "malformed"
  | "manual_review"
  | "non_retryable_failure"
  | "pending"
  | "rate_limited"
  | "retryable_failure"
  | "timeout"
  | "unavailable";
export type ProviderClientDiagnosticSeverity = "blocker" | "error" | "info" | "warning";
export type ProviderClientDiagnosticCode =
  | "UNKNOWN_PROVIDER_CLIENT_PROFILE"
  | "PROVIDER_CLIENT_ACTIVATION_MISSING"
  | "PROVIDER_CLIENT_REGISTRY_ENDPOINT_MISSING"
  | "PROVIDER_CLIENT_ENDPOINT_REFERENCE_MISSING"
  | "PROVIDER_CLIENT_CREDENTIAL_REFERENCE_MISSING"
  | "PROVIDER_CLIENT_SEAM_MISSING"
  | "PROVIDER_CLIENT_TIMEOUT_POLICY_MISSING"
  | "PROVIDER_CLIENT_RETRY_POLICY_MISSING"
  | "PROVIDER_CLIENT_CIRCUIT_BREAKER_POLICY_MISSING"
  | "PROVIDER_CLIENT_DEGRADATION_POLICY_MISSING"
  | "PROVIDER_CLIENT_WORKER_QUEUE_HANDOFF_MISSING"
  | "PROVIDER_CLIENT_CONSUME_READINESS_HANDOFF_MISSING"
  | "PROVIDER_CLIENT_RUNBOOK_MISSING"
  | "PROVIDER_CLIENT_REDACTION_POLICY_MISSING"
  | "PROVIDER_CLIENT_UNSAFE_CONFIG"
  | "PROVIDER_CLIENT_NOT_READY"
  | "PROVIDER_CLIENT_CIRCUIT_BREAKER_OPEN"
  | "PROVIDER_CLIENT_MISSING_TRACE_ID"
  | "PROVIDER_CLIENT_UNKNOWN_VERIFICATION_TYPE"
  | "PROVIDER_CLIENT_UNKNOWN_PROVIDER_GROUP"
  | "PROVIDER_CLIENT_UNSUPPORTED_VERIFICATION_TYPE"
  | "PROVIDER_CLIENT_MISSING_TASK_ID"
  | "PROVIDER_CLIENT_MISSING_CAMPAIGN_ID"
  | "PROVIDER_CLIENT_UNKNOWN_WORKER_JOB"
  | "PROVIDER_CLIENT_UNKNOWN_QUEUE"
  | "PROVIDER_CLIENT_MISMATCHED_QUEUE_JOB"
  | "PROVIDER_CLIENT_MISSING_WALLET_SESSION_REFERENCE"
  | "PROVIDER_CLIENT_UNSAFE_WALLET_REFERENCE"
  | "PROVIDER_CLIENT_MISSING_EVIDENCE_REFERENCE"
  | "PROVIDER_CLIENT_UNSAFE_EVIDENCE_REFERENCE"
  | "PROVIDER_CLIENT_MISSING_IDEMPOTENCY_REFERENCE"
  | "PROVIDER_CLIENT_UNSAFE_IDEMPOTENCY_REFERENCE"
  | "PROVIDER_CLIENT_MISSING_LEASE_REFERENCE"
  | "PROVIDER_CLIENT_UNSAFE_LEASE_REFERENCE"
  | "PROVIDER_CLIENT_INVALID_ATTEMPT"
  | "PROVIDER_CLIENT_UNSAFE_OPERATOR_CONTEXT"
  | "PROVIDER_CLIENT_MISSING_CLIENT"
  | "PROVIDER_CLIENT_COMPLETION_EVIDENCE_MISSING"
  | "PROVIDER_CLIENT_TIMEOUT"
  | "PROVIDER_CLIENT_RATE_LIMITED"
  | "PROVIDER_CLIENT_UNAVAILABLE"
  | "PROVIDER_CLIENT_MALFORMED_RESPONSE"
  | "PROVIDER_CLIENT_RETRYABLE_FAILURE"
  | "PROVIDER_CLIENT_NON_RETRYABLE_FAILURE"
  | "PROVIDER_CLIENT_DUPLICATE_IDEMPOTENCY"
  | "PROVIDER_CLIENT_LEASE_CONFLICT"
  | "PROVIDER_CLIENT_THROWN_ERROR";
export type ProviderClientPreconditionArea =
  | "activation"
  | "circuit_breaker"
  | "client"
  | "consume"
  | "credential"
  | "degradation"
  | "endpoint"
  | "redaction"
  | "registry"
  | "retry"
  | "runbook"
  | "timeout"
  | "worker_queue";
export type ProviderRetryPosture = "blocked" | "exhausted" | "none" | "retry_scheduled";
export type ProviderIdempotencyDecision =
  | "blocked"
  | "duplicate_drop"
  | "existing_completion"
  | "manual_review"
  | "pending"
  | "unique";
export type ProviderLeaseDecision = "acquired" | "blocked" | "conflict" | "manual_review" | "retry" | "stale";
export type ProviderCircuitBreakerState = "closed" | "half_open" | "open";
export type ProviderDegradationMode =
  | "blocked"
  | "disable_provider_task_templates"
  | "manual_review"
  | "pending";

export interface ProviderClientDownstreamLiveFlags {
  alternateQueuePublish: false;
  analyticsIngestion: false;
  contractCalls: false;
  objectStorageWrites: false;
  rewardDistribution: false;
  schedulerExecution: false;
  telemetryVendorExport: false;
}

export interface ProviderClientProductionPrecondition {
  area: ProviderClientPreconditionArea;
  diagnosticCode: ProviderClientDiagnosticCode;
  field: string;
  id: string;
  message: string;
  requiredBeforeProduction: true;
  requiredConfigKeys: string[];
  status: "blocked";
}

export interface ProviderClientDiagnostic {
  code: ProviderClientDiagnosticCode;
  field: string;
  message: string;
  nextAction?: string;
  redactedFields: string[];
  severity: ProviderClientDiagnosticSeverity;
}

export interface ProviderClientPolicy {
  circuitBreakerState: ProviderCircuitBreakerState;
  degradationMode: ProviderDegradationMode;
  maxAttempts: number;
  retryPolicyRef: string;
  timeoutMs: number;
}

export interface ProviderClientRegistryEntry {
  capabilities: string[];
  clientId: string;
  credentialRef: string;
  degradationPolicyRef: string;
  endpointRef: string;
  providerGroupId: string;
  retryPolicyRef: string;
  sourceCategory: string;
  supportedVerificationTypes: ProviderVerificationType[];
  timeoutPolicyRef: string;
}

export interface ProviderClientRegistrySummary {
  clients: ProviderClientRegistryEntry[];
  providerGroups: string[];
}

export interface ProviderWorkerQueueHandoff {
  consumeReadinessStatus: "activated" | "blocked" | "disabled";
  queueId: string;
  workerJobId: string;
}

export interface ProviderAttemptMetadata {
  count: number;
  maxAttempts: number;
}

export interface ProviderVerificationRequest {
  attempt: ProviderAttemptMetadata;
  campaignId: string;
  evidenceHash?: string;
  evidenceRef?: string;
  idempotencyRef: string;
  leaseRef: string;
  operatorContext?: Record<string, string>;
  providerGroupId: string;
  queueId: string;
  taskId: string;
  traceId: string;
  verificationType: ProviderVerificationType;
  walletAccountRef: string;
  walletSessionRef: string;
  workerJobId: string;
}

export interface ProviderClientResponse {
  degradationHint?: ProviderDegradationMode;
  diagnostics?: ProviderClientDiagnostic[];
  evidenceHash?: string;
  evidenceRef?: string;
  retryAfterMs?: number;
  status: ProviderClientResponseStatus;
}

export interface ProviderClient {
  clientId: string;
  evaluate: (request: ProviderVerificationRequest) => ProviderClientResponse;
  providerGroupId: string;
}

export interface ProviderClientReadinessSummary {
  activationStatus: ProviderClientActivationStatus;
  blockerCount: number;
  diagnosticCodes: ProviderClientDiagnosticCode[];
  diagnostics: ProviderClientDiagnostic[];
  downstreamLiveFlags: ProviderClientDownstreamLiveFlags;
  id: "campaign-os-provider-indexer-client-readiness";
  liveProviderCallsAttempted: false;
  policy: ProviderClientPolicy;
  preconditions: ProviderClientProductionPrecondition[];
  productionReady: false;
  profileId: ProviderClientProfileId;
  providerClientsEnabled: boolean;
  providerClientsProvided: boolean;
  queueHandoff: ProviderWorkerQueueHandoff;
  registry: ProviderClientRegistrySummary;
  requiredConfigKeys: string[];
  status: ProviderClientReadinessStatus;
  valid: boolean;
}

export interface CreateProviderIndexerClientReadinessOptions {
  clients?: ProviderClient[];
  env?: Record<string, unknown>;
  profileId?: string;
}

export interface EvaluateProviderVerificationRequestOptions {
  clients?: ProviderClient[];
  readiness?: ProviderClientReadinessSummary;
}

export interface ProviderNormalizedResult {
  clientExecuted: boolean;
  degradationDecision: ProviderDegradationMode;
  diagnosticCodes: ProviderClientDiagnosticCode[];
  diagnostics: ProviderClientDiagnostic[];
  downstreamLiveFlags: ProviderClientDownstreamLiveFlags;
  evidenceHash?: string;
  evidenceRef?: string;
  idempotencyDecision: ProviderIdempotencyDecision;
  leaseDecision: ProviderLeaseDecision;
  liveProviderCallsAttempted: boolean;
  outcome: ProviderVerificationOutcome;
  providerErrorRedacted?: unknown;
  providerGroupId?: string;
  retryPosture: ProviderRetryPosture;
  taskId?: string;
  traceId?: string;
}

const FOUNDATION_ID = "campaign-os-provider-indexer-client-readiness" as const;
const REDACTED_VALUE = "[redacted]";
const RAW_PROVIDER_PAYLOAD_VALUE = "[redacted-provider-payload]";
const DEFAULT_POLICY: ProviderClientPolicy = {
  circuitBreakerState: "closed",
  degradationMode: "manual_review",
  maxAttempts: 3,
  retryPolicyRef: "retry-policy:provider-backoff",
  timeoutMs: 2500,
};
const runtimeClients = new WeakMap<ProviderClientReadinessSummary, ProviderClient[]>();

const providerGroupVerificationTypes: Record<string, ProviderVerificationType[]> = {
  "aefinder-aelfscan-indexers": ["ON_CHAIN"],
  "dapp-api-adapters": ["DAPP_API"],
  "manual-review": ["MANUAL"],
  "social-api-adapters": ["SOCIAL"],
  "wallet-auth-session": ["WALLET"],
};

export const providerClientDownstreamLiveFlags: ProviderClientDownstreamLiveFlags = {
  alternateQueuePublish: false,
  analyticsIngestion: false,
  contractCalls: false,
  objectStorageWrites: false,
  rewardDistribution: false,
  schedulerExecution: false,
  telemetryVendorExport: false,
};

export const providerClientProductionPreconditions: ProviderClientProductionPrecondition[] = [
  precondition("activation", "PROVIDER_CLIENT_ACTIVATION_MISSING", "CAMPAIGN_OS_PROVIDER_CLIENT_ENABLEMENT", "provider-client-activation", "Explicit provider client activation is required before provider calls can advance."),
  precondition("registry", "PROVIDER_CLIENT_REGISTRY_ENDPOINT_MISSING", "CAMPAIGN_OS_PROVIDER_REGISTRY_URL", "provider-client-registry-endpoint", "Provider registry endpoint reference is required before provider calls can advance."),
  precondition("endpoint", "PROVIDER_CLIENT_ENDPOINT_REFERENCE_MISSING", "CAMPAIGN_OS_PROVIDER_ENDPOINT_REF", "provider-client-endpoint-reference", "Provider endpoint reference is required before provider calls can advance."),
  precondition("credential", "PROVIDER_CLIENT_CREDENTIAL_REFERENCE_MISSING", "CAMPAIGN_OS_PROVIDER_CREDENTIAL_REF", "provider-client-credential-reference", "Provider credential reference is required before provider calls can advance."),
  precondition("client", "PROVIDER_CLIENT_SEAM_MISSING", "CAMPAIGN_OS_PROVIDER_CLIENT_SEAM", "provider-client-seam", "Injected provider client seam is required before provider calls can advance."),
  precondition("timeout", "PROVIDER_CLIENT_TIMEOUT_POLICY_MISSING", "CAMPAIGN_OS_PROVIDER_TIMEOUT_POLICY", "provider-client-timeout-policy", "Provider timeout policy is required before provider calls can advance."),
  precondition("retry", "PROVIDER_CLIENT_RETRY_POLICY_MISSING", "CAMPAIGN_OS_PROVIDER_RETRY_POLICY", "provider-client-retry-policy", "Provider retry policy is required before provider calls can advance."),
  precondition("circuit_breaker", "PROVIDER_CLIENT_CIRCUIT_BREAKER_POLICY_MISSING", "CAMPAIGN_OS_PROVIDER_CIRCUIT_BREAKER_POLICY", "provider-client-circuit-breaker-policy", "Provider circuit breaker policy is required before provider calls can advance."),
  precondition("degradation", "PROVIDER_CLIENT_DEGRADATION_POLICY_MISSING", "CAMPAIGN_OS_PROVIDER_DEGRADATION_POLICY", "provider-client-degradation-policy", "Provider degradation policy is required before provider calls can advance."),
  precondition("worker_queue", "PROVIDER_CLIENT_WORKER_QUEUE_HANDOFF_MISSING", "CAMPAIGN_OS_PROVIDER_WORKER_QUEUE_HANDOFF", "provider-client-worker-queue-handoff", "Worker queue handoff is required before provider calls can advance."),
  precondition("consume", "PROVIDER_CLIENT_CONSUME_READINESS_HANDOFF_MISSING", "CAMPAIGN_OS_PROVIDER_CONSUME_READINESS_HANDOFF", "provider-client-consume-readiness-handoff", "Live queue consume readiness handoff is required before provider calls can advance."),
  precondition("runbook", "PROVIDER_CLIENT_RUNBOOK_MISSING", "CAMPAIGN_OS_PROVIDER_RUNBOOK_URL", "provider-client-runbook", "Operator runbook reference is required before provider calls can advance."),
  precondition("redaction", "PROVIDER_CLIENT_REDACTION_POLICY_MISSING", "CAMPAIGN_OS_PROVIDER_REDACTION_POLICY", "provider-client-redaction-policy", "Provider redaction policy is required before provider calls can advance."),
];

export const createProviderIndexerClientReadiness = (
  options: CreateProviderIndexerClientReadinessOptions = {},
): ProviderClientReadinessSummary => {
  const env = options.env ?? {};
  const clients = options.clients ?? [];
  const profileResolution = resolveProfile(options.profileId);
  const activationStatus = resolveActivationStatus(profileResolution.profileId, env);
  const policy = createPolicy(env);
  const productionDiagnostics = profileResolution.profileId === "production-required"
    ? createProductionDiagnostics(env, clients)
    : [];
  const unsafeDiagnostics = createUnsafeConfigDiagnostics(env);
  const diagnostics = [
    ...profileResolution.diagnostics,
    ...unsafeDiagnostics,
    ...productionDiagnostics,
  ];
  const blockerCount = diagnostics.filter((item) => item.severity === "blocker").length;
  const providerClientsEnabled = profileResolution.profileId === "production-required"
    && activationStatus === "explicitly_enabled"
    && clients.length > 0
    && blockerCount === 0;
  const status = resolveReadinessStatus(profileResolution.profileId, blockerCount, providerClientsEnabled);
  const valid = profileResolution.valid
    && blockerCount === 0
    && (profileResolution.profileId !== "production-required" || providerClientsEnabled);
  const summary: ProviderClientReadinessSummary = {
    activationStatus,
    blockerCount,
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    downstreamLiveFlags: providerClientDownstreamLiveFlags,
    id: FOUNDATION_ID,
    liveProviderCallsAttempted: false,
    policy,
    preconditions: providerClientProductionPreconditions.map((item) => ({ ...item })),
    productionReady: false,
    profileId: profileResolution.profileId,
    providerClientsEnabled,
    providerClientsProvided: clients.length > 0,
    queueHandoff: createQueueHandoff(env, providerClientsEnabled),
    registry: createRegistry(clients, env),
    requiredConfigKeys: getRequiredConfigKeys(),
    status,
    valid,
  };

  if (clients.length > 0) {
    runtimeClients.set(summary, clients);
  }

  return summary;
};

export const evaluateProviderVerificationRequest = (
  request: ProviderVerificationRequest,
  options: EvaluateProviderVerificationRequestOptions = {},
): ProviderNormalizedResult => {
  const readiness = options.readiness ?? createProviderIndexerClientReadiness({ profileId: "local-review" });
  const clients = options.clients ?? runtimeClients.get(readiness) ?? [];
  const requestDiagnostics = validateRequest(request, readiness);

  if (readiness.policy.circuitBreakerState === "open") {
    return createResult(request, {
      clientExecuted: false,
      diagnostics: [
        diagnostic(
          "PROVIDER_CLIENT_CIRCUIT_BREAKER_OPEN",
          "circuitBreaker",
          "Provider client circuit breaker is open.",
        ),
      ],
      outcome: "blocked",
      retryPosture: "blocked",
    });
  }

  if (!readiness.providerClientsEnabled) {
    return createResult(request, {
      clientExecuted: false,
      diagnostics: [
        ...requestDiagnostics,
        diagnostic("PROVIDER_CLIENT_NOT_READY", "readiness", "Provider client readiness is not activated."),
      ],
      outcome: "blocked",
      retryPosture: "blocked",
    });
  }

  if (requestDiagnostics.length > 0) {
    return createResult(request, {
      clientExecuted: false,
      diagnostics: requestDiagnostics,
      outcome: "blocked",
      retryPosture: "blocked",
    });
  }

  const client = clients.find((item) => item.providerGroupId === request.providerGroupId);

  if (!client) {
    return createResult(request, {
      clientExecuted: false,
      diagnostics: [
        diagnostic("PROVIDER_CLIENT_MISSING_CLIENT", "providerGroupId", "No injected provider client is registered for this provider group."),
      ],
      outcome: "blocked",
      retryPosture: "blocked",
    });
  }

  try {
    const response = client.evaluate(request);
    return normalizeProviderResponse(request, response);
  } catch (error) {
    return {
      ...createResult(request, {
        clientExecuted: true,
        diagnostics: [
          diagnostic("PROVIDER_CLIENT_THROWN_ERROR", "providerClient", "Provider client threw an error with redacted detail."),
        ],
        outcome: "failed",
        retryPosture: "blocked",
      }),
      providerErrorRedacted: redactProviderClientValue(error),
    };
  }
};

export const redactProviderClientValue = (value: unknown): unknown => {
  if (value instanceof Error) {
    return REDACTED_VALUE;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactProviderClientValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (isSensitiveProviderClientKey(key)) {
          return [key, isRawProviderPayloadValue(nestedValue) ? RAW_PROVIDER_PAYLOAD_VALUE : REDACTED_VALUE];
        }

        return [key, redactProviderClientValue(nestedValue)];
      }),
    );
  }

  if (typeof value !== "string") {
    return value;
  }

  if (isRawProviderPayload(value)) {
    return RAW_PROVIDER_PAYLOAD_VALUE;
  }

  if (isUnsafeProviderClientString(value) || isCredentialedUrl(value)) {
    return REDACTED_VALUE;
  }

  return value;
};

function precondition(
  area: ProviderClientPreconditionArea,
  diagnosticCode: ProviderClientDiagnosticCode,
  field: string,
  id: string,
  message: string,
  requiredConfigKeys = [field],
): ProviderClientProductionPrecondition {
  return {
    area,
    diagnosticCode,
    field,
    id,
    message,
    requiredBeforeProduction: true,
    requiredConfigKeys,
    status: "blocked",
  };
}

function createPolicy(env: Record<string, unknown>): ProviderClientPolicy {
  return {
    circuitBreakerState: env.CAMPAIGN_OS_PROVIDER_CIRCUIT_BREAKER_STATE === "open"
      ? "open"
      : env.CAMPAIGN_OS_PROVIDER_CIRCUIT_BREAKER_STATE === "half_open"
        ? "half_open"
        : "closed",
    degradationMode: env.CAMPAIGN_OS_PROVIDER_DEGRADATION_MODE === "disable_provider_task_templates"
      ? "disable_provider_task_templates"
      : env.CAMPAIGN_OS_PROVIDER_DEGRADATION_MODE === "blocked"
        ? "blocked"
        : env.CAMPAIGN_OS_PROVIDER_DEGRADATION_MODE === "pending"
          ? "pending"
          : "manual_review",
    maxAttempts: parsePositiveInteger(env.CAMPAIGN_OS_PROVIDER_MAX_ATTEMPTS, DEFAULT_POLICY.maxAttempts),
    retryPolicyRef: sanitizeProviderString(String(env.CAMPAIGN_OS_PROVIDER_RETRY_POLICY ?? DEFAULT_POLICY.retryPolicyRef)),
    timeoutMs: parsePositiveInteger(env.CAMPAIGN_OS_PROVIDER_TIMEOUT_MS, DEFAULT_POLICY.timeoutMs),
  };
}

function createQueueHandoff(
  env: Record<string, unknown>,
  providerClientsEnabled: boolean,
): ProviderWorkerQueueHandoff {
  return {
    consumeReadinessStatus: providerClientsEnabled ? "activated" : hasUsableValue(env.CAMPAIGN_OS_PROVIDER_CONSUME_READINESS_HANDOFF) ? "blocked" : "disabled",
    queueId: sanitizeProviderString(String(env.CAMPAIGN_OS_PROVIDER_WORKER_QUEUE_HANDOFF ?? "verification-jobs")),
    workerJobId: "task-verification-worker",
  };
}

function createRegistry(
  clients: ProviderClient[],
  env: Record<string, unknown>,
): ProviderClientRegistrySummary {
  const providerGroups = Array.from(new Set([...Object.keys(providerGroupVerificationTypes), ...clients.map((item) => item.providerGroupId)]));

  return {
    clients: clients.map((client) => ({
      capabilities: ["verification_evaluation", "redacted_diagnostics"],
      clientId: sanitizeProviderString(client.clientId),
      credentialRef: sanitizeProviderString(String(env.CAMPAIGN_OS_PROVIDER_CREDENTIAL_REF ?? "credential-ref:not-configured")),
      degradationPolicyRef: sanitizeProviderString(String(env.CAMPAIGN_OS_PROVIDER_DEGRADATION_POLICY ?? "degradation-ref:not-configured")),
      endpointRef: sanitizeProviderString(String(env.CAMPAIGN_OS_PROVIDER_ENDPOINT_REF ?? "endpoint-ref:not-configured")),
      providerGroupId: sanitizeProviderString(client.providerGroupId),
      retryPolicyRef: sanitizeProviderString(String(env.CAMPAIGN_OS_PROVIDER_RETRY_POLICY ?? "retry-ref:not-configured")),
      sourceCategory: resolveSourceCategory(client.providerGroupId),
      supportedVerificationTypes: providerGroupVerificationTypes[client.providerGroupId] ?? [],
      timeoutPolicyRef: sanitizeProviderString(String(env.CAMPAIGN_OS_PROVIDER_TIMEOUT_POLICY ?? "timeout-ref:not-configured")),
    })),
    providerGroups,
  };
}

function createProductionDiagnostics(
  env: Record<string, unknown>,
  clients: ProviderClient[],
): ProviderClientDiagnostic[] {
  return providerClientProductionPreconditions
    .filter((item) => {
      if (item.diagnosticCode === "PROVIDER_CLIENT_ACTIVATION_MISSING") {
        return env.CAMPAIGN_OS_PROVIDER_CLIENT_ENABLEMENT !== "explicitly-enabled";
      }

      if (item.diagnosticCode === "PROVIDER_CLIENT_SEAM_MISSING") {
        return clients.length === 0 || item.requiredConfigKeys.some((key) => !hasUsableValue(env[key]));
      }

      return item.requiredConfigKeys.some((key) => !hasUsableValue(env[key]));
    })
    .map((item) => diagnostic(item.diagnosticCode, item.field, item.message));
}

function createUnsafeConfigDiagnostics(env: Record<string, unknown>): ProviderClientDiagnostic[] {
  const unsafe = Object.entries(env).some(([key, value]) =>
    key.startsWith("CAMPAIGN_OS_PROVIDER") && typeof value === "string" && isUnsafeProviderClientString(value)
  );

  return unsafe
    ? [
      diagnostic(
        "PROVIDER_CLIENT_UNSAFE_CONFIG",
        "providerClientConfig",
        "Provider client configuration contains unsafe raw material and was redacted.",
      ),
    ]
    : [];
}

function validateRequest(
  request: ProviderVerificationRequest,
  readiness: ProviderClientReadinessSummary,
): ProviderClientDiagnostic[] {
  const diagnostics: ProviderClientDiagnostic[] = [];

  if (!hasPresentValue(request.traceId)) {
    diagnostics.push(diagnostic("PROVIDER_CLIENT_MISSING_TRACE_ID", "traceId", "Trace id is required before provider evaluation."));
  }

  if (!isVerificationType(request.verificationType)) {
    diagnostics.push(diagnostic("PROVIDER_CLIENT_UNKNOWN_VERIFICATION_TYPE", "verificationType", "Verification type is not supported by provider client readiness."));
  }

  if (!hasPresentValue(request.providerGroupId) || !providerGroupVerificationTypes[request.providerGroupId]) {
    diagnostics.push(diagnostic("PROVIDER_CLIENT_UNKNOWN_PROVIDER_GROUP", "providerGroupId", "Provider group is not registered for provider client readiness."));
  } else if (!providerGroupVerificationTypes[request.providerGroupId].includes(request.verificationType)) {
    diagnostics.push(diagnostic("PROVIDER_CLIENT_UNSUPPORTED_VERIFICATION_TYPE", "verificationType", "Provider group does not support the requested verification type."));
  }

  if (!hasPresentValue(request.taskId)) {
    diagnostics.push(diagnostic("PROVIDER_CLIENT_MISSING_TASK_ID", "taskId", "Task id is required before provider evaluation."));
  }

  if (!hasPresentValue(request.campaignId)) {
    diagnostics.push(diagnostic("PROVIDER_CLIENT_MISSING_CAMPAIGN_ID", "campaignId", "Campaign id is required before provider evaluation."));
  }

  if (request.workerJobId !== "task-verification-worker") {
    diagnostics.push(diagnostic("PROVIDER_CLIENT_UNKNOWN_WORKER_JOB", "workerJobId", "Provider verification must use the task verification worker."));
  }

  if (request.queueId !== "verification-jobs") {
    diagnostics.push(diagnostic("PROVIDER_CLIENT_UNKNOWN_QUEUE", "queueId", "Provider verification must use the verification jobs queue."));
  }

  if (request.workerJobId && request.queueId && request.workerJobId !== "task-verification-worker" && request.queueId !== "verification-jobs") {
    diagnostics.push(diagnostic("PROVIDER_CLIENT_MISMATCHED_QUEUE_JOB", "workerJobId", "Worker job is not allowed on the requested queue."));
  }

  if (!hasPresentValue(request.walletSessionRef) || !hasPresentValue(request.walletAccountRef)) {
    diagnostics.push(diagnostic("PROVIDER_CLIENT_MISSING_WALLET_SESSION_REFERENCE", "walletSessionRef", "Wallet session and account references are required before provider evaluation."));
  } else if (hasUnsafeReference(request.walletSessionRef) || hasUnsafeReference(request.walletAccountRef)) {
    diagnostics.push(diagnostic("PROVIDER_CLIENT_UNSAFE_WALLET_REFERENCE", "walletSessionRef", "Wallet references contain unsafe raw material and were redacted."));
  }

  if (!hasPresentValue(request.evidenceRef) && !hasPresentValue(request.evidenceHash)) {
    diagnostics.push(diagnostic("PROVIDER_CLIENT_MISSING_EVIDENCE_REFERENCE", "evidenceRef", "Evidence reference or hash is required before provider evaluation."));
  }

  if (hasUnsafeReference(request.evidenceRef) || hasUnsafeReference(request.evidenceHash)) {
    diagnostics.push(diagnostic("PROVIDER_CLIENT_UNSAFE_EVIDENCE_REFERENCE", "evidenceRef", "Evidence reference contains unsafe raw material and was redacted."));
  }

  if (!hasPresentValue(request.idempotencyRef)) {
    diagnostics.push(diagnostic("PROVIDER_CLIENT_MISSING_IDEMPOTENCY_REFERENCE", "idempotencyRef", "Idempotency reference is required before provider evaluation."));
  } else if (hasUnsafeReference(request.idempotencyRef)) {
    diagnostics.push(diagnostic("PROVIDER_CLIENT_UNSAFE_IDEMPOTENCY_REFERENCE", "idempotencyRef", "Idempotency reference contains unsafe raw material and was redacted."));
  }

  if (!hasPresentValue(request.leaseRef)) {
    diagnostics.push(diagnostic("PROVIDER_CLIENT_MISSING_LEASE_REFERENCE", "leaseRef", "Lease reference is required before provider evaluation."));
  } else if (hasUnsafeReference(request.leaseRef)) {
    diagnostics.push(diagnostic("PROVIDER_CLIENT_UNSAFE_LEASE_REFERENCE", "leaseRef", "Lease reference contains unsafe raw material and was redacted."));
  }

  if (!Number.isInteger(request.attempt.count) || request.attempt.count < 1 || request.attempt.count > request.attempt.maxAttempts || request.attempt.maxAttempts > readiness.policy.maxAttempts) {
    diagnostics.push(diagnostic("PROVIDER_CLIENT_INVALID_ATTEMPT", "attempt", "Attempt metadata must be within the configured retry policy."));
  }

  if (hasUnsafeOperatorContext(request.operatorContext)) {
    diagnostics.push(diagnostic("PROVIDER_CLIENT_UNSAFE_OPERATOR_CONTEXT", "operatorContext", "Operator context contains unsafe raw material and was redacted."));
  }

  return diagnostics;
}

function normalizeProviderResponse(
  request: ProviderVerificationRequest,
  response: ProviderClientResponse,
): ProviderNormalizedResult {
  const responseDiagnostics = sanitizeDiagnostics(response.diagnostics ?? []);

  switch (response.status) {
    case "completed": {
      if (
        !hasPresentValue(response.evidenceRef)
        || !hasPresentValue(response.evidenceHash)
        || hasUnsafeReference(response.evidenceRef)
        || hasUnsafeReference(response.evidenceHash)
      ) {
        return createResult(request, {
          clientExecuted: true,
          diagnostics: [
            ...responseDiagnostics,
            diagnostic("PROVIDER_CLIENT_COMPLETION_EVIDENCE_MISSING", "evidenceHash", "Completed provider response is missing safe evidence reference or hash."),
          ],
          outcome: "blocked",
          retryPosture: "blocked",
        });
      }

      return createResult(request, {
        clientExecuted: true,
        diagnostics: responseDiagnostics,
        evidenceHash: response.evidenceHash,
        evidenceRef: response.evidenceRef,
        outcome: "completed",
        retryPosture: "none",
      });
    }
    case "pending":
      return createResult(request, {
        clientExecuted: true,
        diagnostics: responseDiagnostics,
        outcome: "pending",
        retryPosture: "none",
      });
    case "manual_review":
      return createResult(request, {
        clientExecuted: true,
        degradationDecision: "manual_review",
        diagnostics: responseDiagnostics,
        outcome: "manual_review",
        retryPosture: "none",
      });
    case "timeout":
      return createRetryableProviderResult(request, "PROVIDER_CLIENT_TIMEOUT", "Provider client timed out.", responseDiagnostics);
    case "rate_limited":
      return createRetryableProviderResult(request, "PROVIDER_CLIENT_RATE_LIMITED", "Provider client was rate limited.", responseDiagnostics);
    case "unavailable":
      return createRetryableProviderResult(request, "PROVIDER_CLIENT_UNAVAILABLE", "Provider client is unavailable.", responseDiagnostics);
    case "retryable_failure":
      return createRetryableProviderResult(request, "PROVIDER_CLIENT_RETRYABLE_FAILURE", "Provider client returned a retryable failure.", responseDiagnostics);
    case "malformed":
      return createResult(request, {
        clientExecuted: true,
        diagnostics: [
          ...responseDiagnostics,
          diagnostic("PROVIDER_CLIENT_MALFORMED_RESPONSE", "providerResponse", "Provider client returned malformed response metadata."),
        ],
        outcome: "blocked",
        retryPosture: "blocked",
      });
    case "non_retryable_failure":
      return createResult(request, {
        clientExecuted: true,
        diagnostics: [
          ...responseDiagnostics,
          diagnostic("PROVIDER_CLIENT_NON_RETRYABLE_FAILURE", "providerResponse", "Provider client returned a non-retryable failure."),
        ],
        outcome: "failed",
        retryPosture: "blocked",
      });
    case "failed":
      return createResult(request, {
        clientExecuted: true,
        diagnostics: responseDiagnostics,
        outcome: "failed",
        retryPosture: "blocked",
      });
    case "duplicate":
      return createResult(request, {
        clientExecuted: true,
        diagnostics: [
          ...responseDiagnostics,
          diagnostic("PROVIDER_CLIENT_DUPLICATE_IDEMPOTENCY", "idempotencyRef", "Provider client returned duplicate idempotency posture."),
        ],
        idempotencyDecision: "duplicate_drop",
        outcome: "blocked",
        retryPosture: "blocked",
      });
    case "lease_conflict":
      return createResult(request, {
        clientExecuted: true,
        diagnostics: [
          ...responseDiagnostics,
          diagnostic("PROVIDER_CLIENT_LEASE_CONFLICT", "leaseRef", "Provider client returned lease conflict posture."),
        ],
        leaseDecision: "conflict",
        outcome: "blocked",
        retryPosture: "blocked",
      });
  }
}

function createRetryableProviderResult(
  request: ProviderVerificationRequest,
  code: ProviderClientDiagnosticCode,
  message: string,
  responseDiagnostics: ProviderClientDiagnostic[],
): ProviderNormalizedResult {
  const retryExhausted = request.attempt.count >= request.attempt.maxAttempts;

  return createResult(request, {
    clientExecuted: true,
    degradationDecision: retryExhausted ? "manual_review" : "pending",
    diagnostics: [
      ...responseDiagnostics,
      diagnostic(code, "providerResponse", message),
    ],
    outcome: retryExhausted ? "manual_review" : "pending",
    retryPosture: retryExhausted ? "exhausted" : "retry_scheduled",
  });
}

function createResult(
  request: ProviderVerificationRequest,
  input: {
    clientExecuted: boolean;
    degradationDecision?: ProviderDegradationMode;
    diagnostics: ProviderClientDiagnostic[];
    evidenceHash?: string;
    evidenceRef?: string;
    idempotencyDecision?: ProviderIdempotencyDecision;
    leaseDecision?: ProviderLeaseDecision;
    outcome: ProviderVerificationOutcome;
    retryPosture: ProviderRetryPosture;
  },
): ProviderNormalizedResult {
  return {
    clientExecuted: input.clientExecuted,
    degradationDecision: input.degradationDecision ?? (input.outcome === "blocked" ? "blocked" : "pending"),
    diagnosticCodes: input.diagnostics.map((item) => item.code),
    diagnostics: input.diagnostics,
    downstreamLiveFlags: providerClientDownstreamLiveFlags,
    evidenceHash: sanitizeOptionalProviderString(input.evidenceHash),
    evidenceRef: sanitizeOptionalProviderString(input.evidenceRef),
    idempotencyDecision: input.idempotencyDecision ?? "unique",
    leaseDecision: input.leaseDecision ?? "acquired",
    liveProviderCallsAttempted: input.clientExecuted,
    outcome: input.outcome,
    providerGroupId: sanitizeOptionalProviderString(request.providerGroupId),
    retryPosture: input.retryPosture,
    taskId: sanitizeOptionalProviderString(request.taskId),
    traceId: sanitizeOptionalProviderString(request.traceId),
  };
}

function resolveProfile(profileId?: string): {
  diagnostics: ProviderClientDiagnostic[];
  profileId: ProviderClientProfileId;
  valid: boolean;
} {
  if (!profileId || profileId === "local-review" || profileId === "staging-scaffold" || profileId === "production-required") {
    return {
      diagnostics: [],
      profileId: (profileId as ProviderClientProfileId | undefined) ?? "local-review",
      valid: true,
    };
  }

  return {
    diagnostics: [
      diagnostic("UNKNOWN_PROVIDER_CLIENT_PROFILE", "profileId", "Unknown provider client runtime profile."),
    ],
    profileId: "production-required",
    valid: false,
  };
}

function resolveActivationStatus(
  profileId: ProviderClientProfileId,
  env: Record<string, unknown>,
): ProviderClientActivationStatus {
  if (profileId === "local-review") {
    return "disabled";
  }

  if (profileId === "staging-scaffold") {
    return "metadata_only";
  }

  return env.CAMPAIGN_OS_PROVIDER_CLIENT_ENABLEMENT === "explicitly-enabled"
    ? "explicitly_enabled"
    : "activation_required";
}

function resolveReadinessStatus(
  profileId: ProviderClientProfileId,
  blockerCount: number,
  providerClientsEnabled: boolean,
): ProviderClientReadinessStatus {
  if (blockerCount > 0) {
    return "blocked";
  }

  if (profileId === "production-required") {
    return providerClientsEnabled ? "activated" : "blocked";
  }

  return "disabled";
}

function diagnostic(
  code: ProviderClientDiagnosticCode,
  field: string,
  message: string,
  severity: ProviderClientDiagnosticSeverity = "blocker",
): ProviderClientDiagnostic {
  return {
    code,
    field,
    message: sanitizeProviderString(message),
    redactedFields: [],
    severity,
  };
}

function sanitizeDiagnostics(diagnostics: ProviderClientDiagnostic[]): ProviderClientDiagnostic[] {
  return diagnostics.map((item) => ({
    code: item.code,
    field: sanitizeProviderString(item.field),
    message: sanitizeProviderString(item.message),
    nextAction: item.nextAction ? sanitizeProviderString(item.nextAction) : undefined,
    redactedFields: item.redactedFields.map((field) => sanitizeProviderString(field)),
    severity: item.severity,
  }));
}

function getRequiredConfigKeys(): string[] {
  return Array.from(new Set(providerClientProductionPreconditions.flatMap((item) => item.requiredConfigKeys)));
}

function parsePositiveInteger(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);

    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

function resolveSourceCategory(providerGroupId: string): string {
  if (providerGroupId === "aefinder-aelfscan-indexers") {
    return "indexer";
  }

  if (providerGroupId === "dapp-api-adapters") {
    return "dapp_api";
  }

  if (providerGroupId === "social-api-adapters") {
    return "social_api";
  }

  if (providerGroupId === "wallet-auth-session") {
    return "wallet_session";
  }

  return providerGroupId === "manual-review" ? "manual_review" : "provider_client";
}

function isVerificationType(value: string): value is ProviderVerificationType {
  return value === "WALLET" || value === "ON_CHAIN" || value === "DAPP_API" || value === "SOCIAL" || value === "MANUAL";
}

function hasUnsafeOperatorContext(context: Record<string, string> | undefined): boolean {
  if (!context) {
    return false;
  }

  return Object.entries(context).some(([key, value]) =>
    isSensitiveProviderClientKey(key) || isRawProviderPayload(value) || isUnsafeProviderClientString(value) || isCredentialedUrl(value)
  );
}

function hasUnsafeReference(value: string | undefined): boolean {
  return typeof value === "string" && (!isSafeReference(value) || isUnsafeProviderClientString(value) || isCredentialedUrl(value));
}

function hasUsableValue(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0 && !isUnsafeProviderClientString(value) && !isCredentialedUrl(value);
}

function hasPresentValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function sanitizeOptionalProviderString(value: string | undefined): string | undefined {
  return value === undefined ? undefined : sanitizeProviderString(value);
}

function sanitizeProviderString(value: string): string {
  if (isRawProviderPayload(value)) {
    return RAW_PROVIDER_PAYLOAD_VALUE;
  }

  if (isUnsafeProviderClientString(value) || isCredentialedUrl(value)) {
    return REDACTED_VALUE;
  }

  return value;
}

function isSafeReference(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9:._/-]{1,180}$/.test(value);
}

function isSensitiveProviderClientKey(key: string): boolean {
  return /api[-_]?key|bearer|credential(?![-_]?ref)|endpoint[-_]?url|idempotency[-_]?(key|token)|lease[-_]?(key|token)|object[-_]?key|payload|private[-_]?key|provider[-_]?payload|raw[-_]?payload|secret|signed[-_]?url|social[-_]?token|stack|token|wallet[-_]?address/i.test(
    key,
  );
}

function isRawProviderPayloadValue(value: unknown): boolean {
  return typeof value === "string" && isRawProviderPayload(value);
}

function isRawProviderPayload(value: string): boolean {
  const trimmed = value.trim();

  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
    return false;
  }

  return /address|payload|provider|score|wallet/i.test(trimmed);
}

function isUnsafeProviderClientString(value: string): boolean {
  return /api[-_]?key[-_:]?|bearer\s+|ELF_[A-Za-z0-9_]+|idem-token=|lease-token=|private[-_]?key|secret|signature=|social-token|token=|wallet[-_]?address|X-Amz-Signature/i.test(
    value,
  );
}

function isCredentialedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return Boolean(url.username || url.password || url.searchParams.size > 0);
  } catch {
    return false;
  }
}
