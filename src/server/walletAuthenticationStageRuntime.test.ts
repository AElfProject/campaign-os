// @vitest-environment node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveCampaignOsWalletAuthenticationConfig } from "./config";
import {
  isCampaignOsApiServerDirectExecution,
  type CampaignOsApiServerHandle,
  type StartCampaignOsApiServerOptions,
  type WalletAuthenticationLiveAuthorityRuntime,
  type WalletAuthenticationServerComposition,
  type WalletAuthenticationServerCompositionFactoryInput,
} from "./server";
import type { PostgresMigrationResult } from "./postgresMigration";
import {
  isWalletAuthenticationStageRuntimeDirectExecution,
  runWalletAuthenticationStageRuntimeCli,
  startWalletAuthenticationStageRuntime,
  type WalletAuthenticationStageRuntimeHandle,
} from "./walletAuthenticationStageRuntime";

const REQUIRED_MIGRATION_ID = "0005_participant_wallet_authentication";
const APPROVED_ADAPTER_VERSION = "0.4.0-alpha.21";
const APPROVED_PACKAGE_VERSIONS = Object.freeze({
  "@aelf-web-login/wallet-adapter-base": APPROVED_ADAPTER_VERSION,
  "@aelf-web-login/wallet-adapter-night-elf": APPROVED_ADAPTER_VERSION,
  "@aelf-web-login/wallet-adapter-portkey-discover": APPROVED_ADAPTER_VERSION,
});

const eoaBinding = Object.freeze({
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
});

const aaBinding = Object.freeze({
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
});

const stageEnv = (
  overrides: Readonly<Record<string, string | undefined>> = {},
): Record<string, string | undefined> => ({
  CAMPAIGN_OS_API_HOST: "127.0.0.1",
  CAMPAIGN_OS_API_PORT: "5194",
  CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
  CAMPAIGN_OS_DATABASE_SSL_MODE: "disable",
  CAMPAIGN_OS_DATABASE_URL: "postgresql://127.0.0.1:5432/campaign_os_stage",
  CAMPAIGN_OS_PORTKEY_CA_RELATION_PROVIDERS_JSON: JSON.stringify([{
    enabled: true,
    endpointEnvKey: "CAMPAIGN_OS_PORTKEY_CA_RELATION_URL",
    id: "stage-portkey-ca",
    productionApproved: false,
    timeoutMs: 1_000,
  }]),
  CAMPAIGN_OS_PORTKEY_CA_RELATION_URL: "http://127.0.0.1:5195/relations/verify",
  CAMPAIGN_OS_STAGE_DISPOSABLE_DATABASE_ACK: "disposable-stage-approved",
  CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS: "http://127.0.0.1:5193",
  CAMPAIGN_OS_WALLET_AUTH_ALLOW_INSECURE_LOOPBACK_COOKIE: "1",
  CAMPAIGN_OS_WALLET_AUTH_BINDINGS_JSON: JSON.stringify([eoaBinding, aaBinding]),
  CAMPAIGN_OS_WALLET_AUTH_COOKIE_PATH: "/",
  CAMPAIGN_OS_WALLET_AUTH_COOKIE_SAME_SITE: "lax",
  CAMPAIGN_OS_WALLET_AUTH_COOKIE_SECURE: "0",
  CAMPAIGN_OS_WALLET_AUTH_CSRF_SECRET: "s".repeat(32),
  CAMPAIGN_OS_WALLET_AUTH_ENABLED: "1",
  CAMPAIGN_OS_WALLET_AUTH_ENVIRONMENT: "stage",
  CAMPAIGN_OS_WALLET_AUTH_SHUTDOWN_TIMEOUT_MS: "1000",
  ...overrides,
});

const readyMigration = (
  overrides: Partial<PostgresMigrationResult> = {},
): PostgresMigrationResult => ({
  appliedMigrationIds: [
    "0001_campaign_runtime",
    "0002_admin_review_export",
    "0003_admin_review_rank_projection",
    "0004_live_provider_task_verification",
    REQUIRED_MIGRATION_ID,
  ],
  diagnosticCodes: [],
  mode: "validate",
  pendingMigrationIds: [],
  status: "ready",
  traceId: "trace-wallet-auth-stage-migration",
  ...overrides,
});

