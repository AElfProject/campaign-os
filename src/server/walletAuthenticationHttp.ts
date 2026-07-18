import type {
  WalletAuthenticationRuntime,
  WalletAuthenticationRuntimeDiagnosticCode,
  WalletAuthenticationRuntimeFailure,
} from "./walletAuthenticationRuntime";
import {
  WALLET_SESSION_MAX_COOKIE_HEADER_BYTES,
  WALLET_SESSION_MAX_CSRF_HEADER_BYTES,
} from "./walletSessionRequestSecurity";
import { parseJsonWithUniqueObjectKeys } from "./serverRequestGuard";
import {
  isCallerAuthorityHeaderName,
  isUnambiguousApiRequestTarget,
} from "./routes";
import { isCanonicalLiveWalletChainId } from "../domain/wallet";

const JSON_CONTENT_TYPE = "application/json";
const JSON_UTF8_CONTENT_TYPE = "application/json; charset=utf-8";
const TRACE_HEADER_NAME = "x-campaign-os-trace-id";
const CSRF_HEADER_NAME = "x-campaign-os-csrf";
const DEFAULT_TRACE_PREFIX = "wallet-auth-http";
const MAX_TRACE_ID_BYTES = 128;
const MAX_ORIGIN_BYTES = 512;
const MAX_CONTENT_TYPE_BYTES = 128;
const MAX_CHALLENGE_BODY_BYTES = 2_048;
const MAX_SESSION_BODY_BYTES = 96 * 1_024;
const MAX_ADMIN_REVOKE_BODY_BYTES = 512;
const MAX_MESSAGE_BYTES = 16_384;
const MAX_NONCE_BYTES = 512;
const MIN_NONCE_BYTES = 32;
const MAX_SIGNATURE_CHARACTERS = 8_192;
const MAX_PUBLIC_KEY_CHARACTERS = 4_096;
const MAX_ADAPTER_PROOF_BYTES = 65_536;
const MAX_ADAPTER_PROOF_DEPTH = 8;
const MAX_ADAPTER_PROOF_ENTRIES = 256;
const MAX_RESPONSE_COOKIE_BYTES = 4_096;

const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const SAFE_TRACE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const SAFE_TRACE_DENY_PATTERN = /(?:bearer|password|private|raw[_-]?signature|secret|token)/i;
const SAFE_NONCE_PATTERN = /^[A-Za-z0-9_-]+$/;
const SAFE_CSRF_PATTERN = /^[A-Za-z0-9._-]+$/;
const SAFE_CAPABILITY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_:-]*$/;
const SAFE_ROLE_PATTERN = /^[a-z0-9._:-]+$/;
const SAFE_DIAGNOSTIC_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const SAFE_ADAPTER_PROOF_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

const ADMIN_REVOKE_REASON_CODES = new Set([
  "ADMIN_REVOKED",
  "MEMBERSHIP_CHANGED",
  "COMPROMISE_RESPONSE",
]);
const ACCOUNT_TYPES = new Set(["AA", "EOA"]);
const WALLET_SOURCES = new Set([
  "PORTKEY_AA",
  "PORTKEY_EOA_APP",
  "PORTKEY_EOA_EXTENSION",
  "NIGHTELF",
  "OTHER",
]);

const CHALLENGE_FIELDS = new Set([
  "adapterId",
  "caHash",
  "chainId",
  "network",
  "walletAddress",
]);
const CHALLENGE_REQUIRED_FIELDS = [
  "adapterId",
  "chainId",
  "network",
  "walletAddress",
] as const;
const SESSION_FIELDS = new Set([
  "adapterProof",
  "challengeId",
  "message",
  "nonce",
  "publicKey",
  "signature",
]);
const SESSION_REQUIRED_FIELDS = [
  "challengeId",
  "message",
  "nonce",
  "signature",
] as const;
const ADMIN_REVOKE_FIELDS = new Set(["reasonCode"]);
const ADMIN_REVOKE_REQUIRED_FIELDS = ["reasonCode"] as const;

const CONTROLLED_HEADER_NAMES = new Set([
  "content-type",
  "cookie",
  "origin",
  CSRF_HEADER_NAME,
  TRACE_HEADER_NAME,
]);

export type WalletAuthenticationHttpRuntime = Pick<
  WalletAuthenticationRuntime,
  | "currentSession"
  | "issueChallenge"
  | "logout"
  | "rotateSession"
  | "verifyProof"
>;

export type WalletAuthenticationOriginPolicy = Readonly<{
  requireOrigin(origin: string | undefined, traceId: string): boolean;
}>;

export type WalletAuthenticationHttpHeaders = Readonly<
  Record<string, string | readonly string[] | undefined>
>;

export interface WalletAuthenticationHttpRequest {
  readonly body?: unknown;
  readonly headers?: WalletAuthenticationHttpHeaders;
  readonly method: string;
  readonly path: string;
  readonly signal?: AbortSignal;
}

export interface WalletAuthenticationAdminRevokeInput {
  readonly cookieHeader: string;
  readonly csrfHeader: string;
  readonly origin: string;
  readonly reasonCode: string;
  readonly signal: AbortSignal | undefined;
  readonly targetSessionId: string;
  readonly traceId: string;
}

export type WalletAuthenticationAdminRevokeResult =
  | Readonly<{ status: "already_terminal" | "revoked" }>
  | Readonly<{
    diagnosticCode?: string;
    retryable?: boolean;
    status: "forbidden" | "unauthorized" | "unavailable";
  }>;

export interface WalletAuthenticationAdminRevokeExecutor {
  revoke(
    input: WalletAuthenticationAdminRevokeInput,
  ): Promise<WalletAuthenticationAdminRevokeResult>;
}

export interface WalletAuthenticationHttpErrorDetails {
  readonly diagnosticCode?: string;
  readonly field?: string;
  readonly retryable?: boolean;
}

export interface WalletAuthenticationHttpFailureEnvelope {
  readonly error: Readonly<{
    code: string;
    details?: WalletAuthenticationHttpErrorDetails;
    message: string;
  }>;
  readonly ok: false;
  readonly traceId: string;
}

