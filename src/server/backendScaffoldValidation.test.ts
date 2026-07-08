import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import packageJson from "../../package.json";
import { apiRuntimeRoutes, createBackendServiceReadinessReport } from "./index";
import { createProviderHttpDownstreamLiveFlags } from "./providerHttpRuntimeRegistry";

const trackedFiles = () =>
  execFileSync("git", ["ls-files"], {
    cwd: process.cwd(),
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);

const missionBaseRef = () =>
  execFileSync("git", ["merge-base", "HEAD", "main"], {
    cwd: process.cwd(),
    encoding: "utf8",
  })
    .trim();

const changedFilesSinceMissionBase = () =>
  execFileSync("git", ["diff", "--name-only", `${missionBaseRef()}..HEAD`], {
    cwd: process.cwd(),
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);

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

const forbiddenRuntimeDependencyFragments = [
  "@aelf",
  "@aws-sdk",
  "@google/generative-ai",
  "@openai",
  "@provider",
  "aefinder",
  "aelfscan",
  "analytics",
  "aws-sdk",
  "ethers",
  "mixpanel",
  "openai",
  "reward",
  "segment",
  "viem",
  "web3",
];

const expectedAiOpsRuntimeRouteFiles = [
  "src/server/apiFoundation.ts",
  "src/server/apiRuntime.test.ts",
  "src/server/handlers.ts",
  "src/server/routes.test.ts",
  "src/server/routes.ts",
  "src/server/servicePorts.ts",
  "src/server/topology.ts",
  "src/server/validation.ts",
];

const providerHttpReadyEnv = {
  CAMPAIGN_OS_PROVIDER_HTTP_CREDENTIAL_REF: "credential-ref:provider-http",
  CAMPAIGN_OS_PROVIDER_HTTP_ENDPOINT_REF: "config-ref:provider-http-endpoint",
  CAMPAIGN_OS_PROVIDER_HTTP_ENDPOINT_REGISTRY_REF: "config-ref:provider-http-registry",
  CAMPAIGN_OS_PROVIDER_HTTP_HEADER_REF: "header-ref:provider-http-auth",
  CAMPAIGN_OS_PROVIDER_HTTP_IDEMPOTENCY_REF: "idem-ref:provider-http",
  CAMPAIGN_OS_PROVIDER_HTTP_LEASE_REF: "lease-ref:provider-http",
  CAMPAIGN_OS_PROVIDER_HTTP_QUEUE_WORKER_HANDOFF: "config-ref:provider-http-worker",
  CAMPAIGN_OS_PROVIDER_HTTP_REDACTION_POLICY: "policy-ref:provider-http-redaction",
  CAMPAIGN_OS_PROVIDER_HTTP_RESPONSE_MAPPING_POLICY: "policy-ref:provider-http-response-map",
  CAMPAIGN_OS_PROVIDER_HTTP_RUNBOOK_REF: "runbook-ref:provider-http",
  CAMPAIGN_OS_PROVIDER_HTTP_RUNTIME_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_PROVIDER_HTTP_TIMEOUT_POLICY: "timeout-policy:2500ms",
  CAMPAIGN_OS_PROVIDER_HTTP_TRANSPORT_SEAM: "config-ref:provider-http-transport",
} satisfies Record<string, unknown>;

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

  it("keeps private Kitty artifacts out of the public tracked file set", () => {
    const publicTrackedFiles = trackedFiles();

    expect(publicTrackedFiles).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^(docs\/current|kitty-specs|evidence|sync|\.kittify|\.agents|AGENTS\.md)(\/|$)/),
      ]),
    );
    expect(publicTrackedFiles).toEqual(
      expect.arrayContaining([
        "package.json",
        "src/server/backendService.ts",
        "src/server/providerIndexerClientReadiness.ts",
      ]),
    );
  });

  it("does not introduce live provider, indexer, social, AI, analytics, storage, contract, or reward SDK dependencies", () => {
    const dependencyNames = Object.keys({
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    });

    expect(dependencyNames).toEqual(expect.arrayContaining(["bullmq", "vite", "vitest"]));
    for (const dependencyName of dependencyNames) {
      for (const forbiddenFragment of forbiddenRuntimeDependencyFragments) {
        expect(dependencyName.toLowerCase()).not.toContain(forbiddenFragment);
      }
    }
  });

  it("keeps AI Ops runtime route changes away from rendered UI files", () => {
    const missionChangedFiles = changedFilesSinceMissionBase();

    expect(missionChangedFiles).toEqual(expect.arrayContaining(expectedAiOpsRuntimeRouteFiles));
    expect(missionChangedFiles).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^src\/(App|app|components|styles|i18n)\//),
        expect.stringMatching(/\.(tsx|css)$/),
      ]),
    );
  });

  it("keeps M202 AI Ops route scope out of rendered React and private public artifacts", () => {
    const publicTrackedFiles = trackedFiles();
    const missionChangedFiles = changedFilesSinceMissionBase();

    expect(missionChangedFiles).toEqual(expect.arrayContaining(expectedAiOpsRuntimeRouteFiles));
    expect(missionChangedFiles).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^src\/(App|app|components|styles|i18n)\//),
        expect.stringMatching(/^src\/.*\.(tsx|css)$/),
      ]),
    );
    expect(publicTrackedFiles).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^(docs\/current|kitty-specs|evidence|sync|\.kittify|\.agents|AGENTS\.md)(\/|$)/),
      ]),
    );
  });

  it("keeps backend smoke and activated provider HTTP projection non-production with all downstream flags false", () => {
    const defaultReport = createBackendServiceReadinessReport();
    const activatedReport = createBackendServiceReadinessReport({
      configOptions: {
        env: providerHttpReadyEnv,
        profileId: "production-required",
      },
    });
    const expectedDownstreamFlags = createProviderHttpDownstreamLiveFlags();

    expect(defaultReport.validation.valid).toBe(true);
    expect(defaultReport.providerClientReadiness.providerHttpRuntime).toMatchObject({
      activationStatus: "disabled",
      downstreamLiveFlags: expectedDownstreamFlags,
      liveHttpCallsAttempted: false,
      productionReady: false,
      status: "disabled",
      transportProvided: false,
      valid: true,
    });
    expect(activatedReport.providerClientReadiness.providerHttpRuntime).toMatchObject({
      activationStatus: "explicitly_enabled",
      downstreamLiveFlags: expectedDownstreamFlags,
      liveHttpCallsAttempted: false,
      productionReady: false,
      status: "activated",
      transportProvided: true,
      valid: true,
    });
    expect(activatedReport.providerClientReadiness.providerHttpRuntime.endpointRollout).toMatchObject({
      deferredCount: 2,
      diagnosticCodes: [],
      disabledCount: 0,
      valid: true,
    });
    expect(activatedReport.providerClientReadiness.providerHttpRuntime.endpointRollout.configuredCategories).toEqual(
      expect.arrayContaining(["indexer", "dapp_api", "social_api", "ai_provider"]),
    );
    expect(activatedReport.providerClientReadiness.activationInventory.providerHttpRuntime).toMatchObject({
      activationStatus: "explicitly_enabled",
      blockedConfigKeys: [],
      blockerIds: [],
      status: "activated",
    });
    expect(activatedReport.workerSchedulerFoundation.providerHttpRuntime).toMatchObject({
      activationStatus: "explicitly_enabled",
      idempotencyPosture: "policy-and-store-reference-only",
      leasePosture: "store-reference-only",
      liveHttpCallsAttempted: false,
      liveSchedulerExecutionEnabled: false,
      liveWorkerExecutionEnabled: false,
      productionReady: false,
      status: "activated",
      transportProvided: true,
    });
    expect(activatedReport.queueRuntimeFoundation.noLiveFlags).toMatchObject({
      liveAnalyticsIngestionEnabled: false,
      liveContractCallsEnabled: false,
      liveObjectStorageEnabled: false,
      liveRewardDistributionEnabled: false,
      liveSchedulerExecutionEnabled: false,
      liveWorkerExecutionEnabled: false,
    });
    expect(activatedReport.observabilityExporterFoundation.noLiveFlags).toMatchObject({
      liveAnalyticsIngestionEnabled: false,
      liveObjectStorageEnabled: false,
      liveProviderCallsEnabled: false,
      liveTelemetryExportEnabled: false,
    });
    expect(Object.values(activatedReport.providerClientReadiness.providerHttpRuntime.downstreamLiveFlags)).toEqual(
      expect.arrayContaining([false]),
    );
    expect(Object.values(activatedReport.providerClientReadiness.providerHttpRuntime.downstreamLiveFlags).every(
      (flag) => flag === false,
    )).toBe(true);
    expect(activatedReport.providerClientReadiness.providerHttpRuntime.downstreamLiveFlags).toMatchObject({
      alternateQueuePublishing: false,
      analyticsIngestion: false,
      contractCalls: false,
      liveTelemetryExport: false,
      objectStorageWrites: false,
      renderedUiBehavior: false,
      rewardDistribution: false,
      schedulerExecution: false,
    });
    expect(activatedReport.workerSchedulerFoundation.providerHttpRuntime.endpointRollout).toMatchObject({
      deferredCount: 2,
      valid: true,
    });
  });

  it("keeps endpoint rollout readiness away from rendered UI, SDK dependencies, and live downstream systems", () => {
    const report = createBackendServiceReadinessReport({
      configOptions: {
        env: providerHttpReadyEnv,
        profileId: "production-required",
      },
    });
    const missionChangedFiles = changedFilesSinceMissionBase();
    const dependencyNames = Object.keys({
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    });

    expect(report.providerClientReadiness.providerHttpRuntime.endpointRollout).toMatchObject({
      deferredCount: 2,
      valid: true,
    });
    expect(report.providerClientReadiness.providerHttpRuntime.downstreamLiveFlags).toEqual(
      createProviderHttpDownstreamLiveFlags(),
    );
    expect(report.queueRuntimeFoundation.noLiveFlags).toMatchObject({
      liveAnalyticsIngestionEnabled: false,
      liveContractCallsEnabled: false,
      liveObjectStorageEnabled: false,
      liveRewardDistributionEnabled: false,
      liveSchedulerExecutionEnabled: false,
      liveWorkerExecutionEnabled: false,
    });
    expect(report.observabilityExporterFoundation.noLiveFlags).toMatchObject({
      liveAnalyticsIngestionEnabled: false,
      liveObjectStorageEnabled: false,
      liveProviderCallsEnabled: false,
      liveTelemetryExportEnabled: false,
    });
    expect(missionChangedFiles).toEqual(expect.arrayContaining(expectedAiOpsRuntimeRouteFiles));
    expect(missionChangedFiles).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^src\/(App|app|components|styles|i18n)\//),
        expect.stringMatching(/^src\/.*\.(tsx|css)$/),
      ]),
    );
    for (const dependencyName of dependencyNames) {
      for (const forbiddenFragment of forbiddenRuntimeDependencyFragments) {
        expect(dependencyName.toLowerCase()).not.toContain(forbiddenFragment);
      }
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
        expect.objectContaining({
          apiSkillId: "agent_wallet_action",
          id: "agent.wallet.action.review",
          readiness: "review_required",
          serviceGroup: "wallet_session",
          supportMode: "local_seeded",
        }),
        expect.objectContaining({
          apiSkillId: "generate_campaign_tasks",
          id: "campaigns.tasks.generate",
          readiness: "ready",
          serviceGroup: "task",
          supportMode: "local_seeded",
        }),
        expect.objectContaining({
          apiSkillId: "generate_campaign_posts",
          id: "campaigns.posts.generate",
          readiness: "review_required",
          serviceGroup: "i18n",
          supportMode: "local_seeded",
        }),
        expect.objectContaining({
          apiSkillId: "summarize_campaign",
          id: "campaigns.summary",
          readiness: "ready",
          serviceGroup: "analytics",
          supportMode: "local_seeded",
        }),
      ]),
    );
  });
});
