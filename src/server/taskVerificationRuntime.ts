import { createHash, randomUUID } from "node:crypto";
import type { TaskVerificationAttemptFinalizeWrite } from "./taskVerificationAttemptStore";
import type {
  TaskVerificationAttemptOwner,
  TaskVerificationAttemptSafeRecord,
  TaskVerificationAttemptStore,
  TaskVerificationRetryPosture,
} from "./taskVerificationAttemptStore";
import {
  isServerIssuedTaskVerificationIdentity,
  issueTrustedTaskVerificationIdentityInput,
  transitionTaskVerificationAttempt,
  type CanonicalTaskVerificationRevision,
  type TaskVerificationIdentity,
  type TaskVerificationSafeEvidence,
  type TaskVerificationTransition,
} from "./taskVerification";
import type {
  TaskVerificationBinding,
  TaskVerificationConfig,
} from "./taskVerificationConfig";
import {
  executeProviderHttpRequest,
  type ProviderHttpRuntimeResult,
} from "./providerHttpClientRuntime";
import { disposeProviderHttpCanonicalRequestMaterial } from "./providerHttpExecutionMaterial";
import { bindProviderHttpCanonicalRequestMaterial } from "./providerHttpFetchTransport";
import {
  planProviderHttpRequest,
  type ProviderHttpRequestPlan,
} from "./providerHttpRequestPlanner";
import { createProviderHttpRuntimeSummary } from "./providerHttpRuntimeRegistry";
import type { ProviderHttpRuntimeSummary } from "./providerHttpRuntimeTypes";
import type { ProviderHttpTransport } from "./providerHttpTransport";
import {
  createTaskVerificationProviderStrategyRegistry,
  type TaskVerificationProviderRequestBuild,
  type TaskVerificationProviderStrategyRegistry,
} from "./taskVerificationProviderStrategies";

export type TaskVerificationRuntimeOutcome =
  | "blocked"
  | "completed"
  | "failed"
  | "manual_review"
  | "pending";

export type TaskVerificationRuntimeDiagnosticCode =
  | "TASK_VERIFICATION_ATTEMPT_BEGIN_FAILED"
  | "TASK_VERIFICATION_AUTHORITY_INVALID"
  | "TASK_VERIFICATION_CALLER_ABORTED"
  | "TASK_VERIFICATION_CONFIG_BLOCKED"
  | "TASK_VERIFICATION_FINALIZATION_WRITE_FAILED"
  | "TASK_VERIFICATION_FINALIZATION_WRITE_MISSING"
  | "TASK_VERIFICATION_FINALIZE_BLOCKED"
  | "TASK_VERIFICATION_FINALIZE_CONFLICT"
  | "TASK_VERIFICATION_FINALIZE_FAILED"
  | "TASK_VERIFICATION_FINALIZE_STALE"
  | "TASK_VERIFICATION_MARK_CONFLICT"
  | "TASK_VERIFICATION_MARK_FAILED"
  | "TASK_VERIFICATION_MARK_STALE"
  | "TASK_VERIFICATION_MARK_TERMINAL"
  | "TASK_VERIFICATION_PLANNING_BLOCKED"
  | "TASK_VERIFICATION_RUNTIME_STOPPED"
  | "TASK_VERIFICATION_STOPPED_BEFORE_DISPATCH"
  | "TASK_VERIFICATION_STRATEGY_BLOCKED"
  | "TASK_VERIFICATION_TRANSPORT_MISSING";

export interface TaskVerificationRuntimeEvidence {
  readonly diagnosticCodes: readonly string[];
  readonly evidenceHash: string;
  readonly evidenceRef: string;
  readonly evidenceSource: "AEFINDER" | "AELFSCAN" | "DAPP_API";
  readonly traceId: string;
}

export interface TaskVerificationRuntimeResult {
  readonly attemptId?: string;
  readonly authoritative: boolean;
  readonly diagnosticCodes: readonly string[];
  readonly evidence?: TaskVerificationRuntimeEvidence;
  readonly outcome: TaskVerificationRuntimeOutcome;
  readonly pointsAwarded: number;
  readonly positiveMatch: boolean;
  readonly responseDigest?: string;
  readonly taskId?: string;
  readonly traceId: string;
  readonly transportExecuted: boolean;
}

