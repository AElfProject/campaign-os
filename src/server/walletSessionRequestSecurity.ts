import type {
  WalletAuthenticationCookieConfig,
  WalletAuthenticationEnvironment,
} from "./walletAuthenticationConfig";

export const WALLET_SESSION_CSRF_HEADER_NAME = "x-campaign-os-csrf" as const;
export const WALLET_SESSION_MAX_COOKIE_HEADER_BYTES = 4_096;
export const WALLET_SESSION_MAX_CREDENTIAL_BYTES = 512;
export const WALLET_SESSION_MAX_CSRF_HEADER_BYTES = 512;

const WALLET_SESSION_MAX_ORIGIN_BYTES = 2_048;
const WALLET_SESSION_MAX_ORIGINS = 16;
const WALLET_SESSION_MAX_COOKIE_NAME_BYTES = 64;
const WALLET_SESSION_MAX_COOKIE_PATH_BYTES = 128;
const WALLET_SESSION_MAX_AGE_SECONDS = 604_800;
const WALLET_SESSION_PREFLIGHT_MAX_AGE_SECONDS = 600;
const WALLET_SESSION_DEFAULT_TRACE_ID = "wallet-session-security";
const WALLET_SESSION_CLEAR_EXPIRES = "Thu, 01 Jan 1970 00:00:00 GMT";

type Awaitable<T> = T | Promise<T>;

export type WalletSessionRequestHeaders = Readonly<
  Record<string, string | readonly string[] | undefined>
>;

export interface WalletSessionCookiePolicyInput extends WalletAuthenticationCookieConfig {
  /** Wallet auth cookies remain host-only until an approved production domain policy exists. */
  readonly domain?: string;
  readonly maxAgeSeconds: number;
}

export interface CreateWalletSessionRequestSecurityPolicyInput {
  readonly allowedOrigins: readonly string[];
  readonly cookie: WalletSessionCookiePolicyInput;
  readonly disposableEnvironment: boolean;
  readonly environment: WalletAuthenticationEnvironment;
  readonly traceId?: string;
}

export interface WalletSessionRequestSecurityPolicy {
  readonly allowedOrigins: readonly string[];
  readonly cookie: Readonly<{
    readonly httpOnly: true;
    readonly maxAgeSeconds: number;
    readonly name: string;
    readonly path: string;
    readonly sameSite: WalletAuthenticationCookieConfig["sameSite"];
    readonly secure: boolean;
  }>;
  readonly disposableEnvironment: boolean;
  readonly environment: WalletAuthenticationEnvironment;
}

export type WalletSessionRuntimeCookieResult =
  | Readonly<{ credential: string; status: "accepted" }>
  | Readonly<{ status: "rejected" }>;

export type WalletSessionRuntimeCsrfResult =
  | Readonly<{ status: "accepted"; token: string }>
  | Readonly<{ status: "rejected" }>;

export interface WalletSessionRuntimeRequestSecurityPort {
  clearCookie(traceId?: string): string;
  parseCredentialCookie(
    header: string | undefined,
    traceId?: string,
  ): WalletSessionRuntimeCookieResult;
  readCsrfHeader(
    header: string | readonly string[] | undefined,
    traceId?: string,
  ): WalletSessionRuntimeCsrfResult;
  requireOrigin(origin: string | undefined, traceId?: string): boolean;
  serializeCredentialCookie(
    credential: string,
    maxAgeSeconds: number,
    traceId?: string,
  ): string;
}

export type WalletSessionRequestSecurityErrorCode =
  | "WALLET_SESSION_COOKIE_SERIALIZATION_INVALID"
  | "WALLET_SESSION_SECURITY_CONFIG_INVALID";

const SECURITY_ERROR_MESSAGES: Readonly<Record<WalletSessionRequestSecurityErrorCode, string>> =
  Object.freeze({
    WALLET_SESSION_COOKIE_SERIALIZATION_INVALID:
      "Wallet session cookie serialization input is invalid.",
    WALLET_SESSION_SECURITY_CONFIG_INVALID:
      "Wallet session request security configuration is invalid.",
  });

