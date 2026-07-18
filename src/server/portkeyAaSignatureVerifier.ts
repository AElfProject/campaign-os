import { createHash, timingSafeEqual } from "node:crypto";
import { isDate, isUint8Array } from "node:util/types";
import AElf from "aelf-sdk";
import {
  isCanonicalLiveWalletChainId,
  isCanonicalLiveWalletNetwork,
  isCanonicalLiveWalletSource,
} from "../domain/wallet";
import {
  createWalletAuthenticationDiagnostic,
  issueVerifiedWalletSubject,
  type PortkeyCaRelationProvider,
  type PortkeyCaRelationResult,
  type WalletAuthenticationClock,
  type WalletAuthenticationDiagnostic,
  type WalletProofVerificationRequest,
  type WalletProofVerificationResult,
  type WalletProofVerifier,
} from "./walletAuthentication";
import type {
  WalletAuthenticationEnvironment,
  WalletVerifierBinding,
} from "./walletAuthenticationConfig";
import {
  isCanonicalAelfWalletAddress,
  isVerifiedWalletProofChallengeMaterial,
} from "./walletAuthenticationChallenge";
import { resolvePortkeyCaRelationProviderAuthority } from "./portkeyCaRelationProvider";

export const PORTKEY_AA_HASH_STRATEGY_ID = "aelf-web-login-portkey-aa-v1" as const;
export const PORTKEY_AA_MANAGER_SIGNATURE_BYTES = 65;
export const PORTKEY_AA_PUBLIC_KEY_COMPRESSED_BYTES = 33;
export const PORTKEY_AA_PUBLIC_KEY_UNCOMPRESSED_BYTES = 65;

const PORTKEY_AA_MESSAGE_MAX_BYTES = 8_192;
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
const verifiedRelationFields = new Set([
  "caAddress",
  "caHash",
  "chainId",
  "managerAddress",
  "relationDigest",
  "relationRevision",
  "status",
]);

interface AelfPublicPoint {
  encode(encoding: "array", compact: boolean): number[];
}

interface AelfPublicKeyPair {
  getPublic(): AelfPublicPoint;
}

interface AelfEllipticRuntime {
  readonly n: Readonly<{ toString(radix: number): string }>;
  keyFromPublic(value: Uint8Array): AelfPublicKeyPair;
  recoverPubKey(
    digest: Uint8Array,
    signature: Readonly<{ r: string; s: string }>,
    recovery: number,
  ): AelfPublicPoint;
  verify(
    digest: Uint8Array,
    signature: Readonly<{ r: string; s: string }>,
    publicKey: AelfPublicPoint,
  ): boolean;
}

interface AelfWalletRuntime {
  readonly ellipticEc: AelfEllipticRuntime;
  getAddressFromPubKey(publicKey: AelfPublicPoint): string;
}

const aelfWallet = AElf.wallet as unknown as AelfWalletRuntime;
const aelfSha256 = AElf.utils.sha256 as (value: Uint8Array) => string;
const SECP256K1_ORDER = BigInt(`0x${aelfWallet.ellipticEc.n.toString(16)}`);
const SECP256K1_HALF_ORDER = SECP256K1_ORDER / 2n;

export type PortkeyAaSignatureVerifierConfigurationErrorCode =
  | "WALLET_AUTH_AA_BINDING_INVALID"
  | "WALLET_AUTH_AA_HASH_STRATEGY_UNAVAILABLE"
  | "WALLET_AUTH_AA_PROVIDER_INVALID"
  | "WALLET_AUTH_AA_PRODUCTION_APPROVAL_REQUIRED";

export class PortkeyAaSignatureVerifierConfigurationError extends Error {
  readonly code: PortkeyAaSignatureVerifierConfigurationErrorCode;
  readonly field: string;

  constructor(code: PortkeyAaSignatureVerifierConfigurationErrorCode, field: string) {
    super("Portkey AA verifier configuration is invalid.");
    this.name = "PortkeyAaSignatureVerifierConfigurationError";
    this.code = code;
    this.field = field;
    delete this.stack;
  }
}

export interface PortkeyAaRecoveredManagerProof {
  readonly address: string;
  readonly messageDigest: string;
  readonly publicKey: Uint8Array;
}

export interface PortkeyAaCryptoPort {
  recover(input: Readonly<{
    messageBytes: Uint8Array;
    signature: Uint8Array;
  }>): PortkeyAaRecoveredManagerProof;
}

