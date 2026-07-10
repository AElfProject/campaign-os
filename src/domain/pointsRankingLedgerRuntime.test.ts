import { describe, expect, it } from "vitest";
import { campaignDetail } from "./fixtures";
import { createPointsRankingLedgerRuntime } from "./pointsRankingLedgerRuntime";

describe("createPointsRankingLedgerRuntime", () => {
  it("creates a deterministic local review payload", () => {
    const runtime = createPointsRankingLedgerRuntime(campaignDetail);
    const repeated = createPointsRankingLedgerRuntime(campaignDetail);

    expect(runtime).toEqual(repeated);
    expect(runtime.campaignId).toBe(campaignDetail.id);
    expect(runtime.source).toBe("seeded_runtime");
    expect(runtime.status).toBe("review_required");
    expect(runtime.boundary["en-US"]).toContain("Local points ranking ledger runtime only");
  });

  it("derives ledger events with wallet, task, evidence, points, and risk fields", () => {
    const runtime = createPointsRankingLedgerRuntime(campaignDetail);
    const event = runtime.ledger.events.find(
      (candidate) => candidate.walletAddress === "3E9...7cD" && candidate.taskId === "task-social",
    );

    expect(runtime.ledger.totalEvents).toBe(campaignDetail.participants.length * campaignDetail.tasks.length);
    expect(event).toMatchObject({
      accountType: "EOA",
      campaignId: campaignDetail.id,
      evidenceSource: "SOCIAL_API",
      localePreference: "zh-CN",
      pointsAwarded: 0,
      pointsAvailable: 30,
      riskFlags: ["referral_velocity_review"],
      status: "failed",
      taskId: "task-social",
      templateCode: "social_follow",
      verificationType: "SOCIAL",
      walletAddress: "3E9...7cD",
      walletSource: "PORTKEY_EOA_EXTENSION",
    });
    expect(event?.eventId).toContain("camp-awaken-sprint:3E9...7cD:task-social:failed");
    expect(event?.evidenceHash).toMatch(/^demo-task-social-3E9$/);
  });

  it("builds ranking rows with deterministic order and export fields", () => {
    const runtime = createPointsRankingLedgerRuntime(campaignDetail);

    expect(runtime.ranking.rows.map((row) => row.walletAddress)).toEqual([
      "2F4...9aB",
      "5N1...4fA",
      "7P8...2bE",
      "3E9...7cD",
    ]);
    expect(runtime.ranking.rows.map((row) => row.rank)).toEqual([1, 2, 3, 4]);
    expect(runtime.ranking.rows[0]).toMatchObject({
      accountType: "AA",
      eligible: true,
      localePreference: "en-US",
      missingTasks: [],
      totalPoints: 270,
      walletSource: "PORTKEY_AA",
    });
    expect(runtime.ranking.rows[3]).toMatchObject({
      eligible: false,
      missingTasks: ["bridge_ebridge"],
      riskFlags: ["referral_velocity_review"],
      totalPoints: 40,
    });
    expect(runtime.ranking.rows.every((row) => row.evidenceHashes.length > 0)).toBe(true);
  });

  it("keeps the eligibility root preview deterministic and chain-write disabled", () => {
    const runtime = createPointsRankingLedgerRuntime(campaignDetail);
    const repeated = createPointsRankingLedgerRuntime(campaignDetail);

    expect(runtime.eligibilityRoot).toEqual(repeated.eligibilityRoot);
    expect(runtime.eligibilityRoot).toMatchObject({
      contractRootMode: "none",
      eligibleWalletCount: 1,
      generationMode: "local_preview",
      pointsTotal: 740,
      rootId: "eligibility-root-preview:camp-awaken-sprint:local-v1",
      schemaVersion: "local-v1",
      totalRows: 4,
    });
    expect(runtime.eligibilityRoot.rootHash).toMatch(/^local-root-/);
    expect(runtime.eligibilityRoot.evidenceHashes).toEqual(
      Array.from(new Set(runtime.ranking.rows.flatMap((row) => row.evidenceHashes))).sort(),
    );
  });

  it("summarizes review counts and keeps no-live side effects false", () => {
    const runtime = createPointsRankingLedgerRuntime(campaignDetail);

    expect(runtime.summary).toMatchObject({
      completedEvents: 10,
      eligibleWallets: 1,
      failedEvents: 1,
      manualReviewEvents: 3,
      pendingEvents: 6,
      rankedWallets: 4,
      riskFlaggedWallets: 2,
      totalLedgerEvents: 20,
      totalPoints: 740,
    });
    expect(Object.values(runtime.noLiveSideEffects).every((value) => value === false)).toBe(true);
    expect(runtime.summary.topNextAction["en-US"]).toContain("Review local ledger events");
    expect(runtime.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "POINTS_LEDGER_LOCAL_REVIEW_ONLY",
        "ELIGIBILITY_ROOT_CONTRACT_WRITE_DISABLED",
      ]),
    );
  });

  it("does not imply production ledger writes, reward custody, or reward distribution", () => {
    const runtime = createPointsRankingLedgerRuntime(campaignDetail);
    const boundaryText = JSON.stringify([
      runtime.boundary,
      runtime.ledger.boundary,
      runtime.ranking.boundary,
      runtime.eligibilityRoot.nextAction,
    ]);

    expect(boundaryText).toContain("No production Pixiepoints");
    expect(boundaryText).toContain("no reward custody");
    expect(boundaryText).toContain("no reward distribution");
    expect(runtime.noLiveSideEffects).toEqual({
      liveBackendLedgerWrite: false,
      liveContractWrite: false,
      liveEligibilityRootPublished: false,
      liveExportFileWritten: false,
      liveIndexerExecuted: false,
      livePixiepointsLedgerWrite: false,
      liveProviderExecuted: false,
      liveRewardCustody: false,
      liveRewardDistribution: false,
      liveWalletSignature: false,
    });
  });
});
