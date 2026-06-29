import { describe, expect, it } from "vitest";
import {
  campaignDetail,
  createAiContentPackWorkbench,
  createAiOptimizationWorkflow,
  createContractImpactReviewModel,
  createEligibilityCheckerReadModel,
  createEcosystemNextActionReadModel,
  createLeaderboardReadModel,
  createProjectCampaignCommandCenter,
  createUserWinnersExportStatusReadModel,
  createVerificationCoverageSummary,
  computeMissingTasks,
  computePublishReadiness,
  createAdminOpsReadModel,
  createExportConfirmationReadinessGate,
  createExportPreview,
  createParticipationReadModel,
  createCampaignShareCardReadiness,
  createTranslationManagerReadModel,
  createLocaleAnalyticsReadiness,
  createVerificationPipelineReadinessGate,
  createWalletConnectionDiagnostics,
  createWalletProviderQaReadinessGate,
  deriveEligibilityWalletStatus,
  deriveParticipantTaskStates,
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
      new Set(["covered", "needs_review", "blocked", "deferred"]),
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
    expect(itemsById["product-reward-disclaimer-locales"]).toMatchObject({
      status: "covered",
      blocksDelivery: false,
      ownerRole: "project_owner",
    });
    expect(itemsById["product-reward-disclaimer-locales"]?.evidence["en-US"]).toContain(
      "localized reward disclaimer gate",
    );
    expect(itemsById["product-contract-impact-review"]?.evidence["en-US"]).toContain("claim-mode blockers");
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
      status: "blocked",
      blocksDelivery: true,
      ownerRole: "contract_reviewer",
    });
    expect(itemsById["contract-reward-custody-excluded"]?.nextAction["en-US"]).toContain(
      "Block any reward custody",
    );
    expect(readiness.blockers.map((item) => item.id)).toEqual([
      "contract-reward-custody-excluded",
      "qa-contract-claim-admin-approval",
    ]);
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
      expect.arrayContaining(["wallet", "bridge", "swap", "nft", "dao", "daipp", "social", "invite"]),
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

    expect(rows).toHaveLength(supportedLocales.length * 5);
    for (const locale of supportedLocales) {
      expect(rowsByKey[`campaign_views:${locale}`]).toMatchObject({
        label: expect.objectContaining({ "en-US": "Campaign views" }),
        readiness: "ready",
      });
      expect(rowsByKey[`wallet_connect_conversion:${locale}`]).toBeDefined();
      expect(rowsByKey[`task_completion:${locale}`]).toBeDefined();
      expect(rowsByKey[`referral_conversion:${locale}`]).toBeDefined();
      expect(rowsByKey[`translation_fallback_rate:${locale}`]).toBeDefined();
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
