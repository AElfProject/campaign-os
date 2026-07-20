import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import {
  TASK_TEMPLATE_CATALOG_SCHEMA_VERSION,
  TASK_TEMPLATE_CODE_MAX_LENGTH,
  TASK_TEMPLATE_EVIDENCE_RULE_MAX_BYTES,
  TASK_TEMPLATE_POINTS_MAX,
  TASK_TEMPLATE_VERSION_MAX,
  TaskTemplateCatalogValidationError,
  parseTaskTemplateCatalogVersion,
  type TaskTemplateCanonicalObject,
  type TaskTemplateCanonicalValue,
  type TaskTemplateCatalogStatus,
  type TaskTemplateCatalogVersion,
} from "../domain/taskTemplateCatalog";
import type { VerificationType, WalletCompatibility } from "../domain/types";
import {
  TASK_TEMPLATE_ADOPTION_IDEMPOTENCY_KEY_MAX_LENGTH,
  TASK_TEMPLATE_ADOPTION_IDEMPOTENCY_KEY_MIN_LENGTH,
  TASK_TEMPLATE_CATALOG_DEFAULT_PAGE_SIZE,
  TASK_TEMPLATE_CATALOG_MAX_FILTER_VALUES,
  TASK_TEMPLATE_CATALOG_MAX_PAGE_SIZE,
  TASK_TEMPLATE_SNAPSHOT_VERSION,
  TaskTemplateCatalogError,
  type TaskTemplateAdoptedTask,
  type TaskTemplateAdoptionAuthority,
  type TaskTemplateAdoptionRequest,
  type TaskTemplateCatalogErrorCode,
  type TaskTemplateCatalogOperation,
  type TaskTemplateCatalogPage,
  type TaskTemplateCatalogQuery,
  type TaskTemplateCatalogReadContext,
  type TaskTemplateCatalogStore,
  type TaskTemplateSnapshotV1,
} from "./taskTemplateCatalogStore";

const DEFAULT_CURSOR_TTL_MS = 5 * 60_000;
const DEFAULT_QUERY_TIMEOUT_MS = 1_500;
const DEFAULT_CLOSE_TIMEOUT_MS = 9_000;
const MAX_QUERY_TIMEOUT_MS = 2_000;
const MAX_CLOSE_TIMEOUT_MS = 10_000;
const CURSOR_MAX_LENGTH = 2_048;
const IDENTIFIER_MAX_LENGTH = 160;
const OWNER_ADDRESS_MAX_LENGTH = 256;
const TRACE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const TEMPLATE_CODE_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const CATEGORY_PATTERN = /^[a-z][a-z0-9-]*$/;
const LOCALE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const JSON_DEPTH_MAX = 8;
const JSON_ARRAY_MAX_ITEMS = 64;
const JSON_OBJECT_MAX_FIELDS = 32;
const JSON_KEY_MAX_BYTES = 96;
const JSON_STRING_MAX_BYTES = 4_096;

const STATUSES = ["active", "deprecated", "retired"] as const;
const VERIFICATION_TYPES = ["WALLET", "ON_CHAIN", "DAPP_API", "SOCIAL", "MANUAL"] as const;
const WALLET_COMPATIBILITIES = ["ANY", "AA_ONLY", "EOA_ONLY"] as const;

const CATALOG_COLUMNS = `
  template_code,
  version,
  catalog_schema_version,
  status,
  adoption_mode,
  category,
  verification_type,
  wallet_compatibility,
  default_points,
  minimum_points,
  maximum_points,
  required_by_default,
  required_override_allowed,
  risk_level,
  supported_locales,
  localized_content,
  locale_readiness,
  evidence_rule,
  checksum,
  created_at,
  updated_at,
  deprecated_at,
  retired_at
`;

const ADOPTED_TASK_COLUMNS = `
  id,
  campaign_id,
  template_code,
  verification_type,
  wallet_compatibility,
  points,
  required,
  evidence_rule,
  created_at,
  updated_at,
  template_version,
  template_checksum,
  template_snapshot,
  template_adoption_idempotency_key
`;

const CATALOG_ROW_FIELDS = new Set([
  "adoption_mode",
  "catalog_schema_version",
  "category",
  "checksum",
  "created_at",
  "default_points",
  "deprecated_at",
  "evidence_rule",
  "locale_readiness",
  "localized_content",
  "maximum_points",
  "minimum_points",
  "required_by_default",
  "required_override_allowed",
  "retired_at",
  "risk_level",
  "status",
  "supported_locales",
  "template_code",
  "updated_at",
  "verification_type",
  "version",
  "wallet_compatibility",
]);

const ADOPTED_TASK_ROW_FIELDS = new Set([
  "campaign_id",
  "created_at",
  "evidence_rule",
  "id",
  "points",
  "required",
  "template_adoption_idempotency_key",
  "template_checksum",
  "template_code",
  "template_snapshot",
  "template_version",
  "updated_at",
  "verification_type",
  "wallet_compatibility",
]);

export interface PostgresTaskTemplateCatalogQueryResult {
  readonly rows: Array<Record<string, unknown>>;
}

export interface PostgresTaskTemplateCatalogQueryConfig {
  readonly query_timeout: number;
  readonly text: string;
  readonly values: readonly unknown[];
}

export type PostgresTaskTemplateCatalogQueryInput =
  | string
  | PostgresTaskTemplateCatalogQueryConfig;

export interface PostgresTaskTemplateCatalogClient {
  query(
    input: PostgresTaskTemplateCatalogQueryInput,
    values?: readonly unknown[],
  ): Promise<PostgresTaskTemplateCatalogQueryResult>;
  release(destroy?: boolean): void;
}

export interface PostgresTaskTemplateCatalogPool {
  connect(): Promise<PostgresTaskTemplateCatalogClient>;
  end(): Promise<void>;
  query(
    input: PostgresTaskTemplateCatalogQueryInput,
    values?: readonly unknown[],
  ): Promise<PostgresTaskTemplateCatalogQueryResult>;
}

export interface CreatePostgresTaskTemplateCatalogStoreOptions {
  readonly closeTimeoutMs?: number;
  readonly cursorSigningKey?: Uint8Array;
  readonly cursorTtlMs?: number;
  readonly defaultPageSize?: number;
  readonly maximumPageSize?: number;
  readonly now?: () => Date;
  readonly ownsPool?: boolean;
  readonly pool: PostgresTaskTemplateCatalogPool;
  readonly queryTimeoutMs?: number;
  readonly taskId?: () => string;
}

interface ActiveOperationLease {
  readonly deadline: number;
  readonly finish: () => void;
  readonly signal: AbortSignal;
}

interface NormalizedCatalogQuery {
  readonly categories: readonly string[];
  readonly cursor?: string;
  readonly limit: number;
  readonly locale?: string;
  readonly statuses: readonly TaskTemplateCatalogStatus[];
  readonly verificationTypes: readonly VerificationType[];
  readonly walletCompatibility: readonly WalletCompatibility[];
}

interface CursorPosition {
  readonly templateCode: string;
  readonly version: number;
}

interface CursorPayload {
  readonly expiresAt: number;
  readonly filtersDigest: string;
  readonly templateCode: string;
  readonly version: 1;
  readonly templateVersion: number;
}

class RowDecodeError extends Error {
  constructor(readonly field: string) {
    super("PostgreSQL task template catalog row is invalid.");
    this.name = "RowDecodeError";
  }
}

type DbRow = Record<string, unknown>;

const catalogError = (
  code: TaskTemplateCatalogErrorCode,
  field: string,
  operation: TaskTemplateCatalogOperation,
  traceId: string,
) => new TaskTemplateCatalogError({ code, field, operation, traceId });