export interface CreatePortkeyAaSignatureVerifierOptions {
  readonly binding: WalletVerifierBinding;
  readonly clock: WalletAuthenticationClock;
  readonly crypto?: PortkeyAaCryptoPort;
  readonly environment: WalletAuthenticationEnvironment;
  readonly relationProvider: PortkeyCaRelationProvider;
}

export interface PortkeyAaSignatureVerifierReadiness {
  readonly environment: WalletAuthenticationEnvironment;
  readonly productionApproved: boolean;
  readonly status: "production_ready" | "stage_only";
}

export interface PortkeyAaSignatureVerifier extends WalletProofVerifier {
  readiness(): PortkeyAaSignatureVerifierReadiness;
}

export type DecodePortkeyAaManagerSignatureResult =
  | Readonly<{ signature: Uint8Array; status: "decoded" }>
  | Readonly<{ diagnostic: WalletAuthenticationDiagnostic; status: "rejected" }>;

interface AdapterProofHints {
  readonly caAddress?: string;
  readonly managerAddress?: string;
}

const ABORTED = Symbol("portkey-aa-verifier-aborted");

const defaultPortkeyAaCrypto: PortkeyAaCryptoPort = Object.freeze({
  recover: ({
    messageBytes,
    signature,
  }: {
    readonly messageBytes: Uint8Array;
    readonly signature: Uint8Array;
  }): PortkeyAaRecoveredManagerProof => {
    const messageDigest = aelfSha256(messageBytes);
    if (!/^[a-f0-9]{64}$/.test(messageDigest)) {
      throw new Error("AElf digest failed.");
    }
    const signatureHex = Buffer.from(signature).toString("hex");
    const signatureObject = {
      r: signatureHex.slice(0, 64),
      s: signatureHex.slice(64, 128),
    };
    const digestBytes = Buffer.from(messageDigest, "hex");
    const recoveredPoint = aelfWallet.ellipticEc.recoverPubKey(
      digestBytes,
      signatureObject,
      signature[64],
    );
    if (!aelfWallet.ellipticEc.verify(digestBytes, signatureObject, recoveredPoint)) {
      throw new Error("AElf manager signature verification failed.");
    }
    return Object.freeze({
      address: aelfWallet.getAddressFromPubKey(recoveredPoint),
      messageDigest,
      publicKey: Uint8Array.from(recoveredPoint.encode("array", false)),
    });
  },
});

export const decodePortkeyAaManagerSignature = (
  encoded: unknown,
  traceId: string,
): DecodePortkeyAaManagerSignatureResult => {
  if (
    typeof encoded !== "string"
    || encoded.length !== PORTKEY_AA_MANAGER_SIGNATURE_BYTES * 2
    || !/^[a-f0-9]+$/.test(encoded)
  ) {
    return decoderRejected(traceId);
  }
  const signature = Uint8Array.from(Buffer.from(encoded, "hex"));
  if (
    signature.byteLength !== PORTKEY_AA_MANAGER_SIGNATURE_BYTES
    || !canonicalRecoveryByte(signature[64])
  ) {
    return decoderRejected(traceId);
  }
  return Object.freeze({ signature, status: "decoded" as const });
};

