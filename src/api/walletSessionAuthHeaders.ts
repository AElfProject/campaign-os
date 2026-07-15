import type { NormalizedWalletSession } from "../domain/types";

export const protectedWalletSessionAuthHeaderNames = Object.freeze([
  "x-campaign-os-account-type",
  "x-campaign-os-credential-boundary",
  "x-campaign-os-proof-status",
  "x-campaign-os-roles",
  "x-campaign-os-session-id",
  "x-campaign-os-wallet-address",
  "x-campaign-os-wallet-source",
] as const);

export type ProtectedWalletSessionAuthHeaderName =
  (typeof protectedWalletSessionAuthHeaderNames)[number];

export type WalletSessionAuthHeaders = Readonly<
  Record<ProtectedWalletSessionAuthHeaderName, string>
>;

export type WalletSessionRequestedRole = "participant" | "review_operator";

export type WalletSessionAuthHeaderFailureCode =
  | "WALLET_SESSION_AUTH_HEADER_CONFLICT"
  | "WALLET_SESSION_AUTH_INVALID";

export interface WalletSessionAuthHeaderFailure {
  code: WalletSessionAuthHeaderFailureCode;
  field: string;
  ok: false;
}

export interface WalletSessionAuthHeaderSuccess {
  headers: WalletSessionAuthHeaders;
  ok: true;
}

export interface WalletSessionAuthHeaderMergeSuccess {
  headers: Readonly<Record<string, string>>;
  ok: true;
}

export type WalletSessionAuthHeaderResult =
  | WalletSessionAuthHeaderFailure
  | WalletSessionAuthHeaderSuccess;

export type WalletSessionAuthHeaderMergeResult =
  | WalletSessionAuthHeaderFailure
  | WalletSessionAuthHeaderMergeSuccess;

const accountTypes = new Set(["AA", "EOA"]);
const walletSources = new Set([
  "AGENT_SKILL",
  "NIGHTELF",
  "OTHER",
  "PORTKEY_AA",
  "PORTKEY_EOA_APP",
  "PORTKEY_EOA_EXTENSION",
]);
const proofStatuses = new Set([
  "blocked",
  "proof_required",
  "signature_unverified",
  "stale",
  "verified",
]);
const verificationStatuses = new Set([
  "account_restricted",
  "address_only",
  "extension_not_installed",
  "internal_agent",
  "missing_signature",
  "unsupported_wallet",
  "verified",
  "wrong_chain",
]);
const walletCapabilities = new Set([
  "ADDRESS_ONLY",
  "CONTRACT_SEND",
  "CONTRACT_VIEW",
  "EBRIDGE",
  "INTERNAL_AUTOMATION",
  "SEND_TRANSACTION",
  "SIGN_MESSAGE",
  "VIEW_BALANCE",
]);
const protectedHeaderNames = new Set<string>(protectedWalletSessionAuthHeaderNames);
const forbiddenCustomHeaderNames = new Set([
  ...protectedWalletSessionAuthHeaderNames,
  "authorization",
  "cookie",
  "proxy-authorization",
  "set-cookie",
]);
const maxAuthorityValueLength = 256;
const maxCustomHeaderValueLength = 2_048;

const invalid = (field: string): WalletSessionAuthHeaderFailure => ({
  code: "WALLET_SESSION_AUTH_INVALID",
  field,
  ok: false,
});

const conflict = (field: string): WalletSessionAuthHeaderFailure => ({
  code: "WALLET_SESSION_AUTH_HEADER_CONFLICT",
  field,
  ok: false,
});

const transportText = (value: unknown, maxLength = maxAuthorityValueLength): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  return normalized.length > 0
    && normalized.length <= maxLength
    && !/[\u0000-\u001f\u007f-\u009f]/u.test(normalized)
    ? normalized
    : undefined;
};

const proofStatusForSession = (session: NormalizedWalletSession): string => {
  const proofStatus = transportText(session.proof?.status);

  if (proofStatus && proofStatuses.has(proofStatus)) {
    return proofStatus;
  }

  return session.verificationStatus === "verified"
    ? "verified"
    : "signature_unverified";
};

const credentialBoundaryForSession = (session: NormalizedWalletSession): string =>
  session.walletSource.trim() === "AGENT_SKILL"
  || (Array.isArray(session.capabilities) && session.capabilities.includes("INTERNAL_AUTOMATION"))
    ? "internal_agent_credential"
    : "ordinary_user_wallet";

