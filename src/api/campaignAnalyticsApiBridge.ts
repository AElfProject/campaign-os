import {
  CAMPAIGN_ANALYTICS_MAX_SERIALIZED_BYTES,
  CAMPAIGN_ANALYTICS_TASK_ROW_LIMIT,
  CAMPAIGN_ANALYTICS_VERSION,
  campaignAnalyticsMetricDictionary,
  type CampaignAnalyticsErrorCode,
  type CampaignAnalyticsMetricDefinition,
  type CampaignAnalyticsSnapshot,
  type CampaignAnalyticsSnapshotStatus,
  type CampaignAnalyticsSourceId,
} from "../domain/campaignAnalytics";

const DEFAULT_TIMEOUT_MS = 2_000;
const MAX_TIMEOUT_MS = 2_000;
const REQUEST_TRACE_HEADER = "x-campaign-os-trace-id";
const RESPONSE_TRACE_HEADER = "x-trace-id";
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const LOCALE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{0,34}$/u;
const JSON_MEDIA_TYPE_PATTERN = /^application\/(?:[a-z0-9!#$&^_.+-]+\+)?json$/u;
const SENSITIVE_KEY_PATTERN = /(?:wallet(?:address)?|session|challenge|signature|proof|cookie|csrf|subject|operator|authorization|credential|privatekey|databaseurl|sql|stack)/iu;
const UNSAFE_ERROR_FIELD_PATTERN = /(?:walletaddress|sessionid|challenge|signature|proof|csrf|subject|operator|credential|privatekey|databaseurl|sql|stack)/iu;

const SOURCE_IDS: readonly CampaignAnalyticsSourceId[] = [
  "campaign",
  "participant",
  "task_completion_evidence",
  "admin_review",
  "points_projection",
  "referral_binding",
  "browser_events",
  "retention_events",
  "external_product_events",
];

const SERVER_ERROR_CODES = new Set<CampaignAnalyticsServerFailureCode>([
  "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
  "CAMPAIGN_ANALYTICS_NOT_FOUND",
  "CAMPAIGN_ANALYTICS_SCHEMA_NOT_READY",
  "CAMPAIGN_ANALYTICS_UNAVAILABLE",
  "CAMPAIGN_ANALYTICS_TIMEOUT",
  "CAMPAIGN_ANALYTICS_ROW_CORRUPTION",
  "CAMPAIGN_ANALYTICS_INTEGRITY_FAILED",
  "CAMPAIGN_ANALYTICS_BOUND_EXCEEDED",
  "CAMPAIGN_ANALYTICS_CLOSED",
  "CAMPAIGN_ANALYTICS_CLEANUP_FAILED",
  "AUTH_SESSION_REQUIRED",
  "AUTH_SESSION_INVALID",
  "AUTH_FORBIDDEN",
]);

const RETRYABLE_SERVER_CODES = new Set<CampaignAnalyticsServerFailureCode>([
  "CAMPAIGN_ANALYTICS_UNAVAILABLE",
  "CAMPAIGN_ANALYTICS_TIMEOUT",
]);

const ERROR_HTTP_STATUSES = new Set([401, 403, 404, 409, 422, 503]);

export type CampaignAnalyticsSurface = "owner" | "admin";

export interface CampaignAnalyticsApiRequest {
  readonly surface: CampaignAnalyticsSurface;
  readonly campaignId: string;
  readonly signal: AbortSignal;
  readonly traceId?: string;
}

export type CampaignAnalyticsServerFailureCode =
  | CampaignAnalyticsErrorCode
  | "AUTH_SESSION_REQUIRED"
  | "AUTH_SESSION_INVALID"
  | "AUTH_FORBIDDEN";

export type CampaignAnalyticsApiFailureCode =
  | CampaignAnalyticsServerFailureCode
  | "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_CONFIG"
  | "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_INPUT"
  | "CAMPAIGN_ANALYTICS_BRIDGE_REQUEST_ABORTED"
  | "CAMPAIGN_ANALYTICS_BRIDGE_REQUEST_TIMEOUT"
  | "CAMPAIGN_ANALYTICS_BRIDGE_REQUEST_FAILED"
  | "CAMPAIGN_ANALYTICS_BRIDGE_RESPONSE_TOO_LARGE"
  | "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_RESPONSE";

export interface CampaignAnalyticsApiFailure {
  readonly ok: false;
  readonly code: CampaignAnalyticsApiFailureCode;
  readonly operation: "config" | "request" | "response" | "decode";
  readonly retryable: boolean;
  readonly traceId?: string;
  readonly field?: string;
  readonly httpStatus?: number;
}

export interface CampaignAnalyticsApiSuccess {
  readonly ok: true;
  readonly data: CampaignAnalyticsSnapshot;
  readonly httpStatus: number;
  readonly traceId: string;
}

export type CampaignAnalyticsApiResult =
  | CampaignAnalyticsApiFailure
  | CampaignAnalyticsApiSuccess;

export type CampaignAnalyticsApiFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface CampaignAnalyticsApiBridgeOptions {
  readonly baseUrl: string;
  readonly fetchImpl?: CampaignAnalyticsApiFetch;
  readonly timeoutMs?: number;
  readonly maxResponseBytes?: number;
  readonly traceIdGenerator?: () => string;
  readonly setTimeoutImpl?: (callback: () => void, timeoutMs: number) => unknown;
  readonly clearTimeoutImpl?: (handle: unknown) => void;
}

export interface CampaignAnalyticsApiBridge {
  read(request: CampaignAnalyticsApiRequest): Promise<CampaignAnalyticsApiResult>;
}

interface NormalizedConfig {
  readonly baseUrl?: string;
  readonly fetchImpl?: CampaignAnalyticsApiFetch;
  readonly timeoutMs: number;
  readonly maxResponseBytes: number;
  readonly traceIdGenerator?: () => string;
  readonly setTimeoutImpl: (callback: () => void, timeoutMs: number) => unknown;
  readonly clearTimeoutImpl: (handle: unknown) => void;
  readonly invalidField?: string;
}

type AbortCause = "caller" | "timeout";

interface ManagedAbort {
  readonly controller: AbortController;
  readonly cause: () => AbortCause | undefined;
  readonly cleanup: () => void;
}

class DecodeFailure extends Error {
  readonly kind: "invalid" | "too_large";

  constructor(kind: "invalid" | "too_large") {
    super(kind);
    this.name = "CampaignAnalyticsDecodeFailure";
    this.kind = kind;
    delete this.stack;
  }
}

class AbortBoundaryFailure extends Error {
  constructor() {
    super("aborted");
    this.name = "CampaignAnalyticsAbortBoundaryFailure";
    delete this.stack;
  }
}

class AbortSetupFailure extends Error {
  readonly field: "signal" | "timer";

  constructor(field: "signal" | "timer") {
    super(field);
    this.name = "CampaignAnalyticsAbortSetupFailure";
    this.field = field;
    delete this.stack;
  }
}

const failure = (options: {
  readonly code: CampaignAnalyticsApiFailureCode;
  readonly operation: CampaignAnalyticsApiFailure["operation"];
  readonly retryable?: boolean;
  readonly traceId?: string;
  readonly field?: string;
  readonly httpStatus?: number;
}): CampaignAnalyticsApiFailure => Object.freeze({
  ok: false as const,
  code: options.code,
  operation: options.operation,
  retryable: options.retryable ?? false,
  ...(options.traceId ? { traceId: options.traceId } : {}),
  ...(options.field ? { field: options.field } : {}),
  ...(options.httpStatus !== undefined ? { httpStatus: options.httpStatus } : {}),
});

const normalizeConfig = (options: CampaignAnalyticsApiBridgeOptions): NormalizedConfig => {
  const defaults = {
    clearTimeoutImpl: (handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    maxResponseBytes: CAMPAIGN_ANALYTICS_MAX_SERIALIZED_BYTES,
    setTimeoutImpl: (callback: () => void, timeoutMs: number) => setTimeout(callback, timeoutMs),
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  try {
    if (!isRecord(options)) {
      return { ...defaults, invalidField: "options" };
    }

    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxResponseBytes = options.maxResponseBytes ?? CAMPAIGN_ANALYTICS_MAX_SERIALIZED_BYTES;
    const setTimeoutImpl = options.setTimeoutImpl ?? defaults.setTimeoutImpl;
    const clearTimeoutImpl = options.clearTimeoutImpl ?? defaults.clearTimeoutImpl;
    const fetchImpl = options.fetchImpl ?? globalThis.fetch?.bind(globalThis);

    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > MAX_TIMEOUT_MS) {
      return { ...defaults, invalidField: "timeoutMs" };
    }
    if (
      !Number.isSafeInteger(maxResponseBytes)
      || maxResponseBytes <= 0
      || maxResponseBytes > CAMPAIGN_ANALYTICS_MAX_SERIALIZED_BYTES
    ) {
      return { ...defaults, invalidField: "maxResponseBytes" };
    }
    if (typeof fetchImpl !== "function") {
      return { ...defaults, invalidField: "fetchImpl" };
    }
    if (typeof setTimeoutImpl !== "function" || typeof clearTimeoutImpl !== "function") {
      return { ...defaults, invalidField: "timer" };
    }
    if (options.traceIdGenerator !== undefined && typeof options.traceIdGenerator !== "function") {
      return { ...defaults, invalidField: "traceIdGenerator" };
    }

    const baseUrl = normalizeBaseUrl(options.baseUrl);
    if (!baseUrl) {
      return { ...defaults, invalidField: "baseUrl" };
    }

    return Object.freeze({
      baseUrl,
      fetchImpl,
      timeoutMs,
      maxResponseBytes,
      traceIdGenerator: options.traceIdGenerator,
      setTimeoutImpl,
      clearTimeoutImpl,
    });
  } catch {
    return { ...defaults, invalidField: "options" };
  }
};

const normalizeBaseUrl = (value: unknown): string | undefined => {
  if (typeof value !== "string" || value !== value.trim() || value.length === 0) {
    return undefined;
  }

  try {
    const url = new URL(value);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:")
      || url.username
      || url.password
      || url.search
      || url.hash
      || (url.pathname !== "/" && url.pathname !== "")
    ) {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
};

const isSafeIdentifier = (value: unknown): value is string =>
  typeof value === "string" && IDENTIFIER_PATTERN.test(value);

const validateRequest = (
  value: CampaignAnalyticsApiRequest,
): { readonly ok: true; readonly request: CampaignAnalyticsApiRequest; readonly aborted: boolean }
  | { readonly ok: false; readonly field: string } => {
  try {
    if (!isRecord(value) || !hasOnlyKeys(value, ["surface", "campaignId", "signal", "traceId"])) {
      return { ok: false, field: "request" };
    }
    if (value.surface !== "owner" && value.surface !== "admin") {
      return { ok: false, field: "surface" };
    }
    if (!isSafeIdentifier(value.campaignId)) {
      return { ok: false, field: "campaignId" };
    }
    if (value.traceId !== undefined && !isSafeIdentifier(value.traceId)) {
      return { ok: false, field: "traceId" };
    }

    const signal = value.signal;
    if (
      typeof signal !== "object"
      || signal === null
      || typeof signal.aborted !== "boolean"
      || typeof signal.addEventListener !== "function"
      || typeof signal.removeEventListener !== "function"
    ) {
      return { ok: false, field: "signal" };
    }

    return { ok: true, request: value, aborted: signal.aborted };
  } catch {
    return { ok: false, field: "request" };
  }
};

const resolveTraceId = (
  request: CampaignAnalyticsApiRequest,
  config: NormalizedConfig,
): { readonly ok: true; readonly traceId: string }
  | { readonly ok: false; readonly field: string; readonly configFailure: boolean } => {
  if (request.traceId !== undefined) {
    return isSafeIdentifier(request.traceId)
      ? { ok: true, traceId: request.traceId }
      : { ok: false, field: "traceId", configFailure: false };
  }

  if (!config.traceIdGenerator) {
    return { ok: false, field: "traceIdGenerator", configFailure: true };
  }

  try {
    const traceId = config.traceIdGenerator();
    return isSafeIdentifier(traceId)
      ? { ok: true, traceId }
      : { ok: false, field: "traceIdGenerator", configFailure: true };
  } catch {
    return { ok: false, field: "traceIdGenerator", configFailure: true };
  }
};

const createManagedAbort = (
  signal: AbortSignal,
  config: NormalizedConfig,
): ManagedAbort => {
  const controller = new AbortController();
  let abortCause: AbortCause | undefined;
  let cleaned = false;

  const abort = (cause: AbortCause) => {
    if (!abortCause) {
      abortCause = cause;
      controller.abort();
    }
  };
  const onCallerAbort = () => abort("caller");
  try {
    signal.addEventListener("abort", onCallerAbort, { once: true });
  } catch {
    throw new AbortSetupFailure("signal");
  }

  let timer: unknown;
  try {
    timer = config.setTimeoutImpl(() => abort("timeout"), config.timeoutMs);
  } catch {
    try {
      signal.removeEventListener("abort", onCallerAbort);
    } catch {
      // The original setup failure remains authoritative.
    }
    throw new AbortSetupFailure("timer");
  }

  return {
    controller,
    cause: () => abortCause,
    cleanup: () => {
      if (cleaned) {
        return;
      }
      cleaned = true;
      try {
        config.clearTimeoutImpl(timer);
      } catch {
        // Cleanup failure cannot replace the primary safe result.
      }
      try {
        signal.removeEventListener("abort", onCallerAbort);
      } catch {
        // Hostile signal cleanup is contained at the boundary.
      }
    },
  };
};

const raceWithAbort = <T>(promise: PromiseLike<T>, signal: AbortSignal): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      try {
        signal.removeEventListener("abort", onAbort);
      } catch {
        // The public operation still settles with its primary result.
      }
    };
    const onAbort = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(new AbortBoundaryFailure());
    };

    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    Promise.resolve(promise).then(
      (value) => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve(value);
        }
      },
      (error: unknown) => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(error);
        }
      },
    );
  });