const rowError = (field: string): never => {
  throw new RowDecodeError(field);
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const assertPlainRecord = (value: unknown, field: string): DbRow =>
  isPlainRecord(value) ? value : rowError(field);

const readOwn = (record: DbRow, field: string, parent = "row"): unknown => {
  const descriptor = Object.getOwnPropertyDescriptor(record, field);
  if (!descriptor?.enumerable || !("value" in descriptor)) {
    return rowError(parent);
  }
  return descriptor.value;
};

const assertExactFields = (
  record: DbRow,
  expected: ReadonlySet<string>,
  field: string,
): void => {
  const keys = Reflect.ownKeys(record);
  if (
    keys.length !== expected.size
    || keys.some((key) => typeof key !== "string" || !expected.has(key))
  ) {
    rowError(field);
  }
};

const decodeStringValue = (
  value: unknown,
  field: string,
  maximum = 2_048,
): string => {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > maximum
    || value !== value.trim()
  ) {
    return rowError(field);
  }
  return value;
};

const decodeString = (row: DbRow, field: string, maximum?: number): string =>
  decodeStringValue(readOwn(row, field), field, maximum);

const decodeIntegerValue = (
  value: unknown,
  field: string,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
): number => {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    return rowError(field);
  }
  return value as number;
};

const decodeInteger = (
  row: DbRow,
  field: string,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
): number => decodeIntegerValue(readOwn(row, field), field, minimum, maximum);

const decodeBoolean = (row: DbRow, field: string): boolean => {
  const value = readOwn(row, field);
  return typeof value === "boolean" ? value : rowError(field);
};

const decodeTimestampValue = (value: unknown, field: string): string => {
  if (!(value instanceof Date) && typeof value !== "string") {
    return rowError(field);
  }
  const timestamp = value instanceof Date ? value : new Date(value);
  return Number.isFinite(timestamp.getTime()) ? timestamp.toISOString() : rowError(field);
};

const decodeTimestamp = (row: DbRow, field: string): string =>
  decodeTimestampValue(readOwn(row, field), field);

const decodeOptionalTimestamp = (row: DbRow, field: string): string | undefined => {
  const value = readOwn(row, field);
  return value === null ? undefined : decodeTimestampValue(value, field);
};

const compareStrings = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const utf8Bytes = (value: string): number => Buffer.byteLength(value, "utf8");

const normalizeCanonicalJson = (
  value: unknown,
  field: string,
  stack: WeakSet<object>,
  depth: number,
): TaskTemplateCanonicalValue => {
  if (depth > JSON_DEPTH_MAX) {
    return rowError(field);
  }
  if (value === null || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isSafeInteger(value) ? value : rowError(field);
  }
  if (typeof value === "string") {
    return utf8Bytes(value) <= JSON_STRING_MAX_BYTES ? value : rowError(field);
  }
  if (typeof value !== "object" || stack.has(value)) {
    return rowError(field);
  }

  stack.add(value);
  try {
    if (Array.isArray(value)) {
      if (
        Object.getPrototypeOf(value) !== Array.prototype
        || value.length > JSON_ARRAY_MAX_ITEMS
        || Reflect.ownKeys(value).length !== value.length + 1
      ) {
        return rowError(field);
      }
      const normalized: TaskTemplateCanonicalValue[] = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor?.enumerable || !("value" in descriptor)) {
          return rowError(field);
        }
        normalized.push(normalizeCanonicalJson(
          descriptor.value,
          field,
          stack,
          depth + 1,
        ));
      }
      return Object.freeze(normalized);
    }

    const record = assertPlainRecord(value, field);
    const keys = Reflect.ownKeys(record);
    if (
      keys.length > JSON_OBJECT_MAX_FIELDS
      || keys.some((key) => typeof key !== "string")
    ) {
      return rowError(field);
    }

    const normalized: Record<string, TaskTemplateCanonicalValue> = Object.create(null);
    for (const key of (keys as string[]).sort(compareStrings)) {
      if (key.length === 0 || utf8Bytes(key) > JSON_KEY_MAX_BYTES) {
        return rowError(field);
      }
      const descriptor = Object.getOwnPropertyDescriptor(record, key);
      if (!descriptor?.enumerable || !("value" in descriptor)) {
        return rowError(field);
      }
      normalized[key] = normalizeCanonicalJson(
        descriptor.value,
        field,
        stack,
        depth + 1,
      );
    }
    return Object.freeze(normalized);
  } finally {
    stack.delete(value);
  }
};

const normalizeCanonicalJsonObject = (
  value: unknown,
  field: string,
): TaskTemplateCanonicalObject => {
  const normalized = normalizeCanonicalJson(value, field, new WeakSet<object>(), 0);
  if (normalized === null || Array.isArray(normalized) || typeof normalized !== "object") {
    return rowError(field);
  }
  if (utf8Bytes(JSON.stringify(normalized)) > TASK_TEMPLATE_EVIDENCE_RULE_MAX_BYTES) {
    return rowError(field);
  }
  return normalized as TaskTemplateCanonicalObject;
};

