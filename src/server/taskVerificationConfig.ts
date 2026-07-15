import {
  TASK_VERIFICATION_EXTERNAL_DISPATCH_LIMIT,
  TASK_VERIFICATION_MAX_OWNERSHIP_ATTEMPTS,
  TASK_VERIFICATION_MAX_REVISION,
  type TaskVerificationEvidenceSource,
} from "./taskVerification";
import { validateProviderHttpVerificationBindingCompatibility } from "./providerHttpRuntimeRegistry";
import type {
  ProviderHttpBindingCompatibilityInput,
  ProviderHttpProviderFamily,
} from "./providerHttpRuntimeTypes";

export { TASK_VERIFICATION_EXTERNAL_DISPATCH_LIMIT };

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
export const TASK_VERIFICATION_PROVIDER_REFERENCE_MAX_LENGTH = 160;
export const TASK_VERIFICATION_TIMEOUT_MS_MIN = 100;
export const TASK_VERIFICATION_TIMEOUT_MS_MAX = 10_000;
export const TASK_VERIFICATION_DEFAULT_TIMEOUT_MS = 2_500;
export const TASK_VERIFICATION_MAX_ATTEMPTS_MIN = 1;
export const TASK_VERIFICATION_MAX_ATTEMPTS_MAX =
  TASK_VERIFICATION_MAX_OWNERSHIP_ATTEMPTS;
export const TASK_VERIFICATION_DEFAULT_MAX_ATTEMPTS =
  TASK_VERIFICATION_MAX_OWNERSHIP_ATTEMPTS;
export const TASK_VERIFICATION_RESPONSE_MAX_BYTES_MIN = 1_024;
export const TASK_VERIFICATION_RESPONSE_MAX_BYTES_MAX = 256 * 1024;
export const TASK_VERIFICATION_DEFAULT_RESPONSE_MAX_BYTES = 256 * 1024;

export type TaskVerificationEnvironment = "local" | "stage" | "production";
export type TaskVerificationType = "ON_CHAIN" | "DAPP_API";
export type TaskVerificationConfigStatus = "disabled" | "invalid" | "ready";
export type TaskVerificationDegradationPolicy = "blocked" | "manual_review" | "pending";

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
  | "TASK_VERIFICATION_ENDPOINT_POLICY_INVALID"
  | "TASK_VERIFICATION_BINDING_ENABLEMENT_INVALID"
  | "TASK_VERIFICATION_BINDING_REVISION_INVALID"
  | "TASK_VERIFICATION_DEGRADATION_POLICY_INVALID"
  | "TASK_VERIFICATION_EVIDENCE_SOURCE_INVALID"
  | "TASK_VERIFICATION_PROVIDER_REFERENCE_INVALID"
  | "TASK_VERIFICATION_REGISTRY_INCOMPATIBLE"
  | "TASK_VERIFICATION_STRATEGY_CONFLICT";

export interface TaskVerificationBinding {
  readonly bodyEnvKey?: string;
  readonly credentialEnvKey?: string;
  readonly degradationPolicy: TaskVerificationDegradationPolicy;
  readonly enabled: boolean;
  readonly endpointEnvKey: string;
  readonly endpointId: string;
  readonly evidenceSource: TaskVerificationEvidenceSource;
  readonly headerEnvKey?: string;
  readonly id: string;
  readonly maxAttempts: number;
  readonly maxResponseBytes: number;
  readonly providerFamily: ProviderHttpProviderFamily;
  readonly providerGroupId: string;
  readonly requestMappingId: string;
  readonly responseMappingId: string;
  readonly revision: number;
  readonly timeoutMs: number;
  readonly verificationType: TaskVerificationType;
}