export interface ExecuteTaskVerificationRuntimeInput {
  readonly identity: TaskVerificationIdentity;
  readonly signal?: AbortSignal;
  readonly task: CanonicalTaskVerificationRevision;
  readonly traceId?: string;
}

export interface TaskVerificationFinalizationWriteFactoryInput {
  readonly attemptId: string;
  readonly completedAt: string;
  readonly evidence: TaskVerificationSafeEvidence;
  readonly identity: TaskVerificationIdentity;
  readonly pointsAwarded: number;
  readonly task: CanonicalTaskVerificationRevision;
  readonly traceId: string;
}

export type TaskVerificationFinalizationWriteFactory = (
  input: TaskVerificationFinalizationWriteFactoryInput,
) => Promise<TaskVerificationAttemptFinalizeWrite> | TaskVerificationAttemptFinalizeWrite;

export interface CreateTaskVerificationRuntimeOptions {
  readonly attemptStore: TaskVerificationAttemptStore;
  readonly config: TaskVerificationConfig;
  readonly createTraceId?: () => string;
  readonly drainTimeoutMs?: number;
  readonly finalizationWriteFactory?: TaskVerificationFinalizationWriteFactory;
  readonly leaseDurationMs?: number;
  readonly now?: () => string;
  readonly providerHttpRuntime?: ProviderHttpRuntimeSummary;
  readonly strategyRegistry?: TaskVerificationProviderStrategyRegistry;
  readonly transport?: ProviderHttpTransport;
}

export interface TaskVerificationRuntimeCloseResult {
  readonly activeCallCount: number;
  readonly status: "drained" | "timed_out";
}

export interface TaskVerificationRuntimeState {
  readonly accepting: boolean;
  readonly activeCallCount: number;
  readonly controllerCount: number;
}

interface RuntimePreflight {
  binding: TaskVerificationBinding;
  traceId: string;
}

interface ActiveRuntimeCall {
  identityKey: string;
  promise: Promise<TaskVerificationRuntimeResult>;
}

interface SubordinateTransportCloseResult {
  readonly activeCallCount: number;
  readonly status: "drained" | "timed_out";
}

