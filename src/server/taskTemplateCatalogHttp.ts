import {
  TASK_TEMPLATE_CODE_MAX_LENGTH,
  TASK_TEMPLATE_POINTS_MAX,
  TASK_TEMPLATE_VERSION_MAX,
  type TaskTemplateCatalogStatus,
} from "../domain/taskTemplateCatalog";
import {
  isResolvedWalletSessionAuthority,
  type ResolvedWalletSessionAuthority,
} from "./walletAuthentication";
import {
  parseJsonWithUniqueObjectKeys,
} from "./serverRequestGuard";
import {
  TASK_TEMPLATE_ADOPTION_IDEMPOTENCY_KEY_MAX_LENGTH,
  TASK_TEMPLATE_ADOPTION_IDEMPOTENCY_KEY_MIN_LENGTH,
  TASK_TEMPLATE_CATALOG_MAX_FILTER_VALUES,
  TASK_TEMPLATE_CATALOG_MAX_PAGE_SIZE,
  TaskTemplateCatalogError,
  type TaskTemplateCatalogErrorCode,
  type TaskTemplateCatalogOperation,
  type TaskTemplateCatalogQuery,
} from "./taskTemplateCatalogStore";
import type {
  TaskTemplateCatalogAdoptResult,
  TaskTemplateCatalogReadAuthority,
  TaskTemplateCatalogService,
} from "./taskTemplateCatalogService";

export type TaskTemplateCatalogHttpRouteId =
  | "task-templates.list"
  | "task-templates.detail"
  | "campaigns.tasks.from-template";

export type TaskTemplateCatalogHttpAuthErrorCode =
  | "AUTH_SESSION_REQUIRED"
  | "AUTH_SESSION_INVALID"
  | "AUTH_FORBIDDEN"
  | "AUTH_CSRF_INVALID";

export type TaskTemplateCatalogHttpErrorCode =
  | TaskTemplateCatalogErrorCode
  | TaskTemplateCatalogHttpAuthErrorCode;

export interface TaskTemplateCatalogHttpErrorBody {
  readonly code: TaskTemplateCatalogHttpErrorCode;
  readonly details?: never;
  readonly field: string;
  readonly message?: never;
  readonly operation: Exclude<TaskTemplateCatalogOperation, "close">;
  readonly retryable: boolean;
  readonly status?: never;
}

export interface TaskTemplateCatalogHttpSuccessEnvelope<TData> {
  readonly data: TData;
  readonly error?: never;
  readonly ok: true;
  readonly runtime?: never;
  readonly safety?: never;
  readonly timestamp?: never;
  readonly traceId: string;
}

export interface TaskTemplateCatalogHttpFailureEnvelope {
  readonly data?: never;
  readonly error: TaskTemplateCatalogHttpErrorBody;
  readonly ok: false;
  readonly runtime?: never;
  readonly safety?: never;
  readonly timestamp?: never;
  readonly traceId: string;
}

export type TaskTemplateCatalogHttpEnvelope<TData = unknown> =
  | TaskTemplateCatalogHttpSuccessEnvelope<TData>
  | TaskTemplateCatalogHttpFailureEnvelope;

export interface TaskTemplateCatalogHttpResponse<TData = unknown> {
  readonly body: TaskTemplateCatalogHttpEnvelope<TData>;
  readonly headers: Readonly<Record<string, string>>;
  readonly status: number;
}

export interface TaskTemplateCatalogHttpRequest {
  readonly authority: ResolvedWalletSessionAuthority;
  readonly body?: unknown;
  readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  readonly params: Readonly<Record<string, string>>;
  readonly requestTarget: string;
  readonly routeId: TaskTemplateCatalogHttpRouteId;
  readonly traceId: string;
}

export interface TaskTemplateCatalogHttpHandler {
  handle(request: TaskTemplateCatalogHttpRequest): Promise<TaskTemplateCatalogHttpResponse>;
}