const cancelResponseBody = (response: Response): void => {
  try {
    const cancellation = response.body?.cancel();
    if (cancellation) {
      void Promise.resolve(cancellation).catch(() => undefined);
    }
  } catch {
    // Cancellation is best-effort and never escapes the transport boundary.
  }
};

const responseTraceId = (response: Response): string | undefined => {
  try {
    const value = response.headers.get(RESPONSE_TRACE_HEADER);
    return isSafeIdentifier(value) ? value : undefined;
  } catch {
    return undefined;
  }
};

const readBoundedJson = async (
  response: Response,
  maxBytes: number,
  signal: AbortSignal,
): Promise<unknown> => {
  let contentType: string | null;
  let contentLength: string | null;

  try {
    contentType = response.headers.get("content-type");
    contentLength = response.headers.get("content-length");
  } catch {
    throw new DecodeFailure("invalid");
  }

  const mediaType = contentType?.split(";", 1)[0]?.trim().toLowerCase();
  if (!mediaType || !JSON_MEDIA_TYPE_PATTERN.test(mediaType)) {
    cancelResponseBody(response);
    throw new DecodeFailure("invalid");
  }
  if (contentLength && /^\d+$/u.test(contentLength) && Number(contentLength) > maxBytes) {
    cancelResponseBody(response);
    throw new DecodeFailure("too_large");
  }
  if (!response.body) {
    throw new DecodeFailure("invalid");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const result = await raceWithAbort(reader.read(), signal);
      if (signal.aborted) {
        throw new AbortBoundaryFailure();
      }
      if (result.done) {
        break;
      }
      if (!result.value || !Number.isSafeInteger(result.value.byteLength)) {
        throw new DecodeFailure("invalid");
      }
      const chunk = Uint8Array.from(result.value);
      totalBytes += chunk.byteLength;
      if (totalBytes > maxBytes) {
        throw new DecodeFailure("too_large");
      }
      chunks.push(chunk);
    }
  } catch (error) {
    try {
      void Promise.resolve(reader.cancel()).catch(() => undefined);
    } catch {
      // Reader cancellation cannot replace the first failure.
    }
    throw error;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // The body lifecycle is already complete or cancelled.
    }
  }

  if (totalBytes === 0) {
    throw new DecodeFailure("invalid");
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new DecodeFailure("invalid");
  }
  if (!text.trim()) {
    throw new DecodeFailure("invalid");
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new DecodeFailure("invalid");
  }
};

