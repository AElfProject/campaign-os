import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EXPORT_CSV_COLUMNS } from "../domain";
import { App } from "./App";

describe("Campaign OS app shell", () => {
  const exportColumnContract = EXPORT_CSV_COLUMNS.join(",");

  it("renders the default English shell with all surfaces exposed", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Campaign operations shell" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Project Console" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "User App" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Admin/Ops" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
    expect(screen.getByText("Connected wallets")).toBeInTheDocument();
    expect(screen.getAllByText("Wallet type verified").length).toBeGreaterThan(0);
    expect(screen.getByText("2F4...9aB")).toBeInTheDocument();
  });

  it("switches major shell copy manually to zh-CN", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "zh-CN" } });

    expect(screen.getByRole("heading", { name: "活动运营工作台" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "项目控制台" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "用户应用" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "管理员/Ops" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Awaken 冲刺活动" })).toBeInTheDocument();
    expect(screen.getByText("已连接钱包")).toBeInTheDocument();
  });

  it("exposes Campaign Builder core flow from the Project Console", () => {
    render(<App />);

    expect(screen.getAllByText("Campaign Builder").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Draft overview" })).toBeInTheDocument();
    expect(screen.getByText("Default and fallback: en-US. Supported: en-US and zh-CN.")).toBeInTheDocument();
    expect(screen.getAllByText("Draft setup combines AI brief and structured campaign fields").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Task template library" })).toBeInTheDocument();
    for (const category of ["wallet", "bridge", "swap", "nft", "dao", "daipp", "social", "invite"]) {
      expect(screen.getByText(category)).toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { name: "Rewards and eligibility setup" })).toBeInTheDocument();
    expect(screen.getAllByText("Rewards are provided by the campaign project. Campaign OS does not distribute rewards.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Exporting winners does not distribute rewards.").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "i18n, contract, and review gates" })).toBeInTheDocument();
    expect(screen.getByText("English source content")).toBeInTheDocument();
    expect(screen.getByText("Chinese AI draft")).toBeInTheDocument();
    expect(screen.getByText("Off-chain MVP")).toBeInTheDocument();
    expect(screen.getByText("V2 companion")).toBeInTheDocument();
    expect(screen.getByText("Contract claim")).toBeInTheDocument();
    expect(screen.getByText("High-impact manual review blocker")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "API / Skill Contracts" })).toBeInTheDocument();
    expect(screen.getByText("Read-only contract registry for future agents and APIs.")).toBeInTheDocument();
    expect(screen.getByText("create_campaign")).toBeInTheDocument();
    expect(screen.getByText("summarize_campaign")).toBeInTheDocument();
    expect(screen.getByText(/does not call live APIs/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Publish readiness" })).toBeInTheDocument();
    expect(
      screen.getAllByText("Contract claim mode requires high-impact manual review.").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Switch to Off-chain MVP or complete contract reviewer approval.")).toBeInTheDocument();
    expect(
      screen.getAllByText("Chinese AI draft falls back to English until reviewed.").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Task Builder Preview").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rewards & Eligibility").length).toBeGreaterThan(0);
    expect(screen.getAllByText("i18n Translation Review").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Contract Impact Review").length).toBeGreaterThan(0);
  });

  it("updates Campaign Builder core copy when manually switched to zh-CN", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "zh-CN" } });

    expect(screen.getAllByText("活动构建器").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "草稿概览" })).toBeInTheDocument();
    expect(screen.getByText("默认与回退：en-US。支持：en-US 和 zh-CN。")).toBeInTheDocument();
    expect(screen.getAllByText("草稿设置结合 AI 简报与结构化活动字段").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "任务模板库" })).toBeInTheDocument();
    expect(screen.getAllByText("连接钱包").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "奖励与资格设置" })).toBeInTheDocument();
    expect(screen.getAllByText("奖励由活动项目方提供。Campaign OS 不负责自动发奖。").length).toBeGreaterThan(0);
    expect(screen.getAllByText("导出获奖名单不等于发放奖励。").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "多语言、合约与审核门禁" })).toBeInTheDocument();
    expect(screen.getByText("英文源内容")).toBeInTheDocument();
    expect(screen.getByText("中文 AI 草稿")).toBeInTheDocument();
    expect(screen.getByText("V2 辅助合约")).toBeInTheDocument();
    expect(screen.getByText("合约领取")).toBeInTheDocument();
    expect(screen.getByText("高影响人工审核阻断")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "API / Skill Contracts" })).toBeInTheDocument();
    expect(screen.getByText("面向未来 agent 与 API 的只读 contract registry。")).toBeInTheDocument();
    expect(screen.getByText("创建活动草稿")).toBeInTheDocument();
    expect(screen.getByText("总结活动")).toBeInTheDocument();
    expect(screen.getByText(/不会调用实时 API/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "发布准备度" })).toBeInTheDocument();
    expect(screen.getAllByText("合约领取模式需要高影响人工审核。").length).toBeGreaterThan(0);
    expect(screen.getByText("切换到 Off-chain MVP，或完成合约审核人批准。")).toBeInTheDocument();
    expect(screen.getAllByText("任务构建预览").length).toBeGreaterThan(0);
    expect(screen.getAllByText("奖励与资格").length).toBeGreaterThan(0);
    expect(screen.getAllByText("i18n 翻译审核").length).toBeGreaterThan(0);
    expect(screen.getAllByText("合约影响审核").length).toBeGreaterThan(0);
    expect(screen.queryByText("zh-TW")).not.toBeInTheDocument();
  });

  it("exposes wallet options and export disclaimer across user and admin surfaces", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    expect(screen.getAllByText("Portkey AA Wallet").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Portkey EOA App").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Portkey EOA Extension").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Wallet Connection Diagnostics" })).toBeInTheDocument();
    expect(screen.getByText("Wallet QA checklist")).toBeInTheDocument();
    expect(screen.getByText("Supported; AA is recommended, not mandatory.")).toBeInTheDocument();
    expect(screen.getAllByText("AA + EOA").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Wallet session status" })).toBeInTheDocument();
    expect(screen.getAllByText("Eligibility checker").length).toBeGreaterThan(0);
    expect(screen.getByText("Task verification states")).toBeInTheDocument();
    expect(screen.getByText("Referral context")).toBeInTheDocument();
    expect(screen.getByText("Leaderboard preview")).toBeInTheDocument();
    expect(screen.getByText("Qualified invitees")).toBeInTheDocument();
    expect(screen.queryByText("zh-TW")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Admin/Ops" }));

    expect(screen.getByRole("heading", { name: "Template Governance" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AI Content Pack Workbench" })).toBeInTheDocument();
    expect(screen.getAllByText("Publish blocked").length).toBeGreaterThan(0);
    expect(screen.getByText("Export winners does not distribute rewards.")).toBeInTheDocument();
    expect(screen.getByText(exportColumnContract)).toBeInTheDocument();
    expect(screen.getByText("Campaign OS exports verified records only.")).toBeInTheDocument();
  });

  it("keeps Mission 6 Admin/Ops live while other shell surfaces remain reachable", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Campaign operations shell" })).toBeInTheDocument();
    expect(screen.queryByText("zh-TW")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Admin/Ops" }));

    expect(screen.getByText("Analytics overview")).toBeInTheDocument();
    expect(screen.getByText("Risk dashboard")).toBeInTheDocument();
    expect(screen.getByText("Bot/sybil review")).toBeInTheDocument();
    expect(screen.getByText("AI Ops reports")).toBeInTheDocument();
    expect(screen.getByText("Ecosystem metrics")).toBeInTheDocument();
    expect(screen.getByText("Export batch: export-awaken-sprint-preview")).toBeInTheDocument();
    expect(screen.getByText(/demo-task-bridge-3E9/)).toBeInTheDocument();
    expect(screen.queryByText("zh-TW")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Project Console" }));
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "User App" }));
    expect(screen.getAllByText("Eligibility checker").length).toBeGreaterThan(0);
  });
});
