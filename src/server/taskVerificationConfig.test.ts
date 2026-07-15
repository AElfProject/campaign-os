import { describe, expect, it } from "vitest";
import {
  TASK_VERIFICATION_APPROVED_ENABLEMENT,
  TASK_VERIFICATION_BINDING_ID_MAX_LENGTH,
  TASK_VERIFICATION_BINDINGS_JSON_ENV,
  TASK_VERIFICATION_CONFIG_JSON_MAX_BYTES,
  TASK_VERIFICATION_CREDENTIAL_ENV_KEY,
  TASK_VERIFICATION_ENABLEMENT_ENV,
  TASK_VERIFICATION_ENDPOINT_ENV_KEY,
  TASK_VERIFICATION_ENV_KEY_MAX_LENGTH,
  TASK_VERIFICATION_HEADER_ENV_KEY,
  TASK_VERIFICATION_MAX_ATTEMPTS_MAX,
  TASK_VERIFICATION_MAX_ATTEMPTS_MIN,
  TASK_VERIFICATION_MAX_BINDINGS,
  TASK_VERIFICATION_REQUEST_BODY_ENV_KEY,
  TASK_VERIFICATION_RESPONSE_MAX_BYTES_MAX,
  TASK_VERIFICATION_RESPONSE_MAX_BYTES_MIN,
  TASK_VERIFICATION_TIMEOUT_MS_MAX,
  TASK_VERIFICATION_TIMEOUT_MS_MIN,
  resolveTaskVerificationConfig,
  type TaskVerificationBinding,
  type TaskVerificationConfigInput,
  type TaskVerificationEnvironment,
} from "./taskVerificationConfig";

const materialEnv = {
  [TASK_VERIFICATION_ENDPOINT_ENV_KEY]: "http://127.0.0.1:4179/verify",
  [TASK_VERIFICATION_HEADER_ENV_KEY]: "{\"x-provider\":\"local\"}",
  [TASK_VERIFICATION_REQUEST_BODY_ENV_KEY]: "{\"walletRef\":\"wallet-ref:test\"}",
  [TASK_VERIFICATION_CREDENTIAL_ENV_KEY]: "local-credential-material",
} satisfies Record<string, string>;

const binding = (
  overrides: Partial<Record<keyof TaskVerificationBinding, unknown>> = {},
): Record<string, unknown> => ({
  bodyEnvKey: TASK_VERIFICATION_REQUEST_BODY_ENV_KEY,
  credentialEnvKey: TASK_VERIFICATION_CREDENTIAL_ENV_KEY,
  endpointEnvKey: TASK_VERIFICATION_ENDPOINT_ENV_KEY,
  headerEnvKey: TASK_VERIFICATION_HEADER_ENV_KEY,
  id: "aelfscan-mainnet",
  maxAttempts: 3,
  maxResponseBytes: 65_536,
  timeoutMs: 2_500,
  verificationType: "ON_CHAIN",
  ...overrides,
});

const resolve = ({
  bindings = [binding()],
  bindingsJson,
  enablement = TASK_VERIFICATION_APPROVED_ENABLEMENT,
  env = materialEnv,
  environment = "local",
  jsonParser,
}: {
  bindings?: unknown;
  bindingsJson?: string;
  enablement?: string;
  env?: Readonly<Record<string, string | undefined>>;
  environment?: TaskVerificationEnvironment;
  jsonParser?: (source: string) => unknown;
} = {}) => resolveTaskVerificationConfig({
  bindingsJson: bindingsJson ?? JSON.stringify(bindings),
  enablement,
  env,
  environment,
  jsonParser,
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

  it.each([undefined, "", "disabled"]) (
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
    ["missing field", [{ ...binding(), bodyEnvKey: undefined }], "TASK_VERIFICATION_SCHEMA_INVALID"],
    ["unknown field", [{ ...binding(), token: "raw-token" }], "TASK_VERIFICATION_UNKNOWN_FIELD"],
  ])("rejects non-exact schema: %s", (_case, bindings, expectedCode) => {
    const normalized = Array.isArray(bindings)
      ? bindings.map((entry) => {
        if (!entry || typeof entry !== "object" || !("bodyEnvKey" in entry)) {
          return entry;
        }

        const copy = { ...entry } as Record<string, unknown>;

        if (copy.bodyEnvKey === undefined) {
          delete copy.bodyEnvKey;
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
    const atLimit = Array.from({ length: TASK_VERIFICATION_MAX_BINDINGS }, (_, index) =>
      binding({ id: `provider-${String(index).padStart(2, "0")}` }));

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
      [TASK_VERIFICATION_ENDPOINT_ENV_KEY]: "https://provider.example/verify",
    };

    expect(resolve({ env: productionEnv, environment: "production" }).status).toBe("ready");

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
      });

      expect(config.enabled).toBe(false);
      expect(diagnosticCodes(config)).toEqual(["TASK_VERIFICATION_ENDPOINT_POLICY_INVALID"]);
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
    const bindings = Array.from({ length: TASK_VERIFICATION_MAX_BINDINGS }, (_, index) =>
      binding({ id: `provider-${String(index).padStart(2, "0")}` }));
    const config = resolve({ bindings });

    expect(config.getBinding("provider-00")?.id).toBe("provider-00");
    expect(config.getBinding("provider-31")?.id).toBe("provider-31");
    expect(config.getBinding("PROVIDER-31")).toBeUndefined();
    expect(Object.keys(config)).not.toContain("bindingById");
    expect(Object.values(config).some((value) => value instanceof Map)).toBe(false);
  });
});