const stableJson = (value: unknown): string => {
  if (
    value === null
    || typeof value === "boolean"
    || typeof value === "number"
    || typeof value === "string"
  ) {
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

const decodeCatalogRowValue = (value: unknown): TaskTemplateCatalogVersion => {
  const row = assertPlainRecord(value, "catalogRow");
  assertExactFields(row, CATALOG_ROW_FIELDS, "catalogRow");
  const supportedLocales = readOwn(row, "supported_locales");
  if (!Array.isArray(supportedLocales)) {
    return rowError("catalogRow");
  }

  const status = decodeString(row, "status", 16);
  const createdAt = decodeTimestamp(row, "created_at");
  const updatedAt = decodeTimestamp(row, "updated_at");
  const deprecatedAt = decodeOptionalTimestamp(row, "deprecated_at");
  const retiredAt = decodeOptionalTimestamp(row, "retired_at");
  if (
    updatedAt < createdAt
    || (deprecatedAt !== undefined && (deprecatedAt < createdAt || deprecatedAt > updatedAt))
    || (retiredAt !== undefined && (retiredAt < createdAt || retiredAt > updatedAt))
    || (status === "active" && (deprecatedAt !== undefined || retiredAt !== undefined))
    || (status === "deprecated" && (deprecatedAt === undefined || retiredAt !== undefined))
    || (status === "retired" && (retiredAt === undefined || (deprecatedAt !== undefined && deprecatedAt > retiredAt)))
  ) {
    return rowError("catalogRow");
  }

  return parseTaskTemplateCatalogVersion({
    adoptionMode: decodeString(row, "adoption_mode", 32),
    catalogSchemaVersion: decodeString(row, "catalog_schema_version", 64),
    category: decodeString(row, "category", 64),
    checksum: decodeString(row, "checksum", 64),
    evidenceRule: readOwn(row, "evidence_rule"),
    localeReadiness: readOwn(row, "locale_readiness"),
    localizedContent: readOwn(row, "localized_content"),
    points: {
      default: decodeInteger(row, "default_points", 0, TASK_TEMPLATE_POINTS_MAX),
      maximum: decodeInteger(row, "maximum_points", 0, TASK_TEMPLATE_POINTS_MAX),
      minimum: decodeInteger(row, "minimum_points", 0, TASK_TEMPLATE_POINTS_MAX),
    },
    requiredPolicy: {
      default: decodeBoolean(row, "required_by_default"),
      overrideAllowed: decodeBoolean(row, "required_override_allowed"),
    },
    riskLevel: decodeString(row, "risk_level", 16),
    status,
    supportedLocales,
    templateCode: decodeString(row, "template_code", TASK_TEMPLATE_CODE_MAX_LENGTH),
    verificationType: decodeString(row, "verification_type", 16),
    version: decodeInteger(row, "version", 1, TASK_TEMPLATE_VERSION_MAX),
    walletCompatibility: decodeString(row, "wallet_compatibility", 16),
  });
};

const decodeCatalogRow = (
  value: unknown,
  operation: Extract<TaskTemplateCatalogOperation, "adopt" | "detail" | "list">,
  traceId: string,
): TaskTemplateCatalogVersion => {
  try {
    return decodeCatalogRowValue(value);
  } catch (error) {
    if (error instanceof RowDecodeError || error instanceof TaskTemplateCatalogValidationError) {
      throw catalogError("TASK_TEMPLATE_CORRUPT", "catalogRow", operation, traceId);
    }
    throw error;
  }
};

const SNAPSHOT_FIELDS = new Set([
  "adoptionMode",
  "category",
  "evidenceRule",
  "points",
  "required",
  "templateChecksum",
  "templateCode",
  "templateVersion",
  "verificationType",
  "version",
  "walletCompatibility",
]);

const decodeSnapshot = (value: unknown): TaskTemplateSnapshotV1 => {
  const row = assertPlainRecord(value, "taskSnapshot");
  assertExactFields(row, SNAPSHOT_FIELDS, "taskSnapshot");
  const version = decodeString(row, "version", 64);
  const adoptionMode = decodeString(row, "adoptionMode", 32);
  const templateCode = decodeString(row, "templateCode", TASK_TEMPLATE_CODE_MAX_LENGTH);
  const templateVersion = decodeInteger(row, "templateVersion", 1, TASK_TEMPLATE_VERSION_MAX);
  const templateChecksum = decodeString(row, "templateChecksum", 64);
  const category = decodeString(row, "category", 64);
  const verificationType = decodeString(row, "verificationType", 16);
  const walletCompatibility = decodeString(row, "walletCompatibility", 16);

  if (
    version !== TASK_TEMPLATE_SNAPSHOT_VERSION
    || adoptionMode !== "direct"
    || !TEMPLATE_CODE_PATTERN.test(templateCode)
    || !SHA256_PATTERN.test(templateChecksum)
    || !CATEGORY_PATTERN.test(category)
    || !VERIFICATION_TYPES.includes(verificationType as VerificationType)
    || !WALLET_COMPATIBILITIES.includes(walletCompatibility as WalletCompatibility)
  ) {
    return rowError("taskSnapshot");
  }

  return Object.freeze({
    adoptionMode: "direct",
    category,
    evidenceRule: normalizeCanonicalJsonObject(readOwn(row, "evidenceRule"), "taskSnapshot"),
    points: decodeInteger(row, "points", 0, TASK_TEMPLATE_POINTS_MAX),
    required: decodeBoolean(row, "required"),
    templateChecksum,
    templateCode,
    templateVersion,
    verificationType: verificationType as VerificationType,
    version: TASK_TEMPLATE_SNAPSHOT_VERSION,
    walletCompatibility: walletCompatibility as WalletCompatibility,
  });
};

const decodeAdoptedTaskRowValue = (value: unknown): Omit<TaskTemplateAdoptedTask, "replayed"> & {
  readonly idempotencyKey: string;
} => {
  const row = assertPlainRecord(value, "taskRow");
  assertExactFields(row, ADOPTED_TASK_ROW_FIELDS, "taskRow");
  const taskId = decodeString(row, "id", IDENTIFIER_MAX_LENGTH);
  const campaignId = decodeString(row, "campaign_id", IDENTIFIER_MAX_LENGTH);
  const templateCode = decodeString(row, "template_code", TASK_TEMPLATE_CODE_MAX_LENGTH);
  const templateVersion = decodeInteger(row, "template_version", 1, TASK_TEMPLATE_VERSION_MAX);
  const templateChecksum = decodeString(row, "template_checksum", 64);
  const verificationType = decodeString(row, "verification_type", 16);
  const walletCompatibility = decodeString(row, "wallet_compatibility", 16);
  const points = decodeInteger(row, "points", 0, TASK_TEMPLATE_POINTS_MAX);
  const required = decodeBoolean(row, "required");
  const evidenceRule = normalizeCanonicalJsonObject(readOwn(row, "evidence_rule"), "taskRow");
  const snapshot = decodeSnapshot(readOwn(row, "template_snapshot"));
  const idempotencyKey = decodeString(
    row,
    "template_adoption_idempotency_key",
    TASK_TEMPLATE_ADOPTION_IDEMPOTENCY_KEY_MAX_LENGTH,
  );

  if (
    !SAFE_IDENTIFIER_PATTERN.test(taskId)
    || !SAFE_IDENTIFIER_PATTERN.test(campaignId)
    || !TEMPLATE_CODE_PATTERN.test(templateCode)
    || !SHA256_PATTERN.test(templateChecksum)
    || !VERIFICATION_TYPES.includes(verificationType as VerificationType)
    || !WALLET_COMPATIBILITIES.includes(walletCompatibility as WalletCompatibility)
    || snapshot.templateCode !== templateCode
    || snapshot.templateVersion !== templateVersion
    || snapshot.templateChecksum !== templateChecksum
    || snapshot.verificationType !== verificationType
    || snapshot.walletCompatibility !== walletCompatibility
    || snapshot.points !== points
    || snapshot.required !== required
    || stableJson(snapshot.evidenceRule) !== stableJson(evidenceRule)
    || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)
    || idempotencyKey.length < TASK_TEMPLATE_ADOPTION_IDEMPOTENCY_KEY_MIN_LENGTH
  ) {
    return rowError("taskRow");
  }

  return Object.freeze({
    campaignId,
    createdAt: decodeTimestamp(row, "created_at"),
    evidenceRule,
    idempotencyKey,
    points,
    required,
    snapshot,
    taskId,
    templateChecksum,
    templateCode,
    templateVersion,
    updatedAt: decodeTimestamp(row, "updated_at"),
    verificationType: verificationType as VerificationType,
    walletCompatibility: walletCompatibility as WalletCompatibility,
  });
};

const decodeAdoptedTaskRow = (
  value: unknown,
  traceId: string,
) => {
  try {
    return decodeAdoptedTaskRowValue(value);
  } catch (error) {
    if (error instanceof RowDecodeError) {
      throw catalogError("TASK_TEMPLATE_CORRUPT", "taskRow", "adopt", traceId);
    }
    throw error;
  }
};

const resolveTraceId = (
  value: unknown,
  operation: TaskTemplateCatalogOperation,
): string => {
  if (typeof value !== "string" || !TRACE_ID_PATTERN.test(value)) {
    throw catalogError(
      "TASK_TEMPLATE_ARGUMENT_INVALID",
      "traceId",
      operation,
      randomUUID(),
    );
  }
  return value;
};

const assertInputRecord = (
  value: unknown,
  allowed: ReadonlySet<string>,
  field: string,
  operation: TaskTemplateCatalogOperation,
  traceId: string,
): Record<string, unknown> => {
  if (!isPlainRecord(value)) {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", field, operation, traceId);
  }
  const keys = Reflect.ownKeys(value);
  if (
    keys.some((key) => typeof key !== "string" || !allowed.has(key))
    || keys.some((key) => {
      const descriptor = typeof key === "string"
        ? Object.getOwnPropertyDescriptor(value, key)
        : undefined;
      return !descriptor?.enumerable || !("value" in descriptor);
    })
  ) {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", field, operation, traceId);
  }
  return value;
};

const inputValue = (record: Record<string, unknown>, field: string): unknown =>
  Object.getOwnPropertyDescriptor(record, field)?.value;

const normalizeFilter = <TValue extends string>(
  value: unknown,
  field: string,
  allowed: readonly TValue[] | undefined,
  validate: ((candidate: string) => boolean) | undefined,
  operation: TaskTemplateCatalogOperation,
  traceId: string,
): readonly TValue[] => {
  if (value === undefined) {
    return Object.freeze([]);
  }
  if (
    !Array.isArray(value)
    || Object.getPrototypeOf(value) !== Array.prototype
    || value.length === 0
    || value.length > TASK_TEMPLATE_CATALOG_MAX_FILTER_VALUES
    || Reflect.ownKeys(value).length !== value.length + 1
  ) {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", field, operation, traceId);
  }

  const normalized: TValue[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    const candidate = descriptor?.enumerable && "value" in descriptor
      ? descriptor.value
      : undefined;
    if (
      typeof candidate !== "string"
      || candidate !== candidate.trim()
      || candidate.length === 0
      || (allowed && !allowed.includes(candidate as TValue))
      || (validate && !validate(candidate))
    ) {
      throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", field, operation, traceId);
    }
    normalized.push(candidate as TValue);
  }
  if (new Set(normalized).size !== normalized.length) {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", field, operation, traceId);
  }
  return Object.freeze(normalized.sort(compareStrings));
};

const QUERY_FIELDS = new Set([
  "categories",
  "cursor",
  "limit",
  "locale",
  "statuses",
  "verificationTypes",
  "walletCompatibility",
]);

const READ_CONTEXT_FIELDS = new Set(["historicalReadAllowed", "traceId"]);

const normalizeReadContext = (
  value: unknown,
  operation: Extract<TaskTemplateCatalogOperation, "detail" | "list">,
): TaskTemplateCatalogReadContext => {
  const provisionalTrace = isPlainRecord(value) ? inputValue(value, "traceId") : undefined;
  const traceId = resolveTraceId(provisionalTrace, operation);
  const context = assertInputRecord(
    value,
    READ_CONTEXT_FIELDS,
    "context",
    operation,
    traceId,
  );
  const historicalReadAllowed = inputValue(context, "historicalReadAllowed");
  if (historicalReadAllowed !== undefined && typeof historicalReadAllowed !== "boolean") {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "historicalReadAllowed", operation, traceId);
  }
  return Object.freeze({
    ...(historicalReadAllowed === undefined ? {} : { historicalReadAllowed }),
    traceId,
  });
};

