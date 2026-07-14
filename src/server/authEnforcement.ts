import { randomUUID } from "node:crypto";
import {
  authSessionRolePolicyById,
  getProtectedRouteAuth,
  resolveTrustedAdminOperatorSession,
  type AdminOperatorSessionCompatibilityClaims,
  type AuthRoleCapabilityId,
  type AuthRouteGroupId,
  type AuthSessionAccountType,
  type AuthSessionCredentialBoundary,
  type AuthSessionRoleId,
  type AuthSessionWalletSource,
  type ProtectedRouteAuthMapEntry,
  type ProductionAuthSessionDependencyId,
  type SessionProofStatus,
} from "./authSession";
import type {
  AdminOperatorMembershipRegistry,
  AuthorizedAdminOperatorMembershipContext,
} from "./adminOperatorMembership";
import {
  isCanonicalCampaignId,
  type CampaignOsAdminOperatorRoleId,
} from "./config";
import type {
  WalletSessionRecord,
  WalletSessionRepository,
} from "./walletSessionRepository";
import type {
  WalletCapability,
  WalletNetwork,
} from "../domain/types";

export type AuthRuntimeHeaders = Record<string, string | readonly string[] | undefined>;
export type AuthEnforcementDecisionStatus =
  | "allowed"
  | "not_required"
  | "unauthenticated"
  | "forbidden";
export type AuthEnforcementDiagnosticCode =
  | "AUTH_SESSION_REQUIRED"
  | "AUTH_SESSION_INVALID"
  | "AUTH_FORBIDDEN"
  | "AUTH_SUBJECT_MISMATCH"
  | "AUTH_ROLE_FORBIDDEN"
  | "AUTH_OWNER_MISMATCH"
  | "AUTH_AGENT_CREDENTIAL_FORBIDDEN"
  | "AUTH_OWNERSHIP_SOURCE_MISSING"
  | "AUTH_PROOF_FORBIDDEN";

export interface LocalAuthSession {
  accountType: AuthSessionAccountType;
  address: string;
  capabilities?: WalletCapability[];
  chainId?: string;
  credentialBoundary: AuthSessionCredentialBoundary;
  internalAutomation: boolean;
  network?: WalletNetwork;
  proofStatus: SessionProofStatus;
  roleIds: AuthSessionRoleId[];
  sessionId: string;
  walletSource: AuthSessionWalletSource;
}

export interface AuthEnforcementDiagnostic {
  code: AuthEnforcementDiagnosticCode;
  field: string;
  message: string;
}

export interface ProjectOwnershipSources {
  membershipSourceReady: boolean;
  ownershipSourceReady: boolean;
}

export interface AuthEnforcementSanitizedDetails {
  redactedFieldCount: number;
  redactionApplied: boolean;
  safeDetails: Record<string, unknown>;
}

export interface RbacOwnershipRoutePolicy {
  forbiddenCapabilities: readonly AuthRoleCapabilityId[];
  forbiddenCredentialBoundaries: readonly AuthSessionCredentialBoundary[];
  locallyEnforced: boolean;
  ownerMatchRequired: boolean;
  productionDependencyIds: readonly ProductionAuthSessionDependencyId[];
  requiredRoles: readonly AuthSessionRoleId[];
  routeGroup: AuthRouteGroupId;
  routeIds: readonly string[];
}

export type ParseLocalAuthSessionResult =
  | {
      ok: true;
      session: LocalAuthSession;
    }
  | {
      diagnostic: AuthEnforcementDiagnostic;
      ok: false;
      reason: "missing" | "invalid";
    };

export interface EvaluateAuthEnforcementOptions {
  headers?: AuthRuntimeHeaders;
  ownerAddress?: string;
  ownerSources?: ProjectOwnershipSources;
  routeId: string;
}

export type IssuedSessionLookup = Pick<WalletSessionRepository, "getBySessionId">["getBySessionId"];

export interface EvaluateIssuedAuthEnforcementOptions extends EvaluateAuthEnforcementOptions {
  compatibilitySubject?: ParticipantCompatibilitySubject;
  issuedSessionLookup: IssuedSessionLookup;
  traceId?: string;
}

export type AdminOperatorRouteId =
  | "admin.campaigns.list"
  | "admin.reviews.list"
  | "admin.reviews.detail"
  | "admin.reviews.decide"
  | "admin.winners.list"
  | "admin.artifacts.generate"
  | "admin.artifacts.list"
  | "admin.artifacts.detail"
  | "admin.artifacts.download";

export interface AdminOperatorRoutePolicy {
  allowedRoles: readonly CampaignOsAdminOperatorRoleId[];
  campaignScope: "membership_feed" | "campaign_path";
  credentialBoundary: "ordinary_user_wallet";
  enforcementStatus: "local_enforced";
  membershipRequired: true;
  routeId: AdminOperatorRouteId;
  sessionRequired: true;
}

export interface AuthorizedAdminOperatorContext
  extends AuthorizedAdminOperatorMembershipContext {
  accountType: AuthSessionAccountType;
  chainId: string;
  credentialBoundary: "ordinary_user_wallet";
  issuerMode: NonNullable<WalletSessionRecord["issuer"]>["issuerMode"];
  network: WalletNetwork;
  proofStatus: "local_seeded" | "verified";
  sessionId: string;
  walletSource: AuthSessionWalletSource;
}

export interface EvaluateAdminOperatorEnforcementOptions {
  campaignId?: string;
  headers?: AuthRuntimeHeaders;
  issuedSessionLookup: IssuedSessionLookup;
  membershipRegistry: AdminOperatorMembershipRegistry;
  routeId: string;
  traceId?: string;
}

export interface CanonicalWalletSubject {
  chainId: string;
  walletAddress: string;
}

export interface ParticipantCompatibilitySubject {
  accountType?: AuthSessionAccountType;
  chainId?: string;
  network?: WalletNetwork;
  walletAddress?: string;
  walletSource?: AuthSessionWalletSource;
}

