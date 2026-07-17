import { createHash } from "node:crypto";
import type { TaskVerificationBinding, TaskVerificationEnvironment } from "./taskVerificationConfig";
import type { ProviderHttpRequestPlan } from "./providerHttpRequestPlanner";
import type { ProviderHttpMethod } from "./providerHttpRuntimeTypes";

export const PROVIDER_HTTP_REQUEST_BODY_MAX_BYTES = 64 * 1024;
export const PROVIDER_HTTP_HEADER_COUNT_MAX = 32;
export const PROVIDER_HTTP_HEADER_VALUE_MAX_BYTES = 4 * 1024;
export const PROVIDER_HTTP_HEADER_TOTAL_MAX_BYTES = 16 * 1024;

export type ProviderHttpMaterialDiagnosticCode =
  | "PROVIDER_HTTP_BODY_INVALID"
  | "PROVIDER_HTTP_BODY_NOT_ALLOWED"
  | "PROVIDER_HTTP_BODY_TOO_LARGE"
  | "PROVIDER_HTTP_CONTENT_TYPE_INVALID"
  | "PROVIDER_HTTP_DYNAMIC_REQUEST_CONFLICT"
  | "PROVIDER_HTTP_DYNAMIC_REQUEST_INVALID"
  | "PROVIDER_HTTP_DYNAMIC_REQUEST_MISMATCH"
  | "PROVIDER_HTTP_DYNAMIC_REQUEST_REQUIRED"
  | "PROVIDER_HTTP_DYNAMIC_REQUEST_REUSED"
  | "PROVIDER_HTTP_ENDPOINT_HOST_NOT_APPROVED"
  | "PROVIDER_HTTP_ENDPOINT_POLICY_INVALID"
  | "PROVIDER_HTTP_HEADER_COUNT_EXCEEDED"
  | "PROVIDER_HTTP_HEADER_NAME_INVALID"
  | "PROVIDER_HTTP_HEADER_TOTAL_EXCEEDED"
  | "PROVIDER_HTTP_HEADER_UNSAFE"
  | "PROVIDER_HTTP_HEADER_VALUE_INVALID"
  | "PROVIDER_HTTP_HEADERS_INVALID"
  | "PROVIDER_HTTP_LOOKUP_FAILED"
  | "PROVIDER_HTTP_MATERIAL_DISPOSED"
  | "PROVIDER_HTTP_MATERIAL_INVALID"
  | "PROVIDER_HTTP_MATERIAL_MISSING"
  | "PROVIDER_HTTP_METHOD_INVALID";

const MATERIAL_MESSAGES: Readonly<Record<ProviderHttpMaterialDiagnosticCode, string>> =
  Object.freeze({
    PROVIDER_HTTP_BODY_INVALID: "Provider HTTP request body is invalid.",
    PROVIDER_HTTP_BODY_NOT_ALLOWED: "Provider HTTP method does not allow a request body.",
    PROVIDER_HTTP_BODY_TOO_LARGE: "Provider HTTP request body exceeds the byte limit.",
    PROVIDER_HTTP_CONTENT_TYPE_INVALID: "Provider HTTP request content type is invalid.",
    PROVIDER_HTTP_DYNAMIC_REQUEST_CONFLICT: "Provider HTTP dynamic request conflicts with configured material.",
    PROVIDER_HTTP_DYNAMIC_REQUEST_INVALID: "Provider HTTP dynamic request is invalid.",
    PROVIDER_HTTP_DYNAMIC_REQUEST_MISMATCH: "Provider HTTP dynamic request does not match its safe plan.",
    PROVIDER_HTTP_DYNAMIC_REQUEST_REQUIRED: "Provider HTTP dynamic request material is required.",
    PROVIDER_HTTP_DYNAMIC_REQUEST_REUSED: "Provider HTTP dynamic request material was already consumed.",
    PROVIDER_HTTP_ENDPOINT_HOST_NOT_APPROVED: "Provider HTTP endpoint host is not approved.",
    PROVIDER_HTTP_ENDPOINT_POLICY_INVALID: "Provider HTTP endpoint violates environment policy.",
    PROVIDER_HTTP_HEADER_COUNT_EXCEEDED: "Provider HTTP header count exceeds the limit.",
    PROVIDER_HTTP_HEADER_NAME_INVALID: "Provider HTTP header name is invalid.",
    PROVIDER_HTTP_HEADER_TOTAL_EXCEEDED: "Provider HTTP headers exceed the byte limit.",
    PROVIDER_HTTP_HEADER_UNSAFE: "Provider HTTP header is not allowed.",
    PROVIDER_HTTP_HEADER_VALUE_INVALID: "Provider HTTP header value is invalid.",
    PROVIDER_HTTP_HEADERS_INVALID: "Provider HTTP header material is invalid.",
    PROVIDER_HTTP_LOOKUP_FAILED: "Provider HTTP material lookup failed.",
    PROVIDER_HTTP_MATERIAL_DISPOSED: "Provider HTTP execution material is no longer available.",
    PROVIDER_HTTP_MATERIAL_INVALID: "Provider HTTP execution material is invalid.",
    PROVIDER_HTTP_MATERIAL_MISSING: "Provider HTTP execution material is missing.",
    PROVIDER_HTTP_METHOD_INVALID: "Provider HTTP method is invalid.",
  });

