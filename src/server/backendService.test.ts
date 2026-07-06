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
    expect(report.apiFoundation.servicePorts.validation.valid).toBe(true);
    expect(report.apiFoundation.validation.valid).toBe(true);
    expect(report.topology.validation.valid).toBe(true);
  });

  it("publishes attach points for all deferred production backend areas", () => {
    expect(backendAttachMap.map((item) => item.area)).toEqual(productionAreas);

    const report = createBackendServiceReadinessReport();

    for (const attachPoint of report.attachMap) {
      expect(attachPoint.attachPoint).not.toHaveLength(0);
      expect(attachPoint.blockedBy.length).toBeGreaterThan(0);
      expect(attachPoint.currentStatus).not.toBe("local-only");
      expect(attachPoint.requiredBeforeProduction).toBe(true);
    }
    expect(report.attachMap.find((item) => item.area === "auth-session")).toMatchObject({
      attachPoint: "src/server/authSession.ts:createAuthSessionReadinessReport",
      blockedBy: expect.arrayContaining([
        "live wallet signature verifier",
        "JWT or session cookie issuer",
        "RBAC enforcement",
        "project ownership source",
        "admin organization model",
        "agent credential provider",
      ]),
      currentStatus: "scaffold",
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
          CAMPAIGN_OS_PROVIDER_REGISTRY_URL: "https://providers.invalid",
          CAMPAIGN_OS_WORKER_QUEUE_URL: "https://queue.invalid",
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
    expect(JSON.stringify(report)).not.toContain("auth-secret");
    expect(JSON.stringify(report)).not.toContain("postgres://db.invalid/campaign-os");
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
