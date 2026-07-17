import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { connect } from "node:net";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PROVIDER_VERIFICATION_SANDBOX_SCENARIOS,
  createProviderVerificationSandbox,
  runProviderVerificationSandboxCli,
  startProviderVerificationSandbox,
  type ProviderVerificationSandboxHandle,
  type ProviderVerificationSandboxScenario,
} from "./providerVerificationSandbox";

const openSandboxes = new Set<ProviderVerificationSandboxHandle>();

const startSandbox = async (
  options: Parameters<typeof startProviderVerificationSandbox>[0] = {},
) => {
  const sandbox = await startProviderVerificationSandbox(options);
  openSandboxes.add(sandbox);
  return sandbox;
};

afterEach(async () => {
  await Promise.all([...openSandboxes].map((sandbox) => sandbox.close()));
  openSandboxes.clear();
  vi.restoreAllMocks();
});

const readJson = async (response: Response) => response.json() as Promise<Record<string, unknown>>;

const safeTraceHash = (value: string) =>
  `trace-sha256-${createHash("sha256").update(value, "utf8").digest("hex").slice(0, 24)}`;

const expectNoEvidence = (body: Record<string, unknown>) => {
  expect(body).not.toHaveProperty("evidenceHash");
  expect(body).not.toHaveProperty("evidenceRef");
  expect(body).not.toHaveProperty("evidenceId");
};

const waitForClosedRequest = async (sandbox: ProviderVerificationSandboxHandle) => {
  await vi.waitFor(() => {
    const state = sandbox.state();
    expect(state.activeRequestCount).toBe(0);
    expect(state.timerCount).toBe(0);
  }, { timeout: 2_000 });
};

