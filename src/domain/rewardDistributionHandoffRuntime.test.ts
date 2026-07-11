import { describe, expect, it } from "vitest";
import { campaignDetail } from "./fixtures";
import {
  createRewardDistributionHandoffReadiness,
  rewardDistributionHandoffNoLiveSideEffects,
  rewardDistributionHandoffRequiredEvidenceKeys,
  rewardDistributionRequiredItemIds,
  sanitizeRewardDistributionHandoffRuntimeValue,
} from "./rewardDistributionHandoffRuntime";

describe("createRewardDistributionHandoffReadiness", () => {
  it("creates deterministic local reward distribution handoff readiness", () => {
    const first = createRewardDistributionHandoffReadiness({ campaign: campaignDetail });
    const second = createRewardDistributionHandoffReadiness({ campaign: campaignDetail });

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      campaignId: campaignDetail.id,
      productionReady: false,
      source: "seeded_runtime",
      status: "blocked",
      valid: true,
    });
    expect(first.boundary["en-US"]).toContain("No reward custody");
    expect(first.exportLinkage.derivedFrom).toBe("seeded_export_preview");
    expect(first.exportLinkage.exportBatchIds.length).toBeGreaterThan(0);
  });

  it("covers required handoff items and summary counts", () => {
    const readiness = createRewardDistributionHandoffReadiness({ campaign: campaignDetail });

    expect(readiness.items.map((item) => item.id)).toEqual(rewardDistributionRequiredItemIds);
    expect(readiness.requiredEvidenceKeys).toEqual(rewardDistributionHandoffRequiredEvidenceKeys);
    expect(readiness.summary.itemCount).toBe(rewardDistributionRequiredItemIds.length);
    expect(readiness.summary.blockedItemCount).toBe(readiness.items.filter((item) => item.state === "blocked").length);
    expect(readiness.summary.reviewRequiredItemCount).toBe(
      readiness.items.filter((item) => item.state === "review_required").length,
    );
    expect(readiness.summary.readyItemCount).toBe(readiness.items.filter((item) => item.state === "ready").length);
    expect(readiness.summary.readyItemCount + readiness.summary.reviewRequiredItemCount + readiness.summary.blockedItemCount)
      .toBe(readiness.summary.itemCount);
  });

  it("fails closed when required evidence is absent or partial", () => {
    const absent = createRewardDistributionHandoffReadiness({ campaign: campaignDetail });
    const partial = createRewardDistributionHandoffReadiness({
      campaign: campaignDetail,
      evidence: {
        fundingProofRef: "evidence-ref:project-owner-budget",
        operatorApprovalRef: "approval-ref:reward-ops",
      },
    });

    expect(absent.evidenceHandoff).toMatchObject({
      productionReady: false,
      status: "missing",
    });
    expect(partial.evidenceHandoff).toMatchObject({
      productionReady: false,
      status: "partial",
    });
    expect(absent.status).toBe("blocked");
    expect(partial.status).toBe("blocked");
    expect(absent.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "REWARD_DISTRIBUTION_FUNDING_PROOF_MISSING",
        "REWARD_DISTRIBUTION_OPERATOR_APPROVAL_MISSING",
        "REWARD_DISTRIBUTION_QUEUE_HANDOFF_MISSING",
        "REWARD_DISTRIBUTION_DEAD_LETTER_POLICY_MISSING",
        "REWARD_DISTRIBUTION_IDEMPOTENCY_POLICY_MISSING",
        "REWARD_DISTRIBUTION_RECONCILIATION_MISSING",
        "REWARD_DISTRIBUTION_OFF_SWITCH_MISSING",
        "REWARD_DISTRIBUTION_ROLLBACK_RUNBOOK_MISSING",
        "REWARD_DISTRIBUTION_LIVE_EXECUTION_DISABLED",
      ]),
    );
    expect(partial.diagnosticCodes).toContain("REWARD_DISTRIBUTION_DEAD_LETTER_POLICY_MISSING");
  });

  it("enters local_ready only when all review evidence exists while production stays disabled", () => {
    const readiness = createRewardDistributionHandoffReadiness({
      campaign: campaignDetail,
      evidence: {
        deadLetterPolicyRef: "policy-ref:reward-dead-letter",
        fundingProofRef: "evidence-ref:project-owner-budget",
        idempotencyPolicyRef: "idempotency-ref:reward-distribution",
        offSwitchRef: "enablement-ref:reward-off-switch",
        operatorApprovalRef: "approval-ref:reward-ops",
        queueHandoffRef: "queue-ref:reward-distribution",
        reconciliationReportRef: "evidence-ref:reward-reconciliation",
        rollbackRunbookRef: "runbook-ref:reward-distribution",
      },
    });

    expect(readiness.status).toBe("local_ready");
    expect(readiness.evidenceHandoff.status).toBe("ready_disabled");
    expect(readiness.evidenceHandoff.missingEvidenceKeys).toEqual([]);
    expect(readiness.productionReady).toBe(false);
    expect(readiness.items.every((item) => item.state === "ready" || item.state === "review_required")).toBe(true);
  });

  it("keeps all live side-effect flags false", () => {
    const readiness = createRewardDistributionHandoffReadiness({ campaign: campaignDetail });

    expect(readiness.noLiveSideEffects).toEqual(rewardDistributionHandoffNoLiveSideEffects);
    expect(Object.values(readiness.noLiveSideEffects).every((value) => value === false)).toBe(true);
    expect(readiness.items.every((item) => item.liveExecutionEnabled === false)).toBe(true);
  });

  it("redacts hostile diagnostic values from serialized output", () => {
    const readiness = createRewardDistributionHandoffReadiness({
      campaign: campaignDetail,
      diagnostics: [
        {
          code: "REWARD_DISTRIBUTION_LIVE_EXECUTION_DISABLED",
          field: "distribution.providerPayload",
          message: "Bearer payout-token hit https://reward.invalid/send?signature=unsafe",
          safeDetails: {
            bearerToken: "bearer-token",
            claimTransaction: "claim-transaction",
            contractWrite: "contract-write",
            custodyId: "custody-123",
            distributionTx: "distribution-tx",
            endpointUrl: "https://reward.invalid/status",
            payoutId: "payout-123",
            privateKey: "private key should never leak",
            providerPayload: "raw provider payload {\"token\":\"unsafe\"}",
            secret: "secret-value",
            seedPhrase: "seed phrase should never leak",
            signature: "wallet-signature",
            transactionId: "transaction-123",
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
    expect(serialized).toContain("[REDACTED:PROVIDER_PAYLOAD]");
    expect(serialized).toContain("[REDACTED:PRIVATE_KEY]");
    expect(serialized).toContain("[REDACTED:WALLET_SIGNATURE]");
    expect(serialized).toContain("[REDACTED:REWARD_EXECUTION_REF]");
    expect(serialized).not.toContain("payout-token");
    expect(serialized).not.toContain("reward.invalid");
    expect(serialized).not.toContain("payout-123");
    expect(serialized).not.toContain("custody-123");
    expect(serialized).not.toContain("distribution-tx");
    expect(serialized).not.toContain("raw provider payload");
    expect(serialized).not.toContain("wallet-signature");
    expect(serialized).not.toContain("bearerToken");
    expect(serialized).not.toContain("claimTransaction");
    expect(serialized).not.toContain("contractWrite");
    expect(serialized).not.toContain("custodyId");
    expect(serialized).not.toContain("distributionTx");
    expect(serialized).not.toContain("payoutId");
    expect(serialized).not.toContain("privateKey");
    expect(serialized).not.toContain("providerPayload");
    expect(serialized).not.toContain("seedPhrase");
    expect(serialized).not.toContain("transactionId");
    expect(serialized).not.toContain("walletSignature");
  });

  it("sanitizes nested values without mutating safe references", () => {
    expect(sanitizeRewardDistributionHandoffRuntimeValue({
      fundingProofRef: "evidence-ref:project-owner-budget",
      nested: ["Bearer leaked-token", "payoutId payout-123"],
      providerPayload: "raw provider payload {\"token\":\"unsafe\"}",
      queueHandoffRef: "queue-ref:reward-distribution",
      rollbackRunbookRef: "runbook-ref:reward-distribution",
      transactionId: "transaction-123",
      walletSignature: "wallet-signature",
    })).toMatchObject({
      fundingProofRef: "evidence-ref:project-owner-budget",
      nested: ["[REDACTED:CREDENTIAL]", "[REDACTED:REWARD_EXECUTION_REF]"],
      queueHandoffRef: "queue-ref:reward-distribution",
      redactedProviderPayloadField2: "[REDACTED:PROVIDER_PAYLOAD]",
      redactedRewardExecutionField5: "[REDACTED:REWARD_EXECUTION_REF]",
      redactedWalletSignatureField6: "[REDACTED:WALLET_SIGNATURE]",
      rollbackRunbookRef: "runbook-ref:reward-distribution",
    });
  });
});