export interface CreateTaskTemplateCatalogHttpHandlerOptions {
  readonly service: TaskTemplateCatalogService;
}

export class TaskTemplateCatalogHttpAuthError extends Error {
  readonly code: TaskTemplateCatalogHttpAuthErrorCode;
  readonly field: string;
  readonly operation: Exclude<TaskTemplateCatalogOperation, "close">;
  readonly retryable = false;
  readonly traceId: string;

  constructor(options: {
    readonly code: TaskTemplateCatalogHttpAuthErrorCode;
    readonly field: string;
    readonly operation: Exclude<TaskTemplateCatalogOperation, "close">;
    readonly traceId: string;
  }) {
    super("Task template catalog authorization failed.");
    this.name = "TaskTemplateCatalogHttpAuthError";
    this.code = options.code;
    this.field = options.field;
    this.operation = options.operation;
    this.traceId = options.traceId;
    delete this.stack;
  }
}

const TRACE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const TEMPLATE_CODE_PATTERN = /^[a-z0-9][a-z0-9-]*$/u;
const CATEGORY_PATTERN = /^[a-z][a-z0-9-]*$/u;
const LOCALE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u;
const CONTENT_TYPE_PATTERN = /^application\/json(?:\s*;\s*charset=utf-8)?$/iu;
const MAX_ADOPTION_BODY_BYTES = 4_096;
const MAX_CURSOR_LENGTH = 2_048;
const MAX_LOCALE_LENGTH = 35;
const MAX_CATEGORY_LENGTH = 64;
const MAX_CATEGORY_QUERY_LENGTH = 512;
const MIN_CSRF_LENGTH = 16;
const MAX_CSRF_LENGTH = 512;

const LIST_QUERY_NAMES = new Set([
  "category",
  "cursor",
  "limit",
  "locale",
  "status",
  "verification",
  "wallet",
]);
const CATALOG_STATUSES = new Set(["active", "deprecated", "retired"] as const);
const VERIFICATION_TYPES = new Set(["WALLET", "ON_CHAIN", "DAPP_API", "SOCIAL", "MANUAL"] as const);
const WALLET_COMPATIBILITIES = new Set(["ANY", "AA_ONLY", "EOA_ONLY"] as const);
const SAFE_FIELD_PATTERN = /^[A-Za-z][A-Za-z0-9_.\[\]-]{0,127}$/u;

const operationForRoute = (
  routeId: TaskTemplateCatalogHttpRouteId,
): Exclude<TaskTemplateCatalogOperation, "close"> => routeId === "task-templates.list"
  ? "list"
  : routeId === "task-templates.detail"
    ? "detail"
    : "adopt";

const catalogError = (
  code: TaskTemplateCatalogErrorCode,
  field: string,
  operation: Exclude<TaskTemplateCatalogOperation, "close">,
  traceId: string,
) => new TaskTemplateCatalogError({ code, field, operation, traceId });

const invalidArgument = (
  field: string,
  operation: Exclude<TaskTemplateCatalogOperation, "close">,
  traceId: string,
): never => {
  throw catalogError("TASK_TEMPLATE_ARGUMENT_INVALID", field, operation, traceId);
};

const responseHeaders = (traceId: string): Readonly<Record<string, string>> => Object.freeze({
  "content-type": "application/json; charset=utf-8",
  "x-trace-id": traceId,
});

const success = <TData>(
  data: TData,
  status: number,
  traceId: string,
): TaskTemplateCatalogHttpResponse<TData> => Object.freeze({
  body: Object.freeze({ data, ok: true as const, traceId }),
  headers: responseHeaders(traceId),
  status,
});

