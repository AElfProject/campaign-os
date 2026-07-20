import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createTaskTemplateCatalogApiBridge,
  type TaskTemplateCatalogApiFetch,
  type TaskTemplateCatalogPage,
} from "./taskTemplateCatalogApiBridge";

const traceId = "trace-catalog-browser-1";
const checksum = "a".repeat(64);

const template = (overrides: Record<string, unknown> = {}) => ({
  adoptionMode: "direct",
  catalogSchemaVersion: "task-template-catalog-v1",
  category: "wallet",
  checksum,
  content: {
    description: "Connect a supported wallet.",
    title: "Connect wallet",
  },
  evidenceRule: { source: "WALLET_SESSION" },
  locale: {
    requestedLocale: "en-US",
    resolvedLocale: "en-US",
    status: "exact",
  },
  points: { default: 40, maximum: 80, minimum: 20 },
  requiredPolicy: { default: true, overrideAllowed: true },
  riskLevel: "low",
  status: "active",
  templateCode: "wallet-connect",
  verificationType: "WALLET",
  version: 3,
  walletCompatibility: "ANY",
  ...overrides,
});

const page = (overrides: Record<string, unknown> = {}) => ({
  catalogSchemaVersion: "task-template-catalog-v1",
  items: [template()],
  page: { limit: 24, nextCursor: null },
  snapshotAt: "2026-07-20T07:00:00.000Z",
  totalActive: 1,
  ...overrides,
});

const successEnvelope = (data: unknown, responseTraceId = traceId) => ({
  data,
  ok: true,
  traceId: responseTraceId,
});

const errorEnvelope = (
  code = "TASK_TEMPLATE_CATALOG_UNAVAILABLE",
  operation = "list",
  responseTraceId = traceId,
) => ({
  error: {
    code,
    field: "catalog",
    operation,
    retryable: true,
  },
  ok: false,
  traceId: responseTraceId,
});

const durableSession = (overrides: Record<string, unknown> = {}) => ({
  absoluteExpiresAt: "2026-07-20T10:00:00.000Z",
  accountType: "EOA",
  capabilities: ["campaign:read", "campaign:write", "task:build"],
  chainId: "AELF",
  idleExpiresAt: "2026-07-20T09:00:00.000Z",
  issuedAt: "2026-07-20T08:00:00.000Z",
  network: "testnet",
  roles: ["project_owner"],
  sessionId: "session-owner-catalog-1",
  status: "active",
  walletAddress: "test-owner-wallet-address",
  walletSource: "PORTKEY_EOA_EXTENSION",
  ...overrides,
});

const hydrationEnvelope = (
  token = `csrf_${"c".repeat(43)}`,
  overrides: Record<string, unknown> = {},
) => ({
  data: {
    csrfToken: token,
    session: durableSession(),
  },
  ok: true,
  traceId,
  ...overrides,
});

const jsonResponse = (
  body: unknown,
  options: {
    contentType?: string;
    headerTraceId?: string | null;
    headers?: Record<string, string>;
    status?: number;
    traceHeader?: "x-campaign-os-trace-id" | "x-trace-id";
  } = {},
) => {
  const headers = new Headers({
    "content-type": options.contentType ?? "application/json; charset=utf-8",
    ...options.headers,
  });
  if (options.headerTraceId !== null) {
    headers.set(options.traceHeader ?? "x-trace-id", options.headerTraceId ?? traceId);
  }
  return new Response(JSON.stringify(body), {
    headers,
    status: options.status ?? 200,
  });
};

const createBridge = (
  fetchImpl: TaskTemplateCatalogApiFetch,
  options: { maxResponseBytes?: number; timeoutMs?: number } = {},
) => createTaskTemplateCatalogApiBridge({
  config: {
    baseUrl: "http://127.0.0.1:5194",
    maxResponseBytes: options.maxResponseBytes,
    timeoutMs: options.timeoutMs,
    tracePrefix: "catalog-browser",
  },
  fetchImpl,
  traceIdGenerator: () => traceId,
});

afterEach(() => {
  vi.useRealTimers();
});