const SAFE_TRACE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export class TaskVerificationRuntime {
  private readonly abortControllers = new Set<AbortController>();
  private readonly activeCalls = new Set<ActiveRuntimeCall>();
  private readonly attemptStore: TaskVerificationAttemptStore;
  private readonly config: TaskVerificationConfig;
  private readonly createTraceId: () => string;
  private readonly drainTimeoutMs: number;
  private readonly finalizationWriteFactory?: TaskVerificationFinalizationWriteFactory;
  private readonly inFlightByIdentity = new Map<string, Promise<TaskVerificationRuntimeResult>>();
  private readonly leaseDurationMs: number;
  private readonly now: () => string;
  private readonly providerHttpRuntime: ProviderHttpRuntimeSummary;
  private readonly strategyRegistry: TaskVerificationProviderStrategyRegistry;
  private readonly transport?: ProviderHttpTransport;
  private accepting = true;
  private closePromise?: Promise<TaskVerificationRuntimeCloseResult>;

  constructor(options: CreateTaskVerificationRuntimeOptions) {
    this.attemptStore = options.attemptStore;
    this.config = options.config;
    this.createTraceId = options.createTraceId ?? (() => `trace-runtime-${randomUUID()}`);
    this.drainTimeoutMs = normalizeBound(options.drainTimeoutMs, 1, 10_000, 1_000);
    this.finalizationWriteFactory = options.finalizationWriteFactory;
    this.leaseDurationMs = normalizeBound(options.leaseDurationMs, 100, 300_000, 15_000);
    this.now = options.now ?? (() => new Date().toISOString());
    this.providerHttpRuntime = options.providerHttpRuntime
      ?? createProviderHttpRuntimeSummary({ profileId: "local-review" });
    this.strategyRegistry = options.strategyRegistry
      ?? createTaskVerificationProviderStrategyRegistry({ environment: options.config.environment });
    this.transport = options.transport;
  }

  execute(input: ExecuteTaskVerificationRuntimeInput): Promise<TaskVerificationRuntimeResult> {
    const traceId = resolveTraceId(input?.traceId, this.createTraceId);
    if (!this.accepting) {
      return Promise.resolve(failureResult(
        "TASK_VERIFICATION_RUNTIME_STOPPED",
        traceId,
      ));
    }

    const preflight = this.preflight(input, traceId);
    if (!preflight.ok) {
      return Promise.resolve(preflight.result);
    }

    if (input.signal?.aborted) {
      return Promise.resolve(failureResult(
        "TASK_VERIFICATION_CALLER_ABORTED",
        traceId,
        "pending",
      ));
    }

    const existing = this.inFlightByIdentity.get(input.identity.idempotencyKey);
    if (existing) {
      return existing;
    }

    const controller = new AbortController();
    this.abortControllers.add(controller);
    const promise = this.executeOwnerCall(input, preflight.value, controller).catch(() =>
      failureResult("TASK_VERIFICATION_FINALIZE_FAILED", traceId, "manual_review"));
    const activeCall: ActiveRuntimeCall = {
      identityKey: input.identity.idempotencyKey,
      promise,
    };
    this.activeCalls.add(activeCall);
    this.inFlightByIdentity.set(input.identity.idempotencyKey, promise);
    const cleanup = () => {
      this.abortControllers.delete(controller);
      this.activeCalls.delete(activeCall);
      if (this.inFlightByIdentity.get(activeCall.identityKey) === promise) {
        this.inFlightByIdentity.delete(activeCall.identityKey);
      }
    };
    void promise.then(cleanup, cleanup);
    return promise;
  }

  close(): Promise<TaskVerificationRuntimeCloseResult> {
    if (this.closePromise) {
      return this.closePromise;
    }

    this.accepting = false;
    for (const controller of this.abortControllers) {
      controller.abort();
    }
    this.abortControllers.clear();
    const closePromise = this.drain();
    this.closePromise = closePromise;
    void closePromise.then((result) => {
      if (result.status === "timed_out" && this.closePromise === closePromise) {
        this.closePromise = undefined;
      }
    });
    return closePromise;
  }

  stop(): Promise<TaskVerificationRuntimeCloseResult> {
    return this.close();
  }

  state(): TaskVerificationRuntimeState {
    return Object.freeze({
      accepting: this.accepting,
      activeCallCount: this.activeCalls.size + activeTransportCallCount(this.transport),
      controllerCount: this.abortControllers.size,
    });
  }

  private preflight(
    input: ExecuteTaskVerificationRuntimeInput,
    traceId: string,
  ):
    | { ok: false; result: TaskVerificationRuntimeResult }
    | { ok: true; value: RuntimePreflight } {
    if (!hasMatchingAuthority(input)) {
      return {
        ok: false,
        result: failureResult("TASK_VERIFICATION_AUTHORITY_INVALID", traceId),
      };
    }

    if (this.config.status !== "ready" || !this.config.enabled) {
      return {
        ok: false,
        result: failureResult("TASK_VERIFICATION_CONFIG_BLOCKED", traceId),
      };
    }

    if (!this.transport) {
      return {
        ok: false,
        result: failureResult("TASK_VERIFICATION_TRANSPORT_MISSING", traceId),
      };
    }

    if (!this.finalizationWriteFactory) {
      return {
        ok: false,
        result: failureResult("TASK_VERIFICATION_FINALIZATION_WRITE_MISSING", traceId),
      };
    }

    const resolution = this.config.resolveBinding(
      input.identity.binding.bindingId,
      input.task.verificationType as "ON_CHAIN" | "DAPP_API",
    );
    if (
      resolution.status !== "resolved"
      || resolution.binding.revision !== input.identity.binding.bindingRevision
    ) {
      return {
        ok: false,
        result: failureResult("TASK_VERIFICATION_CONFIG_BLOCKED", traceId),
      };
    }

    const dryBuild = this.strategyRegistry.buildRequest({
      attempt: { count: 1, maxAttempts: resolution.binding.maxAttempts },
      binding: resolution.binding,
      identity: input.identity,
      task: input.task,
      traceId,
    });
    if (!dryBuild.ok) {
      return {
        ok: false,
        result: failureResult("TASK_VERIFICATION_STRATEGY_BLOCKED", traceId),
      };
    }

    let dryPlan: ReturnType<typeof planProviderHttpRequest>;
    try {
      dryPlan = planProviderHttpRequest(dryBuild.plannerInput, this.providerHttpRuntime);
    } finally {
      disposeProviderHttpCanonicalRequestMaterial(dryBuild.requestMaterial);
    }
    if (!dryPlan.ok) {
      return {
        ok: false,
        result: failureResult("TASK_VERIFICATION_PLANNING_BLOCKED", traceId),
      };
    }

    return { ok: true, value: { binding: resolution.binding, traceId } };
  }

  private async executeOwnerCall(
    input: ExecuteTaskVerificationRuntimeInput,
    preflight: RuntimePreflight,
    controller: AbortController,
  ): Promise<TaskVerificationRuntimeResult> {
    const { binding, traceId } = preflight;
    let beginResult;
    try {
      beginResult = await this.attemptStore.begin({
        identity: input.identity,
        leaseDurationMs: this.leaseDurationMs,
        maxAttempts: binding.maxAttempts,
        providerRef: binding.id,
        traceId,
        verificationType: binding.verificationType,
      });
    } catch {
      return failureResult("TASK_VERIFICATION_ATTEMPT_BEGIN_FAILED", traceId);
    }

    if (beginResult.kind !== "acquired") {
      return projectBeginResult(beginResult.kind, beginResult.attempt, input.task, traceId);
    }

    if (controller.signal.aborted) {
      return failureResult(
        "TASK_VERIFICATION_STOPPED_BEFORE_DISPATCH",
        traceId,
        "pending",
        beginResult.attempt.id,
      );
    }

    const built = this.strategyRegistry.buildRequest({
      attempt: {
        count: beginResult.attempt.attemptCount,
        maxAttempts: beginResult.attempt.maxAttempts,
      },
      binding,
      identity: input.identity,
      task: input.task,
      traceId,
    });
    if (!built.ok) {
      return failureResult(
        "TASK_VERIFICATION_STRATEGY_BLOCKED",
        traceId,
        "manual_review",
        beginResult.attempt.id,
      );
    }

    let planned: ProviderHttpRequestPlan;
    let providerResult: ProviderHttpRuntimeResult;
    try {
      const planningResult = planProviderHttpRequest(built.plannerInput, this.providerHttpRuntime);
      if (!planningResult.ok) {
        return failureResult(
          "TASK_VERIFICATION_PLANNING_BLOCKED",
          traceId,
          "manual_review",
          beginResult.attempt.id,
        );
      }
      planned = planningResult.plan;

      if (controller.signal.aborted) {
        return failureResult(
          "TASK_VERIFICATION_STOPPED_BEFORE_DISPATCH",
          traceId,
          "pending",
          beginResult.attempt.id,
        );
      }

      const marked = await this.markDispatch(beginResult.owner, planned, traceId);
      if (!marked.ok) {
        return {
          ...marked.result,
          attemptId: beginResult.attempt.id,
        };
      }

      providerResult = await executeProviderHttpRequest(built.plannerInput, {
        matcher: built.matcher,
        normalizationPolicy: { degradationOutcome: binding.degradationPolicy },
        runtime: this.providerHttpRuntime,
        transport: bindProviderHttpCanonicalRequestMaterial(
          this.transport!,
          built.requestMaterial,
        ),
        transportContext: {
          attemptStartedAtMs: timestampMs(beginResult.attempt.createdAt),
          runtimeSignal: controller.signal,
          ...(input.signal ? { signal: input.signal } : {}),
        },
      });
    } finally {
      disposeProviderHttpCanonicalRequestMaterial(built.requestMaterial);
    }
    return this.finalizeProviderResult({
      attemptId: beginResult.attempt.id,
      binding,
      built,
      identity: input.identity,
      owner: beginResult.owner,
      planned,
      providerResult,
      task: input.task,
      traceId,
    });
  }

  private async markDispatch(
    owner: TaskVerificationAttemptOwner,
    plan: ProviderHttpRequestPlan,
    traceId: string,
  ):
    Promise<
      | { ok: true }
      | { ok: false; result: TaskVerificationRuntimeResult }
    > {
    try {
      const result = await this.attemptStore.markTransportStarted({
        owner,
        requestDigest: plan.requestDigest,
        traceId,
      });

      if (result.kind === "marked") {
        return { ok: true };
      }

      const code = result.kind === "stale_owner"
        ? "TASK_VERIFICATION_MARK_STALE"
        : result.kind === "conflict" || result.kind === "already_marked_same_owner"
          ? "TASK_VERIFICATION_MARK_CONFLICT"
          : "TASK_VERIFICATION_MARK_TERMINAL";
      return { ok: false, result: failureResult(code, traceId, "manual_review") };
    } catch {
      return {
        ok: false,
        result: failureResult("TASK_VERIFICATION_MARK_FAILED", traceId, "manual_review"),
      };
    }
  }

  private async finalizeProviderResult(input: {
    attemptId: string;
    binding: TaskVerificationBinding;
    built: TaskVerificationProviderRequestBuild;
    identity: TaskVerificationIdentity;
    owner: TaskVerificationAttemptOwner;
    planned: ProviderHttpRequestPlan;
    providerResult: ProviderHttpRuntimeResult;
    task: CanonicalTaskVerificationRevision;
    traceId: string;
  }): Promise<TaskVerificationRuntimeResult> {
    const requestDigest = "requestPlanRedacted" in input.providerResult
      ? input.providerResult.requestPlanRedacted.requestDigest
      : input.planned.requestDigest;
    if (requestDigest !== input.planned.requestDigest) {
      return failureResult(
        "TASK_VERIFICATION_PLANNING_BLOCKED",
        input.traceId,
        "manual_review",
        input.attemptId,
        input.providerResult.transportExecuted,
      );
    }

    let outcome = normalizeOutcome(input.providerResult.outcome);
    let diagnosticCodes = safeDiagnosticCodes(input.providerResult.diagnosticCodes, outcome);
    let evidence = outcome === "completed"
      ? safeEvidenceFromProviderResult(input.providerResult, input.binding, input.traceId, diagnosticCodes)
      : undefined;
    if (outcome === "completed" && !evidence) {
      outcome = "manual_review";
      diagnosticCodes = ["TASK_VERIFICATION_FINALIZATION_WRITE_FAILED"];
    }

    const completedAt = safeTimestamp(this.now());
    let write: TaskVerificationAttemptFinalizeWrite | undefined;
    if (outcome === "completed" && evidence) {
      try {
        write = await this.finalizationWriteFactory!({
          attemptId: input.attemptId,
          completedAt,
          evidence,
          identity: input.identity,
          pointsAwarded: input.task.points,
          task: input.task,
          traceId: input.traceId,
        });
      } catch {
        outcome = "manual_review";
        evidence = undefined;
        diagnosticCodes = ["TASK_VERIFICATION_FINALIZATION_WRITE_FAILED"];
      }
    }

    const transition = createRuntimeTransition({
      bindingEnabled: input.binding.enabled,
      diagnosticCodes,
      evidence,
      outcome,
      positiveMatch: outcome === "completed" && input.providerResult.positiveMatch,
      traceId: input.traceId,
      transportExecuted: input.providerResult.transportExecuted,
    });
    const responseDigest = "resultDigest" in input.providerResult
      ? input.providerResult.resultDigest
      : safeResultDigest({
        diagnosticCodes,
        outcome,
        requestDigest: input.planned.requestDigest,
        traceId: input.traceId,
        transportExecuted: input.providerResult.transportExecuted,
      });

    try {
      const finalized = await this.attemptStore.finalize({
        completedAt,
        owner: input.owner,
        providerCode: providerCode(diagnosticCodes, outcome),
        responseDigest,
        retryPosture: retryPosture(outcome),
        traceId: input.traceId,
        transition,
        ...(outcome === "completed" && write ? { write } : {}),
      });

      if (finalized.kind === "committed" || finalized.kind === "terminal_replay") {
        return projectAttempt(finalized.attempt, input.task, input.traceId, true);
      }

      const code = finalized.kind === "stale_owner"
        ? "TASK_VERIFICATION_FINALIZE_STALE"
        : finalized.kind === "conflict"
          ? "TASK_VERIFICATION_FINALIZE_CONFLICT"
          : "TASK_VERIFICATION_FINALIZE_BLOCKED";
      return failureResult(
        code,
        input.traceId,
        "manual_review",
        input.attemptId,
        input.providerResult.transportExecuted,
      );
    } catch {
      return failureResult(
        "TASK_VERIFICATION_FINALIZE_FAILED",
        input.traceId,
        "manual_review",
        input.attemptId,
        input.providerResult.transportExecuted,
      );
    }
  }

  private async drain(): Promise<TaskVerificationRuntimeCloseResult> {
    const calls = [...this.activeCalls].map(({ promise }) => promise);
    let transportCloseResult: SubordinateTransportCloseResult | undefined;
    const transportClose = closeTransport(this.transport).then((result) => {
      transportCloseResult = result;
      return result;
    });
    const drain = Promise.all([
      Promise.allSettled(calls),
      transportClose,
    ]).then(([, result]) => result.status);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<"timed_out">((resolve) => {
      timer = setTimeout(() => resolve("timed_out"), this.drainTimeoutMs);
    });
    const drainStatus = await Promise.race([drain, timeout]);
    if (timer !== undefined) {
      clearTimeout(timer);
    }

    const observedTransportCount = activeTransportCallCount(this.transport);
    const subordinateActiveCallCount = transportCloseResult?.status === "timed_out"
      ? transportCloseResult.activeCallCount
      : transportCloseResult?.status === "drained"
        ? observedTransportCount
        : Math.max(observedTransportCount, hasTransportClose(this.transport) ? 1 : 0);
    const activeCallCount = this.activeCalls.size + subordinateActiveCallCount;
    const status = drainStatus === "drained" && activeCallCount === 0
      ? "drained"
      : "timed_out";

    return Object.freeze({
      activeCallCount,
      status,
    });
  }
}

