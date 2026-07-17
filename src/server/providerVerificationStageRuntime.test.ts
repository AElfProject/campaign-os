// @vitest-environment node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  CampaignOsApiRuntime,
  CreateCampaignOsApiRuntimeOptions,
} from "./apiRuntime";
import {
  isCampaignOsApiServerDirectExecution,
  type CampaignOsApiServerHandle,
  type StartCampaignOsApiServerOptions,
} from "./server";
import type {
  TaskVerificationBinding,
} from "./taskVerificationConfig";
import {
  createCanonicalTaskVerificationRevision,
  deriveTaskVerificationIdentity,
  issueTrustedTaskVerificationIdentityInput,
} from "./taskVerification";
import type { TaskVerificationAttemptStore } from "./taskVerificationAttemptStore";
import { TaskVerificationRuntime } from "./taskVerificationRuntime";
import type { ProviderHttpFetchTransport } from "./providerHttpFetchTransport";
import {
  runProviderVerificationStageRuntimeCli,
  startProviderVerificationStageRuntime,
  type ProviderVerificationStageRuntimeHandle,
} from "./providerVerificationStageRuntime";

const PROVIDER_URL_ENV = "CAMPAIGN_OS_STAGE_PROVIDER_URL";

const onChainBinding = (
  overrides: Partial<TaskVerificationBinding> = {},
): TaskVerificationBinding => Object.freeze({
  degradationPolicy: "pending",
  enabled: true,
  endpointEnvKey: PROVIDER_URL_ENV,
  endpointId: "aefinder-aelfscan-indexer-query",
  evidenceSource: "AELFSCAN",
  id: "stage-on-chain-v1",
  maxAttempts: 3,
  maxResponseBytes: 16_384,
  providerFamily: "aefinder",
  providerGroupId: "aefinder-aelfscan-indexers",
  requestMappingId: "provider-http-request-map:on-chain-indexer-v1",
  responseMappingId: "provider-http-response-map:on-chain-indexer-v1",
  revision: 1,
  timeoutMs: 1_000,
  verificationType: "ON_CHAIN",
  ...overrides,
});

const dappApiBinding = (
  overrides: Partial<TaskVerificationBinding> = {},
): TaskVerificationBinding => Object.freeze({
  degradationPolicy: "pending",
  enabled: true,
  endpointEnvKey: PROVIDER_URL_ENV,
  endpointId: "dapp-api-verification-status",
  evidenceSource: "DAPP_API",
  id: "stage-dapp-api-v1",
  maxAttempts: 3,
  maxResponseBytes: 16_384,
  providerFamily: "ebridge",
  providerGroupId: "dapp-api-adapters",
  requestMappingId: "provider-http-request-map:dapp-api-status-v1",
  responseMappingId: "provider-http-response-map:dapp-api-status-v1",
  revision: 1,
  timeoutMs: 1_000,
  verificationType: "DAPP_API",
  ...overrides,
});

const stageEnv = (
  bindings: readonly TaskVerificationBinding[] = [onChainBinding(), dappApiBinding()],
  overrides: Readonly<Record<string, string | undefined>> = {},
): Record<string, string | undefined> => ({
  CAMPAIGN_OS_API_HOST: "127.0.0.1",
  CAMPAIGN_OS_API_PORT: "5194",
  CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
  CAMPAIGN_OS_DATABASE_SSL_MODE: "disable",
  CAMPAIGN_OS_DATABASE_URL: "postgresql://127.0.0.1/campaign_os_stage",
  CAMPAIGN_OS_PARTICIPANT_PREVIEW_CAMPAIGN_IDS: "*",
  CAMPAIGN_OS_STAGE_DISPOSABLE_DATABASE_ACK: "disposable-stage-approved",
  CAMPAIGN_OS_TASK_VERIFICATION_BINDINGS_JSON: JSON.stringify(bindings),
  CAMPAIGN_OS_TASK_VERIFICATION_ENABLEMENT: "explicitly-enabled",
  [PROVIDER_URL_ENV]: "http://127.0.0.1:5195/verify",
  ...overrides,
});