export interface AuthEnforcementDecision {
  adminOperator?: Readonly<AuthorizedAdminOperatorContext>;
  allowed: boolean;
  diagnostic?: AuthEnforcementDiagnostic;
  httpStatus?: 401 | 403;
  matchedRoles: AuthSessionRoleId[];
  requiredRoles: AuthSessionRoleId[];
  routeAuth?: ProtectedRouteAuthMapEntry;
  routeId: string;
  safeDetails: Record<string, unknown>;
  session?: LocalAuthSession;
  status: AuthEnforcementDecisionStatus;
}

const localAuthHeaderNames = {
  accountType: "x-campaign-os-account-type",
  credentialBoundary: "x-campaign-os-credential-boundary",
  proofStatus: "x-campaign-os-proof-status",
  roles: "x-campaign-os-roles",
  sessionId: "x-campaign-os-session-id",
  walletAddress: "x-campaign-os-wallet-address",
  walletSource: "x-campaign-os-wallet-source",
} as const;

const accountTypes = ["AA", "EOA", "UNKNOWN"] as const satisfies readonly AuthSessionAccountType[];
const credentialBoundaries = [
  "ordinary_user_wallet",
  "internal_agent_credential",
] as const satisfies readonly AuthSessionCredentialBoundary[];
const walletSources = [
  "PORTKEY_AA",
  "PORTKEY_EOA_APP",
  "PORTKEY_EOA_EXTENSION",
  "NIGHTELF",
  "AGENT_SKILL",
  "OTHER",
] as const satisfies readonly AuthSessionWalletSource[];
const proofStatuses = [
  "local_seeded",
  "proof_required",
  "signature_unverified",
  "stale",
  "verified",
  "blocked",
] as const satisfies readonly SessionProofStatus[];
const locallyAcceptedProofStatuses = new Set<SessionProofStatus>(["local_seeded", "verified"]);
const ownerRouteRequiredCapability: WalletCapability = "SIGN_MESSAGE";
const adminOperatorRoles = Object.freeze([
  "internal_operator",
  "review_operator",
] satisfies CampaignOsAdminOperatorRoleId[]);

const adminOperatorPolicy = (
  routeId: AdminOperatorRouteId,
  campaignScope: AdminOperatorRoutePolicy["campaignScope"],
): Readonly<AdminOperatorRoutePolicy> => Object.freeze({
  allowedRoles: adminOperatorRoles,
  campaignScope,
  credentialBoundary: "ordinary_user_wallet",
  enforcementStatus: "local_enforced",
  membershipRequired: true,
  routeId,
  sessionRequired: true,
});

export const adminOperatorRoutePolicies = Object.freeze([
  adminOperatorPolicy("admin.campaigns.list", "membership_feed"),
  adminOperatorPolicy("admin.reviews.list", "campaign_path"),
  adminOperatorPolicy("admin.reviews.detail", "campaign_path"),
  adminOperatorPolicy("admin.reviews.decide", "campaign_path"),
  adminOperatorPolicy("admin.winners.list", "campaign_path"),
  adminOperatorPolicy("admin.artifacts.generate", "campaign_path"),
  adminOperatorPolicy("admin.artifacts.list", "campaign_path"),
  adminOperatorPolicy("admin.artifacts.detail", "campaign_path"),
  adminOperatorPolicy("admin.artifacts.download", "campaign_path"),
]);

const adminOperatorRoutePolicyById = new Map<string, Readonly<AdminOperatorRoutePolicy>>(
  adminOperatorRoutePolicies.map((policy) => [policy.routeId, policy]),
);

const isAdminOperatorRouteFamily = (routeId: string) => routeId.startsWith("admin.");

export const getAdminOperatorRoutePolicy = (
  routeId: string,
): Readonly<AdminOperatorRoutePolicy> | undefined => adminOperatorRoutePolicyById.get(routeId);

const authEnforcementProductionDependencyIds = [
  "rbac_enforcement_policy",
  "project_membership_source",
  "project_ownership_source",
] as const satisfies readonly ProductionAuthSessionDependencyId[];

export const projectOwnershipReadinessPolicy = {
  ownerMatchRequired: true,
  productionDependencyIds: [
    "project_membership_source",
    "project_ownership_source",
  ],
} as const satisfies {
  ownerMatchRequired: true;
  productionDependencyIds: readonly ProductionAuthSessionDependencyId[];
};

const routePolicy = (policy: RbacOwnershipRoutePolicy): RbacOwnershipRoutePolicy => policy;

