import { randomUUID } from "node:crypto";
import {
  TASK_TEMPLATE_CODE_MAX_LENGTH,
  TASK_TEMPLATE_POINTS_MAX,
  TASK_TEMPLATE_VERSION_MAX,
  type TaskTemplateCatalogStatus,
  type TaskTemplateCatalogVersion,
} from "../domain/taskTemplateCatalog";
import type { VerificationType, WalletCompatibility } from "../domain/types";
import {
  authSessionRolePolicyById,
  type AuthRoleCapabilityId,
  type AuthSessionRoleId,
} from "./authSession";
import {
  isResolvedWalletSessionAuthority,
  type ResolvedWalletSessionAuthority,
} from "./walletAuthentication";
import {
  TASK_TEMPLATE_ADOPTION_IDEMPOTENCY_KEY_MAX_LENGTH,
  TASK_TEMPLATE_ADOPTION_IDEMPOTENCY_KEY_MIN_LENGTH,
  TASK_TEMPLATE_CATALOG_MAX_FILTER_VALUES,
  TASK_TEMPLATE_CATALOG_MAX_PAGE_SIZE,
  TASK_TEMPLATE_SNAPSHOT_VERSION,
  TaskTemplateCatalogError,
  type TaskTemplateAdoptedTask,
  type TaskTemplateAdoptionRequest,
  type TaskTemplateCatalogErrorCode,
  type TaskTemplateCatalogOperation,
  type TaskTemplateCatalogPage,
  type TaskTemplateCatalogQuery,
  type TaskTemplateCatalogStore,
} from "./taskTemplateCatalogStore";

const TRACE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const TEMPLATE_CODE_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const CATEGORY_PATTERN = /^[a-z][a-z0-9-]*$/;
const LOCALE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const CHECKSUM_PATTERN = /^[a-f0-9]{64}$/;
const CURSOR_MAX_LENGTH = 2_048;

const CATALOG_STATUSES = ["active", "deprecated", "retired"] as const;
const VERIFICATION_TYPES = ["WALLET", "ON_CHAIN", "DAPP_API", "SOCIAL", "MANUAL"] as const;
const WALLET_COMPATIBILITIES = ["ANY", "AA_ONLY", "EOA_ONLY"] as const;

export interface TaskTemplateCatalogOwnerReadAuthority {
  readonly kind: "owner";
  readonly session: ResolvedWalletSessionAuthority;
}

export interface TaskTemplateCatalogAdminReadAuthority {
  readonly kind: "admin";
  readonly session: ResolvedWalletSessionAuthority;
}

export type TaskTemplateCatalogReadAuthority =
  | TaskTemplateCatalogOwnerReadAuthority
  | TaskTemplateCatalogAdminReadAuthority;

export interface TaskTemplateCatalogOwnerAdoptionAuthority {
  readonly campaignId: string;
  readonly kind: "owner";
  readonly session: ResolvedWalletSessionAuthority;
}

export interface TaskTemplateCatalogListCommand {
  readonly authority: TaskTemplateCatalogReadAuthority;
  readonly query: TaskTemplateCatalogQuery;
  readonly traceId: string;
}

export interface TaskTemplateCatalogDetailCommand {
  readonly authority: TaskTemplateCatalogReadAuthority;
  readonly template: Readonly<{
    templateCode: string;
    version: number;
  }>;
  readonly traceId: string;
}

export interface TaskTemplateCatalogAdoptCommand {
  readonly authority: TaskTemplateCatalogOwnerAdoptionAuthority;
  readonly campaignId: string;
  readonly idempotencyKey: string;
  readonly overrides?: Readonly<{
    points?: number;
    required?: boolean;
  }>;
  readonly template: Readonly<{
    templateCode: string;
    version: number;
  }>;
  readonly traceId: string;
}

export interface TaskTemplateCatalogCloseCommand {
  readonly traceId: string;
}

export interface TaskTemplateCatalogListResult {
  readonly page: TaskTemplateCatalogPage;
  readonly status: "ok";
  readonly traceId: string;
}

export interface TaskTemplateCatalogDetailResult {
  readonly status: "ok";
  readonly template: TaskTemplateCatalogVersion;
  readonly traceId: string;
}

