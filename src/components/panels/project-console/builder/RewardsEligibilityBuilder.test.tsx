import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { seededCampaignDraft } from "../../../../domain";
import { RewardsEligibilityBuilder } from "./RewardsEligibilityBuilder";

describe("RewardsEligibilityBuilder", () => {
  it("renders reward provider and non-distribution disclaimers", () => {
    render(<RewardsEligibilityBuilder locale="en-US" />);

    expect(screen.getByText("Rewards and eligibility setup")).toBeInTheDocument();
    expect(screen.getByText("Campaign project")).toBeInTheDocument();
    expect(screen.getByText("Rewards are provided by the campaign project. Campaign OS does not distribute rewards.")).toBeInTheDocument();
    expect(screen.getByText("Exporting winners does not distribute rewards.")).toBeInTheDocument();
  });

  it("renders eligibility and risk settings", () => {
    render(<RewardsEligibilityBuilder locale="en-US" />);

    expect(screen.getByText("Wallet policy")).toBeInTheDocument();
    expect(screen.getByText("Any wallet")).toBeInTheDocument();
    expect(screen.getByText("Task points")).toBeInTheDocument();
    expect(screen.getByText("Top N")).toBeInTheDocument();
    expect(screen.getByText("Referral validation")).toBeInTheDocument();
    expect(screen.getByText("Manual review")).toBeInTheDocument();
    expect(screen.getByText("High-reward social-heavy campaigns need risk review.")).toBeInTheDocument();
  });

  it("renders localized zh-CN responsibility copy", () => {
    render(<RewardsEligibilityBuilder locale="zh-CN" />);

    expect(screen.getByText("奖励与资格设置")).toBeInTheDocument();
    expect(screen.getByText("奖励由活动项目方提供。Campaign OS 不负责自动发奖。")).toBeInTheDocument();
    expect(screen.getByText("导出获奖名单不等于发放奖励。")).toBeInTheDocument();
  });

  it("localizes zh-CN reward and eligibility enum labels", () => {
    render(<RewardsEligibilityBuilder locale="zh-CN" />);

    expect(screen.getByText("活动项目方")).toBeInTheDocument();
    expect(screen.getByText("任意钱包")).toBeInTheDocument();
    expect(screen.getByText("任务积分")).toBeInTheDocument();
    expect(screen.getByText("前 N 名")).toBeInTheDocument();
    expect(screen.queryByText("campaign_project")).not.toBeInTheDocument();
    expect(screen.queryByText("ANY")).not.toBeInTheDocument();
    expect(screen.queryByText("task_points")).not.toBeInTheDocument();
    expect(screen.queryByText("top_n")).not.toBeInTheDocument();
  });

  it("localizes zh-CN disabled eligibility states", () => {
    const draft = {
      ...seededCampaignDraft,
      eligibilityRule: {
        ...seededCampaignDraft.eligibilityRule,
        manualReviewRequired: false,
        referralValidationEnabled: false,
      },
    };

    render(<RewardsEligibilityBuilder draft={draft} locale="zh-CN" />);

    expect(screen.getAllByText("已关闭")).toHaveLength(2);
    expect(screen.queryByText("Off")).not.toBeInTheDocument();
  });

  it("does not request private keys or seed phrases", () => {
    render(<RewardsEligibilityBuilder locale="en-US" />);

    expect(screen.queryByText("private key")).not.toBeInTheDocument();
    expect(screen.queryByText("seed phrase")).not.toBeInTheDocument();
  });
});
