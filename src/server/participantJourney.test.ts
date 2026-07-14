import { describe, expect, it } from "vitest";
import type {
  CampaignDbDraft,
  CampaignDbParticipantRecord,
  CampaignDbTaskCompletion,
  CampaignDbTaskDraft,
  CampaignDbTaskEvidenceRecord,
} from "./campaignDbRepository";
import {
  compareParticipantRankRows,
  projectParticipantJourney,
  projectParticipantRanking,
  type ParticipantJourneyProjectionInput,
} from "./participantJourney";

const CAMPAIGN_ID = "campaign-journey-0001";
const WALLET_A = "ELF_2F4WalletA";
const WALLET_A_CASE_VARIANT = "ELF_2f4WalletA";
const WALLET_B = "ELF_2F4WalletB";

const campaign = (overrides: Partial<CampaignDbDraft> = {}): CampaignDbDraft => ({
  contractMode: "OFF_CHAIN_MVP",
  createdAt: "2026-07-14T00:00:00.000Z",
  defaultLocale: "en-US",
  duration: "14 days",
  endTime: "2026-08-15T00:00:00.000Z",
  goal: "Complete the durable Participant journey",
  id: CAMPAIGN_ID,
  ownerAddress: "ELF_2F4JourneyOwner",
  projectId: "project-journey",
  publishReadiness: { blockers: [], ready: true, warnings: [] },
  rewardDescription: "Points only",
  startTime: "2026-08-01T00:00:00.000Z",
  status: "draft",
  supportedLocales: ["en-US", "zh-CN"],
  updatedAt: "2026-07-14T00:00:00.000Z",
  walletPolicy: "ANY",
  ...overrides,
});

const task = (
  id: string,
  overrides: Partial<CampaignDbTaskDraft> = {},
): CampaignDbTaskDraft => ({
  campaignId: CAMPAIGN_ID,
  createdAt: "2026-07-14T00:00:00.000Z",
  evidenceRule: { source: "AELFSCAN" },
  id,
  points: 100,
  required: true,
  templateCode: id,
  updatedAt: "2026-07-14T00:00:00.000Z",
  verificationType: "ON_CHAIN",
  walletCompatibility: "ANY",
  ...overrides,
});

const participant = (
  walletAddress = WALLET_A,
  overrides: Partial<CampaignDbParticipantRecord> = {},
): CampaignDbParticipantRecord => ({
  accountType: "EOA",
  campaignId: CAMPAIGN_ID,
  createdAt: "2026-07-14T00:00:01.000Z",
  id: `participant-${walletAddress}`,
  localePreference: "en-US",
  rank: 999,
  riskFlags: [],
  totalPoints: 100,
  updatedAt: "2026-07-14T00:00:02.000Z",
  walletAddress,
  walletSignatureStatus: "signed",
  walletSource: "PORTKEY_EOA_EXTENSION",
  walletTypeVerified: true,
  ...overrides,
});

const completion = (
  taskId: string,
  walletAddress = WALLET_A,
  overrides: Partial<CampaignDbTaskCompletion> = {},
): CampaignDbTaskCompletion => ({
  accountType: "EOA",
  campaignId: CAMPAIGN_ID,
  completedAt: "2026-07-14T00:00:03.000Z",
  createdAt: "2026-07-14T00:00:01.000Z",
  evidenceHash: `private-completion-hash-${walletAddress}-${taskId}`,
  evidenceId: `evidence-${walletAddress}-${taskId}`,
  evidenceSource: "AELFSCAN",
  id: `completion-${walletAddress}-${taskId}`,
  pointsAwarded: 100,
  status: "completed",
  taskId,
  updatedAt: "2026-07-14T00:00:03.000Z",
  walletAddress,
  walletSource: "PORTKEY_EOA_EXTENSION",
  ...overrides,
});

const evidence = (
  taskId: string,
  walletAddress = WALLET_A,
  overrides: Partial<CampaignDbTaskEvidenceRecord> = {},
): CampaignDbTaskEvidenceRecord => ({
  accountType: "EOA",
  campaignId: CAMPAIGN_ID,
  capturedAt: "2026-07-14T00:00:03.000Z",
  completionId: `completion-${walletAddress}-${taskId}`,
  createdAt: "2026-07-14T00:00:01.000Z",
  diagnosticCodes: ["private-diagnostic-must-not-leak"],
  evidenceHash: `private-evidence-hash-${walletAddress}-${taskId}`,
  evidenceRef: `/private/evidence/${walletAddress}/${taskId}`,
  evidenceSource: "AELFSCAN",
  id: `evidence-${walletAddress}-${taskId}`,
  liveContractExecuted: false,
  liveProviderExecuted: false,
  liveRewardExecuted: false,
  liveStorageExecuted: false,
  pointsAwarded: 100,
  status: "completed",
  taskId,
  updatedAt: "2026-07-14T00:00:03.000Z",
  walletAddress,
  walletSource: "PORTKEY_EOA_EXTENSION",
  ...overrides,
});

