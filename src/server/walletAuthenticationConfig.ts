import {
  isCanonicalLiveWalletAccountType,
  isCanonicalLiveWalletChainId,
  isCanonicalLiveWalletNetwork,
  isCanonicalLiveWalletSource,
  type CanonicalLiveWalletAccountType,
  type CanonicalLiveWalletChainId,
  type CanonicalLiveWalletNetwork,
  type CanonicalLiveWalletSource,
} from "../domain/wallet";
import type { WalletProofMethod, WalletSignatureEncoding } from "./walletAuthentication";

export const WALLET_AUTH_BINDINGS_JSON_MAX_BYTES = 65_536;
export const WALLET_AUTH_CA_PROVIDERS_JSON_MAX_BYTES = 65_536;
export const WALLET_AUTH_MAX_BINDINGS = 32;
export const WALLET_AUTH_MAX_CA_PROVIDERS = 16;
export const WALLET_AUTH_MAX_CHAIN_IDS = 8;
export const WALLET_AUTH_MAX_ORIGINS = 16;
export const WALLET_AUTH_ORIGIN_MAX_LENGTH = 2_048;
export const WALLET_AUTH_COOKIE_NAME_MAX_LENGTH = 64;
export const WALLET_AUTH_COOKIE_PATH_MAX_LENGTH = 128;
export const WALLET_AUTH_CSRF_SECRET_MAX_BYTES = 4_096;
export const WALLET_AUTH_CA_ENDPOINT_MAX_BYTES = 2_048;

export const WALLET_AUTH_CHALLENGE_TTL_SECONDS_MIN = 30;
export const WALLET_AUTH_CHALLENGE_TTL_SECONDS_MAX = 600;
export const WALLET_AUTH_CLOCK_SKEW_SECONDS_MIN = 0;
export const WALLET_AUTH_CLOCK_SKEW_SECONDS_MAX = 60;
export const WALLET_AUTH_MAX_ACTIVE_CHALLENGES_MIN = 1;
export const WALLET_AUTH_MAX_ACTIVE_CHALLENGES_MAX = 5;
export const WALLET_AUTH_MAX_VERIFICATION_ATTEMPTS_MIN = 1;
export const WALLET_AUTH_MAX_VERIFICATION_ATTEMPTS_MAX = 20;
export const WALLET_AUTH_IDLE_TTL_SECONDS_MIN = 300;
export const WALLET_AUTH_IDLE_TTL_SECONDS_MAX = 28_800;
export const WALLET_AUTH_ABSOLUTE_TTL_SECONDS_MIN = 1_800;
export const WALLET_AUTH_ABSOLUTE_TTL_SECONDS_MAX = 604_800;
export const WALLET_AUTH_MAX_SESSIONS_PER_SUBJECT_MIN = 1;
export const WALLET_AUTH_MAX_SESSIONS_PER_SUBJECT_MAX = 20;
export const WALLET_AUTH_SESSION_TOUCH_SECONDS_MIN = 1;
export const WALLET_AUTH_SESSION_TOUCH_SECONDS_MAX = 300;
export const WALLET_AUTH_CHALLENGE_REQUEST_BYTES_MIN = 512;
export const WALLET_AUTH_CHALLENGE_REQUEST_BYTES_MAX = 16_384;
export const WALLET_AUTH_PROOF_BYTES_MIN = 1_024;
export const WALLET_AUTH_PROOF_BYTES_MAX = 262_144;
export const WALLET_AUTH_SHUTDOWN_TIMEOUT_MS_MIN = 1_000;
export const WALLET_AUTH_SHUTDOWN_TIMEOUT_MS_MAX = 10_000;

const WALLET_AUTH_DEFAULT_CHALLENGE_TTL_SECONDS = 300;
const WALLET_AUTH_DEFAULT_CLOCK_SKEW_SECONDS = 30;
const WALLET_AUTH_DEFAULT_MAX_ACTIVE_CHALLENGES = 5;
const WALLET_AUTH_DEFAULT_MAX_VERIFICATION_ATTEMPTS = 20;
const WALLET_AUTH_DEFAULT_IDLE_TTL_SECONDS = 1_800;
const WALLET_AUTH_DEFAULT_ABSOLUTE_TTL_SECONDS = 28_800;
const WALLET_AUTH_DEFAULT_MAX_SESSIONS_PER_SUBJECT = 5;
const WALLET_AUTH_DEFAULT_SESSION_TOUCH_SECONDS = 60;
const WALLET_AUTH_DEFAULT_CHALLENGE_REQUEST_BYTES = 4_096;
const WALLET_AUTH_DEFAULT_PROOF_BYTES = 65_536;
const WALLET_AUTH_DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;
const WALLET_AUTH_DEFAULT_TRACE_ID = "wallet-auth-config-startup";
const WALLET_AUTH_CSRF_SECRET_ENV_KEY = "CAMPAIGN_OS_WALLET_AUTH_CSRF_SECRET";

export type WalletAuthenticationEnvironment = "local" | "stage" | "production";
export type WalletAuthenticationConfigStatus = "disabled" | "invalid" | "ready";
export type WalletAuthenticationStoreMode = "memory" | "postgres";
export type WalletAuthenticationSameSite = "lax" | "strict" | "none";

