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
  type WalletAuthenticationClock,
  type WalletAuthenticationDiagnostic,
  type WalletProofVerificationRequest,
  type WalletProofVerificationResult,
  type WalletProofVerifier,
} from "./walletAuthentication";
import type { WalletVerifierBinding } from "./walletAuthenticationConfig";
import {
  isCanonicalAelfWalletAddress,
  isVerifiedWalletProofChallengeMaterial,
} from "./walletAuthenticationChallenge";

export const AELF_EOA_HASH_STRATEGY_ID = "aelf-web-login-discover-v1" as const;
export const AELF_RECOVERABLE_SIGNATURE_BYTES = 65;
export const AELF_PUBLIC_KEY_COMPRESSED_BYTES = 33;
export const AELF_PUBLIC_KEY_UNCOMPRESSED_BYTES = 65;

const AELF_EOA_MESSAGE_MAX_BYTES = 8_192;

interface AelfPublicPoint {
  encode(encoding: "array", compact: false): number[];
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

export type AelfEoaSignatureVerifierConfigurationErrorCode =
  | "WALLET_AUTH_EOA_BINDING_INVALID"
  | "WALLET_AUTH_EOA_HASH_STRATEGY_UNAVAILABLE";

export class AelfEoaSignatureVerifierConfigurationError extends Error {
  readonly code: AelfEoaSignatureVerifierConfigurationErrorCode;
  readonly field: string;

