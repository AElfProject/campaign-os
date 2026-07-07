import { describe, expect, it } from "vitest";
import {
  backendAttachMap,
  createBackendServiceReadinessReport,
} from "./backendService";

const productionAreas = [
  "production-persistence",
  "auth-session",
  "provider-adapters",
  "worker-queue",
  "scheduler",
  "contract-writer",
  "object-storage-export",
  "reward-custody",
  "reward-distribution",
  "analytics-warehouse",
];

const queueSecretFragments = [
  "queue-user",
  "queue-pass",
  "queue-secret",
  "worker-token-sample",
  "lease-token-sample",
  "hook-secret-sample",
  "signed-url-sample",
  "tenant/raw/export.csv",
  "ELF_raw_wallet",
  "task_raw",
];

const schedulerSecretFragments = [
  "scheduler-user",
  "scheduler-pass",
  "scheduler-secret",
  "scheduler-token-sample",
  "scheduler-hook-secret",
  "ELF_scheduler_wallet",
  "scheduler_raw_task",
];

const expectNoQueueSecretLeak = (value: unknown) => {
  const serialized = JSON.stringify(value);

  for (const fragment of queueSecretFragments) {
    expect(serialized).not.toContain(fragment);
  }
};

const expectNoSchedulerSecretLeak = (value: unknown) => {
  const serialized = JSON.stringify(value);

  for (const fragment of schedulerSecretFragments) {
    expect(serialized).not.toContain(fragment);
  }
};

