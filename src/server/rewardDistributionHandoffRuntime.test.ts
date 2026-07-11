import { describe, expect, it } from "vitest";
import { campaignDetail } from "../domain/fixtures";
import {
  rewardDistributionHandoffRequiredEvidenceKeys,
  rewardDistributionRequiredItemIds,
} from "../domain/rewardDistributionHandoffRuntime";
import { createServerRewardDistributionHandoffReadiness } from "./rewardDistributionHandoffRuntime";

describe("createServerRewardDistributionHandoffReadiness", () => {
  it("wraps the domain factory with server runtime defaults", () => {
    const readiness = createServerRewardDistributionHandoffReadiness({
      traceId: "trace-reward-distribution-handoff",
    });

    expect(readiness).toMatchObject({
      campaignId: campaignDetail.id,
      productionReady: false,
      source: "server_runtime",
      status: "blocked",
      traceId: "trace-reward-distribution-handoff",
      valid: true,
    });
    expect(readiness.requiredEvidenceKeys).toEqual(rewardDistributionHandoffRequiredEvidenceKeys);
    expect(readiness.items.map((item) => item.id)).toEqual(rewardDistributionRequiredItemIds);
    expect(Object.values(readiness.noLiveSideEffects).every((value) => value === false)).toBe(true);
  });

  it("keeps configured handoff refs local-ready while all live flags stay false", () => {
    const readiness = createServerRewardDistributionHandoffReadiness({
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
    expect(Object.values(readiness.noLiveSideEffects).every((value) => value === false)).toBe(true);
  });

  it("sanitizes unsafe diagnostics before server serialization", () => {
    const readiness = createServerRewardDistributionHandoffReadiness({
      diagnostics: [
        {
          code: "REWARD_DISTRIBUTION_LIVE_EXECUTION_DISABLED",
          field: "providerPayload.transactionId",
          message: "Bearer payout-token sent to https://reward.invalid/send?signature=unsafe",
          safeDetails: {
            bearerToken: "bearer-token",
            payoutId: "payout-123",
            providerPayload: "raw provider payload",
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
    expect(serialized).toContain("[REDACTED:PROVIDER_PAYLOAD]");
    expect(serialized).toContain("[REDACTED:REWARD_EXECUTION_REF]");
    expect(serialized).toContain("[REDACTED:WALLET_SIGNATURE]");
    expect(serialized).not.toContain("reward.invalid");
    expect(serialized).not.toContain("payout-123");
    expect(serialized).not.toContain("providerPayload");
    expect(serialized).not.toContain("transactionId");
    expect(serialized).not.toContain("walletSignature");
  });
});
