import type { AccountType, WalletNetwork, WalletSource } from "../domain/types";

export type WalletProofVerificationStatus =
  | "verified"
  | "proof_required"
  | "signature_unverified"
  | "stale"
  | "blocked";
export type WalletProofTrustLevel =
  | "verified_local"
  | "untrusted"
  | "internal_only"
  | "blocked";
export type WalletProofType = "wallet_signature" | "agent_context" | "address_only";
export type WalletProofDiagnosticSeverity = "error" | "warning" | "info";
export type WalletProofDiagnosticCode =
  | "AUTH_PROOF_ADDRESS_MISSING"
  | "AUTH_PROOF_ADDRESS_ONLY"
  | "AUTH_PROOF_NONCE_MISSING"
  | "AUTH_PROOF_ISSUED_AT_MISSING"
  | "AUTH_PROOF_STALE"
  | "AUTH_PROOF_SIGNATURE_MISSING"
  | "AUTH_PROOF_CHAIN_UNSUPPORTED"
  | "AUTH_PROOF_NETWORK_UNSUPPORTED"
  | "AUTH_PROOF_AGENT_CREDENTIAL_BOUNDARY"
  | "AUTH_PROOF_PRODUCTION_BLOCKED"
  | "AUTH_PROOF_SENSITIVE_INPUT_REDACTED";

export interface WalletProofDiagnostic {
  code: WalletProofDiagnosticCode;
  field: string;
  message: string;
  severity: WalletProofDiagnosticSeverity;
}

export interface WalletProofInputRedactionSummary {
  redactedFieldCount: number;
  redactionApplied: boolean;
  safePreview: unknown;
}

export interface WalletProofFreshness {
  ageSeconds?: number;
  expiresAt?: string;
  issuedAt?: string;
  maxAgeSeconds: number;
  stale: boolean;
}

export interface WalletProofProductionReadiness {
  blockedDependencyIds: string[];
  liveVerifierReady: boolean;
  nonceStoreReady: boolean;
  required: boolean;
}

export interface VerifyWalletProofLocallyOptions {
  accountTypeHint?: AccountType;
  address?: string;
  adapterName?: string;
  chainId?: string;
  liveVerifierReady?: boolean;
  maxAgeSeconds?: number;
  network?: WalletNetwork | string;
  nonce?: string;
  nonceStoreReady?: boolean;
  now?: Date | string;
  observedInput?: unknown;
  proofIssuedAt?: Date | string;
  proofType?: WalletProofType;
  productionRequired?: boolean;
  signature?: string;
  signaturePresent?: boolean;
  walletSourceHint?: WalletSource;
}

export interface WalletProofVerificationResult {
  accountType: AccountType;
  adapterName?: string;
  address: string;
  chainId: string;
  diagnosticCodes: WalletProofDiagnosticCode[];
  diagnostics: WalletProofDiagnostic[];
  freshness: WalletProofFreshness;
  liveVerifierReady: boolean;
  liveVerificationExecuted: false;
  nonceStoreReady: boolean;
  productionReadiness: WalletProofProductionReadiness;
  proofType: WalletProofType;
  redaction: WalletProofInputRedactionSummary;
  status: WalletProofVerificationStatus;
  trustLevel: WalletProofTrustLevel;
  walletSource: WalletSource;
  network: WalletNetwork;
}

export const defaultWalletProofMaxAgeSeconds = 300;

const supportedChainIds = ["AELF", "tDVV", "tDVW"] as const;
const supportedNetworks = ["mainnet", "testnet"] as const satisfies readonly WalletNetwork[];
const redactedPlaceholder = "[redacted-sensitive]";
const sensitiveKeyFragments = [
  "authorization",
  "bearer",
  "cookie",
  "jwt",
  "mnemonic",
  "nonce",
  "objectkey",
  "password",
  "privatekey",
  "rawsignature",
  "secret",
  "seedphrase",
  "signature",
  "signedurl",
  "token",
];

