import {
  createFailureEnvelope,
  type ApiRuntimeFailureEnvelope,
} from "./envelope";
import {
  ApiRuntimeError,
  authForbidden,
  authSessionRequired,
  invalidRequest,
  malformedJson,
  methodNotAllowed,
  toApiRuntimeErrorBody,
  type ApiRuntimeErrorBody,
} from "./errors";
import type {
  ApiServerRuntimeContract,
  ServerCorsPolicy,
  ServerRequestGuardPolicy,
} from "./serverRuntime";
import {
  isCallerAuthorityHeaderName,
  isUnambiguousApiRequestTarget,
  resolveExactProtectedApiRoute,
  type ExactJsonBodyContract,
  type ExactJsonPropertyContract,
  type ExactProtectedApiRouteContract,
  type ResolvedExactProtectedApiRoute,
} from "./routes";

export type ServerGuardHeaders = Record<string, string | readonly string[] | undefined>;
export interface AdminApiFailureEnvelope {
  error: {
    code: string;
    details?: Record<string, string | boolean>;
    message: string;
  };
  ok: false;
  runtime?: never;
  safety?: never;
  timestamp?: never;
  traceId: string;
}

export type ServerRequestGuardDecision =
  | ServerRequestAcceptedDecision
  | ServerRequestRejectedDecision
  | ServerRequestPreflightDecision;

export interface ServerRequestGuardInput {
  body?: string;
  bodyBytes?: number;
  headers?: ServerGuardHeaders;
  method: string;
  path: string;
}

export interface ServerCredentialedRouteGuardPolicy {
  /** Exact origins resolved from the live wallet-auth config; wildcard entries never authorize. */
  allowedOrigins: readonly string[];
}

export interface ServerRequestGuardOptions {
  credentialedRoutes?: ServerCredentialedRouteGuardPolicy;
}

export interface ServerRequestContext {
  corsHeaders: Record<string, string>;
  origin: string | undefined;
  traceId: string;
}

export interface ServerRequestAcceptedDecision {
  body?: string;
  headers: Record<string, string>;
  kind: "accepted";
  traceId: string;
}

export interface ServerRequestRejectedDecision {
  body: AdminApiFailureEnvelope | ApiRuntimeFailureEnvelope;
  headers: Record<string, string>;
  kind: "rejected";
  status: number;
  traceId: string;
}

export interface ServerRequestPreflightDecision {
  body?: AdminApiFailureEnvelope | ApiRuntimeFailureEnvelope;
  headers: Record<string, string>;
  kind: "preflight";
  status: number;
  traceId: string;
}

let generatedTraceSequence = 0;

const utf8ByteLength = (value: string): number => Buffer.byteLength(value, "utf8");

const getHeader = (headers: ServerGuardHeaders | undefined, name: string): string | undefined => {
  if (!headers) {
    return undefined;
  }

  const normalizedName = name.toLowerCase();
  const match = Object.entries(headers).find(([key]) => key.toLowerCase() === normalizedName)?.[1];

  return typeof match === "string" ? match : undefined;
};

export const createServerTraceId = (
  headers?: ServerGuardHeaders,
  traceHeaderName: ServerRequestGuardPolicy["traceHeaderName"] = "x-campaign-os-trace-id",
) => {
  const callerTraceId = getHeader(headers, traceHeaderName)?.trim();

  if (callerTraceId) {
    return callerTraceId;
  }

  generatedTraceSequence += 1;

  return `campaign-os-server-trace-${Date.now().toString(36)}-${generatedTraceSequence}`;
};

const normalizeMethod = (method: string) => method.trim().toUpperCase();

const normalizeContentType = (contentType: string | undefined) =>
  contentType?.split(";")[0]?.trim().toLowerCase();

const sanitizeRequestPath = (path: string) => new URL(path || "/", "http://127.0.0.1").pathname;

const ADMIN_ERROR_STRING_DETAIL_KEYS = new Set([
  "diagnosticCode",
  "field",
  "operation",
  "routeId",
]);
const ADMIN_ERROR_BOOLEAN_DETAIL_KEYS = new Set([
  "reconnectRequired",
  "retryable",
]);

