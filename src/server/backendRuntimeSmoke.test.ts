import { describe, expect, it } from "vitest";
import { runBackendRuntimeSmoke } from "./backendRuntimeSmoke";

const secretFragments = [
  "bearer sample-token",
  "mnemonic sample",
  "object-key-sample",
  "postgres://real-user:real-db-password@db.invalid/campaign-os",
  "private-key-sample",
  "queue-pass",
  "queue-secret",
  "queue-user",
  "raw-signature-sample",
  "elf_scheduler_wallet",
  "scheduler-pass",
  "scheduler-secret",
  "scheduler-token-sample",
  "scheduler-user",
  "scheduler_raw_task",
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

const expectedSchedulerRuntimeFoundation = {
  blockerCount: 0,
  diagnosticCodes: [],
  dryRunTriggerEnabled: true,
  id: "campaign-os-scheduler-runtime-foundation",
  liveCronExecutionEnabled: false,
  liveQueuePublishingEnabled: false,
  liveSchedulerExecutionEnabled: false,
  liveWorkerExecutionEnabled: false,
  productionReady: false,
  registrationCount: 9,
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
  status: "local_ready",
  valid: true,
};

const expectedQueueProviderAdapter = {
  adapterId: "local-dry-run-queue-provider-adapter",
  blockerCount: 0,
  diagnosticCodes: [],
  disabledLiveOperationCount: 8,
  liveQueuePublishingEnabled: false,
  liveWorkerExecutionEnabled: false,
  mode: "dry_run",
  operationCount: 8,
  productionReady: false,
  providerId: "local-dry-run",
  requiredConfigKeys: expect.arrayContaining([
    "CAMPAIGN_OS_QUEUE_PROVIDER",
    "CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT",
    "CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS",
  ]),
  status: "local_ready",
  valid: true,
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
        CAMPAIGN_OS_RAW_TRIGGER_PAYLOAD_SAMPLE: "{\"walletAddress\":\"ELF_scheduler_wallet\",\"taskId\":\"scheduler_raw_task\"}",
        CAMPAIGN_OS_SCHEDULER_ENDPOINT: "https://scheduler-user:scheduler-pass@scheduler.invalid/hook?token=scheduler-secret",
        CAMPAIGN_OS_SCHEDULER_TOKEN_SAMPLE: "Bearer scheduler-token-sample",
        CAMPAIGN_OS_WORKER_QUEUE_URL: "https://queue-user:queue-pass@queue.invalid/jobs?token=queue-secret",
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
          queueRuntimeFoundation: {
            blockerCount: 0,
            diagnosticCodes: [],
            dryRunEnqueueEnabled: true,
            id: "campaign-os-queue-runtime-foundation",
            liveCronExecutionEnabled: false,
            liveQueuePublishingEnabled: false,
            liveSchedulerExecutionEnabled: false,
            liveWorkerExecutionEnabled: false,
            productionReady: false,
            providerAdapter: expectedQueueProviderAdapter,
            queuePlanCount: 9,
            status: "local_ready",
            valid: true,
          },
          schedulerRuntimeFoundation: expectedSchedulerRuntimeFoundation,
          workerSchedulerFoundation: {
            blockerCount: 0,
            jobCatalogCount: 9,
            liveCronExecutionEnabled: false,
            liveQueuePublishingEnabled: false,
            liveSchedulerExecutionEnabled: false,
            liveWorkerExecutionEnabled: false,
            productionReady: false,
            schedulePolicyCount: 9,
            status: "local_ready",
            valid: true,
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
          queueRuntimeFoundation: {
            blockerCount: 0,
            diagnosticCodes: [],
            dryRunEnqueueEnabled: true,
            id: "campaign-os-queue-runtime-foundation",
            liveCronExecutionEnabled: false,
            liveQueuePublishingEnabled: false,
            liveSchedulerExecutionEnabled: false,
            liveWorkerExecutionEnabled: false,
            productionReady: false,
            providerAdapter: expectedQueueProviderAdapter,
            queuePlanCount: 9,
            status: "local_ready",
            valid: true,
          },
          schedulerRuntimeFoundation: expectedSchedulerRuntimeFoundation,
          workerSchedulerFoundation: {
            blockerCount: 0,
            jobCatalogCount: 9,
            liveCronExecutionEnabled: false,
            liveQueuePublishingEnabled: false,
            liveSchedulerExecutionEnabled: false,
            liveWorkerExecutionEnabled: false,
            productionReady: false,
            schedulePolicyCount: 9,
            status: "local_ready",
            valid: true,
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
      queueRuntimeFoundation: {
        blockerCount: 0,
        diagnosticCodes: [],
        dryRunEnqueueEnabled: true,
        id: "campaign-os-queue-runtime-foundation",
        liveCronExecutionEnabled: false,
        liveQueuePublishingEnabled: false,
        liveSchedulerExecutionEnabled: false,
        liveWorkerExecutionEnabled: false,
        productionReady: false,
        providerAdapter: expectedQueueProviderAdapter,
        queuePlanCount: 9,
        status: "local_ready",
        valid: true,
      },
      schedulerRuntimeFoundation: expectedSchedulerRuntimeFoundation,
      workerSchedulerFoundation: {
        blockerCount: 0,
        diagnosticCodes: [],
        jobCatalogCount: 9,
        liveCronExecutionEnabled: false,
        liveQueuePublishingEnabled: false,
        liveSchedulerExecutionEnabled: false,
        liveWorkerExecutionEnabled: false,
        productionReady: false,
        schedulePolicyCount: 9,
        status: "local_ready",
        valid: true,
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

  it("fails closed when scheduler runtime metadata is missing from smoke payloads", async () => {
    const fetchWithoutScheduler: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);
      const payload = await response.clone().json() as {
        data?: {
          serverRuntime?: {
            readiness?: Record<string, unknown>;
          };
        };
      };

      delete payload.data?.serverRuntime?.readiness?.schedulerRuntimeFoundation;

      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    };

    await expect(runBackendRuntimeSmoke({ fetchImpl: fetchWithoutScheduler })).rejects.toThrow(
      "Campaign OS backend runtime smoke check failed.",
    );
  });

  it("fails closed when queue provider adapter metadata is missing from smoke payloads", async () => {
    const fetchWithoutQueueProviderAdapter: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);
      const payload = await response.clone().json() as {
        data?: {
          serverRuntime?: {
            readiness?: {
              queueRuntimeFoundation?: Record<string, unknown>;
            };
          };
        };
      };

      if (payload.data?.serverRuntime?.readiness?.queueRuntimeFoundation) {
        delete payload.data.serverRuntime.readiness.queueRuntimeFoundation.providerAdapter;
      }

      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    };

    await expect(runBackendRuntimeSmoke({ fetchImpl: fetchWithoutQueueProviderAdapter })).rejects.toThrow(
      "Campaign OS backend runtime smoke check failed.",
    );
  });

  it("fails closed when queue provider adapter smoke payload enables live publishing", async () => {
    const fetchWithLiveQueueProviderFlag: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);
      const payload = await response.clone().json() as {
        data?: {
          serverRuntime?: {
            readiness?: {
              queueRuntimeFoundation?: {
                providerAdapter?: Record<string, unknown>;
              };
            };
          };
        };
      };
      const providerAdapter = payload.data?.serverRuntime?.readiness?.queueRuntimeFoundation?.providerAdapter;

      if (providerAdapter) {
        providerAdapter.liveQueuePublishingEnabled = true;
      }

      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    };

    await expect(runBackendRuntimeSmoke({ fetchImpl: fetchWithLiveQueueProviderFlag })).rejects.toThrow(
      "Campaign OS backend runtime smoke check failed.",
    );
  });

  it("fails closed when scheduler runtime smoke payload enables live scheduler execution", async () => {
    const fetchWithLiveSchedulerFlag: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);
      const payload = await response.clone().json() as {
        data?: {
          serverRuntime?: {
            readiness?: {
              schedulerRuntimeFoundation?: Record<string, unknown>;
            };
          };
        };
      };
      const schedulerRuntimeFoundation = payload.data?.serverRuntime?.readiness?.schedulerRuntimeFoundation;

      if (schedulerRuntimeFoundation) {
        schedulerRuntimeFoundation.liveSchedulerExecutionEnabled = true;
      }

      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    };

    await expect(runBackendRuntimeSmoke({ fetchImpl: fetchWithLiveSchedulerFlag })).rejects.toThrow(
      "Campaign OS backend runtime smoke check failed.",
    );
  });
});
