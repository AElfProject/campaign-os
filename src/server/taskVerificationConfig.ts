export const TASK_VERIFICATION_ENABLEMENT_ENV =
  "CAMPAIGN_OS_TASK_VERIFICATION_ENABLEMENT";
export const TASK_VERIFICATION_BINDINGS_JSON_ENV =
  "CAMPAIGN_OS_TASK_VERIFICATION_BINDINGS_JSON";
export const TASK_VERIFICATION_APPROVED_ENABLEMENT = "explicitly-enabled";

export const TASK_VERIFICATION_ENDPOINT_ENV_KEY =
  "CAMPAIGN_OS_TASK_VERIFICATION_ENDPOINT";
export const TASK_VERIFICATION_HEADER_ENV_KEY =
  "CAMPAIGN_OS_TASK_VERIFICATION_HEADER";
export const TASK_VERIFICATION_REQUEST_BODY_ENV_KEY =
  "CAMPAIGN_OS_TASK_VERIFICATION_REQUEST_BODY";
export const TASK_VERIFICATION_CREDENTIAL_ENV_KEY =
  "CAMPAIGN_OS_TASK_VERIFICATION_CREDENTIAL";

export const TASK_VERIFICATION_MAX_BINDINGS = 32;
export const TASK_VERIFICATION_CONFIG_JSON_MAX_BYTES = 65_536;
export const TASK_VERIFICATION_BINDING_ID_MAX_LENGTH = 64;
export const TASK_VERIFICATION_ENV_KEY_MAX_LENGTH = 128;
export const TASK_VERIFICATION_TIMEOUT_MS_MIN = 100;
export const TASK_VERIFICATION_TIMEOUT_MS_MAX = 30_000;
export const TASK_VERIFICATION_MAX_ATTEMPTS_MIN = 1;
export const TASK_VERIFICATION_MAX_ATTEMPTS_MAX = 5;
export const TASK_VERIFICATION_RESPONSE_MAX_BYTES_MIN = 1_024;
export const TASK_VERIFICATION_RESPONSE_MAX_BYTES_MAX = 1_048_576;

export type TaskVerificationEnvironment = "local" | "stage" | "production";
export type TaskVerificationType = "ON_CHAIN" | "DAPP_API";
export type TaskVerificationConfigStatus = "disabled" | "invalid" | "ready";

export type TaskVerificationConfigDiagnosticCode =
  | "TASK_VERIFICATION_ENABLEMENT_INVALID"
  | "TASK_VERIFICATION_ENVIRONMENT_INVALID"
  | "TASK_VERIFICATION_JSON_REQUIRED"
  | "TASK_VERIFICATION_JSON_TOO_LARGE"
  | "TASK_VERIFICATION_JSON_INVALID"
  | "TASK_VERIFICATION_SCHEMA_INVALID"
  | "TASK_VERIFICATION_UNKNOWN_FIELD"
  | "TASK_VERIFICATION_ENTRY_LIMIT_EXCEEDED"
  | "TASK_VERIFICATION_ID_INVALID"
  | "TASK_VERIFICATION_ID_CONFLICT"
  | "TASK_VERIFICATION_ENV_KEY_INVALID"
  | "TASK_VERIFICATION_TYPE_UNSUPPORTED"
  | "TASK_VERIFICATION_TIMEOUT_INVALID"
  | "TASK_VERIFICATION_MAX_ATTEMPTS_INVALID"
  | "TASK_VERIFICATION_RESPONSE_LIMIT_INVALID"
  | "TASK_VERIFICATION_MATERIAL_MISSING"
  | "TASK_VERIFICATION_ENDPOINT_POLICY_INVALID";

export interface TaskVerificationBinding {
  readonly bodyEnvKey: string;
  readonly credentialEnvKey: string;
  readonly endpointEnvKey: string;
  readonly headerEnvKey: string;
  readonly id: string;
  readonly maxAttempts: number;
  readonly maxResponseBytes: number;
  readonly timeoutMs: number;
  readonly verificationType: TaskVerificationType;
}

export interface TaskVerificationConfigDiagnostic {
  readonly code: TaskVerificationConfigDiagnosticCode;
  readonly field: string;
  readonly message: string;
  readonly severity: "error";
}

export interface TaskVerificationConfig {
  readonly bindings: readonly TaskVerificationBinding[];
  readonly diagnostics: readonly TaskVerificationConfigDiagnostic[];
  readonly enabled: boolean;
  readonly getBinding: (id: string) => TaskVerificationBinding | undefined;
  readonly status: TaskVerificationConfigStatus;
  readonly valid: boolean;
}

export interface TaskVerificationConfigInput {
  readonly bindingsJson?: string;
  readonly enablement?: string;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly environment: TaskVerificationEnvironment;
  readonly jsonParser?: (source: string) => unknown;
}