export class ProviderHttpExecutionMaterialError extends Error {
  readonly code: ProviderHttpMaterialDiagnosticCode;
  readonly traceId: string;

  constructor(code: ProviderHttpMaterialDiagnosticCode, traceId: string) {
    super(MATERIAL_MESSAGES[code]);
    this.name = "ProviderHttpExecutionMaterialError";
    this.code = code;
    this.traceId = safeTraceId(traceId);
    delete this.stack;
  }
}

export interface ProviderHttpMaterialDiagnostic {
  readonly code: ProviderHttpMaterialDiagnosticCode;
  readonly message: string;
  readonly traceId: string;
}

export interface ProviderHttpMaterialLookup {
  get(
    key: string,
    context?: ProviderHttpMaterialLookupContext,
  ): Promise<string | undefined> | string | undefined;
}

export interface ProviderHttpMaterialLookupContext {
  readonly signal?: AbortSignal;
}

export type ProviderHttpCanonicalRequestPrimitive = string | number | boolean;
export type ProviderHttpCanonicalRequestTarget = "body" | "header" | "path" | "query";

export interface ProviderHttpCanonicalRequestFieldMapping {
  readonly name: string;
  readonly required?: boolean;
  readonly source: string;
  readonly target: ProviderHttpCanonicalRequestTarget;
}

export interface ProviderHttpCanonicalRequestMapping {
  readonly fields: readonly ProviderHttpCanonicalRequestFieldMapping[];
  readonly method: ProviderHttpMethod;
  readonly pathTemplate?: string;
}

export interface CreateProviderHttpCanonicalRequestMaterialInput {
  readonly bindingId: string;
  readonly bindingRevision: number;
  readonly endpointId: string;
  readonly mapping: ProviderHttpCanonicalRequestMapping;
  readonly requestMappingId: string;
  readonly strategyId: string;
  readonly values: Readonly<Record<string, ProviderHttpCanonicalRequestPrimitive | undefined>>;
}

declare const providerHttpCanonicalRequestMaterialBrand: unique symbol;

export interface ProviderHttpCanonicalRequestMaterial {
  readonly [providerHttpCanonicalRequestMaterialBrand]: true;
}

export interface ProviderHttpCanonicalRequestMaterialBuild {
  readonly material: ProviderHttpCanonicalRequestMaterial;
  readonly requestMaterialRef: string;
}

declare const providerHttpExecutionMaterialBrand: unique symbol;

export interface ProviderHttpExecutionMaterial {
  readonly [providerHttpExecutionMaterialBrand]: true;
}

export interface ProviderHttpExecutionMaterialView {
  readonly body?: string;
  readonly environment: TaskVerificationEnvironment;
  readonly headers: Readonly<Record<string, string>>;
  readonly method: ProviderHttpMethod;
  readonly url: URL;
}

export type ProviderHttpExecutionMaterialResolution =
  | Readonly<{
    diagnostic: ProviderHttpMaterialDiagnostic;
    ok: false;
  }>
  | Readonly<{
    material: ProviderHttpExecutionMaterial;
    ok: true;
  }>;

export type ProviderHttpExecutionMaterialResolver = (
  plan: ProviderHttpRequestPlan,
  requestMaterial?: ProviderHttpCanonicalRequestMaterial,
  context?: ProviderHttpExecutionMaterialResolverContext,
) => Promise<ProviderHttpExecutionMaterialResolution>;

export interface ProviderHttpExecutionMaterialResolverContext {
  readonly signal?: AbortSignal;
}

export interface CreateProviderHttpExecutionMaterialResolverOptions {
  readonly allowedHeaderNames?: readonly string[];
  readonly approvedProductionHost?: (hostname: string) => boolean;
  readonly approvedProductionHosts?: readonly string[];
  readonly binding: TaskVerificationBinding;
  readonly credentialHeaderName?: string;
  readonly credentialPrefix?: string;
  readonly environment: TaskVerificationEnvironment;
  readonly lookup: ProviderHttpMaterialLookup;
}

interface StoredExecutionMaterial {
  body?: string;
  environment: TaskVerificationEnvironment;
  headers: Readonly<Record<string, string>>;
  method: ProviderHttpMethod;
  url: URL;
}

interface StoredCanonicalRequestMaterial {
  readonly bindingId: string;
  readonly bindingRevision: number;
  readonly endpointId: string;
  readonly mapping: ProviderHttpCanonicalRequestMapping;
  readonly requestMappingId: string;
  readonly requestMaterialRef: string;
  readonly strategyId: string;
  readonly values: Readonly<Record<string, ProviderHttpCanonicalRequestPrimitive>>;
}

const materialValues = new WeakMap<object, StoredExecutionMaterial>();
const materialBrands = new WeakSet<object>();
const disposedMaterials = new WeakSet<object>();
const canonicalRequestMaterialValues = new WeakMap<object, StoredCanonicalRequestMaterial>();
const canonicalRequestMaterialBrands = new WeakSet<object>();
const claimedCanonicalRequestMaterials = new WeakSet<object>();

const DEFAULT_ALLOWED_HEADER_NAMES = Object.freeze([
  "accept",
  "content-type",
  "x-campaign-id",
  "x-provider",
  "x-request-id",
  "x-task-revision",
  "x-wallet-source",
] as const);

