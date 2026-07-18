import {
  createHash,
  randomBytes as nodeRandomBytes,
  timingSafeEqual,
} from "node:crypto";
import { isDate, isUint8Array } from "node:util/types";
import AElf from "aelf-sdk";
import {
  isCanonicalLiveWalletChainId,
  isCanonicalLiveWalletNetwork,
} from "../domain/wallet";
import {
  createWalletAuthenticationDiagnostic,
  type WalletAuthenticationChallengeSnapshot,
  type WalletAuthenticationClock,
  type WalletAuthenticationDiagnostic,
  type WalletAuthenticationRandom,
  type WalletProofChallengeMaterial,
} from "./walletAuthentication";
import {
  WALLET_AUTH_CHALLENGE_TTL_SECONDS_MAX,
  WALLET_AUTH_CHALLENGE_TTL_SECONDS_MIN,
  WALLET_AUTH_CLOCK_SKEW_SECONDS_MAX,
  type WalletVerifierBinding,
} from "./walletAuthenticationConfig";

export const WALLET_AUTHENTICATION_PROTOCOL_VERSION = "campaign-os-wallet-auth/v1" as const;
export const WALLET_AUTHENTICATION_DEFAULT_TTL_SECONDS = 300;
export const WALLET_AUTHENTICATION_RANDOM_BYTES = 32;
export const WALLET_AUTHENTICATION_MESSAGE_MAX_BYTES = 8_192;

type WalletAuthenticationChallengeErrorCode =
  | "WALLET_AUTH_CHALLENGE_INPUT_INVALID"
  | "WALLET_AUTH_CHALLENGE_RANDOM_INVALID"
  | "WALLET_AUTH_CHALLENGE_TIME_INVALID";

export class WalletAuthenticationChallengeError extends Error {
  readonly code: WalletAuthenticationChallengeErrorCode;
  readonly field: string;
  readonly traceId: string;

  constructor(
    code: WalletAuthenticationChallengeErrorCode,
    field: string,
    traceId: string,
  ) {
    super("Wallet authentication challenge input is invalid.");
    this.name = "WalletAuthenticationChallengeError";
    this.code = code;
    this.field = field;
    this.traceId = traceId;
  }
}

export interface CanonicalWalletAuthenticationChallengeSnapshot
  extends WalletAuthenticationChallengeSnapshot {
  readonly audience: string;
  readonly domain: string;
  readonly requestId: string;
  readonly uri: string;
}

export interface WalletAuthenticationChallengeProjection {
  readonly adapterId: string;
  readonly audience: string;
  readonly caHash?: string;
  readonly chainId: WalletVerifierBinding["chainIds"][number];
  readonly domain: string;
  readonly expiresAt: string;
  readonly id: string;
  readonly message: string;
  readonly network: WalletVerifierBinding["network"];
  readonly nonce: string;
  readonly requestedWalletAddress: string;
  readonly uri: string;
  readonly version: typeof WALLET_AUTHENTICATION_PROTOCOL_VERSION;
}

export interface IssuedCanonicalWalletAuthenticationChallenge {
  readonly projection: WalletAuthenticationChallengeProjection;
  readonly snapshot: CanonicalWalletAuthenticationChallengeSnapshot;
}

export interface IssueCanonicalWalletAuthenticationChallengeInput {
  readonly audience: string;
  readonly binding: WalletVerifierBinding;
  readonly caHash?: string;
  readonly chainId: WalletVerifierBinding["chainIds"][number];
  readonly clock?: WalletAuthenticationClock;
  readonly domain: string;
  readonly random?: WalletAuthenticationRandom;
  readonly requestedWalletAddress: string;
  readonly traceId: string;
  readonly ttlSeconds?: number;
  readonly uri: string;
}

export interface VerifyCanonicalWalletAuthenticationChallengeInput {
  readonly clock?: WalletAuthenticationClock;
  readonly clockSkewSeconds: number;
  readonly message: string;
  readonly nonce: string;
  readonly snapshot: CanonicalWalletAuthenticationChallengeSnapshot;
  readonly traceId: string;
}

