import { describe, expect, it } from "vitest";
import { startCampaignOsApiServer } from "./server";

const secretLeakFragments = [
  "authorization: bearer",
  "campaign_os_database_url=",
  "connectionstring=",
  "mnemonic",
  "objectkey=",
  "privatekey=",
  "rawsignature=",
  "seedphrase=",
  "signedurl=",
];

const expectSanitizedReadinessPayload = (payload: unknown) => {
  const serialized = JSON.stringify(payload).toLowerCase();

  for (const fragment of secretLeakFragments) {
    expect(serialized).not.toContain(fragment);
  }
};

describe("backend scaffold HTTP smoke", () => {
  it("serves health and contracts envelopes with trace IDs over the local server", async () => {
    const server = await startCampaignOsApiServer({ logger: false, port: 0 });

    try {
      expect(server.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);

      const health = await fetch(`${server.url}/api/health`, {
        headers: { "x-campaign-os-trace-id": "trace-backend-smoke-health" },
      });
      const contracts = await fetch(`${server.url}/api/contracts`, {
        headers: { "x-campaign-os-trace-id": "trace-backend-smoke-contracts" },
      });
      const healthPayload = await health.json();
      const contractsPayload = await contracts.json();

      expect(health.status).toBe(200);
      expect(contracts.status).toBe(200);
      expect(health.headers.get("content-type")).toContain("application/json");
      expect(contracts.headers.get("content-type")).toContain("application/json");
      expect(health.headers.get("x-campaign-os-trace-id")).toBe("trace-backend-smoke-health");
      expect(contracts.headers.get("x-campaign-os-trace-id")).toBe("trace-backend-smoke-contracts");
      expect(healthPayload).toMatchObject({
        ok: true,
        traceId: "trace-backend-smoke-health",
        runtime: expect.objectContaining({
          name: "campaign-os-api-runtime",
          mode: "local_seeded",
        }),
        data: {
          backendService: expect.objectContaining({
            entrypointId: "campaign-os-backend-service",
            migrationRunnerStatus: "disabled_local_review",
            profileId: "local-review",
            traceId: "trace-backend-smoke-health",
          }),
          status: "ok",
        },
      });
      expect(contractsPayload).toMatchObject({
        ok: true,
        traceId: "trace-backend-smoke-contracts",
        runtime: expect.objectContaining({
          name: "campaign-os-api-runtime",
          mode: "local_seeded",
        }),
        data: {
          backendService: expect.objectContaining({
            deferredProductionCapabilities: expect.arrayContaining([
              "auth_session",
              "production_database",
              "provider_adapters",
              "worker_queue",
              "scheduler",
              "contract_writer",
              "reward_distribution",
            ]),
            reportShape: expect.objectContaining({
              valid: true,
            }),
          }),
        },
      });
      expectSanitizedReadinessPayload(healthPayload.data.backendService);
      expectSanitizedReadinessPayload(contractsPayload.data.backendService);
    } finally {
      await server.stop();
    }
  });
});