export const isAdminRequestTarget = (requestTarget: string): boolean => {
  const pathname = requestTarget.trim().split(/[?#]/u, 1)[0] ?? "";

  return pathname === "/api/admin" || pathname.startsWith("/api/admin/");
};

export const createAdminFailureEnvelope = (
  error: ApiRuntimeErrorBody,
  traceId: string,
): AdminApiFailureEnvelope => {
  const details = Object.fromEntries(Object.entries(error.details ?? {}).filter(([key, value]) =>
    (ADMIN_ERROR_STRING_DETAIL_KEYS.has(key) && typeof value === "string")
    || (ADMIN_ERROR_BOOLEAN_DETAIL_KEYS.has(key) && typeof value === "boolean")
  )) as Record<string, string | boolean>;

  return {
    error: {
      code: error.code,
      ...(Object.keys(details).length === 0 ? {} : { details }),
      message: error.message["en-US"],
    },
    ok: false,
    traceId,
  };
};

const createBaseHeaders = (traceId: string): Record<string, string> => ({
  "content-type": "application/json; charset=utf-8",
  "x-campaign-os-trace-id": traceId,
});

const createFailureDecision = ({
  error,
  routeCount,
  requestTarget,
  runtimeVersion,
  strictEnvelope = false,
  traceId,
}: {
  error: unknown;
  routeCount: number;
  requestTarget: string;
  runtimeVersion: string;
  strictEnvelope?: boolean;
  traceId: string;
}): ServerRequestRejectedDecision => {
  const runtimeError = toApiRuntimeErrorBody(error);

  return {
    body: strictEnvelope || isAdminRequestTarget(requestTarget)
      ? createAdminFailureEnvelope(runtimeError, traceId)
      : createFailureEnvelope({
        error: runtimeError,
        routeCount,
        traceId,
        version: runtimeVersion,
      }),
    headers: createBaseHeaders(traceId),
    kind: "rejected",
    status: runtimeError.status,
    traceId,
  };
};

const isAllowedOrigin = (origin: string | undefined, corsPolicy: ServerCorsPolicy) =>
  origin === undefined
  || corsPolicy.allowedOrigins.includes(origin)
  || corsPolicy.allowedOrigins.includes("*");

const createCorsHeaders = (
  corsPolicy: ServerCorsPolicy,
  origin: string | undefined,
): Record<string, string> => {
  if (!corsPolicy.enabled) {
    return {};
  }

  const allowOrigin =
    origin && corsPolicy.allowedOrigins.includes(origin)
      ? origin
      : corsPolicy.allowedOrigins.includes("*")
        ? "*"
        : corsPolicy.allowedOrigins[0];

  return {
    "access-control-allow-headers": corsPolicy.allowedHeaders.join(", "),
    "access-control-allow-methods": corsPolicy.allowedMethods.join(", "),
    "access-control-allow-origin": allowOrigin,
    "access-control-expose-headers": corsPolicy.exposedHeaders.join(", "),
    "access-control-max-age": String(corsPolicy.maxAgeSeconds),
    vary: "origin",
  };
};

const withCorsHeaders = (
  headers: Record<string, string>,
  corsPolicy: ServerCorsPolicy,
  origin: string | undefined,
) => ({
  ...headers,
  ...createCorsHeaders(corsPolicy, origin),
});

export const createServerRequestContext = (
  headers: ServerGuardHeaders | undefined,
  contract: Pick<ApiServerRuntimeContract, "corsPolicy" | "requestGuard">,
): ServerRequestContext => {
  const origin = getHeader(headers, "origin");

  return {
    corsHeaders: createCorsHeaders(contract.corsPolicy, origin),
    origin,
    traceId: createServerTraceId(headers, contract.requestGuard.traceHeaderName),
  };
};

const createRejectedRequest = ({
  corsPolicy,
  error,
  origin,
  requestTarget,
  routeCount,
  runtimeVersion,
  traceId,
}: {
  corsPolicy: ServerCorsPolicy;
  error: unknown;
  origin: string | undefined;
  requestTarget: string;
  routeCount: number;
  runtimeVersion: string;
  traceId: string;
}): ServerRequestRejectedDecision => {
  const rejected = createFailureDecision({
    error,
    requestTarget,
    routeCount,
    runtimeVersion,
    traceId,
  });

  return {
    ...rejected,
    headers: isAdminRequestTarget(requestTarget)
      ? withCorsHeaders(rejected.headers, corsPolicy, origin)
      : rejected.headers,
  };
};

const createRejectedPreflight = ({
  corsPolicy,
  error,
  origin,
  requestTarget,
  routeCount,
  runtimeVersion,
  traceId,
}: {
  corsPolicy: ServerCorsPolicy;
  error: unknown;
  origin: string | undefined;
  requestTarget: string;
  routeCount: number;
  runtimeVersion: string;
  traceId: string;
}): ServerRequestPreflightDecision => {
  const rejected = createFailureDecision({
    error,
    requestTarget,
    routeCount,
    runtimeVersion,
    traceId,
  });

  return {
    body: rejected.body,
    headers: withCorsHeaders(rejected.headers, corsPolicy, origin),
    kind: "preflight",
    status: rejected.status,
    traceId,
  };
};

interface CapturedExactHeaders {
  contentType?: string;
  cookie?: string;
  csrf?: string;
  origin?: string;
  requestedHeaders?: string;
  requestedMethod?: string;
}

type CaptureExactHeadersResult =
  | Readonly<{ headers: CapturedExactHeaders; status: "accepted" }>
  | Readonly<{ field: string; status: "rejected" }>;

const EXACT_PREFLIGHT_HEADER_NAMES = new Set([
  "access-control-request-headers",
  "access-control-request-method",
]);
const captureExactHeaders = (
  source: ServerGuardHeaders | undefined,
  route: ExactProtectedApiRouteContract,
): CaptureExactHeadersResult => {
  if (source === undefined) {
    return { headers: {}, status: "accepted" };
  }
  if (source === null || typeof source !== "object" || Array.isArray(source)) {
    return { field: "headers", status: "rejected" };
  }

  const entries = Object.entries(source);
  const headerCount = entries.reduce(
    (count, [, value]) => count + (Array.isArray(value) ? value.length : 1),
    0,
  );
  if (headerCount > route.request.headers.maxCount) {
    return { field: "headers", status: "rejected" };
  }

  const controlledNames = new Set(route.request.headers.controlled);
  const captured = new Map<string, string>();
  let totalBytes = 0;

  for (const [rawName, rawValue] of entries) {
    const name = rawName.trim().toLowerCase();
    if (
      name.length === 0
      || name.length > 128
      || !/^[a-z0-9!#$%&'*+.^_`|~-]+$/u.test(name)
      || isCallerAuthorityHeaderName(name)
    ) {
      return { field: "headers", status: "rejected" };
    }

    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    if (values.some((value) => value !== undefined && typeof value !== "string")) {
      return { field: "headers", status: "rejected" };
    }
    totalBytes += utf8ByteLength(rawName);
    for (const value of values) {
      if (typeof value === "string") {
        totalBytes += utf8ByteLength(value);
      }
    }
    if (totalBytes > route.request.headers.maxTotalBytes) {
      return { field: "headers", status: "rejected" };
    }

    if (!controlledNames.has(name) && !EXACT_PREFLIGHT_HEADER_NAMES.has(name)) {
      continue;
    }
    if (captured.has(name) || Array.isArray(rawValue)) {
      return { field: name, status: "rejected" };
    }
    if (typeof rawValue !== "string") {
      continue;
    }

    const maxBytes = route.request.headers.maxBytesByName[name];
    if (maxBytes !== undefined && utf8ByteLength(rawValue) > maxBytes) {
      return { field: name, status: "rejected" };
    }
    if (
      EXACT_PREFLIGHT_HEADER_NAMES.has(name)
      && utf8ByteLength(rawValue) > 1_024
    ) {
      return { field: name, status: "rejected" };
    }
    captured.set(name, rawValue);
  }

  return {
    headers: {
      contentType: captured.get("content-type")?.trim(),
      cookie: captured.get("cookie"),
      csrf: captured.get("x-campaign-os-csrf")?.trim(),
      origin: captured.get("origin")?.trim(),
      requestedHeaders: captured.get("access-control-request-headers"),
      requestedMethod: captured.get("access-control-request-method")?.trim(),
    },
    status: "accepted",
  };
};

type RequestedHeaderNamesResult =
  | Readonly<{ names: readonly string[]; status: "accepted" }>
  | Readonly<{ status: "rejected" }>;

const parseRequestedHeaderNames = (value: string | undefined): RequestedHeaderNamesResult => {
  if (value === undefined || value.trim() === "") {
    return { names: [], status: "accepted" };
  }
  const names = value.split(",").map((item) => item.trim().toLowerCase());
  if (
    names.some((name) => !/^[a-z0-9!#$%&'*+.^_`|~-]+$/u.test(name))
    || new Set(names).size !== names.length
  ) {
    return { status: "rejected" };
  }
  return { names, status: "accepted" };
};

const exactAllowedOrigins = (
  contract: Pick<ApiServerRuntimeContract, "corsPolicy">,
  options: ServerRequestGuardOptions,
): readonly string[] => {
  const routeOrigins = options.credentialedRoutes?.allowedOrigins;
  const serverOrigins = contract.corsPolicy.allowedOrigins;
  const serverAllowsConfiguredRouteOrigins = serverOrigins.includes("*");

  return (routeOrigins ?? serverOrigins).filter((origin) =>
    origin !== "*"
    && (routeOrigins === undefined
      || serverAllowsConfiguredRouteOrigins
      || serverOrigins.includes(origin))
  );
};

const isExactAllowedOrigin = (
  origin: string | undefined,
  allowedOrigins: readonly string[],
): origin is string => Boolean(origin && allowedOrigins.includes(origin));

const createCredentialedCorsHeaders = (
  route: ExactProtectedApiRouteContract,
  origin: string,
  maxAgeSeconds: number,
  preflight: boolean,
): Record<string, string> => ({
  "access-control-allow-credentials": "true",
  ...(preflight
    ? {
      "access-control-allow-headers": route.request.cors.allowedHeaders.join(", "),
      "access-control-allow-methods": route.request.cors.allowedMethods.join(", "),
      "access-control-max-age": String(maxAgeSeconds),
    }
    : {}),
  "access-control-allow-origin": origin,
  "access-control-expose-headers": "x-campaign-os-trace-id",
  vary: "origin",
});

const createExactRejectedRequest = ({
  contract,
  error,
  origin,
  requestTarget,
  route,
  routeCount,
  traceId,
}: {
  contract: Pick<ApiServerRuntimeContract, "corsPolicy" | "runtimeVersion">;
  error: unknown;
  origin: string | undefined;
  requestTarget: string;
  route: ExactProtectedApiRouteContract;
  routeCount: number;
  traceId: string;
}): ServerRequestRejectedDecision => {
  const rejected = createFailureDecision({
    error,
    requestTarget,
    routeCount,
    runtimeVersion: contract.runtimeVersion,
    strictEnvelope: true,
    traceId,
  });

  return {
    ...rejected,
    headers: {
      ...rejected.headers,
      ...(origin
        ? createCredentialedCorsHeaders(route, origin, contract.corsPolicy.maxAgeSeconds, false)
        : {}),
    },
  };
};

const createExactRejectedPreflight = ({
  contract,
  error,
  origin,
  requestTarget,
  route,
  routeCount,
  traceId,
}: {
  contract: Pick<ApiServerRuntimeContract, "corsPolicy" | "runtimeVersion">;
  error: unknown;
  origin: string | undefined;
  requestTarget: string;
  route: ExactProtectedApiRouteContract;
  routeCount: number;
  traceId: string;
}): ServerRequestPreflightDecision => {
  const rejected = createExactRejectedRequest({
    contract,
    error,
    origin,
    requestTarget,
    route,
    routeCount,
    traceId,
  });

  return {
    body: rejected.body,
    headers: origin
      ? {
        ...createBaseHeaders(traceId),
        ...createCredentialedCorsHeaders(route, origin, contract.corsPolicy.maxAgeSeconds, true),
      }
      : createBaseHeaders(traceId),
    kind: "preflight",
    status: rejected.status,
    traceId,
  };
};

const isExactJsonContentType = (value: string | undefined): boolean => {
  if (!value) {
    return false;
  }
  const parts = value.split(";").map((part) => part.trim().toLowerCase());
  return parts[0] === "application/json"
    && (parts.length === 1 || (parts.length === 2 && parts[1] === "charset=utf-8"));
};

const isPlainJsonRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null
  && typeof value === "object"
  && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

const EXACT_JSON_OBJECT_MAX_DEPTH = 8;
const EXACT_JSON_OBJECT_MAX_ENTRIES = 256;
const EXACT_JSON_OBJECT_MAX_BYTES = 65_536;
const FORBIDDEN_JSON_PROPERTY_NAMES = new Set(["__proto__", "constructor", "prototype"]);

interface ExactJsonObjectBudget {
  bytes: number;
  entries: number;
  tooLarge: boolean;
}

const capturePlainJsonRecordEntries = (
  value: unknown,
): readonly (readonly [string, unknown])[] | undefined => {
  if (!isPlainJsonRecord(value)) {
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
    entries.push([key, descriptor.value] as const);
  }
  return entries;
};

const capturePlainJsonArrayValues = (value: readonly unknown[]): readonly unknown[] | undefined => {
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    return undefined;
  }
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.some((key) =>
      typeof key !== "string"
      || (key !== "length" && !/^(?:0|[1-9][0-9]*)$/u.test(key)),
    )
  ) {
    return undefined;
  }
  const values: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      return undefined;
    }
    values.push(descriptor.value);
  }
  return values;
};

const consumeExactJsonValue = (
  value: unknown,
  budget: ExactJsonObjectBudget,
  depth: number,
): boolean => {
  if (depth > EXACT_JSON_OBJECT_MAX_DEPTH) {
    return false;
  }
  if (value === null) {
    budget.bytes += 4;
    budget.tooLarge ||= budget.bytes > EXACT_JSON_OBJECT_MAX_BYTES;
    return budget.bytes <= EXACT_JSON_OBJECT_MAX_BYTES;
  }
  if (typeof value === "boolean") {
    budget.bytes += value ? 4 : 5;
    budget.tooLarge ||= budget.bytes > EXACT_JSON_OBJECT_MAX_BYTES;
    return budget.bytes <= EXACT_JSON_OBJECT_MAX_BYTES;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return false;
    }
    budget.bytes += utf8ByteLength(String(value));
    budget.tooLarge ||= budget.bytes > EXACT_JSON_OBJECT_MAX_BYTES;
    return budget.bytes <= EXACT_JSON_OBJECT_MAX_BYTES;
  }
  if (typeof value === "string") {
    budget.bytes += utf8ByteLength(value);
    budget.tooLarge ||= budget.bytes > EXACT_JSON_OBJECT_MAX_BYTES;
    return budget.bytes <= EXACT_JSON_OBJECT_MAX_BYTES;
  }
  if (Array.isArray(value)) {
    const values = capturePlainJsonArrayValues(value);
    if (!values) {
      return false;
    }
    budget.entries += values.length;
    budget.tooLarge ||= budget.entries > EXACT_JSON_OBJECT_MAX_ENTRIES;
    return budget.entries <= EXACT_JSON_OBJECT_MAX_ENTRIES
      && values.every((item) => consumeExactJsonValue(item, budget, depth + 1));
  }
  const entries = capturePlainJsonRecordEntries(value);
  if (!entries) {
    return false;
  }
  budget.entries += entries.length;
  if (budget.entries > EXACT_JSON_OBJECT_MAX_ENTRIES) {
    budget.tooLarge = true;
    return false;
  }
  for (const [key, nested] of entries) {
    if (FORBIDDEN_JSON_PROPERTY_NAMES.has(key)) {
      return false;
    }
    budget.bytes += utf8ByteLength(key);
    budget.tooLarge ||= budget.bytes > EXACT_JSON_OBJECT_MAX_BYTES;
    if (
      budget.bytes > EXACT_JSON_OBJECT_MAX_BYTES
      || !consumeExactJsonValue(nested, budget, depth + 1)
    ) {
      return false;
    }
  }
  return true;
};

