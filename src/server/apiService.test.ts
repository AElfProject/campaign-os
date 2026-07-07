import { describe, expect, it } from "vitest";
import {
  campaignOsApiServiceAttachMap,
  createCampaignOsApiServiceContract,
} from "./apiService";

const secretFragments = [
  "bearer sample-token",
  "mnemonic sample",
  "object-key-sample",
  "postgres://real-user:real-db-password@db.invalid/campaign-os",
  "private-key-sample",
  "raw-signature-sample",
  "seed phrase sample",
  "signed-url",
  "super-secret",
];

const requiredAttachPointIds = [
  "live-database-driver",
  "migration-executor",
  "wallet-proof-verifier",
  "session-issuer",
  "project-membership-store",
  "verification-worker",
  "scheduler",
  "provider-adapters",
  "contract-writer",
  "object-storage",
  "analytics-ingestion",
  "reward-custody",
  "reward-distribution",
  "deployment-config",
  "observability-exporter",
];

const expectNoSecretLeak = (value: unknown) => {
  const serialized = JSON.stringify(value).toLowerCase();

  for (const fragment of secretFragments) {
    expect(serialized).not.toContain(fragment);
  }
};

describe("Campaign OS API service bootstrap contract", () => {
  it("creates a deterministic local-review service bootstrap contract", () => {
    const service = createCampaignOsApiServiceContract({
      env: {},
      startedAt: "2026-07-06T18:00:00.000Z",
    });

    expect(service).toMatchObject({
      host: "127.0.0.1",
      id: "campaign-os-api-service",
      port: 5174,
      profileId: "local-review",
      runtimeVersion: "0.2.0-local",
      startedAt: "2026-07-06T18:00:00.000Z",
      status: "ready",
      supportMode: "local_seeded",
      valid: true,
      readiness: {
        contractWriteEnabled: false,
        deployableBoundaryReady: true,
        liveConnectionAttempted: false,
        liveSideEffectsEnabled: false,
        productionReady: false,
        workerExecutionEnabled: false,
      },
      shutdown: {
        activeRequestCount: 0,
        shutdownTimeoutMs: 5_000,
        state: "running",
      },
    });
    expect(service.diagnosticCodes).toEqual([]);
    expect(service.composition).toMatchObject({
      activation: {
        deploymentHandoff: {
          contractsEndpoint: "/api/contracts",
          healthEndpoint: "/api/health",
          runtimeTarget: "api_service",
          smokeCommand: "npm run server:smoke",
          startCommand: "npm run server:start",
        },
        id: "campaign-os-backend-runtime-activation",
        liveSideEffectsEnabled: false,
        productionReady: false,
        runtimeTarget: "node-http-api-service",
      },
      apiRuntime: {
        handlerSource: "createCampaignOsApiRuntime",
        metadataRouteIds: expect.arrayContaining(["runtime.health", "runtime.contracts"]),
        routeCount: expect.any(Number),
      },
      authEnforcement: {
        liveSigningExecuted: false,
        liveVerificationExecuted: false,
        localProofVerifierContractReady: true,
        localSessionIssuerContractReady: true,
        productionProofVerifierReady: false,
        productionSessionIssuerReady: false,
      },
      backendRuntimeBootstrap: {
        id: "campaign-os-backend-runtime-bootstrap",
        status: "ready",
        valid: true,
      },
      backendService: {
        entrypointId: "campaign-os-backend-service",
        profileId: "local-review",
        valid: true,
      },
      serverRuntime: {
        host: "127.0.0.1",
        port: 5174,
        profileId: "local-review",
        requestGuardTraceHeader: "x-campaign-os-trace-id",
        valid: true,
      },
    });
    expect(service.composition.apiRuntime.routeCount).toBeGreaterThanOrEqual(10);
  });

  it("allows explicit host, port, version, and profile overrides", () => {
    const service = createCampaignOsApiServiceContract({
      env: {
        CAMPAIGN_OS_API_HOST: "0.0.0.0",
        CAMPAIGN_OS_API_PORT: "4188",
        CAMPAIGN_OS_API_VERSION: "0.2.0-env",
        CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
      },
      host: "127.0.0.2",
      port: 0,
      profileId: "staging-scaffold",
      shutdownTimeoutMs: 1234,
      startedAt: "2026-07-06T18:00:00.000Z",
      version: "0.2.0-service-test",
    });

    expect(service).toMatchObject({
      host: "127.0.0.2",
      port: 0,
      profileId: "staging-scaffold",
      runtimeVersion: "0.2.0-service-test",
      status: "ready",
      valid: true,
      shutdown: {
        shutdownTimeoutMs: 1234,
      },
    });
  });

  it("fails closed for invalid profile and numeric runtime configuration", () => {
    const service = createCampaignOsApiServiceContract({
      env: {
        CAMPAIGN_OS_API_MAX_BODY_BYTES: "huge",
        CAMPAIGN_OS_API_PORT: "-1",
        CAMPAIGN_OS_API_SHUTDOWN_TIMEOUT_MS: "0",
        CAMPAIGN_OS_BACKEND_PROFILE: "production-live",
      },
    });

    expect(service).toMatchObject({
      port: 5174,
      profileId: "production-required",
      status: "blocked",
      valid: false,
      readiness: {
        deployableBoundaryReady: false,
        liveConnectionAttempted: false,
        liveSideEffectsEnabled: false,
        productionReady: false,
      },
    });
    expect(service.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "API_SERVICE_RUNTIME_INVALID",
        "API_SERVICE_BACKEND_READINESS_INVALID",
        "API_SERVICE_PRODUCTION_BLOCKED",
      ]),
    );
  });

  it("keeps production-required bootstrap blocked without live side effects", () => {
    const env = {
      CAMPAIGN_OS_AUTH_SECRET: "super-secret",
      CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
      CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT: "https://writer.invalid/private-key-sample",
      CAMPAIGN_OS_DATABASE_URL: "postgres://real-user:real-db-password@db.invalid/campaign-os",
      CAMPAIGN_OS_DATABASE_MNEMONIC: "mnemonic sample",
      CAMPAIGN_OS_DATABASE_SIGNATURE: "raw-signature-sample",
      CAMPAIGN_OS_PROVIDER_REGISTRY_URL: "https://providers.invalid/object-key-sample",
      CAMPAIGN_OS_WORKER_QUEUE_URL: "https://queue.invalid/signed-url",
    };
    const service = createCampaignOsApiServiceContract({ env });

    expect(service).toMatchObject({
      profileId: "production-required",
      status: "blocked",
      valid: false,
      readiness: {
        contractWriteEnabled: false,
        deployableBoundaryReady: false,
        liveConnectionAttempted: false,
        liveSideEffectsEnabled: false,
        productionReady: false,
        workerExecutionEnabled: false,
      },
    });
    expect(service.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "API_SERVICE_RUNTIME_INVALID",
        "API_SERVICE_BACKEND_READINESS_INVALID",
        "API_SERVICE_PRODUCTION_BLOCKED",
      ]),
    );
    expect(service.composition).toMatchObject({
      databaseAdapterRuntime: {
        liveConnectionAttempted: false,
        liveQueryExecutionEnabled: false,
        status: "blocked",
      },
      persistenceRuntime: {
        liveConnectionAttempted: false,
        liveExecutionEnabled: false,
      },
    });
    expectNoSecretLeak(service);
  });

  it("exposes the future production attach map with stable dependency ids", () => {
    const service = createCampaignOsApiServiceContract({ env: {} });
    const attachPointIds = service.attachMap.map((attachPoint) => attachPoint.id);

    expect(attachPointIds).toEqual(expect.arrayContaining(requiredAttachPointIds));
    expect(new Set(attachPointIds).size).toBe(attachPointIds.length);
    expect(service.readiness.blockedDependencyIds).toEqual(
      expect.arrayContaining([
        "live-database-driver",
        "migration-executor",
        "project-membership-store",
        "contract-writer",
        "reward-custody",
        "reward-distribution",
      ]),
    );
    expect(service.readiness.blockedDependencyIds).not.toEqual(
      expect.arrayContaining(["wallet-proof-verifier", "session-issuer"]),
    );
    expect(service.readiness.authProductionBlockerIds).toEqual(
      expect.arrayContaining([
        "live_wallet_proof_verifier",
        "auth_nonce_store",
        "session_signing_key",
        "secret_manager",
        "production_session_store",
        "project_membership_source",
      ]),
    );
    expect(service.attachMap.find((attachPoint) => attachPoint.id === "wallet-proof-verifier")).toMatchObject({
      localContractReady: true,
      productionReady: false,
      status: "ready",
    });
    expect(service.attachMap.find((attachPoint) => attachPoint.id === "session-issuer")).toMatchObject({
      localContractReady: true,
      productionReady: false,
      status: "ready",
    });
    expect(service.readiness.deferredDependencyIds).toEqual(
      expect.arrayContaining([
        "verification-worker",
        "scheduler",
        "provider-adapters",
        "object-storage",
        "analytics-ingestion",
        "deployment-config",
        "observability-exporter",
      ]),
    );
    expect(campaignOsApiServiceAttachMap.every((attachPoint) => attachPoint.blockedBy.length > 0)).toBe(true);
  });

  it("projects shutdown lifecycle without throwing away safe diagnostics", () => {
    const stopping = createCampaignOsApiServiceContract({
      env: {},
      shutdownState: {
        activeRequestCount: 2,
        state: "stopping",
        stopStartedAt: "2026-07-06T18:00:03.000Z",
      },
      shutdownTimeoutMs: 1234,
    });
    const stopped = createCampaignOsApiServiceContract({
      env: {},
      shutdownState: {
        activeRequestCount: 0,
        closedAt: "2026-07-06T18:00:04.000Z",
        state: "stopped",
      },
    });

    expect(stopping).toMatchObject({
      diagnosticCodes: ["API_SERVICE_SHUTDOWN_IN_PROGRESS"],
      shutdown: {
        activeRequestCount: 2,
        shutdownTimeoutMs: 1234,
        state: "stopping",
      },
      status: "deferred",
      valid: true,
    });
    expect(stopped).toMatchObject({
      diagnosticCodes: ["API_SERVICE_STOPPED"],
      shutdown: {
        activeRequestCount: 0,
        state: "stopped",
      },
      status: "stopped",
      valid: false,
    });
  });

  it("keeps bootstrap validation fast and side-effect free", () => {
    const startedAt = performance.now();
    const service = createCampaignOsApiServiceContract({ env: {} });
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(100);
    expect(service.readiness).toMatchObject({
      contractWriteEnabled: false,
      liveConnectionAttempted: false,
      liveSideEffectsEnabled: false,
      workerExecutionEnabled: false,
    });
  });
});