export const createTaskVerificationRuntime = (
  options: CreateTaskVerificationRuntimeOptions,
): TaskVerificationRuntime => new TaskVerificationRuntime(options);

function hasMatchingAuthority(input: ExecuteTaskVerificationRuntimeInput): boolean {
  if (
    !input
    || !isServerIssuedTaskVerificationIdentity(input.identity)
    || !input.task
  ) {
    return false;
  }

  try {
    issueTrustedTaskVerificationIdentityInput({
      binding: input.identity.binding,
      issuedSubject: input.identity.issuedSubject,
      task: input.task,
      traceId: "trace-runtime-authority",
    });
  } catch {
    return false;
  }

  return input.identity.campaignId === input.task.campaignId
    && input.identity.taskId === input.task.taskId
    && input.identity.taskRevision === input.task.revision
    && input.identity.taskRevisionDigest === input.task.taskRevisionDigest
    && input.identity.evidenceRuleDigest === input.task.evidenceRuleDigest
    && (input.task.verificationType === "ON_CHAIN" || input.task.verificationType === "DAPP_API");
}

function projectBeginResult(
  kind: "blocked" | "existing_terminal" | "in_progress" | "recovery_required",
  attempt: TaskVerificationAttemptSafeRecord,
  task: CanonicalTaskVerificationRevision,
  traceId: string,
): TaskVerificationRuntimeResult {
  if (kind === "existing_terminal") {
    return projectAttempt(attempt, task, traceId, true);
  }

  const outcome = kind === "in_progress" ? "pending" : "manual_review";
  const fallbackCode = kind === "in_progress"
    ? "TASK_VERIFICATION_ATTEMPT_IN_PROGRESS"
    : kind === "recovery_required"
      ? "TASK_VERIFICATION_OUTCOME_UNKNOWN"
      : "TASK_VERIFICATION_ATTEMPT_BLOCKED";
  return Object.freeze({
    attemptId: attempt.id,
    authoritative: false,
    diagnosticCodes: Object.freeze(
      attempt.diagnosticCodes.length > 0 ? [...attempt.diagnosticCodes] : [fallbackCode],
    ),
    outcome,
    pointsAwarded: 0,
    positiveMatch: false,
    taskId: task.taskId,
    traceId,
    transportExecuted: false,
  });
}