export type VerifyCanonicalWalletAuthenticationChallengeResult =
  | Readonly<{
    challenge: WalletProofChallengeMaterial;
    requestId: string;
    status: "verified";
  }>
  | Readonly<{
    diagnostic: WalletAuthenticationDiagnostic;
    status: "rejected";
  }>;

const issuedProofChallengeMaterials = new WeakSet<object>();

export const isVerifiedWalletProofChallengeMaterial = (
  value: unknown,
): value is WalletProofChallengeMaterial =>
  value !== null
  && typeof value === "object"
  && issuedProofChallengeMaterials.has(value);

const defaultClock: WalletAuthenticationClock = Object.freeze({
  now: () => new Date(),
});

const defaultRandom: WalletAuthenticationRandom = Object.freeze({
  randomBytes: (size: number) => Uint8Array.from(nodeRandomBytes(size)),
});

const safeTraceId = (value: unknown): string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= 128
  && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
    ? value
    : "wallet-auth-challenge";

const fail = (
  code: WalletAuthenticationChallengeErrorCode,
  field: string,
  traceId: string,
): never => {
  throw new WalletAuthenticationChallengeError(code, field, safeTraceId(traceId));
};

const sha256Hex = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

const utf8 = (value: string): Uint8Array => new TextEncoder().encode(value);

const safeAscii = (
  value: unknown,
  maximum: number,
  pattern: RegExp,
): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= maximum
  && value.normalize("NFC") === value
  && /^[\x20-\x7e]+$/.test(value)
  && pattern.test(value);

const canonicalDomainPattern = /^(?:localhost|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))+)(?::\d{1,5})?$/;
const canonicalAudiencePattern = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;
const canonicalAdapterPattern = /^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)*$/;
const canonicalWalletAddressPattern = /^[1-9A-HJ-NP-Za-km-z]{40,64}$/;
const canonicalCaHashPattern = /^[a-f0-9]{64}$/;
const canonicalIdentityPattern = /^(?:wac|war)_[A-Za-z0-9_-]{43}$/;
const canonicalNoncePattern = /^[A-Za-z0-9_-]{43}$/;

export const isCanonicalAelfWalletAddress = (value: unknown): value is string => {
  if (
    typeof value !== "string"
    || !canonicalWalletAddressPattern.test(value)
  ) {
    return false;
  }

  try {
    const payloadHex = AElf.utils.decodeAddressRep(value);
    return /^[a-f0-9]{64}$/.test(payloadHex)
      && AElf.utils.encodeAddressRep(payloadHex) === value;
  } catch {
    return false;
  }
};

const isLoopbackHostname = (hostname: string): boolean =>
  hostname === "localhost"
  || hostname === "127.0.0.1"
  || hostname === "[::1]";

const assertCanonicalUri = (uri: unknown, domain: string, traceId: string): string => {
  if (typeof uri !== "string" || uri.length === 0 || uri.length > 2_048 || !/^[\x20-\x7e]+$/.test(uri)) {
    return fail("WALLET_AUTH_CHALLENGE_INPUT_INVALID", "uri", traceId);
  }

  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return fail("WALLET_AUTH_CHALLENGE_INPUT_INVALID", "uri", traceId);
  }

  if (
    parsed.href !== uri
    || parsed.host !== domain
    || parsed.username !== ""
    || parsed.password !== ""
    || parsed.hash !== ""
    || (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && isLoopbackHostname(parsed.hostname)))
  ) {
    return fail("WALLET_AUTH_CHALLENGE_INPUT_INVALID", "uri", traceId);
  }

  return uri;
};

const readClock = (clock: WalletAuthenticationClock, traceId: string): Date => {
  let now: Date;
  try {
    now = clock.now();
  } catch {
    return fail("WALLET_AUTH_CHALLENGE_TIME_INVALID", "clock", traceId);
  }

  if (!isDate(now) || !Number.isFinite(now.getTime())) {
    return fail("WALLET_AUTH_CHALLENGE_TIME_INVALID", "clock", traceId);
  }

  return new Date(now.getTime());
};

