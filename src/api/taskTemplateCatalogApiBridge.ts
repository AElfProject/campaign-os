import {
  isCanonicalLiveWalletAccountType,
  isCanonicalLiveWalletChainId,
  isCanonicalLiveWalletNetwork,
  isCanonicalLiveWalletSource,
} from "../domain/wallet";

export type TaskTemplateCatalogApiFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type TaskTemplateCatalogOperation = "adopt" | "detail" | "list";
export type TaskTemplateCatalogStatus = "active" | "deprecated" | "retired";
export type TaskTemplateAdoptionMode = "deferred" | "direct" | "manual_review";
export type TaskTemplateVerificationType = "DAPP_API" | "MANUAL" | "ON_CHAIN" | "SOCIAL" | "WALLET";
export type TaskTemplateWalletCompatibility = "AA_ONLY" | "ANY" | "EOA_ONLY";
export type TaskTemplateLocaleStatus = "ai_draft" | "exact" | "fallback" | "reviewed";

interface TaskTemplateCanonicalArray extends ReadonlyArray<TaskTemplateCanonicalValue> {}

interface TaskTemplateCanonicalObject {
  readonly [key: string]: TaskTemplateCanonicalValue;
}

export type TaskTemplateCanonicalValue =
  | boolean
  | null
  | number
  | string
  | TaskTemplateCanonicalArray
  | TaskTemplateCanonicalObject;

export interface TaskTemplateCatalogTemplate {
  readonly adoptionMode: TaskTemplateAdoptionMode;
  readonly catalogSchemaVersion: "task-template-catalog-v1";
  readonly category: string;
  readonly checksum: string;
  readonly content: Readonly<{
    description: string;
    title: string;
  }>;
  readonly evidenceRule: Readonly<Record<string, TaskTemplateCanonicalValue>>;
  readonly locale: Readonly<{
    requestedLocale: string | null;
    resolvedLocale: string;
    status: TaskTemplateLocaleStatus;
  }>;
  readonly points: Readonly<{
    default: number;
    maximum: number;
    minimum: number;
  }>;
  readonly requiredPolicy: Readonly<{
    default: boolean;
    overrideAllowed: boolean;
  }>;
  readonly riskLevel: "high" | "low" | "medium";
  readonly status: TaskTemplateCatalogStatus;
  readonly templateCode: string;
  readonly verificationType: TaskTemplateVerificationType;
  readonly version: number;
  readonly walletCompatibility: TaskTemplateWalletCompatibility;
}

export interface TaskTemplateCatalogPage {
  readonly catalogSchemaVersion: "task-template-catalog-v1";
  readonly items: readonly TaskTemplateCatalogTemplate[];
  readonly page: Readonly<{
    limit: number;
    nextCursor: string | null;
  }>;
  readonly snapshotAt: string;
  readonly totalActive: number;
}

export interface TaskTemplateCatalogAdoptedTask {
  readonly campaignId: string;
  readonly replayed: boolean;
  readonly taskId: string;
  readonly templateChecksum: string;
  readonly templateCode: string;
  readonly templateVersion: number;
}

export interface TaskTemplateCatalogListInput {
  readonly categories?: readonly string[];
  readonly cursor?: string;
  readonly limit?: number;
  readonly locale?: string;
  readonly status?: TaskTemplateCatalogStatus;
  readonly verificationTypes?: readonly TaskTemplateVerificationType[];
  readonly walletCompatibility?: readonly TaskTemplateWalletCompatibility[];
}

export interface TaskTemplateCatalogDetailInput {
  readonly templateCode: string;
  readonly version: number;
}

export interface TaskTemplateCatalogAdoptInput {
  readonly campaignId: string;
  readonly idempotencyKey: string;
  readonly overrides?: Readonly<{
    points?: number;
    required?: boolean;
  }>;
  readonly template: Readonly<{
    templateCode: string;
    version: number;
  }>;
}

export interface TaskTemplateCatalogRequestContext {
  readonly signal?: AbortSignal;
  readonly traceId?: string;
}

export type TaskTemplateCatalogServerErrorCode =
  | "AUTH_CSRF_INVALID"
  | "AUTH_FORBIDDEN"
  | "AUTH_SESSION_INVALID"
  | "AUTH_SESSION_REQUIRED"
  | "TASK_TEMPLATE_ADOPTION_CONFLICT"
  | "TASK_TEMPLATE_ADOPTION_DEFERRED"
  | "TASK_TEMPLATE_ARGUMENT_INVALID"
  | "TASK_TEMPLATE_CATALOG_UNAVAILABLE"
  | "TASK_TEMPLATE_CLEANUP_FAILED"
  | "TASK_TEMPLATE_CLOSED"
  | "TASK_TEMPLATE_CORRUPT"
  | "TASK_TEMPLATE_CURSOR_INVALID"
  | "TASK_TEMPLATE_MANUAL_REVIEW_REQUIRED"
  | "TASK_TEMPLATE_NOT_FOUND"
  | "TASK_TEMPLATE_POLICY_MISMATCH"
  | "TASK_TEMPLATE_SCHEMA_NOT_READY"
  | "TASK_TEMPLATE_STALE";

export type TaskTemplateCatalogBridgeErrorCode =
  | TaskTemplateCatalogServerErrorCode
  | "BRIDGE_BASE_URL_INVALID"
  | "BRIDGE_BASE_URL_MISSING"
  | "BRIDGE_CLOSED"
  | "BRIDGE_INVALID_INPUT"
  | "BRIDGE_NETWORK_ERROR"
  | "BRIDGE_REQUEST_ABORTED"
  | "BRIDGE_REQUEST_TIMEOUT"
  | "BRIDGE_RESPONSE_CONTENT_TYPE_INVALID"
  | "BRIDGE_RESPONSE_IDENTITY_MISMATCH"
  | "BRIDGE_RESPONSE_LENGTH_INVALID"
  | "BRIDGE_RESPONSE_NON_JSON"
  | "BRIDGE_RESPONSE_OVERSIZE"
  | "BRIDGE_RESPONSE_SCHEMA_INVALID"
  | "BRIDGE_RESPONSE_STATUS_INVALID"
  | "BRIDGE_RESPONSE_TRACE_INVALID"
  | "BRIDGE_SESSION_INVALID";

export interface TaskTemplateCatalogFailure {
  readonly code: TaskTemplateCatalogBridgeErrorCode;
  readonly field: string;
  readonly httpStatus?: number;
  readonly ok: false;
  readonly operation: TaskTemplateCatalogOperation;
  readonly retryable: boolean;
  readonly traceId: string;
}

export interface TaskTemplateCatalogSuccess<TData> {
  readonly data: TData;
  readonly httpStatus: number;
  readonly ok: true;
  readonly traceId: string;
}

export type TaskTemplateCatalogListResult =
  | TaskTemplateCatalogFailure
  | TaskTemplateCatalogSuccess<TaskTemplateCatalogPage>;
export type TaskTemplateCatalogDetailResult =
  | TaskTemplateCatalogFailure
  | TaskTemplateCatalogSuccess<TaskTemplateCatalogTemplate>;
export type TaskTemplateCatalogAdoptResult =
  | TaskTemplateCatalogFailure
  | TaskTemplateCatalogSuccess<TaskTemplateCatalogAdoptedTask>;

export interface TaskTemplateCatalogApiBridge {
  adopt(
    input: TaskTemplateCatalogAdoptInput,
    context?: TaskTemplateCatalogRequestContext,
  ): Promise<TaskTemplateCatalogAdoptResult>;
  close(): void;
  detail(
    input: TaskTemplateCatalogDetailInput,
    context?: TaskTemplateCatalogRequestContext,
  ): Promise<TaskTemplateCatalogDetailResult>;
  list(
    input?: TaskTemplateCatalogListInput,
    context?: TaskTemplateCatalogRequestContext,
  ): Promise<TaskTemplateCatalogListResult>;
}

export interface TaskTemplateCatalogApiConfig {
  readonly baseUrl?: string;
  readonly maxResponseBytes?: number;
  readonly timeoutMs?: number;
  readonly tracePrefix?: string;
}