export const rbacOwnershipRoutePolicyMatrix = [
  routePolicy({
    forbiddenCapabilities: [],
    forbiddenCredentialBoundaries: [],
    locallyEnforced: false,
    ownerMatchRequired: false,
    productionDependencyIds: [...authEnforcementProductionDependencyIds],
    requiredRoles: [],
    routeGroup: "runtime_metadata",
    routeIds: ["runtime.health", "runtime.contracts"],
  }),
  routePolicy({
    forbiddenCapabilities: [],
    forbiddenCredentialBoundaries: [],
    locallyEnforced: false,
    ownerMatchRequired: false,
    productionDependencyIds: [...authEnforcementProductionDependencyIds],
    requiredRoles: [],
    routeGroup: "wallet_session",
    routeIds: ["wallet.session.create"],
  }),
  routePolicy({
    forbiddenCapabilities: ["wallet:user_substitution"],
    forbiddenCredentialBoundaries: ["internal_agent_credential"],
    locallyEnforced: true,
    ownerMatchRequired: false,
    productionDependencyIds: [...authEnforcementProductionDependencyIds],
    requiredRoles: [],
    routeGroup: "campaign_read",
    routeIds: [
      "campaigns.list",
      "campaigns.detail",
      "campaigns.analytics",
      "campaigns.participant.list",
      "campaigns.participant.journey",
      "campaigns.points.ranking.ledger.runtime",
    ],
  }),
  routePolicy({
    forbiddenCapabilities: ["wallet:user_substitution"],
    forbiddenCredentialBoundaries: ["internal_agent_credential"],
    locallyEnforced: true,
    ownerMatchRequired: true,
    productionDependencyIds: [...authEnforcementProductionDependencyIds],
    requiredRoles: ["project_owner"],
    routeGroup: "campaign_write",
    routeIds: ["campaigns.create", "campaigns.owner.list", "campaigns.owner.detail"],
  }),
  routePolicy({
    forbiddenCapabilities: ["wallet:user_substitution"],
    forbiddenCredentialBoundaries: ["internal_agent_credential"],
    locallyEnforced: true,
    ownerMatchRequired: true,
    productionDependencyIds: [...authEnforcementProductionDependencyIds],
    requiredRoles: ["project_owner"],
    routeGroup: "task_builder",
    routeIds: ["campaigns.tasks.add", "campaigns.tasks.generate"],
  }),
  routePolicy({
    forbiddenCapabilities: ["wallet:user_substitution"],
    forbiddenCredentialBoundaries: ["internal_agent_credential"],
    locallyEnforced: true,
    ownerMatchRequired: false,
    productionDependencyIds: [...authEnforcementProductionDependencyIds],
    requiredRoles: ["participant"],
    routeGroup: "task_verify",
    routeIds: ["tasks.verify"],
  }),
  routePolicy({
    forbiddenCapabilities: ["wallet:user_substitution"],
    forbiddenCredentialBoundaries: ["internal_agent_credential"],
    locallyEnforced: true,
    ownerMatchRequired: false,
    productionDependencyIds: [...authEnforcementProductionDependencyIds],
    requiredRoles: ["participant"],
    routeGroup: "eligibility",
    routeIds: ["campaigns.eligibility"],
  }),
  routePolicy({
    forbiddenCapabilities: ["payout:execute", "reward:custody"],
    forbiddenCredentialBoundaries: [],
    locallyEnforced: false,
    ownerMatchRequired: false,
    productionDependencyIds: [...authEnforcementProductionDependencyIds],
    requiredRoles: ["project_owner", "internal_operator"],
    routeGroup: "export",
    routeIds: ["campaigns.export.preview"],
  }),
  routePolicy({
    forbiddenCapabilities: ["campaign:ownership_mutation", "payout:execute", "reward:custody"],
    forbiddenCredentialBoundaries: ["ordinary_user_wallet"],
    locallyEnforced: false,
    ownerMatchRequired: false,
    productionDependencyIds: [...authEnforcementProductionDependencyIds],
    requiredRoles: ["internal_operator", "review_operator"],
    routeGroup: "admin_review",
    routeIds: ["admin.review.queue"],
  }),
  routePolicy({
    forbiddenCapabilities: ["campaign:ownership_mutation", "payout:execute", "reward:custody"],
    forbiddenCredentialBoundaries: ["ordinary_user_wallet"],
    locallyEnforced: false,
    ownerMatchRequired: false,
    productionDependencyIds: [...authEnforcementProductionDependencyIds],
    requiredRoles: ["internal_operator", "review_operator"],
    routeGroup: "risk",
    routeIds: ["risk.review.queue"],
  }),
  routePolicy({
    forbiddenCapabilities: ["campaign:ownership_mutation", "payout:execute", "reward:custody"],
    forbiddenCredentialBoundaries: [],
    locallyEnforced: false,
    ownerMatchRequired: false,
    productionDependencyIds: [...authEnforcementProductionDependencyIds],
    requiredRoles: ["internal_operator", "ai_worker"],
    routeGroup: "service_readiness",
    routeIds: ["runtime.services"],
  }),
  routePolicy({
    forbiddenCapabilities: ["wallet:live_sign", "wallet:user_substitution"],
    forbiddenCredentialBoundaries: ["ordinary_user_wallet"],
    locallyEnforced: false,
    ownerMatchRequired: false,
    productionDependencyIds: [...authEnforcementProductionDependencyIds],
    requiredRoles: ["ai_worker"],
    routeGroup: "ai_ops",
    routeIds: ["agent.skill.internal", "campaigns.i18n.generate"],
  }),
] as const satisfies readonly RbacOwnershipRoutePolicy[];

const rbacOwnershipRoutePolicyByGroup = Object.fromEntries(
  rbacOwnershipRoutePolicyMatrix.map((policy) => [policy.routeGroup, policy]),
) as Record<AuthRouteGroupId, RbacOwnershipRoutePolicy>;

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
const sensitiveValueFragments = [
  "bearer",
  "cookiesecret",
  "jwtsecret",
  "mnemonic",
  "noncesecret",
  "privatekey",
  "rawsignature",
  "secretkey",
  "secrettoken",
  "seedphrase",
  "signedurl",
  "token",
];

const normalizeSensitiveToken = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const isSensitiveKey = (key: string) => {
  const normalizedKey = normalizeSensitiveToken(key);

  return sensitiveKeyFragments.some((fragment) => normalizedKey.includes(fragment));
};

const hasSignedUrlQuery = (value: string) =>
  /^https?:\/\//i.test(value)
  && /[?&](access_token|authorization|credential|signature|token|x-amz-signature)=/i.test(value);

