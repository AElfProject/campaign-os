import { describe, expect, it } from "vitest";
import {
  TASK_VERIFICATION_APPROVED_ENABLEMENT,
  TASK_VERIFICATION_BINDING_ID_MAX_LENGTH,
  TASK_VERIFICATION_BINDINGS_JSON_ENV,
  TASK_VERIFICATION_CONFIG_JSON_MAX_BYTES,
  TASK_VERIFICATION_CREDENTIAL_ENV_KEY,
  TASK_VERIFICATION_DEFAULT_MAX_ATTEMPTS,
  TASK_VERIFICATION_DEFAULT_RESPONSE_MAX_BYTES,
  TASK_VERIFICATION_DEFAULT_TIMEOUT_MS,
  TASK_VERIFICATION_ENABLEMENT_ENV,
  TASK_VERIFICATION_ENDPOINT_ENV_KEY,
  TASK_VERIFICATION_ENV_KEY_MAX_LENGTH,
  TASK_VERIFICATION_EXTERNAL_DISPATCH_LIMIT,
  TASK_VERIFICATION_HEADER_ENV_KEY,
  TASK_VERIFICATION_MAX_ATTEMPTS_MAX,
  TASK_VERIFICATION_MAX_ATTEMPTS_MIN,
  TASK_VERIFICATION_MAX_BINDINGS,
  TASK_VERIFICATION_PROVIDER_REFERENCE_MAX_LENGTH,
  TASK_VERIFICATION_REQUEST_BODY_ENV_KEY,
  TASK_VERIFICATION_RESPONSE_MAX_BYTES_MAX,
  TASK_VERIFICATION_RESPONSE_MAX_BYTES_MIN,
  TASK_VERIFICATION_TIMEOUT_MS_MAX,
  TASK_VERIFICATION_TIMEOUT_MS_MIN,
  createTaskVerificationConfigSummary,
  resolveTaskVerificationConfig,
  toProviderHttpBindingCompatibilityInput,
  type TaskVerificationBinding,
  type TaskVerificationConfigInput,
  type TaskVerificationEnvironment,
} from "./taskVerificationConfig";
import {
  providerHttpRuntimeProductionPreconditions,
  validateProviderHttpVerificationBindingCompatibility,
} from "./providerHttpRuntimeRegistry";
import { TASK_VERIFICATION_MAX_REVISION } from "./taskVerification";

const materialEnv = {
  [TASK_VERIFICATION_ENDPOINT_ENV_KEY]: "http://127.0.0.1:4179/verify",
  [TASK_VERIFICATION_HEADER_ENV_KEY]: "{\"x-provider\":\"local\"}",
  [TASK_VERIFICATION_REQUEST_BODY_ENV_KEY]: "{\"walletRef\":\"wallet-ref:test\"}",
  [TASK_VERIFICATION_CREDENTIAL_ENV_KEY]: "local-credential-material",
} satisfies Record<string, string>;

const productionReadyProviderHttpEnv = {
  CAMPAIGN_OS_PROVIDER_HTTP_CREDENTIAL_REF: "credential-ref:provider-http",
  CAMPAIGN_OS_PROVIDER_HTTP_ENDPOINT_REF: "config-ref:provider-http-endpoint",
  CAMPAIGN_OS_PROVIDER_HTTP_ENDPOINT_REGISTRY_REF: "config-ref:provider-http-registry",
  CAMPAIGN_OS_PROVIDER_HTTP_HEADER_REF: "header-ref:provider-http-auth",
  CAMPAIGN_OS_PROVIDER_HTTP_IDEMPOTENCY_REF: "idem-ref:provider-http",
  CAMPAIGN_OS_PROVIDER_HTTP_LEASE_REF: "lease-ref:provider-http",
  CAMPAIGN_OS_PROVIDER_HTTP_QUEUE_WORKER_HANDOFF: "config-ref:provider-http-worker",
  CAMPAIGN_OS_PROVIDER_HTTP_REDACTION_POLICY: "policy-ref:provider-http-redaction",
  CAMPAIGN_OS_PROVIDER_HTTP_RESPONSE_MAPPING_POLICY: "policy-ref:provider-http-response-map",
  CAMPAIGN_OS_PROVIDER_HTTP_RUNBOOK_REF: "runbook-ref:provider-http",
  CAMPAIGN_OS_PROVIDER_HTTP_RUNTIME_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_PROVIDER_HTTP_TIMEOUT_POLICY: "timeout-policy:2500ms",
  CAMPAIGN_OS_PROVIDER_HTTP_TRANSPORT_SEAM: "config-ref:provider-http-transport",
} satisfies Record<string, string>;