describe("task template catalog API bridge", () => {
  it("lists one strict API-backed page with encoded filters and credentialed caller trace", async () => {
    const fetchImpl = vi.fn<TaskTemplateCatalogApiFetch>(async () =>
      jsonResponse(successEnvelope(page())));
    const bridge = createBridge(fetchImpl);

    const result = await bridge.list({
      categories: ["wallet", "social-growth"],
      limit: 24,
      locale: "en-US",
      status: "active",
      verificationTypes: ["WALLET", "SOCIAL"],
      walletCompatibility: ["ANY", "AA_ONLY"],
    });

    expect(result).toEqual({
      data: expect.objectContaining({
        items: [expect.objectContaining({ templateCode: "wallet-connect", version: 3 })],
        totalActive: 1,
      }),
      httpStatus: 200,
      ok: true,
      traceId,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe(
      "http://127.0.0.1:5194/api/task-templates"
      + "?category=wallet%2Csocial-growth"
      + "&verification=WALLET%2CSOCIAL"
      + "&wallet=ANY%2CAA_ONLY"
      + "&locale=en-US&status=active&limit=24",
    );
    expect(init).toMatchObject({ credentials: "include", method: "GET" });
    const headers = new Headers(init?.headers);
    expect(headers.get("accept")).toBe("application/json");
    expect(headers.get("x-campaign-os-trace-id")).toBe(traceId);
    expect(headers.has("cookie")).toBe(false);
  });

  it("reads exact detail identity and rejects a mismatched version/checksum projection", async () => {
    const responses = [
      jsonResponse(successEnvelope(template({ locale: {
        requestedLocale: null,
        resolvedLocale: "en-US",
        status: "fallback",
      } }))),
      jsonResponse(successEnvelope(template({
        checksum: "not-a-checksum",
        locale: { requestedLocale: null, resolvedLocale: "en-US", status: "fallback" },
        version: 4,
      }))),
    ];
    const fetchImpl = vi.fn<TaskTemplateCatalogApiFetch>(async () => responses.shift()!);
    const bridge = createBridge(fetchImpl);

    await expect(bridge.detail({ templateCode: "wallet-connect", version: 3 })).resolves.toMatchObject({
      data: { checksum, templateCode: "wallet-connect", version: 3 },
      ok: true,
      traceId,
    });
    await expect(bridge.detail({ templateCode: "wallet-connect", version: 3 })).resolves.toEqual({
      code: "BRIDGE_RESPONSE_IDENTITY_MISMATCH",
      field: "template",
      httpStatus: 200,
      ok: false,
      operation: "detail",
      retryable: false,
      traceId,
    });
    expect(String(fetchImpl.mock.calls[0][0])).toBe(
      "http://127.0.0.1:5194/api/task-templates/wallet-connect/versions/3",
    );
  });

  it("hydrates issued CSRF then adopts with only identity/allowlisted overrides", async () => {
    const csrfToken = `csrf_${"c".repeat(43)}`;
    const fetchImpl = vi.fn<TaskTemplateCatalogApiFetch>(async (input) => {
      const url = String(input);
      if (url.endsWith("/api/wallet/auth/session")) {
        return jsonResponse(hydrationEnvelope(csrfToken), {
          traceHeader: "x-campaign-os-trace-id",
        });
      }
      return jsonResponse(successEnvelope({
        campaignId: "campaign-1",
        replayed: false,
        taskId: "task-created-1",
        templateChecksum: checksum,
        templateCode: "wallet-connect",
        templateVersion: 3,
      }), { status: 201 });
    });
    const bridge = createBridge(fetchImpl);

    const result = await bridge.adopt({
      campaignId: "campaign-1",
      idempotencyKey: "catalog-adopt-command-1",
      overrides: { points: 60, required: false },
      template: { templateCode: "wallet-connect", version: 3 },
    });

    expect(result).toEqual({
      data: {
        campaignId: "campaign-1",
        replayed: false,
        taskId: "task-created-1",
        templateChecksum: checksum,
        templateCode: "wallet-connect",
        templateVersion: 3,
      },
      httpStatus: 201,
      ok: true,
      traceId,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(String(fetchImpl.mock.calls[0][0])).toBe(
      "http://127.0.0.1:5194/api/wallet/auth/session",
    );
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ credentials: "include", method: "GET" });
    const [, adoptInit] = fetchImpl.mock.calls[1];
    expect(String(fetchImpl.mock.calls[1][0])).toBe(
      "http://127.0.0.1:5194/api/campaigns/campaign-1/tasks/from-template",
    );
    expect(adoptInit).toMatchObject({ credentials: "include", method: "POST" });
    const headers = new Headers(adoptInit?.headers);
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("idempotency-key")).toBe("catalog-adopt-command-1");
    expect(headers.get("x-csrf-token")).toBe(csrfToken);
    expect(JSON.parse(String(adoptInit?.body))).toEqual({
      overrides: { points: 60, required: false },
      template: { templateCode: "wallet-connect", version: 3 },
    });
    expect(String(adoptInit?.body)).not.toMatch(/campaignId|checksum|evidence|role|subject/i);
  });

  it.each([
    {
      expectedCode: "BRIDGE_SESSION_INVALID",
      label: "unknown envelope field",
      value: { ...hydrationEnvelope(), unknown: true },
    },
    {
      expectedCode: "BRIDGE_SESSION_INVALID",
      label: "unknown data field",
      value: {
        ...hydrationEnvelope(),
        data: { ...hydrationEnvelope().data, unknown: true },
      },
    },
    {
      expectedCode: "BRIDGE_SESSION_INVALID",
      label: "missing session",
      value: {
        ...hydrationEnvelope(),
        data: { csrfToken: `csrf_${"m".repeat(43)}` },
      },
    },
    {
      expectedCode: "BRIDGE_SESSION_INVALID",
      label: "unknown session field",
      value: {
        ...hydrationEnvelope(),
        data: {
          ...hydrationEnvelope().data,
          session: durableSession({ credentialDigest: "private-auth-marker" }),
        },
      },
    },
    {
      expectedCode: "BRIDGE_SESSION_INVALID",
      label: "inactive session",
      value: {
        ...hydrationEnvelope(),
        data: {
          ...hydrationEnvelope().data,
          session: durableSession({ status: "revoked" }),
        },
      },
    },
    {
      expectedCode: "BRIDGE_SESSION_INVALID",
      label: "unsafe CSRF",
      value: hydrationEnvelope("csrf token with spaces"),
    },
  ])("fails closed for malformed M244 hydration: $label", async ({ expectedCode, value }) => {
    const fetchImpl = vi.fn<TaskTemplateCatalogApiFetch>(async () =>
      jsonResponse(value, { traceHeader: "x-campaign-os-trace-id" }));
    const result = await createBridge(fetchImpl).adopt({
      campaignId: "campaign-1",
      idempotencyKey: "catalog-adopt-command-1",
      template: { templateCode: "wallet-connect", version: 3 },
    });

    expect(result).toEqual({
      code: expectedCode,
      field: "session",
      httpStatus: 200,
      ok: false,
      operation: "adopt",
      retryable: false,
      traceId,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toMatch(/csrf_|private-auth-marker|credentialDigest/);
  });

  it("rejects hydration Trace mismatch without exposing CSRF", async () => {
    const csrfMarker = `csrf_${"z".repeat(43)}`;
    const fetchImpl = vi.fn<TaskTemplateCatalogApiFetch>(async () =>
      jsonResponse(hydrationEnvelope(csrfMarker), {
        headerTraceId: "trace-hydration-other",
        traceHeader: "x-campaign-os-trace-id",
      }));
    const result = await createBridge(fetchImpl).adopt({
      campaignId: "campaign-1",
      idempotencyKey: "catalog-adopt-command-1",
      template: { templateCode: "wallet-connect", version: 3 },
    });

    expect(result).toEqual({
      code: "BRIDGE_RESPONSE_TRACE_INVALID",
      field: "traceId",
      httpStatus: 200,
      ok: false,
      operation: "adopt",
      retryable: false,
      traceId,
    });
    expect(JSON.stringify(result)).not.toContain(csrfMarker);
  });

  it("accepts exact typed safe errors and requires response/header Trace ID parity", async () => {
    const fetchImpl = vi.fn<TaskTemplateCatalogApiFetch>()
      .mockResolvedValueOnce(jsonResponse(errorEnvelope(), { status: 503 }))
      .mockResolvedValueOnce(jsonResponse(errorEnvelope(
        "TASK_TEMPLATE_CATALOG_UNAVAILABLE",
        "list",
        "trace-body-other",
      ), { status: 503 }));
    const bridge = createBridge(fetchImpl);

    await expect(bridge.list({ locale: "en-US" })).resolves.toEqual({
      code: "TASK_TEMPLATE_CATALOG_UNAVAILABLE",
      field: "catalog",
      httpStatus: 503,
      ok: false,
      operation: "list",
      retryable: true,
      traceId,
    });
    await expect(bridge.list({ locale: "en-US" })).resolves.toEqual({
      code: "BRIDGE_RESPONSE_TRACE_INVALID",
      field: "traceId",
      httpStatus: 503,
      ok: false,
      operation: "list",
      retryable: false,
      traceId,
    });
  });

  it.each([
    {
      body: errorEnvelope("TASK_TEMPLATE_CATALOG_UNAVAILABLE"),
      label: "retryable catalog-unavailable marked false",
      mutate: (body: ReturnType<typeof errorEnvelope>) => ({
        ...body,
        error: { ...body.error, retryable: false },
      }),
      status: 503,
    },
    {
      body: errorEnvelope("AUTH_FORBIDDEN"),
      label: "non-retryable authorization denial marked true",
      mutate: (body: ReturnType<typeof errorEnvelope>) => ({
        ...body,
        error: { ...body.error, retryable: true },
      }),
      status: 403,
    },
  ])("rejects canonical retryability mismatch: $label", async ({ body, mutate, status }) => {
    const result = await createBridge(vi.fn(async () =>
      jsonResponse(mutate(body), { status }))).list({ locale: "en-US" });

    expect(result).toMatchObject({
      code: "BRIDGE_RESPONSE_SCHEMA_INVALID",
      field: "error",
      httpStatus: status,
      ok: false,
      operation: "list",
      retryable: false,
    });
  });

  it.each([
    {
      label: "success status carrying an error envelope",
      response: () => jsonResponse(errorEnvelope(), { status: 200 }),
    },
    {
      label: "error status carrying a success envelope",
      response: () => jsonResponse(successEnvelope(page()), { status: 503 }),
    },
    {
      label: "list status carrying a route-incompatible not-found code",
      response: () => jsonResponse(errorEnvelope("TASK_TEMPLATE_NOT_FOUND"), { status: 503 }),
    },
    {
      label: "list error carrying a detail operation",
      response: () => jsonResponse(errorEnvelope(
        "TASK_TEMPLATE_CATALOG_UNAVAILABLE",
        "detail",
      ), { status: 503 }),
    },
  ])("rejects incompatible status/envelope/error pairing: $label", async ({ response }) => {
    const result = await createBridge(vi.fn(async () => response())).list({ locale: "en-US" });

    expect(result).toEqual({
      code: "BRIDGE_RESPONSE_SCHEMA_INVALID",
      field: expect.any(String),
      httpStatus: expect.any(Number),
      ok: false,
      operation: "list",
      retryable: false,
      traceId,
    });
  });

  it.each([
    { httpStatus: 200, replayed: false },
    { httpStatus: 201, replayed: true },
  ])("rejects adopt HTTP $httpStatus/replayed=$replayed parity", async ({ httpStatus, replayed }) => {
    const fetchImpl = vi.fn<TaskTemplateCatalogApiFetch>(async (input) =>
      String(input).endsWith("/api/wallet/auth/session")
        ? jsonResponse(hydrationEnvelope(), { traceHeader: "x-campaign-os-trace-id" })
        : jsonResponse(successEnvelope({
            campaignId: "campaign-1",
            replayed,
            taskId: "task-created-1",
            templateChecksum: checksum,
            templateCode: "wallet-connect",
            templateVersion: 3,
          }), { status: httpStatus }));
    const result = await createBridge(fetchImpl).adopt({
      campaignId: "campaign-1",
      idempotencyKey: "catalog-adopt-command-1",
      template: { templateCode: "wallet-connect", version: 3 },
    });

    expect(result).toMatchObject({
      code: "BRIDGE_RESPONSE_IDENTITY_MISMATCH",
      field: "template",
      httpStatus,
      ok: false,
      operation: "adopt",
    });
  });

  it.each([
    {
      expectedCode: "BRIDGE_RESPONSE_STATUS_INVALID",
      response: () => jsonResponse(successEnvelope(page()), { status: 201 }),
    },
    {
      expectedCode: "BRIDGE_RESPONSE_CONTENT_TYPE_INVALID",
      response: () => jsonResponse(successEnvelope(page()), { contentType: "text/html" }),
    },
    {
      expectedCode: "BRIDGE_RESPONSE_SCHEMA_INVALID",
      response: () => jsonResponse({ ...successEnvelope(page()), privateMarker: "hidden" }),
    },
    {
      expectedCode: "BRIDGE_RESPONSE_SCHEMA_INVALID",
      response: () => jsonResponse(successEnvelope(page({ snapshotAt: "not-an-instant" }))),
    },
    {
      expectedCode: "BRIDGE_RESPONSE_TRACE_INVALID",
      response: () => jsonResponse(successEnvelope(page()), { headerTraceId: null }),
    },
  ])("rejects strict list protocol violation as $expectedCode", async ({ expectedCode, response }) => {
    const fetchImpl = vi.fn<TaskTemplateCatalogApiFetch>(async () => response());
    const result = await createBridge(fetchImpl).list({ locale: "en-US" });

    expect(result).toEqual({
      code: expectedCode,
      field: expect.any(String),
      httpStatus: expect.any(Number),
      ok: false,
      operation: "list",
      retryable: false,
      traceId,
    });
    expect(JSON.stringify(result)).not.toContain("hidden");
  });

  it("rejects declared and streamed oversize bodies before accepting JSON", async () => {
    const largePage = successEnvelope(page({
      items: [template({ content: { description: "x".repeat(4_000), title: "Large" } })],
    }));
    const fetchImpl = vi.fn<TaskTemplateCatalogApiFetch>()
      .mockResolvedValueOnce(jsonResponse(successEnvelope(page()), {
        headers: { "content-length": "9999" },
      }))
      .mockResolvedValueOnce(jsonResponse(largePage));
    const bridge = createBridge(fetchImpl, { maxResponseBytes: 1_024 });

    for (let request = 0; request < 2; request += 1) {
      await expect(bridge.list({ locale: "en-US" })).resolves.toEqual({
        code: "BRIDGE_RESPONSE_OVERSIZE",
        field: "response",
        httpStatus: 200,
        ok: false,
        operation: "list",
        retryable: false,
        traceId,
      });
    }
  });

  it.each(["leading-zero", "actual-byte-mismatch"])(
    "rejects invalid Content-Length: %s",
    async (variant) => {
      const body = successEnvelope(page());
      const actualBytes = new TextEncoder().encode(JSON.stringify(body)).byteLength;
      const fetchImpl = vi.fn<TaskTemplateCatalogApiFetch>(async () => jsonResponse(body, {
        headers: {
          "content-length": variant === "leading-zero" ? `0${actualBytes}` : String(actualBytes + 1),
        },
      }));

      await expect(createBridge(fetchImpl).list({ locale: "en-US" })).resolves.toEqual({
        code: "BRIDGE_RESPONSE_LENGTH_INVALID",
        field: "response",
        httpStatus: 200,
        ok: false,
        operation: "list",
        retryable: false,
        traceId,
      });
    },
  );

  it("fails closed on invalid caller input without starting transport", async () => {
    const fetchImpl = vi.fn<TaskTemplateCatalogApiFetch>();
    const bridge = createBridge(fetchImpl);

    await expect(bridge.list({
      categories: ["wallet", "wallet"],
      locale: "en-US",
    })).resolves.toMatchObject({ code: "BRIDGE_INVALID_INPUT", field: "categories", ok: false });
    await expect(bridge.adopt({
      campaignId: "campaign-1",
      idempotencyKey: "short",
      template: { templateCode: "wallet-connect", version: 3 },
    })).resolves.toMatchObject({ code: "BRIDGE_INVALID_INPUT", field: "idempotencyKey", ok: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("defensively captures hostile public method inputs without rejecting", async () => {
    const fetchImpl = vi.fn<TaskTemplateCatalogApiFetch>();
    const catalogBridge = createBridge(fetchImpl);
    const hostileProxy = new Proxy({}, {
      getPrototypeOf: () => {
        throw new Error("private-proxy-marker");
      },
    });
    const hostileDetail = Object.defineProperty({ version: 3 }, "templateCode", {
      enumerable: true,
      get: () => {
        throw new Error("private-getter-marker");
      },
    });
    const hostileAdopt = {
      campaignId: "campaign-1",
      idempotencyKey: "catalog-adopt-command-1",
      template: hostileProxy,
    };

    for (const pending of [
      catalogBridge.list(hostileProxy as never),
      catalogBridge.detail(hostileDetail as never),
      catalogBridge.adopt(hostileAdopt as never),
    ]) {
      const result = await pending;
      expect(result).toMatchObject({ code: "BRIDGE_INVALID_INPUT", ok: false });
      expect(JSON.stringify(result)).not.toMatch(/private-proxy-marker|private-getter-marker/);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("defensively captures a hostile factory options object", async () => {
    const hostileOptions = new Proxy({}, {
      ownKeys: () => {
        throw new Error("private-factory-marker");
      },
    });

    const catalogBridge = createTaskTemplateCatalogApiBridge(hostileOptions as never);
    await expect(catalogBridge.list({ locale: "en-US" })).resolves.toMatchObject({
      code: "BRIDGE_INVALID_INPUT",
      field: "factory",
      ok: false,
      operation: "list",
    });
  });

  it("contains hostile AbortSignal listener setup and cleanup failures", async () => {
    vi.useFakeTimers();
    const addFailureSignal = {
      aborted: false,
      addEventListener: vi.fn(() => {
        throw new Error("private-signal-add-marker");
      }),
      removeEventListener: vi.fn(),
    } as unknown as AbortSignal;
    const blockedFetch = vi.fn<TaskTemplateCatalogApiFetch>();

    await expect(createBridge(blockedFetch).list(
      { locale: "en-US" },
      { signal: addFailureSignal },
    )).resolves.toMatchObject({
      code: "BRIDGE_INVALID_INPUT",
      field: "context",
      ok: false,
      operation: "list",
    });
    expect(blockedFetch).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    const removeFailureSignal = {
      aborted: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(() => {
        throw new Error("private-signal-remove-marker");
      }),
    } as unknown as AbortSignal;
    const successfulFetch = vi.fn<TaskTemplateCatalogApiFetch>(async () =>
      jsonResponse(successEnvelope(page())));

    await expect(createBridge(successfulFetch).list(
      { locale: "en-US" },
      { signal: removeFailureSignal },
    )).resolves.toMatchObject({ ok: true, traceId });
    expect(removeFailureSignal.removeEventListener).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("catches an external abort that lands while its listener is being attached", async () => {
    vi.useFakeTimers();
    let aborted = false;
    const listeners = new Set<EventListenerOrEventListenerObject>();
    const intervalAbortSignal = {
      get aborted() {
        return aborted;
      },
      addEventListener: vi.fn((
        _type: string,
        listener: EventListenerOrEventListenerObject,
      ) => {
        listeners.add(listener);
        aborted = true;
      }),
      removeEventListener: vi.fn((
        _type: string,
        listener: EventListenerOrEventListenerObject,
      ) => {
        listeners.delete(listener);
      }),
    } as unknown as AbortSignal;
    const fetchImpl = vi.fn<TaskTemplateCatalogApiFetch>();

    await expect(createBridge(fetchImpl).list(
      { locale: "en-US" },
      { signal: intervalAbortSignal, traceId },
    )).resolves.toEqual({
      code: "BRIDGE_REQUEST_ABORTED",
      field: "request",
      ok: false,
      operation: "list",
      retryable: false,
      traceId,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(intervalAbortSignal.addEventListener).toHaveBeenCalledTimes(1);
    expect(intervalAbortSignal.removeEventListener).toHaveBeenCalledTimes(1);
    expect(listeners).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);

    let abortedReadCount = 0;
    const hostileRecheckSignal = {
      get aborted() {
        abortedReadCount += 1;
        if (abortedReadCount >= 3) {
          throw new Error("private-signal-aborted-marker");
        }
        return false;
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as AbortSignal;

    await expect(createBridge(fetchImpl).list(
      { locale: "en-US" },
      { signal: hostileRecheckSignal, traceId },
    )).resolves.toMatchObject({
      code: "BRIDGE_INVALID_INPUT",
      field: "context",
      ok: false,
      operation: "list",
      traceId,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(hostileRecheckSignal.removeEventListener).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("maps external abort and timeout while removing the shared listener/timer", async () => {
    vi.useFakeTimers();
    const external = new AbortController();
    const addSpy = vi.spyOn(external.signal, "addEventListener");
    const removeSpy = vi.spyOn(external.signal, "removeEventListener");
    const fetchImpl = vi.fn<TaskTemplateCatalogApiFetch>(async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      }));
    const bridge = createBridge(fetchImpl, { timeoutMs: 250 });

    const aborted = bridge.list({ locale: "en-US" }, { signal: external.signal, traceId });
    external.abort();
    await expect(aborted).resolves.toMatchObject({
      code: "BRIDGE_REQUEST_ABORTED",
      ok: false,
      operation: "list",
      traceId,
    });
    expect(addSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);

    const timedOut = bridge.list({ locale: "en-US" }, { traceId });
    await vi.advanceTimersByTimeAsync(250);
    await expect(timedOut).resolves.toMatchObject({
      code: "BRIDGE_REQUEST_TIMEOUT",
      ok: false,
      operation: "list",
      retryable: true,
      traceId,
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("applies the same deadline when the response body reader ignores abort", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const fetchImpl = vi.fn<TaskTemplateCatalogApiFetch>(async () => new Response(
      new ReadableStream<Uint8Array>({
        cancel,
        pull: () => new Promise<void>(() => undefined),
      }),
      {
        headers: {
          "content-type": "application/json",
          "x-trace-id": traceId,
        },
        status: 200,
      },
    ));
    const pending = createBridge(fetchImpl, { timeoutMs: 250 }).list({ locale: "en-US" });

    await vi.advanceTimersByTimeAsync(250);
    await expect(pending).resolves.toMatchObject({
      code: "BRIDGE_REQUEST_TIMEOUT",
      ok: false,
      operation: "list",
      retryable: true,
      traceId,
    });
    expect(vi.getTimerCount()).toBe(0);
    await Promise.resolve();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("does not import or expose the seeded task-template registry", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/api/taskTemplateCatalogApiBridge.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/taskTemplateLibrary|persistenceTemplateRegistry|\.\.\/domain\/builder/);
    expect(source).not.toMatch(/kitty-specs|evidence\/|docs\/current/);
  });

  it("returns immutable decoded catalog data", async () => {
    const fetchImpl = vi.fn<TaskTemplateCatalogApiFetch>(async () =>
      jsonResponse(successEnvelope(page())));
    const result = await createBridge(fetchImpl).list({ locale: "en-US" });

    expect(result.ok).toBe(true);
    const decoded = (result as { data: TaskTemplateCatalogPage }).data;
    expect(Object.isFrozen(decoded)).toBe(true);
    expect(Object.isFrozen(decoded.items)).toBe(true);
    expect(Object.isFrozen(decoded.items[0].content)).toBe(true);
  });
});
