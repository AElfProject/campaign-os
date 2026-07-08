import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import { createBackendServiceReadinessReport } from "./backendService";
import { executeProviderHttpRequest } from "./providerHttpClientRuntime";
import { planProviderHttpRequest, type ProviderHttpVerificationRequestInput } from "./providerHttpRequestPlanner";
import {
  createProviderHttpDownstreamLiveFlags,
  createProviderHttpRuntimeSummary,
} from "./providerHttpRuntimeRegistry";
import type { ProviderHttpTransport } from "./providerHttpTransport";
import { createQueueRuntimeFoundation, dryRunQueueEnqueue } from "./queueRuntime";
import { createSchedulerRuntimeFoundation, dryRunSchedulerTrigger } from "./schedulerRuntime";
import { createWorkerSchedulerFoundation } from "./workerSchedulerRuntime";

const providerHttpReadyEnv = {
  CAMPAIGN_OS_PROVIDER_HTTP_CREDENTIAL_REF: "credential-ref:provider-http",
  CAMPAIGN_OS_PROVIDER_HTTP_ENDPOINT_REF: "config-ref:provider-http-endpoint",
  CAMPAIGN_OS_PROVIDER_HTTP_ENDPOINT_REGISTRY_REF: "config-ref:provider-http-registry",
  CAMPAIGN_OS_PROVIDER_HTTP_HEADER_REF: "header-ref:provider-http-auth",
  CAMPAIGN_OS_PROVIDER_HTTP_IDEMPOTENCY_REF: "idem-ref:provider-http",
  CAMPAIGN_OS_PROVIDER_HTTP_LEASE_REF: "lease-ref:provider-http",
  CAMPAIGN_OS_PROVIDER_HTTP_QUEUE_WORKER_HANDOFF: "config-ref:provider-http-worker",
  CAMPAIGN_OS_PROVIDER_HTTP_REDACTION_POLICY: "policy-ref:provider-http-redaction",
  CAMPAIGN_OS_PROVIDER_HTTP_RESPONSE_MAPPING_POLICY: "policy-ref:provider-http-response-map",
  CAMPAIGN_OS_PROVIDER_HTTP_RUNBOOK_REF: "runbook-ref:provider-http",
  CAMPAIGN_OS_PROVIDER_HTTP_RUNTIME_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_PROVIDER_HTTP_TIMEOUT_POLICY: "timeout-policy:2500ms",
  CAMPAIGN_OS_PROVIDER_HTTP_TRANSPORT_SEAM: "config-ref:provider-http-transport",
} satisfies Record<string, unknown>;

const providerHttpRequest: ProviderHttpVerificationRequestInput = {
  attempt: { count: 1, maxAttempts: 3 },
  campaignId: "campaign-ref:provider-http",
  endpointId: "aefinder-aelfscan-indexer-query",
  evidenceHash: "sha256:provider-evidence",
  evidenceRef: "evidence-ref:task-1",
  idempotencyRef: "idem-ref:campaign-task-wallet",
  leaseRef: "lease-ref:worker-task",
  providerGroupId: "aefinder-aelfscan-indexers",
  taskId: "task-ref:on-chain-1",
  traceId: "trace-provider-http-separation",
  verificationType: "ON_CHAIN",
  walletAccountRef: "account-ref:wallet-1",
  walletSessionRef: "session-ref:wallet-1",
};

const expectedDownstreamLiveFlags = createProviderHttpDownstreamLiveFlags();

const forbiddenSdkFragments = [
  "@aelf",
  "@aws-sdk",
  "@google/generative-ai",
  "@openai",
  "@provider",
  "aefinder",
  "aelfscan",
  "analytics",
  "aws-sdk",
  "ethers",
  "mixpanel",
  "openai",
  "reward",
  "scheduler",
  "segment",
  "viem",
  "web3",
];

