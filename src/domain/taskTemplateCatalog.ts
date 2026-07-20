import { createHash } from "node:crypto";
import type {
  LocaleStatus,
  RiskLevel,
  VerificationType,
  WalletCompatibility,
} from "./types";

export const TASK_TEMPLATE_CATALOG_SCHEMA_VERSION = "task-template-catalog-v1" as const;
export const TASK_TEMPLATE_CODE_MAX_LENGTH = 96;
export const TASK_TEMPLATE_VERSION_MAX = 2_147_483_647;
export const TASK_TEMPLATE_POINTS_MAX = 1_000_000;
export const TASK_TEMPLATE_SUPPORTED_LOCALES_MAX = 16;
export const TASK_TEMPLATE_LOCALIZED_CONTENT_MAX_BYTES = 65_536;
export const TASK_TEMPLATE_EVIDENCE_RULE_MAX_BYTES = 16_384;

const TASK_TEMPLATE_CANONICAL_DEPTH_MAX = 8;
const TASK_TEMPLATE_CANONICAL_ARRAY_MAX_ITEMS = 64;
const TASK_TEMPLATE_CANONICAL_OBJECT_MAX_FIELDS = 32;
const TASK_TEMPLATE_CANONICAL_KEY_MAX_BYTES = 96;
const TASK_TEMPLATE_CANONICAL_STRING_MAX_BYTES = 4_096;
const TASK_TEMPLATE_TITLE_MAX_BYTES = 160;
const TASK_TEMPLATE_DESCRIPTION_MAX_BYTES = 1_000;

export type TaskTemplateCatalogStatus = "active" | "deprecated" | "retired";
export type TaskTemplateAdoptionMode = "direct" | "manual_review" | "deferred";
export type TaskTemplateLocaleReadiness = Exclude<LocaleStatus, "published">;

export interface TaskTemplateCanonicalObject {
  readonly [key: string]: TaskTemplateCanonicalValue;
}

export type TaskTemplateCanonicalValue =
  | null
  | boolean
  | number
  | string
  | readonly TaskTemplateCanonicalValue[]
  | TaskTemplateCanonicalObject;

export interface TaskTemplateLocalizedContentSource {
  description: string;
  title: string;
}

export interface TaskTemplatePointsPolicySource {
  default: number;
  maximum: number;
  minimum: number;
}

export interface TaskTemplateRequiredPolicySource {
  default: boolean;
  overrideAllowed: boolean;
}

export interface TaskTemplateCatalogVersionSource {
  adoptionMode: TaskTemplateAdoptionMode;
  catalogSchemaVersion: typeof TASK_TEMPLATE_CATALOG_SCHEMA_VERSION;
  category: string;
  evidenceRule: Record<string, unknown>;
  localeReadiness: Record<string, TaskTemplateLocaleReadiness>;
  localizedContent: Record<string, TaskTemplateLocalizedContentSource>;
  points: TaskTemplatePointsPolicySource;
  requiredPolicy: TaskTemplateRequiredPolicySource;
  riskLevel: RiskLevel;
  status: TaskTemplateCatalogStatus;
  supportedLocales: string[];
  templateCode: string;
  verificationType: VerificationType;
  version: number;
  walletCompatibility: WalletCompatibility;
}

export interface TaskTemplateLocalizedContent {
  readonly description: string;
  readonly title: string;
}

export interface TaskTemplatePointsPolicy {
  readonly default: number;
  readonly maximum: number;
  readonly minimum: number;
}

export interface TaskTemplateRequiredPolicy {
  readonly default: boolean;
  readonly overrideAllowed: boolean;
}