const normalizeCatalogQuery = (
  value: unknown,
  maximumPageSize: number,
  defaultPageSize: number,
  context: TaskTemplateCatalogReadContext,
  traceId: string,
): NormalizedCatalogQuery => {
  const query = assertInputRecord(value, QUERY_FIELDS, "query", "list", traceId);
  const categories = normalizeFilter<string>(
    inputValue(query, "categories"),
    "categories",
    undefined,
    (candidate) => candidate.length <= 64 && CATEGORY_PATTERN.test(candidate),
    "list",
    traceId,
  );
  const verificationTypes = normalizeFilter(
    inputValue(query, "verificationTypes"),
    "verificationTypes",
    VERIFICATION_TYPES,
    undefined,
    "list",
    traceId,
  );
  const walletCompatibility = normalizeFilter(
    inputValue(query, "walletCompatibility"),
    "walletCompatibility",
    WALLET_COMPATIBILITIES,
    undefined,
    "list",
    traceId,
  );
  const requestedStatuses = normalizeFilter(
    inputValue(query, "statuses"),
    "statuses",
    STATUSES,
    undefined,
    "list",
    traceId,
  );
  const statuses = requestedStatuses.length === 0
    ? Object.freeze(["active"] as const)
    : requestedStatuses;
  if (statuses.some((status) => status !== "active") && context.historicalReadAllowed !== true) {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "statuses", "list", traceId);
  }

  const localeValue = inputValue(query, "locale");
  const locale = localeValue === undefined
    ? undefined
    : typeof localeValue === "string"
      && localeValue.length <= 35
      && LOCALE_PATTERN.test(localeValue)
      ? localeValue
      : (() => {
        throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "locale", "list", traceId);
      })();
  const limitValue = inputValue(query, "limit");
  const limit = limitValue === undefined ? defaultPageSize : limitValue;
  if (!Number.isSafeInteger(limit) || (limit as number) < 1 || (limit as number) > maximumPageSize) {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "limit", "list", traceId);
  }
  const cursorValue = inputValue(query, "cursor");
  if (
    cursorValue !== undefined
    && (typeof cursorValue !== "string" || cursorValue.length === 0 || cursorValue.length > CURSOR_MAX_LENGTH)
  ) {
    throw catalogError("TASK_TEMPLATE_CURSOR_INVALID", "cursor", "list", traceId);
  }

  return Object.freeze({
    categories,
    cursor: cursorValue as string | undefined,
    limit: limit as number,
    locale,
    statuses,
    verificationTypes,
    walletCompatibility,
  });
};

const filtersDigest = (query: NormalizedCatalogQuery): string => createHash("sha256")
  .update(JSON.stringify({
    categories: query.categories,
    locale: query.locale ?? null,
    statuses: query.statuses,
    verificationTypes: query.verificationTypes,
    walletCompatibility: query.walletCompatibility,
  }), "utf8")
  .digest("hex");

const normalizeIdentity = (
  value: unknown,
  operation: Extract<TaskTemplateCatalogOperation, "detail">,
  traceId: string,
): { templateCode: string; version: number } => {
  const identity = assertInputRecord(
    value,
    new Set(["templateCode", "version"]),
    "template",
    operation,
    traceId,
  );
  const templateCode = inputValue(identity, "templateCode");
  const version = inputValue(identity, "version");
  if (
    typeof templateCode !== "string"
    || templateCode.length > TASK_TEMPLATE_CODE_MAX_LENGTH
    || !TEMPLATE_CODE_PATTERN.test(templateCode)
  ) {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "templateCode", operation, traceId);
  }
  if (!Number.isSafeInteger(version) || (version as number) < 1 || (version as number) > TASK_TEMPLATE_VERSION_MAX) {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "version", operation, traceId);
  }
  return { templateCode, version: version as number };
};

const ADOPTION_FIELDS = new Set(["campaignId", "idempotencyKey", "overrides", "template"]);
const TEMPLATE_IDENTITY_FIELDS = new Set(["templateCode", "version"]);
const OVERRIDE_FIELDS = new Set(["points", "required"]);

const normalizeAdoptionRequest = (
  value: unknown,
  traceId: string,
): TaskTemplateAdoptionRequest => {
  const request = assertInputRecord(value, ADOPTION_FIELDS, "request", "adopt", traceId);
  const campaignId = inputValue(request, "campaignId");
  const idempotencyKey = inputValue(request, "idempotencyKey");
  if (
    typeof campaignId !== "string"
    || campaignId.length > IDENTIFIER_MAX_LENGTH
    || !SAFE_IDENTIFIER_PATTERN.test(campaignId)
  ) {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "campaignId", "adopt", traceId);
  }
  if (
    typeof idempotencyKey !== "string"
    || idempotencyKey.length < TASK_TEMPLATE_ADOPTION_IDEMPOTENCY_KEY_MIN_LENGTH
    || idempotencyKey.length > TASK_TEMPLATE_ADOPTION_IDEMPOTENCY_KEY_MAX_LENGTH
    || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)
  ) {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "idempotencyKey", "adopt", traceId);
  }

  const template = assertInputRecord(
    inputValue(request, "template"),
    TEMPLATE_IDENTITY_FIELDS,
    "template",
    "adopt",
    traceId,
  );
  const templateCode = inputValue(template, "templateCode");
  const templateVersion = inputValue(template, "version");
  if (
    typeof templateCode !== "string"
    || templateCode.length > TASK_TEMPLATE_CODE_MAX_LENGTH
    || !TEMPLATE_CODE_PATTERN.test(templateCode)
  ) {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "template.templateCode", "adopt", traceId);
  }
  if (
    !Number.isSafeInteger(templateVersion)
    || (templateVersion as number) < 1
    || (templateVersion as number) > TASK_TEMPLATE_VERSION_MAX
  ) {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "template.version", "adopt", traceId);
  }

  const overrideValue = inputValue(request, "overrides");
  let overrides: TaskTemplateAdoptionRequest["overrides"];
  if (overrideValue !== undefined) {
    const record = assertInputRecord(
      overrideValue,
      OVERRIDE_FIELDS,
      "overrides",
      "adopt",
      traceId,
    );
    if (Reflect.ownKeys(record).length === 0) {
      throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "overrides", "adopt", traceId);
    }
    const points = inputValue(record, "points");
    const required = inputValue(record, "required");
    if (
      points !== undefined
      && (!Number.isSafeInteger(points) || (points as number) < 0 || (points as number) > TASK_TEMPLATE_POINTS_MAX)
    ) {
      throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "overrides.points", "adopt", traceId);
    }
    if (required !== undefined && typeof required !== "boolean") {
      throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "overrides.required", "adopt", traceId);
    }
    overrides = Object.freeze({
      ...(points === undefined ? {} : { points: points as number }),
      ...(required === undefined ? {} : { required }),
    });
  }

  return Object.freeze({
    campaignId,
    idempotencyKey,
    overrides,
    template: Object.freeze({
      templateCode,
      version: templateVersion as number,
    }),
  });
};

