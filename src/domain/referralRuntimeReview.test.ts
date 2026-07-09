import { describe, expect, it } from "vitest";
import type { CampaignDbReferralBindingRecord } from "../server/campaignDbRepository";
import { campaignDetail, createReferralRuntimeReviewModel } from "./index";

const participant = campaignDetail.participants[1];

const referralBinding = (
  override: Partial<CampaignDbReferralBindingRecord> = {},
): CampaignDbReferralBindingRecord => ({
  campaignId: participant.campaignId,
  createdAt: "2026-07-09T08:00:00.000Z",
  id: "campaign-db-referral-binding-review-0001",
  inviteeAccountType: participant.accountType,
  inviteeWalletAddress: participant.walletAddress,
  inviteeWalletSource: participant.walletSource,
  qualifiedActionCompleted: false,
  referrerAccountType: "AA",
  referrerWalletAddress: "2F4ReferrerRuntime",
  referrerWalletSource: "PORTKEY_AA",
  riskFlags: ["same_funding_source_review"],
  status: "risk_review",
  updatedAt: "2026-07-09T08:01:00.000Z",
  ...override,
});

describe("referral runtime review model", () => {
  it("derives deterministic participant and admin referral runtime state", () => {
    const input = {
      campaign: campaignDetail,
      participant,
      referralBindings: [referralBinding()],
    };
    const model = createReferralRuntimeReviewModel(input, "en-US");
    const repeated = createReferralRuntimeReviewModel(input, "en-US");

    expect(model).toEqual(repeated);
    expect(model.ariaLabel).toBe("Referral runtime review");
    expect(model.participant).toMatchObject({
      bindingStatus: "risk_review",
      inviteeWalletAddress: "3E9...7cD",
      qualifiedActionCompleted: false,
      qualifiedInvitees: 2,
      rawInvites: 9,
      referralPoints: 40,
      referrerAddress: "2F4ReferrerRuntime",
    });
    expect(model.participant.riskFlags).toEqual([
      "referral_velocity_review",
      "same_funding_source_review",
    ]);
    expect(model.admin).toMatchObject({
      backendReadModel: "local Campaign DB referral binding read model",
      bindingRecordCount: 4,
      exportRowsMissingReferrer: 0,
      exportRowsWithReferrer: 4,
      futureHandoff: "future Campaign DB referral binding table service",
      productionDeferred: true,
      readinessState: "review_required",
      referrerAddressColumnCovered: true,
      riskReviewBindingCount: 1,
    });
  });

  it("keeps referrer address and referral risk visible in export review rows", () => {
    const model = createReferralRuntimeReviewModel({
      campaign: campaignDetail,
      participant,
      referralBindings: [referralBinding()],
    }, "en-US");

    expect(model.exportRows.find((row) => row.walletAddress === participant.walletAddress)).toMatchObject({
      referrerAddress: "REF...3E9",
      riskFlags: ["referral_velocity_review"],
      rowStatus: "review_required",
      walletAddress: "3E9...7cD",
    });
    expect(model.exportRows.map((row) => row.referrerAddress)).toContain("REF...5N1");
    expect(model.participant.exportImpact).toContain("referrer_address");
    expect(model.participant.eligibilityImpact).toContain("risk review");
  });

  it("fails closed when local referral records are absent", () => {
    const campaignWithoutReferrers = {
      ...campaignDetail,
      exportPreview: {
        ...campaignDetail.exportPreview,
        rows: campaignDetail.exportPreview.rows.map((row) => ({
          ...row,
          referrerAddress: "",
          riskFlags: row.walletAddress === participant.walletAddress ? [] : row.riskFlags,
        })),
      },
    };
    const anonymousParticipant = {
      ...participant,
      referrerAddress: "",
      referralSummary: undefined,
      riskFlags: [],
    };

    const model = createReferralRuntimeReviewModel({
      campaign: campaignWithoutReferrers,
      participant: anonymousParticipant,
    }, "en-US");

    expect(model.participant.bindingStatus).toBe("unbound");
    expect(model.participant.exportImpact).toBe("Export row has no referrer_address yet.");
    expect(model.admin).toMatchObject({
      bindingRecordCount: 0,
      exportRowsMissingReferrer: campaignDetail.exportPreview.rows.length,
      exportRowsWithReferrer: 0,
      referrerAddressColumnCovered: false,
    });
    expect(model.admin.topBlocker).toContain("missing referrer_address");
  });

  it("keeps all live and reward side effects disabled", () => {
    const model = createReferralRuntimeReviewModel({
      campaign: campaignDetail,
      participant,
      referralBindings: [referralBinding({ qualifiedActionCompleted: true, riskFlags: [], status: "qualified" })],
    }, "en-US");

    expect(model.safety).toEqual({
      contractWriteEnabled: false,
      liveWalletVerificationEnabled: false,
      localReviewOnly: true,
      productionDbMigrationEnabled: false,
      productionReferralApiEnabled: false,
      providerRiskCallEnabled: false,
      queueSchedulerEnabled: false,
      rewardCustodyEnabled: false,
      rewardDistributionEnabled: false,
      storageWriteEnabled: false,
    });
    const serialized = JSON.stringify(model).toLowerCase();
    expect(serialized).not.toContain("privatekey");
    expect(serialized).not.toContain("kitty-specs");
    expect(serialized).not.toContain("signed-url");
  });
});
