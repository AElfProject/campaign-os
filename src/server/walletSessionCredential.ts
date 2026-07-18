import {
  createHash,
  createHmac,
  randomBytes as nodeRandomBytes,
  timingSafeEqual as nodeTimingSafeEqual,
} from "node:crypto";
import { isUint8Array } from "node:util/types";
import type {
  WalletAuthenticationRandom,
  WalletCredentialCrypto,
} from "./walletAuthentication";
import type {
  WalletAuthenticationCredentialMaterial,
  WalletAuthenticationCredentialPort,
} from "./walletAuthenticationRuntime";

export const WALLET_SESSION_CREDENTIAL_BYTES = 32;
export const WALLET_SESSION_DIGEST_BYTES = 32;
export const WALLET_SESSION_CSRF_SECRET_MIN_BYTES = 32;
export const WALLET_SESSION_CSRF_SECRET_MAX_BYTES = 4_096;
export const WALLET_SESSION_CSRF_PROTOCOL_VERSION =
  "campaign-os-wallet-session-csrf/v1" as const;

const DEFAULT_TRACE_ID = "wallet-session-credential";
const BASE64URL_32_BYTES_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const SHA_256_HEX_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_PUBLIC_SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const SAFE_TRACE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

const walletSessionCredentialBrand: unique symbol = Symbol("WalletSessionCredential");
const walletSessionCredentialDigestBrand: unique symbol = Symbol("WalletSessionCredentialDigest");
const walletSessionCsrfSecretBrand: unique symbol = Symbol("WalletSessionCsrfSecret");
const walletSessionCsrfTokenBrand: unique symbol = Symbol("WalletSessionCsrfToken");
const walletSessionCsrfTokenDigestBrand: unique symbol = Symbol("WalletSessionCsrfTokenDigest");

export interface WalletSessionCredential {
  readonly [walletSessionCredentialBrand]: true;
}

export type WalletSessionCredentialDigest = string & {
  readonly [walletSessionCredentialDigestBrand]: true;
};

export interface WalletSessionCsrfSecret {
  readonly [walletSessionCsrfSecretBrand]: true;
}

export interface WalletSessionCsrfToken {
  readonly [walletSessionCsrfTokenBrand]: true;
}

export type WalletSessionCsrfTokenDigest = string & {
  readonly [walletSessionCsrfTokenDigestBrand]: true;
};

export type WalletSessionCredentialErrorCode =
  | "WALLET_AUTH_CREDENTIAL_INPUT_INVALID"
  | "WALLET_AUTH_CREDENTIAL_RANDOM_INVALID"
  | "WALLET_AUTH_CREDENTIAL_CRYPTO_INVALID"
  | "WALLET_AUTH_CSRF_INPUT_INVALID"
  | "WALLET_AUTH_CSRF_SECRET_INVALID"
  | "WALLET_AUTH_CSRF_BINDING_INVALID";

export interface WalletSessionCredentialFailure {
  readonly code: WalletSessionCredentialErrorCode;
  readonly field: string;
  readonly status: "rejected";
  readonly traceId: string;
}

export class WalletSessionCredentialError extends Error {
  readonly code: WalletSessionCredentialErrorCode;
  readonly field: string;
  readonly traceId: string;

  constructor(
    code: WalletSessionCredentialErrorCode,
    field: string,
    traceId: string,
  ) {
    super("Wallet session credential operation failed.");
    this.name = "WalletSessionCredentialError";
    this.code = code;
    this.field = field;
    this.traceId = normalizeTraceId(traceId);
    delete this.stack;
    Object.freeze(this);
  }
}

export interface IssuedWalletSessionCredential {
  readonly credential: WalletSessionCredential;
  readonly credentialDigest: WalletSessionCredentialDigest;
  dispose(): boolean;
  exposeForCookie(traceId?: string): string;
}

export interface WalletSessionCredentialPersistenceProjection {
  readonly credentialDigest: WalletSessionCredentialDigest;
}

export interface WalletSessionCsrfBinding {
  readonly credentialDigest: WalletSessionCredentialDigest;
  readonly publicSessionId: string;
  readonly sessionVersion: number;
}

export interface DerivedWalletSessionCsrf {
  readonly csrfToken: WalletSessionCsrfToken;
  readonly csrfTokenDigest: WalletSessionCsrfTokenDigest;
  dispose(): boolean;
  exposeForHeader(traceId?: string): string;
}

export interface WalletSessionCsrfPersistenceProjection {
  readonly csrfTokenDigest: WalletSessionCsrfTokenDigest;
}

