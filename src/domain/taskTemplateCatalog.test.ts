import { describe, expect, it } from "vitest";
import {
  TASK_TEMPLATE_CATALOG_SCHEMA_VERSION,
  TaskTemplateCatalogValidationError,
  canTransitionTaskTemplateStatus,
  createTaskTemplateCatalogVersion,
  createTaskTemplateChecksum,
  isTaskTemplateDirectlyAdoptable,
  parseTaskTemplateCatalogVersion,
  serializeTaskTemplateChecksumInput,
  type TaskTemplateCatalogVersionSource,
} from "./taskTemplateCatalog";

const validSource = (): TaskTemplateCatalogVersionSource => ({
  adoptionMode: "direct",
  catalogSchemaVersion: TASK_TEMPLATE_CATALOG_SCHEMA_VERSION,
  category: "wallet",
  evidenceRule: {
    kind: "wallet_session",
    source: "WALLET_SESSION",
  },
  localeReadiness: {
    "en-US": "ready",
    "zh-CN": "reviewed",
  },
  localizedContent: {
    "en-US": {
      description: "Connect a supported wallet.",
      title: "Connect wallet",
    },
    "zh-CN": {
      description: "Connect a supported wallet in Chinese.",
      title: "Connect wallet Chinese",
    },
  },
  points: {
    default: 40,
    maximum: 80,
    minimum: 20,
  },
  requiredPolicy: {
    default: true,
    overrideAllowed: false,
  },
  riskLevel: "low",
  status: "active",
  supportedLocales: ["zh-CN", "en-US"],
  templateCode: "wallet-connect",
  verificationType: "WALLET",
  version: 1,
  walletCompatibility: "ANY",
});