const statusForCatalogCode = (code: TaskTemplateCatalogErrorCode): number => {
  switch (code) {
    case "TASK_TEMPLATE_ARGUMENT_INVALID":
    case "TASK_TEMPLATE_CURSOR_INVALID":
      return 400;
    case "TASK_TEMPLATE_NOT_FOUND":
      return 404;
    case "TASK_TEMPLATE_ADOPTION_CONFLICT":
      return 409;
    case "TASK_TEMPLATE_STALE":
    case "TASK_TEMPLATE_ADOPTION_DEFERRED":
    case "TASK_TEMPLATE_MANUAL_REVIEW_REQUIRED":
    case "TASK_TEMPLATE_POLICY_MISMATCH":
      return 422;
    case "TASK_TEMPLATE_CORRUPT":
    case "TASK_TEMPLATE_SCHEMA_NOT_READY":
    case "TASK_TEMPLATE_CATALOG_UNAVAILABLE":
    case "TASK_TEMPLATE_CLOSED":
    case "TASK_TEMPLATE_CLEANUP_FAILED":
      return 503;
  }
};

const statusForAuthCode = (code: TaskTemplateCatalogHttpAuthErrorCode): number => {
  if (code === "AUTH_SESSION_REQUIRED" || code === "AUTH_SESSION_INVALID") {
    return 401;
  }
  return 403;
};

const failure = ({
  code,
  field,
  operation,
  retryable,
  status,
  traceId,
}: {
  readonly code: TaskTemplateCatalogHttpErrorCode;
  readonly field: string;
  readonly operation: Exclude<TaskTemplateCatalogOperation, "close">;
  readonly retryable: boolean;
  readonly status: number;
  readonly traceId: string;
}): TaskTemplateCatalogHttpResponse => Object.freeze({
  body: Object.freeze({
    error: Object.freeze({ code, field, operation, retryable }),
    ok: false as const,
    traceId,
  }),
  headers: responseHeaders(traceId),
  status,
});

export const createTaskTemplateCatalogHttpFailure = ({
  code,
  field,
  operation,
  traceId,
}: {
  readonly code: TaskTemplateCatalogHttpErrorCode;
  readonly field: string;
  readonly operation: Exclude<TaskTemplateCatalogOperation, "close">;
  readonly traceId: string;
}): TaskTemplateCatalogHttpResponse => {
  const safeTraceId = TRACE_ID_PATTERN.test(traceId) ? traceId : "task-template-catalog-http";
  const safeField = SAFE_FIELD_PATTERN.test(field) ? field : "request";
  if (code.startsWith("AUTH_")) {
    return failure({
      code: code as TaskTemplateCatalogHttpAuthErrorCode,
      field: safeField,
      operation,
      retryable: false,
      status: statusForAuthCode(code as TaskTemplateCatalogHttpAuthErrorCode),
      traceId: safeTraceId,
    });
  }
  const catalogCode = code as TaskTemplateCatalogErrorCode;
  return failure({
    code: catalogCode,
    field: safeField,
    operation,
    retryable: new Set<TaskTemplateCatalogErrorCode>([
      "TASK_TEMPLATE_CATALOG_UNAVAILABLE",
      "TASK_TEMPLATE_CLEANUP_FAILED",
      "TASK_TEMPLATE_SCHEMA_NOT_READY",
    ]).has(catalogCode),
    status: statusForCatalogCode(catalogCode),
    traceId: safeTraceId,
  });
};

const normalizeFailure = (
  error: unknown,
  operation: Exclude<TaskTemplateCatalogOperation, "close">,
  traceId: string,
): TaskTemplateCatalogHttpResponse => {
  if (
    error instanceof TaskTemplateCatalogError
    && error.operation === operation
    && error.traceId === traceId
  ) {
    return createTaskTemplateCatalogHttpFailure({
      code: error.code,
      field: error.field,
      operation,
      traceId,
    });
  }
  if (
    error instanceof TaskTemplateCatalogHttpAuthError
    && error.operation === operation
    && error.traceId === traceId
  ) {
    return createTaskTemplateCatalogHttpFailure({
      code: error.code,
      field: error.field,
      operation,
      traceId,
    });
  }
  return createTaskTemplateCatalogHttpFailure({
    code: "TASK_TEMPLATE_CATALOG_UNAVAILABLE",
    field: "runtime",
    operation,
    traceId,
  });
};

