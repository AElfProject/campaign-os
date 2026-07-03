import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
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

    const compareConsole = screen.getByLabelText("Source and draft comparison");
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

    const rewardReviewGate = screen.getByLabelText("Reward disclaimer review");
    expect(within(rewardReviewGate).getByText("Review every localized reward disclaimer before publish.")).toBeInTheDocument();
    expect(within(rewardReviewGate).getByText("Ready for publish")).toBeInTheDocument();
    expect(within(rewardReviewGate).getAllByText("Blocks publish").length).toBeGreaterThan(0);
    expect(within(rewardReviewGate).getByText("AI draft reward disclaimer requires project owner review before publish.")).toBeInTheDocument();
    expect(within(rewardReviewGate).getByText("Localized reward disclaimer is missing and blocks publish.")).toBeInTheDocument();
    expect(within(rewardReviewGate).getAllByText("Project owner must review localized reward disclaimer before publish.").length).toBeGreaterThan(0);
    expect(within(rewardReviewGate).getAllByText("Rewards are provided by the campaign project. Export winners does not distribute rewards.").length).toBeGreaterThan(0);
  });

  it("shows localized reward disclaimers and MVP locale readiness", () => {
    render(<I18nContractReadiness locale="zh-CN" />);

    expect(screen.getByRole("heading", { name: "多语言、合约与审核门禁" })).toBeInTheDocument();
    expect(screen.getByLabelText("翻译管理")).toBeInTheDocument();
    expect(screen.getByText("奖励声明审核")).toBeInTheDocument();
    expect(screen.getAllByText("Rewards are provided by the campaign project. Export winners does not distribute rewards.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("奖励由活动项目方提供。导出 winners 不等于发奖。").length).toBeGreaterThan(0);
    const rewardReviewGate = screen.getByLabelText("奖励声明审核");
    expect(within(rewardReviewGate).getByText("发布前逐一审核每个语言的奖励免责声明。")).toBeInTheDocument();
    expect(within(rewardReviewGate).getAllByText("阻断发布").length).toBeGreaterThan(0);
    expect(within(rewardReviewGate).getByText("本地化奖励免责声明缺失，会阻断发布。")).toBeInTheDocument();
    expect(within(rewardReviewGate).getAllByText("项目方必须在发布前审核本地化奖励免责声明。").length).toBeGreaterThan(0);
    expect(screen.getAllByText("中文 AI 草稿").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AI 生成翻译必须经过人工审核后才能发布。").length).toBeGreaterThan(0);
    expect(screen.getByText("中文草稿在项目方完成人工审核前回退展示英文。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "对照英文" })).toBeInTheDocument();
    const zhCompareConsole = screen.getByLabelText("源内容与草稿对照");
    expect(zhCompareConsole).toBeInTheDocument();
    expect(within(zhCompareConsole).getByText("源内容与草稿对照")).toBeInTheDocument();
    expect(within(zhCompareConsole).getAllByText("英文源内容 · en-US").length).toBeGreaterThan(0);
    expect(within(zhCompareConsole).getAllByText("翻译草稿 · zh-CN").length).toBeGreaterThan(0);
    for (const field of ["活动标题", "活动描述", "社交文案", "奖励声明"]) {
      expect(within(zhCompareConsole).getByText(field)).toBeInTheDocument();
    }
    expect(screen.getAllByText("语言列表").length).toBeGreaterThan(0);
    expect(screen.getByText(/zh-TW ·/)).toBeInTheDocument();
  });

  it("renders zh-TW as a fallback readiness lane without claiming final translation", () => {
    render(<I18nContractReadiness locale="zh-TW" />);

    expect(screen.getByRole("heading", { name: "多語言、合約與審核門禁" })).toBeInTheDocument();
    expect(screen.getByLabelText("翻譯管理")).toBeInTheDocument();
    expect(screen.getByText(/繁中目前為 fallback\/readiness lane/)).toBeInTheDocument();
    expect(screen.getAllByText(/zh-TW/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("回退").length).toBeGreaterThan(0);
  });

  it("drives local i18n review actions without live side-effect controls", () => {
    render(<I18nContractReadiness locale="en-US" />);

    const publishButton = screen.getByRole("button", { name: "Publish revision" });
    expect(publishButton).toBeDisabled();
    expect(publishButton).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByLabelText("Source and draft comparison")).toBeInTheDocument();
    expect(screen.getByLabelText("Latest local action")).toHaveTextContent("Compare with English");

    fireEvent.click(screen.getByRole("button", { name: "Compare with English" }));
    const compareConsole = screen.getByLabelText("Source and draft comparison");
    expect(within(compareConsole).getByText("Campaign title")).toBeInTheDocument();
    expect(within(compareConsole).getByText("Reward disclaimer")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mark reviewed" }));
    expect(screen.getByLabelText("Latest local action")).toHaveTextContent("Mark reviewed");
    expect(screen.getAllByText("zh-CN Reviewed").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Publish revision" })).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Publish revision" }));
    expect(screen.getByLabelText("Latest local action")).toHaveTextContent("Publish revision");
    expect(screen.getAllByText("zh-CN Published").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Use English fallback" }));
    expect(screen.getByLabelText("Latest local action")).toHaveTextContent("Use English fallback");
    expect(screen.getByRole("button", { name: "Publish revision" })).toBeDisabled();
    expect(screen.getAllByText("zh-CN Not published").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Fallback").length).toBeGreaterThan(0);

    for (const boundary of [
      "No live AI provider",
      "No backend persistence",
      "No publish mutation",
      "No storage write",
      "No contract write",
      "No wallet action",
      "No export file",
      "No reward custody or distribution",
    ]) {
      expect(screen.getAllByText(boundary).length).toBeGreaterThan(0);
    }

    for (const forbidden of [
      /connect wallet/i,
      /send transaction/i,
      /publish to backend/i,
      /write contract/i,
      /export file/i,
      /distribute reward/i,
      /trigger ai provider/i,
    ]) {
      expect(screen.queryByRole("button", { name: forbidden })).not.toBeInTheDocument();
    }
  });

  it("shows zh-CN localized action results and no-live boundaries", () => {
    render(<I18nContractReadiness locale="zh-CN" />);

    fireEvent.click(screen.getByRole("button", { name: "标记已审核" }));

    expect(screen.getByLabelText("最新本地动作")).toHaveTextContent("标记已审核");
    expect(screen.getByLabelText("最新本地动作")).toHaveTextContent("人工审核已完成");
    for (const boundary of [
      "无实时 AI provider",
      "无后端持久化",
      "无发布变更",
      "无 storage 写入",
      "无合约写入",
      "无钱包动作",
      "无导出文件",
      "无奖励托管或发奖",
    ]) {
      expect(screen.getAllByText(boundary).length).toBeGreaterThan(0);
    }
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