const bindingFields = Object.freeze([
  "bodyEnvKey",
  "credentialEnvKey",
  "endpointEnvKey",
  "headerEnvKey",
  "id",
  "maxAttempts",
  "maxResponseBytes",
  "timeoutMs",
  "verificationType",
] as const satisfies readonly (keyof TaskVerificationBinding)[]);
const bindingFieldSet = new Set<string>(bindingFields);

const diagnosticMessages: Readonly<Record<TaskVerificationConfigDiagnosticCode, string>> =
  Object.freeze({
    TASK_VERIFICATION_ENABLEMENT_INVALID:
      "Task verification enablement is invalid.",
    TASK_VERIFICATION_ENDPOINT_POLICY_INVALID:
      "Task verification endpoint policy is invalid.",
    TASK_VERIFICATION_ENTRY_LIMIT_EXCEEDED:
      "Task verification binding count exceeds the allowed limit.",
    TASK_VERIFICATION_ENVIRONMENT_INVALID:
      "Task verification environment is invalid.",
    TASK_VERIFICATION_ENV_KEY_INVALID:
      "Task verification material reference is invalid.",
    TASK_VERIFICATION_ID_CONFLICT:
      "Task verification binding identifiers must be unique.",
    TASK_VERIFICATION_ID_INVALID:
      "Task verification binding identifier is invalid.",
    TASK_VERIFICATION_JSON_INVALID:
      "Task verification binding JSON is invalid.",
    TASK_VERIFICATION_JSON_REQUIRED:
      "Task verification binding JSON is required when enabled.",
    TASK_VERIFICATION_JSON_TOO_LARGE:
      "Task verification binding JSON exceeds the allowed limit.",
    TASK_VERIFICATION_MATERIAL_MISSING:
      "Referenced task verification material is unavailable.",
    TASK_VERIFICATION_MAX_ATTEMPTS_INVALID:
      "Task verification attempt policy is invalid.",
    TASK_VERIFICATION_RESPONSE_LIMIT_INVALID:
      "Task verification response limit is invalid.",
    TASK_VERIFICATION_SCHEMA_INVALID:
      "Task verification binding schema is invalid.",
    TASK_VERIFICATION_TIMEOUT_INVALID:
      "Task verification timeout policy is invalid.",
    TASK_VERIFICATION_TYPE_UNSUPPORTED:
      "Task verification type is unsupported.",
    TASK_VERIFICATION_UNKNOWN_FIELD:
      "Task verification binding contains an unknown field.",
  });

class TaskVerificationConfigFailure extends Error {
  readonly code: TaskVerificationConfigDiagnosticCode;
  readonly field: string;

  constructor(code: TaskVerificationConfigDiagnosticCode, field: string) {
    super("Task verification runtime configuration is invalid.");
    this.name = "TaskVerificationConfigFailure";
    this.code = code;
    this.field = field;
  }
}

const fail = (
  code: TaskVerificationConfigDiagnosticCode,
  field: string,
): never => {
  throw new TaskVerificationConfigFailure(code, field);
};

const createDiagnostic = (
  code: TaskVerificationConfigDiagnosticCode,
  field: string,
): TaskVerificationConfigDiagnostic => Object.freeze({
  code,
  field,
  message: diagnosticMessages[code],
  severity: "error" as const,
});

const createConfig = (
  status: TaskVerificationConfigStatus,
  bindings: readonly TaskVerificationBinding[] = [],
  diagnostics: readonly TaskVerificationConfigDiagnostic[] = [],
): TaskVerificationConfig => {
  const frozenBindings = Object.freeze([...bindings]);
  const frozenDiagnostics = Object.freeze([...diagnostics]);
  const bindingById = new Map(
    frozenBindings.map((entry) => [entry.id, entry] as const),
  );
  const getBinding = Object.freeze((id: string) => bindingById.get(id));

  return Object.freeze({
    bindings: frozenBindings,
    diagnostics: frozenDiagnostics,
    enabled: status === "ready",
    getBinding,
    status,
    valid: status !== "invalid",
  });
};

const disabledConfig = () => createConfig("disabled");

const invalidConfig = (
  code: TaskVerificationConfigDiagnosticCode,
  field: string,
) => createConfig("invalid", [], [createDiagnostic(code, field)]);

const utf8ByteLength = (value: string): number =>
  new TextEncoder().encode(value).byteLength;

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const ownDataValue = (
  record: Record<string, unknown>,
  field: keyof TaskVerificationBinding,
): unknown => {
  const descriptor = Object.getOwnPropertyDescriptor(record, field);

  if (!descriptor?.enumerable || !("value" in descriptor)) {
    return fail("TASK_VERIFICATION_SCHEMA_INVALID", `bindings[].${field}`);
  }

  return descriptor.value;
};

