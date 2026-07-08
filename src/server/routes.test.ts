import { describe, expect, it } from "vitest";
import { apiSkillContractRegistry, requiredApiSkillIds } from "../domain/apiSkillContracts";
import type { ApiSkillId } from "../domain/types";
import {
  apiRuntimeRouteById,
  apiRuntimeRoutes,
  apiRuntimeServiceGroupById,
  apiRuntimeServiceGroups,
  createBackendTopologyReport,
  createApiRuntimeContractCoverage,
  createFailureEnvelope,
  createRuntimeMetadata,
  createRuntimeSafety,
  createSuccessEnvelope,
  invalidRequest,
  routeNotFound,
  runtimeBoundary,
  toApiRuntimeErrorBody,
} from "./index";
import { createApiFoundationReport } from "./apiFoundation";
import { createApiServicePortReport } from "./servicePorts";

const unsafeKeys = [
  "apikey",
  "bearer",
  "mnemonic",
  "objectkey",
  "password",
  "privatekey",
  "seedphrase",
  "secret",
  "signaturepayload",
  "signedurl",
  "token",
];

const allowedSafetyKeys = new Set(["noSecretHandling"]);

const collectKeys = (value: unknown, keys: string[] = []): string[] => {
  if (value === null || typeof value !== "object") {
    return keys;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectKeys(item, keys);
    }

    return keys;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (!allowedSafetyKeys.has(key)) {
      keys.push(key.toLowerCase());
    }
    collectKeys(nested, keys);
  }

  return keys;
};

const expectNoUnsafeKeys = (value: unknown) => {
  const keys = collectKeys(value);

  for (const unsafe of unsafeKeys) {
    expect(keys).not.toContain(unsafe);
  }
};

