import { describe, expect, it } from "vitest";
import { campaignDetail } from "./fixtures";
import {
  createProjectOwnerFundingProofReviewBridge,
  projectOwnerFundingProofRequiredEvidenceKeys,
  projectOwnerFundingProofReviewItemIds,
  projectOwnerFundingProofSafetyFlags,
  sanitizeProjectOwnerFundingProofReviewValue,
} from "./projectOwnerFundingProofReviewBridge";

describe("createProjectOwnerFundingProofReviewBridge", () => {
  it("creates deterministic review-only funding proof readiness", () => {
    const first = createProjectOwnerFundingProofReviewBridge({ campaign: campaignDetail });
    const second = createProjectOwnerFundingProofReviewBridge({ campaign: campaignDetail });

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      campaignId: campaignDetail.id,
      productionReady: false,
      source: "seeded_runtime",
      status: "blocked",
      valid: true,
    });
    expect(first.boundary["en-US"]).toContain("review-only funding proof bridge");
    expect(first.boundary["en-US"]).toContain("No reward custody");
    expect(first.boundary["zh-CN"]).toContain("不会执行奖励托管");
    expect(first.summary.requiredItemCount).toBe(projectOwnerFundingProofReviewItemIds.length);
  });

  it("covers required evidence items and fail-closed summary counts", () => {
    const readiness = createProjectOwnerFundingProofReviewBridge({ campaign: campaignDetail });

    expect(readiness.items.map((item) => item.id)).toEqual(projectOwnerFundingProofReviewItemIds);
    expect(readiness.requiredEvidenceKeys).toEqual(projectOwnerFundingProofRequiredEvidenceKeys);
    expect(readiness.summary.blockedItemCount).toBe(readiness.items.filter((item) => item.state === "blocked").length);
    expect(readiness.summary.reviewRequiredItemCount).toBe(
      readiness.items.filter((item) => item.state === "review_required").length,
    );
    expect(readiness.summary.readyItemCount).toBe(readiness.items.filter((item) => item.state === "ready").length);
    expect(readiness.summary.readyItemCount + readiness.summary.reviewRequiredItemCount + readiness.summary.blockedItemCount)
      .toBe(readiness.summary.requiredItemCount);
    expect(readiness.diagnosticCodes).toEqual(expect.arrayContaining([
      "PROJECT_OWNER_FUNDING_PROOF_REFERENCE_MISSING",
      "PROJECT_OWNER_FUNDING_PROOF_OPERATOR_REVIEW_MISSING",
      "PROJECT_OWNER_FUNDING_PROOF_LIVE_EXECUTION_DISABLED",
    ]));
  });

  it("normalizes local metadata without making the package production ready", () => {
    const readiness = createProjectOwnerFundingProofReviewBridge({
      campaign: campaignDetail,
      proofPackage: {
        amountSummaryRef: "amount-summary-ref:awaken-sprint-reward-budget",
        disclaimerSignoffRef: "disclaimer-signoff-ref:en-us-reviewed",
        exportBatchId: "export-batch-awaken-sprint-preview",
        financeReviewRef: "finance-review-ref:pending",
        operatorReviewRef: "operator-review-ref:pending",
        proofReference: "proof-ref:project-owner-budget-ticket",
        recipientListHashRef: "recipient-list-hash-ref:preview",
        rewardProviderStatementRef: "provider-statement-ref:project-owned",
        reviewState: "accepted_for_handoff",
        submittedByRole: "project_owner",
      },
    });

    expect(readiness.status).toBe("local_ready");
    expect(readiness.productionReady).toBe(false);
    expect(readiness.proofPackage.status).toBe("ready_disabled");
    expect(readiness.proofPackage.missingEvidenceKeys).toEqual([]);
    expect(readiness.proofPackage.productionReady).toBe(false);
    expect(readiness.summary.readyItemCount).toBe(7);
    expect(readiness.summary.reviewRequiredItemCount).toBe(1);
    expect(readiness.summary.blockedItemCount).toBe(0);
  });

  it("keeps all live safety flags false", () => {
    const readiness = createProjectOwnerFundingProofReviewBridge({ campaign: campaignDetail });

    expect(readiness.safety).toEqual(projectOwnerFundingProofSafetyFlags);
    expect(Object.values(readiness.safety).every((value) => value === false)).toBe(true);
    expect(readiness.items.every((item) => item.liveExecutionEnabled === false)).toBe(true);
  });

  it("redacts hostile proof metadata and diagnostics from serialized output", () => {
    const readiness = createProjectOwnerFundingProofReviewBridge({
      campaign: campaignDetail,
      diagnostics: [
        {
          code: "PROJECT_OWNER_FUNDING_PROOF_LIVE_EXECUTION_DISABLED",
          field: "proofPackage.providerPayload",
          message: "Bearer funding-token hit https://proof.invalid/file?signedUrl=unsafe",
          safeDetails: {
            custodyId: "custody-123",
            distributionTx: "distribution-tx",
            payoutId: "payout-123",
            privateKey: "private key should never leak",
            providerPayload: "raw provider payload {\"token\":\"unsafe\"}",
            secret: "secret-value",
            seedPhrase: "seed phrase should never leak",
            signature: "wallet-signature",
            signedUrl: "https://proof.invalid/file?signedUrl=unsafe",
            transactionId: "transaction-123",
          },
          severity: "warning",
          source: "runtime",
        },
      ],
      proofPackage: {
        proofReference: "https://proof.invalid/file?signedUrl=unsafe&token=raw",
        providerPayload: "raw provider payload should not serialize",
        reviewState: "submitted",
        signedUrl: "https://proof.invalid/file?signedUrl=unsafe",
      },
    });
    const serialized = JSON.stringify(readiness);

    expect(serialized).toContain("[REDACTED:CREDENTIAL]");
    expect(serialized).toContain("[REDACTED:ENDPOINT]");
    expect(serialized).toContain("[REDACTED:PROVIDER_PAYLOAD]");
    expect(serialized).toContain("[REDACTED:PRIVATE_KEY]");
    expect(serialized).toContain("[REDACTED:WALLET_SIGNATURE]");
    expect(serialized).toContain("[REDACTED:REWARD_EXECUTION_REF]");
    expect(serialized).not.toContain("funding-token");
    expect(serialized).not.toContain("proof.invalid");
    expect(serialized).not.toContain("payout-123");
    expect(serialized).not.toContain("custody-123");
    expect(serialized).not.toContain("distribution-tx");
    expect(serialized).not.toContain("raw provider payload");
    expect(serialized).not.toContain("wallet-signature");
    expect(serialized).not.toContain("privateKey");
    expect(serialized).not.toContain("providerPayload");
    expect(serialized).not.toContain("signedUrl");
    expect(serialized).not.toContain("transactionId");
  });

  it("sanitizes nested values without mutating safe references", () => {
    expect(sanitizeProjectOwnerFundingProofReviewValue({
      amountSummaryRef: "amount-summary-ref:budget",
      nested: ["Bearer leaked-token", "payoutId payout-123"],
      proofReference: "proof-ref:project-owner-budget",
      providerPayload: "raw provider payload {\"token\":\"unsafe\"}",
      signedUrl: "https://proof.invalid/file?signedUrl=unsafe",
      walletSignature: "wallet-signature",
    })).toMatchObject({
      amountSummaryRef: "amount-summary-ref:budget",
      nested: ["[REDACTED:CREDENTIAL]", "[REDACTED:REWARD_EXECUTION_REF]"],
      proofReference: "proof-ref:project-owner-budget",
      redactedEndpointField4: "[REDACTED:ENDPOINT]",
      redactedProviderPayloadField3: "[REDACTED:PROVIDER_PAYLOAD]",
      redactedWalletSignatureField5: "[REDACTED:WALLET_SIGNATURE]",
    });
  });
});
