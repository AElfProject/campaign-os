import { describe, expect, it } from "vitest";
import { apiRuntimeRoutes, createBackendServiceReadinessReport } from "./index";

const deferredCapabilityIds = [
  "production_database",
  "auth_session",
  "provider_adapters",
  "worker_queue",
  "scheduler",
  "contract_writer",
  "reward_custody",
  "reward_distribution",
];

const privatePathFragments = [
  "docs/current",
  "kitty-specs",
  "evidence/",
  "sync/",
  ".kittify",
  ".agents",
  "AGENTS.md",
];

const secretLikeFragments = [
  "authorization: bearer",
  "campaign_os_database_url=",
  "mnemonic",
  "privatekey=",
  "rawsignature=",
  "seedphrase=",
  "signedurl=",
];

describe("backend scaffold public guardrails", () => {
  it("keeps production backend capabilities deferred or blocked in local review", () => {
    const report = createBackendServiceReadinessReport();

    expect(report.validation.valid).toBe(true);
    expect(report.profile.id).toBe("local-review");
    expect(report.profile.deferredCapabilities).toEqual(
      expect.arrayContaining(deferredCapabilityIds),
    );
    expect(report.persistenceAdapters.activeAdapter).toMatchObject({
      kind: "memory",
      localOnly: true,
      status: "active",
    });
    expect(report.migration).toMatchObject({
      noLiveMigrationCommand: true,
      noMigrationRunner: false,
      runnerStatus: "disabled_local_review",
    });
    expect(report.databaseReadiness).toMatchObject({
      adapter: expect.objectContaining({
        status: "contract_ready",
      }),
      migrationPlan: expect.objectContaining({
        dryRun: true,
        liveExecutionEnabled: false,
        status: "dry_run_ready",
      }),
      validation: expect.objectContaining({
        valid: true,
      }),
    });
    expect(report.authSession).toMatchObject({
      agentCredentialBoundary: {
        agentSkillCanSubstituteUserWallet: false,
        separatedFromUserWalletSession: true,
      },
      profileId: "local-review",
      status: "local_seeded",
      validation: {
        issues: [],
        valid: true,
      },
    });
    expect(report.authSession.deferredDependencyIds).toEqual(
      expect.arrayContaining([
        "live_wallet_proof_verifier",
        "jwt_or_session_cookie",
        "rbac_enforcement",
        "project_ownership_source",
      ]),
    );
    expect(report.authSession.protectedRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          enforcementStatus: "local_enforced",
          routeId: "campaigns.create",
        }),
        expect.objectContaining({
          enforcementStatus: "metadata_only",
          routeId: "wallet.session.create",
        }),
      ]),
    );
    expect(report.authEnforcement).toMatchObject({
      agentCredentialSubstitutionDisabled: true,
      campaignMutationRouteCount: 1,
      locallyEnforcedRouteIds: ["campaigns.create"],
      mode: "local_enforced",
      productionProofVerifierReady: false,
      productionProjectOwnershipSourceReady: false,
      productionSessionIssuerReady: false,
      readOnlyRouteCompatibility: {
        campaignReadRouteIds: expect.arrayContaining(["campaigns.list", "campaigns.detail"]),
        runtimeMetadataRouteIds: expect.arrayContaining(["runtime.health", "runtime.contracts"]),
        runtimeMetadataUnauthenticated: true,
      },
      remainingDeferredProductionDependencyIds: expect.arrayContaining([
        "live_wallet_proof_verifier",
        "jwt_or_session_cookie",
        "project_ownership_source",
      ]),
    });

    for (const attachPoint of report.attachMap) {
      expect(attachPoint.requiredBeforeProduction).toBe(true);
      const allowedStatusByArea =
        attachPoint.area === "auth-session"
          ? ["local-only"]
          : ["blocked", "deferred", "scaffold"];

      expect(allowedStatusByArea).toContain(attachPoint.currentStatus);
      if (attachPoint.area !== "auth-session") {
        expect(attachPoint.currentStatus).not.toBe("local-only");
      }
      expect(attachPoint.note.toLowerCase()).not.toContain("active now");
    }
  });

  it("keeps readiness metadata free of private paths and obvious secret material", () => {
    const serialized = JSON.stringify(createBackendServiceReadinessReport()).toLowerCase();

    for (const privatePath of privatePathFragments) {
      expect(serialized).not.toContain(privatePath.toLowerCase());
    }

    for (const fragment of secretLikeFragments) {
      expect(serialized).not.toContain(fragment);
    }
  });

  it("does not treat production-required auth/session as anonymous local mode", () => {
    const report = createBackendServiceReadinessReport({
      configOptions: {
        env: {
          CAMPAIGN_OS_AUTH_SECRET: "auth-secret",
          CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT: "https://writer.invalid",
          CAMPAIGN_OS_DATABASE_URL: "postgres://db.invalid/campaign-os",
          CAMPAIGN_OS_PROVIDER_REGISTRY_URL: "https://providers.invalid",
          CAMPAIGN_OS_WORKER_QUEUE_URL: "https://queue.invalid",
        },
        profileId: "production-required",
      },
    });

    expect(report.authSession.status).toBe("blocked");
    expect(report.authSession.proofBoundary.verificationMode).toBe("production_required");
    expect(report.authSession.validation.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "AUTH_PROOF_VERIFIER_MISSING",
        "AUTH_POLICY_MISSING",
        "AUTH_OWNERSHIP_SOURCE_MISSING",
      ]),
    );
    expect(report.validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "AUTH_SESSION_READINESS_BLOCKED",
          field: "authSession",
        }),
      ]),
    );
    expect(JSON.stringify(report)).not.toContain("auth-secret");
  });

  it("keeps public route metadata local, offline, and non-mutating for production systems", () => {
    expect(apiRuntimeRoutes.length).toBeGreaterThan(0);

    for (const route of apiRuntimeRoutes) {
      expect(route.path).toMatch(/^\/api\//);
      expect(route.supportMode).toBe("local_seeded");
      expect(route.boundary["en-US"]).toContain("No live API");
      expect(route.productionDependencies).toEqual(expect.any(Array));
      expect(route.productionDependencies).toEqual(
        expect.not.arrayContaining(["production_ready"]),
      );
    }

    expect(apiRuntimeRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "runtime.health",
          readiness: "ready",
          serviceGroup: "runtime",
        }),
        expect.objectContaining({
          id: "runtime.contracts",
          readiness: "ready",
          serviceGroup: "runtime",
        }),
      ]),
    );
  });
});