export interface TaskTemplateCatalogAdoptResult {
  readonly campaignId: string;
  readonly replayed: boolean;
  readonly status: "adopted";
  readonly taskId: string;
  readonly template: Readonly<{
    checksum: string;
    templateCode: string;
    version: number;
  }>;
  readonly traceId: string;
}

export interface TaskTemplateCatalogService {
  adopt(command: TaskTemplateCatalogAdoptCommand): Promise<TaskTemplateCatalogAdoptResult>;
  close(command: TaskTemplateCatalogCloseCommand): Promise<void>;
  detail(command: TaskTemplateCatalogDetailCommand): Promise<TaskTemplateCatalogDetailResult>;
  list(command: TaskTemplateCatalogListCommand): Promise<TaskTemplateCatalogListResult>;
}

export interface CreateTaskTemplateCatalogServiceOptions {
  readonly now?: () => Date;
  readonly store: TaskTemplateCatalogStore;
}

type InputRecord = Record<string, unknown>;

const catalogError = (
  code: TaskTemplateCatalogErrorCode,
  field: string,
  operation: TaskTemplateCatalogOperation,
  traceId: string,
) => new TaskTemplateCatalogError({ code, field, operation, traceId });

const inputValue = (record: InputRecord, field: string): unknown =>
  Object.getOwnPropertyDescriptor(record, field)?.value;

const safeInputTrace = (value: unknown): unknown => {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, "traceId");
    return descriptor?.enumerable && "value" in descriptor ? descriptor.value : undefined;
  } catch {
    return undefined;
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

const strictRecord = (
  value: unknown,
  allowedFields: ReadonlySet<string>,
  field: string,
  operation: TaskTemplateCatalogOperation,
  traceId: string,
): InputRecord => {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", field, operation, traceId);
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", field, operation, traceId);
    }
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string" || !allowedFields.has(key))) {
      throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", field, operation, traceId);
    }
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || !("value" in descriptor)) {
        throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", field, operation, traceId);
      }
    }
    return value as InputRecord;
  } catch (error) {
    if (error instanceof TaskTemplateCatalogError) {
      throw error;
    }
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", field, operation, traceId);
  }
};

const requiredString = (
  value: unknown,
  pattern: RegExp,
  maximum: number,
  field: string,
  operation: TaskTemplateCatalogOperation,
  traceId: string,
): string => {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > maximum
    || !pattern.test(value)
  ) {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", field, operation, traceId);
  }
  return value;
};

const normalizeTemplateIdentity = (
  value: unknown,
  operation: Extract<TaskTemplateCatalogOperation, "adopt" | "detail">,
  traceId: string,
): Readonly<{ templateCode: string; version: number }> => {
  const template = strictRecord(
    value,
    new Set(["templateCode", "version"]),
    "template",
    operation,
    traceId,
  );
  const templateCode = requiredString(
    inputValue(template, "templateCode"),
    TEMPLATE_CODE_PATTERN,
    TASK_TEMPLATE_CODE_MAX_LENGTH,
    operation === "adopt" ? "template.templateCode" : "templateCode",
    operation,
    traceId,
  );
  const version = inputValue(template, "version");
  if (!Number.isSafeInteger(version) || (version as number) < 1 || (version as number) > TASK_TEMPLATE_VERSION_MAX) {
    throw catalogError(
      "TASK_TEMPLATE_ARGUMENT_INVALID",
      operation === "adopt" ? "template.version" : "version",
      operation,
      traceId,
    );
  }
  return Object.freeze({ templateCode, version: version as number });
};

const normalizeFilter = <TValue extends string>(
  value: unknown,
  allowed: readonly TValue[] | undefined,
  validate: ((candidate: string) => boolean) | undefined,
  field: string,
  traceId: string,
): readonly TValue[] | undefined => {
  if (value === undefined) {
    return undefined;
  }
  try {
    if (
      !Array.isArray(value)
      || Object.getPrototypeOf(value) !== Array.prototype
      || value.length === 0
      || value.length > TASK_TEMPLATE_CATALOG_MAX_FILTER_VALUES
      || Reflect.ownKeys(value).length !== value.length + 1
    ) {
      throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", field, "list", traceId);
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
        || (allowed !== undefined && !allowed.includes(candidate as TValue))
        || (validate !== undefined && !validate(candidate))
      ) {
        throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", field, "list", traceId);
      }
      normalized.push(candidate as TValue);
    }
    if (new Set(normalized).size !== normalized.length) {
      throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", field, "list", traceId);
    }
    return Object.freeze(normalized);
  } catch (error) {
    if (error instanceof TaskTemplateCatalogError) {
      throw error;
    }
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", field, "list", traceId);
  }
};

