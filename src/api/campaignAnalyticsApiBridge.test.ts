import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CAMPAIGN_ANALYTICS_MAX_SERIALIZED_BYTES,
  campaignAnalyticsMetricDictionary,
  createCampaignAnalyticsSnapshot,
  type CampaignAnalyticsAggregateInput,
  type CampaignAnalyticsSnapshot,
} from "../domain/campaignAnalytics";
import {
  createCampaignAnalyticsApiBridge,
  type CampaignAnalyticsApiFetch,
  type CampaignAnalyticsApiRequest,
} from "./campaignAnalyticsApiBridge";

const campaignId = "campaign.analytics-01";
const traceId = "trace.analytics-01";

const aggregateInput = (
  overrides: Partial<CampaignAnalyticsAggregateInput> = {},
): CampaignAnalyticsAggregateInput => ({
  campaignId,
  asOf: "2026-07-19T05:00:00.000Z",
  traceId,
  supportedLocales: ["en-US"],
  participants: {
    unique: 1,
    riskFlagged: 0,
    accountTypes: [{ id: "AA", count: 1 }],
    locales: [{ id: "en-US", count: 1 }],
  },
  tasks: [{
    taskId: "task-01",
    templateCode: "social.follow",
    required: true,
    activityParticipants: 1,
    verifiedParticipants: 1,
  }],
  completions: { pending: 0, completed: 1, failed: 0, manualReview: 0, verified: 1 },
  review: {
    approved: 1,
    rejected: 0,
    needsReview: 0,
    stale: 0,
    invalid: 0,
    unreviewed: 0,
    totalParticipants: 1,
  },
  points: {
    completionAwarded: 10,
    participantAwarded: 10,
    participantsWithPoints: 1,
    participantsWithoutPoints: 0,
  },
  referrals: { availability: "available", total: 0, qualified: 0 },
  sourceSchemaVersions: {
    campaign: "campaign-v1",
    participant: "participant-v1",
    task_completion_evidence: "completion-v1",
    admin_review: "review-v1",
    points_projection: "points-v1",
    referral_binding: "referral-v1",
  },
  ...overrides,
});

const partialSnapshot = (): CampaignAnalyticsSnapshot =>
  createCampaignAnalyticsSnapshot(aggregateInput());

const reconciliationInput = (
  partialDimensions = false,
): CampaignAnalyticsAggregateInput => aggregateInput({
  participants: {
    unique: 2,
    riskFlagged: 1,
    accountTypes: [{ id: "AA", count: partialDimensions ? 1 : 2 }],
    locales: [{ id: "en-US", count: partialDimensions ? 1 : 2 }],
  },
  tasks: [{
    taskId: "task-01",
    templateCode: "social.follow",
    required: true,
    activityParticipants: 1,
    verifiedParticipants: 1,
  }],
  completions: { pending: 0, completed: 1, failed: 0, manualReview: 0, verified: 1 },
  review: {
    approved: 1,
    rejected: 0,
    needsReview: 0,
    stale: 0,
    invalid: 0,
    unreviewed: 1,
    totalParticipants: 2,
  },
  points: {
    completionAwarded: 10,
    participantAwarded: 10,
    participantsWithPoints: 1,
    participantsWithoutPoints: 1,
  },
  referrals: { availability: "available", total: 2, qualified: 1 },
});

const reconciliationSnapshot = (): CampaignAnalyticsSnapshot =>
  createCampaignAnalyticsSnapshot(reconciliationInput());

const partialDimensionSnapshot = (): CampaignAnalyticsSnapshot =>
  createCampaignAnalyticsSnapshot(reconciliationInput(true));

const emptySnapshot = (): CampaignAnalyticsSnapshot =>
  createCampaignAnalyticsSnapshot(aggregateInput({
    participants: { unique: 0, riskFlagged: 0, accountTypes: [], locales: [] },
    tasks: [{
      taskId: "task-01",
      templateCode: "social.follow",
      required: true,
      activityParticipants: 0,
      verifiedParticipants: 0,
    }],
    completions: { pending: 0, completed: 0, failed: 0, manualReview: 0, verified: 0 },
    review: {
      approved: 0,
      rejected: 0,
      needsReview: 0,
      stale: 0,
      invalid: 0,
      unreviewed: 0,
      totalParticipants: 0,
    },
    points: {
      completionAwarded: 0,
      participantAwarded: 0,
      participantsWithPoints: 0,
      participantsWithoutPoints: 0,
    },
  }));

const readySnapshot = (): CampaignAnalyticsSnapshot => {
  const snapshot = partialSnapshot();
  const metrics = snapshot.metrics.map((metric) => metric.availability === "available"
    ? metric
    : metric.definition.unit === "ratio"
      ? { availability: "available" as const, definition: metric.definition, value: 0, numerator: 0, denominator: 1 }
      : { availability: "available" as const, definition: metric.definition, value: 0 });
  const sourceCapabilities = snapshot.sourceCapabilities.map((capability) =>
    capability.availability === "available"
      ? capability
      : { source: capability.source, availability: "available" as const, schemaVersion: `${capability.source}-v1` });
  return { ...snapshot, status: "ready", metrics, sourceCapabilities };
};

