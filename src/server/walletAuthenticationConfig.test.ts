import { describe, expect, it } from "vitest";
import {
  WALLET_AUTH_ABSOLUTE_TTL_SECONDS_MAX,
  WALLET_AUTH_ABSOLUTE_TTL_SECONDS_MIN,
  WALLET_AUTH_BINDINGS_JSON_MAX_BYTES,
  WALLET_AUTH_CHALLENGE_REQUEST_BYTES_MAX,
  WALLET_AUTH_CHALLENGE_REQUEST_BYTES_MIN,
  WALLET_AUTH_CHALLENGE_TTL_SECONDS_MAX,
  WALLET_AUTH_CHALLENGE_TTL_SECONDS_MIN,
  WALLET_AUTH_CLOCK_SKEW_SECONDS_MAX,
  WALLET_AUTH_CLOCK_SKEW_SECONDS_MIN,
  WALLET_AUTH_IDLE_TTL_SECONDS_MAX,
  WALLET_AUTH_IDLE_TTL_SECONDS_MIN,
  WALLET_AUTH_MAX_ACTIVE_CHALLENGES_MAX,
  WALLET_AUTH_MAX_ACTIVE_CHALLENGES_MIN,
  WALLET_AUTH_MAX_SESSIONS_PER_SUBJECT_MAX,
  WALLET_AUTH_MAX_SESSIONS_PER_SUBJECT_MIN,
  WALLET_AUTH_MAX_VERIFICATION_ATTEMPTS_MAX,
  WALLET_AUTH_MAX_VERIFICATION_ATTEMPTS_MIN,
  WALLET_AUTH_PROOF_BYTES_MAX,
  WALLET_AUTH_PROOF_BYTES_MIN,
  WALLET_AUTH_SESSION_TOUCH_SECONDS_MAX,
  WALLET_AUTH_SESSION_TOUCH_SECONDS_MIN,
  WALLET_AUTH_SHUTDOWN_TIMEOUT_MS_MAX,
  WALLET_AUTH_SHUTDOWN_TIMEOUT_MS_MIN,
  resolveWalletAuthenticationConfig,
  summarizeWalletAuthenticationConfig,
} from "./walletAuthenticationConfig";

const eoaBinding = {
  accountType: "EOA",
  adapterId: "portkey-discover-eoa",
  chainIds: ["AELF"],
  enabled: true,
  hashStrategyId: "aelf-web-login-discover-v1",
  network: "testnet",
  productionApproved: false,
  proofMethod: "AELF_EOA_RECOVERABLE",
  signatureEncoding: "AELF_RECOVERABLE_HEX",
  walletSource: "PORTKEY_EOA_APP",
} as const;

const aaBinding = {
  accountType: "AA",
  adapterId: "portkey-aa",
  caRelationProviderId: "stage-portkey-ca",
  chainIds: ["AELF"],
  enabled: true,
  hashStrategyId: "aelf-web-login-portkey-aa-v1",
  network: "testnet",
  productionApproved: false,
  proofMethod: "PORTKEY_AA_MANAGER_CA",
  signatureEncoding: "AELF_RECOVERABLE_HEX",
  walletSource: "PORTKEY_AA",
} as const;

const stageEnv = (overrides: Readonly<Record<string, string | undefined>> = {}) => ({
  CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
  CAMPAIGN_OS_PORTKEY_CA_RELATION_PROVIDERS_JSON: JSON.stringify([
    {
      enabled: true,
      endpointEnvKey: "CAMPAIGN_OS_PORTKEY_CA_RELATION_URL",
      id: "stage-portkey-ca",
      productionApproved: false,
      timeoutMs: 1_000,
    },
  ]),
  CAMPAIGN_OS_PORTKEY_CA_RELATION_URL: "http://127.0.0.1:5195/relations/verify",
  CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS: "http://127.0.0.1:5193",
  CAMPAIGN_OS_WALLET_AUTH_ALLOW_INSECURE_LOOPBACK_COOKIE: "1",
  CAMPAIGN_OS_WALLET_AUTH_BINDINGS_JSON: JSON.stringify([eoaBinding, aaBinding]),
  CAMPAIGN_OS_WALLET_AUTH_CSRF_SECRET: "x".repeat(32),
  CAMPAIGN_OS_WALLET_AUTH_ENABLED: "1",
  CAMPAIGN_OS_WALLET_AUTH_ENVIRONMENT: "stage",
  ...overrides,
});