export interface WalletAuthenticationHttpSuccessEnvelope<TData> {
  readonly data: TData;
  readonly ok: true;
  readonly traceId: string;
}

export type WalletAuthenticationHttpResponseBody<TData = unknown> =
  | WalletAuthenticationHttpFailureEnvelope
  | WalletAuthenticationHttpSuccessEnvelope<TData>;

export interface WalletAuthenticationHttpResponse<TData = unknown> {
  readonly body: WalletAuthenticationHttpResponseBody<TData>;
  readonly headers: Readonly<Record<string, string>>;
  readonly status: number;
}

export interface WalletAuthenticationHttpController {
  handle(
    request: WalletAuthenticationHttpRequest,
  ): Promise<WalletAuthenticationHttpResponse | undefined>;
}

export interface CreateWalletAuthenticationHttpControllerInput {
  readonly adminRevokeExecutor: WalletAuthenticationAdminRevokeExecutor;
  readonly originPolicy: WalletAuthenticationOriginPolicy;
  readonly runtime: WalletAuthenticationHttpRuntime;
  readonly traceIdGenerator?: () => string;
}

type WalletHttpOperation =
  | "challenge"
  | "current"
  | "logout"
  | "revoke"
  | "rotate"
  | "session";

interface MatchedRoute {
  readonly operation: WalletHttpOperation;
  readonly requiredMethod: "GET" | "POST";
  readonly targetSessionId?: string;
}

interface CapturedHeaders {
  readonly contentType?: string;
  readonly cookie?: string;
  readonly csrf?: string;
  readonly origin?: string;
}

type CaptureHeadersResult =
  | Readonly<{ headers: CapturedHeaders; status: "accepted" }>
  | Readonly<{ field: string; status: "duplicate" | "invalid" | "too_large" }>;

type BodyCaptureResult =
  | Readonly<{ body: Record<string, unknown>; status: "accepted" }>
  | Readonly<{ status: "invalid" | "too_large" }>;

interface AdapterProofBudget {
  bytes: number;
  entries: number;
  tooLarge: boolean;
}

type AdapterProofCloneResult =
  | Readonly<{ status: "accepted"; value: Readonly<Record<string, unknown>> }>
  | Readonly<{ status: "invalid" | "too_large" }>;

let generatedTraceSequence = 0;

const utf8ByteLength = (value: string): number =>
  new TextEncoder().encode(value).byteLength;

const isSafeTraceId = (value: unknown): value is string =>
  typeof value === "string"
  && utf8ByteLength(value) <= MAX_TRACE_ID_BYTES
  && SAFE_TRACE_PATTERN.test(value)
  && !SAFE_TRACE_DENY_PATTERN.test(value);

const generatedTraceId = (): string => {
  generatedTraceSequence += 1;
  return `${DEFAULT_TRACE_PREFIX}-${Date.now().toString(36)}-${generatedTraceSequence}`;
};

const ownHeaderEntries = (
  headers: WalletAuthenticationHttpHeaders | undefined,
): readonly (readonly [string, string | readonly string[] | undefined])[] | undefined => {
  if (headers === undefined) {
    return [];
  }
  if (headers === null || typeof headers !== "object" || Array.isArray(headers)) {
    return undefined;
  }
  const prototype = Object.getPrototypeOf(headers);
  if (prototype !== Object.prototype && prototype !== null) {
    return undefined;
  }
  const entries: Array<readonly [string, string | readonly string[] | undefined]> = [];
  for (const key of Reflect.ownKeys(headers)) {
    if (typeof key !== "string") {
      return undefined;
    }
    const descriptor = Object.getOwnPropertyDescriptor(headers, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      return undefined;
    }
    entries.push([key, descriptor.value as string | readonly string[] | undefined]);
  }
  return entries;
};

const callerTraceId = (
  headers: WalletAuthenticationHttpHeaders | undefined,
): string | undefined => {
  const entries = ownHeaderEntries(headers);
  if (!entries) {
    return undefined;
  }
  const matches = entries.filter(([key]) => key.toLowerCase() === TRACE_HEADER_NAME);
  if (matches.length !== 1 || typeof matches[0]?.[1] !== "string") {
    return undefined;
  }
  const candidate = matches[0][1].trim();
  return isSafeTraceId(candidate) ? candidate : undefined;
};

const resolveTraceId = (
  headers: WalletAuthenticationHttpHeaders | undefined,
  traceIdGenerator: (() => string) | undefined,
): string => {
  const caller = callerTraceId(headers);
  if (caller) {
    return caller;
  }
  if (traceIdGenerator) {
    try {
      const generated = traceIdGenerator();
      if (isSafeTraceId(generated)) {
        return generated;
      }
    } catch {
      // A local fallback keeps error handling independent from observability failure.
    }
  }
  return generatedTraceId();
};

const captureHeaders = (
  source: WalletAuthenticationHttpHeaders | undefined,
): CaptureHeadersResult => {
  const entries = ownHeaderEntries(source);
  if (!entries) {
    return Object.freeze({ field: "headers", status: "invalid" as const });
  }
  const controlled = new Map<string, string>();
  for (const [rawName, rawValue] of entries) {
    const name = rawName.toLowerCase();
    if (isCallerAuthorityHeaderName(name)) {
      return Object.freeze({ field: rawName, status: "invalid" as const });
    }
    if (!CONTROLLED_HEADER_NAMES.has(name)) {
      continue;
    }
    if (controlled.has(name) || Array.isArray(rawValue)) {
      return Object.freeze({ field: name, status: "duplicate" as const });
    }
    if (rawValue !== undefined && typeof rawValue !== "string") {
      return Object.freeze({ field: name, status: "invalid" as const });
    }
    if (typeof rawValue === "string") {
      controlled.set(name, rawValue);
    }
  }

  const contentType = controlled.get("content-type")?.trim();
  const cookie = controlled.get("cookie");
  const csrf = controlled.get(CSRF_HEADER_NAME)?.trim();
  const origin = controlled.get("origin")?.trim();
  const boundedHeaders = [
    ["content-type", contentType, MAX_CONTENT_TYPE_BYTES],
    ["cookie", cookie, WALLET_SESSION_MAX_COOKIE_HEADER_BYTES],
    [CSRF_HEADER_NAME, csrf, WALLET_SESSION_MAX_CSRF_HEADER_BYTES],
    ["origin", origin, MAX_ORIGIN_BYTES],
  ] as const;
  for (const [field, value, maximum] of boundedHeaders) {
    if (value !== undefined && utf8ByteLength(value) > maximum) {
      return Object.freeze({ field, status: "too_large" as const });
    }
  }

  return Object.freeze({
    headers: Object.freeze({
      ...(contentType === undefined ? {} : { contentType }),
      ...(cookie === undefined ? {} : { cookie }),
      ...(csrf === undefined ? {} : { csrf }),
      ...(origin === undefined ? {} : { origin }),
    }),
    status: "accepted" as const,
  });
};

