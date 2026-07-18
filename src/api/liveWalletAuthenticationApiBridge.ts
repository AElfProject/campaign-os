import {
  isCanonicalLiveWalletAccountType,
  isCanonicalLiveWalletChainId,
  isCanonicalLiveWalletNetwork,
  type CanonicalLiveWalletAccountType,
  type CanonicalLiveWalletChainId,
  type CanonicalLiveWalletNetwork,
} from "../domain/wallet";

export type LiveWalletAuthenticationApiFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type LiveWalletAuthenticationMode =
  | "live_disabled"
  | "live_local_stage"
  | "live_production"
  | "preview";

export type LiveWalletAuthenticationOperation =
  | "getCurrentSession"
  | "issueChallenge"
  | "issueSession"
  | "logout"
  | "rotateSession";

export type LiveWalletAuthenticationFailureCategory =
  | "aborted"
  | "closed"
  | "configuration"
  | "conflict"
  | "forbidden"
  | "invalid_request"
  | "invalid_response"
  | "network"
  | "preview_blocked"
  | "rate_limited"
  | "stale"
  | "timeout"
  | "unauthorized"
  | "unavailable";

export type LiveWalletAuthenticationBridgeCode =
  | "BRIDGE_BASE_URL_INVALID"
  | "BRIDGE_BASE_URL_MISSING"
  | "BRIDGE_CHALLENGE_MESSAGE_INVALID"
  | "BRIDGE_CLOSED"
  | "BRIDGE_CSRF_UNAVAILABLE"
  | "BRIDGE_INVALID_INPUT"
  | "BRIDGE_LIVE_DISABLED"
  | "BRIDGE_NETWORK_ERROR"
  | "BRIDGE_PREVIEW_INVOCATION_BLOCKED"
  | "BRIDGE_REQUEST_ABORTED"
  | "BRIDGE_REQUEST_TIMEOUT"
  | "BRIDGE_RESPONSE_FORBIDDEN_AUTH_FIELD"
  | "BRIDGE_RESPONSE_INVALID"
  | "BRIDGE_RESPONSE_NON_JSON"
  | "BRIDGE_RESPONSE_OVERSIZE"
  | "BRIDGE_STALE_SESSION_EPOCH";

export type LiveWalletAuthenticationErrorCode =
  | LiveWalletAuthenticationBridgeCode
  | (string & {});

export type LiveWalletAuthenticationWalletSource =
  | "NIGHTELF"
  | "OTHER"
  | "PORTKEY_AA"
  | "PORTKEY_EOA_APP"
  | "PORTKEY_EOA_EXTENSION";

export interface LiveWalletAuthenticationApiConfig {
  readonly baseUrl?: string;
  readonly maxResponseBytes?: number;
  readonly mode?: LiveWalletAuthenticationMode;
  readonly timeoutMs?: number;
  readonly tracePrefix?: string;
}

export interface LiveWalletAuthenticationApiBridgeFactoryOptions {
  readonly config?: LiveWalletAuthenticationApiConfig;
  readonly fetchImpl?: LiveWalletAuthenticationApiFetch;
  readonly traceIdGenerator?: (operation: LiveWalletAuthenticationOperation) => string;
}

export interface LiveWalletAuthenticationRequestContext {
  readonly signal?: AbortSignal;
  readonly traceId?: string;
}

export interface LiveWalletAuthenticationChallengeInput {
  readonly adapterId: string;
  readonly caHash?: string;
  readonly chainId: CanonicalLiveWalletChainId;
  readonly network: CanonicalLiveWalletNetwork;
  readonly walletAddress: string;
}

export interface LiveWalletAuthenticationSessionProofInput {
  readonly adapterProof?: Readonly<Record<string, unknown>>;
  readonly challengeId: string;
  readonly message: string;
  readonly nonce?: string;
  readonly publicKey?: Uint8Array;
  readonly signature: Uint8Array;
}

export interface LiveWalletAuthenticationChallenge {
  readonly adapterId: string;
  readonly challengeId: string;
  readonly chainId: CanonicalLiveWalletChainId;
  readonly expiresAt: string;
  readonly message: string;
  readonly network: CanonicalLiveWalletNetwork;
  readonly version: "campaign-os-wallet-auth/v1";
  readonly walletAddress: string;
}

export type CanonicalWalletAuthenticationNonceResult =
  | Readonly<{ nonce: string; ok: true }>
  | Readonly<{
    code: "BRIDGE_CHALLENGE_MESSAGE_INVALID";
    ok: false;
  }>;

export interface LiveWalletAuthenticationSession {
  readonly absoluteExpiresAt: string;
  readonly accountType: CanonicalLiveWalletAccountType;
  readonly capabilities: readonly string[];
  readonly chainId: CanonicalLiveWalletChainId;
  readonly idleExpiresAt: string;
  readonly issuedAt: string;
  readonly network: CanonicalLiveWalletNetwork;
  readonly roles: readonly string[];
  readonly sessionId: string;
  readonly status: "active";
  readonly walletAddress: string;
  readonly walletSource: LiveWalletAuthenticationWalletSource;
}

export interface LiveWalletAuthenticationSafeErrorDetails {
  readonly diagnosticCode?: string;
  readonly field?: string;
  readonly retryable?: boolean;
}

export interface LiveWalletAuthenticationFailure {
  readonly category: LiveWalletAuthenticationFailureCategory;
  readonly code: LiveWalletAuthenticationErrorCode;
  readonly details?: LiveWalletAuthenticationSafeErrorDetails;
  readonly httpStatus?: number;
  readonly localSessionCleared?: true;
  readonly ok: false;
  readonly reconnectRequired: boolean;
  readonly retryable: boolean;
  readonly traceId: string;
}

interface LiveWalletAuthenticationSuccessBase {
  readonly category?: never;
  readonly code?: never;
  readonly httpStatus: number;
  readonly ok: true;
  readonly traceId: string;
}

export interface LiveWalletAuthenticationChallengeSuccess
  extends LiveWalletAuthenticationSuccessBase {
  readonly challenge: LiveWalletAuthenticationChallenge;
  readonly status: "challenge_issued";
}

export interface LiveWalletAuthenticationSessionSuccess
  extends LiveWalletAuthenticationSuccessBase {
  readonly session: LiveWalletAuthenticationSession;
  readonly status: "authenticated" | "restored" | "rotated";
}

export interface LiveWalletAuthenticationLogoutSuccess
  extends LiveWalletAuthenticationSuccessBase {
  readonly localSessionCleared: true;
  readonly revoked: boolean;
  readonly status: "logged_out";
}

export type LiveWalletAuthenticationChallengeResult =
  | LiveWalletAuthenticationChallengeSuccess
  | LiveWalletAuthenticationFailure;

export type LiveWalletAuthenticationSessionResult =
  | LiveWalletAuthenticationSessionSuccess
  | LiveWalletAuthenticationFailure;

export type LiveWalletAuthenticationLogoutResult =
  | LiveWalletAuthenticationLogoutSuccess
  | (LiveWalletAuthenticationFailure & Readonly<{ localSessionCleared: true }>);

export interface LiveWalletAuthenticationApiBridge {
  clearLocalSession(): void;
  close(): void;
  getCurrentSession(
    context?: LiveWalletAuthenticationRequestContext,
  ): Promise<LiveWalletAuthenticationSessionResult>;
  issueChallenge(
    input: LiveWalletAuthenticationChallengeInput,
    context?: LiveWalletAuthenticationRequestContext,
  ): Promise<LiveWalletAuthenticationChallengeResult>;
  issueSession(
    input: LiveWalletAuthenticationSessionProofInput,
    context?: LiveWalletAuthenticationRequestContext,
  ): Promise<LiveWalletAuthenticationSessionResult>;
  logout(
    context?: LiveWalletAuthenticationRequestContext,
  ): Promise<LiveWalletAuthenticationLogoutResult>;
  rotateSession(
    context?: LiveWalletAuthenticationRequestContext,
  ): Promise<LiveWalletAuthenticationSessionResult>;
}

