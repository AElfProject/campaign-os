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
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
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
    expect(screen.getByLabelText("Translation Manager")).toBeInTheDocument();
    expect(screen.getAllByText("English source content").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Chinese AI draft").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AI generated translation cannot auto-publish before human review.").length).toBeGreaterThan(0);
    expect(screen.getByText("Chinese draft falls back to English until a project owner completes human review.")).toBeInTheDocument();
    for (const action of ["Generate with AI", "Mark reviewed", "Publish revision", "Use English fallback"]) {
      expect(screen.getByRole("button", { name: action })).toBeInTheDocument();
    }
    expect(screen.getByLabelText("Contract Impact Review")).toBeInTheDocument();
    expect(screen.getByText("Safe default for MVP; no contract migration is required.")).toBeInTheDocument();
    expect(screen.getByText("Future / planned")).toBeInTheDocument();
    expect(screen.getByText("High-impact manual review blocker")).toBeInTheDocument();
    expect(screen.getByText("This review workbench does not distribute rewards, take reward custody, or execute contract transactions.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Publish readiness" })).toBeInTheDocument();
    expect(
      screen.getAllByText("Contract claim mode requires high-impact manual review.").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Switch to Off-chain MVP or complete contract reviewer approval.")).toBeInTheDocument();
    expect(screen.getAllByText("Task Builder Preview")).toHaveLength(2);
    expect(screen.getByText("Rewards & Eligibility")).toBeInTheDocument();
    expect(screen.getByText("i18n Translation Review")).toBeInTheDocument();
    expect(screen.getAllByText("Contract Impact Review").length).toBeGreaterThan(0);
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
    expect(screen.getByRole("heading", { name: "Awaken 冲刺活动" })).toBeInTheDocument();
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
    expect(screen.getByLabelText("翻译管理")).toBeInTheDocument();
    expect(screen.getAllByText("英文源内容").length).toBeGreaterThan(0);
    expect(screen.getAllByText("中文 AI 草稿").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AI 生成翻译必须经过人工审核后才能发布。").length).toBeGreaterThan(0);
    expect(screen.getByText("中文草稿在项目方完成人工审核前回退展示英文。")).toBeInTheDocument();
    for (const action of ["用 AI 生成", "标记已审核", "发布版本", "使用英文回退"]) {
      expect(screen.getByRole("button", { name: action })).toBeInTheDocument();
    }
    expect(screen.getByText("高影响人工审核阻断")).toBeInTheDocument();
    expect(screen.getByText("这个审核工作台不会发放奖励、托管奖励，也不会执行合约交易。")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "发布准备度" })).toBeInTheDocument();
    expect(screen.getAllByText("合约领取模式需要高影响人工审核。").length).toBeGreaterThan(0);
    expect(screen.getByText("AI 活动策划")).toBeInTheDocument();
    expect(screen.getAllByText("任务构建预览")).toHaveLength(2);
    expect(screen.getByText("奖励与资格")).toBeInTheDocument();
    expect(screen.getAllByText("合约影响审核").length).toBeGreaterThan(0);
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