interface Harness {
  composition: WalletAuthenticationServerComposition;
  compositionFactory: ReturnType<typeof vi.fn>;
  events: string[];
  healthFetch: ReturnType<typeof vi.fn>;
  migrationValidator: ReturnType<typeof vi.fn>;
  runtimeState: { accepting: boolean; activeOperationCount: number; controllerCount: number };
  runtimeStop: ReturnType<typeof vi.fn>;
  serverStarter: ReturnType<typeof vi.fn>;
  serverStop: ReturnType<typeof vi.fn>;
  serverOptions: () => StartCampaignOsApiServerOptions | undefined;
}

const createHarness = (options: Readonly<{
  healthResponse?: Response;
  invokeComposition?: boolean;
}> = {}): Harness => {
  const events: string[] = [];
  const runtimeState = { accepting: true, activeOperationCount: 0, controllerCount: 0 };
  const runtimeStop = vi.fn(async () => {
    events.push("runtime.stop");
    runtimeState.accepting = false;
    return { diagnosticCodes: [], diagnostics: [], status: "drained" as const };
  });
  const runtime = {
    resolveAuthorization: vi.fn(),
    revalidateFenceBeforeWrite: vi.fn(),
    state: () => ({ ...runtimeState }),
    stop: runtimeStop,
  } as unknown as WalletAuthenticationLiveAuthorityRuntime;
  const composition = {
    httpController: { handle: vi.fn() },
    runtime,
  } as unknown as WalletAuthenticationServerComposition;
  const compositionFactory = vi.fn(async () => {
    events.push("composition");
    return composition;
  });
  const migrationValidator = vi.fn(async () => {
    events.push("migration.validate");
    return readyMigration();
  });
  const serverStop = vi.fn(async () => {
    events.push("server.stop");
    await runtimeStop();
  });
  let capturedServerOptions: StartCampaignOsApiServerOptions | undefined;
  const invokeComposition = options.invokeComposition ?? true;
  const serverStarter = vi.fn(async (serverOptions: StartCampaignOsApiServerOptions) => {
    capturedServerOptions = serverOptions;
    if (invokeComposition) {
      const env = serverOptions.env ?? {};
      const input: WalletAuthenticationServerCompositionFactoryInput = {
        config: resolveCampaignOsWalletAuthenticationConfig({ env }),
        env,
        traceId: "trace-server-composition",
      };
      await serverOptions.walletAuthenticationCompositionFactory?.(input);
    }
    events.push("api.listen");
    return {
      stop: serverStop,
      url: "http://127.0.0.1:5194",
    } as unknown as CampaignOsApiServerHandle;
  });
  const healthResponse = options.healthResponse ?? new Response(
    JSON.stringify({ data: { status: "ready" }, ok: true }),
    { headers: { "content-type": "application/json" }, status: 200 },
  );
  const healthFetch = vi.fn(async () => healthResponse);

  return {
    composition,
    compositionFactory,
    events,
    healthFetch,
    migrationValidator,
    runtimeState,
    runtimeStop,
    serverStarter,
    serverStop,
    serverOptions: () => capturedServerOptions,
  };
};

const openRuntimes = new Set<WalletAuthenticationStageRuntimeHandle>();

afterEach(async () => {
  vi.useRealTimers();
  await Promise.allSettled([...openRuntimes].map((runtime) => runtime.close()));
  openRuntimes.clear();
  vi.restoreAllMocks();
});

const startWithHarness = async (
  harness: Harness,
  env = stageEnv(),
): Promise<WalletAuthenticationStageRuntimeHandle> => {
  const runtime = await startWalletAuthenticationStageRuntime({
    adapterPackageVersions: APPROVED_PACKAGE_VERSIONS,
    compositionFactory: harness.compositionFactory,
    env,
    healthFetch: harness.healthFetch,
    migrationValidator: harness.migrationValidator,
    serverStarter: harness.serverStarter,
  });
  openRuntimes.add(runtime);
  return runtime;
};

