import { describe, expect, it } from "vitest";
import {
  defaultWalletProofMaxAgeSeconds,
  verifyWalletProofLocally,
} from "./walletProofVerifier";

const now = "2026-07-07T04:00:00.000Z";
const issuedAt = "2026-07-07T03:59:00.000Z";
const forbiddenFragments = [
  "bearer secret-token",
  "raw-signature-value",
  "private-key-value",
  "seed phrase words",
  "https://storage.invalid/signed-url",
];

const expectNoForbiddenFragments = (value: unknown) => {
  const serialized = JSON.stringify(value).toLowerCase();

  for (const fragment of forbiddenFragments) {
    expect(serialized).not.toContain(fragment);
  }
};

describe("local wallet proof verifier", () => {
  it("verifies local wallet signature metadata without live verification", () => {
    const result = verifyWalletProofLocally({
      accountTypeHint: "EOA",
      address: "ELF_2YVwLocalProof",
      adapterName: "PortkeyDiscoverWallet",
      chainId: "AELF",
      network: "mainnet",
      nonce: "nonce-001",
      now,
      proofIssuedAt: issuedAt,
      signaturePresent: true,
      walletSourceHint: "PORTKEY_EOA_APP",
    });

    expect(result).toMatchObject({
      accountType: "EOA",
      address: "ELF_2YVwLocalProof",
      chainId: "AELF",
      diagnostics: [],
      freshness: {
        ageSeconds: 60,
        expiresAt: "2026-07-07T04:04:00.000Z",
        issuedAt,
        maxAgeSeconds: defaultWalletProofMaxAgeSeconds,
        stale: false,
      },
      liveVerificationExecuted: false,
      proofType: "wallet_signature",
      status: "verified",
      trustLevel: "verified_local",
      walletSource: "PORTKEY_EOA_APP",
      network: "mainnet",
    });
  });

  it("downgrades address-only input and missing nonce to proof required", () => {
    const result = verifyWalletProofLocally({
      address: "ELF_address_only",
      chainId: "AELF",
      network: "mainnet",
      proofType: "address_only",
      signaturePresent: false,
    });

    expect(result).toMatchObject({
      proofType: "address_only",
      status: "proof_required",
      trustLevel: "untrusted",
    });
    expect(result.diagnostics.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "AUTH_PROOF_ADDRESS_ONLY",
        "AUTH_PROOF_NONCE_MISSING",
        "AUTH_PROOF_ISSUED_AT_MISSING",
      ]),
    );
  });

  it("marks missing signatures as signature_unverified", () => {
    const result = verifyWalletProofLocally({
      address: "ELF_missing_signature",
      chainId: "AELF",
      network: "mainnet",
      nonce: "nonce-002",
      now,
      proofIssuedAt: issuedAt,
      signaturePresent: false,
    });

    expect(result.status).toBe("signature_unverified");
    expect(result.trustLevel).toBe("untrusted");
    expect(result.diagnostics.map((item) => item.code)).toContain("AUTH_PROOF_SIGNATURE_MISSING");
  });

  it("marks proofs outside the freshness window as stale", () => {
    const result = verifyWalletProofLocally({
      address: "ELF_stale",
      chainId: "AELF",
      maxAgeSeconds: 300,
      network: "mainnet",
      nonce: "nonce-003",
      now,
      proofIssuedAt: "2026-07-07T03:50:00.000Z",
      signaturePresent: true,
    });

    expect(result).toMatchObject({
      status: "stale",
      trustLevel: "untrusted",
      freshness: {
        ageSeconds: 600,
        stale: true,
      },
    });
    expect(result.diagnostics.map((item) => item.code)).toContain("AUTH_PROOF_STALE");
  });

  it("keeps agent credentials internal only", () => {
    const result = verifyWalletProofLocally({
      accountTypeHint: "EOA",
      address: "ELF_agent",
      chainId: "tDVV",
      network: "testnet",
      nonce: "nonce-agent",
      now,
      proofIssuedAt: issuedAt,
      proofType: "agent_context",
      signaturePresent: true,
      walletSourceHint: "AGENT_SKILL",
    });

    expect(result).toMatchObject({
      proofType: "agent_context",
      status: "proof_required",
      trustLevel: "internal_only",
      walletSource: "AGENT_SKILL",
    });
    expect(result.diagnostics.map((item) => item.code)).toContain("AUTH_PROOF_AGENT_CREDENTIAL_BOUNDARY");
  });

  it("fails closed for production-required verification without live dependencies", () => {
    const result = verifyWalletProofLocally({
      address: "ELF_prod",
      chainId: "AELF",
      network: "mainnet",
      nonce: "nonce-prod",
      now,
      productionRequired: true,
      proofIssuedAt: issuedAt,
      signaturePresent: true,
    });

    expect(result).toMatchObject({
      liveVerificationExecuted: false,
      productionReadiness: {
        blockedDependencyIds: ["live_wallet_proof_verifier", "auth_nonce_store"],
        liveVerifierReady: false,
        nonceStoreReady: false,
        required: true,
      },
      status: "blocked",
      trustLevel: "blocked",
    });
    expect(result.diagnostics.map((item) => item.code)).toContain("AUTH_PROOF_PRODUCTION_BLOCKED");
  });

  it("redacts sensitive observed proof input", () => {
    const result = verifyWalletProofLocally({
      address: "ELF_redacted",
      chainId: "AELF",
      network: "mainnet",
      nonce: "nonce-redacted",
      now,
      observedInput: {
        authorization: "Bearer secret-token",
        nested: {
          privateKey: "private-key-value",
          rawSignature: "raw-signature-value",
          signedUrl: "https://storage.invalid/signed-url",
        },
        seedPhrase: "seed phrase words",
      },
      proofIssuedAt: issuedAt,
      signature: "raw-signature-value",
    });

    expect(result.redaction).toMatchObject({
      redactedFieldCount: 5,
      redactionApplied: true,
    });
    expect(result.diagnostics.map((item) => item.code)).toContain("AUTH_PROOF_SENSITIVE_INPUT_REDACTED");
    expectNoForbiddenFragments(result);
  });

  it("blocks unsupported chain and network without side effects", () => {
    const result = verifyWalletProofLocally({
      address: "ELF_wrong_chain",
      chainId: "ETH",
      network: "unknown",
      nonce: "nonce-004",
      now,
      proofIssuedAt: issuedAt,
      signaturePresent: true,
    });

    expect(result.status).toBe("blocked");
    expect(result.liveVerificationExecuted).toBe(false);
    expect(result.diagnostics.map((item) => item.code)).toEqual(
      expect.arrayContaining(["AUTH_PROOF_CHAIN_UNSUPPORTED", "AUTH_PROOF_NETWORK_UNSUPPORTED"]),
    );
  });
});
