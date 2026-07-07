import { describe, expect, it } from "vitest";
import {
  evaluateAuthEnforcement,
  parseLocalAuthSessionHeaders,
  type AuthRuntimeHeaders,
} from "./authEnforcement";

const sensitiveFragments = [
  "bearer raw-secret-token",
  "raw-signature-sample",
  "private-key-sample",
  "session-secret-sample",
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
});