export class WalletSessionRequestSecurityError extends Error {
  readonly code: WalletSessionRequestSecurityErrorCode;
  readonly traceId: string;

  constructor(code: WalletSessionRequestSecurityErrorCode, traceId: string) {
    super(SECURITY_ERROR_MESSAGES[code]);
    this.name = "WalletSessionRequestSecurityError";
    this.code = code;
    this.traceId = safeTraceId(traceId);
    delete this.stack;
  }
}

export type WalletSessionRequestFailureCode =
  | "WALLET_SESSION_ORIGIN_FORBIDDEN"
  | "WALLET_SESSION_REQUEST_INVALID"
  | "WALLET_SESSION_REQUEST_UNAUTHORIZED"
  | "WALLET_SESSION_SECURITY_UNAVAILABLE"
  | "WALLET_SESSION_UNAUTHORIZED";

export interface WalletSessionRequestFailure {
  readonly code: WalletSessionRequestFailureCode;
  readonly ok: false;
  readonly status: 400 | 401 | 403 | 503;
  readonly traceId: string;
}

export interface WalletSessionActiveSessionCallbackInput {
  readonly credential: string;
  readonly traceId: string;
}

export interface WalletSessionCsrfCallbackInput<TSession> {
  readonly credential: string;
  readonly session: TSession;
  readonly traceId: string;
}

export interface WalletSessionCsrfVerificationCallbackInput<TSession>
  extends WalletSessionCsrfCallbackInput<TSession> {
  readonly csrfToken: string;
}

export interface WalletCurrentSessionSecurityCallbacks<TSession> {
  readonly deriveCsrf: (
    input: WalletSessionCsrfCallbackInput<TSession>,
  ) => Awaitable<string>;
  readonly resolveActiveSession: (
    input: WalletSessionActiveSessionCallbackInput,
  ) => Awaitable<TSession | null | undefined>;
}

export interface WalletMutationSessionSecurityCallbacks<TSession> {
  readonly resolveActiveSession: (
    input: WalletSessionActiveSessionCallbackInput,
  ) => Awaitable<TSession | null | undefined>;
  readonly verifyCsrf: (
    input: WalletSessionCsrfVerificationCallbackInput<TSession>,
  ) => Awaitable<boolean>;
}

export interface AuthorizeWalletCurrentSessionRequestInput<TSession> {
  readonly callbacks: WalletCurrentSessionSecurityCallbacks<TSession>;
  readonly headers: WalletSessionRequestHeaders;
  readonly policy: WalletSessionRequestSecurityPolicy;
  readonly traceId: string;
}

export type AuthorizeWalletCurrentSessionRequestResult<TSession> =
  | WalletSessionRequestFailure
  | Readonly<{
    csrfToken: string;
    ok: true;
    session: TSession;
  }>;

export interface AuthorizeWalletSessionMutationRequestInput<TSession> {
  readonly callbacks: WalletMutationSessionSecurityCallbacks<TSession>;
  readonly headers: WalletSessionRequestHeaders;
  readonly policy: WalletSessionRequestSecurityPolicy;
  readonly traceId: string;
}

export type AuthorizeWalletSessionMutationRequestResult<TSession> =
  | WalletSessionRequestFailure
  | Readonly<{
    ok: true;
    session: TSession;
  }>;

export interface SerializeWalletSessionCookieInput {
  readonly credential: string;
  readonly maxAgeSeconds?: number;
  readonly now?: Date;
  readonly policy: WalletSessionRequestSecurityPolicy;
  readonly traceId: string;
}

export interface SerializeWalletSessionClearCookieInput {
  readonly policy: WalletSessionRequestSecurityPolicy;
  readonly traceId: string;
}

export interface EvaluateWalletSessionPreflightInput {
  readonly headers: WalletSessionRequestHeaders;
  readonly policy: WalletSessionRequestSecurityPolicy;
  readonly traceId: string;
}

export type WalletSessionPreflightResult =
  | WalletSessionRequestFailure
  | Readonly<{
    headers: Readonly<Record<string, string>>;
    ok: true;
    status: 204;
  }>;