interface NormalizedConfig {
  readonly baseUrl?: string;
  readonly configCode?: "BRIDGE_BASE_URL_INVALID" | "BRIDGE_BASE_URL_MISSING";
  readonly maxResponseBytes: number;
  readonly mode: LiveWalletAuthenticationMode;
  readonly timeoutMs: number;
  readonly tracePrefix: string;
}

interface CapturedContext {
  readonly signal?: AbortSignal;
  readonly status: "accepted" | "invalid";
  readonly traceId?: string;
}

interface PreparedInvocation {
  readonly failure?: LiveWalletAuthenticationFailure;
  readonly signal?: AbortSignal;
  readonly traceId: string;
}

interface SessionRequestFence {
  readonly epoch: number;
  readonly sequence: number;
}

interface WireSuccess {
  readonly body: Record<string, unknown>;
  readonly httpStatus: number;
  readonly ok: true;
  readonly responseTraceHeader?: string;
}

type WireResult = WireSuccess | LiveWalletAuthenticationFailure;

interface ParsedSessionEnvelope {
  readonly csrfToken: string;
  readonly session: LiveWalletAuthenticationSession;
  readonly traceId: string;
}

interface ParsedErrorEnvelope {
  readonly code: string;
  readonly details?: LiveWalletAuthenticationSafeErrorDetails;
  readonly traceId: string;
}

interface JsonCursor {
  index: number;
  readonly source: string;
}

interface JsonCloneBudget {
  bytes: number;
  entries: number;
}

interface ParsedCanonicalChallengeMessage {
  readonly adapterId: string;
  readonly caHash: string;
  readonly chainId: CanonicalLiveWalletChainId;
  readonly domain: string;
  readonly expiresAt: string;
  readonly issuedAt: string;
  readonly network: CanonicalLiveWalletNetwork;
  readonly nonce: string;
  readonly requestId: string;
  readonly uri: string;
  readonly version: "campaign-os-wallet-auth/v1";
  readonly walletAddress: string;
}

const DEFAULT_TIMEOUT_MS = 8_000;
const MIN_TIMEOUT_MS = 100;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 64 * 1_024;
const MIN_MAX_RESPONSE_BYTES = 1_024;
const MAX_MAX_RESPONSE_BYTES = 256 * 1_024;
const DEFAULT_TRACE_PREFIX = "wallet-browser-auth";
const JSON_VALUE_MAX_DEPTH = 64;
const ADAPTER_PROOF_MAX_DEPTH = 8;
const ADAPTER_PROOF_MAX_ENTRIES = 256;
const ADAPTER_PROOF_MAX_BYTES = 65_536;
const MAX_MESSAGE_BYTES = 16_384;
const MAX_SIGNATURE_BYTES = 4_096;
const MAX_PUBLIC_KEY_BYTES = 2_048;

const TRACE_HEADER_NAME = "x-campaign-os-trace-id";
const CSRF_HEADER_NAME = "x-campaign-os-csrf";

const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const SAFE_TRACE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const UNSAFE_TRACE_PATTERN = /(?:bearer|cookie|credential|password|private|proof|secret|signature|token)/i;
const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const SAFE_FIELD_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const SAFE_ROLE_PATTERN = /^[a-z0-9._:-]+$/;
const SAFE_CAPABILITY_PATTERN = /^[A-Z0-9_:-]+$/;
const SAFE_CSRF_PATTERN = /^[A-Za-z0-9._-]+$/;
const SAFE_NONCE_PATTERN = /^[A-Za-z0-9_-]+$/;
const SAFE_AUDIENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;
const SAFE_DOMAIN_PATTERN = /^(?:localhost|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))+)(?::\d{1,5})?$/;
const JSON_SCALAR_PATTERN = /^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/;
const FORBIDDEN_RESPONSE_FIELD_PATTERN =
  /(?:cahash|cookie|credential|digest|nonce|privatekey|proof|providerpayload|publickey|secret|signature|signer)/i;
const FORBIDDEN_JSON_PROPERTY_NAMES = new Set(["__proto__", "constructor", "prototype"]);
const WALLET_SOURCES = new Set<unknown>([
  "NIGHTELF",
  "OTHER",
  "PORTKEY_AA",
  "PORTKEY_EOA_APP",
  "PORTKEY_EOA_EXTENSION",
]);

const CHALLENGE_INPUT_FIELDS = new Set(["adapterId", "caHash", "chainId", "network", "walletAddress"]);
const CHALLENGE_INPUT_REQUIRED_FIELDS = ["adapterId", "chainId", "network", "walletAddress"] as const;
const SESSION_INPUT_FIELDS = new Set([
  "adapterProof",
  "challengeId",
  "message",
  "nonce",
  "publicKey",
  "signature",
]);
const SESSION_INPUT_REQUIRED_FIELDS = ["challengeId", "message", "signature"] as const;
const CONTEXT_FIELDS = new Set(["signal", "traceId"]);
const SUCCESS_ENVELOPE_FIELDS = new Set(["data", "ok", "traceId"]);
const CHALLENGE_FIELDS = new Set([
  "adapterId",
  "challengeId",
  "chainId",
  "expiresAt",
  "message",
  "network",
  "version",
  "walletAddress",
]);
const SESSION_DATA_FIELDS = new Set(["csrfToken", "session"]);
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
const LOGOUT_FIELDS = new Set(["revoked"]);
const FAILURE_ENVELOPE_FIELDS = new Set(["error", "ok", "traceId"]);
const ERROR_FIELDS = new Set(["code", "details", "message"]);
const ERROR_REQUIRED_FIELDS = ["code", "message"] as const;
const ERROR_DETAIL_FIELDS = new Set(["diagnosticCode", "field", "retryable"]);
const CONFIG_FIELDS = new Set(["baseUrl", "maxResponseBytes", "mode", "timeoutMs", "tracePrefix"]);
const FACTORY_OPTION_FIELDS = new Set(["config", "fetchImpl", "traceIdGenerator"]);

const utf8ByteLength = (value: string): number =>
  new TextEncoder().encode(value).byteLength;

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const ownDataEntries = (
  value: unknown,
): readonly (readonly [string, unknown])[] | undefined => {
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
};

const ownDataValue = (value: Record<string, unknown>, field: string): unknown =>
  Object.getOwnPropertyDescriptor(value, field)?.value;

const hasExactFields = (
  value: unknown,
  allowed: ReadonlySet<string>,
  required: readonly string[] = [...allowed],
): value is Record<string, unknown> => {
  const entries = ownDataEntries(value);
  return entries !== undefined
    && entries.every(([key]) => allowed.has(key))
    && required.every((field) => entries.some(([key]) => key === field));
};

const safeIdentifier = (value: unknown, maximum: number): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= maximum
  && SAFE_IDENTIFIER_PATTERN.test(value);

const safeTraceId = (value: unknown): value is string =>
  typeof value === "string"
  && utf8ByteLength(value) <= 128
  && SAFE_TRACE_PATTERN.test(value)
  && !UNSAFE_TRACE_PATTERN.test(value);

const safeCode = (value: unknown): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= 80
  && SAFE_CODE_PATTERN.test(value);

