import { describe, expect, it } from "vitest";
import {
  campaignDetail,
  createAiContentPackWorkbench,
  createContractImpactReviewModel,
  computeMissingTasks,
  computePublishReadiness,
  createAdminOpsReadModel,
  createExportPreview,
  createParticipationReadModel,
  createTranslationManagerReadModel,
  createWalletConnectionDiagnostics,
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

  it("creates the AI Content Pack workbench with all required artifacts and release gates", () => {
    const workbench = createAiContentPackWorkbench(campaignDetail);
    const artifactsByType = Object.fromEntries(
      workbench.artifacts.map((artifact) => [artifact.type, artifact]),
    );
    const gatesByCategory = Object.fromEntries(
      workbench.qualityGates.map((gate) => [gate.category, gate]),
    );

    expect(workbench.defaultLocale).toBe("en-US");
    expect(workbench.supportedLocales).toEqual(["en-US", "zh-CN"]);
    expect(workbench.summary).toMatchObject({
      totalArtifacts: 7,
      aiDrafts: 2,
      humanApproved: 4,
      blockedReleaseActions: 3,
      availableCopyActions: 4,
      qualityGateBlockers: 1,
    });
    expect(Object.keys(artifactsByType).sort()).toEqual([
      "daily_report",
      "discord_message",
      "faq",
      "telegram_announcement",
      "tutorial",
      "winner_report",
      "x_thread",
    ]);
    expect(artifactsByType.x_thread).toMatchObject({
      lifecycle: "human_approved",
      actionPolicy: expect.objectContaining({
        copy: "available",
        schedule: "available",
        publish: "available",
      }),
    });
    expect(artifactsByType.telegram_announcement).toMatchObject({
      lifecycle: "ai_draft",
      actionPolicy: expect.objectContaining({
        copy: "blocked",
        schedule: "blocked",
        publish: "blocked",
      }),
    });
    expect(artifactsByType.discord_message).toMatchObject({
      lifecycle: "edited",
      actionPolicy: expect.objectContaining({
        copy: "blocked",
        schedule: "blocked",
        publish: "blocked",
      }),
    });
    expect(artifactsByType.telegram_announcement.actionPolicy.blockedReason?.["en-US"]).toContain(
      "Human review required",
    );
    expect(artifactsByType.faq.body["en-US"]).toContain("Rewards are provided by Awaken");
    expect(artifactsByType.winner_report.body["en-US"]).toContain("Winner export requires human confirmation");
    expect(Object.keys(gatesByCategory).sort()).toEqual([
      "cta",
      "deadline",
      "eligibility",
      "localization",
      "reward_responsibility",
      "risk_language",
      "winner_rules",
    ]);
    expect(gatesByCategory.reward_responsibility).toMatchObject({ status: "passed" });
    expect(gatesByCategory.localization).toMatchObject({ status: "blocked" });
    expect(workbench.boundary.body["en-US"]).toContain("No live AI provider");
    expect(workbench.boundary.body["zh-CN"]).toContain("不会连接实时 AI");
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

  it("derives the admin contract review center for MVP and high-impact gates", () => {
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const reviewCenter = adminOps.contractReviewCenter;

    expect(reviewCenter).toMatchObject({
      campaignId: "camp-awaken-sprint",
      selectedMode: "OFF_CHAIN_MVP",
      publishState: "ready",
      highImpactMode: false,
    });
    expect(reviewCenter.v2CompanionNeeded["en-US"]).toContain("No for MVP");
    expect(reviewCenter.v2CompanionNeeded["en-US"]).toContain("recommended for P1");
    expect(reviewCenter.metadataHash["en-US"]).toContain("Optional for MVP");
    expect(reviewCenter.verifierRole["en-US"]).toContain("Backend verifier only");
    expect(reviewCenter.rewardCustody["en-US"]).toContain("None in Campaign OS");
    expect(reviewCenter.rewardCustody["en-US"]).not.toContain("Campaign OS custody");
    expect(reviewCenter.boundary["en-US"]).toContain("No live contract transaction");
    expect(reviewCenter.boundary["en-US"]).toContain("no reward custody");

    expect(reviewCenter.checklist.map((item) => item.id)).toEqual([
      "contract-address",
      "audit-status",
      "metadata-hash",
      "verifier-role",
      "reward-custody",
      "contract-claim-gate",
    ]);
    expect(reviewCenter.checklist.find((item) => item.id === "contract-claim-gate")).toMatchObject({
      status: "blocked",
      ownerRole: "contract_reviewer",
      requiredFor: "CONTRACT_CLAIM",
    });
    expect(reviewCenter.checklist.find((item) => item.id === "reward-custody")?.value["en-US"]).toContain(
      "Project-owned",
    );
    expect(reviewCenter.evolution.map((step) => step.id)).toEqual([
      "mvp-off-chain",
      "p1-campaign-registry",
      "p1-points-referral-roots",
      "p2-optional-claim",
    ]);
    expect(reviewCenter.evolution[1].title["en-US"]).toContain("CampaignRegistryV2");
    expect(reviewCenter.evolution[2].contractSurface["en-US"]).toContain("ReferralRegistryV2");
    expect(reviewCenter.evolution[3]).toMatchObject({ status: "blocker" });
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

  it("creates wallet connection diagnostics from seeded wallet sessions", () => {
    const diagnostics = createWalletConnectionDiagnostics(walletSessions);
    const groupsById = Object.fromEntries(
      diagnostics.groups.map((group) => [group.id, group]),
    );
    const checklistById = Object.fromEntries(
      diagnostics.qaChecklist.map((item) => [item.id, item]),
    );

    expect(diagnostics).toMatchObject({
      totalSessions: 10,
      verifiedSessions: 4,
      issueSessions: 6,
      recommendedPathReady: true,
      eoaPathsReady: 3,
    });
    expect(diagnostics.boundary["en-US"]).toContain("no live wallet SDK connection");
    expect(groupsById["recommended-aa"].items.map((item) => item.sessionId)).toEqual([
      "sess-aa-001",
    ]);
    expect(groupsById["supported-eoa"].items.map((item) => item.sessionId).sort()).toEqual([
      "sess-eoa-001",
      "sess-eoa-app-001",
      "sess-nightelf-001",
    ]);
    expect(groupsById["connection-issues"]).toMatchObject({ state: "blocker" });
    expect(groupsById["connection-issues"].items.map((item) => item.verificationStatus).sort()).toEqual([
      "account_restricted",
      "missing_signature",
      "unsupported_wallet",
      "wrong_chain",
    ]);
    expect(groupsById["address-only"].items[0]).toMatchObject({
      sessionId: "sess-unknown-001",
      verificationStatus: "address_only",
    });
    expect(groupsById["internal-agent"].items[0].nextAction["en-US"]).toContain(
      "not normal campaign users",
    );
    expect(checklistById["portkey-aa-connect"]).toMatchObject({
      state: "ready",
      sessionIds: ["sess-aa-001"],
    });
    expect(checklistById["eoa-extension-connect"].sessionIds).toEqual(["sess-eoa-001"]);
    expect(checklistById["wrong-chain-error"].evidence["en-US"]).toContain("AELF mainnet");
    expect(checklistById["unsupported-wallet-error"].sessionIds).toEqual(["sess-unsupported-001"]);
    expect(checklistById["missing-signature"].sessionIds).toEqual(["sess-missing-signature-001"]);
    expect(checklistById["account-policy-restriction"].sessionIds).toEqual(["sess-account-restricted-001"]);
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
    expect(adminOps.aiContentPack.summary.totalArtifacts).toBe(7);
    expect(adminOps.aiContentPack.artifacts.map((artifact) => artifact.type)).toEqual(
      expect.arrayContaining([
        "x_thread",
        "telegram_announcement",
        "discord_message",
        "faq",
        "tutorial",
        "daily_report",
        "winner_report",
      ]),
    );
    expect(adminOps.aiContentPack.artifacts.find((artifact) => artifact.type === "telegram_announcement")?.actionPolicy.publish).toBe("blocked");
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
