import { describe, expect, it } from "vitest";
import {
  campaignDetail,
  campaignLifecycleStatuses,
  createAdvancedAnalyticsReadiness,
  createAiContentPackWorkbench,
  createAelfWebLoginAdapterReadiness,
  createAiOpsKpiAdoptionConsole,
  createAiOptimizationWorkflow,
  createAntiSybilV2GraphReadiness,
  createApiUsageCommercializationReadiness,
  createCompanionContractReadiness,
  createContractClaimAdminApprovalReadiness,
  createContractClaimCustodyLegalReadiness,
  createContractClaimPreapprovalPackage,
  createContractClaimSecurityReviewReadiness,
  createContractImpactReviewModel,
  createContractStatusMappingReadiness,
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
  createDeliveryAcceptanceConsole,
  createExportConfirmationReadinessGate,
  createExportStorageFulfillmentApprovalReadiness,
  createExportFulfillmentReadiness,
  createExportArtifact,
  createExportPreview,
  createAwakenSwapLiquidityTaskReadiness,
  createDaippAgentCoinTaskReadiness,
  createEbridgeTaskReadiness,
  createForestNftTaskReadiness,
  createSchrodingerNftTaskReadiness,
  createForecastCampaignTaskReadiness,
  createPayCampaignTaskReadiness,
  createTmrwdaoGovernanceTaskReadiness,
  createParticipantWorkspaceReadModel,
  createParticipationReadModel,
  createP1LocaleActivationReadiness,
  createProviderEvidenceRegistry,
  createResidualGapMissionQueue,
  createVerificationRulesWorkspace,
  createCampaignShareCardReadiness,
  createCampaignLifecycleOperations,
  createCampaignDiscoveryReadModel,
  createCampaignMarketplaceReadiness,
  createMobileTelegramMiniAppHubReadiness,
  createPortfolioCampaignHistoryReadModel,
  createTranslationManagerReadModel,
  executeWalletProviderEvidenceReviewAction,
  executeI18nReviewAction,
  createLocaleAnalyticsReadiness,
  createLaunchConsoleCampaignBundles,
  createRiskIntelligenceReviewSurface,
  createVerificationPipelineReadinessGate,
  createWalletConnectionDiagnostics,
  createWalletProviderEvidenceApprovalAudit,
  createDefaultWalletProviderEvidenceRecoveryResult,
  createWalletProviderEvidenceAllApprovedSampleSnapshot,
  createWalletProviderEvidenceCloseoutPackage,
  createWalletProviderEvidenceIntake,
  createWalletProviderEvidenceActivation,
  createWalletProviderEvidenceRecoveryInitialUiState,
  createWalletProviderEvidenceReleaseApprovalSnapshot,
  createWalletProviderEvidenceReleaseReadiness,
  createWalletProviderEvidenceRequestPacket,
  createWalletProviderQaReadinessGate,
  recoverWalletProviderEvidenceState,
  serializeWalletProviderEvidenceRecoverySnapshot,
  validateWalletProviderEvidenceRecoverySnapshot,
  deriveEligibilityWalletStatus,
  deriveParticipantTaskActions,
  deriveParticipantTaskStates,
  deriveTaskVerificationAction,
  defaultLocale,
  EXPORT_CSV_COLUMNS,
  fallbackLocale,
  getLocalizedText,
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
import type {
  ContractCampaignStatus,
  ContractClaimActorApprovalRowId,
  ContractClaimAdminApprovalItemId,
  ContractClaimCustodyLegalItemId,
  ContractClaimEligibilityLineageRowId,
  ContractClaimExecutionApprovalEvidenceRowId,
  ContractClaimExecutionApprovalItemId,
  ContractClaimParticipantApprovalCheckId,
  ContractClaimPreapprovalGateId,
  ContractClaimRewardCustodyApprovalItemId,
  ContractClaimSecurityReviewItemId,
  ContractClaimThreatModelSectionId,
  WalletProviderEvidenceArtifact,
  WalletProviderEvidenceIntake,
  WalletProviderEvidenceReviewArtifactReference,
  WalletProviderQaScenarioId,
} from "./types";

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

const activatedRuntimeLocales = ["en-US", "zh-CN", "zh-TW", "ja-JP", "ko-KR", "vi-VN", "id-ID", "tr-TR", "es-ES"] as const;

const walletProviderScenarioIds: WalletProviderQaScenarioId[] = [
  "portkey-aa-connect",
  "eoa-extension-connect",
  "extension-not-installed-error",
  "wrong-chain-error",
  "unsupported-wallet-error",
];

const approvedWalletProviderArtifacts = (
  scenarioId: WalletProviderQaScenarioId,
): WalletProviderEvidenceArtifact[] => {
  const artifacts: WalletProviderEvidenceArtifact[] = [
    {
      artifactType: "screenshot",
      id: `${scenarioId}-approved-screenshot`,
      label: {
        "en-US": `${scenarioId} approved screenshot`,
        "zh-CN": `${scenarioId} 已批准截图`,
        "zh-TW": `${scenarioId} 已批准截圖`,
      },
      reference: `local-wallet-qa/${scenarioId}-approved-screenshot`,
      required: true,
    },
    {
      artifactType: "qa_run",
      id: `${scenarioId}-approved-qa-run`,
      label: {
        "en-US": `${scenarioId} approved QA run`,
        "zh-CN": `${scenarioId} 已批准 QA run`,
        "zh-TW": `${scenarioId} 已批准 QA run`,
      },
      reference: `local-wallet-qa/${scenarioId}-approved-run`,
      required: true,
    },
  ];

  if (
    scenarioId === "wrong-chain-error" ||
    scenarioId === "unsupported-wallet-error" ||
    scenarioId === "extension-not-installed-error"
  ) {
    artifacts.push({
      artifactType: "runbook",
      id: `${scenarioId}-approved-runbook`,
      label: {
        "en-US": `${scenarioId} approved runbook`,
        "zh-CN": `${scenarioId} 已批准 runbook`,
        "zh-TW": `${scenarioId} 已批准 runbook`,
      },
      reference: `local-wallet-qa/${scenarioId}-approved-runbook`,
      required: true,
    });
  }

  return artifacts;
};

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

const containsTextDeep = (value: unknown, term: string): boolean => {
  if (typeof value === "string") {
    return value.includes(term);
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsTextDeep(item, term));
  }

  return Object.values(value as Record<string, unknown>).some((item) => containsTextDeep(item, term));
};

const expectLocalizedText = (value: Parameters<typeof getLocalizedText>[0]) => {
  for (const locale of supportedLocales) {
    expect(getLocalizedText(value, locale).trim()).not.toBe("");
  }
};

const expectCoreLocalizedText = (value: Parameters<typeof getLocalizedText>[0]) => {
  for (const locale of ["en-US", "zh-CN", "zh-TW"] as const) {
    expect(getLocalizedText(value, locale).trim()).not.toBe("");
  }
};