const captureHeader = (
  headers: TaskTemplateCatalogHttpRequest["headers"],
  name: string,
  operation: Exclude<TaskTemplateCatalogOperation, "close">,
  traceId: string,
): string | undefined => {
  let captured: string | undefined;
  try {
    for (const [rawName, rawValue] of Object.entries(headers)) {
      if (rawName.trim().toLowerCase() !== name) {
        continue;
      }
      if (captured !== undefined || typeof rawValue !== "string") {
        return invalidArgument(name, operation, traceId);
      }
      captured = rawValue.trim();
    }
  } catch {
    return invalidArgument("headers", operation, traceId);
  }
  return captured;
};

const parseCommaSeparated = <TValue extends string>(
  value: string | undefined,
  allowed: ReadonlySet<TValue> | undefined,
  field: string,
  pattern: RegExp | undefined,
  maxLength: number,
  maxItems: number,
  traceId: string,
): readonly TValue[] | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value.length === 0 || value.length > maxLength * maxItems) {
    return invalidArgument(field, "list", traceId);
  }
  const values = value.split(",");
  if (
    values.length === 0
    || values.length > maxItems
    || new Set(values).size !== values.length
    || values.some((item) =>
      item.length === 0
      || item.length > maxLength
      || (allowed !== undefined && !allowed.has(item as TValue))
      || (pattern !== undefined && !pattern.test(item)))
  ) {
    return invalidArgument(field, "list", traceId);
  }
  return Object.freeze(values as TValue[]);
};

const parseCatalogStatus = (
  value: string | undefined,
  traceId: string,
): readonly TaskTemplateCatalogStatus[] | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (!CATALOG_STATUSES.has(value as TaskTemplateCatalogStatus)) {
    return invalidArgument("status", "list", traceId);
  }
  return Object.freeze([value as TaskTemplateCatalogStatus]);
};

const parseListQuery = (
  requestTarget: string,
  traceId: string,
): TaskTemplateCatalogQuery => {
  let url: URL;
  try {
    url = new URL(requestTarget, "http://campaign-os.invalid");
  } catch {
    return invalidArgument("requestTarget", "list", traceId);
  }
  const query = new Map<string, string>();
  for (const [name, value] of url.searchParams.entries()) {
    if (!LIST_QUERY_NAMES.has(name) || query.has(name)) {
      return invalidArgument("query", "list", traceId);
    }
    query.set(name, value);
  }

  const rawCategories = query.get("category");
  if (rawCategories !== undefined && rawCategories.length > MAX_CATEGORY_QUERY_LENGTH) {
    return invalidArgument("category", "list", traceId);
  }
  const categories = parseCommaSeparated(
    rawCategories,
    undefined,
    "category",
    CATEGORY_PATTERN,
    MAX_CATEGORY_LENGTH,
    TASK_TEMPLATE_CATALOG_MAX_FILTER_VALUES,
    traceId,
  );
  const verificationTypes = parseCommaSeparated(
    query.get("verification"),
    VERIFICATION_TYPES,
    "verification",
    undefined,
    16,
    8,
    traceId,
  );
  const walletCompatibility = parseCommaSeparated(
    query.get("wallet"),
    WALLET_COMPATIBILITIES,
    "wallet",
    undefined,
    8,
    3,
    traceId,
  );
  const statuses = parseCatalogStatus(query.get("status"), traceId);
  const locale = query.get("locale");
  if (
    locale !== undefined
    && (locale.length > MAX_LOCALE_LENGTH || !LOCALE_PATTERN.test(locale))
  ) {
    return invalidArgument("locale", "list", traceId);
  }
  const cursor = query.get("cursor");
  if (cursor !== undefined && (cursor.length === 0 || cursor.length > MAX_CURSOR_LENGTH)) {
    return invalidArgument("cursor", "list", traceId);
  }
  const rawLimit = query.get("limit");
  let limit: number | undefined;
  if (rawLimit !== undefined) {
    if (!/^(?:[1-9]|[1-9][0-9]|100)$/u.test(rawLimit)) {
      return invalidArgument("limit", "list", traceId);
    }
    limit = Number(rawLimit);
    if (!Number.isSafeInteger(limit) || limit > TASK_TEMPLATE_CATALOG_MAX_PAGE_SIZE) {
      return invalidArgument("limit", "list", traceId);
    }
  }

  return Object.freeze({
    ...(categories === undefined ? {} : { categories }),
    ...(cursor === undefined ? {} : { cursor }),
    ...(limit === undefined ? {} : { limit }),
    ...(locale === undefined ? {} : { locale }),
    ...(statuses === undefined ? {} : { statuses }),
    ...(verificationTypes === undefined ? {} : { verificationTypes }),
    ...(walletCompatibility === undefined ? {} : { walletCompatibility }),
  });
};

