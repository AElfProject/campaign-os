import type { BackendRuntimeProfileId } from "./backendProfiles";
import {
  createRedisBrokerConnectionReadiness,
  redisBrokerConnectionProductionPreconditions,
  type RedisBrokerConnectionDiagnosticCode,
  type RedisBrokerConnectionReadinessSummary,
} from "./redisBrokerConnectionReadiness";

export type BullmqConstructionProfileId = BackendRuntimeProfileId;
export type BullmqConstructionMode = "dry_run" | "metadata_only" | "production_required";
export type BullmqConstructionStatus = "local_ready" | "scaffolded" | "constructed" | "partial" | "failed" | "blocked";
export type BullmqConstructionActivationStatus =
  | "disabled"
  | "metadata_only"
  | "activation_required"
  | "explicitly_enabled";
export type BullmqConstructionActivationSource = "default" | "env_reference" | "test_injection" | "operator_config";
export type BullmqConstructionHandoffStatus = "not_configured" | "reference_only" | "ready";
export type BullmqConstructedClientKind = "queue" | "worker" | "queue_events";
export type BullmqConstructionDiagnosticSeverity = "error" | "warning" | "info";
export type BullmqConstructionDiagnosticCode =
  | "UNKNOWN_BULLMQ_CONSTRUCTION_PROFILE"
  | "UNKNOWN_BULLMQ_CONSTRUCTION_MODE"
  | "BULLMQ_CONSTRUCTION_ACTIVATION_MISSING"
  | "BULLMQ_CONSTRUCTION_FACTORY_MISSING"
  | "BULLMQ_CONSTRUCTION_OBSERVABILITY_HANDOFF_MISSING"
  | "BULLMQ_CONSTRUCTION_RUNBOOK_MISSING"
  | "BULLMQ_CONSTRUCTION_FACTORY_FAILED"
  | "BULLMQ_QUEUE_CONSTRUCTION_FAILED"
  | "BULLMQ_WORKER_CONSTRUCTION_FAILED"
  | "BULLMQ_QUEUE_EVENTS_CONSTRUCTION_FAILED"
  | "BULLMQ_CONSTRUCTION_UNSAFE_CONFIG"
  | "BULLMQ_CONSTRUCTION_LIVE_OPERATION_BLOCKED"
  | RedisBrokerConnectionDiagnosticCode;
export type BullmqConstructionPreconditionArea =
  | "activation"
  | "broker"
  | "factory"
  | "observability"
  | "runbook";

export interface BullmqConstructionNoLiveFlags {
  browserBundleAllowed: false;
  liveAiCallsEnabled: false;
  liveAnalyticsIngestionEnabled: false;
  liveBrokerConnectionAttempted: false;
  liveBrokerHealthCheckAttempted: false;
  liveContractCallsEnabled: false;
  liveCronExecutionEnabled: false;
  liveIdempotencyExecutionEnabled: false;
  liveObjectStorageEnabled: false;
  liveProviderCallsEnabled: false;
  liveQueuePublishingEnabled: false;
  liveRewardDistributionEnabled: false;
  liveSchedulerExecutionEnabled: false;
  liveSocialCallsEnabled: false;
  liveTelemetryExportEnabled: false;
  liveWorkerExecutionEnabled: false;
}

export interface BullmqConstructionProductionPrecondition {
  area: BullmqConstructionPreconditionArea;
  diagnosticCode: BullmqConstructionDiagnosticCode;
  field: string;
  id: string;
  message: string;
  requiredBeforeProduction: true;
  requiredConfigKeys: string[];
  status: "blocked" | "deferred";
}

export interface BullmqConstructionDiagnostic {
  code: BullmqConstructionDiagnosticCode;
  field: string;
  message: string;
  severity: BullmqConstructionDiagnosticSeverity;
}

export interface BullmqConstructionFactoryClientResult {
  clientId?: string;
  constructed: boolean;
  diagnosticCode?: BullmqConstructionDiagnosticCode;
  optionReferenceId?: string;
}

export interface BullmqConstructionFactoryResult {
  queueClient: BullmqConstructionFactoryClientResult;
  queueEvents: BullmqConstructionFactoryClientResult;
  worker: BullmqConstructionFactoryClientResult;
}

