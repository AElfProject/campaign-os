import { describe, expect, it } from "vitest";
import {
  authSessionRolePolicies,
  createAuthSessionReadinessReport,
  createProductionAuthSessionFoundation,
  createSeededWalletSessionContracts,
  createSessionProofBoundary,
  getProtectedRouteAuth,
  hasAuthRoleRouteAccess,
  isAuthRoleCapabilityForbidden,
  protectedRouteAuthMap,
  summarizeSensitiveAuthSessionInput,
} from "./authSession";

const forbiddenRawFragments = [
  "bearer sample-bearer-token",
  "cookie-secret-sample",
  "jwt.secret.sample",
  "nonce-secret-sample",
  "session-secret-sample",
  "raw-signature-sample",
  "private-key-sample",
  "sample mnemonic phrase",
  "seed-phrase-sample",
  "object-key-sample",
  "https://storage.invalid/signed-url",
];

const expectNoRawSensitiveFragments = (value: unknown) => {
  const serialized = JSON.stringify(value).toLowerCase();

  for (const fragment of forbiddenRawFragments) {
    expect(serialized).not.toContain(fragment);
  }
};

describe("auth session boundary", () => {
  it("defines seeded normalized wallet sessions for all required wallet sources", () => {
    const sessions = createSeededWalletSessionContracts();
    const bySource = Object.fromEntries(sessions.map((session) => [session.walletSource, session]));

    expect(Object.keys(bySource).sort()).toEqual([
      "AGENT_SKILL",
      "NIGHTELF",
      "OTHER",
      "PORTKEY_AA",
      "PORTKEY_EOA_APP",
      "PORTKEY_EOA_EXTENSION",
    ]);
    expect(bySource.PORTKEY_AA).toMatchObject({
      accountType: "AA",
      address: "ELF_2YVwSeededPortkeyAa",
      chainId: "AELF",
      network: "mainnet",
      proofStatus: "verified",
      roleIds: ["participant"],
      walletName: "Portkey AA",
    });
    expect(bySource.PORTKEY_EOA_APP).toMatchObject({
      accountType: "EOA",
      proofStatus: "local_seeded",
      walletName: "Portkey EOA App",
    });
    expect(bySource.PORTKEY_EOA_EXTENSION).toMatchObject({
      accountType: "EOA",
      proofStatus: "local_seeded",
      walletName: "Portkey EOA Extension",
    });
    expect(bySource.NIGHTELF).toMatchObject({
      accountType: "EOA",
      proofStatus: "local_seeded",
      walletName: "NightElf",
    });
    expect(bySource.AGENT_SKILL).toMatchObject({
      accountType: "EOA",
      credentialBoundary: "internal_agent_credential",
      internalAutomation: true,
      proofStatus: "proof_required",
      roleIds: ["ai_worker"],
    });
    expect(bySource.OTHER).toMatchObject({
      accountType: "UNKNOWN",
      proofStatus: "signature_unverified",
      roleIds: [],
      walletName: "Manual address",
    });

    for (const session of sessions) {
      expect(session.sessionId).not.toHaveLength(0);
      expect(session.capabilities.length).toBeGreaterThan(0);
      expect(session.connectedAt).toBe("2026-07-06T00:00:00.000Z");
      expect(session.lastSeenAt).toBe("2026-07-06T00:00:00.000Z");
      expectNoRawSensitiveFragments(session);
    }
  });

  it("models all proof states without performing live verification", () => {
    const statuses = [
      "local_seeded",
      "proof_required",
      "signature_unverified",
      "verified",
      "blocked",
    ] as const;

    for (const status of statuses) {
      const boundary = createSessionProofBoundary({
        status,
        verificationMode: status === "blocked" ? "production_required" : "local_only",
      });

      expect(boundary.status).toBe(status);
      expect(boundary.liveVerificationExecuted).toBe(false);
    }

    const blocked = createSessionProofBoundary({
      productionRequired: true,
      proofVerifierReady: false,
      rbacPolicyReady: false,
      sessionConfigReady: false,
      ownershipSourceReady: false,
    });

    expect(blocked).toMatchObject({
      status: "blocked",
      verificationMode: "production_required",
      liveVerificationExecuted: false,
    });
    expect(blocked.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "AUTH_SESSION_CONFIG_MISSING",
        "AUTH_PROOF_VERIFIER_MISSING",
        "AUTH_POLICY_MISSING",
        "AUTH_OWNERSHIP_SOURCE_MISSING",
      ]),
    );
  });

  it("keeps role policy least-privilege by route group and capability", () => {
    expect(authSessionRolePolicies.map((policy) => policy.id)).toEqual([
      "participant",
      "project_owner",
      "internal_operator",
      "review_operator",
      "ai_worker",
    ]);

    expect(hasAuthRoleRouteAccess("participant", "wallet_session")).toBe(true);
    expect(hasAuthRoleRouteAccess("participant", "task_verify")).toBe(true);
    expect(hasAuthRoleRouteAccess("participant", "campaign_write")).toBe(false);
    expect(hasAuthRoleRouteAccess("project_owner", "campaign_write")).toBe(true);
    expect(hasAuthRoleRouteAccess("project_owner", "admin_review")).toBe(false);
    expect(hasAuthRoleRouteAccess("internal_operator", "admin_review")).toBe(true);
    expect(hasAuthRoleRouteAccess("review_operator", "campaign_write")).toBe(false);
    expect(hasAuthRoleRouteAccess("ai_worker", "ai_ops")).toBe(true);
    expect(hasAuthRoleRouteAccess("ai_worker", "task_verify")).toBe(false);

    expect(isAuthRoleCapabilityForbidden("participant", "export:download")).toBe(true);
    expect(isAuthRoleCapabilityForbidden("internal_operator", "wallet:user_substitution")).toBe(true);
    expect(isAuthRoleCapabilityForbidden("ai_worker", "user:participate")).toBe(true);
    expect(isAuthRoleCapabilityForbidden("ai_worker", "wallet:live_sign")).toBe(true);
  });

  it("publishes representative protected route auth metadata with local campaign mutation enforcement", () => {
    expect(protectedRouteAuthMap.map((entry) => entry.routeId)).toEqual(
      expect.arrayContaining([
        "runtime.health",
        "runtime.contracts",
        "wallet.session.create",
        "campaigns.create",
        "campaigns.tasks.add",
        "campaigns.export.preview",
        "tasks.verify",
        "admin.review.queue",
        "agent.skill.internal",
      ]),
    );

    expect(getProtectedRouteAuth("runtime.health")).toMatchObject({
      enforcementStatus: "not_required",
      proofRequired: false,
      sessionRequired: false,
    });
    expect(getProtectedRouteAuth("wallet.session.create")).toMatchObject({
      enforcementStatus: "metadata_only",
      proofRequired: true,
      requiredRoles: [],
      sessionRequired: false,
    });
    expect(getProtectedRouteAuth("campaigns.create")).toMatchObject({
      enforcementStatus: "local_enforced",
      requiredRoles: ["project_owner"],
      sessionRequired: true,
    });
    expect(getProtectedRouteAuth("campaigns.export.preview")?.requiredRoles).toEqual([
      "project_owner",
      "internal_operator",
    ]);
    expect(getProtectedRouteAuth("admin.review.queue")).toMatchObject({
      requiredRoles: ["internal_operator", "review_operator"],
      routeSource: "future_route",
    });

    for (const routeAuth of protectedRouteAuthMap) {
      expect(routeAuth.productionDependencyIds).toEqual(
        expect.arrayContaining(["live_wallet_proof_verifier", "rbac_enforcement"]),
      );
      expect(routeAuth.enforcementStatus).not.toBe("blocked");
    }
  });

  it("fails closed for production-required readiness and separates agent credentials", () => {
    const report = createAuthSessionReadinessReport({
      observedInput: {
        address: "ELF_public",
        bearerToken: "Bearer sample-bearer-token",
        mnemonic: "sample mnemonic phrase",
        objectKey: "object-key-sample",
        privateKey: "private-key-sample",
        rawSignature: "raw-signature-sample",
        seedPhrase: "seed-phrase-sample",
        sessionSecret: "session-secret-sample",
        signedUrl: "https://storage.invalid/signed-url",
      },
      productionRequired: true,
      profileId: "production-required",
    });

    expect(report).toMatchObject({
      agentCredentialBoundary: {
        agentSkillCanSubstituteUserWallet: false,
        separatedFromUserWalletSession: true,
      },
      authContracts: {
        liveSideEffectsEnabled: false,
        productionReady: false,
        proofVerifier: {
          localContractReady: true,
          liveVerificationExecuted: false,
          productionReady: false,
          status: "local_contract_ready",
        },
        sessionIssuer: {
          cookieIssued: false,
          jwtIssued: false,
          liveSigningExecuted: false,
          localContractReady: true,
          productionReady: false,
          status: "local_contract_ready",
        },
      },
      profileId: "production-required",
      status: "blocked",
      validation: {
        valid: false,
      },
    });
    expect(report.authContracts.blockedDependencyIds).toEqual(
      expect.arrayContaining([
        "live_wallet_proof_verifier",
        "auth_nonce_store",
        "session_signing_key",
        "secret_manager",
        "production_session_store",
        "project_membership_source",
        "project_ownership_source",
      ]),
    );
    expect(report.validation.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "AUTH_SESSION_CONFIG_MISSING",
        "AUTH_PROOF_VERIFIER_MISSING",
        "AUTH_POLICY_MISSING",
        "AUTH_OWNERSHIP_SOURCE_MISSING",
        "AUTH_SENSITIVE_INPUT_REDACTED",
      ]),
    );
    expect(report.protectedRouteCount).toBeGreaterThanOrEqual(7);
    expect(report.sessionContract.walletSources).toEqual(
      expect.arrayContaining([
        "PORTKEY_AA",
        "PORTKEY_EOA_APP",
        "PORTKEY_EOA_EXTENSION",
        "NIGHTELF",
        "AGENT_SKILL",
        "OTHER",
      ]),
    );
    expectNoRawSensitiveFragments(report);
  });

  it("creates the production auth session foundation with stable no-live invariants", () => {
    const foundation = createProductionAuthSessionFoundation({
      observedInput: {
        authCookie: "cookie-secret-sample",
        bearerToken: "Bearer sample-bearer-token",
        jwt: "jwt.secret.sample",
        nonce: "nonce-secret-sample",
        privateKey: "private-key-sample",
        rawSignature: "raw-signature-sample",
        seedPhrase: "seed-phrase-sample",
        sessionSecret: "session-secret-sample",
        signedUrl: "https://storage.invalid/signed-url",
      },
      profileId: "production-required",
    });

    expect(foundation).toMatchObject({
      id: "campaign-os-production-auth-session-foundation",
      profileId: "production-required",
      productionReady: false,
      liveSideEffectsEnabled: false,
      liveVerificationExecuted: false,
      liveSigningExecuted: false,
      cookieIssued: false,
      jwtIssued: false,
      status: "blocked",
      valid: false,
      blockerCount: 8,
      walletProof: {
        liveVerificationExecuted: false,
        liveVerifierReady: false,
        nonceStoreReady: false,
        status: "blocked",
      },
      sessionIssuer: {
        cookieIssued: false,
        issuerMode: "production_blocked",
        jwtIssued: false,
        liveSigningExecuted: false,
        productionSessionStoreReady: false,
        secretManagerReady: false,
        signingKeyReady: false,
      },
      ownership: {
        membershipSourceReady: false,
        ownerMatchRequired: true,
        ownerMutationBlocked: true,
        ownershipSourceReady: false,
      },
      rbac: {
        agentCredentialSubstitutionDisabled: true,
        roleCount: 5,
      },
      redaction: {
        redactionApplied: true,
      },
    });
    expect(foundation.blockedDependencyIds).toEqual([
      "wallet_live_verifier",
      "nonce_store",
      "session_signing_key",
      "secret_manager",
      "production_session_store",
      "project_membership_source",
      "project_ownership_source",
      "rbac_enforcement_policy",
    ]);
    expect(foundation.diagnosticCodes).toEqual([
      "AUTH_PROOF_VERIFIER_MISSING",
      "AUTH_NONCE_STORE_MISSING",
      "AUTH_SESSION_ISSUER_MISSING",
      "AUTH_SECRET_MANAGER_MISSING",
      "AUTH_SESSION_STORE_MISSING",
      "AUTH_SESSION_CONFIG_MISSING",
      "AUTH_OWNERSHIP_SOURCE_MISSING",
      "AUTH_POLICY_MISSING",
      "AUTH_AGENT_CREDENTIAL_SEPARATE",
      "AUTH_SENSITIVE_INPUT_REDACTED",
    ]);
    expect(foundation.walletSourceCoverage).toEqual([
      "PORTKEY_AA",
      "PORTKEY_EOA_APP",
      "PORTKEY_EOA_EXTENSION",
      "NIGHTELF",
      "AGENT_SKILL",
      "OTHER",
    ]);
    expect(foundation.accountTypeCoverage).toEqual(["AA", "EOA", "UNKNOWN"]);
    expect(foundation.agentCredentialBoundary).toMatchObject({
      agentSkillCanSubstituteProjectOwner: false,
      agentSkillCanSubstituteUserWallet: false,
      ordinaryUserWalletSources: ["PORTKEY_AA", "PORTKEY_EOA_APP", "PORTKEY_EOA_EXTENSION", "NIGHTELF", "OTHER"],
    });
    expect(foundation.protectedRouteCoverage.protectedRouteCount).toBe(protectedRouteAuthMap.length);
    expectNoRawSensitiveFragments(foundation);
  });

  it("keeps the local-review foundation deterministic and fast", () => {
    const first = createProductionAuthSessionFoundation({
      generatedAt: "2026-07-07T00:00:00.000Z",
      profileId: "local-review",
    });
    const second = createProductionAuthSessionFoundation({
      generatedAt: "2026-07-07T00:00:00.000Z",
      profileId: "local-review",
    });

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      profileId: "local-review",
      status: "local_ready",
      valid: true,
      blockerCount: 0,
      productionReady: false,
      liveSideEffectsEnabled: false,
      liveVerificationExecuted: false,
      liveSigningExecuted: false,
      cookieIssued: false,
      jwtIssued: false,
    });

    const startedAt = performance.now();

    for (let index = 0; index < 1_000; index += 1) {
      createProductionAuthSessionFoundation({
        generatedAt: "2026-07-07T00:00:00.000Z",
        profileId: "local-review",
      });
    }

    expect(performance.now() - startedAt).toBeLessThan(100);
  });

  it("summarizes sensitive input without returning secret-like fields or values", () => {
    const summary = summarizeSensitiveAuthSessionInput({
      address: "ELF_public",
      memo: "Bearer sample-bearer-token",
      nested: {
        privateKey: "private-key-sample",
        safeNote: "review-only",
      },
      nonce: "nonce-secret-sample",
      rawSignature: "raw-signature-sample",
      sessionSecret: "session-secret-sample",
      signedUrl: "https://storage.invalid/signed-url",
    });

    expect(summary).toEqual({
      redactedFieldCount: 6,
      redactionApplied: true,
      safePreview: {
        address: "ELF_public",
        memo: "[redacted-sensitive]",
        nested: {
          safeNote: "review-only",
        },
      },
    });
    expectNoRawSensitiveFragments(summary);
  });
});