const decodeSuccess = (
  body: unknown,
  expectedCampaignId: string,
  headerTraceId: string | undefined,
): CampaignAnalyticsSnapshot => {
  assertExactKeys(body, ["ok", "data", "traceId"]);
  if (body.ok !== true || !isSafeIdentifier(body.traceId) || body.traceId !== headerTraceId) {
    throw new DecodeFailure("invalid");
  }
  assertNoSensitiveKeys(body.data);
  validateSnapshot(body.data, expectedCampaignId, body.traceId);

  try {
    return deepFreeze(structuredClone(body.data)) as CampaignAnalyticsSnapshot;
  } catch {
    throw new DecodeFailure("invalid");
  }
};

const decodeServerFailure = (
  body: unknown,
  status: number,
  headerTraceId: string | undefined,
): CampaignAnalyticsApiFailure => {
  assertExactKeys(body, ["ok", "error", "traceId"]);
  if (body.ok !== false || !isSafeIdentifier(body.traceId) || body.traceId !== headerTraceId) {
    throw new DecodeFailure("invalid");
  }
  assertExactKeys(body.error, ["code", "field", "retryable"]);
  const code = body.error.code;
  const field = body.error.field;
  const retryable = body.error.retryable;
  if (
    !isServerFailureCode(code)
    || !isSafeIdentifier(field)
    || UNSAFE_ERROR_FIELD_PATTERN.test(field)
    || typeof retryable !== "boolean"
    || retryable !== RETRYABLE_SERVER_CODES.has(code)
    || !ERROR_HTTP_STATUSES.has(status)
    || !serverCodeMatchesStatus(code, status)
  ) {
    throw new DecodeFailure("invalid");
  }

  return failure({
    code,
    field,
    httpStatus: status,
    operation: "response",
    retryable,
    traceId: body.traceId,
  });
};