export interface BullmqConstructionFactoryRequest {
  activationStatus: BullmqConstructionActivationStatus;
  constructionId: string;
  mode: BullmqConstructionMode;
  profileId: BullmqConstructionProfileId;
  requiredConfigKeys: string[];
}

export interface BullmqConstructionFactory {
  factoryId: string;
  construct: (request: BullmqConstructionFactoryRequest) => BullmqConstructionFactoryResult;
}

export interface BullmqConstructedClientState {
  clientId?: string;
  constructionAttempted: boolean;
  constructed: boolean;
  diagnosticCodes: BullmqConstructionDiagnosticCode[];
  kind: BullmqConstructedClientKind;
  liveOperationStarted: false;
  optionReferenceId?: string;
}

export interface BullmqConstructionActivation {
  activationSource: BullmqConstructionActivationSource;
  activationStatus: BullmqConstructionActivationStatus;
  observabilityHandoffStatus: BullmqConstructionHandoffStatus;
  operatorRunbookStatus: BullmqConstructionHandoffStatus;
  requiredConfigKeys: string[];
}

export interface BullmqConstructionReadinessRegistration extends BullmqConstructionActivation {
  constructionId: string;
  factoryId: string;
  factoryProvided: boolean;
  mode: BullmqConstructionMode;
  status: BullmqConstructionStatus;
}

export interface BullmqConstructionReadinessProjection {
  activationStatus: BullmqConstructionActivationStatus;
  blockerCount: number;
  browserBundleAllowed: false;
  bullmqConstructionAttempted: boolean;
  bullmqConstructionFactoryInvoked: boolean;
  constructionId: string;
  diagnosticCodes: BullmqConstructionDiagnosticCode[];
  factoryId: string;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode: BullmqConstructionMode;
  productionReady: false;
  queueClientConstructed: boolean;
  queueEventsConstructed: boolean;
  status: BullmqConstructionStatus;
  valid: boolean;
  workerConstructed: boolean;
}

export interface BullmqConstructionReadinessSummary extends BullmqConstructionReadinessRegistration {
  blockerCount: number;
  brokerReadiness: RedisBrokerConnectionReadinessSummary;
  browserBundleAllowed: false;
  bullmqConstructionAttempted: boolean;
  bullmqConstructionFactoryInvoked: boolean;
  diagnosticCodes: BullmqConstructionDiagnosticCode[];
  diagnostics: BullmqConstructionDiagnostic[];
  factoryErrorRedacted?: unknown;
  id: "campaign-os-bullmq-construction-readiness";
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  noLiveFlags: BullmqConstructionNoLiveFlags;
  preconditions: BullmqConstructionProductionPrecondition[];
  productionReady: false;
  profileId: BullmqConstructionProfileId;
  queueClient: BullmqConstructedClientState;
  queueClientConstructed: boolean;
  queueEvents: BullmqConstructedClientState;
  queueEventsConstructed: boolean;
  readiness: BullmqConstructionReadinessProjection;
  valid: boolean;
  worker: BullmqConstructedClientState;
  workerConstructed: boolean;
}

export interface CreateBullmqConstructionReadinessOptions {
  constructionFactory?: BullmqConstructionFactory;
  constructionId?: string;
  env?: Record<string, unknown>;
  mode?: string;
  profileId?: string;
}

const FOUNDATION_ID = "campaign-os-bullmq-construction-readiness" as const;
const LOCAL_CONSTRUCTION_ID = "bullmq-construction-local";
const STAGING_CONSTRUCTION_ID = "bullmq-construction-staging";
const PRODUCTION_CONSTRUCTION_ID = "bullmq-construction-production";
const REDACTED_VALUE = "[redacted]";
const RAW_CONSTRUCTION_PAYLOAD_VALUE = "[redacted-bullmq-construction-payload]";

export const SUPPORTED_BULLMQ_CONSTRUCTION_PROFILES: BullmqConstructionProfileId[] = [
  "local-review",
  "staging-scaffold",
  "production-required",
];

