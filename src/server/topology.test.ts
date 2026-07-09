import { describe, expect, it } from "vitest";
import {
  apiRuntimeRoutes,
  backendAdapterGroups,
  backendDataStores,
  backendDeploymentUnits,
  backendRuntimeProfiles,
  backendServiceBoundaries,
  backendTopology,
  createBackendTopologyReport,
  validateBackendTopology,
} from "./index";
import { providerIndexerAdapterGroups } from "./providerIndexerAdapters";
import { queueProviderAdapterProductionPreconditions } from "./queueProviderAdapter";
import { queueProviderDriverProductionPreconditions } from "./queueProviderDriver";
import { queueProviderSdkBindingProductionPreconditions } from "./queueProviderSdkBinding";
import { queueProviderPackageProductionPreconditions } from "./queueProviderPackageBinding";
import { redisBrokerConnectionProductionPreconditions } from "./redisBrokerConnectionReadiness";
import { schedulerRuntimeProductionPreconditions } from "./schedulerRuntime";
import { observabilityExporterProductionPreconditions } from "./observabilityExporter";
import { workerLeaseStoreProductionPreconditions } from "./workerLeaseStore";
import { workerIdempotencyStoreProductionPreconditions } from "./workerIdempotencyStore";

const expectedServiceIds = [
  "campaign-service",
  "task-template-service",
  "wallet-session-service",
  "verification-service",
  "points-ranking-service",
  "referral-service",
  "eligibility-service",
  "export-service",
  "risk-scoring-service",
  "i18n-content-service",
  "ai-ops-service",
  "service-registry",
  "runtime-observability",
];

const expectedDataStoreIds = [
  "campaign-db",
  "wallet-session-db",
  "task-evidence-db",
  "i18n-content-db",
  "risk-event-db",
  "points-ledger",
  "export-artifact-store",
  "analytics-warehouse",
  "contract-index",
];

const expectedAdapterGroupIds = [
  "wallet-auth-session",
  "aefinder-aelfscan-indexers",
  "dapp-api-adapters",
  "social-api-adapters",
  "manual-review",
  "ai-provider-adapters",
  "analytics-warehouse-adapter",
  "object-storage-adapter",
  "contract-reader-adapter",
  "queue-provider-sdk-binding-adapter",
  "observability-exporter-adapter",
  "contract-writer-adapter",
];

const expectedProfileIds = ["local-review", "staging-ready", "production-required"];
const expectedDeploymentUnitIds = [
  "web-app",
  "api-runtime",
  "worker-runtime",
  "scheduler-runtime",
  "observability-runtime",
  "contract-ops-runtime",
];

const forbiddenFragments = [
  "apikey",
  "bearertoken",
  "mnemonic",
  "objectkey",
  "oauth",
  "password",
  "privatekey",
  "providercredential",
  "rawsignature",
  "seedphrase",
  "signedurl",
];

const flattenForScan = (value: unknown): string => JSON.stringify(value).toLowerCase().replace(/[^a-z0-9]/g, "");