type ExactJsonPropertyMatchStatus = "accepted" | "invalid" | "too_large";

const matchBoundedPlainJsonObject = (value: unknown): ExactJsonPropertyMatchStatus => {
  if (!isPlainJsonRecord(value)) {
    return "invalid";
  }
  const budget: ExactJsonObjectBudget = { bytes: 0, entries: 0, tooLarge: false };

  return consumeExactJsonValue(value, budget, 0)
    ? "accepted"
    : budget.tooLarge ? "too_large" : "invalid";
};

export type UniqueKeyJsonParseResult =
  | Readonly<{ ok: true; value: unknown }>
  | Readonly<{ ok: false }>;

interface UniqueKeyJsonCursor {
  index: number;
  readonly source: string;
}

const JSON_VALUE_MAX_DEPTH = 64;
const JSON_SCALAR_PATTERN = /^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/;

const skipJsonWhitespace = (cursor: UniqueKeyJsonCursor): void => {
  while (/\s/u.test(cursor.source[cursor.index] ?? "")) {
    cursor.index += 1;
  }
};

const consumeJsonString = (cursor: UniqueKeyJsonCursor): string | undefined => {
  const start = cursor.index;
  if (cursor.source[start] !== '"') {
    return undefined;
  }
  cursor.index += 1;
  while (cursor.index < cursor.source.length) {
    const character = cursor.source[cursor.index];
    if (character === '"') {
      cursor.index += 1;
      return cursor.source.slice(start, cursor.index);
    }
    if (character === "\\") {
      cursor.index += 2;
      continue;
    }
    cursor.index += 1;
  }
  return undefined;
};

