import { describe, expect, it } from "vitest";
import { campaignDetail } from "../domain/fixtures";
import { createCampaignOsApiRuntime, type ApiRuntimeResponse } from "./apiRuntime";
import { startCampaignOsApiServer } from "./server";

interface LocalServiceEnvelope<TPayload> {
  boundary: unknown;
  payload: TPayload;
}

interface CampaignListPayload {
  summary: {
    totalCampaigns: number;
  };
}

interface CampaignDetailPayload {
  item: {
    id: string;
  };
}

interface EligibilityPayload {
  eligible: boolean;
  walletAddress: string;
}

interface AnalyticsPayload {
  exportBatchId: string;
  readyRows: number;
  reviewRequiredRows: number;
}

interface WalletSessionPayload {
  sessionId: string;
  walletSource: string;
}

interface CampaignDraftPayload {
  id: string;
  publishReadiness: {
    ready: boolean;
  };
}

interface TaskDraftPayload {
  campaignId: string;
  id: string;
}

interface VerificationPayload {
  evidenceSource: string;
  pointsAwarded: number;
  status: string;
}

interface I18nDraftPayload {
  humanReviewRequired: boolean;
  sourceLocale: string;
  targetLocale: string;
}

interface ExportPreviewPayload {
  campaignId: string;
  contractRootMode: string;
  format: string;
  readyRows: number;
}

const forbiddenResponseKeys = [
  "privatekey",
  "mnemonic",
  "seedphrase",
  "password",
  "bearer",
  "token",
  "signature",
  "signedurl",
  "objectkey",
  "secret",
];

const collectKeys = (value: unknown, keys: string[] = []): string[] => {
  if (!value || typeof value !== "object") {
    return keys;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectKeys(item, keys);
    }

    return keys;
  }

  for (const [key, nested] of Object.entries(value)) {
    keys.push(key.toLowerCase());
    collectKeys(nested, keys);
  }

  return keys;
};

const expectNoForbiddenResponseKeys = (value: unknown) => {
  const keys = collectKeys(value);

  for (const forbiddenKey of forbiddenResponseKeys) {
    expect(keys).not.toContain(forbiddenKey);
  }
};

const expectSuccessData = <TPayload = unknown>(response: ApiRuntimeResponse<unknown>) => {
  expect(response.status).toBe(200);
  expect(response.body.ok).toBe(true);

  if (!response.body.ok) {
    throw new Error("Expected API runtime success envelope.");
  }

  expect(response.body.traceId).not.toHaveLength(0);
  expect(response.body.runtime).toMatchObject({
    mode: "local_seeded",
    name: "campaign-os-api-runtime",
  });
  expect(response.body.safety).toMatchObject({
    localOnly: true,
    noLiveApi: true,
    noWalletSignature: true,
    noContractWrite: true,
    noRewardDistribution: true,
  });
  expectNoForbiddenResponseKeys(response.body);

  return response.body.data as TPayload;
};