const FORBIDDEN_HEADER_NAMES = new Set([
  "connection",
  "content-length",
  "cookie",
  "forwarded",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "set-cookie",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "via",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-trace-id",
]);

const CANONICAL_SOURCE_PATTERN = /^(?:participant\.(?:accountType|walletAddress|walletSource)|task\.(?:campaignId|revision|taskId)|rule\.[A-Za-z][A-Za-z0-9]{0,63})$/;
const REQUEST_MAPPING_ID_PATTERN = /^provider-http-request-map:[a-z0-9][a-z0-9-]{0,95}$/;
const REQUEST_MATERIAL_REF_PATTERN = /^request-ref:[a-f0-9]{64}$/;
const SAFE_BINDING_ID_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const SAFE_EXECUTION_ID_PATTERN = /^[a-z][a-z0-9-]{0,127}$/;

export const normalizeProviderHttpCanonicalRequestMapping = (
  input: ProviderHttpCanonicalRequestMapping,
): ProviderHttpCanonicalRequestMapping => {
  const traceId = "trace-unavailable";
  if (
    !isPlainRecord(input)
    || (input.method !== "GET" && input.method !== "POST")
    || !Array.isArray(input.fields)
    || input.fields.length < 1
    || input.fields.length > 32
  ) {
    throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_DYNAMIC_REQUEST_INVALID", traceId);
  }

  const targetNames = new Set<string>();
  const normalizedFields = input.fields.map((field) => {
    if (
      !isPlainRecord(field)
      || !CANONICAL_SOURCE_PATTERN.test(String(field.source ?? ""))
      || !isCanonicalRequestTarget(field.target)
      || (field.required !== undefined && typeof field.required !== "boolean")
    ) {
      throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_DYNAMIC_REQUEST_INVALID", traceId);
    }

    const normalizedName = field.target === "header"
      ? String(field.name ?? "").toLowerCase()
      : String(field.name ?? "");
    if (!isValidMappingTargetName(field.target, normalizedName)) {
      throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_DYNAMIC_REQUEST_INVALID", traceId);
    }
    const targetName = `${field.target}\u0000${normalizedName}`;
    if (targetNames.has(targetName)) {
      throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_DYNAMIC_REQUEST_INVALID", traceId);
    }
    targetNames.add(targetName);
    return Object.freeze({
      name: normalizedName,
      ...(field.required === undefined ? {} : { required: field.required }),
      source: String(field.source),
      target: field.target,
    });
  });

  const pathFields = normalizedFields.filter(({ target }) => target === "path");
  if (
    normalizedFields.some(({ target }) => input.method === "GET" && target === "body")
    || pathFields.some(({ required }) => required !== true)
  ) {
    throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_DYNAMIC_REQUEST_INVALID", traceId);
  }
  const pathTemplate = input.pathTemplate;
  if (
    pathFields.length > 0
    && (
      typeof pathTemplate !== "string"
      || pathTemplate.length > 512
      || !/^\/(?:[A-Za-z0-9._~-]+|\{[A-Za-z][A-Za-z0-9]{0,31}\})(?:\/(?:[A-Za-z0-9._~-]+|\{[A-Za-z][A-Za-z0-9]{0,31}\}))*$/.test(pathTemplate)
    )
  ) {
    throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_DYNAMIC_REQUEST_INVALID", traceId);
  }
  if (pathFields.length === 0 && pathTemplate !== undefined) {
    throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_DYNAMIC_REQUEST_INVALID", traceId);
  }

  const placeholders = pathTemplate
    ? [...pathTemplate.matchAll(/\{([A-Za-z][A-Za-z0-9]{0,31})\}/g)].map((match) => match[1])
    : [];
  const pathNames = pathFields.map(({ name }) => name);
  if (
    new Set(placeholders).size !== placeholders.length
    || placeholders.length !== pathNames.length
    || placeholders.some((name) => !pathNames.includes(name))
  ) {
    throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_DYNAMIC_REQUEST_INVALID", traceId);
  }

  return Object.freeze({
    fields: Object.freeze(normalizedFields),
    method: input.method,
    ...(pathTemplate === undefined ? {} : { pathTemplate }),
  });
};

