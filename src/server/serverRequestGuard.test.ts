import { describe, expect, it } from "vitest";
import {
  evaluateServerRequestGuard,
  type ServerRequestGuardOptions,
} from "./serverRequestGuard";
import { resolveApiServerRuntimeContract } from "./serverRuntime";

const contract = resolveApiServerRuntimeContract({
  env: {},
  maxBodyBytes: 32,
  startedAt: "2026-07-06T18:00:00.000Z",
});

const WALLET_ORIGIN = "http://127.0.0.1:5193";
const walletContract = resolveApiServerRuntimeContract({
  allowedCorsOrigins: [WALLET_ORIGIN],
  env: {},
  maxBodyBytes: 128 * 1_024,
  startedAt: "2026-07-18T00:00:00.000Z",
});
const walletGuardOptions = {
  credentialedRoutes: {
    allowedOrigins: [WALLET_ORIGIN],
  },
} satisfies ServerRequestGuardOptions;
const COOKIE = `campaign_os_session=${"a".repeat(43)}`;
const CSRF = "c".repeat(43);

const exactRequest = (
  path: string,
  body: Record<string, unknown> | undefined,
  headers: Record<string, string | readonly string[]> = {},
) => evaluateServerRequestGuard({
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  headers: {
    ...(body === undefined ? {} : { "content-type": "application/json" }),
    origin: WALLET_ORIGIN,
    "x-campaign-os-trace-id": "trace-exact-route",
    ...headers,
  },
  method: path === "/api/wallet/auth/session" ? "GET" : "POST",
  path,
}, walletContract, 10, undefined, walletGuardOptions);

const exactSessionRequest = (body: unknown) => evaluateServerRequestGuard({
  body: typeof body === "string" ? body : JSON.stringify(body),
  headers: {
    "content-type": "application/json",
    origin: WALLET_ORIGIN,
    "x-campaign-os-trace-id": "trace-exact-route",
  },
  method: "POST",
  path: "/api/wallet/auth/sessions",
}, walletContract, 10, undefined, walletGuardOptions);

const sessionBody = (adapterProof: unknown) => ({
  adapterProof,
  challengeId: "challenge-safe-1",
  message: "Campaign OS wallet authentication",
  nonce: "n".repeat(43),
  publicKey: "02".repeat(33),
  signature: "07".repeat(65),
});

const hostileSecretFragments = [
  "Bearer sample-token",
  "postgres://real-user:real-db-password@db.invalid/campaign-os",
  "private-key-sample",
  "raw-signature-sample",
  "seed phrase sample",
  "signed-url",
  "wallet mnemonic sample",
];

const expectNoHostileSecretLeak = (value: unknown) => {
  const serialized = JSON.stringify(value).toLowerCase();

  for (const fragment of hostileSecretFragments) {
    expect(serialized).not.toContain(fragment.toLowerCase());
  }
};