export const createPortkeyAaSignatureVerifier = ({
  binding,
  clock,
  crypto = defaultPortkeyAaCrypto,
  environment,
  relationProvider,
}: CreatePortkeyAaSignatureVerifierOptions): PortkeyAaSignatureVerifier => {
  const resolvedBinding = captureBinding(binding);
  assertBinding(resolvedBinding);
  if (
    environment !== "local"
    && environment !== "stage"
    && environment !== "production"
  ) {
    return failConfiguration("WALLET_AUTH_AA_BINDING_INVALID", "environment");
  }
  if (environment === "production" && !resolvedBinding.productionApproved) {
    return failConfiguration(
      "WALLET_AUTH_AA_PRODUCTION_APPROVAL_REQUIRED",
      "binding.productionApproved",
    );
  }
  if (
    !isObjectLike(clock)
    || typeof clock.now !== "function"
    || !isObjectLike(crypto)
    || typeof crypto.recover !== "function"
    || !isObjectLike(relationProvider)
    || typeof relationProvider.id !== "string"
    || relationProvider.id !== resolvedBinding.caRelationProviderId
    || typeof relationProvider.verifyRelation !== "function"
  ) {
    return failConfiguration("WALLET_AUTH_AA_PROVIDER_INVALID", "relationProvider");
  }
  if (environment === "production" && !isProductionRelationProviderReady(relationProvider)) {
    return failConfiguration(
      "WALLET_AUTH_AA_PRODUCTION_APPROVAL_REQUIRED",
      "relationProvider.productionAuthority",
    );
  }
  const recover = crypto.recover.bind(crypto);
  const verifyRelation = relationProvider.verifyRelation.bind(relationProvider);

  return Object.freeze({
    id: PORTKEY_AA_HASH_STRATEGY_ID,
    proofMethod: "PORTKEY_AA_MANAGER_CA" as const,
    readiness: (): PortkeyAaSignatureVerifierReadiness => {
      const productionApproved = environment === "production"
        && resolvedBinding.productionApproved
        && isProductionRelationProviderReady(relationProvider);
      return Object.freeze({
        environment,
        productionApproved,
        status: productionApproved ? "production_ready" as const : "stage_only" as const,
      });
    },
    verify: async (
      request: WalletProofVerificationRequest,
      signal?: AbortSignal,
    ): Promise<WalletProofVerificationResult> => {
      let traceId = traceIdFromUnknown(request);
      try {
        if (signal?.aborted) {
          return unavailable("WALLET_AUTH_VERIFIER_UNAVAILABLE", "verifier", traceId);
        }
        if (!resolvedBinding.enabled) {
          return unavailable("WALLET_AUTH_VERIFIER_UNAVAILABLE", "binding", traceId);
        }
        let captured: ReturnType<typeof captureVerificationRequest>;
        try {
          captured = captureVerificationRequest(request, resolvedBinding, traceId);
        } catch (error) {
          return error instanceof InvalidProofError
            ? rejected("WALLET_AUTH_INPUT_INVALID", error.field, traceId)
            : unavailable("WALLET_AUTH_VERIFIER_UNAVAILABLE", "verifier", traceId);
        }
        traceId = captured.traceId;

        const suppliedPublicKey = captured.publicKey
          ? canonicalPublicKey(captured.publicKey)
          : undefined;
        if (captured.publicKey && !suppliedPublicKey) {
          return rejected("WALLET_AUTH_INPUT_INVALID", "publicKey", traceId);
        }

        let recovered: PortkeyAaRecoveredManagerProof;
        try {
          recovered = recover({
            messageBytes: captured.messageBytes,
            signature: captured.signature,
          });
        } catch {
          return unavailable("WALLET_AUTH_VERIFIER_UNAVAILABLE", "verifier", traceId);
        }
        if (!validRecoveredProof(recovered)) {
          return unavailable("WALLET_AUTH_VERIFIER_UNAVAILABLE", "verifier", traceId);
        }
        const recoveredPublicKey = Uint8Array.from(recovered.publicKey);
        if (
          (suppliedPublicKey && !safeBytesEqual(suppliedPublicKey, recoveredPublicKey))
          || (captured.hints.managerAddress !== undefined
            && !safeTextEqual(captured.hints.managerAddress, recovered.address))
          || (captured.hints.caAddress !== undefined
            && !safeTextEqual(captured.hints.caAddress, captured.caAddress))
        ) {
          return rejected("WALLET_AUTH_INPUT_INVALID", "managerProof", traceId);
        }
        if (signal?.aborted) {
          return unavailable("WALLET_AUTH_VERIFIER_UNAVAILABLE", "verifier", traceId);
        }
        if (environment === "production" && !isProductionRelationProviderReady(relationProvider)) {
          return unavailable(
            "WALLET_AUTH_CA_RELATION_UNAVAILABLE",
            "relationProvider",
            traceId,
          );
        }

        let relation: PortkeyCaRelationResult | typeof ABORTED;
        try {
          relation = await raceWithAbort(
            Promise.resolve(verifyRelation({
              caAddressHint: captured.caAddress,
              caHash: captured.caHash,
              chainId: captured.chainId,
              managerAddress: recovered.address,
              traceId,
            }, signal)),
            signal,
          );
        } catch {
          return unavailable(
            "WALLET_AUTH_CA_RELATION_UNAVAILABLE",
            "relationProvider",
            traceId,
          );
        }
        if (relation === ABORTED || signal?.aborted) {
          return unavailable(
            "WALLET_AUTH_CA_RELATION_UNAVAILABLE",
            "relationProvider",
            traceId,
          );
        }
        if (relation.status === "unavailable") {
          return unavailable(
            "WALLET_AUTH_CA_RELATION_UNAVAILABLE",
            "relationProvider",
            traceId,
          );
        }
        if (relation.status === "rejected") {
          return rejected("WALLET_AUTH_CA_RELATION_REJECTED", "relation", traceId);
        }
        if (!validVerifiedRelation(relation)) {
          return rejected("WALLET_AUTH_CA_RELATION_REJECTED", "relation", traceId);
        }
        if (
          !safeTextEqual(relation.caAddress, captured.caAddress)
          || !safeTextEqual(relation.caHash, captured.caHash)
          || relation.chainId !== captured.chainId
          || !safeTextEqual(relation.managerAddress, recovered.address)
        ) {
          return rejected("WALLET_AUTH_CA_RELATION_REJECTED", "relation", traceId);
        }
        if (environment === "production" && !isProductionRelationProviderReady(relationProvider)) {
          return unavailable(
            "WALLET_AUTH_CA_RELATION_UNAVAILABLE",
            "relationProvider",
            traceId,
          );
        }

        const verifiedAt = readVerifiedAt(clock);
        if (!verifiedAt) {
          return unavailable("WALLET_AUTH_VERIFIER_UNAVAILABLE", "clock", traceId);
        }
        if (signal?.aborted) {
          return unavailable("WALLET_AUTH_VERIFIER_UNAVAILABLE", "verifier", traceId);
        }

        const subject = issueVerifiedWalletSubject({
          accountType: "AA",
          adapterId: resolvedBinding.adapterId,
          caHash: captured.caHash,
          chainId: captured.chainId,
          network: resolvedBinding.network,
          proofDigest: digestProofLineage({
            adapterId: resolvedBinding.adapterId,
            caAddress: captured.caAddress,
            caHash: captured.caHash,
            chainId: captured.chainId,
            managerAddress: recovered.address,
            messageDigest: recovered.messageDigest,
            relationDigest: relation.relationDigest,
            relationRevision: relation.relationRevision,
          }),
          proofMethod: "PORTKEY_AA_MANAGER_CA",
          signerAddress: recovered.address,
          verifiedAt,
          walletAddress: captured.caAddress,
          walletSource: "PORTKEY_AA",
        });
        return Object.freeze({ status: "verified" as const, subject });
      } catch {
        return unavailable("WALLET_AUTH_VERIFIER_UNAVAILABLE", "verifier", traceId);
      }
    },
  });
};

