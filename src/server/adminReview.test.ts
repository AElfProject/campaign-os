import { performance } from "node:perf_hooks";
import { describe, expect, it, vi } from "vitest";
import {
  AdminReviewStoreError,
  deriveAdminReviewDecisionPayloadHash,
} from "./adminReviewStore";
import type {
  AdminExportArtifactProjectionSource,
  AdminReviewDecisionInput,
  AdminReviewDecisionRecord,
  AdminReviewJsonObject,
  AdminReviewSnapshotProjector,
  AdminReviewSnapshotRows,
  AdminReviewStore,
} from "./adminReviewStore";
import {
  AdminReviewDomainError,
  canonicalizeAdminReviewJson,
  projectAdminReviewCampaignFeed,
  projectAdminReviewDetail,
  projectAdminReviewQueue,
  projectAdminReviewSnapshot,
  projectAdminReviewSnapshots,
  projectAdminReviewWinnerSource,
  projectAdminReviewWinnerSourceFromStoreSnapshot,
  readAdminReviewDetail,
  readAdminReviewQueue,
  readAdminReviewWinnerSource,
  resolveAdminReviewState,
  submitAdminReviewDecision,
  type AdminReviewSnapshot,
} from "./adminReview";

const generatedAt = "2026-07-15T01:00:00.000Z";

const createRows = (): AdminReviewSnapshotRows => ({
  campaign: {
    contractMode: "OFF_CHAIN_MVP",
    endTime: "2026-08-15T00:00:00.000Z",
    id: "campaign-review-0001",
    startTime: "2026-08-01T00:00:00.000Z",
    status: "ended",
    updatedAt: "2026-07-15T00:00:01.000Z",
    walletPolicy: "ANY",
  },
  completions: [
    {
      accountType: "EOA",
      campaignId: "campaign-review-0001",
      completedAt: "2026-07-15T00:10:00.000Z",
      id: "completion-b",
      pointsAwarded: 70,
      status: "completed",
      taskId: "task-b",
      updatedAt: "2026-07-15T00:10:01.000Z",
      walletAddress: "2F4ReviewParticipant",
      walletSource: "PORTKEY_EOA_EXTENSION",
    },
    {
      accountType: "EOA",
      campaignId: "campaign-review-0001",
      completedAt: "2026-07-15T00:05:00.000Z",
      id: "completion-a",
      pointsAwarded: 50,
      status: "completed",
      taskId: "task-a",
      updatedAt: "2026-07-15T00:05:01.000Z",
      walletAddress: "2F4ReviewParticipant",
      walletSource: "PORTKEY_EOA_EXTENSION",
    },
  ],
  evidence: [
    {
      campaignId: "campaign-review-0001",
      capturedAt: "2026-07-15T00:10:02.000Z",
      completionId: "completion-b",
      diagnosticCodes: ["safe-warning", "safe-warning", "manual-check"],
      evidenceHash: "evidence-hash-b",
      evidenceRef: "evidence-ref-b",
      evidenceSource: "AELFSCAN",
      id: "evidence-b",
      pointsAwarded: 70,
      status: "completed",
      taskId: "task-b",
      updatedAt: "2026-07-15T00:10:03.000Z",
      walletAddress: "2F4ReviewParticipant",
    },
    {
      campaignId: "campaign-review-0001",
      capturedAt: "2026-07-15T00:05:02.000Z",
      completionId: "completion-a",
      diagnosticCodes: [],
      evidenceHash: "evidence-hash-a",
      evidenceSource: "AELFSCAN",
      id: "evidence-a",
      pointsAwarded: 50,
      status: "completed",
      taskId: "task-a",
      updatedAt: "2026-07-15T00:05:03.000Z",
      walletAddress: "2F4ReviewParticipant",
    },
  ],
  participants: [{
    accountType: "EOA",
    campaignId: "campaign-review-0001",
    createdAt: "2026-07-15T00:00:02.000Z",
    id: "participant-review-0001",
    rank: 1,
    riskFlags: ["info:late-index", "info:late-index"],
    totalPoints: 120,
    updatedAt: "2026-07-15T00:10:04.000Z",
    walletAddress: "2F4ReviewParticipant",
    walletSource: "PORTKEY_EOA_EXTENSION",
    walletTypeVerified: true,
  }],
  ranking: [{
    campaignId: "campaign-review-0001",
    createdAt: "2026-07-15T00:10:04.000Z",
    participantId: "participant-review-0001",
    rank: 1,
    totalPoints: 120,
    walletAddress: "2F4ReviewParticipant",
  }],
  tasks: [
    {
      campaignId: "campaign-review-0001",
      id: "task-b",
      points: 70,
      required: false,
      updatedAt: "2026-07-15T00:00:04.000Z",
      verificationType: "ON_CHAIN",
      walletCompatibility: "ANY",
    },
    {
      campaignId: "campaign-review-0001",
      id: "task-a",
      points: 50,
      required: true,
      updatedAt: "2026-07-15T00:00:03.000Z",
      verificationType: "ON_CHAIN",
      walletCompatibility: "ANY",
    },
  ],
});

const cloneRows = (rows: AdminReviewSnapshotRows): AdminReviewSnapshotRows =>
  structuredClone(rows) as AdminReviewSnapshotRows;

const createSnapshot = (): AdminReviewSnapshot => projectAdminReviewSnapshot(createRows(), {
  generatedAt,
  participantId: "participant-review-0001",
  traceId: "trace-review-snapshot-fixture",
});

const createDecision = (
  snapshot: AdminReviewSnapshot,
  overrides: Partial<AdminReviewDecisionRecord> = {},
): AdminReviewDecisionRecord => {
  const record: AdminReviewDecisionRecord = {
    campaignId: snapshot.manifest.campaign.id,
    decidedAt: "2026-07-15T01:10:00.000Z",
    decision: "approved",
    id: "decision-review-0001",
    idempotencyKeyHash: "2".repeat(64),
    note: "Evidence reviewed.",
    operatorRole: "review_operator",
    operatorSubject: "2F4ReviewOperator",
    participantId: snapshot.manifest.participant.id,
    payloadHash: "",
    reasonCode: "evidence_verified",
    snapshotFingerprint: snapshot.fingerprint,
    snapshotManifest: snapshot.manifest as unknown as AdminReviewJsonObject,
    snapshotVersion: "review-snapshot-v1",
    traceId: "trace-decision-review-0001",
    version: 1,
    walletAddress: snapshot.walletAddress,
    ...overrides,
  };
  if (overrides.payloadHash === undefined) {
    record.payloadHash = deriveAdminReviewDecisionPayloadHash({
      campaignId: record.campaignId,
      decision: record.decision,
      expectedSnapshotFingerprint: record.snapshotFingerprint,
      ...(record.note === undefined ? {} : { note: record.note }),
      operatorRole: record.operatorRole,
      operatorSubject: record.operatorSubject,
      participantId: record.participantId,
      reasonCode: record.reasonCode,
    });
  }
  return record;
};

const createScaleRows = (
  participantCount: number,
  taskCount: number,
  options: { walletPadding?: number } = {},
): AdminReviewSnapshotRows => {
  const campaignId = "campaign-review-scale";
  const tasks = Array.from({ length: taskCount }, (_, taskIndex) => ({
    campaignId,
    id: `task-scale-${taskIndex.toString().padStart(2, "0")}`,
    points: 10,
    required: true,
    updatedAt: "2026-07-15T00:00:04.000Z",
    verificationType: "ON_CHAIN" as const,
    walletCompatibility: "ANY" as const,
  }));
  const participants = Array.from({ length: participantCount }, (_, participantIndex) => {
    const suffix = participantIndex.toString().padStart(5, "0");
    return {
      accountType: "EOA" as const,
      campaignId,
      createdAt: "2026-07-15T00:00:02.000Z",
      id: `participant-scale-${suffix}`,
      rank: participantIndex + 1,
      riskFlags: [] as string[],
      totalPoints: taskCount * 10,
      updatedAt: "2026-07-15T00:10:04.000Z",
      walletAddress: `2F4Scale${suffix}${"x".repeat(options.walletPadding ?? 0)}`,
      walletSource: "PORTKEY_EOA_EXTENSION" as const,
      walletTypeVerified: true,
    };
  });

  return {
    campaign: {
      contractMode: "OFF_CHAIN_MVP",
      endTime: "2026-08-15T00:00:00.000Z",
      id: campaignId,
      startTime: "2026-08-01T00:00:00.000Z",
      status: "ended",
      updatedAt: "2026-07-15T00:00:01.000Z",
      walletPolicy: "ANY",
    },
    completions: participants.flatMap((participant) => tasks.map((task) => ({
      accountType: participant.accountType,
      campaignId,
      completedAt: "2026-07-15T00:10:00.000Z",
      id: `completion-${participant.id}-${task.id}`,
      pointsAwarded: task.points,
      status: "completed" as const,
      taskId: task.id,
      updatedAt: "2026-07-15T00:10:01.000Z",
      walletAddress: participant.walletAddress,
      walletSource: participant.walletSource,
    }))),
    evidence: participants.flatMap((participant) => tasks.map((task) => ({
      campaignId,
      capturedAt: "2026-07-15T00:10:02.000Z",
      completionId: `completion-${participant.id}-${task.id}`,
      diagnosticCodes: [] as string[],
      evidenceHash: `hash-${participant.id}-${task.id}`,
      evidenceSource: "AELFSCAN" as const,
      id: `evidence-${participant.id}-${task.id}`,
      pointsAwarded: task.points,
      status: "completed" as const,
      taskId: task.id,
      updatedAt: "2026-07-15T00:10:03.000Z",
      walletAddress: participant.walletAddress,
    }))),
    participants,
    ranking: participants.map((participant) => ({
      campaignId,
      createdAt: "2026-07-15T00:10:04.000Z",
      participantId: participant.id,
      rank: participant.rank,
      totalPoints: participant.totalPoints,
      walletAddress: participant.walletAddress,
    })),
    tasks,
  };
};