const serverCodeMatchesStatus = (
  code: CampaignAnalyticsServerFailureCode,
  status: number,
): boolean => {
  if (code === "AUTH_SESSION_REQUIRED" || code === "AUTH_SESSION_INVALID") {
    return status === 401;
  }
  if (code === "AUTH_FORBIDDEN") {
    return status === 403;
  }
  if (code === "CAMPAIGN_ANALYTICS_NOT_FOUND") {
    return status === 404;
  }
  return status === 409 || status === 422 || status === 503;
};

const isServerFailureCode = (value: unknown): value is CampaignAnalyticsServerFailureCode =>
  typeof value === "string" && SERVER_ERROR_CODES.has(value as CampaignAnalyticsServerFailureCode);

function validateSnapshot(
  value: unknown,
  expectedCampaignId: string,
  expectedTraceId: string,
): asserts value is CampaignAnalyticsSnapshot {
  assertExactKeys(value, [
    "version",
    "campaignId",
    "asOf",
    "status",
    "metrics",
    "taskBreakdown",
    "completionBreakdown",
    "reviewBreakdown",
    "accountTypeBreakdown",
    "localeBreakdown",
    "sourceCapabilities",
    "traceId",
  ]);

  if (
    value.version !== CAMPAIGN_ANALYTICS_VERSION
    || value.campaignId !== expectedCampaignId
    || value.traceId !== expectedTraceId
    || !isSnapshotStatus(value.status)
    || !isCanonicalTimestamp(value.asOf)
  ) {
    throw new DecodeFailure("invalid");
  }

  const metrics = validateMetrics(value.metrics);
  const participantCount = metricValue(metrics, "participants.unique");
  const taskCount = metricValue(metrics, "tasks.total");
  const verifiedCount = metricValue(metrics, "completions.verified");
  if (participantCount === undefined || taskCount === undefined || verifiedCount === undefined) {
    throw new DecodeFailure("invalid");
  }

  validateTaskBreakdown(value.taskBreakdown, participantCount, taskCount);
  validateCompletionBreakdown(value.completionBreakdown, verifiedCount);
  validateReviewBreakdown(value.reviewBreakdown, participantCount);
  validateDimensionBreakdown(value.accountTypeBreakdown, participantCount, 3, true);
  validateDimensionBreakdown(value.localeBreakdown, participantCount, 9, false);
  const sourceCapabilities = validateSourceCapabilities(value.sourceCapabilities);
  validateSourceMetricConsistency(metrics, sourceCapabilities);
  validateStatusSemantics(value.status, metrics, participantCount);
  validateCanonicalMetricReconciliation(metrics, participantCount, taskCount, verifiedCount);

  if (!value.taskBreakdown.truncated) {
    const activityTotal = value.taskBreakdown.rows.reduce(
      (sum, row) => checkedAdd(sum, row.activityParticipants),
      0,
    );
    const verifiedTotal = value.taskBreakdown.rows.reduce(
      (sum, row) => checkedAdd(sum, row.verifiedParticipants),
      0,
    );
    const tasksWithActivity = value.taskBreakdown.rows.filter(
      (row) => row.activityParticipants > 0,
    ).length;
    const completionTotal = checkedSum([
      value.completionBreakdown.pending,
      value.completionBreakdown.completed,
      value.completionBreakdown.failed,
      value.completionBreakdown.manualReview,
    ]);
    if (
      activityTotal !== completionTotal
      || verifiedTotal !== verifiedCount
      || metricValue(metrics, "tasks.with_activity") !== tasksWithActivity
    ) {
      throw new DecodeFailure("invalid");
    }
  }
}