export const walletProofProductionDependencyIds = [
  "live_wallet_proof_verifier",
  "auth_nonce_store",
] as const;

const normalizeSensitiveKey = (key: string) =>
  key.toLowerCase().replace(/[^a-z0-9]/g, "");

const isSensitiveKey = (key: string) => {
  const normalizedKey = normalizeSensitiveKey(key);

  return sensitiveKeyFragments.some((fragment) => normalizedKey.includes(fragment));
};

const sensitiveValueFragments = [
  "bearer",
  "jwtsecret",
  "mnemonic",
  "privatekey",
  "rawsignature",
  "secretkey",
  "secrettoken",
  "seedphrase",
  "signedcookie",
  "signedurl",
  "token",
];

const hasSignedUrlQuery = (value: string) =>
  /^https?:\/\//i.test(value)
  && /[?&](access_token|authorization|credential|signature|token|x-amz-signature)=/i.test(value);

const isSensitiveStringValue = (value: string) => {
  const normalizedValue = normalizeSensitiveKey(value);

  return (
    /\bbearer\s+\S+/i.test(value)
    || /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/i.test(value)
    || hasSignedUrlQuery(value)
    || sensitiveValueFragments.some((fragment) => normalizedValue.includes(fragment))
  );
};

export const summarizeSensitiveWalletProofInput = (
  input: unknown,
): WalletProofInputRedactionSummary => {
  let redactedFieldCount = 0;

  const sanitize = (value: unknown): unknown => {
    if (typeof value === "string" && isSensitiveStringValue(value)) {
      redactedFieldCount += 1;

      return redactedPlaceholder;
    }

    if (value === null || typeof value !== "object") {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => sanitize(item));
    }

    const entries = Object.entries(value).flatMap(([key, nested]) => {
      if (isSensitiveKey(key)) {
        redactedFieldCount += 1;

        return [];
      }

      return [[key, sanitize(nested)] as const];
    });

    return Object.fromEntries(entries);
  };
  const safePreview = sanitize(input);

  return {
    redactedFieldCount,
    redactionApplied: redactedFieldCount > 0,
    safePreview,
  };
};

const diagnostic = (
  code: WalletProofDiagnosticCode,
  field: string,
  message: string,
  severity: WalletProofDiagnosticSeverity = "error",
): WalletProofDiagnostic => ({
  code,
  field,
  message,
  severity,
});

const diagnosticCodes = (diagnostics: readonly WalletProofDiagnostic[]) =>
  Array.from(new Set(diagnostics.map((item) => item.code)));

const normalizeNow = (value: Date | string | undefined) =>
  value instanceof Date
    ? value
    : typeof value === "string"
      ? new Date(value)
      : new Date();

const toIsoIfValid = (value: Date) =>
  Number.isFinite(value.getTime()) ? value.toISOString() : undefined;

const normalizeNetwork = (network: WalletNetwork | string | undefined): WalletNetwork =>
  network === "mainnet" || network === "testnet" ? network : "unknown";

const normalizeProofType = ({
  address,
  proofType,
  walletSourceHint,
}: {
  address: string;
  proofType?: WalletProofType;
  walletSourceHint?: WalletSource;
}): WalletProofType => {
  if (proofType) {
    return proofType;
  }

  if (walletSourceHint === "AGENT_SKILL") {
    return "agent_context";
  }

  return address ? "wallet_signature" : "address_only";
};

const normalizeMaxAgeSeconds = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return defaultWalletProofMaxAgeSeconds;
  }

  return Math.min(defaultWalletProofMaxAgeSeconds, Math.max(1, Math.floor(value)));
};

