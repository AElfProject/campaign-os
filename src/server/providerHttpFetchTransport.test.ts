// @vitest-environment node

import {
  createServer,
  type IncomingHttpHeaders,
  type IncomingMessage,
  type RequestListener,
  type Server,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createProviderHttpCanonicalRequestMaterial,
  createProviderHttpExecutionMaterialResolver,
  type ProviderHttpExecutionMaterialResolver,
} from "./providerHttpExecutionMaterial";
import {
  bindProviderHttpCanonicalRequestMaterial,
  createProviderHttpFetchTransport,
  normalizeProviderHttpTimeoutMs,
} from "./providerHttpFetchTransport";
import {
  planProviderHttpRequest,
  type ProviderHttpRequestPlan,
} from "./providerHttpRequestPlanner";
import { normalizeProviderHttpResponse } from "./providerHttpResponseNormalizer";
import { createProviderHttpRuntimeSummary } from "./providerHttpRuntimeRegistry";
import type { ProviderHttpTransportContext } from "./providerHttpTransport";
import {
  createCanonicalTaskVerificationRevision,
  deriveTaskVerificationIdentity,
  issueTrustedTaskVerificationIdentityInput,
} from "./taskVerification";
import type {
  TaskVerificationBinding,
  TaskVerificationEnvironment,
} from "./taskVerificationConfig";
import { createTaskVerificationProviderStrategyRegistry } from "./taskVerificationProviderStrategies";

const MAX_RESPONSE_BYTES = 256 * 1024;
const ENDPOINT_KEY = "CAMPAIGN_OS_FAKE_FETCH_ENDPOINT";
const HEADER_KEY = "CAMPAIGN_OS_FAKE_FETCH_HEADERS";
const BODY_KEY = "CAMPAIGN_OS_FAKE_FETCH_BODY";
const CREDENTIAL_KEY = "CAMPAIGN_OS_FAKE_FETCH_CREDENTIAL";
const FAKE_CREDENTIAL = "fake-fetch-credential-sentinel";

const activatedRuntime = createProviderHttpRuntimeSummary({
  env: {
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
  },
  profileId: "production-required",
  transportProvided: true,
});

interface RecordedRequest {
  body: string;
  headers: IncomingHttpHeaders;
  method?: string;
  url?: string;
}

interface LoopbackServer {
  close: () => Promise<void>;
  origin: string;
  requests: RecordedRequest[];
  server: Server;
}

const openServers = new Set<LoopbackServer>();

afterEach(async () => {
  vi.useRealTimers();
  await Promise.all([...openServers].map((entry) => entry.close()));
  openServers.clear();
});

const binding = (
  overrides: Partial<TaskVerificationBinding> = {},
): TaskVerificationBinding => Object.freeze({
  bodyEnvKey: BODY_KEY,
  credentialEnvKey: CREDENTIAL_KEY,
  degradationPolicy: "manual_review",
  enabled: true,
  endpointEnvKey: ENDPOINT_KEY,
  endpointId: "dapp-api-verification-status",
  evidenceSource: "DAPP_API",
  headerEnvKey: HEADER_KEY,
  id: "fake-fetch-binding",
  maxAttempts: 3,
  maxResponseBytes: MAX_RESPONSE_BYTES,
  providerFamily: "ebridge",
  providerGroupId: "dapp-api-adapters",
  requestMappingId: "provider-http-request-map:dapp-api-status-v1",
  responseMappingId: "provider-http-response-map:dapp-api-status-v1",
  revision: 1,
  timeoutMs: 2_500,
  verificationType: "DAPP_API",
  ...overrides,
});

const onChainBinding = (): TaskVerificationBinding => binding({
  endpointId: "aefinder-aelfscan-indexer-query",
  evidenceSource: "AELFSCAN",
  providerFamily: "aefinder",
  providerGroupId: "aefinder-aelfscan-indexers",
  requestMappingId: "provider-http-request-map:on-chain-indexer-v1",
  responseMappingId: "provider-http-response-map:on-chain-indexer-v1",
  verificationType: "ON_CHAIN",
});