const validateCanonicalMetricReconciliation = (
  metrics: readonly Record<string, unknown>[],
  participantCount: number,
  taskCount: number,
  verifiedCount: number,
): void => {
  validateAvailableRatio(
    metrics,
    "completions.rate",
    verifiedCount,
    checkedMultiply(participantCount, taskCount),
  );

  const referralConversion = metricById(metrics, "referrals.conversion");
  if (referralConversion.availability === "available") {
    validateAvailableRatio(
      metrics,
      "referrals.conversion",
      requiredMetricValue(metrics, "referrals.qualified"),
      requiredMetricValue(metrics, "referrals.total"),
    );
  }

  const flaggedRate = metricById(metrics, "risk.flagged_rate");
  if (flaggedRate.availability === "available") {
    validateAvailableRatio(
      metrics,
      "risk.flagged_rate",
      requiredMetricValue(metrics, "risk.flagged_participants"),
      participantCount,
    );
  }

  const pointsAwarded = metricValue(metrics, "points.awarded");
  const participantsWithPoints = metricValue(metrics, "points.participants_with_points");
  const participantsWithoutPoints = metricValue(metrics, "points.participants_without_points");
  if (
    participantsWithPoints !== undefined
    && participantsWithoutPoints !== undefined
    && checkedSum([participantsWithPoints, participantsWithoutPoints]) !== participantCount
  ) {
    throw new DecodeFailure("invalid");
  }
  if (
    pointsAwarded !== undefined
    && participantsWithPoints !== undefined
    && (
      pointsAwarded < participantsWithPoints
      || (pointsAwarded === 0) !== (participantsWithPoints === 0)
    )
  ) {
    throw new DecodeFailure("invalid");
  }
};

const validateAvailableRatio = (
  metrics: readonly Record<string, unknown>[],
  ratioId: CampaignAnalyticsMetricDefinition["id"],
  expectedNumerator: number,
  expectedDenominator: number,
): void => {
  const ratio = metricById(metrics, ratioId);
  if (ratio.availability !== "available") {
    return;
  }
  if (
    ratio.numerator !== expectedNumerator
    || ratio.denominator !== expectedDenominator
  ) {
    throw new DecodeFailure("invalid");
  }
};

const validateMetrics = (value: unknown): readonly Record<string, unknown>[] => {
  if (!Array.isArray(value) || value.length !== campaignAnalyticsMetricDictionary.length) {
    throw new DecodeFailure("invalid");
  }

  return value.map((metric, index) => {
    assertRecord(metric);
    const definition = campaignAnalyticsMetricDictionary[index];
    if (!definition) {
      throw new DecodeFailure("invalid");
    }
    validateMetricDefinition(metric.definition, definition);

    if (metric.availability === "available") {
      const expectedKeys = definition.unit === "ratio"
        ? ["availability", "definition", "value", "numerator", "denominator"]
        : ["availability", "definition", "value"];
      assertExactKeys(metric, expectedKeys);
      if (!isNonNegativeFinite(metric.value)) {
        throw new DecodeFailure("invalid");
      }
      if (definition.unit === "ratio") {
        if (
          !isNonNegativeSafeInteger(metric.numerator)
          || !isNonNegativeSafeInteger(metric.denominator)
          || metric.value < 0
          || metric.value > 1
          || metric.numerator > metric.denominator
          || metric.value !== (metric.denominator === 0 ? 0 : metric.numerator / metric.denominator)
        ) {
          throw new DecodeFailure("invalid");
        }
      } else if (!Number.isSafeInteger(metric.value)) {
        throw new DecodeFailure("invalid");
      }
      return metric;
    }

    assertExactKeys(metric, ["availability", "definition", "reasonCode"]);
    if (
      metric.availability !== "unavailable"
      || !isUnavailableReason(metric.reasonCode)
    ) {
      throw new DecodeFailure("invalid");
    }
    return metric;
  });
};

const validateMetricDefinition = (
  value: unknown,
  expected: CampaignAnalyticsMetricDefinition,
): void => {
  assertExactKeys(value, [
    "id",
    "version",
    "label",
    "description",
    "unit",
    "source",
    "dedupeKey",
    "denominator",
    "timeBoundary",
  ]);
  if (
    value.id !== expected.id
    || value.version !== expected.version
    || value.unit !== expected.unit
    || value.source !== expected.source
    || value.dedupeKey !== expected.dedupeKey
    || value.denominator !== expected.denominator
    || value.timeBoundary !== expected.timeBoundary
    || !localizedTextMatches(value.label, expected.label)
    || !localizedTextMatches(value.description, expected.description)
  ) {
    throw new DecodeFailure("invalid");
  }
};

