import { afterEach, describe, expect, it, vi } from "vitest";
import {
  exactProtectedApiRouteContractById,
  exactProtectedApiRouteContracts,
} from "../server/routes";
import {
  createLiveWalletAuthenticationApiBridge,
  extractCanonicalWalletAuthenticationNonce,
  type LiveWalletAuthenticationApiFetch,
  type LiveWalletAuthenticationFailureCategory,
  type LiveWalletAuthenticationSession,
} from "./liveWalletAuthenticationApiBridge";

const baseUrl = "http://127.0.0.1:5194";
const requestTraceId = "wallet-browser-request-1";
const csrfToken = (): string => `csrf_${"c".repeat(43)}`;
const walletAddress = (): string => ["test", "wallet", "address"].join("-");
const challengeNonce = (): string => "n".repeat(43);
const canonicalChallengeMessage = (): string => [
  "aelf Campaign OS Wallet Authentication",
  "Version: campaign-os-wallet-auth/v1",
  "Domain: 127.0.0.1:5193",
  "URI: http://127.0.0.1:5193/",
  "Audience: campaign-os",
  `Wallet Address: ${walletAddress()}`,
  "Adapter: portkey-discover-eoa",
  "Chain ID: AELF",
  "Network: testnet",
  "CA Hash: -",
  `Nonce: ${challengeNonce()}`,
  "Issued At: 2026-07-18T01:00:00.000Z",
  "Expires At: 2026-07-18T01:05:00.000Z",
  "Request ID: request-test-1",
].join("\n");

const challenge = () => ({
  adapterId: "portkey-discover-eoa",
  challengeId: "challenge-test-1",
  chainId: "AELF" as const,
  expiresAt: "2026-07-18T01:05:00.000Z",
  message: canonicalChallengeMessage(),
  network: "testnet" as const,
  version: "campaign-os-wallet-auth/v1" as const,
  walletAddress: walletAddress(),
});

const session = (): LiveWalletAuthenticationSession => ({
  absoluteExpiresAt: "2026-07-18T09:00:00.000Z",
  accountType: "EOA",
  capabilities: ["PARTICIPATE_CAMPAIGN"],
  chainId: "AELF",
  idleExpiresAt: "2026-07-18T01:30:00.000Z",
  issuedAt: "2026-07-18T01:00:00.000Z",
  network: "testnet",
  roles: ["participant"],
  sessionId: "session-test-1",
  status: "active",
  walletAddress: walletAddress(),
  walletSource: "PORTKEY_EOA_EXTENSION",
});

const successEnvelope = <TData>(data: TData, traceId = requestTraceId) => ({
  data,
  ok: true,
  traceId,
});

const failureEnvelope = (
  code: string,
  traceId = requestTraceId,
  details?: Readonly<Record<string, unknown>>,
) => ({
  error: {
    code,
    ...(details ? { details } : {}),
    message: "The request could not be completed.",
  },
  ok: false,
  traceId,
});

const jsonResponse = (body: unknown, status = 200): Response => new Response(
  JSON.stringify(body),
  {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-campaign-os-trace-id": requestTraceId,
    },
    status,
  },
);

const bridgeFor = (
  fetchImpl: LiveWalletAuthenticationApiFetch,
  options: Readonly<{ mode?: "live_local_stage" | "live_production" | "preview"; timeoutMs?: number }> = {},
) => createLiveWalletAuthenticationApiBridge({
  config: {
    baseUrl,
    mode: options.mode ?? "live_local_stage",
    timeoutMs: options.timeoutMs,
  },
  fetchImpl,
  traceIdGenerator: () => requestTraceId,
});

const sessionEnvelope = (token = csrfToken()) => successEnvelope({
  csrfToken: token,
  session: session(),
});

const headerNames = (init: RequestInit | undefined): readonly string[] =>
  [...new Headers(init?.headers).keys()].sort();