const normalizeId = (value: unknown): string => {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > TASK_VERIFICATION_BINDING_ID_MAX_LENGTH
    || !/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(value)
  ) {
    return fail("TASK_VERIFICATION_ID_INVALID", "bindings[].id");
  }

  return value;
};

const normalizeEnvKey = (
  value: unknown,
  field: "bodyEnvKey" | "credentialEnvKey" | "endpointEnvKey" | "headerEnvKey",
): string => {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > TASK_VERIFICATION_ENV_KEY_MAX_LENGTH
    || !/^CAMPAIGN_OS_[A-Z0-9_]+$/.test(value)
  ) {
    return fail("TASK_VERIFICATION_ENV_KEY_INVALID", `bindings[].${field}`);
  }

  return value;
};

const normalizeVerificationType = (value: unknown): TaskVerificationType => {
  if (value !== "ON_CHAIN" && value !== "DAPP_API") {
    return fail("TASK_VERIFICATION_TYPE_UNSUPPORTED", "bindings[].verificationType");
  }

  return value;
};

const normalizeBoundedInteger = (
  value: unknown,
  minimum: number,
  maximum: number,
  code: TaskVerificationConfigDiagnosticCode,
  field: "maxAttempts" | "maxResponseBytes" | "timeoutMs",
): number => {
  if (
    typeof value !== "number"
    || !Number.isSafeInteger(value)
    || value < minimum
    || value > maximum
  ) {
    return fail(code, `bindings[].${field}`);
  }

  return value;
};

const normalizeBinding = (value: unknown): TaskVerificationBinding => {
  if (!isPlainRecord(value)) {
    return fail("TASK_VERIFICATION_SCHEMA_INVALID", "bindings[]");
  }

  const fields = Reflect.ownKeys(value);

  if (fields.some((field) => typeof field !== "string" || !bindingFieldSet.has(field))) {
    return fail("TASK_VERIFICATION_UNKNOWN_FIELD", "bindings[].unknownField");
  }

  if (fields.length !== bindingFields.length) {
    return fail("TASK_VERIFICATION_SCHEMA_INVALID", "bindings[]");
  }

  return Object.freeze({
    bodyEnvKey: normalizeEnvKey(ownDataValue(value, "bodyEnvKey"), "bodyEnvKey"),
    credentialEnvKey: normalizeEnvKey(
      ownDataValue(value, "credentialEnvKey"),
      "credentialEnvKey",
    ),
    endpointEnvKey: normalizeEnvKey(
      ownDataValue(value, "endpointEnvKey"),
      "endpointEnvKey",
    ),
    headerEnvKey: normalizeEnvKey(
      ownDataValue(value, "headerEnvKey"),
      "headerEnvKey",
    ),
    id: normalizeId(ownDataValue(value, "id")),
    maxAttempts: normalizeBoundedInteger(
      ownDataValue(value, "maxAttempts"),
      TASK_VERIFICATION_MAX_ATTEMPTS_MIN,
      TASK_VERIFICATION_MAX_ATTEMPTS_MAX,
      "TASK_VERIFICATION_MAX_ATTEMPTS_INVALID",
      "maxAttempts",
    ),
    maxResponseBytes: normalizeBoundedInteger(
      ownDataValue(value, "maxResponseBytes"),
      TASK_VERIFICATION_RESPONSE_MAX_BYTES_MIN,
      TASK_VERIFICATION_RESPONSE_MAX_BYTES_MAX,
      "TASK_VERIFICATION_RESPONSE_LIMIT_INVALID",
      "maxResponseBytes",
    ),
    timeoutMs: normalizeBoundedInteger(
      ownDataValue(value, "timeoutMs"),
      TASK_VERIFICATION_TIMEOUT_MS_MIN,
      TASK_VERIFICATION_TIMEOUT_MS_MAX,
      "TASK_VERIFICATION_TIMEOUT_INVALID",
      "timeoutMs",
    ),
    verificationType: normalizeVerificationType(
      ownDataValue(value, "verificationType"),
    ),
  });
};

const normalizeBindings = (value: unknown): readonly TaskVerificationBinding[] => {
  if (!Array.isArray(value) || value.length === 0) {
    return fail("TASK_VERIFICATION_SCHEMA_INVALID", TASK_VERIFICATION_BINDINGS_JSON_ENV);
  }

  if (value.length > TASK_VERIFICATION_MAX_BINDINGS) {
    return fail(
      "TASK_VERIFICATION_ENTRY_LIMIT_EXCEEDED",
      TASK_VERIFICATION_BINDINGS_JSON_ENV,
    );
  }

  const bindings: TaskVerificationBinding[] = [];
  const bindingIds = new Set<string>();

  for (const rawBinding of value) {
    const normalized = normalizeBinding(rawBinding);

    if (bindingIds.has(normalized.id)) {
      return fail("TASK_VERIFICATION_ID_CONFLICT", "bindings[].id");
    }

    bindingIds.add(normalized.id);
    bindings.push(normalized);
  }

  return Object.freeze(bindings);
};

