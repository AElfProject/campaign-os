import { describe, expect, it } from "vitest";
import {
  CAMPAIGN_ANALYTICS_DICTIONARY_VERSION,
  CAMPAIGN_ANALYTICS_MAX_SERIALIZED_BYTES,
  CAMPAIGN_ANALYTICS_TASK_ROW_LIMIT,
  CAMPAIGN_ANALYTICS_VERSION,
  CampaignAnalyticsProjectionError,
  assertCampaignAnalyticsSnapshotWithinByteLimit,
  campaignAnalyticsMetricDictionary,
  createCampaignAnalyticsSnapshot,
  getCampaignAnalyticsMetricDefinition,
  measureCampaignAnalyticsSnapshotBytes,
  serializeCampaignAnalyticsSnapshot,
  type CampaignAnalyticsAggregateInput,
  type CampaignAnalyticsAvailability,
  type CampaignAnalyticsDenominatorId,
  type CampaignAnalyticsMetric,
  type CampaignAnalyticsMetricId,
  type CampaignAnalyticsSnapshot,
  type CampaignAnalyticsSourceId,
  type CampaignAnalyticsUnit,
} from "./campaignAnalytics";

const expectedMetricContract = (
  id: CampaignAnalyticsMetricId,
  unit: CampaignAnalyticsUnit,
  source: CampaignAnalyticsSourceId,
  dedupeKey: string,
  denominator: CampaignAnalyticsDenominatorId | null,
  availability: CampaignAnalyticsAvailability,
) => ({ availability, dedupeKey, denominator, id, source, unit });

const expectedMetricContracts = [
  expectedMetricContract("participants.unique", "count", "participant", "campaign_id+participant_subject", null, "available"),
  expectedMetricContract("tasks.total", "count", "campaign", "campaign_id+task_id", null, "available"),
  expectedMetricContract("tasks.with_activity", "count", "task_completion_evidence", "campaign_id+task_id", null, "available"),
  expectedMetricContract("completions.verified", "count", "task_completion_evidence", "campaign_id+participant_subject+task_id", null, "available"),
  expectedMetricContract("completions.rate", "ratio", "task_completion_evidence", "campaign_id+participant_subject+task_id", "participant_task_opportunities", "available"),
  expectedMetricContract("points.awarded", "points", "points_projection", "campaign_id+confirmed_ledger_entry_id", null, "available"),
  expectedMetricContract("points.participants_with_points", "count", "points_projection", "campaign_id+participant_subject", null, "available"),
  expectedMetricContract("points.participants_without_points", "count", "points_projection", "campaign_id+participant_subject", null, "available"),
  expectedMetricContract("referrals.total", "count", "referral_binding", "campaign_id+referral_binding_id", null, "available"),
  expectedMetricContract("referrals.qualified", "count", "referral_binding", "campaign_id+referral_binding_id", null, "available"),
  expectedMetricContract("referrals.conversion", "ratio", "referral_binding", "campaign_id+referral_binding_id", "referral_bindings", "available"),
  expectedMetricContract("risk.flagged_participants", "count", "participant", "campaign_id+participant_subject", null, "available"),
  expectedMetricContract("risk.flagged_rate", "ratio", "participant", "campaign_id+participant_subject", "participants", "available"),
  expectedMetricContract("events.page_views", "count", "browser_events", "campaign_id+event_id", null, "unavailable"),
  expectedMetricContract("events.impressions", "count", "browser_events", "campaign_id+event_id", null, "unavailable"),
  expectedMetricContract("events.clicks", "count", "browser_events", "campaign_id+event_id", null, "unavailable"),
  expectedMetricContract("events.wallet_connects", "count", "browser_events", "campaign_id+event_id", null, "unavailable"),
  expectedMetricContract("retention.day_7", "ratio", "retention_events", "campaign_id+participant_subject+cohort_day", "participants", "unavailable"),
  expectedMetricContract("retention.day_30", "ratio", "retention_events", "campaign_id+participant_subject+cohort_day", "participants", "unavailable"),
  expectedMetricContract("conversion.external_product", "ratio", "external_product_events", "campaign_id+external_event_id", "participants", "unavailable"),
];

