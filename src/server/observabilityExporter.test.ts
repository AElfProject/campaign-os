import { describe, expect, it } from "vitest";
import {
  SUPPORTED_OBSERVABILITY_EXPORTER_PROFILES,
  captureObservabilityDryRun,
  createObservabilityExporterFoundation,
  observabilityExporterNoLiveFlags,
  observabilityExporterOperationCapabilities,
  observabilityExporterProductionPreconditions,
  redactObservabilityExporterValue,
} from "./observabilityExporter";
import {
  createLiveQueuePublishingReadiness,
  type LiveQueuePublisher,
} from "./liveQueuePublishingReadiness";
import { createQueueProviderPackageBinding } from "./queueProviderPackageBinding";
import type { BullmqConstructionFactory } from "./bullmqConstructionReadiness";

const queueProviderSdkBindingConfigKeys = [
  "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE",
  "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_BINDING",
  "CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER",
  "CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT",
  "CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS",
  "CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT",
];

const queueProviderSdkBindingReadyEnv = {
  CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS: "Bearer queue-secret-token",
  CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER: "production-provider-driver",
  CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT: "https://queue-user:queue-pass@queue.invalid/jobs?token=queue-secret",
  CAMPAIGN_OS_QUEUE_PROVIDER_SDK_BINDING: "production-provider-sdk-binding",
  CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE: "package-ref:@provider/queue-sdk",
} satisfies Record<string, unknown>;

const queueProviderPackageBindingReadyEnv = {
  CAMPAIGN_OS_DEAD_LETTER_QUEUE: "dead-letter-ref:queue-package",
  CAMPAIGN_OS_DEGRADATION_POLICY: "degradation:manual-review",
  CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "idempotency-store-ref:queue-package",
  CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_LIVE_QUEUE_PUBLISHER: "test-live-queue-publisher",
  CAMPAIGN_OS_LIVE_QUEUE_PUBLISHING_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "observability-ref:queue-package",
  CAMPAIGN_OS_OPERATOR_RUNBOOK_URL: "runbook-ref:queue-package",
  CAMPAIGN_OS_PAYLOAD_REFERENCE_POLICY: "payload-reference-policy:hash-or-reference",
  CAMPAIGN_OS_PUBLISHER_REDACTION_POLICY: "publisher-redaction:strict",
  CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS: "credential-ref:queue-package",
  CAMPAIGN_OS_QUEUE_PROVIDER_KIND: "redis-compatible",
  CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE: "bullmq",
  CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING: "bullmq-redis-package-binding-production",
  CAMPAIGN_OS_REDIS_BROKER_HEALTH_CHECK_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_REDIS_CIRCUIT_BREAKER_POLICY: "circuit-closed",
  CAMPAIGN_OS_REDIS_CONNECTION_TIMEOUT_MS: "500",
  CAMPAIGN_OS_REDIS_CREDENTIALS: "redis-auth-ref:queue-package",
  CAMPAIGN_OS_REDIS_DATABASE: "redis-db-0",
  CAMPAIGN_OS_REDIS_RETRY_BACKOFF_POLICY: "retry-exponential",
  CAMPAIGN_OS_REDIS_TLS_POLICY: "tls-required",
  CAMPAIGN_OS_REDIS_URL: "redis-ref:campaign-os",
  CAMPAIGN_OS_WORKER_LEASE_STORE_URL: "lease-store-ref:queue-package",
  CAMPAIGN_OS_WORKER_QUEUE_URL: "queue-ref:queue-package",
  CAMPAIGN_OS_WORKER_RETRY_POLICY: "retry:exponential",
} satisfies Record<string, unknown>;

const bullmqConstructionReadyEnv = {
  ...queueProviderPackageBindingReadyEnv,
  CAMPAIGN_OS_BULLMQ_CONSTRUCTION_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_BULLMQ_CONSTRUCTION_FACTORY: "factory-ref:bullmq-construction",
} satisfies Record<string, unknown>;

const constructedBullmqFactory: BullmqConstructionFactory = {
  factoryId: "observability-bullmq-construction-factory",
  construct: () => ({
    queueClient: { clientId: "queue-client-ref", constructed: true },
    queueEvents: { clientId: "queue-events-ref", constructed: true },
    worker: { clientId: "worker-client-ref", constructed: true },
  }),
};

