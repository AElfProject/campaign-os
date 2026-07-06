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
      serviceId: "verification-service",
    });
    expect(apiServicePorts.find((port) => port.id === "export-port")?.futureAttachPoints).toEqual(
      expect.arrayContaining(["export artifact store", "contract writer approval gate"]),
    );
  });

  it("keeps production adapters disabled, deferred, or local-only", () => {
    const report = createApiServicePortReport();

    expect(report.coverage).toMatchObject({
      deferredPortCount: 0,
      localMetadataOnlyPortCount: 2,
      localSeededPortCount: 7,
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