describe("Admin review canonical snapshot", () => {
  it("projects a deterministic identity-safe snapshot with canonical ordering", () => {
    const rows = createRows();
    const snapshot = projectAdminReviewSnapshot(rows, {
      generatedAt,
      participantId: "participant-review-0001",
      traceId: "trace-review-snapshot",
    });
    const reordered = projectAdminReviewSnapshot({
      ...rows,
      completions: [...rows.completions].reverse(),
      evidence: [...rows.evidence].reverse(),
      participants: [...rows.participants].reverse(),
      ranking: [...rows.ranking].reverse(),
      tasks: [...rows.tasks].reverse(),
    }, {
      generatedAt: "2026-07-15T02:00:00.000Z",
      participantId: "participant-review-0001",
      traceId: "trace-review-snapshot-other",
    });

    expect(snapshot.fingerprintVersion).toBe("review-snapshot-v1");
    expect(snapshot.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(snapshot.generatedAt).toBe(generatedAt);
    expect(snapshot.manifest.tasks.map(({ id }) => id)).toEqual(["task-a", "task-b"]);
    expect(snapshot.manifest.completions.map(({ id }) => id)).toEqual([
      "completion-a",
      "completion-b",
    ]);
    expect(snapshot.manifest.evidence.map(({ id }) => id)).toEqual([
      "evidence-a",
      "evidence-b",
    ]);
    expect(snapshot.manifest.participant.riskFlags).toEqual(["info:late-index"]);
    expect(snapshot.manifest.evidence[1]?.diagnosticCodes).toEqual([
      "manual-check",
      "safe-warning",
    ]);
    expect(reordered.fingerprint).toBe(snapshot.fingerprint);
    expect(reordered.canonicalJson).toBe(snapshot.canonicalJson);
  });

  it("changes the fingerprint when each representative authoritative fact changes", () => {
    const baseline = projectAdminReviewSnapshot(createRows(), {
      generatedAt,
      participantId: "participant-review-0001",
      traceId: "trace-review-baseline",
    }).fingerprint;
    const mutations: Array<[string, (rows: AdminReviewSnapshotRows) => void]> = [
      ["required Task", (rows) => { (rows.tasks[0] as { required: boolean }).required = true; }],
      ["Completion status", (rows) => { (rows.completions[0] as { status: "failed" }).status = "failed"; }],
      ["Completion points", (rows) => { (rows.completions[0] as { pointsAwarded: number }).pointsAwarded = 69; }],
      ["Evidence hash", (rows) => { (rows.evidence[0] as { evidenceHash: string }).evidenceHash = "changed-hash"; }],
      ["Evidence ref", (rows) => { (rows.evidence[0] as { evidenceRef?: string }).evidenceRef = "changed-ref"; }],
      ["Participant points", (rows) => {
        (rows.participants[0] as { totalPoints: number }).totalPoints = 121;
        (rows.ranking[0] as { totalPoints: number }).totalPoints = 121;
      }],
      ["Participant rank", (rows) => {
        (rows.participants[0] as { rank?: number }).rank = 2;
        (rows.ranking[0] as { rank?: number }).rank = 2;
      }],
      ["Participant risk", (rows) => {
        (rows.participants[0] as unknown as { riskFlags: string[] }).riskFlags = ["manual-review"];
      }],
      ["Evidence source", (rows) => {
        (rows.evidence[0] as { evidenceSource: "AEFINDER" }).evidenceSource = "AEFINDER";
      }],
    ];

    for (const [field, mutate] of mutations) {
      const rows = cloneRows(createRows());
      mutate(rows);
      expect(projectAdminReviewSnapshot(rows, {
        generatedAt,
        participantId: "participant-review-0001",
        traceId: `trace-review-${field.replace(/\s+/g, "-")}`,
      }).fingerprint, field).not.toBe(baseline);
    }
  });

  it("includes live provider execution and attempt linkage in the canonical fingerprint", () => {
    const localSnapshot = createSnapshot();
    const rows = createRows();
    Object.assign(rows.evidence[0]!, {
      liveProviderExecuted: true,
      verificationAttemptId: "attempt-admin-live-0001",
    });
    const liveSnapshot = projectAdminReviewSnapshot(rows, {
      generatedAt,
      participantId: "participant-review-0001",
      traceId: "trace-review-live-provenance",
    });
    const liveEvidence = liveSnapshot.manifest.evidence.find(({ id }) => id === "evidence-b") as
      unknown as { liveProviderExecuted: boolean; verificationAttemptId: string };

    expect(liveEvidence).toMatchObject({
      liveProviderExecuted: true,
      verificationAttemptId: "attempt-admin-live-0001",
    });
    expect(liveSnapshot.fingerprint).not.toBe(localSnapshot.fingerprint);
    expect(resolveAdminReviewState(
      liveSnapshot.fingerprint,
      [createDecision(localSnapshot)],
      { traceId: "trace-review-live-provenance-stale" },
    )).toMatchObject({ state: "stale" });
    expect(projectAdminReviewWinnerSource(
      [liveSnapshot],
      [createDecision(localSnapshot)],
      { traceId: "trace-review-live-provenance-winner" },
    ).rowCount).toBe(0);
  });

  it.each([
    ["missing attempt", { liveProviderExecuted: true }],
    ["manual live source", {
      liveProviderExecuted: true,
      verificationAttemptId: "attempt-admin-invalid-manual",
      evidenceSource: "MANUAL",
    }],
    ["non-live attempt", {
      liveProviderExecuted: false,
      verificationAttemptId: "attempt-admin-invalid-local",
    }],
  ] as const)("fails closed for invalid provider provenance: %s", (_label, mutation) => {
    const rows = createRows();
    Object.assign(rows.evidence[0]!, mutation);

    expect(() => projectAdminReviewSnapshot(rows, {
      generatedAt,
      participantId: "participant-review-0001",
      traceId: "trace-review-invalid-provider-provenance",
    })).toThrowError(expect.objectContaining({
      code: "ADMIN_REVIEW_DOMAIN_INVALID_FACTS",
    }));
  });

  it("projects a complete zero-state without inferring approval or eligibility", () => {
    const rows = createRows();
    const zeroRows = { ...rows, completions: [], evidence: [] };
    const snapshot = projectAdminReviewSnapshot(zeroRows, {
      generatedAt,
      participantId: "participant-review-0001",
      traceId: "trace-review-zero",
    });

    expect(snapshot.manifest.completions).toEqual([]);
    expect(snapshot.manifest.evidence).toEqual([]);
    expect(snapshot.manifest.participant.eligible).toBe(false);
    expect(snapshot.manifest.participant.missingTaskIds).toEqual(["task-a"]);
    expect(snapshot.taskCoverage).toEqual({
      completed: 0,
      evidence: 0,
      required: 1,
      total: 2,
    });
    expect(snapshot.manifest.participant.diagnosticCodes).toEqual([
      "COMPLETION_POINTS_TOTAL_MISMATCH",
    ]);
  });

  it("preserves persisted points while surfacing a safe aggregate diagnostic", () => {
    const rows = createRows();
    (rows.participants[0] as { totalPoints: number }).totalPoints = 999;
    (rows.ranking[0] as { totalPoints: number }).totalPoints = 999;

    const snapshot = projectAdminReviewSnapshot(rows, {
      generatedAt,
      participantId: "participant-review-0001",
      traceId: "trace-review-points-diagnostic",
    });

    expect(snapshot.manifest.participant.totalPoints).toBe(999);
    expect(snapshot.manifest.participant.diagnosticCodes).toEqual([
      "COMPLETION_POINTS_TOTAL_MISMATCH",
    ]);
    expect(snapshot.manifest.participant.eligible).toBe(false);
  });

  it.each([
    ["Campaign wallet policy", (rows: AdminReviewSnapshotRows) => {
      (rows.campaign as { walletPolicy: "AA_ONLY" }).walletPolicy = "AA_ONLY";
    }, "CAMPAIGN_WALLET_POLICY_INCOMPATIBLE"],
    ["Task wallet policy", (rows: AdminReviewSnapshotRows) => {
      (rows.tasks[0] as { walletCompatibility: "AA_ONLY" }).walletCompatibility = "AA_ONLY";
    }, "TASK_WALLET_POLICY_INCOMPATIBLE"],
  ] as const)("fails closed when %s conflicts with the Participant account", (
    _caseName,
    mutate,
    diagnostic,
  ) => {
    const rows = createRows();
    mutate(rows);

    const snapshot = projectAdminReviewSnapshot(rows, {
      generatedAt,
      participantId: "participant-review-0001",
      traceId: "trace-review-wallet-policy",
    });

    expect(snapshot.manifest.participant.eligible).toBe(false);
    expect(snapshot.manifest.participant.diagnosticCodes).toContain(diagnostic);
  });

  it("uses explicit null and empty canonical values for optional facts", () => {
    const rows = createRows();
    delete (rows.participants[0] as { rank?: number }).rank;
    delete (rows.ranking[0] as { rank?: number }).rank;
    (rows.participants[0] as unknown as { riskFlags: string[] }).riskFlags = [];
    delete (rows.completions[0] as { completedAt?: string }).completedAt;
    delete (rows.evidence[0] as { evidenceRef?: string }).evidenceRef;

    const snapshot = projectAdminReviewSnapshot(rows, {
      generatedAt,
      participantId: "participant-review-0001",
      traceId: "trace-review-optionals",
    });

    expect(snapshot.manifest.participant.rank).toBeNull();
    expect(snapshot.manifest.participant.riskFlags).toEqual([]);
    expect(snapshot.manifest.completions[1]?.completedAt).toBeNull();
    expect(snapshot.manifest.evidence[1]?.evidenceRef).toBeNull();
  });

  it.each([
    ["duplicate Task", (rows: AdminReviewSnapshotRows) => {
      (rows.tasks as AdminReviewSnapshotRows["tasks"] as unknown as unknown[]).push(rows.tasks[0]);
    }, "taskId"],
    ["cross-wallet Completion", (rows: AdminReviewSnapshotRows) => {
      (rows.completions[0] as { walletAddress: string }).walletAddress = "2F4OtherWallet";
    }, "walletAddress"],
    ["orphan Evidence", (rows: AdminReviewSnapshotRows) => {
      (rows.evidence[0] as { completionId?: string }).completionId = "completion-missing";
    }, "completionId"],
    ["cross-Campaign Evidence", (rows: AdminReviewSnapshotRows) => {
      (rows.evidence[0] as { campaignId: string }).campaignId = "campaign-other";
    }, "campaignId"],
  ])("fails closed for %s", (_caseName, mutate, field) => {
    const rows = cloneRows(createRows());
    mutate(rows);

    expect(() => projectAdminReviewSnapshot(rows, {
      generatedAt,
      participantId: "participant-review-0001",
      traceId: "trace-review-invalid-link",
    })).toThrowError(expect.objectContaining({
      code: "ADMIN_REVIEW_DOMAIN_INVALID_FACTS",
      field,
      traceId: "trace-review-invalid-link",
    }));
  });

  it("groups multiple Participants once and returns stable Participant order", () => {
    const rows = createRows();
    const second = cloneRows(rows);
    const participant = second.participants[0]!;
    const walletAddress = "2F4AnotherParticipant";
    const participantId = "participant-review-0000";
    const merged: AdminReviewSnapshotRows = {
      ...rows,
      completions: [
        ...rows.completions,
        ...second.completions.map((row) => ({ ...row, id: `${row.id}-2`, walletAddress })),
      ],
      evidence: [
        ...rows.evidence,
        ...second.evidence.map((row) => ({
          ...row,
          completionId: row.completionId ? `${row.completionId}-2` : undefined,
          id: `${row.id}-2`,
          walletAddress,
        })),
      ],
      participants: [
        participant,
        { ...participant, id: participantId, rank: 2, walletAddress },
      ],
      ranking: [
        ...rows.ranking,
        { ...rows.ranking[0]!, participantId, rank: 2, walletAddress },
      ],
    };
    const snapshots = projectAdminReviewSnapshots(merged, {
      generatedAt,
      traceId: "trace-review-many",
    });

    expect(snapshots.map(({ manifest }) => manifest.participant.id)).toEqual([
      participantId,
      "participant-review-0001",
    ]);
    expect(snapshots.every(({ manifest }) => manifest.completions.length === 2)).toBe(true);
  });

  it("rejects unknown row fields and oversized authoritative values", () => {
    const unsafeRows = createRows() as AdminReviewSnapshotRows & {
      participants: Array<AdminReviewSnapshotRows["participants"][number] & { rawProof?: string }>;
    };
    unsafeRows.participants[0]!.rawProof = "must-not-project";

    expect(() => projectAdminReviewSnapshot(unsafeRows, {
      generatedAt,
      participantId: "participant-review-0001",
      traceId: "trace-review-unknown-shape",
    })).toThrowError(expect.objectContaining({
      code: "ADMIN_REVIEW_DOMAIN_INVALID_FACTS",
      field: "participants",
    }));

    const oversizedRows = createRows();
    (oversizedRows.evidence[0] as { evidenceRef?: string }).evidenceRef = "x".repeat(4_097);
    expect(() => projectAdminReviewSnapshot(oversizedRows, {
      generatedAt,
      participantId: "participant-review-0001",
      traceId: "trace-review-oversized",
    })).toThrowError(expect.objectContaining({
      code: "ADMIN_REVIEW_DOMAIN_BOUND_EXCEEDED",
      field: "evidenceRef",
    }));
  });
});

describe("Admin review canonical JSON guard", () => {
  it("sorts object keys and rejects unsupported or unsafe values", () => {
    expect(canonicalizeAdminReviewJson({ b: 2, a: [true, null, "safe"] }, {
      field: "manifest",
      traceId: "trace-review-json",
    })).toBe('{"a":[true,null,"safe"],"b":2}');

    for (const value of [
      { invalid: undefined },
      { invalid: Number.NaN },
      { invalid: Number.POSITIVE_INFINITY },
      new Date(),
    ]) {
      expect(() => canonicalizeAdminReviewJson(value as never, {
        field: "manifest",
        traceId: "trace-review-json",
      })).toThrow(AdminReviewDomainError);
    }

    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => canonicalizeAdminReviewJson(cyclic as never, {
      field: "manifest",
      traceId: "trace-review-json-cycle",
    })).toThrowError(expect.objectContaining({
      code: "ADMIN_REVIEW_DOMAIN_INVALID_FACTS",
      field: "manifest",
    }));
  });

  it("rejects oversized canonical collections before hashing", () => {
    expect(() => canonicalizeAdminReviewJson(
      Array.from({ length: 5_001 }, () => null),
      { field: "manifest", traceId: "trace-review-json-bound" },
    )).toThrowError(expect.objectContaining({
      code: "ADMIN_REVIEW_DOMAIN_BOUND_EXCEEDED",
      field: "manifest",
    }));
  });

  it("keeps domain errors bounded and free of sensitive values", () => {
    const unsafe = "token signature proof SELECT postgresql://secret /Users/private";
    let error: unknown;
    try {
      canonicalizeAdminReviewJson({ value: undefined, unsafe } as never, {
        field: "manifest",
        traceId: "trace-review-safe-error",
      });
    } catch (caught) {
      error = caught;
    }

    const serialized = JSON.stringify(error);
    expect(serialized).not.toContain(unsafe);
    expect(serialized).not.toContain("token");
    expect(serialized).not.toContain("signature");
    expect(serialized).not.toContain("proof");
    expect(serialized).not.toContain("postgresql://");
    expect(serialized).not.toContain("/Users/");
    expect(error).not.toHaveProperty("stack");
  });
});