describe("backend service readiness report", () => {
  it("aggregates local backend scaffold readiness without duplicating route ownership", () => {
    const report = createBackendServiceReadinessReport();

    expect(report.validation).toEqual({
      issues: [],
      valid: true,
    });
    expect(report.entrypoint).toMatchObject({
      foundationValidationValid: true,
      id: "campaign-os-backend-service",
      profileId: "local-review",
      runtimeName: "campaign-os-api-runtime",
      supportMode: "local_seeded",
      version: "0.2.0-local",
    });
    expect(report.entrypoint.routeCount).toBe(report.apiFoundation.coverage.routeCount);
    expect(report.authSession).toMatchObject({
      profileId: "local-review",
      status: "local_seeded",
      protectedRouteCount: expect.any(Number),
      validation: {
        issues: [],
        valid: true,
      },
    });
    expect(report.authSession.protectedRouteCount).toBeGreaterThanOrEqual(7);
    expect(report.authSessionFoundation).toMatchObject({
      blockerCount: 0,
      diagnosticCodes: ["AUTH_AGENT_CREDENTIAL_SEPARATE"],
      id: "campaign-os-production-auth-session-foundation",
      liveSideEffectsEnabled: false,
      liveSigningExecuted: false,
      liveVerificationExecuted: false,
      ownership: {
        blockedDependencyIds: [],
        membershipSourceReady: false,
        ownerMatchRequired: true,
        ownerMutationBlocked: true,
        ownershipSourceReady: false,
      },
      productionReady: false,
      profileId: "local-review",
      protectedRouteCoverage: {
        locallyEnforcedRouteIds: ["campaigns.create"],
        protectedRouteCount: expect.any(Number),
        routeGroupCount: expect.any(Number),
      },
      rbac: {
        agentCredentialSubstitutionDisabled: true,
        roleCount: 5,
      },
      sessionIssuer: {
        cookieIssued: false,
        issuerMode: "local_opaque",
        jwtIssued: false,
        liveSigningExecuted: false,
      },
      status: "local_ready",
      valid: true,
      walletProof: {
        liveVerificationExecuted: false,
        liveVerifierReady: false,
        nonceStoreReady: false,
        status: "proof_required",
      },
    });
    expect(report.authEnforcement).toMatchObject({
      agentCredentialSubstitutionDisabled: true,
      campaignMutationRouteCount: 1,
      liveSigningExecuted: false,
      liveVerificationExecuted: false,
      localEnforcedRouteCount: 1,
      localProofVerifierContractReady: true,
      localSessionIssuerContractReady: true,
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
    expect(report.authSession.rolePolicy).toMatchObject({
      leastPrivilegeDefault: true,
      roleCount: 5,
    });
    expect(report.backendRuntimeBootstrap).toMatchObject({
      id: "campaign-os-backend-runtime-bootstrap",
      profileId: "local-review",
      status: "ready",
      tracePolicy: {
        traceHeaderName: "x-campaign-os-trace-id",
      },
      valid: true,
    });
    expect(report.apiService).toMatchObject({
      authContracts: {
        productionReady: false,
        proofVerifier: {
          localContractReady: true,
          liveVerificationExecuted: false,
          productionReady: false,
        },
        sessionIssuer: {
          liveSigningExecuted: false,
          localContractReady: true,
          productionReady: false,
        },
      },
      blockedDependencyIds: expect.arrayContaining([
        "live-database-driver",
        "contract-writer",
      ]),
      deferredDependencyIds: expect.arrayContaining([
        "verification-worker",
        "scheduler",
        "provider-adapters",
        "object-storage",
        "analytics-ingestion",
      ]),
      deployableBoundaryReady: true,
      diagnosticCodes: [],
      id: "campaign-os-api-service",
      liveConnectionAttempted: false,
      liveSideEffectsEnabled: false,
      productionReady: false,
      profileId: "local-review",
      status: "ready",
      workerExecutionEnabled: false,
    });
    expect(report.apiService.blockedDependencyIds).not.toEqual(
      expect.arrayContaining(["wallet-proof-verifier", "session-issuer"]),
    );
    expect(report.providerIndexerFoundation).toMatchObject({
      blockerCount: 0,
      diagnosticCodes: [],
      noLiveFlags: {
        liveAiCallsEnabled: false,
        liveAnalyticsIngestionEnabled: false,
        liveContractCallsEnabled: false,
        liveIndexerCallsEnabled: false,
        liveObjectStorageEnabled: false,
        liveProviderCallsEnabled: false,
        liveSocialCallsEnabled: false,
        workerExecutionEnabled: false,
      },
      productionReady: false,
      profileId: "local-review",
      providerGroupCount: 10,
      status: "local_ready",
      valid: true,
      verificationSourceCoverage: {
        summaryCount: 5,
      },
      verificationSourceHandoff: {
        liveExecutionEnabled: false,
        supportedVerificationTypes: ["WALLET", "ON_CHAIN", "DAPP_API", "SOCIAL", "MANUAL"],
        valid: true,
      },
    });
    expect(report.providerIndexerFoundation.degradationPolicy).toMatchObject({
      allowedOutcomes: [
        "pending",
        "manual_review",
        "disable_provider_task_templates",
        "local_only",
        "blocked",
      ],
      providerBackedUnavailableOutcomes: [
        "pending",
        "disable_provider_task_templates",
        "manual_review",
      ],
    });
    expect(report.workerSchedulerFoundation).toMatchObject({
      blockerCount: 0,
      diagnosticCodes: [],
      id: "campaign-os-worker-scheduler-foundation",
      jobCatalogCoverage: {
        jobCatalogCount: 9,
        jobFamilyCount: 9,
        productionDependencyIds: expect.arrayContaining([
          "worker-queue",
          "scheduler-endpoint",
          "idempotency-store",
          "worker-lease",
          "observability",
          "provider-handoff",
        ]),
        requiredConfigKeys: expect.arrayContaining([
          "CAMPAIGN_OS_WORKER_QUEUE_URL",
          "CAMPAIGN_OS_SCHEDULER_ENDPOINT",
        ]),
        triggerSourceCount: 6,
      },
      noLiveFlags: {
        liveCronExecutionEnabled: false,
        liveQueuePublishingEnabled: false,
        liveSchedulerExecutionEnabled: false,
        liveWorkerExecutionEnabled: false,
      },
      productionReady: false,
      schedulePolicyCoverage: {
        idempotencyPolicyCount: 9,
        retryPolicyCount: 8,
        schedulePolicyCount: 9,
      },
      status: "local_ready",
      valid: true,
      verificationSourceHandoff: {
        id: "campaign-os-verification-source-handoff",
        liveExecutionEnabled: false,
        supportedVerificationTypes: ["WALLET", "ON_CHAIN", "DAPP_API", "SOCIAL", "MANUAL"],
        valid: true,
        workerRequiredPolicyCount: 3,
      },
    });
    expect(report.queueRuntimeFoundation).toMatchObject({
      blockerCount: 0,
      diagnosticCodes: [],
      dryRunEnqueue: {
        enabled: true,
        livePublishAttempted: false,
        liveQueuePublishingEnabled: false,
      },
      id: "campaign-os-queue-runtime-foundation",
      noLiveFlags: {
        liveAiCallsEnabled: false,
        liveAnalyticsIngestionEnabled: false,
        liveContractCallsEnabled: false,
        liveCronExecutionEnabled: false,
        liveObjectStorageEnabled: false,
        liveProviderCallsEnabled: false,
        liveQueuePublishingEnabled: false,
        liveRewardDistributionEnabled: false,
        liveSchedulerExecutionEnabled: false,
        liveSocialCallsEnabled: false,
        liveWorkerExecutionEnabled: false,
      },
      productionReady: false,
      profileId: "local-review",
      queuePlanCoverage: {
        jobIds: expect.arrayContaining([
          "task-verification-worker",
          "campaign-lifecycle-worker",
          "reward-distribution-handoff-worker",
        ]),
        queueCategories: expect.arrayContaining([
          "verification",
          "lifecycle",
          "operations",
          "analytics",
          "ai",
          "contract",
          "reward",
        ]),
        queueCategoryCount: 7,
        queueIds: expect.arrayContaining([
          "verification-jobs",
          "lifecycle-jobs",
          "operations-jobs",
          "analytics-jobs",
          "ai-ops-jobs",
          "contract-jobs",
          "reward-jobs",
        ]),
        queuePlanCount: 9,
        requiredConfigKeys: expect.arrayContaining([
          "CAMPAIGN_OS_QUEUE_PROVIDER",
          "CAMPAIGN_OS_WORKER_QUEUE_URL",
          "CAMPAIGN_OS_WORKER_RETRY_POLICY",
          "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL",
          "CAMPAIGN_OS_WORKER_LEASE_STORE_URL",
          "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
          "CAMPAIGN_OS_PROVIDER_REGISTRY_URL",
          "CAMPAIGN_OS_DEGRADATION_POLICY",
          "CAMPAIGN_OS_DEAD_LETTER_QUEUE",
        ]),
      },
      status: "local_ready",
      valid: true,
    });
    expect(report.schedulerRuntimeFoundation).toMatchObject({
      blockerCount: 0,
      diagnosticCodes: [],
      dryRunTrigger: {
        enabled: true,
        liveCronExecutionEnabled: false,
        liveQueuePublishingEnabled: false,
        liveSchedulerExecutionEnabled: false,
      },
      id: "campaign-os-scheduler-runtime-foundation",
      noLiveFlags: {
        liveCronExecutionEnabled: false,
        liveQueuePublishingEnabled: false,
        liveSchedulerExecutionEnabled: false,
        liveWorkerExecutionEnabled: false,
      },
      productionReady: false,
      profileId: "local-review",
      registrationCoverage: {
        jobFamilies: expect.arrayContaining([
          "campaign_lifecycle",
          "eligibility_refresh",
          "export_preparation",
          "analytics_ingestion_handoff",
          "ai_ops_report",
          "stale_review_cleanup",
          "contract_sync_handoff",
          "reward_distribution_handoff",
          "task_verification",
        ]),
        registrationCount: 9,
        requiredConfigKeys: expect.arrayContaining([
          "CAMPAIGN_OS_SCHEDULER_PROVIDER",
          "CAMPAIGN_OS_SCHEDULER_ENDPOINT",
          "CAMPAIGN_OS_SCHEDULER_LEASE_STORE_URL",
          "CAMPAIGN_OS_OPERATOR_AUTHORIZATION_POLICY",
        ]),
        scheduleIds: expect.arrayContaining([
          "task-verification-on-request",
          "campaign-lifecycle-time-boundary",
          "eligibility-refresh-recurring",
          "export-preparation-operator",
          "analytics-ingestion-recurring",
          "ai-ops-report-recurring",
          "stale-review-cleanup-operator",
          "contract-sync-operator",
          "reward-distribution-operator",
        ]),
        triggerSourceCount: 4,
      },
      status: "local_ready",
      valid: true,
    });
    expect(report.providerIndexerFoundation.requiredConfigKeys).toEqual(
      expect.arrayContaining([
        "CAMPAIGN_OS_PROVIDER_CREDENTIALS",
        "CAMPAIGN_OS_INDEXER_ENDPOINT",
        "CAMPAIGN_OS_DEGRADATION_POLICY",
        "CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT",
      ]),
    );
    expect(report.backendRuntimeBootstrap.deferredDependencyIds).toEqual(
      expect.arrayContaining([
        "production-database-driver",
        "auth-middleware",
        "worker-ingress",
        "scheduler",
        "contract-writer",
        "object-storage-export",
        "observability-exporter",
        "analytics-warehouse",
        "reward-custody",
        "reward-distribution",
      ]),
    );
    expect(report.campaignDbVerticalSlice).toMatchObject({
      adapter: {
        deterministic: true,
        id: "campaign-os-deterministic-test-driver",
        productionReady: false,
        status: "active_local",
      },
      capabilities: {
        deterministicLifecycle: true,
        recordDraft: true,
        readDraft: true,
        writeDraft: true,
      },
      campaignStore: {
        boundedListLimit: 100,
        durable: false,
        fallbackUsed: false,
        mode: "local_seeded",
        recordCount: 0,
        status: "ready",
        storeId: "campaign-db",
      },
      diagnosticCodes: [],
      id: "campaign-db-vertical-slice",
      lifecycle: {
        readinessDoesNotMutateRecords: true,
        repositoryContractStatus: "available",
        repositoryMode: "deterministic_test",
      },
      migrationState: {
        appliedMigrationIds: ["001-campaign-db-v0-2-0"],
        blockedMigrationIds: [],
        diagnosticCodes: [],
        liveExecutionEnabled: false,
        pendingMigrationIds: [],
        requiredMigrationIds: ["001-campaign-db-v0-2-0"],
        schemaVersion: "v0.2.0",
        status: "applied",
        storeId: "campaign-db",
      },
      noLive: {
        connectionAttempted: false,
        migrationExecutionEnabled: false,
        queryExecutionEnabled: false,
        writeExecutionEnabled: false,
      },
      productionActivationBlockers: [],
      repositoryContract: {
        createDraft: true,
        getById: true,
        health: true,
        list: true,
        reset: true,
      },
      status: "ready",
      storeId: "campaign-db",
      validation: {
        issues: [],
        valid: true,
      },
    });
    expect(report.apiFoundation.servicePorts.validation.valid).toBe(true);
    expect(report.apiFoundation.validation.valid).toBe(true);
    expect(report.topology.validation.valid).toBe(true);
  });

  it("distinguishes an explicit durable Campaign DB store with applied migration evidence", () => {
    const report = createBackendServiceReadinessReport({
      campaignStore: {
        durable: true,
        mode: "durable_test",
        recordCount: 2,
      },
    });

    expect(report.campaignDbVerticalSlice).toMatchObject({
      campaignStore: {
        durable: true,
        fallbackUsed: false,
        mode: "durable_test",
        recordCount: 2,
        status: "ready",
        storeId: "campaign-db",
      },
      lifecycle: {
        repositoryContractStatus: "available",
        repositoryMode: "durable_test",
      },
      migrationState: {
        appliedMigrationIds: ["001-campaign-db-v0-2-0"],
        blockedMigrationIds: [],
        liveExecutionEnabled: false,
        status: "applied",
        storeId: "campaign-db",
      },
      status: "ready",
      validation: {
        issues: [],
        valid: true,
      },
    });
  });

  it("surfaces blocked durable Campaign DB store diagnostics", () => {
    const report = createBackendServiceReadinessReport({
      campaignStore: {
        durable: true,
        mode: "durable_test",
        status: "blocked",
      },
    });

    expect(report.campaignDbVerticalSlice).toMatchObject({
      campaignStore: {
        durable: true,
        mode: "durable_test",
        status: "blocked",
      },
      diagnosticCodes: ["CAMPAIGN_DB_DURABLE_STORE_BLOCKED"],
      lifecycle: {
        repositoryContractStatus: "blocked",
        repositoryMode: "durable_test",
      },
      status: "blocked",
      validation: {
        issues: [
          expect.objectContaining({
            code: "CAMPAIGN_DB_DURABLE_STORE_BLOCKED",
            field: "campaignStore.status",
          }),
        ],
        valid: false,
      },
    });
    expect(report.validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "CAMPAIGN_DB_VERTICAL_SLICE_BLOCKED",
          field: "campaignDbVerticalSlice",
        }),
      ]),
    );
  });

  it("publishes attach points for all deferred production backend areas", () => {
    expect(backendAttachMap.map((item) => item.area)).toEqual(productionAreas);

    const report = createBackendServiceReadinessReport();

    for (const attachPoint of report.attachMap) {
      expect(attachPoint.attachPoint).not.toHaveLength(0);
      expect(attachPoint.blockedBy.length).toBeGreaterThan(0);
      expect(attachPoint.requiredBeforeProduction).toBe(true);
    }
    expect(report.attachMap.find((item) => item.area === "auth-session")).toMatchObject({
      attachPoint: "src/server/authSession.ts:createAuthSessionReadinessReport",
      blockedBy: expect.arrayContaining([
        "live wallet signature verifier",
        "auth nonce store",
        "JWT or session cookie issuer",
        "session signing key",
        "secret manager",
        "production session store",
        "RBAC enforcement",
        "project ownership source",
        "admin organization model",
        "agent credential provider",
      ]),
      currentStatus: "local-only",
    });
  });

  it("keeps production persistence and migration runner inactive in local review", () => {
    const report = createBackendServiceReadinessReport();

    expect(report.persistenceAdapters.activeAdapter).toMatchObject({
      id: "campaign-os-memory-adapter",
      kind: "memory",
      status: "active",
    });
    expect(report.persistenceAdapters.adapters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "campaign-os-production-db-adapter",
          kind: "production_deferred",
          status: "deferred",
        }),
      ]),
    );
    expect(report.migration).toMatchObject({
      noLiveMigrationCommand: true,
      noMigrationRunner: false,
      runnerStatus: "disabled_local_review",
    });
    expect(report.databaseReadiness).toMatchObject({
      adapter: expect.objectContaining({
        id: "campaign-os-production-db-adapter",
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
    expect(report.databaseAdapterRuntime).toMatchObject({
      driverId: "campaign-os-deterministic-test-driver",
      liveConnectionAttempted: false,
      liveQueryExecutionEnabled: false,
      migrationExecutor: expect.objectContaining({
        executorStatus: "not_configured",
        liveExecutionCount: 0,
        liveExecutionEnabled: false,
      }),
      migrationHandoff: expect.objectContaining({
        executorStatus: "not_configured",
        liveExecutionCount: 0,
        liveExecutionEnabled: false,
        migrationGateStatus: "ready",
        valid: true,
      }),
      productionDbRuntime: expect.objectContaining({
        connection: expect.objectContaining({
          safeLabel: "deterministic_fixture",
          state: "ready",
        }),
        diagnosticCodes: [],
        id: "campaign-os-production-db-runtime-v1",
        liveConnectionAttempted: false,
        liveQueryExecutionEnabled: false,
        migrationGate: expect.objectContaining({
          liveExecutionEnabled: false,
          status: "not_required_for_fixture",
        }),
        ownerStoreCount: 6,
        profileId: "local-review",
        schemaManifestId: "campaign-os-production-db-schema-v0.2",
        status: "ready",
        valid: true,
      }),
      profileId: "local-review",
      providerId: "campaign-os-deterministic-test-db",
      queryAdapter: expect.objectContaining({
        deterministicTestMode: true,
        liveQueryExecutionEnabled: false,
      }),
      status: "active_local",
      transaction: expect.objectContaining({
        liveCommitEnabled: false,
        mode: "deterministic_test",
        supported: true,
      }),
      valid: true,
    });
    expect(report.databaseAdapterRuntime.stores.map((store) => store.id)).toEqual([
      "campaign-db",
      "wallet-session-db",
      "task-evidence-db",
      "i18n-content-db",
      "risk-event-db",
      "points-ledger",
    ]);
    expect(report.persistenceRuntime).toMatchObject({
      activeDriverId: "campaign-os-memory-adapter",
      connection: expect.objectContaining({
        state: "not_configured",
      }),
      deferredDependencies: expect.arrayContaining([
        expect.objectContaining({
          id: "db-provider-selection",
          requiredBeforeProduction: true,
          status: "deferred",
        }),
        expect.objectContaining({
          id: "secret-manager",
          requiredBeforeProduction: true,
          status: "deferred",
        }),
        expect.objectContaining({
          id: "object-storage-export",
          requiredBeforeProduction: true,
          status: "deferred",
        }),
        expect.objectContaining({
          id: "analytics-warehouse",
          requiredBeforeProduction: true,
          status: "deferred",
        }),
      ]),
      diagnostics: [],
      liveConnectionAttempted: false,
      migrationGate: expect.objectContaining({
        diagnostics: [],
        liveExecutionCount: 0,
        liveExecutionEnabled: false,
        mode: "dry_run_only",
        status: "ready",
      }),
      profileId: "local-review",
      status: "active_local",
      stores: expect.arrayContaining([
        expect.objectContaining({
          id: "campaign-db",
          required: true,
          runtimeState: "covered",
          schemaVersion: "v0.2.0",
        }),
      ]),
      valid: true,
    });
    expect(report.persistenceFoundation).toMatchObject({
      blockerCount: 11,
      diagnosticCodes: ["DATABASE_MIGRATION_LIVE_EXECUTION_DISABLED"],
      foundationId: "campaign-os-production-persistence-foundation-v0.2",
      liveConnectionAttempted: false,
      liveMigrationExecutionEnabled: false,
      liveQueryExecutionEnabled: false,
      migrationDryRun: {
        liveMigrationExecutionEnabled: false,
        migrationGateStatus: "ready",
        noLiveMigrationCommand: true,
        runnerStatus: "disabled_local_review",
        status: "dry_run_ready",
      },
      productionBlockerIds: expect.arrayContaining([
        "db-provider-selection",
        "driver-package",
        "connection-config",
        "migration-executor",
        "secret-manager",
        "object-storage-export",
        "analytics-warehouse",
      ]),
      productionReady: false,
      requiredStoreCount: 6,
      status: "metadata_ready",
      storeCoverage: {
        coverageComplete: true,
        coveredStoreCount: 6,
        requiredStoreCount: 6,
      },
      storeCoverageCount: 6,
      valid: true,
    });
    expect(report.databaseReadiness.stores.map((store) => store.id)).toEqual([
      "campaign-db",
      "wallet-session-db",
      "task-evidence-db",
      "i18n-content-db",
      "risk-event-db",
      "points-ledger",
    ]);
  });

  it("surfaces fail-closed diagnostics for invalid backend config", () => {
    const report = createBackendServiceReadinessReport({
      configOptions: {
        env: {
          CAMPAIGN_OS_BACKEND_PROFILE: "production-live",
          CAMPAIGN_OS_ENABLE_CONTRACT_WRITER: "true",
          CAMPAIGN_OS_PERSISTENCE_MODE: "postgres",
        },
      },
    });

    expect(report.validation.valid).toBe(false);
    expect(report.validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "BACKEND_CONFIG_BLOCKED",
          field: "config",
          severity: "error",
        }),
      ]),
    );
    expect(report.config.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "UNKNOWN_BACKEND_PROFILE" }),
        expect.objectContaining({ code: "UNSUPPORTED_PERSISTENCE_MODE" }),
      ]),
    );
  });

  it("fails closed for production-required until database and migration readiness are live", () => {
    const report = createBackendServiceReadinessReport({
      configOptions: {
        env: {
          CAMPAIGN_OS_AUTH_SECRET: "auth-secret",
          CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT: "https://writer.invalid",
          CAMPAIGN_OS_DATABASE_URL: "postgres://db.invalid/campaign-os",
          CAMPAIGN_OS_DEAD_LETTER_QUEUE: "https://queue.invalid/dead-letter?token=queue-secret",
          CAMPAIGN_OS_DEGRADATION_POLICY: "fail-closed",
          CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "https://idempotency.invalid/store",
          CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "https://observability.invalid/hook",
          CAMPAIGN_OS_OPERATOR_AUTHORIZATION_POLICY: "operator-review-required",
          CAMPAIGN_OS_PROVIDER_REGISTRY_URL: "https://providers.invalid",
          CAMPAIGN_OS_QUEUE_PROVIDER: "metadata-only",
          CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS: "queue-provider-auth-ready",
          CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT: "https://queue-provider.invalid",
          CAMPAIGN_OS_SCHEDULER_ENDPOINT: "https://scheduler.invalid/hook",
          CAMPAIGN_OS_SCHEDULER_LEASE_STORE_URL: "https://lease.invalid/store",
          CAMPAIGN_OS_SCHEDULER_PROVIDER: "metadata-only",
          CAMPAIGN_OS_WORKER_LEASE_STORE_URL: "https://lease.invalid/worker",
          CAMPAIGN_OS_WORKER_QUEUE_URL: "https://queue-user:queue-pass@queue.invalid/jobs?token=queue-secret",
          CAMPAIGN_OS_WORKER_RETRY_POLICY: "deterministic-backoff",
        },
        profileId: "production-required",
      },
    });

    expect(report.config.diagnostics).toEqual([]);
    expect(report.databaseReadiness).toMatchObject({
      adapter: expect.objectContaining({
        status: "blocked",
      }),
      migrationPlan: expect.objectContaining({
        status: "blocked",
      }),
      validation: expect.objectContaining({
        valid: false,
      }),
    });
    expect(report.databaseAdapterRuntime).toMatchObject({
      connectionPool: expect.objectContaining({
        configuredKeyCount: 1,
        safeLabel: "[redacted]",
        state: "configured_redacted",
      }),
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ code: "DATABASE_DRIVER_PRODUCTION_DEFERRED" }),
        expect.objectContaining({ code: "DATABASE_ADAPTER_SECRET_REDACTED" }),
        expect.objectContaining({ code: "DATABASE_ADAPTER_PRECONDITION_DEFERRED" }),
      ]),
      driverId: "campaign-os-production-driver-deferred",
      liveConnectionAttempted: false,
      liveQueryExecutionEnabled: false,
      migrationExecutor: expect.objectContaining({
        executorStatus: "blocked",
        liveExecutionCount: 0,
        liveExecutionEnabled: false,
      }),
      migrationHandoff: expect.objectContaining({
        executorStatus: "blocked",
        liveExecutionCount: 0,
        liveExecutionEnabled: false,
        migrationGateStatus: "blocked",
        valid: false,
      }),
      productionDbRuntime: expect.objectContaining({
        connection: expect.objectContaining({
          safeLabel: "[redacted]",
          state: "configured_redacted",
        }),
        diagnosticCodes: expect.arrayContaining([
          "PRODUCTION_DB_DRIVER_DEFERRED",
          "PRODUCTION_DB_SECRET_REDACTED",
          "PRODUCTION_DB_MIGRATION_GATE_BLOCKED",
        ]),
        liveConnectionAttempted: false,
        liveQueryExecutionEnabled: false,
        migrationGate: expect.objectContaining({
          liveExecutionEnabled: false,
          status: "blocked",
        }),
        profileId: "production-required",
        status: "blocked",
        valid: false,
      }),
      profileId: "production-required",
      providerId: "campaign-os-provider-deferred",
      queryAdapter: expect.objectContaining({
        driverId: "campaign-os-production-driver-deferred",
        liveQueryExecutionEnabled: false,
      }),
      status: "blocked",
      transaction: expect.objectContaining({
        liveCommitEnabled: false,
        mode: "deferred_live",
        supported: true,
      }),
      valid: false,
    });
    expect(report.persistenceRuntime).toMatchObject({
      activeDriverId: "campaign-os-production-db-adapter",
      adapterKind: "production_deferred",
      connection: expect.objectContaining({
        safeLabel: "[redacted]",
        state: "configured_redacted",
      }),
      diagnostics: expect.arrayContaining([
        expect.objectContaining({
          code: "PRODUCTION_PERSISTENCE_SECRET_REDACTED",
          field: "CAMPAIGN_OS_DATABASE_URL",
          severity: "info",
        }),
        expect.objectContaining({
          code: "PRODUCTION_PERSISTENCE_LIVE_CONNECTION_DEFERRED",
          field: "activeDriverId",
          severity: "warning",
        }),
      ]),
      liveConnectionAttempted: false,
      migrationGate: expect.objectContaining({
        diagnostics: expect.arrayContaining([
          expect.objectContaining({
            code: "MIGRATION_EXECUTION_APPROVAL_MISSING",
            field: "approval",
            severity: "error",
          }),
          expect.objectContaining({
            code: "MIGRATION_EXECUTION_DRIVER_DEFERRED",
            field: "driver-package",
            severity: "warning",
          }),
        ]),
        liveExecutionCount: 0,
        liveExecutionEnabled: false,
        mode: "live_blocked",
        status: "blocked",
      }),
      profileId: "production-required",
      status: "boundary_ready",
      stores: expect.arrayContaining([
        expect.objectContaining({
          id: "points-ledger",
          required: true,
          runtimeState: "covered",
        }),
      ]),
    });
    expect(report.persistenceFoundation).toMatchObject({
      blockerCount: 11,
      diagnosticCodes: expect.arrayContaining([
        "PRODUCTION_PERSISTENCE_SECRET_REDACTED",
        "PRODUCTION_PERSISTENCE_LIVE_CONNECTION_DEFERRED",
        "DATABASE_DRIVER_PRODUCTION_DEFERRED",
        "DATABASE_ADAPTER_SECRET_REDACTED",
        "MIGRATION_EXECUTION_APPROVAL_MISSING",
      ]),
      liveConnectionAttempted: false,
      liveMigrationExecutionEnabled: false,
      liveQueryExecutionEnabled: false,
      migrationDryRun: {
        liveMigrationExecutionEnabled: false,
        migrationGateStatus: "blocked",
        noLiveMigrationCommand: true,
        runnerStatus: "deferred",
        status: "blocked",
      },
      productionReady: false,
      requiredStoreCount: 6,
      status: "blocked",
      storeCoverage: {
        coverageComplete: true,
        coveredStoreCount: 6,
        requiredStoreCount: 6,
      },
      storeCoverageCount: 6,
      valid: false,
    });
    expect(report.campaignDbVerticalSlice).toMatchObject({
      adapter: {
        deterministic: false,
        id: "campaign-os-production-driver-deferred",
        productionReady: false,
        status: "blocked",
      },
      capabilities: {
        deterministicLifecycle: true,
        recordDraft: false,
        readDraft: false,
        writeDraft: false,
      },
      campaignStore: {
        durable: false,
        fallbackUsed: false,
        mode: "production_required",
        recordCount: 0,
        status: "blocked",
        storeId: "campaign-db",
      },
      diagnosticCodes: expect.arrayContaining([
        "CAMPAIGN_DB_DURABLE_STORE_BLOCKED",
        "CAMPAIGN_DB_LIVE_DRIVER_MISSING",
        "CAMPAIGN_DB_MIGRATION_STATE_BLOCKED",
        "CAMPAIGN_DB_MIGRATION_EXECUTOR_UNAPPROVED",
        "CAMPAIGN_DB_SECRET_MANAGER_MISSING",
        "CAMPAIGN_DB_PRODUCTION_WRITE_DISABLED",
        "CAMPAIGN_DB_DETERMINISTIC_ADAPTER_NOT_PRODUCTION_READY",
      ]),
      lifecycle: {
        readinessDoesNotMutateRecords: true,
        repositoryContractStatus: "blocked",
        repositoryMode: "production_deferred",
      },
      migrationState: {
        appliedMigrationIds: [],
        blockedMigrationIds: ["001-campaign-db-v0-2-0"],
        diagnosticCodes: ["CAMPAIGN_MIGRATION_BLOCKED"],
        liveExecutionEnabled: false,
        pendingMigrationIds: [],
        requiredMigrationIds: ["001-campaign-db-v0-2-0"],
        schemaVersion: "v0.2.0",
        status: "blocked",
        storeId: "campaign-db",
      },
      noLive: {
        connectionAttempted: false,
        migrationExecutionEnabled: false,
        queryExecutionEnabled: false,
        writeExecutionEnabled: false,
      },
      productionActivationBlockers: expect.arrayContaining([
        "Production-required Campaign DB needs an approved live driver before activation.",
        "Production-required Campaign DB needs an approved migration executor before activation.",
        "Production-required Campaign DB needs secret manager and connection pool integration.",
        "Production Campaign DB writes remain disabled until live write activation is explicitly approved.",
        "Deterministic/local Campaign DB adapter is not production-ready.",
      ]),
      status: "blocked",
      storeId: "campaign-db",
      validation: {
        valid: false,
      },
    });
    expect(report.campaignDbVerticalSlice.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "CAMPAIGN_DB_LIVE_DRIVER_MISSING",
          field: "databaseAdapterRuntime.driverId",
          severity: "error",
        }),
        expect.objectContaining({
          code: "CAMPAIGN_DB_DURABLE_STORE_BLOCKED",
          field: "campaignStore.status",
          severity: "error",
        }),
        expect.objectContaining({
          code: "CAMPAIGN_DB_MIGRATION_STATE_BLOCKED",
          field: "migrationState.status",
          severity: "error",
        }),
        expect.objectContaining({
          code: "CAMPAIGN_DB_MIGRATION_EXECUTOR_UNAPPROVED",
          field: "migration.executionGate.approval",
          severity: "error",
        }),
        expect.objectContaining({
          code: "CAMPAIGN_DB_SECRET_MANAGER_MISSING",
          field: "persistenceRuntime.connection",
          severity: "error",
        }),
        expect.objectContaining({
          code: "CAMPAIGN_DB_PRODUCTION_WRITE_DISABLED",
          field: "databaseAdapterRuntime.transaction.liveCommitEnabled",
          severity: "error",
        }),
        expect.objectContaining({
          code: "CAMPAIGN_DB_DETERMINISTIC_ADAPTER_NOT_PRODUCTION_READY",
          field: "databaseAdapterRuntime.adapter",
          severity: "error",
        }),
      ]),
    );
    expect(report.authSession).toMatchObject({
      profileId: "production-required",
      status: "blocked",
      proofBoundary: expect.objectContaining({
        status: "blocked",
        verificationMode: "production_required",
      }),
      validation: expect.objectContaining({
        valid: false,
      }),
    });
    expect(report.authEnforcement).toMatchObject({
      agentCredentialSubstitutionDisabled: true,
      locallyEnforcedRouteIds: ["campaigns.create"],
      mode: "blocked",
      productionProofVerifierReady: false,
      productionProjectOwnershipSourceReady: false,
      productionSessionIssuerReady: false,
      remainingDeferredProductionDependencyIds: expect.arrayContaining([
        "live_wallet_proof_verifier",
        "jwt_or_session_cookie",
        "project_ownership_source",
      ]),
    });
    expect(report.authSessionFoundation).toMatchObject({
      blockedDependencyIds: [
        "wallet_live_verifier",
        "nonce_store",
        "session_signing_key",
        "secret_manager",
        "production_session_store",
        "project_membership_source",
        "project_ownership_source",
        "rbac_enforcement_policy",
      ],
      blockerCount: 8,
      diagnosticCodes: expect.arrayContaining([
        "AUTH_PROOF_VERIFIER_MISSING",
        "AUTH_NONCE_STORE_MISSING",
        "AUTH_SESSION_ISSUER_MISSING",
        "AUTH_SECRET_MANAGER_MISSING",
        "AUTH_SESSION_STORE_MISSING",
        "AUTH_SESSION_CONFIG_MISSING",
        "AUTH_OWNERSHIP_SOURCE_MISSING",
        "AUTH_POLICY_MISSING",
        "AUTH_AGENT_CREDENTIAL_SEPARATE",
      ]),
      liveSideEffectsEnabled: false,
      liveSigningExecuted: false,
      liveVerificationExecuted: false,
      ownership: {
        blockedDependencyIds: ["project_membership_source", "project_ownership_source"],
        membershipSourceReady: false,
        ownerMutationBlocked: true,
        ownershipSourceReady: false,
      },
      productionReady: false,
      profileId: "production-required",
      rbac: {
        agentCredentialSubstitutionDisabled: true,
        roleCount: 5,
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
      status: "blocked",
      valid: false,
      walletProof: {
        liveVerificationExecuted: false,
        liveVerifierReady: false,
        nonceStoreReady: false,
        status: "blocked",
      },
    });
    expect(report.providerIndexerFoundation).toMatchObject({
      blockerCount: 2,
      diagnosticCodes: [
        "INDEXER_ENDPOINT_MISSING",
        "PROVIDER_CREDENTIALS_MISSING",
      ],
      noLiveFlags: {
        liveProviderCallsEnabled: false,
        liveIndexerCallsEnabled: false,
        liveSocialCallsEnabled: false,
        liveAiCallsEnabled: false,
        liveAnalyticsIngestionEnabled: false,
        liveObjectStorageEnabled: false,
        liveContractCallsEnabled: false,
        workerExecutionEnabled: false,
      },
      productionReady: false,
      profileId: "production-required",
      providerGroupCount: 10,
      status: "blocked",
      valid: false,
      verificationSourceCoverage: {
        summaryCount: 5,
      },
      verificationSourceHandoff: {
        liveExecutionEnabled: false,
        supportedVerificationTypes: ["WALLET", "ON_CHAIN", "DAPP_API", "SOCIAL", "MANUAL"],
        valid: true,
      },
    });
    expect(report.workerSchedulerFoundation).toMatchObject({
      blockerCount: 0,
      diagnosticCodes: [],
      noLiveFlags: {
        liveCronExecutionEnabled: false,
        liveQueuePublishingEnabled: false,
        liveSchedulerExecutionEnabled: false,
        liveWorkerExecutionEnabled: false,
      },
      productionReady: false,
      profileId: "production-required",
      status: "local_ready",
      valid: true,
    });
    expect(report.queueRuntimeFoundation).toMatchObject({
      blockerCount: 0,
      diagnosticCodes: [],
      dryRunEnqueue: {
        enabled: true,
        livePublishAttempted: false,
        liveQueuePublishingEnabled: false,
      },
      id: "campaign-os-queue-runtime-foundation",
      noLiveFlags: {
        liveQueuePublishingEnabled: false,
        liveSchedulerExecutionEnabled: false,
        liveWorkerExecutionEnabled: false,
      },
      productionReady: false,
      profileId: "production-required",
      providerAdapter: {
        adapterId: "metadata-only-queue-provider-adapter",
        blockerCount: 0,
        diagnosticCodes: [],
        disabledLiveOperationCount: 8,
        liveQueuePublishingEnabled: false,
        liveWorkerExecutionEnabled: false,
        mode: "production_required",
        operationCount: 8,
        productionReady: false,
        providerId: "metadata-only",
        requiredConfigKeys: expect.arrayContaining([
          "CAMPAIGN_OS_QUEUE_PROVIDER",
          "CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT",
          "CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS",
          "CAMPAIGN_OS_WORKER_QUEUE_URL",
          "CAMPAIGN_OS_DEAD_LETTER_QUEUE",
          "CAMPAIGN_OS_WORKER_RETRY_POLICY",
          "CAMPAIGN_OS_DEGRADATION_POLICY",
          "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL",
          "CAMPAIGN_OS_WORKER_LEASE_STORE_URL",
          "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
        ]),
        status: "scaffolded",
        valid: true,
      },
      queuePlanCoverage: {
        queuePlanCount: 9,
      },
      status: "scaffolded",
      valid: true,
    });
    expect(report.schedulerRuntimeFoundation).toMatchObject({
      blockerCount: 0,
      diagnosticCodes: [],
      dryRunTrigger: {
        enabled: true,
        liveCronExecutionEnabled: false,
        liveQueuePublishingEnabled: false,
        liveSchedulerExecutionEnabled: false,
      },
      id: "campaign-os-scheduler-runtime-foundation",
      productionReady: false,
      profileId: "production-required",
      registrationCoverage: {
        registrationCount: 9,
      },
      status: "local_ready",
      valid: true,
    });
    expect(report.authSession.validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "AUTH_PROOF_VERIFIER_MISSING",
          field: "authSession.proofVerifier",
        }),
        expect.objectContaining({
          code: "AUTH_POLICY_MISSING",
          field: "authSession.rolePolicy",
        }),
        expect.objectContaining({
          code: "AUTH_OWNERSHIP_SOURCE_MISSING",
          field: "authSession.ownership",
        }),
      ]),
    );
    expect(report.validation).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          code: "AUTH_SESSION_READINESS_BLOCKED",
          field: "authSession",
        }),
        expect.objectContaining({
          code: "DATABASE_READINESS_BLOCKED",
          field: "databaseReadiness",
        }),
        expect.objectContaining({
          code: "CAMPAIGN_DB_VERTICAL_SLICE_BLOCKED",
          field: "campaignDbVerticalSlice",
        }),
        expect.objectContaining({
          code: "DATABASE_READINESS_BLOCKED",
          field: "databaseAdapterRuntime",
        }),
        expect.objectContaining({
          code: "PERSISTENCE_ADAPTER_INVALID",
          field: "persistenceRuntime",
        }),
        expect.objectContaining({
          code: "MIGRATION_MANIFEST_INVALID",
          field: "migration",
        }),
      ]),
    });
    expect(report.validation.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "workerSchedulerFoundation" }),
        expect.objectContaining({ field: "queueRuntimeFoundation" }),
        expect.objectContaining({ field: "schedulerRuntimeFoundation" }),
      ]),
    );
    expect(report.backendRuntimeBootstrap).toMatchObject({
      diagnosticCodes: expect.arrayContaining([
        "BACKEND_RUNTIME_BOOTSTRAP_PRODUCTION_BLOCKED",
        "BACKEND_RUNTIME_BOOTSTRAP_SERVER_RUNTIME_INVALID",
        "BACKEND_RUNTIME_BOOTSTRAP_BACKEND_READINESS_INVALID",
      ]),
      profileId: "production-required",
      readiness: {
        databaseAdapterRuntime: {
          liveConnectionAttempted: false,
          liveQueryExecutionEnabled: false,
          status: "blocked",
          valid: false,
        },
        persistenceRuntime: {
          liveConnectionAttempted: false,
          liveExecutionEnabled: false,
        },
      },
      status: "blocked",
      valid: false,
    });
    expect(report.apiService).toMatchObject({
      diagnosticCodes: expect.arrayContaining([
        "API_SERVICE_PRODUCTION_BLOCKED",
        "BACKEND_RUNTIME_BOOTSTRAP_PRODUCTION_BLOCKED",
      ]),
      deployableBoundaryReady: false,
      liveConnectionAttempted: false,
      liveSideEffectsEnabled: false,
      productionReady: false,
      profileId: "production-required",
      status: "blocked",
      workerExecutionEnabled: false,
    });
    expect(JSON.stringify(report)).not.toContain("auth-secret");
    expect(JSON.stringify(report)).not.toContain("postgres://db.invalid/campaign-os");
    expectNoQueueSecretLeak(report);
  });

  it("does not serialize queue runtime credentials or raw job payload samples", () => {
    const report = createBackendServiceReadinessReport({
      configOptions: {
        env: {
          CAMPAIGN_OS_AUTH_SECRET: "auth-secret",
          CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
          CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT: "https://writer.invalid/hook-secret-sample",
          CAMPAIGN_OS_DATABASE_URL: "postgres://db.invalid/campaign-os",
          CAMPAIGN_OS_DEAD_LETTER_QUEUE: "https://queue.invalid/dead-letter?token=queue-secret",
          CAMPAIGN_OS_DEGRADATION_POLICY: "fail-closed",
          CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "https://idempotency.invalid/tenant/raw/export.csv",
          CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "https://observability.invalid/hook?token=hook-secret-sample",
          CAMPAIGN_OS_PROVIDER_REGISTRY_URL: "https://providers.invalid/registry",
          CAMPAIGN_OS_QUEUE_BEARER_TOKEN: "Bearer worker-token-sample",
          CAMPAIGN_OS_QUEUE_PROVIDER: "metadata-only",
          CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS: "queue-provider-credential-secret",
          CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT: "https://queue-provider.invalid/hook?token=provider-secret",
          CAMPAIGN_OS_SIGNED_URL_SAMPLE: "https://storage.invalid/export.csv?X-Amz-Signature=signed-url-sample",
          CAMPAIGN_OS_WORKER_LEASE_STORE_URL: "https://lease.invalid/store?token=lease-token-sample",
          CAMPAIGN_OS_WORKER_QUEUE_URL: "https://queue-user:queue-pass@queue.invalid/jobs?token=queue-secret",
          CAMPAIGN_OS_WORKER_RETRY_POLICY: "deterministic-backoff",
          CAMPAIGN_OS_RAW_JOB_PAYLOAD_SAMPLE: "{\"walletAddress\":\"ELF_raw_wallet\",\"taskId\":\"task_raw\"}",
        },
        profileId: "production-required",
      },
    });

    expect(report.queueRuntimeFoundation).toMatchObject({
      diagnosticCodes: [],
      dryRunEnqueue: {
        enabled: true,
        liveQueuePublishingEnabled: false,
      },
      profileId: "production-required",
      providerAdapter: {
        adapterId: "metadata-only-queue-provider-adapter",
        blockerCount: 0,
        diagnosticCodes: [],
        liveQueuePublishingEnabled: false,
        liveWorkerExecutionEnabled: false,
        mode: "production_required",
        productionReady: false,
        providerId: "metadata-only",
        status: "scaffolded",
        valid: true,
      },
      productionReady: false,
      queuePlanCoverage: {
        queuePlanCount: 9,
      },
      status: "scaffolded",
      valid: true,
    });
    expectNoQueueSecretLeak(report);
  });

  it("does not serialize scheduler runtime credentials or raw trigger payload samples", () => {
    const report = createBackendServiceReadinessReport({
      configOptions: {
        env: {
          CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
          CAMPAIGN_OS_DEAD_LETTER_QUEUE: "https://queue.invalid/dead-letter?token=queue-secret",
          CAMPAIGN_OS_DEGRADATION_POLICY: "fail-closed",
          CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "https://idempotency.invalid/store",
          CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "https://observability.invalid/hook?scheduler-hook-secret=1",
          CAMPAIGN_OS_OPERATOR_AUTHORIZATION_POLICY: "operator-review-required",
          CAMPAIGN_OS_RAW_TRIGGER_PAYLOAD_SAMPLE: "{\"walletAddress\":\"ELF_scheduler_wallet\",\"taskId\":\"scheduler_raw_task\"}",
          CAMPAIGN_OS_SCHEDULER_ENDPOINT: "https://scheduler-user:scheduler-pass@scheduler.invalid/hook?token=scheduler-secret",
          CAMPAIGN_OS_SCHEDULER_LEASE_STORE_URL: "https://lease.invalid/store",
          CAMPAIGN_OS_SCHEDULER_PROVIDER: "metadata-only",
          CAMPAIGN_OS_SCHEDULER_TOKEN_SAMPLE: "Bearer scheduler-token-sample",
          CAMPAIGN_OS_WORKER_QUEUE_URL: "https://queue.invalid/jobs",
        },
        profileId: "production-required",
      },
    });

    expect(report.schedulerRuntimeFoundation).toMatchObject({
      diagnosticCodes: [],
      dryRunTrigger: {
        enabled: true,
        liveCronExecutionEnabled: false,
        liveQueuePublishingEnabled: false,
        liveSchedulerExecutionEnabled: false,
      },
      profileId: "production-required",
      productionReady: false,
      registrationCoverage: {
        registrationCount: 9,
      },
      status: "local_ready",
      valid: true,
    });
    expectNoSchedulerSecretLeak(report);
  });

  it("uses readable labels and does not expose private artifact paths", () => {
    const report = createBackendServiceReadinessReport();
    const serialized = JSON.stringify(report);

    expect(serialized).toContain("Campaign OS Backend Service");
    expect(serialized).not.toContain("kitty-specs");
    expect(serialized).not.toContain("docs/current");
    expect(serialized).not.toContain("evidence/");
    expect(serialized).not.toContain("sync/");
  });
});
