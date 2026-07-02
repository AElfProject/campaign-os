import { describe, expect, it } from "vitest";
import {
  builderSupportedLocales,
  computeBuilderPublishReadiness,
  createAiPlannerLaunchDecision,
  createAiCampaignPlannerDecisionConsole,
  createCampaignCreationWorkflowReadiness,
  createCampaignTemplatePack,
  createTaskTemplateFilterSummary,
  createPublishGateDecisionCenter,
  defaultTaskTemplateFilters,
  filterTaskTemplates,
  seededCampaignDraft,
  taskTemplateLanguageFilterOptions,
  taskTemplateLibrary,
  taskTemplateVerificationFilterOptions,
  taskTemplateWalletFilterOptions,
  type CampaignDraft,
  walletPolicyOptions,
} from "./builder";
import {
  createCampaignSettingsReadiness,
  createParticipantOperationsReadModel,
  createTranslationManagerReadModel,
} from "./campaign";
import { campaignDetail } from "./fixtures";
import type { ContentRevision, ContentRevisionStatus } from "./types";

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

const campaignQualityDraft = (
  selectedTaskTemplateIds: string[],
  estimatedRewardValueUsd = seededCampaignDraft.rewardPlan.estimatedRewardValueUsd,
): CampaignDraft => ({
  ...seededCampaignDraft,
  selectedTaskTemplateIds,
  rewardPlan: {
    ...seededCampaignDraft.rewardPlan,
    estimatedRewardValueUsd,
  },
});

const qualityGateFrom = (draft: CampaignDraft) =>
  createPublishGateDecisionCenter(draft).gates.find((gate) => gate.id === "campaign-quality");