export interface TaskTemplateCatalogVersion {
  readonly adoptionMode: TaskTemplateAdoptionMode;
  readonly catalogSchemaVersion: typeof TASK_TEMPLATE_CATALOG_SCHEMA_VERSION;
  readonly category: string;
  readonly checksum: string;
  readonly evidenceRule: TaskTemplateCanonicalObject;
  readonly localeReadiness: Readonly<Record<string, TaskTemplateLocaleReadiness>>;
  readonly localizedContent: Readonly<Record<string, TaskTemplateLocalizedContent>>;
  readonly points: TaskTemplatePointsPolicy;
  readonly requiredPolicy: TaskTemplateRequiredPolicy;
  readonly riskLevel: RiskLevel;
  readonly status: TaskTemplateCatalogStatus;
  readonly supportedLocales: readonly string[];
  readonly templateCode: string;
  readonly verificationType: VerificationType;
  readonly version: number;
  readonly walletCompatibility: WalletCompatibility;
}

export type TaskTemplateCatalogValidationErrorCode =
  | "TASK_TEMPLATE_ADOPTION_MODE_INVALID"
  | "TASK_TEMPLATE_CANONICAL_VALUE_INVALID"
  | "TASK_TEMPLATE_CATEGORY_INVALID"
  | "TASK_TEMPLATE_CHECKSUM_INVALID"
  | "TASK_TEMPLATE_CHECKSUM_MISMATCH"
  | "TASK_TEMPLATE_CODE_INVALID"
  | "TASK_TEMPLATE_LOCALE_INVALID"
  | "TASK_TEMPLATE_MANIFEST_INVALID"
  | "TASK_TEMPLATE_POINTS_INVALID"
  | "TASK_TEMPLATE_REQUIRED_POLICY_INVALID"
  | "TASK_TEMPLATE_RISK_INVALID"
  | "TASK_TEMPLATE_SCHEMA_INVALID"
  | "TASK_TEMPLATE_SHAPE_INVALID"
  | "TASK_TEMPLATE_STATUS_INVALID"
  | "TASK_TEMPLATE_TEXT_INVALID"
  | "TASK_TEMPLATE_UNKNOWN_FIELD"
  | "TASK_TEMPLATE_VERIFICATION_INVALID"
  | "TASK_TEMPLATE_VERSION_INVALID"
  | "TASK_TEMPLATE_WALLET_INVALID";

export class TaskTemplateCatalogValidationError extends Error {
  readonly code: TaskTemplateCatalogValidationErrorCode;
  readonly field: string;
  readonly limit?: number;

  constructor(
    code: TaskTemplateCatalogValidationErrorCode,
    field: string,
    limit?: number,
  ) {
    super("Task template catalog value is invalid.");
    this.name = "TaskTemplateCatalogValidationError";
    this.code = code;
    this.field = field;
    this.limit = limit;
  }
}

const fail = (
  code: TaskTemplateCatalogValidationErrorCode,
  field: string,
  limit?: number,
): never => {
  throw new TaskTemplateCatalogValidationError(code, field, limit);
};

const utf8ByteLength = (value: string): number =>
  new TextEncoder().encode(value).byteLength;

const hasUnpairedSurrogate = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (code >= 0xd800 && code <= 0xdbff) {
      if (index + 1 >= value.length) {
        return true;
      }
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) {
        return true;
      }
      index += 1;
      continue;
    }

    if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }

  return false;
};

const assertText = (
  value: unknown,
  field: string,
  maximumBytes: number,
  minimumBytes = 1,
): string => {
  if (typeof value !== "string" || hasUnpairedSurrogate(value)) {
    return fail("TASK_TEMPLATE_TEXT_INVALID", field, maximumBytes);
  }

  const bytes = utf8ByteLength(value);
  if (bytes < minimumBytes || bytes > maximumBytes) {
    return fail("TASK_TEMPLATE_TEXT_INVALID", field, maximumBytes);
  }

  return value;
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const assertPlainRecord = (value: unknown, field: string): Record<string, unknown> => {
  if (!isPlainRecord(value)) {
    return fail("TASK_TEMPLATE_SHAPE_INVALID", field);
  }

  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      return fail("TASK_TEMPLATE_SHAPE_INVALID", field);
    }

    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      return fail("TASK_TEMPLATE_SHAPE_INVALID", field);
    }
  }

  return value;
};

