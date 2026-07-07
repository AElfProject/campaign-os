import {
  authSessionRolePolicyById,
  getProtectedRouteAuth,
  type AuthSessionAccountType,
  type AuthSessionCredentialBoundary,
  type AuthSessionRoleId,
  type AuthSessionWalletSource,
  type ProtectedRouteAuthMapEntry,
  type SessionProofStatus,
} from "./authSession";

export type AuthRuntimeHeaders = Record<string, string | readonly string[] | undefined>;
export type AuthEnforcementDecisionStatus =
  | "allowed"
  | "not_required"
  | "unauthenticated"
  | "forbidden";
export type AuthEnforcementDiagnosticCode =
  | "AUTH_SESSION_REQUIRED"
  | "AUTH_SESSION_INVALID"
  | "AUTH_ROLE_FORBIDDEN"
  | "AUTH_OWNER_MISMATCH"
  | "AUTH_AGENT_CREDENTIAL_FORBIDDEN"
  | "AUTH_PROOF_FORBIDDEN";

export interface LocalAuthSession {
  accountType: AuthSessionAccountType;
  address: string;
  credentialBoundary: AuthSessionCredentialBoundary;
  internalAutomation: boolean;
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
  routeId: string;
}

export interface AuthEnforcementDecision {
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
  "verified",
  "blocked",
] as const satisfies readonly SessionProofStatus[];
const locallyAcceptedProofStatuses = new Set<SessionProofStatus>(["local_seeded", "verified"]);

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
  Boolean(value) && typeof value === "object" && "code" in value && "field" in value;

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
      diagnostic: invalidSessionDiagnostic(
        localAuthHeaderNames.sessionId,
        "Local auth session id is required.",
      ),
      ok: false,
      reason: "invalid",
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
  safeDetails: input.safeDetails ?? {},
  ...input,
});

export const evaluateAuthEnforcement = ({
  headers,
  ownerAddress,
  routeId,
}: EvaluateAuthEnforcementOptions): AuthEnforcementDecision => {
  const routeAuth = getProtectedRouteAuth(routeId);

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

  const session = parsedSession.session;
  const matchedRoles = session.roleIds.filter((roleId) => requiredRoles.includes(roleId));
  const forbidden = (
    code: AuthEnforcementDiagnosticCode,
    field: string,
    message: string,
    extraDetails: Record<string, unknown> = {},
  ) => decision({
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
    session,
    status: "forbidden",
  });

  if (routeAuth.proofRequired && !locallyAcceptedProofStatuses.has(session.proofStatus)) {
    return forbidden(
      "AUTH_PROOF_FORBIDDEN",
      "authSession.proofStatus",
      "Local auth session proof status is not accepted for this route.",
      { proofStatus: session.proofStatus },
    );
  }

  if (routeAuth.routeGroup === "campaign_write" && session.credentialBoundary === "internal_agent_credential") {
    return forbidden(
      "AUTH_AGENT_CREDENTIAL_FORBIDDEN",
      "authSession.credentialBoundary",
      "Internal agent credentials cannot substitute for a project owner wallet session.",
      { credentialBoundary: session.credentialBoundary },
    );
  }

  if (requiredRoles.length > 0 && matchedRoles.length === 0) {
    return forbidden(
      "AUTH_ROLE_FORBIDDEN",
      "authSession.roleIds",
      "The local auth session does not include a role allowed for this route.",
      { sessionRoleCount: session.roleIds.length },
    );
  }

  if (routeId === "campaigns.create" && ownerAddress && ownerAddress.trim() !== session.address) {
    return forbidden(
      "AUTH_OWNER_MISMATCH",
      "ownerAddress",
      "Campaign owner address must match the authenticated local session address.",
    );
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