const successBody = (snapshot: CampaignAnalyticsSnapshot = partialSnapshot()) => ({
  ok: true,
  data: snapshot,
  traceId: snapshot.traceId,
});

const mutableMetric = (
  snapshot: Record<string, unknown>,
  metricId: string,
): Record<string, unknown> => {
  const metric = (snapshot.metrics as Array<Record<string, unknown>>).find((candidate) =>
    (candidate.definition as Record<string, unknown>).id === metricId);
  if (!metric) {
    throw new Error(`Missing test metric: ${metricId}`);
  }
  return metric;
};

const jsonResponse = (
  body: unknown,
  options: { status?: number; headerTraceId?: string; headers?: HeadersInit } = {},
) => new Response(JSON.stringify(body), {
  status: options.status ?? 200,
  headers: {
    "content-type": "application/json",
    "x-trace-id": options.headerTraceId ?? traceId,
    ...Object.fromEntries(new Headers(options.headers).entries()),
  },
});

const request = (
  overrides: Partial<CampaignAnalyticsApiRequest> = {},
): CampaignAnalyticsApiRequest => ({
  surface: "owner",
  campaignId,
  signal: new AbortController().signal,
  traceId,
  ...overrides,
});

const bridgeWithResponse = (response: Response) => {
  const fetchImpl = vi.fn<CampaignAnalyticsApiFetch>().mockResolvedValue(response);
  const bridge = createCampaignAnalyticsApiBridge({
    baseUrl: "http://127.0.0.1:5193",
    fetchImpl,
    timeoutMs: 500,
    traceIdGenerator: () => "trace.generated-01",
  });
  return { bridge, fetchImpl };
};

