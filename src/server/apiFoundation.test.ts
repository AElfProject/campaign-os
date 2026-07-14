import { describe, expect, it } from "vitest";
import {
  apiRuntimeCapabilities,
  apiRuntimeContractRoutes,
  apiRuntimeRoutes,
  backendServiceBoundaries,
} from "./index";
import {
  createApiFoundationRegistry,
  createApiFoundationReport,
  validateApiFoundationRegistry,
  type ApiFoundationRegistry,
} from "./apiFoundation";

const expectedSurfaceIds = [
  "wallet-session",
  "campaign",
  "task-template",
  "verification",
  "eligibility",
  "analytics",
  "i18n-content",
  "export",
  "points-ranking",
  "referral",
  "risk-scoring",
  "ai-ops",
  "service-registry",
  "runtime-observability",
];

describe("API foundation registry", () => {
  it("registers every current runtime route exactly once with service and envelope metadata", () => {
    const registry = createApiFoundationRegistry();
    const routeIds = registry.routes.map((route) => route.routeId);

    expect(routeIds).toEqual(apiRuntimeContractRoutes.map((route) => route.id));
    expect(new Set(routeIds).size).toBe(apiRuntimeContractRoutes.length);
    expect(routeIds).not.toEqual(
      expect.arrayContaining(["workers.list", "schedules.list", "worker.queue.publish", "worker.lease.claim"]),
    );
    expect(registry.routes.map((route) => route.path)).not.toEqual(
      expect.arrayContaining(["/api/workers", "/api/schedules"]),
    );
    expect(registry.routes.map((route) => route.path)).not.toEqual(
      expect.arrayContaining(["/api/queue", "/api/queue-provider", "/api/queue-provider-driver"]),
    );

    for (const route of registry.routes) {
      expect(route.operationId).toMatch(/^[a-z][A-Za-z0-9]+$/);
      expect(route.serviceId).not.toHaveLength(0);
      expect(route.requestContractId).toBe(`${route.routeId}.request`);
      expect(route.responseEnvelopeId).toBe("api.response.success.v1");
      expect(route.errorEnvelopeId).toBe("api.response.error.v1");
      expect(route.supportMode).toBe("local_seeded");
      expect(route.description).not.toHaveLength(0);
    }
  });

  it("anchors service ownership to Mission 166 backend topology", () => {
    const registry = createApiFoundationRegistry();
    const serviceIds = new Set(backendServiceBoundaries.map((service) => service.id));

    for (const route of registry.routes) {
      expect(serviceIds.has(route.serviceId)).toBe(true);
    }

    expect(registry.routes.find((route) => route.routeId === "wallet.session.create")).toMatchObject({
      operationId: "createWalletSession",
      serviceId: "wallet-session-service",
    });
    expect(registry.surfaces.find((surface) => surface.surfaceId === "wallet-session")).toMatchObject({
      deferredDependencies: expect.arrayContaining(["auth_session", "production_database"]),
      notes: expect.stringContaining("wallet session repository"),
      routeIds: ["wallet.session.create"],
      serviceId: "wallet-session-service",
      state: "implemented_local",
    });
    expect(registry.routes.find((route) => route.routeId === "campaigns.export.preview")).toMatchObject({
      operationId: "previewCampaignExport",
      serviceId: "export-service",
    });
    expect(registry.routes.find((route) => route.routeId === "campaigns.lifecycle")).toMatchObject({
      operationId: "getCampaignLifecycle",
      serviceId: "campaign-service",
    });
    expect(registry.routes.find((route) => route.routeId === "campaigns.owner.list")).toMatchObject({
      operationId: "listOwnerCampaigns",
      serviceId: "campaign-service",
    });
    expect(registry.routes.find((route) => route.routeId === "campaigns.owner.detail")).toMatchObject({
      method: "GET",
      operationId: "getOwnerCampaignDetail",
      path: "/api/owner/campaigns/:campaignId",
      serviceId: "campaign-service",
    });
    expect(registry.routes.find((route) => route.routeId === "campaigns.participant.list")).toMatchObject({
      method: "GET",
      operationId: "listParticipantCampaigns",
      path: "/api/participant/campaigns",
      serviceId: "campaign-service",
    });
    expect(registry.routes.find((route) => route.routeId === "campaigns.participant.journey")).toMatchObject({
      method: "GET",
      operationId: "getParticipantCampaignJourney",
      path: "/api/participant/campaigns/:campaignId/journey",
      serviceId: "campaign-service",
    });
    expect(registry.routes.find((route) => route.routeId === "campaigns.launch.readiness")).toMatchObject({
      operationId: "getCampaignLaunchReadiness",
      serviceId: "campaign-service",
    });
    expect(registry.routes.find((route) => route.routeId === "campaigns.delivery.readiness")).toMatchObject({
      operationId: "getCampaignDeliveryReadiness",
      serviceId: "campaign-service",
    });
    expect(registry.routes.find((route) => route.routeId === "campaigns.publish.delivery.review")).toMatchObject({
      operationId: "getCampaignPublishDeliveryReview",
      serviceId: "campaign-service",
    });
    expect(registry.routes.find((route) => route.routeId === "campaigns.points.ranking.ledger.runtime"))
      .toMatchObject({
        operationId: "getCampaignPointsRankingLedgerRuntime",
        serviceId: "points-ranking-service",
      });
    expect(
      registry.routes.find((route) => route.routeId === "campaigns.companion.contract.readiness"),
    ).toMatchObject({
      operationId: "getCampaignCompanionContractReadiness",
      serviceId: "campaign-service",
    });
    expect(registry.routes.find((route) => route.routeId === "campaigns.contract.transparency")).toMatchObject({
      operationId: "getCampaignContractTransparency",
      serviceId: "campaign-service",
    });
    expect(registry.routes.find((route) => route.routeId === "campaigns.provider.readiness")).toMatchObject({
      operationId: "getCampaignProviderReadiness",
      serviceId: "verification-service",
    });
    expect(registry.routes.find((route) => route.routeId === "campaigns.export.readiness")).toMatchObject({
      operationId: "getCampaignExportReadiness",
      serviceId: "export-service",
    });
    expect(registry.routes.find((route) => route.routeId === "campaigns.export.artifacts.list")).toMatchObject({
      operationId: "listCampaignExportArtifacts",
      serviceId: "export-service",
    });
    expect(registry.routes.find((route) => route.routeId === "campaigns.export.artifacts.detail")).toMatchObject({
      operationId: "getCampaignExportArtifact",
      serviceId: "export-service",
    });
    expect(registry.routes.find((route) => route.routeId === "campaigns.analytics")).toMatchObject({
      serviceId: "runtime-observability",
    });
  });

  it("declares request field metadata for path, query, and body inputs", () => {
    const registry = createApiFoundationRegistry();
    const requestFieldsByRoute = new Map(
      registry.requestContracts.map((requestContract) => [
        requestContract.routeId,
        requestContract.fieldIds
          .map((fieldId) => registry.requestFields.find((field) => field.id === fieldId))
          .filter(Boolean),
      ]),
    );

    expect(requestFieldsByRoute.get("campaigns.create")?.map((field) => field?.name)).toEqual(
      expect.arrayContaining(["duration", "endTime", "goal", "ownerAddress", "projectId", "rewardDescription", "startTime"]),
    );
    expect(requestFieldsByRoute.get("campaigns.detail")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          location: "path",
          name: "campaignId",
          required: true,
        }),
      ]),
    );
    expect(requestFieldsByRoute.get("campaigns.owner.list")?.map((field) => field?.name)).toEqual(
      expect.arrayContaining(["limit", "projectId", "status"]),
    );
    expect(
      requestFieldsByRoute
        .get("campaigns.owner.list")
        ?.find((field) => field?.name === "status"),
    ).toMatchObject({
      enumValues: ["draft", "ai_draft", "human_review", "scheduled", "paused"],
      location: "query",
      required: false,
      valueType: "enum",
    });
    expect(requestFieldsByRoute.get("campaigns.owner.list")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          location: "path",
          name: "projectId",
          required: true,
        }),
        expect.objectContaining({
          enumValues: ["draft", "ai_draft", "human_review", "scheduled", "paused"],
          location: "query",
          name: "status",
          required: false,
        }),
        expect.objectContaining({
          location: "query",
          name: "limit",
          required: false,
          valueType: "number",
        }),
      ]),
    );
    for (const routeId of ["campaigns.owner.detail", "campaigns.participant.journey"]) {
      expect(requestFieldsByRoute.get(routeId)).toEqual([
        expect.objectContaining({
          location: "path",
          name: "campaignId",
          required: true,
          valueType: "string",
        }),
      ]);
    }
    expect(requestFieldsByRoute.get("campaigns.participant.list")).toEqual([]);
    for (const routeId of [
      "campaigns.delivery.readiness",
      "campaigns.publish.delivery.review",
      "campaigns.points.ranking.ledger.runtime",
      "campaigns.companion.contract.readiness",
      "campaigns.contract.transparency",
    ]) {
      expect(requestFieldsByRoute.get(routeId)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            location: "path",
            name: "campaignId",
            required: true,
          }),
        ]),
      );
    }
    expect(requestFieldsByRoute.get("tasks.verify")?.map((field) => field?.name)).toEqual(
      expect.arrayContaining(["accountType", "campaignId", "taskId", "walletAddress", "walletSource"]),
    );
    expect(
      requestFieldsByRoute
        .get("tasks.verify")
        ?.filter((field) => ["accountType", "walletAddress", "walletSource"].includes(field?.name ?? ""))
        .every((field) => field?.required === false),
    ).toBe(true);
    expect(requestFieldsByRoute.get("campaigns.eligibility")?.map((field) => field?.name)).toEqual(
      expect.arrayContaining(["accountType", "address", "campaignId", "walletAddress", "walletSource"]),
    );
    expect(requestFieldsByRoute.get("campaigns.export.artifacts.list")?.map((field) => field?.name)).toEqual(
      expect.arrayContaining(["artifactId", "batchId", "campaignId", "format", "retentionState", "traceId"]),
    );
    expect(requestFieldsByRoute.get("campaigns.export.artifacts.detail")?.map((field) => field?.name)).toEqual(
      expect.arrayContaining(["artifactId", "campaignId"]),
    );
    expect(
      requestFieldsByRoute
        .get("campaigns.export.preview")
        ?.find((field) => field?.name === "contractRootMode"),
    ).toMatchObject({
      enumValues: ["none", "eligibility_root"],
      location: "body",
      required: false,
      valueType: "enum",
    });

    for (const field of registry.requestFields.filter((item) => item.valueType === "enum")) {
      expect(field.enumValues?.length).toBeGreaterThan(0);
    }
  });

  it("reports v0.2 backend surfaces as local, deferred, or not yet implemented", () => {
    const report = createApiFoundationReport();

    expect(report.surfaces.map((surface) => surface.surfaceId)).toEqual(expectedSurfaceIds);
    expect(report.coverage).toMatchObject({
      implementedLocalCount: 12,
      notYetImplementedCount: 0,
      productionShapedDeferredCount: 2,
      routeCount: apiRuntimeContractRoutes.length,
      surfaceCount: expectedSurfaceIds.length,
      validationIssueCount: 0,
    });
    expect(report.validation.valid).toBe(true);
    expect(report.surfaces.find((surface) => surface.surfaceId === "points-ranking")).toMatchObject({
      routeIds: ["campaigns.points.ranking.ledger.runtime"],
      serviceId: "points-ranking-service",
      state: "implemented_local",
    });
    expect(report.surfaces.find((surface) => surface.surfaceId === "runtime-observability")).toMatchObject({
      deferredDependencies: expect.arrayContaining(["scheduler", "worker_queue", "sensitive_material_boundary"]),
      state: "implemented_local",
      routeIds: expect.arrayContaining(["runtime.health", "runtime.contracts", "campaigns.summary"]),
    });
    expect(report.surfaces.find((surface) => surface.surfaceId === "campaign")).toMatchObject({
      notes: expect.stringContaining("campaign participant repository/read model"),
      routeIds: expect.arrayContaining([
        "campaigns.owner.list",
        "campaigns.owner.detail",
        "campaigns.participant.list",
        "campaigns.participant.journey",
        "campaigns.lifecycle",
        "campaigns.launch.readiness",
        "campaigns.delivery.readiness",
        "campaigns.publish.delivery.review",
        "campaigns.companion.contract.readiness",
        "campaigns.contract.transparency",
      ]),
    });
    expect(report.surfaces.find((surface) => surface.surfaceId === "campaign")?.notes).toContain(
      "future Campaign DB participant table service",
    );
    expect(report.surfaces.find((surface) => surface.surfaceId === "campaign")?.notes).toContain(
      "campaign referral binding read model metadata",
    );
    expect(report.surfaces.find((surface) => surface.surfaceId === "campaign")?.notes).toContain("contract writer");
    expect(report.surfaces.find((surface) => surface.surfaceId === "referral")).toMatchObject({
      deferredDependencies: expect.arrayContaining(["production_database", "provider_adapters"]),
      notes: expect.stringContaining("Local Campaign DB referral binding read model metadata"),
      routeIds: [],
      serviceId: "referral-service",
      state: "production_shaped_deferred",
    });
    expect(report.surfaces.find((surface) => surface.surfaceId === "referral")?.notes).toContain(
      "production referral API routes",
    );
    expect(report.surfaces.find((surface) => surface.surfaceId === "referral")?.notes).toContain(
      "provider risk signals",
    );
    expect(report.surfaces.find((surface) => surface.surfaceId === "referral")?.notes).toContain(
      "reward distribution",
    );
    expect(report.surfaces.find((surface) => surface.surfaceId === "verification")).toMatchObject({
      routeIds: expect.arrayContaining(["campaigns.provider.readiness"]),
    });
    expect(report.surfaces.find((surface) => surface.surfaceId === "export")).toMatchObject({
      routeIds: expect.arrayContaining([
        "campaigns.export.artifacts.detail",
        "campaigns.export.artifacts.list",
        "campaigns.export.readiness",
      ]),
    });
    expect(report.surfaces.find((surface) => surface.surfaceId === "ai-ops")).toMatchObject({
      deferredDependencies: expect.arrayContaining(["provider_adapters", "scheduler", "worker_queue"]),
      routeIds: expect.arrayContaining([
        "agent.wallet.action.review",
        "campaigns.tasks.generate",
        "campaigns.posts.generate",
      ]),
      state: "implemented_local",
    });
  });

  it("documents provider/indexer handoff and graceful degradation on runtime-facing surfaces", () => {
    const report = createApiFoundationReport();
    const surfaceById = new Map(report.surfaces.map((surface) => [surface.surfaceId, surface]));

    expect(surfaceById.get("verification")).toMatchObject({
      deferredDependencies: expect.arrayContaining(["provider_adapters", "worker_queue"]),
      notes: expect.stringContaining("retry/backoff"),
    });
    expect(surfaceById.get("campaign")).toMatchObject({
      deferredDependencies: expect.arrayContaining(["scheduler", "worker_queue"]),
      notes: expect.stringContaining("lifecycle handoff"),
    });
    expect(surfaceById.get("verification")?.notes).toContain("provider/indexer handoff");
    expect(surfaceById.get("verification")?.notes).toContain("queue runtime");
    expect(surfaceById.get("verification")?.notes).toContain("queue provider adapter activation");
    expect(surfaceById.get("verification")?.notes).toContain("BullMQ Redis-compatible package binding");
    expect(surfaceById.get("verification")?.notes).toContain("Redis broker readiness metadata");
    expect(surfaceById.get("verification")?.notes).toContain("Redis broker reference");
    expect(surfaceById.get("verification")?.notes).toContain("queue provider SDK binding");
    expect(surfaceById.get("verification")?.notes).toContain("worker lease store metadata");
    expect(surfaceById.get("verification")?.notes).toContain("dead-letter handling");
    expect(surfaceById.get("task-template")?.notes).toContain("disable_provider_task_templates");
    expect(surfaceById.get("eligibility")).toMatchObject({
      deferredDependencies: expect.arrayContaining(["scheduler", "worker_queue"]),
      notes: expect.stringContaining("campaign participant repository/read model"),
    });
    expect(surfaceById.get("eligibility")?.notes).toContain("deterministic or durable-test");
    expect(surfaceById.get("eligibility")?.notes).toContain("campaign referral binding read model");
    expect(surfaceById.get("eligibility")?.notes).toContain("live wallet verification");
    expect(surfaceById.get("eligibility")?.notes).toContain("production DB migration");
    expect(surfaceById.get("eligibility")?.notes).toContain("dead-letter queue");
    expect(surfaceById.get("export")).toMatchObject({
      deferredDependencies: expect.arrayContaining(["contract_writer", "object_storage_export", "scheduler", "worker_queue"]),
      notes: expect.stringContaining("participant-backed export projection"),
    });
    expect(surfaceById.get("export")?.notes).toContain("campaign participant repository/read model");
    expect(surfaceById.get("export")?.notes).toContain("campaign referral binding read model");
    expect(surfaceById.get("export")?.notes).toContain("no production DB migration");
    expect(surfaceById.get("export")?.notes).toContain("contract transaction");
    expect(surfaceById.get("export")?.notes).toContain("reward distribution");
    expect(surfaceById.get("export")?.notes).toContain("observability exporter");
    expect(surfaceById.get("export")?.notes).toContain("scheduler runtime");
    expect(surfaceById.get("export")?.notes).toContain("queue runtime");
    expect(surfaceById.get("export")?.notes).toContain("queue provider adapter activation");
    expect(surfaceById.get("export")?.notes).toContain("BullMQ Redis-compatible package binding");
    expect(surfaceById.get("export")?.notes).toContain("Redis broker readiness metadata");
    expect(surfaceById.get("export")?.notes).toContain("queue provider SDK binding");
    expect(surfaceById.get("points-ranking")).toMatchObject({
      deferredDependencies: expect.arrayContaining(["contract_writer", "production_database", "scheduler", "worker_queue"]),
      notes: expect.stringContaining("reward handoff scheduler runtime"),
    });
    expect(surfaceById.get("points-ranking")?.notes).toContain("dead-letter queue");
    expect(surfaceById.get("analytics")).toMatchObject({
      deferredDependencies: expect.arrayContaining(["scheduler", "worker_queue"]),
      notes: expect.stringContaining("analytics ingestion"),
    });
    expect(surfaceById.get("analytics")?.notes).toContain("dead-letter queue");
    expect(surfaceById.get("risk-scoring")).toMatchObject({
      deferredDependencies: expect.arrayContaining(["scheduler", "worker_queue"]),
      notes: expect.stringContaining("worker lease"),
    });
    expect(surfaceById.get("risk-scoring")?.notes).toContain("queue runtime");
    expect(surfaceById.get("risk-scoring")?.notes).toContain("queue provider adapter activation");
    expect(surfaceById.get("risk-scoring")?.notes).toContain("BullMQ Redis-compatible package binding");
    expect(surfaceById.get("risk-scoring")?.notes).toContain("Redis broker readiness metadata");
    expect(surfaceById.get("risk-scoring")?.notes).toContain("queue provider SDK binding");
    expect(surfaceById.get("ai-ops")).toMatchObject({
      deferredDependencies: expect.arrayContaining(["scheduler", "worker_queue"]),
      notes: expect.stringContaining("observability exporter"),
    });
    expect(surfaceById.get("ai-ops")?.notes).toContain("queue runtime");
    expect(surfaceById.get("runtime-observability")).toMatchObject({
      deferredDependencies: expect.arrayContaining(["scheduler", "worker_queue", "sensitive_material_boundary"]),
      notes: expect.stringContaining("contract sync handoff"),
      routeIds: expect.arrayContaining(["runtime.health", "runtime.contracts"]),
    });
    expect(surfaceById.get("runtime-observability")?.notes).toContain("observability exporter readiness metadata");
    expect(surfaceById.get("runtime-observability")?.notes).toContain("live telemetry export");
    expect(surfaceById.get("runtime-observability")?.notes).toContain("metrics sink writes");
    expect(surfaceById.get("runtime-observability")?.notes).toContain("structured logs");
    expect(surfaceById.get("runtime-observability")?.notes).toContain("traces");
    expect(surfaceById.get("runtime-observability")?.notes).toContain("alerts");
    expect(surfaceById.get("runtime-observability")?.notes).toContain("worker lease readiness metadata");
    expect(surfaceById.get("runtime-observability")?.notes).toContain("worker lease store activation");
    expect(surfaceById.get("runtime-observability")?.notes).toContain("BullMQ Redis-compatible package binding readiness metadata");
    expect(surfaceById.get("runtime-observability")?.notes).toContain("Redis broker readiness metadata");
    expect(surfaceById.get("runtime-observability")?.notes).toContain("live broker health-check");
    expect(surfaceById.get("runtime-observability")?.notes).toContain("live broker connection");
    expect(surfaceById.get("runtime-observability")?.notes).toContain("queue provider adapter readiness");
    expect(surfaceById.get("runtime-observability")?.notes).toContain("queue provider package binding");
    expect(surfaceById.get("runtime-observability")?.notes).toContain("queue provider SDK binding readiness metadata");
    expect(surfaceById.get("runtime-observability")?.notes).toContain("queue provider SDK binding");
    expect(surfaceById.get("runtime-observability")?.notes).toContain("dead-letter queue");
    expect(surfaceById.get("service-registry")?.notes).toContain("provider registry");
    expect(surfaceById.get("service-registry")?.notes).toContain("queue provider adapter readiness");
    expect(surfaceById.get("service-registry")?.notes).toContain("BullMQ Redis-compatible package binding readiness");
    expect(surfaceById.get("service-registry")?.notes).toContain("Redis broker readiness metadata");
    expect(surfaceById.get("service-registry")?.notes).toContain("queue provider SDK binding readiness");
  });

  it("does not expose private Kitty artifact paths in public API metadata", () => {
    const serialized = JSON.stringify(createApiFoundationReport());

    expect(serialized).not.toContain("kitty-specs");
    expect(serialized).not.toContain("docs/current");
    expect(serialized).not.toContain("evidence/");
    expect(serialized).not.toContain("sync/");
    expect(serialized).not.toContain(".kittify");
    expect(serialized).not.toContain("AGENTS.md");
  });

  it("validates capability references and path placeholders", () => {
    const validation = validateApiFoundationRegistry();
    const capabilityIds = new Set(apiRuntimeCapabilities.map((capability) => capability.id));

    expect(validation).toEqual({
      issues: [],
      valid: true,
    });

    for (const route of createApiFoundationRegistry().routes) {
      for (const capabilityId of route.productionDependencies) {
        expect(capabilityIds.has(capabilityId)).toBe(true);
      }
    }
    expect(capabilityIds.has("worker_lease" as never)).toBe(false);
    expect(createApiFoundationRegistry().routes.map((route) => route.routeId)).toEqual(
      expect.arrayContaining(["runtime.health", "runtime.contracts"]),
    );
    expect(createApiFoundationRegistry().routes.map((route) => route.routeId)).not.toEqual(
      expect.arrayContaining(["worker.lease.claim"]),
    );
  });

  it("fails closed for invalid foundation references", () => {
    const registry = createApiFoundationRegistry();
    const invalidRegistry: ApiFoundationRegistry = {
      ...registry,
      requestContracts: [
        {
          ...registry.requestContracts[0],
          fieldIds: ["missing-field"],
          id: "missing-request",
          routeId: "missing.route",
        },
      ],
      requestFields: [
        {
          ...registry.requestFields[0],
          enumValues: [],
          id: "bad-field",
          routeId: "missing.route",
          valueType: "enum",
        },
      ],
      routes: [
        {
          ...registry.routes[0],
          errorEnvelopeId: "missing-error-envelope",
          operationId: "duplicateOperation",
          productionDependencies: ["missing-capability" as never],
          requestContractId: "missing-request",
          responseEnvelopeId: "missing-success-envelope",
          routeId: "missing.route",
          serviceId: "missing-service" as never,
        },
        {
          ...registry.routes[1],
          operationId: "duplicateOperation",
          requestContractId: registry.requestContracts[1].id,
        },
      ],
      surfaces: [
        {
          ...registry.surfaces[0],
          deferredDependencies: ["missing-capability" as never],
          routeIds: ["missing.route"],
          serviceId: "missing-service" as never,
        },
      ],
    };

    const validation = validateApiFoundationRegistry(invalidRegistry);
    const issueCodes = validation.issues.map((issue) => issue.code);

    expect(validation.valid).toBe(false);
    expect(issueCodes).toEqual(
      expect.arrayContaining([
        "DUPLICATE_OPERATION_ID",
        "UNKNOWN_CAPABILITY_ID",
        "UNKNOWN_ERROR_ENVELOPE",
        "UNKNOWN_REQUEST_CONTRACT",
        "UNKNOWN_ROUTE_ID",
        "UNKNOWN_SERVICE_ID",
        "UNKNOWN_SUCCESS_ENVELOPE",
        "UNASSIGNED_SURFACE",
      ]),
    );
  });
});
