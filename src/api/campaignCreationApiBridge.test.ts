import { describe, expect, it, vi } from "vitest";
import {
  createCampaignCreationApiLoadingState,
  sanitizeCampaignCreationApiText,
  submitCampaignCreationApiBridgeDraft,
  type CampaignCreationApiFetch,
  type CampaignCreationDraftInput,
} from "./campaignCreationApiBridge";

const runtime = {
  mode: "local_seeded",
  name: "campaign-os-api-runtime",
  routeCount: 27,
  version: "0.1.0-local",
};

const draft: CampaignCreationDraftInput = {
  contractMode: "OFF_CHAIN_MVP",
  defaultLocale: "en-US",
  duration: "14 days",
  endTime: "2026-07-23T00:00:00Z",
  goal: "Bridge and swap activation",
  ownerAddress: "ELF_local_review_owner",
  projectId: "awaken",
  rewardDescription: "Rewards are provided by the campaign project.",
  startTime: "2026-07-09T00:00:00Z",
  supportedLocales: ["en-US", "zh-CN", "zh-TW"],
  walletPolicy: "ANY",
};

const response = (
  body: unknown,
  options: { ok?: boolean; status?: number; traceId?: string } = {},
): Response => ({
  headers: new Headers(options.traceId ? { "x-campaign-os-trace-id": options.traceId } : {}),
  json: vi.fn(async () => body),
  ok: options.ok ?? true,
  status: options.status ?? 200,
} as unknown as Response);