describe("API runtime route catalog", () => {
  it("declares unique local seeded routes with readiness and boundary metadata", () => {
    const routeIds = apiRuntimeRoutes.map((runtimeRoute) => runtimeRoute.id);

    expect(new Set(routeIds).size).toBe(apiRuntimeRoutes.length);
    expect(apiRuntimeRoutes.length).toBeGreaterThanOrEqual(17);
    expect(apiRuntimeRouteById["runtime.health"]).toMatchObject({
      method: "GET",
      path: "/api/health",
      readiness: "ready",
      serviceGroup: "runtime",
      supportMode: "local_seeded",
    });
    expect(apiRuntimeRouteById["wallet.session.create"]).toMatchObject({
      apiSkillId: "create_wallet_session",
      method: "POST",
      path: "/api/wallet/session",
      productionDependencies: expect.arrayContaining(["auth_session", "production_database"]),
      serviceGroup: "wallet_session",
    });

    for (const runtimeRoute of apiRuntimeRoutes) {
      expect(runtimeRoute.id.trim()).not.toHaveLength(0);
      expect(runtimeRoute.path).toMatch(/^\/api\//);
      expect(["GET", "POST"]).toContain(runtimeRoute.method);
      expect(["ready", "local_only", "review_required", "blocked"]).toContain(runtimeRoute.readiness);
      expect(["low", "medium", "high"]).toContain(runtimeRoute.riskLevel);
      expect(runtimeRoute.summary["en-US"]).not.toHaveLength(0);
      expect(runtimeRoute.summary["zh-CN"]).not.toHaveLength(0);
      expect(runtimeRoute.boundary["en-US"]).toContain("No live API");
      expect(apiRuntimeServiceGroupById[runtimeRoute.serviceGroup]).toBeDefined();
      expect(runtimeRoute.productionDependencies).toEqual(
        apiRuntimeServiceGroupById[runtimeRoute.serviceGroup].deferredDependencies,
      );
      expect(runtimeRoute.supportMode).toBe("local_seeded");
    }
  });

  it("covers every backend service group with route metadata", () => {
    const routeServiceGroups = new Set(apiRuntimeRoutes.map((runtimeRoute) => runtimeRoute.serviceGroup));

    for (const serviceGroup of apiRuntimeServiceGroups) {
      expect(routeServiceGroups.has(serviceGroup.id)).toBe(true);
    }
  });

  it("accounts for every runtime route in backend topology metadata", () => {
    const report = createBackendTopologyReport({
      knownRouteIds: apiRuntimeRoutes.map((runtimeRoute) => runtimeRoute.id),
    });

    expect(report.coverage.unassignedRouteIds).toEqual([]);
    expect(report.validation.valid).toBe(true);

    for (const runtimeRoute of apiRuntimeRoutes) {
      const owners = report.services.filter((service) => service.routeIds.includes(runtimeRoute.id));
      expect(owners).toHaveLength(1);
    }
  });

  it("maps supported route skills to the API skill contract registry and documents deferred skills", () => {
    const contractIds = new Set(apiSkillContractRegistry.map((contract) => contract.id));
    const coverage = createApiRuntimeContractCoverage();

    for (const runtimeRoute of apiRuntimeRoutes) {
      if (runtimeRoute.apiSkillId) {
        expect(contractIds.has(runtimeRoute.apiSkillId)).toBe(true);
      }
    }

    expect(coverage.routeCount).toBe(apiRuntimeRoutes.length);
    expect(coverage.coveredSkillIds).toEqual(
      expect.arrayContaining([
        "add_campaign_task",
        "agent_wallet_action",
        "check_eligibility",
        "create_campaign",
        "create_wallet_session",
        "export_winners",
        "generate_campaign_posts",
        "generate_campaign_tasks",
        "generate_i18n_draft",
        "get_campaign_analytics",
        "get_campaign_detail",
        "list_campaigns",
        "summarize_campaign",
        "verify_task",
      ] satisfies ApiSkillId[]),
    );
    expect(coverage.coveredSkillIds).toEqual(requiredApiSkillIds);
    expect(coverage.deferredSkillIds).toEqual([]);
    expect(coverage.routeIds).toEqual(
      expect.arrayContaining([
        "agent.wallet.action.review",
        "campaigns.posts.generate",
        "campaigns.summary",
        "campaigns.tasks.generate",
      ]),
    );
  });

  it("creates success and failure envelopes with traceable local-only safety flags", () => {
    const runtime = createRuntimeMetadata({ routeCount: apiRuntimeRoutes.length });
    const safety = createRuntimeSafety();
    const success = createSuccessEnvelope({
      data: { status: "ok" },
      routeCount: apiRuntimeRoutes.length,
      timestamp: "2026-07-06T08:00:00.000Z",
      traceId: "trace-test-success",
    });
    const failure = createFailureEnvelope({
      error: toApiRuntimeErrorBody(routeNotFound("GET", "/api/missing")),
      routeCount: apiRuntimeRoutes.length,
      timestamp: "2026-07-06T08:00:01.000Z",
      traceId: "trace-test-failure",
    });

    expect(runtime).toMatchObject({
      mode: "local_seeded",
      name: "campaign-os-api-runtime",
      routeCount: apiRuntimeRoutes.length,
    });
    expect(safety).toEqual({
      localOnly: true,
      noContractWrite: true,
      noExportFile: true,
      noLiveApi: true,
      noMigrationRunner: true,
      noProductionDatabase: true,
      noRewardCustody: true,
      noRewardDistribution: true,
      noSecretHandling: true,
      noStorageWrite: true,
      noWalletSignature: true,
      seededDataOnly: true,
    });
    expect(success).toMatchObject({
      data: { status: "ok" },
      ok: true,
      traceId: "trace-test-success",
    });
    expect(failure).toMatchObject({
      error: {
        code: "ROUTE_NOT_FOUND",
        status: 404,
      },
      ok: false,
      traceId: "trace-test-failure",
    });
    expect(success.safety).toEqual(safety);
    expect(failure.safety).toEqual(safety);
    expect(success.runtime.routeCount).toBe(apiRuntimeRoutes.length);
    expect(failure.runtime.routeCount).toBe(apiRuntimeRoutes.length);
  });

  it("keeps runtime errors and route metadata free of sensitive output", () => {
    const expectedErrors = [
      routeNotFound("GET", "/api/missing"),
      invalidRequest("campaignId", "missing"),
    ].map(toApiRuntimeErrorBody);

    expect(runtimeBoundary["en-US"]).toContain("No live API");
    expect(runtimeBoundary["zh-CN"]).toContain("不会执行实时 API");
    expectNoUnsafeKeys(apiRuntimeRoutes);
    expectNoUnsafeKeys(expectedErrors);
    expectNoUnsafeKeys(
      createFailureEnvelope({
        error: expectedErrors[0],
        routeCount: apiRuntimeRoutes.length,
        traceId: "trace-safe-scan",
      }),
    );
  });

  it("aligns runtime routes with API foundation readiness and service-port ownership", () => {
    const foundation = createApiFoundationReport();
    const servicePorts = createApiServicePortReport({ foundation });
    const foundationRouteIds = foundation.routes.map((route) => route.routeId);
    const servicePortRouteIds = servicePorts.ports.flatMap((port) => port.routeIds);

    expect(foundation.validation).toEqual({
      issues: [],
      valid: true,
    });
    expect(servicePorts.validation).toEqual({
      issues: [],
      valid: true,
    });
    expect(foundation.coverage).toMatchObject({
      implementedLocalCount: 11,
      notYetImplementedCount: 0,
      productionShapedDeferredCount: 3,
      routeCount: apiRuntimeRoutes.length,
      validationIssueCount: 0,
    });
    expect(foundationRouteIds).toEqual(apiRuntimeRoutes.map((route) => route.id));
    expect(new Set(servicePortRouteIds).size).toBe(apiRuntimeRoutes.length);
    expect(servicePortRouteIds.sort()).toEqual(foundationRouteIds.sort());

    for (const route of foundation.routes) {
      expect(route.responseEnvelopeId).toBe("api.response.success.v1");
      expect(route.errorEnvelopeId).toBe("api.response.error.v1");
      expect(route.serviceId).not.toHaveLength(0);
      expect(route.supportMode).toBe("local_seeded");
    }

    for (const port of servicePorts.ports) {
      expect(port.requiresExternalNetwork).toBe(false);
      expect(port.requiresSecret).toBe(false);
      expect(port.productionAdapterStatus).not.toBe("enabled");
    }
  });
});