export type WalletAuthenticationConfigDiagnosticCode =
  | "WALLET_AUTH_ENABLEMENT_INVALID"
  | "WALLET_AUTH_ENVIRONMENT_INVALID"
  | "WALLET_AUTH_JSON_REQUIRED"
  | "WALLET_AUTH_JSON_TOO_LARGE"
  | "WALLET_AUTH_JSON_INVALID"
  | "WALLET_AUTH_JSON_SHAPE_INVALID"
  | "WALLET_AUTH_UNKNOWN_FIELD"
  | "WALLET_AUTH_ENTRY_LIMIT_EXCEEDED"
  | "WALLET_AUTH_ADAPTER_ID_INVALID"
  | "WALLET_AUTH_ADAPTER_ID_CONFLICT"
  | "WALLET_AUTH_BINDING_INVALID"
  | "WALLET_AUTH_CA_PROVIDER_INVALID"
  | "WALLET_AUTH_CA_PROVIDER_ID_CONFLICT"
  | "WALLET_AUTH_CA_PROVIDER_REQUIRED"
  | "WALLET_AUTH_CA_PROVIDER_DISABLED"
  | "WALLET_AUTH_CA_PROVIDER_MATERIAL_REQUIRED"
  | "WALLET_AUTH_CA_PROVIDER_MATERIAL_INVALID"
  | "WALLET_AUTH_BOUND_INVALID"
  | "WALLET_AUTH_ORIGIN_REQUIRED"
  | "WALLET_AUTH_ORIGIN_INVALID"
  | "WALLET_AUTH_COOKIE_INVALID"
  | "WALLET_AUTH_INSECURE_COOKIE_NOT_ALLOWED"
  | "WALLET_AUTH_CSRF_SECRET_REQUIRED"
  | "WALLET_AUTH_CSRF_SECRET_INVALID"
  | "WALLET_AUTH_PRODUCTION_HTTPS_REQUIRED"
  | "WALLET_AUTH_PRODUCTION_SECURE_COOKIE_REQUIRED"
  | "WALLET_AUTH_PRODUCTION_ADAPTER_APPROVAL_REQUIRED"
  | "WALLET_AUTH_PRODUCTION_CA_PROVIDER_APPROVAL_REQUIRED"
  | "WALLET_AUTH_POSTGRES_REQUIRED";

export interface WalletAuthenticationConfigDiagnostic {
  readonly adapterId?: string;
  readonly code: WalletAuthenticationConfigDiagnosticCode;
  readonly field: string;
  readonly severity: "error";
  readonly traceId: string;
}

export interface WalletVerifierBinding {
  readonly accountType: CanonicalLiveWalletAccountType;
  readonly adapterId: string;
  readonly caRelationProviderId?: string;
  readonly chainIds: readonly CanonicalLiveWalletChainId[];
  readonly enabled: boolean;
  readonly hashStrategyId: string;
  readonly network: CanonicalLiveWalletNetwork;
  readonly productionApproved: boolean;
  readonly proofMethod: WalletProofMethod;
  readonly signatureEncoding: WalletSignatureEncoding;
  readonly walletSource: CanonicalLiveWalletSource;
}

export interface WalletCaRelationProviderConfig {
  readonly enabled: boolean;
  readonly endpointEnvKey: string;
  readonly id: string;
  readonly productionApproved: boolean;
  readonly timeoutMs: number;
}

export interface WalletAuthenticationCookieConfig {
  readonly httpOnly: true;
  readonly name: string;
  readonly path: string;
  readonly sameSite: WalletAuthenticationSameSite;
  readonly secure: boolean;
}

export interface WalletAuthenticationLimits {
  readonly absoluteTtlSeconds: number;
  readonly challengeRequestMaxBytes: number;
  readonly challengeTtlSeconds: number;
  readonly clockSkewSeconds: number;
  readonly idleTtlSeconds: number;
  readonly maxActiveChallenges: number;
  readonly maxSessionsPerSubject: number;
  readonly maxVerificationAttempts: number;
  readonly proofMaxBytes: number;
  readonly sessionTouchIntervalSeconds: number;
  readonly shutdownTimeoutMs: number;
}

export type WalletVerifierBindingResolution =
  | Readonly<{ binding: WalletVerifierBinding; status: "resolved" }>
  | Readonly<{
    diagnosticCode:
      | "WALLET_AUTH_DISABLED"
      | "WALLET_AUTH_CONFIG_INVALID"
      | "WALLET_AUTH_BINDING_NOT_FOUND"
      | "WALLET_AUTH_BINDING_DISABLED";
    status: "disabled" | "invalid" | "not_found";
  }>;

export interface WalletAuthenticationConfig {
  readonly allowedOrigins: readonly string[];
  readonly bindings: readonly WalletVerifierBinding[];
  readonly caRelationProviders: readonly WalletCaRelationProviderConfig[];
  readonly cookie: WalletAuthenticationCookieConfig;
  readonly csrf: Readonly<{
    configured: boolean;
    envKey: typeof WALLET_AUTH_CSRF_SECRET_ENV_KEY;
  }>;
  readonly diagnostics: readonly WalletAuthenticationConfigDiagnostic[];
  readonly enabled: boolean;
  readonly environment: WalletAuthenticationEnvironment;
  readonly limits: WalletAuthenticationLimits;
  readonly productionReady: boolean;
  readonly resolveBinding: (adapterId: string) => WalletVerifierBindingResolution;
  readonly status: WalletAuthenticationConfigStatus;
  readonly storeMode: WalletAuthenticationStoreMode;
  readonly valid: boolean;
}

export interface WalletAuthenticationConfigSummary {
  readonly bindingCount: number;
  readonly enabledBindingIds: readonly string[];
  readonly environment: WalletAuthenticationEnvironment;
  readonly productionReady: boolean;
  readonly status: WalletAuthenticationConfigStatus;
}

export interface ResolveWalletAuthenticationConfigOptions {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly jsonParser?: (source: string) => unknown;
  readonly traceId?: string;
}

