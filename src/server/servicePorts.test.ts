import { describe, expect, it } from "vitest";
import {
  createApiFoundationRegistry,
} from "./apiFoundation";
import {
  apiServicePorts,
  createApiServicePortReport,
  validateApiServicePorts,
  type ApiServicePort,
} from "./servicePorts";

describe("API service ports", () => {
  it("owns every current API foundation route exactly once", () => {
    const foundation = createApiFoundationRegistry();
    const report = createApiServicePortReport({ foundation });
    const ownedRouteIds = apiServicePorts.flatMap((port) => port.routeIds);

    expect(report.validation).toEqual({
      issues: [],
      valid: true,
    });
    expect(new Set(ownedRouteIds).size).toBe(foundation.routes.length);
    expect(ownedRouteIds.sort()).toEqual(foundation.routes.map((route) => route.routeId).sort());
    expect(report.coverage.routeOwnershipCount).toBe(foundation.routes.length);
  });

  it("declares expected service ports and future attach points", () => {
    const expectedPortIds = [
      "runtime-observability-port",
      "service-registry-port",
      "wallet-session-port",
      "campaign-port",
      "task-template-port",
      "verification-port",
      "eligibility-port",
      "i18n-content-port",
      "export-port",
      "points-ranking-port",
      "referral-port",
      "ai-ops-port",
    ];

    expect(apiServicePorts.map((port) => port.id)).toEqual(expectedPortIds);

    for (const port of apiServicePorts) {
      expect(port.localAdapter).not.toHaveLength(0);
      expect(port.notes).not.toHaveLength(0);
      expect(port.futureAttachPoints.length).toBeGreaterThan(0);
      expect(port.requiresExternalNetwork).toBe(false);
      expect(port.requiresSecret).toBe(false);
    }

    expect(apiServicePorts.find((port) => port.id === "verification-port")).toMatchObject({
      deferredCapabilities: expect.arrayContaining(["provider_adapters", "worker_queue"]),
      futureAttachPoints: expect.arrayContaining([
        "BullMQ Redis-compatible package binding metadata",
        "Redis broker connection readiness metadata",
        "Redis broker endpoint reference",
        "queue provider SDK package installation",
        "queue provider package binding registration",
        "queue provider SDK binding registration",
        "real broker connection",
        "live worker execution gate",
      ]),
      notes: expect.stringContaining("BullMQ Redis-compatible package binding metadata"),
      routeIds: expect.arrayContaining(["campaigns.provider.readiness"]),
      serviceId: "verification-service",
    });
    expect(apiServicePorts.find((port) => port.id === "wallet-session-port")).toMatchObject({
      deferredCapabilities: expect.arrayContaining(["auth_session", "production_database"]),
      futureAttachPoints: expect.arrayContaining([
        "src/server/walletSessionRepository.ts sanitized wallet session repository",
        "src/server/walletSessionDurableStore.ts durable-test wallet session store",
        "production session repository adapter",
      ]),
      localAdapter: expect.stringContaining("src/server/walletSessionRepository.ts"),
      notes: expect.stringContaining("repository-backed local session store"),
      productionAdapterStatus: "local_seeded",
      requiresExternalNetwork: false,
      requiresSecret: false,
      routeIds: ["wallet.session.create"],
      serviceId: "wallet-session-service",
    });
    expect(apiServicePorts.find((port) => port.id === "campaign-port")).toMatchObject({
      deferredCapabilities: expect.arrayContaining(["contract_writer"]),
      futureAttachPoints: expect.arrayContaining([
        "src/server/campaignDbRepository.ts campaign participant repository/read model",
        "src/server/campaignDbRepository.ts campaign referral binding read model",
        "contract writer runtime readiness handoff",
        "future Campaign DB participant table service",
        "future Campaign DB referral binding table service",
      ]),
      localAdapter: expect.stringContaining("src/server/contractWriterRuntime.ts"),
      notes: expect.stringContaining("contract writer runtime readiness inspection"),
      productionAdapterStatus: "local_seeded",
      requiresExternalNetwork: false,
      requiresSecret: false,
      routeIds: expect.arrayContaining([
        "campaigns.lifecycle",
        "campaigns.launch.readiness",
        "campaigns.delivery.readiness",
        "campaigns.publish.delivery.review",
        "campaigns.companion.contract.readiness",
        "campaigns.contract.writer.readiness",
        "campaigns.contract.transparency",
      ]),
      serviceId: "campaign-service",
    });
    expect(apiServicePorts.find((port) => port.id === "campaign-port")?.notes).toContain(
      "local deterministic or durable-test",
    );
    expect(apiServicePorts.find((port) => port.id === "campaign-port")?.notes).toContain(
      "campaign referral binding read model metadata",
    );
    expect(apiServicePorts.find((port) => port.id === "campaign-port")?.notes).toContain("reward distribution");
    expect(apiServicePorts.find((port) => port.id === "runtime-observability-port")).toMatchObject({
      futureAttachPoints: expect.arrayContaining([
        "src/server/observabilityExporter.ts readiness foundation",
        "src/server/queueProviderDriver.ts readiness projection",
        "src/server/queueProviderSdkBinding.ts readiness projection",
        "src/server/queueProviderPackageBinding.ts readiness projection",
        "src/server/redisBrokerConnectionReadiness.ts readiness metadata",
        "metrics sink registration",
        "structured log sink",
        "trace collector",
        "alert routing policy",
      ]),
      notes: expect.stringContaining("observability exporter readiness"),
      productionAdapterStatus: "local_metadata_only",
      serviceId: "runtime-observability",
    });
    expect(apiServicePorts.find((port) => port.id === "export-port")?.futureAttachPoints).toEqual(
      expect.arrayContaining([
        "src/server/campaignDbRepository.ts participant-backed export projection",
        "src/server/campaignDbRepository.ts referral binding export projection",
        "src/server/exportArtifactRegistry.ts local artifact registry",
        "src/server/exportArtifactRegistry.ts local audit read model",
        "export artifact store",
        "contract writer approval gate",
        "future Campaign DB participant table service",
        "future Campaign DB referral binding table service",
      ]),
    );
    expect(apiServicePorts.find((port) => port.id === "export-port")?.routeIds).toEqual(
      expect.arrayContaining([
        "campaigns.export.artifacts.detail",
        "campaigns.export.artifacts.list",
        "campaigns.export.preview",
        "campaigns.export.readiness",
      ]),
    );
    expect(apiServicePorts.find((port) => port.id === "export-port")).toMatchObject({
      localAdapter: expect.stringContaining("src/server/exportArtifactRegistry.ts"),
      notes: expect.stringContaining("participant-backed export projection"),
      productionAdapterStatus: "local_seeded",
      requiresExternalNetwork: false,
      requiresSecret: false,
    });
    expect(apiServicePorts.find((port) => port.id === "export-port")?.notes).toContain("production DB migration");
    expect(apiServicePorts.find((port) => port.id === "export-port")?.notes).toContain("contract transaction");
    expect(apiServicePorts.find((port) => port.id === "export-port")?.notes).toContain("reward distribution");
    expect(apiServicePorts.find((port) => port.id === "points-ranking-port")).toMatchObject({
      deferredCapabilities: expect.arrayContaining(["production_database", "contract_writer"]),
      localAdapter: expect.stringContaining("src/domain/pointsRankingLedgerRuntime.ts"),
      productionAdapterStatus: "local_seeded",
      requiresExternalNetwork: false,
      requiresSecret: false,
      routeIds: ["campaigns.points.ranking.ledger.runtime"],
      serviceId: "points-ranking-service",
    });
    expect(apiServicePorts.find((port) => port.id === "points-ranking-port")?.notes).toContain(
      "production Pixiepoints writes",
    );
    expect(apiServicePorts.find((port) => port.id === "points-ranking-port")?.notes).toContain(
      "reward distribution",
    );
    expect(apiServicePorts.find((port) => port.id === "eligibility-port")).toMatchObject({
      futureAttachPoints: expect.arrayContaining([
        "src/server/campaignDbRepository.ts campaign participant repository/read model",
        "src/server/campaignDbRepository.ts campaign referral binding read model",
        "future Campaign DB participant table service",
        "future Campaign DB referral binding table service",
      ]),
      notes: expect.stringContaining("campaign participant repository/read model"),
      productionAdapterStatus: "local_seeded",
      requiresExternalNetwork: false,
      requiresSecret: false,
    });
    expect(apiServicePorts.find((port) => port.id === "eligibility-port")?.notes).toContain(
      "deterministic and durable-test",
    );
    expect(apiServicePorts.find((port) => port.id === "eligibility-port")?.notes).toContain(
      "campaign referral binding read model",
    );
    expect(apiServicePorts.find((port) => port.id === "eligibility-port")?.notes).toContain(
      "live wallet verification",
    );
    expect(apiServicePorts.find((port) => port.id === "eligibility-port")?.notes).toContain("production DB migration");
    expect(apiServicePorts.find((port) => port.id === "referral-port")).toMatchObject({
      deferredCapabilities: expect.arrayContaining(["production_database", "provider_adapters", "scheduler", "worker_queue"]),
      futureAttachPoints: expect.arrayContaining([
        "src/server/campaignDbRepository.ts campaign referral binding read model",
        "future Campaign DB referral binding table service",
        "provider risk signal reader",
        "dead-letter queue",
      ]),
      localAdapter: expect.stringContaining("src/server/campaignDbRepository.ts"),
      notes: expect.stringContaining("Wallet-aware referral binding metadata"),
      productionAdapterStatus: "local_metadata_only",
      requiresExternalNetwork: false,
      requiresSecret: false,
      routeIds: [],
      serviceId: "referral-service",
    });
    expect(apiServicePorts.find((port) => port.id === "referral-port")?.notes).toContain("production referral API routes");
    expect(apiServicePorts.find((port) => port.id === "referral-port")?.notes).toContain("provider risk calls");
    expect(apiServicePorts.find((port) => port.id === "referral-port")?.notes).toContain("reward distribution");
    expect(apiServicePorts.find((port) => port.id === "ai-ops-port")).toMatchObject({
      deferredCapabilities: expect.arrayContaining(["auth_session", "provider_adapters", "scheduler", "worker_queue"]),
      futureAttachPoints: expect.arrayContaining([
        "Agent Skill wallet action approval workflow",
        "AI task generation provider adapter",
        "AI campaign post provider adapter",
        "AI Ops worker execution gate",
      ]),
      productionAdapterStatus: "local_seeded",
      requiresExternalNetwork: false,
      requiresSecret: false,
      routeIds: expect.arrayContaining([
        "agent.wallet.action.review",
        "campaigns.tasks.generate",
        "campaigns.posts.generate",
      ]),
      serviceId: "ai-ops-service",
    });
  });

  it("keeps production adapters disabled, deferred, or local-only", () => {
    const report = createApiServicePortReport();

    expect(report.coverage).toMatchObject({
      deferredPortCount: 0,
      localMetadataOnlyPortCount: 3,
      localSeededPortCount: 9,
      portCount: apiServicePorts.length,
      validationIssueCount: 0,
    });

    for (const port of report.ports) {
      expect(["deferred", "disabled", "local_metadata_only", "local_seeded"]).toContain(
        port.productionAdapterStatus,
      );
      expect(port.productionAdapterStatus).not.toBe("enabled");
    }
  });

  it("does not expose private Kitty artifact paths in public service port metadata", () => {
    const serialized = JSON.stringify(createApiServicePortReport());

    expect(serialized).not.toContain("kitty-specs");
    expect(serialized).not.toContain("docs/current");
    expect(serialized).not.toContain("evidence/");
    expect(serialized).not.toContain("sync/");
    expect(serialized).not.toContain(".kittify");
    expect(serialized).not.toContain("AGENTS.md");
  });

  it("fails closed for unknown service and route references", () => {
    const invalidPorts: ApiServicePort[] = [
      {
        ...apiServicePorts[0],
        routeIds: ["missing.route"],
        serviceId: "missing-service" as never,
      },
      {
        ...apiServicePorts[1],
        routeIds: ["runtime.health"],
      },
      {
        ...apiServicePorts[2],
        routeIds: ["runtime.health"],
        requiresExternalNetwork: true,
        requiresSecret: true,
      },
    ];

    const validation = validateApiServicePorts({ ports: invalidPorts });
    const issueCodes = validation.issues.map((issue) => issue.code);

    expect(validation.valid).toBe(false);
    expect(issueCodes).toEqual(
      expect.arrayContaining([
        "DUPLICATE_ROUTE_OWNER",
        "LOCAL_REVIEW_REQUIRES_EXTERNAL_NETWORK",
        "LOCAL_REVIEW_REQUIRES_SECRET",
        "UNKNOWN_ROUTE_ID",
        "UNKNOWN_SERVICE_ID",
        "UNOWNED_ROUTE_ID",
      ]),
    );
  });

  it("reports route ownership counts from supplied fixtures", () => {
    const foundation = createApiFoundationRegistry();
    const ports = [
      {
        ...apiServicePorts[0],
        routeIds: foundation.routes.map((route) => route.routeId),
      },
    ];
    const report = createApiServicePortReport({ foundation, ports });

    expect(report.coverage).toMatchObject({
      portCount: 1,
      routeOwnershipCount: foundation.routes.length,
    });
  });
});