const consumeUniqueKeyJsonValue = (
  cursor: UniqueKeyJsonCursor,
  depth: number,
): boolean => {
  if (depth > JSON_VALUE_MAX_DEPTH) {
    return false;
  }
  skipJsonWhitespace(cursor);
  const token = cursor.source[cursor.index];
  if (token === '"') {
    return consumeJsonString(cursor) !== undefined;
  }
  if (token === "{") {
    cursor.index += 1;
    skipJsonWhitespace(cursor);
    const keys = new Set<string>();
    if (cursor.source[cursor.index] === "}") {
      cursor.index += 1;
      return true;
    }
    while (cursor.index < cursor.source.length) {
      const rawKey = consumeJsonString(cursor);
      if (!rawKey) {
        return false;
      }
      let key: unknown;
      try {
        key = JSON.parse(rawKey) as unknown;
      } catch {
        return false;
      }
      if (typeof key !== "string" || keys.has(key)) {
        return false;
      }
      keys.add(key);
      skipJsonWhitespace(cursor);
      if (cursor.source[cursor.index] !== ":") {
        return false;
      }
      cursor.index += 1;
      if (!consumeUniqueKeyJsonValue(cursor, depth + 1)) {
        return false;
      }
      skipJsonWhitespace(cursor);
      if (cursor.source[cursor.index] === "}") {
        cursor.index += 1;
        return true;
      }
      if (cursor.source[cursor.index] !== ",") {
        return false;
      }
      cursor.index += 1;
      skipJsonWhitespace(cursor);
    }
    return false;
  }
  if (token === "[") {
    cursor.index += 1;
    skipJsonWhitespace(cursor);
    if (cursor.source[cursor.index] === "]") {
      cursor.index += 1;
      return true;
    }
    while (cursor.index < cursor.source.length) {
      if (!consumeUniqueKeyJsonValue(cursor, depth + 1)) {
        return false;
      }
      skipJsonWhitespace(cursor);
      if (cursor.source[cursor.index] === "]") {
        cursor.index += 1;
        return true;
      }
      if (cursor.source[cursor.index] !== ",") {
        return false;
      }
      cursor.index += 1;
    }
    return false;
  }
  const scalar = cursor.source.slice(cursor.index).match(JSON_SCALAR_PATTERN)?.[0];
  if (!scalar) {
    return false;
  }
  cursor.index += scalar.length;
  return true;
};