function projectAttempt(
  attempt: TaskVerificationAttemptSafeRecord,
  task: CanonicalTaskVerificationRevision,
  traceId: string,
  authoritative: boolean,
): TaskVerificationRuntimeResult {
  const outcome = attempt.status === "requested" || attempt.status === "running"
    ? "pending"
    : attempt.status;
  const completed = outcome === "completed"
    && isSafeEvidenceHash(attempt.evidenceHash)
    && isSafeEvidenceRef(attempt.evidenceRef)
    && attempt.evidenceSource !== undefined;
  const diagnosticCodes = Object.freeze([...attempt.diagnosticCodes]);
  const evidence: TaskVerificationRuntimeEvidence | undefined = completed
    ? Object.freeze({
      diagnosticCodes,
      evidenceHash: attempt.evidenceHash!,
      evidenceRef: attempt.evidenceRef!,
      evidenceSource: attempt.evidenceSource!,
      traceId,
    })
    : undefined;

  return Object.freeze({
    attemptId: attempt.id,
    authoritative,
    diagnosticCodes,
    ...(evidence ? { evidence } : {}),
    outcome: completed ? "completed" : outcome === "completed" ? "manual_review" : outcome,
    pointsAwarded: completed ? task.points : 0,
    positiveMatch: completed,
    ...(attempt.responseDigest ? { responseDigest: attempt.responseDigest } : {}),
    taskId: task.taskId,
    traceId,
    transportExecuted: attempt.dispatchState !== "not_started",
  });
}

