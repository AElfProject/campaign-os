import { describe, expect, it } from "vitest";
import { issueLocalSessionArtifact } from "./sessionIssuer";
import { verifyWalletProofLocally } from "./walletProofVerifier";

const issuedAt = "2026-07-07T04:00:00.000Z";
const forbiddenFragments = [
  "bearer issuer-token",
  "jwt-secret-value",
  "private-key-value",
  "raw-signature-value",
  "signed-cookie-value",
];

const expectNoForbiddenFragments = (value: unknown) => {
  const serialized = JSON.stringify(value).toLowerCase();

  for (const fragment of forbiddenFragments) {
    expect(serialized).not.toContain(fragment);
  }
};

describe("local session issuer", () => {
  it("issues an opaque local session reference without JWT or cookie signing", () => {
    const proofResult = verifyWalletProofLocally({
      address: "ELF_session",
      chainId: "AELF",
      network: "mainnet",
      nonce: "nonce-session",
      now: issuedAt,
      proofIssuedAt: issuedAt,
      signaturePresent: true,
      walletSourceHint: "PORTKEY_AA",
    });
    const result = issueLocalSessionArtifact({
      issuedAt,
      proofResult,
      sessionId: "sess-local-001",
      ttlSeconds: 600,
    });

    expect(result).toMatchObject({
      artifactType: "local_session_reference",
      cookieIssued: false,
      diagnosticCodes: [],
      diagnostics: [],
      expiresAt: "2026-07-07T04:10:00.000Z",
      issuerMode: "local_opaque",
      issuedAt,
      jwtIssued: false,
      liveSigningExecuted: false,
      proofStatus: "verified",
      referenceId: "local-session-ref:sess-local-001:2026-07-07T04:00:00.000Z",
      sessionId: "sess-local-001",
      ttlSeconds: 600,
      valid: true,
    });
  });

  it("fails closed for production-required issuing without dependencies", () => {
    const result = issueLocalSessionArtifact({
      issuedAt,
      productionRequired: true,
      sessionId: "sess-prod",
    });

    expect(result).toMatchObject({
      cookieIssued: false,
      issuerMode: "production_blocked",
      jwtIssued: false,
      liveSigningExecuted: false,
      productionReadiness: {
        blockedDependencyIds: [
          "live_wallet_proof_verifier",
          "session_signing_key",
          "secret_manager",
          "production_session_store",
        ],
        liveVerifierReady: false,
        productionSessionStoreReady: false,
        secretManagerReady: false,
        signingKeyReady: false,
      },
      valid: false,
    });
    expect(result.diagnosticCodes).toContain("AUTH_ISSUER_PRODUCTION_BLOCKED");
  });

  it("preserves blocked proof state", () => {
    const proofResult = verifyWalletProofLocally({
      address: "ELF_blocked",
      chainId: "ETH",
      network: "unknown",
      nonce: "nonce-blocked",
      now: issuedAt,
      proofIssuedAt: issuedAt,
      signaturePresent: true,
    });
    const result = issueLocalSessionArtifact({
      issuedAt,
      proofResult,
      sessionId: "sess-blocked",
    });

    expect(proofResult.status).toBe("blocked");
    expect(result).toMatchObject({
      issuerMode: "production_blocked",
      proofStatus: "blocked",
      valid: false,
    });
    expect(result.diagnosticCodes).toContain("AUTH_ISSUER_PROOF_BLOCKED");
  });

  it("reports invalid ttl but keeps the local issuer deterministic", () => {
    const result = issueLocalSessionArtifact({
      issuedAt,
      sessionId: "sess-invalid-ttl",
      ttlSeconds: -1,
    });

    expect(result).toMatchObject({
      expiresAt: "2026-07-07T05:00:00.000Z",
      issuerMode: "local_opaque",
      ttlSeconds: 3600,
      valid: true,
    });
    expect(result.diagnosticCodes).toContain("AUTH_ISSUER_TTL_INVALID");
  });

  it("requires a session id before issuing a reference", () => {
    const result = issueLocalSessionArtifact({ issuedAt });

    expect(result).toMatchObject({
      issuerMode: "production_blocked",
      sessionId: "",
      valid: false,
    });
    expect(result.diagnosticCodes).toContain("AUTH_ISSUER_SESSION_ID_MISSING");
  });

  it("redacts sensitive issuer input and never returns raw token material", () => {
    const result = issueLocalSessionArtifact({
      issuedAt,
      observedInput: {
        authorization: "Bearer issuer-token",
        jwt: "jwt-secret-value",
        nested: {
          privateKey: "private-key-value",
          rawSignature: "raw-signature-value",
          signedCookie: "signed-cookie-value",
        },
      },
      sessionId: "sess-redacted",
    });

    expect(result.redaction).toMatchObject({
      redactedFieldCount: 5,
      redactionApplied: true,
    });
    expect(result.diagnosticCodes).toContain("AUTH_ISSUER_SENSITIVE_INPUT_REDACTED");
    expectNoForbiddenFragments(result);
  });

  it("redacts secret-like issuer values even when field names are benign", () => {
    const result = issueLocalSessionArtifact({
      issuedAt,
      observedInput: {
        callback: "https://storage.invalid/session?token=jwt-secret-value",
        memo: "Bearer issuer-token",
        nested: {
          note: "raw-signature-value",
        },
      },
      sessionId: "sess-value-redacted",
    });

    expect(result.redaction).toMatchObject({
      redactedFieldCount: 3,
      redactionApplied: true,
    });
    expect(result.redaction.safePreview).toMatchObject({
      callback: "[redacted-sensitive]",
      memo: "[redacted-sensitive]",
      nested: {
        note: "[redacted-sensitive]",
      },
    });
    expect(result.diagnosticCodes).toContain("AUTH_ISSUER_SENSITIVE_INPUT_REDACTED");
    expectNoForbiddenFragments(result);
  });

  it("keeps issuer creation side-effect-free and quick", () => {
    const start = performance.now();

    for (let index = 0; index < 100; index += 1) {
      issueLocalSessionArtifact({
        issuedAt,
        sessionId: `sess-${index}`,
      });
    }

    expect(performance.now() - start).toBeLessThan(50);
  });
});