const assertExactFields = (
  record: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  field: string,
): void => {
  const unknown = Object.keys(record).find((key) => !allowed.has(key));
  if (unknown) {
    return fail("TASK_TEMPLATE_UNKNOWN_FIELD", field);
  }
};

const ownValue = (
  record: Record<string, unknown>,
  field: string,
  parent = "$",
): unknown => {
  const descriptor = Object.getOwnPropertyDescriptor(record, field);
  if (!descriptor?.enumerable || !("value" in descriptor)) {
    return fail("TASK_TEMPLATE_SHAPE_INVALID", parent === "$" ? field : `${parent}.${field}`);
  }
  return descriptor.value;
};

const compareStrings = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const canonicalValue = (
  value: unknown,
  field: string,
  stack: WeakSet<object>,
  depth: number,
): TaskTemplateCanonicalValue => {
  if (depth > TASK_TEMPLATE_CANONICAL_DEPTH_MAX) {
    return fail("TASK_TEMPLATE_CANONICAL_VALUE_INVALID", field, TASK_TEMPLATE_CANONICAL_DEPTH_MAX);
  }

  if (value === null || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return assertText(value, field, TASK_TEMPLATE_CANONICAL_STRING_MAX_BYTES, 0);
  }

  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      return fail("TASK_TEMPLATE_CANONICAL_VALUE_INVALID", field);
    }
    return value;
  }

  if (typeof value !== "object") {
    return fail("TASK_TEMPLATE_CANONICAL_VALUE_INVALID", field);
  }

  if (stack.has(value)) {
    return fail("TASK_TEMPLATE_CANONICAL_VALUE_INVALID", field);
  }
  stack.add(value);

  try {
    if (Array.isArray(value)) {
      if (value.length > TASK_TEMPLATE_CANONICAL_ARRAY_MAX_ITEMS) {
        return fail(
          "TASK_TEMPLATE_CANONICAL_VALUE_INVALID",
          field,
          TASK_TEMPLATE_CANONICAL_ARRAY_MAX_ITEMS,
        );
      }

      if (
        Object.getPrototypeOf(value) !== Array.prototype
        || Reflect.ownKeys(value).length !== value.length + 1
      ) {
        return fail("TASK_TEMPLATE_CANONICAL_VALUE_INVALID", field);
      }

      const normalized: TaskTemplateCanonicalValue[] = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor?.enumerable || !("value" in descriptor)) {
          return fail("TASK_TEMPLATE_CANONICAL_VALUE_INVALID", field);
        }
        normalized.push(canonicalValue(
          descriptor.value,
          `${field}[${index}]`,
          stack,
          depth + 1,
        ));
      }

      return Object.freeze(normalized);
    }

    const record = assertPlainRecord(value, field);
    const keys = Object.keys(record).sort(compareStrings);
    if (keys.length > TASK_TEMPLATE_CANONICAL_OBJECT_MAX_FIELDS) {
      return fail(
        "TASK_TEMPLATE_CANONICAL_VALUE_INVALID",
        field,
        TASK_TEMPLATE_CANONICAL_OBJECT_MAX_FIELDS,
      );
    }

    const normalized: Record<string, TaskTemplateCanonicalValue> = Object.create(null);
    for (const [index, key] of keys.entries()) {
      const childField = `${field}[${index}]`;
      assertText(key, childField, TASK_TEMPLATE_CANONICAL_KEY_MAX_BYTES);
      const descriptor = Object.getOwnPropertyDescriptor(record, key);
      if (!descriptor?.enumerable || !("value" in descriptor)) {
        return fail("TASK_TEMPLATE_SHAPE_INVALID", childField);
      }
      normalized[key] = canonicalValue(
        descriptor.value,
        childField,
        stack,
        depth + 1,
      );
    }

    return Object.freeze(normalized);
  } finally {
    stack.delete(value);
  }
};

