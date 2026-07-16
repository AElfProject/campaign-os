import { describe, expect, it } from "vitest";
import { analyticsIngestionWarehouseRequiredConfigKeys } from "../domain/analyticsIngestionRuntime";
import { contractWriterRequiredConfigKeys } from "../domain/contractWriterRuntime";
import { rewardDistributionHandoffRequiredEvidenceKeys } from "../domain/rewardDistributionHandoffRuntime";
import {
  backendAttachMap,
  createBackendServiceReadinessReport,
  ownerRouteDurableEffectById,
  validateOwnerRouteDurableEffectRegistry,
} from "./backendService";
import { protectedRouteAuthMap } from "./authSession";
import { apiRuntimeContractRoutes } from "./routes";

const productionAreas = [
  "production-persistence",
  "auth-session",
  "provider-adapters",
  "worker-queue",
  "worker-lease",
  "worker-idempotency",
  "scheduler",
  "observability",
  "contract-writer",
  "object-storage-export",
  "reward-custody",
  "reward-distribution",
  "analytics-warehouse",
];

const genericContractWriterMissionCopy = ["contract", "writer", "mission"].join(" ");

const queueSecretFragments = [
  "queue-user",
  "queue-pass",
  "queue-secret",
  "worker-token-sample",
  "lease-token-sample",
  "hook-secret-sample",
  "signed-url-sample",
  "tenant/raw/export.csv",
  "ELF_raw_wallet",
  "task_raw",
];

const schedulerSecretFragments = [
  "scheduler-user",
  "scheduler-pass",
  "scheduler-secret",
  "scheduler-token-sample",
  "scheduler-hook-secret",
  "ELF_scheduler_wallet",
  "scheduler_raw_task",
];

const workerLeaseRequiredConfigKeys = [
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
];

const workerIdempotencyRequiredConfigKeys = [
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
];

const providerClientRequiredConfigKeys = [
  "CAMPAIGN_OS_PROVIDER_CLIENT_ENABLEMENT",
  "CAMPAIGN_OS_PROVIDER_REGISTRY_URL",
  "CAMPAIGN_OS_PROVIDER_ENDPOINT_REF",
  "CAMPAIGN_OS_PROVIDER_CREDENTIAL_REF",
  "CAMPAIGN_OS_PROVIDER_CLIENT_SEAM",
  "CAMPAIGN_OS_PROVIDER_TIMEOUT_POLICY",
  "CAMPAIGN_OS_PROVIDER_RETRY_POLICY",
  "CAMPAIGN_OS_PROVIDER_CIRCUIT_BREAKER_POLICY",
  "CAMPAIGN_OS_PROVIDER_DEGRADATION_POLICY",
  "CAMPAIGN_OS_PROVIDER_WORKER_QUEUE_HANDOFF",
  "CAMPAIGN_OS_PROVIDER_CONSUME_READINESS_HANDOFF",
  "CAMPAIGN_OS_PROVIDER_RUNBOOK_URL",
  "CAMPAIGN_OS_PROVIDER_REDACTION_POLICY",
];

const expectNoQueueSecretLeak = (value: unknown) => {
  const serialized = JSON.stringify(value);

  for (const fragment of queueSecretFragments) {
    expect(serialized).not.toContain(fragment);
  }
};

const expectNoSchedulerSecretLeak = (value: unknown) => {
  const serialized = JSON.stringify(value);

  for (const fragment of schedulerSecretFragments) {
    expect(serialized).not.toContain(fragment);
  }
};