const isJsonContentType = (value: string | undefined): boolean => {
  if (!value) {
    return false;
  }
  const [mediaType, ...parameters] = value.split(";").map((part) => part.trim().toLowerCase());
  return mediaType === JSON_CONTENT_TYPE
    && (parameters.length === 0
      || (parameters.length === 1 && parameters[0] === "charset=utf-8"));
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const captureOwnRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!isPlainRecord(value)) {
    return undefined;
  }
  const captured: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      return undefined;
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      return undefined;
    }
    Object.defineProperty(captured, key, {
      enumerable: true,
      value: descriptor.value,
    });
  }
  return captured;
};

const captureJsonBody = (body: unknown, maximumBytes: number): BodyCaptureResult => {
  let parsed = body;
  if (typeof body === "string") {
    const bytes = utf8ByteLength(body);
    if (bytes > maximumBytes) {
      return Object.freeze({ status: "too_large" as const });
    }
    if (bytes === 0) {
      return Object.freeze({ status: "invalid" as const });
    }
    const parsedResult = parseJsonWithUniqueObjectKeys(body);
    if (!parsedResult.ok) {
      return Object.freeze({ status: "invalid" as const });
    }
    parsed = parsedResult.value;
  }
  const captured = captureOwnRecord(parsed);
  return captured
    ? Object.freeze({ body: captured, status: "accepted" as const })
    : Object.freeze({ status: "invalid" as const });
};

const hasExactFields = (
  body: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  required: readonly string[],
): boolean => {
  const keys = Object.keys(body);
  return keys.every((key) => allowed.has(key))
    && required.every((key) => Object.prototype.hasOwnProperty.call(body, key));
};

const safeIdentifier = (value: unknown, maximum: number): value is string =>
  typeof value === "string"
  && utf8ByteLength(value) <= maximum
  && SAFE_IDENTIFIER_PATTERN.test(value);

const safeBoundedText = (
  value: unknown,
  minimumBytes: number,
  maximumBytes: number,
): value is string => {
  if (typeof value !== "string") {
    return false;
  }
  const bytes = utf8ByteLength(value);
  return bytes >= minimumBytes && bytes <= maximumBytes;
};

const decodeCanonicalHex = (value: unknown, maximumCharacters: number): Uint8Array | undefined => {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > maximumCharacters
    || value.length % 2 !== 0
    || !/^[a-f0-9]+$/.test(value)
  ) {
    return undefined;
  }
  const decoded = Uint8Array.from(Buffer.from(value, "hex"));
  return Buffer.from(decoded).toString("hex") === value ? decoded : undefined;
};

const cloneAdapterProofValue = (
  value: unknown,
  budget: AdapterProofBudget,
  depth: number,
): unknown | undefined => {
  if (depth > MAX_ADAPTER_PROOF_DEPTH) {
    return undefined;
  }
  if (value === null || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    budget.bytes += utf8ByteLength(value);
    if (budget.bytes > MAX_ADAPTER_PROOF_BYTES) {
      budget.tooLarge = true;
      return undefined;
    }
    return value;
  }
  if (Array.isArray(value)) {
    budget.entries += value.length;
    if (budget.entries > MAX_ADAPTER_PROOF_ENTRIES) {
      budget.tooLarge = true;
      return undefined;
    }
    const cloned: unknown[] = [];
    for (const item of value) {
      const next = cloneAdapterProofValue(item, budget, depth + 1);
      if (next === undefined) {
        return undefined;
      }
      cloned.push(next);
    }
    return Object.freeze(cloned);
  }
  const record = captureOwnRecord(value);
  if (!record) {
    return undefined;
  }
  const keys = Object.keys(record);
  budget.entries += keys.length;
  if (budget.entries > MAX_ADAPTER_PROOF_ENTRIES) {
    budget.tooLarge = true;
    return undefined;
  }
  const cloned: Record<string, unknown> = {};
  for (const key of keys) {
    if (
      !SAFE_ADAPTER_PROOF_KEY_PATTERN.test(key)
      || key === "constructor"
      || key === "prototype"
      || key === "__proto__"
    ) {
      return undefined;
    }
    budget.bytes += utf8ByteLength(key);
    if (budget.bytes > MAX_ADAPTER_PROOF_BYTES) {
      budget.tooLarge = true;
      return undefined;
    }
    const next = cloneAdapterProofValue(record[key], budget, depth + 1);
    if (next === undefined) {
      return undefined;
    }
    Object.defineProperty(cloned, key, { enumerable: true, value: next });
  }
  return Object.freeze(cloned);
};

const captureAdapterProof = (value: unknown): AdapterProofCloneResult => {
  if (!isPlainRecord(value)) {
    return Object.freeze({ status: "invalid" as const });
  }
  const budget: AdapterProofBudget = { bytes: 0, entries: 0, tooLarge: false };
  const cloned = cloneAdapterProofValue(value, budget, 0);
  if (budget.tooLarge) {
    return Object.freeze({ status: "too_large" as const });
  }
  return isPlainRecord(cloned)
    ? Object.freeze({ status: "accepted" as const, value: cloned })
    : Object.freeze({ status: "invalid" as const });
};