const catalogFields = new Set([
  "adoptionMode",
  "catalogSchemaVersion",
  "category",
  "evidenceRule",
  "localeReadiness",
  "localizedContent",
  "points",
  "requiredPolicy",
  "riskLevel",
  "status",
  "supportedLocales",
  "templateCode",
  "verificationType",
  "version",
  "walletCompatibility",
]);

const versionFields = new Set([...catalogFields, "checksum"]);
const pointsFields = new Set(["default", "maximum", "minimum"]);
const requiredPolicyFields = new Set(["default", "overrideAllowed"]);
const localizedContentFields = new Set(["description", "title"]);
const statuses = new Set<TaskTemplateCatalogStatus>(["active", "deprecated", "retired"]);
const adoptionModes = new Set<TaskTemplateAdoptionMode>(["direct", "manual_review", "deferred"]);
const verificationTypes = new Set<VerificationType>(["WALLET", "ON_CHAIN", "DAPP_API", "SOCIAL", "MANUAL"]);
const walletCompatibilities = new Set<WalletCompatibility>(["ANY", "AA_ONLY", "EOA_ONLY"]);
const riskLevels = new Set<RiskLevel>(["low", "medium", "high"]);
const localeReadinessValues = new Set<TaskTemplateLocaleReadiness>([
  "ready",
  "ai_draft",
  "reviewed",
  "fallback",
  "missing",
]);

const normalizePoints = (value: unknown): TaskTemplatePointsPolicy => {
  const record = assertPlainRecord(value, "points");
  assertExactFields(record, pointsFields, "points");

  const minimum = ownValue(record, "minimum", "points");
  const defaultPoints = ownValue(record, "default", "points");
  const maximum = ownValue(record, "maximum", "points");

  const assertPoint = (candidate: unknown, field: string): number => {
    if (!Number.isInteger(candidate) || (candidate as number) < 0 || (candidate as number) > TASK_TEMPLATE_POINTS_MAX) {
      return fail("TASK_TEMPLATE_POINTS_INVALID", field, TASK_TEMPLATE_POINTS_MAX);
    }
    return candidate as number;
  };

  const normalizedMinimum = assertPoint(minimum, "points.minimum");
  const normalizedDefault = assertPoint(defaultPoints, "points.default");
  const normalizedMaximum = assertPoint(maximum, "points.maximum");

  if (normalizedDefault < normalizedMinimum || normalizedDefault > normalizedMaximum) {
    return fail("TASK_TEMPLATE_POINTS_INVALID", "points.default", TASK_TEMPLATE_POINTS_MAX);
  }

  return Object.freeze({
    default: normalizedDefault,
    maximum: normalizedMaximum,
    minimum: normalizedMinimum,
  });
};

const normalizeRequiredPolicy = (value: unknown): TaskTemplateRequiredPolicy => {
  const record = assertPlainRecord(value, "requiredPolicy");
  assertExactFields(record, requiredPolicyFields, "requiredPolicy");
  const defaultRequired = ownValue(record, "default", "requiredPolicy");
  const overrideAllowed = ownValue(record, "overrideAllowed", "requiredPolicy");

  if (typeof defaultRequired !== "boolean") {
    return fail("TASK_TEMPLATE_REQUIRED_POLICY_INVALID", "requiredPolicy.default");
  }
  if (typeof overrideAllowed !== "boolean") {
    return fail("TASK_TEMPLATE_REQUIRED_POLICY_INVALID", "requiredPolicy.overrideAllowed");
  }

  return Object.freeze({ default: defaultRequired, overrideAllowed });
};

const localePattern = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

