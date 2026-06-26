import { describe, expect, it } from "vitest";
import {
  campaignDetail,
  computeMissingTasks,
  computePublishReadiness,
  createAdminOpsReadModel,
  createExportPreview,
  createParticipationReadModel,
  deriveParticipantTaskStates,
  defaultLocale,
  fallbackLocale,
  getWalletBadgeLabel,
  getWalletCompatibilityLabel,
  isSupportedLocale,
  supportedLocales,
} from "./index";

describe("Campaign OS domain foundation", () => {
  it("limits MVP locales to en-US and zh-CN", () => {
    expect(supportedLocales).toEqual(["en-US", "zh-CN"]);
    expect(defaultLocale).toBe("en-US");
    expect(fallbackLocale).toBe("en-US");
    expect(isSupportedLocale("zh-CN")).toBe(true);
    expect(isSupportedLocale("zh-TW")).toBe(false);
  });

  it("labels AA and EOA wallet states", () => {
    expect(getWalletBadgeLabel("AA", "PORTKEY_AA")).toBe("AA · Portkey");
    expect(getWalletBadgeLabel("EOA", "PORTKEY_EOA_EXTENSION")).toBe("EOA · Extension");
    expect(getWalletCompatibilityLabel("ANY")).toBe("AA + EOA");
  });

  it("computes publish readiness blockers and warnings", () => {
    const readiness = computePublishReadiness(
      { contractMode: "CONTRACT_CLAIM" },
      campaignDetail.contentRevisions,
    );

    expect(readiness.ready).toBe(false);
    expect(readiness.blockers).toContain("Contract claim mode requires high-impact manual review.");
    expect(readiness.warnings).toContain("Chinese content falls back to English until reviewed.");
  });

  it("keeps export preview wallet and locale fields", () => {
    const exportPreview = createExportPreview(
      campaignDetail.id,
      campaignDetail.participants,
      campaignDetail.tasks,
    );

    expect(exportPreview.disclaimer).toContain("does not distribute rewards");
    expect(exportPreview.rows[0]).toMatchObject({
      accountType: "AA",
      walletSource: "PORTKEY_AA",
      localePreference: "en-US",
    });
    expect(exportPreview.rows[1]).toMatchObject({
      accountType: "EOA",
      walletSource: "PORTKEY_EOA_EXTENSION",
      localePreference: "zh-CN",
    });
    expect(exportPreview.rows).toHaveLength(4);
  });

  it("derives missing required tasks for participants", () => {
    const [, eoaParticipant] = campaignDetail.participants;

    expect(computeMissingTasks(campaignDetail.tasks, eoaParticipant).map((task) => task.id)).toEqual([
      "task-bridge",
    ]);
  });

  it("derives completed and missing task state for a participant", () => {
    const [, eoaParticipant] = campaignDetail.participants;
    const states = deriveParticipantTaskStates(campaignDetail.tasks, eoaParticipant);

    expect(states).toEqual(expect.arrayContaining([
      expect.objectContaining({
        taskId: "task-connect-wallet",
        status: "completed",
        evidenceSource: "wallet",
        pointsAwarded: 40,
        completed: true,
        missingRequired: false,
        walletCompatibility: "ANY",
      }),
      expect.objectContaining({
        taskId: "task-bridge",
        status: "ready",
        evidenceSource: "aelfscan",
        pointsAwarded: 0,
        completed: false,
        missingRequired: true,
        walletCompatibility: "ANY",
      }),
      expect.objectContaining({
        taskId: "task-swap",
        status: "pending",
        evidenceSource: "dapp_api",
        missingRequired: false,
      }),
      expect.objectContaining({
        taskId: "task-social",
        status: "failed",
        evidenceSource: "social_api",
        missingRequired: false,
      }),
      expect.objectContaining({
        taskId: "task-agent-review",
        status: "manual_review",
        evidenceSource: "manual",
        completed: false,
        missingRequired: false,
        walletCompatibility: "EOA_ONLY",
      }),
    ]));
  });

  it("creates a participation read model with actionable eligibility and referral rules", () => {
    const [, eoaParticipant] = campaignDetail.participants;
    const participation = createParticipationReadModel(campaignDetail, eoaParticipant);

    expect(participation.eligibility).toMatchObject({
      status: "not_eligible",
      score: 40,
      pointsThreshold: 160,
      missingTaskIds: ["task-bridge"],
      riskFlags: ["referral_velocity_review"],
    });
    expect(participation.eligibility.nextAction["en-US"]).toBe(
      "Complete the missing required tasks before export eligibility.",
    );
    expect(participation.taskStates.find((task) => task.taskId === "task-bridge")).toMatchObject({
      missingRequired: true,
      nextAction: expect.objectContaining({
        "en-US": "Complete Bridge via eBridge to recover eligibility.",
      }),
    });
    expect(participation.referral).toMatchObject({
      invitedCount: 9,
      qualifiedInvitees: 2,
      referralPoints: 40,
      riskFlags: ["referral_velocity_review"],
    });
    expect(participation.referral.referralPoints).toBe(
      participation.referral.qualifiedInvitees * 20,
    );
    expect(participation.referral.antiFarmRule["en-US"]).toContain("Raw signups do not count");
    expect(participation.rewardBoundary["en-US"]).toContain("Export winners does not distribute rewards");
  });

  it("keeps participation leaderboard wallet-transparent across AA and EOA rows", () => {
    const [, eoaParticipant] = campaignDetail.participants;
    const participation = createParticipationReadModel(campaignDetail, eoaParticipant);

    expect(participation.leaderboard).toHaveLength(4);
    expect(participation.leaderboard.map((row) => row.rank)).toEqual([12, 21, 31, 48]);
    expect(participation.leaderboard).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountType: "AA", walletSource: "PORTKEY_AA" }),
        expect.objectContaining({ accountType: "EOA", walletSource: "NIGHTELF" }),
        expect.objectContaining({ accountType: "EOA", walletSource: "PORTKEY_EOA_EXTENSION" }),
      ]),
    );
    expect(participation.metrics).toMatchObject({
      completedRequiredTasks: 1,
      totalRequiredTasks: 2,
      completedTasks: 1,
      totalTasks: 5,
      eligibleRankCutoff: 100,
      participantRank: 48,
    });
  });

  it("derives pending and risk flagged eligibility states for seeded participants", () => {
    const [, , riskParticipant, pendingParticipant] = campaignDetail.participants;

    expect(createParticipationReadModel(campaignDetail, riskParticipant).eligibility.status).toBe(
      "risk_flagged",
    );
    expect(createParticipationReadModel(campaignDetail, pendingParticipant).eligibility.status).toBe(
      "pending",
    );
  });

  it("creates an Admin/Ops read model for analytics, risk, AI reports, and export evidence", () => {
    const adminOps = createAdminOpsReadModel(campaignDetail);

    expect(adminOps.analytics.map((metric) => metric.id)).toEqual([
      "participants",
      "verified-actions",
      "eligible-winners",
      "risk-rate",
      "referral-conversion",
      "retention",
      "export-readiness",
    ]);
    expect(adminOps.funnel.map((step) => step.id)).toEqual([
      "campaign-views",
      "wallet-connect",
      "bridge",
      "swap",
      "qualified-invite",
      "eligible-winners",
    ]);
    expect(adminOps.walletSplit).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "AA" }),
        expect.objectContaining({ label: "EOA" }),
      ]),
    );
    expect(adminOps.localeSplit.map((row) => row.label)).toEqual(["en-US", "zh-CN"]);
    expect(adminOps.localeSplit.map((row) => row.label)).not.toContain("zh-TW");
    expect(adminOps.riskSignals.map((signal) => signal.id)).toEqual([
      "funding-source",
      "referral-tree",
      "referral-velocity",
      "device-session",
      "task-timing",
      "bot-sybil-review",
      "manual-review",
    ]);
    expect(adminOps.aiReports).toHaveLength(4);
    expect(adminOps.exportBatch.disclaimer["en-US"]).toContain("does not distribute rewards");
  });

  it("keeps Admin/Ops risk and AI guidance human-reviewed", () => {
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const riskText = adminOps.riskSignals
      .flatMap((signal) => [
        signal.label["en-US"],
        signal.evidence["en-US"],
        signal.nextAction["en-US"],
      ])
      .join(" ");
    const recommendations = adminOps.aiReports.flatMap((report) => report.recommendations);

    expect(riskText).toContain("review");
    expect(riskText.toLowerCase()).not.toContain("ban");
    expect(riskText.toLowerCase()).not.toContain("exclude automatically");
    expect(recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "review-referral-weight",
          requiresHumanReview: true,
          confidence: "high",
          riskLevel: "medium",
        }),
        expect.objectContaining({
          id: "hold-export-for-risk-review",
          requiresHumanReview: true,
          riskLevel: "high",
        }),
      ]),
    );
  });

  it("keeps Admin/Ops ecosystem metrics and export evidence complete", () => {
    const adminOps = createAdminOpsReadModel(campaignDetail);

    expect(adminOps.ecosystemMetrics.map((row) => row.product)).toEqual([
      "eBridge",
      "Awaken",
      "Forest",
      "TMRWDAO",
      "daipp",
      "Pay",
      "Forecast",
    ]);
    expect(adminOps.exportBatch.rows).toHaveLength(campaignDetail.participants.length);
    expect(adminOps.exportBatch.rows[1]).toMatchObject({
      walletAddress: "3E9...7cD",
      accountType: "EOA",
      walletSource: "PORTKEY_EOA_EXTENSION",
      localePreference: "zh-CN",
      riskFlags: ["referral_velocity_review"],
      missingTasks: ["bridge_ebridge"],
      exportBatchId: "export-awaken-sprint-preview",
    });
    expect(adminOps.exportBatch.rows[1].taskEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taskId: "task-bridge",
          status: "pending",
          source: "aelfscan",
          evidenceHash: "demo-task-bridge-3E9",
        }),
        expect.objectContaining({
          taskId: "task-social",
          status: "failed",
          source: "social_api",
        }),
        expect.objectContaining({
          taskId: "task-agent-review",
          status: "manual_review",
          source: "manual",
        }),
      ]),
    );
  });
});