const baseHeaders = (traceId: string): Readonly<Record<string, string>> => Object.freeze({
  "content-type": JSON_UTF8_CONTENT_TYPE,
  [TRACE_HEADER_NAME]: traceId,
});

const successResponse = <TData>(
  data: TData,
  status: number,
  traceId: string,
  headers: Readonly<Record<string, string>> = {},
): WalletAuthenticationHttpResponse<TData> => Object.freeze({
  body: Object.freeze({ data, ok: true as const, traceId }),
  headers: Object.freeze({ ...baseHeaders(traceId), ...headers }),
  status,
});

const ERROR_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  AUTH_CONFLICT: "The wallet authentication request conflicts with current durable state.",
  AUTH_CSRF_INVALID: "The wallet session CSRF token is invalid.",
  AUTH_CSRF_REQUIRED: "A wallet session CSRF token is required.",
  AUTH_DEPENDENCY_UNAVAILABLE: "Wallet authentication is temporarily unavailable.",
  AUTH_FORBIDDEN: "The wallet session is not allowed to perform this operation.",
  AUTH_ORIGIN_FORBIDDEN: "The request Origin is not allowed.",
  AUTH_PROOF_INVALID: "The wallet ownership proof is invalid.",
  AUTH_RATE_LIMITED: "The wallet authentication request is rate limited.",
  AUTH_SESSION_INVALID: "The wallet session is invalid or no longer active.",
  AUTH_SESSION_REQUIRED: "A wallet session cookie is required.",
  INTERNAL_RUNTIME_ERROR: "The wallet authentication runtime could not complete the request.",
  INVALID_REQUEST: "The request does not match the wallet authentication API contract.",
  METHOD_NOT_ALLOWED: "The HTTP method is not allowed for this wallet authentication route.",
  REQUEST_TOO_LARGE: "The wallet authentication request exceeds an allowed bound.",
});

const failureResponse = (
  code: keyof typeof ERROR_MESSAGES,
  status: number,
  traceId: string,
  details?: WalletAuthenticationHttpErrorDetails,
): WalletAuthenticationHttpResponse => Object.freeze({
  body: Object.freeze({
    error: Object.freeze({
      code,
      ...(details && Object.keys(details).length > 0
        ? { details: Object.freeze({ ...details }) }
        : {}),
      message: ERROR_MESSAGES[code],
    }),
    ok: false as const,
    traceId,
  }),
  headers: baseHeaders(traceId),
  status,
});

const invalidRequest = (traceId: string, field?: string): WalletAuthenticationHttpResponse =>
  failureResponse("INVALID_REQUEST", 400, traceId, field ? { field } : undefined);

const tooLarge = (traceId: string, field: string): WalletAuthenticationHttpResponse =>
  failureResponse("REQUEST_TOO_LARGE", 413, traceId, { field });

const safeDiagnosticDetails = (
  failure: WalletAuthenticationRuntimeFailure,
): WalletAuthenticationHttpErrorDetails => {
  const code = failure.diagnostic?.code;
  const field = failure.diagnostic?.field;
  const retryable = failure.diagnostic?.retryable;
  return Object.freeze({
    ...(typeof code === "string" && SAFE_DIAGNOSTIC_PATTERN.test(code)
      ? { diagnosticCode: code }
      : {}),
    ...(safeIdentifier(field, 80) ? { field } : {}),
    ...(typeof retryable === "boolean" ? { retryable } : {}),
  });
};

const runtimeFailure = (
  value: unknown,
  traceId: string,
): WalletAuthenticationHttpResponse | undefined => {
  if (!isPlainRecord(value) || !Object.prototype.hasOwnProperty.call(value, "diagnostic")) {
    return undefined;
  }
  const status = value.status;
  const diagnostic = captureOwnRecord(value.diagnostic);
  if (
    !diagnostic
    || typeof diagnostic.code !== "string"
    || !SAFE_DIAGNOSTIC_PATTERN.test(diagnostic.code)
    || typeof diagnostic.field !== "string"
    || typeof diagnostic.retryable !== "boolean"
    || typeof diagnostic.traceId !== "string"
  ) {
    return failureResponse("INTERNAL_RUNTIME_ERROR", 500, traceId);
  }
  const captured = Object.freeze({
    diagnostic: Object.freeze({
      code: diagnostic.code as WalletAuthenticationRuntimeDiagnosticCode,
      field: diagnostic.field,
      retryable: diagnostic.retryable,
      traceId: diagnostic.traceId,
    }),
    status,
  }) as WalletAuthenticationRuntimeFailure;
  const details = safeDiagnosticDetails(captured);
  if (status === "rejected") {
    return diagnostic.code === "WALLET_AUTH_RUNTIME_PROOF_REJECTED"
      ? failureResponse("AUTH_PROOF_INVALID", 401, traceId, details)
      : failureResponse("INVALID_REQUEST", 400, traceId, details);
  }
  if (status === "unauthorized") {
    return failureResponse("AUTH_SESSION_INVALID", 401, traceId, details);
  }
  if (status === "forbidden") {
    if (diagnostic.code === "WALLET_AUTH_RUNTIME_ORIGIN_REJECTED") {
      return failureResponse("AUTH_ORIGIN_FORBIDDEN", 403, traceId, details);
    }
    if (diagnostic.code === "WALLET_AUTH_RUNTIME_CSRF_REJECTED") {
      return failureResponse("AUTH_CSRF_INVALID", 403, traceId, details);
    }
    return failureResponse("AUTH_FORBIDDEN", 403, traceId, details);
  }
  if (status === "conflict") {
    return failureResponse("AUTH_CONFLICT", 409, traceId, details);
  }
  if (status === "rate_limited") {
    return failureResponse("AUTH_RATE_LIMITED", 429, traceId, details);
  }
  if (status === "unavailable" || status === "blocked") {
    return failureResponse("AUTH_DEPENDENCY_UNAVAILABLE", 503, traceId, details);
  }
  return failureResponse("INTERNAL_RUNTIME_ERROR", 500, traceId);
};

