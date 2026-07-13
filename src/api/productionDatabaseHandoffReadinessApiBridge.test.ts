import { describe, expect, it, vi } from "vitest";
import {
  buildProductionDatabaseHandoffReadinessApiUrl,
  createProductionDatabaseHandoffReadinessApiSeededFallbackState,
  loadProductionDatabaseHandoffReadinessApiState,
  sanitizeProductionDatabaseHandoffReadinessApiText,
  type ProductionDatabaseHandoffReadinessApiFetch,
} from "./productionDatabaseHandoffReadinessApiBridge";
import {
  createProductionDatabaseHandoffReadiness,
  productionDatabaseNoLiveFlags,
  type ProductionDatabaseHandoffReadiness,
  type ProductionDatabaseRequiredReferenceArea,
} from "../domain/productionDatabaseHandoffReadiness";

const requiredProductionDatabaseKeys = [
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
] as const;

const referenceAreaByKey: Record<typeof requiredProductionDatabaseKeys[number], ProductionDatabaseRequiredReferenceArea> = {
  CAMPAIGN_OS_DATABASE_LIVE_ENABLEMENT: "activation",
  CAMPAIGN_OS_DATABASE_MIGRATION_APPROVAL: "migration",
  CAMPAIGN_OS_DATABASE_OBSERVABILITY_REF: "observability",
  CAMPAIGN_OS_DATABASE_PACKAGE: "package",
  CAMPAIGN_OS_DATABASE_PACKAGE_BINDING: "binding",
  CAMPAIGN_OS_DATABASE_POOL_POLICY: "pooling",
  CAMPAIGN_OS_DATABASE_PROVIDER: "provider",
  CAMPAIGN_OS_DATABASE_ROLLBACK_BACKUP_PLAN: "rollback",
  CAMPAIGN_OS_DATABASE_RUNBOOK_URL: "runbook",
  CAMPAIGN_OS_DATABASE_SECRET_REF: "secrets",
  CAMPAIGN_OS_DATABASE_URL: "connection",
};

const response = (
  body: unknown,
  options: { ok?: boolean; status?: number; traceId?: string } = {},
): Response => ({
  headers: new Headers(options.traceId ? { "x-campaign-os-trace-id": options.traceId } : {}),
  json: vi.fn(async () => body),
  ok: options.ok ?? true,
  status: options.status ?? 200,
} as unknown as Response);

const runtimeMetadata = {
  mode: "local_seeded",
  name: "campaign-os-api-runtime",
  routeCount: 42,
  version: "0.2.0-local",
};

const validHandoffPayload = (
  overrides: Partial<ProductionDatabaseHandoffReadiness> = {},
): ProductionDatabaseHandoffReadiness => ({
  ...createProductionDatabaseHandoffReadiness({
    migrationGate: {
      approvalStatus: "missing",
      blockedMigrationIds: ["production-db-schema-cutover"],
      id: "production-database-migration-gate",
      liveExecutionEnabled: false,
      pendingMigrationIds: ["production-db-schema-cutover"],
      rollbackPlanStatus: "missing",
      rollbackReady: false,
      status: "blocked",
    },
    packageBinding: {
      bindingId: "campaign-os-postgresql-package-binding-local",
      blockerCount: 7,
      driverId: "campaign-os-node-postgres-driver-deferred",
      importPosture: "metadata_only_no_import",
      mode: "production_required",
      packageName: "pg",
      packageRef: "npm:pg",
      providerId: "campaign-os-postgresql-provider-deferred",
      providerKind: "managed-postgresql-compatible",
      status: "blocked",
    },
    requiredReferences: requiredProductionDatabaseKeys.map((key) => ({
      area: referenceAreaByKey[key],
      id: key.toLowerCase().replace(/_/g, "-"),
      key,
      message: `${key} is required before production activation.`,
      redacted: true,
      requiredBeforeProduction: true,
      status: "blocked",
    })),
    safety: productionDatabaseNoLiveFlags,
    source: "server_runtime",
    storeCoverage: [
      {
        coverageStatus: "mapped",
        label: "Campaign DB",
        migrationRequired: true,
        ownerServiceId: "campaign-service",
        schemaVersion: "v1",
        storeId: "campaign-db",
      },
    ],
    traceId: "trace-production-db-payload",
  }),
  ...overrides,
});

const envelope = (payload: unknown, traceId = "trace-production-db-envelope") => ({
  data: {
    boundary: {
      "en-US": "Local production database handoff review only. No live API.",
      "zh-CN": "仅本地 production database handoff review。",
      "zh-TW": "Local production database handoff review only. No live API.",
    },
    payload,
  },
  ok: true,
  runtime: runtimeMetadata,
  safety: {
    localOnly: true,
    noContractWrite: true,
    noLiveApi: true,
    noRewardCustody: true,
    noRewardDistribution: true,
  },
  timestamp: "2026-07-11T00:00:00.000Z",
  traceId,
});