const expectSafeFailure = (value: unknown) => {
  expect(value).toEqual(expect.objectContaining({ ok: false }));
  expect(JSON.stringify(value)).not.toMatch(
    /walletAddress|sessionId|challenge|signature|cookie|csrf|SELECT |stack trace|postgres:\/\//i,
  );
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("campaign analytics API bridge transport", () => {
  it.each([
    ["owner", "/api/campaigns/campaign.analytics-01/analytics"],
    ["admin", "/api/admin/campaigns/campaign.analytics-01/analytics"],
  ] as const)("uses the fixed %s credentialed GET endpoint", async (surface, path) => {
    const { bridge, fetchImpl } = bridgeWithResponse(jsonResponse(successBody()));

    const result = await bridge.read(request({ surface }));

    expect(result).toEqual(expect.objectContaining({ ok: true, httpStatus: 200, traceId }));
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe(`http://127.0.0.1:5193${path}`);
    expect(init).toMatchObject({ credentials: "include", method: "GET" });
    expect(init).not.toHaveProperty("body");
    const headers = new Headers(init?.headers);
    expect([...headers.entries()]).toEqual([
      ["accept", "application/json"],
      ["x-campaign-os-trace-id", traceId],
    ]);
    expect(String(url)).not.toMatch(/[?#]|role|wallet|subject|membership|capability/i);
  });

  it("uses a validated generated Trace ID when the caller omits one", async () => {
    const response = successBody();
    response.traceId = "trace.generated-01";
    response.data = { ...response.data, traceId: "trace.generated-01" };
    const { bridge, fetchImpl } = bridgeWithResponse(jsonResponse(
      response,
      { headerTraceId: "trace.generated-01" },
    ));

    const result = await bridge.read(request({ traceId: undefined }));

    expect(result).toEqual(expect.objectContaining({ ok: true, traceId: "trace.generated-01" }));
    expect(new Headers(fetchImpl.mock.calls[0][1]?.headers).get("x-campaign-os-trace-id"))
      .toBe("trace.generated-01");
  });

  it.each([
    ["campaignId", ""],
    ["campaignId", "   "],
    ["campaignId", "a".repeat(129)],
    ["campaignId", "campaign/escape"],
    ["campaignId", "campaign?role=admin"],
    ["campaignId", "campaign#fragment"],
    ["campaignId", "campaign\nvalue"],
    ["surface", "operator"],
  ])("rejects invalid request %s before fetch", async (field, value) => {
    const { bridge, fetchImpl } = bridgeWithResponse(jsonResponse(successBody()));

    const result = await bridge.read({ ...request(), [field]: value } as CampaignAnalyticsApiRequest);

    expect(result).toEqual(expect.objectContaining({
      ok: false,
      code: "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_INPUT",
      field,
      retryable: false,
    }));
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    ["ftp://127.0.0.1", 500, 1024],
    ["http://user:pass@127.0.0.1", 500, 1024],
    ["http://127.0.0.1?role=admin", 500, 1024],
    ["http://127.0.0.1#fragment", 500, 1024],
    ["not a URL", 500, 1024],
    ["http://127.0.0.1", 0, 1024],
    ["http://127.0.0.1", 2001, 1024],
    ["http://127.0.0.1", 500, 0],
    ["http://127.0.0.1", 500, CAMPAIGN_ANALYTICS_MAX_SERIALIZED_BYTES + 1],
  ])("rejects invalid factory configuration before fetch", async (baseUrl, timeoutMs, maxResponseBytes) => {
    const fetchImpl = vi.fn<CampaignAnalyticsApiFetch>();
    const bridge = createCampaignAnalyticsApiBridge({ baseUrl, fetchImpl, timeoutMs, maxResponseBytes });

    const result = await bridge.read(request());

    expect(result).toEqual(expect.objectContaining({
      ok: false,
      code: "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_CONFIG",
      operation: "config",
    }));
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails unsafe caller and generated Trace IDs before fetch", async () => {
    const fetchImpl = vi.fn<CampaignAnalyticsApiFetch>();
    const bridge = createCampaignAnalyticsApiBridge({
      baseUrl: "http://127.0.0.1:5193",
      fetchImpl,
      traceIdGenerator: () => "unsafe trace id",
    });

    const callerFailure = await bridge.read(request({ traceId: "Bearer secret" }));
    const generatorFailure = await bridge.read(request({ traceId: undefined }));

    expect(callerFailure).toEqual(expect.objectContaining({
      code: "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_INPUT",
      field: "traceId",
    }));
    expect(generatorFailure).toEqual(expect.objectContaining({
      code: "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_CONFIG",
      field: "traceIdGenerator",
    }));
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("contains hostile signal getters and listener methods before fetch", async () => {
    const fetchImpl = vi.fn<CampaignAnalyticsApiFetch>();
    const bridge = createCampaignAnalyticsApiBridge({ baseUrl: "http://127.0.0.1:5193", fetchImpl });
    const getterSignal = {
      get aborted() { throw new Error("hostile getter"); },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as AbortSignal;
    const listenerSignal = {
      aborted: false,
      addEventListener: vi.fn(() => { throw new Error("hostile listener"); }),
      removeEventListener: vi.fn(),
    } as unknown as AbortSignal;

    const getterResult = await bridge.read(request({ signal: getterSignal }));
    const listenerResult = await bridge.read(request({ signal: listenerSignal }));

    expect(getterResult).toEqual(expect.objectContaining({
      code: "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_INPUT",
      field: "request",
    }));
    expect(listenerResult).toEqual(expect.objectContaining({
      code: "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_INPUT",
      field: "signal",
    }));
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("contains hostile and invalid factory option shapes", async () => {
    const fetchImpl = vi.fn<CampaignAnalyticsApiFetch>();
    const cases = [
      null,
      { baseUrl: "http://127.0.0.1", fetchImpl: 1 },
      { baseUrl: "http://127.0.0.1", fetchImpl, setTimeoutImpl: 1 },
      { baseUrl: "http://127.0.0.1", fetchImpl, traceIdGenerator: 1 },
      { baseUrl: " http://127.0.0.1", fetchImpl },
      Object.defineProperty({}, "timeoutMs", { get: () => { throw new Error("hostile"); } }),
    ];

    for (const options of cases) {
      const bridge = createCampaignAnalyticsApiBridge(
        options as unknown as Parameters<typeof createCampaignAnalyticsApiBridge>[0],
      );
      await expect(bridge.read(request())).resolves.toEqual(expect.objectContaining({
        code: "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_CONFIG",
      }));
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("contains a throwing Trace ID generator", async () => {
    const fetchImpl = vi.fn<CampaignAnalyticsApiFetch>();
    const bridge = createCampaignAnalyticsApiBridge({
      baseUrl: "http://127.0.0.1:5193",
      fetchImpl,
      traceIdGenerator: () => { throw new Error("generator internals"); },
    });

    await expect(bridge.read(request({ traceId: undefined }))).resolves.toEqual(
      expect.objectContaining({
        code: "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_CONFIG",
        field: "traceIdGenerator",
      }),
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects unknown request properties and malformed signals", async () => {
    const { bridge, fetchImpl } = bridgeWithResponse(jsonResponse(successBody()));
    const unknownProperty = await bridge.read({ ...request(), role: "admin" } as CampaignAnalyticsApiRequest);
    const malformedSignal = await bridge.read(request({ signal: {} as AbortSignal }));

    expect(unknownProperty).toEqual(expect.objectContaining({
      code: "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_INPUT",
      field: "request",
    }));
    expect(malformedSignal).toEqual(expect.objectContaining({
      code: "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_INPUT",
      field: "signal",
    }));
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("campaign analytics API bridge strict decoding", () => {
  it.each([
    ["ready", readySnapshot],
    ["empty", emptySnapshot],
    ["partial", partialSnapshot],
  ] as const)("decodes and freezes a complete %s snapshot", async (_status, fixture) => {
    const snapshot = fixture();
    const { bridge } = bridgeWithResponse(jsonResponse(successBody(snapshot), {
      headerTraceId: snapshot.traceId,
    }));

    const result = await bridge.read(request({ traceId: snapshot.traceId }));

    expect(result).toEqual({ ok: true, data: snapshot, httpStatus: 200, traceId: snapshot.traceId });
    if (result.ok) {
      expect(result.data).not.toBe(snapshot);
      expect(Object.isFrozen(result.data)).toBe(true);
      expect(Object.isFrozen(result.data.metrics)).toBe(true);
    }
  });

  it("preserves available zero separately from unavailable metrics", async () => {
    const snapshot = emptySnapshot();
    const { bridge } = bridgeWithResponse(jsonResponse(successBody(snapshot)));

    const result = await bridge.read(request());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.metrics.find((item) => item.definition.id === "participants.unique"))
        .toEqual(expect.objectContaining({ availability: "available", value: 0 }));
      expect(result.data.metrics.find((item) => item.definition.id === "events.page_views"))
        .toEqual(expect.objectContaining({
          availability: "unavailable",
          reasonCode: "SOURCE_NOT_COLLECTED",
        }));
    }
  });

  it("accepts unchanged WP01 snapshots with partial account-type and locale coverage", async () => {
    const snapshot = partialDimensionSnapshot();
    expect(snapshot.accountTypeBreakdown).toEqual([{ id: "AA", count: 1, percentage: 0.5 }]);
    expect(snapshot.localeBreakdown).toEqual([{ id: "en-US", count: 1, percentage: 0.5 }]);

    const result = await bridgeWithResponse(jsonResponse(successBody(snapshot))).bridge.read(request());

    expect(result).toEqual({ ok: true, data: snapshot, httpStatus: 200, traceId });
  });

  it.each(["accountTypeBreakdown", "localeBreakdown"] as const)(
    "rejects %s totals above participants.unique",
    async (field) => {
      const snapshot = structuredClone(partialDimensionSnapshot()) as unknown as Record<string, unknown>;
      (snapshot[field] as Array<Record<string, unknown>>).push({
        id: field === "accountTypeBreakdown" ? "EOA" : "zh-CN",
        count: 2,
        percentage: 1,
      });

      const result = await bridgeWithResponse(jsonResponse(successBody(
        snapshot as unknown as CampaignAnalyticsSnapshot,
      ))).bridge.read(request());

      expect(result).toEqual(expect.objectContaining({
        ok: false,
        code: "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_RESPONSE",
      }));
    },
  );

  it("accepts an unchanged WP01 snapshot with canonical cross-metric values", async () => {
    const snapshot = reconciliationSnapshot();
    const result = await bridgeWithResponse(jsonResponse(successBody(snapshot))).bridge.read(request());
    expect(result).toEqual({ ok: true, data: snapshot, httpStatus: 200, traceId });
  });

  it.each([
    ["completion numerator", (snapshot: Record<string, unknown>) => {
      Object.assign(mutableMetric(snapshot, "completions.rate"), { numerator: 0, value: 0 });
    }],
    ["completion denominator", (snapshot: Record<string, unknown>) => {
      Object.assign(mutableMetric(snapshot, "completions.rate"), { denominator: 1, value: 1 });
    }],
    ["referral numerator", (snapshot: Record<string, unknown>) => {
      Object.assign(mutableMetric(snapshot, "referrals.conversion"), { numerator: 0, value: 0 });
    }],
    ["referral denominator", (snapshot: Record<string, unknown>) => {
      Object.assign(mutableMetric(snapshot, "referrals.conversion"), { denominator: 1, value: 1 });
    }],
    ["risk numerator", (snapshot: Record<string, unknown>) => {
      Object.assign(mutableMetric(snapshot, "risk.flagged_rate"), { numerator: 0, value: 0 });
    }],
    ["risk denominator", (snapshot: Record<string, unknown>) => {
      Object.assign(mutableMetric(snapshot, "risk.flagged_rate"), { denominator: 1, value: 1 });
    }],
    ["points Participant partition", (snapshot: Record<string, unknown>) => {
      mutableMetric(snapshot, "points.participants_without_points").value = 2;
    }],
    ["points Participant partition with unavailable awarded total", (snapshot: Record<string, unknown>) => {
      const awarded = mutableMetric(snapshot, "points.awarded");
      Object.keys(awarded).forEach((key) => delete awarded[key]);
      Object.assign(awarded, {
        availability: "unavailable",
        definition: campaignAnalyticsMetricDictionary.find(
          (definition) => definition.id === "points.awarded",
        ),
        reasonCode: "SOURCE_INTEGRITY_UNAVAILABLE",
      });
      mutableMetric(snapshot, "points.participants_without_points").value = 2;
    }],
    ["points awarded relation", (snapshot: Record<string, unknown>) => {
      mutableMetric(snapshot, "points.awarded").value = 0;
    }],
    ["Tasks with activity", (snapshot: Record<string, unknown>) => {
      mutableMetric(snapshot, "tasks.with_activity").value = 0;
    }],
    ["Task verified total", (snapshot: Record<string, unknown>) => {
      const row = ((snapshot.taskBreakdown as Record<string, unknown>).rows as Array<Record<string, unknown>>)[0];
      Object.assign(row, { verifiedParticipants: 0, completionRate: 0 });
    }],
  ])("rejects canonical %s drift", async (_label, mutate) => {
    const snapshot = structuredClone(reconciliationSnapshot()) as unknown as Record<string, unknown>;
    mutate(snapshot);

    const result = await bridgeWithResponse(jsonResponse(successBody(
      snapshot as unknown as CampaignAnalyticsSnapshot,
    ))).bridge.read(request());

    expect(result).toEqual(expect.objectContaining({
      ok: false,
      code: "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_RESPONSE",
    }));
  });

  it.each([
    ["unknown envelope key", (body: Record<string, unknown>) => { body.detail = "hidden"; }],
    ["unknown version", (body: Record<string, unknown>) => {
      (body.data as Record<string, unknown>).version = "campaign-analytics-v0";
    }],
    ["Campaign mismatch", (body: Record<string, unknown>) => {
      (body.data as Record<string, unknown>).campaignId = "campaign.other";
    }],
    ["dictionary drift", (body: Record<string, unknown>) => {
      const metrics = (body.data as { metrics: Array<Record<string, unknown>> }).metrics;
      (metrics[0].definition as Record<string, unknown>).version = "metric-dictionary-v0";
    }],
    ["metric count drift", (body: Record<string, unknown>) => {
      (body.data as { metrics: unknown[] }).metrics.pop();
    }],
    ["review reconciliation drift", (body: Record<string, unknown>) => {
      ((body.data as Record<string, unknown>).reviewBreakdown as Record<string, unknown>).approved = 2;
    }],
    ["duplicate source", (body: Record<string, unknown>) => {
      const sources = (body.data as { sourceCapabilities: Array<Record<string, unknown>> }).sourceCapabilities;
      sources[1].source = sources[0].source;
    }],
    ["sensitive nested key", (body: Record<string, unknown>) => {
      ((body.data as Record<string, unknown>).taskBreakdown as Record<string, unknown>).walletAddress = "secret";
    }],
    ["snapshot Trace mismatch", (body: Record<string, unknown>) => {
      (body.data as Record<string, unknown>).traceId = "trace.other";
    }],
  ])("fails closed on %s", async (_label, mutate) => {
    const body = structuredClone(successBody()) as unknown as Record<string, unknown>;
    mutate(body);
    const { bridge } = bridgeWithResponse(jsonResponse(body));

    const result = await bridge.read(request());

    expect(result).toEqual(expect.objectContaining({
      ok: false,
      code: "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_RESPONSE",
      retryable: false,
    }));
    expectSafeFailure(result);
  });

  it.each([
    ["required metric unavailable", (snapshot: Record<string, unknown>) => {
      const metrics = snapshot.metrics as Array<Record<string, unknown>>;
      metrics[0] = {
        availability: "unavailable",
        definition: metrics[0].definition,
        reasonCode: "SOURCE_INTEGRITY_UNAVAILABLE",
      };
    }],
    ["ratio reconciliation", (snapshot: Record<string, unknown>) => {
      ((snapshot.metrics as Array<Record<string, unknown>>)[4]).value = 0.5;
    }],
    ["fractional count", (snapshot: Record<string, unknown>) => {
      ((snapshot.metrics as Array<Record<string, unknown>>)[0]).value = 0.5;
    }],
    ["unknown unavailable reason", (snapshot: Record<string, unknown>) => {
      ((snapshot.metrics as Array<Record<string, unknown>>)[13]).reasonCode = "UNKNOWN";
    }],
    ["localized dictionary shape", (snapshot: Record<string, unknown>) => {
      const definition = ((snapshot.metrics as Array<Record<string, unknown>>)[0]).definition as Record<string, unknown>;
      (definition.label as Record<string, unknown>).extra = "drift";
    }],
    ["Task rate", (snapshot: Record<string, unknown>) => {
      const task = ((snapshot.taskBreakdown as Record<string, unknown>).rows as Array<Record<string, unknown>>)[0];
      task.completionRate = 0.5;
    }],
    ["Completion verified", (snapshot: Record<string, unknown>) => {
      (snapshot.completionBreakdown as Record<string, unknown>).completed = 0;
    }],
    ["Completion activity reconciliation", (snapshot: Record<string, unknown>) => {
      (snapshot.completionBreakdown as Record<string, unknown>).pending = 1;
    }],
    ["duplicate dimension", (snapshot: Record<string, unknown>) => {
      (snapshot.accountTypeBreakdown as unknown[]).push({ id: "AA", count: 0, percentage: 0 });
    }],
    ["source schema version", (snapshot: Record<string, unknown>) => {
      ((snapshot.sourceCapabilities as Array<Record<string, unknown>>)[0]).schemaVersion = "unsafe schema";
    }],
    ["source reason", (snapshot: Record<string, unknown>) => {
      ((snapshot.sourceCapabilities as Array<Record<string, unknown>>)[6]).reasonCode = "UNKNOWN";
    }],
    ["source count", (snapshot: Record<string, unknown>) => {
      (snapshot.sourceCapabilities as unknown[]).pop();
    }],
    ["source metric availability", (snapshot: Record<string, unknown>) => {
      ((snapshot.sourceCapabilities as Array<Record<string, unknown>>)[0]).availability = "unavailable";
      delete ((snapshot.sourceCapabilities as Array<Record<string, unknown>>)[0]).schemaVersion;
      ((snapshot.sourceCapabilities as Array<Record<string, unknown>>)[0]).reasonCode = "SOURCE_NOT_COLLECTED";
    }],
    ["status semantics", (snapshot: Record<string, unknown>) => { snapshot.status = "ready"; }],
  ])("rejects %s integrity drift", async (_label, mutate) => {
    const body = structuredClone(successBody()) as unknown as Record<string, unknown>;
    mutate(body.data as Record<string, unknown>);

    const result = await bridgeWithResponse(jsonResponse(body)).bridge.read(request());

    expect(result).toEqual(expect.objectContaining({
      ok: false,
      code: "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_RESPONSE",
    }));
  });

  it("rejects malformed, empty, non-JSON and invalid UTF-8 payloads", async () => {
    const responses = [
      new Response("{", { headers: { "content-type": "application/json", "x-trace-id": traceId } }),
      new Response("", { headers: { "content-type": "application/json", "x-trace-id": traceId } }),
      new Response("<html>no</html>", { headers: { "content-type": "text/html", "x-trace-id": traceId } }),
      new Response(new Uint8Array([0xc3, 0x28]), {
        headers: { "content-type": "application/json", "x-trace-id": traceId },
      }),
    ];

    for (const response of responses) {
      const { bridge } = bridgeWithResponse(response);
      const result = await bridge.read(request());
      expect(result).toEqual(expect.objectContaining({
        ok: false,
        code: "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_RESPONSE",
      }));
    }
  });

  it("rejects declared and actual byte overflow before JSON decoding", async () => {
    const declared = new Response("{}", {
      headers: {
        "content-length": String(CAMPAIGN_ANALYTICS_MAX_SERIALIZED_BYTES + 1),
        "content-type": "application/json",
        "x-trace-id": traceId,
      },
    });
    const actual = new Response(new TextEncoder().encode(`"${"界".repeat(200)}"`), {
      headers: { "content-type": "application/json", "x-trace-id": traceId },
    });

    const declaredResult = await bridgeWithResponse(declared).bridge.read(request());
    const actualResult = await createCampaignAnalyticsApiBridge({
      baseUrl: "http://127.0.0.1:5193",
      fetchImpl: vi.fn().mockResolvedValue(actual),
      maxResponseBytes: 128,
    }).read(request());

    expect(declaredResult).toEqual(expect.objectContaining({
      ok: false,
      code: "CAMPAIGN_ANALYTICS_BRIDGE_RESPONSE_TOO_LARGE",
    }));
    expect(actualResult).toEqual(expect.objectContaining({
      ok: false,
      code: "CAMPAIGN_ANALYTICS_BRIDGE_RESPONSE_TOO_LARGE",
    }));
  });

  it("accepts a chunked multibyte payload at the exact byte boundary", async () => {
    const raw = JSON.stringify(successBody());
    const bytes = new TextEncoder().encode(raw);
    const split = Math.floor(bytes.length / 2) + 1;
    const response = new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, split));
        controller.enqueue(bytes.slice(split));
        controller.close();
      },
    }), { headers: { "content-type": "application/json", "x-trace-id": traceId } });
    const bridge = createCampaignAnalyticsApiBridge({
      baseUrl: "http://127.0.0.1:5193",
      fetchImpl: vi.fn().mockResolvedValue(response),
      maxResponseBytes: bytes.byteLength,
    });

    await expect(bridge.read(request())).resolves.toEqual(expect.objectContaining({ ok: true }));
  });

  it("normalizes allowlisted server errors and rejects hostile or conflicting errors", async () => {
    const validError = {
      ok: false,
      error: { code: "CAMPAIGN_ANALYTICS_TIMEOUT", field: "analytics", retryable: true },
      traceId,
    };
    const valid = await bridgeWithResponse(jsonResponse(validError, { status: 503 })).bridge.read(request());
    expect(valid).toEqual({
      ok: false,
      code: "CAMPAIGN_ANALYTICS_TIMEOUT",
      field: "analytics",
      httpStatus: 503,
      operation: "response",
      retryable: true,
      traceId,
    });

    for (const error of [
      { ...validError, error: { ...validError.error, code: "SQL_FAILURE" } },
      { ...validError, error: { ...validError.error, retryable: false } },
      { ...validError, error: { ...validError.error, detail: "stack trace" } },
      { ...validError, error: { ...validError.error, field: "walletAddress" } },
    ]) {
      const result = await bridgeWithResponse(jsonResponse(error, { status: 503 })).bridge.read(request());
      expect(result).toEqual(expect.objectContaining({
        ok: false,
        code: "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_RESPONSE",
      }));
      expectSafeFailure(result);
    }
  });

  it.each([
    ["AUTH_SESSION_REQUIRED", 401, "cookie"],
    ["AUTH_FORBIDDEN", 403, "authorization"],
    ["CAMPAIGN_ANALYTICS_NOT_FOUND", 404, "campaignId"],
  ] as const)("preserves safe %s denial semantics", async (code, status, field) => {
    const body = { ok: false, error: { code, field, retryable: false }, traceId };
    const result = await bridgeWithResponse(jsonResponse(body, { status })).bridge.read(request());
    expect(result).toEqual(expect.objectContaining({ code, field, httpStatus: status, retryable: false }));
  });

  it("rejects a success envelope on a non-contract 2xx status", async () => {
    const result = await bridgeWithResponse(jsonResponse(successBody(), { status: 201 })).bridge.read(request());
    expect(result).toEqual(expect.objectContaining({
      code: "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_RESPONSE",
      httpStatus: 201,
    }));
  });

  it("rejects a bodyless JSON response", async () => {
    const response = new Response(null, {
      headers: { "content-type": "application/json", "x-trace-id": traceId },
    });
    const result = await bridgeWithResponse(response).bridge.read(request());
    expect(result).toEqual(expect.objectContaining({
      code: "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_RESPONSE",
    }));
  });

  it("requires one safe matching response, envelope and snapshot Trace ID", async () => {
    for (const headerTraceId of [undefined, "unsafe trace", "trace.other"] as const) {
      const response = new Response(JSON.stringify(successBody()), {
        headers: {
          "content-type": "application/json",
          ...(headerTraceId === undefined ? {} : { "x-trace-id": headerTraceId }),
        },
      });
      const result = await bridgeWithResponse(response).bridge.read(request());
      expect(result).toEqual(expect.objectContaining({
        ok: false,
        code: "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_RESPONSE",
      }));
    }
  });

  it("returns equivalent business data for Owner and Admin", async () => {
    const owner = await bridgeWithResponse(jsonResponse(successBody())).bridge.read(request({ surface: "owner" }));
    const admin = await bridgeWithResponse(jsonResponse(successBody())).bridge.read(request({ surface: "admin" }));
    expect(owner).toEqual(admin);
  });

  it("binds each response to its requested Campaign", async () => {
    const { bridge } = bridgeWithResponse(jsonResponse(successBody()));
    const result = await bridge.read(request({ campaignId: "campaign.other" }));
    expect(result).toEqual(expect.objectContaining({
      ok: false,
      code: "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_RESPONSE",
    }));
  });

  it("uses the exact WP01 metric dictionary and stable order", () => {
    expect(partialSnapshot().metrics.map((metric) => metric.definition))
      .toEqual(campaignAnalyticsMetricDictionary);
  });
});

describe("campaign analytics API bridge abort lifecycle", () => {
  it("does not call fetch or create a timer for a pre-aborted caller", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    controller.abort();
    const fetchImpl = vi.fn<CampaignAnalyticsApiFetch>();
    const bridge = createCampaignAnalyticsApiBridge({ baseUrl: "http://127.0.0.1:5193", fetchImpl });

    const result = await bridge.read(request({ signal: controller.signal }));

    expect(result).toEqual(expect.objectContaining({
      ok: false,
      code: "CAMPAIGN_ANALYTICS_BRIDGE_REQUEST_ABORTED",
      retryable: false,
    }));
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("settles timeout even when fetch ignores the internal signal", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn<CampaignAnalyticsApiFetch>(() => new Promise(() => undefined));
    const bridge = createCampaignAnalyticsApiBridge({
      baseUrl: "http://127.0.0.1:5193",
      fetchImpl,
      timeoutMs: 100,
    });

    const pending = bridge.read(request());
    await vi.advanceTimersByTimeAsync(100);

    await expect(pending).resolves.toEqual(expect.objectContaining({
      ok: false,
      code: "CAMPAIGN_ANALYTICS_BRIDGE_REQUEST_TIMEOUT",
      retryable: true,
    }));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("distinguishes caller abort and removes the caller listener", async () => {
    const controller = new AbortController();
    const add = vi.spyOn(controller.signal, "addEventListener");
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const fetchImpl = vi.fn<CampaignAnalyticsApiFetch>(() => new Promise(() => undefined));
    const bridge = createCampaignAnalyticsApiBridge({ baseUrl: "http://127.0.0.1:5193", fetchImpl });

    const pending = bridge.read(request({ signal: controller.signal }));
    controller.abort();

    await expect(pending).resolves.toEqual(expect.objectContaining({
      ok: false,
      code: "CAMPAIGN_ANALYTICS_BRIDGE_REQUEST_ABORTED",
      retryable: false,
    }));
    expect(add).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
  });

  it("uses one timer and removes the caller listener after success", async () => {
    const signal = new AbortController().signal;
    const add = vi.spyOn(signal, "addEventListener");
    const remove = vi.spyOn(signal, "removeEventListener");
    const setTimeoutImpl = vi.fn(() => ({ timer: 1 }));
    const clearTimeoutImpl = vi.fn();
    const bridge = createCampaignAnalyticsApiBridge({
      baseUrl: "http://127.0.0.1:5193",
      fetchImpl: vi.fn().mockResolvedValue(jsonResponse(successBody())),
      setTimeoutImpl,
      clearTimeoutImpl,
    });

    const result = await bridge.read(request({ signal }));

    expect(result).toEqual(expect.objectContaining({ ok: true }));
    expect(setTimeoutImpl).toHaveBeenCalledOnce();
    expect(clearTimeoutImpl).toHaveBeenCalledOnce();
    expect(add).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("settles a hung body read on the same timeout and cancels the reader", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn(() => new Promise<void>(() => undefined));
    const body = new ReadableStream<Uint8Array>({
      pull: () => new Promise<void>(() => undefined),
      cancel,
    });
    const response = new Response(body, {
      headers: { "content-type": "application/json", "x-trace-id": traceId },
    });
    const bridge = createCampaignAnalyticsApiBridge({
      baseUrl: "http://127.0.0.1:5193",
      fetchImpl: vi.fn().mockResolvedValue(response),
      timeoutMs: 100,
    });

    const pending = bridge.read(request());
    await vi.advanceTimersByTimeAsync(100);

    await expect(pending).resolves.toEqual(expect.objectContaining({
      code: "CAMPAIGN_ANALYTICS_BRIDGE_REQUEST_TIMEOUT",
      retryable: true,
    }));
    expect(cancel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("contains a throwing timer primitive as typed invalid config", async () => {
    const fetchImpl = vi.fn<CampaignAnalyticsApiFetch>();
    const bridge = createCampaignAnalyticsApiBridge({
      baseUrl: "http://127.0.0.1:5193",
      fetchImpl,
      setTimeoutImpl: () => { throw new Error("timer internals"); },
    });

    await expect(bridge.read(request())).resolves.toEqual(expect.objectContaining({
      code: "CAMPAIGN_ANALYTICS_BRIDGE_INVALID_CONFIG",
      field: "timer",
    }));
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("ignores a late response after abort while a second request succeeds", async () => {
    let resolveFirst!: (response: Response) => void;
    const first = new Promise<Response>((resolve) => { resolveFirst = resolve; });
    const fetchImpl = vi.fn<CampaignAnalyticsApiFetch>()
      .mockImplementationOnce(() => first)
      .mockResolvedValueOnce(jsonResponse(successBody()));
    const bridge = createCampaignAnalyticsApiBridge({ baseUrl: "http://127.0.0.1:5193", fetchImpl });
    const controller = new AbortController();

    const resultA = bridge.read(request({ signal: controller.signal, traceId: "trace.request-a" }));
    controller.abort();
    const resultB = bridge.read(request());
    resolveFirst(jsonResponse(successBody()));

    await expect(resultA).resolves.toEqual(expect.objectContaining({
      code: "CAMPAIGN_ANALYTICS_BRIDGE_REQUEST_ABORTED",
    }));
    await expect(resultB).resolves.toEqual(expect.objectContaining({ ok: true }));
  });

  it("normalizes network rejection without exposing the raw error", async () => {
    const fetchImpl = vi.fn<CampaignAnalyticsApiFetch>().mockRejectedValue(
      new Error("postgres://user:pass@host SELECT walletAddress stack trace"),
    );
    const bridge = createCampaignAnalyticsApiBridge({ baseUrl: "http://127.0.0.1:5193", fetchImpl });

    const result = await bridge.read(request());

    expect(result).toEqual(expect.objectContaining({
      ok: false,
      code: "CAMPAIGN_ANALYTICS_BRIDGE_REQUEST_FAILED",
      retryable: true,
    }));
    expectSafeFailure(result);
  });
});