const readAuthority = (
  session: ResolvedWalletSessionAuthority,
  operation: "detail" | "list",
  traceId: string,
): TaskTemplateCatalogReadAuthority => {
  if (!isResolvedWalletSessionAuthority(session)) {
    throw new TaskTemplateCatalogHttpAuthError({
      code: "AUTH_SESSION_INVALID",
      field: "session",
      operation,
      traceId,
    });
  }
  if (
    session.roleIds.includes("project_owner")
    && session.capabilities.includes("campaign:read")
  ) {
    return Object.freeze({ kind: "owner" as const, session });
  }
  if (
    session.capabilities.includes("admin:review")
    && session.roleIds.some((role) => role === "internal_operator" || role === "review_operator")
  ) {
    return Object.freeze({ kind: "admin" as const, session });
  }
  throw new TaskTemplateCatalogHttpAuthError({
    code: "AUTH_FORBIDDEN",
    field: "authorization",
    operation,
    traceId,
  });
};

const authorizeListQuery = (
  authority: TaskTemplateCatalogReadAuthority,
  query: TaskTemplateCatalogQuery,
  traceId: string,
): TaskTemplateCatalogReadAuthority => {
  if (
    authority.kind === "owner"
    && query.statuses?.some((status) => status !== "active")
  ) {
    throw new TaskTemplateCatalogHttpAuthError({
      code: "AUTH_FORBIDDEN",
      field: "authorization",
      operation: "list",
      traceId,
    });
  }
  return authority;
};