describe("Campaign OS API runtime", () => {
  const runtime = createCampaignOsApiRuntime();

  it("returns health, contract, and service metadata through uniform envelopes", async () => {
    const health = await runtime.handle({
      method: "GET",
      path: "/api/health",
      headers: { "x-campaign-os-trace-id": "trace-health" },
    });
    const contracts = await runtime.handle({ method: "GET", path: "/api/contracts" });
    const services = await runtime.handle({ method: "GET", path: "/api/services" });

    const healthData = expectSuccessData(health);
    const contractData = expectSuccessData(contracts);
    const serviceData = expectSuccessData(services);

    expect(health.body.traceId).toBe("trace-health");
    expect(health.headers["x-campaign-os-trace-id"]).toBe("trace-health");
    expect(healthData).toMatchObject({
      mode: "local_seeded",
      routeCount: expect.any(Number),
      serviceReadiness: expect.objectContaining({
        totalServices: expect.any(Number),
      }),
      status: "ok",
    });
    expect(contractData).toMatchObject({
      coverage: expect.objectContaining({
        coveredSkillIds: expect.arrayContaining(["create_wallet_session", "export_winners"]),
      }),
      routes: expect.arrayContaining([
        expect.objectContaining({ id: "runtime.health", path: "/api/health" }),
      ]),
    });
    expect(serviceData).toMatchObject({
      summary: expect.objectContaining({
        totalServices: expect.any(Number),
      }),
    });
  });

  it("calls seeded campaign read endpoints through the local service facade", async () => {
    const list = await runtime.handle({
      method: "GET",
      path: `/api/campaigns?walletAddress=${encodeURIComponent("3E9...7cD")}`,
    });
    const detail = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}?walletAddress=${encodeURIComponent("3E9...7cD")}`,
    });
    const eligibility = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/eligibility?address=${encodeURIComponent("2F4...9aB")}`,
    });
    const analytics = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/analytics`,
    });

    expect(expectSuccessData<LocalServiceEnvelope<CampaignListPayload>>(list).payload.summary.totalCampaigns).toBe(3);
    expect(expectSuccessData<LocalServiceEnvelope<CampaignDetailPayload>>(detail).payload.item.id).toBe(campaignDetail.id);
    expect(expectSuccessData<LocalServiceEnvelope<EligibilityPayload>>(eligibility).payload).toMatchObject({
      eligible: true,
      walletAddress: "2F4...9aB",
    });
    expect(expectSuccessData<LocalServiceEnvelope<AnalyticsPayload>>(analytics).payload).toMatchObject({
      exportBatchId: "export-awaken-sprint-preview",
      readyRows: expect.any(Number),
      reviewRequiredRows: expect.any(Number),
    });
  });

  it("calls seeded POST endpoints without persistence, providers, storage, or rewards", async () => {
    const walletSession = await runtime.handle({
      method: "POST",
      path: "/api/wallet/session",
      body: JSON.stringify({
        adapterName: "PortkeyDiscoverWallet",
        fixtureId: "sess-eoa-app-001",
      }),
    });
    const campaignDraft = await runtime.handle({
      method: "POST",
      path: "/api/campaigns",
      body: JSON.stringify({
        duration: "2026-07-01/2026-07-14",
        endTime: "2026-07-14T23:59:59Z",
        goal: "Activate Awaken traders",
        ownerAddress: "2F4...9aB",
        projectId: "awaken",
        rewardDescription: "Rewards remain project owned.",
        startTime: "2026-07-01T00:00:00Z",
      }),
    });
    const taskDraft = await runtime.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/tasks`,
      body: JSON.stringify({
        evidenceRule: { source: "AELFSCAN", minAmount: 1 },
        points: 120,
        required: true,
        templateCode: "bridge_ebridge",
        verificationType: "ON_CHAIN",
        walletCompatibility: "ANY",
      }),
    });
    const verification = await runtime.handle({
      method: "POST",
      path: "/api/tasks/task-bridge/verify",
      body: JSON.stringify({
        accountType: "AA",
        campaignId: campaignDetail.id,
        walletAddress: "2F4...9aB",
        walletSource: "PORTKEY_AA",
      }),
    });
    const i18nDraft = await runtime.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/i18n/generate`,
      body: JSON.stringify({
        contentKeys: ["title", "description"],
        sourceLocale: "en-US",
        targetLocale: "zh-CN",
      }),
    });
    const exportPreview = await runtime.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/export`,
      body: JSON.stringify({
        contractRootMode: "none",
        format: "json",
        includeLocalePreference: true,
        includeRiskFlags: true,
        includeWalletType: true,
      }),
    });

    expect(expectSuccessData<LocalServiceEnvelope<WalletSessionPayload>>(walletSession).payload).toMatchObject({
      sessionId: "sess-eoa-app-001",
      walletSource: "PORTKEY_EOA_APP",
    });
    expect(expectSuccessData<LocalServiceEnvelope<CampaignDraftPayload>>(campaignDraft).payload).toMatchObject({
      id: "local-awaken-campaign",
      publishReadiness: { ready: true },
    });
    expect(expectSuccessData<LocalServiceEnvelope<TaskDraftPayload>>(taskDraft).payload).toMatchObject({
      campaignId: campaignDetail.id,
      id: "local-task-bridge_ebridge",
    });
    expect(expectSuccessData<LocalServiceEnvelope<VerificationPayload>>(verification).payload).toMatchObject({
      evidenceSource: "aelfscan",
      pointsAwarded: 120,
      status: "completed",
    });
    expect(expectSuccessData<LocalServiceEnvelope<I18nDraftPayload>>(i18nDraft).payload).toMatchObject({
      humanReviewRequired: true,
      sourceLocale: "en-US",
      targetLocale: "zh-CN",
    });
    expect(expectSuccessData<LocalServiceEnvelope<ExportPreviewPayload>>(exportPreview).payload).toMatchObject({
      campaignId: campaignDetail.id,
      contractRootMode: "none",
      format: "json",
      readyRows: expect.any(Number),
    });
  });

  it("fails closed for invalid routes, methods, JSON, locales, and export modes", async () => {
    const unknown = await runtime.handle({ method: "GET", path: "/api/missing" });
    const wrongMethod = await runtime.handle({ method: "DELETE", path: "/api/health" });
    const malformed = await runtime.handle({
      method: "POST",
      path: "/api/campaigns",
      body: "{",
    });
    const unsupportedLocale = await runtime.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/i18n/generate`,
      body: JSON.stringify({
        contentKeys: ["title"],
        sourceLocale: "en-US",
        targetLocale: "fr-FR",
      }),
    });
    const unsupportedExport = await runtime.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/export`,
      body: JSON.stringify({
        contractRootMode: "winners_root",
        format: "json",
        includeLocalePreference: true,
        includeRiskFlags: true,
        includeWalletType: true,
      }),
    });
    const missingCampaign = await runtime.handle({
      method: "GET",
      path: "/api/campaigns/missing-campaign",
    });
    const missingTask = await runtime.handle({
      method: "POST",
      path: "/api/tasks/missing-task/verify",
      body: JSON.stringify({
        accountType: "AA",
        campaignId: campaignDetail.id,
        walletAddress: "2F4...9aB",
        walletSource: "PORTKEY_AA",
      }),
    });
    const invalidCreate = await runtime.handle({
      method: "POST",
      path: "/api/campaigns",
      body: JSON.stringify({
        projectId: "awaken",
      }),
    });

    expect(unknown).toMatchObject({
      status: 404,
      body: {
        ok: false,
        error: { code: "ROUTE_NOT_FOUND" },
      },
    });
    expect(wrongMethod).toMatchObject({
      status: 405,
      body: {
        ok: false,
        error: { code: "METHOD_NOT_ALLOWED" },
      },
    });
    expect(malformed).toMatchObject({
      status: 400,
      body: {
        ok: false,
        error: { code: "MALFORMED_JSON" },
      },
    });
    expect(unsupportedLocale).toMatchObject({
      status: 400,
      body: {
        ok: false,
        error: { code: "UNSUPPORTED_LOCALE" },
      },
    });
    expect(unsupportedExport).toMatchObject({
      status: 400,
      body: {
        ok: false,
        error: { code: "UNSUPPORTED_EXPORT_MODE" },
      },
    });
    expect(missingCampaign).toMatchObject({
      status: 404,
      body: {
        ok: false,
        error: { code: "INVALID_CAMPAIGN" },
      },
    });
    expect(missingTask).toMatchObject({
      status: 404,
      body: {
        ok: false,
        error: { code: "INVALID_TASK" },
      },
    });
    expect(invalidCreate).toMatchObject({
      status: 400,
      body: {
        ok: false,
        error: { code: "INVALID_REQUEST" },
      },
    });

    for (const response of [
      unknown,
      wrongMethod,
      malformed,
      unsupportedLocale,
      unsupportedExport,
      missingCampaign,
      missingTask,
      invalidCreate,
    ]) {
      expectNoForbiddenResponseKeys(response.body);
      expect(response.body.traceId).not.toHaveLength(0);
      expect(response.headers["content-type"]).toBe("application/json; charset=utf-8");
    }
  });

  it("serves JSON over the Node HTTP adapter with a clean stop hook", async () => {
    const server = await startCampaignOsApiServer({ logger: false, port: 0 });

    try {
      const response = await fetch(`${server.url}/api/health`, {
        headers: { "x-campaign-os-trace-id": "trace-http-smoke" },
      });
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(response.headers.get("x-campaign-os-trace-id")).toBe("trace-http-smoke");
      expect(payload).toMatchObject({
        ok: true,
        traceId: "trace-http-smoke",
        data: {
          status: "ok",
        },
      });
    } finally {
      await server.stop();
    }
  });
});
