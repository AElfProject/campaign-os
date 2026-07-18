import type { NormalizedWalletSession } from "../domain/types";

declare const deprecatedPreviewConfigurationBrand: unique symbol;
declare const deprecatedPreviewHeadersBrand: unique symbol;
declare const deprecatedPreviewTransportHeadersBrand: unique symbol;

/**
 * Caller-issued session headers retained only so preview guards can identify and reject them.
 * Live authentication uses the durable HttpOnly cookie session instead.
 *
 * @deprecated These header names have no authority in live mode.
 */
export const protectedWalletSessionAuthHeaderNames = Object.freeze([
  "x-campaign-os-account-type",
  "x-campaign-os-credential-boundary",
  "x-campaign-os-proof-status",
  "x-campaign-os-roles",
  "x-campaign-os-session-id",
  "x-campaign-os-wallet-address",
  "x-campaign-os-wallet-source",
] as const);

/** @deprecated Caller-issued session headers have no authority in live mode. */
export type ProtectedWalletSessionAuthHeaderName =
  (typeof protectedWalletSessionAuthHeaderNames)[number];

/**
 * Nominally isolated compatibility headers for a non-live preview runtime.
 * They are not a live credential and must never be passed to a live handler.
 *
 * @deprecated Live authentication uses the durable HttpOnly cookie session.
 */
export type DeprecatedPreviewWalletSessionAuthHeaders = Readonly<
  Record<ProtectedWalletSessionAuthHeaderName, string>
> & {
  readonly [deprecatedPreviewHeadersBrand]: "deprecated_non_live_preview";
};

/** @deprecated Use `DeprecatedPreviewWalletSessionAuthHeaders` only in explicit preview code. */
export type WalletSessionAuthHeaders = DeprecatedPreviewWalletSessionAuthHeaders;

/**
 * Transport headers produced by merging the deprecated preview authority with safe custom fields.
 * The nominal marker keeps this type out of live credential contracts.
 *
 * @deprecated Live requests use cookie credentials and ordinary non-authority transport headers.
 */
export type DeprecatedPreviewWalletSessionTransportHeaders = Readonly<
  Record<string, string>
> & {
  readonly [deprecatedPreviewTransportHeadersBrand]: "deprecated_non_live_preview";
};

/** @deprecated Header-requested roles are preview-only and have no live authority. */
export type WalletSessionRequestedRole = "participant" | "review_operator";

/**
 * Explicit capability required to retain the old issued-session demo in a non-live runtime.
 * The exported singleton is intentionally nominal and cannot represent a live credential.
 *
 * @deprecated Remove with the issued-session preview compatibility path.
 */
export interface DeprecatedNonLivePreviewWalletSessionAuthConfiguration {
  readonly authorityMode: "deprecated_non_live_preview";
  readonly liveCredential: false;
  readonly runtimeMode: "preview";
  readonly [deprecatedPreviewConfigurationBrand]: true;
}

/**
 * Explicit opt-in for disposable, non-live issued-session header demos.
 * Equivalent copied objects are rejected so live configuration cannot opt in accidentally.
 *
 * @deprecated Live authentication uses the durable HttpOnly cookie session.
 */
export const deprecatedNonLivePreviewWalletSessionAuthConfiguration = Object.freeze({
  authorityMode: "deprecated_non_live_preview",
  liveCredential: false,
  runtimeMode: "preview",
}) as DeprecatedNonLivePreviewWalletSessionAuthConfiguration;

export type WalletSessionAuthHeaderFailureCode =
  | "WALLET_SESSION_AUTH_HEADER_CONFLICT"
  | "WALLET_SESSION_AUTH_INVALID"
  | "WALLET_SESSION_AUTH_PREVIEW_CONFIGURATION_REQUIRED";

export interface WalletSessionAuthHeaderFailure {
  code: WalletSessionAuthHeaderFailureCode;
  field: string;
  ok: false;
}

