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
  driverActivationGateSatisfied: false,
  driverBlockerCount: 0,
  driverDiagnosticCodes: [],
  driverDisabledLiveOperationCount: 8,
  driverId: "local-fake-queue-provider-driver",
  driverLiveQueuePublishingEnabled: false,
  driverLiveWorkerExecutionEnabled: false,
  driverMode: "dry_run",
  driverOperationCount: 8,
  driverProductionReady: false,
  driverProviderId: "local-fake",
  driverRequiredConfigKeys: expect.arrayContaining([
    "CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER",
    "CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT",
    "CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS",
    "CAMPAIGN_OS_WORKER_QUEUE_URL",
    "CAMPAIGN_OS_DEAD_LETTER_QUEUE",
    "CAMPAIGN_OS_WORKER_RETRY_POLICY",
    "CAMPAIGN_OS_DEGRADATION_POLICY",
    "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL",
    "CAMPAIGN_OS_WORKER_LEASE_STORE_URL",
    "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
    "CAMPAIGN_OS_OPERATOR_RUNBOOK_URL",
    "CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT",
  ]),
  driverSdkBindingActivationGateSatisfied: false,
  driverSdkBindingBlockerCount: 0,
  driverSdkBindingDiagnosticCodes: [],
  driverSdkBindingDisabledLiveOperationCount: 8,
  driverSdkBindingId: "local-stub-queue-provider-sdk-binding",
  driverSdkBindingLiveProviderCallAttempted: false,
  driverSdkBindingLiveQueuePublishingEnabled: false,
  driverSdkBindingLiveWorkerExecutionEnabled: false,
  driverSdkBindingMode: "dry_run",
  driverSdkBindingOperationCount: 8,
  driverSdkBindingPackageBindingBrokerConnectionBlockerCount: 0,
  driverSdkBindingPackageBindingBrokerConnectionDiagnosticCodes: [],
  driverSdkBindingPackageBindingBrokerConnectionHealthCheckMode: "disabled",
  driverSdkBindingPackageBindingBrokerConnectionId: "redis-broker-connection-local",
  driverSdkBindingPackageBindingBrokerConnectionRequiredConfigKeys: expect.arrayContaining([
    "CAMPAIGN_OS_REDIS_URL",
    "CAMPAIGN_OS_REDIS_CREDENTIALS",
    "CAMPAIGN_OS_REDIS_TLS_POLICY",
    "CAMPAIGN_OS_REDIS_DATABASE",
    "CAMPAIGN_OS_REDIS_CONNECTION_TIMEOUT_MS",
    "CAMPAIGN_OS_REDIS_RETRY_BACKOFF_POLICY",
    "CAMPAIGN_OS_REDIS_CIRCUIT_BREAKER_POLICY",
    "CAMPAIGN_OS_REDIS_BROKER_HEALTH_CHECK_ENABLEMENT",
  ]),
  driverSdkBindingPackageBindingBrokerConnectionStatus: "local_ready",
  driverSdkBindingPackageBindingBlockerCount: 0,
  driverSdkBindingPackageBindingBrowserBundleAllowed: false,
  driverSdkBindingPackageBindingBullmqConstructionAttempted: false,
  driverSdkBindingPackageBindingBullmqConstructionBlockerCount: 0,
  driverSdkBindingPackageBindingBullmqConstructionDiagnosticCodes: [],
  driverSdkBindingPackageBindingBullmqConstructionFactoryInvoked: false,
  driverSdkBindingPackageBindingBullmqConstructionId: "bullmq-construction-local",
  driverSdkBindingPackageBindingBullmqConstructionProductionReady: false,
  driverSdkBindingPackageBindingBullmqConstructionStatus: "local_ready",
  driverSdkBindingPackageBindingDiagnosticCodes: [],
  driverSdkBindingPackageBindingFamily: "bullmq-redis-compatible",
  driverSdkBindingPackageBindingId: "bullmq-redis-package-binding-local",
  driverSdkBindingPackageBindingLiveBrokerConnectionAttempted: false,
  driverSdkBindingPackageBindingLiveBrokerHealthCheckAttempted: false,
  driverSdkBindingPackageBindingLiveQueuePublishingEnabled: false,
  driverSdkBindingPackageBindingLiveWorkerExecutionEnabled: false,
  driverSdkBindingPackageBindingPackageName: "bullmq",
  driverSdkBindingPackageBindingPackageRef: "npm:bullmq",
  driverSdkBindingPackageBindingQueueClientConstructed: false,
  driverSdkBindingPackageBindingQueueEventsConstructed: false,
  driverSdkBindingPackageBindingSdkClientConstructed: false,
  driverSdkBindingPackageBindingStatus: "local_ready",
  driverSdkBindingPackageBindingWorkerConstructed: false,
  driverSdkBindingProductionReady: false,
  driverSdkBindingProviderKind: "local-stub",
  driverSdkBindingRequiredConfigKeys: expect.arrayContaining([
    "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE",
    "CAMPAIGN_OS_QUEUE_PROVIDER_BINDING",
    "CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT",
    "CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE",
    "CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING",
    "CAMPAIGN_OS_REDIS_URL",
  ]),
  driverSdkBindingSdkClientConstructed: false,
  driverSdkBindingSdkPackageRef: "local-stub-sdk-package",
  driverSdkBindingStatus: "local_ready",
  driverSdkBindingValid: true,
  driverStatus: "local_ready",
  driverValid: true,
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