interface StageHarness {
  apiRuntimeFactory: ReturnType<typeof vi.fn>;
  capturedRuntimeOptions: () => CreateCampaignOsApiRuntimeOptions | undefined;
  capturedServerOptions: () => StartCampaignOsApiServerOptions | undefined;
  healthFetch: ReturnType<typeof vi.fn>;
  serverStarter: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

const createHarness = (
  healthResponse = new Response(JSON.stringify({
    data: {
      campaignDatabase: {
        fallbackUsed: false,
        selectedMode: "postgres",
        status: "ready",
      },
      taskVerificationRuntime: {
        bindingCount: 2,
        enabled: true,
        schemaStatus: "ready",
        status: "ready",
      },
    },
    ok: true,
  }), {
    headers: { "content-type": "application/json" },
    status: 200,
  }),
): StageHarness => {
  let runtimeOptions: CreateCampaignOsApiRuntimeOptions | undefined;
  let serverOptions: StartCampaignOsApiServerOptions | undefined;
  const runtime = {
    close: vi.fn(async () => undefined),
    handle: vi.fn(),
  } as unknown as CampaignOsApiRuntime;
  const apiRuntimeFactory = vi.fn((options: CreateCampaignOsApiRuntimeOptions) => {
    runtimeOptions = options;
    return runtime;
  });
  const stop = vi.fn(async () => undefined);
  const serverStarter = vi.fn(async (options: StartCampaignOsApiServerOptions) => {
    serverOptions = options;
    options.runtimeFactory?.({});
    return {
      stop,
      url: "http://127.0.0.1:5194",
    } as unknown as CampaignOsApiServerHandle;
  });
  const healthFetch = vi.fn(async () => healthResponse);

  return {
    apiRuntimeFactory,
    capturedRuntimeOptions: () => runtimeOptions,
    capturedServerOptions: () => serverOptions,
    healthFetch,
    serverStarter,
    stop,
  };
};

const openRuntimes = new Set<ProviderVerificationStageRuntimeHandle>();

afterEach(async () => {
  await Promise.all([...openRuntimes].map((runtime) => runtime.close()));
  openRuntimes.clear();
  vi.restoreAllMocks();
});

describe("provider verification stage runtime", () => {
  it("composes PostgreSQL, standalone all-draft preview, both provider types, and a live fetch transport", async () => {
    const harness = createHarness();
    const runtime = await startProviderVerificationStageRuntime({
      apiRuntimeFactory: harness.apiRuntimeFactory,
      env: stageEnv(),
      healthFetch: harness.healthFetch,
      serverStarter: harness.serverStarter,
    });
    openRuntimes.add(runtime);

    const serverOptions = harness.capturedServerOptions();
    const runtimeOptions = harness.capturedRuntimeOptions();
    const transport = serverOptions?.taskVerificationTransport;

    expect(serverOptions).toMatchObject({
      env: expect.objectContaining({
        CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
        CAMPAIGN_OS_PARTICIPANT_PREVIEW_CAMPAIGN_IDS: "*",
      }),
      logger: false,
      profileId: "staging-scaffold",
    });
    expect(typeof transport).toBe("function");
    expect(runtimeOptions?.taskVerificationTransport).toBe(transport);
    expect(runtimeOptions?.taskVerificationConfig).toMatchObject({
      enabled: true,
      environment: "stage",
      hasLiveBindings: true,
      status: "ready",
      valid: true,
    });
    expect(runtimeOptions?.taskVerificationProviderRuntime).toMatchObject({
      activationStatus: "explicitly_enabled",
      productionReady: false,
      profileId: "staging-scaffold",
      status: "activated",
      transportProvided: true,
      valid: true,
    });
    const resolveRule = runtimeOptions?.taskVerificationRuleResolver;
    expect(resolveRule).toBeTypeOf("function");
    expect(resolveRule?.({
      evidenceRule: {
        category: "bridge",
        expectedField: "forged",
        expectedType: "string",
        expectedValue: "forged",
        providerBindingId: "forged-binding",
        source: "AELFSCAN",
        templateId: "tpl-bridge-ebridge",
      },
      templateCode: "bridge_ebridge",
      verificationType: "ON_CHAIN",
    })).toEqual({
      chainId: "AELF",
      expectedField: "verified",
      expectedType: "boolean",
      expectedValue: true,
      providerBindingId: "stage-on-chain-v1",
      source: "AELFSCAN",
    });
    expect(resolveRule?.({
      evidenceRule: {
        category: "swap",
        expectedField: "forged",
        expectedType: "string",
        expectedValue: "forged",
        providerBindingId: "forged-binding",
        source: "DAPP_API",
        templateId: "tpl-swap-awaken",
      },
      templateCode: "swap_awaken",
      verificationType: "DAPP_API",
    })).toEqual({
      action: "completed",
      expectedField: "eligible",
      expectedType: "boolean",
      expectedValue: true,
      providerBindingId: "stage-dapp-api-v1",
      source: "DAPP_API",
    });
    expect(resolveRule?.({
      evidenceRule: { source: "AELFSCAN" },
      templateCode: "liquidity_awaken",
      verificationType: "ON_CHAIN",
    })).toEqual({
      chainId: "AELF",
      expectedField: "verified",
      expectedType: "boolean",
      expectedValue: true,
      methodName: "pending",
      providerBindingId: "stage-on-chain-v1",
      source: "AELFSCAN",
    });
    expect(resolveRule?.({
      evidenceRule: { source: "DAPP_API" },
      templateCode: "pay-complete",
      verificationType: "DAPP_API",
    })).toEqual({
      action: "malformed",
      expectedField: "eligible",
      expectedType: "boolean",
      expectedValue: true,
      providerBindingId: "stage-dapp-api-v1",
      source: "DAPP_API",
    });
    expect(runtime.getState()).toEqual({
      bindingCount: 2,
      bindingIds: ["stage-dapp-api-v1", "stage-on-chain-v1"],
      environment: "stage",
      lifecycle: "ready",
      productionReady: false,
      providerTransport: {
        accepting: true,
        activeCallCount: 0,
      },
    });
    expect(runtime.url).toBe("http://127.0.0.1:5194");
    expect(harness.healthFetch).toHaveBeenCalledWith(
      "http://127.0.0.1:5194/api/health",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-campaign-os-trace-id": expect.stringMatching(/^[0-9a-f-]{36}$/),
        }),
      }),
    );
  });

  it("composes a Stage rule, authority, strategy, and provider plan that reach durable begin", async () => {
    const harness = createHarness();
    const stage = await startProviderVerificationStageRuntime({
      apiRuntimeFactory: harness.apiRuntimeFactory,
      env: stageEnv(),
      healthFetch: harness.healthFetch,
      serverStarter: harness.serverStarter,
    });
    openRuntimes.add(stage);
    const options = harness.capturedRuntimeOptions();
    const resolveRule = options?.taskVerificationRuleResolver;
    expect(resolveRule).toBeTypeOf("function");

    const task = createCanonicalTaskVerificationRevision({
      campaignId: "campaign-stage-preflight",
      evidenceRule: resolveRule!({
        evidenceRule: { source: "AELFSCAN" },
        templateCode: "bridge_ebridge",
        verificationType: "ON_CHAIN",
      }),
      points: 120,
      required: true,
      revision: 1,
      taskId: "task-stage-preflight",
      traceId: "trace-stage-preflight-task",
      updatedAt: "2026-07-18T00:00:00.000Z",
      verificationType: "ON_CHAIN",
      walletPolicy: "ANY",
    });
    const identity = deriveTaskVerificationIdentity(
      issueTrustedTaskVerificationIdentityInput({
        binding: { bindingId: "stage-on-chain-v1", bindingRevision: 1 },
        issuedSubject: {
          accountType: "EOA",
          sessionRef: "session-stage-preflight",
          walletAddress: "8A2...1eF",
          walletSource: "PORTKEY_EOA_APP",
        },
        task,
        traceId: "trace-stage-preflight-identity",
      }),
    );
    const begin = vi.fn<TaskVerificationAttemptStore["begin"]>(async () => {
      throw new Error("expected preflight sentinel");
    });
    const attemptStore: TaskVerificationAttemptStore = {
      begin,
      close: vi.fn(async () => undefined),
      finalize: vi.fn(async () => {
        throw new Error("finalize must not run");
      }),
      get: vi.fn(async () => undefined),
      markTransportStarted: vi.fn(async () => {
        throw new Error("mark must not run");
      }),
    };
    const verificationRuntime = new TaskVerificationRuntime({
      attemptStore,
      config: options!.taskVerificationConfig!,
      finalizationWriteFactory: vi.fn(() => {
        throw new Error("write factory must not run");
      }),
      providerHttpRuntime: options!.taskVerificationProviderRuntime!,
      transport: options!.taskVerificationTransport!,
    });

    await expect(verificationRuntime.execute({
      identity,
      task,
      traceId: "trace-stage-preflight-execute",
    })).resolves.toMatchObject({
      diagnosticCodes: ["TASK_VERIFICATION_ATTEMPT_BEGIN_FAILED"],
      outcome: "blocked",
      transportExecuted: false,
    });
    expect(begin).toHaveBeenCalledTimes(1);
    await expect(verificationRuntime.close()).resolves.toMatchObject({ status: "drained" });
  });

  it.each([
    {
      code: "PROVIDER_STAGE_DATABASE_REQUIRED",
      env: stageEnv(undefined, { CAMPAIGN_OS_CAMPAIGN_DB_MODE: "memory" }),
      label: "non-PostgreSQL persistence",
    },
    {
      code: "PROVIDER_STAGE_DATABASE_UNSAFE",
      env: stageEnv(undefined, { CAMPAIGN_OS_STAGE_DISPOSABLE_DATABASE_ACK: undefined }),
      label: "unacknowledged stage database",
    },
    {
      code: "PROVIDER_STAGE_DATABASE_UNSAFE",
      env: stageEnv(undefined, {
        CAMPAIGN_OS_DATABASE_SSL_MODE: "verify-full",
        CAMPAIGN_OS_DATABASE_URL: "postgresql://db.stage.invalid/campaign_os_stage",
      }),
      label: "non-loopback stage database",
    },
    {
      code: "PROVIDER_STAGE_PREVIEW_REQUIRED",
      env: stageEnv(undefined, { CAMPAIGN_OS_PARTICIPANT_PREVIEW_CAMPAIGN_IDS: undefined }),
      label: "missing preview sentinel",
    },
    {
      code: "PROVIDER_STAGE_PREVIEW_REQUIRED",
      env: stageEnv(undefined, { CAMPAIGN_OS_PARTICIPANT_PREVIEW_CAMPAIGN_IDS: "*,campaign-other" }),
      label: "mixed preview scope",
    },
    {
      code: "PROVIDER_STAGE_VERIFICATION_CONFIG_INVALID",
      env: stageEnv(undefined, { CAMPAIGN_OS_TASK_VERIFICATION_ENABLEMENT: "disabled" }),
      label: "disabled verification",
    },
    {
      code: "PROVIDER_STAGE_BINDINGS_REQUIRED",
      env: stageEnv([onChainBinding()]),
      label: "missing DAPP_API binding",
    },
    {
      code: "PROVIDER_STAGE_BINDINGS_REQUIRED",
      env: stageEnv([dappApiBinding()]),
      label: "missing ON_CHAIN binding",
    },
    {
      code: "PROVIDER_STAGE_VERIFICATION_CONFIG_INVALID",
      env: stageEnv([
        onChainBinding(),
        onChainBinding({
          endpointId: "aelfscan-indexer-query",
          id: "stage-on-chain-v2",
          providerFamily: "aelfscan",
          providerGroupId: "aelfscan-indexers",
        }),
        dappApiBinding(),
      ]),
      label: "ambiguous ON_CHAIN source default",
    },
    {
      code: "PROVIDER_STAGE_ENDPOINT_INVALID",
      env: stageEnv(undefined, { [PROVIDER_URL_ENV]: "https://127.0.0.1:5195/verify" }),
      label: "non-HTTP provider endpoint",
    },
    {
      code: "PROVIDER_STAGE_ENDPOINT_KEY_INVALID",
      env: stageEnv([
        onChainBinding({ endpointEnvKey: "CAMPAIGN_OS_OTHER_PROVIDER_URL" }),
        dappApiBinding(),
      ], {
        CAMPAIGN_OS_OTHER_PROVIDER_URL: "http://127.0.0.1:5195/verify",
      }),
      label: "non-dedicated provider endpoint key",
    },
    {
      code: "PROVIDER_STAGE_VERIFICATION_CONFIG_INVALID",
      env: stageEnv(undefined, { [PROVIDER_URL_ENV]: "http://user:password@127.0.0.1:5195/verify" }),
      label: "credential-bearing provider endpoint",
    },
  ])("fails closed before server construction for $label", async ({ code, env }) => {
    const harness = createHarness();

    await expect(startProviderVerificationStageRuntime({
      apiRuntimeFactory: harness.apiRuntimeFactory,
      env,
      healthFetch: harness.healthFetch,
      serverStarter: harness.serverStarter,
    })).rejects.toMatchObject({ code });
    expect(harness.serverStarter).not.toHaveBeenCalled();
    expect(harness.healthFetch).not.toHaveBeenCalled();
  });

  it("forbids static header, body, and credential material in the disposable stage launcher", async () => {
    const harness = createHarness();

    for (const binding of [
      onChainBinding({ headerEnvKey: "CAMPAIGN_OS_STAGE_HEADERS" }),
      onChainBinding({ bodyEnvKey: "CAMPAIGN_OS_STAGE_BODY" }),
      onChainBinding({ credentialEnvKey: "CAMPAIGN_OS_STAGE_CREDENTIAL" }),
    ]) {
      await expect(startProviderVerificationStageRuntime({
        apiRuntimeFactory: harness.apiRuntimeFactory,
        env: stageEnv([binding, dappApiBinding()], {
          CAMPAIGN_OS_STAGE_BODY: "{}",
          CAMPAIGN_OS_STAGE_CREDENTIAL: "stage-private-value",
          CAMPAIGN_OS_STAGE_HEADERS: "{}",
        }),
        healthFetch: harness.healthFetch,
        serverStarter: harness.serverStarter,
      })).rejects.toMatchObject({
        code: "PROVIDER_STAGE_STATIC_MATERIAL_FORBIDDEN",
      });
    }
    expect(harness.serverStarter).not.toHaveBeenCalled();
  });

  it("cleans the server and transport when the startup health probe fails", async () => {
    const harness = createHarness(new Response(JSON.stringify({ ok: false }), {
      headers: { "content-type": "application/json" },
      status: 503,
    }));

    await expect(startProviderVerificationStageRuntime({
      apiRuntimeFactory: harness.apiRuntimeFactory,
      env: stageEnv(),
      healthFetch: harness.healthFetch,
      serverStarter: harness.serverStarter,
    })).rejects.toMatchObject({
      code: "PROVIDER_STAGE_HEALTH_CHECK_FAILED",
      message: "Provider verification stage runtime health check failed.",
    });

    expect(harness.stop).toHaveBeenCalledTimes(1);
    const transport = harness.capturedServerOptions()?.taskVerificationTransport as
      | { state?: () => { accepting: boolean; activeCallCount: number } }
      | undefined;
    expect(transport?.state?.()).toEqual({ accepting: false, activeCallCount: 0 });
  });

  it("rejects an HTTP-success health envelope when the durable provider runtime is blocked", async () => {
    const harness = createHarness(new Response(JSON.stringify({
      data: {
        campaignDatabase: {
          fallbackUsed: false,
          selectedMode: "postgres",
          status: "ready",
        },
        taskVerificationRuntime: {
          bindingCount: 0,
          enabled: false,
          schemaStatus: "blocked",
          status: "blocked",
        },
      },
      ok: true,
    }), {
      headers: { "content-type": "application/json" },
      status: 200,
    }));

    await expect(startProviderVerificationStageRuntime({
      apiRuntimeFactory: harness.apiRuntimeFactory,
      env: stageEnv(),
      healthFetch: harness.healthFetch,
      serverStarter: harness.serverStarter,
    })).rejects.toMatchObject({ code: "PROVIDER_STAGE_HEALTH_CHECK_FAILED" });
    expect(harness.stop).toHaveBeenCalledTimes(1);
  });

  it("surfaces failed startup cleanup instead of masking an orphan-risk condition", async () => {
    const harness = createHarness(new Response(JSON.stringify({ ok: false }), {
      headers: { "content-type": "application/json" },
      status: 503,
    }));
    harness.stop.mockRejectedValueOnce(new Error("safe-test-stop-failure"));

    await expect(startProviderVerificationStageRuntime({
      apiRuntimeFactory: harness.apiRuntimeFactory,
      env: stageEnv(),
      healthFetch: harness.healthFetch,
      serverStarter: harness.serverStarter,
    })).rejects.toMatchObject({
      code: "PROVIDER_STAGE_SHUTDOWN_FAILED",
      message: "Provider verification stage runtime failed to shut down cleanly.",
    });

    expect(harness.stop).toHaveBeenCalledTimes(1);
    const transport = harness.capturedServerOptions()?.taskVerificationTransport as
      | ProviderHttpFetchTransport
      | undefined;
    expect(transport?.state()).toEqual({ accepting: false, activeCallCount: 0 });
  });

  it("surfaces a timed-out transport drain during failed startup cleanup", async () => {
    const harness = createHarness(new Response(JSON.stringify({ ok: false }), {
      headers: { "content-type": "application/json" },
      status: 503,
    }));
    const starter = harness.serverStarter.getMockImplementation();
    harness.serverStarter.mockImplementation(async (options: StartCampaignOsApiServerOptions) => {
      const handle = await starter!(options);
      const transport = options.taskVerificationTransport as ProviderHttpFetchTransport;
      transport.close = vi.fn(async () => ({
        activeCallCount: 1,
        status: "timed_out" as const,
      }));
      return handle;
    });

    await expect(startProviderVerificationStageRuntime({
      apiRuntimeFactory: harness.apiRuntimeFactory,
      env: stageEnv(),
      healthFetch: harness.healthFetch,
      serverStarter: harness.serverStarter,
    })).rejects.toMatchObject({ code: "PROVIDER_STAGE_SHUTDOWN_FAILED" });
    expect(harness.stop).toHaveBeenCalledTimes(1);
  });

  it("uses one idempotent close operation and verifies transport drain after API shutdown", async () => {
    const harness = createHarness();
    const runtime = await startProviderVerificationStageRuntime({
      apiRuntimeFactory: harness.apiRuntimeFactory,
      env: stageEnv(),
      healthFetch: harness.healthFetch,
      serverStarter: harness.serverStarter,
    });

    const first = runtime.close();
    const second = runtime.close();
    expect(first).toBe(second);
    await first;

    expect(harness.stop).toHaveBeenCalledTimes(1);
    expect(runtime.getState()).toMatchObject({
      lifecycle: "closed",
      providerTransport: { accepting: false, activeCallCount: 0 },
    });
  });
});