describe("server request guard", () => {
  it("accepts exact challenge and task verification requests with credentialed CORS", () => {
    const challenge = exactRequest("/api/wallet/auth/challenges", {
      adapterId: "portkey-eoa",
      chainId: "AELF",
      network: "testnet",
      walletAddress: "wallet-safe-1",
    });
    const verification = exactRequest("/api/tasks/task-safe-1/verify", {
      campaignId: "campaign-safe-1",
    }, {
      cookie: COOKIE,
      "x-campaign-os-csrf": CSRF,
    });

    for (const decision of [challenge, verification]) {
      expect(decision).toMatchObject({ kind: "accepted", traceId: "trace-exact-route" });
      expect(decision.headers).toMatchObject({
        "access-control-allow-credentials": "true",
        "access-control-allow-origin": WALLET_ORIGIN,
        "x-campaign-os-trace-id": "trace-exact-route",
      });
      expect(decision.headers["access-control-allow-origin"]).not.toBe("*");
    }
  });

  it("accepts the exact six-operation wallet auth request matrix", () => {
    const requests = [
      exactRequest("/api/wallet/auth/challenges", {
        adapterId: "portkey-eoa",
        caHash: "ca-safe-1",
        chainId: "AELF",
        network: "testnet",
        walletAddress: "wallet-safe-1",
      }),
      exactRequest("/api/wallet/auth/sessions", {
        adapterProof: { relationRevision: "revision-safe-1" },
        challengeId: "challenge-safe-1",
        message: "Campaign OS wallet authentication",
        nonce: "n".repeat(43),
        publicKey: "02".repeat(33),
        signature: "07".repeat(65),
      }),
      exactRequest("/api/wallet/auth/session", undefined, { cookie: COOKIE }),
      exactRequest("/api/wallet/auth/session/rotate", undefined, {
        cookie: COOKIE,
        "x-campaign-os-csrf": CSRF,
      }),
      exactRequest("/api/wallet/auth/logout", undefined, {
        cookie: COOKIE,
        "x-campaign-os-csrf": CSRF,
      }),
      exactRequest("/api/admin/wallet-sessions/session-safe-1/revoke", {
        reasonCode: "ADMIN_REVOKED",
      }, {
        cookie: COOKIE,
        "x-campaign-os-csrf": CSRF,
      }),
    ];

    for (const decision of requests) {
      expect(decision).toMatchObject({
        headers: {
          "access-control-allow-credentials": "true",
          "access-control-allow-origin": WALLET_ORIGIN,
        },
        kind: "accepted",
      });
    }
  });

  it("accepts a bounded structured adapter proof and rejects every non-object transport", () => {
    const accepted = exactSessionRequest(sessionBody({
      relation: {
        revision: "revision-safe-1",
        witnesses: ["wallet-safe-1", { active: true }],
      },
    }));
    const rejected = [
      exactSessionRequest(sessionBody(JSON.stringify({ revision: "legacy-string" }))),
      exactSessionRequest(sessionBody([])),
      exactSessionRequest(sessionBody(null)),
      exactSessionRequest({ ...sessionBody({ revision: "safe" }), unexpected: true }),
    ];

    expect(accepted).toMatchObject({ kind: "accepted", traceId: "trace-exact-route" });
    for (const decision of rejected) {
      expect(decision).toMatchObject({
        body: {
          error: { code: "INVALID_REQUEST", details: { field: "body" } },
          ok: false,
          traceId: "trace-exact-route",
        },
        kind: "rejected",
        status: 400,
      });
    }
  });

  it("rejects malformed object data as 400 and oversized adapter proofs as 413", () => {
    const suffix = `,"challengeId":"challenge-safe-1","message":"message","nonce":"${"n".repeat(43)}","signature":"${"07".repeat(65)}"}`;
    const duplicate = exactSessionRequest(
      `{"adapterProof":{"relation":{"revision":"safe","revision":"forged"}}${suffix}`,
    );
    const dangerous = ["__proto__", "constructor", "prototype"].map((key) =>
      exactSessionRequest(`{"adapterProof":{"relation":{"${key}":{"role":"Admin"}}}${suffix}`),
    );
    const tooDeep = exactSessionRequest(sessionBody(
      Array.from({ length: 10 }).reduce<unknown>((value) => ({ nested: value }), { safe: true }),
    ));
    const tooWide = exactSessionRequest(sessionBody(Object.fromEntries(
      Array.from({ length: 257 }, (_, index) => [`entry-${index}`, index]),
    )));
    const oversized = exactSessionRequest(sessionBody({ payload: "x".repeat(65_537) }));

    for (const decision of [duplicate, ...dangerous, tooDeep]) {
      expect(decision).toMatchObject({
        body: {
          error: { code: "INVALID_REQUEST", details: { field: "body" } },
          ok: false,
          traceId: "trace-exact-route",
        },
        kind: "rejected",
        status: 400,
      });
      if (decision.kind === "rejected") {
        expect(Object.keys(decision.body).sort()).toEqual(["error", "ok", "traceId"]);
      }
    }
    for (const decision of [tooWide, oversized]) {
      expect(decision).toMatchObject({
        body: { error: { details: { field: "adapterProof" } } },
        kind: "rejected",
        status: 413,
      });
    }
  });

  it.each([
    ["accountType", "EOA"],
    ["chainId", "AELF"],
    ["network", "testnet"],
    ["role", "participant"],
    ["sessionId", "session-safe-1"],
    ["walletAddress", "wallet-safe-1"],
    ["walletSource", "PORTKEY_EOA_EXTENSION"],
  ])("rejects tasks.verify legacy identity field %s before runtime", (field, value) => {
    const decision = exactRequest("/api/tasks/task-safe-1/verify", {
      campaignId: "campaign-safe-1",
      [field]: value,
    }, {
      cookie: COOKIE,
      "x-campaign-os-csrf": CSRF,
    });

    expect(decision).toMatchObject({
      body: {
        error: { code: "INVALID_REQUEST", details: { field: "body" } },
        ok: false,
        traceId: "trace-exact-route",
      },
      kind: "rejected",
      status: 400,
    });
    expect(decision.kind).toBe("rejected");
    if (decision.kind === "rejected") {
      expect(Object.keys(decision.body).sort()).toEqual(["error", "ok", "traceId"]);
    }
  });

  it("rejects route method, content type, query, body shape, and route body limit before dispatch", () => {
    const wrongMethod = evaluateServerRequestGuard({
      headers: { origin: WALLET_ORIGIN },
      method: "GET",
      path: "/api/wallet/auth/challenges",
    }, walletContract, 10, undefined, walletGuardOptions);
    const missingContentType = evaluateServerRequestGuard({
      body: JSON.stringify({ campaignId: "campaign-safe-1" }),
      headers: { cookie: COOKIE, origin: WALLET_ORIGIN, "x-campaign-os-csrf": CSRF },
      method: "POST",
      path: "/api/tasks/task-safe-1/verify",
    }, walletContract, 10, undefined, walletGuardOptions);
    const unknownQuery = exactRequest("/api/tasks/task-safe-1/verify?role=owner", {
      campaignId: "campaign-safe-1",
    }, { cookie: COOKIE, "x-campaign-os-csrf": CSRF });
    const missingCampaign = exactRequest("/api/tasks/task-safe-1/verify", {}, {
      cookie: COOKIE,
      "x-campaign-os-csrf": CSRF,
    });
    const duplicateCampaign = evaluateServerRequestGuard({
      body: '{"campaignId":"campaign-safe-1","\\u0063ampaignId":"campaign-forged"}',
      headers: {
        "content-type": "application/json",
        cookie: COOKIE,
        origin: WALLET_ORIGIN,
        "x-campaign-os-csrf": CSRF,
      },
      method: "POST",
      path: "/api/tasks/task-safe-1/verify",
    }, walletContract, 10, undefined, walletGuardOptions);
    const oversizedChallenge = evaluateServerRequestGuard({
      body: JSON.stringify({ payload: "x".repeat(2_049) }),
      bodyBytes: 2_050,
      headers: { "content-type": "application/json", origin: WALLET_ORIGIN },
      method: "POST",
      path: "/api/wallet/auth/challenges",
    }, walletContract, 10, undefined, walletGuardOptions);

    expect(wrongMethod).toMatchObject({ kind: "rejected", status: 405 });
    for (const decision of [
      missingContentType,
      unknownQuery,
      missingCampaign,
      duplicateCampaign,
    ]) {
      expect(decision).toMatchObject({ kind: "rejected", status: 400 });
    }
    expect(oversizedChallenge).toMatchObject({ kind: "rejected", status: 413 });
    expect(duplicateCampaign).toMatchObject({
      body: { error: { code: "INVALID_REQUEST", details: { field: "body" } } },
    });
  });

  it("requires bounded exact Origin, cookie, CSRF, and non-authority headers", () => {
    const unknownOrigin = evaluateServerRequestGuard({
      headers: { origin: "https://evil.invalid" },
      method: "POST",
      path: "/api/wallet/auth/logout",
    }, walletContract, 10, undefined, walletGuardOptions);
    const missingCookie = exactRequest("/api/wallet/auth/logout", undefined, {
      "x-campaign-os-csrf": CSRF,
    });
    const missingCsrf = exactRequest("/api/wallet/auth/logout", undefined, { cookie: COOKIE });
    const oversizedCookie = exactRequest("/api/wallet/auth/logout", undefined, {
      cookie: `campaign_os_session=${"a".repeat(4_097)}`,
      "x-campaign-os-csrf": CSRF,
    });
    const duplicateOrigin = evaluateServerRequestGuard({
      body: JSON.stringify({
        adapterId: "portkey-eoa",
        chainId: "AELF",
        network: "testnet",
        walletAddress: "wallet-safe-1",
      }),
      headers: {
        "content-type": "application/json",
        Origin: WALLET_ORIGIN,
        origin: WALLET_ORIGIN,
      },
      method: "POST",
      path: "/api/wallet/auth/challenges",
    }, walletContract, 10, undefined, walletGuardOptions);
    const forgedAuthority = exactRequest("/api/tasks/task-safe-1/verify", {
      campaignId: "campaign-safe-1",
    }, {
      cookie: COOKIE,
      "x-campaign-os-csrf": CSRF,
      "x-wallet-role": "Admin",
    });

    expect(unknownOrigin).toMatchObject({ kind: "rejected", status: 403 });
    expect(unknownOrigin.headers["access-control-allow-origin"]).toBeUndefined();
    expect(missingCookie).toMatchObject({ kind: "rejected", status: 401 });
    expect(missingCsrf).toMatchObject({ kind: "rejected", status: 403 });
    for (const decision of [oversizedCookie, duplicateOrigin, forgedAuthority]) {
      expect(decision).toMatchObject({ kind: "rejected", status: 400 });
    }
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
  ])("rejects live authority alias %s before exact-route dispatch", (name) => {
    const decision = exactRequest("/api/wallet/auth/challenges", {
      adapterId: "portkey-eoa",
      chainId: "AELF",
      network: "testnet",
      walletAddress: "wallet-safe-1",
    }, { [name]: "forged-authority" });

    expect(decision).toMatchObject({
      body: { error: { details: { field: "headers" } } },
      kind: "rejected",
      status: 400,
    });
  });

  it("rejects canonicalization-ambiguous protected targets before generic guard fallback", () => {
    for (const path of [
      "/api/wallet/auth/x/../challenges",
      "/api/wallet/auth/x/%2e%2e/challenges",
      "/api/wallet/auth/x/%2E./challenges",
      "/api/tasks/ignored/../task-safe-1/verify",
      "/api/tasks/ignored/%2e%2e/task-safe-1/verify",
      "/api/tasks/ignored\\..\\task-safe-1/verify",
      "/api/tasks/ignored%5c..%5ctask-safe-1/verify",
      "/api/tasks/task-safe-1/verify#fragment",
    ]) {
      const decision = exactRequest(path, { campaignId: "campaign-safe-1" }, {
        cookie: COOKIE,
        "x-campaign-os-csrf": CSRF,
      });

      expect(decision, path).toMatchObject({ kind: "rejected", status: 400 });
    }
  });

  it.each(["\u0000", "\u001f", "\u007f", "\u0085"])(
    "rejects campaignId containing control character U+%s before auth dispatch",
    (control) => {
      const decision = exactRequest("/api/tasks/task-safe-1/verify", {
        campaignId: `campaign${control}forged`,
      }, {
        cookie: COOKIE,
        "x-campaign-os-csrf": CSRF,
      });

      expect(decision).toMatchObject({
        body: { error: { code: "INVALID_REQUEST", details: { field: "body" } } },
        kind: "rejected",
        status: 400,
      });
    },
  );

  it("returns the exact credentialed preflight minimum and rejects unknown headers", () => {
    const accepted = evaluateServerRequestGuard({
      headers: {
        "access-control-request-headers": "content-type, x-campaign-os-csrf",
        "access-control-request-method": "POST",
        origin: WALLET_ORIGIN,
      },
      method: "OPTIONS",
      path: "/api/tasks/task-safe-1/verify",
    }, walletContract, 10, undefined, walletGuardOptions);
    const unknownHeader = evaluateServerRequestGuard({
      headers: {
        "access-control-request-headers": "content-type, x-wallet-role",
        "access-control-request-method": "POST",
        origin: WALLET_ORIGIN,
      },
      method: "OPTIONS",
      path: "/api/tasks/task-safe-1/verify",
    }, walletContract, 10, undefined, walletGuardOptions);

    expect(accepted).toMatchObject({ kind: "preflight", status: 204 });
    expect(accepted.headers).toMatchObject({
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "content-type, x-campaign-os-csrf, x-campaign-os-trace-id",
      "access-control-allow-methods": "POST",
      "access-control-allow-origin": WALLET_ORIGIN,
    });
    expect(unknownHeader).toMatchObject({ kind: "preflight", status: 400 });
  });

  it("never turns wildcard CORS into credentialed authority and keeps public reads available", () => {
    const wildcardContract = resolveApiServerRuntimeContract({
      allowedCorsOrigins: ["*"],
      env: {},
      startedAt: "2026-07-18T00:00:00.000Z",
    });
    const protectedDecision = evaluateServerRequestGuard({
      body: JSON.stringify({
        adapterId: "portkey-eoa",
        chainId: "AELF",
        network: "testnet",
        walletAddress: "wallet-safe-1",
      }),
      headers: { "content-type": "application/json", origin: WALLET_ORIGIN },
      method: "POST",
      path: "/api/wallet/auth/challenges",
    }, wildcardContract);
    const publicDecision = evaluateServerRequestGuard({
      headers: { origin: WALLET_ORIGIN },
      method: "GET",
      path: "/api/campaigns",
    }, walletContract, 10, undefined, {
      credentialedRoutes: { allowedOrigins: [] },
    });

    expect(protectedDecision).toMatchObject({ kind: "rejected", status: 403 });
    expect(protectedDecision.headers["access-control-allow-origin"]).not.toBe("*");
    expect(protectedDecision.headers["access-control-allow-credentials"]).toBeUndefined();
    expect(publicDecision).toMatchObject({ kind: "accepted" });
    expect(publicDecision.headers["access-control-allow-origin"]).toBe(WALLET_ORIGIN);
    expect(publicDecision.headers["access-control-allow-credentials"]).toBeUndefined();
  });

  it("accepts valid GET requests with caller trace and CORS headers", () => {
    const decision = evaluateServerRequestGuard({
      headers: {
        origin: "http://localhost:5173",
        "x-campaign-os-trace-id": "trace-accepted-get",
      },
      method: "GET",
      path: "/api/health",
    }, contract, 10);

    expect(decision).toMatchObject({
      kind: "accepted",
      traceId: "trace-accepted-get",
    });
    expect(decision.headers["content-type"]).toContain("application/json");
    expect(decision.headers["x-campaign-os-trace-id"]).toBe("trace-accepted-get");
    expect(decision.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(decision.headers["access-control-expose-headers"]).toBe(
      "content-disposition, x-campaign-os-content-sha256, x-campaign-os-trace-id",
    );
  });

  it("generates trace IDs when missing", () => {
    const decision = evaluateServerRequestGuard({
      method: "GET",
      path: "/api/health",
    }, contract);

    expect(decision.kind).toBe("accepted");
    expect(decision.traceId).toMatch(/^campaign-os-server-trace-/);
    expect(decision.headers["x-campaign-os-trace-id"]).toBe(decision.traceId);
  });

  it("rejects non-JSON POST before business runtime", () => {
    const decision = evaluateServerRequestGuard({
      body: "plain",
      headers: {
        "content-type": "text/plain",
        "x-campaign-os-trace-id": "trace-non-json",
      },
      method: "POST",
      path: "/api/campaigns",
    }, contract, 10);

    expect(decision).toMatchObject({
      kind: "rejected",
      status: 400,
      traceId: "trace-non-json",
    });
    expect(decision.kind).toBe("rejected");
    if (decision.kind !== "rejected") {
      throw new Error("Expected rejected decision.");
    }
    expect(decision.body.ok).toBe(false);
    if (!decision.body.ok) {
      expect(decision.body.error.details).toMatchObject({
        field: "content-type",
      });
    }
  });

  it("rejects oversized POST bodies before business runtime", () => {
    const decision = evaluateServerRequestGuard({
      body: JSON.stringify({ payload: "x".repeat(64) }),
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-campaign-os-trace-id": "trace-oversize",
      },
      method: "POST",
      path: "/api/campaigns",
    }, contract, 10);

    expect(decision).toMatchObject({
      kind: "rejected",
      status: 413,
      traceId: "trace-oversize",
    });
    expect(decision.kind).toBe("rejected");
    if (decision.kind !== "rejected") {
      throw new Error("Expected rejected decision.");
    }
    if (!decision.body.ok) {
      expect(decision.body.error.details).toMatchObject({
        field: "body",
      });
    }
  });

  it("rejects malformed JSON before business runtime", () => {
    const decision = evaluateServerRequestGuard({
      body: "{bad",
      headers: {
        "content-type": "application/json",
        "x-campaign-os-trace-id": "trace-malformed",
      },
      method: "POST",
      path: "/api/campaigns",
    }, contract, 10);

    expect(decision).toMatchObject({
      kind: "rejected",
      status: 400,
      traceId: "trace-malformed",
    });
    expect(decision.kind).toBe("rejected");
    if (decision.kind !== "rejected") {
      throw new Error("Expected rejected decision.");
    }
    if (!decision.body.ok) {
      expect(decision.body.error.code).toBe("MALFORMED_JSON");
    }
  });

  it.each([
    {
      body: "{bad",
      expectedCode: "MALFORMED_JSON",
      expectedDiagnosticCode: undefined,
      expectedField: undefined,
      expectedStatus: 400,
      name: "malformed JSON",
    },
    {
      body: "plain",
      contentType: "text/plain",
      expectedCode: "INVALID_REQUEST",
      expectedDiagnosticCode: "INVALID_REQUEST",
      expectedField: "content-type",
      expectedStatus: 400,
      name: "unsupported content type",
    },
    {
      body: JSON.stringify({ payload: "x".repeat(64) }),
      expectedCode: "INVALID_REQUEST",
      expectedDiagnosticCode: "REQUEST_TOO_LARGE",
      expectedField: "body",
      expectedStatus: 413,
      name: "body limit",
    },
  ])("uses the strict Admin envelope for $name failures", ({
    body,
    contentType = "application/json",
    expectedCode,
    expectedDiagnosticCode,
    expectedField,
    expectedStatus,
  }) => {
    const decision = evaluateServerRequestGuard({
      body,
      headers: {
        "content-type": contentType,
        origin: "http://localhost:5173",
        "x-campaign-os-trace-id": "trace-admin-guard",
      },
      method: "POST",
      path: "/api/admin/campaigns/campaign-a/reviews/participant-a/decisions",
    }, contract, 10);

    expect(decision).toMatchObject({
      kind: "rejected",
      status: expectedStatus,
      traceId: "trace-admin-guard",
    });
    if (decision.kind !== "rejected") {
      throw new Error("Expected rejected Admin guard decision.");
    }

    expect(Object.keys(decision.body).sort()).toEqual(["error", "ok", "traceId"]);
    expect(decision.body).toEqual({
      error: {
        code: expectedCode,
        ...(expectedField
          ? { details: { diagnosticCode: expectedDiagnosticCode, field: expectedField } }
          : {}),
        message: expect.any(String),
      },
      ok: false,
      traceId: "trace-admin-guard",
    });
    expect(decision.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(decision.headers["x-campaign-os-trace-id"]).toBe("trace-admin-guard");

    const serialized = JSON.stringify(decision.body);
    expect(serialized).not.toContain("local_seeded");
    expect(serialized).not.toContain("seededDataOnly");
  });

  it("rejects unsupported methods with sanitized runtime envelopes", () => {
    const unsupportedMethod = evaluateServerRequestGuard({
      headers: {
        authorization: "Bearer raw-secret-header",
        "x-campaign-os-trace-id": "trace-unsupported-method",
      },
      method: "DELETE",
      path: "/api/health?token=raw-secret-query",
    }, contract, 10);

    expect(unsupportedMethod).toMatchObject({
      kind: "rejected",
      status: 405,
      traceId: "trace-unsupported-method",
    });
    expect(unsupportedMethod.headers["x-campaign-os-trace-id"]).toBe("trace-unsupported-method");
    expect(unsupportedMethod.headers["access-control-allow-origin"]).toBeUndefined();

    if (unsupportedMethod.kind !== "rejected") {
      throw new Error("Expected rejected guard decision.");
    }

    expect(unsupportedMethod.body).toMatchObject({
      ok: false,
      runtime: expect.objectContaining({
        name: "campaign-os-api-runtime",
        routeCount: 10,
      }),
      safety: expect.objectContaining({
        noLiveApi: true,
        noSecretHandling: true,
      }),
      traceId: "trace-unsupported-method",
      error: {
        code: "METHOD_NOT_ALLOWED",
        details: {
          allowedMethods: ["GET", "POST", "OPTIONS"],
          method: "DELETE",
          path: "/api/health",
        },
      },
    });

    const serialized = JSON.stringify(unsupportedMethod.body).toLowerCase();
    expect(serialized).not.toContain("raw-secret-header");
    expect(serialized).not.toContain("raw-secret-query");
  });

  it("keeps legacy non-Admin POST rejection headers free of CORS metadata", () => {
    const rejected = evaluateServerRequestGuard({
      body: "{\"broken\":",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:5173",
        "x-campaign-os-trace-id": "trace-legacy-malformed",
      },
      method: "POST",
      path: "/api/campaigns",
    }, contract, 10);

    expect(rejected).toMatchObject({
      kind: "rejected",
      status: 400,
      traceId: "trace-legacy-malformed",
    });
    expect(rejected.headers).toEqual({
      "content-type": "application/json; charset=utf-8",
      "x-campaign-os-trace-id": "trace-legacy-malformed",
    });
  });

  it("keeps guarded failures traceable without serializing secret-like inputs", () => {
    const rejected = evaluateServerRequestGuard({
      body: JSON.stringify({
        connectionString: "postgres://real-user:real-db-password@db.invalid/campaign-os",
        mnemonic: "wallet mnemonic sample",
        privateKey: "private-key-sample",
        signature: "raw-signature-sample",
        signedUrl: "https://storage.invalid/signed-url",
      }),
      bodyBytes: 512,
      headers: {
        authorization: "Bearer sample-token",
        "content-type": "application/json",
        "x-campaign-os-trace-id": "trace-secret-redaction",
      },
      method: "POST",
      path: "/api/campaigns?token=sample-token&seed=seed phrase sample",
    }, contract, 10);

    expect(rejected).toMatchObject({
      kind: "rejected",
      status: 413,
      traceId: "trace-secret-redaction",
    });
    expect(rejected.headers["x-campaign-os-trace-id"]).toBe("trace-secret-redaction");
    expect(rejected.kind).toBe("rejected");
    if (rejected.kind !== "rejected") {
      throw new Error("Expected rejected guard decision.");
    }
    expect(rejected.body).toMatchObject({
      ok: false,
      traceId: "trace-secret-redaction",
      error: {
        code: "INVALID_REQUEST",
        details: {
          field: "body",
        },
      },
    });
    expectNoHostileSecretLeak(rejected);
  });

  it("accepts valid JSON POST bodies and empty POST bodies", () => {
    const validPost = evaluateServerRequestGuard({
      body: JSON.stringify({ defaultLocale: "en-US" }),
      headers: { "content-type": "application/json" },
      method: "POST",
      path: "/api/campaigns",
    }, contract);
    const emptyPost = evaluateServerRequestGuard({
      body: "",
      headers: { "content-type": "application/json" },
      method: "POST",
      path: "/api/campaigns",
    }, contract);

    expect(validPost.kind).toBe("accepted");
    expect(emptyPost.kind).toBe("accepted");
  });

  it("handles accepted CORS preflight without a business body", () => {
    const decision = evaluateServerRequestGuard({
      headers: {
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type, x-campaign-os-proof-status, x-campaign-os-roles, x-campaign-os-wallet-address",
        origin: "http://localhost:5173",
        "x-campaign-os-trace-id": "trace-preflight",
      },
      method: "OPTIONS",
      path: "/api/campaigns",
    }, contract, 10);

    expect(decision).toMatchObject({
      kind: "preflight",
      status: 204,
      traceId: "trace-preflight",
    });
    expect("body" in decision).toBe(false);
    expect(decision.headers["access-control-allow-methods"]).toContain("POST");
    expect(decision.headers["access-control-allow-headers"]).toContain("x-campaign-os-proof-status");
    expect(decision.headers["access-control-allow-headers"]).toContain("x-campaign-os-roles");
    expect(decision.headers["access-control-allow-headers"]).toContain("x-campaign-os-wallet-address");
    expect(decision.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(decision.headers["access-control-expose-headers"]).toContain("content-disposition");
    expect(decision.headers["access-control-expose-headers"]).toContain("x-campaign-os-content-sha256");
    expect(decision.headers["access-control-expose-headers"]).toContain("x-campaign-os-trace-id");
    expect(decision.headers["x-campaign-os-trace-id"]).toBe("trace-preflight");
  });

  it("rejects disallowed preflight origins, methods, and headers", () => {
    const badOrigin = evaluateServerRequestGuard({
      headers: {
        "access-control-request-method": "POST",
        origin: "https://evil.invalid",
      },
      method: "OPTIONS",
      path: "/api/campaigns",
    }, contract, 10);
    const badMethod = evaluateServerRequestGuard({
      headers: {
        "access-control-request-method": "DELETE",
        origin: "http://localhost:5173",
      },
      method: "OPTIONS",
      path: "/api/campaigns",
    }, contract, 10);
    const badHeader = evaluateServerRequestGuard({
      headers: {
        "access-control-request-headers": "content-type, x-unknown-authority",
        "access-control-request-method": "POST",
        origin: "http://localhost:5173",
      },
      method: "OPTIONS",
      path: "/api/campaigns",
    }, contract, 10);

    expect(badOrigin).toMatchObject({
      kind: "preflight",
      status: 400,
    });
    expect(badMethod).toMatchObject({
      kind: "preflight",
      status: 405,
    });
    expect(badHeader).toMatchObject({
      kind: "preflight",
      status: 400,
    });
  });
});