export const parseJsonWithUniqueObjectKeys = (source: string): UniqueKeyJsonParseResult => {
  if (typeof source !== "string") {
    return Object.freeze({ ok: false as const });
  }
  const cursor: UniqueKeyJsonCursor = { index: 0, source };
  if (!consumeUniqueKeyJsonValue(cursor, 0)) {
    return Object.freeze({ ok: false as const });
  }
  skipJsonWhitespace(cursor);
  if (cursor.index !== source.length) {
    return Object.freeze({ ok: false as const });
  }
  try {
    return Object.freeze({ ok: true as const, value: JSON.parse(source) as unknown });
  } catch {
    return Object.freeze({ ok: false as const });
  }
};

const matchesExactJsonProperty = (
  value: unknown,
  property: ExactJsonPropertyContract,
): ExactJsonPropertyMatchStatus => {
  if (property.type === "object") {
    return matchBoundedPlainJsonObject(value);
  }
  if (typeof value !== "string") {
    return "invalid";
  }
  const length = utf8ByteLength(value);
  return (property.minLength === undefined || length >= property.minLength)
    && (property.maxLength === undefined || length <= property.maxLength)
    && (property.allowedValues === undefined || property.allowedValues.includes(value))
    && (property.pattern === undefined || new RegExp(property.pattern, "u").test(value))
    ? "accepted"
    : "invalid";
};