const expectedMetricIds: readonly CampaignAnalyticsMetricId[] = expectedMetricContracts.map(
  ({ id }) => id,
);

const createEmptyInput = (): CampaignAnalyticsAggregateInput => ({
  asOf: "2026-07-19T01:30:00.000Z",
  campaignId: "campaign-analytics-empty",
  completions: {
    completed: 0,
    failed: 0,
    manualReview: 0,
    pending: 0,
    verified: 0,
  },
  participants: {
    accountTypes: [],
    locales: [],
    riskFlagged: 0,
    unique: 0,
  },
  points: {
    completionAwarded: 0,
    participantAwarded: 0,
    participantsWithPoints: 0,
    participantsWithoutPoints: 0,
  },
  referrals: {
    availability: "available",
    qualified: 0,
    total: 0,
  },
  review: {
    approved: 0,
    invalid: 0,
    needsReview: 0,
    rejected: 0,
    stale: 0,
    totalParticipants: 0,
    unreviewed: 0,
  },
  sourceSchemaVersions: {
    admin_review: "admin-review-v1",
    campaign: "campaign-schema-v1",
    participant: "participant-schema-v1",
    points_projection: "points-projection-v1",
    referral_binding: "referral-binding-v1",
    task_completion_evidence: "task-evidence-v1",
  },
  supportedLocales: ["en-US"],
  tasks: [],
  traceId: "trace-analytics-empty",
});

const createKnownInput = (): CampaignAnalyticsAggregateInput => ({
  ...createEmptyInput(),
  campaignId: "campaign-analytics-known",
  completions: {
    completed: 2,
    failed: 1,
    manualReview: 1,
    pending: 1,
    verified: 2,
  },
  participants: {
    accountTypes: [
      { count: 2, id: "EOA" },
      { count: 1, id: "AA" },
    ],
    locales: [
      { count: 1, id: "zh-CN" },
      { count: 2, id: "en-US" },
    ],
    riskFlagged: 1,
    unique: 3,
  },
  points: {
    completionAwarded: 150,
    participantAwarded: 150,
    participantsWithPoints: 2,
    participantsWithoutPoints: 1,
  },
  referrals: {
    availability: "available",
    qualified: 1,
    total: 2,
  },
  review: {
    approved: 1,
    invalid: 0,
    needsReview: 1,
    rejected: 0,
    stale: 0,
    totalParticipants: 3,
    unreviewed: 1,
  },
  supportedLocales: ["zh-CN", "en-US"],
  tasks: [
    {
      activityParticipants: 2,
      required: false,
      taskId: "task-b",
      templateCode: "SOCIAL_SHARE",
      verifiedParticipants: 1,
    },
    {
      activityParticipants: 3,
      required: true,
      taskId: "task-a",
      templateCode: "TOKEN_HOLDING",
      verifiedParticipants: 1,
    },
  ],
  traceId: "trace-analytics-known",
});

const metricById = (
  snapshot: CampaignAnalyticsSnapshot,
  id: CampaignAnalyticsMetricId,
): CampaignAnalyticsMetric => {
  const metric = snapshot.metrics.find((candidate) => candidate.definition.id === id);

  if (!metric) {
    throw new Error(`Missing test metric ${id}`);
  }

  return metric;
};

const expectProjectionError = (
  operation: () => unknown,
  code: CampaignAnalyticsProjectionError["code"],
  field?: string,
) => {
  try {
    operation();
    throw new Error("Expected CampaignAnalyticsProjectionError");
  } catch (error) {
    expect(error).toBeInstanceOf(CampaignAnalyticsProjectionError);
    expect(error).toMatchObject({
      code,
      ...(field ? { field } : {}),
    });
  }
};

