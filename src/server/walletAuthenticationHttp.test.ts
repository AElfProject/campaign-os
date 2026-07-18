import { describe, expect, it, vi } from "vitest";
import {
  createWalletAuthenticationHttpController,
  type WalletAuthenticationAdminRevokeExecutor,
  type WalletAuthenticationHttpRequest,
  type WalletAuthenticationHttpRuntime,
  type WalletAuthenticationOriginPolicy,
} from "./walletAuthenticationHttp";

const ORIGIN = "http://127.0.0.1:5193";
const COOKIE = `campaign_os_session=${"a".repeat(43)}`;
const CSRF = "c".repeat(43);
const SET_COOKIE = `campaign_os_session=${"b".repeat(43)}; Path=/; HttpOnly; SameSite=Strict`;
const CLEAR_COOKIE = "campaign_os_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict";

const challengeProjection = () => ({
  adapterId: "portkey-eoa",
  audience: "campaign-os-stage",
  caHash: "ca-safe",
  chainId: "AELF" as const,
  domain: "127.0.0.1",
  expiresAt: "2026-07-18T01:05:00.000Z",
  id: "challenge-safe-1",
  message: "Campaign OS wallet authentication\nNonce: safe-nonce",
  network: "testnet" as const,
  nonce: "n".repeat(43),
  requestedWalletAddress: "wallet-safe-1",
  uri: ORIGIN,
  version: "campaign-os-wallet-auth/v1" as const,
});

const sessionProjection = () => ({
  absoluteExpiresAt: "2026-07-18T09:00:00.000Z",
  accountType: "EOA" as const,
  capabilities: ["PARTICIPATE_CAMPAIGN"],
  chainId: "AELF" as const,
  idleExpiresAt: "2026-07-18T01:30:00.000Z",
  issuedAt: "2026-07-18T01:00:00.000Z",
  network: "testnet" as const,
  roleIds: ["participant"],
  sessionId: "was_public-session-1",
  status: "active" as const,
  walletAddress: "wallet-safe-1",
  walletSource: "PORTKEY_EOA_EXTENSION" as const,
});

const sessionResponse = () => ({
  csrfToken: CSRF,
  session: sessionProjection(),
});

const sessionDelivery = (status: "authenticated" | "rotated", cookie = SET_COOKIE) => ({
  response: sessionResponse(),
  status,
  takeSetCookieHeader: vi.fn(() => cookie),
});

const runtimeHarness = () => {
  const runtime = {
    currentSession: vi.fn(),
    issueChallenge: vi.fn(),
    logout: vi.fn(),
    rotateSession: vi.fn(),
    verifyProof: vi.fn(),
  } as unknown as WalletAuthenticationHttpRuntime;
  const originPolicy = {
    requireOrigin: vi.fn((origin: string | undefined) => origin === ORIGIN),
  } as WalletAuthenticationOriginPolicy;
  const adminRevokeExecutor = {
    revoke: vi.fn(async () => ({ status: "revoked" as const })),
  } as WalletAuthenticationAdminRevokeExecutor;
  const controller = createWalletAuthenticationHttpController({
    adminRevokeExecutor,
    originPolicy,
    runtime,
    traceIdGenerator: () => "wallet-http-generated-1",
  });

  return {
    adminRevokeExecutor,
    controller,
    originPolicy,
    runtime: runtime as unknown as {
      currentSession: ReturnType<typeof vi.fn>;
      issueChallenge: ReturnType<typeof vi.fn>;
      logout: ReturnType<typeof vi.fn>;
      rotateSession: ReturnType<typeof vi.fn>;
      verifyProof: ReturnType<typeof vi.fn>;
    },
  };
};

const jsonHeaders = (extra: Record<string, string | readonly string[]> = {}) => ({
  "content-type": "application/json; charset=utf-8",
  origin: ORIGIN,
  "x-campaign-os-trace-id": "wallet-http-request-1",
  ...extra,
});

const sessionHeaders = (extra: Record<string, string | readonly string[]> = {}) => ({
  cookie: COOKIE,
  origin: ORIGIN,
  "x-campaign-os-trace-id": "wallet-http-request-1",
  ...extra,
});

