import { describe, expect, it } from "vitest";
import { requiredApiSkillIds } from "../domain/apiSkillContracts";
import {
  createProductionBackendReadinessSummary,
  createProductionBackendRouteCoverage,
  noLiveSideEffectBoundary,
  productionBackendReadinessRequiredConfigKeys,
  type ProductionDependencyBlockerSummary,
} from "./productionBackendReadiness";
import { apiRuntimeContractRoutes, createApiRuntimeContractCoverage } from "./routes";

const secretFragments = [
  "bearer sample-token",
  "contract-secret",
  "db-password",
  "postgres://real-user",
  "provider-secret",
  "queue-secret",
  "raw-signature-sample",
  "seed phrase sample",
  "super-secret",
];

const expectNoSecretLeak = (value: unknown) => {
  const serialized = JSON.stringify(value).toLowerCase();

  for (const fragment of secretFragments) {
    expect(serialized).not.toContain(fragment);
  }
};

describe("production backend readiness summary", () => {
  it("summarizes local-review runtime readiness without live side effects", () => {
    const summary = createProductionBackendReadinessSummary({
      env: {},
      generatedAt: "2026-07-09T18:53:49.000Z",
    });

    expect(summary).toMatchObject({
      id: "production-backend-runtime-readiness",
      generatedAt: "2026-07-09T18:53:49.000Z",
      productionReady: false,
      status: "ready",
      profile: {
        id: "local-review",
        requiresSecrets: false,
        secretValuesExposed: false,
        status: "ready",
        supportMode: "local_seeded",
      },
    });
    expect(summary.profile.requiredConfigKeys).toEqual([]);
    expect(summary.profile.missingRequiredConfigKeys).toEqual([]);
    expect(summary.noLiveSideEffects).toEqual(noLiveSideEffectBoundary);
    expect(Object.values(summary.noLiveSideEffects)).toEqual(
      Array(Object.keys(summary.noLiveSideEffects).length).fill(false),
    );
    expect(summary.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "PRODUCTION_BACKEND_NO_LIVE_SIDE_EFFECTS",
    );
    expect(summary.routeCoverage).toMatchObject({
      routeCount: apiRuntimeContractRoutes.length,
      routeIds: apiRuntimeContractRoutes.map((route) => route.id),
    });
  });

  it("distinguishes staging-scaffold as review-safe scaffold mode", () => {
    const summary = createProductionBackendReadinessSummary({
      env: {
        CAMPAIGN_OS_BACKEND_PROFILE: "staging-scaffold",
      },
      generatedAt: "2026-07-09T18:53:49.000Z",
    });

    expect(summary.status).toBe("scaffold");
    expect(summary.profile).toMatchObject({
      externalNetworkAllowed: false,
      id: "staging-scaffold",
      requiresSecrets: false,
      secretValuesExposed: false,
      status: "scaffold",
    });
    expect(summary.profile.requiredConfigKeys).toEqual([]);
    expect(summary.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "PRODUCTION_BACKEND_STAGING_SCAFFOLD",
    );
  });

  it("fails closed for production-required and reports required config key names only", () => {
    const env = {
      AUTHORIZATION: "Bearer sample-token",
      CAMPAIGN_OS_AUTH_SECRET: "super-secret",
      CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
      CAMPAIGN_OS_DATABASE_URL: "postgres://real-user:db-password@db.invalid/campaign-os",
      CAMPAIGN_OS_PROVIDER_REGISTRY_URL: "https://provider.invalid?token=provider-secret",
      CAMPAIGN_OS_WORKER_QUEUE_URL: "https://queue.invalid?token=queue-secret",
      CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT: "https://contract.invalid?token=contract-secret",
      CAMPAIGN_OS_RAW_SIGNATURE: "raw-signature-sample",
      CAMPAIGN_OS_SEED_PHRASE: "seed phrase sample",
    };
    const summary = createProductionBackendReadinessSummary({
      env,
      generatedAt: "2026-07-09T18:53:49.000Z",
    });

    expect(summary.status).toBe("blocked");
    expect(summary.profile).toMatchObject({
      externalNetworkAllowed: true,
      id: "production-required",
      requiresSecrets: true,
      secretValuesExposed: false,
      status: "blocked",
    });
    expect(summary.profile.requiredConfigKeys).toEqual(productionBackendReadinessRequiredConfigKeys);
    expect(summary.profile.configuredRequiredConfigKeys).toEqual(productionBackendReadinessRequiredConfigKeys);
    expect(summary.profile.missingRequiredConfigKeys).toEqual([]);
    expect(summary.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "PRODUCTION_BACKEND_PROFILE_BLOCKED",
    );
    expect(summary.productionReady).toBe(false);
    expect(summary.noLiveSideEffects).toEqual(noLiveSideEffectBoundary);
    expectNoSecretLeak(summary);
  });

  it("reports missing production-required config keys without values", () => {
    const summary = createProductionBackendReadinessSummary({
      env: {
        CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
        CAMPAIGN_OS_DATABASE_URL: "postgres://real-user:db-password@db.invalid/campaign-os",
      },
      generatedAt: "2026-07-09T18:53:49.000Z",
    });

    expect(summary.status).toBe("blocked");
    expect(summary.profile.configuredRequiredConfigKeys).toEqual(["CAMPAIGN_OS_DATABASE_URL"]);
    expect(summary.profile.missingRequiredConfigKeys).toEqual([
      "CAMPAIGN_OS_AUTH_SECRET",
      "CAMPAIGN_OS_PROVIDER_REGISTRY_URL",
      "CAMPAIGN_OS_WORKER_QUEUE_URL",
      "CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT",
    ]);
    expect(summary.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PRODUCTION_BACKEND_MISSING_CONFIG",
          safeDetails: {
            missingRequiredConfigKeys:
              "CAMPAIGN_OS_AUTH_SECRET, CAMPAIGN_OS_PROVIDER_REGISTRY_URL, CAMPAIGN_OS_WORKER_QUEUE_URL, CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT",
          },
        }),
      ]),
    );
    expectNoSecretLeak(summary);
  });

  it("derives route coverage and required API skill parity from route contracts", () => {
    const coverage = createProductionBackendRouteCoverage(
      apiRuntimeContractRoutes,
      createApiRuntimeContractCoverage(),
    );

    expect(coverage.routeCount).toBe(apiRuntimeContractRoutes.length);
    expect(coverage.routeIds).toEqual(apiRuntimeContractRoutes.map((runtimeRoute) => runtimeRoute.id));
    expect(coverage.runtimeRouteCount).toBe(
      apiRuntimeContractRoutes.filter((runtimeRoute) => runtimeRoute.serviceGroup === "runtime").length,
    );
    expect(coverage.requiredApiSkillCount).toBe(requiredApiSkillIds.length);
    expect(coverage.coveredApiSkillCount).toBe(requiredApiSkillIds.length);
    expect(coverage.missingApiSkillIds).toEqual([]);
    expect(coverage.readyCount + coverage.localOnlyCount + coverage.reviewRequiredCount + coverage.blockedCount).toBe(
      apiRuntimeContractRoutes.length,
    );
  });

  it("publishes deploy handoff and trace policy exactly", () => {
    const summary = createProductionBackendReadinessSummary({
      generatedAt: "2026-07-09T18:53:49.000Z",
    });

    expect(summary.deployHandoff).toMatchObject({
      contractsEndpoint: "/api/contracts",
      healthEndpoint: "/api/health",
      runtimeTarget: "api_service",
      smokeCommand: "npm run server:smoke",
      startCommand: "npm run server:start",
      traceHeaderName: "x-campaign-os-trace-id",
    });
    expect(summary.deployHandoff.shutdownTimeoutMs).toBeGreaterThan(0);
    expect(summary.tracePolicy).toEqual({
      failureEnvelopeTraceId: true,
      startupLogIncludesTracePolicy: true,
      successEnvelopeTraceId: true,
      traceHeaderName: "x-campaign-os-trace-id",
    });
  });

  it("summarizes required production dependency blockers across backend areas", () => {
    const summary = createProductionBackendReadinessSummary({
      generatedAt: "2026-07-09T18:53:49.000Z",
    });
    const areas = new Set(summary.productionDependencyBlockers.map((blocker) => blocker.area));

    expect(summary.productionDependencyBlockers.length).toBeGreaterThan(10);
    const expectedAreas: ProductionDependencyBlockerSummary["area"][] = [
      "analytics",
      "auth",
      "contract",
      "database",
      "deployment",
      "provider",
      "queue",
      "reward",
      "scheduler",
      "storage",
    ];

    for (const expectedArea of expectedAreas) {
      expect(areas.has(expectedArea)).toBe(true);
    }
    expect(summary.productionDependencyBlockers.every((blocker) => blocker.requiredBeforeProduction)).toBe(true);
    expect(summary.productionDependencyBlockers.every((blocker) => blocker.attachPoint.startsWith("src/server/")
      || blocker.attachPoint === "deployment/runtime-config")).toBe(true);
  });

  it("constructs readiness deterministically and quickly without live calls", () => {
    const startedAt = performance.now();
    const first = createProductionBackendReadinessSummary({
      generatedAt: "2026-07-09T18:53:49.000Z",
    });
    const second = createProductionBackendReadinessSummary({
      generatedAt: "2026-07-09T18:53:49.000Z",
    });
    const elapsedMs = performance.now() - startedAt;

    expect(first).toEqual(second);
    expect(elapsedMs).toBeLessThan(500);
  });
});
