import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { campaignDetail } from "../domain/fixtures";
import { createCampaignOsApiRuntime, type ApiRuntimeResponse } from "./apiRuntime";
import { createBackendServiceReadinessReport } from "./backendService";
import {
  createCampaignOsJsonRepository,
  createCampaignOsMemoryRepository,
  persistenceBoundary,
  type CampaignOsRepository,
} from "./persistence";
import { startCampaignOsApiServer } from "./server";

interface LocalServiceEnvelope<TPayload> {
  boundary: unknown;
  payload: TPayload;
}

interface CampaignListPayload {
  summary: {
    totalCampaigns: number;
  };
}

interface CampaignDetailPayload {
  item: {
    id: string;
  };
}

interface EligibilityPayload {
  eligible: boolean;
  walletAddress: string;
}

interface AnalyticsPayload {
  exportBatchId: string;
  readyRows: number;
  reviewRequiredRows: number;
}

interface WalletSessionPayload {
  sessionId: string;
  walletSource: string;
}

interface CampaignDraftPayload {
  id: string;
  publishReadiness: {
    ready: boolean;
  };
}

interface TaskDraftPayload {
  campaignId: string;
  id: string;
}

interface VerificationPayload {
  evidenceSource: string;
  pointsAwarded: number;
  status: string;
}

interface I18nDraftPayload {
  humanReviewRequired: boolean;
  sourceLocale: string;
  targetLocale: string;
}

interface ExportPreviewPayload {
  campaignId: string;
  contractRootMode: string;
  format: string;
  readyRows: number;
}

const forbiddenResponseKeys = [
  "privatekey",
  "mnemonic",
  "seedphrase",
  "password",
  "bearer",
  "token",
  "signature",
  "signedurl",
  "objectkey",
  "secret",
];

const collectKeys = (value: unknown, keys: string[] = []): string[] => {
  if (!value || typeof value !== "object") {
    return keys;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectKeys(item, keys);
    }

    return keys;
  }

  for (const [key, nested] of Object.entries(value)) {
    keys.push(key.toLowerCase());
    collectKeys(nested, keys);
  }

  return keys;
};

const expectNoForbiddenResponseKeys = (value: unknown) => {
  const keys = collectKeys(value);

  for (const forbiddenKey of forbiddenResponseKeys) {
    expect(keys).not.toContain(forbiddenKey);
  }
};

const expectSuccessData = <TPayload = unknown>(response: ApiRuntimeResponse<unknown>) => {
  expect(response.status).toBe(200);
  expect(response.body.ok).toBe(true);

  if (!response.body.ok) {
    throw new Error("Expected API runtime success envelope.");
  }

  expect(response.body.traceId).not.toHaveLength(0);
  expect(response.body.runtime).toMatchObject({
    mode: "local_seeded",
    name: "campaign-os-api-runtime",
  });
  expect(response.body.safety).toMatchObject({
    localOnly: true,
    noLiveApi: true,
    noMigrationRunner: true,
    noProductionDatabase: true,
    noWalletSignature: true,
    noContractWrite: true,
    noRewardDistribution: true,
  });
  expectNoForbiddenResponseKeys(response.body);

  return response.body.data as TPayload;
};

const createFailingRepository = (): CampaignOsRepository => ({
  health: async () => {
    throw new Error("repository unavailable");
  },
  initialize: async () => undefined,
  record: async () => {
    throw new Error("repository unavailable");
  },
  snapshot: async () => {
    throw new Error("repository unavailable");
  },
});

const createInitializationTrackingRepository = () => {
  const repository = createCampaignOsMemoryRepository();
  let initializeCount = 0;

  return {
    repository: {
      ...repository,
      initialize: async () => {
        initializeCount += 1;
        await repository.initialize();
      },
    } satisfies CampaignOsRepository,
    getInitializeCount: () => initializeCount,
  };
};

