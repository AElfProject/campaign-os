import { describe, expect, it } from "vitest";
import {
  campaignDetail,
  campaignLifecycleStatuses,
  createAdvancedAnalyticsReadiness,
  createAiContentPackWorkbench,
  createAelfWebLoginAdapterReadiness,
  createAiOpsKpiAdoptionConsole,
  createAiOptimizationWorkflow,
  createContractImpactReviewModel,
  createContractTransparencyMonitor,
  createEligibilityCheckerReadModel,
  createEcosystemNextActionReadModel,
  createLeaderboardReadModel,
  createPointsRankingReferralServiceReadiness,
  createPostCampaignCloseout,
  createProjectCampaignCommandCenter,
  createStateComponentsDeliveryGallery,
  createUserWinnersExportStatusReadModel,
  createVerificationCoverageSummary,
  computeMissingTasks,
  computePublishReadiness,
  createAdminOpsReadModel,
  createExportConfirmationReadinessGate,
  createExportArtifact,
  createExportPreview,
  createParticipantWorkspaceReadModel,
  createParticipationReadModel,
  createProviderEvidenceRegistry,
  createCampaignShareCardReadiness,
  createCampaignLifecycleOperations,
  createCampaignDiscoveryReadModel,
  createCampaignMarketplaceReadiness,
  createMobileTelegramMiniAppHubReadiness,
  createPortfolioCampaignHistoryReadModel,
  createTranslationManagerReadModel,
  createLocaleAnalyticsReadiness,
  createLaunchConsoleCampaignBundles,
  createRiskIntelligenceReviewSurface,
  createVerificationPipelineReadinessGate,
  createWalletConnectionDiagnostics,
  createWalletProviderEvidenceApprovalAudit,
  createWalletProviderEvidenceIntake,
  createWalletProviderQaReadinessGate,
  deriveEligibilityWalletStatus,
  deriveParticipantTaskActions,
  deriveParticipantTaskStates,
  deriveTaskVerificationAction,
  defaultLocale,
  EXPORT_CSV_COLUMNS,
  fallbackLocale,
  getWalletBadgeLabel,
  getWalletCompatibilityLabel,
  isChineseBrowserLanguage,
  isWalletSessionVerified,
  isSupportedLocale,
  leaderboardModes,
  normalizeWalletSession,
  parseCampaignRoutePath,
  resolveLocalePreference,
  shouldRecommendChineseLocale,
  supportedLocales,
  taskTemplateLibrary,
  walletAdapterFixtures,
  walletSessions,
} from "./index";

const v02CampaignStatuses = [
  "draft",
  "ai_draft",
  "human_review",
  "scheduled",
  "live",
  "paused",
  "ended",
  "exported",
  "archived",
] as const;

const hasOwnKeyDeep = (value: unknown, key: string): boolean => {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasOwnKeyDeep(item, key));
  }

  const record = value as Record<string, unknown>;

  return Object.prototype.hasOwnProperty.call(record, key)
    || Object.values(record).some((item) => hasOwnKeyDeep(item, key));
};