describe("Admin review Campaign feed", () => {
  it("preserves repository summaries with stable ordering and a strict bound", () => {
    const campaigns = projectAdminReviewCampaignFeed([
      {
        campaignId: "campaign-review-b",
        ownerAddress: "2F4OwnerB",
        participantCount: 2,
        projectId: "project-b",
        status: "ended",
        taskCount: 3,
      },
      {
        campaignId: "campaign-review-a",
        ownerAddress: "2F4OwnerA",
        participantCount: 7,
        projectId: "project-a",
        status: "draft",
        taskCount: 4,
      },
    ], {
      limit: 2,
      traceId: "trace-review-campaign-feed",
    });

    expect(campaigns).toEqual([
      expect.objectContaining({
        campaignId: "campaign-review-a",
        participantCount: 7,
        status: "draft",
        taskCount: 4,
      }),
      expect.objectContaining({
        campaignId: "campaign-review-b",
        participantCount: 2,
        status: "ended",
        taskCount: 3,
      }),
    ]);
    expect(Object.isFrozen(campaigns)).toBe(true);
    expect(() => projectAdminReviewCampaignFeed([
      {
        campaignId: "campaign-review-a",
        ownerAddress: "2F4OwnerA",
        participantCount: 0,
        projectId: "project-a",
        status: "draft",
        taskCount: 0,
      },
      {
        campaignId: "campaign-review-a",
        ownerAddress: "2F4OwnerB",
        participantCount: 0,
        projectId: "project-b",
        status: "ended",
        taskCount: 0,
      },
    ], {
      traceId: "trace-review-campaign-feed-duplicate",
    })).toThrowError(expect.objectContaining({
      code: "ADMIN_REVIEW_DOMAIN_INVALID_FACTS",
      field: "campaignId",
    }));
    expect(() => projectAdminReviewCampaignFeed([{
      campaignId: "campaign-review-a",
      ownerAddress: "2F4OwnerA",
      participantCount: 0,
      projectId: "project-a",
      status: "draft",
      taskCount: 0,
      unsafe: "private",
    } as never], {
      traceId: "trace-review-campaign-feed-shape",
    })).toThrowError(expect.objectContaining({
      code: "ADMIN_REVIEW_DOMAIN_INVALID_FACTS",
      field: "campaigns",
    }));
    expect(() => projectAdminReviewCampaignFeed([], {
      limit: 101,
      traceId: "trace-review-campaign-feed-limit",
    })).toThrowError(expect.objectContaining({
      code: "ADMIN_REVIEW_DOMAIN_BOUND_EXCEEDED",
      field: "limit",
    }));
  });
});

