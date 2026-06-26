import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RewardsEligibilityBuilder } from "./RewardsEligibilityBuilder";

describe("RewardsEligibilityBuilder", () => {
  it("renders reward provider and non-distribution disclaimers", () => {
    render(<RewardsEligibilityBuilder locale="en-US" />);

    expect(screen.getByText("Rewards and eligibility setup")).toBeInTheDocument();
    expect(screen.getByText("campaign_project")).toBeInTheDocument();
    expect(screen.getByText("Rewards are provided by the campaign project. Campaign OS does not distribute rewards.")).toBeInTheDocument();
    expect(screen.getByText("Exporting winners does not distribute rewards.")).toBeInTheDocument();
  });

  it("renders eligibility and risk settings", () => {
    render(<RewardsEligibilityBuilder locale="en-US" />);

    expect(screen.getByText("Wallet policy")).toBeInTheDocument();
    expect(screen.getByText("ANY")).toBeInTheDocument();
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

  it("does not request private keys or seed phrases", () => {
    render(<RewardsEligibilityBuilder locale="en-US" />);

    expect(screen.queryByText("private key")).not.toBeInTheDocument();
    expect(screen.queryByText("seed phrase")).not.toBeInTheDocument();
  });
});
