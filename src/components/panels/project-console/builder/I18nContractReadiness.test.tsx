import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nContractReadiness } from "./I18nContractReadiness";

describe("I18nContractReadiness", () => {
  it("shows English source and Chinese AI draft fallback gates in the Translation Manager", () => {
    render(<I18nContractReadiness locale="en-US" />);

    expect(screen.getByRole("heading", { name: "i18n, contract, and review gates" })).toBeInTheDocument();
    expect(screen.getByLabelText("Translation Manager")).toBeInTheDocument();
    expect(screen.getAllByText("English source content").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Awaken Sprint").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Chinese AI draft").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Awaken 冲刺活动").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AI generated translation cannot auto-publish before human review.").length).toBeGreaterThan(0);
    expect(screen.getByText("Chinese draft falls back to English until a project owner completes human review.")).toBeInTheDocument();
    expect(screen.getAllByText("Fallback").length).toBeGreaterThan(0);
    for (const action of ["Generate with AI", "Compare with English", "Mark reviewed", "Publish revision", "Use English fallback"]) {
      expect(screen.getByRole("button", { name: action })).toBeInTheDocument();
    }

    const compareConsole = screen.getByLabelText("Compare with English");
    expect(within(compareConsole).getByText("Source and draft comparison")).toBeInTheDocument();
    expect(within(compareConsole).getAllByText("English source · en-US").length).toBeGreaterThan(0);
    expect(within(compareConsole).getAllByText("Translation draft · zh-CN").length).toBeGreaterThan(0);
    for (const field of ["Campaign title", "Description", "Social post", "Reward disclaimer"]) {
      expect(within(compareConsole).getByText(field)).toBeInTheDocument();
    }
    expect(within(compareConsole).getByText("Complete wallet-aware aelf ecosystem tasks.")).toBeInTheDocument();
    expect(within(compareConsole).getByText("完成支持钱包类型的 aelf 生态任务。")).toBeInTheDocument();
    expect(within(compareConsole).getByText("Rewards are provided by the campaign project. Export winners does not distribute rewards.")).toBeInTheDocument();
    expect(within(compareConsole).getByText("奖励由活动项目方提供。导出 winners 不等于发奖。")).toBeInTheDocument();
    expect(within(compareConsole).getAllByText(/falls back to English/).length).toBeGreaterThan(0);
  });

  it("shows localized reward disclaimers and only MVP locales", () => {
    render(<I18nContractReadiness locale="zh-CN" />);

    expect(screen.getByRole("heading", { name: "多语言、合约与审核门禁" })).toBeInTheDocument();
    expect(screen.getByLabelText("翻译管理")).toBeInTheDocument();
    expect(screen.getByText("奖励声明审核")).toBeInTheDocument();
    expect(screen.getAllByText("Rewards are provided by the campaign project. Export winners does not distribute rewards.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("奖励由活动项目方提供。导出 winners 不等于发奖。").length).toBeGreaterThan(0);
    expect(screen.getAllByText("中文 AI 草稿").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AI 生成翻译必须经过人工审核后才能发布。").length).toBeGreaterThan(0);
    expect(screen.getByText("中文草稿在项目方完成人工审核前回退展示英文。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "对照英文" })).toBeInTheDocument();
    const zhCompareConsole = screen.getByLabelText("对照英文");
    expect(zhCompareConsole).toBeInTheDocument();
    expect(within(zhCompareConsole).getByText("源内容与草稿对照")).toBeInTheDocument();
    expect(within(zhCompareConsole).getAllByText("英文源内容 · en-US").length).toBeGreaterThan(0);
    expect(within(zhCompareConsole).getAllByText("翻译草稿 · zh-CN").length).toBeGreaterThan(0);
    for (const field of ["活动标题", "活动描述", "社交文案", "奖励声明"]) {
      expect(within(zhCompareConsole).getByText(field)).toBeInTheDocument();
    }
    expect(screen.getAllByText("语言列表").length).toBeGreaterThan(0);
    expect(screen.getByText("标记已审核或发布版本前，先将 zh-CN 草稿与英文源内容对照。")).toBeInTheDocument();
    expect(screen.queryByText("zh-TW")).not.toBeInTheDocument();
  });

  it("shows Off-chain MVP as default, V2 companion as planned, and contract claim as blocker", () => {
    render(<I18nContractReadiness locale="en-US" />);

    expect(screen.getByLabelText("Contract Impact Review")).toBeInTheDocument();
    expect(screen.getByText("Off-chain MVP")).toBeInTheDocument();
    expect(screen.getByText("Safe default for MVP; no contract migration is required.")).toBeInTheDocument();
    expect(screen.getAllByText("Safe default").length).toBeGreaterThan(0);
    expect(screen.getByText("V2 companion")).toBeInTheDocument();
    expect(screen.getByText("Future / planned")).toBeInTheDocument();
    expect(screen.getByText("Contract claim")).toBeInTheDocument();
    expect(screen.getByText("Blocked until high-impact manual review approves claim-mode risk.")).toBeInTheDocument();
    expect(screen.getByText("High-impact manual review blocker")).toBeInTheDocument();
    expect(screen.getByText("Blocker")).toBeInTheDocument();
    expect(screen.getByText("This review workbench does not distribute rewards, take reward custody, or execute contract transactions.")).toBeInTheDocument();
    expect(screen.getByText("Contract claim is not enabled in this MVP shell and does not execute reward distribution.")).toBeInTheDocument();
  });
});