describe("Admin review queue and detail state", () => {
  it.each([
    [undefined, "pending_review"],
    ["approved", "approved_current"],
    ["rejected", "rejected_current"],
    ["needs_review", "needs_review_current"],
  ] as const)("maps %s latest decision to %s", (decision, expectedState) => {
    const snapshot = createSnapshot();
    const history = decision === undefined
      ? []
      : [createDecision(snapshot, { decision })];

    expect(resolveAdminReviewState(snapshot.fingerprint, history, {
      traceId: "trace-review-state",
    })).toEqual({
      latestDecision: history[0],
      state: expectedState,
    });
  });

  it("uses only the highest version and marks every mismatched latest decision stale", () => {
    const snapshot = createSnapshot();
    const history = [
      createDecision(snapshot, { id: "decision-v1", version: 1 }),
      createDecision(snapshot, {
        decision: "rejected",
        id: "decision-v2",
        snapshotFingerprint: "9".repeat(64),
        version: 2,
      }),
    ];

    expect(resolveAdminReviewState(snapshot.fingerprint, history, {
      traceId: "trace-review-state-latest",
    })).toEqual({
      latestDecision: history[1],
      state: "stale",
    });
  });

  it("projects bounded queue summaries and stable Participant order", () => {
    const rows = createRows();
    const second = cloneRows(rows);
    const participantId = "participant-review-0000";
    const walletAddress = "2F4AnotherParticipant";
    const merged: AdminReviewSnapshotRows = {
      ...rows,
      completions: [
        ...rows.completions,
        ...second.completions.map((row) => ({ ...row, id: `${row.id}-2`, walletAddress })),
      ],
      evidence: [
        ...rows.evidence,
        ...second.evidence.map((row) => ({
          ...row,
          completionId: row.completionId ? `${row.completionId}-2` : undefined,
          id: `${row.id}-2`,
          walletAddress,
        })),
      ],
      participants: [
        rows.participants[0]!,
        { ...second.participants[0]!, id: participantId, rank: 2, walletAddress },
      ],
      ranking: [
        rows.ranking[0]!,
        { ...second.ranking[0]!, participantId, rank: 2, walletAddress },
      ],
    };
    const snapshots = projectAdminReviewSnapshots(merged, {
      generatedAt,
      traceId: "trace-review-queue-snapshots",
    });
    const approved = createDecision(snapshots[1]!);

    const queue = projectAdminReviewQueue(snapshots, [approved], {
      limit: 10,
      traceId: "trace-review-queue",
    });

    expect(queue.map(({ participantId: id }) => id)).toEqual([
      participantId,
      "participant-review-0001",
    ]);
    expect(queue[0]).toMatchObject({
      currentFingerprint: snapshots[0]!.fingerprint,
      latestDecision: undefined,
      reviewState: "pending_review",
      taskCoverage: { completed: 2, evidence: 2, required: 1, total: 2 },
    });
    expect(queue[1]).toMatchObject({
      latestDecision: {
        decision: "approved",
        id: "decision-review-0001",
        version: 1,
      },
      reviewState: "approved_current",
    });
    expect(queue[1]).not.toHaveProperty("snapshot");
    expect(queue[1]?.latestDecision).not.toHaveProperty("note");
    expect(queue[1]?.latestDecision).toMatchObject({
      operatorRole: "review_operator",
      operatorSubject: "2F4ReviewOperator",
    });
  });

  it("projects detail with current snapshot and deterministic bounded history", () => {
    const snapshot = createSnapshot();
    const history = [
      createDecision(snapshot, { id: "decision-v1", version: 1 }),
      createDecision(snapshot, {
        decision: "needs_review",
        id: "decision-v2",
        reasonCode: "manual_review_required",
        version: 2,
      }),
    ];

    const detail = projectAdminReviewDetail(snapshot, history.reverse(), {
      historyLimit: 10,
      traceId: "trace-review-detail",
    });

    expect(detail.reviewState).toBe("needs_review_current");
    expect(detail.history.map(({ version }) => version)).toEqual([2, 1]);
    expect(detail.snapshot).toBe(snapshot);
    expect(detail.latestDecision).toMatchObject({ id: "decision-v2", version: 2 });
    expect(JSON.stringify(detail)).not.toContain("idempotencyKeyHash");
    expect(detail.history[0]?.payloadHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(detail)).not.toContain("snapshotManifest");
  });

  it("validates queue filters and rejects cross-Campaign decision history", () => {
    const snapshot = createSnapshot();
    expect(() => projectAdminReviewQueue([snapshot], [], {
      limit: 101,
      traceId: "trace-review-queue-limit",
    })).toThrowError(expect.objectContaining({
      code: "ADMIN_REVIEW_DOMAIN_BOUND_EXCEEDED",
      field: "limit",
    }));

    expect(() => projectAdminReviewDetail(snapshot, [createDecision(snapshot, {
      campaignId: "campaign-other",
    })], {
      traceId: "trace-review-detail-cross-campaign",
    })).toThrowError(expect.objectContaining({
      code: "ADMIN_REVIEW_DOMAIN_INVALID_FACTS",
      field: "campaignId",
    }));
  });

  it("rejects mixed Campaign snapshots and cross-wallet queue authority", () => {
    const snapshot = createSnapshot();
    const otherRows = createRows();
    (otherRows.campaign as { id: string }).id = "campaign-review-other";
    for (const collection of [
      otherRows.tasks,
      otherRows.participants,
      otherRows.completions,
      otherRows.evidence,
      otherRows.ranking,
    ]) {
      for (const row of collection) {
        (row as { campaignId: string }).campaignId = "campaign-review-other";
      }
    }
    (otherRows.participants[0] as { id: string }).id = "participant-review-other";
    (otherRows.ranking[0] as { participantId: string }).participantId = "participant-review-other";
    const other = projectAdminReviewSnapshot(otherRows, {
      generatedAt,
      participantId: "participant-review-other",
      traceId: "trace-review-other-campaign",
    });

    expect(() => projectAdminReviewQueue([snapshot, other], [], {
      traceId: "trace-review-mixed-campaigns",
    })).toThrowError(expect.objectContaining({
      code: "ADMIN_REVIEW_DOMAIN_INVALID_FACTS",
      field: "campaignId",
    }));
    expect(() => projectAdminReviewQueue([snapshot], [createDecision(snapshot, {
      walletAddress: "2F4WrongWallet",
    })], {
      traceId: "trace-review-cross-wallet-queue",
    })).toThrowError(expect.objectContaining({
      code: "ADMIN_REVIEW_DOMAIN_INVALID_FACTS",
      field: "walletAddress",
    }));
  });
});

