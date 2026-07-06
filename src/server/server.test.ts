import { afterEach, describe, expect, it, vi } from "vitest";
import { startCampaignOsApiServer } from "./server";

const unsafeLogFragments = [
  "apikey",
  "bearer",
  "connectionstring",
  "database_url",
  "mnemonic",
  "password",
  "privatekey",
  "seedphrase",
  "secret",
  "signature",
  "signedurl",
  "token",
];

describe("Campaign OS API server entrypoint", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("starts and stops with backend service and server runtime metadata", async () => {
    const logs: string[] = [];
    const server = await startCampaignOsApiServer({
      logger: {
        error: (message?: unknown) => logs.push(String(message)),
        log: (message?: unknown) => logs.push(String(message)),
      },
      port: 0,
    });

    try {
      expect(server.runtimeContract).toMatchObject({
        profileId: "local-review",
        requestGuard: expect.objectContaining({
          guardedFailureEnvelope: true,
        }),
        valid: true,
      });

      const response = await fetch(`${server.url}/api/health`, {
        headers: { "x-campaign-os-trace-id": "trace-server-entrypoint" },
      });
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload).toMatchObject({
        ok: true,
        traceId: "trace-server-entrypoint",
        data: {
          backendService: expect.objectContaining({
            authSession: expect.objectContaining({
              profileId: "local-review",
              status: "local_seeded",
              valid: true,
            }),
            entrypointId: "campaign-os-backend-service",
            profileId: "local-review",
            traceId: "trace-server-entrypoint",
          }),
          serverRuntime: expect.objectContaining({
            corsPolicy: expect.objectContaining({
              enabled: true,
              preflightHandledBeforeRuntime: true,
            }),
            profileId: "local-review",
            requestGuard: expect.objectContaining({
              guardedFailureEnvelope: true,
              traceHeaderName: "x-campaign-os-trace-id",
            }),
            status: "ready",
          }),
          status: "ok",
        },
      });
      expect(logs).toHaveLength(1);
      expect(logs[0]).toContain("[campaign-os-api-runtime] listening on");
      expect(logs[0]).toContain("entrypoint=campaign-os-backend-service");
      expect(logs[0]).toContain("profile=local-review");
      expect(logs[0]).toContain("support=local_seeded");
      expect(logs[0]).toContain("no live operations");

      const normalizedLog = logs.join("\n").toLowerCase().replace(/[^a-z0-9_]/g, "");

      for (const fragment of unsafeLogFragments) {
        expect(normalizedLog).not.toContain(fragment);
      }
    } finally {
      await server.stop();
      await server.stop();
    }
  });

  it("handles CORS preflight without entering the business runtime", async () => {
    const server = await startCampaignOsApiServer({ logger: false, port: 0 });

    try {
      const response = await fetch(`${server.url}/api/campaigns`, {
        headers: {
          "access-control-request-method": "POST",
          origin: "http://localhost:5173",
          "x-campaign-os-trace-id": "trace-preflight",
        },
        method: "OPTIONS",
      });

      expect(response.status).toBe(204);
      expect(response.headers.get("x-campaign-os-trace-id")).toBe("trace-preflight");
      expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
      expect(response.headers.get("access-control-allow-methods")).toContain("POST");
      expect(await response.text()).toBe("");
    } finally {
      await server.stop();
    }
  });

  it("returns traceable guarded failures before business handlers", async () => {
    const server = await startCampaignOsApiServer({
      logger: false,
      maxBodyBytes: 16,
      port: 0,
    });

    try {
      const nonJson = await fetch(`${server.url}/api/campaigns`, {
        body: "plain",
        headers: {
          "content-type": "text/plain",
          "x-campaign-os-trace-id": "trace-non-json-http",
        },
        method: "POST",
      });
      const nonJsonPayload = await nonJson.json();

      expect(nonJson.status).toBe(400);
      expect(nonJson.headers.get("content-type")).toContain("application/json");
      expect(nonJson.headers.get("x-campaign-os-trace-id")).toBe("trace-non-json-http");
      expect(nonJsonPayload).toMatchObject({
        ok: false,
        traceId: "trace-non-json-http",
        error: {
          code: "INVALID_REQUEST",
          details: {
            field: "content-type",
          },
        },
      });

      const oversize = await fetch(`${server.url}/api/campaigns`, {
        body: JSON.stringify({ payload: "x".repeat(64) }),
        headers: {
          "content-type": "application/json",
          "x-campaign-os-trace-id": "trace-oversize-http",
        },
        method: "POST",
      });
      const oversizePayload = await oversize.json();

      expect(oversize.status).toBe(400);
      expect(oversize.headers.get("x-campaign-os-trace-id")).toBe("trace-oversize-http");
      expect(oversizePayload).toMatchObject({
        ok: false,
        traceId: "trace-oversize-http",
        error: {
          details: {
            field: "body",
          },
        },
      });

      const malformed = await fetch(`${server.url}/api/campaigns`, {
        body: "{bad",
        headers: {
          "content-type": "application/json",
          "x-campaign-os-trace-id": "trace-malformed-http",
        },
        method: "POST",
      });
      const malformedPayload = await malformed.json();

      expect(malformed.status).toBe(400);
      expect(malformed.headers.get("x-campaign-os-trace-id")).toBe("trace-malformed-http");
      expect(malformedPayload).toMatchObject({
        ok: false,
        traceId: "trace-malformed-http",
        error: {
          code: "MALFORMED_JSON",
        },
      });
    } finally {
      await server.stop();
    }
  });

  it("keeps production-required server runtime blocked and sanitized", async () => {
    vi.stubEnv("CAMPAIGN_OS_AUTH_SECRET", "bearer sample-bearer-token");
    vi.stubEnv("CAMPAIGN_OS_BACKEND_PROFILE", "production-required");
    vi.stubEnv("CAMPAIGN_OS_DATABASE_URL", "postgres://real-user:real-db-password@db.invalid/campaign-os");
    vi.stubEnv("CAMPAIGN_OS_PROVIDER_REGISTRY_URL", "https://providers.invalid/object-key-sample");
    vi.stubEnv("CAMPAIGN_OS_WORKER_QUEUE_URL", "https://queue.invalid/raw-signature-sample");
    vi.stubEnv("CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT", "https://writer.invalid/private-key-sample");

    const server = await startCampaignOsApiServer({ logger: false, port: 0 });

    try {
      const response = await fetch(`${server.url}/api/health`, {
        headers: {
          authorization: "Bearer sample-bearer-token",
          "x-campaign-os-trace-id": "trace-production-server",
        },
      });
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload).toMatchObject({
        ok: true,
        data: {
          serverRuntime: expect.objectContaining({
            profileId: "production-required",
            readiness: expect.objectContaining({
              backend: expect.objectContaining({
                valid: false,
              }),
              database: expect.objectContaining({
                adapterStatus: "blocked",
                migrationPlanStatus: "blocked",
                valid: false,
              }),
            }),
            status: "blocked",
          }),
        },
      });

      const serialized = JSON.stringify(payload).toLowerCase();
      expect(serialized).not.toContain("bearer sample-bearer-token");
      expect(serialized).not.toContain("real-db-password");
      expect(serialized).not.toContain("private-key-sample");
      expect(serialized).not.toContain("object-key-sample");
      expect(serialized).not.toContain("raw-signature-sample");
    } finally {
      await server.stop();
    }
  });
});