describe("provider verification sandbox", () => {
  it.each([
    "0.0.0.0",
    "::",
    "192.0.2.10",
    "provider.example.invalid",
  ])("rejects the non-loopback host %s before opening a listener", async (host) => {
    await expect(startProviderVerificationSandbox({ host, port: 0 })).rejects.toMatchObject({
      code: "PROVIDER_SANDBOX_NON_LOOPBACK_HOST",
      message: "Provider verification sandbox requires a loopback host.",
    });
  });

  it("starts once through an idempotent controller and exposes a typed loopback handle", async () => {
    const controller = createProviderVerificationSandbox({ host: "127.0.0.1", port: 0 });
    const firstStart = controller.start();
    const secondStart = controller.start();

    expect(firstStart).toBe(secondStart);
    const first = await firstStart;
    const second = await secondStart;
    openSandboxes.add(first);

    expect(first).toBe(second);
    expect(first.host).toBe("127.0.0.1");
    expect(first.port).toBeGreaterThan(0);
    expect(first.verifyUrl).toBe(`http://127.0.0.1:${first.port}/verify`);
    expect(first.urlForScenario("pending")).toBe(`${first.verifyUrl}/pending`);
    expect(first.state()).toMatchObject({
      accepting: true,
      activeRequestCount: 0,
      lifecycle: "listening",
      requestCount: 0,
      retainedRequestCount: 0,
      socketCount: 0,
      timerCount: 0,
    });
  });

  it("serves deterministic completed, negative, pending, 429, 5xx, and malformed fixtures", async () => {
    const sandbox = await startSandbox();
    const completed = await fetch(sandbox.urlForScenario("completed"));
    const completedBody = await readJson(completed);

    expect(completed.status).toBe(200);
    expect(completed.headers.get("content-type")).toMatch(/^application\/json/);
    expect(completedBody).toMatchObject({
      eligible: true,
      status: "completed",
      verified: true,
    });
    expect(completedBody.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(completedBody.evidenceRef).toMatch(/^evidence-ref:[A-Za-z0-9._:-]+$/);
    expect(String(completedBody.evidenceRef)).not.toMatch(
      /authorization|credential|header|password|payload|secret|token|uri|url/i,
    );

    const negative = await fetch(sandbox.urlForScenario("negative"));
    const negativeBody = await readJson(negative);
    expect(negative.status).toBe(200);
    expect(negativeBody).toEqual({ status: "failed", verified: false });
    expectNoEvidence(negativeBody);

    const pending = await fetch(sandbox.urlForScenario("pending"));
    const pendingBody = await readJson(pending);
    expect(pending.status).toBe(202);
    expect(pendingBody).toEqual({ status: "pending" });
    expectNoEvidence(pendingBody);

    const rateLimited = await fetch(sandbox.urlForScenario("429"));
    const rateLimitedBody = await readJson(rateLimited);
    expect(rateLimited.status).toBe(429);
    expect(rateLimited.headers.get("retry-after")).toBe("1");
    expect(rateLimitedBody).toEqual({ status: "pending" });
    expectNoEvidence(rateLimitedBody);

    const unavailable = await fetch(sandbox.urlForScenario("5xx"));
    const unavailableBody = await readJson(unavailable);
    expect(unavailable.status).toBe(503);
    expect(unavailableBody).toEqual({ status: "unavailable" });
    expectNoEvidence(unavailableBody);

    const malformed = await fetch(sandbox.urlForScenario("malformed"));
    expect(malformed.status).toBe(200);
    expect(malformed.headers.get("content-type")).toMatch(/^application\/json/);
    expect(await malformed.text()).toBe("{malformed-json");

    expect(sandbox.count()).toBe(6);
    expect(sandbox.count("completed")).toBe(1);
    expect(sandbox.count("negative")).toBe(1);
    expect(sandbox.count("pending")).toBe(1);
    expect(sandbox.count("429")).toBe(1);
    expect(sandbox.count("5xx")).toBe(1);
    expect(sandbox.count("malformed")).toBe(1);
  });

  it("defaults /verify to completed and resolves a bounded scenario selector without retaining raw material", async () => {
    const sandbox = await startSandbox({ maxRequestRecords: 2 });
    const rawQuery = "query-value-must-not-survive";
    const rawCredential = "credential-value-must-not-survive";
    const rawBody = "body-value-must-not-survive";
    const safeTraceId = "trace-provider-sandbox-safe-1";
    const credentialLikeTrace =
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature";

    const first = await fetch(`${sandbox.verifyUrl}?mode=${rawQuery}`, {
      body: JSON.stringify({ payload: rawBody }),
      headers: {
        authorization: `Bearer ${rawCredential}`,
        "content-type": "application/json",
        "x-trace-id": safeTraceId,
      },
      method: "POST",
    });
    expect(first.status).toBe(200);
    await first.arrayBuffer();

    const second = await fetch(`${sandbox.verifyUrl}?scenario=pending&token=${rawQuery}`, {
      headers: { "x-trace-id": "trace-provider-sandbox-safe-2" },
    });
    expect(second.status).toBe(202);
    await second.arrayBuffer();

    const third = await fetch(`${sandbox.verifyUrl}/negative?signature=${rawQuery}`, {
      headers: {
        authorization: `Bearer ${rawCredential}`,
        "x-trace-id": credentialLikeTrace,
      },
    });
    expect(third.status).toBe(200);
    await third.arrayBuffer();

    const state = sandbox.state();
    expect(state.requestCount).toBe(3);
    expect(state.retainedRequestCount).toBe(2);
    expect(state.droppedRequestRecordCount).toBe(1);
    expect(state.recentRequests).toEqual([
      {
        requestNumber: 2,
        scenario: "pending",
        traceId: safeTraceHash("trace-provider-sandbox-safe-2"),
      },
      {
        requestNumber: 3,
        scenario: "negative",
        traceId: safeTraceHash(credentialLikeTrace),
      },
    ]);
    expect(Object.keys(state.recentRequests[0] ?? {}).sort()).toEqual([
      "requestNumber",
      "scenario",
      "traceId",
    ]);
    expect(state.counts).toMatchObject({ completed: 1, negative: 1, pending: 1 });

    const serializedState = JSON.stringify(state);
    expect(serializedState).not.toContain(rawQuery);
    expect(serializedState).not.toContain(rawCredential);
    expect(serializedState).not.toContain(rawBody);
    expect(serializedState).not.toContain(safeTraceId);
    expect(serializedState).not.toContain(credentialLikeTrace);
    expect(serializedState).not.toContain("authorization");
    expect(serializedState).not.toContain("signature");
    expect(serializedState).not.toContain("/verify");
  });

  it("selects fixtures from canonical rule fields without persisting request bodies or queries", async () => {
    const sandbox = await startSandbox();
    const byQuery = await fetch(
      `${sandbox.verifyUrl}/participants/account-safe/tasks/task-safe?methodName=429`,
    );
    const byBody = await fetch(`${sandbox.verifyUrl}/participants/account-safe/tasks/task-safe`, {
      body: JSON.stringify({ action: "negative", unrelated: "not-retained" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(byQuery.status).toBe(429);
    expect(byBody.status).toBe(200);
    expect(await readJson(byBody)).toEqual({ status: "failed", verified: false });
    expect(sandbox.state().recentRequests.map(({ scenario }) => scenario)).toEqual([
      "429",
      "negative",
    ]);
    expect(JSON.stringify(sandbox.state())).not.toContain("account-safe");
    expect(JSON.stringify(sandbox.state())).not.toContain("not-retained");
  });

  it("makes declared-size and chunked overflow reproducible on both sides of a client limit", async () => {
    const responseBytes = 4_096;
    const sandbox = await startSandbox({
      oversizedResponseBytes: responseBytes,
      streamChunkBytes: 256,
      streamIntervalMs: 3,
    });

    const oversized = await fetch(sandbox.urlForScenario("oversized"));
    expect(oversized.headers.get("content-length")).toBe(String(responseBytes));
    expect((await oversized.arrayBuffer()).byteLength).toBe(responseBytes);

    const completeChunked = await fetch(sandbox.urlForScenario("chunked"));
    expect(completeChunked.headers.get("content-length")).toBeNull();
    expect((await completeChunked.arrayBuffer()).byteLength).toBe(responseBytes);

    const clientLimit = 1_024;
    const cancelledChunked = await fetch(sandbox.urlForScenario("chunked"));
    const reader = cancelledChunked.body!.getReader();
    let observedBytes = 0;
    while (observedBytes <= clientLimit) {
      const chunk = await reader.read();
      expect(chunk.done).toBe(false);
      observedBytes += chunk.value?.byteLength ?? 0;
    }
    await reader.cancel();

    expect(observedBytes).toBeGreaterThan(clientLimit);
    expect(observedBytes).toBeLessThan(responseBytes);
    await waitForClosedRequest(sandbox);
    expect(sandbox.count("oversized")).toBe(1);
    expect(sandbox.count("chunked")).toBe(2);
  });

  it("closes timeout and server-aborted connections without leaving fixture timers active", async () => {
    const sandbox = await startSandbox({ timeoutFixtureMs: 2_000 });
    const timeoutSocket = connect(sandbox.port, sandbox.host);
    const timeoutSocketClosed = new Promise<void>((resolveClosed) => {
      timeoutSocket.once("close", resolveClosed);
    });
    timeoutSocket.on("error", () => undefined);
    await new Promise<void>((resolveConnected) => timeoutSocket.once("connect", resolveConnected));
    timeoutSocket.write([
      "GET /verify/timeout HTTP/1.1",
      `Host: ${sandbox.host}:${sandbox.port}`,
      "Connection: close",
      "",
      "",
    ].join("\r\n"));

    await vi.waitFor(() => expect(sandbox.state().activeRequestCount).toBe(1));
    timeoutSocket.destroy();
    await timeoutSocketClosed;
    await waitForClosedRequest(sandbox);

    await expect(
      fetch(sandbox.urlForScenario("abort")).then((response) => response.text()),
    ).rejects.toBeInstanceOf(Error);
    await waitForClosedRequest(sandbox);

    expect(sandbox.count("timeout")).toBe(1);
    expect(sandbox.count("abort")).toBe(1);
    await vi.waitFor(() => expect(sandbox.state().socketCount).toBe(0));
  });

  it("rejects new calls and bounds socket, timer, request, and listener cleanup on idempotent close", async () => {
    const sandbox = await startSandbox({ shutdownTimeoutMs: 250, timeoutFixtureMs: 10_000 });
    const activeRequest = fetch(sandbox.urlForScenario("timeout"))
      .then((response) => response.text())
      .catch(() => undefined);
    await vi.waitFor(() => expect(sandbox.state().activeRequestCount).toBe(1));

    const startedAt = Date.now();
    const firstClose = sandbox.close();
    const secondClose = sandbox.close();
    expect(firstClose).toBe(secondClose);
    await firstClose;
    await activeRequest;

    expect(Date.now() - startedAt).toBeLessThan(1_000);
    expect(sandbox.state()).toMatchObject({
      accepting: false,
      activeRequestCount: 0,
      lifecycle: "closed",
      listenerCount: 0,
      socketCount: 0,
      timerCount: 0,
    });
    await expect(fetch(sandbox.verifyUrl)).rejects.toBeInstanceOf(Error);
  });

  it("destroys an incomplete inbound request during bounded close", async () => {
    const sandbox = await startSandbox({ shutdownTimeoutMs: 100 });
    const socket = connect(sandbox.port, sandbox.host);
    const closed = new Promise<void>((resolve) => socket.once("close", resolve));
    socket.on("error", () => undefined);
    await new Promise<void>((resolve) => socket.once("connect", resolve));
    socket.write([
      "POST /verify/completed HTTP/1.1",
      `Host: ${sandbox.host}:${sandbox.port}`,
      "Content-Type: application/json",
      "Content-Length: 1000",
      "Connection: keep-alive",
      "",
      "{",
    ].join("\r\n"));

    await vi.waitFor(() => expect(sandbox.state().socketCount).toBe(1));
    await sandbox.close();
    await closed;
    expect(sandbox.state()).toMatchObject({
      activeRequestCount: 0,
      lifecycle: "closed",
      socketCount: 0,
      timerCount: 0,
    });
  });
});

describe("provider verification sandbox CLI", () => {
  it("does nothing without explicit --listen and emits one safe machine-readable ready line when enabled", async () => {
    const silentOutput: string[] = [];
    await expect(runProviderVerificationSandboxCli({
      argv: [],
      stdout: (line) => silentOutput.push(line),
    })).resolves.toBeUndefined();
    expect(silentOutput).toEqual([]);

    const output: string[] = [];
    const sandbox = await runProviderVerificationSandboxCli({
      argv: ["--listen", "--host", "127.0.0.1", "--port", "0"],
      env: {},
      stdout: (line) => output.push(line),
    });
    expect(sandbox).toBeDefined();
    openSandboxes.add(sandbox!);
    expect(output).toHaveLength(1);

    const ready = JSON.parse(output[0]!) as Record<string, unknown>;
    expect(ready).toEqual({
      event: "provider_verification_sandbox.ready",
      host: "127.0.0.1",
      port: sandbox!.port,
      scenarioCount: PROVIDER_VERIFICATION_SANDBOX_SCENARIOS.length,
      status: "ready",
      verifyUrl: sandbox!.verifyUrl,
    });
    expect(JSON.stringify(ready)).not.toMatch(
      /authorization|credential|header|password|payload|secret|token/i,
    );
  });

  it("publishes an explicit package script that cannot listen by default import", async () => {
    const packageJson = JSON.parse(
      await readFile(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.["server:provider-sandbox"]).toBe(
      "vite-node --script src/server/providerVerificationSandbox.ts --listen",
    );
  });

  it("keeps the public scenario contract exhaustive and stable", () => {
    expect(PROVIDER_VERIFICATION_SANDBOX_SCENARIOS).toEqual([
      "completed",
      "negative",
      "pending",
      "429",
      "5xx",
      "timeout",
      "malformed",
      "oversized",
      "chunked",
      "abort",
    ] satisfies ProviderVerificationSandboxScenario[]);
    expect(Object.isFrozen(PROVIDER_VERIFICATION_SANDBOX_SCENARIOS)).toBe(true);
  });
});