describe("provider verification stage runtime CLI", () => {
  it("does not let the imported default API entrypoint consume the stage --listen flag", () => {
    expect(isCampaignOsApiServerDirectExecution(
      resolve(process.cwd(), "src/server/providerVerificationStageRuntime.ts"),
    )).toBe(false);
    expect(isCampaignOsApiServerDirectExecution(
      resolve(process.cwd(), "src/server/server.ts"),
    )).toBe(true);
  });

  it("does nothing without explicit --listen and emits one redacted ready record when enabled", async () => {
    const harness = createHarness();
    const silent: string[] = [];
    await expect(runProviderVerificationStageRuntimeCli({
      argv: [],
      env: stageEnv(),
      stdout: (line) => silent.push(line),
    })).resolves.toBeUndefined();
    expect(silent).toEqual([]);

    const output: string[] = [];
    const runtime = await runProviderVerificationStageRuntimeCli({
      apiRuntimeFactory: harness.apiRuntimeFactory,
      argv: ["--listen"],
      env: stageEnv(),
      healthFetch: harness.healthFetch,
      serverStarter: harness.serverStarter,
      stdout: (line) => output.push(line),
    });
    expect(runtime).toBeDefined();
    openRuntimes.add(runtime!);
    expect(output).toHaveLength(1);

    const ready = JSON.parse(output[0]!) as Record<string, unknown>;
    expect(ready).toEqual({
      apiUrl: "http://127.0.0.1:5194",
      bindingCount: 2,
      bindingIds: ["stage-dapp-api-v1", "stage-on-chain-v1"],
      environment: "stage",
      event: "provider_verification_stage_runtime.ready",
      productionReady: false,
      status: "ready",
    });
    expect(JSON.stringify(ready)).not.toContain("campaign_os_stage");
    expect(JSON.stringify(ready)).not.toContain("5195");
    expect(JSON.stringify(ready)).not.toMatch(
      /authorization|credential|database|header|password|payload|secret|token/i,
    );
  });

  it("publishes an explicit package script while keeping ordinary imports inert", async () => {
    const packageJson = JSON.parse(
      await readFile(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.["server:provider-stage"]).toBe(
      "vite-node --script src/server/providerVerificationStageRuntime.ts --listen",
    );
  });
});