export interface CreateTaskTemplateCatalogApiBridgeOptions {
  readonly config?: TaskTemplateCatalogApiConfig;
  readonly fetchImpl?: TaskTemplateCatalogApiFetch;
  readonly traceIdGenerator?: (operation: TaskTemplateCatalogOperation) => string;
}

interface NormalizedConfig {
  readonly baseUrl?: string;
  readonly configCode?: "BRIDGE_BASE_URL_INVALID" | "BRIDGE_BASE_URL_MISSING";
  readonly maxResponseBytes: number;
  readonly timeoutMs: number;
  readonly tracePrefix: string;
}

interface CapturedContext {
  readonly invalid: boolean;
  readonly signal?: AbortSignal;
  readonly traceId?: string;
}

interface ManagedAbort {
  readonly cleanup: () => void;
  readonly controller: AbortController;
  readonly externalAborted: () => boolean;
  readonly timedOut: () => boolean;
}

interface WireResponse {
  readonly body: Record<string, unknown>;
  readonly httpStatus: number;
  readonly traceId: string;
}

const DEFAULT_TIMEOUT_MS = 2_000;
const DEFAULT_MAX_RESPONSE_BYTES = 256 * 1_024;
const MIN_TIMEOUT_MS = 100;
const MAX_TIMEOUT_MS = 30_000;
const MIN_RESPONSE_BYTES = 1_024;
const MAX_RESPONSE_BYTES = 256 * 1_024;
const DEFAULT_TRACE_PREFIX = "task-template-catalog";
const CATALOG_SCHEMA_VERSION = "task-template-catalog-v1" as const;
const TEMPLATE_VERSION_MAX = 2_147_483_647;
const POINTS_MAX = 1_000_000;
const TRACE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const UNSAFE_TRACE_PATTERN = /(?:bearer|cookie|credential|password|private|proof|secret|signature|token)/iu;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u;
const TEMPLATE_CODE_PATTERN = /^[a-z0-9][a-z0-9-]*$/u;
const CATEGORY_PATTERN = /^[a-z][a-z0-9-]*$/u;
const LOCALE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u;
const CHECKSUM_PATTERN = /^[a-f0-9]{64}$/u;
const CSRF_PATTERN = /^[A-Za-z0-9._-]+$/u;
const CONTENT_TYPE_PATTERN = /^application\/json(?:\s*;\s*charset=utf-8)?$/iu;
const STRICT_DECIMAL_PATTERN = /^(?:0|[1-9][0-9]*)$/u;
const SAFE_FIELD_PATTERN = /^[A-Za-z][A-Za-z0-9_.\[\]-]{0,127}$/u;
const SESSION_FIELDS = new Set([
  "absoluteExpiresAt",
  "accountType",
  "capabilities",
  "chainId",
  "idleExpiresAt",
  "issuedAt",
  "network",
  "roles",
  "sessionId",
  "status",
  "walletAddress",
  "walletSource",
]);
const TEMPLATE_FIELDS = new Set([
  "adoptionMode",
  "catalogSchemaVersion",
  "category",
  "checksum",
  "content",
  "evidenceRule",
  "locale",
  "points",
  "requiredPolicy",
  "riskLevel",
  "status",
  "templateCode",
  "verificationType",
  "version",
  "walletCompatibility",
]);
const SERVER_ERROR_CODES = new Set<TaskTemplateCatalogServerErrorCode>([
  "AUTH_CSRF_INVALID",
  "AUTH_FORBIDDEN",
  "AUTH_SESSION_INVALID",
  "AUTH_SESSION_REQUIRED",
  "TASK_TEMPLATE_ADOPTION_CONFLICT",
  "TASK_TEMPLATE_ADOPTION_DEFERRED",
  "TASK_TEMPLATE_ARGUMENT_INVALID",
  "TASK_TEMPLATE_CATALOG_UNAVAILABLE",
  "TASK_TEMPLATE_CLEANUP_FAILED",
  "TASK_TEMPLATE_CLOSED",
  "TASK_TEMPLATE_CORRUPT",
  "TASK_TEMPLATE_CURSOR_INVALID",
  "TASK_TEMPLATE_MANUAL_REVIEW_REQUIRED",
  "TASK_TEMPLATE_NOT_FOUND",
  "TASK_TEMPLATE_POLICY_MISMATCH",
  "TASK_TEMPLATE_SCHEMA_NOT_READY",
  "TASK_TEMPLATE_STALE",
]);
const RETRYABLE_SERVER_ERROR_CODES = new Set<TaskTemplateCatalogServerErrorCode>([
  "TASK_TEMPLATE_CATALOG_UNAVAILABLE",
  "TASK_TEMPLATE_CLEANUP_FAILED",
  "TASK_TEMPLATE_SCHEMA_NOT_READY",
]);
const CATALOG_STATUSES = new Set<TaskTemplateCatalogStatus>(["active", "deprecated", "retired"]);
const ADOPTION_MODES = new Set<TaskTemplateAdoptionMode>(["direct", "manual_review", "deferred"]);
const VERIFICATION_TYPES = new Set<TaskTemplateVerificationType>([
  "WALLET",
  "ON_CHAIN",
  "DAPP_API",
  "SOCIAL",
  "MANUAL",
]);
const WALLET_COMPATIBILITIES = new Set<TaskTemplateWalletCompatibility>(["ANY", "AA_ONLY", "EOA_ONLY"]);
const LOCALE_STATUSES = new Set<TaskTemplateLocaleStatus>(["exact", "reviewed", "ai_draft", "fallback"]);
const RISK_LEVELS = new Set(["low", "medium", "high"] as const);
const FORBIDDEN_JSON_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const utf8Bytes = (value: string): number => new TextEncoder().encode(value).byteLength;

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
};

const ownEntries = (value: unknown): readonly (readonly [string, unknown])[] | undefined => {
  try {
    if (!isPlainRecord(value)) {
      return undefined;
    }
    const entries: Array<readonly [string, unknown]> = [];
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") {
        return undefined;
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || !("value" in descriptor)) {
        return undefined;
      }
      entries.push([key, descriptor.value]);
    }
    return entries;
  } catch {
    return undefined;
  }
};

const ownValue = (value: Record<string, unknown>, key: string): unknown => {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && "value" in descriptor ? descriptor.value : undefined;
  } catch {
    return undefined;
  }
};

const exactRecord = (
  value: unknown,
  allowed: ReadonlySet<string>,
  required: ReadonlySet<string> = allowed,
): value is Record<string, unknown> => {
  const entries = ownEntries(value);
  return entries !== undefined
    && entries.every(([key]) => allowed.has(key))
    && [...required].every((key) => entries.some(([observed]) => observed === key));
};

const safeTraceId = (value: unknown): value is string => typeof value === "string"
  && TRACE_PATTERN.test(value)
  && !UNSAFE_TRACE_PATTERN.test(value);

const safeIdentifier = (value: unknown, maximum: number): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= maximum
  && IDENTIFIER_PATTERN.test(value);

const canonicalInstant = (value: unknown): value is string => {
  if (typeof value !== "string" || value.length > 32) {
    return false;
  }
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value;
};