describe("production database handoff readiness API bridge", () => {
  it("returns seeded fallback when the API base URL is missing", async () => {
    const fetchImpl = vi.fn() as unknown as ProductionDatabaseHandoffReadinessApiFetch;

    const state = await loadProductionDatabaseHandoffReadinessApiState({
      config: { baseUrl: "   " },
      fetchImpl,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(state).toMatchObject({
      configured: false,
      diagnostics: [{ code: "API_BASE_URL_MISSING", severity: "info" }],
      source: "seeded_fallback",
    });
    expect(state.handoff.localMvpReady).toBe(true);
    expect(state.handoff.productionReady).toBe(false);
    expect(Object.values(state.handoff.safety).every((value) => value === false)).toBe(true);
  });

  it("loads handoff payload from a configured API with trace id and route count", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(
      envelope(validHandoffPayload(), "trace-envelope"),
      { traceId: "trace-header" },
    )) as unknown as ProductionDatabaseHandoffReadinessApiFetch;

    const state = await loadProductionDatabaseHandoffReadinessApiState({
      config: {
        baseUrl: "http://127.0.0.1:5174/",
        headers: { "x-campaign-os-roles": "operator" },
        tracePrefix: "production-db",
      },
      fetchImpl,
    });

    expect(state).toMatchObject({
      configured: true,
      diagnostics: [],
      handoff: expect.objectContaining({
        id: "campaign-os-production-database-handoff-readiness",
        localMvpReady: true,
        productionReady: false,
        source: "server_runtime",
        status: "blocked",
      }),
      routeCount: 42,
      source: "api_runtime",
      traceId: "trace-envelope",
    });
    expect(state.handoff.requiredReferences.map((reference) => reference.key)).toEqual(
      expect.arrayContaining([...requiredProductionDatabaseKeys]),
    );
    expect(state.handoff.migrationGate.liveExecutionEnabled).toBe(false);
    expect(Object.values(state.handoff.safety).every((value) => value === false)).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:5174/api/backend/production-database/handoff-readiness",
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: "application/json",
          "x-campaign-os-roles": "operator",
          "x-campaign-os-trace-id": expect.stringMatching(/^production-db-production-database-handoff-readiness-/),
        }),
        method: "GET",
      }),
    );
  });

  it("builds the request URL without leaking query strings", () => {
    expect(
      buildProductionDatabaseHandoffReadinessApiUrl(
        new URL("http://127.0.0.1:5174/base/?token=unsafe#frag"),
      ),
    ).toBe("http://127.0.0.1:5174/base/api/backend/production-database/handoff-readiness");
  });

  it("returns sanitized seeded fallback when the request fails", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error(
        "Request failed with postgres://user:pass@db.invalid/app, bearer token sample, stack trace, /private/production-db/secret.md",
      );
    }) as unknown as ProductionDatabaseHandoffReadinessApiFetch;

    const state = await loadProductionDatabaseHandoffReadinessApiState({
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
      configured: true,
      diagnostics: [{ code: "API_REQUEST_FAILED", severity: "error" }],
      source: "seeded_fallback",
    });
    for (const unsafe of ["postgres://", "user:pass", "bearer token", "sample", "stack trace", "/private/production-db"]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("returns seeded fallback for malformed envelopes", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response({
      data: { payload: validHandoffPayload() },
      runtime: runtimeMetadata,
      traceId: "trace-malformed",
    })) as unknown as ProductionDatabaseHandoffReadinessApiFetch;

    const state = await loadProductionDatabaseHandoffReadinessApiState({
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });

    expect(state).toMatchObject({
      diagnostics: [{ code: "API_RESPONSE_MALFORMED", severity: "error" }],
      source: "seeded_fallback",
      traceId: "trace-malformed",
    });
  });

  it("rejects payloads where no-live flags are enabled", async () => {
    const invalidPayload = validHandoffPayload({
      safety: {
        ...productionDatabaseNoLiveFlags,
        liveQueryExecutionEnabled: true as false,
      },
    });
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(
      envelope(invalidPayload, "trace-live-flag-invalid"),
    )) as unknown as ProductionDatabaseHandoffReadinessApiFetch;

    const state = await loadProductionDatabaseHandoffReadinessApiState({
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });

    expect(state).toMatchObject({
      diagnostics: [{ code: "API_PAYLOAD_INVALID", severity: "error" }],
      source: "seeded_fallback",
      traceId: "trace-live-flag-invalid",
    });
  });

  it("sanitizes standalone diagnostic text", () => {
    const sanitized = sanitizeProductionDatabaseHandoffReadinessApiText(
      "postgres://user:pass@db.invalid/app token=abc123 privateKey signedUrl objectKey /Users/aelf/workspace/campaign-os-kitty/secret.md",
    ).toLowerCase();

    for (const unsafe of [
      "postgres://",
      "token=abc123",
      "privatekey",
      "signedurl",
      "objectkey",
      "campaign-os-kitty",
    ]) {
      expect(sanitized).not.toContain(unsafe);
    }
  });

  it("creates an explicit seeded fallback state for disabled Project Console reviews", () => {
    const state = createProductionDatabaseHandoffReadinessApiSeededFallbackState("trace-seeded");

    expect(state).toMatchObject({
      configured: false,
      source: "seeded_fallback",
      traceId: "trace-seeded",
    });
    expect(state.handoff.requiredReferences.map((reference) => reference.key)).toEqual(
      expect.arrayContaining([...requiredProductionDatabaseKeys]),
    );
    expect(state.handoff.storeCoverage.length).toBeGreaterThan(0);
  });
});