const normalizeAuthority = (value: unknown): TaskTemplateAdoptionAuthority => {
  const provisionalTrace = isPlainRecord(value) ? inputValue(value, "traceId") : undefined;
  const traceId = resolveTraceId(provisionalTrace, "adopt");
  const authority = assertInputRecord(
    value,
    new Set(["ownerAddress", "traceId"]),
    "authority",
    "adopt",
    traceId,
  );
  const ownerAddress = inputValue(authority, "ownerAddress");
  if (
    typeof ownerAddress !== "string"
    || ownerAddress.length > OWNER_ADDRESS_MAX_LENGTH
    || ownerAddress.length === 0
    || ownerAddress !== ownerAddress.trim()
  ) {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "ownerAddress", "adopt", traceId);
  }
  return Object.freeze({ ownerAddress, traceId });
};

const mapDriverCode = (error: unknown): TaskTemplateCatalogErrorCode => {
  const codeDescriptor = error !== null && typeof error === "object"
    ? Object.getOwnPropertyDescriptor(error, "code")
    : undefined;
  const code = codeDescriptor && "value" in codeDescriptor && typeof codeDescriptor.value === "string"
    ? codeDescriptor.value
    : "";
  if (["3F000", "42P01", "42703"].includes(code)) {
    return "TASK_TEMPLATE_SCHEMA_NOT_READY";
  }
  if (code === "23505") {
    return "TASK_TEMPLATE_ADOPTION_CONFLICT";
  }
  if (["23503", "23514", "22P02"].includes(code)) {
    return "TASK_TEMPLATE_CORRUPT";
  }
  return "TASK_TEMPLATE_CATALOG_UNAVAILABLE";
};

