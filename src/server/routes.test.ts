import { describe, expect, it } from "vitest";
import { apiSkillContractRegistry, requiredApiSkillIds } from "../domain/apiSkillContracts";
import type { ApiSkillId } from "../domain/types";
import {
  apiRuntimeRouteById,
  apiRuntimeContractRoutes,
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
  participantCampaignRouteContracts,
  routeNotFound,
  runtimeBoundary,
  toApiRuntimeErrorBody,
} from "./index";
import { createApiFoundationReport } from "./apiFoundation";
import { getAdminOperatorRoutePolicy } from "./authEnforcement";
import { getProtectedRouteAuth } from "./authSession";
import { createApiServicePortReport } from "./servicePorts";
import { createProductionBackendRouteCoverage } from "./productionBackendReadiness";
import {
  ADMIN_API_PATH_PARAMETER_MAX_LENGTH,
  adminApiRuntimeRouteById,
  adminApiRuntimeRoutes,
  apiRuntimeRouteCatalog,
  createAdminApiRuntimeRouteInventory,
  resolveAdminApiRoute,
  validateAdminApiRouteCatalog,
  type AdminApiRuntimeRouteDefinition,
} from "./routes";

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

const expectedAdminRoutes = [
  {
    id: "admin.campaigns.list",
    method: "GET",
    operationId: "listAdminCampaigns",
    path: "/api/admin/campaigns",
    serviceGroup: "campaign",
    serviceOwner: "campaign-service",
  },
  {
    id: "admin.reviews.list",
    method: "GET",
    operationId: "listParticipantReviews",
    path: "/api/admin/campaigns/:campaignId/reviews",
    serviceGroup: "campaign",
    serviceOwner: "campaign-service",
  },
  {
    id: "admin.reviews.detail",
    method: "GET",
    operationId: "getParticipantReview",
    path: "/api/admin/campaigns/:campaignId/reviews/:participantId",
    serviceGroup: "campaign",
    serviceOwner: "campaign-service",
  },
  {
    id: "admin.reviews.decide",
    method: "POST",
    operationId: "submitParticipantReviewDecision",
    path: "/api/admin/campaigns/:campaignId/reviews/:participantId/decisions",
    serviceGroup: "campaign",
    serviceOwner: "campaign-service",
  },
  {
    id: "admin.winners.list",
    method: "GET",
    operationId: "listCurrentWinners",
    path: "/api/admin/campaigns/:campaignId/winners",
    serviceGroup: "campaign",
    serviceOwner: "campaign-service",
  },
  {
    id: "admin.artifacts.generate",
    method: "POST",
    operationId: "generateAdminArtifact",
    path: "/api/admin/campaigns/:campaignId/artifacts",
    serviceGroup: "export",
    serviceOwner: "export-service",
  },
  {
    id: "admin.artifacts.list",
    method: "GET",
    operationId: "listAdminArtifacts",
    path: "/api/admin/campaigns/:campaignId/artifacts",
    serviceGroup: "export",
    serviceOwner: "export-service",
  },
  {
    id: "admin.artifacts.detail",
    method: "GET",
    operationId: "getAdminArtifact",
    path: "/api/admin/campaigns/:campaignId/artifacts/:artifactId",
    serviceGroup: "export",
    serviceOwner: "export-service",
  },
  {
    id: "admin.artifacts.download",
    method: "GET",
    operationId: "downloadAdminArtifact",
    path: "/api/admin/campaigns/:campaignId/artifacts/:artifactId/download",
    serviceGroup: "export",
    serviceOwner: "export-service",
  },
] as const;