describe("backend service topology", () => {
  const knownRouteIds = apiRuntimeRoutes.map((route) => route.id);

  it("declares expected backend services, data stores, adapter groups, profiles, and deployments", () => {
    expect(backendServiceBoundaries.map((service) => service.id)).toEqual(expectedServiceIds);
    expect(backendDataStores.map((store) => store.id)).toEqual(expectedDataStoreIds);
    expect(backendAdapterGroups.map((adapter) => adapter.id)).toEqual(expectedAdapterGroupIds);
    expect(backendRuntimeProfiles.map((profile) => profile.id)).toEqual(expectedProfileIds);
    expect(backendDeploymentUnits.map((unit) => unit.id)).toEqual(expectedDeploymentUnitIds);

    for (const service of backendServiceBoundaries) {
      expect(service.name).not.toHaveLength(0);
      expect(service.description).not.toHaveLength(0);
      expect(["ready", "local_only", "review_required", "deferred", "disabled"]).toContain(service.readiness);
      expect(expectedDeploymentUnitIds).toContain(service.deploymentUnit);
      expect(service.runtimeProfiles.length).toBeGreaterThan(0);
    }
    expect(backendServiceBoundaries.find((service) => service.id === "campaign-service")).toMatchObject({
      risks: expect.arrayContaining([
        expect.stringContaining("read-only local review metadata"),
      ]),
      routeIds: expect.arrayContaining([
        "campaigns.lifecycle",
        "campaigns.launch.readiness",
        "campaigns.delivery.readiness",
        "campaigns.companion.contract.readiness",
        "campaigns.contract.transparency",
      ]),
    });
    expect(backendServiceBoundaries.find((service) => service.id === "wallet-session-service")).toMatchObject({
      dataStores: ["wallet-session-db"],
      description: expect.stringContaining("repository-backed local wallet_sessions persistence"),
      risks: expect.arrayContaining([
        expect.stringContaining("Repository-backed wallet session records are local review only"),
      ]),
      routeIds: ["wallet.session.create"],
    });
    expect(backendDataStores.find((store) => store.id === "wallet-session-db")).toMatchObject({
      currentMode: "local_json",
      records: expect.arrayContaining(["wallet_sessions", "repository_health"]),
      retentionRisk: expect.stringContaining("production session store rules"),
    });
    expect(backendServiceBoundaries.find((service) => service.id === "verification-service")).toMatchObject({
      routeIds: expect.arrayContaining(["campaigns.provider.readiness"]),
    });
    expect(backendServiceBoundaries.find((service) => service.id === "export-service")).toMatchObject({
      dataStores: expect.arrayContaining(["campaign-db", "export-artifact-store"]),
      description: expect.stringContaining("participant-backed export projection"),
      routeIds: expect.arrayContaining(["campaigns.export.readiness"]),
      risks: expect.arrayContaining([
        expect.stringContaining("contract transaction"),
        expect.stringContaining("reward distribution"),
      ]),
    });
    expect(backendServiceBoundaries.find((service) => service.id === "eligibility-service")).toMatchObject({
      description: expect.stringContaining("campaign participant repository/read model"),
      risks: expect.arrayContaining([
        expect.stringContaining("production Campaign DB participant table migration"),
        expect.stringContaining("live wallet verification"),
      ]),
    });
    expect(backendServiceBoundaries.find((service) => service.id === "referral-service")).toMatchObject({
      description: expect.stringContaining("local Campaign DB referral binding read model"),
      readiness: "local_only",
      risks: expect.arrayContaining([
        expect.stringContaining("production Campaign DB referral binding table migration"),
        expect.stringContaining("Live wallet verification"),
        expect.stringContaining("provider risk signals"),
        expect.stringContaining("reward distribution"),
      ]),
      routeIds: [],
      runtimeProfiles: expect.arrayContaining(["local-review", "staging-ready", "production-required"]),
    });
    expect(backendDataStores.find((store) => store.id === "campaign-db")).toMatchObject({
      containsSensitiveData: true,
      records: expect.arrayContaining(["campaign_participants", "campaign_referral_bindings"]),
      retentionRisk: expect.stringContaining("referral binding relationships"),
    });
  });

  it("keeps local review offline and production dependencies deferred or disabled", () => {
    const localReview = backendRuntimeProfiles.find((profile) => profile.id === "local-review");
    const productionRequired = backendRuntimeProfiles.find((profile) => profile.id === "production-required");
    const workerRuntime = backendDeploymentUnits.find((unit) => unit.id === "worker-runtime");
    const schedulerRuntime = backendDeploymentUnits.find((unit) => unit.id === "scheduler-runtime");

    expect(localReview).toMatchObject({
      externalNetworkAllowed: false,
      secretRequired: false,
    });
    expect(localReview?.requiredCapabilities).toEqual(["local_api_runtime"]);
    expect(localReview?.deferredCapabilities).toEqual(
      expect.arrayContaining(["production_database", "auth_session", "provider_adapters", "worker_queue"]),
    );
    expect(localReview?.disabledCapabilities).toEqual(
      expect.arrayContaining(["contract_writer", "reward_custody", "reward_distribution"]),
    );
    expect(productionRequired?.requiredCapabilities).toEqual(
      expect.arrayContaining([
        "production_database",
        "migration_runner",
        "auth_session",
        "provider_adapters",
        "worker_queue",
        "scheduler",
        "object_storage_export",
      ]),
    );
    expect(workerRuntime).toMatchObject({
      attachPointPath: "src/server/queueProviderAdapter.ts",
      attachPointPaths: expect.arrayContaining([
        "src/server/queueProviderDriver.ts",
        "src/server/queueProviderSdkBinding.ts",
        "src/server/queueProviderPackageBinding.ts",
        "src/server/redisBrokerConnectionReadiness.ts",
        "src/server/queueProviderAdapter.ts",
        "src/server/queueRuntime.ts",
        "src/server/workerIdempotencyStore.ts",
        "src/server/workerLeaseStore.ts",
      ]),
      currentImplementation: "source-topology-only",
      currentStatus: "local",
      entrypoint: "src/server/queueRuntime.ts",
      productionRequiredBlockerIds: expect.arrayContaining([
        "queue-provider-selection",
        "queue-provider-endpoint",
        "queue-provider-auth",
        "queue-provider-worker-queue-url",
        "queue-provider-dead-letter",
        "worker-lease-store-worker-lease-store-selection",
        "worker-lease-store-worker-lease-store-endpoint",
        "worker-lease-store-worker-lease-store-credentials",
        "worker-lease-store-worker-lease-clock-source",
        "worker-lease-store-worker-lease-heartbeat-policy",
        "worker-lease-store-worker-lease-ttl-policy",
        "worker-lease-store-worker-lease-release-policy",
        "worker-lease-store-worker-lease-stale-recovery",
        "worker-lease-store-worker-lease-fencing-policy",
        "worker-lease-store-worker-lease-idempotency-coordination",
        "worker-lease-store-worker-lease-observability",
        "worker-idempotency-store-idempotency-store-selection",
        "worker-idempotency-store-idempotency-store-endpoint",
        "worker-idempotency-store-idempotency-store-credentials",
        "worker-idempotency-store-idempotency-namespace",
        "worker-idempotency-store-idempotency-key-schema-version",
        "worker-idempotency-store-idempotency-retention-policy",
        "worker-idempotency-store-idempotency-conflict-policy",
        "worker-idempotency-store-idempotency-completion-policy",
        "worker-idempotency-store-idempotency-clock-source",
        "worker-idempotency-store-idempotency-worker-lease-coordination",
        "worker-idempotency-store-idempotency-observability",
        ...queueProviderSdkBindingProductionPreconditions.map(
          (precondition) => `queue-provider-sdk-binding-${precondition.id}`,
        ),
        ...queueProviderPackageProductionPreconditions.map(
          (precondition) => `queue-provider-package-${precondition.id}`,
        ),
        ...redisBrokerConnectionProductionPreconditions.map(
          (precondition) => `redis-broker-${precondition.id}`,
        ),
      ]),
      productionTarget: "worker_service",
      serviceIds: expect.arrayContaining([
        "verification-service",
        "risk-scoring-service",
        "ai-ops-service",
      ]),
    });
    expect(schedulerRuntime).toMatchObject({
      attachPointPath: "src/server/schedulerRuntime.ts",
      currentImplementation: "source-topology-only",
      currentStatus: "local",
      entrypoint: "src/server/schedulerRuntime.ts",
      localReviewRuntimePolicy: {
        cloudSchedulerPackageInstalled: false,
        cronPackageInstalled: false,
        liveCronExecutionEnabled: false,
        liveSchedulerExecutionEnabled: false,
      },
      productionTarget: "scheduled_runner",
      productionRequiredBlockerIds: schedulerRuntimeProductionPreconditions.map((precondition) => precondition.id),
      serviceIds: expect.arrayContaining([
        "campaign-service",
        "eligibility-service",
        "export-service",
        "risk-scoring-service",
        "ai-ops-service",
        "runtime-observability",
        "points-ranking-service",
      ]),
    });
    expect(backendDeploymentUnits.find((unit) => unit.id === "observability-runtime")).toMatchObject({
      attachPointPath: "src/server/observabilityExporter.ts",
      currentImplementation: "source-topology-only",
      currentStatus: "local",
      entrypoint: "src/server/observabilityExporter.ts",
      productionRequiredBlockerIds: observabilityExporterProductionPreconditions.map((precondition) => precondition.id),
      productionTarget: "worker_service",
      serviceIds: ["runtime-observability"],
    });

    for (const adapter of backendAdapterGroups.filter((group) => group.forbiddenInLocalReview)) {
      expect(["deferred", "disabled"]).toContain(adapter.status);
    }
  });

  it("aligns provider adapter topology with provider/indexer foundation groups", () => {
    const providerGroupIds = new Set(providerIndexerAdapterGroups.map((group) => group.id));
    const topologyProviderGroups = backendAdapterGroups
      .filter((group) => providerGroupIds.has(group.id))
      .map((group) => ({
        category: group.category,
        forbiddenInLocalReview: group.forbiddenInLocalReview,
        id: group.id,
        status: group.status,
      }));
    const foundationProviderGroups = providerIndexerAdapterGroups.map((group) => ({
      category: group.category,
      forbiddenInLocalReview: group.forbiddenInLocalReview,
      id: group.id,
      status: group.forbiddenInLocalReview ? group.status : expect.any(String),
    }));

    expect(topologyProviderGroups.map((group) => group.id)).toEqual(
      providerIndexerAdapterGroups.map((group) => group.id),
    );
    expect(topologyProviderGroups.map((group) => group.category)).toEqual(
      providerIndexerAdapterGroups.map((group) => group.category),
    );
    expect(topologyProviderGroups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          forbiddenInLocalReview: false,
          id: "wallet-auth-session",
          status: "local_stub",
        }),
        expect.objectContaining({
          forbiddenInLocalReview: false,
          id: "manual-review",
          status: "local_stub",
        }),
        expect.objectContaining({
          forbiddenInLocalReview: true,
          id: "contract-writer-adapter",
          status: "disabled",
        }),
      ]),
    );
    expect(foundationProviderGroups).toHaveLength(topologyProviderGroups.length);
    expect(backendServiceBoundaries.find((service) => service.id === "verification-service")).toMatchObject({
      adapterGroups: [
        "wallet-auth-session",
        "aefinder-aelfscan-indexers",
        "dapp-api-adapters",
        "social-api-adapters",
        "manual-review",
      ],
      risks: expect.arrayContaining([
        "Provider/indexer handoff degrades to pending or manual review while live calls are deferred.",
      ]),
    });
  });

  it("documents deferred worker scheduler dependencies across production handoff surfaces", () => {
    const serviceById = new Map(backendServiceBoundaries.map((service) => [service.id, service]));

    expect(serviceById.get("campaign-service")?.risks.join(" ")).toContain("scheduler runtime");
    expect(serviceById.get("verification-service")?.risks.join(" ")).toContain("idempotency store");
    expect(serviceById.get("verification-service")?.risks.join(" ")).toContain("Queue runtime activation");
    expect(serviceById.get("verification-service")?.risks.join(" ")).toContain("dead-letter");
    expect(serviceById.get("eligibility-service")?.risks.join(" ")).toContain("provider handoff");
    expect(serviceById.get("eligibility-service")?.risks.join(" ")).toContain("participant repository/read model");
    expect(serviceById.get("eligibility-service")?.risks.join(" ")).toContain("live wallet verification");
    expect(serviceById.get("eligibility-service")?.risks.join(" ")).toContain("queue runtime");
    expect(serviceById.get("referral-service")?.risks.join(" ")).toContain("referral binding read model");
    expect(serviceById.get("referral-service")?.risks.join(" ")).toContain("provider risk signals");
    expect(serviceById.get("referral-service")?.risks.join(" ")).toContain("queue runtime");
    expect(serviceById.get("referral-service")?.risks.join(" ")).toContain("dead-letter");
    expect(serviceById.get("export-service")?.risks.join(" ")).toContain("observability exporter");
    expect(serviceById.get("export-service")?.risks.join(" ")).toContain("Export preparation handoff");
    expect(serviceById.get("export-service")?.risks.join(" ")).toContain("production DB migration");
    expect(serviceById.get("export-service")?.risks.join(" ")).toContain("contract transaction");
    expect(serviceById.get("export-service")?.risks.join(" ")).toContain("reward distribution");
    expect(serviceById.get("risk-scoring-service")?.risks.join(" ")).toContain("worker lease");
    expect(serviceById.get("risk-scoring-service")?.risks.join(" ")).toContain("dead-letter");
    expect(serviceById.get("risk-scoring-service")?.risks.join(" ")).toContain("Risk cleanup");
    expect(serviceById.get("ai-ops-service")?.risks.join(" ")).toContain("scheduler runtime");
    expect(serviceById.get("ai-ops-service")?.risks.join(" ")).toContain("queue runtime");
    expect(serviceById.get("runtime-observability")?.risks.join(" ")).toContain("contract sync handoffs");
    expect(serviceById.get("runtime-observability")?.risks.join(" ")).toContain("metrics sink");
    expect(serviceById.get("runtime-observability")?.risks.join(" ")).toContain("trace collector");
    expect(serviceById.get("runtime-observability")?.risks.join(" ")).toContain("structured log sink");
    expect(serviceById.get("points-ranking-service")?.risks.join(" ")).toContain("Reward distribution handoff");
  });

  it("exposes scheduler runtime as metadata-only topology attach point without live cron packages", () => {
    const schedulerRuntime = backendDeploymentUnits.find((unit) => unit.id === "scheduler-runtime");

    expect(schedulerRuntime).toMatchObject({
      attachPointPath: "src/server/schedulerRuntime.ts",
      currentStatus: "local",
      localReviewRuntimePolicy: {
        cloudSchedulerPackageInstalled: false,
        cronPackageInstalled: false,
        liveCronExecutionEnabled: false,
        liveSchedulerExecutionEnabled: false,
      },
      productionRequiredBlockerIds: expect.arrayContaining([
        "scheduler-provider",
        "scheduler-endpoint",
        "scheduler-clock-lease",
        "scheduler-idempotency-store",
        "scheduler-queue-handoff",
        "scheduler-observability",
        "scheduler-operator-authorization",
        "scheduler-dead-letter",
      ]),
    });
    expect(schedulerRuntime?.productionRequiredBlockerIds).toHaveLength(
      schedulerRuntimeProductionPreconditions.length,
    );
  });

  it("exposes queue provider adapter as worker runtime attach metadata without secret-shaped blocker ids", () => {
    const workerRuntime = backendDeploymentUnits.find((unit) => unit.id === "worker-runtime");

    expect(workerRuntime).toMatchObject({
      attachPointPath: "src/server/queueProviderAdapter.ts",
      attachPointPaths: expect.arrayContaining([
        "src/server/queueProviderDriver.ts",
        "src/server/queueProviderSdkBinding.ts",
        "src/server/queueProviderAdapter.ts",
        "src/server/queueRuntime.ts",
        "src/server/workerIdempotencyStore.ts",
        "src/server/workerLeaseStore.ts",
      ]),
      currentImplementation: "source-topology-only",
      currentStatus: "local",
      entrypoint: "src/server/queueRuntime.ts",
      productionRequiredBlockerIds: expect.arrayContaining([
        "queue-provider-selection",
        "queue-provider-endpoint",
        "queue-provider-auth",
        "queue-provider-worker-queue-url",
        "queue-provider-dead-letter",
        "queue-provider-retry-policy",
        "queue-provider-idempotency-store",
        "queue-provider-worker-lease",
        "queue-provider-observability",
        "queue-provider-driver-queue-provider-driver-selection",
        "queue-provider-driver-queue-provider-driver-endpoint",
        "queue-provider-driver-queue-provider-driver-credentials",
        "queue-provider-driver-queue-provider-driver-worker-queue",
        "queue-provider-driver-queue-provider-driver-dead-letter",
        "queue-provider-driver-queue-provider-driver-retry-policy",
        "queue-provider-driver-queue-provider-driver-live-enable-gate",
        ...queueProviderSdkBindingProductionPreconditions.map(
          (precondition) => `queue-provider-sdk-binding-${precondition.id}`,
        ),
        ...queueProviderPackageProductionPreconditions.map(
          (precondition) => `queue-provider-package-${precondition.id}`,
        ),
        ...redisBrokerConnectionProductionPreconditions.map(
          (precondition) => `redis-broker-${precondition.id}`,
        ),
        "worker-lease-store-worker-lease-store-selection",
        "worker-lease-store-worker-lease-store-endpoint",
        "worker-lease-store-worker-lease-store-credentials",
        "worker-lease-store-worker-lease-clock-source",
        "worker-lease-store-worker-lease-heartbeat-policy",
        "worker-lease-store-worker-lease-ttl-policy",
        "worker-lease-store-worker-lease-release-policy",
        "worker-lease-store-worker-lease-stale-recovery",
        "worker-lease-store-worker-lease-fencing-policy",
        "worker-lease-store-worker-lease-idempotency-coordination",
        "worker-lease-store-worker-lease-observability",
        "worker-idempotency-store-idempotency-store-selection",
        "worker-idempotency-store-idempotency-store-endpoint",
        "worker-idempotency-store-idempotency-store-credentials",
        "worker-idempotency-store-idempotency-namespace",
        "worker-idempotency-store-idempotency-key-schema-version",
        "worker-idempotency-store-idempotency-retention-policy",
        "worker-idempotency-store-idempotency-conflict-policy",
        "worker-idempotency-store-idempotency-completion-policy",
        "worker-idempotency-store-idempotency-clock-source",
        "worker-idempotency-store-idempotency-worker-lease-coordination",
        "worker-idempotency-store-idempotency-observability",
      ]),
    });
    expect(workerRuntime?.productionRequiredBlockerIds).toHaveLength(
      queueProviderAdapterProductionPreconditions.length
        + queueProviderDriverProductionPreconditions.length
        + queueProviderSdkBindingProductionPreconditions.length
        + queueProviderPackageProductionPreconditions.length
        + redisBrokerConnectionProductionPreconditions.length
        + workerLeaseStoreProductionPreconditions.length
        + workerIdempotencyStoreProductionPreconditions.length,
    );
    expect(workerRuntime?.productionRequiredBlockerIds).not.toContain("queue-provider-credentials");
    expect(workerRuntime?.productionRequiredBlockerIds).not.toContain("worker-lease-store-CAMPAIGN_OS_WORKER_LEASE_CREDENTIALS");
    expect(workerRuntime?.productionRequiredBlockerIds).not.toContain(
      "worker-idempotency-store-CAMPAIGN_OS_IDEMPOTENCY_STORE_CREDENTIALS",
    );
  });

  it("exposes queue provider SDK binding as deferred attach metadata without production readiness", () => {
    const workerRuntime = backendDeploymentUnits.find((unit) => unit.id === "worker-runtime");
    const sdkBindingAdapter = backendAdapterGroups.find((group) => group.id === "queue-provider-sdk-binding-adapter");

    expect(sdkBindingAdapter).toMatchObject({
      category: "queue_provider",
      configurationMode: "env",
      failureMode: "keep_queue_provider_sdk_metadata_only",
      forbiddenInLocalReview: true,
      serviceIds: expect.arrayContaining([
        "verification-service",
        "risk-scoring-service",
        "ai-ops-service",
        "runtime-observability",
      ]),
      status: "deferred",
    });
    expect(workerRuntime).toMatchObject({
      attachPointPaths: expect.arrayContaining([
        "src/server/queueProviderSdkBinding.ts",
        "src/server/queueProviderPackageBinding.ts",
      ]),
      currentImplementation: "source-topology-only",
      currentStatus: "local",
      productionRequiredBlockerIds: expect.arrayContaining(
        [
          ...queueProviderSdkBindingProductionPreconditions.map(
            (precondition) => `queue-provider-sdk-binding-${precondition.id}`,
          ),
          ...queueProviderPackageProductionPreconditions.map(
            (precondition) => `queue-provider-package-${precondition.id}`,
          ),
        ],
      ),
    });
    expect(sdkBindingAdapter?.status).not.toBe("required_for_production");
  });

  it("exposes observability exporter as metadata-only topology attach point", () => {
    const observabilityRuntime = backendDeploymentUnits.find((unit) => unit.id === "observability-runtime");
    const observabilityAdapter = backendAdapterGroups.find((group) => group.id === "observability-exporter-adapter");

    expect(observabilityRuntime).toMatchObject({
      attachPointPath: "src/server/observabilityExporter.ts",
      currentImplementation: "source-topology-only",
      currentStatus: "local",
      entrypoint: "src/server/observabilityExporter.ts",
      productionRequiredBlockerIds: expect.arrayContaining([
        "observability-exporter-selection",
        "observability-exporter-endpoint",
        "observability-exporter-credentials",
        "observability-sink-registration",
        "observability-metric-namespace",
        "observability-retention-policy",
        "observability-trace-collector",
        "observability-log-sink",
        "observability-alert-routing",
        "observability-retry-dead-letter-policy",
        "observability-redaction-policy",
        "observability-operator-runbook",
      ]),
      serviceIds: ["runtime-observability"],
    });
    expect(observabilityRuntime?.productionRequiredBlockerIds).toHaveLength(
      observabilityExporterProductionPreconditions.length,
    );
    expect(observabilityAdapter).toMatchObject({
      category: "observability",
      configurationMode: "service_registry",
      failureMode: "keep_runtime_metadata_local_only",
      forbiddenInLocalReview: true,
      status: "deferred",
    });
  });

  it("produces a valid topology report with route and ownership coverage", () => {
    const report = createBackendTopologyReport({ knownRouteIds });

    expect(report.coverage).toMatchObject({
      adapterGroupCount: expectedAdapterGroupIds.length,
      dataStoreCount: expectedDataStoreIds.length,
      deploymentUnitCount: expectedDeploymentUnitIds.length,
      invalidReferenceCount: 0,
      runtimeProfileCount: expectedProfileIds.length,
      serviceCount: expectedServiceIds.length,
      unassignedRouteIds: [],
    });
    expect(report.profileReadiness["local-review"]).toMatchObject({
      externalNetworkAllowed: false,
      secretRequired: false,
    });
    expect(report.validation.valid).toBe(true);

    for (const routeId of knownRouteIds) {
      const owners = report.services.filter((service) => service.routeIds.includes(routeId));
      expect(owners).toHaveLength(1);
    }

    for (const dataStore of report.dataStores) {
      expect(expectedServiceIds).toContain(dataStore.ownerServiceId);
    }
  });

  it("fails closed for invalid topology references", () => {
    const invalidTopology = {
      ...backendTopology,
      services: [
        {
          ...backendTopology.services[0],
          dataStores: ["missing-store"],
          deploymentUnit: "missing-deployment",
          routeIds: ["missing.route"],
          runtimeProfiles: ["missing-profile"],
        },
      ],
      dataStores: [
        {
          ...backendTopology.dataStores[0],
          ownerServiceId: "missing-service",
        },
      ],
      adapterGroups: [
        {
          ...backendTopology.adapterGroups[0],
          serviceIds: ["missing-service"],
          status: "local_stub",
        },
      ],
      runtimeProfiles: [
        {
          ...backendTopology.runtimeProfiles[0],
          deploymentUnits: ["missing-deployment"],
          externalNetworkAllowed: true,
          secretRequired: true,
        },
      ],
      deploymentUnits: [
        {
          ...backendTopology.deploymentUnits[0],
          serviceIds: ["missing-service"],
        },
      ],
    } as unknown as typeof backendTopology;

    const validation = validateBackendTopology(invalidTopology, { knownRouteIds });
    const issueCodes = validation.issues.map((issue) => issue.code);

    expect(validation.valid).toBe(false);
    expect(issueCodes).toEqual(
      expect.arrayContaining([
        "UNKNOWN_DATA_STORE_ID",
        "UNKNOWN_DEPLOYMENT_UNIT",
        "UNKNOWN_ROUTE_ID",
        "UNKNOWN_RUNTIME_PROFILE",
        "UNKNOWN_SERVICE_ID",
        "LOCAL_REVIEW_REQUIRES_EXTERNAL_NETWORK",
        "LOCAL_REVIEW_REQUIRES_SECRET",
      ]),
    );
  });

  it("does not expose sensitive material in topology metadata", () => {
    const report = createBackendTopologyReport({ knownRouteIds });
    const flattened = flattenForScan(report);
    const serialized = JSON.stringify(report);

    for (const fragment of forbiddenFragments) {
      expect(flattened).not.toContain(fragment);
    }
    expect(serialized).not.toContain("kitty-specs");
    expect(serialized).not.toContain("docs/current");
    expect(serialized).not.toContain("evidence/");
    expect(serialized).not.toContain("sync/");
    expect(serialized).not.toContain(".kittify");
    expect(serialized).not.toContain("AGENTS.md");
  });
});