const parseBindings = (
  source: string | undefined,
  jsonParser: (source: string) => unknown,
): readonly TaskVerificationBinding[] => {
  if (source === undefined || source.trim().length === 0) {
    return fail("TASK_VERIFICATION_JSON_REQUIRED", TASK_VERIFICATION_BINDINGS_JSON_ENV);
  }

  if (utf8ByteLength(source) > TASK_VERIFICATION_CONFIG_JSON_MAX_BYTES) {
    return fail("TASK_VERIFICATION_JSON_TOO_LARGE", TASK_VERIFICATION_BINDINGS_JSON_ENV);
  }

  let parsed: unknown;

  try {
    parsed = jsonParser(source);
  } catch {
    return fail("TASK_VERIFICATION_JSON_INVALID", TASK_VERIFICATION_BINDINGS_JSON_ENV);
  }

  return normalizeBindings(parsed);
};

const isLoopbackHostname = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase();

  if (
    normalized === "localhost"
    || normalized.endsWith(".localhost")
    || normalized === "::1"
    || normalized === "[::1]"
  ) {
    return true;
  }

  return /^127(?:\.\d{1,3}){3}$/.test(normalized);
};

const hasSafeEndpointPolicy = (
  endpoint: string,
  environment: TaskVerificationEnvironment,
): boolean => {
  let parsed: URL;

  try {
    parsed = new URL(endpoint);
  } catch {
    return false;
  }

  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:")
    || parsed.username.length > 0
    || parsed.password.length > 0
    || parsed.hash.length > 0
  ) {
    return false;
  }

  const loopback = isLoopbackHostname(parsed.hostname);

  return environment === "production"
    ? parsed.protocol === "https:" && !loopback
    : loopback;
};

const readRequiredMaterial = (
  env: Readonly<Record<string, string | undefined>>,
  key: string,
): string => {
  const material = env[key];

  if (typeof material !== "string" || material.length === 0) {
    return fail("TASK_VERIFICATION_MATERIAL_MISSING", "bindings[].material");
  }

  return material;
};

const validateMaterialPosture = (
  bindings: readonly TaskVerificationBinding[],
  env: Readonly<Record<string, string | undefined>>,
  environment: TaskVerificationEnvironment,
): void => {
  for (const binding of bindings) {
    const endpoint = readRequiredMaterial(env, binding.endpointEnvKey);

    readRequiredMaterial(env, binding.headerEnvKey);
    readRequiredMaterial(env, binding.bodyEnvKey);
    readRequiredMaterial(env, binding.credentialEnvKey);

    if (!hasSafeEndpointPolicy(endpoint, environment)) {
      fail("TASK_VERIFICATION_ENDPOINT_POLICY_INVALID", "bindings[].endpointEnvKey");
    }
  }
};

const resolveEnabledConfig = (
  input: TaskVerificationConfigInput,
): TaskVerificationConfig => {
  if (
    input.environment !== "local"
    && input.environment !== "stage"
    && input.environment !== "production"
  ) {
    return fail("TASK_VERIFICATION_ENVIRONMENT_INVALID", "environment");
  }

  const source = input.bindingsJson !== undefined
    ? input.bindingsJson
    : input.env[TASK_VERIFICATION_BINDINGS_JSON_ENV];
  const bindings = parseBindings(source, input.jsonParser ?? JSON.parse);

  validateMaterialPosture(bindings, input.env, input.environment);

  return createConfig("ready", bindings);
};

export const resolveTaskVerificationConfig = (
  input: TaskVerificationConfigInput,
): TaskVerificationConfig => {
  try {
    const enablement = input.enablement !== undefined
      ? input.enablement
      : input.env[TASK_VERIFICATION_ENABLEMENT_ENV];

    if (enablement === undefined || enablement === "" || enablement === "disabled") {
      return disabledConfig();
    }

    if (enablement !== TASK_VERIFICATION_APPROVED_ENABLEMENT) {
      return invalidConfig(
        "TASK_VERIFICATION_ENABLEMENT_INVALID",
        TASK_VERIFICATION_ENABLEMENT_ENV,
      );
    }

    return resolveEnabledConfig(input);
  } catch (error) {
    if (error instanceof TaskVerificationConfigFailure) {
      return invalidConfig(error.code, error.field);
    }

    return invalidConfig("TASK_VERIFICATION_SCHEMA_INVALID", "taskVerificationConfig");
  }
};