const canonicalInstant = (value: unknown): value is string =>
  typeof value === "string"
  && value.length <= 32
  && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString() === value;

const safeUniqueStrings = (
  value: unknown,
  maximumItems: number,
  maximumBytes: number,
  pattern: RegExp,
): readonly string[] | undefined => {
  if (!Array.isArray(value) || value.length === 0 || value.length > maximumItems) {
    return undefined;
  }
  const items: string[] = [];
  for (const item of value) {
    if (
      typeof item !== "string"
      || utf8ByteLength(item) > maximumBytes
      || !pattern.test(item)
      || items.includes(item)
    ) {
      return undefined;
    }
    items.push(item);
  }
  return Object.freeze(items);
};

const projectSafeSession = (value: unknown): Readonly<Record<string, unknown>> | undefined => {
  const session = captureOwnRecord(value);
  if (!session) {
    return undefined;
  }
  const roles = safeUniqueStrings(session.roleIds, 8, 64, SAFE_ROLE_PATTERN);
  const capabilities = safeUniqueStrings(
    session.capabilities,
    32,
    80,
    SAFE_CAPABILITY_PATTERN,
  );
  if (
    !safeIdentifier(session.sessionId, 160)
    || !safeIdentifier(session.walletAddress, 160)
    || !ACCOUNT_TYPES.has(session.accountType as string)
    || !WALLET_SOURCES.has(session.walletSource as string)
    || !safeIdentifier(session.chainId, 32)
    || (session.network !== "mainnet" && session.network !== "testnet")
    || !roles
    || !capabilities
    || !canonicalInstant(session.issuedAt)
    || !canonicalInstant(session.idleExpiresAt)
    || !canonicalInstant(session.absoluteExpiresAt)
    || session.status !== "active"
  ) {
    return undefined;
  }
  return Object.freeze({
    absoluteExpiresAt: session.absoluteExpiresAt,
    accountType: session.accountType,
    capabilities,
    chainId: session.chainId,
    idleExpiresAt: session.idleExpiresAt,
    issuedAt: session.issuedAt,
    network: session.network,
    roles,
    sessionId: session.sessionId,
    status: "active" as const,
    walletAddress: session.walletAddress,
    walletSource: session.walletSource,
  });
};

const projectSessionResponse = (value: unknown): Readonly<Record<string, unknown>> | undefined => {
  const response = captureOwnRecord(value);
  if (!response || !safeBoundedText(response.csrfToken, 32, 512)) {
    return undefined;
  }
  if (!SAFE_CSRF_PATTERN.test(response.csrfToken)) {
    return undefined;
  }
  const session = projectSafeSession(response.session);
  return session
    ? Object.freeze({ csrfToken: response.csrfToken, session })
    : undefined;
};

const projectChallenge = (value: unknown): Readonly<Record<string, unknown>> | undefined => {
  const challenge = captureOwnRecord(value);
  if (
    !challenge
    || !safeIdentifier(challenge.id, 160)
    || challenge.version !== "campaign-os-wallet-auth/v1"
    || !safeBoundedText(challenge.message, 1, MAX_MESSAGE_BYTES)
    || !safeIdentifier(challenge.requestedWalletAddress, 160)
    || !safeIdentifier(challenge.adapterId, 80)
    || !safeIdentifier(challenge.chainId, 32)
    || (challenge.network !== "mainnet" && challenge.network !== "testnet")
    || !canonicalInstant(challenge.expiresAt)
  ) {
    return undefined;
  }
  return Object.freeze({
    adapterId: challenge.adapterId,
    challengeId: challenge.id,
    chainId: challenge.chainId,
    expiresAt: challenge.expiresAt,
    message: challenge.message,
    network: challenge.network,
    version: challenge.version,
    walletAddress: challenge.requestedWalletAddress,
  });
};

const takeCookieHeader = (delivery: Record<string, unknown>, method: string): string | undefined => {
  const take = delivery[method];
  if (typeof take !== "function") {
    return undefined;
  }
  const value = take.call(delivery) as unknown;
  return typeof value === "string"
    && value.length > 0
    && utf8ByteLength(value) <= MAX_RESPONSE_COOKIE_BYTES
    && !/[\r\n]/.test(value)
    ? value
    : undefined;
};

const matchRoute = (pathname: string): MatchedRoute | undefined => {
  if (pathname === "/api/wallet/auth/challenges") {
    return Object.freeze({ operation: "challenge", requiredMethod: "POST" });
  }
  if (pathname === "/api/wallet/auth/sessions") {
    return Object.freeze({ operation: "session", requiredMethod: "POST" });
  }
  if (pathname === "/api/wallet/auth/session") {
    return Object.freeze({ operation: "current", requiredMethod: "GET" });
  }
  if (pathname === "/api/wallet/auth/session/rotate") {
    return Object.freeze({ operation: "rotate", requiredMethod: "POST" });
  }
  if (pathname === "/api/wallet/auth/logout") {
    return Object.freeze({ operation: "logout", requiredMethod: "POST" });
  }
  const adminMatch = /^\/api\/admin\/wallet-sessions\/([^/]+)\/revoke$/.exec(pathname);
  if (!adminMatch) {
    return undefined;
  }
  let targetSessionId: string;
  try {
    targetSessionId = decodeURIComponent(adminMatch[1]);
  } catch {
    targetSessionId = "";
  }
  return Object.freeze({
    operation: "revoke",
    requiredMethod: "POST",
    targetSessionId,
  });
};

const signalInput = (signal: AbortSignal | undefined): Readonly<{ signal?: AbortSignal }> =>
  signal === undefined ? {} : { signal };

