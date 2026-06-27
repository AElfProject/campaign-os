import { describe, expect, it } from "vitest";
import {
  campaignDetail,
  createContractImpactReviewModel,
  computeMissingTasks,
  computePublishReadiness,
  createAdminOpsReadModel,
  createExportPreview,
  createParticipationReadModel,
  createTranslationManagerReadModel,
  deriveEligibilityWalletStatus,
  deriveParticipantTaskStates,
  defaultLocale,
  EXPORT_CSV_COLUMNS,
  fallbackLocale,
  getWalletBadgeLabel,
  getWalletCompatibilityLabel,
  isWalletSessionVerified,
  isSupportedLocale,
  normalizeWalletSession,
  supportedLocales,
  walletAdapterFixtures,
  walletSessions,
} from "./index";

describe("Campaign OS domain foundation", () => {
  it("limits MVP locales to en-US and zh-CN", () => {
    expect(supportedLocales).toEqual(["en-US", "zh-CN"]);
    expect(defaultLocale).toBe("en-US");
    expect(fallbackLocale).toBe("en-US");
    expect(isSupportedLocale("zh-CN")).toBe(true);
    expect(isSupportedLocale("zh-TW")).toBe(false);
  });

  it("derives translation manager review state for supported MVP locales only", () => {
    const translationManager = createTranslationManagerReadModel(campaignDetail);
    const englishPanel = translationManager.panels.find((panel) => panel.locale === "en-US");
    const chinesePanel = translationManager.panels.find((panel) => panel.locale === "zh-CN");

    expect(translationManager.defaultLocale).toBe("en-US");
    expect(translationManager.fallbackLocale).toBe("en-US");
    expect(translationManager.supportedLocales).toEqual(["en-US", "zh-CN"]);
    expect(translationManager.supportedLocales).not.toContain("zh-TW");
    expect(translationManager.noAutoPublishNotice["en-US"]).toContain("cannot auto-publish");
    expect(englishPanel).toMatchObject({
      locale: "en-US",
      sourceLocale: "en-US",
      aiDraft: false,
      fallbackToEnglish: false,
      humanReviewed: true,
      published: true,
      publishState: "ready",
    });
    expect(englishPanel?.socialPost).toContain("Join Awaken Sprint");
    expect(chinesePanel).toMatchObject({
      locale: "zh-CN",
      sourceLocale: "en-US",
      aiDraft: true,
      fallbackToEnglish: true,
      humanReviewed: false,
      published: false,
      publishState: "warning",
    });
    expect(chinesePanel?.nextAction["en-US"]).toBe(
      "AI generated translation cannot auto-publish before human review.",
    );
  });

  it("derives reward disclaimer review rows from translation state", () => {
    const translationManager = createTranslationManagerReadModel(campaignDetail);

    expect(translationManager.rewardDisclaimers).toEqual([
      expect.objectContaining({
        locale: "en-US",
        reviewed: true,
        fallbackToEnglish: false,
        publishState: "ready",
      }),
      expect.objectContaining({
        locale: "zh-CN",
        reviewed: false,
        fallbackToEnglish: true,
        publishState: "warning",
      }),
    ]);
    expect(translationManager.rewardDisclaimers[0].disclaimer).toContain(
      "does not distribute rewards",
    );
    expect(translationManager.rewardDisclaimers[1].disclaimer).toContain("不等于发奖");
  });

  it("derives contract impact review boundaries without enabling contract execution", () => {
    const offChainReview = createContractImpactReviewModel(campaignDetail);
    const claimReview = createContractImpactReviewModel({
      ...campaignDetail,
      contractMode: "CONTRACT_CLAIM",
    });

    expect(offChainReview.safeDefaultMode).toBe("OFF_CHAIN_MVP");
    expect(offChainReview.rewardBoundary["en-US"]).toContain("Export winners does not distribute rewards");
    expect(offChainReview.options.find((option) => option.mode === "OFF_CHAIN_MVP")).toMatchObject({
      publishState: "ready",
      reviewSeverity: "info",
      requiresVerifierRole: false,
      requiresHighImpactReview: false,
    });
    expect(offChainReview.options.find((option) => option.mode === "V2_COMPANION")).toMatchObject({
      publishState: "warning",
      reviewSeverity: "warning",
      requiresMetadataHash: true,
    });
    expect(offChainReview.options.find((option) => option.mode === "CONTRACT_CLAIM")).toMatchObject({
      publishState: "blocker",
      reviewSeverity: "blocker",
      requiresHighImpactReview: true,
    });
    expect(
      claimReview.options.find((option) => option.mode === "CONTRACT_CLAIM")?.boundary["en-US"],
    ).toBe("Selected contract claim remains blocked; no contract transaction is executed.");
  });

  it("labels AA and EOA wallet states", () => {
    expect(getWalletBadgeLabel("AA", "PORTKEY_AA")).toBe("AA · Portkey");
    expect(getWalletBadgeLabel("EOA", "PORTKEY_EOA_EXTENSION")).toBe("EOA · Extension");
    expect(getWalletCompatibilityLabel("ANY")).toBe("AA + EOA");
  });

  it("normalizes every seeded wallet adapter into explicit session states", () => {
    const sessionsById = Object.fromEntries(
      walletSessions.map((session) => [session.sessionId, session]),
    );

    expect(Object.keys(sessionsById).sort()).toEqual([
      "sess-aa-001",
      "sess-account-restricted-001",
      "sess-agent-skill-001",
      "sess-eoa-001",
      "sess-eoa-app-001",
      "sess-missing-signature-001",
      "sess-nightelf-001",
      "sess-unknown-001",
      "sess-unsupported-001",
      "sess-wrong-chain-001",
    ]);
    expect(sessionsById["sess-aa-001"]).toMatchObject({
      accountType: "AA",
      walletSource: "PORTKEY_AA",
      verificationStatus: "verified",
      signatureStatus: "signed",
      walletTypeVerified: true,
      normalUserRecommended: true,
    });
    expect(sessionsById["sess-eoa-app-001"]).toMatchObject({
      accountType: "EOA",
      walletSource: "PORTKEY_EOA_APP",
      verificationStatus: "verified",
      walletTypeVerified: true,
    });
    expect(sessionsById["sess-eoa-001"]).toMatchObject({
      accountType: "EOA",
      walletSource: "PORTKEY_EOA_EXTENSION",
      verificationStatus: "verified",
      walletTypeVerified: true,
    });
    expect(sessionsById["sess-nightelf-001"]).toMatchObject({
      accountType: "EOA",
      walletSource: "NIGHTELF",
      verificationStatus: "verified",
      walletTypeVerified: true,
    });
    expect(sessionsById["sess-agent-skill-001"]).toMatchObject({
      accountType: "EOA",
      walletSource: "AGENT_SKILL",
      verificationStatus: "internal_agent",
      walletTypeVerified: false,
      normalUserRecommended: false,
    });
    expect(sessionsById["sess-unsupported-001"]).toMatchObject({
      verificationStatus: "unsupported_wallet",
      walletTypeVerified: false,
    });
    expect(sessionsById["sess-wrong-chain-001"]).toMatchObject({
      chainId: "tDVV",
      verificationStatus: "wrong_chain",
      walletTypeVerified: false,
    });
    expect(sessionsById["sess-missing-signature-001"]).toMatchObject({
      signatureStatus: "missing",
      verificationStatus: "missing_signature",
      walletTypeVerified: false,
    });
    expect(sessionsById["sess-account-restricted-001"]).toMatchObject({
      verificationStatus: "account_restricted",
      walletTypeVerified: false,
    });
    expect(sessionsById["sess-unknown-001"]).toMatchObject({
      accountType: "UNKNOWN",
      verificationStatus: "address_only",
      walletTypeVerified: false,
    });
  });

  it("derives wallet policy eligibility without treating address-only input as verified", () => {
    const verifiedEoa = normalizeWalletSession(
      walletAdapterFixtures.find((fixture) => fixture.id === "sess-eoa-001")!,
      "ANY",
    );
    const restrictedEoa = deriveEligibilityWalletStatus(verifiedEoa, "AA_ONLY");
    const addressOnly = walletSessions.find((session) => session.sessionId === "sess-unknown-001")!;

    expect(isWalletSessionVerified(verifiedEoa)).toBe(true);
    expect(restrictedEoa).toMatchObject({
      campaignWalletPolicy: "AA_ONLY",
      verificationStatus: "account_restricted",
      walletTypeVerified: false,
      eligible: false,
    });
    expect(deriveEligibilityWalletStatus(addressOnly, "ANY")).toMatchObject({
      accountType: "UNKNOWN",
      verificationStatus: "address_only",
      walletTypeVerified: false,
      eligible: false,
    });
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
      campaignDetail.walletSessions,
    );

    expect(exportPreview.columns).toEqual(EXPORT_CSV_COLUMNS);
    expect(exportPreview.disclaimer).toContain("does not distribute rewards");
    expect(exportPreview.confirmation).toMatchObject({
      verifiedRecordsOnly: true,
      rewardDistributionOwner: "campaign_project",
    });
    expect(exportPreview.rows[0]).toMatchObject({
      campaignId: "camp-awaken-sprint",
      accountType: "AA",
      walletSource: "PORTKEY_AA",
      localePreference: "en-US",
      referrerAddress: "REF...2F4",
      exportBatchId: "export-awaken-sprint-preview",
      walletTypeVerified: true,
      rowStatus: "ready",
    });
    expect(exportPreview.rows[1]).toMatchObject({
      accountType: "EOA",
      walletSource: "PORTKEY_EOA_EXTENSION",
      localePreference: "zh-CN",
      referrerAddress: "REF...3E9",
      riskFlags: ["referral_velocity_review"],
      walletTypeVerified: true,
      rowStatus: "review_required",
    });
    expect(exportPreview.rows[1].taskRecords).toEqual(
      expect.arrayContaining([
        "task-bridge:pending:aelfscan",
        "task-social:failed:social_api",
      ]),
    );
    expect(exportPreview.rows[1].evidenceHashes).toEqual(
      expect.arrayContaining(["demo-task-bridge-3E9", "demo-task-social-3E9"]),
    );
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
    expect(adminOps.exportBatch.columns).toEqual(EXPORT_CSV_COLUMNS);
    expect(adminOps.exportBatch.confirmation.noDistributionBoundary["en-US"]).toContain(
      "does not distribute rewards",
    );
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
      campaignId: "camp-awaken-sprint",
      walletAddress: "3E9...7cD",
      accountType: "EOA",
      walletSource: "PORTKEY_EOA_EXTENSION",
      localePreference: "zh-CN",
      riskFlags: ["referral_velocity_review"],
      missingTasks: ["bridge_ebridge"],
      referrerAddress: "REF...3E9",
      exportBatchId: "export-awaken-sprint-preview",
      taskRecords: expect.arrayContaining([
        "task-bridge:pending:aelfscan",
        "task-social:failed:social_api",
      ]),
      evidenceHashes: expect.arrayContaining([
        "demo-task-bridge-3E9",
        "demo-task-social-3E9",
      ]),
      rowStatus: "review_required",
      walletTypeVerified: true,
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

  it("keeps wallet fixtures free of credential examples", () => {
    const fixtureText = JSON.stringify(walletAdapterFixtures).toLowerCase();

    for (const unsafe of [
      "private key",
      "seed phrase",
      "mnemonic",
      "api_key",
      "secret",
      "access_token",
      "bearer ",
    ]) {
      expect(fixtureText).not.toContain(unsafe);
    }
  });
});