describe("Admin API route catalog", () => {
  it("registers the nine OpenAPI operations once with service ownership and synchronized inventory", () => {
    expect(adminApiRuntimeRoutes).toHaveLength(9);
    expect(adminApiRuntimeRoutes).toEqual(
      expectedAdminRoutes.map((expected) => expect.objectContaining(expected)),
    );
    expect(Object.keys(adminApiRuntimeRouteById)).toHaveLength(9);
    expect(apiRuntimeRouteCatalog.slice(-9)).toEqual(adminApiRuntimeRoutes);

    const inventory = createAdminApiRuntimeRouteInventory();

    expect(inventory).toEqual({
      operationIds: expectedAdminRoutes.map((route) => route.operationId),
      readiness: { review_required: 9 },
      routeCount: 9,
      routeIds: expectedAdminRoutes.map((route) => route.id),
    });
    expect(validateAdminApiRouteCatalog()).toEqual({ issues: [], valid: true });
  });

  it("declares locally enforced operator auth with no anonymous Admin variant", () => {
    for (const route of adminApiRuntimeRoutes) {
      expect(route.auth).toEqual({
        allowedRoles: ["internal_operator", "review_operator"],
        anonymous: false,
        enforcementStatus: "local_enforced",
        membershipRequired: true,
        policyId: route.id,
        requestedRoleHeader: "x-campaign-os-roles",
        requestedRoleRequired: true,
        sessionRequired: true,
      });
      expect(getAdminOperatorRoutePolicy(route.id)).toMatchObject({
        allowedRoles: route.auth.allowedRoles,
        enforcementStatus: route.auth.enforcementStatus,
        membershipRequired: route.auth.membershipRequired,
        routeId: route.id,
        sessionRequired: route.auth.sessionRequired,
      });
    }
  });

  it("publishes bounded command body, idempotency, query, and download contracts", () => {
    expect(adminApiRuntimeRouteById["admin.reviews.decide"].request).toMatchObject({
      body: {
        contentType: "application/json",
        required: true,
        requiredFields: ["decision", "reasonCode", "snapshotFingerprint"],
      },
      headers: [
        {
          maxLength: 128,
          minLength: 8,
          name: "Idempotency-Key",
          required: true,
        },
      ],
      query: [],
    });
    expect(adminApiRuntimeRouteById["admin.artifacts.generate"].request).toMatchObject({
      body: {
        allowedFields: ["format", "expectedSourceFingerprint"],
        contentType: "application/json",
        fields: [
          { allowedValues: ["csv", "json"], name: "format", required: true },
          { maxLength: 64, minLength: 64, name: "expectedSourceFingerprint", required: false },
        ],
        required: true,
        requiredFields: ["format"],
      },
      query: [],
    });
    expect(adminApiRuntimeRouteById["admin.reviews.list"].request.query).toEqual(["limit", "state"]);
    expect(adminApiRuntimeRouteById["admin.artifacts.list"].request.query).toEqual(["limit", "format"]);
    expect(adminApiRuntimeRouteById["admin.artifacts.download"].request).toMatchObject({
      query: [],
      range: "forbidden",
    });
  });

  it("matches static, detail, and download routes without dynamic-route shadowing", () => {
    expect(resolveAdminApiRoute("GET", "/api/admin/campaigns/campaign-a/artifacts")).toMatchObject({
      matched: true,
      params: { campaignId: "campaign-a" },
      route: { id: "admin.artifacts.list" },
    });
    expect(resolveAdminApiRoute("POST", "/api/admin/campaigns/campaign-a/artifacts")).toMatchObject({
      matched: true,
      params: { campaignId: "campaign-a" },
      route: { id: "admin.artifacts.generate" },
    });
    expect(resolveAdminApiRoute("GET", "/api/admin/campaigns/campaign-a/artifacts/artifact-a")).toMatchObject({
      matched: true,
      params: { artifactId: "artifact-a", campaignId: "campaign-a" },
      route: { id: "admin.artifacts.detail" },
    });
    expect(
      resolveAdminApiRoute("GET", "/api/admin/campaigns/campaign-a/artifacts/artifact-a/download"),
    ).toMatchObject({
      matched: true,
      params: { artifactId: "artifact-a", campaignId: "campaign-a" },
      route: { id: "admin.artifacts.download" },
    });
  });

  it("accepts only bounded decoded single-segment path parameters", () => {
    const atLimit = "a".repeat(ADMIN_API_PATH_PARAMETER_MAX_LENGTH);

    expect(resolveAdminApiRoute("GET", `/api/admin/campaigns/${atLimit}/reviews`)).toMatchObject({
      matched: true,
      params: { campaignId: atLimit },
    });

    for (const requestTarget of [
      "/api/admin/campaigns/campaign%2Fa/reviews",
      "/api/admin/campaigns/campaign%2fa/reviews",
      "/api/admin/campaigns/./reviews",
      "/api/admin/campaigns/%2e/reviews",
      "/api/admin/campaigns/../reviews",
      "/api/admin/campaigns/%2E%2E/reviews",
      "/api/admin/campaigns/campaign%00a/reviews",
      "/api/admin/campaigns/campaign%1Fa/reviews",
      "/api/admin/campaigns/campaign%C2%85a/reviews",
      `/api/admin/campaigns/${"a".repeat(ADMIN_API_PATH_PARAMETER_MAX_LENGTH + 1)}/reviews`,
      "/api/admin/campaigns/campaign%/reviews",
      "/api/admin/campaigns//reviews",
    ]) {
      expect(resolveAdminApiRoute("GET", requestTarget)).toMatchObject({
        matched: false,
        reason: "malformed_path",
      });
    }
  });

  it("keeps method, query, and trailing-path behavior explicit", () => {
    expect(resolveAdminApiRoute("patch", "/api/admin/campaigns")).toEqual({
      allowedMethods: ["GET"],
      matched: false,
      reason: "method_not_allowed",
    });
    expect(resolveAdminApiRoute("GET", "/api/admin/campaigns?limit=25")).toMatchObject({
      matched: true,
      query: { limit: "25" },
      route: { id: "admin.campaigns.list" },
    });
    expect(
      resolveAdminApiRoute("GET", "/api/admin/campaigns/campaign-a/reviews?state=stale&limit=10"),
    ).toMatchObject({
      matched: true,
      query: { limit: "10", state: "stale" },
    });
    expect(
      resolveAdminApiRoute("GET", "/api/admin/campaigns/campaign-a/artifacts/artifact-a/download?format=csv"),
    ).toEqual({
      matched: false,
      queryParameter: "format",
      reason: "query_not_allowed",
    });
    expect(resolveAdminApiRoute("GET", "/api/admin/campaigns?limit=1&limit=2")).toEqual({
      matched: false,
      queryParameter: "limit",
      reason: "duplicate_query_parameter",
    });
    expect(resolveAdminApiRoute("GET", "/api/admin/campaigns/campaign-a/reviews/")).toMatchObject({
      matched: true,
      route: { id: "admin.reviews.list" },
    });
    expect(resolveAdminApiRoute("GET", "/api/admin/campaigns/campaign-a/reviews//")).toMatchObject({
      matched: false,
      reason: "malformed_path",
    });
    expect(resolveAdminApiRoute("GET", "/api/admin/campaigns/campaign-a/reviews/participant-a/extra")).toEqual({
      matched: false,
      reason: "route_not_found",
    });
  });

  it("rejects duplicate IDs, operations, method/path pairs, ambiguous matchers, and malformed definitions", () => {
    const base = adminApiRuntimeRoutes[0];
    const issuesFor = (...routes: AdminApiRuntimeRouteDefinition[]) =>
      validateAdminApiRouteCatalog(routes).issues.map((issue) => issue.code);

    expect(issuesFor(base, { ...base })).toContain("DUPLICATE_ROUTE_ID");
    expect(issuesFor(base, {
      ...base,
      id: "admin.synthetic.operation",
      path: "/api/admin/synthetic-operation",
    })).toContain("DUPLICATE_OPERATION_ID");
    expect(issuesFor(base, {
      ...base,
      id: "admin.synthetic.path",
      operationId: "syntheticDuplicatePath",
    })).toContain("DUPLICATE_METHOD_PATH");
    expect(issuesFor(
      adminApiRuntimeRoutes[2],
      {
        ...adminApiRuntimeRoutes[2],
        id: "admin.synthetic.ambiguous",
        operationId: "syntheticAmbiguousRoute",
        path: "/api/admin/campaigns/:otherCampaignId/reviews/:otherParticipantId",
      },
    )).toContain("AMBIGUOUS_ROUTE_MATCHER");
    expect(issuesFor({ ...base, path: "/api/admin//campaigns" })).toContain("MALFORMED_ROUTE_PATH");
    expect(issuesFor({ ...base, path: "/api/admin/campaigns?limit=1" })).toContain("MALFORMED_ROUTE_PATH");
    expect(issuesFor({ ...base, method: "PATCH" })).toContain("UNKNOWN_ROUTE_METHOD");
  });
});

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
    expect(apiRuntimeRouteById["campaigns.lifecycle"]).toMatchObject({
      apiSkillId: "get_campaign_lifecycle",
      method: "GET",
      path: "/api/campaigns/:campaignId/lifecycle",
      readiness: "local_only",
      serviceGroup: "campaign",
    });
    expect(apiRuntimeRouteById["campaigns.owner.list"]).toMatchObject({
      apiSkillId: "list_campaigns",
      method: "GET",
      path: "/api/projects/:projectId/campaigns",
      readiness: "local_only",
      serviceGroup: "campaign",
    });
    expect(apiRuntimeRouteById["campaigns.launch.readiness"]).toMatchObject({
      apiSkillId: "get_campaign_launch_readiness",
      method: "GET",
      path: "/api/campaigns/:campaignId/launch-readiness",
      readiness: "review_required",
      serviceGroup: "campaign",
    });
    expect(apiRuntimeRouteById["campaigns.owner.list"]).toMatchObject({
      method: "GET",
      path: "/api/projects/:projectId/campaigns",
      readiness: "local_only",
      serviceGroup: "campaign",
    });
    expect(apiRuntimeRouteById["campaigns.delivery.readiness"]).toMatchObject({
      method: "GET",
      path: "/api/campaigns/:campaignId/delivery-readiness",
      readiness: "review_required",
      serviceGroup: "campaign",
    });
    expect(apiRuntimeRouteById["campaigns.publish.delivery.review"]).toMatchObject({
      method: "GET",
      path: "/api/campaigns/:campaignId/publish-delivery-review",
      readiness: "review_required",
      serviceGroup: "campaign",
    });
    expect(apiRuntimeRouteById["campaigns.points.ranking.ledger.runtime"]).toMatchObject({
      method: "GET",
      path: "/api/campaigns/:campaignId/points-ranking-ledger-runtime",
      readiness: "review_required",
      serviceGroup: "campaign",
    });
    expect(apiRuntimeRouteById["campaigns.companion.contract.readiness"]).toMatchObject({
      method: "GET",
      path: "/api/campaigns/:campaignId/companion-contract-readiness",
      readiness: "review_required",
      serviceGroup: "campaign",
    });
    expect(apiRuntimeRouteById["campaigns.contract.transparency"]).toMatchObject({
      method: "GET",
      path: "/api/campaigns/:campaignId/contract-transparency",
      readiness: "review_required",
      serviceGroup: "campaign",
    });
    expect(apiRuntimeRouteById["campaigns.provider.readiness"]).toMatchObject({
      apiSkillId: "get_campaign_provider_readiness",
      method: "GET",
      path: "/api/campaigns/:campaignId/provider-readiness",
      readiness: "review_required",
      serviceGroup: "verification",
    });
    expect(apiRuntimeRouteById["tasks.verify"]).toMatchObject({
      apiSkillId: "verify_task",
      method: "POST",
      path: "/api/tasks/:taskId/verify",
      productionDependencies: expect.arrayContaining([
        "auth_session",
        "migration_runner",
        "production_database",
        "provider_adapters",
        "sensitive_material_boundary",
      ]),
      readiness: "blocked",
      serviceGroup: "verification",
      supportMode: "provider_live",
    });
    expect(apiRuntimeRouteById["tasks.verify"].summary["en-US"]).toContain(
      "PostgreSQL schema 0004",
    );
    expect(apiRuntimeRouteById["tasks.verify"].boundary["en-US"]).toContain(
      "production disabled",
    );
    expect(apiRuntimeRouteById["campaigns.export.readiness"]).toMatchObject({
      apiSkillId: "get_campaign_export_readiness",
      method: "GET",
      path: "/api/campaigns/:campaignId/export-readiness",
      readiness: "review_required",
      serviceGroup: "export",
    });
    expect(apiRuntimeRouteById["campaigns.export.artifacts.list"]).toMatchObject({
      apiGroup: "export",
      method: "GET",
      path: "/api/campaigns/:campaignId/export-artifacts",
      readiness: "review_required",
      serviceGroup: "export",
    });
    expect(apiRuntimeRouteById["campaigns.export.artifacts.detail"]).toMatchObject({
      apiGroup: "export",
      method: "GET",
      path: "/api/campaigns/:campaignId/export-artifacts/:artifactId",
      readiness: "review_required",
      serviceGroup: "export",
    });
    expect(apiRuntimeRouteById["campaigns.export.artifacts.file"]).toMatchObject({
      apiGroup: "export",
      method: "GET",
      path: "/api/campaigns/:campaignId/export-artifacts/:artifactId/file",
      readiness: "review_required",
      serviceGroup: "export",
      supportMode: "local_seeded",
    });

    for (const runtimeRoute of apiRuntimeRoutes) {
      expect(runtimeRoute.id.trim()).not.toHaveLength(0);
      expect(runtimeRoute.path).toMatch(/^\/api\//);
      expect(["GET", "POST"]).toContain(runtimeRoute.method);
      expect(["ready", "local_only", "review_required", "blocked"]).toContain(runtimeRoute.readiness);
      expect(["low", "medium", "high"]).toContain(runtimeRoute.riskLevel);
      expect(runtimeRoute.summary["en-US"]).not.toHaveLength(0);
      expect(runtimeRoute.summary["zh-CN"]).not.toHaveLength(0);
      if (runtimeRoute.id === "tasks.verify") {
        expect(runtimeRoute.boundary["en-US"]).toContain("provider-live");
      } else {
        expect(runtimeRoute.boundary["en-US"]).toContain("No live API");
      }
      expect(apiRuntimeServiceGroupById[runtimeRoute.serviceGroup]).toBeDefined();
      if (runtimeRoute.id === "tasks.verify") {
        expect(runtimeRoute.productionDependencies).toEqual(expect.arrayContaining([
          ...apiRuntimeServiceGroupById[runtimeRoute.serviceGroup].deferredDependencies,
          "auth_session",
          "migration_runner",
          "production_database",
          "sensitive_material_boundary",
        ]));
        expect(runtimeRoute.supportMode).toBe("provider_live");
      } else {
        expect(runtimeRoute.productionDependencies).toEqual(
          apiRuntimeServiceGroupById[runtimeRoute.serviceGroup].deferredDependencies,
        );
        expect(runtimeRoute.supportMode).toBe("local_seeded");
      }
    }
  });

  it("defines public, Owner, and Participant Campaign route contracts with auth coverage", () => {
    const contractRouteIds = apiRuntimeContractRoutes.map((route) => route.id);

    expect(new Set(contractRouteIds).size).toBe(apiRuntimeContractRoutes.length);
    expect(apiRuntimeRouteById["campaigns.list"]).toMatchObject({
      method: "GET",
      path: "/api/campaigns",
      serviceGroup: "campaign",
    });
    expect(apiRuntimeRouteById["campaigns.detail"]).toMatchObject({
      method: "GET",
      path: "/api/campaigns/:campaignId",
      serviceGroup: "campaign",
    });

    expect(participantCampaignRouteContracts.map((route) => route.id)).toEqual([
      "campaigns.owner.detail",
      "campaigns.participant.list",
      "campaigns.participant.journey",
    ]);
    expect(contractRouteIds).toEqual(expect.arrayContaining([
      "campaigns.list",
      "campaigns.detail",
      "campaigns.owner.detail",
      "campaigns.participant.list",
      "campaigns.participant.journey",
    ]));
    expect(apiRuntimeRouteById["campaigns.owner.detail"]).toMatchObject({
      method: "GET",
      path: "/api/owner/campaigns/:campaignId",
      readiness: "blocked",
      serviceGroup: "campaign",
    });
    expect(apiRuntimeRouteById["campaigns.participant.list"]).toMatchObject({
      method: "GET",
      path: "/api/participant/campaigns",
      readiness: "blocked",
      serviceGroup: "campaign",
    });
    expect(apiRuntimeRouteById["campaigns.participant.journey"]).toMatchObject({
      method: "GET",
      path: "/api/participant/campaigns/:campaignId/journey",
      readiness: "blocked",
      serviceGroup: "campaign",
    });

    for (const routeId of [
      "campaigns.owner.detail",
      "campaigns.participant.list",
      "campaigns.participant.journey",
    ]) {
      expect(getProtectedRouteAuth(routeId)).toMatchObject({
        enforcementStatus: "local_enforced",
        proofRequired: true,
        sessionRequired: true,
      });
    }

    for (const routeId of [
      "tasks.verify",
      "campaigns.eligibility",
      "campaigns.points.ranking.ledger.runtime",
    ]) {
      expect(apiRuntimeRoutes.some((route) => route.id === routeId)).toBe(true);
      expect(getProtectedRouteAuth(routeId)).toMatchObject({
        enforcementStatus: "local_enforced",
        requiredRoles: ["participant"],
      });
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
      knownRouteIds: apiRuntimeContractRoutes.map((runtimeRoute) => runtimeRoute.id),
    });

    expect(report.coverage.unassignedRouteIds).toEqual([]);
    expect(report.validation.valid).toBe(true);

    for (const runtimeRoute of apiRuntimeContractRoutes) {
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
        "get_campaign_export_readiness",
        "get_campaign_launch_readiness",
        "get_campaign_lifecycle",
        "get_campaign_provider_readiness",
        "list_campaigns",
        "summarize_campaign",
        "verify_task",
      ] satisfies ApiSkillId[]),
    );
    expect(coverage.coveredSkillIds).toEqual(requiredApiSkillIds);
    expect(coverage.deferredSkillIds).toEqual([]);
    expect(createProductionBackendRouteCoverage(apiRuntimeRoutes, coverage)).toMatchObject({
      missingApiSkillIds: [],
      requiredApiSkillCount: requiredApiSkillIds.length,
      routeCount: apiRuntimeRoutes.length,
      routeIds: expect.arrayContaining(["runtime.health", "runtime.contracts"]),
      runtimeRouteCount: apiRuntimeRoutes.filter((runtimeRoute) => runtimeRoute.serviceGroup === "runtime").length,
    });
    expect(coverage.routeIds).toEqual(
      expect.arrayContaining([
        "agent.wallet.action.review",
        "campaigns.export.artifacts.detail",
        "campaigns.export.artifacts.file",
        "campaigns.export.artifacts.list",
        "campaigns.owner.list",
        "campaigns.delivery.readiness",
        "campaigns.publish.delivery.review",
        "campaigns.points.ranking.ledger.runtime",
        "campaigns.companion.contract.readiness",
        "campaigns.contract.transparency",
        "campaigns.export.readiness",
        "campaigns.lifecycle",
        "campaigns.launch.readiness",
        "campaigns.owner.list",
        "campaigns.posts.generate",
        "campaigns.provider.readiness",
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
      implementedLocalCount: 12,
      notYetImplementedCount: 0,
      productionShapedDeferredCount: 2,
      routeCount: apiRuntimeContractRoutes.length,
      validationIssueCount: 0,
    });
    expect(foundationRouteIds).toEqual(apiRuntimeContractRoutes.map((route) => route.id));
    expect(new Set(servicePortRouteIds).size).toBe(apiRuntimeContractRoutes.length);
    expect(servicePortRouteIds.sort()).toEqual(foundationRouteIds.sort());

    for (const route of foundation.routes) {
      expect(route.responseEnvelopeId).toBe("api.response.success.v1");
      expect(route.errorEnvelopeId).toBe("api.response.error.v1");
      expect(route.serviceId).not.toHaveLength(0);
      expect(route.supportMode).toBe(
        route.routeId === "tasks.verify" ? "provider_live" : "local_seeded",
      );
    }

    for (const port of servicePorts.ports) {
      expect(port.requiresExternalNetwork).toBe(false);
      expect(port.requiresSecret).toBe(false);
      expect(port.productionAdapterStatus).not.toBe("enabled");
    }
  });
});