function isProductionRelationProviderReady(provider: PortkeyCaRelationProvider): boolean {
  const authority = resolvePortkeyCaRelationProviderAuthority(provider);
  return authority?.accepting === true
    && authority.environment === "production"
    && authority.productionApproved === true;
}

function captureVerificationRequest(
  request: unknown,
  binding: WalletVerifierBinding,
  fallbackTraceId: string,
) {
  if (!isPlainRecord(request)) {
    throw new TypeError("Invalid AA proof request.");
  }
  const challenge = ownDataValue(request, "challenge");
  const publicKey = ownOptionalDataValue(request, "publicKey");
  const signature = ownDataValue(request, "signature");
  const traceId = safeTraceId(ownDataValue(request, "traceId"), fallbackTraceId);
  const adapterProof = ownOptionalDataValue(request, "adapterProof");
  if (
    !isVerifiedWalletProofChallengeMaterial(challenge)
    || challenge.adapterId !== binding.adapterId
    || challenge.network !== binding.network
    || !binding.chainIds.includes(challenge.chainId)
    || typeof challenge.caHash !== "string"
    || !/^[a-f0-9]{64}$/.test(challenge.caHash)
    || !isCanonicalAelfWalletAddress(challenge.requestedWalletAddress)
  ) {
    throw new InvalidProofError("challenge");
  }
  const messageBytes = copyBoundedBytes(challenge.exactMessageBytes, 1, PORTKEY_AA_MESSAGE_MAX_BYTES);
  const signatureBytes = copyBoundedBytes(
    signature,
    PORTKEY_AA_MANAGER_SIGNATURE_BYTES,
    PORTKEY_AA_MANAGER_SIGNATURE_BYTES,
  );
  if (!messageBytes || !signatureBytes || !canonicalSignature(signatureBytes)) {
    throw new InvalidProofError("proof");
  }
  let publicKeyBytes: Uint8Array | undefined;
  if (publicKey !== undefined) {
    publicKeyBytes = copyBoundedBytes(
      publicKey,
      PORTKEY_AA_PUBLIC_KEY_COMPRESSED_BYTES,
      PORTKEY_AA_PUBLIC_KEY_UNCOMPRESSED_BYTES,
    );
    if (
      !publicKeyBytes
      || (publicKeyBytes.byteLength !== PORTKEY_AA_PUBLIC_KEY_COMPRESSED_BYTES
        && publicKeyBytes.byteLength !== PORTKEY_AA_PUBLIC_KEY_UNCOMPRESSED_BYTES)
    ) {
      throw new InvalidProofError("publicKey");
    }
  }
  return Object.freeze({
    caAddress: challenge.requestedWalletAddress,
    caHash: challenge.caHash,
    chainId: challenge.chainId,
    hints: captureAdapterProofHints(adapterProof),
    messageBytes,
    ...(publicKeyBytes === undefined ? {} : { publicKey: publicKeyBytes }),
    signature: signatureBytes,
    traceId,
  });
}

