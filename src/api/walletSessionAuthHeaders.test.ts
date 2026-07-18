import { describe, expect, it } from "vitest";
import type { NormalizedWalletSession } from "../domain/types";
import {
  createDeprecatedPreviewWalletSessionAuthHeaders,
  createWalletSessionAuthHeaders,
  deprecatedNonLivePreviewWalletSessionAuthConfiguration,
  mergeDeprecatedPreviewWalletSessionAuthHeaders,
  mergeWalletSessionAuthHeaders,
  protectedWalletSessionAuthHeaderNames,
} from "./walletSessionAuthHeaders";

const session = (
  overrides: Partial<NormalizedWalletSession> = {},
): NormalizedWalletSession => ({
  accountType: "EOA",
  address: "2F4xYZaB9mQCaseExact",
  capabilities: ["SIGN_MESSAGE", "CONTRACT_VIEW"],
  chainId: "AELF",
  connectedAt: "2026-07-14T00:00:00.000Z",
  displayAddress: "2F4x...Exact",
  id: "wallet-session-participant",
  issuer: {
    artifactType: "local_session_reference",
    cookieIssued: false,
    diagnosticCodes: [],
    issuerMode: "local_opaque",
    jwtIssued: false,
    liveSigningExecuted: false,
    referenceId: "issuer-ref-participant",
    ttlSeconds: 900,
    valid: true,
  },
  lastSeenAt: "2026-07-14T00:00:00.000Z",
  network: "testnet",
  normalUserRecommended: true,
  proof: {
    diagnosticCodes: [],
    liveVerificationExecuted: false,
    proofType: "wallet_signature",
    status: "verified",
    trustLevel: "verified_local",
  },
  sessionId: "sess-participant-issued",
  signatureStatus: "signed",
  statusMessage: { "en-US": "Connected", "zh-CN": "Connected" },
  verificationStatus: "verified",
  walletName: "Portkey EOA",
  walletSource: "PORTKEY_EOA_EXTENSION",
  walletTypeVerified: true,
  ...overrides,
});

const createPreviewAuthHeaders = (
  value: NormalizedWalletSession | unknown,
  requestedRole: "participant" | "review_operator" = "participant",
) => createDeprecatedPreviewWalletSessionAuthHeaders(
  value,
  deprecatedNonLivePreviewWalletSessionAuthConfiguration,
  requestedRole,
);

const mergePreviewAuthHeaders = (
  authHeaders: Parameters<typeof mergeDeprecatedPreviewWalletSessionAuthHeaders>[0],
  customHeaders?: HeadersInit,
  additionalProtectedHeaderNames: readonly string[] = [],
) => mergeDeprecatedPreviewWalletSessionAuthHeaders(
  authHeaders,
  deprecatedNonLivePreviewWalletSessionAuthConfiguration,
  customHeaders,
  additionalProtectedHeaderNames,
);