describe("wallet authentication stage runtime preflight", () => {
  it("validates first, captures the real composition, then listens with an accepting runtime", async () => {
    const harness = createHarness();
    const runtime = await startWithHarness(harness);

    expect(harness.events).toEqual(["migration.validate", "composition", "api.listen"]);
    expect(harness.migrationValidator).toHaveBeenCalledWith(expect.objectContaining({
      database: expect.objectContaining({ mode: "postgres" }),
      mode: "validate",
      traceId: expect.any(String),
    }));
    expect(harness.serverOptions()).toMatchObject({
      env: expect.objectContaining({
        CAMPAIGN_OS_WALLET_AUTH_ENVIRONMENT: "stage",
      }),
      host: "127.0.0.1",
      logger: false,
      port: 5194,
      profileId: "staging-scaffold",
      walletAuthenticationAllowedOrigins: ["http://127.0.0.1:5193"],
      walletAuthenticationCompositionFactory: expect.any(Function),
    });
    expect(runtime.getState()).toMatchObject({
      environment: "stage",
      lifecycle: "ready",
      migration: {
        appliedRequiredMigration: true,
        pendingCount: 0,
        status: "ready",
      },
      productionReady: false,
      stageReady: true,
      walletAuthentication: {
        accepting: true,
        bindingCount: 2,
      },
    });
  });

  it.each([
    ["wildcard IPv4", "0.0.0.0"],
    ["wildcard IPv6", "::"],
    ["localhost alias", "localhost"],
    ["LAN", "192.168.1.4"],
    ["public", "api.example.test"],
  ])("rejects a %s API host before touching migrations", async (_label, host) => {
    const harness = createHarness();

    await expect(startWithHarness(harness, stageEnv({ CAMPAIGN_OS_API_HOST: host })))
      .rejects.toMatchObject({
        code: "WALLET_AUTH_STAGE_API_HOST_INVALID",
        preflight: expect.arrayContaining([{
          check: "api_host",
          status: "failed",
        }]),
        traceId: expect.any(String),
      });
    expect(harness.migrationValidator).not.toHaveBeenCalled();
    expect(harness.serverStarter).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", undefined],
    ["zero", "0"],
    ["out of range", "65536"],
    ["non-numeric", "5194x"],
  ])("classifies a %s API port independently from the host", async (_label, port) => {
    const harness = createHarness();

    await expect(startWithHarness(harness, stageEnv({ CAMPAIGN_OS_API_PORT: port })))
      .rejects.toMatchObject({
        code: "WALLET_AUTH_STAGE_API_PORT_INVALID",
        preflight: [{ check: "api_port", status: "failed" }],
        traceId: expect.any(String),
      });
    expect(harness.migrationValidator).not.toHaveBeenCalled();
    expect(harness.serverStarter).not.toHaveBeenCalled();
  });

  it.each([
    ["multiple origins", { CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS: "http://127.0.0.1:5193,http://127.0.0.1:5192" }, "WALLET_AUTH_STAGE_ORIGIN_INVALID"],
    ["credentialed origin", { CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS: "http://user:pass@127.0.0.1:5193" }, "WALLET_AUTH_STAGE_AUTH_CONFIG_INVALID"],
    ["public origin", {
      CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS: "https://ui.example.test",
      CAMPAIGN_OS_WALLET_AUTH_COOKIE_SECURE: "1",
    }, "WALLET_AUTH_STAGE_ORIGIN_INVALID"],
    ["API/UI collision", { CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS: "http://127.0.0.1:5194" }, "WALLET_AUTH_STAGE_PORT_COLLISION"],
    ["API/CA collision", { CAMPAIGN_OS_PORTKEY_CA_RELATION_URL: "http://127.0.0.1:5194/relations/verify" }, "WALLET_AUTH_STAGE_PORT_COLLISION"],
    ["UI/CA collision", { CAMPAIGN_OS_PORTKEY_CA_RELATION_URL: "http://127.0.0.1:5193/relations/verify" }, "WALLET_AUTH_STAGE_PORT_COLLISION"],
  ])("fails closed for %s", async (_label, overrides, code) => {
    const harness = createHarness();

    await expect(startWithHarness(harness, stageEnv(overrides))).rejects.toMatchObject({ code });
    expect(harness.migrationValidator).not.toHaveBeenCalled();
  });

  it.each([
    ["missing acknowledgement", { CAMPAIGN_OS_STAGE_DISPOSABLE_DATABASE_ACK: undefined }],
    ["credentialed URL", { CAMPAIGN_OS_DATABASE_URL: "postgresql://operator:unsafe@127.0.0.1:5432/campaign_os_stage" }],
    ["query host override", { CAMPAIGN_OS_DATABASE_URL: "postgresql://127.0.0.1:5432/campaign_os_stage?host=database.example.test" }],
    ["query credential override", { CAMPAIGN_OS_DATABASE_URL: "postgresql://127.0.0.1:5432/campaign_os_stage?password=unsafe" }],
    ["URL fragment", { CAMPAIGN_OS_DATABASE_URL: "postgresql://127.0.0.1:5432/campaign_os_stage#unsafe" }],
    ["LAN database", { CAMPAIGN_OS_DATABASE_SSL_MODE: "verify-full", CAMPAIGN_OS_DATABASE_URL: "postgresql://192.168.1.5:5432/campaign_os_stage" }],
    ["production-like identity", { CAMPAIGN_OS_DATABASE_URL: "postgresql://127.0.0.1:5432/campaign_os_production" }],
    ["generic identity", { CAMPAIGN_OS_DATABASE_URL: "postgresql://127.0.0.1:5432/campaign_os" }],
  ])("requires a disposable PostgreSQL identity: %s", async (_label, overrides) => {
    const harness = createHarness();

    await expect(startWithHarness(harness, stageEnv(overrides))).rejects.toMatchObject({
      code: "WALLET_AUTH_STAGE_DATABASE_UNSAFE",
    });
    expect(harness.migrationValidator).not.toHaveBeenCalled();
  });

  it.each([
    ["wrong environment", { CAMPAIGN_OS_WALLET_AUTH_ENVIRONMENT: "local" }],
    ["disabled", { CAMPAIGN_OS_WALLET_AUTH_ENABLED: "0" }],
    ["short CSRF", { CAMPAIGN_OS_WALLET_AUTH_CSRF_SECRET: "short" }],
    ["insecure cookie without exception", { CAMPAIGN_OS_WALLET_AUTH_ALLOW_INSECURE_LOOPBACK_COOKIE: "0" }],
    ["SameSite=None insecure cookie", { CAMPAIGN_OS_WALLET_AUTH_COOKIE_SAME_SITE: "none" }],
    ["non-root cookie path", { CAMPAIGN_OS_WALLET_AUTH_COOKIE_PATH: "/nested" }],
  ])("rejects invalid stage auth posture: %s", async (_label, overrides) => {
    const harness = createHarness();

    await expect(startWithHarness(harness, stageEnv(overrides))).rejects.toMatchObject({
      code: "WALLET_AUTH_STAGE_AUTH_CONFIG_INVALID",
      preflight: expect.any(Array),
    });
  });

  it("requires an enabled EOA or AA binding and exact approved adapter packages", async () => {
    const harness = createHarness();
    const disabledBindings = [
      { ...eoaBinding, enabled: false },
      { ...aaBinding, enabled: false },
    ];

    await expect(startWithHarness(harness, stageEnv({
      CAMPAIGN_OS_WALLET_AUTH_BINDINGS_JSON: JSON.stringify(disabledBindings),
    }))).rejects.toMatchObject({ code: "WALLET_AUTH_STAGE_BINDING_REQUIRED" });

    await expect(startWalletAuthenticationStageRuntime({
      adapterPackageVersions: {
        ...APPROVED_PACKAGE_VERSIONS,
        "@aelf-web-login/wallet-adapter-base": "0.4.0-alpha.20",
      },
      compositionFactory: harness.compositionFactory,
      env: stageEnv(),
      healthFetch: harness.healthFetch,
      migrationValidator: harness.migrationValidator,
      serverStarter: harness.serverStarter,
    })).rejects.toMatchObject({ code: "WALLET_AUTH_STAGE_ADAPTER_PACKAGE_INVALID" });
  });

  it.each([
    ["credentialed", "http://user:pass@127.0.0.1:5195/relations/verify"],
    ["wildcard", "http://0.0.0.0:5195/relations/verify"],
    ["LAN", "http://192.168.1.6:5195/relations/verify"],
    ["public", "https://ca.example.test/relations/verify"],
  ])("requires an exact loopback CA endpoint for AA: %s", async (_label, endpoint) => {
    const harness = createHarness();

    await expect(startWithHarness(harness, stageEnv({
      CAMPAIGN_OS_PORTKEY_CA_RELATION_URL: endpoint,
    }))).rejects.toMatchObject({ code: "WALLET_AUTH_STAGE_CA_ENDPOINT_INVALID" });
  });
});