const binding = (
  overrides: Partial<Record<keyof TaskVerificationBinding, unknown>> = {},
): Record<string, unknown> => {
  const dappApi = overrides.verificationType === "DAPP_API";

  return {
    bodyEnvKey: TASK_VERIFICATION_REQUEST_BODY_ENV_KEY,
    credentialEnvKey: TASK_VERIFICATION_CREDENTIAL_ENV_KEY,
    degradationPolicy: "manual_review",
    enabled: true,
    endpointEnvKey: TASK_VERIFICATION_ENDPOINT_ENV_KEY,
    endpointId: dappApi
      ? "dapp-api-verification-status"
      : "aefinder-aelfscan-indexer-query",
    evidenceSource: dappApi ? "DAPP_API" : "AELFSCAN",
    headerEnvKey: TASK_VERIFICATION_HEADER_ENV_KEY,
    id: "aelfscan-mainnet",
    maxAttempts: 3,
    maxResponseBytes: 65_536,
    providerFamily: dappApi ? "ebridge" : "aefinder",
    providerGroupId: dappApi ? "dapp-api-adapters" : "aefinder-aelfscan-indexers",
    requestMappingId: dappApi
      ? "provider-http-request-map:dapp-api-status-v1"
      : "provider-http-request-map:on-chain-indexer-v1",
    responseMappingId: dappApi
      ? "provider-http-response-map:dapp-api-status-v1"
      : "provider-http-response-map:on-chain-indexer-v1",
    revision: 1,
    timeoutMs: 2_500,
    verificationType: "ON_CHAIN",
    ...overrides,
  };
};

const disabledShapeOnlyBinding = (index: number): Record<string, unknown> => {
  const suffix = String(index).padStart(2, "0");

  return binding({
    enabled: false,
    endpointId: `shape-only-endpoint-${suffix}`,
    id: `provider-${suffix}`,
    providerGroupId: `shape-only-group-${suffix}`,
    requestMappingId: `provider-http-request-map:shape-only-${suffix}`,
    responseMappingId: `provider-http-response-map:shape-only-${suffix}`,
  });
};

const resolve = ({
  bindings = [binding()],
  bindingsJson,
  enablement = TASK_VERIFICATION_APPROVED_ENABLEMENT,
  env = materialEnv,
  environment = "local",
  jsonParser,
  providerHttpTransportProvided,
}: {
  bindings?: unknown;
  bindingsJson?: string;
  enablement?: string;
  env?: Readonly<Record<string, string | undefined>>;
  environment?: TaskVerificationEnvironment;
  jsonParser?: (source: string) => unknown;
  providerHttpTransportProvided?: boolean;
} = {}) => resolveTaskVerificationConfig({
  bindingsJson: bindingsJson ?? JSON.stringify(bindings),
  enablement,
  env,
  environment,
  jsonParser,
  providerHttpTransportProvided,
});

const diagnosticCodes = (result: ReturnType<typeof resolveTaskVerificationConfig>) =>
  result.diagnostics.map(({ code }) => code);