const safeField = (value: unknown): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= 80
  && SAFE_FIELD_PATTERN.test(value);

const canonicalInstant = (value: unknown): value is string =>
  typeof value === "string"
  && value.length <= 32
  && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString() === value;

const safeMessage = (value: unknown): value is string =>
  typeof value === "string"
  && utf8ByteLength(value) >= 1
  && utf8ByteLength(value) <= MAX_MESSAGE_BYTES
  && !/[\u0000-\u0009\u000b-\u001f\u007f]/.test(value);

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
    ? value
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48)
    : "";
  return normalized && !UNSAFE_TRACE_PATTERN.test(normalized)
    ? normalized
    : DEFAULT_TRACE_PREFIX;
};

const isLoopbackHost = (hostname: string): boolean =>
  hostname === "127.0.0.1"
  || hostname === "localhost"
  || hostname === "[::1]";

const normalizeBaseUrl = (
  rawValue: string | undefined,
  mode: LiveWalletAuthenticationMode,
): Readonly<{ baseUrl?: string; code?: "BRIDGE_BASE_URL_INVALID" | "BRIDGE_BASE_URL_MISSING" }> => {
  if (!rawValue?.trim()) {
    return Object.freeze({ code: "BRIDGE_BASE_URL_MISSING" as const });
  }
  let parsed: URL;
  try {
    parsed = new URL(rawValue.trim());
  } catch {
    return Object.freeze({ code: "BRIDGE_BASE_URL_INVALID" as const });
  }
  const localTransportAllowed = mode === "live_local_stage"
    && parsed.protocol === "http:"
    && isLoopbackHost(parsed.hostname);
  if (
    parsed.username
    || parsed.password
    || parsed.search
    || parsed.hash
    || (parsed.pathname !== "/" && parsed.pathname !== "")
    || (parsed.protocol !== "https:" && !localTransportAllowed)
    || (mode === "live_production" && parsed.protocol !== "https:")
  ) {
    return Object.freeze({ code: "BRIDGE_BASE_URL_INVALID" as const });
  }
  return Object.freeze({ baseUrl: parsed.origin });
};

const normalizeConfig = (
  config: LiveWalletAuthenticationApiConfig | undefined,
): NormalizedConfig => {
  const mode = config?.mode ?? "preview";
  const supportedMode: LiveWalletAuthenticationMode =
    mode === "preview"
    || mode === "live_disabled"
    || mode === "live_local_stage"
    || mode === "live_production"
      ? mode
      : "live_disabled";
  const base = normalizeBaseUrl(config?.baseUrl, supportedMode);
  return Object.freeze({
    ...(base.baseUrl ? { baseUrl: base.baseUrl } : {}),
    ...(base.code ? { configCode: base.code } : {}),
    maxResponseBytes: clampNumber(
      config?.maxResponseBytes,
      DEFAULT_MAX_RESPONSE_BYTES,
      MIN_MAX_RESPONSE_BYTES,
      MAX_MAX_RESPONSE_BYTES,
    ),
    mode: supportedMode,
    timeoutMs: clampNumber(
      config?.timeoutMs,
      DEFAULT_TIMEOUT_MS,
      MIN_TIMEOUT_MS,
      MAX_TIMEOUT_MS,
    ),
    tracePrefix: normalizeTracePrefix(config?.tracePrefix),
  });
};

const captureContext = (
  context: LiveWalletAuthenticationRequestContext | undefined,
): CapturedContext => {
  if (context === undefined) {
    return Object.freeze({ status: "accepted" as const });
  }
  const entries = ownDataEntries(context);
  if (!entries || entries.some(([key]) => !CONTEXT_FIELDS.has(key))) {
    return Object.freeze({ status: "invalid" as const });
  }
  const traceId = entries.find(([key]) => key === "traceId")?.[1];
  const signal = entries.find(([key]) => key === "signal")?.[1];
  if (
    (traceId !== undefined && !safeTraceId(traceId))
    || (signal !== undefined && !isAbortSignal(signal))
  ) {
    return Object.freeze({ status: "invalid" as const });
  }
  return Object.freeze({
    ...(signal === undefined ? {} : { signal }),
    status: "accepted" as const,
    ...(traceId === undefined ? {} : { traceId }),
  });
};

const isAbortSignal = (value: unknown): value is AbortSignal => {
  if (value === null || typeof value !== "object") {
    return false;
  }
  try {
    const candidate = value as AbortSignal;
    return typeof candidate.aborted === "boolean"
      && typeof candidate.addEventListener === "function"
      && typeof candidate.removeEventListener === "function";
  } catch {
    return false;
  }
};

const makeFailure = ({
  category,
  code,
  details,
  httpStatus,
  reconnectRequired = false,
  retryable = false,
  traceId,
}: Readonly<{
  category: LiveWalletAuthenticationFailureCategory;
  code: LiveWalletAuthenticationErrorCode;
  details?: LiveWalletAuthenticationSafeErrorDetails;
  httpStatus?: number;
  reconnectRequired?: boolean;
  retryable?: boolean;
  traceId: string;
}>): LiveWalletAuthenticationFailure => Object.freeze({
  category,
  code,
  ...(details ? { details } : {}),
  ...(httpStatus === undefined ? {} : { httpStatus }),
  ok: false as const,
  reconnectRequired,
  retryable,
  traceId,
});

const invalidInput = (traceId: string): LiveWalletAuthenticationFailure =>
  makeFailure({
    category: "invalid_request",
    code: "BRIDGE_INVALID_INPUT",
    traceId,
  });

const invalidResponse = (
  traceId: string,
  httpStatus: number | undefined,
  code: "BRIDGE_RESPONSE_FORBIDDEN_AUTH_FIELD" | "BRIDGE_RESPONSE_INVALID" | "BRIDGE_RESPONSE_NON_JSON" | "BRIDGE_RESPONSE_OVERSIZE" = "BRIDGE_RESPONSE_INVALID",
): LiveWalletAuthenticationFailure => makeFailure({
  category: "invalid_response",
  code,
  ...(httpStatus === undefined ? {} : { httpStatus }),
  traceId,
});

const bytesToHex = (value: Uint8Array): string =>
  [...value].map((byte) => byte.toString(16).padStart(2, "0")).join("");

const cloneJsonValue = (
  value: unknown,
  budget: JsonCloneBudget,
  seen: WeakSet<object>,
  depth: number,
): unknown => {
  if (depth > ADAPTER_PROOF_MAX_DEPTH) {
    throw new TypeError("adapter proof depth");
  }
  if (value === null || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("adapter proof number");
    }
    return value;
  }
  if (typeof value === "string") {
    budget.bytes += utf8ByteLength(value);
    if (budget.bytes > ADAPTER_PROOF_MAX_BYTES) {
      throw new TypeError("adapter proof bytes");
    }
    return value;
  }
  if (typeof value !== "object" || value === null || seen.has(value)) {
    throw new TypeError("adapter proof value");
  }
  seen.add(value);
  if (Array.isArray(value)) {
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => {
      if (key === "length") {
        return false;
      }
      return typeof key !== "string"
        || !/^(?:0|[1-9]\d*)$/.test(key)
        || Number(key) >= value.length;
    })) {
      throw new TypeError("adapter proof array");
    }
    budget.entries += value.length;
    if (budget.entries > ADAPTER_PROOF_MAX_ENTRIES) {
      throw new TypeError("adapter proof entries");
    }
    const result: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor?.enumerable || !("value" in descriptor)) {
        throw new TypeError("adapter proof array entry");
      }
      result.push(cloneJsonValue(descriptor.value, budget, seen, depth + 1));
    }
    seen.delete(value);
    return Object.freeze(result);
  }
  const entries = ownDataEntries(value);
  if (!entries) {
    throw new TypeError("adapter proof object");
  }
  budget.entries += entries.length;
  if (budget.entries > ADAPTER_PROOF_MAX_ENTRIES) {
    throw new TypeError("adapter proof entries");
  }
  const output: Record<string, unknown> = {};
  for (const [key, nested] of entries) {
    if (
      FORBIDDEN_JSON_PROPERTY_NAMES.has(key)
      || key.length === 0
      || key.length > 128
      || !SAFE_IDENTIFIER_PATTERN.test(key)
    ) {
      throw new TypeError("adapter proof key");
    }
    budget.bytes += utf8ByteLength(key);
    output[key] = cloneJsonValue(nested, budget, seen, depth + 1);
  }
  seen.delete(value);
  return Object.freeze(output);
};