export const createPostgresTaskTemplateCatalogStore = ({
  closeTimeoutMs = DEFAULT_CLOSE_TIMEOUT_MS,
  cursorSigningKey: requestedCursorSigningKey,
  cursorTtlMs = DEFAULT_CURSOR_TTL_MS,
  defaultPageSize = TASK_TEMPLATE_CATALOG_DEFAULT_PAGE_SIZE,
  maximumPageSize = TASK_TEMPLATE_CATALOG_MAX_PAGE_SIZE,
  now = () => new Date(),
  ownsPool = true,
  pool,
  queryTimeoutMs = DEFAULT_QUERY_TIMEOUT_MS,
  taskId = () => `task-template-${randomUUID()}`,
}: CreatePostgresTaskTemplateCatalogStoreOptions): TaskTemplateCatalogStore => {
  const constructionTraceId = randomUUID();
  if (
    !pool
    || typeof pool.query !== "function"
    || typeof pool.connect !== "function"
    || typeof pool.end !== "function"
  ) {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "pool", "list", constructionTraceId);
  }
  if (
    !Number.isSafeInteger(defaultPageSize)
    || defaultPageSize < 1
    || !Number.isSafeInteger(maximumPageSize)
    || maximumPageSize < defaultPageSize
    || maximumPageSize > TASK_TEMPLATE_CATALOG_MAX_PAGE_SIZE
  ) {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "pageSize", "list", constructionTraceId);
  }
  if (!Number.isSafeInteger(cursorTtlMs) || cursorTtlMs < 1 || cursorTtlMs > 24 * 60 * 60_000) {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "cursorTtlMs", "list", constructionTraceId);
  }
  if (
    !Number.isSafeInteger(queryTimeoutMs)
    || queryTimeoutMs < 1
    || queryTimeoutMs > MAX_QUERY_TIMEOUT_MS
    || !Number.isSafeInteger(closeTimeoutMs)
    || closeTimeoutMs < queryTimeoutMs
    || closeTimeoutMs > MAX_CLOSE_TIMEOUT_MS
  ) {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "timeout", "list", constructionTraceId);
  }
  const cursorSigningKey = requestedCursorSigningKey
    ? Uint8Array.from(requestedCursorSigningKey)
    : randomBytes(32);
  if (cursorSigningKey.byteLength < 32 || cursorSigningKey.byteLength > 1_024) {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "cursorSigningKey", "list", constructionTraceId);
  }
  const statementTimeoutMs = Math.max(1, Math.floor(queryTimeoutMs / 2));

  let activeOperations = 0;
  let closed = false;
  let closing = false;
  let closePromise: Promise<void> | undefined;
  const drainWaiters = new Set<() => void>();
  const activeControllers = new Set<AbortController>();
  const unsafeConnectionErrors = new WeakSet<TaskTemplateCatalogError>();

  const currentDate = (
    operation: TaskTemplateCatalogOperation,
    traceId: string,
  ): Date => {
    let value: Date;
    try {
      value = now();
    } catch {
      throw catalogError("TASK_TEMPLATE_CATALOG_UNAVAILABLE", "clock", operation, traceId);
    }
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
      throw catalogError("TASK_TEMPLATE_CATALOG_UNAVAILABLE", "clock", operation, traceId);
    }
    return new Date(value);
  };

  const beginOperation = (
    operation: Extract<TaskTemplateCatalogOperation, "adopt" | "detail" | "list">,
    traceId: string,
  ): ActiveOperationLease => {
    if (closing || closed) {
      throw catalogError("TASK_TEMPLATE_CLOSED", "store", operation, traceId);
    }
    const controller = new AbortController();
    const deadline = Date.now() + queryTimeoutMs;
    activeControllers.add(controller);
    activeOperations += 1;
    let completed = false;
    const finish = () => {
      if (completed) {
        return;
      }
      completed = true;
      activeControllers.delete(controller);
      activeOperations -= 1;
      if (activeOperations === 0) {
        for (const resolve of drainWaiters) {
          resolve();
        }
        drainWaiters.clear();
      }
    };
    return Object.freeze({ deadline, finish, signal: controller.signal });
  };

  const queryWith = async (
    queryable: Pick<PostgresTaskTemplateCatalogPool, "query">,
    operation: Extract<TaskTemplateCatalogOperation, "adopt" | "detail" | "list">,
    sql: string,
    values: readonly unknown[],
    traceId: string,
    signal: AbortSignal,
    deadline: number,
  ): Promise<PostgresTaskTemplateCatalogQueryResult> => {
    const aborted = (): TaskTemplateCatalogError => {
      const error = catalogError("TASK_TEMPLATE_CLOSED", "store", operation, traceId);
      unsafeConnectionErrors.add(error);
      return error;
    };
    const timedOut = (): TaskTemplateCatalogError => {
      const error = catalogError("TASK_TEMPLATE_CATALOG_UNAVAILABLE", "database", operation, traceId);
      unsafeConnectionErrors.add(error);
      return error;
    };
    if (signal.aborted) {
      throw aborted();
    }
    const remainingMs = Math.min(queryTimeoutMs, deadline - Date.now());
    if (remainingMs <= 0) {
      throw timedOut();
    }

    const resultPromise = new Promise<PostgresTaskTemplateCatalogQueryResult>((resolve, reject) => {
      let settled = false;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const settle = (): boolean => {
        if (settled) {
          return false;
        }
        settled = true;
        if (timeout) {
          clearTimeout(timeout);
        }
        signal.removeEventListener("abort", onAbort);
        return true;
      };
      const onAbort = () => {
        if (settle()) {
          reject(aborted());
        }
      };
      timeout = setTimeout(() => {
        if (settle()) {
          reject(timedOut());
        }
      }, remainingMs);
      signal.addEventListener("abort", onAbort, { once: true });

      Promise.resolve()
        .then(() => queryable.query({
          query_timeout: remainingMs,
          text: sql,
          values,
        }))
        .then(
          (result) => {
            if (settle()) {
              resolve(result);
            }
          },
          (error: unknown) => {
            if (settle()) {
              reject(error);
            }
          },
        );
    });

    try {
      const result = await resultPromise;
      if (!result || !Array.isArray(result.rows)) {
        throw new RowDecodeError("rows");
      }
      return result;
    } catch (error) {
      if (error instanceof TaskTemplateCatalogError) {
        throw error;
      }
      if (error instanceof RowDecodeError) {
        throw catalogError("TASK_TEMPLATE_CORRUPT", "databaseRows", operation, traceId);
      }
      const mapped = catalogError(mapDriverCode(error), "database", operation, traceId);
      if (mapped.code === "TASK_TEMPLATE_CATALOG_UNAVAILABLE") {
        unsafeConnectionErrors.add(mapped);
      }
      throw mapped;
    }
  };

  const encodeCursor = (
    position: CursorPosition,
    query: NormalizedCatalogQuery,
    timestamp: Date,
  ): string => {
    const payload: CursorPayload = {
      expiresAt: timestamp.getTime() + cursorTtlMs,
      filtersDigest: filtersDigest(query),
      templateCode: position.templateCode,
      templateVersion: position.version,
      version: 1,
    };
    const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    const signature = createHmac("sha256", cursorSigningKey)
      .update(body, "utf8")
      .digest("base64url");
    return `${body}.${signature}`;
  };

  const decodeCursor = (
    cursor: string,
    query: NormalizedCatalogQuery,
    timestamp: Date,
    traceId: string,
  ): CursorPosition => {
    const fail = (): never => {
      throw catalogError("TASK_TEMPLATE_CURSOR_INVALID", "cursor", "list", traceId);
    };

    try {
      const parts = cursor.split(".");
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        return fail();
      }
      const expected = createHmac("sha256", cursorSigningKey)
        .update(parts[0], "utf8")
        .digest();
      const actual = Buffer.from(parts[1], "base64url");
      if (
        actual.toString("base64url") !== parts[1]
        || actual.length !== expected.length
        || !timingSafeEqual(actual, expected)
      ) {
        return fail();
      }
      const decoded = Buffer.from(parts[0], "base64url");
      if (decoded.toString("base64url") !== parts[0]) {
        return fail();
      }
      const value = JSON.parse(decoded.toString("utf8")) as unknown;
      if (!isPlainRecord(value)) {
        return fail();
      }
      const fields = Reflect.ownKeys(value);
      const expectedFields = [
        "expiresAt",
        "filtersDigest",
        "templateCode",
        "templateVersion",
        "version",
      ];
      if (
        fields.length !== expectedFields.length
        || fields.some((field) => typeof field !== "string" || !expectedFields.includes(field))
      ) {
        return fail();
      }
      const expiresAt = inputValue(value, "expiresAt");
      const digest = inputValue(value, "filtersDigest");
      const templateCode = inputValue(value, "templateCode");
      const templateVersion = inputValue(value, "templateVersion");
      const version = inputValue(value, "version");
      if (
        version !== 1
        || !Number.isSafeInteger(expiresAt)
        || (expiresAt as number) <= timestamp.getTime()
        || typeof digest !== "string"
        || digest !== filtersDigest(query)
        || typeof templateCode !== "string"
        || !TEMPLATE_CODE_PATTERN.test(templateCode)
        || !Number.isSafeInteger(templateVersion)
        || (templateVersion as number) < 1
        || (templateVersion as number) > TASK_TEMPLATE_VERSION_MAX
      ) {
        return fail();
      }
      return { templateCode, version: templateVersion as number };
    } catch (error) {
      if (error instanceof TaskTemplateCatalogError) {
        throw error;
      }
      return fail();
    }
  };

  const list = async (
    rawQuery: TaskTemplateCatalogQuery,
    rawContext: TaskTemplateCatalogReadContext,
  ): Promise<TaskTemplateCatalogPage> => {
    const context = normalizeReadContext(rawContext, "list");
    const traceId = context.traceId;
    const { deadline, finish, signal } = beginOperation("list", traceId);
    try {
      const normalized = normalizeCatalogQuery(
        rawQuery,
        maximumPageSize,
        defaultPageSize,
        context,
        traceId,
      );
      const snapshotAt = currentDate("list", traceId);
      const cursor = normalized.cursor
        ? decodeCursor(normalized.cursor, normalized, snapshotAt, traceId)
        : undefined;
      const clauses: string[] = [];
      const values: unknown[] = [];
      const parameter = (value: unknown): number => {
        values.push(value);
        return values.length;
      };

      const statusParam = parameter(normalized.statuses);
      clauses.push(`status = ANY($${statusParam}::text[])`);
      if (normalized.categories.length > 0) {
        const categoryParam = parameter(normalized.categories);
        clauses.push(`category = ANY($${categoryParam}::text[])`);
      }
      if (normalized.verificationTypes.length > 0) {
        const verificationParam = parameter(normalized.verificationTypes);
        clauses.push(`verification_type = ANY($${verificationParam}::text[])`);
      }
      if (normalized.walletCompatibility.length > 0) {
        const walletParam = parameter(normalized.walletCompatibility);
        clauses.push(`wallet_compatibility = ANY($${walletParam}::text[])`);
      }
      if (normalized.locale) {
        const localeParam = parameter(normalized.locale);
        clauses.push(`supported_locales @> to_jsonb(ARRAY[$${localeParam}::text])`);
      }
      if (cursor) {
        const codeParam = parameter(cursor.templateCode);
        const versionParam = parameter(cursor.version);
        clauses.push(
          `(template_code, version) > ($${codeParam}::text COLLATE "C", $${versionParam}::integer)`,
        );
      }
      const limitParam = parameter(normalized.limit + 1);
      const pageResult = await queryWith(
        pool,
        "list",
        `SELECT ${CATALOG_COLUMNS}
         FROM campaign_os.task_template_catalog_versions
         WHERE ${clauses.join(" AND ")}
         ORDER BY template_code COLLATE "C" ASC, version ASC
         LIMIT $${limitParam}`,
        values,
        traceId,
        signal,
        deadline,
      );
      if (pageResult.rows.length > normalized.limit + 1) {
        throw catalogError("TASK_TEMPLATE_CORRUPT", "catalogRows", "list", traceId);
      }
      const decoded = pageResult.rows.map((row) => decodeCatalogRow(row, "list", traceId));
      const items = Object.freeze(decoded.slice(0, normalized.limit));
      const last = items[items.length - 1];
      const nextCursor = decoded.length > normalized.limit && last
        ? encodeCursor({ templateCode: last.templateCode, version: last.version }, normalized, snapshotAt)
        : null;

      const countResult = await queryWith(
        pool,
        "list",
        `SELECT COUNT(*)::integer AS total_active
         FROM campaign_os.task_template_catalog_versions
         WHERE status = 'active'`,
        [],
        traceId,
        signal,
        deadline,
      );
      if (countResult.rows.length !== 1) {
        throw catalogError("TASK_TEMPLATE_CORRUPT", "catalogCount", "list", traceId);
      }
      let totalActive: number;
      try {
        const countRow = assertPlainRecord(countResult.rows[0], "catalogCount");
        assertExactFields(countRow, new Set(["total_active"]), "catalogCount");
        totalActive = decodeInteger(
          countRow,
          "total_active",
          0,
          2_147_483_647,
        );
      } catch (error) {
        if (error instanceof RowDecodeError) {
          throw catalogError("TASK_TEMPLATE_CORRUPT", "catalogCount", "list", traceId);
        }
        throw error;
      }

      return Object.freeze({
        catalogSchemaVersion: TASK_TEMPLATE_CATALOG_SCHEMA_VERSION,
        items,
        page: Object.freeze({ limit: normalized.limit, nextCursor }),
        snapshotAt: snapshotAt.toISOString(),
        totalActive,
      });
    } finally {
      finish();
    }
  };

  const get = async (
    rawIdentity: { readonly templateCode: string; readonly version: number },
    rawContext: TaskTemplateCatalogReadContext,
  ): Promise<TaskTemplateCatalogVersion | null> => {
    const context = normalizeReadContext(rawContext, "detail");
    const traceId = context.traceId;
    const { deadline, finish, signal } = beginOperation("detail", traceId);
    try {
      const identity = normalizeIdentity(rawIdentity, "detail", traceId);
      const result = await queryWith(
        pool,
        "detail",
        `SELECT ${CATALOG_COLUMNS}
         FROM campaign_os.task_template_catalog_versions
         WHERE template_code = $1 AND version = $2
         LIMIT 2`,
        [identity.templateCode, identity.version],
        traceId,
        signal,
        deadline,
      );
      if (result.rows.length === 0) {
        return null;
      }
      if (result.rows.length !== 1) {
        throw catalogError("TASK_TEMPLATE_CORRUPT", "catalogRows", "detail", traceId);
      }
      const template = decodeCatalogRow(result.rows[0], "detail", traceId);
      return template.status === "active" || context.historicalReadAllowed === true
        ? template
        : null;
    } finally {
      finish();
    }
  };

  const createSnapshot = (
    template: TaskTemplateCatalogVersion,
    points: number,
    required: boolean,
  ): TaskTemplateSnapshotV1 => Object.freeze({
    adoptionMode: "direct",
    category: template.category,
    evidenceRule: template.evidenceRule,
    points,
    required,
    templateChecksum: template.checksum,
    templateCode: template.templateCode,
    templateVersion: template.version,
    verificationType: template.verificationType,
    version: TASK_TEMPLATE_SNAPSHOT_VERSION,
    walletCompatibility: template.walletCompatibility,
  });

  const connectWithDeadline = async (
    traceId: string,
    signal: AbortSignal,
    deadline: number,
  ): Promise<PostgresTaskTemplateCatalogClient> => {
    if (signal.aborted) {
      throw catalogError("TASK_TEMPLATE_CLOSED", "store", "adopt", traceId);
    }
    const remainingMs = Math.min(queryTimeoutMs, deadline - Date.now());
    if (remainingMs <= 0) {
      throw catalogError("TASK_TEMPLATE_CATALOG_UNAVAILABLE", "database", "adopt", traceId);
    }
    let abandoned = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let onAbort: (() => void) | undefined;
    const connectionPromise = Promise.resolve().then(() => pool.connect());
    const deadlinePromise = new Promise<PostgresTaskTemplateCatalogClient>((_resolve, reject) => {
      timeout = setTimeout(() => {
        reject(catalogError("TASK_TEMPLATE_CATALOG_UNAVAILABLE", "database", "adopt", traceId));
      }, remainingMs);
      onAbort = () => reject(catalogError("TASK_TEMPLATE_CLOSED", "store", "adopt", traceId));
      signal.addEventListener("abort", onAbort, { once: true });
    });

    try {
      return await Promise.race([connectionPromise, deadlinePromise]);
    } catch (error) {
      abandoned = true;
      void connectionPromise.then(
        (lateClient) => {
          if (abandoned) {
            try {
              lateClient.release(true);
            } catch {
              // The caller already received a bounded safe failure.
            }
          }
        },
        () => undefined,
      );
      if (error instanceof TaskTemplateCatalogError) {
        throw error;
      }
      throw catalogError("TASK_TEMPLATE_CATALOG_UNAVAILABLE", "database", "adopt", traceId);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
      if (onAbort) {
        signal.removeEventListener("abort", onAbort);
      }
    }
  };

  const withTransaction = async <TValue>(
    traceId: string,
    signal: AbortSignal,
    deadline: number,
    execute: (client: PostgresTaskTemplateCatalogClient) => Promise<TValue>,
  ): Promise<TValue> => {
    let client: PostgresTaskTemplateCatalogClient | undefined;
    let began = false;
    let destroyClient = false;
    try {
      client = await connectWithDeadline(traceId, signal, deadline);
      await queryWith(client, "adopt", "BEGIN", [], traceId, signal, deadline);
      began = true;
      await queryWith(
        client,
        "adopt",
        "SELECT set_config('statement_timeout', $1, true) AS statement_timeout",
        [`${statementTimeoutMs}ms`],
        traceId,
        signal,
        deadline,
      );
      const result = await execute(client);
      await queryWith(client, "adopt", "COMMIT", [], traceId, signal, deadline);
      began = false;
      return result;
    } catch (error) {
      destroyClient = error instanceof TaskTemplateCatalogError
        && unsafeConnectionErrors.has(error);
      if (began && client && !destroyClient) {
        if (deadline <= Date.now()) {
          destroyClient = true;
        } else {
          try {
            await queryWith(client, "adopt", "ROLLBACK", [], traceId, signal, deadline);
          } catch {
            destroyClient = true;
            throw catalogError("TASK_TEMPLATE_CLEANUP_FAILED", "transaction", "adopt", traceId);
          }
        }
      }
      throw error;
    } finally {
      if (client) {
        try {
          client.release(destroyClient);
        } catch {
          throw catalogError("TASK_TEMPLATE_CLEANUP_FAILED", "connection", "adopt", traceId);
        }
      }
    }
  };

  const adopt = async (
    rawRequest: TaskTemplateAdoptionRequest,
    rawAuthority: TaskTemplateAdoptionAuthority,
  ): Promise<TaskTemplateAdoptedTask> => {
    const authority = normalizeAuthority(rawAuthority);
    const { deadline, finish, signal } = beginOperation("adopt", authority.traceId);
    try {
      const request = normalizeAdoptionRequest(rawRequest, authority.traceId);
      return await withTransaction(authority.traceId, signal, deadline, async (client) => {
        const campaignResult = await queryWith(
          client,
          "adopt",
          `SELECT id
           FROM campaign_os.campaigns
           WHERE id = $1 AND owner_address = $2
           LIMIT 2
           FOR SHARE`,
          [request.campaignId, authority.ownerAddress],
          authority.traceId,
          signal,
          deadline,
        );
        if (campaignResult.rows.length === 0) {
          throw catalogError("TASK_TEMPLATE_NOT_FOUND", "campaign", "adopt", authority.traceId);
        }
        if (campaignResult.rows.length !== 1) {
          throw catalogError("TASK_TEMPLATE_CORRUPT", "campaignFence", "adopt", authority.traceId);
        }
        try {
          const campaignRow = assertPlainRecord(campaignResult.rows[0], "campaignFence");
          assertExactFields(campaignRow, new Set(["id"]), "campaignFence");
          if (decodeString(campaignRow, "id", IDENTIFIER_MAX_LENGTH) !== request.campaignId) {
            throw new RowDecodeError("campaignFence");
          }
        } catch (error) {
          if (error instanceof RowDecodeError) {
            throw catalogError("TASK_TEMPLATE_CORRUPT", "campaignFence", "adopt", authority.traceId);
          }
          throw error;
        }

        const catalogResult = await queryWith(
          client,
          "adopt",
          `SELECT ${CATALOG_COLUMNS}
           FROM campaign_os.task_template_catalog_versions
           WHERE template_code = $1 AND version = $2
           LIMIT 2
           FOR SHARE`,
          [request.template.templateCode, request.template.version],
          authority.traceId,
          signal,
          deadline,
        );
        if (catalogResult.rows.length === 0) {
          throw catalogError("TASK_TEMPLATE_NOT_FOUND", "template", "adopt", authority.traceId);
        }
        if (catalogResult.rows.length !== 1) {
          throw catalogError("TASK_TEMPLATE_CORRUPT", "catalogRows", "adopt", authority.traceId);
        }
        const template = decodeCatalogRow(catalogResult.rows[0], "adopt", authority.traceId);
        if (template.adoptionMode === "manual_review") {
          throw catalogError(
            "TASK_TEMPLATE_MANUAL_REVIEW_REQUIRED",
            "template",
            "adopt",
            authority.traceId,
          );
        }
        if (template.adoptionMode !== "direct") {
          throw catalogError(
            "TASK_TEMPLATE_ADOPTION_DEFERRED",
            "template",
            "adopt",
            authority.traceId,
          );
        }

        const points = request.overrides?.points ?? template.points.default;
        if (points < template.points.minimum || points > template.points.maximum) {
          throw catalogError(
            "TASK_TEMPLATE_POLICY_MISMATCH",
            "overrides.points",
            "adopt",
            authority.traceId,
          );
        }
        const required = request.overrides?.required ?? template.requiredPolicy.default;
        if (
          request.overrides?.required !== undefined
          && required !== template.requiredPolicy.default
          && !template.requiredPolicy.overrideAllowed
        ) {
          throw catalogError(
            "TASK_TEMPLATE_POLICY_MISMATCH",
            "overrides.required",
            "adopt",
            authority.traceId,
          );
        }
        const expectedSnapshot = createSnapshot(template, points, required);

        const readExisting = () => queryWith(
          client,
          "adopt",
          `SELECT ${ADOPTED_TASK_COLUMNS}
           FROM campaign_os.campaign_tasks
           WHERE campaign_id = $1 AND template_adoption_idempotency_key = $2
           LIMIT 2
           FOR UPDATE`,
          [request.campaignId, request.idempotencyKey],
          authority.traceId,
          signal,
          deadline,
        );

        const resolveExisting = (
          rows: Array<Record<string, unknown>>,
        ): TaskTemplateAdoptedTask | undefined => {
          if (rows.length === 0) {
            return undefined;
          }
          if (rows.length !== 1) {
            throw catalogError("TASK_TEMPLATE_CORRUPT", "taskRows", "adopt", authority.traceId);
          }
          const existing = decodeAdoptedTaskRow(rows[0], authority.traceId);
          if (
            existing.campaignId !== request.campaignId
            || existing.idempotencyKey !== request.idempotencyKey
          ) {
            throw catalogError("TASK_TEMPLATE_CORRUPT", "taskRow", "adopt", authority.traceId);
          }
          if (
            existing.templateCode !== template.templateCode
            || existing.templateVersion !== template.version
            || existing.points !== points
            || existing.required !== required
          ) {
            throw catalogError(
              "TASK_TEMPLATE_ADOPTION_CONFLICT",
              "idempotencyKey",
              "adopt",
              authority.traceId,
            );
          }
          if (
            existing.templateChecksum !== template.checksum
            || existing.verificationType !== template.verificationType
            || existing.walletCompatibility !== template.walletCompatibility
            || existing.snapshot.category !== template.category
            || stableJson(existing.evidenceRule) !== stableJson(template.evidenceRule)
            || stableJson(existing.snapshot) !== stableJson(expectedSnapshot)
          ) {
            throw catalogError("TASK_TEMPLATE_CORRUPT", "taskRow", "adopt", authority.traceId);
          }
          const { idempotencyKey: _idempotencyKey, ...task } = existing;
          return Object.freeze({ ...task, replayed: true });
        };

        const existing = resolveExisting((await readExisting()).rows);
        if (existing) {
          return existing;
        }

        if (template.status !== "active") {
          throw catalogError("TASK_TEMPLATE_STALE", "template", "adopt", authority.traceId);
        }

        let generatedTaskId: string;
        try {
          generatedTaskId = taskId();
        } catch {
          throw catalogError("TASK_TEMPLATE_CATALOG_UNAVAILABLE", "taskId", "adopt", authority.traceId);
        }
        if (
          typeof generatedTaskId !== "string"
          || generatedTaskId.length > IDENTIFIER_MAX_LENGTH
          || !SAFE_IDENTIFIER_PATTERN.test(generatedTaskId)
        ) {
          throw catalogError("TASK_TEMPLATE_CATALOG_UNAVAILABLE", "taskId", "adopt", authority.traceId);
        }
        const timestamp = currentDate("adopt", authority.traceId).toISOString();
        const insertResult = await queryWith(
          client,
          "adopt",
          `INSERT INTO campaign_os.campaign_tasks (
             id,
             campaign_id,
             template_code,
             verification_type,
             wallet_compatibility,
             points,
             required,
             evidence_rule,
             created_at,
             updated_at,
             template_version,
             template_checksum,
             template_snapshot,
             template_adoption_idempotency_key
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10,
             $11, $12, $13::jsonb, $14
           )
           ON CONFLICT (campaign_id, template_adoption_idempotency_key)
             WHERE template_adoption_idempotency_key IS NOT NULL
           DO NOTHING
           RETURNING ${ADOPTED_TASK_COLUMNS}`,
          [
            generatedTaskId,
            request.campaignId,
            template.templateCode,
            template.verificationType,
            template.walletCompatibility,
            points,
            required,
            JSON.stringify(template.evidenceRule),
            timestamp,
            timestamp,
            template.version,
            template.checksum,
            JSON.stringify(expectedSnapshot),
            request.idempotencyKey,
          ],
          authority.traceId,
          signal,
          deadline,
        );
        if (insertResult.rows.length > 1) {
          throw catalogError("TASK_TEMPLATE_CORRUPT", "taskRows", "adopt", authority.traceId);
        }
        if (insertResult.rows.length === 1) {
          const inserted = decodeAdoptedTaskRow(insertResult.rows[0], authority.traceId);
          const { idempotencyKey: _idempotencyKey, ...task } = inserted;
          if (
            task.campaignId !== request.campaignId
            || task.taskId !== generatedTaskId
            || stableJson(task.snapshot) !== stableJson(expectedSnapshot)
          ) {
            throw catalogError("TASK_TEMPLATE_CORRUPT", "taskRow", "adopt", authority.traceId);
          }
          return Object.freeze({ ...task, replayed: false });
        }

        const raced = resolveExisting((await readExisting()).rows);
        if (!raced) {
          throw catalogError(
            "TASK_TEMPLATE_ADOPTION_CONFLICT",
            "idempotencyKey",
            "adopt",
            authority.traceId,
          );
        }
        return raced;
      });
    } finally {
      finish();
    }
  };

  const close = (context?: { readonly traceId: string }): Promise<void> => {
    if (closePromise) {
      return closePromise;
    }
    const traceId = resolveTraceId(context?.traceId ?? randomUUID(), "close");
    closing = true;
    closePromise = (async () => {
      const deadline = Date.now() + closeTimeoutMs;
      const waitUntilDeadline = async (
        operation: Promise<void>,
        field: "operations" | "pool",
      ): Promise<void> => {
        const remainingMs = deadline - Date.now();
        if (remainingMs <= 0) {
          throw catalogError("TASK_TEMPLATE_CLEANUP_FAILED", field, "close", traceId);
        }
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            operation,
            new Promise<never>((_resolve, reject) => {
              timeout = setTimeout(() => {
                reject(catalogError("TASK_TEMPLATE_CLEANUP_FAILED", field, "close", traceId));
              }, remainingMs);
            }),
          ]);
        } finally {
          if (timeout) {
            clearTimeout(timeout);
          }
        }
      };

      for (const controller of activeControllers) {
        controller.abort();
      }
      if (activeOperations > 0) {
        await waitUntilDeadline(
          new Promise<void>((resolve) => drainWaiters.add(resolve)),
          "operations",
        );
      }
      closed = true;
      if (!ownsPool) {
        return;
      }
      try {
        await waitUntilDeadline(Promise.resolve().then(() => pool.end()), "pool");
      } catch (error) {
        if (error instanceof TaskTemplateCatalogError) {
          throw error;
        }
        throw catalogError("TASK_TEMPLATE_CLEANUP_FAILED", "pool", "close", traceId);
      }
    })();
    return closePromise;
  };

  return Object.freeze({ adopt, close, get, list });
};