class WalletAuthenticationConfigFailure extends Error {
  readonly adapterId?: string;
  readonly code: WalletAuthenticationConfigDiagnosticCode;
  readonly field: string;

  constructor(
    code: WalletAuthenticationConfigDiagnosticCode,
    field: string,
    adapterId?: string,
  ) {
    super("Wallet authentication configuration is invalid.");
    this.name = "WalletAuthenticationConfigFailure";
    this.code = code;
    this.field = field;
    this.adapterId = adapterId;
  }
}

const fail = (
  code: WalletAuthenticationConfigDiagnosticCode,
  field: string,
  adapterId?: string,
): never => {
  throw new WalletAuthenticationConfigFailure(code, field, adapterId);
};

const utf8ByteLength = (value: string): number =>
  new TextEncoder().encode(value).byteLength;

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const safeId = (value: unknown, maximum = 96): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= maximum
  && /^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)*$/.test(value);

const safeTraceId = (value: string | undefined): string =>
  value && value.length <= 128 && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
    ? value
    : WALLET_AUTH_DEFAULT_TRACE_ID;

const diagnostic = (
  failure: Pick<WalletAuthenticationConfigFailure, "adapterId" | "code" | "field">,
  traceId: string,
): WalletAuthenticationConfigDiagnostic => Object.freeze({
  ...(failure.adapterId === undefined ? {} : { adapterId: failure.adapterId }),
  code: failure.code,
  field: failure.field,
  severity: "error",
  traceId,
});

const ownValue = (record: Record<string, unknown>, field: string): unknown => {
  const descriptor = Object.getOwnPropertyDescriptor(record, field);

  if (!descriptor?.enumerable || !("value" in descriptor)) {
    return fail("WALLET_AUTH_JSON_SHAPE_INVALID", field);
  }

  return descriptor.value;
};

const optionalOwnValue = (
  record: Record<string, unknown>,
  field: string,
): { readonly present: false } | { readonly present: true; readonly value: unknown } => {
  const descriptor = Object.getOwnPropertyDescriptor(record, field);

  if (!descriptor) {
    return { present: false };
  }

  if (!descriptor.enumerable || !("value" in descriptor)) {
    return fail("WALLET_AUTH_JSON_SHAPE_INVALID", field);
  }

  return { present: true, value: descriptor.value };
};

const assertExactFields = (
  record: Record<string, unknown>,
  allowedFields: ReadonlySet<string>,
  field: string,
): void => {
  if (Object.keys(record).some((key) => !allowedFields.has(key))) {
    return fail("WALLET_AUTH_UNKNOWN_FIELD", field);
  }
};

const parseJsonArray = ({
  field,
  maximumBytes,
  maximumEntries,
  parser,
  source,
}: {
  readonly field: string;
  readonly maximumBytes: number;
  readonly maximumEntries: number;
  readonly parser: (source: string) => unknown;
  readonly source: string | undefined;
}): readonly unknown[] => {
  if (!source) {
    return fail("WALLET_AUTH_JSON_REQUIRED", field);
  }

  if (utf8ByteLength(source) > maximumBytes) {
    return fail("WALLET_AUTH_JSON_TOO_LARGE", field);
  }

  let parsed: unknown;
  try {
    parsed = parser(source);
  } catch {
    return fail("WALLET_AUTH_JSON_INVALID", field);
  }

  if (!Array.isArray(parsed)) {
    return fail("WALLET_AUTH_JSON_SHAPE_INVALID", field);
  }

  if (parsed.length > maximumEntries) {
    return fail("WALLET_AUTH_ENTRY_LIMIT_EXCEEDED", field);
  }

  return parsed;
};

const parseEnvironment = (value: string | undefined): WalletAuthenticationEnvironment => {
  if (value === undefined || value === "") {
    return "local";
  }

  if (value === "local" || value === "stage" || value === "production") {
    return value;
  }

  return fail("WALLET_AUTH_ENVIRONMENT_INVALID", "CAMPAIGN_OS_WALLET_AUTH_ENVIRONMENT");
};

const parseGlobalEnablement = (value: string | undefined): boolean => {
  if (value === undefined || value === "" || value === "0" || value === "false") {
    return false;
  }

  if (value === "1" || value === "true") {
    return true;
  }

  return fail("WALLET_AUTH_ENABLEMENT_INVALID", "CAMPAIGN_OS_WALLET_AUTH_ENABLED");
};

const parseBooleanFlag = (
  value: string | undefined,
  defaultValue: boolean,
  field: string,
): boolean => {
  if (value === undefined || value === "") {
    return defaultValue;
  }

  if (value === "1" || value === "true") {
    return true;
  }

  if (value === "0" || value === "false") {
    return false;
  }

  return fail("WALLET_AUTH_COOKIE_INVALID", field);
};

const parseBoundedInteger = ({
  defaultValue,
  field,
  maximum,
  minimum,
  value,
}: {
  readonly defaultValue: number;
  readonly field: string;
  readonly maximum: number;
  readonly minimum: number;
  readonly value: string | undefined;
}): number => {
  if (value === undefined || value === "") {
    return defaultValue;
  }

  if (!/^\d+$/.test(value)) {
    return fail("WALLET_AUTH_BOUND_INVALID", field);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    return fail("WALLET_AUTH_BOUND_INVALID", field);
  }

  return parsed;
};

const bindingFields = new Set([
  "accountType",
  "adapterId",
  "caRelationProviderId",
  "chainIds",
  "enabled",
  "hashStrategyId",
  "network",
  "productionApproved",
  "proofMethod",
  "signatureEncoding",
  "walletSource",
]);