const normalizeQuery = (
  value: unknown,
  traceId: string,
): TaskTemplateCatalogQuery => {
  const query = strictRecord(
    value,
    new Set([
      "categories",
      "cursor",
      "limit",
      "locale",
      "statuses",
      "verificationTypes",
      "walletCompatibility",
    ]),
    "query",
    "list",
    traceId,
  );
  const categories = normalizeFilter<string>(
    inputValue(query, "categories"),
    undefined,
    (candidate) => candidate.length <= 64 && CATEGORY_PATTERN.test(candidate),
    "categories",
    traceId,
  );
  const statuses = normalizeFilter<TaskTemplateCatalogStatus>(
    inputValue(query, "statuses"),
    CATALOG_STATUSES,
    undefined,
    "statuses",
    traceId,
  );
  const verificationTypes = normalizeFilter<VerificationType>(
    inputValue(query, "verificationTypes"),
    VERIFICATION_TYPES,
    undefined,
    "verificationTypes",
    traceId,
  );
  const walletCompatibility = normalizeFilter<WalletCompatibility>(
    inputValue(query, "walletCompatibility"),
    WALLET_COMPATIBILITIES,
    undefined,
    "walletCompatibility",
    traceId,
  );
  const cursor = inputValue(query, "cursor");
  if (
    cursor !== undefined
    && (typeof cursor !== "string" || cursor.length === 0 || cursor.length > CURSOR_MAX_LENGTH)
  ) {
    throw catalogError("TASK_TEMPLATE_CURSOR_INVALID", "cursor", "list", traceId);
  }
  const limit = inputValue(query, "limit");
  if (
    limit !== undefined
    && (
      !Number.isSafeInteger(limit)
      || (limit as number) < 1
      || (limit as number) > TASK_TEMPLATE_CATALOG_MAX_PAGE_SIZE
    )
  ) {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "limit", "list", traceId);
  }
  const locale = inputValue(query, "locale");
  if (locale !== undefined && (typeof locale !== "string" || locale.length > 35 || !LOCALE_PATTERN.test(locale))) {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "locale", "list", traceId);
  }
  return Object.freeze({
    ...(categories === undefined ? {} : { categories }),
    ...(cursor === undefined ? {} : { cursor: cursor as string }),
    ...(limit === undefined ? {} : { limit: limit as number }),
    ...(locale === undefined ? {} : { locale: locale as string }),
    ...(statuses === undefined ? {} : { statuses }),
    ...(verificationTypes === undefined ? {} : { verificationTypes }),
    ...(walletCompatibility === undefined ? {} : { walletCompatibility }),
  });
};

const roleGrants = (
  session: ResolvedWalletSessionAuthority,
  roleId: AuthSessionRoleId,
  capabilities: readonly AuthRoleCapabilityId[],
): boolean => session.roleIds.includes(roleId)
  && capabilities.every((capability) =>
    authSessionRolePolicyById[roleId].allowedCapabilities.includes(capability)
    && session.capabilities.includes(capability));

const sessionIsActive = (
  session: ResolvedWalletSessionAuthority,
  currentTime: Date,
): boolean => {
  const nowMs = currentTime.getTime();
  const idleMs = Date.parse(session.idleExpiresAt);
  const absoluteMs = Date.parse(session.absoluteExpiresAt);
  return session.credentialBoundary === "wallet-auth-cookie/v1"
    && Number.isFinite(nowMs)
    && Number.isFinite(idleMs)
    && Number.isFinite(absoluteMs)
    && idleMs <= absoluteMs
    && nowMs < idleMs
    && nowMs < absoluteMs;
};

