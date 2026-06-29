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
  it("covers the complete v0.1 first skill batch", () => {
    expect(apiSkillContractRegistry.map((contract) => contract.id)).toEqual(requiredApiSkillIds);
    expect(createApiSkillContractSurface().summary).toMatchObject({
      missingSkillIds: [],
      totalContracts: 8,
    });
  });

  it("keeps every contract structured, localized, and bounded", () => {
    for (const contract of apiSkillContractRegistry) {
      expect(contract.title["en-US"]).toBeTruthy();
      expect(contract.title["zh-CN"]).toBeTruthy();
      expect(contract.purpose["en-US"]).toBeTruthy();
      expect(contract.inputFields.length).toBeGreaterThan(0);
      expect(contract.outputFields.length).toBeGreaterThan(0);
      expect(contract.securityBoundary["en-US"]).toMatch(/No live|Verification contract|Export contract|Seeded\/local/);
      expect(contract.nextAction["zh-CN"]).toBeTruthy();
    }
  });

  it("covers v0.2 wallet, locale, contract, export, and evidence field groups", () => {
    const coverage = getApiSkillContractCoverage();

    expect(coverage.requiredFieldGroups).toEqual(requiredApiSkillFieldGroups);
    expect(coverage.missingFieldGroups).toEqual([]);
    expect(coverage.coveredFieldGroups).toEqual(
      expect.arrayContaining(["wallet", "locale", "contract", "export", "evidence"]),
    );
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
      localOnlyCount: 2,
      readyCount: 3,
      reviewRequiredCount: 3,
    });
    expect(surface.boundary["en-US"]).toContain("does not call live APIs");
    expect(surface.boundary["zh-CN"]).toContain("不会调用实时 API");
  });
});