const normalizeLocales = ({
  localeReadiness: readinessValue,
  localizedContent: contentValue,
  supportedLocales: localesValue,
}: {
  localeReadiness: unknown;
  localizedContent: unknown;
  supportedLocales: unknown;
}): Pick<TaskTemplateCatalogVersion, "localeReadiness" | "localizedContent" | "supportedLocales"> => {
  if (!Array.isArray(localesValue) || localesValue.length === 0 || localesValue.length > TASK_TEMPLATE_SUPPORTED_LOCALES_MAX) {
    return fail("TASK_TEMPLATE_LOCALE_INVALID", "supportedLocales", TASK_TEMPLATE_SUPPORTED_LOCALES_MAX);
  }

  if (
    Object.getPrototypeOf(localesValue) !== Array.prototype
    || Reflect.ownKeys(localesValue).length !== localesValue.length + 1
  ) {
    return fail(
      "TASK_TEMPLATE_LOCALE_INVALID",
      "supportedLocales",
      TASK_TEMPLATE_SUPPORTED_LOCALES_MAX,
    );
  }

  const locales: string[] = [];
  for (let index = 0; index < localesValue.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(localesValue, String(index));
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      return fail(
        "TASK_TEMPLATE_LOCALE_INVALID",
        "supportedLocales",
        TASK_TEMPLATE_SUPPORTED_LOCALES_MAX,
      );
    }
    const locale = descriptor.value;
    if (
      typeof locale !== "string"
      || hasUnpairedSurrogate(locale)
      || !localePattern.test(locale)
      || utf8ByteLength(locale) > 35
    ) {
      return fail("TASK_TEMPLATE_LOCALE_INVALID", `supportedLocales[${index}]`, 35);
    }
    locales.push(locale);
  }

  if (new Set(locales).size !== locales.length) {
    return fail("TASK_TEMPLATE_LOCALE_INVALID", "supportedLocales", TASK_TEMPLATE_SUPPORTED_LOCALES_MAX);
  }
  locales.sort(compareStrings);

  const contentRecord = assertPlainRecord(contentValue, "localizedContent");
  const readinessRecord = assertPlainRecord(readinessValue, "localeReadiness");
  const localeSet = new Set(locales);

  for (const key of Object.keys(contentRecord)) {
    if (!localeSet.has(key)) {
      return fail("TASK_TEMPLATE_LOCALE_INVALID", "localizedContent");
    }
  }
  for (const key of Object.keys(readinessRecord)) {
    if (!localeSet.has(key)) {
      return fail("TASK_TEMPLATE_LOCALE_INVALID", "localeReadiness");
    }
  }

  const localizedContent: Record<string, TaskTemplateLocalizedContent> = {};
  const localeReadiness: Record<string, TaskTemplateLocaleReadiness> = {};
  for (const [index, locale] of locales.entries()) {
    const contentField = `localizedContent[${index}]`;
    const contentDescriptor = Object.getOwnPropertyDescriptor(contentRecord, locale);
    if (!contentDescriptor?.enumerable || !("value" in contentDescriptor)) {
      return fail("TASK_TEMPLATE_LOCALE_INVALID", "localizedContent");
    }
    const content = assertPlainRecord(contentDescriptor.value, contentField);
    assertExactFields(content, localizedContentFields, contentField);
    const title = assertText(
      ownValue(content, "title", contentField),
      `${contentField}.title`,
      TASK_TEMPLATE_TITLE_MAX_BYTES,
    );
    const description = assertText(
      ownValue(content, "description", contentField),
      `${contentField}.description`,
      TASK_TEMPLATE_DESCRIPTION_MAX_BYTES,
    );
    localizedContent[locale] = Object.freeze({ description, title });

    const readinessDescriptor = Object.getOwnPropertyDescriptor(readinessRecord, locale);
    if (!readinessDescriptor?.enumerable || !("value" in readinessDescriptor)) {
      return fail("TASK_TEMPLATE_LOCALE_INVALID", "localeReadiness");
    }
    if (!localeReadinessValues.has(readinessDescriptor.value as TaskTemplateLocaleReadiness)) {
      return fail("TASK_TEMPLATE_LOCALE_INVALID", `localeReadiness[${index}]`);
    }
    localeReadiness[locale] = readinessDescriptor.value as TaskTemplateLocaleReadiness;
  }

  if (utf8ByteLength(JSON.stringify(localizedContent)) > TASK_TEMPLATE_LOCALIZED_CONTENT_MAX_BYTES) {
    return fail(
      "TASK_TEMPLATE_LOCALE_INVALID",
      "localizedContent",
      TASK_TEMPLATE_LOCALIZED_CONTENT_MAX_BYTES,
    );
  }

  return {
    localeReadiness: Object.freeze(localeReadiness),
    localizedContent: Object.freeze(localizedContent),
    supportedLocales: Object.freeze(locales),
  };
};