const isSensitiveStringValue = (value: string) => {
  const normalizedValue = normalizeSensitiveToken(value);

  return (
    /\bbearer\s+\S+/i.test(value)
    || /\b[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/.test(value)
    || /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/i.test(value)
    || hasSignedUrlQuery(value)
    || sensitiveValueFragments.some((fragment) => normalizedValue.includes(fragment))
  );
};

export const sanitizeAuthEnforcementDetails = (
  details: Record<string, unknown>,
): AuthEnforcementSanitizedDetails => {
  let redactedFieldCount = 0;

  const sanitize = (input: unknown): unknown => {
    if (typeof input === "string") {
      if (isSensitiveStringValue(input)) {
        redactedFieldCount += 1;

        return redactedPlaceholder;
      }

      return input;
    }

    if (input === null || typeof input !== "object") {
      return input;
    }

    if (Array.isArray(input)) {
      return input.map((item) => sanitize(item));
    }

    const entries = Object.entries(input).flatMap(([key, value]) => {
      if (isSensitiveKey(key)) {
        if (normalizeSensitiveToken(key) !== "jwt") {
          redactedFieldCount += 1;
        }

        return [];
      }

      const safeValue = sanitize(value);

      return [[key, safeValue] as const];
    });

    return Object.fromEntries(entries);
  };

  const safeDetails = sanitize(details);

  return {
    redactedFieldCount,
    redactionApplied: redactedFieldCount > 0,
    safeDetails: safeDetails !== null && typeof safeDetails === "object" && !Array.isArray(safeDetails)
      ? safeDetails as Record<string, unknown>
      : {},
  };
};

const invalidSessionDiagnostic = (
  field: string,
  message: string,
): AuthEnforcementDiagnostic => ({
  code: "AUTH_SESSION_INVALID",
  field,
  message,
});

const hasValue = (value: string | undefined): value is string => Boolean(value && value.trim());

const getHeader = (
  headers: AuthRuntimeHeaders | undefined,
  name: string,
): string | undefined => {
  if (!headers) {
    return undefined;
  }

  const normalizedName = name.toLowerCase();
  const value = Object.entries(headers).find(([key]) => key.toLowerCase() === normalizedName)?.[1];
  const firstValue = Array.isArray(value) ? value[0] : value;

  return typeof firstValue === "string" && firstValue.trim() ? firstValue.trim() : undefined;
};

const parseEnum = <TValue extends string>(
  value: string | undefined,
  allowedValues: readonly TValue[],
  fallback: TValue,
  field: string,
): TValue | AuthEnforcementDiagnostic => {
  if (!value) {
    return fallback;
  }

  return allowedValues.includes(value as TValue)
    ? value as TValue
    : invalidSessionDiagnostic(field, `Unsupported local auth session value for ${field}.`);
};

const isDiagnostic = (value: unknown): value is AuthEnforcementDiagnostic =>
  value !== null && typeof value === "object" && "code" in value && "field" in value;

const parseRoles = (rolesHeader: string | undefined): AuthSessionRoleId[] | AuthEnforcementDiagnostic => {
  if (!rolesHeader) {
    return invalidSessionDiagnostic(localAuthHeaderNames.roles, "Local auth session roles are required.");
  }

  const roleIds = rolesHeader
    .split(",")
    .map((roleId) => roleId.trim())
    .filter(Boolean);

  if (roleIds.length === 0) {
    return invalidSessionDiagnostic(localAuthHeaderNames.roles, "Local auth session roles are required.");
  }

  const unknownRoleId = roleIds.find((roleId) => !(roleId in authSessionRolePolicyById));

  if (unknownRoleId) {
    return invalidSessionDiagnostic(localAuthHeaderNames.roles, "Local auth session contains an unsupported role.");
  }

  return Array.from(new Set(roleIds)) as AuthSessionRoleId[];
};

const normalizeAuthAddress = (value: string | undefined) => value?.trim() ?? "";

export const canonicalizeWalletSubject = (
  subject: CanonicalWalletSubject,
): CanonicalWalletSubject => Object.freeze({
  chainId: subject.chainId.trim(),
  walletAddress: normalizeAuthAddress(subject.walletAddress),
});

export const canonicalWalletSubjectsMatch = (
  issuedSubject: CanonicalWalletSubject,
  claimedSubject: CanonicalWalletSubject,
) => {
  const issued = canonicalizeWalletSubject(issuedSubject);
  const claimed = canonicalizeWalletSubject(claimedSubject);

  return issued.chainId === claimed.chainId
    && issued.walletAddress === claimed.walletAddress;
};

const proofStatusFromIssuedRecord = (
  issuedRecord: WalletSessionRecord,
): SessionProofStatus => {
  if (issuedRecord.proof) {
    const issuedProofStatus = issuedRecord.proof.status as SessionProofStatus;

    return proofStatuses.includes(issuedProofStatus) ? issuedProofStatus : "blocked";
  }

  return issuedRecord.verificationStatus === "verified" ? "verified" : "signature_unverified";
};

const issuerInvalidDiagnostic = (): AuthEnforcementDiagnostic => ({
  code: "AUTH_SESSION_INVALID",
  field: "authSession.issuer",
  message: "Issued wallet session issuer metadata is missing or invalid.",
});

const issuedSessionIdentityDiagnostic = (
  field: string,
): AuthEnforcementDiagnostic => ({
  code: "AUTH_SESSION_INVALID",
  field,
  message: "Issued wallet session identity does not match the caller auth headers.",
});

const credentialBoundaryFromIssuedRecord = (
  issuedRecord: WalletSessionRecord,
): AuthSessionCredentialBoundary =>
  issuedRecord.walletSource === "AGENT_SKILL"
  || issuedRecord.capabilities.includes("INTERNAL_AUTOMATION")
    ? "internal_agent_credential"
    : "ordinary_user_wallet";

const participantSubjectMismatchDiagnostic = (
  field: keyof ParticipantCompatibilitySubject,
): AuthEnforcementDiagnostic => ({
  code: "AUTH_SUBJECT_MISMATCH",
  field,
  message: "Participant compatibility subject does not match the issued wallet session.",
});

export const evaluateParticipantCompatibilitySubject = (
  issuedSession: LocalAuthSession,
  compatibilitySubject: ParticipantCompatibilitySubject | undefined,
): AuthEnforcementDiagnostic | undefined => {
  if (!compatibilitySubject) {
    return undefined;
  }

  if (
    compatibilitySubject.walletAddress !== undefined
    && !canonicalWalletSubjectsMatch(
      {
        chainId: issuedSession.chainId ?? "",
        walletAddress: issuedSession.address,
      },
      {
        chainId: issuedSession.chainId ?? "",
        walletAddress: compatibilitySubject.walletAddress,
      },
    )
  ) {
    return participantSubjectMismatchDiagnostic("walletAddress");
  }

  const exactFields = [
    ["accountType", issuedSession.accountType, compatibilitySubject.accountType],
    ["walletSource", issuedSession.walletSource, compatibilitySubject.walletSource],
    ["chainId", issuedSession.chainId, compatibilitySubject.chainId?.trim()],
    ["network", issuedSession.network, compatibilitySubject.network],
  ] as const;
  const mismatch = exactFields.find(([, issuedValue, claimedValue]) =>
    claimedValue !== undefined && claimedValue !== issuedValue
  );

  return mismatch ? participantSubjectMismatchDiagnostic(mismatch[0]) : undefined;
};

const issuedSessionToLocalAuthSession = (
  parsedSession: LocalAuthSession,
  issuedRecord: WalletSessionRecord,
): LocalAuthSession | AuthEnforcementDiagnostic => {
  if (!issuedRecord.issuer?.valid) {
    return issuerInvalidDiagnostic();
  }

  if (issuedRecord.sessionId !== parsedSession.sessionId) {
    return issuedSessionIdentityDiagnostic(localAuthHeaderNames.sessionId);
  }

  if (!canonicalWalletSubjectsMatch(
    {
      chainId: issuedRecord.chainId,
      walletAddress: issuedRecord.walletAddress,
    },
    {
      chainId: issuedRecord.chainId,
      walletAddress: parsedSession.address,
    },
  )) {
    return issuedSessionIdentityDiagnostic(localAuthHeaderNames.walletAddress);
  }

  if (issuedRecord.accountType !== parsedSession.accountType) {
    return issuedSessionIdentityDiagnostic(localAuthHeaderNames.accountType);
  }

  if (issuedRecord.walletSource !== parsedSession.walletSource) {
    return issuedSessionIdentityDiagnostic(localAuthHeaderNames.walletSource);
  }

  const credentialBoundary = credentialBoundaryFromIssuedRecord(issuedRecord);

  if (
    credentialBoundary === "ordinary_user_wallet"
    && parsedSession.credentialBoundary !== credentialBoundary
  ) {
    return issuedSessionIdentityDiagnostic(localAuthHeaderNames.credentialBoundary);
  }

  return {
    ...parsedSession,
    accountType: issuedRecord.accountType,
    address: issuedRecord.walletAddress,
    capabilities: [...issuedRecord.capabilities],
    chainId: issuedRecord.chainId,
    credentialBoundary,
    internalAutomation: credentialBoundary === "internal_agent_credential",
    network: issuedRecord.network,
    proofStatus: proofStatusFromIssuedRecord(issuedRecord),
    walletSource: issuedRecord.walletSource,
  };
};

export const parseLocalAuthSessionHeaders = (
  headers?: AuthRuntimeHeaders,
): ParseLocalAuthSessionResult => {
  const sessionId = getHeader(headers, localAuthHeaderNames.sessionId);
  const address = getHeader(headers, localAuthHeaderNames.walletAddress);
  const rolesHeader = getHeader(headers, localAuthHeaderNames.roles);

  if (!sessionId && !address && !rolesHeader) {
    return {
      diagnostic: {
        code: "AUTH_SESSION_REQUIRED",
        field: localAuthHeaderNames.sessionId,
        message: "A local auth session is required for this route.",
      },
      ok: false,
      reason: "missing",
    };
  }

  if (!hasValue(sessionId)) {
    return {
      diagnostic: {
        code: "AUTH_SESSION_REQUIRED",
        field: localAuthHeaderNames.sessionId,
        message: "A local auth session id is required for this route.",
      },
      ok: false,
      reason: "missing",
    };
  }

  if (!hasValue(address)) {
    return {
      diagnostic: invalidSessionDiagnostic(
        localAuthHeaderNames.walletAddress,
        "Local auth wallet address is required.",
      ),
      ok: false,
      reason: "invalid",
    };
  }

  const roleIds = parseRoles(rolesHeader);
  const accountType = parseEnum(
    getHeader(headers, localAuthHeaderNames.accountType),
    accountTypes,
    "UNKNOWN",
    localAuthHeaderNames.accountType,
  );
  const walletSource = parseEnum(
    getHeader(headers, localAuthHeaderNames.walletSource),
    walletSources,
    "OTHER",
    localAuthHeaderNames.walletSource,
  );
  const proofStatus = parseEnum(
    getHeader(headers, localAuthHeaderNames.proofStatus),
    proofStatuses,
    "local_seeded",
    localAuthHeaderNames.proofStatus,
  );
  const credentialBoundary = parseEnum(
    getHeader(headers, localAuthHeaderNames.credentialBoundary),
    credentialBoundaries,
    "ordinary_user_wallet",
    localAuthHeaderNames.credentialBoundary,
  );
  const parsedValues = [roleIds, accountType, walletSource, proofStatus, credentialBoundary];
  const diagnostic = parsedValues.find(isDiagnostic);

  if (diagnostic) {
    return {
      diagnostic,
      ok: false,
      reason: "invalid",
    };
  }

  return {
    ok: true,
    session: {
      accountType: accountType as AuthSessionAccountType,
      address,
      credentialBoundary: credentialBoundary as AuthSessionCredentialBoundary,
      internalAutomation: credentialBoundary === "internal_agent_credential",
      proofStatus: proofStatus as SessionProofStatus,
      roleIds: roleIds as AuthSessionRoleId[],
      sessionId,
      walletSource: walletSource as AuthSessionWalletSource,
    },
  };
};

const decision = (
  input: Omit<AuthEnforcementDecision, "allowed" | "matchedRoles" | "requiredRoles" | "safeDetails"> & {
    matchedRoles?: AuthSessionRoleId[];
    requiredRoles?: AuthSessionRoleId[];
    safeDetails?: Record<string, unknown>;
  },
): AuthEnforcementDecision => ({
  allowed: input.status === "allowed" || input.status === "not_required",
  matchedRoles: input.matchedRoles ?? [],
  requiredRoles: input.requiredRoles ?? [],
  ...input,
  safeDetails: sanitizeAuthEnforcementDetails(input.safeDetails ?? {}).safeDetails,
});

const withTraceId = (
  authDecision: AuthEnforcementDecision,
  traceId: string | undefined,
): AuthEnforcementDecision => {
  if (!traceId) {
    return authDecision;
  }

  return {
    ...authDecision,
    safeDetails: sanitizeAuthEnforcementDetails({
      ...authDecision.safeDetails,
      traceId,
    }).safeDetails,
  };
};

const forbiddenDecision = ({
  code,
  extraDetails = {},
  field,
  message,
  matchedRoles,
  requiredRoles,
  routeAuth,
  routeId,
}: {
  code: AuthEnforcementDiagnosticCode;
  extraDetails?: Record<string, unknown>;
  field: string;
  matchedRoles: AuthSessionRoleId[];
  message: string;
  requiredRoles: AuthSessionRoleId[];
  routeAuth: ProtectedRouteAuthMapEntry;
  routeId: string;
}) => decision({
  diagnostic: { code, field, message },
  httpStatus: 403,
  matchedRoles,
  requiredRoles,
  routeAuth,
  routeId,
  safeDetails: {
    matchedRoles,
    requiredRoles,
    routeId,
    ...extraDetails,
  },
  status: "forbidden",
});

const evaluateResolvedAuthSession = ({
  ownerAddress,
  ownerSources,
  routeAuth,
  routeId,
  routePolicy,
  session,
}: {
  ownerAddress?: string;
  ownerSources?: ProjectOwnershipSources;
  routeAuth: ProtectedRouteAuthMapEntry;
  routeId: string;
  routePolicy?: RbacOwnershipRoutePolicy;
  session: LocalAuthSession;
}): AuthEnforcementDecision => {
  const requiredRoles = routeAuth.requiredRoles;
  const matchedRoles = session.roleIds.filter((roleId) => requiredRoles.includes(roleId));
  const participantRoute = requiredRoles.includes("participant");
  const forbidden = (
    code: AuthEnforcementDiagnosticCode,
    field: string,
    message: string,
    extraDetails: Record<string, unknown> = {},
  ) => forbiddenDecision({
    code,
    extraDetails,
    field,
    matchedRoles,
    message,
    requiredRoles,
    routeAuth,
    routeId,
  });

  if (routePolicy?.forbiddenCredentialBoundaries.includes(session.credentialBoundary)) {
    return forbidden(
      participantRoute
        ? "AUTH_FORBIDDEN"
        : session.credentialBoundary === "internal_agent_credential"
        ? "AUTH_AGENT_CREDENTIAL_FORBIDDEN"
        : "AUTH_ROLE_FORBIDDEN",
      "authSession.credentialBoundary",
      session.credentialBoundary === "internal_agent_credential"
        ? "Internal agent credentials cannot substitute for ordinary participant or project owner wallet sessions."
        : "This credential boundary is not allowed for the protected route.",
      {
        credentialBoundary: session.credentialBoundary,
        routeGroup: routeAuth.routeGroup,
      },
    );
  }

  if (routeAuth.proofRequired && !locallyAcceptedProofStatuses.has(session.proofStatus)) {
    return forbidden(
      participantRoute ? "AUTH_FORBIDDEN" : "AUTH_PROOF_FORBIDDEN",
      "authSession.proofStatus",
      "Local auth session proof status is not accepted for this route.",
      { proofStatus: session.proofStatus },
    );
  }

  if (routeAuth.proofRequired && session.capabilities && !session.capabilities.includes(ownerRouteRequiredCapability)) {
    return forbidden(
      "AUTH_FORBIDDEN",
      "authSession.capabilities",
      "Issued wallet session does not include the capability required for this protected route.",
      { requiredCapability: ownerRouteRequiredCapability },
    );
  }

  if (requiredRoles.length > 0 && matchedRoles.length === 0) {
    return forbidden(
      participantRoute ? "AUTH_FORBIDDEN" : "AUTH_ROLE_FORBIDDEN",
      "authSession.roleIds",
      "The local auth session does not include a role allowed for this route.",
      { sessionRoleCount: session.roleIds.length },
    );
  }

  if (routePolicy?.ownerMatchRequired) {
    const trimmedOwnerAddress = ownerAddress?.trim();

    if (ownerSources && !trimmedOwnerAddress) {
      return forbidden(
        "AUTH_OWNER_MISMATCH",
        "ownerAddress",
        "Owner mutation requires an owner address matching the authenticated local session.",
        { ownerMatchRequired: true },
      );
    }

    if (trimmedOwnerAddress && normalizeAuthAddress(trimmedOwnerAddress) !== normalizeAuthAddress(session.address)) {
      return forbidden(
        "AUTH_OWNER_MISMATCH",
        "ownerAddress",
        "Campaign owner address must match the authenticated local session address.",
        { ownerMatchRequired: true },
      );
    }

    if (ownerSources) {
      const blockedDependencyIds = [
        ...(!ownerSources.membershipSourceReady ? ["project_membership_source" as const] : []),
        ...(!ownerSources.ownershipSourceReady ? ["project_ownership_source" as const] : []),
      ];

      if (blockedDependencyIds.length > 0) {
        return forbidden(
          "AUTH_OWNERSHIP_SOURCE_MISSING",
          "authSession.ownershipSource",
          "Owner mutation requires project membership and ownership sources.",
          {
            blockedDependencyIds,
            ownerMutationBlocked: true,
          },
        );
      }
    }
  }

  return decision({
    matchedRoles,
    requiredRoles,
    routeAuth,
    routeId,
    safeDetails: {
      matchedRoles,
      requiredRoles,
      routeId,
    },
    session,
    status: "allowed",
  });
};

export const evaluateAuthEnforcement = ({
  headers,
  ownerAddress,
  ownerSources,
  routeId,
}: EvaluateAuthEnforcementOptions): AuthEnforcementDecision => {
  if (isAdminOperatorRouteFamily(routeId)) {
    return decision({
      diagnostic: {
        code: "AUTH_FORBIDDEN",
        field: "authSession.membership",
        message: "Admin operator routes require issued-session membership enforcement.",
      },
      httpStatus: 403,
      routeId,
      safeDetails: {
        reason: "admin_membership_required",
        routeId,
        traceId: safeAdminTraceId(undefined),
      },
      status: "forbidden",
    });
  }

  const routeAuth = getProtectedRouteAuth(routeId);
  const routePolicy = routeAuth ? rbacOwnershipRoutePolicyByGroup[routeAuth.routeGroup] : undefined;

  if (!routeAuth?.sessionRequired) {
    return decision({
      routeAuth,
      routeId,
      status: "not_required",
    });
  }

  const parsedSession = parseLocalAuthSessionHeaders(headers);
  const requiredRoles = routeAuth.requiredRoles;

  if (!parsedSession.ok) {
    return decision({
      diagnostic: parsedSession.diagnostic,
      httpStatus: 401,
      requiredRoles,
      routeAuth,
      routeId,
      safeDetails: {
        reason: parsedSession.reason,
        routeId,
      },
      status: "unauthenticated",
    });
  }

  return evaluateResolvedAuthSession({
    ownerAddress,
    ownerSources,
    routeAuth,
    routeId,
    routePolicy,
    session: parsedSession.session,
  });
};

export const evaluateIssuedAuthEnforcement = async ({
  compatibilitySubject,
  headers,
  issuedSessionLookup,
  ownerAddress,
  ownerSources,
  routeId,
  traceId,
}: EvaluateIssuedAuthEnforcementOptions): Promise<AuthEnforcementDecision> => {
  const routeAuth = getProtectedRouteAuth(routeId);
  const routePolicy = routeAuth ? rbacOwnershipRoutePolicyByGroup[routeAuth.routeGroup] : undefined;
  const complete = (authDecision: AuthEnforcementDecision) => withTraceId(authDecision, traceId);

  if (isAdminOperatorRouteFamily(routeId)) {
    return decision({
      diagnostic: {
        code: "AUTH_FORBIDDEN",
        field: "authSession.membership",
        message: "Admin operator routes require server-side membership enforcement.",
      },
      httpStatus: 403,
      routeId,
      safeDetails: {
        reason: "admin_membership_required",
        routeId,
        traceId: safeAdminTraceId(traceId),
      },
      status: "forbidden",
    });
  }

  if (!routeAuth?.sessionRequired) {
    return complete(decision({
      routeAuth,
      routeId,
      status: "not_required",
    }));
  }

  const parsedSession = parseLocalAuthSessionHeaders(headers);
  const requiredRoles = routeAuth.requiredRoles;

  if (!parsedSession.ok) {
    return complete(decision({
      diagnostic: parsedSession.diagnostic,
      httpStatus: 401,
      requiredRoles,
      routeAuth,
      routeId,
      safeDetails: {
        reason: parsedSession.reason,
        routeId,
      },
      status: "unauthenticated",
    }));
  }

  let issuedRecord: WalletSessionRecord | undefined;

  try {
    issuedRecord = await issuedSessionLookup(parsedSession.session.sessionId, { traceId });
  } catch {
    return complete(decision({
      diagnostic: invalidSessionDiagnostic(
        "authSession.repository",
        "Issued wallet session could not be resolved.",
      ),
      httpStatus: 401,
      requiredRoles,
      routeAuth,
      routeId,
      safeDetails: {
        reason: "issued_session_lookup_failed",
        routeId,
      },
      status: "unauthenticated",
    }));
  }

  if (!issuedRecord) {
    return complete(decision({
      diagnostic: invalidSessionDiagnostic(
        localAuthHeaderNames.sessionId,
        "Issued wallet session was not found.",
      ),
      httpStatus: 401,
      requiredRoles,
      routeAuth,
      routeId,
      safeDetails: {
        reason: "unknown_issued_session",
        routeId,
      },
      status: "unauthenticated",
    }));
  }

  const issuedSession = issuedSessionToLocalAuthSession(parsedSession.session, issuedRecord);

  if (isDiagnostic(issuedSession)) {
    return complete(decision({
      diagnostic: issuedSession,
      httpStatus: 401,
      requiredRoles,
      routeAuth,
      routeId,
      safeDetails: {
        reason: "issued_session_identity_mismatch",
        routeId,
      },
      status: "unauthenticated",
    }));
  }

  const routeDecision = evaluateResolvedAuthSession({
    ownerAddress,
    ownerSources,
    routeAuth,
    routeId,
    routePolicy,
    session: issuedSession,
  });

  if (!routeDecision.allowed) {
    return complete(routeDecision);
  }

  const subjectMismatch = evaluateParticipantCompatibilitySubject(issuedSession, compatibilitySubject);

  if (subjectMismatch) {
    return complete(decision({
      diagnostic: subjectMismatch,
      httpStatus: 403,
      requiredRoles,
      routeAuth,
      routeId,
      safeDetails: {
        field: subjectMismatch.field,
        reason: "compatibility_subject_mismatch",
        routeId,
      },
      status: "forbidden",
    }));
  }

  return complete(routeDecision);
};

const ADMIN_SESSION_ID_MAX_LENGTH = 160;
const ADMIN_ROLE_HEADER_MAX_LENGTH = 64;

const safeAdminTraceId = (traceId: string | undefined) => {
  const candidate = traceId?.trim();

  const safeCandidate = candidate
    && candidate.length <= 128
    && /^[A-Za-z0-9._:-]+$/.test(candidate)
    && sanitizeAuthEnforcementDetails({ traceId: candidate }).safeDetails.traceId === candidate;

  return safeCandidate ? candidate : `trace-${randomUUID()}`;
};

type AdminHeaderValue =
  | { kind: "missing" }
  | { kind: "invalid" }
  | { kind: "value"; value: string };

const getSingleAdminHeader = (
  headers: AuthRuntimeHeaders | undefined,
  name: string,
): AdminHeaderValue => {
  const matches = headers
    ? Object.entries(headers).filter(([key]) => key.toLowerCase() === name)
    : [];

  if (matches.length > 1) {
    return { kind: "invalid" };
  }

  const raw = matches[0]?.[1];

  if (raw === undefined) {
    return { kind: "missing" };
  }

  if (Array.isArray(raw)) {
    if (raw.length !== 1 || typeof raw[0] !== "string") {
      return { kind: "invalid" };
    }

    const value = raw[0].trim();
    return value ? { kind: "value", value } : { kind: "missing" };
  }

  if (typeof raw !== "string") {
    return { kind: "invalid" };
  }

  const value = raw.trim();
  return value ? { kind: "value", value } : { kind: "missing" };
};

const isSafeAdminSessionId = (value: string) =>
  value.length <= ADMIN_SESSION_ID_MAX_LENGTH && /^[A-Za-z0-9._:-]+$/.test(value);

const adminDecision = ({
  code,
  httpStatus,
  policy,
  reason,
  routeId,
  status,
  traceId,
}: {
  code: "AUTH_SESSION_REQUIRED" | "AUTH_SESSION_INVALID" | "AUTH_FORBIDDEN";
  httpStatus: 401 | 403;
  policy?: Readonly<AdminOperatorRoutePolicy>;
  reason: string;
  routeId: string;
  status: "unauthenticated" | "forbidden";
  traceId: string;
}) => decision({
  diagnostic: {
    code,
    field: code === "AUTH_FORBIDDEN" ? "authSession.membership" : localAuthHeaderNames.sessionId,
    message: code === "AUTH_SESSION_REQUIRED"
      ? "An issued Admin operator session is required."
      : code === "AUTH_SESSION_INVALID"
      ? "The issued Admin operator session is invalid."
      : "Admin operator authority is forbidden.",
  },
  httpStatus,
  requiredRoles: policy ? [...policy.allowedRoles] : [],
  routeId,
  safeDetails: { reason, routeId, traceId },
  status,
});

const adminCompatibilityClaims = (
  headers: AuthRuntimeHeaders | undefined,
): { claims?: AdminOperatorSessionCompatibilityClaims; invalid: boolean } => {
  const mappings = [
    [localAuthHeaderNames.walletAddress, "subjectAddress"],
    [localAuthHeaderNames.accountType, "accountType"],
    [localAuthHeaderNames.walletSource, "walletSource"],
    [localAuthHeaderNames.credentialBoundary, "credentialBoundary"],
    [localAuthHeaderNames.proofStatus, "proofStatus"],
  ] as const;
  const claims: Record<string, string> = {};

  for (const [headerName, claimName] of mappings) {
    const header = getSingleAdminHeader(headers, headerName);

    if (header.kind === "invalid") {
      return { invalid: true };
    }

    if (header.kind === "value") {
      claims[claimName] = header.value;
    }
  }

  return {
    claims: claims as unknown as AdminOperatorSessionCompatibilityClaims,
    invalid: false,
  };
};

export const evaluateAdminOperatorEnforcement = async ({
  campaignId,
  headers,
  issuedSessionLookup,
  membershipRegistry,
  routeId,
  traceId,
}: EvaluateAdminOperatorEnforcementOptions): Promise<AuthEnforcementDecision> => {
  const resolvedTraceId = safeAdminTraceId(traceId);
  const policy = getAdminOperatorRoutePolicy(routeId);
  const deny = (
    code: "AUTH_SESSION_REQUIRED" | "AUTH_SESSION_INVALID" | "AUTH_FORBIDDEN",
    reason: string,
  ) => adminDecision({
    code,
    httpStatus: code === "AUTH_FORBIDDEN" ? 403 : 401,
    policy,
    reason,
    routeId,
    status: code === "AUTH_FORBIDDEN" ? "forbidden" : "unauthenticated",
    traceId: resolvedTraceId,
  });

  if (!policy) {
    return deny("AUTH_FORBIDDEN", "unknown_admin_route");
  }

  const sessionHeader = getSingleAdminHeader(headers, localAuthHeaderNames.sessionId);

  if (sessionHeader.kind === "missing") {
    return deny("AUTH_SESSION_REQUIRED", "missing_session");
  }

  if (sessionHeader.kind === "invalid" || !isSafeAdminSessionId(sessionHeader.value)) {
    return deny("AUTH_SESSION_INVALID", "invalid_session");
  }

  const roleHeader = getSingleAdminHeader(headers, localAuthHeaderNames.roles);

  if (
    roleHeader.kind !== "value"
    || roleHeader.value.length > ADMIN_ROLE_HEADER_MAX_LENGTH
    || roleHeader.value.includes(",")
    || !policy.allowedRoles.includes(roleHeader.value as CampaignOsAdminOperatorRoleId)
  ) {
    return deny("AUTH_FORBIDDEN", "requested_role_forbidden");
  }

  const requestedRole = roleHeader.value as CampaignOsAdminOperatorRoleId;

  if (
    policy.campaignScope === "campaign_path"
    && (!campaignId || !isCanonicalCampaignId(campaignId.trim()))
  ) {
    return deny("AUTH_FORBIDDEN", "campaign_scope_forbidden");
  }

  const compatibility = adminCompatibilityClaims(headers);

  if (compatibility.invalid) {
    return deny("AUTH_SESSION_INVALID", "invalid_compatibility_claim");
  }

  let issuedRecord: WalletSessionRecord | undefined;

  try {
    issuedRecord = await issuedSessionLookup(sessionHeader.value, { traceId: resolvedTraceId });
  } catch {
    return deny("AUTH_SESSION_INVALID", "issued_session_lookup_failed");
  }

  if (!issuedRecord) {
    return deny("AUTH_SESSION_INVALID", "unknown_issued_session");
  }

  let trustedSession: ReturnType<typeof resolveTrustedAdminOperatorSession>;

  try {
    trustedSession = resolveTrustedAdminOperatorSession(issuedRecord, {
      ...compatibility.claims,
      sessionId: sessionHeader.value,
    });
  } catch {
    return deny("AUTH_SESSION_INVALID", "issued_session_invalid");
  }

  if (!trustedSession.ok) {
    return trustedSession.reason === "internal-credential"
      ? deny("AUTH_FORBIDDEN", "credential_forbidden")
      : deny("AUTH_SESSION_INVALID", "issued_session_invalid");
  }

  let membershipDecision;

  try {
    membershipDecision = membershipRegistry.lookup({
      campaignId: policy.campaignScope === "campaign_path" ? campaignId?.trim() : undefined,
      requestedRole,
      subjectAddress: trustedSession.context.subjectAddress,
    });
  } catch {
    return deny("AUTH_FORBIDDEN", "membership_unavailable");
  }

  if (!membershipDecision.authorized) {
    return deny("AUTH_FORBIDDEN", "membership_forbidden");
  }

  const adminOperator = Object.freeze({
    ...membershipDecision.context,
    accountType: trustedSession.context.accountType,
    chainId: trustedSession.context.chainId,
    credentialBoundary: trustedSession.context.credentialBoundary,
    issuerMode: trustedSession.context.issuerMode,
    network: trustedSession.context.network,
    proofStatus: trustedSession.context.proofStatus,
    sessionId: trustedSession.context.sessionId,
    walletSource: trustedSession.context.walletSource,
  });

  return decision({
    adminOperator,
    matchedRoles: [requestedRole],
    requiredRoles: [...policy.allowedRoles],
    routeId,
    safeDetails: {
      requestedRole,
      routeId,
      traceId: resolvedTraceId,
    },
    status: "allowed",
  });
};