const canonicalAuthority = (input: {
  campaignId: string;
  chainId: string;
  contractAddress: string;
  revision: number;
  taskId: string;
  walletAddress: string;
}) => {
  const task = createCanonicalTaskVerificationRevision({
    campaignId: input.campaignId,
    evidenceRule: {
      chainId: input.chainId,
      contractAddress: input.contractAddress,
      expectedField: "verified",
      expectedType: "boolean",
      expectedValue: true,
    },
    points: 25,
    required: true,
    revision: input.revision,
    taskId: input.taskId,
    traceId: "trace-fetch-canonical",
    updatedAt: "2026-07-16T00:00:00.000Z",
    verificationType: "ON_CHAIN",
    walletPolicy: "ANY",
  });
  const identity = deriveTaskVerificationIdentity(
    issueTrustedTaskVerificationIdentityInput({
      binding: { bindingId: "fake-fetch-binding", bindingRevision: 1 },
      issuedSubject: {
        accountType: "AA",
        sessionRef: `session-ref:${input.taskId}`,
        walletAddress: input.walletAddress,
        walletSource: "PORTKEY_AA",
      },
      task,
      traceId: "trace-fetch-canonical",
    }),
  );
  return { identity, task };
};

const plan = (
  overrides: Partial<ProviderHttpRequestPlan> = {},
): ProviderHttpRequestPlan => ({
  attempt: { count: 1, maxAttempts: 3 },
  bodyRef: "config-ref:campaign_os_fake_fetch_body",
  campaignId: "campaign-fake-fetch",
  endpointId: "dapp-api-verification-status",
  headerRefs: ["header-ref:provider-http-dapp-auth"],
  idempotencyRef: "idem-ref:fake-fetch",
  leaseRef: "lease-ref:fake-fetch",
  matcherContextDigest: "a".repeat(64),
  maxResponseBytes: MAX_RESPONSE_BYTES,
  method: "POST",
  operatorContextRefs: {},
  providerGroupId: "dapp-api-adapters",
  requestDigest: "b".repeat(64),
  requestMappingId: "provider-http-request-map:dapp-api-status-v1",
  responseMappingId: "provider-http-response-map:dapp-api-status-v1",
  retryPolicyRef: "retry-policy:provider-http-dapp-backoff",
  taskId: "task-fake-fetch",
  timeoutMs: 2_500,
  timeoutPolicyRef: "timeout-policy:provider-http-dapp-2500ms",
  traceId: "trace-fetch",
  urlRef: "provider.endpoint.dapp_api.verification_status.url",
  verificationType: "DAPP_API",
  ...overrides,
});

const context = (
  overrides: Partial<ProviderHttpTransportContext> = {},
): ProviderHttpTransportContext => ({
  attemptStartedAtMs: Date.now(),
  traceId: "trace-fetch",
  ...overrides,
});

const resolverFor = (
  endpoint: string,
  options: {
    approvedProductionHosts?: readonly string[];
    body?: string;
    binding?: TaskVerificationBinding;
    credential?: string;
    environment?: TaskVerificationEnvironment;
    headers?: string;
  } = {},
): ProviderHttpExecutionMaterialResolver => {
  const providerBinding = options.binding ?? binding();
  const values: Record<string, string | undefined> = {
    [BODY_KEY]: options.body ?? "{\"requestRef\":\"fake-fetch-request\"}",
    [CREDENTIAL_KEY]: options.credential ?? FAKE_CREDENTIAL,
    [ENDPOINT_KEY]: endpoint,
    [HEADER_KEY]: options.headers ?? "{\"x-provider\":\"fake-fetch-provider\"}",
  };

  const strictResolver = createProviderHttpExecutionMaterialResolver({
    ...(options.approvedProductionHosts
      ? { approvedProductionHosts: options.approvedProductionHosts }
      : {}),
    binding: providerBinding,
    environment: options.environment ?? "local",
    lookup: { get: (key) => values[key] },
  });
  return (request, requestMaterial) => {
    if (requestMaterial) {
      return strictResolver(request, requestMaterial);
    }
    const canonical = createProviderHttpCanonicalRequestMaterial({
      bindingId: providerBinding.id,
      bindingRevision: providerBinding.revision,
      endpointId: request.endpointId,
      mapping: {
        fields: [{
          name: "x-request-id",
          required: true,
          source: "task.taskId",
          target: "header",
        }],
        method: request.method,
      },
      requestMappingId: request.requestMappingId,
      strategyId: request.strategyId ?? "dapp-api-status-v1",
      values: { "task.taskId": request.taskId },
    });
    return strictResolver({
      ...request,
      requestMaterialRef: canonical.requestMaterialRef,
      strategyId: request.strategyId ?? "dapp-api-status-v1",
    }, canonical.material);
  };
};