export const bullmqConstructionNoLiveFlags: BullmqConstructionNoLiveFlags = {
  browserBundleAllowed: false,
  liveAiCallsEnabled: false,
  liveAnalyticsIngestionEnabled: false,
  liveBrokerConnectionAttempted: false,
  liveBrokerHealthCheckAttempted: false,
  liveContractCallsEnabled: false,
  liveCronExecutionEnabled: false,
  liveIdempotencyExecutionEnabled: false,
  liveObjectStorageEnabled: false,
  liveProviderCallsEnabled: false,
  liveQueuePublishingEnabled: false,
  liveRewardDistributionEnabled: false,
  liveSchedulerExecutionEnabled: false,
  liveSocialCallsEnabled: false,
  liveTelemetryExportEnabled: false,
  liveWorkerExecutionEnabled: false,
};

export const bullmqConstructionProductionPreconditions: BullmqConstructionProductionPrecondition[] = [
  precondition("activation", "BULLMQ_CONSTRUCTION_ACTIVATION_MISSING", "CAMPAIGN_OS_BULLMQ_CONSTRUCTION_ENABLEMENT", "bullmq-construction-activation", "Explicit BullMQ construction activation is required before construction can advance."),
  precondition("factory", "BULLMQ_CONSTRUCTION_FACTORY_MISSING", "CAMPAIGN_OS_BULLMQ_CONSTRUCTION_FACTORY", "bullmq-construction-factory", "BullMQ construction factory reference is required before construction can advance."),
  precondition("observability", "BULLMQ_CONSTRUCTION_OBSERVABILITY_HANDOFF_MISSING", "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL", "bullmq-construction-observability-handoff", "Observability handoff is required before BullMQ construction activation.", undefined, "deferred"),
  precondition("runbook", "BULLMQ_CONSTRUCTION_RUNBOOK_MISSING", "CAMPAIGN_OS_OPERATOR_RUNBOOK_URL", "bullmq-construction-runbook", "Operator runbook reference is required before BullMQ construction activation.", undefined, "deferred"),
];

export const createBullmqConstructionReadiness = (
  options: CreateBullmqConstructionReadinessOptions = {},
): BullmqConstructionReadinessSummary => {
  const env = options.env ?? {};
  const profileResolution = resolveProfile(options.profileId);
  const modeResolution = resolveMode(profileResolution.profileId, options.mode);
  const constructionResolution = resolveConstructionId(options.constructionId, env, profileResolution.profileId);
  const brokerReadiness = createRedisBrokerConnectionReadiness({
    env,
    profileId: profileResolution.profileId,
  });
  const activation = createActivation(profileResolution.profileId, env);
  const factoryId = resolveFactoryId(options.constructionFactory);
  const productionDiagnostics =
    profileResolution.profileId === "production-required" ? createProductionDiagnostics(env) : [];
  const unsafeDiagnostics = createUnsafeConfigDiagnostics(env, options.constructionId);
  const baseDiagnostics = [
    ...profileResolution.diagnostics,
    ...modeResolution.diagnostics,
    ...constructionResolution.diagnostics,
    ...unsafeDiagnostics,
    ...productionDiagnostics,
    ...brokerReadiness.diagnostics.map(convertBrokerDiagnostic),
  ];
  const canAttemptConstruction = profileResolution.profileId === "production-required"
    && baseDiagnostics.filter((item) => item.severity === "error").length === 0
    && activation.activationStatus === "explicitly_enabled";
  const factoryResult = canAttemptConstruction
    ? invokeFactory({
      activationStatus: activation.activationStatus,
      constructionFactory: options.constructionFactory,
      constructionId: constructionResolution.constructionId,
      mode: modeResolution.mode,
      profileId: profileResolution.profileId,
      requiredConfigKeys: activation.requiredConfigKeys,
    })
    : createSkippedFactoryResult();
  const diagnostics = [...baseDiagnostics, ...factoryResult.diagnostics];
  const blockerCount = diagnostics.filter((item) => item.severity === "error").length;
  const status = resolveStatus(profileResolution.profileId, blockerCount, factoryResult);
  const valid = profileResolution.valid
    && modeResolution.valid
    && constructionResolution.valid
    && brokerReadiness.valid
    && blockerCount === 0
    && status !== "partial"
    && status !== "failed"
    && (profileResolution.profileId !== "production-required" || factoryResult.allConstructed);
  const registration = createRegistration({
    activation,
    constructionId: constructionResolution.constructionId,
    factoryId,
    factoryProvided: Boolean(options.constructionFactory),
    mode: modeResolution.mode,
    status,
  });
  const readiness = createReadinessProjection({
    activation,
    blockerCount,
    constructionId: constructionResolution.constructionId,
    diagnostics,
    factoryId: registration.factoryId,
    factoryResult,
    mode: modeResolution.mode,
    status,
    valid,
  });

  return {
    ...registration,
    blockerCount,
    brokerReadiness,
    browserBundleAllowed: false,
    bullmqConstructionAttempted: factoryResult.attempted,
    bullmqConstructionFactoryInvoked: factoryResult.factoryInvoked,
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    factoryErrorRedacted: factoryResult.factoryErrorRedacted,
    id: FOUNDATION_ID,
    liveQueuePublishingEnabled: false,
    liveWorkerExecutionEnabled: false,
    noLiveFlags: bullmqConstructionNoLiveFlags,
    preconditions: bullmqConstructionProductionPreconditions.map((item) => ({ ...item })),
    productionReady: false,
    profileId: profileResolution.profileId,
    queueClient: factoryResult.queueClient,
    queueClientConstructed: factoryResult.queueClient.constructed,
    queueEvents: factoryResult.queueEvents,
    queueEventsConstructed: factoryResult.queueEvents.constructed,
    readiness,
    valid,
    worker: factoryResult.worker,
    workerConstructed: factoryResult.worker.constructed,
  };
};

