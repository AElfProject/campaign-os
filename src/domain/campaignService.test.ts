import { describe, expect, it } from "vitest";
import {
  EXPORT_CSV_COLUMNS,
  campaignDetail,
  createCampaignOsLocalService,
  serviceBoundary,
  walletAdapterFixtures,
} from "./index";

const service = createCampaignOsLocalService();

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
      supportedLocales: ["en-US", "zh-CN", "zh-TW" as never],
    });

    expect(campaign.payload).toMatchObject({
      contractMode: "OFF_CHAIN_MVP",
      defaultLocale: "en-US",
      supportedLocales: ["en-US", "zh-CN"],
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

    expect(completed.payload).toMatchObject({
      accountType: "AA",
      evidenceSource: "aelfscan",
      pointsAwarded: 120,
      status: "completed",
      walletSource: "PORTKEY_AA",
    });
    expect(pending.payload).toMatchObject({ status: "pending", evidenceSource: "dapp_api" });
    expect(failed.payload).toMatchObject({ status: "failed", evidenceSource: "social_api" });
    expect(manualReview.payload).toMatchObject({ status: "manual_review", evidenceSource: "manual" });
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
  });

  it("generates i18n drafts and rejects unsupported locales", () => {
    const draft = service.generateI18nDraft({
      campaignId: campaignDetail.id,
      contentKeys: ["title", "description", "rewardDisclaimer"],
      sourceLocale: "en-US",
      targetLocale: "zh-CN",
    });
    const unsupported = service.generateI18nDraft({
      campaignId: campaignDetail.id,
      contentKeys: ["title"],
      sourceLocale: "en-US",
      targetLocale: "zh-TW" as never,
    });

    expect(draft.payload).toMatchObject({
      aiDraft: true,
      fallbackToEnglish: true,
      humanReviewRequired: true,
      sourceLocale: "en-US",
      targetLocale: "zh-CN",
    });
    expect(draft.payload?.draft.rewardDisclaimer).toContain("不等于发奖");
    expect(draft.payload?.noAutoPublishNotice["en-US"]).toContain("cannot auto-publish");
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
      targetLocales: ["zh-CN"],
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

    expect(analytics.payload?.walletSplit.map((split) => split.label).sort()).toEqual(["AA", "EOA"]);
    expect(analytics.payload?.localeSplit.map((split) => split.label).sort()).toEqual(["en-US", "zh-CN"]);
    expect(JSON.stringify(analytics.payload?.localeSplit)).not.toContain("zh-TW");
    expect(posts.payload?.artifacts.length).toBeGreaterThan(0);
    expect(posts.payload?.humanReviewRequired).toBe(true);
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
    expect(unsafeExport).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "UNSUPPORTED_EXPORT_MODE", field: "contractRootMode" }),
    });
  });

  it("summarizes service coverage across API and field groups", () => {
    const coverage = service.getCoverageSummary();

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
      totalServices: 10,
    });
    expect(coverage.payload?.sampleResponseIds).toEqual(
      expect.arrayContaining(["createWalletSession", "checkEligibility", "exportWinners"]),
    );
    expect(serviceBoundary["en-US"]).toContain("No live API");
  });
});