export type TaskVerificationBindingResolution =
  | Readonly<{ binding: TaskVerificationBinding; status: "resolved" }>
  | Readonly<{
    diagnosticCode:
      | "TASK_VERIFICATION_BINDING_DISABLED"
      | "TASK_VERIFICATION_BINDING_NOT_FOUND"
      | "TASK_VERIFICATION_BINDING_TYPE_MISMATCH";
    status: "disabled" | "not_found" | "type_mismatch";
  }>;

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
  readonly environment: TaskVerificationEnvironment;
  readonly externalDispatchLimit: typeof TASK_VERIFICATION_EXTERNAL_DISPATCH_LIMIT;
  readonly getBinding: (id: string) => TaskVerificationBinding | undefined;
  readonly hasLiveBindings: boolean;
  readonly resolveBinding: (
    id: string,
    verificationType: TaskVerificationType,
  ) => TaskVerificationBindingResolution;
  readonly status: TaskVerificationConfigStatus;
  readonly valid: boolean;
}

export interface TaskVerificationConfigSummary {
  readonly bindingCount: number;
  readonly bindingIds: readonly string[];
  readonly diagnosticCodes: readonly TaskVerificationConfigDiagnosticCode[];
  readonly enabledBindingCount: number;
  readonly environment: TaskVerificationEnvironment;
  readonly externalDispatchLimit: typeof TASK_VERIFICATION_EXTERNAL_DISPATCH_LIMIT;
  readonly status: TaskVerificationConfigStatus;
}

export interface TaskVerificationConfigInput {
  readonly bindingsJson?: string;
  readonly enablement?: string | number | boolean;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly environment: TaskVerificationEnvironment;
  readonly jsonParser?: (source: string) => unknown;
}

const bindingFields = Object.freeze([
  "bodyEnvKey",
  "credentialEnvKey",
  "degradationPolicy",
  "enabled",
  "endpointEnvKey",
  "endpointId",
  "evidenceSource",
  "headerEnvKey",
  "id",
  "maxAttempts",
  "maxResponseBytes",
  "providerFamily",
  "providerGroupId",
  "requestMappingId",
  "responseMappingId",
  "revision",
  "timeoutMs",
  "verificationType",
] as const satisfies readonly (keyof TaskVerificationBinding)[]);
const bindingFieldSet = new Set<string>(bindingFields);
const requiredBindingFields = Object.freeze([
  "endpointEnvKey",
  "endpointId",
  "evidenceSource",
  "id",
  "providerFamily",
  "providerGroupId",
  "requestMappingId",
  "responseMappingId",
  "verificationType",
] as const satisfies readonly (keyof TaskVerificationBinding)[]);
const providerFamilies = Object.freeze([
  "aefinder",
  "aelfscan",
  "ai-provider",
  "awaken",
  "daipp",
  "ebridge",
  "forecast",
  "forest-schrodinger",
  "pay",
  "portfolio",
  "social-api",
  "tmrwdao",
] as const satisfies readonly ProviderHttpProviderFamily[]);
const providerFamilySet = new Set<ProviderHttpProviderFamily>(providerFamilies);
const evidenceSourceSet = new Set<TaskVerificationEvidenceSource>([
  "AEFINDER",
  "AELFSCAN",
  "DAPP_API",
]);