class InvalidProofError extends Error {
  readonly field: string;

  constructor(field: string) {
    super("Invalid AA proof.");
    this.field = field;
    delete this.stack;
  }
}

function captureAdapterProofHints(value: unknown): AdapterProofHints {
  if (value === undefined) {
    return Object.freeze({});
  }
  if (!isPlainRecord(value)) {
    throw new InvalidProofError("adapterProof");
  }
  const keys = Reflect.ownKeys(value);
  if (
    keys.length > 16
    || keys.some((key) =>
      typeof key !== "string"
      || key.length === 0
      || key.length > 64
      || !/^[A-Za-z][A-Za-z0-9_.-]*$/.test(key))
  ) {
    throw new InvalidProofError("adapterProof");
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      throw new InvalidProofError("adapterProof");
    }
  }
  const caAddress = ownOptionalDataValue(value, "caAddress");
  const managerAddress = ownOptionalDataValue(value, "managerAddress");
  if (
    (caAddress !== undefined && !isCanonicalAelfWalletAddress(caAddress))
    || (managerAddress !== undefined && !isCanonicalAelfWalletAddress(managerAddress))
  ) {
    throw new InvalidProofError("adapterProof");
  }
  return Object.freeze({
    ...(caAddress === undefined ? {} : { caAddress }),
    ...(managerAddress === undefined ? {} : { managerAddress }),
  });
}

function captureBinding(value: unknown): WalletVerifierBinding {
  try {
    if (!isPlainRecord(value)) {
      return failConfiguration("WALLET_AUTH_AA_BINDING_INVALID", "binding");
    }
    const keys = Reflect.ownKeys(value);
    if (
      keys.some((key) => typeof key !== "string" || !bindingFields.has(key))
      || !keys.includes("caRelationProviderId")
    ) {
      return failConfiguration("WALLET_AUTH_AA_BINDING_INVALID", "binding");
    }
    const chainIds = ownDataValue(value, "chainIds");
    if (!Array.isArray(chainIds)) {
      return failConfiguration("WALLET_AUTH_AA_BINDING_INVALID", "binding.chainIds");
    }
    return Object.freeze({
      accountType: ownDataValue(value, "accountType"),
      adapterId: ownDataValue(value, "adapterId"),
      caRelationProviderId: ownDataValue(value, "caRelationProviderId"),
      chainIds: Object.freeze([...chainIds]),
      enabled: ownDataValue(value, "enabled"),
      hashStrategyId: ownDataValue(value, "hashStrategyId"),
      network: ownDataValue(value, "network"),
      productionApproved: ownDataValue(value, "productionApproved"),
      proofMethod: ownDataValue(value, "proofMethod"),
      signatureEncoding: ownDataValue(value, "signatureEncoding"),
      walletSource: ownDataValue(value, "walletSource"),
    } as WalletVerifierBinding);
  } catch (error) {
    if (error instanceof PortkeyAaSignatureVerifierConfigurationError) {
      throw error;
    }
    return failConfiguration("WALLET_AUTH_AA_BINDING_INVALID", "binding");
  }
}

