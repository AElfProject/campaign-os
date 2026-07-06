import { describe, expect, it } from "vitest";
import { evaluateServerRequestGuard } from "./serverRequestGuard";
import { resolveApiServerRuntimeContract } from "./serverRuntime";

const contract = resolveApiServerRuntimeContract({
  env: {},
  maxBodyBytes: 32,
  startedAt: "2026-07-06T18:00:00.000Z",
});

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
    if (decision.body && !decision.body.ok) {
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
    if (decision.body && !decision.body.ok) {
      expect(decision.body.error.code).toBe("MALFORMED_JSON");
    }
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
    expect(decision.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
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