export const getBullmqConstructionReadinessRegistration = (
  constructionId: string = LOCAL_CONSTRUCTION_ID,
): BullmqConstructionReadinessRegistration | undefined => {
  const sanitizedConstructionId = sanitizeBullmqConstructionString(constructionId);

  if (sanitizedConstructionId === LOCAL_CONSTRUCTION_ID) {
    return createRegistration({
      activation: createActivation("local-review", {}),
      constructionId: LOCAL_CONSTRUCTION_ID,
      factoryId: "not_configured",
      factoryProvided: false,
      mode: "dry_run",
      status: "local_ready",
    });
  }

  if (sanitizedConstructionId === STAGING_CONSTRUCTION_ID) {
    return createRegistration({
      activation: createActivation("staging-scaffold", {}),
      constructionId: STAGING_CONSTRUCTION_ID,
      factoryId: "not_configured",
      factoryProvided: false,
      mode: "metadata_only",
      status: "scaffolded",
    });
  }

  if (sanitizedConstructionId === PRODUCTION_CONSTRUCTION_ID) {
    return createRegistration({
      activation: createActivation("production-required", {}),
      constructionId: PRODUCTION_CONSTRUCTION_ID,
      factoryId: "not_configured",
      factoryProvided: false,
      mode: "production_required",
      status: "blocked",
    });
  }

  return undefined;
};

function resolveFactoryId(constructionFactory: BullmqConstructionFactory | undefined): string {
  return constructionFactory
    ? sanitizeBullmqConstructionString(constructionFactory.factoryId)
    : "not_configured";
}

export const redactBullmqConstructionValue = (value: unknown): unknown => {
  if (value instanceof Error) {
    return REDACTED_VALUE;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactBullmqConstructionValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (isSensitiveBullmqConstructionKey(key)) {
          return [key, REDACTED_VALUE];
        }

        return [key, redactBullmqConstructionValue(nestedValue)];
      }),
    );
  }

  if (typeof value !== "string") {
    return value;
  }

  if (isRawBullmqConstructionPayload(value)) {
    return RAW_CONSTRUCTION_PAYLOAD_VALUE;
  }

  if (isUnsafeBullmqConstructionString(value)) {
    return REDACTED_VALUE;
  }

  return value;
};

function precondition(
  area: BullmqConstructionPreconditionArea,
  diagnosticCode: BullmqConstructionDiagnosticCode,
  field: string,
  id: string,
  message: string,
  requiredConfigKeys = [field],
  status: BullmqConstructionProductionPrecondition["status"] = "blocked",
): BullmqConstructionProductionPrecondition {
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
  activation: BullmqConstructionActivation;
  constructionId: string;
  factoryId: string;
  factoryProvided: boolean;
  mode: BullmqConstructionMode;
  status: BullmqConstructionStatus;
}): BullmqConstructionReadinessRegistration {
  return {
    ...input.activation,
    constructionId: input.constructionId,
    factoryId: input.factoryId,
    factoryProvided: input.factoryProvided,
    mode: input.mode,
    status: input.status,
  };
}