export interface IssueWalletSessionCredentialOptions {
  readonly crypto?: WalletCredentialCrypto;
  readonly random?: WalletAuthenticationRandom;
  readonly traceId?: string;
}

export interface WalletSessionCryptoOptions {
  readonly crypto?: WalletCredentialCrypto;
  readonly traceId?: string;
}

export interface DeriveWalletSessionCsrfInput extends WalletSessionCsrfBinding {
  readonly crypto?: WalletCredentialCrypto;
  readonly csrfSecret: WalletSessionCsrfSecret;
  readonly traceId?: string;
}

export interface VerifyWalletSessionCsrfInput extends DeriveWalletSessionCsrfInput {
  readonly presentedToken: unknown;
}

export interface WalletSessionCredentialService {
  close(): boolean;
  issueCredential(traceId: string): Promise<IssuedWalletSessionCredential>;
  digestCredentialCookie(
    rawCookie: unknown,
    traceId: string,
  ): Promise<WalletSessionCredentialDigest>;
  deriveCsrf(
    binding: WalletSessionCsrfBinding,
    traceId: string,
  ): Promise<DerivedWalletSessionCsrf>;
  verifyCsrf(
    binding: WalletSessionCsrfBinding,
    presentedToken: unknown,
    traceId: string,
  ): Promise<boolean>;
  digestCsrfToken(
    rawToken: unknown,
    traceId: string,
  ): Promise<WalletSessionCsrfTokenDigest>;
  matchesDigest(leftDigest: unknown, rightDigest: unknown, traceId: string): boolean;
}

export interface CreateWalletSessionCredentialServiceInput {
  readonly crypto?: WalletCredentialCrypto;
  readonly csrfSecret: WalletSessionCsrfSecret;
  readonly random?: WalletAuthenticationRandom;
}

const credentialBytes = new WeakMap<object, Uint8Array>();
const csrfSecretBytes = new WeakMap<object, Uint8Array>();
const csrfTokenBytes = new WeakMap<object, Uint8Array>();

export const nodeWalletAuthenticationRandom: WalletAuthenticationRandom = Object.freeze({
  randomBytes: (size: number): Uint8Array => Uint8Array.from(nodeRandomBytes(size)),
});

export const nodeWalletCredentialCrypto: WalletCredentialCrypto = Object.freeze({
  digest: async (input: Uint8Array): Promise<Uint8Array> =>
    Uint8Array.from(createHash("sha256").update(input).digest()),
  hmac: async (key: Uint8Array, input: Uint8Array): Promise<Uint8Array> =>
    Uint8Array.from(createHmac("sha256", key).update(input).digest()),
  timingSafeEqual: (left: Uint8Array, right: Uint8Array): boolean =>
    left.byteLength === right.byteLength
    && nodeTimingSafeEqual(Buffer.from(left), Buffer.from(right)),
});

const normalizeTraceId = (
  value: unknown,
  sensitiveValues: readonly unknown[] = [],
): string => typeof value === "string"
  && value.length > 0
  && value.length <= 128
  && SAFE_TRACE_ID_PATTERN.test(value)
  && !sensitiveValues.some((candidate) => typeof candidate === "string" && candidate === value)
  ? value
  : DEFAULT_TRACE_ID;

const fail = (
  code: WalletSessionCredentialErrorCode,
  field: string,
  traceId: string,
): never => {
  throw new WalletSessionCredentialError(code, field, traceId);
};

const isAllZero = (bytes: Uint8Array): boolean => bytes.every((value) => value === 0);

const decodeCanonicalBase64Url = (
  value: unknown,
  rejectAllZero: boolean,
): Uint8Array | undefined => {
  if (typeof value !== "string" || !BASE64URL_32_BYTES_PATTERN.test(value)) {
    return undefined;
  }

  try {
    const decoded = Buffer.from(value, "base64url");
    if (
      decoded.byteLength !== WALLET_SESSION_CREDENTIAL_BYTES
      || decoded.toString("base64url") !== value
      || (rejectAllZero && isAllZero(decoded))
    ) {
      return undefined;
    }
    return Uint8Array.from(decoded);
  } catch {
    return undefined;
  }
};

const encodeCanonicalBase64Url = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString("base64url");

const createCredentialHandle = (bytes: Uint8Array): WalletSessionCredential => {
  const handle = Object.freeze(Object.create(null)) as WalletSessionCredential;
  credentialBytes.set(handle, Uint8Array.from(bytes));
  return handle;
};

const createCsrfTokenHandle = (bytes: Uint8Array): WalletSessionCsrfToken => {
  const handle = Object.freeze(Object.create(null)) as WalletSessionCsrfToken;
  csrfTokenBytes.set(handle, Uint8Array.from(bytes));
  return handle;
};