const expectValidationError = (
  operation: () => unknown,
  code: string,
  field: string,
  limit?: number,
) => {
  try {
    operation();
    throw new Error("Expected task template validation to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(TaskTemplateCatalogValidationError);
    expect(error).toMatchObject({ code, field, ...(limit === undefined ? {} : { limit }) });
    expect((error as Error).message).toBe("Task template catalog value is invalid.");
  }
};

describe("task template catalog domain", () => {
  it("normalizes, copies, and deeply freezes a valid version", () => {
    const source = validSource();
    const version = createTaskTemplateCatalogVersion(source);

    expect(version.catalogSchemaVersion).toBe("task-template-catalog-v1");
    expect(version.supportedLocales).toEqual(["en-US", "zh-CN"]);
    expect(version.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.isFrozen(version)).toBe(true);
    expect(Object.isFrozen(version.points)).toBe(true);
    expect(Object.isFrozen(version.localeReadiness)).toBe(true);
    expect(Object.isFrozen(version.localizedContent)).toBe(true);
    expect(Object.isFrozen(version.localizedContent["en-US"])).toBe(true);
    expect(Object.isFrozen(version.evidenceRule)).toBe(true);

    source.points.default = 60;
    source.localizedContent["en-US"].title = "Mutated";
    source.supportedLocales.push("zh-TW");

    expect(version.points.default).toBe(40);
    expect(version.localizedContent["en-US"].title).toBe("Connect wallet");
    expect(version.supportedLocales).toEqual(["en-US", "zh-CN"]);
  });

  it.each([
    ["", "TASK_TEMPLATE_CODE_INVALID", "templateCode"],
    ["Wallet-Connect", "TASK_TEMPLATE_CODE_INVALID", "templateCode"],
    ["wallet_connect", "TASK_TEMPLATE_CODE_INVALID", "templateCode"],
    ["w".repeat(97), "TASK_TEMPLATE_CODE_INVALID", "templateCode"],
  ])("rejects invalid template code %j", (templateCode, code, field) => {
    expectValidationError(
      () => createTaskTemplateCatalogVersion({ ...validSource(), templateCode }),
      code,
      field,
      96,
    );
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid version %s without coercion",
    (version) => {
      expectValidationError(
        () => createTaskTemplateCatalogVersion({ ...validSource(), version }),
        "TASK_TEMPLATE_VERSION_INVALID",
        "version",
        2_147_483_647,
      );
    },
  );

  it("rejects unknown fields and prototype-bearing records", () => {
    expectValidationError(
      () => createTaskTemplateCatalogVersion({ ...validSource(), unexpected: true } as never),
      "TASK_TEMPLATE_UNKNOWN_FIELD",
      "unexpected",
    );

    const inherited = Object.create({ templateCode: "inherited" }) as TaskTemplateCatalogVersionSource;
    Object.assign(inherited, validSource());

    expectValidationError(
      () => createTaskTemplateCatalogVersion(inherited),
      "TASK_TEMPLATE_SHAPE_INVALID",
      "$",
    );
  });

  it.each([
    [{ default: 10, minimum: 20, maximum: 30 }, "points.default"],
    [{ default: 40, minimum: 20, maximum: 30 }, "points.default"],
    [{ default: -1, minimum: 0, maximum: 10 }, "points.default"],
    [{ default: 1.5, minimum: 0, maximum: 10 }, "points.default"],
    [{ default: 10, minimum: -1, maximum: 20 }, "points.minimum"],
    [{ default: 10, minimum: 0, maximum: 1_000_001 }, "points.maximum"],
  ])("rejects an invalid points policy", (points, field) => {
    expectValidationError(
      () => createTaskTemplateCatalogVersion({ ...validSource(), points }),
      "TASK_TEMPLATE_POINTS_INVALID",
      field,
      1_000_000,
    );
  });

  it("requires exact locale coverage and unique supported locales", () => {
    expectValidationError(
      () => createTaskTemplateCatalogVersion({
        ...validSource(),
        supportedLocales: ["en-US", "en-US"],
      }),
      "TASK_TEMPLATE_LOCALE_INVALID",
      "supportedLocales",
      16,
    );

    const missingContent = validSource();
    delete missingContent.localizedContent["zh-CN"];

    expectValidationError(
      () => createTaskTemplateCatalogVersion(missingContent),
      "TASK_TEMPLATE_LOCALE_INVALID",
      "localizedContent.zh-CN",
    );

    const missingReadiness = validSource();
    delete missingReadiness.localeReadiness["zh-CN"];

    expectValidationError(
      () => createTaskTemplateCatalogVersion(missingReadiness),
      "TASK_TEMPLATE_LOCALE_INVALID",
      "localeReadiness.zh-CN",
    );

    expectValidationError(
      () => createTaskTemplateCatalogVersion({
        ...validSource(),
        localeReadiness: {
          ...validSource().localeReadiness,
          "zh-TW": "ready",
        },
      }),
      "TASK_TEMPLATE_LOCALE_INVALID",
      "localeReadiness.zh-TW",
    );
  });

  it("requires an exact, boolean required policy", () => {
    expectValidationError(
      () => createTaskTemplateCatalogVersion({
        ...validSource(),
        requiredPolicy: { default: "true", overrideAllowed: false } as never,
      }),
      "TASK_TEMPLATE_REQUIRED_POLICY_INVALID",
      "requiredPolicy.default",
    );
    expectValidationError(
      () => createTaskTemplateCatalogVersion({
        ...validSource(),
        requiredPolicy: { default: true, overrideAllowed: "false" } as never,
      }),
      "TASK_TEMPLATE_REQUIRED_POLICY_INVALID",
      "requiredPolicy.overrideAllowed",
    );
    expectValidationError(
      () => createTaskTemplateCatalogVersion({
        ...validSource(),
        requiredPolicy: { default: true, overrideAllowed: false, unexpected: true } as never,
      }),
      "TASK_TEMPLATE_UNKNOWN_FIELD",
      "requiredPolicy.unexpected",
    );
  });

  it("enforces localized text and aggregate evidence bounds", () => {
    const oversizedTitle = validSource();
    oversizedTitle.localizedContent["en-US"].title = "x".repeat(161);

    expectValidationError(
      () => createTaskTemplateCatalogVersion(oversizedTitle),
      "TASK_TEMPLATE_TEXT_INVALID",
      "localizedContent.en-US.title",
      160,
    );

    const oversizedEvidence = Object.fromEntries(
      Array.from({ length: 5 }, (_, index) => [`field-${index}`, "x".repeat(4_096)]),
    );
    expectValidationError(
      () => createTaskTemplateCatalogVersion({
        ...validSource(),
        evidenceRule: oversizedEvidence,
      }),
      "TASK_TEMPLATE_CANONICAL_VALUE_INVALID",
      "evidenceRule",
      16_384,
    );
  });

  it("rejects cyclic, executable, non-integer, and unpaired-surrogate evidence material", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    expectValidationError(
      () => createTaskTemplateCatalogVersion({ ...validSource(), evidenceRule: cyclic }),
      "TASK_TEMPLATE_CANONICAL_VALUE_INVALID",
      "evidenceRule.self",
    );
    expectValidationError(
      () => createTaskTemplateCatalogVersion({
        ...validSource(),
        evidenceRule: { execute: () => true },
      }),
      "TASK_TEMPLATE_CANONICAL_VALUE_INVALID",
      "evidenceRule.execute",
    );
    for (const value of [undefined, Symbol("unsafe"), Number.NaN, 1.5]) {
      expectValidationError(
        () => createTaskTemplateCatalogVersion({
          ...validSource(),
          evidenceRule: { value },
        }),
        "TASK_TEMPLATE_CANONICAL_VALUE_INVALID",
        "evidenceRule.value",
      );
    }
    expectValidationError(
      () => createTaskTemplateCatalogVersion({
        ...validSource(),
        evidenceRule: { value: "invalid-\ud800" },
      }),
      "TASK_TEMPLATE_TEXT_INVALID",
      "evidenceRule.value",
    );
  });

  it("rejects unbounded canonical depth, arrays, and objects", () => {
    const deeplyNested: Record<string, unknown> = {};
    let cursor = deeplyNested;
    for (let depth = 0; depth < 9; depth += 1) {
      const child: Record<string, unknown> = {};
      cursor.child = child;
      cursor = child;
    }

    expectValidationError(
      () => createTaskTemplateCatalogVersion({
        ...validSource(),
        evidenceRule: deeplyNested,
      }),
      "TASK_TEMPLATE_CANONICAL_VALUE_INVALID",
      `evidenceRule${".child".repeat(9)}`,
      8,
    );
    expectValidationError(
      () => createTaskTemplateCatalogVersion({
        ...validSource(),
        evidenceRule: { values: Array.from({ length: 65 }, () => 1) },
      }),
      "TASK_TEMPLATE_CANONICAL_VALUE_INVALID",
      "evidenceRule.values",
      64,
    );
    expectValidationError(
      () => createTaskTemplateCatalogVersion({
        ...validSource(),
        evidenceRule: Object.fromEntries(
          Array.from({ length: 33 }, (_, index) => [`field-${index}`, index]),
        ),
      }),
      "TASK_TEMPLATE_CANONICAL_VALUE_INVALID",
      "evidenceRule",
      32,
    );
  });

  it("rejects sparse, accessor, prototype-bearing, and augmented arrays", () => {
    const sparse = new Array(2);
    const accessor = [1];
    Object.defineProperty(accessor, "0", {
      enumerable: true,
      get: () => 1,
    });
    const prototypeBearing = [1];
    Object.setPrototypeOf(prototypeBearing, {});
    const augmented = Object.assign([1], { ignored: "unsafe" });

    for (const values of [sparse, accessor, prototypeBearing, augmented]) {
      expectValidationError(
        () => createTaskTemplateCatalogVersion({
          ...validSource(),
          evidenceRule: { values },
        }),
        "TASK_TEMPLATE_CANONICAL_VALUE_INVALID",
        "evidenceRule.values",
      );
    }
  });

  it("preserves dangerous-looking evidence keys as inert canonical data", () => {
    const source = validSource();
    source.evidenceRule = JSON.parse(
      '{"__proto__":{"polluted":true},"constructor":"literal"}',
    ) as Record<string, unknown>;

    const version = createTaskTemplateCatalogVersion(source);

    expect(Object.getPrototypeOf(version.evidenceRule)).toBeNull();
    expect(version.evidenceRule["__proto__"]).toEqual({ polluted: true });
    expect(version.evidenceRule.constructor).toBe("literal");
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
    expect(serializeTaskTemplateChecksumInput(source)).toContain('"__proto__"');
  });

  it("canonicalizes 20 object and locale order permutations before hashing", () => {
    const source = validSource();
    source.evidenceRule = {
      alpha: 1,
      bravo: { left: true, right: false },
      charlie: "value",
      delta: [1, 2, 3],
    };
    const expectedSerialization = serializeTaskTemplateChecksumInput(source);
    const expectedChecksum = createTaskTemplateChecksum(source);
    const evidenceEntries = Object.entries(source.evidenceRule);
    const localeEntries = Object.entries(source.localizedContent);
    const readinessEntries = Object.entries(source.localeReadiness);

    for (let iteration = 0; iteration < 20; iteration += 1) {
      const offset = iteration % evidenceEntries.length;
      const reordered = validSource();
      reordered.evidenceRule = Object.fromEntries([
        ...evidenceEntries.slice(offset),
        ...evidenceEntries.slice(0, offset),
      ].reverse());
      reordered.supportedLocales = iteration % 2 === 0 ? ["en-US", "zh-CN"] : ["zh-CN", "en-US"];
      reordered.localizedContent = Object.fromEntries(
        iteration % 2 === 0 ? localeEntries : [...localeEntries].reverse(),
      );
      reordered.localeReadiness = Object.fromEntries(
        iteration % 2 === 0 ? readinessEntries : [...readinessEntries].reverse(),
      );

      expect(serializeTaskTemplateChecksumInput(reordered)).toBe(expectedSerialization);
      expect(createTaskTemplateChecksum(reordered)).toBe(expectedChecksum);
    }
  });

  it("changes checksum when any canonical policy changes but not lifecycle status", () => {
    const source = validSource();
    const checksum = createTaskTemplateChecksum(source);

    expect(createTaskTemplateChecksum({ ...source, status: "deprecated" })).toBe(checksum);
    expect(createTaskTemplateChecksum({
      ...source,
      points: { ...source.points, default: 41 },
    })).not.toBe(checksum);
    expect(createTaskTemplateChecksum({
      ...source,
      requiredPolicy: { ...source.requiredPolicy, overrideAllowed: true },
    })).not.toBe(checksum);
  });

  it("parses only exact versions with a valid checksum", () => {
    const version = createTaskTemplateCatalogVersion(validSource());

    expect(parseTaskTemplateCatalogVersion(structuredClone(version))).toEqual(version);
    expectValidationError(
      () => parseTaskTemplateCatalogVersion({ ...version, checksum: "0".repeat(64) }),
      "TASK_TEMPLATE_CHECKSUM_MISMATCH",
      "checksum",
    );
    expectValidationError(
      () => parseTaskTemplateCatalogVersion({ ...version, checksum: "not-a-checksum" }),
      "TASK_TEMPLATE_CHECKSUM_INVALID",
      "checksum",
      64,
    );
  });

  it("allows only forward lifecycle transitions", () => {
    expect(canTransitionTaskTemplateStatus("active", "deprecated")).toBe(true);
    expect(canTransitionTaskTemplateStatus("deprecated", "retired")).toBe(true);
    expect(canTransitionTaskTemplateStatus("active", "retired")).toBe(true);
    expect(canTransitionTaskTemplateStatus("active", "active")).toBe(false);
    expect(canTransitionTaskTemplateStatus("deprecated", "active")).toBe(false);
    expect(canTransitionTaskTemplateStatus("retired", "deprecated")).toBe(false);
  });

  it("allows direct adoption only for active direct versions", () => {
    const template = createTaskTemplateCatalogVersion(validSource());

    expect(isTaskTemplateDirectlyAdoptable(template)).toBe(true);
    expect(isTaskTemplateDirectlyAdoptable({ ...template, status: "deprecated" })).toBe(false);
    expect(isTaskTemplateDirectlyAdoptable({ ...template, status: "retired" })).toBe(false);
    expect(isTaskTemplateDirectlyAdoptable({
      ...template,
      adoptionMode: "manual_review",
    })).toBe(false);
    expect(isTaskTemplateDirectlyAdoptable({
      ...template,
      adoptionMode: "deferred",
    })).toBe(false);
  });

  it("does not echo rejected values in safe errors", () => {
    const rejected = "do-not-echo-this-value";

    try {
      createTaskTemplateCatalogVersion({ ...validSource(), templateCode: rejected });
      throw new Error("Expected validation failure.");
    } catch (error) {
      expect(JSON.stringify(error)).not.toContain(rejected);
      expect(String(error)).not.toContain(rejected);
    }
  });
});