const authorizationDenied = (
  operation: TaskTemplateCatalogOperation,
  traceId: string,
): never => {
  throw catalogError("TASK_TEMPLATE_NOT_FOUND", "resource", operation, traceId);
};

const resolveCurrentTime = (
  now: () => Date,
  operation: TaskTemplateCatalogOperation,
  traceId: string,
): Date => {
  try {
    const current = now();
    if (!(current instanceof Date) || !Number.isFinite(current.getTime())) {
      throw new Error("invalid clock");
    }
    return current;
  } catch {
    throw catalogError("TASK_TEMPLATE_CATALOG_UNAVAILABLE", "clock", operation, traceId);
  }
};

const readSession = (
  value: unknown,
  operation: TaskTemplateCatalogOperation,
  traceId: string,
  now: () => Date,
): ResolvedWalletSessionAuthority => {
  try {
    if (!isResolvedWalletSessionAuthority(value)) {
      return authorizationDenied(operation, traceId);
    }
    if (!sessionIsActive(value, resolveCurrentTime(now, operation, traceId))) {
      return authorizationDenied(operation, traceId);
    }
    return value;
  } catch (error) {
    if (error instanceof TaskTemplateCatalogError) {
      throw error;
    }
    return authorizationDenied(operation, traceId);
  }
};

const normalizeReadAuthority = (
  value: unknown,
  operation: Extract<TaskTemplateCatalogOperation, "detail" | "list">,
  traceId: string,
  now: () => Date,
): Readonly<{ historicalReadAllowed: boolean }> => {
  const authority = strictRecord(
    value,
    new Set(["kind", "session"]),
    "authority",
    operation,
    traceId,
  );
  const kind = inputValue(authority, "kind");
  const session = readSession(inputValue(authority, "session"), operation, traceId, now);
  if (kind === "owner" && roleGrants(session, "project_owner", ["campaign:read"])) {
    return Object.freeze({ historicalReadAllowed: false });
  }
  const adminRole = (["internal_operator", "review_operator"] as const).some((roleId) =>
    roleGrants(session, roleId, ["admin:review"]));
  if (kind === "admin" && adminRole) {
    return Object.freeze({ historicalReadAllowed: true });
  }
  return authorizationDenied(operation, traceId);
};

const normalizeOwnerAdoptionAuthority = (
  value: unknown,
  traceId: string,
  now: () => Date,
): Readonly<{ campaignId: string; session: ResolvedWalletSessionAuthority }> => {
  const authority = strictRecord(
    value,
    new Set(["campaignId", "kind", "session"]),
    "authority",
    "adopt",
    traceId,
  );
  const session = readSession(inputValue(authority, "session"), "adopt", traceId, now);
  if (
    inputValue(authority, "kind") !== "owner"
    || !roleGrants(session, "project_owner", ["campaign:write", "task:build"])
  ) {
    return authorizationDenied("adopt", traceId);
  }
  const campaignId = requiredString(
    inputValue(authority, "campaignId"),
    SAFE_IDENTIFIER_PATTERN,
    160,
    "campaignId",
    "adopt",
    traceId,
  );
  return Object.freeze({ campaignId, session });
};

const normalizeOverrides = (
  value: unknown,
  traceId: string,
): TaskTemplateAdoptionRequest["overrides"] => {
  if (value === undefined) {
    return undefined;
  }
  const overrides = strictRecord(
    value,
    new Set(["points", "required"]),
    "overrides",
    "adopt",
    traceId,
  );
  if (Reflect.ownKeys(overrides).length === 0) {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "overrides", "adopt", traceId);
  }
  const points = inputValue(overrides, "points");
  const required = inputValue(overrides, "required");
  if (points === undefined && required === undefined) {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "overrides", "adopt", traceId);
  }
  if (
    points !== undefined
    && (
      !Number.isSafeInteger(points)
      || (points as number) < 0
      || (points as number) > TASK_TEMPLATE_POINTS_MAX
    )
  ) {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "overrides.points", "adopt", traceId);
  }
  if (required !== undefined && typeof required !== "boolean") {
    throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "overrides.required", "adopt", traceId);
  }
  return Object.freeze({
    ...(points === undefined ? {} : { points: points as number }),
    ...(required === undefined ? {} : { required }),
  });
};

