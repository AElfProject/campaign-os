import { describe, expect, it, vi } from "vitest";
import {
  createBackendRuntimeReadinessApiLoadingState,
  loadBackendRuntimeReadinessApiBridgeState,
  sanitizeBackendRuntimeReadinessApiText,
  seededBackendRuntimeReadinessSummary,
  type BackendRuntimeReadinessApiFetch,
} from "./backendRuntimeReadinessApiBridge";
import { contractWriterRequiredConfigKeys } from "../domain/contractWriterRuntime";

const runtime = {
  mode: "local_seeded",
  name: "campaign-os-api-runtime",
  routeCount: 26,
  version: "0.2.0-local",
};

const readinessSummary = {
  deployHandoff: {
    contractsEndpoint: "/api/contracts",
    healthEndpoint: "/api/health",
    runtimeTarget: "api_service",
    shutdownTimeoutMs: 5000,
    smokeCommand: "npm run server:smoke",
    startCommand: "npm run server:start",
    traceHeaderName: "x-campaign-os-trace-id",
  },
  diagnostics: [
    {
      code: "PRODUCTION_BACKEND_NO_LIVE_SIDE_EFFECTS",
      message: "Review-only metadata.",
      severity: "info",
    },
  ],
  generatedAt: "2026-07-09T18:53:49.000Z",
  id: "production-backend-runtime-readiness",
  noLiveSideEffects: {
    analyticsWarehouseWriteExecuted: false,
    authProviderConnected: false,
    contractWriteExecuted: false,
    objectStorageWriteExecuted: false,
    productionDatabaseConnected: false,
    providerNetworkExecuted: false,
    queueWorkerExecuted: false,
    rewardCustodyExecuted: false,
    rewardDistributionExecuted: false,
    schedulerExecuted: false,
    walletSdkExecuted: false,
  },
  productionDependencyBlockers: [
    {
      area: "database",
      attachPoint: "src/server/productionDatabase.ts",
      blockedBy: ["production DB adapter"],
      id: "live-database-driver",
      requiredBeforeProduction: true,
      status: "blocked",
    },
  ],
  productionReady: false,
  profile: {
    configuredRequiredConfigKeys: [],
    externalNetworkAllowed: false,
    id: "local-review",
    label: "Local review backend scaffold",
    missingRequiredConfigKeys: [],
    requiredConfigKeys: [],
    requiresSecrets: false,
    secretValuesExposed: false,
    status: "ready",
    supportMode: "local_seeded",
  },
  routeCoverage: {
    blockedCount: 0,
    coveredApiSkillCount: 18,
    localOnlyCount: 9,
    missingApiSkillIds: [],
    readyCount: 5,
    requiredApiSkillCount: 18,
    reviewRequiredCount: 12,
    routeCount: 26,
    routeIds: ["runtime.health", "runtime.contracts", "campaigns.list"],
    runtimeRouteCount: 2,
  },
  status: "ready",
  tracePolicy: {
    failureEnvelopeTraceId: true,
    startupLogIncludesTracePolicy: true,
    successEnvelopeTraceId: true,
    traceHeaderName: "x-campaign-os-trace-id",
  },
};

const releaseScopeActivation = {
  deploymentHandoff: {
    futureProduction: ["reward-custody", "reward-distribution"],
    requiredBeforeMvpRelease: [],
  },
  futureProductionBlockerIds: ["reward-custody", "reward-distribution"],
  mvpReleaseBlockerIds: [],
  mvpReleaseReady: true,
  productionDependencyBlockers: [
    {
      area: "database",
      attachPoint: "src/server/productionDatabase.ts",
      blockedBy: ["production DB adapter"],
      futureProductionOnly: false,
      id: "live-database-driver",
      mvpReleaseRequired: false,
      releaseScope: "production_required",
      requiredBeforeProduction: true,
      status: "blocked",
    },
    {
      area: "reward",
      attachPoint: "src/server/servicePorts.ts",
      blockedBy: ["reward custody mission", "finance/security review"],
      futureProductionOnly: true,
      id: "reward-custody",
      mvpReleaseRequired: false,
      releaseScope: "excluded_from_mvp",
      requiredBeforeProduction: true,
      status: "blocked",
    },
    {
      area: "reward",
      attachPoint: "src/server/servicePorts.ts",
      blockedBy: ["reward distribution mission", ...contractWriterRequiredConfigKeys],
      futureProductionOnly: true,
      id: "reward-distribution",
      mvpReleaseRequired: false,
      releaseScope: "excluded_from_mvp",
      requiredBeforeProduction: true,
      status: "blocked",
    },
  ],
};