const createFreshness = ({
  maxAgeSeconds,
  now,
  proofIssuedAt,
}: {
  maxAgeSeconds: number;
  now: Date;
  proofIssuedAt?: Date | string;
}): WalletProofFreshness => {
  const issuedAtDate = proofIssuedAt instanceof Date
    ? proofIssuedAt
    : typeof proofIssuedAt === "string"
      ? new Date(proofIssuedAt)
      : undefined;
  const issuedAt = issuedAtDate ? toIsoIfValid(issuedAtDate) : undefined;

  if (!issuedAtDate || !issuedAt || !Number.isFinite(now.getTime())) {
    return {
      maxAgeSeconds,
      stale: false,
    };
  }

  const expiresAtDate = new Date(issuedAtDate.getTime() + maxAgeSeconds * 1000);
  const ageSeconds = Math.max(0, Math.floor((now.getTime() - issuedAtDate.getTime()) / 1000));

  return {
    ageSeconds,
    expiresAt: expiresAtDate.toISOString(),
    issuedAt,
    maxAgeSeconds,
    stale: now.getTime() > expiresAtDate.getTime(),
  };
};

const resolveStatus = ({
  diagnostics,
  freshness,
  proofType,
}: {
  diagnostics: readonly WalletProofDiagnostic[];
  freshness: WalletProofFreshness;
  proofType: WalletProofType;
}): WalletProofVerificationStatus => {
  const codes = diagnostics.map((item) => item.code);

  if (
    codes.includes("AUTH_PROOF_ADDRESS_MISSING")
    || codes.includes("AUTH_PROOF_CHAIN_UNSUPPORTED")
    || codes.includes("AUTH_PROOF_NETWORK_UNSUPPORTED")
    || codes.includes("AUTH_PROOF_PRODUCTION_BLOCKED")
  ) {
    return "blocked";
  }

  if (proofType === "agent_context" || codes.includes("AUTH_PROOF_ADDRESS_ONLY")) {
    return "proof_required";
  }

  if (codes.includes("AUTH_PROOF_NONCE_MISSING") || codes.includes("AUTH_PROOF_ISSUED_AT_MISSING")) {
    return "proof_required";
  }

  if (freshness.stale || codes.includes("AUTH_PROOF_STALE")) {
    return "stale";
  }

  if (codes.includes("AUTH_PROOF_SIGNATURE_MISSING")) {
    return "signature_unverified";
  }

  return "verified";
};

const trustLevelFor = (
  status: WalletProofVerificationStatus,
  proofType: WalletProofType,
): WalletProofTrustLevel => {
  if (status === "blocked") {
    return "blocked";
  }

  if (proofType === "agent_context") {
    return "internal_only";
  }

  return status === "verified" ? "verified_local" : "untrusted";
};

