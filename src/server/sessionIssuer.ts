import type { WalletProofDiagnostic, WalletProofVerificationResult } from "./walletProofVerifier";
import { summarizeSensitiveWalletProofInput } from "./walletProofVerifier";

export type SessionIssuerMode = "local_opaque" | "production_blocked";
export type SessionIssuerArtifactType = "local_session_reference";
export type SessionIssuerDiagnosticSeverity = "error" | "warning" | "info";
export type SessionIssuerDiagnosticCode =
  | "AUTH_ISSUER_SESSION_ID_MISSING"
  | "AUTH_ISSUER_PROOF_BLOCKED"
  | "AUTH_ISSUER_PRODUCTION_BLOCKED"
  | "AUTH_ISSUER_SENSITIVE_INPUT_REDACTED"
  | "AUTH_ISSUER_TTL_INVALID";

export interface SessionIssuerDiagnostic {
  code: SessionIssuerDiagnosticCode;
  field: string;
  message: string;
  severity: SessionIssuerDiagnosticSeverity;
}

export interface SessionIssuerProductionReadiness {
  blockedDependencyIds: string[];
  liveVerifierReady: boolean;
  productionSessionStoreReady: boolean;
  secretManagerReady: boolean;
  signingKeyReady: boolean;
}

export interface IssueLocalSessionArtifactOptions {
  issuedAt?: Date | string;
  liveVerifierReady?: boolean;
  observedInput?: unknown;
  productionRequired?: boolean;
  productionSessionStoreReady?: boolean;
  proofResult?: WalletProofVerificationResult;
  secretManagerReady?: boolean;
  sessionId?: string;
  signingKeyReady?: boolean;
  ttlSeconds?: number;
}

export interface SessionIssuerResult {
  artifactType: SessionIssuerArtifactType;
  cookieIssued: false;
  diagnosticCodes: SessionIssuerDiagnosticCode[];
  diagnostics: SessionIssuerDiagnostic[];
  expiresAt: string;
  issuerMode: SessionIssuerMode;
  issuedAt: string;
  jwtIssued: false;
  liveSigningExecuted: false;
  productionReadiness: SessionIssuerProductionReadiness;
  proofStatus?: WalletProofVerificationResult["status"];
  redaction: ReturnType<typeof summarizeSensitiveWalletProofInput>;
  referenceId: string;
  sessionId: string;
  ttlSeconds: number;
  valid: boolean;
}

export const defaultLocalSessionTtlSeconds = 3600;

export const sessionIssuerProductionDependencyIds = [
  "live_wallet_proof_verifier",
  "session_signing_key",
  "secret_manager",
  "production_session_store",
] as const;

const diagnostic = (
  code: SessionIssuerDiagnosticCode,
  field: string,
  message: string,
  severity: SessionIssuerDiagnosticSeverity = "error",
): SessionIssuerDiagnostic => ({
  code,
  field,
  message,
  severity,
});

const normalizeIssuedAt = (value: Date | string | undefined) => {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : new Date("1970-01-01T00:00:00.000Z");
  }

  if (typeof value === "string") {
    const parsed = new Date(value);

    return Number.isFinite(parsed.getTime()) ? parsed : new Date("1970-01-01T00:00:00.000Z");
  }

  return new Date();
};

const normalizeTtlSeconds = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return defaultLocalSessionTtlSeconds;
  }

  return Math.floor(value);
};

const referenceIdFor = (sessionId: string, issuedAt: string) =>
  `local-session-ref:${sessionId}:${issuedAt}`;

const diagnosticCodes = (diagnostics: readonly SessionIssuerDiagnostic[]) =>
  Array.from(new Set(diagnostics.map((item) => item.code)));

export const issueLocalSessionArtifact = ({
  issuedAt,
  liveVerifierReady = false,
  observedInput,
  productionRequired = false,
  productionSessionStoreReady = false,
  proofResult,
  secretManagerReady = false,
  sessionId,
  signingKeyReady = false,
  ttlSeconds,
}: IssueLocalSessionArtifactOptions = {}): SessionIssuerResult => {
  const normalizedSessionId = sessionId?.trim() || proofResult?.address || "";
  const normalizedTtlSeconds = normalizeTtlSeconds(ttlSeconds);
  const issuedAtDate = normalizeIssuedAt(issuedAt);
  const issuedAtIso = issuedAtDate.toISOString();
  const redaction = summarizeSensitiveWalletProofInput(observedInput);
  const diagnostics: SessionIssuerDiagnostic[] = [];
  const blockedDependencyIds = [
    ...(!liveVerifierReady ? ["live_wallet_proof_verifier"] : []),
    ...(!signingKeyReady ? ["session_signing_key"] : []),
    ...(!secretManagerReady ? ["secret_manager"] : []),
    ...(!productionSessionStoreReady ? ["production_session_store"] : []),
  ];

  if (!normalizedSessionId) {
    diagnostics.push(diagnostic(
      "AUTH_ISSUER_SESSION_ID_MISSING",
      "sessionId",
      "Session id is required before issuing a local session reference.",
    ));
  }

  if (typeof ttlSeconds === "number" && (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0)) {
    diagnostics.push(diagnostic(
      "AUTH_ISSUER_TTL_INVALID",
      "ttlSeconds",
      "Session TTL must be a positive finite number.",
      "warning",
    ));
  }

  if (proofResult?.status === "blocked") {
    diagnostics.push(diagnostic(
      "AUTH_ISSUER_PROOF_BLOCKED",
      "proofResult.status",
      "Session issuer preserves the blocked wallet proof state.",
    ));
  }

  if (productionRequired && blockedDependencyIds.length > 0) {
    diagnostics.push(diagnostic(
      "AUTH_ISSUER_PRODUCTION_BLOCKED",
      "productionReadiness",
      "Production session issuing is blocked until verifier, signing key, secret manager, and session store are ready.",
    ));
  }

  if (redaction.redactionApplied) {
    diagnostics.push(diagnostic(
      "AUTH_ISSUER_SENSITIVE_INPUT_REDACTED",
      "observedInput",
      "Sensitive issuer input fields were removed from the safe preview.",
      "info",
    ));
  }

  const inheritedProofDiagnostics: WalletProofDiagnostic[] =
    proofResult?.diagnostics.filter((item) => item.severity === "error") ?? [];
  const blockingDiagnostics = diagnostics.filter((item) => item.severity === "error");
  const issuerMode: SessionIssuerMode =
    productionRequired || inheritedProofDiagnostics.length > 0 || blockingDiagnostics.length > 0
      ? "production_blocked"
      : "local_opaque";
  const expiresAt = new Date(issuedAtDate.getTime() + normalizedTtlSeconds * 1000).toISOString();

  return {
    artifactType: "local_session_reference",
    cookieIssued: false,
    diagnosticCodes: diagnosticCodes(diagnostics),
    diagnostics,
    expiresAt,
    issuerMode,
    issuedAt: issuedAtIso,
    jwtIssued: false,
    liveSigningExecuted: false,
    productionReadiness: {
      blockedDependencyIds,
      liveVerifierReady,
      productionSessionStoreReady,
      secretManagerReady,
      signingKeyReady,
    },
    ...(proofResult ? { proofStatus: proofResult.status } : {}),
    redaction,
    referenceId: referenceIdFor(normalizedSessionId || "missing-session", issuedAtIso),
    sessionId: normalizedSessionId,
    ttlSeconds: normalizedTtlSeconds,
    valid: issuerMode === "local_opaque",
  };
};
