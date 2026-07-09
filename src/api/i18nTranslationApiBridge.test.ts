import { describe, expect, it, vi } from "vitest";
import {
  createI18nTranslationApiLoadingState,
  createI18nTranslationSeededFallbackState,
  sanitizeI18nTranslationApiText,
  submitI18nTranslationApiDraft,
  type I18nTranslationApiFetch,
  type I18nTranslationDraftRequest,
} from "./i18nTranslationApiBridge";

const request: I18nTranslationDraftRequest = {
  campaignId: "camp-awaken-sprint",
  contentKeys: ["title", "description", "rewardDisclaimer", "faq"],
  sourceLocale: "en-US",
  targetLocale: "zh-CN",
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

describe("i18n translation API bridge", () => {
  it("creates loading and seeded fallback states without touching the network", () => {
    expect(createI18nTranslationApiLoadingState(request)).toMatchObject({
      campaignId: request.campaignId,
      configured: true,
      contentKeys: request.contentKeys,
      loading: true,
      source: "loading",
      status: "loading",
      targetLocale: "zh-CN",
    });
    expect(createI18nTranslationApiLoadingState(request).boundary["en-US"]).toContain("Local i18n draft review only");

    expect(createI18nTranslationSeededFallbackState(request)).toMatchObject({
      configured: false,
      diagnostics: [{ code: "API_BASE_URL_MISSING", severity: "info" }],
      loading: false,
      source: "seeded_fallback",
      status: "fallback",
    });
  });

  it("treats missing API config as seeded fallback and does not fetch", async () => {
    const fetchImpl = vi.fn() as unknown as I18nTranslationApiFetch;

    const state = await submitI18nTranslationApiDraft({
      config: { baseUrl: "   " },
      fetchImpl,
      request,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(state).toMatchObject({
      configured: false,
      diagnostics: [{ code: "API_BASE_URL_MISSING", severity: "info" }],
      source: "seeded_fallback",
      status: "fallback",
    });
  });

  it("redacts malformed config and token query fragments from diagnostics", async () => {
    const state = await submitI18nTranslationApiDraft({
      config: {
        baseUrl: "ftp://api.invalid/path?token=sample-token&api_key=private-key-sample",
      },
      fetchImpl: vi.fn() as unknown as I18nTranslationApiFetch,
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

  it("generates a draft and normalizes review metadata from the runtime envelope", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response({
      data: {
        payload: {
          aiDraft: true,
          campaignId: request.campaignId,
          contentKeys: request.contentKeys,
          draft: {
            description: "本地草稿描述",
            faq: "本地 FAQ",
            rewardDisclaimer: "导出 winners 不等于发奖。",
            title: "本地草稿标题",
          },
          fallbackToEnglish: false,
          humanReviewRequired: true,
          noAutoPublishNotice: {
            "en-US": "AI generated translation cannot auto-publish before human review.",
            "zh-CN": "AI 生成翻译必须经过人工审核后才能发布。",
            "zh-TW": "AI 生成翻譯必須經過人工審核後才能發布。",
          },
          sourceLocale: "en-US",
          targetLocale: "zh-CN",
          translationManager: {
            campaignId: request.campaignId,
            fallbackLocale: "en-US",
          },
        },
        persistence: {
          kind: "i18n_draft",
          recordId: "record-i18n-1",
        },
        campaignDb: {
          adapterId: "campaign-db-deterministic-adapter",
          createdViaRepository: true,
          repositoryId: "campaign-db-repository-runtime",
          storeId: "campaign-db",
        },
      },
      ok: true,
      traceId: "trace-i18n-envelope",
    }, { traceId: "trace-i18n-header" })) as unknown as I18nTranslationApiFetch;

    const state = await submitI18nTranslationApiDraft({
      config: {
        baseUrl: "http://127.0.0.1:5184/",
        headers: {
          "x-campaign-os-roles": "project_owner",
        },
        tracePrefix: "i18n-review",
      },
      fetchImpl,
      request,
    });

    expect(state).toMatchObject({
      campaignId: request.campaignId,
      campaignDb: {
        createdViaRepository: true,
        storeId: "campaign-db",
      },
      configured: true,
      contentKeys: request.contentKeys,
      diagnostics: [],
      draft: {
        aiDraft: true,
        draft: {
          title: "本地草稿标题",
        },
        fallbackToEnglish: false,
        humanReviewRequired: true,
      },
      persistence: {
        kind: "i18n_draft",
        recordId: "record-i18n-1",
      },
      source: "api_runtime",
      sourceLocale: "en-US",
      status: "draft_generated",
      targetLocale: "zh-CN",
      traceId: "trace-i18n-header",
      translationManager: {
        campaignId: request.campaignId,
      },
    });
    expect(state.draft?.noAutoPublishNotice?.["en-US"]).toContain("cannot auto-publish");
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:5184/api/campaigns/camp-awaken-sprint/i18n/generate",
      expect.objectContaining({
        body: JSON.stringify({
          contentKeys: request.contentKeys,
          sourceLocale: "en-US",
          targetLocale: "zh-CN",
        }),
        headers: expect.objectContaining({
          accept: "application/json",
          "content-type": "application/json",
          "x-campaign-os-roles": "project_owner",
          "x-campaign-os-trace-id": expect.stringMatching(/^i18n-review-/),
        }),
        method: "POST",
      }),
    );
  });

  it("normalizes repository metadata from flattened runtime envelopes", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response({
      campaignDb: {
        adapterId: "campaign-db-deterministic-adapter",
        createdViaRepository: true,
        repositoryId: "campaign-db-repository-runtime",
        storeId: "campaign-db",
      },
      data: {
        payload: {
          aiDraft: true,
          campaignId: request.campaignId,
          contentKeys: ["title"],
          draft: {
            title: "本地草稿标题",
          },
          fallbackToEnglish: true,
          humanReviewRequired: true,
          sourceLocale: "en-US",
          targetLocale: "zh-CN",
        },
      },
      ok: true,
      traceId: "trace-i18n-flat-metadata",
    })) as unknown as I18nTranslationApiFetch;

    const state = await submitI18nTranslationApiDraft({
      config: { baseUrl: "http://127.0.0.1:5184/" },
      fetchImpl,
      request,
    });

    expect(state).toMatchObject({
      campaignDb: {
        adapterId: "campaign-db-deterministic-adapter",
        createdViaRepository: true,
        repositoryId: "campaign-db-repository-runtime",
        storeId: "campaign-db",
      },
      draft: {
        fallbackToEnglish: true,
        humanReviewRequired: true,
      },
      source: "api_runtime",
      status: "draft_generated",
      traceId: "trace-i18n-flat-metadata",
    });
  });

  it("keeps seeded fallback when i18n generation fails with unsafe details", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response({
      error: {
        code: "UNSUPPORTED_LOCALE",
        message: "provider payload used raw signature and private key in /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/evidence/raw",
      },
      ok: false,
      traceId: "trace-i18n-failed",
    }, { ok: false, status: 400, traceId: "trace-i18n-failed" })) as unknown as I18nTranslationApiFetch;

    const state = await submitI18nTranslationApiDraft({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl,
      request,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
      diagnostics: [{
        code: "API_TRANSLATION_FAILED",
        safeDetails: {
          endpoint: "/api/campaigns/camp-awaken-sprint/i18n/generate",
          status: 400,
        },
      }],
      source: "error_fallback",
      status: "error",
      traceId: "trace-i18n-failed",
    });
    expect(serialized).not.toContain("provider payload");
    expect(serialized).not.toContain("raw signature");
    expect(serialized).not.toContain("private key");
    expect(serialized).not.toContain("campaign-os-kitty");
  });

  it("falls back safely when the i18n payload shape is malformed", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response({
      data: {
        payload: {
          contentKeys: [],
          sourceLocale: "en-US",
          targetLocale: "zh-CN",
        },
      },
      ok: true,
      traceId: "trace-invalid-i18n",
    })) as unknown as I18nTranslationApiFetch;

    const state = await submitI18nTranslationApiDraft({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl,
      request,
    });

    expect(state).toMatchObject({
      diagnostics: [{ code: "API_RESPONSE_INVALID" }],
      source: "error_fallback",
      status: "error",
      traceId: "trace-invalid-i18n",
    });
  });

  it("returns a sanitized timeout diagnostic when the request is aborted", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new DOMException(
        "Request aborted with bearer token sample-token, password=secret, seed phrase sample, raw-signature, and stack trace.",
        "AbortError",
      );
    }) as unknown as I18nTranslationApiFetch;

    const state = await submitI18nTranslationApiDraft({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl,
      request,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
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
      sanitizeI18nTranslationApiText(
        "api key and token=abc123 in /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/evidence/raw were removed",
      ),
    ).toBe("redacted credential and redacted query credential in redacted private path were removed");
  });
});
