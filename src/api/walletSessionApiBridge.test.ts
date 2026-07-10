import { describe, expect, it, vi } from "vitest";
import {
  createWalletSessionApiLoadingState,
  createWalletSessionApiSeededFallbackState,
  sanitizeWalletSessionApiText,
  submitWalletSessionApiPreview,
  type WalletSessionApiFetch,
  type WalletSessionPreviewRequest,
} from "./walletSessionApiBridge";

const request: WalletSessionPreviewRequest = {
  adapterName: "PortkeyDiscoverWallet",
  fixtureId: "sess-eoa-app-001",
  proofEvaluatedAt: "2026-07-07T04:00:00.000Z",
  proofIssuedAt: "2026-07-07T03:59:00.000Z",
  signature: "raw-route-signature",
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

const walletSessionPayload = () => ({
  accountType: "EOA",
  address: "8A2...1eF",
  capabilities: ["SIGN_MESSAGE", "CONTRACT_VIEW"],
  chainId: "AELF",
  connectedAt: "2026-06-21T08:00:00.000Z",
  displayAddress: "8A2...1eF",
  id: "sess-eoa-app-001",
  issuer: {
    artifactType: "local_session_reference",
    cookieIssued: false,
    diagnosticCodes: ["AUTH_ISSUER_LOCAL_ONLY"],
    issuerMode: "local_opaque",
    jwtIssued: false,
    liveSigningExecuted: false,
    referenceId: "session-ref:sess-eoa-app-001",
    ttlSeconds: 1800,
    valid: true,
  },
  lastSeenAt: "2026-07-07T04:00:00.000Z",
  network: "mainnet",
  normalUserRecommended: true,
  productionReadiness: {
    blockedDependencyIds: ["live_wallet_proof_verifier", "session_signing_key"],
    liveSigningReady: false,
    liveVerifierReady: false,
    productionReady: false,
    productionRequired: true,
    productionSessionStoreReady: false,
    secretManagerReady: false,
    signingKeyReady: false,
  },
  proof: {
    diagnosticCodes: ["AUTH_PROOF_SENSITIVE_INPUT_REDACTED"],
    liveVerificationExecuted: false,
    proofType: "wallet_signature",
    status: "verified",
    trustLevel: "verified_local",
  },
  sessionId: "sess-eoa-app-001",
  signatureStatus: "signed",
  statusMessage: {
    "en-US": "Wallet type verified",
    "zh-CN": "钱包类型已验证",
    "zh-TW": "錢包類型已驗證",
  },
  verificationStatus: "verified",
  walletName: "Portkey EOA App / Discover",
  walletSource: "PORTKEY_EOA_APP",
  walletTypeVerified: true,
});

const envelope = (payload: unknown, traceId = "trace-wallet-envelope") => ({
  data: {
    boundary: {
      "en-US": "Local wallet session route only.",
      "zh-CN": "仅本地钱包会话 route。",
      "zh-TW": "僅本地錢包會話 route。",
    },
    payload,
    walletSessionRepository: {
      adapterId: "wallet-session-deterministic-adapter",
      created: true,
      recordId: "wallet-session:sess-eoa-app-001",
      repositoryId: "wallet-session-repository-runtime",
      sessionId: "sess-eoa-app-001",
      storeId: "wallet-sessions",
      upserted: true,
      walletAddress: "8A2...1eF",
    },
  },
  ok: true,
  traceId,
});

describe("wallet session API bridge", () => {
  it("creates loading and seeded fallback states without touching the network", () => {
    expect(createWalletSessionApiLoadingState(request)).toMatchObject({
      configured: true,
      loading: true,
      request: expect.objectContaining({
        fixtureId: "sess-eoa-app-001",
      }),
      source: "loading",
      status: "loading",
    });

    expect(createWalletSessionApiSeededFallbackState(request)).toMatchObject({
      configured: false,
      diagnostics: [{ code: "API_BASE_URL_MISSING", severity: "info" }],
      loading: false,
      session: {
        sessionId: "sess-eoa-app-001",
        walletSource: "PORTKEY_EOA_APP",
      },
      source: "seeded_fallback",
      status: "fallback",
    });
    expect(createWalletSessionApiLoadingState(request).boundary["en-US"]).toContain("Local wallet session API bridge");
  });

  it("treats missing API config as seeded fallback and does not fetch", async () => {
    const fetchImpl = vi.fn() as unknown as WalletSessionApiFetch;

    const state = await submitWalletSessionApiPreview({
      config: { baseUrl: "   " },
      fetchImpl,
      request,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(state).toMatchObject({
      configured: false,
      diagnostics: [{ code: "API_BASE_URL_MISSING", severity: "info" }],
      session: {
        sessionId: "sess-eoa-app-001",
      },
      source: "seeded_fallback",
      status: "fallback",
    });
  });

  it("redacts malformed config and token query fragments from diagnostics", async () => {
    const state = await submitWalletSessionApiPreview({
      config: {
        baseUrl: "ftp://api.invalid/path?token=sample-token&api_key=private-key-sample",
      },
      fetchImpl: vi.fn() as unknown as WalletSessionApiFetch,
      request,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
      configured: true,
      diagnostics: [{ code: "API_BASE_URL_INVALID", severity: "warning" }],
      source: "error_fallback",
      status: "error",
    });
    for (const unsafe of ["token=sample-token", "api_key", "private-key", "private key"]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("creates an API-backed wallet session with trace, proof, issuer, and repository metadata", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(
      envelope(walletSessionPayload(), "trace-wallet-envelope"),
      { traceId: "trace-wallet-header" },
    )) as unknown as WalletSessionApiFetch;

    const state = await submitWalletSessionApiPreview({
      config: {
        baseUrl: "http://127.0.0.1:5184/",
        headers: { "x-campaign-os-roles": "project_owner" },
        tracePrefix: "wallet-review",
      },
      fetchImpl,
      request,
    });

    expect(state).toMatchObject({
      configured: true,
      diagnostics: [],
      loading: false,
      repository: {
        adapterId: "wallet-session-deterministic-adapter",
        created: true,
        recordId: "wallet-session:sess-eoa-app-001",
        repositoryId: "wallet-session-repository-runtime",
        sessionId: "sess-eoa-app-001",
        storeId: "wallet-sessions",
        upserted: true,
        walletAddress: "8A2...1eF",
      },
      session: {
        issuer: {
          issuerMode: "local_opaque",
          liveSigningExecuted: false,
        },
        proof: {
          liveVerificationExecuted: false,
          status: "verified",
          trustLevel: "verified_local",
        },
        productionReadiness: {
          productionReady: false,
        },
        sessionId: "sess-eoa-app-001",
        walletSource: "PORTKEY_EOA_APP",
      },
      source: "api_runtime",
      status: "connected",
      traceId: "trace-wallet-header",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:5184/api/wallet/session",
      expect.objectContaining({
        body: JSON.stringify(request),
        headers: expect.objectContaining({
          accept: "application/json",
          "content-type": "application/json",
          "x-campaign-os-roles": "project_owner",
          "x-campaign-os-trace-id": expect.stringMatching(/^wallet-review-wallet-session-/),
        }),
        method: "POST",
      }),
    );
  });

  it("normalizes repository metadata from flattened runtime envelopes", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response({
      data: {
        payload: walletSessionPayload(),
      },
      ok: true,
      traceId: "trace-wallet-flat",
      walletSessionRepository: {
        recordId: "wallet-session:sess-eoa-app-001",
        repositoryId: "wallet-session-repository-runtime",
        sessionId: "sess-eoa-app-001",
        storeId: "wallet-sessions",
        upserted: true,
        walletAddress: "8A2...1eF",
      },
    })) as unknown as WalletSessionApiFetch;

    const state = await submitWalletSessionApiPreview({
      config: { baseUrl: "http://127.0.0.1:5184/" },
      fetchImpl,
      request,
    });

    expect(state).toMatchObject({
      repository: {
        recordId: "wallet-session:sess-eoa-app-001",
        repositoryId: "wallet-session-repository-runtime",
      },
      source: "api_runtime",
      status: "connected",
      traceId: "trace-wallet-flat",
    });
  });

  it("keeps error fallback when wallet session creation fails with unsafe details", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response({
      error: {
        code: "PERSISTENCE_UNAVAILABLE",
        message: "provider payload used raw signature and private key in /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/evidence/raw",
      },
      ok: false,
      traceId: "trace-wallet-failed",
    }, { ok: false, status: 503, traceId: "trace-wallet-failed" })) as unknown as WalletSessionApiFetch;

    const state = await submitWalletSessionApiPreview({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl,
      request,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
      diagnostics: [{
        code: "API_WALLET_SESSION_FAILED",
        safeDetails: {
          endpoint: "/api/wallet/session",
          status: 503,
        },
      }],
      session: undefined,
      source: "error_fallback",
      status: "error",
      traceId: "trace-wallet-failed",
    });
    expect(serialized).not.toContain("provider payload");
    expect(serialized).not.toContain("raw signature");
    expect(serialized).not.toContain("private key");
    expect(serialized).not.toContain("campaign-os-kitty");
  });

  it("falls back safely when the wallet session payload shape is invalid", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response({
      data: {
        payload: {
          accountType: "EOA",
          sessionId: "sess-invalid",
        },
      },
      ok: true,
      traceId: "trace-invalid-wallet",
    })) as unknown as WalletSessionApiFetch;

    const state = await submitWalletSessionApiPreview({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl,
      request,
    });

    expect(state).toMatchObject({
      diagnostics: [{ code: "API_RESPONSE_INVALID" }],
      session: undefined,
      source: "error_fallback",
      status: "error",
      traceId: "trace-invalid-wallet",
    });
  });

  it("returns a sanitized timeout diagnostic when the request is aborted", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new DOMException(
        "Request aborted with bearer token sample-token, password=secret, seed phrase sample, raw-signature, signed URL, object key, and stack trace.",
        "AbortError",
      );
    }) as unknown as WalletSessionApiFetch;

    const state = await submitWalletSessionApiPreview({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl,
      request,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
      diagnostics: [{ code: "API_REQUEST_TIMEOUT" }],
      session: undefined,
      source: "error_fallback",
      status: "error",
    });
    for (const unsafe of ["bearer token", "password", "seed phrase", "raw-signature", "sample-token", "signed url", "object key", "stack trace"]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("redacts standalone unsafe text fragments", () => {
    expect(
      sanitizeWalletSessionApiText(
        "api key and token=abc123 in /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/evidence/raw were removed",
      ),
    ).toBe("redacted credential and redacted query credential in redacted private path were removed");
  });
});
