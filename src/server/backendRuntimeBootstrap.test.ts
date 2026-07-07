import { describe, expect, it } from "vitest";
import { createBackendServiceReadinessReport } from "./backendService";
import {
  backendRuntimeBootstrapDeferredDependencies,
  createBackendRuntimeBootstrapContract,
} from "./backendRuntimeBootstrap";
import { resolveApiServerRuntimeContract } from "./serverRuntime";

const secretFragments = [
  "auth-secret",
  "bearer sample",
  "mnemonic sample",
  "object-key-sample",
  "postgres://db.invalid/campaign-os",
  "private-key-sample",
  "raw-signature-sample",
  "seed phrase sample",
  "signed-url",
];

const expectNoSecretLeak = (value: unknown) => {
  const serialized = JSON.stringify(value).toLowerCase();

  for (const fragment of secretFragments) {
    expect(serialized).not.toContain(fragment);
  }
};

const createLocalBootstrap = () => {
  const contract = resolveApiServerRuntimeContract({
    env: {},
    startedAt: "2026-07-06T18:00:00.000Z",
  });
  const backendReadiness = createBackendServiceReadinessReport({
    generatedAt: "2026-07-06T18:00:00.000Z",
  });

  return createBackendRuntimeBootstrapContract({
    backendReadiness,
    contract,
    now: new Date("2026-07-06T18:00:02.500Z"),
  });
};