export const createProviderHttpCanonicalRequestMaterial = (
  input: CreateProviderHttpCanonicalRequestMaterialInput,
): ProviderHttpCanonicalRequestMaterialBuild => {
  if (
    !isPlainRecord(input)
    || !SAFE_BINDING_ID_PATTERN.test(String(input.bindingId ?? ""))
    || !Number.isSafeInteger(input.bindingRevision)
    || input.bindingRevision < 1
    || !SAFE_EXECUTION_ID_PATTERN.test(String(input.endpointId ?? ""))
    || !REQUEST_MAPPING_ID_PATTERN.test(String(input.requestMappingId ?? ""))
    || !SAFE_EXECUTION_ID_PATTERN.test(String(input.strategyId ?? ""))
    || !isPlainRecord(input.values)
  ) {
    throw new ProviderHttpExecutionMaterialError(
      "PROVIDER_HTTP_DYNAMIC_REQUEST_INVALID",
      "trace-unavailable",
    );
  }

  const mapping = normalizeProviderHttpCanonicalRequestMapping(input.mapping);
  const mappedSources = new Set(mapping.fields.map(({ source }) => source));
  const values: Record<string, ProviderHttpCanonicalRequestPrimitive> = {};
  for (const [source, value] of Object.entries(input.values)) {
    if (!mappedSources.has(source) || value === undefined || !isBoundedCanonicalPrimitive(value)) {
      throw new ProviderHttpExecutionMaterialError(
        "PROVIDER_HTTP_DYNAMIC_REQUEST_INVALID",
        "trace-unavailable",
      );
    }
    values[source] = value;
  }
  if (mapping.fields.some(({ required, source }) => required === true && values[source] === undefined)) {
    throw new ProviderHttpExecutionMaterialError(
      "PROVIDER_HTTP_DYNAMIC_REQUEST_INVALID",
      "trace-unavailable",
    );
  }

  const requestMaterialRef = `request-ref:${createHash("sha256")
    .update("campaign-os/provider-http-canonical-request/v1\n", "utf8")
    .update(canonicalJson({
      bindingId: input.bindingId,
      bindingRevision: input.bindingRevision,
      endpointId: input.endpointId,
      mapping,
      requestMappingId: input.requestMappingId,
      strategyId: input.strategyId,
      values,
    }), "utf8")
    .digest("hex")}`;
  const material = Object.freeze({}) as ProviderHttpCanonicalRequestMaterial;
  canonicalRequestMaterialValues.set(material, Object.freeze({
    bindingId: input.bindingId,
    bindingRevision: input.bindingRevision,
    endpointId: input.endpointId,
    mapping,
    requestMappingId: input.requestMappingId,
    requestMaterialRef,
    strategyId: input.strategyId,
    values: Object.freeze({ ...values }),
  }));
  canonicalRequestMaterialBrands.add(material);
  return Object.freeze({ material, requestMaterialRef });
};

export const disposeProviderHttpCanonicalRequestMaterial = (
  material: ProviderHttpCanonicalRequestMaterial,
): void => {
  if (!isProviderHttpCanonicalRequestMaterial(material)) {
    return;
  }
  canonicalRequestMaterialValues.delete(material);
  claimedCanonicalRequestMaterials.add(material);
};

export const createProviderHttpExecutionMaterialResolver = (
  options: CreateProviderHttpExecutionMaterialResolverOptions,
): ProviderHttpExecutionMaterialResolver => {
  const approvedHosts = new Set(
    (options.approvedProductionHosts ?? []).map((host) => host.toLowerCase()),
  );
  const allowedHeaderNames = new Set(
    (options.allowedHeaderNames ?? DEFAULT_ALLOWED_HEADER_NAMES).map((name) => name.toLowerCase()),
  );
  const credentialHeaderName = (options.credentialHeaderName ?? "authorization").toLowerCase();
  const credentialPrefix = options.credentialPrefix ?? "Bearer ";

  return async (plan, requestMaterial, context = {}) => {
    const traceId = safeTraceId(plan?.traceId);

    try {
      claimCanonicalRequestMaterial(requestMaterial, traceId);
      assertNotAborted(context.signal, traceId);
      assertMethod(plan?.method, traceId);
      assertPlanMatchesBinding(plan, options.binding, traceId);
      assertClaimedCanonicalRequestMatches(plan, requestMaterial, options.binding, traceId);
      const endpoint = await lookupRequired(
        options.lookup,
        options.binding.endpointEnvKey,
        traceId,
        context.signal,
      );
      const endpointUrl = resolveEndpointUrl(endpoint, options.environment, {
        approvedHost: options.approvedProductionHost,
        approvedHosts,
        traceId,
      });
      const configuredHeaders = options.binding.headerEnvKey
        ? await lookupOptional(options.lookup, options.binding.headerEnvKey, traceId, context.signal)
        : undefined;
      const configuredBody = options.binding.bodyEnvKey
        ? await lookupOptional(options.lookup, options.binding.bodyEnvKey, traceId, context.signal)
        : undefined;
      const credential = options.binding.credentialEnvKey
        ? await lookupRequired(options.lookup, options.binding.credentialEnvKey, traceId, context.signal)
        : undefined;
      const canonicalRequest = takeCanonicalRequestMaterial(
        plan,
        requestMaterial,
        options.binding,
        traceId,
      );
      const dynamicRequest = materializeCanonicalRequest(
        canonicalRequest,
        endpointUrl,
        traceId,
      );
      const body = resolveBody(
        configuredBody,
        dynamicRequest?.body,
        plan.method,
        traceId,
      );
      const headers = resolveHeaders({
        allowedHeaderNames,
        body,
        configuredHeaders,
        credential,
        credentialHeaderName,
        credentialPrefix,
        dynamicHeaders: dynamicRequest?.headers,
        traceId,
      });
      const material = createOpaqueMaterial({
        body,
        environment: options.environment,
        headers,
        method: plan.method,
        url: dynamicRequest.url,
      });

      return Object.freeze({ material, ok: true as const });
    } catch (error) {
      const materialError = error instanceof ProviderHttpExecutionMaterialError
        ? error
        : new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_MATERIAL_INVALID", traceId);

      return Object.freeze({
        diagnostic: createDiagnostic(materialError.code, materialError.traceId),
        ok: false as const,
      });
    } finally {
      if (requestMaterial) {
        disposeProviderHttpCanonicalRequestMaterial(requestMaterial);
      }
    }
  };
};