describe("wallet authentication stage runtime readiness and ownership", () => {
  it.each([
    ["pending", readyMigration({ pendingMigrationIds: [REQUIRED_MIGRATION_ID], status: "pending" })],
    ["missing 0005", readyMigration({ appliedMigrationIds: ["0001_campaign_runtime"] })],
    ["non-validate mode", readyMigration({ mode: "apply" })],
  ])("rejects a migration result that is %s", async (_label, result) => {
    const harness = createHarness();
    harness.migrationValidator.mockResolvedValueOnce(result);

    await expect(startWithHarness(harness)).rejects.toMatchObject({
      code: "WALLET_AUTH_STAGE_MIGRATION_NOT_READY",
    });
    expect(harness.serverStarter).not.toHaveBeenCalled();
  });

  it("fails when composition falls back even if health returns 200", async () => {
    const harness = createHarness({ invokeComposition: false });

    await expect(startWithHarness(harness)).rejects.toMatchObject({
      code: "WALLET_AUTH_STAGE_COMPOSITION_UNAVAILABLE",
    });
    expect(harness.healthFetch).not.toHaveBeenCalled();
    expect(harness.serverStop).toHaveBeenCalledTimes(1);
  });

  it.each([
    "resolveAuthorization",
    "revalidateFenceBeforeWrite",
  ] as const)("rejects a composition without runtime.%s", async (method) => {
    const harness = createHarness();
    Object.defineProperty(harness.composition.runtime, method, {
      configurable: true,
      value: undefined,
    });

    await expect(startWithHarness(harness)).rejects.toMatchObject({
      code: "WALLET_AUTH_STAGE_COMPOSITION_UNAVAILABLE",
    });
    expect(harness.healthFetch).not.toHaveBeenCalled();
    expect(harness.serverStop).toHaveBeenCalledTimes(1);
  });

  it("requires the captured runtime to accept work", async () => {
    const harness = createHarness();
    harness.runtimeState.accepting = false;

    await expect(startWithHarness(harness)).rejects.toMatchObject({
      code: "WALLET_AUTH_STAGE_RUNTIME_NOT_ACCEPTING",
    });
    expect(harness.healthFetch).not.toHaveBeenCalled();
    expect(harness.serverStop).toHaveBeenCalledTimes(1);
  });

  it("reverses server-owned composition cleanup when health fails", async () => {
    const harness = createHarness({
      healthResponse: new Response(JSON.stringify({ ok: false }), { status: 503 }),
    });

    await expect(startWithHarness(harness)).rejects.toMatchObject({
      code: "WALLET_AUTH_STAGE_HEALTH_CHECK_FAILED",
    });
    expect(harness.events).toEqual([
      "migration.validate",
      "composition",
      "api.listen",
      "server.stop",
      "runtime.stop",
    ]);
  });

  it("uses one idempotent close promise and delegates ownership to server.stop", async () => {
    const harness = createHarness();
    const runtime = await startWithHarness(harness);

    const first = runtime.close();
    const second = runtime.close();
    expect(first).toBe(second);
    await first;

    expect(harness.serverStop).toHaveBeenCalledTimes(1);
    expect(harness.runtimeStop).toHaveBeenCalledTimes(1);
    expect(runtime.getState()).toMatchObject({
      lifecycle: "closed",
      stageReady: false,
      walletAuthentication: { accepting: false },
    });
  });

  it("bounds a hanging server.stop and keeps repeated close deterministic", async () => {
    vi.useFakeTimers();
    const harness = createHarness();
    harness.serverStop.mockImplementation(() => new Promise<void>(() => undefined));
    const runtime = await startWithHarness(harness);
    const close = runtime.close();
    const rejection = expect(close).rejects.toMatchObject({
      code: "WALLET_AUTH_STAGE_SHUTDOWN_FAILED",
      traceId: expect.any(String),
    });

    await vi.advanceTimersByTimeAsync(1_000);
    await rejection;
    expect(runtime.close()).toBe(close);
    expect(runtime.getState().lifecycle).toBe("closed");
  });

  it("uses safe errors with taxonomy and Trace ID without leaking causes", async () => {
    const harness = createHarness();
    harness.migrationValidator.mockRejectedValueOnce(
      new Error("postgresql://operator:unsafe@127.0.0.1/campaign_os_stage"),
    );

    const failure = await startWithHarness(harness).catch((error: unknown) => error) as Error & {
      code: string;
      traceId: string;
    };
    expect(failure).toMatchObject({
      code: "WALLET_AUTH_STAGE_MIGRATION_NOT_READY",
      message: "Wallet authentication stage migration validation failed.",
      name: "WalletAuthenticationStageRuntimeError",
      traceId: expect.stringMatching(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/),
    });
    expect(failure.stack).toBeUndefined();
    expect(JSON.stringify(failure)).not.toMatch(/operator|unsafe|campaign_os_stage/i);
  });
});