describe("campaign analytics metric dictionary", () => {
  it("exposes the complete stable metric-dictionary-v1 contract", () => {
    const emptySnapshot = createCampaignAnalyticsSnapshot(createEmptyInput());

    expect(CAMPAIGN_ANALYTICS_VERSION).toBe("campaign-analytics-v1");
    expect(CAMPAIGN_ANALYTICS_DICTIONARY_VERSION).toBe("metric-dictionary-v1");
    expect(campaignAnalyticsMetricDictionary.map((definition) => definition.id)).toEqual(
      expectedMetricIds,
    );
    expect(new Set(expectedMetricIds).size).toBe(20);
    expect(Object.isFrozen(campaignAnalyticsMetricDictionary)).toBe(true);
    expect(campaignAnalyticsMetricDictionary.map((definition, index) => ({
      availability: emptySnapshot.metrics[index]?.availability,
      dedupeKey: definition.dedupeKey,
      denominator: definition.denominator,
      id: definition.id,
      source: definition.source,
      unit: definition.unit,
    }))).toEqual(expectedMetricContracts);

    for (const definition of campaignAnalyticsMetricDictionary) {
      expect(definition.version).toBe(CAMPAIGN_ANALYTICS_DICTIONARY_VERSION);
      expect(definition.timeBoundary).toBe("snapshot_as_of");
      expect(definition.dedupeKey.length).toBeGreaterThan(0);
      expect(definition.label["en-US"].length).toBeGreaterThan(0);
      expect(definition.label["zh-CN"]?.length ?? 0).toBeGreaterThan(0);
      expect(definition.label["zh-TW"]?.length ?? 0).toBeGreaterThan(0);
      expect(definition.description["en-US"].length).toBeGreaterThan(0);
      expect(Object.isFrozen(definition)).toBe(true);
      expect(Object.isFrozen(definition.label)).toBe(true);
      expect(Object.isFrozen(definition.description)).toBe(true);
    }
  });

  it("returns immutable definitions and rejects unknown metric ids", () => {
    const definition = getCampaignAnalyticsMetricDefinition("participants.unique");

    expect(definition).toBe(campaignAnalyticsMetricDictionary[0]);
    expect(() => {
      (definition.label as { "en-US": string })["en-US"] = "mutated";
    }).toThrow(TypeError);
    expectProjectionError(
      () => getCampaignAnalyticsMetricDefinition("participants.raw" as CampaignAnalyticsMetricId),
      "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
      "metricId",
    );
  });
});

