import type { LocalizedText } from "../domain/types";

export type ApiRuntimeErrorCode =
  | "ROUTE_NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "MALFORMED_JSON"
  | "AUTH_SESSION_REQUIRED"
  | "AUTH_SESSION_INVALID"
  | "AUTH_FORBIDDEN"
  | "AUTH_SUBJECT_MISMATCH"
  | "INVALID_REQUEST"
  | "INVALID_CAMPAIGN"
  | "INVALID_TASK"
  | "UNSUPPORTED_LOCALE"
  | "UNSUPPORTED_EXPORT_MODE"
  | "PERSISTENCE_UNAVAILABLE"
  | "INTERNAL_RUNTIME_ERROR";

export interface ApiRuntimeErrorBody {
  code: ApiRuntimeErrorCode;
  details?: Record<string, unknown>;
  message: LocalizedText;
  status: number;
}

export class ApiRuntimeError extends Error {
  readonly body: ApiRuntimeErrorBody;

  constructor(body: ApiRuntimeErrorBody) {
    super(body.message["en-US"]);
    this.body = body;
  }
}

const text = (enUS: string, zhCN: string, zhTW = enUS): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
});

const runtimeError = (
  code: ApiRuntimeErrorCode,
  status: number,
  enUS: string,
  zhCN: string,
  details?: Record<string, unknown>,
): ApiRuntimeError =>
  new ApiRuntimeError({
    code,
    details,
    message: text(enUS, zhCN),
    status,
  });

export const routeNotFound = (method: string, path: string) =>
  runtimeError(
    "ROUTE_NOT_FOUND",
    404,
    "The requested Campaign OS API route is not available in the local seeded runtime.",
    "本地 seeded runtime 不支持请求的 Campaign OS API route。",
    { method, path },
  );

export const methodNotAllowed = (method: string, path: string, allowedMethods: readonly string[]) =>
  runtimeError(
    "METHOD_NOT_ALLOWED",
    405,
    "The requested method is not allowed for this Campaign OS API route.",
    "该 Campaign OS API route 不允许使用当前请求方法。",
    { allowedMethods, method, path },
  );

export const malformedJson = () =>
  runtimeError(
    "MALFORMED_JSON",
    400,
    "The request body must be valid JSON.",
    "请求 body 必须是有效 JSON。",
  );

export const invalidRequest = (field: string, reason: string) =>
  runtimeError(
    "INVALID_REQUEST",
    400,
    "The request does not match the local Campaign OS API contract.",
    "请求不符合本地 Campaign OS API contract。",
    { field, reason },
  );

export const authSessionRequired = (details?: Record<string, unknown>) =>
  runtimeError(
    "AUTH_SESSION_REQUIRED",
    401,
    "A local Campaign OS auth session is required for this route.",
    "该 Campaign OS route 需要本地 auth session。",
    details,
  );

export const authSessionInvalid = (details?: Record<string, unknown>) =>
  runtimeError(
    "AUTH_SESSION_INVALID",
    401,
    "The local Campaign OS auth session is invalid.",
    "本地 Campaign OS auth session 无效。",
    details,
  );

export const authForbidden = (details?: Record<string, unknown>) =>
  runtimeError(
    "AUTH_FORBIDDEN",
    403,
    "The local Campaign OS auth session is not allowed to perform this action.",
    "本地 Campaign OS auth session 无权执行该操作。",
    details,
  );

export const authSubjectMismatch = (details?: Record<string, unknown>) =>
  runtimeError(
    "AUTH_SUBJECT_MISMATCH",
    403,
    "The participant compatibility subject does not match the issued wallet session.",
    "Participant compatibility subject 与已签发 wallet session 不一致。",
    details,
  );

export const invalidCampaign = (campaignId: string) =>
  runtimeError(
    "INVALID_CAMPAIGN",
    404,
    "The requested campaign is not available in the seeded local runtime.",
    "本地 seeded runtime 中不存在请求的活动。",
    { campaignId },
  );

export const invalidTask = (taskId: string) =>
  runtimeError(
    "INVALID_TASK",
    404,
    "The requested task is not available in the seeded local runtime.",
    "本地 seeded runtime 中不存在请求的任务。",
    { taskId },
  );

export const unsupportedLocale = (locale: string) =>
  runtimeError(
    "UNSUPPORTED_LOCALE",
    400,
    "The requested locale is not supported by the local runtime endpoint.",
    "本地 runtime endpoint 不支持请求的语言。",
    { locale },
  );

export const unsupportedExportMode = (mode: string) =>
  runtimeError(
    "UNSUPPORTED_EXPORT_MODE",
    400,
    "The requested export mode is not supported by the local preview runtime.",
    "本地预览 runtime 不支持请求的导出模式。",
    { mode },
  );

export const persistenceUnavailable = (operation: string) =>
  runtimeError(
    "PERSISTENCE_UNAVAILABLE",
    503,
    "The local Campaign OS persistence boundary is unavailable.",
    "本地 Campaign OS 持久化边界当前不可用。",
    { operation },
  );

export const internalRuntimeError = () =>
  runtimeError(
    "INTERNAL_RUNTIME_ERROR",
    500,
    "The local Campaign OS API runtime could not complete the request.",
    "本地 Campaign OS API runtime 无法完成该请求。",
  );

export const toApiRuntimeErrorBody = (error: unknown): ApiRuntimeErrorBody =>
  error instanceof ApiRuntimeError ? error.body : internalRuntimeError().body;
