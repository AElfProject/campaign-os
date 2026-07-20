// @vitest-environment node

import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PostgresMigrationResult } from "./postgresMigration";
import {
  runTaskTemplateCatalogStageRuntimeCli,
  startTaskTemplateCatalogStageRuntime,
  TaskTemplateCatalogStageRuntimeError,
  type TaskTemplateCatalogStageRuntimeHandle,
} from "./taskTemplateCatalogStageRuntime";
import type {
  StartWalletAuthenticationStageRuntimeOptions,
  WalletAuthenticationStageRuntimeHandle,
} from "./walletAuthenticationStageRuntime";

const REQUIRED_CATALOG_MIGRATION_ID = "0006_durable_task_template_catalog";

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

const stageEnv = (
  overrides: Readonly<Record<string, string | undefined>> = {},
): Record<string, string | undefined> => ({
  CAMPAIGN_OS_API_HOST: "127.0.0.1",
  CAMPAIGN_OS_API_PORT: "5194",
  CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
  CAMPAIGN_OS_DATABASE_SSL_MODE: "disable",
  CAMPAIGN_OS_DATABASE_URL: "postgresql://127.0.0.1:55444/campaign_os_m246_stage_test",
  CAMPAIGN_OS_STAGE_DISPOSABLE_DATABASE_ACK: "disposable-stage-approved",
  CAMPAIGN_OS_TASK_TEMPLATE_CATALOG_ENABLED: "1",
  CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS: "http://127.0.0.1:5193",
  CAMPAIGN_OS_WALLET_AUTH_ALLOW_INSECURE_LOOPBACK_COOKIE: "1",
  CAMPAIGN_OS_WALLET_AUTH_BINDINGS_JSON: JSON.stringify([eoaBinding]),
  CAMPAIGN_OS_WALLET_AUTH_CSRF_SECRET: randomBytes(32).toString("base64url"),
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
    "0005_participant_wallet_authentication",
    REQUIRED_CATALOG_MIGRATION_ID,
  ],
  diagnosticCodes: [],
  mode: "validate",
  pendingMigrationIds: [],
  status: "ready",
  traceId: "trace-catalog-stage-migration",
  ...overrides,
});

interface Harness {
  catalogValidator: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  migrationValidator: ReturnType<typeof vi.fn>;
  startOptions: () => StartWalletAuthenticationStageRuntimeOptions | undefined;
  walletRuntimeStarter: ReturnType<typeof vi.fn>;
}

const createHarness = (options: Readonly<{ stageReady?: boolean }> = {}): Harness => {
  let lifecycle: "ready" | "closing" | "closed" = "ready";
  let capturedOptions: StartWalletAuthenticationStageRuntimeOptions | undefined;
  const catalogValidator = vi.fn(async () => undefined);
  const migrationValidator = vi.fn(async () => readyMigration());
  const close = vi.fn(async () => {
    lifecycle = "closed";
  });
  const walletHandle: WalletAuthenticationStageRuntimeHandle = Object.freeze({
    close,
    getState: () => Object.freeze({
      environment: "stage" as const,
      lifecycle,
      migration: Object.freeze({
        appliedRequiredMigration: true as const,
        pendingCount: 0 as const,
        status: "ready" as const,
      }),
      preflight: Object.freeze([]),
      productionReady: false as const,
      stageReady: lifecycle === "ready" && (options.stageReady ?? true),
      walletAuthentication: Object.freeze({
        accepting: lifecycle === "ready" && (options.stageReady ?? true),
        bindingCount: 1,
      }),
    }),
    url: "http://127.0.0.1:5194",
  });
  const walletRuntimeStarter = vi.fn(
    async (options: StartWalletAuthenticationStageRuntimeOptions) => {
      capturedOptions = options;
      await options.migrationValidator?.({
        database: {
          mode: "postgres",
          pool: { connectionString: "postgresql://127.0.0.1/campaign_os_m246_stage_test" },
        } as never,
        mode: "validate",
        traceId: "trace-wallet-stage-reused-migration",
      });
      return walletHandle;
    },
  );

  return {
    catalogValidator,
    close,
    migrationValidator,
    startOptions: () => capturedOptions,
    walletRuntimeStarter,
  };
};

const openRuntimes = new Set<TaskTemplateCatalogStageRuntimeHandle>();

afterEach(async () => {
  await Promise.allSettled([...openRuntimes].map((runtime) => runtime.close()));
  openRuntimes.clear();
  vi.restoreAllMocks();
});

