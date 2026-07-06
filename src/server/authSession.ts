import type {
  AccountType,
  WalletCapability,
  WalletNetwork,
  WalletSource,
} from "../domain/types";

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
  | "AUTH_PROOF_VERIFIER_MISSING"
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
  observedInput?: unknown;
  ownershipSourceReady?: boolean;
  productionRequired?: boolean;
  profileId?: string;
  proofVerifierReady?: boolean;
  rbacPolicyReady?: boolean;
  sessionConfigReady?: boolean;
}

const seededAt = "2026-07-06T00:00:00.000Z";
const redactedPlaceholder = "[redacted-sensitive]";
const sensitiveKeyFragments = [
  "authorization",
  "bearer",
  "mnemonic",
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
  "jwt_or_session_cookie",
  "rbac_enforcement",
  "project_ownership_source",
  "admin_organization_model",
  "agent_credential_provider",
] as const;

const normalizeSensitiveKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

const isSensitiveKey = (key: string) => {
  const normalizedKey = normalizeSensitiveKey(key);

  return sensitiveKeyFragments.some((fragment) => normalizedKey.includes(fragment));
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
    enforcementStatus: "enforcement_deferred",
    note: "Campaign creation requires a project owner session and ownership source before production.",
    productionDependencyIds: [...authSessionDeferredDependencyIds],
    proofRequired: true,
    requiredRoles: ["project_owner"],
    routeGroup: "campaign_write",
    routeId: "campaigns.create",
    routeSource: "runtime_route",
    sessionRequired: true,
  }),
  routeAuth({
    enforcementStatus: "enforcement_deferred",
    note: "Task builder mutation requires project owner auth in production.",
    productionDependencyIds: [...authSessionDeferredDependencyIds],
    proofRequired: true,
    requiredRoles: ["project_owner"],
    routeGroup: "task_builder",
    routeId: "campaigns.tasks.add",
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
    enforcementStatus: "enforcement_deferred",
    note: "Task verification requires participant proof before production trust.",
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

export const protectedRouteAuthById = Object.fromEntries(
  protectedRouteAuthMap.map((entry) => [entry.routeId, entry]),
) as Record<string, ProtectedRouteAuthMapEntry>;

export const getProtectedRouteAuth = (
  routeId: string,
): ProtectedRouteAuthMapEntry | undefined => protectedRouteAuthById[routeId];

const sanitizeSensitiveInput = (value: unknown): SensitiveAuthSessionInputSummary => {
  let redactedFieldCount = 0;

  const sanitize = (input: unknown): unknown => {
    if (input === null || typeof input !== "object") {
      return input;
    }

    if (Array.isArray(input)) {
      const sanitizedItems = input
        .map((item) => sanitize(item))
        .filter((item) => item !== redactedPlaceholder);

      return sanitizedItems;
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
  observedInput,
  ownershipSourceReady,
  productionRequired,
  profileId = "local-review",
  proofVerifierReady,
  rbacPolicyReady,
  sessionConfigReady,
}: CreateAuthSessionReadinessReportOptions = {}): AuthSessionReadinessReport => {
  const requiresProductionAuth = productionRequired ?? profileId === "production-required";
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
    deferredDependencyIds: [...authSessionDeferredDependencyIds],
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