const databasePackageBinding = {
  bindingId: "campaign-os-postgresql-package-binding-local",
  blockerCount: 0,
  diagnosticCodes: [],
  liveConnectionAttempted: false,
  liveContractWritesEnabled: false,
  liveMigrationExecutionEnabled: false,
  liveProductionMutationEnabled: false,
  liveProviderCallsEnabled: false,
  liveQueryExecutionEnabled: false,
  liveRewardCustodyEnabled: false,
  liveRewardDistributionEnabled: false,
  liveStorageWritesEnabled: false,
  liveTransactionExecutionEnabled: false,
  noLiveFlags: {
    browserBundleAllowed: false,
    dbClientConstructed: false,
    liveConnectionAttempted: false,
    liveContractWritesEnabled: false,
    liveMigrationExecutionEnabled: false,
    liveProductionMutationEnabled: false,
    liveProviderCallsEnabled: false,
    liveQueryExecutionEnabled: false,
    liveRewardCustodyEnabled: false,
    liveRewardDistributionEnabled: false,
    liveStorageWritesEnabled: false,
    liveTransactionExecutionEnabled: false,
    secretValueExposed: false,
  },
  packageName: "pg",
  packageRef: "npm:pg",
  productionReady: false,
  requiredConfigKeys: [
    "CAMPAIGN_OS_DATABASE_PACKAGE",
    "CAMPAIGN_OS_DATABASE_PACKAGE_BINDING",
    "CAMPAIGN_OS_DATABASE_PROVIDER",
    "CAMPAIGN_OS_DATABASE_URL",
    "CAMPAIGN_OS_DATABASE_SECRET_REF",
    "CAMPAIGN_OS_DATABASE_POOL_POLICY",
    "CAMPAIGN_OS_DATABASE_MIGRATION_APPROVAL",
    "CAMPAIGN_OS_DATABASE_ROLLBACK_BACKUP_PLAN",
    "CAMPAIGN_OS_DATABASE_OBSERVABILITY_REF",
    "CAMPAIGN_OS_DATABASE_RUNBOOK_URL",
    "CAMPAIGN_OS_DATABASE_LIVE_ENABLEMENT",
  ],
  status: "local_ready",
  valid: true,
};

const response = (
  body: unknown,
  options: { ok?: boolean; status?: number; traceId?: string } = {},
): Response => ({
  headers: new Headers(options.traceId ? { "x-campaign-os-trace-id": options.traceId } : {}),
  json: vi.fn(async () => body),
  ok: options.ok ?? true,
  status: options.status ?? 200,
} as unknown as Response);

const envelope = (summary: unknown, traceId: string, data: Record<string, unknown> = {}) => ({
  data: {
    backendService: {
      databaseAdapterRuntime: {
        packageBinding: databasePackageBinding,
      },
    },
    productionBackendReadiness: summary,
    ...data,
  },
  ok: true,
  runtime,
  safety: { localOnly: true, noLiveApi: true },
  timestamp: "2026-07-09T19:00:00.000Z",
  traceId,
});

const genericContractWriterMissionCopy = ["contract", "writer", "mission"].join(" ");

