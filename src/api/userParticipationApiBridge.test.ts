import { describe, expect, it, vi } from "vitest";
import {
  createUserParticipationApiLoadingState,
  sanitizeUserParticipationApiText,
  submitUserParticipationApiReview,
  type UserParticipationApiFetch,
  type UserParticipationReviewRequest,
} from "./userParticipationApiBridge";

const request: UserParticipationReviewRequest = {
  accountType: "EOA",
  campaignId: "camp-awaken-sprint",
  taskId: "tpl-bridge-ebridge",
  walletAddress: "2F4...9aB",
  walletSource: "PORTKEY_EOA_EXTENSION",
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

describe("user participation API bridge", () => {
  it("creates a loading state without touching the network", () => {
    const state = createUserParticipationApiLoadingState(request);

    expect(state).toMatchObject({
      configured: true,
      loading: true,
      source: "loading",
      status: "loading",
      request,
    });
    expect(state.boundary["en-US"]).toContain("Local user participation API review only");
  });

  it("treats missing API config as seeded fallback and does not fetch", async () => {
    const fetchImpl = vi.fn() as unknown as UserParticipationApiFetch;

    const state = await submitUserParticipationApiReview({
      config: { baseUrl: "   " },
      fetchImpl,
      request,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(state).toMatchObject({
      configured: false,
      diagnostics: [{ code: "API_BASE_URL_MISSING", severity: "info" }],
      loading: false,
      source: "seeded_fallback",
      status: "fallback",
    });
  });

  it("redacts malformed config and token query fragments from diagnostics", async () => {
    const state = await submitUserParticipationApiReview({
      config: {
        baseUrl: "ftp://api.invalid/path?token=sample-token&api_key=private-key-sample",
      },
      fetchImpl: vi.fn() as unknown as UserParticipationApiFetch,
      request,
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

  it("verifies a task and refreshes eligibility from runtime envelopes", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({
        data: {
          payload: {
            accountType: "EOA",
            campaignId: request.campaignId,
            evidenceHash: "local-evidence-hash",
            evidenceSource: "DAPP_API",
            nextAction: {
              "en-US": "Check remaining DAO vote task.",
              "zh-CN": "检查剩余 DAO 投票任务。",
              "zh-TW": "Check remaining DAO vote task.",
            },
            pointsAwarded: 120,
            pointsAvailable: 120,
            riskFlags: [],
            status: "completed",
            taskId: request.taskId,
            walletAddress: request.walletAddress,
            walletSource: request.walletSource,
          },
          persistence: {
            kind: "verification_attempt",
            recordId: "verify-record-1",
          },
        },
        ok: true,
        traceId: "trace-verify-envelope",
      }, { traceId: "trace-verify-header" }))
      .mockResolvedValueOnce(response({
        data: {
          campaignDb: {
            createdViaRepository: true,
            repositoryId: "campaign-db-repository-runtime",
            storeId: "campaign-db",
          },
          payload: {
            accountType: "EOA",
            campaignId: request.campaignId,
            eligible: false,
            localePreference: "en-US",
            missingTasks: ["vote_tmrwdao"],
            nextAction: {
              "en-US": "Complete the remaining required task.",
              "zh-CN": "完成剩余必做任务。",
              "zh-TW": "Complete the remaining required task.",
            },
            riskFlags: [],
            score: 220,
            status: "pending",
            walletAddress: request.walletAddress,
            walletSource: request.walletSource,
            walletTypeVerified: true,
          },
        },
        ok: true,
        traceId: "trace-eligibility-envelope",
      }, { traceId: "trace-eligibility-header" })) as unknown as UserParticipationApiFetch;

    const state = await submitUserParticipationApiReview({
      config: {
        baseUrl: "http://127.0.0.1:5184/",
        headers: {
          "x-campaign-os-roles": "participant",
        },
        tracePrefix: "user-participation-review",
      },
      fetchImpl,
      request,
    });

    expect(state).toMatchObject({
      configured: true,
      diagnostics: [],
      eligibility: {
        campaignId: request.campaignId,
        missingTasks: ["vote_tmrwdao"],
        score: 220,
        status: "pending",
        walletTypeVerified: true,
      },
      repository: {
        createdViaRepository: true,
        repositoryId: "campaign-db-repository-runtime",
        storeId: "campaign-db",
      },
      persistence: {
        kind: "verification_attempt",
        recordId: "verify-record-1",
      },
      source: "api_runtime",
      status: "eligibility_checked",
      traceId: "trace-eligibility-header",
      verification: {
        accountType: "EOA",
        campaignId: request.campaignId,
        pointsAwarded: 120,
        status: "completed",
        taskId: request.taskId,
        walletSource: request.walletSource,
      },
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:5184/api/tasks/tpl-bridge-ebridge/verify",
      expect.objectContaining({
        body: JSON.stringify({
          accountType: request.accountType,
          campaignId: request.campaignId,
          walletAddress: request.walletAddress,
          walletSource: request.walletSource,
        }),
        headers: expect.objectContaining({
          accept: "application/json",
          "content-type": "application/json",
          "x-campaign-os-roles": "participant",
          "x-campaign-os-trace-id": expect.stringMatching(/^user-participation-review-/),
        }),
        method: "POST",
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "http://127.0.0.1:5184/api/campaigns/camp-awaken-sprint/eligibility?address=2F4...9aB&accountType=EOA&walletSource=PORTKEY_EOA_EXTENSION",
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: "application/json",
          "x-campaign-os-trace-id": expect.stringMatching(/^user-participation-review-/),
        }),
        method: "GET",
      }),
    );
  });

  it("keeps verification visible when eligibility refresh fails", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({
        data: {
          payload: {
            accountType: "EOA",
            campaignId: request.campaignId,
            pointsAwarded: 40,
            riskFlags: [],
            status: "manual_review",
            taskId: request.taskId,
            walletAddress: request.walletAddress,
            walletSource: request.walletSource,
          },
        },
        ok: true,
        traceId: "trace-verify",
      }, { traceId: "trace-verify" }))
      .mockResolvedValueOnce(response({
        error: {
          message: "provider payload leaked raw signature in /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/raw",
        },
        ok: false,
        traceId: "trace-eligibility-failed",
      }, { ok: false, status: 500, traceId: "trace-eligibility-failed" })) as unknown as UserParticipationApiFetch;

    const state = await submitUserParticipationApiReview({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl,
      request,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
      diagnostics: [{
        code: "API_ELIGIBILITY_FAILED",
        safeDetails: {
          endpoint: "/api/campaigns/camp-awaken-sprint/eligibility",
          status: 500,
        },
      }],
      source: "api_runtime",
      status: "partial",
      traceId: "trace-eligibility-failed",
      verification: {
        status: "manual_review",
        taskId: request.taskId,
      },
    });
    expect(state.eligibility).toBeUndefined();
    expect(serialized).not.toContain("provider payload");
    expect(serialized).not.toContain("raw signature");
    expect(serialized).not.toContain("campaign-os-kitty");
  });

  it("keeps seeded fallback when task verification fails with unsafe details", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response({
      error: {
        code: "INVALID_REQUEST",
        message: "raw signature and private key were rejected",
      },
      ok: false,
      traceId: "trace-verify-failed",
    }, { ok: false, status: 400, traceId: "trace-verify-failed" })) as unknown as UserParticipationApiFetch;

    const state = await submitUserParticipationApiReview({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl,
      request,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
      diagnostics: [{
        code: "API_VERIFY_FAILED",
        safeDetails: {
          endpoint: "/api/tasks/tpl-bridge-ebridge/verify",
          status: 400,
        },
      }],
      source: "error_fallback",
      status: "error",
      traceId: "trace-verify-failed",
    });
    expect(serialized).not.toContain("raw signature");
    expect(serialized).not.toContain("private key");
  });

  it("falls back safely when the verification payload shape is malformed", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response({
      data: {
        payload: {
          campaignId: request.campaignId,
          taskId: request.taskId,
        },
      },
      ok: true,
      traceId: "trace-invalid-verify",
    })) as unknown as UserParticipationApiFetch;

    const state = await submitUserParticipationApiReview({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl,
      request,
    });

    expect(state).toMatchObject({
      diagnostics: [{ code: "API_RESPONSE_INVALID" }],
      source: "error_fallback",
      status: "error",
      traceId: "trace-invalid-verify",
    });
  });

  it("returns a timeout diagnostic when requests are aborted", async () => {
    const fetchImpl = vi.fn((_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      }),
    ) as unknown as UserParticipationApiFetch;

    const state = await submitUserParticipationApiReview({
      config: { baseUrl: "http://127.0.0.1:5184", timeoutMs: 250 },
      fetchImpl,
      request,
    });

    expect(state).toMatchObject({
      diagnostics: [{ code: "API_REQUEST_TIMEOUT" }],
      source: "error_fallback",
      status: "error",
    });
  });

  it("sanitizes unsafe free-form text", () => {
    expect(
      sanitizeUserParticipationApiText(
        "private key raw signature provider payload stack trace /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/evidence?token=secret",
      ).toLowerCase(),
    ).not.toMatch(/private key|raw signature|provider payload|stack trace|campaign-os-kitty|token=secret/);
  });
});