  constructor(code: AelfEoaSignatureVerifierConfigurationErrorCode, field: string) {
    super("AElf EOA verifier configuration is invalid.");
    this.name = "AelfEoaSignatureVerifierConfigurationError";
    this.code = code;
    this.field = field;
  }
}

export interface AelfEoaRecoveredProof {
  readonly address: string;
  readonly messageDigest: string;
  readonly publicKey: Uint8Array;
}

export interface AelfEoaCryptoPort {
  recover(input: Readonly<{
    messageBytes: Uint8Array;
    signature: Uint8Array;
  }>): AelfEoaRecoveredProof;
}

export interface CreateAelfEoaSignatureVerifierOptions {
  readonly binding: WalletVerifierBinding;
  readonly clock: WalletAuthenticationClock;
  readonly crypto?: AelfEoaCryptoPort;
}

export type DecodeAelfRecoverableSignatureResult =
  | Readonly<{ signature: Uint8Array; status: "decoded" }>
  | Readonly<{ diagnostic: WalletAuthenticationDiagnostic; status: "rejected" }>;

const safeTraceId = (value: unknown): string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= 128
  && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
    ? value
    : "wallet-auth-eoa";

const resultWithDiagnostic = (
  status: "rejected" | "unavailable",
  code: `WALLET_AUTH_${string}`,
  field: string,
  traceId: string,
): WalletProofVerificationResult => Object.freeze({
  diagnostic: createWalletAuthenticationDiagnostic({
    code,
    field,
    traceId: safeTraceId(traceId),
  }),
  status,
});

const reject = (field: string, traceId: string): WalletProofVerificationResult =>
  resultWithDiagnostic("rejected", "WALLET_AUTH_INPUT_INVALID", field, traceId);

const unavailable = (field: string, traceId: string): WalletProofVerificationResult =>
  resultWithDiagnostic("unavailable", "WALLET_AUTH_VERIFIER_UNAVAILABLE", field, traceId);

const decoderReject = (
  field: string,
  traceId: string,
): DecodeAelfRecoverableSignatureResult => Object.freeze({
  diagnostic: createWalletAuthenticationDiagnostic({
    code: "WALLET_AUTH_INPUT_INVALID",
    field,
    traceId: safeTraceId(traceId),
  }),
  status: "rejected",
});

const canonicalRecoveryByte = (value: number): boolean =>
  Number.isInteger(value) && value >= 0 && value <= 3;

export const decodeAelfRecoverableSignature = (
  encoded: unknown,
  traceId: string,
): DecodeAelfRecoverableSignatureResult => {
  if (
    typeof encoded !== "string"
    || encoded.length !== AELF_RECOVERABLE_SIGNATURE_BYTES * 2
    || !/^[a-f0-9]+$/.test(encoded)
  ) {
    return decoderReject("signature", traceId);
  }

  const signature = Uint8Array.from(Buffer.from(encoded, "hex"));
  if (
    signature.byteLength !== AELF_RECOVERABLE_SIGNATURE_BYTES
    || !canonicalRecoveryByte(signature[64])
  ) {
    return decoderReject("signature", traceId);
  }

  return Object.freeze({ signature, status: "decoded" });
};

const parseScalar = (bytes: Uint8Array): bigint =>
  BigInt(`0x${Buffer.from(bytes).toString("hex")}`);

const canonicalSignature = (signature: Uint8Array): boolean => {
  if (
    signature.byteLength !== AELF_RECOVERABLE_SIGNATURE_BYTES
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
};

const copyBoundedBytes = (
  value: unknown,
  minimum: number,
  maximum: number,
): Uint8Array | undefined => {
  if (!isUint8Array(value) || value.byteLength < minimum || value.byteLength > maximum) {
    return undefined;
  }

  try {
    return Uint8Array.from(value);
  } catch {
    return undefined;
  }
};

const safeBytesEqual = (left: Uint8Array, right: Uint8Array): boolean =>
  left.byteLength === right.byteLength
  && timingSafeEqual(Buffer.from(left), Buffer.from(right));

const safeTextEqual = (left: string, right: string): boolean => {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  return safeBytesEqual(leftBytes, rightBytes);
};

const emptyAdapterProof = (value: WalletProofVerificationRequest["adapterProof"]): boolean => {
  if (value === undefined) {
    return true;
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  try {
    return Reflect.ownKeys(value).length === 0
      && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  } catch {
    return false;
  }
};

const defaultAelfEoaCrypto: AelfEoaCryptoPort = Object.freeze({
  recover: ({
    messageBytes,
    signature,
  }: {
    readonly messageBytes: Uint8Array;
    readonly signature: Uint8Array;
  }) => {
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
      throw new Error("AElf signature verification failed.");
    }

    return Object.freeze({
      address: aelfWallet.getAddressFromPubKey(recoveredPoint),
      messageDigest,
      publicKey: Uint8Array.from(recoveredPoint.encode("array", false)),
    });
  },
});

const failConfiguration = (
  code: AelfEoaSignatureVerifierConfigurationErrorCode,
  field: string,
): never => {
  throw new AelfEoaSignatureVerifierConfigurationError(code, field);
};

const assertBinding = (binding: WalletVerifierBinding): void => {
  if (
    binding === null
    || typeof binding !== "object"
    || binding.accountType !== "EOA"
    || binding.proofMethod !== "AELF_EOA_RECOVERABLE"
    || binding.signatureEncoding !== "AELF_RECOVERABLE_HEX"
    || typeof binding.adapterId !== "string"
    || binding.adapterId.length === 0
    || binding.adapterId.length > 64
    || !/^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)*$/.test(binding.adapterId)
    || !Array.isArray(binding.chainIds)
    || binding.chainIds.length === 0
    || binding.chainIds.length > 8
    || new Set(binding.chainIds).size !== binding.chainIds.length
    || binding.chainIds.some((chainId) => !isCanonicalLiveWalletChainId(chainId))
    || !isCanonicalLiveWalletNetwork(binding.network)
    || !isCanonicalLiveWalletSource(binding.walletSource)
    || binding.walletSource === "PORTKEY_AA"
    || binding.caRelationProviderId !== undefined
    || typeof binding.enabled !== "boolean"
    || typeof binding.productionApproved !== "boolean"
  ) {
    return failConfiguration("WALLET_AUTH_EOA_BINDING_INVALID", "binding");
  }
  if (binding.hashStrategyId !== AELF_EOA_HASH_STRATEGY_ID) {
    return failConfiguration("WALLET_AUTH_EOA_HASH_STRATEGY_UNAVAILABLE", "hashStrategyId");
  }
};

const copyBinding = (binding: WalletVerifierBinding): WalletVerifierBinding => Object.freeze({
  accountType: binding.accountType,
  adapterId: binding.adapterId,
  chainIds: Object.freeze([...binding.chainIds]),
  enabled: binding.enabled,
  hashStrategyId: binding.hashStrategyId,
  network: binding.network,
  productionApproved: binding.productionApproved,
  proofMethod: binding.proofMethod,
  signatureEncoding: binding.signatureEncoding,
  walletSource: binding.walletSource,
});

const validateRecoveredProof = (value: AelfEoaRecoveredProof): boolean =>
  value !== null
  && typeof value === "object"
  && typeof value.address === "string"
  && value.address.length >= 40
  && value.address.length <= 64
  && /^[1-9A-HJ-NP-Za-km-z]+$/.test(value.address)
  && typeof value.messageDigest === "string"
  && /^[a-f0-9]{64}$/.test(value.messageDigest)
  && isUint8Array(value.publicKey)
  && value.publicKey.byteLength === AELF_PUBLIC_KEY_UNCOMPRESSED_BYTES;

const canonicalPublicKey = (value: Uint8Array): Uint8Array | undefined => {
  try {
    const key = aelfWallet.ellipticEc.keyFromPublic(Buffer.from(value));
    return Uint8Array.from(key.getPublic().encode("array", false));
  } catch {
    return undefined;
  }
};

const proofDigest = ({
  adapterId,
  messageDigest,
  signature,
}: {
  readonly adapterId: string;
  readonly messageDigest: string;
  readonly signature: Uint8Array;
}): string => createHash("sha256")
  .update("campaign-os-wallet-proof/v1\0", "utf8")
  .update(adapterId, "utf8")
  .update("\0", "utf8")
  .update(messageDigest, "ascii")
  .update("\0", "utf8")
  .update(signature)
  .digest("hex");

export const createAelfEoaSignatureVerifier = ({
  binding,
  clock,
  crypto = defaultAelfEoaCrypto,
}: CreateAelfEoaSignatureVerifierOptions): WalletProofVerifier => {
  assertBinding(binding);
  const resolvedBinding = copyBinding(binding);

  return Object.freeze({
    id: AELF_EOA_HASH_STRATEGY_ID,
    proofMethod: "AELF_EOA_RECOVERABLE",
    verify: async (
      request: WalletProofVerificationRequest,
      signal?: AbortSignal,
    ): Promise<WalletProofVerificationResult> => {
      let traceId = "wallet-auth-eoa";
      try {
        traceId = safeTraceId(request.traceId);
        if (signal?.aborted) {
          return unavailable("verifier", traceId);
        }
        if (
          !isVerifiedWalletProofChallengeMaterial(request.challenge)
          || request.challenge.adapterId !== resolvedBinding.adapterId
          || request.challenge.network !== resolvedBinding.network
          || !resolvedBinding.chainIds.includes(request.challenge.chainId)
          || request.challenge.caHash !== undefined
          || !isCanonicalAelfWalletAddress(request.challenge.requestedWalletAddress)
          || !emptyAdapterProof(request.adapterProof)
        ) {
          return reject("challenge", traceId);
        }

        const messageBytes = copyBoundedBytes(
          request.challenge.exactMessageBytes,
          1,
          AELF_EOA_MESSAGE_MAX_BYTES,
        );
        const signature = copyBoundedBytes(
          request.signature,
          AELF_RECOVERABLE_SIGNATURE_BYTES,
          AELF_RECOVERABLE_SIGNATURE_BYTES,
        );
        if (!messageBytes || !signature || !canonicalSignature(signature)) {
          return reject("proof", traceId);
        }

        let suppliedPublicKey: Uint8Array | undefined;
        if (request.publicKey !== undefined) {
          const publicKey = copyBoundedBytes(
            request.publicKey,
            AELF_PUBLIC_KEY_COMPRESSED_BYTES,
            AELF_PUBLIC_KEY_UNCOMPRESSED_BYTES,
          );
          if (
            !publicKey
            || (publicKey.byteLength !== AELF_PUBLIC_KEY_COMPRESSED_BYTES
              && publicKey.byteLength !== AELF_PUBLIC_KEY_UNCOMPRESSED_BYTES)
          ) {
            return reject("publicKey", traceId);
          }
          suppliedPublicKey = canonicalPublicKey(publicKey);
          if (!suppliedPublicKey) {
            return reject("publicKey", traceId);
          }
        }

        let recovered: AelfEoaRecoveredProof;
        try {
          recovered = crypto.recover({ messageBytes, signature });
        } catch {
          return unavailable("verifier", traceId);
        }
        if (!validateRecoveredProof(recovered)) {
          return unavailable("verifier", traceId);
        }

        const recoveredPublicKey = Uint8Array.from(recovered.publicKey);
        if (
          (suppliedPublicKey && !safeBytesEqual(suppliedPublicKey, recoveredPublicKey))
          || typeof request.challenge.requestedWalletAddress !== "string"
          || !safeTextEqual(recovered.address, request.challenge.requestedWalletAddress)
        ) {
          return reject("signer", traceId);
        }
        if (signal?.aborted) {
          return unavailable("verifier", traceId);
        }

        let verifiedAt: string;
        try {
          const now = clock.now();
          if (!isDate(now) || !Number.isFinite(now.getTime())) {
            return unavailable("clock", traceId);
          }
          verifiedAt = new Date(now.getTime()).toISOString();
        } catch {
          return unavailable("clock", traceId);
        }

        const subject = issueVerifiedWalletSubject({
          accountType: "EOA",
          adapterId: resolvedBinding.adapterId,
          chainId: request.challenge.chainId,
          network: resolvedBinding.network,
          proofDigest: proofDigest({
            adapterId: resolvedBinding.adapterId,
            messageDigest: recovered.messageDigest,
            signature,
          }),
          proofMethod: "AELF_EOA_RECOVERABLE",
          signerAddress: recovered.address,
          verifiedAt,
          walletAddress: recovered.address,
          walletSource: resolvedBinding.walletSource,
        });

        return Object.freeze({ status: "verified", subject });
      } catch {
        return unavailable("verifier", traceId);
      }
    },
  });
};