describe("createCampaignAnalyticsSnapshot", () => {
  it("keeps deterministic zero distinct from unavailable metrics for an empty Campaign", () => {
    const snapshot = createCampaignAnalyticsSnapshot(createEmptyInput());
    const participants = metricById(snapshot, "participants.unique");
    const completionRate = metricById(snapshot, "completions.rate");
    const pageViews = metricById(snapshot, "events.page_views");

    expect(snapshot).toMatchObject({
      asOf: "2026-07-19T01:30:00.000Z",
      campaignId: "campaign-analytics-empty",
      status: "empty",
      traceId: "trace-analytics-empty",
      version: CAMPAIGN_ANALYTICS_VERSION,
    });
    expect(participants).toMatchObject({ availability: "available", value: 0 });
    expect(completionRate).toMatchObject({
      availability: "available",
      denominator: 0,
      numerator: 0,
      value: 0,
    });
    expect(pageViews).toMatchObject({
      availability: "unavailable",
      reasonCode: "SOURCE_NOT_COLLECTED",
    });
    expect(pageViews).not.toHaveProperty("value");
    expect(pageViews).not.toHaveProperty("numerator");
    expect(pageViews).not.toHaveProperty("denominator");
    expect(snapshot.metrics).toHaveLength(20);
    expect(snapshot.sourceCapabilities).toHaveLength(9);
  });

  it("keeps a Campaign with configured Tasks but no Participant activity in the empty state", () => {
    const input = createEmptyInput();
    const snapshot = createCampaignAnalyticsSnapshot({
      ...input,
      tasks: [
        {
          activityParticipants: 0,
          required: true,
          taskId: "task-a",
          templateCode: "TOKEN_HOLDING",
          verifiedParticipants: 0,
        },
        {
          activityParticipants: 0,
          required: false,
          taskId: "task-b",
          templateCode: "SOCIAL_SHARE",
          verifiedParticipants: 0,
        },
      ],
    });

    expect(snapshot.status).toBe("empty");
    expect(metricById(snapshot, "tasks.total")).toMatchObject({ value: 2 });
    expect(metricById(snapshot, "tasks.with_activity")).toMatchObject({ value: 0 });
  });

  it("projects known durable aggregates in stable dictionary and breakdown order", () => {
    const snapshot = createCampaignAnalyticsSnapshot(createKnownInput());

    expect(snapshot.status).toBe("partial");
    expect(snapshot.metrics.map((metric) => metric.definition.id)).toEqual(expectedMetricIds);
    expect(metricById(snapshot, "participants.unique")).toMatchObject({
      availability: "available",
      value: 3,
    });
    expect(metricById(snapshot, "tasks.total")).toMatchObject({
      availability: "available",
      value: 2,
    });
    expect(metricById(snapshot, "tasks.with_activity")).toMatchObject({
      availability: "available",
      value: 2,
    });
    expect(metricById(snapshot, "completions.verified")).toMatchObject({
      availability: "available",
      value: 2,
    });
    expect(metricById(snapshot, "completions.rate")).toMatchObject({
      availability: "available",
      denominator: 6,
      numerator: 2,
      value: 2 / 6,
    });
    expect(metricById(snapshot, "points.awarded")).toMatchObject({ value: 150 });
    expect(metricById(snapshot, "points.participants_with_points")).toMatchObject({ value: 2 });
    expect(metricById(snapshot, "points.participants_without_points")).toMatchObject({ value: 1 });
    expect(metricById(snapshot, "referrals.total")).toMatchObject({ value: 2 });
    expect(metricById(snapshot, "referrals.qualified")).toMatchObject({ value: 1 });
    expect(metricById(snapshot, "referrals.conversion")).toMatchObject({
      denominator: 2,
      numerator: 1,
      value: 0.5,
    });
    expect(metricById(snapshot, "risk.flagged_rate")).toMatchObject({
      denominator: 3,
      numerator: 1,
      value: 1 / 3,
    });
    expect(snapshot.taskBreakdown).toEqual({
      rowLimit: CAMPAIGN_ANALYTICS_TASK_ROW_LIMIT,
      rows: [
        {
          activityParticipants: 3,
          completionRate: 1 / 3,
          participantDenominator: 3,
          required: true,
          taskId: "task-a",
          templateCode: "TOKEN_HOLDING",
          verifiedParticipants: 1,
        },
        {
          activityParticipants: 2,
          completionRate: 1 / 3,
          participantDenominator: 3,
          required: false,
          taskId: "task-b",
          templateCode: "SOCIAL_SHARE",
          verifiedParticipants: 1,
        },
      ],
      totalRows: 2,
      truncated: false,
    });
    expect(snapshot.completionBreakdown).toEqual(createKnownInput().completions);
    expect(snapshot.reviewBreakdown).toEqual(createKnownInput().review);
    expect(snapshot.accountTypeBreakdown).toEqual([
      { count: 1, id: "AA", percentage: 1 / 3 },
      { count: 2, id: "EOA", percentage: 2 / 3 },
    ]);
    expect(snapshot.localeBreakdown).toEqual([
      { count: 2, id: "en-US", percentage: 2 / 3 },
      { count: 1, id: "zh-CN", percentage: 1 / 3 },
    ]);
  });

  it("marks referral metrics and capability unavailable without fabricating zero", () => {
    const input = createKnownInput();
    const snapshot = createCampaignAnalyticsSnapshot({
      ...input,
      referrals: {
        availability: "unavailable",
        reasonCode: "SOURCE_OUT_OF_SCOPE",
      },
    });

    for (const id of [
      "referrals.total",
      "referrals.qualified",
      "referrals.conversion",
    ] as const) {
      expect(metricById(snapshot, id)).toMatchObject({
        availability: "unavailable",
        reasonCode: "SOURCE_OUT_OF_SCOPE",
      });
      expect(metricById(snapshot, id)).not.toHaveProperty("value");
    }
    expect(snapshot.sourceCapabilities.find((source) => source.source === "referral_binding"))
      .toEqual({
        availability: "unavailable",
        reasonCode: "SOURCE_OUT_OF_SCOPE",
        source: "referral_binding",
      });
  });

  it("fixes unsupported event, retention, and external sources as unavailable", () => {
    const snapshot = createCampaignAnalyticsSnapshot(createKnownInput());
    const unsupportedIds = [
      "events.page_views",
      "events.impressions",
      "events.clicks",
      "events.wallet_connects",
      "retention.day_7",
      "retention.day_30",
      "conversion.external_product",
    ] as const;

    for (const id of unsupportedIds) {
      expect(metricById(snapshot, id)).toMatchObject({
        availability: "unavailable",
        reasonCode: "SOURCE_NOT_COLLECTED",
      });
    }
    expect(snapshot.sourceCapabilities.slice(-3)).toEqual([
      {
        availability: "unavailable",
        reasonCode: "SOURCE_NOT_COLLECTED",
        source: "browser_events",
      },
      {
        availability: "unavailable",
        reasonCode: "SOURCE_NOT_COLLECTED",
        source: "retention_events",
      },
      {
        availability: "unavailable",
        reasonCode: "SOURCE_NOT_COLLECTED",
        source: "external_product_events",
      },
    ]);
  });

  it("sorts and truncates Task rows without changing aggregate totals", () => {
    const tasks = Array.from({ length: 51 }, (_, index) => ({
      activityParticipants: 0,
      required: index % 2 === 0,
      taskId: `task-${String(50 - index).padStart(2, "0")}`,
      templateCode: `TEMPLATE_${String(index).padStart(2, "0")}`,
      verifiedParticipants: 0,
    }));
    const input = createEmptyInput();
    const snapshot = createCampaignAnalyticsSnapshot({
      ...input,
      participants: {
        accountTypes: [{ count: 1, id: "UNKNOWN" }],
        locales: [{ count: 1, id: "en-US" }],
        riskFlagged: 0,
        unique: 1,
      },
      points: {
        completionAwarded: 0,
        participantAwarded: 0,
        participantsWithPoints: 0,
        participantsWithoutPoints: 1,
      },
      review: {
        ...input.review,
        totalParticipants: 1,
        unreviewed: 1,
      },
      tasks,
    });

    expect(snapshot.taskBreakdown).toMatchObject({
      rowLimit: 50,
      totalRows: 51,
      truncated: true,
    });
    expect(snapshot.taskBreakdown.rows).toHaveLength(50);
    expect(snapshot.taskBreakdown.rows[0]?.taskId).toBe("task-00");
    expect(snapshot.taskBreakdown.rows[snapshot.taskBreakdown.rows.length - 1]?.taskId).toBe("task-49");
    expect(metricById(snapshot, "tasks.total")).toMatchObject({ value: 51 });
  });

  it("creates a deterministic deeply frozen snapshot without retaining mutable inputs", () => {
    const input = createKnownInput();
    const first = createCampaignAnalyticsSnapshot(input);
    const second = createCampaignAnalyticsSnapshot(createKnownInput());
    const serialized = serializeCampaignAnalyticsSnapshot(first);

    expect(first).toEqual(second);
    expect(serialized).toBe(serializeCampaignAnalyticsSnapshot(second));
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.metrics)).toBe(true);
    expect(Object.isFrozen(first.taskBreakdown.rows)).toBe(true);
    expect(Object.isFrozen(first.accountTypeBreakdown[0])).toBe(true);

    (input.tasks as unknown as { taskId: string }[])[0]!.taskId = "mutated-task";
    (input.participants.accountTypes as { count: number; id: string }[])[0]!.count = 99;

    expect(first.taskBreakdown.rows.map((row) => row.taskId)).toEqual(["task-a", "task-b"]);
    expect(first.accountTypeBreakdown[0]?.count).toBe(1);
    expect(() => {
      (first.taskBreakdown.rows as unknown as { taskId: string }[])[0]!.taskId = "mutated-output";
    }).toThrow(TypeError);
  });

  it("serializes semantically equal snapshots with canonical object-key order", () => {
    const snapshot = createCampaignAnalyticsSnapshot(createKnownInput());
    const reverseKeys = (value: unknown): unknown => {
      if (Array.isArray(value)) {
        return value.map(reverseKeys);
      }

      if (value === null || typeof value !== "object") {
        return value;
      }

      return Object.fromEntries(
        Object.entries(value)
          .reverse()
          .map(([key, child]) => [key, reverseKeys(child)]),
      );
    };
    const reordered = reverseKeys(JSON.parse(JSON.stringify(snapshot))) as CampaignAnalyticsSnapshot;

    expect(reordered).toEqual(snapshot);
    expect(serializeCampaignAnalyticsSnapshot(reordered)).toBe(
      serializeCampaignAnalyticsSnapshot(snapshot),
    );
  });

  it("measures the actual UTF-8 payload and enforces the byte boundary", () => {
    const snapshot = createCampaignAnalyticsSnapshot(createKnownInput());
    const serialized = serializeCampaignAnalyticsSnapshot(snapshot);
    const expectedBytes = new TextEncoder().encode(serialized).byteLength;

    expect(measureCampaignAnalyticsSnapshotBytes(snapshot)).toBe(expectedBytes);
    expect(expectedBytes).toBeLessThan(CAMPAIGN_ANALYTICS_MAX_SERIALIZED_BYTES);
    expect(assertCampaignAnalyticsSnapshotWithinByteLimit(snapshot, expectedBytes)).toBe(snapshot);
    expectProjectionError(
      () => assertCampaignAnalyticsSnapshotWithinByteLimit(snapshot, expectedBytes - 1),
      "CAMPAIGN_ANALYTICS_BOUND_EXCEEDED",
      "snapshot",
    );

    const emptyTraceSnapshot = { ...snapshot, traceId: "" };
    const emptyTraceBytes = measureCampaignAnalyticsSnapshotBytes(emptyTraceSnapshot);
    const exactLimitSnapshot = {
      ...emptyTraceSnapshot,
      traceId: "x".repeat(CAMPAIGN_ANALYTICS_MAX_SERIALIZED_BYTES - emptyTraceBytes),
    };
    const overLimitSnapshot = {
      ...exactLimitSnapshot,
      traceId: `${exactLimitSnapshot.traceId}x`,
    };

    expect(measureCampaignAnalyticsSnapshotBytes(exactLimitSnapshot)).toBe(
      CAMPAIGN_ANALYTICS_MAX_SERIALIZED_BYTES,
    );
    expect(assertCampaignAnalyticsSnapshotWithinByteLimit(exactLimitSnapshot)).toBe(
      exactLimitSnapshot,
    );
    expectProjectionError(
      () => assertCampaignAnalyticsSnapshotWithinByteLimit(overLimitSnapshot),
      "CAMPAIGN_ANALYTICS_BOUND_EXCEEDED",
      "snapshot",
    );
  });

  it("rejects invalid identifiers, timestamps, counts, duplicates, and sensitive input keys", () => {
    const invalidCases: readonly [CampaignAnalyticsAggregateInput, string][] = [
      [{ ...createKnownInput(), campaignId: "../campaign" }, "campaignId"],
      [{ ...createKnownInput(), asOf: "not-a-timestamp" }, "asOf"],
      [{ ...createKnownInput(), asOf: "2026-02-30T00:00:00Z" }, "asOf"],
      [{ ...createKnownInput(), asOf: "2026-07-19T01:30:00.1234Z" }, "asOf"],
      [{ ...createKnownInput(), traceId: "trace/unsafe" }, "traceId"],
      [{
        ...createKnownInput(),
        participants: { ...createKnownInput().participants, unique: -1 },
      }, "participants.unique"],
      [{
        ...createKnownInput(),
        participants: { ...createKnownInput().participants, riskFlagged: 1.5 },
      }, "participants.riskFlagged"],
      [{
        ...createKnownInput(),
        participants: { ...createKnownInput().participants, unique: Number.NaN },
      }, "participants.unique"],
      [{
        ...createKnownInput(),
        participants: { ...createKnownInput().participants, unique: Number.POSITIVE_INFINITY },
      }, "participants.unique"],
      [{
        ...createKnownInput(),
        participants: { ...createKnownInput().participants, unique: Number.MAX_SAFE_INTEGER + 1 },
      }, "participants.unique"],
      [{
        ...createKnownInput(),
        points: { ...createKnownInput().points, completionAwarded: Number.NEGATIVE_INFINITY },
      }, "points.completionAwarded"],
      [{
        ...createKnownInput(),
        tasks: [createKnownInput().tasks[0]!, createKnownInput().tasks[0]!],
      }, "tasks.taskId"],
      [{
        ...createKnownInput(),
        participants: {
          ...createKnownInput().participants,
          locales: [{ count: 3, id: "fr-FR" }],
        },
      }, "participants.locales.id"],
      [{
        ...createKnownInput(),
        participants: {
          ...createKnownInput().participants,
          accountTypes: [{ count: 1, id: "AA" }, { count: 2, id: "AA" }],
        },
      }, "participants.accountTypes.id"],
    ];

    for (const [input, field] of invalidCases) {
      expectProjectionError(
        () => createCampaignAnalyticsSnapshot(input),
        "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
        field,
      );
    }

    for (const key of [
      "walletAddress",
      "rawAddress",
      "session",
      "challenge",
      "signature",
      "proof",
      "cookie",
      "csrf",
      "sql",
      "stack",
      "credentialedUrl",
    ]) {
      expectProjectionError(
        () => createCampaignAnalyticsSnapshot({
          ...createKnownInput(),
          [key]: "sensitive-value",
        } as CampaignAnalyticsAggregateInput),
        "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
        key,
      );
    }

    expectProjectionError(
      () => createCampaignAnalyticsSnapshot({
        ...createKnownInput(),
        referrals: {
          availability: "unavailable",
          reasonCode: "SOURCE_INTEGRITY_UNAVAILABLE",
        },
      } as unknown as CampaignAnalyticsAggregateInput),
      "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
      "referrals.reasonCode",
    );
    expectProjectionError(
      () => createCampaignAnalyticsSnapshot({
        ...createKnownInput(),
        sourceSchemaVersions: { unknown_source: "schema-v1" },
      } as CampaignAnalyticsAggregateInput),
      "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
      "sourceSchemaVersions.unknown_source",
    );
  });

  it("preserves all six reconciled review buckets and safe dimensions", () => {
    const input = createEmptyInput();
    const snapshot = createCampaignAnalyticsSnapshot({
      ...input,
      participants: {
        accountTypes: [
          { count: 3, id: "AA" },
          { count: 2, id: "EOA" },
          { count: 1, id: "UNKNOWN" },
        ],
        locales: [{ count: 6, id: "en-US" }],
        riskFlagged: 0,
        unique: 6,
      },
      points: {
        completionAwarded: 0,
        participantAwarded: 0,
        participantsWithPoints: 0,
        participantsWithoutPoints: 6,
      },
      review: {
        approved: 1,
        invalid: 1,
        needsReview: 1,
        rejected: 1,
        stale: 1,
        totalParticipants: 6,
        unreviewed: 1,
      },
    });

    expect(snapshot.reviewBreakdown).toEqual({
      approved: 1,
      invalid: 1,
      needsReview: 1,
      rejected: 1,
      stale: 1,
      totalParticipants: 6,
      unreviewed: 1,
    });
    expect(snapshot.accountTypeBreakdown).toEqual([
      { count: 3, id: "AA", percentage: 0.5 },
      { count: 2, id: "EOA", percentage: 2 / 6 },
      { count: 1, id: "UNKNOWN", percentage: 1 / 6 },
    ]);
  });

  it("rejects the legacy local Analytics KPI array instead of wrapping it as v1", () => {
    const legacyAnalytics = [{
      id: "participants",
      label: { "en-US": "Participants" },
      tone: "good",
      trend: { "en-US": "Seeded preview" },
      value: "3",
    }];

    expectProjectionError(
      () => createCampaignAnalyticsSnapshot(
        legacyAnalytics as unknown as CampaignAnalyticsAggregateInput,
      ),
      "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
      "input",
    );
  });

  it("rejects cyclic legacy payloads with a typed error", () => {
    const input = createKnownInput() as CampaignAnalyticsAggregateInput & {
      legacyAnalytics?: unknown;
    };
    input.legacyAnalytics = input;

    expectProjectionError(
      () => createCampaignAnalyticsSnapshot(input),
      "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
      "legacyAnalytics",
    );
  });

  it("fails closed when aggregate reconciliation does not match", () => {
    const input = createKnownInput();
    const mismatches: readonly [CampaignAnalyticsAggregateInput, string][] = [
      [{
        ...input,
        points: { ...input.points, participantsWithoutPoints: 0 },
      }, "points.participantCounts"],
      [{
        ...input,
        points: {
          completionAwarded: 150,
          participantAwarded: 150,
          participantsWithPoints: 0,
          participantsWithoutPoints: 3,
        },
      }, "points.awarded"],
      [{
        ...input,
        points: {
          completionAwarded: 0,
          participantAwarded: 0,
          participantsWithPoints: 2,
          participantsWithoutPoints: 1,
        },
      }, "points.awarded"],
      [{
        ...input,
        points: { ...input.points, participantAwarded: 149 },
      }, "points.awarded"],
      [{
        ...input,
        points: {
          completionAwarded: 1,
          participantAwarded: 1,
          participantsWithPoints: 2,
          participantsWithoutPoints: 1,
        },
      }, "points.awarded"],
      [{
        ...input,
        review: { ...input.review, unreviewed: 0 },
      }, "review.buckets"],
      [{
        ...input,
        completions: { ...input.completions, verified: 1 },
      }, "completions.verified"],
      [{
        ...input,
        completions: { ...input.completions, pending: 0 },
      }, "completions.total"],
      [{
        ...input,
        tasks: [
          { ...input.tasks[0]!, activityParticipants: 1 },
          input.tasks[1]!,
        ],
      }, "completions.total"],
      [{
        ...input,
        referrals: { availability: "available", qualified: 3, total: 2 },
      }, "referrals.qualified"],
      [{
        ...input,
        participants: {
          ...input.participants,
          accountTypes: [{ count: 4, id: "AA" }],
        },
      }, "participants.accountTypes.count"],
      [{
        ...input,
        tasks: [{ ...input.tasks[0]!, verifiedParticipants: 4 }],
      }, "tasks.verifiedParticipants"],
    ];

    for (const [candidate, field] of mismatches) {
      expectProjectionError(
        () => createCampaignAnalyticsSnapshot(candidate),
        "CAMPAIGN_ANALYTICS_INTEGRITY_FAILED",
        field,
      );
    }
  });
});