const cloneAdapterProof = (
  value: unknown,
): Readonly<Record<string, unknown>> | undefined => {
  if (!isPlainRecord(value)) {
    return undefined;
  }
  try {
    const cloned = cloneJsonValue(
      value,
      { bytes: 0, entries: 0 },
      new WeakSet<object>(),
      0,
    );
    const serialized = JSON.stringify(cloned);
    return isPlainRecord(cloned)
      && utf8ByteLength(serialized) <= ADAPTER_PROOF_MAX_BYTES
      ? Object.freeze(cloned)
      : undefined;
  } catch {
    return undefined;
  }
};

const captureChallengeBody = (
  input: LiveWalletAuthenticationChallengeInput,
): Readonly<Record<string, unknown>> | undefined => {
  if (!hasExactFields(input, CHALLENGE_INPUT_FIELDS, CHALLENGE_INPUT_REQUIRED_FIELDS)) {
    return undefined;
  }
  const adapterId = ownDataValue(input, "adapterId");
  const caHash = ownDataValue(input, "caHash");
  const chainId = ownDataValue(input, "chainId");
  const network = ownDataValue(input, "network");
  const address = ownDataValue(input, "walletAddress");
  if (
    !safeIdentifier(adapterId, 80)
    || !isCanonicalLiveWalletChainId(chainId)
    || !isCanonicalLiveWalletNetwork(network)
    || !safeIdentifier(address, 160)
    || (caHash !== undefined && !safeIdentifier(caHash, 128))
  ) {
    return undefined;
  }
  return Object.freeze({
    adapterId,
    ...(caHash === undefined ? {} : { caHash }),
    chainId,
    network,
    walletAddress: address,
  });
};

const canonicalMessageValue = (line: string, prefix: string): string | undefined =>
  line.startsWith(prefix) && line.length > prefix.length
    ? line.slice(prefix.length)
    : undefined;

const parseCanonicalChallengeMessage = (
  value: unknown,
): ParsedCanonicalChallengeMessage | undefined => {
  if (!safeMessage(value) || value.includes("\r")) {
    return undefined;
  }
  const lines = value.split("\n");
  if (
    lines.length !== 14
    || lines[0] !== "aelf Campaign OS Wallet Authentication"
  ) {
    return undefined;
  }
  const version = canonicalMessageValue(lines[1] ?? "", "Version: ");
  const domain = canonicalMessageValue(lines[2] ?? "", "Domain: ");
  const uri = canonicalMessageValue(lines[3] ?? "", "URI: ");
  const audience = canonicalMessageValue(lines[4] ?? "", "Audience: ");
  const address = canonicalMessageValue(lines[5] ?? "", "Wallet Address: ");
  const adapterId = canonicalMessageValue(lines[6] ?? "", "Adapter: ");
  const chainId = canonicalMessageValue(lines[7] ?? "", "Chain ID: ");
  const network = canonicalMessageValue(lines[8] ?? "", "Network: ");
  const caHash = canonicalMessageValue(lines[9] ?? "", "CA Hash: ");
  const nonce = canonicalMessageValue(lines[10] ?? "", "Nonce: ");
  const issuedAt = canonicalMessageValue(lines[11] ?? "", "Issued At: ");
  const expiresAt = canonicalMessageValue(lines[12] ?? "", "Expires At: ");
  const requestId = canonicalMessageValue(lines[13] ?? "", "Request ID: ");
  if (
    version !== "campaign-os-wallet-auth/v1"
    || typeof domain !== "string"
    || domain.length > 253
    || !SAFE_DOMAIN_PATTERN.test(domain)
    || typeof uri !== "string"
    || uri.length > 2_048
    || typeof audience !== "string"
    || audience.length > 160
    || !SAFE_AUDIENCE_PATTERN.test(audience)
    || !safeIdentifier(address, 160)
    || !safeIdentifier(adapterId, 80)
    || !isCanonicalLiveWalletChainId(chainId)
    || !isCanonicalLiveWalletNetwork(network)
    || (caHash !== "-" && !safeIdentifier(caHash, 128))
    || typeof nonce !== "string"
    || nonce.length !== 43
    || !SAFE_NONCE_PATTERN.test(nonce)
    || !canonicalInstant(issuedAt)
    || !canonicalInstant(expiresAt)
    || Date.parse(issuedAt) >= Date.parse(expiresAt)
    || !safeIdentifier(requestId, 160)
  ) {
    return undefined;
  }
  let parsedUri: URL;
  try {
    parsedUri = new URL(uri);
  } catch {
    return undefined;
  }
  if (
    parsedUri.href !== uri
    || parsedUri.host !== domain
    || parsedUri.username !== ""
    || parsedUri.password !== ""
    || parsedUri.hash !== ""
    || (parsedUri.protocol !== "https:"
      && !(parsedUri.protocol === "http:" && isLoopbackHost(parsedUri.hostname)))
  ) {
    return undefined;
  }
  return Object.freeze({
    adapterId,
    caHash,
    chainId,
    domain,
    expiresAt,
    issuedAt,
    network,
    nonce,
    requestId,
    uri,
    version,
    walletAddress: address,
  });
};

export const extractCanonicalWalletAuthenticationNonce = (
  exactMessage: unknown,
): CanonicalWalletAuthenticationNonceResult => {
  const parsed = parseCanonicalChallengeMessage(exactMessage);
  return parsed
    ? Object.freeze({ nonce: parsed.nonce, ok: true as const })
    : Object.freeze({
        code: "BRIDGE_CHALLENGE_MESSAGE_INVALID" as const,
        ok: false as const,
      });
};

const captureSessionBody = (
  input: LiveWalletAuthenticationSessionProofInput,
): Readonly<Record<string, unknown>> | undefined => {
  if (!hasExactFields(input, SESSION_INPUT_FIELDS, SESSION_INPUT_REQUIRED_FIELDS)) {
    return undefined;
  }
  const adapterProofValue = ownDataValue(input, "adapterProof");
  const challengeId = ownDataValue(input, "challengeId");
  const message = ownDataValue(input, "message");
  const nonce = ownDataValue(input, "nonce");
  const publicKey = ownDataValue(input, "publicKey");
  const signature = ownDataValue(input, "signature");
  const canonicalMessage = parseCanonicalChallengeMessage(message);
  const adapterProof = adapterProofValue === undefined
    ? undefined
    : cloneAdapterProof(adapterProofValue);
  if (
    !safeIdentifier(challengeId, 160)
    || !canonicalMessage
    || (nonce !== undefined && nonce !== canonicalMessage.nonce)
    || !(signature instanceof Uint8Array)
    || signature.byteLength < 1
    || signature.byteLength > MAX_SIGNATURE_BYTES
    || (publicKey !== undefined && (!(publicKey instanceof Uint8Array)
      || publicKey.byteLength < 1
      || publicKey.byteLength > MAX_PUBLIC_KEY_BYTES))
    || (adapterProofValue !== undefined && adapterProof === undefined)
  ) {
    return undefined;
  }
  try {
    return Object.freeze({
      ...(adapterProof === undefined ? {} : { adapterProof }),
      challengeId,
      message,
      nonce: canonicalMessage.nonce,
      ...(publicKey === undefined ? {} : { publicKey: bytesToHex(publicKey) }),
      signature: bytesToHex(signature),
    });
  } catch {
    return undefined;
  }
};

