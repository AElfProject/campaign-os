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
  locallyEnforcedAuthRouteIds,
  protectedRouteAuthMap,
  resolveTrustedAdminOperatorSession,
  summarizeSensitiveAuthSessionInput,
} from "./authSession";
import type { WalletSessionRecord } from "./walletSessionRepository";

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

const issuedAdminWalletSession = (
  overrides: Partial<WalletSessionRecord> = {},
): WalletSessionRecord => ({
  accountType: "AA",
  capabilities: ["SIGN_MESSAGE", "CONTRACT_VIEW"],
  chainId: "AELF",
  connectedAt: "2026-07-14T00:00:00.000Z",
  displayAddress: "2YVwAdminOperatorCaseSensitive",
  issuer: {
    artifactType: "local_session_reference",
    cookieIssued: false,
    diagnosticCodes: [],
    issuerMode: "local_opaque",
    jwtIssued: false,
    liveSigningExecuted: false,
    referenceId: "issuer:sess-admin-operator",
    ttlSeconds: 3600,
    valid: true,
  },
  lastSeenAt: "2026-07-14T00:00:00.000Z",
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
  recordId: "wallet-session:sess-admin-operator",
  repository: {
    adapterId: "wallet-session-test-adapter",
    repositoryId: "wallet-session-repository-runtime",
    sequence: 1,
    storeId: "wallet-sessions",
  },
  sessionId: "sess-admin-operator",
  signatureStatus: "signed",
  verificationStatus: "verified",
  walletAddress: "2YVwAdminOperatorCaseSensitive",
  walletName: "Portkey AA Wallet",
  walletSource: "PORTKEY_AA",
  walletTypeVerified: true,
  ...overrides,
});

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
      "stale",
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
        "campaigns.owner.list",
        "campaigns.tasks.add",
        "campaigns.tasks.generate",
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
    expect(getProtectedRouteAuth("campaigns.owner.list")).toMatchObject({
      enforcementStatus: "local_enforced",
      requiredRoles: ["project_owner"],
      sessionRequired: true,
    });
    expect(getProtectedRouteAuth("campaigns.tasks.add")).toMatchObject({
      enforcementStatus: "local_enforced",
      requiredRoles: ["project_owner"],
      sessionRequired: true,
    });
    expect(getProtectedRouteAuth("campaigns.tasks.generate")).toMatchObject({
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

  it("locally enforces issued Participant routes without weakening public Campaign routes", () => {
    const canonicalRouteIds = protectedRouteAuthMap.map((entry) => entry.routeId);
    const participantRouteIds = [
      "campaigns.participant.list",
      "campaigns.participant.journey",
      "campaigns.eligibility",
      "campaigns.points.ranking.ledger.runtime",
      "tasks.verify",
    ];
    const locallyEnforcedRouteIds = [
      "campaigns.create",
      "campaigns.owner.list",
      "campaigns.owner.detail",
      "campaigns.tasks.add",
      "campaigns.tasks.generate",
      "campaigns.participant.list",
      "campaigns.participant.journey",
      "campaigns.eligibility",
      "campaigns.points.ranking.ledger.runtime",
      "tasks.verify",
    ];

    expect(new Set(canonicalRouteIds).size).toBe(canonicalRouteIds.length);
    expect(canonicalRouteIds).toEqual(expect.arrayContaining([
      "campaigns.owner.detail",
      ...participantRouteIds,
    ]));
    for (const routeId of participantRouteIds) {
      expect(getProtectedRouteAuth(routeId)).toMatchObject({
        enforcementStatus: "local_enforced",
        proofRequired: true,
        requiredRoles: ["participant"],
        routeSource: "runtime_route",
        sessionRequired: true,
      });
    }

    expect(getProtectedRouteAuth("campaigns.owner.detail")).toMatchObject({
      enforcementStatus: "local_enforced",
      proofRequired: true,
      requiredRoles: ["project_owner"],
      routeSource: "runtime_route",
      sessionRequired: true,
    });
    expect(getProtectedRouteAuth("campaigns.list")).toBeUndefined();
    expect(getProtectedRouteAuth("campaigns.detail")).toBeUndefined();

    const readiness = createAuthSessionReadinessReport();
    const foundation = createProductionAuthSessionFoundation();

    expect(locallyEnforcedAuthRouteIds).toEqual(locallyEnforcedRouteIds);
    expect(readiness.protectedRouteCount).toBe(protectedRouteAuthMap.length);
    expect(readiness.protectedRoutes
      .filter((route) => route.enforcementStatus === "local_enforced")
      .map((route) => route.routeId)).toEqual(locallyEnforcedRouteIds);
    expect(foundation.protectedRouteCoverage).toMatchObject({
      locallyEnforcedRouteIds,
      protectedRouteCount: protectedRouteAuthMap.length,
    });
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

  it("derives a trusted Admin operator session only from the issued record", () => {
    const result = resolveTrustedAdminOperatorSession(issuedAdminWalletSession());

    expect(result).toEqual({
      context: {
        accountType: "AA",
        chainId: "AELF",
        credentialBoundary: "ordinary_user_wallet",
        issuerMode: "local_opaque",
        network: "mainnet",
        proofStatus: "verified",
        sessionId: "sess-admin-operator",
        subjectAddress: "2YVwAdminOperatorCaseSensitive",
        walletSource: "PORTKEY_AA",
      },
      ok: true,
    });
    if (result.ok) {
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.context)).toBe(true);
      expect(JSON.stringify(result)).not.toContain("issuer:sess-admin-operator");
    }
  });

  it.each(["AELF", "tDVV", "tDVW"])(
    "uses trimmed exact Base58 subject compatibility for %s",
    (chainId) => {
      const issued = issuedAdminWalletSession({ chainId });
      const exact = resolveTrustedAdminOperatorSession(issued, {
        sessionId: " sess-admin-operator ",
        subjectAddress: " 2YVwAdminOperatorCaseSensitive ",
      });
      const caseVariant = resolveTrustedAdminOperatorSession(issued, {
        subjectAddress: "2yVwAdminOperatorCaseSensitive",
      });

      expect(exact).toMatchObject({ ok: true, context: { chainId } });
      expect(caseVariant).toEqual({ ok: false, reason: "subject-mismatch" });
    },
  );

  it.each([
    ["session", { sessionId: "sess-other" }, "session-mismatch"],
    ["account", { accountType: "EOA" }, "account-type-mismatch"],
    ["source", { walletSource: "NIGHTELF" }, "wallet-source-mismatch"],
    ["boundary", { credentialBoundary: "internal_agent_credential" }, "credential-boundary-mismatch"],
    ["proof", { proofStatus: "local_seeded" }, "proof-status-mismatch"],
  ] as const)("rejects %s compatibility substitution", (_case, claims, reason) => {
    expect(resolveTrustedAdminOperatorSession(issuedAdminWalletSession(), claims)).toEqual({
      ok: false,
      reason,
    });
  });

  it.each([
    ["invalid issuer", { issuer: { ...issuedAdminWalletSession().issuer!, valid: false } }, "issuer-invalid"],
    ["missing issuer", { issuer: undefined }, "issuer-invalid"],
    [
      "contradictory issuer",
      {
        issuer: {
          ...issuedAdminWalletSession().issuer!,
          issuerMode: "production_blocked",
          valid: true,
        },
      },
      "issuer-invalid",
    ],
    ["missing proof", { proof: undefined }, "proof-invalid"],
    [
      "contradictory proof type",
      {
        proof: {
          ...issuedAdminWalletSession().proof!,
          proofType: "address_only",
        },
      },
      "proof-invalid",
    ],
    [
      "contradictory proof trust",
      {
        proof: {
          ...issuedAdminWalletSession().proof!,
          trustLevel: "untrusted",
        },
      },
      "proof-invalid",
    ],
    ["stale proof", { proof: { ...issuedAdminWalletSession().proof!, status: "stale" } }, "proof-invalid"],
    ["unverified proof", { proof: { ...issuedAdminWalletSession().proof!, status: "signature_unverified" } }, "proof-invalid"],
    ["missing capability", { capabilities: ["CONTRACT_VIEW"] }, "proof-invalid"],
    ["unverified wallet type", { walletTypeVerified: false }, "proof-invalid"],
  ] satisfies readonly [string, Partial<WalletSessionRecord>, string][])("fails closed for %s", (_case, overrides, reason) => {
    expect(resolveTrustedAdminOperatorSession(issuedAdminWalletSession(overrides))).toEqual({
      ok: false,
      reason,
    });
  });

  it.each([
    ["wallet source", { walletSource: "AGENT_SKILL" }],
    ["capability", { capabilities: ["SIGN_MESSAGE", "INTERNAL_AUTOMATION"] }],
    [
      "proof type",
      {
        proof: {
          ...issuedAdminWalletSession().proof!,
          proofType: "agent_context",
        },
      },
    ],
    [
      "proof trust",
      {
        proof: {
          ...issuedAdminWalletSession().proof!,
          trustLevel: "internal_only",
        },
      },
    ],
  ] satisfies readonly [string, Partial<WalletSessionRecord>][]) (
    "separates the internal %s marker from ordinary Admin operators",
    (_case, overrides) => {
      expect(resolveTrustedAdminOperatorSession(issuedAdminWalletSession(overrides))).toEqual({
        ok: false,
        reason: "internal-credential",
      });
    },
  );
});
