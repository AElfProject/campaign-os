import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nContractReadiness } from "./I18nContractReadiness";

describe("I18nContractReadiness", () => {
  it("shows English source and Chinese AI draft fallback gates", () => {
    render(<I18nContractReadiness locale="en-US" />);

    expect(screen.getByText("English source content")).toBeInTheDocument();
    expect(screen.getByText("Awaken Summer Sprint")).toBeInTheDocument();
    expect(screen.getByText("Chinese AI draft")).toBeInTheDocument();
    expect(screen.getByText("Awaken 夏季冲刺活动")).toBeInTheDocument();
    expect(screen.getByText("AI draft")).toBeInTheDocument();
    expect(screen.getByText("Falls back to English")).toBeInTheDocument();
    expect(screen.getAllByText("Not published").length).toBeGreaterThan(0);
  });

  it("shows localized reward disclaimers and only MVP locales", () => {
    render(<I18nContractReadiness locale="zh-CN" />);

    expect(screen.getByText("按语言展示奖励声明")).toBeInTheDocument();
    expect(screen.getByText("Rewards are provided by the campaign project. Campaign OS does not distribute rewards.")).toBeInTheDocument();
    expect(screen.getByText("奖励由活动项目方提供。Campaign OS 不负责自动发奖。")).toBeInTheDocument();
    expect(screen.getByText("中文 AI 草稿")).toBeInTheDocument();
    expect(screen.queryByText("zh-TW")).not.toBeInTheDocument();
  });

  it("shows Off-chain MVP as default and contract claim as blocker", () => {
    render(<I18nContractReadiness locale="en-US" />);

    expect(screen.getByText("Off-chain MVP")).toBeInTheDocument();
    expect(screen.getAllByText("Safe default").length).toBeGreaterThan(0);
    expect(screen.getByText("V2 companion")).toBeInTheDocument();
    expect(screen.getByText("Contract claim")).toBeInTheDocument();
    expect(screen.getByText("High-impact manual review blocker")).toBeInTheDocument();
    expect(screen.getByText("Blocker")).toBeInTheDocument();
  });
});