type ExactJsonBodyMatchResult = Readonly<{
  field?: string;
  status: ExactJsonPropertyMatchStatus;
}>;

const matchesExactJsonBody = (
  value: unknown,
  bodyContract: ExactJsonBodyContract,
): ExactJsonBodyMatchResult => {
  const entries = capturePlainJsonRecordEntries(value);
  if (!entries) {
    return Object.freeze({ status: "invalid" as const });
  }
  const keys = entries.map(([key]) => key);
  const allowed = new Set(Object.keys(bodyContract.properties));
  if (
    !keys.every((key) => allowed.has(key))
    || !bodyContract.required.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  ) {
    return Object.freeze({ status: "invalid" as const });
  }
  for (const [key, nested] of entries) {
    const status = matchesExactJsonProperty(nested, bodyContract.properties[key]);
    if (status !== "accepted") {
      return Object.freeze({ field: key, status });
    }
  }
  return Object.freeze({ status: "accepted" as const });
};

const requestTooLarge = (field: string, reason: string): ApiRuntimeError => {
  const invalid = invalidRequest(field, reason).body;

  return new ApiRuntimeError({
    ...invalid,
    details: {
      ...invalid.details,
      diagnosticCode: "REQUEST_TOO_LARGE",
    },
    status: 413,
  });
};

const exactBodyBytes = (input: ServerRequestGuardInput): number => Math.max(
  input.bodyBytes ?? 0,
  typeof input.body === "string" ? utf8ByteLength(input.body) : 0,
);