describe("campaign creation API bridge", () => {
  it("creates a loading state for Project Console review without touching the network", () => {
    const state = createCampaignCreationApiLoadingState({ campaignCount: 3 });

    expect(state).toMatchObject({
      campaignCount: 3,
      configured: true,
      loading: true,
      source: "loading",
      status: "loading",
    });
    expect(state.boundary["en-US"]).toContain("Local Campaign OS API creation review only");
  });

  it("treats missing API config as seeded fallback and does not fetch", async () => {
    const fetchImpl = vi.fn() as unknown as CampaignCreationApiFetch;

    const state = await submitCampaignCreationApiBridgeDraft({
      config: { baseUrl: "   " },
      draft,
      fetchImpl,
      seededCampaignCount: 3,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(state).toMatchObject({
      campaignCount: 3,
      configured: false,
      diagnostics: [{ code: "API_BASE_URL_MISSING", severity: "info" }],
      loading: false,
      source: "seeded_fallback",
      status: "fallback",
    });
  });

  it("redacts malformed config and token query fragments from diagnostics", async () => {
    const state = await submitCampaignCreationApiBridgeDraft({
      config: {
        baseUrl: "ftp://api.invalid/path?token=sample-token&api_key=private-key-sample",
      },
      draft,
      fetchImpl: vi.fn() as unknown as CampaignCreationApiFetch,
      seededCampaignCount: 3,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
      configured: true,
      diagnostics: [{ code: "API_BASE_URL_INVALID", severity: "warning" }],
      source: "seeded_fallback",
      status: "fallback",
    });
    for (const unsafe of ["token=sample-token", "api_key", "private-key", "private key"]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("creates a draft and confirms it in same-session campaign list refresh", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({
        data: { status: "ready" },
        ok: true,
        runtime,
        safety: { localOnly: true },
        traceId: "trace-health",
      }, { traceId: "trace-health" }))
      .mockResolvedValueOnce(response({
        data: {
          boundary: {
            "en-US": "Local Campaign DB repository review only.",
            "zh-CN": "仅本地 Campaign DB repository review。",
            "zh-TW": "Local Campaign DB repository review only.",
          },
          campaignDb: {
            createdViaRepository: true,
            draftId: "draft-api-1",
            repositoryId: "campaign-db-memory",
            storeId: "campaign-db",
          },
          payload: {
            id: "draft-api-1",
            ownerAddress: draft.ownerAddress,
            projectId: draft.projectId,
            status: "draft",
          },
          persistence: {
            kind: "campaign_draft",
            recordId: "record-1",
          },
        },
        ok: true,
        runtime,
        safety: { localOnly: true },
        traceId: "trace-create",
      }, { traceId: "trace-create" }))
      .mockResolvedValueOnce(response({
        data: {
          payload: {
            items: [
              { id: "draft-api-1" },
              { id: "seeded-awaken" },
              { id: "seeded-forest" },
            ],
            summary: { totalCampaigns: 3 },
          },
        },
        ok: true,
        runtime,
        safety: { localOnly: true },
        traceId: "trace-list",
      }, { traceId: "trace-list" })) as unknown as CampaignCreationApiFetch;

    const state = await submitCampaignCreationApiBridgeDraft({
      config: {
        baseUrl: "http://127.0.0.1:5184/",
        headers: {
          "x-campaign-os-roles": "project_owner",
          "x-campaign-os-wallet-address": "ELF_local_review_owner",
        },
        tracePrefix: "creation-review",
      },
      draft,
      fetchImpl,
      seededCampaignCount: 2,
    });

    expect(state).toMatchObject({
      campaignCount: 3,
      configured: true,
      createdDraftId: "draft-api-1",
      diagnostics: [],
      healthStatus: "ready",
      listContainsCreatedDraft: true,
      persistence: {
        kind: "campaign_draft",
        recordId: "record-1",
      },
      readinessSummary: "ready; 27 routes",
      repository: {
        createdViaRepository: true,
        draftId: "draft-api-1",
        repositoryId: "campaign-db-memory",
        storeId: "campaign-db",
      },
      routeCount: 27,
      source: "api_runtime",
      status: "created",
      traceId: "trace-list",
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:5184/api/health",
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: "application/json",
          "x-campaign-os-trace-id": expect.stringMatching(/^creation-review-/),
        }),
        method: "GET",
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "http://127.0.0.1:5184/api/campaigns",
      expect.objectContaining({
        body: JSON.stringify(draft),
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-campaign-os-roles": "project_owner",
          "x-campaign-os-wallet-address": "ELF_local_review_owner",
          "x-campaign-os-trace-id": expect.stringMatching(/^creation-review-/),
        }),
        method: "POST",
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      "http://127.0.0.1:5184/api/campaigns",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("keeps seeded fallback when campaign creation fails with unsafe details", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({
        data: { status: "ready" },
        ok: true,
        runtime,
        traceId: "trace-health",
      }))
      .mockResolvedValueOnce(response({
        error: {
          code: "INVALID_REQUEST",
          message: "raw signature and private key were rejected",
        },
        ok: false,
        runtime,
        traceId: "trace-create-failed",
      }, { ok: false, status: 400, traceId: "trace-create-failed" })) as unknown as CampaignCreationApiFetch;

    const state = await submitCampaignCreationApiBridgeDraft({
      config: { baseUrl: "http://127.0.0.1:5184" },
      draft,
      fetchImpl,
      seededCampaignCount: 3,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
      campaignCount: 3,
      diagnostics: [{
        code: "API_CREATE_FAILED",
        safeDetails: {
          endpoint: "/api/campaigns",
          status: 400,
        },
      }],
      source: "error_fallback",
      status: "error",
      traceId: "trace-create-failed",
    });
    expect(serialized).not.toContain("raw signature");
    expect(serialized).not.toContain("private key");
  });

  it("preserves created draft metadata when list refresh fails", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({
        data: { status: "ready" },
        ok: true,
        runtime,
        traceId: "trace-health",
      }))
      .mockResolvedValueOnce(response({
        data: {
          campaignDb: {
            createdViaRepository: true,
            draftId: "draft-api-2",
            storeId: "campaign-db",
          },
          payload: {
            id: "draft-api-2",
          },
          persistence: {
            kind: "campaign_draft",
            recordId: "record-2",
          },
        },
        ok: true,
        runtime,
        traceId: "trace-create",
      }))
      .mockResolvedValueOnce(response({
        error: {
          code: "LIST_FAILED",
          message: "provider payload /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/evidence/raw",
        },
        ok: false,
        runtime,
        traceId: "trace-list-failed",
      }, { ok: false, status: 500, traceId: "trace-list-failed" })) as unknown as CampaignCreationApiFetch;

    const state = await submitCampaignCreationApiBridgeDraft({
      config: { baseUrl: "http://127.0.0.1:5184" },
      draft,
      fetchImpl,
      seededCampaignCount: 2,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
      campaignCount: 2,
      createdDraftId: "draft-api-2",
      diagnostics: [{ code: "API_LIST_FAILED", severity: "warning" }],
      persistence: {
        recordId: "record-2",
      },
      repository: {
        draftId: "draft-api-2",
        storeId: "campaign-db",
      },
      source: "api_runtime",
      status: "created",
      traceId: "trace-list-failed",
    });
    expect(state.listContainsCreatedDraft).toBeUndefined();
    expect(serialized).not.toContain("provider payload");
    expect(serialized).not.toContain("campaign-os-kitty");
  });

  it("falls back safely when the create payload shape is malformed", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({
        data: { status: "ready" },
        ok: true,
        runtime,
        traceId: "trace-health",
      }))
      .mockResolvedValueOnce(response({
        data: {
          payload: {
            id: "",
          },
        },
        ok: true,
        runtime,
        traceId: "trace-invalid-create",
      })) as unknown as CampaignCreationApiFetch;

    const state = await submitCampaignCreationApiBridgeDraft({
      config: { baseUrl: "http://127.0.0.1:5184" },
      draft,
      fetchImpl,
      seededCampaignCount: 2,
    });

    expect(state).toMatchObject({
      campaignCount: 2,
      diagnostics: [{ code: "API_RESPONSE_INVALID" }],
      source: "error_fallback",
      status: "error",
      traceId: "trace-invalid-create",
    });
  });

  it("returns a sanitized timeout diagnostic when the request is aborted", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new DOMException(
        "Request aborted with bearer token sample-token, password=secret, seed phrase sample, raw-signature, and stack trace.",
        "AbortError",
      );
    }) as unknown as CampaignCreationApiFetch;

    const state = await submitCampaignCreationApiBridgeDraft({
      config: { baseUrl: "http://127.0.0.1:5184" },
      draft,
      fetchImpl,
      seededCampaignCount: 3,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
      campaignCount: 3,
      diagnostics: [{ code: "API_REQUEST_TIMEOUT" }],
      source: "error_fallback",
      status: "error",
    });
    for (const unsafe of ["bearer token", "password", "seed phrase", "raw-signature", "sample-token", "stack trace"]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("redacts standalone unsafe text fragments", () => {
    expect(
      sanitizeCampaignCreationApiText(
        "api key and token=abc123 in /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/evidence/raw were removed",
      ),
    ).toBe("redacted credential and redacted query credential in redacted private path were removed");
  });
});
