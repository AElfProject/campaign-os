import type {
  AccountType,
  WalletCapability,
  WalletNetwork,
  WalletSource,
} from "../domain/types";
import { sessionIssuerProductionDependencyIds } from "./sessionIssuer";
import { walletProofProductionDependencyIds } from "./walletProofVerifier";
import type { WalletSessionRecord } from "./walletSessionRepository";

export type AuthSessionAccountType = AccountType;
export type AuthSessionWalletSource = WalletSource;
export type AuthSessionNetwork = Exclude<WalletNetwork, "unknown">;
export type AuthSessionRoleId =
  | "participant"
  | "project_owner"
  | "internal_operator"
  | "review_operator"
  | "ai_worker";
export type SessionProofStatus =
  | "local_seeded"
  | "proof_required"
  | "signature_unverified"
  | "stale"
  | "verified"
  | "blocked";
export type SessionProofType =
  | "seeded_fixture"
  | "wallet_signature"
  | "agent_context"
  | "address_only";
export type SessionVerificationMode =
  | "local_only"
  | "deferred_live_verifier"
  | "production_required";
export type AuthSessionCredentialBoundary =
  | "ordinary_user_wallet"
  | "internal_agent_credential";
export type AuthSessionDiagnosticSeverity = "error" | "warning" | "info";
export type AuthSessionDiagnosticCode =
  | "AUTH_SESSION_CONFIG_MISSING"
  | "AUTH_NONCE_STORE_MISSING"
  | "AUTH_PROOF_VERIFIER_MISSING"
  | "AUTH_SECRET_MANAGER_MISSING"
  | "AUTH_SESSION_ISSUER_MISSING"
  | "AUTH_SESSION_STORE_MISSING"
  | "AUTH_POLICY_MISSING"
  | "AUTH_OWNERSHIP_SOURCE_MISSING"
  | "AUTH_SENSITIVE_INPUT_REDACTED"
  | "AUTH_AGENT_CREDENTIAL_SEPARATE";
export type AuthSessionReadinessStatus =
  | "contract_ready"
  | "local_seeded"
  | "blocked";
export type AuthRouteGroupId =
  | "runtime_metadata"
  | "wallet_session"
  | "campaign_read"
  | "campaign_write"
  | "task_builder"
  | "task_verify"
  | "eligibility"
  | "export"
  | "admin_review"
  | "risk"
  | "service_readiness"
  | "ai_ops";
export type AuthRoleCapabilityId =
  | "wallet:session_create"
  | "wallet:user_substitution"
  | "wallet:live_sign"
  | "campaign:read"
  | "campaign:write"
  | "campaign:ownership_mutation"
  | "task:build"
  | "task:verify"
  | "eligibility:read"
  | "export:preview"
  | "export:download"
  | "admin:review"
  | "risk:review"
  | "service:readiness"
  | "system:config"
  | "ai:internal_automation"
  | "user:participate"
  | "reward:custody"
  | "payout:execute";
export type ProtectedRouteEnforcementStatus =
  | "not_required"
  | "metadata_only"
  | "local_enforced"
  | "enforcement_deferred"
  | "blocked";
export type ProtectedRouteSource = "runtime_route" | "future_route";

export interface NormalizedWalletSessionContract {
  accountType: AuthSessionAccountType;
  address: string;
  capabilities: WalletCapability[];
  chainId: string;
  connectedAt: string;
  credentialBoundary: AuthSessionCredentialBoundary;
  internalAutomation: boolean;
  lastSeenAt: string;
  network: AuthSessionNetwork;
  proofStatus: SessionProofStatus;
  roleIds: AuthSessionRoleId[];
  sessionId: string;
  walletName: string;
  walletSource: AuthSessionWalletSource;
}

export interface AdminOperatorSessionCompatibilityClaims {
  accountType?: AuthSessionAccountType;
  chainId?: string;
  credentialBoundary?: AuthSessionCredentialBoundary;
  network?: WalletNetwork;
  proofStatus?: SessionProofStatus;
  sessionId?: string;
  subjectAddress?: string;
  walletSource?: AuthSessionWalletSource;
}

export interface TrustedAdminOperatorSessionContext {
  accountType: AuthSessionAccountType;
  chainId: string;
  credentialBoundary: "ordinary_user_wallet";
  issuerMode: NonNullable<WalletSessionRecord["issuer"]>["issuerMode"];
  network: WalletNetwork;
  proofStatus: "local_seeded" | "verified";
  sessionId: string;
  subjectAddress: string;
  walletSource: AuthSessionWalletSource;
}

export type TrustedAdminOperatorSessionFailureReason =
  | "record-invalid"
  | "issuer-invalid"
  | "session-mismatch"
  | "subject-mismatch"
  | "account-type-mismatch"
  | "wallet-source-mismatch"
  | "credential-boundary-mismatch"
  | "proof-status-mismatch"
  | "chain-mismatch"
  | "network-mismatch"
  | "proof-invalid"
  | "internal-credential";

export type ResolveTrustedAdminOperatorSessionResult =
  | Readonly<{
      context: Readonly<TrustedAdminOperatorSessionContext>;
      ok: true;
    }>
  | Readonly<{
      ok: false;
      reason: TrustedAdminOperatorSessionFailureReason;
    }>;

const trustedAdminSessionFailure = (
  reason: TrustedAdminOperatorSessionFailureReason,
): ResolveTrustedAdminOperatorSessionResult => Object.freeze({ ok: false, reason });

const adminCredentialBoundaryFromIssuedRecord = (
  issuedRecord: WalletSessionRecord,
): AuthSessionCredentialBoundary =>
  issuedRecord.walletSource === "AGENT_SKILL"
  || issuedRecord.capabilities.includes("INTERNAL_AUTOMATION")
  || issuedRecord.proof?.proofType === "agent_context"
  || issuedRecord.proof?.trustLevel === "internal_only"
    ? "internal_agent_credential"
    : "ordinary_user_wallet";

const adminProofStatusFromIssuedRecord = (
  issuedRecord: WalletSessionRecord,
): SessionProofStatus => {
  if (issuedRecord.proof) {
    return issuedRecord.proof.status as SessionProofStatus;
  }

  return issuedRecord.verificationStatus === "verified" ? "verified" : "signature_unverified";
};

