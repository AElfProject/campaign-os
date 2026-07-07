import { afterEach, describe, expect, it, vi } from "vitest";
import { startCampaignOsApiServer } from "./server";

const secretLeakFragments = [
  "authorization: bearer",
  "bearer sample-bearer-token",
  "campaign_os_database_url=",
  "connectionstring=",
  "mnemonic",
  "sample-mnemonic-phrase",
  "objectkey=",
  "object-key-sample",
  "password=",
  "privatekey=",
  "private-key-sample",
  "real-db-password",
  "rawsignature=",
  "raw-signature-sample",
  "seedphrase=",
  "seed-phrase-sample",
  "signedurl=",
  "https://storage.invalid/signed-url",
  "postgres://real-user:real-db-password@db.invalid/campaign-os",
];

const expectSanitizedReadinessPayload = (payload: unknown) => {
  const serialized = JSON.stringify(payload).toLowerCase();

  for (const fragment of secretLeakFragments) {
    expect(serialized).not.toContain(fragment);
  }
};

describe("backend scaffold HTTP smoke", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("serves health and contracts envelopes with trace IDs over the local server", async () => {
    const server = await startCampaignOsApiServer({ logger: false, port: 0 });

    try {
      expect(server.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);

      const health = await fetch(`${server.url}/api/health`, {
        headers: { "x-campaign-os-trace-id": "trace-backend-smoke-health" },
      });
      const contracts = await fetch(`${server.url}/api/contracts`, {
        headers: { "x-campaign-os-trace-id": "trace-backend-smoke-contracts" },
      });
      const healthPayload = await health.json();
      const contractsPayload = await contracts.json();

      expect(health.status).toBe(200);
      expect(contracts.status).toBe(200);
      expect(health.headers.get("content-type")).toContain("application/json");
      expect(contracts.headers.get("content-type")).toContain("application/json");
      expect(health.headers.get("x-campaign-os-trace-id")).toBe("trace-backend-smoke-health");
      expect(contracts.headers.get("x-campaign-os-trace-id")).toBe("trace-backend-smoke-contracts");
      expect(healthPayload).toMatchObject({
        ok: true,
        traceId: "trace-backend-smoke-health",
        runtime: expect.objectContaining({
          name: "campaign-os-api-runtime",
          mode: "local_seeded",
        }),
        data: {
          backendService: expect.objectContaining({
            authSession: expect.objectContaining({
              profileId: "local-review",
              protectedRouteCount: expect.any(Number),
              roleCount: 5,
              status: "local_seeded",
              valid: true,
            }),
            databaseReadiness: expect.objectContaining({
              adapterStatus: "contract_ready",
              migrationPlanStatus: "dry_run_ready",
              requiredStoreCount: 6,
              valid: true,
            }),
            databaseAdapterRuntime: expect.objectContaining({
              connectionPool: expect.objectContaining({
                configuredKeyCount: 0,
                safeLabel: "not_configured",
                state: "not_configured",
              }),
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
              profileId: "local-review",
              providerId: "campaign-os-deterministic-test-db",
              productionDbRuntime: expect.objectContaining({
                connectionState: "ready",
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
              requiredStoreCount: 6,
              status: "active_local",
              valid: true,
            }),
            entrypointId: "campaign-os-backend-service",
            migrationRunnerStatus: "disabled_local_review",
            persistenceRuntime: expect.objectContaining({
              activeDriverId: "campaign-os-memory-adapter",
              adapterKind: "memory",
              connection: expect.objectContaining({
                configuredKeyCount: 0,
                safeLabel: "not_configured",
                state: "not_configured",
              }),
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
              diagnostics: [],
              liveConnectionAttempted: false,
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
              valid: true,
            }),
            profileId: "local-review",
            traceId: "trace-backend-smoke-health",
          }),
          serverRuntime: expect.objectContaining({
            profileId: "local-review",
            readiness: expect.objectContaining({
              backendRuntimeBootstrap: expect.objectContaining({
                deferredDependencyIds: expect.arrayContaining([
                  "deployment-config",
                  "production-database-driver",
                  "database-migration-executor",
                  "auth-middleware",
                  "provider-adapters",
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
                readiness: expect.objectContaining({
                  databaseAdapterRuntime: expect.objectContaining({
                    liveConnectionAttempted: false,
                    liveQueryExecutionEnabled: false,
                    status: "active_local",
                    valid: true,
                  }),
                  persistenceRuntime: expect.objectContaining({
                    liveConnectionAttempted: false,
                    liveExecutionEnabled: false,
                    status: "active_local",
                    valid: true,
                  }),
                }),
                requestGuard: expect.objectContaining({
                  guardedFailureEnvelope: true,
                  traceHeaderName: "x-campaign-os-trace-id",
                }),
                shutdown: expect.objectContaining({
                  shutdownTimeoutMs: 5_000,
                  state: "running",
                }),
                startup: expect.objectContaining({
                  host: "127.0.0.1",
                  profileId: "local-review",
                  valid: true,
                }),
                status: "ready",
                tracePolicy: {
                  failureEnvelopeTraceId: true,
                  startupLogIncludesTracePolicy: true,
                  successEnvelopeTraceId: true,
                  traceHeaderName: "x-campaign-os-trace-id",
                },
                valid: true,
              }),
              backend: expect.objectContaining({
                valid: true,
              }),
              campaignDbVerticalSlice: expect.objectContaining({
                diagnosticCodes: [],
                noLive: {
                  connectionAttempted: false,
                  migrationExecutionEnabled: false,
                  queryExecutionEnabled: false,
                  writeExecutionEnabled: false,
                },
                status: "ready",
                storeId: "campaign-db",
                validation: expect.objectContaining({
                  valid: true,
                }),
              }),
              database: expect.objectContaining({
                adapterStatus: "contract_ready",
                migrationPlanStatus: "dry_run_ready",
                valid: true,
              }),
              databaseAdapterRuntime: expect.objectContaining({
                liveConnectionAttempted: false,
                liveQueryExecutionEnabled: false,
                migrationExecutor: expect.objectContaining({
                  liveExecutionCount: 0,
                  liveExecutionEnabled: false,
                  migrationGateStatus: "ready",
                }),
                productionDbRuntime: expect.objectContaining({
                  liveConnectionAttempted: false,
                  liveQueryExecutionEnabled: false,
                  migrationGateStatus: "not_required_for_fixture",
                  status: "ready",
                  valid: true,
                }),
                profileId: "local-review",
                status: "active_local",
                valid: true,
              }),
              persistenceRuntime: expect.objectContaining({
                activeDriverId: "campaign-os-memory-adapter",
                liveConnectionAttempted: false,
                migrationGate: expect.objectContaining({
                  liveExecutionCount: 0,
                  liveExecutionEnabled: false,
                  mode: "dry_run_only",
                  status: "ready",
                }),
                profileId: "local-review",
                status: "active_local",
                valid: true,
              }),
            }),
            requestGuard: expect.objectContaining({
              guardedFailureEnvelope: true,
              traceHeaderName: "x-campaign-os-trace-id",
            }),
            status: "ready",
          }),
          status: "ok",
        },
      });
      expect(contractsPayload).toMatchObject({
        ok: true,
        traceId: "trace-backend-smoke-contracts",
        runtime: expect.objectContaining({
          name: "campaign-os-api-runtime",
          mode: "local_seeded",
        }),
        data: {
          backendService: expect.objectContaining({
            authSession: expect.objectContaining({
              agentCredentialBoundary: {
                agentSkillCanSubstituteUserWallet: false,
                separatedFromUserWalletSession: true,
              },
              protectedRoutes: expect.arrayContaining([
                expect.objectContaining({
                  enforcementStatus: "metadata_only",
                  routeId: "wallet.session.create",
                }),
                expect.objectContaining({
                  enforcementStatus: "enforcement_deferred",
                  requiredRoles: ["project_owner"],
                  routeId: "campaigns.create",
                }),
                expect.objectContaining({
                  enforcementStatus: "enforcement_deferred",
                  requiredRoles: ["project_owner", "internal_operator"],
                  routeId: "campaigns.export.preview",
                }),
                expect.objectContaining({
                  enforcementStatus: "enforcement_deferred",
                  requiredRoles: ["participant"],
                  routeId: "tasks.verify",
                }),
              ]),
              status: "local_seeded",
              validation: expect.objectContaining({
                valid: true,
              }),
            }),
            databaseReadiness: expect.objectContaining({
              adapter: expect.objectContaining({
                id: "campaign-os-production-db-adapter",
                status: "contract_ready",
              }),
              migrationPlan: expect.objectContaining({
                dryRun: true,
                liveExecutionEnabled: false,
                status: "dry_run_ready",
              }),
              requiredStores: expect.arrayContaining([
                expect.objectContaining({
                  id: "campaign-db",
                  schemaVersion: "v0.2.0",
                }),
              ]),
              validation: expect.objectContaining({
                valid: true,
              }),
            }),
            databaseAdapterRuntime: expect.objectContaining({
              connectionPoolState: "not_configured",
              deferredDependencies: expect.arrayContaining([
                expect.objectContaining({
                  id: "driver-package-selection",
                  requiredBeforeProduction: true,
                  status: "deferred",
                }),
                expect.objectContaining({
                  id: "secret-manager",
                  requiredBeforeProduction: true,
                  status: "deferred",
                }),
              ]),
              liveConnectionAttempted: false,
              liveQueryExecutionEnabled: false,
              migrationExecutor: expect.objectContaining({
                liveExecutionCount: 0,
                liveExecutionEnabled: false,
                migrationGateStatus: "ready",
              }),
              profileId: "local-review",
              productionDbRuntime: expect.objectContaining({
                connection: expect.objectContaining({
                  safeLabel: "deterministic_fixture",
                  state: "ready",
                }),
                driver: expect.objectContaining({
                  deterministicFixture: true,
                  productionReady: false,
                }),
                id: "campaign-os-production-db-runtime-v1",
                liveConnectionAttempted: false,
                liveQueryExecutionEnabled: false,
                migrationGate: expect.objectContaining({
                  liveExecutionEnabled: false,
                  status: "not_required_for_fixture",
                }),
                ownerStores: expect.arrayContaining(["campaign-db", "points-ledger"]),
                queryCapability: expect.objectContaining({
                  adHocRawSqlEnabled: false,
                  liveQueryExecutionEnabled: false,
                  parameterizedQueries: true,
                  transactions: true,
                }),
                schemaManifestId: "campaign-os-production-db-schema-v0.2",
                status: "ready",
                valid: true,
              }),
              status: "active_local",
              stores: expect.arrayContaining([
                expect.objectContaining({
                  id: "campaign-db",
                  adapterStatus: "mapped",
                  required: true,
                }),
              ]),
              valid: true,
            }),
            persistenceRuntime: expect.objectContaining({
              activeDriverId: "campaign-os-memory-adapter",
              adapterKind: "memory",
              connectionState: "not_configured",
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
              ]),
              liveConnectionAttempted: false,
              migrationGate: expect.objectContaining({
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
                }),
              ]),
              valid: true,
            }),
            deferredProductionCapabilities: expect.arrayContaining([
              "auth_session",
              "production_database",
              "provider_adapters",
              "worker_queue",
              "scheduler",
              "contract_writer",
              "reward_distribution",
            ]),
            reportShape: expect.objectContaining({
              sections: expect.arrayContaining([
                "authSession",
                "databaseAdapterRuntime",
                "databaseReadiness",
                "persistenceRuntime",
              ]),
              valid: true,
            }),
          }),
          serverRuntime: expect.objectContaining({
            readiness: expect.objectContaining({
              backendRuntimeBootstrap: expect.objectContaining({
                deferredDependencies: expect.arrayContaining([
                  expect.objectContaining({
                    id: "production-database-driver",
                    requiredBeforeProduction: true,
                    status: "blocked",
                  }),
                  expect.objectContaining({
                    id: "auth-middleware",
                    requiredBeforeProduction: true,
                    status: "blocked",
                  }),
                  expect.objectContaining({
                    id: "worker-ingress",
                    requiredBeforeProduction: true,
                    status: "deferred",
                  }),
                  expect.objectContaining({
                    id: "analytics-warehouse",
                    requiredBeforeProduction: true,
                    status: "deferred",
                  }),
                ]),
                diagnosticCodes: [],
                readiness: expect.objectContaining({
                  databaseAdapterRuntime: expect.objectContaining({
                    liveConnectionAttempted: false,
                    liveQueryExecutionEnabled: false,
                    status: "active_local",
                    valid: true,
                  }),
                  persistenceRuntime: expect.objectContaining({
                    liveConnectionAttempted: false,
                    liveExecutionEnabled: false,
                    status: "active_local",
                    valid: true,
                  }),
                }),
                status: "ready",
                tracePolicy: expect.objectContaining({
                  failureEnvelopeTraceId: true,
                  successEnvelopeTraceId: true,
                  traceHeaderName: "x-campaign-os-trace-id",
                }),
                valid: true,
              }),
            }),
          }),
        },
      });
      expectSanitizedReadinessPayload(healthPayload.data.backendService);
      expectSanitizedReadinessPayload(contractsPayload.data.backendService);
      expectSanitizedReadinessPayload(healthPayload.data.serverRuntime);
      expectSanitizedReadinessPayload(contractsPayload.data.serverRuntime);
    } finally {
      await server.stop();
    }
  });

  it("creates and reads Campaign DB drafts through HTTP without external services", async () => {
    const server = await startCampaignOsApiServer({ logger: false, port: 0 });

    try {
      const create = await fetch(`${server.url}/api/campaigns`, {
        body: JSON.stringify({
          duration: "2026-09-01/2026-09-14",
          endTime: "2026-09-14T23:59:59Z",
          goal: "Smoke Campaign DB draft",
          ownerAddress: "smoke-owner-001",
          projectId: "smoke-project",
          rewardDescription: "Smoke rewards stay local-review only.",
          startTime: "2026-09-01T00:00:00Z",
        }),
        headers: {
          "content-type": "application/json",
          "x-campaign-os-trace-id": "trace-campaign-db-http-create",
        },
        method: "POST",
      });
      const createPayload = await create.json();
      const draftId = createPayload.data?.payload?.id;
      const detail = await fetch(`${server.url}/api/campaigns/${draftId}`, {
        headers: { "x-campaign-os-trace-id": "trace-campaign-db-http-detail" },
      });
      const list = await fetch(
        `${server.url}/api/campaigns?projectId=smoke-project&ownerAddress=smoke-owner-001&status=draft`,
        {
          headers: { "x-campaign-os-trace-id": "trace-campaign-db-http-list" },
        },
      );
      const detailPayload = await detail.json();
      const listPayload = await list.json();

      expect(create.status).toBe(200);
      expect(detail.status).toBe(200);
      expect(list.status).toBe(200);
      expect(create.headers.get("x-campaign-os-trace-id")).toBe("trace-campaign-db-http-create");
      expect(detail.headers.get("x-campaign-os-trace-id")).toBe("trace-campaign-db-http-detail");
      expect(list.headers.get("x-campaign-os-trace-id")).toBe("trace-campaign-db-http-list");
      expect(createPayload).toMatchObject({
        ok: true,
        data: {
          campaignDb: {
            createdViaRepository: true,
            draftId: "campaign-db-draft-0001",
            storeId: "campaign-db",
          },
          payload: {
            id: "campaign-db-draft-0001",
            projectId: "smoke-project",
            status: "draft",
          },
          persistence: {
            kind: "campaign_draft",
            recordId: expect.any(String),
          },
        },
        traceId: "trace-campaign-db-http-create",
      });
      expect(draftId).toBe("campaign-db-draft-0001");
      expect(detailPayload).toMatchObject({
        ok: true,
        data: {
          campaignDb: {
            createdViaRepository: true,
            storeId: "campaign-db",
          },
          payload: {
            item: {
              id: "campaign-db-draft-0001",
              status: "draft",
            },
          },
        },
      });
      expect(listPayload).toMatchObject({
        ok: true,
        data: {
          payload: {
            campaignDb: {
              draftCount: 1,
              storeId: "campaign-db",
            },
            items: expect.arrayContaining([
              expect.objectContaining({
                id: "campaign-db-draft-0001",
                status: "draft",
              }),
            ]),
            summary: {
              totalCampaigns: 1,
            },
          },
        },
      });
      expectSanitizedReadinessPayload(createPayload);
      expectSanitizedReadinessPayload(detailPayload);
      expectSanitizedReadinessPayload(listPayload);
    } finally {
      await server.stop();
    }
  });

  it("guards HTTP preflight and bad POST requests before local handlers", async () => {
    const server = await startCampaignOsApiServer({
      logger: false,
      maxBodyBytes: 16,
      port: 0,
    });

    try {
      const preflight = await fetch(`${server.url}/api/campaigns`, {
        headers: {
          "access-control-request-method": "POST",
          origin: "http://localhost:5173",
          "x-campaign-os-trace-id": "trace-smoke-preflight",
        },
        method: "OPTIONS",
      });
      const badPost = await fetch(`${server.url}/api/campaigns`, {
        body: "not-json",
        headers: {
          "content-type": "text/plain",
          "x-campaign-os-trace-id": "trace-smoke-bad-post",
        },
        method: "POST",
      });
      const badPostPayload = await badPost.json();

      expect(preflight.status).toBe(204);
      expect(preflight.headers.get("x-campaign-os-trace-id")).toBe("trace-smoke-preflight");
      expect(preflight.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
      expect(await preflight.text()).toBe("");

      expect(badPost.status).toBe(400);
      expect(badPost.headers.get("x-campaign-os-trace-id")).toBe("trace-smoke-bad-post");
      expect(badPostPayload).toMatchObject({
        ok: false,
        traceId: "trace-smoke-bad-post",
        error: {
          code: "INVALID_REQUEST",
          details: {
            field: "content-type",
          },
        },
      });
    } finally {
      await server.stop();
    }
  });

  it("keeps production-required readiness smoke payloads blocked and sanitized", async () => {
    vi.stubEnv("CAMPAIGN_OS_AUTH_SECRET", "bearer sample-bearer-token");
    vi.stubEnv("CAMPAIGN_OS_BACKEND_PROFILE", "production-required");
    vi.stubEnv("CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT", "https://writer.invalid/private-key-sample");
    vi.stubEnv("CAMPAIGN_OS_DATABASE_URL", "postgres://real-user:real-db-password@db.invalid/campaign-os");
    vi.stubEnv("CAMPAIGN_OS_PROVIDER_REGISTRY_URL", "https://providers.invalid/object-key-sample");
    vi.stubEnv("CAMPAIGN_OS_WORKER_QUEUE_URL", "https://queue.invalid/raw-signature-sample");

    const server = await startCampaignOsApiServer({ logger: false, port: 0 });

    try {
      const health = await fetch(`${server.url}/api/health`, {
        headers: {
          authorization: "Bearer sample-bearer-token",
          "x-campaign-os-trace-id": "trace-production-readiness-smoke",
        },
      });
      const contracts = await fetch(`${server.url}/api/contracts`, {
        headers: {
          authorization: "Bearer sample-bearer-token",
          "x-campaign-os-trace-id": "trace-production-contracts-smoke",
        },
      });
      const healthPayload = await health.json();
      const contractsPayload = await contracts.json();

      expect(health.status).toBe(200);
      expect(contracts.status).toBe(200);
      expect(healthPayload).toMatchObject({
        ok: true,
        data: {
          backendService: expect.objectContaining({
            authSession: expect.objectContaining({
              status: "blocked",
              valid: false,
              verificationMode: "production_required",
            }),
            databaseReadiness: expect.objectContaining({
              adapterStatus: "blocked",
              migrationPlanStatus: "blocked",
              valid: false,
            }),
            databaseAdapterRuntime: expect.objectContaining({
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
              profileId: "production-required",
              productionDbRuntime: expect.objectContaining({
                connectionState: "configured_redacted",
                diagnosticCodes: expect.arrayContaining([
                  "PRODUCTION_DB_DRIVER_DEFERRED",
                  "PRODUCTION_DB_SECRET_REDACTED",
                  "PRODUCTION_DB_MIGRATION_GATE_BLOCKED",
                ]),
                liveConnectionAttempted: false,
                liveQueryExecutionEnabled: false,
                migrationGateStatus: "blocked",
                status: "blocked",
                valid: false,
              }),
              status: "blocked",
              valid: false,
            }),
            persistenceRuntime: expect.objectContaining({
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
              status: "boundary_ready",
            }),
            profileId: "production-required",
            validation: expect.objectContaining({
              valid: false,
            }),
          }),
          serverRuntime: expect.objectContaining({
            profileId: "production-required",
            readiness: expect.objectContaining({
              backendRuntimeBootstrap: expect.objectContaining({
                diagnosticCodes: expect.arrayContaining([
                  "BACKEND_RUNTIME_BOOTSTRAP_PRODUCTION_BLOCKED",
                  "BACKEND_RUNTIME_BOOTSTRAP_SERVER_RUNTIME_INVALID",
                  "BACKEND_RUNTIME_BOOTSTRAP_BACKEND_READINESS_INVALID",
                ]),
                readiness: expect.objectContaining({
                  databaseAdapterRuntime: expect.objectContaining({
                    liveConnectionAttempted: false,
                    liveQueryExecutionEnabled: false,
                    status: "blocked",
                    valid: false,
                  }),
                  persistenceRuntime: expect.objectContaining({
                    liveConnectionAttempted: false,
                    liveExecutionEnabled: false,
                  }),
                }),
                status: "blocked",
                valid: false,
              }),
              backend: expect.objectContaining({
                valid: false,
              }),
              database: expect.objectContaining({
                adapterStatus: "blocked",
                migrationPlanStatus: "blocked",
                valid: false,
              }),
              databaseAdapterRuntime: expect.objectContaining({
                liveConnectionAttempted: false,
                liveQueryExecutionEnabled: false,
                migrationExecutor: expect.objectContaining({
                  liveExecutionCount: 0,
                  liveExecutionEnabled: false,
                  migrationGateStatus: "blocked",
                }),
                productionDbRuntime: expect.objectContaining({
                  liveConnectionAttempted: false,
                  liveQueryExecutionEnabled: false,
                  migrationGateStatus: "blocked",
                  status: "blocked",
                  valid: false,
                }),
                profileId: "production-required",
                status: "blocked",
                valid: false,
              }),
              persistenceRuntime: expect.objectContaining({
                activeDriverId: "campaign-os-production-db-adapter",
                liveConnectionAttempted: false,
                migrationGate: expect.objectContaining({
                  liveExecutionCount: 0,
                  liveExecutionEnabled: false,
                  mode: "live_blocked",
                  status: "blocked",
                }),
                profileId: "production-required",
                status: "boundary_ready",
              }),
            }),
            status: "blocked",
          }),
        },
      });
      expect(contractsPayload).toMatchObject({
        ok: true,
        data: {
          backendService: expect.objectContaining({
            authSession: expect.objectContaining({
              status: "blocked",
              validation: expect.objectContaining({
                valid: false,
              }),
            }),
            databaseReadiness: expect.objectContaining({
              adapter: expect.objectContaining({
                status: "blocked",
              }),
              migrationPlan: expect.objectContaining({
                status: "blocked",
              }),
              validation: expect.objectContaining({
                valid: false,
              }),
            }),
            databaseAdapterRuntime: expect.objectContaining({
              connectionPoolState: "configured_redacted",
              liveConnectionAttempted: false,
              liveQueryExecutionEnabled: false,
              migrationExecutor: expect.objectContaining({
                handoffStatus: "blocked",
                liveExecutionCount: 0,
                liveExecutionEnabled: false,
                migrationGateStatus: "blocked",
              }),
              profileId: "production-required",
              productionDbRuntime: expect.objectContaining({
                connection: expect.objectContaining({
                  safeLabel: "[redacted]",
                  state: "configured_redacted",
                }),
                diagnostics: expect.arrayContaining([
                  expect.objectContaining({
                    code: "PRODUCTION_DB_SECRET_REDACTED",
                    field: "CAMPAIGN_OS_DATABASE_URL",
                  }),
                  expect.objectContaining({
                    code: "PRODUCTION_DB_MIGRATION_GATE_BLOCKED",
                  }),
                ]),
                driver: expect.objectContaining({
                  productionReady: false,
                }),
                liveConnectionAttempted: false,
                liveQueryExecutionEnabled: false,
                migrationGate: expect.objectContaining({
                  liveExecutionEnabled: false,
                  status: "blocked",
                }),
                ownerStores: expect.arrayContaining(["campaign-db", "points-ledger"]),
                queryCapability: expect.objectContaining({
                  adHocRawSqlEnabled: false,
                  liveQueryExecutionEnabled: false,
                }),
                schemaManifestId: "campaign-os-production-db-schema-v0.2",
                status: "blocked",
                valid: false,
              }),
              status: "blocked",
              stores: expect.arrayContaining([
                expect.objectContaining({
                  id: "points-ledger",
                  adapterStatus: "blocked",
                  required: true,
                }),
              ]),
              valid: false,
            }),
            persistenceRuntime: expect.objectContaining({
              activeDriverId: "campaign-os-production-db-adapter",
              adapterKind: "production_deferred",
              connectionState: "configured_redacted",
              liveConnectionAttempted: false,
              migrationGate: expect.objectContaining({
                liveExecutionCount: 0,
                liveExecutionEnabled: false,
                mode: "live_blocked",
                status: "blocked",
              }),
              profileId: "production-required",
              status: "boundary_ready",
              valid: true,
            }),
          }),
          serverRuntime: expect.objectContaining({
            readiness: expect.objectContaining({
              backendRuntimeBootstrap: expect.objectContaining({
                deferredDependencyIds: expect.arrayContaining([
                  "production-database-driver",
                  "auth-middleware",
                  "contract-writer",
                  "reward-custody",
                  "reward-distribution",
                ]),
                diagnosticCodes: expect.arrayContaining([
                  "BACKEND_RUNTIME_BOOTSTRAP_PRODUCTION_BLOCKED",
                  "BACKEND_RUNTIME_BOOTSTRAP_SERVER_RUNTIME_INVALID",
                  "BACKEND_RUNTIME_BOOTSTRAP_BACKEND_READINESS_INVALID",
                ]),
                requestGuard: expect.objectContaining({
                  guardedFailureEnvelope: true,
                  traceHeaderName: "x-campaign-os-trace-id",
                }),
                shutdown: expect.objectContaining({
                  state: "running",
                }),
                startup: expect.objectContaining({
                  blockedAttachPointCount: expect.any(Number),
                  profileId: "production-required",
                  valid: false,
                }),
                status: "blocked",
                tracePolicy: expect.objectContaining({
                  failureEnvelopeTraceId: true,
                  successEnvelopeTraceId: true,
                  traceHeaderName: "x-campaign-os-trace-id",
                }),
                valid: false,
              }),
            }),
          }),
        },
      });
      expectSanitizedReadinessPayload(healthPayload.data.backendService);
      expectSanitizedReadinessPayload(contractsPayload.data.backendService);
      expectSanitizedReadinessPayload(healthPayload.data.serverRuntime);
      expectSanitizedReadinessPayload(contractsPayload.data.serverRuntime);
    } finally {
      await server.stop();
    }
  });
});