const challengeRequest = (
  body: unknown = {
    adapterId: "portkey-eoa",
    chainId: "AELF",
    network: "testnet",
    walletAddress: "wallet-safe-1",
  },
): WalletAuthenticationHttpRequest => ({
  body,
  headers: jsonHeaders(),
  method: "POST",
  path: "/api/wallet/auth/challenges",
});

const issueSessionRequest = (
  body: unknown = {
    adapterProof: { relationRevision: "revision-safe-1" },
    challengeId: "challenge-safe-1",
    message: "Campaign OS wallet authentication\nNonce: safe-nonce",
    nonce: "n".repeat(43),
    publicKey: "02".repeat(33),
    signature: "07".repeat(65),
  },
): WalletAuthenticationHttpRequest => ({
  body,
  headers: jsonHeaders(),
  method: "POST",
  path: "/api/wallet/auth/sessions",
});

const expectFailure = (
  response: Awaited<ReturnType<ReturnType<typeof runtimeHarness>["controller"]["handle"]>>,
  status: number,
  code: string,
) => {
  expect(response).toBeDefined();
  expect(response).toMatchObject({
    body: {
      error: { code },
      ok: false,
    },
    status,
  });
  expect(response?.body.traceId).toMatch(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/);
  expect(JSON.stringify(response)).not.toMatch(/stack|cause|credentialDigest|csrfTokenDigest/i);
};