const parseBinding = (value: unknown): WalletVerifierBinding => {
  if (!isPlainRecord(value)) {
    return fail("WALLET_AUTH_JSON_SHAPE_INVALID", "bindings[]");
  }

  assertExactFields(value, bindingFields, "bindings[]");
  const adapterIdValue = ownValue(value, "adapterId");
  if (!safeId(adapterIdValue, 64)) {
    return fail("WALLET_AUTH_ADAPTER_ID_INVALID", "bindings[].adapterId");
  }
  const adapterId = adapterIdValue;
  const accountType = ownValue(value, "accountType");
  const chainIds = ownValue(value, "chainIds");
  const enabled = ownValue(value, "enabled");
  const hashStrategyId = ownValue(value, "hashStrategyId");
  const network = ownValue(value, "network");
  const productionApproved = ownValue(value, "productionApproved");
  const proofMethod = ownValue(value, "proofMethod");
  const signatureEncoding = ownValue(value, "signatureEncoding");
  const walletSource = ownValue(value, "walletSource");
  const caProvider = optionalOwnValue(value, "caRelationProviderId");

  if (
    !isCanonicalLiveWalletAccountType(accountType)
    || !Array.isArray(chainIds)
    || chainIds.length === 0
    || chainIds.length > WALLET_AUTH_MAX_CHAIN_IDS
    || chainIds.some((chainId) => !isCanonicalLiveWalletChainId(chainId))
    || new Set(chainIds).size !== chainIds.length
    || typeof enabled !== "boolean"
    || !safeId(hashStrategyId, 96)
    || !isCanonicalLiveWalletNetwork(network)
    || typeof productionApproved !== "boolean"
    || (proofMethod !== "AELF_EOA_RECOVERABLE" && proofMethod !== "PORTKEY_AA_MANAGER_CA")
    || signatureEncoding !== "AELF_RECOVERABLE_HEX"
    || !isCanonicalLiveWalletSource(walletSource)
  ) {
    return fail("WALLET_AUTH_BINDING_INVALID", "bindings[]", adapterId);
  }

  const isEoa = accountType === "EOA"
    && proofMethod === "AELF_EOA_RECOVERABLE"
    && walletSource !== "PORTKEY_AA"
    && !caProvider.present;
  const isAa = accountType === "AA"
    && proofMethod === "PORTKEY_AA_MANAGER_CA"
    && walletSource === "PORTKEY_AA"
    && caProvider.present
    && safeId(caProvider.value, 64);

  if (!isEoa && !isAa) {
    return fail("WALLET_AUTH_BINDING_INVALID", "bindings[]", adapterId);
  }

  return Object.freeze({
    accountType,
    adapterId,
    ...(isAa ? { caRelationProviderId: caProvider.value as string } : {}),
    chainIds: Object.freeze([...(chainIds as CanonicalLiveWalletChainId[])]),
    enabled,
    hashStrategyId,
    network,
    productionApproved,
    proofMethod,
    signatureEncoding,
    walletSource,
  });
};

const caProviderFields = new Set([
  "enabled",
  "endpointEnvKey",
  "id",
  "productionApproved",
  "timeoutMs",
]);

const parseCaProvider = (value: unknown): WalletCaRelationProviderConfig => {
  if (!isPlainRecord(value)) {
    return fail("WALLET_AUTH_JSON_SHAPE_INVALID", "caRelationProviders[]");
  }

  assertExactFields(value, caProviderFields, "caRelationProviders[]");
  const enabled = ownValue(value, "enabled");
  const endpointEnvKey = ownValue(value, "endpointEnvKey");
  const id = ownValue(value, "id");
  const productionApproved = ownValue(value, "productionApproved");
  const timeoutMs = ownValue(value, "timeoutMs");

  if (
    typeof enabled !== "boolean"
    || typeof endpointEnvKey !== "string"
    || endpointEnvKey.length > 128
    || !/^CAMPAIGN_OS_[A-Z0-9_]+$/.test(endpointEnvKey)
    || !safeId(id, 64)
    || typeof productionApproved !== "boolean"
    || !Number.isSafeInteger(timeoutMs)
    || (timeoutMs as number) < 100
    || (timeoutMs as number) > 5_000
  ) {
    return fail("WALLET_AUTH_CA_PROVIDER_INVALID", "caRelationProviders[]");
  }

  return Object.freeze({
    enabled,
    endpointEnvKey,
    id,
    productionApproved,
    timeoutMs,
  }) as WalletCaRelationProviderConfig;
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

const parseExactOrigin = (
  source: string,
  environment: WalletAuthenticationEnvironment,
): string => {
  if (source === "*" || source.length === 0 || source.length > WALLET_AUTH_ORIGIN_MAX_LENGTH) {
    return fail("WALLET_AUTH_ORIGIN_INVALID", "CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS");
  }

  let parsed: URL;
  try {
    parsed = new URL(source);
  } catch {
    return fail("WALLET_AUTH_ORIGIN_INVALID", "CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS");
  }

  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:")
    || parsed.username !== ""
    || parsed.password !== ""
    || parsed.pathname !== "/"
    || parsed.search !== ""
    || parsed.hash !== ""
    || parsed.origin !== source
  ) {
    return fail("WALLET_AUTH_ORIGIN_INVALID", "CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS");
  }

  if (environment === "production" && parsed.protocol !== "https:") {
    return fail(
      "WALLET_AUTH_PRODUCTION_HTTPS_REQUIRED",
      "CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS",
    );
  }

  return parsed.origin;
};