function safeEvidenceFromProviderResult(
  result: ProviderHttpRuntimeResult,
  binding: TaskVerificationBinding,
  traceId: string,
  diagnosticCodes: readonly string[],
): TaskVerificationSafeEvidence | undefined {
  if (
    !result.transportExecuted
    || !result.positiveMatch
    || !isSafeEvidenceHash(result.evidenceHash)
    || !isSafeEvidenceRef(result.evidenceRef)
  ) {
    return undefined;
  }

  return Object.freeze({
    diagnosticCodes: Object.freeze([...diagnosticCodes]),
    evidenceHash: result.evidenceHash,
    evidenceRef: result.evidenceRef,
    evidenceSource: binding.evidenceSource,
    traceId,
  });
}

function createRuntimeTransition(input: {
  bindingEnabled: boolean;
  diagnosticCodes: readonly string[];
  evidence?: TaskVerificationSafeEvidence;
  outcome: Exclude<TaskVerificationRuntimeOutcome, "blocked">;
  positiveMatch: boolean;
  traceId: string;
  transportExecuted: boolean;
}): TaskVerificationTransition {
  return transitionTaskVerificationAttempt({
    bindingEnabled: input.bindingEnabled,
    currentStatus: "running",
    diagnosticCodes: input.diagnosticCodes,
    ...(input.evidence ? { evidence: input.evidence } : {}),
    positiveMatch: input.positiveMatch,
    targetStatus: input.outcome,
    traceId: input.traceId,
    transportExecuted: input.transportExecuted,
  });
}