export const resolveTrustedAdminOperatorSession = (
  issuedRecord: WalletSessionRecord,
  claims: AdminOperatorSessionCompatibilityClaims = {},
): ResolveTrustedAdminOperatorSessionResult => {
  const sessionId = issuedRecord.sessionId?.trim();
  const subjectAddress = issuedRecord.walletAddress?.trim();

  if (!sessionId || !subjectAddress) {
    return trustedAdminSessionFailure("record-invalid");
  }

  const credentialBoundary = adminCredentialBoundaryFromIssuedRecord(issuedRecord);

  if (credentialBoundary === "internal_agent_credential") {
    return trustedAdminSessionFailure("internal-credential");
  }

  if (
    !issuedRecord.issuer?.valid
    || issuedRecord.issuer.issuerMode !== "local_opaque"
  ) {
    return trustedAdminSessionFailure("issuer-invalid");
  }

  const proofStatus = adminProofStatusFromIssuedRecord(issuedRecord);

  if (
    !issuedRecord.proof
    || issuedRecord.proof.proofType !== "wallet_signature"
    || issuedRecord.proof.trustLevel !== "verified_local"
    || issuedRecord.proof.status !== "verified"
    || issuedRecord.signatureStatus !== "signed"
    || issuedRecord.verificationStatus !== "verified"
    || !issuedRecord.walletTypeVerified
    || !issuedRecord.capabilities.includes("SIGN_MESSAGE")
    || (proofStatus !== "local_seeded" && proofStatus !== "verified")
  ) {
    return trustedAdminSessionFailure("proof-invalid");
  }

  const comparisons = [
    ["session-mismatch", claims.sessionId?.trim(), sessionId],
    ["subject-mismatch", claims.subjectAddress?.trim(), subjectAddress],
    ["account-type-mismatch", claims.accountType, issuedRecord.accountType],
    ["wallet-source-mismatch", claims.walletSource, issuedRecord.walletSource],
    ["credential-boundary-mismatch", claims.credentialBoundary, credentialBoundary],
    ["proof-status-mismatch", claims.proofStatus, proofStatus],
    ["chain-mismatch", claims.chainId?.trim(), issuedRecord.chainId],
    ["network-mismatch", claims.network, issuedRecord.network],
  ] as const;
  const mismatch = comparisons.find(([, claimed, issued]) =>
    claimed !== undefined && claimed !== issued
  );

  if (mismatch) {
    return trustedAdminSessionFailure(mismatch[0]);
  }

  const context = Object.freeze({
    accountType: issuedRecord.accountType,
    chainId: issuedRecord.chainId,
    credentialBoundary: "ordinary_user_wallet" as const,
    issuerMode: issuedRecord.issuer.issuerMode,
    network: issuedRecord.network,
    proofStatus,
    sessionId,
    subjectAddress,
    walletSource: issuedRecord.walletSource,
  });

  return Object.freeze({ context, ok: true });
};

export interface AuthSessionDiagnostic {
  code: AuthSessionDiagnosticCode;
  field: string;
  message: string;
  severity: AuthSessionDiagnosticSeverity;
}

export interface SessionProofBoundary {
  diagnostics: AuthSessionDiagnostic[];
  liveVerificationExecuted: false;
  proofType: SessionProofType;
  redactedFieldCount: number;
  redactionApplied: boolean;
  status: SessionProofStatus;
  verificationMode: SessionVerificationMode;
}

export interface CreateSessionProofBoundaryOptions {
  observedInput?: unknown;
  ownershipSourceReady?: boolean;
  productionRequired?: boolean;
  proofType?: SessionProofType;
  proofVerifierReady?: boolean;
  rbacPolicyReady?: boolean;
  sessionConfigReady?: boolean;
  status?: SessionProofStatus;
  verificationMode?: SessionVerificationMode;
}

export interface AuthRolePolicy {
  allowedCapabilities: AuthRoleCapabilityId[];
  allowedRouteGroups: AuthRouteGroupId[];
  description: string;
  forbiddenCapabilities: AuthRoleCapabilityId[];
  id: AuthSessionRoleId;
  label: string;
}

export interface ProtectedRouteAuthMapEntry {
  enforcementStatus: ProtectedRouteEnforcementStatus;
  note: string;
  productionDependencyIds: string[];
  proofRequired: boolean;
  requiredRoles: AuthSessionRoleId[];
  routeGroup: AuthRouteGroupId;
  routeId: string;
  routeSource: ProtectedRouteSource;
  sessionRequired: boolean;
}

export interface SensitiveAuthSessionInputSummary {
  redactedFieldCount: number;
  redactionApplied: boolean;
  safePreview: unknown;
}

export interface AuthSessionReadinessReport {
  agentCredentialBoundary: {
    agentSkillCanSubstituteUserWallet: false;
    separatedFromUserWalletSession: true;
  };
  authContracts: AuthSessionContractReadiness;
  deferredDependencyIds: string[];
  generatedAt: string;
  profileId: string;
  proofBoundary: {
    diagnosticCount: number;
    liveVerificationExecuted: false;
    redactedFieldCount: number;
    redactionApplied: boolean;
    status: SessionProofStatus;
    verificationMode: SessionVerificationMode;
  };
  protectedRouteCount: number;
  protectedRoutes: ProtectedRouteAuthMapEntry[];
  rolePolicy: {
    leastPrivilegeDefault: true;
    roleCount: number;
    roleIds: AuthSessionRoleId[];
  };
  sessionContract: {
    accountTypes: AuthSessionAccountType[];
    agentCredentialSeparated: true;
    sampleCount: number;
    walletSources: AuthSessionWalletSource[];
  };
  status: AuthSessionReadinessStatus;
  validation: {
    issues: AuthSessionDiagnostic[];
    valid: boolean;
  };
}

export interface CreateAuthSessionReadinessReportOptions {
  generatedAt?: string;
  liveVerifierReady?: boolean;
  nonceStoreReady?: boolean;
  observedInput?: unknown;
  ownershipSourceReady?: boolean;
  productionRequired?: boolean;
  profileId?: string;
  proofVerifierReady?: boolean;
  rbacPolicyReady?: boolean;
  productionSessionStoreReady?: boolean;
  secretManagerReady?: boolean;
  sessionConfigReady?: boolean;
  signingKeyReady?: boolean;
}