const parseTemplateIdentity = (
  params: TaskTemplateCatalogHttpRequest["params"],
  operation: "detail",
  traceId: string,
) => {
  const templateCode = params.templateCode;
  const rawVersion = params.version;
  if (
    typeof templateCode !== "string"
    || templateCode.length === 0
    || templateCode.length > TASK_TEMPLATE_CODE_MAX_LENGTH
    || !TEMPLATE_CODE_PATTERN.test(templateCode)
  ) {
    return invalidArgument("templateCode", operation, traceId);
  }
  if (typeof rawVersion !== "string" || !/^[1-9][0-9]*$/u.test(rawVersion)) {
    return invalidArgument("version", operation, traceId);
  }
  const version = Number(rawVersion);
  if (!Number.isSafeInteger(version) || version > TASK_TEMPLATE_VERSION_MAX) {
    return invalidArgument("version", operation, traceId);
  }
  return Object.freeze({ templateCode, version });
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> => value !== null
  && typeof value === "object"
  && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

const exactKeys = (
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  required: ReadonlySet<string>,
): boolean => {
  const keys = Reflect.ownKeys(value);
  return keys.every((key) => typeof key === "string" && allowed.has(key))
    && [...required].every((key) => Object.prototype.hasOwnProperty.call(value, key));
};

const ownValue = (record: Record<string, unknown>, key: string): unknown =>
  Object.getOwnPropertyDescriptor(record, key)?.value;

const parseAdoptionBody = (
  body: unknown,
  traceId: string,
) => {
  if (typeof body !== "string" || Buffer.byteLength(body, "utf8") > MAX_ADOPTION_BODY_BYTES) {
    return invalidArgument("body", "adopt", traceId);
  }
  const parsed = parseJsonWithUniqueObjectKeys(body);
  if (!parsed.ok || !isPlainRecord(parsed.value)) {
    return invalidArgument("body", "adopt", traceId);
  }
  const root = parsed.value;
  if (!exactKeys(root, new Set(["overrides", "template"]), new Set(["template"]))) {
    return invalidArgument("body", "adopt", traceId);
  }
  const template = ownValue(root, "template");
  if (
    !isPlainRecord(template)
    || !exactKeys(template, new Set(["templateCode", "version"]), new Set(["templateCode", "version"]))
  ) {
    return invalidArgument("template", "adopt", traceId);
  }
  const templateCode = ownValue(template, "templateCode");
  const version = ownValue(template, "version");
  if (
    typeof templateCode !== "string"
    || templateCode.length === 0
    || templateCode.length > TASK_TEMPLATE_CODE_MAX_LENGTH
    || !TEMPLATE_CODE_PATTERN.test(templateCode)
    || !Number.isSafeInteger(version)
    || (version as number) < 1
    || (version as number) > TASK_TEMPLATE_VERSION_MAX
  ) {
    return invalidArgument("template", "adopt", traceId);
  }

  const rawOverrides = ownValue(root, "overrides");
  let overrides: Readonly<{ points?: number; required?: boolean }> | undefined;
  if (rawOverrides !== undefined) {
    if (
      !isPlainRecord(rawOverrides)
      || !exactKeys(rawOverrides, new Set(["points", "required"]), new Set())
      || Reflect.ownKeys(rawOverrides).length === 0
    ) {
      return invalidArgument("overrides", "adopt", traceId);
    }
    const points = ownValue(rawOverrides, "points");
    const required = ownValue(rawOverrides, "required");
    if (
      (points !== undefined && (
        !Number.isSafeInteger(points)
        || (points as number) < 0
        || (points as number) > TASK_TEMPLATE_POINTS_MAX
      ))
      || (required !== undefined && typeof required !== "boolean")
    ) {
      return invalidArgument("overrides", "adopt", traceId);
    }
    overrides = Object.freeze({
      ...(points === undefined ? {} : { points: points as number }),
      ...(required === undefined ? {} : { required }),
    });
  }
  return Object.freeze({
    ...(overrides === undefined ? {} : { overrides }),
    template: Object.freeze({ templateCode, version: version as number }),
  });
};

const parseCampaignId = (
  value: string | undefined,
  traceId: string,
): string => {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > 128
    || !SAFE_IDENTIFIER_PATTERN.test(value)
  ) {
    return invalidArgument("campaignId", "adopt", traceId);
  }
  return value;
};

const validateAdoptionHeaders = (
  headers: TaskTemplateCatalogHttpRequest["headers"],
  traceId: string,
) => {
  const contentType = captureHeader(headers, "content-type", "adopt", traceId);
  const idempotencyKey = captureHeader(headers, "idempotency-key", "adopt", traceId);
  const csrf = captureHeader(headers, "x-csrf-token", "adopt", traceId);
  if (!contentType || !CONTENT_TYPE_PATTERN.test(contentType)) {
    return invalidArgument("content-type", "adopt", traceId);
  }
  if (
    !idempotencyKey
    || idempotencyKey.length < TASK_TEMPLATE_ADOPTION_IDEMPOTENCY_KEY_MIN_LENGTH
    || idempotencyKey.length > TASK_TEMPLATE_ADOPTION_IDEMPOTENCY_KEY_MAX_LENGTH
    || !SAFE_IDENTIFIER_PATTERN.test(idempotencyKey)
  ) {
    return invalidArgument("idempotency-key", "adopt", traceId);
  }
  if (!csrf || csrf.length < MIN_CSRF_LENGTH || csrf.length > MAX_CSRF_LENGTH) {
    throw new TaskTemplateCatalogHttpAuthError({
      code: "AUTH_CSRF_INVALID",
      field: "x-csrf-token",
      operation: "adopt",
      traceId,
    });
  }
  return Object.freeze({ idempotencyKey });
};