function assertBinding(binding: WalletVerifierBinding): void {
  if (
    binding.accountType !== "AA"
    || binding.proofMethod !== "PORTKEY_AA_MANAGER_CA"
    || binding.signatureEncoding !== "AELF_RECOVERABLE_HEX"
    || binding.walletSource !== "PORTKEY_AA"
    || typeof binding.adapterId !== "string"
    || binding.adapterId.length === 0
    || binding.adapterId.length > 64
    || !/^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)*$/.test(binding.adapterId)
    || typeof binding.caRelationProviderId !== "string"
    || binding.caRelationProviderId.length === 0
    || binding.caRelationProviderId.length > 64
    || !/^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)*$/.test(binding.caRelationProviderId)
    || !Array.isArray(binding.chainIds)
    || binding.chainIds.length === 0
    || binding.chainIds.length > 8
    || new Set(binding.chainIds).size !== binding.chainIds.length
    || binding.chainIds.some((chainId) => !isCanonicalLiveWalletChainId(chainId))
    || !isCanonicalLiveWalletNetwork(binding.network)
    || !isCanonicalLiveWalletSource(binding.walletSource)
    || typeof binding.enabled !== "boolean"
    || typeof binding.productionApproved !== "boolean"
  ) {
    return failConfiguration("WALLET_AUTH_AA_BINDING_INVALID", "binding");
  }
  if (binding.hashStrategyId !== PORTKEY_AA_HASH_STRATEGY_ID) {
    return failConfiguration("WALLET_AUTH_AA_HASH_STRATEGY_UNAVAILABLE", "hashStrategyId");
  }
}

function validRecoveredProof(value: unknown): value is PortkeyAaRecoveredManagerProof {
  return isPlainRecord(value)
    && isCanonicalAelfWalletAddress(value.address)
    && typeof value.messageDigest === "string"
    && /^[a-f0-9]{64}$/.test(value.messageDigest)
    && isUint8Array(value.publicKey)
    && value.publicKey.byteLength === PORTKEY_AA_PUBLIC_KEY_UNCOMPRESSED_BYTES;
}

function validVerifiedRelation(
  value: PortkeyCaRelationResult,
): value is Extract<PortkeyCaRelationResult, { status: "verified" }> {
  if (!isPlainRecord(value) || !hasExactFields(value, verifiedRelationFields)) {
    return false;
  }
  return value.status === "verified"
    && isCanonicalAelfWalletAddress(value.caAddress)
    && typeof value.caHash === "string"
    && /^[a-f0-9]{64}$/.test(value.caHash)
    && isCanonicalLiveWalletChainId(value.chainId)
    && isCanonicalAelfWalletAddress(value.managerAddress)
    && typeof value.relationDigest === "string"
    && /^[a-f0-9]{64}$/.test(value.relationDigest)
    && typeof value.relationRevision === "string"
    && value.relationRevision.length > 0
    && value.relationRevision.length <= 160
    && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value.relationRevision);
}

function canonicalPublicKey(value: Uint8Array): Uint8Array | undefined {
  try {
    const key = aelfWallet.ellipticEc.keyFromPublic(Buffer.from(value));
    return Uint8Array.from(key.getPublic().encode("array", false));
  } catch {
    return undefined;
  }
}

function canonicalSignature(signature: Uint8Array): boolean {
  if (
    signature.byteLength !== PORTKEY_AA_MANAGER_SIGNATURE_BYTES
    || !canonicalRecoveryByte(signature[64])
  ) {
    return false;
  }
  const r = parseScalar(signature.subarray(0, 32));
  const s = parseScalar(signature.subarray(32, 64));
  return r > 0n
    && r < SECP256K1_ORDER
    && s > 0n
    && s <= SECP256K1_HALF_ORDER;
}

function canonicalRecoveryByte(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 3;
}

function parseScalar(bytes: Uint8Array): bigint {
  return BigInt(`0x${Buffer.from(bytes).toString("hex")}`);
}

function copyBoundedBytes(
  value: unknown,
  minimum: number,
  maximum: number,
): Uint8Array | undefined {
  if (!isUint8Array(value) || value.byteLength < minimum || value.byteLength > maximum) {
    return undefined;
  }
  try {
    return Uint8Array.from(value);
  } catch {
    return undefined;
  }
}