export interface AuthSessionProofVerifierContractReadiness {
  blockedDependencyIds: string[];
  localContractReady: true;
  liveVerificationExecuted: false;
  productionReady: false;
  status: "local_contract_ready";
}

export interface AuthSessionIssuerContractReadiness {
  blockedDependencyIds: string[];
  cookieIssued: false;
  jwtIssued: false;
  liveSigningExecuted: false;
  localContractReady: true;
  productionReady: false;
  status: "local_contract_ready";
}

export interface AuthSessionProjectMembershipReadiness {
  blockedDependencyIds: string[];
  productionReady: false;
  sourceReady: boolean;
}

export interface AuthSessionContractReadiness {
  blockedDependencyIds: string[];
  liveSideEffectsEnabled: false;
  productionReady: false;
  proofVerifier: AuthSessionProofVerifierContractReadiness;
  projectMembership: AuthSessionProjectMembershipReadiness;
  sessionIssuer: AuthSessionIssuerContractReadiness;
}

export type ProductionAuthSessionProfileId = "local-review" | "production-required";
export type ProductionAuthSessionStatus = "metadata_ready" | "local_ready" | "blocked";
export type ProductionAuthSessionDependencyId =
  | "wallet_live_verifier"
  | "nonce_store"
  | "session_signing_key"
  | "secret_manager"
  | "production_session_store"
  | "project_membership_source"
  | "project_ownership_source"
  | "rbac_enforcement_policy";

export interface CreateProductionAuthSessionFoundationOptions {
  generatedAt?: string;
  liveVerifierReady?: boolean;
  membershipSourceReady?: boolean;
  nonceStoreReady?: boolean;
  observedInput?: unknown;
  ownershipSourceReady?: boolean;
  productionSessionStoreReady?: boolean;
  profileId?: ProductionAuthSessionProfileId;
  rbacPolicyReady?: boolean;
  secretManagerReady?: boolean;
  signingKeyReady?: boolean;
}

export interface ProductionAuthSessionFoundation {
  accountTypeCoverage: AuthSessionAccountType[];
  agentCredentialBoundary: {
    agentSkillCanSubstituteProjectOwner: false;
    agentSkillCanSubstituteUserWallet: false;
    internalCredentialRoleIds: AuthSessionRoleId[];
    ordinaryUserWalletSources: AuthSessionWalletSource[];
  };
  blockedDependencyIds: ProductionAuthSessionDependencyId[];
  blockerCount: number;
  cookieIssued: false;
  diagnosticCodes: AuthSessionDiagnosticCode[];
  diagnostics: AuthSessionDiagnostic[];
  generatedAt: string;
  id: "campaign-os-production-auth-session-foundation";
  jwtIssued: false;
  liveSideEffectsEnabled: false;
  liveSigningExecuted: false;
  liveVerificationExecuted: false;
  ownership: {
    blockedDependencyIds: ProductionAuthSessionDependencyId[];
    membershipSourceReady: boolean;
    ownerMatchRequired: true;
    ownerMutationBlocked: boolean;
    ownershipSourceReady: boolean;
  };
  productionReady: false;
  profileId: ProductionAuthSessionProfileId;
  protectedRouteCoverage: {
    locallyEnforcedRouteIds: string[];
    protectedRouteCount: number;
    routeGroupCount: number;
  };
  rbac: {
    agentCredentialSubstitutionDisabled: true;
    protectedRouteCount: number;
    roleCount: number;
  };
  redaction: SensitiveAuthSessionInputSummary;
  sessionIssuer: {
    diagnosticCodes: AuthSessionDiagnosticCode[];
    issuerMode: "local_opaque" | "production_blocked";
    cookieIssued: false;
    jwtIssued: false;
    liveSigningExecuted: false;
    productionSessionStoreReady: boolean;
    secretManagerReady: boolean;
    signingKeyReady: boolean;
  };
  status: ProductionAuthSessionStatus;
  valid: boolean;
  walletProof: {
    diagnosticCodes: AuthSessionDiagnosticCode[];
    liveVerificationExecuted: false;
    liveVerifierReady: boolean;
    nonceStoreReady: boolean;
    status: "proof_required" | "blocked";
  };
  walletSourceCoverage: AuthSessionWalletSource[];
}

const seededAt = "2026-07-06T00:00:00.000Z";
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

export const authSessionDeferredDependencyIds = [
  "live_wallet_proof_verifier",
  "auth_nonce_store",
  "session_signing_key",
  "secret_manager",
  "production_session_store",
  "project_membership_source",
  "jwt_or_session_cookie",
  "rbac_enforcement",
  "project_ownership_source",
  "admin_organization_model",
  "agent_credential_provider",
] as const;

const projectMembershipProductionDependencyIds = [
  "project_membership_source",
  "project_ownership_source",
] as const;

const uniqueDependencyIds = (ids: readonly string[]) => Array.from(new Set(ids));

const createAuthSessionContractReadiness = ({
  liveVerifierReady = false,
  nonceStoreReady = false,
  ownershipSourceReady = false,
  productionSessionStoreReady = false,
  secretManagerReady = false,
  signingKeyReady = false,
}: {
  liveVerifierReady?: boolean;
  nonceStoreReady?: boolean;
  ownershipSourceReady?: boolean;
  productionSessionStoreReady?: boolean;
  secretManagerReady?: boolean;
  signingKeyReady?: boolean;
} = {}): AuthSessionContractReadiness => {
  const proofVerifierBlockedDependencyIds = [
    ...(!liveVerifierReady ? ["live_wallet_proof_verifier"] : []),
    ...(!nonceStoreReady ? ["auth_nonce_store"] : []),
  ];
  const sessionIssuerBlockedDependencyIds = [
    ...(!liveVerifierReady ? ["live_wallet_proof_verifier"] : []),
    ...(!signingKeyReady ? ["session_signing_key"] : []),
    ...(!secretManagerReady ? ["secret_manager"] : []),
    ...(!productionSessionStoreReady ? ["production_session_store"] : []),
  ];
  const projectMembershipBlockedDependencyIds = ownershipSourceReady
    ? []
    : [...projectMembershipProductionDependencyIds];

  return {
    blockedDependencyIds: uniqueDependencyIds([
      ...proofVerifierBlockedDependencyIds,
      ...sessionIssuerBlockedDependencyIds,
      ...projectMembershipBlockedDependencyIds,
    ]),
    liveSideEffectsEnabled: false,
    productionReady: false,
    proofVerifier: {
      blockedDependencyIds: proofVerifierBlockedDependencyIds.length > 0
        ? proofVerifierBlockedDependencyIds
        : [...walletProofProductionDependencyIds],
      localContractReady: true,
      liveVerificationExecuted: false,
      productionReady: false,
      status: "local_contract_ready",
    },
    projectMembership: {
      blockedDependencyIds: projectMembershipBlockedDependencyIds,
      productionReady: false,
      sourceReady: ownershipSourceReady,
    },
    sessionIssuer: {
      blockedDependencyIds: sessionIssuerBlockedDependencyIds.length > 0
        ? sessionIssuerBlockedDependencyIds
        : [...sessionIssuerProductionDependencyIds],
      cookieIssued: false,
      jwtIssued: false,
      liveSigningExecuted: false,
      localContractReady: true,
      productionReady: false,
      status: "local_contract_ready",
    },
  };
};

const normalizeSensitiveKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

const isSensitiveKey = (key: string) => {
  const normalizedKey = normalizeSensitiveKey(key);

  return sensitiveKeyFragments.some((fragment) => normalizedKey.includes(fragment));
};

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

const diagnostic = (
  code: AuthSessionDiagnosticCode,
  field: string,
  message: string,
  severity: AuthSessionDiagnosticSeverity = "error",
): AuthSessionDiagnostic => ({
  code,
  field,
  message,
  severity,
});

const session = (
  contract: NormalizedWalletSessionContract,
): NormalizedWalletSessionContract => contract;

export const createSeededWalletSessionContracts = () => [
  session({
    accountType: "AA",
    address: "ELF_2YVwSeededPortkeyAa",
    capabilities: ["SIGN_MESSAGE", "SEND_TRANSACTION", "CONTRACT_VIEW", "CONTRACT_SEND", "VIEW_BALANCE", "EBRIDGE"],
    chainId: "AELF",
    connectedAt: seededAt,
    credentialBoundary: "ordinary_user_wallet",
    internalAutomation: false,
    lastSeenAt: seededAt,
    network: "mainnet",
    proofStatus: "verified",
    roleIds: ["participant"],
    sessionId: "sess-portkey-aa-seeded",
    walletName: "Portkey AA",
    walletSource: "PORTKEY_AA",
  }),
  session({
    accountType: "EOA",
    address: "ELF_2YVwSeededPortkeyEoaApp",
    capabilities: ["SIGN_MESSAGE", "SEND_TRANSACTION", "CONTRACT_VIEW", "VIEW_BALANCE"],
    chainId: "AELF",
    connectedAt: seededAt,
    credentialBoundary: "ordinary_user_wallet",
    internalAutomation: false,
    lastSeenAt: seededAt,
    network: "mainnet",
    proofStatus: "local_seeded",
    roleIds: ["participant"],
    sessionId: "sess-portkey-eoa-app-seeded",
    walletName: "Portkey EOA App",
    walletSource: "PORTKEY_EOA_APP",
  }),
  session({
    accountType: "EOA",
    address: "ELF_2YVwSeededPortkeyEoaExtension",
    capabilities: ["SIGN_MESSAGE", "SEND_TRANSACTION", "CONTRACT_VIEW", "VIEW_BALANCE"],
    chainId: "AELF",
    connectedAt: seededAt,
    credentialBoundary: "ordinary_user_wallet",
    internalAutomation: false,
    lastSeenAt: seededAt,
    network: "mainnet",
    proofStatus: "local_seeded",
    roleIds: ["participant"],
    sessionId: "sess-portkey-eoa-extension-seeded",
    walletName: "Portkey EOA Extension",
    walletSource: "PORTKEY_EOA_EXTENSION",
  }),
  session({
    accountType: "EOA",
    address: "ELF_2YVwSeededNightElf",
    capabilities: ["SIGN_MESSAGE", "SEND_TRANSACTION", "CONTRACT_VIEW", "VIEW_BALANCE"],
    chainId: "AELF",
    connectedAt: seededAt,
    credentialBoundary: "ordinary_user_wallet",
    internalAutomation: false,
    lastSeenAt: seededAt,
    network: "mainnet",
    proofStatus: "local_seeded",
    roleIds: ["participant"],
    sessionId: "sess-nightelf-seeded",
    walletName: "NightElf",
    walletSource: "NIGHTELF",
  }),
  session({
    accountType: "EOA",
    address: "ELF_2YVwSeededAgentSkill",
    capabilities: ["CONTRACT_VIEW", "VIEW_BALANCE", "INTERNAL_AUTOMATION"],
    chainId: "tDVV",
    connectedAt: seededAt,
    credentialBoundary: "internal_agent_credential",
    internalAutomation: true,
    lastSeenAt: seededAt,
    network: "testnet",
    proofStatus: "proof_required",
    roleIds: ["ai_worker"],
    sessionId: "sess-agent-skill-seeded",
    walletName: "Agent Skill",
    walletSource: "AGENT_SKILL",
  }),
  session({
    accountType: "UNKNOWN",
    address: "ELF_manual_address_only",
    capabilities: ["ADDRESS_ONLY"],
    chainId: "AELF",
    connectedAt: seededAt,
    credentialBoundary: "ordinary_user_wallet",
    internalAutomation: false,
    lastSeenAt: seededAt,
    network: "mainnet",
    proofStatus: "signature_unverified",
    roleIds: [],
    sessionId: "sess-manual-address-seeded",
    walletName: "Manual address",
    walletSource: "OTHER",
  }),
] as const satisfies readonly NormalizedWalletSessionContract[];

const rolePolicy = (policy: AuthRolePolicy): AuthRolePolicy => policy;