const readCredentialBytes = (
  credential: WalletSessionCredential,
  traceId: string,
): Uint8Array => {
  if (typeof credential !== "object" || credential === null) {
    return fail("WALLET_AUTH_CREDENTIAL_INPUT_INVALID", "credential", traceId);
  }
  const bytes = credentialBytes.get(credential);
  if (!bytes) {
    return fail("WALLET_AUTH_CREDENTIAL_INPUT_INVALID", "credential", traceId);
  }
  return Uint8Array.from(bytes);
};

const readCsrfTokenBytes = (
  token: WalletSessionCsrfToken,
  traceId: string,
): Uint8Array => {
  if (typeof token !== "object" || token === null) {
    return fail("WALLET_AUTH_CSRF_INPUT_INVALID", "csrfToken", traceId);
  }
  const bytes = csrfTokenBytes.get(token);
  if (!bytes) {
    return fail("WALLET_AUTH_CSRF_INPUT_INVALID", "csrfToken", traceId);
  }
  return Uint8Array.from(bytes);
};

const requireCsrfSecretBytes = (
  secret: WalletSessionCsrfSecret,
  traceId: string,
): Uint8Array => {
  if (typeof secret !== "object" || secret === null) {
    return fail("WALLET_AUTH_CSRF_SECRET_INVALID", "csrfSecret", traceId);
  }
  const bytes = csrfSecretBytes.get(secret);
  if (!bytes) {
    return fail("WALLET_AUTH_CSRF_SECRET_INVALID", "csrfSecret", traceId);
  }
  return Uint8Array.from(bytes);
};

const requireRandomPort = (
  random: WalletAuthenticationRandom,
  traceId: string,
): WalletAuthenticationRandom => {
  try {
    if (typeof random !== "object" || random === null || typeof random.randomBytes !== "function") {
      return fail("WALLET_AUTH_CREDENTIAL_RANDOM_INVALID", "random", traceId);
    }
  } catch {
    return fail("WALLET_AUTH_CREDENTIAL_RANDOM_INVALID", "random", traceId);
  }
  return random;
};

const requireCryptoPort = (
  crypto: WalletCredentialCrypto,
  traceId: string,
): WalletCredentialCrypto => {
  try {
    if (
      typeof crypto !== "object"
      || crypto === null
      || typeof crypto.digest !== "function"
      || typeof crypto.hmac !== "function"
      || typeof crypto.timingSafeEqual !== "function"
    ) {
      return fail("WALLET_AUTH_CREDENTIAL_CRYPTO_INVALID", "crypto", traceId);
    }
  } catch {
    return fail("WALLET_AUTH_CREDENTIAL_CRYPTO_INVALID", "crypto", traceId);
  }
  return crypto;
};

const generateCredentialBytes = (
  random: WalletAuthenticationRandom,
  traceId: string,
): Uint8Array => {
  let generated: unknown;
  try {
    generated = requireRandomPort(random, traceId)
      .randomBytes(WALLET_SESSION_CREDENTIAL_BYTES);
  } catch (error) {
    if (error instanceof WalletSessionCredentialError) {
      throw error;
    }
    return fail("WALLET_AUTH_CREDENTIAL_RANDOM_INVALID", "random", traceId);
  }

  if (
    !isUint8Array(generated)
    || generated.byteLength !== WALLET_SESSION_CREDENTIAL_BYTES
    || isAllZero(generated)
  ) {
    return fail("WALLET_AUTH_CREDENTIAL_RANDOM_INVALID", "random", traceId);
  }
  return Uint8Array.from(generated);
};

const digestToHex = async (
  input: Uint8Array,
  crypto: WalletCredentialCrypto,
  field: string,
  traceId: string,
): Promise<string> => {
  const inputCopy = Uint8Array.from(input);
  let digest: Uint8Array;
  try {
    const result = await requireCryptoPort(crypto, traceId).digest(inputCopy);
    if (
      !isUint8Array(result)
      || result.byteLength !== WALLET_SESSION_DIGEST_BYTES
      || isAllZero(result)
    ) {
      return fail("WALLET_AUTH_CREDENTIAL_CRYPTO_INVALID", field, traceId);
    }
    digest = Uint8Array.from(result);
  } catch (error) {
    if (error instanceof WalletSessionCredentialError) {
      throw error;
    }
    return fail("WALLET_AUTH_CREDENTIAL_CRYPTO_INVALID", field, traceId);
  } finally {
    inputCopy.fill(0);
  }
  try {
    return Buffer.from(digest).toString("hex");
  } finally {
    digest.fill(0);
  }
};

