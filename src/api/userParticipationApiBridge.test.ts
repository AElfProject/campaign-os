import { describe, expect, it, vi } from "vitest";
import type { NormalizedWalletSession } from "../domain/types";
import {
  createUserParticipationApiLoadingState,
  sanitizeUserParticipationApiText,
  submitUserParticipationApiReview,
  type UserParticipationApiFetch,
  type UserParticipationRepositoryEvidenceMetadata,
  type UserParticipationReviewRequest,
} from "./userParticipationApiBridge";
import {
  createDeprecatedPreviewWalletSessionAuthHeaders,
  deprecatedNonLivePreviewWalletSessionAuthConfiguration,
} from "./walletSessionAuthHeaders";

const request: UserParticipationReviewRequest = {
  accountType: "EOA",
  campaignId: "camp-awaken-sprint",
  taskId: "tpl-bridge-ebridge",
  walletAddress: "2F4...9aB",
  walletSource: "PORTKEY_EOA_EXTENSION",
};
const legacyVerificationAuthorityFields = [
  "accountType",
  "chainId",
  "network",
  "role",
  "sessionId",
  "walletAddress",
  "walletSource",
] as const;
const explicitPreviewConfig = {
  authorityMode: "deprecated_non_live_preview" as const,
  mode: "seeded_preview" as const,
};
const previewSession: NormalizedWalletSession = {
  accountType: request.accountType,
  address: request.walletAddress,
  capabilities: ["SIGN_MESSAGE", "CONTRACT_VIEW"],
  chainId: "AELF",
  displayAddress: request.walletAddress,
  id: "wallet-session-user-participation-preview",
  issuer: {
    artifactType: "local_session_reference",
    cookieIssued: false,
    diagnosticCodes: [],
    issuerMode: "local_opaque",
    jwtIssued: false,
    liveSigningExecuted: false,
    referenceId: "issuer-ref-user-participation-preview",
    ttlSeconds: 900,
    valid: true,
  },
  network: "testnet",
  normalUserRecommended: true,
  proof: {
    diagnosticCodes: [],
    liveVerificationExecuted: false,
    proofType: "wallet_signature",
    status: "verified",
    trustLevel: "verified_local",
  },
  sessionId: "session-user-participation-preview",
  signatureStatus: "signed",
  statusMessage: { "en-US": "Connected", "zh-CN": "Connected" },
  verificationStatus: "verified",
  walletName: "Portkey EOA",
  walletSource: request.walletSource,
  walletTypeVerified: true,
};