function createReadinessProjection(input: {
  activation: BullmqConstructionActivation;
  blockerCount: number;
  constructionId: string;
  diagnostics: readonly BullmqConstructionDiagnostic[];
  factoryId: string;
  factoryResult: FactoryInvocationResult;
  mode: BullmqConstructionMode;
  status: BullmqConstructionStatus;
  valid: boolean;
}): BullmqConstructionReadinessProjection {
  return {
    activationStatus: input.activation.activationStatus,
    blockerCount: input.blockerCount,
    browserBundleAllowed: false,
    bullmqConstructionAttempted: input.factoryResult.attempted,
    bullmqConstructionFactoryInvoked: input.factoryResult.factoryInvoked,
    constructionId: input.constructionId,
    diagnosticCodes: input.diagnostics.map((item) => item.code),
    factoryId: input.factoryId,
    liveQueuePublishingEnabled: false,
    liveWorkerExecutionEnabled: false,
    mode: input.mode,
    productionReady: false,
    queueClientConstructed: input.factoryResult.queueClient.constructed,
    queueEventsConstructed: input.factoryResult.queueEvents.constructed,
    status: input.status,
    valid: input.valid,
    workerConstructed: input.factoryResult.worker.constructed,
  };
}

function createActivation(
  profileId: BullmqConstructionProfileId,
  env: Record<string, unknown>,
): BullmqConstructionActivation {
  const activationStatus = resolveActivationStatus(profileId, env);
  const activationSource: BullmqConstructionActivationSource =
    activationStatus === "explicitly_enabled" ? "operator_config" : "default";

  return {
    activationSource,
    activationStatus,
    observabilityHandoffStatus: hasUsableValue(env.CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL)
      ? "reference_only"
      : "not_configured",
    operatorRunbookStatus: hasUsableValue(env.CAMPAIGN_OS_OPERATOR_RUNBOOK_URL)
      ? "reference_only"
      : "not_configured",
    requiredConfigKeys: getRequiredConfigKeys(),
  };
}

function resolveActivationStatus(
  profileId: BullmqConstructionProfileId,
  env: Record<string, unknown>,
): BullmqConstructionActivationStatus {
  if (profileId === "local-review") {
    return "disabled";
  }

  if (profileId === "staging-scaffold") {
    return "metadata_only";
  }

  return env.CAMPAIGN_OS_BULLMQ_CONSTRUCTION_ENABLEMENT === "explicitly-enabled"
    ? "explicitly_enabled"
    : "activation_required";
}

function createProductionDiagnostics(env: Record<string, unknown>): BullmqConstructionDiagnostic[] {
  return bullmqConstructionProductionPreconditions
    .filter((item) => item.requiredConfigKeys.some((key) => !hasUsableValue(env[key])))
    .map((item) => diagnostic(item.diagnosticCode, item.field, item.message));
}

function createUnsafeConfigDiagnostics(
  env: Record<string, unknown>,
  constructionId?: string,
): BullmqConstructionDiagnostic[] {
  const unsafeValues = [
    constructionId,
    env.CAMPAIGN_OS_BULLMQ_CONSTRUCTION_FACTORY,
    env.CAMPAIGN_OS_BULLMQ_CONSTRUCTION_ENABLEMENT,
  ];
  const hasUnsafeValue = unsafeValues.some((value) =>
    typeof value === "string" && isUnsafeBullmqConstructionString(value),
  );

  return hasUnsafeValue
    ? [
      diagnostic(
        "BULLMQ_CONSTRUCTION_UNSAFE_CONFIG",
        "bullmqConstructionConfig",
        "BullMQ construction configuration contains unsafe raw material and was redacted.",
      ),
    ]
    : [];
}

interface FactoryInvocationResult {
  allConstructed: boolean;
  attempted: boolean;
  diagnostics: BullmqConstructionDiagnostic[];
  factoryErrorRedacted?: unknown;
  factoryInvoked: boolean;
  queueClient: BullmqConstructedClientState;
  queueEvents: BullmqConstructedClientState;
  worker: BullmqConstructedClientState;
}