const startWithHarness = async (
  harness: Harness,
  env = stageEnv(),
): Promise<TaskTemplateCatalogStageRuntimeHandle> => {
  const runtime = await startTaskTemplateCatalogStageRuntime({
    catalogValidator: harness.catalogValidator,
    env,
    migrationValidator: harness.migrationValidator,
    walletRuntimeStarter: harness.walletRuntimeStarter,
  });
  openRuntimes.add(runtime);
  return runtime;
};

describe("task template catalog stage runtime", () => {
  it("validates migration 0006 before starting the reused wallet-auth runtime", async () => {
    const harness = createHarness();
    const runtime = await startWithHarness(harness);

    expect(harness.migrationValidator).toHaveBeenCalledTimes(1);
    expect(harness.catalogValidator).toHaveBeenCalledTimes(1);
    expect(harness.walletRuntimeStarter).toHaveBeenCalledTimes(1);
    expect(harness.startOptions()).toMatchObject({
      env: expect.objectContaining({
        CAMPAIGN_OS_TASK_TEMPLATE_CATALOG_ENABLED: "1",
      }),
      migrationValidator: expect.any(Function),
    });
    expect(runtime.getState()).toEqual({
      catalog: {
        enabled: true,
        mode: "durable",
        requiredMigrationId: REQUIRED_CATALOG_MIGRATION_ID,
      },
      environment: "stage",
      lifecycle: "ready",
      preflight: [
        { check: "loopback", status: "ready" },
        { check: "database", status: "ready" },
        { check: "catalog_config", status: "ready" },
        { check: "migration", status: "ready" },
        { check: "catalog_support", status: "ready" },
        { check: "wallet_authentication", status: "ready" },
      ],
      productionReady: false,
      stageProductReviewReady: false,
      stageReady: true,
      walletAuthentication: { accepting: true, bindingCount: 1 },
    });
  });

  it.each([
    [
      "non-loopback API host",
      { CAMPAIGN_OS_API_HOST: "0.0.0.0" },
      "TASK_TEMPLATE_CATALOG_STAGE_LOOPBACK_REQUIRED",
      "loopback",
    ],
    [
      "credentialed database URL",
      { CAMPAIGN_OS_DATABASE_URL: "postgresql://postgres:unsafe@127.0.0.1:55444/campaign_os_stage" },
      "TASK_TEMPLATE_CATALOG_STAGE_DATABASE_UNSAFE",
      "database",
    ],
    [
      "production-like database",
      { CAMPAIGN_OS_DATABASE_URL: "postgresql://127.0.0.1:55444/campaign_os_production" },
      "TASK_TEMPLATE_CATALOG_STAGE_DATABASE_UNSAFE",
      "database",
    ],
    [
      "disabled catalog",
      { CAMPAIGN_OS_TASK_TEMPLATE_CATALOG_ENABLED: "0" },
      "TASK_TEMPLATE_CATALOG_STAGE_CATALOG_REQUIRED",
      "catalog_config",
    ],
    [
      "API and UI port collision",
      { CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS: "http://127.0.0.1:5194" },
      "TASK_TEMPLATE_CATALOG_STAGE_LOOPBACK_REQUIRED",
      "loopback",
    ],
  ])("fails closed for %s", async (_label, overrides, code, check) => {
    const harness = createHarness();

    await expect(startWithHarness(harness, stageEnv(overrides))).rejects.toMatchObject({
      code,
      preflight: expect.arrayContaining([{ check, status: "failed" }]),
    });
    expect(harness.migrationValidator).not.toHaveBeenCalled();
    expect(harness.walletRuntimeStarter).not.toHaveBeenCalled();
  });

  it("rejects unreadable or checksum-drifted catalog data before opening a listener", async () => {
    const harness = createHarness();
    harness.catalogValidator.mockRejectedValue(new Error("catalog row detail"));

    const failure = await startWithHarness(harness).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(TaskTemplateCatalogStageRuntimeError);
    expect(failure).toMatchObject({
      code: "TASK_TEMPLATE_CATALOG_STAGE_CATALOG_NOT_READY",
      preflight: expect.arrayContaining([{ check: "catalog_support", status: "failed" }]),
    });
    expect(JSON.stringify(failure)).not.toContain("catalog row detail");
    expect(harness.walletRuntimeStarter).not.toHaveBeenCalled();
  });

  it("rejects pending or absent catalog migration without opening a listener", async () => {
    const harness = createHarness();
    harness.migrationValidator.mockResolvedValue(readyMigration({
      appliedMigrationIds: ["0005_participant_wallet_authentication"],
      pendingMigrationIds: [REQUIRED_CATALOG_MIGRATION_ID],
      status: "pending",
    }));

    await expect(startWithHarness(harness)).rejects.toMatchObject({
      code: "TASK_TEMPLATE_CATALOG_STAGE_MIGRATION_NOT_READY",
      preflight: expect.arrayContaining([{ check: "migration", status: "failed" }]),
    });
    expect(harness.walletRuntimeStarter).not.toHaveBeenCalled();
  });

  it("accepts a bounded PostgreSQL role without passing it through the wallet preflight URL", async () => {
    const harness = createHarness();
    const runtime = await startWithHarness(harness, stageEnv({
      CAMPAIGN_OS_DATABASE_URL:
        "postgresql://stage_role@127.0.0.1:55444/campaign_os_m246_stage_test",
    }));

    expect(harness.startOptions()?.env?.CAMPAIGN_OS_DATABASE_URL).toBe(
      "postgresql://127.0.0.1:55444/campaign_os_m246_stage_test",
    );
    await runtime.close();
  });

  it("returns a typed safe error when the underlying listener cannot start", async () => {
    const harness = createHarness();
    harness.walletRuntimeStarter.mockRejectedValue(new Error("address and credential detail"));

    const failure = await startWithHarness(harness).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(TaskTemplateCatalogStageRuntimeError);
    expect(failure).toMatchObject({
      code: "TASK_TEMPLATE_CATALOG_STAGE_START_FAILED",
      preflight: expect.arrayContaining([{ check: "wallet_authentication", status: "failed" }]),
    });
    expect(JSON.stringify(failure)).not.toContain("address and credential detail");
  });

  it("closes a started listener before rejecting a non-accepting runtime", async () => {
    const harness = createHarness({ stageReady: false });

    await expect(startWithHarness(harness)).rejects.toMatchObject({
      code: "TASK_TEMPLATE_CATALOG_STAGE_START_FAILED",
      preflight: expect.arrayContaining([
        { check: "wallet_authentication", status: "failed" },
      ]),
    });
    expect(harness.close).toHaveBeenCalledTimes(1);
  });

  it("drains exactly once and remains closed across repeated close calls", async () => {
    const harness = createHarness();
    const runtime = await startWithHarness(harness);

    await Promise.all([runtime.close(), runtime.close(), runtime.close()]);

    expect(harness.close).toHaveBeenCalledTimes(1);
    expect(runtime.getState()).toMatchObject({
      lifecycle: "closed",
      productionReady: false,
      stageProductReviewReady: false,
      stageReady: false,
      walletAuthentication: { accepting: false },
    });
  });

  it("accepts only the explicit listen CLI and emits a safe readiness projection", async () => {
    const harness = createHarness();
    const lines: string[] = [];
    const runtime = await runTaskTemplateCatalogStageRuntimeCli({
      argv: ["--listen"],
      catalogValidator: harness.catalogValidator,
      env: stageEnv(),
      migrationValidator: harness.migrationValidator,
      stdout: (line) => lines.push(line),
      walletRuntimeStarter: harness.walletRuntimeStarter,
    });
    if (runtime) {
      openRuntimes.add(runtime);
    }

    expect(JSON.parse(lines[0] ?? "{}")).toEqual({
      apiUrl: "http://127.0.0.1:5194",
      environment: "stage",
      event: "task_template_catalog_stage_runtime.ready",
      migrationId: REQUIRED_CATALOG_MIGRATION_ID,
      processId: process.pid,
      productionReady: false,
      stageProductReviewReady: false,
      stageReady: true,
      status: "ready",
    });
    await expect(runTaskTemplateCatalogStageRuntimeCli({
      argv: ["--unexpected"],
      env: stageEnv(),
      migrationValidator: harness.migrationValidator,
      walletRuntimeStarter: harness.walletRuntimeStarter,
    })).rejects.toMatchObject({
      code: "TASK_TEMPLATE_CATALOG_STAGE_CLI_INVALID_ARGUMENT",
    });
  });

  it("runs one required preflight and drains it before the check command exits", async () => {
    const harness = createHarness();
    const lines: string[] = [];

    await expect(runTaskTemplateCatalogStageRuntimeCli({
      argv: ["--check"],
      catalogValidator: harness.catalogValidator,
      env: stageEnv(),
      migrationValidator: harness.migrationValidator,
      stdout: (line) => lines.push(line),
      walletRuntimeStarter: harness.walletRuntimeStarter,
    })).resolves.toBeUndefined();

    expect(harness.close).toHaveBeenCalledTimes(1);
    expect(JSON.parse(lines[0] ?? "{}")).toEqual({
      environment: "stage",
      event: "task_template_catalog_stage_runtime.preflight_passed",
      migrationId: REQUIRED_CATALOG_MIGRATION_ID,
      productionReady: false,
      resourcesDrained: true,
      stageProductReviewReady: false,
      status: "passed",
    });
  });
});