const digestCredentialHandle = async (
  credential: WalletSessionCredential,
  crypto: WalletCredentialCrypto,
  traceId: string,
): Promise<WalletSessionCredentialDigest> => {
  const bytes = readCredentialBytes(credential, traceId);
  const encodedBytes = Buffer.from(encodeCanonicalBase64Url(bytes), "utf8");
  bytes.fill(0);
  try {
    const digest = await digestToHex(encodedBytes, crypto, "credentialDigest", traceId);
    return digest as WalletSessionCredentialDigest;
  } finally {
    encodedBytes.fill(0);
  }
};

const digestCsrfTokenHandle = async (
  token: WalletSessionCsrfToken,
  crypto: WalletCredentialCrypto,
  traceId: string,
): Promise<WalletSessionCsrfTokenDigest> => {
  const bytes = readCsrfTokenBytes(token, traceId);
  const encodedBytes = Buffer.from(encodeCanonicalBase64Url(bytes), "utf8");
  bytes.fill(0);
  try {
    const digest = await digestToHex(encodedBytes, crypto, "csrfTokenDigest", traceId);
    return digest as WalletSessionCsrfTokenDigest;
  } finally {
    encodedBytes.fill(0);
  }
};

export const issueWalletSessionCredential = async (
  options: IssueWalletSessionCredentialOptions = {},
): Promise<IssuedWalletSessionCredential> => {
  const traceId = normalizeTraceId(options.traceId);
  const random = options.random ?? nodeWalletAuthenticationRandom;
  const crypto = options.crypto ?? nodeWalletCredentialCrypto;
  const generated = generateCredentialBytes(random, traceId);
  const credential = createCredentialHandle(generated);
  generated.fill(0);

  try {
    const credentialDigest = await digestCredentialHandle(credential, crypto, traceId);
    let exposed = false;
    return Object.freeze({
      credential,
      credentialDigest,
      dispose: () => destroyWalletSessionCredential(credential),
      exposeForCookie: (exposureTraceId = traceId) => {
        if (exposed) {
          return fail(
            "WALLET_AUTH_CREDENTIAL_INPUT_INVALID",
            "credential",
            normalizeTraceId(exposureTraceId),
          );
        }
        const rawCredential = revealWalletSessionCredentialForCookie(
          credential,
          exposureTraceId,
        );
        exposed = true;
        destroyWalletSessionCredential(credential);
        return rawCredential;
      },
    });
  } catch (error) {
    destroyWalletSessionCredential(credential);
    throw error;
  }
};

export const restoreWalletSessionCredentialFromCookie = (
  rawCookie: unknown,
  traceId = DEFAULT_TRACE_ID,
): WalletSessionCredential => {
  const safeTraceId = normalizeTraceId(traceId, [rawCookie]);
  const decoded = decodeCanonicalBase64Url(rawCookie, true);
  if (!decoded) {
    return fail("WALLET_AUTH_CREDENTIAL_INPUT_INVALID", "credential", safeTraceId);
  }
  const credential = createCredentialHandle(decoded);
  decoded.fill(0);
  return credential;
};

export const revealWalletSessionCredentialForCookie = (
  credential: WalletSessionCredential,
  traceId = DEFAULT_TRACE_ID,
): string => {
  const bytes = readCredentialBytes(credential, normalizeTraceId(traceId));
  try {
    return encodeCanonicalBase64Url(bytes);
  } finally {
    bytes.fill(0);
  }
};

export const destroyWalletSessionCredential = (
  credential: WalletSessionCredential,
): boolean => {
  if (typeof credential !== "object" || credential === null) {
    return false;
  }
  const bytes = credentialBytes.get(credential);
  if (!bytes) {
    return false;
  }
  bytes.fill(0);
  credentialBytes.delete(credential);
  return true;
};

export const parseWalletSessionCredentialDigest = (
  value: unknown,
  traceId = DEFAULT_TRACE_ID,
): WalletSessionCredentialDigest => {
  const safeTraceId = normalizeTraceId(traceId, [value]);
  if (typeof value !== "string" || !SHA_256_HEX_PATTERN.test(value)) {
    return fail("WALLET_AUTH_CREDENTIAL_INPUT_INVALID", "credentialDigest", safeTraceId);
  }
  return value as WalletSessionCredentialDigest;
};