const evaluateExactProtectedRequest = ({
  contract,
  input,
  options,
  requestContext,
  resolution,
  routeCount,
}: {
  contract: Pick<ApiServerRuntimeContract, "corsPolicy" | "requestGuard" | "runtimeVersion">;
  input: ServerRequestGuardInput;
  options: ServerRequestGuardOptions;
  requestContext: ServerRequestContext;
  resolution: ResolvedExactProtectedApiRoute;
  routeCount: number;
}): ServerRequestGuardDecision => {
  const { route } = resolution;
  const { traceId } = requestContext;
  const method = normalizeMethod(input.method);
  const captured = captureExactHeaders(input.headers, route);
  const allowedOrigins = exactAllowedOrigins(contract, options);
  const capturedOrigin = captured.status === "accepted" ? captured.headers.origin : undefined;
  const responseOrigin = isExactAllowedOrigin(capturedOrigin, allowedOrigins)
    ? capturedOrigin
    : undefined;
  const reject = (error: unknown) => createExactRejectedRequest({
    contract,
    error,
    origin: responseOrigin,
    requestTarget: input.path,
    route,
    routeCount,
    traceId,
  });

  if (captured.status !== "accepted") {
    return reject(invalidRequest(captured.field, "Request headers do not match the exact route contract."));
  }

  if (method === "OPTIONS") {
    const rejectPreflight = (error: unknown) => createExactRejectedPreflight({
      contract,
      error,
      origin: responseOrigin,
      requestTarget: input.path,
      route,
      routeCount,
      traceId,
    });
    if (!responseOrigin || !contract.corsPolicy.enabled) {
      return rejectPreflight(authForbidden({
        diagnosticCode: "AUTH_ORIGIN_FORBIDDEN",
        field: "origin",
      }));
    }
    const requestedMethod = normalizeMethod(captured.headers.requestedMethod ?? "");
    if (requestedMethod !== route.method) {
      return rejectPreflight(methodNotAllowed(
        requestedMethod || "OPTIONS",
        input.path,
        route.request.cors.allowedMethods,
      ));
    }
    const requestedHeaders = parseRequestedHeaderNames(captured.headers.requestedHeaders);
    const allowedHeaders = new Set(route.request.cors.allowedHeaders);
    if (
      requestedHeaders.status !== "accepted"
      || requestedHeaders.names.some((name) => !allowedHeaders.has(name))
    ) {
      return rejectPreflight(invalidRequest(
        "access-control-request-headers",
        "CORS preflight requests may use only the route's minimal header set.",
      ));
    }
    return {
      headers: {
        "x-campaign-os-trace-id": traceId,
        ...createCredentialedCorsHeaders(
          route,
          responseOrigin,
          contract.corsPolicy.maxAgeSeconds,
          true,
        ),
      },
      kind: "preflight",
      status: 204,
      traceId,
    };
  }

  if (method !== route.method) {
    return reject(methodNotAllowed(method, input.path, [route.method]));
  }
  if (!responseOrigin || !contract.corsPolicy.enabled) {
    return reject(authForbidden({
      diagnosticCode: "AUTH_ORIGIN_FORBIDDEN",
      field: "origin",
    }));
  }
  if (!resolution.queryAllowed) {
    return reject(invalidRequest("query", "This route does not accept query parameters."));
  }

  const { body, cookie, csrf } = route.request;
  const bodyBytes = exactBodyBytes(input);
  if (bodyBytes > contract.requestGuard.maxBodyBytes) {
    return reject(requestTooLarge("body", "Request body exceeds the API server limit."));
  }
  if (body.mode === "forbidden") {
    if (bodyBytes !== 0 || (input.body !== undefined && input.body !== "")) {
      return reject(invalidRequest("body", "This route does not accept a request body."));
    }
    if (captured.headers.contentType !== undefined) {
      return reject(invalidRequest("content-type", "This route does not accept a content type."));
    }
  } else {
    if (!isExactJsonContentType(captured.headers.contentType)) {
      return reject(invalidRequest("content-type", "This route requires application/json."));
    }
    if (bodyBytes > body.maxBytes) {
      return reject(requestTooLarge("body", "Request body exceeds the route limit."));
    }
    if (input.body === undefined || input.body === "") {
      return reject(invalidRequest("body", "This route requires a JSON request body."));
    }
    const parsedResult = parseJsonWithUniqueObjectKeys(input.body);
    if (!parsedResult.ok) {
      try {
        JSON.parse(input.body);
      } catch {
        return reject(malformedJson());
      }
      return reject(invalidRequest("body", "Duplicate JSON object keys are not allowed."));
    }
    const parsed = parsedResult.value;
    const bodyMatch = matchesExactJsonBody(parsed, body);
    if (bodyMatch.status === "too_large") {
      return reject(requestTooLarge(
        bodyMatch.field ?? "body",
        "A structured request field exceeds its allowed bound.",
      ));
    }
    if (bodyMatch.status !== "accepted") {
      return reject(invalidRequest("body", "JSON fields do not match the exact route schema."));
    }
  }

  const hasCookie = Boolean(captured.headers.cookie && captured.headers.cookie.trim().length > 0);
  const hasCsrf = Boolean(captured.headers.csrf && captured.headers.csrf.length > 0);
  if (cookie === "required" && !hasCookie) {
    return reject(authSessionRequired({ field: "cookie" }));
  }
  if (cookie === "forbidden" && captured.headers.cookie !== undefined) {
    return reject(invalidRequest("cookie", "This route does not accept a session cookie."));
  }
  if (csrf === "required" && !hasCsrf) {
    return reject(authForbidden({ diagnosticCode: "AUTH_CSRF_REQUIRED", field: "x-campaign-os-csrf" }));
  }
  if (csrf === "forbidden" && captured.headers.csrf !== undefined) {
    return reject(invalidRequest("x-campaign-os-csrf", "This route does not accept a CSRF header."));
  }

  return {
    ...(body.mode === "json" ? { body: input.body } : {}),
    headers: {
      ...createBaseHeaders(traceId),
      ...createCredentialedCorsHeaders(
        route,
        responseOrigin,
        contract.corsPolicy.maxAgeSeconds,
        false,
      ),
    },
    kind: "accepted",
    traceId,
  };
};

