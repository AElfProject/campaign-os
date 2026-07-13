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

  it("sanitizes JSON-hostile primitives with deterministic non-empty markers", () => {
    const cases: Array<[unknown, string]> = [
      ["plain diagnostic", "plain diagnostic"],
      [42, "42"],
      [true, "true"],
      [false, "false"],
      [null, "null"],
      [undefined, "[undefined]"],
      [Symbol("token=do-not-render"), "[symbol]"],
      [123n, "[bigint]"],
      [() => "private", "[function]"],
    ];

    for (const [input, expected] of cases) {
      expect(() => sanitizeProductionDatabaseHandoffReadinessApiText(input)).not.toThrow();
      expect(sanitizeProductionDatabaseHandoffReadinessApiText(input)).toBe(expected);
    }

    expect(sanitizeProductionDatabaseHandoffReadinessApiText("[REDACTED:CREDENTIAL]"))
      .toBe("[REDACTED:CREDENTIAL]");

    expect(sanitizeProductionDatabaseHandoffReadinessApiText({
      zeta: Symbol("nested-secret"),
      alpha: 99n,
      nested: [true, null],
    })).toBe('{"alpha":"[bigint]","nested":[true,null],"zeta":"[symbol]"}');
  });

  it("projects Error values without stack or secret-bearing custom fields", () => {
    const cause = new Error("provider unavailable");
    const failure = new Error("database connection failed") as Error & Record<string, unknown>;

    Object.defineProperty(failure, "cause", { configurable: true, value: cause });
    failure.retryable = true;
    failure.password = "raw-password-value";
    failure.stack = "Error: database connection failed\n at privateCall (/Users/aelf/private/runtime.ts:1:1)";

    const sanitized = sanitizeProductionDatabaseHandoffReadinessApiText(failure);

    expect(sanitized).toContain('"name":"Error"');
    expect(sanitized).toContain('"message":"database connection failed"');
    expect(sanitized).toContain('"cause"');
    expect(sanitized).toContain('"retryable":true');
    expect(sanitized).toContain("[REDACTED:CREDENTIAL]");
    expect(sanitized).not.toContain("raw-password-value");
    expect(sanitized).not.toContain("privateCall");
    expect(sanitized).not.toContain("/Users/");

    const driverFailure = sanitizeProductionDatabaseHandoffReadinessApiText(
      new Error("driver failed host=db.internal user=runtime-user SELECT secret_value FROM private_table"),
    );

    expect(driverFailure).toContain("[REDACTED:DATABASE_METADATA]");
    expect(driverFailure).toContain("[REDACTED:QUERY]");
    expect(driverFailure).not.toContain("db.internal");
    expect(driverFailure).not.toContain("runtime-user");
    expect(driverFailure).not.toContain("secret_value");
    expect(driverFailure).not.toContain("private_table");
  });

  it("redacts delimiter variants, bind values, private artifact paths, and CTE SQL", () => {
    const sentinels = {
      bind: "bind-sentinel-wp04-cycle2",
      credential: "credential-sentinel-wp04-cycle2",
      host: "host-sentinel-wp04-cycle2",
      password: "password-sentinel-wp04-cycle2",
      path: "path-sentinel-wp04-cycle2",
      privateKey: "private-key-sentinel-wp04-cycle2",
      query: "query-sentinel-wp04-cycle2",
      secret: "secret-sentinel-wp04-cycle2",
      seedPhrase: "seed-phrase-sentinel-wp04-cycle2",
      sql: "sql-sentinel-wp04-cycle2",
      user: "user-sentinel-wp04-cycle2",
    };
    const failure = new Error([
      `password: ${sentinels.password}`,
      `credential=${sentinels.credential}`,
      `secret: '${sentinels.secret}'`,
      `"host": "${sentinels.host}"`,
      `'user': '${sentinels.user}'`,
      `/home/runner/campaign-os-kitty/evidence/${sentinels.path}.log`,
      `WITH private_rows AS (SELECT '${sentinels.sql}' AS secret_value) SELECT * FROM private_rows`,
    ].join(" | ")) as Error & Record<string, unknown>;
    failure.queryValues = [sentinels.query];
    failure.bindParameters = { first: sentinels.bind };

    const sanitized = sanitizeProductionDatabaseHandoffReadinessApiText(failure);

    expect(sanitized).toContain("[REDACTED:CREDENTIAL]");
    expect(sanitized).toContain("[REDACTED:DATABASE_METADATA]");
    expect(sanitized).toContain("[REDACTED:PRIVATE_PATH]");
    expect(sanitized).toContain("[REDACTED:QUERY]");
    for (const sentinel of Object.values(sentinels).filter(
      (value) => ![sentinels.privateKey, sentinels.seedPhrase].includes(value),
    )) {
      expect(sanitized).not.toContain(sentinel);
    }

    const domainCredentialVariants = [
      [`private key = "${sentinels.privateKey}"`, sentinels.privateKey],
      [`seed_phrase: ${sentinels.seedPhrase}`, sentinels.seedPhrase],
    ] as const;
    for (const [input, sentinel] of domainCredentialVariants) {
      expect(sanitizeProductionDatabaseHandoffReadinessApiText(input)).not.toContain(sentinel);
    }
  });

  it("keeps adversarial database failures sanitized through the fetch fallback", async () => {
    const sentinels = [
      "fallback-password-sentinel",
      "fallback-host-sentinel",
      "fallback-user-sentinel",
      "fallback-query-sentinel",
      "fallback-bind-sentinel",
      "fallback-path-sentinel",
      "fallback-sql-sentinel",
    ];
    const failure = new Error([
      `password: ${sentinels[0]}`,
      `"host": "${sentinels[1]}"`,
      `'user': '${sentinels[2]}'`,
      `/home/runner/campaign-os-kitty/evidence/${sentinels[5]}.log`,
      `WITH private_rows AS (SELECT '${sentinels[6]}' AS secret_value) SELECT * FROM private_rows`,
    ].join(" | ")) as Error & Record<string, unknown>;
    failure.queryValues = [sentinels[3]];
    failure.bindParameters = { first: sentinels[4] };
    const fetchImpl = vi.fn().mockResolvedValueOnce(response({
      error: failure,
      ok: false,
      traceId: "trace-adversarial-database-fallback",
    }, {
      ok: false,
      status: 502,
      traceId: "trace-adversarial-header",
    })) as unknown as ProductionDatabaseHandoffReadinessApiFetch;

    const state = await loadProductionDatabaseHandoffReadinessApiState({
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });
    const serialized = JSON.stringify(state);

    expect(state).toMatchObject({
      diagnostics: [{
        code: "API_REQUEST_FAILED",
        safeDetails: { status: 502 },
        severity: "error",
      }],
      source: "seeded_fallback",
      traceId: "trace-adversarial-database-fallback",
    });
    for (const sentinel of sentinels) {
      expect(serialized).not.toContain(sentinel);
    }
  });

  it("bounds cyclic, deeply nested, and oversized collections deterministically", () => {
    const selfCycle: Record<string, unknown> = { id: "self" };
    selfCycle.self = selfCycle;
    const mutualLeft: Record<string, unknown> = { id: "left" };
    const mutualRight: Record<string, unknown> = { id: "right", left: mutualLeft };
    mutualLeft.right = mutualRight;
    const deepRoot: Record<string, unknown> = {};
    let cursor = deepRoot;

    for (let index = 0; index < 20; index += 1) {
      const next: Record<string, unknown> = { index };
      cursor.next = next;
      cursor = next;
    }

    const values = [
      selfCycle,
      mutualLeft,
      deepRoot,
      Array.from({ length: 200 }, (_, index) => ({ index })),
      Object.fromEntries(Array.from({ length: 200 }, (_, index) => [`key-${index.toString().padStart(3, "0")}`, index])),
      "x".repeat(20_000),
    ];
    const outputs = values.map((value) => sanitizeProductionDatabaseHandoffReadinessApiText(value));

    expect(outputs[0]).toContain("[circular]");
    expect(outputs[1]).toContain("[circular]");
    expect(outputs[2]).toContain("[max-depth]");
    expect(outputs[3]).toContain("[truncated:");
    expect(outputs[4]).toContain("[truncated:");
    expect(outputs[5]).toContain("[truncated]");

    for (const [index, output] of outputs.entries()) {
      expect(output.length).toBeLessThanOrEqual(4_096);
      expect(output).toBe(sanitizeProductionDatabaseHandoffReadinessApiText(values[index]));
    }
  });

  it("bounds descriptor and value inspection for large object and typed-array inputs", () => {
    const target = Object.fromEntries(
      Array.from({ length: 5_000 }, (_, index) => [
        `key-${index.toString().padStart(5, "0")}`,
        index,
      ]),
    );
    let descriptorReads = 0;
    let valueReads = 0;
    const proxy = new Proxy(target, {
      get: (object, key, receiver) => {
        valueReads += 1;
        return Reflect.get(object, key, receiver);
      },
      getOwnPropertyDescriptor: (object, key) => {
        descriptorReads += 1;
        return Reflect.getOwnPropertyDescriptor(object, key);
      },
    });

    const first = sanitizeProductionDatabaseHandoffReadinessApiText(proxy);

    expect(first).toContain("[truncated:entry-budget]");
    expect(descriptorReads).toBeLessThanOrEqual(33);
    expect(valueReads).toBe(0);

    descriptorReads = 0;
    valueReads = 0;
    expect(sanitizeProductionDatabaseHandoffReadinessApiText(proxy)).toBe(first);
    expect(descriptorReads).toBeLessThanOrEqual(33);
    expect(valueReads).toBe(0);

    const typedArray = new Uint32Array(5_000);
    typedArray.fill(7);
    const typedArrayOutput = sanitizeProductionDatabaseHandoffReadinessApiText(typedArray);

    expect(typedArrayOutput).toContain("[truncated:");
    expect(typedArrayOutput.length).toBeLessThanOrEqual(4_096);
    expect(typedArrayOutput).toBe(sanitizeProductionDatabaseHandoffReadinessApiText(typedArray));
  });

  it("handles throwing getters and redacts sensitive object fields", () => {
    const input: Record<string, unknown> = {
      authorization: "Bearer raw-bearer-value",
      databaseUrl: "postgres://runtime-user:runtime-password@db.internal/campaign_os",
      host: "db.internal",
      password: "runtime-password",
      privatePath: "/Users/aelf/private/campaign-os-kitty/runtime.log",
      query: "SELECT secret_value FROM private_table",
      stack: "Error: private\n at runtime (/private/runtime.ts:1:1)",
      user: "runtime-user",
    };
    Object.defineProperty(input, "throwingGetter", {
      enumerable: true,
      get: () => {
        throw new Error("getter leaked postgres://getter:password@db.internal/app");
      },
    });

    const sanitized = sanitizeProductionDatabaseHandoffReadinessApiText(input);

    expect(sanitized).toContain("[unreadable]");
    expect(sanitized).toContain("[REDACTED:");
    for (const unsafe of [
      "raw-bearer-value",
      "runtime-password",
      "db.internal",
      "runtime-user",
      "SELECT secret_value",
      "private_table",
      "/Users/",
      "/private/",
      "getter leaked",
    ]) {
      expect(sanitized).not.toContain(unsafe);
    }
  });

  it("keeps fetch failures safe when resolved or rejected values are not JSON-compatible", async () => {
    const cyclicError: Record<string, unknown> = {
      attempt: 7n,
      databaseUrl: "postgres://runtime-user:runtime-password@db.internal/campaign_os",
      symbol: Symbol("private"),
    };
    cyclicError.self = cyclicError;
    const failedBody = {
      error: cyclicError,
      ok: false,
      traceId: "trace-hostile-response",
    };
    const resolvedFetch = vi.fn().mockResolvedValueOnce(response(failedBody, {
      ok: false,
      status: 503,
      traceId: "trace-hostile-header",
    })) as unknown as ProductionDatabaseHandoffReadinessApiFetch;

    const resolvedState = await loadProductionDatabaseHandoffReadinessApiState({
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl: resolvedFetch,
    });
    const resolvedSerialized = JSON.stringify(resolvedState);

    expect(resolvedState).toMatchObject({
      diagnostics: [{
        code: "API_REQUEST_FAILED",
        safeDetails: { status: 503 },
        severity: "error",
      }],
      source: "seeded_fallback",
      traceId: "trace-hostile-response",
    });
    expect(resolvedSerialized).toContain("[circular]");
    expect(resolvedSerialized).toContain("[bigint]");
    expect(resolvedSerialized).not.toContain("runtime-password");
    expect(resolvedSerialized).not.toContain("db.internal");

    const rejectedFetch = vi.fn(async () => Promise.reject(Symbol("token=raw-rejection"))) as unknown as
      ProductionDatabaseHandoffReadinessApiFetch;
    const rejectedState = await loadProductionDatabaseHandoffReadinessApiState({
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl: rejectedFetch,
    });

    expect(rejectedState).toMatchObject({
      diagnostics: [{
        code: "API_REQUEST_FAILED",
        safeDetails: { error: "[symbol]" },
        severity: "error",
      }],
      source: "seeded_fallback",
    });
  });

  it("returns a JSON-safe API state when a valid payload contains hostile diagnostic details", async () => {
    const hostileDetails: Record<string, unknown> = {
      attempt: 11n,
      symbol: Symbol("nested"),
    };
    hostileDetails.self = hostileDetails;
    const payload = validHandoffPayload({
      diagnostics: [{
        code: "PRODUCTION_DATABASE_HANDOFF_BLOCKED",
        field: "database",
        message: "Database handoff remains blocked.",
        safeDetails: hostileDetails,
        severity: "warning",
      }],
    });
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(
      envelope(payload, "trace-hostile-success"),
    )) as unknown as ProductionDatabaseHandoffReadinessApiFetch;

    const state = await loadProductionDatabaseHandoffReadinessApiState({
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });
    const serialized = JSON.stringify(state);

    expect(state.source).toBe("api_runtime");
    expect(serialized).toContain("[bigint]");
    expect(serialized).toContain("[symbol]");
    expect(serialized).toContain("[circular]");
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