const diagnosticCodes = (env: Readonly<Record<string, string | undefined>>) =>
  resolveWalletAuthenticationConfig({ env }).diagnostics.map(({ code }) => code);

const csrfSecretMaxBytes = 4_096;
const caEndpointMaxBytes = 2_048;
const utf8ByteLength = (value: string) => new TextEncoder().encode(value).byteLength;

describe("wallet authentication config", () => {
  it.each([
    ["missing", undefined],
    ["blank", ""],
    ["false", "false"],
    ["zero", "0"],
  ])("keeps live authentication disabled for a %s global flag", (_label, enabled) => {
    const config = resolveWalletAuthenticationConfig({
      env: enabled === undefined ? {} : { CAMPAIGN_OS_WALLET_AUTH_ENABLED: enabled },
    });

    expect(config).toMatchObject({
      bindings: [],
      enabled: false,
      productionReady: false,
      status: "disabled",
      valid: true,
    });
    expect(config.resolveBinding("portkey-aa")).toMatchObject({
      diagnosticCode: "WALLET_AUTH_DISABLED",
      status: "disabled",
    });
    expect(config).not.toHaveProperty("csrfSecret");
  });

  it.each([
    ["missing", undefined],
    ["blank", ""],
    ["false", "false"],
    ["zero", "0"],
  ])("short-circuits a %s disabled flag before malformed optional environment", (_label, enabled) => {
    const config = resolveWalletAuthenticationConfig({
      env: {
        CAMPAIGN_OS_WALLET_AUTH_ENABLED: enabled,
        CAMPAIGN_OS_WALLET_AUTH_ENVIRONMENT: "malformed-environment",
      },
    });

    expect(config).toMatchObject({
      diagnostics: [],
      enabled: false,
      environment: "local",
      productionReady: false,
      status: "disabled",
      valid: true,
    });
  });

  it.each([
    ["bindings malformed", { CAMPAIGN_OS_WALLET_AUTH_BINDINGS_JSON: "[{" }, "WALLET_AUTH_JSON_INVALID"],
    ["bindings wrong shape", { CAMPAIGN_OS_WALLET_AUTH_BINDINGS_JSON: "{}" }, "WALLET_AUTH_JSON_SHAPE_INVALID"],
    [
      "binding unknown field",
      { CAMPAIGN_OS_WALLET_AUTH_BINDINGS_JSON: JSON.stringify([{ ...eoaBinding, endpoint: "https://private.invalid" }]) },
      "WALLET_AUTH_UNKNOWN_FIELD",
    ],
    [
      "duplicate adapter",
      { CAMPAIGN_OS_WALLET_AUTH_BINDINGS_JSON: JSON.stringify([eoaBinding, eoaBinding]) },
      "WALLET_AUTH_ADAPTER_ID_CONFLICT",
    ],
    ["providers malformed", { CAMPAIGN_OS_PORTKEY_CA_RELATION_PROVIDERS_JSON: "nope" }, "WALLET_AUTH_JSON_INVALID"],
    ["providers wrong shape", { CAMPAIGN_OS_PORTKEY_CA_RELATION_PROVIDERS_JSON: "{}" }, "WALLET_AUTH_JSON_SHAPE_INVALID"],
    [
      "provider unknown field",
      {
        CAMPAIGN_OS_PORTKEY_CA_RELATION_PROVIDERS_JSON: JSON.stringify([{
          enabled: true,
          endpointEnvKey: "CAMPAIGN_OS_PORTKEY_CA_RELATION_URL",
          id: "stage-portkey-ca",
          productionApproved: false,
          rawEndpoint: "https://private.invalid",
          timeoutMs: 1_000,
        }]),
      },
      "WALLET_AUTH_UNKNOWN_FIELD",
    ],
    [
      "duplicate provider",
      {
        CAMPAIGN_OS_PORTKEY_CA_RELATION_PROVIDERS_JSON: JSON.stringify([
          {
            enabled: true,
            endpointEnvKey: "CAMPAIGN_OS_PORTKEY_CA_RELATION_URL",
            id: "stage-portkey-ca",
            productionApproved: false,
            timeoutMs: 1_000,
          },
          {
            enabled: true,
            endpointEnvKey: "CAMPAIGN_OS_PORTKEY_CA_RELATION_URL",
            id: "stage-portkey-ca",
            productionApproved: false,
            timeoutMs: 1_000,
          },
        ]),
      },
      "WALLET_AUTH_CA_PROVIDER_ID_CONFLICT",
    ],
  ])("rejects the entire live config for %s", (_label, overrides, code) => {
    const config = resolveWalletAuthenticationConfig({ env: stageEnv(overrides) });

    expect(config).toMatchObject({ bindings: [], enabled: false, status: "invalid", valid: false });
    expect(config.diagnostics.map(({ code: actualCode }) => actualCode)).toContain(code);
  });

  it("rejects oversized JSON before parsing it", () => {
    const parseCalls: string[] = [];
    const config = resolveWalletAuthenticationConfig({
      env: stageEnv({
        CAMPAIGN_OS_WALLET_AUTH_BINDINGS_JSON: "[" + " ".repeat(WALLET_AUTH_BINDINGS_JSON_MAX_BYTES) + "]",
      }),
      jsonParser: (source) => {
        parseCalls.push(source);
        return [];
      },
    });

    expect(config.status).toBe("invalid");
    expect(config.diagnostics.map(({ code }) => code)).toContain("WALLET_AUTH_JSON_TOO_LARGE");
    expect(parseCalls).toHaveLength(0);
  });

  it.each([
    ["CAMPAIGN_OS_WALLET_AUTH_CHALLENGE_TTL_SECONDS", WALLET_AUTH_CHALLENGE_TTL_SECONDS_MIN, WALLET_AUTH_CHALLENGE_TTL_SECONDS_MAX],
    ["CAMPAIGN_OS_WALLET_AUTH_CLOCK_SKEW_SECONDS", WALLET_AUTH_CLOCK_SKEW_SECONDS_MIN, WALLET_AUTH_CLOCK_SKEW_SECONDS_MAX],
    ["CAMPAIGN_OS_WALLET_AUTH_MAX_ACTIVE_CHALLENGES", WALLET_AUTH_MAX_ACTIVE_CHALLENGES_MIN, WALLET_AUTH_MAX_ACTIVE_CHALLENGES_MAX],
    ["CAMPAIGN_OS_WALLET_AUTH_MAX_VERIFICATION_ATTEMPTS", WALLET_AUTH_MAX_VERIFICATION_ATTEMPTS_MIN, WALLET_AUTH_MAX_VERIFICATION_ATTEMPTS_MAX],
    ["CAMPAIGN_OS_WALLET_AUTH_IDLE_TTL_SECONDS", WALLET_AUTH_IDLE_TTL_SECONDS_MIN, WALLET_AUTH_IDLE_TTL_SECONDS_MAX],
    ["CAMPAIGN_OS_WALLET_AUTH_ABSOLUTE_TTL_SECONDS", WALLET_AUTH_ABSOLUTE_TTL_SECONDS_MIN, WALLET_AUTH_ABSOLUTE_TTL_SECONDS_MAX],
    ["CAMPAIGN_OS_WALLET_AUTH_MAX_SESSIONS_PER_SUBJECT", WALLET_AUTH_MAX_SESSIONS_PER_SUBJECT_MIN, WALLET_AUTH_MAX_SESSIONS_PER_SUBJECT_MAX],
    ["CAMPAIGN_OS_WALLET_AUTH_SESSION_TOUCH_INTERVAL_SECONDS", WALLET_AUTH_SESSION_TOUCH_SECONDS_MIN, WALLET_AUTH_SESSION_TOUCH_SECONDS_MAX],
    ["CAMPAIGN_OS_WALLET_AUTH_CHALLENGE_REQUEST_MAX_BYTES", WALLET_AUTH_CHALLENGE_REQUEST_BYTES_MIN, WALLET_AUTH_CHALLENGE_REQUEST_BYTES_MAX],
    ["CAMPAIGN_OS_WALLET_AUTH_PROOF_MAX_BYTES", WALLET_AUTH_PROOF_BYTES_MIN, WALLET_AUTH_PROOF_BYTES_MAX],
    ["CAMPAIGN_OS_WALLET_AUTH_SHUTDOWN_TIMEOUT_MS", WALLET_AUTH_SHUTDOWN_TIMEOUT_MS_MIN, WALLET_AUTH_SHUTDOWN_TIMEOUT_MS_MAX],
  ])("accepts min/max and rejects limit+1 for %s", (key, minimum, maximum) => {
    expect(resolveWalletAuthenticationConfig({ env: stageEnv({ [key]: String(minimum) }) }).status).toBe("ready");
    expect(resolveWalletAuthenticationConfig({ env: stageEnv({ [key]: String(maximum) }) }).status).toBe("ready");
    expect(diagnosticCodes(stageEnv({ [key]: String(maximum + 1) }))).toContain("WALLET_AUTH_BOUND_INVALID");
  });

  it.each([
    ["wildcard origin", { CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS: "*" }, "WALLET_AUTH_ORIGIN_INVALID"],
    ["production HTTP", { CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS: "http://wallet.example.com" }, "WALLET_AUTH_PRODUCTION_HTTPS_REQUIRED"],
    ["production non-Secure cookie", { CAMPAIGN_OS_WALLET_AUTH_COOKIE_SECURE: "0" }, "WALLET_AUTH_PRODUCTION_SECURE_COOKIE_REQUIRED"],
    ["missing CSRF secret", { CAMPAIGN_OS_WALLET_AUTH_CSRF_SECRET: undefined }, "WALLET_AUTH_CSRF_SECRET_REQUIRED"],
    ["memory store", { CAMPAIGN_OS_CAMPAIGN_DB_MODE: "local" }, "WALLET_AUTH_POSTGRES_REQUIRED"],
  ])("fails production closed for %s", (_label, overrides, code) => {
    const bindings = [
      { ...eoaBinding, network: "mainnet", productionApproved: true },
      { ...aaBinding, network: "mainnet", productionApproved: true },
    ];
    const providers = [{
      enabled: true,
      endpointEnvKey: "CAMPAIGN_OS_PORTKEY_CA_RELATION_URL",
      id: "stage-portkey-ca",
      productionApproved: true,
      timeoutMs: 1_000,
    }];
    const env = stageEnv({
      CAMPAIGN_OS_PORTKEY_CA_RELATION_PROVIDERS_JSON: JSON.stringify(providers),
      CAMPAIGN_OS_PORTKEY_CA_RELATION_URL: "https://ca.example.com/relations/verify",
      CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS: "https://wallet.example.com",
      CAMPAIGN_OS_WALLET_AUTH_ALLOW_INSECURE_LOOPBACK_COOKIE: "0",
      CAMPAIGN_OS_WALLET_AUTH_BINDINGS_JSON: JSON.stringify(bindings),
      CAMPAIGN_OS_WALLET_AUTH_COOKIE_SECURE: "1",
      CAMPAIGN_OS_WALLET_AUTH_ENVIRONMENT: "production",
      ...overrides,
    });
    const config = resolveWalletAuthenticationConfig({ env });

    expect(config).toMatchObject({ enabled: false, productionReady: false, status: "invalid", valid: false });
    expect(config.diagnostics.map(({ code: actualCode }) => actualCode)).toContain(code);
  });

  it.each([
    ["empty", []],
    ["all disabled", [{
      ...eoaBinding,
      enabled: false,
      network: "mainnet",
      productionApproved: true,
    }]],
  ])("fails production closed for an %s enabled-binding set", (_label, bindings) => {
    const config = resolveWalletAuthenticationConfig({
      env: stageEnv({
        CAMPAIGN_OS_PORTKEY_CA_RELATION_PROVIDERS_JSON: "[]",
        CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS: "https://wallet.example.com",
        CAMPAIGN_OS_WALLET_AUTH_ALLOW_INSECURE_LOOPBACK_COOKIE: "0",
        CAMPAIGN_OS_WALLET_AUTH_BINDINGS_JSON: JSON.stringify(bindings),
        CAMPAIGN_OS_WALLET_AUTH_COOKIE_SECURE: "1",
        CAMPAIGN_OS_WALLET_AUTH_ENVIRONMENT: "production",
      }),
    });

    expect(config).toMatchObject({
      enabled: false,
      productionReady: false,
      status: "invalid",
      valid: false,
    });
    expect(config.diagnostics.map(({ code }) => code)).toContain(
      "WALLET_AUTH_PRODUCTION_ENABLED_BINDING_REQUIRED",
    );
  });

  it("rejects a 127-prefix DNS hostname while accepting actual loopback hosts", () => {
    const maliciousOrigin = "http://127.evil:5193";
    const malicious = resolveWalletAuthenticationConfig({
      env: stageEnv({ CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS: maliciousOrigin }),
    });

    expect(malicious).toMatchObject({ enabled: false, status: "invalid", valid: false });
    expect(malicious.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "WALLET_AUTH_INSECURE_COOKIE_NOT_ALLOWED" }),
    ]));
    expect(JSON.stringify(malicious)).not.toContain(maliciousOrigin);

    for (const origin of [
      "http://localhost:5193",
      "http://[::1]:5193",
      "http://127.255.255.254:5193",
    ]) {
      expect(resolveWalletAuthenticationConfig({
        env: stageEnv({ CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS: origin }),
      }).status).toBe("ready");
    }
  });

  it("enforces the CSRF secret maximum in UTF-8 bytes without echoing oversized input", () => {
    const exactLimit = `${"界".repeat(1_365)}x`;
    const oversized = `${exactLimit}界`;

    expect(utf8ByteLength(exactLimit)).toBe(csrfSecretMaxBytes);
    expect(resolveWalletAuthenticationConfig({
      env: stageEnv({ CAMPAIGN_OS_WALLET_AUTH_CSRF_SECRET: exactLimit }),
    }).status).toBe("ready");

    const config = resolveWalletAuthenticationConfig({
      env: stageEnv({ CAMPAIGN_OS_WALLET_AUTH_CSRF_SECRET: oversized }),
    });
    expect(config).toMatchObject({ enabled: false, status: "invalid", valid: false });
    expect(config.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "WALLET_AUTH_CSRF_SECRET_INVALID" }),
    ]));
    expect(JSON.stringify(config)).not.toContain(oversized);
  });

  it("enforces the resolved CA endpoint maximum in UTF-8 bytes without echoing it", () => {
    const prefix = "http://127.0.0.1:5195/";
    const exactLimit = `${prefix}${"x".repeat(caEndpointMaxBytes - utf8ByteLength(prefix))}`;
    const oversized = `${exactLimit}界`;

    expect(utf8ByteLength(exactLimit)).toBe(caEndpointMaxBytes);
    expect(resolveWalletAuthenticationConfig({
      env: stageEnv({ CAMPAIGN_OS_PORTKEY_CA_RELATION_URL: exactLimit }),
    }).status).toBe("ready");

    const config = resolveWalletAuthenticationConfig({
      env: stageEnv({ CAMPAIGN_OS_PORTKEY_CA_RELATION_URL: oversized }),
    });
    expect(config).toMatchObject({ enabled: false, status: "invalid", valid: false });
    expect(config.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "WALLET_AUTH_CA_PROVIDER_MATERIAL_INVALID" }),
    ]));
    expect(JSON.stringify(config)).not.toContain(oversized);
  });

  it("does not let a client force disabled or unapproved production bindings", () => {
    const disabled = resolveWalletAuthenticationConfig({
      env: stageEnv({
        CAMPAIGN_OS_WALLET_AUTH_BINDINGS_JSON: JSON.stringify([{ ...eoaBinding, enabled: false }]),
      }),
    });

    expect(disabled.resolveBinding("portkey-discover-eoa")).toMatchObject({
      diagnosticCode: "WALLET_AUTH_BINDING_DISABLED",
      status: "disabled",
    });

    const unapprovedProduction = resolveWalletAuthenticationConfig({
      env: stageEnv({
        CAMPAIGN_OS_PORTKEY_CA_RELATION_PROVIDERS_JSON: "[]",
        CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS: "https://wallet.example.com",
        CAMPAIGN_OS_WALLET_AUTH_ALLOW_INSECURE_LOOPBACK_COOKIE: "0",
        CAMPAIGN_OS_WALLET_AUTH_BINDINGS_JSON: JSON.stringify([{ ...eoaBinding, network: "mainnet" }]),
        CAMPAIGN_OS_WALLET_AUTH_COOKIE_SECURE: "1",
        CAMPAIGN_OS_WALLET_AUTH_ENVIRONMENT: "production",
      }),
    });

    expect(unapprovedProduction.status).toBe("invalid");
    expect(unapprovedProduction.diagnostics.map(({ code }) => code)).toContain(
      "WALLET_AUTH_PRODUCTION_ADAPTER_APPROVAL_REQUIRED",
    );
    expect(unapprovedProduction.resolveBinding("portkey-discover-eoa").status).not.toBe("resolved");
  });

  it("returns only safe diagnostics and a frozen summary", () => {
    const rejectedValues = [
      "https://private.example.com/token=value",
      "Authorization: Bearer wallet-secret",
      "Cookie: campaign_os_wallet_session=value",
      "/Users/alice/private/wallet.json",
    ];
    const config = resolveWalletAuthenticationConfig({
      env: stageEnv({
        CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS: rejectedValues[0],
        CAMPAIGN_OS_WALLET_AUTH_BINDINGS_JSON: JSON.stringify([
          { ...eoaBinding, adapterId: rejectedValues[1] },
        ]),
        CAMPAIGN_OS_WALLET_AUTH_COOKIE_PATH: rejectedValues[2],
        CAMPAIGN_OS_WALLET_AUTH_CSRF_SECRET: rejectedValues[3],
      }),
      traceId: "trace-config-safe",
    });
    const serialized = JSON.stringify(config);
    const summary = summarizeWalletAuthenticationConfig(config);

    for (const rejected of rejectedValues) {
      expect(serialized).not.toContain(rejected);
    }
    expect(config.diagnostics.every(({ traceId }) => traceId === "trace-config-safe")).toBe(true);
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.bindings)).toBe(true);
    expect(Object.isFrozen(summary)).toBe(true);
    expect(summary).toEqual(expect.objectContaining({
      bindingCount: 0,
      enabledBindingIds: [],
      productionReady: false,
      status: "invalid",
    }));
  });

  it("defensively copies input and returns safe stage readiness", () => {
    const env = stageEnv();
    const config = resolveWalletAuthenticationConfig({ env });
    const summary = summarizeWalletAuthenticationConfig(config);

    env.CAMPAIGN_OS_WALLET_AUTH_BINDINGS_JSON = "[]";

    expect(config).toMatchObject({ enabled: true, productionReady: false, status: "ready", valid: true });
    expect(config.bindings.map(({ adapterId }) => adapterId)).toEqual([
      "portkey-aa",
      "portkey-discover-eoa",
    ]);
    expect(config.resolveBinding("portkey-aa")).toMatchObject({ status: "resolved" });
    expect(summary).toMatchObject({
      enabledBindingIds: ["portkey-aa", "portkey-discover-eoa"],
      environment: "stage",
      productionReady: false,
      status: "ready",
    });
    expect(JSON.stringify(config)).not.toContain("x".repeat(32));
    expect(JSON.stringify(config)).not.toContain("http://127.0.0.1:5195/relations/verify");
  });
});