const parseOrigins = (
  value: string | undefined,
  environment: WalletAuthenticationEnvironment,
): readonly string[] => {
  if (!value) {
    return fail("WALLET_AUTH_ORIGIN_REQUIRED", "CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS");
  }

  const sources = value.split(",").map((item) => item.trim());
  if (
    sources.length === 0
    || sources.length > WALLET_AUTH_MAX_ORIGINS
    || new Set(sources).size !== sources.length
  ) {
    return fail("WALLET_AUTH_ORIGIN_INVALID", "CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS");
  }

  return Object.freeze(sources.map((source) => parseExactOrigin(source, environment)));
};

const parseCookie = (
  env: Readonly<Record<string, string | undefined>>,
  environment: WalletAuthenticationEnvironment,
  allowedOrigins: readonly string[],
): WalletAuthenticationCookieConfig => {
  const name = env.CAMPAIGN_OS_WALLET_AUTH_COOKIE_NAME ?? "campaign_os_wallet_session";
  const path = env.CAMPAIGN_OS_WALLET_AUTH_COOKIE_PATH ?? "/";
  const sameSiteValue = (env.CAMPAIGN_OS_WALLET_AUTH_COOKIE_SAME_SITE ?? "lax").toLowerCase();
  const secure = parseBooleanFlag(
    env.CAMPAIGN_OS_WALLET_AUTH_COOKIE_SECURE,
    environment === "production",
    "CAMPAIGN_OS_WALLET_AUTH_COOKIE_SECURE",
  );
  const allowInsecureLoopback = parseBooleanFlag(
    env.CAMPAIGN_OS_WALLET_AUTH_ALLOW_INSECURE_LOOPBACK_COOKIE,
    false,
    "CAMPAIGN_OS_WALLET_AUTH_ALLOW_INSECURE_LOOPBACK_COOKIE",
  );

  if (
    name.length === 0
    || name.length > WALLET_AUTH_COOKIE_NAME_MAX_LENGTH
    || !/^[A-Za-z0-9_]+$/.test(name)
    || path.length === 0
    || path.length > WALLET_AUTH_COOKIE_PATH_MAX_LENGTH
    || !path.startsWith("/")
    || /[\u0000-\u001f\u007f;,\\]/.test(path)
    || (sameSiteValue !== "lax" && sameSiteValue !== "strict" && sameSiteValue !== "none")
    || (sameSiteValue === "none" && !secure)
  ) {
    return fail("WALLET_AUTH_COOKIE_INVALID", "cookie");
  }

  if (environment === "production" && !secure) {
    return fail(
      "WALLET_AUTH_PRODUCTION_SECURE_COOKIE_REQUIRED",
      "CAMPAIGN_OS_WALLET_AUTH_COOKIE_SECURE",
    );
  }

  if (!secure) {
    const loopbackOnly = allowedOrigins.every((origin) => {
      const parsed = new URL(origin);
      return parsed.protocol === "http:" && isLoopbackHostname(parsed.hostname);
    });

    if (environment === "production" || !allowInsecureLoopback || !loopbackOnly) {
      return fail(
        "WALLET_AUTH_INSECURE_COOKIE_NOT_ALLOWED",
        "CAMPAIGN_OS_WALLET_AUTH_ALLOW_INSECURE_LOOPBACK_COOKIE",
      );
    }
  }

  return Object.freeze({
    httpOnly: true,
    name,
    path,
    sameSite: sameSiteValue,
    secure,
  });
};

