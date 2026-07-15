import { describe, expect, it } from "vitest";
import { evaluateServerRequestGuard } from "./serverRequestGuard";
import { resolveApiServerRuntimeContract } from "./serverRuntime";

const contract = resolveApiServerRuntimeContract({
  env: {},
  maxBodyBytes: 32,
  startedAt: "2026-07-06T18:00:00.000Z",
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
      status: 400,
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
      expectedField: undefined,
      name: "malformed JSON",
    },
    {
      body: "plain",
      contentType: "text/plain",
      expectedCode: "INVALID_REQUEST",
      expectedField: "content-type",
      name: "unsupported content type",
    },
    {
      body: JSON.stringify({ payload: "x".repeat(64) }),
      expectedCode: "INVALID_REQUEST",
      expectedField: "body",
      name: "body limit",
    },
  ])("uses the strict Admin envelope for $name failures", ({
    body,
    contentType = "application/json",
    expectedCode,
    expectedField,
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
      status: 400,
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
          ? { details: { diagnosticCode: "INVALID_REQUEST", field: expectedField } }
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
      status: 400,
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

  it("rejects disallowed preflight origins and methods", () => {
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

    expect(badOrigin).toMatchObject({
      kind: "preflight",
      status: 400,
    });
    expect(badMethod).toMatchObject({
      kind: "preflight",
      status: 405,
    });
  });
});
