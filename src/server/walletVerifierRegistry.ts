import {
  createWalletAuthenticationDiagnostic,
  isVerifiedWalletSubject,
  type WalletAuthenticationDiagnostic,
  type WalletProofVerificationRequest,
  type WalletProofVerificationResult,
  type WalletProofVerifier,
} from "./walletAuthentication";
import type {
  WalletAuthenticationEnvironment,
  WalletVerifierBinding,
} from "./walletAuthenticationConfig";
import { isVerifiedWalletProofChallengeMaterial } from "./walletAuthenticationChallenge";

export type WalletVerifierRegistryErrorCode =
  | "WALLET_AUTH_VERIFIER_REGISTRATION_CONFLICT"
  | "WALLET_AUTH_VERIFIER_REGISTRATION_INVALID";

export class WalletVerifierRegistryError extends Error {
  readonly code: WalletVerifierRegistryErrorCode;
  readonly field: string;

  constructor(code: WalletVerifierRegistryErrorCode, field: string) {
    super("Wallet verifier registry configuration is invalid.");
    this.name = "WalletVerifierRegistryError";
    this.code = code;
    this.field = field;
  }
}

export interface WalletVerifierRegistration {
  readonly binding: WalletVerifierBinding;
  readonly verifier: WalletProofVerifier;
}

export interface WalletVerifierRegistryOptions {
  readonly timeoutMs?: number;
}

export interface WalletVerifierRegistryRequest {
  readonly binding: WalletVerifierBinding;
  readonly environment: WalletAuthenticationEnvironment;
  readonly request: WalletProofVerificationRequest;
}

interface RegisteredWalletVerifier {
  readonly binding: WalletVerifierBinding;
  readonly verifier: WalletProofVerifier;
}

const DEFAULT_VERIFY_TIMEOUT_MS = 5_000;
const MIN_VERIFY_TIMEOUT_MS = 1;
const MAX_VERIFY_TIMEOUT_MS = 10_000;

const failRegistry = (
  code: WalletVerifierRegistryErrorCode,
  field: string,
): never => {
  throw new WalletVerifierRegistryError(code, field);
};

const safeTraceId = (value: unknown): string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= 128
  && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
    ? value
    : "wallet-auth-verifier";