const diagnosticMessages: Readonly<Record<TaskVerificationConfigDiagnosticCode, string>> =
  Object.freeze({
    TASK_VERIFICATION_ENABLEMENT_INVALID:
      "Task verification enablement is invalid.",
    TASK_VERIFICATION_BINDING_ENABLEMENT_INVALID:
      "Task verification binding enablement is invalid.",
    TASK_VERIFICATION_BINDING_REVISION_INVALID:
      "Task verification binding revision is invalid.",
    TASK_VERIFICATION_DEGRADATION_POLICY_INVALID:
      "Task verification degradation policy is invalid.",
    TASK_VERIFICATION_ENDPOINT_POLICY_INVALID:
      "Task verification endpoint policy is invalid.",
    TASK_VERIFICATION_EVIDENCE_SOURCE_INVALID:
      "Task verification evidence source is invalid.",
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
    TASK_VERIFICATION_PROVIDER_REFERENCE_INVALID:
      "Task verification provider reference is invalid.",
    TASK_VERIFICATION_REGISTRY_INCOMPATIBLE:
      "Task verification binding is incompatible with the provider registry.",
    TASK_VERIFICATION_SCHEMA_INVALID:
      "Task verification binding schema is invalid.",
    TASK_VERIFICATION_TIMEOUT_INVALID:
      "Task verification timeout policy is invalid.",
    TASK_VERIFICATION_STRATEGY_CONFLICT:
      "Task verification strategy tuple must be unique.",
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
  environment: TaskVerificationEnvironment,
  bindings: readonly TaskVerificationBinding[] = [],
  diagnostics: readonly TaskVerificationConfigDiagnostic[] = [],
): TaskVerificationConfig => {
  const frozenBindings = Object.freeze([...bindings]);
  const frozenDiagnostics = Object.freeze([...diagnostics]);
  const bindingById = new Map(
    frozenBindings.map((entry) => [entry.id, entry] as const),
  );
  const getBinding = Object.freeze((id: string) => bindingById.get(id));
  const resolveBinding = Object.freeze((
    id: string,
    verificationType: TaskVerificationType,
  ): TaskVerificationBindingResolution => {
    const binding = bindingById.get(id);

    if (!binding) {
      return Object.freeze({
        diagnosticCode: "TASK_VERIFICATION_BINDING_NOT_FOUND" as const,
        status: "not_found" as const,
      });
    }

    if (!binding.enabled) {
      return Object.freeze({
        diagnosticCode: "TASK_VERIFICATION_BINDING_DISABLED" as const,
        status: "disabled" as const,
      });
    }

    if (binding.verificationType !== verificationType) {
      return Object.freeze({
        diagnosticCode: "TASK_VERIFICATION_BINDING_TYPE_MISMATCH" as const,
        status: "type_mismatch" as const,
      });
    }

    return Object.freeze({ binding, status: "resolved" as const });
  });

  return Object.freeze({
    bindings: frozenBindings,
    diagnostics: frozenDiagnostics,
    enabled: status === "ready",
    environment,
    externalDispatchLimit: TASK_VERIFICATION_EXTERNAL_DISPATCH_LIMIT,
    getBinding,
    hasLiveBindings: status === "ready" && frozenBindings.some(({ enabled }) => enabled),
    resolveBinding,
    status,
    valid: status !== "invalid",
  });
};

const disabledConfig = (environment: TaskVerificationEnvironment) =>
  createConfig("disabled", environment);

const invalidConfig = (
  code: TaskVerificationConfigDiagnosticCode,
  field: string,
  environment: TaskVerificationEnvironment,
) => createConfig("invalid", environment, [], [createDiagnostic(code, field)]);

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

const optionalDataValue = (
  record: Record<string, unknown>,
  field: keyof TaskVerificationBinding,
): { readonly present: false } | { readonly present: true; readonly value: unknown } => {
  const descriptor = Object.getOwnPropertyDescriptor(record, field);

  if (!descriptor) {
    return { present: false };
  }

  if (!descriptor.enumerable || !("value" in descriptor)) {
    return fail("TASK_VERIFICATION_SCHEMA_INVALID", `bindings[].${field}`);
  }

  return { present: true, value: descriptor.value };
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

const normalizeEnvironment = (value: unknown): TaskVerificationEnvironment => {
  if (value !== "local" && value !== "stage" && value !== "production") {
    return fail("TASK_VERIFICATION_ENVIRONMENT_INVALID", "environment");
  }

  return value;
};

const normalizeBindingEnablement = (value: unknown): boolean => {
  if (typeof value !== "boolean") {
    return fail(
      "TASK_VERIFICATION_BINDING_ENABLEMENT_INVALID",
      "bindings[].enabled",
    );
  }

  return value;
};

const normalizeBindingRevision = (value: unknown): number => {
  if (
    typeof value !== "number"
    || !Number.isSafeInteger(value)
    || value < 1
    || value > TASK_VERIFICATION_MAX_REVISION
  ) {
    return fail(
      "TASK_VERIFICATION_BINDING_REVISION_INVALID",
      "bindings[].revision",
    );
  }

  return value;
};

const normalizeDegradationPolicy = (
  value: unknown,
): TaskVerificationDegradationPolicy => {
  if (value !== "blocked" && value !== "manual_review" && value !== "pending") {
    return fail(
      "TASK_VERIFICATION_DEGRADATION_POLICY_INVALID",
      "bindings[].degradationPolicy",
    );
  }

  return value;
};

const normalizeProviderFamily = (value: unknown): ProviderHttpProviderFamily => {
  if (
    typeof value !== "string"
    || !providerFamilySet.has(value as ProviderHttpProviderFamily)
  ) {
    return fail(
      "TASK_VERIFICATION_PROVIDER_REFERENCE_INVALID",
      "bindings[].providerFamily",
    );
  }

  return value as ProviderHttpProviderFamily;
};

const normalizeProviderReference = (
  value: unknown,
  field: "endpointId" | "providerGroupId" | "requestMappingId" | "responseMappingId",
): string => {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > TASK_VERIFICATION_PROVIDER_REFERENCE_MAX_LENGTH
    || !/^[a-z0-9][a-z0-9._:-]*$/.test(value)
  ) {
    return fail(
      "TASK_VERIFICATION_PROVIDER_REFERENCE_INVALID",
      `bindings[].${field}`,
    );
  }

  return value;
};

const normalizeEvidenceSource = (
  value: unknown,
  verificationType: TaskVerificationType,
): TaskVerificationEvidenceSource => {
  if (
    typeof value !== "string"
    || !evidenceSourceSet.has(value as TaskVerificationEvidenceSource)
    || (verificationType === "ON_CHAIN" && value === "DAPP_API")
    || (verificationType === "DAPP_API" && value !== "DAPP_API")
  ) {
    return fail(
      "TASK_VERIFICATION_EVIDENCE_SOURCE_INVALID",
      "bindings[].evidenceSource",
    );
  }

  return value as TaskVerificationEvidenceSource;
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

const normalizeOptionalEnvKey = (
  record: Record<string, unknown>,
  field: "bodyEnvKey" | "credentialEnvKey" | "headerEnvKey",
): string | undefined => {
  const candidate = optionalDataValue(record, field);

  return candidate.present
    ? normalizeEnvKey(candidate.value, field)
    : undefined;
};

const normalizeOptionalValue = <T>(
  record: Record<string, unknown>,
  field: keyof TaskVerificationBinding,
  fallback: T,
  normalize: (value: unknown) => T,
): T => {
  const candidate = optionalDataValue(record, field);

  return candidate.present ? normalize(candidate.value) : fallback;
};

const normalizeBinding = (value: unknown): TaskVerificationBinding => {
  if (!isPlainRecord(value)) {
    return fail("TASK_VERIFICATION_SCHEMA_INVALID", "bindings[]");
  }

  const fields = Reflect.ownKeys(value);

  if (fields.some((field) => typeof field !== "string" || !bindingFieldSet.has(field))) {
    return fail("TASK_VERIFICATION_UNKNOWN_FIELD", "bindings[].unknownField");
  }

  for (const field of requiredBindingFields) {
    ownDataValue(value, field);
  }

  const verificationType = normalizeVerificationType(
    ownDataValue(value, "verificationType"),
  );
  const bodyEnvKey = normalizeOptionalEnvKey(value, "bodyEnvKey");
  const credentialEnvKey = normalizeOptionalEnvKey(value, "credentialEnvKey");
  const headerEnvKey = normalizeOptionalEnvKey(value, "headerEnvKey");

  return Object.freeze({
    ...(bodyEnvKey === undefined ? {} : { bodyEnvKey }),
    ...(credentialEnvKey === undefined ? {} : { credentialEnvKey }),
    degradationPolicy: normalizeOptionalValue(
      value,
      "degradationPolicy",
      "manual_review" as const,
      normalizeDegradationPolicy,
    ),
    enabled: normalizeOptionalValue(
      value,
      "enabled",
      false,
      normalizeBindingEnablement,
    ),
    endpointEnvKey: normalizeEnvKey(
      ownDataValue(value, "endpointEnvKey"),
      "endpointEnvKey",
    ),
    endpointId: normalizeProviderReference(
      ownDataValue(value, "endpointId"),
      "endpointId",
    ),
    evidenceSource: normalizeEvidenceSource(
      ownDataValue(value, "evidenceSource"),
      verificationType,
    ),
    ...(headerEnvKey === undefined ? {} : { headerEnvKey }),
    id: normalizeId(ownDataValue(value, "id")),
    maxAttempts: normalizeOptionalValue(
      value,
      "maxAttempts",
      TASK_VERIFICATION_DEFAULT_MAX_ATTEMPTS,
      (candidate) => normalizeBoundedInteger(
        candidate,
        TASK_VERIFICATION_MAX_ATTEMPTS_MIN,
        TASK_VERIFICATION_MAX_ATTEMPTS_MAX,
        "TASK_VERIFICATION_MAX_ATTEMPTS_INVALID",
        "maxAttempts",
      ),
    ),
    maxResponseBytes: normalizeOptionalValue(
      value,
      "maxResponseBytes",
      TASK_VERIFICATION_DEFAULT_RESPONSE_MAX_BYTES,
      (candidate) => normalizeBoundedInteger(
        candidate,
        TASK_VERIFICATION_RESPONSE_MAX_BYTES_MIN,
        TASK_VERIFICATION_RESPONSE_MAX_BYTES_MAX,
        "TASK_VERIFICATION_RESPONSE_LIMIT_INVALID",
        "maxResponseBytes",
      ),
    ),
    providerFamily: normalizeProviderFamily(
      ownDataValue(value, "providerFamily"),
    ),
    providerGroupId: normalizeProviderReference(
      ownDataValue(value, "providerGroupId"),
      "providerGroupId",
    ),
    requestMappingId: normalizeProviderReference(
      ownDataValue(value, "requestMappingId"),
      "requestMappingId",
    ),
    responseMappingId: normalizeProviderReference(
      ownDataValue(value, "responseMappingId"),
      "responseMappingId",
    ),
    revision: normalizeOptionalValue(
      value,
      "revision",
      1,
      normalizeBindingRevision,
    ),
    timeoutMs: normalizeOptionalValue(
      value,
      "timeoutMs",
      TASK_VERIFICATION_DEFAULT_TIMEOUT_MS,
      (candidate) => normalizeBoundedInteger(
        candidate,
        TASK_VERIFICATION_TIMEOUT_MS_MIN,
        TASK_VERIFICATION_TIMEOUT_MS_MAX,
        "TASK_VERIFICATION_TIMEOUT_INVALID",
        "timeoutMs",
      ),
    ),
    verificationType,
  });
};

const createStrategyTuple = (binding: TaskVerificationBinding): string => [
  binding.verificationType,
  binding.providerFamily,
  binding.providerGroupId,
  binding.endpointId,
  binding.requestMappingId,
  binding.responseMappingId,
].join("\u0000");

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
  const strategyTuples = new Set<string>();

  for (const rawBinding of value) {
    const normalized = normalizeBinding(rawBinding);

    if (bindingIds.has(normalized.id)) {
      return fail("TASK_VERIFICATION_ID_CONFLICT", "bindings[].id");
    }

    bindingIds.add(normalized.id);
    const strategyTuple = createStrategyTuple(normalized);

    if (strategyTuples.has(strategyTuple)) {
      return fail("TASK_VERIFICATION_STRATEGY_CONFLICT", "bindings[].strategy");
    }

    strategyTuples.add(strategyTuple);
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

export const toProviderHttpBindingCompatibilityInput = (
  binding: TaskVerificationBinding,
): ProviderHttpBindingCompatibilityInput => Object.freeze({
  binding: Object.freeze({
    id: binding.id,
    verificationType: binding.verificationType,
  }),
  enabled: binding.enabled,
  endpoint: Object.freeze({
    endpointId: binding.endpointId,
    providerFamily: binding.providerFamily,
    providerGroupId: binding.providerGroupId,
    requestMappingId: binding.requestMappingId,
    responseMappingId: binding.responseMappingId,
  }),
});

const validateRegistryCompatibility = (
  bindings: readonly TaskVerificationBinding[],
): void => {
  for (const binding of bindings) {
    if (!binding.enabled) {
      continue;
    }

    const compatibility = validateProviderHttpVerificationBindingCompatibility(
      toProviderHttpBindingCompatibilityInput(binding),
    );

    if (compatibility.status !== "compatible") {
      fail("TASK_VERIFICATION_REGISTRY_INCOMPATIBLE", "bindings[].registry");
    }
  }
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
    if (!binding.enabled) {
      continue;
    }

    const endpoint = readRequiredMaterial(env, binding.endpointEnvKey);

    for (const key of [
      binding.headerEnvKey,
      binding.bodyEnvKey,
      binding.credentialEnvKey,
    ]) {
      if (key !== undefined) {
        readRequiredMaterial(env, key);
      }
    }

    if (!hasSafeEndpointPolicy(endpoint, environment)) {
      fail("TASK_VERIFICATION_ENDPOINT_POLICY_INVALID", "bindings[].endpointEnvKey");
    }
  }
};

const resolveEnabledConfig = (
  input: TaskVerificationConfigInput,
  environment: TaskVerificationEnvironment,
): TaskVerificationConfig => {
  const source = input.bindingsJson !== undefined
    ? input.bindingsJson
    : input.env[TASK_VERIFICATION_BINDINGS_JSON_ENV];
  const bindings = parseBindings(source, input.jsonParser ?? JSON.parse);

  validateRegistryCompatibility(bindings);
  validateMaterialPosture(bindings, input.env, environment);

  return createConfig("ready", environment, bindings);
};

export const createTaskVerificationConfigSummary = (
  config: TaskVerificationConfig,
): TaskVerificationConfigSummary => Object.freeze({
  bindingCount: config.bindings.length,
  bindingIds: Object.freeze(config.bindings.map(({ id }) => id).sort()),
  diagnosticCodes: Object.freeze(config.diagnostics.map(({ code }) => code)),
  enabledBindingCount: config.bindings.filter(({ enabled }) => enabled).length,
  environment: config.environment,
  externalDispatchLimit: config.externalDispatchLimit,
  status: config.status,
});

export const resolveTaskVerificationConfig = (
  input: TaskVerificationConfigInput,
): TaskVerificationConfig => {
  let environment: TaskVerificationEnvironment = "local";

  try {
    environment = normalizeEnvironment(input.environment);
    const enablement = input.enablement !== undefined
      ? input.enablement
      : input.env[TASK_VERIFICATION_ENABLEMENT_ENV];

    if (
      enablement === undefined
      || enablement === ""
      || enablement === "0"
      || enablement === 0
      || enablement === false
      || enablement === "disabled"
    ) {
      return disabledConfig(environment);
    }

    if (enablement !== TASK_VERIFICATION_APPROVED_ENABLEMENT) {
      return invalidConfig(
        "TASK_VERIFICATION_ENABLEMENT_INVALID",
        TASK_VERIFICATION_ENABLEMENT_ENV,
        environment,
      );
    }

    return resolveEnabledConfig(input, environment);
  } catch (error) {
    if (error instanceof TaskVerificationConfigFailure) {
      return invalidConfig(error.code, error.field, environment);
    }

    return invalidConfig(
      "TASK_VERIFICATION_SCHEMA_INVALID",
      "taskVerificationConfig",
      environment,
    );
  }
};