const skipJsonWhitespace = (cursor: JsonCursor): void => {
  while (/\s/u.test(cursor.source[cursor.index] ?? "")) {
    cursor.index += 1;
  }
};

const consumeJsonString = (cursor: JsonCursor): string | undefined => {
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

const consumeUniqueJsonValue = (cursor: JsonCursor, depth: number): boolean => {
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
      if (!consumeUniqueJsonValue(cursor, depth + 1)) {
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
      if (!consumeUniqueJsonValue(cursor, depth + 1)) {
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

const parseUniqueJsonObject = (source: string): Record<string, unknown> | undefined => {
  const cursor: JsonCursor = { index: 0, source };
  if (!consumeUniqueJsonValue(cursor, 0)) {
    return undefined;
  }
  skipJsonWhitespace(cursor);
  if (cursor.index !== source.length) {
    return undefined;
  }
  try {
    const value: unknown = JSON.parse(source);
    return isPlainRecord(value) ? value : undefined;
  } catch {
    return undefined;
  }
};

const containsForbiddenResponseField = (
  value: unknown,
  depth = 0,
): boolean => {
  if (depth > JSON_VALUE_MAX_DEPTH || value === null || typeof value !== "object") {
    return depth > JSON_VALUE_MAX_DEPTH;
  }
  if (Array.isArray(value)) {
    return value.some((entry) => containsForbiddenResponseField(entry, depth + 1));
  }
  const entries = ownDataEntries(value);
  if (!entries) {
    return true;
  }
  return entries.some(([key, nested]) =>
    FORBIDDEN_RESPONSE_FIELD_PATTERN.test(key.replace(/[^A-Za-z0-9]/g, ""))
    || containsForbiddenResponseField(nested, depth + 1));
};

const parseStringList = (
  value: unknown,
  maximumItems: number,
  maximumBytes: number,
  pattern: RegExp,
): readonly string[] | undefined => {
  if (!Array.isArray(value) || value.length === 0 || value.length > maximumItems) {
    return undefined;
  }
  const output: string[] = [];
  for (const item of value) {
    if (
      typeof item !== "string"
      || utf8ByteLength(item) > maximumBytes
      || !pattern.test(item)
      || output.includes(item)
    ) {
      return undefined;
    }
    output.push(item);
  }
  return Object.freeze(output);
};

const parseChallengeEnvelope = (
  body: Record<string, unknown>,
): Readonly<{ challenge: LiveWalletAuthenticationChallenge; traceId: string }> | undefined => {
  if (!hasExactFields(body, SUCCESS_ENVELOPE_FIELDS) || ownDataValue(body, "ok") !== true) {
    return undefined;
  }
  const traceId = ownDataValue(body, "traceId");
  const data = ownDataValue(body, "data");
  if (!safeTraceId(traceId) || !hasExactFields(data, CHALLENGE_FIELDS)) {
    return undefined;
  }
  const adapterId = ownDataValue(data, "adapterId");
  const challengeId = ownDataValue(data, "challengeId");
  const chainId = ownDataValue(data, "chainId");
  const expiresAt = ownDataValue(data, "expiresAt");
  const message = ownDataValue(data, "message");
  const network = ownDataValue(data, "network");
  const version = ownDataValue(data, "version");
  const address = ownDataValue(data, "walletAddress");
  const canonicalMessage = parseCanonicalChallengeMessage(message);
  if (
    !safeIdentifier(adapterId, 80)
    || !safeIdentifier(challengeId, 160)
    || !isCanonicalLiveWalletChainId(chainId)
    || !canonicalInstant(expiresAt)
    || !safeMessage(message)
    || !isCanonicalLiveWalletNetwork(network)
    || version !== "campaign-os-wallet-auth/v1"
    || !safeIdentifier(address, 160)
    || !canonicalMessage
    || canonicalMessage.adapterId !== adapterId
    || canonicalMessage.chainId !== chainId
    || canonicalMessage.expiresAt !== expiresAt
    || canonicalMessage.network !== network
    || canonicalMessage.version !== version
    || canonicalMessage.walletAddress !== address
  ) {
    return undefined;
  }
  return Object.freeze({
    challenge: Object.freeze({
      adapterId,
      challengeId,
      chainId,
      expiresAt,
      message,
      network,
      version,
      walletAddress: address,
    }),
    traceId,
  });
};

const parseSession = (value: unknown): LiveWalletAuthenticationSession | undefined => {
  if (!hasExactFields(value, SESSION_FIELDS)) {
    return undefined;
  }
  const absoluteExpiresAt = ownDataValue(value, "absoluteExpiresAt");
  const accountType = ownDataValue(value, "accountType");
  const capabilities = parseStringList(
    ownDataValue(value, "capabilities"),
    32,
    80,
    SAFE_CAPABILITY_PATTERN,
  );
  const chainId = ownDataValue(value, "chainId");
  const idleExpiresAt = ownDataValue(value, "idleExpiresAt");
  const issuedAt = ownDataValue(value, "issuedAt");
  const network = ownDataValue(value, "network");
  const roles = parseStringList(ownDataValue(value, "roles"), 8, 64, SAFE_ROLE_PATTERN);
  const sessionId = ownDataValue(value, "sessionId");
  const status = ownDataValue(value, "status");
  const address = ownDataValue(value, "walletAddress");
  const walletSource = ownDataValue(value, "walletSource");
  if (
    !canonicalInstant(absoluteExpiresAt)
    || !isCanonicalLiveWalletAccountType(accountType)
    || !capabilities
    || !isCanonicalLiveWalletChainId(chainId)
    || !canonicalInstant(idleExpiresAt)
    || !canonicalInstant(issuedAt)
    || !isCanonicalLiveWalletNetwork(network)
    || !roles
    || !safeIdentifier(sessionId, 160)
    || status !== "active"
    || !safeIdentifier(address, 160)
    || !WALLET_SOURCES.has(walletSource)
    || Date.parse(issuedAt) > Date.parse(idleExpiresAt)
    || Date.parse(idleExpiresAt) > Date.parse(absoluteExpiresAt)
  ) {
    return undefined;
  }
  return Object.freeze({
    absoluteExpiresAt,
    accountType,
    capabilities,
    chainId,
    idleExpiresAt,
    issuedAt,
    network,
    roles,
    sessionId,
    status,
    walletAddress: address,
    walletSource: walletSource as LiveWalletAuthenticationWalletSource,
  });
};

const parseSessionEnvelope = (body: Record<string, unknown>): ParsedSessionEnvelope | undefined => {
  if (!hasExactFields(body, SUCCESS_ENVELOPE_FIELDS) || ownDataValue(body, "ok") !== true) {
    return undefined;
  }
  const traceId = ownDataValue(body, "traceId");
  const data = ownDataValue(body, "data");
  if (!safeTraceId(traceId) || !hasExactFields(data, SESSION_DATA_FIELDS)) {
    return undefined;
  }
  const csrfToken = ownDataValue(data, "csrfToken");
  const parsedSession = parseSession(ownDataValue(data, "session"));
  if (
    typeof csrfToken !== "string"
    || csrfToken.length < 32
    || csrfToken.length > 512
    || !SAFE_CSRF_PATTERN.test(csrfToken)
    || !parsedSession
  ) {
    return undefined;
  }
  return Object.freeze({ csrfToken, session: parsedSession, traceId });
};

const parseLogoutEnvelope = (
  body: Record<string, unknown>,
): Readonly<{ revoked: boolean; traceId: string }> | undefined => {
  if (!hasExactFields(body, SUCCESS_ENVELOPE_FIELDS) || ownDataValue(body, "ok") !== true) {
    return undefined;
  }
  const traceId = ownDataValue(body, "traceId");
  const data = ownDataValue(body, "data");
  if (!safeTraceId(traceId) || !hasExactFields(data, LOGOUT_FIELDS)) {
    return undefined;
  }
  const revoked = ownDataValue(data, "revoked");
  return typeof revoked === "boolean"
    ? Object.freeze({ revoked, traceId })
    : undefined;
};

const parseErrorEnvelope = (body: Record<string, unknown>): ParsedErrorEnvelope | undefined => {
  if (!hasExactFields(body, FAILURE_ENVELOPE_FIELDS) || ownDataValue(body, "ok") !== false) {
    return undefined;
  }
  const traceId = ownDataValue(body, "traceId");
  const error = ownDataValue(body, "error");
  if (!safeTraceId(traceId) || !hasExactFields(error, ERROR_FIELDS, ERROR_REQUIRED_FIELDS)) {
    return undefined;
  }
  const code = ownDataValue(error, "code");
  const message = ownDataValue(error, "message");
  const detailsValue = ownDataValue(error, "details");
  if (
    !safeCode(code)
    || typeof message !== "string"
    || message.length < 1
    || message.length > 256
    || /[\u0000-\u001f\u007f]/.test(message)
    || (detailsValue !== undefined && !hasExactFields(detailsValue, ERROR_DETAIL_FIELDS, []))
  ) {
    return undefined;
  }
  let details: LiveWalletAuthenticationSafeErrorDetails | undefined;
  if (detailsValue !== undefined) {
    const diagnosticCode = ownDataValue(detailsValue, "diagnosticCode");
    const field = ownDataValue(detailsValue, "field");
    const retryable = ownDataValue(detailsValue, "retryable");
    if (
      (diagnosticCode !== undefined && !safeCode(diagnosticCode))
      || (field !== undefined && !safeField(field))
      || (retryable !== undefined && typeof retryable !== "boolean")
    ) {
      return undefined;
    }
    details = Object.freeze({
      ...(diagnosticCode === undefined ? {} : { diagnosticCode }),
      ...(field === undefined ? {} : { field }),
      ...(retryable === undefined ? {} : { retryable }),
    });
  }
  return Object.freeze({
    code,
    ...(details ? { details } : {}),
    traceId,
  });
};

const categoryForStatus = (status: number): LiveWalletAuthenticationFailureCategory => {
  if (status === 401) {
    return "unauthorized";
  }
  if (status === 403) {
    return "forbidden";
  }
  if (status === 409) {
    return "conflict";
  }
  if (status === 429) {
    return "rate_limited";
  }
  if (status === 503 || status >= 500) {
    return "unavailable";
  }
  return "invalid_request";
};

const failureForHttpStatus = (
  status: number,
  envelope: ParsedErrorEnvelope,
): LiveWalletAuthenticationFailure => {
  const category = categoryForStatus(status);
  return makeFailure({
    category,
    code: envelope.code,
    ...(envelope.details ? { details: envelope.details } : {}),
    httpStatus: status,
    reconnectRequired: status === 401 || status === 403,
    retryable: category === "conflict"
      || category === "rate_limited"
      || category === "unavailable"
      || envelope.details?.retryable === true,
    traceId: envelope.traceId,
  });
};

class ManagedAbortError extends Error {}

const raceWithAbort = <T>(promise: PromiseLike<T>, signal: AbortSignal): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    let settled = false;
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    const onAbort = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(new ManagedAbortError());
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    Promise.resolve(promise).then(
      (value) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        resolve(value);
      },
      (error: unknown) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(error);
      },
    );
  });