type NormalizedCatalogSource = Omit<TaskTemplateCatalogVersion, "checksum">;

const normalizeSource = (value: unknown): NormalizedCatalogSource => {
  const record = assertPlainRecord(value, "$");
  assertExactFields(record, catalogFields, "$");

  const catalogSchemaVersion = ownValue(record, "catalogSchemaVersion");
  if (catalogSchemaVersion !== TASK_TEMPLATE_CATALOG_SCHEMA_VERSION) {
    return fail("TASK_TEMPLATE_SCHEMA_INVALID", "catalogSchemaVersion");
  }

  const templateCode = ownValue(record, "templateCode");
  if (
    typeof templateCode !== "string"
    || templateCode.length === 0
    || templateCode.length > TASK_TEMPLATE_CODE_MAX_LENGTH
    || !/^[a-z0-9][a-z0-9-]*$/.test(templateCode)
  ) {
    return fail("TASK_TEMPLATE_CODE_INVALID", "templateCode", TASK_TEMPLATE_CODE_MAX_LENGTH);
  }

  const version = ownValue(record, "version");
  if (!Number.isInteger(version) || (version as number) < 1 || (version as number) > TASK_TEMPLATE_VERSION_MAX) {
    return fail("TASK_TEMPLATE_VERSION_INVALID", "version", TASK_TEMPLATE_VERSION_MAX);
  }

  const status = ownValue(record, "status");
  if (!statuses.has(status as TaskTemplateCatalogStatus)) {
    return fail("TASK_TEMPLATE_STATUS_INVALID", "status");
  }

  const adoptionMode = ownValue(record, "adoptionMode");
  if (!adoptionModes.has(adoptionMode as TaskTemplateAdoptionMode)) {
    return fail("TASK_TEMPLATE_ADOPTION_MODE_INVALID", "adoptionMode");
  }

  const category = ownValue(record, "category");
  if (
    typeof category !== "string"
    || category.length === 0
    || utf8ByteLength(category) > 64
    || !/^[a-z][a-z0-9-]*$/.test(category)
  ) {
    return fail("TASK_TEMPLATE_CATEGORY_INVALID", "category", 64);
  }

  const verificationType = ownValue(record, "verificationType");
  if (!verificationTypes.has(verificationType as VerificationType)) {
    return fail("TASK_TEMPLATE_VERIFICATION_INVALID", "verificationType");
  }

  const walletCompatibility = ownValue(record, "walletCompatibility");
  if (!walletCompatibilities.has(walletCompatibility as WalletCompatibility)) {
    return fail("TASK_TEMPLATE_WALLET_INVALID", "walletCompatibility");
  }

  const riskLevel = ownValue(record, "riskLevel");
  if (!riskLevels.has(riskLevel as RiskLevel)) {
    return fail("TASK_TEMPLATE_RISK_INVALID", "riskLevel");
  }

  const locales = normalizeLocales({
    localeReadiness: ownValue(record, "localeReadiness"),
    localizedContent: ownValue(record, "localizedContent"),
    supportedLocales: ownValue(record, "supportedLocales"),
  });

  const normalizedEvidence = canonicalValue(
    ownValue(record, "evidenceRule"),
    "evidenceRule",
    new WeakSet<object>(),
    0,
  );
  if (Array.isArray(normalizedEvidence) || !isPlainRecord(normalizedEvidence)) {
    return fail("TASK_TEMPLATE_CANONICAL_VALUE_INVALID", "evidenceRule");
  }
  if (utf8ByteLength(JSON.stringify(normalizedEvidence)) > TASK_TEMPLATE_EVIDENCE_RULE_MAX_BYTES) {
    return fail(
      "TASK_TEMPLATE_CANONICAL_VALUE_INVALID",
      "evidenceRule",
      TASK_TEMPLATE_EVIDENCE_RULE_MAX_BYTES,
    );
  }

  return Object.freeze({
    adoptionMode: adoptionMode as TaskTemplateAdoptionMode,
    catalogSchemaVersion: TASK_TEMPLATE_CATALOG_SCHEMA_VERSION,
    category,
    evidenceRule: normalizedEvidence,
    ...locales,
    points: normalizePoints(ownValue(record, "points")),
    requiredPolicy: normalizeRequiredPolicy(ownValue(record, "requiredPolicy")),
    riskLevel: riskLevel as RiskLevel,
    status: status as TaskTemplateCatalogStatus,
    templateCode,
    verificationType: verificationType as VerificationType,
    version: version as number,
    walletCompatibility: walletCompatibility as WalletCompatibility,
  });
};