const createLegacyPreviewHeaders = () => {
  const result = createDeprecatedPreviewWalletSessionAuthHeaders(
    previewSession,
    deprecatedNonLivePreviewWalletSessionAuthConfiguration,
  );

  if (!result.ok) {
    throw new Error(`Preview auth fixture failed: ${result.code}:${result.field}`);
  }

  return result.headers;
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

const normalizedEvidenceMetadata: UserParticipationRepositoryEvidenceMetadata = {
  evidenceHash: "evidence-hash:tpl-bridge-ebridge",
  evidenceId: "campaign-db-evidence-1",
  evidenceSource: "DAPP_API",
  liveContractExecuted: false,
  liveProviderExecuted: false,
  liveRewardExecuted: false,
  liveStorageExecuted: false,
  repositoryId: "campaign-db-repository-runtime",
  storeId: "campaign-db",
  taskId: request.taskId,
};

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

  it("uses seeded fallback only for explicit seeded_preview mode", async () => {
    const fetchImpl = vi.fn() as unknown as UserParticipationApiFetch;

    const state = await submitUserParticipationApiReview({
      config: { ...explicitPreviewConfig, baseUrl: "   " },
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

  it("fails closed before fetch when seeded preview lacks explicit deprecated authority opt-in", async () => {
    const fetchImpl = vi.fn() as unknown as UserParticipationApiFetch;

    const state = await submitUserParticipationApiReview({
      config: { baseUrl: "http://127.0.0.1:5184", mode: "seeded_preview" },
      fetchImpl,
      request,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(state).toMatchObject({
      diagnostics: [{
        code: "API_PREVIEW_AUTHORITY_REQUIRED",
        safeDetails: { reason: "explicit_preview_opt_in_required" },
        severity: "error",
      }],
      source: "error_fallback",
      status: "error",
    });
  });

  it("fails closed before fetch when deprecated preview authority targets a non-loopback runtime", async () => {
    const fetchImpl = vi.fn() as unknown as UserParticipationApiFetch;

    const state = await submitUserParticipationApiReview({
      config: {
        ...explicitPreviewConfig,
        baseUrl: "https://campaign-os.example",
      },
      fetchImpl,
      request,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(state).toMatchObject({
      diagnostics: [{
        code: "API_PREVIEW_AUTHORITY_REQUIRED",
        safeDetails: { reason: "loopback_runtime_required" },
        severity: "error",
      }],
      source: "error_fallback",
      status: "error",
    });
  });

  it.each([
    "authorization",
    "cookie",
    "proxy-authorization",
    "x-wallet-session",
    "x-campaign-os-account-type",
    "x-campaign-os-auth-token",
    "x-campaign-os-capability",
    "x-campaign-os-credential-boundary",
    "x-campaign-os-csrf-token",
    "x-campaign-os-proof-status",
    "x-campaign-os-role",
    "x-campaign-os-session-id",
    "x-campaign-os-wallet-address",
    "x-account-type",
    "x-auth-session-id",
    "x-capabilities",
    "x-capability",
    "x-chain-id",
    "x-network",
    "x-role",
    "x-roles",
    "x-session-id",
  ])("rejects config authority header %s before fetch", async (headerName) => {
    const fetchImpl = vi.fn() as unknown as UserParticipationApiFetch;

    const state = await submitUserParticipationApiReview({
      config: {
        ...explicitPreviewConfig,
        baseUrl: "http://localhost:5184",
        headers: { [headerName]: "caller-controlled" },
      },
      fetchImpl,
      request,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(state).toMatchObject({
      diagnostics: [{
        code: "API_PREVIEW_AUTHORITY_CONFLICT",
        safeDetails: { field: headerName },
        severity: "error",
      }],
      source: "error_fallback",
      status: "error",
    });
  });

  it("rejects loopback preview URL credentials before fetch", async () => {
    const fetchImpl = vi.fn() as unknown as UserParticipationApiFetch;

    const state = await submitUserParticipationApiReview({
      config: {
        ...explicitPreviewConfig,
        baseUrl: "http://operator:private-value@127.0.0.1:5184",
      },
      fetchImpl,
      request,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(state).toMatchObject({
      diagnostics: [{
        code: "API_PREVIEW_AUTHORITY_REQUIRED",
        safeDetails: { reason: "credentialed_url_rejected" },
        severity: "error",
      }],
      source: "error_fallback",
      status: "error",
    });
    expect(JSON.stringify(state)).not.toMatch(/operator|private-value/);
  });

  it("routes every durable request away from the legacy bridge without touching the network", async () => {
    const fetchImpl = vi.fn() as unknown as UserParticipationApiFetch;

    const state = await submitUserParticipationApiReview({
      config: {
        baseUrl: "http://127.0.0.1:5184",
        headers: { "x-campaign-os-wallet-address": "caller-controlled" },
        mode: "durable",
      },
      fetchImpl,
      request,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(state).toMatchObject({
      diagnostics: [{ code: "API_DURABLE_FACADE_REQUIRED" }],
      loading: false,
      source: "api_runtime",
      status: "error",
    });
    expect(state.verification).toBeUndefined();
    expect(state.eligibility).toBeUndefined();
  });

  it("redacts malformed config and token query fragments from diagnostics", async () => {
    const state = await submitUserParticipationApiReview({
      config: {
        authorityMode: "deprecated_non_live_preview",
        baseUrl: "ftp://api.invalid/path?token=sample-token&api_key=private-key-sample",
        mode: "seeded_preview",
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
          campaignDbEvidence: {
            ...normalizedEvidenceMetadata,
            completionId: "completion-ignored",
            evidenceRef: "provider payload raw signature should be omitted",
            signedUrl: "https://secret.example/raw?token=unsafe",
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
            campaignDbEvidence: [
              normalizedEvidenceMetadata,
              {
                evidenceHash: "https://secret.example/raw?token=unsafe",
                evidenceId: "private key evidence",
                evidenceSource: "provider payload",
                liveProviderExecuted: true,
                repositoryId: "/Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/evidence",
                taskId: "raw signature",
              },
              "malformed-evidence",
            ],
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
        ...explicitPreviewConfig,
        baseUrl: "http://127.0.0.1:5184/",
        headers: {
          "x-content-locale": "en-US",
          "x-review-trace-context": "preview",
        },
        previewAuthHeaders: createLegacyPreviewHeaders(),
        tracePrefix: "user-participation-review",
      },
      fetchImpl,
      request,
    });

    expect(state).toMatchObject({
      configured: true,
      diagnostics: [],
      eligibility: {
        campaignDbEvidence: [normalizedEvidenceMetadata],
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
        repositoryEvidence: normalizedEvidenceMetadata,
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
        body: JSON.stringify({ campaignId: request.campaignId }),
        headers: expect.objectContaining({
          accept: "application/json",
          "content-type": "application/json",
          "x-campaign-os-account-type": request.accountType,
          "x-campaign-os-roles": "participant",
          "x-campaign-os-session-id": previewSession.sessionId,
          "x-content-locale": "en-US",
          "x-campaign-os-trace-id": expect.stringMatching(/^user-participation-review-/),
          "x-review-trace-context": "preview",
        }),
        method: "POST",
      }),
    );
    const verifyBody = JSON.parse(String(vi.mocked(fetchImpl).mock.calls[0][1]?.body));
    expect(verifyBody).toEqual({ campaignId: request.campaignId });
    for (const field of legacyVerificationAuthorityFields) {
      expect(verifyBody).not.toHaveProperty(field);
    }
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
            campaignDbEvidence: {
              ...normalizedEvidenceMetadata,
              evidenceId: "campaign-db-evidence-partial",
            },
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
      config: { ...explicitPreviewConfig, baseUrl: "http://127.0.0.1:5184" },
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
        repositoryEvidence: {
          ...normalizedEvidenceMetadata,
          evidenceId: "campaign-db-evidence-partial",
        },
        status: "manual_review",
        taskId: request.taskId,
      },
    });
    expect(state.eligibility).toBeUndefined();
    expect(serialized).not.toContain("provider payload");
    expect(serialized).not.toContain("raw signature");
    expect(serialized).not.toContain("campaign-os-kitty");
  });

  it("does not submit or refresh through the legacy bridge in durable mode", async () => {
    const fetchImpl = vi.fn() as unknown as UserParticipationApiFetch;

    const state = await submitUserParticipationApiReview({
      config: { baseUrl: "http://127.0.0.1:5184", mode: "durable" },
      fetchImpl,
      request,
    });

    expect(state).toMatchObject({
      diagnostics: [{ code: "API_DURABLE_FACADE_REQUIRED" }],
      source: "api_runtime",
      status: "error",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(state.verification).toBeUndefined();
    expect(state.eligibility).toBeUndefined();
  });

  it("fails safely when seeded preview task verification fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response({
      error: {
        code: "INVALID_REQUEST",
        message: "raw signature and private key were rejected",
      },
      ok: false,
      traceId: "trace-verify-failed",
    }, { ok: false, status: 400, traceId: "trace-verify-failed" })) as unknown as UserParticipationApiFetch;

    const state = await submitUserParticipationApiReview({
      config: { ...explicitPreviewConfig, baseUrl: "http://127.0.0.1:5184" },
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
      config: { ...explicitPreviewConfig, baseUrl: "http://127.0.0.1:5184" },
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
      config: {
        ...explicitPreviewConfig,
        baseUrl: "http://127.0.0.1:5184",
        timeoutMs: 250,
      },
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
        "Authorization: Bearer abc.def.ghi seed phrase private key raw signature provider payload stack trace https://secret.example/raw?token=secret /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/evidence?token=secret",
      ).toLowerCase(),
    ).not.toMatch(/bearer abc|seed phrase|private key|raw signature|provider payload|stack trace|campaign-os-kitty|token=secret/);
  });

  it("sanitizes cyclic unknown values and generic service paths without throwing", () => {
    const cyclic: Record<string, unknown> = {
      path: "/Users/example/private/report.json",
      service: "postgresql://user:secret@localhost/campaign",
      token: "token=secret-value",
    };
    cyclic.self = cyclic;

    expect(() => sanitizeUserParticipationApiText(cyclic)).not.toThrow();
    const sanitized = sanitizeUserParticipationApiText(cyclic).toLowerCase();

    expect(sanitized).not.toMatch(/secret-value|postgresql:\/\/|\/users\/example/);
  });
});