describe("Admin review store orchestration", () => {
  it("reads queue, detail, and winner authority only through the AdminReviewStore port", async () => {
    const rows = createRows();
    const snapshot = createSnapshot();
    const decision = createDecision(snapshot);
    const store = {
      getCurrentDecision: vi.fn(async () => decision),
      listDecisions: vi.fn(async () => [decision]),
      readSnapshot: vi.fn(async () => rows),
    } as unknown as AdminReviewStore;

    const queue = await readAdminReviewQueue(store, {
      campaignId: "campaign-review-0001",
      generatedAt,
      limit: 10,
      state: "approved_current",
      traceId: "trace-review-store-queue",
    });
    const detail = await readAdminReviewDetail(store, {
      campaignId: "campaign-review-0001",
      generatedAt,
      historyLimit: 10,
      participantId: "participant-review-0001",
      traceId: "trace-review-store-detail",
    });
    const winner = await readAdminReviewWinnerSource(store, {
      campaignId: "campaign-review-0001",
      generatedAt,
      traceId: "trace-review-store-winner",
    });

    expect(queue).toEqual([expect.objectContaining({
      participantId: "participant-review-0001",
      reviewState: "approved_current",
    })]);
    expect(detail).toMatchObject({
      reviewState: "approved_current",
      snapshot: { fingerprint: snapshot.fingerprint },
    });
    expect(winner).toMatchObject({
      rowCount: 1,
      rows: [{ participantId: "participant-review-0001" }],
    });
    expect(store.readSnapshot).toHaveBeenCalledTimes(3);
    expect(store.readSnapshot).toHaveBeenNthCalledWith(1, {
      campaignId: "campaign-review-0001",
    }, { traceId: "trace-review-store-queue" });
    expect(store.readSnapshot).toHaveBeenNthCalledWith(2, {
      campaignId: "campaign-review-0001",
      participantId: "participant-review-0001",
    }, { traceId: "trace-review-store-detail" });
    expect(store.getCurrentDecision).toHaveBeenCalledTimes(2);
    expect(store.listDecisions).toHaveBeenCalledWith({
      campaignId: "campaign-review-0001",
      limit: 10,
      participantId: "participant-review-0001",
    }, { traceId: "trace-review-store-detail" });
  });

  it("maps typed and opaque store failures and rejects cross-wallet authority", async () => {
    const typedFailure = {
      getCurrentDecision: vi.fn(async () => undefined),
      readSnapshot: vi.fn(async () => {
        throw new AdminReviewStoreError({
          code: "ADMIN_REVIEW_STORE_QUERY_FAILED",
          field: "postgresql://secret",
          operation: "readSnapshot",
          traceId: "trace-private-store",
        });
      }),
    } as unknown as AdminReviewStore;
    await expect(readAdminReviewQueue(typedFailure, {
      campaignId: "campaign-review-0001",
      generatedAt,
      traceId: "trace-review-store-typed-error",
    })).rejects.toMatchObject({
      code: "ADMIN_REVIEW_DOMAIN_UNAVAILABLE",
      field: "store",
      traceId: "trace-review-store-typed-error",
    });

    const opaqueFailure = {
      getCurrentDecision: vi.fn(async () => undefined),
      readSnapshot: vi.fn(async () => {
        throw new Error("token=secret postgresql://private /Users/private");
      }),
    } as unknown as AdminReviewStore;
    let opaqueError: unknown;
    try {
      await readAdminReviewQueue(opaqueFailure, {
        campaignId: "campaign-review-0001",
        generatedAt,
        traceId: "trace-review-store-opaque-error",
      });
    } catch (error) {
      opaqueError = error;
    }
    expect(opaqueError).toMatchObject({
      code: "ADMIN_REVIEW_DOMAIN_UNAVAILABLE",
      field: "store",
      traceId: "trace-review-store-opaque-error",
    });
    expect(JSON.stringify(opaqueError)).not.toMatch(/token|postgresql|\/Users\//i);

    const snapshot = createSnapshot();
    const crossWalletStore = {
      getCurrentDecision: vi.fn(async () => createDecision(snapshot, {
        walletAddress: "2F4OtherWallet",
      })),
      readSnapshot: vi.fn(async () => createRows()),
    } as unknown as AdminReviewStore;
    await expect(readAdminReviewQueue(crossWalletStore, {
      campaignId: "campaign-review-0001",
      generatedAt,
      traceId: "trace-review-store-cross-wallet",
    })).rejects.toMatchObject({
      code: "ADMIN_REVIEW_DOMAIN_INVALID_FACTS",
      field: "walletAddress",
    });

    const crossCampaignRows = createRows();
    (crossCampaignRows.campaign as { id: string }).id = "campaign-review-other";
    for (const collection of [
      crossCampaignRows.tasks,
      crossCampaignRows.participants,
      crossCampaignRows.completions,
      crossCampaignRows.evidence,
      crossCampaignRows.ranking,
    ]) {
      for (const row of collection) {
        (row as { campaignId: string }).campaignId = "campaign-review-other";
      }
    }
    const crossCampaignStore = {
      getCurrentDecision: vi.fn(async () => undefined),
      readSnapshot: vi.fn(async () => crossCampaignRows),
    } as unknown as AdminReviewStore;
    await expect(readAdminReviewQueue(crossCampaignStore, {
      campaignId: "campaign-review-0001",
      generatedAt,
      traceId: "trace-review-store-cross-campaign",
    })).rejects.toMatchObject({
      code: "ADMIN_REVIEW_DOMAIN_INVALID_FACTS",
      field: "campaignId",
    });
    expect(crossCampaignStore.getCurrentDecision).not.toHaveBeenCalled();
    expect(crossCampaignStore.readSnapshot).toHaveBeenCalledWith({
      campaignId: "campaign-review-0001",
    }, { traceId: "trace-review-store-cross-campaign" });
  });
});

describe("Admin review decision command", () => {
  it.each([
    ["approved", "evidence_verified"],
    ["rejected", "evidence_invalid"],
    ["needs_review", "manual_review_required"],
  ] as const)("appends a trusted %s decision and returns a narrow receipt", async (
    decision,
    reasonCode,
  ) => {
    const rows = createRows();
    const before = cloneRows(rows);
    const snapshot = createSnapshot();
    let appendedInput: AdminReviewDecisionInput | undefined;
    const appendDecision = vi.fn(async (
      input: AdminReviewDecisionInput,
      projector: AdminReviewSnapshotProjector,
      context: { traceId: string },
    ) => {
      appendedInput = input;
      const projected = await projector(rows);
      expect(projected).toMatchObject({
        fingerprint: snapshot.fingerprint,
        walletAddress: snapshot.walletAddress,
      });
      return {
        created: true,
        record: createDecision(snapshot, {
          decision: input.decision,
          idempotencyKeyHash: input.idempotencyKeyHash,
          note: input.note,
          operatorRole: input.operatorRole,
          operatorSubject: input.operatorSubject,
          reasonCode: input.reasonCode,
          traceId: context.traceId,
        }),
      };
    });
    const readSnapshot = vi.fn(async () => rows);
    const store = { appendDecision, readSnapshot } as unknown as AdminReviewStore;

    const receipt = await submitAdminReviewDecision(store, {
      campaignId: "campaign-review-0001",
      decision,
      expectedSnapshotFingerprint: snapshot.fingerprint,
      idempotencyKey: "decision-key-review-0001",
      note: "Evidence reviewed.",
      participantId: "participant-review-0001",
      reasonCode,
    }, {
      operatorRole: "review_operator",
      operatorSubject: "  tDVVReviewOperator  ",
      traceId: `trace-review-command-${decision}`,
    }, {
      clock: () => generatedAt,
    });

    expect(receipt).toMatchObject({
      created: true,
      decision,
      decisionId: "decision-review-0001",
      participantId: "participant-review-0001",
      replayed: false,
      snapshotFingerprint: snapshot.fingerprint,
      version: 1,
    });
    expect(appendedInput).toMatchObject({
      decision,
      operatorRole: "review_operator",
      operatorSubject: "tDVVReviewOperator",
      reasonCode,
    });
    expect(appendedInput?.idempotencyKeyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(appendedInput)).not.toContain("decision-key-review-0001");
    expect(readSnapshot).toHaveBeenCalledOnce();
    expect(appendDecision).toHaveBeenCalledOnce();
    expect(rows).toEqual(before);
  });

  it.each([
    ["unknown reason", { reasonCode: "unknown_reason" }],
    ["unsafe note", { note: "Bearer token from postgresql://secret" }],
    ["empty key", { idempotencyKey: "   " }],
    ["unknown decision", { decision: "approve" }],
    ["caller operator", { operatorSubject: "2F4SpoofedOperator" }],
  ])("rejects %s before append", async (_caseName, overrides) => {
    const snapshot = createSnapshot();
    const appendDecision = vi.fn();
    const readSnapshot = vi.fn(async () => createRows());
    const store = { appendDecision, readSnapshot } as unknown as AdminReviewStore;

    await expect(submitAdminReviewDecision(store, {
      campaignId: "campaign-review-0001",
      decision: "approved",
      expectedSnapshotFingerprint: snapshot.fingerprint,
      idempotencyKey: "decision-key-review-0001",
      participantId: "participant-review-0001",
      reasonCode: "evidence_verified",
      ...overrides,
    } as never, {
      operatorRole: "review_operator",
      operatorSubject: "2F4ReviewOperator",
      traceId: "trace-review-command-invalid",
    }, {
      clock: () => generatedAt,
    })).rejects.toBeInstanceOf(AdminReviewDomainError);

    expect(appendDecision).not.toHaveBeenCalled();
  });

  it("rejects an unknown Participant before append", async () => {
    const appendDecision = vi.fn();
    const store = {
      appendDecision,
      readSnapshot: vi.fn(async () => createRows()),
    } as unknown as AdminReviewStore;

    await expect(submitAdminReviewDecision(store, {
      campaignId: "campaign-review-0001",
      decision: "approved",
      expectedSnapshotFingerprint: createSnapshot().fingerprint,
      idempotencyKey: "decision-key-review-missing",
      participantId: "participant-review-missing",
      reasonCode: "evidence_verified",
    }, {
      operatorRole: "review_operator",
      operatorSubject: "2F4ReviewOperator",
      traceId: "trace-review-command-missing",
    }, {
      clock: () => generatedAt,
    })).rejects.toMatchObject({
      code: "ADMIN_REVIEW_DOMAIN_NOT_FOUND",
      field: "participantId",
    });
    expect(appendDecision).not.toHaveBeenCalled();
  });

  it("rejects a stale preflight fingerprint and never calls append", async () => {
    const appendDecision = vi.fn();
    const readSnapshot = vi.fn(async () => createRows());
    const store = { appendDecision, readSnapshot } as unknown as AdminReviewStore;

    await expect(submitAdminReviewDecision(store, {
      campaignId: "campaign-review-0001",
      decision: "approved",
      expectedSnapshotFingerprint: "9".repeat(64),
      idempotencyKey: "decision-key-review-stale",
      participantId: "participant-review-0001",
      reasonCode: "evidence_verified",
    }, {
      operatorRole: "review_operator",
      operatorSubject: "2F4ReviewOperator",
      traceId: "trace-review-command-stale",
    }, {
      clock: () => generatedAt,
    })).rejects.toMatchObject({
      code: "ADMIN_REVIEW_DOMAIN_STALE",
      field: "expectedSnapshotFingerprint",
      traceId: "trace-review-command-stale",
    });

    expect(readSnapshot).toHaveBeenCalledOnce();
    expect(appendDecision).not.toHaveBeenCalled();
  });

  it("returns replay identity from the durable store without fabricating metadata", async () => {
    const snapshot = createSnapshot();
    const record = createDecision(snapshot, {
      decidedAt: "2026-07-15T01:11:12.000Z",
      id: "decision-replayed",
      traceId: "trace-original-create",
      version: 7,
    });
    const store = {
      appendDecision: vi.fn(async (input: AdminReviewDecisionInput) => ({
        created: false,
        record: {
          ...record,
          idempotencyKeyHash: input.idempotencyKeyHash,
        },
      })),
      readSnapshot: vi.fn(async () => createRows()),
    } as unknown as AdminReviewStore;

    await expect(submitAdminReviewDecision(store, {
      campaignId: "campaign-review-0001",
      decision: "approved",
      expectedSnapshotFingerprint: snapshot.fingerprint,
      idempotencyKey: "decision-key-review-replay",
      note: "Evidence reviewed.",
      participantId: "participant-review-0001",
      reasonCode: "evidence_verified",
    }, {
      operatorRole: "review_operator",
      operatorSubject: "2F4ReviewOperator",
      traceId: "trace-review-command-replay",
    }, {
      clock: () => generatedAt,
    })).resolves.toMatchObject({
      created: false,
      decidedAt: record.decidedAt,
      decisionId: record.id,
      replayed: true,
      traceId: record.traceId,
      version: record.version,
    });
  });

  it("trims trusted AELF identities while preserving exact case in command authority", async () => {
    const snapshot = createSnapshot();
    const records: AdminReviewDecisionRecord[] = [];
    const store = {
      appendDecision: vi.fn(async (input: AdminReviewDecisionInput) => {
        const record = createDecision(snapshot, {
          id: `decision-subject-${records.length}`,
          idempotencyKeyHash: input.idempotencyKeyHash,
          note: input.note,
          operatorRole: input.operatorRole,
          operatorSubject: input.operatorSubject,
          reasonCode: input.reasonCode,
          version: records.length + 1,
        });
        records.push(record);
        return { created: true, record };
      }),
      readSnapshot: vi.fn(async () => createRows()),
    } as unknown as AdminReviewStore;
    const subjects = [
      " AELFReviewOperator ",
      " tDVVReviewOperator ",
      " tDVWReviewOperator ",
      " tdvvReviewOperator ",
    ];

    for (const [index, operatorSubject] of subjects.entries()) {
      await submitAdminReviewDecision(store, {
        campaignId: "campaign-review-0001",
        decision: "approved",
        expectedSnapshotFingerprint: snapshot.fingerprint,
        idempotencyKey: `decision-key-subject-${index}`,
        participantId: "participant-review-0001",
        reasonCode: "evidence_verified",
      }, {
        operatorRole: "review_operator",
        operatorSubject,
        traceId: `trace-review-command-subject-${index}`,
      }, {
        clock: () => generatedAt,
      });
    }

    expect(records.map(({ operatorSubject }) => operatorSubject)).toEqual([
      "AELFReviewOperator",
      "tDVVReviewOperator",
      "tDVWReviewOperator",
      "tdvvReviewOperator",
    ]);
    expect(new Set(records.map(({ payloadHash }) => payloadHash)).size).toBe(4);
  });

  it("preserves one decision identity across a 20-way idempotent command replay", async () => {
    const rows = createRows();
    const snapshot = createSnapshot();
    let stored: AdminReviewDecisionRecord | undefined;
    let insertCount = 0;
    const store = {
      appendDecision: vi.fn(async (input: AdminReviewDecisionInput) => {
        await Promise.resolve();
        const created = stored === undefined;
        if (!stored) {
          insertCount += 1;
          stored = createDecision(snapshot, {
            decision: input.decision,
            id: "decision-concurrent",
            idempotencyKeyHash: input.idempotencyKeyHash,
            note: input.note,
            operatorRole: input.operatorRole,
            operatorSubject: input.operatorSubject,
            reasonCode: input.reasonCode,
            traceId: "trace-first-concurrent-command",
            version: 9,
          });
        }
        return { created, record: stored };
      }),
      readSnapshot: vi.fn(async () => rows),
    } as unknown as AdminReviewStore;

    const receipts = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      submitAdminReviewDecision(store, {
        campaignId: "campaign-review-0001",
        decision: "approved",
        expectedSnapshotFingerprint: snapshot.fingerprint,
        idempotencyKey: "decision-key-review-concurrent",
        note: "Evidence reviewed.",
        participantId: "participant-review-0001",
        reasonCode: "evidence_verified",
      }, {
        operatorRole: "review_operator",
        operatorSubject: "tDVWReviewOperator",
        traceId: `trace-review-command-concurrent-${index}`,
      }, {
        clock: () => generatedAt,
      })));

    expect(insertCount).toBe(1);
    expect(receipts.filter(({ created }) => created)).toHaveLength(1);
    expect(new Set(receipts.map(({ decisionId }) => decisionId))).toEqual(
      new Set(["decision-concurrent"]),
    );
    expect(new Set(receipts.map(({ version }) => version))).toEqual(new Set([9]));
    expect(new Set(receipts.map(({ snapshotFingerprint }) => snapshotFingerprint))).toEqual(
      new Set([snapshot.fingerprint]),
    );
  });

  it("maps idempotency conflicts and opaque transaction failures without leaking causes", async () => {
    const snapshot = createSnapshot();
    const submit = (store: AdminReviewStore, traceId: string) => submitAdminReviewDecision(store, {
      campaignId: "campaign-review-0001",
      decision: "approved",
      expectedSnapshotFingerprint: snapshot.fingerprint,
      idempotencyKey: "decision-key-review-store-error",
      participantId: "participant-review-0001",
      reasonCode: "evidence_verified",
    }, {
      operatorRole: "review_operator",
      operatorSubject: "2F4ReviewOperator",
      traceId,
    }, {
      clock: () => generatedAt,
    });
    const conflictStore = {
      appendDecision: vi.fn(async () => {
        throw new AdminReviewStoreError({
          code: "ADMIN_REVIEW_STORE_IDEMPOTENCY_CONFLICT",
          field: "idempotencyKeyHash",
          operation: "appendDecision",
          traceId: "trace-private-conflict",
        });
      }),
      readSnapshot: vi.fn(async () => createRows()),
    } as unknown as AdminReviewStore;
    await expect(submit(conflictStore, "trace-review-command-conflict")).rejects.toMatchObject({
      code: "ADMIN_REVIEW_DOMAIN_CONFLICT",
      field: "idempotencyKey",
      traceId: "trace-review-command-conflict",
    });

    const unavailableStore = {
      appendDecision: vi.fn(async () => {
        throw new Error("signature=secret postgresql://private /Users/private");
      }),
      readSnapshot: vi.fn(async () => createRows()),
    } as unknown as AdminReviewStore;
    let unavailableError: unknown;
    try {
      await submit(unavailableStore, "trace-review-command-unavailable");
    } catch (error) {
      unavailableError = error;
    }
    expect(unavailableError).toMatchObject({
      code: "ADMIN_REVIEW_DOMAIN_UNAVAILABLE",
      field: "store",
      traceId: "trace-review-command-unavailable",
    });
    expect(JSON.stringify(unavailableError)).not.toMatch(/signature|postgresql|\/Users\//i);
  });

  it.each([
    ["non-boolean created", "created"],
    ["cross-wallet record", "walletAddress"],
    ["payload hash mismatch", "payloadHash"],
  ] as const)("rejects a malformed store receipt: %s", async (variant, expectedField) => {
    const snapshot = createSnapshot();
    const store = {
      appendDecision: vi.fn(async (input: AdminReviewDecisionInput) => {
        const record = createDecision(snapshot, {
          idempotencyKeyHash: input.idempotencyKeyHash,
          ...(variant === "cross-wallet record" ? { walletAddress: "2F4OtherWallet" } : {}),
          ...(variant === "payload hash mismatch" ? { payloadHash: "f".repeat(64) } : {}),
        });
        return {
          created: variant === "non-boolean created" ? "yes" : true,
          record,
        };
      }),
      readSnapshot: vi.fn(async () => createRows()),
    } as unknown as AdminReviewStore;

    await expect(submitAdminReviewDecision(store, {
      campaignId: "campaign-review-0001",
      decision: "approved",
      expectedSnapshotFingerprint: snapshot.fingerprint,
      idempotencyKey: "decision-key-review-malformed",
      note: "Evidence reviewed.",
      participantId: "participant-review-0001",
      reasonCode: "evidence_verified",
    }, {
      operatorRole: "review_operator",
      operatorSubject: "2F4ReviewOperator",
      traceId: "trace-review-command-malformed",
    }, {
      clock: () => generatedAt,
    })).rejects.toMatchObject({
      code: "ADMIN_REVIEW_DOMAIN_INVALID_FACTS",
      field: expectedField,
    });
  });
});