const localizedTextMatches = (
  value: unknown,
  expected: CampaignAnalyticsMetricDefinition["label"],
): boolean => {
  try {
    assertExactKeys(value, ["en-US", "zh-CN", "zh-TW"]);
    return value["en-US"] === expected["en-US"]
      && value["zh-CN"] === expected["zh-CN"]
      && value["zh-TW"] === expected["zh-TW"];
  } catch {
    return false;
  }
};

function validateTaskBreakdown(
  value: unknown,
  participantCount: number,
  expectedTaskCount: number,
): asserts value is CampaignAnalyticsSnapshot["taskBreakdown"] {
  assertExactKeys(value, ["rows", "totalRows", "truncated", "rowLimit"]);
  if (
    !Array.isArray(value.rows)
    || value.rows.length > CAMPAIGN_ANALYTICS_TASK_ROW_LIMIT
    || !isNonNegativeSafeInteger(value.totalRows)
    || value.totalRows !== expectedTaskCount
    || typeof value.truncated !== "boolean"
    || value.rowLimit !== CAMPAIGN_ANALYTICS_TASK_ROW_LIMIT
    || (value.truncated
      ? value.totalRows <= CAMPAIGN_ANALYTICS_TASK_ROW_LIMIT
        || value.rows.length !== CAMPAIGN_ANALYTICS_TASK_ROW_LIMIT
      : value.rows.length !== value.totalRows)
  ) {
    throw new DecodeFailure("invalid");
  }

  let previousTaskId = "";
  for (const row of value.rows) {
    assertExactKeys(row, [
      "taskId",
      "templateCode",
      "required",
      "activityParticipants",
      "verifiedParticipants",
      "participantDenominator",
      "completionRate",
    ]);
    if (
      !isSafeIdentifier(row.taskId)
      || !isSafeIdentifier(row.templateCode)
      || row.taskId <= previousTaskId
      || typeof row.required !== "boolean"
      || !isNonNegativeSafeInteger(row.activityParticipants)
      || !isNonNegativeSafeInteger(row.verifiedParticipants)
      || row.verifiedParticipants > row.activityParticipants
      || row.activityParticipants > participantCount
      || row.participantDenominator !== participantCount
      || !isNonNegativeFinite(row.completionRate)
      || row.completionRate > 1
      || row.completionRate !== (participantCount === 0 ? 0 : row.verifiedParticipants / participantCount)
    ) {
      throw new DecodeFailure("invalid");
    }
    previousTaskId = row.taskId;
  }
}

function validateCompletionBreakdown(
  value: unknown,
  expectedVerified: number,
): asserts value is CampaignAnalyticsSnapshot["completionBreakdown"] {
  assertExactKeys(value, ["pending", "completed", "failed", "manualReview", "verified"]);
  if (
    !isNonNegativeSafeInteger(value.pending)
    || !isNonNegativeSafeInteger(value.completed)
    || !isNonNegativeSafeInteger(value.failed)
    || !isNonNegativeSafeInteger(value.manualReview)
    || !isNonNegativeSafeInteger(value.verified)
    || value.verified !== expectedVerified
    || value.verified > value.completed
  ) {
    throw new DecodeFailure("invalid");
  }
}

const validateReviewBreakdown = (value: unknown, participantCount: number): void => {
  assertExactKeys(value, [
    "approved",
    "rejected",
    "needsReview",
    "stale",
    "invalid",
    "unreviewed",
    "totalParticipants",
  ]);
  const keys = ["approved", "rejected", "needsReview", "stale", "invalid", "unreviewed"] as const;
  const counts = keys.map((key) => value[key]);
  if (
    counts.some((count) => !isNonNegativeSafeInteger(count))
    || value.totalParticipants !== participantCount
    || checkedSum(counts as number[]) !== participantCount
  ) {
    throw new DecodeFailure("invalid");
  }
};

const validateDimensionBreakdown = (
  value: unknown,
  participantCount: number,
  maximumRows: number,
  accountType: boolean,
): void => {
  if (!Array.isArray(value) || value.length > maximumRows) {
    throw new DecodeFailure("invalid");
  }
  const seen = new Set<string>();
  let countTotal = 0;

  for (const row of value) {
    assertExactKeys(row, ["id", "count", "percentage"]);
    const validId = accountType
      ? row.id === "AA" || row.id === "EOA" || row.id === "UNKNOWN"
      : typeof row.id === "string" && LOCALE_PATTERN.test(row.id);
    if (
      !validId
      || seen.has(row.id as string)
      || !isNonNegativeSafeInteger(row.count)
      || row.count > participantCount
      || !isNonNegativeFinite(row.percentage)
      || row.percentage > 1
      || row.percentage !== (participantCount === 0 ? 0 : row.count / participantCount)
    ) {
      throw new DecodeFailure("invalid");
    }
    seen.add(row.id as string);
    countTotal = checkedAdd(countTotal, row.count);
  }

  if (countTotal > participantCount) {
    throw new DecodeFailure("invalid");
  }
};