describe("backend runtime bootstrap contract", () => {
  it("composes deterministic local-review bootstrap metadata without live side effects", () => {
    const bootstrap = createLocalBootstrap();

    expect(bootstrap).toMatchObject({
      id: "campaign-os-backend-runtime-bootstrap",
      profileId: "local-review",
      runtimeVersion: "0.2.0-local",
      status: "ready",
      supportMode: "local_seeded",
      valid: true,
      startup: {
        allowedOriginCount: 2,
        attachPointCount: expect.any(Number),
        blockedAttachPointCount: expect.any(Number),
        corsEnabled: true,
        host: "127.0.0.1",
        port: 5174,
        runtimeVersion: "0.2.0-local",
        startedAt: "2026-07-06T18:00:00.000Z",
      },
      activation: {
        deploymentHandoff: {
          contractsEndpoint: "/api/contracts",
          healthEndpoint: "/api/health",
          runtimeTarget: "api_service",
          shutdown: {
            idempotentStop: true,
            shutdownTimeoutMs: 5_000,
          },
          smokeCommand: "npm run server:smoke",
          startCommand: "npm run server:start",
        },
        id: "campaign-os-backend-runtime-activation",
        liveSideEffectsEnabled: false,
        productionReady: false,
        runtimeTarget: "node-http-api-service",
      },
      tracePolicy: {
        failureEnvelopeTraceId: true,
        startupLogIncludesTracePolicy: true,
        successEnvelopeTraceId: true,
        traceHeaderName: "x-campaign-os-trace-id",
      },
      requestGuard: {
        guardedFailureEnvelope: true,
        maxBodyBytes: 1_048_576,
        traceHeaderName: "x-campaign-os-trace-id",
      },
      shutdown: {
        activeRequestCount: 0,
        shutdownTimeoutMs: 5_000,
        state: "running",
      },
      readiness: {
        authSession: {
          status: "local_seeded",
          valid: true,
          verificationMode: "local_only",
        },
        backend: {
          entrypointId: "campaign-os-backend-service",
          valid: true,
        },
        databaseAdapterRuntime: {
          liveConnectionAttempted: false,
          liveQueryExecutionEnabled: false,
          status: "active_local",
          valid: true,
        },
        persistenceRuntime: {
          liveConnectionAttempted: false,
          liveExecutionEnabled: false,
          status: "active_local",
          valid: true,
        },
        workerSchedulerFoundation: {
          blockerCount: 0,
          diagnosticCodes: [],
          id: "campaign-os-worker-scheduler-foundation",
          jobCatalogCount: 9,
          liveCronExecutionEnabled: false,
          liveQueuePublishingEnabled: false,
          liveSchedulerExecutionEnabled: false,
          liveWorkerExecutionEnabled: false,
          productionReady: false,
          schedulePolicyCount: 9,
          status: "local_ready",
          valid: true,
          verificationHandoffValid: true,
        },
      },
    });
    expect(bootstrap.uptimeMs).toBe(2500);
    expect(bootstrap.diagnosticCodes).toEqual([]);
    expect(bootstrap.deferredDependencyIds).toEqual(
      backendRuntimeBootstrapDeferredDependencies.map((dependency) => dependency.id),
    );
    expect(bootstrap.activation.deploymentHandoff.environmentKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "CAMPAIGN_OS_DATABASE_URL", redacted: true }),
        expect.objectContaining({ key: "CAMPAIGN_OS_AUTH_SECRET", redacted: true }),
      ]),
    );
    expect(bootstrap.activation.productionDependencyBlockers.map((blocker) => blocker.id)).toEqual(
      expect.arrayContaining([
        "live-database-driver",
        "migration-executor",
        "wallet-proof-verifier",
        "session-issuer",
        "contract-writer",
        "reward-custody",
        "reward-distribution",
      ]),
    );
  });

  it("fails closed for production-required without marking local fallbacks production-ready", () => {
    const env = {
      CAMPAIGN_OS_AUTH_SECRET: "auth-secret",
      CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
      CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT: "https://writer.invalid/private-key-sample",
      CAMPAIGN_OS_DATABASE_URL: "postgres://db.invalid/campaign-os",
      CAMPAIGN_OS_DATABASE_MNEMONIC: "mnemonic sample",
      CAMPAIGN_OS_DATABASE_SIGNATURE: "raw-signature-sample",
      CAMPAIGN_OS_PROVIDER_REGISTRY_URL: "https://providers.invalid/object-key-sample",
      CAMPAIGN_OS_WORKER_QUEUE_URL: "https://queue.invalid/signed-url",
    };
    const contract = resolveApiServerRuntimeContract({ env });
    const backendReadiness = createBackendServiceReadinessReport({
      configOptions: { env },
    });
    const bootstrap = createBackendRuntimeBootstrapContract({
      backendReadiness,
      contract,
      now: new Date(contract.startedAt),
    });

    expect(bootstrap).toMatchObject({
      profileId: "production-required",
      readiness: {
        authSession: {
          status: "blocked",
          valid: false,
          verificationMode: "production_required",
        },
        backend: {
          valid: false,
        },
        databaseAdapterRuntime: {
          liveConnectionAttempted: false,
          liveQueryExecutionEnabled: false,
          status: "blocked",
          valid: false,
        },
        persistenceRuntime: {
          liveConnectionAttempted: false,
          liveExecutionEnabled: false,
          status: "boundary_ready",
        },
        workerSchedulerFoundation: {
          blockerCount: 5,
          diagnosticCodes: expect.arrayContaining([
            "SCHEDULER_ENDPOINT_MISSING",
            "RETRY_BACKOFF_POLICY_MISSING",
            "IDEMPOTENCY_STORE_MISSING",
            "WORKER_LEASE_MISSING",
            "OBSERVABILITY_MISSING",
          ]),
          liveCronExecutionEnabled: false,
          liveQueuePublishingEnabled: false,
          liveSchedulerExecutionEnabled: false,
          liveWorkerExecutionEnabled: false,
          productionReady: false,
          status: "blocked",
          valid: false,
          verificationHandoffValid: true,
        },
      },
      status: "blocked",
      valid: false,
    });
    expect(bootstrap.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "BACKEND_RUNTIME_BOOTSTRAP_PRODUCTION_BLOCKED",
        "BACKEND_RUNTIME_BOOTSTRAP_SERVER_RUNTIME_INVALID",
        "BACKEND_RUNTIME_BOOTSTRAP_BACKEND_READINESS_INVALID",
      ]),
    );
    expect(bootstrap.deferredDependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "production-database-driver",
          status: "blocked",
        }),
        expect.objectContaining({
          id: "auth-middleware",
          status: "blocked",
        }),
        expect.objectContaining({
          id: "contract-writer",
          status: "blocked",
        }),
        expect.objectContaining({
          id: "reward-custody",
          status: "blocked",
        }),
        expect.objectContaining({
          id: "analytics-warehouse",
          status: "deferred",
        }),
      ]),
    );
    expectNoSecretLeak(bootstrap);
  });

  it("represents all required deferred backend activation dependencies", () => {
    const bootstrap = createLocalBootstrap();

    expect(bootstrap.deferredDependencyIds).toEqual(
      expect.arrayContaining([
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
    );
    expect(bootstrap.deferredDependencies.every((dependency) => dependency.requiredBeforeProduction)).toBe(true);
    expect(bootstrap.deferredDependencies.every((dependency) => dependency.blockedBy.length > 0)).toBe(true);
  });

  it("reports shutdown lifecycle states without claiming readiness", () => {
    const contract = resolveApiServerRuntimeContract({
      env: {},
      shutdownTimeoutMs: 1234,
      startedAt: "2026-07-06T18:00:00.000Z",
    });
    const backendReadiness = createBackendServiceReadinessReport();
    const stopping = createBackendRuntimeBootstrapContract({
      backendReadiness,
      contract,
      shutdownState: {
        activeRequestCount: 2,
        state: "stopping",
        stopStartedAt: "2026-07-06T18:00:03.000Z",
      },
    });
    const stopped = createBackendRuntimeBootstrapContract({
      backendReadiness,
      contract,
      shutdownState: {
        activeRequestCount: 0,
        closedAt: "2026-07-06T18:00:04.000Z",
        state: "stopped",
      },
    });

    expect(stopping).toMatchObject({
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
    });
    expect(stopped).toMatchObject({
      diagnosticCodes: expect.arrayContaining([
        "BACKEND_RUNTIME_BOOTSTRAP_STOPPED",
      ]),
      shutdown: {
        activeRequestCount: 0,
        state: "stopped",
      },
      status: "blocked",
      valid: false,
    });
  });
});
