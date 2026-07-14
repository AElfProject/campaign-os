import { describe, expect, it } from "vitest";
import {
  adminOperatorRoutePolicies,
  evaluateAuthEnforcement,
  evaluateAdminOperatorEnforcement,
  evaluateIssuedAuthEnforcement,
  getAdminOperatorRoutePolicy,
  parseLocalAuthSessionHeaders,
  projectOwnershipReadinessPolicy,
  rbacOwnershipRoutePolicyMatrix,
  sanitizeAuthEnforcementDetails,
  type AuthRuntimeHeaders,
  type ParticipantCompatibilitySubject,
} from "./authEnforcement";
import { createAdminOperatorMembershipRegistry } from "./adminOperatorMembership";
import type { CampaignOsAdminOperatorMembershipConfig } from "./config";
import type { WalletSessionRecord } from "./walletSessionRepository";

const sensitiveFragments = [
  "bearer raw-secret-token",
  "jwt.raw.secret",
  "raw-signature-sample",
  "private-key-sample",
  "session-secret-sample",
  "https://storage.invalid/diagnostic?token=raw-secret-token",
];

const projectOwnerHeaders = (overrides: AuthRuntimeHeaders = {}): AuthRuntimeHeaders => ({
  "x-campaign-os-account-type": "AA",
  "x-campaign-os-credential-boundary": "ordinary_user_wallet",
  "x-campaign-os-proof-status": "verified",
  "x-campaign-os-roles": "project_owner",
  "x-campaign-os-session-id": "sess-project-owner-local",
  "x-campaign-os-wallet-address": "ELF_project_owner_local",
  "x-campaign-os-wallet-source": "PORTKEY_AA",
  ...overrides,
});

const participantHeaders = (overrides: AuthRuntimeHeaders = {}): AuthRuntimeHeaders => ({
  "x-campaign-os-account-type": "AA",
  "x-campaign-os-credential-boundary": "ordinary_user_wallet",
  "x-campaign-os-proof-status": "verified",
  "x-campaign-os-roles": "participant",
  "x-campaign-os-session-id": "sess-participant-local",
  "x-campaign-os-wallet-address": "2YVwParticipantCaseSensitive",
  "x-campaign-os-wallet-source": "PORTKEY_AA",
  ...overrides,
});

const adminOperatorHeaders = (overrides: AuthRuntimeHeaders = {}): AuthRuntimeHeaders => ({
  "x-campaign-os-account-type": "AA",
  "x-campaign-os-credential-boundary": "ordinary_user_wallet",
  "x-campaign-os-proof-status": "verified",
  "x-campaign-os-roles": "review_operator",
  "x-campaign-os-session-id": "sess-admin-operator",
  "x-campaign-os-wallet-address": "2YVwAdminOperatorCaseSensitive",
  "x-campaign-os-wallet-source": "PORTKEY_AA",
  ...overrides,
});

const issuedWalletSession = (overrides: Partial<WalletSessionRecord> = {}): WalletSessionRecord => ({
  accountType: "AA",
  capabilities: ["SIGN_MESSAGE", "CONTRACT_VIEW", "VIEW_BALANCE", "EBRIDGE"],
  chainId: "AELF",
  connectedAt: "2026-07-09T00:00:00.000Z",
  displayAddress: "ELF_project_owner_local",
  issuer: {
    artifactType: "local_session_reference",
    cookieIssued: false,
    diagnosticCodes: [],
    issuerMode: "local_opaque",
    jwtIssued: false,
    liveSigningExecuted: false,
    referenceId: "issuer:sess-project-owner-local",
    ttlSeconds: 3600,
    valid: true,
  },
  lastSeenAt: "2026-07-09T00:00:00.000Z",
  network: "mainnet",
  productionReadiness: {
    blockedDependencyIds: [],
    liveSigningReady: false,
    liveVerifierReady: false,
    productionReady: false,
    productionRequired: false,
    productionSessionStoreReady: false,
    secretManagerReady: false,
    signingKeyReady: false,
  },
  proof: {
    diagnosticCodes: [],
    liveVerificationExecuted: false,
    proofType: "wallet_signature",
    status: "verified",
    trustLevel: "verified_local",
  },
  recordId: "wallet-session:sess-project-owner-local",
  repository: {
    adapterId: "wallet-session-test-adapter",
    repositoryId: "wallet-session-repository-runtime",
    sequence: 1,
    storeId: "wallet-sessions",
  },
  sessionId: "sess-project-owner-local",
  signatureStatus: "signed",
  verificationStatus: "verified",
  walletAddress: "ELF_project_owner_local",
  walletName: "Portkey AA Wallet",
  walletSource: "PORTKEY_AA",
  walletTypeVerified: true,
  ...overrides,
});

const issuedLookup = (record: WalletSessionRecord | undefined = issuedWalletSession()) =>
  async (sessionId: string) => record?.sessionId === sessionId ? record : undefined;

const issuedParticipantSession = (
  overrides: Partial<WalletSessionRecord> = {},
): WalletSessionRecord => issuedWalletSession({
  displayAddress: "2YVwParticipantCaseSensitive",
  recordId: "wallet-session:sess-participant-local",
  sessionId: "sess-participant-local",
  walletAddress: "2YVwParticipantCaseSensitive",
  ...overrides,
});

const issuedAdminSession = (
  overrides: Partial<WalletSessionRecord> = {},
): WalletSessionRecord => issuedWalletSession({
  displayAddress: "2YVwAdminOperatorCaseSensitive",
  recordId: "wallet-session:sess-admin-operator",
  sessionId: "sess-admin-operator",
  walletAddress: "2YVwAdminOperatorCaseSensitive",
  ...overrides,
});

const adminMembership = (
  overrides: Partial<CampaignOsAdminOperatorMembershipConfig> = {},
): CampaignOsAdminOperatorMembershipConfig => ({
  active: true,
  campaignIds: ["campaign-admin-a"],
  roleIds: ["review_operator"],
  subjectAddress: "2YVwAdminOperatorCaseSensitive",
  ...overrides,
});

const adminRegistry = (
  memberships: readonly CampaignOsAdminOperatorMembershipConfig[] = [adminMembership()],
) => createAdminOperatorMembershipRegistry({
  enabled: true,
  memberships,
  sourceRevision: "admin-membership-sha256:test-revision",
});