describe("Admin review winner and artifact source policy", () => {
  const createWinnerMatrix = () => {
    const base = createRows();
    const variants = [
      { participantId: "participant-a", rank: 1, suffix: "a", walletAddress: "2F4WalletA" },
      { participantId: "participant-b", rank: 2, suffix: "b", walletAddress: "2F4WalletB" },
      { participantId: "participant-c", rank: 3, suffix: "c", walletAddress: "2F4WalletC" },
    ];
    const rows: AdminReviewSnapshotRows = {
      ...base,
      completions: variants.flatMap((variant) => base.completions.map((row) => ({
        ...row,
        id: `${row.id}-${variant.suffix}`,
        walletAddress: variant.walletAddress,
      }))),
      evidence: variants.flatMap((variant) => base.evidence.map((row) => ({
        ...row,
        completionId: row.completionId
          ? `${row.completionId}-${variant.suffix}`
          : undefined,
        id: `${row.id}-${variant.suffix}`,
        walletAddress: variant.walletAddress,
      }))),
      participants: variants.map((variant) => ({
        ...base.participants[0]!,
        id: variant.participantId,
        rank: variant.rank,
        walletAddress: variant.walletAddress,
      })),
      ranking: variants.map((variant) => ({
        ...base.ranking[0]!,
        participantId: variant.participantId,
        rank: variant.rank,
        walletAddress: variant.walletAddress,
      })),
    };
    const snapshots = projectAdminReviewSnapshots(rows, {
      generatedAt,
      traceId: "trace-review-winner-matrix",
    });
    return { rows, snapshots };
  };

  it("includes only current approved eligible Participants without blocking risk", () => {
    const { snapshots } = createWinnerMatrix();
    const [participantA, participantB, participantC] = snapshots;
    const decisions = [
      createDecision(participantA!, { id: "decision-a" }),
      createDecision(participantB!, {
        id: "decision-b",
        snapshotFingerprint: "9".repeat(64),
      }),
      createDecision(participantC!, {
        decision: "rejected",
        id: "decision-c",
        reasonCode: "evidence_invalid",
      }),
    ];

    const source = projectAdminReviewWinnerSource(snapshots, decisions, {
      traceId: "trace-review-winner-source",
    });
    const reordered = projectAdminReviewWinnerSource(
      [...snapshots].reverse(),
      [...decisions].reverse(),
      { traceId: "trace-review-winner-source-reordered" },
    );

    expect(source.sourceVersion).toBe("artifact-source-v1");
    expect(source.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(source.rowCount).toBe(1);
    expect(source.rows).toEqual([expect.objectContaining({
      campaignId: "campaign-review-0001",
      decisionId: "decision-a",
      decisionVersion: 1,
      evidenceHashes: ["evidence-hash-a", "evidence-hash-b"],
      participantId: "participant-a",
      rank: 1,
      snapshotFingerprint: participantA!.fingerprint,
      totalPoints: 120,
      walletAddress: "2F4WalletA",
    })]);
    expect(reordered.canonicalJson).toBe(source.canonicalJson);
    expect(reordered.fingerprint).toBe(source.fingerprint);
    expect(JSON.stringify(source.manifest)).not.toContain("generatedAt");
    expect(JSON.stringify(source.manifest)).not.toContain("trace-review");
    expect(JSON.stringify(source.manifest)).not.toContain("operator");
  });

  it("projects winner authority directly from the WP02 transaction source", () => {
    const snapshot = createSnapshot();
    const transactionSource: AdminExportArtifactProjectionSource = {
      latestDecisions: [createDecision(snapshot)],
      rows: createRows(),
    };

    const source = projectAdminReviewWinnerSourceFromStoreSnapshot(transactionSource, {
      generatedAt,
      traceId: "trace-review-transaction-source",
    });

    expect(source).toMatchObject({
      rowCount: 1,
      rows: [{ participantId: "participant-review-0001" }],
      sourceVersion: "artifact-source-v1",
    });
  });

  it.each([
    ["missing decision", undefined],
    ["needs review", "needs_review"],
    ["rejected", "rejected"],
  ] as const)("excludes %s from winners", (_caseName, decision) => {
    const snapshot = createSnapshot();
    const decisions = decision === undefined
      ? []
      : [createDecision(snapshot, {
        decision,
        reasonCode: decision === "rejected" ? "evidence_invalid" : "manual_review_required",
      })];

    expect(projectAdminReviewWinnerSource([snapshot], decisions, {
      traceId: "trace-review-winner-excluded-state",
    }).rows).toEqual([]);
  });

  it("excludes ineligible and blocking-risk Participants but permits informational risk", () => {
    const ineligibleRows = createRows();
    (ineligibleRows.completions[1] as { status: "failed" }).status = "failed";
    const ineligible = projectAdminReviewSnapshot(ineligibleRows, {
      generatedAt,
      participantId: "participant-review-0001",
      traceId: "trace-review-winner-ineligible",
    });
    const blockingRows = createRows();
    (blockingRows.participants[0] as unknown as { riskFlags: string[] }).riskFlags = [
      "blocking:manual_hold",
    ];
    const blocking = projectAdminReviewSnapshot(blockingRows, {
      generatedAt,
      participantId: "participant-review-0001",
      traceId: "trace-review-winner-blocking",
    });
    const informational = createSnapshot();

    expect(projectAdminReviewWinnerSource([ineligible], [createDecision(ineligible)], {
      traceId: "trace-review-winner-ineligible-source",
    }).rows).toEqual([]);
    expect(projectAdminReviewWinnerSource([blocking], [createDecision(blocking)], {
      traceId: "trace-review-winner-blocking-source",
    }).rows).toEqual([]);
    expect(projectAdminReviewWinnerSource([informational], [createDecision(informational)], {
      traceId: "trace-review-winner-info-source",
    }).rows).toHaveLength(1);
  });

  it("sorts winner authority by points, rank, wallet, then Participant ID", () => {
    const { rows } = createWinnerMatrix();
    const expanded = cloneRows(rows);
    const first = expanded.participants[0]!;
    const firstRanking = expanded.ranking[0]!;
    (expanded.participants as unknown as Array<typeof first>).push({
      ...first,
      id: "participant-null-rank",
      rank: undefined,
      totalPoints: 120,
      walletAddress: "2F4WalletNullRank",
    });
    (expanded.ranking as unknown as Array<typeof firstRanking>).push({
      ...firstRanking,
      participantId: "participant-null-rank",
      rank: undefined,
      totalPoints: 120,
      walletAddress: "2F4WalletNullRank",
    });
    (expanded.completions as unknown as Array<typeof expanded.completions[number]>).push(
      ...rows.completions.slice(0, 2).map((row) => ({
        ...row,
        id: `${row.id}-null-rank`,
        pointsAwarded: row.id.startsWith("completion-a") ? 50 : 70,
        walletAddress: "2F4WalletNullRank",
      })),
    );
    (expanded.evidence as unknown as Array<typeof expanded.evidence[number]>).push(
      ...rows.evidence.slice(0, 2).map((row) => ({
        ...row,
        completionId: row.completionId ? `${row.completionId}-null-rank` : undefined,
        id: `${row.id}-null-rank`,
        pointsAwarded: row.id.startsWith("evidence-a") ? 50 : 70,
        walletAddress: "2F4WalletNullRank",
      })),
    );
    const snapshots = projectAdminReviewSnapshots(expanded, {
      generatedAt,
      traceId: "trace-review-winner-sort",
    });
    const decisions = snapshots.map((snapshot, index) => createDecision(snapshot, {
      id: `decision-sort-${index}`,
    }));

    const ids = projectAdminReviewWinnerSource(snapshots, decisions, {
      traceId: "trace-review-winner-sort-source",
    }).rows.map(({ participantId }) => participantId);

    expect(ids).toEqual([
      "participant-a",
      "participant-b",
      "participant-c",
      "participant-null-rank",
    ]);
  });

  it("allows a deterministic empty source, enforces bounds, and freezes output", () => {
    const snapshot = createSnapshot();
    const empty = projectAdminReviewWinnerSource([snapshot], [], {
      traceId: "trace-review-winner-empty",
    });
    expect(empty.rows).toEqual([]);
    expect(empty.rowCount).toBe(0);
    expect(Object.isFrozen(empty)).toBe(true);
    expect(Object.isFrozen(empty.rows)).toBe(true);

    const zeroParticipantRows = createRows();
    zeroParticipantRows.completions = [];
    zeroParticipantRows.evidence = [];
    zeroParticipantRows.participants = [];
    zeroParticipantRows.ranking = [];
    const zeroParticipantSource = projectAdminReviewWinnerSourceFromStoreSnapshot({
      latestDecisions: [],
      rows: zeroParticipantRows,
    }, {
      generatedAt,
      traceId: "trace-review-winner-zero-participants",
    });
    expect(zeroParticipantSource).toMatchObject({
      rowCount: 0,
      rows: [],
      sourceVersion: "artifact-source-v1",
    });
    expect(zeroParticipantSource.manifest.campaign.id).toBe("campaign-review-0001");

    expect(() => projectAdminReviewWinnerSource(
      Array.from({ length: 5_001 }, () => snapshot),
      [],
      { traceId: "trace-review-winner-bound" },
    )).toThrowError(expect.objectContaining({
      code: "ADMIN_REVIEW_DOMAIN_BOUND_EXCEEDED",
      field: "snapshots",
    }));
  });
});

describe("Admin review security and mutation gates", () => {
  it("rejects sensitive persisted Evidence and decision notes without rejecting safe explorer URLs", () => {
    const safeRows = createRows();
    (safeRows.evidence[0] as { evidenceRef?: string }).evidenceRef =
      "https://aelfscan.io/tx/0x1234";
    expect(projectAdminReviewSnapshot(safeRows, {
      generatedAt,
      participantId: "participant-review-0001",
      traceId: "trace-review-safe-evidence-url",
    }).manifest.evidence[1]?.evidenceRef).toBe("https://aelfscan.io/tx/0x1234");

    for (const unsafeReference of [
      "postgresql://review:secret@localhost/database",
      "file:///Users/private/proof.json",
      "https://aelfscan.io/tx/0x1234?token=secret",
      "proof=raw-private-payload",
    ]) {
      const rows = createRows();
      (rows.evidence[0] as { evidenceRef?: string }).evidenceRef = unsafeReference;
      expect(() => projectAdminReviewSnapshot(rows, {
        generatedAt,
        participantId: "participant-review-0001",
        traceId: "trace-review-unsafe-evidence",
      })).toThrowError(expect.objectContaining({
        code: "ADMIN_REVIEW_DOMAIN_INVALID_FACTS",
        field: "evidenceRef",
      }));
    }

    const snapshot = createSnapshot();
    expect(() => projectAdminReviewDetail(snapshot, [createDecision(snapshot, {
      note: "token=stored-private-value",
    })], {
      traceId: "trace-review-unsafe-stored-note",
    })).toThrowError(expect.objectContaining({
      code: "ADMIN_REVIEW_DOMAIN_INVALID_FACTS",
      field: "note",
    }));
  });

  it.each([
    ["Completion", (rows: AdminReviewSnapshotRows) => {
      (rows.completions[0] as { completedAt?: string }).completedAt = "2026-07-15T02:00:00.000Z";
    }],
    ["Evidence", (rows: AdminReviewSnapshotRows) => {
      (rows.evidence[0] as { evidenceHash: string }).evidenceHash = "evidence-hash-mutated";
    }],
    ["points", (rows: AdminReviewSnapshotRows) => {
      (rows.participants[0] as { totalPoints: number }).totalPoints = 121;
      (rows.ranking[0] as { totalPoints: number }).totalPoints = 121;
    }],
    ["rank", (rows: AdminReviewSnapshotRows) => {
      (rows.participants[0] as { rank?: number }).rank = 2;
      (rows.ranking[0] as { rank?: number }).rank = 2;
    }],
    ["eligibility", (rows: AdminReviewSnapshotRows) => {
      (rows.tasks[0] as { walletCompatibility: "AA_ONLY" }).walletCompatibility = "AA_ONLY";
    }],
    ["required Task", (rows: AdminReviewSnapshotRows) => {
      (rows.tasks[0] as { required: boolean }).required = true;
    }],
    ["blocking risk", (rows: AdminReviewSnapshotRows) => {
      (rows.participants[0] as unknown as { riskFlags: string[] }).riskFlags = [
        "blocking:manual_hold",
      ];
    }],
  ] as const)("revokes old approval authority after a %s mutation", (_name, mutate) => {
    const approvedSnapshot = createSnapshot();
    const oldApproval = createDecision(approvedSnapshot);
    const rows = createRows();
    mutate(rows);
    const currentSnapshot = projectAdminReviewSnapshot(rows, {
      generatedAt,
      participantId: "participant-review-0001",
      traceId: "trace-review-post-approval-mutation",
    });

    expect(currentSnapshot.fingerprint).not.toBe(approvedSnapshot.fingerprint);
    expect(projectAdminReviewWinnerSource([currentSnapshot], [oldApproval], {
      traceId: "trace-review-post-approval-winner",
    }).rowCount).toBe(0);
  });
});

describe("Admin review bounds and performance gates", () => {
  it("accepts exactly 5,000 winner rows and rejects 5,001 or an oversized source manifest", () => {
    const rows = createScaleRows(5_000, 0);
    const snapshots = projectAdminReviewSnapshots(rows, {
      generatedAt,
      traceId: "trace-review-source-5000-snapshots",
    });
    const decisions = snapshots.map((snapshot, index) => createDecision(snapshot, {
      id: `decision-${index.toString().padStart(5, "0")}`,
      note: undefined,
    }));
    const source = projectAdminReviewWinnerSource(snapshots, decisions, {
      traceId: "trace-review-source-5000",
    });

    expect(source.rowCount).toBe(5_000);
    expect(source.rows[0]?.participantId).toBe("participant-scale-00000");
    expect(() => projectAdminReviewWinnerSource(
      [...snapshots, snapshots[0]!],
      decisions,
      { traceId: "trace-review-source-5001" },
    )).toThrowError(expect.objectContaining({
      code: "ADMIN_REVIEW_DOMAIN_BOUND_EXCEEDED",
      field: "snapshots",
    }));

    const oversizedSnapshots = projectAdminReviewSnapshots(
      createScaleRows(5_000, 0, { walletPadding: 220 }),
      {
        generatedAt,
        traceId: "trace-review-source-oversized-snapshots",
      },
    );
    const oversizedDecisions = oversizedSnapshots.map((snapshot, index) =>
      createDecision(snapshot, {
        id: `decision-oversized-${index}`,
        note: undefined,
      }));
    let oversizedError: unknown;
    try {
      projectAdminReviewWinnerSource(
        oversizedSnapshots,
        oversizedDecisions,
        { traceId: "trace-review-source-oversized" },
      );
    } catch (error) {
      oversizedError = error;
    }
    expect(oversizedError).toMatchObject({
      code: "ADMIN_REVIEW_DOMAIN_BOUND_EXCEEDED",
      field: "sourceManifest",
    });
  }, 30_000);

  it("keeps 100 Participants x 10 Tasks queue and detail p95 within 500ms", async () => {
    const rows = createScaleRows(100, 10);
    const store = {
      getCurrentDecision: vi.fn(async () => undefined),
      listDecisions: vi.fn(async () => []),
      readSnapshot: vi.fn(async () => rows),
    } as unknown as AdminReviewStore;
    const queueDurations: number[] = [];
    const detailDurations: number[] = [];

    for (let iteration = 0; iteration < 20; iteration += 1) {
      let startedAt = performance.now();
      const queue = await readAdminReviewQueue(store, {
        campaignId: "campaign-review-scale",
        generatedAt,
        traceId: `trace-review-performance-queue-${iteration}`,
      });
      queueDurations.push(performance.now() - startedAt);
      expect(queue).toHaveLength(100);

      startedAt = performance.now();
      const detail = await readAdminReviewDetail(store, {
        campaignId: "campaign-review-scale",
        generatedAt,
        participantId: "participant-scale-00000",
        traceId: `trace-review-performance-detail-${iteration}`,
      });
      detailDurations.push(performance.now() - startedAt);
      expect(detail.snapshot.taskCoverage).toEqual({
        completed: 10,
        evidence: 10,
        required: 10,
        total: 10,
      });
    }

    const p95 = (durations: number[]) => [...durations]
      .sort((left, right) => left - right)[Math.ceil(durations.length * 0.95) - 1]!;
    expect(p95(queueDurations)).toBeLessThanOrEqual(500);
    expect(p95(detailDurations)).toBeLessThanOrEqual(500);
  }, 30_000);
});