function invokeFactory(input: {
  activationStatus: BullmqConstructionActivationStatus;
  constructionFactory?: BullmqConstructionFactory;
  constructionId: string;
  mode: BullmqConstructionMode;
  profileId: BullmqConstructionProfileId;
  requiredConfigKeys: string[];
}): FactoryInvocationResult {
  if (!input.constructionFactory) {
    return {
      ...createSkippedFactoryResult(),
      diagnostics: [
        diagnostic(
          "BULLMQ_CONSTRUCTION_FACTORY_MISSING",
          "CAMPAIGN_OS_BULLMQ_CONSTRUCTION_FACTORY",
          "BullMQ construction factory is required before construction can advance.",
        ),
      ],
    };
  }

  try {
    const result = input.constructionFactory.construct({
      activationStatus: input.activationStatus,
      constructionId: input.constructionId,
      mode: input.mode,
      profileId: input.profileId,
      requiredConfigKeys: input.requiredConfigKeys,
    });
    const queueClient = createClientState("queue", true, result.queueClient);
    const worker = createClientState("worker", true, result.worker);
    const queueEvents = createClientState("queue_events", true, result.queueEvents);
    const diagnostics = [
      ...createClientDiagnostics(queueClient),
      ...createClientDiagnostics(worker),
      ...createClientDiagnostics(queueEvents),
    ];
    const allConstructed = queueClient.constructed && worker.constructed && queueEvents.constructed;

    return {
      allConstructed,
      attempted: true,
      diagnostics,
      factoryInvoked: true,
      queueClient,
      queueEvents,
      worker,
    };
  } catch (error) {
    return {
      allConstructed: false,
      attempted: true,
      diagnostics: [
        diagnostic(
          "BULLMQ_CONSTRUCTION_FACTORY_FAILED",
          "constructionFactory",
          "BullMQ construction factory failed with redacted error detail.",
        ),
      ],
      factoryErrorRedacted: redactBullmqConstructionValue(error),
      factoryInvoked: true,
      queueClient: createClientState("queue", true),
      queueEvents: createClientState("queue_events", true),
      worker: createClientState("worker", true),
    };
  }
}

function createSkippedFactoryResult(): FactoryInvocationResult {
  return {
    allConstructed: false,
    attempted: false,
    diagnostics: [],
    factoryInvoked: false,
    queueClient: createClientState("queue", false),
    queueEvents: createClientState("queue_events", false),
    worker: createClientState("worker", false),
  };
}

function createClientState(
  kind: BullmqConstructedClientKind,
  constructionAttempted: boolean,
  result?: BullmqConstructionFactoryClientResult,
): BullmqConstructedClientState {
  return {
    clientId: sanitizeOptionalConstructionString(result?.clientId),
    constructionAttempted,
    constructed: result?.constructed ?? false,
    diagnosticCodes: result?.diagnosticCode ? [result.diagnosticCode] : [],
    kind,
    liveOperationStarted: false,
    optionReferenceId: sanitizeOptionalConstructionString(result?.optionReferenceId),
  };
}

function createClientDiagnostics(client: BullmqConstructedClientState): BullmqConstructionDiagnostic[] {
  return client.diagnosticCodes.map((code) =>
    diagnostic(code, client.kind, `${client.kind} construction did not complete.`),
  );
}

function resolveStatus(
  profileId: BullmqConstructionProfileId,
  blockerCount: number,
  factoryResult: FactoryInvocationResult,
): BullmqConstructionStatus {
  if (profileId === "local-review") {
    return blockerCount === 0 ? "local_ready" : "blocked";
  }

  if (profileId === "staging-scaffold") {
    return blockerCount === 0 ? "scaffolded" : "blocked";
  }

  if (blockerCount > 0 && !factoryResult.factoryInvoked) {
    return "blocked";
  }

  if (factoryResult.factoryErrorRedacted) {
    return "failed";
  }

  if (factoryResult.allConstructed) {
    return "constructed";
  }

  if (factoryResult.factoryInvoked) {
    return "partial";
  }

  return "blocked";
}

