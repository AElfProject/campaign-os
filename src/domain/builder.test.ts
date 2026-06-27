import { describe, expect, it } from "vitest";
import {
  builderSupportedLocales,
  computeBuilderPublishReadiness,
  createPublishGateDecisionCenter,
  seededCampaignDraft,
  taskTemplateLibrary,
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
});