function digestProofLineage(input: {
  readonly adapterId: string;
  readonly caAddress: string;
  readonly caHash: string;
  readonly chainId: string;
  readonly managerAddress: string;
  readonly messageDigest: string;
  readonly relationDigest: string;
  readonly relationRevision: string;
}): string {
  return createHash("sha256")
    .update("campaign-os-portkey-aa-proof/v1\0", "utf8")
    .update(input.adapterId, "utf8")
    .update("\0", "utf8")
    .update(input.messageDigest, "ascii")
    .update("\0", "utf8")
    .update(input.caHash, "ascii")
    .update("\0", "utf8")
    .update(input.caAddress, "utf8")
    .update("\0", "utf8")
    .update(input.managerAddress, "utf8")
    .update("\0", "utf8")
    .update(input.chainId, "ascii")
    .update("\0", "utf8")
    .update(input.relationDigest, "ascii")
    .update("\0", "utf8")
    .update(input.relationRevision, "utf8")
    .digest("hex");
}

async function raceWithAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal | undefined,
): Promise<T | typeof ABORTED> {
  if (!signal) {
    return promise;
  }
  if (signal.aborted) {
    return ABORTED;
  }
  let remove: () => void = () => {};
  const aborted = new Promise<typeof ABORTED>((resolve) => {
    const onAbort = () => resolve(ABORTED);
    signal.addEventListener("abort", onAbort, { once: true });
    remove = () => signal.removeEventListener("abort", onAbort);
  });
  try {
    return await Promise.race([promise, aborted]);
  } finally {
    remove();
  }
}

function readVerifiedAt(clock: WalletAuthenticationClock): string | undefined {
  try {
    const now = clock.now();
    return isDate(now) && Number.isFinite(now.getTime())
      ? new Date(now.getTime()).toISOString()
      : undefined;
  } catch {
    return undefined;
  }
}

function safeBytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength
    && timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

function safeTextEqual(left: string, right: string): boolean {
  return safeBytesEqual(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function rejected(
  code: `WALLET_AUTH_${string}`,
  field: string,
  traceId: string,
): WalletProofVerificationResult {
  return Object.freeze({
    diagnostic: createWalletAuthenticationDiagnostic({ code, field, traceId }),
    status: "rejected" as const,
  });
}

function unavailable(
  code: `WALLET_AUTH_${string}`,
  field: string,
  traceId: string,
): WalletProofVerificationResult {
  return Object.freeze({
    diagnostic: createWalletAuthenticationDiagnostic({ code, field, traceId }),
    status: "unavailable" as const,
  });
}

function decoderRejected(traceId: string): DecodePortkeyAaManagerSignatureResult {
  return Object.freeze({
    diagnostic: createWalletAuthenticationDiagnostic({
      code: "WALLET_AUTH_INPUT_INVALID",
      field: "signature",
      traceId: safeTraceId(traceId),
    }),
    status: "rejected" as const,
  });
}

function failConfiguration(
  code: PortkeyAaSignatureVerifierConfigurationErrorCode,
  field: string,
): never {
  throw new PortkeyAaSignatureVerifierConfigurationError(code, field);
}

function safeTraceId(value: unknown, fallback = "wallet-auth-portkey-aa"): string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 128
    && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
    ? value
    : fallback;
}

function traceIdFromUnknown(value: unknown): string {
  try {
    return isPlainRecord(value)
      ? safeTraceId(ownOptionalDataValue(value, "traceId"))
      : "wallet-auth-portkey-aa";
  } catch {
    return "wallet-auth-portkey-aa";
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isObjectLike(value: unknown): value is object {
  return value !== null && typeof value === "object";
}

function hasExactFields(record: Record<string, unknown>, fields: ReadonlySet<string>): boolean {
  const keys = Reflect.ownKeys(record);
  return keys.length === fields.size
    && keys.every((key) => typeof key === "string" && fields.has(key));
}

function ownDataValue(record: Record<string, unknown>, field: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, field);
  if (!descriptor?.enumerable || !("value" in descriptor)) {
    throw new TypeError("Expected an own data field.");
  }
  return descriptor.value;
}

function ownOptionalDataValue(record: Record<string, unknown>, field: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, field);
  if (!descriptor) {
    return undefined;
  }
  if (!descriptor.enumerable || !("value" in descriptor)) {
    throw new TypeError("Expected an own data field.");
  }
  return descriptor.value;
}