const readRandom = (
  random: WalletAuthenticationRandom,
  traceId: string,
): Uint8Array => {
  let bytes: Uint8Array;
  try {
    bytes = random.randomBytes(WALLET_AUTHENTICATION_RANDOM_BYTES);
  } catch {
    return fail("WALLET_AUTH_CHALLENGE_RANDOM_INVALID", "random", traceId);
  }

  if (!isUint8Array(bytes) || bytes.byteLength !== WALLET_AUTHENTICATION_RANDOM_BYTES) {
    return fail("WALLET_AUTH_CHALLENGE_RANDOM_INVALID", "random", traceId);
  }

  return Uint8Array.from(bytes);
};

const toBase64Url = (bytes: Uint8Array): string => Buffer.from(bytes).toString("base64url");

const buildMessage = ({
  adapterId,
  audience,
  caHash,
  chainId,
  domain,
  expiresAt,
  issuedAt,
  network,
  nonce,
  requestId,
  requestedWalletAddress,
  uri,
}: {
  readonly adapterId: string;
  readonly audience: string;
  readonly caHash?: string;
  readonly chainId: string;
  readonly domain: string;
  readonly expiresAt: string;
  readonly issuedAt: string;
  readonly network: string;
  readonly nonce: string;
  readonly requestId: string;
  readonly requestedWalletAddress: string;
  readonly uri: string;
}): string => [
  "aelf Campaign OS Wallet Authentication",
  `Version: ${WALLET_AUTHENTICATION_PROTOCOL_VERSION}`,
  `Domain: ${domain}`,
  `URI: ${uri}`,
  `Audience: ${audience}`,
  `Wallet Address: ${requestedWalletAddress}`,
  `Adapter: ${adapterId}`,
  `Chain ID: ${chainId}`,
  `Network: ${network}`,
  `CA Hash: ${caHash ?? "-"}`,
  `Nonce: ${nonce}`,
  `Issued At: ${issuedAt}`,
  `Expires At: ${expiresAt}`,
  `Request ID: ${requestId}`,
].join("\n");

const inputRecord = (value: unknown, traceId: string): Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return fail("WALLET_AUTH_CHALLENGE_INPUT_INVALID", "input", traceId);
  }

  return value as Record<string, unknown>;
};

const ownDataValue = (
  record: Record<string, unknown>,
  field: string,
  traceId: string,
): unknown => {
  const descriptor = Object.getOwnPropertyDescriptor(record, field);
  if (!descriptor?.enumerable || !("value" in descriptor)) {
    return fail("WALLET_AUTH_CHALLENGE_INPUT_INVALID", field, traceId);
  }

  return descriptor.value;
};

const optionalOwnDataValue = (
  record: Record<string, unknown>,
  field: string,
  traceId: string,
): unknown => {
  const descriptor = Object.getOwnPropertyDescriptor(record, field);
  if (!descriptor) {
    return undefined;
  }
  if (!descriptor.enumerable || !("value" in descriptor)) {
    return fail("WALLET_AUTH_CHALLENGE_INPUT_INVALID", field, traceId);
  }

  return descriptor.value;
};

const traceIdFromInput = (value: unknown): string => {
  try {
    if (value === null || typeof value !== "object") {
      return safeTraceId(undefined);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, "traceId");
    return descriptor && "value" in descriptor
      ? safeTraceId(descriptor.value)
      : safeTraceId(undefined);
  } catch {
    return safeTraceId(undefined);
  }
};

const copyDataArray = (
  value: unknown,
  field: string,
  traceId: string,
): readonly unknown[] => {
  if (!Array.isArray(value)) {
    return fail("WALLET_AUTH_CHALLENGE_INPUT_INVALID", field, traceId);
  }
  const length = value.length;
  if (!Number.isInteger(length) || length > 32) {
    return fail("WALLET_AUTH_CHALLENGE_INPUT_INVALID", field, traceId);
  }

  const copy: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      return fail("WALLET_AUTH_CHALLENGE_INPUT_INVALID", field, traceId);
    }
    copy.push(descriptor.value);
  }

  return Object.freeze(copy);
};