function normalizeOutcome(outcome: ProviderHttpRuntimeResult["outcome"]): Exclude<
  TaskVerificationRuntimeOutcome,
  "blocked"
> {
  if (outcome === "completed" || outcome === "failed" || outcome === "pending") {
    return outcome;
  }
  return "manual_review";
}

function safeDiagnosticCodes(
  codes: readonly string[],
  outcome: Exclude<TaskVerificationRuntimeOutcome, "blocked">,
): string[] {
  const normalized = [...new Set(codes.map(toSafeDiagnosticCode).filter(Boolean))].slice(0, 16);
  if (normalized.length > 0) {
    return normalized;
  }
  return [outcome === "completed" ? "PROVIDER_MATCH_POSITIVE" : `PROVIDER_${outcome.toUpperCase()}`];
}

function toSafeDiagnosticCode(value: string): string {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const prefixed = normalized.startsWith("PROVIDER_") || normalized.startsWith("TASK_VERIFICATION_")
    ? normalized
    : `PROVIDER_${normalized}`;
  return /^[A-Z][A-Z0-9_]*$/.test(prefixed) ? prefixed.slice(0, 64) : "PROVIDER_FAILURE";
}

function retryPosture(
  outcome: Exclude<TaskVerificationRuntimeOutcome, "blocked">,
): TaskVerificationRetryPosture {
  if (outcome === "completed" || outcome === "failed") {
    return "none";
  }
  return outcome === "pending" ? "manual_review" : "manual_review";
}

function providerCode(
  diagnosticCodes: readonly string[],
  outcome: Exclude<TaskVerificationRuntimeOutcome, "blocked">,
): string {
  return (diagnosticCodes[0] ?? `PROVIDER_${outcome.toUpperCase()}`).slice(0, 64);
}

function failureResult(
  code: TaskVerificationRuntimeDiagnosticCode,
  traceId: string,
  outcome: TaskVerificationRuntimeOutcome = "blocked",
  attemptId?: string,
  transportExecuted = false,
): TaskVerificationRuntimeResult {
  return Object.freeze({
    ...(attemptId ? { attemptId } : {}),
    authoritative: false,
    diagnosticCodes: Object.freeze([code]),
    outcome,
    pointsAwarded: 0,
    positiveMatch: false,
    traceId: safeTraceId(traceId),
    transportExecuted,
  });
}