describe("wallet authentication stage runtime CLI", () => {
  it("keeps imports inert and recognizes only its own direct entrypoint", () => {
    const stagePath = resolve(process.cwd(), "src/server/walletAuthenticationStageRuntime.ts");
    expect(isWalletAuthenticationStageRuntimeDirectExecution(stagePath)).toBe(true);
    expect(isWalletAuthenticationStageRuntimeDirectExecution(
      resolve(process.cwd(), "src/server/server.ts"),
    )).toBe(false);
    expect(isCampaignOsApiServerDirectExecution(stagePath)).toBe(false);
  });

  it("requires exact --listen and emits one redacted readiness record", async () => {
    const harness = createHarness();
    const silent: string[] = [];
    await expect(runWalletAuthenticationStageRuntimeCli({
      argv: [],
      stdout: (line) => silent.push(line),
    })).resolves.toBeUndefined();
    expect(silent).toEqual([]);

    await expect(runWalletAuthenticationStageRuntimeCli({
      argv: ["--listen", "--apply"],
    })).rejects.toMatchObject({ code: "WALLET_AUTH_STAGE_CLI_INVALID_ARGUMENT" });

    const output: string[] = [];
    const runtime = await runWalletAuthenticationStageRuntimeCli({
      adapterPackageVersions: APPROVED_PACKAGE_VERSIONS,
      argv: ["--listen"],
      compositionFactory: harness.compositionFactory,
      env: stageEnv(),
      healthFetch: harness.healthFetch,
      migrationValidator: harness.migrationValidator,
      serverStarter: harness.serverStarter,
      stdout: (line) => output.push(line),
    });
    expect(runtime).toBeDefined();
    openRuntimes.add(runtime!);
    expect(output).toHaveLength(1);
    expect(JSON.parse(output[0]!)).toEqual({
      apiUrl: "http://127.0.0.1:5194",
      bindingCount: 2,
      environment: "stage",
      event: "wallet_authentication_stage_runtime.ready",
      migrationId: REQUIRED_MIGRATION_ID,
      productionReady: false,
      stageReady: true,
      status: "ready",
    });
    expect(output[0]).not.toMatch(/csrf|database|password|relation|secret|token|unsafe/i);
  });

  it("publishes the guarded command and a public-safe README section", async () => {
    const [packageSource, runtimeSource, readme] = await Promise.all([
      readFile(resolve(process.cwd(), "package.json"), "utf8"),
      readFile(resolve(process.cwd(), "src/server/walletAuthenticationStageRuntime.ts"), "utf8"),
      readFile(resolve(process.cwd(), "README.md"), "utf8"),
    ]);
    const packageJson = JSON.parse(packageSource) as { scripts?: Record<string, string> };
    expect(packageJson.scripts?.["server:wallet-auth-stage"]).toContain(
      "walletAuthenticationStageRuntime.ts --listen",
    );
    expect(runtimeSource).toContain("process.exitCode = 1");
    expect(runtimeSource).toContain("preflight: failure.preflight");

    const section = readme.split("## Wallet Authentication Stage")[1]?.split("\n## ")[0] ?? "";
    expect(section).toContain("default-disabled");
    expect(section).toContain("CAMPAIGN_OS_WALLET_AUTH_ENABLED");
    expect(section).toContain("CAMPAIGN_OS_STAGE_DISPOSABLE_DATABASE_ACK");
    expect(section).toContain("npm run server:wallet-auth-stage");
    expect(section).not.toMatch(/disposable-stage-approved|postgres(?:ql)?:\/\/|kitty-specs|evidence\//i);
  });
});