export const authSessionRolePolicies = [
  rolePolicy({
    allowedCapabilities: ["wallet:session_create", "campaign:read", "task:verify", "eligibility:read", "user:participate"],
    allowedRouteGroups: ["wallet_session", "campaign_read", "task_verify", "eligibility"],
    description: "Ordinary campaign participant wallet session.",
    forbiddenCapabilities: [
      "campaign:write",
      "campaign:ownership_mutation",
      "export:download",
      "admin:review",
      "risk:review",
      "system:config",
      "reward:custody",
      "payout:execute",
    ],
    id: "participant",
    label: "Participant",
  }),
  rolePolicy({
    allowedCapabilities: [
      "wallet:session_create",
      "campaign:read",
      "campaign:write",
      "campaign:ownership_mutation",
      "task:build",
      "export:preview",
    ],
    allowedRouteGroups: ["wallet_session", "campaign_read", "campaign_write", "task_builder", "export"],
    description: "Project owner for campaign configuration and review-safe export previews.",
    forbiddenCapabilities: ["admin:review", "risk:review", "system:config", "reward:custody", "payout:execute"],
    id: "project_owner",
    label: "Project owner",
  }),
  rolePolicy({
    allowedCapabilities: ["admin:review", "risk:review", "service:readiness", "export:preview"],
    allowedRouteGroups: ["admin_review", "risk", "service_readiness", "export"],
    description: "Internal operator for review queues, risk, and readiness surfaces.",
    forbiddenCapabilities: ["wallet:user_substitution", "user:participate", "reward:custody", "payout:execute"],
    id: "internal_operator",
    label: "Internal operator",
  }),
  rolePolicy({
    allowedCapabilities: ["admin:review", "risk:review", "export:preview"],
    allowedRouteGroups: ["admin_review", "risk", "export"],
    description: "Review operator for approval and risk review without ownership mutation.",
    forbiddenCapabilities: ["campaign:ownership_mutation", "campaign:write", "system:config", "reward:custody", "payout:execute"],
    id: "review_operator",
    label: "Review operator",
  }),
  rolePolicy({
    allowedCapabilities: ["ai:internal_automation", "service:readiness"],
    allowedRouteGroups: ["ai_ops", "service_readiness"],
    description: "Internal automation credential, not an ordinary user wallet substitute.",
    forbiddenCapabilities: ["user:participate", "wallet:live_sign", "wallet:user_substitution", "reward:custody", "payout:execute"],
    id: "ai_worker",
    label: "AI worker",
  }),
] as const satisfies readonly AuthRolePolicy[];

export const authSessionRolePolicyById = Object.fromEntries(
  authSessionRolePolicies.map((policy) => [policy.id, policy]),
) as Record<AuthSessionRoleId, AuthRolePolicy>;

export const hasAuthRoleRouteAccess = (
  roleId: AuthSessionRoleId,
  routeGroup: AuthRouteGroupId,
) => authSessionRolePolicyById[roleId].allowedRouteGroups.includes(routeGroup);

export const isAuthRoleCapabilityForbidden = (
  roleId: AuthSessionRoleId,
  capability: AuthRoleCapabilityId,
) => authSessionRolePolicyById[roleId].forbiddenCapabilities.includes(capability);

const routeAuth = (entry: ProtectedRouteAuthMapEntry): ProtectedRouteAuthMapEntry => entry;

export const protectedRouteAuthMap = [
  routeAuth({
    enforcementStatus: "not_required",
    note: "Public runtime health metadata remains unauthenticated.",
    productionDependencyIds: [...authSessionDeferredDependencyIds],
    proofRequired: false,
    requiredRoles: [],
    routeGroup: "runtime_metadata",
    routeId: "runtime.health",
    routeSource: "runtime_route",
    sessionRequired: false,
  }),
  routeAuth({
    enforcementStatus: "not_required",
    note: "Public runtime contract metadata remains unauthenticated.",
    productionDependencyIds: [...authSessionDeferredDependencyIds],
    proofRequired: false,
    requiredRoles: [],
    routeGroup: "runtime_metadata",
    routeId: "runtime.contracts",
    routeSource: "runtime_route",
    sessionRequired: false,
  }),
  routeAuth({
    enforcementStatus: "metadata_only",
    note: "Session creation receives wallet proof in future missions; Mission 170 only describes the boundary.",
    productionDependencyIds: [...authSessionDeferredDependencyIds],
    proofRequired: true,
    requiredRoles: [],
    routeGroup: "wallet_session",
    routeId: "wallet.session.create",
    routeSource: "runtime_route",
    sessionRequired: false,
  }),
  routeAuth({
    enforcementStatus: "local_enforced",
    note: "Campaign creation requires a local project owner session and matching owner address; live wallet proof remains deferred.",
    productionDependencyIds: [...authSessionDeferredDependencyIds],
    proofRequired: true,
    requiredRoles: ["project_owner"],
    routeGroup: "campaign_write",
    routeId: "campaigns.create",
    routeSource: "runtime_route",
    sessionRequired: true,
  }),
  routeAuth({
    enforcementStatus: "local_enforced",
    note: "Owner campaign recovery list requires an issued project owner session and derives owner scope from the session.",
    productionDependencyIds: [...authSessionDeferredDependencyIds],
    proofRequired: true,
    requiredRoles: ["project_owner"],
    routeGroup: "campaign_write",
    routeId: "campaigns.owner.list",
    routeSource: "runtime_route",
    sessionRequired: true,
  }),
  routeAuth({
    enforcementStatus: "local_enforced",
    note: "Owner Campaign detail requires an issued project owner session; resource ownership is checked by the handler integration.",
    productionDependencyIds: [...authSessionDeferredDependencyIds],
    proofRequired: true,
    requiredRoles: ["project_owner"],
    routeGroup: "campaign_write",
    routeId: "campaigns.owner.detail",
    routeSource: "runtime_route",
    sessionRequired: true,
  }),
  routeAuth({
    enforcementStatus: "local_enforced",
    note: "Task builder mutation requires an issued project owner session and matching Campaign owner relation.",
    productionDependencyIds: [...authSessionDeferredDependencyIds],
    proofRequired: true,
    requiredRoles: ["project_owner"],
    routeGroup: "task_builder",
    routeId: "campaigns.tasks.add",
    routeSource: "runtime_route",
    sessionRequired: true,
  }),
  routeAuth({
    enforcementStatus: "local_enforced",
    note: "Task generation preview requires an issued project owner session and matching Campaign owner relation.",
    productionDependencyIds: [...authSessionDeferredDependencyIds],
    proofRequired: true,
    requiredRoles: ["project_owner"],
    routeGroup: "task_builder",
    routeId: "campaigns.tasks.generate",
    routeSource: "runtime_route",
    sessionRequired: true,
  }),
  routeAuth({
    enforcementStatus: "local_enforced",
    note: "Participant Campaign feed requires an issued ordinary user wallet session.",
    productionDependencyIds: [...authSessionDeferredDependencyIds],
    proofRequired: true,
    requiredRoles: ["participant"],
    routeGroup: "campaign_read",
    routeId: "campaigns.participant.list",
    routeSource: "runtime_route",
    sessionRequired: true,
  }),
  routeAuth({
    enforcementStatus: "local_enforced",
    note: "Participant Campaign journey requires an issued ordinary user wallet session.",
    productionDependencyIds: [...authSessionDeferredDependencyIds],
    proofRequired: true,
    requiredRoles: ["participant"],
    routeGroup: "campaign_read",
    routeId: "campaigns.participant.journey",
    routeSource: "runtime_route",
    sessionRequired: true,
  }),
  routeAuth({
    enforcementStatus: "local_enforced",
    note: "Repository eligibility requires an issued Participant subject.",
    productionDependencyIds: [...authSessionDeferredDependencyIds],
    proofRequired: true,
    requiredRoles: ["participant"],
    routeGroup: "eligibility",
    routeId: "campaigns.eligibility",
    routeSource: "runtime_route",
    sessionRequired: true,
  }),
  routeAuth({
    enforcementStatus: "local_enforced",
    note: "Repository ranking for preview Campaigns requires an issued Participant subject.",
    productionDependencyIds: [...authSessionDeferredDependencyIds],
    proofRequired: true,
    requiredRoles: ["participant"],
    routeGroup: "campaign_read",
    routeId: "campaigns.points.ranking.ledger.runtime",
    routeSource: "runtime_route",
    sessionRequired: true,
  }),
  routeAuth({
    enforcementStatus: "enforcement_deferred",
    note: "Export previews require project owner or internal operator review in production.",
    productionDependencyIds: [...authSessionDeferredDependencyIds],
    proofRequired: true,
    requiredRoles: ["project_owner", "internal_operator"],
    routeGroup: "export",
    routeId: "campaigns.export.preview",
    routeSource: "runtime_route",
    sessionRequired: true,
  }),
  routeAuth({
    enforcementStatus: "local_enforced",
    note: "Task verification requires an issued Participant subject before Campaign or Task mutation.",
    productionDependencyIds: [...authSessionDeferredDependencyIds],
    proofRequired: true,
    requiredRoles: ["participant"],
    routeGroup: "task_verify",
    routeId: "tasks.verify",
    routeSource: "runtime_route",
    sessionRequired: true,
  }),
  routeAuth({
    enforcementStatus: "enforcement_deferred",
    note: "Future admin review route requires internal or review operator role.",
    productionDependencyIds: [...authSessionDeferredDependencyIds],
    proofRequired: true,
    requiredRoles: ["internal_operator", "review_operator"],
    routeGroup: "admin_review",
    routeId: "admin.review.queue",
    routeSource: "future_route",
    sessionRequired: true,
  }),
  routeAuth({
    enforcementStatus: "metadata_only",
    note: "Agent skill sessions are internal automation credentials, not user wallet substitutes.",
    productionDependencyIds: [...authSessionDeferredDependencyIds],
    proofRequired: true,
    requiredRoles: ["ai_worker"],
    routeGroup: "ai_ops",
    routeId: "agent.skill.internal",
    routeSource: "future_route",
    sessionRequired: true,
  }),
] as const satisfies readonly ProtectedRouteAuthMapEntry[];