describe("Campaign OS domain foundation", () => {
  it("defines activated v0.2 runtime locales with English default and fallback", () => {
    expect(supportedLocales).toEqual(activatedRuntimeLocales);
    expect(defaultLocale).toBe("en-US");
    expect(fallbackLocale).toBe("en-US");
    expect(isSupportedLocale("zh-CN")).toBe(true);
    expect(isSupportedLocale("zh-TW")).toBe(true);
    expect(isSupportedLocale("ja-JP")).toBe(true);
    expect(isSupportedLocale("ko-KR")).toBe(true);
    expect(isSupportedLocale("vi-VN")).toBe(true);
    expect(isSupportedLocale("id-ID")).toBe(true);
    expect(isSupportedLocale("tr-TR")).toBe(true);
    expect(isSupportedLocale("es-ES")).toBe(true);
    expect(isSupportedLocale("fr-FR")).toBe(false);
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
      locale: "ko-KR",
      source: "storage",
    });

    expect(resolveLocalePreference({ storedLocale: "vi-VN" })).toEqual({
      locale: "vi-VN",
      source: "storage",
    });

    expect(resolveLocalePreference({ storedLocale: "id-ID" })).toEqual({
      locale: "id-ID",
      source: "storage",
    });

    expect(resolveLocalePreference({ storedLocale: "tr-TR" })).toEqual({
      locale: "tr-TR",
      source: "storage",
    });

    expect(resolveLocalePreference({ storedLocale: "es-ES" })).toEqual({
      locale: "es-ES",
      source: "storage",
    });
  });

  it("parses localized campaign route paths with all activated P1 runtime locales", () => {
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
      canonicalPath: "/ja-JP/campaigns/awaken-sprint",
      localeSource: "url",
      matched: true,
      unsupportedLocale: null,
      urlLocale: "ja-JP",
    });
    expect(parseCampaignRoutePath("/ko-KR/campaigns/awaken-sprint")).toMatchObject({
      campaignId: "awaken-sprint",
      canonicalPath: "/ko-KR/campaigns/awaken-sprint",
      localeSource: "url",
      matched: true,
      unsupportedLocale: null,
      urlLocale: "ko-KR",
    });
    expect(parseCampaignRoutePath("/vi-VN/campaigns/awaken-sprint")).toMatchObject({
      campaignId: "awaken-sprint",
      canonicalPath: "/vi-VN/campaigns/awaken-sprint",
      localeSource: "url",
      matched: true,
      unsupportedLocale: null,
      urlLocale: "vi-VN",
    });
    expect(parseCampaignRoutePath("/id-ID/campaigns/awaken-sprint")).toMatchObject({
      campaignId: "awaken-sprint",
      canonicalPath: "/id-ID/campaigns/awaken-sprint",
      localeSource: "url",
      matched: true,
      unsupportedLocale: null,
      urlLocale: "id-ID",
    });
    expect(parseCampaignRoutePath("/tr-TR/campaigns/awaken-sprint")).toMatchObject({
      campaignId: "awaken-sprint",
      canonicalPath: "/tr-TR/campaigns/awaken-sprint",
      localeSource: "url",
      matched: true,
      unsupportedLocale: null,
      urlLocale: "tr-TR",
    });
    expect(parseCampaignRoutePath("/es-ES/campaigns/awaken-sprint")).toMatchObject({
      campaignId: "awaken-sprint",
      canonicalPath: "/es-ES/campaigns/awaken-sprint",
      localeSource: "url",
      matched: true,
      unsupportedLocale: null,
      urlLocale: "es-ES",
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

  it("derives translation manager review state for activated runtime locales", () => {
    const translationManager = createTranslationManagerReadModel(campaignDetail);
    const englishPanel = translationManager.panels.find((panel) => panel.locale === "en-US");
    const chinesePanel = translationManager.panels.find((panel) => panel.locale === "zh-CN");
    const traditionalChinesePanel = translationManager.panels.find((panel) => panel.locale === "zh-TW");
    const japanesePanel = translationManager.panels.find((panel) => panel.locale === "ja-JP");
    const vietnamesePanel = translationManager.panels.find((panel) => panel.locale === "vi-VN");
    const indonesianPanel = translationManager.panels.find((panel) => panel.locale === "id-ID");

    expect(translationManager.defaultLocale).toBe("en-US");
    expect(translationManager.fallbackLocale).toBe("en-US");
    expect(translationManager.supportedLocales).toEqual(activatedRuntimeLocales);
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
      expect.objectContaining({
        locale: "ja-JP",
        role: "translation",
        isDefault: false,
        isFallback: false,
        status: "empty",
        publishState: "warning",
        fallbackToEnglish: true,
        humanReviewed: false,
      }),
      expect.objectContaining({
        locale: "ko-KR",
        role: "translation",
        isDefault: false,
        isFallback: false,
        status: "empty",
        publishState: "warning",
        fallbackToEnglish: true,
        humanReviewed: false,
      }),
      expect.objectContaining({
        locale: "vi-VN",
        role: "translation",
        isDefault: false,
        isFallback: false,
        status: "empty",
        publishState: "warning",
        fallbackToEnglish: true,
        humanReviewed: false,
      }),
      expect.objectContaining({
        locale: "id-ID",
        role: "translation",
        isDefault: false,
        isFallback: false,
        status: "empty",
        publishState: "warning",
        fallbackToEnglish: true,
        humanReviewed: false,
      }),
      expect.objectContaining({
        locale: "tr-TR",
        role: "translation",
        isDefault: false,
        isFallback: false,
        status: "empty",
        publishState: "warning",
        fallbackToEnglish: true,
        humanReviewed: false,
      }),
      expect.objectContaining({
        locale: "es-ES",
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
    expect(japanesePanel).toMatchObject({
      locale: "ja-JP",
      sourceLocale: "en-US",
      aiDraft: false,
      fallbackToEnglish: true,
      humanReviewed: false,
      published: false,
      publishState: "warning",
    });
    expect(japanesePanel?.title).toBe("");
    expect(japanesePanel?.nextAction["en-US"]).toContain("English fallback");
    expect(vietnamesePanel).toMatchObject({
      locale: "vi-VN",
      sourceLocale: "en-US",
      aiDraft: false,
      fallbackToEnglish: true,
      humanReviewed: false,
      published: false,
      publishState: "warning",
    });
    expect(vietnamesePanel?.title).toBe("");
    expect(vietnamesePanel?.nextAction["en-US"]).toContain("English fallback");
    expect(indonesianPanel).toMatchObject({
      locale: "id-ID",
      sourceLocale: "en-US",
      aiDraft: false,
      fallbackToEnglish: true,
      humanReviewed: false,
      published: false,
      publishState: "warning",
    });
    expect(indonesianPanel?.title).toBe("");
    expect(indonesianPanel?.nextAction["en-US"]).toContain("English fallback");
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
      expect.objectContaining({
        locale: "ja-JP",
        reviewed: false,
        fallbackToEnglish: true,
        reviewState: "missing",
        blocksPublish: true,
        publishState: "blocker",
      }),
      expect.objectContaining({
        locale: "ko-KR",
        reviewed: false,
        fallbackToEnglish: true,
        reviewState: "missing",
        blocksPublish: true,
        publishState: "blocker",
      }),
      expect.objectContaining({
        locale: "vi-VN",
        reviewed: false,
        fallbackToEnglish: true,
        reviewState: "missing",
        blocksPublish: true,
        publishState: "blocker",
      }),
      expect.objectContaining({
        locale: "id-ID",
        reviewed: false,
        fallbackToEnglish: true,
        reviewState: "missing",
        blocksPublish: true,
        publishState: "blocker",
      }),
      expect.objectContaining({
        locale: "tr-TR",
        reviewed: false,
        fallbackToEnglish: true,
        reviewState: "missing",
        blocksPublish: true,
        publishState: "blocker",
      }),
      expect.objectContaining({
        locale: "es-ES",
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
    expect(workbench.supportedLocales).toEqual(activatedRuntimeLocales);
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
      expectLocalizedText(lane.label);
      expectLocalizedText(lane.sourceEvidence);
      expectLocalizedText(lane.sourceSurface);
      expectLocalizedText(lane.boundary);
      expectLocalizedText(lane.nextAction);
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

  it("builds a deterministic contract claim preapproval package without enabling custody or claim execution", () => {
    const preapproval = createContractClaimPreapprovalPackage(campaignDetail);
    const repeated = createContractClaimPreapprovalPackage(campaignDetail);
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const gatesById = Object.fromEntries(preapproval.gates.map((gate) => [gate.id, gate]));
    const acceptanceRows = adminOps.deliveryAcceptance.solutionSets.flatMap((solutionSet) => solutionSet.rows);
    const claimCustodyAcceptanceRow = acceptanceRows.find(
      (row) => row.id === "v02-contract-claim-reward-custody",
    );
    const requiredGateIds: ContractClaimPreapprovalGateId[] = [
      "security-review",
      "custody-legal-approval",
      "external-audit",
      "admin-approval",
      "contract-reviewer-approval",
      "project-owner-reward-funding",
      "pause-dispute-runbook",
      "no-custody-no-distribution-boundary",
    ];

    expect(repeated).toEqual(preapproval);
    expect(adminOps.contractClaimPreapprovalPackage).toEqual(preapproval);
    expect(preapproval.gates.map((gate) => gate.id)).toEqual(requiredGateIds);
    expect(preapproval.summary).toMatchObject({
      totalGates: preapproval.gates.length,
      readyGates: preapproval.gates.filter((gate) => gate.state === "ready").length,
      reviewRequiredGates: preapproval.gates.filter((gate) => gate.state === "review_required").length,
      blockedGates: preapproval.gates.filter((gate) => gate.state === "blocked").length,
      topGateId: "security-review",
    });
    expect(preapproval.overallState).toBe("blocked");
    expect(preapproval.claimExecutionEnabled).toBe(false);
    expect(preapproval.suggestedFutureBranch).toBe(
      "mission/158-contract-claim-reward-custody-approval-readiness",
    );
    expect(preapproval.suggestedFutureBranch).toMatch(/^mission\//);
    expect(preapproval.suggestedFutureBranch).not.toMatch(/^mission\/(?:main|master)$/);
    expect(preapproval.noContractWrite).toBe(true);
    expect(preapproval.noClaimExecution).toBe(true);
    expect(preapproval.noRewardCustody).toBe(true);
    expect(preapproval.noRewardDistribution).toBe(true);
    expect(preapproval.noBranchAutomation).toBe(true);
    expect(preapproval.noStorageWrite).toBe(true);
    expect(preapproval.noWalletSigning).toBe(true);
    expect(preapproval.noProviderCall).toBe(true);
    expect(preapproval.noExportGeneration).toBe(true);
    expect(preapproval.executionApprovalReadiness.summary).toMatchObject({
      executionApprovalBlocked: true,
      claimExecutionEnabled: false,
      topItemId: "security-approval",
    });
    expect(preapproval.rewardCustodyApprovalReadiness.summary).toMatchObject({
      rewardCustodyApprovalBlocked: true,
      rewardCustodyEnabled: false,
      claimExecutionEnabled: false,
      topItemId: "custody-model",
    });

    expect(gatesById["security-review"]).toMatchObject({
      state: "blocked",
      ownerRole: "contract_reviewer",
      blocksClaimExecution: true,
    });
    expect(gatesById["admin-approval"]).toMatchObject({
      state: "review_required",
      ownerRole: "internal_operator",
    });
    expect(gatesById["no-custody-no-distribution-boundary"]).toMatchObject({
      state: "ready",
      ownerRole: "project_owner",
      blocksClaimExecution: true,
    });
    expect(preapproval.sourceContext.contractTransparency["en-US"]).toContain("reward-custody-claim");
    expect(preapproval.sourceContext.deliveryAcceptance["en-US"]).toContain("deferred");
    expect(preapproval.sourceContext.exportCloseout["en-US"]).toContain("Export");
    expect(preapproval.boundary["en-US"]).toContain("Contract write");
    expect(preapproval.boundary["en-US"]).toContain("claim execution");
    expect(preapproval.boundary["en-US"]).toContain("reward custody");
    expect(preapproval.boundary["en-US"]).toContain("reward distribution");

    expect(claimCustodyAcceptanceRow).toMatchObject({
      status: "deferred",
      launchBlocking: false,
    });
    expect(adminOps.deliveryAcceptance.topResidualGaps.map((row) => row.id)).not.toContain(
      "v02-contract-claim-reward-custody",
    );
    expect(adminOps.residualGapMissionQueue.items.find(
      (item) => item.sourceRowId === "v02-contract-claim-reward-custody",
    )).toMatchObject({
      status: "backlog",
      launchBlocking: false,
      suggestedMissionTitle: {
        "en-US": "Contract claim Reward Custody Approval Readiness mission",
      },
    });
    const contractClaimResidual = adminOps.residualGapMissionQueue.items.find(
      (item) => item.sourceRowId === "v02-contract-claim-reward-custody",
    );
    expect(contractClaimResidual?.dependency["en-US"]).toContain("Reward Custody Approval Readiness");
    expect(contractClaimResidual?.dependency["en-US"]).toContain("custody-model");
    expect(contractClaimResidual?.evidenceNeeded["en-US"]).toContain("Reward Custody Approval Readiness evidence");
    expect(contractClaimResidual?.boundary["en-US"]).toContain("Reward Custody Approval Readiness boundary");
    expect(contractClaimResidual?.evidenceNeeded["en-US"]).toContain("Reward custody approval is not granted");
    expect(contractClaimResidual?.evidenceNeeded["en-US"]).not.toContain("claimExecutionEnabled=true");

    for (const gate of preapproval.gates) {
      expectCoreLocalizedText(gate.label);
      expectCoreLocalizedText(gate.evidenceNeeded);
      expectCoreLocalizedText(gate.nextAction);
    }

    for (const unsafeKey of [
      "privateKey",
      "signature",
      "transactionId",
      "contractRoot",
      "downloadUrl",
      "storageUrl",
    ]) {
      expect(hasOwnKeyDeep(preapproval, unsafeKey)).toBe(false);
      expect(JSON.stringify(preapproval)).not.toContain(`"${unsafeKey}"`);
    }
  });

  it("derives contract claim security review readiness without approving claim execution", () => {
    const readiness = createContractClaimSecurityReviewReadiness(campaignDetail);
    const repeated = createContractClaimSecurityReviewReadiness(campaignDetail);
    const preapproval = createContractClaimPreapprovalPackage(campaignDetail);
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const securityGate = preapproval.gates.find((gate) => gate.id === "security-review");
    const itemsById = Object.fromEntries(readiness.items.map((item) => [item.id, item]));
    const requiredItemIds: ContractClaimSecurityReviewItemId[] = [
      "claim-threat-model",
      "eligibility-proof-handling",
      "pause-dispute-semantics",
      "rollback-behavior",
      "double-claim-replay-prevention",
      "role-access-review",
      "external-audit-handoff",
      "no-custody-no-distribution-boundary",
    ];

    expect(repeated).toEqual(readiness);
    expect(preapproval.securityReviewReadiness.items.map((item) => item.id)).toEqual(requiredItemIds);
    expect(adminOps.contractClaimPreapprovalPackage.securityReviewReadiness).toEqual(preapproval.securityReviewReadiness);
    expect(readiness.campaignId).toBe(campaignDetail.id);
    expect(readiness.items.map((item) => item.id)).toEqual(requiredItemIds);
    expect(readiness.summary).toMatchObject({
      totalItems: readiness.items.length,
      readyItems: readiness.items.filter((item) => item.state === "ready").length,
      reviewRequiredItems: readiness.items.filter((item) => item.state === "review_required").length,
      blockedItems: readiness.items.filter((item) => item.state === "blocked").length,
      approvalBlocked: true,
      topItemId: "claim-threat-model",
    });
    expect(readiness.nextAction).toEqual(readiness.summary.topNextAction);
    expect(readiness.boundary["en-US"]).toContain("No contract write");
    expect(readiness.boundary["en-US"]).toContain("claim execution");
    expect(readiness.boundary["en-US"]).toContain("reward custody");
    expect(readiness.boundary["en-US"]).toContain("reward distribution");

    expect(itemsById["claim-threat-model"]).toMatchObject({
      state: "blocked",
      ownerRole: "contract_reviewer",
      blocksApproval: true,
    });
    expect(itemsById["claim-threat-model"]?.evidenceNeeded["en-US"]).toContain("threat model");
    expect(preapproval.securityReviewReadiness.items.find(
      (item) => item.id === "claim-threat-model",
    )?.evidenceNeeded["en-US"]).toContain("Threat Model Approval Readiness");
    expect(preapproval.securityReviewReadiness.items.find(
      (item) => item.id === "claim-threat-model",
    )?.nextAction).toEqual(preapproval.threatModelApprovalReadiness.summary.topNextAction);
    expect(itemsById["eligibility-proof-handling"]?.evidenceNeeded["en-US"]).toContain("eligibility proof");
    expect(itemsById["pause-dispute-semantics"]?.dependency["en-US"]).toContain("Pause");
    expect(itemsById["rollback-behavior"]?.nextAction["en-US"]).toContain("rollback");
    expect(itemsById["double-claim-replay-prevention"]?.evidenceNeeded["en-US"]).toContain("replay");
    expect(itemsById["role-access-review"]?.sourceSurface["en-US"]).toContain("Admin Contract Review Center");
    expect(itemsById["external-audit-handoff"]?.state).toBe("blocked");
    expect(itemsById["no-custody-no-distribution-boundary"]).toMatchObject({
      state: "ready",
      ownerRole: "project_owner",
      blocksApproval: true,
    });

    expect(securityGate).toMatchObject({
      state: "blocked",
      ownerRole: "contract_reviewer",
      blocksClaimExecution: true,
    });
    expect(securityGate?.evidenceNeeded["en-US"]).toContain("Security Review Readiness");
    expect(securityGate?.evidenceNeeded["en-US"]).toContain("claim-threat-model");
    expect(securityGate?.nextAction).toEqual(readiness.summary.topNextAction);

    expect(preapproval.claimExecutionEnabled).toBe(false);
    expect(preapproval.noContractWrite).toBe(true);
    expect(preapproval.noClaimExecution).toBe(true);
    expect(preapproval.noRewardCustody).toBe(true);
    expect(preapproval.noRewardDistribution).toBe(true);

    for (const item of readiness.items) {
      expectCoreLocalizedText(item.label);
      expectCoreLocalizedText(item.dependency);
      expectCoreLocalizedText(item.evidenceNeeded);
      expectCoreLocalizedText(item.nextAction);
      expectCoreLocalizedText(item.sourceSurface);
      expectCoreLocalizedText(item.boundary);
    }

    for (const unsafeKey of [
      "privateKey",
      "signature",
      "transactionId",
      "contractRoot",
      "downloadUrl",
      "storageUrl",
    ]) {
      expect(hasOwnKeyDeep(readiness, unsafeKey)).toBe(false);
      expect(JSON.stringify(readiness)).not.toContain(`"${unsafeKey}"`);
    }
  });

  it("derives contract claim threat model approval readiness without approving execution", () => {
    const preapproval = createContractClaimPreapprovalPackage(campaignDetail);
    const repeated = createContractClaimPreapprovalPackage(campaignDetail).threatModelApprovalReadiness;
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const readiness = preapproval.threatModelApprovalReadiness;
    const sectionsById = Object.fromEntries(readiness.sections.map((section) => [section.id, section]));
    const claimThreatModelItem = preapproval.securityReviewReadiness.items.find(
      (item) => item.id === "claim-threat-model",
    );
    const requiredSectionIds: ContractClaimThreatModelSectionId[] = [
      "claim-actors",
      "protected-assets",
      "claim-entry-points",
      "trust-boundaries",
      "eligibility-proof-abuse",
      "duplicate-claim-abuse",
      "pause-dispute-abuse",
      "rollback-failure-abuse",
      "mitigation-coverage",
      "residual-risk-acceptance",
      "approval-evidence",
      "no-custody-no-distribution-boundary",
    ];

    expect(repeated).toEqual(readiness);
    expect(adminOps.contractClaimPreapprovalPackage.threatModelApprovalReadiness).toEqual(readiness);
    expect(readiness.campaignId).toBe(campaignDetail.id);
    expect(readiness.sections.map((section) => section.id)).toEqual(requiredSectionIds);
    expect(readiness.summary).toMatchObject({
      totalSections: readiness.sections.length,
      readySections: readiness.sections.filter((section) => section.state === "ready").length,
      reviewRequiredSections: readiness.sections.filter((section) => section.state === "review_required").length,
      blockedSections: readiness.sections.filter((section) => section.state === "blocked").length,
      approvalBlocked: true,
      threatModelApproved: false,
      claimExecutionEnabled: false,
      residualRiskLevel: "high",
      topSectionId: "claim-actors",
    });
    expect(readiness.nextAction).toEqual(readiness.summary.topNextAction);

    expect(sectionsById["claim-actors"]).toMatchObject({
      state: "blocked",
      ownerRole: "contract_reviewer",
      riskLevel: "high",
      blocksThreatModelApproval: true,
    });
    expect(sectionsById["claim-actors"]?.evidenceRequired["en-US"]).toContain("Actor Approval Readiness");
    expect(sectionsById["claim-actors"]?.evidenceRequired["en-US"]).toContain("participant");
    expect(sectionsById["claim-actors"]?.reviewQuestion["en-US"]).toContain("bypass eligibility");
    expect(sectionsById["duplicate-claim-abuse"]).toMatchObject({
      state: "blocked",
      riskLevel: "high",
    });
    expect(sectionsById["duplicate-claim-abuse"]?.evidenceRequired["en-US"]).toContain("replay");
    expect(sectionsById["no-custody-no-distribution-boundary"]).toMatchObject({
      state: "ready",
      ownerRole: "project_owner",
      riskLevel: "low",
      blocksThreatModelApproval: true,
    });
    expect(sectionsById["no-custody-no-distribution-boundary"]?.residualRisk["en-US"]).toContain(
      "does not approve threat model or claim execution",
    );

    expect(claimThreatModelItem).toMatchObject({
      state: "blocked",
      ownerRole: "contract_reviewer",
      sourceSurface: {
        "en-US": "Threat Model Approval Readiness",
      },
      blocksApproval: true,
    });
    expect(claimThreatModelItem?.evidenceNeeded["en-US"]).toContain("Threat Model Approval Readiness");
    expect(claimThreatModelItem?.evidenceNeeded["en-US"]).toContain("claim-actors");
    expect(claimThreatModelItem?.nextAction).toEqual(readiness.summary.topNextAction);

    expect(preapproval.securityReviewReadiness.summary).toMatchObject({
      approvalBlocked: true,
      topItemId: "claim-threat-model",
    });
    expect(preapproval.executionApprovalReadiness.summary).toMatchObject({
      executionApprovalBlocked: true,
      claimExecutionEnabled: false,
      topItemId: "security-approval",
    });
    expect(readiness.threatModelApproved).toBe(false);
    expect(readiness.claimExecutionEnabled).toBe(false);
    expect(readiness.noContractWrite).toBe(true);
    expect(readiness.noClaimExecution).toBe(true);
    expect(readiness.noWalletSigning).toBe(true);
    expect(readiness.noProviderCall).toBe(true);
    expect(readiness.noStorageWrite).toBe(true);
    expect(readiness.noExportGeneration).toBe(true);
    expect(readiness.noRewardCustody).toBe(true);
    expect(readiness.noRewardDistribution).toBe(true);
    expect(readiness.noBranchAutomation).toBe(true);
    expect(readiness.noIssueAutomation).toBe(true);
    expect(readiness.noPrAutomation).toBe(true);
    expect(readiness.noMissionAutomation).toBe(true);
    expect(readiness.boundary["en-US"]).toContain("Threat model approval remains blocked");
    expect(readiness.boundary["en-US"]).toContain("no contract write");
    expect(readiness.boundary["en-US"]).toContain("reward custody");
    expect(readiness.sourceContext.executionApproval["en-US"]).toContain("Execution approval remains blocked");
    expect(readiness.sourceContext.contractTransparency["en-US"]).toContain("reward-custody-claim");

    for (const section of readiness.sections) {
      expectCoreLocalizedText(section.label);
      expectCoreLocalizedText(section.dependency);
      expectCoreLocalizedText(section.evidenceRequired);
      expectCoreLocalizedText(section.reviewQuestion);
      expectCoreLocalizedText(section.mitigation);
      expectCoreLocalizedText(section.residualRisk);
      expectCoreLocalizedText(section.nextAction);
      expectCoreLocalizedText(section.sourceSurface);
      expectCoreLocalizedText(section.boundary);
    }

    for (const unsafeKey of [
      "privateKey",
      "signature",
      "transactionId",
      "contractRoot",
      "downloadUrl",
      "storageUrl",
    ]) {
      expect(hasOwnKeyDeep(readiness, unsafeKey)).toBe(false);
      expect(JSON.stringify(readiness)).not.toContain(`"${unsafeKey}"`);
    }
  });

  it("derives contract claim actor approval readiness without granting actor approval", () => {
    const preapproval = createContractClaimPreapprovalPackage(campaignDetail);
    const repeated = createContractClaimPreapprovalPackage(campaignDetail).actorApprovalReadiness;
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const readiness = preapproval.actorApprovalReadiness;
    const actorsById = Object.fromEntries(readiness.actors.map((actor) => [actor.id, actor]));
    const claimActorsSection = preapproval.threatModelApprovalReadiness.sections.find(
      (section) => section.id === "claim-actors",
    );
    const requiredActorIds: ContractClaimActorApprovalRowId[] = [
      "participant",
      "project-owner",
      "admin",
      "contract-reviewer",
      "verifier",
      "exporter",
      "pauser",
      "external-auditor",
      "no-custody-no-distribution-boundary",
    ];

    expect(repeated).toEqual(readiness);
    expect(adminOps.contractClaimPreapprovalPackage.actorApprovalReadiness).toEqual(readiness);
    expect(readiness.campaignId).toBe(campaignDetail.id);
    expect(readiness.actors.map((actor) => actor.id)).toEqual(requiredActorIds);
    expect(new Set(readiness.actors.map((actor) => actor.id)).size).toBe(requiredActorIds.length);
    expect(readiness.participantApprovalReadiness.summary).toMatchObject({
      approvalBlocked: true,
      participantApprovalGranted: false,
      claimExecutionEnabled: false,
      topCheckId: "eligibility-lineage",
    });
    expect(readiness.summary).toMatchObject({
      totalActors: readiness.actors.length,
      readyActors: readiness.actors.filter((actor) => actor.state === "ready").length,
      reviewRequiredActors: readiness.actors.filter((actor) => actor.state === "review_required").length,
      blockedActors: readiness.actors.filter((actor) => actor.state === "blocked").length,
      approvalBlocked: true,
      actorApprovalGranted: false,
      claimExecutionEnabled: false,
      highestRiskLevel: "high",
      topActorId: "participant",
    });
    expect(readiness.nextAction).toEqual(readiness.summary.topNextAction);

    expect(actorsById.participant).toMatchObject({
      state: "blocked",
      ownerRole: "contract_reviewer",
      riskLevel: "high",
      blocksActorApproval: true,
    });
    expect(actorsById.participant?.responsibility["en-US"]).toContain("future claimant");
    expect(actorsById.participant?.authorityBoundary["en-US"]).toContain("no Campaign OS claim execution");
    expect(actorsById.participant?.abusePath["en-US"]).toContain("bypass eligibility");
    expect(actorsById.participant?.residualRisk["en-US"]).toContain("Participant Approval Readiness");
    expect(actorsById.participant?.sourceSurface["en-US"]).toBe("Participant Approval Readiness");
    expect(actorsById.participant?.nextAction).toEqual(readiness.summary.topNextAction);
    expect(actorsById["project-owner"]?.responsibility["en-US"]).toContain("funds rewards");
    expect(actorsById["contract-reviewer"]?.evidenceRequired["en-US"]).toContain("audit status");
    expect(actorsById.verifier?.authorityBoundary["en-US"]).toContain("cannot write roots");
    expect(actorsById.exporter?.authorityBoundary["en-US"]).toContain("no export generation");
    expect(actorsById.pauser?.abusePath["en-US"]).toContain("block valid participants");
    expect(actorsById["external-auditor"]?.residualRisk["en-US"]).toContain("Audit handoff");
    expect(actorsById["no-custody-no-distribution-boundary"]).toMatchObject({
      state: "ready",
      ownerRole: "project_owner",
      riskLevel: "low",
      blocksActorApproval: true,
    });
    expect(actorsById["no-custody-no-distribution-boundary"]?.residualRisk["en-US"]).toContain(
      "does not approve actors",
    );

    expect(claimActorsSection).toMatchObject({
      state: "blocked",
      sourceSurface: {
        "en-US": "Actor Approval Readiness",
      },
      blocksThreatModelApproval: true,
    });
    expect(claimActorsSection?.evidenceRequired["en-US"]).toContain("Actor Approval Readiness");
    expect(claimActorsSection?.evidenceRequired["en-US"]).toContain("participant");
    expect(claimActorsSection?.nextAction).toEqual(readiness.summary.topNextAction);

    expect(preapproval.securityReviewReadiness.summary).toMatchObject({
      approvalBlocked: true,
      topItemId: "claim-threat-model",
    });
    expect(preapproval.threatModelApprovalReadiness.summary).toMatchObject({
      approvalBlocked: true,
      threatModelApproved: false,
      claimExecutionEnabled: false,
      topSectionId: "claim-actors",
    });
    expect(preapproval.executionApprovalReadiness.summary).toMatchObject({
      executionApprovalBlocked: true,
      claimExecutionEnabled: false,
      topItemId: "security-approval",
    });
    expect(readiness.actorApprovalGranted).toBe(false);
    expect(readiness.claimExecutionEnabled).toBe(false);
    expect(readiness.noContractWrite).toBe(true);
    expect(readiness.noClaimExecution).toBe(true);
    expect(readiness.noWalletSigning).toBe(true);
    expect(readiness.noProviderCall).toBe(true);
    expect(readiness.noStorageWrite).toBe(true);
    expect(readiness.noExportGeneration).toBe(true);
    expect(readiness.noRewardCustody).toBe(true);
    expect(readiness.noRewardDistribution).toBe(true);
    expect(readiness.noBranchAutomation).toBe(true);
    expect(readiness.noIssueAutomation).toBe(true);
    expect(readiness.noPrAutomation).toBe(true);
    expect(readiness.noMissionAutomation).toBe(true);
    expect(preapproval.noIssueAutomation).toBe(true);
    expect(preapproval.noPrAutomation).toBe(true);
    expect(preapproval.noMissionAutomation).toBe(true);
    expect(readiness.boundary["en-US"]).toContain("Actor approval remains blocked");
    expect(readiness.boundary["en-US"]).toContain("no contract write");
    expect(readiness.boundary["en-US"]).toContain("reward custody");
    expect(readiness.sourceContext.threatModelApproval["en-US"]).toContain("claim-actors");
    expect(readiness.sourceContext.executionApproval["en-US"]).toContain("Execution Approval Readiness remains blocked");

    for (const actor of readiness.actors) {
      expectCoreLocalizedText(actor.label);
      expectCoreLocalizedText(actor.responsibility);
      expectCoreLocalizedText(actor.authorityBoundary);
      expectCoreLocalizedText(actor.abusePath);
      expectCoreLocalizedText(actor.evidenceRequired);
      expectCoreLocalizedText(actor.residualRisk);
      expectCoreLocalizedText(actor.nextAction);
      expectCoreLocalizedText(actor.sourceSurface);
    }

    for (const unsafeKey of [
      "privateKey",
      "signature",
      "transactionId",
      "contractRoot",
      "downloadUrl",
      "storageUrl",
    ]) {
      expect(hasOwnKeyDeep(readiness, unsafeKey)).toBe(false);
      expect(JSON.stringify(readiness)).not.toContain(`"${unsafeKey}"`);
    }
  });

  it("derives contract claim participant approval readiness without granting participant approval", () => {
    const preapproval = createContractClaimPreapprovalPackage(campaignDetail);
    const repeated = createContractClaimPreapprovalPackage(campaignDetail)
      .actorApprovalReadiness.participantApprovalReadiness;
    const readiness = preapproval.actorApprovalReadiness.participantApprovalReadiness;
    const eligibilityLineageReadiness = readiness.eligibilityLineageApprovalReadiness;
    const participantActor = preapproval.actorApprovalReadiness.actors.find((actor) => actor.id === "participant");
    const checkIds: ContractClaimParticipantApprovalCheckId[] = [
      "eligibility-lineage",
      "wallet-account-binding",
      "proof-replay-prevention",
      "duplicate-claim-prevention",
      "dispute-manual-review",
      "payout-pressure-boundary",
      "claimant-communication",
      "no-custody-no-distribution-boundary",
    ];
    const checksById = Object.fromEntries(readiness.checks.map((check) => [check.id, check]));
    const eligibilityLineageRowIds: ContractClaimEligibilityLineageRowId[] = [
      "participant-eligibility-source",
      "exported-list-lineage",
      "task-evidence-linkage",
      "wallet-account-lineage",
      "risk-review-lineage",
      "claim-proof-source",
      "stale-export-prevention",
      "no-custody-no-distribution-boundary",
    ];
    const eligibilityLineageRowsById = Object.fromEntries(
      eligibilityLineageReadiness.rows.map((row) => [row.id, row]),
    );

    expect(repeated).toEqual(readiness);
    expect(readiness.campaignId).toBe(campaignDetail.id);
    expect(readiness.checks.map((check) => check.id)).toEqual(checkIds);
    expect(new Set(readiness.checks.map((check) => check.id)).size).toBe(checkIds.length);
    expect(eligibilityLineageReadiness.campaignId).toBe(campaignDetail.id);
    expect(eligibilityLineageReadiness.rows.map((row) => row.id)).toEqual(eligibilityLineageRowIds);
    expect(new Set(eligibilityLineageReadiness.rows.map((row) => row.id)).size).toBe(
      eligibilityLineageRowIds.length,
    );
    expect(eligibilityLineageReadiness.summary).toMatchObject({
      totalRows: 8,
      readyRows: 1,
      reviewRequiredRows: 2,
      blockedRows: 5,
      approvalBlocked: true,
      eligibilityLineageApproved: false,
      participantApprovalGranted: false,
      claimExecutionEnabled: false,
      topRowId: "participant-eligibility-source",
      highestRiskLevel: "high",
    });
    expect(eligibilityLineageReadiness.nextAction).toEqual(eligibilityLineageReadiness.summary.topNextAction);
    expect(eligibilityLineageReadiness.summary.topNextAction).toEqual(
      eligibilityLineageRowsById["participant-eligibility-source"]?.nextAction,
    );
    expect(eligibilityLineageRowsById["participant-eligibility-source"]).toMatchObject({
      state: "blocked",
      ownerRole: "contract_reviewer",
      riskLevel: "high",
      blocksEligibilityLineageApproval: true,
    });
    expect(eligibilityLineageRowsById["exported-list-lineage"]?.lineageGap["en-US"]).toContain(
      "claim eligibility",
    );
    expect(eligibilityLineageRowsById["task-evidence-linkage"]?.lineageGap["en-US"]).toContain(
      "claim proof",
    );
    expect(eligibilityLineageRowsById["wallet-account-lineage"]).toMatchObject({
      state: "review_required",
      ownerRole: "internal_operator",
      riskLevel: "medium",
    });
    expect(eligibilityLineageRowsById["risk-review-lineage"]).toMatchObject({
      state: "review_required",
      ownerRole: "internal_operator",
      riskLevel: "medium",
    });
    expect(eligibilityLineageRowsById["claim-proof-source"]?.lineageGap["en-US"]).toContain("proof");
    expect(eligibilityLineageRowsById["stale-export-prevention"]?.residualRisk["en-US"]).toContain(
      "stale exported list",
    );
    expect(eligibilityLineageRowsById["no-custody-no-distribution-boundary"]).toMatchObject({
      state: "ready",
      ownerRole: "project_owner",
      riskLevel: "low",
      blocksEligibilityLineageApproval: true,
    });
    expect(eligibilityLineageReadiness.boundary["en-US"]).toContain(
      "Eligibility lineage approval and participant approval remain blocked",
    );
    expect(eligibilityLineageReadiness.sourceContext.participantApproval["en-US"]).toContain("eligibility-lineage");
    expect(eligibilityLineageReadiness.sourceContext.participantOperations["en-US"]).toContain(
      "Participant Operations",
    );
    expect(eligibilityLineageReadiness.sourceContext.exportReadiness["en-US"]).toContain(
      "Export Confirmation Readiness",
    );
    expect(eligibilityLineageReadiness.sourceContext.securityReview["en-US"]).toContain(
      "Security Review Readiness",
    );
    expect(eligibilityLineageReadiness.sourceContext.threatModelApproval["en-US"]).toContain(
      "Threat Model Approval Readiness",
    );
    expect(eligibilityLineageReadiness.sourceContext.contractTransparency["en-US"]).toContain(
      "Contract transparency",
    );
    expect(readiness.summary).toMatchObject({
      totalChecks: readiness.checks.length,
      readyChecks: readiness.checks.filter((check) => check.state === "ready").length,
      reviewRequiredChecks: readiness.checks.filter((check) => check.state === "review_required").length,
      blockedChecks: readiness.checks.filter((check) => check.state === "blocked").length,
      approvalBlocked: true,
      participantApprovalGranted: false,
      claimExecutionEnabled: false,
      topCheckId: "eligibility-lineage",
      highestRiskLevel: "high",
    });
    expect(readiness.nextAction).toEqual(readiness.summary.topNextAction);
    expect(readiness.summary.topNextAction).toEqual(checksById["eligibility-lineage"]?.nextAction);
    expect(checksById["eligibility-lineage"]).toMatchObject({
      state: "blocked",
      ownerRole: "contract_reviewer",
      riskLevel: "high",
      blocksParticipantApproval: true,
    });
    expect(checksById["eligibility-lineage"]?.abusePath["en-US"]).toContain("bypass eligibility");
    expect(checksById["eligibility-lineage"]?.sourceSurface["en-US"]).toContain(
      "Eligibility Lineage Approval Readiness",
    );
    expect(checksById["eligibility-lineage"]?.nextAction).toEqual(
      eligibilityLineageReadiness.summary.topNextAction,
    );
    expect(checksById["eligibility-lineage"]?.evidenceRequired).toEqual(
      eligibilityLineageRowsById["participant-eligibility-source"]?.evidenceRequired,
    );
    expect(checksById["wallet-account-binding"]).toMatchObject({
      state: "review_required",
      ownerRole: "internal_operator",
      riskLevel: "medium",
      blocksParticipantApproval: true,
    });
    expect(checksById["proof-replay-prevention"]?.abusePath["en-US"]).toContain("reuse proof");
    expect(checksById["duplicate-claim-prevention"]?.residualRisk["en-US"]).toContain("Duplicate-claim");
    expect(checksById["dispute-manual-review"]?.nextAction["en-US"]).not.toHaveLength(0);
    expect(checksById["payout-pressure-boundary"]?.abusePath["en-US"]).toContain("payout");
    expect(checksById["claimant-communication"]?.residualRisk["en-US"]).toContain("non-live boundary");
    expect(checksById["no-custody-no-distribution-boundary"]).toMatchObject({
      state: "ready",
      ownerRole: "project_owner",
      riskLevel: "low",
      blocksParticipantApproval: true,
    });
    expect(checksById["no-custody-no-distribution-boundary"]?.residualRisk["en-US"]).toContain(
      "does not approve participants",
    );
    expect(readiness.boundary["en-US"]).toContain("Participant approval remains blocked");
    expect(readiness.boundary["zh-CN"]).toContain("参与者批准保持阻断");
    expect(readiness.boundary["zh-TW"]).toContain("參與者批准保持阻斷");
    expect(readiness.sourceContext.actorApproval["en-US"]).toContain("participant");
    expect(readiness.sourceContext.participantOperations["en-US"]).toContain("Participant Operations");
    expect(readiness.sourceContext.executionApproval["en-US"]).toContain("Execution Approval Readiness remains blocked");
    expect(participantActor?.sourceSurface["en-US"]).toBe("Participant Approval Readiness");
    expect(participantActor?.nextAction).toEqual(readiness.summary.topNextAction);
    expect(preapproval.actorApprovalReadiness.summary).toMatchObject({
      approvalBlocked: true,
      actorApprovalGranted: false,
      claimExecutionEnabled: false,
      topActorId: "participant",
    });
    expect(preapproval.threatModelApprovalReadiness.summary).toMatchObject({
      approvalBlocked: true,
      threatModelApproved: false,
      claimExecutionEnabled: false,
    });
    expect(preapproval.securityReviewReadiness.summary.approvalBlocked).toBe(true);
    expect(preapproval.executionApprovalReadiness.summary).toMatchObject({
      executionApprovalBlocked: true,
      claimExecutionEnabled: false,
    });
    expect(readiness.participantApprovalGranted).toBe(false);
    expect(readiness.claimExecutionEnabled).toBe(false);
    expect(readiness.noContractWrite).toBe(true);
    expect(readiness.noClaimExecution).toBe(true);
    expect(readiness.noWalletSigning).toBe(true);
    expect(readiness.noProviderCall).toBe(true);
    expect(readiness.noStorageWrite).toBe(true);
    expect(readiness.noExportGeneration).toBe(true);
    expect(readiness.noRewardCustody).toBe(true);
    expect(readiness.noRewardDistribution).toBe(true);
    expect(readiness.noBranchAutomation).toBe(true);
    expect(readiness.noIssueAutomation).toBe(true);
    expect(readiness.noPrAutomation).toBe(true);
    expect(readiness.noMissionAutomation).toBe(true);
    expect(eligibilityLineageReadiness.eligibilityLineageApproved).toBe(false);
    expect(eligibilityLineageReadiness.participantApprovalGranted).toBe(false);
    expect(eligibilityLineageReadiness.claimExecutionEnabled).toBe(false);
    expect(eligibilityLineageReadiness.noContractWrite).toBe(true);
    expect(eligibilityLineageReadiness.noClaimExecution).toBe(true);
    expect(eligibilityLineageReadiness.noWalletSigning).toBe(true);
    expect(eligibilityLineageReadiness.noProviderCall).toBe(true);
    expect(eligibilityLineageReadiness.noStorageWrite).toBe(true);
    expect(eligibilityLineageReadiness.noExportGeneration).toBe(true);
    expect(eligibilityLineageReadiness.noRewardCustody).toBe(true);
    expect(eligibilityLineageReadiness.noRewardDistribution).toBe(true);
    expect(eligibilityLineageReadiness.noBranchAutomation).toBe(true);
    expect(eligibilityLineageReadiness.noIssueAutomation).toBe(true);
    expect(eligibilityLineageReadiness.noPrAutomation).toBe(true);
    expect(eligibilityLineageReadiness.noMissionAutomation).toBe(true);

    for (const row of eligibilityLineageReadiness.rows) {
      expectCoreLocalizedText(row.label);
      expectCoreLocalizedText(row.dependency);
      expectCoreLocalizedText(row.evidenceRequired);
      expectCoreLocalizedText(row.lineageGap);
      expectCoreLocalizedText(row.residualRisk);
      expectCoreLocalizedText(row.nextAction);
      expectCoreLocalizedText(row.sourceSurface);
    }

    for (const unsafeKey of [
      "privateKey",
      "signature",
      "transactionId",
      "contractRoot",
      "downloadUrl",
      "storageUrl",
    ]) {
      expect(hasOwnKeyDeep(eligibilityLineageReadiness, unsafeKey)).toBe(false);
      expect(JSON.stringify(eligibilityLineageReadiness)).not.toContain(`"${unsafeKey}"`);
    }

    for (const check of readiness.checks) {
      expectCoreLocalizedText(check.label);
      expectCoreLocalizedText(check.dependency);
      expectCoreLocalizedText(check.evidenceRequired);
      expectCoreLocalizedText(check.abusePath);
      expectCoreLocalizedText(check.residualRisk);
      expectCoreLocalizedText(check.nextAction);
      expectCoreLocalizedText(check.sourceSurface);
    }

    for (const unsafeKey of [
      "privateKey",
      "signature",
      "transactionId",
      "contractRoot",
      "downloadUrl",
      "storageUrl",
    ]) {
      expect(hasOwnKeyDeep(readiness, unsafeKey)).toBe(false);
      expect(JSON.stringify(readiness)).not.toContain(`"${unsafeKey}"`);
    }
  });

  it("derives contract claim admin approval readiness without approving claim mode", () => {
    const preapproval = createContractClaimPreapprovalPackage(campaignDetail);
    const readiness = preapproval.adminApprovalReadiness;
    const repeated = createContractClaimPreapprovalPackage(campaignDetail).adminApprovalReadiness;
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const directReadiness = createContractClaimAdminApprovalReadiness({
      campaign: campaignDetail,
      deliveryAcceptance: adminOps.deliveryAcceptance,
      gates: preapproval.gates,
      securityReviewReadiness: preapproval.securityReviewReadiness,
      sourceContext: preapproval.sourceContext,
      transparency: adminOps.contractTransparencyMonitor,
    });
    const itemsById = Object.fromEntries(readiness.items.map((item) => [item.id, item]));
    const requiredItemIds: ContractClaimAdminApprovalItemId[] = [
      "security-readiness-approval",
      "admin-approval",
      "contract-reviewer-approval",
      "custody-legal-approval",
      "external-audit-approval",
      "project-owner-funding-approval",
      "pause-dispute-runbook-approval",
      "no-custody-no-distribution-boundary",
    ];

    expect(repeated).toEqual(readiness);
    expect(directReadiness).toEqual(readiness);
    expect(adminOps.contractClaimPreapprovalPackage.adminApprovalReadiness).toEqual(readiness);
    expect(preapproval.adminApprovalReadiness).toEqual(readiness);
    expect(readiness.campaignId).toBe(campaignDetail.id);
    expect(readiness.items.map((item) => item.id)).toEqual(requiredItemIds);
    expect(readiness.summary).toMatchObject({
      totalItems: readiness.items.length,
      readyItems: readiness.items.filter((item) => item.state === "ready").length,
      reviewRequiredItems: readiness.items.filter((item) => item.state === "review_required").length,
      blockedItems: readiness.items.filter((item) => item.state === "blocked").length,
      claimModeApprovalBlocked: true,
      topItemId: "security-readiness-approval",
    });
    expect(readiness.nextAction).toEqual(readiness.summary.topNextAction);

    expect(itemsById["security-readiness-approval"]).toMatchObject({
      state: "blocked",
      approverRole: "contract_reviewer",
      sourceGateId: "security-review",
      blocksClaimMode: true,
    });
    expect(itemsById["admin-approval"]).toMatchObject({
      state: "review_required",
      approverRole: "internal_operator",
      sourceGateId: "admin-approval",
      blocksClaimMode: true,
    });
    expect(itemsById["contract-reviewer-approval"]).toMatchObject({
      state: "blocked",
      approverRole: "contract_reviewer",
      sourceGateId: "contract-reviewer-approval",
      blocksClaimMode: true,
    });
    expect(itemsById["custody-legal-approval"]?.blockingReason["en-US"]).toContain("Custody and legal");
    expect(itemsById["external-audit-approval"]?.blockingReason["en-US"]).toContain("External audit");
    expect(itemsById["project-owner-funding-approval"]?.dependency["en-US"]).toContain("Project owner");
    expect(itemsById["pause-dispute-runbook-approval"]?.nextAction["en-US"]).toContain("runbook");
    expect(itemsById["no-custody-no-distribution-boundary"]).toMatchObject({
      state: "ready",
      approverRole: "project_owner",
      sourceGateId: "no-custody-no-distribution-boundary",
      blocksClaimMode: true,
    });

    expect(readiness.claimModeApproved).toBe(false);
    expect(readiness.claimExecutionEnabled).toBe(false);
    expect(readiness.noContractWrite).toBe(true);
    expect(readiness.noClaimExecution).toBe(true);
    expect(readiness.noRewardCustody).toBe(true);
    expect(readiness.noRewardDistribution).toBe(true);
    expect(readiness.noStorageWrite).toBe(true);
    expect(readiness.noBranchAutomation).toBe(true);
    expect(readiness.boundary["en-US"]).toContain("Claim mode is not approved");
    expect(readiness.boundary["en-US"]).toContain("no contract write");
    expect(readiness.boundary["en-US"]).toContain("reward custody");
    expect(readiness.sourceContext.securityReview["en-US"]).toContain("approvalBlocked=true");
    expect(readiness.sourceContext.contractTransparency["en-US"]).toContain("reward-custody-claim");
    expect(preapproval.claimExecutionEnabled).toBe(false);
    expect(preapproval.noContractWrite).toBe(true);
    expect(preapproval.noClaimExecution).toBe(true);
    expect(preapproval.noRewardCustody).toBe(true);
    expect(preapproval.noRewardDistribution).toBe(true);

    for (const item of readiness.items) {
      expectCoreLocalizedText(item.label);
      expectCoreLocalizedText(item.dependency);
      expectCoreLocalizedText(item.evidenceRequired);
      expectCoreLocalizedText(item.blockingReason);
      expectCoreLocalizedText(item.nextAction);
      expectCoreLocalizedText(item.sourceSurface);
      expectCoreLocalizedText(item.boundary);
    }

    for (const unsafeKey of [
      "privateKey",
      "signature",
      "transactionId",
      "contractRoot",
      "downloadUrl",
      "storageUrl",
    ]) {
      expect(hasOwnKeyDeep(readiness, unsafeKey)).toBe(false);
      expect(JSON.stringify(readiness)).not.toContain(`"${unsafeKey}"`);
    }
  });

  it("derives contract claim custody legal readiness without approving custody or claim execution", () => {
    const preapproval = createContractClaimPreapprovalPackage(campaignDetail);
    const repeated = createContractClaimPreapprovalPackage(campaignDetail).custodyLegalReadiness;
    const readiness = preapproval.custodyLegalReadiness;
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const closeout = createPostCampaignCloseout(campaignDetail);
    const directReadiness = createContractClaimCustodyLegalReadiness({
      adminApprovalReadiness: preapproval.adminApprovalReadiness,
      campaign: campaignDetail,
      closeout,
      deliveryAcceptance: adminOps.deliveryAcceptance,
      gates: preapproval.gates,
      securityReviewReadiness: preapproval.securityReviewReadiness,
      sourceContext: preapproval.sourceContext,
      transparency: adminOps.contractTransparencyMonitor,
    });
    const itemsById = Object.fromEntries(readiness.items.map((item) => [item.id, item]));
    const custodyLegalGate = preapproval.gates.find((gate) => gate.id === "custody-legal-approval");
    const requiredItemIds: ContractClaimCustodyLegalItemId[] = [
      "custody-model",
      "legal-terms",
      "project-owner-funding",
      "payout-responsibility",
      "escrow-exclusion",
      "dispute-ownership",
      "jurisdiction-compliance",
      "no-custody-no-distribution-boundary",
    ];

    expect(repeated).toEqual(readiness);
    expect(directReadiness).toEqual(readiness);
    expect(adminOps.contractClaimPreapprovalPackage.custodyLegalReadiness).toEqual(readiness);
    expect(preapproval.custodyLegalReadiness).toEqual(readiness);
    expect(readiness.campaignId).toBe(campaignDetail.id);
    expect(readiness.items.map((item) => item.id)).toEqual(requiredItemIds);
    expect(readiness.summary).toMatchObject({
      totalItems: readiness.items.length,
      readyItems: readiness.items.filter((item) => item.state === "ready").length,
      reviewRequiredItems: readiness.items.filter((item) => item.state === "review_required").length,
      blockedItems: readiness.items.filter((item) => item.state === "blocked").length,
      custodyLegalApprovalBlocked: true,
      topItemId: "custody-model",
    });
    expect(readiness.nextAction).toEqual(readiness.summary.topNextAction);
    expect(readiness.custodyLegalApproved).toBe(false);
    expect(readiness.claimExecutionEnabled).toBe(false);
    expect(readiness.noContractWrite).toBe(true);
    expect(readiness.noClaimExecution).toBe(true);
    expect(readiness.noRewardCustody).toBe(true);
    expect(readiness.noRewardDistribution).toBe(true);
    expect(readiness.noStorageWrite).toBe(true);
    expect(readiness.noBranchAutomation).toBe(true);
    expect(readiness.boundary["en-US"]).toContain("Custody/legal approval is not granted");
    expect(readiness.boundary["en-US"]).toContain("no contract write");
    expect(readiness.boundary["en-US"]).toContain("claim execution");
    expect(readiness.boundary["en-US"]).toContain("reward custody");
    expect(readiness.boundary["en-US"]).toContain("payout operation");

    expect(itemsById["custody-model"]).toMatchObject({
      state: "blocked",
      ownerRole: "contract_reviewer",
      sourceGateId: "custody-legal-approval",
      blocksCustodyLegalApproval: true,
    });
    expect(itemsById["legal-terms"]?.blockingReason["en-US"]).toContain("Legal terms");
    expect(itemsById["project-owner-funding"]).toMatchObject({
      state: "review_required",
      ownerRole: "project_owner",
      sourceGateId: "project-owner-reward-funding",
    });
    expect(itemsById["payout-responsibility"]?.dependency["en-US"]).toContain("Payout responsibility");
    expect(itemsById["escrow-exclusion"]).toMatchObject({
      state: "ready",
      sourceGateId: "no-custody-no-distribution-boundary",
    });
    expect(itemsById["dispute-ownership"]?.nextAction["en-US"]).toContain("runbook");
    expect(itemsById["jurisdiction-compliance"]?.evidenceRequired["en-US"]).toContain("Jurisdiction");
    expect(itemsById["no-custody-no-distribution-boundary"]).toMatchObject({
      state: "ready",
      ownerRole: "project_owner",
      sourceGateId: "no-custody-no-distribution-boundary",
    });

    expect(custodyLegalGate).toMatchObject({
      state: "blocked",
      ownerRole: "contract_reviewer",
      blocksClaimExecution: true,
    });
    expect(custodyLegalGate?.evidenceNeeded["en-US"]).toContain("Custody/Legal Readiness");
    expect(custodyLegalGate?.evidenceNeeded["en-US"]).toContain("custody-model");
    expect(custodyLegalGate?.nextAction).toEqual(readiness.summary.topNextAction);
    expect(readiness.sourceContext.preapproval["en-US"]).toContain("custody/legal gate state blocked");
    expect(readiness.sourceContext.securityReview["en-US"]).toContain("claim-threat-model");
    expect(readiness.sourceContext.adminApproval["en-US"]).toContain("claimModeApprovalBlocked=true");
    expect(readiness.sourceContext.contractTransparency["en-US"]).toContain("reward-custody-claim");

    for (const item of readiness.items) {
      expectCoreLocalizedText(item.label);
      expectCoreLocalizedText(item.dependency);
      expectCoreLocalizedText(item.evidenceRequired);
      expectCoreLocalizedText(item.blockingReason);
      expectCoreLocalizedText(item.nextAction);
      expectCoreLocalizedText(item.sourceSurface);
      expectCoreLocalizedText(item.boundary);
    }

    for (const unsafeKey of [
      "privateKey",
      "signature",
      "transactionId",
      "contractRoot",
      "downloadUrl",
      "storageUrl",
    ]) {
      expect(hasOwnKeyDeep(readiness, unsafeKey)).toBe(false);
      expect(JSON.stringify(readiness)).not.toContain(`"${unsafeKey}"`);
    }
  });

  it("derives contract claim reward custody approval readiness without enabling custody or payout", () => {
    const preapproval = createContractClaimPreapprovalPackage(campaignDetail);
    const repeated = createContractClaimPreapprovalPackage(campaignDetail).rewardCustodyApprovalReadiness;
    const readiness = preapproval.rewardCustodyApprovalReadiness;
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const itemsById = Object.fromEntries(readiness.items.map((item) => [item.id, item]));
    const requiredItemIds: ContractClaimRewardCustodyApprovalItemId[] = [
      "custody-model",
      "escrow-exclusion",
      "project-owner-funding",
      "payout-responsibility",
      "legal-terms",
      "jurisdiction-compliance",
      "external-audit",
      "dispute-rollback-runbook",
      "no-custody-no-distribution-boundary",
    ];

    expect(repeated).toEqual(readiness);
    expect(adminOps.contractClaimPreapprovalPackage.rewardCustodyApprovalReadiness).toEqual(readiness);
    expect(preapproval.rewardCustodyApprovalReadiness).toEqual(readiness);
    expect(readiness.campaignId).toBe(campaignDetail.id);
    expect(readiness.items.map((item) => item.id)).toEqual(requiredItemIds);
    expect(readiness.summary).toMatchObject({
      totalItems: readiness.items.length,
      readyItems: readiness.items.filter((item) => item.state === "ready").length,
      reviewRequiredItems: readiness.items.filter((item) => item.state === "review_required").length,
      blockedItems: readiness.items.filter((item) => item.state === "blocked").length,
      launchBlockingItems: readiness.items.filter(
        (item) => item.blocksRewardCustodyApproval && item.state !== "ready",
      ).length,
      rewardCustodyApprovalBlocked: true,
      rewardCustodyEnabled: false,
      claimExecutionEnabled: false,
      topItemId: "custody-model",
    });
    expect(readiness.nextAction).toEqual(readiness.summary.topNextAction);
    expect(readiness.rewardCustodyApproved).toBe(false);
    expect(readiness.rewardCustodyEnabled).toBe(false);
    expect(readiness.claimExecutionEnabled).toBe(false);
    expect(readiness.noContractWrite).toBe(true);
    expect(readiness.noClaimExecution).toBe(true);
    expect(readiness.noWalletSigning).toBe(true);
    expect(readiness.noProviderCall).toBe(true);
    expect(readiness.noStorageWrite).toBe(true);
    expect(readiness.noExportGeneration).toBe(true);
    expect(readiness.noRewardCustody).toBe(true);
    expect(readiness.noRewardDistribution).toBe(true);
    expect(readiness.noBranchAutomation).toBe(true);
    expect(readiness.noIssueAutomation).toBe(true);
    expect(readiness.noPrAutomation).toBe(true);
    expect(readiness.noMissionAutomation).toBe(true);
    expect(readiness.boundary["en-US"]).toContain("Reward custody approval is not granted");
    expect(readiness.boundary["en-US"]).toContain("payout");
    expect(readiness.boundary["en-US"]).toContain("PR");
    expect(readiness.boundary["en-US"]).toContain("mission automation");

    expect(itemsById["custody-model"]).toMatchObject({
      state: "blocked",
      ownerRole: "contract_reviewer",
      sourceGateId: "custody-legal-approval",
      blocksRewardCustodyApproval: true,
    });
    expect(itemsById["escrow-exclusion"]).toMatchObject({
      state: "ready",
      sourceGateId: "no-custody-no-distribution-boundary",
    });
    expect(itemsById["project-owner-funding"]).toMatchObject({
      state: "review_required",
      ownerRole: "project_owner",
      sourceGateId: "project-owner-reward-funding",
    });
    expect(itemsById["payout-responsibility"]?.fundingImpact["en-US"]).toContain("Funding impact");
    expect(itemsById["legal-terms"]?.approvalImpact["en-US"]).toContain("Approval impact");
    expect(itemsById["jurisdiction-compliance"]?.evidenceRequired["en-US"]).toContain("Jurisdiction");
    expect(itemsById["external-audit"]).toMatchObject({
      state: "blocked",
      sourceGateId: "external-audit",
    });
    expect(itemsById["dispute-rollback-runbook"]).toMatchObject({
      state: "review_required",
      sourceGateId: "pause-dispute-runbook",
    });
    expect(itemsById["no-custody-no-distribution-boundary"]).toMatchObject({
      state: "ready",
      ownerRole: "project_owner",
      sourceGateId: "no-custody-no-distribution-boundary",
    });
    expect(readiness.sourceContext.preapproval["en-US"]).toContain("reward custody approval remains blocked");
    expect(readiness.sourceContext.custodyLegal["en-US"]).toContain("custodyLegalApprovalBlocked=true");
    expect(readiness.sourceContext.adminApproval["en-US"]).toContain("claimModeApprovalBlocked=true");
    expect(readiness.sourceContext.executionApproval["en-US"]).toContain("executionApprovalBlocked=true");
    expect(readiness.sourceContext.deliveryAcceptance["en-US"]).toContain("v02-contract-claim-reward-custody");
    expect(readiness.sourceContext.contractTransparency["en-US"]).toContain("reward-custody-claim");

    for (const item of readiness.items) {
      expectCoreLocalizedText(item.label);
      expectCoreLocalizedText(item.dependency);
      expectCoreLocalizedText(item.evidenceRequired);
      expectCoreLocalizedText(item.fundingImpact);
      expectCoreLocalizedText(item.approvalImpact);
      expectCoreLocalizedText(item.nextAction);
      expectCoreLocalizedText(item.sourceSurface);
      expectCoreLocalizedText(item.boundary);
    }

    for (const unsafeKey of [
      "privateKey",
      "signature",
      "transactionId",
      "contractRoot",
      "downloadUrl",
      "storageUrl",
    ]) {
      expect(hasOwnKeyDeep(readiness, unsafeKey)).toBe(false);
      expect(JSON.stringify(readiness)).not.toContain(`"${unsafeKey}"`);
    }
  });

  it("derives contract claim execution approval readiness without enabling execution", () => {
    const preapproval = createContractClaimPreapprovalPackage(campaignDetail);
    const repeated = createContractClaimPreapprovalPackage(campaignDetail).executionApprovalReadiness;
    const readiness = preapproval.executionApprovalReadiness;
    const evidenceMatrix = readiness.evidenceMatrix;
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const itemsById = Object.fromEntries(readiness.items.map((item) => [item.id, item]));
    const evidenceRowsById = Object.fromEntries(evidenceMatrix.rows.map((row) => [row.id, row]));
    const contractClaimResidual = adminOps.residualGapMissionQueue.items.find(
      (item) => item.sourceRowId === "v02-contract-claim-reward-custody",
    );
    const requiredItemIds: ContractClaimExecutionApprovalItemId[] = [
      "security-approval",
      "admin-approval",
      "contract-reviewer-approval",
      "custody-legal-approval",
      "external-audit-acceptance",
      "project-owner-funding",
      "pause-dispute-rollback-runbook",
      "claim-proof-duplicate-safeguards",
      "no-custody-no-distribution-boundary",
    ];
    const requiredEvidenceRowIds: ContractClaimExecutionApprovalEvidenceRowId[] = [
      "security-approval-evidence",
      "admin-approval-evidence",
      "contract-reviewer-approval-evidence",
      "custody-legal-approval-evidence",
      "external-audit-acceptance-evidence",
      "project-owner-funding-evidence",
      "pause-dispute-rollback-runbook-evidence",
      "claim-proof-duplicate-safeguards-evidence",
      "no-custody-no-distribution-boundary-evidence",
    ];

    expect(repeated).toEqual(readiness);
    expect(adminOps.contractClaimPreapprovalPackage.executionApprovalReadiness).toEqual(readiness);
    expect(readiness.campaignId).toBe(campaignDetail.id);
    expect(readiness.items.map((item) => item.id)).toEqual(requiredItemIds);
    expect(evidenceMatrix.campaignId).toBe(campaignDetail.id);
    expect(evidenceMatrix.rows.map((row) => row.id)).toEqual(requiredEvidenceRowIds);
    expect(evidenceMatrix.rows.map((row) => row.sourceItemId)).toEqual(requiredItemIds);
    expect(readiness.summary).toMatchObject({
      totalItems: readiness.items.length,
      readyItems: readiness.items.filter((item) => item.state === "ready").length,
      reviewRequiredItems: readiness.items.filter((item) => item.state === "review_required").length,
      blockedItems: readiness.items.filter((item) => item.state === "blocked").length,
      launchBlockingItems: readiness.items.filter((item) => item.blocksExecutionApproval && item.state !== "ready").length,
      executionApprovalBlocked: true,
      claimExecutionEnabled: false,
      topItemId: "security-approval",
    });
    expect(readiness.nextAction).toEqual(readiness.summary.topNextAction);
    expect(evidenceMatrix.summary).toMatchObject({
      totalRows: evidenceMatrix.rows.length,
      readyRows: evidenceMatrix.rows.filter((row) => row.state === "ready").length,
      reviewRequiredRows: evidenceMatrix.rows.filter((row) => row.state === "review_required").length,
      missingRows: evidenceMatrix.rows.filter((row) => row.state === "missing").length,
      launchBlockingRows: evidenceMatrix.rows.filter((row) => row.blocksExecutionApproval && row.state !== "ready").length,
      evidenceComplete: false,
      executionApprovalBlocked: true,
      claimExecutionEnabled: false,
      topEvidenceId: "security-approval-evidence",
    });
    expect(evidenceMatrix.nextAction).toEqual(evidenceMatrix.summary.topNextAction);
    expect(evidenceMatrix.summary.topNextAction).toEqual(evidenceRowsById["security-approval-evidence"]?.nextAction);
    expect(evidenceRowsById["security-approval-evidence"]).toMatchObject({
      sourceItemId: "security-approval",
      state: "missing",
      ownerRole: "contract_reviewer",
      blocksExecutionApproval: true,
    });
    expect(evidenceRowsById["external-audit-acceptance-evidence"]?.missingEvidence["en-US"]).toContain(
      "External audit",
    );
    expect(evidenceRowsById["claim-proof-duplicate-safeguards-evidence"]?.auditRequirement["en-US"]).toContain(
      "security-review",
    );
    expect(evidenceRowsById["no-custody-no-distribution-boundary-evidence"]).toMatchObject({
      sourceItemId: "no-custody-no-distribution-boundary",
      state: "ready",
      ownerRole: "project_owner",
      blocksExecutionApproval: true,
    });
    expect(evidenceRowsById["no-custody-no-distribution-boundary-evidence"]?.missingEvidence["en-US"]).toContain(
      "does not approve execution",
    );

    expect(itemsById["security-approval"]).toMatchObject({
      state: "blocked",
      ownerRole: "contract_reviewer",
      sourceGateId: "security-review",
      blocksExecutionApproval: true,
    });
    expect(itemsById["admin-approval"]).toMatchObject({
      state: "blocked",
      ownerRole: "internal_operator",
      sourceGateId: "admin-approval",
      blocksExecutionApproval: true,
    });
    expect(itemsById["contract-reviewer-approval"]).toMatchObject({
      state: "blocked",
      ownerRole: "contract_reviewer",
      sourceGateId: "contract-reviewer-approval",
    });
    expect(itemsById["custody-legal-approval"]?.blockingReason["en-US"]).toContain("Custody/legal approval");
    expect(itemsById["external-audit-acceptance"]?.blockingReason["en-US"]).toContain("External audit");
    expect(itemsById["project-owner-funding"]?.launchImpact["en-US"]).toContain("Launch impact");
    expect(itemsById["pause-dispute-rollback-runbook"]?.dependency["en-US"]).toContain("rollback behavior");
    expect(itemsById["claim-proof-duplicate-safeguards"]?.blockingReason["en-US"]).toContain("duplicate safeguards");
    expect(itemsById["no-custody-no-distribution-boundary"]).toMatchObject({
      state: "ready",
      ownerRole: "project_owner",
      sourceGateId: "no-custody-no-distribution-boundary",
      blocksExecutionApproval: true,
    });
    expect(itemsById["no-custody-no-distribution-boundary"]?.blockingReason["en-US"]).toContain(
      "does not approve claim execution",
    );

    expect(readiness.executionApproved).toBe(false);
    expect(readiness.claimExecutionEnabled).toBe(false);
    expect(readiness.noContractWrite).toBe(true);
    expect(readiness.noClaimExecution).toBe(true);
    expect(readiness.noWalletSigning).toBe(true);
    expect(readiness.noProviderCall).toBe(true);
    expect(readiness.noStorageWrite).toBe(true);
    expect(readiness.noExportGeneration).toBe(true);
    expect(readiness.noRewardCustody).toBe(true);
    expect(readiness.noRewardDistribution).toBe(true);
    expect(readiness.noBranchAutomation).toBe(true);
    expect(readiness.noIssueAutomation).toBe(true);
    expect(readiness.noPrAutomation).toBe(true);
    expect(readiness.noMissionAutomation).toBe(true);
    expect(evidenceMatrix.evidenceComplete).toBe(false);
    expect(evidenceMatrix.executionApprovalBlocked).toBe(true);
    expect(evidenceMatrix.claimExecutionEnabled).toBe(false);
    expect(evidenceMatrix.noContractWrite).toBe(true);
    expect(evidenceMatrix.noClaimExecution).toBe(true);
    expect(evidenceMatrix.noWalletSigning).toBe(true);
    expect(evidenceMatrix.noProviderCall).toBe(true);
    expect(evidenceMatrix.noStorageWrite).toBe(true);
    expect(evidenceMatrix.noExportGeneration).toBe(true);
    expect(evidenceMatrix.noRewardCustody).toBe(true);
    expect(evidenceMatrix.noRewardDistribution).toBe(true);
    expect(evidenceMatrix.noBranchAutomation).toBe(true);
    expect(evidenceMatrix.noIssueAutomation).toBe(true);
    expect(evidenceMatrix.noPrAutomation).toBe(true);
    expect(evidenceMatrix.noMissionAutomation).toBe(true);
    expect(evidenceMatrix.boundary["en-US"]).toContain("Evidence completeness is not approval");
    expect(evidenceMatrix.boundary["en-US"]).toContain("issue");
    expect(evidenceMatrix.boundary["en-US"]).toContain("PR");
    expect(evidenceMatrix.boundary["en-US"]).toContain("mission");
    expect(readiness.boundary["en-US"]).toContain("Execution approval remains blocked");
    expect(readiness.boundary["en-US"]).toContain("No branch");
    expect(readiness.boundary["en-US"]).toContain("PR");
    expect(readiness.boundary["en-US"]).toContain("mission automation");
    expect(readiness.sourceContext.preapproval["en-US"]).toContain("execution approval remains blocked");
    expect(readiness.sourceContext.securityReview["en-US"]).toContain("approvalBlocked=true");
    expect(readiness.sourceContext.adminApproval["en-US"]).toContain("claimModeApprovalBlocked=true");
    expect(readiness.sourceContext.custodyLegal["en-US"]).toContain("custodyLegalApprovalBlocked=true");
    expect(readiness.sourceContext.contractTransparency["en-US"]).toContain("reward-custody-claim");
    expect(preapproval.overallState).toBe("blocked");
    expect(preapproval.claimExecutionEnabled).toBe(false);
    expect(preapproval.suggestedFutureBranch).toBe("mission/158-contract-claim-reward-custody-approval-readiness");

    expect(contractClaimResidual).toMatchObject({
      status: "backlog",
      launchBlocking: false,
      suggestedBranch: "mission/158-contract-claim-reward-custody-approval-readiness",
    });
    expect(contractClaimResidual?.dependency["en-US"]).toContain("Reward Custody Approval Readiness");
    expect(contractClaimResidual?.dependency["en-US"]).toContain("custody-model");
    expect(contractClaimResidual?.nextAction).toEqual(
      preapproval.rewardCustodyApprovalReadiness.summary.topNextAction,
    );
    expect(contractClaimResidual?.evidenceNeeded["en-US"]).toContain("Reward Custody Approval Readiness evidence");
    expect(contractClaimResidual?.evidenceNeeded["en-US"]).toContain("Reward custody approval is not granted");

    for (const item of readiness.items) {
      expectCoreLocalizedText(item.label);
      expectCoreLocalizedText(item.dependency);
      expectCoreLocalizedText(item.evidenceRequired);
      expectCoreLocalizedText(item.blockingReason);
      expectCoreLocalizedText(item.launchImpact);
      expectCoreLocalizedText(item.nextAction);
      expectCoreLocalizedText(item.sourceSurface);
      expectCoreLocalizedText(item.boundary);
    }

    for (const row of evidenceMatrix.rows) {
      expectCoreLocalizedText(row.label);
      expectCoreLocalizedText(row.evidenceSurface);
      expectCoreLocalizedText(row.evidenceSummary);
      expectCoreLocalizedText(row.missingEvidence);
      expectCoreLocalizedText(row.auditRequirement);
      expectCoreLocalizedText(row.approvalImpact);
      expectCoreLocalizedText(row.nextAction);
      expectCoreLocalizedText(row.boundary);
    }

    for (const localizedText of Object.values(readiness.sourceContext)) {
      expectCoreLocalizedText(localizedText);
    }

    for (const unsafeKey of [
      "privateKey",
      "signature",
      "transactionId",
      "contractRoot",
      "downloadUrl",
      "storageUrl",
    ]) {
      expect(hasOwnKeyDeep(readiness, unsafeKey)).toBe(false);
      expect(hasOwnKeyDeep(evidenceMatrix, unsafeKey)).toBe(false);
      expect(JSON.stringify(readiness)).not.toContain(`"${unsafeKey}"`);
      expect(JSON.stringify(evidenceMatrix)).not.toContain(`"${unsafeKey}"`);
    }
  });

  it("proves V2 companion contract readiness with deterministic local evidence", () => {
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const readiness = createCompanionContractReadiness(
      adminOps.contractInterfaceMatrix,
      adminOps.contractTransparencyMonitor,
    );
    const categoriesById = Object.fromEntries(readiness.categories.map((category) => [category.id, category]));
    const itemsFor = (categoryId: string) => categoriesById[categoryId]?.evidenceItems ?? [];
    const itemLabelsFor = (categoryId: string) =>
      itemsFor(categoryId).map((item) => item.label["en-US"]);
    const serialized = JSON.stringify(readiness);

    expect(readiness.categories.map((category) => category.id)).toEqual([
      "campaign-registry-schema",
      "campaign-registry-methods-events",
      "campaign-registry-status-mapping",
      "points-batch-root",
      "referral-registry-rules",
      "eligibility-root-proof",
      "verifier-roles-permissions",
      "i18n-off-chain-hash",
      "contract-test-checklist",
      "reward-custody-claim-exclusion",
    ]);
    expect(readiness.summary).toMatchObject({
      totalCategories: 10,
      requiredCategories: 9,
      provenCategories: 9,
      reviewRequiredCategories: 0,
      deferredNonGoalCategories: 0,
      blockedExecutionCategories: 1,
      ready: true,
      topCategoryId: "reward-custody-claim-exclusion",
    });
    expect(adminOps.companionContractReadiness).toEqual(readiness);
    expect(createCompanionContractReadiness(
      adminOps.contractInterfaceMatrix,
      adminOps.contractTransparencyMonitor,
    )).toEqual(readiness);

    expect(itemLabelsFor("campaign-registry-schema")).toEqual([
      "campaign_id",
      "project_owner",
      "status",
      "start_time",
      "end_time",
      "default_locale",
      "supported_locales",
      "wallet_policy",
      "metadata_uri",
      "metadata_hash",
      "task_config_hash",
      "reward_disclaimer_hash",
    ]);
    expect(itemLabelsFor("campaign-registry-methods-events")).toEqual(
      expect.arrayContaining([
        "CreateCampaign",
        "UpdateCampaignMetadata",
        "UpdateTaskConfigHash",
        "SetCampaignStatus",
        "SetWalletPolicy",
        "SetSupportedLocales",
        "TransferCampaignOwner",
        "PauseCampaign",
        "GetCampaign",
        "CampaignCreated",
        "SupportedLocalesUpdated",
        "CampaignPaused",
      ]),
    );
    expect(itemLabelsFor("campaign-registry-status-mapping")).toEqual([
      "draft -> DRAFT",
      "ai_draft -> off-chain only",
      "human_review -> off-chain only",
      "scheduled -> SCHEDULED",
      "live -> LIVE",
      "paused -> PAUSED",
      "ended -> ENDED",
      "exported -> export evidence only",
      "archived -> ARCHIVED",
    ]);
    expect(categoriesById["campaign-registry-status-mapping"]).toMatchObject({
      contractName: "CampaignRegistryV2",
      ownerRole: "contract_reviewer",
      status: "proven",
    });
    expect(categoriesById["campaign-registry-status-mapping"]?.evidenceSummary["en-US"]).toContain(
      "CampaignRegistryV2 status mapping",
    );
    expect(categoriesById["campaign-registry-status-mapping"]?.evidenceSummary["en-US"]).toContain(
      "off-chain only",
    );
    expect(itemLabelsFor("points-batch-root")).toEqual(
      expect.arrayContaining([
        "CommitPointsBatch",
        "RevokePointsBatch",
        "GetPointsBatch",
        "points_batch_root",
        "single-write points approval boundary",
      ]),
    );
    expect(itemLabelsFor("referral-registry-rules")).toEqual(
      expect.arrayContaining([
        "BindReferral",
        "MarkReferralQualified",
        "RemoveReferral",
        "GetReferral",
        "duplicate/self/circular referral policy",
      ]),
    );
    expect(itemLabelsFor("eligibility-root-proof")).toEqual(
      expect.arrayContaining([
        "SetEligibilityRoot",
        "UpdateEligibilityRoot",
        "GetEligibilityRoot",
        "VerifyEligibilityProof",
        "eligibility_root proof hash",
        "no reward distribution",
      ]),
    );
    expect(itemLabelsFor("verifier-roles-permissions")).toEqual([
      "Admin",
      "ProjectOwner",
      "Verifier",
      "Exporter",
      "Pauser",
    ]);
    expect(itemLabelsFor("i18n-off-chain-hash")).toEqual([
      "metadata_uri",
      "metadata_hash",
      "default_locale",
      "supported_locales",
      "reward_disclaimer_hash",
    ]);
    expect(itemLabelsFor("contract-test-checklist")).toEqual([
      "invalid start/end time",
      "owner/admin update",
      "default locale publish",
      "unsupported wallet policy",
      "pause behavior",
      "referral self/duplicate",
      "root reason hash",
      "verifier role",
      "events",
    ]);
    expect(categoriesById["reward-custody-claim-exclusion"]).toMatchObject({
      requiredForPlan: false,
      status: "blocked_non_goal",
      phase: "P2",
      ownerRole: "contract_reviewer",
    });
    expect(itemLabelsFor("reward-custody-claim-exclusion")).toEqual(
      expect.arrayContaining([
        "Security review",
        "Custody/legal approval",
        "External audit",
        "Admin approval",
        "Reward custody exclusion",
        "Reward distribution exclusion",
      ]),
    );
    expect(categoriesById["reward-custody-claim-exclusion"]?.evidenceSummary["en-US"]).toContain(
      "accepted non-goals",
    );
    expect(categoriesById["reward-custody-claim-exclusion"]?.evidenceSummary["en-US"]).toContain(
      "custody/legal",
    );
    expect(categoriesById["reward-custody-claim-exclusion"]?.evidenceSummary["en-US"]).toContain(
      "external audit",
    );
    expect(readiness.boundary["en-US"]).toContain("No ABI generation");
    expect(readiness.boundary["en-US"]).toContain("live contract transaction");
    expect(readiness.boundary["en-US"]).toContain("backend call");
    expect(readiness.boundary["en-US"]).toContain("wallet signing");
    expect(readiness.boundary["en-US"]).toContain("contract write");
    expect(readiness.boundary["en-US"]).toContain("root write");
    expect(readiness.boundary["en-US"]).toContain("storage write");
    expect(readiness.boundary["en-US"]).toContain("export file generation");
    expect(readiness.boundary["en-US"]).toContain("reward custody");
    expect(readiness.boundary["en-US"]).toContain("reward distribution");
    expect(serialized).not.toContain("sendTransaction");
    expect(serialized).not.toContain("writeContract");

    for (const category of readiness.categories) {
      expectLocalizedText(category.title);
      expectLocalizedText(category.evidenceSurface);
      expectLocalizedText(category.evidenceSummary);
      expectLocalizedText(category.boundary);
      expectLocalizedText(category.nextAction);

      for (const item of category.evidenceItems) {
        expectLocalizedText(item.label);
        expectLocalizedText(item.source);
        expectLocalizedText(item.detail);
      }
    }
  });

  it("builds the delivery checklist readiness console with release-approved v0.2 wallet evidence", () => {
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
    expect(new Set(items.map((item) => item.status))).toEqual(new Set(["covered", "deferred"]));
    expect(readiness.traceability.rows).toHaveLength(items.length);
    expect(readiness.traceability.summary).toMatchObject({
      deferredRows: items.filter((item) => item.status === "deferred").length,
      missingEvidenceRows: readiness.traceability.rows.filter((row) => row.evidenceArtifacts.length === 0).length,
      missingVerificationRows: readiness.traceability.rows.filter((row) => row.verificationCommands.length === 0).length,
      reviewRequiredRows: items.filter((item) => item.status === "needs_review").length,
      totalRows: items.length,
      verifiedRows: readiness.traceability.rows.filter(
        (row) =>
          row.status === "covered" &&
          row.verificationCommands.length > 0 &&
          row.evidenceArtifacts.length > 0,
      ).length,
    });
    expect(readiness.traceability.boundary["en-US"]).toContain("Read-only audit matrix");
    expect(readiness.traceability.boundary["en-US"]).toContain("does not read private docs");
    expect(
      Object.values(readiness.traceability.summary.proofLevelCounts).reduce((sum, count) => sum + count, 0),
    ).toBe(items.length);
    expect(
      readiness.traceability.rows.filter((row) => row.proofLevel === "live_evidence_required").length,
    ).toBeGreaterThan(0);
    expect(
      readiness.traceability.rows.filter((row) => row.proofLevel === "future_scope").length,
    ).toBe(readiness.traceability.summary.deferredRows);
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
      "es-ES",
    );
    expect(itemsById["product-mvp-locale-coverage"]?.nextAction["en-US"]).toContain(
      "reviewed locale copy",
    );
    expect(itemsById["product-future-locale-expansion"]).toMatchObject({
      status: "covered",
      blocksDelivery: false,
    });
    expect(itemsById["product-future-locale-expansion"]?.evidence["en-US"]).toContain(
      "es-ES",
    );
    expect(itemsById["product-future-locale-expansion"]?.nextAction["en-US"]).toContain(
      "reviewed copy",
    );
    const traceabilityByItemId = Object.fromEntries(
      readiness.traceability.rows.map((row) => [row.itemId, row]),
    );
    expect(traceabilityByItemId["product-aa-eoa-support"]).toMatchObject({
      groupId: "product",
      proofLevel: "focused_test",
      sourceRequirement: "Product checklist: AA and EOA support",
      status: "covered",
    });
    expect(traceabilityByItemId["product-aa-eoa-support"]?.sourceDocs[0].path).toContain(
      "09_delivery_checklist_v0.2.md#product-checklist",
    );
    expect(traceabilityByItemId["product-aa-eoa-support"]?.implementationRefs.map((ref) => ref.path)).toContain(
      "src/domain/campaign.ts#createDeliveryChecklistReadinessConsole",
    );
    expect(traceabilityByItemId["product-aa-eoa-support"]?.verificationCommands[0].path).toContain(
      "npm test -- src/domain/domain.test.ts",
    );
    expect(traceabilityByItemId["product-aa-eoa-support"]?.evidenceArtifacts[0].path).toContain(
      "evidence/delivery-checklist-evidence-traceability-01KWPAY5/WP02/implementation-evidence.md",
    );
    expect(traceabilityByItemId["qa-portkey-aa-connect"]?.proofLevel).toBe("live_evidence_required");
    expect(traceabilityByItemId["qa-portkey-aa-connect"]?.riskNote["en-US"]).toContain(
      "live-provider evidence",
    );
    expect(traceabilityByItemId["contract-reward-custody-excluded"]).toMatchObject({
      proofLevel: "future_scope",
      status: "deferred",
    });
    expect(traceabilityByItemId["contract-reward-custody-excluded"]?.verificationCommands).toHaveLength(0);
    const closeout = readiness.closeout;
    const unresolvedQueueIds = ["blocked", "needs_review", "missing_verification", "missing_evidence"];
    const closeoutByItemId = Object.fromEntries(closeout.rows.map((row) => [row.itemId, row]));

    expect(closeout.rows).toHaveLength(readiness.traceability.rows.length);
    expect(closeout.queues.map((queue) => queue.id)).toEqual([
      "blocked",
      "needs_review",
      "missing_verification",
      "missing_evidence",
      "deferred",
      "covered",
    ]);
    expect(closeout.summary).toMatchObject({
      totalRows: closeout.rows.length,
      unresolvedRows: closeout.rows.filter((row) => unresolvedQueueIds.includes(row.queueId)).length,
      coveredRows: closeout.rows.filter((row) => row.queueId === "covered").length,
      blockedRows: closeout.rows.filter((row) => row.queueId === "blocked").length,
      needsReviewRows: closeout.rows.filter((row) => row.queueId === "needs_review").length,
      missingVerificationRows: closeout.rows.filter((row) => row.missingVerification).length,
      missingEvidenceRows: closeout.rows.filter((row) => row.missingEvidence).length,
      deferredRows: closeout.rows.filter((row) => row.queueId === "deferred").length,
      ready: true,
    });
    expect(closeout.summary.topQueueId).toBe("deferred");
    expect(closeout.summary.topHandoffTarget).toBe("none");
    expect(closeout.summary.topRowId).toBeNull();
    expect(closeout.boundary["en-US"]).toContain("Review-only closeout workflow");
    expect(closeout.boundary["en-US"]).toContain("does not execute live wallet SDKs");
    expect(closeoutByItemId["qa-portkey-aa-connect"]).toMatchObject({
      queueId: "covered",
      handoffTarget: "none",
      proofLevel: "live_evidence_required",
      status: "covered",
      missingEvidence: false,
      missingVerification: false,
    });
    expect(closeoutByItemId["qa-portkey-aa-connect"]?.handoffLabel["en-US"]).toBe("No immediate handoff");
    expect(closeoutByItemId["qa-eoa-extension-connect"]).toMatchObject({
      queueId: "covered",
      handoffTarget: "none",
      proofLevel: "live_evidence_required",
      status: "covered",
    });
    expect(closeoutByItemId["product-aa-eoa-support"]).toMatchObject({
      queueId: "covered",
      handoffTarget: "none",
      status: "covered",
      proofLevel: "focused_test",
    });
    expect(closeoutByItemId["contract-reward-custody-excluded"]).toMatchObject({
      queueId: "deferred",
      handoffTarget: "future_scope",
      status: "deferred",
      missingEvidence: true,
      missingVerification: true,
    });
    for (const row of closeout.rows) {
      expect(row.id).toBe(`closeout:${row.groupId}:${row.itemId}`);
      expectLocalizedText(row.label);
      expectLocalizedText(row.handoffLabel);
      expectLocalizedText(row.nextAction);
      expectLocalizedText(row.boundary);
      expect(row.priority).toBeGreaterThanOrEqual(0);
      expect(row.sourceRequirement.length).toBeGreaterThan(0);
    }
    const repeated = createAdminOpsReadModel(campaignDetail).deliveryChecklistReadiness.traceability;
    expect(repeated).toEqual(readiness.traceability);
    expect(createAdminOpsReadModel(campaignDetail).deliveryChecklistReadiness.closeout).toEqual(
      closeout,
    );
    const serializedTraceability = JSON.stringify(readiness.traceability).toLowerCase();
    const serializedCloseout = JSON.stringify(closeout).toLowerCase();
    for (const forbidden of [
      "privatekey",
      "private key",
      "seed phrase",
      "raw signature",
      "contract write",
      "upload url",
      "storage write",
      "reward custody action",
      "distribute rewards button",
    ]) {
      expect(serializedTraceability).not.toContain(forbidden);
    }
    for (const forbiddenAction of [
      "wallet sdk button",
      "provider api button",
      "contract transaction button",
      "storage write button",
      "export file generation button",
      "reward custody button",
      "reward distribution button",
    ]) {
      expect(serializedCloseout).not.toContain(forbiddenAction);
    }
    expect(readiness.p1LocaleExpansion.summary).toMatchObject({
      totalLocales: 6,
      deferredLocales: 0,
      runtimeSupportedLocales: 6,
    });
    expect(readiness.p1LocaleExpansion.summary.boundary["en-US"]).toContain("All P1 locale rows");
    expect(readiness.p1LocaleExpansion.summary.boundary["en-US"]).toContain("runtime-active");
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
        runtimeSupported: true,
        status: "ready",
      });
      expect(row.displayName["en-US"].length).toBeGreaterThan(0);
      expect(row.reason["en-US"]).toContain(row.code);
      expect(row.prerequisites).toHaveLength(4);
      expect(row.prerequisites.every((prerequisite) => prerequisite["en-US"].includes(row.code))).toBe(true);
      expect(row.nextAction["en-US"]).toContain(row.code);
    }
    const activationReadiness = createP1LocaleActivationReadiness();
    const candidatesByLocale = Object.fromEntries(
      activationReadiness.candidates.map((candidate) => [candidate.locale, candidate]),
    );

    expect(activationReadiness).toEqual(createP1LocaleActivationReadiness());
    expect(adminOps.p1LocaleActivationReadiness).toEqual(activationReadiness);
    expect(activationReadiness.candidates.map((candidate) => candidate.locale)).toEqual([
      "ko-KR",
      "ja-JP",
      "vi-VN",
      "id-ID",
      "tr-TR",
      "es-ES",
    ]);
    expect(activationReadiness.summary).toMatchObject({
      totalCandidates: 6,
      blockedCandidates: 0,
      reviewRequiredCandidates: 0,
      readyCandidates: 6,
      deferredCandidates: 0,
      requiredEvidenceItems: 30,
      completedEvidenceItems: 30,
      recommendedFirstLocale: "tr-TR",
      topBlockerId: null,
      ready: true,
    });
    expect(activationReadiness.boundary["en-US"]).toContain(
      "ja-JP, ko-KR, vi-VN, id-ID, tr-TR, and es-ES are runtime-active",
    );
    expect(activationReadiness.nextAction["en-US"]).toContain("English fallback");
    expect(activationReadiness.nextAction["en-US"]).toContain("English fallback-copy evidence");
    expect(activationReadiness.nextAction["en-US"]).toContain("publish-gate evidence are ready");
    expect(activationReadiness.nextAction["en-US"]).toContain("reviewed Turkish business copy");
    expect(activationReadiness.nextAction["en-US"]).toContain("full localization claims");
    expect(candidatesByLocale["ko-KR"]).toMatchObject({
      ownerRole: "project_owner",
      priority: 0,
      recommendedFirst: false,
      status: "ready",
      contentOwnershipReadiness: "ready",
      qaReadiness: "ready",
      routingReadiness: "ready",
      analyticsReadiness: "ready",
      publishGateReadiness: "ready",
      blockerIds: [],
      evidenceReferences: [
        "v02-p1-locale-expansion",
        "mission/p1-locale-expansion",
        "mission/126-ko-kr-locale-activation",
        "mission/135-ko-kr-locale-copy-publish-readiness",
      ],
    });
    expect(candidatesByLocale["ko-KR"]?.contentScope["en-US"]).toContain("ko-KR");
    expect(candidatesByLocale["ko-KR"]?.qaScope["en-US"]).toContain("ko-KR");
    expect(candidatesByLocale["ko-KR"]?.boundary["en-US"]).toContain("runtime-active");
    expect(candidatesByLocale["ko-KR"]?.nextAction["en-US"]).toContain("reviewed Korean business copy");
    expect(candidatesByLocale["ja-JP"]).toMatchObject({
      ownerRole: "project_owner",
      priority: 1,
      recommendedFirst: false,
      status: "ready",
      contentOwnershipReadiness: "ready",
      qaReadiness: "ready",
      routingReadiness: "ready",
      analyticsReadiness: "ready",
      publishGateReadiness: "ready",
      blockerIds: [],
      evidenceReferences: [
        "v02-p1-locale-expansion",
        "mission/p1-locale-expansion",
        "mission/124-ja-jp-locale-activation",
        "mission/136-ja-jp-locale-copy-publish-readiness",
      ],
    });
    expect(candidatesByLocale["ja-JP"]?.contentScope["en-US"]).toContain("ja-JP");
    expect(candidatesByLocale["ja-JP"]?.qaScope["en-US"]).toContain("ja-JP");
    expect(candidatesByLocale["ja-JP"]?.boundary["en-US"]).toContain("runtime-active");
    expect(candidatesByLocale["ja-JP"]?.nextAction["en-US"]).toContain("reviewed Japanese business copy");
    expect(candidatesByLocale["vi-VN"]).toMatchObject({
      ownerRole: "project_owner",
      priority: 2,
      recommendedFirst: false,
      status: "ready",
      contentOwnershipReadiness: "ready",
      qaReadiness: "ready",
      routingReadiness: "ready",
      analyticsReadiness: "ready",
      publishGateReadiness: "ready",
      blockerIds: [],
      evidenceReferences: [
        "v02-p1-locale-expansion",
        "mission/p1-locale-expansion",
        "mission/127-vi-vn-locale-activation",
        "mission/137-vi-vn-locale-copy-publish-readiness",
      ],
    });
    expect(candidatesByLocale["vi-VN"]?.contentScope["en-US"]).toContain("vi-VN");
    expect(candidatesByLocale["vi-VN"]?.qaScope["en-US"]).toContain("vi-VN");
    expect(candidatesByLocale["vi-VN"]?.boundary["en-US"]).toContain("runtime-active");
    expect(candidatesByLocale["vi-VN"]?.nextAction["en-US"]).toContain("reviewed Vietnamese business copy");
    expect(candidatesByLocale["id-ID"]).toMatchObject({
      ownerRole: "project_owner",
      priority: 3,
      recommendedFirst: false,
      status: "ready",
      contentOwnershipReadiness: "ready",
      qaReadiness: "ready",
      routingReadiness: "ready",
      analyticsReadiness: "ready",
      publishGateReadiness: "ready",
      blockerIds: [],
      evidenceReferences: [
        "v02-p1-locale-expansion",
        "mission/p1-locale-expansion",
        "mission/128-id-id-locale-activation",
        "mission/138-id-id-locale-copy-publish-readiness",
      ],
    });
    expect(candidatesByLocale["id-ID"]?.contentScope["en-US"]).toContain("id-ID");
    expect(candidatesByLocale["id-ID"]?.qaScope["en-US"]).toContain("id-ID");
    expect(candidatesByLocale["id-ID"]?.boundary["en-US"]).toContain("runtime-active");
    expect(candidatesByLocale["id-ID"]?.nextAction["en-US"]).toContain("reviewed Indonesian business copy");
    expect(candidatesByLocale["tr-TR"]).toMatchObject({
      ownerRole: "project_owner",
      priority: 4,
      recommendedFirst: true,
      status: "ready",
      contentOwnershipReadiness: "ready",
      qaReadiness: "ready",
      routingReadiness: "ready",
      analyticsReadiness: "ready",
      publishGateReadiness: "ready",
      blockerIds: [],
      evidenceReferences: [
        "v02-p1-locale-expansion",
        "mission/p1-locale-expansion",
        "mission/129-tr-tr-locale-activation",
        "mission/139-tr-tr-locale-copy-publish-readiness",
      ],
    });
    expect(candidatesByLocale["tr-TR"]?.contentScope["en-US"]).toContain("tr-TR");
    expect(candidatesByLocale["tr-TR"]?.qaScope["en-US"]).toContain("tr-TR");
    expect(candidatesByLocale["tr-TR"]?.boundary["en-US"]).toContain("runtime-active");
    expect(candidatesByLocale["tr-TR"]?.nextAction["en-US"]).toContain("reviewed Turkish business copy");
    expect(candidatesByLocale["es-ES"]).toMatchObject({
      ownerRole: "project_owner",
      priority: 5,
      recommendedFirst: false,
      status: "ready",
      contentOwnershipReadiness: "ready",
      qaReadiness: "ready",
      routingReadiness: "ready",
      analyticsReadiness: "ready",
      publishGateReadiness: "ready",
      blockerIds: [],
      evidenceReferences: [
        "v02-p1-locale-expansion",
        "mission/p1-locale-expansion",
        "mission/130-es-es-locale-activation",
        "mission/134-es-es-locale-copy-publish-readiness",
      ],
    });
    expect(candidatesByLocale["es-ES"]?.contentScope["en-US"]).toContain("es-ES");
    expect(candidatesByLocale["es-ES"]?.qaScope["en-US"]).toContain("es-ES");
    expect(candidatesByLocale["es-ES"]?.boundary["en-US"]).toContain("runtime-active");
    expect(candidatesByLocale["es-ES"]?.nextAction["en-US"]).toContain("reviewed Spanish business copy");
    for (const localeCode of ["ko-KR", "ja-JP", "vi-VN", "id-ID", "tr-TR", "es-ES"] as const) {
      expect(candidatesByLocale[localeCode]).toMatchObject({
        contentOwnershipReadiness: "ready",
        publishGateReadiness: "ready",
      });
    }
    expect(supportedLocales).toEqual(activatedRuntimeLocales);
    expect(itemsById["product-contract-impact-review"]?.evidence["en-US"]).toContain(
      "claim-mode disabled and future approval-gated",
    );
    expect(itemsById["qa-wrong-chain-error"]).toMatchObject({
      status: "covered",
      blocksDelivery: false,
    });
    expect(itemsById["qa-portkey-aa-connect"]?.surface["en-US"]).toBe("Wallet Provider QA Gate");
    expect(itemsById["qa-portkey-aa-connect"]?.evidence["en-US"]).toContain(
      "Live Portkey AA provider evidence has been reviewed",
    );
    expect(itemsById["qa-eoa-extension-connect"]?.evidence["en-US"]).toContain(
      "Live EOA browser-extension evidence has been reviewed",
    );
    expect(itemsById["qa-extension-not-installed-error"]).toMatchObject({
      status: "covered",
      blocksDelivery: false,
    });
    expect(itemsById["qa-extension-not-installed-error"]?.evidence["en-US"]).toContain(
      "extension-not-installed recovery evidence has been reviewed",
    );
    expect(itemsById["qa-wrong-chain-error"]?.nextAction["en-US"]).toContain(
      "Keep reviewed live-provider evidence attached",
    );
    expect(itemsById["qa-unsupported-wallet-error"]?.evidence["zh-TW"]).toContain(
      "真實不支援錢包 provider fallback 證據已審核",
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
    expect(readiness.needsReview.map((item) => item.id)).toEqual([]);
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

  it("builds the delivery acceptance console across v0.1 and v0.2 with release-approved local wallet evidence", () => {
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
      topSeverity: "low",
    });
    expect(new Set(rows.map((row) => row.status))).toEqual(new Set(["proven", "deferred"]));
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
      status: "proven",
      severity: "high",
      ownerRole: "project_owner",
    });
    expect(rowsById["v01-user-participation-loop"]?.evidenceSummary["en-US"]).toContain(
      "Seeded/local User App participation",
    );
    expect(rowsById["v01-user-participation-loop"]?.evidenceSummary["en-US"]).toContain(
      "task verification states and actions",
    );
    expect(rowsById["v01-user-participation-loop"]?.evidenceSummary["en-US"]).toContain(
      "eligibility checker",
    );
    expect(rowsById["v01-user-participation-loop"]?.evidenceSummary["en-US"]).toContain(
      "referral evidence",
    );
    expect(rowsById["v01-user-participation-loop"]?.evidenceSummary["en-US"]).toContain(
      "leaderboard points",
    );
    expect(rowsById["v01-user-participation-loop"]?.evidenceSummary["en-US"]).toContain(
      "winner export status",
    );
    expect(rowsById["v01-user-participation-loop"]?.evidenceSummary["en-US"]).toContain(
      "live verification providers remain gated separately",
    );
    expect(rowsById["v01-user-participation-loop"]?.nextMissionAction["en-US"]).toContain(
      "live wallet provider evidence path",
    );
    expect(rowsById["v01-live-export-download"]).toMatchObject({
      status: "proven",
      severity: "medium",
      launchBlocking: false,
      ownerRole: "project_owner",
    });
    expect(rowsById["v01-live-export-download"]?.title["en-US"]).toBe(
      "Local export fulfillment handoff readiness",
    );
    expect(rowsById["v01-live-export-download"]?.evidenceSummary["en-US"]).toContain(
      "2 local packages ready",
    );
    expect(rowsById["v01-live-export-download"]?.evidenceSummary["en-US"]).toContain(
      "download availability remains false",
    );
    expect(rowsById["v01-live-export-download"]?.nextMissionAction["en-US"]).toContain(
      "storage-backed export",
    );
    expect(rowsById["v02-live-wallet-provider-evidence"]).toMatchObject({
      solutionSetId: "v0_2_wallet_i18n_contract",
      status: "proven",
      severity: "high",
      launchBlocking: false,
    });
    expect(rowsById["v02-live-wallet-provider-evidence"]?.boundary?.["en-US"]).toContain(
      "Wallet Provider Evidence Intake",
    );
    expect(rowsById["v02-live-wallet-provider-evidence"]?.evidenceSurface["en-US"]).toContain(
      "Release Readiness",
    );
    expect(rowsById["v02-live-wallet-provider-evidence"]?.evidenceSummary["en-US"]).toContain(
      "approved all 5/5 required scenarios",
    );
    expect(adminOps.walletProviderEvidenceReleaseReadiness.summary).toMatchObject({
      totalScenarios: 5,
      requiredScenarios: 5,
      approvedRequiredScenarios: 5,
      reviewRequiredScenarios: 0,
      blockedScenarios: 0,
      releaseBlockers: 0,
      ready: true,
      topScenarioId: "portkey-aa-connect",
      topFailedRuleId: null,
    });
    expect(adminOps.walletProviderEvidenceReleaseReadiness.boundary["en-US"]).toContain("No live wallet SDK");
    expect(rowsById["v02-contract-companion-plan"]).toMatchObject({
      status: "proven",
      severity: "high",
      launchBlocking: false,
      ownerRole: "contract_reviewer",
    });
    expect(rowsById["v02-contract-companion-plan"]?.evidenceSurface["en-US"]).toContain(
      "Companion Contract Readiness",
    );
    expect(rowsById["v02-contract-companion-plan"]?.evidenceSummary["en-US"]).toContain("schema");
    expect(rowsById["v02-contract-companion-plan"]?.evidenceSummary["en-US"]).toContain("roles");
    expect(rowsById["v02-contract-companion-plan"]?.evidenceSummary["en-US"]).toContain("events");
    expect(rowsById["v02-contract-companion-plan"]?.evidenceSummary["en-US"]).toContain("tests");
    expect(rowsById["v02-contract-companion-plan"]?.evidenceSummary["en-US"]).toContain("roots");
    expect(rowsById["v02-contract-companion-plan"]?.evidenceSummary["en-US"]).toContain("i18n off-chain");
    expect(rowsById["v02-contract-companion-plan"]?.evidenceSummary["en-US"]).toContain(
      "reward custody exclusion",
    );
    expect(rowsById["v02-contract-claim-reward-custody"]).toMatchObject({
      status: "deferred",
      severity: "low",
      launchBlocking: false,
    });
    expect(rowsById["v02-contract-claim-reward-custody"]?.evidenceSummary["en-US"]).toContain(
      "Contract Claim Preapproval Package",
    );
    expect(rowsById["v02-contract-claim-reward-custody"]?.evidenceSummary["en-US"]).toContain("remain blocked");
    expect(rowsById["v02-contract-claim-reward-custody"]?.nextMissionAction["en-US"]).toContain(
      "preapproval package",
    );
    expect(rowsById["v02-p1-locale-expansion"]).toMatchObject({
      status: "proven",
      severity: "low",
    });
    expect(rowsById["v02-p1-locale-expansion"]?.evidenceSummary["en-US"]).toContain("es-ES");
    expect(
      rows
        .filter((row) => row.status === "needs_live_evidence" || row.status === "blocked")
        .some((row) => row.status === "proven"),
    ).toBe(false);
    expect(acceptance.topResidualGaps).toHaveLength(0);
    expect(acceptance.topResidualGaps.map((row) => row.id)).not.toContain("v01-user-participation-loop");
    expect(acceptance.topResidualGaps.map((row) => row.id)).not.toContain("v01-live-export-download");
    expect(acceptance.topResidualGaps.map((row) => row.id)).not.toContain("v02-contract-companion-plan");
    expect(acceptance.topResidualGaps.map((row) => row.id)).not.toContain("v02-live-wallet-provider-evidence");
    expect(acceptance.topResidualGaps.map((row) => row.id).slice(0, 2)).not.toContain(
      "v02-contract-claim-reward-custody",
    );
    expect(acceptance.topResidualGaps.map((row) => row.id)).not.toContain("v02-p1-locale-expansion");

    for (const row of rows) {
      expect(row.title["en-US"]).toBeTruthy();
      expect(row.title["zh-CN"]).toBeTruthy();
      expect(row.title["zh-TW"]).toBeTruthy();
      expect(row.evidenceSurface["en-US"]).toBeTruthy();
      expect(row.evidenceSummary["en-US"]).toBeTruthy();
      expect(row.nextMissionAction["en-US"]).toBeTruthy();
    }
  });

  it("turns delivery acceptance residuals into a conservative mission queue", () => {
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const queue = adminOps.residualGapMissionQueue;
    const repeatedQueue = createResidualGapMissionQueue(adminOps.deliveryAcceptance, {
      contractClaimPreapprovalPackage: adminOps.contractClaimPreapprovalPackage,
    });
    const fallbackQueue = createResidualGapMissionQueue(adminOps.deliveryAcceptance);
    const itemsById = Object.fromEntries(queue.items.map((item) => [item.id, item]));
    const fallbackItemsById = Object.fromEntries(fallbackQueue.items.map((item) => [item.id, item]));

    expect(repeatedQueue).toEqual(queue);
    expect(queue.summary).toMatchObject({
      totalItems: queue.items.length,
      launchBlockingItems: queue.items.filter((item) => item.launchBlocking).length,
      backlogItems: queue.items.filter((item) => item.status === "backlog").length,
      topItemId: "mission-v02-contract-claim-reward-custody",
      topSeverity: "low",
    });
    expect(queue.summary.nextAction).toEqual(
      adminOps.contractClaimPreapprovalPackage.rewardCustodyApprovalReadiness.summary.topNextAction,
    );
    expect(queue.boundary["en-US"]).toContain("does not create missions");
    expect(queue.boundary["en-US"]).toContain("No live wallet SDK");

    expect(queue.items[0]).toMatchObject({
      id: "mission-v02-contract-claim-reward-custody",
      sourceRowId: "v02-contract-claim-reward-custody",
      sourceSolutionSetId: "v0_2_wallet_i18n_contract",
      priority: 1,
      status: "backlog",
      severity: "low",
      ownerRole: "contract_reviewer",
      launchBlocking: false,
      suggestedBranch: "mission/158-contract-claim-reward-custody-approval-readiness",
    });
    expect(queue.items[0]?.suggestedMissionTitle["en-US"]).toBe(
      "Contract claim Reward Custody Approval Readiness mission",
    );
    expect(queue.items[0]?.sourceGap["en-US"]).toBe(
      "Contract claim preapproval package covers future custody approval",
    );
    expect(queue.items[0]?.dependency["en-US"]).toContain(
      "Reward Custody Approval Readiness is present but blocked",
    );
    expect(queue.items[0]?.dependency["en-US"]).toContain(
      adminOps.contractClaimPreapprovalPackage.rewardCustodyApprovalReadiness.summary.topItemId,
    );
    expect(queue.items[0]?.evidenceNeeded["en-US"]).toContain("Mission 141 created");
    expect(queue.items[0]?.evidenceNeeded["en-US"]).toContain("Reward Custody Approval Readiness evidence");
    expect(queue.items[0]?.nextAction).toEqual(
      adminOps.contractClaimPreapprovalPackage.rewardCustodyApprovalReadiness.summary.topNextAction,
    );
    expect(queue.items[0]?.boundary["en-US"]).toContain("Reward Custody Approval Readiness boundary");
    expect(queue.items[0]?.boundary["en-US"]).toContain("reward custody");
    expect(queue.items[0]?.boundary["en-US"]).toContain("reward distribution");
    expect(queue.items[0]?.launchImpact["en-US"]).toContain("non-blocking backlog follow-up");

    expect(adminOps.deliveryAcceptance.topResidualGaps).toHaveLength(0);
    expect(itemsById["mission-v01-user-participation-loop"]).toBeUndefined();
    expect(itemsById["mission-v02-live-wallet-provider-evidence"]).toBeUndefined();

    expect(itemsById["mission-v02-contract-claim-reward-custody"]).toMatchObject({
      sourceRowId: "v02-contract-claim-reward-custody",
      status: "backlog",
      launchBlocking: false,
      suggestedBranch: "mission/158-contract-claim-reward-custody-approval-readiness",
    });
    expect(itemsById["mission-v02-contract-claim-reward-custody"]?.suggestedBranch).not.toBe(
      "mission/contract-claim-reward-custody",
    );
    expect(fallbackItemsById["mission-v02-contract-claim-reward-custody"]).toMatchObject({
      sourceRowId: "v02-contract-claim-reward-custody",
      status: "backlog",
      launchBlocking: false,
      suggestedBranch: "mission/contract-claim-reward-custody",
    });
    expect(itemsById["mission-v02-p1-locale-expansion"]).toBeUndefined();

    for (const item of queue.items) {
      expect(item.suggestedMissionTitle["en-US"]).toBeTruthy();
      expect(item.suggestedMissionTitle["zh-CN"]).toBeTruthy();
      expect(item.suggestedMissionTitle["zh-TW"]).toBeTruthy();
      expect(item.dependency["en-US"]).toBeTruthy();
      expect(item.evidenceNeeded["en-US"]).toBeTruthy();
      expect(item.nextAction["en-US"]).toBeTruthy();
      expect(item.suggestedBranch).toMatch(/^mission\//);
      expect(item.suggestedBranch).not.toMatch(/^mission\/(?:main|master)$/);
    }
  });

  it("includes the wallet provider QA gate in the Admin/Ops read model", () => {
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const readinessItems = adminOps.deliveryChecklistReadiness.groups.flatMap((group) => group.items);
    const readinessById = Object.fromEntries(readinessItems.map((item) => [item.id, item]));

    expect(adminOps.walletProviderQaGate.summary).toMatchObject({
      totalScenarios: 5,
      seededReadyScenarios: 5,
      liveEvidenceReadyScenarios: 5,
      missingLiveEvidenceScenarios: 0,
    });
    expect(adminOps.walletProviderQaGate.scenarios.map((scenario) => scenario.id)).toEqual([
      "portkey-aa-connect",
      "eoa-extension-connect",
      "extension-not-installed-error",
      "wrong-chain-error",
      "unsupported-wallet-error",
    ]);
    expect(readinessById["qa-portkey-aa-connect"]).toMatchObject({
      status: "covered",
      evidence: adminOps.walletProviderQaGate.scenarios[0].evidence,
    });
    expect(readinessById["qa-portkey-aa-connect"]?.nextAction["en-US"]).toContain(
      "Keep reviewed live-provider evidence attached",
    );
    expect(adminOps.walletProviderQaGate.boundary["en-US"]).toContain("no live wallet SDK connection");
    expect(adminOps.walletProviderQaGate.boundary["zh-CN"]).toContain("奖励发放");
    expect(adminOps.walletProviderQaGate.boundary["zh-TW"]).toContain("獎勵發放");
  });

  it("models release-approved wallet provider evidence intake from the Mission 140 snapshot", () => {
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const intake = adminOps.walletProviderEvidenceIntake;
    const conservativeStandalone = createWalletProviderEvidenceIntake(adminOps.walletProviderQaGate);
    const scenariosById = Object.fromEntries(intake.scenarios.map((scenario) => [scenario.id, scenario]));
    const acceptanceRows = adminOps.deliveryAcceptance.solutionSets.flatMap((solutionSet) => solutionSet.rows);
    const liveWalletAcceptance = acceptanceRows.find((row) => row.id === "v02-live-wallet-provider-evidence");

    expect(conservativeStandalone.summary.approvedScenarios).toBe(0);
    expect(intake.scenarios.map((scenario) => scenario.id)).toEqual([
      "portkey-aa-connect",
      "eoa-extension-connect",
      "extension-not-installed-error",
      "wrong-chain-error",
      "unsupported-wallet-error",
    ]);
    expect(intake.summary).toMatchObject({
      totalScenarios: 5,
      approvedScenarios: 5,
      submittedScenarios: 0,
      missingScenarios: 0,
      rejectedScenarios: 0,
      expiredScenarios: 0,
      releaseBlockers: 0,
      reviewRequiredScenarios: 0,
      topScenarioId: "portkey-aa-connect",
    });
    expect(scenariosById["eoa-extension-connect"]).toMatchObject({
      evidenceStatus: "approved",
      reviewState: "approved",
      releaseImpact: "ready",
      reviewerRole: "internal_operator",
    });
    expect(scenariosById["unsupported-wallet-error"]).toMatchObject({
      evidenceStatus: "approved",
      reviewState: "approved",
      releaseImpact: "ready",
    });
    expect(scenariosById["extension-not-installed-error"]).toMatchObject({
      evidenceStatus: "approved",
      reviewState: "approved",
      releaseImpact: "ready",
    });
    expect(scenariosById["extension-not-installed-error"].expectedArtifacts.map((artifact) => artifact.id)).toEqual([
      "extension-not-installed-error-screenshot",
      "extension-not-installed-error-qa-run",
      "extension-not-installed-error-runbook",
    ]);
    expect(
      intake.scenarios.every((scenario) => scenario.evidenceStatus === "approved" && scenario.releaseImpact === "ready"),
    ).toBe(true);
    expect(scenariosById["eoa-extension-connect"].submittedArtifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          artifactType: "qa_run",
          reference: "local-wallet-qa/eoa-extension-connect/approved-qa_run",
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
      status: "proven",
      evidenceSurface: expect.objectContaining({
        "en-US": expect.stringContaining("Release Readiness"),
      }),
    });
    expect(liveWalletAcceptance?.evidenceSummary["en-US"]).toContain("approved all 5/5 required scenarios");
    expect(liveWalletAcceptance?.nextMissionAction["en-US"]).toContain("Keep all approved wallet provider evidence");
  });

  it("audits release-approved wallet provider evidence without live side effects", () => {
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const audit = adminOps.walletProviderEvidenceApprovalAudit;
    const scenariosById = Object.fromEntries(audit.scenarios.map((scenario) => [scenario.id, scenario]));
    const acceptanceRows = adminOps.deliveryAcceptance.solutionSets.flatMap((solutionSet) => solutionSet.rows);
    const liveWalletAcceptance = acceptanceRows.find((row) => row.id === "v02-live-wallet-provider-evidence");

    expect(audit.summary).toMatchObject({
      totalScenarios: 5,
      approvedScenarios: 5,
      reviewRequiredScenarios: 0,
      blockedScenarios: 0,
      notApplicableScenarios: 0,
      completeArtifactScenarios: 5,
      incompleteArtifactScenarios: 0,
      releaseBlockers: 0,
      topScenarioId: "portkey-aa-connect",
      topFailedRuleId: null,
      topFailedRuleState: null,
    });
    expect(audit.scenarios.map((scenario) => scenario.id)).toEqual([
      "portkey-aa-connect",
      "eoa-extension-connect",
      "extension-not-installed-error",
      "wrong-chain-error",
      "unsupported-wallet-error",
    ]);
    expect(scenariosById["eoa-extension-connect"]).toMatchObject({
      approvalState: "approved",
      failedRuleIds: [],
      reviewerDecision: expect.objectContaining({
        state: "approved",
      }),
      releaseImpact: "ready",
    });
    expect(scenariosById["eoa-extension-connect"].artifactCoverage).toMatchObject({
      requiredArtifactIds: ["eoa-extension-connect-screenshot", "eoa-extension-connect-qa-run"],
      submittedArtifactIds: ["eoa-extension-connect-recovered-screenshot-1", "eoa-extension-connect-recovered-qa_run-2"],
      submittedArtifactReferences: [
        "local-wallet-qa/eoa-extension-connect/approved-screenshot",
        "local-wallet-qa/eoa-extension-connect/approved-qa_run",
      ],
      missingRequiredArtifactIds: [],
      requiredCount: 2,
      submittedRequiredCount: 2,
      optionalCount: 1,
      complete: true,
    });
    expect(scenariosById["unsupported-wallet-error"]).toMatchObject({
      approvalState: "approved",
      failedRuleIds: [],
      reviewerDecision: expect.objectContaining({
        state: "approved",
      }),
      releaseImpact: "ready",
    });
    expect(scenariosById["wrong-chain-error"].artifactCoverage.missingRequiredArtifactIds).toEqual([]);
    expect(scenariosById["extension-not-installed-error"].artifactCoverage.missingRequiredArtifactIds).toEqual([]);
    expect(
      audit.scenarios.every((scenario) => scenario.approvalState === "approved" && scenario.releaseImpact === "ready"),
    ).toBe(true);

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
      status: "proven",
      severity: "high",
      launchBlocking: false,
      evidenceSurface: expect.objectContaining({
        "en-US": expect.stringContaining("Release Readiness"),
      }),
      evidenceSummary: expect.objectContaining({
        "en-US": expect.stringContaining("approved all 5/5 required scenarios"),
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
    const releaseReadiness = createWalletProviderEvidenceReleaseReadiness(audit);
    const scenariosById = Object.fromEntries(audit.scenarios.map((scenario) => [scenario.id, scenario]));

    expect(audit.summary).toMatchObject({
      approvedScenarios: 1,
      reviewRequiredScenarios: 1,
      blockedScenarios: 3,
      completeArtifactScenarios: 1,
      releaseBlockers: 3,
      topScenarioId: "extension-not-installed-error",
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
    expect(releaseReadiness.summary).toMatchObject({
      requiredScenarios: 5,
      approvedRequiredScenarios: 1,
      reviewRequiredScenarios: 1,
      blockedScenarios: 3,
      releaseBlockers: 3,
      ready: false,
      topScenarioId: "extension-not-installed-error",
      topFailedRuleId: "required-artifacts",
    });
    expect(releaseReadiness.scenarios.find((scenario) => scenario.id === "portkey-aa-connect")).toMatchObject({
      requiredForRelease: true,
      releaseState: "ready",
      failedRuleIds: [],
    });
    expect(
      releaseReadiness.scenarios
        .filter((scenario) => scenario.id !== "portkey-aa-connect")
        .every((scenario) => scenario.releaseState !== "ready"),
    ).toBe(true);
  });

  it("derives wallet provider approval audit deterministically", () => {
    const gate = createWalletProviderQaReadinessGate(walletSessions);
    const firstAudit = createWalletProviderEvidenceApprovalAudit(createWalletProviderEvidenceIntake(gate), gate);
    const secondAudit = createWalletProviderEvidenceApprovalAudit(createWalletProviderEvidenceIntake(gate), gate);

    expect(secondAudit).toEqual(firstAudit);
  });

  it("proves wallet provider release readiness only when every required scenario is approved", () => {
    const liveReadyGate = createWalletProviderQaReadinessGate(walletSessions, {
      "eoa-extension-connect": "ready",
      "extension-not-installed-error": "ready",
      "portkey-aa-connect": "ready",
      "unsupported-wallet-error": "ready",
      "wrong-chain-error": "ready",
    });
    const approvedIntake = createWalletProviderEvidenceIntake(
      liveReadyGate,
      Object.fromEntries(
        walletProviderScenarioIds.map((scenarioId) => [
          scenarioId,
          {
            evidenceStatus: "approved",
            submittedArtifacts: approvedWalletProviderArtifacts(scenarioId),
          },
        ]),
      ),
    );
    const audit = createWalletProviderEvidenceApprovalAudit(approvedIntake, liveReadyGate);
    const releaseReadiness = createWalletProviderEvidenceReleaseReadiness(audit);
    const acceptance = createDeliveryAcceptanceConsole(
      releaseReadiness,
      createExportFulfillmentReadiness(campaignDetail),
    );
    const rows = acceptance.solutionSets.flatMap((solutionSet) => solutionSet.rows);
    const liveWalletAcceptance = rows.find((row) => row.id === "v02-live-wallet-provider-evidence");

    expect(releaseReadiness.summary).toMatchObject({
      totalScenarios: 5,
      requiredScenarios: 5,
      approvedRequiredScenarios: 5,
      reviewRequiredScenarios: 0,
      blockedScenarios: 0,
      releaseBlockers: 0,
      ready: true,
      topFailedRuleId: null,
    });
    expect(releaseReadiness.scenarios.every((scenario) => scenario.releaseState === "ready")).toBe(true);
    for (const scenario of releaseReadiness.scenarios) {
      expect(scenario.requiredForRelease).toBe(true);
      expect(scenario.artifactCoverage.complete).toBe(true);
      expect(scenario.failedRuleIds).toEqual([]);
      expect(scenario.boundary["en-US"]).toContain("No live wallet SDK");
      expect(scenario.boundary["en-US"]).toContain("provider API");
      expect(scenario.boundary["en-US"]).toContain("storage write");
      expect(scenario.boundary["en-US"]).toContain("contract write");
      expect(scenario.boundary["en-US"]).toContain("reward distribution");
    }
    expect(liveWalletAcceptance).toMatchObject({
      status: "proven",
      severity: "high",
      launchBlocking: false,
    });
    expect(liveWalletAcceptance?.evidenceSummary["en-US"]).toContain("approved all 5/5 required scenarios");
    expect(acceptance.topResidualGaps.map((row) => row.id)).not.toContain("v02-live-wallet-provider-evidence");
  });

  it("derives wallet provider release readiness deterministically", () => {
    const gate = createWalletProviderQaReadinessGate(walletSessions);
    const firstReleaseReadiness = createWalletProviderEvidenceReleaseReadiness(
      createWalletProviderEvidenceApprovalAudit(createWalletProviderEvidenceIntake(gate), gate),
    );
    const secondReleaseReadiness = createWalletProviderEvidenceReleaseReadiness(
      createWalletProviderEvidenceApprovalAudit(createWalletProviderEvidenceIntake(gate), gate),
    );

    expect(secondReleaseReadiness).toEqual(firstReleaseReadiness);
  });

  it("packages wallet provider evidence closeout as ready for release review by default", () => {
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const closeout = adminOps.walletProviderEvidenceCloseoutPackage;
    const standalone = createWalletProviderEvidenceCloseoutPackage(adminOps.walletProviderEvidenceReleaseReadiness);
    const scenariosById = Object.fromEntries(closeout.scenarios.map((scenario) => [scenario.id, scenario]));
    const acceptanceRows = adminOps.deliveryAcceptance.solutionSets.flatMap((solutionSet) => solutionSet.rows);
    const liveWalletAcceptance = acceptanceRows.find((row) => row.id === "v02-live-wallet-provider-evidence");

    expect(standalone).toEqual(closeout);
    expect(closeout.scenarios.map((scenario) => scenario.id)).toEqual([
      "portkey-aa-connect",
      "eoa-extension-connect",
      "extension-not-installed-error",
      "wrong-chain-error",
      "unsupported-wallet-error",
    ]);
    expect(closeout.summary).toMatchObject({
      totalScenarios: 5,
      requiredScenarios: 5,
      approvedRequiredScenarios: 5,
      readyForReviewScenarios: 5,
      reviewRequiredScenarios: 0,
      blockedScenarios: 0,
      missingRequiredArtifacts: 0,
      attachedEvidenceReferences: 13,
      closeoutBlockers: 0,
      ready: true,
      topScenarioId: "portkey-aa-connect",
      topFailedRuleId: null,
    });
    expect(scenariosById["portkey-aa-connect"]).toMatchObject({
      signoffState: "ready",
      releaseState: "ready",
      approvalState: "approved",
      requiredArtifactCount: 2,
      submittedRequiredArtifactCount: 2,
      missingRequiredArtifactIds: [],
      failedRuleIds: [],
    });
    expect(scenariosById["eoa-extension-connect"]).toMatchObject({
      signoffState: "ready",
      releaseState: "ready",
      approvalState: "approved",
      attachedEvidenceReferences: [
        "local-wallet-qa/eoa-extension-connect/approved-screenshot",
        "local-wallet-qa/eoa-extension-connect/approved-qa_run",
      ],
      missingRequiredArtifactIds: [],
    });
    expect(scenariosById["unsupported-wallet-error"]).toMatchObject({
      signoffState: "ready",
      failedRuleIds: [],
    });
    for (const scenario of closeout.scenarios) {
      expect(scenario.label["en-US"]).toBeTruthy();
      expect(scenario.label["zh-CN"]).toBeTruthy();
      expect(scenario.label["zh-TW"]).toBeTruthy();
      expect(scenario.boundary["en-US"]).toContain("No live wallet SDK");
      expect(scenario.boundary["en-US"]).toContain("provider API");
      expect(scenario.boundary["en-US"]).toContain("storage write");
      expect(scenario.boundary["en-US"]).toContain("contract write");
      expect(scenario.boundary["en-US"]).toContain("reward distribution");
    }
    expect(closeout.boundary["en-US"]).toContain("No live wallet SDK");
    expect(closeout.nextAction).toEqual(closeout.summary.topNextAction);
    expect(liveWalletAcceptance).toMatchObject({
      status: "proven",
      severity: "high",
      launchBlocking: false,
    });
  });

  it("derives wallet provider evidence closeout deterministically", () => {
    const gate = createWalletProviderQaReadinessGate(walletSessions);
    const releaseReadiness = createWalletProviderEvidenceReleaseReadiness(
      createWalletProviderEvidenceApprovalAudit(createWalletProviderEvidenceIntake(gate), gate),
    );
    const firstCloseout = createWalletProviderEvidenceCloseoutPackage(releaseReadiness);
    const secondCloseout = createWalletProviderEvidenceCloseoutPackage(releaseReadiness);

    expect(secondCloseout).toEqual(firstCloseout);
  });

  it("marks wallet provider evidence closeout ready only for all-approved evidence", () => {
    const liveReadyGate = createWalletProviderQaReadinessGate(walletSessions, {
      "eoa-extension-connect": "ready",
      "extension-not-installed-error": "ready",
      "portkey-aa-connect": "ready",
      "unsupported-wallet-error": "ready",
      "wrong-chain-error": "ready",
    });
    const approvedIntake = createWalletProviderEvidenceIntake(
      liveReadyGate,
      Object.fromEntries(
        walletProviderScenarioIds.map((scenarioId) => [
          scenarioId,
          {
            evidenceStatus: "approved",
            submittedArtifacts: approvedWalletProviderArtifacts(scenarioId),
          },
        ]),
      ),
    );
    const releaseReadiness = createWalletProviderEvidenceReleaseReadiness(
      createWalletProviderEvidenceApprovalAudit(approvedIntake, liveReadyGate),
    );
    const closeout = createWalletProviderEvidenceCloseoutPackage(releaseReadiness);

    expect(closeout.summary).toMatchObject({
      totalScenarios: 5,
      requiredScenarios: 5,
      approvedRequiredScenarios: 5,
      readyForReviewScenarios: 5,
      reviewRequiredScenarios: 0,
      blockedScenarios: 0,
      missingRequiredArtifacts: 0,
      attachedEvidenceReferences: 13,
      closeoutBlockers: 0,
      ready: true,
      topFailedRuleId: null,
    });
    expect(closeout.scenarios.every((scenario) => scenario.signoffState === "ready")).toBe(true);
    for (const scenario of closeout.scenarios) {
      expect(scenario.requiredForRelease).toBe(true);
      expect(scenario.missingRequiredArtifactIds).toEqual([]);
      expect(scenario.failedRuleIds).toEqual([]);
      expect(scenario.attachedEvidenceReferences.length).toBeGreaterThanOrEqual(2);
      expect(scenario.boundary["en-US"]).toContain("No live wallet SDK");
    }
    expect(closeout.nextAction["en-US"]).toContain("ready for release review");
  });

  it("builds a wallet provider evidence request packet ready for release review by default", () => {
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const packet = adminOps.walletProviderEvidenceRequestPacket;
    const standalone = createWalletProviderEvidenceRequestPacket(adminOps.walletProviderEvidenceCloseoutPackage);
    const scenariosById = Object.fromEntries(packet.scenarios.map((scenario) => [scenario.id, scenario]));
    const acceptanceRows = adminOps.deliveryAcceptance.solutionSets.flatMap((solutionSet) => solutionSet.rows);
    const liveWalletAcceptance = acceptanceRows.find((row) => row.id === "v02-live-wallet-provider-evidence");

    expect(standalone).toEqual(packet);
    expect(packet.scenarios.map((scenario) => scenario.id)).toEqual([
      "portkey-aa-connect",
      "eoa-extension-connect",
      "extension-not-installed-error",
      "wrong-chain-error",
      "unsupported-wallet-error",
    ]);
    expect(packet.summary).toMatchObject({
      totalRequests: 5,
      readyRequests: 5,
      reviewRequiredRequests: 0,
      blockedRequests: 0,
      notApplicableRequests: 0,
      missingRequiredArtifacts: 0,
      attachedEvidenceReferences: 13,
      launchBlockingRequests: 0,
      ready: true,
      topScenarioId: "portkey-aa-connect",
      topFailedRuleId: null,
    });
    expect(packet.scenarios[0]).toMatchObject({
      id: "portkey-aa-connect",
      priority: 1,
      requestStatus: "ready",
      requiredForRelease: true,
      targetEvidencePath: "wallet-provider-evidence/portkey-aa-connect/",
      ownerRole: "internal_operator",
      reviewerRole: "internal_operator",
      requiredArtifactIds: ["portkey-aa-connect-screenshot", "portkey-aa-connect-qa-run"],
      missingRequiredArtifactIds: [],
      failedRuleIds: [],
    });
    expect(scenariosById["eoa-extension-connect"]).toMatchObject({
      priority: 2,
      requestStatus: "ready",
      attachedEvidenceReferences: [
        "local-wallet-qa/eoa-extension-connect/approved-screenshot",
        "local-wallet-qa/eoa-extension-connect/approved-qa_run",
      ],
      missingRequiredArtifactIds: [],
      targetEvidencePath: "wallet-provider-evidence/eoa-extension-connect/",
    });
    expect(scenariosById["eoa-extension-connect"].acceptanceCriteria["en-US"]).toContain(
      "approved",
    );
    expect(scenariosById["eoa-extension-connect"].qaCaptureInstructions["en-US"]).toContain(
      "without using the app to upload or execute wallet operations",
    );
    for (const scenario of packet.scenarios) {
      expect(scenario.label["en-US"]).toBeTruthy();
      expect(scenario.label["zh-CN"]).toBeTruthy();
      expect(scenario.label["zh-TW"]).toBeTruthy();
      expect(scenario.acceptanceCriteria["en-US"]).toBeTruthy();
      expect(scenario.qaCaptureInstructions["zh-CN"]).toBeTruthy();
      expect(scenario.targetEvidencePath).toBe(`wallet-provider-evidence/${scenario.id}/`);
      expect(scenario.boundary["en-US"]).toContain("No live wallet SDK");
      expect(scenario.boundary["en-US"]).toContain("provider API");
      expect(scenario.boundary["en-US"]).toContain("storage write");
      expect(scenario.boundary["en-US"]).toContain("contract write");
      expect(scenario.boundary["en-US"]).toContain("reward distribution");
    }
    expect(packet.boundary["en-US"]).toContain("No live wallet SDK");
    expect(packet.nextAction).toEqual(packet.summary.topNextAction);
    expect(liveWalletAcceptance).toMatchObject({
      status: "proven",
      severity: "high",
      launchBlocking: false,
    });
  });

  it("derives wallet provider evidence request packet deterministically", () => {
    const gate = createWalletProviderQaReadinessGate(walletSessions);
    const releaseReadiness = createWalletProviderEvidenceReleaseReadiness(
      createWalletProviderEvidenceApprovalAudit(createWalletProviderEvidenceIntake(gate), gate),
    );
    const closeout = createWalletProviderEvidenceCloseoutPackage(releaseReadiness);
    const firstPacket = createWalletProviderEvidenceRequestPacket(closeout);
    const secondPacket = createWalletProviderEvidenceRequestPacket(closeout);

    expect(secondPacket).toEqual(firstPacket);
  });

  it("marks wallet provider evidence request packet ready only for all-approved evidence", () => {
    const liveReadyGate = createWalletProviderQaReadinessGate(walletSessions, {
      "eoa-extension-connect": "ready",
      "extension-not-installed-error": "ready",
      "portkey-aa-connect": "ready",
      "unsupported-wallet-error": "ready",
      "wrong-chain-error": "ready",
    });
    const approvedIntake = createWalletProviderEvidenceIntake(
      liveReadyGate,
      Object.fromEntries(
        walletProviderScenarioIds.map((scenarioId) => [
          scenarioId,
          {
            evidenceStatus: "approved",
            submittedArtifacts: approvedWalletProviderArtifacts(scenarioId),
          },
        ]),
      ),
    );
    const releaseReadiness = createWalletProviderEvidenceReleaseReadiness(
      createWalletProviderEvidenceApprovalAudit(approvedIntake, liveReadyGate),
    );
    const closeout = createWalletProviderEvidenceCloseoutPackage(releaseReadiness);
    const packet = createWalletProviderEvidenceRequestPacket(closeout);

    expect(packet.summary).toMatchObject({
      totalRequests: 5,
      readyRequests: 5,
      reviewRequiredRequests: 0,
      blockedRequests: 0,
      missingRequiredArtifacts: 0,
      attachedEvidenceReferences: 13,
      launchBlockingRequests: 0,
      ready: true,
      topFailedRuleId: null,
    });
    expect(packet.scenarios.every((scenario) => scenario.requestStatus === "ready")).toBe(true);
    for (const scenario of packet.scenarios) {
      expect(scenario.requiredForRelease).toBe(true);
      expect(scenario.missingRequiredArtifactIds).toEqual([]);
      expect(scenario.failedRuleIds).toEqual([]);
      expect(scenario.acceptanceCriteria["en-US"]).toContain("approved");
      expect(scenario.boundary["en-US"]).toContain("No live wallet SDK");
    }
    expect(packet.nextAction["en-US"]).toContain("ready for release review");
  });

  it("derives wallet provider evidence activation ready from the release-approved request packet", () => {
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const activation = adminOps.walletProviderEvidenceActivation;
    const standalone = createWalletProviderEvidenceActivation(
      adminOps.walletProviderEvidenceRequestPacket,
      adminOps.walletProviderEvidenceReleaseReadiness,
    );
    const liveWalletAcceptance = adminOps.deliveryAcceptance.solutionSets
      .flatMap((solutionSet) => solutionSet.rows)
      .find((row) => row.id === "v02-live-wallet-provider-evidence");

    expect(standalone).toEqual(activation);
    expect(activation.scenarios.map((scenario) => scenario.id)).toEqual([
      "portkey-aa-connect",
      "eoa-extension-connect",
      "extension-not-installed-error",
      "wrong-chain-error",
      "unsupported-wallet-error",
    ]);
    expect(activation.summary).toMatchObject({
      totalScenarios: 5,
      readyScenarios: 5,
      blockedScenarios: 0,
      reviewRequiredScenarios: 0,
      missingArtifactTypeCount: 0,
      approvedFeatureGates: 5,
      reviewerApprovedScenarios: 5,
      ready: true,
      topScenarioId: "portkey-aa-connect",
      topBlockerId: null,
    });
    expect(activation.scenarios[0]).toMatchObject({
      id: "portkey-aa-connect",
      activationState: "ready",
      featureGateState: "approved",
      reviewerState: "approved",
      releaseState: "ready",
      liveEvidenceStatus: "ready",
      requiredArtifactTypes: ["screenshot", "qa_run"],
      missingArtifactTypes: [],
      blockerIds: [],
    });
    expect(activation.scenarios.find((scenario) => scenario.id === "eoa-extension-connect")).toMatchObject({
      activationState: "ready",
      featureGateState: "approved",
      reviewerState: "approved",
      releaseState: "ready",
      liveEvidenceStatus: "ready",
      submittedArtifacts: expect.arrayContaining([
        expect.objectContaining({
          artifactType: "qa_run",
          reference: "local-wallet-qa/eoa-extension-connect/approved-qa_run",
          status: "approved",
        }),
      ]),
    });
    expect(liveWalletAcceptance).toMatchObject({
      status: "proven",
      launchBlocking: false,
    });
  });

  it("marks wallet provider evidence activation ready only for all-approved local projection", () => {
    const liveReadyGate = createWalletProviderQaReadinessGate(walletSessions, {
      "eoa-extension-connect": "ready",
      "extension-not-installed-error": "ready",
      "portkey-aa-connect": "ready",
      "unsupported-wallet-error": "ready",
      "wrong-chain-error": "ready",
    });
    const approvedIntake = createWalletProviderEvidenceIntake(
      liveReadyGate,
      Object.fromEntries(
        walletProviderScenarioIds.map((scenarioId) => [
          scenarioId,
          {
            evidenceStatus: "approved",
            submittedArtifacts: approvedWalletProviderArtifacts(scenarioId),
          },
        ]),
      ),
    );
    const releaseReadiness = createWalletProviderEvidenceReleaseReadiness(
      createWalletProviderEvidenceApprovalAudit(approvedIntake, liveReadyGate),
    );
    const closeout = createWalletProviderEvidenceCloseoutPackage(releaseReadiness);
    const requestPacket = createWalletProviderEvidenceRequestPacket(closeout);
    const activation = createWalletProviderEvidenceActivation(requestPacket, releaseReadiness);

    expect(activation.summary).toMatchObject({
      totalScenarios: 5,
      readyScenarios: 5,
      blockedScenarios: 0,
      reviewRequiredScenarios: 0,
      missingArtifactTypeCount: 0,
      approvedFeatureGates: 5,
      reviewerApprovedScenarios: 5,
      ready: true,
      topBlockerId: null,
    });
    expect(activation.scenarios.every((scenario) => scenario.activationState === "ready")).toBe(true);
    for (const scenario of activation.scenarios) {
      expect(scenario.blockerIds).toEqual([]);
      expect(scenario.featureGateState).toBe("approved");
      expect(scenario.reviewerState).toBe("approved");
      expect(scenario.liveEvidenceStatus).toBe("ready");
      expect(scenario.releaseState).toBe("ready");
      expect(scenario.missingArtifactTypes).toEqual([]);
      expect(scenario.submittedArtifacts.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("derives wallet provider evidence activation deterministically without mutating inputs", () => {
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const requestPacket = structuredClone(adminOps.walletProviderEvidenceRequestPacket);
    const releaseReadiness = structuredClone(adminOps.walletProviderEvidenceReleaseReadiness);
    const first = createWalletProviderEvidenceActivation(requestPacket, releaseReadiness);
    const second = createWalletProviderEvidenceActivation(requestPacket, releaseReadiness);

    expect(second).toEqual(first);
    expect(requestPacket).toEqual(adminOps.walletProviderEvidenceRequestPacket);
    expect(releaseReadiness).toEqual(adminOps.walletProviderEvidenceReleaseReadiness);
  });

  it("keeps wallet provider evidence activation localized and free of unsafe live-operation fields", () => {
    const activation = createAdminOpsReadModel(campaignDetail).walletProviderEvidenceActivation;

    for (const scenario of activation.scenarios) {
      for (const localizedField of [
        scenario.title,
        scenario.dependency,
        scenario.evidenceNeeded,
        scenario.boundary,
        scenario.nextAction,
      ]) {
        expect(localizedField["en-US"]).toBeTruthy();
        expect(localizedField["zh-CN"]).toBeTruthy();
        expect(localizedField["zh-TW"]).toBeTruthy();
      }
      expect(scenario.boundary["en-US"]).toContain("No live wallet SDK");
      expect(scenario.boundary["en-US"]).toContain("provider call");
      expect(scenario.boundary["en-US"]).toContain("signature");
      expect(scenario.boundary["en-US"]).toContain("contract write");
      expect(scenario.boundary["en-US"]).toContain("storage write");
      expect(scenario.boundary["en-US"]).toContain("export file");
      expect(scenario.boundary["en-US"]).toContain("reward custody");
      expect(scenario.boundary["en-US"]).toContain("reward distribution");
    }

    for (const unsafeTerm of [
      "privateKey",
      "seedPhrase",
      "recoveryPhrase",
      "oauthToken",
      "apiKey",
      "rawSignature",
      "signedPayload",
      "transactionId",
      "contractWrite",
      "downloadUrl",
      "fileUrl",
      "providerCredential",
      "rewardDistribution",
    ]) {
      expect(hasOwnKeyDeep(activation, unsafeTerm)).toBe(false);
      expect(containsTextDeep(activation, unsafeTerm)).toBe(false);
    }
  });

  it("executes local wallet provider evidence review actions without mutating source intake or live boundaries", () => {
    const gate = createWalletProviderQaReadinessGate(walletSessions);
    const intake = createWalletProviderEvidenceIntake(gate);
    const originalIntake = structuredClone(intake);
    const references: WalletProviderEvidenceReviewArtifactReference[] = [
      {
        artifactType: "screenshot",
        reference: "local-wallet-qa/portkey-aa-connect/screenshot-2026-07-03",
      },
      {
        artifactType: "qa_run",
        reference: "local-wallet-qa/portkey-aa-connect/run-2026-07-03",
      },
    ];

    const submitted = executeWalletProviderEvidenceReviewAction(campaignDetail, intake, gate, {
      actionId: "submit_evidence",
      artifactReferences: references,
      executedAt: "2026-07-03T21:10:00Z",
      reviewer: "internal_operator",
      scenarioId: "portkey-aa-connect",
    });

    expect(submitted.ok).toBe(true);
    expect(intake).toEqual(originalIntake);
    expect(submitted.auditTrail).toMatchObject({
      actionId: "submit_evidence",
      contractWriteExecuted: false,
      exportFileGenerated: false,
      externalProviderCalled: false,
      fileUploaded: false,
      rewardDistributed: false,
      signatureRequested: false,
      storageWriteExecuted: false,
      walletSdkExecuted: false,
    });
    expect(submitted.updatedIntake.scenarios.find((scenario) => scenario.id === "portkey-aa-connect")).toMatchObject({
      evidenceStatus: "submitted",
      reviewState: "in_review",
      releaseImpact: "review_required",
      submittedArtifacts: expect.arrayContaining([
        expect.objectContaining({
          artifactType: "screenshot",
          reference: "local-wallet-qa/portkey-aa-connect/screenshot-2026-07-03",
        }),
        expect.objectContaining({
          artifactType: "qa_run",
          reference: "local-wallet-qa/portkey-aa-connect/run-2026-07-03",
        }),
      ]),
    });
    expect(submitted.releaseReadiness.summary).toMatchObject({
      approvedRequiredScenarios: 0,
      ready: false,
    });
    expect(submitted.actions.find((action) => action.id === "approve_evidence")).toMatchObject({
      state: "available",
    });
    expect(submitted.actions.find((action) => action.id === "submit_evidence")).toMatchObject({
      state: "completed",
    });
    expect(
      submitted.deliveryAcceptance.solutionSets
        .flatMap((solutionSet) => solutionSet.rows)
        .find((row) => row.id === "v02-live-wallet-provider-evidence"),
    ).toMatchObject({
      status: "needs_live_evidence",
      launchBlocking: true,
    });
    expect(submitted.boundary["en-US"]).toContain("No live wallet SDK");
    expect(executeWalletProviderEvidenceReviewAction(campaignDetail, intake, gate, {
      actionId: "submit_evidence",
      artifactReferences: references,
      executedAt: "2026-07-03T21:10:00Z",
      reviewer: "internal_operator",
      scenarioId: "portkey-aa-connect",
    })).toEqual(submitted);
  });

  it("blocks incomplete wallet provider evidence approval and preserves projections", () => {
    const gate = createWalletProviderQaReadinessGate(walletSessions);
    const intake = createWalletProviderEvidenceIntake(gate);
    const attempted = executeWalletProviderEvidenceReviewAction(campaignDetail, intake, gate, {
      actionId: "approve_evidence",
      scenarioId: "portkey-aa-connect",
    });

    expect(attempted).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "ACTION_BLOCKED", field: "actionId" }),
      updatedIntake: intake,
    });
    expect(attempted.releaseReadiness.summary).toMatchObject({
      approvedRequiredScenarios: 0,
      blockedScenarios: 4,
      ready: false,
      reviewRequiredScenarios: 1,
    });
    expect(attempted.actions.find((action) => action.id === "approve_evidence")).toMatchObject({
      state: "blocked",
      blockedReason: expect.objectContaining({
        "en-US": expect.stringContaining("Approval requires"),
      }),
    });
  });

  it("approves one wallet provider scenario without proving the whole delivery acceptance gate", () => {
    const gate = createWalletProviderQaReadinessGate(walletSessions);
    const submitted = executeWalletProviderEvidenceReviewAction(campaignDetail, createWalletProviderEvidenceIntake(gate), gate, {
      actionId: "submit_evidence",
      artifactReferences: [
        {
          artifactType: "screenshot",
          reference: "local-wallet-qa/portkey-aa-connect/screenshot-2026-07-03",
        },
        {
          artifactType: "qa_run",
          reference: "local-wallet-qa/portkey-aa-connect/run-2026-07-03",
        },
      ],
      scenarioId: "portkey-aa-connect",
    });
    const approved = executeWalletProviderEvidenceReviewAction(campaignDetail, submitted.updatedIntake, gate, {
      actionId: "approve_evidence",
      executedAt: "2026-07-03T21:20:00Z",
      scenarioId: "portkey-aa-connect",
    });
    const liveWalletAcceptance = approved.deliveryAcceptance.solutionSets
      .flatMap((solutionSet) => solutionSet.rows)
      .find((row) => row.id === "v02-live-wallet-provider-evidence");

    expect(approved.ok).toBe(true);
    expect(approved.updatedIntake.scenarios.find((scenario) => scenario.id === "portkey-aa-connect")).toMatchObject({
      evidenceStatus: "approved",
      reviewState: "approved",
      releaseImpact: "ready",
    });
    expect(approved.approvalAudit.scenarios.find((scenario) => scenario.id === "portkey-aa-connect")).toMatchObject({
      approvalState: "approved",
      failedRuleIds: [],
      releaseImpact: "ready",
    });
    expect(approved.releaseReadiness.summary).toMatchObject({
      approvedRequiredScenarios: 1,
      requiredScenarios: 5,
      ready: false,
    });
    expect(liveWalletAcceptance).toMatchObject({
      status: "needs_live_evidence",
      launchBlocking: true,
    });
    expect(approved.auditTrail.mutatedEvidence).toBe(true);
    expect(approved.auditTrail.walletSdkExecuted).toBe(false);
  });

  it("rejects and reopens wallet provider evidence with replacement references", () => {
    const gate = createWalletProviderQaReadinessGate(walletSessions);
    const intake = createWalletProviderEvidenceIntake(gate);
    const rejectedScenario = intake.scenarios.find((scenario) => scenario.id === "unsupported-wallet-error");

    expect(rejectedScenario).toMatchObject({
      evidenceStatus: "rejected",
      reviewState: "rejected",
    });

    const reopened = executeWalletProviderEvidenceReviewAction(campaignDetail, intake, gate, {
      actionId: "reopen_evidence",
      artifactReferences: [
        {
          artifactType: "screenshot",
          reference: "local-wallet-qa/unsupported-wallet/replacement-screenshot",
        },
        {
          artifactType: "qa_run",
          reference: "local-wallet-qa/unsupported-wallet/replacement-run",
        },
        {
          artifactType: "runbook",
          reference: "local-wallet-qa/unsupported-wallet/replacement-runbook",
        },
      ],
      reason: "Replacement fallback evidence captured locally.",
      scenarioId: "unsupported-wallet-error",
    });

    expect(reopened.ok).toBe(true);
    expect(reopened.updatedIntake.scenarios.find((scenario) => scenario.id === "unsupported-wallet-error")).toMatchObject({
      evidenceStatus: "submitted",
      reviewState: "in_review",
      submittedArtifacts: [
        expect.objectContaining({ reference: "local-wallet-qa/unsupported-wallet/replacement-screenshot" }),
        expect.objectContaining({ reference: "local-wallet-qa/unsupported-wallet/replacement-run" }),
        expect.objectContaining({ reference: "local-wallet-qa/unsupported-wallet/replacement-runbook" }),
      ],
    });
    expect(reopened.approvalAudit.scenarios.find((scenario) => scenario.id === "unsupported-wallet-error")).toMatchObject({
      approvalState: "review_required",
      failedRuleIds: ["reviewer-approval", "live-evidence-status"],
      reviewerDecision: expect.objectContaining({ state: "in_review" }),
    });

    const rejected = executeWalletProviderEvidenceReviewAction(campaignDetail, reopened.updatedIntake, gate, {
      actionId: "reject_evidence",
      reason: "Runbook does not match unsupported-provider fallback copy.",
      scenarioId: "unsupported-wallet-error",
    });

    expect(rejected.ok).toBe(true);
    expect(rejected.updatedIntake.scenarios.find((scenario) => scenario.id === "unsupported-wallet-error")).toMatchObject({
      evidenceStatus: "rejected",
      nextAction: expect.objectContaining({
        "en-US": "Runbook does not match unsupported-provider fallback copy.",
      }),
      submittedArtifacts: [
        expect.objectContaining({ reference: "local-wallet-qa/unsupported-wallet/replacement-screenshot" }),
        expect.objectContaining({ reference: "local-wallet-qa/unsupported-wallet/replacement-run" }),
        expect.objectContaining({ reference: "local-wallet-qa/unsupported-wallet/replacement-runbook" }),
      ],
    });
    expect(rejected.actions.find((action) => action.id === "reopen_evidence")).toMatchObject({
      state: "available",
    });
  });

  it("proves returned wallet provider projections after all local scenarios are approved", () => {
    const gate = createWalletProviderQaReadinessGate(walletSessions);
    const completed = walletProviderScenarioIds.reduce((current, scenarioId) => {
      const submitted = executeWalletProviderEvidenceReviewAction(campaignDetail, current.updatedIntake, gate, {
        actionId: "submit_evidence",
        artifactReferences: approvedWalletProviderArtifacts(scenarioId).map((artifact) => ({
          artifactType: artifact.artifactType,
          reference: artifact.reference ?? artifact.id,
        })),
        replaceEvidence: true,
        scenarioId,
      });

      expect(submitted.ok).toBe(true);

      const approved = executeWalletProviderEvidenceReviewAction(campaignDetail, submitted.updatedIntake, gate, {
        actionId: "approve_evidence",
        scenarioId,
      });

      expect(approved.ok).toBe(true);

      return approved;
    }, executeWalletProviderEvidenceReviewAction(
      campaignDetail,
      createWalletProviderEvidenceIntake(gate),
      gate,
      {
        actionId: "submit_evidence",
        artifactReferences: [],
        scenarioId: "portkey-aa-connect",
      },
    ));
    const finalResult = completed;
    const liveWalletAcceptance = finalResult.deliveryAcceptance.solutionSets
      .flatMap((solutionSet) => solutionSet.rows)
      .find((row) => row.id === "v02-live-wallet-provider-evidence");

    expect(finalResult.ok).toBe(true);
    expect(finalResult.releaseReadiness.summary).toMatchObject({
      approvedRequiredScenarios: 5,
      blockedScenarios: 0,
      ready: true,
      releaseBlockers: 0,
      requiredScenarios: 5,
      reviewRequiredScenarios: 0,
    });
    expect(finalResult.requestPacket.summary).toMatchObject({
      ready: true,
      readyRequests: 5,
      launchBlockingRequests: 0,
    });
    expect(liveWalletAcceptance).toMatchObject({
      status: "proven",
      launchBlocking: false,
    });
    expect(finalResult.boundary["en-US"]).toContain("No live wallet SDK");
    expect(finalResult.auditTrail).toMatchObject({
      contractWriteExecuted: false,
      exportFileGenerated: false,
      externalProviderCalled: false,
      fileUploaded: false,
      rewardDistributed: false,
      signatureRequested: false,
      storageWriteExecuted: false,
      walletSdkExecuted: false,
    });
  });

  it("returns stable errors for unsupported wallet provider evidence actions and scenarios", () => {
    const gate = createWalletProviderQaReadinessGate(walletSessions);
    const intake = createWalletProviderEvidenceIntake(gate);
    const unsupportedAction = executeWalletProviderEvidenceReviewAction(campaignDetail, intake, gate, {
      actionId: "connect_live_wallet" as never,
      scenarioId: "portkey-aa-connect",
    });
    const unsupportedScenario = executeWalletProviderEvidenceReviewAction(campaignDetail, intake, gate, {
      actionId: "submit_evidence",
      scenarioId: "nightelf-live-connect" as never,
    });

    expect(unsupportedAction).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "UNSUPPORTED_ACTION", field: "actionId" }),
      updatedIntake: intake,
    });
    expect(unsupportedScenario).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "UNSUPPORTED_SCENARIO", field: "scenarioId" }),
      updatedIntake: intake,
    });
    expect(unsupportedAction.auditTrail.externalProviderCalled).toBe(false);
    expect(unsupportedScenario.auditTrail.walletSdkExecuted).toBe(false);
  });

  it("recovers seeded wallet provider evidence state conservatively by default", () => {
    const gate = createWalletProviderQaReadinessGate(walletSessions);
    const defaultRecovery = createDefaultWalletProviderEvidenceRecoveryResult(campaignDetail, gate);
    const recovered = recoverWalletProviderEvidenceState(campaignDetail, gate);
    const liveWalletAcceptance = recovered.deliveryAcceptance.solutionSets
      .flatMap((solutionSet) => solutionSet.rows)
      .find((row) => row.id === "v02-live-wallet-provider-evidence");

    expect(recovered).toEqual(defaultRecovery);
    expect(recovered).toMatchObject({
      campaignId: campaignDetail.id,
      source: "seeded_default",
      status: "seeded_default",
      snapshot: null,
      validationErrors: [],
      storage: {
        state: "not_requested",
      },
    });
    expect(recovered.releaseReadiness.summary).toMatchObject({
      approvedRequiredScenarios: 0,
      blockedScenarios: 4,
      ready: false,
      requiredScenarios: 5,
      reviewRequiredScenarios: 1,
    });
    expect(recovered.requestPacket.summary).toMatchObject({
      ready: false,
      readyRequests: 0,
      launchBlockingRequests: 4,
    });
    expect(liveWalletAcceptance).toMatchObject({
      status: "needs_live_evidence",
      launchBlocking: true,
    });
  });

  it("derives wallet provider evidence startup recovery state from storage reads", () => {
    const snapshot = createWalletProviderEvidenceAllApprovedSampleSnapshot("2026-07-04T00:00:00Z");

    expect(createWalletProviderEvidenceRecoveryInitialUiState(
      {
        snapshot,
        storageState: "available",
      },
      "2026-07-04T01:00:00Z",
    )).toEqual({
      lastRecoveredAt: "2026-07-04T01:00:00Z",
      snapshot,
      source: "local_storage",
      storageState: "available",
    });
    expect(createWalletProviderEvidenceRecoveryInitialUiState(
      {
        snapshot: null,
        storageState: "available",
      },
      "2026-07-04T01:00:00Z",
    )).toMatchObject({
      lastRecoveredAt: "2026-07-04T01:00:00Z",
      snapshot: null,
      source: "seeded_default",
      storageState: "available",
    });
    expect(createWalletProviderEvidenceRecoveryInitialUiState(
      {
        snapshot,
        storageState: "read_failed",
      },
      "2026-07-04T01:00:00Z",
    )).toMatchObject({
      lastRecoveredAt: "2026-07-04T01:00:00Z",
      snapshot,
      source: "seeded_default",
      storageState: "read_failed",
    });
  });

  it("restores an all-approved local wallet provider evidence snapshot to 5/5 readiness", () => {
    const gate = createWalletProviderQaReadinessGate(walletSessions);
    const snapshot = createWalletProviderEvidenceAllApprovedSampleSnapshot("2026-07-04T00:00:00Z");
    const recovered = recoverWalletProviderEvidenceState(campaignDetail, gate, snapshot, {
      source: "local_sample",
      storageState: "available",
      storageKey: "campaign-os.wallet-provider-evidence",
    });
    const liveWalletAcceptance = recovered.deliveryAcceptance.solutionSets
      .flatMap((solutionSet) => solutionSet.rows)
      .find((row) => row.id === "v02-live-wallet-provider-evidence");

    expect(validateWalletProviderEvidenceRecoverySnapshot(snapshot)).toEqual([]);
    expect(recovered).toMatchObject({
      source: "local_sample",
      status: "restored",
      storage: {
        state: "available",
        storageKey: "campaign-os.wallet-provider-evidence",
      },
      validationErrors: [],
    });
    expect(recovered.intake.summary).toMatchObject({
      approvedScenarios: 5,
      submittedScenarios: 0,
      missingScenarios: 0,
      releaseBlockers: 0,
    });
    expect(recovered.releaseReadiness.summary).toMatchObject({
      approvedRequiredScenarios: 5,
      blockedScenarios: 0,
      ready: true,
      releaseBlockers: 0,
      requiredScenarios: 5,
      reviewRequiredScenarios: 0,
      topFailedRuleId: null,
    });
    expect(recovered.requestPacket.summary).toMatchObject({
      ready: true,
      readyRequests: 5,
      launchBlockingRequests: 0,
      missingRequiredArtifacts: 0,
    });
    expect(liveWalletAcceptance).toMatchObject({
      status: "proven",
      launchBlocking: false,
    });
    expect(recovered.boundary["en-US"]).toContain("No live wallet SDK");
  });

  it("falls back for unsupported wallet provider recovery snapshot versions", () => {
    const gate = createWalletProviderQaReadinessGate(walletSessions);
    const snapshot = {
      ...createWalletProviderEvidenceAllApprovedSampleSnapshot(),
      version: 2,
    };
    const initialState = createWalletProviderEvidenceRecoveryInitialUiState(
      {
        snapshot,
        storageState: "available",
      },
      "2026-07-04T01:00:00Z",
    );
    const recovered = recoverWalletProviderEvidenceState(
      campaignDetail,
      gate,
      initialState.snapshot,
      {
        source: initialState.source,
        storageState: initialState.storageState,
      },
    );

    expect(recovered.status).toBe("fallback_invalid_snapshot");
    expect(recovered.source).toBe("local_storage");
    expect(recovered.validationErrors).toEqual([
      expect.objectContaining({
        code: "UNSUPPORTED_VERSION",
        field: "version",
      }),
    ]);
    expect(recovered.releaseReadiness.summary).toMatchObject({
      approvedRequiredScenarios: 0,
      ready: false,
    });
    expect(recovered.deliveryAcceptance.solutionSets
      .flatMap((solutionSet) => solutionSet.rows)
      .find((row) => row.id === "v02-live-wallet-provider-evidence")).toMatchObject({
        status: "needs_live_evidence",
        launchBlocking: true,
      });
  });

  it("falls back for unknown wallet provider evidence recovery scenario ids", () => {
    const gate = createWalletProviderQaReadinessGate(walletSessions);
    const snapshot = createWalletProviderEvidenceAllApprovedSampleSnapshot();
    snapshot.scenarios[0] = {
      ...snapshot.scenarios[0],
      scenarioId: "nightelf-live-connect",
    };
    const recovered = recoverWalletProviderEvidenceState(campaignDetail, gate, snapshot);

    expect(recovered.status).toBe("fallback_invalid_snapshot");
    expect(recovered.validationErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNKNOWN_SCENARIO",
          field: "scenarios[0].scenarioId",
          scenarioId: "nightelf-live-connect",
        }),
        expect.objectContaining({
          code: "MISSING_REQUIRED_SCENARIO",
          scenarioId: "portkey-aa-connect",
        }),
      ]),
    );
    expect(recovered.releaseReadiness.summary).toMatchObject({
      approvedRequiredScenarios: 0,
      ready: false,
    });
  });

  it("falls back for incomplete required wallet provider recovery coverage", () => {
    const gate = createWalletProviderQaReadinessGate(walletSessions);
    const snapshot = createWalletProviderEvidenceAllApprovedSampleSnapshot();
    snapshot.scenarios = snapshot.scenarios.filter((scenario) => scenario.scenarioId !== "wrong-chain-error");
    const recovered = recoverWalletProviderEvidenceState(campaignDetail, gate, snapshot);

    expect(recovered.status).toBe("fallback_invalid_snapshot");
    expect(recovered.validationErrors).toEqual([
      expect.objectContaining({
        code: "MISSING_REQUIRED_SCENARIO",
        scenarioId: "wrong-chain-error",
      }),
    ]);
    expect(recovered.releaseReadiness.summary).toMatchObject({
      approvedRequiredScenarios: 0,
      ready: false,
    });
  });

  it("keeps partial valid wallet provider recovery snapshots not-ready", () => {
    const gate = createWalletProviderQaReadinessGate(walletSessions);
    const snapshot = serializeWalletProviderEvidenceRecoverySnapshot(
      createWalletProviderEvidenceIntake(gate, {
        "portkey-aa-connect": {
          evidenceStatus: "approved",
          submittedArtifacts: approvedWalletProviderArtifacts("portkey-aa-connect"),
        },
      }),
      "in_memory_action",
      "2026-07-04T01:00:00Z",
    );
    const recovered = recoverWalletProviderEvidenceState(campaignDetail, gate, snapshot);
    const liveWalletAcceptance = recovered.deliveryAcceptance.solutionSets
      .flatMap((solutionSet) => solutionSet.rows)
      .find((row) => row.id === "v02-live-wallet-provider-evidence");

    expect(validateWalletProviderEvidenceRecoverySnapshot(snapshot)).toEqual([]);
    expect(recovered.status).toBe("restored");
    expect(recovered.releaseReadiness.summary).toMatchObject({
      approvedRequiredScenarios: 1,
      requiredScenarios: 5,
      ready: false,
    });
    expect(recovered.requestPacket.summary).toMatchObject({
      ready: false,
      readyRequests: 1,
      launchBlockingRequests: 3,
    });
    expect(liveWalletAcceptance).toMatchObject({
      status: "needs_live_evidence",
      launchBlocking: true,
    });
  });

  it("recovers wallet provider evidence snapshots deterministically without mutating input", () => {
    const gate = createWalletProviderQaReadinessGate(walletSessions);
    const snapshot = createWalletProviderEvidenceAllApprovedSampleSnapshot();
    const originalSnapshot = structuredClone(snapshot);
    const first = recoverWalletProviderEvidenceState(campaignDetail, gate, snapshot);
    const second = recoverWalletProviderEvidenceState(campaignDetail, gate, snapshot);

    expect(second).toEqual(first);
    expect(snapshot).toEqual(originalSnapshot);
  });

  it("preserves wallet provider recovery no-live boundaries and localized labels", () => {
    const gate = createWalletProviderQaReadinessGate(walletSessions);
    const recovered = recoverWalletProviderEvidenceState(
      campaignDetail,
      gate,
      createWalletProviderEvidenceAllApprovedSampleSnapshot(),
    );
    const boundaryText = recovered.boundary["en-US"];

    for (const forbiddenBoundary of [
      "No live wallet SDK",
      "provider API",
      "file upload",
      "storage write",
      "contract write",
      "export file",
      "reward custody",
      "reward distribution",
    ]) {
      expect(boundaryText).toContain(forbiddenBoundary);
    }

    for (const scenario of recovered.intake.scenarios) {
      expect(scenario.label["en-US"]).toBeTruthy();
      expect(scenario.label["zh-CN"]).toBeTruthy();
      expect(scenario.label["zh-TW"]).toBeTruthy();
      expect(scenario.boundary["en-US"]).toContain("No live wallet SDK");
      expect(scenario.boundary["zh-CN"]).toContain("不会执行实时钱包 SDK");
      expect(scenario.boundary["zh-TW"]).toContain("不會執行即時錢包 SDK");
    }
    for (const scenario of recovered.requestPacket.scenarios) {
      expect(scenario.acceptanceCriteria["en-US"]).toBeTruthy();
      expect(scenario.acceptanceCriteria["zh-CN"]).toBeTruthy();
      expect(scenario.acceptanceCriteria["zh-TW"]).toBeTruthy();
    }
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
      "sess-eoa-extension-missing-001",
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
    expect(sessionsById["sess-eoa-extension-missing-001"]).toMatchObject({
      accountType: "EOA",
      signatureStatus: "not_available",
      verificationStatus: "extension_not_installed",
      walletSource: "PORTKEY_EOA_EXTENSION",
      walletTypeVerified: false,
    });
    expect(sessionsById["sess-eoa-extension-missing-001"].userAction?.["en-US"]).toContain(
      "Install or open your EOA wallet extension",
    );
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
      totalSessions: 11,
      verifiedSessions: 4,
      issueSessions: 7,
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
      "extension_not_installed",
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
    expect(checklistById["extension-not-installed-error"].sessionIds).toEqual([
      "sess-eoa-extension-missing-001",
    ]);
    expect(checklistById["extension-not-installed-error"].evidence["en-US"]).toContain(
      "install/open recovery",
    );
    expect(checklistById["wrong-chain-error"].evidence["en-US"]).toContain("AELF mainnet");
    expect(checklistById["unsupported-wallet-error"].sessionIds).toEqual(["sess-unsupported-001"]);
    expect(checklistById["missing-signature"].sessionIds).toEqual(["sess-missing-signature-001"]);
    expect(checklistById["account-policy-restriction"].sessionIds).toEqual(["sess-account-restricted-001"]);
  });

  it("exposes wallet provider QA readiness separately from seeded wallet diagnostics", () => {
    const gate = createWalletProviderQaReadinessGate(walletSessions);
    const scenariosById = Object.fromEntries(gate.scenarios.map((scenario) => [scenario.id, scenario]));

    expect(gate.scenarios).toHaveLength(5);
    expect(gate.summary).toEqual({
      totalScenarios: 5,
      seededReadyScenarios: 5,
      liveEvidenceReadyScenarios: 0,
      missingLiveEvidenceScenarios: 5,
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
    expect(scenariosById["extension-not-installed-error"]).toMatchObject({
      seededStatus: "ready",
      liveEvidenceStatus: "missing",
      matchedSessionIds: ["sess-eoa-extension-missing-001"],
    });
    expect(scenariosById["extension-not-installed-error"].evidence["en-US"]).toContain(
      "extension-not-installed session",
    );
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
      missingLiveEvidenceScenarios: 3,
      releaseBlockers: 1,
      seededReadyScenarios: 5,
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

  it("derives local export fulfillment readiness from deterministic CSV and JSON packages", () => {
    const readiness = createExportFulfillmentReadiness(campaignDetail);
    const repeated = createExportFulfillmentReadiness(campaignDetail);
    const packagesByFormat = Object.fromEntries(readiness.packages.map((pack) => [pack.format, pack]));
    const commandCenter = createProjectCampaignCommandCenter(campaignDetail);
    const adminOps = createAdminOpsReadModel(campaignDetail);

    expect(readiness.summary).toMatchObject({
      status: "ready",
      packageCount: 2,
      readyPackages: 2,
      readyRows: 1,
      reviewRequiredRows: 3,
      blockedRows: 0,
      requiredAcknowledgements: 5,
      acknowledgedItems: 5,
      ownerApproved: true,
      operatorReviewed: true,
    });
    expect(readiness.packages.map((pack) => pack.format)).toEqual(["csv", "json"]);
    expect(packagesByFormat.csv).toMatchObject({
      id: "camp-awaken-sprint-export-awaken-sprint-preview-csv-local-fulfillment",
      checksum: expect.stringMatching(/^local-[0-9a-f]{8}$/),
      downloadAvailable: false,
      handoffReady: true,
      includedColumns: EXPORT_CSV_COLUMNS,
      readyRows: 1,
      reviewRequiredRows: 3,
      storageBacked: false,
      totalRows: 4,
    });
    expect(packagesByFormat.json).toMatchObject({
      id: "camp-awaken-sprint-export-awaken-sprint-preview-json-local-fulfillment",
      downloadAvailable: false,
      handoffReady: true,
      includedColumns: EXPORT_CSV_COLUMNS,
      storageBacked: false,
    });
    expect(readiness.packages.map((pack) => [pack.id, pack.checksum])).toEqual(
      repeated.packages.map((pack) => [pack.id, pack.checksum]),
    );
    expect(readiness.approval.acknowledgements.map((item) => item.id)).toEqual([
      "verified-records-only",
      "project-owned-reward-distribution",
      "no-reward-custody",
      "no-reward-distribution",
      "no-real-export-file",
    ]);
    expect(readiness.safety).toMatchObject({
      forbiddenFieldsAbsent: true,
      localOnly: true,
      noContractRoot: true,
      noContractTransaction: true,
      noDownloadUrl: true,
      noRewardCustody: true,
      noRewardDistribution: true,
      noStorageWrite: true,
    });
    expect(readiness.boundary["en-US"]).toContain("Local export fulfillment handoff only");
    expect(readiness.nextAction["en-US"]).toContain("storage-backed export");
    expect(commandCenter.exportFulfillmentReadiness).toEqual(readiness);
    expect(adminOps.exportFulfillmentReadiness).toEqual(readiness);

    for (const unsafe of [
      "downloadUrl",
      "storageKey",
      "contractRoot",
      "transactionId",
      "privateKey",
      "signedPayload",
    ]) {
      expect(hasOwnKeyDeep(readiness, unsafe)).toBe(false);
    }
  });

  it("derives storage-backed export approval readiness without enabling live storage or downloads", () => {
    const localFulfillment = createExportFulfillmentReadiness(campaignDetail);
    const readiness = createExportStorageFulfillmentApprovalReadiness(campaignDetail, localFulfillment);
    const repeated = createExportStorageFulfillmentApprovalReadiness(campaignDetail, localFulfillment);
    const adminOps = createAdminOpsReadModel(campaignDetail);

    expect(readiness.summary).toMatchObject({
      approvalBlocked: true,
      blockedChecks: 4,
      downloadUrlEnabled: false,
      highestRiskLevel: "high",
      readyChecks: 2,
      reviewRequiredChecks: 3,
      storageWriteEnabled: false,
      topCheckId: "storage-provider-approval",
      totalChecks: 9,
    });
    expect(readiness.sourceFulfillmentStatus).toBe(localFulfillment.summary.status);
    expect(readiness.checks.map((check) => check.id)).toEqual([
      "storage-provider-approval",
      "csv-column-contract",
      "wallet-locale-coverage",
      "access-control",
      "retention-privacy",
      "audit-logging",
      "rollback-plan",
      "owner-signoff",
      "operator-approval",
    ]);
    expect(readiness.checks.find((check) => check.id === "csv-column-contract")).toMatchObject({
      state: "ready",
      riskLevel: "low",
      ownerRole: "internal_operator",
    });
    expect(readiness.columnCoverage).toMatchObject({
      columns: EXPORT_CSV_COLUMNS,
      exactOrder: true,
      expectedColumns: EXPORT_CSV_COLUMNS,
      localePreferenceIncluded: true,
      missingColumns: [],
      riskFlagsIncluded: true,
      taskEvidenceIncluded: true,
      walletSourceIncluded: true,
      walletTypeIncluded: true,
    });
    expect(readiness.safety).toMatchObject({
      forbiddenFieldsAbsent: true,
      noContractRootWrite: true,
      noDownloadUrl: true,
      noObjectKey: true,
      noRealExportFile: true,
      noRewardCustody: true,
      noRewardDistribution: true,
      noSignedUrl: true,
      noStorageWrite: true,
      noWalletSigning: true,
    });
    expect(readiness.boundary["en-US"]).toContain("Storage-backed export approval readiness only");
    expect(readiness.nextAction["en-US"]).toContain("storage provider");
    expect(adminOps.exportStorageFulfillmentApprovalReadiness).toEqual(readiness);
    expect(adminOps.exportFulfillmentReadiness).toEqual(localFulfillment);
    expect(repeated).toEqual(readiness);

    for (const locale of ["en-US", "zh-CN", "zh-TW"] as const) {
      for (const check of readiness.checks) {
        expect(check.label[locale]?.length ?? 0).toBeGreaterThan(0);
        expect(check.evidenceRequired[locale]?.length ?? 0).toBeGreaterThan(0);
        expect(check.nextAction[locale]?.length ?? 0).toBeGreaterThan(0);
      }
    }

    for (const unsafe of [
      "downloadUrl",
      "fileUrl",
      "storageKey",
      "objectKey",
      "signedUrl",
      "contractRoot",
      "transactionId",
      "privateKey",
      "signedPayload",
    ]) {
      expect(hasOwnKeyDeep(readiness, unsafe)).toBe(false);
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

  it("creates a verification rules workspace from seeded pipeline and provider evidence", () => {
    const workspace = createVerificationRulesWorkspace(campaignDetail);
    const repeatedWorkspace = createVerificationRulesWorkspace(campaignDetail);

    expect(workspace).toEqual(repeatedWorkspace);
    expect(workspace.campaignId).toBe(campaignDetail.id);
    expect(workspace.summary).toMatchObject({
      affectedOutcomeCount: 6,
      blockedPaths: 1,
      manualReviewPaths: 1,
      missingLiveEvidencePaths: 5,
      providerEvidenceEntries: 7,
      providerLaunchBlockers: 1,
      seededReadyPaths: 7,
      totalRulePaths: 7,
    });
    expect(workspace.topRulePathId).toBe("social-api");
    expect(workspace.pipeline.eligibilityImpact.referralQualificationStatus).toBe(
      "needs_verified_invitee",
    );
    expect(workspace.providerEvidenceEntries.every((entry) =>
      entry.category === "verification" || entry.category === "manual_review",
    )).toBe(true);
    expect(workspace.providerEvidenceSummary).toMatchObject({
      blockedEntries: 1,
      launchBlockers: 1,
      reviewRequiredEntries: 1,
      totalEntries: 7,
    });
    expect(workspace.boundary["en-US"]).toContain("No live provider API");
    expect(workspace.boundary["en-US"]).toContain("wallet signing");
    expect(workspace.boundary["en-US"]).toContain("contract root write");
    expect(workspace.boundary["en-US"]).toContain("export file generation");
    expect(workspace.boundary["en-US"]).toContain("reward distribution");
    expect(workspace.boundary["zh-CN"]).toContain("不会执行实时 provider API");
    expect(workspace.nextAction["en-US"]).toContain("Attach live provider evidence");
    expect(hasOwnKeyDeep(workspace, "downloadUrl")).toBe(false);
    expect(hasOwnKeyDeep(workspace, "transactionId")).toBe(false);
    expect(JSON.stringify(workspace).toLowerCase()).not.toContain("private key");
    expect(JSON.stringify(workspace).toLowerCase()).not.toContain("bearer ");
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

    expect(supportedLocales).toEqual(activatedRuntimeLocales);
    expect(isSupportedLocale("zh-TW")).toBe(true);
    expect(isSupportedLocale("ja-JP")).toBe(true);
    expect(isSupportedLocale("ko-KR")).toBe(true);
    expect(isSupportedLocale("vi-VN")).toBe(true);
    expect(isSupportedLocale("tr-TR")).toBe(true);
    expect(isSupportedLocale("es-ES")).toBe(true);
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

  it("derives deterministic Forecast campaign task readiness without live execution claims", () => {
    const firstReadModel = createForecastCampaignTaskReadiness(campaignDetail);
    const secondReadModel = createForecastCampaignTaskReadiness(campaignDetail);
    const rowsByIntent = Object.fromEntries(firstReadModel.rows.map((row) => [row.intentId, row]));
    const boundaryText = [
      firstReadModel.boundary["en-US"],
      firstReadModel.summary.boundary["en-US"],
      ...firstReadModel.rows.flatMap((row) => [
        row.boundary["en-US"],
        row.nextAction["en-US"],
        row.riskState["en-US"],
      ]),
    ].join(" ");

    expect(firstReadModel).toEqual(secondReadModel);
    expect(firstReadModel.rows.map((row) => row.intentId)).toEqual([
      "prediction-participation",
      "win-streak",
      "forecast-leaderboard",
    ]);
    expect(firstReadModel.summary).toMatchObject({
      totalTasks: 3,
      readyCount: 1,
      reviewRequiredCount: 1,
      blockedCount: 1,
      topState: "blocked",
      topIntentId: "forecast-leaderboard",
      primaryOwnerRole: "forecast_provider_reviewer",
    });
    expect(
      firstReadModel.summary.readyCount +
        firstReadModel.summary.reviewRequiredCount +
        firstReadModel.summary.blockedCount,
    ).toBe(firstReadModel.summary.totalTasks);
    expect(rowsByIntent["prediction-participation"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "seeded_local",
      providerState: "seeded_preview",
      readinessState: "ready",
      ownerRole: "project_owner",
    });
    expect(rowsByIntent["win-streak"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "forecast_app_data",
      providerState: "review_required",
      readinessState: "review_required",
      ownerRole: "operator",
    });
    expect(rowsByIntent["forecast-leaderboard"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "forecast_app_data",
      providerState: "not_connected",
      readinessState: "blocked",
      ownerRole: "forecast_provider_reviewer",
    });

    for (const row of firstReadModel.rows) {
      expect(row.label["en-US"]).toBeTruthy();
      expect(row.label["zh-CN"]).toBeTruthy();
      expect(row.description["en-US"]).toBeTruthy();
      expect(row.description["zh-CN"]).toBeTruthy();
      expect(row.riskState["en-US"]).toBeTruthy();
      expect(row.riskState["zh-CN"]).toBeTruthy();
      expect(row.nextAction["en-US"]).toBeTruthy();
      expect(row.nextAction["zh-CN"]).toBeTruthy();
      expect(row.boundary["en-US"]).toContain("No live Forecast API");
      expect(row.boundary["zh-CN"]).toContain("不会调用真实 Forecast API");
    }

    expect(firstReadModel.ownerNextAction["en-US"]).toContain("Forecast leaderboard");
    expect(boundaryText).toContain("No live Forecast API");
    expect(boundaryText).toContain("prediction transaction");
    expect(boundaryText).toContain("wallet signing");
    expect(boundaryText).toContain("backend persistence");
    expect(boundaryText).toContain("contract execution");
    expect(boundaryText).toContain("reward custody");
    expect(boundaryText).toContain("reward distribution");
  });

  it("derives deterministic daipp Agent Coin task readiness without live agent or token execution claims", () => {
    const firstReadModel = createDaippAgentCoinTaskReadiness(campaignDetail);
    const secondReadModel = createDaippAgentCoinTaskReadiness(campaignDetail);
    const rowsByIntent = Object.fromEntries(firstReadModel.rows.map((row) => [row.intentId, row]));
    const serialized = JSON.stringify(firstReadModel);
    const boundaryText = [
      firstReadModel.boundary["en-US"],
      firstReadModel.summary.boundary["en-US"],
      ...firstReadModel.rows.flatMap((row) => [
        row.boundary["en-US"],
        row.nextAction["en-US"],
        row.riskState["en-US"],
      ]),
    ].join(" ");

    expect(firstReadModel).toEqual(secondReadModel);
    expect(firstReadModel.rows.map((row) => row.intentId)).toEqual([
      "daipp-agent-page-visit-readiness",
      "daipp-agent-interaction-evidence",
      "daipp-agent-coin-buy-hold-review",
      "daipp-ai-intro-share-review",
      "daipp-launch-leaderboard-review",
    ]);
    expect(firstReadModel.summary).toMatchObject({
      totalTasks: 5,
      readyCount: 1,
      reviewRequiredCount: 2,
      blockedCount: 2,
      topState: "blocked",
      topIntentId: "daipp-agent-coin-buy-hold-review",
      primaryOwnerRole: "daipp_provider_reviewer",
    });
    expect(
      firstReadModel.summary.readyCount +
        firstReadModel.summary.reviewRequiredCount +
        firstReadModel.summary.blockedCount,
    ).toBe(firstReadModel.summary.totalTasks);
    expect(rowsByIntent["daipp-agent-page-visit-readiness"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "seeded_local",
      providerState: "seeded_preview",
      readinessState: "ready",
      ownerRole: "project_owner",
    });
    expect(rowsByIntent["daipp-agent-interaction-evidence"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "agent_interaction_log",
      providerState: "review_required",
      readinessState: "review_required",
      ownerRole: "operator",
    });
    expect(rowsByIntent["daipp-agent-coin-buy-hold-review"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "daipp_contract_event",
      providerState: "blocked",
      readinessState: "blocked",
      ownerRole: "daipp_provider_reviewer",
    });
    expect(rowsByIntent["daipp-ai-intro-share-review"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "ai_intro_share_review",
      providerState: "review_required",
      readinessState: "review_required",
      ownerRole: "content_reviewer",
    });
    expect(rowsByIntent["daipp-launch-leaderboard-review"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "launch_leaderboard",
      providerState: "not_connected",
      readinessState: "blocked",
      ownerRole: "daipp_provider_reviewer",
    });

    for (const row of firstReadModel.rows) {
      expect(row.label["en-US"]).toBeTruthy();
      expect(row.label["zh-CN"]).toBeTruthy();
      expect(row.description["en-US"]).toBeTruthy();
      expect(row.description["zh-CN"]).toBeTruthy();
      expect(row.riskState["en-US"]).toBeTruthy();
      expect(row.riskState["zh-CN"]).toBeTruthy();
      expect(row.nextAction["en-US"]).toBeTruthy();
      expect(row.nextAction["zh-CN"]).toBeTruthy();
      expect(row.boundary["en-US"]).toContain("No live daipp service/API");
      expect(row.boundary["zh-CN"]).toContain("不会调用真实 daipp service/API");
    }

    expect(firstReadModel.ownerNextAction["en-US"]).toContain("daipp provider");
    expect(firstReadModel.ownerNextAction["en-US"]).toContain("token evidence");
    expect(boundaryText).toContain("No live daipp service/API");
    expect(boundaryText).toContain("agent execution");
    expect(boundaryText).toContain("AI generation");
    expect(boundaryText).toContain("token launch");
    expect(boundaryText).toContain("token buy/hold/transfer");
    expect(boundaryText).toContain("wallet signing");
    expect(boundaryText).toContain("wallet SDK/provider");
    expect(boundaryText).toContain("backend mutation");
    expect(boundaryText).toContain("contract read/send/write");
    expect(boundaryText).toContain("reward custody");
    expect(boundaryText).toContain("reward distribution");

    for (const unsafeKey of [
      "privateKey",
      "seedPhrase",
      "bearerToken",
      "signedPayload",
      "tokenId",
      "contractAddress",
      "transactionId",
    ]) {
      expect(hasOwnKeyDeep(firstReadModel, unsafeKey)).toBe(false);
    }
    for (const unsafeText of ["private key", "seed phrase", "bearer token", "signed payload"]) {
      expect(serialized.toLowerCase()).not.toContain(unsafeText);
    }
  });

  it("derives deterministic Forest NFT task readiness without live NFT execution claims", () => {
    const firstReadModel = createForestNftTaskReadiness(campaignDetail);
    const secondReadModel = createForestNftTaskReadiness(campaignDetail);
    const rowsByIntent = Object.fromEntries(firstReadModel.rows.map((row) => [row.intentId, row]));
    const serialized = JSON.stringify(firstReadModel);
    const boundaryText = [
      firstReadModel.boundary["en-US"],
      firstReadModel.summary.boundary["en-US"],
      ...firstReadModel.rows.flatMap((row) => [
        row.boundary["en-US"],
        row.nextAction["en-US"],
        row.riskState["en-US"],
      ]),
    ].join(" ");

    expect(firstReadModel).toEqual(secondReadModel);
    expect(firstReadModel.rows.map((row) => row.intentId)).toEqual([
      "forest-nft-mint-readiness",
      "forest-nft-holder-evidence",
      "forest-nft-trade-listing-review",
      "forest-holder-leaderboard-review",
    ]);
    expect(firstReadModel.summary).toMatchObject({
      totalTasks: 4,
      readyCount: 1,
      reviewRequiredCount: 2,
      blockedCount: 1,
      topState: "blocked",
      topIntentId: "forest-holder-leaderboard-review",
      primaryOwnerRole: "forest_provider_reviewer",
    });
    expect(
      firstReadModel.summary.readyCount +
        firstReadModel.summary.reviewRequiredCount +
        firstReadModel.summary.blockedCount,
    ).toBe(firstReadModel.summary.totalTasks);
    expect(rowsByIntent["forest-nft-mint-readiness"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "seeded_local",
      providerState: "seeded_preview",
      readinessState: "ready",
      ownerRole: "project_owner",
    });
    expect(rowsByIntent["forest-nft-holder-evidence"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "holder_snapshot",
      providerState: "review_required",
      readinessState: "review_required",
      ownerRole: "operator",
    });
    expect(rowsByIntent["forest-nft-trade-listing-review"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "forest_marketplace_event",
      providerState: "review_required",
      readinessState: "review_required",
      ownerRole: "operator",
    });
    expect(rowsByIntent["forest-holder-leaderboard-review"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "forest_nft_contract_event",
      providerState: "not_connected",
      readinessState: "blocked",
      ownerRole: "forest_provider_reviewer",
    });

    for (const row of firstReadModel.rows) {
      expect(row.label["en-US"]).toBeTruthy();
      expect(row.label["zh-CN"]).toBeTruthy();
      expect(row.description["en-US"]).toBeTruthy();
      expect(row.description["zh-CN"]).toBeTruthy();
      expect(row.riskState["en-US"]).toBeTruthy();
      expect(row.riskState["zh-CN"]).toBeTruthy();
      expect(row.nextAction["en-US"]).toBeTruthy();
      expect(row.nextAction["zh-CN"]).toBeTruthy();
      expect(row.boundary["en-US"]).toContain("No live Forest service/API");
      expect(row.boundary["zh-CN"]).toContain("不会调用实时 Forest service/API");
    }

    expect(firstReadModel.ownerNextAction["en-US"]).toContain("Forest provider");
    expect(firstReadModel.ownerNextAction["en-US"]).toContain("NFT evidence");
    expect(boundaryText).toContain("No live Forest service/API");
    expect(boundaryText).toContain("NFT marketplace/indexer");
    expect(boundaryText).toContain("NFT mint execution");
    expect(boundaryText).toContain("NFT transfer execution");
    expect(boundaryText).toContain("NFT trade/listing execution");
    expect(boundaryText).toContain("wallet signing");
    expect(boundaryText).toContain("wallet SDK/provider");
    expect(boundaryText).toContain("backend mutation");
    expect(boundaryText).toContain("contract read/send/write");
    expect(boundaryText).toContain("reward custody");
    expect(boundaryText).toContain("reward distribution");

    for (const unsafeKey of [
      "privateKey",
      "seedPhrase",
      "bearerToken",
      "signedPayload",
      "nftId",
      "listingId",
      "tradeTransactionId",
    ]) {
      expect(hasOwnKeyDeep(firstReadModel, unsafeKey)).toBe(false);
    }
    for (const unsafeText of ["private key", "seed phrase", "bearer token", "signed payload"]) {
      expect(serialized.toLowerCase()).not.toContain(unsafeText);
    }
  });

  it("derives deterministic Schrödinger NFT task readiness without live project API or NFT execution claims", () => {
    const firstReadModel = createSchrodingerNftTaskReadiness(campaignDetail);
    const secondReadModel = createSchrodingerNftTaskReadiness(campaignDetail);
    const rowsByIntent = Object.fromEntries(firstReadModel.rows.map((row) => [row.intentId, row]));
    const serialized = JSON.stringify(firstReadModel);
    const boundaryText = [
      firstReadModel.boundary["en-US"],
      firstReadModel.summary.boundary["en-US"],
      ...firstReadModel.rows.flatMap((row) => [
        row.boundary["en-US"],
        row.nextAction["en-US"],
        row.riskState["en-US"],
      ]),
    ].join(" ");

    expect(firstReadModel).toEqual(secondReadModel);
    expect(firstReadModel.rows.map((row) => row.intentId)).toEqual([
      "schrodinger-nft-adopt-readiness",
      "schrodinger-nft-holder-evidence",
      "schrodinger-nft-trade-listing-review",
      "schrodinger-holder-leaderboard-review",
    ]);
    expect(firstReadModel.summary).toMatchObject({
      totalTasks: 4,
      readyCount: 1,
      reviewRequiredCount: 2,
      blockedCount: 1,
      topState: "blocked",
      topIntentId: "schrodinger-holder-leaderboard-review",
      primaryOwnerRole: "schrodinger_provider_reviewer",
    });
    expect(
      firstReadModel.summary.readyCount +
        firstReadModel.summary.reviewRequiredCount +
        firstReadModel.summary.blockedCount,
    ).toBe(firstReadModel.summary.totalTasks);
    expect(rowsByIntent["schrodinger-nft-adopt-readiness"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "seeded_local",
      providerState: "seeded_preview",
      readinessState: "ready",
      ownerRole: "project_owner",
    });
    expect(rowsByIntent["schrodinger-nft-holder-evidence"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "project_api",
      providerState: "review_required",
      readinessState: "review_required",
      ownerRole: "operator",
    });
    expect(rowsByIntent["schrodinger-nft-trade-listing-review"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "schrodinger_trade_listing_event",
      providerState: "review_required",
      readinessState: "review_required",
      ownerRole: "operator",
    });
    expect(rowsByIntent["schrodinger-holder-leaderboard-review"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "holder_leaderboard",
      providerState: "not_connected",
      readinessState: "blocked",
      ownerRole: "schrodinger_provider_reviewer",
    });

    for (const row of firstReadModel.rows) {
      expect(row.label["en-US"]).toBeTruthy();
      expect(row.label["zh-CN"]).toBeTruthy();
      expect(row.description["en-US"]).toBeTruthy();
      expect(row.description["zh-CN"]).toBeTruthy();
      expect(row.riskState["en-US"]).toBeTruthy();
      expect(row.riskState["zh-CN"]).toBeTruthy();
      expect(row.nextAction["en-US"]).toBeTruthy();
      expect(row.nextAction["zh-CN"]).toBeTruthy();
      expect(row.boundary["en-US"]).toContain("No live Schrödinger service/API");
      expect(row.boundary["zh-CN"]).toContain("不会调用实时 Schrödinger service/API");
    }

    expect(firstReadModel.ownerNextAction["en-US"]).toContain("Schrödinger provider");
    expect(firstReadModel.ownerNextAction["en-US"]).toContain("project API evidence");
    expect(boundaryText).toContain("No live Schrödinger service/API");
    expect(boundaryText).toContain("project API");
    expect(boundaryText).toContain("NFT marketplace/indexer");
    expect(boundaryText).toContain("NFT adopt execution");
    expect(boundaryText).toContain("NFT mint execution");
    expect(boundaryText).toContain("NFT transfer execution");
    expect(boundaryText).toContain("NFT trade/listing execution");
    expect(boundaryText).toContain("wallet signing");
    expect(boundaryText).toContain("wallet SDK/provider");
    expect(boundaryText).toContain("backend mutation");
    expect(boundaryText).toContain("contract read/send/write");
    expect(boundaryText).toContain("reward custody");
    expect(boundaryText).toContain("reward distribution");

    for (const unsafeKey of [
      "privateKey",
      "seedPhrase",
      "bearerToken",
      "signedPayload",
      "nftId",
      "tokenId",
      "contractAddress",
      "transactionId",
    ]) {
      expect(hasOwnKeyDeep(firstReadModel, unsafeKey)).toBe(false);
    }
    for (const unsafeText of ["private key", "seed phrase", "bearer token", "signed payload"]) {
      expect(serialized.toLowerCase()).not.toContain(unsafeText);
    }
  });

  it("derives deterministic eBridge task readiness without live bridge execution claims", () => {
    const firstReadModel = createEbridgeTaskReadiness(campaignDetail);
    const secondReadModel = createEbridgeTaskReadiness(campaignDetail);
    const rowsByIntent = Object.fromEntries(firstReadModel.rows.map((row) => [row.intentId, row]));
    const serialized = JSON.stringify(firstReadModel);
    const boundaryText = [
      firstReadModel.boundary["en-US"],
      firstReadModel.summary.boundary["en-US"],
      ...firstReadModel.rows.flatMap((row) => [
        row.boundary["en-US"],
        row.nextAction["en-US"],
        row.riskState["en-US"],
      ]),
    ].join(" ");

    expect(firstReadModel).toEqual(secondReadModel);
    expect(firstReadModel.rows.map((row) => row.intentId)).toEqual([
      "bridge-intent-readiness",
      "bridge-amount-threshold-review",
      "bridge-on-chain-evidence",
      "bridge-awaken-unlock-dependency",
      "bridge-eligibility-impact",
    ]);
    expect(firstReadModel.summary).toMatchObject({
      totalTasks: 5,
      readyCount: 1,
      reviewRequiredCount: 2,
      blockedCount: 2,
      topState: "blocked",
      topIntentId: "bridge-awaken-unlock-dependency",
      primaryOwnerRole: "bridge_provider_reviewer",
    });
    expect(
      firstReadModel.summary.readyCount +
        firstReadModel.summary.reviewRequiredCount +
        firstReadModel.summary.blockedCount,
    ).toBe(firstReadModel.summary.totalTasks);
    expect(rowsByIntent["bridge-intent-readiness"]).toMatchObject({
      verificationType: "ON_CHAIN",
      evidenceSource: "seeded_local",
      providerState: "seeded_preview",
      readinessState: "ready",
      ownerRole: "project_owner",
    });
    expect(rowsByIntent["bridge-amount-threshold-review"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "ebridge_api",
      providerState: "review_required",
      readinessState: "review_required",
      ownerRole: "operator",
    });
    expect(rowsByIntent["bridge-on-chain-evidence"]).toMatchObject({
      verificationType: "ON_CHAIN",
      evidenceSource: "aefinder_on_chain",
      providerState: "review_required",
      readinessState: "review_required",
      ownerRole: "operator",
    });
    expect(rowsByIntent["bridge-awaken-unlock-dependency"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "awaken_unlock_rule",
      providerState: "blocked",
      readinessState: "blocked",
      ownerRole: "bridge_provider_reviewer",
    });
    expect(rowsByIntent["bridge-eligibility-impact"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "eligibility_engine",
      providerState: "not_connected",
      readinessState: "blocked",
      ownerRole: "risk_reviewer",
    });

    for (const row of firstReadModel.rows) {
      expect(row.label["en-US"]).toBeTruthy();
      expect(row.label["zh-CN"]).toBeTruthy();
      expect(row.description["en-US"]).toBeTruthy();
      expect(row.description["zh-CN"]).toBeTruthy();
      expect(row.riskState["en-US"]).toBeTruthy();
      expect(row.riskState["zh-CN"]).toBeTruthy();
      expect(row.nextAction["en-US"]).toBeTruthy();
      expect(row.nextAction["zh-CN"]).toBeTruthy();
      expect(row.boundary["en-US"]).toContain("No live eBridge service/API");
      expect(row.boundary["zh-CN"]).toContain("不会调用真实 eBridge service/API");
    }

    expect(firstReadModel.ownerNextAction["en-US"]).toContain("eBridge provider");
    expect(firstReadModel.ownerNextAction["en-US"]).toContain("Awaken unlock dependency");
    expect(boundaryText).toContain("No live eBridge service/API");
    expect(boundaryText).toContain("bridge transaction");
    expect(boundaryText).toContain("asset transfer");
    expect(boundaryText).toContain("wallet signing");
    expect(boundaryText).toContain("wallet SDK/provider");
    expect(boundaryText).toContain("backend mutation");
    expect(boundaryText).toContain("contract read/send/write");
    expect(boundaryText).toContain("export generation");
    expect(boundaryText).toContain("reward custody");
    expect(boundaryText).toContain("reward distribution");

    for (const unsafeKey of [
      "privateKey",
      "seedPhrase",
      "bearerToken",
      "signedPayload",
      "bridgeId",
      "transactionId",
      "contractAddress",
      "walletAddress",
    ]) {
      expect(hasOwnKeyDeep(firstReadModel, unsafeKey)).toBe(false);
    }
    for (const unsafeText of ["private key", "seed phrase", "bearer token", "signed payload"]) {
      expect(serialized.toLowerCase()).not.toContain(unsafeText);
    }
  });

  it("derives deterministic Awaken swap and liquidity task readiness without live DEX execution claims", () => {
    const firstReadModel = createAwakenSwapLiquidityTaskReadiness(campaignDetail);
    const secondReadModel = createAwakenSwapLiquidityTaskReadiness(campaignDetail);
    const rowsByIntent = Object.fromEntries(firstReadModel.rows.map((row) => [row.intentId, row]));
    const serialized = JSON.stringify(firstReadModel);
    const boundaryText = [
      firstReadModel.boundary["en-US"],
      firstReadModel.summary.boundary["en-US"],
      ...firstReadModel.rows.flatMap((row) => [
        row.boundary["en-US"],
        row.nextAction["en-US"],
        row.riskState["en-US"],
      ]),
    ].join(" ");

    expect(firstReadModel).toEqual(secondReadModel);
    expect(firstReadModel.rows.map((row) => row.intentId)).toEqual([
      "awaken-swap-readiness",
      "awaken-liquidity-add-review",
      "awaken-lp-hold-evidence",
      "awaken-bridge-unlock-dependency",
      "awaken-ranking-eligibility-impact",
    ]);
    expect(firstReadModel.summary).toMatchObject({
      totalTasks: 5,
      readyCount: 1,
      reviewRequiredCount: 2,
      blockedCount: 2,
      topState: "blocked",
      topIntentId: "awaken-bridge-unlock-dependency",
      primaryOwnerRole: "awaken_provider_reviewer",
    });
    expect(
      firstReadModel.summary.readyCount +
        firstReadModel.summary.reviewRequiredCount +
        firstReadModel.summary.blockedCount,
    ).toBe(firstReadModel.summary.totalTasks);
    expect(rowsByIntent["awaken-swap-readiness"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "seeded_local",
      providerState: "seeded_preview",
      readinessState: "ready",
      ownerRole: "project_owner",
    });
    expect(rowsByIntent["awaken-liquidity-add-review"]).toMatchObject({
      verificationType: "ON_CHAIN",
      evidenceSource: "awaken_swap_event",
      providerState: "review_required",
      readinessState: "review_required",
      ownerRole: "operator",
    });
    expect(rowsByIntent["awaken-lp-hold-evidence"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "lp_position_snapshot",
      providerState: "review_required",
      readinessState: "review_required",
      ownerRole: "operator",
    });
    expect(rowsByIntent["awaken-bridge-unlock-dependency"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "bridge_unlock_rule",
      providerState: "blocked",
      readinessState: "blocked",
      ownerRole: "awaken_provider_reviewer",
    });
    expect(rowsByIntent["awaken-ranking-eligibility-impact"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "ranking_engine",
      providerState: "not_connected",
      readinessState: "blocked",
      ownerRole: "risk_reviewer",
    });

    for (const row of firstReadModel.rows) {
      expect(row.label["en-US"]).toBeTruthy();
      expect(row.label["zh-CN"]).toBeTruthy();
      expect(row.description["en-US"]).toBeTruthy();
      expect(row.description["zh-CN"]).toBeTruthy();
      expect(row.riskState["en-US"]).toBeTruthy();
      expect(row.riskState["zh-CN"]).toBeTruthy();
      expect(row.nextAction["en-US"]).toBeTruthy();
      expect(row.nextAction["zh-CN"]).toBeTruthy();
      expect(row.boundary["en-US"]).toContain("No live Awaken API");
      expect(row.boundary["zh-CN"]).toContain("不会调用真实 Awaken API");
    }

    expect(firstReadModel.ownerNextAction["en-US"]).toContain("Awaken provider");
    expect(firstReadModel.ownerNextAction["en-US"]).toContain("bridge unlock dependency");
    expect(boundaryText).toContain("No live Awaken API");
    expect(boundaryText).toContain("DEX/indexer/provider");
    expect(boundaryText).toContain("swap transaction");
    expect(boundaryText).toContain("LP add/remove");
    expect(boundaryText).toContain("asset transfer");
    expect(boundaryText).toContain("wallet signing");
    expect(boundaryText).toContain("wallet SDK/provider");
    expect(boundaryText).toContain("backend mutation");
    expect(boundaryText).toContain("contract read/send/write");
    expect(boundaryText).toContain("export generation");
    expect(boundaryText).toContain("reward custody");
    expect(boundaryText).toContain("reward distribution");

    for (const unsafeKey of [
      "privateKey",
      "seedPhrase",
      "bearerToken",
      "signedPayload",
      "swapTxId",
      "liquidityTxId",
      "transactionId",
      "contractAddress",
      "walletAddress",
    ]) {
      expect(hasOwnKeyDeep(firstReadModel, unsafeKey)).toBe(false);
    }
    for (const unsafeText of ["private key", "seed phrase", "bearer token", "signed payload"]) {
      expect(serialized.toLowerCase()).not.toContain(unsafeText);
    }
  });

  it("derives deterministic Pay campaign task readiness without live payment claims", () => {
    const firstReadModel = createPayCampaignTaskReadiness(campaignDetail);
    const secondReadModel = createPayCampaignTaskReadiness(campaignDetail);
    const rowsByIntent = Object.fromEntries(firstReadModel.rows.map((row) => [row.intentId, row]));
    const serialized = JSON.stringify(firstReadModel);
    const boundaryText = [
      firstReadModel.boundary["en-US"],
      firstReadModel.summary.boundary["en-US"],
      ...firstReadModel.rows.flatMap((row) => [
        row.boundary["en-US"],
        row.nextAction["en-US"],
        row.riskState["en-US"],
      ]),
    ].join(" ");

    expect(firstReadModel).toEqual(secondReadModel);
    expect(firstReadModel.rows.map((row) => row.intentId)).toEqual([
      "invoice-completion",
      "payment-link-completion",
      "pay-follow-up-handoff",
    ]);
    expect(firstReadModel.summary).toMatchObject({
      totalTasks: 3,
      readyCount: 1,
      reviewRequiredCount: 1,
      blockedCount: 1,
      topState: "blocked",
      topIntentId: "pay-follow-up-handoff",
      primaryOwnerRole: "pay_provider_reviewer",
    });
    expect(
      firstReadModel.summary.readyCount +
        firstReadModel.summary.reviewRequiredCount +
        firstReadModel.summary.blockedCount,
    ).toBe(firstReadModel.summary.totalTasks);
    expect(rowsByIntent["invoice-completion"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "seeded_local",
      providerState: "seeded_preview",
      readinessState: "ready",
      ownerRole: "project_owner",
    });
    expect(rowsByIntent["payment-link-completion"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "aelf_pay_status",
      providerState: "review_required",
      readinessState: "review_required",
      ownerRole: "operator",
    });
    expect(rowsByIntent["pay-follow-up-handoff"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "aelf_pay_status",
      providerState: "not_connected",
      readinessState: "blocked",
      ownerRole: "pay_provider_reviewer",
    });

    for (const row of firstReadModel.rows) {
      expect(row.label["en-US"]).toBeTruthy();
      expect(row.label["zh-CN"]).toBeTruthy();
      expect(row.description["en-US"]).toBeTruthy();
      expect(row.description["zh-CN"]).toBeTruthy();
      expect(row.riskState["en-US"]).toBeTruthy();
      expect(row.riskState["zh-CN"]).toBeTruthy();
      expect(row.nextAction["en-US"]).toBeTruthy();
      expect(row.nextAction["zh-CN"]).toBeTruthy();
      expect(row.boundary["en-US"]).toContain("No live Pay service");
      expect(row.boundary["zh-CN"]).toContain("不会调用真实 Pay 服务");
    }

    expect(firstReadModel.ownerNextAction["en-US"]).toContain("Pay provider");
    expect(boundaryText).toContain("No live Pay service");
    expect(boundaryText).toContain("payment transaction");
    expect(boundaryText).toContain("payment link creation");
    expect(boundaryText).toContain("invoice generation");
    expect(boundaryText).toContain("wallet signing");
    expect(boundaryText).toContain("wallet SDK/provider");
    expect(boundaryText).toContain("backend mutation");
    expect(boundaryText).toContain("contract execution");
    expect(boundaryText).toContain("reward custody");
    expect(boundaryText).toContain("reward distribution");

    for (const unsafeKey of ["privateKey", "seedPhrase", "bearerToken", "signedPayload", "invoiceId", "paymentId"]) {
      expect(hasOwnKeyDeep(firstReadModel, unsafeKey)).toBe(false);
    }
    for (const unsafeText of ["private key", "seed phrase", "bearer token", "signed payload"]) {
      expect(serialized.toLowerCase()).not.toContain(unsafeText);
    }
  });

  it("derives deterministic TMRWDAO governance task readiness without live DAO execution claims", () => {
    const firstReadModel = createTmrwdaoGovernanceTaskReadiness(campaignDetail);
    const secondReadModel = createTmrwdaoGovernanceTaskReadiness(campaignDetail);
    const rowsByIntent = Object.fromEntries(firstReadModel.rows.map((row) => [row.intentId, row]));
    const serialized = JSON.stringify(firstReadModel);
    const boundaryText = [
      firstReadModel.boundary["en-US"],
      firstReadModel.summary.boundary["en-US"],
      ...firstReadModel.rows.flatMap((row) => [
        row.boundary["en-US"],
        row.nextAction["en-US"],
        row.riskState["en-US"],
      ]),
    ].join(" ");

    expect(firstReadModel).toEqual(secondReadModel);
    expect(firstReadModel.rows.map((row) => row.intentId)).toEqual([
      "dao-join-readiness",
      "proposal-summary-review",
      "proposal-vote-evidence",
      "governance-result-review",
    ]);
    expect(firstReadModel.summary).toMatchObject({
      totalTasks: 4,
      readyCount: 1,
      reviewRequiredCount: 2,
      blockedCount: 1,
      topState: "blocked",
      topIntentId: "governance-result-review",
      primaryOwnerRole: "dao_provider_reviewer",
    });
    expect(
      firstReadModel.summary.readyCount +
        firstReadModel.summary.reviewRequiredCount +
        firstReadModel.summary.blockedCount,
    ).toBe(firstReadModel.summary.totalTasks);
    expect(rowsByIntent["dao-join-readiness"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "seeded_local",
      providerState: "seeded_preview",
      readinessState: "ready",
      ownerRole: "project_owner",
    });
    expect(rowsByIntent["proposal-summary-review"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "proposal_metadata",
      providerState: "review_required",
      readinessState: "review_required",
      ownerRole: "operator",
    });
    expect(rowsByIntent["proposal-vote-evidence"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "dao_contract_event",
      providerState: "review_required",
      readinessState: "review_required",
      ownerRole: "operator",
    });
    expect(rowsByIntent["governance-result-review"]).toMatchObject({
      verificationType: "DAPP_API",
      evidenceSource: "dao_contract_event",
      providerState: "not_connected",
      readinessState: "blocked",
      ownerRole: "dao_provider_reviewer",
    });

    for (const row of firstReadModel.rows) {
      expect(row.label["en-US"]).toBeTruthy();
      expect(row.label["zh-CN"]).toBeTruthy();
      expect(row.description["en-US"]).toBeTruthy();
      expect(row.description["zh-CN"]).toBeTruthy();
      expect(row.riskState["en-US"]).toBeTruthy();
      expect(row.riskState["zh-CN"]).toBeTruthy();
      expect(row.nextAction["en-US"]).toBeTruthy();
      expect(row.nextAction["zh-CN"]).toBeTruthy();
      expect(row.boundary["en-US"]).toContain("No live TMRWDAO service/API");
      expect(row.boundary["zh-CN"]).toContain("不会调用实时 TMRWDAO service/API");
    }

    expect(firstReadModel.ownerNextAction["en-US"]).toContain("TMRWDAO provider");
    expect(firstReadModel.ownerNextAction["en-US"]).toContain("DAO contract evidence");
    expect(boundaryText).toContain("No live TMRWDAO service/API");
    expect(boundaryText).toContain("proposal creation");
    expect(boundaryText).toContain("DAO vote transaction");
    expect(boundaryText).toContain("wallet signing");
    expect(boundaryText).toContain("wallet SDK/provider");
    expect(boundaryText).toContain("backend mutation");
    expect(boundaryText).toContain("contract read/send/write");
    expect(boundaryText).toContain("reward custody");
    expect(boundaryText).toContain("reward distribution");

    for (const unsafeKey of [
      "privateKey",
      "seedPhrase",
      "bearerToken",
      "signedPayload",
      "proposalId",
      "voteTransactionId",
    ]) {
      expect(hasOwnKeyDeep(firstReadModel, unsafeKey)).toBe(false);
    }
    for (const unsafeText of ["private key", "seed phrase", "bearer token", "signed payload"]) {
      expect(serialized.toLowerCase()).not.toContain(unsafeText);
    }
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
      expect(getLocalizedText(readModel.aiGuide.headline, locale)).toBeTruthy();
      expect(getLocalizedText(readModel.aiGuide.body, locale)).toBeTruthy();
      expect(getLocalizedText(readModel.aiGuide.evidenceBasis, locale)).toBeTruthy();
      expect(getLocalizedText(readModel.summary.aiGuideHeadline, locale)).toBe(
        getLocalizedText(readModel.aiGuide.headline, locale),
      );
      expect(getLocalizedText(readModel.summary.ownerNextAction, locale)).toBe(
        getLocalizedText(readModel.ownerNextAction, locale),
      );
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
      inspectionMode: "verified_session",
      knownParticipant: true,
      localePreference: "en-US",
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
      inspectionMode: "verified_session",
      knownParticipant: true,
      localePreference: "zh-CN",
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
      inspectionMode: "verified_session",
      knownParticipant: true,
      localePreference: "en-US",
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
      inspectionMode: "address_only",
      knownParticipant: false,
      missingTasks: [],
      progressPercent: 0,
      score: 0,
      status: "pending",
      walletAddress: "ELF_UNKNOWN_ADDRESS",
      walletSource: "OTHER",
      walletTypeVerified: false,
    });
    expect(readModel.result).not.toHaveProperty("localePreference");
    expect(readModel.result.walletStatus).toBeUndefined();
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
    expect(adminOps.localeSplit.map((row) => row.label)).toEqual(activatedRuntimeLocales);
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

  it("derives anti-sybil v2 graph readiness from seeded review intelligence", () => {
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const surface = createAntiSybilV2GraphReadiness(campaignDetail);
    const repeated = createAntiSybilV2GraphReadiness(campaignDetail);
    const signalIds = surface.signalFamilies.map((family) => family.id);
    const outcomeIds = surface.affectedOutcomes.map((outcome) => outcome.id);
    const safetyText = JSON.stringify(surface);
    const lowerSafetyText = safetyText.toLowerCase();

    expect(surface).toEqual(repeated);
    expect(adminOps.antiSybilV2GraphReadiness).toEqual(surface);
    expect(surface.campaignId).toBe(campaignDetail.id);
    expect(signalIds).toEqual(["funding_graph", "invite_tree", "behavior_cluster"]);
    expect(outcomeIds).toEqual([
      "referral_scoring",
      "leaderboard_trust",
      "winner_export_review",
      "ai_optimization",
    ]);
    expect(surface.summary).toMatchObject({
      totalFamilies: surface.signalFamilies.length,
      readyCount: surface.signalFamilies.filter((family) => family.readiness === "ready").length,
      reviewRequiredCount: surface.signalFamilies.filter((family) => family.readiness === "review_required").length,
      blockedCount: surface.signalFamilies.filter((family) => family.readiness === "blocked").length,
      topFamilyId: expect.any(String),
      topOutcomeId: expect.any(String),
      overallReadiness: expect.any(String),
    });
    expect(surface.summary.totalFamilies).toBe(3);
    expect(surface.affectedOutcomes.length).toBeGreaterThanOrEqual(4);
    expect(surface.summary.overallReadiness).toBe(
      surface.summary.blockedCount > 0
        ? "blocked"
        : surface.summary.reviewRequiredCount > 0
          ? "review_required"
          : "ready",
    );
    expect(surface.boundary["en-US"]).toContain("No live graph provider");
    expect(surface.boundary["en-US"]).toContain("provider API");
    expect(surface.boundary["en-US"]).toContain("wallet action");
    expect(surface.boundary["en-US"]).toContain("contract write");
    expect(surface.boundary["en-US"]).toContain("reward custody");
    expect(surface.boundary["en-US"]).toContain("reward distribution");
    expect(surface.signalFamilies.find((family) => family.id === "invite_tree")).toMatchObject({
      ownerRole: "project_owner",
      readiness: "blocked",
    });
    expect(surface.signalFamilies.find((family) => family.id === "behavior_cluster")?.evidenceBasis["en-US"]).toContain(
      "no device fingerprint",
    );

    for (const unsafeText of [
      "privateKey",
      "seedPhrase",
      "bearerToken",
      "signedPayload",
      "rawGraphEdge",
      "deviceFingerprint",
      "privateThreshold",
      "contractRoot",
      "downloadUrl",
      "kitty-specs",
      "docs/current",
    ]) {
      expect(safetyText).not.toContain(unsafeText);
      expect(lowerSafetyText).not.toContain(unsafeText.toLowerCase());
    }
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
      expectLocalizedText(row.title);
      expectLocalizedText(row.summary);
      expectLocalizedText(row.sourceEvidence);
      expectLocalizedText(row.guardrail);
      expectLocalizedText(row.nextAction);
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
        expect(getLocalizedText(metric.label, locale).trim()).not.toBe("");
        expect(getLocalizedText(metric.description, locale).trim()).not.toBe("");
        expect(getLocalizedText(metric.target, locale).trim()).not.toBe("");
        expect(getLocalizedText(metric.trend, locale).trim()).not.toBe("");
        expect(getLocalizedText(metric.evidenceBasis, locale).trim()).not.toBe("");
        expect(getLocalizedText(metric.sourceSurface, locale).trim()).not.toBe("");
        expect(getLocalizedText(metric.nextAction, locale).trim()).not.toBe("");
        expect(getLocalizedText(metric.boundary, locale).trim()).not.toBe("");
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
        expect(getLocalizedText(lane.label, locale).trim()).not.toBe("");
        expect(getLocalizedText(lane.description, locale).trim()).not.toBe("");
        expect(getLocalizedText(lane.evidence, locale).trim()).not.toBe("");
        expect(getLocalizedText(lane.nextAction, locale).trim()).not.toBe("");
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
      expectLocalizedText(localizedText);
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
      expectLocalizedText(localizedText);
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

  it("derives API usage commercialization readiness from API Skill contracts without live side effects", () => {
    const surface = createApiUsageCommercializationReadiness();
    const repeated = createApiUsageCommercializationReadiness();
    const commandCenter = createProjectCampaignCommandCenter(campaignDetail);
    const adminOps = createAdminOpsReadModel(campaignDetail);
    const candidateIds = surface.candidates.map((candidate) => candidate.skillId);

    expect(surface).toEqual(repeated);
    expect(commandCenter.apiUsageCommercializationReadiness).toEqual(surface);
    expect(adminOps.apiUsageCommercializationReadiness).toEqual(surface);
    expect(candidateIds).toEqual([
      "verify_task",
      "check_eligibility",
      "get_campaign_analytics",
      "export_winners",
      "generate_campaign_posts",
      "summarize_campaign",
      "list_campaigns",
      "get_campaign_detail",
    ]);
    expect(surface.missingCandidateIds).toEqual([]);
    expect(surface.summary).toMatchObject({
      missingCandidateCount: 0,
      productionReadyCount: 0,
      totalCandidates: surface.candidates.length,
    });
    expect(surface.summary.blockedCount).toBe(
      surface.candidates.filter((candidate) => candidate.readiness === "blocked").length,
    );
    expect(surface.summary.reviewRequiredCount).toBe(
      surface.candidates.filter((candidate) => candidate.readiness === "review_required").length,
    );
    expect(surface.summary.highRiskCount).toBe(
      surface.candidates.filter((candidate) => candidate.riskLevel === "high").length,
    );
    expect(surface.summary.billingHandoffCount).toBe(
      surface.candidates.filter((candidate) =>
        candidate.billingHandoff.state === "blocked" || candidate.billingHandoff.state === "review_required"
      ).length,
    );
    expect(surface.candidates.every((candidate) =>
      candidate.authKeyReadiness.label["en-US"] &&
      candidate.quotaPolicy.label["en-US"] &&
      candidate.meteringStatus.label["en-US"] &&
      candidate.rateLimitPolicy.label["en-US"] &&
      candidate.billingHandoff.label["en-US"] &&
      candidate.nextAction["en-US"] &&
      candidate.boundary["en-US"].includes("No live API gateway")
    )).toBe(true);
    expect(surface.candidates.find((candidate) => candidate.skillId === "verify_task")).toMatchObject({
      readiness: "blocked",
      reviewState: "blocked",
      riskLevel: "high",
    });
    expect(surface.candidates.find((candidate) => candidate.skillId === "export_winners")).toMatchObject({
      readiness: "blocked",
      reviewState: "blocked",
      riskLevel: "high",
    });
    expect(surface.rewardBoundary["en-US"]).toContain("does not custody rewards");
    expect(surface.rewardBoundary["en-US"]).toContain("aelf-funded reward subsidies");
    expect(surface.boundary["en-US"]).toContain("No live API gateway");
    expect(surface.boundary["en-US"]).toContain("billing");
    expect(surface.boundary["en-US"]).toContain("reward distribution");

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
      expect(hasOwnKeyDeep(surface, unsafe)).toBe(false);
    }
  });

  it("maps local campaign lifecycle statuses to V2 contract-safe status readiness", () => {
    const readiness = createContractStatusMappingReadiness();
    const rowsByStatus = Object.fromEntries(
      readiness.rows.map((row) => [row.localStatus, row]),
    );
    const expectedV2StatusByLocalStatus: Partial<Record<typeof campaignLifecycleStatuses[number], ContractCampaignStatus>> = {
      archived: "ARCHIVED",
      draft: "DRAFT",
      ended: "ENDED",
      live: "LIVE",
      paused: "PAUSED",
      scheduled: "SCHEDULED",
    };

    expect(readiness.rows.map((row) => row.localStatus)).toEqual([...campaignLifecycleStatuses]);
    expect(new Set(readiness.rows.map((row) => row.localStatus)).size).toBe(campaignLifecycleStatuses.length);
    expect(readiness.summary).toMatchObject({
      totalStatuses: campaignLifecycleStatuses.length,
      contractSafeCount: 6,
      offChainOnlyCount: 3,
      blockedWriteCount: 3,
      topStatus: "ai_draft",
    });
    expect(readiness.boundary["en-US"]).toContain("No live contract transaction");
    expect(readiness.boundary["en-US"]).toContain("AI drafts");

    for (const [localStatus, contractStatus] of Object.entries(expectedV2StatusByLocalStatus)) {
      expect(rowsByStatus[localStatus]).toMatchObject({
        classification: "contract_safe",
        contractWriteAllowed: true,
        localStatus,
        targetContractStatus: contractStatus,
      });
    }

    for (const localStatus of ["ai_draft", "human_review"] as const) {
      expect(rowsByStatus[localStatus]).toMatchObject({
        classification: "off_chain_review",
        contractWriteAllowed: false,
        localStatus,
        targetContractStatus: null,
      });
      expect(rowsByStatus[localStatus].boundary["en-US"]).toContain("off-chain");
    }

    expect(rowsByStatus.exported).toMatchObject({
      classification: "export_evidence",
      contractWriteAllowed: false,
      localStatus: "exported",
      targetContractStatus: null,
    });
    expect(rowsByStatus.exported.targetContractStatus).not.toBe("ARCHIVED");
    expect(rowsByStatus.exported.nextAction["en-US"]).toContain("root");

    for (const row of readiness.rows) {
      expectLocalizedText(row.label);
      expectLocalizedText(row.evidenceSurface);
      expectLocalizedText(row.boundary);
      expectLocalizedText(row.nextAction);
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
      "es-ES",
      "id-ID",
      "ja-JP",
      "ko-KR",
      "tr-TR",
      "vi-VN",
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
      "es-ES": "https://campaign.local/es-ES/campaigns/awaken-sprint",
      "id-ID": "https://campaign.local/id-ID/campaigns/awaken-sprint",
      "ja-JP": "https://campaign.local/ja-JP/campaigns/awaken-sprint",
      "ko-KR": "https://campaign.local/ko-KR/campaigns/awaken-sprint",
      "tr-TR": "https://campaign.local/tr-TR/campaigns/awaken-sprint",
      "vi-VN": "https://campaign.local/vi-VN/campaigns/awaken-sprint",
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

  it("executes local i18n review actions without mutating source revisions or live boundaries", () => {
    const originalRevisions = structuredClone(campaignDetail.contentRevisions);
    const generated = executeI18nReviewAction(campaignDetail, {
      actionId: "generate_with_ai",
      reviewer: "project_owner",
      targetLocale: "zh-TW",
    });

    expect(generated.ok).toBe(true);
    expect(campaignDetail.contentRevisions).toEqual(originalRevisions);
    expect(generated.auditTrail).toMatchObject({
      actionId: "generate_with_ai",
      contractWriteExecuted: false,
      exportFileGenerated: false,
      externalProviderCalled: false,
      publishMutationExecuted: false,
      rewardDistributed: false,
      storageWriteExecuted: false,
      walletActionExecuted: false,
    });
    expect(generated.updatedRevisions.find((revision) => revision.locale === "en-US")).toEqual(
      originalRevisions.find((revision) => revision.locale === "en-US"),
    );
    expect(generated.updatedRevisions.find((revision) => revision.locale === "zh-TW")).toMatchObject({
      status: "ai_draft",
      title: "Awaken Sprint",
    });
    expect(generated.translationManager.localeItems.find((item) => item.locale === "zh-TW")).toMatchObject({
      fallbackToEnglish: true,
      status: "ai_draft",
    });
    expect(generated.actions.find((action) => action.id === "publish_revision")).toMatchObject({
      state: "blocked",
    });
    expect(generated.boundary["en-US"]).toContain("No live AI provider");

    const compared = executeI18nReviewAction(
      {
        ...campaignDetail,
        contentRevisions: generated.updatedRevisions,
      },
      {
        actionId: "compare_with_english",
        reviewer: "project_owner",
        targetLocale: "zh-TW",
      },
    );

    expect(compared.ok).toBe(true);
    expect(compared.updatedRevisions).toEqual(generated.updatedRevisions);
    expect(compared.auditTrail.mutatedContent).toBe(false);
    expect(compared.translationManager.comparisonRows.map((row) => row.id)).toEqual([
      "title",
      "description",
      "socialPost",
      "rewardDisclaimer",
    ]);

    const reviewed = executeI18nReviewAction(
      {
        ...campaignDetail,
        contentRevisions: generated.updatedRevisions,
      },
      {
        actionId: "mark_reviewed",
        reviewer: "project_owner",
        targetLocale: "zh-TW",
      },
    );

    expect(reviewed.ok).toBe(true);
    expect(reviewed.updatedRevisions.find((revision) => revision.locale === "zh-TW")).toMatchObject({
      reviewer: "project_owner",
      status: "human_reviewed",
    });
    expect(reviewed.translationManager.rewardDisclaimers.find((row) => row.locale === "zh-TW")).toMatchObject({
      blocksPublish: false,
      publishState: "ready",
      reviewState: "reviewed",
    });
    expect(reviewed.actions.find((action) => action.id === "publish_revision")).toMatchObject({
      state: "available",
    });

    const published = executeI18nReviewAction(
      {
        ...campaignDetail,
        contentRevisions: reviewed.updatedRevisions,
      },
      {
        actionId: "publish_revision",
        reviewer: "project_owner",
        targetLocale: "zh-TW",
      },
    );

    expect(published.ok).toBe(true);
    expect(published.updatedRevisions.find((revision) => revision.locale === "zh-TW")).toMatchObject({
      reviewer: "project_owner",
      status: "published",
    });
    expect(published.auditTrail.publishMutationExecuted).toBe(false);

    const fallback = executeI18nReviewAction(
      {
        ...campaignDetail,
        contentRevisions: published.updatedRevisions,
      },
      {
        actionId: "use_english_fallback",
        reviewer: "project_owner",
        targetLocale: "zh-TW",
      },
    );

    expect(fallback.ok).toBe(true);
    expect(fallback.updatedRevisions.find((revision) => revision.locale === "zh-TW")).toMatchObject({
      description: "",
      rewardDisclaimer: "",
      status: "empty",
      title: "",
    });
    expect(fallback.translationManager.rewardDisclaimers.find((row) => row.locale === "zh-TW")).toMatchObject({
      blocksPublish: true,
      publishState: "blocker",
      reviewState: "missing",
    });
    expect(executeI18nReviewAction(campaignDetail, {
      actionId: "generate_with_ai",
      reviewer: "project_owner",
      targetLocale: "zh-TW",
    })).toEqual(generated);
  });

  it("blocks invalid local i18n review transitions", () => {
    const publishBeforeReview = executeI18nReviewAction(campaignDetail, {
      actionId: "publish_revision",
      reviewer: "project_owner",
      targetLocale: "zh-CN",
    });
    const reviewMissingDraft = executeI18nReviewAction(campaignDetail, {
      actionId: "mark_reviewed",
      reviewer: "project_owner",
      targetLocale: "zh-TW",
    });
    const japaneseCompare = executeI18nReviewAction(campaignDetail, {
      actionId: "compare_with_english",
      reviewer: "project_owner",
      targetLocale: "ja-JP",
    });
    const unsupportedAction = executeI18nReviewAction(campaignDetail, {
      actionId: "publish_live_backend" as never,
      reviewer: "project_owner",
      targetLocale: "zh-CN",
    });

    expect(publishBeforeReview).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "ACTION_BLOCKED", field: "actionId" }),
    });
    expect(reviewMissingDraft).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "ACTION_BLOCKED", field: "targetLocale" }),
    });
    expect(japaneseCompare).toMatchObject({
      ok: true,
      targetLocale: "ja-JP",
      action: expect.objectContaining({ id: "compare_with_english" }),
    });
    expect(unsupportedAction).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "UNSUPPORTED_ACTION", field: "actionId" }),
    });
  });
});