const parseLimits = (
  env: Readonly<Record<string, string | undefined>>,
): WalletAuthenticationLimits => Object.freeze({
  absoluteTtlSeconds: parseBoundedInteger({
    defaultValue: WALLET_AUTH_DEFAULT_ABSOLUTE_TTL_SECONDS,
    field: "CAMPAIGN_OS_WALLET_AUTH_ABSOLUTE_TTL_SECONDS",
    maximum: WALLET_AUTH_ABSOLUTE_TTL_SECONDS_MAX,
    minimum: WALLET_AUTH_ABSOLUTE_TTL_SECONDS_MIN,
    value: env.CAMPAIGN_OS_WALLET_AUTH_ABSOLUTE_TTL_SECONDS,
  }),
  challengeRequestMaxBytes: parseBoundedInteger({
    defaultValue: WALLET_AUTH_DEFAULT_CHALLENGE_REQUEST_BYTES,
    field: "CAMPAIGN_OS_WALLET_AUTH_CHALLENGE_REQUEST_MAX_BYTES",
    maximum: WALLET_AUTH_CHALLENGE_REQUEST_BYTES_MAX,
    minimum: WALLET_AUTH_CHALLENGE_REQUEST_BYTES_MIN,
    value: env.CAMPAIGN_OS_WALLET_AUTH_CHALLENGE_REQUEST_MAX_BYTES,
  }),
  challengeTtlSeconds: parseBoundedInteger({
    defaultValue: WALLET_AUTH_DEFAULT_CHALLENGE_TTL_SECONDS,
    field: "CAMPAIGN_OS_WALLET_AUTH_CHALLENGE_TTL_SECONDS",
    maximum: WALLET_AUTH_CHALLENGE_TTL_SECONDS_MAX,
    minimum: WALLET_AUTH_CHALLENGE_TTL_SECONDS_MIN,
    value: env.CAMPAIGN_OS_WALLET_AUTH_CHALLENGE_TTL_SECONDS,
  }),
  clockSkewSeconds: parseBoundedInteger({
    defaultValue: WALLET_AUTH_DEFAULT_CLOCK_SKEW_SECONDS,
    field: "CAMPAIGN_OS_WALLET_AUTH_CLOCK_SKEW_SECONDS",
    maximum: WALLET_AUTH_CLOCK_SKEW_SECONDS_MAX,
    minimum: WALLET_AUTH_CLOCK_SKEW_SECONDS_MIN,
    value: env.CAMPAIGN_OS_WALLET_AUTH_CLOCK_SKEW_SECONDS,
  }),
  idleTtlSeconds: parseBoundedInteger({
    defaultValue: WALLET_AUTH_DEFAULT_IDLE_TTL_SECONDS,
    field: "CAMPAIGN_OS_WALLET_AUTH_IDLE_TTL_SECONDS",
    maximum: WALLET_AUTH_IDLE_TTL_SECONDS_MAX,
    minimum: WALLET_AUTH_IDLE_TTL_SECONDS_MIN,
    value: env.CAMPAIGN_OS_WALLET_AUTH_IDLE_TTL_SECONDS,
  }),
  maxActiveChallenges: parseBoundedInteger({
    defaultValue: WALLET_AUTH_DEFAULT_MAX_ACTIVE_CHALLENGES,
    field: "CAMPAIGN_OS_WALLET_AUTH_MAX_ACTIVE_CHALLENGES",
    maximum: WALLET_AUTH_MAX_ACTIVE_CHALLENGES_MAX,
    minimum: WALLET_AUTH_MAX_ACTIVE_CHALLENGES_MIN,
    value: env.CAMPAIGN_OS_WALLET_AUTH_MAX_ACTIVE_CHALLENGES,
  }),
  maxSessionsPerSubject: parseBoundedInteger({
    defaultValue: WALLET_AUTH_DEFAULT_MAX_SESSIONS_PER_SUBJECT,
    field: "CAMPAIGN_OS_WALLET_AUTH_MAX_SESSIONS_PER_SUBJECT",
    maximum: WALLET_AUTH_MAX_SESSIONS_PER_SUBJECT_MAX,
    minimum: WALLET_AUTH_MAX_SESSIONS_PER_SUBJECT_MIN,
    value: env.CAMPAIGN_OS_WALLET_AUTH_MAX_SESSIONS_PER_SUBJECT,
  }),
  maxVerificationAttempts: parseBoundedInteger({
    defaultValue: WALLET_AUTH_DEFAULT_MAX_VERIFICATION_ATTEMPTS,
    field: "CAMPAIGN_OS_WALLET_AUTH_MAX_VERIFICATION_ATTEMPTS",
    maximum: WALLET_AUTH_MAX_VERIFICATION_ATTEMPTS_MAX,
    minimum: WALLET_AUTH_MAX_VERIFICATION_ATTEMPTS_MIN,
    value: env.CAMPAIGN_OS_WALLET_AUTH_MAX_VERIFICATION_ATTEMPTS,
  }),
  proofMaxBytes: parseBoundedInteger({
    defaultValue: WALLET_AUTH_DEFAULT_PROOF_BYTES,
    field: "CAMPAIGN_OS_WALLET_AUTH_PROOF_MAX_BYTES",
    maximum: WALLET_AUTH_PROOF_BYTES_MAX,
    minimum: WALLET_AUTH_PROOF_BYTES_MIN,
    value: env.CAMPAIGN_OS_WALLET_AUTH_PROOF_MAX_BYTES,
  }),
  sessionTouchIntervalSeconds: parseBoundedInteger({
    defaultValue: WALLET_AUTH_DEFAULT_SESSION_TOUCH_SECONDS,
    field: "CAMPAIGN_OS_WALLET_AUTH_SESSION_TOUCH_INTERVAL_SECONDS",
    maximum: WALLET_AUTH_SESSION_TOUCH_SECONDS_MAX,
    minimum: WALLET_AUTH_SESSION_TOUCH_SECONDS_MIN,
    value: env.CAMPAIGN_OS_WALLET_AUTH_SESSION_TOUCH_INTERVAL_SECONDS,
  }),
  shutdownTimeoutMs: parseBoundedInteger({
    defaultValue: WALLET_AUTH_DEFAULT_SHUTDOWN_TIMEOUT_MS,
    field: "CAMPAIGN_OS_WALLET_AUTH_SHUTDOWN_TIMEOUT_MS",
    maximum: WALLET_AUTH_SHUTDOWN_TIMEOUT_MS_MAX,
    minimum: WALLET_AUTH_SHUTDOWN_TIMEOUT_MS_MIN,
    value: env.CAMPAIGN_OS_WALLET_AUTH_SHUTDOWN_TIMEOUT_MS,
  }),
});

const defaultCookie = (): WalletAuthenticationCookieConfig => Object.freeze({
  httpOnly: true,
  name: "campaign_os_wallet_session",
  path: "/",
  sameSite: "lax",
  secure: false,
});

const defaultLimits = (): WalletAuthenticationLimits => Object.freeze({
  absoluteTtlSeconds: WALLET_AUTH_DEFAULT_ABSOLUTE_TTL_SECONDS,
  challengeRequestMaxBytes: WALLET_AUTH_DEFAULT_CHALLENGE_REQUEST_BYTES,
  challengeTtlSeconds: WALLET_AUTH_DEFAULT_CHALLENGE_TTL_SECONDS,
  clockSkewSeconds: WALLET_AUTH_DEFAULT_CLOCK_SKEW_SECONDS,
  idleTtlSeconds: WALLET_AUTH_DEFAULT_IDLE_TTL_SECONDS,
  maxActiveChallenges: WALLET_AUTH_DEFAULT_MAX_ACTIVE_CHALLENGES,
  maxSessionsPerSubject: WALLET_AUTH_DEFAULT_MAX_SESSIONS_PER_SUBJECT,
  maxVerificationAttempts: WALLET_AUTH_DEFAULT_MAX_VERIFICATION_ATTEMPTS,
  proofMaxBytes: WALLET_AUTH_DEFAULT_PROOF_BYTES,
  sessionTouchIntervalSeconds: WALLET_AUTH_DEFAULT_SESSION_TOUCH_SECONDS,
  shutdownTimeoutMs: WALLET_AUTH_DEFAULT_SHUTDOWN_TIMEOUT_MS,
});