describe("wallet session auth headers", () => {
  it("fails closed through the legacy constructor instead of creating live credentials", () => {
    expect(createWalletSessionAuthHeaders(session())).toEqual({
      code: "WALLET_SESSION_AUTH_PREVIEW_CONFIGURATION_REQUIRED",
      field: "previewConfiguration",
      ok: false,
    });
  });

  it("fails closed through the legacy merge boundary", () => {
    const previewAuth = createPreviewAuthHeaders(session());
    expect(previewAuth.ok).toBe(true);
    if (!previewAuth.ok) {
      throw new Error("Expected valid preview auth fixture");
    }

    expect(mergeWalletSessionAuthHeaders(previewAuth.headers)).toEqual({
      code: "WALLET_SESSION_AUTH_PREVIEW_CONFIGURATION_REQUIRED",
      field: "previewConfiguration",
      ok: false,
    });
  });

  it("rejects live or structurally copied configuration at the explicit preview boundary", () => {
    const copiedPreviewConfiguration = {
      ...deprecatedNonLivePreviewWalletSessionAuthConfiguration,
    };

    for (const previewConfiguration of [
      {
        authorityMode: "durable_cookie_session",
        liveCredential: true,
        runtimeMode: "live",
      },
      copiedPreviewConfiguration,
    ]) {
      expect(createDeprecatedPreviewWalletSessionAuthHeaders(
        session(),
        previewConfiguration as never,
      )).toEqual({
        code: "WALLET_SESSION_AUTH_PREVIEW_CONFIGURATION_REQUIRED",
        field: "previewConfiguration",
        ok: false,
      });
    }
  });

  it("derives all Participant authority headers and preserves Base58 case", () => {
    const result = createPreviewAuthHeaders(session({
      accountType: " EOA " as never,
      address: "  2F4xYZaB9mQCaseExact  ",
      sessionId: "  sess-participant-issued  ",
      walletSource: " PORTKEY_EOA_EXTENSION " as never,
    }));

    expect(result).toEqual({
      headers: {
        "x-campaign-os-account-type": "EOA",
        "x-campaign-os-credential-boundary": "ordinary_user_wallet",
        "x-campaign-os-proof-status": "verified",
        "x-campaign-os-roles": "participant",
        "x-campaign-os-session-id": "sess-participant-issued",
        "x-campaign-os-wallet-address": "2F4xYZaB9mQCaseExact",
        "x-campaign-os-wallet-source": "PORTKEY_EOA_EXTENSION",
      },
      authorityMode: "deprecated_non_live_preview",
      liveCredential: false,
      ok: true,
    });
    expect(result.ok && result.headers["x-campaign-os-wallet-address"])
      .not.toBe("2f4xyzab9mqcaseexact");
  });

  it("requests the typed review operator role without changing issued identity", () => {
    const result = createPreviewAuthHeaders(session(), "review_operator");

    expect(result).toMatchObject({
      authorityMode: "deprecated_non_live_preview",
      headers: {
        "x-campaign-os-credential-boundary": "ordinary_user_wallet",
        "x-campaign-os-roles": "review_operator",
        "x-campaign-os-session-id": "sess-participant-issued",
        "x-campaign-os-wallet-address": "2F4xYZaB9mQCaseExact",
      },
      liveCredential: false,
      ok: true,
    });
  });

  it("rejects an opaque requested role at runtime", () => {
    const result = createPreviewAuthHeaders(
      session(),
      "internal_operator" as never,
    );

    expect(result).toEqual({
      code: "WALLET_SESSION_AUTH_INVALID",
      field: "requestedRole",
      ok: false,
    });
  });

  it("prefers issued proof status and safely derives a missing proof status", () => {
    const stale = createPreviewAuthHeaders(session({
      proof: {
        diagnosticCodes: [],
        liveVerificationExecuted: false,
        proofType: "wallet_signature",
        status: "stale",
        trustLevel: "untrusted",
      },
      verificationStatus: "verified",
    }));
    const derived = createPreviewAuthHeaders(session({ proof: undefined }));

    expect(stale.ok && stale.headers["x-campaign-os-proof-status"]).toBe("stale");
    expect(derived.ok && derived.headers["x-campaign-os-proof-status"]).toBe("verified");
  });

  it.each([
    ["AGENT_SKILL source", { walletSource: "AGENT_SKILL" }],
    ["internal capability", { capabilities: ["SIGN_MESSAGE", "INTERNAL_AUTOMATION"] }],
  ])("keeps %s within the internal credential boundary", (_name, overrides) => {
    const result = createPreviewAuthHeaders(session(overrides as Partial<NormalizedWalletSession>));

    expect(result.ok && result.headers["x-campaign-os-credential-boundary"])
      .toBe("internal_agent_credential");
    expect(result.ok && result.headers["x-campaign-os-roles"]).toBe("participant");
  });

  it.each([
    ["session.sessionId", { sessionId: " " }],
    ["session.address", { address: "\n" }],
    ["session.accountType", { accountType: "ADMIN" }],
    ["session.walletSource", { walletSource: "INTERNAL_AUTOMATION" }],
  ])("returns a typed result for malformed %s", (field, overrides) => {
    const result = createPreviewAuthHeaders(session(overrides as Partial<NormalizedWalletSession>));

    expect(result).toEqual({
      code: "WALLET_SESSION_AUTH_INVALID",
      field,
      ok: false,
    });
  });

  it("is total for opaque and cyclic input without leaking session internals", () => {
    const cyclic: Record<string, unknown> = { sessionId: "secret-session" };
    cyclic.self = cyclic;

    const result = createPreviewAuthHeaders(cyclic as never);
    const serialized = JSON.stringify(result).toLowerCase();

    expect(result).toMatchObject({ code: "WALLET_SESSION_AUTH_INVALID", ok: false });
    expect(serialized).not.toMatch(/secret-session|signature|publickey|issuer-ref|token|statusmessage/);
  });

  it("rejects malformed proof metadata with only a safe field diagnostic", () => {
    const result = createPreviewAuthHeaders(session({
      proof: {
        diagnosticCodes: ["raw signature should not leak"],
        liveVerificationExecuted: false,
        proofType: "wallet_signature",
        status: "forged" as never,
        trustLevel: "verified_local",
      },
    }));

    expect(result).toEqual({
      code: "WALLET_SESSION_AUTH_INVALID",
      field: "session.proof.status",
      ok: false,
    });
  });

  it.each([
    ["missing", undefined],
    ["invalid", { ...session().issuer!, valid: false }],
  ])("rejects an %s issued-session boundary", (_name, issuer) => {
    expect(createPreviewAuthHeaders(session({ issuer }))).toEqual({
      code: "WALLET_SESSION_AUTH_INVALID",
      field: "session.issuer",
      ok: false,
    });
  });

  it.each([
    ["issuerMode", {
      issuer: { ...session().issuer!, issuerMode: "production_blocked" },
    }, "session.issuer.issuerMode"],
    ["issuer cookie", {
      issuer: { ...session().issuer!, cookieIssued: true },
    }, "session.issuer.cookieIssued"],
    ["issuer JWT", {
      issuer: { ...session().issuer!, jwtIssued: true },
    }, "session.issuer.jwtIssued"],
    ["issuer live signing", {
      issuer: { ...session().issuer!, liveSigningExecuted: true },
    }, "session.issuer.liveSigningExecuted"],
    ["missing proof", { proof: undefined }, "session.proof"],
    ["proofType", {
      proof: { ...session().proof!, proofType: "address_only" },
    }, "session.proof.proofType"],
    ["trustLevel", {
      proof: { ...session().proof!, trustLevel: "untrusted" },
    }, "session.proof.trustLevel"],
    ["proof status", {
      proof: { ...session().proof!, status: "stale" },
    }, "session.proof.status"],
    ["live proof verification", {
      proof: { ...session().proof!, liveVerificationExecuted: true },
    }, "session.proof.liveVerificationExecuted"],
    ["signatureStatus", { signatureStatus: "missing" }, "session.signatureStatus"],
    ["verificationStatus", {
      verificationStatus: "missing_signature",
    }, "session.verificationStatus"],
    ["walletTypeVerified", { walletTypeVerified: false }, "session.walletTypeVerified"],
    ["SIGN_MESSAGE capability", {
      capabilities: ["CONTRACT_VIEW"],
    }, "session.capabilities"],
    ["ordinary wallet credential", {
      capabilities: ["SIGN_MESSAGE", "INTERNAL_AUTOMATION"],
    }, "session.credentialBoundary"],
  ])("rejects invalid Admin %s authority", (_name, overrides, field) => {
    const result = createPreviewAuthHeaders(
      session(overrides as Partial<NormalizedWalletSession>),
      "review_operator",
    );

    expect(result).toEqual({
      code: "WALLET_SESSION_AUTH_INVALID",
      field,
      ok: false,
    });
  });

  it("rejects custom authority header collisions while merging safe transport headers", () => {
    const auth = createPreviewAuthHeaders(session());
    expect(auth.ok).toBe(true);
    if (!auth.ok) {
      throw new Error("Expected valid auth fixture");
    }

    const merged = mergePreviewAuthHeaders(auth.headers, {
      accept: "application/json",
      "content-type": "application/json",
      "x-campaign-os-trace-id": "trace-participant",
    });
    const conflict = mergePreviewAuthHeaders(auth.headers, {
      "X-Campaign-OS-Roles": "project_owner,admin",
    });

    expect(merged).toMatchObject({
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-campaign-os-roles": "participant",
        "x-campaign-os-trace-id": "trace-participant",
      },
      authorityMode: "deprecated_non_live_preview",
      liveCredential: false,
      ok: true,
    });
    expect(conflict).toEqual({
      code: "WALLET_SESSION_AUTH_HEADER_CONFLICT",
      field: "x-campaign-os-roles",
      ok: false,
    });
    expect(protectedWalletSessionAuthHeaderNames).toContain("x-campaign-os-wallet-address");
  });

  it("allows callers to protect operation-specific transport authority", () => {
    const auth = createPreviewAuthHeaders(session(), "review_operator");
    expect(auth.ok).toBe(true);
    if (!auth.ok) {
      throw new Error("Expected valid auth fixture");
    }

    const result = mergePreviewAuthHeaders(
      auth.headers,
      {
        "x-campaign-os-idempotency-key": "external-command-key",
        "x-campaign-os-trace-id": "external-trace",
      },
      ["x-campaign-os-idempotency-key", "x-campaign-os-trace-id"],
    );

    expect(result).toEqual({
      code: "WALLET_SESSION_AUTH_HEADER_CONFLICT",
      field: "x-campaign-os-idempotency-key",
      ok: false,
    });
  });

  it.each([
    ["X-Campaign-OS-Roles", "spoofed-role", "x-campaign-os-roles", []],
    ["X-Campaign-OS-Session-ID", "spoofed-session", "x-campaign-os-session-id", []],
    ["X-Campaign-OS-Wallet-Address", "spoofed-wallet", "x-campaign-os-wallet-address", []],
    ["X-Campaign-OS-Account-Type", "AA", "x-campaign-os-account-type", []],
    ["X-Campaign-OS-Wallet-Source", "OTHER", "x-campaign-os-wallet-source", []],
    ["X-Campaign-OS-Proof-Status", "verified", "x-campaign-os-proof-status", []],
    ["X-Campaign-OS-Credential-Boundary", "ordinary_user_wallet", "x-campaign-os-credential-boundary", []],
    ["Authorization", "Bearer secret", "authorization", []],
    ["Cookie", "session=secret", "cookie", []],
    ["X-Account-Type", "EOA", "x-account-type", []],
    ["X-Auth-Session-ID", "spoofed-session", "x-auth-session-id", []],
    ["X-Capabilities", "task:verify", "x-capabilities", []],
    ["X-Capability", "task:verify", "x-capability", []],
    ["X-Chain-ID", "AELF", "x-chain-id", []],
    ["X-Network", "mainnet", "x-network", []],
    ["X-Role", "review_operator", "x-role", []],
    ["X-Roles", "review_operator", "x-roles", []],
    ["X-Session-ID", "spoofed-session", "x-session-id", []],
    ["X-Campaign-OS-Trace-ID", "spoofed-trace", "x-campaign-os-trace-id", ["x-campaign-os-trace-id"]],
    ["Idempotency-Key", "spoofed-command", "idempotency-key", ["idempotency-key"]],
    ["X-Campaign-OS-Idempotency-Key", "spoofed-command", "x-campaign-os-idempotency-key", ["x-campaign-os-idempotency-key"]],
  ])(
    "rejects a case-insensitive custom %s authority collision",
    (name, value, field, additionalProtectedHeaderNames) => {
      const auth = createPreviewAuthHeaders(session(), "review_operator");
      expect(auth.ok).toBe(true);
      if (!auth.ok) {
        throw new Error("Expected valid auth fixture");
      }

      expect(mergePreviewAuthHeaders(
        auth.headers,
        { [name as string]: value as string },
        additionalProtectedHeaderNames as string[],
      )).toEqual({
        code: "WALLET_SESSION_AUTH_HEADER_CONFLICT",
        field,
        ok: false,
      });
    },
  );
});