/** @deprecated Successful caller-issued authority exists only in explicit non-live preview mode. */
export interface DeprecatedPreviewWalletSessionAuthHeaderSuccess {
  authorityMode: "deprecated_non_live_preview";
  headers: DeprecatedPreviewWalletSessionAuthHeaders;
  liveCredential: false;
  ok: true;
}

/** @deprecated Use `DeprecatedPreviewWalletSessionAuthHeaderSuccess` in preview-only code. */
export type WalletSessionAuthHeaderSuccess = DeprecatedPreviewWalletSessionAuthHeaderSuccess;

/** @deprecated Merged caller-issued authority exists only in explicit non-live preview mode. */
export interface DeprecatedPreviewWalletSessionAuthHeaderMergeSuccess {
  authorityMode: "deprecated_non_live_preview";
  headers: DeprecatedPreviewWalletSessionTransportHeaders;
  liveCredential: false;
  ok: true;
}

/** @deprecated Use `DeprecatedPreviewWalletSessionAuthHeaderMergeSuccess` in preview-only code. */
export type WalletSessionAuthHeaderMergeSuccess =
  DeprecatedPreviewWalletSessionAuthHeaderMergeSuccess;

/** @deprecated Caller-issued authority results are restricted to explicit non-live preview mode. */
export type DeprecatedPreviewWalletSessionAuthHeaderResult =
  | WalletSessionAuthHeaderFailure
  | DeprecatedPreviewWalletSessionAuthHeaderSuccess;

/** @deprecated Use `DeprecatedPreviewWalletSessionAuthHeaderResult` in preview-only code. */
export type WalletSessionAuthHeaderResult = DeprecatedPreviewWalletSessionAuthHeaderResult;

/** @deprecated Caller-issued authority results are restricted to explicit non-live preview mode. */
export type DeprecatedPreviewWalletSessionAuthHeaderMergeResult =
  | WalletSessionAuthHeaderFailure
  | DeprecatedPreviewWalletSessionAuthHeaderMergeSuccess;

/** @deprecated Use `DeprecatedPreviewWalletSessionAuthHeaderMergeResult` in preview-only code. */
export type WalletSessionAuthHeaderMergeResult =
  DeprecatedPreviewWalletSessionAuthHeaderMergeResult;

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
const callerAuthorityAliasHeaderNames = new Set([
  "authorization",
  "cookie",
  "proxy-authorization",
  "set-cookie",
  "x-account-type",
  "x-api-key",
  "x-auth-session-id",
  "x-capabilities",
  "x-capability",
  "x-chain-id",
  "x-network",
  "x-role",
  "x-roles",
  "x-session-id",
]);
const campaignAuthorityHeaderToken = /(?:^|-)(?:account|actor|address|api-key|auth|authentication|authorization|capability|capabilities|chain|credential|csrf|identity|member|membership|network|nonce|permission|principal|proof|role|roles|scope|session|signature|subject|token|user|wallet)(?:-|$)/;
const maxAuthorityValueLength = 256;
const maxCustomHeaderValueLength = 2_048;

export const isCallerControlledWalletAuthorityHeaderName = (value: unknown): boolean => {
  if (typeof value !== "string") {
    return false;
  }
  const name = value.trim().toLowerCase();

  return callerAuthorityAliasHeaderNames.has(name)
    || protectedHeaderNames.has(name)
    || name.startsWith("x-wallet-")
    || (
      name.startsWith("x-campaign-os-")
      && campaignAuthorityHeaderToken.test(name.slice("x-campaign-os-".length))
    );
};

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

