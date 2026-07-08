import { describe, expect, it } from "vitest";
import type { VerificationType } from "../domain/types";
import { createProviderIndexerClientReadiness } from "./providerIndexerClientReadiness";
import {
  allowedVerificationDegradationOutcomes,
  createVerificationSourceHandoff,
  resolveVerificationSourceHandoff,
  verificationSourcePolicies,
} from "./verificationSourceHandoff";

const verificationTypes: VerificationType[] = ["WALLET", "ON_CHAIN", "DAPP_API", "SOCIAL", "MANUAL"];

describe("verification source handoff", () => {
  it("maps every v0.2 verification type to safe evidence sources and provider groups", () => {
    expect(verificationSourcePolicies.map((policy) => policy.verificationType)).toEqual(verificationTypes);

    const handoff = createVerificationSourceHandoff();

    expect(handoff.valid).toBe(true);
    expect(handoff.entries.map((entry) => entry.verificationType)).toEqual(verificationTypes);
    expect(handoff.entries.map((entry) => entry.providerGroupIds)).toEqual([
      ["wallet-auth-session"],
      ["aefinder-aelfscan-indexers"],
      ["dapp-api-adapters"],
      ["social-api-adapters"],
      ["manual-review"],
    ]);
    expect(handoff.entries.map((entry) => entry.jobIds)).toEqual([
      [],
      ["task-verification-worker"],
      ["task-verification-worker"],
      ["task-verification-worker"],
      [],
    ]);
    expect(handoff.entries.every((entry) => entry.liveExecutionEnabled === false)).toBe(true);
    expect(handoff.entries.every((entry) => entry.evidenceSourceLabels.length > 0)).toBe(true);
    expect(handoff.entries.every((entry) => entry.diagnosticNotes.length > 0)).toBe(true);
    expect(handoff.entries.every((entry) => entry.queuePosture.liveQueuePublishingEnabled === false)).toBe(true);
    expect(handoff.entries.every((entry) => entry.queuePosture.liveWorkerExecutionEnabled === false)).toBe(true);
  });

  it("declares deterministic degradation outcomes that never complete provider-backed tasks", () => {
    expect(allowedVerificationDegradationOutcomes).toEqual([
      "pending",
      "manual_review",
      "disable_provider_task_templates",
      "local_only",
      "blocked",
    ]);

    const degradationByType = Object.fromEntries(
      createVerificationSourceHandoff().entries.map((entry) => [
        entry.verificationType,
        entry.defaultDegradationOutcome,
      ]),
    );

    expect(degradationByType).toEqual({
      WALLET: "local_only",
      ON_CHAIN: "pending",
      DAPP_API: "disable_provider_task_templates",
      SOCIAL: "manual_review",
      MANUAL: "manual_review",
    });
    expect(Object.values(degradationByType)).not.toContain("completed");
  });

  it("preserves wallet auth/session separation from provider readiness", () => {
    const wallet = resolveVerificationSourceHandoff("WALLET");

    expect(wallet.valid).toBe(true);
    expect(wallet.entry).toMatchObject({
      authSessionRequired: true,
      jobIds: [],
      liveExecutionEnabled: false,
      providerReadinessSatisfiesAuthentication: false,
      queuePosture: {
        dryRunEnqueueEnabled: false,
        jobIds: [],
        liveQueuePublishingEnabled: false,
        liveWorkerExecutionEnabled: false,
        queuePlans: [],
        queueRuntimeId: "campaign-os-queue-runtime-foundation",
        queueUnavailableOutcome: "blocked",
      },
      unavailableWorkerOutcome: "blocked",
      verificationType: "WALLET",
      workerRequired: false,
    });
    expect(wallet.entry?.evidenceSourceLabels).toEqual(["Auth/session wallet proof"]);
    expect(wallet.entry?.providerGroupIds).toEqual(["wallet-auth-session"]);
    expect(wallet.entry?.providerClientPosture).toMatchObject({
      clientReadinessId: "campaign-os-provider-indexer-client-readiness",
      providerClientRequired: false,
      providerClientsEnabled: false,
      readinessStatus: "disabled",
      supportedVerificationTypes: ["WALLET"],
    });
    expect(wallet.entry?.diagnosticNotes.join(" ")).toContain("auth/session");
    expect(wallet.entry?.diagnosticNotes.join(" ")).not.toContain("provider readiness authenticates");
  });

  it("maps verification sources to worker posture without replacing provider readiness", () => {
    const handoffByType = Object.fromEntries(
      createVerificationSourceHandoff().entries.map((entry) => [entry.verificationType, entry]),
    );

    expect(handoffByType.ON_CHAIN).toMatchObject({
      jobIds: ["task-verification-worker"],
      providerClientPosture: {
        adapterGroupIds: ["aefinder-aelfscan-indexers"],
        clientReadinessId: "campaign-os-provider-indexer-client-readiness",
        endpointRefs: ["config-ref:CAMPAIGN_OS_PROVIDER_ENDPOINT_REF"],
        providerClientRequired: true,
        providerClientsEnabled: false,
        readinessStatus: "disabled",
        supportedVerificationTypes: ["ON_CHAIN"],
      },
      providerHttpRuntimePosture: {
        activationStatus: "disabled",
        endpointCount: 1,
        endpointIds: ["aefinder-aelfscan-indexer-query"],
        endpointRollout: {
          deferredCount: 2,
          enabledCount: 11,
          providerFamilies: expect.arrayContaining(["aefinder", "aelfscan"]),
          valid: true,
        },
        endpointRefs: ["provider.endpoint.aefinder_aelfscan.indexer.url"],
        liveHttpCallsAttempted: false,
        providerGroupIds: ["aefinder-aelfscan-indexers"],
        runtimeId: "campaign-os-provider-http-client-runtime",
        status: "disabled",
        supportedVerificationTypes: ["ON_CHAIN"],
        transportProvided: false,
      },
      providerGroupIds: ["aefinder-aelfscan-indexers"],
      queuePosture: {
        dryRunEnqueueEnabled: true,
        jobIds: ["task-verification-worker"],
        liveQueuePublishingEnabled: false,
        liveWorkerExecutionEnabled: false,
        queueRuntimeId: "campaign-os-queue-runtime-foundation",
        queueUnavailableOutcome: "pending",
      },
      unavailableWorkerOutcome: "pending",
      workerRequired: true,
    });
    expect(handoffByType.DAPP_API).toMatchObject({
      jobIds: ["task-verification-worker"],
      providerGroupIds: ["dapp-api-adapters"],
      queuePosture: {
        dryRunEnqueueEnabled: true,
        queueUnavailableOutcome: "disable_provider_task_templates",
      },
      unavailableWorkerOutcome: "disable_provider_task_templates",
      workerRequired: true,
    });
    expect(handoffByType.SOCIAL).toMatchObject({
      jobIds: ["task-verification-worker"],
      providerGroupIds: ["social-api-adapters"],
      queuePosture: {
        dryRunEnqueueEnabled: true,
        queueUnavailableOutcome: "manual_review",
      },
      unavailableWorkerOutcome: "manual_review",
      workerRequired: true,
    });
    expect(handoffByType.MANUAL).toMatchObject({
      jobIds: [],
      providerGroupIds: ["manual-review"],
      queuePosture: {
        dryRunEnqueueEnabled: false,
        jobIds: [],
        queuePlans: [],
        queueUnavailableOutcome: "manual_review",
      },
      unavailableWorkerOutcome: "manual_review",
      workerRequired: false,
    });
    expect(handoffByType.ON_CHAIN.queuePosture.queuePlans).toEqual([
      expect.objectContaining({
        degradedOutcome: "pending",
        jobId: "task-verification-worker",
        payloadReferencePolicy: "payload-reference-or-hash-only-no-raw-payload",
        queueId: "verification-jobs",
        sideEffectBoundary: "no-live-verification-handoff",
      }),
    ]);
    expect(
      Object.values(handoffByType).every((entry) => entry.providerReadinessSatisfiesAuthentication === false),
    ).toBe(true);
    expect(
      Object.values(handoffByType).every((entry) => entry.providerClientPosture.liveProviderCallsAttempted === false),
    ).toBe(true);
    expect(
      Object.values(handoffByType).every((entry) => entry.providerHttpRuntimePosture.liveHttpCallsAttempted === false),
    ).toBe(true);
  });

  it("exposes provider client readiness disabled and blocked diagnostics without completing tasks", () => {
    const disabled = resolveVerificationSourceHandoff("ON_CHAIN");
    const blocked = resolveVerificationSourceHandoff("DAPP_API", {
      clientReadiness: createProviderIndexerClientReadiness({ profileId: "production-required" }),
    });

    expect(disabled).toMatchObject({
      degradationOutcome: "pending",
      diagnosticCodes: ["PROVIDER_CLIENT_READINESS_DISABLED"],
      valid: false,
    });
    expect(disabled.entry?.providerClientPosture).toMatchObject({
      blockerCount: 0,
      providerClientRequired: true,
      providerClientsEnabled: false,
      readinessStatus: "disabled",
    });
    expect(blocked).toMatchObject({
      degradationOutcome: "disable_provider_task_templates",
      valid: false,
    });
    expect(blocked.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "PROVIDER_CLIENT_REFERENCE_MISSING",
        "PROVIDER_CLIENT_READINESS_BLOCKED",
      ]),
    );
    expect(blocked.entry?.providerClientPosture).toMatchObject({
      blockerCount: 13,
      providerClientRequired: true,
      providerClientsEnabled: false,
      readinessStatus: "blocked",
    });
    expect([disabled.degradationOutcome, blocked.degradationOutcome]).not.toContain("completed");
  });

  it("keeps provider-backed queue unavailable states pending, disabled, or review only", () => {
    const outcomes = Object.fromEntries(
      (["ON_CHAIN", "DAPP_API", "SOCIAL"] as const).map((verificationType) => {
        const handoff = resolveVerificationSourceHandoff(verificationType, {
          workerAvailability: "unavailable",
        });

        expect(handoff.entry?.queuePosture).toMatchObject({
          dryRunEnqueueEnabled: true,
          jobIds: ["task-verification-worker"],
          liveQueuePublishingEnabled: false,
          liveWorkerExecutionEnabled: false,
          queueRuntimeId: "campaign-os-queue-runtime-foundation",
        });
        expect(handoff.degradationOutcome).not.toBe("completed");

        return [verificationType, handoff.entry?.queuePosture.queueUnavailableOutcome];
      }),
    );

    expect(outcomes).toEqual({
      DAPP_API: "disable_provider_task_templates",
      ON_CHAIN: "pending",
      SOCIAL: "manual_review",
    });
  });

  it("marks provider-backed unavailable states as blocked, pending, or review only", () => {
    const providerBackedTypes: VerificationType[] = ["ON_CHAIN", "DAPP_API", "SOCIAL"];

    for (const verificationType of providerBackedTypes) {
      const handoff = resolveVerificationSourceHandoff(verificationType, {
        providerGroupAvailability: "unavailable",
      });

      expect(handoff.valid).toBe(false);
      expect(handoff.degradationOutcome).not.toBe("completed");
      expect(["pending", "manual_review", "disable_provider_task_templates", "blocked"]).toContain(
        handoff.degradationOutcome,
      );
      expect(handoff.diagnosticCodes).toEqual(
        expect.arrayContaining([
          "PROVIDER_GROUP_UNAVAILABLE",
          "PROVIDER_CLIENT_READINESS_DISABLED",
        ]),
      );
    }
  });

  it("marks worker unavailable states as pending, disabled, or review only", () => {
    const outcomes = Object.fromEntries(
      (["ON_CHAIN", "DAPP_API", "SOCIAL"] as const).map((verificationType) => {
        const handoff = resolveVerificationSourceHandoff(verificationType, {
          workerAvailability: "unavailable",
        });

        expect(handoff.valid).toBe(false);
        expect(handoff.degradationOutcome).not.toBe("completed");
        expect(handoff.diagnosticCodes).toContain("WORKER_JOB_UNAVAILABLE");

        return [verificationType, handoff.degradationOutcome];
      }),
    );

    expect(outcomes).toEqual({
      DAPP_API: "disable_provider_task_templates",
      ON_CHAIN: "pending",
      SOCIAL: "manual_review",
    });
  });

  it("fails closed for unknown verification types, provider groups, and evidence sources", () => {
    const unknownType = resolveVerificationSourceHandoff("TOKEN_DROP");
    const unknownGroup = resolveVerificationSourceHandoff("ON_CHAIN", {
      providerGroupIds: ["unknown-indexer"],
    });
    const unsupportedEvidence = resolveVerificationSourceHandoff("SOCIAL", {
      evidenceSourceLabels: ["Raw bearer social payload"],
    });
    const unknownWorker = resolveVerificationSourceHandoff("ON_CHAIN", {
      jobIds: ["unknown-worker-secret-token"],
    });

    expect(unknownType).toMatchObject({
      degradationOutcome: "blocked",
      diagnosticCodes: ["UNKNOWN_VERIFICATION_TYPE"],
      entry: undefined,
      valid: false,
    });
    expect(unknownGroup).toMatchObject({
      degradationOutcome: "blocked",
      diagnosticCodes: ["UNKNOWN_PROVIDER_GROUP"],
      valid: false,
    });
    expect(unsupportedEvidence).toMatchObject({
      degradationOutcome: "blocked",
      valid: false,
    });
    expect(unsupportedEvidence.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "UNSUPPORTED_EVIDENCE_SOURCE",
        "PROVIDER_CLIENT_READINESS_DISABLED",
      ]),
    );
    expect(unknownWorker).toMatchObject({
      degradationOutcome: "blocked",
      valid: false,
    });
    expect(unknownWorker.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "UNKNOWN_WORKER_JOB",
        "PROVIDER_CLIENT_READINESS_DISABLED",
      ]),
    );
    expect(JSON.stringify(unknownWorker)).not.toContain("unknown-worker-secret-token");
  });

  it("blocks provider group and verification type mismatch before client execution", () => {
    const readiness = createProviderIndexerClientReadiness({
      clients: [
        {
          clientId: "dapp-client",
          evaluate: () => ({
            evidenceHash: "sha256:should-not-run",
            evidenceRef: "evidence-ref:should-not-run",
            status: "completed",
          }),
          providerGroupId: "dapp-api-adapters",
        },
      ],
      env: {
        CAMPAIGN_OS_PROVIDER_CIRCUIT_BREAKER_POLICY: "circuit-breaker:fail-closed",
        CAMPAIGN_OS_PROVIDER_CLIENT_ENABLEMENT: "explicitly-enabled",
        CAMPAIGN_OS_PROVIDER_CLIENT_SEAM: "client-seam-ref:provider-indexer",
        CAMPAIGN_OS_PROVIDER_CONSUME_READINESS_HANDOFF: "consume-readiness:ready",
        CAMPAIGN_OS_PROVIDER_CREDENTIAL_REF: "credential-ref:provider-clients",
        CAMPAIGN_OS_PROVIDER_DEGRADATION_POLICY: "degradation:manual-review",
        CAMPAIGN_OS_PROVIDER_ENDPOINT_REF: "endpoint-ref:dapp-api",
        CAMPAIGN_OS_PROVIDER_REDACTION_POLICY: "redaction-policy:provider-client",
        CAMPAIGN_OS_PROVIDER_REGISTRY_URL: "provider-registry-ref:campaign-os",
        CAMPAIGN_OS_PROVIDER_RETRY_POLICY: "retry-policy:provider-backoff",
        CAMPAIGN_OS_PROVIDER_RUNBOOK_URL: "runbook-ref:provider-client",
        CAMPAIGN_OS_PROVIDER_TIMEOUT_POLICY: "timeout-policy:2500ms",
        CAMPAIGN_OS_PROVIDER_WORKER_QUEUE_HANDOFF: "queue-handoff:verification-jobs",
      },
      profileId: "production-required",
    });
    const mismatch = resolveVerificationSourceHandoff("ON_CHAIN", {
      clientReadiness: readiness,
      providerGroupIds: ["dapp-api-adapters"],
    });

    expect(mismatch).toMatchObject({
      degradationOutcome: "blocked",
      diagnosticCodes: ["TASK_TEMPLATE_SOURCE_MISMATCH", "UNSUPPORTED_VERIFICATION_TYPE"],
      valid: false,
    });
    expect(mismatch.entry?.providerClientPosture).toMatchObject({
      providerClientsEnabled: true,
      readinessStatus: "activated",
    });
    expect(JSON.stringify(mismatch)).not.toContain("should-not-run");
  });

  it("serializes safe diagnostic notes without leaking secret-like fragments", () => {
    const handoff = createVerificationSourceHandoff({
      diagnosticNotes: [
        "api-key-live-123",
        "Bearer social-token-456",
        "https://indexer.example/graphql?token=query-secret",
        "{\"address\":\"ELF_raw_wallet\",\"score\":99}",
      ],
    });
    const serialized = JSON.stringify(handoff);

    expect(serialized).not.toContain("api-key-live-123");
    expect(serialized).not.toContain("social-token-456");
    expect(serialized).not.toContain("query-secret");
    expect(serialized).not.toContain("ELF_raw_wallet");
    expect(serialized).not.toContain("queue-user:queue-pass");
    expect(serialized).not.toContain("hook-secret-000");
    expect(serialized).not.toContain("tenant/raw/object-key.csv");
    expect(serialized).not.toContain("provider payload");
    expect(serialized).toContain("campaign-os-queue-runtime-foundation");
    expect(serialized).toContain("[redacted]");
  });
});
