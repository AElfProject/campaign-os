import { createHash, randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import {
  createCampaignOsLocalService,
  type AddTaskRequest,
  type CampaignOsLocalService,
} from "../domain/campaignService";
import {
  CampaignOsCampaignDbConfigError,
  CampaignOsAdminReviewConfigError,
  CampaignOsParticipantPreviewConfigError,
  resolveCampaignOsAdminReviewConfig,
  resolveCampaignOsCampaignDbConfig,
  resolveCampaignOsParticipantPreviewConfig,
  resolveCampaignOsRuntimeConfig,
  type CampaignOsCampaignDbConfig,
  type CampaignOsCampaignDbPoolConfig,
  type CampaignOsAdminReviewConfig,
  type CampaignOsAdminReviewConfigOptions,
  type CampaignOsParticipantPreviewConfig,
  type CampaignOsParticipantPreviewConfigOptions,
  type CampaignOsRuntimeConfig,
  type CampaignOsRuntimeConfigOptions,
} from "./config";
import {
  createFailureEnvelope,
  createSuccessEnvelope,
  type ApiRuntimeEnvelope,
} from "./envelope";
import {
  ApiRuntimeError,
  authForbidden,
  authSessionInvalid,
  authSessionRequired,
  authSubjectMismatch,
  invalidRequest,
  malformedJson,
  methodNotAllowed,
  persistenceUnavailable,
  routeNotFound,
  toApiRuntimeErrorBody,
} from "./errors";
import type { ApiRuntimeRouteContract } from "./contracts";
import {
  apiRuntimeRouteCatalog as apiRuntimeContractRoutes,
  resolveAdminApiRoute,
} from "./routes";
import { createApiRuntimeHandlers } from "./handlers";
import {
  createBackendDatabaseAdapterRuntimeSummary,
  createBackendPersistenceRuntimeSummary,
  createBackendServiceReadinessReport,
  type BackendServiceReadinessReport,
} from "./backendService";
import type { BackendRuntimeActivationContract } from "./backendRuntimeActivation";
import {
  CampaignDbRepositoryError,
  createCampaignDbRepository,
  type CampaignDbRepository,
  type CampaignDbRepositoryHealth,
  type CreateCampaignDbRepositoryOptions,
} from "./campaignDbRepository";
import {
  createPostgresCampaignDurableStore,
  PostgresCampaignStoreError,
  type PostgresCampaignStorePool,
} from "./postgresCampaignDurableStore";
import {
  WalletSessionRepositoryError,
  createWalletSessionRepository,
  type CreateWalletSessionRepositoryOptions,
  type WalletSessionRepository,
} from "./walletSessionRepository";
import {
  createCampaignOsRepository,
  type CampaignOsRepository,
} from "./persistence";
import {
  evaluateAdminOperatorEnforcement,
  evaluateIssuedAuthEnforcement,
  evaluateTrustedLiveAuthorization,
  getAdminOperatorRoutePolicy,
  type AuthorizedAdminOperatorContext,
  type AuthEnforcementDecision,
  type ParticipantCompatibilitySubject,
  type TrustedLiveAuthorizationDecision,
} from "./authEnforcement";
import {
  getProtectedRouteAuth,
  resolveTrustedLiveAuthorizationContext,
  unwrapLiveAuthorizationFence,
  type LiveAuthorizationFence,
  type TrustedLiveAuthorizationContext,
} from "./authSession";
import {
  createAdminOperatorMembershipRegistry,
  type AdminOperatorMembershipRegistry,
} from "./adminOperatorMembership";
import {
  ADMIN_REVIEW_MAX_LIST_LIMIT,
  ADMIN_REVIEW_MIGRATION_ID,
  type AdminReviewStore,
} from "./adminReviewStore";
import {
  createAdminFailureEnvelope,
  isAdminRequestTarget,
  parseJsonWithUniqueObjectKeys,
  type AdminApiFailureEnvelope,
} from "./serverRequestGuard";
import type {
  WalletAuthenticationHttpController,
} from "./walletAuthenticationHttp";
import {
  createPostgresAdminReviewStore,
  type PostgresAdminReviewStorePool,
} from "./postgresAdminReviewStore";
import {
  createExportArtifactRegistry,
  type ExportArtifactRegistry,
} from "./exportArtifactRegistry";
import {
  deriveTaskVerificationIdentity,
  issueTrustedTaskVerificationIdentityInput,
  type CanonicalTaskVerificationRevision,
  type IssuedTaskVerificationSubjectInput,
} from "./taskVerification";
import {
  resolveTaskVerificationConfig,
  type TaskVerificationConfig,
  type TaskVerificationConfigInput,
} from "./taskVerificationConfig";
import type {
  ExecuteTaskVerificationRuntimeInput,
  TaskVerificationRuntimeCloseResult,
  TaskVerificationFinalizationWriteFactory,
  TaskVerificationRuntimeResult,
  TaskVerificationRuntimeState,
} from "./taskVerificationRuntime";
import {
  createTaskVerificationRuntime,
  type TaskVerificationRuntime,
} from "./taskVerificationRuntime";
import type { ProviderHttpRuntimeSummary } from "./providerHttpRuntimeTypes";
import type { ProviderHttpTransport } from "./providerHttpTransport";
import type {
  FinalizeTaskVerificationAttemptResult,
  TaskVerificationAttemptStore,
} from "./taskVerificationAttemptStore";
import type {
  RevalidateWalletAuthenticationFenceResult,
  ResolveWalletAuthenticationAuthorizationResult,
  WalletAuthenticationRuntime,
} from "./walletAuthenticationRuntime";

export type ApiRuntimeHeaders = Record<string, string | readonly string[] | undefined>;

export interface ApiRuntimeRequest {
  body?: string | unknown;
  headers?: ApiRuntimeHeaders;
  method: string;
  path: string;
}

export interface AdminApiSuccessEnvelope<TPayload> {
  data: TPayload;
  ok: true;
  runtime?: never;
  safety?: never;
  timestamp?: never;
  traceId: string;
}

export type { AdminApiFailureEnvelope } from "./serverRequestGuard";

export type ApiRuntimeResponseBody<TPayload = unknown> =
  | ApiRuntimeEnvelope<TPayload>
  | AdminApiSuccessEnvelope<TPayload>
  | AdminApiFailureEnvelope;

export interface ApiRuntimeResponse<TPayload = unknown> {
  body: ApiRuntimeResponseBody<TPayload>;
  headers: Record<string, string>;
  rawBody?: string;
  status: number;
}

export interface ApiRuntimeHandlerTransportResult {
  data: unknown;
  headers?: Record<string, string>;
  kind: "api_runtime_transport_result";
  rawBody?: string;
  status: number;
}

export interface ApiRuntimeHandlerContext {
  backendServiceReadiness: BackendServiceReadinessFactory;
  body: unknown;
  campaignDbRepository: CampaignDbRepository;
  exportArtifactRegistry: ExportArtifactRegistry;
  headers: ApiRuntimeHeaders;
  params: Record<string, string>;
  participantPreviewConfig: ParticipantPreviewConfigFactory;
  repository: CampaignOsRepository;
  query: Record<string, string>;
  route: ApiRuntimeRouteContract;
  service: CampaignOsLocalService;
  taskVerificationRuntime: ProtectedTaskVerificationRuntimePort;
  taskVerificationRuleResolver?: TaskVerificationRuleResolver;
  traceId: string;
  version: string;
  walletSessionRepository: WalletSessionRepository;
  adminOperator?: AuthorizedAdminOperatorContext;
  adminReviewStore?: AdminReviewStore;
  auth?: AuthEnforcementDecision;
  liveAuthorization?: TrustedLiveAuthorizationContext;
  liveAuthorizationDecision?: TrustedLiveAuthorizationDecision;
}

export type ApiRuntimeHandler = (context: ApiRuntimeHandlerContext) => unknown | Promise<unknown>;
export type BackendServiceReadinessFactory = () => BackendServiceReadinessReport;
export type ParticipantPreviewConfigFactory = () => CampaignOsParticipantPreviewConfig;
export type TaskVerificationRuleResolver = (
  input: Readonly<Pick<AddTaskRequest, "evidenceRule" | "templateCode" | "verificationType">>,
) => Record<string, boolean | number | string>;

export interface CampaignOsApiRuntime {
  close(): Promise<void>;
  handle(request: ApiRuntimeRequest): Promise<ApiRuntimeResponse>;
}

const deprecatedNonLivePreviewAuthorityBrand: unique symbol = Symbol(
  "campaign-os.deprecated-non-live-preview-authority",
);

export interface DeprecatedNonLivePreviewAuthorityOption {
  readonly mode: "deprecated_non_live_preview";
  readonly [deprecatedNonLivePreviewAuthorityBrand]: true;
}

const deprecatedNonLivePreviewAuthorityOption = Object.freeze({
  mode: "deprecated_non_live_preview" as const,
  [deprecatedNonLivePreviewAuthorityBrand]: true as const,
});

export const createDeprecatedNonLivePreviewAuthorityOption =
(): DeprecatedNonLivePreviewAuthorityOption => deprecatedNonLivePreviewAuthorityOption;

export const TASK_VERIFICATION_REQUIRED_SCHEMA_VERSION =
  "0004_live_provider_task_verification";

export type TaskVerificationRuntimePort = Pick<
  TaskVerificationRuntime,
  "close" | "execute" | "state"
>;
export type TaskVerificationRuntimeFactory = (
  attemptStore?: TaskVerificationAttemptStore,
) => TaskVerificationRuntimePort;

export type WalletAuthenticationAuthorityRuntime = Pick<
  WalletAuthenticationRuntime,
  "resolveAuthorization" | "revalidateFenceBeforeWrite" | "state" | "stop"
>;

export interface ProtectedTaskVerificationExecuteInput {
  issuedSubject: IssuedTaskVerificationSubjectInput;
  liveAuthorization?: TrustedLiveAuthorizationContext;
  task: CanonicalTaskVerificationRevision;
  traceId: string;
}

export interface ProtectedTaskVerificationRuntimeResult
  extends TaskVerificationRuntimeResult {
  providerFamily?: TaskVerificationConfig["bindings"][number]["providerFamily"];
  retryAfterMs: number;
  retryable: boolean;
  status: TaskVerificationRuntimeResult["outcome"];
}

export interface TaskVerificationRuntimeReadiness {
  bindingCount: number;
  enabled: boolean;
  providerStatus: "active" | "configured" | "disabled";
  requiredSchemaVersion: typeof TASK_VERIFICATION_REQUIRED_SCHEMA_VERSION;
  schemaStatus: "blocked" | "ready" | "unchecked";
  status: "blocked" | "disabled" | "invalid" | "ready";
}

export interface ProtectedTaskVerificationRuntimePort {
  close(): Promise<TaskVerificationRuntimeCloseResult>;
  execute(
    input: ProtectedTaskVerificationExecuteInput,
  ): Promise<ProtectedTaskVerificationRuntimeResult>;
  readiness(health?: CampaignDbRepositoryHealth): TaskVerificationRuntimeReadiness;
  state(): TaskVerificationRuntimeState;
}

class ApiRuntimeResourceCloseError extends Error {
  readonly failureCount: number;

  constructor(failures: readonly unknown[]) {
    super("Campaign OS API runtime resource shutdown failed.");
    this.name = "ApiRuntimeResourceCloseError";
    this.failureCount = failures.length;
  }
}

export const API_RUNTIME_CLOSE_MAX_DEADLINE_MS = 10_000;

type ApiRuntimeClosePhase = "provider_drain" | "request_drain" | "resource_close";

const closeDeadlineExceeded = (
  phase: ApiRuntimeClosePhase,
  timeoutMs: number,
) => new ApiRuntimeError({
  code: "PERSISTENCE_UNAVAILABLE",
  details: {
    diagnosticCode: "API_RUNTIME_CLOSE_DEADLINE_EXCEEDED",
    operation: "runtime.close",
    phase,
    timeoutMs,
  },
  message: {
    "en-US": "Campaign OS API runtime shutdown exceeded its safe deadline.",
    "zh-CN": "Campaign OS API runtime 关闭超过安全期限。",
    "zh-TW": "Campaign OS API runtime 關閉超過安全期限。",
  },
  status: 503,
});

const resolveCloseDeadlineMs = (value: number | undefined): number => {
  const deadlineMs = value ?? API_RUNTIME_CLOSE_MAX_DEADLINE_MS;

  if (
    !Number.isSafeInteger(deadlineMs)
    || deadlineMs < 1
    || deadlineMs > API_RUNTIME_CLOSE_MAX_DEADLINE_MS
  ) {
    throw new RangeError(
      `closeDeadlineMs must be an integer between 1 and ${API_RUNTIME_CLOSE_MAX_DEADLINE_MS}.`,
    );
  }

  return deadlineMs;
};

const blockedTaskVerificationResult = (
  traceId: string,
  diagnosticCode = "TASK_VERIFICATION_CONFIG_BLOCKED",
): ProtectedTaskVerificationRuntimeResult => Object.freeze({
  authoritative: false,
  diagnosticCodes: Object.freeze([diagnosticCode]),
  outcome: "blocked",
  pointsAwarded: 0,
  positiveMatch: false,
  retryAfterMs: 0,
  retryable: false,
  status: "blocked",
  traceId,
  transportExecuted: false,
});

const projectProtectedTaskVerificationResult = (
  result: TaskVerificationRuntimeResult,
  binding: TaskVerificationConfig["bindings"][number],
): ProtectedTaskVerificationRuntimeResult => Object.freeze({
  ...result,
  providerFamily: binding.providerFamily,
  retryAfterMs: result.outcome === "pending" ? binding.timeoutMs : 0,
  retryable: result.outcome === "pending",
  status: result.outcome,
});

const taskVerificationRecordId = (
  prefix: "completion" | "evidence" | "participant",
  value: string,
): string => `${prefix}-${createHash("sha256").update(value).digest("hex").slice(0, 32)}`;

const createTaskVerificationFinalizationWrite:
TaskVerificationFinalizationWriteFactory = (input) => {
  const completionId = taskVerificationRecordId("completion", input.attemptId);
  const evidenceId = taskVerificationRecordId("evidence", input.attemptId);
  const participantId = taskVerificationRecordId(
    "participant",
    `${input.task.campaignId}:${input.identity.issuedSubject.walletAddress}`,
  );
  const subject = input.identity.issuedSubject;

  return {
    completion: {
      accountType: subject.accountType,
      campaignId: input.task.campaignId,
      completedAt: input.completedAt,
      createdAt: input.completedAt,
      evidenceHash: input.evidence.evidenceHash,
      evidenceId,
      evidenceSource: input.evidence.evidenceSource,
      id: completionId,
      pointsAwarded: input.pointsAwarded,
      status: "completed",
      taskId: input.task.taskId,
      updatedAt: input.completedAt,
      verificationAttemptId: input.attemptId,
      walletAddress: subject.walletAddress,
      walletSource: subject.walletSource,
    },
    evidence: {
      accountType: subject.accountType,
      campaignId: input.task.campaignId,
      capturedAt: input.completedAt,
      completionId,
      createdAt: input.completedAt,
      diagnosticCodes: [...input.evidence.diagnosticCodes],
      evidenceHash: input.evidence.evidenceHash,
      evidenceRef: input.evidence.evidenceRef,
      evidenceSource: input.evidence.evidenceSource,
      id: evidenceId,
      liveContractExecuted: false,
      liveProviderExecuted: true,
      liveRewardExecuted: false,
      liveStorageExecuted: false,
      pointsAwarded: input.pointsAwarded,
      status: "completed",
      taskId: input.task.taskId,
      updatedAt: input.completedAt,
      verificationAttemptId: input.attemptId,
      walletAddress: subject.walletAddress,
      walletSource: subject.walletSource,
    },
    participant: {
      accountType: subject.accountType,
      campaignId: input.task.campaignId,
      createdAt: input.completedAt,
      id: participantId,
      localePreference: "en-US",
      riskFlags: [],
      totalPoints: input.pointsAwarded,
      updatedAt: input.completedAt,
      walletAddress: subject.walletAddress,
      walletSignatureStatus: "signed",
      walletSource: subject.walletSource,
      walletTypeVerified: subject.accountType !== "UNKNOWN",
      walletVerifiedAt: input.completedAt,
    },
  };
};

const hasTaskVerificationAttemptStore = (
  repository: CampaignDbRepository,
): boolean => {
  const store = repository.taskVerificationAttempts;

  return Boolean(
    store
    && typeof store.begin === "function"
    && typeof store.finalize === "function"
    && typeof store.get === "function"
    && typeof store.markTransportStarted === "function",
  );
};

const hasRequiredTaskVerificationSchema = (
  health: CampaignDbRepositoryHealth,
): boolean => health.selectedMode === "postgres"
  && health.campaignStore?.mode === "postgres"
  && health.campaignStore.schemaVersion === TASK_VERIFICATION_REQUIRED_SCHEMA_VERSION
  && health.campaignStore.migrationStatus === "ready"
  && health.campaignStore.status === "ready"
  && health.campaignStore.appliedMigrationIds?.includes(
    TASK_VERIFICATION_REQUIRED_SCHEMA_VERSION,
  ) === true;

interface TaskVerificationAuthorizationScope {
  readonly fence: LiveAuthorizationFence;
}

const staleTaskVerificationFinalization = async (
  store: TaskVerificationAttemptStore,
  input: Parameters<TaskVerificationAttemptStore["finalize"]>[0],
): Promise<FinalizeTaskVerificationAttemptResult> => {
  const attempt = await store.get(input.owner.attemptId, { traceId: input.traceId });

  if (!attempt) {
    throw new Error("Task verification attempt is unavailable after authorization changed.");
  }

  return Object.freeze({ attempt, kind: "stale_owner" as const });
};

const createAuthorizationFencedTaskVerificationAttemptStore = (
  store: TaskVerificationAttemptStore,
  authorizationRuntime: WalletAuthenticationAuthorityRuntime,
  authorizationScope: AsyncLocalStorage<TaskVerificationAuthorizationScope>,
): TaskVerificationAttemptStore => ({
  begin: (input) => store.begin(input),
  close: () => store.close(),
  finalize: async (input) => {
    const activeAuthorization = authorizationScope.getStore();

    if (!activeAuthorization) {
      return store.finalize(input);
    }

    const result = await authorizationRuntime.revalidateFenceBeforeWrite({
      fence: unwrapLiveAuthorizationFence(activeAuthorization.fence),
      traceId: input.traceId,
      write: () => store.finalize(input),
    });

    return result.status === "committed"
      ? result.value
      : staleTaskVerificationFinalization(store, input);
  },
  get: (attemptId, context) => store.get(attemptId, context),
  markTransportStarted: (input) => store.markTransportStarted(input),
});

const createProtectedTaskVerificationRuntime = (options: {
  authorizationRuntime?: WalletAuthenticationAuthorityRuntime;
  authorizationScope: AsyncLocalStorage<TaskVerificationAuthorizationScope>;
  config: TaskVerificationConfig;
  fenceAwareRuntimeComposition: boolean;
  fencedAttemptStore?: TaskVerificationAttemptStore;
  repository: CampaignDbRepository;
  runtimeFactory?: TaskVerificationRuntimeFactory;
  safeRepository: CampaignDbRepository;
  runtime?: TaskVerificationRuntimePort;
}): ProtectedTaskVerificationRuntimePort => {
  let accepting = true;
  let activeRuntime = options.runtime;
  let infrastructureReadiness: Promise<boolean> | undefined;
  let observedSchemaStatus: TaskVerificationRuntimeReadiness["schemaStatus"] = "unchecked";
  const runtimeConfigured = () => options.fenceAwareRuntimeComposition
    && Boolean(activeRuntime || options.runtimeFactory);
  const observeSchema = (health: CampaignDbRepositoryHealth): boolean => {
    const ready = hasRequiredTaskVerificationSchema(health);
    observedSchemaStatus = ready ? "ready" : "blocked";
    return ready;
  };
  const resolveInfrastructureReadiness = (): Promise<boolean> => {
    if (
      options.config.status !== "ready"
      || !options.config.enabled
      || !options.config.valid
      || !options.config.hasLiveBindings
      || !runtimeConfigured()
      || !hasTaskVerificationAttemptStore(options.repository)
    ) {
      return Promise.resolve(false);
    }

    infrastructureReadiness ??= options.safeRepository.health({
      traceId: `task-verification-activation-${randomUUID()}`,
    }).then(observeSchema, () => {
      observedSchemaStatus = "blocked";
      return false;
    });

    return infrastructureReadiness;
  };

  return {
    close: async () => {
      accepting = false;

      return activeRuntime?.close()
        ?? Object.freeze({ activeCallCount: 0, status: "drained" as const });
    },
    execute: async (input) => {
      if (!accepting) {
        return blockedTaskVerificationResult(
          input.traceId,
          "TASK_VERIFICATION_RUNTIME_STOPPED",
        );
      }

      if (!await resolveInfrastructureReadiness()) {
        return blockedTaskVerificationResult(input.traceId);
      }

      const bindingId = input.task.evidenceRule.providerBindingId;
      if (
        typeof bindingId !== "string"
        || (input.task.verificationType !== "ON_CHAIN"
          && input.task.verificationType !== "DAPP_API")
      ) {
        return blockedTaskVerificationResult(input.traceId);
      }

      const bindingResolution = options.config.resolveBinding(
        bindingId,
        input.task.verificationType,
      );
      if (bindingResolution.status !== "resolved") {
        return blockedTaskVerificationResult(input.traceId);
      }

      try {
        activeRuntime ??= options.runtimeFactory?.(options.fencedAttemptStore);
        if (!activeRuntime) {
          return blockedTaskVerificationResult(input.traceId);
        }
        const identity = deriveTaskVerificationIdentity(
          issueTrustedTaskVerificationIdentityInput({
            binding: {
              bindingId: bindingResolution.binding.id,
              bindingRevision: bindingResolution.binding.revision,
            },
            issuedSubject: input.issuedSubject,
            task: input.task,
            traceId: input.traceId,
          }),
        );

        const execute = () => activeRuntime!.execute({
          identity,
          task: input.task,
          traceId: input.traceId,
        } satisfies ExecuteTaskVerificationRuntimeInput);
        const result = input.liveAuthorization && options.authorizationRuntime
          ? await options.authorizationScope.run(
            { fence: input.liveAuthorization.fence },
            execute,
          )
          : await execute();

        return projectProtectedTaskVerificationResult(
          result,
          bindingResolution.binding,
        );
      } catch {
        return blockedTaskVerificationResult(input.traceId);
      }
    },
    readiness: (health) => {
      if (health) {
        observeSchema(health);
      }
      const configStatus = options.config.status;
      const enabled = configStatus === "ready" && options.config.enabled;
      const ready = accepting
        && enabled
        && options.config.valid
        && options.config.hasLiveBindings
        && hasTaskVerificationAttemptStore(options.repository)
        && runtimeConfigured()
        && observedSchemaStatus === "ready";

      return Object.freeze({
        bindingCount: options.config.bindings.length,
        enabled,
        providerStatus: activeRuntime
          ? "active"
          : runtimeConfigured()
            ? "configured"
            : "disabled",
        requiredSchemaVersion: TASK_VERIFICATION_REQUIRED_SCHEMA_VERSION,
        schemaStatus: observedSchemaStatus,
        status: ready
          ? "ready"
          : configStatus === "disabled"
            ? "disabled"
            : configStatus === "invalid"
              ? "invalid"
              : "blocked",
      });
    },
    state: () => activeRuntime?.state()
      ?? Object.freeze({
        accepting,
        activeCallCount: 0,
        controllerCount: 0,
      }),
  };
};

const waitForClosePhase = <T>(
  pending: Promise<T>,
  deadlineAt: number,
  phase: ApiRuntimeClosePhase,
  timeoutMs: number,
): Promise<T> => new Promise<T>((resolvePending, rejectPending) => {
  const remainingMs = Math.max(0, deadlineAt - Date.now());
  const timer = setTimeout(() => {
    rejectPending(closeDeadlineExceeded(phase, timeoutMs));
  }, remainingMs);
  timer.unref?.();

  pending.then(
    (value) => {
      clearTimeout(timer);
      resolvePending(value);
    },
    (error: unknown) => {
      clearTimeout(timer);
      rejectPending(error);
    },
  );
});

export interface CampaignDbRuntimePool extends PostgresCampaignStorePool {
  onError(listener: (error: unknown) => void): void;
}

export type CampaignDbPoolFactory = (
  config: CampaignOsCampaignDbPoolConfig,
) => CampaignDbRuntimePool;

export type AdminReviewPoolFactory = (
  config: CampaignOsCampaignDbPoolConfig,
) => PostgresAdminReviewStorePool;

export type AdminReviewStoreOwnership = "external" | "runtime";

const campaignDbRequire = createRequire(
  import.meta.url.startsWith("file:") ? import.meta.url : join(process.cwd(), "package.json"),
);

const createCampaignDbAuthoritativeService = (
  service: CampaignOsLocalService,
): CampaignOsLocalService => {
  const authoritativeMissId = "__campaign_db_authoritative_miss__";

  return {
    ...service,
    addTask: (request) => service.addTask({ ...request, campaignId: authoritativeMissId }),
    checkEligibility: (request) => service.checkEligibility({
      ...request,
      campaignId: authoritativeMissId,
    }),
    exportWinners: (request) => service.exportWinners({
      ...request,
      campaignId: authoritativeMissId,
    }),
    getCampaignDetail: (request) => service.getCampaignDetail({
      ...request,
      campaignId: authoritativeMissId,
    }),
    getExportConfirmationReadiness: (request) => service.getExportConfirmationReadiness({
      ...request,
      campaignId: authoritativeMissId,
    }),
    listCampaigns: (request) => {
      const result = service.listCampaigns(request);

      if (!result.ok) {
        return result;
      }

      return {
        ...result,
        payload: {
          ...result.payload,
          campaignId: "campaign-db",
          details: [],
          items: [],
          summary: {
            appHubReadyCount: 0,
            endedCount: 0,
            forecastReadyCount: 0,
            liveCount: 0,
            portfolioReadyCount: 0,
            scheduledCount: 0,
            topCampaignId: "",
            totalCampaigns: 0,
          },
        },
      };
    },
    verifyTask: (request) => service.verifyTask({
      ...request,
      campaignId: authoritativeMissId,
    }),
  };
};

interface ApiRuntimeRouteMatcher {
  match(pathname: string): Record<string, string> | undefined;
  route: ApiRuntimeRouteContract;
}

export interface CreateCampaignOsApiRuntimeOptions {
  adminOperatorMembershipRegistry?: AdminOperatorMembershipRegistry;
  adminReviewConfig?: CampaignOsAdminReviewConfig;
  adminReviewConfigOptions?: CampaignOsAdminReviewConfigOptions;
  adminReviewExpectedMigration?: {
    checksum: string;
    id: typeof ADMIN_REVIEW_MIGRATION_ID;
  };
  adminReviewPoolFactory?: AdminReviewPoolFactory;
  adminReviewStore?: AdminReviewStore;
  adminReviewStoreOwnership?: AdminReviewStoreOwnership;
  backendServiceReadiness?: BackendServiceReadinessFactory;
  campaignDbConfig?: CampaignOsCampaignDbConfig;
  campaignDbPoolFactory?: CampaignDbPoolFactory;
  campaignDbRepository?: CampaignDbRepository;
  campaignDbRepositoryOptions?: CreateCampaignDbRepositoryOptions;
  closeDeadlineMs?: number;
  deprecatedNonLivePreviewAuthority?: DeprecatedNonLivePreviewAuthorityOption;
  exportArtifactRegistry?: ExportArtifactRegistry;
  logger?: Pick<Console, "error"> | false;
  participantPreviewConfigOptions?: CampaignOsParticipantPreviewConfigOptions;
  repository?: CampaignOsRepository;
  runtimeConfig?: CampaignOsRuntimeConfig;
  runtimeConfigOptions?: CampaignOsRuntimeConfigOptions;
  service?: CampaignOsLocalService;
  taskVerificationConfig?: TaskVerificationConfig;
  taskVerificationConfigOptions?: TaskVerificationConfigInput;
  taskVerificationProviderRuntime?: ProviderHttpRuntimeSummary;
  taskVerificationRuleResolver?: TaskVerificationRuleResolver;
  taskVerificationRuntime?: TaskVerificationRuntimePort;
  taskVerificationRuntimeFactory?: TaskVerificationRuntimeFactory;
  taskVerificationTransport?: ProviderHttpTransport;
  version?: string;
  walletAuthenticationHttpController?: WalletAuthenticationHttpController;
  walletAuthenticationRuntime?: WalletAuthenticationAuthorityRuntime;
  walletAuthenticationRuntimeOwnership?: "external" | "runtime";
  walletSessionActivationPolicy?: WalletSessionActivationPolicy;
  walletSessionRepository?: WalletSessionRepository;
  walletSessionRepositoryOptions?: CreateWalletSessionRepositoryOptions;
}

export type WalletSessionActivationPolicy =
  | "runtime_issued_only"
  // Explicit compatibility mode for repositories that provide pre-issued test fixtures.
  | "repository_trusted";

const createPgCampaignPool: CampaignDbPoolFactory = (config) => {
  const { Pool } = campaignDbRequire("pg") as typeof import("pg");
  const pool = new Pool(config);

  return {
    connect: async () => {
      const client = await pool.connect();

      return {
        query: async (text, values = []) => {
          const result = await client.query(text, values);

          return { rows: result.rows as Array<Record<string, unknown>> };
        },
        release: () => client.release(),
      };
    },
    end: async () => pool.end(),
    onError: (listener) => {
      pool.on("error", listener);
    },
    query: async (text, values = []) => {
      const result = await pool.query(text, values);

      return { rows: result.rows as Array<Record<string, unknown>> };
    },
  };
};

const resolveAdminReviewExpectedMigration = () => {
  const migrationPath = resolve(
    process.cwd(),
    "db/migrations",
    `${ADMIN_REVIEW_MIGRATION_ID}.up.sql`,
  );
  const normalizedSql = `${readFileSync(migrationPath, "utf8")
    .replace(/\r\n?/g, "\n")
    .trimEnd()}\n`;

  return Object.freeze({
    checksum: createHash("sha256").update(normalizedSql, "utf8").digest("hex"),
    id: ADMIN_REVIEW_MIGRATION_ID,
  });
};

const adminRuntimeUnavailable = (
  diagnosticCode: string,
  operation = "adminReview.initialize",
) => new ApiRuntimeError({
  code: "PERSISTENCE_UNAVAILABLE",
  details: {
    diagnosticCode,
    operation,
  },
  message: {
    "en-US": "The durable Admin review runtime is unavailable.",
    "zh-CN": "持久化 Admin review runtime 当前不可用。",
    "zh-TW": "持久化 Admin review runtime 當前不可用。",
  },
  status: 503,
});

const isHandlerTransportResult = (
  value: unknown,
): value is ApiRuntimeHandlerTransportResult => isRecord(value)
  && value.kind === "api_runtime_transport_result"
  && typeof value.status === "number"
  && Number.isInteger(value.status)
  && value.status >= 200
  && value.status <= 299;

const createPgAdminReviewPool: AdminReviewPoolFactory = (config) =>
  createPgCampaignPool(config) as PostgresAdminReviewStorePool;

let generatedTraceSequence = 0;

const responseHeaders = (traceId: string): Record<string, string> => ({
  "content-type": "application/json; charset=utf-8",
  "x-campaign-os-trace-id": traceId,
});

const createAdminSuccessEnvelope = <TPayload>(
  data: TPayload,
  traceId: string,
): AdminApiSuccessEnvelope<TPayload> => ({
  data,
  ok: true,
  traceId,
});

const normalizeMethod = (method: string) => method.trim().toUpperCase();

const normalizePathname = (pathname: string) => {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname || "/";
};

const splitPath = (path: string) =>
  normalizePathname(path)
    .split("/")
    .filter(Boolean);

const compileRouteMatcher = (route: ApiRuntimeRouteContract): ApiRuntimeRouteMatcher => {
  const routeSegments = splitPath(route.path);

  return {
    route,
    match: (pathname) => {
      const requestSegments = splitPath(pathname);

      if (requestSegments.length !== routeSegments.length) {
        return undefined;
      }

      const params: Record<string, string> = {};

      for (let index = 0; index < routeSegments.length; index += 1) {
        const routeSegment = routeSegments[index];
        const requestSegment = requestSegments[index];

        if (routeSegment.startsWith(":")) {
          params[routeSegment.slice(1)] = decodeURIComponent(requestSegment);
          continue;
        }

        if (routeSegment !== requestSegment) {
          return undefined;
        }
      }

      return params;
    },
  };
};

const getHeader = (headers: ApiRuntimeHeaders | undefined, name: string): string | undefined => {
  if (!headers) {
    return undefined;
  }

  const normalizedName = name.toLowerCase();
  const match = Object.entries(headers).find(([key]) => key.toLowerCase() === normalizedName)?.[1];

  if (Array.isArray(match)) {
    return match[0];
  }

  return typeof match === "string" ? match : undefined;
};

const createTraceId = (headers?: ApiRuntimeHeaders) => {
  const callerTraceId = getHeader(headers, "x-campaign-os-trace-id")?.trim();
  const callerTraceIdIsSafe = Boolean(
    callerTraceId
    && callerTraceId.length <= 128
    && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(callerTraceId)
    && !/(?:bearer|password|private|raw[_-]?signature|secret|token)/i.test(callerTraceId)
  );

  if (callerTraceIdIsSafe && callerTraceId) {
    return callerTraceId;
  }

  generatedTraceSequence += 1;

  return `campaign-os-trace-${Date.now().toString(36)}-${generatedTraceSequence}`;
};

const participantCompatibilityQueryClaimFields = new Map<string, string>([
  ["accountType", "accountType"],
  ["address", "walletAddress"],
  ["chainId", "chainId"],
  ["network", "network"],
  ["walletAddress", "walletAddress"],
  ["walletSource", "walletSource"],
]);

const parseQuery = (searchParams: URLSearchParams): Record<string, string> => {
  const query = new Map<string, string>();

  for (const [key, value] of searchParams.entries()) {
    const existingValue = query.get(key);
    const compatibilityField = participantCompatibilityQueryClaimFields.get(key);

    if (compatibilityField && existingValue !== undefined && existingValue !== value) {
      throw authSubjectMismatch({
        diagnosticCode: "AUTH_SUBJECT_MISMATCH",
        field: compatibilityField,
      });
    }

    query.set(key, value);
  }

  return Object.fromEntries(query);
};

const parseRequestTarget = (path: string) => {
  const url = new URL(path || "/", "http://127.0.0.1");

  return {
    pathname: normalizePathname(url.pathname),
    query: parseQuery(url.searchParams),
  };
};

const parseBody = (
  request: ApiRuntimeRequest,
  method: string,
  rejectDuplicateObjectKeys = false,
) => {
  if (method !== "POST") {
    return undefined;
  }

  if (request.body === undefined || request.body === "") {
    return {};
  }

  if (typeof request.body !== "string") {
    return request.body;
  }

  if (rejectDuplicateObjectKeys) {
    const parsed = parseJsonWithUniqueObjectKeys(request.body);
    if (parsed.ok) {
      return parsed.value;
    }
    try {
      JSON.parse(request.body);
    } catch {
      throw malformedJson();
    }
    throw invalidRequest("body", "Duplicate JSON object keys are not allowed.");
  }

  try {
    return JSON.parse(request.body) as unknown;
  } catch {
    throw malformedJson();
  }
};

const createRuntimeConfigBlockedError = (error: unknown) => {
  if (error instanceof CampaignOsCampaignDbConfigError) {
    return new ApiRuntimeError({
      code: "INVALID_REQUEST",
      details: {
        diagnosticCodes: [error.code],
        fallbackUsed: false,
        field: error.field,
        persistenceMode: "postgres",
        reason: "Invalid Campaign DB runtime configuration.",
        status: "blocked",
      },
      message: {
        "en-US": "The Campaign DB runtime configuration is blocked.",
        "zh-CN": "Campaign DB runtime 配置被阻断。",
        "zh-TW": "Campaign DB runtime 設定被阻斷。",
      },
      status: 400,
    });
  }

  const message = error instanceof Error ? error.message : "";
  const missingLocalJsonDir = message.includes("local_json persistence requires");
  const unsupportedPersistenceMode = message.includes("Unsupported Campaign OS persistence mode");
  const diagnosticCode = missingLocalJsonDir
    ? "MISSING_LOCAL_PERSISTENCE_DIR"
    : unsupportedPersistenceMode
      ? "UNSUPPORTED_PERSISTENCE_MODE"
      : "RUNTIME_CONFIG_INVALID";
  const field = missingLocalJsonDir
    ? "runtimeConfig.persistence.localDataDir"
    : unsupportedPersistenceMode
      ? "runtimeConfig.persistence.mode"
      : "runtimeConfig";

  return new ApiRuntimeError({
    code: "INVALID_REQUEST",
    details: {
      diagnosticCodes: [diagnosticCode],
      fallbackUsed: false,
      field,
      persistenceMode: missingLocalJsonDir ? "local_json" : "unknown",
      reason: missingLocalJsonDir
        ? "local_json persistence requires CAMPAIGN_OS_PERSISTENCE_DIR or persistence.localDataDir."
        : unsupportedPersistenceMode
          ? "Unsupported Campaign OS persistence mode."
          : "Invalid local Campaign OS runtime configuration.",
      status: "blocked",
    },
    message: {
      "en-US": "The local Campaign OS runtime configuration is blocked.",
      "zh-CN": "本地 Campaign OS runtime 配置被阻断。",
      "zh-TW": "本地 Campaign OS runtime 設定被阻斷。",
    },
    status: 400,
  });
};

const createBackendServiceReadinessFactory = ({
  resolvedConfig,
  runtimeConfigOptions,
  version,
}: {
  resolvedConfig: CampaignOsRuntimeConfig;
  runtimeConfigOptions?: CampaignOsRuntimeConfigOptions;
  version: string;
}): BackendServiceReadinessFactory => {
  let report: BackendServiceReadinessReport | undefined;

  return () => {
    report ??= createBackendServiceReadinessReport({
      configOptions: {
        ...runtimeConfigOptions,
        persistence: {
          ...runtimeConfigOptions?.persistence,
          ...resolvedConfig.persistence,
        },
        version,
      },
    });

    return report;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const ownerAddressFromBody = (body: unknown) =>
  isRecord(body) && typeof body.ownerAddress === "string" ? body.ownerAddress : undefined;

const participantCompatibilityRouteIds = new Set([
  "campaigns.eligibility",
  "campaigns.points.ranking.ledger.runtime",
]);

const hasOwn = (record: Record<string, unknown> | Record<string, string>, key: string) =>
  Object.prototype.hasOwnProperty.call(record, key);

const compatibilityClaim = (
  field: string,
  candidates: readonly unknown[],
): string | undefined => {
  if (candidates.length === 0) {
    return undefined;
  }

  const values = candidates.map((value) => {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw invalidRequest(field, `Participant compatibility claim '${field}' must be a non-empty string.`);
    }

    return value.trim();
  });
  const first = values[0];

  if (values.some((value) => value !== first)) {
    throw authSubjectMismatch({
      diagnosticCode: "AUTH_SUBJECT_MISMATCH",
      field,
    });
  }

  return first;
};

const compatibilityCandidates = (
  body: Record<string, unknown>,
  bodyField: string,
  query: Record<string, string>,
  queryFields: readonly string[],
) => [
  ...(hasOwn(body, bodyField) ? [body[bodyField]] : []),
  ...queryFields.flatMap((field) => hasOwn(query, field) ? [query[field]] : []),
];

const participantCompatibilitySubjectFromRequest = (
  routeId: string,
  body: unknown,
  query: Record<string, string>,
): ParticipantCompatibilitySubject | undefined => {
  if (!participantCompatibilityRouteIds.has(routeId)) {
    return undefined;
  }

  const bodyClaims = isRecord(body) ? body : {};
  const walletAddress = compatibilityClaim(
    "walletAddress",
    compatibilityCandidates(bodyClaims, "walletAddress", query, ["walletAddress", "address"]),
  );
  const accountType = compatibilityClaim(
    "accountType",
    compatibilityCandidates(bodyClaims, "accountType", query, ["accountType"]),
  );
  const walletSource = compatibilityClaim(
    "walletSource",
    compatibilityCandidates(bodyClaims, "walletSource", query, ["walletSource"]),
  );
  const chainId = compatibilityClaim(
    "chainId",
    compatibilityCandidates(bodyClaims, "chainId", query, ["chainId"]),
  );
  const network = compatibilityClaim(
    "network",
    compatibilityCandidates(bodyClaims, "network", query, ["network"]),
  );

  if (!walletAddress && !accountType && !walletSource && !chainId && !network) {
    return undefined;
  }

  return {
    ...(accountType ? { accountType: accountType as ParticipantCompatibilitySubject["accountType"] } : {}),
    ...(chainId ? { chainId } : {}),
    ...(network ? { network: network as ParticipantCompatibilitySubject["network"] } : {}),
    ...(walletAddress ? { walletAddress } : {}),
    ...(walletSource ? { walletSource: walletSource as ParticipantCompatibilitySubject["walletSource"] } : {}),
  };
};

const evaluateRuntimeIssuedAuth = async ({
  activeWalletSessionIds,
  compatibilitySubject,
  headers,
  ownerAddress,
  routeId,
  traceId,
  walletSessionActivationPolicy,
  walletSessionRepository,
}: {
  activeWalletSessionIds: ReadonlySet<string>;
  compatibilitySubject?: ParticipantCompatibilitySubject;
  headers?: ApiRuntimeHeaders;
  ownerAddress?: string;
  routeId: string;
  traceId: string;
  walletSessionActivationPolicy: WalletSessionActivationPolicy;
  walletSessionRepository: WalletSessionRepository;
}) => {
  let lookupFailure: unknown;
  const authDecision = await evaluateIssuedAuthEnforcement({
    compatibilitySubject,
    headers,
    issuedSessionLookup: async (sessionId, context) => {
      if (
        walletSessionActivationPolicy === "runtime_issued_only"
        && !activeWalletSessionIds.has(sessionId)
      ) {
        return undefined;
      }

      try {
        return await walletSessionRepository.getBySessionId(sessionId, context);
      } catch (error) {
        lookupFailure = error;
        throw error;
      }
    },
    ownerAddress,
    routeId,
    traceId,
  });

  if (lookupFailure) {
    throw lookupFailure;
  }

  return authDecision;
};

const evaluateRuntimeAdminAuth = ({
  activeWalletSessionIds,
  campaignId,
  headers,
  membershipRegistry,
  routeId,
  traceId,
  walletSessionActivationPolicy,
  walletSessionRepository,
}: {
  activeWalletSessionIds: ReadonlySet<string>;
  campaignId?: string;
  headers?: ApiRuntimeHeaders;
  membershipRegistry: AdminOperatorMembershipRegistry;
  routeId: string;
  traceId: string;
  walletSessionActivationPolicy: WalletSessionActivationPolicy;
  walletSessionRepository: WalletSessionRepository;
}) => evaluateAdminOperatorEnforcement({
  campaignId,
  headers,
  issuedSessionLookup: async (sessionId, context) => {
    if (
      walletSessionActivationPolicy === "runtime_issued_only"
      && !activeWalletSessionIds.has(sessionId)
    ) {
      return undefined;
    }

    return walletSessionRepository.getBySessionId(sessionId, context);
  },
  membershipRegistry,
  routeId,
  traceId,
});

const createParticipantPreviewConfigFactory = (
  options: CampaignOsParticipantPreviewConfigOptions | undefined,
  runtimeConfigOptions: CampaignOsRuntimeConfigOptions | undefined,
): ParticipantPreviewConfigFactory => () => {
  try {
    return resolveCampaignOsParticipantPreviewConfig({
      ...options,
      env: options?.env ?? runtimeConfigOptions?.env,
    });
  } catch (error) {
    if (error instanceof CampaignOsParticipantPreviewConfigError) {
      throw invalidRequest(
        error.field,
        `Participant Campaign preview configuration was rejected (${error.code}).`,
      );
    }

    throw error;
  }
};

const shouldEvaluateLocalAuth = (routeId: string) =>
  getProtectedRouteAuth(routeId)?.enforcementStatus === "local_enforced";

const campaignOwnerRouteIds = new Set([
  "campaigns.owner.detail",
  "campaigns.tasks.add",
  "campaigns.tasks.generate",
]);

const authErrorFromDecision = (decision: AuthEnforcementDecision) => {
  const details = {
    ...decision.safeDetails,
    diagnosticCode: decision.diagnostic?.code,
    field: decision.diagnostic?.field,
    message: decision.diagnostic?.message,
  };

  if (decision.httpStatus === 401) {
    return decision.diagnostic?.code === "AUTH_SESSION_REQUIRED"
      ? authSessionRequired(details)
      : authSessionInvalid(details);
  }

  if (decision.diagnostic?.code === "AUTH_SUBJECT_MISMATCH") {
    return authSubjectMismatch(details);
  }

  return authForbidden(details);
};

const liveAuthRuntimeError = (
  status: number,
  diagnosticCode: string,
  field = "authorization",
) => new ApiRuntimeError({
  code: status === 403 ? "AUTH_FORBIDDEN" : "AUTH_SESSION_INVALID",
  details: { diagnosticCode, field },
  message: {
    "en-US": "The durable wallet authorization is not valid for this request.",
    "zh-CN": "当前 durable wallet authorization 不适用于该请求。",
    "zh-TW": "The durable wallet authorization is not valid for this request.",
  },
  status,
});

const rawHeader = (
  headers: ApiRuntimeHeaders | undefined,
  name: string,
): string | readonly string[] | undefined => {
  if (!headers) {
    return undefined;
  }

  const normalizedName = name.toLowerCase();
  return Object.entries(headers).find(([key]) => key.toLowerCase() === normalizedName)?.[1];
};

const singleHeader = (
  headers: ApiRuntimeHeaders | undefined,
  name: string,
): string | undefined => {
  const value = rawHeader(headers, name);

  return typeof value === "string" ? value : undefined;
};

const resolveLiveAuthorization = async ({
  request,
  runtime,
  traceId,
}: {
  request: ApiRuntimeRequest;
  runtime: WalletAuthenticationAuthorityRuntime;
  traceId: string;
}): Promise<TrustedLiveAuthorizationContext> => {
  let authorization: ResolveWalletAuthenticationAuthorizationResult;

  try {
    authorization = await runtime.resolveAuthorization({
      cookieHeader: singleHeader(request.headers, "cookie"),
      csrfHeader: rawHeader(request.headers, "x-campaign-os-csrf"),
      origin: singleHeader(request.headers, "origin"),
      traceId,
    });
  } catch {
    throw persistenceUnavailable("walletAuthentication.resolveAuthorization");
  }

  if (authorization.status !== "authorized") {
    const diagnosticCode = authorization.diagnostic.code;

    if (authorization.status === "unavailable") {
      throw persistenceUnavailable(`walletAuthentication.${diagnosticCode}`);
    }
    if (authorization.status === "forbidden") {
      throw liveAuthRuntimeError(403, diagnosticCode, authorization.diagnostic.field);
    }
    if (authorization.status === "conflict") {
      throw liveAuthRuntimeError(409, diagnosticCode, authorization.diagnostic.field);
    }

    throw liveAuthRuntimeError(401, diagnosticCode, authorization.diagnostic.field);
  }

  const trusted = resolveTrustedLiveAuthorizationContext(authorization, { now: new Date() });
  if (trusted.status !== "resolved") {
    throw liveAuthRuntimeError(401, "LIVE_AUTH_CONTEXT_INVALID");
  }

  return trusted.context;
};

const liveAuthErrorFromDecision = (decision: TrustedLiveAuthorizationDecision) =>
  liveAuthRuntimeError(
    decision.httpStatus ?? 403,
    decision.audit.decisionCode,
  );

const exactTaskVerificationCampaignId = (body: unknown): string => {
  if (!isRecord(body)) {
    throw invalidRequest("body", "Task verification requires an exact JSON object.");
  }
  const keys = Object.keys(body);
  const campaignId = body.campaignId;
  if (
    keys.length !== 1
    || keys[0] !== "campaignId"
    || typeof campaignId !== "string"
    || campaignId.length === 0
    || campaignId.length > 160
  ) {
    throw invalidRequest("body", "Task verification accepts only a bounded campaignId.");
  }

  return campaignId;
};

const ownerAddressFromCampaignDb = async ({
  campaignDbRepository,
  campaignId,
  traceId,
}: {
  campaignDbRepository: CampaignDbRepository;
  campaignId: string | undefined;
  traceId: string;
}) => {
  if (!campaignId) {
    return undefined;
  }

  const campaign = await campaignDbRepository.getById(campaignId, { traceId });

  return campaign?.ownerAddress;
};

const createLiveAdminOperatorContext = ({
  campaignId,
  context,
  decision,
  registry,
}: {
  campaignId?: string;
  context: TrustedLiveAuthorizationContext;
  decision: TrustedLiveAuthorizationDecision;
  registry: AdminOperatorMembershipRegistry;
}): AuthorizedAdminOperatorContext | undefined => {
  const requestedRole = decision.matchedRoles.find(
    (role): role is "internal_operator" | "review_operator" =>
      role === "internal_operator" || role === "review_operator",
  );
  if (!requestedRole) {
    return undefined;
  }
  const membership = registry.lookup({
    campaignId,
    requestedRole,
    subjectAddress: context.subject.walletAddress,
  });
  if (!membership.authorized) {
    return undefined;
  }

  return Object.freeze({
    ...membership.context,
    accountType: context.subject.accountType,
    chainId: context.subject.chainId,
    credentialBoundary: "ordinary_user_wallet" as const,
    issuerMode: "local_opaque" as const,
    network: context.subject.network,
    proofStatus: "verified" as const,
    sessionId: context.sessionId,
    walletSource: context.subject.walletSource,
  });
};

const createHealthDatabaseReadinessMetadata = (
  report: BackendServiceReadinessReport,
) => ({
  adapterStatus: report.databaseReadiness.adapter.status,
  migrationPlanStatus: report.databaseReadiness.migrationPlan.status,
  requiredStoreCount: report.databaseReadiness.stores.length,
  validationIssueCount: report.databaseReadiness.validation.issues.length,
  valid: report.databaseReadiness.validation.valid,
});

const createContractDatabaseReadinessMetadata = (
  report: BackendServiceReadinessReport,
) => ({
  adapter: {
    id: report.databaseReadiness.adapter.id,
    localReviewOnly: report.databaseReadiness.adapter.localReviewOnly,
    readinessLabel: report.databaseReadiness.adapter.readinessLabel,
    requiresConnectionString: report.databaseReadiness.adapter.requiresConnectionString,
    requiresMigrationRunner: report.databaseReadiness.adapter.requiresMigrationRunner,
    status: report.databaseReadiness.adapter.status,
  },
  migrationPlan: {
    blockedMigrationIds: report.databaseReadiness.migrationPlan.blockedMigrationIds,
    dryRun: report.databaseReadiness.migrationPlan.dryRun,
    liveExecutionEnabled: report.databaseReadiness.migrationPlan.liveExecutionEnabled,
    pendingMigrationIds: report.databaseReadiness.migrationPlan.pendingMigrationIds,
    planId: report.databaseReadiness.migrationPlan.planId,
    profileId: report.databaseReadiness.migrationPlan.profileId,
    status: report.databaseReadiness.migrationPlan.status,
    validation: report.databaseReadiness.migrationPlan.validation,
  },
  requiredStores: report.databaseReadiness.stores.map((store) => ({
    id: store.id,
    migrationRequired: store.migrationRequired,
    ownerServiceId: store.ownerServiceId,
    productionMode: store.productionMode,
    readiness: store.readiness,
    schemaVersion: store.schemaVersion,
  })),
  validation: report.databaseReadiness.validation,
});

const createPersistenceRuntimeMetadata = (
  report: BackendServiceReadinessReport,
) => createBackendPersistenceRuntimeSummary(report.persistenceRuntime);

const createDatabaseAdapterRuntimeMetadata = (
  report: BackendServiceReadinessReport,
) => createBackendDatabaseAdapterRuntimeSummary(report.databaseAdapterRuntime);

const createDatabaseAdapterRuntimeContractMetadata = (
  report: BackendServiceReadinessReport,
) => ({
  ...createBackendDatabaseAdapterRuntimeSummary(report.databaseAdapterRuntime),
  productionDbRuntime: report.databaseAdapterRuntime.productionDbRuntime,
});

const createHealthAuthSessionMetadata = (
  report: BackendServiceReadinessReport,
) => ({
  agentCredentialBoundary: report.authSession.agentCredentialBoundary,
  foundation: {
    blockedDependencyIds: report.authSessionFoundation.blockedDependencyIds,
    blockerCount: report.authSessionFoundation.blockerCount,
    diagnosticCodes: report.authSessionFoundation.diagnosticCodes,
    liveSideEffectsEnabled: report.authSessionFoundation.liveSideEffectsEnabled,
    liveSigningExecuted: report.authSessionFoundation.liveSigningExecuted,
    liveVerificationExecuted: report.authSessionFoundation.liveVerificationExecuted,
    productionReady: report.authSessionFoundation.productionReady,
    status: report.authSessionFoundation.status,
    valid: report.authSessionFoundation.valid,
  },
  diagnosticCodes: report.authSession.validation.issues.map((issue) => issue.code),
  profileId: report.authSession.profileId,
  proofStatus: report.authSession.proofBoundary.status,
  protectedRouteCount: report.authSession.protectedRouteCount,
  roleCount: report.authSession.rolePolicy.roleCount,
  status: report.authSession.status,
  validationIssueCount: report.authSession.validation.issues.length,
  valid: report.authSession.validation.valid,
  verificationMode: report.authSession.proofBoundary.verificationMode,
});

const createProviderClientReadinessMetadata = (
  report: BackendServiceReadinessReport,
) => ({
  activationInventory: report.providerClientReadiness.activationInventory,
  activationStatus: report.providerClientReadiness.activationStatus,
  blockerCount: report.providerClientReadiness.blockerCount,
  diagnosticCodes: report.providerClientReadiness.diagnosticCodes,
  downstreamLiveFlags: report.providerClientReadiness.downstreamLiveFlags,
  id: report.providerClientReadiness.id,
  liveProviderCallsAttempted: report.providerClientReadiness.liveProviderCallsAttempted,
  policy: report.providerClientReadiness.policy,
  productionReady: report.providerClientReadiness.productionReady,
  providerHttpRuntime: {
    activationStatus: report.providerClientReadiness.providerHttpRuntime.activationStatus,
    blockerCount: report.providerClientReadiness.providerHttpRuntime.blockerCount,
    configuredCategories: report.providerClientReadiness.providerHttpRuntime.configuredCategories,
    diagnosticCodes: report.providerClientReadiness.providerHttpRuntime.diagnosticCodes,
    downstreamLiveFlags: report.providerClientReadiness.providerHttpRuntime.downstreamLiveFlags,
    endpointCount: report.providerClientReadiness.providerHttpRuntime.endpointCount,
    liveHttpCallsAttempted: report.providerClientReadiness.providerHttpRuntime.liveHttpCallsAttempted,
    productionReady: report.providerClientReadiness.providerHttpRuntime.productionReady,
    runtimeId: report.providerClientReadiness.providerHttpRuntime.id,
    status: report.providerClientReadiness.providerHttpRuntime.status,
    transportProvided: report.providerClientReadiness.providerHttpRuntime.transportProvided,
    valid: report.providerClientReadiness.providerHttpRuntime.valid,
  },
  providerClientsEnabled: report.providerClientReadiness.providerClientsEnabled,
  providerClientsProvided: report.providerClientReadiness.providerClientsProvided,
  queueHandoff: report.providerClientReadiness.queueHandoff,
  redacted: true,
  registry: {
    clientCount: report.providerClientReadiness.registry.clients.length,
    providerGroups: report.providerClientReadiness.registry.providerGroups,
  },
  requiredConfigKeys: report.providerClientReadiness.requiredConfigKeys,
  status: report.providerClientReadiness.status,
  valid: report.providerClientReadiness.valid,
});

const createApiServiceMetadata = (
  report: BackendServiceReadinessReport,
) => ({
  activation: createHealthActivationMetadata(report.backendRuntimeBootstrap.activation),
  attachPointCount: report.apiService.attachPointCount,
  blockedDependencyIds: report.apiService.blockedDependencyIds,
  contractWriteEnabled: report.apiService.contractWriteEnabled,
  deferredDependencyIds: report.apiService.deferredDependencyIds,
  deployableBoundaryReady: report.apiService.deployableBoundaryReady,
  diagnosticCodes: report.apiService.diagnosticCodes,
  id: report.apiService.id,
  liveConnectionAttempted: report.apiService.liveConnectionAttempted,
  liveSideEffectsEnabled: report.apiService.liveSideEffectsEnabled,
  productionReady: report.apiService.productionReady,
  profileId: report.apiService.profileId,
  runtimeVersion: report.apiService.runtimeVersion,
  status: report.apiService.status,
  workerExecutionEnabled: report.apiService.workerExecutionEnabled,
});

const createHealthActivationMetadata = (
  activation: BackendRuntimeActivationContract,
) => ({
  deploymentHandoff: {
    contractsEndpoint: activation.deploymentHandoff.contractsEndpoint,
    healthEndpoint: activation.deploymentHandoff.healthEndpoint,
    runtimeTarget: activation.deploymentHandoff.runtimeTarget,
    shutdown: activation.deploymentHandoff.shutdown,
    smokeCommand: activation.deploymentHandoff.smokeCommand,
    startCommand: activation.deploymentHandoff.startCommand,
    tracePolicy: activation.deploymentHandoff.tracePolicy,
  },
  id: activation.id,
  liveSideEffectsEnabled: activation.liveSideEffectsEnabled,
  productionReady: activation.productionReady,
  runtimeTarget: activation.runtimeTarget,
});

const createContractAuthSessionMetadata = (
  report: BackendServiceReadinessReport,
) => ({
  agentCredentialBoundary: report.authSession.agentCredentialBoundary,
  authContracts: report.authSession.authContracts,
  deferredDependencyIds: report.authSession.deferredDependencyIds,
  foundation: report.authSessionFoundation,
  profileId: report.authSession.profileId,
  proofBoundary: report.authSession.proofBoundary,
  protectedRoutes: report.authSession.protectedRoutes.map((route) => ({
    enforcementStatus: route.enforcementStatus,
    productionDependencyIds: route.productionDependencyIds,
    proofRequired: route.proofRequired,
    requiredRoles: route.requiredRoles,
    routeGroup: route.routeGroup,
    routeId: route.routeId,
    routeSource: route.routeSource,
    sessionRequired: route.sessionRequired,
  })),
  rolePolicy: report.authSession.rolePolicy,
  sessionContract: report.authSession.sessionContract,
  status: report.authSession.status,
  validation: {
    diagnosticCodes: report.authSession.validation.issues.map((issue) => issue.code),
    issueCount: report.authSession.validation.issues.length,
    valid: report.authSession.validation.valid,
  },
});

const appendReportShapeSections = (sections: unknown, sectionIds: string[]) => {
  const currentSections = Array.isArray(sections)
    ? sections.filter((section): section is string => typeof section === "string")
    : [];

  return Array.from(new Set([...currentSections, ...sectionIds]));
};

const withBackendServiceReadinessMetadata = ({
  campaignDatabase,
  data,
  readiness,
  routeId,
  taskVerificationRuntime,
}: {
  campaignDatabase: CampaignDbRepositoryHealth;
  data: unknown;
  readiness: BackendServiceReadinessReport;
  routeId: ApiRuntimeRouteContract["id"];
  taskVerificationRuntime: TaskVerificationRuntimeReadiness;
}) => {
  if (!isRecord(data) || !isRecord(data.backendService)) {
    return data;
  }

  if (routeId === "runtime.health") {
    return {
      ...data,
      apiService: createApiServiceMetadata(readiness),
      campaignDatabase,
      taskVerificationRuntime,
      backendService: {
        ...data.backendService,
        activation: createHealthActivationMetadata(readiness.backendRuntimeBootstrap.activation),
        apiService: createApiServiceMetadata(readiness),
        authSession: createHealthAuthSessionMetadata(readiness),
        databaseAdapterRuntime: createDatabaseAdapterRuntimeMetadata(readiness),
        databaseReadiness: createHealthDatabaseReadinessMetadata(readiness),
        persistenceRuntime: createPersistenceRuntimeMetadata(readiness),
        providerClientReadiness: createProviderClientReadinessMetadata(readiness),
      },
    };
  }

  if (routeId === "runtime.contracts") {
    return {
      ...data,
      activation: readiness.backendRuntimeBootstrap.activation,
      campaignDatabase,
      taskVerificationRuntime,
      apiService: {
        ...createApiServiceMetadata(readiness),
        attachMap: readiness.apiService.blockedDependencyIds
          .map((id) => ({ id, status: "blocked" }))
          .concat(readiness.apiService.deferredDependencyIds.map((id) => ({ id, status: "deferred" }))),
      },
      backendService: {
        ...data.backendService,
        activation: readiness.backendRuntimeBootstrap.activation,
        apiService: createApiServiceMetadata(readiness),
        authSession: createContractAuthSessionMetadata(readiness),
        databaseAdapterRuntime: createDatabaseAdapterRuntimeContractMetadata(readiness),
        databaseReadiness: createContractDatabaseReadinessMetadata(readiness),
        persistenceRuntime: createPersistenceRuntimeMetadata(readiness),
        providerClientReadiness: createProviderClientReadinessMetadata(readiness),
        reportShape: isRecord(data.backendService.reportShape)
          ? {
            ...data.backendService.reportShape,
            sections: appendReportShapeSections(data.backendService.reportShape.sections, [
              "apiService",
              "authSession",
              "authSessionFoundation",
              "databaseAdapterRuntime",
              "databaseReadiness",
              "persistenceRuntime",
              "productionDbRuntime",
              "providerClientReadiness",
            ]),
          }
          : data.backendService.reportShape,
      },
    };
  }

  return data;
};

const findMatchingRoute = (
  matchers: readonly ApiRuntimeRouteMatcher[],
  method: string,
  pathname: string,
) => {
  const pathMatches = matchers
    .map((matcher) => ({ matcher, params: matcher.match(pathname) }))
    .filter((match): match is { matcher: ApiRuntimeRouteMatcher; params: Record<string, string> } =>
      Boolean(match.params),
    );

  const methodMatch = pathMatches.find(({ matcher }) => matcher.route.method === method);

  if (methodMatch) {
    return methodMatch;
  }

  if (pathMatches.length > 0) {
    throw methodNotAllowed(
      method,
      pathname,
      pathMatches.map(({ matcher }) => matcher.route.method),
    );
  }

  throw routeNotFound(method, pathname);
};

const findMatchingRequestRoute = (
  matchers: readonly ApiRuntimeRouteMatcher[],
  method: string,
  requestTarget: string,
  pathname: string,
  query: Record<string, string>,
) => {
  if (!pathname.startsWith("/api/admin/")) {
    return { ...findMatchingRoute(matchers, method, pathname), query };
  }

  const resolution = resolveAdminApiRoute(method, requestTarget);

  if (!resolution.matched) {
    if (resolution.reason === "method_not_allowed") {
      throw methodNotAllowed(method, pathname, resolution.allowedMethods);
    }
    if (
      resolution.reason === "duplicate_query_parameter"
      || resolution.reason === "query_not_allowed"
    ) {
      throw invalidRequest("query", "Admin route query parameters are invalid.");
    }

    throw routeNotFound(method, pathname);
  }

  const matcher = matchers.find(({ route }) => route.id === resolution.route.id);
  if (!matcher) {
    throw routeNotFound(method, pathname);
  }

  return {
    matcher,
    params: resolution.params,
    query: resolution.query,
  };
};

const createSafeRepository = (repository: CampaignOsRepository): CampaignOsRepository => {
  let initializePromise: Promise<void> | undefined;

  const wrap = async <TResult>(operation: string, run: () => Promise<TResult>) => {
    try {
      return await run();
    } catch {
      throw persistenceUnavailable(operation);
    }
  };

  const initialize = () => {
    initializePromise ??= wrap("initialize", () => repository.initialize());

    return initializePromise;
  };

  const afterInitialize = async <TResult>(operation: string, run: () => Promise<TResult>) => {
    await initialize();

    return wrap(operation, run);
  };

  return {
    initialize,
    record: (input) => afterInitialize("record", () => repository.record(input)),
    reset: repository.reset ? () => afterInitialize("reset", () => repository.reset?.() ?? Promise.resolve()) : undefined,
    snapshot: () => afterInitialize("snapshot", () => repository.snapshot()),
    health: () => afterInitialize("health", () => repository.health()),
  };
};

const createSafeCampaignDbRepository = (
  repository: CampaignDbRepository,
): CampaignDbRepository => {
  const safeDiagnosticCode = (code: string | undefined) =>
    code
    && code.length <= 100
    && /^[A-Z][A-Z0-9_]*$/.test(code)
      ? code
      : undefined;
  const safeDiagnosticField = (field: string | undefined, fallback: string) =>
    field
    && field.length <= 80
    && /^[A-Za-z][A-Za-z0-9.[\]_-]*$/.test(field)
      ? field
      : fallback;
  const unavailable = (operation: string, diagnosticCode?: string) => {
    const error = persistenceUnavailable(operation);
    const normalizedDiagnosticCode = safeDiagnosticCode(diagnosticCode);

    return normalizedDiagnosticCode
      ? new ApiRuntimeError({
        ...error.body,
        details: {
          ...error.body.details,
          diagnosticCode: normalizedDiagnosticCode,
          field: "campaignDb",
        },
      })
      : error;
  };
  const wrap = async <TResult>(operation: string, run: () => Promise<TResult>) => {
    try {
      return await run();
    } catch (error) {
      if (error instanceof CampaignDbRepositoryError) {
        const firstDiagnostic = error.diagnostics[0];

        if (operation === "campaignDb.generateI18nDraft") {
          if (
            firstDiagnostic
            && [
              "CAMPAIGN_DB_I18N_CAMPAIGN_NOT_FOUND",
              "CAMPAIGN_DB_I18N_REQUIRED_FIELD_MISSING",
              "CAMPAIGN_DB_I18N_UNSUPPORTED_SOURCE_LOCALE",
              "CAMPAIGN_DB_I18N_UNSUPPORTED_TARGET_LOCALE",
            ].includes(firstDiagnostic.code)
          ) {
            throw error;
          }

          throw unavailable(operation, firstDiagnostic?.code);
        }

        if (
          firstDiagnostic?.code !== "CAMPAIGN_DB_PRODUCTION_DEFERRED"
          && !firstDiagnostic?.code.startsWith("CAMPAIGN_DURABLE_STORE_")
          && !firstDiagnostic?.code.startsWith("POSTGRES_CAMPAIGN_STORE_")
        ) {
          throw invalidRequest(
            safeDiagnosticField(firstDiagnostic?.field, "campaignDb"),
            safeDiagnosticCode(firstDiagnostic?.code)
              ? `Campaign DB repository rejected the request (${safeDiagnosticCode(firstDiagnostic?.code)}).`
              : "Campaign DB repository rejected the request.",
          );
        }

        throw unavailable(operation, firstDiagnostic?.code);
      }

      if (error instanceof PostgresCampaignStoreError) {
        throw unavailable(operation, error.code);
      }

      throw unavailable(operation);
    }
  };

  return {
    addTaskDraft: (input, context) =>
      wrap("campaignDb.addTaskDraft", () => repository.addTaskDraft(input, context)),
    bindReferral: (input, context) =>
      wrap("campaignDb.bindReferral", () => repository.bindReferral!(input, context)),
    checkEligibility: (input, context) =>
      wrap("campaignDb.checkEligibility", () => repository.checkEligibility!(input, context)),
    close: () => wrap(
      "campaignDb.close",
      () => repository.close?.() ?? Promise.resolve(),
    ),
    createDraft: (input, context) =>
      wrap("campaignDb.createDraft", () => repository.createDraft(input, context)),
    getById: (campaignId, context) =>
      wrap("campaignDb.getById", () => repository.getById(campaignId, context)),
    getEvents: () => repository.getEvents(),
    generateI18nDraft: (input, context) =>
      wrap("campaignDb.generateI18nDraft", () => repository.generateI18nDraft!(input, context)),
    getExportReadiness: (input, context) =>
      wrap("campaignDb.getExportReadiness", () => repository.getExportReadiness!(input, context)),
    getParticipant: (campaignId, walletAddress, context) =>
      wrap(
        "campaignDb.getParticipant",
        () => repository.getParticipant!(campaignId, walletAddress, context),
      ),
    getParticipantJourney: (input, context) =>
      wrap(
        "campaignDb.getParticipantJourney",
        () => repository.getParticipantJourney!(input, context),
      ),
    getReferralBinding: (campaignId, inviteeWalletAddress, context) =>
      wrap(
        "campaignDb.getReferralBinding",
        () => repository.getReferralBinding!(campaignId, inviteeWalletAddress, context),
      ),
    health: (context) => wrap("campaignDb.health", () => repository.health(context)),
    list: (filter, context) =>
      wrap("campaignDb.list", () => repository.list(filter, context)),
    listTaskEvidence: (filter, context) =>
      wrap("campaignDb.listTaskEvidence", () => repository.listTaskEvidence!(filter, context)),
    listParticipants: (filter, context) =>
      wrap("campaignDb.listParticipants", () => repository.listParticipants!(filter, context)),
    listReferralBindings: (filter, context) =>
      wrap(
        "campaignDb.listReferralBindings",
        () => repository.listReferralBindings!(filter, context),
      ),
    markReferralQualified: (input, context) =>
      wrap(
        "campaignDb.markReferralQualified",
        () => repository.markReferralQualified!(input, context),
      ),
    projectExport: (input, context) =>
      wrap("campaignDb.projectExport", () => repository.projectExport!(input, context)),
    reset: () => wrap("campaignDb.reset", () => repository.reset()),
    upsertTaskCompletion: (input, context) =>
      wrap("campaignDb.upsertTaskCompletion", () => repository.upsertTaskCompletion!(input, context)),
    upsertParticipant: (input, context) =>
      wrap("campaignDb.upsertParticipant", () => repository.upsertParticipant!(input, context)),
    upsertTaskEvidence: (input, context) =>
      wrap("campaignDb.upsertTaskEvidence", () => repository.upsertTaskEvidence!(input, context)),
    upsertTaskVerification: (input, context) =>
      wrap("campaignDb.upsertTaskVerification", () => repository.upsertTaskVerification!(input, context)),
  };
};

const createSafeWalletSessionRepository = (
  repository: WalletSessionRepository,
  onSessionActivated?: (sessionId: string) => void,
): WalletSessionRepository => {
  const wrap = async <TResult>(operation: string, run: () => Promise<TResult>) => {
    try {
      return await run();
    } catch (error) {
      if (error instanceof WalletSessionRepositoryError) {
        const firstDiagnostic = error.diagnostics[0];

        if (firstDiagnostic?.code === "WALLET_SESSION_REQUIRED_FIELD_MISSING") {
          throw invalidRequest(
            firstDiagnostic.field.length <= 80
              && /^[A-Za-z][A-Za-z0-9.[\]_-]*$/.test(firstDiagnostic.field)
              ? firstDiagnostic.field
              : "walletSession",
            "Wallet session repository rejected a required field.",
          );
        }
      }

      throw persistenceUnavailable(operation);
    }
  };

  return {
    close: () => wrap("walletSessionRepository.close", () => repository.close()),
    getBySessionId: (sessionId, context) =>
      wrap("walletSessionRepository.getBySessionId", () => repository.getBySessionId(sessionId, context)),
    health: () => wrap("walletSessionRepository.health", () => repository.health()),
    list: (filter, context) =>
      wrap("walletSessionRepository.list", () => repository.list(filter, context)),
    reset: () => wrap("walletSessionRepository.reset", () => repository.reset()),
    upsertSession: async (session, context) => {
      const result = await wrap(
        "walletSessionRepository.upsertSession",
        () => repository.upsertSession(session, context),
      );
      onSessionActivated?.(result.record.sessionId);

      return result;
    },
  };
};

export const createCampaignOsApiRuntime = ({
  adminOperatorMembershipRegistry,
  adminReviewConfig,
  adminReviewConfigOptions,
  adminReviewExpectedMigration,
  adminReviewPoolFactory = createPgAdminReviewPool,
  adminReviewStore,
  adminReviewStoreOwnership = "runtime",
  backendServiceReadiness,
  campaignDbConfig,
  campaignDbPoolFactory = createPgCampaignPool,
  campaignDbRepository,
  campaignDbRepositoryOptions,
  closeDeadlineMs,
  deprecatedNonLivePreviewAuthority,
  exportArtifactRegistry = createExportArtifactRegistry(),
  logger = console,
  participantPreviewConfigOptions,
  repository,
  runtimeConfig,
  runtimeConfigOptions,
  service = createCampaignOsLocalService(),
  taskVerificationConfig,
  taskVerificationConfigOptions,
  taskVerificationProviderRuntime,
  taskVerificationRuleResolver,
  taskVerificationRuntime,
  taskVerificationRuntimeFactory,
  taskVerificationTransport,
  version,
  walletAuthenticationHttpController,
  walletAuthenticationRuntime,
  walletAuthenticationRuntimeOwnership = "runtime",
  walletSessionActivationPolicy = "runtime_issued_only",
  walletSessionRepository,
  walletSessionRepositoryOptions,
}: CreateCampaignOsApiRuntimeOptions = {}): CampaignOsApiRuntime => {
  const runtimeCloseDeadlineMs = resolveCloseDeadlineMs(closeDeadlineMs);
  const deprecatedNonLivePreviewAuthorityEnabled =
    !walletAuthenticationRuntime
    && deprecatedNonLivePreviewAuthority === deprecatedNonLivePreviewAuthorityOption;
  let configError: unknown;
  const resolvedConfig = (() => {
    if (runtimeConfig) {
      return runtimeConfig;
    }

    try {
      return resolveCampaignOsRuntimeConfig({
        ...runtimeConfigOptions,
        version,
      });
    } catch (error) {
      configError = error;

      return resolveCampaignOsRuntimeConfig({
        persistence: {
          mode: "memory",
        },
        version,
      });
    }
  })();
  const resolvedCampaignDbConfig = (() => {
    if (campaignDbConfig) {
      return campaignDbConfig;
    }

    try {
      return resolveCampaignOsCampaignDbConfig({
        env: runtimeConfigOptions?.env,
      });
    } catch (error) {
      configError ??= error;

      return resolveCampaignOsCampaignDbConfig({ env: {} });
    }
  })();
  const resolveAdminReviewConfig = () => adminReviewConfig
    ?? resolveCampaignOsAdminReviewConfig({
      ...adminReviewConfigOptions,
      env: adminReviewConfigOptions?.env ?? runtimeConfigOptions?.env,
    });
  let adminReviewConfigError: unknown;
  const initialAdminReviewConfig = (() => {
    try {
      return resolveAdminReviewConfig();
    } catch (error) {
      adminReviewConfigError = error;

      return Object.freeze({
        enabled: false,
        memberships: Object.freeze([]),
        sourceRevision: "admin-membership-config-invalid",
      }) satisfies CampaignOsAdminReviewConfig;
    }
  })();
  const safeRepository = createSafeRepository(
    repository ?? createCampaignOsRepository(resolvedConfig.persistence),
  );
  const composedCampaignDbRepository = campaignDbRepository ?? (() => {
    if (resolvedCampaignDbConfig.mode !== "postgres") {
      return createCampaignDbRepository(campaignDbRepositoryOptions);
    }

    const pool = campaignDbPoolFactory(resolvedCampaignDbConfig.pool);
    pool.onError(() => {
      if (logger) {
        logger.error(
          `[campaign-os-api-runtime] campaign_db_pool_error code=CAMPAIGN_DB_POOL_BACKGROUND_ERROR traceId=${randomUUID()}`,
        );
      }
    });
    const durableStore = createPostgresCampaignDurableStore({
      boundedListLimit: campaignDbRepositoryOptions?.boundedListLimit,
      ownsPool: true,
      pool,
    });

    return createCampaignDbRepository({
      ...campaignDbRepositoryOptions,
      durableStore,
      mode: "postgres",
      now: campaignDbRepositoryOptions?.now ?? (() => new Date().toISOString()),
    });
  })();
  const safeCampaignDbRepository = createSafeCampaignDbRepository(
    composedCampaignDbRepository,
  );
  const taskVerificationCompositionProvided = Boolean(
    taskVerificationRuntime
    || taskVerificationRuntimeFactory
    || taskVerificationTransport,
  );
  const resolvedTaskVerificationConfig = taskVerificationConfig
    ?? resolveTaskVerificationConfig({
      ...(taskVerificationConfigOptions ?? {
        env: runtimeConfigOptions?.env ?? {},
        environment: "local",
      }),
      providerHttpTransportProvided: taskVerificationCompositionProvided,
    });
  const taskVerificationAuthorizationScope =
    new AsyncLocalStorage<TaskVerificationAuthorizationScope>();
  const fencedTaskVerificationAttemptStore = walletAuthenticationRuntime
    && composedCampaignDbRepository.taskVerificationAttempts
      ? createAuthorizationFencedTaskVerificationAttemptStore(
        composedCampaignDbRepository.taskVerificationAttempts,
        walletAuthenticationRuntime,
        taskVerificationAuthorizationScope,
      )
      : composedCampaignDbRepository.taskVerificationAttempts;
  const composedTaskVerificationRuntimeFactory = taskVerificationRuntimeFactory
    ?? (
      !taskVerificationRuntime
      && taskVerificationTransport
      && fencedTaskVerificationAttemptStore
        ? (attemptStore = fencedTaskVerificationAttemptStore) => createTaskVerificationRuntime({
          attemptStore,
          config: resolvedTaskVerificationConfig,
          finalizationWriteFactory: createTaskVerificationFinalizationWrite,
          ...(taskVerificationProviderRuntime
            ? { providerHttpRuntime: taskVerificationProviderRuntime }
            : {}),
          transport: taskVerificationTransport,
        })
        : undefined
    );
  const fenceAwareTaskVerificationComposition = Boolean(
    walletAuthenticationRuntime
    && !taskVerificationRuntime
    && !taskVerificationRuntimeFactory
    && taskVerificationTransport
    && fencedTaskVerificationAttemptStore,
  );
  const protectedTaskVerificationRuntime = createProtectedTaskVerificationRuntime({
    authorizationRuntime: walletAuthenticationRuntime,
    authorizationScope: taskVerificationAuthorizationScope,
    config: resolvedTaskVerificationConfig,
    fenceAwareRuntimeComposition: fenceAwareTaskVerificationComposition,
    fencedAttemptStore: fencedTaskVerificationAttemptStore,
    repository: composedCampaignDbRepository,
    runtime: taskVerificationRuntime,
    runtimeFactory: composedTaskVerificationRuntimeFactory,
    safeRepository: safeCampaignDbRepository,
  });
  const deprecatedPreviewActiveWalletSessionIds = new Set<string>();
  const composedWalletSessionRepository = walletSessionRepository
    ?? createWalletSessionRepository(walletSessionRepositoryOptions);
  const safeWalletSessionRepository = createSafeWalletSessionRepository(
    composedWalletSessionRepository,
    deprecatedNonLivePreviewAuthorityEnabled
      ? (sessionId) => deprecatedPreviewActiveWalletSessionIds.add(sessionId)
      : undefined,
  );
  let adminReviewInitializationError: unknown;
  let adminReviewPartialCleanup: Promise<void> | undefined;
  let composedAdminReviewPool: PostgresAdminReviewStorePool | undefined;
  const composedAdminReviewStore = (() => {
    if (!initialAdminReviewConfig.enabled || adminReviewConfigError) {
      return undefined;
    }

    if (adminReviewStore) {
      return adminReviewStore;
    }

    if (
      resolvedCampaignDbConfig.mode !== "postgres"
      || configError instanceof CampaignOsCampaignDbConfigError
    ) {
      return undefined;
    }

    try {
      const expectedMigration = adminReviewExpectedMigration
        ?? resolveAdminReviewExpectedMigration();
      composedAdminReviewPool = adminReviewPoolFactory(resolvedCampaignDbConfig.pool);
      const onError = (composedAdminReviewPool as PostgresAdminReviewStorePool & {
        onError?: (listener: (error: unknown) => void) => void;
      }).onError;

      onError?.(() => {
        if (logger) {
          logger.error(
            `[campaign-os-api-runtime] admin_review_pool_error code=ADMIN_REVIEW_POOL_BACKGROUND_ERROR traceId=${randomUUID()}`,
          );
        }
      });

      return createPostgresAdminReviewStore({
        boundedListLimit: ADMIN_REVIEW_MAX_LIST_LIMIT,
        expectedMigration,
        ownsPool: true,
        pool: composedAdminReviewPool,
      });
    } catch (error) {
      adminReviewInitializationError = error;
      if (composedAdminReviewPool) {
        adminReviewPartialCleanup = composedAdminReviewPool.end().catch(() => undefined);
      }

      return undefined;
    }
  })();
  const activeAdminReviewStore = composedAdminReviewStore;
  const handlers = createApiRuntimeHandlers();
  const matchers = apiRuntimeContractRoutes.map(compileRouteMatcher);
  const runtimeVersion = version ?? resolvedConfig.version;
  const participantPreviewConfig = createParticipantPreviewConfigFactory(
    participantPreviewConfigOptions,
    runtimeConfigOptions,
  );
  const getBackendServiceReadiness =
    backendServiceReadiness
    ?? createBackendServiceReadinessFactory({
      resolvedConfig,
      runtimeConfigOptions,
      version: runtimeVersion,
    });
  const shouldAttachDatabaseReadiness = (routeId: ApiRuntimeRouteContract["id"]) =>
    routeId === "runtime.health" || routeId === "runtime.contracts";
  const activeService = resolvedCampaignDbConfig.mode === "postgres"
    ? createCampaignDbAuthoritativeService(service)
    : service;
  let acceptingRequests = true;
  let activeRequestCount = 0;
  const drainWaiters = new Set<() => void>();
  const waitForRequestDrain = () => activeRequestCount === 0
    ? Promise.resolve()
    : new Promise<void>((resolveDrain) => drainWaiters.add(resolveDrain));
  const releaseRequest = () => {
    activeRequestCount = Math.max(0, activeRequestCount - 1);
    if (activeRequestCount === 0) {
      for (const resolveDrain of drainWaiters) {
        resolveDrain();
      }
      drainWaiters.clear();
    }
  };
  const resourceClosers: Array<{
    close: () => Promise<void>;
    closed: boolean;
    key: unknown;
    pending?: Promise<void>;
  }> = [];
  const registeredResourceKeys = new Set<unknown>();
  const registerResourceCloser = (key: unknown, closeResource: () => Promise<void>) => {
    if (registeredResourceKeys.has(key)) {
      return;
    }

    registeredResourceKeys.add(key);
    resourceClosers.push({ close: closeResource, closed: false, key });
  };

  if (walletAuthenticationRuntime && walletAuthenticationRuntimeOwnership === "runtime") {
    registerResourceCloser(walletAuthenticationRuntime, async () => {
      const result = await walletAuthenticationRuntime.stop(
        `wallet-auth-runtime-close-${randomUUID()}`,
      );
      if (result.status !== "drained") {
        throw new Error("Wallet authentication runtime did not drain cleanly.");
      }
    });
  }
  if (composedCampaignDbRepository.close) {
    registerResourceCloser(
      composedCampaignDbRepository,
      () => safeCampaignDbRepository.close?.() ?? Promise.resolve(),
    );
  }
  if (composedAdminReviewStore && adminReviewStoreOwnership === "runtime") {
    registerResourceCloser(
      composedAdminReviewStore,
      () => composedAdminReviewStore.close({
        traceId: `admin-runtime-close-${randomUUID()}`,
      }),
    );
  }
  if (adminReviewPartialCleanup) {
    registerResourceCloser(adminReviewPartialCleanup, () => adminReviewPartialCleanup!);
  }
  registerResourceCloser(
    composedWalletSessionRepository,
    () => safeWalletSessionRepository.close(),
  );

  const closeResourceOnce = (
    resource: (typeof resourceClosers)[number],
  ): Promise<void> => {
    if (resource.closed) {
      return Promise.resolve();
    }
    if (resource.pending) {
      return resource.pending;
    }

    let closeAttempt: Promise<void>;
    try {
      closeAttempt = Promise.resolve(resource.close());
    } catch (error) {
      closeAttempt = Promise.reject(error);
    }

    const pending = closeAttempt.then(
      () => {
        resource.closed = true;
        resource.pending = undefined;
      },
      (error: unknown) => {
        resource.pending = undefined;
        throw error;
      },
    );
    resource.pending = pending;

    return pending;
  };
  const closeOwnedResources = async (deadlineAt: number): Promise<void> => {
    const failures: unknown[] = [];

    for (const resource of resourceClosers) {
      if (resource.closed) {
        continue;
      }
      if (Date.now() >= deadlineAt) {
        throw closeDeadlineExceeded("resource_close", runtimeCloseDeadlineMs);
      }

      try {
        await waitForClosePhase(
          closeResourceOnce(resource),
          deadlineAt,
          "resource_close",
          runtimeCloseDeadlineMs,
        );
      } catch (error) {
        if (
          error instanceof ApiRuntimeError
          && error.body.details?.diagnosticCode === "API_RUNTIME_CLOSE_DEADLINE_EXCEEDED"
        ) {
          throw error;
        }
        failures.push(error);
      }
    }

    if (failures.length === 1 && failures[0] instanceof ApiRuntimeError) {
      throw failures[0];
    }
    if (failures.length > 0) {
      throw new ApiRuntimeResourceCloseError(failures);
    }
  };
  let providerDrained = false;
  let closePromise: Promise<void> | undefined;
  const close = (): Promise<void> => {
    acceptingRequests = false;
    if (closePromise) {
      return closePromise;
    }

    let operation!: Promise<void>;
    operation = (async () => {
      const deadlineAt = Date.now() + runtimeCloseDeadlineMs;

      try {
        if (!providerDrained) {
          let providerResult: TaskVerificationRuntimeCloseResult;
          try {
            providerResult = await waitForClosePhase(
              protectedTaskVerificationRuntime.close(),
              deadlineAt,
              "provider_drain",
              runtimeCloseDeadlineMs,
            );
          } catch (error) {
            if (error instanceof ApiRuntimeError) {
              throw error;
            }
            throw new ApiRuntimeResourceCloseError([error]);
          }

          if (providerResult.status !== "drained" || providerResult.activeCallCount !== 0) {
            throw closeDeadlineExceeded("provider_drain", runtimeCloseDeadlineMs);
          }
          providerDrained = true;
        }

        await waitForClosePhase(
          waitForRequestDrain(),
          deadlineAt,
          "request_drain",
          runtimeCloseDeadlineMs,
        );
        await closeOwnedResources(deadlineAt);
        deprecatedPreviewActiveWalletSessionIds?.clear();
      } catch (error) {
        if (closePromise === operation) {
          closePromise = undefined;
        }
        throw error;
      }
    })();
    closePromise = operation;

    return closePromise;
  };

  return {
    close,
    handle: async (request) => {
      const traceId = createTraceId(request.headers);
      const adminRequest = isAdminRequestTarget(request.path);

      if (!acceptingRequests) {
        const runtimeError = persistenceUnavailable("runtime.close").body;

        return {
          body: adminRequest
            ? createAdminFailureEnvelope(runtimeError, traceId)
            : createFailureEnvelope({
              error: runtimeError,
              routeCount: apiRuntimeContractRoutes.length,
              traceId,
              version: runtimeVersion,
            }),
          headers: responseHeaders(traceId),
          status: runtimeError.status,
        };
      }

      activeRequestCount += 1;

      try {
        const method = normalizeMethod(request.method);
        const walletAuthenticationResponse = await walletAuthenticationHttpController?.handle({
          ...(request.body === undefined ? {} : { body: request.body }),
          ...(request.headers === undefined ? {} : { headers: request.headers }),
          method,
          path: request.path,
        });
        if (walletAuthenticationResponse) {
          return {
            body: walletAuthenticationResponse.body as
              | AdminApiFailureEnvelope
              | AdminApiSuccessEnvelope<unknown>,
            headers: { ...walletAuthenticationResponse.headers },
            status: walletAuthenticationResponse.status,
          };
        }
        const { pathname, query: parsedQuery } = parseRequestTarget(request.path);
        const { matcher, params, query } = findMatchingRequestRoute(
          matchers,
          method,
          request.path,
          pathname,
          parsedQuery,
        );
        const adminPolicy = getAdminOperatorRoutePolicy(matcher.route.id);
        let body: unknown;
        let authDecision: AuthEnforcementDecision | undefined;
        let liveAdminOperator: AuthorizedAdminOperatorContext | undefined;
        let liveAuthorization: TrustedLiveAuthorizationContext | undefined;
        let liveAuthorizationDecision: TrustedLiveAuthorizationDecision | undefined;
        let membershipRegistry: AdminOperatorMembershipRegistry | undefined;
        const requiresProtectedAuthorization = Boolean(
          adminPolicy || shouldEvaluateLocalAuth(matcher.route.id),
        );

        if (
          requiresProtectedAuthorization
          && !walletAuthenticationRuntime
          && !deprecatedNonLivePreviewAuthorityEnabled
        ) {
          throw authSessionRequired({
            diagnosticCode: "DURABLE_WALLET_AUTHORITY_REQUIRED",
            field: "authorization",
          });
        }

        if (adminPolicy) {
          let currentAdminReviewConfig: CampaignOsAdminReviewConfig;

          try {
            currentAdminReviewConfig = resolveAdminReviewConfig();
          } catch (error) {
            const diagnosticCode = error instanceof CampaignOsAdminReviewConfigError
              ? error.code
              : "ADMIN_REVIEW_CONFIG_INVALID";
            throw adminRuntimeUnavailable(diagnosticCode);
          }

          if (!currentAdminReviewConfig.enabled) {
            throw routeNotFound(method, pathname);
          }
          if (configError instanceof CampaignOsCampaignDbConfigError) {
            throw adminRuntimeUnavailable(configError.code);
          }
          if (resolvedCampaignDbConfig.mode !== "postgres") {
            throw adminRuntimeUnavailable("ADMIN_REVIEW_POSTGRES_REQUIRED");
          }
          if (adminReviewConfigError) {
            throw adminRuntimeUnavailable("ADMIN_REVIEW_CONFIG_INVALID");
          }
          if (adminReviewInitializationError || !activeAdminReviewStore) {
            throw adminRuntimeUnavailable("ADMIN_REVIEW_STORE_UNAVAILABLE");
          }

          membershipRegistry = adminOperatorMembershipRegistry
            ?? createAdminOperatorMembershipRegistry(currentAdminReviewConfig);
        } else {
          if (configError) {
            throw createRuntimeConfigBlockedError(configError);
          }
        }
        body = parseBody(request, method, matcher.route.id === "tasks.verify");

        if (walletAuthenticationRuntime && requiresProtectedAuthorization) {
          let campaignId = params.campaignId;
          let taskCampaignId: string | undefined;
          if (matcher.route.id === "tasks.verify") {
            campaignId = exactTaskVerificationCampaignId(body);
          }

          liveAuthorization = await resolveLiveAuthorization({
            request,
            runtime: walletAuthenticationRuntime,
            traceId,
          });

          if (matcher.route.id === "tasks.verify" && campaignId) {
            const campaign = await safeCampaignDbRepository.getById(campaignId, { traceId });
            taskCampaignId = campaign?.tasks.find((task) => task.id === params.taskId)?.campaignId;
          }

          let ownerAddress = ownerAddressFromBody(body);
          if (campaignOwnerRouteIds.has(matcher.route.id)) {
            ownerAddress = await ownerAddressFromCampaignDb({
              campaignDbRepository: safeCampaignDbRepository,
              campaignId: params.campaignId,
              traceId,
            });
          } else if (matcher.route.id === "campaigns.owner.list") {
            ownerAddress = liveAuthorization.subject.walletAddress;
          }

          liveAuthorizationDecision = evaluateTrustedLiveAuthorization({
            ...(membershipRegistry ? { adminMembershipRegistry: membershipRegistry } : {}),
            ...(campaignId ? { campaignId } : {}),
            context: liveAuthorization,
            currentMembershipRevision: membershipRegistry
              ? membershipRegistry.health().sourceRevision
              : liveAuthorization.membershipRevision,
            headers: request.headers,
            now: new Date(),
            ...(ownerAddress ? { ownerAddress } : {}),
            routeId: matcher.route.id,
            ...(taskCampaignId ? { taskCampaignId } : {}),
            traceId,
          });
          if (!liveAuthorizationDecision.allowed) {
            throw liveAuthErrorFromDecision(liveAuthorizationDecision);
          }

          if (adminPolicy && membershipRegistry) {
            liveAdminOperator = createLiveAdminOperatorContext({
              campaignId: params.campaignId,
              context: liveAuthorization,
              decision: liveAuthorizationDecision,
              registry: membershipRegistry,
            });
            if (!liveAdminOperator) {
              throw liveAuthRuntimeError(403, "LIVE_AUTH_MEMBERSHIP_FORBIDDEN");
            }
          }
        } else if (
          deprecatedNonLivePreviewAuthorityEnabled
          && adminPolicy
          && membershipRegistry
        ) {
          authDecision = await evaluateRuntimeAdminAuth({
            activeWalletSessionIds: deprecatedPreviewActiveWalletSessionIds,
            campaignId: params.campaignId,
            headers: request.headers,
            membershipRegistry,
            routeId: matcher.route.id,
            traceId,
            walletSessionActivationPolicy,
            walletSessionRepository: safeWalletSessionRepository,
          });

          if (!authDecision.allowed) {
            throw authErrorFromDecision(authDecision);
          }
        } else if (
          deprecatedNonLivePreviewAuthorityEnabled
          && shouldEvaluateLocalAuth(matcher.route.id)
        ) {
          authDecision = await evaluateRuntimeIssuedAuth({
            activeWalletSessionIds: deprecatedPreviewActiveWalletSessionIds,
            compatibilitySubject: participantCompatibilitySubjectFromRequest(
              matcher.route.id,
              body,
              query,
            ),
            headers: request.headers,
            ownerAddress: ownerAddressFromBody(body),
            routeId: matcher.route.id,
            traceId,
            walletSessionActivationPolicy,
            walletSessionRepository: safeWalletSessionRepository,
          });

          if (!authDecision.allowed) {
            throw authErrorFromDecision(authDecision);
          }

          if (campaignOwnerRouteIds.has(matcher.route.id)) {
            const ownerAddress = await ownerAddressFromCampaignDb({
              campaignDbRepository: safeCampaignDbRepository,
              campaignId: params.campaignId,
              traceId,
            });

            if (ownerAddress) {
              authDecision = await evaluateRuntimeIssuedAuth({
                activeWalletSessionIds: deprecatedPreviewActiveWalletSessionIds,
                headers: request.headers,
                ownerAddress,
                routeId: matcher.route.id,
                traceId,
                walletSessionActivationPolicy,
                walletSessionRepository: safeWalletSessionRepository,
              });

              if (!authDecision.allowed) {
                throw authErrorFromDecision(authDecision);
              }
            }
          }
        }

        const handler = handlers[matcher.route.id];
        let requestReadiness: BackendServiceReadinessReport | undefined;
        const requestBackendServiceReadiness = () => {
          requestReadiness ??= getBackendServiceReadiness();

          return requestReadiness;
        };
        const handlerResult = await handler({
          backendServiceReadiness: requestBackendServiceReadiness,
          body,
          campaignDbRepository: safeCampaignDbRepository,
          exportArtifactRegistry,
          headers: request.headers ?? {},
          params,
          participantPreviewConfig,
          repository: safeRepository,
          query,
          route: matcher.route,
          service: activeService,
          taskVerificationRuntime: protectedTaskVerificationRuntime,
          traceId,
          version: runtimeVersion,
          walletSessionRepository: safeWalletSessionRepository,
          ...(taskVerificationRuleResolver ? { taskVerificationRuleResolver } : {}),
          ...(authDecision?.adminOperator
            ? { adminOperator: authDecision.adminOperator }
            : liveAdminOperator
              ? { adminOperator: liveAdminOperator }
            : {}),
          ...(activeAdminReviewStore
            ? { adminReviewStore: activeAdminReviewStore }
            : {}),
          auth: authDecision,
          ...(liveAuthorization ? { liveAuthorization } : {}),
          ...(liveAuthorizationDecision ? { liveAuthorizationDecision } : {}),
        });
        const transport = isHandlerTransportResult(handlerResult)
          ? handlerResult
          : undefined;
        const data = transport?.data ?? handlerResult;
        const attachDatabaseReadiness = shouldAttachDatabaseReadiness(matcher.route.id);
        const campaignDatabase = attachDatabaseReadiness
          ? await safeCampaignDbRepository.health({ traceId })
          : undefined;
        const responseData = attachDatabaseReadiness && campaignDatabase
          ? withBackendServiceReadinessMetadata({
            campaignDatabase,
            data,
            readiness: requestBackendServiceReadiness(),
            routeId: matcher.route.id,
            taskVerificationRuntime: protectedTaskVerificationRuntime.readiness(
              campaignDatabase,
            ),
          })
          : data;

        return {
          body: adminPolicy
            ? createAdminSuccessEnvelope(responseData, traceId)
            : createSuccessEnvelope({
              data: responseData,
              routeCount: apiRuntimeContractRoutes.length,
              traceId,
              version: runtimeVersion,
            }),
          headers: {
            ...responseHeaders(traceId),
            ...transport?.headers,
          },
          ...(transport?.rawBody === undefined ? {} : { rawBody: transport.rawBody }),
          status: transport?.status ?? 200,
        };
      } catch (error) {
        const runtimeError = toApiRuntimeErrorBody(error);

        return {
          body: adminRequest
            ? createAdminFailureEnvelope(runtimeError, traceId)
            : createFailureEnvelope({
              error: runtimeError,
              routeCount: apiRuntimeContractRoutes.length,
              traceId,
              version: runtimeVersion,
            }),
          headers: responseHeaders(traceId),
          status: runtimeError.status,
        };
      } finally {
        releaseRequest();
      }
    },
  };
};