export const isProviderHttpExecutionMaterial = (
  value: unknown,
): value is ProviderHttpExecutionMaterial =>
  typeof value === "object"
  && value !== null
  && materialBrands.has(value);

export const useProviderHttpExecutionMaterial = async <T>(
  material: ProviderHttpExecutionMaterial,
  use: (view: ProviderHttpExecutionMaterialView) => Promise<T> | T,
): Promise<T> => {
  if (!isProviderHttpExecutionMaterial(material)) {
    throw new ProviderHttpExecutionMaterialError(
      "PROVIDER_HTTP_MATERIAL_INVALID",
      "trace-unavailable",
    );
  }

  const stored = materialValues.get(material);
  if (!stored || disposedMaterials.has(material)) {
    throw new ProviderHttpExecutionMaterialError(
      "PROVIDER_HTTP_MATERIAL_DISPOSED",
      "trace-unavailable",
    );
  }

  materialValues.delete(material);
  disposedMaterials.add(material);
  try {
    return await use(Object.freeze({
      ...(stored.body === undefined ? {} : { body: stored.body }),
      environment: stored.environment,
      headers: Object.freeze({ ...stored.headers }),
      method: stored.method,
      url: new URL(stored.url.toString()),
    }));
  } finally {
    materialValues.delete(material);
    disposedMaterials.add(material);
  }
};

export const disposeProviderHttpExecutionMaterial = (
  material: ProviderHttpExecutionMaterial,
): void => {
  if (!isProviderHttpExecutionMaterial(material)) {
    return;
  }

  materialValues.delete(material);
  disposedMaterials.add(material);
};

function isProviderHttpCanonicalRequestMaterial(
  value: unknown,
): value is ProviderHttpCanonicalRequestMaterial {
  return typeof value === "object"
    && value !== null
    && canonicalRequestMaterialBrands.has(value);
}

function takeCanonicalRequestMaterial(
  plan: ProviderHttpRequestPlan,
  material: ProviderHttpCanonicalRequestMaterial | undefined,
  binding: TaskVerificationBinding,
  traceId: string,
): StoredCanonicalRequestMaterial {
  if (!material || !isProviderHttpCanonicalRequestMaterial(material)) {
    throw new ProviderHttpExecutionMaterialError(
      "PROVIDER_HTTP_DYNAMIC_REQUEST_INVALID",
      traceId,
    );
  }
  const stored = canonicalRequestMaterialValues.get(material);
  canonicalRequestMaterialValues.delete(material);
  if (!stored) {
    throw new ProviderHttpExecutionMaterialError(
      "PROVIDER_HTTP_DYNAMIC_REQUEST_REUSED",
      traceId,
    );
  }
  assertStoredCanonicalRequestMatches(stored, plan, binding, traceId);
  return stored;
}

function claimCanonicalRequestMaterial(
  material: ProviderHttpCanonicalRequestMaterial | undefined,
  traceId: string,
): void {
  if (!material) {
    throw new ProviderHttpExecutionMaterialError(
      "PROVIDER_HTTP_DYNAMIC_REQUEST_REQUIRED",
      traceId,
    );
  }
  if (!isProviderHttpCanonicalRequestMaterial(material)) {
    throw new ProviderHttpExecutionMaterialError(
      "PROVIDER_HTTP_DYNAMIC_REQUEST_INVALID",
      traceId,
    );
  }
  const stored = canonicalRequestMaterialValues.get(material);
  if (!stored || claimedCanonicalRequestMaterials.has(material)) {
    throw new ProviderHttpExecutionMaterialError(
      "PROVIDER_HTTP_DYNAMIC_REQUEST_REUSED",
      traceId,
    );
  }
  claimedCanonicalRequestMaterials.add(material);
}

function assertClaimedCanonicalRequestMatches(
  plan: ProviderHttpRequestPlan,
  material: ProviderHttpCanonicalRequestMaterial | undefined,
  binding: TaskVerificationBinding,
  traceId: string,
): void {
  if (!material || !isProviderHttpCanonicalRequestMaterial(material)) {
    throw new ProviderHttpExecutionMaterialError(
      "PROVIDER_HTTP_DYNAMIC_REQUEST_INVALID",
      traceId,
    );
  }
  const stored = canonicalRequestMaterialValues.get(material);
  if (!stored || !claimedCanonicalRequestMaterials.has(material)) {
    throw new ProviderHttpExecutionMaterialError(
      "PROVIDER_HTTP_DYNAMIC_REQUEST_REUSED",
      traceId,
    );
  }
  try {
    if (
      !plan.strategyId
      || !REQUEST_MATERIAL_REF_PATTERN.test(String(plan.requestMaterialRef ?? ""))
    ) {
      throw new ProviderHttpExecutionMaterialError(
        "PROVIDER_HTTP_DYNAMIC_REQUEST_REQUIRED",
        traceId,
      );
    }
    assertStoredCanonicalRequestMatches(stored, plan, binding, traceId);
  } catch (error) {
    canonicalRequestMaterialValues.delete(material);
    throw error;
  }
}

