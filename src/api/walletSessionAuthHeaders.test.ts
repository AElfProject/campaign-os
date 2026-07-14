import { describe, expect, it } from "vitest";
import type { NormalizedWalletSession } from "../domain/types";
import {
  createWalletSessionAuthHeaders,
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

describe("wallet session auth headers", () => {
  it("derives all Participant authority headers and preserves Base58 case", () => {
    const result = createWalletSessionAuthHeaders(session({
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
      ok: true,
    });
    expect(result.ok && result.headers["x-campaign-os-wallet-address"])
      .not.toBe("2f4xyzab9mqcaseexact");
  });

  it("prefers issued proof status and safely derives a missing proof status", () => {
    const stale = createWalletSessionAuthHeaders(session({
      proof: {
        diagnosticCodes: [],
        liveVerificationExecuted: false,
        proofType: "wallet_signature",
        status: "stale",
        trustLevel: "untrusted",
      },
      verificationStatus: "verified",
    }));
    const derived = createWalletSessionAuthHeaders(session({ proof: undefined }));

    expect(stale.ok && stale.headers["x-campaign-os-proof-status"]).toBe("stale");
    expect(derived.ok && derived.headers["x-campaign-os-proof-status"]).toBe("verified");
  });

  it.each([
    ["AGENT_SKILL source", { walletSource: "AGENT_SKILL" }],
    ["internal capability", { capabilities: ["SIGN_MESSAGE", "INTERNAL_AUTOMATION"] }],
  ])("keeps %s within the internal credential boundary", (_name, overrides) => {
    const result = createWalletSessionAuthHeaders(session(overrides as Partial<NormalizedWalletSession>));

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
    const result = createWalletSessionAuthHeaders(session(overrides as Partial<NormalizedWalletSession>));

    expect(result).toEqual({
      code: "WALLET_SESSION_AUTH_INVALID",
      field,
      ok: false,
    });
  });

  it("is total for opaque and cyclic input without leaking session internals", () => {
    const cyclic: Record<string, unknown> = { sessionId: "secret-session" };
    cyclic.self = cyclic;

    const result = createWalletSessionAuthHeaders(cyclic as never);
    const serialized = JSON.stringify(result).toLowerCase();

    expect(result).toMatchObject({ code: "WALLET_SESSION_AUTH_INVALID", ok: false });
    expect(serialized).not.toMatch(/secret-session|signature|publickey|issuer-ref|token|statusmessage/);
  });

  it("rejects malformed proof metadata with only a safe field diagnostic", () => {
    const result = createWalletSessionAuthHeaders(session({
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
    expect(createWalletSessionAuthHeaders(session({ issuer }))).toEqual({
      code: "WALLET_SESSION_AUTH_INVALID",
      field: "session.issuer",
      ok: false,
    });
  });

  it("rejects custom authority header collisions while merging safe transport headers", () => {
    const auth = createWalletSessionAuthHeaders(session());
    expect(auth.ok).toBe(true);
    if (!auth.ok) {
      throw new Error("Expected valid auth fixture");
    }

    const merged = mergeWalletSessionAuthHeaders(auth.headers, {
      accept: "application/json",
      "content-type": "application/json",
      "x-campaign-os-trace-id": "trace-participant",
    });
    const conflict = mergeWalletSessionAuthHeaders(auth.headers, {
      "X-Campaign-OS-Roles": "project_owner,admin",
    });

    expect(merged).toMatchObject({
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-campaign-os-roles": "participant",
        "x-campaign-os-trace-id": "trace-participant",
      },
      ok: true,
    });
    expect(conflict).toEqual({
      code: "WALLET_SESSION_AUTH_HEADER_CONFLICT",
      field: "x-campaign-os-roles",
      ok: false,
    });
    expect(protectedWalletSessionAuthHeaderNames).toContain("x-campaign-os-wallet-address");
  });
});