describe("backend runtime readiness API bridge", () => {
  it("creates a loading state without touching the network", () => {
    const state = createBackendRuntimeReadinessApiLoadingState();

    expect(state).toMatchObject({
      configured: true,
      loading: true,
      source: "loading",
      status: "loading",
    });
    expect(state.boundary["en-US"]).toContain("No live provider");
  });

  it("returns seeded fallback when the API base URL is missing", async () => {
    const fetchImpl = vi.fn() as unknown as BackendRuntimeReadinessApiFetch;

    const state = await loadBackendRuntimeReadinessApiBridgeState({
      config: { baseUrl: "   " },
      fetchImpl,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(state).toMatchObject({
      configured: false,
      diagnostics: [{ code: "API_BASE_URL_MISSING", severity: "info" }],
      loading: false,
      source: "seeded_fallback",
      status: "fallback",
      summary: seededBackendRuntimeReadinessSummary,
    });
    expect(state.summary.noLiveSideEffects.contractWriteExecuted).toBe(false);
    expect(state.summary.mvpReleaseReady).toBe(false);
    expect(state.summary.mvpReleaseBlockerIds).toEqual(["backend-readiness-api-unavailable"]);
    expect(state.summary.futureProductionBlockerIds).toEqual(
      expect.arrayContaining(["reward-custody", "reward-distribution"]),
    );
    expect(state.summary.databasePackageBinding).toMatchObject({
      bindingId: "campaign-os-postgresql-package-binding-local",
      liveConnectionAttempted: false,
      packageName: "pg",
      packageRef: "npm:pg",
      status: "local_ready",
    });
    expect(state.summary.productionDependencyBlockers.find((blocker) => blocker.id === "contract-writer")).toMatchObject({
      blockedBy: expect.arrayContaining([...contractWriterRequiredConfigKeys]),
      status: "blocked",
    });
    expect(state.summary.productionDependencyBlockers.find((blocker) => blocker.id === "reward-custody")).toMatchObject({
      futureProductionOnly: true,
      mvpReleaseRequired: false,
      releaseScope: "excluded_from_mvp",
      status: "blocked",
    });
    expect(JSON.stringify(state.summary.productionDependencyBlockers)).not.toContain(genericContractWriterMissionCopy);
  });

  it("returns sanitized seeded fallback when the API base URL is invalid", async () => {
    const state = await loadBackendRuntimeReadinessApiBridgeState({
      config: {
        baseUrl: "ftp://api.invalid/path?token=sample-token&api_key=private-key-sample",
      },
      fetchImpl: vi.fn() as unknown as BackendRuntimeReadinessApiFetch,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
      configured: true,
      diagnostics: [{ code: "API_BASE_URL_INVALID", severity: "warning" }],
      source: "seeded_fallback",
      status: "fallback",
    });
    for (const unsafe of ["token=sample-token", "api_key", "private-key", "private key"]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("loads health and contracts readiness from API runtime and keeps contract trace metadata", async () => {
    const contractsSummary = {
      ...readinessSummary,
      routeCoverage: {
        ...readinessSummary.routeCoverage,
        routeIds: [...readinessSummary.routeCoverage.routeIds, "campaigns.export.preview"],
      },
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(envelope(readinessSummary, "trace-health-envelope"), {
        traceId: "trace-health-header",
      }))
      .mockResolvedValueOnce(response(envelope(contractsSummary, "trace-contracts-envelope"), {
        traceId: "trace-contracts-header",
      })) as unknown as BackendRuntimeReadinessApiFetch;

    const state = await loadBackendRuntimeReadinessApiBridgeState({
      config: { baseUrl: "http://127.0.0.1:5174/", tracePrefix: "backend-review" },
      fetchImpl,
    });

    expect(state).toMatchObject({
      configured: true,
      diagnostics: [],
      loading: false,
      source: "api_runtime",
      status: "ready",
      summary: expect.objectContaining({
        databasePackageBinding: expect.objectContaining({
          bindingId: "campaign-os-postgresql-package-binding-local",
          liveConnectionAttempted: false,
          liveMigrationExecutionEnabled: false,
          liveProductionMutationEnabled: false,
          liveProviderCallsEnabled: false,
          liveQueryExecutionEnabled: false,
          liveTransactionExecutionEnabled: false,
          packageName: "pg",
          packageRef: "npm:pg",
          requiredConfigKeys: expect.arrayContaining(["CAMPAIGN_OS_DATABASE_PACKAGE_BINDING"]),
          status: "local_ready",
        }),
        routeCoverage: expect.objectContaining({
          routeIds: expect.arrayContaining(["campaigns.export.preview"]),
        }),
      }),
      traceId: "trace-contracts-envelope",
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:5174/api/health",
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: "application/json",
          "x-campaign-os-trace-id": expect.stringMatching(/^backend-review-/),
        }),
        method: "GET",
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "http://127.0.0.1:5174/api/contracts",
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: "application/json",
          "x-campaign-os-trace-id": expect.stringMatching(/^backend-review-/),
        }),
        method: "GET",
      }),
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("normalizes API runtime release scope metadata from activation", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(envelope(readinessSummary, "trace-health", {
        activation: releaseScopeActivation,
      })))
      .mockResolvedValueOnce(response(envelope(readinessSummary, "trace-contracts", {
        activation: releaseScopeActivation,
      }))) as unknown as BackendRuntimeReadinessApiFetch;

    const state = await loadBackendRuntimeReadinessApiBridgeState({
      config: { baseUrl: "http://127.0.0.1:5174/" },
      fetchImpl,
    });

    expect(state).toMatchObject({
      source: "api_runtime",
      status: "ready",
      summary: {
        futureProductionBlockerIds: expect.arrayContaining(["reward-custody", "reward-distribution"]),
        mvpReleaseBlockerIds: [],
        mvpReleaseReady: true,
        productionReady: false,
      },
    });
    expect(state.summary.productionDependencyBlockers.find((blocker) => blocker.area === "reward")).toMatchObject({
      futureProductionOnly: true,
      mvpReleaseRequired: false,
      releaseScope: "excluded_from_mvp",
      status: "blocked",
    });
  });

  it("normalizes DB package binding metadata without exposing unsafe payloads", async () => {
    const unsafePackageBinding = {
      ...databasePackageBinding,
      bindingId: "campaign-os-postgresql-package-binding-local private-key-sample",
      diagnosticCodes: [
        "PRODUCTION_DB_PACKAGE_BINDING_MISSING",
        "token=sample-token",
      ],
      providerPayload: {
        password: "super-secret",
        signedUrl: "https://storage.invalid/object-key-sample?token=sample-token",
      },
      requiredConfigKeys: [
        "CAMPAIGN_OS_DATABASE_URL",
        "CAMPAIGN_OS_DATABASE_URL",
        "CAMPAIGN_OS_DATABASE_PACKAGE_BINDING",
      ],
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(envelope(readinessSummary, "trace-health", {
        backendService: {
          databaseAdapterRuntime: {
            packageBinding: unsafePackageBinding,
          },
        },
      })))
      .mockResolvedValueOnce(response(envelope(readinessSummary, "trace-contracts", {
        backendService: {
          databaseAdapterRuntime: {
            packageBinding: unsafePackageBinding,
          },
        },
      }))) as unknown as BackendRuntimeReadinessApiFetch;

    const state = await loadBackendRuntimeReadinessApiBridgeState({
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });
    const serialized = JSON.stringify(state.summary.databasePackageBinding).toLowerCase();

    expect(state.summary.databasePackageBinding).toMatchObject({
      bindingId: expect.stringContaining("redacted key"),
      blockerCount: 0,
      diagnosticCodes: expect.arrayContaining(["PRODUCTION_DB_PACKAGE_BINDING_MISSING"]),
      liveConnectionAttempted: false,
      packageName: "pg",
      packageRef: "npm:pg",
      requiredConfigKeys: ["CAMPAIGN_OS_DATABASE_URL", "CAMPAIGN_OS_DATABASE_PACKAGE_BINDING"],
      status: "local_ready",
    });
    for (const unsafe of ["sample-token", "super-secret", "object-key-sample", "campaign-os-kitty"]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("fails closed when DB package binding required config keys are not database env names", async () => {
    const invalidPackageBinding = {
      ...databasePackageBinding,
      requiredConfigKeys: [
        "CAMPAIGN_OS_DATABASE_URL",
        "/Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/evidence/raw.json",
      ],
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(envelope(readinessSummary, "trace-health", {
        backendService: {
          databaseAdapterRuntime: {
            packageBinding: invalidPackageBinding,
          },
        },
      }))) as unknown as BackendRuntimeReadinessApiFetch;

    const state = await loadBackendRuntimeReadinessApiBridgeState({
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });

    expect(state).toMatchObject({
      diagnostics: [{ code: "API_RESPONSE_INVALID", severity: "error" }],
      source: "error_fallback",
      status: "error",
      summary: seededBackendRuntimeReadinessSummary,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(state).toLowerCase()).not.toContain("campaign-os-kitty");
  });

  it("deduplicates API runtime readiness labels before exposing UI summary", async () => {
    const duplicateSummary = {
      ...readinessSummary,
      productionDependencyBlockers: [
        {
          area: "provider",
          attachPoint: "src/server/providerIndexerClientReadiness.ts",
          blockedBy: ["provider", "CAMPAIGN_OS_PROVIDER_REGISTRY_URL"],
          id: "provider-registry",
          requiredBeforeProduction: true,
          status: "blocked",
        },
        {
          area: "provider",
          attachPoint: "src/server/providerHttpRuntime.ts",
          blockedBy: ["CAMPAIGN_OS_PROVIDER_REGISTRY_URL", "CAMPAIGN_OS_PROVIDER_TIMEOUT_POLICY"],
          id: "provider-http",
          requiredBeforeProduction: true,
          status: "blocked",
        },
        {
          area: "queue",
          attachPoint: "src/server/queueRuntime.ts",
          blockedBy: ["provider", "queue", "CAMPAIGN_OS_PROVIDER_TIMEOUT_POLICY", "CAMPAIGN_OS_QUEUE_PROVIDER"],
          id: "queue-provider",
          requiredBeforeProduction: true,
          status: "blocked",
        },
      ],
      profile: {
        ...readinessSummary.profile,
        configuredRequiredConfigKeys: ["CAMPAIGN_OS_PROVIDER_REGISTRY_URL", "CAMPAIGN_OS_PROVIDER_REGISTRY_URL"],
        missingRequiredConfigKeys: ["CAMPAIGN_OS_PROVIDER_REGISTRY_URL", "CAMPAIGN_OS_PROVIDER_REGISTRY_URL"],
        requiredConfigKeys: ["CAMPAIGN_OS_PROVIDER_REGISTRY_URL", "CAMPAIGN_OS_PROVIDER_REGISTRY_URL"],
      },
      routeCoverage: {
        ...readinessSummary.routeCoverage,
        missingApiSkillIds: ["provider.http", "provider.http"],
        routeIds: ["runtime.health", "runtime.health", "campaigns.provider.readiness"],
      },
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(envelope(duplicateSummary, "trace-health")))
      .mockResolvedValueOnce(response(envelope(duplicateSummary, "trace-contracts"))) as unknown as BackendRuntimeReadinessApiFetch;

    const state = await loadBackendRuntimeReadinessApiBridgeState({
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });
    const blockedDependencyLabels = state.summary.productionDependencyBlockers.flatMap((blocker) => [
      blocker.area,
      ...blocker.blockedBy,
    ]);

    expect(state.summary.profile.requiredConfigKeys).toEqual(["CAMPAIGN_OS_PROVIDER_REGISTRY_URL"]);
    expect(state.summary.profile.missingRequiredConfigKeys).toEqual(["CAMPAIGN_OS_PROVIDER_REGISTRY_URL"]);
    expect(state.summary.routeCoverage.missingApiSkillIds).toEqual(["provider.http"]);
    expect(state.summary.routeCoverage.routeIds).toEqual(["runtime.health", "campaigns.provider.readiness"]);
    expect(state.summary.productionDependencyBlockers.map((blocker) => blocker.area)).toEqual(["provider", "queue"]);
    expect(new Set(blockedDependencyLabels).size).toBe(blockedDependencyLabels.length);
    expect(blockedDependencyLabels).toEqual([
      "provider",
      "CAMPAIGN_OS_PROVIDER_REGISTRY_URL",
      "CAMPAIGN_OS_PROVIDER_TIMEOUT_POLICY",
      "queue",
      "CAMPAIGN_OS_QUEUE_PROVIDER",
    ]);
  });

  it("normalizes durable local persistence posture from health metadata", async () => {
    const durablePersistence = {
      adapterLabel: "local_json:campaign-os-review-state",
      adapterPortId: "campaign-os-local-json-adapter",
      countsByKind: {
        export_preview: 1,
        verification_attempt: 1,
        wallet_session: 1,
      },
      durable: true,
      latestRecords: [
        {
          createdAt: "2026-07-10T12:00:00.000Z",
          kind: "export_preview",
          routeId: "campaigns.export.preview",
          summary: { signedUrl: "signed-url-sample" },
          traceId: "trace-export-preview",
        },
        {
          kind: "wallet_session",
          routeId: "wallet.session.create",
          traceId: "trace-wallet-session",
          walletAddress: "2F4...9aB",
        },
      ],
      localOnly: true,
      mode: "local_json",
      noMigrationRunner: true,
      noProductionDatabase: true,
      noSecretHandling: true,
      recordCount: 3,
      status: "ok",
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(envelope(readinessSummary, "trace-health", {
        persistence: durablePersistence,
      })))
      .mockResolvedValueOnce(response(envelope(readinessSummary, "trace-contracts"))) as unknown as BackendRuntimeReadinessApiFetch;

    const state = await loadBackendRuntimeReadinessApiBridgeState({
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });

    expect(state.persistencePosture).toMatchObject({
      adapterLabel: "local_json:campaign-os-review-state",
      diagnosticCodes: [],
      latestRecords: [
        {
          kind: "export_preview",
          routeId: "campaigns.export.preview",
          traceId: "trace-export-preview",
        },
        {
          kind: "wallet_session",
          routeId: "wallet.session.create",
          traceId: "trace-wallet-session",
        },
      ],
      mode: "local_json",
      recordCount: 3,
      safety: {
        durable: true,
        localOnly: true,
        noMigrationRunner: true,
        noProductionDatabase: true,
        noSecretHandling: true,
      },
      status: "durable_local",
    });
    expect(JSON.stringify(state.persistencePosture).toLowerCase()).not.toContain("signed-url-sample");
  });

  it("normalizes blocked durable local setup without downgrading to memory", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response({
      error: {
        code: "INVALID_REQUEST",
        details: {
          diagnosticCodes: ["MISSING_LOCAL_PERSISTENCE_DIR"],
          fallbackUsed: false,
          field: "runtimeConfig.persistence.localDataDir",
          persistenceMode: "local_json",
          reason:
            "local_json persistence requires /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/docs/current token=sample",
          status: "blocked",
        },
      },
      ok: false,
      traceId: "trace-durable-blocked",
    }, {
      ok: false,
      status: 400,
      traceId: "trace-durable-blocked",
    })) as unknown as BackendRuntimeReadinessApiFetch;

    const state = await loadBackendRuntimeReadinessApiBridgeState({
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });

    expect(state).toMatchObject({
      source: "error_fallback",
      status: "error",
      traceId: "trace-durable-blocked",
      persistencePosture: {
        diagnosticCodes: ["MISSING_LOCAL_PERSISTENCE_DIR"],
        mode: "local_json",
        recordCount: 0,
        status: "unavailable",
      },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const serialized = JSON.stringify(state).toLowerCase();

    for (const unsafe of ["campaign-os-kitty", "docs/current", "token=sample", "memory only"]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("normalizes production-deferred persistence posture from blocked backend readiness", async () => {
    const blockedSummary = {
      ...readinessSummary,
      profile: {
        ...readinessSummary.profile,
        configuredRequiredConfigKeys: ["CAMPAIGN_OS_DATABASE_URL"],
        id: "production-required",
        label: "Production required backend profile",
        missingRequiredConfigKeys: ["CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT"],
        requiredConfigKeys: ["CAMPAIGN_OS_DATABASE_URL", "CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT"],
        requiresSecrets: true,
        status: "blocked",
      },
      status: "blocked",
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(envelope(blockedSummary, "trace-health")))
      .mockResolvedValueOnce(response(envelope(blockedSummary, "trace-contracts"))) as unknown as BackendRuntimeReadinessApiFetch;

    const state = await loadBackendRuntimeReadinessApiBridgeState({
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });

    expect(state).toMatchObject({
      status: "blocked",
      persistencePosture: {
        diagnosticCodes: ["PRODUCTION_PERSISTENCE_DEFERRED"],
        mode: "production_deferred",
        status: "production_deferred",
      },
    });
  });

  it("redacts unsafe persistence metadata before exposing UI posture", async () => {
    const unsafePersistence = {
      adapterLabel:
        "local_json:/Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/docs/current/token=sample",
      durable: true,
      latestRecords: [
        {
          kind: "wallet_session",
          routeId: "provider payload token=abc123",
          traceId: "trace-raw-signature",
          walletSignature: "raw-signature-sample",
        },
      ],
      localOnly: true,
      mode: "local_json",
      noMigrationRunner: true,
      noProductionDatabase: true,
      noSecretHandling: true,
      recordCount: 1,
      status: "ok",
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(envelope(readinessSummary, "trace-health", {
        persistence: unsafePersistence,
      })))
      .mockResolvedValueOnce(response(envelope(readinessSummary, "trace-contracts"))) as unknown as BackendRuntimeReadinessApiFetch;

    const state = await loadBackendRuntimeReadinessApiBridgeState({
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });
    const posture = state.persistencePosture;
    const serialized = JSON.stringify(posture).toLowerCase();

    expect(posture).toMatchObject({
      recordCount: 1,
      status: "durable_local",
    });
    expect(posture?.latestRecords[0].routeId).toContain("redacted");
    for (const unsafe of [
      "campaign-os-kitty",
      "docs/current",
      "token=sample",
      "token=abc123",
      "raw-signature",
      "raw-signature-sample",
    ]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("falls back when health is unreachable and redacts unsafe diagnostics", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error(
        "Request failed with bearer token sample-token, password=secret, provider payload, stack trace, /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/secret.md",
      );
    }) as unknown as BackendRuntimeReadinessApiFetch;

    const state = await loadBackendRuntimeReadinessApiBridgeState({
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
      diagnostics: [{ code: "API_REQUEST_FAILED", severity: "error" }],
      source: "error_fallback",
      status: "error",
      summary: seededBackendRuntimeReadinessSummary,
    });
    for (const unsafe of [
      "bearer token",
      "sample-token",
      "password=secret",
      "provider payload",
      "stack trace",
      "campaign-os-kitty",
    ]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("falls back when contracts route fails after health succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(envelope(readinessSummary, "trace-health"), {
        traceId: "trace-health",
      }))
      .mockResolvedValueOnce(response({
        error: { message: "contracts failed with private key sample" },
        ok: false,
        traceId: "trace-contracts-failed",
      }, {
        ok: false,
        status: 500,
        traceId: "trace-contracts-failed",
      })) as unknown as BackendRuntimeReadinessApiFetch;

    const state = await loadBackendRuntimeReadinessApiBridgeState({
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });

    expect(state).toMatchObject({
      diagnostics: [{ code: "API_CONTRACTS_FAILED", severity: "error" }],
      source: "error_fallback",
      status: "error",
      traceId: "trace-contracts-failed",
    });
    expect(JSON.stringify(state.diagnostics).toLowerCase()).not.toContain("private key");
  });

  it("falls back when readiness response shape is malformed", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(envelope({ ...readinessSummary, id: "wrong" }, "trace-health")))
      .mockResolvedValueOnce(response(envelope(readinessSummary, "trace-contracts"))) as unknown as BackendRuntimeReadinessApiFetch;

    const state = await loadBackendRuntimeReadinessApiBridgeState({
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });

    expect(state).toMatchObject({
      diagnostics: [{ code: "API_RESPONSE_INVALID", severity: "error" }],
      source: "error_fallback",
      status: "error",
      traceId: "trace-health",
    });
  });

  it("returns timeout diagnostics and avoids repeated unsafe live calls", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new DOMException("seed phrase sample and raw-signature payload", "AbortError");
    }) as unknown as BackendRuntimeReadinessApiFetch;

    const state = await loadBackendRuntimeReadinessApiBridgeState({
      config: { baseUrl: "http://127.0.0.1:5174", timeoutMs: 10 },
      fetchImpl,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
      diagnostics: [{ code: "API_REQUEST_TIMEOUT", severity: "error" }],
      source: "error_fallback",
      status: "error",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:5174/api/health",
      expect.objectContaining({ method: "GET" }),
    );
    for (const unsafe of ["seed phrase", "raw-signature"]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("sanitizes standalone diagnostic text", () => {
    expect(sanitizeBackendRuntimeReadinessApiText("provider payload token=abc123 private key")).toBe(
      "redacted provider data redacted query credential redacted key",
    );
  });
});