function assertStoredCanonicalRequestMatches(
  stored: StoredCanonicalRequestMaterial,
  plan: ProviderHttpRequestPlan,
  binding: TaskVerificationBinding,
  traceId: string,
): void {
  if (
    stored.bindingId !== binding.id
    || stored.bindingRevision !== binding.revision
    || stored.requestMaterialRef !== plan.requestMaterialRef
    || stored.endpointId !== plan.endpointId
    || stored.requestMappingId !== plan.requestMappingId
    || stored.strategyId !== plan.strategyId
    || stored.mapping.method !== plan.method
  ) {
    throw new ProviderHttpExecutionMaterialError(
      "PROVIDER_HTTP_DYNAMIC_REQUEST_MISMATCH",
      traceId,
    );
  }
}

function assertPlanMatchesBinding(
  plan: ProviderHttpRequestPlan,
  binding: TaskVerificationBinding,
  traceId: string,
): void {
  if (
    plan.endpointId !== binding.endpointId
    || plan.providerGroupId !== binding.providerGroupId
    || plan.requestMappingId !== binding.requestMappingId
    || plan.responseMappingId !== binding.responseMappingId
    || plan.verificationType !== binding.verificationType
  ) {
    throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_MATERIAL_INVALID", traceId);
  }
}

function materializeCanonicalRequest(
  request: StoredCanonicalRequestMaterial,
  endpointUrl: URL,
  traceId: string,
): {
  body: Readonly<Record<string, ProviderHttpCanonicalRequestPrimitive>>;
  headers: Readonly<Record<string, string>>;
  url: URL;
} {
  const url = new URL(endpointUrl.toString());
  const body: Record<string, ProviderHttpCanonicalRequestPrimitive> = {};
  const headers: Record<string, string> = {};
  let dynamicPath = request.mapping.pathTemplate;

  for (const field of request.mapping.fields) {
    const value = request.values[field.source];
    if (value === undefined) {
      if (field.required) {
        throw new ProviderHttpExecutionMaterialError(
          "PROVIDER_HTTP_DYNAMIC_REQUEST_INVALID",
          traceId,
        );
      }
      continue;
    }

    if (field.target === "path") {
      const pathSegment = String(value);
      if (pathSegment === "." || pathSegment === "..") {
        throw new ProviderHttpExecutionMaterialError(
          "PROVIDER_HTTP_DYNAMIC_REQUEST_INVALID",
          traceId,
        );
      }
      dynamicPath = dynamicPath?.replace(
        `{${field.name}}`,
        encodeURIComponent(pathSegment),
      );
      continue;
    }
    if (field.target === "query") {
      if (url.searchParams.has(field.name)) {
        throw new ProviderHttpExecutionMaterialError(
          "PROVIDER_HTTP_DYNAMIC_REQUEST_CONFLICT",
          traceId,
        );
      }
      url.searchParams.append(field.name, String(value));
      continue;
    }
    if (field.target === "body") {
      body[field.name] = value;
      continue;
    }
    headers[field.name] = String(value);
  }

  if (dynamicPath) {
    if (dynamicPath.includes("{")) {
      throw new ProviderHttpExecutionMaterialError(
        "PROVIDER_HTTP_DYNAMIC_REQUEST_INVALID",
        traceId,
      );
    }
    const basePath = url.pathname === "/"
      ? ""
      : url.pathname.replace(/\/+$/, "");
    url.pathname = `${basePath}${dynamicPath}`;
  }

  return {
    body: Object.freeze(body),
    headers: Object.freeze(headers),
    url,
  };
}

function createOpaqueMaterial(
  values: StoredExecutionMaterial,
): ProviderHttpExecutionMaterial {
  const material = Object.freeze({}) as ProviderHttpExecutionMaterial;
  materialValues.set(material, {
    ...(values.body === undefined ? {} : { body: values.body }),
    environment: values.environment,
    headers: Object.freeze({ ...values.headers }),
    method: values.method,
    url: new URL(values.url.toString()),
  });
  materialBrands.add(material);
  return material;
}

async function lookupRequired(
  lookup: ProviderHttpMaterialLookup,
  key: string,
  traceId: string,
  signal?: AbortSignal,
): Promise<string> {
  const value = await lookupOptional(lookup, key, traceId, signal);

  if (value === undefined || value.trim().length === 0) {
    throw new ProviderHttpExecutionMaterialError(
      "PROVIDER_HTTP_MATERIAL_MISSING",
      traceId,
    );
  }

  return value;
}

async function lookupOptional(
  lookup: ProviderHttpMaterialLookup,
  key: string,
  traceId: string,
  signal?: AbortSignal,
): Promise<string | undefined> {
  try {
    assertNotAborted(signal, traceId);
    const value = await lookup.get(key, { ...(signal ? { signal } : {}) });
    assertNotAborted(signal, traceId);
    return typeof value === "string" ? value : undefined;
  } catch (error) {
    if (error instanceof ProviderHttpExecutionMaterialError) {
      throw error;
    }
    throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_LOOKUP_FAILED", traceId);
  }
}

function assertNotAborted(signal: AbortSignal | undefined, traceId: string): void {
  if (signal?.aborted) {
    throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_MATERIAL_DISPOSED", traceId);
  }
}

