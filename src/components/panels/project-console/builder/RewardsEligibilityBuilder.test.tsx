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
    expect(screen.getAllByText("Referral validation").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Manual review").length).toBeGreaterThan(0);
    expect(screen.getByText("High-reward social-heavy campaigns need risk review.")).toBeInTheDocument();
  });

  it("renders AI rule assistant reward review details in English", () => {
    render(<RewardsEligibilityBuilder locale="en-US" />);

    expect(screen.getByText("AI Rule Assistant")).toBeInTheDocument();
    expect(screen.getByText(/Reduce referral weight from 120 to 80/)).toBeInTheDocument();
    expect(screen.getByText("Reward type")).toBeInTheDocument();
    expect(screen.getByText("Points")).toBeInTheDocument();
    expect(screen.getByText("Token")).toBeInTheDocument();
    expect(screen.getByText("Required tasks")).toBeInTheDocument();
    expect(screen.getByText("Connect wallet")).toBeInTheDocument();
    expect(screen.getByText("Bridge with eBridge")).toBeInTheDocument();
    expect(screen.getByText("Risk flags")).toBeInTheDocument();
    expect(screen.getByText("Wallet age")).toBeInTheDocument();
    expect(screen.getByText("Funding cluster")).toBeInTheDocument();
    expect(screen.getByText("Invite tree")).toBeInTheDocument();
    expect(screen.getByText("Task pattern")).toBeInTheDocument();
    expect(screen.getByText("Export format")).toBeInTheDocument();
    expect(screen.getByText("CSV")).toBeInTheDocument();
    expect(screen.getByText("JSON")).toBeInTheDocument();
    expect(screen.getByText("Task records")).toBeInTheDocument();
    expect(screen.getByText("Risk flags export")).toBeInTheDocument();
    expect(screen.getByText("Signed message")).toBeInTheDocument();
    expect(screen.getByText("Required before verification")).toBeInTheDocument();
    expect(screen.getAllByText(/No live AI provider/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/reward distribution/).length).toBeGreaterThan(0);
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

  it("renders localized zh-CN AI rule assistant review labels", () => {
    render(<RewardsEligibilityBuilder locale="zh-CN" />);

    expect(screen.getByText("AI 规则助手")).toBeInTheDocument();
    expect(screen.getByText("奖励类型")).toBeInTheDocument();
    expect(screen.getByText("积分")).toBeInTheDocument();
    expect(screen.getByText("代币")).toBeInTheDocument();
    expect(screen.getByText("必做任务")).toBeInTheDocument();
    expect(screen.getByText("连接钱包")).toBeInTheDocument();
    expect(screen.getByText("使用 eBridge 跨链")).toBeInTheDocument();
    expect(screen.getByText("风险标记")).toBeInTheDocument();
    expect(screen.getByText("钱包年龄")).toBeInTheDocument();
    expect(screen.getByText("资金来源聚类")).toBeInTheDocument();
    expect(screen.getByText("邀请树")).toBeInTheDocument();
    expect(screen.getByText("任务模式")).toBeInTheDocument();
    expect(screen.getByText("导出格式")).toBeInTheDocument();
    expect(screen.getByText("任务记录")).toBeInTheDocument();
    expect(screen.getByText("风险标记导出")).toBeInTheDocument();
    expect(screen.getByText("签名消息")).toBeInTheDocument();
    expect(screen.getByText("验证前必须完成")).toBeInTheDocument();
    expect(screen.getAllByText(/不会执行实时 AI provider/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/奖励发放/).length).toBeGreaterThan(0);
    expect(screen.queryByText("task_records")).not.toBeInTheDocument();
    expect(screen.queryByText("risk_flags")).not.toBeInTheDocument();
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

    expect(screen.getAllByText("已关闭").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("Off")).not.toBeInTheDocument();
  });

  it("does not request private keys or seed phrases", () => {
    render(<RewardsEligibilityBuilder locale="en-US" />);

    expect(screen.queryByText("private key")).not.toBeInTheDocument();
    expect(screen.queryByText("seed phrase")).not.toBeInTheDocument();
  });
});
