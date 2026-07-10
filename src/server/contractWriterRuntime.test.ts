import { describe, expect, it } from "vitest";
import { campaignDetail } from "../domain/fixtures";
import { createServerContractWriterRuntimeReadiness } from "./contractWriterRuntime";

describe("createServerContractWriterRuntimeReadiness", () => {
  it("creates campaign-scoped contract writer readiness without live side effects", () => {
    const readiness = createServerContractWriterRuntimeReadiness({
      campaign: campaignDetail,
      traceId: "trace-contract-writer-runtime-test",
    });

    expect(readiness).toMatchObject({
      campaignId: "camp-awaken-sprint",
      productionReady: false,
      source: "server_runtime",
      status: "blocked",
      traceId: "trace-contract-writer-runtime-test",
      valid: true,
    });
    expect(readiness.summary.contractGroupCount).toBe(4);
    expect(readiness.summary.operationCount).toBe(20);
    expect(readiness.configHandoff.requiredConfigKeys).toContain("CAMPAIGN_OS_CONTRACT_WRITER_SIGNER_POLICY_REF");
    expect(readiness.configHandoff.missingConfigKeys.length).toBeGreaterThan(0);
    expect(Object.values(readiness.noLiveSideEffects).every((value) => value === false)).toBe(true);
  });

  it("redacts server diagnostics before returning readiness", () => {
    const readiness = createServerContractWriterRuntimeReadiness({
      campaign: campaignDetail,
      diagnostics: [
        {
          code: "CONTRACT_WRITER_UNSAFE_DIAGNOSTIC_REDACTED",
          field: "server.contractWriter",
          message: "endpoint https://writer.invalid/send bearer server-secret-token",
          safeDetails: {
            providerPayload: "provider response { token: 'unsafe' }",
            signerSecret: "plain-secret-signer",
            stackTrace: "Error: leak\n    at server.contractWriter",
            walletSignature: "wallet-signature",
          },
          severity: "warning",
          source: "runtime",
        },
      ],
    });
    const serialized = JSON.stringify(readiness);

    expect(readiness.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "CONTRACT_WRITER_UNSAFE_DIAGNOSTIC_REDACTED",
    );
    expect(serialized).toContain("[REDACTED:ENDPOINT]");
    expect(serialized).toContain("[REDACTED:CREDENTIAL]");
    expect(serialized).toContain("[REDACTED:PRIVATE_KEY]");
    expect(serialized).toContain("[REDACTED:PROVIDER_PAYLOAD]");
    expect(serialized).toContain("[REDACTED:STACK]");
    expect(serialized).toContain("[REDACTED:WALLET_SIGNATURE]");
    expect(serialized).not.toContain("writer.invalid");
    expect(serialized).not.toContain("server-secret-token");
    expect(serialized).not.toContain("plain-secret-signer");
    expect(serialized).not.toContain("wallet-signature");
  });
});
