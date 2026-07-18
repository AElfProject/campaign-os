// @vitest-environment node

import { createHash, randomBytes } from "node:crypto";
import AElf from "aelf-sdk";
import { afterEach, describe, expect, it } from "vitest";
import {
  createPortkeyCaRelationProvider,
} from "./portkeyCaRelationProvider";
import {
  PortkeyCaRelationSandboxError,
  runPortkeyCaRelationSandboxCli,
  startPortkeyCaRelationSandbox,
  type PortkeyCaRelationSandboxHandle,
} from "./portkeyCaRelationSandbox";

const openSandboxes = new Set<PortkeyCaRelationSandboxHandle>();
const NOW = new Date("2026-07-18T06:00:00.000Z");

const ephemeralAddress = (): string => {
  const keyPair = AElf.wallet.ellipticEc.genKeyPair({ entropy: randomBytes(32) });
  return AElf.wallet.getAddressFromPubKey(keyPair.getPublic());
};

const fixture = () => ({
  blockHeight: 12_345,
  caAddress: ephemeralAddress(),
  caHash: createHash("sha256").update(randomBytes(32)).digest("hex"),
  chainId: "AELF" as const,
  managerAddress: ephemeralAddress(),
  observedAt: NOW.toISOString(),
  relationRevision: `revision-${randomBytes(8).toString("hex")}`,
  relationVersion: 7,
});

const start = async (
  options: Parameters<typeof startPortkeyCaRelationSandbox>[0] = {},
): Promise<PortkeyCaRelationSandboxHandle> => {
  const handle = await startPortkeyCaRelationSandbox(options);
  openSandboxes.add(handle);
  return handle;
};

afterEach(async () => {
  await Promise.all([...openSandboxes].map(async (handle) => {
    await handle.close();
    openSandboxes.delete(handle);
  }));
});