const previewConfigurationRequired = (): WalletSessionAuthHeaderFailure => ({
  code: "WALLET_SESSION_AUTH_PREVIEW_CONFIGURATION_REQUIRED",
  field: "previewConfiguration",
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

const createPreviewWalletSessionAuthHeaders = (
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

    const headers = Object.freeze({
      "x-campaign-os-account-type": accountType,
      "x-campaign-os-credential-boundary": credentialBoundaryForSession(session),
      "x-campaign-os-proof-status": proofStatusForSession(session),
      "x-campaign-os-roles": requestedRole,
      "x-campaign-os-session-id": sessionId,
      "x-campaign-os-wallet-address": address,
      "x-campaign-os-wallet-source": walletSource,
    }) as DeprecatedPreviewWalletSessionAuthHeaders;

    return {
      authorityMode: "deprecated_non_live_preview",
      headers,
      liveCredential: false,
      ok: true,
    };
  } catch {
    return invalid("session");
  }
};

/**
 * Creates caller-issued compatibility headers only after an explicit non-live preview opt-in.
 * Live code must use the durable cookie session and current server-side policy instead.
 *
 * @deprecated Retained only for explicit non-live preview demos.
 */
export const createDeprecatedPreviewWalletSessionAuthHeaders = (
  value: NormalizedWalletSession | unknown,
  previewConfiguration: DeprecatedNonLivePreviewWalletSessionAuthConfiguration,
  requestedRole: WalletSessionRequestedRole = "participant",
): DeprecatedPreviewWalletSessionAuthHeaderResult =>
  previewConfiguration === deprecatedNonLivePreviewWalletSessionAuthConfiguration
    ? createPreviewWalletSessionAuthHeaders(value, requestedRole)
    : previewConfigurationRequired();

/**
 * Legacy constructor intentionally fails closed. Migrate preview-only callers to
 * `createDeprecatedPreviewWalletSessionAuthHeaders` with the explicit preview singleton.
 *
 * @deprecated Caller-issued headers are not live credentials.
 */
export const createWalletSessionAuthHeaders = (
  _value: NormalizedWalletSession | unknown,
  _requestedRole: WalletSessionRequestedRole = "participant",
): WalletSessionAuthHeaderResult => previewConfigurationRequired();

const mergePreviewWalletSessionAuthHeaders = (
  authHeaders: DeprecatedPreviewWalletSessionAuthHeaders,
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

      if (isCallerControlledWalletAuthorityHeaderName(name)
        || requestProtectedHeaderNames.has(name)) {
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
      authorityMode: "deprecated_non_live_preview",
      headers: Object.freeze(merged) as DeprecatedPreviewWalletSessionTransportHeaders,
      liveCredential: false,
      ok: true,
    };
  } catch {
    return invalid("headers");
  }
};

/**
 * Merges preview compatibility headers only after the same explicit non-live opt-in.
 * The returned transport headers remain non-authoritative in every live composition.
 *
 * @deprecated Retained only for explicit non-live preview demos.
 */
export const mergeDeprecatedPreviewWalletSessionAuthHeaders = (
  authHeaders: DeprecatedPreviewWalletSessionAuthHeaders,
  previewConfiguration: DeprecatedNonLivePreviewWalletSessionAuthConfiguration,
  customHeaders?: HeadersInit,
  additionalProtectedHeaderNames: readonly string[] = [],
): DeprecatedPreviewWalletSessionAuthHeaderMergeResult =>
  previewConfiguration === deprecatedNonLivePreviewWalletSessionAuthConfiguration
    ? mergePreviewWalletSessionAuthHeaders(
      authHeaders,
      customHeaders,
      additionalProtectedHeaderNames,
    )
    : previewConfigurationRequired();

/**
 * Legacy merge intentionally fails closed so pre-existing header objects cannot bypass the
 * explicit preview boundary.
 *
 * @deprecated Caller-issued headers are not live credentials.
 */
export const mergeWalletSessionAuthHeaders = (
  _authHeaders: WalletSessionAuthHeaders,
  _customHeaders?: HeadersInit,
  _additionalProtectedHeaderNames: readonly string[] = [],
): WalletSessionAuthHeaderMergeResult => previewConfigurationRequired();
