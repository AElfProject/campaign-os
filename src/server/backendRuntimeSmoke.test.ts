import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { analyticsIngestionWarehouseRequiredConfigKeys } from "../domain/analyticsIngestionRuntime";
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

const expectedQueuePublishingReadiness = {
  activationStatus: "disabled",
  blockerCount: 0,
  diagnosticCodes: [],
  livePublishAttempted: false,
  liveQueuePublishingEnabled: false,
  noLiveSideEffects: expect.objectContaining({
    ack: false,
    deadLetter: false,
    queueConsumption: false,
    retry: false,
    schedulerExecution: false,
    telemetryExport: false,
    workerExecution: false,
  }),
  productionReady: false,
  publishAttemptPolicy: "disabled_no_live",
  publishRequestEvaluated: false,
  publishResultStatus: "not_requested",
  publisherId: "not_configured",
  publisherProvided: false,
  requiredConfigKeys: expect.arrayContaining([
    "CAMPAIGN_OS_LIVE_QUEUE_PUBLISHING_ENABLEMENT",
    "CAMPAIGN_OS_LIVE_QUEUE_PUBLISHER",
    "CAMPAIGN_OS_PAYLOAD_REFERENCE_POLICY",
    "CAMPAIGN_OS_PUBLISHER_REDACTION_POLICY",
  ]),
  status: "disabled",
};