const parsedBody = (init: RequestInit | undefined): Record<string, unknown> =>
  JSON.parse(String(init?.body)) as Record<string, unknown>;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("liveWalletAuthenticationApiBridge wire contract", () => {
  it("tracks the five participant routes inside the seven exact protected contracts", () => {
    expect(exactProtectedApiRouteContracts).toHaveLength(7);
    expect([
      exactProtectedApiRouteContractById["wallet.auth.challenge.create"].path,
      exactProtectedApiRouteContractById["wallet.auth.session.create"].path,
      exactProtectedApiRouteContractById["wallet.auth.session.current"].path,
      exactProtectedApiRouteContractById["wallet.auth.session.rotate"].path,
      exactProtectedApiRouteContractById["wallet.auth.session.logout"].path,
    ]).toEqual([
      "/api/wallet/auth/challenges",
      "/api/wallet/auth/sessions",
      "/api/wallet/auth/session",
      "/api/wallet/auth/session/rotate",
      "/api/wallet/auth/logout",
    ]);
  });

  it("extracts the canonical nonce without changing signed message bytes", () => {
    const exactMessage = canonicalChallengeMessage();
    const byteLength = new TextEncoder().encode(exactMessage).byteLength;

    const result = extractCanonicalWalletAuthenticationNonce(exactMessage);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nonce).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(result.nonce).toHaveLength(43);
    }
    expect(new TextEncoder().encode(exactMessage).byteLength).toBe(byteLength);
  });

  it.each([
    ["CRLF", canonicalChallengeMessage().split("\n").join("\r\n")],
    ["duplicate nonce", canonicalChallengeMessage().replace(
      `Nonce: ${challengeNonce()}`,
      `Nonce: ${challengeNonce()}\nNonce: ${challengeNonce()}`,
    )],
    ["renamed field", canonicalChallengeMessage().replace("Nonce: ", "Nonce : ")],
    ["trailing line", `${canonicalChallengeMessage()}\n`],
  ])("fails closed for %s canonical-message drift", (_label, message) => {
    expect(extractCanonicalWalletAuthenticationNonce(message)).toEqual({
      code: "BRIDGE_CHALLENGE_MESSAGE_INVALID",
      ok: false,
    });
  });

  it("rejects a caller nonce that differs from the exact canonical message before fetch", async () => {
    const fetchImpl = vi.fn<LiveWalletAuthenticationApiFetch>();
    const result = await bridgeFor(fetchImpl).issueSession({
      challengeId: challenge().challengeId,
      message: challenge().message,
      nonce: "x".repeat(43),
      signature: Uint8Array.of(1),
    });

    expect(result).toMatchObject({
      category: "invalid_request",
      code: "BRIDGE_INVALID_INPUT",
      ok: false,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends exact paths, methods, bodies, credential posture, and allowed header names", async () => {
    const captures: Array<{ init?: RequestInit; url: string }> = [];
    const fetchImpl = vi.fn<LiveWalletAuthenticationApiFetch>(async (input, init) => {
      const url = String(input);
      captures.push({ init, url });
      if (url.endsWith("/challenges")) {
        return jsonResponse(successEnvelope(challenge()), 201);
      }
      if (url.endsWith("/sessions")) {
        return jsonResponse(sessionEnvelope(), 201);
      }
      if (url.endsWith("/session/rotate")) {
        return jsonResponse(sessionEnvelope());
      }
      if (url.endsWith("/logout")) {
        return jsonResponse(successEnvelope({ revoked: true }));
      }
      return jsonResponse(sessionEnvelope());
    });
    const bridge = bridgeFor(fetchImpl);
    const context = { traceId: requestTraceId };

    await bridge.issueChallenge({
      adapterId: "portkey-discover-eoa",
      chainId: "AELF",
      network: "testnet",
      walletAddress: walletAddress(),
    }, context);
    await bridge.issueSession({
      adapterProof: { relationRevision: "test-revision" },
      challengeId: challenge().challengeId,
      message: challenge().message,
      publicKey: Uint8Array.from({ length: 33 }, (_, index) => index + 1),
      signature: Uint8Array.from({ length: 65 }, (_, index) => index + 1),
    }, context);
    await bridge.getCurrentSession(context);
    await bridge.rotateSession(context);
    await bridge.logout(context);

    expect(captures.map(({ url }) => new URL(url).pathname)).toEqual([
      "/api/wallet/auth/challenges",
      "/api/wallet/auth/sessions",
      "/api/wallet/auth/session",
      "/api/wallet/auth/session/rotate",
      "/api/wallet/auth/logout",
    ]);
    expect(captures.map(({ init }) => init?.method)).toEqual(["POST", "POST", "GET", "POST", "POST"]);
    expect(captures.every(({ init }) => init?.credentials === "include")).toBe(true);
    expect(captures.map(({ init }) => headerNames(init))).toEqual([
      ["accept", "content-type", "x-campaign-os-trace-id"],
      ["accept", "content-type", "x-campaign-os-trace-id"],
      ["accept", "x-campaign-os-trace-id"],
      ["accept", "x-campaign-os-csrf", "x-campaign-os-trace-id"],
      ["accept", "x-campaign-os-csrf", "x-campaign-os-trace-id"],
    ]);
    expect(captures.slice(2).map(({ init }) => init?.body)).toEqual([undefined, undefined, undefined]);

    const challengeBody = parsedBody(captures[0]?.init);
    expect(Object.keys(challengeBody).sort()).toEqual(["adapterId", "chainId", "network", "walletAddress"]);
    expect(challengeBody.adapterId).toBe("portkey-discover-eoa");
    expect(challengeBody.chainId).toBe("AELF");
    expect(challengeBody.network).toBe("testnet");
    expect(typeof challengeBody.walletAddress).toBe("string");

    const proofBody = parsedBody(captures[1]?.init);
    expect(Object.keys(proofBody).sort()).toEqual([
      "adapterProof",
      "challengeId",
      "message",
      "nonce",
      "publicKey",
      "signature",
    ]);
    expect(proofBody.challengeId).toBe(challenge().challengeId);
    expect(typeof proofBody.message).toBe("string");
    expect(String(proofBody.message).length).toBeGreaterThan(0);
    expect(proofBody.nonce).toBe(challengeNonce());
    expect(proofBody.signature).toMatch(/^[a-f0-9]+$/);
    expect(String(proofBody.signature)).toHaveLength(65 * 2);
    expect(proofBody.publicKey).toMatch(/^[a-f0-9]+$/);
    expect(String(proofBody.publicKey)).toHaveLength(33 * 2);
    expect(proofBody.adapterProof).toBeTypeOf("object");
    expect(Object.keys(proofBody.adapterProof as object)).toEqual(["relationRevision"]);
  });

  it("includes optional challenge CA context without adding any other request field", async () => {
    const fetchImpl = vi.fn<LiveWalletAuthenticationApiFetch>(async (_input, init) => {
      expect(Object.keys(parsedBody(init)).sort()).toEqual([
        "adapterId",
        "caHash",
        "chainId",
        "network",
        "walletAddress",
      ]);
      return jsonResponse(successEnvelope(challenge()), 201);
    });

    await bridgeFor(fetchImpl).issueChallenge({
      adapterId: "portkey-aa",
      caHash: "a".repeat(64),
      chainId: "AELF",
      network: "testnet",
      walletAddress: walletAddress(),
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("liveWalletAuthenticationApiBridge memory authority", () => {
  it("keeps CSRF in closure memory, uses only its presence in mutation headers, and clears it locally", async () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
    };
    const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    const originalSessionStorage = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: storage });
    const captures: RequestInit[] = [];
    const fetchImpl = vi.fn<LiveWalletAuthenticationApiFetch>(async (input, init) => {
      captures.push(init ?? {});
      return String(input).endsWith("/session/rotate")
        ? jsonResponse(sessionEnvelope(`csrf_${"d".repeat(43)}`))
        : jsonResponse(sessionEnvelope());
    });
    const bridge = bridgeFor(fetchImpl);

    try {
      const restored = await bridge.getCurrentSession();
      const rotated = await bridge.rotateSession();
      bridge.clearLocalSession();
      const afterClear = await bridge.rotateSession();

      expect(restored.ok).toBe(true);
      expect(rotated.ok).toBe(true);
      expect(headerNames(captures[1])).toContain("x-campaign-os-csrf");
      expect(storage.getItem).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
      expect(afterClear).toMatchObject({
        category: "unauthorized",
        code: "BRIDGE_CSRF_UNAVAILABLE",
        ok: false,
      });
      expect(fetchImpl).toHaveBeenCalledTimes(2);
      expect(JSON.stringify(restored)).not.toContain(csrfToken());
      expect(JSON.stringify(rotated)).not.toContain(`csrf_${"d".repeat(43)}`);
    } finally {
      if (originalLocalStorage) {
        Object.defineProperty(globalThis, "localStorage", originalLocalStorage);
      } else {
        Reflect.deleteProperty(globalThis, "localStorage");
      }
      if (originalSessionStorage) {
        Object.defineProperty(globalThis, "sessionStorage", originalSessionStorage);
      } else {
        Reflect.deleteProperty(globalThis, "sessionStorage");
      }
    }
  });

  it("does not let an older session response write CSRF after the local epoch changes", async () => {
    let resolveResponse: ((response: Response) => void) | undefined;
    const fetchImpl = vi.fn<LiveWalletAuthenticationApiFetch>(() => new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    }));
    const bridge = bridgeFor(fetchImpl);

    const pending = bridge.getCurrentSession();
    bridge.clearLocalSession();
    resolveResponse?.(jsonResponse(sessionEnvelope()));

    await expect(pending).resolves.toMatchObject({
      category: "stale",
      code: "BRIDGE_STALE_SESSION_EPOCH",
      ok: false,
    });
    await expect(bridge.rotateSession()).resolves.toMatchObject({
      code: "BRIDGE_CSRF_UNAVAILABLE",
      ok: false,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("liveWalletAuthenticationApiBridge exact response parsing", () => {
  it.each([
    ["unknown envelope field", { ...sessionEnvelope(), extra: true }],
    ["unknown data field", { ...sessionEnvelope(), data: { ...sessionEnvelope().data, extra: true } }],
    ["unknown session field", {
      ...sessionEnvelope(),
      data: { ...sessionEnvelope().data, session: { ...session(), extra: true } },
    }],
    ["credential field", {
      ...sessionEnvelope(),
      data: { ...sessionEnvelope().data, credential: "not-client-readable" },
    }],
    ["digest field", {
      ...sessionEnvelope(),
      data: { ...sessionEnvelope().data, session: { ...session(), credentialDigest: "f".repeat(64) } },
    }],
    ["proof field", {
      ...sessionEnvelope(),
      data: { ...sessionEnvelope().data, session: { ...session(), proofDigest: "f".repeat(64) } },
    }],
    ["signer field", {
      ...sessionEnvelope(),
      data: { ...sessionEnvelope().data, signerAddress: "not-client-readable" },
    }],
    ["CA field", {
      ...sessionEnvelope(),
      data: { ...sessionEnvelope().data, caHash: "f".repeat(64) },
    }],
  ])("rejects %s without retaining auth material", async (_label, envelope) => {
    const result = await bridgeFor(vi.fn(async () => jsonResponse(envelope))).getCurrentSession();

    expect(result).toMatchObject({
      category: "invalid_response",
      ok: false,
    });
    expect(["BRIDGE_RESPONSE_FORBIDDEN_AUTH_FIELD", "BRIDGE_RESPONSE_INVALID"]).toContain(result.code);
    expect(JSON.stringify(result)).not.toMatch(/credentialDigest|proofDigest|signerAddress|caHash/);
  });

  it("returns only the exact safe challenge projection", async () => {
    const result = await bridgeFor(vi.fn(async () =>
      jsonResponse(successEnvelope(challenge()), 201))).issueChallenge({
        adapterId: "portkey-discover-eoa",
        chainId: "AELF",
        network: "testnet",
        walletAddress: walletAddress(),
      });

    expect(result).toMatchObject({
      httpStatus: 201,
      ok: true,
      status: "challenge_issued",
      traceId: requestTraceId,
    });
    if (result.ok) {
      expect(Object.keys(result.challenge).sort()).toEqual([
        "adapterId",
        "chainId",
        "challengeId",
        "expiresAt",
        "message",
        "network",
        "version",
        "walletAddress",
      ]);
      expect(typeof result.challenge.message).toBe("string");
      expect(result.challenge.message.length).toBeGreaterThan(0);
      expect(typeof result.challenge.walletAddress).toBe("string");
      expect(result.challenge.walletAddress.length).toBeGreaterThan(0);
    }
  });
});

describe("liveWalletAuthenticationApiBridge typed failures", () => {
  it.each<[number, LiveWalletAuthenticationFailureCategory, string]>([
    [400, "invalid_request", "INVALID_REQUEST"],
    [401, "unauthorized", "AUTH_SESSION_INVALID"],
    [403, "forbidden", "AUTH_FORBIDDEN"],
    [409, "conflict", "AUTH_CONFLICT"],
    [429, "rate_limited", "AUTH_RATE_LIMITED"],
    [503, "unavailable", "AUTH_DEPENDENCY_UNAVAILABLE"],
  ])("maps HTTP %i to %s", async (httpStatus, category, code) => {
    const result = await bridgeFor(vi.fn(async () => jsonResponse(
      failureEnvelope(code, requestTraceId, {
        diagnosticCode: "WALLET_AUTH_TEST_FAILURE",
        field: "session",
        retryable: httpStatus === 429 || httpStatus === 503,
      }),
      httpStatus,
    ))).getCurrentSession();

    expect(result).toEqual({
      category,
      code,
      details: {
        diagnosticCode: "WALLET_AUTH_TEST_FAILURE",
        field: "session",
        retryable: httpStatus === 429 || httpStatus === 503,
      },
      httpStatus,
      ok: false,
      reconnectRequired: httpStatus === 401 || httpStatus === 403,
      retryable: httpStatus === 409 || httpStatus === 429 || httpStatus === 503,
      traceId: requestTraceId,
    });
  });

  it("maps the exact proof-rejection code without treating the code name as proof material", async () => {
    const result = await bridgeFor(vi.fn(async () => jsonResponse(
      failureEnvelope("AUTH_PROOF_INVALID"),
      401,
    ))).getCurrentSession();

    expect(result).toMatchObject({
      category: "unauthorized",
      code: "AUTH_PROOF_INVALID",
      httpStatus: 401,
      ok: false,
      reconnectRequired: true,
    });
  });

  it("rejects a content type that only starts with the JSON media type", async () => {
    const response = new Response(JSON.stringify(sessionEnvelope()), {
      headers: { "content-type": "application/json-malicious" },
      status: 200,
    });
    const result = await bridgeFor(vi.fn(async () => response)).getCurrentSession();

    expect(result).toMatchObject({
      category: "invalid_response",
      code: "BRIDGE_RESPONSE_INVALID",
      ok: false,
    });
  });

  it("maps network errors without exposing thrown text", async () => {
    const internalText = "provider payload and private stack must stay internal";
    const result = await bridgeFor(vi.fn(async () => {
      throw new Error(internalText);
    })).getCurrentSession();

    expect(result).toMatchObject({
      category: "network",
      code: "BRIDGE_NETWORK_ERROR",
      ok: false,
      retryable: true,
      traceId: requestTraceId,
    });
    expect(JSON.stringify(result)).not.toContain(internalText);
  });

  it("uses a safe fallback Trace ID and never exposes internal response text", async () => {
    const internalText = "stack credentialDigest proofDigest signerAddress caHash";
    const response = new Response(JSON.stringify({
      ...failureEnvelope("AUTH_DEPENDENCY_UNAVAILABLE", "secret bearer token", { retryable: true }),
      error: {
        code: "AUTH_DEPENDENCY_UNAVAILABLE",
        details: { retryable: true },
        message: internalText,
      },
    }), {
      headers: { "content-type": "application/json" },
      status: 503,
    });
    const result = await bridgeFor(vi.fn(async () => response)).getCurrentSession();

    expect(result.traceId).toBe(requestTraceId);
    expect(JSON.stringify(result)).not.toContain(internalText);
  });

  it("classifies bounded timeout and clears timeout/listener resources", async () => {
    vi.useFakeTimers();
    const external = new AbortController();
    const addListener = vi.spyOn(external.signal, "addEventListener");
    const removeListener = vi.spyOn(external.signal, "removeEventListener");
    const fetchImpl = vi.fn<LiveWalletAuthenticationApiFetch>(() => new Promise<Response>(() => undefined));
    const pending = bridgeFor(fetchImpl, { timeoutMs: 100 }).getCurrentSession({
      signal: external.signal,
    });

    await vi.advanceTimersByTimeAsync(100);

    await expect(pending).resolves.toMatchObject({
      category: "timeout",
      code: "BRIDGE_REQUEST_TIMEOUT",
      ok: false,
      retryable: true,
    });
    expect(addListener).toHaveBeenCalledWith("abort", expect.any(Function), { once: true });
    expect(removeListener).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("classifies caller abort separately and cleans the listener and timer", async () => {
    vi.useFakeTimers();
    const external = new AbortController();
    const removeListener = vi.spyOn(external.signal, "removeEventListener");
    const fetchImpl = vi.fn<LiveWalletAuthenticationApiFetch>(() => new Promise<Response>(() => undefined));
    const pending = bridgeFor(fetchImpl, { timeoutMs: 1_000 }).getCurrentSession({
      signal: external.signal,
    });

    external.abort();
    await vi.runAllTicks();

    await expect(pending).resolves.toMatchObject({
      category: "aborted",
      code: "BRIDGE_REQUEST_ABORTED",
      ok: false,
      retryable: false,
    });
    expect(removeListener).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("fails closed when an external signal throws while registering its listener", async () => {
    const fetchImpl = vi.fn<LiveWalletAuthenticationApiFetch>();
    const removeEventListener = vi.fn();
    const signal = {
      aborted: false,
      addEventListener: () => {
        throw new Error("host listener detail");
      },
      removeEventListener,
    } as unknown as AbortSignal;

    const result = await bridgeFor(fetchImpl).getCurrentSession({ signal });

    expect(result).toMatchObject({
      category: "invalid_request",
      code: "BRIDGE_INVALID_INPUT",
      ok: false,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(removeEventListener).toHaveBeenCalledWith("abort", expect.any(Function));
  });
});

describe("liveWalletAuthenticationApiBridge mode and logout posture", () => {
  it.each([
    ["null options", null],
    ["invalid config value", {
      config: { baseUrl: 42, mode: "live_local_stage" },
    }],
    ["throwing accessor", Object.defineProperty({}, "config", {
      enumerable: true,
      get: () => {
        throw new Error("host config detail");
      },
    })],
  ])("constructs a closed bridge for %s instead of throwing", async (_label, malformed) => {
    const bridge = createLiveWalletAuthenticationApiBridge(
      malformed as unknown as Parameters<typeof createLiveWalletAuthenticationApiBridge>[0],
    );

    const result = await bridge.getCurrentSession();

    expect(result).toMatchObject({
      category: "configuration",
      code: "BRIDGE_INVALID_INPUT",
      ok: false,
    });
  });

  it("fails closed for every live operation when constructed for preview", async () => {
    const fetchImpl = vi.fn<LiveWalletAuthenticationApiFetch>();
    const bridge = bridgeFor(fetchImpl, { mode: "preview" });
    const results = await Promise.all([
      bridge.issueChallenge({
        adapterId: "portkey-discover-eoa",
        chainId: "AELF",
        network: "testnet",
        walletAddress: walletAddress(),
      }),
      bridge.issueSession({
        challengeId: challenge().challengeId,
        message: challenge().message,
        nonce: "n".repeat(43),
        signature: Uint8Array.of(1),
      }),
      bridge.getCurrentSession(),
      bridge.rotateSession(),
      bridge.logout(),
    ]);

    expect(results.every((result) =>
      !result.ok
      && result.category === "preview_blocked"
      && result.code === "BRIDGE_PREVIEW_INVOCATION_BLOCKED")).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("clears local session posture when logout receives an already-invalid session response", async () => {
    const fetchImpl = vi.fn<LiveWalletAuthenticationApiFetch>(async (input) => {
      if (String(input).endsWith("/logout")) {
        return jsonResponse(failureEnvelope("AUTH_SESSION_INVALID"), 401);
      }
      return jsonResponse(sessionEnvelope());
    });
    const bridge = bridgeFor(fetchImpl);
    await bridge.getCurrentSession();

    const logout = await bridge.logout();
    const rotateAfterLogout = await bridge.rotateSession();

    expect(logout).toMatchObject({
      category: "unauthorized",
      code: "AUTH_SESSION_INVALID",
      localSessionCleared: true,
      ok: false,
    });
    expect(rotateAfterLogout).toMatchObject({
      code: "BRIDGE_CSRF_UNAVAILABLE",
      ok: false,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("reports successful idempotent logout with local cleanup and no session material", async () => {
    const fetchImpl = vi.fn<LiveWalletAuthenticationApiFetch>(async (input) =>
      String(input).endsWith("/logout")
        ? jsonResponse(successEnvelope({ revoked: false }))
        : jsonResponse(sessionEnvelope()));
    const bridge = bridgeFor(fetchImpl);
    await bridge.getCurrentSession();

    const result = await bridge.logout();

    expect(result).toEqual({
      httpStatus: 200,
      localSessionCleared: true,
      ok: true,
      revoked: false,
      status: "logged_out",
      traceId: requestTraceId,
    });
  });

  it("rejects a challenge whose exact signed message is not bound to its safe projection", async () => {
    const mismatched = {
      ...challenge(),
      message: canonicalChallengeMessage().replace(
        "Adapter: portkey-discover-eoa",
        "Adapter: nightelf",
      ),
    };
    const result = await bridgeFor(vi.fn(async () =>
      jsonResponse(successEnvelope(mismatched), 201))).issueChallenge({
        adapterId: "portkey-discover-eoa",
        chainId: "AELF",
        network: "testnet",
        walletAddress: walletAddress(),
      });

    expect(result).toMatchObject({
      category: "invalid_response",
      code: "BRIDGE_RESPONSE_INVALID",
      ok: false,
    });
  });
});