const expectedWorkerLeaseStoreFoundation = {
  adapterId: "local-dry-run-worker-lease-store-adapter",
  blockerCount: 0,
  diagnosticCodes: [],
  disabledLiveOperationCount: 8,
  id: "campaign-os-worker-lease-store-foundation",
  liveQueuePublishingEnabled: false,
  liveWorkerExecutionEnabled: false,
  mode: "dry_run",
  operationCount: 8,
  productionReady: false,
  requiredConfigKeys: expect.arrayContaining([
    "CAMPAIGN_OS_WORKER_LEASE_STORE",
    "CAMPAIGN_OS_WORKER_LEASE_STORE_URL",
    "CAMPAIGN_OS_WORKER_LEASE_CREDENTIALS",
    "CAMPAIGN_OS_CLOCK_SOURCE",
    "CAMPAIGN_OS_WORKER_LEASE_HEARTBEAT_SECONDS",
    "CAMPAIGN_OS_WORKER_LEASE_TTL_SECONDS",
    "CAMPAIGN_OS_WORKER_LEASE_RELEASE_POLICY",
    "CAMPAIGN_OS_WORKER_LEASE_STALE_RECOVERY_POLICY",
    "CAMPAIGN_OS_WORKER_LEASE_FENCING_POLICY",
    "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL",
    "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
  ]),
  status: "local_ready",
  storeId: "local-dry-run",
  valid: true,
};

const expectedWorkerIdempotencyStoreFoundation = {
  adapterId: "local-dry-run-worker-idempotency-store-adapter",
  blockerCount: 0,
  diagnosticCodes: [],
  disabledLiveOperationCount: 8,
  id: "campaign-os-worker-idempotency-store-foundation",
  keySchemaVersion: "v1",
  liveIdempotencyExecutionEnabled: false,
  liveQueuePublishingEnabled: false,
  liveWorkerExecutionEnabled: false,
  mode: "dry_run",
  namespace: "campaign-os-workers",
  operationCount: 8,
  productionReady: false,
  requiredConfigKeys: expect.arrayContaining([
    "CAMPAIGN_OS_IDEMPOTENCY_STORE",
    "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL",
    "CAMPAIGN_OS_IDEMPOTENCY_STORE_CREDENTIALS",
    "CAMPAIGN_OS_IDEMPOTENCY_NAMESPACE",
    "CAMPAIGN_OS_IDEMPOTENCY_KEY_SCHEMA_VERSION",
    "CAMPAIGN_OS_IDEMPOTENCY_RETENTION_DAYS",
    "CAMPAIGN_OS_IDEMPOTENCY_CONFLICT_POLICY",
    "CAMPAIGN_OS_IDEMPOTENCY_COMPLETION_POLICY",
    "CAMPAIGN_OS_CLOCK_SOURCE",
    "CAMPAIGN_OS_WORKER_LEASE_STORE_URL",
    "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
  ]),
  status: "local_ready",
  storeId: "local-dry-run",
  valid: true,
};