export const locallyEnforcedAuthRouteIds = Object.freeze(
  protectedRouteAuthMap
    .filter((entry) => entry.enforcementStatus === "local_enforced")
    .map((entry) => entry.routeId),
);

export const protectedRouteAuthById = Object.fromEntries(
  protectedRouteAuthMap.map((entry) => [entry.routeId, entry]),
) as Record<string, ProtectedRouteAuthMapEntry>;

export const getProtectedRouteAuth = (
  routeId: string,
): ProtectedRouteAuthMapEntry | undefined => protectedRouteAuthById[routeId];

const sanitizeSensitiveInput = (value: unknown): SensitiveAuthSessionInputSummary => {
  let redactedFieldCount = 0;

  const sanitize = (input: unknown): unknown => {
    if (typeof input === "string" && isSensitiveStringValue(input)) {
      redactedFieldCount += 1;

      return redactedPlaceholder;
    }

    if (input === null || typeof input !== "object") {
      return input;
    }

    if (Array.isArray(input)) {
      return input.map((item) => sanitize(item));
    }

    const entries = Object.entries(input).flatMap(([key, nested]) => {
      if (isSensitiveKey(key)) {
        redactedFieldCount += 1;

        return [];
      }

      const sanitizedNested = sanitize(nested);

      return [[key, sanitizedNested] as const];
    });

    return Object.fromEntries(entries);
  };

  const safePreview = sanitize(value);

  return {
    redactedFieldCount,
    redactionApplied: redactedFieldCount > 0,
    safePreview,
  };
};

export const summarizeSensitiveAuthSessionInput = (
  input: unknown,
): SensitiveAuthSessionInputSummary => sanitizeSensitiveInput(input);