const mapStoreFailure = (
  error: unknown,
  operation: TaskTemplateCatalogOperation,
  traceId: string,
): never => {
  if (error instanceof TaskTemplateCatalogError) {
    if (error.operation === operation && error.traceId === traceId) {
      throw error;
    }
    throw catalogError("TASK_TEMPLATE_CORRUPT", "storeError", operation, traceId);
  }
  throw catalogError("TASK_TEMPLATE_CATALOG_UNAVAILABLE", "store", operation, traceId);
};

const callStore = async <TValue>(
  operation: TaskTemplateCatalogOperation,
  traceId: string,
  execute: () => Promise<TValue>,
): Promise<TValue> => {
  try {
    return await execute();
  } catch (error) {
    return mapStoreFailure(error, operation, traceId);
  }
};

const integrityFailure = (traceId: string): never => {
  throw catalogError("TASK_TEMPLATE_CORRUPT", "adoptionResult", "adopt", traceId);
};

const validateAdoptionResult = (
  value: TaskTemplateAdoptedTask,
  request: TaskTemplateAdoptionRequest,
  traceId: string,
): TaskTemplateCatalogAdoptResult => {
  try {
    const task = strictRecord(
      value,
      new Set([
        "campaignId",
        "createdAt",
        "evidenceRule",
        "points",
        "replayed",
        "required",
        "snapshot",
        "taskId",
        "templateChecksum",
        "templateCode",
        "templateVersion",
        "updatedAt",
        "verificationType",
        "walletCompatibility",
      ]),
      "adoptionResult",
      "adopt",
      traceId,
    );
    const snapshot = strictRecord(
      inputValue(task, "snapshot"),
      new Set([
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
      ]),
      "adoptionResult",
      "adopt",
      traceId,
    );
    const campaignId = inputValue(task, "campaignId");
    const taskId = inputValue(task, "taskId");
    const replayed = inputValue(task, "replayed");
    const templateCode = inputValue(task, "templateCode");
    const templateVersion = inputValue(task, "templateVersion");
    const templateChecksum = inputValue(task, "templateChecksum");
    if (
      campaignId !== request.campaignId
      || typeof taskId !== "string"
      || !SAFE_IDENTIFIER_PATTERN.test(taskId)
      || typeof replayed !== "boolean"
      || templateCode !== request.template.templateCode
      || templateVersion !== request.template.version
      || typeof templateChecksum !== "string"
      || !CHECKSUM_PATTERN.test(templateChecksum)
      || inputValue(snapshot, "version") !== TASK_TEMPLATE_SNAPSHOT_VERSION
      || inputValue(snapshot, "adoptionMode") !== "direct"
      || inputValue(snapshot, "templateCode") !== templateCode
      || inputValue(snapshot, "templateVersion") !== templateVersion
      || inputValue(snapshot, "templateChecksum") !== templateChecksum
      || inputValue(snapshot, "points") !== inputValue(task, "points")
      || inputValue(snapshot, "required") !== inputValue(task, "required")
      || inputValue(snapshot, "verificationType") !== inputValue(task, "verificationType")
      || inputValue(snapshot, "walletCompatibility") !== inputValue(task, "walletCompatibility")
    ) {
      return integrityFailure(traceId);
    }
    return Object.freeze({
      campaignId,
      replayed,
      status: "adopted" as const,
      taskId,
      template: Object.freeze({
        checksum: templateChecksum,
        templateCode,
        version: templateVersion,
      }),
      traceId,
    }) as TaskTemplateCatalogAdoptResult;
  } catch (error) {
    if (
      error instanceof TaskTemplateCatalogError
      && error.code === "TASK_TEMPLATE_CORRUPT"
      && error.field === "adoptionResult"
    ) {
      throw error;
    }
    return integrityFailure(traceId);
  }
};