function resolveProfile(profileId?: string): {
  diagnostics: BullmqConstructionDiagnostic[];
  profileId: BullmqConstructionProfileId;
  valid: boolean;
} {
  if (!profileId || SUPPORTED_BULLMQ_CONSTRUCTION_PROFILES.includes(profileId as BullmqConstructionProfileId)) {
    return {
      diagnostics: [],
      profileId: (profileId as BullmqConstructionProfileId | undefined) ?? "local-review",
      valid: true,
    };
  }

  return {
    diagnostics: [
      diagnostic(
        "UNKNOWN_BULLMQ_CONSTRUCTION_PROFILE",
        "profileId",
        "Unknown BullMQ construction profile.",
      ),
    ],
    profileId: "local-review",
    valid: false,
  };
}

function resolveMode(profileId: BullmqConstructionProfileId, mode?: string): {
  diagnostics: BullmqConstructionDiagnostic[];
  mode: BullmqConstructionMode;
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
        "UNKNOWN_BULLMQ_CONSTRUCTION_MODE",
        "mode",
        "Unknown BullMQ construction mode.",
      ),
    ],
    mode: defaultMode,
    valid: false,
  };
}

function resolveConstructionId(
  constructionId: string | undefined,
  env: Record<string, unknown>,
  profileId: BullmqConstructionProfileId,
): {
  constructionId: string;
  diagnostics: BullmqConstructionDiagnostic[];
  valid: boolean;
} {
  const rawConstructionId = constructionId
    ?? (typeof env.CAMPAIGN_OS_BULLMQ_CONSTRUCTION_ID === "string"
      ? env.CAMPAIGN_OS_BULLMQ_CONSTRUCTION_ID
      : undefined);
  const fallback = profileId === "local-review"
    ? LOCAL_CONSTRUCTION_ID
    : profileId === "staging-scaffold"
      ? STAGING_CONSTRUCTION_ID
      : PRODUCTION_CONSTRUCTION_ID;
  const resolved = sanitizeBullmqConstructionString(rawConstructionId ?? fallback);
  const unsafe = typeof rawConstructionId === "string" && isUnsafeBullmqConstructionString(rawConstructionId);

  return {
    constructionId: resolved,
    diagnostics: unsafe
      ? [
        diagnostic(
          "BULLMQ_CONSTRUCTION_UNSAFE_CONFIG",
          "constructionId",
          "BullMQ construction id contained unsafe raw material and was redacted.",
        ),
      ]
      : [],
    valid: !unsafe,
  };
}

function convertBrokerDiagnostic(input: {
  code: RedisBrokerConnectionDiagnosticCode;
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
}): BullmqConstructionDiagnostic {
  return {
    code: input.code,
    field: input.field,
    message: input.message,
    severity: input.severity,
  };
}

function diagnostic(
  code: BullmqConstructionDiagnosticCode,
  field: string,
  message: string,
  severity: BullmqConstructionDiagnosticSeverity = "error",
): BullmqConstructionDiagnostic {
  return {
    code,
    field,
    message: sanitizeBullmqConstructionString(message),
    severity,
  };
}

function getRequiredConfigKeys(): string[] {
  return Array.from(new Set([
    ...bullmqConstructionProductionPreconditions.flatMap((item) => item.requiredConfigKeys),
    ...redisBrokerConnectionProductionPreconditions.flatMap((item) => item.requiredConfigKeys),
  ]));
}

function hasUsableValue(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0 && !isUnsafeBullmqConstructionString(value);
}

function sanitizeOptionalConstructionString(value: string | undefined): string | undefined {
  return value === undefined ? undefined : sanitizeBullmqConstructionString(value);
}

function sanitizeBullmqConstructionString(value: string): string {
  if (isRawBullmqConstructionPayload(value)) {
    return RAW_CONSTRUCTION_PAYLOAD_VALUE;
  }

  if (isUnsafeBullmqConstructionString(value)) {
    return REDACTED_VALUE;
  }

  return value;
}

function isSensitiveBullmqConstructionKey(key: string): boolean {
  return /token|secret|password|credential|authorization|redisUrl|jobData|payload|stack/i.test(key);
}

function isRawBullmqConstructionPayload(value: string): boolean {
  return /payload|jobData|wallet|private|stack/i.test(value);
}

function isUnsafeBullmqConstructionString(value: string): boolean {
  return /redis:\/\/[^@\s]+:[^@\s]+@|token=|Bearer\s+|secret|password|X-Amz-Signature/i.test(value);
}