const checksumInput = (source: NormalizedCatalogSource): Readonly<Record<string, unknown>> => ({
  adoptionMode: source.adoptionMode,
  catalogSchemaVersion: source.catalogSchemaVersion,
  category: source.category,
  evidenceRule: source.evidenceRule,
  localeReadiness: source.localeReadiness,
  localizedContent: source.localizedContent,
  points: source.points,
  requiredPolicy: source.requiredPolicy,
  riskLevel: source.riskLevel,
  supportedLocales: source.supportedLocales,
  templateCode: source.templateCode,
  verificationType: source.verificationType,
  version: source.version,
  walletCompatibility: source.walletCompatibility,
});

const stableJson = (value: unknown): string => {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }

  const record = value as Readonly<Record<string, unknown>>;
  return `{${Object.keys(record).sort(compareStrings)
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(",")}}`;
};

export const serializeTaskTemplateChecksumInput = (
  source: TaskTemplateCatalogVersionSource,
): string => stableJson(checksumInput(normalizeSource(source)));

export const createTaskTemplateChecksum = (
  source: TaskTemplateCatalogVersionSource,
): string => createHash("sha256")
  .update(serializeTaskTemplateChecksumInput(source), "utf8")
  .digest("hex");

export const createTaskTemplateCatalogVersion = (
  source: TaskTemplateCatalogVersionSource,
): TaskTemplateCatalogVersion => {
  const normalized = normalizeSource(source);
  const checksum = createHash("sha256")
    .update(stableJson(checksumInput(normalized)), "utf8")
    .digest("hex");

  return Object.freeze({ ...normalized, checksum });
};

export const parseTaskTemplateCatalogVersion = (value: unknown): TaskTemplateCatalogVersion => {
  const record = assertPlainRecord(value, "$");
  assertExactFields(record, versionFields, "$");
  const checksum = ownValue(record, "checksum");

  if (typeof checksum !== "string" || !/^[a-f0-9]{64}$/.test(checksum)) {
    return fail("TASK_TEMPLATE_CHECKSUM_INVALID", "checksum", 64);
  }

  const source = Object.fromEntries(
    [...catalogFields].map((field) => [field, ownValue(record, field)]),
  );
  const normalized = normalizeSource(source);
  const calculated = createHash("sha256")
    .update(stableJson(checksumInput(normalized)), "utf8")
    .digest("hex");

  if (calculated !== checksum) {
    return fail("TASK_TEMPLATE_CHECKSUM_MISMATCH", "checksum");
  }

  return Object.freeze({ ...normalized, checksum });
};

export const canTransitionTaskTemplateStatus = (
  from: TaskTemplateCatalogStatus,
  to: TaskTemplateCatalogStatus,
): boolean => (from === "active" && (to === "deprecated" || to === "retired"))
  || (from === "deprecated" && to === "retired");

export const isTaskTemplateDirectlyAdoptable = (
  template: Pick<TaskTemplateCatalogVersion, "adoptionMode" | "status">,
): boolean => template.status === "active" && template.adoptionMode === "direct";
