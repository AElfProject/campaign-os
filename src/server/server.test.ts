import { describe, expect, it } from "vitest";
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
  it("starts and stops with backend service startup metadata", async () => {
    const logs: string[] = [];
    const server = await startCampaignOsApiServer({
      logger: {
        error: (message?: unknown) => logs.push(String(message)),
        log: (message?: unknown) => logs.push(String(message)),
      },
      port: 0,
    });

    try {
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
    }
  });
});
