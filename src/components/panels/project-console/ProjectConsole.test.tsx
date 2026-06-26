import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../../app/App";

describe("Project Console shell", () => {
  it("renders the default English Project Console with seeded operational data", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "Project Console" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Awaken Sprint")).toBeInTheDocument();
    expect(screen.getByText("Connected wallets")).toBeInTheDocument();
    expect(screen.getByText("AA · Portkey")).toBeInTheDocument();
    expect(screen.getByText("AI Campaign Planner")).toBeInTheDocument();
    expect(screen.getAllByText("Campaign Builder")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Draft overview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Any wallet" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Task template library" })).toBeInTheDocument();
    for (const category of ["wallet", "bridge", "swap", "nft", "dao", "daipp", "social", "invite"]) {
      expect(screen.getByText(category)).toBeInTheDocument();
    }
    expect(screen.getAllByText("AA + EOA").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Rewards and eligibility setup" })).toBeInTheDocument();
    expect(screen.getByText("Campaign project")).toBeInTheDocument();
    expect(screen.getByText("Task points")).toBeInTheDocument();
    expect(screen.getByText("Top N")).toBeInTheDocument();
    expect(
      screen.getAllByText("High-reward social-heavy campaigns need risk review.").length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "i18n, contract, and review gates" })).toBeInTheDocument();
    expect(screen.getByText("English source content")).toBeInTheDocument();
    expect(screen.getByText("Chinese AI draft")).toBeInTheDocument();
    expect(screen.getByText("High-impact manual review blocker")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Publish readiness" })).toBeInTheDocument();
    expect(
      screen.getAllByText("Contract claim mode requires high-impact manual review.").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Switch to Off-chain MVP or complete contract reviewer approval.")).toBeInTheDocument();
    expect(screen.getAllByText("Task Builder Preview")).toHaveLength(2);
    expect(screen.getByText("Rewards & Eligibility")).toBeInTheDocument();
    expect(screen.getByText("i18n Translation Review")).toBeInTheDocument();
    expect(screen.getByText("Contract Impact Review")).toBeInTheDocument();
    expect(screen.getByText("Analytics and Export")).toBeInTheDocument();
    expect(screen.getByText("Export winners does not distribute rewards.")).toBeInTheDocument();
    expect(screen.queryByText("zh-TW")).not.toBeInTheDocument();
  });

  it("switches major Project Console copy manually to zh-CN", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "zh-CN" } });

    expect(screen.getByRole("heading", { name: "活动运营工作台" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "项目控制台" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Awaken 冲刺活动")).toBeInTheDocument();
    expect(screen.getByText("已连接钱包")).toBeInTheDocument();
    expect(screen.getAllByText("活动构建器")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "草稿概览" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "任意钱包" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { name: "任务模板库" })).toBeInTheDocument();
    expect(screen.getAllByText("连接钱包").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "奖励与资格设置" })).toBeInTheDocument();
    expect(screen.getByText("活动项目方")).toBeInTheDocument();
    expect(screen.getByText("任务积分")).toBeInTheDocument();
    expect(screen.getAllByText("高奖励且偏社交任务的活动需要风险审核。").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "多语言、合约与审核门禁" })).toBeInTheDocument();
    expect(screen.getByText("英文源内容")).toBeInTheDocument();
    expect(screen.getByText("中文 AI 草稿")).toBeInTheDocument();
    expect(screen.getByText("高影响人工审核阻断")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "发布准备度" })).toBeInTheDocument();
    expect(screen.getAllByText("合约领取模式需要高影响人工审核。").length).toBeGreaterThan(0);
    expect(screen.getByText("AI 活动策划")).toBeInTheDocument();
    expect(screen.getAllByText("任务构建预览")).toHaveLength(2);
    expect(screen.getByText("奖励与资格")).toBeInTheDocument();
    expect(screen.getByText("合约影响审核")).toBeInTheDocument();
    expect(screen.getByText("符合资格")).toBeInTheDocument();
    expect(screen.getByText("缺失任务")).toBeInTheDocument();
    expect(screen.getByText("导出 winners 不等于发奖。")).toBeInTheDocument();
    expect(screen.getByText("中文内容在审核前回退展示英文。")).toBeInTheDocument();
  });

  it("keeps User App and Admin/Ops reachable from navigation", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "User App" }));
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect Wallet" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Admin/Ops" }));
    expect(screen.getByRole("heading", { name: "Review queue" })).toBeInTheDocument();
  });
});