const captureBinding = (value: unknown, traceId: string): WalletVerifierBinding => {
  const record = inputRecord(value, traceId);
  const chainIds = copyDataArray(
    ownDataValue(record, "chainIds", traceId),
    "binding.chainIds",
    traceId,
  );
  const caRelationProviderId = optionalOwnDataValue(record, "caRelationProviderId", traceId);

  return Object.freeze({
    accountType: ownDataValue(record, "accountType", traceId),
    adapterId: ownDataValue(record, "adapterId", traceId),
    ...(caRelationProviderId === undefined ? {} : { caRelationProviderId }),
    chainIds,
    enabled: ownDataValue(record, "enabled", traceId),
    hashStrategyId: ownDataValue(record, "hashStrategyId", traceId),
    network: ownDataValue(record, "network", traceId),
    productionApproved: ownDataValue(record, "productionApproved", traceId),
    proofMethod: ownDataValue(record, "proofMethod", traceId),
    signatureEncoding: ownDataValue(record, "signatureEncoding", traceId),
    walletSource: ownDataValue(record, "walletSource", traceId),
  } as WalletVerifierBinding);
};

const captureIssueInput = (
  value: unknown,
  traceId: string,
): IssueCanonicalWalletAuthenticationChallengeInput => {
  const record = inputRecord(value, traceId);
  const caHash = optionalOwnDataValue(record, "caHash", traceId);
  const clock = optionalOwnDataValue(record, "clock", traceId);
  const random = optionalOwnDataValue(record, "random", traceId);
  const ttlSeconds = optionalOwnDataValue(record, "ttlSeconds", traceId);

  return Object.freeze({
    audience: ownDataValue(record, "audience", traceId),
    binding: captureBinding(ownDataValue(record, "binding", traceId), traceId),
    ...(caHash === undefined ? {} : { caHash }),
    chainId: ownDataValue(record, "chainId", traceId),
    ...(clock === undefined ? {} : { clock }),
    domain: ownDataValue(record, "domain", traceId),
    ...(random === undefined ? {} : { random }),
    requestedWalletAddress: ownDataValue(record, "requestedWalletAddress", traceId),
    traceId,
    ...(ttlSeconds === undefined ? {} : { ttlSeconds }),
    uri: ownDataValue(record, "uri", traceId),
  } as IssueCanonicalWalletAuthenticationChallengeInput);
};

const assertBinding = (
  binding: WalletVerifierBinding,
  chainId: IssueCanonicalWalletAuthenticationChallengeInput["chainId"],
  caHash: string | undefined,
  traceId: string,
): void => {
  if (
    binding === null
    || typeof binding !== "object"
    || !binding.enabled
    || !safeAscii(binding.adapterId, 64, canonicalAdapterPattern)
  ) {
    return fail("WALLET_AUTH_CHALLENGE_INPUT_INVALID", "binding", traceId);
  }

  if (!isCanonicalLiveWalletChainId(chainId) || !binding.chainIds.includes(chainId)) {
    return fail("WALLET_AUTH_CHALLENGE_INPUT_INVALID", "chainId", traceId);
  }

  if (!isCanonicalLiveWalletNetwork(binding.network)) {
    return fail("WALLET_AUTH_CHALLENGE_INPUT_INVALID", "binding.network", traceId);
  }

  if (
    (binding.accountType === "EOA" && caHash !== undefined)
    || (binding.accountType === "AA" && !safeAscii(caHash, 64, canonicalCaHashPattern))
    || (binding.accountType !== "EOA" && binding.accountType !== "AA")
  ) {
    return fail("WALLET_AUTH_CHALLENGE_INPUT_INVALID", "caHash", traceId);
  }
};