describe("Campaign OS API runtime", () => {
  const runtime = createCampaignOsApiRuntime();

  it("returns health, contract, and service metadata through uniform envelopes", async () => {
    const health = await runtime.handle({
      method: "GET",
      path: "/api/health",
      headers: { "x-campaign-os-trace-id": "trace-health" },
    });
    const contracts = await runtime.handle({ method: "GET", path: "/api/contracts" });
    const services = await runtime.handle({ method: "GET", path: "/api/services" });

    const healthData = expectSuccessData(health);
    const contractData = expectSuccessData(contracts);
    const serviceData = expectSuccessData(services);

    expect(health.body.traceId).toBe("trace-health");
    expect(health.headers["x-campaign-os-trace-id"]).toBe("trace-health");
    expect(healthData).toMatchObject({
      apiFoundation: expect.objectContaining({
        coverage: expect.objectContaining({
          implementedLocalCount: 10,
          notYetImplementedCount: 0,
          productionShapedDeferredCount: 4,
          routeCount: expect.any(Number),
          surfaceCount: 14,
          validationIssueCount: 0,
        }),
        envelopes: expect.objectContaining({
          error: expect.arrayContaining([
            expect.objectContaining({
              id: "api.response.error.v1",
              traceIdField: "traceId",
            }),
          ]),
          success: expect.arrayContaining([
            expect.objectContaining({
              id: "api.response.success.v1",
              routeIdField: "routeId",
              serviceIdField: "serviceId",
              supportModeField: "supportMode",
              traceIdField: "traceId",
            }),
          ]),
        }),
        routes: expect.arrayContaining([
          expect.objectContaining({
            errorEnvelopeId: "api.response.error.v1",
            responseEnvelopeId: "api.response.success.v1",
            routeId: "runtime.health",
            serviceId: "runtime-observability",
            supportMode: "local_seeded",
          }),
        ]),
        servicePorts: expect.objectContaining({
          coverage: expect.objectContaining({
            routeOwnershipCount: expect.any(Number),
            validationIssueCount: 0,
          }),
          validation: expect.objectContaining({
            valid: true,
          }),
        }),
        surfaces: expect.arrayContaining([
          expect.objectContaining({
            serviceId: "points-ranking-service",
            state: "production_shaped_deferred",
            surfaceId: "points-ranking",
          }),
          expect.objectContaining({
            routeIds: expect.arrayContaining(["runtime.health", "runtime.contracts"]),
            serviceId: "runtime-observability",
            state: "implemented_local",
            surfaceId: "runtime-observability",
          }),
        ]),
        validation: expect.objectContaining({
          issues: [],
          valid: true,
        }),
      }),
      backendService: expect.objectContaining({
        adapterStatus: "active",
        apiFoundationValidationIssueCount: 0,
        authSession: expect.objectContaining({
          profileId: "local-review",
          proofStatus: "local_seeded",
          protectedRouteCount: expect.any(Number),
          roleCount: 5,
          status: "local_seeded",
          valid: true,
          verificationMode: "local_only",
        }),
        backendRuntimeBootstrap: expect.objectContaining({
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
          tracePolicy: expect.objectContaining({
            failureEnvelopeTraceId: true,
            successEnvelopeTraceId: true,
            traceHeaderName: "x-campaign-os-trace-id",
          }),
          valid: true,
        }),
        entrypoint: expect.objectContaining({
          id: "campaign-os-backend-service",
          profileId: "local-review",
          runtimeName: "campaign-os-api-runtime",
          supportMode: "local_seeded",
        }),
        entrypointId: "campaign-os-backend-service",
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
            queryAdapter: expect.objectContaining({
              deterministicTestMode: true,
              liveQueryExecutionEnabled: false,
            }),
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
        databaseReadiness: expect.objectContaining({
          adapterStatus: "contract_ready",
          migrationPlanStatus: "dry_run_ready",
          requiredStoreCount: 6,
        }),
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
          diagnosticCodes: [],
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
          stores: expect.arrayContaining([
            expect.objectContaining({
              id: "campaign-db",
              required: true,
              runtimeState: "covered",
            }),
          ]),
          valid: true,
        }),
        profile: expect.objectContaining({
          id: "local-review",
          supportMode: "local_seeded",
        }),
        profileId: "local-review",
        traceId: "trace-health",
        validation: expect.objectContaining({
          issueCount: 0,
          valid: true,
        }),
      }),
      capabilities: expect.objectContaining({
        summary: expect.objectContaining({
          deferredCount: expect.any(Number),
          disabledCount: expect.any(Number),
          totalCapabilities: expect.any(Number),
        }),
      }),
      mode: "local_seeded",
      persistence: expect.objectContaining({
        mode: "memory",
        noProductionDatabase: true,
        recordCount: expect.any(Number),
        status: "ok",
      }),
      routeCount: expect.any(Number),
      serviceGroups: expect.arrayContaining([
        expect.objectContaining({
          id: "wallet_session",
          deferredDependencies: expect.arrayContaining(["auth_session", "production_database"]),
        }),
      ]),
      serviceReadiness: expect.objectContaining({
        totalServices: expect.any(Number),
      }),
      status: "ok",
      topology: expect.objectContaining({
        coverage: expect.objectContaining({
          invalidReferenceCount: 0,
          serviceCount: 13,
          unassignedRouteIds: [],
        }),
        profileReadiness: expect.objectContaining({
          "local-review": expect.objectContaining({
            externalNetworkAllowed: false,
            secretRequired: false,
          }),
        }),
        validation: expect.objectContaining({
          valid: true,
        }),
      }),
    });
    expect(contractData).toMatchObject({
      apiFoundation: expect.objectContaining({
        coverage: expect.objectContaining({
          routeCount: expect.any(Number),
          surfaceCount: 14,
          validationIssueCount: 0,
        }),
        requestContracts: expect.arrayContaining([
          expect.objectContaining({
            id: "wallet.session.create.request",
            routeId: "wallet.session.create",
          }),
        ]),
        routes: expect.arrayContaining([
          expect.objectContaining({
            operationId: "createWalletSession",
            routeId: "wallet.session.create",
            serviceId: "wallet-session-service",
            supportMode: "local_seeded",
          }),
        ]),
        servicePorts: expect.objectContaining({
          ports: expect.arrayContaining([
            expect.objectContaining({
              id: "wallet-session-port",
              productionAdapterStatus: "local_seeded",
              requiresExternalNetwork: false,
              requiresSecret: false,
              serviceId: "wallet-session-service",
            }),
          ]),
          validation: expect.objectContaining({
            valid: true,
          }),
        }),
        validation: expect.objectContaining({
          issues: [],
          valid: true,
        }),
      }),
      backendService: expect.objectContaining({
        attachMapAreas: expect.arrayContaining([
          expect.objectContaining({
            area: "production-persistence",
            currentStatus: "blocked",
            requiredBeforeProduction: true,
          }),
          expect.objectContaining({
            area: "auth-session",
            currentStatus: "scaffold",
            requiredBeforeProduction: true,
          }),
          expect.objectContaining({
            area: "contract-writer",
            currentStatus: "blocked",
            requiredBeforeProduction: true,
          }),
        ]),
        configContract: expect.objectContaining({
          persistenceMode: "memory",
          profileId: "local-review",
          valid: true,
        }),
        authSession: expect.objectContaining({
          agentCredentialBoundary: {
            agentSkillCanSubstituteUserWallet: false,
            separatedFromUserWalletSession: true,
          },
          profileId: "local-review",
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
          rolePolicy: expect.objectContaining({
            leastPrivilegeDefault: true,
            roleCount: 5,
          }),
          sessionContract: expect.objectContaining({
            agentCredentialSeparated: true,
            walletSources: expect.arrayContaining(["PORTKEY_AA", "NIGHTELF", "AGENT_SKILL", "OTHER"]),
          }),
          status: "local_seeded",
          validation: expect.objectContaining({
            issueCount: 0,
            valid: true,
          }),
        }),
        backendRuntimeBootstrap: expect.objectContaining({
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
          tracePolicy: expect.objectContaining({
            failureEnvelopeTraceId: true,
            successEnvelopeTraceId: true,
            traceHeaderName: "x-campaign-os-trace-id",
          }),
          valid: true,
        }),
        deferredProductionCapabilities: expect.arrayContaining([
          "auth_session",
          "production_database",
          "worker_queue",
          "contract_writer",
          "reward_distribution",
        ]),
        entrypoint: expect.objectContaining({
          id: "campaign-os-backend-service",
          supportMode: "local_seeded",
        }),
        migrationManifest: expect.objectContaining({
          noLiveMigrationCommand: true,
          noMigrationRunner: false,
          runnerStatus: "disabled_local_review",
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
        }),
        persistenceAdapterPort: expect.objectContaining({
          activeAdapter: expect.objectContaining({
            id: "campaign-os-memory-adapter",
            kind: "memory",
            status: "active",
          }),
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
          valid: true,
        }),
        reportShape: expect.objectContaining({
          sections: expect.arrayContaining([
            "entrypoint",
            "config",
            "attachMap",
            "authSession",
            "backendRuntimeBootstrap",
            "databaseReadiness",
            "persistenceRuntime",
            "validation",
          ]),
          valid: true,
        }),
      }),
      capabilities: expect.objectContaining({
        summary: expect.objectContaining({
          deferredCount: expect.any(Number),
          disabledCount: expect.any(Number),
        }),
      }),
      coverage: expect.objectContaining({
        coveredSkillIds: expect.arrayContaining(["create_wallet_session", "export_winners"]),
      }),
      persistence: expect.objectContaining({
        boundary: persistenceBoundary,
        health: expect.objectContaining({
          localOnly: true,
          noMigrationRunner: true,
          noProductionDatabase: true,
        }),
      }),
      routes: expect.arrayContaining([
        expect.objectContaining({ id: "runtime.health", path: "/api/health", serviceGroup: "runtime" }),
      ]),
      serviceGroups: expect.arrayContaining([
        expect.objectContaining({ id: "export", deferredDependencies: expect.arrayContaining(["contract_writer"]) }),
      ]),
      topology: expect.objectContaining({
        deploymentUnits: expect.arrayContaining([
          expect.objectContaining({ id: "api-runtime", productionTarget: "api_service" }),
        ]),
        services: expect.arrayContaining([
          expect.objectContaining({
            id: "campaign-service",
            routeIds: expect.arrayContaining(["campaigns.list", "campaigns.create", "campaigns.detail"]),
          }),
        ]),
      }),
    });
    expect(serviceData).toMatchObject({
      summary: expect.objectContaining({
        totalServices: expect.any(Number),
      }),
    });
  });

  it("keeps backend readiness validation off representative business routes", async () => {
    let readinessCallCount = 0;
    const runtimeWithoutHotPathReadiness = createCampaignOsApiRuntime({
      backendServiceReadiness: () => {
        readinessCallCount += 1;
        throw new Error("backend readiness should only run on runtime metadata routes");
      },
    });

    const detail = await runtimeWithoutHotPathReadiness.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}`,
    });
    const eligibility = await runtimeWithoutHotPathReadiness.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/eligibility?address=${encodeURIComponent("2F4...9aB")}`,
    });
    const exportPreview = await runtimeWithoutHotPathReadiness.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/export`,
      body: JSON.stringify({
        contractRootMode: "none",
        format: "json",
      }),
    });

    expect(expectSuccessData<LocalServiceEnvelope<CampaignDetailPayload>>(detail).payload.item.id).toBe(
      campaignDetail.id,
    );
    expect(expectSuccessData<LocalServiceEnvelope<EligibilityPayload>>(eligibility).payload).toMatchObject({
      eligible: true,
      walletAddress: "2F4...9aB",
    });
    expect(expectSuccessData<LocalServiceEnvelope<ExportPreviewPayload>>(exportPreview).payload).toMatchObject({
      campaignId: campaignDetail.id,
      contractRootMode: "none",
      format: "json",
    });
    expect(readinessCallCount).toBe(0);
  });

  it("uses one backend readiness report per runtime metadata response", async () => {
    let readinessCallCount = 0;
    const readiness = createBackendServiceReadinessReport();
    const runtimeWithReadinessSpy = createCampaignOsApiRuntime({
      backendServiceReadiness: () => {
        readinessCallCount += 1;

        return readiness;
      },
    });

    await runtimeWithReadinessSpy.handle({
      method: "GET",
      path: "/api/health",
    });
    await runtimeWithReadinessSpy.handle({
      method: "GET",
      path: "/api/contracts",
    });
    await runtimeWithReadinessSpy.handle({
      method: "GET",
      path: "/api/health",
    });
    await runtimeWithReadinessSpy.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}`,
    });

    expect(readinessCallCount).toBe(3);
  });

  it("propagates caller trace ids and generates success trace ids", async () => {
    const traced = await runtime.handle({
      method: "GET",
      path: "/api/health",
      headers: { "x-campaign-os-trace-id": "trace-success-caller" },
    });
    const generated = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}`,
    });

    expect(traced.status).toBe(200);
    expect(traced.headers["x-campaign-os-trace-id"]).toBe("trace-success-caller");
    expect(traced.body.traceId).toBe("trace-success-caller");
    expect(expectSuccessData(traced)).toMatchObject({
      backendService: expect.objectContaining({
        backendRuntimeBootstrap: expect.objectContaining({
          tracePolicy: expect.objectContaining({
            traceHeaderName: "x-campaign-os-trace-id",
          }),
        }),
      }),
    });
    expect(generated.status).toBe(200);
    expect(generated.body.traceId).toMatch(/^campaign-os-trace-/);
    expect(generated.headers["x-campaign-os-trace-id"]).toBe(generated.body.traceId);
  });

  it("does not mark unsupported backend config as production ready in health metadata", async () => {
    const invalidBackendRuntime = createCampaignOsApiRuntime({
      runtimeConfigOptions: {
        env: {
          CAMPAIGN_OS_BACKEND_PROFILE: "production-live",
          CAMPAIGN_OS_ENABLE_CONTRACT_WRITER: "true",
          CAMPAIGN_OS_PERSISTENCE_MODE: "memory",
        },
      },
    });
    const health = await invalidBackendRuntime.handle({
      method: "GET",
      path: "/api/health",
      headers: { "x-campaign-os-trace-id": "trace-invalid-backend-profile" },
    });
    const healthData = expectSuccessData(health);

    expect(healthData).toMatchObject({
      backendService: expect.objectContaining({
        profile: expect.objectContaining({
          id: "production-required",
          status: "blocked",
        }),
        profileId: "production-required",
        validation: expect.objectContaining({
          valid: false,
        }),
      }),
    });
    expectNoForbiddenResponseKeys(health.body);
  });

  it("surfaces production-required database readiness as blocked without exposing secrets", async () => {
    const productionRuntime = createCampaignOsApiRuntime({
      runtimeConfigOptions: {
        env: {
          CAMPAIGN_OS_AUTH_SECRET: "runtime-auth-secret",
          CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
          CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT: "https://writer.invalid",
          CAMPAIGN_OS_DATABASE_URL: "postgres://db.invalid/campaign-os",
          CAMPAIGN_OS_PROVIDER_REGISTRY_URL: "https://providers.invalid",
          CAMPAIGN_OS_WORKER_QUEUE_URL: "https://queue.invalid",
        },
      },
    });
    const health = await productionRuntime.handle({
      method: "GET",
      path: "/api/health",
    });
    const contracts = await productionRuntime.handle({
      method: "GET",
      path: "/api/contracts",
    });

    expect(expectSuccessData(health)).toMatchObject({
      backendService: expect.objectContaining({
        authSession: expect.objectContaining({
          status: "blocked",
          valid: false,
          verificationMode: "production_required",
        }),
        backendRuntimeBootstrap: expect.objectContaining({
          diagnosticCodes: expect.arrayContaining([
            "BACKEND_RUNTIME_BOOTSTRAP_PRODUCTION_BLOCKED",
            "BACKEND_RUNTIME_BOOTSTRAP_SERVER_RUNTIME_INVALID",
            "BACKEND_RUNTIME_BOOTSTRAP_BACKEND_READINESS_INVALID",
          ]),
          profileId: "production-required",
          status: "blocked",
          valid: false,
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
            status: "blocked",
            valid: false,
          }),
          profileId: "production-required",
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
        validation: expect.objectContaining({
          valid: false,
        }),
      }),
    });
    expect(expectSuccessData(contracts)).toMatchObject({
      backendService: expect.objectContaining({
        authSession: expect.objectContaining({
          status: "blocked",
          validation: expect.objectContaining({
            valid: false,
          }),
        }),
        backendRuntimeBootstrap: expect.objectContaining({
          diagnosticCodes: expect.arrayContaining([
            "BACKEND_RUNTIME_BOOTSTRAP_PRODUCTION_BLOCKED",
            "BACKEND_RUNTIME_BOOTSTRAP_SERVER_RUNTIME_INVALID",
            "BACKEND_RUNTIME_BOOTSTRAP_BACKEND_READINESS_INVALID",
          ]),
          profileId: "production-required",
          status: "blocked",
          valid: false,
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
              driverId: "campaign-os-production-driver-deferred",
              productionReady: false,
            }),
            id: "campaign-os-production-db-runtime-v1",
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
              parameterizedQueries: true,
              transactions: true,
            }),
            schemaManifestId: "campaign-os-production-db-schema-v0.2",
            status: "blocked",
            valid: false,
          }),
          profileId: "production-required",
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
    });
    expect(JSON.stringify(health.body)).not.toContain("runtime-auth-secret");
    expect(JSON.stringify(contracts.body)).not.toContain("postgres://db.invalid/campaign-os");
    expectNoForbiddenResponseKeys(health.body);
    expectNoForbiddenResponseKeys(contracts.body);
  });

  it("calls seeded campaign read endpoints through the local service facade", async () => {
    const list = await runtime.handle({
      method: "GET",
      path: `/api/campaigns?walletAddress=${encodeURIComponent("3E9...7cD")}`,
    });
    const detail = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}?walletAddress=${encodeURIComponent("3E9...7cD")}`,
    });
    const eligibility = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/eligibility?address=${encodeURIComponent("2F4...9aB")}`,
    });
    const analytics = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/analytics`,
    });

    expect(expectSuccessData<LocalServiceEnvelope<CampaignListPayload>>(list).payload.summary.totalCampaigns).toBe(3);
    expect(expectSuccessData<LocalServiceEnvelope<CampaignDetailPayload>>(detail).payload.item.id).toBe(campaignDetail.id);
    expect(expectSuccessData<LocalServiceEnvelope<EligibilityPayload>>(eligibility).payload).toMatchObject({
      eligible: true,
      walletAddress: "2F4...9aB",
    });
    expect(expectSuccessData<LocalServiceEnvelope<AnalyticsPayload>>(analytics).payload).toMatchObject({
      exportBatchId: "export-awaken-sprint-preview",
      readyRows: expect.any(Number),
      reviewRequiredRows: expect.any(Number),
    });
  });

  it("calls seeded POST endpoints with sanitized local persistence records", async () => {
    const repository = createCampaignOsMemoryRepository();
    const runtimeWithPersistence = createCampaignOsApiRuntime({ repository });
    const walletSession = await runtime.handle({
      method: "POST",
      path: "/api/wallet/session",
      body: JSON.stringify({
        adapterName: "PortkeyDiscoverWallet",
        fixtureId: "sess-eoa-app-001",
      }),
    });
    const persistedWalletSession = await runtimeWithPersistence.handle({
      method: "POST",
      path: "/api/wallet/session",
      body: JSON.stringify({
        adapterName: "PortkeyDiscoverWallet",
        fixtureId: "sess-eoa-app-001",
        signature: "should-not-persist",
      }),
    });
    const campaignDraft = await runtimeWithPersistence.handle({
      method: "POST",
      path: "/api/campaigns",
      body: JSON.stringify({
        duration: "2026-07-01/2026-07-14",
        endTime: "2026-07-14T23:59:59Z",
        goal: "Activate Awaken traders",
        ownerAddress: "2F4...9aB",
        projectId: "awaken",
        rewardDescription: "Rewards remain project owned.",
        signaturePayload: "should-not-persist",
        startTime: "2026-07-01T00:00:00Z",
      }),
    });
    const taskDraft = await runtimeWithPersistence.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/tasks`,
      body: JSON.stringify({
        evidenceRule: { source: "AELFSCAN", minAmount: 1 },
        points: 120,
        required: true,
        templateCode: "bridge_ebridge",
        verificationType: "ON_CHAIN",
        walletCompatibility: "ANY",
      }),
    });
    const verification = await runtimeWithPersistence.handle({
      method: "POST",
      path: "/api/tasks/task-bridge/verify",
      body: JSON.stringify({
        accountType: "AA",
        campaignId: campaignDetail.id,
        walletAddress: "2F4...9aB",
        walletSource: "PORTKEY_AA",
      }),
    });
    const i18nDraft = await runtimeWithPersistence.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/i18n/generate`,
      body: JSON.stringify({
        contentKeys: ["title", "description"],
        sourceLocale: "en-US",
        targetLocale: "zh-CN",
      }),
    });
    const exportPreview = await runtimeWithPersistence.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/export`,
      body: JSON.stringify({
        contractRootMode: "none",
        format: "json",
        includeLocalePreference: true,
        includeRiskFlags: true,
        includeWalletType: true,
      }),
    });
    const health = await runtimeWithPersistence.handle({
      method: "GET",
      path: "/api/health",
    });
    const snapshot = await repository.snapshot();

    expect(expectSuccessData<LocalServiceEnvelope<WalletSessionPayload>>(walletSession).payload).toMatchObject({
      sessionId: "sess-eoa-app-001",
      walletSource: "PORTKEY_EOA_APP",
    });
    expect(expectSuccessData<LocalServiceEnvelope<WalletSessionPayload> & { persistence: unknown }>(
      persistedWalletSession,
    )).toMatchObject({
      payload: {
        sessionId: "sess-eoa-app-001",
        walletSource: "PORTKEY_EOA_APP",
      },
      persistence: {
        kind: "wallet_session",
        recordId: expect.any(String),
      },
    });
    expect(expectSuccessData<LocalServiceEnvelope<CampaignDraftPayload>>(campaignDraft).payload).toMatchObject({
      id: "local-awaken-campaign",
      publishReadiness: { ready: true },
    });
    expect(expectSuccessData<LocalServiceEnvelope<TaskDraftPayload>>(taskDraft).payload).toMatchObject({
      campaignId: campaignDetail.id,
      id: "local-task-bridge_ebridge",
    });
    expect(expectSuccessData<LocalServiceEnvelope<VerificationPayload>>(verification).payload).toMatchObject({
      evidenceSource: "aelfscan",
      pointsAwarded: 120,
      status: "completed",
    });
    expect(expectSuccessData<LocalServiceEnvelope<I18nDraftPayload>>(i18nDraft).payload).toMatchObject({
      humanReviewRequired: true,
      sourceLocale: "en-US",
      targetLocale: "zh-CN",
    });
    expect(expectSuccessData<LocalServiceEnvelope<ExportPreviewPayload>>(exportPreview).payload).toMatchObject({
      campaignId: campaignDetail.id,
      contractRootMode: "none",
      format: "json",
      readyRows: expect.any(Number),
    });
    expect(expectSuccessData(health)).toMatchObject({
      persistence: expect.objectContaining({
        recordCount: 6,
        countsByKind: expect.objectContaining({
          campaign_draft: 1,
          export_preview: 1,
          i18n_draft: 1,
          task_draft: 1,
          verification_attempt: 1,
          wallet_session: 1,
        }),
      }),
    });
    expect(snapshot.recordCount).toBe(6);
    expect(snapshot.latestRecords.map((record) => record.kind)).toEqual(
      expect.arrayContaining([
        "wallet_session",
        "campaign_draft",
        "task_draft",
        "verification_attempt",
        "i18n_draft",
        "export_preview",
      ]),
    );
    expectNoForbiddenResponseKeys(snapshot);
  });

  it("persists write route records across local JSON runtime recreation", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "campaign-os-runtime-json-"));

    try {
      const config = {
        adapterLabel: "local_json:runtime-test",
        localDataDir: tempDir,
        mode: "local_json" as const,
      };
      const firstRepository = createCampaignOsJsonRepository(config);
      const firstRuntime = createCampaignOsApiRuntime({ repository: firstRepository });

      await firstRuntime.handle({
        method: "POST",
        path: "/api/wallet/session",
        body: JSON.stringify({
          adapterName: "PortkeyDiscoverWallet",
          fixtureId: "sess-eoa-app-001",
        }),
      });

      const secondRepository = createCampaignOsJsonRepository(config);
      await secondRepository.initialize();
      const snapshot = await secondRepository.snapshot();

      expect(snapshot).toMatchObject({
        mode: "local_json",
        recordCount: 1,
        countsByKind: {
          wallet_session: 1,
        },
      });
      expect(snapshot.latestRecords[0]).toMatchObject({
        kind: "wallet_session",
        walletAddress: "8A2...1eF",
        walletSource: "PORTKEY_EOA_APP",
      });
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
  });

  it("initializes the repository once before runtime health and write operations", async () => {
    const tracked = createInitializationTrackingRepository();
    const runtimeWithTrackedRepository = createCampaignOsApiRuntime({
      repository: tracked.repository,
    });

    await runtimeWithTrackedRepository.handle({
      method: "GET",
      path: "/api/health",
    });
    await runtimeWithTrackedRepository.handle({
      method: "POST",
      path: "/api/wallet/session",
      body: JSON.stringify({
        adapterName: "PortkeyDiscoverWallet",
        fixtureId: "sess-eoa-app-001",
      }),
    });

    expect(tracked.getInitializeCount()).toBe(1);
  });

  it("fails closed when persistence is unavailable for health or write routes", async () => {
    const failingRuntime = createCampaignOsApiRuntime({
      repository: createFailingRepository(),
    });
    const health = await failingRuntime.handle({
      method: "GET",
      path: "/api/health",
      headers: { "x-campaign-os-trace-id": "trace-persistence-health" },
    });
    const walletSession = await failingRuntime.handle({
      method: "POST",
      path: "/api/wallet/session",
      headers: { "x-campaign-os-trace-id": "trace-persistence-write" },
      body: JSON.stringify({
        adapterName: "PortkeyDiscoverWallet",
        fixtureId: "sess-eoa-app-001",
      }),
    });

    expect(health).toMatchObject({
      status: 503,
      body: {
        ok: false,
        traceId: "trace-persistence-health",
        error: {
          code: "PERSISTENCE_UNAVAILABLE",
          details: {
            operation: "health",
          },
        },
      },
    });
    expect(walletSession).toMatchObject({
      status: 503,
      body: {
        ok: false,
        traceId: "trace-persistence-write",
        error: {
          code: "PERSISTENCE_UNAVAILABLE",
          details: {
            operation: "record",
          },
        },
      },
    });
    expectNoForbiddenResponseKeys(health.body);
    expectNoForbiddenResponseKeys(walletSession.body);
  });

  it("fails closed for invalid runtime configuration", async () => {
    const invalidRuntime = createCampaignOsApiRuntime({
      runtimeConfigOptions: {
        persistence: {
          mode: "unsupported" as never,
        },
      },
    });
    const health = await invalidRuntime.handle({
      method: "GET",
      path: "/api/health",
      headers: { "x-campaign-os-trace-id": "trace-invalid-config" },
    });

    expect(health).toMatchObject({
      status: 400,
      body: {
        ok: false,
        traceId: "trace-invalid-config",
        error: {
          code: "INVALID_REQUEST",
          details: {
            field: "runtimeConfig.persistence.mode",
          },
        },
      },
    });
    expectNoForbiddenResponseKeys(health.body);
  });

  it("fails closed for invalid routes, methods, JSON, locales, and export modes", async () => {
    const unknown = await runtime.handle({ method: "GET", path: "/api/missing" });
    const wrongMethod = await runtime.handle({ method: "DELETE", path: "/api/health" });
    const malformed = await runtime.handle({
      method: "POST",
      path: "/api/campaigns",
      body: "{",
    });
    const unsupportedLocale = await runtime.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/i18n/generate`,
      body: JSON.stringify({
        contentKeys: ["title"],
        sourceLocale: "en-US",
        targetLocale: "fr-FR",
      }),
    });
    const unsupportedExport = await runtime.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/export`,
      body: JSON.stringify({
        contractRootMode: "winners_root",
        format: "json",
        includeLocalePreference: true,
        includeRiskFlags: true,
        includeWalletType: true,
      }),
    });
    const missingCampaign = await runtime.handle({
      method: "GET",
      path: "/api/campaigns/missing-campaign",
    });
    const missingTask = await runtime.handle({
      method: "POST",
      path: "/api/tasks/missing-task/verify",
      body: JSON.stringify({
        accountType: "AA",
        campaignId: campaignDetail.id,
        walletAddress: "2F4...9aB",
        walletSource: "PORTKEY_AA",
      }),
    });
    const invalidCreate = await runtime.handle({
      method: "POST",
      path: "/api/campaigns",
      body: JSON.stringify({
        projectId: "awaken",
      }),
    });
    const validationRepository = createCampaignOsMemoryRepository();
    const validationRuntime = createCampaignOsApiRuntime({ repository: validationRepository });
    const invalidWalletSource = await runtime.handle({
      method: "POST",
      path: "/api/tasks/task-bridge/verify",
      body: JSON.stringify({
        accountType: "AA",
        campaignId: campaignDetail.id,
        walletAddress: "2F4...9aB",
        walletSource: "RAW_PRIVATE_KEY",
      }),
    });
    const invalidPersistedWalletSource = await validationRuntime.handle({
      method: "POST",
      path: "/api/tasks/task-bridge/verify",
      body: JSON.stringify({
        accountType: "AA",
        campaignId: campaignDetail.id,
        walletAddress: "2F4...9aB",
        walletSource: "RAW_PRIVATE_KEY",
      }),
    });

    expect(unknown).toMatchObject({
      status: 404,
      body: {
        ok: false,
        error: { code: "ROUTE_NOT_FOUND" },
      },
    });
    expect(wrongMethod).toMatchObject({
      status: 405,
      body: {
        ok: false,
        error: { code: "METHOD_NOT_ALLOWED" },
      },
    });
    expect(malformed).toMatchObject({
      status: 400,
      body: {
        ok: false,
        error: { code: "MALFORMED_JSON" },
      },
    });
    expect(unsupportedLocale).toMatchObject({
      status: 400,
      body: {
        ok: false,
        error: { code: "UNSUPPORTED_LOCALE" },
      },
    });
    expect(unsupportedExport).toMatchObject({
      status: 400,
      body: {
        ok: false,
        error: { code: "UNSUPPORTED_EXPORT_MODE" },
      },
    });
    expect(missingCampaign).toMatchObject({
      status: 404,
      body: {
        ok: false,
        error: { code: "INVALID_CAMPAIGN" },
      },
    });
    expect(missingTask).toMatchObject({
      status: 404,
      body: {
        ok: false,
        error: { code: "INVALID_TASK" },
      },
    });
    expect(invalidCreate).toMatchObject({
      status: 400,
      body: {
        ok: false,
        error: { code: "INVALID_REQUEST" },
      },
    });
    expect(invalidWalletSource).toMatchObject({
      status: 400,
      body: {
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          details: {
            field: "walletSource",
          },
        },
      },
    });
    expect(invalidPersistedWalletSource).toMatchObject({
      status: 400,
      body: {
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          details: {
            field: "walletSource",
          },
        },
      },
    });
    expect(await validationRepository.snapshot()).toMatchObject({
      recordCount: 0,
    });

    for (const response of [
      unknown,
      wrongMethod,
      malformed,
      unsupportedLocale,
      unsupportedExport,
      missingCampaign,
      missingTask,
      invalidCreate,
      invalidWalletSource,
      invalidPersistedWalletSource,
    ]) {
      expectNoForbiddenResponseKeys(response.body);
      expect(response.body.traceId).not.toHaveLength(0);
      expect(response.headers["content-type"]).toBe("application/json; charset=utf-8");
      expect(response.body.runtime.mode).toBe("local_seeded");
      expect(response.body.safety).toMatchObject({
        noLiveApi: true,
        noProductionDatabase: true,
        noWalletSignature: true,
      });
    }
  });

  it("serves JSON over the Node HTTP adapter with a clean stop hook", async () => {
    const server = await startCampaignOsApiServer({ logger: false, port: 0 });

    try {
      const response = await fetch(`${server.url}/api/health`, {
        headers: { "x-campaign-os-trace-id": "trace-http-smoke" },
      });
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(response.headers.get("x-campaign-os-trace-id")).toBe("trace-http-smoke");
      expect(payload).toMatchObject({
        ok: true,
        traceId: "trace-http-smoke",
        data: {
          status: "ok",
        },
      });
    } finally {
      await server.stop();
    }
  });
});