const originFailure = (
  originPolicy: WalletAuthenticationOriginPolicy,
  origin: string | undefined,
  traceId: string,
): WalletAuthenticationHttpResponse | undefined => {
  if (!origin) {
    return failureResponse("AUTH_ORIGIN_FORBIDDEN", 403, traceId, { field: "origin" });
  }
  try {
    return originPolicy.requireOrigin(origin, traceId)
      ? undefined
      : failureResponse("AUTH_ORIGIN_FORBIDDEN", 403, traceId, { field: "origin" });
  } catch {
    return failureResponse("AUTH_DEPENDENCY_UNAVAILABLE", 503, traceId, {
      field: "origin",
      retryable: true,
    });
  }
};

const requireCookie = (
  cookie: string | undefined,
  traceId: string,
): WalletAuthenticationHttpResponse | undefined =>
  cookie && cookie.length > 0
    ? undefined
    : failureResponse("AUTH_SESSION_REQUIRED", 401, traceId, { field: "cookie" });

const requireCsrf = (
  csrf: string | undefined,
  traceId: string,
): WalletAuthenticationHttpResponse | undefined =>
  csrf && csrf.length > 0
    ? undefined
    : failureResponse("AUTH_CSRF_REQUIRED", 403, traceId, { field: CSRF_HEADER_NAME });

const issueChallenge = async (
  runtime: WalletAuthenticationHttpRuntime,
  request: WalletAuthenticationHttpRequest,
  headers: CapturedHeaders,
  traceId: string,
): Promise<WalletAuthenticationHttpResponse> => {
  if (!isJsonContentType(headers.contentType)) {
    return invalidRequest(traceId, "content-type");
  }
  const captured = captureJsonBody(request.body, MAX_CHALLENGE_BODY_BYTES);
  if (captured.status === "too_large") {
    return tooLarge(traceId, "body");
  }
  if (
    captured.status !== "accepted"
    || !hasExactFields(captured.body, CHALLENGE_FIELDS, CHALLENGE_REQUIRED_FIELDS)
    || !safeIdentifier(captured.body.walletAddress, 160)
    || !safeIdentifier(captured.body.adapterId, 80)
    || !isCanonicalLiveWalletChainId(captured.body.chainId)
    || (captured.body.network !== "mainnet" && captured.body.network !== "testnet")
    || (captured.body.caHash !== undefined && !safeIdentifier(captured.body.caHash, 128))
  ) {
    return invalidRequest(traceId, "body");
  }
  try {
    const result = await runtime.issueChallenge({
      adapterId: captured.body.adapterId,
      ...(captured.body.caHash === undefined ? {} : { caHash: captured.body.caHash }),
      chainId: captured.body.chainId,
      network: captured.body.network,
      requestedWalletAddress: captured.body.walletAddress,
      ...signalInput(request.signal),
      traceId,
    });
    const failed = runtimeFailure(result, traceId);
    if (failed) {
      return failed;
    }
    const outcome = captureOwnRecord(result);
    const challenge = outcome?.status === "issued" ? projectChallenge(outcome.challenge) : undefined;
    return challenge
      ? successResponse(challenge, 201, traceId)
      : failureResponse("INTERNAL_RUNTIME_ERROR", 500, traceId);
  } catch {
    return failureResponse("INTERNAL_RUNTIME_ERROR", 500, traceId);
  }
};

const issueSession = async (
  runtime: WalletAuthenticationHttpRuntime,
  request: WalletAuthenticationHttpRequest,
  headers: CapturedHeaders,
  traceId: string,
): Promise<WalletAuthenticationHttpResponse> => {
  if (!isJsonContentType(headers.contentType)) {
    return invalidRequest(traceId, "content-type");
  }
  const captured = captureJsonBody(request.body, MAX_SESSION_BODY_BYTES);
  if (captured.status === "too_large") {
    return tooLarge(traceId, "body");
  }
  if (
    captured.status !== "accepted"
    || !hasExactFields(captured.body, SESSION_FIELDS, SESSION_REQUIRED_FIELDS)
    || !safeIdentifier(captured.body.challengeId, 160)
    || !safeBoundedText(captured.body.message, 1, MAX_MESSAGE_BYTES)
    || !safeBoundedText(captured.body.nonce, MIN_NONCE_BYTES, MAX_NONCE_BYTES)
    || !SAFE_NONCE_PATTERN.test(captured.body.nonce)
  ) {
    return invalidRequest(traceId, "body");
  }
  const signature = decodeCanonicalHex(captured.body.signature, MAX_SIGNATURE_CHARACTERS);
  const publicKey = captured.body.publicKey === undefined
    ? undefined
    : decodeCanonicalHex(captured.body.publicKey, MAX_PUBLIC_KEY_CHARACTERS);
  if (!signature || (captured.body.publicKey !== undefined && !publicKey)) {
    return invalidRequest(traceId, captured.body.publicKey !== undefined ? "publicKey" : "signature");
  }
  const adapterProof = captured.body.adapterProof === undefined
    ? undefined
    : captureAdapterProof(captured.body.adapterProof);
  if (adapterProof?.status === "too_large") {
    return tooLarge(traceId, "adapterProof");
  }
  if (adapterProof && adapterProof.status !== "accepted") {
    return invalidRequest(traceId, "adapterProof");
  }
  try {
    const result = await runtime.verifyProof({
      ...(adapterProof?.status === "accepted" ? { adapterProof: adapterProof.value } : {}),
      challengeId: captured.body.challengeId,
      message: captured.body.message,
      nonce: captured.body.nonce,
      ...(publicKey === undefined ? {} : { publicKey }),
      ...signalInput(request.signal),
      signature,
      traceId,
    });
    const failed = runtimeFailure(result, traceId);
    if (failed) {
      return failed;
    }
    const delivery = captureOwnRecord(result);
    const response = delivery?.status === "authenticated"
      ? projectSessionResponse(delivery.response)
      : undefined;
    const cookie = delivery && response
      ? takeCookieHeader(delivery, "takeSetCookieHeader")
      : undefined;
    return response && cookie
      ? successResponse(response, 201, traceId, { "set-cookie": cookie })
      : failureResponse("INTERNAL_RUNTIME_ERROR", 500, traceId);
  } catch {
    return failureResponse("INTERNAL_RUNTIME_ERROR", 500, traceId);
  }
};

