import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { taskTemplateLibrary } from "../domain/builder";
import {
  TaskTemplateCatalogValidationError,
  createTaskTemplateCatalogVersion,
  type TaskTemplateCatalogVersion,
  type TaskTemplateCatalogVersionSource,
} from "../domain/taskTemplateCatalog";
import {
  taskTemplateCatalogManifestV1,
  validateTaskTemplateCatalogManifest,
} from "./taskTemplateCatalogManifest";

const sourceFromVersion = (
  version: TaskTemplateCatalogVersion,
): TaskTemplateCatalogVersionSource => {
  const { checksum: _checksum, ...source } = structuredClone(version);
  return source as TaskTemplateCatalogVersionSource;
};

describe("task template catalog manifest", () => {
  it("contains the exact unique v1 curated identities", () => {
    expect(taskTemplateCatalogManifestV1).toHaveLength(12);
    expect(taskTemplateCatalogManifestV1.map(({ templateCode, version }) => `${templateCode}@${version}`))
      .toEqual([
        "wallet-connect@1",
        "bridge-ebridge@1",
        "swap-awaken@1",
        "liquidity-awaken@1",
        "nft-hold@1",
        "schrodinger-hold@1",
        "dao-vote@1",
        "daipp-submit@1",
        "pay-complete@1",
        "forecast-participate@1",
        "social-share@1",
        "invite-friend@1",
      ]);
    expect(new Set(taskTemplateCatalogManifestV1.map((template) => template.checksum)).size).toBe(12);
    expect(taskTemplateCatalogManifestV1.every((template) => template.status === "active")).toBe(true);
  });

  it("locks every curated v1 checksum as a literal regression contract", () => {
    expect(Object.fromEntries(
      taskTemplateCatalogManifestV1.map((template) => [template.templateCode, template.checksum]),
    )).toMatchInlineSnapshot(`
      {
        "bridge-ebridge": "c853e3150e98dccab6f12db1082044187c07b8105da579b2f47228753d376366",
        "daipp-submit": "148400ba54941a018e712991157cefa91623be9d6e96c25783eb1d8dce443cea",
        "dao-vote": "6480c2e967624f4e79daa0658aed5a1b92d327489c6873b7ef65909201c16e16",
        "forecast-participate": "ee9e9b502937579115be2eff76e020ae46ffe1d001b378c2cdddaef9843cbd89",
        "invite-friend": "01a37be6ef94068fc0ca8c81e988e68c223821f996a98cd770e8a2879c2f3731",
        "liquidity-awaken": "631a473a66b438cb9f57bcbfb44dfa97b2fcf03a9009afb3d136b17cd6762447",
        "nft-hold": "a449e6359a9eced771eb833707859ec26a94828fedf0d4144d21ac2aaae6bf23",
        "pay-complete": "06230264ca2c06cb076412adc42bc6cf69eb34f5d2ca640a16321aeeab6b9b24",
        "schrodinger-hold": "4a440889f5107090b428e457d485e038717cffe9ccd013ecc467e4baa91ce787",
        "social-share": "031c9374a5a2e0226a174522bc74db101e2cbf41292ffc16aa73ef3631b3def7",
        "swap-awaken": "d6b8f167617b8ba400b98b9069ae4792131408cde8070f640324890e38aa0df9",
        "wallet-connect": "0114d4dafde62cda6c222e6499efe55b484f8451f845babb66ccf1f3babd783a",
      }
    `);
  });

  it("reconciles presentation identity and policy with the demo fixture", () => {
    const demoByCode = new Map(
      taskTemplateLibrary.map((template) => [template.id.replace(/^tpl-/, ""), template]),
    );

    for (const template of taskTemplateCatalogManifestV1) {
      const demo = demoByCode.get(template.templateCode);
      expect(demo, template.templateCode).toBeDefined();
      expect(template.category).toBe(demo?.category);
      expect(template.verificationType).toBe(demo?.verificationType === "REFERRAL" ? "MANUAL" : demo?.verificationType);
      expect(template.walletCompatibility).toBe(demo?.walletCompatibility);
      expect(template.points.default).toBe(demo?.defaultPoints);
      expect(template.requiredPolicy.default).toBe(demo?.requiredByDefault);
      expect(template.riskLevel).toBe(demo?.riskLevel);
      expect(template.localizedContent["en-US"].title).toBe(demo?.title["en-US"]);
      expect(template.localizedContent["en-US"].description).toBe(demo?.description["en-US"]);
      expect(template.localeReadiness).toEqual(demo?.localeReadiness);
    }
  });

  it("keeps referral deferred and social adoption under manual review", () => {
    const byCode = new Map(taskTemplateCatalogManifestV1.map((template) => [template.templateCode, template]));

    expect(byCode.get("invite-friend")).toMatchObject({
      adoptionMode: "deferred",
      verificationType: "MANUAL",
    });
    expect(byCode.get("invite-friend")?.evidenceRule).toMatchObject({
      reasonCode: "REFERRAL_RUNTIME_NOT_AVAILABLE",
    });
    expect(byCode.get("social-share")?.adoptionMode).toBe("manual_review");
    expect(taskTemplateCatalogManifestV1
      .filter((template) => template.adoptionMode === "direct")
      .every((template) => template.verificationType !== "SOCIAL" && template.verificationType !== "MANUAL"))
      .toBe(true);
  });

  it("rejects duplicate identity", () => {
    const first = taskTemplateCatalogManifestV1[0];

    expect(() => validateTaskTemplateCatalogManifest([...taskTemplateCatalogManifestV1, first]))
      .toThrow(TaskTemplateCatalogValidationError);
  });

  it("rejects more than one active version per code", () => {
    const first = taskTemplateCatalogManifestV1[0];
    const secondActiveVersion = createTaskTemplateCatalogVersion({
      ...sourceFromVersion(first),
      version: 2,
    });

    expect(() => validateTaskTemplateCatalogManifest([
      ...taskTemplateCatalogManifestV1,
      secondActiveVersion,
    ])).toThrowError(expect.objectContaining({
      code: "TASK_TEMPLATE_MANIFEST_INVALID",
      field: "templates[12].status",
    }));
  });

  it("rejects checksum drift before accepting a manifest row", () => {
    const first = taskTemplateCatalogManifestV1[0];

    expect(() => validateTaskTemplateCatalogManifest([
      { ...first, points: { ...first.points, default: first.points.default + 1 } },
      ...taskTemplateCatalogManifestV1.slice(1),
    ])).toThrowError(expect.objectContaining({
      code: "TASK_TEMPLATE_CHECKSUM_MISMATCH",
      field: "checksum",
    }));
  });

  it("rejects unsupported direct social or manual adoption", () => {
    const socialIndex = taskTemplateCatalogManifestV1.findIndex(
      (template) => template.templateCode === "social-share",
    );
    const directSocial = createTaskTemplateCatalogVersion({
      ...sourceFromVersion(taskTemplateCatalogManifestV1[socialIndex]),
      adoptionMode: "direct",
    });
    const candidate = [...taskTemplateCatalogManifestV1];
    candidate[socialIndex] = directSocial;

    expect(() => validateTaskTemplateCatalogManifest(candidate)).toThrowError(
      expect.objectContaining({
        code: "TASK_TEMPLATE_MANIFEST_INVALID",
        field: `templates[${socialIndex}].adoptionMode`,
      }),
    );
  });

  it("does not import the browser fixture into the server manifest", async () => {
    const source = await readFile(
      resolve(process.cwd(), "src/server/taskTemplateCatalogManifest.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/from\s+["']\.\.\/domain\/builder["']/);
    expect(source).not.toContain("taskTemplateLibrary");
  });
});