const validateSourceCapabilities = (value: unknown): readonly Record<string, unknown>[] => {
  if (!Array.isArray(value) || value.length !== SOURCE_IDS.length) {
    throw new DecodeFailure("invalid");
  }

  value.forEach((capability, index) => {
    assertRecord(capability);
    if (capability.source !== SOURCE_IDS[index]) {
      throw new DecodeFailure("invalid");
    }
    if (capability.availability === "available") {
      const keys = capability.schemaVersion === undefined
        ? ["source", "availability"]
        : ["source", "availability", "schemaVersion"];
      assertExactKeys(capability, keys);
      if (capability.schemaVersion !== undefined && !isSafeIdentifier(capability.schemaVersion)) {
        throw new DecodeFailure("invalid");
      }
      return;
    }
    assertExactKeys(capability, ["source", "availability", "reasonCode"]);
    if (
      capability.availability !== "unavailable"
      || (capability.reasonCode !== "SOURCE_NOT_COLLECTED"
        && capability.reasonCode !== "SOURCE_OUT_OF_SCOPE")
    ) {
      throw new DecodeFailure("invalid");
    }
  });
  return value;
};

const validateSourceMetricConsistency = (
  metrics: readonly Record<string, unknown>[],
  capabilities: readonly Record<string, unknown>[],
): void => {
  const capabilityBySource = new Map(
    capabilities.map((capability) => [capability.source, capability] as const),
  );

  for (const metric of metrics) {
    const definition = metric.definition as Record<string, unknown>;
    const capability = capabilityBySource.get(definition.source);
    if (!capability) {
      throw new DecodeFailure("invalid");
    }
    if (capability.availability === "unavailable") {
      if (
        metric.availability !== "unavailable"
        || metric.reasonCode !== capability.reasonCode
      ) {
        throw new DecodeFailure("invalid");
      }
      continue;
    }
    if (
      metric.availability === "unavailable"
      && metric.reasonCode !== "SOURCE_INTEGRITY_UNAVAILABLE"
    ) {
      throw new DecodeFailure("invalid");
    }
  }
};

const validateStatusSemantics = (
  status: CampaignAnalyticsSnapshotStatus,
  metrics: readonly Record<string, unknown>[],
  participantCount: number,
): void => {
  const hasUnavailable = metrics.some((metric) => metric.availability === "unavailable");
  const expectedStatus: CampaignAnalyticsSnapshotStatus = participantCount === 0
    ? "empty"
    : hasUnavailable
      ? "partial"
      : "ready";
  if (status !== expectedStatus) {
    throw new DecodeFailure("invalid");
  }
};

const metricValue = (
  metrics: readonly Record<string, unknown>[],
  id: CampaignAnalyticsMetricDefinition["id"],
): number | undefined => {
  const metric = metricById(metrics, id);
  return metric?.availability === "available" && typeof metric.value === "number"
    ? metric.value
    : undefined;
};

const requiredMetricValue = (
  metrics: readonly Record<string, unknown>[],
  id: CampaignAnalyticsMetricDefinition["id"],
): number => {
  const value = metricValue(metrics, id);
  if (value === undefined) {
    throw new DecodeFailure("invalid");
  }
  return value;
};

const metricById = (
  metrics: readonly Record<string, unknown>[],
  id: CampaignAnalyticsMetricDefinition["id"],
): Record<string, unknown> => {
  const metric = metrics.find((item) => {
    const definition = isRecord(item.definition) ? item.definition : undefined;
    return definition?.id === id;
  });
  if (!metric) {
    throw new DecodeFailure("invalid");
  }
  return metric;
};

const isSnapshotStatus = (value: unknown): value is CampaignAnalyticsSnapshotStatus =>
  value === "ready" || value === "empty" || value === "partial";

const isCanonicalTimestamp = (value: unknown): value is string => {
  if (
    typeof value !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
  ) {
    return false;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
};

const isUnavailableReason = (value: unknown): boolean =>
  value === "SOURCE_NOT_COLLECTED"
  || value === "SOURCE_OUT_OF_SCOPE"
  || value === "SOURCE_INTEGRITY_UNAVAILABLE";

const isNonNegativeFinite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

const isNonNegativeSafeInteger = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0;

const checkedAdd = (left: number, right: number): number => {
  const result = left + right;
  if (!Number.isSafeInteger(result)) {
    throw new DecodeFailure("invalid");
  }
  return result;
};

const checkedMultiply = (left: number, right: number): number => {
  const result = left * right;
  if (!Number.isSafeInteger(result)) {
    throw new DecodeFailure("invalid");
  }
  return result;
};

const checkedSum = (values: readonly number[]): number =>
  values.reduce((sum, value) => checkedAdd(sum, value), 0);

const assertNoSensitiveKeys = (
  value: unknown,
  ancestors: WeakSet<object> = new WeakSet<object>(),
): void => {
  if (value === null || typeof value !== "object") {
    return;
  }
  if (ancestors.has(value)) {
    throw new DecodeFailure("invalid");
  }
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      value.forEach((child) => assertNoSensitiveKeys(child, ancestors));
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        throw new DecodeFailure("invalid");
      }
      assertNoSensitiveKeys(child, ancestors);
    }
  } finally {
    ancestors.delete(value);
  }
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const hasOnlyKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
};

function assertRecord(value: unknown): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new DecodeFailure("invalid");
  }
}