const assertProviderHttpRuntimeNoLive = (
  value: ReturnType<typeof createProviderHttpRuntimeSummary>,
) => {
  expect(value.productionReady).toBe(false);
  expect(value.liveHttpCallsAttempted).toBe(false);
  expect(value.downstreamLiveFlags).toEqual(expectedDownstreamLiveFlags);
  expect(Object.values(value.downstreamLiveFlags).every((flag) => flag === false)).toBe(true);
};

describe("provider HTTP runtime separation boundaries", () => {
  it("keeps default local and staging provider HTTP runtimes deterministic and no-live", async () => {
    let calls = 0;
    const transport: ProviderHttpTransport = () => {
      calls += 1;
      return { durationMs: 1, statusCode: 200, timedOut: false };
    };
    const local = createProviderHttpRuntimeSummary({ profileId: "local-review" });
    const staging = createProviderHttpRuntimeSummary({ profileId: "staging-scaffold" });
    const localResult = await executeProviderHttpRequest(providerHttpRequest, {
      runtime: local,
      transport,
    });
    const stagingResult = await executeProviderHttpRequest(providerHttpRequest, {
      runtime: staging,
      transport,
    });

    expect(local).toMatchObject({
      activationStatus: "disabled",
      status: "disabled",
      transportProvided: false,
      valid: true,
    });
    expect(staging).toMatchObject({
      activationStatus: "metadata_only",
      status: "disabled",
      transportProvided: false,
      valid: true,
    });
    assertProviderHttpRuntimeNoLive(local);
    assertProviderHttpRuntimeNoLive(staging);
    expect(calls).toBe(0);
    expect(localResult).toMatchObject({
      diagnosticCodes: ["runtime_not_activated"],
      liveHttpCallsAttempted: false,
      outcome: "blocked",
      transportExecuted: false,
    });
    expect(stagingResult).toMatchObject({
      diagnosticCodes: ["runtime_not_activated"],
      liveHttpCallsAttempted: false,
      outcome: "blocked",
      transportExecuted: false,
    });
  });

  it("blocks production-required without activation and missing transport seam", async () => {
    let calls = 0;
    const blockedRuntime = createProviderHttpRuntimeSummary({
      env: {
        ...providerHttpReadyEnv,
        CAMPAIGN_OS_PROVIDER_HTTP_RUNTIME_ENABLEMENT: "",
        CAMPAIGN_OS_PROVIDER_HTTP_TRANSPORT_SEAM: "",
      },
      profileId: "production-required",
      transportProvided: false,
    });
    const transport: ProviderHttpTransport = () => {
      calls += 1;
      return { durationMs: 1, statusCode: 200, timedOut: false };
    };
    const result = await executeProviderHttpRequest(providerHttpRequest, {
      runtime: blockedRuntime,
      transport,
    });

    expect(blockedRuntime).toMatchObject({
      activationStatus: "activation_required",
      productionReady: false,
      status: "blocked",
      transportProvided: false,
      valid: false,
    });
    expect(blockedRuntime.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "PROVIDER_HTTP_RUNTIME_ACTIVATION_MISSING",
        "PROVIDER_HTTP_TRANSPORT_SEAM_MISSING",
      ]),
    );
    expect(calls).toBe(0);
    expect(result).toMatchObject({
      diagnosticCodes: ["runtime_not_activated"],
      liveHttpCallsAttempted: false,
      outcome: "blocked",
      transportExecuted: false,
    });
    expect(result.downstreamLiveFlags).toEqual(expectedDownstreamLiveFlags);
  });

  it("executes only an injected transport and does not imply production readiness or downstream live flags", async () => {
    let calls = 0;
    const runtime = createProviderHttpRuntimeSummary({
      env: providerHttpReadyEnv,
      profileId: "production-required",
      transportProvided: true,
    });
    const transport: ProviderHttpTransport = (request, context) => {
      calls += 1;
      expect(request.urlRef).toBe("provider.endpoint.aefinder_aelfscan.indexer.url");
      expect(request.headerRefs).toEqual([
        "header-ref:provider-http-indexer-auth",
        "header-ref:provider-http-trace",
      ]);
      expect(JSON.stringify(request)).not.toContain("https://");
      expect(JSON.stringify(request)).not.toContain("Bearer ");
      expect(context.traceId).toBe("trace-provider-http-separation");

      return {
        body: {
          evidenceHash: "sha256:provider-evidence",
          evidenceRef: "evidence-ref:task-1",
          status: "completed",
        },
        durationMs: 9,
        statusCode: 200,
        timedOut: false,
      };
    };
    const result = await executeProviderHttpRequest(providerHttpRequest, {
      runtime,
      transport,
    });

    expect(runtime).toMatchObject({
      activationStatus: "explicitly_enabled",
      liveHttpCallsAttempted: false,
      productionReady: false,
      status: "activated",
      transportProvided: true,
      valid: true,
    });
    expect(runtime.downstreamLiveFlags).toEqual(expectedDownstreamLiveFlags);
    expect(calls).toBe(1);
    expect(result).toMatchObject({
      evidenceHash: "sha256:provider-evidence",
      evidenceRef: "evidence-ref:task-1",
      liveHttpCallsAttempted: true,
      outcome: "completed",
      transportExecuted: true,
    });
    expect(result.downstreamLiveFlags).toEqual(expectedDownstreamLiveFlags);
    expect(Object.values(result.downstreamLiveFlags).every((flag) => flag === false)).toBe(true);
  });

  it("keeps provider HTTP activation from enabling queue, worker, scheduler, telemetry, or rendered UI side effects", async () => {
    const runtime = createProviderHttpRuntimeSummary({
      env: providerHttpReadyEnv,
      profileId: "production-required",
      transportProvided: true,
    });
    const workerScheduler = createWorkerSchedulerFoundation({
      env: providerHttpReadyEnv,
      profileId: "production-required",
    });
    const scheduler = createSchedulerRuntimeFoundation({
      env: providerHttpReadyEnv,
      profileId: "production-required",
    });
    const queue = createQueueRuntimeFoundation({
      env: providerHttpReadyEnv,
      profileId: "production-required",
    });
    const backendReport = createBackendServiceReadinessReport({
      configOptions: {
        env: providerHttpReadyEnv,
        profileId: "production-required",
      },
    });
    const triggerResult = dryRunSchedulerTrigger({
      idempotencyKey: "idempotency:task-verification-on-request:campaign-1",
      jobId: "task-verification-worker",
      queueHandoffReference: "queue-handoff:task-verification-worker-queue-plan",
      scheduleId: "task-verification-on-request",
      scheduledFor: "2026-07-07T13:30:00Z",
      traceId: "trace-provider-http-scheduler-separation",
      triggerSource: "api_request",
      windowEnd: "2026-07-07T13:35:00Z",
      windowStart: "2026-07-07T13:25:00Z",
    });
    const enqueueResult = dryRunQueueEnqueue({
      attempt: 1,
      idempotencyKey: "idempotency:task-verification-on-request:campaign-1",
      jobId: "task-verification-worker",
      payloadReference: "payload-ref:sha256:task-verification-safe",
      queueId: "verification-jobs",
      requestedAt: "2026-07-07T13:30:00Z",
      traceId: "trace-provider-http-queue-separation",
    });

    expect(runtime.status).toBe("activated");
    expect(runtime.downstreamLiveFlags).toEqual(expectedDownstreamLiveFlags);
    expect(workerScheduler.providerHttpRuntime).toMatchObject({
      activationStatus: "explicitly_enabled",
      idempotencyPosture: "policy-and-store-reference-only",
      leasePosture: "store-reference-only",
      liveHttpCallsAttempted: false,
      liveSchedulerExecutionEnabled: false,
      liveWorkerExecutionEnabled: false,
      productionReady: false,
      queueId: "verification-jobs",
      status: "activated",
      transportProvided: true,
      workerJobId: "task-verification-worker",
    });
    expect(workerScheduler.readiness).toMatchObject({
      consumeAckAttempted: false,
      consumeDeadLetterAttempted: false,
      consumeNackAttempted: false,
      consumeRetryScheduled: false,
      idempotencyStoreLiveIdempotencyExecutionEnabled: false,
      leaseStoreLiveQueuePublishingEnabled: false,
      leaseStoreLiveWorkerExecutionEnabled: false,
      liveSchedulerExecutionEnabled: false,
      liveWorkerExecutionEnabled: false,
      productionReady: false,
    });
    expect(scheduler.readiness).toMatchObject({
      liveCronExecutionEnabled: false,
      liveQueuePublishingEnabled: false,
      liveSchedulerExecutionEnabled: false,
    });
    expect(queue.readiness).toMatchObject({
      idempotencyStoreLiveIdempotencyExecutionEnabled: false,
      leaseStoreLiveQueuePublishingEnabled: false,
      leaseStoreLiveWorkerExecutionEnabled: false,
      liveQueueConsumptionEnabled: false,
      liveQueuePublishingEnabled: false,
    });
    expect(queue.noLiveFlags).toMatchObject({
      liveAnalyticsIngestionEnabled: false,
      liveContractCallsEnabled: false,
      liveObjectStorageEnabled: false,
      liveRewardDistributionEnabled: false,
      liveSchedulerExecutionEnabled: false,
      liveWorkerExecutionEnabled: false,
    });
    expect(triggerResult).toMatchObject({
      liveCronExecutionEnabled: false,
      liveExecutionAttempted: false,
      liveQueuePublishingEnabled: false,
      liveSchedulerExecutionEnabled: false,
    });
    expect(enqueueResult).toMatchObject({
      livePublishAttempted: false,
      liveQueuePublishingEnabled: false,
    });
    expect(backendReport.providerClientReadiness.providerHttpRuntime).toMatchObject({
      activationStatus: "explicitly_enabled",
      downstreamLiveFlags: expectedDownstreamLiveFlags,
      liveHttpCallsAttempted: false,
      productionReady: false,
      status: "activated",
      transportProvided: true,
    });
    expect(backendReport.providerClientReadiness.activationInventory.providerHttpRuntime).toMatchObject({
      activationStatus: "explicitly_enabled",
      blockedConfigKeys: [],
      blockerIds: [],
      status: "activated",
    });
    expect(backendReport.observabilityExporterFoundation.noLiveFlags).toMatchObject({
      liveAnalyticsIngestionEnabled: false,
      liveObjectStorageEnabled: false,
      liveProviderCallsEnabled: false,
      liveTelemetryExportEnabled: false,
    });
  });

  it("keeps provider HTTP request planning reference-only and free of SDK package drift", () => {
    const runtime = createProviderHttpRuntimeSummary({
      env: providerHttpReadyEnv,
      profileId: "production-required",
      transportProvided: true,
    });
    const plan = planProviderHttpRequest(providerHttpRequest, runtime);
    const dependencyNames = Object.keys({
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    });

    expect(plan.ok).toBe(true);
    expect(plan.ok ? plan.plan : undefined).toMatchObject({
      headerRefs: ["header-ref:provider-http-indexer-auth", "header-ref:provider-http-trace"],
      idempotencyRef: "idem-ref:campaign-task-wallet",
      leaseRef: "lease-ref:worker-task",
      method: "POST",
      timeoutMs: 2500,
      urlRef: "provider.endpoint.aefinder_aelfscan.indexer.url",
    });
    expect(JSON.stringify(plan)).not.toContain("https://");
    expect(JSON.stringify(plan)).not.toContain("Bearer ");
    expect(JSON.stringify(plan)).not.toContain("api-key");
    expect(JSON.stringify(plan)).not.toContain("secret");

    for (const dependencyName of dependencyNames) {
      for (const forbiddenFragment of forbiddenSdkFragments) {
        expect(dependencyName.toLowerCase()).not.toContain(forbiddenFragment);
      }
    }
  });
});
