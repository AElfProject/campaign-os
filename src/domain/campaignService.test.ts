import { describe, expect, it } from "vitest";
import {
  EXPORT_CSV_COLUMNS,
  campaignDetail,
  createCampaignOsLocalService,
  serviceBoundary,
  walletAdapterFixtures,
} from "./index";

const service = createCampaignOsLocalService();

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

describe("Campaign OS local API service facade", () => {
  it("returns explicit success and error envelopes with bilingual boundaries", () => {
    const success = service.getCoverageSummary();
    const failure = service.checkEligibility({
      campaignId: "missing-campaign",
      walletAddress: "2F4...9aB",
    });

    expect(success.ok).toBe(true);
    expect(success.payload).toBeDefined();
    expect(success.error).toBeUndefined();
    expect(success.boundary["en-US"]).toContain("No live API");
    expect(success.boundary["zh-CN"]).toContain("不会调用实时 API");
    expect(failure.ok).toBe(false);
    expect(failure.payload).toBeUndefined();
    expect(failure.error).toMatchObject({ code: "CAMPAIGN_NOT_FOUND", field: "campaignId" });
  });

  it("normalizes seeded wallet sessions without exposing credentials", () => {
    const sessions = Object.fromEntries(
      walletAdapterFixtures.map((fixture) => [
        fixture.id,
        service.createWalletSession({
          adapterName: fixture.adapterName,
          fixtureId: fixture.id,
        }),
      ]),
    );

    expect(sessions["sess-aa-001"].payload).toMatchObject({
      accountType: "AA",
      walletSource: "PORTKEY_AA",
      verificationStatus: "verified",
      walletTypeVerified: true,
    });
    expect(sessions["sess-eoa-app-001"].payload).toMatchObject({
      accountType: "EOA",
      walletSource: "PORTKEY_EOA_APP",
      verificationStatus: "verified",
    });
    expect(sessions["sess-eoa-001"].payload).toMatchObject({
      walletSource: "PORTKEY_EOA_EXTENSION",
      walletTypeVerified: true,
    });
    expect(sessions["sess-nightelf-001"].payload).toMatchObject({
      walletSource: "NIGHTELF",
      walletTypeVerified: true,
    });
    expect(sessions["sess-agent-skill-001"].payload).toMatchObject({
      walletSource: "AGENT_SKILL",
      verificationStatus: "internal_agent",
      walletTypeVerified: false,
    });
    expect(sessions["sess-unsupported-001"].payload).toMatchObject({
      verificationStatus: "unsupported_wallet",
      walletTypeVerified: false,
    });
    expect(sessions["sess-wrong-chain-001"].payload).toMatchObject({
      verificationStatus: "wrong_chain",
      walletTypeVerified: false,
    });
    expect(sessions["sess-missing-signature-001"].payload).toMatchObject({
      signatureStatus: "missing",
      verificationStatus: "missing_signature",
    });
    expect(sessions["sess-account-restricted-001"].payload).toMatchObject({
      verificationStatus: "account_restricted",
      walletTypeVerified: false,
    });
    expect(sessions["sess-unknown-001"].payload).toMatchObject({
      accountType: "UNKNOWN",
      verificationStatus: "address_only",
    });
    expect(JSON.stringify(sessions).toLowerCase()).not.toContain("private key");
    expect(JSON.stringify(sessions).toLowerCase()).not.toContain("seed phrase");
    expect(JSON.stringify(sessions).toLowerCase()).not.toContain("bearer ");
  });

  it("creates campaign and task payloads with locale, wallet, contract, and evidence metadata", () => {
    const campaign = service.createCampaign({
      projectId: "awaken",
      rewardDescription: "Rewards remain project owned.",
    });
    const task = service.addTask({
      campaignId: campaignDetail.id,
      evidenceRule: { source: "AELFSCAN", minAmount: 1 },
      points: 120,
      required: true,
      templateCode: "bridge_ebridge",
      verificationType: "ON_CHAIN",
      walletCompatibility: "ANY",
    });
    const unsupportedLocale = service.createCampaign({
      projectId: "awaken",
      rewardDescription: "Rewards remain project owned.",
      supportedLocales: ["en-US", "zh-CN", "fr-FR" as never],
    });
    const invalidTask = service.addTask({
      campaignId: campaignDetail.id,
      evidenceRule: { source: "LOCAL_SEEDED" },
      points: -1,
      required: true,
      templateCode: "",
      verificationType: "MANUAL",
      walletCompatibility: "ANY",
    });

    expect(campaign.payload).toMatchObject({
      contractMode: "OFF_CHAIN_MVP",
      defaultLocale: "en-US",
      supportedLocales: ["en-US", "zh-CN", "zh-TW"],
      walletPolicy: "ANY",
    });
    expect(campaign.payload?.publishReadiness.ready).toBe(true);
    expect(task.payload).toMatchObject({
      campaignId: campaignDetail.id,
      evidenceRule: { source: "AELFSCAN", minAmount: 1 },
      points: 120,
      required: true,
      templateCode: "bridge_ebridge",
      verificationType: "ON_CHAIN",
      walletCompatibility: "ANY",
    });
    expect(unsupportedLocale).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "UNSUPPORTED_LOCALE", field: "supportedLocales" }),
    });
    expect(invalidTask).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "INVALID_REQUEST", field: "templateCode" }),
    });
  });

  it("verifies task states and eligibility while preserving wallet provenance", () => {
    const completed = service.verifyTask({
      accountType: "AA",
      campaignId: campaignDetail.id,
      taskId: "task-bridge",
      walletAddress: "2F4...9aB",
      walletSource: "PORTKEY_AA",
    });
    const pending = service.verifyTask({
      accountType: "EOA",
      campaignId: campaignDetail.id,
      taskId: "task-swap",
      walletAddress: "3E9...7cD",
      walletSource: "PORTKEY_EOA_EXTENSION",
    });
    const failed = service.verifyTask({
      accountType: "EOA",
      campaignId: campaignDetail.id,
      taskId: "task-social",
      walletAddress: "3E9...7cD",
      walletSource: "PORTKEY_EOA_EXTENSION",
    });
    const manualReview = service.verifyTask({
      accountType: "EOA",
      campaignId: campaignDetail.id,
      taskId: "task-agent-review",
      walletAddress: "3E9...7cD",
      walletSource: "PORTKEY_EOA_EXTENSION",
    });
    const notEligible = service.checkEligibility({
      campaignId: campaignDetail.id,
      walletAddress: "3E9...7cD",
    });
    const eligible = service.checkEligibility({
      campaignId: campaignDetail.id,
      walletAddress: "2F4...9aB",
    });
    const riskFlagged = service.checkEligibility({
      campaignId: campaignDetail.id,
      walletAddress: "5N1...4fA",
    });
    const pendingEligibility = service.checkEligibility({
      campaignId: campaignDetail.id,
      walletAddress: "7P8...2bE",
    });
    const missingTask = service.verifyTask({
      accountType: "AA",
      campaignId: campaignDetail.id,
      taskId: "missing-task",
      walletAddress: "2F4...9aB",
      walletSource: "PORTKEY_AA",
    });
    const missingParticipant = service.checkEligibility({
      campaignId: campaignDetail.id,
      walletAddress: "missing-wallet",
    });

    expect(completed.payload).toMatchObject({
      accountType: "AA",
      canonicalEvidenceSource: "AELFSCAN",
      evidence: expect.objectContaining({
        evidenceHash: "demo-task-bridge-2F4",
        evidenceId: "demo-task-bridge-2F4",
        live: false,
        source: "AELFSCAN",
      }),
      evidenceSource: "aelfscan",
      manualReview: expect.objectContaining({
        queued: false,
        severity: "info",
      }),
      nextAction: expect.objectContaining({
        "en-US": expect.stringContaining("verified"),
        "zh-CN": expect.stringContaining("已验证"),
      }),
      pointsAwarded: 120,
      provider: expect.objectContaining({
        providerId: "aelfscan",
        readiness: "local_only",
      }),
      riskFlags: [],
      status: "completed",
      walletSource: "PORTKEY_AA",
    });
    expect(pending.payload).toMatchObject({
      evidenceSource: "dapp_api",
      pointsAwarded: 0,
      provider: expect.objectContaining({ readiness: "unavailable" }),
      status: "pending",
    });
    expect(failed.payload).toMatchObject({
      evidenceSource: "social_api",
      pointsAwarded: 0,
      provider: expect.objectContaining({ readiness: "blocked" }),
      status: "failed",
    });
    expect(manualReview.payload).toMatchObject({
      evidenceSource: "manual",
      manualReview: expect.objectContaining({
        queued: true,
        queueId: "review-task-agent-review-3E9",
      }),
      pointsAwarded: 0,
      provider: expect.objectContaining({ readiness: "review_required" }),
      status: "manual_review",
    });
    expect(manualReview.payload?.nextAction["en-US"]).toContain("manual review");
    expect(notEligible.payload).toMatchObject({
      accountType: "EOA",
      eligible: false,
      localePreference: "zh-CN",
      missingTasks: ["bridge_ebridge"],
      riskFlags: ["referral_velocity_review"],
      status: "not_eligible",
      walletSource: "PORTKEY_EOA_EXTENSION",
      walletTypeVerified: true,
    });
    expect(eligible.payload).toMatchObject({ eligible: true, status: "eligible" });
    expect(riskFlagged.payload).toMatchObject({ eligible: false, status: "risk_flagged" });
    expect(pendingEligibility.payload).toMatchObject({ eligible: false, status: "pending" });
    expect(missingTask).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "TASK_NOT_FOUND", field: "taskId" }),
    });
    expect(missingParticipant).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "PARTICIPANT_NOT_FOUND", field: "walletAddress" }),
    });
  });

  it("generates i18n drafts for Chinese targets and rejects unsupported locales", () => {
    const zhCnDraft = service.generateI18nDraft({
      campaignId: campaignDetail.id,
      contentKeys: ["title", "description", "rewardDisclaimer"],
      sourceLocale: "en-US",
      targetLocale: "zh-CN",
    });
    const zhTwDraft = service.generateI18nDraft({
      campaignId: campaignDetail.id,
      contentKeys: ["title", "description", "rewardDisclaimer"],
      sourceLocale: "en-US",
      targetLocale: "zh-TW",
    });
    const unsupported = service.generateI18nDraft({
      campaignId: campaignDetail.id,
      contentKeys: ["title"],
      sourceLocale: "en-US",
      targetLocale: "ja-JP" as never,
    });

    expect(zhCnDraft.payload).toMatchObject({
      aiDraft: true,
      fallbackToEnglish: true,
      humanReviewRequired: true,
      sourceLocale: "en-US",
      targetLocale: "zh-CN",
    });
    expect(zhCnDraft.payload?.draft.rewardDisclaimer).toContain("不等于发奖");
    expect(zhCnDraft.payload?.noAutoPublishNotice["en-US"]).toContain("cannot auto-publish");
    expect(zhTwDraft.payload).toMatchObject({
      aiDraft: false,
      fallbackToEnglish: true,
      humanReviewRequired: true,
      sourceLocale: "en-US",
      targetLocale: "zh-TW",
    });
    expect(zhTwDraft.payload?.draft.title).toBe("Awaken Sprint");
    expect(zhTwDraft.payload?.noAutoPublishNotice["zh-TW"]).toContain("AI generated translation");
    expect(unsupported).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "UNSUPPORTED_LOCALE", field: "targetLocale" }),
    });
  });

  it("returns analytics, campaign posts, summaries, and export previews without live outputs", () => {
    const analytics = service.getCampaignAnalytics({ campaignId: campaignDetail.id });
    const posts = service.generateCampaignPosts({
      campaignId: campaignDetail.id,
      channel: "x",
      sourceLocale: "en-US",
      targetLocales: ["zh-CN", "zh-TW"],
    });
    const summary = service.summarizeCampaign({ campaignId: campaignDetail.id, period: "daily" });
    const exportPreview = service.exportWinners({
      campaignId: campaignDetail.id,
      contractRootMode: "none",
      format: "csv",
      includeLocalePreference: true,
      includeRiskFlags: true,
      includeWalletType: true,
    });
    const unsafeExport = service.exportWinners({
      campaignId: campaignDetail.id,
      contractRootMode: "eligibility_root" as never,
      format: "csv",
      includeLocalePreference: true,
      includeRiskFlags: true,
      includeWalletType: true,
    });
    const jsonExportPreview = service.exportWinners({
      campaignId: campaignDetail.id,
      contractRootMode: "none",
      format: "json",
      includeLocalePreference: true,
      includeRiskFlags: true,
      includeWalletType: true,
    });
    const exportReadiness = service.getExportConfirmationReadiness({
      campaignId: campaignDetail.id,
    });

    expect(analytics.payload?.walletSplit.map((split) => split.label).sort()).toEqual(["AA", "EOA"]);
    expect(analytics.payload?.localeSplit.map((split) => split.label).sort()).toEqual([
      "en-US",
      "zh-CN",
      "zh-TW",
    ]);
    expect(JSON.stringify(analytics.payload?.localeSplit)).toContain("zh-TW");
    expect(posts.payload?.artifacts.length).toBeGreaterThan(0);
    expect(posts.payload?.humanReviewRequired).toBe(true);
    expect(posts.payload?.noAutoPublishNotice["zh-TW"]).toContain("AI generated translation");
    expect(summary.payload).toMatchObject({
      campaignId: campaignDetail.id,
      localeMetrics: expect.any(Array),
      period: "daily",
      riskSummary: expect.any(Array),
      walletTypeMetrics: expect.any(Array),
    });
    expect(exportPreview.payload?.columns).toEqual(EXPORT_CSV_COLUMNS);
    expect(exportPreview.payload).toMatchObject({
      blockedRows: 0,
      contractRootMode: "none",
      format: "csv",
      readyRows: 1,
      reviewRequiredRows: 3,
    });
    expect(exportPreview.payload?.rows[1]).toMatchObject({
      evidenceHashes: expect.arrayContaining(["demo-task-bridge-3E9"]),
      localePreference: "zh-CN",
      rowStatus: "review_required",
      taskRecords: expect.arrayContaining(["task-bridge:pending:aelfscan"]),
      walletSource: "PORTKEY_EOA_EXTENSION",
    });
    expect(JSON.stringify(exportPreview.payload)).not.toContain("downloadUrl");
    expect(exportPreview.payload).not.toHaveProperty("contractRoot");
    expect(exportPreview.payload?.confirmation.noDistributionBoundary["en-US"]).toContain(
      "does not distribute rewards",
    );
    expect(exportPreview.payload?.exportReadiness.previewModes.map((mode) => mode.mode)).toEqual(["csv", "json"]);
    expect(jsonExportPreview.payload).toMatchObject({
      contractRootMode: "none",
      format: "json",
      readyRows: 1,
      reviewRequiredRows: 3,
    });
    expect(jsonExportPreview.payload?.exportReadiness.previewModes.find((mode) => mode.mode === "json")).toMatchObject({
      downloadAvailable: false,
      generatesFile: false,
      readiness: "ready",
    });
    expect(exportReadiness.payload?.acknowledgements.map((item) => item.id)).toEqual([
      "verified-records-only",
      "project-owned-reward-distribution",
      "no-reward-custody",
      "no-reward-distribution",
      "no-real-export-file",
    ]);
    expect(exportReadiness.payload?.contractRootReadiness.find((mode) => mode.mode === "contract_claim")).toMatchObject({
      readiness: "blocked",
      approvalRequired: true,
    });
    expect(hasOwnKeyDeep(jsonExportPreview.payload, "downloadUrl")).toBe(false);
    expect(hasOwnKeyDeep(jsonExportPreview.payload, "storageKey")).toBe(false);
    expect(hasOwnKeyDeep(jsonExportPreview.payload, "contractRoot")).toBe(false);
    expect(hasOwnKeyDeep(jsonExportPreview.payload, "transactionId")).toBe(false);
    expect(unsafeExport).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "UNSUPPORTED_EXPORT_MODE", field: "contractRootMode" }),
    });
  });

  it("summarizes service coverage across API and field groups", () => {
    const coverage = service.getCoverageSummary();
    const pipeline = service.getVerificationPipelineReadiness({
      campaignId: campaignDetail.id,
    });
    const missingPipeline = service.getVerificationPipelineReadiness({
      campaignId: "missing-campaign",
    });

    expect(coverage.payload).toMatchObject({
      blockedCount: 0,
      coveredApiGroups: expect.arrayContaining([
        "wallet_session",
        "task_verification",
        "eligibility",
        "analytics",
        "export",
        "content_generation",
        "campaign_summary",
      ]),
      coveredFieldGroups: expect.arrayContaining([
        "wallet",
        "locale",
        "contract",
        "export",
        "evidence",
        "analytics",
        "campaign",
        "task",
        "content",
        "risk",
      ]),
      totalServices: 12,
    });
    expect(coverage.payload?.sampleResponseIds).toEqual(
      expect.arrayContaining([
        "createWalletSession",
        "verifyTask",
        "checkEligibility",
        "getVerificationPipelineReadiness",
        "getExportConfirmationReadiness",
        "exportWinners",
      ]),
    );
    expect(coverage.payload?.verificationBoundary["en-US"]).toContain("No live AeFinder");
    expect(pipeline.payload).toMatchObject({
      summary: expect.objectContaining({
        totalPaths: 7,
        liveEvidenceReadyPaths: 0,
      }),
      taskOutcomeCoverage: expect.objectContaining({
        completedCount: 10,
        failedCount: 1,
        manualReviewCount: 3,
        pendingCount: 6,
      }),
      eligibilityImpact: expect.objectContaining({
        missingRequiredTasks: ["bridge_ebridge"],
        referralQualificationStatus: "needs_verified_invitee",
      }),
    });
    expect(pipeline.payload?.paths.map((path) => path.id)).toEqual([
      "aefinder-on-chain",
      "aelfscan-on-chain",
      "dapp-api",
      "social-api",
      "wallet-session",
      "manual-review",
      "referral-qualification",
    ]);
    expect(JSON.stringify(pipeline.payload)).not.toContain("contractRoot");
    expect(JSON.stringify(pipeline.payload)).not.toContain("downloadUrl");
    expect(missingPipeline).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "CAMPAIGN_NOT_FOUND", field: "campaignId" }),
    });
    expect(serviceBoundary["en-US"]).toContain("No live API");
  });
});