function resolveEndpointUrl(
  endpoint: string,
  environment: TaskVerificationEnvironment,
  policy: {
    approvedHost?: (hostname: string) => boolean;
    approvedHosts: ReadonlySet<string>;
    traceId: string;
  },
): URL {
  if (endpoint.length > 2_048 || /[\u0000-\u001f\u007f]/.test(endpoint)) {
    throw new ProviderHttpExecutionMaterialError(
      "PROVIDER_HTTP_ENDPOINT_POLICY_INVALID",
      policy.traceId,
    );
  }

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new ProviderHttpExecutionMaterialError(
      "PROVIDER_HTTP_ENDPOINT_POLICY_INVALID",
      policy.traceId,
    );
  }

  if (
    url.username
    || url.password
    || url.hash
    || hasSensitiveQuery(url)
    || (url.protocol !== "http:" && url.protocol !== "https:")
  ) {
    throw new ProviderHttpExecutionMaterialError(
      "PROVIDER_HTTP_ENDPOINT_POLICY_INVALID",
      policy.traceId,
    );
  }

  const hostname = url.hostname.toLowerCase();
  if (environment === "local" || environment === "stage") {
    if (hostname !== "127.0.0.1" && hostname !== "localhost") {
      throw new ProviderHttpExecutionMaterialError(
        "PROVIDER_HTTP_ENDPOINT_POLICY_INVALID",
        policy.traceId,
      );
    }
    return url;
  }

  if (url.protocol !== "https:") {
    throw new ProviderHttpExecutionMaterialError(
      "PROVIDER_HTTP_ENDPOINT_POLICY_INVALID",
      policy.traceId,
    );
  }

  const approved = policy.approvedHost?.(hostname) ?? policy.approvedHosts.has(hostname);
  if (!approved) {
    throw new ProviderHttpExecutionMaterialError(
      "PROVIDER_HTTP_ENDPOINT_HOST_NOT_APPROVED",
      policy.traceId,
    );
  }

  return url;
}

function resolveBody(
  configuredBody: string | undefined,
  dynamicBody: Readonly<Record<string, ProviderHttpCanonicalRequestPrimitive>> | undefined,
  method: ProviderHttpMethod,
  traceId: string,
): string | undefined {
  const hasDynamicBody = dynamicBody !== undefined && Object.keys(dynamicBody).length > 0;
  if ((configuredBody === undefined || configuredBody.length === 0) && !hasDynamicBody) {
    return undefined;
  }

  if (method === "GET") {
    throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_BODY_NOT_ALLOWED", traceId);
  }

  let resolvedBody = configuredBody;
  if (hasDynamicBody) {
    let configured: Record<string, unknown> = {};
    if (configuredBody !== undefined && configuredBody.length > 0) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(configuredBody);
      } catch {
        throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_BODY_INVALID", traceId);
      }
      if (!isPlainRecord(parsed)) {
        throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_BODY_INVALID", traceId);
      }
      configured = parsed;
    }
    if (Object.keys(dynamicBody!).some((name) =>
      Object.prototype.hasOwnProperty.call(configured, name))) {
      throw new ProviderHttpExecutionMaterialError(
        "PROVIDER_HTTP_DYNAMIC_REQUEST_CONFLICT",
        traceId,
      );
    }
    resolvedBody = JSON.stringify({ ...configured, ...dynamicBody });
  }

  if (!resolvedBody || byteLength(resolvedBody) > PROVIDER_HTTP_REQUEST_BODY_MAX_BYTES) {
    throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_BODY_TOO_LARGE", traceId);
  }

  try {
    JSON.parse(resolvedBody);
  } catch {
    throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_BODY_INVALID", traceId);
  }

  return resolvedBody;
}

function resolveHeaders(input: {
  allowedHeaderNames: ReadonlySet<string>;
  body?: string;
  configuredHeaders?: string;
  credential?: string;
  credentialHeaderName: string;
  credentialPrefix: string;
  dynamicHeaders?: Readonly<Record<string, string>>;
  traceId: string;
}): Readonly<Record<string, string>> {
  const headers = parseConfiguredHeaders(input.configuredHeaders, input.traceId);
  const normalized: Record<string, string> = {};

  for (const [rawName, value] of Object.entries(headers)) {
    const name = rawName.toLowerCase();
    assertHeaderName(name, input.traceId);

    if (
      FORBIDDEN_HEADER_NAMES.has(name)
      || name === "authorization"
      || name === "x-api-key"
      || !input.allowedHeaderNames.has(name)
    ) {
      throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_HEADER_UNSAFE", input.traceId);
    }
    assertHeaderValue(value, input.traceId);
    normalized[name] = value;
  }

  for (const [name, value] of Object.entries(input.dynamicHeaders ?? {})) {
    assertHeaderName(name, input.traceId);
    if (
      FORBIDDEN_HEADER_NAMES.has(name)
      || name === "authorization"
      || name === "content-type"
      || name === "x-api-key"
      || !input.allowedHeaderNames.has(name)
    ) {
      throw new ProviderHttpExecutionMaterialError(
        "PROVIDER_HTTP_HEADER_UNSAFE",
        input.traceId,
      );
    }
    if (normalized[name] !== undefined) {
      throw new ProviderHttpExecutionMaterialError(
        "PROVIDER_HTTP_DYNAMIC_REQUEST_CONFLICT",
        input.traceId,
      );
    }
    assertHeaderValue(value, input.traceId);
    normalized[name] = value;
  }

  if (input.credential !== undefined) {
    assertHeaderName(input.credentialHeaderName, input.traceId);
    if (FORBIDDEN_HEADER_NAMES.has(input.credentialHeaderName)) {
      throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_HEADER_UNSAFE", input.traceId);
    }
    assertHeaderValue(`${input.credentialPrefix}${input.credential}`, input.traceId);
    if (normalized[input.credentialHeaderName] !== undefined) {
      throw new ProviderHttpExecutionMaterialError(
        "PROVIDER_HTTP_DYNAMIC_REQUEST_CONFLICT",
        input.traceId,
      );
    }
    normalized[input.credentialHeaderName] = `${input.credentialPrefix}${input.credential}`;
  }

  const contentType = normalized["content-type"];
  if (contentType && !isJsonContentType(contentType)) {
    throw new ProviderHttpExecutionMaterialError(
      "PROVIDER_HTTP_CONTENT_TYPE_INVALID",
      input.traceId,
    );
  }

  if (input.body !== undefined) {
    normalized["content-type"] = contentType ?? "application/json";
  }

  normalized["x-trace-id"] = input.traceId;
  validateHeaderBounds(normalized, input.traceId);
  return Object.freeze(normalized);
}