const currentSession = async (
  runtime: WalletAuthenticationHttpRuntime,
  request: WalletAuthenticationHttpRequest,
  headers: CapturedHeaders,
  traceId: string,
): Promise<WalletAuthenticationHttpResponse> => {
  if (request.body !== undefined) {
    return invalidRequest(traceId, "body");
  }
  const missingCookie = requireCookie(headers.cookie, traceId);
  if (missingCookie) {
    return missingCookie;
  }
  try {
    const result = await runtime.currentSession({
      cookieHeader: headers.cookie,
      origin: headers.origin,
      ...signalInput(request.signal),
      traceId,
    });
    const failed = runtimeFailure(result, traceId);
    if (failed) {
      return failed;
    }
    const outcome = captureOwnRecord(result);
    const response = outcome?.status === "active"
      ? projectSessionResponse(outcome.response)
      : undefined;
    return response
      ? successResponse(response, 200, traceId)
      : failureResponse("INTERNAL_RUNTIME_ERROR", 500, traceId);
  } catch {
    return failureResponse("INTERNAL_RUNTIME_ERROR", 500, traceId);
  }
};

const rotateSession = async (
  runtime: WalletAuthenticationHttpRuntime,
  request: WalletAuthenticationHttpRequest,
  headers: CapturedHeaders,
  traceId: string,
): Promise<WalletAuthenticationHttpResponse> => {
  if (request.body !== undefined) {
    return invalidRequest(traceId, "body");
  }
  const missingCookie = requireCookie(headers.cookie, traceId);
  if (missingCookie) {
    return missingCookie;
  }
  const missingCsrf = requireCsrf(headers.csrf, traceId);
  if (missingCsrf) {
    return missingCsrf;
  }
  try {
    const result = await runtime.rotateSession({
      cookieHeader: headers.cookie,
      csrfHeader: headers.csrf,
      origin: headers.origin,
      ...signalInput(request.signal),
      traceId,
    });
    const failed = runtimeFailure(result, traceId);
    if (failed) {
      return failed;
    }
    const delivery = captureOwnRecord(result);
    const response = delivery?.status === "rotated"
      ? projectSessionResponse(delivery.response)
      : undefined;
    const cookie = delivery && response
      ? takeCookieHeader(delivery, "takeSetCookieHeader")
      : undefined;
    return response && cookie
      ? successResponse(response, 200, traceId, { "set-cookie": cookie })
      : failureResponse("INTERNAL_RUNTIME_ERROR", 500, traceId);
  } catch {
    return failureResponse("INTERNAL_RUNTIME_ERROR", 500, traceId);
  }
};

const logout = async (
  runtime: WalletAuthenticationHttpRuntime,
  request: WalletAuthenticationHttpRequest,
  headers: CapturedHeaders,
  traceId: string,
): Promise<WalletAuthenticationHttpResponse> => {
  if (request.body !== undefined) {
    return invalidRequest(traceId, "body");
  }
  const missingCookie = requireCookie(headers.cookie, traceId);
  if (missingCookie) {
    return missingCookie;
  }
  const missingCsrf = requireCsrf(headers.csrf, traceId);
  if (missingCsrf) {
    return missingCsrf;
  }
  try {
    const result = await runtime.logout({
      cookieHeader: headers.cookie,
      csrfHeader: headers.csrf,
      origin: headers.origin,
      ...signalInput(request.signal),
      traceId,
    });
    const failed = runtimeFailure(result, traceId);
    if (failed) {
      return failed;
    }
    const outcome = captureOwnRecord(result);
    if (outcome?.status !== "logged_out" && outcome?.status !== "already_terminal") {
      return failureResponse("INTERNAL_RUNTIME_ERROR", 500, traceId);
    }
    const cookie = takeCookieHeader(outcome, "takeClearCookieHeader");
    return cookie
      ? successResponse(
        Object.freeze({ revoked: outcome.status === "logged_out" }),
        200,
        traceId,
        { "set-cookie": cookie },
      )
      : failureResponse("INTERNAL_RUNTIME_ERROR", 500, traceId);
  } catch {
    return failureResponse("INTERNAL_RUNTIME_ERROR", 500, traceId);
  }
};