const repository = {
  adapterId: "campaign-db-deterministic-adapter",
  createdViaRepository: true as const,
  repositoryId: "campaign-db-repository-runtime",
  storeId: "campaign-db" as const,
};

const input = (
  overrides: Partial<ParticipantJourneyProjectionInput> = {},
): ParticipantJourneyProjectionInput => ({
  campaign: campaign(),
  completions: [],
  evidence: [],
  participant: undefined,
  rankingParticipants: [],
  repository,
  subject: {
    accountType: "EOA",
    walletAddress: WALLET_A,
    walletSource: "PORTKEY_EOA_EXTENSION",
  },
  tasks: [
    task("task-required-a"),
    task("task-required-b", { points: 50 }),
    task("task-optional", { points: 25, required: false }),
  ],
  ...overrides,
});

describe("Participant journey projector", () => {
  it("projects a read-only zero-state without inventing Participant or progress identities", () => {
    const source = input();
    const before = structuredClone(source);

    const result = projectParticipantJourney(source);

    expect(result).toMatchObject({
      campaign: {
        campaignId: CAMPAIGN_ID,
        projectId: "project-journey",
        taskCount: 3,
        walletPolicy: "ANY",
      },
      diagnostics: [],
      eligibility: {
        campaignId: CAMPAIGN_ID,
        eligible: false,
        missingTasks: ["task-required-a", "task-required-b"],
        score: 0,
        status: "not_eligible",
        walletAddress: WALLET_A,
      },
      participant: {
        campaignId: CAMPAIGN_ID,
        participantId: null,
        totalPoints: 0,
        walletAddress: WALLET_A,
      },
      ranking: {
        campaignId: CAMPAIGN_ID,
        participantCount: 0,
        rank: null,
        source: "repository_projection",
        totalPoints: 0,
        walletAddress: WALLET_A,
      },
    });
    expect(result.tasks).toEqual([
      expect.objectContaining({
        completionId: null,
        evidenceId: null,
        pointsAwarded: 0,
        status: "not_started",
        taskId: "task-required-a",
      }),
      expect.objectContaining({
        completionId: null,
        evidenceId: null,
        pointsAwarded: 0,
        status: "not_started",
        taskId: "task-required-b",
      }),
      expect.objectContaining({
        completionId: null,
        evidenceId: null,
        pointsAwarded: 0,
        status: "not_started",
        taskId: "task-optional",
      }),
    ]);
    expect(source).toEqual(before);
  });

  it("joins only exact Campaign and wallet records in canonical Task order", () => {
    const tasks = [
      task("task-z"),
      task("task-a"),
      task("task-m", { required: false }),
    ];
    const result = projectParticipantJourney(input({
      completions: [
        completion("task-a", WALLET_B),
        completion("task-a"),
        completion("task-z"),
      ],
      evidence: [
        evidence("task-a", WALLET_B),
        evidence("task-a"),
        evidence("task-z"),
      ],
      participant: participant(WALLET_A, { totalPoints: 200 }),
      rankingParticipants: [participant(WALLET_A, { totalPoints: 200 })],
      tasks,
    }));

    expect(result.tasks.map((entry) => entry.taskId)).toEqual(["task-z", "task-a", "task-m"]);
    expect(result.tasks.slice(0, 2)).toEqual([
      expect.objectContaining({
        completionId: `completion-${WALLET_A}-task-z`,
        evidenceId: `evidence-${WALLET_A}-task-z`,
        status: "completed",
      }),
      expect.objectContaining({
        completionId: `completion-${WALLET_A}-task-a`,
        evidenceId: `evidence-${WALLET_A}-task-a`,
        status: "completed",
      }),
    ]);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(WALLET_B);
    expect(serialized).not.toContain(`private-evidence-hash-${WALLET_B}`);
    expect(serialized).not.toContain(`/private/evidence/${WALLET_B}`);
  });

  it("keeps orphan, duplicate, mismatched, and out-of-scope rows readable but fail-safe", () => {
    const result = projectParticipantJourney(input({
      completions: [
        completion("task-required-a", WALLET_A, { evidenceId: "missing-evidence" }),
        completion("task-required-b"),
        completion("task-required-b", WALLET_A, { id: "completion-duplicate" }),
        completion("unknown-task"),
        completion("task-optional", WALLET_A, { campaignId: "wrong-campaign" }),
        completion("task-optional", WALLET_B),
      ],
      evidence: [
        evidence("task-required-b", WALLET_A, { completionId: "wrong-completion" }),
        evidence("task-optional"),
        evidence("unknown-task"),
        evidence("task-required-a", WALLET_A, { campaignId: "wrong-campaign" }),
        evidence("task-required-a", WALLET_B),
      ],
      participant: participant(WALLET_A, { totalPoints: 0 }),
      rankingParticipants: [participant(WALLET_A, { totalPoints: 0 })],
    }));

    expect(result.tasks.every((entry) => entry.status !== "completed")).toBe(true);
    expect(result.tasks.every((entry) => entry.completionId === null && entry.evidenceId === null)).toBe(true);
    expect(result.diagnostics.map((entry) => entry.code)).toEqual(expect.arrayContaining([
      "COMPLETION_EVIDENCE_ID_MISMATCH",
      "COMPLETION_WITHOUT_EVIDENCE",
      "DUPLICATE_COMPLETION",
      "EVIDENCE_WITHOUT_COMPLETION",
      "OUT_OF_SCOPE_RECORD_IGNORED",
    ]));
    const serialized = JSON.stringify(result.diagnostics);
    for (const forbidden of [
      "private-evidence-hash",
      "private-completion-hash",
      "/private/evidence",
      WALLET_B,
      "wrong-completion",
      "missing-evidence",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("uses durable Participant points as the single aggregate authority and diagnoses drift", () => {
    const result = projectParticipantJourney(input({
      completions: [completion("task-required-a")],
      evidence: [evidence("task-required-a")],
      participant: participant(WALLET_A, { totalPoints: 175 }),
      rankingParticipants: [participant(WALLET_A, { totalPoints: 175 })],
    }));

    expect(result.participant.totalPoints).toBe(175);
    expect(result.ranking.totalPoints).toBe(175);
    expect(result.eligibility.score).toBe(175);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: "PARTICIPANT_POINTS_MISMATCH",
    }));
  });

  it("blocks wallet-incompatible Tasks without projecting a completion", () => {
    const incompatibleTask = task("task-aa-only", {
      required: true,
      walletCompatibility: "AA_ONLY",
    });
    const result = projectParticipantJourney(input({
      completions: [completion(incompatibleTask.id)],
      evidence: [evidence(incompatibleTask.id)],
      participant: participant(WALLET_A, { totalPoints: 0 }),
      rankingParticipants: [participant(WALLET_A, { totalPoints: 0 })],
      tasks: [incompatibleTask],
    }));

    expect(result.tasks).toEqual([
      expect.objectContaining({
        action: "blocked",
        blockedReason: "wallet_incompatible",
        completionId: null,
        evidenceId: null,
        pointsAwarded: 0,
        status: "not_started",
      }),
    ]);
    expect(result.eligibility).toMatchObject({
      eligible: false,
      missingTasks: ["task-aa-only"],
      status: "not_eligible",
      walletTypeVerified: true,
    });
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: "WALLET_INCOMPATIBLE_PROGRESS_IGNORED",
      taskId: "task-aa-only",
    }));
  });

  it("bounds safe diagnostics for large inconsistent snapshots", () => {
    const tasks = Array.from({ length: 150 }, (_, index) =>
      task(`task-duplicate-${index.toString().padStart(3, "0")}`));
    const result = projectParticipantJourney(input({
      tasks: tasks.flatMap((entry) => [entry, { ...entry }]),
    }));

    expect(result.diagnostics).toHaveLength(100);
    expect(result.diagnostics.every((entry) => entry.code === "DUPLICATE_TASK")).toBe(true);
    expect(JSON.stringify(result.diagnostics)).not.toContain("private-");
  });

  it("ranks current durable points by stable identity and exact wallet address", () => {
    const participants = [
      participant("ELF_wallet-z", {
        createdAt: "2026-07-14T00:00:02.000Z",
        id: "participant-04",
        rank: 1,
        totalPoints: 200,
      }),
      participant(WALLET_A_CASE_VARIANT, {
        createdAt: "2026-07-14T00:00:01.000Z",
        id: "participant-03",
        rank: 1,
        totalPoints: 100,
      }),
      participant(WALLET_A, {
        createdAt: "2026-07-14T00:00:01.000Z",
        id: "participant-02",
        rank: 999,
        totalPoints: 100,
      }),
      participant("ELF_wallet-first", {
        createdAt: "2026-07-14T00:00:01.000Z",
        id: "participant-01",
        rank: 500,
        totalPoints: 100,
      }),
      participant("ELF_wallet-zero", {
        createdAt: "2026-07-14T00:00:00.000Z",
        id: "participant-00",
        rank: 1,
        totalPoints: 0,
      }),
    ];

    const sorted = [...participants].sort(compareParticipantRankRows);
    const ranking = projectParticipantRanking(CAMPAIGN_ID, WALLET_A, 100, participants);
    const caseVariantRanking = projectParticipantRanking(
      CAMPAIGN_ID,
      WALLET_A_CASE_VARIANT,
      100,
      participants,
    );

    expect(sorted.map((entry) => entry.walletAddress)).toEqual([
      "ELF_wallet-z",
      "ELF_wallet-first",
      WALLET_A,
      WALLET_A_CASE_VARIANT,
      "ELF_wallet-zero",
    ]);
    expect(ranking).toMatchObject({ participantCount: 5, rank: 3, totalPoints: 100 });
    expect(caseVariantRanking).toMatchObject({ participantCount: 5, rank: 4, totalPoints: 100 });
    expect(projectParticipantRanking(CAMPAIGN_ID, "ELF_missing", 0, participants)).toMatchObject({
      participantCount: 5,
      rank: null,
      totalPoints: 0,
    });
  });
});