export const digestWalletSessionCredentialCookie = async (
  rawCookie: unknown,
  options: WalletSessionCryptoOptions = {},
): Promise<WalletSessionCredentialDigest> => {
  const traceId = normalizeTraceId(options.traceId, [rawCookie]);
  const credential = restoreWalletSessionCredentialFromCookie(rawCookie, traceId);
  try {
    return await digestCredentialHandle(
      credential,
      options.crypto ?? nodeWalletCredentialCrypto,
      traceId,
    );
  } finally {
    destroyWalletSessionCredential(credential);
  }
};

export const projectWalletSessionCredentialForPersistence = (
  issued: IssuedWalletSessionCredential,
  traceId = DEFAULT_TRACE_ID,
): WalletSessionCredentialPersistenceProjection => {
  const safeTraceId = normalizeTraceId(traceId);
  readCredentialBytes(issued?.credential, safeTraceId).fill(0);
  const credentialDigest = parseWalletSessionCredentialDigest(
    issued?.credentialDigest,
    safeTraceId,
  );
  return Object.freeze({ credentialDigest });
};

export const createWalletSessionCsrfSecret = (
  input: unknown,
  traceId = DEFAULT_TRACE_ID,
): WalletSessionCsrfSecret => {
  const safeTraceId = normalizeTraceId(traceId, [input]);
  if (
    !isUint8Array(input)
    || input.byteLength < WALLET_SESSION_CSRF_SECRET_MIN_BYTES
    || input.byteLength > WALLET_SESSION_CSRF_SECRET_MAX_BYTES
    || isAllZero(input)
  ) {
    return fail("WALLET_AUTH_CSRF_SECRET_INVALID", "csrfSecret", safeTraceId);
  }

  const secret = Object.freeze(Object.create(null)) as WalletSessionCsrfSecret;
  csrfSecretBytes.set(secret, Uint8Array.from(input));
  return secret;
};

export const destroyWalletSessionCsrfSecret = (
  secret: WalletSessionCsrfSecret,
): boolean => {
  if (typeof secret !== "object" || secret === null) {
    return false;
  }
  const bytes = csrfSecretBytes.get(secret);
  if (!bytes) {
    return false;
  }
  bytes.fill(0);
  csrfSecretBytes.delete(secret);
  return true;
};

const decodeHexDigest = (value: unknown): Uint8Array | undefined => {
  if (typeof value !== "string" || !SHA_256_HEX_PATTERN.test(value)) {
    return undefined;
  }
  return Uint8Array.from(Buffer.from(value, "hex"));
};

const encodeUint32 = (value: number): Uint8Array => {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
};

