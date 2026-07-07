import { describe, expect, it } from "vitest";
import { createBackendServiceReadinessReport } from "./backendService";
import { createSuccessEnvelope } from "./envelope";
import {
  createServerRuntimeReadiness,
  withServerRuntimeReadiness,
} from "./serverReadiness";
import { resolveApiServerRuntimeContract } from "./serverRuntime";

const secretFragments = [
  "auth-secret",
  "bearer sample",
  "object-key-sample",
  "postgres://db.invalid/campaign-os",
  "private-key-sample",
  "raw-signature-sample",
  "signed-url",
];

const expectNoSecretLeak = (value: unknown) => {
  const serialized = JSON.stringify(value).toLowerCase();

  for (const fragment of secretFragments) {
    expect(serialized).not.toContain(fragment);
  }
};

describe("server runtime readiness metadata", () => {
  it("builds local-review liveness and readiness metadata", () => {
    const contract = resolveApiServerRuntimeContract({
      env: {},
      startedAt: "2026-07-06T18:00:00.000Z",
    });
    const backendReadiness = createBackendServiceReadinessReport({
      generatedAt: "2026-07-06T18:00:00.000Z",
    });
    const metadata = createServerRuntimeReadiness({
      backendReadiness,
      contract,
      now: new Date("2026-07-06T18:00:02.500Z"),
    });

    expect(metadata).toMatchObject({
      liveness: {
        live: true,
        startedAt: "2026-07-06T18:00:00.000Z",
        uptimeMs: 2500,
      },
      profileId: "local-review",
      readiness: {
        apiService: {
          activation: expect.objectContaining({
            deploymentHandoff: expect.objectContaining({
              contractsEndpoint: "/api/contracts",
              healthEndpoint: "/api/health",
              runtimeTarget: "api_service",
              shutdown: expect.objectContaining({
                idempotentStop: true,
                shutdownTimeoutMs: 5_000,
              }),
              smokeCommand: "npm run server:smoke",
              startCommand: "npm run server:start",
              tracePolicy: expect.objectContaining({
                traceHeaderName: "x-campaign-os-trace-id",
              }),
            }),
            id: "campaign-os-backend-runtime-activation",
            liveSideEffectsEnabled: false,
            productionReady: false,
            runtimeTarget: "node-http-api-service",
          }),
          blockedDependencyIds: expect.arrayContaining([
            "live-database-driver",
            "contract-writer",
          ]),
          deferredDependencyIds: expect.arrayContaining([
            "verification-worker",
            "provider-adapters",
            "deployment-config",
          ]),
          deployableBoundaryReady: true,
          id: "campaign-os-api-service",
          liveConnectionAttempted: false,
          liveSideEffectsEnabled: false,
          productionReady: false,
          status: "ready",
          workerExecutionEnabled: false,
        },
        authEnforcement: {
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
        },
        authSession: {
          contracts: {
            liveSideEffectsEnabled: false,
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
          status: "local_seeded",
          valid: true,
          verificationMode: "local_only",
        },
        backendRuntimeBootstrap: {
          activation: expect.objectContaining({
            deploymentHandoff: expect.objectContaining({
              environmentKeys: expect.arrayContaining([
                expect.objectContaining({
                  key: "CAMPAIGN_OS_DATABASE_URL",
                  redacted: true,
                  status: "blocked",
                }),
                expect.objectContaining({
                  key: "CAMPAIGN_OS_AUTH_SECRET",
                  redacted: true,
                  status: "blocked",
                }),
              ]),
              requiredBeforeProduction: expect.arrayContaining([
                "live-database-driver",
                "migration-executor",
                "session-issuer",
                "contract-writer",
                "reward-custody",
                "reward-distribution",
              ]),
              startCommand: "npm run server:start",
            }),
            id: "campaign-os-backend-runtime-activation",
          }),
          deferredDependencyIds: expect.arrayContaining([
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
          diagnosticCodes: [],
          profileId: "local-review",
          status: "ready",
          tracePolicy: {
            traceHeaderName: "x-campaign-os-trace-id",
          },
          valid: true,
        },
        backend: {
          entrypointId: "campaign-os-backend-service",
          valid: true,
        },
        campaignDbVerticalSlice: {
          adapter: {
            deterministic: true,
            id: "campaign-os-deterministic-test-driver",
            productionReady: false,
            status: "active_local",
          },
          campaignStore: {
            durable: false,
            fallbackUsed: false,
            mode: "local_seeded",
            recordCount: 0,
            status: "ready",
            storeId: "campaign-db",
          },
          diagnosticCodes: [],
          lifecycle: {
            readinessDoesNotMutateRecords: true,
            repositoryContractStatus: "available",
            repositoryMode: "deterministic_test",
          },
          migrationState: {
            appliedMigrationIds: ["001-campaign-db-v0-2-0"],
            blockedMigrationIds: [],
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
          status: "ready",
          storeId: "campaign-db",
          validation: {
            valid: true,
          },
        },
        database: {
          adapterStatus: "contract_ready",
          migrationPlanStatus: "dry_run_ready",
          valid: true,
        },
        databaseAdapterRuntime: {
          connectionPool: expect.objectContaining({
            configuredKeyCount: 0,
            safeLabel: "not_configured",
            state: "not_configured",
          }),
          connectionPoolState: "not_configured",
          deferredDependencyIds: expect.arrayContaining([
            "driver-package-selection",
            "db-deployment-env",
            "schema-migration-implementation",
            "connection-pool-implementation",
            "migration-lock",
            "backup-restore-plan",
            "secret-manager",
            "observability-exporter",
          ]),
          diagnosticCodes: [],
          driverId: "campaign-os-deterministic-test-driver",
          liveConnectionAttempted: false,
          liveQueryExecutionEnabled: false,
          migrationExecutor: expect.objectContaining({
            executorStatus: "not_configured",
            handoffStatus: "not_configured",
            handoffValid: true,
            liveExecutionCount: 0,
            liveExecutionEnabled: false,
            migrationGateStatus: "ready",
          }),
          productionDbRuntime: expect.objectContaining({
            connectionState: "ready",
            diagnosticCodes: [],
            driverId: "campaign-os-deterministic-test-driver",
            id: "campaign-os-production-db-runtime-v1",
            liveConnectionAttempted: false,
            liveQueryExecutionEnabled: false,
            migrationGateStatus: "not_required_for_fixture",
            ownerStoreCount: 6,
            profileId: "local-review",
            providerId: "campaign-os-deterministic-test-db",
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
          requiredStoreCount: 6,
          status: "active_local",
          transaction: expect.objectContaining({
            liveCommitEnabled: false,
            mode: "deterministic_test",
          }),
          valid: true,
        },
        persistenceRuntime: {
          activeDriverId: "campaign-os-memory-adapter",
          adapterKind: "memory",
          connection: expect.objectContaining({
            configuredKeyCount: 0,
            safeLabel: "not_configured",
            state: "not_configured",
          }),
          connectionState: "not_configured",
          deferredDependencyIds: expect.arrayContaining([
            "db-provider-selection",
            "driver-package",
            "connection-pool",
            "migration-executor",
            "migration-lock",
            "backup-restore-plan",
            "secret-manager",
            "object-storage-export",
            "analytics-warehouse",
          ]),
          diagnosticCodes: [],
          diagnostics: [],
          liveConnectionAttempted: false,
          liveExecutionEnabled: false,
          migrationGate: expect.objectContaining({
            diagnosticCodes: [],
            liveExecutionCount: 0,
            liveExecutionEnabled: false,
            mode: "dry_run_only",
            status: "ready",
          }),
          profileId: "local-review",
          requiredStoreCount: 6,
          status: "active_local",
          stores: expect.arrayContaining([
            expect.objectContaining({
              id: "campaign-db",
              required: true,
              runtimeState: "covered",
            }),
          ]),
          valid: true,
        },
        persistenceFoundation: {
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
        },
      },
      requestGuard: {
        guardedFailureEnvelope: true,
        maxBodyBytes: 1_048_576,
        traceHeaderName: "x-campaign-os-trace-id",
      },
      status: "ready",
      uptimeMs: 2500,
    });
    expect(metadata.corsPolicy).toMatchObject({
      enabled: true,
      preflightHandledBeforeRuntime: true,
    });
  });

  it("surfaces production-required blocked readiness without live side effects", () => {
    const env = {
      CAMPAIGN_OS_AUTH_SECRET: "auth-secret",
      CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
      CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT: "https://writer.invalid/private-key-sample",
      CAMPAIGN_OS_DATABASE_URL: "postgres://db.invalid/campaign-os",
      CAMPAIGN_OS_PROVIDER_REGISTRY_URL: "https://providers.invalid/object-key-sample",
      CAMPAIGN_OS_WORKER_QUEUE_URL: "https://queue.invalid/raw-signature-sample",
    };
    const contract = resolveApiServerRuntimeContract({ env });
    const backendReadiness = createBackendServiceReadinessReport({
      configOptions: { env },
    });
    const metadata = createServerRuntimeReadiness({
      backendReadiness,
      contract,
      now: new Date(contract.startedAt),
    });

    expect(metadata).toMatchObject({
      profileId: "production-required",
      readiness: {
        apiService: {
          diagnosticCodes: expect.arrayContaining([
            "API_SERVICE_PRODUCTION_BLOCKED",
            "BACKEND_RUNTIME_BOOTSTRAP_PRODUCTION_BLOCKED",
          ]),
          deployableBoundaryReady: false,
          liveConnectionAttempted: false,
          liveSideEffectsEnabled: false,
          productionReady: false,
          status: "blocked",
        },
        authEnforcement: {
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
        },
        authSession: {
          contracts: {
            blockedDependencyIds: expect.arrayContaining([
              "live_wallet_proof_verifier",
              "auth_nonce_store",
              "session_signing_key",
              "secret_manager",
              "production_session_store",
              "project_membership_source",
            ]),
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
          status: "blocked",
          valid: false,
          verificationMode: "production_required",
        },
        backendRuntimeBootstrap: {
          diagnosticCodes: expect.arrayContaining([
            "BACKEND_RUNTIME_BOOTSTRAP_PRODUCTION_BLOCKED",
            "BACKEND_RUNTIME_BOOTSTRAP_SERVER_RUNTIME_INVALID",
            "BACKEND_RUNTIME_BOOTSTRAP_BACKEND_READINESS_INVALID",
          ]),
          profileId: "production-required",
          status: "blocked",
          valid: false,
        },
        backend: {
          valid: false,
        },
        campaignDbVerticalSlice: {
          adapter: {
            deterministic: false,
            id: "campaign-os-production-driver-deferred",
            productionReady: false,
            status: "blocked",
          },
          campaignStore: {
            durable: false,
            fallbackUsed: false,
            mode: "production_required",
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
          status: "blocked",
          storeId: "campaign-db",
          validation: {
            valid: false,
          },
        },
        database: {
          adapterStatus: "blocked",
          migrationPlanStatus: "blocked",
          valid: false,
        },
        databaseAdapterRuntime: {
          connectionPool: expect.objectContaining({
            configuredKeyCount: 1,
            safeLabel: "[redacted]",
            state: "configured_redacted",
          }),
          diagnosticCodes: expect.arrayContaining([
            "DATABASE_DRIVER_PRODUCTION_DEFERRED",
            "DATABASE_ADAPTER_SECRET_REDACTED",
            "DATABASE_ADAPTER_PRECONDITION_DEFERRED",
          ]),
          driverId: "campaign-os-production-driver-deferred",
          liveConnectionAttempted: false,
          liveQueryExecutionEnabled: false,
          migrationExecutor: expect.objectContaining({
            executorStatus: "blocked",
            handoffStatus: "blocked",
            handoffValid: false,
            liveExecutionCount: 0,
            liveExecutionEnabled: false,
            migrationGateStatus: "blocked",
          }),
          productionDbRuntime: expect.objectContaining({
            connectionState: "configured_redacted",
            diagnosticCodes: expect.arrayContaining([
              "PRODUCTION_DB_DRIVER_DEFERRED",
              "PRODUCTION_DB_SECRET_REDACTED",
              "PRODUCTION_DB_MIGRATION_GATE_BLOCKED",
            ]),
            driverId: "campaign-os-production-driver-deferred",
            liveConnectionAttempted: false,
            liveQueryExecutionEnabled: false,
            migrationGateStatus: "blocked",
            profileId: "production-required",
            providerId: "campaign-os-provider-deferred",
            status: "blocked",
            valid: false,
          }),
          profileId: "production-required",
          providerId: "campaign-os-provider-deferred",
          requiredStoreCount: 6,
          status: "blocked",
          valid: false,
        },
        persistenceRuntime: {
          activeDriverId: "campaign-os-production-db-adapter",
          adapterKind: "production_deferred",
          connection: expect.objectContaining({
            configuredKeyCount: 1,
            safeLabel: "[redacted]",
            state: "configured_redacted",
          }),
          diagnosticCodes: expect.arrayContaining([
            "PRODUCTION_PERSISTENCE_SECRET_REDACTED",
            "PRODUCTION_PERSISTENCE_LIVE_CONNECTION_DEFERRED",
          ]),
          liveConnectionAttempted: false,
          liveExecutionEnabled: false,
          migrationGate: expect.objectContaining({
            approval: "missing",
            diagnosticCodes: expect.arrayContaining([
              "MIGRATION_EXECUTION_APPROVAL_MISSING",
              "MIGRATION_EXECUTION_DRIVER_DEFERRED",
            ]),
            liveExecutionCount: 0,
            liveExecutionEnabled: false,
            mode: "live_blocked",
            status: "blocked",
          }),
          profileId: "production-required",
          requiredStoreCount: 6,
        },
        persistenceFoundation: {
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
          storeCoverageCount: 6,
          valid: false,
        },
      },
      status: "blocked",
    });
    expect(metadata.readiness.backend.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "AUTH_SESSION_READINESS_BLOCKED",
        "CAMPAIGN_DB_VERTICAL_SLICE_BLOCKED",
        "DATABASE_READINESS_BLOCKED",
        "PERSISTENCE_ADAPTER_INVALID",
        "MIGRATION_MANIFEST_INVALID",
      ]),
    );
    expectNoSecretLeak(metadata);
  });

  it("projects explicit durable campaign store metadata into server readiness", () => {
    const contract = resolveApiServerRuntimeContract({ env: {} });
    const backendReadiness = createBackendServiceReadinessReport({
      campaignStore: {
        durable: true,
        mode: "durable_test",
        recordCount: 3,
      },
    });
    const metadata = createServerRuntimeReadiness({ backendReadiness, contract });

    expect(metadata.readiness.campaignDbVerticalSlice).toMatchObject({
      campaignStore: {
        durable: true,
        fallbackUsed: false,
        mode: "durable_test",
        recordCount: 3,
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
      },
      status: "ready",
    });
  });

  it("represents shutdown states", () => {
    const contract = resolveApiServerRuntimeContract({
      env: {},
      shutdownTimeoutMs: 1234,
      startedAt: "2026-07-06T18:00:00.000Z",
    });
    const backendReadiness = createBackendServiceReadinessReport();
    const stopping = createServerRuntimeReadiness({
      backendReadiness,
      contract,
      shutdownState: {
        activeRequestCount: 2,
        state: "stopping",
        stopStartedAt: "2026-07-06T18:00:03.000Z",
      },
    });
    const stopped = createServerRuntimeReadiness({
      backendReadiness,
      contract,
      shutdownState: {
        activeRequestCount: 0,
        closedAt: "2026-07-06T18:00:04.000Z",
        state: "stopped",
      },
    });

    expect(stopping).toMatchObject({
      readiness: {
        backendRuntimeBootstrap: {
          diagnosticCodes: expect.arrayContaining([
            "BACKEND_RUNTIME_BOOTSTRAP_SHUTDOWN_IN_PROGRESS",
          ]),
          shutdown: {
            activeRequestCount: 2,
            shutdownTimeoutMs: 1234,
            state: "stopping",
          },
          status: "deferred",
          valid: true,
        },
      },
      shutdownState: {
        activeRequestCount: 2,
        shutdownTimeoutMs: 1234,
        state: "stopping",
      },
      status: "shutting_down",
    });
    expect(stopped).toMatchObject({
      liveness: {
        live: false,
      },
      readiness: {
        backendRuntimeBootstrap: {
          diagnosticCodes: expect.arrayContaining([
            "BACKEND_RUNTIME_BOOTSTRAP_STOPPED",
          ]),
          shutdown: {
            activeRequestCount: 0,
            state: "stopped",
          },
          status: "blocked",
          valid: false,
        },
      },
      shutdownState: {
        state: "stopped",
      },
      status: "stopped",
    });
  });

  it("adds metadata to success envelopes without replacing existing health data", () => {
    const contract = resolveApiServerRuntimeContract({ env: {} });
    const backendReadiness = createBackendServiceReadinessReport();
    const metadata = createServerRuntimeReadiness({ backendReadiness, contract });
    const envelope = createSuccessEnvelope({
      data: {
        backendService: { entrypointId: "campaign-os-backend-service" },
        status: "ok",
      },
      routeCount: 10,
      traceId: "trace-health",
      version: "0.2.0-local",
    });
    const withMetadata = withServerRuntimeReadiness(envelope, metadata);

    expect(withMetadata.ok).toBe(true);
    if (withMetadata.ok) {
      expect(withMetadata.data).toMatchObject({
        backendService: { entrypointId: "campaign-os-backend-service" },
        serverRuntime: expect.objectContaining({
          profileId: "local-review",
          readiness: expect.objectContaining({
            campaignDbVerticalSlice: expect.objectContaining({
              campaignStore: expect.objectContaining({
                mode: "local_seeded",
                status: "ready",
                storeId: "campaign-db",
              }),
              migrationState: expect.objectContaining({
                appliedMigrationIds: ["001-campaign-db-v0-2-0"],
                liveExecutionEnabled: false,
                status: "applied",
              }),
            }),
          }),
          status: "ready",
        }),
        status: "ok",
      });
    }
  });

  it("keeps failure envelopes unchanged", () => {
    const contract = resolveApiServerRuntimeContract({ env: {} });
    const backendReadiness = createBackendServiceReadinessReport();
    const metadata = createServerRuntimeReadiness({ backendReadiness, contract });
    const failure = {
      ok: false as const,
      error: {
        code: "INVALID_REQUEST" as const,
        message: {
          "en-US": "Bad request",
          "zh-CN": "Bad request",
          "zh-TW": "Bad request",
        },
        status: 400,
      },
      runtime: {
        mode: "local_seeded" as const,
        name: "campaign-os-api-runtime" as const,
        routeCount: 10,
        version: "0.2.0-local",
      },
      safety: {
        localOnly: true as const,
        noContractWrite: true as const,
        noExportFile: true as const,
        noLiveApi: true as const,
        noMigrationRunner: true as const,
        noProductionDatabase: true as const,
        noRewardCustody: true as const,
        noRewardDistribution: true as const,
        noSecretHandling: true as const,
        noStorageWrite: true as const,
        noWalletSignature: true as const,
        seededDataOnly: true as const,
      },
      timestamp: "2026-07-06T18:00:00.000Z",
      traceId: "trace-failure",
    };

    expect(withServerRuntimeReadiness(failure, metadata)).toBe(failure);
  });

  it("lists all deferred server runtime attach points", () => {
    const contract = resolveApiServerRuntimeContract({ env: {} });
    const metadata = createServerRuntimeReadiness({
      backendReadiness: createBackendServiceReadinessReport(),
      contract,
    });

    expect(metadata.deferredAttachPoints.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "framework-decision",
        "deployment-config",
        "production-database-driver",
        "auth-middleware",
        "provider-adapters",
        "worker-ingress",
        "scheduler",
        "contract-writer",
        "observability-exporter",
        "object-storage-export",
      ]),
    );
    expect(metadata.deferredAttachPoints.every((item) => item.status !== "deferred" || item.requiredBeforeProduction !== undefined)).toBe(true);
  });
});
