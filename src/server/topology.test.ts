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
import { schedulerRuntimeProductionPreconditions } from "./schedulerRuntime";

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
  "contract-writer-adapter",
];

const expectedProfileIds = ["local-review", "staging-ready", "production-required"];
const expectedDeploymentUnitIds = [
  "web-app",
  "api-runtime",
  "worker-runtime",
  "scheduler-runtime",
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
      currentImplementation: "source-topology-only",
      entrypoint: "src/server/queueRuntime.ts",
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

    for (const adapter of backendAdapterGroups.filter((group) => group.forbiddenInLocalReview)) {
      expect(["deferred", "disabled"]).toContain(adapter.status);
    }
  });

  it("aligns provider adapter topology with provider/indexer foundation groups", () => {
    const topologyProviderGroups = backendAdapterGroups.map((group) => ({
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
    expect(serviceById.get("eligibility-service")?.risks.join(" ")).toContain("queue runtime");
    expect(serviceById.get("export-service")?.risks.join(" ")).toContain("observability exporter");
    expect(serviceById.get("export-service")?.risks.join(" ")).toContain("Export preparation handoff");
    expect(serviceById.get("risk-scoring-service")?.risks.join(" ")).toContain("worker lease");
    expect(serviceById.get("risk-scoring-service")?.risks.join(" ")).toContain("dead-letter");
    expect(serviceById.get("risk-scoring-service")?.risks.join(" ")).toContain("Risk cleanup");
    expect(serviceById.get("ai-ops-service")?.risks.join(" ")).toContain("scheduler runtime");
    expect(serviceById.get("ai-ops-service")?.risks.join(" ")).toContain("queue runtime");
    expect(serviceById.get("runtime-observability")?.risks.join(" ")).toContain("contract sync handoffs");
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

    for (const fragment of forbiddenFragments) {
      expect(flattened).not.toContain(fragment);
    }
  });
});