const productionAuthDependencyChecks = [
  {
    diagnosticCode: "AUTH_PROOF_VERIFIER_MISSING",
    diagnosticField: "authSession.walletProof.liveVerifier",
    diagnosticMessage: "Production auth requires a live wallet proof verifier.",
    id: "wallet_live_verifier",
    optionKey: "liveVerifierReady",
  },
  {
    diagnosticCode: "AUTH_NONCE_STORE_MISSING",
    diagnosticField: "authSession.walletProof.nonceStore",
    diagnosticMessage: "Production auth requires a nonce store.",
    id: "nonce_store",
    optionKey: "nonceStoreReady",
  },
  {
    diagnosticCode: "AUTH_SESSION_ISSUER_MISSING",
    diagnosticField: "authSession.sessionIssuer.signingKey",
    diagnosticMessage: "Production auth requires a session signing key.",
    id: "session_signing_key",
    optionKey: "signingKeyReady",
  },
  {
    diagnosticCode: "AUTH_SECRET_MANAGER_MISSING",
    diagnosticField: "authSession.sessionIssuer.secretManager",
    diagnosticMessage: "Production auth requires a secret manager.",
    id: "secret_manager",
    optionKey: "secretManagerReady",
  },
  {
    diagnosticCode: "AUTH_SESSION_STORE_MISSING",
    diagnosticField: "authSession.sessionIssuer.sessionStore",
    diagnosticMessage: "Production auth requires a production session store.",
    id: "production_session_store",
    optionKey: "productionSessionStoreReady",
  },
  {
    diagnosticCode: "AUTH_SESSION_CONFIG_MISSING",
    diagnosticField: "authSession.membership.source",
    diagnosticMessage: "Production auth requires a project membership source.",
    id: "project_membership_source",
    optionKey: "membershipSourceReady",
  },
  {
    diagnosticCode: "AUTH_OWNERSHIP_SOURCE_MISSING",
    diagnosticField: "authSession.ownership.source",
    diagnosticMessage: "Production auth requires a project ownership source.",
    id: "project_ownership_source",
    optionKey: "ownershipSourceReady",
  },
  {
    diagnosticCode: "AUTH_POLICY_MISSING",
    diagnosticField: "authSession.rbac.policy",
    diagnosticMessage: "Production auth requires an RBAC enforcement policy.",
    id: "rbac_enforcement_policy",
    optionKey: "rbacPolicyReady",
  },
] as const satisfies readonly {
  diagnosticCode: AuthSessionDiagnosticCode;
  diagnosticField: string;
  diagnosticMessage: string;
  id: ProductionAuthSessionDependencyId;
  optionKey: keyof CreateProductionAuthSessionFoundationOptions;
}[];

export const productionAuthSessionFoundationDependencyIds =
  productionAuthDependencyChecks.map((item) => item.id);

const foundationDiagnosticCodes = (diagnostics: readonly AuthSessionDiagnostic[]) =>
  Array.from(new Set(diagnostics.map((item) => item.code)));

export const createProductionAuthSessionFoundation = ({
  generatedAt = new Date(0).toISOString(),
  liveVerifierReady = false,
  membershipSourceReady = false,
  nonceStoreReady = false,
  observedInput,
  ownershipSourceReady = false,
  productionSessionStoreReady = false,
  profileId = "local-review",
  rbacPolicyReady = false,
  secretManagerReady = false,
  signingKeyReady = false,
}: CreateProductionAuthSessionFoundationOptions = {}): ProductionAuthSessionFoundation => {
  const productionRequired = profileId === "production-required";
  const redaction = summarizeSensitiveAuthSessionInput(observedInput);
  const blockedDependencyIds: ProductionAuthSessionDependencyId[] = productionRequired
    ? productionAuthDependencyChecks
      .filter((check) => !({
        liveVerifierReady,
        membershipSourceReady,
        nonceStoreReady,
        ownershipSourceReady,
        productionSessionStoreReady,
        rbacPolicyReady,
        secretManagerReady,
        signingKeyReady,
      })[check.optionKey])
      .map((check) => check.id)
    : [];
  const diagnostics: AuthSessionDiagnostic[] = productionRequired
    ? productionAuthDependencyChecks
      .filter((check) => blockedDependencyIds.includes(check.id))
      .map((check) => diagnostic(check.diagnosticCode, check.diagnosticField, check.diagnosticMessage))
    : [];

  diagnostics.push(
    diagnostic(
      "AUTH_AGENT_CREDENTIAL_SEPARATE",
      "authSession.agentCredentialBoundary",
      "Agent Skill credentials are internal automation credentials and cannot substitute user or project owner sessions.",
      "info",
    ),
  );

  if (redaction.redactionApplied) {
    diagnostics.push(
      diagnostic(
        "AUTH_SENSITIVE_INPUT_REDACTED",
        "authSession.input",
        "Sensitive auth input was omitted from production auth/session foundation metadata.",
        "warning",
      ),
    );
  }

  const sessions = createSeededWalletSessionContracts();
  const walletSourceCoverage = sessions.map((sessionContract) => sessionContract.walletSource);
  const accountTypeCoverage = Array.from(new Set(sessions.map((sessionContract) => sessionContract.accountType)));
  const ordinaryUserWalletSources = sessions
    .filter((sessionContract) => sessionContract.credentialBoundary === "ordinary_user_wallet")
    .map((sessionContract) => sessionContract.walletSource);
  const routeGroups = new Set(protectedRouteAuthMap.map((route) => route.routeGroup));
  const ownerBlockedDependencyIds = [
    ...(!membershipSourceReady && productionRequired ? ["project_membership_source" as const] : []),
    ...(!ownershipSourceReady && productionRequired ? ["project_ownership_source" as const] : []),
  ];
  const diagnosticCodes = foundationDiagnosticCodes(diagnostics);
  const valid = productionRequired ? blockedDependencyIds.length === 0 : true;

  return {
    accountTypeCoverage,
    agentCredentialBoundary: {
      agentSkillCanSubstituteProjectOwner: false,
      agentSkillCanSubstituteUserWallet: false,
      internalCredentialRoleIds: ["ai_worker"],
      ordinaryUserWalletSources,
    },
    blockedDependencyIds,
    blockerCount: blockedDependencyIds.length,
    cookieIssued: false,
    diagnosticCodes,
    diagnostics,
    generatedAt,
    id: "campaign-os-production-auth-session-foundation",
    jwtIssued: false,
    liveSideEffectsEnabled: false,
    liveSigningExecuted: false,
    liveVerificationExecuted: false,
    ownership: {
      blockedDependencyIds: ownerBlockedDependencyIds,
      membershipSourceReady,
      ownerMatchRequired: true,
      ownerMutationBlocked: !membershipSourceReady || !ownershipSourceReady,
      ownershipSourceReady,
    },
    productionReady: false,
    profileId,
    protectedRouteCoverage: {
      locallyEnforcedRouteIds: [...locallyEnforcedAuthRouteIds],
      protectedRouteCount: protectedRouteAuthMap.length,
      routeGroupCount: routeGroups.size,
    },
    rbac: {
      agentCredentialSubstitutionDisabled: true,
      protectedRouteCount: protectedRouteAuthMap.length,
      roleCount: authSessionRolePolicies.length,
    },
    redaction,
    sessionIssuer: {
      diagnosticCodes: diagnosticCodes.filter((code) =>
        code === "AUTH_SESSION_ISSUER_MISSING"
        || code === "AUTH_SECRET_MANAGER_MISSING"
        || code === "AUTH_SESSION_STORE_MISSING"
      ),
      issuerMode: productionRequired && blockedDependencyIds.some((dependencyId) =>
        dependencyId === "session_signing_key"
        || dependencyId === "secret_manager"
        || dependencyId === "production_session_store"
      )
        ? "production_blocked"
        : "local_opaque",
      cookieIssued: false,
      jwtIssued: false,
      liveSigningExecuted: false,
      productionSessionStoreReady,
      secretManagerReady,
      signingKeyReady,
    },
    status: valid ? (profileId === "local-review" ? "local_ready" : "metadata_ready") : "blocked",
    valid,
    walletProof: {
      diagnosticCodes: diagnosticCodes.filter((code) =>
        code === "AUTH_NONCE_STORE_MISSING" || code === "AUTH_PROOF_VERIFIER_MISSING"
      ),
      liveVerificationExecuted: false,
      liveVerifierReady,
      nonceStoreReady,
      status: productionRequired && (!liveVerifierReady || !nonceStoreReady) ? "blocked" : "proof_required",
    },
    walletSourceCoverage,
  };
};

