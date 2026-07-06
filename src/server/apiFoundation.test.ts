import { describe, expect, it } from "vitest";
import {
  apiRuntimeCapabilities,
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

    expect(routeIds).toEqual(apiRuntimeRoutes.map((route) => route.id));
    expect(new Set(routeIds).size).toBe(apiRuntimeRoutes.length);

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
    expect(registry.routes.find((route) => route.routeId === "campaigns.export.preview")).toMatchObject({
      operationId: "previewCampaignExport",
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
    expect(requestFieldsByRoute.get("tasks.verify")?.map((field) => field?.name)).toEqual(
      expect.arrayContaining(["accountType", "campaignId", "taskId", "walletAddress", "walletSource"]),
    );
    expect(requestFieldsByRoute.get("campaigns.eligibility")?.map((field) => field?.name)).toEqual(
      expect.arrayContaining(["accountType", "address", "campaignId", "walletAddress", "walletSource"]),
    );

    for (const field of registry.requestFields.filter((item) => item.valueType === "enum")) {
      expect(field.enumValues?.length).toBeGreaterThan(0);
    }
  });

  it("reports v0.2 backend surfaces as local, deferred, or not yet implemented", () => {
    const report = createApiFoundationReport();

    expect(report.surfaces.map((surface) => surface.surfaceId)).toEqual(expectedSurfaceIds);
    expect(report.coverage).toMatchObject({
      implementedLocalCount: 10,
      notYetImplementedCount: 0,
      productionShapedDeferredCount: 4,
      routeCount: apiRuntimeRoutes.length,
      surfaceCount: expectedSurfaceIds.length,
      validationIssueCount: 0,
    });
    expect(report.validation.valid).toBe(true);
    expect(report.surfaces.find((surface) => surface.surfaceId === "points-ranking")).toMatchObject({
      state: "production_shaped_deferred",
      serviceId: "points-ranking-service",
    });
    expect(report.surfaces.find((surface) => surface.surfaceId === "runtime-observability")).toMatchObject({
      state: "implemented_local",
      routeIds: expect.arrayContaining(["runtime.health", "runtime.contracts"]),
    });
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