const invalidReviewOperatorAuthorityField = (
  session: NormalizedWalletSession,
): string | undefined => {
  const issuer = session.issuer;
  if (!issuer) {
    return "session.issuer";
  }
  if (issuer.issuerMode !== "local_opaque") {
    return "session.issuer.issuerMode";
  }
  if (issuer.cookieIssued !== false) {
    return "session.issuer.cookieIssued";
  }
  if (issuer.jwtIssued !== false) {
    return "session.issuer.jwtIssued";
  }
  if (issuer.liveSigningExecuted !== false) {
    return "session.issuer.liveSigningExecuted";
  }

  const proof = session.proof;
  if (!proof) {
    return "session.proof";
  }
  if (proof.proofType !== "wallet_signature") {
    return "session.proof.proofType";
  }
  if (proof.trustLevel !== "verified_local") {
    return "session.proof.trustLevel";
  }
  if (proof.status !== "verified") {
    return "session.proof.status";
  }
  if (proof.liveVerificationExecuted !== false) {
    return "session.proof.liveVerificationExecuted";
  }
  if (session.signatureStatus !== "signed") {
    return "session.signatureStatus";
  }
  if (session.verificationStatus !== "verified") {
    return "session.verificationStatus";
  }
  if (session.walletTypeVerified !== true) {
    return "session.walletTypeVerified";
  }
  if (!session.capabilities.includes("SIGN_MESSAGE")) {
    return "session.capabilities";
  }
  return credentialBoundaryForSession(session) === "ordinary_user_wallet"
    ? undefined
    : "session.credentialBoundary";
};

export const createWalletSessionAuthHeaders = (
  value: NormalizedWalletSession | unknown,
  requestedRole: WalletSessionRequestedRole = "participant",
): WalletSessionAuthHeaderResult => {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return invalid("session");
    }

    const session = value as NormalizedWalletSession;
    const sessionId = transportText(session.sessionId);
    const address = transportText(session.address);
    const accountType = transportText(session.accountType);
    const walletSource = transportText(session.walletSource);

    if (requestedRole !== "participant" && requestedRole !== "review_operator") {
      return invalid("requestedRole");
    }

    if (!sessionId) {
      return invalid("session.sessionId");
    }
    if (!address) {
      return invalid("session.address");
    }
    if (!accountType || !accountTypes.has(accountType)) {
      return invalid("session.accountType");
    }
    if (!walletSource || !walletSources.has(walletSource)) {
      return invalid("session.walletSource");
    }
    if (!Array.isArray(session.capabilities)) {
      return invalid("session.capabilities");
    }
    if (
      session.capabilities.length > 32
      || session.capabilities.some((capability) =>
        typeof capability !== "string" || !walletCapabilities.has(capability))
    ) {
      return invalid("session.capabilities");
    }
    if (!verificationStatuses.has(session.verificationStatus)) {
      return invalid("session.verificationStatus");
    }
    const issuer = session.issuer;
    if (
      !issuer
      || typeof issuer !== "object"
      || Array.isArray(issuer)
      || issuer.valid !== true
      || issuer.artifactType !== "local_session_reference"
      || !transportText(issuer.referenceId)
      || !Number.isSafeInteger(issuer.ttlSeconds)
      || issuer.ttlSeconds <= 0
    ) {
      return invalid("session.issuer");
    }
    if (session.proof !== undefined) {
      if (!session.proof || typeof session.proof !== "object" || Array.isArray(session.proof)) {
        return invalid("session.proof");
      }
      const proofStatus = transportText(session.proof.status);
      if (!proofStatus || !proofStatuses.has(proofStatus)) {
        return invalid("session.proof.status");
      }
    }
    if (requestedRole === "review_operator") {
      const invalidAuthorityField = invalidReviewOperatorAuthorityField(session);
      if (invalidAuthorityField) {
        return invalid(invalidAuthorityField);
      }
    }

    const headers: WalletSessionAuthHeaders = Object.freeze({
      "x-campaign-os-account-type": accountType,
      "x-campaign-os-credential-boundary": credentialBoundaryForSession(session),
      "x-campaign-os-proof-status": proofStatusForSession(session),
      "x-campaign-os-roles": requestedRole,
      "x-campaign-os-session-id": sessionId,
      "x-campaign-os-wallet-address": address,
      "x-campaign-os-wallet-source": walletSource,
    });

    return { headers, ok: true };
  } catch {
    return invalid("session");
  }
};

export const mergeWalletSessionAuthHeaders = (
  authHeaders: WalletSessionAuthHeaders,
  customHeaders?: HeadersInit,
  additionalProtectedHeaderNames: readonly string[] = [],
): WalletSessionAuthHeaderMergeResult => {
  try {
    const normalizedCustomHeaders = new Headers(customHeaders);
    const requestProtectedHeaderNames = new Set(
      additionalProtectedHeaderNames.map((name) => name.trim().toLowerCase()),
    );
    const merged: Record<string, string> = {};
    let failure: WalletSessionAuthHeaderFailure | undefined;

    normalizedCustomHeaders.forEach((rawValue, rawName) => {
      if (failure) {
        return;
      }

      const name = rawName.trim().toLowerCase();
      const value = transportText(rawValue, maxCustomHeaderValueLength);

      if (forbiddenCustomHeaderNames.has(name) || requestProtectedHeaderNames.has(name)) {
        failure = conflict(name);
        return;
      }
      if (!name || !value) {
        failure = invalid(name ? `headers.${name}` : "headers");
        return;
      }

      merged[name] = value;
    });

    if (failure) {
      return failure;
    }

    for (const name of protectedWalletSessionAuthHeaderNames) {
      const value = authHeaders[name];

      if (!protectedHeaderNames.has(name) || !transportText(value)) {
        return invalid(`headers.${name}`);
      }
      merged[name] = value;
    }

    return {
      headers: Object.freeze(merged),
      ok: true,
    };
  } catch {
    return invalid("headers");
  }
};