const issueCapturedWalletAuthenticationChallenge = (
  input: IssueCanonicalWalletAuthenticationChallengeInput,
): IssuedCanonicalWalletAuthenticationChallenge => {
  const traceId = safeTraceId(input.traceId);
  if (!safeAscii(input.domain, 253, canonicalDomainPattern)) {
    return fail("WALLET_AUTH_CHALLENGE_INPUT_INVALID", "domain", traceId);
  }
  if (!safeAscii(input.audience, 256, canonicalAudiencePattern)) {
    return fail("WALLET_AUTH_CHALLENGE_INPUT_INVALID", "audience", traceId);
  }
  if (!isCanonicalAelfWalletAddress(input.requestedWalletAddress)) {
    return fail("WALLET_AUTH_CHALLENGE_INPUT_INVALID", "requestedWalletAddress", traceId);
  }

  const uri = assertCanonicalUri(input.uri, input.domain, traceId);
  assertBinding(input.binding, input.chainId, input.caHash, traceId);

  const ttlSeconds = input.ttlSeconds ?? WALLET_AUTHENTICATION_DEFAULT_TTL_SECONDS;
  if (
    !Number.isInteger(ttlSeconds)
    || ttlSeconds < WALLET_AUTH_CHALLENGE_TTL_SECONDS_MIN
    || ttlSeconds > WALLET_AUTH_CHALLENGE_TTL_SECONDS_MAX
  ) {
    return fail("WALLET_AUTH_CHALLENGE_INPUT_INVALID", "ttlSeconds", traceId);
  }

  const now = readClock(input.clock ?? defaultClock, traceId);
  const issuedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1_000).toISOString();
  const random = input.random ?? defaultRandom;
  const challengeIdBytes = readRandom(random, traceId);
  const requestIdBytes = readRandom(random, traceId);
  const nonceBytes = readRandom(random, traceId);
  if (
    safeBytesEqual(challengeIdBytes, requestIdBytes)
    || safeBytesEqual(challengeIdBytes, nonceBytes)
    || safeBytesEqual(requestIdBytes, nonceBytes)
  ) {
    return fail("WALLET_AUTH_CHALLENGE_RANDOM_INVALID", "random", traceId);
  }
  const id = `wac_${toBase64Url(challengeIdBytes)}`;
  const requestId = `war_${toBase64Url(requestIdBytes)}`;
  const nonce = toBase64Url(nonceBytes);
  const message = buildMessage({
    adapterId: input.binding.adapterId,
    audience: input.audience,
    ...(input.caHash === undefined ? {} : { caHash: input.caHash }),
    chainId: input.chainId,
    domain: input.domain,
    expiresAt,
    issuedAt,
    network: input.binding.network,
    nonce,
    requestId,
    requestedWalletAddress: input.requestedWalletAddress,
    uri,
  });
  const messageBytes = utf8(message);
  if (messageBytes.byteLength > WALLET_AUTHENTICATION_MESSAGE_MAX_BYTES) {
    return fail("WALLET_AUTH_CHALLENGE_INPUT_INVALID", "message", traceId);
  }

  const snapshot: CanonicalWalletAuthenticationChallengeSnapshot = Object.freeze({
    adapterId: input.binding.adapterId,
    audience: input.audience,
    ...(input.caHash === undefined ? {} : { caHash: input.caHash }),
    chainId: input.chainId,
    domain: input.domain,
    expiresAt,
    id,
    issuedAt,
    messageDigest: sha256Hex(messageBytes),
    network: input.binding.network,
    nonceDigest: sha256Hex(utf8(nonce)),
    requestId,
    requestedWalletAddress: input.requestedWalletAddress,
    status: "issued",
    traceId,
    uri,
    verificationAttempts: 0,
    version: WALLET_AUTHENTICATION_PROTOCOL_VERSION,
  });
  const projection: WalletAuthenticationChallengeProjection = Object.freeze({
    adapterId: snapshot.adapterId,
    audience: snapshot.audience,
    ...(snapshot.caHash === undefined ? {} : { caHash: snapshot.caHash }),
    chainId: snapshot.chainId,
    domain: snapshot.domain,
    expiresAt: snapshot.expiresAt,
    id: snapshot.id,
    message,
    network: snapshot.network,
    nonce,
    requestedWalletAddress: snapshot.requestedWalletAddress,
    uri: snapshot.uri,
    version: snapshot.version,
  });

  return Object.freeze({ projection, snapshot });
};