const expectedObservabilityExporterFoundation = {
  adapterId: "local-dry-run-observability-exporter-adapter",
  blockerCount: 0,
  diagnosticCodes: [],
  disabledLiveOperationCount: 8,
  exporterId: "local-dry-run",
  id: "campaign-os-observability-exporter-foundation",
  liveAlertRoutingEnabled: false,
  liveLogExportEnabled: false,
  liveMetricsExportEnabled: false,
  liveTelemetryExportEnabled: false,
  liveTraceExportEnabled: false,
  metricNamespace: "campaign-os-runtime",
  mode: "dry_run",
  operationCount: 8,
  productionReady: false,
  requiredConfigKeys: expect.arrayContaining([
    "CAMPAIGN_OS_OBSERVABILITY_EXPORTER",
    "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
    "CAMPAIGN_OS_OBSERVABILITY_SINK",
    "CAMPAIGN_OS_OBSERVABILITY_TRACE_COLLECTOR_URL",
    "CAMPAIGN_OS_OBSERVABILITY_LOG_SINK_URL",
  ]),
  sinkId: "local-metrics-sink",
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
          observabilityExporterFoundation: expectedObservabilityExporterFoundation,
          schedulerRuntimeFoundation: expectedSchedulerRuntimeFoundation,
          workerIdempotencyStoreFoundation: expectedWorkerIdempotencyStoreFoundation,
          workerLeaseStoreFoundation: expectedWorkerLeaseStoreFoundation,
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
          observabilityExporterFoundation: expectedObservabilityExporterFoundation,
          schedulerRuntimeFoundation: expectedSchedulerRuntimeFoundation,
          workerIdempotencyStoreFoundation: expectedWorkerIdempotencyStoreFoundation,
          workerLeaseStoreFoundation: expectedWorkerLeaseStoreFoundation,
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
      observabilityExporterFoundation: expectedObservabilityExporterFoundation,
      schedulerRuntimeFoundation: expectedSchedulerRuntimeFoundation,
      workerIdempotencyStoreFoundation: expectedWorkerIdempotencyStoreFoundation,
      workerLeaseStoreFoundation: expectedWorkerLeaseStoreFoundation,
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

  it("fails closed when worker lease store metadata is missing from smoke payloads", async () => {
    const fetchWithoutWorkerLeaseStore: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);
      const payload = await response.clone().json() as {
        data?: {
          serverRuntime?: {
            readiness?: Record<string, unknown>;
          };
        };
      };

      delete payload.data?.serverRuntime?.readiness?.workerLeaseStoreFoundation;

      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    };

    await expect(runBackendRuntimeSmoke({ fetchImpl: fetchWithoutWorkerLeaseStore })).rejects.toThrow(
      "Campaign OS backend runtime smoke check failed.",
    );
  });

  it("fails closed when worker idempotency store metadata is missing from smoke payloads", async () => {
    const fetchWithoutWorkerIdempotencyStore: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);
      const payload = await response.clone().json() as {
        data?: {
          serverRuntime?: {
            readiness?: Record<string, unknown>;
          };
        };
      };

      delete payload.data?.serverRuntime?.readiness?.workerIdempotencyStoreFoundation;

      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    };

    await expect(runBackendRuntimeSmoke({ fetchImpl: fetchWithoutWorkerIdempotencyStore })).rejects.toThrow(
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

  it("fails closed when queue provider driver metadata is missing from smoke payloads", async () => {
    const fetchWithoutQueueProviderDriver: typeof fetch = async (input, init) => {
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

      if (payload.data?.serverRuntime?.readiness?.queueRuntimeFoundation?.providerAdapter) {
        delete payload.data.serverRuntime.readiness.queueRuntimeFoundation.providerAdapter.driverId;
        delete payload.data.serverRuntime.readiness.queueRuntimeFoundation.providerAdapter.driverProviderId;
      }

      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    };

    await expect(runBackendRuntimeSmoke({ fetchImpl: fetchWithoutQueueProviderDriver })).rejects.toThrow(
      "Campaign OS backend runtime smoke check failed.",
    );
  });

  it("fails closed when queue provider sdk binding metadata is missing from smoke payloads", async () => {
    const fetchWithoutQueueProviderSdkBinding: typeof fetch = async (input, init) => {
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
        delete providerAdapter.driverSdkBindingId;
        delete providerAdapter.driverSdkBindingProviderKind;
        delete providerAdapter.driverSdkBindingSdkPackageRef;
      }

      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    };

    await expect(runBackendRuntimeSmoke({ fetchImpl: fetchWithoutQueueProviderSdkBinding })).rejects.toThrow(
      "Campaign OS backend runtime smoke check failed.",
    );
  });

  it("fails closed when queue provider driver smoke payload enables live effects", async () => {
    const fetchWithLiveQueueProviderDriver: typeof fetch = async (input, init) => {
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

      if (payload.data?.serverRuntime?.readiness?.queueRuntimeFoundation?.providerAdapter) {
        payload.data.serverRuntime.readiness.queueRuntimeFoundation.providerAdapter.driverLiveQueuePublishingEnabled = true;
        payload.data.serverRuntime.readiness.queueRuntimeFoundation.providerAdapter.driverLiveWorkerExecutionEnabled = true;
      }

      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    };

    await expect(runBackendRuntimeSmoke({ fetchImpl: fetchWithLiveQueueProviderDriver })).rejects.toThrow(
      "Campaign OS backend runtime smoke check failed.",
    );
  });

  it("fails closed when queue provider sdk binding smoke payload claims live provider or worker effects", async () => {
    const fetchWithLiveQueueProviderSdkBinding: typeof fetch = async (input, init) => {
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
        providerAdapter.driverSdkBindingLiveProviderCallAttempted = true;
        providerAdapter.driverSdkBindingLiveWorkerExecutionEnabled = true;
      }

      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    };

    await expect(runBackendRuntimeSmoke({ fetchImpl: fetchWithLiveQueueProviderSdkBinding })).rejects.toThrow(
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

  it("fails closed when worker lease smoke payload enables live worker execution", async () => {
    const fetchWithLiveWorkerLeaseFlag: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);
      const payload = await response.clone().json() as {
        data?: {
          serverRuntime?: {
            readiness?: {
              workerLeaseStoreFoundation?: Record<string, unknown>;
            };
          };
        };
      };
      const workerLeaseStoreFoundation = payload.data?.serverRuntime?.readiness?.workerLeaseStoreFoundation;

      if (workerLeaseStoreFoundation) {
        workerLeaseStoreFoundation.liveWorkerExecutionEnabled = true;
      }

      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    };

    await expect(runBackendRuntimeSmoke({ fetchImpl: fetchWithLiveWorkerLeaseFlag })).rejects.toThrow(
      "Campaign OS backend runtime smoke check failed.",
    );
  });

  it("fails closed when worker idempotency smoke payload enables live idempotency execution", async () => {
    const fetchWithLiveIdempotencyFlag: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);
      const payload = await response.clone().json() as {
        data?: {
          serverRuntime?: {
            readiness?: {
              workerIdempotencyStoreFoundation?: Record<string, unknown>;
            };
          };
        };
      };
      const workerIdempotencyStoreFoundation = payload.data?.serverRuntime?.readiness?.workerIdempotencyStoreFoundation;

      if (workerIdempotencyStoreFoundation) {
        workerIdempotencyStoreFoundation.liveIdempotencyExecutionEnabled = true;
      }

      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    };

    await expect(runBackendRuntimeSmoke({ fetchImpl: fetchWithLiveIdempotencyFlag })).rejects.toThrow(
      "Campaign OS backend runtime smoke check failed.",
    );
  });

  it("fails closed when observability exporter metadata is missing from smoke payloads", async () => {
    const fetchWithoutObservabilityExporter: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);
      const payload = await response.clone().json() as {
        data?: {
          serverRuntime?: {
            readiness?: Record<string, unknown>;
          };
        };
      };

      delete payload.data?.serverRuntime?.readiness?.observabilityExporterFoundation;

      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    };

    await expect(runBackendRuntimeSmoke({ fetchImpl: fetchWithoutObservabilityExporter })).rejects.toThrow(
      "Campaign OS backend runtime smoke check failed.",
    );
  });

  it("fails closed when observability smoke payload enables live telemetry export", async () => {
    const fetchWithLiveObservabilityFlag: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);
      const payload = await response.clone().json() as {
        data?: {
          serverRuntime?: {
            readiness?: {
              observabilityExporterFoundation?: Record<string, unknown>;
            };
          };
        };
      };
      const observabilityExporterFoundation =
        payload.data?.serverRuntime?.readiness?.observabilityExporterFoundation;

      if (observabilityExporterFoundation) {
        observabilityExporterFoundation.liveTelemetryExportEnabled = true;
      }

      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    };

    await expect(runBackendRuntimeSmoke({ fetchImpl: fetchWithLiveObservabilityFlag })).rejects.toThrow(
      "Campaign OS backend runtime smoke check failed.",
    );
  });
});