export const createSessionProofBoundary = ({
  observedInput,
  ownershipSourceReady = false,
  productionRequired = false,
  proofType,
  proofVerifierReady = false,
  rbacPolicyReady = false,
  sessionConfigReady = false,
  status,
  verificationMode,
}: CreateSessionProofBoundaryOptions = {}): SessionProofBoundary => {
  const sensitiveSummary = summarizeSensitiveAuthSessionInput(observedInput);
  const diagnostics: AuthSessionDiagnostic[] = [];

  if (productionRequired && !sessionConfigReady) {
    diagnostics.push(
      diagnostic("AUTH_SESSION_CONFIG_MISSING", "authSession.config", "Required auth session configuration is missing."),
    );
  }

  if (productionRequired && !proofVerifierReady) {
    diagnostics.push(
      diagnostic("AUTH_PROOF_VERIFIER_MISSING", "authSession.proofVerifier", "Required wallet proof verifier is missing."),
    );
  }

  if (productionRequired && !rbacPolicyReady) {
    diagnostics.push(
      diagnostic("AUTH_POLICY_MISSING", "authSession.rolePolicy", "Required role policy enforcement source is missing."),
    );
  }

  if (productionRequired && !ownershipSourceReady) {
    diagnostics.push(
      diagnostic("AUTH_OWNERSHIP_SOURCE_MISSING", "authSession.ownership", "Required project ownership source is missing."),
    );
  }

  if (sensitiveSummary.redactionApplied) {
    diagnostics.push(
      diagnostic(
        "AUTH_SENSITIVE_INPUT_REDACTED",
        "authSession.input",
        "Sensitive auth input was omitted from readiness metadata.",
        "warning",
      ),
    );
  }

  const hasBlockingIssue = diagnostics.some((issue) => issue.severity === "error");

  return {
    diagnostics,
    liveVerificationExecuted: false,
    proofType: proofType ?? (productionRequired ? "wallet_signature" : "seeded_fixture"),
    redactedFieldCount: sensitiveSummary.redactedFieldCount,
    redactionApplied: sensitiveSummary.redactionApplied,
    status: status ?? (hasBlockingIssue ? "blocked" : productionRequired ? "proof_required" : "local_seeded"),
    verificationMode: verificationMode ?? (productionRequired ? "production_required" : "local_only"),
  };
};

export const createAuthSessionReadinessReport = ({
  generatedAt = new Date(0).toISOString(),
  liveVerifierReady,
  nonceStoreReady,
  observedInput,
  ownershipSourceReady,
  productionRequired,
  productionSessionStoreReady,
  profileId = "local-review",
  proofVerifierReady,
  rbacPolicyReady,
  secretManagerReady,
  sessionConfigReady,
  signingKeyReady,
}: CreateAuthSessionReadinessReportOptions = {}): AuthSessionReadinessReport => {
  const requiresProductionAuth = productionRequired ?? profileId === "production-required";
  const authContracts = createAuthSessionContractReadiness({
    liveVerifierReady: liveVerifierReady ?? proofVerifierReady,
    nonceStoreReady,
    ownershipSourceReady,
    productionSessionStoreReady,
    secretManagerReady,
    signingKeyReady,
  });
  const proofBoundary = createSessionProofBoundary({
    observedInput,
    ownershipSourceReady,
    productionRequired: requiresProductionAuth,
    proofVerifierReady,
    rbacPolicyReady,
    sessionConfigReady,
  });
  const blockingIssues = proofBoundary.diagnostics.filter((issue) => issue.severity === "error");
  const sessions = createSeededWalletSessionContracts();
  const walletSources = Array.from(new Set(sessions.map((sessionContract) => sessionContract.walletSource)));
  const accountTypes = Array.from(new Set(sessions.map((sessionContract) => sessionContract.accountType)));

  return {
    agentCredentialBoundary: {
      agentSkillCanSubstituteUserWallet: false,
      separatedFromUserWalletSession: true,
    },
    authContracts,
    deferredDependencyIds: uniqueDependencyIds([
      ...authSessionDeferredDependencyIds,
      ...authContracts.blockedDependencyIds,
    ]),
    generatedAt,
    profileId,
    proofBoundary: {
      diagnosticCount: proofBoundary.diagnostics.length,
      liveVerificationExecuted: proofBoundary.liveVerificationExecuted,
      redactedFieldCount: proofBoundary.redactedFieldCount,
      redactionApplied: proofBoundary.redactionApplied,
      status: proofBoundary.status,
      verificationMode: proofBoundary.verificationMode,
    },
    protectedRouteCount: protectedRouteAuthMap.length,
    protectedRoutes: [...protectedRouteAuthMap],
    rolePolicy: {
      leastPrivilegeDefault: true,
      roleCount: authSessionRolePolicies.length,
      roleIds: authSessionRolePolicies.map((policy) => policy.id),
    },
    sessionContract: {
      accountTypes,
      agentCredentialSeparated: true,
      sampleCount: sessions.length,
      walletSources,
    },
    status: blockingIssues.length > 0 ? "blocked" : requiresProductionAuth ? "contract_ready" : "local_seeded",
    validation: {
      issues: proofBoundary.diagnostics,
      valid: blockingIssues.length === 0,
    },
  };
};
