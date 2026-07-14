import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import type {
  CampaignDbDraft,
  CampaignDbParticipantRecord,
  CampaignDbTaskCompletion,
  CampaignDbTaskDraft,
  CampaignDbTaskEvidenceRecord,
} from "./campaignDbRepository";
import {
  CampaignDurableStoreError,
  createCampaignDurableStore,
} from "./campaignDurableStore";

const draft = (id: string, createdAt = "2026-07-07T00:00:00.000Z"): CampaignDbDraft => ({
  contractMode: "OFF_CHAIN_MVP",
  createdAt,
  defaultLocale: "en-US",
  duration: "14 days",
  endTime: "2026-08-15T00:00:00.000Z",
  goal: `Durable campaign ${id}`,
  id,
  ownerAddress: "2F4DurableOwner",
  projectId: "project-durable",
  publishReadiness: {
    blockers: [],
    ready: true,
    warnings: [],
  },
  rewardDescription: "Points only",
  startTime: "2026-08-01T00:00:00.000Z",
  status: "draft",
  supportedLocales: ["en-US", "zh-CN"],
  updatedAt: createdAt,
  walletPolicy: "ANY",
});

const taskDraft = (
  id: string,
  campaignId: string,
  createdAt = "2026-07-07T00:00:00.000Z",
): CampaignDbTaskDraft => ({
  campaignId,
  createdAt,
  evidenceRule: { minAmount: 1, source: "AELFSCAN" },
  id,
  points: 120,
  required: true,
  templateCode: "bridge_ebridge",
  updatedAt: createdAt,
  verificationType: "ON_CHAIN",
  walletCompatibility: "ANY",
});

const taskEvidence = (
  id: string,
  campaignId: string,
  taskId = "campaign-db-task-draft-0001",
  walletAddress = "2F4EvidenceWallet",
): CampaignDbTaskEvidenceRecord => ({
  accountType: "EOA",
  campaignId,
  capturedAt: "2026-07-07T00:00:00.000Z",
  completionId: "campaign-db-task-completion-0001",
  createdAt: "2026-07-07T00:00:00.000Z",
  diagnosticCodes: ["local_review"],
  evidenceHash: `evidence-hash:${id}`,
  evidenceRef: `local-review:evidence/${id}`,
  evidenceSource: "AELFSCAN",
  id,
  liveContractExecuted: false,
  liveProviderExecuted: false,
  liveRewardExecuted: false,
  liveStorageExecuted: false,
  pointsAwarded: 120,
  status: "completed",
  taskId,
  updatedAt: "2026-07-07T00:00:00.000Z",
  walletAddress,
  walletSource: "PORTKEY_EOA_EXTENSION",
});

const taskCompletion = (
  id: string,
  campaignId: string,
  taskId: string,
  walletAddress: string,
  evidenceId = `evidence-${id}`,
): CampaignDbTaskCompletion => ({
  accountType: "EOA",
  campaignId,
  completedAt: "2026-07-07T00:00:00.000Z",
  createdAt: "2026-07-07T00:00:00.000Z",
  evidenceHash: `evidence-hash:${id}`,
  evidenceId,
  evidenceSource: "AELFSCAN",
  id,
  pointsAwarded: 120,
  status: "completed",
  taskId,
  updatedAt: "2026-07-07T00:00:00.000Z",
  walletAddress,
  walletSource: "PORTKEY_EOA_EXTENSION",
});

const participant = (
  id: string,
  campaignId: string,
  walletAddress: string,
  totalPoints = 120,
): CampaignDbParticipantRecord => ({
  accountType: "EOA",
  campaignId,
  createdAt: "2026-07-07T00:00:00.000Z",
  id,
  localePreference: "en-US",
  rank: 999,
  riskFlags: [],
  totalPoints,
  updatedAt: "2026-07-07T00:00:00.000Z",
  walletAddress,
  walletSignatureStatus: "signed",
  walletSource: "PORTKEY_EOA_EXTENSION",
  walletTypeVerified: true,
});

