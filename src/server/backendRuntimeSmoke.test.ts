import { describe, expect, it } from "vitest";
import { runBackendRuntimeSmoke } from "./backendRuntimeSmoke";

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

const expectNoSecretLeak = (value: unknown) => {
  const serialized = JSON.stringify(value).toLowerCase();

  for (const fragment of secretFragments) {
    expect(serialized).not.toContain(fragment);
  }
};

describe("backend runtime smoke command", () => {
  it("starts the local API server, checks health/contracts, and stops cleanly", async () => {
    const summary = await runBackendRuntimeSmoke({
      env: {
        AUTHORIZATION: "Bearer sample-token",
        CAMPAIGN_OS_AUTH_SECRET: "super-secret",
        CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT: "https://writer.invalid/private-key-sample",
        CAMPAIGN_OS_DATABASE_URL: "postgres://real-user:real-db-password@db.invalid/campaign-os",
        CAMPAIGN_OS_PROVIDER_REGISTRY_URL: "https://providers.invalid/object-key-sample",
        CAMPAIGN_OS_WORKER_QUEUE_URL: "https://queue.invalid/raw-signature-sample",
      },
    });

    expect(summary).toMatchObject({
      activationId: "campaign-os-backend-runtime-activation",
      authSessionFoundation: {
        blockerCount: 0,
        diagnosticCodes: expect.arrayContaining(["AUTH_AGENT_CREDENTIAL_SEPARATE"]),
        liveSideEffectsEnabled: false,
        liveSigningExecuted: false,
        liveVerificationExecuted: false,
        productionReady: false,
        status: "local_ready",
        valid: true,
      },
      checks: {
        contracts: {
          activationPresent: true,
          authSessionFoundation: {
            blockerCount: 0,
            liveSideEffectsEnabled: false,
            productionReady: false,
            status: "local_ready",
            valid: true,
          },
          endpoint: "/api/contracts",
          ok: true,
          providerIndexerFoundation: {
            blockerCount: 0,
            liveProviderCallsEnabled: false,
            productionReady: false,
            providerGroupCount: 10,
            status: "local_ready",
            valid: true,
            verificationSourceCoverageCount: 5,
            workerExecutionEnabled: false,
          },
          status: 200,
        },
        health: {
          activationPresent: true,
          authSessionFoundation: {
            blockerCount: 0,
            liveSideEffectsEnabled: false,
            productionReady: false,
            status: "local_ready",
            valid: true,
          },
          endpoint: "/api/health",
          ok: true,
          providerIndexerFoundation: {
            blockerCount: 0,
            liveProviderCallsEnabled: false,
            productionReady: false,
            providerGroupCount: 10,
            status: "local_ready",
            valid: true,
            verificationSourceCoverageCount: 5,
            workerExecutionEnabled: false,
          },
          status: 200,
        },
      },
      host: "127.0.0.1",
      liveSideEffectsEnabled: false,
      persistenceFoundation: {
        blockerCount: 11,
        diagnosticCodes: expect.arrayContaining([
          "PRODUCTION_PERSISTENCE_SECRET_REDACTED",
          "DATABASE_ADAPTER_SECRET_REDACTED",
        ]),
        liveConnectionAttempted: false,
        liveMigrationExecutionEnabled: false,
        liveQueryExecutionEnabled: false,
        migrationDryRunStatus: "dry_run_ready",
        productionReady: false,
        status: "metadata_ready",
        storeCoverageCount: 6,
        valid: true,
      },
      productionReady: false,
      providerIndexerFoundation: {
        blockerCount: 0,
        diagnosticCodes: [],
        liveAiCallsEnabled: false,
        liveAnalyticsIngestionEnabled: false,
        liveContractCallsEnabled: false,
        liveIndexerCallsEnabled: false,
        liveObjectStorageEnabled: false,
        liveProviderCallsEnabled: false,
        liveSocialCallsEnabled: false,
        productionReady: false,
        providerGroupCount: 10,
        status: "local_ready",
        valid: true,
        verificationSourceCoverageCount: 5,
        workerExecutionEnabled: false,
      },
      shutdownState: "stopped",
      status: "passed",
      traceIds: {
        contracts: "campaign-os-smoke-contracts",
        health: "campaign-os-smoke-health",
      },
    });
    expect(summary.port).toBeGreaterThan(0);
    expect(summary.url).toBe(`http://127.0.0.1:${summary.port}`);
    expect(summary.checks.health.deploymentHandoff).toMatchObject({
      healthEndpoint: "/api/health",
      contractsEndpoint: "/api/contracts",
      startCommand: "npm run server:start",
      smokeCommand: "npm run server:smoke",
    });
    expect(summary.checks.contracts.deploymentHandoff).toMatchObject({
      healthEndpoint: "/api/health",
      contractsEndpoint: "/api/contracts",
      startCommand: "npm run server:start",
      smokeCommand: "npm run server:smoke",
    });
    expect(summary.requiredBeforeProduction).toEqual(
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
    expectNoSecretLeak(summary);
  });
});
