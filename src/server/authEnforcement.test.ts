import { describe, expect, it } from "vitest";
import {
  evaluateAuthEnforcement,
  parseLocalAuthSessionHeaders,
  projectOwnershipReadinessPolicy,
  rbacOwnershipRoutePolicyMatrix,
  sanitizeAuthEnforcementDetails,
  type AuthRuntimeHeaders,
} from "./authEnforcement";

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