export const issueCanonicalWalletAuthenticationChallenge = (
  input: IssueCanonicalWalletAuthenticationChallengeInput,
): IssuedCanonicalWalletAuthenticationChallenge => {
  const traceId = traceIdFromInput(input);
  try {
    return issueCapturedWalletAuthenticationChallenge(captureIssueInput(input, traceId));
  } catch (error) {
    if (error instanceof WalletAuthenticationChallengeError) {
      throw error;
    }

    return fail("WALLET_AUTH_CHALLENGE_INPUT_INVALID", "input", traceId);
  }
};

const rejected = (
  code: `WALLET_AUTH_${string}`,
  field: string,
  traceId: string,
): VerifyCanonicalWalletAuthenticationChallengeResult => Object.freeze({
  diagnostic: createWalletAuthenticationDiagnostic({ code, field, traceId }),
  status: "rejected",
});

const isCanonicalInstant = (value: unknown): value is string =>
  typeof value === "string"
  && value.length <= 32
  && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString() === value;

const safeDigestEqual = (left: string, right: string): boolean => {
  if (!/^[a-f0-9]{64}$/.test(left) || !/^[a-f0-9]{64}$/.test(right)) {
    return false;
  }

  const leftBytes = Buffer.from(left, "hex");
  const rightBytes = Buffer.from(right, "hex");
  return leftBytes.byteLength === rightBytes.byteLength && timingSafeEqual(leftBytes, rightBytes);
};

const safeBytesEqual = (left: Uint8Array, right: Uint8Array): boolean =>
  left.byteLength === right.byteLength
  && timingSafeEqual(Buffer.from(left), Buffer.from(right));

const canonicalNonce = (value: unknown): value is string => {
  if (typeof value !== "string" || !canonicalNoncePattern.test(value)) {
    return false;
  }

  try {
    const decoded = Buffer.from(value, "base64url");
    return decoded.byteLength === WALLET_AUTHENTICATION_RANDOM_BYTES
      && decoded.toString("base64url") === value;
  } catch {
    return false;
  }
};

const captureSnapshot = (
  value: unknown,
  traceId: string,
): CanonicalWalletAuthenticationChallengeSnapshot => {
  const record = inputRecord(value, traceId);
  const caHash = optionalOwnDataValue(record, "caHash", traceId);

  return Object.freeze({
    adapterId: ownDataValue(record, "adapterId", traceId),
    audience: ownDataValue(record, "audience", traceId),
    ...(caHash === undefined ? {} : { caHash }),
    chainId: ownDataValue(record, "chainId", traceId),
    domain: ownDataValue(record, "domain", traceId),
    expiresAt: ownDataValue(record, "expiresAt", traceId),
    id: ownDataValue(record, "id", traceId),
    issuedAt: ownDataValue(record, "issuedAt", traceId),
    messageDigest: ownDataValue(record, "messageDigest", traceId),
    network: ownDataValue(record, "network", traceId),
    nonceDigest: ownDataValue(record, "nonceDigest", traceId),
    requestId: ownDataValue(record, "requestId", traceId),
    requestedWalletAddress: ownDataValue(record, "requestedWalletAddress", traceId),
    status: ownDataValue(record, "status", traceId),
    traceId: ownDataValue(record, "traceId", traceId),
    uri: ownDataValue(record, "uri", traceId),
    verificationAttempts: ownDataValue(record, "verificationAttempts", traceId),
    version: ownDataValue(record, "version", traceId),
  } as CanonicalWalletAuthenticationChallengeSnapshot);
};

