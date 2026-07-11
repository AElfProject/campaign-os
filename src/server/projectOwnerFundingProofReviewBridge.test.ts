import { describe, expect, it } from "vitest";
import {
  projectOwnerFundingProofRequiredEvidenceKeys,
  projectOwnerFundingProofReviewItemIds,
} from "../domain/projectOwnerFundingProofReviewBridge";
import { campaignDetail } from "../domain/fixtures";
import { createServerProjectOwnerFundingProofReviewBridge } from "./projectOwnerFundingProofReviewBridge";

describe("createServerProjectOwnerFundingProofReviewBridge", () => {
  it("wraps the domain factory with server runtime defaults", () => {
    const readiness = createServerProjectOwnerFundingProofReviewBridge({
      traceId: "trace-funding-proof-review",
    });

    expect(readiness).toMatchObject({
      campaignId: campaignDetail.id,
      productionReady: false,
      source: "server_runtime",
      status: "blocked",
      traceId: "trace-funding-proof-review",
      valid: true,
    });
    expect(readiness.requiredEvidenceKeys).toEqual(projectOwnerFundingProofRequiredEvidenceKeys);
    expect(readiness.items.map((item) => item.id)).toEqual(projectOwnerFundingProofReviewItemIds);
    expect(Object.values(readiness.safety).every((value) => value === false)).toBe(true);
  });

  it("normalizes complete proof metadata as local-ready while production stays disabled", () => {
    const readiness = createServerProjectOwnerFundingProofReviewBridge({
      proofPackage: {
        amountSummaryRef: "amount-summary-ref:awaken-sprint-reward-budget",
        disclaimerSignoffRef: "disclaimer-signoff-ref:en-us-reviewed",
        exportBatchId: "export-batch-awaken-sprint-preview",
        financeReviewRef: "finance-review-ref:pending",
        operatorReviewRef: "operator-review-ref:pending",
        proofReference: "proof-ref:project-owner-budget-ticket",
        recipientListHashRef: "recipient-list-hash-ref:preview",
        rewardProviderStatementRef: "provider-statement-ref:project-owned",
        submittedByRole: "project_owner",
      },
    });

    expect(readiness.status).toBe("local_ready");
    expect(readiness.proofPackage.status).toBe("ready_disabled");
    expect(readiness.proofPackage.missingEvidenceKeys).toEqual([]);
    expect(readiness.productionReady).toBe(false);
    expect(Object.values(readiness.safety).every((value) => value === false)).toBe(true);
  });

  it("sanitizes unsafe diagnostics before server serialization", () => {
    const readiness = createServerProjectOwnerFundingProofReviewBridge({
      diagnostics: [
        {
          code: "PROJECT_OWNER_FUNDING_PROOF_LIVE_EXECUTION_DISABLED",
          field: "providerPayload.transactionId",
          message: "Bearer funding-token sent to https://proof.invalid/file?signedUrl=unsafe",
          safeDetails: {
            payoutId: "payout-123",
            providerPayload: "raw provider payload",
            secret: "funding-proof-secret",
            signedUrl: "https://proof.invalid/file?signedUrl=unsafe",
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
    expect(serialized).not.toContain("proof.invalid");
    expect(serialized).not.toContain("payout-123");
    expect(serialized).not.toContain("providerPayload");
    expect(serialized).not.toContain("signedUrl");
    expect(serialized).not.toContain("transactionId");
    expect(serialized).not.toContain("walletSignature");
  });
});