const enforceThenMutate = async (
  options: Parameters<typeof evaluateIssuedAuthEnforcement>[0],
) => {
  let mutationCount = 0;
  const decision = await evaluateIssuedAuthEnforcement(options);

  if (decision.allowed) {
    mutationCount += 1;
  }

  return { decision, mutationCount };
};

const compatibilitySubstitutionCases = [
  ["walletAddress", { walletAddress: "2YVwOtherParticipant" }],
  ["accountType", { accountType: "EOA" }],
  ["walletSource", { walletSource: "NIGHTELF" }],
] satisfies [keyof ParticipantCompatibilitySubject, ParticipantCompatibilitySubject][];

const expectNoSensitiveFragments = (value: unknown) => {
  const serialized = JSON.stringify(value).toLowerCase();

  for (const fragment of sensitiveFragments) {
    expect(serialized).not.toContain(fragment);
  }
};

describe("auth enforcement", () => {
  it("publishes the complete RBAC ownership route policy matrix", () => {
    expect(rbacOwnershipRoutePolicyMatrix.map((entry) => entry.routeGroup)).toEqual([
      "runtime_metadata",
      "wallet_session",
      "campaign_read",
      "campaign_write",
      "task_builder",
      "task_verify",
      "eligibility",
      "export",
      "admin_review",
      "risk",
      "service_readiness",
      "ai_ops",
    ]);
    expect(rbacOwnershipRoutePolicyMatrix.find((entry) => entry.routeGroup === "campaign_write")).toMatchObject({
      locallyEnforced: true,
      ownerMatchRequired: true,
      requiredRoles: ["project_owner"],
      routeIds: ["campaigns.create", "campaigns.owner.list", "campaigns.owner.detail"],
    });
    expect(rbacOwnershipRoutePolicyMatrix.find((entry) => entry.routeGroup === "task_builder")).toMatchObject({
      locallyEnforced: true,
      ownerMatchRequired: true,
      requiredRoles: ["project_owner"],
      routeIds: ["campaigns.tasks.add", "campaigns.tasks.generate"],
    });
    expect(rbacOwnershipRoutePolicyMatrix.find((entry) => entry.routeGroup === "ai_ops")).toMatchObject({
      forbiddenCredentialBoundaries: ["ordinary_user_wallet"],
      requiredRoles: ["ai_worker"],
    });
    expect(rbacOwnershipRoutePolicyMatrix.find((entry) => entry.routeGroup === "export")?.requiredRoles).toEqual([
      "project_owner",
      "internal_operator",
    ]);

    for (const routePolicy of rbacOwnershipRoutePolicyMatrix) {
      expect(routePolicy.productionDependencyIds).toEqual(
        expect.arrayContaining(["rbac_enforcement_policy", "project_membership_source", "project_ownership_source"]),
      );
      expect(routePolicy.requiredRoles).toEqual([...new Set(routePolicy.requiredRoles)]);
    }
  });

  it("parses deterministic local project owner session headers", () => {
    const parsed = parseLocalAuthSessionHeaders(projectOwnerHeaders());

    expect(parsed).toMatchObject({
      ok: true,
      session: {
        accountType: "AA",
        address: "ELF_project_owner_local",
        credentialBoundary: "ordinary_user_wallet",
        internalAutomation: false,
        proofStatus: "verified",
        roleIds: ["project_owner"],
        sessionId: "sess-project-owner-local",
        walletSource: "PORTKEY_AA",
      },
    });
  });

  it("rejects missing and malformed local auth sessions without leaking sensitive headers", () => {
    const missing = parseLocalAuthSessionHeaders({
      authorization: "Bearer raw-secret-token",
      rawSignature: "raw-signature-sample",
    });
    const malformed = parseLocalAuthSessionHeaders(
      projectOwnerHeaders({
        "x-campaign-os-roles": "project_owner,unknown_role",
        privateKey: "private-key-sample",
        sessionSecret: "session-secret-sample",
      }),
    );

    expect(missing).toMatchObject({
      diagnostic: {
        code: "AUTH_SESSION_REQUIRED",
      },
      ok: false,
      reason: "missing",
    });
    expect(malformed).toMatchObject({
      diagnostic: {
        code: "AUTH_SESSION_INVALID",
        field: "x-campaign-os-roles",
      },
      ok: false,
      reason: "invalid",
    });
    expectNoSensitiveFragments(missing);
    expectNoSensitiveFragments(malformed);
  });

  it("allows campaign creation for matching project owner sessions", () => {
    const decision = evaluateAuthEnforcement({
      headers: projectOwnerHeaders(),
      ownerAddress: "ELF_project_owner_local",
      routeId: "campaigns.create",
    });

    expect(decision).toMatchObject({
      allowed: true,
      matchedRoles: ["project_owner"],
      requiredRoles: ["project_owner"],
      routeId: "campaigns.create",
      status: "allowed",
    });
    expect(decision.routeAuth).toMatchObject({
      enforcementStatus: "local_enforced",
      routeGroup: "campaign_write",
      sessionRequired: true,
    });
  });

  it("requires an issued wallet session before owner route authorization", async () => {
    const missing = await evaluateIssuedAuthEnforcement({
      routeId: "campaigns.create",
      issuedSessionLookup: issuedLookup(),
    });
    const unknown = await evaluateIssuedAuthEnforcement({
      headers: projectOwnerHeaders({
        "x-campaign-os-session-id": "missing-issued-session",
      }),
      ownerAddress: "ELF_project_owner_local",
      routeId: "campaigns.create",
      issuedSessionLookup: issuedLookup(),
    });
    const identityMismatch = await evaluateIssuedAuthEnforcement({
      headers: projectOwnerHeaders({
        "x-campaign-os-wallet-address": "ELF_header_claim_mismatch",
      }),
      ownerAddress: "ELF_project_owner_local",
      routeId: "campaigns.create",
      issuedSessionLookup: issuedLookup(),
    });
    const invalidIssuer = await evaluateIssuedAuthEnforcement({
      headers: projectOwnerHeaders(),
      ownerAddress: "ELF_project_owner_local",
      routeId: "campaigns.create",
      issuedSessionLookup: issuedLookup(issuedWalletSession({
        issuer: {
          ...issuedWalletSession().issuer!,
          valid: false,
        },
      })),
    });

    expect(missing).toMatchObject({
      diagnostic: { code: "AUTH_SESSION_REQUIRED" },
      httpStatus: 401,
      status: "unauthenticated",
    });
    for (const decision of [unknown, identityMismatch, invalidIssuer]) {
      expect(decision).toMatchObject({
        diagnostic: { code: "AUTH_SESSION_INVALID" },
        httpStatus: 401,
        status: "unauthenticated",
      });
      expectNoSensitiveFragments(decision);
    }
  });

  it("uses issued proof and existing role and credential policy for owner routes", async () => {
    const participant = await evaluateIssuedAuthEnforcement({
      headers: projectOwnerHeaders({ "x-campaign-os-roles": "participant" }),
      ownerAddress: "ELF_project_owner_local",
      routeId: "campaigns.create",
      issuedSessionLookup: issuedLookup(),
    });
    const unverifiedProof = await evaluateIssuedAuthEnforcement({
      headers: projectOwnerHeaders({
        "x-campaign-os-proof-status": "verified",
      }),
      ownerAddress: "ELF_project_owner_local",
      routeId: "campaigns.create",
      issuedSessionLookup: issuedLookup(issuedWalletSession({
        proof: {
          ...issuedWalletSession().proof!,
          status: "signature_unverified",
          trustLevel: "untrusted",
        },
      })),
    });
    const internalCredential = await evaluateIssuedAuthEnforcement({
      headers: projectOwnerHeaders({
        "x-campaign-os-credential-boundary": "internal_agent_credential",
      }),
      ownerAddress: "ELF_project_owner_local",
      routeId: "campaigns.create",
      issuedSessionLookup: issuedLookup(),
    });
    const missingCapability = await evaluateIssuedAuthEnforcement({
      headers: projectOwnerHeaders(),
      ownerAddress: "ELF_project_owner_local",
      routeId: "campaigns.create",
      issuedSessionLookup: issuedLookup(issuedWalletSession({
        capabilities: ["CONTRACT_VIEW"],
      })),
    });

    expect(participant).toMatchObject({
      diagnostic: { code: "AUTH_ROLE_FORBIDDEN" },
      httpStatus: 403,
      status: "forbidden",
    });
    expect(unverifiedProof).toMatchObject({
      diagnostic: { code: "AUTH_PROOF_FORBIDDEN" },
      httpStatus: 403,
      status: "forbidden",
    });
    expect(internalCredential).toMatchObject({
      diagnostic: { code: "AUTH_SESSION_INVALID" },
      httpStatus: 401,
      status: "unauthenticated",
    });
    expect(missingCapability).toMatchObject({
      diagnostic: { code: "AUTH_FORBIDDEN" },
      httpStatus: 403,
      status: "forbidden",
    });
  });

  it("fails closed and sanitizes issued session repository failures", async () => {
    const decision = await evaluateIssuedAuthEnforcement({
      headers: projectOwnerHeaders(),
      ownerAddress: "ELF_project_owner_local",
      routeId: "campaigns.create",
      issuedSessionLookup: async () => {
        throw new Error("postgres://runtime-user:runtime-password@db.internal/campaign");
      },
      traceId: "trace-issued-lookup-failure",
    });

    expect(decision).toMatchObject({
      diagnostic: { code: "AUTH_SESSION_INVALID" },
      httpStatus: 401,
      safeDetails: {
        reason: "issued_session_lookup_failed",
        traceId: "trace-issued-lookup-failure",
      },
      status: "unauthenticated",
    });
    expect(JSON.stringify(decision)).not.toContain("runtime-password");
    expect(JSON.stringify(decision)).not.toContain("db.internal");
  });

  it("returns not_required for runtime metadata and read routes without local sessions", () => {
    expect(evaluateAuthEnforcement({ routeId: "runtime.health" })).toMatchObject({
      allowed: true,
      status: "not_required",
    });
    expect(evaluateAuthEnforcement({ routeId: "campaigns.list" })).toMatchObject({
      allowed: true,
      status: "not_required",
    });
  });

  it("rejects participant, review operator, and AI worker sessions for campaign creation", () => {
    const participant = evaluateAuthEnforcement({
      headers: projectOwnerHeaders({ "x-campaign-os-roles": "participant" }),
      ownerAddress: "ELF_project_owner_local",
      routeId: "campaigns.create",
    });
    const reviewOperator = evaluateAuthEnforcement({
      headers: projectOwnerHeaders({ "x-campaign-os-roles": "review_operator" }),
      ownerAddress: "ELF_project_owner_local",
      routeId: "campaigns.create",
    });
    const aiWorker = evaluateAuthEnforcement({
      headers: projectOwnerHeaders({
        "x-campaign-os-credential-boundary": "internal_agent_credential",
        "x-campaign-os-proof-status": "local_seeded",
        "x-campaign-os-roles": "ai_worker",
        "x-campaign-os-wallet-source": "AGENT_SKILL",
      }),
      ownerAddress: "ELF_project_owner_local",
      routeId: "campaigns.create",
    });

    expect(participant).toMatchObject({
      diagnostic: { code: "AUTH_ROLE_FORBIDDEN" },
      httpStatus: 403,
      status: "forbidden",
    });
    expect(reviewOperator).toMatchObject({
      diagnostic: { code: "AUTH_ROLE_FORBIDDEN" },
      httpStatus: 403,
      status: "forbidden",
    });
    expect(aiWorker).toMatchObject({
      diagnostic: { code: "AUTH_AGENT_CREDENTIAL_FORBIDDEN" },
      httpStatus: 403,
      status: "forbidden",
    });
  });

  it("rejects owner mismatch and unacceptable proof status", () => {
    expect(
      evaluateAuthEnforcement({
        headers: projectOwnerHeaders(),
        ownerSources: {
          membershipSourceReady: true,
          ownershipSourceReady: true,
        },
        routeId: "campaigns.create",
      }),
    ).toMatchObject({
      diagnostic: { code: "AUTH_OWNER_MISMATCH" },
      httpStatus: 403,
      status: "forbidden",
    });

    expect(
      evaluateAuthEnforcement({
        headers: projectOwnerHeaders(),
        ownerAddress: "ELF_other_owner",
        routeId: "campaigns.create",
      }),
    ).toMatchObject({
      diagnostic: { code: "AUTH_OWNER_MISMATCH" },
      httpStatus: 403,
      status: "forbidden",
    });

    expect(
      evaluateAuthEnforcement({
        headers: projectOwnerHeaders({ "x-campaign-os-proof-status": "signature_unverified" }),
        ownerAddress: "ELF_project_owner_local",
        routeId: "campaigns.create",
      }),
    ).toMatchObject({
      diagnostic: { code: "AUTH_PROOF_FORBIDDEN" },
      httpStatus: 403,
      status: "forbidden",
    });
  });

  it("fails closed when owner mutation lacks membership or ownership sources", () => {
    expect(projectOwnershipReadinessPolicy).toMatchObject({
      ownerMatchRequired: true,
      productionDependencyIds: ["project_membership_source", "project_ownership_source"],
    });

    const missingSources = evaluateAuthEnforcement({
      headers: projectOwnerHeaders(),
      ownerAddress: "ELF_project_owner_local",
      ownerSources: {
        membershipSourceReady: false,
        ownershipSourceReady: false,
      },
      routeId: "campaigns.create",
    });

    expect(missingSources).toMatchObject({
      diagnostic: { code: "AUTH_OWNERSHIP_SOURCE_MISSING" },
      httpStatus: 403,
      safeDetails: {
        ownerMutationBlocked: true,
        blockedDependencyIds: ["project_membership_source", "project_ownership_source"],
      },
      status: "forbidden",
    });

    const readySources = evaluateAuthEnforcement({
      headers: projectOwnerHeaders(),
      ownerAddress: "ELF_project_owner_local",
      ownerSources: {
        membershipSourceReady: true,
        ownershipSourceReady: true,
      },
      routeId: "campaigns.create",
    });

    expect(readySources.status).toBe("allowed");
  });

  it("prevents internal credentials from substituting participants or owners", () => {
    const internalOperator = evaluateAuthEnforcement({
      headers: projectOwnerHeaders({
        "x-campaign-os-credential-boundary": "internal_agent_credential",
        "x-campaign-os-proof-status": "verified",
        "x-campaign-os-roles": "internal_operator",
        "x-campaign-os-wallet-source": "AGENT_SKILL",
      }),
      routeId: "tasks.verify",
    });
    const agentOwner = evaluateAuthEnforcement({
      headers: projectOwnerHeaders({
        "x-campaign-os-credential-boundary": "internal_agent_credential",
        "x-campaign-os-proof-status": "verified",
        "x-campaign-os-roles": "project_owner",
        "x-campaign-os-wallet-source": "AGENT_SKILL",
      }),
      ownerAddress: "ELF_project_owner_local",
      routeId: "campaigns.create",
    });

    expect(internalOperator).toMatchObject({
      diagnostic: { code: "AUTH_FORBIDDEN" },
      httpStatus: 403,
      status: "forbidden",
    });
    expect(agentOwner).toMatchObject({
      diagnostic: { code: "AUTH_AGENT_CREDENTIAL_FORBIDDEN" },
      httpStatus: 403,
      status: "forbidden",
    });
  });

  it("uses stable required versus invalid 401 decisions before any mutation", async () => {
    const missingAll = await enforceThenMutate({
      issuedSessionLookup: issuedLookup(issuedParticipantSession()),
      routeId: "tasks.verify",
      traceId: "trace-missing-all",
    });
    const missingSessionId = await enforceThenMutate({
      headers: participantHeaders({ "x-campaign-os-session-id": undefined }),
      issuedSessionLookup: issuedLookup(issuedParticipantSession()),
      routeId: "tasks.verify",
      traceId: "trace-missing-id",
    });

    for (const result of [missingAll, missingSessionId]) {
      expect(result).toMatchObject({
        decision: {
          diagnostic: { code: "AUTH_SESSION_REQUIRED" },
          httpStatus: 401,
          status: "unauthenticated",
        },
        mutationCount: 0,
      });
      expect(result.decision.safeDetails.traceId).toMatch(/^trace-missing-/);
    }
  });

  it("rejects unknown, invalid, and header-mismatched issued sessions before mutation", async () => {
    const validRecord = issuedParticipantSession();
    const cases = [
      {
        headers: participantHeaders({ "x-campaign-os-session-id": "sess-unknown" }),
        lookup: issuedLookup(validRecord),
        traceId: "trace-unknown",
      },
      {
        headers: participantHeaders(),
        lookup: issuedLookup(issuedParticipantSession({
          issuer: { ...validRecord.issuer!, valid: false },
        })),
        traceId: "trace-invalid-issuer",
      },
      {
        headers: participantHeaders({
          "x-campaign-os-wallet-address": "2yVwParticipantCaseSensitive",
        }),
        lookup: issuedLookup(validRecord),
        traceId: "trace-address-case",
      },
      {
        headers: participantHeaders({ "x-campaign-os-account-type": "EOA" }),
        lookup: issuedLookup(validRecord),
        traceId: "trace-account",
      },
      {
        headers: participantHeaders({ "x-campaign-os-wallet-source": "NIGHTELF" }),
        lookup: issuedLookup(validRecord),
        traceId: "trace-source",
      },
    ];

    for (const testCase of cases) {
      const result = await enforceThenMutate({
        headers: testCase.headers,
        issuedSessionLookup: testCase.lookup,
        routeId: "tasks.verify",
        traceId: testCase.traceId,
      });

      expect(result).toMatchObject({
        decision: {
          diagnostic: { code: "AUTH_SESSION_INVALID" },
          httpStatus: 401,
          safeDetails: { traceId: testCase.traceId },
          status: "unauthenticated",
        },
        mutationCount: 0,
      });
    }
  });

  it("derives Participant credential boundaries from issued source and capabilities", async () => {
    const cases = [
      {
        headers: participantHeaders({
          "x-campaign-os-account-type": "EOA",
          "x-campaign-os-wallet-source": "AGENT_SKILL",
        }),
        record: issuedParticipantSession({
          accountType: "EOA",
          capabilities: ["SIGN_MESSAGE", "INTERNAL_AUTOMATION"],
          walletSource: "AGENT_SKILL",
        }),
        traceId: "trace-agent-source",
      },
      {
        headers: participantHeaders(),
        record: issuedParticipantSession({
          capabilities: ["SIGN_MESSAGE", "CONTRACT_VIEW", "INTERNAL_AUTOMATION"],
        }),
        traceId: "trace-agent-capability",
      },
    ];

    for (const testCase of cases) {
      const result = await enforceThenMutate({
        headers: testCase.headers,
        issuedSessionLookup: issuedLookup(testCase.record),
        routeId: "tasks.verify",
        traceId: testCase.traceId,
      });

      expect(result).toMatchObject({
        decision: {
          diagnostic: { code: "AUTH_FORBIDDEN" },
          httpStatus: 403,
          safeDetails: { traceId: testCase.traceId },
          status: "forbidden",
        },
        mutationCount: 0,
      });
    }
  });

  it("rejects Participant role, proof, and capability failures before mutation", async () => {
    const validRecord = issuedParticipantSession();
    const cases = [
      {
        code: "AUTH_FORBIDDEN",
        headers: participantHeaders({ "x-campaign-os-roles": "project_owner" }),
        record: validRecord,
        traceId: "trace-participant-role",
      },
      {
        code: "AUTH_FORBIDDEN",
        headers: participantHeaders(),
        record: issuedParticipantSession({
          proof: {
            ...validRecord.proof!,
            status: "signature_unverified",
            trustLevel: "untrusted",
          },
        }),
        traceId: "trace-participant-proof",
      },
      {
        code: "AUTH_FORBIDDEN",
        headers: participantHeaders(),
        record: issuedParticipantSession({ capabilities: ["CONTRACT_VIEW"] }),
        traceId: "trace-participant-capability",
      },
    ];

    for (const testCase of cases) {
      const result = await enforceThenMutate({
        headers: testCase.headers,
        issuedSessionLookup: issuedLookup(testCase.record),
        routeId: "tasks.verify",
        traceId: testCase.traceId,
      });

      expect(result).toMatchObject({
        decision: {
          diagnostic: { code: testCase.code },
          httpStatus: 403,
          safeDetails: { traceId: testCase.traceId },
          status: "forbidden",
        },
        mutationCount: 0,
      });
      expect(result.decision).not.toHaveProperty("session");
    }
  });

  it("does not promote an explicit stale issued proof from top-level verification status", async () => {
    const validRecord = issuedParticipantSession();
    const result = await enforceThenMutate({
      headers: participantHeaders(),
      issuedSessionLookup: issuedLookup(issuedParticipantSession({
        proof: {
          ...validRecord.proof!,
          status: "stale",
          trustLevel: "untrusted",
        },
        verificationStatus: "verified",
      })),
      routeId: "tasks.verify",
      traceId: "trace-participant-stale-proof",
    });

    expect(result).toMatchObject({
      decision: {
        diagnostic: { code: "AUTH_FORBIDDEN" },
        httpStatus: 403,
        safeDetails: {
          proofStatus: "stale",
          traceId: "trace-participant-stale-proof",
        },
        status: "forbidden",
      },
      mutationCount: 0,
    });
  });

  it.each([
    [
      "stale proof",
      issuedParticipantSession({
        proof: {
          ...issuedParticipantSession().proof!,
          status: "stale",
          trustLevel: "untrusted",
        },
        verificationStatus: "verified",
      }),
    ],
    [
      "unverified proof",
      issuedParticipantSession({
        proof: {
          ...issuedParticipantSession().proof!,
          status: "signature_unverified",
          trustLevel: "untrusted",
        },
      }),
    ],
    [
      "internal credential",
      issuedParticipantSession({
        capabilities: ["SIGN_MESSAGE", "CONTRACT_VIEW", "INTERNAL_AUTOMATION"],
      }),
    ],
  ])("rejects %s before a compatibility subject mismatch", async (caseName, record) => {
    const traceId = `trace-combined-${caseName.replace(/ /g, "-")}`;
    const result = await enforceThenMutate({
      compatibilitySubject: { walletAddress: "2YVwOtherParticipant" },
      headers: participantHeaders(),
      issuedSessionLookup: issuedLookup(record),
      routeId: "tasks.verify",
      traceId,
    });

    expect(result).toMatchObject({
      decision: {
        diagnostic: { code: "AUTH_FORBIDDEN" },
        httpStatus: 403,
        safeDetails: {
          traceId,
        },
        status: "forbidden",
      },
      mutationCount: 0,
    });
  });

  it("keeps missing and unknown sessions ahead of compatibility subject checks", async () => {
    const compatibilitySubject = { walletAddress: "2YVwOtherParticipant" };
    const missing = await enforceThenMutate({
      compatibilitySubject,
      issuedSessionLookup: issuedLookup(issuedParticipantSession()),
      routeId: "tasks.verify",
      traceId: "trace-combined-missing-session",
    });
    const unknown = await enforceThenMutate({
      compatibilitySubject,
      headers: participantHeaders({ "x-campaign-os-session-id": "sess-unknown" }),
      issuedSessionLookup: issuedLookup(issuedParticipantSession()),
      routeId: "tasks.verify",
      traceId: "trace-combined-unknown-session",
    });

    expect(missing).toMatchObject({
      decision: {
        diagnostic: { code: "AUTH_SESSION_REQUIRED" },
        httpStatus: 401,
        safeDetails: { traceId: "trace-combined-missing-session" },
      },
      mutationCount: 0,
    });
    expect(unknown).toMatchObject({
      decision: {
        diagnostic: { code: "AUTH_SESSION_INVALID" },
        httpStatus: 401,
        safeDetails: { traceId: "trace-combined-unknown-session" },
      },
      mutationCount: 0,
    });
  });

  it.each(["AELF", "tDVV", "tDVW"])(
    "uses trimmed exact Base58 identity for %s",
    async (chainId) => {
      const record = issuedParticipantSession({ chainId });
      const allowed = await evaluateIssuedAuthEnforcement({
        compatibilitySubject: { walletAddress: "  2YVwParticipantCaseSensitive  " },
        headers: participantHeaders({
          "x-campaign-os-wallet-address": "  2YVwParticipantCaseSensitive  ",
        }),
        issuedSessionLookup: issuedLookup(record),
        routeId: "tasks.verify",
        traceId: `trace-${chainId}-exact`,
      });
      const mismatch = await enforceThenMutate({
        compatibilitySubject: { walletAddress: "2yVwParticipantCaseSensitive" },
        headers: participantHeaders(),
        issuedSessionLookup: issuedLookup(record),
        routeId: "tasks.verify",
        traceId: `trace-${chainId}-case-mismatch`,
      });

      expect(allowed).toMatchObject({
        allowed: true,
        session: {
          chainId,
          network: "mainnet",
          walletSource: "PORTKEY_AA",
        },
        status: "allowed",
      });
      expect(mismatch).toMatchObject({
        decision: {
          diagnostic: {
            code: "AUTH_SUBJECT_MISMATCH",
            field: "walletAddress",
          },
          httpStatus: 403,
          status: "forbidden",
        },
        mutationCount: 0,
      });
      expect(JSON.stringify(mismatch)).not.toContain("2yVwParticipantCaseSensitive");
    },
  );

  it("does not lowercase non-aelf issued canonical subjects", async () => {
    const record = issuedParticipantSession({
      chainId: "ETH",
      walletAddress: "0xAbCdCanonical",
    });
    const result = await enforceThenMutate({
      compatibilitySubject: { walletAddress: "0xabcdcanonical" },
      headers: participantHeaders({
        "x-campaign-os-wallet-address": "0xAbCdCanonical",
      }),
      issuedSessionLookup: issuedLookup(record),
      routeId: "campaigns.participant.journey",
      traceId: "trace-non-aelf-case",
    });

    expect(result).toMatchObject({
      decision: {
        diagnostic: { code: "AUTH_SUBJECT_MISMATCH" },
        httpStatus: 403,
      },
      mutationCount: 0,
    });
  });

  it.each(compatibilitySubstitutionCases)(
    "rejects compatibility %s substitution with safe details",
    async (field, compatibilitySubject) => {
      const result = await enforceThenMutate({
        compatibilitySubject,
        headers: participantHeaders(),
        issuedSessionLookup: issuedLookup(issuedParticipantSession()),
        routeId: "campaigns.eligibility",
        traceId: `trace-subject-${field}`,
      });

      expect(result).toMatchObject({
        decision: {
          diagnostic: {
            code: "AUTH_SUBJECT_MISMATCH",
            field,
          },
          httpStatus: 403,
          safeDetails: {
            reason: "compatibility_subject_mismatch",
            traceId: `trace-subject-${field}`,
          },
          status: "forbidden",
        },
        mutationCount: 0,
      });
      expect(result.decision.safeDetails).not.toHaveProperty("issuedValue");
      expect(result.decision.safeDetails).not.toHaveProperty("claimedValue");
    },
  );

  it("redacts secret-like denial diagnostic details", () => {
    const sanitized = sanitizeAuthEnforcementDetails({
      authorization: "Bearer raw-secret-token",
      callback: "https://storage.invalid/diagnostic?token=raw-secret-token",
      cookie: "signed-cookie-secret",
      jwt: "jwt.raw.secret",
      nested: {
        privateKey: "private-key-sample",
        rawSignature: "raw-signature-sample",
        safe: "route-debug",
      },
      sessionSecret: "session-secret-sample",
    });

    expect(sanitized).toEqual({
      redactedFieldCount: 6,
      redactionApplied: true,
      safeDetails: {
        callback: "[redacted-sensitive]",
        nested: {
          safe: "route-debug",
        },
      },
    });
    expectNoSensitiveFragments(sanitized);
  });

  it("publishes nine unique locally enforced Admin operator route policies", () => {
    const routeIds = [
      "admin.campaigns.list",
      "admin.reviews.list",
      "admin.reviews.detail",
      "admin.reviews.decide",
      "admin.winners.list",
      "admin.artifacts.generate",
      "admin.artifacts.list",
      "admin.artifacts.detail",
      "admin.artifacts.download",
    ];

    expect(adminOperatorRoutePolicies.map((policy) => policy.routeId)).toEqual(routeIds);
    expect(new Set(adminOperatorRoutePolicies.map((policy) => policy.routeId)).size).toBe(9);

    for (const routeId of routeIds) {
      expect(getAdminOperatorRoutePolicy(routeId)).toMatchObject({
        allowedRoles: ["internal_operator", "review_operator"],
        credentialBoundary: "ordinary_user_wallet",
        enforcementStatus: "local_enforced",
        membershipRequired: true,
        routeId,
        sessionRequired: true,
      });
    }

    expect(getAdminOperatorRoutePolicy("admin.campaigns.list")).toMatchObject({
      campaignScope: "membership_feed",
    });
    for (const routeId of routeIds.slice(1)) {
      expect(getAdminOperatorRoutePolicy(routeId)).toMatchObject({
        campaignScope: "campaign_path",
      });
    }
  });

  it("enforces missing and invalid issued sessions before membership or resources", async () => {
    const cases = [
      { expected: "AUTH_SESSION_REQUIRED", headers: undefined, record: issuedAdminSession() },
      {
        expected: "AUTH_SESSION_INVALID",
        headers: adminOperatorHeaders({ "x-campaign-os-session-id": "sess-unknown" }),
        record: issuedAdminSession(),
      },
      {
        expected: "AUTH_SESSION_INVALID",
        headers: adminOperatorHeaders(),
        record: issuedAdminSession({
          proof: { ...issuedAdminSession().proof!, status: "stale" },
        }),
      },
      {
        expected: "AUTH_SESSION_INVALID",
        headers: adminOperatorHeaders({
          "x-campaign-os-wallet-address": "2YVwSubstitutedOperator",
        }),
        record: issuedAdminSession(),
      },
      {
        expected: "AUTH_SESSION_INVALID",
        headers: adminOperatorHeaders({ "x-campaign-os-session-id": "../malformed" }),
        record: issuedAdminSession(),
      },
    ] as const;

    for (const [index, testCase] of cases.entries()) {
      let issuedLookupCount = 0;
      let membershipLookupCount = 0;
      let resourceCallCount = 0;
      const baseRegistry = adminRegistry();
      const membershipRegistry = {
        health: baseRegistry.health,
        lookup: (...args: Parameters<typeof baseRegistry.lookup>) => {
          membershipLookupCount += 1;
          return baseRegistry.lookup(...args);
        },
      };
      const result = await evaluateAdminOperatorEnforcement({
        campaignId: "campaign-admin-a",
        headers: testCase.headers,
        issuedSessionLookup: async (sessionId) => {
          issuedLookupCount += 1;
          return testCase.record.sessionId === sessionId ? testCase.record : undefined;
        },
        membershipRegistry,
        routeId: "admin.reviews.detail",
        traceId: `trace-admin-session-${index}`,
      });

      if (result.allowed) {
        resourceCallCount += 1;
      }

      expect(result).toMatchObject({
        diagnostic: { code: testCase.expected },
        httpStatus: 401,
        safeDetails: { traceId: `trace-admin-session-${index}` },
        status: "unauthenticated",
      });
      expect(membershipLookupCount).toBe(0);
      expect(resourceCallCount).toBe(0);
      expect(issuedLookupCount).toBe(testCase.headers && testCase.headers["x-campaign-os-session-id"] !== "../malformed" ? 1 : 0);
    }
  });

  it.each([
    ["non-member", [], adminOperatorHeaders(), "campaign-admin-a"],
    ["revoked", [adminMembership({ active: false })], adminOperatorHeaders(), "campaign-admin-a"],
    ["role mismatch", [adminMembership({ roleIds: ["internal_operator"] })], adminOperatorHeaders(), "campaign-admin-a"],
    ["role spoof", [], adminOperatorHeaders({ "x-campaign-os-roles": "internal_operator" }), "campaign-admin-a"],
    ["out of scope", [adminMembership()], adminOperatorHeaders(), "campaign-admin-b"],
  ] as const)("forbids %s before resource access", async (_case, memberships, headers, campaignId) => {
    let membershipLookupCount = 0;
    let resourceCallCount = 0;
    const baseRegistry = adminRegistry(memberships);
    const result = await evaluateAdminOperatorEnforcement({
      campaignId,
      headers,
      issuedSessionLookup: issuedLookup(issuedAdminSession()),
      membershipRegistry: {
        health: baseRegistry.health,
        lookup: (...args) => {
          membershipLookupCount += 1;
          return baseRegistry.lookup(...args);
        },
      },
      routeId: "admin.reviews.detail",
      traceId: "trace-admin-forbidden",
    });

    if (result.allowed) {
      resourceCallCount += 1;
    }

    expect(result).toMatchObject({
      diagnostic: { code: "AUTH_FORBIDDEN" },
      httpStatus: 403,
      safeDetails: { traceId: "trace-admin-forbidden" },
      status: "forbidden",
    });
    expect(membershipLookupCount).toBe(1);
    expect(resourceCallCount).toBe(0);
    expect(JSON.stringify(result)).not.toContain("2YVwAdminOperatorCaseSensitive");
  });

  it("forbids internal automation credentials before membership lookup", async () => {
    let membershipLookupCount = 0;
    const baseRegistry = adminRegistry();
    const internalSession = issuedAdminSession({
      capabilities: ["INTERNAL_AUTOMATION"],
      walletSource: "AGENT_SKILL",
    });
    const result = await evaluateAdminOperatorEnforcement({
      campaignId: "campaign-admin-a",
      headers: {
        "x-campaign-os-roles": "review_operator",
        "x-campaign-os-session-id": "sess-admin-operator",
      },
      issuedSessionLookup: issuedLookup(internalSession),
      membershipRegistry: {
        health: baseRegistry.health,
        lookup: (...args) => {
          membershipLookupCount += 1;
          return baseRegistry.lookup(...args);
        },
      },
      routeId: "admin.reviews.list",
      traceId: "trace-admin-internal",
    });

    expect(result).toMatchObject({
      diagnostic: { code: "AUTH_FORBIDDEN" },
      httpStatus: 403,
      status: "forbidden",
    });
    expect(membershipLookupCount).toBe(0);
  });

  it("authorizes a server-derived operator context without retaining raw proof or config", async () => {
    const result = await evaluateAdminOperatorEnforcement({
      campaignId: "campaign-admin-a",
      headers: adminOperatorHeaders(),
      issuedSessionLookup: issuedLookup(issuedAdminSession()),
      membershipRegistry: adminRegistry(),
      routeId: "admin.artifacts.generate",
      traceId: "trace-admin-allowed",
    });

    expect(result).toMatchObject({
      adminOperator: {
        accountType: "AA",
        campaignIds: ["campaign-admin-a"],
        credentialBoundary: "ordinary_user_wallet",
        issuerMode: "local_opaque",
        proofStatus: "verified",
        requestedRole: "review_operator",
        sessionId: "sess-admin-operator",
        sourceRevision: "admin-membership-sha256:test-revision",
        subjectAddress: "2YVwAdminOperatorCaseSensitive",
        walletSource: "PORTKEY_AA",
      },
      allowed: true,
      routeId: "admin.artifacts.generate",
      status: "allowed",
    });
    expect(JSON.stringify(result)).not.toContain("issuer:sess-admin-operator");
    expect(JSON.stringify(result)).not.toContain("wallet_signature");
  });

  it("keeps known and unknown resource denial envelopes equivalent with zero resource calls", async () => {
    const projections: unknown[] = [];

    for (const resourceId of ["known-resource", "unknown-resource"]) {
      let resourceCallCount = 0;
      const result = await evaluateAdminOperatorEnforcement({
        campaignId: resourceId,
        headers: adminOperatorHeaders(),
        issuedSessionLookup: issuedLookup(issuedAdminSession()),
        membershipRegistry: adminRegistry([]),
        routeId: "admin.artifacts.detail",
        traceId: "trace-admin-no-leak",
      });

      if (result.allowed) {
        resourceCallCount += 1;
      }

      expect(resourceCallCount).toBe(0);
      projections.push({
        code: result.diagnostic?.code,
        httpStatus: result.httpStatus,
        safeDetails: result.safeDetails,
        status: result.status,
      });
    }

    expect(projections[0]).toEqual(projections[1]);
    expect(JSON.stringify(projections)).not.toContain("known-resource");
    expect(JSON.stringify(projections)).not.toContain("unknown-resource");
  });

  it.each([
    ["missing role", adminOperatorHeaders({ "x-campaign-os-roles": undefined })],
    ["ordinary role", adminOperatorHeaders({ "x-campaign-os-roles": "project_owner" })],
    ["conflicting roles", adminOperatorHeaders({ "x-campaign-os-roles": "internal_operator,review_operator" })],
    ["oversize role", adminOperatorHeaders({ "x-campaign-os-roles": "r".repeat(65) })],
    ["multiple values", adminOperatorHeaders({ "x-campaign-os-roles": ["review_operator", "internal_operator"] })],
    ["duplicate header keys", {
      ...adminOperatorHeaders(),
      "X-Campaign-OS-Roles": "internal_operator",
    }],
  ] as const)("rejects %s without treating client roles as authority", async (_case, headers) => {
    let issuedLookupCount = 0;
    const result = await evaluateAdminOperatorEnforcement({
      campaignId: "campaign-admin-a",
      headers,
      issuedSessionLookup: async () => {
        issuedLookupCount += 1;
        return issuedAdminSession();
      },
      membershipRegistry: adminRegistry(),
      routeId: "admin.reviews.list",
    });

    expect(result).toMatchObject({
      diagnostic: { code: "AUTH_FORBIDDEN" },
      httpStatus: 403,
      status: "forbidden",
    });
    expect(result.safeDetails.traceId).toMatch(/^trace-[a-f0-9-]{36}$/);
    expect(issuedLookupCount).toBe(0);
  });

  it("fails closed for unknown routes and generic header-only enforcement", async () => {
    const unknown = await evaluateAdminOperatorEnforcement({
      headers: adminOperatorHeaders(),
      issuedSessionLookup: issuedLookup(issuedAdminSession()),
      membershipRegistry: adminRegistry(),
      routeId: "admin.unknown",
    });
    const rawHeaderOnly = evaluateAuthEnforcement({
      headers: adminOperatorHeaders(),
      routeId: "admin.reviews.list",
    });

    for (const result of [unknown, rawHeaderOnly]) {
      expect(result).toMatchObject({
        allowed: false,
        diagnostic: { code: "AUTH_FORBIDDEN" },
        httpStatus: 403,
        status: "forbidden",
      });
    }
  });

  it("replaces malicious Trace IDs with a safe generated value", async () => {
    const maliciousTrace = "../../Users/private?token=raw-secret-token";
    const result = await evaluateAdminOperatorEnforcement({
      campaignId: "campaign-admin-a",
      headers: adminOperatorHeaders(),
      issuedSessionLookup: issuedLookup(issuedAdminSession()),
      membershipRegistry: adminRegistry([]),
      routeId: "admin.reviews.list",
      traceId: maliciousTrace,
    });

    expect(result.safeDetails.traceId).toMatch(/^trace-[a-f0-9-]{36}$/);
    expect(JSON.stringify(result)).not.toContain(maliciousTrace);
    expect(JSON.stringify(result)).not.toContain("raw-secret-token");
    expect(JSON.stringify(result)).not.toContain("/Users/");
  });

  it("sanitizes issued-session and membership lookup failures", async () => {
    const sensitive = "postgres://runtime:password@db.internal/campaign?token=raw-token";
    const issuedFailure = await evaluateAdminOperatorEnforcement({
      campaignId: "campaign-admin-a",
      headers: adminOperatorHeaders(),
      issuedSessionLookup: async () => {
        throw new Error(sensitive);
      },
      membershipRegistry: adminRegistry(),
      routeId: "admin.reviews.list",
      traceId: "trace-admin-issued-failure",
    });
    const baseRegistry = adminRegistry();
    const membershipFailure = await evaluateAdminOperatorEnforcement({
      campaignId: "campaign-admin-a",
      headers: adminOperatorHeaders(),
      issuedSessionLookup: issuedLookup(issuedAdminSession()),
      membershipRegistry: {
        health: baseRegistry.health,
        lookup: () => {
          throw new Error(sensitive);
        },
      },
      routeId: "admin.reviews.list",
      traceId: "trace-admin-membership-failure",
    });

    expect(issuedFailure).toMatchObject({
      diagnostic: { code: "AUTH_SESSION_INVALID" },
      httpStatus: 401,
      safeDetails: { traceId: "trace-admin-issued-failure" },
    });
    expect(membershipFailure).toMatchObject({
      diagnostic: { code: "AUTH_FORBIDDEN" },
      httpStatus: 403,
      safeDetails: { traceId: "trace-admin-membership-failure" },
    });
    expect(JSON.stringify([issuedFailure, membershipFailure])).not.toContain(sensitive);
    expect(JSON.stringify([issuedFailure, membershipFailure])).not.toContain("raw-token");
  });

  it("supports explicit internal membership and Campaign feed scope without client expansion", async () => {
    const internal = await evaluateAdminOperatorEnforcement({
      campaignId: "campaign-admin-a",
      headers: adminOperatorHeaders({ "x-campaign-os-roles": "internal_operator" }),
      issuedSessionLookup: issuedLookup(issuedAdminSession()),
      membershipRegistry: adminRegistry([adminMembership({ roleIds: ["internal_operator"] })]),
      routeId: "admin.reviews.decide",
      traceId: "trace-admin-internal-role",
    });
    const feed = await evaluateAdminOperatorEnforcement({
      headers: adminOperatorHeaders(),
      issuedSessionLookup: issuedLookup(issuedAdminSession()),
      membershipRegistry: adminRegistry([adminMembership({ campaignIds: [] })]),
      routeId: "admin.campaigns.list",
      traceId: "trace-admin-feed",
    });
    let issuedLookupCount = 0;
    const missingScope = await evaluateAdminOperatorEnforcement({
      headers: adminOperatorHeaders(),
      issuedSessionLookup: async () => {
        issuedLookupCount += 1;
        return issuedAdminSession();
      },
      membershipRegistry: adminRegistry(),
      routeId: "admin.reviews.list",
      traceId: "trace-admin-missing-scope",
    });

    expect(internal).toMatchObject({
      adminOperator: { requestedRole: "internal_operator" },
      allowed: true,
    });
    expect(feed).toMatchObject({
      adminOperator: { campaignIds: [] },
      allowed: true,
    });
    expect(missingScope).toMatchObject({
      diagnostic: { code: "AUTH_FORBIDDEN" },
      httpStatus: 403,
    });
    expect(issuedLookupCount).toBe(0);
  });
});