const captureVerifyInput = (
  value: unknown,
  traceId: string,
): VerifyCanonicalWalletAuthenticationChallengeInput => {
  const record = inputRecord(value, traceId);
  const clock = optionalOwnDataValue(record, "clock", traceId);

  return Object.freeze({
    ...(clock === undefined ? {} : { clock }),
    clockSkewSeconds: ownDataValue(record, "clockSkewSeconds", traceId),
    message: ownDataValue(record, "message", traceId),
    nonce: ownDataValue(record, "nonce", traceId),
    snapshot: captureSnapshot(ownDataValue(record, "snapshot", traceId), traceId),
    traceId,
  } as VerifyCanonicalWalletAuthenticationChallengeInput);
};

const validSnapshotShape = (
  snapshot: CanonicalWalletAuthenticationChallengeSnapshot,
): boolean =>
  snapshot !== null
  && typeof snapshot === "object"
  && snapshot.version === WALLET_AUTHENTICATION_PROTOCOL_VERSION
  && snapshot.status === "issued"
  && canonicalIdentityPattern.test(snapshot.id)
  && canonicalIdentityPattern.test(snapshot.requestId)
  && safeAscii(snapshot.domain, 253, canonicalDomainPattern)
  && safeAscii(snapshot.audience, 256, canonicalAudiencePattern)
  && safeAscii(snapshot.adapterId, 64, canonicalAdapterPattern)
  && isCanonicalAelfWalletAddress(snapshot.requestedWalletAddress)
  && isCanonicalLiveWalletChainId(snapshot.chainId)
  && isCanonicalLiveWalletNetwork(snapshot.network)
  && (snapshot.caHash === undefined || safeAscii(snapshot.caHash, 64, canonicalCaHashPattern))
  && isCanonicalInstant(snapshot.issuedAt)
  && isCanonicalInstant(snapshot.expiresAt)
  && Number.isInteger(snapshot.verificationAttempts)
  && snapshot.verificationAttempts >= 0;

const createProofChallengeMaterial = (
  snapshot: CanonicalWalletAuthenticationChallengeSnapshot,
  messageBytes: Uint8Array,
): WalletProofChallengeMaterial => {
  const stableBytes = Uint8Array.from(messageBytes);
  const challenge = {
    adapterId: snapshot.adapterId,
    ...(snapshot.caHash === undefined ? {} : { caHash: snapshot.caHash }),
    chainId: snapshot.chainId,
    network: snapshot.network,
    requestedWalletAddress: snapshot.requestedWalletAddress,
  } as WalletProofChallengeMaterial;
  Object.defineProperty(challenge, "exactMessageBytes", {
    enumerable: true,
    get: () => Uint8Array.from(stableBytes),
  });
  issuedProofChallengeMaterials.add(challenge);

  return Object.freeze(challenge);
};