const expectedQueueConsumingReadiness = {
  activationStatus: "disabled",
  ackAttempted: false,
  blockerCount: 0,
  consumeAttemptPolicy: "disabled_no_live",
  consumeRequestEvaluated: false,
  consumeResultStatus: "not_requested",
  consumerId: "not_configured",
  consumerProvided: false,
  deadLetterAttempted: false,
  diagnosticCodes: [],
  handlerRegistryProvided: false,
  liveConsumeAttempted: false,
  liveQueueConsumptionEnabled: false,
  nackAttempted: false,
  noLiveSideEffects: expect.objectContaining({
    ack: false,
    analyticsWrites: false,
    contractCalls: false,
    deadLetter: false,
    handlerSideEffects: false,
    nack: false,
    objectStorageWrites: false,
    providerCalls: false,
    publishFallback: false,
    retry: false,
    rewardDistribution: false,
    schedulerExecution: false,
    telemetryExport: false,
    workerExecution: false,
  }),
  productionReady: false,
  requiredConfigKeys: expect.arrayContaining([
    "CAMPAIGN_OS_LIVE_QUEUE_CONSUME_ENABLEMENT",
    "CAMPAIGN_OS_LIVE_QUEUE_CONSUMER",
    "CAMPAIGN_OS_CONSUME_HANDLER_REGISTRY",
  ]),
  retryScheduled: false,
  status: "disabled",
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
  driverLiveQueueConsumptionEnabled: false,
  driverLiveQueuePublishingEnabled: false,
  driverLiveWorkerExecutionEnabled: false,
  driverMode: "dry_run",
  driverOperationCount: 8,
  driverProductionReady: false,
  driverProviderId: "local-fake",
  driverConsumeAckAttempted: false,
  driverConsumeAttemptPolicy: "disabled_no_live",
  driverConsumeDeadLetterAttempted: false,
  driverConsumeDiagnosticCodes: [],
  driverConsumeNackAttempted: false,
  driverConsumeRequestEvaluated: false,
  driverConsumeResultStatus: "not_requested",
  driverConsumeRetryScheduled: false,
  driverConsumingActivationStatus: "disabled",
  driverConsumingBlockerCount: 0,
  driverConsumingConsumerId: "not_configured",
  driverConsumingConsumerProvided: false,
  driverConsumingHandlerRegistryProvided: false,
  driverConsumingLiveConsumeAttempted: false,
  driverConsumingLiveQueueConsumptionEnabled: false,
  driverConsumingNoLiveSideEffects: expect.objectContaining({
    ack: false,
    analyticsWrites: false,
    contractCalls: false,
    deadLetter: false,
    handlerSideEffects: false,
    nack: false,
    objectStorageWrites: false,
    providerCalls: false,
    publishFallback: false,
    retry: false,
    rewardDistribution: false,
    schedulerExecution: false,
    telemetryExport: false,
    workerExecution: false,
  }),
  driverConsumingProductionReady: false,
  driverConsumingRequiredConfigKeys: expect.arrayContaining([
    "CAMPAIGN_OS_LIVE_QUEUE_CONSUME_ENABLEMENT",
    "CAMPAIGN_OS_LIVE_QUEUE_CONSUMER",
    "CAMPAIGN_OS_CONSUME_HANDLER_REGISTRY",
  ]),
  driverConsumingStatus: "disabled",
  driverPublishAttemptPolicy: "disabled_no_live",
  driverPublishDiagnosticCodes: [],
  driverPublishRequestEvaluated: false,
  driverPublishResultStatus: "not_requested",
  driverPublishingActivationStatus: "disabled",
  driverPublishingBlockerCount: 0,
  driverPublishingLivePublishAttempted: false,
  driverPublishingLiveQueuePublishingEnabled: false,
  driverPublishingNoLiveSideEffects: expect.objectContaining({
    ack: false,
    deadLetter: false,
    queueConsumption: false,
    retry: false,
    schedulerExecution: false,
    telemetryExport: false,
    workerExecution: false,
  }),
  driverPublishingPublisherId: "not_configured",
  driverPublishingPublisherProvided: false,
  driverPublishingRequiredConfigKeys: expect.arrayContaining([
    "CAMPAIGN_OS_LIVE_QUEUE_PUBLISHING_ENABLEMENT",
    "CAMPAIGN_OS_LIVE_QUEUE_PUBLISHER",
    "CAMPAIGN_OS_PAYLOAD_REFERENCE_POLICY",
    "CAMPAIGN_OS_PUBLISHER_REDACTION_POLICY",
  ]),
  driverPublishingStatus: "disabled",
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
  liveQueueConsumptionEnabled: false,
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

const expectedProviderClientReadiness = {
  activationStatus: "disabled",
  blockerCount: 0,
  diagnosticCodes: [],
  liveProviderCallsAttempted: false,
  productionReady: false,
  providerHttpRuntime: {
    activationStatus: "disabled",
    blockerCount: 0,
    configuredCategories: expect.arrayContaining(["indexer", "dapp_api"]),
    diagnosticCodes: [],
    endpointCount: 13,
    endpointRollout: {
      blockedCount: 0,
      configuredCategories: expect.arrayContaining(["indexer", "dapp_api", "social_api", "ai_provider"]),
      deferredCount: 2,
      diagnosticCodes: [],
      disabledCount: 0,
      enabledCount: 11,
      endpointCount: 13,
      providerFamilies: expect.arrayContaining(["aefinder", "aelfscan", "awaken", "tmrwdao"]),
      requiredConfigKeys: expect.arrayContaining([
        "CAMPAIGN_OS_PROVIDER_HTTP_AEFINDER_ENDPOINT_REF",
        "CAMPAIGN_OS_PROVIDER_HTTP_AELFSCAN_ENDPOINT_REF",
      ]),
      valid: true,
    },
    liveHttpCallsAttempted: false,
    productionReady: false,
    runtimeId: "campaign-os-provider-http-client-runtime",
    status: "disabled",
    transportProvided: false,
    valid: true,
  },
  providerClientsEnabled: false,
  providerClientsProvided: false,
  queueHandoffStatus: "disabled",
  registryClientCount: 0,
  registryProviderGroupCount: 5,
  requiredConfigKeys: expect.arrayContaining([
    "CAMPAIGN_OS_PROVIDER_CLIENT_ENABLEMENT",
    "CAMPAIGN_OS_PROVIDER_REGISTRY_URL",
    "CAMPAIGN_OS_PROVIDER_ENDPOINT_REF",
    "CAMPAIGN_OS_PROVIDER_CREDENTIAL_REF",
    "CAMPAIGN_OS_PROVIDER_CLIENT_SEAM",
    "CAMPAIGN_OS_PROVIDER_CONSUME_READINESS_HANDOFF",
    "CAMPAIGN_OS_PROVIDER_REDACTION_POLICY",
  ]),
  status: "disabled",
  valid: true,
};

const expectedAnalyticsIngestionRuntimeMetadata = {
  diagnosticCodes: expect.arrayContaining([
    "ANALYTICS_EVENT_ENVELOPE_REVIEW_REQUIRED",
    "ANALYTICS_LIVE_EXECUTION_DISABLED",
    "ANALYTICS_WAREHOUSE_HANDOFF_MISSING",
  ]),
  eventCatalogCount: 9,
  liveAnalyticsSdkExecuted: false,
  liveEventIngestionEnabled: false,
  liveEventWarehouseWrite: false,
  metricLineageCount: 9,
  productionReady: false,
  requiredConfigKeys: expect.arrayContaining([...analyticsIngestionWarehouseRequiredConfigKeys]),
  status: "blocked",
  valid: true,
  warehouseStatus: "missing",
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
          analyticsIngestionRuntime: expectedAnalyticsIngestionRuntimeMetadata,
          endpoint: "/api/contracts",
          ok: true,
          productionBackendReadiness: {
            contractsEndpoint: "/api/contracts",
            healthEndpoint: "/api/health",
            missingApiSkillIds: [],
            noLiveSideEffectsAllFalse: true,
            productionReady: false,
            profileId: "local-review",
            routeCount: expect.any(Number),
            smokeCommand: "npm run server:smoke",
            startCommand: "npm run server:start",
            status: "ready",
            traceHeaderName: "x-campaign-os-trace-id",
          },
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
          providerClientReadiness: expectedProviderClientReadiness,
          queueRuntimeFoundation: {
            blockerCount: 0,
            diagnosticCodes: [],
            dryRunEnqueueEnabled: true,
            id: "campaign-os-queue-runtime-foundation",
            liveCronExecutionEnabled: false,
            liveQueueConsumptionEnabled: false,
            liveQueueConsumingReadiness: expectedQueueConsumingReadiness,
            liveQueuePublishingEnabled: false,
            liveSchedulerExecutionEnabled: false,
            liveWorkerExecutionEnabled: false,
            productionReady: false,
            liveQueuePublishingReadiness: expectedQueuePublishingReadiness,
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
          analyticsIngestionRuntime: expectedAnalyticsIngestionRuntimeMetadata,
          endpoint: "/api/health",
          ok: true,
          productionBackendReadiness: {
            contractsEndpoint: "/api/contracts",
            healthEndpoint: "/api/health",
            missingApiSkillIds: [],
            noLiveSideEffectsAllFalse: true,
            productionReady: false,
            profileId: "local-review",
            routeCount: expect.any(Number),
            smokeCommand: "npm run server:smoke",
            startCommand: "npm run server:start",
            status: "ready",
            traceHeaderName: "x-campaign-os-trace-id",
          },
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
          providerClientReadiness: expectedProviderClientReadiness,
          queueRuntimeFoundation: {
            blockerCount: 0,
            diagnosticCodes: [],
            dryRunEnqueueEnabled: true,
            id: "campaign-os-queue-runtime-foundation",
            liveCronExecutionEnabled: false,
            liveQueueConsumptionEnabled: false,
            liveQueueConsumingReadiness: expectedQueueConsumingReadiness,
            liveQueuePublishingEnabled: false,
            liveSchedulerExecutionEnabled: false,
            liveWorkerExecutionEnabled: false,
            productionReady: false,
            liveQueuePublishingReadiness: expectedQueuePublishingReadiness,
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
      durableLocalPersistence: {
        adapterLabel: expect.stringMatching(/^local_json:/),
        countsByKind: expect.objectContaining({
          export_preview: 1,
          verification_attempt: 1,
          wallet_session: 1,
        }),
        durable: true,
        latestRecordKinds: expect.arrayContaining(["wallet_session", "verification_attempt", "export_preview"]),
        localOnly: true,
        mode: "local_json",
        noMigrationRunner: true,
        noProductionDatabase: true,
        noSecretHandling: true,
        recordCount: 3,
        restartedRecordCount: 3,
        status: "passed",
        wroteRecordKinds: expect.arrayContaining(["wallet_session", "verification_attempt", "export_preview"]),
      },
      liveSideEffectsEnabled: false,
      analyticsIngestionRuntime: {
        ...expectedAnalyticsIngestionRuntimeMetadata,
        traceId: "campaign-os-smoke-analytics-ingestion-readiness",
      },
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
      productionBackendReadiness: {
        contractsEndpoint: "/api/contracts",
        healthEndpoint: "/api/health",
        missingApiSkillIds: [],
        noLiveSideEffectsAllFalse: true,
        productionReady: false,
        profileId: "local-review",
        routeCount: expect.any(Number),
        smokeCommand: "npm run server:smoke",
        startCommand: "npm run server:start",
        status: "ready",
        traceHeaderName: "x-campaign-os-trace-id",
      },
      productionReady: false,
      providerClientReadiness: expectedProviderClientReadiness,
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
        liveQueueConsumptionEnabled: false,
        liveQueueConsumingReadiness: expectedQueueConsumingReadiness,
        liveQueuePublishingEnabled: false,
        liveSchedulerExecutionEnabled: false,
        liveWorkerExecutionEnabled: false,
        productionReady: false,
        liveQueuePublishingReadiness: expectedQueuePublishingReadiness,
        providerAdapter: expectedQueueProviderAdapter,
        queuePlanCount: 9,
        status: "local_ready",
        valid: true,
      },
      observabilityExporterFoundation: expectedObservabilityExporterFoundation,
      objectStorageExportRuntime: {
        blockerCount: expect.any(Number),
        diagnosticCodes: expect.arrayContaining([
          "OBJECT_STORAGE_APPROVAL_REQUIRED",
          "OBJECT_STORAGE_LIVE_EXECUTION_DISABLED",
        ]),
        downloadEnabled: false,
        localReviewOnly: true,
        manifestOnly: true,
        objectKeyCreated: false,
        productionReady: false,
        providerCallAttempted: false,
        providerStatus: "not_configured",
        requiredConfigKeys: expect.arrayContaining([
          "CAMPAIGN_OS_OBJECT_STORAGE_PROVIDER_REF",
          "CAMPAIGN_OS_OBJECT_STORAGE_APPROVAL_REF",
        ]),
        signedUrlCreated: false,
        status: "blocked",
        valid: true,
      },
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
        "object-storage",
        "object-storage-export",
        "reward-custody",
        "reward-distribution",
      ]),
    );
    expectNoSecretLeak(summary);
  });

  it("keeps durable local smoke output free of persistence paths", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "campaign-os-smoke-path-redaction-"));

    try {
      const summary = await runBackendRuntimeSmoke({
        env: {
          CAMPAIGN_OS_PERSISTENCE_DIR: tempDir,
          CAMPAIGN_OS_PERSISTENCE_MODE: "local_json",
        },
      });

      expect(summary.durableLocalPersistence).toMatchObject({
        mode: "local_json",
        recordCount: 3,
        restartedRecordCount: 3,
        status: "passed",
      });
      expect(JSON.stringify(summary)).not.toContain(tempDir);
      expectNoSecretLeak(summary);
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
  });

  it("fails closed when production backend readiness metadata is missing from smoke payloads", async () => {
    const fetchWithoutProductionBackendReadiness: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);
      const payload = await response.clone().json() as {
        data?: {
          productionBackendReadiness?: Record<string, unknown>;
        };
      };

      delete payload.data?.productionBackendReadiness;

      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    };

    await expect(runBackendRuntimeSmoke({ fetchImpl: fetchWithoutProductionBackendReadiness })).rejects.toThrow(
      "Campaign OS backend runtime smoke check failed.",
    );
  });

  it("fails closed when object storage export readiness metadata is missing from smoke payloads", async () => {
    const fetchWithoutObjectStorageExportRuntime: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);
      const payload = await response.clone().json() as {
        data?: {
          backendService?: {
            objectStorageExportRuntime?: Record<string, unknown>;
          };
          serverRuntime?: {
            readiness?: {
              objectStorageExportRuntime?: Record<string, unknown>;
            };
          };
        };
      };

      delete payload.data?.backendService?.objectStorageExportRuntime;
      delete payload.data?.serverRuntime?.readiness?.objectStorageExportRuntime;

      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    };

    await expect(runBackendRuntimeSmoke({ fetchImpl: fetchWithoutObjectStorageExportRuntime })).rejects.toThrow(
      "Campaign OS backend runtime smoke check failed.",
    );
  });

  it("fails closed when analytics ingestion readiness metadata is missing from smoke payloads", async () => {
    const fetchWithoutAnalyticsIngestionRuntime: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);
      const payload = await response.clone().json() as {
        data?: {
          backendService?: {
            analyticsIngestionRuntime?: Record<string, unknown>;
          };
          serverRuntime?: {
            readiness?: {
              analyticsIngestionRuntime?: Record<string, unknown>;
            };
          };
        };
      };

      delete payload.data?.backendService?.analyticsIngestionRuntime;
      delete payload.data?.serverRuntime?.readiness?.analyticsIngestionRuntime;

      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    };

    await expect(runBackendRuntimeSmoke({ fetchImpl: fetchWithoutAnalyticsIngestionRuntime })).rejects.toThrow(
      "Campaign OS backend runtime smoke check failed.",
    );
  });

  it("fails closed when provider client readiness metadata is missing from smoke payloads", async () => {
    const fetchWithoutProviderClientReadiness: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);
      const payload = await response.clone().json() as {
        data?: {
          backendService?: {
            backendRuntimeBootstrap?: {
              readiness?: Record<string, unknown>;
            };
            providerClientReadiness?: Record<string, unknown>;
          };
          serverRuntime?: {
            readiness?: Record<string, unknown>;
          };
        };
      };

      delete payload.data?.serverRuntime?.readiness?.providerClientReadiness;
      delete payload.data?.backendService?.backendRuntimeBootstrap?.readiness?.providerClientReadiness;
      delete payload.data?.backendService?.providerClientReadiness;

      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    };

    await expect(runBackendRuntimeSmoke({ fetchImpl: fetchWithoutProviderClientReadiness })).rejects.toThrow(
      "Campaign OS backend runtime smoke check failed.",
    );
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

  it("fails closed when queue provider adapter smoke payload enables live consumption", async () => {
    const fetchWithLiveQueueProviderConsumeFlag: typeof fetch = async (input, init) => {
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
        providerAdapter.liveQueueConsumptionEnabled = true;
        providerAdapter.driverConsumingLiveConsumeAttempted = true;
      }

      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    };

    await expect(runBackendRuntimeSmoke({ fetchImpl: fetchWithLiveQueueProviderConsumeFlag })).rejects.toThrow(
      "Campaign OS backend runtime smoke check failed.",
    );
  });

  it("fails closed when queue publishing readiness metadata is missing from smoke payloads", async () => {
    const fetchWithoutQueuePublishingReadiness: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);
      const payload = await response.clone().json() as {
        data?: {
          serverRuntime?: {
            readiness?: {
              queueRuntimeFoundation?: {
                liveQueuePublishingReadiness?: unknown;
                providerAdapter?: Record<string, unknown>;
              };
            };
          };
        };
      };
      const queueRuntimeFoundation = payload.data?.serverRuntime?.readiness?.queueRuntimeFoundation;

      if (queueRuntimeFoundation) {
        delete queueRuntimeFoundation.liveQueuePublishingReadiness;
        delete queueRuntimeFoundation.providerAdapter?.driverPublishingActivationStatus;
        delete queueRuntimeFoundation.providerAdapter?.driverPublishingNoLiveSideEffects;
      }

      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    };

    await expect(runBackendRuntimeSmoke({ fetchImpl: fetchWithoutQueuePublishingReadiness })).rejects.toThrow(
      "Campaign OS backend runtime smoke check failed.",
    );
  });

  it("fails closed when queue consuming readiness metadata is missing from smoke payloads", async () => {
    const fetchWithoutQueueConsumingReadiness: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);
      const payload = await response.clone().json() as {
        data?: {
          serverRuntime?: {
            readiness?: {
              queueRuntimeFoundation?: {
                liveQueueConsumingReadiness?: unknown;
                providerAdapter?: Record<string, unknown>;
              };
            };
          };
        };
      };
      const queueRuntimeFoundation = payload.data?.serverRuntime?.readiness?.queueRuntimeFoundation;

      if (queueRuntimeFoundation) {
        delete queueRuntimeFoundation.liveQueueConsumingReadiness;
        delete queueRuntimeFoundation.providerAdapter?.driverConsumingActivationStatus;
        delete queueRuntimeFoundation.providerAdapter?.driverConsumingNoLiveSideEffects;
      }

      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    };

    await expect(runBackendRuntimeSmoke({ fetchImpl: fetchWithoutQueueConsumingReadiness })).rejects.toThrow(
      "Campaign OS backend runtime smoke check failed.",
    );
  });

  it("fails closed when queue publishing readiness claims live publish effects", async () => {
    const fetchWithLiveQueuePublishingReadiness: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);
      const payload = await response.clone().json() as {
        data?: {
          serverRuntime?: {
            readiness?: {
              queueRuntimeFoundation?: {
                liveQueuePublishingReadiness?: Record<string, unknown>;
                providerAdapter?: Record<string, unknown>;
              };
            };
          };
        };
      };
      const queueRuntimeFoundation = payload.data?.serverRuntime?.readiness?.queueRuntimeFoundation;

      if (queueRuntimeFoundation) {
        queueRuntimeFoundation.liveQueuePublishingReadiness = {
          activationStatus: "disabled",
          blockerCount: 0,
          diagnosticCodes: [],
          livePublishAttempted: true,
          liveQueuePublishingEnabled: true,
          noLiveSideEffects: {
            ack: false,
            analyticsWrites: false,
            contractCalls: false,
            deadLetter: false,
            nack: false,
            objectStorageWrites: false,
            providerCalls: false,
            queueConsumption: false,
            retry: false,
            rewardDistribution: false,
            schedulerExecution: false,
            telemetryExport: false,
            workerExecution: false,
          },
          productionReady: false,
          publishAttemptPolicy: "disabled_no_live",
          publishRequestEvaluated: false,
          publishResultStatus: "not_requested",
          publisherId: "not_configured",
          publisherProvided: false,
          requiredConfigKeys: [
            "CAMPAIGN_OS_LIVE_QUEUE_PUBLISHING_ENABLEMENT",
            "CAMPAIGN_OS_LIVE_QUEUE_PUBLISHER",
          ],
          status: "disabled",
        };
      }

      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    };

    await expect(runBackendRuntimeSmoke({ fetchImpl: fetchWithLiveQueuePublishingReadiness })).rejects.toThrow(
      "Campaign OS backend runtime smoke check failed.",
    );
  });

  it("fails closed when queue consuming readiness claims live consume effects", async () => {
    const fetchWithLiveQueueConsumingReadiness: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);
      const payload = await response.clone().json() as {
        data?: {
          serverRuntime?: {
            readiness?: {
              queueRuntimeFoundation?: {
                liveQueueConsumingReadiness?: Record<string, unknown>;
              };
            };
          };
        };
      };
      const queueRuntimeFoundation = payload.data?.serverRuntime?.readiness?.queueRuntimeFoundation;

      if (queueRuntimeFoundation) {
        queueRuntimeFoundation.liveQueueConsumingReadiness = {
          activationStatus: "disabled",
          ackAttempted: false,
          blockerCount: 0,
          consumeAttemptPolicy: "disabled_no_live",
          consumeRequestEvaluated: false,
          consumeResultStatus: "not_requested",
          consumerId: "not_configured",
          consumerProvided: false,
          deadLetterAttempted: false,
          diagnosticCodes: [],
          handlerRegistryProvided: false,
          liveConsumeAttempted: true,
          liveQueueConsumptionEnabled: true,
          nackAttempted: false,
          noLiveSideEffects: {
            ack: false,
            analyticsWrites: false,
            contractCalls: false,
            deadLetter: false,
            handlerSideEffects: false,
            nack: false,
            objectStorageWrites: false,
            providerCalls: false,
            publishFallback: false,
            retry: false,
            rewardDistribution: false,
            schedulerExecution: false,
            telemetryExport: false,
            workerExecution: false,
          },
          productionReady: false,
          requiredConfigKeys: [
            "CAMPAIGN_OS_LIVE_QUEUE_CONSUME_ENABLEMENT",
            "CAMPAIGN_OS_LIVE_QUEUE_CONSUMER",
          ],
          retryScheduled: false,
          status: "disabled",
        };
      }

      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    };

    await expect(runBackendRuntimeSmoke({ fetchImpl: fetchWithLiveQueueConsumingReadiness })).rejects.toThrow(
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