function parseConfiguredHeaders(
  configuredHeaders: string | undefined,
  traceId: string,
): Record<string, string> {
  if (configuredHeaders === undefined || configuredHeaders.length === 0) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(configuredHeaders);
  } catch {
    throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_HEADERS_INVALID", traceId);
  }

  if (!isPlainRecord(parsed)) {
    throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_HEADERS_INVALID", traceId);
  }

  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(parsed)) {
    if (typeof value !== "string") {
      throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_HEADERS_INVALID", traceId);
    }
    headers[name] = value;
  }
  return headers;
}

function assertMethod(method: unknown, traceId: string): asserts method is ProviderHttpMethod {
  if (method !== "GET" && method !== "POST") {
    throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_METHOD_INVALID", traceId);
  }
}

function assertHeaderName(name: string, traceId: string): void {
  if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,64}$/.test(name)) {
    throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_HEADER_NAME_INVALID", traceId);
  }
}

function assertHeaderValue(value: string, traceId: string): void {
  if (
    byteLength(value) > PROVIDER_HTTP_HEADER_VALUE_MAX_BYTES
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_HEADER_VALUE_INVALID", traceId);
  }
}

function validateHeaderBounds(
  headers: Readonly<Record<string, string>>,
  traceId: string,
): void {
  const entries = Object.entries(headers);
  if (entries.length > PROVIDER_HTTP_HEADER_COUNT_MAX) {
    throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_HEADER_COUNT_EXCEEDED", traceId);
  }

  const totalBytes = entries.reduce(
    (total, [name, value]) => total + byteLength(name) + byteLength(value),
    0,
  );
  if (totalBytes > PROVIDER_HTTP_HEADER_TOTAL_MAX_BYTES) {
    throw new ProviderHttpExecutionMaterialError("PROVIDER_HTTP_HEADER_TOTAL_EXCEEDED", traceId);
  }
}

function hasSensitiveQuery(url: URL): boolean {
  for (const key of url.searchParams.keys()) {
    if (/authorization|credential|password|secret|signature|token|x-amz/i.test(key)) {
      return true;
    }
  }
  return false;
}

function isJsonContentType(value: string): boolean {
  const mediaType = value.split(";", 1)[0].trim().toLowerCase();
  return mediaType === "application/json" || /^application\/[a-z0-9.+-]+\+json$/.test(mediaType);
}

function createDiagnostic(
  code: ProviderHttpMaterialDiagnosticCode,
  traceId: string,
): ProviderHttpMaterialDiagnostic {
  return Object.freeze({ code, message: MATERIAL_MESSAGES[code], traceId: safeTraceId(traceId) });
}

function safeTraceId(value: unknown): string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)
    ? value
    : "trace-unavailable";
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function isCanonicalRequestTarget(
  value: unknown,
): value is ProviderHttpCanonicalRequestTarget {
  return value === "body" || value === "header" || value === "path" || value === "query";
}

function isValidMappingTargetName(
  target: ProviderHttpCanonicalRequestTarget,
  name: string,
): boolean {
  if (target === "path") {
    return /^[A-Za-z][A-Za-z0-9]{0,31}$/.test(name);
  }
  if (target === "header") {
    return /^[!#$%&'*+.^_`|~0-9a-z-]{1,64}$/.test(name)
      && !FORBIDDEN_HEADER_NAMES.has(name)
      && name !== "authorization"
      && name !== "content-type"
      && name !== "x-api-key"
      && name !== "x-trace-id";
  }
  if (
    target === "query"
    && /authorization|credential|password|secret|signature|token|x-amz/i.test(name)
  ) {
    return false;
  }
  return /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(name);
}

function isBoundedCanonicalPrimitive(
  value: unknown,
): value is ProviderHttpCanonicalRequestPrimitive {
  if (typeof value === "string") {
    return value.length > 0
      && byteLength(value) <= 1_024
      && !/[\u0000-\u001f\u007f]/.test(value);
  }
  if (typeof value === "number") {
    return Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;
  }
  return typeof value === "boolean";
}

function canonicalJson(value: unknown): string {
  if (value === undefined) {
    return "null";
  }
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const record = value as Readonly<Record<string, unknown>>;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
