import { describe, expect, it } from "vitest";
import {
  builderSupportedLocales,
  computeBuilderPublishReadiness,
  createAiCampaignPlannerDecisionConsole,
  createTaskTemplateFilterSummary,
  createPublishGateDecisionCenter,
  defaultTaskTemplateFilters,
  filterTaskTemplates,
  seededCampaignDraft,
  taskTemplateLanguageFilterOptions,
  taskTemplateLibrary,
  taskTemplateVerificationFilterOptions,
  taskTemplateWalletFilterOptions,
  walletPolicyOptions,
} from "./builder";

describe("Campaign Builder domain foundation", () => {
  it("keeps builder locale support limited to en-US and zh-CN", () => {
    expect(builderSupportedLocales).toEqual(["en-US", "zh-CN"]);
    expect(seededCampaignDraft.defaultLocale).toBe("en-US");
    expect(seededCampaignDraft.fallbackLocale).toBe("en-US");
    expect(seededCampaignDraft.supportedLocales).toEqual(["en-US", "zh-CN"]);
  });

  it("covers the required v0.1 task template categories", () => {
    expect(taskTemplateLibrary.map((template) => template.category)).toEqual([
      "wallet",
      "bridge",
      "swap",
      "nft",
      "dao",
      "daipp",
      "social",
      "invite",
    ]);

    for (const template of taskTemplateLibrary) {
      expect(template.localeReadiness).toEqual(
        expect.objectContaining({
          "en-US": expect.any(String),
          "zh-CN": expect.any(String),
        }),
      );
      expect(template.defaultPoints).toBeGreaterThan(0);
    }
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
    expect(anyTemplates).toHaveLength(7);
  });

  it("filters task templates by verification type", () => {
    expect(
      filterTaskTemplates(taskTemplateLibrary, {
        ...defaultTaskTemplateFilters,
        verification: ["on_chain"],
      }).map((template) => template.id),
    ).toEqual(["tpl-bridge-ebridge", "tpl-nft-hold", "tpl-dao-vote"]);

    expect(
      filterTaskTemplates(taskTemplateLibrary, {
        ...defaultTaskTemplateFilters,
        verification: ["dapp_api"],
      }).map((template) => template.id),
    ).toEqual(["tpl-swap-awaken", "tpl-daipp-submit"]);

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

  it("filters task templates by language readiness without adding zh-TW", () => {
    const missingTranslations = filterTaskTemplates(taskTemplateLibrary, {
      ...defaultTaskTemplateFilters,
      language: ["missing_translations"],
    });
    const zhReviewed = filterTaskTemplates(taskTemplateLibrary, {
      ...defaultTaskTemplateFilters,
      language: ["zh_reviewed"],
    });

    expect(missingTranslations.map((template) => template.id)).toEqual(
      expect.arrayContaining(["tpl-bridge-ebridge", "tpl-dao-vote", "tpl-invite-friend"]),
    );
    expect(missingTranslations.map((template) => template.id)).not.toContain("tpl-wallet-connect");
    expect(zhReviewed.map((template) => template.id)).toEqual(["tpl-wallet-connect"]);
    expect(
      JSON.stringify([
        taskTemplateWalletFilterOptions,
        taskTemplateVerificationFilterOptions,
        taskTemplateLanguageFilterOptions,
      ]),
    ).not.toContain("zh-TW");
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
      totalTemplates: 8,
      visibleTemplates: 0,
    });
  });

  it("separates readiness blockers, warnings, and passed checks", () => {
    const readiness = computeBuilderPublishReadiness(seededCampaignDraft);

    expect(seededCampaignDraft.defaultContractImpact.mode).toBe("OFF_CHAIN_MVP");
    expect(seededCampaignDraft.contractImpact.mode).toBe("CONTRACT_CLAIM");
    expect(readiness.ready).toBe(false);
    expect(readiness.blockers.map((check) => check.id)).toEqual(["contract-impact"]);
    expect(readiness.warnings.map((check) => check.id)).toEqual([
      "i18n-human-review",
      "risk-social-reward",
    ]);
    expect(readiness.passed.map((check) => check.id)).toEqual(
      expect.arrayContaining(["basics-complete", "reward-disclaimer", "export-disclaimer"]),
    );
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

  it("creates the seeded publish gate decision center read model", () => {
    const decisionCenter = createPublishGateDecisionCenter(seededCampaignDraft);

    expect(decisionCenter.campaignDraftId).toBe(seededCampaignDraft.id);
    expect(decisionCenter.ready).toBe(false);
    expect(decisionCenter.launchState).toBe("blocker");
    expect(decisionCenter.counts).toEqual({
      blockers: 1,
      passed: 6,
      total: 9,
      warnings: 2,
    });
    expect(decisionCenter.gates.map((gate) => gate.group)).toEqual([
      "contract",
      "i18n",
      "risk",
      "basics",
      "rewards",
      "export",
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
    expect(gateById.get("i18n-human-review")?.reason["en-US"]).toContain("Chinese AI draft");

    expect(gateById.get("contract-impact")).toMatchObject({
      blocksPublish: true,
      ownerRole: "contract_reviewer",
      status: "blocker",
    });

    expect(gateById.get("risk-referral-controls")?.reason["en-US"]).toContain("Referral validation");
    expect(gateById.get("risk-referral-controls")?.reason["en-US"]).toContain("risk flags");
    expect(gateById.get("export-disclaimer")?.reason["en-US"]).toContain(
      "Exporting winners does not distribute rewards",
    );
    expect(decisionCenter.boundary["en-US"]).toContain("no real publish");
    expect(decisionCenter.boundary["en-US"]).toContain("reward distribution");
  });

  it("routes publish gate approvals to required owner roles without zh-TW locale support", () => {
    const decisionCenter = createPublishGateDecisionCenter(seededCampaignDraft);

    expect(decisionCenter.approvalRoutes.map((route) => route.ownerRole)).toEqual([
      "project_owner",
      "internal_operator",
      "contract_reviewer",
    ]);
    expect(decisionCenter.approvalRoutes.map((route) => route.status)).toEqual([
      "warning",
      "warning",
      "blocker",
    ]);
    expect(decisionCenter.approvalRoutes.flatMap((route) => route.gateIds)).toEqual(
      expect.arrayContaining([
        "contract-impact",
        "export-disclaimer",
        "i18n-human-review",
        "reward-disclaimer",
        "risk-referral-controls",
        "risk-social-reward",
        "wallet-policy",
      ]),
    );
    expect(seededCampaignDraft.supportedLocales).toEqual(["en-US", "zh-CN"]);
    expect(JSON.stringify(decisionCenter)).not.toContain("zh-TW");
  });

  it("creates the seeded AI campaign planner decision console", () => {
    const planner = createAiCampaignPlannerDecisionConsole(seededCampaignDraft);

    expect(planner.draftId).toBe(seededCampaignDraft.id);
    expect(planner.summary).toMatchObject({
      contractMode: "OFF_CHAIN_MVP",
      defaultLocale: "en-US",
      reviewedByHuman: true,
      supportedLocales: ["en-US", "zh-CN"],
      walletPolicy: "ANY",
    });
    expect(planner.summary.prompt).toContain("activation campaign");
    expect(planner.summary.generatedOutline).toHaveLength(4);
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
    expect(itemsById.get("language-zh-review")?.status).toBe("review_required");
    expect(itemsById.get("task-verified-anchors")?.rationale["en-US"]).toContain("bridge");
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
      ready: 8,
      reviewRequired: 2,
      total: 12,
      warning: 1,
    });
    expect(JSON.stringify(planner)).not.toContain("zh-TW");
  });
});
