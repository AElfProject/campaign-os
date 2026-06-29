import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { projectConsoleCopy } from "../copy";
import { CampaignBuilderPanel } from "./CampaignBuilderPanel";

describe("CampaignBuilderPanel", () => {
  it("renders the default English draft overview and wallet policy", () => {
    render(<CampaignBuilderPanel copy={projectConsoleCopy["en-US"]} locale="en-US" />);

    expect(screen.getByRole("heading", { name: "Draft overview" })).toBeInTheDocument();
    expect(screen.getByText("Awaken Summer Sprint")).toBeInTheDocument();
    expect(screen.getByText("Default and fallback: en-US. Supported: en-US, zh-CN, and zh-TW fallback readiness.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Any wallet" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "AA only" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "EOA only" })).toBeInTheDocument();
    expect(screen.getByLabelText("AI Campaign Planner")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recommendation" })).toBeInTheDocument();
    expect(screen.getByText("Campaign structure")).toBeInTheDocument();
    expect(screen.getAllByText("Wallet policy").length).toBeGreaterThan(0);
    expect(screen.getByText("Language plan")).toBeInTheDocument();
    expect(screen.getByText("Task strategy")).toBeInTheDocument();
    expect(screen.getByText("Risk hints")).toBeInTheDocument();
    expect(screen.getByText("Contract recommendation")).toBeInTheDocument();
    expect(screen.getByText("Use Any wallet for conversion")).toBeInTheDocument();
    expect(screen.getByText("Recommend Portkey AA for onboarding")).toBeInTheDocument();
    expect(screen.getByText("Default language is English")).toBeInTheDocument();
    expect(screen.getByText("Recommend Off-chain MVP")).toBeInTheDocument();
    expect(screen.getByText("Keep contract claim blocked")).toBeInTheDocument();
    expect(screen.getByText(/No live AI provider/)).toBeInTheDocument();
    expect(screen.getByText(/no automatic publish/)).toBeInTheDocument();
    expect(screen.getAllByText("zh-TW").length).toBeGreaterThan(0);
  });

  it("renders localized zh-CN builder copy", () => {
    render(<CampaignBuilderPanel copy={projectConsoleCopy["zh-CN"]} locale="zh-CN" />);

    expect(screen.getByRole("heading", { name: "草稿概览" })).toBeInTheDocument();
    expect(screen.getByText("Awaken 夏季冲刺活动")).toBeInTheDocument();
    expect(screen.getByText("默认与回退：en-US。支持：en-US、zh-CN 与 zh-TW 回退 readiness。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "任意钱包" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "仅 AA 钱包" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "仅 EOA 钱包" })).toBeInTheDocument();
    expect(screen.getByLabelText("AI 活动策划")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "推荐" })).toBeInTheDocument();
    expect(screen.getByText("活动结构")).toBeInTheDocument();
    expect(screen.getAllByText("钱包策略").length).toBeGreaterThan(0);
    expect(screen.getByText("语言计划")).toBeInTheDocument();
    expect(screen.getByText("任务策略")).toBeInTheDocument();
    expect(screen.getByText("风险提示")).toBeInTheDocument();
    expect(screen.getByText("合约建议")).toBeInTheDocument();
    expect(screen.getByText("使用任意钱包提升转化")).toBeInTheDocument();
    expect(screen.getByText("推荐 Portkey AA 新手引导")).toBeInTheDocument();
    expect(screen.getByText("默认语言为英文")).toBeInTheDocument();
    expect(screen.getByText("推荐 Off-chain MVP")).toBeInTheDocument();
    expect(screen.getByText("保持合约领取阻断")).toBeInTheDocument();
    expect(screen.getByText(/不会执行实时 AI provider/)).toBeInTheDocument();
  });
});