describe("Campaign Builder domain foundation", () => {
  it("keeps builder locale support aligned to exact MVP locales", () => {
    expect(builderSupportedLocales).toEqual(["en-US", "zh-CN", "zh-TW"]);
    expect(seededCampaignDraft.defaultLocale).toBe("en-US");
    expect(seededCampaignDraft.fallbackLocale).toBe("en-US");
    expect(seededCampaignDraft.supportedLocales).toEqual(["en-US", "zh-CN", "zh-TW"]);
    expect(seededCampaignDraft.supportedLocales).not.toEqual(
      expect.arrayContaining(["ko-KR", "ja-JP", "vi-VN", "id-ID", "tr-TR", "es-ES"]),
    );
  });

  it("covers the required v0.1 task template categories", () => {
    expect(taskTemplateLibrary.map((template) => template.category)).toEqual([
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
    ]);

    for (const template of taskTemplateLibrary) {
      expect(template.localeReadiness).toEqual(
        expect.objectContaining({
          "en-US": expect.any(String),
          "zh-CN": expect.any(String),
          "zh-TW": expect.any(String),
        }),
      );
      expect(template.defaultPoints).toBeGreaterThan(0);
    }

    expect(
      taskTemplateLibrary
        .filter((template) => ["liquidity", "schrodinger", "pay", "forecast"].includes(template.category))
        .map((template) => ({
          id: template.id,
          walletCompatibility: template.walletCompatibility,
          requiredByDefault: template.requiredByDefault,
          riskLevel: template.riskLevel,
        })),
    ).toEqual([
      { id: "tpl-liquidity-awaken", walletCompatibility: "ANY", requiredByDefault: false, riskLevel: "medium" },
      { id: "tpl-schrodinger-hold", walletCompatibility: "ANY", requiredByDefault: false, riskLevel: "medium" },
      { id: "tpl-pay-complete", walletCompatibility: "ANY", requiredByDefault: false, riskLevel: "medium" },
      { id: "tpl-forecast-participate", walletCompatibility: "ANY", requiredByDefault: false, riskLevel: "medium" },
    ]);
  });

  it("uses Any wallet as the default and recommended wallet policy", () => {
    expect(seededCampaignDraft.walletPolicy).toBe("ANY");
    expect(walletPolicyOptions.find((option) => option.policy === "ANY")).toMatchObject({
      recommended: true,
      defaultSelected: true,
    });
    expect(walletPolicyOptions.map((option) => option.policy)).toEqual(["ANY", "AA_ONLY", "EOA_ONLY"]);
  });

  it("filters task templates by wallet compatibility semantics", () => {
    const aaTemplates = filterTaskTemplates(taskTemplateLibrary, {
      ...defaultTaskTemplateFilters,
      wallet: ["aa"],
    });
    const eoaTemplates = filterTaskTemplates(taskTemplateLibrary, {
      ...defaultTaskTemplateFilters,
      wallet: ["eoa"],
    });
    const anyTemplates = filterTaskTemplates(taskTemplateLibrary, {
      ...defaultTaskTemplateFilters,
      wallet: ["any"],
    });

    expect(aaTemplates.every((template) => ["ANY", "AA_ONLY"].includes(template.walletCompatibility))).toBe(true);
    expect(aaTemplates.map((template) => template.id)).toContain("tpl-wallet-connect");
    expect(aaTemplates.map((template) => template.id)).not.toContain("tpl-dao-vote");

    expect(eoaTemplates.every((template) => ["ANY", "EOA_ONLY"].includes(template.walletCompatibility))).toBe(true);
    expect(eoaTemplates.map((template) => template.id)).toEqual(
      expect.arrayContaining(["tpl-wallet-connect", "tpl-dao-vote"]),
    );

    expect(anyTemplates.every((template) => template.walletCompatibility === "ANY")).toBe(true);
    expect(anyTemplates).toHaveLength(11);
  });

  it("filters task templates by verification type", () => {
    expect(
      filterTaskTemplates(taskTemplateLibrary, {
        ...defaultTaskTemplateFilters,
        verification: ["on_chain"],
      }).map((template) => template.id),
    ).toEqual([
      "tpl-bridge-ebridge",
      "tpl-liquidity-awaken",
      "tpl-nft-hold",
      "tpl-schrodinger-hold",
      "tpl-dao-vote",
    ]);

    expect(
      filterTaskTemplates(taskTemplateLibrary, {
        ...defaultTaskTemplateFilters,
        verification: ["dapp_api"],
      }).map((template) => template.id),
    ).toEqual(["tpl-swap-awaken", "tpl-daipp-submit", "tpl-pay-complete", "tpl-forecast-participate"]);

    expect(
      filterTaskTemplates(taskTemplateLibrary, {
        ...defaultTaskTemplateFilters,
        verification: ["social", "wallet", "referral"],
      }).map((template) => template.id),
    ).toEqual(["tpl-wallet-connect", "tpl-social-share", "tpl-invite-friend"]);

    expect(
      filterTaskTemplates(taskTemplateLibrary, {
        ...defaultTaskTemplateFilters,
        verification: ["manual"],
      }),
    ).toEqual([]);
  });

  it("filters task templates by Chinese locale readiness including zh-TW fallback", () => {
    const missingTranslations = filterTaskTemplates(taskTemplateLibrary, {
      ...defaultTaskTemplateFilters,
      language: ["missing_translations"],
    });
    const zhDraft = filterTaskTemplates(taskTemplateLibrary, {
      ...defaultTaskTemplateFilters,
      language: ["zh_draft"],
    });
    const zhFallback = filterTaskTemplates(taskTemplateLibrary, {
      ...defaultTaskTemplateFilters,
      language: ["zh_fallback"],
    });
    const zhReviewed = filterTaskTemplates(taskTemplateLibrary, {
      ...defaultTaskTemplateFilters,
      language: ["zh_reviewed"],
    });

    expect(missingTranslations.map((template) => template.id)).toEqual(
      taskTemplateLibrary.map((template) => template.id),
    );
    expect(zhDraft.map((template) => template.id)).toEqual([
      "tpl-bridge-ebridge",
      "tpl-swap-awaken",
      "tpl-liquidity-awaken",
      "tpl-nft-hold",
      "tpl-schrodinger-hold",
      "tpl-daipp-submit",
      "tpl-pay-complete",
      "tpl-forecast-participate",
      "tpl-social-share",
    ]);
    expect(zhFallback.map((template) => template.id)).toEqual([
      "tpl-wallet-connect",
      "tpl-dao-vote",
      "tpl-invite-friend",
    ]);
    expect(zhReviewed).toEqual([]);
    expect(
      JSON.stringify([
        taskTemplateWalletFilterOptions,
        taskTemplateVerificationFilterOptions,
        taskTemplateLanguageFilterOptions,
      ]),
    ).toContain("Chinese");
  });

  it("composes task template filters and summarizes empty states", () => {
    const focusedTemplates = filterTaskTemplates(taskTemplateLibrary, {
      ...defaultTaskTemplateFilters,
      wallet: ["eoa"],
      verification: ["on_chain"],
      language: ["zh_fallback"],
    });
    const emptyTemplates = filterTaskTemplates(taskTemplateLibrary, {
      ...defaultTaskTemplateFilters,
      wallet: ["any"],
      verification: ["manual"],
      language: ["zh_reviewed"],
    });
    const summary = createTaskTemplateFilterSummary(taskTemplateLibrary, emptyTemplates, {
      ...defaultTaskTemplateFilters,
      wallet: ["any"],
      verification: ["manual"],
      language: ["zh_reviewed"],
    });

    expect(focusedTemplates.map((template) => template.id)).toEqual(["tpl-dao-vote"]);
    expect(emptyTemplates).toEqual([]);
    expect(summary).toEqual({
      hasActiveFilters: true,
      isEmpty: true,
      selectedFilters: 3,
      totalTemplates: 12,
      visibleTemplates: 0,
    });
  });

  it("creates the five seeded campaign template presets with exact v0.1 intent", () => {
    const pack = createCampaignTemplatePack();

    expect(pack.templates.map((template) => template.id)).toEqual([
      "aelf-onboarding-campaign",
      "awaken-liquidity-challenge",
      "nft-holder-quest",
      "dao-governance-campaign",
      "ai-agent-coin-launch-campaign",
    ]);
    expect(pack.templates).toHaveLength(5);
    expect(pack.summary).toMatchObject({
      defaultLocale: "en-US",
      readyTemplateCount: 1,
      reviewRequiredTemplateCount: 4,
      totalTemplates: 5,
    });
    expect(pack.summary.ecosystemCoverage.map((coverage) => coverage["en-US"])).toEqual([
      "Onboarding",
      "Awaken liquidity",
      "NFT holder",
      "DAO governance",
      "AI agent launch",
    ]);
    expect(pack.summary.boundary["en-US"]).toContain("No live provider verification");
    expect(pack.summary.boundary["en-US"]).toContain("automatic publish");

    expect(
      pack.templates.map((template) => ({
        id: template.id,
        ownerRole: template.ownerRole,
        sequence: template.taskSequence.map((step) => step.taskCategory),
      })),
    ).toEqual([
      {
        id: "aelf-onboarding-campaign",
        ownerRole: "project_owner",
        sequence: ["wallet", "bridge", "swap", "portfolio", "invite"],
      },
      {
        id: "awaken-liquidity-challenge",
        ownerRole: "project_owner",
        sequence: ["swap", "liquidity", "liquidity", "invite", "leaderboard"],
      },
      {
        id: "nft-holder-quest",
        ownerRole: "project_owner",
        sequence: ["nft", "schrodinger", "nft", "social", "leaderboard"],
      },
      {
        id: "dao-governance-campaign",
        ownerRole: "internal_operator",
        sequence: ["dao", "proposal_summary", "dao", "invite", "governance_badge"],
      },
      {
        id: "ai-agent-coin-launch-campaign",
        ownerRole: "internal_operator",
        sequence: ["agent_page", "daipp", "daipp", "social", "leaderboard"],
      },
    ]);
  });

  it("keeps campaign template presets localized and bounded to review-only use", () => {
    const pack = createCampaignTemplatePack();

    for (const template of pack.templates) {
      for (const localizedField of [
        template.title,
        template.goal,
        template.targetAudience,
        template.suitableFor,
        template.pointsAndRankingHint,
        template.rewardBoundary,
        template.riskGuidance,
        template.nextAction,
        template.boundary,
      ]) {
        expect(localizedField).toEqual(
          expect.objectContaining({
            "en-US": expect.any(String),
            "zh-CN": expect.any(String),
            "zh-TW": expect.any(String),
          }),
        );
        expect(localizedField["en-US"].length).toBeGreaterThan(0);
        expect(localizedField["zh-CN"].length).toBeGreaterThan(0);
        expect(localizedField["zh-TW"].length).toBeGreaterThan(0);
      }

      expect(template.defaultWalletPolicy).toBe("ANY");
      expect(template.taskSequence).toHaveLength(5);
      expect(template.rewardBoundary["en-US"]).toContain("Campaign OS provides preset guidance");
      expect(template.boundary["en-US"]).toContain("No live provider verification");
      expect(template.boundary["en-US"]).toContain("reward custody");

      for (const step of template.taskSequence) {
        expect(step.label["en-US"]).toBeTruthy();
        expect(step.label["zh-CN"]).toBeTruthy();
        expect(step.description["en-US"]).toBeTruthy();
        expect(step.verificationIntent["en-US"]).toBeTruthy();
      }
    }

    expect(pack.templates.some((template) => template.taskSequence.some((step) => step.localOnly))).toBe(true);
    expect(pack.templates.some((template) => template.taskSequence.some((step) => step.reviewRequired))).toBe(true);

    for (const unsafeKey of [
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
      expect(hasOwnKeyDeep(pack, unsafeKey)).toBe(false);
    }
  });

  it("separates readiness blockers, warnings, and passed checks", () => {
    const readiness = computeBuilderPublishReadiness(seededCampaignDraft);

    expect(seededCampaignDraft.defaultContractImpact.mode).toBe("OFF_CHAIN_MVP");
    expect(seededCampaignDraft.contractImpact.mode).toBe("CONTRACT_CLAIM");
    expect(readiness.ready).toBe(false);
    expect(readiness.blockers.map((check) => check.id)).toEqual([
      "localized-reward-disclaimer",
      "contract-impact",
    ]);
    expect(readiness.warnings.map((check) => check.id)).toEqual([
      "i18n-human-review",
      "risk-social-reward",
    ]);
    expect(readiness.passed.map((check) => check.id)).toEqual(
      expect.arrayContaining(["basics-complete", "campaign-quality", "reward-disclaimer", "export-disclaimer"]),
    );
  });

  it("blocks high-reward campaign quality when no task is selected", () => {
    const qualityGate = qualityGateFrom(campaignQualityDraft([]));

    expect(qualityGate).toMatchObject({
      blocksPublish: true,
      group: "risk",
      ownerRole: "internal_operator",
      status: "blocker",
    });
    expect(qualityGate?.reason["en-US"]).toContain("meaningful ecosystem action");
    expect(qualityGate?.nextAction["en-US"]).toContain("bridge");
  });

  it("blocks high-reward social-only campaign quality before publish", () => {
    const qualityGate = qualityGateFrom(campaignQualityDraft(["tpl-social-share"]));

    expect(qualityGate).toMatchObject({
      blocksPublish: true,
      status: "blocker",
    });
    expect(qualityGate?.reason["en-US"]).toContain("High-reward campaigns");
  });

  it("warns lower-value social-only campaign quality without marking it ready", () => {
    const qualityGate = qualityGateFrom(campaignQualityDraft(["tpl-social-share"], 100));

    expect(qualityGate).toMatchObject({
      blocksPublish: false,
      status: "warning",
    });
    expect(qualityGate?.reason["en-US"]).toContain("lacks a meaningful ecosystem action");
  });

  it("does not treat wallet and referral only tasks as meaningful ecosystem action", () => {
    const qualityGate = qualityGateFrom(campaignQualityDraft(["tpl-wallet-connect", "tpl-invite-friend"], 100));

    expect(qualityGate).toMatchObject({
      blocksPublish: false,
      status: "warning",
    });
    expect(qualityGate?.nextAction["en-US"]).toContain("manual review");
  });

  it("passes campaign quality when bridge or swap ecosystem actions are selected", () => {
    const bridgeGate = qualityGateFrom(campaignQualityDraft(["tpl-bridge-ebridge"]));
    const swapGate = qualityGateFrom(campaignQualityDraft(["tpl-swap-awaken"]));

    expect(bridgeGate).toMatchObject({
      blocksPublish: false,
      status: "passed",
    });
    expect(swapGate).toMatchObject({
      blocksPublish: false,
      status: "passed",
    });
  });

  it("passes campaign quality for DApp API ecosystem actions", () => {
    const qualityGate = qualityGateFrom(campaignQualityDraft(["tpl-pay-complete"]));

    expect(qualityGate).toMatchObject({
      blocksPublish: false,
      status: "passed",
    });
    expect(qualityGate?.reason["en-US"]).toContain("meaningful ecosystem action");
  });

  it("requires reward and export non-distribution disclaimers", () => {
    const readiness = computeBuilderPublishReadiness(seededCampaignDraft);

    expect(seededCampaignDraft.rewardPlan.disclaimer["en-US"]).toContain("Campaign OS does not distribute rewards");
    expect(seededCampaignDraft.rewardPlan.exportDisclaimer["en-US"]).toContain(
      "Exporting winners does not distribute rewards",
    );
    expect(readiness.passed.map((check) => check.id)).toContain("reward-disclaimer");
    expect(readiness.passed.map((check) => check.id)).toContain("export-disclaimer");
  });

  it("blocks publish until localized reward disclaimers are reviewed per locale", () => {
    const readiness = computeBuilderPublishReadiness(seededCampaignDraft);
    const localizedDisclaimerGate = readiness.blockers.find((check) => check.id === "localized-reward-disclaimer");

    expect(localizedDisclaimerGate).toMatchObject({
      group: "rewards",
      ownerRole: "project_owner",
      status: "blocker",
    });
    expect(localizedDisclaimerGate?.reason["en-US"]).toContain("zh-CN");
    expect(localizedDisclaimerGate?.reason["en-US"]).toContain("zh-TW");
    expect(localizedDisclaimerGate?.nextAction["en-US"]).toContain("localized reward disclaimers");
  });

  it("creates the seeded publish gate decision center read model", () => {
    const decisionCenter = createPublishGateDecisionCenter(seededCampaignDraft);

    expect(decisionCenter.campaignDraftId).toBe(seededCampaignDraft.id);
    expect(decisionCenter.ready).toBe(false);
    expect(decisionCenter.launchState).toBe("blocker");
    expect(decisionCenter.counts).toEqual({
      blockers: 2,
      passed: 7,
      total: 11,
      warnings: 2,
    });
    expect(decisionCenter.gates.map((gate) => gate.group)).toEqual([
      "rewards",
      "contract",
      "i18n",
      "risk",
      "basics",
      "rewards",
      "export",
      "risk",
      "wallet",
      "tasks",
      "risk",
    ]);
    expect(new Set(decisionCenter.gates.map((gate) => gate.group))).toEqual(
      new Set(["basics", "wallet", "tasks", "rewards", "i18n", "contract", "risk", "export"]),
    );
  });

  it("surfaces explicit wallet, task, risk, contract, export, and boundary copy", () => {
    const decisionCenter = createPublishGateDecisionCenter(seededCampaignDraft);
    const gateById = new Map(decisionCenter.gates.map((gate) => [gate.id, gate]));

    expect(gateById.get("wallet-policy")).toMatchObject({
      blocksPublish: false,
      ownerRole: "project_owner",
      status: "passed",
    });
    expect(gateById.get("wallet-policy")?.reason["en-US"]).toContain("Any wallet allows AA and EOA");

    expect(gateById.get("task-verifiability")).toMatchObject({
      blocksPublish: false,
      ownerRole: "internal_operator",
      status: "passed",
    });
    expect(gateById.get("task-verifiability")?.reason["en-US"]).toContain("bridge");
    expect(gateById.get("task-verifiability")?.nextAction["en-US"]).toContain("on-chain or dApp API");

    expect(gateById.get("i18n-human-review")).toMatchObject({
      ownerRole: "project_owner",
      status: "warning",
    });
    expect(gateById.get("i18n-human-review")?.reason["en-US"]).toContain("Chinese locale");

    expect(gateById.get("contract-impact")).toMatchObject({
      blocksPublish: true,
      ownerRole: "contract_reviewer",
      status: "blocker",
    });

    expect(gateById.get("campaign-quality")).toMatchObject({
      blocksPublish: false,
      ownerRole: "internal_operator",
      status: "passed",
    });
    expect(gateById.get("campaign-quality")?.reason["en-US"]).toContain("meaningful ecosystem action");

    expect(gateById.get("risk-referral-controls")?.reason["en-US"]).toContain("Referral validation");
    expect(gateById.get("risk-referral-controls")?.reason["en-US"]).toContain("risk flags");
    expect(gateById.get("export-disclaimer")?.reason["en-US"]).toContain(
      "Exporting winners does not distribute rewards",
    );
    expect(decisionCenter.boundary["en-US"]).toContain("no real publish");
    expect(decisionCenter.boundary["en-US"]).toContain("reward distribution");
  });

  it("routes publish gate approvals while carrying zh-TW locale readiness", () => {
    const decisionCenter = createPublishGateDecisionCenter(seededCampaignDraft);

    expect(decisionCenter.approvalRoutes.map((route) => route.ownerRole)).toEqual([
      "project_owner",
      "internal_operator",
      "contract_reviewer",
    ]);
    expect(decisionCenter.approvalRoutes.map((route) => route.status)).toEqual([
      "blocker",
      "warning",
      "blocker",
    ]);
    expect(decisionCenter.approvalRoutes.flatMap((route) => route.gateIds)).toEqual(
      expect.arrayContaining([
        "contract-impact",
        "campaign-quality",
        "export-disclaimer",
        "i18n-human-review",
        "localized-reward-disclaimer",
        "reward-disclaimer",
        "risk-referral-controls",
        "risk-social-reward",
        "wallet-policy",
      ]),
    );
    expect(seededCampaignDraft.supportedLocales).toEqual(["en-US", "zh-CN", "zh-TW"]);
    expect(JSON.stringify(decisionCenter)).toContain("zh-TW");
  });

  it("surfaces zh-TW fallback content in the translation manager read model", () => {
    const contentRevisions: ContentRevision[] = seededCampaignDraft.contentRevisions.map((revision) => {
      const status: ContentRevisionStatus = revision.published
        ? "published"
        : revision.humanReviewed
          ? "human_reviewed"
          : revision.aiDraft
            ? "ai_draft"
            : "empty";

      return {
        campaignId: seededCampaignDraft.id,
        description: revision.description,
        id: revision.id,
        locale: revision.locale,
        rewardDisclaimer: revision.rewardDisclaimer,
        socialPost: revision.socialPost,
        sourceLocale: revision.sourceLocale,
        status,
        title: revision.title,
        updatedAt: "2026-06-29T12:00:00Z",
      };
    });
    const translationManager = createTranslationManagerReadModel({
      contentRevisions,
      defaultLocale: seededCampaignDraft.defaultLocale,
      id: seededCampaignDraft.id,
      supportedLocales: seededCampaignDraft.supportedLocales,
    });

    expect(translationManager.supportedLocales).toEqual(["en-US", "zh-CN", "zh-TW"]);
    expect(translationManager.localeItems.map((item) => item.locale)).toEqual(["en-US", "zh-CN", "zh-TW"]);
    expect(translationManager.localeItems.find((item) => item.locale === "zh-TW")).toMatchObject({
      fallbackToEnglish: true,
      humanReviewed: false,
      publishState: "warning",
      status: "empty",
    });
    expect(translationManager.rewardDisclaimers.map((row) => row.locale)).toEqual([
      "en-US",
      "zh-CN",
      "zh-TW",
    ]);
    expect(translationManager.panels.find((panel) => panel.locale === "zh-TW")).toMatchObject({
      fallbackToEnglish: true,
      humanReviewed: false,
      publishState: "warning",
      status: "empty",
    });
  });

  it("creates the seeded AI campaign planner decision console", () => {
    const planner = createAiCampaignPlannerDecisionConsole(seededCampaignDraft);

    expect(planner.draftId).toBe(seededCampaignDraft.id);
    expect(planner.summary).toMatchObject({
      contractMode: "OFF_CHAIN_MVP",
      defaultLocale: "en-US",
      reviewedByHuman: true,
      supportedLocales: ["en-US", "zh-CN", "zh-TW"],
      walletPolicy: "ANY",
    });
    expect(planner.summary.prompt).toContain("activation campaign");
    expect(planner.summary.generatedOutline).toHaveLength(4);
    expect(planner.summary.generatedOutline.join(" ")).toContain("zh-TW");
    expect(planner.summary.campaignTemplatePack).toMatchObject({
      defaultLocale: "en-US",
      totalTemplates: 5,
    });
    expect(planner.summary.campaignTemplatePack.boundary["en-US"]).toContain("No live provider verification");
    expect(planner.summary.recommendedWallet["en-US"]).toContain("Portkey AA");
    expect(planner.boundary["en-US"]).toContain("No live AI provider");
    expect(planner.boundary["en-US"]).toContain("no automatic publish");
    expect(planner.nextAction["en-US"]).toContain("Review");
    expect(planner.groups.map((group) => group.id)).toEqual([
      "campaign_structure",
      "wallet_policy",
      "language_plan",
      "task_strategy",
      "risk_hints",
      "contract_recommendation",
    ]);
  });

  it("surfaces wallet, locale, task, risk, and contract planner decisions", () => {
    const planner = createAiCampaignPlannerDecisionConsole(seededCampaignDraft);
    const itemsById = new Map(
      planner.groups.flatMap((group) => group.items).map((item) => [item.id, item]),
    );

    expect(itemsById.get("wallet-any-conversion")).toMatchObject({
      confidence: "high",
      ownerRole: "project_owner",
      status: "ready",
    });
    expect(itemsById.get("wallet-any-conversion")?.rationale["en-US"]).toContain("AA and EOA");
    expect(itemsById.get("wallet-portkey-aa-onboarding")?.label["en-US"]).toContain("Portkey AA");
    expect(itemsById.get("wallet-portkey-aa-onboarding")?.rationale["en-US"]).not.toContain("mandatory");

    expect(itemsById.get("language-default-en")?.rationale["en-US"]).toContain("Default language is English");
    expect(itemsById.get("language-default-en")?.rationale["en-US"]).toContain("zh-TW");
    expect(itemsById.get("language-zh-review")?.status).toBe("review_required");
    expect(itemsById.get("language-zh-review")?.rationale["en-US"]).toContain("fallback");
    expect(itemsById.get("task-verified-anchors")?.rationale["en-US"]).toContain("bridge");
    expect(itemsById.get("task-campaign-template-pack")).toMatchObject({
      ownerRole: "project_owner",
      status: "ready",
    });
    expect(itemsById.get("task-campaign-template-pack")?.rationale["en-US"]).toContain(
      "without creating, publishing, or mutating",
    );
    expect(itemsById.get("risk-social-review")?.status).toBe("warning");
    expect(itemsById.get("contract-off-chain-mvp")).toMatchObject({
      ownerRole: "contract_reviewer",
      status: "ready",
    });
    expect(itemsById.get("contract-claim-blocker")).toMatchObject({
      ownerRole: "contract_reviewer",
      status: "blocked",
    });
    expect(itemsById.get("contract-claim-blocker")?.rationale["en-US"]).toContain("not enabled");
    expect(planner.counts).toEqual({
      blocked: 1,
      ready: 9,
      reviewRequired: 2,
      total: 13,
      warning: 1,
    });
    expect(JSON.stringify(planner)).toContain("zh-TW");
  });

  it("creates an actionable AI planner launch decision from selected tasks and inherited gates", () => {
    const launchDecision = createAiPlannerLaunchDecision(seededCampaignDraft);
    const repeatedLaunchDecision = createAiPlannerLaunchDecision(seededCampaignDraft);

    expect(JSON.stringify(launchDecision)).toBe(JSON.stringify(repeatedLaunchDecision));
    expect(launchDecision.draftId).toBe(seededCampaignDraft.id);
    expect(launchDecision.summary).toMatchObject({
      approvalRouteCount: 3,
      inheritedGateCount: expect.any(Number),
      selectedTaskCount: seededCampaignDraft.selectedTaskTemplateIds.length,
      selectedTemplateCount: 1,
    });
    expect(launchDecision.selectedTemplate).toMatchObject({
      ownerRole: "project_owner",
      readiness: "review_required",
      templateId: "awaken-liquidity-challenge",
    });
    expect(launchDecision.selectedTemplate.boundary["en-US"]).toContain("No live provider verification");

    expect(launchDecision.selectedTasks.map((task) => task.taskId)).toEqual([
      "tpl-wallet-connect",
      "tpl-bridge-ebridge",
      "tpl-swap-awaken",
      "tpl-social-share",
    ]);
    expect(launchDecision.selectedTasks.map((task) => ({
      points: task.defaultPoints,
      riskLevel: task.riskLevel,
      taskId: task.taskId,
      verificationType: task.verificationType,
      walletCompatibility: task.walletCompatibility,
    }))).toEqual([
      { points: 40, riskLevel: "low", taskId: "tpl-wallet-connect", verificationType: "WALLET", walletCompatibility: "ANY" },
      { points: 120, riskLevel: "low", taskId: "tpl-bridge-ebridge", verificationType: "ON_CHAIN", walletCompatibility: "ANY" },
      { points: 100, riskLevel: "medium", taskId: "tpl-swap-awaken", verificationType: "DAPP_API", walletCompatibility: "ANY" },
      { points: 180, riskLevel: "high", taskId: "tpl-social-share", verificationType: "SOCIAL", walletCompatibility: "ANY" },
    ]);
    expect(launchDecision.selectedTasks.find((task) => task.taskId === "tpl-social-share")).toMatchObject({
      reviewRequired: true,
      localeReadiness: expect.objectContaining({
        "en-US": "ready",
        "zh-CN": "ai_draft",
        "zh-TW": "missing",
      }),
    });

    const gateIds = launchDecision.inheritedGates.map((gate) => gate.gateId);
    expect(gateIds).toEqual(expect.arrayContaining([
      "contract-impact",
      "export-disclaimer",
      "i18n-human-review",
      "localized-reward-disclaimer",
      "risk-social-reward",
    ]));
    expect(launchDecision.inheritedGates.find((gate) => gate.gateId === "contract-impact")).toMatchObject({
      blocksPublish: true,
      ownerRole: "contract_reviewer",
      status: "blocker",
    });
    expect(launchDecision.inheritedGates.find((gate) => gate.gateId === "i18n-human-review")).toMatchObject({
      ownerRole: "project_owner",
      status: "warning",
    });

    const approvalRoutesByRole = new Map(launchDecision.approvalRoutes.map((route) => [route.ownerRole, route]));
    expect([...approvalRoutesByRole.keys()]).toEqual(["project_owner", "internal_operator", "contract_reviewer"]);
    expect(approvalRoutesByRole.get("project_owner")?.decisionIds.length).toBeGreaterThan(0);
    expect(approvalRoutesByRole.get("internal_operator")?.decisionIds.length).toBeGreaterThan(0);
    expect(approvalRoutesByRole.get("contract_reviewer")).toMatchObject({ status: "blocked" });

    const contractDecision = launchDecision.decisionItems.find((item) => item.id === "launch-contract-claim-blocker");
    expect(contractDecision).toMatchObject({
      ownerRole: "contract_reviewer",
      status: "blocked",
    });
    expect(contractDecision?.reason["en-US"]).toContain("Contract claim");
    expect(launchDecision.boundary["en-US"]).toContain("No live AI provider");
    expect(launchDecision.boundary["en-US"]).toContain("no automatic publish");
    expect(launchDecision.boundary["en-US"]).toContain("no contract execution");
    expect(launchDecision.boundary["en-US"]).toContain("no reward custody");
    expect(launchDecision.boundary["en-US"]).toContain("no reward distribution");
    expect(launchDecision.nextAction["en-US"]).toContain("Review selected tasks");
  });

  it("derives the campaign creation workflow readiness from existing gates", () => {
    const workflow = createCampaignCreationWorkflowReadiness(seededCampaignDraft);
    const repeatedWorkflow = createCampaignCreationWorkflowReadiness(seededCampaignDraft);

    expect(JSON.stringify(workflow)).toBe(JSON.stringify(repeatedWorkflow));
    expect(workflow.draftId).toBe(seededCampaignDraft.id);
    expect(workflow.steps.map((step) => step.id)).toEqual([
      "campaign_goal",
      "wallet_locale_setup",
      "task_builder",
      "rewards_eligibility",
      "i18n_content_review",
      "contract_impact_review",
      "admin_review",
      "publish",
    ]);
    expect(workflow.summary.totalSteps).toBe(workflow.steps.length);
    expect(
      workflow.summary.readySteps +
        workflow.summary.reviewRequiredSteps +
        workflow.summary.warningSteps +
        workflow.summary.blockedSteps,
    ).toBe(workflow.steps.length);
    expect(workflow.summary.publishBlocked).toBe(true);
    expect(workflow.summary.inheritedGateCount).toBeGreaterThan(0);

    const stepsById = new Map(workflow.steps.map((step) => [step.id, step]));
    expect(stepsById.get("campaign_goal")).toMatchObject({
      ownerRole: "project_owner",
      state: "ready",
    });
    expect(stepsById.get("task_builder")).toMatchObject({
      ownerRole: "internal_operator",
      state: "review_required",
    });
    expect(stepsById.get("rewards_eligibility")).toMatchObject({
      ownerRole: "project_owner",
      state: "blocked",
    });
    expect(stepsById.get("contract_impact_review")).toMatchObject({
      ownerRole: "contract_reviewer",
      state: "blocked",
    });
    expect(stepsById.get("publish")).toMatchObject({
      state: "blocked",
    });
    expect(stepsById.get("publish")?.blockerIds).toEqual(
      expect.arrayContaining(["contract-impact", "localized-reward-disclaimer"]),
    );
    expect(stepsById.get("i18n_content_review")?.warningIds).toContain("i18n-human-review");
    expect(stepsById.get("admin_review")?.warningIds).toContain("risk-social-reward");

    const nonReadySteps = workflow.steps.filter((step) => step.state !== "ready");
    expect(nonReadySteps.every((step) => step.nextAction["en-US"].length > 0)).toBe(true);
    expect(new Set(nonReadySteps.map((step) => step.ownerRole))).toEqual(
      new Set(["project_owner", "internal_operator", "contract_reviewer"]),
    );
    expect(workflow.boundary["en-US"]).toContain("No live campaign creation");
    expect(workflow.boundary["en-US"]).toContain("no automatic publish");
    expect(workflow.boundary["en-US"]).toContain("no contract execution");
    expect(workflow.boundary["en-US"]).toContain("no export file");
    expect(workflow.boundary["en-US"]).toContain("no reward custody");
    expect(workflow.boundary["en-US"]).toContain("no reward distribution");
    expect(workflow.sourceChecklist).toEqual(
      expect.arrayContaining([
        "docs/current/aelf_campaign_os_v0.2/docs/01_product_requirements_v0.2.md#Campaign 创建流程 v0.2",
        "docs/current/aelf_campaign_os_v0.2/docs/09_delivery_checklist_v0.2.md",
      ]),
    );
  });

  it("derives seeded participant operations without live providers or reward distribution", () => {
    const operations = createParticipantOperationsReadModel(campaignDetail);

    expect(operations.campaignId).toBe(campaignDetail.id);
    expect(operations.summary).toMatchObject({
      aaWalletParticipants: 2,
      blockedParticipants: 1,
      eligibleParticipants: 1,
      eoaWalletParticipants: 2,
      exportReadyParticipants: 1,
      pendingParticipants: 1,
      reviewRequiredParticipants: 1,
      riskFlaggedParticipants: 2,
      totalParticipants: 4,
    });
    expect(operations.summary.localeCounts).toEqual({
      "en-US": 2,
      "zh-CN": 1,
      "zh-TW": 1,
    });

    const rowsById = new Map(operations.rows.map((row) => [row.participantId, row]));

    expect(rowsById.get("part-aa-001")).toMatchObject({
      completedTasks: 4,
      eligible: true,
      exportStatus: "ready",
      taskProgressLabel: {
        "en-US": "4/5 tasks",
        "zh-CN": "4/5 个任务",
      },
      totalTasks: 5,
      walletAddress: "2F4...9aB",
    });
    expect(rowsById.get("part-nightelf-risk-001")).toMatchObject({
      exportStatus: "review_required",
      riskFlags: ["manual_review_queue"],
      walletSource: "NIGHTELF",
    });
    expect(rowsById.get("part-eoa-001")).toMatchObject({
      exportStatus: "blocked",
      riskFlags: ["referral_velocity_review"],
    });
    expect(rowsById.get("part-aa-pending-001")).toMatchObject({
      exportStatus: "pending",
      riskFlags: [],
    });
    expect(operations.boundary["en-US"]).toContain("does not distribute rewards");
    expect(rowsById.get("part-aa-001")?.rewardBoundary["en-US"]).toContain(
      "Export winners does not distribute rewards",
    );
  });

  it("derives read-only campaign settings readiness across required groups", () => {
    const readiness = createCampaignSettingsReadiness(campaignDetail);

    expect(readiness.campaignId).toBe(campaignDetail.id);
    expect(readiness.groups.map((group) => group.id)).toEqual([
      "wallet-policy",
      "contract-mode",
      "reward-responsibility",
      "i18n-fallback",
      "verification-risk",
      "export-policy",
      "publish-prerequisites",
    ]);
    expect(readiness.summary.totalGroups).toBe(7);
    expect(
      readiness.summary.readyGroups +
        readiness.summary.reviewRequiredGroups +
        readiness.summary.blockedGroups,
    ).toBe(7);
    expect(readiness.summary.reviewRequiredGroups).toBeGreaterThan(0);
    expect(readiness.summary.blockedGroups).toBe(1);

    const groupsById = new Map(readiness.groups.map((group) => [group.id, group]));

    expect(groupsById.get("wallet-policy")).toMatchObject({
      ownerRole: "project_owner",
      readiness: "ready",
    });
    expect(groupsById.get("contract-mode")).toMatchObject({
      ownerRole: "contract_reviewer",
      readiness: "ready",
    });
    expect(groupsById.get("reward-responsibility")?.evidence["en-US"]).toContain(
      "Export winners does not distribute rewards",
    );
    expect(groupsById.get("i18n-fallback")).toMatchObject({
      readiness: "review_required",
    });
    expect(groupsById.get("verification-risk")).toMatchObject({
      ownerRole: "internal_operator",
      readiness: "blocked",
    });
    expect(groupsById.get("export-policy")).toMatchObject({
      readiness: "review_required",
    });
    expect(groupsById.get("publish-prerequisites")).toMatchObject({
      readiness: "review_required",
    });
    expect(readiness.boundary["en-US"]).toContain("Read-only");
    expect(readiness.boundary["en-US"]).toContain("No live settings save");
    expect(readiness.boundary["en-US"]).toContain("reward distribution");
  });
});
