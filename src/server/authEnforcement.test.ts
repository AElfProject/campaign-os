import { describe, expect, it } from "vitest";
import {
  evaluateAuthEnforcement,
  evaluateIssuedAuthEnforcement,
  parseLocalAuthSessionHeaders,
  projectOwnershipReadinessPolicy,
  rbacOwnershipRoutePolicyMatrix,
  sanitizeAuthEnforcementDetails,
  type AuthRuntimeHeaders,
} from "./authEnforcement";
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
      routeIds: ["campaigns.create", "campaigns.owner.list"],
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
      diagnostic: { code: "AUTH_AGENT_CREDENTIAL_FORBIDDEN" },
      httpStatus: 403,
      status: "forbidden",
    });
    expect(missingCapability).toMatchObject({
      diagnostic: { code: "AUTH_FORBIDDEN" },
      httpStatus: 403,
      status: "forbidden",
    });
  });

  it("lets the runtime persistence wrapper serialize issued session repository failures", async () => {
    await expect(evaluateIssuedAuthEnforcement({
      headers: projectOwnerHeaders(),
      ownerAddress: "ELF_project_owner_local",
      routeId: "campaigns.create",
      issuedSessionLookup: async () => {
        throw new Error("database URL should not leak");
      },
    })).rejects.toThrow("database URL should not leak");
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
      diagnostic: { code: "AUTH_AGENT_CREDENTIAL_FORBIDDEN" },
      httpStatus: 403,
      status: "forbidden",
    });
    expect(agentOwner).toMatchObject({
      diagnostic: { code: "AUTH_AGENT_CREDENTIAL_FORBIDDEN" },
      httpStatus: 403,
      status: "forbidden",
    });
  });

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
});