export const evaluateServerRequestGuard = (
  input: ServerRequestGuardInput,
  contract: Pick<ApiServerRuntimeContract, "corsPolicy" | "requestGuard" | "runtimeVersion">,
  routeCount = 0,
  requestContext = createServerRequestContext(input.headers, contract),
  options: ServerRequestGuardOptions = {},
): ServerRequestGuardDecision => {
  const { origin, traceId } = requestContext;
  if (!isUnambiguousApiRequestTarget(input.path)) {
    return createRejectedRequest({
      corsPolicy: contract.corsPolicy,
      error: invalidRequest("path", "Request path must be canonical and unambiguous."),
      origin,
      requestTarget: input.path,
      routeCount,
      runtimeVersion: contract.runtimeVersion,
      traceId,
    });
  }

  const exactRoute = resolveExactProtectedApiRoute(input.path);
  if (exactRoute) {
    return evaluateExactProtectedRequest({
      contract,
      input,
      options,
      requestContext,
      resolution: exactRoute,
      routeCount,
    });
  }

  const method = normalizeMethod(input.method);
  const safePath = sanitizeRequestPath(input.path);

  if (method === "OPTIONS") {
    const requestedMethod = normalizeMethod(
      getHeader(input.headers, "access-control-request-method") ?? "",
    );

    if (!contract.corsPolicy.enabled || !isAllowedOrigin(origin, contract.corsPolicy)) {
      return createRejectedPreflight({
        corsPolicy: contract.corsPolicy,
        error: invalidRequest("origin", "CORS origin is not allowed."),
        origin,
        requestTarget: safePath,
        routeCount,
        runtimeVersion: contract.runtimeVersion,
        traceId,
      });
    }

    if (!contract.corsPolicy.allowedMethods.includes(requestedMethod)) {
      return createRejectedPreflight({
        corsPolicy: contract.corsPolicy,
        error: methodNotAllowed(requestedMethod || "OPTIONS", input.path, contract.corsPolicy.allowedMethods),
        origin,
        requestTarget: safePath,
        routeCount,
        runtimeVersion: contract.runtimeVersion,
        traceId,
      });
    }

    const requestedHeaders = parseRequestedHeaderNames(
      getHeader(input.headers, "access-control-request-headers"),
    );
    const allowedHeaders = new Set(
      contract.corsPolicy.allowedHeaders.map((header) => header.toLowerCase()),
    );
    if (
      requestedHeaders.status !== "accepted"
      || requestedHeaders.names.some((header) => !allowedHeaders.has(header))
    ) {
      return createRejectedPreflight({
        corsPolicy: contract.corsPolicy,
        error: invalidRequest(
          "access-control-request-headers",
          "CORS preflight includes a header that is not allowed.",
        ),
        origin,
        requestTarget: safePath,
        routeCount,
        runtimeVersion: contract.runtimeVersion,
        traceId,
      });
    }

    return {
      headers: withCorsHeaders(
        { "x-campaign-os-trace-id": traceId },
        contract.corsPolicy,
        origin,
      ),
      kind: "preflight",
      status: 204,
      traceId,
    };
  }

  if (!contract.requestGuard.allowedMethods.includes(method)) {
    return createRejectedRequest({
      corsPolicy: contract.corsPolicy,
      error: methodNotAllowed(method, safePath, contract.requestGuard.allowedMethods),
      origin,
      requestTarget: safePath,
      routeCount,
      runtimeVersion: contract.runtimeVersion,
      traceId,
    });
  }

  if (method === "POST") {
    const contentType = normalizeContentType(getHeader(input.headers, "content-type"));

    if (contentType && !contract.requestGuard.jsonContentTypes.includes(contentType)) {
      return createRejectedRequest({
        corsPolicy: contract.corsPolicy,
        error: invalidRequest("content-type", "POST requests must use application/json."),
        origin,
        requestTarget: safePath,
        routeCount,
        runtimeVersion: contract.runtimeVersion,
        traceId,
      });
    }

    const bodyBytes = input.bodyBytes ?? Buffer.byteLength(input.body ?? "", "utf8");

    if (bodyBytes > contract.requestGuard.maxBodyBytes) {
      return createRejectedRequest({
        corsPolicy: contract.corsPolicy,
        error: requestTooLarge("body", "Request body exceeds the Campaign OS API server limit."),
        origin,
        requestTarget: safePath,
        routeCount,
        runtimeVersion: contract.runtimeVersion,
        traceId,
      });
    }

    if (input.body !== undefined && input.body !== "") {
      try {
        JSON.parse(input.body);
      } catch {
        return createRejectedRequest({
          corsPolicy: contract.corsPolicy,
          error: malformedJson(),
          origin,
          requestTarget: safePath,
          routeCount,
          runtimeVersion: contract.runtimeVersion,
          traceId,
        });
      }
    }
  }

  return {
    body: input.body,
    headers: withCorsHeaders(createBaseHeaders(traceId), contract.corsPolicy, origin),
    kind: "accepted",
    traceId,
  };
};