describe("task verification binding config", () => {
  it("defaults to an immutable deny-all registry without consulting process.env", () => {
    const previousEnablement = process.env[TASK_VERIFICATION_ENABLEMENT_ENV];
    const previousBindings = process.env[TASK_VERIFICATION_BINDINGS_JSON_ENV];

    process.env[TASK_VERIFICATION_ENABLEMENT_ENV] = TASK_VERIFICATION_APPROVED_ENABLEMENT;
    process.env[TASK_VERIFICATION_BINDINGS_JSON_ENV] = JSON.stringify([binding()]);

    try {
      const config = resolveTaskVerificationConfig({
        env: {},
        environment: "local",
      });

      expect(config).toMatchObject({
        bindings: [],
        diagnostics: [],
        enabled: false,
        status: "disabled",
        valid: true,
      });
      expect(config.getBinding("aelfscan-mainnet")).toBeUndefined();
      expect(Object.isFrozen(config)).toBe(true);
      expect(Object.isFrozen(config.bindings)).toBe(true);
      expect(Object.isFrozen(config.diagnostics)).toBe(true);
    } finally {
      if (previousEnablement === undefined) {
        delete process.env[TASK_VERIFICATION_ENABLEMENT_ENV];
      } else {
        process.env[TASK_VERIFICATION_ENABLEMENT_ENV] = previousEnablement;
      }

      if (previousBindings === undefined) {
        delete process.env[TASK_VERIFICATION_BINDINGS_JSON_ENV];
      } else {
        process.env[TASK_VERIFICATION_BINDINGS_JSON_ENV] = previousBindings;
      }
    }
  });

  it.each([undefined, "", "0", "disabled"]) (
    "keeps verification deny-all for non-enabled syntax %j",
    (enablement) => {
      const input: TaskVerificationConfigInput = {
        env: {
          ...materialEnv,
          [TASK_VERIFICATION_BINDINGS_JSON_ENV]: JSON.stringify([binding()]),
          ...(enablement === undefined
            ? {}
            : { [TASK_VERIFICATION_ENABLEMENT_ENV]: enablement }),
        },
        environment: "local",
      };
      const config = resolveTaskVerificationConfig(input);

      expect(config).toMatchObject({
        bindings: [],
        enabled: false,
        status: "disabled",
        valid: true,
      });
    },
  );

  it.each([0, false])("keeps verification deny-all for direct switch %j", (enablement) => {
    const config = resolveTaskVerificationConfig({
      bindingsJson: JSON.stringify([binding()]),
      enablement,
      env: materialEnv,
      environment: "local",
    });

    expect(config).toMatchObject({
      bindings: [],
      enabled: false,
      status: "disabled",
      valid: true,
    });
  });

  it.each([
    "true",
    "1",
    "enabled",
    "EXPLICITLY-ENABLED",
    " explicitly-enabled",
    "explicitly-enabled ",
  ])("rejects unapproved enablement syntax %j", (enablement) => {
    const config = resolve({ enablement });

    expect(config).toMatchObject({
      bindings: [],
      enabled: false,
      status: "invalid",
      valid: false,
    });
    expect(diagnosticCodes(config)).toEqual(["TASK_VERIFICATION_ENABLEMENT_INVALID"]);
  });

  it("enables only an explicitly approved, valid binding set", () => {
    const config = resolve();

    expect(config).toMatchObject({
      diagnostics: [],
      enabled: true,
      status: "ready",
      valid: true,
    });
    expect(config.bindings).toEqual([binding()]);
    expect(config.getBinding("aelfscan-mainnet")).toEqual(binding());
    expect(config.getBinding("unknown-provider")).toBeUndefined();
  });

  it("pins the public timeout, ownership, response, and dispatch bounds", () => {
    expect(TASK_VERIFICATION_TIMEOUT_MS_MIN).toBe(100);
    expect(TASK_VERIFICATION_TIMEOUT_MS_MAX).toBe(10_000);
    expect(TASK_VERIFICATION_DEFAULT_TIMEOUT_MS).toBe(2_500);
    expect(TASK_VERIFICATION_MAX_ATTEMPTS_MIN).toBe(1);
    expect(TASK_VERIFICATION_MAX_ATTEMPTS_MAX).toBe(3);
    expect(TASK_VERIFICATION_DEFAULT_MAX_ATTEMPTS).toBe(3);
    expect(TASK_VERIFICATION_RESPONSE_MAX_BYTES_MAX).toBe(256 * 1024);
    expect(TASK_VERIFICATION_DEFAULT_RESPONSE_MAX_BYTES).toBe(256 * 1024);
    expect(TASK_VERIFICATION_EXTERNAL_DISPATCH_LIMIT).toBe(1);
  });

  it("defaults each omitted binding switch and policy to a deny-all safe posture", () => {
    const descriptor = binding();
    delete descriptor.enabled;
    delete descriptor.maxAttempts;
    delete descriptor.maxResponseBytes;
    delete descriptor.timeoutMs;
    delete descriptor.degradationPolicy;
    delete descriptor.revision;
    delete descriptor.bodyEnvKey;
    delete descriptor.headerEnvKey;
    delete descriptor.credentialEnvKey;

    const config = resolve({ bindings: [descriptor], env: {} });
    const normalized = config.getBinding("aelfscan-mainnet");

    expect(config.status).toBe("ready");
    expect(config.hasLiveBindings).toBe(false);
    expect(normalized).toMatchObject({
      degradationPolicy: "manual_review",
      enabled: false,
      maxAttempts: TASK_VERIFICATION_DEFAULT_MAX_ATTEMPTS,
      maxResponseBytes: TASK_VERIFICATION_DEFAULT_RESPONSE_MAX_BYTES,
      revision: 1,
      timeoutMs: TASK_VERIFICATION_DEFAULT_TIMEOUT_MS,
    });
    expect(config.resolveBinding("aelfscan-mainnet", "ON_CHAIN")).toMatchObject({
      diagnosticCode: "TASK_VERIFICATION_BINDING_DISABLED",
      status: "disabled",
    });
  });

  it.each([
    ["binding enablement", { enabled: "true" }, "TASK_VERIFICATION_BINDING_ENABLEMENT_INVALID"],
    ["binding revision zero", { revision: 0 }, "TASK_VERIFICATION_BINDING_REVISION_INVALID"],
    ["binding revision over max", { revision: TASK_VERIFICATION_MAX_REVISION + 1 }, "TASK_VERIFICATION_BINDING_REVISION_INVALID"],
    ["binding revision fractional", { revision: 1.5 }, "TASK_VERIFICATION_BINDING_REVISION_INVALID"],
    ["degradation policy", { degradationPolicy: "retry" }, "TASK_VERIFICATION_DEGRADATION_POLICY_INVALID"],
    ["evidence source", { evidenceSource: "RAW_PROVIDER" }, "TASK_VERIFICATION_EVIDENCE_SOURCE_INVALID"],
    ["provider family", { providerFamily: "unknown-provider" }, "TASK_VERIFICATION_PROVIDER_REFERENCE_INVALID"],
    ["provider group", { providerGroupId: "https://private.example/group" }, "TASK_VERIFICATION_PROVIDER_REFERENCE_INVALID"],
    ["endpoint ID", { endpointId: "endpoint id" }, "TASK_VERIFICATION_PROVIDER_REFERENCE_INVALID"],
    ["request mapping", { requestMappingId: "../request-map" }, "TASK_VERIFICATION_PROVIDER_REFERENCE_INVALID"],
    ["response mapping", { responseMappingId: "response-map\u0000secret" }, "TASK_VERIFICATION_PROVIDER_REFERENCE_INVALID"],
  ])("rejects invalid %s", (_case, overrides, expectedCode) => {
    const config = resolve({ bindings: [binding(overrides)] });

    expect(config).toMatchObject({ bindings: [], enabled: false, valid: false });
    expect(diagnosticCodes(config)).toEqual([expectedCode]);
  });

  it.each([
    ["ON_CHAIN", "DAPP_API"],
    ["DAPP_API", "AEFINDER"],
    ["DAPP_API", "AELFSCAN"],
  ])(
    "rejects evidence source %s/%s mismatches",
    (verificationType, evidenceSource) => {
      const config = resolve({
        bindings: [binding({ evidenceSource, verificationType })],
      });

      expect(diagnosticCodes(config)).toEqual([
        "TASK_VERIFICATION_EVIDENCE_SOURCE_INVALID",
      ]);
    },
  );

  it("accepts revision and binding policy boundaries", () => {
    const config = resolve({
      bindings: [binding({
        degradationPolicy: "blocked",
        revision: TASK_VERIFICATION_MAX_REVISION,
      })],
    });

    expect(config.getBinding("aelfscan-mainnet")).toMatchObject({
      degradationPolicy: "blocked",
      revision: TASK_VERIFICATION_MAX_REVISION,
    });
  });

  it("feeds the normalized safe binding directly into registry compatibility", () => {
    const config = resolve();
    const normalized = config.getBinding("aelfscan-mainnet")!;
    const compatibilityInput = toProviderHttpBindingCompatibilityInput(normalized);
    const compatibility = validateProviderHttpVerificationBindingCompatibility(
      compatibilityInput,
    );

    expect(compatibility).toMatchObject({
      bindingId: "aelfscan-mainnet",
      diagnosticCodes: [],
      status: "compatible",
      verificationType: "ON_CHAIN",
    });
    expect(config.resolveBinding("aelfscan-mainnet", "ON_CHAIN")).toEqual({
      binding: normalized,
      status: "resolved",
    });
    expect(config.resolveBinding("aelfscan-mainnet", "DAPP_API")).toMatchObject({
      diagnosticCode: "TASK_VERIFICATION_BINDING_TYPE_MISMATCH",
      status: "type_mismatch",
    });
    expect(createTaskVerificationConfigSummary(config)).toEqual({
      bindingCount: 1,
      bindingIds: ["aelfscan-mainnet"],
      diagnosticCodes: [],
      enabledBindingCount: 1,
      environment: "local",
      externalDispatchLimit: 1,
      status: "ready",
    });
    expect(JSON.stringify(compatibilityInput)).not.toContain("CAMPAIGN_OS_");
    expect(JSON.stringify(createTaskVerificationConfigSummary(config))).not.toContain("EnvKey");
  });

  it("reads explicit input before the supplied env adapter", () => {
    const config = resolveTaskVerificationConfig({
      bindingsJson: JSON.stringify([binding()]),
      enablement: TASK_VERIFICATION_APPROVED_ENABLEMENT,
      env: {
        ...materialEnv,
        [TASK_VERIFICATION_BINDINGS_JSON_ENV]: "not-json",
        [TASK_VERIFICATION_ENABLEMENT_ENV]: "disabled",
      },
      environment: "local",
    });

    expect(config.status).toBe("ready");
    expect(config.getBinding("aelfscan-mainnet")).toBeDefined();
  });

  it.each([
    ["top-level object", binding(), "TASK_VERIFICATION_SCHEMA_INVALID"],
    ["top-level null", null, "TASK_VERIFICATION_SCHEMA_INVALID"],
    ["empty enabled registry", [], "TASK_VERIFICATION_SCHEMA_INVALID"],
    ["primitive entry", ["provider"], "TASK_VERIFICATION_SCHEMA_INVALID"],
    ["null entry", [null], "TASK_VERIFICATION_SCHEMA_INVALID"],
    ["missing field", [{ ...binding(), endpointEnvKey: undefined }], "TASK_VERIFICATION_SCHEMA_INVALID"],
    ["unknown field", [{ ...binding(), token: "raw-token" }], "TASK_VERIFICATION_UNKNOWN_FIELD"],
  ])("rejects non-exact schema: %s", (_case, bindings, expectedCode) => {
    const normalized = Array.isArray(bindings)
      ? bindings.map((entry) => {
        if (!entry || typeof entry !== "object" || !("endpointEnvKey" in entry)) {
          return entry;
        }

        const copy = { ...entry } as Record<string, unknown>;

        if (copy.endpointEnvKey === undefined) {
          delete copy.endpointEnvKey;
        }

        return copy;
      })
      : bindings;
    const config = resolve({ bindings: normalized });

    expect(config.valid).toBe(false);
    expect(config.enabled).toBe(false);
    expect(config.bindings).toEqual([]);
    expect(diagnosticCodes(config)).toContain(expectedCode);
  });

  it("rejects symbol and non-enumerable fields from an injected parser", () => {
    const withSymbol = binding();
    const withHiddenField = binding();
    Object.defineProperty(withSymbol, Symbol("raw-secret-symbol"), {
      enumerable: true,
      value: "raw-secret-value",
    });
    Object.defineProperty(withHiddenField, "rawSecretHidden", {
      enumerable: false,
      value: "raw-secret-value",
    });

    for (const parsed of [[withSymbol], [withHiddenField]]) {
      const config = resolve({
        bindingsJson: "injected-parser-source",
        jsonParser: () => parsed,
      });

      expect(config.valid).toBe(false);
      expect(config.bindings).toEqual([]);
      expect(diagnosticCodes(config)).toEqual(["TASK_VERIFICATION_UNKNOWN_FIELD"]);
      expect(JSON.stringify(config)).not.toContain("raw-secret");
    }
  });

  it.each([
    ["WALLET"],
    ["SOCIAL"],
    ["MANUAL"],
    ["on_chain"],
    ["ON_CHAIN "],
    [1],
  ])("allows only ON_CHAIN and DAPP_API, rejecting %j", (verificationType) => {
    const config = resolve({ bindings: [binding({ verificationType })] });

    expect(config.valid).toBe(false);
    expect(diagnosticCodes(config)).toEqual(["TASK_VERIFICATION_TYPE_UNSUPPORTED"]);
  });

  it("accepts both supported verification types", () => {
    const config = resolve({
      bindings: [
        binding(),
        binding({ id: "dapp-api-mainnet", verificationType: "DAPP_API" }),
      ],
    });

    expect(config.bindings.map(({ verificationType }) => verificationType)).toEqual([
      "ON_CHAIN",
      "DAPP_API",
    ]);
  });

  it.each([
    ["empty", ""],
    ["uppercase", "Aelfscan"],
    ["whitespace", "aelfscan mainnet"],
    ["path", "../aelfscan"],
    ["control", "aelfscan\u0000mainnet"],
    ["non-string", 7],
    ["over limit", `a${"b".repeat(TASK_VERIFICATION_BINDING_ID_MAX_LENGTH)}`],
  ])("rejects %s binding IDs", (_case, id) => {
    const config = resolve({ bindings: [binding({ id })] });

    expect(diagnosticCodes(config)).toEqual(["TASK_VERIFICATION_ID_INVALID"]);
  });

  it("accepts binding IDs at the exact length boundary", () => {
    const id = `a${"b".repeat(TASK_VERIFICATION_BINDING_ID_MAX_LENGTH - 1)}`;

    expect(resolve({ bindings: [binding({ id })] }).getBinding(id)?.id).toBe(id);
  });

  it("bounds provider references inclusively", () => {
    const exactEndpointId = `a${"b".repeat(
      TASK_VERIFICATION_PROVIDER_REFERENCE_MAX_LENGTH - 1,
    )}`;
    const accepted = resolve({
      bindings: [binding({ enabled: false, endpointId: exactEndpointId })],
      env: {},
    });
    const rejected = resolve({
      bindings: [binding({
        enabled: false,
        endpointId: `${exactEndpointId}c`,
      })],
      env: {},
    });

    expect(accepted.getBinding("aelfscan-mainnet")?.endpointId).toBe(exactEndpointId);
    expect(diagnosticCodes(rejected)).toEqual([
      "TASK_VERIFICATION_PROVIDER_REFERENCE_INVALID",
    ]);
  });

  it.each([
    ["empty", ""],
    ["lowercase", "CAMPAIGN_OS_task_endpoint"],
    ["wrong prefix", "DATABASE_URL"],
    ["whitespace", "CAMPAIGN_OS_TASK ENDPOINT"],
    ["control", "CAMPAIGN_OS_TASK_ENDPOINT\nSECRET"],
    ["non-string", 42],
    ["over limit", `CAMPAIGN_OS_${"A".repeat(TASK_VERIFICATION_ENV_KEY_MAX_LENGTH - 11)}`],
  ])("rejects %s material env keys", (_case, endpointEnvKey) => {
    const config = resolve({ bindings: [binding({ endpointEnvKey })] });

    expect(diagnosticCodes(config)).toEqual(["TASK_VERIFICATION_ENV_KEY_INVALID"]);
  });

  it("accepts env keys at the exact length boundary", () => {
    const endpointEnvKey = `CAMPAIGN_OS_${"A".repeat(TASK_VERIFICATION_ENV_KEY_MAX_LENGTH - 12)}`;
    const config = resolve({
      bindings: [binding({ endpointEnvKey })],
      env: {
        ...materialEnv,
        [endpointEnvKey]: "http://localhost:4179/verify",
      },
    });

    expect(endpointEnvKey).toHaveLength(TASK_VERIFICATION_ENV_KEY_MAX_LENGTH);
    expect(config.getBinding("aelfscan-mainnet")?.endpointEnvKey).toBe(endpointEnvKey);
  });

  it.each([
    ["timeout below minimum", { timeoutMs: TASK_VERIFICATION_TIMEOUT_MS_MIN - 1 }, "TASK_VERIFICATION_TIMEOUT_INVALID"],
    ["timeout above maximum", { timeoutMs: TASK_VERIFICATION_TIMEOUT_MS_MAX + 1 }, "TASK_VERIFICATION_TIMEOUT_INVALID"],
    ["fractional timeout", { timeoutMs: 100.5 }, "TASK_VERIFICATION_TIMEOUT_INVALID"],
    ["string timeout", { timeoutMs: "2500" }, "TASK_VERIFICATION_TIMEOUT_INVALID"],
    ["attempts below minimum", { maxAttempts: TASK_VERIFICATION_MAX_ATTEMPTS_MIN - 1 }, "TASK_VERIFICATION_MAX_ATTEMPTS_INVALID"],
    ["attempts above maximum", { maxAttempts: TASK_VERIFICATION_MAX_ATTEMPTS_MAX + 1 }, "TASK_VERIFICATION_MAX_ATTEMPTS_INVALID"],
    ["fractional attempts", { maxAttempts: 1.5 }, "TASK_VERIFICATION_MAX_ATTEMPTS_INVALID"],
    ["response below minimum", { maxResponseBytes: TASK_VERIFICATION_RESPONSE_MAX_BYTES_MIN - 1 }, "TASK_VERIFICATION_RESPONSE_LIMIT_INVALID"],
    ["response above maximum", { maxResponseBytes: TASK_VERIFICATION_RESPONSE_MAX_BYTES_MAX + 1 }, "TASK_VERIFICATION_RESPONSE_LIMIT_INVALID"],
    ["fractional response", { maxResponseBytes: 1024.5 }, "TASK_VERIFICATION_RESPONSE_LIMIT_INVALID"],
  ])("rejects numeric policy outside bounds: %s", (_case, overrides, expectedCode) => {
    const config = resolve({ bindings: [binding(overrides)] });

    expect(diagnosticCodes(config)).toEqual([expectedCode]);
  });

  it("accepts timeout, attempt, and response bounds inclusively", () => {
    const config = resolve({
      bindings: [
        binding({
          maxAttempts: TASK_VERIFICATION_MAX_ATTEMPTS_MIN,
          maxResponseBytes: TASK_VERIFICATION_RESPONSE_MAX_BYTES_MIN,
          timeoutMs: TASK_VERIFICATION_TIMEOUT_MS_MIN,
        }),
        binding({
          id: "dapp-api-max-policy",
          maxAttempts: TASK_VERIFICATION_MAX_ATTEMPTS_MAX,
          maxResponseBytes: TASK_VERIFICATION_RESPONSE_MAX_BYTES_MAX,
          timeoutMs: TASK_VERIFICATION_TIMEOUT_MS_MAX,
          verificationType: "DAPP_API",
        }),
      ],
    });

    expect(config.status).toBe("ready");
    expect(config.bindings).toHaveLength(2);
  });

  it("accepts exactly 32 entries and rejects the 33rd before partial activation", () => {
    const atLimit = Array.from(
      { length: TASK_VERIFICATION_MAX_BINDINGS },
      (_, index) => disabledShapeOnlyBinding(index),
    );

    expect(resolve({ bindings: atLimit }).bindings).toHaveLength(TASK_VERIFICATION_MAX_BINDINGS);

    const overLimit = resolve({
      bindings: [...atLimit, binding({ id: "provider-over-limit" })],
    });

    expect(overLimit).toMatchObject({ bindings: [], enabled: false, valid: false });
    expect(diagnosticCodes(overLimit)).toEqual(["TASK_VERIFICATION_ENTRY_LIMIT_EXCEEDED"]);
  });

  it("bounds config JSON by UTF-8 bytes before invoking the parser", () => {
    let parserCalls = 0;
    const source = JSON.stringify([binding()]);
    const sourceBytes = new TextEncoder().encode(source).byteLength;
    const exact = `${source}${" ".repeat(TASK_VERIFICATION_CONFIG_JSON_MAX_BYTES - sourceBytes)}`;
    const over = `${exact}x`;

    const exactConfig = resolve({
      bindingsJson: exact,
      jsonParser: (source) => {
        parserCalls += 1;
        return JSON.parse(source);
      },
    });
    const overConfig = resolve({
      bindingsJson: over,
      jsonParser: () => {
        parserCalls += 1;
        return [];
      },
    });

    expect(exactConfig.status).toBe("ready");
    expect(diagnosticCodes(overConfig)).toEqual(["TASK_VERIFICATION_JSON_TOO_LARGE"]);
    expect(parserCalls).toBe(1);
  });

  it("counts multi-byte config source by UTF-8 bytes instead of characters", () => {
    let parserCalls = 0;
    const overByteLimit = `"${"界".repeat(Math.ceil(TASK_VERIFICATION_CONFIG_JSON_MAX_BYTES / 3))}"`;
    const config = resolve({
      bindingsJson: overByteLimit,
      jsonParser: () => {
        parserCalls += 1;
        return [binding()];
      },
    });

    expect(overByteLimit.length).toBeLessThan(TASK_VERIFICATION_CONFIG_JSON_MAX_BYTES);
    expect(diagnosticCodes(config)).toEqual(["TASK_VERIFICATION_JSON_TOO_LARGE"]);
    expect(parserCalls).toBe(0);
  });

  it("fails the whole registry atomically for one invalid or duplicate entry", () => {
    const invalidTail = resolve({
      bindings: [binding(), binding({ id: "invalid-tail", timeoutMs: 0 })],
    });
    const duplicate = resolve({
      bindings: [binding(), binding({ verificationType: "DAPP_API" })],
    });

    for (const config of [invalidTail, duplicate]) {
      expect(config.enabled).toBe(false);
      expect(config.valid).toBe(false);
      expect(config.bindings).toEqual([]);
      expect(config.getBinding("aelfscan-mainnet")).toBeUndefined();
    }

    expect(diagnosticCodes(invalidTail)).toEqual(["TASK_VERIFICATION_TIMEOUT_INVALID"]);
    expect(diagnosticCodes(duplicate)).toEqual(["TASK_VERIFICATION_ID_CONFLICT"]);
  });

  it("rejects duplicate strategy tuples and enabled unknown mappings atomically", () => {
    const duplicateStrategy = resolve({
      bindings: [binding(), binding({ id: "same-strategy-other-id" })],
    });
    const unknownMapping = resolve({
      bindings: [binding({
        requestMappingId: "provider-http-request-map:unknown-v1",
        responseMappingId: "provider-http-response-map:unknown-v1",
      })],
    });

    expect(duplicateStrategy).toMatchObject({ bindings: [], enabled: false, valid: false });
    expect(diagnosticCodes(duplicateStrategy)).toEqual([
      "TASK_VERIFICATION_STRATEGY_CONFLICT",
    ]);
    expect(unknownMapping).toMatchObject({ bindings: [], enabled: false, valid: false });
    expect(diagnosticCodes(unknownMapping)).toEqual([
      "TASK_VERIFICATION_REGISTRY_INCOMPATIBLE",
    ]);
  });

  it("allows disabled shape-only mappings without endpoint material or live compatibility", () => {
    const config = resolve({
      bindings: [binding({
        enabled: false,
        endpointId: "future-provider-endpoint",
        requestMappingId: "provider-http-request-map:future-v1",
        responseMappingId: "provider-http-response-map:future-v1",
      })],
      env: {},
    });

    expect(config).toMatchObject({
      enabled: true,
      hasLiveBindings: false,
      status: "ready",
      valid: true,
    });
    expect(config.getBinding("aelfscan-mainnet")?.enabled).toBe(false);
  });

  it.each(["local", "stage"] satisfies TaskVerificationEnvironment[])(
    "requires loopback endpoint material in %s",
    (environment) => {
      const accepted = [
        "http://localhost:4179/verify",
        "https://service.localhost/verify",
        "http://127.0.0.42:4179/verify",
        "http://[::1]:4179/verify",
      ];

      for (const endpoint of accepted) {
        expect(resolve({
          env: { ...materialEnv, [TASK_VERIFICATION_ENDPOINT_ENV_KEY]: endpoint },
          environment,
        }).status).toBe("ready");
      }

      const rejected = resolve({
        env: {
          ...materialEnv,
          [TASK_VERIFICATION_ENDPOINT_ENV_KEY]: "https://provider.example/verify",
        },
        environment,
      });

      expect(rejected.enabled).toBe(false);
      expect(diagnosticCodes(rejected)).toEqual(["TASK_VERIFICATION_ENDPOINT_POLICY_INVALID"]);
    },
  );

  it("requires a non-loopback HTTPS endpoint descriptor in production", () => {
    const productionEnv = {
      ...materialEnv,
      ...productionReadyProviderHttpEnv,
      [TASK_VERIFICATION_ENDPOINT_ENV_KEY]: "https://provider.example/verify",
    };

    expect(resolve({
      env: productionEnv,
      environment: "production",
      providerHttpTransportProvided: true,
    }).status).toBe("ready");

    for (const endpoint of [
      "http://provider.example/verify",
      "https://localhost/verify",
      "https://127.0.0.1/verify",
      "https://user:password@provider.example/verify",
      "https://provider.example/verify#credential",
      "not-an-endpoint",
    ]) {
      const config = resolve({
        env: { ...productionEnv, [TASK_VERIFICATION_ENDPOINT_ENV_KEY]: endpoint },
        environment: "production",
        providerHttpTransportProvided: true,
      });

      expect(config.enabled).toBe(false);
      expect(diagnosticCodes(config)).toEqual(["TASK_VERIFICATION_ENDPOINT_POLICY_INVALID"]);
    }
  });

  it("keeps production no-live until every existing Provider HTTP precondition passes", () => {
    const productionEnv = {
      ...materialEnv,
      ...productionReadyProviderHttpEnv,
      [TASK_VERIFICATION_ENDPOINT_ENV_KEY]: "https://provider.example/verify",
    };
    const withoutInjectedTransport = resolve({
      env: productionEnv,
      environment: "production",
      providerHttpTransportProvided: false,
    });

    expect(diagnosticCodes(withoutInjectedTransport)).toEqual([
      "TASK_VERIFICATION_PRODUCTION_RUNTIME_NOT_READY",
    ]);

    for (const precondition of providerHttpRuntimeProductionPreconditions) {
      const env: Record<string, string | undefined> = { ...productionEnv };

      for (const key of precondition.requiredConfigKeys) {
        delete env[key];
      }

      const config = resolve({
        env,
        environment: "production",
        providerHttpTransportProvided: true,
      });

      expect(diagnosticCodes(config), precondition.id).toEqual([
        "TASK_VERIFICATION_PRODUCTION_RUNTIME_NOT_READY",
      ]);
    }
  });

  it("requires every referenced material without parsing or returning its value", () => {
    for (const missingKey of [
      TASK_VERIFICATION_ENDPOINT_ENV_KEY,
      TASK_VERIFICATION_HEADER_ENV_KEY,
      TASK_VERIFICATION_REQUEST_BODY_ENV_KEY,
      TASK_VERIFICATION_CREDENTIAL_ENV_KEY,
    ]) {
      const env: Record<string, string | undefined> = { ...materialEnv };
      delete env[missingKey];
      const config = resolve({ env });

      expect(config.enabled).toBe(false);
      expect(diagnosticCodes(config)).toEqual(["TASK_VERIFICATION_MATERIAL_MISSING"]);
    }

    const config = resolve();
    const serialized = JSON.stringify(config);

    for (const material of Object.values(materialEnv)) {
      expect(serialized).not.toContain(material);
    }
  });

  it("requires only optional material references that are present", () => {
    const descriptor = binding();
    delete descriptor.bodyEnvKey;
    delete descriptor.headerEnvKey;
    delete descriptor.credentialEnvKey;

    const endpointOnly = resolve({
      bindings: [descriptor],
      env: {
        [TASK_VERIFICATION_ENDPOINT_ENV_KEY]: materialEnv[TASK_VERIFICATION_ENDPOINT_ENV_KEY],
      },
    });
    const missingReferencedHeader = resolve({
      bindings: [{
        ...descriptor,
        headerEnvKey: TASK_VERIFICATION_HEADER_ENV_KEY,
      }],
      env: {
        [TASK_VERIFICATION_ENDPOINT_ENV_KEY]: materialEnv[TASK_VERIFICATION_ENDPOINT_ENV_KEY],
      },
    });

    expect(endpointOnly.status).toBe("ready");
    expect(diagnosticCodes(missingReferencedHeader)).toEqual([
      "TASK_VERIFICATION_MATERIAL_MISSING",
    ]);
  });

  it("returns secret-corpus-safe diagnostics with zero material hits", () => {
    const secretCorpus = [
      "raw-token-243",
      "Bearer private-credential-243",
      "wallet-address-private-243",
      "https://user:password@private.example/verify?token=query-secret-243",
      "/Users/private/task-verification.json",
      "stack-private-marker-243",
    ];
    const opaque = new Error(secretCorpus.join(" "));
    opaque.stack = `${secretCorpus[secretCorpus.length - 1]} ${opaque.stack}`;
    const unknownField = `token-${secretCorpus[0]}`;
    const unknownEntry = binding();
    unknownEntry[unknownField] = secretCorpus[1];
    const failures = [
      resolve({ enablement: secretCorpus[0] }),
      resolve({ bindingsJson: `[{\"id\":\"${secretCorpus[2]}\",\"token\":\"${secretCorpus[0]}\"` }),
      resolve({ bindings: [unknownEntry] }),
      resolve({
        bindingsJson: "opaque-parser-input",
        jsonParser: () => {
          throw opaque;
        },
      }),
      resolve({
        env: {
          ...materialEnv,
          [TASK_VERIFICATION_ENDPOINT_ENV_KEY]: secretCorpus[3],
          [TASK_VERIFICATION_HEADER_ENV_KEY]: secretCorpus[1],
          [TASK_VERIFICATION_REQUEST_BODY_ENV_KEY]: secretCorpus[2],
          [TASK_VERIFICATION_CREDENTIAL_ENV_KEY]: secretCorpus[0],
        },
        environment: "production",
      }),
    ];

    for (const config of failures) {
      expect(config.valid).toBe(false);
      const rendered = `${JSON.stringify(config)} ${String(config.diagnostics)}`.toLowerCase();

      for (const secret of secretCorpus) {
        expect(rendered).not.toContain(secret.toLowerCase());
      }
    }
  });

  it.each([
    ["id", "TASK_VERIFICATION_ID_INVALID"],
    ["endpointId", "TASK_VERIFICATION_PROVIDER_REFERENCE_INVALID"],
    ["providerGroupId", "TASK_VERIFICATION_PROVIDER_REFERENCE_INVALID"],
    ["requestMappingId", "TASK_VERIFICATION_PROVIDER_REFERENCE_INVALID"],
    ["responseMappingId", "TASK_VERIFICATION_PROVIDER_REFERENCE_INVALID"],
  ] as const)(
    "rejects secret-like material in disabled %s before it reaches a safe summary",
    (field, expectedCode) => {
      const secretLikeId = "raw-secret-token-243";
      const config = resolve({
        bindings: [binding({ enabled: false, [field]: secretLikeId })],
        env: {},
      });
      const serialized = JSON.stringify({
        config,
        summary: createTaskVerificationConfigSummary(config),
      });

      expect(diagnosticCodes(config)).toEqual([expectedCode]);
      expect(serialized).not.toContain(secretLikeId);
    },
  );

  it("defensively copies and deeply freezes parsed descriptors", () => {
    const parsed = [binding()];
    const env = { ...materialEnv };
    const config = resolve({
      bindingsJson: "injected-parser-source",
      env,
      jsonParser: () => parsed,
    });
    const resolved = config.getBinding("aelfscan-mainnet");

    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.bindings)).toBe(true);
    expect(Object.isFrozen(config.diagnostics)).toBe(true);
    expect(Object.isFrozen(config.bindings[0])).toBe(true);
    expect(Object.isFrozen(resolved)).toBe(true);

    parsed[0]!.id = "mutated-provider";
    env[TASK_VERIFICATION_ENDPOINT_ENV_KEY] = "https://mutated.example/private";

    expect(config.getBinding("aelfscan-mainnet")?.id).toBe("aelfscan-mainnet");
    expect(config.getBinding("mutated-provider")).toBeUndefined();
    expect(JSON.stringify(config)).not.toContain("mutated.example");
  });

  it("uses exact-ID Map lookup and never exposes the mutable index", () => {
    const bindings = Array.from(
      { length: TASK_VERIFICATION_MAX_BINDINGS },
      (_, index) => disabledShapeOnlyBinding(index),
    );
    const config = resolve({ bindings });

    expect(config.getBinding("provider-00")?.id).toBe("provider-00");
    expect(config.getBinding("provider-31")?.id).toBe("provider-31");
    expect(config.getBinding("PROVIDER-31")).toBeUndefined();
    expect(Object.keys(config)).not.toContain("bindingById");
    expect(Object.values(config).some((value) => value instanceof Map)).toBe(false);
  });
});