const revokeSession = async (
  adminRevokeExecutor: WalletAuthenticationAdminRevokeExecutor,
  request: WalletAuthenticationHttpRequest,
  headers: CapturedHeaders,
  targetSessionId: string | undefined,
  traceId: string,
): Promise<WalletAuthenticationHttpResponse> => {
  if (!isJsonContentType(headers.contentType)) {
    return invalidRequest(traceId, "content-type");
  }
  const captured = captureJsonBody(request.body, MAX_ADMIN_REVOKE_BODY_BYTES);
  if (captured.status === "too_large") {
    return tooLarge(traceId, "body");
  }
  if (
    captured.status !== "accepted"
    || !hasExactFields(captured.body, ADMIN_REVOKE_FIELDS, ADMIN_REVOKE_REQUIRED_FIELDS)
    || !ADMIN_REVOKE_REASON_CODES.has(captured.body.reasonCode as string)
    || !safeIdentifier(targetSessionId, 160)
  ) {
    return invalidRequest(traceId, "body");
  }
  const missingCookie = requireCookie(headers.cookie, traceId);
  if (missingCookie) {
    return missingCookie;
  }
  const missingCsrf = requireCsrf(headers.csrf, traceId);
  if (missingCsrf) {
    return missingCsrf;
  }
  const cookieHeader = headers.cookie;
  const csrfHeader = headers.csrf;
  const origin = headers.origin;
  if (!cookieHeader || !csrfHeader || !origin) {
    return invalidRequest(traceId, "headers");
  }
  let result: WalletAuthenticationAdminRevokeResult;
  try {
    result = await adminRevokeExecutor.revoke({
      cookieHeader,
      csrfHeader,
      origin,
      reasonCode: captured.body.reasonCode as string,
      signal: request.signal,
      targetSessionId,
      traceId,
    });
  } catch {
    return failureResponse("AUTH_DEPENDENCY_UNAVAILABLE", 503, traceId, {
      field: "authorization",
      retryable: true,
    });
  }
  const outcome = captureOwnRecord(result);
  const status = outcome?.status;
  if (!outcome || typeof status !== "string") {
    return failureResponse("INTERNAL_RUNTIME_ERROR", 500, traceId);
  }
  if (status !== "revoked" && status !== "already_terminal") {
    if (status !== "unauthorized" && status !== "forbidden" && status !== "unavailable") {
      return failureResponse("INTERNAL_RUNTIME_ERROR", 500, traceId);
    }
    const details: WalletAuthenticationHttpErrorDetails = Object.freeze({
      ...(typeof outcome.diagnosticCode === "string"
        && SAFE_DIAGNOSTIC_PATTERN.test(outcome.diagnosticCode)
        ? { diagnosticCode: outcome.diagnosticCode }
        : {}),
      field: "authorization",
      ...(typeof outcome.retryable === "boolean"
        ? { retryable: outcome.retryable }
        : {}),
    });
    if (status === "unauthorized") {
      return failureResponse("AUTH_SESSION_INVALID", 401, traceId, details);
    }
    if (status === "forbidden") {
      return failureResponse("AUTH_FORBIDDEN", 403, traceId, details);
    }
    return failureResponse("AUTH_DEPENDENCY_UNAVAILABLE", 503, traceId, details);
  }
  return successResponse(Object.freeze({
    revoked: status === "revoked",
    sessionId: targetSessionId,
  }), 200, traceId);
};

export const createWalletAuthenticationHttpController = ({
  adminRevokeExecutor,
  originPolicy,
  runtime,
  traceIdGenerator,
}: CreateWalletAuthenticationHttpControllerInput): WalletAuthenticationHttpController => {
  if (
    !runtime
    || typeof runtime.issueChallenge !== "function"
    || typeof runtime.verifyProof !== "function"
    || typeof runtime.currentSession !== "function"
    || typeof runtime.rotateSession !== "function"
    || typeof runtime.logout !== "function"
    || !originPolicy
    || typeof originPolicy.requireOrigin !== "function"
    || !adminRevokeExecutor
    || typeof adminRevokeExecutor.revoke !== "function"
    || (traceIdGenerator !== undefined && typeof traceIdGenerator !== "function")
  ) {
    throw new TypeError("Wallet authentication HTTP controller dependencies are invalid.");
  }

  return Object.freeze({
    handle: async (
      request: WalletAuthenticationHttpRequest,
    ): Promise<WalletAuthenticationHttpResponse | undefined> => {
      let method: string;
      let rawPath: string;
      let body: unknown;
      let headersSource: WalletAuthenticationHttpHeaders | undefined;
      let signal: AbortSignal | undefined;
      try {
        method = request?.method;
        rawPath = request?.path;
        body = request?.body;
        headersSource = request?.headers;
        signal = request?.signal;
      } catch {
        return failureResponse("INVALID_REQUEST", 400, resolveTraceId(undefined, traceIdGenerator));
      }
      if (typeof method !== "string" || typeof rawPath !== "string") {
        return failureResponse("INVALID_REQUEST", 400, resolveTraceId(headersSource, traceIdGenerator));
      }
      if (!isUnambiguousApiRequestTarget(rawPath)) {
        return rawPath.startsWith("/api/")
          ? invalidRequest(resolveTraceId(headersSource, traceIdGenerator), "path")
          : undefined;
      }

      let target: URL;
      try {
        if (!rawPath.startsWith("/")) {
          return undefined;
        }
        target = new URL(rawPath, "http://wallet-auth.invalid");
      } catch {
        return undefined;
      }
      const matched = matchRoute(target.pathname);
      if (!matched) {
        return undefined;
      }
      const traceId = resolveTraceId(headersSource, traceIdGenerator);
      if (target.search || target.hash) {
        return invalidRequest(traceId, "path");
      }
      const normalizedMethod = method.trim().toUpperCase();
      if (normalizedMethod !== matched.requiredMethod) {
        return failureResponse("METHOD_NOT_ALLOWED", 405, traceId, { field: "method" });
      }
      if (signal !== undefined && !(signal instanceof AbortSignal)) {
        return invalidRequest(traceId, "signal");
      }

      const capturedHeaders = captureHeaders(headersSource);
      if (capturedHeaders.status === "too_large") {
        return tooLarge(traceId, capturedHeaders.field);
      }
      if (capturedHeaders.status !== "accepted") {
        return invalidRequest(traceId, capturedHeaders.field);
      }
      const originRejected = originFailure(originPolicy, capturedHeaders.headers.origin, traceId);
      if (originRejected) {
        return originRejected;
      }
      const capturedRequest = Object.freeze({
        ...(body === undefined ? {} : { body }),
        ...(headersSource === undefined ? {} : { headers: headersSource }),
        method,
        path: rawPath,
        ...(signal === undefined ? {} : { signal }),
      });
      if (matched.operation === "challenge") {
        return issueChallenge(runtime, capturedRequest, capturedHeaders.headers, traceId);
      }
      if (matched.operation === "session") {
        return issueSession(runtime, capturedRequest, capturedHeaders.headers, traceId);
      }
      if (matched.operation === "current") {
        return currentSession(runtime, capturedRequest, capturedHeaders.headers, traceId);
      }
      if (matched.operation === "rotate") {
        return rotateSession(runtime, capturedRequest, capturedHeaders.headers, traceId);
      }
      if (matched.operation === "logout") {
        return logout(runtime, capturedRequest, capturedHeaders.headers, traceId);
      }
      return revokeSession(
        adminRevokeExecutor,
        capturedRequest,
        capturedHeaders.headers,
        matched.targetSessionId,
        traceId,
      );
    },
  });
};
