import { describe, expect, it } from "vitest";
import {
  builderSupportedLocales,
  computeBuilderPublishReadiness,
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
});