const createConfig = ({
  allowedOrigins = [],
  bindings = [],
  caRelationProviders = [],
  cookie = defaultCookie(),
  csrfConfigured = false,
  diagnostics = [],
  environment,
  limits = defaultLimits(),
  productionReady = false,
  status,
  storeMode = "memory",
}: {
  readonly allowedOrigins?: readonly string[];
  readonly bindings?: readonly WalletVerifierBinding[];
  readonly caRelationProviders?: readonly WalletCaRelationProviderConfig[];
  readonly cookie?: WalletAuthenticationCookieConfig;
  readonly csrfConfigured?: boolean;
  readonly diagnostics?: readonly WalletAuthenticationConfigDiagnostic[];
  readonly environment: WalletAuthenticationEnvironment;
  readonly limits?: WalletAuthenticationLimits;
  readonly productionReady?: boolean;
  readonly status: WalletAuthenticationConfigStatus;
  readonly storeMode?: WalletAuthenticationStoreMode;
}): WalletAuthenticationConfig => {
  const frozenBindings = Object.freeze([...bindings]);
  const bindingById = new Map(frozenBindings.map((binding) => [binding.adapterId, binding]));
  const resolveBinding = Object.freeze((adapterId: string): WalletVerifierBindingResolution => {
    if (status === "disabled") {
      return Object.freeze({
        diagnosticCode: "WALLET_AUTH_DISABLED" as const,
        status: "disabled" as const,
      });
    }

    if (status === "invalid") {
      return Object.freeze({
        diagnosticCode: "WALLET_AUTH_CONFIG_INVALID" as const,
        status: "invalid" as const,
      });
    }

    const binding = bindingById.get(adapterId);
    if (!binding) {
      return Object.freeze({
        diagnosticCode: "WALLET_AUTH_BINDING_NOT_FOUND" as const,
        status: "not_found" as const,
      });
    }

    if (!binding.enabled) {
      return Object.freeze({
        diagnosticCode: "WALLET_AUTH_BINDING_DISABLED" as const,
        status: "disabled" as const,
      });
    }

    return Object.freeze({ binding, status: "resolved" as const });
  });

  return Object.freeze({
    allowedOrigins: Object.freeze([...allowedOrigins]),
    bindings: frozenBindings,
    caRelationProviders: Object.freeze([...caRelationProviders]),
    cookie,
    csrf: Object.freeze({
      configured: csrfConfigured,
      envKey: WALLET_AUTH_CSRF_SECRET_ENV_KEY,
    }),
    diagnostics: Object.freeze([...diagnostics]),
    enabled: status === "ready",
    environment,
    limits,
    productionReady,
    resolveBinding,
    status,
    storeMode,
    valid: status !== "invalid",
  });
};

const validateProviderMaterial = ({
  env,
  environment,
  provider,
}: {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly environment: WalletAuthenticationEnvironment;
  readonly provider: WalletCaRelationProviderConfig;
}): void => {
  if (!provider.enabled) {
    return;
  }

  const endpoint = env[provider.endpointEnvKey];
  if (!endpoint) {
    return fail("WALLET_AUTH_CA_PROVIDER_MATERIAL_REQUIRED", "caRelationProviders[].endpointEnvKey");
  }
  if (utf8ByteLength(endpoint) > WALLET_AUTH_CA_ENDPOINT_MAX_BYTES) {
    return fail("WALLET_AUTH_CA_PROVIDER_MATERIAL_INVALID", "caRelationProviders[].endpointEnvKey");
  }

  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    return fail("WALLET_AUTH_CA_PROVIDER_MATERIAL_REQUIRED", "caRelationProviders[].endpointEnvKey");
  }

  if (
    parsed.username !== ""
    || parsed.password !== ""
    || parsed.hash !== ""
    || (parsed.protocol !== "http:" && parsed.protocol !== "https:")
    || (environment === "production" && parsed.protocol !== "https:")
  ) {
    return fail("WALLET_AUTH_CA_PROVIDER_MATERIAL_REQUIRED", "caRelationProviders[].endpointEnvKey");
  }
};