const verifyCapturedWalletAuthenticationChallenge = (
  input: VerifyCanonicalWalletAuthenticationChallengeInput,
): VerifyCanonicalWalletAuthenticationChallengeResult => {
  const traceId = safeTraceId(input.traceId);
  if (
    !Number.isInteger(input.clockSkewSeconds)
    || input.clockSkewSeconds < 0
    || input.clockSkewSeconds > WALLET_AUTH_CLOCK_SKEW_SECONDS_MAX
  ) {
    return rejected("WALLET_AUTH_CHALLENGE_TIME_INVALID", "clockSkewSeconds", traceId);
  }

  let snapshotValid = false;
  try {
    snapshotValid = validSnapshotShape(input.snapshot);
    if (snapshotValid) {
      assertCanonicalUri(input.snapshot.uri, input.snapshot.domain, traceId);
    }
  } catch {
    snapshotValid = false;
  }
  if (!snapshotValid) {
    return rejected("WALLET_AUTH_CHALLENGE_INPUT_INVALID", "challenge", traceId);
  }

  const issuedAtMs = Date.parse(input.snapshot.issuedAt);
  const expiresAtMs = Date.parse(input.snapshot.expiresAt);
  const ttlMs = expiresAtMs - issuedAtMs;
  if (
    ttlMs < WALLET_AUTH_CHALLENGE_TTL_SECONDS_MIN * 1_000
    || ttlMs > WALLET_AUTH_CHALLENGE_TTL_SECONDS_MAX * 1_000
  ) {
    return rejected("WALLET_AUTH_CHALLENGE_TIME_INVALID", "challenge.time", traceId);
  }

  let now: Date;
  try {
    now = readClock(input.clock ?? defaultClock, traceId);
  } catch {
    return rejected("WALLET_AUTH_CHALLENGE_TIME_INVALID", "clock", traceId);
  }
  const skewMs = input.clockSkewSeconds * 1_000;
  if (issuedAtMs > now.getTime() + skewMs || now.getTime() > expiresAtMs + skewMs) {
    return rejected("WALLET_AUTH_CHALLENGE_TIME_INVALID", "challenge.time", traceId);
  }

  if (!canonicalNonce(input.nonce)) {
    return rejected("WALLET_AUTH_CHALLENGE_NONCE_MISMATCH", "nonce", traceId);
  }
  if (typeof input.message !== "string") {
    return rejected("WALLET_AUTH_CHALLENGE_MESSAGE_MISMATCH", "message", traceId);
  }

  const returnedMessageBytes = utf8(input.message);
  if (
    returnedMessageBytes.byteLength === 0
    || returnedMessageBytes.byteLength > WALLET_AUTHENTICATION_MESSAGE_MAX_BYTES
  ) {
    return rejected("WALLET_AUTH_CHALLENGE_MESSAGE_MISMATCH", "message", traceId);
  }

  const expectedMessage = buildMessage({
    adapterId: input.snapshot.adapterId,
    audience: input.snapshot.audience,
    ...(input.snapshot.caHash === undefined ? {} : { caHash: input.snapshot.caHash }),
    chainId: input.snapshot.chainId,
    domain: input.snapshot.domain,
    expiresAt: input.snapshot.expiresAt,
    issuedAt: input.snapshot.issuedAt,
    network: input.snapshot.network,
    nonce: input.nonce,
    requestId: input.snapshot.requestId,
    requestedWalletAddress: input.snapshot.requestedWalletAddress,
    uri: input.snapshot.uri,
  });
  const expectedMessageBytes = utf8(expectedMessage);
  const nonceDigest = sha256Hex(utf8(input.nonce));
  const expectedMessageDigest = sha256Hex(expectedMessageBytes);
  const returnedMessageDigest = sha256Hex(returnedMessageBytes);

  if (!safeDigestEqual(nonceDigest, input.snapshot.nonceDigest)) {
    return rejected("WALLET_AUTH_CHALLENGE_NONCE_MISMATCH", "nonce", traceId);
  }
  if (
    !safeDigestEqual(expectedMessageDigest, input.snapshot.messageDigest)
    || !safeDigestEqual(returnedMessageDigest, input.snapshot.messageDigest)
    || !safeBytesEqual(expectedMessageBytes, returnedMessageBytes)
  ) {
    return rejected("WALLET_AUTH_CHALLENGE_MESSAGE_MISMATCH", "message", traceId);
  }

  return Object.freeze({
    challenge: createProofChallengeMaterial(input.snapshot, expectedMessageBytes),
    requestId: input.snapshot.requestId,
    status: "verified",
  });
};

export const verifyCanonicalWalletAuthenticationChallenge = (
  input: VerifyCanonicalWalletAuthenticationChallengeInput,
): VerifyCanonicalWalletAuthenticationChallengeResult => {
  const traceId = traceIdFromInput(input);
  try {
    return verifyCapturedWalletAuthenticationChallenge(captureVerifyInput(input, traceId));
  } catch {
    return rejected("WALLET_AUTH_CHALLENGE_INPUT_INVALID", "challenge", traceId);
  }
};