export const verifyWalletProofLocally = ({
  accountTypeHint = "UNKNOWN",
  address,
  adapterName,
  chainId = "unknown",
  liveVerifierReady = false,
  maxAgeSeconds,
  network,
  nonce,
  nonceStoreReady = false,
  now,
  observedInput,
  proofIssuedAt,
  proofType: requestedProofType,
  productionRequired = false,
  signature,
  signaturePresent,
  walletSourceHint = "OTHER",
}: VerifyWalletProofLocallyOptions = {}): WalletProofVerificationResult => {
  const normalizedAddress = address?.trim() ?? "";
  const normalizedChainId = chainId.trim() || "unknown";
  const normalizedNetwork = normalizeNetwork(network);
  const normalizedMaxAgeSeconds = normalizeMaxAgeSeconds(maxAgeSeconds);
  const redaction = summarizeSensitiveWalletProofInput(observedInput);
  const freshness = createFreshness({
    maxAgeSeconds: normalizedMaxAgeSeconds,
    now: normalizeNow(now),
    proofIssuedAt,
  });
  const proofType = normalizeProofType({
    address: normalizedAddress,
    proofType: requestedProofType,
    walletSourceHint,
  });
  const diagnostics: WalletProofDiagnostic[] = [];
  const blockedDependencyIds = [
    ...(!liveVerifierReady ? ["live_wallet_proof_verifier"] : []),
    ...(!nonceStoreReady ? ["auth_nonce_store"] : []),
  ];

  if (!normalizedAddress) {
    diagnostics.push(diagnostic(
      "AUTH_PROOF_ADDRESS_MISSING",
      "address",
      "Wallet address is required before local proof evaluation can trust a session.",
    ));
  }

  if (proofType === "address_only") {
    diagnostics.push(diagnostic(
      "AUTH_PROOF_ADDRESS_ONLY",
      "proofType",
      "Address-only input cannot prove wallet ownership or account type.",
      "warning",
    ));
  }

  if (proofType === "agent_context") {
    diagnostics.push(diagnostic(
      "AUTH_PROOF_AGENT_CREDENTIAL_BOUNDARY",
      "proofType",
      "Internal agent credentials remain separated from ordinary user wallet sessions.",
      "info",
    ));
  }

  if (!supportedChainIds.includes(normalizedChainId as (typeof supportedChainIds)[number])) {
    diagnostics.push(diagnostic(
      "AUTH_PROOF_CHAIN_UNSUPPORTED",
      "chainId",
      "Wallet proof chain id is not supported by the local verifier contract.",
    ));
  }

  if (!supportedNetworks.includes(normalizedNetwork as (typeof supportedNetworks)[number])) {
    diagnostics.push(diagnostic(
      "AUTH_PROOF_NETWORK_UNSUPPORTED",
      "network",
      "Wallet proof network is not supported by the local verifier contract.",
    ));
  }

  if (!nonce?.trim()) {
    diagnostics.push(diagnostic(
      "AUTH_PROOF_NONCE_MISSING",
      "nonce",
      "Wallet proof nonce is required before local proof can be trusted.",
      "warning",
    ));
  }

  if (!freshness.issuedAt) {
    diagnostics.push(diagnostic(
      "AUTH_PROOF_ISSUED_AT_MISSING",
      "proofIssuedAt",
      "Wallet proof issued-at timestamp is required for freshness validation.",
      "warning",
    ));
  }

  if (freshness.stale) {
    diagnostics.push(diagnostic(
      "AUTH_PROOF_STALE",
      "proofIssuedAt",
      "Wallet proof is outside the local freshness window.",
      "warning",
    ));
  }

  if (!(signaturePresent ?? Boolean(signature?.trim())) && proofType === "wallet_signature") {
    diagnostics.push(diagnostic(
      "AUTH_PROOF_SIGNATURE_MISSING",
      "signature",
      "Wallet proof signature presence is required for local verification.",
      "warning",
    ));
  }

  if (productionRequired && blockedDependencyIds.length > 0) {
    diagnostics.push(diagnostic(
      "AUTH_PROOF_PRODUCTION_BLOCKED",
      "productionReadiness",
      "Production wallet proof verification is blocked until live verifier and nonce store dependencies are ready.",
    ));
  }

  if (redaction.redactionApplied) {
    diagnostics.push(diagnostic(
      "AUTH_PROOF_SENSITIVE_INPUT_REDACTED",
      "observedInput",
      "Sensitive wallet proof input fields were removed from the safe preview.",
      "info",
    ));
  }

  const status = resolveStatus({ diagnostics, freshness, proofType });

  return {
    accountType: accountTypeHint,
    ...(adapterName ? { adapterName } : {}),
    address: normalizedAddress,
    chainId: normalizedChainId,
    diagnosticCodes: diagnosticCodes(diagnostics),
    diagnostics,
    freshness,
    liveVerifierReady,
    liveVerificationExecuted: false,
    nonceStoreReady,
    productionReadiness: {
      blockedDependencyIds,
      liveVerifierReady,
      nonceStoreReady,
      required: productionRequired,
    },
    proofType,
    redaction,
    status,
    trustLevel: trustLevelFor(status, proofType),
    walletSource: walletSourceHint,
    network: normalizedNetwork,
  };
};
