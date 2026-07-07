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