const issuedPolicies = new WeakSet<object>();

const safeTraceId = (value: unknown): string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= 128
  && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
    ? value
    : WALLET_SESSION_DEFAULT_TRACE_ID;

const utf8ByteLength = (value: string): number =>
  new TextEncoder().encode(value).byteLength;

const failConfiguration = (traceId: unknown): never => {
  throw new WalletSessionRequestSecurityError(
    "WALLET_SESSION_SECURITY_CONFIG_INVALID",
    safeTraceId(traceId),
  );
};

const failSerialization = (traceId: unknown): never => {
  throw new WalletSessionRequestSecurityError(
    "WALLET_SESSION_COOKIE_SERIALIZATION_INVALID",
    safeTraceId(traceId),
  );
};

const failure = (
  code: WalletSessionRequestFailureCode,
  status: WalletSessionRequestFailure["status"],
  traceId: string,
): WalletSessionRequestFailure => Object.freeze({
  code,
  ok: false as const,
  status,
  traceId: safeTraceId(traceId),
});

const isCanonicalOrigin = (source: unknown): source is string => {
  if (
    typeof source !== "string"
    || source.length === 0
    || utf8ByteLength(source) > WALLET_SESSION_MAX_ORIGIN_BYTES
    || source === "null"
    || source === "*"
    || !/^[\x21-\x7e]+$/.test(source)
  ) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(source);
  } catch {
    return false;
  }

  return (parsed.protocol === "http:" || parsed.protocol === "https:")
    && parsed.username === ""
    && parsed.password === ""
    && parsed.pathname === "/"
    && parsed.search === ""
    && parsed.hash === ""
    && parsed.origin === source;
};

const isLoopbackHostname = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "localhost" || normalized === "::1") {
    return true;
  }

  const octets = normalized.split(".");
  return octets.length === 4
    && octets[0] === "127"
    && octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255);
};

const isSafeCookieName = (
  name: unknown,
  secure: boolean,
  path: string,
): name is string => {
  if (
    typeof name !== "string"
    || name.length === 0
    || utf8ByteLength(name) > WALLET_SESSION_MAX_COOKIE_NAME_BYTES
    || !/^[A-Za-z0-9_][A-Za-z0-9_-]*$/.test(name)
    || name.includes("%")
  ) {
    return false;
  }

  const lowerName = name.toLowerCase();
  if (lowerName.startsWith("__host-")) {
    return name.startsWith("__Host-")
      && name.length > "__Host-".length
      && secure
      && path === "/";
  }
  if (lowerName.startsWith("__secure-")) {
    return name.startsWith("__Secure-")
      && name.length > "__Secure-".length
      && secure;
  }

  return !name.startsWith("__");
};