describe("Portkey CA relation loopback sandbox", () => {
  it("serves an exact current fixture to the real provider without retaining sensitive facts", async () => {
    const value = fixture();
    const sandbox = await start({ fixture: value, maxRequestRecords: 2 });
    const provider = createPortkeyCaRelationProvider({
      clock: { now: () => new Date(NOW) },
      config: {
        enabled: true,
        endpointEnvKey: "CAMPAIGN_OS_PORTKEY_CA_RELATION_URL",
        id: "stage-portkey-ca",
        productionApproved: false,
        timeoutMs: 200,
      },
      endpointResolver: async () => sandbox.relationUrl,
      environment: "stage",
      freshnessPolicy: {
        maxAgeMs: 5_000,
        maxFutureSkewMs: 1_000,
        minimumBlockHeight: 12_000,
        minimumRelationVersion: 5,
      },
    });

    const relationResult = await provider.verifyRelation({
      caAddressHint: value.caAddress,
      caHash: value.caHash,
      chainId: value.chainId,
      managerAddress: value.managerAddress,
      traceId: "trace-sandbox-current",
    });
    expect(relationResult).toMatchObject({ status: "verified" });

    const state = sandbox.state();
    expect(state).toMatchObject({
      activeRequestCount: 0,
      accepting: true,
      requestCount: 1,
      retainedRequestCount: 1,
    });
    const serialized = JSON.stringify(state);
    for (const unsafe of [value.caAddress, value.caHash, value.managerAddress, sandbox.relationUrl]) {
      expect(serialized).not.toContain(unsafe);
    }
    expect(serialized).not.toMatch(/body|proof|signature|publicKey|endpoint|credential/i);
    await viWaitFor(() => sandbox.state().socketCount > 0);
    await provider.close();
    await viWaitFor(() => sandbox.state().socketCount === 0);
    expect(sandbox.state().socketCount).toBe(0);
  });

  it("exposes rotation, stale, malformed, oversized, rate-limit and outage scenarios", async () => {
    const value = fixture();
    const sandbox = await start({ fixture: value, oversizedResponseBytes: 4_096 });
    const scenarios = [
      "unknown",
      "wrong-manager",
      "wrong-ca-address",
      "wrong-ca-hash",
      "wrong-chain",
      "stale-time",
      "stale-block",
      "stale-version",
      "429",
      "5xx",
      "malformed",
      "unknown-field",
      "oversized",
      "chunked",
    ] as const;

    for (const scenario of scenarios) {
      const response = await fetch(sandbox.urlForScenario(scenario), {
        body: JSON.stringify({
          caAddress: value.caAddress,
          caHash: value.caHash,
          chainId: value.chainId,
          managerAddress: value.managerAddress,
          version: "campaign-os-portkey-ca-query/v1",
        }),
        headers: { "content-type": "application/json", "x-trace-id": "trace-sandbox-matrix" },
        method: "POST",
      });
      expect(response.status).toBeGreaterThanOrEqual(200);
      await response.body?.cancel();
    }

    expect(sandbox.count()).toBe(scenarios.length);
    for (const scenario of scenarios) {
      expect(sandbox.count(scenario)).toBe(1);
    }
  });

  it("bounds retained request metadata with a ring buffer", async () => {
    const value = fixture();
    const sandbox = await start({ fixture: value, maxRequestRecords: 2 });
    for (let index = 0; index < 5; index += 1) {
      const response = await fetch(sandbox.urlForScenario("unknown"), { method: "POST" });
      await response.body?.cancel();
    }

    expect(sandbox.state()).toMatchObject({
      droppedRequestRecordCount: 3,
      requestCount: 5,
      retainedRequestCount: 2,
    });
    expect(sandbox.state().recentRequests).toHaveLength(2);
  });

  it("rejects remote bind, production hostname and static secret-like options before listen", async () => {
    await expect(startPortkeyCaRelationSandbox({ host: "0.0.0.0" }))
      .rejects.toBeInstanceOf(PortkeyCaRelationSandboxError);
    await expect(startPortkeyCaRelationSandbox({ host: "provider.example" }))
      .rejects.toMatchObject({ code: "PORTKEY_CA_SANDBOX_NON_LOOPBACK_HOST" });
    await expect(startPortkeyCaRelationSandbox({
      staticCredential: randomBytes(24).toString("hex"),
    } as never)).rejects.toMatchObject({ code: "PORTKEY_CA_SANDBOX_STATIC_SECRET_REJECTED" });
  });

  it("enforces the exact prefixed env allowlist and permits empty unknown keys", async () => {
    for (const key of [
      "CAMPAIGN_OS_PORTKEY_CA_SANDBOX_API_KEY",
      "CAMPAIGN_OS_PORTKEY_CA_SANDBOX_ACCESS_KEY",
      "CAMPAIGN_OS_PORTKEY_CA_SANDBOX_FOO",
      "CAMPAIGN_OS_PORTKEY_CA_SANDBOX_WHATEVER",
    ]) {
      await expect(runPortkeyCaRelationSandboxCli({
        argv: ["--listen"],
        env: { [key]: randomBytes(24).toString("hex") },
      })).rejects.toMatchObject({ code: "PORTKEY_CA_SANDBOX_STATIC_SECRET_REJECTED" });
    }

    const output: string[] = [];
    const handle = await runPortkeyCaRelationSandboxCli({
      argv: ["--listen"],
      env: {
        CAMPAIGN_OS_PORTKEY_CA_SANDBOX_FOO: "",
        CAMPAIGN_OS_PORTKEY_CA_SANDBOX_HOST: "127.0.0.1",
        CAMPAIGN_OS_PORTKEY_CA_SANDBOX_PORT: "0",
      },
      stdout: (line) => output.push(line),
    });
    expect(handle).toBeDefined();
    if (!handle) {
      throw new Error("Expected the sandbox CLI to start.");
    }
    openSandboxes.add(handle);
    expect(handle.host).toBe("127.0.0.1");
    expect(handle.port).toBeGreaterThan(0);
    expect(output).toHaveLength(1);
    await handle.close();
    openSandboxes.delete(handle);
    expect(handle.state()).toMatchObject({
      lifecycle: "closed",
      listenerCount: 0,
      socketCount: 0,
      timerCount: 0,
    });
  });

  it("aborts active requests and releases listeners, sockets and timers on idempotent shutdown", async () => {
    const value = fixture();
    const sandbox = await start({ fixture: value, shutdownTimeoutMs: 100, timeoutFixtureMs: 5_000 });
    const active = fetch(sandbox.urlForScenario("timeout"), { method: "POST" }).catch(() => undefined);
    await viWaitFor(() => sandbox.state().activeRequestCount === 1);

    const firstClose = sandbox.close();
    expect(sandbox.close()).toBe(firstClose);
    await firstClose;
    await active;

    expect(sandbox.state()).toMatchObject({
      accepting: false,
      activeRequestCount: 0,
      lifecycle: "closed",
      listenerCount: 0,
      socketCount: 0,
      timerCount: 0,
    });
    await expect(fetch(sandbox.relationUrl)).rejects.toBeDefined();
  });
});

async function viWaitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 1_000;
  while (!predicate()) {
    if (Date.now() >= deadline) {
      throw new Error("Sandbox state did not settle in time.");
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