function assertExactKeys(
  value: unknown,
  expectedKeys: readonly string[],
): asserts value is Record<string, unknown> {
  assertRecord(value);
  const actualKeys = Object.keys(value);
  const expected = new Set(expectedKeys);
  if (actualKeys.length !== expected.size || actualKeys.some((key) => !expected.has(key))) {
    throw new DecodeFailure("invalid");
  }
}

const deepFreeze = <T>(value: T, seen: WeakSet<object> = new WeakSet<object>()): T => {
  if (value === null || typeof value !== "object" || seen.has(value)) {
    return value;
  }
  seen.add(value);
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child, seen);
  }
  return Object.freeze(value);
};

const abortFailure = (
  cause: AbortCause | undefined,
  traceId: string,
): CampaignAnalyticsApiFailure => cause === "timeout"
  ? failure({
      code: "CAMPAIGN_ANALYTICS_BRIDGE_REQUEST_TIMEOUT",
      operation: "request",
      retryable: true,
      traceId,
    })
  : failure({
      code: "CAMPAIGN_ANALYTICS_BRIDGE_REQUEST_ABORTED",
      operation: "request",
      traceId,
    });

const executeRead = async (
  rawRequest: CampaignAnalyticsApiRequest,
  config: NormalizedConfig,
): Promise<CampaignAnalyticsApiResult> => {
  if (config.invalidField || !config.baseUrl || !config.fetchImpl) {
    return failure({
      code: "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_CONFIG",
      operation: "config",
      field: config.invalidField,
    });
  }

  const validated = validateRequest(rawRequest);
  if (!validated.ok) {
    return failure({
      code: "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_INPUT",
      operation: "request",
      field: validated.field,
    });
  }

  const trace = resolveTraceId(validated.request, config);
  if (!trace.ok) {
    return failure({
      code: trace.configFailure
        ? "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_CONFIG"
        : "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_INPUT",
      operation: trace.configFailure ? "config" : "request",
      field: trace.field,
    });
  }
  if (validated.aborted) {
    return abortFailure("caller", trace.traceId);
  }

  let managed: ManagedAbort;
  try {
    managed = createManagedAbort(validated.request.signal, config);
  } catch (error) {
    const field = error instanceof AbortSetupFailure ? error.field : "signal";
    return failure({
      code: field === "timer"
        ? "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_CONFIG"
        : "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_INPUT",
      operation: field === "timer" ? "config" : "request",
      field,
      traceId: trace.traceId,
    });
  }
  const url = validated.request.surface === "owner"
    ? `${config.baseUrl}/api/campaigns/${encodeURIComponent(validated.request.campaignId)}/analytics`
    : `${config.baseUrl}/api/admin/campaigns/${encodeURIComponent(validated.request.campaignId)}/analytics`;

  try {
    const fetchPromise = Promise.resolve().then(() => config.fetchImpl!(url, {
      credentials: "include",
      headers: {
        Accept: "application/json",
        [REQUEST_TRACE_HEADER]: trace.traceId,
      },
      method: "GET",
      signal: managed.controller.signal,
    }));
    void fetchPromise.then((response) => {
      if (managed.controller.signal.aborted) {
        cancelResponseBody(response);
      }
    }, () => undefined);

    let response: Response;
    try {
      response = await raceWithAbort(fetchPromise, managed.controller.signal);
    } catch (error) {
      if (managed.cause() || error instanceof AbortBoundaryFailure) {
        return abortFailure(managed.cause(), trace.traceId);
      }
      return failure({
        code: "CAMPAIGN_ANALYTICS_BRIDGE_REQUEST_FAILED",
        operation: "request",
        retryable: true,
        traceId: trace.traceId,
      });
    }

    const headerTraceId = responseTraceId(response);
    let body: unknown;
    try {
      body = await readBoundedJson(response, config.maxResponseBytes, managed.controller.signal);
    } catch (error) {
      if (managed.cause() || error instanceof AbortBoundaryFailure) {
        return abortFailure(managed.cause(), trace.traceId);
      }
      return failure({
        code: error instanceof DecodeFailure && error.kind === "too_large"
          ? "CAMPAIGN_ANALYTICS_BRIDGE_RESPONSE_TOO_LARGE"
          : "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_RESPONSE",
        operation: "decode",
        httpStatus: response.status,
        traceId: headerTraceId ?? trace.traceId,
      });
    }

    try {
      if (response.status === 200 && response.ok) {
        const data = decodeSuccess(body, validated.request.campaignId, headerTraceId);
        return Object.freeze({
          ok: true,
          data,
          httpStatus: response.status,
          traceId: data.traceId,
        });
      }
      if (response.ok) {
        throw new DecodeFailure("invalid");
      }
      return decodeServerFailure(body, response.status, headerTraceId);
    } catch {
      return failure({
        code: "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_RESPONSE",
        operation: "decode",
        httpStatus: response.status,
        traceId: headerTraceId ?? trace.traceId,
      });
    }
  } finally {
    managed.cleanup();
  }
};

export const createCampaignAnalyticsApiBridge = (
  options: CampaignAnalyticsApiBridgeOptions,
): CampaignAnalyticsApiBridge => {
  const config = normalizeConfig(options);
  return Object.freeze({
    read: (request: CampaignAnalyticsApiRequest) => executeRead(request, config),
  });
};
