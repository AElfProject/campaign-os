import { describe, expect, it } from "vitest";
import {
  apiSkillContractRegistry,
  createApiSkillContractSurface,
  getApiSkillContractCoverage,
  requiredApiSkillFieldGroups,
  requiredApiSkillIds,
} from "./apiSkillContracts";

const contractsById = Object.fromEntries(
  apiSkillContractRegistry.map((contract) => [contract.id, contract]),
);

describe("API Skill Contract registry", () => {
  it("covers the complete v0.1 first skill batch plus the v0.2 wallet session API", () => {
    expect(apiSkillContractRegistry.map((contract) => contract.id)).toEqual(requiredApiSkillIds);
    expect(createApiSkillContractSurface().summary).toMatchObject({
      missingSkillIds: [],
      totalContracts: 9,
    });
  });

  it("models the local wallet session API contract with optional public identity metadata", () => {
    const walletSession = contractsById.create_wallet_session;
    const inputFields = new Map(walletSession.inputFields.map((field) => [field.name, field]));
    const outputFields = new Map(walletSession.outputFields.map((field) => [field.name, field]));

    expect(walletSession).toMatchObject({
      apiGroup: "wallet_session",
      readiness: "local_only",
      riskLevel: "medium",
    });
    expect([...inputFields.keys()]).toEqual(
      expect.arrayContaining(["address", "adapterName", "chainId", "network", "signature"]),
    );
    expect(inputFields.get("signature")?.required).toBe(false);
    expect([...outputFields.keys()]).toEqual(
      expect.arrayContaining([
        "sessionId",
        "address",
        "accountType",
        "walletSource",
        "walletName",
        "chainId",
        "network",
        "accounts",
        "publicKey",
        "capabilities",
        "verificationStatus",
        "signatureStatus",
        "walletTypeVerified",
      ]),
    );
    expect(outputFields.get("accounts")).toMatchObject({ group: "wallet", required: false });
    expect(outputFields.get("publicKey")).toMatchObject({ group: "wallet", required: false });
    expect(outputFields.has("signature")).toBe(false);
    expect(walletSession.securityBoundary["en-US"]).toContain("No live API");
    expect(walletSession.securityBoundary["en-US"]).toContain("wallet SDK");
  });

  it("keeps every contract structured, localized, and bounded", () => {
    for (const contract of apiSkillContractRegistry) {
      expect(contract.title["en-US"]).toBeTruthy();
      expect(contract.title["zh-CN"]).toBeTruthy();
      expect(contract.title["zh-TW"]).toBeTruthy();
      expect(contract.purpose["en-US"]).toBeTruthy();
      expect(contract.inputFields.length).toBeGreaterThan(0);
      expect(contract.outputFields.length).toBeGreaterThan(0);
      expect(contract.securityBoundary["en-US"]).toMatch(/No live|Verification contract|Export contract|Seeded\/local/);
      expect(contract.nextAction["zh-CN"]).toBeTruthy();
      expect(contract.nextAction["zh-TW"]).toBeTruthy();
    }
  });

  it("documents exact MVP locale targets without widening to P1 locales", () => {
    const createCampaignFields = contractsById.create_campaign.inputFields;
    const postFields = contractsById.generate_campaign_posts.inputFields;
    const supportedLocales = createCampaignFields.find((field) => field.name === "supportedLocales");
    const targetLocales = postFields.find((field) => field.name === "targetLocales");

    expect(supportedLocales?.description["en-US"]).toContain("en-US, zh-CN, and zh-TW");
    expect(supportedLocales?.example).toBe("en-US,zh-CN,zh-TW");
    expect(targetLocales?.description["en-US"]).toContain("zh-CN and zh-TW");
    expect(targetLocales?.example).toBe("zh-CN,zh-TW");
    expect(JSON.stringify([supportedLocales, targetLocales])).not.toContain("ja-JP");
  });

  it("covers v0.2 wallet, locale, contract, export, and evidence field groups", () => {
    const coverage = getApiSkillContractCoverage();

    expect(coverage.requiredFieldGroups).toEqual(requiredApiSkillFieldGroups);
    expect(coverage.missingFieldGroups).toEqual([]);
    expect(coverage.coveredFieldGroups).toEqual(
      expect.arrayContaining(["wallet", "locale", "contract", "export", "evidence"]),
    );
  });

  it("models exact v0.2 campaign, task, completion, and content field contracts", () => {
    const createCampaignFields = new Map(
      [
        ...contractsById.create_campaign.inputFields,
        ...contractsById.create_campaign.outputFields,
      ].map((field) => [field.name, field]),
    );
    const taskGenerationFields = new Map(
      [
        ...contractsById.generate_campaign_tasks.inputFields,
        ...contractsById.generate_campaign_tasks.outputFields,
      ].map((field) => [field.name, field]),
    );
    const taskCompletionFields = new Map(
      [
        ...contractsById.verify_task.inputFields,
        ...contractsById.verify_task.outputFields,
      ].map((field) => [field.name, field]),
    );
    const postFields = new Map(
      [
        ...contractsById.generate_campaign_posts.inputFields,
        ...contractsById.generate_campaign_posts.outputFields,
      ].map((field) => [field.name, field]),
    );

    expect([...createCampaignFields.keys()]).toEqual(
      expect.arrayContaining([
        "projectId",
        "ownerAddress",
        "status",
        "defaultLocale",
        "supportedLocales",
        "walletPolicy",
        "contractMode",
        "metadataUri",
        "metadataHash",
        "rewardDisclaimerHash",
        "startTime",
        "endTime",
      ]),
    );
    for (const optionalField of ["metadataUri", "metadataHash", "rewardDisclaimerHash"]) {
      expect(createCampaignFields.get(optionalField)?.required).toBe(false);
    }
    expect(createCampaignFields.get("status")).toMatchObject({
      example: "draft,scheduled,live,paused,ended,exported,archived",
      group: "campaign",
      required: true,
    });

    expect([...taskGenerationFields.keys()]).toEqual(
      expect.arrayContaining([
        "campaignId",
        "templateCode",
        "titleKey",
        "instructionKey",
        "verificationType",
        "walletCompatibility",
        "points",
        "required",
        "evidenceRule",
      ]),
    );

    expect([...taskCompletionFields.keys()]).toEqual(
      expect.arrayContaining([
        "campaignId",
        "taskId",
        "walletAddress",
        "accountType",
        "walletSource",
        "status",
        "evidenceSource",
        "evidenceHash",
        "txId",
        "completedAt",
        "pointsAwarded",
      ]),
    );
    for (const optionalField of ["evidenceHash", "txId", "completedAt"]) {
      expect(taskCompletionFields.get(optionalField)?.required).toBe(false);
    }

    expect([...postFields.keys()]).toEqual(expect.arrayContaining(["contentKeys"]));
    expect(postFields.get("contentKeys")?.example).toBe("title,description,rewardDisclaimer,faq");
  });

  it("models verification and eligibility wallet/evidence boundaries", () => {
    const verifyTaskFields = [
      ...contractsById.verify_task.inputFields,
      ...contractsById.verify_task.outputFields,
    ];
    const eligibilityFields = [
      ...contractsById.check_eligibility.inputFields,
      ...contractsById.check_eligibility.outputFields,
    ];

    expect(verifyTaskFields.map((field) => field.name)).toEqual(
      expect.arrayContaining([
        "walletAddress",
        "accountType",
        "walletSource",
        "canonicalEvidenceSource",
        "evidenceSource",
        "evidenceId",
        "evidenceHash",
        "providerReadiness",
        "fallbackReason",
        "riskFlags",
        "manualReview",
        "nextAction",
      ]),
    );
    expect(contractsById.verify_task.evidenceSources).toEqual(
      expect.arrayContaining([
        "LOCAL_SEEDED",
        "AEFINDER",
        "AELFSCAN",
        "DAPP_API",
        "SOCIAL_API",
        "WALLET_SESSION",
        "MANUAL",
      ]),
    );
    expect(contractsById.verify_task.securityBoundary["en-US"]).toContain("no live provider");
    expect(eligibilityFields.map((field) => field.name)).toEqual(
      expect.arrayContaining([
        "walletAddress",
        "accountType",
        "walletSource",
        "walletTypeVerified",
        "localePreference",
      ]),
    );
  });

  it("models export winner columns and safety options", () => {
    const exportFields = [
      ...contractsById.export_winners.inputFields,
      ...contractsById.export_winners.outputFields,
    ];

    expect(exportFields.map((field) => field.name)).toEqual(
      expect.arrayContaining([
        "includeRiskFlags",
        "includeWalletType",
        "includeLocalePreference",
        "contractRootMode",
        "csvColumns",
        "evidenceHashes",
      ]),
    );
    expect(exportFields.find((field) => field.name === "csvColumns")?.description["en-US"]).toContain(
      "wallet_source",
    );
    expect(contractsById.export_winners.securityBoundary["en-US"]).toContain(
      "does not distribute rewards",
    );
  });

  it("derives readiness summary without UI hard-coding", () => {
    const surface = createApiSkillContractSurface();

    expect(surface.summary).toMatchObject({
      blockedCount: 0,
      externalEvidenceCount: 4,
      highRiskCount: 2,
      localOnlyCount: 3,
      readyCount: 3,
      reviewRequiredCount: 3,
    });
    expect(surface.boundary["en-US"]).toContain("does not call live APIs");
    expect(surface.boundary["zh-CN"]).toContain("不会调用实时 API");
  });
});