const encodeUint64 = (value: number): Uint8Array => {
  const bytes = new Uint8Array(8);
  let remaining = BigInt(value);
  for (let index = bytes.length - 1; index >= 0; index -= 1) {
    bytes[index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return bytes;
};

const concatenateBytes = (parts: readonly Uint8Array[]): Uint8Array => {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
};

const canonicalCsrfBindingBytes = (
  binding: WalletSessionCsrfBinding,
  traceId: string,
): Uint8Array => {
  if (
    typeof binding?.publicSessionId !== "string"
    || binding.publicSessionId.length === 0
    || binding.publicSessionId.length > 160
    || !SAFE_PUBLIC_SESSION_ID_PATTERN.test(binding.publicSessionId)
    || !Number.isSafeInteger(binding.sessionVersion)
    || binding.sessionVersion < 1
  ) {
    return fail("WALLET_AUTH_CSRF_BINDING_INVALID", "csrfBinding", traceId);
  }
  const credentialDigest = decodeHexDigest(binding.credentialDigest);
  if (!credentialDigest) {
    return fail("WALLET_AUTH_CSRF_BINDING_INVALID", "credentialDigest", traceId);
  }

  const encoder = new TextEncoder();
  const protocol = encoder.encode(WALLET_SESSION_CSRF_PROTOCOL_VERSION);
  const sessionId = encoder.encode(binding.publicSessionId);
  return concatenateBytes([
    encodeUint32(protocol.byteLength),
    protocol,
    encodeUint32(sessionId.byteLength),
    sessionId,
    credentialDigest,
    encodeUint64(binding.sessionVersion),
  ]);
};

export const deriveWalletSessionCsrf = async (
  input: DeriveWalletSessionCsrfInput,
): Promise<DerivedWalletSessionCsrf> => {
  const traceId = normalizeTraceId(input?.traceId);
  const key = requireCsrfSecretBytes(input?.csrfSecret, traceId);
  const bindingBytes = canonicalCsrfBindingBytes(input, traceId);
  const crypto = input.crypto ?? nodeWalletCredentialCrypto;
  let hmac: Uint8Array;
  try {
    const result = await requireCryptoPort(crypto, traceId).hmac(key, bindingBytes);
    if (
      !isUint8Array(result)
      || result.byteLength !== WALLET_SESSION_DIGEST_BYTES
      || isAllZero(result)
    ) {
      return fail("WALLET_AUTH_CREDENTIAL_CRYPTO_INVALID", "csrfToken", traceId);
    }
    hmac = Uint8Array.from(result);
  } catch (error) {
    if (error instanceof WalletSessionCredentialError) {
      throw error;
    }
    return fail("WALLET_AUTH_CREDENTIAL_CRYPTO_INVALID", "csrfToken", traceId);
  } finally {
    key.fill(0);
    bindingBytes.fill(0);
  }
  const csrfToken = createCsrfTokenHandle(hmac);
  hmac.fill(0);
  try {
    const csrfTokenDigest = await digestCsrfTokenHandle(csrfToken, crypto, traceId);
    let exposed = false;
    return Object.freeze({
      csrfToken,
      csrfTokenDigest,
      dispose: () => destroyWalletSessionCsrfToken(csrfToken),
      exposeForHeader: (exposureTraceId = traceId) => {
        if (exposed) {
          return fail(
            "WALLET_AUTH_CSRF_INPUT_INVALID",
            "csrfToken",
            normalizeTraceId(exposureTraceId),
          );
        }
        const rawToken = revealWalletSessionCsrfTokenForHeader(csrfToken, exposureTraceId);
        exposed = true;
        destroyWalletSessionCsrfToken(csrfToken);
        return rawToken;
      },
    });
  } catch (error) {
    destroyWalletSessionCsrfToken(csrfToken);
    throw error;
  }
};

export const revealWalletSessionCsrfTokenForHeader = (
  token: WalletSessionCsrfToken,
  traceId = DEFAULT_TRACE_ID,
): string => {
  const bytes = readCsrfTokenBytes(token, normalizeTraceId(traceId));
  try {
    return encodeCanonicalBase64Url(bytes);
  } finally {
    bytes.fill(0);
  }
};

export const destroyWalletSessionCsrfToken = (
  token: WalletSessionCsrfToken,
): boolean => {
  if (typeof token !== "object" || token === null) {
    return false;
  }
  const bytes = csrfTokenBytes.get(token);
  if (!bytes) {
    return false;
  }
  bytes.fill(0);
  csrfTokenBytes.delete(token);
  return true;
};

export const parseWalletSessionCsrfTokenDigest = (
  value: unknown,
  traceId = DEFAULT_TRACE_ID,
): WalletSessionCsrfTokenDigest => {
  const safeTraceId = normalizeTraceId(traceId, [value]);
  if (typeof value !== "string" || !SHA_256_HEX_PATTERN.test(value)) {
    return fail("WALLET_AUTH_CSRF_INPUT_INVALID", "csrfTokenDigest", safeTraceId);
  }
  return value as WalletSessionCsrfTokenDigest;
};

export const digestWalletSessionCsrfToken = async (
  rawToken: unknown,
  options: WalletSessionCryptoOptions = {},
): Promise<WalletSessionCsrfTokenDigest> => {
  const traceId = normalizeTraceId(options.traceId, [rawToken]);
  const decoded = decodeCanonicalBase64Url(rawToken, false);
  if (!decoded) {
    return fail("WALLET_AUTH_CSRF_INPUT_INVALID", "csrfToken", traceId);
  }
  const token = createCsrfTokenHandle(decoded);
  decoded.fill(0);
  try {
    return await digestCsrfTokenHandle(
      token,
      options.crypto ?? nodeWalletCredentialCrypto,
      traceId,
    );
  } finally {
    destroyWalletSessionCsrfToken(token);
  }
};

export const projectWalletSessionCsrfForPersistence = (
  derived: DerivedWalletSessionCsrf,
  traceId = DEFAULT_TRACE_ID,
): WalletSessionCsrfPersistenceProjection => {
  const safeTraceId = normalizeTraceId(traceId);
  readCsrfTokenBytes(derived?.csrfToken, safeTraceId).fill(0);
  const csrfTokenDigest = parseWalletSessionCsrfTokenDigest(
    derived?.csrfTokenDigest,
    safeTraceId,
  );
  return Object.freeze({ csrfTokenDigest });
};

const timingSafeBytesEqual = (
  left: Uint8Array,
  right: Uint8Array,
  crypto: WalletCredentialCrypto,
  traceId: string,
): boolean => {
  if (left.byteLength !== right.byteLength) {
    return false;
  }
  try {
    const result = requireCryptoPort(crypto, traceId).timingSafeEqual(left, right);
    if (typeof result !== "boolean") {
      return fail("WALLET_AUTH_CREDENTIAL_CRYPTO_INVALID", "timingSafeEqual", traceId);
    }
    return result;
  } catch (error) {
    if (error instanceof WalletSessionCredentialError) {
      throw error;
    }
    return fail("WALLET_AUTH_CREDENTIAL_CRYPTO_INVALID", "timingSafeEqual", traceId);
  }
};

export const verifyWalletSessionCsrfToken = (
  expectedToken: WalletSessionCsrfToken,
  presentedToken: unknown,
  options: WalletSessionCryptoOptions = {},
): boolean => {
  const traceId = normalizeTraceId(options.traceId, [presentedToken]);
  const expected = readCsrfTokenBytes(expectedToken, traceId);
  const presented = decodeCanonicalBase64Url(presentedToken, false);
  if (!presented || expected.byteLength !== presented.byteLength) {
    expected.fill(0);
    presented?.fill(0);
    return false;
  }
  try {
    return timingSafeBytesEqual(
      expected,
      presented,
      options.crypto ?? nodeWalletCredentialCrypto,
      traceId,
    );
  } finally {
    expected.fill(0);
    presented.fill(0);
  }
};

export const areWalletSessionDigestsEqual = (
  leftDigest: unknown,
  rightDigest: unknown,
  options: WalletSessionCryptoOptions = {},
): boolean => {
  const traceId = normalizeTraceId(options.traceId, [leftDigest, rightDigest]);
  const left = decodeHexDigest(leftDigest);
  const right = decodeHexDigest(rightDigest);
  if (!left || !right || left.byteLength !== right.byteLength) {
    left?.fill(0);
    right?.fill(0);
    return false;
  }
  try {
    return timingSafeBytesEqual(
      left,
      right,
      options.crypto ?? nodeWalletCredentialCrypto,
      traceId,
    );
  } finally {
    left.fill(0);
    right.fill(0);
  }
};

export const verifyWalletSessionCsrf = async (
  input: VerifyWalletSessionCsrfInput,
): Promise<boolean> => {
  const derived = await deriveWalletSessionCsrf(input);
  try {
    return verifyWalletSessionCsrfToken(derived.csrfToken, input.presentedToken, {
      ...(input.crypto === undefined ? {} : { crypto: input.crypto }),
      traceId: input.traceId,
    });
  } finally {
    destroyWalletSessionCsrfToken(derived.csrfToken);
  }
};

export const projectWalletSessionCredentialFailure = (
  error: unknown,
  traceId = DEFAULT_TRACE_ID,
): WalletSessionCredentialFailure => {
  const source = error instanceof WalletSessionCredentialError
    ? error
    : new WalletSessionCredentialError(
      "WALLET_AUTH_CREDENTIAL_CRYPTO_INVALID",
      "operation",
      normalizeTraceId(traceId),
    );
  return Object.freeze({
    code: source.code,
    field: source.field,
    status: "rejected" as const,
    traceId: source.traceId,
  });
};

export const createWalletSessionCredentialService = (
  input: CreateWalletSessionCredentialServiceInput,
): WalletSessionCredentialService => {
  const traceId = DEFAULT_TRACE_ID;
  const random = requireRandomPort(input?.random ?? nodeWalletAuthenticationRandom, traceId);
  const crypto = requireCryptoPort(input?.crypto ?? nodeWalletCredentialCrypto, traceId);
  const csrfSecret = input?.csrfSecret;
  requireCsrfSecretBytes(csrfSecret, traceId).fill(0);
  let closed = false;

  const requireOpen = (operationTraceId: string): void => {
    if (closed) {
      fail(
        "WALLET_AUTH_CSRF_SECRET_INVALID",
        "credentialService",
        normalizeTraceId(operationTraceId),
      );
    }
  };

  return Object.freeze({
    close: () => {
      if (closed) {
        return false;
      }
      closed = true;
      destroyWalletSessionCsrfSecret(csrfSecret);
      return true;
    },
    issueCredential: (operationTraceId: string) => {
      requireOpen(operationTraceId);
      return issueWalletSessionCredential({
        crypto,
        random,
        traceId: operationTraceId,
      });
    },
    digestCredentialCookie: (rawCookie: unknown, operationTraceId: string) => {
      requireOpen(operationTraceId);
      return digestWalletSessionCredentialCookie(rawCookie, {
        crypto,
        traceId: operationTraceId,
      });
    },
    deriveCsrf: (binding: WalletSessionCsrfBinding, operationTraceId: string) => {
      requireOpen(operationTraceId);
      return deriveWalletSessionCsrf({
        ...binding,
        crypto,
        csrfSecret,
        traceId: operationTraceId,
      });
    },
    verifyCsrf: (
      binding: WalletSessionCsrfBinding,
      presentedToken: unknown,
      operationTraceId: string,
    ) => {
      requireOpen(operationTraceId);
      return verifyWalletSessionCsrf({
        ...binding,
        crypto,
        csrfSecret,
        presentedToken,
        traceId: operationTraceId,
      });
    },
    digestCsrfToken: (rawToken: unknown, operationTraceId: string) => {
      requireOpen(operationTraceId);
      return digestWalletSessionCsrfToken(rawToken, {
        crypto,
        traceId: operationTraceId,
      });
    },
    matchesDigest: (leftDigest: unknown, rightDigest: unknown, operationTraceId: string) => {
      requireOpen(operationTraceId);
      return areWalletSessionDigestsEqual(leftDigest, rightDigest, {
        crypto,
        traceId: operationTraceId,
      });
    },
  });
};

export const createWalletSessionRuntimeCredentialPort = (
  service: WalletSessionCredentialService,
): WalletAuthenticationCredentialPort => {
  if (
    service === null
    || typeof service !== "object"
    || typeof service.close !== "function"
    || typeof service.issueCredential !== "function"
    || typeof service.digestCredentialCookie !== "function"
    || typeof service.deriveCsrf !== "function"
    || typeof service.verifyCsrf !== "function"
    || typeof service.matchesDigest !== "function"
  ) {
    fail("WALLET_AUTH_CREDENTIAL_INPUT_INVALID", "credentialService", DEFAULT_TRACE_ID);
  }

  let closed = false;
  const requirePortOpen = (traceId: string): void => {
    if (closed) {
      fail("WALLET_AUTH_CREDENTIAL_INPUT_INVALID", "credentialPort", traceId);
    }
  };

  const port: WalletAuthenticationCredentialPort = {
    close: () => {
      if (closed) {
        return;
      }
      closed = true;
      service.close();
    },
    deriveCsrf: async ({ credentialDigest, sessionId, traceId, version }) => {
      requirePortOpen(traceId);
      const derived = await service.deriveCsrf({
        credentialDigest: parseWalletSessionCredentialDigest(credentialDigest, traceId),
        publicSessionId: sessionId,
        sessionVersion: version,
      }, traceId);
      try {
        return Object.freeze({
          csrfToken: derived.exposeForHeader(traceId),
          csrfTokenDigest: derived.csrfTokenDigest,
        });
      } finally {
        derived.dispose();
      }
    },
    digestCredential: (credential, traceId) => {
      requirePortOpen(traceId);
      return service.digestCredentialCookie(credential, traceId);
    },
    issueSessionSecrets: async ({ sessionId, traceId, version }) => {
      requirePortOpen(traceId);
      const credential = await service.issueCredential(traceId);
      let csrf: DerivedWalletSessionCsrf | undefined;
      try {
        csrf = await service.deriveCsrf({
          credentialDigest: credential.credentialDigest,
          publicSessionId: sessionId,
          sessionVersion: version,
        }, traceId);
      } catch (error) {
        credential.dispose();
        throw error;
      }

      let available = true;
      const material: WalletAuthenticationCredentialMaterial = Object.freeze({
        credentialDigest: credential.credentialDigest,
        csrfTokenDigest: csrf.csrfTokenDigest,
        dispose: () => {
          if (!available) {
            return;
          }
          available = false;
          credential.dispose();
          csrf?.dispose();
        },
        expose: () => {
          if (!available) {
            fail("WALLET_AUTH_CREDENTIAL_INPUT_INVALID", "credentialMaterial", traceId);
          }
          try {
            const csrfToken = csrf.exposeForHeader(traceId);
            const rawCredential = credential.exposeForCookie(traceId);
            available = false;
            return Object.freeze({ credential: rawCredential, csrfToken });
          } catch (error) {
            available = false;
            credential.dispose();
            csrf?.dispose();
            throw error;
          }
        },
      });
      return material;
    },
    kind: "session_credential",
    matchesDigest: (left, right, traceId) => {
      requirePortOpen(traceId);
      return service.matchesDigest(left, right, traceId);
    },
    verifyCsrf: ({ credentialDigest, presentedToken, sessionId, traceId, version }) => {
      requirePortOpen(traceId);
      return service.verifyCsrf({
        credentialDigest: parseWalletSessionCredentialDigest(credentialDigest, traceId),
        publicSessionId: sessionId,
        sessionVersion: version,
      }, presentedToken, traceId);
    },
  };
  return Object.freeze(port);
};