const isSafeCookiePath = (path: unknown): path is string =>
  typeof path === "string"
  && path.length > 0
  && utf8ByteLength(path) <= WALLET_SESSION_MAX_COOKIE_PATH_BYTES
  && path.startsWith("/")
  && !path.includes("//")
  && !/(?:^|\/)\.\.(?:\/|$)/.test(path)
  && !/[\x00-\x20\x7f%;,\\?#]/.test(path);

const isEnvironment = (value: unknown): value is WalletAuthenticationEnvironment =>
  value === "local" || value === "stage" || value === "production";

const assertPolicy = (
  policy: WalletSessionRequestSecurityPolicy,
  traceId: string,
): void => {
  if (
    policy === null
    || typeof policy !== "object"
    || !issuedPolicies.has(policy)
  ) {
    return failConfiguration(traceId);
  }
};

export const createWalletSessionRequestSecurityPolicy = (
  input: CreateWalletSessionRequestSecurityPolicyInput,
): WalletSessionRequestSecurityPolicy => {
  const traceId = safeTraceId(input?.traceId);

  try {
    if (
      input === null
      || typeof input !== "object"
      || !Array.isArray(input.allowedOrigins)
      || input.allowedOrigins.length === 0
      || input.allowedOrigins.length > WALLET_SESSION_MAX_ORIGINS
      || !isEnvironment(input.environment)
      || typeof input.disposableEnvironment !== "boolean"
      || input.cookie === null
      || typeof input.cookie !== "object"
    ) {
      return failConfiguration(traceId);
    }

    const allowedOrigins = input.allowedOrigins.map((origin) => {
      if (!isCanonicalOrigin(origin)) {
        return failConfiguration(traceId);
      }
      return origin;
    });
    if (new Set(allowedOrigins).size !== allowedOrigins.length) {
      return failConfiguration(traceId);
    }

    const {
      domain,
      httpOnly,
      maxAgeSeconds,
      name,
      path,
      sameSite,
      secure,
    } = input.cookie;
    if (
      httpOnly !== true
      || typeof secure !== "boolean"
      || !isSafeCookiePath(path)
      || !isSafeCookieName(name, secure, path)
      || (sameSite !== "lax" && sameSite !== "strict" && sameSite !== "none")
      || (sameSite === "none" && !secure)
      || !Number.isSafeInteger(maxAgeSeconds)
      || maxAgeSeconds < 1
      || maxAgeSeconds > WALLET_SESSION_MAX_AGE_SECONDS
      || domain !== undefined
    ) {
      return failConfiguration(traceId);
    }

    if (
      input.environment === "production"
      && (
        !secure
        || allowedOrigins.some((origin) => new URL(origin).protocol !== "https:")
      )
    ) {
      return failConfiguration(traceId);
    }

    if (!secure) {
      const disposableLoopbackOnly = input.disposableEnvironment
        && input.environment !== "production"
        && allowedOrigins.every((origin) => {
          const parsed = new URL(origin);
          return parsed.protocol === "http:" && isLoopbackHostname(parsed.hostname);
        });

      if (!disposableLoopbackOnly) {
        return failConfiguration(traceId);
      }
    }

    const cookie = Object.freeze({
      httpOnly: true as const,
      maxAgeSeconds,
      name,
      path,
      sameSite,
      secure,
    });
    const policy: WalletSessionRequestSecurityPolicy = Object.freeze({
      allowedOrigins: Object.freeze([...allowedOrigins]),
      cookie,
      disposableEnvironment: input.disposableEnvironment,
      environment: input.environment,
    });
    issuedPolicies.add(policy);

    return policy;
  } catch (error) {
    if (error instanceof WalletSessionRequestSecurityError) {
      throw error;
    }
    return failConfiguration(traceId);
  }
};

const isCanonicalOpaqueValue = (value: unknown, maximumBytes: number): value is string =>
  typeof value === "string"
  && value.length > 0
  && utf8ByteLength(value) <= maximumBytes
  && /^[A-Za-z0-9_-]+$/.test(value);

const sameSiteAttribute = (
  value: WalletAuthenticationCookieConfig["sameSite"],
): "Lax" | "None" | "Strict" => {
  if (value === "lax") {
    return "Lax";
  }
  if (value === "none") {
    return "None";
  }
  return "Strict";
};

const cookieScopeAttributes = (policy: WalletSessionRequestSecurityPolicy): string[] => [
  "HttpOnly",
  ...(policy.cookie.secure ? ["Secure"] : []),
  `SameSite=${sameSiteAttribute(policy.cookie.sameSite)}`,
  `Path=${policy.cookie.path}`,
];

export const serializeWalletSessionCookie = ({
  credential,
  now = new Date(),
  policy,
  maxAgeSeconds = policy.cookie.maxAgeSeconds,
  traceId,
}: SerializeWalletSessionCookieInput): string => {
  assertPolicy(policy, traceId);
  if (
    !isCanonicalOpaqueValue(credential, WALLET_SESSION_MAX_CREDENTIAL_BYTES)
    || !(now instanceof Date)
    || !Number.isFinite(now.getTime())
    || !Number.isSafeInteger(maxAgeSeconds)
    || maxAgeSeconds < 1
    || maxAgeSeconds > policy.cookie.maxAgeSeconds
  ) {
    return failSerialization(traceId);
  }

  const expiresAt = new Date(now.getTime() + maxAgeSeconds * 1_000);
  if (!Number.isFinite(expiresAt.getTime())) {
    return failSerialization(traceId);
  }

  return [
    `${policy.cookie.name}=${credential}`,
    ...cookieScopeAttributes(policy),
    `Max-Age=${maxAgeSeconds}`,
    `Expires=${expiresAt.toUTCString()}`,
  ].join("; ");
};

export const serializeWalletSessionClearCookie = ({
  policy,
  traceId,
}: SerializeWalletSessionClearCookieInput): string => {
  assertPolicy(policy, traceId);

  return [
    `${policy.cookie.name}=`,
    ...cookieScopeAttributes(policy),
    "Max-Age=0",
    `Expires=${WALLET_SESSION_CLEAR_EXPIRES}`,
  ].join("; ");
};

type SingleHeaderResult =
  | Readonly<{ kind: "invalid" | "missing" }>
  | Readonly<{ kind: "value"; value: string }>;

const readSingleHeader = (
  headers: WalletSessionRequestHeaders,
  requestedName: string,
): SingleHeaderResult => {
  if (headers === null || typeof headers !== "object" || Array.isArray(headers)) {
    return { kind: "invalid" };
  }

  const values: unknown[] = [];
  try {
    for (const key of Reflect.ownKeys(headers)) {
      if (typeof key !== "string" || key.toLowerCase() !== requestedName) {
        continue;
      }

      const descriptor = Object.getOwnPropertyDescriptor(headers, key);
      if (!descriptor?.enumerable || !("value" in descriptor)) {
        return { kind: "invalid" };
      }
      values.push(descriptor.value);
    }
  } catch {
    return { kind: "invalid" };
  }

  if (values.length === 0) {
    return { kind: "missing" };
  }
  if (values.length !== 1 || typeof values[0] !== "string") {
    return { kind: "invalid" };
  }

  return { kind: "value", value: values[0] };
};

const confusableCookieName = (candidate: string, configuredName: string): boolean => {
  const lowerConfigured = configuredName.toLowerCase();
  if (candidate.trim().toLowerCase() === lowerConfigured) {
    return candidate !== configuredName;
  }
  if (!candidate.includes("%")) {
    return false;
  }

  try {
    return decodeURIComponent(candidate).toLowerCase() === lowerConfigured;
  } catch {
    return false;
  }
};

const canonicalCookieNamePattern = /^[!#$&'*+\-.^_`|~0-9A-Za-z]+$/;
const canonicalCookieValuePattern = /^[\x21\x23-\x2b\x2d-\x3a\x3c-\x5b\x5d-\x7e]*$/;

const readCredential = (
  headers: WalletSessionRequestHeaders,
  policy: WalletSessionRequestSecurityPolicy,
): string | undefined => {
  const header = readSingleHeader(headers, "cookie");
  if (
    header.kind !== "value"
    || utf8ByteLength(header.value) > WALLET_SESSION_MAX_COOKIE_HEADER_BYTES
    || /[\x00-\x1f\x7f]/.test(header.value)
  ) {
    return undefined;
  }

  let credential: string | undefined;
  let configuredCookieCount = 0;
  for (const rawPart of header.value.split(";")) {
    const part = rawPart.trim();
    const equalsIndex = part.indexOf("=");
    if (part.length === 0 || equalsIndex <= 0) {
      return undefined;
    }

    const name = part.slice(0, equalsIndex);
    const value = part.slice(equalsIndex + 1);
    if (
      !canonicalCookieNamePattern.test(name)
      || name.includes("%")
      || !canonicalCookieValuePattern.test(value)
    ) {
      return undefined;
    }
    if (confusableCookieName(name, policy.cookie.name)) {
      return undefined;
    }
    if (name !== policy.cookie.name) {
      continue;
    }

    configuredCookieCount += 1;
    if (!isCanonicalOpaqueValue(value, WALLET_SESSION_MAX_CREDENTIAL_BYTES)) {
      return undefined;
    }
    credential = value;
  }

  return configuredCookieCount === 1 ? credential : undefined;
};

const readAllowedOrigin = (
  headers: WalletSessionRequestHeaders,
  policy: WalletSessionRequestSecurityPolicy,
): string | undefined => {
  const origin = readSingleHeader(headers, "origin");
  if (
    origin.kind !== "value"
    || !isCanonicalOrigin(origin.value)
    || !policy.allowedOrigins.includes(origin.value)
  ) {
    return undefined;
  }

  return origin.value;
};

const readCsrfHeader = (headers: WalletSessionRequestHeaders): string | undefined => {
  const header = readSingleHeader(headers, WALLET_SESSION_CSRF_HEADER_NAME);
  return header.kind === "value"
    && isCanonicalOpaqueValue(header.value, WALLET_SESSION_MAX_CSRF_HEADER_BYTES)
    ? header.value
    : undefined;
};

export const createWalletSessionRuntimeRequestSecurityPort = (
  policy: WalletSessionRequestSecurityPolicy,
  now: () => Date = () => new Date(),
): WalletSessionRuntimeRequestSecurityPort => {
  assertPolicy(policy, WALLET_SESSION_DEFAULT_TRACE_ID);
  return Object.freeze({
    clearCookie: (traceId?: string) => serializeWalletSessionClearCookie({
      policy,
      traceId: safeTraceId(traceId),
    }),
    parseCredentialCookie: (header: string | undefined, _traceId?: string) => {
      const credential = readCredential(
        header === undefined ? {} : { cookie: header },
        policy,
      );
      return credential === undefined
        ? Object.freeze({ status: "rejected" as const })
        : Object.freeze({ credential, status: "accepted" as const });
    },
    readCsrfHeader: (header: string | readonly string[] | undefined, _traceId?: string) => {
      const token = readCsrfHeader(
        header === undefined ? {} : { [WALLET_SESSION_CSRF_HEADER_NAME]: header },
      );
      return token === undefined
        ? Object.freeze({ status: "rejected" as const })
        : Object.freeze({ status: "accepted" as const, token });
    },
    requireOrigin: (origin: string | undefined, _traceId?: string) => readAllowedOrigin(
      origin === undefined ? {} : { origin },
      policy,
    ) !== undefined,
    serializeCredentialCookie: (
      credential: string,
      maxAgeSeconds: number,
      traceId?: string,
    ) => {
      return serializeWalletSessionCookie({
        credential,
        maxAgeSeconds,
        now: now(),
        policy,
        traceId: safeTraceId(traceId),
      });
    },
  });
};

const unavailableForInvalidPolicy = (
  policy: WalletSessionRequestSecurityPolicy,
  traceId: string,
): WalletSessionRequestFailure | undefined => {
  if (
    policy === null
    || typeof policy !== "object"
    || !issuedPolicies.has(policy)
  ) {
    return failure("WALLET_SESSION_SECURITY_UNAVAILABLE", 503, traceId);
  }
  return undefined;
};

export const authorizeWalletCurrentSessionRequest = async <TSession>({
  callbacks,
  headers,
  policy,
  traceId: requestedTraceId,
}: AuthorizeWalletCurrentSessionRequestInput<TSession>): Promise<
  AuthorizeWalletCurrentSessionRequestResult<TSession>
> => {
  const traceId = safeTraceId(requestedTraceId);
  const invalidPolicy = unavailableForInvalidPolicy(policy, traceId);
  if (invalidPolicy) {
    return invalidPolicy;
  }
  if (!readAllowedOrigin(headers, policy)) {
    return failure("WALLET_SESSION_ORIGIN_FORBIDDEN", 403, traceId);
  }

  const credential = readCredential(headers, policy);
  if (!credential) {
    return failure("WALLET_SESSION_UNAUTHORIZED", 401, traceId);
  }

  try {
    const session = await callbacks.resolveActiveSession({ credential, traceId });
    if (session === null || session === undefined) {
      return failure("WALLET_SESSION_UNAUTHORIZED", 401, traceId);
    }

    const csrfToken = await callbacks.deriveCsrf({ credential, session, traceId });
    if (!isCanonicalOpaqueValue(csrfToken, WALLET_SESSION_MAX_CSRF_HEADER_BYTES)) {
      return failure("WALLET_SESSION_SECURITY_UNAVAILABLE", 503, traceId);
    }

    return Object.freeze({ csrfToken, ok: true as const, session });
  } catch {
    return failure("WALLET_SESSION_SECURITY_UNAVAILABLE", 503, traceId);
  }
};

export const authorizeWalletSessionMutationRequest = async <TSession>({
  callbacks,
  headers,
  policy,
  traceId: requestedTraceId,
}: AuthorizeWalletSessionMutationRequestInput<TSession>): Promise<
  AuthorizeWalletSessionMutationRequestResult<TSession>
> => {
  const traceId = safeTraceId(requestedTraceId);
  const invalidPolicy = unavailableForInvalidPolicy(policy, traceId);
  if (invalidPolicy) {
    return invalidPolicy;
  }
  if (!readAllowedOrigin(headers, policy)) {
    return failure("WALLET_SESSION_ORIGIN_FORBIDDEN", 403, traceId);
  }

  const credential = readCredential(headers, policy);
  if (!credential) {
    return failure("WALLET_SESSION_UNAUTHORIZED", 401, traceId);
  }
  const csrfToken = readCsrfHeader(headers);
  if (!csrfToken) {
    return failure("WALLET_SESSION_REQUEST_UNAUTHORIZED", 403, traceId);
  }

  try {
    const session = await callbacks.resolveActiveSession({ credential, traceId });
    if (session === null || session === undefined) {
      return failure("WALLET_SESSION_UNAUTHORIZED", 401, traceId);
    }

    const verified = await callbacks.verifyCsrf({
      credential,
      csrfToken,
      session,
      traceId,
    });
    if (verified !== true) {
      return failure("WALLET_SESSION_REQUEST_UNAUTHORIZED", 403, traceId);
    }

    return Object.freeze({ ok: true as const, session });
  } catch {
    return failure("WALLET_SESSION_SECURITY_UNAVAILABLE", 503, traceId);
  }
};

const readPreflightMethod = (headers: WalletSessionRequestHeaders): "GET" | "POST" | undefined => {
  const method = readSingleHeader(headers, "access-control-request-method");
  return method.kind === "value" && (method.value === "GET" || method.value === "POST")
    ? method.value
    : undefined;
};

const hasAllowedPreflightHeaders = (headers: WalletSessionRequestHeaders): boolean => {
  const requested = readSingleHeader(headers, "access-control-request-headers");
  if (requested.kind === "missing") {
    return true;
  }
  if (
    requested.kind !== "value"
    || requested.value.length === 0
    || utf8ByteLength(requested.value) > 512
  ) {
    return false;
  }

  const values = requested.value.split(",").map((value) => value.trim().toLowerCase());
  const allowed = new Set(["content-type", WALLET_SESSION_CSRF_HEADER_NAME]);
  return values.length > 0
    && new Set(values).size === values.length
    && values.every((value) => /^[a-z0-9-]+$/.test(value) && allowed.has(value));
};

export const evaluateWalletSessionPreflight = ({
  headers,
  policy,
  traceId: requestedTraceId,
}: EvaluateWalletSessionPreflightInput): WalletSessionPreflightResult => {
  const traceId = safeTraceId(requestedTraceId);
  const invalidPolicy = unavailableForInvalidPolicy(policy, traceId);
  if (invalidPolicy) {
    return invalidPolicy;
  }

  const origin = readAllowedOrigin(headers, policy);
  if (!origin) {
    return failure("WALLET_SESSION_ORIGIN_FORBIDDEN", 403, traceId);
  }
  if (!readPreflightMethod(headers) || !hasAllowedPreflightHeaders(headers)) {
    return failure("WALLET_SESSION_REQUEST_INVALID", 400, traceId);
  }

  return Object.freeze({
    headers: Object.freeze({
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": `content-type, ${WALLET_SESSION_CSRF_HEADER_NAME}`,
      "access-control-allow-methods": "GET, POST",
      "access-control-allow-origin": origin,
      "access-control-max-age": String(WALLET_SESSION_PREFLIGHT_MAX_AGE_SECONDS),
      vary: "Origin",
    }),
    ok: true as const,
    status: 204 as const,
  });
};