const liveQueuePublisher: LiveQueuePublisher = {
  publish: () => ({
    operationId: "publish-verification-jobs-task-verification-worker",
    providerReference: "provider-ref:accepted",
    status: "accepted",
  }),
  publisherId: "test-live-queue-publisher",
};

describe("observability exporter foundation", () => {
  it("declares a stable foundation id and supported profiles", () => {
    const foundation = createObservabilityExporterFoundation();

    expect(foundation.id).toBe("campaign-os-observability-exporter-foundation");
    expect(SUPPORTED_OBSERVABILITY_EXPORTER_PROFILES).toEqual([
      "local-review",
      "staging-scaffold",
      "production-required",
    ]);
  });

  it("keeps local review deterministic, valid, and free of live telemetry export", () => {
    const startedAt = performance.now();
    const foundation = createObservabilityExporterFoundation({ profileId: "local-review" });
    const capture = captureObservabilityDryRun({
      eventCategory: "queue",
      labels: {
        queue_id: "local-review",
        runtime: "queue-runtime",
      },
      metricName: "queue.dry_run.accepted",
      observedAt: "2026-07-07T21:05:00Z",
      operation: "metrics",
      payloadReference: "payload-ref:queue:dry-run",
      sourceRuntime: "queue-runtime",
      traceId: "trace-observability-local",
    });
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(100);
    expect(foundation.profileId).toBe("local-review");
    expect(foundation.status).toBe("local_ready");
    expect(foundation.mode).toBe("dry_run");
    expect(foundation.exporterId).toBe("local-dry-run");
    expect(foundation.sinkId).toBe("local-metrics-sink");
    expect(foundation.adapterId).toBe("local-dry-run-observability-exporter-adapter");
    expect(foundation.metricNamespace).toBe("campaign-os-runtime");
    expect(foundation.valid).toBe(true);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.noLiveFlags).toEqual(observabilityExporterNoLiveFlags);
    expect(foundation.blockerCount).toBe(0);
    expect(foundation.diagnosticCodes).toEqual([]);
    expect(foundation.readiness).toMatchObject({
      disabledLiveOperationCount: observabilityExporterOperationCapabilities.length,
      exporterId: "local-dry-run",
      liveAlertRoutingEnabled: false,
      liveLogExportEnabled: false,
      liveMetricsExportEnabled: false,
      liveTelemetryExportEnabled: false,
      liveTraceExportEnabled: false,
      operationCount: observabilityExporterOperationCapabilities.length,
      productionReady: false,
      sinkId: "local-metrics-sink",
    });
    expect(capture.status).toBe("accepted_dry_run");
    expect(capture.liveTelemetryExportAttempted).toBe(false);
    expect(capture.productionWriteAttempted).toBe(false);
  });

  it("keeps every observability operation metadata-only or disabled for staging", () => {
    const foundation = createObservabilityExporterFoundation({
      exporterId: "metadata-only",
      profileId: "staging-scaffold",
      sinkId: "metadata-only",
    });

    expect(foundation.status).toBe("scaffolded");
    expect(foundation.mode).toBe("metadata_only");
    expect(foundation.valid).toBe(true);
    expect(foundation.operationCapabilities.map((item) => item.operation)).toEqual([
      "metrics",
      "logs",
      "traces",
      "alerts",
      "retry",
      "dead_letter",
      "sampling",
      "redaction",
    ]);
    expect(foundation.operationCapabilities.every((item) => item.liveEnabled === false)).toBe(true);
    expect(foundation.noLiveFlags).toEqual({
      liveAlertRoutingEnabled: false,
      liveAnalyticsIngestionEnabled: false,
      liveContractCallsEnabled: false,
      liveDeadLetterPublishingEnabled: false,
      liveLogExportEnabled: false,
      liveMetricsExportEnabled: false,
      liveObjectStorageEnabled: false,
      liveProviderCallsEnabled: false,
      liveQueuePublishingEnabled: false,
      liveRetryExecutionEnabled: false,
      liveRewardDistributionEnabled: false,
      liveTelemetryExportEnabled: false,
      liveTraceExportEnabled: false,
      liveWorkerExecutionEnabled: false,
    });
  });

  it("treats queue provider SDK binding metrics readiness as observability metadata only", () => {
    const foundation = createObservabilityExporterFoundation({
      env: queueProviderSdkBindingReadyEnv,
      profileId: "local-review",
    });
    const capture = captureObservabilityDryRun({
      eventCategory: "queue",
      labels: {
        runtime: "queue-provider-adapter",
      },
      metricName: "queue.driver.metadata_ready",
      operation: "metrics",
      payloadReference: "payload-ref:queue:driver-readiness",
      sourceRuntime: "queue-provider-adapter",
      traceId: "trace-observability-sdk-binding-metadata",
    });
    const serialized = JSON.stringify(foundation);

    expect(foundation.readiness.queueProviderSdkBindingMetricsMetadata).toEqual({
      activationGateSatisfied: true,
      configuredConfigKeys: queueProviderSdkBindingConfigKeys,
      handoffMode: "metadata_only",
      liveAlertRoutingEnabled: false,
      liveLogExportEnabled: false,
      liveMetricsExportEnabled: false,
      liveTelemetryExportEnabled: false,
      liveTraceExportEnabled: false,
      requiredConfigKeys: queueProviderSdkBindingConfigKeys,
      source: "queue-provider-sdk-binding-readiness",
      status: "configured_metadata_only",
      vendorSdkCallsEnabled: false,
    });
    expect(foundation.noLiveFlags).toEqual(observabilityExporterNoLiveFlags);
    expect(foundation.operationCapabilities.every((capability) => capability.liveEnabled === false)).toBe(true);
    expect(capture).toMatchObject({
      liveAlertRoutingEnabled: false,
      liveLogExportEnabled: false,
      liveMetricsExportEnabled: false,
      liveTelemetryExportAttempted: false,
      liveTraceExportEnabled: false,
      productionWriteAttempted: false,
      status: "accepted_dry_run",
    });
    expect(serialized).not.toContain("queue-user");
    expect(serialized).not.toContain("queue-pass");
    expect(serialized).not.toContain("queue-secret");
    expect(serialized).not.toContain("queue-secret-token");
    expect(serialized).not.toContain("@provider/queue-sdk");
  });

  it("does not treat queue provider package binding readiness as telemetry exporter readiness", () => {
    const packageBinding = createQueueProviderPackageBinding({
      env: queueProviderPackageBindingReadyEnv,
      profileId: "production-required",
    });
    const foundation = createObservabilityExporterFoundation({
      env: queueProviderPackageBindingReadyEnv,
      profileId: "production-required",
    });
    const capture = captureObservabilityDryRun({
      eventCategory: "queue",
      metricName: "queue.package_binding.metadata_ready",
      operation: "metrics",
      payloadReference: "payload-ref:queue:package-binding",
      sourceRuntime: "queue-provider-package-binding",
      traceId: "trace-observability-package-binding-metadata",
    });
    const serialized = JSON.stringify({ foundation, packageBinding });

    expect(packageBinding.valid).toBe(true);
    expect(packageBinding.productionReady).toBe(false);
    expect(packageBinding.liveBrokerConnectionAttempted).toBe(false);
    expect(packageBinding.liveBrokerHealthCheckAttempted).toBe(false);
    expect(packageBinding.queueClientConstructed).toBe(false);
    expect(packageBinding.queueEventsConstructed).toBe(false);
    expect(packageBinding.sdkClientConstructed).toBe(false);
    expect(packageBinding.workerConstructed).toBe(false);
    expect(packageBinding.brokerConnection).toMatchObject({
      healthCheckMode: "metadata_only",
      liveBrokerHealthCheckAttempted: false,
      status: "scaffolded",
    });
    expect(foundation.status).toBe("blocked");
    expect(foundation.valid).toBe(false);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "OBSERVABILITY_EXPORTER_MISSING",
        "OBSERVABILITY_CREDENTIALS_MISSING",
        "OBSERVABILITY_SINK_MISSING",
      ]),
    );
    expect(foundation.readiness.liveTelemetryExportEnabled).toBe(false);
    expect(foundation.noLiveFlags).toEqual(observabilityExporterNoLiveFlags);
    expect(capture).toMatchObject({
      liveMetricsExportEnabled: false,
      liveTelemetryExportAttempted: false,
      productionWriteAttempted: false,
      status: "rejected",
    });
    expect(serialized).not.toContain("redis://");
    expect(serialized).not.toContain("redis-pass");
    expect(serialized).not.toContain("redis-secret");
    expect(serialized).not.toContain("queue-package-secret-token");
  });

  it("keeps constructed BullMQ clients from satisfying telemetry exporter readiness", () => {
    const packageBinding = createQueueProviderPackageBinding({
      constructionFactory: constructedBullmqFactory,
      env: bullmqConstructionReadyEnv,
      profileId: "production-required",
    });
    const foundation = createObservabilityExporterFoundation({
      env: bullmqConstructionReadyEnv,
      profileId: "production-required",
    });
    const capture = captureObservabilityDryRun({
      eventCategory: "queue",
      metricName: "queue.package_binding.metadata_ready",
      operation: "metrics",
      payloadReference: "payload-ref:queue:package-binding",
      sourceRuntime: "queue-provider-package-binding",
      traceId: "trace-constructed-bullmq-observability-separation",
    });

    expect(packageBinding).toMatchObject({
      bullmqConstructionStatus: "constructed",
      liveBrokerConnectionAttempted: false,
      liveBrokerHealthCheckAttempted: false,
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      productionReady: false,
      queueClientConstructed: true,
      queueEventsConstructed: true,
      sdkClientConstructed: false,
      workerConstructed: true,
    });
    expect(foundation.status).toBe("blocked");
    expect(foundation.valid).toBe(false);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "OBSERVABILITY_EXPORTER_MISSING",
        "OBSERVABILITY_CREDENTIALS_MISSING",
        "OBSERVABILITY_SINK_MISSING",
      ]),
    );
    expect(foundation.readiness.liveTelemetryExportEnabled).toBe(false);
    expect(foundation.noLiveFlags).toEqual(observabilityExporterNoLiveFlags);
    expect(foundation.operationCapabilities.every((capability) => capability.liveEnabled === false)).toBe(true);
    expect(capture).toMatchObject({
      liveMetricsExportEnabled: false,
      liveTelemetryExportAttempted: false,
      productionWriteAttempted: false,
      status: "rejected",
    });
  });

  it("fails closed for production-required when observability preconditions are missing", () => {
    const foundation = createObservabilityExporterFoundation({
      exporterId: "production-observability-exporter",
      profileId: "production-required",
      sinkId: "production-metrics-sink",
    });

    expect(foundation.status).toBe("blocked");
    expect(foundation.valid).toBe(false);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.blockerCount).toBe(observabilityExporterProductionPreconditions.length);
    expect(foundation.diagnosticCodes).toEqual([
      "OBSERVABILITY_EXPORTER_MISSING",
      "OBSERVABILITY_ENDPOINT_MISSING",
      "OBSERVABILITY_CREDENTIALS_MISSING",
      "OBSERVABILITY_SINK_MISSING",
      "OBSERVABILITY_METRIC_NAMESPACE_MISSING",
      "OBSERVABILITY_RETENTION_POLICY_MISSING",
      "OBSERVABILITY_TRACE_COLLECTOR_MISSING",
      "OBSERVABILITY_LOG_SINK_MISSING",
      "OBSERVABILITY_ALERT_ROUTING_MISSING",
      "OBSERVABILITY_RETRY_DEAD_LETTER_POLICY_MISSING",
      "OBSERVABILITY_REDACTION_POLICY_MISSING",
      "OBSERVABILITY_RUNBOOK_MISSING",
    ]);
  });

  it("can report production-required config shape without becoming production ready", () => {
    const foundation = createObservabilityExporterFoundation({
      env: {
        CAMPAIGN_OS_OBSERVABILITY_ALERT_ROUTING: "alert-routing:manual-review",
        CAMPAIGN_OS_OBSERVABILITY_EXPORTER: "production-observability-exporter",
        CAMPAIGN_OS_OBSERVABILITY_EXPORTER_CREDENTIALS: "credential-ref:observability",
        CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "observability-ref:exporter",
        CAMPAIGN_OS_OBSERVABILITY_LOG_SINK_URL: "log-sink-ref:structured",
        CAMPAIGN_OS_OBSERVABILITY_METRIC_NAMESPACE: "campaign-os-runtime",
        CAMPAIGN_OS_OBSERVABILITY_REDACTION_POLICY: "redaction:strict",
        CAMPAIGN_OS_OBSERVABILITY_RETENTION_DAYS: "30",
        CAMPAIGN_OS_OBSERVABILITY_RETRY_DEAD_LETTER_POLICY: "retry:manual-dead-letter",
        CAMPAIGN_OS_OBSERVABILITY_RUNBOOK_URL: "runbook-ref:observability",
        CAMPAIGN_OS_OBSERVABILITY_SINK: "production-metrics-sink",
        CAMPAIGN_OS_OBSERVABILITY_TRACE_COLLECTOR_URL: "trace-collector-ref:structured",
      },
      profileId: "production-required",
    });

    expect(foundation.status).toBe("scaffolded");
    expect(foundation.valid).toBe(true);
    expect(foundation.profileId).toBe("production-required");
    expect(foundation.mode).toBe("production_required");
    expect(foundation.exporterId).toBe("production-observability-exporter");
    expect(foundation.sinkId).toBe("production-metrics-sink");
    expect(foundation.productionReady).toBe(false);
    expect(foundation.noLiveFlags.liveTelemetryExportEnabled).toBe(false);
    expect(foundation.operationCapabilities.every((item) => item.liveEnabled === false)).toBe(true);
  });

  it("keeps ready live publishing metadata from enabling telemetry export or downstream writes", () => {
    const publishingReadiness = createLiveQueuePublishingReadiness({
      constructionFactory: constructedBullmqFactory,
      env: bullmqConstructionReadyEnv,
      profileId: "production-required",
      publisher: liveQueuePublisher,
    });
    const foundation = createObservabilityExporterFoundation({
      env: {
        ...bullmqConstructionReadyEnv,
        CAMPAIGN_OS_OBSERVABILITY_ALERT_ROUTING: "alert-routing:manual-review",
        CAMPAIGN_OS_OBSERVABILITY_EXPORTER: "production-observability-exporter",
        CAMPAIGN_OS_OBSERVABILITY_EXPORTER_CREDENTIALS: "credential-ref:observability",
        CAMPAIGN_OS_OBSERVABILITY_LOG_SINK_URL: "log-sink-ref:structured",
        CAMPAIGN_OS_OBSERVABILITY_METRIC_NAMESPACE: "campaign-os-runtime",
        CAMPAIGN_OS_OBSERVABILITY_REDACTION_POLICY: "redaction:strict",
        CAMPAIGN_OS_OBSERVABILITY_RETENTION_DAYS: "30",
        CAMPAIGN_OS_OBSERVABILITY_RETRY_DEAD_LETTER_POLICY: "retry:manual-dead-letter",
        CAMPAIGN_OS_OBSERVABILITY_RUNBOOK_URL: "runbook-ref:observability",
        CAMPAIGN_OS_OBSERVABILITY_SINK: "production-metrics-sink",
        CAMPAIGN_OS_OBSERVABILITY_TRACE_COLLECTOR_URL: "trace-collector-ref:structured",
      },
      profileId: "production-required",
    });
    const capture = captureObservabilityDryRun({
      eventCategory: "queue",
      metricName: "queue.live_publishing.ready",
      operation: "metrics",
      payloadReference: "payload-ref:queue:live-publishing-ready",
      sourceRuntime: "queue-runtime",
      traceId: "trace-ready-publishing-observability-separation",
    });

    expect(publishingReadiness).toMatchObject({
      liveQueuePublishingEnabled: true,
      publishAttemptAllowed: true,
      status: "ready",
      valid: true,
    });
    expect(foundation).toMatchObject({
      productionReady: false,
    });
    expect(foundation.noLiveFlags).toEqual(observabilityExporterNoLiveFlags);
    expect(foundation.noLiveFlags).toMatchObject({
      liveAnalyticsIngestionEnabled: false,
      liveContractCallsEnabled: false,
      liveObjectStorageEnabled: false,
      liveProviderCallsEnabled: false,
      liveQueuePublishingEnabled: false,
      liveRewardDistributionEnabled: false,
      liveTelemetryExportEnabled: false,
      liveWorkerExecutionEnabled: false,
    });
    expect(foundation.readiness).toMatchObject({
      liveAlertRoutingEnabled: false,
      liveLogExportEnabled: false,
      liveMetricsExportEnabled: false,
      liveTelemetryExportEnabled: false,
      liveTraceExportEnabled: false,
      productionReady: false,
    });
    expect(foundation.operationCapabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ liveEnabled: false, operation: "alerts" }),
        expect.objectContaining({ liveEnabled: false, operation: "dead_letter" }),
        expect.objectContaining({ liveEnabled: false, operation: "metrics" }),
        expect.objectContaining({ liveEnabled: false, operation: "retry" }),
        expect.objectContaining({ liveEnabled: false, operation: "traces" }),
      ]),
    );
    expect(capture).toMatchObject({
      liveMetricsExportEnabled: false,
      liveTelemetryExportAttempted: false,
      productionWriteAttempted: false,
      status: "accepted_dry_run",
    });
  });

  it("returns accepted, rejected, and dropped dry-run outcomes without live export", () => {
    const accepted = captureObservabilityDryRun({
      eventCategory: "scheduler",
      labels: {
        runtime: "scheduler-runtime",
        schedule_id: "local-review",
      },
      metricName: "scheduler.dry_run.accepted",
      operation: "metrics",
      payloadReference: "payload-ref:scheduler:local",
      sourceRuntime: "scheduler-runtime",
      traceId: "trace-observability-accepted",
    });
    const rejected = captureObservabilityDryRun({
      eventCategory: "unknown-category",
      metricName: "scheduler.dry_run.accepted",
      operation: "metrics",
      sourceRuntime: "scheduler-runtime",
      traceId: "trace-observability-rejected",
    });
    const dropped = captureObservabilityDryRun({
      captureMode: "drop",
      eventCategory: "backend",
      metricName: "backend.dry_run.sampled",
      operation: "sampling",
      sourceRuntime: "backend-service",
      traceId: "trace-observability-dropped",
    });

    expect(accepted).toMatchObject({
      accepted: true,
      diagnosticCodes: [],
      liveTelemetryExportAttempted: false,
      productionWriteAttempted: false,
      status: "accepted_dry_run",
    });
    expect(rejected).toMatchObject({
      accepted: false,
      diagnosticCodes: ["UNKNOWN_OBSERVABILITY_EVENT_CATEGORY"],
      liveTelemetryExportAttempted: false,
      productionWriteAttempted: false,
      status: "rejected",
    });
    expect(dropped).toMatchObject({
      accepted: false,
      diagnosticCodes: ["OBSERVABILITY_DRY_RUN_DROPPED"],
      liveTelemetryExportAttempted: false,
      productionWriteAttempted: false,
      status: "dropped_with_diagnostic",
    });
  });

  it("rejects missing trace ids before serializing dry-run references", () => {
    const result = captureObservabilityDryRun({
      eventCategory: "worker",
      metricName: "worker.dry_run.started",
      operation: "traces",
      payloadReference: "payload-ref:worker:local",
      sourceRuntime: "worker-lease-store",
      traceId: "",
    });

    expect(result.accepted).toBe(false);
    expect(result.diagnosticCodes).toEqual(["MISSING_TRACE_ID"]);
    expect(result.status).toBe("rejected");
    expect(result.payloadReference).toBeUndefined();
  });

  it("rejects unsafe metric, label, and payload material without leaking raw values", () => {
    const result = captureObservabilityDryRun({
      eventCategory: "provider",
      labels: {
        credential: "provider-api-key-secret",
        runtime: "queue-provider-adapter",
        wallet: "ELF_raw_wallet",
      },
      metricName: "https://metric-user:metric-pass@metrics.invalid/push?token=secret",
      observedAt: "not-a-date",
      operation: "metrics",
      payloadReference: "tenant/raw/queue-payload.json",
      sourceRuntime: "queue-provider-adapter",
      traceId: "trace-observability-unsafe",
    });
    const serialized = JSON.stringify(result);

    expect(result.accepted).toBe(false);
    expect(result.status).toBe("rejected");
    expect(result.diagnosticCodes).toEqual([
      "UNSAFE_METRIC_NAME",
      "UNSAFE_OBSERVABILITY_LABELS",
      "INVALID_OBSERVABILITY_TIMESTAMP",
      "UNSAFE_PAYLOAD_REFERENCE",
    ]);
    expect(serialized).not.toContain("metric-user");
    expect(serialized).not.toContain("metric-pass");
    expect(serialized).not.toContain("provider-api-key-secret");
    expect(serialized).not.toContain("ELF_raw_wallet");
    expect(serialized).not.toContain("tenant/raw/queue-payload.json");
    expect(serialized).not.toContain("secret");
  });

  it("fails closed for unsupported or unsafe profiles and exporter configuration", () => {
    const unknownProfile = createObservabilityExporterFoundation({
      exporterId: "production-observability-exporter",
      profileId: "live-observability-secret",
      sinkId: "production-metrics-sink",
    });
    const unsupportedExporter = createObservabilityExporterFoundation({
      exporterId: "datadog",
      profileId: "local-review",
    });
    const unsafeExporter = createObservabilityExporterFoundation({
      exporterId: "https://obs-user:obs-pass@observability.invalid/push?token=obs-secret",
      profileId: "local-review",
    });
    const unsafeNamespace = createObservabilityExporterFoundation({
      metricNamespace: "https://namespace-user:namespace-pass@metrics.invalid?token=secret",
      profileId: "local-review",
    });
    const serialized = JSON.stringify({ unknownProfile, unsafeExporter, unsafeNamespace });

    expect(unknownProfile.profileId).toBe("production-required");
    expect(unknownProfile.status).toBe("blocked");
    expect(unknownProfile.valid).toBe(false);
    expect(unknownProfile.diagnosticCodes[0]).toBe("UNKNOWN_OBSERVABILITY_PROFILE");
    expect(unsupportedExporter.status).toBe("blocked");
    expect(unsupportedExporter.diagnosticCodes).toEqual(["OBSERVABILITY_EXPORTER_UNSUPPORTED"]);
    expect(unsafeExporter.status).toBe("blocked");
    expect(unsafeExporter.exporterId).toBe("blocked-observability-exporter");
    expect(unsafeExporter.diagnosticCodes).toEqual(["UNSAFE_OBSERVABILITY_CONFIG"]);
    expect(unsafeNamespace.status).toBe("blocked");
    expect(unsafeNamespace.metricNamespace).toBe("blocked-observability-namespace");
    expect(serialized).not.toContain("obs-user");
    expect(serialized).not.toContain("obs-pass");
    expect(serialized).not.toContain("namespace-user");
    expect(serialized).not.toContain("namespace-pass");
    expect(serialized).not.toContain("secret");
  });

  it("redacts endpoints, credentials, wallet data, payloads, object keys, signed URLs, and webhooks", () => {
    const rawFixture = {
      alertWebhook: "https://hooks.invalid/path?token=hook-secret",
      apiKey: "observability-api-key-123",
      bearerToken: "Bearer observability-token-456",
      contractPayload: "{\"walletAddress\":\"ELF_contract_wallet\",\"claim\":\"raw\"}",
      endpoint: "https://endpoint-user:endpoint-pass@observability.invalid/push",
      nested: {
        evidencePayload: "{\"walletAddress\":\"ELF_evidence_wallet\",\"taskId\":\"task_raw\"}",
        objectKey: "tenant/raw/observability.json",
        providerPayload: "{\"walletAddress\":\"ELF_provider_wallet\",\"taskId\":\"task_raw\"}",
        queuePayload: "{\"job\":\"task-verification\",\"address\":\"ELF_payload_wallet\"}",
        rewardPayload: "{\"walletAddress\":\"ELF_reward_wallet\",\"amount\":\"100\"}",
        signedUrl: "https://storage.example/file.csv?X-Amz-Signature=abc123",
        webhookSecret: "hook-secret-000",
        workerPayload: "{\"walletAddress\":\"ELF_worker_wallet\",\"job\":\"raw\"}",
      },
      privateKey: "-----BEGIN PRIVATE KEY-----abc-----END PRIVATE KEY-----",
      walletAddress: "ELF_raw_wallet",
    };

    const redacted = redactObservabilityExporterValue(rawFixture);
    const serialized = JSON.stringify(redacted);

    expect(serialized).not.toContain("hook-secret");
    expect(serialized).not.toContain("observability-api-key-123");
    expect(serialized).not.toContain("observability-token-456");
    expect(serialized).not.toContain("ELF_contract_wallet");
    expect(serialized).not.toContain("endpoint-user");
    expect(serialized).not.toContain("endpoint-pass");
    expect(serialized).not.toContain("tenant/raw/observability.json");
    expect(serialized).not.toContain("ELF_provider_wallet");
    expect(serialized).not.toContain("ELF_payload_wallet");
    expect(serialized).not.toContain("ELF_reward_wallet");
    expect(serialized).not.toContain("abc123");
    expect(serialized).not.toContain("ELF_worker_wallet");
    expect(serialized).not.toContain("ELF_raw_wallet");
    expect(serialized).toContain("[redacted]");
  });
});