export const resolveWalletAuthenticationConfig = ({
  env,
  jsonParser = JSON.parse,
  traceId: requestedTraceId,
}: ResolveWalletAuthenticationConfigOptions): WalletAuthenticationConfig => {
  const traceId = safeTraceId(requestedTraceId);
  let environment: WalletAuthenticationEnvironment = "local";

  try {
    environment = parseEnvironment(env.CAMPAIGN_OS_WALLET_AUTH_ENVIRONMENT);
    if (!parseGlobalEnablement(env.CAMPAIGN_OS_WALLET_AUTH_ENABLED)) {
      return createConfig({ environment, status: "disabled" });
    }

    const bindings = parseJsonArray({
      field: "CAMPAIGN_OS_WALLET_AUTH_BINDINGS_JSON",
      maximumBytes: WALLET_AUTH_BINDINGS_JSON_MAX_BYTES,
      maximumEntries: WALLET_AUTH_MAX_BINDINGS,
      parser: jsonParser,
      source: env.CAMPAIGN_OS_WALLET_AUTH_BINDINGS_JSON,
    }).map(parseBinding).sort((left, right) => left.adapterId.localeCompare(right.adapterId));
    if (new Set(bindings.map(({ adapterId }) => adapterId)).size !== bindings.length) {
      return fail("WALLET_AUTH_ADAPTER_ID_CONFLICT", "bindings[].adapterId");
    }

    const providersSource = env.CAMPAIGN_OS_PORTKEY_CA_RELATION_PROVIDERS_JSON ?? "[]";
    const caRelationProviders = parseJsonArray({
      field: "CAMPAIGN_OS_PORTKEY_CA_RELATION_PROVIDERS_JSON",
      maximumBytes: WALLET_AUTH_CA_PROVIDERS_JSON_MAX_BYTES,
      maximumEntries: WALLET_AUTH_MAX_CA_PROVIDERS,
      parser: jsonParser,
      source: providersSource,
    }).map(parseCaProvider).sort((left, right) => left.id.localeCompare(right.id));
    if (new Set(caRelationProviders.map(({ id }) => id)).size !== caRelationProviders.length) {
      return fail("WALLET_AUTH_CA_PROVIDER_ID_CONFLICT", "caRelationProviders[].id");
    }

    const providerById = new Map(caRelationProviders.map((provider) => [provider.id, provider]));
    for (const provider of caRelationProviders) {
      validateProviderMaterial({ env, environment, provider });
    }
    for (const binding of bindings) {
      if (!binding.caRelationProviderId) {
        continue;
      }

      const provider = providerById.get(binding.caRelationProviderId);
      if (!provider) {
        return fail("WALLET_AUTH_CA_PROVIDER_REQUIRED", "bindings[].caRelationProviderId", binding.adapterId);
      }
      if (!provider.enabled && binding.enabled) {
        return fail("WALLET_AUTH_CA_PROVIDER_DISABLED", "bindings[].caRelationProviderId", binding.adapterId);
      }
    }

    const allowedOrigins = parseOrigins(
      env.CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS,
      environment,
    );
    const cookie = parseCookie(env, environment, allowedOrigins);
    const limits = parseLimits(env);
    const csrfValue = env[WALLET_AUTH_CSRF_SECRET_ENV_KEY];
    if (typeof csrfValue !== "string" || utf8ByteLength(csrfValue) < 32) {
      return fail("WALLET_AUTH_CSRF_SECRET_REQUIRED", WALLET_AUTH_CSRF_SECRET_ENV_KEY);
    }
    if (utf8ByteLength(csrfValue) > WALLET_AUTH_CSRF_SECRET_MAX_BYTES) {
      return fail("WALLET_AUTH_CSRF_SECRET_INVALID", WALLET_AUTH_CSRF_SECRET_ENV_KEY);
    }
    const csrfConfigured = true;

    const storeMode: WalletAuthenticationStoreMode =
      env.CAMPAIGN_OS_CAMPAIGN_DB_MODE === "postgres" ? "postgres" : "memory";
    const productionFailures: WalletAuthenticationConfigFailure[] = [];
    if (environment === "production") {
      if (storeMode !== "postgres") {
        productionFailures.push(new WalletAuthenticationConfigFailure(
          "WALLET_AUTH_POSTGRES_REQUIRED",
          "CAMPAIGN_OS_CAMPAIGN_DB_MODE",
        ));
      }
      if (!cookie.secure) {
        productionFailures.push(new WalletAuthenticationConfigFailure(
          "WALLET_AUTH_PRODUCTION_SECURE_COOKIE_REQUIRED",
          "CAMPAIGN_OS_WALLET_AUTH_COOKIE_SECURE",
        ));
      }
      for (const binding of bindings.filter(({ enabled }) => enabled)) {
        if (!binding.productionApproved) {
          productionFailures.push(new WalletAuthenticationConfigFailure(
            "WALLET_AUTH_PRODUCTION_ADAPTER_APPROVAL_REQUIRED",
            "bindings[].productionApproved",
            binding.adapterId,
          ));
        }
        if (binding.caRelationProviderId) {
          const provider = providerById.get(binding.caRelationProviderId);
          if (!provider?.productionApproved) {
            productionFailures.push(new WalletAuthenticationConfigFailure(
              "WALLET_AUTH_PRODUCTION_CA_PROVIDER_APPROVAL_REQUIRED",
              "caRelationProviders[].productionApproved",
              binding.adapterId,
            ));
          }
        }
      }
    }

    if (productionFailures.length > 0) {
      return createConfig({
        diagnostics: productionFailures.map((failure) => diagnostic(failure, traceId)),
        environment,
        status: "invalid",
      });
    }

    return createConfig({
      allowedOrigins,
      bindings,
      caRelationProviders,
      cookie,
      csrfConfigured,
      environment,
      limits,
      productionReady:
        environment === "production"
        && storeMode === "postgres"
        && bindings.some(({ enabled }) => enabled),
      status: "ready",
      storeMode,
    });
  } catch (error) {
    const failure = error instanceof WalletAuthenticationConfigFailure
      ? error
      : new WalletAuthenticationConfigFailure("WALLET_AUTH_JSON_INVALID", "config");

    return createConfig({
      diagnostics: [diagnostic(failure, traceId)],
      environment,
      status: "invalid",
    });
  }
};

export const summarizeWalletAuthenticationConfig = (
  config: WalletAuthenticationConfig,
): WalletAuthenticationConfigSummary => Object.freeze({
  bindingCount: config.bindings.length,
  enabledBindingIds: Object.freeze(
    config.bindings.filter(({ enabled }) => enabled).map(({ adapterId }) => adapterId),
  ),
  environment: config.environment,
  productionReady: config.productionReady,
  status: config.status,
});