describe("walletAuthenticationHttp", () => {
  it("maps the exact challenge request to WP05 and returns only the safe challenge projection", async () => {
    const { controller, runtime } = runtimeHarness();
    runtime.issueChallenge.mockResolvedValue({
      challenge: challengeProjection(),
      status: "issued",
    });

    const response = await controller.handle(challengeRequest({
      adapterId: "portkey-eoa",
      caHash: "ca-safe",
      chainId: "AELF",
      network: "testnet",
      walletAddress: "wallet-safe-1",
    }));

    expect(runtime.issueChallenge).toHaveBeenCalledWith({
      adapterId: "portkey-eoa",
      caHash: "ca-safe",
      chainId: "AELF",
      network: "testnet",
      requestedWalletAddress: "wallet-safe-1",
      traceId: "wallet-http-request-1",
    });
    expect(response).toEqual({
      body: {
        data: {
          adapterId: "portkey-eoa",
          challengeId: "challenge-safe-1",
          chainId: "AELF",
          expiresAt: "2026-07-18T01:05:00.000Z",
          message: "Campaign OS wallet authentication\nNonce: safe-nonce",
          network: "testnet",
          version: "campaign-os-wallet-auth/v1",
          walletAddress: "wallet-safe-1",
        },
        ok: true,
        traceId: "wallet-http-request-1",
      },
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-campaign-os-trace-id": "wallet-http-request-1",
      },
      status: 201,
    });
    const responseData = response?.body.ok
      ? response.body.data as Record<string, unknown>
      : undefined;
    for (const forbidden of ["audience", "caHash", "domain", "nonce", "requestedWalletAddress", "uri"]) {
      expect(responseData).not.toHaveProperty(forbidden);
    }
  });

  it("decodes the exact proof transport, issues a cookie, and explicitly projects the safe session", async () => {
    const { controller, runtime } = runtimeHarness();
    const delivery = sessionDelivery("authenticated");
    runtime.verifyProof.mockResolvedValue(delivery);

    const response = await controller.handle(issueSessionRequest());

    expect(runtime.verifyProof).toHaveBeenCalledTimes(1);
    const input = runtime.verifyProof.mock.calls[0]?.[0];
    expect(input).toMatchObject({
      adapterProof: { relationRevision: "revision-safe-1" },
      challengeId: "challenge-safe-1",
      message: "Campaign OS wallet authentication\nNonce: safe-nonce",
      nonce: "n".repeat(43),
      traceId: "wallet-http-request-1",
    });
    expect(input.signature).toEqual(new Uint8Array(65).fill(7));
    expect(input.publicKey).toEqual(Uint8Array.from([2, ...new Array(32).fill(2)]));
    expect(delivery.takeSetCookieHeader).toHaveBeenCalledTimes(1);
    expect(response).toEqual({
      body: {
        data: {
          csrfToken: CSRF,
          session: {
            absoluteExpiresAt: "2026-07-18T09:00:00.000Z",
            accountType: "EOA",
            capabilities: ["PARTICIPATE_CAMPAIGN"],
            chainId: "AELF",
            idleExpiresAt: "2026-07-18T01:30:00.000Z",
            issuedAt: "2026-07-18T01:00:00.000Z",
            network: "testnet",
            roles: ["participant"],
            sessionId: "was_public-session-1",
            status: "active",
            walletAddress: "wallet-safe-1",
            walletSource: "PORTKEY_EOA_EXTENSION",
          },
        },
        ok: true,
        traceId: "wallet-http-request-1",
      },
      headers: {
        "content-type": "application/json; charset=utf-8",
        "set-cookie": SET_COOKIE,
        "x-campaign-os-trace-id": "wallet-http-request-1",
      },
      status: 201,
    });
    expect(JSON.stringify(response)).not.toMatch(/roleIds|credential|digest|proof|signature|publicKey/i);
  });

  it("delegates current, rotate, and logout with exact cookie, Origin, and CSRF inputs", async () => {
    const { controller, runtime } = runtimeHarness();
    runtime.currentSession.mockResolvedValue({ response: sessionResponse(), status: "active" });
    runtime.rotateSession.mockResolvedValue(sessionDelivery("rotated"));
    runtime.logout.mockResolvedValue({
      status: "logged_out",
      takeClearCookieHeader: vi.fn(() => CLEAR_COOKIE),
    });

    const current = await controller.handle({
      headers: sessionHeaders(),
      method: "GET",
      path: "/api/wallet/auth/session",
    });
    const rotate = await controller.handle({
      headers: sessionHeaders({ "x-campaign-os-csrf": CSRF }),
      method: "POST",
      path: "/api/wallet/auth/session/rotate",
    });
    const logout = await controller.handle({
      headers: sessionHeaders({ "x-campaign-os-csrf": CSRF }),
      method: "POST",
      path: "/api/wallet/auth/logout",
    });

    expect(runtime.currentSession).toHaveBeenCalledWith({
      cookieHeader: COOKIE,
      origin: ORIGIN,
      traceId: "wallet-http-request-1",
    });
    expect(runtime.rotateSession).toHaveBeenCalledWith({
      cookieHeader: COOKIE,
      csrfHeader: CSRF,
      origin: ORIGIN,
      traceId: "wallet-http-request-1",
    });
    expect(runtime.logout).toHaveBeenCalledWith({
      cookieHeader: COOKIE,
      csrfHeader: CSRF,
      origin: ORIGIN,
      traceId: "wallet-http-request-1",
    });
    expect(current).toMatchObject({ status: 200, body: { ok: true } });
    expect(rotate).toMatchObject({
      headers: { "set-cookie": SET_COOKIE },
      status: 200,
      body: { ok: true },
    });
    expect(logout).toEqual({
      body: {
        data: { revoked: true },
        ok: true,
        traceId: "wallet-http-request-1",
      },
      headers: {
        "content-type": "application/json; charset=utf-8",
        "set-cookie": CLEAR_COOKIE,
        "x-campaign-os-trace-id": "wallet-http-request-1",
      },
      status: 200,
    });
  });

  it("requires trusted admin authorization before revoking the exact target session", async () => {
    const { adminRevokeExecutor, controller } = runtimeHarness();

    const response = await controller.handle({
      body: { reasonCode: "COMPROMISE_RESPONSE" },
      headers: jsonHeaders({ cookie: COOKIE, "x-campaign-os-csrf": CSRF }),
      method: "POST",
      path: "/api/admin/wallet-sessions/was_target-session/revoke",
    });

    expect(adminRevokeExecutor.revoke).toHaveBeenCalledWith({
      cookieHeader: COOKIE,
      csrfHeader: CSRF,
      origin: ORIGIN,
      reasonCode: "COMPROMISE_RESPONSE",
      signal: undefined,
      targetSessionId: "was_target-session",
      traceId: "wallet-http-request-1",
    });
    expect(response).toEqual({
      body: {
        data: { revoked: true, sessionId: "was_target-session" },
        ok: true,
        traceId: "wallet-http-request-1",
      },
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-campaign-os-trace-id": "wallet-http-request-1",
      },
      status: 200,
    });
  });

  it.each([
    ["challenge unknown field", challengeRequest({ adapterId: "portkey-eoa", chainId: "AELF", network: "testnet", walletAddress: "wallet-safe-1", role: "Admin" })],
    ["challenge hidden runtime field", challengeRequest({ adapterId: "portkey-eoa", chainId: "AELF", clientFingerprintDigest: "f".repeat(64), network: "testnet", walletAddress: "wallet-safe-1" })],
    ["challenge missing field", challengeRequest({ adapterId: "portkey-eoa", chainId: "AELF", network: "testnet" })],
    ["challenge invalid network", challengeRequest({ adapterId: "portkey-eoa", chainId: "AELF", network: "stage", walletAddress: "wallet-safe-1" })],
    ["session authority claim", issueSessionRequest({ challengeId: "challenge-safe-1", message: "message", nonce: "n".repeat(43), signature: "07".repeat(65), walletAddress: "wallet-safe-1" })],
    ["session invalid signature transport", issueSessionRequest({ challengeId: "challenge-safe-1", message: "message", nonce: "n".repeat(43), signature: "not-hex" })],
    ["session legacy string adapter proof", issueSessionRequest({ adapterProof: JSON.stringify({ relationRevision: "revision-safe-1" }), challengeId: "challenge-safe-1", message: "message", nonce: "n".repeat(43), signature: "07".repeat(65) })],
    ["session array adapter proof", issueSessionRequest({ adapterProof: [], challengeId: "challenge-safe-1", message: "message", nonce: "n".repeat(43), signature: "07".repeat(65) })],
    ["session non-JSON adapter proof", issueSessionRequest({ adapterProof: { relationRevision: undefined }, challengeId: "challenge-safe-1", message: "message", nonce: "n".repeat(43), signature: "07".repeat(65) })],
  ])("rejects %s before invoking WP05", async (_label, request) => {
    const { controller, runtime } = runtimeHarness();

    const response = await controller.handle(request);

    expectFailure(response, 400, "INVALID_REQUEST");
    expect(runtime.issueChallenge).not.toHaveBeenCalled();
    expect(runtime.verifyProof).not.toHaveBeenCalled();
  });

  it("rejects hostile nested adapter proof structures before invoking WP05", async () => {
    const { controller, runtime } = runtimeHarness();
    const base = `"challengeId":"challenge-safe-1","message":"message","nonce":"${"n".repeat(43)}","signature":"${"07".repeat(65)}"`;
    const nestedDuplicate = `{"adapterProof":{"relation":{"revision":"safe","revision":"forged"}},${base}}`;
    const prototypeKey = `{"adapterProof":{"relation":{"__proto__":{"role":"Admin"}}},${base}}`;
    const tooDeep = Array.from({ length: 10 }).reduce<unknown>(
      (value) => ({ nested: value }),
      { revision: "safe" },
    );

    expectFailure(await controller.handle(issueSessionRequest(nestedDuplicate)), 400, "INVALID_REQUEST");
    expectFailure(await controller.handle(issueSessionRequest(prototypeKey)), 400, "INVALID_REQUEST");
    expectFailure(await controller.handle(issueSessionRequest({
      adapterProof: tooDeep,
      challengeId: "challenge-safe-1",
      message: "message",
      nonce: "n".repeat(43),
      signature: "07".repeat(65),
    })), 400, "INVALID_REQUEST");
    expectFailure(await controller.handle(issueSessionRequest({
      adapterProof: { payload: "x".repeat(65_537) },
      challengeId: "challenge-safe-1",
      message: "message",
      nonce: "n".repeat(43),
      signature: "07".repeat(65),
    })), 413, "REQUEST_TOO_LARGE");

    expect(runtime.verifyProof).not.toHaveBeenCalled();
  });

  it("enforces required JSON bodies, exact no-body operations, method, path, and query contracts", async () => {
    const { controller, runtime } = runtimeHarness();

    expectFailure(await controller.handle({
      headers: jsonHeaders(),
      method: "POST",
      path: "/api/wallet/auth/challenges",
    }), 400, "INVALID_REQUEST");
    expectFailure(await controller.handle(challengeRequest("{")), 400, "INVALID_REQUEST");
    expectFailure(await controller.handle(challengeRequest(
      '{"adapterId":"portkey-eoa","adapterId":"forged","chainId":"AELF","network":"testnet","walletAddress":"wallet-safe-1"}',
    )), 400, "INVALID_REQUEST");
    expectFailure(await controller.handle({
      ...challengeRequest(),
      headers: { origin: ORIGIN, "content-type": "text/plain" },
    }), 400, "INVALID_REQUEST");
    expectFailure(await controller.handle({
      body: {},
      headers: sessionHeaders({ "x-campaign-os-csrf": CSRF }),
      method: "POST",
      path: "/api/wallet/auth/session/rotate",
    }), 400, "INVALID_REQUEST");
    expectFailure(await controller.handle({
      headers: sessionHeaders(),
      method: "POST",
      path: "/api/wallet/auth/session",
    }), 405, "METHOD_NOT_ALLOWED");
    expectFailure(await controller.handle({
      headers: sessionHeaders(),
      method: "GET",
      path: "/api/wallet/auth/session?sessionId=forged",
    }), 400, "INVALID_REQUEST");
    expect(await controller.handle({
      method: "GET",
      path: "/api/not-wallet-auth",
    })).toBeUndefined();
    expect(runtime.currentSession).not.toHaveBeenCalled();
    expect(runtime.rotateSession).not.toHaveBeenCalled();
  });

  it("rejects canonicalization-ambiguous API paths before any runtime dispatch", async () => {
    const { controller, runtime } = runtimeHarness();

    for (const path of [
      "/api/wallet/auth/x/../challenges",
      "/api/wallet/auth/x/%2e%2e/challenges",
      "/api/wallet/auth/x/%2E./challenges",
      "/api/tasks/ignored/../task-safe-1/verify",
      "/api/tasks/ignored/%2e%2e/task-safe-1/verify",
      "/api/tasks/ignored\\..\\task-safe-1/verify",
      "/api/tasks/ignored%5c..%5ctask-safe-1/verify",
    ]) {
      expectFailure(await controller.handle({
        ...challengeRequest(),
        path,
      }), 400, "INVALID_REQUEST");
    }

    expect(runtime.issueChallenge).not.toHaveBeenCalled();
    expect(runtime.verifyProof).not.toHaveBeenCalled();
  });

  it("rejects duplicate, oversized, and caller-authority headers before runtime dispatch", async () => {
    const { controller, runtime } = runtimeHarness();

    expectFailure(await controller.handle({
      ...challengeRequest(),
      headers: {
        "content-type": "application/json",
        Origin: ORIGIN,
        origin: ORIGIN,
      },
    }), 400, "INVALID_REQUEST");
    expectFailure(await controller.handle({
      ...challengeRequest(),
      headers: jsonHeaders({ origin: [ORIGIN, ORIGIN] }),
    }), 400, "INVALID_REQUEST");
    expectFailure(await controller.handle({
      headers: sessionHeaders({ cookie: `campaign_os_session=${"a".repeat(4_097)}` }),
      method: "GET",
      path: "/api/wallet/auth/session",
    }), 413, "REQUEST_TOO_LARGE");
    expectFailure(await controller.handle({
      headers: sessionHeaders({
        "x-campaign-os-csrf": "c".repeat(513),
      }),
      method: "POST",
      path: "/api/wallet/auth/logout",
    }), 413, "REQUEST_TOO_LARGE");
    expectFailure(await controller.handle({
      ...challengeRequest(),
      headers: jsonHeaders({ "x-wallet-role": "Admin" }),
    }), 400, "INVALID_REQUEST");
    expectFailure(await controller.handle({
      ...challengeRequest(),
      headers: jsonHeaders({ authorization: "wallet-authority" }),
    }), 400, "INVALID_REQUEST");
    expect(runtime.issueChallenge).not.toHaveBeenCalled();
    expect(runtime.currentSession).not.toHaveBeenCalled();
    expect(runtime.logout).not.toHaveBeenCalled();
  });

  it.each([
    "x-account-type",
    "x-auth-session-id",
    "x-capabilities",
    "x-capability",
    "x-chain-id",
    "x-network",
    "x-role",
    "x-roles",
    "x-session-id",
  ])("rejects live authority alias %s before controller runtime dispatch", async (name) => {
    const { controller, runtime } = runtimeHarness();

    expectFailure(await controller.handle({
      ...challengeRequest(),
      headers: jsonHeaders({ [name]: "forged-authority" }),
    }), 400, "INVALID_REQUEST");
    expect(runtime.issueChallenge).not.toHaveBeenCalled();
  });

  it("requires cookie and CSRF transport for protected operations", async () => {
    const { controller, runtime } = runtimeHarness();

    expectFailure(await controller.handle({
      headers: { origin: ORIGIN },
      method: "GET",
      path: "/api/wallet/auth/session",
    }), 401, "AUTH_SESSION_REQUIRED");
    expectFailure(await controller.handle({
      headers: sessionHeaders(),
      method: "POST",
      path: "/api/wallet/auth/session/rotate",
    }), 403, "AUTH_CSRF_REQUIRED");
    expectFailure(await controller.handle({
      headers: { origin: ORIGIN, "x-campaign-os-csrf": CSRF },
      method: "POST",
      path: "/api/wallet/auth/logout",
    }), 401, "AUTH_SESSION_REQUIRED");
    expect(runtime.currentSession).not.toHaveBeenCalled();
    expect(runtime.rotateSession).not.toHaveBeenCalled();
    expect(runtime.logout).not.toHaveBeenCalled();
  });

  it("checks exact Origin before every WP05 call and maps policy outage safely", async () => {
    const denied = runtimeHarness();
    (denied.originPolicy.requireOrigin as ReturnType<typeof vi.fn>).mockReturnValue(false);

    expectFailure(await denied.controller.handle(challengeRequest()), 403, "AUTH_ORIGIN_FORBIDDEN");
    expect(denied.runtime.issueChallenge).not.toHaveBeenCalled();

    const unavailable = runtimeHarness();
    (unavailable.originPolicy.requireOrigin as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("private policy detail");
    });
    const response = await unavailable.controller.handle(challengeRequest());
    expectFailure(response, 503, "AUTH_DEPENDENCY_UNAVAILABLE");
    expect(JSON.stringify(response)).not.toContain("private policy detail");
  });

  it("uses only safe caller Trace IDs and falls back when caller or generator input is hostile", async () => {
    const { runtime } = runtimeHarness();
    runtime.issueChallenge.mockResolvedValue({ challenge: challengeProjection(), status: "issued" });
    const controller = createWalletAuthenticationHttpController({
      adminRevokeExecutor: {
        revoke: vi.fn(async () => ({ status: "revoked" as const })),
      },
      originPolicy: { requireOrigin: () => true },
      runtime: runtime as unknown as WalletAuthenticationHttpRuntime,
      traceIdGenerator: () => "secret-token-trace",
    });

    const response = await controller.handle({
      ...challengeRequest(),
      headers: jsonHeaders({ "x-campaign-os-trace-id": "unsafe secret token" }),
    });

    expect(response?.body.traceId).toMatch(/^wallet-auth-http-/);
    expect(JSON.stringify(response)).not.toMatch(/unsafe secret token|secret-token-trace/);
    expect(runtime.issueChallenge).toHaveBeenCalledWith(expect.objectContaining({
      traceId: response?.body.traceId,
    }));
  });

  it.each([
    ["rejected", "WALLET_AUTH_RUNTIME_INPUT_INVALID", 400, "INVALID_REQUEST"],
    ["rejected", "WALLET_AUTH_RUNTIME_PROOF_REJECTED", 401, "AUTH_PROOF_INVALID"],
    ["unauthorized", "WALLET_AUTH_RUNTIME_SESSION_UNAUTHORIZED", 401, "AUTH_SESSION_INVALID"],
    ["forbidden", "WALLET_AUTH_RUNTIME_ORIGIN_REJECTED", 403, "AUTH_ORIGIN_FORBIDDEN"],
    ["forbidden", "WALLET_AUTH_RUNTIME_CSRF_REJECTED", 403, "AUTH_CSRF_INVALID"],
    ["conflict", "WALLET_AUTH_RUNTIME_CONFLICT", 409, "AUTH_CONFLICT"],
    ["rate_limited", "WALLET_AUTH_RUNTIME_RATE_LIMITED", 429, "AUTH_RATE_LIMITED"],
    ["unavailable", "WALLET_AUTH_RUNTIME_STORE_UNAVAILABLE", 503, "AUTH_DEPENDENCY_UNAVAILABLE"],
    ["blocked", "WALLET_AUTH_RUNTIME_DISABLED", 503, "AUTH_DEPENDENCY_UNAVAILABLE"],
  ])("maps runtime %s/%s to a safe typed response", async (
    runtimeStatus,
    diagnosticCode,
    httpStatus,
    publicCode,
  ) => {
    const { controller, runtime } = runtimeHarness();
    runtime.issueChallenge.mockResolvedValue({
      diagnostic: {
        code: diagnosticCode,
        field: "challenge",
        retryable: runtimeStatus === "rate_limited" || runtimeStatus === "unavailable",
        traceId: "runtime-internal-trace",
      },
      status: runtimeStatus,
    });

    const response = await controller.handle(challengeRequest());

    expectFailure(response, httpStatus, publicCode);
    expect(response?.body).toMatchObject({
      error: {
        details: {
          diagnosticCode,
          field: "challenge",
        },
      },
      traceId: "wallet-http-request-1",
    });
  });

  it("maps unknown runtime exceptions and malformed outcomes to a closed 500 response", async () => {
    const thrown = runtimeHarness();
    thrown.runtime.issueChallenge.mockRejectedValue(new Error("private stack and credential"));
    const thrownResponse = await thrown.controller.handle(challengeRequest());
    expectFailure(thrownResponse, 500, "INTERNAL_RUNTIME_ERROR");
    expect(JSON.stringify(thrownResponse)).not.toMatch(/private stack|credential/);

    const malformed = runtimeHarness();
    malformed.runtime.issueChallenge.mockResolvedValue({
      challenge: { ...challengeProjection(), credentialDigest: "should-not-escape" },
      status: "unexpected",
    });
    const malformedResponse = await malformed.controller.handle(challengeRequest());
    expectFailure(malformedResponse, 500, "INTERNAL_RUNTIME_ERROR");
    expect(JSON.stringify(malformedResponse)).not.toContain("should-not-escape");
  });

  it.each([
    ["unauthorized", 401, "AUTH_SESSION_INVALID"],
    ["forbidden", 403, "AUTH_FORBIDDEN"],
    ["unavailable", 503, "AUTH_DEPENDENCY_UNAVAILABLE"],
  ] as const)("does not revoke when trusted admin authorization is %s", async (
    authorizationStatus,
    status,
    code,
  ) => {
    const { adminRevokeExecutor, controller } = runtimeHarness();
    (adminRevokeExecutor.revoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      diagnosticCode: "ADMIN_AUTHORIZATION_REJECTED",
      retryable: authorizationStatus === "unavailable",
      status: authorizationStatus,
    });

    const response = await controller.handle({
      body: { reasonCode: "ADMIN_REVOKED" },
      headers: jsonHeaders({ cookie: COOKIE, "x-campaign-os-csrf": CSRF }),
      method: "POST",
      path: "/api/admin/wallet-sessions/was_target-session/revoke",
    });

    expectFailure(response, status, code);
  });

  it("rejects non-enumerated revoke reasons and invalid target IDs before authorization", async () => {
    const { adminRevokeExecutor, controller } = runtimeHarness();

    expectFailure(await controller.handle({
      body: { reasonCode: "CALLER_REASON" },
      headers: jsonHeaders({ cookie: COOKIE, "x-campaign-os-csrf": CSRF }),
      method: "POST",
      path: "/api/admin/wallet-sessions/was_target-session/revoke",
    }), 400, "INVALID_REQUEST");
    expectFailure(await controller.handle({
      body: { reasonCode: "ADMIN_REVOKED" },
      headers: jsonHeaders({ cookie: COOKIE, "x-campaign-os-csrf": CSRF }),
      method: "POST",
      path: `/api/admin/wallet-sessions/${"s".repeat(161)}/revoke`,
    }), 400, "INVALID_REQUEST");
    expect(adminRevokeExecutor.revoke).not.toHaveBeenCalled();
  });

  it("forwards AbortSignal without accepting it from HTTP body or headers", async () => {
    const { controller, runtime } = runtimeHarness();
    runtime.issueChallenge.mockResolvedValue({ challenge: challengeProjection(), status: "issued" });
    const abortController = new AbortController();

    await controller.handle({ ...challengeRequest(), signal: abortController.signal });

    expect(runtime.issueChallenge).toHaveBeenCalledWith(expect.objectContaining({
      signal: abortController.signal,
    }));
  });
});