const withTempStorePath = async <T>(operation: (filePath: string) => Promise<T>) => {
  const directory = await mkdtemp(join(tmpdir(), "campaign-os-store-"));

  try {
    return await operation(join(directory, "campaign-drafts.json"));
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
};

describe("Campaign durable store", () => {
  it("persists campaign drafts across store instances", async () => {
    await withTempStorePath(async (filePath) => {
      const firstStore = createCampaignDurableStore({ filePath, mode: "durable_test" });

      await firstStore.create(draft("campaign-db-draft-0001"));
      await firstStore.close();

      const reopenedStore = createCampaignDurableStore({ filePath, mode: "durable_test" });

      await expect(reopenedStore.getById("campaign-db-draft-0001")).resolves.toMatchObject({
        id: "campaign-db-draft-0001",
        projectId: "project-durable",
      });
      await expect(reopenedStore.manifest()).resolves.toMatchObject({
        durable: true,
        mode: "durable_test",
        recordCount: 1,
        status: "ready",
        taskRecordCount: 0,
      });
    });
  });

  it("persists campaign task drafts across store instances", async () => {
    await withTempStorePath(async (filePath) => {
      const firstStore = createCampaignDurableStore({ filePath, mode: "durable_test" });

      await firstStore.create(draft("campaign-db-draft-0001"));
      await firstStore.createTaskDraft(taskDraft("campaign-db-task-draft-0001", "campaign-db-draft-0001"));
      await firstStore.close();

      const reopenedStore = createCampaignDurableStore({ filePath, mode: "durable_test" });

      await expect(reopenedStore.listTaskDraftsByCampaignId("campaign-db-draft-0001")).resolves.toEqual([
        expect.objectContaining({
          campaignId: "campaign-db-draft-0001",
          id: "campaign-db-task-draft-0001",
          templateCode: "bridge_ebridge",
        }),
      ]);
      await expect(reopenedStore.manifest()).resolves.toMatchObject({
        recordCount: 1,
        taskRecordCount: 1,
      });
    });
  });

  it("persists, filters, counts, and resets task evidence records", async () => {
    await withTempStorePath(async (filePath) => {
      const firstStore = createCampaignDurableStore({ filePath, mode: "durable_test" });

      await firstStore.create(draft("campaign-db-draft-0001"));
      await firstStore.createTaskDraft(taskDraft("campaign-db-task-draft-0001", "campaign-db-draft-0001"));
      await firstStore.upsertTaskEvidence(taskEvidence(
        "campaign-db-task-evidence-0002",
        "campaign-db-draft-0001",
        "campaign-db-task-draft-0001",
        "2F4WalletB",
      ));
      await firstStore.upsertTaskEvidence(taskEvidence(
        "campaign-db-task-evidence-0001",
        "campaign-db-draft-0001",
        "campaign-db-task-draft-0001",
        "2F4WalletA",
      ));
      await firstStore.close();

      const reopenedStore = createCampaignDurableStore({ filePath, mode: "durable_test" });

      await expect(reopenedStore.listTaskEvidence({
        campaignId: "campaign-db-draft-0001",
        taskId: "campaign-db-task-draft-0001",
      })).resolves.toEqual([
        expect.objectContaining({
          id: "campaign-db-task-evidence-0001",
          liveContractExecuted: false,
          liveProviderExecuted: false,
          liveRewardExecuted: false,
          liveStorageExecuted: false,
          walletAddress: "2F4WalletA",
        }),
        expect.objectContaining({
          id: "campaign-db-task-evidence-0002",
          walletAddress: "2F4WalletB",
        }),
      ]);
      await expect(reopenedStore.listTaskEvidence({
        campaignId: "campaign-db-draft-0001",
        walletAddress: "2F4WalletB",
      })).resolves.toEqual([
        expect.objectContaining({ id: "campaign-db-task-evidence-0002" }),
      ]);
      await expect(reopenedStore.manifest()).resolves.toMatchObject({
        recordCount: 1,
        taskEvidenceRecordCount: 2,
        taskRecordCount: 1,
      });

      await reopenedStore.reset();

      await expect(reopenedStore.listTaskEvidence({ campaignId: "campaign-db-draft-0001" })).resolves.toEqual([]);
      await expect(reopenedStore.manifest()).resolves.toMatchObject({
        recordCount: 0,
        taskEvidenceRecordCount: 0,
        taskRecordCount: 0,
      });
    });
  });

  it("loads old campaign-only documents with empty task records", async () => {
    await withTempStorePath(async (filePath) => {
      await writeFile(
        filePath,
        `${JSON.stringify({
          records: [draft("campaign-db-draft-legacy")],
          updatedAt: "2026-07-07T00:00:00.000Z",
          version: 1,
        }, null, 2)}\n`,
        "utf8",
      );

      const store = createCampaignDurableStore({ filePath, mode: "durable_test" });

      await expect(store.getById("campaign-db-draft-legacy")).resolves.toMatchObject({
        id: "campaign-db-draft-legacy",
      });
      await expect(store.listTaskDraftsByCampaignId("campaign-db-draft-legacy")).resolves.toEqual([]);
      await expect(store.listTaskEvidence({ campaignId: "campaign-db-draft-legacy" })).resolves.toEqual([]);
      await expect(store.manifest()).resolves.toMatchObject({
        recordCount: 1,
        taskEvidenceRecordCount: 0,
        taskRecordCount: 0,
      });
    });
  });

  it("lists campaign drafts deterministically with a bounded limit", async () => {
    await withTempStorePath(async (filePath) => {
      const store = createCampaignDurableStore({
        boundedListLimit: 2,
        filePath,
        mode: "durable_test",
      });

      await store.create(draft("campaign-db-draft-0003", "2026-07-07T00:00:03.000Z"));
      await store.create(draft("campaign-db-draft-0001", "2026-07-07T00:00:01.000Z"));
      await store.create(draft("campaign-db-draft-0002", "2026-07-07T00:00:02.000Z"));

      await expect(store.list()).resolves.toEqual([
        expect.objectContaining({ id: "campaign-db-draft-0001" }),
        expect.objectContaining({ id: "campaign-db-draft-0002" }),
      ]);
      await expect(store.list({ limit: 3 })).resolves.toEqual([
        expect.objectContaining({ id: "campaign-db-draft-0001" }),
        expect.objectContaining({ id: "campaign-db-draft-0002" }),
      ]);
      await expect(store.list({ limit: 1, projectId: "project-durable" })).resolves.toEqual([
        expect.objectContaining({ id: "campaign-db-draft-0001" }),
      ]);
    });
  });

  it("blocks durable modes without an explicit store path", async () => {
    const store = createCampaignDurableStore({ mode: "durable_test" });

    await expect(store.manifest()).resolves.toMatchObject({
      diagnosticCodes: ["CAMPAIGN_DURABLE_STORE_PATH_REQUIRED"],
      durable: true,
      fallbackUsed: false,
      status: "blocked",
    });
  });

  it("keeps local seeded mode non-durable and resettable", async () => {
    const store = createCampaignDurableStore();

    await store.create(draft("campaign-db-draft-local"));
    await expect(store.manifest()).resolves.toMatchObject({
      durable: false,
      mode: "local_seeded",
      recordCount: 1,
      status: "ready",
    });

    await store.reset();

    await expect(store.list()).resolves.toEqual([]);
    await expect(store.listTaskEvidence({ campaignId: "campaign-db-draft-local" })).resolves.toEqual([]);
    await expect(store.listTaskDraftsByCampaignId("campaign-db-draft-local")).resolves.toEqual([]);
  });

  it("preserves unbounded local projection reads unless a new explicit limit is requested", async () => {
    const store = createCampaignDurableStore({ boundedListLimit: 100 });

    for (let index = 0; index < 101; index += 1) {
      await store.createTaskDraft(taskDraft(
        `campaign-db-task-${index.toString().padStart(4, "0")}`,
        "campaign-db-draft-local",
      ));
    }

    await expect(store.listTaskDraftsByCampaignId("campaign-db-draft-local")).resolves.toHaveLength(101);
    await expect(store.listTaskDraftsByCampaignId(
      "campaign-db-draft-local",
      { limit: 100 },
    )).resolves.toHaveLength(100);
  });

  it("returns one coherent exact-wallet journey snapshot without truncating ten Task records", async () => {
    const store = createCampaignDurableStore({ boundedListLimit: 100 });
    const campaignId = "campaign-db-draft-snapshot";
    const walletA = "ELF_2F4SnapshotWallet";
    const caseVariant = "ELF_2f4SnapshotWallet";
    const walletB = "ELF_2F4OtherWallet";

    await store.create(draft(campaignId));
    await store.upsertParticipant(participant("participant-a", campaignId, walletA, 1_200));
    await store.upsertParticipant(participant("participant-case", campaignId, caseVariant, 500));
    await store.upsertParticipant(participant("participant-b", campaignId, walletB, 100));

    for (let index = 0; index < 10; index += 1) {
      const taskId = `campaign-db-task-${index.toString().padStart(4, "0")}`;
      const completionId = `completion-a-${index}`;
      const evidenceId = `evidence-a-${index}`;
      await store.createTaskDraft(taskDraft(taskId, campaignId));
      await store.upsertTaskCompletion(taskCompletion(
        completionId,
        campaignId,
        taskId,
        walletA,
        evidenceId,
      ));
      await store.upsertTaskEvidence(taskEvidence(evidenceId, campaignId, taskId, walletA));
      await store.upsertTaskCompletion(taskCompletion(
        `completion-b-${index}`,
        campaignId,
        taskId,
        walletB,
        `evidence-b-${index}`,
      ));
      await store.upsertTaskEvidence(taskEvidence(`evidence-b-${index}`, campaignId, taskId, walletB));
    }

    const snapshot = await store.getParticipantJourneySnapshot({
      campaignId,
      walletAddress: walletA,
    }, { traceId: "trace-store-snapshot" });

    expect(snapshot).toMatchObject({
      campaign: { id: campaignId },
      participant: { id: "participant-a", walletAddress: walletA },
    });
    expect(snapshot.tasks).toHaveLength(10);
    expect(snapshot.completions).toHaveLength(10);
    expect(snapshot.evidence).toHaveLength(10);
    expect(snapshot.rankingParticipants).toHaveLength(3);
    expect(snapshot.rankingParticipants[0]).toEqual({
      campaignId,
      createdAt: "2026-07-07T00:00:00.000Z",
      id: "participant-a",
      totalPoints: 1_200,
      walletAddress: walletA,
    });
    expect(snapshot.completions.every((record) => record.walletAddress === walletA)).toBe(true);
    expect(snapshot.evidence.every((record) => record.walletAddress === walletA)).toBe(true);
    expect(JSON.stringify(snapshot.completions)).not.toContain(walletB);
    expect(JSON.stringify(snapshot.evidence)).not.toContain(walletB);

    snapshot.tasks[0]!.points = 999_999;
    const repeated = await store.getParticipantJourneySnapshot({ campaignId, walletAddress: walletA });
    expect(repeated.tasks[0]?.points).toBe(120);

    const caseSnapshot = await store.getParticipantJourneySnapshot({
      campaignId,
      walletAddress: caseVariant,
    });
    expect(caseSnapshot.participant?.id).toBe("participant-case");
    expect(caseSnapshot.completions).toEqual([]);
    expect(caseSnapshot.evidence).toEqual([]);
  });

  it("does not use the generic list page size as a journey snapshot total limit", async () => {
    const store = createCampaignDurableStore({ boundedListLimit: 100 });
    const campaignId = "campaign-db-draft-snapshot-over-page";
    const walletAddress = "ELF_2F4SnapshotOverPageWallet";
    await store.create(draft(campaignId));

    for (let index = 0; index < 101; index += 1) {
      const suffix = index.toString().padStart(4, "0");
      const taskId = `campaign-db-task-${suffix}`;
      const completionId = `completion-${suffix}`;
      const evidenceId = `evidence-${suffix}`;
      await store.createTaskDraft(taskDraft(taskId, campaignId));
      await store.upsertTaskCompletion(taskCompletion(
        completionId,
        campaignId,
        taskId,
        walletAddress,
        evidenceId,
      ));
      await store.upsertTaskEvidence(taskEvidence(evidenceId, campaignId, taskId, walletAddress));
    }

    const snapshot = await store.getParticipantJourneySnapshot({ campaignId, walletAddress });

    expect(snapshot.tasks).toHaveLength(101);
    expect(snapshot.completions).toHaveLength(101);
    expect(snapshot.evidence).toHaveLength(101);
  });

  it("keeps zero-state snapshot reads free of Participant writes", async () => {
    const store = createCampaignDurableStore();
    const campaignId = "campaign-db-draft-zero-state";
    await store.create(draft(campaignId));
    await store.createTaskDraft(taskDraft("campaign-db-task-zero-state", campaignId));
    const before = await store.manifest();

    const snapshot = await store.getParticipantJourneySnapshot({
      campaignId,
      walletAddress: "ELF_2F4NewWallet",
    });

    expect(snapshot.participant).toBeUndefined();
    expect(snapshot.completions).toEqual([]);
    expect(snapshot.evidence).toEqual([]);
    await expect(store.manifest()).resolves.toMatchObject({
      completionRecordCount: before.completionRecordCount,
      participantRecordCount: before.participantRecordCount,
      taskEvidenceRecordCount: before.taskEvidenceRecordCount,
    });
  });

  it("keeps canonical verification identities and points across twenty local retries", async () => {
    const store = createCampaignDurableStore();
    const campaignId = "campaign-db-draft-concurrent";
    const taskId = "campaign-db-task-concurrent";
    const walletAddress = "ELF_2F4ConcurrentWallet";
    await store.create(draft(campaignId));
    await store.createTaskDraft(taskDraft(taskId, campaignId));

    const results = await Promise.all(Array.from({ length: 20 }, (_, index) => {
      const completionId = `completion-request-${index}`;
      const evidenceId = `evidence-request-${index}`;

      return store.upsertTaskVerification!({
        completion: taskCompletion(completionId, campaignId, taskId, walletAddress, evidenceId),
        evidence: {
          ...taskEvidence(evidenceId, campaignId, taskId, walletAddress),
          completionId: undefined,
        },
        participant: participant(`participant-request-${index}`, campaignId, walletAddress, 0),
      });
    }));

    expect(new Set(results.map((result) => result.completion.id))).toEqual(new Set(["completion-request-0"]));
    expect(new Set(results.map((result) => result.evidence.id))).toEqual(new Set(["evidence-request-0"]));
    expect(new Set(results.map((result) => result.participant.id))).toEqual(new Set(["participant-request-0"]));
    expect(results.every((result) => result.participant.totalPoints === 120)).toBe(true);
    expect(results.every((result) => !("rank" in result.participant))).toBe(true);
    await expect(store.manifest()).resolves.toMatchObject({
      completionRecordCount: 1,
      participantRecordCount: 1,
      taskEvidenceRecordCount: 1,
    });
  });

  it("throws instead of silently accepting failed durable writes", async () => {
    const store = createCampaignDurableStore({
      filePath: "/dev/null/campaign-drafts.json",
      mode: "durable_test",
    });

    await expect(store.create(draft("campaign-db-draft-write-fail"))).rejects.toBeInstanceOf(
      CampaignDurableStoreError,
    );
    await expect(store.manifest()).resolves.toMatchObject({
      diagnosticCodes: expect.arrayContaining(["CAMPAIGN_DURABLE_STORE_WRITE_FAILED"]),
      status: "blocked",
    });
  });
});