function safeResultDigest(input: Readonly<Record<string, unknown>>): string {
  const canonical = canonicalJson(input);
  return createHash("sha256")
    .update(
      `campaign-os/task-verification-runtime-result/v1\n${Buffer.byteLength(canonical, "utf8")}\n`,
      "utf8",
    )
    .update(canonical, "utf8")
    .digest("hex");
}

function canonicalJson(value: unknown): string {
  if (value === undefined) {
    return "null";
  }
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const record = value as Readonly<Record<string, unknown>>;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

function isSafeEvidenceHash(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function isSafeEvidenceRef(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 256
    && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
    && !/(authorization|credential|header|password|payload|secret|token|uri|url)/i.test(value);
}

function resolveTraceId(value: unknown, createTraceId: () => string): string {
  if (typeof value === "string" && SAFE_TRACE_PATTERN.test(value)) {
    return value;
  }
  return safeTraceId(createTraceId());
}

function safeTraceId(value: unknown): string {
  return typeof value === "string" && SAFE_TRACE_PATTERN.test(value)
    ? value
    : "trace-unavailable";
}

function safeTimestamp(value: unknown): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    return "1970-01-01T00:00:00.000Z";
  }
  try {
    return new Date(value).toISOString() === value
      ? value
      : "1970-01-01T00:00:00.000Z";
  } catch {
    return "1970-01-01T00:00:00.000Z";
  }
}

function timestampMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function normalizeBound(
  value: unknown,
  minimum: number,
  maximum: number,
  fallback: number,
): number {
  return typeof value === "number" && Number.isSafeInteger(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback;
}

async function closeTransport(
  transport: ProviderHttpTransport | undefined,
): Promise<SubordinateTransportCloseResult> {
  if (!hasTransportClose(transport)) {
    return Object.freeze({ activeCallCount: 0, status: "drained" as const });
  }
  try {
    const result = await transport.close();
    return normalizeTransportCloseResult(result, activeTransportCallCount(transport));
  } catch {
    return Object.freeze({
      activeCallCount: Math.max(1, activeTransportCallCount(transport)),
      status: "timed_out" as const,
    });
  }
}

function hasTransportClose(
  transport: ProviderHttpTransport | undefined,
): transport is ProviderHttpTransport & { close: () => Promise<unknown> } {
  return Boolean(transport && typeof (transport as { close?: unknown }).close === "function");
}

function activeTransportCallCount(transport: ProviderHttpTransport | undefined): number {
  if (!transport || typeof (transport as { state?: unknown }).state !== "function") {
    return 0;
  }
  try {
    const state = (transport as ProviderHttpTransport & { state: () => unknown }).state();
    if (typeof state !== "object" || state === null) {
      return 0;
    }
    const activeCallCount = (state as { activeCallCount?: unknown }).activeCallCount;
    return typeof activeCallCount === "number"
      && Number.isSafeInteger(activeCallCount)
      && activeCallCount >= 0
      ? activeCallCount
      : 0;
  } catch {
    return 0;
  }
}

function normalizeTransportCloseResult(
  value: unknown,
  observedActiveCallCount: number,
): SubordinateTransportCloseResult {
  if (typeof value === "object" && value !== null) {
    const result = value as { activeCallCount?: unknown; status?: unknown };
    if (result.status === "drained" || result.status === "timed_out") {
      const reportedActiveCallCount = typeof result.activeCallCount === "number"
        && Number.isSafeInteger(result.activeCallCount)
        && result.activeCallCount >= 0
        ? result.activeCallCount
        : 0;
      const activeCallCount = Math.max(reportedActiveCallCount, observedActiveCallCount);
      if (result.status === "drained" && activeCallCount === 0) {
        return Object.freeze({ activeCallCount: 0, status: "drained" as const });
      }
      return Object.freeze({
        activeCallCount: Math.max(1, activeCallCount),
        status: "timed_out" as const,
      });
    }
  }

  return observedActiveCallCount === 0
    ? Object.freeze({ activeCallCount: 0, status: "drained" as const })
    : Object.freeze({
      activeCallCount: observedActiveCallCount,
      status: "timed_out" as const,
    });
}
