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
  it("covers the complete v0.1 first skill batch plus the v0.2 wallet session, discovery, add-task, i18n draft, and agent wallet action APIs", () => {
    expect(apiSkillContractRegistry.map((contract) => contract.id)).toEqual(requiredApiSkillIds);
    expect(createApiSkillContractSurface().summary).toMatchObject({
      missingSkillIds: [],
      totalContracts: 14,
    });
  });

  it("models local campaign discovery list and detail contracts", () => {
    const listCampaigns = contractsById.list_campaigns;
    const getCampaignDetail = contractsById.get_campaign_detail;
    const listFields = new Map(
      [...listCampaigns.inputFields, ...listCampaigns.outputFields].map((field) => [field.name, field]),
    );
    const detailFields = new Map(
      [...getCampaignDetail.inputFields, ...getCampaignDetail.outputFields].map((field) => [field.name, field]),
    );

    expect(listCampaigns).toMatchObject({
      apiGroup: "campaign_discovery",
      readiness: "local_only",
      riskLevel: "medium",
    });
    expect(getCampaignDetail).toMatchObject({
      apiGroup: "campaign_discovery",
      readiness: "local_only",
      riskLevel: "medium",
    });
    expect([...listFields.keys()]).toEqual(
      expect.arrayContaining([
        "consumerSurface",
        "status",
        "walletAddress",
        "campaignId",
        "items",
        "title",
        "points",
        "coreTasks",
        "walletPolicy",
        "supportedLocales",
        "consumerSurfaces",
        "boundary",
      ]),
    );
    expect([...detailFields.keys()]).toEqual(
      expect.arrayContaining([
        "campaignId",
        "consumerSurface",
        "walletAddress",
        "item",
        "tasks",
        "eligibilityEntry",
        "rewardBoundary",
        "appHubContext",
        "portfolioContext",
        "forecastContext",
        "boundary",
      ]),
    );
    expect(listFields.get("walletAddress")).toMatchObject({ group: "wallet", required: false });
    expect(detailFields.get("rewardBoundary")).toMatchObject({ group: "risk", required: true });
    expect(listCampaigns.securityBoundary["en-US"]).toContain("No live marketplace API");
    expect(listCampaigns.securityBoundary["en-US"]).toContain("App Hub backend");
    expect(listCampaigns.securityBoundary["en-US"]).toContain("Forecast prediction");
    expect(getCampaignDetail.securityBoundary["zh-CN"]).toContain("不会执行实时 marketplace API");
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

  it("models the local add campaign task API contract separately from task generation", () => {
    const addTask = contractsById.add_campaign_task;
    const inputFields = new Map(addTask.inputFields.map((field) => [field.name, field]));
    const outputFields = new Map(addTask.outputFields.map((field) => [field.name, field]));

    expect(addTask).toMatchObject({
      apiGroup: "task_generation",
      readiness: "local_only",
      riskLevel: "medium",
    });
    expect([...inputFields.keys()]).toEqual(
      expect.arrayContaining([
        "campaignId",
        "templateCode",
        "walletCompatibility",
        "verificationType",
        "points",
        "required",
        "evidenceRule",
      ]),
    );
    expect([...outputFields.keys()]).toEqual(
      expect.arrayContaining([
        "id",
        "campaignId",
        "templateCode",
        "walletCompatibility",
        "verificationType",
        "points",
        "required",
        "evidenceRule",
      ]),
    );
    expect(inputFields.get("evidenceRule")).toMatchObject({ group: "evidence", required: true });
    expect(outputFields.get("evidenceRule")).toMatchObject({ group: "evidence", required: true });
    expect(addTask.securityBoundary["en-US"]).toContain("No live API");
    expect(addTask.securityBoundary["en-US"]).toContain("persistence");
    expect(addTask.securityBoundary["en-US"]).toContain("provider");
    expect(addTask.securityBoundary["en-US"]).toContain("contract write");
    expect(addTask.purpose["en-US"]).not.toContain("Generate");
  });

  it("models the local i18n draft API contract separately from campaign post generation", () => {
    const i18nDraft = contractsById.generate_i18n_draft;
    const inputFields = new Map(i18nDraft.inputFields.map((field) => [field.name, field]));
    const outputFields = new Map(i18nDraft.outputFields.map((field) => [field.name, field]));

    expect(i18nDraft).toMatchObject({
      apiGroup: "content_generation",
      readiness: "local_only",
      riskLevel: "medium",
    });
    expect([...inputFields.keys()]).toEqual(
      expect.arrayContaining(["campaignId", "sourceLocale", "targetLocale", "contentKeys"]),
    );
    expect([...outputFields.keys()]).toEqual(
      expect.arrayContaining([
        "sourceLocale",
        "targetLocale",
        "contentKeys",
        "draft",
        "fallbackToEnglish",
        "humanReviewRequired",
        "noAutoPublishNotice",
      ]),
    );
    expect(inputFields.get("sourceLocale")).toMatchObject({ group: "locale", required: true });
    expect(inputFields.get("targetLocale")).toMatchObject({ group: "locale", required: true });
    expect(inputFields.get("contentKeys")).toMatchObject({ group: "content", required: true });
    expect(outputFields.get("fallbackToEnglish")).toMatchObject({ group: "locale", required: true });
    expect(outputFields.get("humanReviewRequired")).toMatchObject({ group: "risk", required: true });
    expect(outputFields.get("noAutoPublishNotice")).toMatchObject({ group: "risk", required: true });
    expect(i18nDraft.securityBoundary["en-US"]).toContain("No live API");
    expect(i18nDraft.securityBoundary["en-US"]).toContain("AI provider");
    expect(i18nDraft.securityBoundary["en-US"]).toContain("persistence");
    expect(i18nDraft.securityBoundary["en-US"]).toContain("auto-publish");
    expect(i18nDraft.securityBoundary["en-US"]).toContain("publish mutation");
    expect(i18nDraft.securityBoundary["en-US"]).toContain("contract write");
    expect(i18nDraft.purpose["en-US"]).toContain("translation draft");
    expect(i18nDraft.purpose["en-US"]).not.toContain("channel copy");
  });

  it("models the internal Agent Skill wallet action readiness contract without live execution", () => {
    const agentWalletAction = contractsById.agent_wallet_action;
    const inputFields = new Map(agentWalletAction.inputFields.map((field) => [field.name, field]));
    const outputFields = new Map(agentWalletAction.outputFields.map((field) => [field.name, field]));

    expect(agentWalletAction).toMatchObject({
      apiGroup: "wallet_session",
      readiness: "review_required",
      riskLevel: "high",
    });
    expect(agentWalletAction.evidenceSources).toEqual(["LOCAL_SEEDED", "MANUAL", "WALLET_SESSION"]);
    expect(agentWalletAction.title["en-US"]).toContain("Agent Skill wallet action");
    expect(agentWalletAction.title["zh-CN"]).toContain("Agent Skill");
    expect(agentWalletAction.purpose["en-US"]).toContain("internal automation");
    expect(agentWalletAction.nextAction["en-US"]).toContain("human approval");
    expect(agentWalletAction.nextAction["zh-CN"]).toContain("人工审批");
    expect([...inputFields.keys()]).toEqual(
      expect.arrayContaining([
        "agentId",
        "operatorRole",
        "walletSource",
        "actionIntent",
        "chainId",
        "network",
        "campaignId",
        "taskId",
        "humanApprovalState",
        "evidencePurpose",
      ]),
    );
    expect([...outputFields.keys()]).toEqual(
      expect.arrayContaining([
        "actionState",
        "allowedOperation",
        "blockedReason",
        "auditTrail",
        "noPrivateKeyBoundary",
        "noSignatureExecution",
        "noTransactionExecution",
        "nextReviewAction",
      ]),
    );
    expect([...inputFields.values()].every((field) => field.required)).toBe(true);
    expect([...outputFields.values()].every((field) => field.required)).toBe(true);
    expect(inputFields.get("walletSource")).toMatchObject({ group: "wallet" });
    expect(inputFields.get("humanApprovalState")).toMatchObject({ group: "risk" });
    expect(outputFields.get("auditTrail")).toMatchObject({ group: "evidence" });

    const boundary = agentWalletAction.securityBoundary["en-US"];
    expect(boundary).toContain("No live API");
    expect(boundary).toContain("no agent skill execution");
    expect(boundary).toContain("no private key");
    expect(boundary).toContain("no signature execution");
    expect(boundary).toContain("no transaction send");
    expect(boundary).toContain("no contract send/write");
    expect(boundary).toContain("no reward distribution");
    expect(boundary).toContain("no export file");
    expect(boundary).toContain("no root write");
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
      example: "draft,ai_draft,human_review,scheduled,live,paused,ended,exported,archived",
      group: "campaign",
      required: true,
    });
    expect(createCampaignFields.get("status")?.description["en-US"]).toContain("ai_draft");
    expect(createCampaignFields.get("status")?.description["en-US"]).toContain("human_review");

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

  it("documents summarize_campaign wallet type and locale cross-split output", () => {
    const outputFields = new Map(
      contractsById.summarize_campaign.outputFields.map((field) => [field.name, field]),
    );

    expect([...outputFields.keys()]).toEqual(
      expect.arrayContaining([
        "report",
        "walletTypeMetrics",
        "localeMetrics",
        "walletLocaleMetrics",
        "referralWalletRiskMetrics",
        "riskSummary",
      ]),
    );
    expect(outputFields.get("walletLocaleMetrics")).toMatchObject({
      group: "wallet",
      required: true,
    });
    expect(outputFields.get("walletLocaleMetrics")?.description["en-US"]).toContain("wallet type and locale");
    expect(outputFields.get("walletLocaleMetrics")?.description["zh-CN"]).toContain("钱包类型与语言");
    expect(outputFields.get("referralWalletRiskMetrics")).toMatchObject({
      group: "risk",
      required: true,
    });
    expect(outputFields.get("referralWalletRiskMetrics")?.description["en-US"]).toContain("wallet type");
    expect(outputFields.get("referralWalletRiskMetrics")?.description["en-US"]).toContain("risk tier");
    expect(outputFields.get("referralWalletRiskMetrics")?.description["zh-CN"]).toContain("钱包类型");
    expect(outputFields.get("referralWalletRiskMetrics")?.description["zh-CN"]).toContain("风险分层");
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
      externalEvidenceCount: 5,
      highRiskCount: 3,
      localOnlyCount: 7,
      readyCount: 3,
      reviewRequiredCount: 4,
    });
    expect(surface.boundary["en-US"]).toContain("does not call live APIs");
    expect(surface.boundary["zh-CN"]).toContain("不会调用实时 API");
  });
});