const safeResponseTraceHeader = (response: Response): string | undefined => {
  try {
    const value = response.headers.get(TRACE_HEADER_NAME);
    return safeTraceId(value) ? value : undefined;
  } catch {
    return undefined;
  }
};

const responseLike = (value: unknown): value is Response => {
  if (value === null || typeof value !== "object") {
    return false;
  }
  try {
    const response = value as Response;
    return Number.isInteger(response.status)
      && response.status >= 100
      && response.status <= 599
      && typeof response.ok === "boolean"
      && typeof response.text === "function"
      && response.headers !== null
      && typeof response.headers.get === "function";
  } catch {
    return false;
  }
};

const isJsonResponseContentType = (value: string | null): boolean => {
  if (!value) {
    return false;
  }
  const [mediaType, ...parameters] = value
    .split(";")
    .map((part) => part.trim().toLowerCase());
  return mediaType === "application/json"
    && (parameters.length === 0
      || (parameters.length === 1 && parameters[0] === "charset=utf-8"));
};

export const createLiveWalletAuthenticationApiBridge = (
  options: LiveWalletAuthenticationApiBridgeFactoryOptions = {},
): LiveWalletAuthenticationApiBridge => {
  const optionEntries = ownDataEntries(options);
  const factoryInvalid = !optionEntries
    || optionEntries.some(([key]) => !FACTORY_OPTION_FIELDS.has(key));
  const configInput = optionEntries?.find(([key]) => key === "config")?.[1];
  const fetchInput = optionEntries?.find(([key]) => key === "fetchImpl")?.[1];
  const traceIdGeneratorInput = optionEntries
    ?.find(([key]) => key === "traceIdGenerator")?.[1];
  const configEntries = configInput === undefined ? [] : ownDataEntries(configInput);
  const configShapeInvalid = configEntries === undefined
    || configEntries.some(([key]) => !CONFIG_FIELDS.has(key));
  const rawConfig = configShapeInvalid ? undefined : Object.fromEntries(configEntries);
  const configValueInvalid = rawConfig !== undefined && (
    (rawConfig.baseUrl !== undefined && typeof rawConfig.baseUrl !== "string")
    || (rawConfig.maxResponseBytes !== undefined
      && (typeof rawConfig.maxResponseBytes !== "number"
        || !Number.isFinite(rawConfig.maxResponseBytes)))
    || (rawConfig.mode !== undefined
      && rawConfig.mode !== "live_disabled"
      && rawConfig.mode !== "live_local_stage"
      && rawConfig.mode !== "live_production"
      && rawConfig.mode !== "preview")
    || (rawConfig.timeoutMs !== undefined
      && (typeof rawConfig.timeoutMs !== "number" || !Number.isFinite(rawConfig.timeoutMs)))
    || (rawConfig.tracePrefix !== undefined && typeof rawConfig.tracePrefix !== "string")
  );
  const configInvalid = configShapeInvalid || configValueInvalid;
  const capturedConfig = configInvalid
    ? undefined
    : Object.freeze(rawConfig) as LiveWalletAuthenticationApiConfig;
  const dependenciesInvalid = factoryInvalid
    || configInvalid
    || (fetchInput !== undefined && typeof fetchInput !== "function")
    || (traceIdGeneratorInput !== undefined && typeof traceIdGeneratorInput !== "function");
  const config = normalizeConfig(capturedConfig);
  const fetchImpl = typeof fetchInput === "function"
    ? fetchInput as LiveWalletAuthenticationApiFetch
    : ((input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init));
  const traceIdGenerator = typeof traceIdGeneratorInput === "function"
    ? traceIdGeneratorInput as (operation: LiveWalletAuthenticationOperation) => string
    : undefined;
  const activeControllers = new Set<AbortController>();
  let closed = false;
  let csrfMemory: string | undefined;
  let sessionEpoch = 0;
  let sessionRequestSequence = 0;
  let generatedTraceSequence = 0;

  const nextTraceId = (
    operation: LiveWalletAuthenticationOperation,
    candidate: string | undefined,
  ): string => {
    if (safeTraceId(candidate)) {
      return candidate;
    }
    try {
      const generated = traceIdGenerator?.(operation);
      if (safeTraceId(generated)) {
        return generated;
      }
    } catch {
      // A local safe trace is used below.
    }
    generatedTraceSequence += 1;
    return `${config.tracePrefix}-${operation}-${generatedTraceSequence}`;
  };

  const clearLocalSession = (): void => {
    csrfMemory = undefined;
    sessionEpoch += 1;
    sessionRequestSequence += 1;
  };

  const prepareInvocation = (
    operation: LiveWalletAuthenticationOperation,
    context: LiveWalletAuthenticationRequestContext | undefined,
  ): PreparedInvocation => {
    let captured: CapturedContext;
    try {
      captured = captureContext(context);
    } catch {
      captured = Object.freeze({ status: "invalid" as const });
    }
    const traceId = nextTraceId(operation, captured.traceId);
    if (closed) {
      return Object.freeze({
        failure: makeFailure({ category: "closed", code: "BRIDGE_CLOSED", traceId }),
        traceId,
      });
    }
    if (dependenciesInvalid) {
      return Object.freeze({
        failure: makeFailure({
          category: "configuration",
          code: "BRIDGE_INVALID_INPUT",
          traceId,
        }),
        traceId,
      });
    }
    if (config.mode === "preview") {
      return Object.freeze({
        failure: makeFailure({
          category: "preview_blocked",
          code: "BRIDGE_PREVIEW_INVOCATION_BLOCKED",
          traceId,
        }),
        traceId,
      });
    }
    if (config.mode === "live_disabled") {
      return Object.freeze({
        failure: makeFailure({
          category: "configuration",
          code: "BRIDGE_LIVE_DISABLED",
          traceId,
        }),
        traceId,
      });
    }
    if (config.configCode || !config.baseUrl) {
      return Object.freeze({
        failure: makeFailure({
          category: "configuration",
          code: config.configCode ?? "BRIDGE_BASE_URL_MISSING",
          traceId,
        }),
        traceId,
      });
    }
    if (captured.status !== "accepted") {
      return Object.freeze({ failure: invalidInput(traceId), traceId });
    }
    if (captured.signal?.aborted) {
      return Object.freeze({
        failure: makeFailure({
          category: "aborted",
          code: "BRIDGE_REQUEST_ABORTED",
          traceId,
        }),
        traceId,
      });
    }
    return Object.freeze({
      ...(captured.signal === undefined ? {} : { signal: captured.signal }),
      traceId,
    });
  };

  const executeWireRequest = async ({
    body,
    csrf,
    method,
    operation,
    path,
    prepared,
  }: Readonly<{
    body?: Readonly<Record<string, unknown>>;
    csrf?: string;
    method: "GET" | "POST";
    operation: LiveWalletAuthenticationOperation;
    path: string;
    prepared: PreparedInvocation;
  }>): Promise<WireResult> => {
    if (prepared.failure) {
      return prepared.failure;
    }
    let serializedBody: string | undefined;
    try {
      serializedBody = body === undefined ? undefined : JSON.stringify(body);
    } catch {
      return invalidInput(prepared.traceId);
    }
    const headers: Record<string, string> = {
      accept: "application/json",
      ...(serializedBody === undefined ? {} : { "content-type": "application/json" }),
      ...(csrf === undefined ? {} : { [CSRF_HEADER_NAME]: csrf }),
      [TRACE_HEADER_NAME]: prepared.traceId,
    };
    const controller = new AbortController();
    activeControllers.add(controller);
    let externalAborted = false;
    let externalListenerRegistered = false;
    let timedOut = false;
    let transportStarted = false;
    const onExternalAbort = () => {
      externalAborted = true;
      controller.abort();
    };
    let timeout: ReturnType<typeof globalThis.setTimeout> | undefined;

    try {
      if (prepared.signal) {
        externalListenerRegistered = true;
        prepared.signal.addEventListener("abort", onExternalAbort, { once: true });
      }
      timeout = globalThis.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, config.timeoutMs);
      transportStarted = true;
      const response = await raceWithAbort(
        Promise.resolve(fetchImpl(`${config.baseUrl}${path}`, {
          ...(serializedBody === undefined ? {} : { body: serializedBody }),
          credentials: "include",
          headers: Object.freeze(headers),
          method,
          signal: controller.signal,
        })),
        controller.signal,
      );
      if (!responseLike(response)) {
        return invalidResponse(prepared.traceId, undefined);
      }
      const responseTraceHeader = safeResponseTraceHeader(response);
      if (!isJsonResponseContentType(response.headers.get("content-type"))) {
        return invalidResponse(responseTraceHeader ?? prepared.traceId, response.status);
      }
      const contentLength = response.headers.get("content-length");
      if (
        contentLength !== null
        && (!/^\d+$/.test(contentLength) || Number(contentLength) > config.maxResponseBytes)
      ) {
        return invalidResponse(
          responseTraceHeader ?? prepared.traceId,
          response.status,
          "BRIDGE_RESPONSE_OVERSIZE",
        );
      }
      const text = await raceWithAbort(Promise.resolve(response.text()), controller.signal);
      if (utf8ByteLength(text) > config.maxResponseBytes) {
        return invalidResponse(
          responseTraceHeader ?? prepared.traceId,
          response.status,
          "BRIDGE_RESPONSE_OVERSIZE",
        );
      }
      const parsed = parseUniqueJsonObject(text);
      if (!parsed) {
        return invalidResponse(
          responseTraceHeader ?? prepared.traceId,
          response.status,
          "BRIDGE_RESPONSE_NON_JSON",
        );
      }
      if (containsForbiddenResponseField(parsed)) {
        return invalidResponse(
          responseTraceHeader ?? prepared.traceId,
          response.status,
          "BRIDGE_RESPONSE_FORBIDDEN_AUTH_FIELD",
        );
      }
      if (!response.ok || response.status < 200 || response.status >= 300) {
        const errorEnvelope = parseErrorEnvelope(parsed);
        if (
          !errorEnvelope
          || (responseTraceHeader !== undefined && responseTraceHeader !== errorEnvelope.traceId)
        ) {
          return invalidResponse(responseTraceHeader ?? prepared.traceId, response.status);
        }
        return failureForHttpStatus(response.status, errorEnvelope);
      }
      return Object.freeze({
        body: parsed,
        httpStatus: response.status,
        ok: true as const,
        ...(responseTraceHeader === undefined ? {} : { responseTraceHeader }),
      });
    } catch {
      if (!transportStarted) {
        return invalidInput(prepared.traceId);
      }
      if (timedOut) {
        return makeFailure({
          category: "timeout",
          code: "BRIDGE_REQUEST_TIMEOUT",
          retryable: true,
          traceId: prepared.traceId,
        });
      }
      if (externalAborted) {
        return makeFailure({
          category: "aborted",
          code: "BRIDGE_REQUEST_ABORTED",
          traceId: prepared.traceId,
        });
      }
      if (closed) {
        return makeFailure({ category: "closed", code: "BRIDGE_CLOSED", traceId: prepared.traceId });
      }
      return makeFailure({
        category: "network",
        code: "BRIDGE_NETWORK_ERROR",
        retryable: true,
        traceId: prepared.traceId,
      });
    } finally {
      if (timeout !== undefined) {
        try {
          globalThis.clearTimeout(timeout);
        } catch {
          // Timer cleanup is best effort for a hostile host implementation.
        }
      }
      if (externalListenerRegistered) {
        try {
          prepared.signal?.removeEventListener("abort", onExternalAbort);
        } catch {
          // The owned controller and timer are still released below.
        }
      }
      activeControllers.delete(controller);
    }
  };

  const beginSessionRequest = (): SessionRequestFence => Object.freeze({
    epoch: sessionEpoch,
    sequence: ++sessionRequestSequence,
  });

  const isCurrentFence = (fence: SessionRequestFence): boolean =>
    !closed
    && fence.epoch === sessionEpoch
    && fence.sequence === sessionRequestSequence;

  const staleFailure = (traceId: string): LiveWalletAuthenticationFailure => makeFailure({
    category: "stale",
    code: "BRIDGE_STALE_SESSION_EPOCH",
    traceId,
  });

  const applySessionFailure = (
    failure: LiveWalletAuthenticationFailure,
    fence: SessionRequestFence,
  ): LiveWalletAuthenticationFailure => {
    if (
      isCurrentFence(fence)
      && (failure.category === "unauthorized" || failure.category === "forbidden")
    ) {
      clearLocalSession();
    }
    return failure;
  };

  const executeSessionOperation = async (
    operation: "getCurrentSession" | "issueSession" | "rotateSession",
    method: "GET" | "POST",
    path: string,
    body: Readonly<Record<string, unknown>> | undefined,
    csrf: string | undefined,
    prepared: PreparedInvocation,
    successStatus: "authenticated" | "restored" | "rotated",
    expectedHttpStatus: 200 | 201,
  ): Promise<LiveWalletAuthenticationSessionResult> => {
    if (prepared.failure) {
      return prepared.failure;
    }
    const fence = beginSessionRequest();
    const wire = await executeWireRequest({ body, csrf, method, operation, path, prepared });
    if (!wire.ok) {
      return applySessionFailure(wire, fence);
    }
    if (!isCurrentFence(fence)) {
      return staleFailure(prepared.traceId);
    }
    const parsed = parseSessionEnvelope(wire.body);
    if (
      wire.httpStatus !== expectedHttpStatus
      || !parsed
      || (wire.responseTraceHeader !== undefined && wire.responseTraceHeader !== parsed.traceId)
    ) {
      return invalidResponse(wire.responseTraceHeader ?? prepared.traceId, wire.httpStatus);
    }
    csrfMemory = parsed.csrfToken;
    return Object.freeze({
      httpStatus: wire.httpStatus,
      ok: true as const,
      session: parsed.session,
      status: successStatus,
      traceId: parsed.traceId,
    });
  };

  const bridge: LiveWalletAuthenticationApiBridge = {
    clearLocalSession,
    close: () => {
      if (closed) {
        return;
      }
      closed = true;
      clearLocalSession();
      for (const controller of activeControllers) {
        controller.abort();
      }
      activeControllers.clear();
    },
    getCurrentSession: async (context) => {
      const prepared = prepareInvocation("getCurrentSession", context);
      return executeSessionOperation(
        "getCurrentSession",
        "GET",
        "/api/wallet/auth/session",
        undefined,
        undefined,
        prepared,
        "restored",
        200,
      );
    },
    issueChallenge: async (input, context) => {
      const prepared = prepareInvocation("issueChallenge", context);
      if (prepared.failure) {
        return prepared.failure;
      }
      let body: Readonly<Record<string, unknown>> | undefined;
      try {
        body = captureChallengeBody(input);
      } catch {
        body = undefined;
      }
      if (!body) {
        return invalidInput(prepared.traceId);
      }
      const wire = await executeWireRequest({
        body,
        method: "POST",
        operation: "issueChallenge",
        path: "/api/wallet/auth/challenges",
        prepared,
      });
      if (!wire.ok) {
        return wire;
      }
      const parsed = parseChallengeEnvelope(wire.body);
      if (
        wire.httpStatus !== 201
        || !parsed
        || (wire.responseTraceHeader !== undefined && wire.responseTraceHeader !== parsed.traceId)
      ) {
        return invalidResponse(wire.responseTraceHeader ?? prepared.traceId, wire.httpStatus);
      }
      return Object.freeze({
        challenge: parsed.challenge,
        httpStatus: wire.httpStatus,
        ok: true as const,
        status: "challenge_issued" as const,
        traceId: parsed.traceId,
      });
    },
    issueSession: async (input, context) => {
      const prepared = prepareInvocation("issueSession", context);
      if (prepared.failure) {
        return prepared.failure;
      }
      let body: Readonly<Record<string, unknown>> | undefined;
      try {
        body = captureSessionBody(input);
      } catch {
        body = undefined;
      }
      if (!body) {
        return invalidInput(prepared.traceId);
      }
      return executeSessionOperation(
        "issueSession",
        "POST",
        "/api/wallet/auth/sessions",
        body,
        undefined,
        prepared,
        "authenticated",
        201,
      );
    },
    logout: async (context) => {
      const prepared = prepareInvocation("logout", context);
      const csrf = csrfMemory;
      clearLocalSession();
      const withCleanup = (
        result: LiveWalletAuthenticationFailure,
      ): LiveWalletAuthenticationFailure & Readonly<{ localSessionCleared: true }> => Object.freeze({
        ...result,
        localSessionCleared: true as const,
      });
      if (prepared.failure) {
        return withCleanup(prepared.failure);
      }
      if (!csrf) {
        return withCleanup(makeFailure({
          category: "unauthorized",
          code: "BRIDGE_CSRF_UNAVAILABLE",
          reconnectRequired: true,
          traceId: prepared.traceId,
        }));
      }
      const wire = await executeWireRequest({
        csrf,
        method: "POST",
        operation: "logout",
        path: "/api/wallet/auth/logout",
        prepared,
      });
      if (!wire.ok) {
        return withCleanup(wire);
      }
      const parsed = parseLogoutEnvelope(wire.body);
      if (
        wire.httpStatus !== 200
        || !parsed
        || (wire.responseTraceHeader !== undefined && wire.responseTraceHeader !== parsed.traceId)
      ) {
        return withCleanup(invalidResponse(
          wire.responseTraceHeader ?? prepared.traceId,
          wire.httpStatus,
        ));
      }
      return Object.freeze({
        httpStatus: wire.httpStatus,
        localSessionCleared: true as const,
        ok: true as const,
        revoked: parsed.revoked,
        status: "logged_out" as const,
        traceId: parsed.traceId,
      });
    },
    rotateSession: async (context) => {
      const prepared = prepareInvocation("rotateSession", context);
      if (prepared.failure) {
        return prepared.failure;
      }
      const csrf = csrfMemory;
      if (!csrf) {
        return makeFailure({
          category: "unauthorized",
          code: "BRIDGE_CSRF_UNAVAILABLE",
          reconnectRequired: true,
          traceId: prepared.traceId,
        });
      }
      return executeSessionOperation(
        "rotateSession",
        "POST",
        "/api/wallet/auth/session/rotate",
        undefined,
        csrf,
        prepared,
        "rotated",
        200,
      );
    },
  };

  return Object.freeze(bridge);
};