const startServer = async (
  respond: RequestListener,
): Promise<LoopbackServer> => {
  const requests: RecordedRequest[] = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    requests.push({
      body: Buffer.concat(chunks).toString("utf8"),
      headers: request.headers,
      method: request.method,
      url: request.url,
    });
    await respond?.(request, response);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address() as AddressInfo;
  let closed = false;
  const loopback: LoopbackServer = {
    async close() {
      if (closed) {
        return;
      }
      closed = true;
      server.closeAllConnections?.();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
    origin: `http://127.0.0.1:${address.port}`,
    requests,
    server,
  };
  openServers.add(loopback);
  return loopback;
};

const json = (response: ServerResponse<IncomingMessage>, status: number, body: unknown) => {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
};

describe("provider HTTP fetch transport", () => {
  it("derives distinct real wire requests from canonical Participant and Task inputs", async () => {
    const server = await startServer((_request, response) => {
      json(response, 200, {
        evidenceHash: "c".repeat(64),
        evidenceRef: "evidence-ref:canonical-fetch-result",
        status: "completed",
        verified: true,
      });
    });
    const providerBinding = onChainBinding();
    const values = {
      [BODY_KEY]: "{\"staticMode\":\"fake\"}",
      [CREDENTIAL_KEY]: FAKE_CREDENTIAL,
      [ENDPOINT_KEY]: `${server.origin}/provider-base?mode=fake`,
      [HEADER_KEY]: "{\"x-provider\":\"fake-fetch-provider\"}",
    };
    const transport = createProviderHttpFetchTransport({
      materialResolver: createProviderHttpExecutionMaterialResolver({
        binding: providerBinding,
        environment: "local",
        lookup: { get: (key) => values[key as keyof typeof values] },
      }),
    });
    const registry = createTaskVerificationProviderStrategyRegistry({ environment: "local" });
    const build = (authority: ReturnType<typeof canonicalAuthority>) => {
      const built = registry.buildRequest({
        attempt: { count: 1, maxAttempts: 3 },
        binding: providerBinding,
        identity: authority.identity,
        task: authority.task,
        traceId: "trace-fetch-canonical",
      });
      if (!built.ok) {
        throw new Error(`strategy failed: ${built.diagnosticCode}`);
      }
      const planned = planProviderHttpRequest(built.plannerInput, activatedRuntime);
      if (!planned.ok) {
        throw new Error(`planner failed: ${planned.diagnostics.map(({ code }) => code).join(",")}`);
      }
      return { built, plan: planned.plan };
    };
    const first = build(canonicalAuthority({
      campaignId: "campaign-canonical-a",
      chainId: "AELF",
      contractAddress: "ELF_FAKE_CONTRACT_A",
      revision: 2,
      taskId: "task-canonical-a",
      walletAddress: "ELF_FAKE_CANONICAL_WALLET_A",
    }));
    const second = build(canonicalAuthority({
      campaignId: "campaign-canonical-b",
      chainId: "tDVV",
      contractAddress: "ELF_FAKE_CONTRACT_B",
      revision: 3,
      taskId: "task-canonical-b",
      walletAddress: "ELF_FAKE_CANONICAL_WALLET_B",
    }));
    const transportContext = context({ traceId: "trace-fetch-canonical" });

    const staticOnly = await transport(first.plan, transportContext);
    expect(staticOnly).toMatchObject({
      diagnostic: { code: "material_resolution_failed" },
      timedOut: false,
    });
    expect(server.requests).toHaveLength(0);

    const firstResult = await bindProviderHttpCanonicalRequestMaterial(
      transport,
      first.built.requestMaterial,
    )(first.plan, transportContext);
    const secondResult = await bindProviderHttpCanonicalRequestMaterial(
      transport,
      second.built.requestMaterial,
    )(second.plan, transportContext);

    expect(firstResult).toMatchObject({ statusCode: 200, timedOut: false });
    expect(secondResult).toMatchObject({ statusCode: 200, timedOut: false });
    expect(server.requests).toHaveLength(2);
    expect(server.requests[0]?.url).toBe(
      "/provider-base/participants/ELF_FAKE_CANONICAL_WALLET_A/tasks/task-canonical-a?mode=fake&chainId=AELF",
    );
    expect(server.requests[1]?.url).toBe(
      "/provider-base/participants/ELF_FAKE_CANONICAL_WALLET_B/tasks/task-canonical-b?mode=fake&chainId=tDVV",
    );
    expect(JSON.parse(server.requests[0]?.body ?? "{}")).toEqual({
      contractAddress: "ELF_FAKE_CONTRACT_A",
      staticMode: "fake",
      taskRevision: 2,
    });
    expect(JSON.parse(server.requests[1]?.body ?? "{}")).toEqual({
      contractAddress: "ELF_FAKE_CONTRACT_B",
      staticMode: "fake",
      taskRevision: 3,
    });
    expect(server.requests[0]?.headers).toMatchObject({
      "x-campaign-id": "campaign-canonical-a",
      "x-wallet-source": "PORTKEY_AA",
    });
    expect(server.requests[1]?.headers).toMatchObject({
      "x-campaign-id": "campaign-canonical-b",
      "x-wallet-source": "PORTKEY_AA",
    });
    expect(first.plan.requestDigest).not.toBe(second.plan.requestDigest);
    expect(JSON.stringify(first.plan)).not.toContain("ELF_FAKE_CANONICAL_WALLET_A");
    expect(JSON.stringify(second.plan)).not.toContain("ELF_FAKE_CONTRACT_B");
    await expect(transport.close()).resolves.toMatchObject({ status: "drained" });
  });

  it("sends exactly one real loopback TCP request with method, path, query, body, and headers", async () => {
    const server = await startServer((_request, response) => {
      json(response, 200, {
        evidenceHash: "c".repeat(64),
        evidenceRef: "evidence-ref:fake-fetch-result",
        status: "completed",
        verified: true,
      });
    });
    const transport = createProviderHttpFetchTransport({
      materialResolver: resolverFor(`${server.origin}/verify/task?mode=fake`),
    });
    const result = await transport(plan(), context());

    expect(result).toMatchObject({ statusCode: 200, timedOut: false });
    expect(server.requests).toHaveLength(1);
    expect(server.requests[0]).toMatchObject({
      body: "{\"requestRef\":\"fake-fetch-request\"}",
      method: "POST",
      url: "/verify/task?mode=fake",
    });
    expect(server.requests[0].headers).toMatchObject({
      authorization: `Bearer ${FAKE_CREDENTIAL}`,
      "content-type": "application/json",
      "x-provider": "fake-fetch-provider",
      "x-trace-id": "trace-fetch",
    });
    expect(result).toMatchObject({
      body: {
        evidenceHash: "c".repeat(64),
        status: "completed",
        verified: true,
      },
      statusCode: 200,
      timedOut: false,
    });
    expect(result).not.toHaveProperty("headers");
    expect(result).not.toHaveProperty("url");
    await expect(transport.close()).resolves.toMatchObject({ status: "drained" });
  });

  it.each([
    ["negative", 200, { status: "completed", verified: false }, undefined, undefined],
    ["pending", 202, { status: "pending" }, undefined, undefined],
    ["rate-limited", 429, { status: "pending" }, undefined, 3_000],
    ["unavailable", 503, { status: "unavailable" }, undefined, undefined],
    ["empty", 200, undefined, "empty_body", undefined],
    ["wrong-content-type", 200, "plain", "unsupported_content_type", undefined],
    ["malformed", 200, "{not-json", "malformed_json", undefined],
  ])("maps the %s response to bounded internal representation", async (
    scenario,
    statusCode,
    responseBody,
    diagnosticCode,
    retryAfterMs,
  ) => {
    const server = await startServer((_request, response) => {
      response.statusCode = statusCode;
      if (scenario === "rate-limited") {
        response.setHeader("retry-after", "3");
      }
      if (scenario === "wrong-content-type") {
        response.setHeader("content-type", "text/plain");
        response.end(responseBody as string);
        return;
      }
      response.setHeader("content-type", "application/json");
      if (scenario === "empty") {
        response.end();
      } else if (scenario === "malformed") {
        response.end(responseBody as string);
      } else {
        response.end(JSON.stringify(responseBody));
      }
    });
    const getBinding = binding({ bodyEnvKey: undefined });
    const transport = createProviderHttpFetchTransport({
      materialResolver: resolverFor(`${server.origin}/${scenario}`, { binding: getBinding }),
    });
    const result = await transport(plan({ bodyRef: undefined, method: "GET" }), context());

    expect(server.requests).toHaveLength(1);
    expect(result.statusCode).toBe(statusCode);
    expect(result.timedOut).toBe(false);
    if (diagnosticCode) {
      expect(result).toMatchObject({ diagnostic: { code: diagnosticCode, traceId: "trace-fetch" } });
      expect(result).not.toHaveProperty("body");
    } else {
      expect(result.body).toEqual(responseBody);
    }
    if (retryAfterMs) {
      expect(result.retryAfterMs).toBe(retryAfterMs);
    }
  });

  it("allows the exact 256KiB JSON boundary and rejects content-length boundary plus one", async () => {
    const emptyJsonBytes = Buffer.byteLength(JSON.stringify({ value: "" }), "utf8");
    const atBoundary = JSON.stringify({ value: "x".repeat(MAX_RESPONSE_BYTES - emptyJsonBytes) });
    const overBoundary = `${atBoundary} `;
    const server = await startServer((request, response) => {
      response.statusCode = 200;
      response.setHeader("content-type", "application/json");
      const body = request.url === "/at-boundary" ? atBoundary : overBoundary;
      response.setHeader("content-length", Buffer.byteLength(body));
      response.end(body);
    });
    const getBinding = binding({ bodyEnvKey: undefined, credentialEnvKey: undefined, headerEnvKey: undefined });
    const atBoundaryTransport = createProviderHttpFetchTransport({
      materialResolver: resolverFor(`${server.origin}/at-boundary`, { binding: getBinding }),
    });
    const overBoundaryTransport = createProviderHttpFetchTransport({
      materialResolver: resolverFor(`${server.origin}/over-boundary`, { binding: getBinding }),
    });

    const accepted = await atBoundaryTransport(plan({ bodyRef: undefined, method: "GET" }), context());
    const rejected = await overBoundaryTransport(plan({ bodyRef: undefined, method: "GET" }), context());

    expect(JSON.stringify(accepted.body)).toHaveLength(MAX_RESPONSE_BYTES);
    expect(rejected).toMatchObject({ diagnostic: { code: "response_too_large" } });
    expect(rejected).not.toHaveProperty("body");
  });

  it("fails closed without RangeError for deeply nested bounded JSON", async () => {
    const depth = 12_000;
    const responseBody = `${"{\"value\":".repeat(depth)}null${"}".repeat(depth)}`;
    expect(Buffer.byteLength(responseBody, "utf8")).toBeLessThan(MAX_RESPONSE_BYTES);
    const server = await startServer((_request, response) => {
      response.statusCode = 200;
      response.setHeader("content-type", "application/json");
      response.end(responseBody);
    });
    const getBinding = binding({
      bodyEnvKey: undefined,
      credentialEnvKey: undefined,
      headerEnvKey: undefined,
    });
    const transport = createProviderHttpFetchTransport({
      materialResolver: resolverFor(`${server.origin}/deep-json`, { binding: getBinding }),
    });
    const request = plan({ bodyRef: undefined, method: "GET" });
    const transportResult = await transport(request, context());

    expect(transportResult).toMatchObject({ statusCode: 200, timedOut: false });
    expect(() => normalizeProviderHttpResponse(request, transportResult)).not.toThrow();
    expect(normalizeProviderHttpResponse(request, transportResult)).toMatchObject({
      diagnosticCodes: ["http_response_structure_exceeded"],
      outcome: "manual_review",
      positiveMatch: false,
    });
  });

  it("cancels chunked overflow before complete body materialization", async () => {
    let responseClosed = false;
    let chunksWritten = 0;
    const server = await startServer((_request, response) => {
      response.statusCode = 200;
      response.setHeader("content-type", "application/json");
      response.write("{\"value\":\"");
      const interval = setInterval(() => {
        chunksWritten += 1;
        response.write("x".repeat(300));
        if (chunksWritten === 20) {
          clearInterval(interval);
          response.end("\"}");
        }
      }, 5);
      response.once("close", () => {
        clearInterval(interval);
        responseClosed = true;
      });
    });
    const getBinding = binding({ bodyEnvKey: undefined, credentialEnvKey: undefined, headerEnvKey: undefined });
    const transport = createProviderHttpFetchTransport({
      materialResolver: resolverFor(`${server.origin}/chunked`, { binding: getBinding }),
    });
    const result = await transport(
      plan({ bodyRef: undefined, maxResponseBytes: 1_024, method: "GET" }),
      context(),
    );

    expect(result).toMatchObject({ diagnostic: { code: "response_too_large" } });
    await vi.waitFor(() => expect(responseClosed).toBe(true));
    expect(chunksWritten).toBeLessThan(20);
  });

  it("uses a 2500ms default and clamps configured timeout to 100..10000ms", () => {
    expect(normalizeProviderHttpTimeoutMs(undefined)).toBe(2_500);
    expect(normalizeProviderHttpTimeoutMs(1)).toBe(100);
    expect(normalizeProviderHttpTimeoutMs(100)).toBe(100);
    expect(normalizeProviderHttpTimeoutMs(2_500)).toBe(2_500);
    expect(normalizeProviderHttpTimeoutMs(10_000)).toBe(10_000);
    expect(normalizeProviderHttpTimeoutMs(50_000)).toBe(10_000);
  });

  it("times out through AbortController and removes caller/runtime listeners", async () => {
    vi.useFakeTimers();
    const caller = new AbortController();
    const runtime = new AbortController();
    const callerAdd = vi.spyOn(caller.signal, "addEventListener");
    const callerRemove = vi.spyOn(caller.signal, "removeEventListener");
    const runtimeAdd = vi.spyOn(runtime.signal, "addEventListener");
    const runtimeRemove = vi.spyOn(runtime.signal, "removeEventListener");
    const fetchImpl = vi.fn((_url: string | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("fake abort detail")), { once: true });
      }));
    const getBinding = binding({ bodyEnvKey: undefined, credentialEnvKey: undefined, headerEnvKey: undefined });
    const transport = createProviderHttpFetchTransport({
      fetch: fetchImpl as typeof fetch,
      materialResolver: resolverFor("http://127.0.0.1:4179/timeout", { binding: getBinding }),
    });
    const execution = transport(
      plan({ bodyRef: undefined, method: "GET", timeoutMs: 100 }),
      context({ runtimeSignal: runtime.signal, signal: caller.signal }),
    );

    await vi.advanceTimersByTimeAsync(100);
    await expect(execution).resolves.toMatchObject({
      aborted: true,
      diagnostic: { code: "timeout", traceId: "trace-fetch" },
      timedOut: true,
    });
    expect(callerAdd).toHaveBeenCalledTimes(1);
    expect(runtimeAdd).toHaveBeenCalledTimes(1);
    expect(callerRemove).toHaveBeenCalledTimes(1);
    expect(runtimeRemove).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("times out one real loopback request and closes the response stream", async () => {
    let responseClosed = false;
    const server = await startServer((_request, response) => {
      response.statusCode = 200;
      response.setHeader("content-type", "application/json");
      response.write("{\"status\":\"pending");
      response.once("close", () => {
        responseClosed = true;
      });
    });
    const getBinding = binding({
      bodyEnvKey: undefined,
      credentialEnvKey: undefined,
      headerEnvKey: undefined,
    });
    const transport = createProviderHttpFetchTransport({
      materialResolver: resolverFor(`${server.origin}/real-timeout`, { binding: getBinding }),
    });
    const result = await transport(
      plan({ bodyRef: undefined, method: "GET", timeoutMs: 100 }),
      context(),
    );

    expect(server.requests).toHaveLength(1);
    expect(result).toMatchObject({
      aborted: true,
      diagnostic: { code: "timeout", traceId: "trace-fetch" },
      timedOut: true,
    });
    await vi.waitFor(() => expect(responseClosed).toBe(true));
    await expect(transport.close()).resolves.toMatchObject({
      activeCallCount: 0,
      status: "drained",
    });
    expect(transport.state().activeCallCount).toBe(0);
  });

  it.each([
    ["caller", "caller_aborted"],
    ["runtime", "runtime_aborted"],
  ] as const)("aborts an active real loopback request from the %s signal", async (source, code) => {
    let responseClosed = false;
    const server = await startServer((_request, response) => {
      response.statusCode = 200;
      response.setHeader("content-type", "application/json");
      response.write("{\"status\":\"pending");
      response.once("close", () => {
        responseClosed = true;
      });
    });
    const caller = new AbortController();
    const runtime = new AbortController();
    const getBinding = binding({
      bodyEnvKey: undefined,
      credentialEnvKey: undefined,
      headerEnvKey: undefined,
    });
    const transport = createProviderHttpFetchTransport({
      materialResolver: resolverFor(`${server.origin}/${source}-abort`, { binding: getBinding }),
    });
    const execution = transport(
      plan({ bodyRef: undefined, method: "GET" }),
      context({ runtimeSignal: runtime.signal, signal: caller.signal }),
    );
    await vi.waitFor(() => expect(server.requests).toHaveLength(1));
    (source === "caller" ? caller : runtime).abort("fake raw active abort reason");
    const result = await execution;

    expect(result).toMatchObject({
      aborted: true,
      diagnostic: { code, traceId: "trace-fetch" },
      timedOut: false,
    });
    expect(JSON.stringify(result)).not.toContain("fake raw active abort reason");
    await vi.waitFor(() => expect(responseClosed).toBe(true));
    await expect(transport.close()).resolves.toMatchObject({ status: "drained" });
  });

  it.each([
    ["caller", "caller_aborted"],
    ["runtime", "runtime_aborted"],
  ])("distinguishes already-aborted %s signals without materializing or fetching", async (source, code) => {
    const caller = new AbortController();
    const runtime = new AbortController();
    (source === "caller" ? caller : runtime).abort("fake raw abort reason");
    let resolverCalls = 0;
    const fetchImpl = vi.fn();
    const transport = createProviderHttpFetchTransport({
      fetch: fetchImpl as typeof fetch,
      materialResolver: async () => {
        resolverCalls += 1;
        throw new Error("must not resolve");
      },
    });
    const result = await transport(
      plan(),
      context({ runtimeSignal: runtime.signal, signal: caller.signal }),
    );

    expect(result).toMatchObject({ aborted: true, diagnostic: { code }, timedOut: false });
    expect(JSON.stringify(result)).not.toContain("fake raw abort reason");
    expect(resolverCalls).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("redacts nested fetch errors to a safe code and Trace ID", async () => {
    const getBinding = binding({ bodyEnvKey: undefined, credentialEnvKey: undefined, headerEnvKey: undefined });
    const fetchImpl = vi.fn(async () => {
      const cause = new Error("fake-token-sentinel http://127.0.0.1/private/path");
      const error = new Error("outer fake credential detail") as Error & { cause?: unknown };
      error.cause = cause;
      throw error;
    });
    const transport = createProviderHttpFetchTransport({
      fetch: fetchImpl as typeof fetch,
      materialResolver: resolverFor("http://127.0.0.1:4179/failure", { binding: getBinding }),
    });
    const result = await transport(plan({ bodyRef: undefined, method: "GET" }), context());
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({ diagnostic: { code: "fetch_failed", traceId: "trace-fetch" } });
    expect(serialized).not.toContain("fake-token-sentinel");
    expect(serialized).not.toContain("credential detail");
    expect(serialized).not.toContain("private/path");
  });

  it("fails safely before fetch when private material cannot resolve", async () => {
    let fetchCalls = 0;
    const transport = createProviderHttpFetchTransport({
      fetch: (async () => {
        fetchCalls += 1;
        throw new Error("must not fetch");
      }) as typeof fetch,
      materialResolver: resolverFor("", { credential: "" }),
    });
    const result = await transport(plan(), context());

    expect(result).toMatchObject({
      diagnostic: { code: "material_resolution_failed", traceId: "trace-fetch" },
      timedOut: false,
    });
    expect(fetchCalls).toBe(0);
    expect(JSON.stringify(result)).not.toContain(FAKE_CREDENTIAL);
  });

  it("fails closed before fake fetch for approved production HTTPS material", async () => {
    const endpoint = "https://approved-provider.invalid/private/verify?mode=fake";
    const credential = "fake-production-credential-sentinel";
    const productionBinding = binding({
      bodyEnvKey: undefined,
      headerEnvKey: undefined,
    });
    const fetchImpl = vi.fn(async () => new Response(
      JSON.stringify({ status: "completed", verified: true }),
      { headers: { "content-type": "application/json" }, status: 200 },
    ));
    const transport = createProviderHttpFetchTransport({
      fetch: fetchImpl as typeof fetch,
      materialResolver: resolverFor(endpoint, {
        approvedProductionHosts: ["approved-provider.invalid"],
        binding: productionBinding,
        credential,
        environment: "production",
      }),
    });
    const request = plan({ bodyRef: undefined, method: "GET" });

    const result = await transport(request, context());
    const normalized = normalizeProviderHttpResponse(request, result);
    const observable = JSON.stringify({ normalized, result });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      diagnostic: {
        code: "production_transport_unpinned",
        traceId: "trace-fetch",
      },
      timedOut: false,
    });
    expect(result).not.toHaveProperty("body");
    expect(result).not.toHaveProperty("statusCode");
    expect(normalized).toMatchObject({
      degradationDecision: "blocked",
      diagnosticCodes: ["http_auth_or_config_failure"],
      outcome: "blocked",
      positiveMatch: false,
      retryPosture: "blocked",
      transportExecuted: true,
    });
    expect(observable).not.toContain(endpoint);
    expect(observable).not.toContain("approved-provider.invalid");
    expect(observable).not.toContain(credential);
  });

  it("maps a synchronously throwing material resolver to a safe failure", async () => {
    let fetchCalls = 0;
    const transport = createProviderHttpFetchTransport({
      fetch: (async () => {
        fetchCalls += 1;
        throw new Error("must not fetch");
      }) as typeof fetch,
      materialResolver: (() => {
        throw new Error("fake-secret-synchronous-resolver-detail");
      }) as ProviderHttpExecutionMaterialResolver,
    });
    const result = await transport(plan(), context());

    expect(result).toMatchObject({
      diagnostic: { code: "material_resolution_failed", traceId: "trace-fetch" },
      timedOut: false,
    });
    expect(fetchCalls).toBe(0);
    expect(JSON.stringify(result)).not.toContain("fake-secret-synchronous-resolver-detail");
  });

  it("tracks an aborted unresolved lookup until late cleanup and burns its canonical material", async () => {
    const providerBinding = binding({
      bodyEnvKey: undefined,
      credentialEnvKey: undefined,
      headerEnvKey: undefined,
    });
    let resolveLookup: ((value: string) => void) | undefined;
    let lookupSignal: AbortSignal | undefined;
    const lookupGate = new Promise<string>((resolve) => {
      resolveLookup = resolve;
    });
    const resolver = createProviderHttpExecutionMaterialResolver({
      binding: providerBinding,
      environment: "local",
      lookup: {
        get(_key, lookupContext) {
          lookupSignal = lookupContext?.signal;
          return lookupGate;
        },
      },
    });
    const canonical = createProviderHttpCanonicalRequestMaterial({
      bindingId: providerBinding.id,
      bindingRevision: providerBinding.revision,
      endpointId: providerBinding.endpointId,
      mapping: {
        fields: [{
          name: "x-request-id",
          required: true,
          source: "task.taskId",
          target: "header",
        }],
        method: "GET",
      },
      requestMappingId: providerBinding.requestMappingId,
      strategyId: "dapp-api-status-v1",
      values: { "task.taskId": "task-fake-fetch" },
    });
    const request = plan({
      bodyRef: undefined,
      method: "GET",
      requestMaterialRef: canonical.requestMaterialRef,
      strategyId: "dapp-api-status-v1",
      timeoutMs: 100,
    });
    const fetchImpl = vi.fn();
    const transport = createProviderHttpFetchTransport({
      drainTimeoutMs: 20,
      fetch: fetchImpl as typeof fetch,
      materialResolver: resolver,
    });

    await expect(bindProviderHttpCanonicalRequestMaterial(
      transport,
      canonical.material,
    )(request, context())).resolves.toMatchObject({
      diagnostic: { code: "timeout" },
      timedOut: true,
    });
    expect(lookupSignal?.aborted).toBe(true);
    expect(transport.state().activeCallCount).toBe(1);
    await expect(transport.close()).resolves.toMatchObject({
      activeCallCount: 1,
      status: "timed_out",
    });
    expect(fetchImpl).not.toHaveBeenCalled();

    resolveLookup?.("http://127.0.0.1:4179/late");
    await vi.waitFor(() => expect(transport.state().activeCallCount).toBe(0));
    await expect(resolver(request, canonical.material)).resolves.toMatchObject({
      diagnostic: { code: "PROVIDER_HTTP_DYNAMIC_REQUEST_REUSED" },
      ok: false,
    });
  });

  it("aborts active work on close, drains within the configured bound, and rejects later calls", async () => {
    let fetchCalls = 0;
    const getBinding = binding({ bodyEnvKey: undefined, credentialEnvKey: undefined, headerEnvKey: undefined });
    const fetchImpl = vi.fn((_url: string | URL, init?: RequestInit) => {
      fetchCalls += 1;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("closed")), { once: true });
      });
    });
    const transport = createProviderHttpFetchTransport({
      drainTimeoutMs: 200,
      fetch: fetchImpl as typeof fetch,
      materialResolver: resolverFor("http://127.0.0.1:4179/active", { binding: getBinding }),
    });
    const active = transport(plan({ bodyRef: undefined, method: "GET" }), context());
    await vi.waitFor(() => expect(fetchCalls).toBe(1));

    const close = transport.close();
    await expect(active).resolves.toMatchObject({ diagnostic: { code: "transport_closed" } });
    await expect(close).resolves.toMatchObject({ activeCallCount: 0, status: "drained" });
    await expect(transport(plan(), context())).resolves.toMatchObject({
      diagnostic: { code: "transport_closed" },
    });
    expect(fetchCalls).toBe(1);
    await expect(transport.close()).resolves.toMatchObject({ status: "drained" });
  });
});