const clampNumber = (
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number => Number.isFinite(value)
  ? Math.min(maximum, Math.max(minimum, Math.trunc(value ?? fallback)))
  : fallback;

const normalizeTracePrefix = (value: string | undefined): string => {
  const normalized = typeof value === "string"
    ? value.toLowerCase().replace(/[^a-z0-9-]+/gu, "-").replace(/^-+|-+$/gu, "").slice(0, 48)
    : "";
  return normalized && !UNSAFE_TRACE_PATTERN.test(normalized) ? normalized : DEFAULT_TRACE_PREFIX;
};

const normalizeBaseUrl = (value: string | undefined): Pick<NormalizedConfig, "baseUrl" | "configCode"> => {
  if (!value?.trim()) {
    return { configCode: "BRIDGE_BASE_URL_MISSING" };
  }
  try {
    const parsed = new URL(value.trim());
    const loopbackHttp = parsed.protocol === "http:"
      && (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost" || parsed.hostname === "[::1]");
    if (
      parsed.username
      || parsed.password
      || parsed.search
      || parsed.hash
      || (parsed.pathname !== "" && parsed.pathname !== "/")
      || (parsed.protocol !== "https:" && !loopbackHttp)
    ) {
      return { configCode: "BRIDGE_BASE_URL_INVALID" };
    }
    return { baseUrl: parsed.origin };
  } catch {
    return { configCode: "BRIDGE_BASE_URL_INVALID" };
  }
};

const normalizeConfig = (config: TaskTemplateCatalogApiConfig | undefined): NormalizedConfig => ({
  ...normalizeBaseUrl(config?.baseUrl),
  maxResponseBytes: clampNumber(
    config?.maxResponseBytes,
    DEFAULT_MAX_RESPONSE_BYTES,
    MIN_RESPONSE_BYTES,
    MAX_RESPONSE_BYTES,
  ),
  timeoutMs: clampNumber(config?.timeoutMs, DEFAULT_TIMEOUT_MS, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS),
  tracePrefix: normalizeTracePrefix(config?.tracePrefix),
});

const captureFactoryOptions = (
  value: unknown,
): Readonly<{
  config?: TaskTemplateCatalogApiConfig;
  fetchImpl?: TaskTemplateCatalogApiFetch;
  invalid: boolean;
  traceIdGenerator?: (operation: TaskTemplateCatalogOperation) => string;
}> => {
  const entries = ownEntries(value);
  if (!entries || entries.some(([key]) => !["config", "fetchImpl", "traceIdGenerator"].includes(key))) {
    return { invalid: true };
  }
  const configValue = entries.find(([key]) => key === "config")?.[1];
  const fetchImpl = entries.find(([key]) => key === "fetchImpl")?.[1];
  const traceIdGenerator = entries.find(([key]) => key === "traceIdGenerator")?.[1];
  if (
    (fetchImpl !== undefined && typeof fetchImpl !== "function")
    || (traceIdGenerator !== undefined && typeof traceIdGenerator !== "function")
  ) {
    return { invalid: true };
  }

  let config: TaskTemplateCatalogApiConfig | undefined;
  if (configValue !== undefined) {
    const configEntries = ownEntries(configValue);
    if (!configEntries || configEntries.some(([key]) => ![
      "baseUrl",
      "maxResponseBytes",
      "timeoutMs",
      "tracePrefix",
    ].includes(key))) {
      return { invalid: true };
    }
    const baseUrl = configEntries.find(([key]) => key === "baseUrl")?.[1];
    const maxResponseBytes = configEntries.find(([key]) => key === "maxResponseBytes")?.[1];
    const timeoutMs = configEntries.find(([key]) => key === "timeoutMs")?.[1];
    const tracePrefix = configEntries.find(([key]) => key === "tracePrefix")?.[1];
    if (
      (baseUrl !== undefined && typeof baseUrl !== "string")
      || (maxResponseBytes !== undefined && typeof maxResponseBytes !== "number")
      || (timeoutMs !== undefined && typeof timeoutMs !== "number")
      || (tracePrefix !== undefined && typeof tracePrefix !== "string")
    ) {
      return { invalid: true };
    }
    config = Object.freeze({
      ...(baseUrl === undefined ? {} : { baseUrl }),
      ...(maxResponseBytes === undefined ? {} : { maxResponseBytes }),
      ...(timeoutMs === undefined ? {} : { timeoutMs }),
      ...(tracePrefix === undefined ? {} : { tracePrefix }),
    });
  }
  return Object.freeze({
    ...(config === undefined ? {} : { config }),
    ...(fetchImpl === undefined ? {} : { fetchImpl: fetchImpl as TaskTemplateCatalogApiFetch }),
    invalid: false,
    ...(traceIdGenerator === undefined
      ? {}
      : { traceIdGenerator: traceIdGenerator as (operation: TaskTemplateCatalogOperation) => string }),
  });
};

const failure = ({
  code,
  field,
  httpStatus,
  operation,
  retryable = false,
  traceId,
}: Omit<TaskTemplateCatalogFailure, "ok">): TaskTemplateCatalogFailure => Object.freeze({
  code,
  field,
  ...(httpStatus === undefined ? {} : { httpStatus }),
  ok: false as const,
  operation,
  retryable,
  traceId,
});

const invalidInput = (
  operation: TaskTemplateCatalogOperation,
  field: string,
  traceId: string,
): TaskTemplateCatalogFailure => failure({
  code: "BRIDGE_INVALID_INPUT",
  field,
  operation,
  retryable: false,
  traceId,
});

const protocolFailure = (
  code: Extract<TaskTemplateCatalogBridgeErrorCode, `BRIDGE_RESPONSE_${string}` | "BRIDGE_SESSION_INVALID">,
  field: string,
  operation: TaskTemplateCatalogOperation,
  traceId: string,
  httpStatus: number,
): TaskTemplateCatalogFailure => failure({ code, field, httpStatus, operation, retryable: false, traceId });

const captureContext = (value: TaskTemplateCatalogRequestContext | undefined): CapturedContext => {
  if (value === undefined) {
    return { invalid: false };
  }
  const entries = ownEntries(value);
  if (!entries || entries.some(([key]) => key !== "signal" && key !== "traceId")) {
    return { invalid: true };
  }
  const signal = entries.find(([key]) => key === "signal")?.[1];
  const traceId = entries.find(([key]) => key === "traceId")?.[1];
  if (
    signal !== undefined
    && (
      signal === null
      || typeof signal !== "object"
      || typeof (signal as AbortSignal).aborted !== "boolean"
      || typeof (signal as AbortSignal).addEventListener !== "function"
      || typeof (signal as AbortSignal).removeEventListener !== "function"
    )
  ) {
    return { invalid: true };
  }
  if (traceId !== undefined && !safeTraceId(traceId)) {
    return { invalid: true };
  }
  return {
    invalid: false,
    ...(signal === undefined ? {} : { signal: signal as AbortSignal }),
    ...(traceId === undefined ? {} : { traceId: traceId as string }),
  };
};

const createManagedAbort = (
  externalSignal: AbortSignal | undefined,
  timeoutMs: number,
): ManagedAbort => {
  const controller = new AbortController();
  let externalAborted = false;
  let listenerAttached = false;
  let cleaned = false;
  let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
  let timedOut = false;
  const onExternalAbort = () => {
    externalAborted = true;
    controller.abort();
  };
  try {
    if (externalSignal) {
      externalSignal.addEventListener("abort", onExternalAbort, { once: true });
      listenerAttached = true;
      if (externalSignal.aborted) {
        onExternalAbort();
      }
    }
    if (!externalAborted) {
      timer = globalThis.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
    }
  } catch (error) {
    if (timer !== undefined) {
      globalThis.clearTimeout(timer);
    }
    if (listenerAttached) {
      try {
        externalSignal?.removeEventListener("abort", onExternalAbort);
      } catch {
        // The setup failure remains authoritative.
      }
    }
    throw error;
  }
  return {
    cleanup: () => {
      if (cleaned) {
        return;
      }
      cleaned = true;
      if (timer !== undefined) {
        globalThis.clearTimeout(timer);
      }
      if (listenerAttached) {
        try {
          externalSignal?.removeEventListener("abort", onExternalAbort);
        } catch {
          // Cleanup cannot override the typed operation result.
        }
      }
    },
    controller,
    externalAborted: () => externalAborted,
    timedOut: () => timedOut,
  };
};

const raceWithAbort = async <TValue>(
  promise: Promise<TValue>,
  signal: AbortSignal,
): Promise<TValue> => {
  if (signal.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
  return new Promise<TValue>((resolve, reject) => {
    let settled = false;
    const settle = (action: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      signal.removeEventListener("abort", onAbort);
      action();
    };
    const onAbort = () => settle(() => reject(new DOMException("Aborted", "AbortError")));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => settle(() => resolve(value)),
      (error: unknown) => settle(() => reject(error)),
    );
  });
};

const responseLike = (value: unknown): value is Response => {
  try {
    const response = value as Response;
    return value !== null
      && typeof value === "object"
      && Number.isInteger(response.status)
      && response.status >= 100
      && response.status <= 599
      && response.headers !== null
      && typeof response.headers.get === "function"
      && typeof response.text === "function";
  } catch {
    return false;
  }
};

const cancelBody = (response: Response): void => {
  try {
    void response.body?.cancel().catch(() => undefined);
  } catch {
    // The protocol failure remains authoritative when body cleanup is unavailable.
  }
};

class ResponseReadError extends Error {
  readonly code: "BRIDGE_RESPONSE_LENGTH_INVALID" | "BRIDGE_RESPONSE_OVERSIZE";

  constructor(code: ResponseReadError["code"]) {
    super(code);
    this.code = code;
  }
}

const boundedResponseText = async (
  response: Response,
  maxBytes: number,
  signal: AbortSignal,
): Promise<string> => {
  const declared = response.headers.get("content-length");
  let declaredBytes: number | undefined;
  if (declared !== null) {
    if (!STRICT_DECIMAL_PATTERN.test(declared)) {
      cancelBody(response);
      throw new ResponseReadError("BRIDGE_RESPONSE_LENGTH_INVALID");
    }
    declaredBytes = Number(declared);
    if (!Number.isSafeInteger(declaredBytes) || declaredBytes > maxBytes) {
      cancelBody(response);
      throw new ResponseReadError("BRIDGE_RESPONSE_OVERSIZE");
    }
  }

  if (!response.body) {
    const value = await raceWithAbort(Promise.resolve(response.text()), signal);
    const actualBytes = utf8Bytes(value);
    if (actualBytes > maxBytes) {
      throw new ResponseReadError("BRIDGE_RESPONSE_OVERSIZE");
    }
    if (declaredBytes !== undefined && declaredBytes !== actualBytes) {
      throw new ResponseReadError("BRIDGE_RESPONSE_LENGTH_INVALID");
    }
    return value;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let actualBytes = 0;
  try {
    while (true) {
      const chunk = await raceWithAbort(reader.read(), signal);
      if (chunk.done) {
        break;
      }
      actualBytes += chunk.value.byteLength;
      if (actualBytes > maxBytes) {
        throw new ResponseReadError("BRIDGE_RESPONSE_OVERSIZE");
      }
      chunks.push(chunk.value);
    }
  } catch (error) {
    try {
      void reader.cancel().catch(() => undefined);
    } catch {
      // Preserve the bounded read failure when stream cancellation is unavailable.
    }
    throw error;
  } finally {
    reader.releaseLock();
  }
  if (declaredBytes !== undefined && declaredBytes !== actualBytes) {
    throw new ResponseReadError("BRIDGE_RESPONSE_LENGTH_INVALID");
  }
  const combined = new Uint8Array(actualBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(combined);
};

const allowedResponseStatus = (
  operation: TaskTemplateCatalogOperation | "hydrate",
  status: number,
): boolean => {
  if (operation === "hydrate") {
    return [200, 400, 401, 403, 409, 503].includes(status);
  }
  if (operation === "list") {
    return [200, 400, 401, 403, 422, 503].includes(status);
  }
  if (operation === "detail") {
    return [200, 400, 401, 403, 404, 503].includes(status);
  }
  return [200, 201, 400, 401, 403, 404, 409, 422, 503].includes(status);
};

const readWireResponse = async ({
  maxResponseBytes,
  operation,
  requestTraceId,
  response,
  responseTraceHeader,
  signal,
}: {
  readonly maxResponseBytes: number;
  readonly operation: TaskTemplateCatalogOperation | "hydrate";
  readonly requestTraceId: string;
  readonly response: Response;
  readonly responseTraceHeader: "x-campaign-os-trace-id" | "x-trace-id";
  readonly signal: AbortSignal;
}): Promise<TaskTemplateCatalogFailure | WireResponse> => {
  const failureOperation = operation === "hydrate" ? "adopt" : operation;
  let headerTraceId: string | undefined;
  try {
    const raw = response.headers.get(responseTraceHeader);
    headerTraceId = safeTraceId(raw) ? raw : undefined;
  } catch {
    headerTraceId = undefined;
  }
  if (!headerTraceId) {
    cancelBody(response);
    return protocolFailure(
      "BRIDGE_RESPONSE_TRACE_INVALID",
      "traceId",
      failureOperation,
      requestTraceId,
      response.status,
    );
  }
  if (!allowedResponseStatus(operation, response.status)) {
    cancelBody(response);
    return protocolFailure(
      "BRIDGE_RESPONSE_STATUS_INVALID",
      "status",
      failureOperation,
      requestTraceId,
      response.status,
    );
  }
  let contentType: string | null;
  try {
    contentType = response.headers.get("content-type");
  } catch {
    contentType = null;
  }
  if (!contentType || !CONTENT_TYPE_PATTERN.test(contentType)) {
    cancelBody(response);
    return protocolFailure(
      "BRIDGE_RESPONSE_CONTENT_TYPE_INVALID",
      "content-type",
      failureOperation,
      headerTraceId,
      response.status,
    );
  }
  let text: string;
  try {
    text = await boundedResponseText(response, maxResponseBytes, signal);
  } catch (error) {
    if (error instanceof ResponseReadError) {
      return protocolFailure(
        error.code,
        "response",
        failureOperation,
        headerTraceId,
        response.status,
      );
    }
    throw error;
  }
  let body: unknown;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    return protocolFailure(
      "BRIDGE_RESPONSE_NON_JSON",
      "response",
      failureOperation,
      headerTraceId,
      response.status,
    );
  }
  if (!isPlainRecord(body)) {
    return protocolFailure(
      "BRIDGE_RESPONSE_SCHEMA_INVALID",
      "response",
      failureOperation,
      headerTraceId,
      response.status,
    );
  }
  const bodyTraceId = ownValue(body, "traceId");
  if (!safeTraceId(bodyTraceId) || bodyTraceId !== headerTraceId) {
    return protocolFailure(
      "BRIDGE_RESPONSE_TRACE_INVALID",
      "traceId",
      failureOperation,
      requestTraceId,
      response.status,
    );
  }
  return { body, httpStatus: response.status, traceId: headerTraceId };
};

const boundedUniqueStrings = (
  value: unknown,
  maximumItems: number,
  maximumLength: number,
): readonly string[] | undefined => {
  if (!Array.isArray(value) || value.length > maximumItems) {
    return undefined;
  }
  const result: string[] = [];
  for (const item of value) {
    if (!safeIdentifier(item, maximumLength)) {
      return undefined;
    }
    result.push(item);
  }
  return new Set(result).size === result.length ? Object.freeze(result) : undefined;
};

const validHydratedSession = (value: unknown): boolean => {
  if (!exactRecord(value, SESSION_FIELDS)) {
    return false;
  }
  const absoluteExpiresAt = ownValue(value, "absoluteExpiresAt");
  const idleExpiresAt = ownValue(value, "idleExpiresAt");
  const issuedAt = ownValue(value, "issuedAt");
  return canonicalInstant(absoluteExpiresAt)
    && isCanonicalLiveWalletAccountType(ownValue(value, "accountType"))
    && boundedUniqueStrings(ownValue(value, "capabilities"), 32, 80) !== undefined
    && isCanonicalLiveWalletChainId(ownValue(value, "chainId"))
    && canonicalInstant(idleExpiresAt)
    && canonicalInstant(issuedAt)
    && isCanonicalLiveWalletNetwork(ownValue(value, "network"))
    && boundedUniqueStrings(ownValue(value, "roles"), 32, 80) !== undefined
    && safeIdentifier(ownValue(value, "sessionId"), 160)
    && ownValue(value, "status") === "active"
    && safeIdentifier(ownValue(value, "walletAddress"), 160)
    && isCanonicalLiveWalletSource(ownValue(value, "walletSource"))
    && Date.parse(issuedAt) <= Date.parse(idleExpiresAt)
    && Date.parse(idleExpiresAt) <= Date.parse(absoluteExpiresAt);
};

const decodeHydration = (
  wire: WireResponse,
  operation: "adopt",
): TaskTemplateCatalogFailure | string => {
  if (wire.httpStatus !== 200) {
    return failure({
      code: "BRIDGE_SESSION_INVALID",
      field: "session",
      httpStatus: wire.httpStatus,
      operation,
      retryable: wire.httpStatus === 503,
      traceId: wire.traceId,
    });
  }
  const rootFields = new Set(["data", "ok", "traceId"]);
  if (!exactRecord(wire.body, rootFields) || ownValue(wire.body, "ok") !== true) {
    return protocolFailure("BRIDGE_SESSION_INVALID", "session", operation, wire.traceId, wire.httpStatus);
  }
  const data = ownValue(wire.body, "data");
  if (!exactRecord(data, new Set(["csrfToken", "session"]))) {
    return protocolFailure("BRIDGE_SESSION_INVALID", "session", operation, wire.traceId, wire.httpStatus);
  }
  const csrfToken = ownValue(data, "csrfToken");
  if (
    typeof csrfToken !== "string"
    || csrfToken.length < 32
    || csrfToken.length > 512
    || !CSRF_PATTERN.test(csrfToken)
    || !validHydratedSession(ownValue(data, "session"))
  ) {
    return protocolFailure("BRIDGE_SESSION_INVALID", "session", operation, wire.traceId, wire.httpStatus);
  }
  return csrfToken;
};

const validCanonicalValue = (value: unknown, depth = 0): value is TaskTemplateCanonicalValue => {
  if (depth > 8) {
    return false;
  }
  if (value === null || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (typeof value === "string") {
    return utf8Bytes(value) <= 4_096;
  }
  if (Array.isArray(value)) {
    return value.length <= 64 && value.every((item) => validCanonicalValue(item, depth + 1));
  }
  const entries = ownEntries(value);
  return entries !== undefined
    && entries.length <= 32
    && entries.every(([key, item]) =>
      key.length > 0
      && utf8Bytes(key) <= 96
      && !FORBIDDEN_JSON_KEYS.has(key)
      && validCanonicalValue(item, depth + 1));
};

class DecodeError extends Error {
  readonly kind: "identity" | "schema";

  constructor(kind: DecodeError["kind"]) {
    super(kind);
    this.kind = kind;
  }
}

const schemaError = (): never => {
  throw new DecodeError("schema");
};

const identityError = (): never => {
  throw new DecodeError("identity");
};

const decodeTemplate = (value: unknown): TaskTemplateCatalogTemplate => {
  if (!exactRecord(value, TEMPLATE_FIELDS)) {
    return schemaError();
  }
  const catalogSchemaVersion = ownValue(value, "catalogSchemaVersion");
  const templateCode = ownValue(value, "templateCode");
  const version = ownValue(value, "version");
  const checksum = ownValue(value, "checksum");
  const status = ownValue(value, "status");
  const adoptionMode = ownValue(value, "adoptionMode");
  const category = ownValue(value, "category");
  const verificationType = ownValue(value, "verificationType");
  const walletCompatibility = ownValue(value, "walletCompatibility");
  const riskLevel = ownValue(value, "riskLevel");
  if (
    catalogSchemaVersion !== CATALOG_SCHEMA_VERSION
    || typeof templateCode !== "string"
    || templateCode.length > 96
    || !TEMPLATE_CODE_PATTERN.test(templateCode)
    || !Number.isSafeInteger(version)
    || (version as number) < 1
    || (version as number) > TEMPLATE_VERSION_MAX
    || !CATALOG_STATUSES.has(status as TaskTemplateCatalogStatus)
    || !ADOPTION_MODES.has(adoptionMode as TaskTemplateAdoptionMode)
    || typeof category !== "string"
    || category.length > 64
    || !CATEGORY_PATTERN.test(category)
    || !VERIFICATION_TYPES.has(verificationType as TaskTemplateVerificationType)
    || !WALLET_COMPATIBILITIES.has(walletCompatibility as TaskTemplateWalletCompatibility)
    || !RISK_LEVELS.has(riskLevel as "high" | "low" | "medium")
  ) {
    return schemaError();
  }
  if (typeof checksum !== "string" || !CHECKSUM_PATTERN.test(checksum)) {
    return identityError();
  }
  const points = ownValue(value, "points");
  if (!exactRecord(points, new Set(["default", "maximum", "minimum"]))) {
    return schemaError();
  }
  const defaultPoints = ownValue(points, "default");
  const maximum = ownValue(points, "maximum");
  const minimum = ownValue(points, "minimum");
  if (
    !Number.isSafeInteger(defaultPoints)
    || !Number.isSafeInteger(maximum)
    || !Number.isSafeInteger(minimum)
    || (defaultPoints as number) < 0
    || (maximum as number) < 0
    || (minimum as number) < 0
    || (defaultPoints as number) > POINTS_MAX
    || (maximum as number) > POINTS_MAX
    || (minimum as number) > POINTS_MAX
  ) {
    return schemaError();
  }
  const requiredPolicy = ownValue(value, "requiredPolicy");
  if (
    !exactRecord(requiredPolicy, new Set(["default", "overrideAllowed"]))
    || typeof ownValue(requiredPolicy, "default") !== "boolean"
    || typeof ownValue(requiredPolicy, "overrideAllowed") !== "boolean"
  ) {
    return schemaError();
  }
  const locale = ownValue(value, "locale");
  if (!exactRecord(locale, new Set(["requestedLocale", "resolvedLocale", "status"]))) {
    return schemaError();
  }
  const requestedLocale = ownValue(locale, "requestedLocale");
  const resolvedLocale = ownValue(locale, "resolvedLocale");
  const localeStatus = ownValue(locale, "status");
  if (
    (requestedLocale !== null && (
      typeof requestedLocale !== "string"
      || requestedLocale.length > 35
      || !LOCALE_PATTERN.test(requestedLocale)
    ))
    || typeof resolvedLocale !== "string"
    || resolvedLocale.length > 35
    || !LOCALE_PATTERN.test(resolvedLocale)
    || !LOCALE_STATUSES.has(localeStatus as TaskTemplateLocaleStatus)
  ) {
    return schemaError();
  }
  const content = ownValue(value, "content");
  if (!exactRecord(content, new Set(["description", "title"]))) {
    return schemaError();
  }
  const title = ownValue(content, "title");
  const description = ownValue(content, "description");
  if (
    typeof title !== "string"
    || title.length < 1
    || title.length > 160
    || typeof description !== "string"
    || description.length < 1
    || description.length > 1_000
  ) {
    return schemaError();
  }
  const evidenceRule = ownValue(value, "evidenceRule");
  if (!isPlainRecord(evidenceRule) || Reflect.ownKeys(evidenceRule).length > 32 || !validCanonicalValue(evidenceRule)) {
    return schemaError();
  }

  const frozenEvidenceRule = deepFreezeCanonical(evidenceRule as Record<string, TaskTemplateCanonicalValue>);
  return Object.freeze({
    adoptionMode: adoptionMode as TaskTemplateAdoptionMode,
    catalogSchemaVersion: CATALOG_SCHEMA_VERSION,
    category,
    checksum,
    content: Object.freeze({ description, title }),
    evidenceRule: frozenEvidenceRule,
    locale: Object.freeze({
      requestedLocale: requestedLocale as string | null,
      resolvedLocale,
      status: localeStatus as TaskTemplateLocaleStatus,
    }),
    points: Object.freeze({
      default: defaultPoints as number,
      maximum: maximum as number,
      minimum: minimum as number,
    }),
    requiredPolicy: Object.freeze({
      default: ownValue(requiredPolicy, "default") as boolean,
      overrideAllowed: ownValue(requiredPolicy, "overrideAllowed") as boolean,
    }),
    riskLevel: riskLevel as "high" | "low" | "medium",
    status: status as TaskTemplateCatalogStatus,
    templateCode,
    verificationType: verificationType as TaskTemplateVerificationType,
    version: version as number,
    walletCompatibility: walletCompatibility as TaskTemplateWalletCompatibility,
  });
};

function deepFreezeCanonical<TValue extends TaskTemplateCanonicalValue>(value: TValue): TValue {
  if (Array.isArray(value)) {
    (value as readonly TaskTemplateCanonicalValue[]).forEach((item) => deepFreezeCanonical(item));
  } else if (isPlainRecord(value)) {
    Object.values(value).forEach((item) => deepFreezeCanonical(item as TaskTemplateCanonicalValue));
  }
  return Object.freeze(value);
}

const decodePage = (
  value: unknown,
  requestedLocale: string | undefined,
): TaskTemplateCatalogPage => {
  if (!exactRecord(value, new Set(["catalogSchemaVersion", "items", "page", "snapshotAt", "totalActive"]))) {
    return schemaError();
  }
  const items = ownValue(value, "items");
  const snapshotAt = ownValue(value, "snapshotAt");
  const totalActive = ownValue(value, "totalActive");
  if (
    ownValue(value, "catalogSchemaVersion") !== CATALOG_SCHEMA_VERSION
    || !Array.isArray(items)
    || items.length > 100
    || !canonicalInstant(snapshotAt)
    || !Number.isSafeInteger(totalActive)
    || (totalActive as number) < 0
  ) {
    return schemaError();
  }
  const decodedItems = items.map((item) => decodeTemplate(item));
  const expectedLocale = requestedLocale ?? null;
  if (decodedItems.some((item) => item.locale.requestedLocale !== expectedLocale)) {
    return identityError();
  }
  const identities = decodedItems.map((item) => `${item.templateCode}:${item.version}`);
  if (new Set(identities).size !== identities.length) {
    return identityError();
  }
  const page = ownValue(value, "page");
  if (!exactRecord(page, new Set(["limit", "nextCursor"]))) {
    return schemaError();
  }
  const limit = ownValue(page, "limit");
  const nextCursor = ownValue(page, "nextCursor");
  if (
    !Number.isSafeInteger(limit)
    || (limit as number) < 1
    || (limit as number) > 100
    || (nextCursor !== null && (
      typeof nextCursor !== "string"
      || nextCursor.length === 0
      || nextCursor.length > 2_048
    ))
  ) {
    return schemaError();
  }
  return Object.freeze({
    catalogSchemaVersion: CATALOG_SCHEMA_VERSION,
    items: Object.freeze(decodedItems),
    page: Object.freeze({ limit: limit as number, nextCursor: nextCursor as string | null }),
    snapshotAt,
    totalActive: totalActive as number,
  });
};

const decodeAdoptedTask = (
  value: unknown,
  input: TaskTemplateCatalogAdoptInput,
  httpStatus: number,
): TaskTemplateCatalogAdoptedTask => {
  if (!exactRecord(value, new Set([
    "campaignId",
    "replayed",
    "taskId",
    "templateChecksum",
    "templateCode",
    "templateVersion",
  ]))) {
    return schemaError();
  }
  const campaignId = ownValue(value, "campaignId");
  const taskId = ownValue(value, "taskId");
  const templateCode = ownValue(value, "templateCode");
  const templateVersion = ownValue(value, "templateVersion");
  const templateChecksum = ownValue(value, "templateChecksum");
  const replayed = ownValue(value, "replayed");
  if (
    !safeIdentifier(campaignId, 128)
    || !safeIdentifier(taskId, 160)
    || typeof templateCode !== "string"
    || !TEMPLATE_CODE_PATTERN.test(templateCode)
    || !Number.isSafeInteger(templateVersion)
    || typeof replayed !== "boolean"
  ) {
    return schemaError();
  }
  if (typeof templateChecksum !== "string" || !CHECKSUM_PATTERN.test(templateChecksum)) {
    return identityError();
  }
  if (
    campaignId !== input.campaignId
    || templateCode !== input.template.templateCode
    || templateVersion !== input.template.version
    || (httpStatus === 200) !== replayed
    || (httpStatus === 201) === replayed
  ) {
    return identityError();
  }
  return Object.freeze({
    campaignId,
    replayed,
    taskId,
    templateChecksum,
    templateCode,
    templateVersion: templateVersion as number,
  });
};

const errorStatusMatches = (
  operation: TaskTemplateCatalogOperation,
  status: number,
  code: TaskTemplateCatalogServerErrorCode,
): boolean => {
  if (status === 400) {
    return code === "TASK_TEMPLATE_ARGUMENT_INVALID"
      || (operation === "list" && code === "TASK_TEMPLATE_CURSOR_INVALID");
  }
  if (status === 401) {
    return code === "AUTH_SESSION_REQUIRED" || code === "AUTH_SESSION_INVALID";
  }
  if (status === 403) {
    return code === "AUTH_FORBIDDEN" || (operation === "adopt" && code === "AUTH_CSRF_INVALID");
  }
  if (status === 404) {
    return operation !== "list" && code === "TASK_TEMPLATE_NOT_FOUND";
  }
  if (status === 409) {
    return operation === "adopt" && code === "TASK_TEMPLATE_ADOPTION_CONFLICT";
  }
  if (status === 422) {
    return operation === "adopt" && [
      "TASK_TEMPLATE_STALE",
      "TASK_TEMPLATE_ADOPTION_DEFERRED",
      "TASK_TEMPLATE_MANUAL_REVIEW_REQUIRED",
      "TASK_TEMPLATE_POLICY_MISMATCH",
    ].includes(code);
  }
  if (status === 503) {
    return [
      "TASK_TEMPLATE_CORRUPT",
      "TASK_TEMPLATE_SCHEMA_NOT_READY",
      "TASK_TEMPLATE_CATALOG_UNAVAILABLE",
      "TASK_TEMPLATE_CLOSED",
      "TASK_TEMPLATE_CLEANUP_FAILED",
    ].includes(code);
  }
  return false;
};

const decodeErrorEnvelope = (
  wire: WireResponse,
  operation: TaskTemplateCatalogOperation,
): TaskTemplateCatalogFailure => {
  if (!exactRecord(wire.body, new Set(["error", "ok", "traceId"])) || ownValue(wire.body, "ok") !== false) {
    return protocolFailure("BRIDGE_RESPONSE_SCHEMA_INVALID", "response", operation, wire.traceId, wire.httpStatus);
  }
  const error = ownValue(wire.body, "error");
  if (!exactRecord(error, new Set(["code", "field", "operation", "retryable"]))) {
    return protocolFailure("BRIDGE_RESPONSE_SCHEMA_INVALID", "error", operation, wire.traceId, wire.httpStatus);
  }
  const code = ownValue(error, "code");
  const field = ownValue(error, "field");
  const errorOperation = ownValue(error, "operation");
  const retryable = ownValue(error, "retryable");
  const canonicalRetryable = RETRYABLE_SERVER_ERROR_CODES.has(code as TaskTemplateCatalogServerErrorCode);
  if (
    !SERVER_ERROR_CODES.has(code as TaskTemplateCatalogServerErrorCode)
    || typeof field !== "string"
    || !SAFE_FIELD_PATTERN.test(field)
    || errorOperation !== operation
    || retryable !== canonicalRetryable
    || !errorStatusMatches(operation, wire.httpStatus, code as TaskTemplateCatalogServerErrorCode)
  ) {
    return protocolFailure("BRIDGE_RESPONSE_SCHEMA_INVALID", "error", operation, wire.traceId, wire.httpStatus);
  }
  return failure({
    code: code as TaskTemplateCatalogServerErrorCode,
    field,
    httpStatus: wire.httpStatus,
    operation,
    retryable,
    traceId: wire.traceId,
  });
};

const successData = (wire: WireResponse): unknown => {
  if (!exactRecord(wire.body, new Set(["data", "ok", "traceId"])) || ownValue(wire.body, "ok") !== true) {
    return schemaError();
  }
  return ownValue(wire.body, "data");
};

const validArrayInput = <TValue extends string>(
  value: unknown,
  options: {
    readonly allowed?: ReadonlySet<TValue>;
    readonly itemMaximum: number;
    readonly joinedMaximum: number;
    readonly maximumItems: number;
    readonly pattern?: RegExp;
  },
): value is readonly TValue[] => {
  if (!Array.isArray(value) || value.length === 0 || value.length > options.maximumItems) {
    return false;
  }
  const values: string[] = [];
  for (const item of value) {
    if (
      typeof item !== "string"
      || item.length === 0
      || item.length > options.itemMaximum
      || item !== item.trim()
      || (options.pattern && !options.pattern.test(item))
      || (options.allowed && !options.allowed.has(item as TValue))
    ) {
      return false;
    }
    values.push(item);
  }
  return new Set(values).size === values.length && values.join(",").length <= options.joinedMaximum;
};

const captureListInput = (
  value: unknown,
): { readonly input?: TaskTemplateCatalogListInput; readonly invalidField?: string } => {
  try {
    if (value === undefined) {
      return { input: Object.freeze({}) };
    }
    const allowed = new Set([
      "categories",
      "cursor",
      "limit",
      "locale",
      "status",
      "verificationTypes",
      "walletCompatibility",
    ]);
    if (!exactRecord(value, allowed, new Set())) {
      return { invalidField: "input" };
    }
    const categories = ownValue(value, "categories");
    const cursor = ownValue(value, "cursor");
    const limit = ownValue(value, "limit");
    const locale = ownValue(value, "locale");
    const status = ownValue(value, "status");
    const verificationTypes = ownValue(value, "verificationTypes");
    const walletCompatibility = ownValue(value, "walletCompatibility");
    if (categories !== undefined && !validArrayInput<string>(categories, {
      itemMaximum: 64,
      joinedMaximum: 512,
      maximumItems: 16,
      pattern: CATEGORY_PATTERN,
    })) {
      return { invalidField: "categories" };
    }
    if (verificationTypes !== undefined && !validArrayInput(verificationTypes, {
      allowed: VERIFICATION_TYPES,
      itemMaximum: 16,
      joinedMaximum: 256,
      maximumItems: 8,
    })) {
      return { invalidField: "verificationTypes" };
    }
    if (walletCompatibility !== undefined && !validArrayInput(walletCompatibility, {
      allowed: WALLET_COMPATIBILITIES,
      itemMaximum: 16,
      joinedMaximum: 64,
      maximumItems: 3,
    })) {
      return { invalidField: "walletCompatibility" };
    }
    if (locale !== undefined && (
      typeof locale !== "string"
      || locale.length < 2
      || locale.length > 35
      || !LOCALE_PATTERN.test(locale)
    )) {
      return { invalidField: "locale" };
    }
    if (status !== undefined && !CATALOG_STATUSES.has(status as TaskTemplateCatalogStatus)) {
      return { invalidField: "status" };
    }
    if (cursor !== undefined && (
      typeof cursor !== "string"
      || cursor.length === 0
      || cursor.length > 2_048
    )) {
      return { invalidField: "cursor" };
    }
    if (limit !== undefined && (
      !Number.isSafeInteger(limit)
      || (limit as number) < 1
      || (limit as number) > 100
    )) {
      return { invalidField: "limit" };
    }
    return { input: Object.freeze({
      ...(categories === undefined ? {} : { categories: Object.freeze([...(categories as string[])]) }),
      ...(cursor === undefined ? {} : { cursor: cursor as string }),
      ...(limit === undefined ? {} : { limit: limit as number }),
      ...(locale === undefined ? {} : { locale: locale as string }),
      ...(status === undefined ? {} : { status: status as TaskTemplateCatalogStatus }),
      ...(verificationTypes === undefined
        ? {}
        : { verificationTypes: Object.freeze([...(verificationTypes as TaskTemplateVerificationType[])]) }),
      ...(walletCompatibility === undefined
        ? {}
        : { walletCompatibility: Object.freeze([...(walletCompatibility as TaskTemplateWalletCompatibility[])]) }),
    }) };
  } catch {
    return { invalidField: "input" };
  }
};

const captureDetailInput = (
  value: unknown,
): { readonly input?: TaskTemplateCatalogDetailInput; readonly invalidField?: string } => {
  try {
    if (!exactRecord(value, new Set(["templateCode", "version"]))) {
      return { invalidField: "input" };
    }
    const templateCode = ownValue(value, "templateCode");
    const version = ownValue(value, "version");
    if (
      typeof templateCode !== "string"
      || templateCode.length > 96
      || !TEMPLATE_CODE_PATTERN.test(templateCode)
    ) {
      return { invalidField: "templateCode" };
    }
    if (!Number.isSafeInteger(version) || (version as number) < 1 || (version as number) > TEMPLATE_VERSION_MAX) {
      return { invalidField: "version" };
    }
    return { input: Object.freeze({ templateCode, version: version as number }) };
  } catch {
    return { invalidField: "input" };
  }
};

const captureAdoptInput = (
  value: unknown,
): { readonly input?: TaskTemplateCatalogAdoptInput; readonly invalidField?: string } => {
  try {
    if (!exactRecord(
      value,
      new Set(["campaignId", "idempotencyKey", "overrides", "template"]),
      new Set(["campaignId", "idempotencyKey", "template"]),
    )) {
      return { invalidField: "input" };
    }
    const campaignId = ownValue(value, "campaignId");
    const idempotencyKey = ownValue(value, "idempotencyKey");
    const rawOverrides = ownValue(value, "overrides");
    const template = captureDetailInput(ownValue(value, "template"));
    if (!safeIdentifier(campaignId, 128)) {
      return { invalidField: "campaignId" };
    }
    if (!safeIdentifier(idempotencyKey, 128) || idempotencyKey.length < 8) {
      return { invalidField: "idempotencyKey" };
    }
    if (!template.input) {
      return { invalidField: "template" };
    }
    let overrides: TaskTemplateCatalogAdoptInput["overrides"];
    if (rawOverrides !== undefined) {
      const overrideEntries = ownEntries(rawOverrides);
      if (
        !overrideEntries
        || overrideEntries.length === 0
        || !exactRecord(rawOverrides, new Set(["points", "required"]), new Set())
      ) {
        return { invalidField: "overrides" };
      }
      const points = ownValue(rawOverrides, "points");
      const required = ownValue(rawOverrides, "required");
      if (points !== undefined && (
        !Number.isSafeInteger(points)
        || (points as number) < 0
        || (points as number) > POINTS_MAX
      )) {
        return { invalidField: "overrides.points" };
      }
      if (required !== undefined && typeof required !== "boolean") {
        return { invalidField: "overrides.required" };
      }
      overrides = Object.freeze({
        ...(points === undefined ? {} : { points: points as number }),
        ...(required === undefined ? {} : { required }),
      });
    }
    return { input: Object.freeze({
      campaignId,
      idempotencyKey,
      ...(overrides === undefined ? {} : { overrides }),
      template: template.input,
    }) };
  } catch {
    return { invalidField: "input" };
  }
};

const listPath = (input: TaskTemplateCatalogListInput): string => {
  const query = new URLSearchParams();
  if (input.categories) query.set("category", input.categories.join(","));
  if (input.verificationTypes) query.set("verification", input.verificationTypes.join(","));
  if (input.walletCompatibility) query.set("wallet", input.walletCompatibility.join(","));
  if (input.locale) query.set("locale", input.locale);
  if (input.status) query.set("status", input.status);
  if (input.cursor) query.set("cursor", input.cursor);
  if (input.limit !== undefined) query.set("limit", String(input.limit));
  const encoded = query.toString();
  return `/api/task-templates${encoded ? `?${encoded}` : ""}`;
};

export const createTaskTemplateCatalogApiBridge = (
  options: CreateTaskTemplateCatalogApiBridgeOptions = {},
): TaskTemplateCatalogApiBridge => {
  const capturedFactory = captureFactoryOptions(options);
  const config = normalizeConfig(capturedFactory.config);
  const fetchImpl = capturedFactory.fetchImpl
    ?? ((input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init));
  const activeControllers = new Set<AbortController>();
  let closed = false;
  let traceSequence = 0;

  const nextTraceId = (
    operation: TaskTemplateCatalogOperation,
    candidate: string | undefined,
  ): string => {
    if (safeTraceId(candidate)) {
      return candidate;
    }
    try {
      const generated = capturedFactory.traceIdGenerator?.(operation);
      if (safeTraceId(generated)) {
        return generated;
      }
    } catch {
      // Use the local opaque identifier below.
    }
    traceSequence += 1;
    return `${config.tracePrefix}-${operation}-${traceSequence}`;
  };

  const runOperation = async <TResult>(
    operation: TaskTemplateCatalogOperation,
    context: TaskTemplateCatalogRequestContext | undefined,
    execute: (signal: AbortSignal, traceId: string) => Promise<TResult | TaskTemplateCatalogFailure>,
  ): Promise<TResult | TaskTemplateCatalogFailure> => {
    let captured: CapturedContext;
    try {
      captured = captureContext(context);
    } catch {
      captured = { invalid: true };
    }
    const traceId = nextTraceId(operation, captured.traceId);
    if (capturedFactory.invalid) {
      return invalidInput(operation, "factory", traceId);
    }
    if (closed) {
      return failure({ code: "BRIDGE_CLOSED", field: "bridge", operation, retryable: false, traceId });
    }
    if (captured.invalid) {
      return invalidInput(operation, "context", traceId);
    }
    if (config.configCode || !config.baseUrl) {
      return failure({
        code: config.configCode ?? "BRIDGE_BASE_URL_MISSING",
        field: "baseUrl",
        operation,
        retryable: false,
        traceId,
      });
    }
    let externalAlreadyAborted = false;
    try {
      externalAlreadyAborted = captured.signal?.aborted ?? false;
    } catch {
      return invalidInput(operation, "context", traceId);
    }
    if (externalAlreadyAborted) {
      return failure({ code: "BRIDGE_REQUEST_ABORTED", field: "request", operation, retryable: false, traceId });
    }
    let managed: ManagedAbort;
    try {
      managed = createManagedAbort(captured.signal, config.timeoutMs);
    } catch {
      return invalidInput(operation, "context", traceId);
    }
    if (managed.externalAborted()) {
      managed.cleanup();
      return failure({ code: "BRIDGE_REQUEST_ABORTED", field: "request", operation, retryable: false, traceId });
    }
    activeControllers.add(managed.controller);
    try {
      return await execute(managed.controller.signal, traceId);
    } catch {
      if (managed.timedOut()) {
        return failure({
          code: "BRIDGE_REQUEST_TIMEOUT",
          field: "request",
          operation,
          retryable: true,
          traceId,
        });
      }
      if (managed.externalAborted()) {
        return failure({
          code: "BRIDGE_REQUEST_ABORTED",
          field: "request",
          operation,
          retryable: false,
          traceId,
        });
      }
      if (closed) {
        return failure({ code: "BRIDGE_CLOSED", field: "bridge", operation, retryable: false, traceId });
      }
      return failure({ code: "BRIDGE_NETWORK_ERROR", field: "request", operation, retryable: true, traceId });
    } finally {
      managed.cleanup();
      activeControllers.delete(managed.controller);
    }
  };

  const request = async ({
    body,
    headers,
    method,
    operation,
    path,
    signal,
    traceId,
  }: {
    readonly body?: string;
    readonly headers?: Readonly<Record<string, string>>;
    readonly method: "GET" | "POST";
    readonly operation: TaskTemplateCatalogOperation | "hydrate";
    readonly path: string;
    readonly signal: AbortSignal;
    readonly traceId: string;
  }): Promise<TaskTemplateCatalogFailure | WireResponse> => {
    const response = await raceWithAbort(Promise.resolve(fetchImpl(`${config.baseUrl}${path}`, {
      ...(body === undefined ? {} : { body }),
      credentials: "include",
      headers: Object.freeze({
        accept: "application/json",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...(headers ?? {}),
        "x-campaign-os-trace-id": traceId,
      }),
      method,
      signal,
    })), signal);
    const actualOperation = operation === "hydrate" ? "adopt" : operation;
    if (!responseLike(response)) {
      return protocolFailure(
        "BRIDGE_RESPONSE_SCHEMA_INVALID",
        "response",
        actualOperation,
        traceId,
        0,
      );
    }
    return readWireResponse({
      maxResponseBytes: config.maxResponseBytes,
      operation,
      requestTraceId: traceId,
      response,
      responseTraceHeader: operation === "hydrate" ? "x-campaign-os-trace-id" : "x-trace-id",
      signal,
    });
  };

  const bridge: TaskTemplateCatalogApiBridge = {
    adopt: async (rawInput, context) => {
      const captured = captureAdoptInput(rawInput);
      return runOperation("adopt", context, async (signal, traceId) => {
        if (!captured.input) {
          return invalidInput("adopt", captured.invalidField ?? "input", traceId);
        }
        const hydrationWire = await request({
          method: "GET",
          operation: "hydrate",
          path: "/api/wallet/auth/session",
          signal,
          traceId,
        });
        if ("ok" in hydrationWire) {
          return hydrationWire;
        }
        const csrfToken = decodeHydration(hydrationWire, "adopt");
        if (typeof csrfToken !== "string") {
          return csrfToken;
        }
        const body = JSON.stringify({
          ...(captured.input.overrides === undefined ? {} : { overrides: captured.input.overrides }),
          template: captured.input.template,
        });
        const wire = await request({
          body,
          headers: Object.freeze({
            "idempotency-key": captured.input.idempotencyKey,
            "x-csrf-token": csrfToken,
          }),
          method: "POST",
          operation: "adopt",
          path: `/api/campaigns/${encodeURIComponent(captured.input.campaignId)}/tasks/from-template`,
          signal,
          traceId,
        });
        if ("ok" in wire) {
          return wire;
        }
        if (wire.httpStatus !== 200 && wire.httpStatus !== 201) {
          return decodeErrorEnvelope(wire, "adopt");
        }
        try {
          const data = decodeAdoptedTask(successData(wire), captured.input, wire.httpStatus);
          return Object.freeze({ data, httpStatus: wire.httpStatus, ok: true as const, traceId: wire.traceId });
        } catch (error) {
          const identity = error instanceof DecodeError && error.kind === "identity";
          return protocolFailure(
            identity ? "BRIDGE_RESPONSE_IDENTITY_MISMATCH" : "BRIDGE_RESPONSE_SCHEMA_INVALID",
            identity ? "template" : "response",
            "adopt",
            wire.traceId,
            wire.httpStatus,
          );
        }
      });
    },
    close: () => {
      if (closed) {
        return;
      }
      closed = true;
      for (const controller of activeControllers) {
        controller.abort();
      }
      activeControllers.clear();
    },
    detail: async (rawInput, context) => {
      const captured = captureDetailInput(rawInput);
      return runOperation("detail", context, async (signal, traceId) => {
        if (!captured.input) {
          return invalidInput("detail", captured.invalidField ?? "input", traceId);
        }
        const wire = await request({
          method: "GET",
          operation: "detail",
          path: `/api/task-templates/${encodeURIComponent(captured.input.templateCode)}/versions/${captured.input.version}`,
          signal,
          traceId,
        });
        if ("ok" in wire) {
          return wire;
        }
        if (wire.httpStatus !== 200) {
          return decodeErrorEnvelope(wire, "detail");
        }
        try {
          const data = decodeTemplate(successData(wire));
          if (
            data.templateCode !== captured.input.templateCode
            || data.version !== captured.input.version
            || data.locale.requestedLocale !== null
          ) {
            return identityError();
          }
          return Object.freeze({ data, httpStatus: 200, ok: true as const, traceId: wire.traceId });
        } catch (error) {
          const identity = error instanceof DecodeError && error.kind === "identity";
          return protocolFailure(
            identity ? "BRIDGE_RESPONSE_IDENTITY_MISMATCH" : "BRIDGE_RESPONSE_SCHEMA_INVALID",
            identity ? "template" : "response",
            "detail",
            wire.traceId,
            wire.httpStatus,
          );
        }
      });
    },
    list: async (rawInput, context) => {
      const captured = captureListInput(rawInput);
      return runOperation("list", context, async (signal, traceId) => {
        if (!captured.input) {
          return invalidInput("list", captured.invalidField ?? "input", traceId);
        }
        const wire = await request({
          method: "GET",
          operation: "list",
          path: listPath(captured.input),
          signal,
          traceId,
        });
        if ("ok" in wire) {
          return wire;
        }
        if (wire.httpStatus !== 200) {
          return decodeErrorEnvelope(wire, "list");
        }
        try {
          const data = decodePage(successData(wire), captured.input.locale);
          return Object.freeze({ data, httpStatus: 200, ok: true as const, traceId: wire.traceId });
        } catch (error) {
          const identity = error instanceof DecodeError && error.kind === "identity";
          return protocolFailure(
            identity ? "BRIDGE_RESPONSE_IDENTITY_MISMATCH" : "BRIDGE_RESPONSE_SCHEMA_INVALID",
            identity ? "template" : "response",
            "list",
            wire.traceId,
            wire.httpStatus,
          );
        }
      });
    },
  };
  return Object.freeze(bridge);
};