describe("Campaign OS domain foundation", () => {
  it("defines exact v0.2 MVP locales with English default and fallback", () => {
    expect(supportedLocales).toEqual(["en-US", "zh-CN", "zh-TW"]);
    expect(defaultLocale).toBe("en-US");
    expect(fallbackLocale).toBe("en-US");
    expect(isSupportedLocale("zh-CN")).toBe(true);
    expect(isSupportedLocale("zh-TW")).toBe(true);
    expect(isSupportedLocale("ko-KR")).toBe(false);
    for (const p1Locale of ["ko-KR", "ja-JP", "vi-VN", "id-ID", "tr-TR", "es-ES"]) {
      expect(isSupportedLocale(p1Locale)).toBe(false);
    }
  });

  it("keeps campaign and lifecycle status sets aligned with v0.2 docs", () => {
    expect(campaignLifecycleStatuses).toEqual(v02CampaignStatuses);
  });

  it("resolves locale preference with URL, profile, storage, and default precedence", () => {
    expect(
      resolveLocalePreference({
        profileLocale: "en-US",
        storedLocale: "en-US",
        urlLocale: "zh-CN",
      }),
    ).toEqual({ locale: "zh-CN", source: "url" });

    expect(
      resolveLocalePreference({
        profileLocale: "zh-CN",
        storedLocale: "en-US",
        urlLocale: "fr-FR",
      }),
    ).toEqual({ locale: "zh-CN", source: "profile" });

    expect(
      resolveLocalePreference({
        profileLocale: "",
        storedLocale: "zh-CN",
        urlLocale: "zh-TW",
      }),
    ).toEqual({ locale: "zh-TW", source: "url" });

    expect(resolveLocalePreference({ storedLocale: "zh-TW" })).toEqual({
      locale: "zh-TW",
      source: "storage",
    });

    expect(resolveLocalePreference({ storedLocale: "ko-KR" })).toEqual({
      locale: "en-US",
      source: "default",
    });
  });

  it("parses localized campaign route paths without widening locale support", () => {
    expect(parseCampaignRoutePath("/en-US/campaigns/awaken-sprint")).toMatchObject({
      campaignId: "awaken-sprint",
      canonicalPath: "/en-US/campaigns/awaken-sprint",
      localeSource: "url",
      matched: true,
      unsupportedLocale: null,
      urlLocale: "en-US",
    });
    expect(parseCampaignRoutePath("/zh-CN/campaigns/awaken-sprint?ref=abc")).toMatchObject({
      campaignId: "awaken-sprint",
      canonicalPath: "/zh-CN/campaigns/awaken-sprint",
      localeSource: "url",
      matched: true,
      urlLocale: "zh-CN",
    });
    expect(parseCampaignRoutePath("/zh-TW/campaigns/awaken-sprint#share")).toMatchObject({
      campaignId: "awaken-sprint",
      canonicalPath: "/zh-TW/campaigns/awaken-sprint",
      localeSource: "url",
      matched: true,
      urlLocale: "zh-TW",
    });
    expect(parseCampaignRoutePath("/ja-JP/campaigns/awaken-sprint")).toMatchObject({
      campaignId: "awaken-sprint",
      canonicalPath: "/en-US/campaigns/awaken-sprint",
      localeSource: "fallback",
      matched: false,
      unsupportedLocale: "ja-JP",
      urlLocale: null,
    });
    expect(() => parseCampaignRoutePath("/zh-CN/campaigns/%E0%A4%A")).not.toThrow();
    expect(parseCampaignRoutePath("/zh-CN/campaigns/%E0%A4%A")).toMatchObject({
      campaignId: "%E0%A4%A",
      canonicalPath: "/zh-CN/campaigns/%25E0%25A4%25A",
      localeSource: "url",
      matched: true,
      urlLocale: "zh-CN",
    });
    expect(parseCampaignRoutePath("/")).toMatchObject({
      campaignId: "awaken-sprint",
      canonicalPath: "/en-US/campaigns/awaken-sprint",
      matched: false,
      urlLocale: null,
    });
  });

  it("keeps browser language as a recommendation without auto-switching locale", () => {
    const defaultResolution = resolveLocalePreference({});
    const storedResolution = resolveLocalePreference({ storedLocale: "zh-CN" });

    expect(isChineseBrowserLanguage("zh")).toBe(true);
    expect(isChineseBrowserLanguage("zh-Hans-CN")).toBe(true);
    expect(isChineseBrowserLanguage("en-US")).toBe(false);
    expect(
      shouldRecommendChineseLocale({
        browserLanguages: ["en-US", "zh-CN"],
        promptDismissed: false,
        resolution: defaultResolution,
      }),
    ).toBe(true);
    expect(
      shouldRecommendChineseLocale({
        browserLanguages: ["zh-CN"],
        promptDismissed: false,
        resolution: storedResolution,
      }),
    ).toBe(false);
    expect(
      shouldRecommendChineseLocale({
        browserLanguages: ["zh-CN"],
        promptDismissed: true,
        resolution: defaultResolution,
      }),
    ).toBe(false);
    expect(
      shouldRecommendChineseLocale({
        browserLanguages: ["zh-TW"],
        promptDismissed: false,
        resolution: defaultResolution,
      }),
    ).toBe(true);
    expect(JSON.stringify(defaultResolution)).not.toContain("zh-TW");
  });

  it("derives translation manager review state for supported MVP locales only", () => {
    const translationManager = createTranslationManagerReadModel(campaignDetail);
    const englishPanel = translationManager.panels.find((panel) => panel.locale === "en-US");
    const chinesePanel = translationManager.panels.find((panel) => panel.locale === "zh-CN");
    const traditionalChinesePanel = translationManager.panels.find((panel) => panel.locale === "zh-TW");

    expect(translationManager.defaultLocale).toBe("en-US");
    expect(translationManager.fallbackLocale).toBe("en-US");
    expect(translationManager.supportedLocales).toEqual(["en-US", "zh-CN", "zh-TW"]);
    expect(translationManager.noAutoPublishNotice["en-US"]).toContain("cannot auto-publish");
    expect(translationManager.compareReviewPrompt["en-US"]).toContain("Compare Chinese locale drafts");
    expect(translationManager.localeItems).toEqual([
      expect.objectContaining({
        locale: "en-US",
        role: "source",
        isDefault: true,
        isFallback: true,
        status: "published",
        publishState: "ready",
        fallbackToEnglish: false,
        humanReviewed: true,
      }),
      expect.objectContaining({
        locale: "zh-CN",
        role: "translation",
        isDefault: false,
        isFallback: false,
        status: "ai_draft",
        publishState: "warning",
        fallbackToEnglish: true,
        humanReviewed: false,
      }),
      expect.objectContaining({
        locale: "zh-TW",
        role: "translation",
        isDefault: false,
        isFallback: false,
        status: "empty",
        publishState: "warning",
        fallbackToEnglish: true,
        humanReviewed: false,
      }),
    ]);
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
    expect(traditionalChinesePanel).toMatchObject({
      locale: "zh-TW",
      sourceLocale: "en-US",
      aiDraft: false,
      fallbackToEnglish: true,
      humanReviewed: false,
      published: false,
      publishState: "warning",
    });
    expect(traditionalChinesePanel?.nextAction["zh-TW"]).toContain("English fallback");
  });

  it("builds field-level translation comparison rows from English source and zh-CN draft", () => {
    const translationManager = createTranslationManagerReadModel(campaignDetail);
    const rowsById = Object.fromEntries(
      translationManager.comparisonRows.map((row) => [row.id, row]),
    );

    expect(translationManager.comparisonRows.map((row) => row.id)).toEqual([
      "title",
      "description",
      "socialPost",
      "rewardDisclaimer",
    ]);
    expect(rowsById.title).toMatchObject({
      sourceLocale: "en-US",
      targetLocale: "zh-CN",
      sourceValue: "Awaken Sprint",
      targetValue: "Awaken 冲刺活动",
      targetStatus: "ai_draft",
      targetPublishState: "warning",
      fallbackToEnglish: true,
      humanReviewed: false,
    });
    expect(rowsById.rewardDisclaimer.sourceValue).toContain(
      "Export winners does not distribute rewards",
    );
    expect(rowsById.rewardDisclaimer.targetValue).toContain("导出 winners 不等于发奖");
    expect(rowsById.rewardDisclaimer.reviewNote["en-US"]).toContain("falls back to English");
    expect(translationManager.localeItems.find((item) => item.locale === "zh-TW")).toMatchObject({
      status: "empty",
      fallbackToEnglish: true,
      publishState: "warning",
    });
  });

  it("derives reward disclaimer review rows from translation state", () => {
    const translationManager = createTranslationManagerReadModel(campaignDetail);

    expect(translationManager.rewardDisclaimers).toEqual([
      expect.objectContaining({
        locale: "en-US",
        reviewed: true,
        fallbackToEnglish: false,
        reviewState: "reviewed",
        blocksPublish: false,
        publishState: "ready",
      }),
      expect.objectContaining({
        locale: "zh-CN",
        reviewed: false,
        fallbackToEnglish: true,
        reviewState: "ai_draft",
        blocksPublish: true,
        publishState: "blocker",
      }),
      expect.objectContaining({
        locale: "zh-TW",
        reviewed: false,
        fallbackToEnglish: true,
        reviewState: "missing",
        blocksPublish: true,
        publishState: "blocker",
      }),
    ]);
    expect(translationManager.rewardDisclaimers[0].disclaimer).toContain(
      "does not distribute rewards",
    );
    expect(translationManager.rewardDisclaimers[1].disclaimer).toContain("不等于发奖");
    expect(translationManager.rewardDisclaimers[1].nextAction["en-US"]).toContain("Project owner");
    expect(translationManager.rewardDisclaimers[2].blockerReason["en-US"]).toContain("missing");
    expect(translationManager.rewardDisclaimers[0].boundary["en-US"]).toContain("does not distribute rewards");
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
    expect(workbench.supportedLocales).toEqual(["en-US", "zh-CN", "zh-TW"]);
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

  it("builds the contract interface matrix console from v0.2 companion contract boundaries", () => {
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const matrix = adminOps.contractInterfaceMatrix;
    const methodNames = matrix.groups.flatMap((group) =>
      group.methods.map((method) => method.name),
    );
    const areas = matrix.changeMatrix.map((row) => row.area["en-US"]);

    expect(matrix.summary).toMatchObject({
      totalContracts: 4,
      totalMethods: 22,
      p1Rows: 7,
      blockedRows: 1,
    });
    expect(matrix.groups.map((group) => group.contractName)).toEqual([
      "CampaignRegistryV2",
      "CampaignPointsLedgerV2",
      "ReferralRegistryV2",
      "EligibilityRootRegistryV2",
    ]);
    expect(methodNames).toEqual([
      "CreateCampaign",
      "UpdateCampaignMetadata",
      "UpdateTaskConfigHash",
      "SetCampaignStatus",
      "SetWalletPolicy",
      "SetSupportedLocales",
      "TransferCampaignOwner",
      "PauseCampaign",
      "GetCampaign",
      "CommitPointsBatch",
      "RevokePointsBatch",
      "GetPointsBatch",
      "AwardTaskPoints",
      "RevokeTaskPoints",
      "BindReferral",
      "MarkReferralQualified",
      "RemoveReferral",
      "GetReferral",
      "SetEligibilityRoot",
      "UpdateEligibilityRoot",
      "GetEligibilityRoot",
      "VerifyEligibilityProof",
    ]);
    const setSupportedLocalesMethod = matrix.groups
      .find((group) => group.contractName === "CampaignRegistryV2")
      ?.methods.find((method) => method.name === "SetSupportedLocales");

    expect(setSupportedLocalesMethod?.nextAction).toMatchObject({
      "en-US": expect.stringContaining("zh-TW"),
      "zh-CN": expect.stringContaining("zh-TW"),
      "zh-TW": expect.stringContaining("zh-TW"),
    });
    expect(setSupportedLocalesMethod?.nextAction["en-US"]).not.toContain("limited to en-US and zh-CN");
    expect(setSupportedLocalesMethod?.nextAction["zh-CN"]).not.toContain("保持 en-US 与 zh-CN");
    expect(
      matrix.groups
        .find((group) => group.contractName === "CampaignPointsLedgerV2")
        ?.methods.find((method) => method.name === "AwardTaskPoints"),
    ).toMatchObject({
      readiness: "warning",
      phase: "P1",
    });
    expect(areas).toEqual([
      "Campaign config",
      "Task config",
      "Points ledger",
      "Referral",
      "Eligibility/winners",
      "Rewards",
      "Multilingual content",
      "Wallet type",
      "Risk flags",
    ]);
    expect(matrix.changeMatrix.find((row) => row.area["en-US"] === "Rewards")).toMatchObject({
      priority: "P2",
      readiness: "blocker",
      boundary: expect.objectContaining({
        "en-US": expect.stringContaining("Campaign OS does not custody or distribute rewards"),
      }),
    });
    expect(
      matrix.changeMatrix.find((row) => row.area["en-US"] === "Multilingual content")?.boundary["en-US"],
    ).toContain("Full translated copy stays off-chain");
    expect(
      matrix.changeMatrix.find((row) => row.area["en-US"] === "Risk flags")?.boundary["en-US"],
    ).toContain("Risk detail stays off-chain");
    expect(matrix.summary.boundary["zh-TW"]).toContain("No ABI generation");
    expect(
      matrix.changeMatrix.find((row) => row.area["en-US"] === "Multilingual content"),
    ).toMatchObject({
      area: expect.objectContaining({ "zh-TW": "Multilingual content" }),
      boundary: expect.objectContaining({ "zh-TW": expect.stringContaining("translated copy") }),
    });
  });

  it("derives a contract transparency monitor from existing contract and export read models", () => {
    const monitor = createContractTransparencyMonitor(campaignDetail);
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const exportReadiness = createExportConfirmationReadinessGate(campaignDetail);
    const closeout = createPostCampaignCloseout(campaignDetail);
    const lanesById = Object.fromEntries(monitor.lanes.map((lane) => [lane.id, lane]));
    const serialized = JSON.stringify(monitor).toLowerCase();

    expect(adminOps.contractTransparencyMonitor).toEqual(monitor);
    expect(monitor.campaignId).toBe(campaignDetail.id);
    expect(monitor.lanes.map((lane) => lane.id)).toEqual([
      "off-chain-mvp",
      "export-root-readiness",
      "points-batch-root",
      "referral-binding-root",
      "eligibility-root",
      "verifier-role",
      "reward-custody-claim",
    ]);
    expect(monitor.summary).toMatchObject({
      totalLanes: monitor.lanes.length,
      readyLanes: monitor.lanes.filter((lane) => lane.readiness === "ready").length,
      reviewRequiredLanes: monitor.lanes.filter((lane) => lane.readiness === "review_required").length,
      blockedLanes: monitor.lanes.filter((lane) => lane.readiness === "blocked").length,
      localOnlyLanes: monitor.lanes.filter((lane) => lane.readiness === "local_only").length,
      topLaneId: "reward-custody-claim",
    });
    expect(monitor.summary.topNextAction).toEqual(lanesById["reward-custody-claim"]?.nextAction);
    expect(lanesById["export-root-readiness"]).toMatchObject({
      readiness: exportReadiness.summary.blockedRows > 0 ? "blocked" : "ready",
      sourceSurface: expect.objectContaining({
        "en-US": "Export confirmation readiness",
      }),
      boundary: exportReadiness.boundary,
      nextAction: exportReadiness.nextAction,
    });
    expect(lanesById["points-batch-root"]).toMatchObject({
      readiness: "review_required",
      ownerRole: "internal_operator",
      phase: "P1",
    });
    expect(lanesById["referral-binding-root"]?.sourceSurface["en-US"]).toContain(
      "ReferralRegistryV2.BindReferral",
    );
    expect(lanesById["eligibility-root"]?.sourceSurface["en-US"]).toContain(
      "EligibilityRootRegistryV2.SetEligibilityRoot",
    );
    expect(lanesById["verifier-role"]).toMatchObject({
      readiness: "local_only",
      blocksExecution: false,
    });
    expect(lanesById["reward-custody-claim"]).toMatchObject({
      readiness: "blocked",
      blocksExecution: true,
      ownerRole: "contract_reviewer",
      phase: "P2",
    });
    expect(lanesById["reward-custody-claim"]?.boundary["en-US"]).toContain(
      "Reward custody and contract claim execution are blocked",
    );
    expect(monitor.closeoutContext).toMatchObject({
      status: closeout.status,
      topGateId: closeout.summary.topGateId,
      topAction: closeout.summary.topAction,
    });
    expect(monitor.closeoutContext.evidence).toEqual(
      closeout.gates.find((gate) => gate.id === closeout.summary.topGateId)?.evidence,
    );
    expect(monitor.boundary["en-US"]).toContain("No live contract transaction");
    expect(monitor.boundary["en-US"]).toContain("root generation");
    expect(monitor.boundary["en-US"]).toContain("reward custody");
    expect(monitor.boundary["zh-CN"]).toContain("不会执行真实合约交易");
    expect(monitor.boundary["zh-CN"]).toContain("托管奖励");
    expect(monitor.boundary["zh-TW"]).toContain("託管獎勵");

    for (const lane of monitor.lanes) {
      expect(lane.label["en-US"].length).toBeGreaterThan(0);
      expect(lane.label["zh-CN"].length).toBeGreaterThan(0);
      expect(lane.label["zh-TW"].length).toBeGreaterThan(0);
      expect(lane.sourceEvidence["en-US"].length).toBeGreaterThan(0);
      expect(lane.sourceSurface["en-US"].length).toBeGreaterThan(0);
      expect(lane.boundary["en-US"].length).toBeGreaterThan(0);
      expect(lane.nextAction["en-US"].length).toBeGreaterThan(0);
    }

    for (const unsafe of [
      "signature",
      "signedpayload",
      "contractaddress",
      "contractroot",
      "merkleroot",
      "downloadurl",
      "storageurl",
      "fileurl",
      "transactionid",
      "txid",
      "privatekey",
      "apikey",
      "secret",
    ]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("builds the delivery checklist readiness console with conservative v0.2 evidence", () => {
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const readiness = adminOps.deliveryChecklistReadiness;
    const items = readiness.groups.flatMap((group) => group.items);
    const itemsById = Object.fromEntries(items.map((item) => [item.id, item]));

    expect(readiness.groups.map((group) => group.id)).toEqual([
      "product",
      "architecture",
      "ui",
      "contract",
      "qa",
    ]);
    expect(readiness.summary).toMatchObject({
      groupCount: 5,
      totalItems: items.length,
      coveredItems: items.filter((item) => item.status === "covered").length,
      needsReviewItems: items.filter((item) => item.status === "needs_review").length,
      blockedItems: items.filter((item) => item.status === "blocked").length,
      deferredItems: items.filter((item) => item.status === "deferred").length,
    });
    expect(new Set(items.map((item) => item.status))).toEqual(
      new Set(["covered", "needs_review", "deferred"]),
    );
    expect(readiness.boundary["en-US"]).toContain("No live wallet SDK");
    expect(readiness.boundary["en-US"]).toContain("contract transaction");
    expect(readiness.boundary["en-US"]).toContain("reward distribution");

    expect(itemsById["product-aa-eoa-support"]).toMatchObject({
      groupId: "product",
      status: "covered",
      ownerRole: "project_owner",
      blocksDelivery: false,
    });
    expect(itemsById["ui-wallet-modal-sections"]?.surface["en-US"]).toBe("Wallet Connect Modal");
    expect(itemsById["architecture-wallet-normalization"]).toMatchObject({
      groupId: "architecture",
      status: "covered",
    });
    expect(itemsById["architecture-wallet-normalization"]?.evidence["en-US"]).toContain("accounts");
    expect(itemsById["architecture-wallet-normalization"]?.evidence["en-US"]).toContain("publicKey");
    expect(itemsById["product-reward-disclaimer-locales"]).toMatchObject({
      status: "covered",
      blocksDelivery: false,
      ownerRole: "project_owner",
    });
    expect(itemsById["product-reward-disclaimer-locales"]?.evidence["en-US"]).toContain(
      "localized reward disclaimer gate",
    );
    expect(itemsById["product-language-selector"]).toMatchObject({
      status: "covered",
      blocksDelivery: false,
    });
    expect(itemsById["product-language-selector"]?.evidence["en-US"]).toContain("English");
    expect(itemsById["product-language-selector"]?.evidence["en-US"]).toContain("Simplified Chinese");
    expect(itemsById["product-language-selector"]?.evidence["en-US"]).toContain("Traditional Chinese");
    expect(itemsById["product-mvp-locale-coverage"]).toMatchObject({
      status: "covered",
      blocksDelivery: false,
    });
    expect(itemsById["product-mvp-locale-coverage"]?.evidence["en-US"]).toContain(
      "en-US, zh-CN, and zh-TW",
    );
    expect(itemsById["product-mvp-locale-coverage"]?.nextAction["en-US"]).toContain(
      "P1 locales",
    );
    expect(itemsById["product-future-locale-expansion"]).toMatchObject({
      status: "deferred",
      blocksDelivery: false,
    });
    expect(itemsById["product-future-locale-expansion"]?.evidence["en-US"]).toContain(
      "P1 locales",
    );
    expect(itemsById["product-future-locale-expansion"]?.nextAction["en-US"]).toContain(
      "readiness matrix",
    );
    expect(readiness.p1LocaleExpansion.summary).toMatchObject({
      totalLocales: 6,
      deferredLocales: 6,
      runtimeSupportedLocales: 0,
    });
    expect(readiness.p1LocaleExpansion.summary.boundary["en-US"]).toContain(
      "Runtime support remains limited to en-US, zh-CN, and zh-TW",
    );
    expect(readiness.p1LocaleExpansion.rows.map((row) => row.code)).toEqual([
      "ko-KR",
      "ja-JP",
      "vi-VN",
      "id-ID",
      "tr-TR",
      "es-ES",
    ]);
    for (const row of readiness.p1LocaleExpansion.rows) {
      expect(row).toMatchObject({
        ownerRole: "project_owner",
        runtimeSupported: false,
        status: "deferred",
      });
      expect(row.displayName["en-US"].length).toBeGreaterThan(0);
      expect(row.reason["en-US"]).toContain(row.code);
      expect(row.prerequisites).toHaveLength(4);
      expect(row.prerequisites.every((prerequisite) => prerequisite["en-US"].includes(row.code))).toBe(true);
      expect(row.nextAction["en-US"]).toContain(row.code);
    }
    expect(itemsById["product-contract-impact-review"]?.evidence["en-US"]).toContain(
      "claim-mode disabled and future approval-gated",
    );
    expect(itemsById["qa-wrong-chain-error"]).toMatchObject({
      status: "needs_review",
      blocksDelivery: false,
    });
    expect(itemsById["qa-portkey-aa-connect"]?.surface["en-US"]).toBe("Wallet Provider QA Gate");
    expect(itemsById["qa-portkey-aa-connect"]?.evidence["en-US"]).toContain(
      "Live Portkey AA provider evidence is not attached yet",
    );
    expect(itemsById["qa-eoa-extension-connect"]?.evidence["en-US"]).toContain(
      "Live EOA browser-extension evidence is not attached yet",
    );
    expect(itemsById["qa-wrong-chain-error"]?.nextAction["en-US"]).toContain("live wrong-chain");
    expect(itemsById["qa-unsupported-wallet-error"]?.evidence["zh-TW"]).toContain(
      "真實不支援錢包",
    );
    expect(itemsById["qa-export-csv-columns"]).toMatchObject({
      status: "covered",
      ownerRole: "project_owner",
    });
    expect(itemsById["qa-contract-claim-admin-approval"]).toMatchObject({
      status: "deferred",
      blocksDelivery: false,
      ownerRole: "contract_reviewer",
    });
    expect(itemsById["qa-contract-claim-admin-approval"]?.evidence["en-US"]).toContain(
      "security, custody/legal, external audit, and admin approval",
    );
    expect(itemsById["contract-reward-custody-excluded"]).toMatchObject({
      status: "deferred",
      blocksDelivery: false,
      ownerRole: "contract_reviewer",
    });
    expect(itemsById["contract-reward-custody-excluded"]?.evidence["en-US"]).toContain(
      "accepted MVP exclusion",
    );
    expect(itemsById["contract-reward-custody-excluded"]?.nextAction["en-US"]).toContain(
      "Keep reward custody outside Campaign OS",
    );
    expect(readiness.blockers.map((item) => item.id)).toEqual([]);
    expect(readiness.needsReview.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "qa-portkey-aa-connect",
        "qa-eoa-extension-connect",
        "qa-wrong-chain-error",
        "qa-unsupported-wallet-error",
      ]),
    );
    expect(readiness.needsReview.map((item) => item.id)).not.toEqual(
      expect.arrayContaining(["product-reward-disclaimer-locales", "qa-reward-disclaimer-blocker"]),
    );
    expect(itemsById["qa-reward-disclaimer-blocker"]).toMatchObject({
      status: "covered",
      blocksDelivery: false,
      ownerRole: "project_owner",
    });
    expect(readiness.boundary["zh-TW"]).toContain("No live wallet SDK");
    expect(itemsById["product-reward-disclaimer-locales"]).toMatchObject({
      label: expect.objectContaining({ "zh-TW": expect.any(String) }),
      nextAction: expect.objectContaining({ "zh-TW": expect.any(String) }),
    });
  });

  it("builds the delivery acceptance console across v0.1 and v0.2 without overclaiming live readiness", () => {
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const acceptance = adminOps.deliveryAcceptance;
    const rows = acceptance.solutionSets.flatMap((solutionSet) => solutionSet.rows);
    const rowsById = Object.fromEntries(rows.map((row) => [row.id, row]));

    expect(acceptance.solutionSets.map((solutionSet) => solutionSet.id)).toEqual([
      "v0_1_product_ui",
      "v0_2_wallet_i18n_contract",
    ]);
    expect(acceptance.summary).toMatchObject({
      solutionSetCount: 2,
      totalRows: rows.length,
      proven: rows.filter((row) => row.status === "proven").length,
      partial: rows.filter((row) => row.status === "partial").length,
      needsLiveEvidence: rows.filter((row) => row.status === "needs_live_evidence").length,
      blocked: rows.filter((row) => row.status === "blocked").length,
      deferred: rows.filter((row) => row.status === "deferred").length,
      topSeverity: "critical",
    });
    expect(new Set(rows.map((row) => row.status))).toEqual(
      new Set(["proven", "partial", "needs_live_evidence", "deferred"]),
    );
    expect(acceptance.boundary["en-US"]).toContain("No live wallet SDK");
    expect(acceptance.boundary["en-US"]).toContain("provider API");
    expect(acceptance.boundary["en-US"]).toContain("contract write");
    expect(acceptance.boundary["en-US"]).toContain("export file");
    expect(acceptance.boundary["en-US"]).toContain("storage write");
    expect(acceptance.boundary["en-US"]).toContain("reward custody");
    expect(acceptance.boundary["en-US"]).toContain("reward distribution");

    expect(rowsById["v01-global-navigation-shell"]).toMatchObject({
      solutionSetId: "v0_1_product_ui",
      status: "proven",
      launchBlocking: false,
    });
    expect(rowsById["v01-user-participation-loop"]).toMatchObject({
      status: "partial",
      severity: "high",
      ownerRole: "project_owner",
    });
    expect(rowsById["v02-live-wallet-provider-evidence"]).toMatchObject({
      solutionSetId: "v0_2_wallet_i18n_contract",
      status: "needs_live_evidence",
      severity: "critical",
      launchBlocking: true,
    });
    expect(rowsById["v02-live-wallet-provider-evidence"]?.boundary?.["en-US"]).toContain(
      "Wallet Provider Evidence Intake",
    );
    expect(rowsById["v02-contract-claim-reward-custody"]).toMatchObject({
      status: "deferred",
      severity: "low",
      launchBlocking: false,
    });
    expect(rowsById["v02-contract-claim-reward-custody"]?.evidenceSummary["en-US"]).toContain(
      "accepted MVP non-goal boundary",
    );
    expect(rowsById["v02-p1-locale-expansion"]).toMatchObject({
      status: "deferred",
      severity: "low",
    });
    expect(
      rows
        .filter((row) => row.status === "needs_live_evidence" || row.status === "blocked")
        .some((row) => row.status === "proven"),
    ).toBe(false);
    expect(acceptance.topResidualGaps[0]?.id).toBe("v02-live-wallet-provider-evidence");
    expect(acceptance.topResidualGaps.map((row) => row.id).slice(0, 2)).not.toContain(
      "v02-contract-claim-reward-custody",
    );
    const lastResidualGap = acceptance.topResidualGaps[acceptance.topResidualGaps.length - 1];
    expect(lastResidualGap?.id).not.toBe("v02-p1-locale-expansion");

    for (const row of rows) {
      expect(row.title["en-US"]).toBeTruthy();
      expect(row.title["zh-CN"]).toBeTruthy();
      expect(row.title["zh-TW"]).toBeTruthy();
      expect(row.evidenceSurface["en-US"]).toBeTruthy();
      expect(row.evidenceSummary["en-US"]).toBeTruthy();
      expect(row.nextMissionAction["en-US"]).toBeTruthy();
    }
  });

  it("includes the wallet provider QA gate in the Admin/Ops read model", () => {
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const readinessItems = adminOps.deliveryChecklistReadiness.groups.flatMap((group) => group.items);
    const readinessById = Object.fromEntries(readinessItems.map((item) => [item.id, item]));

    expect(adminOps.walletProviderQaGate.summary).toMatchObject({
      totalScenarios: 4,
      seededReadyScenarios: 4,
      liveEvidenceReadyScenarios: 0,
      missingLiveEvidenceScenarios: 4,
    });
    expect(adminOps.walletProviderQaGate.scenarios.map((scenario) => scenario.id)).toEqual([
      "portkey-aa-connect",
      "eoa-extension-connect",
      "wrong-chain-error",
      "unsupported-wallet-error",
    ]);
    expect(readinessById["qa-portkey-aa-connect"]).toMatchObject({
      status: "needs_review",
      evidence: adminOps.walletProviderQaGate.scenarios[0].evidence,
      nextAction: adminOps.walletProviderQaGate.scenarios[0].nextAction,
    });
    expect(adminOps.walletProviderQaGate.boundary["en-US"]).toContain("no live wallet SDK connection");
    expect(adminOps.walletProviderQaGate.boundary["zh-CN"]).toContain("奖励发放");
    expect(adminOps.walletProviderQaGate.boundary["zh-TW"]).toContain("獎勵發放");
  });

  it("models live wallet provider evidence intake without counting unapproved evidence as live-ready", () => {
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const intake = adminOps.walletProviderEvidenceIntake;
    const standalone = createWalletProviderEvidenceIntake(adminOps.walletProviderQaGate);
    const scenariosById = Object.fromEntries(intake.scenarios.map((scenario) => [scenario.id, scenario]));
    const acceptanceRows = adminOps.deliveryAcceptance.solutionSets.flatMap((solutionSet) => solutionSet.rows);
    const liveWalletAcceptance = acceptanceRows.find((row) => row.id === "v02-live-wallet-provider-evidence");

    expect(standalone.summary).toEqual(intake.summary);
    expect(intake.scenarios.map((scenario) => scenario.id)).toEqual([
      "portkey-aa-connect",
      "eoa-extension-connect",
      "wrong-chain-error",
      "unsupported-wallet-error",
    ]);
    expect(intake.summary).toMatchObject({
      totalScenarios: 4,
      approvedScenarios: 0,
      submittedScenarios: 1,
      missingScenarios: 2,
      rejectedScenarios: 1,
      expiredScenarios: 0,
      releaseBlockers: 3,
      reviewRequiredScenarios: 1,
      topScenarioId: "portkey-aa-connect",
    });
    expect(scenariosById["eoa-extension-connect"]).toMatchObject({
      evidenceStatus: "submitted",
      reviewState: "in_review",
      releaseImpact: "review_required",
      reviewerRole: "internal_operator",
    });
    expect(scenariosById["unsupported-wallet-error"]).toMatchObject({
      evidenceStatus: "rejected",
      reviewState: "rejected",
      releaseImpact: "blocked",
    });
    expect(
      intake.scenarios
        .filter((scenario) => scenario.evidenceStatus !== "approved")
        .some((scenario) => scenario.releaseImpact === "ready"),
    ).toBe(false);
    expect(scenariosById["eoa-extension-connect"].submittedArtifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          artifactType: "qa_run",
          reference: "local-wallet-qa/eoa-extension-connect-2026-07-03",
        }),
      ]),
    );

    for (const scenario of intake.scenarios) {
      expect(scenario.label["en-US"]).toBeTruthy();
      expect(scenario.label["zh-CN"]).toBeTruthy();
      expect(scenario.label["zh-TW"]).toBeTruthy();
      expect(scenario.serviceGate["en-US"]).toContain("wallet.adapters");
      expect(scenario.degradationPath["en-US"]).toBeTruthy();
      expect(scenario.expectedArtifacts.length).toBeGreaterThan(0);
      expect(scenario.boundary["en-US"]).toContain("No live wallet SDK");
      expect(scenario.boundary["en-US"]).toContain("provider API");
      expect(scenario.boundary["en-US"]).toContain("signature");
      expect(scenario.boundary["en-US"]).toContain("storage write");
      expect(scenario.boundary["en-US"]).toContain("contract write");
      expect(scenario.boundary["en-US"]).toContain("reward distribution");
    }
    expect(intake.boundary["zh-CN"]).toContain("不会执行实时钱包 SDK");
    expect(intake.nextAction).toEqual(intake.summary.topNextAction);
    expect(liveWalletAcceptance).toMatchObject({
      status: "needs_live_evidence",
      evidenceSurface: expect.objectContaining({
        "en-US": expect.stringContaining("Wallet Provider Evidence Intake"),
      }),
    });
    expect(liveWalletAcceptance?.evidenceSummary["en-US"]).toContain("0 approved");
    expect(liveWalletAcceptance?.nextMissionAction["en-US"]).toContain("Portkey AA");
  });

  it("audits wallet provider evidence approval without promoting submitted or rejected evidence", () => {
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const audit = adminOps.walletProviderEvidenceApprovalAudit;
    const scenariosById = Object.fromEntries(audit.scenarios.map((scenario) => [scenario.id, scenario]));
    const acceptanceRows = adminOps.deliveryAcceptance.solutionSets.flatMap((solutionSet) => solutionSet.rows);
    const liveWalletAcceptance = acceptanceRows.find((row) => row.id === "v02-live-wallet-provider-evidence");

    expect(audit.summary).toMatchObject({
      totalScenarios: 4,
      approvedScenarios: 0,
      reviewRequiredScenarios: 1,
      blockedScenarios: 3,
      notApplicableScenarios: 0,
      completeArtifactScenarios: 0,
      incompleteArtifactScenarios: 4,
      releaseBlockers: 3,
      topScenarioId: "portkey-aa-connect",
      topFailedRuleId: "required-artifacts",
      topFailedRuleState: "blocked",
    });
    expect(audit.scenarios.map((scenario) => scenario.id)).toEqual([
      "portkey-aa-connect",
      "eoa-extension-connect",
      "wrong-chain-error",
      "unsupported-wallet-error",
    ]);
    expect(scenariosById["eoa-extension-connect"]).toMatchObject({
      approvalState: "review_required",
      failedRuleIds: ["required-artifacts", "reviewer-approval", "live-evidence-status"],
      reviewerDecision: expect.objectContaining({
        state: "in_review",
      }),
      releaseImpact: "review_required",
    });
    expect(scenariosById["eoa-extension-connect"].artifactCoverage).toMatchObject({
      requiredArtifactIds: ["eoa-extension-connect-screenshot", "eoa-extension-connect-qa-run"],
      submittedArtifactIds: ["eoa-extension-connect-local-qa-run", "eoa-extension-connect-review-note"],
      missingRequiredArtifactIds: ["eoa-extension-connect-screenshot"],
      requiredCount: 2,
      submittedRequiredCount: 1,
      optionalCount: 1,
      complete: false,
    });
    expect(scenariosById["unsupported-wallet-error"]).toMatchObject({
      approvalState: "blocked",
      failedRuleIds: [
        "required-artifacts",
        "reviewer-approval",
        "live-evidence-status",
        "service-gate",
      ],
      reviewerDecision: expect.objectContaining({
        state: "rejected",
      }),
      releaseImpact: "blocked",
    });
    expect(scenariosById["wrong-chain-error"].artifactCoverage.missingRequiredArtifactIds).toEqual([
      "wrong-chain-error-screenshot",
      "wrong-chain-error-qa-run",
      "wrong-chain-error-runbook",
    ]);
    expect(
      audit.scenarios
        .filter((scenario) => scenario.approvalState !== "approved")
        .some((scenario) => scenario.releaseImpact === "ready"),
    ).toBe(false);

    for (const scenario of audit.scenarios) {
      expect(scenario.label["en-US"]).toBeTruthy();
      expect(scenario.label["zh-CN"]).toBeTruthy();
      expect(scenario.label["zh-TW"]).toBeTruthy();
      expect(scenario.rules.map((rule) => rule.id)).toEqual([
        "required-artifacts",
        "reviewer-approval",
        "live-evidence-status",
        "service-gate",
        "non-live-boundary",
      ]);
      expect(scenario.boundary["en-US"]).toContain("No live wallet SDK");
      expect(scenario.boundary["en-US"]).toContain("provider API");
      expect(scenario.boundary["en-US"]).toContain("storage write");
      expect(scenario.boundary["en-US"]).toContain("reward distribution");
    }
    expect(audit.boundary["en-US"]).toContain("No live wallet SDK");
    expect(liveWalletAcceptance).toMatchObject({
      status: "needs_live_evidence",
      severity: "critical",
      launchBlocking: true,
      evidenceSurface: expect.objectContaining({
        "en-US": expect.stringContaining("Wallet Provider Evidence Approval Audit"),
      }),
      evidenceSummary: expect.objectContaining({
        "en-US": expect.stringContaining("top failed rule required-artifacts"),
      }),
    });
  });

  it("allows a scenario-level approved fixture without approving the whole wallet provider gate", () => {
    const gate = createWalletProviderQaReadinessGate(walletSessions, {
      "portkey-aa-connect": "ready",
    });
    const intake = createWalletProviderEvidenceIntake(gate, {
      "portkey-aa-connect": {
        evidenceStatus: "approved",
        submittedArtifacts: [
          {
            id: "portkey-aa-connect-approved-screenshot",
            artifactType: "screenshot",
            label: {
              "en-US": "Approved AA screenshot",
              "zh-CN": "已批准 AA 截图",
              "zh-TW": "已批准 AA 截圖",
            },
            required: true,
            reference: "local-wallet-qa/portkey-aa-connect-approved-screenshot",
          },
          {
            id: "portkey-aa-connect-approved-qa-run",
            artifactType: "qa_run",
            label: {
              "en-US": "Approved AA QA run",
              "zh-CN": "已批准 AA QA run",
              "zh-TW": "已批准 AA QA run",
            },
            required: true,
            reference: "local-wallet-qa/portkey-aa-connect-approved-run",
          },
        ],
      },
    });
    const audit = createWalletProviderEvidenceApprovalAudit(intake, gate);
    const scenariosById = Object.fromEntries(audit.scenarios.map((scenario) => [scenario.id, scenario]));

    expect(audit.summary).toMatchObject({
      approvedScenarios: 1,
      reviewRequiredScenarios: 1,
      blockedScenarios: 2,
      completeArtifactScenarios: 1,
      releaseBlockers: 2,
      topScenarioId: "wrong-chain-error",
      topFailedRuleId: "required-artifacts",
    });
    expect(scenariosById["portkey-aa-connect"]).toMatchObject({
      approvalState: "approved",
      failedRuleIds: [],
      reviewerDecision: expect.objectContaining({
        state: "approved",
      }),
      releaseImpact: "ready",
    });
    expect(scenariosById["portkey-aa-connect"].artifactCoverage).toMatchObject({
      complete: true,
      requiredCount: 2,
      submittedRequiredCount: 2,
      missingRequiredArtifactIds: [],
    });
    expect(scenariosById["eoa-extension-connect"]).toMatchObject({
      approvalState: "review_required",
      releaseImpact: "review_required",
    });
  });

  it("derives wallet provider approval audit deterministically", () => {
    const gate = createWalletProviderQaReadinessGate(walletSessions);
    const firstAudit = createWalletProviderEvidenceApprovalAudit(createWalletProviderEvidenceIntake(gate), gate);
    const secondAudit = createWalletProviderEvidenceApprovalAudit(createWalletProviderEvidenceIntake(gate), gate);

    expect(secondAudit).toEqual(firstAudit);
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

  it("exposes wallet provider QA readiness separately from seeded wallet diagnostics", () => {
    const gate = createWalletProviderQaReadinessGate(walletSessions);
    const scenariosById = Object.fromEntries(gate.scenarios.map((scenario) => [scenario.id, scenario]));

    expect(gate.scenarios).toHaveLength(4);
    expect(gate.summary).toEqual({
      totalScenarios: 4,
      seededReadyScenarios: 4,
      liveEvidenceReadyScenarios: 0,
      missingLiveEvidenceScenarios: 4,
      releaseBlockers: 0,
    });
    expect(scenariosById["portkey-aa-connect"]).toMatchObject({
      seededStatus: "ready",
      liveEvidenceStatus: "missing",
      matchedSessionIds: ["sess-aa-001"],
    });
    expect(scenariosById["eoa-extension-connect"]).toMatchObject({
      seededStatus: "ready",
      liveEvidenceStatus: "missing",
      matchedSessionIds: ["sess-eoa-001"],
    });
    expect(scenariosById["wrong-chain-error"].evidence["en-US"]).toContain(
      "Live wrong-chain recovery evidence is not attached yet",
    );
    expect(scenariosById["unsupported-wallet-error"].nextAction["zh-CN"]).toContain("真实不支持");
    expect(gate.boundary["en-US"]).toContain("reward distribution");
    expect(gate.boundary["zh-CN"]).toContain("奖励托管");
    expect(gate.boundary["zh-TW"]).toContain("獎勵託管");

    const liveReadyGate = createWalletProviderQaReadinessGate(walletSessions, {
      "portkey-aa-connect": "ready",
      "wrong-chain-error": "blocked",
    });

    expect(liveReadyGate.summary).toMatchObject({
      liveEvidenceReadyScenarios: 1,
      missingLiveEvidenceScenarios: 2,
      releaseBlockers: 1,
      seededReadyScenarios: 4,
    });
    expect(liveReadyGate.scenarios.find((scenario) => scenario.id === "portkey-aa-connect")).toMatchObject({
      liveEvidenceStatus: "ready",
      releaseImpact: "ready",
    });
    expect(liveReadyGate.scenarios.find((scenario) => scenario.id === "wrong-chain-error")).toMatchObject({
      liveEvidenceStatus: "blocked",
      releaseImpact: "release_blocker",
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
    expect(readiness.warnings).toContain("Chinese locale content falls back to English until reviewed.");
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

  it("creates deterministic local CSV and JSON export artifacts", () => {
    const exportPreview = createExportPreview(
      campaignDetail.id,
      campaignDetail.participants,
      campaignDetail.tasks,
      campaignDetail.walletSessions,
    );
    const csvArtifact = createExportArtifact(exportPreview, "csv");
    const csvArtifactAgain = createExportArtifact(exportPreview, "csv");
    const jsonArtifact = createExportArtifact(exportPreview, "json");
    const parsedJson = JSON.parse(jsonArtifact.payload) as {
      columns: string[];
      rows: Array<Record<string, unknown>>;
    };

    expect(csvArtifact.format).toBe("csv");
    expect(csvArtifact.mimeType).toBe("text/csv;charset=utf-8");
    expect(csvArtifact.payload.split("\n")[0]).toBe(EXPORT_CSV_COLUMNS.join(","));
    expect(csvArtifact.payload).toContain(
      "camp-awaken-sprint,2F4...9aB,AA,PORTKEY_AA,en-US,270,12,true,",
    );
    expect(csvArtifact.payload).toContain(
      "referral_velocity_review",
    );
    expect(csvArtifact.payload).toContain("task-bridge:pending:aelfscan");
    expect(csvArtifact.payload).toContain("demo-task-bridge-3E9");
    expect(csvArtifact.metadata).toMatchObject({
      blockedRows: 0,
      columns: EXPORT_CSV_COLUMNS,
      generatedMode: "local_review_only",
      readyRows: 1,
      reviewRequiredRows: 3,
      totalRows: 4,
    });
    expect(csvArtifact.metadata.checksum).toBe(csvArtifactAgain.metadata.checksum);
    expect(csvArtifact.payload).toBe(csvArtifactAgain.payload);
    expect(csvArtifact.safety).toMatchObject({
      localOnly: true,
      noContractRoot: true,
      noDownloadUrl: true,
      noRewardDistribution: true,
      noStorageWrite: true,
      rewardDistributionOwner: "campaign_project",
    });

    expect(jsonArtifact.format).toBe("json");
    expect(jsonArtifact.mimeType).toBe("application/json;charset=utf-8");
    expect(parsedJson.columns).toEqual(EXPORT_CSV_COLUMNS);
    expect(parsedJson.rows).toHaveLength(4);
    expect(parsedJson.rows[1]).toMatchObject({
      account_type: "EOA",
      locale_preference: "zh-CN",
      risk_flags: ["referral_velocity_review"],
      wallet_source: "PORTKEY_EOA_EXTENSION",
    });
    expect(jsonArtifact.metadata.totalRows).toBe(csvArtifact.metadata.totalRows);

    for (const unsafe of [
      "downloadUrl",
      "storageKey",
      "contractRoot",
      "transactionId",
      "privateKey",
      "signedPayload",
      "ipAddress",
      "deviceFingerprint",
    ]) {
      expect(hasOwnKeyDeep(csvArtifact, unsafe)).toBe(false);
      expect(hasOwnKeyDeep(jsonArtifact, unsafe)).toBe(false);
    }
  });

  it("derives ready user winners export status from the export preview row", () => {
    const [readyParticipant] = campaignDetail.participants;
    const status = createUserWinnersExportStatusReadModel(campaignDetail, readyParticipant);

    expect(status).toMatchObject({
      campaignId: "camp-awaken-sprint",
      exportBatchId: "export-awaken-sprint-preview",
      participantId: "part-aa-001",
      status: "ready",
      walletAddress: "2F4...9aB",
    });
    expect(status.statusLabel["en-US"]).toBe("Ready for export");
    expect(status.row).toMatchObject({
      accountType: "AA",
      eligible: true,
      localePreference: "en-US",
      rank: 12,
      rowStatus: "ready",
      totalPoints: 270,
      walletSource: "PORTKEY_AA",
      walletTypeVerified: true,
    });
    expect(status.row?.taskRecords).toEqual(
      expect.arrayContaining(["task-bridge:completed:aelfscan"]),
    );
    expect(status.row?.evidenceHashes).toEqual(
      expect.arrayContaining(["demo-task-bridge-2F4"]),
    );
    expect(status.rewardBoundary["en-US"]).toContain("Export winners does not distribute rewards");
    expect(status.fulfillmentOwner["en-US"]).toContain("campaign project");
    expect(status.rewardBoundary["zh-TW"]).toContain("Export winners does not distribute rewards");
    expect(status.fulfillmentOwner["zh-TW"]).toContain("campaign project");
  });

  it("derives blocked user winners export status for missing required tasks", () => {
    const [, blockedParticipant] = campaignDetail.participants;
    const status = createUserWinnersExportStatusReadModel(campaignDetail, blockedParticipant);

    expect(status).toMatchObject({
      status: "blocked",
      walletAddress: "3E9...7cD",
    });
    expect(status.row).toMatchObject({
      accountType: "EOA",
      localePreference: "zh-CN",
      missingTasks: ["bridge_ebridge"],
      riskFlags: ["referral_velocity_review"],
      rowStatus: "review_required",
      walletSource: "PORTKEY_EOA_EXTENSION",
    });
    expect(status.reason["en-US"]).toContain("bridge_ebridge");
    expect(status.nextAction["en-US"]).toContain("Complete missing required tasks");
    expect(status.reason["zh-CN"]).toContain("bridge_ebridge");
  });

  it("derives review-required user winners export status without automatic rejection", () => {
    const [, , riskParticipant] = campaignDetail.participants;
    const status = createUserWinnersExportStatusReadModel(campaignDetail, riskParticipant);

    expect(status.status).toBe("review_required");
    expect(status.row).toMatchObject({
      missingTasks: [],
      riskFlags: ["manual_review_queue"],
      rowStatus: "review_required",
      walletSource: "NIGHTELF",
    });
    expect(status.reason["en-US"]).toContain("not automatic reward rejection");
    expect(status.nextAction["en-US"]).toContain("manual review");
    expect(status.nextAction["zh-CN"]).toContain("人工审核");
  });

  it("keeps missing export rows pending and safe", () => {
    const [readyParticipant] = campaignDetail.participants;
    const unknownParticipant = {
      ...readyParticipant,
      id: "part-unknown-export-row",
      walletAddress: "ELF_UNKNOWN_EXPORT_ROW",
    };
    const status = createUserWinnersExportStatusReadModel(campaignDetail, unknownParticipant);

    expect(status).toMatchObject({
      exportBatchId: undefined,
      row: undefined,
      status: "pending",
      walletAddress: "ELF_UNKNOWN_EXPORT_ROW",
    });
    expect(status.reason["en-US"]).toContain("Campaign OS cannot show export evidence");
    expect(status.nextAction["en-US"]).toContain("Connect or verify");
    expect(status.fulfillmentOwner["zh-CN"]).toContain("活动项目方");
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
        canonicalEvidenceSource: "WALLET_SESSION",
        evidence: expect.objectContaining({
          evidenceHash: "demo-task-connect-wallet-3E9",
          evidenceId: "demo-task-connect-wallet-3E9",
          live: false,
          source: "WALLET_SESSION",
        }),
        provider: expect.objectContaining({
          providerId: "wallet_session",
          readiness: "local_only",
        }),
        manualReview: expect.objectContaining({
          queued: false,
          severity: "info",
        }),
        riskFlags: ["referral_velocity_review"],
        pointsAwarded: 40,
        completed: true,
        missingRequired: false,
        walletCompatibility: "ANY",
      }),
      expect.objectContaining({
        taskId: "task-bridge",
        status: "ready",
        evidenceSource: "aelfscan",
        canonicalEvidenceSource: "AELFSCAN",
        provider: expect.objectContaining({
          providerId: "aelfscan",
          readiness: "unavailable",
          fallbackReason: expect.objectContaining({
            "en-US": expect.stringContaining("provider path"),
            "zh-CN": expect.stringContaining("provider"),
          }),
        }),
        pointsAwarded: 0,
        completed: false,
        missingRequired: true,
        walletCompatibility: "ANY",
      }),
      expect.objectContaining({
        taskId: "task-swap",
        status: "pending",
        evidenceSource: "dapp_api",
        provider: expect.objectContaining({
          providerId: "dapp_api",
          readiness: "unavailable",
        }),
        pointsAwarded: 0,
        missingRequired: false,
      }),
      expect.objectContaining({
        taskId: "task-social",
        status: "failed",
        evidenceSource: "social_api",
        provider: expect.objectContaining({
          providerId: "social_api",
          readiness: "blocked",
        }),
        pointsAwarded: 0,
        missingRequired: false,
      }),
      expect.objectContaining({
        taskId: "task-agent-review",
        status: "manual_review",
        evidenceSource: "manual",
        canonicalEvidenceSource: "MANUAL_REVIEW",
        provider: expect.objectContaining({
          providerId: "manual_review",
          readiness: "review_required",
        }),
        manualReview: expect.objectContaining({
          queued: true,
          queueId: "review-task-agent-review-3E9",
          severity: "warning",
        }),
        pointsAwarded: 0,
        completed: false,
        missingRequired: false,
        walletCompatibility: "EOA_ONLY",
      }),
    ]));
  });

  it("derives localized local task verification actions from participant states", () => {
    const [completedParticipant, eoaParticipant] = campaignDetail.participants;
    const eoaActions = deriveParticipantTaskActions(campaignDetail.tasks, eoaParticipant);
    const completedActions = deriveParticipantTaskActions(campaignDetail.tasks, completedParticipant);
    const actionByTaskId = new Map(eoaActions.map((action) => [action.taskId, action]));
    const completedBridgeAction = completedActions.find((action) => action.taskId === "task-bridge");

    expect(actionByTaskId.get("task-bridge")).toMatchObject({
      kind: "verify",
      enabled: true,
      proofRequired: false,
      requiresWalletProvenance: true,
      status: "ready",
      providerReadiness: "unavailable",
      canonicalEvidenceSource: "AELFSCAN",
    });
    expect(actionByTaskId.get("task-swap")).toMatchObject({
      kind: "retry",
      enabled: true,
      proofRequired: false,
      status: "pending",
      providerReadiness: "unavailable",
      canonicalEvidenceSource: "DAPP_API",
    });
    expect(actionByTaskId.get("task-social")).toMatchObject({
      kind: "submit_proof",
      enabled: true,
      proofRequired: true,
      status: "failed",
      providerReadiness: "blocked",
      canonicalEvidenceSource: "SOCIAL_API",
    });
    expect(actionByTaskId.get("task-agent-review")).toMatchObject({
      kind: "view_review",
      enabled: true,
      proofRequired: false,
      status: "manual_review",
      providerReadiness: "review_required",
      canonicalEvidenceSource: "MANUAL_REVIEW",
    });
    expect(completedBridgeAction).toMatchObject({
      kind: "completed",
      enabled: false,
      proofRequired: false,
      status: "completed",
      providerReadiness: "local_only",
      canonicalEvidenceSource: "AELFSCAN",
    });

    for (const action of [...eoaActions, completedBridgeAction]) {
      expect(action?.label["zh-CN"]).toBeTruthy();
      expect(action?.label["zh-TW"]).toBeTruthy();
      expect(action?.nextAction["zh-CN"]).toBeTruthy();
      expect(action?.nextAction["zh-TW"]).toBeTruthy();
      expect(action?.boundary["zh-CN"]).toContain("本地");
      expect(action?.boundary["zh-TW"]).toBeTruthy();
    }
  });

  it("builds deterministic local task verification action results", () => {
    const [, eoaParticipant] = campaignDetail.participants;
    const states = deriveParticipantTaskStates(campaignDetail.tasks, eoaParticipant);
    const failedTask = campaignDetail.tasks.find((task) => task.id === "task-social");
    const failedState = states.find((state) => state.taskId === "task-social");
    const manualTask = campaignDetail.tasks.find((task) => task.id === "task-agent-review");
    const manualState = states.find((state) => state.taskId === "task-agent-review");

    expect(failedTask).toBeDefined();
    expect(failedState).toBeDefined();
    expect(manualTask).toBeDefined();
    expect(manualState).toBeDefined();

    const failedAction = deriveTaskVerificationAction(failedTask!, failedState!);
    const manualAction = deriveTaskVerificationAction(manualTask!, manualState!);

    expect(failedAction).toMatchObject({
      kind: "submit_proof",
      proofRequired: true,
      status: "failed",
    });
    expect(manualAction).toMatchObject({
      kind: "view_review",
      proofRequired: false,
      status: "manual_review",
    });
  });

  it("builds deterministic verification coverage without live provider claims", () => {
    const firstSummary = createVerificationCoverageSummary(
      campaignDetail.tasks,
      campaignDetail.participants,
    );
    const secondSummary = createVerificationCoverageSummary(
      campaignDetail.tasks,
      campaignDetail.participants,
    );
    const unknownParticipant = {
      ...campaignDetail.participants[0],
      accountType: "UNKNOWN" as const,
      walletAddress: "ADR...000",
      walletSource: "OTHER" as const,
    };
    const unknownStates = deriveParticipantTaskStates(campaignDetail.tasks, unknownParticipant);

    expect(firstSummary).toEqual(secondSummary);
    expect(firstSummary).toMatchObject({
      completedCount: 10,
      failedCount: 1,
      manualReviewCount: 3,
      pendingCount: 6,
      totalTasks: 5,
      totalTaskStates: 20,
    });
    expect(firstSummary.providerReadinessCounts).toMatchObject({
      blocked: 1,
      local_only: 10,
      ready: 0,
      review_required: 5,
      unavailable: 4,
    });
    expect(firstSummary.evidenceSources).toEqual(
      expect.arrayContaining([
        "AELFSCAN",
        "DAPP_API",
        "MANUAL_REVIEW",
        "SOCIAL_API",
        "WALLET_SESSION",
      ]),
    );
    expect(firstSummary.riskFlags).toEqual(
      expect.arrayContaining(["manual_review_queue", "referral_velocity_review"]),
    );
    expect(firstSummary.boundary["en-US"]).toContain("No live AeFinder");
    expect(firstSummary.boundary["zh-CN"]).toContain("不会执行实时 AeFinder");
    expect(unknownStates[0].riskFlags).toEqual([]);
    expect(unknownParticipant.accountType).toBe("UNKNOWN");
  });

  it("derives verification boundary under the seeded performance threshold", () => {
    const startedAt = performance.now();
    const summary = createVerificationCoverageSummary(
      campaignDetail.tasks,
      campaignDetail.participants,
    );
    const elapsedMs = performance.now() - startedAt;

    expect(summary.totalTasks).toBe(5);
    expect(summary.totalTaskStates).toBe(20);
    expect(elapsedMs).toBeLessThan(100);
  });

  it("creates a verification pipeline readiness gate without live provider claims", () => {
    const gate = createVerificationPipelineReadinessGate(campaignDetail);
    const repeatedGate = createVerificationPipelineReadinessGate(campaignDetail);
    const pathsById = Object.fromEntries(gate.paths.map((path) => [path.id, path]));

    expect(gate).toEqual(repeatedGate);
    expect(gate.paths.map((path) => path.id)).toEqual([
      "aefinder-on-chain",
      "aelfscan-on-chain",
      "dapp-api",
      "social-api",
      "wallet-session",
      "manual-review",
      "referral-qualification",
    ]);
    expect(gate.summary).toMatchObject({
      blockedPaths: 1,
      liveEvidenceReadyPaths: 0,
      manualReviewPaths: 1,
      missingLiveEvidencePaths: 5,
      seededReadyPaths: 7,
      totalPaths: 7,
    });
    expect(gate.taskOutcomeCoverage).toMatchObject({
      completedCount: 10,
      failedCount: 1,
      manualReviewCount: 3,
      pendingCount: 6,
    });
    expect(gate.eligibilityImpact).toMatchObject({
      missingRequiredTasks: ["bridge_ebridge"],
      referralQualificationStatus: "needs_verified_invitee",
      riskFlags: expect.arrayContaining(["manual_review_queue", "referral_velocity_review"]),
    });
    expect(pathsById["aefinder-on-chain"]).toMatchObject({
      affectedOutcomes: expect.arrayContaining(["points", "eligibility", "release"]),
      evidenceSource: "AEFINDER",
      liveEvidenceStatus: "missing",
      seededCoverageStatus: "ready",
    });
    expect(pathsById["social-api"]).toMatchObject({
      liveEvidenceStatus: "blocked",
      providerReadiness: "blocked",
      releaseImpact: "blocker",
    });
    expect(pathsById["manual-review"]).toMatchObject({
      liveEvidenceStatus: "not_applicable",
      providerReadiness: "review_required",
      releaseImpact: "needs_review",
    });
    expect(pathsById["referral-qualification"].eligibilityImpact["en-US"]).toContain(
      "qualified invitees",
    );
    expect(gate.boundary["en-US"]).toContain("No live AeFinder");
    expect(gate.boundary["zh-CN"]).toContain("不会执行实时 AeFinder");
    expect(gate.boundary["zh-TW"]).toContain("No live AeFinder");
    expect(JSON.stringify(gate).toLowerCase()).not.toContain("bearer ");
    expect(JSON.stringify(gate).toLowerCase()).not.toContain("private key");
    expect(JSON.stringify(gate)).not.toContain("downloadUrl");
  });

  it("creates a provider evidence registry without promoting seeded evidence to live readiness", () => {
    const registry = createProviderEvidenceRegistry(campaignDetail);
    const repeatedRegistry = createProviderEvidenceRegistry(campaignDetail);
    const entriesById = Object.fromEntries(registry.entries.map((entry) => [entry.id, entry]));

    expect(registry).toEqual(repeatedRegistry);
    expect(registry.campaignId).toBe(campaignDetail.id);
    expect(registry.entries.map((entry) => entry.category)).toEqual(
      expect.arrayContaining([
        "verification",
        "wallet",
        "analytics_export",
        "ai_content",
        "manual_review",
        "contract_export",
      ]),
    );
    expect(registry.summary).toMatchObject({
      totalEntries: registry.entries.length,
      seededReadyEntries: registry.entries.filter((entry) => entry.seededCoverageStatus === "ready").length,
      liveEvidenceReadyEntries: 0,
      missingLiveEvidenceEntries: registry.entries.filter((entry) => entry.liveEvidenceStatus === "missing").length,
      localOnlyEntries: registry.entries.filter((entry) => entry.adapterReadiness === "local_only").length,
      reviewRequiredEntries: registry.entries.filter((entry) => entry.adapterReadiness === "review_required").length,
      unavailableEntries: registry.entries.filter((entry) => entry.adapterReadiness === "unavailable").length,
      blockedEntries: registry.entries.filter((entry) => entry.adapterReadiness === "blocked").length,
      notApplicableEntries: registry.entries.filter((entry) => entry.liveEvidenceStatus === "not_applicable").length,
    });
    expect(registry.summary.launchBlockers).toBeGreaterThan(0);
    expect(registry.summary.missingLiveEvidenceEntries).toBeGreaterThan(0);
    expect(entriesById["verification-aefinder_on_chain"]).toMatchObject({
      adapterReadiness: "unavailable",
      liveEvidenceStatus: "missing",
      providerId: "aefinder_on_chain",
    });
    expect(entriesById["verification-social_api"]).toMatchObject({
      adapterReadiness: "blocked",
      fallback: expect.objectContaining({ blocksLaunch: true, mode: "blocked" }),
      liveEvidenceStatus: "blocked",
    });
    expect(entriesById["wallet-provider-qa"]).toMatchObject({
      adapterReadiness: "local_only",
      category: "wallet",
      featureGate: expect.objectContaining({ degradesGracefully: true }),
    });
    expect(entriesById["contract-export-root-readiness"]).toMatchObject({
      adapterReadiness: "blocked",
      category: "contract_export",
      ownerRole: "contract_reviewer",
    });
    expect(
      registry.entries
        .filter((entry) => entry.adapterReadiness !== "ready")
        .every((entry) => entry.nextAction["en-US"] && entry.fallback.label["en-US"]),
    ).toBe(true);
    expect(registry.adapterContracts).toHaveLength(registry.entries.length);
    expect(registry.adapterContracts.every((contract) => !contract.readyForProduction)).toBe(true);
    expect(registry.adapterContracts.every((contract) => contract.featureGate.degradesGracefully)).toBe(true);
    expect(registry.boundary["en-US"]).toContain("No live API");
    expect(registry.boundary["zh-CN"]).toContain("不会调用实时 API");
    expect(hasOwnKeyDeep(registry, "downloadUrl")).toBe(false);
    expect(hasOwnKeyDeep(registry, "storageKey")).toBe(false);
    expect(hasOwnKeyDeep(registry, "contractRoot")).toBe(false);
    expect(hasOwnKeyDeep(registry, "transactionId")).toBe(false);
    expect(JSON.stringify(registry).toLowerCase()).not.toContain("private key");
    expect(JSON.stringify(registry).toLowerCase()).not.toContain("bearer ");
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

  it("creates a deterministic participant workspace for tasks, points, and referral", () => {
    const [, eoaParticipant] = campaignDetail.participants;
    const firstWorkspace = createParticipantWorkspaceReadModel(campaignDetail, eoaParticipant);
    const secondWorkspace = createParticipantWorkspaceReadModel(campaignDetail, eoaParticipant);

    expect(firstWorkspace).toEqual(secondWorkspace);
    expect(firstWorkspace).toMatchObject({
      campaignId: "camp-awaken-sprint",
      participantId: "part-eoa-001",
      walletAddress: eoaParticipant.walletAddress,
      summary: {
        completedRequiredTasks: 1,
        totalRequiredTasks: 2,
        completedTasks: 1,
        totalTasks: 5,
        currentPoints: 40,
        pointsThreshold: 160,
        participantRank: 48,
        eligibleRankCutoff: 100,
        qualifiedInvitees: 2,
        referralPoints: 40,
        riskFlagCount: 1,
        reviewRequired: true,
      },
    });
    expect(firstWorkspace.summary.requiredProgressPercent).toBe(50);
    expect(firstWorkspace.summary.totalProgressPercent).toBe(20);
    expect(firstWorkspace.taskBuckets.completed.map((task) => task.taskId)).toEqual(["task-connect-wallet"]);
    expect(firstWorkspace.taskBuckets.pending.map((task) => task.taskId)).toContain("task-bridge");
    expect(firstWorkspace.taskBuckets.review.map((task) => task.taskId)).toEqual(["task-social", "task-agent-review"]);
    expect(firstWorkspace.taskBuckets.missingRequired.map((task) => task.taskId)).toEqual(["task-bridge"]);
    expect(firstWorkspace.taskBuckets.missingRequired[0]).toMatchObject({
      pointsAwarded: 0,
      pointsAvailable: 120,
      evidenceSource: "aelfscan",
      missingRequired: true,
    });
    expect(firstWorkspace.points).toMatchObject({
      currentPoints: 40,
      pointsThreshold: 160,
      participantRank: 48,
      eligibleRankCutoff: 100,
      progressPercent: 50,
      ledgerState: "seeded_preview",
    });
    expect(firstWorkspace.points.boundary["en-US"]).toContain("not settled by a live points ledger");
    expect(firstWorkspace.referral).toMatchObject({
      rawInvites: 9,
      qualifiedInvitees: 2,
      referralPoints: 40,
      riskFlags: ["referral_velocity_review"],
    });
    expect(firstWorkspace.referral.antiFarmRule["en-US"]).toContain("Raw signups do not count");
    expect(firstWorkspace.referral.boundary["en-US"]).toContain("no live Referral registry write");
    expect(firstWorkspace.nextActions.map((action) => action.id)).toEqual([
      "complete-missing-required-task",
      "review-task-status",
      "wait-for-risk-review",
    ]);
    expect(firstWorkspace.nextActions[0]).toMatchObject({
      priority: "primary",
      relatedTaskId: "task-bridge",
    });
    expect(firstWorkspace.boundary["en-US"]).toContain("not a live ledger");
    expect(firstWorkspace.boundary["en-US"]).toContain("no Referral backend");
    expect(firstWorkspace.boundary["en-US"]).toContain("reward distribution is executed");
    expect(firstWorkspace.boundary["en-US"]).not.toContain("private key");
    expect(firstWorkspace.rewardBoundary["en-US"]).toContain("Export winners does not distribute rewards");
  });

  it("derives deterministic ecosystem next actions for Pay, Forecast, and Portfolio", () => {
    const [, eoaParticipant] = campaignDetail.participants;
    const firstReadModel = createEcosystemNextActionReadModel(campaignDetail, eoaParticipant);
    const secondReadModel = createEcosystemNextActionReadModel(campaignDetail, eoaParticipant);

    expect(firstReadModel).toEqual(secondReadModel);
    expect(firstReadModel.recommendations.map((recommendation) => recommendation.product.id)).toEqual([
      "Pay",
      "Forecast",
      "Portfolio",
    ]);
    expect(firstReadModel.summary).toMatchObject({
      totalRecommendations: 3,
      lockedCount: 1,
      reviewCount: 1,
      topRecommendationId: "ecosystem-pay",
    });
    expect(firstReadModel.summary.readyCount + firstReadModel.summary.lockedCount + firstReadModel.summary.reviewCount).toBe(3);
    expect(firstReadModel.summary.loopProgressPercent).toBe(50);
    expect(firstReadModel.recommendations[0]).toMatchObject({
      id: "ecosystem-pay",
      status: "locked",
      priority: "primary",
      gatingReason: expect.objectContaining({
        "en-US": expect.stringContaining("Bridge via eBridge"),
        "zh-CN": expect.stringContaining("通过 eBridge 跨链"),
      }),
    });
    expect(firstReadModel.recommendations[1]).toMatchObject({
      id: "ecosystem-forecast",
      status: "review",
      priority: "secondary",
    });
    expect(firstReadModel.recommendations[2]).toMatchObject({
      id: "ecosystem-portfolio",
      status: "ready",
      priority: "tertiary",
    });
    expect(firstReadModel.recommendations.every((recommendation) => recommendation.relatedSignals.length > 0)).toBe(true);
  });

  it("keeps ecosystem next actions local, bilingual, and free of live service claims", () => {
    const [eligibleParticipant] = campaignDetail.participants;
    const readModel = createEcosystemNextActionReadModel(campaignDetail, eligibleParticipant);

    expect(readModel.summary).toMatchObject({
      totalRecommendations: 3,
      readyCount: 2,
      lockedCount: 0,
      reviewCount: 0,
      topRecommendationId: "ecosystem-portfolio",
      loopProgressPercent: 100,
    });
    expect(readModel.summary.boundary["en-US"]).toContain("No live Pay, Forecast, or Portfolio service");
    expect(readModel.summary.boundary["zh-CN"]).toContain("不会连接真实 Pay、Forecast 或 Portfolio 服务");
    expect(readModel.recommendations.map((recommendation) => recommendation.priority)).toEqual([
      "primary",
      "secondary",
      "tertiary",
    ]);
    expect(readModel.recommendations[0]).toMatchObject({
      id: "ecosystem-portfolio",
      product: expect.objectContaining({ id: "Portfolio" }),
      status: "completed",
    });

    for (const recommendation of readModel.recommendations) {
      expect(recommendation.title["en-US"]).toBeTruthy();
      expect(recommendation.title["zh-CN"]).toBeTruthy();
      expect(recommendation.reason["en-US"]).toBeTruthy();
      expect(recommendation.reason["zh-CN"]).toBeTruthy();
      expect(recommendation.ctaLabel["en-US"]).toBeTruthy();
      expect(recommendation.ctaLabel["zh-CN"]).toBeTruthy();
      expect(recommendation.boundary["en-US"]).toContain("No live");
      expect(recommendation.boundary["zh-CN"]).toContain("不会");
      expect(recommendation.boundary["en-US"]).not.toContain("private key");
      expect(recommendation.boundary["en-US"]).not.toContain("seed phrase");
    }

    expect(supportedLocales).toEqual(["en-US", "zh-CN", "zh-TW"]);
    expect(isSupportedLocale("zh-TW")).toBe(true);
    expect(isSupportedLocale("ja-JP")).toBe(false);
  });

  it("derives deterministic campaign discovery for User App, App Hub, Portfolio, and Forecast", () => {
    const [, eoaParticipant] = campaignDetail.participants;
    const firstReadModel = createCampaignDiscoveryReadModel(campaignDetail, eoaParticipant);
    const secondReadModel = createCampaignDiscoveryReadModel(campaignDetail, eoaParticipant);

    expect(firstReadModel).toEqual(secondReadModel);
    expect(firstReadModel.items.map((item) => item.id)).toEqual([
      "camp-awaken-sprint",
      "camp-forest-nft-path",
      "camp-tmrwdao-streak",
    ]);
    expect(firstReadModel.summary).toMatchObject({
      totalCampaigns: 3,
      liveCount: 1,
      scheduledCount: 1,
      endedCount: 1,
      appHubReadyCount: 3,
      portfolioReadyCount: 3,
      forecastReadyCount: 2,
      topCampaignId: "camp-awaken-sprint",
    });

    const awaken = firstReadModel.items[0];
    const forest = firstReadModel.items[1];
    const tmrwdao = firstReadModel.items[2];

    expect(awaken).toMatchObject({
      cta: expect.objectContaining({ kind: "continue_tasks" }),
      points: 290,
      status: "live",
      walletPolicy: "ANY",
    });
    expect(awaken.consumerSurfaces).toEqual(["user_app", "app_hub", "portfolio", "forecast"]);
    expect(awaken.coreTasks.map((task) => task.taskId)).toEqual([
      "task-connect-wallet",
      "task-bridge",
      "task-swap",
    ]);
    expect(forest).toMatchObject({
      cta: expect.objectContaining({ kind: "start" }),
      points: 260,
      status: "scheduled",
    });
    expect(tmrwdao).toMatchObject({
      cta: expect.objectContaining({ kind: "check_eligibility" }),
      points: 180,
      status: "ended",
    });
    expect(tmrwdao.consumerSurfaces).toEqual(["user_app", "app_hub", "forecast", "portfolio"]);
    expect(firstReadModel.details.find((detail) => detail.item.id === "camp-awaken-sprint")?.tasks).toHaveLength(
      campaignDetail.tasks.length,
    );
    expect(firstReadModel.boundary["en-US"]).toContain("Campaign Discovery API readiness");
    expect(firstReadModel.boundary["en-US"]).toContain("No live marketplace API");
    expect(firstReadModel.boundary["zh-CN"]).toContain("不会连接实时 marketplace API");
    expect(firstReadModel.nextAction["en-US"]).toContain("User App");
    expect(JSON.stringify(firstReadModel).toLowerCase()).not.toContain("private key");
    expect(JSON.stringify(firstReadModel).toLowerCase()).not.toContain("seed phrase");
    expect(JSON.stringify(firstReadModel).toLowerCase()).not.toContain("bearer ");
  });

  it("uses eligibility CTA for fully eligible campaign discovery participants", () => {
    const [eligibleParticipant] = campaignDetail.participants;
    const readModel = createCampaignDiscoveryReadModel(campaignDetail, eligibleParticipant);

    expect(readModel.items[0]).toMatchObject({
      id: "camp-awaken-sprint",
      cta: expect.objectContaining({
        kind: "check_eligibility",
        label: expect.objectContaining({ "en-US": "Check eligibility" }),
      }),
    });
  });

  it("derives deterministic Portfolio campaign history across current and seeded campaigns", () => {
    const [, eoaParticipant] = campaignDetail.participants;
    const firstReadModel = createPortfolioCampaignHistoryReadModel(campaignDetail, eoaParticipant);
    const secondReadModel = createPortfolioCampaignHistoryReadModel(campaignDetail, eoaParticipant);

    expect(firstReadModel).toEqual(secondReadModel);
    expect(firstReadModel.rows.map((row) => row.campaignId)).toEqual([
      "camp-awaken-sprint",
      "camp-forest-nft-path",
      "camp-tmrwdao-streak",
    ]);
    expect(firstReadModel.rows.map((row) => row.portfolioState)).toEqual([
      "blocked",
      "scheduled",
      "archived",
    ]);
    expect(firstReadModel.summary).toMatchObject({
      totalCampaigns: 3,
      activeCount: 2,
      historicalCount: 1,
      reviewRequiredCount: 0,
      blockerCount: 1,
      exportReadyCount: 0,
      totalPoints: 480,
      topCampaignId: "camp-awaken-sprint",
    });
    expect(firstReadModel.rows[0]).toMatchObject({
      campaignId: "camp-awaken-sprint",
      eligibilityStatus: "not_eligible",
      localePreference: "zh-CN",
      missingTaskIds: ["task-bridge"],
      points: 40,
      rank: 48,
      walletAddress: "3E9...7cD",
      walletSource: "PORTKEY_EOA_EXTENSION",
      walletType: "EOA",
      winnerExportStatus: "blocked",
    });
    expect(firstReadModel.rows[1]).toMatchObject({
      campaignId: "camp-forest-nft-path",
      campaignStatus: "scheduled",
      eligibilityStatus: "pending",
      portfolioState: "scheduled",
      winnerExportStatus: "pending",
    });
    expect(firstReadModel.rows[2]).toMatchObject({
      campaignId: "camp-tmrwdao-streak",
      campaignStatus: "ended",
      eligibilityStatus: "ended",
      portfolioState: "archived",
      winnerExportStatus: "pending",
    });
  });

  it("derives deterministic Campaign Marketplace readiness for App Hub, Portfolio, and Forecast", () => {
    const [, eoaParticipant] = campaignDetail.participants;
    const firstReadModel = createCampaignMarketplaceReadiness(campaignDetail, eoaParticipant);
    const secondReadModel = createCampaignMarketplaceReadiness(campaignDetail, eoaParticipant);

    expect(firstReadModel).toEqual(secondReadModel);
    expect(firstReadModel.rows.map((row) => row.campaignId)).toEqual([
      "camp-awaken-sprint",
      "camp-forest-nft-path",
      "camp-tmrwdao-streak",
    ]);
    expect(firstReadModel.summary).toMatchObject({
      totalCampaigns: 3,
      appHubReadyCount: 3,
      portfolioReadyCount: 3,
      forecastReadyCount: 2,
      readyCount: 0,
      reviewCount: 1,
      blockedCount: 1,
      localPreviewCount: 1,
      topCampaignId: "camp-awaken-sprint",
      topReadinessLane: "blocked",
    });
    expect(
      firstReadModel.summary.readyCount +
        firstReadModel.summary.reviewCount +
        firstReadModel.summary.blockedCount +
        firstReadModel.summary.localPreviewCount,
    ).toBe(firstReadModel.summary.totalCampaigns);

    expect(firstReadModel.rows[0]).toMatchObject({
      campaignId: "camp-awaken-sprint",
      ctaKind: "continue_tasks",
      readinessLane: "blocked",
      appHubState: "review_required",
      portfolioState: "review_required",
      forecastState: "review_required",
    });
    expect(firstReadModel.rows[1]).toMatchObject({
      campaignId: "camp-forest-nft-path",
      ctaKind: "start",
      readinessLane: "local_preview",
      appHubState: "ready",
      portfolioState: "ready",
      forecastState: "not_configured",
    });
    expect(firstReadModel.rows[2]).toMatchObject({
      campaignId: "camp-tmrwdao-streak",
      ctaKind: "check_eligibility",
      readinessLane: "review_required",
      appHubState: "review_required",
      portfolioState: "review_required",
      forecastState: "review_required",
    });
    expect(firstReadModel.ownerNextAction["en-US"]).toContain("blocking campaign gates");
    expect(firstReadModel.ownerNextAction["zh-CN"]).toContain("阻断活动门槛");
  });

  it("keeps Campaign Marketplace readiness local-only, localized, and free of live-service secrets", () => {
    const [, eoaParticipant] = campaignDetail.participants;
    const readModel = createCampaignMarketplaceReadiness(campaignDetail, eoaParticipant);
    const serialized = JSON.stringify(readModel).toLowerCase();
    const boundaryText = [
      readModel.boundary["en-US"],
      readModel.summary.boundary["en-US"],
      ...readModel.rows.flatMap((row) => [
        row.boundary["en-US"],
        row.readinessReason["en-US"],
        row.nextAction["en-US"],
      ]),
    ].join(" ");

    expect(boundaryText).toContain("No live marketplace API");
    expect(boundaryText).toContain("App Hub backend");
    expect(boundaryText).toContain("Portfolio sync");
    expect(boundaryText).toContain("Forecast prediction");
    expect(boundaryText).toContain("wallet SDK/provider");
    expect(boundaryText).toContain("contract view/send/write");
    expect(boundaryText).toContain("export file");
    expect(boundaryText).toContain("reward custody");
    expect(boundaryText).toContain("reward distribution");

    for (const row of readModel.rows) {
      expect(row.readinessLabel["en-US"]).toBeTruthy();
      expect(row.readinessLabel["zh-CN"]).toBeTruthy();
      expect(row.readinessLabel["zh-TW"]).toBeTruthy();
      expect(row.readinessReason["en-US"]).toBeTruthy();
      expect(row.readinessReason["zh-CN"]).toBeTruthy();
      expect(row.readinessReason["zh-TW"]).toBeTruthy();
      expect(row.nextAction["en-US"]).toBeTruthy();
      expect(row.nextAction["zh-CN"]).toBeTruthy();
      expect(row.nextAction["zh-TW"]).toBeTruthy();
      expect(row.boundary["en-US"]).toContain("No live");
      expect(row.boundary["zh-CN"]).toContain("不会");
      expect(row.boundary["zh-TW"]).toContain("未連接");
    }

    for (const unsafe of ["private key", "seed phrase", "bearer token", "signed payload"]) {
      expect(serialized).not.toContain(unsafe);
    }
    for (const unsafeKey of ["privateKey", "seedPhrase", "bearerToken", "signedPayload"]) {
      expect(hasOwnKeyDeep(readModel, unsafeKey)).toBe(false);
    }
  });

  it("keeps Campaign Marketplace pre-launch statuses in local preview lanes", () => {
    const [eligibleParticipant] = campaignDetail.participants;
    const reviewCampaign = {
      ...campaignDetail,
      status: "human_review",
    } satisfies typeof campaignDetail;
    const readModel = createCampaignMarketplaceReadiness(reviewCampaign, eligibleParticipant);
    const currentRow = readModel.rows.find((row) => row.campaignId === campaignDetail.id);

    expect(currentRow).toMatchObject({
      ctaKind: "start",
      readinessLane: "local_preview",
    });
    expect(currentRow?.readinessReason["en-US"]).toContain("must not start live participation");
    expect(currentRow?.nextAction["en-US"]).toContain("local preview");
  });

  it("derives deterministic Mobile and Telegram Mini App Hub readiness lanes", () => {
    const [, eoaParticipant] = campaignDetail.participants;
    const firstReadModel = createMobileTelegramMiniAppHubReadiness(campaignDetail, eoaParticipant);
    const secondReadModel = createMobileTelegramMiniAppHubReadiness(campaignDetail, eoaParticipant);
    const lanesById = Object.fromEntries(firstReadModel.lanes.map((lane) => [lane.id, lane]));

    expect(firstReadModel).toEqual(secondReadModel);
    expect(firstReadModel.lanes.map((lane) => lane.id)).toEqual([
      "campaign-feed",
      "assets-overview",
      "forecast-feed",
      "pay-shortcut",
      "invite-referral",
      "telegram-shell",
    ]);
    expect(firstReadModel.summary).toMatchObject({
      totalLanes: 6,
      readyCount: 0,
      reviewCount: 1,
      blockedCount: 4,
      notConnectedCount: 1,
      topLaneId: "campaign-feed",
      topLaneState: "blocked",
    });
    expect(
      firstReadModel.summary.readyCount +
        firstReadModel.summary.reviewCount +
        firstReadModel.summary.blockedCount +
        firstReadModel.summary.notConnectedCount,
    ).toBe(firstReadModel.summary.totalLanes);
    expect(lanesById["campaign-feed"]).toMatchObject({
      readiness: "blocked",
      ownerRole: "growth_lead",
      serviceState: "seeded_preview",
    });
    expect(lanesById["assets-overview"]).toMatchObject({
      readiness: "blocked",
      ownerRole: "wallet_ops",
    });
    expect(lanesById["forecast-feed"]).toMatchObject({
      readiness: "blocked",
      ownerRole: "product_owner",
      serviceState: "not_connected",
    });
    expect(lanesById["pay-shortcut"]).toMatchObject({
      readiness: "blocked",
      ownerRole: "product_owner",
      serviceState: "not_connected",
    });
    expect(lanesById["invite-referral"]).toMatchObject({
      readiness: "review_required",
      ownerRole: "risk_reviewer",
    });
    expect(lanesById["telegram-shell"]).toMatchObject({
      readiness: "not_connected",
      ownerRole: "internal_operator",
      serviceState: "not_connected",
    });
    expect(firstReadModel.aiGuide).toMatchObject({
      primaryLaneId: "campaign-feed",
      urgency: "blocked",
    });
    expect(firstReadModel.aiGuide.body["en-US"]).toContain("Bridge via eBridge");
    expect(firstReadModel.aiGuide.body["en-US"]).toContain("Pay");
    expect(firstReadModel.aiGuide.body["en-US"]).toContain("Forecast");
    expect(firstReadModel.ownerNextAction["en-US"]).toContain("blocking campaign gates");
  });

  it("keeps Mobile and Telegram Mini App Hub readiness local-only, localized, and free of live claims", () => {
    const [eligibleParticipant] = campaignDetail.participants;
    const readModel = createMobileTelegramMiniAppHubReadiness(campaignDetail, eligibleParticipant);
    const serialized = JSON.stringify(readModel).toLowerCase();
    const boundaryText = [
      readModel.boundary["en-US"],
      readModel.summary.boundary["en-US"],
      ...readModel.lanes.flatMap((lane) => [
        lane.boundary["en-US"],
        lane.evidenceBasis["en-US"],
        lane.relatedSignal["en-US"],
        lane.nextAction["en-US"],
      ]),
    ].join(" ");

    expect(readModel.summary).toMatchObject({
      totalLanes: 6,
      readyCount: 5,
      reviewCount: 0,
      blockedCount: 0,
      notConnectedCount: 1,
      topLaneId: "campaign-feed",
      topLaneState: "ready",
    });
    expect(readModel.aiGuide).toMatchObject({
      primaryLaneId: "campaign-feed",
      urgency: "ready",
    });
    expect(readModel.ownerNextAction["en-US"]).toContain("Telegram");
    expect(boundaryText).toContain("No live Telegram SDK");
    expect(boundaryText).toContain("Bot API");
    expect(boundaryText).toContain("OAuth");
    expect(boundaryText).toContain("Pay service");
    expect(boundaryText).toContain("Forecast service");
    expect(boundaryText).toContain("Portfolio sync");
    expect(boundaryText).toContain("wallet SDK/provider");
    expect(boundaryText).toContain("payment transaction");
    expect(boundaryText).toContain("prediction transaction");
    expect(boundaryText).toContain("asset lookup");
    expect(boundaryText).toContain("contract view/send/write");

    for (const lane of readModel.lanes) {
      expect(lane.label["en-US"]).toBeTruthy();
      expect(lane.label["zh-CN"]).toBeTruthy();
      expect(lane.label["zh-TW"]).toBeTruthy();
      expect(lane.evidenceBasis["en-US"]).toBeTruthy();
      expect(lane.evidenceBasis["zh-CN"]).toBeTruthy();
      expect(lane.evidenceBasis["zh-TW"]).toBeTruthy();
      expect(lane.relatedSignal["en-US"]).toBeTruthy();
      expect(lane.relatedSignal["zh-CN"]).toBeTruthy();
      expect(lane.relatedSignal["zh-TW"]).toBeTruthy();
      expect(lane.ctaLabel["en-US"]).toBeTruthy();
      expect(lane.ctaLabel["zh-CN"]).toBeTruthy();
      expect(lane.ctaLabel["zh-TW"]).toBeTruthy();
      expect(lane.nextAction["en-US"]).toBeTruthy();
      expect(lane.nextAction["zh-CN"]).toBeTruthy();
      expect(lane.nextAction["zh-TW"]).toBeTruthy();
    }
    for (const locale of supportedLocales) {
      expect(readModel.aiGuide.headline[locale]).toBeTruthy();
      expect(readModel.aiGuide.body[locale]).toBeTruthy();
      expect(readModel.aiGuide.evidenceBasis[locale]).toBeTruthy();
      expect(readModel.summary.aiGuideHeadline[locale]).toBe(readModel.aiGuide.headline[locale]);
      expect(readModel.summary.ownerNextAction[locale]).toBe(readModel.ownerNextAction[locale]);
    }

    for (const unsafe of [
      "private key",
      "seed phrase",
      "bearer token",
      "telegram token",
      "oauth token",
      "signed payload",
      "secret",
      "download url",
      "file url",
      "contract root",
    ]) {
      expect(serialized).not.toContain(unsafe);
    }
    for (const unsafeKey of [
      "privateKey",
      "seedPhrase",
      "bearerToken",
      "telegramToken",
      "oauthToken",
      "signedPayload",
      "downloadUrl",
      "fileUrl",
      "contractRoot",
      "transactionId",
    ]) {
      expect(hasOwnKeyDeep(readModel, unsafeKey)).toBe(false);
    }
  });

  it("keeps Forecast and Portfolio review-required when risk context exists without missing required tasks", () => {
    const [, , riskParticipant] = campaignDetail.participants;
    const readModel = createMobileTelegramMiniAppHubReadiness(campaignDetail, riskParticipant);
    const lanesById = Object.fromEntries(readModel.lanes.map((lane) => [lane.id, lane]));

    expect(lanesById["pay-shortcut"]).toMatchObject({
      readiness: "ready",
    });
    expect(lanesById["forecast-feed"]).toMatchObject({
      readiness: "review_required",
    });
    expect(lanesById["assets-overview"]).toMatchObject({
      readiness: "review_required",
    });
    expect(lanesById["invite-referral"]).toMatchObject({
      readiness: "review_required",
    });
    expect(readModel.aiGuide).toMatchObject({
      primaryLaneId: "campaign-feed",
      urgency: "review_required",
    });
    expect(readModel.aiGuide.body["en-US"]).toContain("review");
    expect(readModel.ownerNextAction["en-US"]).toContain("Review");
  });

  it("shows Portfolio history review-required state for risk/export review context", () => {
    const [, , riskParticipant] = campaignDetail.participants;
    const readModel = createPortfolioCampaignHistoryReadModel(campaignDetail, riskParticipant);
    const currentRow = readModel.rows[0];

    expect(currentRow).toMatchObject({
      campaignId: "camp-awaken-sprint",
      eligibilityStatus: "risk_flagged",
      portfolioState: "review_required",
      riskFlags: ["manual_review_queue"],
      winnerExportStatus: "review_required",
    });
    expect(readModel.summary).toMatchObject({
      reviewRequiredCount: 1,
      blockerCount: 0,
      exportReadyCount: 0,
    });
    expect(currentRow.nextAction["en-US"]).toContain("manual review");
    expect(currentRow.nextAction["zh-CN"]).toContain("人工审核");
    expect(currentRow.boundary["en-US"]).toContain("No live Portfolio service");
  });

  it("keeps Portfolio campaign history local-only and free of sensitive serialized fields", () => {
    const [eligibleParticipant] = campaignDetail.participants;
    const readModel = createPortfolioCampaignHistoryReadModel(campaignDetail, eligibleParticipant);
    const serialized = JSON.stringify(readModel).toLowerCase();
    const boundaryText = [
      readModel.boundary["en-US"],
      readModel.summary.boundary["en-US"],
      ...readModel.rows.flatMap((row) => [row.boundary["en-US"], row.nextAction["en-US"]]),
    ].join(" ");

    expect(readModel.summary).toMatchObject({
      exportReadyCount: 1,
      totalPoints: 710,
      topCampaignId: "camp-awaken-sprint",
    });
    expect(readModel.rows[0]).toMatchObject({
      eligibilityStatus: "eligible",
      portfolioState: "ready",
      winnerExportStatus: "ready",
    });
    expect(boundaryText).toContain("No live Portfolio service");
    expect(boundaryText).toContain("no Portfolio sync");
    expect(boundaryText).toContain("no wallet SDK");
    expect(boundaryText).toContain("no contract view");
    expect(boundaryText).toContain("no contract send");
    expect(boundaryText).toContain("no export file");
    expect(boundaryText).toContain("no reward custody");
    expect(boundaryText).toContain("no reward distribution");

    for (const unsafe of ["private key", "seed phrase", "bearer token", "token", "secret", "signed payload"]) {
      expect(serialized).not.toContain(unsafe);
    }
    for (const unsafeKey of ["privateKey", "seedPhrase", "bearerToken", "token", "secret", "signedPayload"]) {
      expect(hasOwnKeyDeep(readModel, unsafeKey)).toBe(false);
    }
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

  it("derives export confirmation readiness without live export outputs", () => {
    const gate = createExportConfirmationReadinessGate(campaignDetail);

    expect(gate.campaignId).toBe(campaignDetail.id);
    expect(gate.previewModes.map((mode) => mode.mode)).toEqual(["csv", "json"]);
    expect(gate.previewModes.every((mode) => !mode.generatesFile && !mode.downloadAvailable)).toBe(true);
    expect(gate.fieldCoverage.missingFields).toEqual([]);
    expect(gate.fieldCoverage.requiredFields).toEqual(
      expect.arrayContaining([
        "wallet_address",
        "account_type",
        "wallet_source",
        "task_records",
        "total_points",
        "referrer_address",
        "risk_flags",
        "locale_preference",
        "export_batch_id",
      ]),
    );
    expect(gate.rowStatusCoverage.map((reason) => reason.reasonCode)).toEqual([
      "eligible_verified",
      "risk_review_required",
      "missing_required_tasks",
      "wallet_metadata_unverified",
      "missing_export_fields",
    ]);
    expect(gate.rowStatusCoverage.find((reason) => reason.reasonCode === "eligible_verified")).toMatchObject({
      affectedRows: 1,
      rowStatus: "ready",
    });
    expect(gate.acknowledgements.map((item) => item.id)).toEqual([
      "verified-records-only",
      "project-owned-reward-distribution",
      "no-reward-custody",
      "no-reward-distribution",
      "no-real-export-file",
    ]);
    expect(gate.acknowledgements.every((item) => item.required && item.acknowledged)).toBe(true);
    expect(gate.contractRootReadiness.map((item) => [item.mode, item.readiness, item.safeDefault])).toEqual([
      ["none", "ready", true],
      ["eligibility_root", "review_required", false],
      ["winners_root", "review_required", false],
      ["contract_claim", "blocked", false],
    ]);
    expect(gate.boundary["en-US"]).toContain("No real CSV or JSON file");
    expect(gate.boundary["zh-CN"]).toContain("不会生成真实 CSV 或 JSON 文件");
    expect(gate.boundary["zh-TW"]).toContain("No real CSV or JSON file");
    expect(hasOwnKeyDeep(gate, "downloadUrl")).toBe(false);
    expect(hasOwnKeyDeep(gate, "storageKey")).toBe(false);
    expect(hasOwnKeyDeep(gate, "contractRoot")).toBe(false);
    expect(hasOwnKeyDeep(gate, "transactionId")).toBe(false);
  });

  it("creates wallet-aware eligibility checker results for seeded participants", () => {
    const [eligibleParticipant, ineligibleParticipant, riskParticipant] = campaignDetail.participants;
    const eligibleCheck = createEligibilityCheckerReadModel(campaignDetail, eligibleParticipant.walletAddress);
    const ineligibleCheck = createEligibilityCheckerReadModel(campaignDetail, ineligibleParticipant.walletAddress);
    const riskCheck = createEligibilityCheckerReadModel(campaignDetail, riskParticipant.walletAddress);

    expect(eligibleCheck.entries).toHaveLength(campaignDetail.participants.length);
    expect(eligibleCheck.result).toMatchObject({
      accountType: "AA",
      completedRequiredTasks: 2,
      knownParticipant: true,
      missingTasks: [],
      progressPercent: 100,
      score: 270,
      status: "eligible",
      walletAddress: "2F4...9aB",
      walletSource: "PORTKEY_AA",
      walletTypeVerified: true,
    });
    expect(eligibleCheck.result.boundary["en-US"]).toContain("No live wallet SDK");
    expect(eligibleCheck.summary.title["zh-CN"]).toBe("资格检查器");

    expect(ineligibleCheck.result).toMatchObject({
      accountType: "EOA",
      completedRequiredTasks: 1,
      knownParticipant: true,
      progressPercent: 50,
      riskFlags: ["referral_velocity_review"],
      score: 40,
      status: "not_eligible",
      walletSource: "PORTKEY_EOA_EXTENSION",
      walletTypeVerified: true,
    });
    expect(ineligibleCheck.result.missingTasks).toEqual([
      expect.objectContaining({
        evidenceSource: "aelfscan",
        points: 120,
        status: "ready",
        taskId: "task-bridge",
        templateCode: "bridge_ebridge",
        verificationType: "ON_CHAIN",
        walletCompatibility: "ANY",
      }),
    ]);
    expect(ineligibleCheck.result.missingTasks[0].nextAction["en-US"]).toContain(
      "Complete Bridge via eBridge",
    );

    expect(riskCheck.result).toMatchObject({
      knownParticipant: true,
      missingTasks: [],
      riskFlags: ["manual_review_queue"],
      status: "risk_flagged",
    });
    expect(riskCheck.result.reason["en-US"]).toContain("manual risk review");
    expect(riskCheck.result.boundary["en-US"]).toContain("reward distribution");
    expect(JSON.stringify(riskCheck.result).toLowerCase()).not.toContain("aelf rejects");
  });

  it("keeps address-only eligibility checks safe and explicit", () => {
    const readModel = createEligibilityCheckerReadModel(campaignDetail, "ELF_UNKNOWN_ADDRESS");

    expect(readModel.selectedAddress).toBe("ELF_UNKNOWN_ADDRESS");
    expect(readModel.result).toMatchObject({
      accountType: "UNKNOWN",
      knownParticipant: false,
      missingTasks: [],
      progressPercent: 0,
      score: 0,
      status: "pending",
      walletAddress: "ELF_UNKNOWN_ADDRESS",
      walletSource: "OTHER",
      walletTypeVerified: false,
    });
    expect(readModel.result.reason["en-US"]).toContain("cannot infer AA or EOA");
    expect(readModel.result.nextAction["en-US"]).toContain("Connect or verify");
    expect(readModel.result.reason["zh-TW"]).toContain("cannot infer AA or EOA");
    expect(readModel.result.nextAction["zh-TW"]).toContain("Connect or verify");
  });

  it("derives deterministic leaderboard modes without rewarding raw referral farming", () => {
    expect(leaderboardModes.map((mode) => mode.id)).toEqual([
      "total_points",
      "on_chain",
      "referral",
      "low_risk_verified",
    ]);

    const totalPoints = createLeaderboardReadModel(campaignDetail, "total_points");
    const onChain = createLeaderboardReadModel(campaignDetail, "on_chain");
    const referral = createLeaderboardReadModel(campaignDetail, "referral");
    const lowRisk = createLeaderboardReadModel(campaignDetail, "low_risk_verified");

    expect(totalPoints.rows.map((row) => row.walletAddress)).toEqual([
      "2F4...9aB",
      "5N1...4fA",
      "7P8...2bE",
      "3E9...7cD",
    ]);
    expect(onChain.rows.map((row) => [row.walletAddress, row.onChainActionCount])).toEqual([
      ["2F4...9aB", 3],
      ["5N1...4fA", 3],
      ["7P8...2bE", 2],
      ["3E9...7cD", 1],
    ]);
    expect(referral.rows.map((row) => [row.walletAddress, row.referralPoints, row.qualifiedInvitees])).toEqual([
      ["2F4...9aB", 80, 4],
      ["5N1...4fA", 60, 3],
      ["3E9...7cD", 40, 2],
      ["7P8...2bE", 20, 1],
    ]);
    expect(referral.qualityPolicy["en-US"]).toContain("Only qualified invitees");
    expect(lowRisk.rows[0]).toMatchObject({
      eligible: true,
      riskFlags: [],
      riskLevel: "low",
      walletAddress: "2F4...9aB",
    });
    expect(lowRisk.qualityPolicy["en-US"]).toContain("Risk flags are review inputs");
    expect(totalPoints.boundary["en-US"]).toContain("does not distribute rewards");
    expect(referral.qualityPolicy["zh-TW"]).toContain("Only qualified invitees");
    expect(lowRisk.summary["zh-TW"]).toContain("Low-risk verified ranks");
    expect(totalPoints.boundary["zh-TW"]).toContain("does not distribute rewards");
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

  it("treats archived campaigns as closed for participant eligibility", () => {
    const [eligibleParticipant] = campaignDetail.participants;
    const archivedCampaign = {
      ...campaignDetail,
      status: "archived",
    } satisfies typeof campaignDetail;

    expect(createParticipationReadModel(archivedCampaign, eligibleParticipant).eligibility).toMatchObject({
      status: "ended",
      walletStatus: expect.any(Object),
    });
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
    expect(adminOps.localeSplit.map((row) => row.label)).toEqual(["en-US", "zh-CN", "zh-TW"]);
    expect(adminOps.templateGovernance.summary.totalTemplates).toBe(taskTemplateLibrary.length);
    expect(adminOps.templateGovernance.rows.map((row) => row.category)).toEqual(
      expect.arrayContaining([
        "wallet",
        "bridge",
        "swap",
        "liquidity",
        "nft",
        "schrodinger",
        "dao",
        "daipp",
        "pay",
        "forecast",
        "social",
        "invite",
      ]),
    );
    expect(adminOps.templateGovernance.summary.anyWalletCount).toBeGreaterThan(0);
    expect(adminOps.templateGovernance.summary.eoaOnlyCount).toBeGreaterThan(0);
    expect(adminOps.templateGovernance.summary.localizationReviewCount).toBeGreaterThan(0);
    expect(adminOps.templateGovernance.boundary["en-US"]).toContain("No live template registry");
    expect(adminOps.riskSignals.map((signal) => signal.id)).toEqual([
      "funding-source",
      "referral-tree",
      "referral-velocity",
      "device-session",
      "task-timing",
      "bot-sybil-review",
      "manual-review",
    ]);
    expect(adminOps.aiReports).toHaveLength(6);
    expect(adminOps.aiOptimization.reports.map((report) => report.category)).toEqual(
      expect.arrayContaining([
        "analytics_summary",
        "user_quality",
        "bot_pattern",
        "winner_report",
        "boss_report",
        "optimization",
      ]),
    );
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

  it("derives template governance review signals from risk and locale readiness", () => {
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const socialTemplate = adminOps.templateGovernance.rows.find(
      (row) => row.templateId === "tpl-social-share",
    );
    const inviteTemplate = adminOps.templateGovernance.rows.find(
      (row) => row.templateId === "tpl-invite-friend",
    );
    const payTemplate = adminOps.templateGovernance.rows.find((row) => row.templateId === "tpl-pay-complete");
    const liquidityTemplate = adminOps.templateGovernance.rows.find(
      (row) => row.templateId === "tpl-liquidity-awaken",
    );
    const forecastTemplate = adminOps.templateGovernance.rows.find(
      (row) => row.templateId === "tpl-forecast-participate",
    );
    const daoTemplate = adminOps.templateGovernance.rows.find((row) => row.templateId === "tpl-dao-vote");

    expect(socialTemplate).toMatchObject({
      status: "warning",
      reviewSignals: expect.arrayContaining(["risk_review", "localization_review", "verification_strength"]),
    });
    expect(socialTemplate?.nextAction["en-US"]).toContain("risk review");
    expect(inviteTemplate?.reviewSignals).toEqual(
      expect.arrayContaining(["risk_review", "localization_review"]),
    );
    expect(inviteTemplate?.reviewSignals).not.toContain("verification_strength");
    expect(daoTemplate).toMatchObject({
      walletCompatibility: "EOA_ONLY",
      reviewSignals: expect.arrayContaining(["wallet_coverage", "localization_review"]),
    });
    expect(payTemplate).toMatchObject({
      category: "pay",
      verificationType: "DAPP_API",
      walletCompatibility: "ANY",
      reviewSignals: expect.arrayContaining(["localization_review"]),
    });
    expect(liquidityTemplate).toMatchObject({
      category: "liquidity",
      verificationType: "ON_CHAIN",
      walletCompatibility: "ANY",
      reviewSignals: expect.arrayContaining(["localization_review"]),
    });
    expect(forecastTemplate).toMatchObject({
      category: "forecast",
      verificationType: "DAPP_API",
      walletCompatibility: "ANY",
    });
    expect(adminOps.templateGovernance.boundary["zh-TW"]).toContain("模板管理治理");
    expect(daoTemplate?.localeReadiness["zh-TW"]).toBe("fallback");
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

  it("derives risk intelligence dimensions for review-only anti-sybil analysis", () => {
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const surface = adminOps.riskIntelligence;
    const repeated = createRiskIntelligenceReviewSurface(campaignDetail);
    const dimensionsByCategory = Object.fromEntries(
      surface.dimensions.map((dimension) => [dimension.category, dimension]),
    );
    const publicSafetyText = JSON.stringify(surface).toLowerCase();

    expect(surface).toEqual(repeated);
    expect(surface.campaignId).toBe(campaignDetail.id);
    expect(surface.dimensions.map((dimension) => dimension.category).sort()).toEqual([
      "device_session",
      "funding_cluster",
      "invite_tree",
      "manual_review_queue",
      "meaningful_action",
      "task_pattern",
      "wallet_age",
    ]);
    expect(surface.summary).toMatchObject({
      totalDimensions: 7,
      reviewRequiredCount: expect.any(Number),
      blockedCount: expect.any(Number),
      highSeverityCount: expect.any(Number),
      manualReviewQueueSize: expect.any(Number),
      meaningfulActionCoverage: expect.stringContaining("meaningful actions"),
      exportHoldCount: expect.any(Number),
    });
    expect(surface.summary.reviewRequiredCount).toBeGreaterThan(0);
    expect(surface.summary.blockedCount).toBeGreaterThan(0);
    expect(surface.summary.exportHoldCount).toBeGreaterThan(0);
    expect(surface.meaningfulAction).toMatchObject({
      requiredActionCount: expect.any(Number),
      completedActionCount: expect.any(Number),
      coverageLabel: expect.objectContaining({
        "en-US": expect.stringContaining("meaningful actions covered"),
      }),
      qualityPolicy: expect.objectContaining({
        "en-US": expect.stringContaining("on-chain"),
      }),
    });
    expect(dimensionsByCategory.wallet_age).toMatchObject({
      id: "wallet-age",
      ownerRole: "risk_reviewer",
      reviewState: "review_required",
    });
    expect(dimensionsByCategory.funding_cluster?.sourceSignal["en-US"]).toBe("Funding source review");
    expect(dimensionsByCategory.invite_tree).toMatchObject({
      reviewState: "blocked",
      ownerRole: "project_owner",
    });
    expect(dimensionsByCategory.manual_review_queue?.exportImpact["en-US"]).toContain("Hold export");
    expect(surface.boundary["en-US"]).toContain("does not automatically ban");
    expect(surface.boundary["zh-CN"]).toContain("不会自动封禁");

    expect(publicSafetyText).not.toContain("rawip");
    expect(publicSafetyText).not.toContain("devicefingerprint");
    expect(publicSafetyText).not.toContain("sessionfingerprint");
    expect(publicSafetyText).not.toContain("privatethreshold");
    expect(publicSafetyText).not.toContain("apikey");
    expect(publicSafetyText).not.toContain("access_token");
    expect(publicSafetyText).not.toContain("seed phrase");
  });

  it("derives deterministic AI optimization actions with review guardrails", () => {
    const workflow = createAiOptimizationWorkflow(campaignDetail);
    const repeatedWorkflow = createAiOptimizationWorkflow(campaignDetail);
    const actions = workflow.reports.flatMap((report) => report.actions);
    const actionsById = Object.fromEntries(actions.map((action) => [action.id, action]));

    expect(workflow).toEqual(repeatedWorkflow);
    expect(workflow.campaignId).toBe(campaignDetail.id);
    expect(workflow.reports.map((report) => report.category)).toEqual([
      "analytics_summary",
      "user_quality",
      "bot_pattern",
      "winner_report",
      "boss_report",
      "optimization",
    ]);
    expect(actions.length).toBeGreaterThanOrEqual(4);
    expect(workflow.summary).toMatchObject({
      totalActions: actions.length,
      readyCount: expect.any(Number),
      reviewRequiredCount: expect.any(Number),
      blockedCount: expect.any(Number),
      topActionId: expect.any(String),
    });
    expect(workflow.summary.bossSummary["en-US"]).toContain("Campaign health");
    expect(workflow.boundary["en-US"]).toContain("No live AI provider");

    for (const action of actions) {
      expect(action).toMatchObject({
        ownerRole: expect.any(String),
        status: expect.any(String),
        evidence: expect.objectContaining({ "en-US": expect.any(String) }),
        expectedImpact: expect.objectContaining({ "en-US": expect.any(String) }),
        guardrail: expect.objectContaining({ "en-US": expect.any(String) }),
        nextAction: expect.objectContaining({ "en-US": expect.any(String) }),
      });
      expect(action.sourceMetrics.length).toBeGreaterThan(0);
    }

    expect(actionsById["explain-bridge-friction"]).toMatchObject({
      status: "ready_to_review",
      ownerRole: "internal_operator",
      riskLevel: "low",
      requiresHumanReview: false,
    });
    expect(actionsById["hold-export-for-risk-review"]).toMatchObject({
      status: "blocked",
      ownerRole: "risk_reviewer",
      riskLevel: "high",
      requiresHumanReview: true,
    });
    expect(actionsById["prepare-winner-export-brief"]).toMatchObject({
      status: "review_required",
      ownerRole: "risk_reviewer",
      requiresHumanReview: true,
    });
    expect(actionsById["review-referral-weight"]).toMatchObject({
      status: "review_required",
      ownerRole: "project_owner",
      riskLevel: "medium",
      requiresHumanReview: true,
    });
    expect(actionsById["hold-export-for-risk-review"].guardrail["en-US"]).toContain(
      "does not automatically",
    );
  });

  it("keeps the AI optimization project-owner summary safe and local-only", () => {
    const workflow = createAiOptimizationWorkflow(campaignDetail);
    const summaryText = [
      workflow.projectOwnerSummary.title["en-US"],
      workflow.projectOwnerSummary.summary["en-US"],
      workflow.projectOwnerSummary.recommendedAction["en-US"],
      workflow.projectOwnerSummary.nextAction["en-US"],
      workflow.projectOwnerSummary.boundary["en-US"],
    ].join(" ");

    expect(workflow.projectOwnerSummary.hiddenInternalRiskDetail).toBe(true);
    expect(summaryText).toContain("AI Optimization summary");
    expect(summaryText).toContain("No live AI provider");
    expect(summaryText.toLowerCase()).not.toContain("shared funding");
    expect(summaryText.toLowerCase()).not.toContain("ban");
  });

  it("derives AI report handoffs from seeded AI Ops reports without exposing private controls", () => {
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const handoff = adminOps.aiReportHandoff;
    const handoffsByCategory = Object.fromEntries(
      handoff.handoffs.map((row) => [row.category, row]),
    );
    const readyToReviewCount = handoff.handoffs.filter(
      (row) => row.reviewState === "ready_to_review",
    ).length;
    const reviewRequiredCount = handoff.handoffs.filter(
      (row) => row.reviewState === "review_required",
    ).length;
    const blockedCount = handoff.handoffs.filter(
      (row) => row.reviewState === "blocked",
    ).length;
    const serialized = JSON.stringify(handoff).toLowerCase();

    expect(handoff.campaignId).toBe(campaignDetail.id);
    expect(handoff.handoffs.map((row) => row.category)).toEqual([
      "analytics_summary",
      "user_quality",
      "bot_pattern",
      "winner_report",
      "boss_report",
      "optimization",
    ]);
    expect(handoff.summary).toMatchObject({
      totalHandoffs: handoff.handoffs.length,
      readyToReviewCount,
      reviewRequiredCount,
      blockedCount,
    });
    expect(handoff.summary.blockedCount).toBeGreaterThan(0);
    expect(handoff.summary.reviewRequiredCount).toBeGreaterThan(0);
    expect(handoff.summary.topNextAction["en-US"]).toContain("human risk/export review");
    expect(handoff.boundary["en-US"]).toContain("No live AI provider");

    for (const row of handoff.handoffs) {
      expect(row).toMatchObject({
        actionId: expect.any(String),
        ownerRole: expect.any(String),
        generatedAt: expect.any(String),
        reviewState: expect.any(String),
        sourceEvidence: expect.objectContaining({ "en-US": expect.any(String) }),
        guardrail: expect.objectContaining({ "en-US": expect.any(String) }),
        nextAction: expect.objectContaining({ "en-US": expect.any(String) }),
      });
      expect(row.sourceMetrics.length).toBeGreaterThan(0);
      for (const locale of supportedLocales) {
        expect(row.title[locale]).not.toHaveLength(0);
        expect(row.summary[locale]).not.toHaveLength(0);
        expect(row.sourceEvidence[locale]).not.toHaveLength(0);
        expect(row.guardrail[locale]).not.toHaveLength(0);
        expect(row.nextAction[locale]).not.toHaveLength(0);
      }
    }

    expect(handoffsByCategory.bot_pattern).toMatchObject({
      ownerRole: "risk_reviewer",
      reviewState: "blocked",
      requiresHumanReview: true,
    });
    expect(handoffsByCategory.winner_report).toMatchObject({
      ownerRole: "risk_reviewer",
      reviewState: "review_required",
      requiresHumanReview: true,
    });
    expect(handoffsByCategory.boss_report?.ownerRole).toBe("growth_lead");
    expect(handoffsByCategory.winner_report?.guardrail["en-US"]).toContain("does not distribute rewards");

    for (const forbidden of [
      "privatekey",
      "private key",
      "secret",
      "token",
      "signed payload",
      "raw ip",
      "rawip",
      "devicefingerprint",
      "sessionfingerprint",
      "privatethreshold",
      "private threshold",
      "automatic ban",
      "automatically exclude",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("derives a local-only AI Ops KPI adoption console for section 10.5 metrics", () => {
    const console = createAiOpsKpiAdoptionConsole(campaignDetail);
    const commandCenter = createProjectCampaignCommandCenter(campaignDetail);
    const metricsByCategory = Object.fromEntries(
      console.metrics.map((metric) => [metric.category, metric]),
    );
    const readyCount = console.metrics.filter((metric) => metric.readiness === "ready").length;
    const reviewCount = console.metrics.filter((metric) => metric.readiness === "review_required").length;
    const blockedCount = console.metrics.filter((metric) => metric.readiness === "blocked").length;
    const serialized = JSON.stringify(console).toLowerCase();

    expect(console).toEqual(commandCenter.aiOpsKpiAdoption);
    expect(console.campaignId).toBe(campaignDetail.id);
    expect(console.metrics.map((metric) => metric.category)).toEqual([
      "ai_generated_campaign_drafts",
      "ai_content_accepted_rate",
      "manual_edit_time_saved",
      "ai_reports_generated",
      "optimization_suggestions_adopted",
    ]);
    expect(console.summary).toMatchObject({
      totalMetrics: 5,
      readyCount,
      reviewCount,
      blockedCount,
      strongestSignalMetricId: expect.any(String),
      topNextAction: expect.objectContaining({ "en-US": expect.any(String) }),
    });
    expect(console.summary.readyCount + console.summary.reviewCount + console.summary.blockedCount).toBe(5);
    expect(console.boundary["en-US"]).toContain("No live AI provider");
    expect(console.boundary["en-US"]).toContain("event warehouse read");
    expect(console.boundary["en-US"]).toContain("analytics SDK write");
    expect(console.boundary["en-US"]).toContain("wallet action");
    expect(console.boundary["en-US"]).toContain("contract transaction");
    expect(console.boundary["en-US"]).toContain("reward distribution");

    for (const metric of console.metrics) {
      expect(metric).toMatchObject({
        id: expect.any(String),
        value: expect.any(String),
        ownerRole: expect.any(String),
        readiness: expect.any(String),
        label: expect.objectContaining({ "en-US": expect.any(String) }),
        description: expect.objectContaining({ "en-US": expect.any(String) }),
        target: expect.objectContaining({ "en-US": expect.any(String) }),
        trend: expect.objectContaining({ "en-US": expect.any(String) }),
        evidenceBasis: expect.objectContaining({ "en-US": expect.any(String) }),
        sourceSurface: expect.objectContaining({ "en-US": expect.any(String) }),
        nextAction: expect.objectContaining({ "en-US": expect.any(String) }),
        boundary: expect.objectContaining({ "en-US": expect.any(String) }),
      });

      for (const locale of supportedLocales) {
        expect(metric.label[locale].trim()).not.toBe("");
        expect(metric.description[locale].trim()).not.toBe("");
        expect(metric.target[locale].trim()).not.toBe("");
        expect(metric.trend[locale].trim()).not.toBe("");
        expect(metric.evidenceBasis[locale].trim()).not.toBe("");
        expect(metric.sourceSurface[locale].trim()).not.toBe("");
        expect(metric.nextAction[locale].trim()).not.toBe("");
        expect(metric.boundary[locale].trim()).not.toBe("");
      }
    }

    expect(metricsByCategory.ai_generated_campaign_drafts).toMatchObject({
      label: expect.objectContaining({ "en-US": "AI-generated campaign drafts" }),
      sourceSurface: expect.objectContaining({ "en-US": "AI Content Pack" }),
    });
    expect(metricsByCategory.ai_content_accepted_rate?.target["en-US"].toLowerCase()).toContain("human");
    expect(metricsByCategory.optimization_suggestions_adopted?.target["en-US"].toLowerCase()).toContain("human");
    expect(metricsByCategory.optimization_suggestions_adopted?.target["en-US"]).toContain("no automatic campaign rule changes");
    expect(metricsByCategory.ai_reports_generated).toMatchObject({
      value: String(campaignDetail.aiOpsReports.length),
      readiness: "ready",
    });

    for (const unsafe of [
      "private key",
      "seed phrase",
      "password",
      "cookie",
      "credential",
      "raw ip",
      "raw device",
      "provider prompt",
      "private repo",
      "private threshold",
      "access_token",
    ]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("derives Points / Ranking / Referral service readiness without live ledger or reward execution", () => {
    const readiness = createPointsRankingReferralServiceReadiness(campaignDetail);
    const again = createPointsRankingReferralServiceReadiness(campaignDetail);
    const commandCenter = createProjectCampaignCommandCenter(campaignDetail);
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const lanesById = Object.fromEntries(readiness.lanes.map((lane) => [lane.id, lane]));
    const readyCount = readiness.lanes.filter((lane) => lane.readiness === "ready").length;
    const reviewCount = readiness.lanes.filter((lane) => lane.readiness === "review_required").length;
    const blockedCount = readiness.lanes.filter((lane) => lane.readiness === "blocked").length;
    const localOnlyCount = readiness.lanes.filter((lane) => lane.readiness === "local_only").length;
    const seededPoints = campaignDetail.participants.reduce(
      (sum, participant) => sum + participant.totalPoints,
      0,
    );
    const serialized = JSON.stringify(readiness).toLowerCase();

    expect(readiness).toEqual(again);
    expect(commandCenter.pointsRankingReferralReadiness).toEqual(readiness);
    expect(adminOps.pointsRankingReferralReadiness).toEqual(readiness);
    expect(readiness.lanes.map((lane) => lane.id)).toEqual([
      "points-ledger",
      "ranking",
      "referral",
      "pixiepoints-backend-handoff",
    ]);
    expect(readiness.summary).toMatchObject({
      totalLanes: 4,
      readyLanes: readyCount,
      reviewRequiredLanes: reviewCount,
      blockedLanes: blockedCount,
      localOnlyLanes: localOnlyCount,
      topLaneId: expect.any(String),
      totalRawInvites: 22,
      totalQualifiedInvitees: 10,
      totalReferralPoints: 200,
    });
    expect(
      readiness.summary.readyLanes +
        readiness.summary.reviewRequiredLanes +
        readiness.summary.blockedLanes +
        readiness.summary.localOnlyLanes,
    ).toBe(4);
    expect(lanesById["points-ledger"]).toMatchObject({
      metricValue: String(seededPoints),
      ownerRole: "internal_operator",
      readiness: "local_only",
    });
    expect(lanesById["points-ledger"]?.boundary["en-US"]).toContain("no live points ledger");
    expect(lanesById.ranking?.sourceSurface["en-US"]).toContain("review input");
    expect(lanesById.ranking?.boundary["en-US"]).toContain("does not distribute rewards");
    expect(lanesById.referral).toMatchObject({
      metricValue: "10/22",
      ownerRole: "project_owner",
    });
    expect(lanesById.referral?.evidence["en-US"]).toContain("Raw invites: 22");
    expect(lanesById.referral?.evidence["en-US"]).toContain("qualified invitees: 10");
    expect(lanesById.referral?.evidence["en-US"]).toContain("referral points: 200");
    expect(lanesById.referral?.evidence["en-US"]).toContain("Only qualified invitees");
    expect(lanesById.referral?.boundary["en-US"]).toContain("no live Referral backend");
    expect(lanesById["pixiepoints-backend-handoff"]?.evidence["en-US"]).toContain(
      "Pixiepoints/backend ledger",
    );
    expect(lanesById["pixiepoints-backend-handoff"]?.boundary["en-US"]).toContain(
      "no backend ledger write",
    );
    expect(readiness.boundary["en-US"]).toContain("No live points ledger");
    expect(readiness.boundary["en-US"]).toContain("no live Referral backend");
    expect(readiness.boundary["en-US"]).toContain("no contract write");
    expect(readiness.boundary["en-US"]).toContain("no reward distribution");

    for (const lane of readiness.lanes) {
      for (const locale of supportedLocales) {
        expect(lane.label[locale].trim()).not.toBe("");
        expect(lane.description[locale].trim()).not.toBe("");
        expect(lane.evidence[locale].trim()).not.toBe("");
        expect(lane.nextAction[locale].trim()).not.toBe("");
      }
    }

    for (const forbidden of [
      "privatekey",
      "access_token",
      "contractroot",
      "transactionid",
      "downloadurl",
      "signed payload",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("derives local-only competitor watch signals without exposing sensitive controls", () => {
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const competitorWatch = adminOps.competitorWatch;
    const readyCount = competitorWatch.signals.filter((signal) => signal.reviewState === "ready").length;
    const reviewRequiredCount = competitorWatch.signals.filter(
      (signal) => signal.reviewState === "review_required",
    ).length;
    const blockedCount = competitorWatch.signals.filter((signal) => signal.reviewState === "blocked").length;
    const differentiators = new Set(competitorWatch.signals.flatMap((signal) => signal.differentiators));
    const localizedFields = [
      competitorWatch.boundary,
      competitorWatch.nextAction,
      competitorWatch.summary.topNextAction,
      ...competitorWatch.signals.flatMap((signal) => [
        signal.platformLabel,
        signal.observedPattern,
        signal.aelfImplication,
        signal.evidenceBasis,
        signal.guardrail,
        signal.nextAction,
      ]),
    ];
    const serialized = JSON.stringify(competitorWatch).toLowerCase();

    expect(competitorWatch.campaignId).toBe(campaignDetail.id);
    expect(competitorWatch.signals.map((signal) => signal.category)).toEqual([
      "generic_quest_platform",
      "onchain_activation",
      "community_intelligence",
      "growth_infrastructure",
    ]);
    expect(competitorWatch.summary).toMatchObject({
      totalSignals: competitorWatch.signals.length,
      readyCount,
      reviewRequiredCount,
      blockedCount,
      differentiatorCount: differentiators.size,
    });
    expect(competitorWatch.summary.topSignalId).toBe("growth-infrastructure-ai-ops");
    expect([...differentiators].sort()).toEqual([
      "ecosystem_conversion",
      "project_owned_rewards",
      "user_quality",
      "verified_actions",
      "wallet_support",
    ]);
    expect(competitorWatch.boundary["en-US"]).toContain("No live scraping");
    expect(competitorWatch.boundary["en-US"]).toContain("no live AI provider");
    expect(competitorWatch.boundary["en-US"]).toContain("no reward distribution");

    for (const localizedText of localizedFields) {
      for (const locale of supportedLocales) {
        expect(localizedText[locale]).not.toHaveLength(0);
      }
    }

    for (const forbidden of [
      "private key",
      "seed phrase",
      "token",
      "cookie",
      "password",
      "credential",
      "ip address",
      "raw device",
      "private threshold",
      "scraped page",
      "paid data feed",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("derives a local-only state components delivery gallery with complete coverage", () => {
    const gallery = createStateComponentsDeliveryGallery(campaignDetail);
    const examples = gallery.families.flatMap((family) => family.examples);
    const examplesById = Object.fromEntries(examples.map((example) => [example.id, example]));
    const localizedFields = [
      gallery.boundary,
      gallery.summary.topNextAction,
      ...gallery.families.flatMap((family) => [
        family.label,
        family.description,
        ...family.examples.flatMap((example) => [
          example.label,
          example.meaning,
          example.userMessage,
          example.nextAction,
        ]),
      ]),
    ];
    const serialized = JSON.stringify(gallery).toLowerCase();

    expect(gallery.families.map((family) => family.id)).toEqual([
      "campaign",
      "task_verification",
      "eligibility",
      "i18n_content",
      "wallet_qa",
      "export_modal",
      "toast_notification",
      "blocked_publish",
    ]);
    expect(gallery.summary).toMatchObject({
      totalFamilies: gallery.families.length,
      totalExamples: examples.length,
      coveredCount: examples.filter((example) => example.readiness === "covered").length,
      reviewRequiredCount: examples.filter((example) => example.readiness === "review_required").length,
      blockedCount: examples.filter((example) => example.readiness === "blocked").length,
    });
    expect(gallery.summary.totalFamilies).toBe(8);
    expect(gallery.sourceReferences).toEqual(
      expect.arrayContaining([
        "v0.1 full UI design screen 15 state delivery",
        "v0.2 interaction design i18n state requirements",
      ]),
    );
    expect(examplesById["task-failed"].nextAction["en-US"]).toMatch(/Retry verification|go to bridge|complete swap|contact the project owner/i);
    expect(examplesById["task-manual-review"].nextAction["en-US"]).toContain("Submit proof");
    expect(examplesById["toast-loading"].userMessage["en-US"]).toContain("No live sync");
    expect(examplesById["toast-empty"].nextAction["en-US"]).toContain("Clear filters");
    expect(examplesById["toast-error"].nextAction["en-US"]).toMatch(/Retry the local preview|contact the project owner/i);
    expect(examplesById["export-modal-review"].userMessage["en-US"]).toContain("does not distribute rewards");
    expect(examplesById["export-modal-review"].userMessage["en-US"]).toContain("campaign project");
    expect(examplesById["publish-contract-claim-review"].nextAction["en-US"]).toContain("contract reviewer approval");
    expect(gallery.boundary["en-US"]).toContain("No live backend or API call");
    expect(gallery.boundary["en-US"]).toContain("no wallet signing");
    expect(gallery.boundary["en-US"]).toContain("no analytics write");
    expect(gallery.boundary["en-US"]).toContain("no export file generation");
    expect(gallery.boundary["en-US"]).toContain("no contract write");
    expect(gallery.boundary["en-US"]).toContain("no reward custody");
    expect(gallery.boundary["en-US"]).toContain("no reward distribution");

    for (const localizedText of localizedFields) {
      for (const locale of supportedLocales) {
        expect(localizedText[locale]).not.toHaveLength(0);
      }
    }

    for (const forbidden of [
      "private key",
      "seed phrase",
      "token",
      "cookie",
      "password",
      "credential",
      "ip address",
      "raw device",
      "private repo",
      "private threshold",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
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

  it("derives a project campaign command center for owner operations", () => {
    const commandCenter = createProjectCampaignCommandCenter(campaignDetail);
    const byStatus = Object.fromEntries(
      commandCenter.campaigns.map((item) => [item.status, item]),
    );

    expect(commandCenter.campaigns.length).toBeGreaterThanOrEqual(4);
    expect(commandCenter.summary).toMatchObject({
      totalCampaigns: commandCenter.campaigns.length,
      liveCount: 1,
      scheduledOrDraftCount: 1,
      endedCount: 1,
      exportedCount: 1,
      exportReadyRows: 1,
    });
    expect(commandCenter.summary.nextPrimaryAction["en-US"]).toContain("Review live analytics");
    expect(byStatus.live).toMatchObject({
      id: "camp-awaken-sprint",
      priority: "primary",
      riskState: "warning",
      exportState: "warning",
    });
    expect(byStatus.live.nextActionLabel["en-US"]).toBe("Review live analytics");
    expect(byStatus.scheduled.nextActionLabel["en-US"]).toBe("Review launch readiness");
    expect(byStatus.ended.nextActionLabel["en-US"]).toBe("Approve export preview");
    expect(byStatus.exported.nextActionLabel["en-US"]).toBe("Archive final report");
    expect(commandCenter.boundary["en-US"]).toContain("does not distribute rewards");
    expect(commandCenter.boundary["en-US"]).toContain("No live analytics");
    expect(commandCenter.boundary["zh-CN"]).toContain("不会连接实时数据");
  });

  it("derives a post-campaign closeout workspace without live execution or reward custody", () => {
    const closeout = createPostCampaignCloseout(campaignDetail);
    const repeated = createPostCampaignCloseout(campaignDetail);
    const gateIds = closeout.gates.map((gate) => gate.id);
    const gatesById = Object.fromEntries(closeout.gates.map((gate) => [gate.id, gate]));
    const serialized = JSON.stringify(closeout).toLowerCase();

    expect(closeout).toEqual(repeated);
    expect(closeout.campaignId).toBe(campaignDetail.id);
    expect(gateIds).toEqual([
      "analytics-summary",
      "ai-winner-report",
      "export-readiness",
      "risk-review",
      "reward-responsibility",
      "final-report-archive",
      "next-campaign-recommendation",
    ]);
    expect(closeout.summary).toMatchObject({
      totalGates: closeout.gates.length,
      readyCount: closeout.gates.filter((gate) => gate.status === "ready").length,
      reviewRequiredCount: closeout.gates.filter((gate) => gate.status === "review_required").length,
      blockedCount: closeout.gates.filter((gate) => gate.status === "blocked").length,
      localOnlyCount: closeout.gates.filter((gate) => gate.status === "local_only").length,
      topGateId: expect.any(String),
    });
    expect(gateIds).toContain(closeout.summary.topGateId);
    expect(closeout.summary.topAction).toEqual(gatesById[closeout.summary.topGateId]?.nextAction);
    expect(gatesById["ai-winner-report"]).toMatchObject({
      ownerRole: "risk_reviewer",
      source: "ai_report",
      status: "review_required",
    });
    expect(gatesById["export-readiness"]?.evidence["en-US"]).toContain("ready");
    expect(gatesById["risk-review"]?.reason["en-US"]).toContain("does not automatically ban");
    expect(gatesById["reward-responsibility"]).toMatchObject({
      ownerRole: "project_owner",
      source: "reward",
      status: "ready",
    });

    expect(closeout.aiRetrospective).toMatchObject({
      humanReviewRequired: true,
      status: closeout.status,
    });
    expect(closeout.aiRetrospective.healthSummary["en-US"]).toContain("Campaign health");
    expect(closeout.aiRetrospective.verifiedActionEvidence["en-US"]).toContain("Verified actions");
    expect(closeout.aiRetrospective.winnerReportSummary["en-US"]).toContain("Winner");
    expect(closeout.aiRetrospective.nextIterationActions.length).toBeGreaterThanOrEqual(3);
    expect(closeout.rewardBoundary["en-US"]).toContain("does not distribute rewards");
    expect(closeout.boundary["en-US"]).toContain("No live analytics");
    expect(closeout.boundary["en-US"]).toContain("no reward custody or distribution");

    expect(serialized).not.toContain("download url");
    expect(serialized).not.toContain("contract transaction is executed");
    expect(serialized).not.toContain("privatekey");
    expect(serialized).not.toContain("access_token");
    expect(serialized).not.toContain("seed phrase");
  });

  it("derives project portfolio and commercial readiness without live billing or reward custody", () => {
    const commandCenter = createProjectCampaignCommandCenter(campaignDetail);
    const repeated = createProjectCampaignCommandCenter(campaignDetail);
    const readiness = commandCenter.portfolioCommercialReadiness;
    const metricIds = readiness.metrics.map((metric) => metric.id);
    const commercialIds = readiness.commercialModels.map((model) => model.id);
    const serialized = JSON.stringify(readiness);

    expect(readiness).toEqual(repeated.portfolioCommercialReadiness);
    expect(metricIds).toEqual([
      "campaigns_created",
      "active_projects",
      "campaign_setup_time",
      "reward_budget_committed",
      "winner_exports",
      "repeat_project_usage",
    ]);
    expect(commercialIds).toEqual([
      "free_ecosystem_mode",
      "partner_campaign_fee",
      "premium_analytics",
      "ai_ops_package",
      "launch_package",
      "api_usage",
    ]);
    expect(readiness.summary).toMatchObject({
      commercialModelCount: 6,
      productionReadyModelCount: 0,
      totalMetrics: 6,
    });
    expect(readiness.summary.rewardBoundary["en-US"]).toContain("project or partner committed");
    expect(readiness.summary.rewardBoundary["en-US"]).toContain("does not custody rewards");
    expect(readiness.boundary["en-US"]).toContain("No live billing");
    expect(readiness.boundary["en-US"]).toContain("no aelf reward subsidy");
    expect(readiness.boundary["zh-CN"]).toContain("不会执行实时 billing");
    expect(readiness.metrics.find((metric) => metric.id === "reward_budget_committed")).toMatchObject({
      ownerRole: "finance_reviewer",
      state: "warning",
      value: "18,000 ELF",
    });
    expect(readiness.commercialModels.every((model) => model.boundary["en-US"].includes("No live billing"))).toBe(true);

    for (const unsafe of [
      "apiKey",
      "token",
      "privateKey",
      "signedPayload",
      "transactionId",
      "contractRoot",
      "fileUrl",
      "webhookSecret",
      "billingCustomerId",
      "invoiceId",
      "paymentId",
      "ipAddress",
      "deviceFingerprint",
      "mutationId",
    ]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("derives seeded lifecycle status operations without live side effects", () => {
    const lifecycle = createCampaignLifecycleOperations(campaignDetail);
    const commandCenter = createProjectCampaignCommandCenter(campaignDetail);
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const operationsById = Object.fromEntries(
      lifecycle.operations.map((operation) => [operation.id, operation]),
    );
    const repeated = createCampaignLifecycleOperations(campaignDetail);

    expect(lifecycle.currentStatus).toBe("live");
    expect(lifecycle.supportedStatuses).toEqual([
      "draft",
      "ai_draft",
      "human_review",
      "scheduled",
      "live",
      "paused",
      "ended",
      "exported",
      "archived",
    ]);
    expect(lifecycle.summary).toMatchObject({
      totalOperations: lifecycle.operations.length,
      blockedCount: expect.any(Number),
      reviewRequiredCount: expect.any(Number),
      launchBlockingCount: expect.any(Number),
      exportSensitiveCount: expect.any(Number),
    });
    expect(lifecycle.summary.blockedCount).toBe(
      lifecycle.operations.filter((operation) => operation.operationState === "blocked").length,
    );
    expect(lifecycle.operations.map((operation) => operation.id)).toEqual(
      repeated.operations.map((operation) => operation.id),
    );
    expect(lifecycle.launchGateGroups.map((group) => group.id)).toEqual(
      expect.arrayContaining([
        "campaign-basics",
        "time-window",
        "task-verification",
        "reward-eligibility",
        "risk-i18n-contract",
        "internal-provider-review",
      ]),
    );
    expect(operationsById["schedule-campaign"]).toMatchObject({
      fromStatus: "human_review",
      targetStatus: "scheduled",
      localOnly: true,
      operationState: expect.stringMatching(/blocked|review_required|not_applicable/),
      ownerRole: expect.any(String),
    });
    expect(operationsById["publish-campaign"]).toMatchObject({
      fromStatus: "human_review",
      targetStatus: "live",
      localOnly: true,
      operationState: expect.stringMatching(/blocked|review_required|not_applicable/),
    });
    expect(operationsById["generate-ai-draft"]).toMatchObject({
      fromStatus: "draft",
      targetStatus: "ai_draft",
      localOnly: true,
      operationState: "not_applicable",
      requiresReview: true,
    });
    expect(operationsById["submit-human-review"]).toMatchObject({
      fromStatus: "ai_draft",
      targetStatus: "human_review",
      localOnly: true,
      operationState: "not_applicable",
      requiresReview: true,
    });
    for (const operationId of [
      "generate-ai-draft",
      "submit-human-review",
      "schedule-campaign",
      "publish-campaign",
    ]) {
      const operation = operationsById[operationId];

      expect(operation.label["en-US"]).not.toHaveLength(0);
      expect(operation.label["zh-CN"]).not.toHaveLength(0);
      expect(operation.label["zh-TW"]).not.toHaveLength(0);
      expect(operation.nextAction["en-US"]).not.toHaveLength(0);
      expect(operation.nextAction["zh-CN"]).not.toHaveLength(0);
      expect(operation.nextAction["zh-TW"]).not.toHaveLength(0);
    }
    expect(operationsById["pause-campaign"]).toMatchObject({
      fromStatus: "live",
      targetStatus: "paused",
      operationState: "review_required",
      requiresReview: true,
    });
    expect(operationsById["resume-campaign"]).toMatchObject({
      fromStatus: "paused",
      targetStatus: "live",
      operationState: "not_applicable",
      requiresReview: true,
    });
    expect(operationsById["end-campaign"]).toMatchObject({
      fromStatus: "live",
      targetStatus: "ended",
      operationState: "review_required",
    });
    expect(operationsById["export-campaign"]).toMatchObject({
      fromStatus: "ended",
      targetStatus: "exported",
      operationState: "not_applicable",
      gateGroup: "export",
    });
    expect(operationsById["archive-campaign"]).toMatchObject({
      fromStatus: "exported",
      targetStatus: "archived",
      operationState: "not_applicable",
      gateGroup: "archive",
    });
    expect(operationsById["pause-campaign"].blockingChecks.length).toBeGreaterThan(0);
    expect(lifecycle.boundary["en-US"]).toContain("No live backend");
    expect(lifecycle.boundary["en-US"]).toContain("reward distribution");
    expect(lifecycle.nextAction["en-US"].length).toBeGreaterThan(0);
    expect(commandCenter.lifecycleOperations).toEqual(lifecycle);
    expect(adminOps.lifecycleOperations).toEqual(lifecycle);
    expect(JSON.stringify(lifecycle)).not.toContain("signedPayload");
    expect(JSON.stringify(lifecycle)).not.toContain("transactionId");
    expect(JSON.stringify(lifecycle)).not.toContain("contractRoot");
    expect(JSON.stringify(lifecycle)).not.toContain("fileUrl");
    expect(JSON.stringify(lifecycle)).not.toContain("mutationId");
  });

  it("derives Launch Console campaign bundles as local-only staged handoffs", () => {
    const surface = createLaunchConsoleCampaignBundles(campaignDetail);
    const repeated = createLaunchConsoleCampaignBundles(campaignDetail);
    const commandCenter = createProjectCampaignCommandCenter(campaignDetail);
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const allTaskCategories = new Set(
      surface.bundles.flatMap((bundle) => bundle.tasks.map((task) => task.category)),
    );
    const handoffIds = surface.handoffs.map((handoff) => handoff.id);
    const publicSafetyText = JSON.stringify(surface).toLowerCase();

    expect(surface).toEqual(repeated);
    expect(surface.campaignId).toBe(campaignDetail.id);
    expect(surface.bundles.map((bundle) => bundle.stage)).toEqual([
      "pre_launch",
      "launch",
      "post_launch",
    ]);
    expect(surface.summary).toMatchObject({
      totalBundles: 3,
      readyCount: expect.any(Number),
      reviewRequiredCount: expect.any(Number),
      blockedCount: expect.any(Number),
      localOnlyCount: expect.any(Number),
      launchBlockingCount: expect.any(Number),
      handoffRequiredCount: expect.any(Number),
    });
    expect(surface.summary.blockedCount).toBe(
      surface.bundles.filter((bundle) => bundle.status === "blocked").length,
    );
    expect(surface.summary.reviewRequiredCount).toBe(
      surface.bundles.filter((bundle) => bundle.status === "review_required").length,
    );
    expect(surface.summary.localOnlyCount).toBe(
      surface.bundles.filter((bundle) => bundle.status === "local_only").length,
    );
    expect(surface.summary.launchBlockingCount).toBe(
      surface.bundles
        .flatMap((bundle) => bundle.gateEvidence)
        .filter((gate) => gate.blocksLaunch).length,
    );
    expect(surface.summary.handoffRequiredCount).toBe(
      surface.handoffs.filter((handoff) => handoff.reviewState !== "ready").length,
    );
    expect([...allTaskCategories].sort()).toEqual([
      "content_analytics",
      "on_chain_api",
      "social_manual",
      "wallet",
    ]);
    expect(handoffIds).toEqual([
      "create_campaign",
      "generate_campaign_tasks",
      "verify_task",
      "check_eligibility",
      "export_winners",
      "generate_campaign_posts",
      "summarize_campaign",
    ]);
    expect(surface.bundles.every((bundle) =>
      bundle.ownerRole &&
      bundle.tasks.length > 0 &&
      bundle.gateEvidence.length > 0 &&
      bundle.handoffIds.length > 0 &&
      bundle.nextAction["en-US"].length > 0 &&
      bundle.publicBoundary["en-US"].includes("No live Launch Console")
    )).toBe(true);
    expect(surface.handoffs.every((handoff) =>
      handoff.inputIntent["en-US"].length > 0 &&
      handoff.outputPreview["en-US"].length > 0 &&
      handoff.boundary["en-US"].length > 0
    )).toBe(true);
    expect(surface.boundary["en-US"]).toContain("No live Launch Console");
    expect(surface.boundary["zh-CN"]).toContain("不会执行实时 Launch Console");
    expect(commandCenter.launchConsoleCampaignBundles).toEqual(surface);
    expect(adminOps.launchConsoleCampaignBundles).toEqual(surface);

    expect(publicSafetyText).not.toContain("apikey");
    expect(publicSafetyText).not.toContain("access_token");
    expect(publicSafetyText).not.toContain("signedpayload");
    expect(publicSafetyText).not.toContain("transactionid");
    expect(publicSafetyText).not.toContain("contractroot");
    expect(publicSafetyText).not.toContain("fileurl");
    expect(publicSafetyText).not.toContain("webhooksecret");
    expect(publicSafetyText).not.toContain("mutationid");
  });

  it("derives analytics and export decision details for Project Console", () => {
    const commandCenter = createProjectCampaignCommandCenter(campaignDetail);
    const decision = commandCenter.analyticsExport;
    const kpisById = Object.fromEntries(decision.kpis.map((kpi) => [kpi.id, kpi]));

    expect(Object.keys(kpisById)).toEqual(
      expect.arrayContaining([
        "participants",
        "verified-actions",
        "referral-conversion",
        "risk-rate",
        "eligible-winners",
        "export-readiness",
      ]),
    );
    expect(decision.exportColumns).toEqual(EXPORT_CSV_COLUMNS);
    expect(decision.readyRows + decision.reviewRequiredRows + decision.blockedRows).toBe(
      campaignDetail.exportPreview.rows.length,
    );
    expect(decision).toMatchObject({
      exportBatchId: "export-awaken-sprint-preview",
      readyRows: 1,
      reviewRequiredRows: 3,
      blockedRows: 0,
    });
    expect(decision.walletSplit.map((split) => split.label).sort()).toEqual(["AA", "EOA"]);
    expect(decision.localeSplit.map((split) => split.label).sort()).toEqual([
      "en-US",
      "zh-CN",
      "zh-TW",
    ]);
    expect(decision.dropOffPoint["en-US"]).toContain("Largest drop-off");
    expect(decision.evidenceCoverage["en-US"]).toContain("task evidence");
    expect(decision.boundary["en-US"]).toContain("exports verified records only");
    expect(decision.boundary["en-US"]).toContain("does not distribute rewards");
  });

  it("derives advanced analytics readiness without live analytics side effects", () => {
    const surface = createAdvancedAnalyticsReadiness(campaignDetail);
    const commandCenter = createProjectCampaignCommandCenter(campaignDetail);
    const adminOps = createAdminOpsReadModel(campaignDetail);

    expect(commandCenter.advancedAnalytics).toEqual(surface);
    expect(adminOps.advancedAnalytics).toEqual(surface);
    expect(surface.campaignId).toBe(campaignDetail.id);
    expect(surface.cohorts.length).toBeGreaterThanOrEqual(4);
    expect(surface.cohorts.every((cohort) =>
      cohort.id &&
      cohort.label["en-US"] &&
      cohort.audienceSummary["en-US"] &&
      cohort.walletMix["en-US"] &&
      Number.isInteger(cohort.participantCount) &&
      cohort.retentionSignal["en-US"] &&
      cohort.conversionSignal["en-US"] &&
      cohort.riskReviewState["en-US"] &&
      cohort.nextAction["en-US"] &&
      cohort.boundary["en-US"].includes("No live analytics")
    )).toBe(true);
    expect(surface.retentionWindows.map((window) => window.id)).toEqual(["day7", "day30"]);
    expect(surface.retentionWindows.every((window) =>
      window.rate >= 0 &&
      window.rate <= 1 &&
      window.repeatActionCount >= 0 &&
      window.sampleBasis["en-US"] &&
      window.qualityNote["en-US"] &&
      window.evidenceGap["en-US"]
    )).toBe(true);
    expect(surface.productConversions.map((row) => row.productName["en-US"])).toEqual([
      "eBridge",
      "Awaken",
      "Forest",
      "TMRWDAO",
      "daipp",
      "Pay",
      "Forecast",
      "Portfolio",
    ]);
    expect(surface.premiumReports.map((report) => report.id)).toEqual([
      "cohort_report",
      "retention_report",
      "real_user_quality",
      "conversion_report",
      "risk_report",
    ]);
    expect(surface.summary.totalCohorts).toBe(surface.cohorts.length);
    expect(surface.summary.readyCohorts).toBe(
      surface.cohorts.filter((cohort) => cohort.qualityState === "ready").length,
    );
    expect(surface.summary.reviewRequiredCohorts).toBe(
      surface.cohorts.filter((cohort) =>
        cohort.qualityState === "review_required" || cohort.qualityState === "blocked"
      ).length,
    );
    expect(surface.summary.day7RetentionRate).toBe(surface.retentionWindows[0].rate);
    expect(surface.summary.day30RetentionRate).toBe(surface.retentionWindows[1].rate);
    expect(surface.summary.averageRealUserScore).toBe(surface.realUserQuality.score);
    expect(surface.summary.costPerVerifiedAction).toBe(surface.costEfficiency.costPerVerifiedAction);
    expect(surface.summary.productConversionCoverage).toBe(surface.productConversions.length);
    expect(surface.summary.premiumReadyReports).toBe(
      surface.premiumReports.filter((report) =>
        report.readiness === "ready" || report.readiness === "local_only"
      ).length,
    );
    expect(surface.boundary["en-US"]).toContain("No live analytics");
    expect(surface.costEfficiency.boundary["en-US"]).toContain("reward distribution");
    expect(surface.realUserQuality.score).toBeGreaterThanOrEqual(0);
    expect(surface.realUserQuality.score).toBeLessThanOrEqual(100);

    for (const unsafe of [
      "apiKey",
      "token",
      "privateKey",
      "signedPayload",
      "transactionId",
      "contractRoot",
      "fileUrl",
      "webhookSecret",
      "billingCustomerId",
      "ipAddress",
      "deviceFingerprint",
      "mutationId",
    ]) {
      expect(hasOwnKeyDeep(surface, unsafe)).toBe(false);
    }
  });

  it("derives localized campaign share cards and metadata fields", () => {
    const englishCard = createCampaignShareCardReadiness(campaignDetail, "en-US");
    const chineseCard = createCampaignShareCardReadiness(campaignDetail, "zh-CN");
    const traditionalCard = createCampaignShareCardReadiness(campaignDetail, "zh-TW");
    const metadataByName = Object.fromEntries(
      traditionalCard.metadataFields.map((field) => [field.name, field]),
    );

    expect(englishCard).toMatchObject({
      canonicalUrl: "https://campaign.local/en-US/campaigns/awaken-sprint",
      contentStatus: "published",
      fallbackToEnglish: false,
      readiness: "ready",
      title: "Awaken Sprint",
    });
    expect(chineseCard).toMatchObject({
      canonicalUrl: "https://campaign.local/zh-CN/campaigns/awaken-sprint",
      contentStatus: "ai_draft",
      fallbackToEnglish: true,
      readiness: "warning",
      title: "Awaken Sprint",
    });
    expect(traditionalCard).toMatchObject({
      canonicalUrl: "https://campaign.local/zh-TW/campaigns/awaken-sprint",
      contentStatus: "empty",
      fallbackToEnglish: true,
      readiness: "warning",
      title: "Awaken Sprint",
    });
    expect(traditionalCard.alternateUrls).toEqual({
      "en-US": "https://campaign.local/en-US/campaigns/awaken-sprint",
      "zh-CN": "https://campaign.local/zh-CN/campaigns/awaken-sprint",
      "zh-TW": "https://campaign.local/zh-TW/campaigns/awaken-sprint",
    });
    expect(metadataByName.title).toMatchObject({
      content: "Awaken Sprint | aelf Campaign OS",
      kind: "document-title",
    });
    expect(metadataByName["og:url"]).toMatchObject({
      content: "https://campaign.local/zh-TW/campaigns/awaken-sprint",
      kind: "meta-property",
    });
    expect(metadataByName["twitter:card"]).toMatchObject({
      content: "summary_large_image",
      kind: "meta-name",
    });
    expect(traditionalCard.fallbackNotice["en-US"]).toContain("English fallback");
  });

  it("derives seeded locale analytics readiness without live instrumentation", () => {
    const rows = createLocaleAnalyticsReadiness(campaignDetail);
    const rowsByKey = Object.fromEntries(
      rows.map((row) => [`${row.metric}:${row.locale}`, row]),
    );

    expect(rows).toHaveLength(supportedLocales.length * 7);
    for (const locale of supportedLocales) {
      expect(rowsByKey[`campaign_views:${locale}`]).toMatchObject({
        label: expect.objectContaining({ "en-US": "Campaign views" }),
        readiness: "ready",
      });
      expect(rowsByKey[`wallet_connect_conversion:${locale}`]).toBeDefined();
      expect(rowsByKey[`task_completion:${locale}`]).toBeDefined();
      expect(rowsByKey[`referral_conversion:${locale}`]).toBeDefined();
      expect(rowsByKey[`translation_fallback_rate:${locale}`]).toBeDefined();
      expect(rowsByKey[`ai_draft_accepted_rate:${locale}`]).toBeDefined();
      expect(rowsByKey[`manual_edit_time:${locale}`]).toBeDefined();
      expect(rowsByKey[`campaign_views:${locale}`].boundary["en-US"]).toContain(
        "No live analytics SDK",
      );
    }
    expect(rowsByKey["translation_fallback_rate:en-US"]).toMatchObject({
      readiness: "ready",
      value: "0%",
    });
    expect(rowsByKey["translation_fallback_rate:zh-TW"]).toMatchObject({
      readiness: "warning",
      value: "100%",
    });
    expect(rowsByKey["ai_draft_accepted_rate:en-US"]).toMatchObject({
      readiness: "ready",
      value: "N/A",
    });
    expect(rowsByKey["ai_draft_accepted_rate:zh-CN"]).toMatchObject({
      label: expect.objectContaining({ "en-US": "AI draft accepted rate" }),
      readiness: "warning",
      value: "0%",
    });
    expect(rowsByKey["manual_edit_time:zh-CN"]).toMatchObject({
      label: expect.objectContaining({ "en-US": "Manual edit time" }),
      readiness: "warning",
      value: "15 min pending review",
    });
    expect(rowsByKey["manual_edit_time:zh-TW"]).toMatchObject({
      readiness: "warning",
      value: "30 min fallback review",
    });
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

  it("exposes aelf-web-login adapter readiness through command center and admin ops", () => {
    const commandCenter = createProjectCampaignCommandCenter(campaignDetail);
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const readiness = commandCenter.aelfWebLoginAdapterReadiness;

    expect(readiness).toEqual(adminOps.aelfWebLoginAdapterReadiness);
    expect(readiness).toEqual(createAelfWebLoginAdapterReadiness(campaignDetail.walletSessions));
    expect(readiness.summary.totalAdapters).toBe(readiness.entries.length);
    expect(readiness.summary.publicUserAdapters).toBe(readiness.normalUserEntries.length);
    expect(readiness.summary.internalOnlyAdapters).toBe(readiness.internalEntries.length);
    expect(readiness.entries.map((entry) => entry.walletSource)).toEqual(
      expect.arrayContaining([
        "PORTKEY_AA",
        "PORTKEY_EOA_APP",
        "PORTKEY_EOA_EXTENSION",
        "NIGHTELF",
        "AGENT_SKILL",
      ]),
    );
    expect(readiness.normalUserEntries.every((entry) => entry.walletSource !== "AGENT_SKILL")).toBe(true);
    expect(readiness.entries.every((entry) => entry.featureGate.degradesGracefully)).toBe(true);
    expect(readiness.entries.every((entry) => entry.securityBoundary["en-US"])).toBe(true);

    for (const unsafe of [
      "privateKey",
      "seedPhrase",
      "recoveryPhrase",
      "oauthToken",
      "apiKey",
      "signature",
      "signedPayload",
      "transactionId",
      "contractRoot",
      "fileUrl",
      "downloadUrl",
      "rawProvider",
      "providerCredential",
    ]) {
      expect(hasOwnKeyDeep(readiness, unsafe)).toBe(false);
    }
  });
});