const adoptionAuthority = (
  session: ResolvedWalletSessionAuthority,
  campaignId: string,
  traceId: string,
) => {
  if (!isResolvedWalletSessionAuthority(session)) {
    throw new TaskTemplateCatalogHttpAuthError({
      code: "AUTH_SESSION_INVALID",
      field: "session",
      operation: "adopt",
      traceId,
    });
  }
  if (
    !session.roleIds.includes("project_owner")
    || !session.capabilities.includes("campaign:write")
    || !session.capabilities.includes("task:build")
  ) {
    throw new TaskTemplateCatalogHttpAuthError({
      code: "AUTH_FORBIDDEN",
      field: "authorization",
      operation: "adopt",
      traceId,
    });
  }
  return Object.freeze({ campaignId, kind: "owner" as const, session });
};

const adoptionData = (result: TaskTemplateCatalogAdoptResult) => Object.freeze({
  campaignId: result.campaignId,
  replayed: result.replayed,
  taskId: result.taskId,
  templateChecksum: result.template.checksum,
  templateCode: result.template.templateCode,
  templateVersion: result.template.version,
});

export const isTaskTemplateCatalogHttpRouteId = (
  value: string,
): value is TaskTemplateCatalogHttpRouteId => value === "task-templates.list"
  || value === "task-templates.detail"
  || value === "campaigns.tasks.from-template";

export const createTaskTemplateCatalogHttpHandler = ({
  service,
}: CreateTaskTemplateCatalogHttpHandlerOptions): TaskTemplateCatalogHttpHandler => {
  if (
    service === null
    || typeof service !== "object"
    || typeof service.adopt !== "function"
    || typeof service.detail !== "function"
    || typeof service.list !== "function"
  ) {
    throw new TypeError("Task template catalog HTTP service is invalid.");
  }

  return Object.freeze({
    handle: async (request: TaskTemplateCatalogHttpRequest) => {
      const operation = operationForRoute(request.routeId);
      const traceId = TRACE_ID_PATTERN.test(request.traceId)
        ? request.traceId
        : "task-template-catalog-http";
      try {
        if (request.routeId === "task-templates.list") {
          const authority = readAuthority(request.authority, "list", traceId);
          const query = parseListQuery(request.requestTarget, traceId);
          const result = await service.list({
            authority: authorizeListQuery(authority, query, traceId),
            query,
            traceId,
          });
          return success(result.page, 200, traceId);
        }
        if (request.routeId === "task-templates.detail") {
          if (new URL(request.requestTarget, "http://campaign-os.invalid").search.length > 0) {
            return invalidArgument("query", "detail", traceId);
          }
          const result = await service.detail({
            authority: readAuthority(request.authority, "detail", traceId),
            template: parseTemplateIdentity(request.params, "detail", traceId),
            traceId,
          });
          return success(result.template, 200, traceId);
        }

        if (new URL(request.requestTarget, "http://campaign-os.invalid").search.length > 0) {
          return invalidArgument("query", "adopt", traceId);
        }
        const campaignId = parseCampaignId(request.params.campaignId, traceId);
        const { idempotencyKey } = validateAdoptionHeaders(request.headers, traceId);
        const parsed = parseAdoptionBody(request.body, traceId);
        const result = await service.adopt({
          authority: adoptionAuthority(request.authority, campaignId, traceId),
          campaignId,
          idempotencyKey,
          ...(parsed.overrides === undefined ? {} : { overrides: parsed.overrides }),
          template: parsed.template,
          traceId,
        });
        return success(adoptionData(result), result.replayed ? 200 : 201, traceId);
      } catch (error) {
        return normalizeFailure(error, operation, traceId);
      }
    },
  });
};