const safeResult = (
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

const unavailable = (
  field: string,
  traceId: string,
): WalletProofVerificationResult => safeResult(
  "unavailable",
  "WALLET_AUTH_VERIFIER_UNAVAILABLE",
  field,
  traceId,
);

const rejected = (
  field: string,
  traceId: string,
): WalletProofVerificationResult => safeResult(
  "rejected",
  "WALLET_AUTH_INPUT_INVALID",
  field,
  traceId,
);

const sameStrings = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const sameBinding = (left: WalletVerifierBinding, right: WalletVerifierBinding): boolean =>
  left.accountType === right.accountType
  && left.adapterId === right.adapterId
  && left.caRelationProviderId === right.caRelationProviderId
  && sameStrings(left.chainIds, right.chainIds)
  && left.enabled === right.enabled
  && left.hashStrategyId === right.hashStrategyId
  && left.network === right.network
  && left.productionApproved === right.productionApproved
  && left.proofMethod === right.proofMethod
  && left.signatureEncoding === right.signatureEncoding
  && left.walletSource === right.walletSource;

const safeRegistration = (
  registration: WalletVerifierRegistration,
): RegisteredWalletVerifier => {
  try {
    if (
      registration === null
      || typeof registration !== "object"
      || registration.binding === null
      || typeof registration.binding !== "object"
      || typeof registration.binding.adapterId !== "string"
      || registration.binding.adapterId.length === 0
      || registration.binding.adapterId.length > 64
      || !Array.isArray(registration.binding.chainIds)
      || registration.binding.chainIds.length === 0
      || registration.binding.chainIds.length > 8
      || typeof registration.verifier !== "object"
      || registration.verifier === null
      || typeof registration.verifier.id !== "string"
      || registration.verifier.id.length === 0
      || registration.verifier.id.length > 96
      || typeof registration.verifier.verify !== "function"
    ) {
      return failRegistry("WALLET_AUTH_VERIFIER_REGISTRATION_INVALID", "bindings");
    }

    const binding: WalletVerifierBinding = Object.freeze({
      accountType: registration.binding.accountType,
      adapterId: registration.binding.adapterId,
      ...(registration.binding.caRelationProviderId === undefined
        ? {}
        : { caRelationProviderId: registration.binding.caRelationProviderId }),
      chainIds: Object.freeze([...registration.binding.chainIds]),
      enabled: registration.binding.enabled,
      hashStrategyId: registration.binding.hashStrategyId,
      network: registration.binding.network,
      productionApproved: registration.binding.productionApproved,
      proofMethod: registration.binding.proofMethod,
      signatureEncoding: registration.binding.signatureEncoding,
      walletSource: registration.binding.walletSource,
    });
    const verifier: WalletProofVerifier = Object.freeze({
      id: registration.verifier.id,
      proofMethod: registration.verifier.proofMethod,
      verify: registration.verifier.verify.bind(registration.verifier),
    });

    return Object.freeze({ binding, verifier });
  } catch (error) {
    if (error instanceof WalletVerifierRegistryError) {
      throw error;
    }

    return failRegistry("WALLET_AUTH_VERIFIER_REGISTRATION_INVALID", "bindings");
  }
};

const challengeMatchesBinding = (
  binding: WalletVerifierBinding,
  request: WalletProofVerificationRequest,
): boolean => {
  const challenge = request.challenge;
  if (
    !isVerifiedWalletProofChallengeMaterial(challenge)
    || challenge.adapterId !== binding.adapterId
    || challenge.network !== binding.network
    || !binding.chainIds.includes(challenge.chainId)
    || typeof challenge.requestedWalletAddress !== "string"
    || challenge.requestedWalletAddress.length === 0
    || challenge.requestedWalletAddress.length > 256
  ) {
    return false;
  }

  return binding.accountType === "EOA"
    ? challenge.caHash === undefined
    : typeof challenge.caHash === "string" && challenge.caHash.length > 0;
};

const verifiedResultMatchesAuthority = (
  result: WalletProofVerificationResult,
  registration: RegisteredWalletVerifier,
  request: WalletProofVerificationRequest,
): boolean => {
  if (result.status !== "verified" || !isVerifiedWalletSubject(result.subject)) {
    return result.status === "rejected" || result.status === "unavailable";
  }

  const { binding } = registration;
  const { challenge } = request;
  return result.subject.accountType === binding.accountType
    && result.subject.adapterId === binding.adapterId
    && result.subject.chainId === challenge.chainId
    && result.subject.network === binding.network
    && result.subject.proofMethod === binding.proofMethod
    && result.subject.walletAddress === challenge.requestedWalletAddress
    && result.subject.walletSource === binding.walletSource
    && result.subject.caHash === challenge.caHash;
};

const validTerminalResult = (result: unknown): result is WalletProofVerificationResult => {
  if (result === null || typeof result !== "object" || !("status" in result)) {
    return false;
  }

  if (result.status === "verified") {
    return "subject" in result && isVerifiedWalletSubject(result.subject);
  }

  return (result.status === "rejected" || result.status === "unavailable")
    && "diagnostic" in result
    && result.diagnostic !== null
    && typeof result.diagnostic === "object";
};

const sanitizeTerminalResult = (
  result: Exclude<WalletProofVerificationResult, { status: "verified" }>,
  traceId: string,
): WalletProofVerificationResult => result.status === "rejected"
  ? rejected("verifier", traceId)
  : unavailable("verifier", traceId);

export class WalletVerifierRegistry {
  readonly #registrations!: ReadonlyMap<string, RegisteredWalletVerifier>;
  readonly #timeoutMs!: number;

  constructor(
    registrations: readonly WalletVerifierRegistration[],
    options: WalletVerifierRegistryOptions = {},
  ) {
    const timeoutMs = options.timeoutMs ?? DEFAULT_VERIFY_TIMEOUT_MS;
    if (
      !Number.isInteger(timeoutMs)
      || timeoutMs < MIN_VERIFY_TIMEOUT_MS
      || timeoutMs > MAX_VERIFY_TIMEOUT_MS
    ) {
      return failRegistry("WALLET_AUTH_VERIFIER_REGISTRATION_INVALID", "timeoutMs");
    }
    if (!Array.isArray(registrations) || registrations.length > 32) {
      return failRegistry("WALLET_AUTH_VERIFIER_REGISTRATION_INVALID", "bindings");
    }

    const indexed = new Map<string, RegisteredWalletVerifier>();
    for (const source of registrations) {
      const registration = safeRegistration(source);
      if (indexed.has(registration.binding.adapterId)) {
        return failRegistry("WALLET_AUTH_VERIFIER_REGISTRATION_CONFLICT", "bindings");
      }
      indexed.set(registration.binding.adapterId, registration);
    }

    this.#registrations = indexed;
    this.#timeoutMs = timeoutMs;
  }

  get size(): number {
    return this.#registrations.size;
  }

  async verify(
    input: WalletVerifierRegistryRequest,
    signal?: AbortSignal,
  ): Promise<WalletProofVerificationResult> {
    let traceId = "wallet-auth-verifier";
    try {
      traceId = safeTraceId(input.request.traceId);
      if (signal?.aborted) {
        return unavailable("verifier", traceId);
      }
      if (
        input.environment !== "local"
        && input.environment !== "stage"
        && input.environment !== "production"
      ) {
        return rejected("environment", traceId);
      }

      const registration = this.#registrations.get(input.binding.adapterId);
      if (!registration) {
        return unavailable("binding", traceId);
      }
      if (
        !sameBinding(registration.binding, input.binding)
        || !input.binding.enabled
        || (input.environment === "production" && !input.binding.productionApproved)
        || registration.verifier.id !== input.binding.hashStrategyId
        || registration.verifier.proofMethod !== input.binding.proofMethod
      ) {
        return unavailable("binding", traceId);
      }
      if (!challengeMatchesBinding(input.binding, input.request)) {
        return rejected("challenge", traceId);
      }

      return await this.#runVerifier(registration, input.request, traceId, signal);
    } catch {
      return unavailable("verifier", traceId);
    }
  }

  async #runVerifier(
    registration: RegisteredWalletVerifier,
    request: WalletProofVerificationRequest,
    traceId: string,
    externalSignal?: AbortSignal,
  ): Promise<WalletProofVerificationResult> {
    const controller = new AbortController();
    let settleAbort: (result: WalletProofVerificationResult) => void = () => undefined;
    const aborted = new Promise<WalletProofVerificationResult>((resolve) => {
      settleAbort = resolve;
    });
    const abort = () => {
      controller.abort();
      settleAbort(unavailable("verifier", traceId));
    };
    externalSignal?.addEventListener("abort", abort, { once: true });
    if (externalSignal?.aborted) {
      abort();
    }
    const timer = setTimeout(abort, this.#timeoutMs);

    const verification = Promise.resolve()
      .then(() => controller.signal.aborted
        ? unavailable("verifier", traceId)
        : registration.verifier.verify(request, controller.signal))
      .then((result): WalletProofVerificationResult => {
        if (!validTerminalResult(result)) {
          return unavailable("verifier", traceId);
        }
        if (result.status !== "verified") {
          return sanitizeTerminalResult(result, traceId);
        }
        if (!verifiedResultMatchesAuthority(result, registration, request)) {
          return rejected("subject", traceId);
        }

        return Object.freeze({ status: "verified", subject: result.subject });
      })
      .catch(() => unavailable("verifier", traceId));

    try {
      return await Promise.race([verification, aborted]);
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", abort);
    }
  }
}

export const isWalletVerifierDiagnostic = (
  value: unknown,
): value is WalletAuthenticationDiagnostic =>
  value !== null
  && typeof value === "object"
  && "code" in value
  && "field" in value
  && "traceId" in value;
