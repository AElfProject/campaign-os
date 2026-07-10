import { describe, expect, it } from "vitest";
import { campaignDetail } from "./fixtures";
import {
  contractWriterNoLiveSideEffects,
  createContractWriterRuntimeReadiness,
  sanitizeContractWriterRuntimeValue,
} from "./contractWriterRuntime";

describe("createContractWriterRuntimeReadiness", () => {
  it("creates deterministic local contract writer readiness", () => {
    const first = createContractWriterRuntimeReadiness({ campaign: campaignDetail });
    const second = createContractWriterRuntimeReadiness({ campaign: campaignDetail });

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      campaignId: campaignDetail.id,
      productionReady: false,
      source: "seeded_runtime",
      status: "blocked",
      valid: true,
    });
    expect(first.boundary["en-US"]).toContain("No live signer");
  });

  it("covers required companion contract operation groups", () => {
    const readiness = createContractWriterRuntimeReadiness({ campaign: campaignDetail });

    expect(readiness.operationCatalog.map((group) => group.contractName)).toEqual([
      "CampaignPointsLedgerV2",
      "CampaignRegistryV2",
      "EligibilityRootRegistryV2",
      "ReferralRegistryV2",
    ]);
    expect(readiness.summary.contractGroupCount).toBe(4);
    expect(readiness.summary.operationCount).toBe(20);
    expect(
      readiness.operationCatalog
        .find((group) => group.contractName === "CampaignRegistryV2")
        ?.operations.map((operation) => operation.methodName),
    ).toEqual([
      "CreateCampaign",
      "UpdateCampaignMetadata",
      "UpdateTaskConfigHash",
      "SetCampaignStatus",
      "SetWalletPolicy",
      "SetSupportedLocales",
      "TransferCampaignOwner",
      "PauseCampaign",
      "GetCampaign",
    ]);
    expect(readiness.operationCatalog.every((group) => group.phase === "P1")).toBe(true);
    expect(readiness.operationCatalog.every((group) => group.readiness === "review_required")).toBe(true);
  });

  it("fails closed when contract writer handoff is absent or partial", () => {
    const absent = createContractWriterRuntimeReadiness({ campaign: campaignDetail });
    const partial = createContractWriterRuntimeReadiness({
      campaign: campaignDetail,
      configHandoff: {
        endpointRef: "writer-endpoint-ref:aelf-contract-writer",
        signerPolicyRef: "signer-policy-ref:campaign-os-multisig",
      },
    });

    expect(absent.configHandoff).toMatchObject({
      status: "missing",
      productionReady: false,
    });
    expect(partial.configHandoff).toMatchObject({
      status: "partial",
      productionReady: false,
    });
    expect(absent.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "CONTRACT_WRITER_CONFIG_MISSING",
        "CONTRACT_WRITER_SIGNER_POLICY_MISSING",
        "CONTRACT_WRITER_LIVE_EXECUTION_DISABLED",
      ]),
    );
    expect(partial.diagnosticCodes).toContain("CONTRACT_WRITER_CONFIG_INCOMPLETE");
    expect(partial.status).toBe("blocked");
  });

  it("keeps all live side-effect flags false", () => {
    const readiness = createContractWriterRuntimeReadiness({ campaign: campaignDetail });

    expect(readiness.noLiveSideEffects).toEqual(contractWriterNoLiveSideEffects);
    expect(Object.values(readiness.noLiveSideEffects).every((value) => value === false)).toBe(true);
    expect(readiness.operationCatalog.flatMap((group) => group.operations).every((operation) => {
      return operation.liveWriteEnabled === false
        && operation.requiresSignerPolicy
        && operation.requiresOperatorApproval
        && operation.requiresIdempotency;
    })).toBe(true);
  });

  it("enters review_required only when all handoff references exist", () => {
    const readiness = createContractWriterRuntimeReadiness({
      campaign: campaignDetail,
      configHandoff: {
        abiPackageRef: "abi-ref:campaign-os-v2",
        endpointRef: "writer-endpoint-ref:aelf-contract-writer",
        idempotencyStoreRef: "idempotency-ref:contract-writer",
        liveEnablementRef: "enablement-ref:contract-writer-live-gate",
        observabilityRef: "observability-ref:contract-writer",
        operatorApprovalRef: "approval-ref:contract-ops",
        queueHandoffRef: "queue-ref:contract-writer",
        runbookRef: "runbook-ref:contract-writer",
        signerPolicyRef: "signer-policy-ref:campaign-os-multisig",
      },
    });

    expect(readiness.status).toBe("review_required");
    expect(readiness.configHandoff.status).toBe("ready_disabled");
    expect(readiness.configHandoff.missingConfigKeys).toEqual([]);
    expect(readiness.productionReady).toBe(false);
    expect(Object.values(readiness.noLiveSideEffects).every((value) => value === false)).toBe(true);
  });

  it("redacts hostile diagnostic values from serialized output", () => {
    const readiness = createContractWriterRuntimeReadiness({
      campaign: campaignDetail,
      diagnostics: [
        {
          code: "CONTRACT_WRITER_UNSAFE_DIAGNOSTIC_REDACTED",
          field: "writer.endpoint",
          message: "Bearer writer-secret-token hit https://writer.invalid/send?signature=unsafe fallback https://writer.invalid/status",
          safeDetails: {
            objectKey: "tenant/raw/contract-writes.json",
            path: "/Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/evidence/private.json",
            privateKey: "private key should never leak",
            providerPayload: "raw provider payload {\"token\":\"unsafe\"}",
            signerSecret: "plain-secret-signer",
            stack: "Error: boom\n    at contract.writer",
            walletSignature: "wallet-signature",
          },
          severity: "warning",
          source: "runtime",
        },
      ],
    });
    const serialized = JSON.stringify(readiness);

    expect(serialized).toContain("[REDACTED:CREDENTIAL]");
    expect(serialized).toContain("[REDACTED:ENDPOINT]");
    expect(serialized).toContain("[REDACTED:SIGNED_URL]");
    expect(serialized).toContain("[REDACTED:OBJECT_KEY]");
    expect(serialized).toContain("[REDACTED:PRIVATE_KEY]");
    expect(serialized).toContain("[REDACTED:PRIVATE_PATH]");
    expect(serialized).toContain("[REDACTED:PROVIDER_PAYLOAD]");
    expect(serialized).toContain("[REDACTED:STACK]");
    expect(serialized).toContain("[REDACTED:WALLET_SIGNATURE]");
    expect(serialized).not.toContain("writer-secret-token");
    expect(serialized).not.toContain("writer.invalid");
    expect(serialized).not.toContain("campaign-os-kitty");
    expect(serialized).not.toContain("contract-writes");
    expect(serialized).not.toContain("plain-secret-signer");
    expect(serialized).not.toContain("wallet-signature");
  });

  it("sanitizes nested values without mutating safe references", () => {
    expect(sanitizeContractWriterRuntimeValue({
      endpointRef: "writer-endpoint-ref:aelf-contract-writer",
      endpointUrl: "https://writer.invalid/v1/send",
      nested: ["Bearer leaked-token", "tenant/raw/contract-writes.json"],
      signerPolicyRef: "signer-policy-ref:campaign-os-multisig",
      signerSecret: "plain-secret-signer",
      signedUrl: "https://writer.invalid/tx.json?signature=unsafe",
    })).toEqual({
      endpointRef: "writer-endpoint-ref:aelf-contract-writer",
      endpointUrl: "[REDACTED:ENDPOINT]",
      nested: ["[REDACTED:CREDENTIAL]", "[REDACTED:OBJECT_KEY]"],
      signerPolicyRef: "signer-policy-ref:campaign-os-multisig",
      signerSecret: "[REDACTED:PRIVATE_KEY]",
      signedUrl: "[REDACTED:ENDPOINT]",
    });
  });
});