export const createTaskTemplateCatalogService = ({
  now = () => new Date(),
  store,
}: CreateTaskTemplateCatalogServiceOptions): TaskTemplateCatalogService => {
  const list = async (rawCommand: TaskTemplateCatalogListCommand): Promise<TaskTemplateCatalogListResult> => {
    const traceId = resolveTraceId(safeInputTrace(rawCommand), "list");
    const command = strictRecord(
      rawCommand,
      new Set(["authority", "query", "traceId"]),
      "command",
      "list",
      traceId,
    );
    const authority = normalizeReadAuthority(inputValue(command, "authority"), "list", traceId, now);
    const query = normalizeQuery(inputValue(command, "query"), traceId);
    if (query.statuses?.some((status) => status !== "active") && !authority.historicalReadAllowed) {
      return authorizationDenied("list", traceId);
    }
    const page = await callStore("list", traceId, () => store.list(query, {
      historicalReadAllowed: authority.historicalReadAllowed,
      traceId,
    }));
    return Object.freeze({ page, status: "ok" as const, traceId });
  };

  const detail = async (
    rawCommand: TaskTemplateCatalogDetailCommand,
  ): Promise<TaskTemplateCatalogDetailResult> => {
    const traceId = resolveTraceId(safeInputTrace(rawCommand), "detail");
    const command = strictRecord(
      rawCommand,
      new Set(["authority", "template", "traceId"]),
      "command",
      "detail",
      traceId,
    );
    const authority = normalizeReadAuthority(inputValue(command, "authority"), "detail", traceId, now);
    const identity = normalizeTemplateIdentity(inputValue(command, "template"), "detail", traceId);
    const template = await callStore("detail", traceId, () => store.get(identity, {
      historicalReadAllowed: authority.historicalReadAllowed,
      traceId,
    }));
    if (template === null) {
      return authorizationDenied("detail", traceId);
    }
    if (
      template.templateCode !== identity.templateCode
      || template.version !== identity.version
      || !CHECKSUM_PATTERN.test(template.checksum)
    ) {
      throw catalogError("TASK_TEMPLATE_CORRUPT", "catalogResult", "detail", traceId);
    }
    return Object.freeze({ status: "ok" as const, template, traceId });
  };

  const adopt = async (
    rawCommand: TaskTemplateCatalogAdoptCommand,
  ): Promise<TaskTemplateCatalogAdoptResult> => {
    const traceId = resolveTraceId(safeInputTrace(rawCommand), "adopt");
    const command = strictRecord(
      rawCommand,
      new Set(["authority", "campaignId", "idempotencyKey", "overrides", "template", "traceId"]),
      "command",
      "adopt",
      traceId,
    );
    const campaignId = requiredString(
      inputValue(command, "campaignId"),
      SAFE_IDENTIFIER_PATTERN,
      160,
      "campaignId",
      "adopt",
      traceId,
    );
    const idempotencyKey = requiredString(
      inputValue(command, "idempotencyKey"),
      IDEMPOTENCY_KEY_PATTERN,
      TASK_TEMPLATE_ADOPTION_IDEMPOTENCY_KEY_MAX_LENGTH,
      "idempotencyKey",
      "adopt",
      traceId,
    );
    if (idempotencyKey.length < TASK_TEMPLATE_ADOPTION_IDEMPOTENCY_KEY_MIN_LENGTH) {
      throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", "idempotencyKey", "adopt", traceId);
    }
    const template = normalizeTemplateIdentity(inputValue(command, "template"), "adopt", traceId);
    const overrides = normalizeOverrides(inputValue(command, "overrides"), traceId);
    const authority = normalizeOwnerAdoptionAuthority(inputValue(command, "authority"), traceId, now);
    if (authority.campaignId !== campaignId) {
      return authorizationDenied("adopt", traceId);
    }
    const request = Object.freeze({
      campaignId,
      idempotencyKey,
      ...(overrides === undefined ? {} : { overrides }),
      template,
    });
    const task = await callStore("adopt", traceId, () => store.adopt(request, {
      ownerAddress: authority.session.subject.walletAddress,
      traceId,
    }));
    return validateAdoptionResult(task, request, traceId);
  };

  const close = async (rawCommand: TaskTemplateCatalogCloseCommand): Promise<void> => {
    const traceId = resolveTraceId(safeInputTrace(rawCommand), "close");
    strictRecord(rawCommand, new Set(["traceId"]), "command", "close", traceId);
    await callStore("close", traceId, () => store.close({ traceId }));
  };

  return Object.freeze({ adopt, close, detail, list });
};