describe("backend service readiness report", () => {
  it("derives provider HTTP transport readiness from runtime composition, not env metadata", () => {
    const env = {
      CAMPAIGN_OS_PROVIDER_HTTP_TRANSPORT_SEAM: "config-ref:metadata-only-seam",
    };
    const withoutTransport = createBackendServiceReadinessReport({
      configOptions: { env },
    });
    const withTransport = createBackendServiceReadinessReport({
      configOptions: { env },
      providerHttpTransportProvided: true,
    });

    expect(withoutTransport.providerClientReadiness.providerHttpRuntime.transportProvided)
      .toBe(false);
    expect(withTransport.providerClientReadiness.providerHttpRuntime.transportProvided)
      .toBe(true);
  });

  it("classifies Campaign mutations by durable effect instead of HTTP method", () => {
    expect(apiRuntimeContractRoutes.find((route) => route.id === "campaigns.tasks.generate")).toMatchObject({
      method: "POST",
    });
    expect(ownerRouteDurableEffectById["campaigns.create"]).toBe("campaign_create");
    expect(ownerRouteDurableEffectById["campaigns.owner.detail"]).toBe("none");
    expect(ownerRouteDurableEffectById["campaigns.owner.list"]).toBe("none");
    expect(ownerRouteDurableEffectById["campaigns.tasks.add"]).toBe("task_create");
    expect(ownerRouteDurableEffectById["campaigns.tasks.generate"]).toBe("none");
    expect(Object.keys(ownerRouteDurableEffectById).sort()).toEqual([
      "campaigns.create",
      "campaigns.owner.detail",
      "campaigns.owner.list",
      "campaigns.tasks.add",
      "campaigns.tasks.generate",
    ]);
    expect(() => validateOwnerRouteDurableEffectRegistry({
      durableEffectByRouteId: ownerRouteDurableEffectById,
      protectedRoutes: protectedRouteAuthMap,
    })).not.toThrow();
    expect(createBackendServiceReadinessReport().authEnforcement.campaignMutationRouteCount).toBe(1);
  });

  it("rejects a durable-effect registry missing a canonical Owner auth route", () => {
    const incompleteRegistry = { ...ownerRouteDurableEffectById };

    delete (incompleteRegistry as Record<string, string>)["campaigns.tasks.generate"];

    expect(() => validateOwnerRouteDurableEffectRegistry({
      durableEffectByRouteId: incompleteRegistry,
      protectedRoutes: protectedRouteAuthMap,
    })).toThrowError(/missing \[campaigns\.tasks\.generate\]/);
  });

  it("rejects a durable-effect registry entry outside canonical Owner auth routes", () => {
    const registryWithExtraRoute = {
      ...ownerRouteDurableEffectById,
      "runtime.health": "none",
    } as const;

    expect(() => validateOwnerRouteDurableEffectRegistry({
      durableEffectByRouteId: registryWithExtraRoute,
      protectedRoutes: protectedRouteAuthMap,
    })).toThrowError(/extra \[runtime\.health\]/);
  });

  it("aggregates local backend scaffold readiness without duplicating route ownership", () => {
    const report = createBackendServiceReadinessReport();

    expect(report.validation).toEqual({
      issues: [],
      valid: true,
    });
    expect(report.entrypoint).toMatchObject({
      foundationValidationValid: true,
      id: "campaign-os-backend-service",
      profileId: "local-review",
      runtimeName: "campaign-os-api-runtime",
      supportMode: "local_seeded",
      version: "0.2.0-local",
    });
    expect(report.entrypoint.routeCount).toBe(report.apiFoundation.coverage.routeCount);
    expect(report.entrypoint.routeCount).toBe(apiRuntimeContractRoutes.length);
    expect(report.entrypoint.routeIds).toEqual(apiRuntimeContractRoutes.map((route) => route.id));
    expect(report.apiFoundation.servicePorts.coverage.routeOwnershipCount).toBe(apiRuntimeContractRoutes.length);
    expect(report.topology.coverage.unassignedRouteIds).toEqual([]);
    expect(report.authSession).toMatchObject({
      profileId: "local-review",
      status: "local_seeded",
      protectedRouteCount: expect.any(Number),
      validation: {
        issues: [],
        valid: true,
      },
    });
    expect(report.authSession.protectedRouteCount).toBeGreaterThanOrEqual(7);
    expect(report.authSessionFoundation).toMatchObject({
      blockerCount: 0,
      diagnosticCodes: ["AUTH_AGENT_CREDENTIAL_SEPARATE"],
      id: "campaign-os-production-auth-session-foundation",
      liveSideEffectsEnabled: false,
      liveSigningExecuted: false,
      liveVerificationExecuted: false,
      ownership: {
        blockedDependencyIds: [],
        membershipSourceReady: false,
        ownerMatchRequired: true,
        ownerMutationBlocked: true,
        ownershipSourceReady: false,
      },
      productionReady: false,
      profileId: "local-review",
      protectedRouteCoverage: {
        locallyEnforcedRouteIds: [
          "campaigns.create",
          "campaigns.owner.list",
          "campaigns.owner.detail",
          "campaigns.tasks.add",
          "campaigns.tasks.generate",
          "campaigns.participant.list",
          "campaigns.participant.journey",
          "campaigns.eligibility",
          "campaigns.points.ranking.ledger.runtime",
          "tasks.verify",
        ],
        protectedRouteCount: expect.any(Number),
        routeGroupCount: expect.any(Number),
      },
      rbac: {
        agentCredentialSubstitutionDisabled: true,
        roleCount: 5,
      },
      sessionIssuer: {
        cookieIssued: false,
        issuerMode: "local_opaque",
        jwtIssued: false,
        liveSigningExecuted: false,
      },
      status: "local_ready",
      valid: true,
      walletProof: {
        liveVerificationExecuted: false,
        liveVerifierReady: false,
        nonceStoreReady: false,
        status: "proof_required",
      },
    });
    expect(report.authEnforcement).toMatchObject({
      agentCredentialSubstitutionDisabled: true,
      campaignMutationRouteCount: 1,
      liveSigningExecuted: false,
      liveVerificationExecuted: false,
      localEnforcedRouteCount: 10,
      localProofVerifierContractReady: true,
      localSessionIssuerContractReady: true,
      locallyEnforcedRouteIds: [
        "campaigns.create",
        "campaigns.owner.list",
        "campaigns.owner.detail",
        "campaigns.tasks.add",
        "campaigns.tasks.generate",
        "campaigns.participant.list",
        "campaigns.participant.journey",
        "campaigns.eligibility",
        "campaigns.points.ranking.ledger.runtime",
        "tasks.verify",
      ],
      mode: "local_enforced",
      productionProofVerifierReady: false,
      productionProjectOwnershipSourceReady: false,
      productionSessionIssuerReady: false,
      readOnlyRouteCompatibility: {
        campaignReadRouteIds: expect.arrayContaining(["campaigns.list", "campaigns.detail"]),
        runtimeMetadataRouteIds: expect.arrayContaining(["runtime.health", "runtime.contracts"]),
        runtimeMetadataUnauthenticated: true,
      },
      remainingDeferredProductionDependencyIds: expect.arrayContaining([
        "live_wallet_proof_verifier",
        "jwt_or_session_cookie",
        "project_ownership_source",
      ]),
    });
    expect(report.authSession.rolePolicy).toMatchObject({
      leastPrivilegeDefault: true,
      roleCount: 5,
    });
    expect(report.backendRuntimeBootstrap).toMatchObject({
      id: "campaign-os-backend-runtime-bootstrap",
      profileId: "local-review",
      status: "ready",
      tracePolicy: {
        traceHeaderName: "x-campaign-os-trace-id",
      },
      valid: true,
    });
    expect(report.apiService).toMatchObject({
      authContracts: {
        productionReady: false,
        proofVerifier: {
          localContractReady: true,
          liveVerificationExecuted: false,
          productionReady: false,
        },
        sessionIssuer: {
          liveSigningExecuted: false,
          localContractReady: true,
          productionReady: false,
        },
      },
      blockedDependencyIds: expect.arrayContaining([
        "live-database-driver",
        "contract-writer",
      ]),
      deferredDependencyIds: expect.arrayContaining([
        "verification-worker",
        "worker-lease-store",
        "scheduler",
        "provider-adapters",
        "object-storage",
        "analytics-ingestion",
      ]),
      deployableBoundaryReady: true,
      diagnosticCodes: [],
      id: "campaign-os-api-service",
      liveConnectionAttempted: false,
      liveSideEffectsEnabled: false,
      productionReady: false,
      profileId: "local-review",
      status: "ready",
      workerExecutionEnabled: false,
    });
    expect(report.apiService.blockedDependencyIds).not.toEqual(
      expect.arrayContaining(["wallet-proof-verifier", "session-issuer"]),
    );
    expect(report.analyticsIngestionRuntime).toMatchObject({
      campaignId: "camp-awaken-sprint",
      diagnosticCodes: expect.arrayContaining([
        "ANALYTICS_EVENT_ENVELOPE_REVIEW_REQUIRED",
        "ANALYTICS_LIVE_EXECUTION_DISABLED",
        "ANALYTICS_WAREHOUSE_HANDOFF_MISSING",
      ]),
      noLiveSideEffects: expect.objectContaining({
        liveAnalyticsSdkExecuted: false,
        liveEventIngestionEnabled: false,
        liveEventWarehouseWrite: false,
        liveProviderCallExecuted: false,
      }),
      productionReady: false,
      source: "server_runtime",
      status: "blocked",
      summary: {
        eventGroupCount: 9,
        metricLineageCount: 9,
        totalEvents: expect.any(Number),
      },
      warehouseHandoff: expect.objectContaining({
        eventWarehouseWriteAttempted: false,
        liveWarehouseWriteEnabled: false,
        productionReady: false,
        requiredConfigKeys: expect.arrayContaining([...analyticsIngestionWarehouseRequiredConfigKeys]),
        status: "missing",
      }),
    });
    expect(report.contractWriterRuntime).toMatchObject({
      campaignId: "camp-awaken-sprint",
      configHandoff: expect.objectContaining({
        productionReady: false,
        requiredConfigKeys: expect.arrayContaining([...contractWriterRequiredConfigKeys]),
        status: "missing",
      }),
      diagnosticCodes: expect.arrayContaining([
        "CONTRACT_WRITER_CONFIG_MISSING",
        "CONTRACT_WRITER_LIVE_EXECUTION_DISABLED",
        "CONTRACT_WRITER_OPERATION_REVIEW_REQUIRED",
      ]),
      noLiveSideEffects: expect.objectContaining({
        liveAbiGeneration: false,
        liveContractWrite: false,
        liveQueuePublishing: false,
        liveRewardCustody: false,
        liveRewardDistribution: false,
        liveSignerExecution: false,
        liveWalletSignature: false,
      }),
      productionReady: false,
      source: "server_runtime",
      status: "blocked",
      summary: expect.objectContaining({
        contractGroupCount: 4,
        operationCount: 20,
        requiredConfigCount: contractWriterRequiredConfigKeys.length,
      }),
    });
    expect(report.contractWriterRuntime.operationCatalog.map((group) => group.contractName)).toEqual([
      "CampaignPointsLedgerV2",
      "CampaignRegistryV2",
      "EligibilityRootRegistryV2",
      "ReferralRegistryV2",
    ]);
    expect(report.rewardDistributionHandoffRuntime).toMatchObject({
      campaignId: "camp-awaken-sprint",
      diagnosticCodes: expect.arrayContaining([
        "REWARD_DISTRIBUTION_FUNDING_PROOF_MISSING",
        "REWARD_DISTRIBUTION_LIVE_EXECUTION_DISABLED",
        "REWARD_DISTRIBUTION_OPERATOR_APPROVAL_MISSING",
        "REWARD_DISTRIBUTION_QUEUE_HANDOFF_MISSING",
      ]),
      evidenceHandoff: expect.objectContaining({
        productionReady: false,
        requiredEvidenceKeys: expect.arrayContaining([...rewardDistributionHandoffRequiredEvidenceKeys]),
        status: "missing",
      }),
      exportLinkage: expect.objectContaining({
        derivedFrom: "seeded_export_preview",
        localPreviewOnly: true,
        recipientCount: 4,
      }),
      noLiveSideEffects: expect.objectContaining({
        liveClaim: false,
        liveContractWrite: false,
        livePayout: false,
        liveProviderCall: false,
        liveQueuePublishing: false,
        liveRewardCustody: false,
        liveRewardDistribution: false,
        liveSchedulerExecution: false,
        liveWalletSignature: false,
        liveWorkerExecution: false,
      }),
      productionReady: false,
      source: "server_runtime",
      status: "blocked",
      summary: expect.objectContaining({
        itemCount: 11,
        missingEvidenceCount: rewardDistributionHandoffRequiredEvidenceKeys.length,
        recipientCount: 4,
      }),
    });
    expect(Object.values(report.rewardDistributionHandoffRuntime.noLiveSideEffects).every((value) => value === false))
      .toBe(true);
    expect(JSON.stringify(report.rewardDistributionHandoffRuntime)).not.toContain("providerPayload");
    expect(JSON.stringify(report.rewardDistributionHandoffRuntime)).not.toContain("transactionId");
    expect(report.providerIndexerFoundation).toMatchObject({
      blockerCount: 0,
      diagnosticCodes: [],
      noLiveFlags: {
        liveAiCallsEnabled: false,
        liveAnalyticsIngestionEnabled: false,
        liveContractCallsEnabled: false,
        liveIndexerCallsEnabled: false,
        liveObjectStorageEnabled: false,
        liveProviderCallsEnabled: false,
        liveSocialCallsEnabled: false,
        workerExecutionEnabled: false,
      },
      productionReady: false,
      profileId: "local-review",
      providerGroupCount: 10,
      status: "local_ready",
      valid: true,
      verificationSourceCoverage: {
        summaryCount: 5,
      },
      verificationSourceHandoff: {
        liveExecutionEnabled: false,
        supportedVerificationTypes: ["WALLET", "ON_CHAIN", "DAPP_API", "SOCIAL", "MANUAL"],
        valid: true,
      },
    });
    expect(report.providerIndexerFoundation.degradationPolicy).toMatchObject({
      allowedOutcomes: [
        "pending",
        "manual_review",
        "disable_provider_task_templates",
        "local_only",
        "blocked",
      ],
      providerBackedUnavailableOutcomes: [
        "pending",
        "disable_provider_task_templates",
        "manual_review",
      ],
    });
    expect(report.providerClientReadiness).toMatchObject({
      activationInventory: {
        activationStatus: "disabled",
        blockedConfigKeys: [],
        blockerIds: [],
        redacted: true,
        requiredConfigKeys: expect.arrayContaining(providerClientRequiredConfigKeys),
      },
      activationStatus: "disabled",
      blockerCount: 0,
      diagnosticCodes: [],
      downstreamLiveFlags: {
        alternateQueuePublish: false,
        analyticsIngestion: false,
        contractCalls: false,
        objectStorageWrites: false,
        rewardDistribution: false,
        schedulerExecution: false,
        telemetryVendorExport: false,
      },
      id: "campaign-os-provider-indexer-client-readiness",
      liveProviderCallsAttempted: false,
      productionReady: false,
      providerClientsEnabled: false,
      providerClientsProvided: false,
      queueHandoff: {
        consumeReadinessStatus: "disabled",
        queueId: "verification-jobs",
        workerJobId: "task-verification-worker",
      },
      registry: {
        clients: [],
        providerGroups: expect.arrayContaining([
          "aefinder-aelfscan-indexers",
          "dapp-api-adapters",
          "manual-review",
          "social-api-adapters",
          "wallet-auth-session",
        ]),
      },
      requiredConfigKeys: expect.arrayContaining(providerClientRequiredConfigKeys),
      status: "disabled",
      valid: true,
    });
    expect(report.providerClientReadiness.status).not.toBe(report.providerIndexerFoundation.status);
    expect(report.providerClientReadiness.queueHandoff.consumeReadinessStatus).toBe(
      report.queueRuntimeFoundation.consumingReadiness.status,
    );
    expect(report.workerSchedulerFoundation).toMatchObject({
      blockerCount: 0,
      diagnosticCodes: [],
      id: "campaign-os-worker-scheduler-foundation",
      jobCatalogCoverage: {
        jobCatalogCount: 9,
        jobFamilyCount: 9,
        productionDependencyIds: expect.arrayContaining([
          "worker-queue",
          "scheduler-endpoint",
          "idempotency-store",
          "worker-lease",
          "observability",
          "provider-handoff",
        ]),
        requiredConfigKeys: expect.arrayContaining([
          "CAMPAIGN_OS_WORKER_QUEUE_URL",
          "CAMPAIGN_OS_SCHEDULER_ENDPOINT",
        ]),
        triggerSourceCount: 6,
      },
      noLiveFlags: {
        liveCronExecutionEnabled: false,
        liveQueuePublishingEnabled: false,
        liveSchedulerExecutionEnabled: false,
        liveWorkerExecutionEnabled: false,
      },
      productionReady: false,
      schedulePolicyCoverage: {
        idempotencyPolicyCount: 9,
        retryPolicyCount: 8,
        schedulePolicyCount: 9,
      },
      status: "local_ready",
      valid: true,
      verificationSourceHandoff: {
        id: "campaign-os-verification-source-handoff",
        liveExecutionEnabled: false,
        supportedVerificationTypes: ["WALLET", "ON_CHAIN", "DAPP_API", "SOCIAL", "MANUAL"],
        valid: true,
        workerRequiredPolicyCount: 3,
      },
    });
    expect(report.queueRuntimeFoundation).toMatchObject({
      blockerCount: 0,
      diagnosticCodes: [],
      dryRunEnqueue: {
        enabled: true,
        livePublishAttempted: false,
        liveQueuePublishingEnabled: false,
      },
      id: "campaign-os-queue-runtime-foundation",
      noLiveFlags: {
        liveAiCallsEnabled: false,
        liveAnalyticsIngestionEnabled: false,
        liveContractCallsEnabled: false,
        liveCronExecutionEnabled: false,
        liveObjectStorageEnabled: false,
        liveProviderCallsEnabled: false,
        liveQueuePublishingEnabled: false,
        liveRewardDistributionEnabled: false,
        liveSchedulerExecutionEnabled: false,
        liveSocialCallsEnabled: false,
        liveWorkerExecutionEnabled: false,
      },
      productionReady: false,
      profileId: "local-review",
      consumingReadiness: {
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
        productionReady: false,
        requiredConfigKeys: expect.arrayContaining([
          "CAMPAIGN_OS_LIVE_QUEUE_CONSUME_ENABLEMENT",
          "CAMPAIGN_OS_LIVE_QUEUE_CONSUMER",
          "CAMPAIGN_OS_CONSUME_HANDLER_REGISTRY",
        ]),
        retryScheduled: false,
        status: "disabled",
      },
      publishingReadiness: {
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
      },
      queuePlanCoverage: {
        jobIds: expect.arrayContaining([
          "task-verification-worker",
          "campaign-lifecycle-worker",
          "reward-distribution-handoff-worker",
        ]),
        queueCategories: expect.arrayContaining([
          "verification",
          "lifecycle",
          "operations",
          "analytics",
          "ai",
          "contract",
          "reward",
        ]),
        queueCategoryCount: 7,
        queueIds: expect.arrayContaining([
          "verification-jobs",
          "lifecycle-jobs",
          "operations-jobs",
          "analytics-jobs",
          "ai-ops-jobs",
          "contract-jobs",
          "reward-jobs",
        ]),
        queuePlanCount: 9,
        requiredConfigKeys: expect.arrayContaining([
          "CAMPAIGN_OS_QUEUE_PROVIDER",
          "CAMPAIGN_OS_WORKER_QUEUE_URL",
          "CAMPAIGN_OS_WORKER_RETRY_POLICY",
          "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL",
          "CAMPAIGN_OS_WORKER_LEASE_STORE_URL",
          "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
          "CAMPAIGN_OS_PROVIDER_REGISTRY_URL",
          "CAMPAIGN_OS_DEGRADATION_POLICY",
          "CAMPAIGN_OS_DEAD_LETTER_QUEUE",
        ]),
      },
      status: "local_ready",
      valid: true,
    });
    expect(report.queueRuntimeFoundation.providerAdapter).toMatchObject({
      adapterId: "local-dry-run-queue-provider-adapter",
      driverConsumeAttemptPolicy: "disabled_no_live",
      driverConsumeRequestEvaluated: false,
      driverConsumeResultStatus: "not_requested",
      driverConsumingActivationStatus: "disabled",
      driverConsumingBlockerCount: 0,
      driverConsumingConsumerId: "not_configured",
      driverConsumingConsumerProvided: false,
      driverConsumingHandlerRegistryProvided: false,
      driverConsumingLiveConsumeAttempted: false,
      driverConsumingLiveQueueConsumptionEnabled: false,
      driverConsumingStatus: "disabled",
      driverLiveQueueConsumptionEnabled: false,
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
      driverSdkBindingBlockerCount: 0,
      driverSdkBindingDiagnosticCodes: [],
      driverSdkBindingDisabledLiveOperationCount: 8,
      driverSdkBindingId: "local-stub-queue-provider-sdk-binding",
      driverSdkBindingLiveProviderCallAttempted: false,
      driverSdkBindingLiveQueuePublishingEnabled: false,
      driverSdkBindingLiveWorkerExecutionEnabled: false,
      driverSdkBindingMode: "dry_run",
      driverSdkBindingOperationCount: 8,
      driverSdkBindingProductionReady: false,
      driverSdkBindingProviderKind: "local-stub",
      driverSdkBindingPackageBindingBullmqConstructionAttempted: false,
      driverSdkBindingPackageBindingBullmqConstructionBlockerCount: 0,
      driverSdkBindingPackageBindingBullmqConstructionDiagnosticCodes: [],
      driverSdkBindingPackageBindingBullmqConstructionFactoryInvoked: false,
      driverSdkBindingPackageBindingBullmqConstructionId: "bullmq-construction-local",
      driverSdkBindingPackageBindingBullmqConstructionProductionReady: false,
      driverSdkBindingPackageBindingBullmqConstructionStatus: "local_ready",
      driverSdkBindingPackageBindingQueueClientConstructed: false,
      driverSdkBindingPackageBindingQueueEventsConstructed: false,
      driverSdkBindingPackageBindingWorkerConstructed: false,
      driverSdkBindingRequiredConfigKeys: expect.arrayContaining([
        "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE",
        "CAMPAIGN_OS_QUEUE_PROVIDER_BINDING",
        "CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT",
      ]),
      driverSdkBindingSdkClientConstructed: false,
      driverSdkBindingSdkPackageRef: "local-stub-sdk-package",
      driverSdkBindingStatus: "local_ready",
      driverSdkBindingValid: true,
    });
    expect(report.workerLeaseStoreFoundation).toMatchObject({
      adapterId: "local-dry-run-worker-lease-store-adapter",
      blockerCount: 0,
      diagnosticCodes: [],
      disabledLiveOperationCount: 8,
      heartbeatIntervalSeconds: 30,
      id: "campaign-os-worker-lease-store-foundation",
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      mode: "dry_run",
      noLiveFlags: {
        liveAiCallsEnabled: false,
        liveAnalyticsIngestionEnabled: false,
        liveContractCallsEnabled: false,
        liveCronExecutionEnabled: false,
        liveObjectStorageEnabled: false,
        liveProviderCallsEnabled: false,
        liveQueuePublishingEnabled: false,
        liveRewardDistributionEnabled: false,
        liveSchedulerExecutionEnabled: false,
        liveSocialCallsEnabled: false,
        liveWorkerExecutionEnabled: false,
      },
      operationCount: 8,
      productionReady: false,
      profileId: "local-review",
      requiredConfigKeys: expect.arrayContaining(workerLeaseRequiredConfigKeys),
      status: "local_ready",
      storeId: "local-dry-run",
      ttlSeconds: 120,
      valid: true,
    });
    expect(report.workerLeaseStoreFoundation.disabledLiveOperationCount).toBe(
      report.workerLeaseStoreFoundation.operationCount,
    );
    expect(report.workerIdempotencyStoreFoundation).toMatchObject({
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
      noLiveFlags: {
        liveAiCallsEnabled: false,
        liveAnalyticsIngestionEnabled: false,
        liveContractCallsEnabled: false,
        liveCronExecutionEnabled: false,
        liveIdempotencyExecutionEnabled: false,
        liveObjectStorageEnabled: false,
        liveProviderCallsEnabled: false,
        liveQueuePublishingEnabled: false,
        liveRewardDistributionEnabled: false,
        liveSchedulerExecutionEnabled: false,
        liveSocialCallsEnabled: false,
        liveWorkerExecutionEnabled: false,
      },
      operationCount: 8,
      productionReady: false,
      profileId: "local-review",
      requiredConfigKeys: expect.arrayContaining(workerIdempotencyRequiredConfigKeys),
      status: "local_ready",
      storeId: "local-dry-run",
      valid: true,
    });
    expect(report.workerIdempotencyStoreFoundation.disabledLiveOperationCount).toBe(
      report.workerIdempotencyStoreFoundation.operationCount,
    );
    expect(report.schedulerRuntimeFoundation).toMatchObject({
      blockerCount: 0,
      diagnosticCodes: [],
      dryRunTrigger: {
        enabled: true,
        liveCronExecutionEnabled: false,
        liveQueuePublishingEnabled: false,
        liveSchedulerExecutionEnabled: false,
      },
      id: "campaign-os-scheduler-runtime-foundation",
      noLiveFlags: {
        liveCronExecutionEnabled: false,
        liveQueuePublishingEnabled: false,
        liveSchedulerExecutionEnabled: false,
        liveWorkerExecutionEnabled: false,
      },
      productionReady: false,
      profileId: "local-review",
      registrationCoverage: {
        jobFamilies: expect.arrayContaining([
          "campaign_lifecycle",
          "eligibility_refresh",
          "export_preparation",
          "analytics_ingestion_handoff",
          "ai_ops_report",
          "stale_review_cleanup",
          "contract_sync_handoff",
          "reward_distribution_handoff",
          "task_verification",
        ]),
        registrationCount: 9,
        requiredConfigKeys: expect.arrayContaining([
          "CAMPAIGN_OS_SCHEDULER_PROVIDER",
          "CAMPAIGN_OS_SCHEDULER_ENDPOINT",
          "CAMPAIGN_OS_SCHEDULER_LEASE_STORE_URL",
          "CAMPAIGN_OS_OPERATOR_AUTHORIZATION_POLICY",
        ]),
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
        triggerSourceCount: 4,
      },
      status: "local_ready",
      valid: true,
    });
    expect(report.observabilityExporterFoundation).toMatchObject({
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
      profileId: "local-review",
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
    });
    expect(report.providerIndexerFoundation.requiredConfigKeys).toEqual(
      expect.arrayContaining([
        "CAMPAIGN_OS_PROVIDER_CREDENTIALS",
        "CAMPAIGN_OS_INDEXER_ENDPOINT",
        "CAMPAIGN_OS_DEGRADATION_POLICY",
        "CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT",
      ]),
    );
    expect(report.backendRuntimeBootstrap.deferredDependencyIds).toEqual(
      expect.arrayContaining([
        "production-database-driver",
        "auth-middleware",
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
    expect(report.campaignDbVerticalSlice).toMatchObject({
      adapter: {
        deterministic: true,
        id: "campaign-os-deterministic-test-driver",
        productionReady: false,
        status: "active_local",
      },
      capabilities: {
        deterministicLifecycle: true,
        recordDraft: true,
        readDraft: true,
        writeDraft: true,
      },
      campaignStore: {
        boundedListLimit: 100,
        durable: false,
        fallbackUsed: false,
        mode: "local_seeded",
        participantRecordCount: 0,
        referralBindingRecordCount: 0,
        recordCount: 0,
        status: "ready",
        storeId: "campaign-db",
      },
      diagnosticCodes: [],
      id: "campaign-db-vertical-slice",
      lifecycle: {
        readinessDoesNotMutateRecords: true,
        repositoryContractStatus: "available",
        repositoryMode: "deterministic_test",
      },
      migrationState: {
        appliedMigrationIds: ["001-campaign-db-v0-2-0"],
        blockedMigrationIds: [],
        diagnosticCodes: [],
        liveExecutionEnabled: false,
        pendingMigrationIds: [],
        requiredMigrationIds: ["001-campaign-db-v0-2-0"],
        schemaVersion: "v0.2.0",
        status: "applied",
        storeId: "campaign-db",
      },
      noLive: {
        connectionAttempted: false,
        migrationExecutionEnabled: false,
        queryExecutionEnabled: false,
        writeExecutionEnabled: false,
      },
      productionActivationBlockers: [],
      participantReadModel: {
        contractTransactionsEnabled: false,
        durableTestMode: false,
        futureHandoff: "future Campaign DB participant table service",
        liveWalletVerificationEnabled: false,
        localDeterministicMode: true,
        participantRecordCount: 0,
        productionDbMigrationReady: false,
        recordName: "campaign_participants",
        rewardDistributionEnabled: false,
        status: "available",
        storeId: "campaign-db",
      },
      referralBindingReadModel: {
        contractTransactionsEnabled: false,
        durableTestMode: false,
        futureHandoff: "future Campaign DB referral binding table service",
        liveProviderRiskSignalsEnabled: false,
        liveWalletVerificationEnabled: false,
        localDeterministicMode: true,
        productionDbMigrationReady: false,
        providerCallsEnabled: false,
        recordName: "campaign_referral_bindings",
        referralBindingRecordCount: 0,
        rewardDistributionEnabled: false,
        status: "available",
        storeId: "campaign-db",
      },
      repositoryContract: {
        bindReferral: true,
        createDraft: true,
        getById: true,
        getParticipant: true,
        getReferralBinding: true,
        health: true,
        list: true,
        listParticipantsByCampaignId: true,
        listReferralBindings: true,
        markReferralQualified: true,
        reset: true,
        upsertParticipant: true,
      },
      status: "ready",
      storeId: "campaign-db",
      validation: {
        issues: [],
        valid: true,
      },
    });
    expect(report.apiFoundation.servicePorts.validation.valid).toBe(true);
    expect(report.apiFoundation.validation.valid).toBe(true);
    expect(report.topology.validation.valid).toBe(true);
  });

  it("distinguishes an explicit durable Campaign DB store with applied migration evidence", () => {
    const report = createBackendServiceReadinessReport({
      campaignStore: {
        durable: true,
        mode: "durable_test",
        participantRecordCount: 4,
        referralBindingRecordCount: 3,
        recordCount: 2,
      },
    });

    expect(report.campaignDbVerticalSlice).toMatchObject({
      campaignStore: {
        durable: true,
        fallbackUsed: false,
        mode: "durable_test",
        participantRecordCount: 4,
        referralBindingRecordCount: 3,
        recordCount: 2,
        status: "ready",
        storeId: "campaign-db",
      },
      lifecycle: {
        repositoryContractStatus: "available",
        repositoryMode: "durable_test",
      },
      participantReadModel: {
        contractTransactionsEnabled: false,
        durableTestMode: true,
        futureHandoff: "future Campaign DB participant table service",
        liveWalletVerificationEnabled: false,
        localDeterministicMode: false,
        participantRecordCount: 4,
        productionDbMigrationReady: false,
        recordName: "campaign_participants",
        rewardDistributionEnabled: false,
        status: "available",
        storeId: "campaign-db",
      },
      referralBindingReadModel: {
        contractTransactionsEnabled: false,
        durableTestMode: true,
        futureHandoff: "future Campaign DB referral binding table service",
        liveProviderRiskSignalsEnabled: false,
        liveWalletVerificationEnabled: false,
        localDeterministicMode: false,
        productionDbMigrationReady: false,
        providerCallsEnabled: false,
        recordName: "campaign_referral_bindings",
        referralBindingRecordCount: 3,
        rewardDistributionEnabled: false,
        status: "available",
        storeId: "campaign-db",
      },
      migrationState: {
        appliedMigrationIds: ["001-campaign-db-v0-2-0"],
        blockedMigrationIds: [],
        liveExecutionEnabled: false,
        status: "applied",
        storeId: "campaign-db",
      },
      status: "ready",
      validation: {
        issues: [],
        valid: true,
      },
    });
  });

  it("surfaces blocked durable Campaign DB store diagnostics", () => {
    const report = createBackendServiceReadinessReport({
      campaignStore: {
        durable: true,
        mode: "durable_test",
        status: "blocked",
      },
    });

    expect(report.campaignDbVerticalSlice).toMatchObject({
      campaignStore: {
        durable: true,
        mode: "durable_test",
        status: "blocked",
      },
      diagnosticCodes: ["CAMPAIGN_DB_DURABLE_STORE_BLOCKED"],
      lifecycle: {
        repositoryContractStatus: "blocked",
        repositoryMode: "durable_test",
      },
      status: "blocked",
      validation: {
        issues: [
          expect.objectContaining({
            code: "CAMPAIGN_DB_DURABLE_STORE_BLOCKED",
            field: "campaignStore.status",
          }),
        ],
        valid: false,
      },
    });
    expect(report.validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "CAMPAIGN_DB_VERTICAL_SLICE_BLOCKED",
          field: "campaignDbVerticalSlice",
        }),
      ]),
    );
  });

  it("publishes attach points for all deferred production backend areas", () => {
    expect(backendAttachMap.map((item) => item.area)).toEqual(productionAreas);

    const report = createBackendServiceReadinessReport();

    for (const attachPoint of report.attachMap) {
      expect(attachPoint.attachPoint).not.toHaveLength(0);
      expect(attachPoint.blockedBy.length).toBeGreaterThan(0);
      expect(attachPoint.requiredBeforeProduction).toBe(true);
    }
    expect(report.attachMap.find((item) => item.area === "auth-session")).toMatchObject({
      attachPoint: "src/server/authSession.ts:createAuthSessionReadinessReport",
      blockedBy: expect.arrayContaining([
        "live wallet signature verifier",
        "auth nonce store",
        "JWT or session cookie issuer",
        "session signing key",
        "secret manager",
        "production session store",
        "RBAC enforcement",
        "project ownership source",
        "admin organization model",
        "agent credential provider",
      ]),
      currentStatus: "local-only",
      note: expect.stringContaining("sanitized wallet session repository records are ready"),
    });
    expect(report.attachMap.find((item) => item.area === "worker-lease")).toMatchObject({
      attachPoint: "src/server/workerLeaseStore.ts",
      blockedBy: expect.arrayContaining([
        "lease store selection",
        "lease store endpoint",
        "lease credentials",
        "clock source",
        "heartbeat policy",
        "TTL policy",
        "release policy",
        "stale recovery policy",
        "fencing policy",
        "idempotency coordination",
        "observability exporter",
      ]),
      currentStatus: "deferred",
      note: expect.stringContaining("no live lease claim"),
      requiredBeforeProduction: true,
    });
    expect(report.attachMap.find((item) => item.area === "worker-idempotency")).toMatchObject({
      attachPoint: "src/server/workerIdempotencyStore.ts",
      blockedBy: expect.arrayContaining([
        "idempotency store selection",
        "idempotency store endpoint",
        "idempotency store credentials",
        "namespace",
        "key schema version",
        "retention policy",
        "conflict policy",
        "completion policy",
        "clock source",
        "worker lease coordination",
        "observability exporter",
      ]),
      currentStatus: "deferred",
      note: expect.stringContaining("no live idempotency claim"),
      requiredBeforeProduction: true,
    });
    expect(report.attachMap.find((item) => item.area === "observability")).toMatchObject({
      attachPoint: "src/server/observabilityExporter.ts",
      blockedBy: expect.arrayContaining([
        "exporter selection",
        "exporter endpoint",
        "metrics sink registration",
        "trace collector",
        "structured log sink",
        "alert routing",
        "redaction policy",
        "operator runbook",
      ]),
      currentStatus: "deferred",
      note: expect.stringContaining("no live telemetry"),
      requiredBeforeProduction: true,
    });
    expect(report.attachMap.find((item) => item.area === "contract-writer")).toMatchObject({
      blockedBy: expect.arrayContaining([...contractWriterRequiredConfigKeys]),
      currentStatus: "blocked",
    });
    expect(report.attachMap.find((item) => item.area === "reward-distribution")).toMatchObject({
      blockedBy: expect.arrayContaining(["reward distribution mission", ...contractWriterRequiredConfigKeys]),
      currentStatus: "blocked",
    });
    expect(JSON.stringify(report.attachMap)).not.toContain(genericContractWriterMissionCopy);
  });

  it("keeps production persistence and migration runner inactive in local review", () => {
    const report = createBackendServiceReadinessReport();

    expect(report.persistenceAdapters.activeAdapter).toMatchObject({
      id: "campaign-os-memory-adapter",
      kind: "memory",
      status: "active",
    });
    expect(report.persistenceAdapters.adapters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "campaign-os-production-db-adapter",
          kind: "production_deferred",
          status: "deferred",
        }),
      ]),
    );
    expect(report.migration).toMatchObject({
      noLiveMigrationCommand: true,
      noMigrationRunner: false,
      runnerStatus: "disabled_local_review",
    });
    expect(report.databaseReadiness).toMatchObject({
      adapter: expect.objectContaining({
        id: "campaign-os-production-db-adapter",
        status: "contract_ready",
      }),
      migrationPlan: expect.objectContaining({
        dryRun: true,
        liveExecutionEnabled: false,
        status: "dry_run_ready",
      }),
      validation: expect.objectContaining({
        valid: true,
      }),
    });
    expect(report.databaseAdapterRuntime).toMatchObject({
      driverId: "campaign-os-deterministic-test-driver",
      liveConnectionAttempted: false,
      liveQueryExecutionEnabled: false,
      migrationExecutor: expect.objectContaining({
        executorStatus: "not_configured",
        liveExecutionCount: 0,
        liveExecutionEnabled: false,
      }),
      migrationHandoff: expect.objectContaining({
        executorStatus: "not_configured",
        liveExecutionCount: 0,
        liveExecutionEnabled: false,
        migrationGateStatus: "ready",
        valid: true,
      }),
      productionDbRuntime: expect.objectContaining({
        connection: expect.objectContaining({
          safeLabel: "deterministic_fixture",
          state: "ready",
        }),
        diagnosticCodes: [],
        id: "campaign-os-production-db-runtime-v1",
        liveConnectionAttempted: false,
        liveQueryExecutionEnabled: false,
        migrationGate: expect.objectContaining({
          liveExecutionEnabled: false,
          status: "not_required_for_fixture",
        }),
        ownerStoreCount: 6,
        packageBindingBlockerCount: 0,
        packageBindingDiagnosticCodes: [],
        packageBindingProductionReady: false,
        packageBindingStatus: "local_ready",
        profileId: "local-review",
        schemaManifestId: "campaign-os-production-db-schema-v0.2",
        status: "ready",
        valid: true,
      }),
      packageBinding: expect.objectContaining({
        bindingId: "campaign-os-postgresql-package-binding-local",
        blockerCount: 0,
        diagnosticCodes: [],
        liveConnectionAttempted: false,
        liveMigrationExecutionEnabled: false,
        liveProductionMutationEnabled: false,
        liveProviderCallsEnabled: false,
        liveQueryExecutionEnabled: false,
        liveTransactionExecutionEnabled: false,
        packageName: "pg",
        packageRef: "npm:pg",
        productionReady: false,
        status: "local_ready",
        valid: true,
      }),
      profileId: "local-review",
      providerId: "campaign-os-deterministic-test-db",
      queryAdapter: expect.objectContaining({
        deterministicTestMode: true,
        liveQueryExecutionEnabled: false,
      }),
      status: "active_local",
      transaction: expect.objectContaining({
        liveCommitEnabled: false,
        mode: "deterministic_test",
        supported: true,
      }),
      valid: true,
    });
    expect(report.databaseAdapterRuntime.stores.map((store) => store.id)).toEqual([
      "campaign-db",
      "wallet-session-db",
      "task-evidence-db",
      "i18n-content-db",
      "risk-event-db",
      "points-ledger",
    ]);
    expect(report.persistenceRuntime).toMatchObject({
      activeDriverId: "campaign-os-memory-adapter",
      connection: expect.objectContaining({
        state: "not_configured",
      }),
      deferredDependencies: expect.arrayContaining([
        expect.objectContaining({
          id: "db-provider-selection",
          requiredBeforeProduction: true,
          status: "deferred",
        }),
        expect.objectContaining({
          id: "secret-manager",
          requiredBeforeProduction: true,
          status: "deferred",
        }),
        expect.objectContaining({
          id: "object-storage-export",
          requiredBeforeProduction: true,
          status: "deferred",
        }),
        expect.objectContaining({
          id: "analytics-warehouse",
          requiredBeforeProduction: true,
          status: "deferred",
        }),
      ]),
      diagnostics: [],
      liveConnectionAttempted: false,
      migrationGate: expect.objectContaining({
        diagnostics: [],
        liveExecutionCount: 0,
        liveExecutionEnabled: false,
        mode: "dry_run_only",
        status: "ready",
      }),
      profileId: "local-review",
      status: "active_local",
      stores: expect.arrayContaining([
        expect.objectContaining({
          id: "campaign-db",
          required: true,
          runtimeState: "covered",
          schemaVersion: "v0.2.0",
        }),
      ]),
      valid: true,
    });
    expect(report.persistenceFoundation).toMatchObject({
      blockerCount: 11,
      diagnosticCodes: ["DATABASE_MIGRATION_LIVE_EXECUTION_DISABLED"],
      foundationId: "campaign-os-production-persistence-foundation-v0.2",
      liveConnectionAttempted: false,
      liveMigrationExecutionEnabled: false,
      liveQueryExecutionEnabled: false,
      migrationDryRun: {
        liveMigrationExecutionEnabled: false,
        migrationGateStatus: "ready",
        noLiveMigrationCommand: true,
        runnerStatus: "disabled_local_review",
        status: "dry_run_ready",
      },
      productionBlockerIds: expect.arrayContaining([
        "db-provider-selection",
        "driver-package",
        "connection-config",
        "migration-executor",
        "secret-manager",
        "object-storage-export",
        "analytics-warehouse",
      ]),
      productionReady: false,
      requiredStoreCount: 6,
      status: "metadata_ready",
      storeCoverage: {
        coverageComplete: true,
        coveredStoreCount: 6,
        requiredStoreCount: 6,
      },
      storeCoverageCount: 6,
      valid: true,
    });
    expect(report.databaseReadiness.stores.map((store) => store.id)).toEqual([
      "campaign-db",
      "wallet-session-db",
      "task-evidence-db",
      "i18n-content-db",
      "risk-event-db",
      "points-ledger",
    ]);
  });

  it("surfaces fail-closed diagnostics for invalid backend config", () => {
    const report = createBackendServiceReadinessReport({
      configOptions: {
        env: {
          CAMPAIGN_OS_BACKEND_PROFILE: "production-live",
          CAMPAIGN_OS_ENABLE_CONTRACT_WRITER: "true",
          CAMPAIGN_OS_PERSISTENCE_MODE: "postgres",
        },
      },
    });

    expect(report.validation.valid).toBe(false);
    expect(report.validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "BACKEND_CONFIG_BLOCKED",
          field: "config",
          severity: "error",
        }),
      ]),
    );
    expect(report.config.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "UNKNOWN_BACKEND_PROFILE" }),
        expect.objectContaining({ code: "UNSUPPORTED_PERSISTENCE_MODE" }),
      ]),
    );
  });

  it("fails closed for production-required until database and migration readiness are live", () => {
    const report = createBackendServiceReadinessReport({
      configOptions: {
        env: {
          CAMPAIGN_OS_AUTH_SECRET: "auth-secret",
          CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT: "https://writer.invalid",
          CAMPAIGN_OS_DATABASE_URL: "postgres://db.invalid/campaign-os",
          CAMPAIGN_OS_DEAD_LETTER_QUEUE: "https://queue.invalid/dead-letter?token=queue-secret",
          CAMPAIGN_OS_DEGRADATION_POLICY: "fail-closed",
          CAMPAIGN_OS_CLOCK_SOURCE: "system-monotonic",
          CAMPAIGN_OS_IDEMPOTENCY_COMPLETION_POLICY: "return-completion-evidence",
          CAMPAIGN_OS_IDEMPOTENCY_CONFLICT_POLICY: "manual-review",
          CAMPAIGN_OS_IDEMPOTENCY_KEY_SCHEMA_VERSION: "v1",
          CAMPAIGN_OS_IDEMPOTENCY_NAMESPACE: "campaign-os-workers",
          CAMPAIGN_OS_IDEMPOTENCY_RETENTION_DAYS: "30",
          CAMPAIGN_OS_IDEMPOTENCY_STORE: "production-idempotency-store",
          CAMPAIGN_OS_IDEMPOTENCY_STORE_CREDENTIALS: "idempotency-credentials-ready",
          CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "https://idempotency.invalid/store",
          CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "https://observability.invalid/hook",
          CAMPAIGN_OS_OPERATOR_AUTHORIZATION_POLICY: "operator-review-required",
          CAMPAIGN_OS_OPERATOR_RUNBOOK_URL: "https://runbooks.invalid/queue-provider-driver",
          CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT: "explicitly-enabled",
          CAMPAIGN_OS_PROVIDER_REGISTRY_URL: "https://providers.invalid",
          CAMPAIGN_OS_QUEUE_PROVIDER: "metadata-only",
          CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS: "queue-provider-auth-ready",
          CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER: "metadata-only-queue-provider-driver",
          CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT: "https://queue-provider.invalid",
          CAMPAIGN_OS_SCHEDULER_ENDPOINT: "https://scheduler.invalid/hook",
          CAMPAIGN_OS_SCHEDULER_LEASE_STORE_URL: "https://lease.invalid/store",
          CAMPAIGN_OS_SCHEDULER_PROVIDER: "metadata-only",
          CAMPAIGN_OS_WORKER_LEASE_CREDENTIALS: "worker-lease-credentials-ready",
          CAMPAIGN_OS_WORKER_LEASE_FENCING_POLICY: "token-per-job",
          CAMPAIGN_OS_WORKER_LEASE_HEARTBEAT_SECONDS: "45",
          CAMPAIGN_OS_WORKER_LEASE_RELEASE_POLICY: "release-on-terminal-state",
          CAMPAIGN_OS_WORKER_LEASE_STALE_RECOVERY_POLICY: "manual-review",
          CAMPAIGN_OS_WORKER_LEASE_STORE: "production-lease-store",
          CAMPAIGN_OS_WORKER_LEASE_STORE_URL: "https://lease.invalid/worker",
          CAMPAIGN_OS_WORKER_LEASE_TTL_SECONDS: "180",
          CAMPAIGN_OS_WORKER_QUEUE_URL: "https://queue-user:queue-pass@queue.invalid/jobs?token=queue-secret",
          CAMPAIGN_OS_WORKER_RETRY_POLICY: "deterministic-backoff",
        },
        profileId: "production-required",
      },
    });

    expect(report.config.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_PRODUCTION_CONFIG",
          field: "CAMPAIGN_OS_OBSERVABILITY_EXPORTER",
        }),
        expect.objectContaining({
          code: "MISSING_PRODUCTION_CONFIG",
          field: "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_CREDENTIALS",
        }),
        expect.objectContaining({
          code: "MISSING_PRODUCTION_CONFIG",
          field: "CAMPAIGN_OS_OBSERVABILITY_SINK",
        }),
      ]),
    );
    expect(report.observabilityExporterFoundation).toMatchObject({
      blockerCount: expect.any(Number),
      diagnosticCodes: expect.arrayContaining([
        "OBSERVABILITY_EXPORTER_MISSING",
        "OBSERVABILITY_CREDENTIALS_MISSING",
        "OBSERVABILITY_SINK_MISSING",
        "OBSERVABILITY_METRIC_NAMESPACE_MISSING",
      ]),
      liveAlertRoutingEnabled: false,
      liveLogExportEnabled: false,
      liveMetricsExportEnabled: false,
      liveTelemetryExportEnabled: false,
      liveTraceExportEnabled: false,
      mode: "production_required",
      productionReady: false,
      status: "blocked",
      valid: false,
    });
    expect(report.databaseReadiness).toMatchObject({
      adapter: expect.objectContaining({
        status: "blocked",
      }),
      migrationPlan: expect.objectContaining({
        status: "blocked",
      }),
      validation: expect.objectContaining({
        valid: false,
      }),
    });
    expect(report.databaseAdapterRuntime).toMatchObject({
      connectionPool: expect.objectContaining({
        configuredKeyCount: 1,
        safeLabel: "[redacted]",
        state: "configured_redacted",
      }),
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ code: "DATABASE_DRIVER_PRODUCTION_DEFERRED" }),
        expect.objectContaining({ code: "DATABASE_ADAPTER_SECRET_REDACTED" }),
        expect.objectContaining({ code: "DATABASE_ADAPTER_PRECONDITION_DEFERRED" }),
      ]),
      driverId: "campaign-os-production-driver-deferred",
      liveConnectionAttempted: false,
      liveQueryExecutionEnabled: false,
      migrationExecutor: expect.objectContaining({
        executorStatus: "blocked",
        liveExecutionCount: 0,
        liveExecutionEnabled: false,
      }),
      migrationHandoff: expect.objectContaining({
        executorStatus: "blocked",
        liveExecutionCount: 0,
        liveExecutionEnabled: false,
        migrationGateStatus: "blocked",
        valid: false,
      }),
      productionDbRuntime: expect.objectContaining({
        connection: expect.objectContaining({
          safeLabel: "[redacted]",
          state: "configured_redacted",
        }),
        diagnosticCodes: expect.arrayContaining([
          "PRODUCTION_DB_DRIVER_DEFERRED",
          "PRODUCTION_DB_SECRET_REDACTED",
          "PRODUCTION_DB_MIGRATION_GATE_BLOCKED",
        ]),
        liveConnectionAttempted: false,
        liveQueryExecutionEnabled: false,
        migrationGate: expect.objectContaining({
          liveExecutionEnabled: false,
          status: "blocked",
        }),
        packageBindingBlockerCount: expect.any(Number),
        packageBindingDiagnosticCodes: expect.arrayContaining([
          "PRODUCTION_DB_PACKAGE_REFERENCE_MISSING",
          "PRODUCTION_DB_PACKAGE_BINDING_MISSING",
          "PRODUCTION_DB_PROVIDER_SELECTION_MISSING",
          "PRODUCTION_DB_CONNECTION_REFERENCE_MISSING",
          "PRODUCTION_DB_SECRET_MANAGER_REFERENCE_MISSING",
          "PRODUCTION_DB_CONNECTION_POOL_POLICY_MISSING",
          "PRODUCTION_DB_MIGRATION_APPROVAL_MISSING",
          "PRODUCTION_DB_ROLLBACK_BACKUP_MISSING",
          "PRODUCTION_DB_OBSERVABILITY_MISSING",
          "PRODUCTION_DB_RUNBOOK_MISSING",
          "PRODUCTION_DB_LIVE_ENABLEMENT_MISSING",
        ]),
        packageBindingProductionReady: false,
        packageBindingStatus: "blocked",
        profileId: "production-required",
        status: "blocked",
        valid: false,
      }),
      packageBinding: expect.objectContaining({
        blockerCount: expect.any(Number),
        diagnosticCodes: expect.arrayContaining([
          "PRODUCTION_DB_PACKAGE_REFERENCE_MISSING",
          "PRODUCTION_DB_PACKAGE_BINDING_MISSING",
          "PRODUCTION_DB_PROVIDER_SELECTION_MISSING",
          "PRODUCTION_DB_CONNECTION_REFERENCE_MISSING",
          "PRODUCTION_DB_SECRET_MANAGER_REFERENCE_MISSING",
          "PRODUCTION_DB_CONNECTION_POOL_POLICY_MISSING",
          "PRODUCTION_DB_MIGRATION_APPROVAL_MISSING",
          "PRODUCTION_DB_ROLLBACK_BACKUP_MISSING",
          "PRODUCTION_DB_OBSERVABILITY_MISSING",
          "PRODUCTION_DB_RUNBOOK_MISSING",
          "PRODUCTION_DB_LIVE_ENABLEMENT_MISSING",
        ]),
        liveConnectionAttempted: false,
        liveMigrationExecutionEnabled: false,
        liveProductionMutationEnabled: false,
        liveProviderCallsEnabled: false,
        liveQueryExecutionEnabled: false,
        liveTransactionExecutionEnabled: false,
        packageName: "pg",
        packageRef: "npm:pg",
        productionReady: false,
        requiredConfigKeys: expect.arrayContaining([
          "CAMPAIGN_OS_DATABASE_PACKAGE",
          "CAMPAIGN_OS_DATABASE_PACKAGE_BINDING",
          "CAMPAIGN_OS_DATABASE_PROVIDER",
          "CAMPAIGN_OS_DATABASE_URL",
          "CAMPAIGN_OS_DATABASE_SECRET_REF",
          "CAMPAIGN_OS_DATABASE_POOL_POLICY",
          "CAMPAIGN_OS_DATABASE_MIGRATION_APPROVAL",
          "CAMPAIGN_OS_DATABASE_ROLLBACK_BACKUP_PLAN",
          "CAMPAIGN_OS_DATABASE_OBSERVABILITY_REF",
          "CAMPAIGN_OS_DATABASE_RUNBOOK_URL",
          "CAMPAIGN_OS_DATABASE_LIVE_ENABLEMENT",
        ]),
        status: "blocked",
        valid: false,
      }),
      profileId: "production-required",
      providerId: "campaign-os-provider-deferred",
      queryAdapter: expect.objectContaining({
        driverId: "campaign-os-production-driver-deferred",
        liveQueryExecutionEnabled: false,
      }),
      status: "blocked",
      transaction: expect.objectContaining({
        liveCommitEnabled: false,
        mode: "deferred_live",
        supported: true,
      }),
      valid: false,
    });
    expect(report.persistenceRuntime).toMatchObject({
      activeDriverId: "campaign-os-production-db-adapter",
      adapterKind: "production_deferred",
      connection: expect.objectContaining({
        safeLabel: "[redacted]",
        state: "configured_redacted",
      }),
      diagnostics: expect.arrayContaining([
        expect.objectContaining({
          code: "PRODUCTION_PERSISTENCE_SECRET_REDACTED",
          field: "CAMPAIGN_OS_DATABASE_URL",
          severity: "info",
        }),
        expect.objectContaining({
          code: "PRODUCTION_PERSISTENCE_LIVE_CONNECTION_DEFERRED",
          field: "activeDriverId",
          severity: "warning",
        }),
      ]),
      liveConnectionAttempted: false,
      migrationGate: expect.objectContaining({
        diagnostics: expect.arrayContaining([
          expect.objectContaining({
            code: "MIGRATION_EXECUTION_APPROVAL_MISSING",
            field: "approval",
            severity: "error",
          }),
          expect.objectContaining({
            code: "MIGRATION_EXECUTION_DRIVER_DEFERRED",
            field: "driver-package",
            severity: "warning",
          }),
        ]),
        liveExecutionCount: 0,
        liveExecutionEnabled: false,
        mode: "live_blocked",
        status: "blocked",
      }),
      profileId: "production-required",
      status: "boundary_ready",
      stores: expect.arrayContaining([
        expect.objectContaining({
          id: "points-ledger",
          required: true,
          runtimeState: "covered",
        }),
      ]),
    });
    expect(report.persistenceFoundation).toMatchObject({
      blockerCount: 11,
      diagnosticCodes: expect.arrayContaining([
        "PRODUCTION_PERSISTENCE_SECRET_REDACTED",
        "PRODUCTION_PERSISTENCE_LIVE_CONNECTION_DEFERRED",
        "DATABASE_DRIVER_PRODUCTION_DEFERRED",
        "DATABASE_ADAPTER_SECRET_REDACTED",
        "MIGRATION_EXECUTION_APPROVAL_MISSING",
      ]),
      liveConnectionAttempted: false,
      liveMigrationExecutionEnabled: false,
      liveQueryExecutionEnabled: false,
      migrationDryRun: {
        liveMigrationExecutionEnabled: false,
        migrationGateStatus: "blocked",
        noLiveMigrationCommand: true,
        runnerStatus: "deferred",
        status: "blocked",
      },
      productionReady: false,
      requiredStoreCount: 6,
      status: "blocked",
      storeCoverage: {
        coverageComplete: true,
        coveredStoreCount: 6,
        requiredStoreCount: 6,
      },
      storeCoverageCount: 6,
      valid: false,
    });
    expect(report.campaignDbVerticalSlice).toMatchObject({
      adapter: {
        deterministic: false,
        id: "campaign-os-production-driver-deferred",
        productionReady: false,
        status: "blocked",
      },
      capabilities: {
        deterministicLifecycle: true,
        recordDraft: false,
        readDraft: false,
        writeDraft: false,
      },
      campaignStore: {
        durable: false,
        fallbackUsed: false,
        mode: "production_required",
        participantRecordCount: 0,
        referralBindingRecordCount: 0,
        recordCount: 0,
        status: "blocked",
        storeId: "campaign-db",
      },
      diagnosticCodes: expect.arrayContaining([
        "CAMPAIGN_DB_DURABLE_STORE_BLOCKED",
        "CAMPAIGN_DB_LIVE_DRIVER_MISSING",
        "CAMPAIGN_DB_MIGRATION_STATE_BLOCKED",
        "CAMPAIGN_DB_MIGRATION_EXECUTOR_UNAPPROVED",
        "CAMPAIGN_DB_SECRET_MANAGER_MISSING",
        "CAMPAIGN_DB_PRODUCTION_WRITE_DISABLED",
        "CAMPAIGN_DB_DETERMINISTIC_ADAPTER_NOT_PRODUCTION_READY",
      ]),
      lifecycle: {
        readinessDoesNotMutateRecords: true,
        repositoryContractStatus: "blocked",
        repositoryMode: "production_deferred",
      },
      migrationState: {
        appliedMigrationIds: [],
        blockedMigrationIds: ["001-campaign-db-v0-2-0"],
        diagnosticCodes: ["CAMPAIGN_MIGRATION_BLOCKED"],
        liveExecutionEnabled: false,
        pendingMigrationIds: [],
        requiredMigrationIds: ["001-campaign-db-v0-2-0"],
        schemaVersion: "v0.2.0",
        status: "blocked",
        storeId: "campaign-db",
      },
      noLive: {
        connectionAttempted: false,
        migrationExecutionEnabled: false,
        queryExecutionEnabled: false,
        writeExecutionEnabled: false,
      },
      productionActivationBlockers: expect.arrayContaining([
        "Production-required Campaign DB needs an approved live driver before activation.",
        "Production-required Campaign DB needs an approved migration executor before activation.",
        "Production-required Campaign DB needs secret manager and connection pool integration.",
        "Production Campaign DB writes remain disabled until live write activation is explicitly approved.",
        "Deterministic/local Campaign DB adapter is not production-ready.",
      ]),
      participantReadModel: {
        contractTransactionsEnabled: false,
        durableTestMode: false,
        liveWalletVerificationEnabled: false,
        localDeterministicMode: false,
        participantRecordCount: 0,
        productionDbMigrationReady: false,
        recordName: "campaign_participants",
        rewardDistributionEnabled: false,
        status: "blocked",
        storeId: "campaign-db",
      },
      referralBindingReadModel: {
        contractTransactionsEnabled: false,
        durableTestMode: false,
        liveProviderRiskSignalsEnabled: false,
        liveWalletVerificationEnabled: false,
        localDeterministicMode: false,
        productionDbMigrationReady: false,
        providerCallsEnabled: false,
        recordName: "campaign_referral_bindings",
        referralBindingRecordCount: 0,
        rewardDistributionEnabled: false,
        status: "blocked",
        storeId: "campaign-db",
      },
      status: "blocked",
      storeId: "campaign-db",
      validation: {
        valid: false,
      },
    });
    expect(report.campaignDbVerticalSlice.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "CAMPAIGN_DB_LIVE_DRIVER_MISSING",
          field: "databaseAdapterRuntime.driverId",
          severity: "error",
        }),
        expect.objectContaining({
          code: "CAMPAIGN_DB_DURABLE_STORE_BLOCKED",
          field: "campaignStore.status",
          severity: "error",
        }),
        expect.objectContaining({
          code: "CAMPAIGN_DB_MIGRATION_STATE_BLOCKED",
          field: "migrationState.status",
          severity: "error",
        }),
        expect.objectContaining({
          code: "CAMPAIGN_DB_MIGRATION_EXECUTOR_UNAPPROVED",
          field: "migration.executionGate.approval",
          severity: "error",
        }),
        expect.objectContaining({
          code: "CAMPAIGN_DB_SECRET_MANAGER_MISSING",
          field: "persistenceRuntime.connection",
          severity: "error",
        }),
        expect.objectContaining({
          code: "CAMPAIGN_DB_PRODUCTION_WRITE_DISABLED",
          field: "databaseAdapterRuntime.transaction.liveCommitEnabled",
          severity: "error",
        }),
        expect.objectContaining({
          code: "CAMPAIGN_DB_DETERMINISTIC_ADAPTER_NOT_PRODUCTION_READY",
          field: "databaseAdapterRuntime.adapter",
          severity: "error",
        }),
      ]),
    );
    expect(report.authSession).toMatchObject({
      profileId: "production-required",
      status: "blocked",
      proofBoundary: expect.objectContaining({
        status: "blocked",
        verificationMode: "production_required",
      }),
      validation: expect.objectContaining({
        valid: false,
      }),
    });
    expect(report.authEnforcement).toMatchObject({
      agentCredentialSubstitutionDisabled: true,
      campaignMutationRouteCount: 1,
      localEnforcedRouteCount: 10,
      locallyEnforcedRouteIds: [
        "campaigns.create",
        "campaigns.owner.list",
        "campaigns.owner.detail",
        "campaigns.tasks.add",
        "campaigns.tasks.generate",
        "campaigns.participant.list",
        "campaigns.participant.journey",
        "campaigns.eligibility",
        "campaigns.points.ranking.ledger.runtime",
        "tasks.verify",
      ],
      mode: "blocked",
      productionProofVerifierReady: false,
      productionProjectOwnershipSourceReady: false,
      productionSessionIssuerReady: false,
      remainingDeferredProductionDependencyIds: expect.arrayContaining([
        "live_wallet_proof_verifier",
        "jwt_or_session_cookie",
        "project_ownership_source",
      ]),
    });
    expect(report.authSessionFoundation).toMatchObject({
      blockedDependencyIds: [
        "wallet_live_verifier",
        "nonce_store",
        "session_signing_key",
        "secret_manager",
        "production_session_store",
        "project_membership_source",
        "project_ownership_source",
        "rbac_enforcement_policy",
      ],
      blockerCount: 8,
      diagnosticCodes: expect.arrayContaining([
        "AUTH_PROOF_VERIFIER_MISSING",
        "AUTH_NONCE_STORE_MISSING",
        "AUTH_SESSION_ISSUER_MISSING",
        "AUTH_SECRET_MANAGER_MISSING",
        "AUTH_SESSION_STORE_MISSING",
        "AUTH_SESSION_CONFIG_MISSING",
        "AUTH_OWNERSHIP_SOURCE_MISSING",
        "AUTH_POLICY_MISSING",
        "AUTH_AGENT_CREDENTIAL_SEPARATE",
      ]),
      liveSideEffectsEnabled: false,
      liveSigningExecuted: false,
      liveVerificationExecuted: false,
      ownership: {
        blockedDependencyIds: ["project_membership_source", "project_ownership_source"],
        membershipSourceReady: false,
        ownerMutationBlocked: true,
        ownershipSourceReady: false,
      },
      productionReady: false,
      profileId: "production-required",
      rbac: {
        agentCredentialSubstitutionDisabled: true,
        roleCount: 5,
      },
      sessionIssuer: {
        cookieIssued: false,
        issuerMode: "production_blocked",
        jwtIssued: false,
        liveSigningExecuted: false,
        productionSessionStoreReady: false,
        secretManagerReady: false,
        signingKeyReady: false,
      },
      status: "blocked",
      valid: false,
      walletProof: {
        liveVerificationExecuted: false,
        liveVerifierReady: false,
        nonceStoreReady: false,
        status: "blocked",
      },
    });
    expect(report.providerIndexerFoundation).toMatchObject({
      blockerCount: 2,
      diagnosticCodes: [
        "INDEXER_ENDPOINT_MISSING",
        "PROVIDER_CREDENTIALS_MISSING",
      ],
      noLiveFlags: {
        liveProviderCallsEnabled: false,
        liveIndexerCallsEnabled: false,
        liveSocialCallsEnabled: false,
        liveAiCallsEnabled: false,
        liveAnalyticsIngestionEnabled: false,
        liveObjectStorageEnabled: false,
        liveContractCallsEnabled: false,
        workerExecutionEnabled: false,
      },
      productionReady: false,
      profileId: "production-required",
      providerGroupCount: 10,
      status: "blocked",
      valid: false,
      verificationSourceCoverage: {
        summaryCount: 5,
      },
      verificationSourceHandoff: {
        liveExecutionEnabled: false,
        supportedVerificationTypes: ["WALLET", "ON_CHAIN", "DAPP_API", "SOCIAL", "MANUAL"],
        valid: true,
      },
    });
    expect(report.providerClientReadiness).toMatchObject({
      activationInventory: {
        activationStatus: "activation_required",
        blockedConfigKeys: expect.arrayContaining([
          "CAMPAIGN_OS_PROVIDER_CLIENT_ENABLEMENT",
          "CAMPAIGN_OS_PROVIDER_ENDPOINT_REF",
          "CAMPAIGN_OS_PROVIDER_CREDENTIAL_REF",
          "CAMPAIGN_OS_PROVIDER_CLIENT_SEAM",
          "CAMPAIGN_OS_PROVIDER_TIMEOUT_POLICY",
          "CAMPAIGN_OS_PROVIDER_RETRY_POLICY",
          "CAMPAIGN_OS_PROVIDER_CIRCUIT_BREAKER_POLICY",
          "CAMPAIGN_OS_PROVIDER_DEGRADATION_POLICY",
          "CAMPAIGN_OS_PROVIDER_WORKER_QUEUE_HANDOFF",
          "CAMPAIGN_OS_PROVIDER_CONSUME_READINESS_HANDOFF",
          "CAMPAIGN_OS_PROVIDER_RUNBOOK_URL",
          "CAMPAIGN_OS_PROVIDER_REDACTION_POLICY",
        ]),
        blockerIds: expect.arrayContaining([
          "provider-client-activation",
          "provider-client-endpoint-reference",
          "provider-client-credential-reference",
          "provider-client-seam",
          "provider-client-timeout-policy",
          "provider-client-retry-policy",
          "provider-client-circuit-breaker-policy",
          "provider-client-degradation-policy",
          "provider-client-worker-queue-handoff",
          "provider-client-consume-readiness-handoff",
          "provider-client-runbook",
          "provider-client-redaction-policy",
        ]),
        redacted: true,
        requiredConfigKeys: expect.arrayContaining(providerClientRequiredConfigKeys),
      },
      activationStatus: "activation_required",
      blockerCount: 12,
      diagnosticCodes: expect.arrayContaining([
        "PROVIDER_CLIENT_ACTIVATION_MISSING",
        "PROVIDER_CLIENT_ENDPOINT_REFERENCE_MISSING",
        "PROVIDER_CLIENT_CREDENTIAL_REFERENCE_MISSING",
        "PROVIDER_CLIENT_SEAM_MISSING",
        "PROVIDER_CLIENT_TIMEOUT_POLICY_MISSING",
        "PROVIDER_CLIENT_RETRY_POLICY_MISSING",
        "PROVIDER_CLIENT_CIRCUIT_BREAKER_POLICY_MISSING",
        "PROVIDER_CLIENT_DEGRADATION_POLICY_MISSING",
        "PROVIDER_CLIENT_WORKER_QUEUE_HANDOFF_MISSING",
        "PROVIDER_CLIENT_CONSUME_READINESS_HANDOFF_MISSING",
        "PROVIDER_CLIENT_RUNBOOK_MISSING",
        "PROVIDER_CLIENT_REDACTION_POLICY_MISSING",
      ]),
      liveProviderCallsAttempted: false,
      productionReady: false,
      providerClientsEnabled: false,
      providerClientsProvided: false,
      queueHandoff: {
        consumeReadinessStatus: "disabled",
        queueId: "verification-jobs",
        workerJobId: "task-verification-worker",
      },
      registry: {
        clients: [],
      },
      status: "blocked",
      valid: false,
    });
    expect(report.workerSchedulerFoundation).toMatchObject({
      blockerCount: 0,
      diagnosticCodes: [],
      noLiveFlags: {
        liveCronExecutionEnabled: false,
        liveQueuePublishingEnabled: false,
        liveSchedulerExecutionEnabled: false,
        liveWorkerExecutionEnabled: false,
      },
      productionReady: false,
      profileId: "production-required",
      status: "local_ready",
      valid: true,
    });
    expect(report.queueRuntimeFoundation).toMatchObject({
      blockerCount: 0,
      diagnosticCodes: [],
      dryRunEnqueue: {
        enabled: true,
        livePublishAttempted: false,
        liveQueuePublishingEnabled: false,
      },
      id: "campaign-os-queue-runtime-foundation",
      noLiveFlags: {
        liveQueuePublishingEnabled: false,
        liveSchedulerExecutionEnabled: false,
        liveWorkerExecutionEnabled: false,
      },
      productionReady: false,
      profileId: "production-required",
      consumingReadiness: {
        activationStatus: "activation_required",
        consumeAttemptPolicy: "blocked_until_ready",
        liveQueueConsumptionEnabled: false,
        productionReady: false,
        status: "blocked",
      },
      publishingReadiness: {
        activationStatus: "activation_required",
        blockerCount: expect.any(Number),
        diagnosticCodes: expect.arrayContaining([
          "LIVE_QUEUE_PUBLISHING_ACTIVATION_MISSING",
          "LIVE_QUEUE_PUBLISHER_MISSING",
          "LIVE_QUEUE_PAYLOAD_POLICY_MISSING",
          "LIVE_QUEUE_REDACTION_POLICY_MISSING",
        ]),
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
        publishAttemptPolicy: "blocked_until_ready",
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
        status: "blocked",
      },
      providerAdapter: {
        adapterId: "metadata-only-queue-provider-adapter",
        blockerCount: 16,
        diagnosticCodes: expect.arrayContaining([
          "QUEUE_PROVIDER_SDK_PACKAGE_MISSING",
          "QUEUE_PROVIDER_SDK_BINDING_MISSING",
          "QUEUE_PROVIDER_PACKAGE_MISSING",
          "QUEUE_PROVIDER_PACKAGE_BINDING_MISSING",
          "QUEUE_PROVIDER_PACKAGE_PROVIDER_KIND_MISSING",
          "QUEUE_PROVIDER_PACKAGE_REDIS_ENDPOINT_MISSING",
          "QUEUE_PROVIDER_PACKAGE_WORKER_QUEUE_MISSING",
          "QUEUE_PROVIDER_PACKAGE_DEAD_LETTER_QUEUE_MISSING",
          "REDIS_BROKER_CREDENTIALS_REFERENCE_MISSING",
          "REDIS_BROKER_TLS_POLICY_MISSING",
          "REDIS_BROKER_DATABASE_SELECTION_MISSING",
          "REDIS_BROKER_TIMEOUT_POLICY_MISSING",
          "REDIS_BROKER_RETRY_BACKOFF_POLICY_MISSING",
          "REDIS_BROKER_CIRCUIT_BREAKER_POLICY_MISSING",
          "REDIS_BROKER_HEALTH_CHECK_ENABLEMENT_MISSING",
        ]),
        disabledLiveOperationCount: 8,
        liveQueuePublishingEnabled: false,
        liveWorkerExecutionEnabled: false,
        mode: "production_required",
        operationCount: 8,
        productionReady: false,
        providerId: "metadata-only",
        requiredConfigKeys: expect.arrayContaining([
          "CAMPAIGN_OS_QUEUE_PROVIDER",
          "CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT",
          "CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS",
          "CAMPAIGN_OS_WORKER_QUEUE_URL",
          "CAMPAIGN_OS_DEAD_LETTER_QUEUE",
          "CAMPAIGN_OS_WORKER_RETRY_POLICY",
          "CAMPAIGN_OS_DEGRADATION_POLICY",
          "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL",
          "CAMPAIGN_OS_WORKER_LEASE_STORE_URL",
          "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
          "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE",
          "CAMPAIGN_OS_QUEUE_PROVIDER_BINDING",
          "CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT",
          "CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE",
          "CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING",
          "CAMPAIGN_OS_REDIS_URL",
        ]),
        driverSdkBindingBlockerCount: 16,
        driverSdkBindingDiagnosticCodes: expect.arrayContaining([
          "QUEUE_PROVIDER_SDK_PACKAGE_MISSING",
          "QUEUE_PROVIDER_SDK_BINDING_MISSING",
          "QUEUE_PROVIDER_PACKAGE_MISSING",
          "QUEUE_PROVIDER_PACKAGE_BINDING_MISSING",
          "QUEUE_PROVIDER_PACKAGE_PROVIDER_KIND_MISSING",
          "QUEUE_PROVIDER_PACKAGE_REDIS_ENDPOINT_MISSING",
          "QUEUE_PROVIDER_PACKAGE_WORKER_QUEUE_MISSING",
          "QUEUE_PROVIDER_PACKAGE_DEAD_LETTER_QUEUE_MISSING",
          "REDIS_BROKER_CREDENTIALS_REFERENCE_MISSING",
          "REDIS_BROKER_TLS_POLICY_MISSING",
          "REDIS_BROKER_DATABASE_SELECTION_MISSING",
          "REDIS_BROKER_TIMEOUT_POLICY_MISSING",
          "REDIS_BROKER_RETRY_BACKOFF_POLICY_MISSING",
          "REDIS_BROKER_CIRCUIT_BREAKER_POLICY_MISSING",
          "REDIS_BROKER_HEALTH_CHECK_ENABLEMENT_MISSING",
        ]),
        driverSdkBindingDisabledLiveOperationCount: 8,
        driverSdkBindingId: "production-provider-sdk-binding",
        driverSdkBindingLiveProviderCallAttempted: false,
        driverSdkBindingLiveQueuePublishingEnabled: false,
        driverSdkBindingLiveWorkerExecutionEnabled: false,
        driverSdkBindingMode: "production_required",
        driverSdkBindingOperationCount: 8,
        driverSdkBindingProductionReady: false,
        driverSdkBindingProviderKind: "sqs-compatible",
        driverSdkBindingRequiredConfigKeys: expect.arrayContaining([
          "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE",
          "CAMPAIGN_OS_QUEUE_PROVIDER_BINDING",
          "CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT",
          "CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE",
          "CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING",
          "CAMPAIGN_OS_REDIS_URL",
        ]),
        driverSdkBindingPackageBindingBlockerCount: 14,
        driverSdkBindingPackageBindingBrokerConnectionBlockerCount: 8,
        driverSdkBindingPackageBindingBrokerConnectionDiagnosticCodes: expect.arrayContaining([
          "REDIS_BROKER_CREDENTIALS_REFERENCE_MISSING",
          "REDIS_BROKER_TLS_POLICY_MISSING",
          "REDIS_BROKER_DATABASE_SELECTION_MISSING",
          "REDIS_BROKER_TIMEOUT_POLICY_MISSING",
          "REDIS_BROKER_RETRY_BACKOFF_POLICY_MISSING",
          "REDIS_BROKER_CIRCUIT_BREAKER_POLICY_MISSING",
          "REDIS_BROKER_HEALTH_CHECK_ENABLEMENT_MISSING",
        ]),
        driverSdkBindingPackageBindingBrokerConnectionHealthCheckMode: "activation_required",
        driverSdkBindingPackageBindingBrokerConnectionStatus: "blocked",
        driverSdkBindingPackageBindingBrowserBundleAllowed: false,
        driverSdkBindingPackageBindingDiagnosticCodes: expect.arrayContaining([
          "QUEUE_PROVIDER_PACKAGE_MISSING",
          "QUEUE_PROVIDER_PACKAGE_BINDING_MISSING",
          "QUEUE_PROVIDER_PACKAGE_PROVIDER_KIND_MISSING",
          "QUEUE_PROVIDER_PACKAGE_REDIS_ENDPOINT_MISSING",
          "QUEUE_PROVIDER_PACKAGE_WORKER_QUEUE_MISSING",
          "QUEUE_PROVIDER_PACKAGE_DEAD_LETTER_QUEUE_MISSING",
        ]),
        driverSdkBindingPackageBindingFamily: "bullmq-redis-compatible",
        driverSdkBindingPackageBindingLiveBrokerConnectionAttempted: false,
        driverSdkBindingPackageBindingLiveBrokerHealthCheckAttempted: false,
        driverSdkBindingPackageBindingLiveQueuePublishingEnabled: false,
        driverSdkBindingPackageBindingLiveWorkerExecutionEnabled: false,
        driverSdkBindingPackageBindingPackageName: "bullmq",
        driverSdkBindingPackageBindingPackageRef: "npm:bullmq",
        driverSdkBindingPackageBindingQueueClientConstructed: false,
        driverSdkBindingPackageBindingQueueEventsConstructed: false,
        driverSdkBindingPackageBindingSdkClientConstructed: false,
        driverSdkBindingPackageBindingStatus: "blocked",
        driverSdkBindingPackageBindingWorkerConstructed: false,
        driverSdkBindingSdkClientConstructed: false,
        driverSdkBindingSdkPackageRef: "package-ref:@provider/queue-sdk",
        driverSdkBindingStatus: "blocked",
        driverSdkBindingValid: false,
        status: "blocked",
        valid: false,
      },
      queuePlanCoverage: {
        queuePlanCount: 9,
      },
      status: "scaffolded",
      valid: true,
    });
    expect(report.workerLeaseStoreFoundation).toMatchObject({
      adapterId: "production-lease-store-worker-lease-store-adapter",
      blockerCount: 0,
      diagnosticCodes: [],
      heartbeatIntervalSeconds: 45,
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      mode: "production_required",
      productionReady: false,
      profileId: "production-required",
      requiredConfigKeys: expect.arrayContaining(workerLeaseRequiredConfigKeys),
      status: "scaffolded",
      storeId: "production-lease-store",
      ttlSeconds: 180,
      valid: true,
    });
    expect(report.schedulerRuntimeFoundation).toMatchObject({
      blockerCount: 0,
      diagnosticCodes: [],
      dryRunTrigger: {
        enabled: true,
        liveCronExecutionEnabled: false,
        liveQueuePublishingEnabled: false,
        liveSchedulerExecutionEnabled: false,
      },
      id: "campaign-os-scheduler-runtime-foundation",
      productionReady: false,
      profileId: "production-required",
      registrationCoverage: {
        registrationCount: 9,
      },
      status: "local_ready",
      valid: true,
    });
    expect(report.authSession.validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "AUTH_PROOF_VERIFIER_MISSING",
          field: "authSession.proofVerifier",
        }),
        expect.objectContaining({
          code: "AUTH_POLICY_MISSING",
          field: "authSession.rolePolicy",
        }),
        expect.objectContaining({
          code: "AUTH_OWNERSHIP_SOURCE_MISSING",
          field: "authSession.ownership",
        }),
      ]),
    );
    expect(report.validation).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          code: "AUTH_SESSION_READINESS_BLOCKED",
          field: "authSession",
        }),
        expect.objectContaining({
          code: "DATABASE_READINESS_BLOCKED",
          field: "databaseReadiness",
        }),
        expect.objectContaining({
          code: "CAMPAIGN_DB_VERTICAL_SLICE_BLOCKED",
          field: "campaignDbVerticalSlice",
        }),
        expect.objectContaining({
          code: "DATABASE_READINESS_BLOCKED",
          field: "databaseAdapterRuntime",
        }),
        expect.objectContaining({
          code: "PERSISTENCE_ADAPTER_INVALID",
          field: "persistenceRuntime",
        }),
        expect.objectContaining({
          code: "MIGRATION_MANIFEST_INVALID",
          field: "migration",
        }),
        expect.objectContaining({
          code: "PROVIDER_CLIENT_READINESS_BLOCKED",
          field: "providerClientReadiness",
        }),
        expect.objectContaining({
          code: "PROVIDER_HTTP_RUNTIME_READINESS_BLOCKED",
          field: "providerClientReadiness.providerHttpRuntime",
        }),
      ]),
    });
    expect(report.validation.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "workerSchedulerFoundation" }),
        expect.objectContaining({ field: "queueRuntimeFoundation" }),
        expect.objectContaining({ field: "schedulerRuntimeFoundation" }),
        expect.objectContaining({ field: "workerLeaseStoreFoundation" }),
      ]),
    );
    expect(report.backendRuntimeBootstrap).toMatchObject({
      diagnosticCodes: expect.arrayContaining([
        "BACKEND_RUNTIME_BOOTSTRAP_PRODUCTION_BLOCKED",
        "BACKEND_RUNTIME_BOOTSTRAP_SERVER_RUNTIME_INVALID",
        "BACKEND_RUNTIME_BOOTSTRAP_BACKEND_READINESS_INVALID",
      ]),
      profileId: "production-required",
      readiness: {
        databaseAdapterRuntime: {
          liveConnectionAttempted: false,
          liveQueryExecutionEnabled: false,
          status: "blocked",
          valid: false,
        },
        persistenceRuntime: {
          liveConnectionAttempted: false,
          liveExecutionEnabled: false,
        },
        providerClientReadiness: {
          activationStatus: "activation_required",
          blockerCount: 12,
          liveProviderCallsAttempted: false,
          productionReady: false,
          providerHttpRuntime: {
            activationStatus: "activation_required",
            liveHttpCallsAttempted: false,
            productionReady: false,
            status: "blocked",
            transportProvided: false,
            valid: false,
          },
          providerClientsEnabled: false,
          providerClientsProvided: false,
          status: "blocked",
          valid: false,
        },
      },
      status: "blocked",
      valid: false,
    });
    expect(report.apiService).toMatchObject({
      diagnosticCodes: expect.arrayContaining([
        "API_SERVICE_PRODUCTION_BLOCKED",
        "BACKEND_RUNTIME_BOOTSTRAP_PRODUCTION_BLOCKED",
      ]),
      deployableBoundaryReady: false,
      liveConnectionAttempted: false,
      liveSideEffectsEnabled: false,
      productionReady: false,
      profileId: "production-required",
      status: "blocked",
      workerExecutionEnabled: false,
    });
    expect(JSON.stringify(report)).not.toContain("auth-secret");
    expect(JSON.stringify(report)).not.toContain("postgres://db.invalid/campaign-os");
    expectNoQueueSecretLeak(report);
  });

  it("does not serialize queue runtime credentials or raw job payload samples", () => {
    const report = createBackendServiceReadinessReport({
      configOptions: {
        env: {
          CAMPAIGN_OS_AUTH_SECRET: "auth-secret",
          CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
          CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT: "https://writer.invalid/hook-secret-sample",
          CAMPAIGN_OS_DATABASE_URL: "postgres://db.invalid/campaign-os",
          CAMPAIGN_OS_DEAD_LETTER_QUEUE: "https://queue.invalid/dead-letter?token=queue-secret",
          CAMPAIGN_OS_DEGRADATION_POLICY: "fail-closed",
          CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "https://idempotency.invalid/tenant/raw/export.csv",
          CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "https://observability.invalid/hook?token=hook-secret-sample",
          CAMPAIGN_OS_PROVIDER_REGISTRY_URL: "https://providers.invalid/registry",
          CAMPAIGN_OS_QUEUE_BEARER_TOKEN: "Bearer worker-token-sample",
          CAMPAIGN_OS_QUEUE_PROVIDER: "metadata-only",
          CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS: "queue-provider-credential-secret",
          CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER: "metadata-only-queue-provider-driver",
          CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT: "https://queue-provider.invalid/hook?token=provider-secret",
          CAMPAIGN_OS_OPERATOR_RUNBOOK_URL: "https://runbooks.invalid/queue-provider-driver?token=provider-secret",
          CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT: "explicitly-enabled",
          CAMPAIGN_OS_SIGNED_URL_SAMPLE: "https://storage.invalid/export.csv?X-Amz-Signature=signed-url-sample",
          CAMPAIGN_OS_WORKER_LEASE_STORE_URL: "https://lease.invalid/store?token=lease-token-sample",
          CAMPAIGN_OS_WORKER_QUEUE_URL: "https://queue-user:queue-pass@queue.invalid/jobs?token=queue-secret",
          CAMPAIGN_OS_WORKER_RETRY_POLICY: "deterministic-backoff",
          CAMPAIGN_OS_RAW_JOB_PAYLOAD_SAMPLE: "{\"walletAddress\":\"ELF_raw_wallet\",\"taskId\":\"task_raw\"}",
        },
        profileId: "production-required",
      },
    });

    expect(report.queueRuntimeFoundation).toMatchObject({
      diagnosticCodes: [],
      dryRunEnqueue: {
        enabled: true,
        liveQueuePublishingEnabled: false,
      },
      profileId: "production-required",
      providerAdapter: {
        adapterId: "metadata-only-queue-provider-adapter",
        blockerCount: 24,
        diagnosticCodes: expect.arrayContaining([
          "QUEUE_PROVIDER_SDK_PACKAGE_MISSING",
          "QUEUE_PROVIDER_SDK_BINDING_MISSING",
          "QUEUE_PROVIDER_PACKAGE_MISSING",
          "QUEUE_PROVIDER_PACKAGE_BINDING_MISSING",
          "QUEUE_PROVIDER_PACKAGE_PROVIDER_KIND_MISSING",
          "QUEUE_PROVIDER_PACKAGE_REDIS_ENDPOINT_MISSING",
          "QUEUE_PROVIDER_PACKAGE_CREDENTIALS_MISSING",
          "QUEUE_PROVIDER_PACKAGE_WORKER_QUEUE_MISSING",
          "QUEUE_PROVIDER_PACKAGE_DEAD_LETTER_QUEUE_MISSING",
          "QUEUE_PROVIDER_PACKAGE_WORKER_LEASE_MISSING",
          "QUEUE_PROVIDER_PACKAGE_OBSERVABILITY_MISSING",
          "QUEUE_PROVIDER_PACKAGE_RUNBOOK_MISSING",
          "REDIS_BROKER_CREDENTIALS_REFERENCE_MISSING",
          "REDIS_BROKER_TLS_POLICY_MISSING",
          "REDIS_BROKER_DATABASE_SELECTION_MISSING",
          "REDIS_BROKER_TIMEOUT_POLICY_MISSING",
          "REDIS_BROKER_RETRY_BACKOFF_POLICY_MISSING",
          "REDIS_BROKER_CIRCUIT_BREAKER_POLICY_MISSING",
          "REDIS_BROKER_HEALTH_CHECK_ENABLEMENT_MISSING",
        ]),
        liveQueuePublishingEnabled: false,
        liveWorkerExecutionEnabled: false,
        driverActivationGateSatisfied: true,
        driverBlockerCount: 24,
        driverDiagnosticCodes: expect.arrayContaining([
          "QUEUE_PROVIDER_SDK_PACKAGE_MISSING",
          "QUEUE_PROVIDER_SDK_BINDING_MISSING",
          "QUEUE_PROVIDER_PACKAGE_MISSING",
          "QUEUE_PROVIDER_PACKAGE_BINDING_MISSING",
          "QUEUE_PROVIDER_PACKAGE_PROVIDER_KIND_MISSING",
          "QUEUE_PROVIDER_PACKAGE_REDIS_ENDPOINT_MISSING",
          "QUEUE_PROVIDER_PACKAGE_CREDENTIALS_MISSING",
          "QUEUE_PROVIDER_PACKAGE_WORKER_QUEUE_MISSING",
          "QUEUE_PROVIDER_PACKAGE_DEAD_LETTER_QUEUE_MISSING",
          "QUEUE_PROVIDER_PACKAGE_WORKER_LEASE_MISSING",
          "QUEUE_PROVIDER_PACKAGE_OBSERVABILITY_MISSING",
          "QUEUE_PROVIDER_PACKAGE_RUNBOOK_MISSING",
          "REDIS_BROKER_CREDENTIALS_REFERENCE_MISSING",
          "REDIS_BROKER_TLS_POLICY_MISSING",
          "REDIS_BROKER_DATABASE_SELECTION_MISSING",
          "REDIS_BROKER_TIMEOUT_POLICY_MISSING",
          "REDIS_BROKER_RETRY_BACKOFF_POLICY_MISSING",
          "REDIS_BROKER_CIRCUIT_BREAKER_POLICY_MISSING",
          "REDIS_BROKER_HEALTH_CHECK_ENABLEMENT_MISSING",
        ]),
        driverDisabledLiveOperationCount: 8,
        driverId: "metadata-only-queue-provider-driver",
        driverLiveQueuePublishingEnabled: false,
        driverLiveWorkerExecutionEnabled: false,
        driverMode: "production_required",
        driverOperationCount: 8,
        driverProductionReady: false,
        driverProviderId: "metadata-only",
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
          "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE",
          "CAMPAIGN_OS_QUEUE_PROVIDER_BINDING",
          "CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE",
          "CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING",
          "CAMPAIGN_OS_REDIS_URL",
        ]),
        driverSdkBindingBlockerCount: 24,
        driverSdkBindingDiagnosticCodes: expect.arrayContaining([
          "QUEUE_PROVIDER_SDK_PACKAGE_MISSING",
          "QUEUE_PROVIDER_SDK_BINDING_MISSING",
          "QUEUE_PROVIDER_PACKAGE_MISSING",
          "QUEUE_PROVIDER_PACKAGE_BINDING_MISSING",
          "QUEUE_PROVIDER_PACKAGE_PROVIDER_KIND_MISSING",
          "QUEUE_PROVIDER_PACKAGE_REDIS_ENDPOINT_MISSING",
          "QUEUE_PROVIDER_PACKAGE_CREDENTIALS_MISSING",
          "QUEUE_PROVIDER_PACKAGE_WORKER_QUEUE_MISSING",
          "QUEUE_PROVIDER_PACKAGE_DEAD_LETTER_QUEUE_MISSING",
          "QUEUE_PROVIDER_PACKAGE_WORKER_LEASE_MISSING",
          "QUEUE_PROVIDER_PACKAGE_OBSERVABILITY_MISSING",
          "QUEUE_PROVIDER_PACKAGE_RUNBOOK_MISSING",
          "REDIS_BROKER_CREDENTIALS_REFERENCE_MISSING",
          "REDIS_BROKER_TLS_POLICY_MISSING",
          "REDIS_BROKER_DATABASE_SELECTION_MISSING",
          "REDIS_BROKER_TIMEOUT_POLICY_MISSING",
          "REDIS_BROKER_RETRY_BACKOFF_POLICY_MISSING",
          "REDIS_BROKER_CIRCUIT_BREAKER_POLICY_MISSING",
          "REDIS_BROKER_HEALTH_CHECK_ENABLEMENT_MISSING",
        ]),
        driverSdkBindingDisabledLiveOperationCount: 8,
        driverSdkBindingId: "production-provider-sdk-binding",
        driverSdkBindingLiveProviderCallAttempted: false,
        driverSdkBindingLiveQueuePublishingEnabled: false,
        driverSdkBindingLiveWorkerExecutionEnabled: false,
        driverSdkBindingMode: "production_required",
        driverSdkBindingOperationCount: 8,
        driverSdkBindingProductionReady: false,
        driverSdkBindingProviderKind: "sqs-compatible",
        driverSdkBindingRequiredConfigKeys: expect.arrayContaining([
          "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE",
          "CAMPAIGN_OS_QUEUE_PROVIDER_BINDING",
          "CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT",
          "CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE",
          "CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING",
          "CAMPAIGN_OS_REDIS_URL",
        ]),
        driverSdkBindingPackageBindingBlockerCount: 22,
        driverSdkBindingPackageBindingBrokerConnectionBlockerCount: 12,
        driverSdkBindingPackageBindingBrokerConnectionDiagnosticCodes: expect.arrayContaining([
          "REDIS_BROKER_CREDENTIALS_REFERENCE_MISSING",
          "REDIS_BROKER_TLS_POLICY_MISSING",
          "REDIS_BROKER_DATABASE_SELECTION_MISSING",
          "REDIS_BROKER_TIMEOUT_POLICY_MISSING",
          "REDIS_BROKER_RETRY_BACKOFF_POLICY_MISSING",
          "REDIS_BROKER_CIRCUIT_BREAKER_POLICY_MISSING",
          "REDIS_BROKER_HEALTH_CHECK_ENABLEMENT_MISSING",
        ]),
        driverSdkBindingPackageBindingBrokerConnectionHealthCheckMode: "activation_required",
        driverSdkBindingPackageBindingBrokerConnectionStatus: "blocked",
        driverSdkBindingPackageBindingBrowserBundleAllowed: false,
        driverSdkBindingPackageBindingDiagnosticCodes: expect.arrayContaining([
          "QUEUE_PROVIDER_PACKAGE_MISSING",
          "QUEUE_PROVIDER_PACKAGE_BINDING_MISSING",
          "QUEUE_PROVIDER_PACKAGE_PROVIDER_KIND_MISSING",
          "QUEUE_PROVIDER_PACKAGE_REDIS_ENDPOINT_MISSING",
          "QUEUE_PROVIDER_PACKAGE_CREDENTIALS_MISSING",
          "QUEUE_PROVIDER_PACKAGE_WORKER_QUEUE_MISSING",
          "QUEUE_PROVIDER_PACKAGE_DEAD_LETTER_QUEUE_MISSING",
          "QUEUE_PROVIDER_PACKAGE_WORKER_LEASE_MISSING",
          "QUEUE_PROVIDER_PACKAGE_OBSERVABILITY_MISSING",
          "QUEUE_PROVIDER_PACKAGE_RUNBOOK_MISSING",
        ]),
        driverSdkBindingPackageBindingFamily: "bullmq-redis-compatible",
        driverSdkBindingPackageBindingLiveBrokerConnectionAttempted: false,
        driverSdkBindingPackageBindingLiveBrokerHealthCheckAttempted: false,
        driverSdkBindingPackageBindingLiveQueuePublishingEnabled: false,
        driverSdkBindingPackageBindingLiveWorkerExecutionEnabled: false,
        driverSdkBindingPackageBindingPackageName: "bullmq",
        driverSdkBindingPackageBindingPackageRef: "npm:bullmq",
        driverSdkBindingPackageBindingSdkClientConstructed: false,
        driverSdkBindingPackageBindingStatus: "blocked",
        driverSdkBindingSdkClientConstructed: false,
        driverSdkBindingSdkPackageRef: "package-ref:@provider/queue-sdk",
        driverSdkBindingStatus: "blocked",
        driverSdkBindingValid: false,
        driverStatus: "blocked",
        driverValid: false,
        mode: "production_required",
        productionReady: false,
        providerId: "metadata-only",
        status: "blocked",
        valid: false,
      },
      productionReady: false,
      queuePlanCoverage: {
        queuePlanCount: 9,
      },
      status: "scaffolded",
      valid: true,
    });
    expectNoQueueSecretLeak(report);
  });

  it("does not serialize scheduler runtime credentials or raw trigger payload samples", () => {
    const report = createBackendServiceReadinessReport({
      configOptions: {
        env: {
          CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
          CAMPAIGN_OS_DEAD_LETTER_QUEUE: "https://queue.invalid/dead-letter?token=queue-secret",
          CAMPAIGN_OS_DEGRADATION_POLICY: "fail-closed",
          CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "https://idempotency.invalid/store",
          CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "https://observability.invalid/hook?scheduler-hook-secret=1",
          CAMPAIGN_OS_OPERATOR_AUTHORIZATION_POLICY: "operator-review-required",
          CAMPAIGN_OS_RAW_TRIGGER_PAYLOAD_SAMPLE: "{\"walletAddress\":\"ELF_scheduler_wallet\",\"taskId\":\"scheduler_raw_task\"}",
          CAMPAIGN_OS_SCHEDULER_ENDPOINT: "https://scheduler-user:scheduler-pass@scheduler.invalid/hook?token=scheduler-secret",
          CAMPAIGN_OS_SCHEDULER_LEASE_STORE_URL: "https://lease.invalid/store",
          CAMPAIGN_OS_SCHEDULER_PROVIDER: "metadata-only",
          CAMPAIGN_OS_SCHEDULER_TOKEN_SAMPLE: "Bearer scheduler-token-sample",
          CAMPAIGN_OS_WORKER_QUEUE_URL: "https://queue.invalid/jobs",
        },
        profileId: "production-required",
      },
    });

    expect(report.schedulerRuntimeFoundation).toMatchObject({
      diagnosticCodes: [],
      dryRunTrigger: {
        enabled: true,
        liveCronExecutionEnabled: false,
        liveQueuePublishingEnabled: false,
        liveSchedulerExecutionEnabled: false,
      },
      profileId: "production-required",
      productionReady: false,
      registrationCoverage: {
        registrationCount: 9,
      },
      status: "local_ready",
      valid: true,
    });
    expectNoSchedulerSecretLeak(report);
  });

  it("uses readable labels and does not expose private artifact paths", () => {
    const report = createBackendServiceReadinessReport();
    const serialized = JSON.stringify(report);

    expect(serialized).toContain("Campaign OS Backend Service");
    expect(serialized).toContain("Local analytics ingestion runtime readiness");
    expect(serialized).toContain("Local contract writer runtime readiness");
    expect(serialized).not.toContain("kitty-specs");
    expect(serialized).not.toContain("docs/current");
    expect(serialized).not.toContain("evidence/");
    expect(serialized).not.toContain("sync/");
  });
});
