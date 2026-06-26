import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../../app/App";

describe("Admin/Ops shell", () => {
  it("renders review gates, contract boundaries, and export preview", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Admin/Ops" }));

    expect(screen.getByRole("heading", { name: "Review queue" })).toBeInTheDocument();
    expect(screen.getByText("Chinese copy needs human review")).toBeInTheDocument();
    expect(screen.getByText("Off-chain MVP: no contract migration required")).toBeInTheDocument();
    expect(screen.getByText("Chinese AI draft/fallback")).toBeInTheDocument();
    expect(screen.getByText("No auto-publish: human review is required before Chinese draft can ship.")).toBeInTheDocument();
    expect(screen.getByText("CONTRACT CLAIM")).toBeInTheDocument();
    expect(screen.getByText("Contract claim is blocked pending high-impact manual review.")).toBeInTheDocument();
    expect(screen.getByText("Analytics overview")).toBeInTheDocument();
    expect(screen.getByText("Verified actions")).toBeInTheDocument();
    expect(screen.getByText("Conversion funnel")).toBeInTheDocument();
    expect(screen.getByText("Wallet connect")).toBeInTheDocument();
    expect(screen.getByText("Wallet split")).toBeInTheDocument();
    expect(screen.getByText("Locale split")).toBeInTheDocument();
    expect(screen.getByText("Risk dashboard")).toBeInTheDocument();
    expect(screen.getByText("Bot/sybil review")).toBeInTheDocument();
    expect(screen.getByText("AI Ops reports")).toBeInTheDocument();
    expect(screen.getByText("Daily AI Ops summary")).toBeInTheDocument();
    expect(screen.getAllByText("Human review required").length).toBeGreaterThan(0);
    expect(screen.getByText("Ecosystem metrics")).toBeInTheDocument();
    expect(screen.getByText("TMRWDAO")).toBeInTheDocument();
    expect(screen.getByText("Export winners does not distribute rewards.")).toBeInTheDocument();
    expect(screen.getByText("Export batch: export-awaken-sprint-preview")).toBeInTheDocument();
    expect(screen.getByText("3E9...7cD")).toBeInTheDocument();
    expect(screen.getByText("referral_velocity_review")).toBeInTheDocument();
    expect(screen.getByText(/demo-task-bridge-3E9/)).toBeInTheDocument();
    expect(screen.queryByText("zh-TW")).not.toBeInTheDocument();
  });

  it("switches Admin/Ops copy manually to zh-CN", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "zh-CN" } });
    fireEvent.click(screen.getByRole("button", { name: "管理员/Ops" }));

    expect(screen.getByRole("heading", { name: "审核队列" })).toBeInTheDocument();
    expect(screen.getByText("AI 内容审核")).toBeInTheDocument();
    expect(screen.getByText("分析概览")).toBeInTheDocument();
    expect(screen.getByText("转化漏斗")).toBeInTheDocument();
    expect(screen.getByText("钱包拆分")).toBeInTheDocument();
    expect(screen.getByText("语言拆分")).toBeInTheDocument();
    expect(screen.getByText("风险看板")).toBeInTheDocument();
    expect(screen.getByText("机器人/女巫审核")).toBeInTheDocument();
    expect(screen.getByText("AI Ops 报告")).toBeInTheDocument();
    expect(screen.getByText("生态指标")).toBeInTheDocument();
    expect(screen.getByText("禁止自动发布：中文草稿发布前必须经过人工审核。")).toBeInTheDocument();
    expect(screen.getByText("合约影响审核")).toBeInTheDocument();
    expect(screen.getByText("Contract claim 已阻断，等待高影响人工审核。")).toBeInTheDocument();
    expect(screen.getByText("导出 winners 不等于发奖。")).toBeInTheDocument();
    expect(screen.queryByText("zh-TW")).not.toBeInTheDocument();
  });
});
