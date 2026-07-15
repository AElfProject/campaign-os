import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { createCampaignOsLocalService, type CampaignOsLocalService } from "../domain/campaignService";
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
  getAdminOperatorRoutePolicy,
  type AuthorizedAdminOperatorContext,
  type AuthEnforcementDecision,
  type ParticipantCompatibilitySubject,
} from "./authEnforcement";
import { getProtectedRouteAuth } from "./authSession";
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
  createPostgresAdminReviewStore,
  type PostgresAdminReviewStorePool,
} from "./postgresAdminReviewStore";
import {
  createExportArtifactRegistry,
  type ExportArtifactRegistry,
} from "./exportArtifactRegistry";

export type ApiRuntimeHeaders = Record<string, string | readonly string[] | undefined>;

export interface ApiRuntimeRequest {
  body?: string | unknown;
  headers?: ApiRuntimeHeaders;
  method: string;
  path: string;
}

export interface ApiRuntimeResponse<TPayload = unknown> {
  body: ApiRuntimeEnvelope<TPayload>;
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
  traceId: string;
  version: string;
  walletSessionRepository: WalletSessionRepository;
  adminOperator?: AuthorizedAdminOperatorContext;
  adminReviewStore?: AdminReviewStore;
  auth?: AuthEnforcementDecision;
}

export type ApiRuntimeHandler = (context: ApiRuntimeHandlerContext) => unknown | Promise<unknown>;
export type BackendServiceReadinessFactory = () => BackendServiceReadinessReport;
export type ParticipantPreviewConfigFactory = () => CampaignOsParticipantPreviewConfig;

export interface CampaignOsApiRuntime {
  close(): Promise<void>;
  handle(request: ApiRuntimeRequest): Promise<ApiRuntimeResponse>;
}

class ApiRuntimeResourceCloseError extends Error {
  readonly failureCount: number;

  constructor(failures: readonly unknown[]) {
    super("Campaign OS API runtime resource shutdown failed.");
    this.name = "ApiRuntimeResourceCloseError";
    this.failureCount = failures.length;
  }
}

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
  exportArtifactRegistry?: ExportArtifactRegistry;
  logger?: Pick<Console, "error"> | false;
  participantPreviewConfigOptions?: CampaignOsParticipantPreviewConfigOptions;
  repository?: CampaignOsRepository;
  runtimeConfig?: CampaignOsRuntimeConfig;
  runtimeConfigOptions?: CampaignOsRuntimeConfigOptions;
  service?: CampaignOsLocalService;
  version?: string;
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

const parseBody = (request: ApiRuntimeRequest, method: string) => {
  if (method !== "POST") {
    return undefined;
  }

  if (request.body === undefined || request.body === "") {
    return {};
  }

  if (typeof request.body !== "string") {
    return request.body;
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
  "tasks.verify",
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
}: {
  campaignDatabase: CampaignDbRepositoryHealth;
  data: unknown;
  readiness: BackendServiceReadinessReport;
  routeId: ApiRuntimeRouteContract["id"];
}) => {
  if (!isRecord(data) || !isRecord(data.backendService)) {
    return data;
  }

  if (routeId === "runtime.health") {
    return {
      ...data,
      apiService: createApiServiceMetadata(readiness),
      campaignDatabase,
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
  exportArtifactRegistry = createExportArtifactRegistry(),
  logger = console,
  participantPreviewConfigOptions,
  repository,
  runtimeConfig,
  runtimeConfigOptions,
  service = createCampaignOsLocalService(),
  version,
  walletSessionActivationPolicy = "runtime_issued_only",
  walletSessionRepository,
  walletSessionRepositoryOptions,
}: CreateCampaignOsApiRuntimeOptions = {}): CampaignOsApiRuntime => {
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
  const activeWalletSessionIds = new Set<string>();
  const safeWalletSessionRepository = createSafeWalletSessionRepository(
    walletSessionRepository ?? createWalletSessionRepository(walletSessionRepositoryOptions),
    (sessionId) => activeWalletSessionIds.add(sessionId),
  );
  let adminReviewInitializationError: unknown;
  let adminReviewPartialCleanup: Promise<void> | undefined;
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

    let pool: PostgresAdminReviewStorePool | undefined;

    try {
      const expectedMigration = adminReviewExpectedMigration
        ?? resolveAdminReviewExpectedMigration();
      pool = adminReviewPoolFactory(resolvedCampaignDbConfig.pool);
      const onError = (pool as PostgresAdminReviewStorePool & {
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
        pool,
      });
    } catch (error) {
      adminReviewInitializationError = error;
      if (pool) {
        adminReviewPartialCleanup = pool.end().catch(() => undefined);
      }

      return undefined;
    }
  })();
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
  let closePromise: Promise<void> | undefined;
  const close = (): Promise<void> => {
    acceptingRequests = false;
    closePromise ??= waitForRequestDrain().then(() => Promise.allSettled([
      safeCampaignDbRepository.close?.() ?? Promise.resolve(),
      safeWalletSessionRepository.close(),
      ...(composedAdminReviewStore && adminReviewStoreOwnership === "runtime"
        ? [composedAdminReviewStore.close({
          traceId: `admin-runtime-close-${randomUUID()}`,
        })]
        : []),
      ...(adminReviewPartialCleanup ? [adminReviewPartialCleanup] : []),
    ])).then((results) => {
      activeWalletSessionIds.clear();
      const failures = results
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map((result) => result.reason as unknown);

      if (failures.length === 1) {
        throw failures[0];
      }

      if (failures.length > 1) {
        throw new ApiRuntimeResourceCloseError(failures);
      }
    });

    return closePromise;
  };

  return {
    close,
    handle: async (request) => {
      const traceId = createTraceId(request.headers);

      if (!acceptingRequests) {
        const runtimeError = persistenceUnavailable("runtime.close").body;

        return {
          body: createFailureEnvelope({
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
          if (adminReviewInitializationError || !composedAdminReviewStore) {
            throw adminRuntimeUnavailable("ADMIN_REVIEW_STORE_UNAVAILABLE");
          }

          const membershipRegistry = adminOperatorMembershipRegistry
            ?? createAdminOperatorMembershipRegistry(currentAdminReviewConfig);
          authDecision = await evaluateRuntimeAdminAuth({
            activeWalletSessionIds,
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

          body = parseBody(request, method);
        } else {
          if (configError) {
            throw createRuntimeConfigBlockedError(configError);
          }

          body = parseBody(request, method);
        }

        if (!adminPolicy && shouldEvaluateLocalAuth(matcher.route.id)) {
          authDecision = await evaluateRuntimeIssuedAuth({
            activeWalletSessionIds,
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
                activeWalletSessionIds,
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
          traceId,
          version: runtimeVersion,
          walletSessionRepository: safeWalletSessionRepository,
          ...(authDecision?.adminOperator
            ? { adminOperator: authDecision.adminOperator }
            : {}),
          ...(composedAdminReviewStore
            ? { adminReviewStore: composedAdminReviewStore }
            : {}),
          auth: authDecision,
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
          })
          : data;

        return {
          body: createSuccessEnvelope({
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
          body: createFailureEnvelope({
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
