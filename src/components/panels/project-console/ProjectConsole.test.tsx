import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../../app/App";
import { EXPORT_CSV_COLUMNS } from "../../../domain";

describe("Project Console shell", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("renders the default English Project Console with seeded operational data", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "Project Console" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
    expect(screen.getByText("Connected wallets")).toBeInTheDocument();
    expect(screen.getByText("AA · Portkey")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Campaign Command Center" })).toBeInTheDocument();
    expect(screen.getByText("4 campaigns")).toBeInTheDocument();
    expect(screen.getByText("Review live analytics")).toBeInTheDocument();
    expect(screen.getByText("Review launch readiness")).toBeInTheDocument();
    expect(screen.getByText("Approve export preview")).toBeInTheDocument();
    expect(screen.getByText("Archive final report")).toBeInTheDocument();
    expect(screen.getByText("Forest NFT Quest")).toBeInTheDocument();
    expect(screen.getByText("TMRWDAO Governance Streak")).toBeInTheDocument();
    expect(screen.getByText("eBridge Onboarding Wave")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Analytics & Export Decision" })).toBeInTheDocument();
    expect(screen.getByText("Largest drop-off")).toBeInTheDocument();
    expect(screen.getByText("Ready rows")).toBeInTheDocument();
    expect(screen.getByText("Review-required rows")).toBeInTheDocument();
    expect(screen.getByText("Blocked rows")).toBeInTheDocument();
    expect(screen.getByText("1 / 3 / 0")).toBeInTheDocument();
    expect(screen.getByText(EXPORT_CSV_COLUMNS.join(","))).toBeInTheDocument();
    expect(screen.getByText(/Campaign OS exports verified records only/)).toBeInTheDocument();
    expect(screen.getByText(/No live analytics, no real export file/)).toBeInTheDocument();
    expect(screen.getAllByText("AI Campaign Planner").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Recommendation" })).toBeInTheDocument();
    expect(screen.getByText("Use Any wallet for conversion")).toBeInTheDocument();
    expect(screen.getByText("Recommend Portkey AA for onboarding")).toBeInTheDocument();
    expect(screen.getByText("Recommend Off-chain MVP")).toBeInTheDocument();
    expect(screen.getAllByText(/No live AI provider/).length).toBeGreaterThan(1);
    const aiContentPack = screen.getByLabelText("AI Content Pack");

    expect(within(aiContentPack).getByRole("heading", { name: "AI Content Pack" })).toBeInTheDocument();
    expect(within(aiContentPack).getByText("Project-owner review of generated campaign copy, release intent, and quality gates.")).toBeInTheDocument();
    expect(within(aiContentPack).getByText("Total artifacts")).toBeInTheDocument();
    expect(within(aiContentPack).getAllByText("Human approved").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getAllByText("AI drafts").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getAllByText("Copy ready").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getByText("Quality blockers")).toBeInTheDocument();
    expect(within(aiContentPack).getByText(/Seeded\/local content pack only/)).toBeInTheDocument();
    expect(within(aiContentPack).getByText("X / Twitter thread")).toBeInTheDocument();
    expect(within(aiContentPack).getByText("Telegram announcement")).toBeInTheDocument();
    expect(within(aiContentPack).getByText("Discord message")).toBeInTheDocument();
    expect(within(aiContentPack).getByText("FAQ")).toBeInTheDocument();
    expect(within(aiContentPack).getByText("Tutorial")).toBeInTheDocument();
    expect(within(aiContentPack).getByText("Daily report")).toBeInTheDocument();
    expect(within(aiContentPack).getByText("Winner report")).toBeInTheDocument();
    expect(within(aiContentPack).getAllByText("Human review required").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getAllByText("Schedule ready").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getAllByText("Publish blocked").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getAllByText("en-US published").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getAllByText(/zh-CN/).length).toBeGreaterThan(0);
    expect(within(aiContentPack).getByRole("heading", { name: "Quality gates" })).toBeInTheDocument();
    expect(within(aiContentPack).getByText("Reward responsibility")).toBeInTheDocument();
    expect(within(aiContentPack).getByText("Winner rules")).toBeInTheDocument();
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
    expect(screen.getByLabelText("Compare with English")).toBeInTheDocument();
    expect(screen.getByText("Source and draft comparison")).toBeInTheDocument();
    expect(screen.getAllByText("Translation draft · zh-CN").length).toBeGreaterThan(0);
    for (const action of ["Generate with AI", "Compare with English", "Mark reviewed", "Publish revision", "Use English fallback"]) {
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
    expect(
      screen.getAllByText("Switch to Off-chain MVP or complete contract reviewer approval.").length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Publish Gate Decision Center" })).toBeInTheDocument();
    expect(screen.getAllByText("Launch gate").length).toBeGreaterThan(0);
    expect(screen.getByText("Approval routing")).toBeInTheDocument();
    expect(screen.getByText("Any wallet allows AA and EOA users to participate.")).toBeInTheDocument();
    expect(screen.getByText(/No real publish/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "API / Skill Contracts" })).toBeInTheDocument();
    const serviceFacade = screen.getByLabelText("Local API Service Facade");

    expect(within(serviceFacade).getByRole("heading", { name: "Local API Service Facade" })).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Service coverage")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Total services")).toBeInTheDocument();
    expect(within(serviceFacade).getAllByText("Ready").length).toBeGreaterThan(0);
    expect(within(serviceFacade).getByText("4 Local only")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Review required")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Blocked")).toBeInTheDocument();
    for (const coverage of ["wallet coverage", "task verification", "eligibility", "i18n", "analytics", "export", "content", "summary"]) {
      expect(within(serviceFacade).getAllByText(coverage).length).toBeGreaterThan(0);
    }
    expect(within(serviceFacade).getByText("generateI18nDraft")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("exportWinners")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Verification coverage")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Provider readiness")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Evidence categories")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("MANUAL_REVIEW")).toBeInTheDocument();
    expect(within(serviceFacade).getAllByText(/No live backend\/API, wallet signature, secret storage, real export file, reward distribution, or contract root write/).length).toBeGreaterThan(0);
    expect(within(serviceFacade).getByText(/No live API, wallet SDK, provider, secret storage/)).toBeInTheDocument();
    expect(within(serviceFacade).getAllByText(/No live AeFinder, AelfScan, dApp API, social API, wallet SDK, reward distribution, export file, secret storage, or contract write/).length).toBeGreaterThan(0);
    expect(screen.getByText("Read-only contract registry for future agents and APIs.")).toBeInTheDocument();
    expect(screen.getByText("Total contracts")).toBeInTheDocument();
    expect(screen.getByText("create_campaign")).toBeInTheDocument();
    expect(screen.getByText("verify_task")).toBeInTheDocument();
    expect(screen.getByText("export_winners")).toBeInTheDocument();
    expect(screen.getAllByText("walletAddress").length).toBeGreaterThan(0);
    expect(screen.getAllByText("accountType").length).toBeGreaterThan(0);
    expect(screen.getByText("contractRootMode")).toBeInTheDocument();
    expect(screen.getAllByText("LOCAL_SEEDED, AEFINDER, AELFSCAN, DAPP_API, SOCIAL_API, WALLET_SESSION, MANUAL").length).toBeGreaterThan(0);
    expect(screen.getByText(/does not call live APIs/i)).toBeInTheDocument();
    expect(screen.getAllByText("Task Builder Preview")).toHaveLength(2);
    expect(screen.getByText("Rewards & Eligibility")).toBeInTheDocument();
    expect(screen.getByText("i18n Translation Review")).toBeInTheDocument();
    expect(screen.getAllByText("Contract Impact Review").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Analytics and Export").length).toBeGreaterThan(0);
    expect(screen.getByText("Export winners does not distribute rewards.")).toBeInTheDocument();
    expect(screen.getByText("Default and fallback: en-US. Supported: en-US, zh-CN, and zh-TW fallback readiness.")).toBeInTheDocument();
    expect(screen.getAllByText(/zh-TW/).length).toBeGreaterThan(0);
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
    expect(screen.getByRole("heading", { name: "活动指挥中心" })).toBeInTheDocument();
    expect(screen.getByText("4 个活动")).toBeInTheDocument();
    expect(screen.getByText("查看实时活动数据")).toBeInTheDocument();
    expect(screen.getByText("审核发布准备度")).toBeInTheDocument();
    expect(screen.getByText("批准导出预览")).toBeInTheDocument();
    expect(screen.getByText("归档最终报告")).toBeInTheDocument();
    expect(screen.getByText("Forest NFT 任务")).toBeInTheDocument();
    expect(screen.getByText("TMRWDAO 治理连续任务")).toBeInTheDocument();
    expect(screen.getByText("eBridge 新手活动")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "分析与导出决策" })).toBeInTheDocument();
    expect(screen.getByText("最大流失点")).toBeInTheDocument();
    expect(screen.getByText("就绪行")).toBeInTheDocument();
    expect(screen.getByText("需复核行")).toBeInTheDocument();
    expect(screen.getByText("阻断行")).toBeInTheDocument();
    expect(screen.getByText("1 / 3 / 0")).toBeInTheDocument();
    expect(screen.getByText(EXPORT_CSV_COLUMNS.join(","))).toBeInTheDocument();
    expect(screen.getByText(/只导出已验证记录/)).toBeInTheDocument();
    expect(screen.getByText(/不会连接实时数据/)).toBeInTheDocument();
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
    expect(screen.getByRole("heading", { name: "发布门禁决策中心" })).toBeInTheDocument();
    expect(screen.getAllByText("发布门禁").length).toBeGreaterThan(0);
    expect(screen.getByText("审批路由")).toBeInTheDocument();
    expect(screen.getByText("任意钱包允许 AA 与 EOA 用户参与。")).toBeInTheDocument();
    expect(screen.getByText(/不执行真实发布/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "API / Skill Contracts" })).toBeInTheDocument();
    const serviceFacade = screen.getByLabelText("本地 API Service Facade");

    expect(within(serviceFacade).getByRole("heading", { name: "本地 API Service Facade" })).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Service 覆盖")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("服务总数")).toBeInTheDocument();
    expect(within(serviceFacade).getAllByText("就绪").length).toBeGreaterThan(0);
    expect(within(serviceFacade).getByText("4 仅本地")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("需要审核")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("阻断")).toBeInTheDocument();
    for (const coverage of ["wallet coverage", "task verification", "eligibility", "i18n", "analytics", "export", "content", "summary"]) {
      expect(within(serviceFacade).getAllByText(coverage).length).toBeGreaterThan(0);
    }
    expect(within(serviceFacade).getByText("generateI18nDraft")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("exportWinners")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("验证覆盖")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Provider readiness")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Evidence 分类")).toBeInTheDocument();
    expect(within(serviceFacade).getAllByText(/不会调用 live backend\/API、钱包签名、secret 存储、真实导出文件、奖励发放或合约 root 写入/).length).toBeGreaterThan(0);
    expect(screen.getByText("面向未来 agent 与 API 的只读 contract registry。")).toBeInTheDocument();
    expect(screen.getByText("Contract 总数")).toBeInTheDocument();
    expect(screen.getByText("创建活动草稿")).toBeInTheDocument();
    expect(screen.getByText("验证任务")).toBeInTheDocument();
    expect(screen.getByText("导出 winners")).toBeInTheDocument();
    expect(screen.getAllByText(/不会调用实时 API/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("AI 活动策划").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "推荐" })).toBeInTheDocument();
    expect(screen.getByText("使用任意钱包提升转化")).toBeInTheDocument();
    expect(screen.getByText("推荐 Portkey AA 新手引导")).toBeInTheDocument();
    expect(screen.getByText("推荐 Off-chain MVP")).toBeInTheDocument();
    expect(screen.getAllByText(/不会执行实时 AI provider/).length).toBeGreaterThan(0);
    const aiContentPack = screen.getByLabelText("AI 内容包");

    expect(within(aiContentPack).getByRole("heading", { name: "AI 内容包" })).toBeInTheDocument();
    expect(within(aiContentPack).getByText("项目方审核生成文案、发布意图与质量门禁的工作区。")).toBeInTheDocument();
    expect(within(aiContentPack).getByText("内容总数")).toBeInTheDocument();
    expect(within(aiContentPack).getAllByText("人工已批准").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getAllByText("AI 草稿").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getAllByText("可复制").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getByText("质量阻断")).toBeInTheDocument();
    expect(within(aiContentPack).getByText(/仅 seeded\/本地内容包/)).toBeInTheDocument();
    expect(within(aiContentPack).getByText("X / Twitter 长帖")).toBeInTheDocument();
    expect(within(aiContentPack).getByText("Telegram 公告")).toBeInTheDocument();
    expect(within(aiContentPack).getByText("Discord 消息")).toBeInTheDocument();
    expect(within(aiContentPack).getByText("FAQ")).toBeInTheDocument();
    expect(within(aiContentPack).getByText("教程")).toBeInTheDocument();
    expect(within(aiContentPack).getByText("日报")).toBeInTheDocument();
    expect(within(aiContentPack).getByText("Winner 报告")).toBeInTheDocument();
    expect(within(aiContentPack).getAllByText("需要人工审核").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getAllByText("可排期").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getAllByText("发布已阻断").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getAllByText("en-US 已发布").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getAllByText(/zh-CN/).length).toBeGreaterThan(0);
    expect(within(aiContentPack).getByRole("heading", { name: "质量门禁" })).toBeInTheDocument();
    expect(within(aiContentPack).getByText("奖励责任")).toBeInTheDocument();
    expect(within(aiContentPack).getByText("Winner 规则")).toBeInTheDocument();
    expect(screen.getAllByText("任务构建预览")).toHaveLength(2);
    expect(screen.getByText("奖励与资格")).toBeInTheDocument();
    expect(screen.getAllByText("合约影响审核").length).toBeGreaterThan(0);
    expect(screen.getByText("符合资格")).toBeInTheDocument();
    expect(screen.getByText("缺失任务")).toBeInTheDocument();
    expect(screen.getByText("导出 winners 不等于发奖。")).toBeInTheDocument();
    expect(screen.getByText("中文内容在审核前回退展示英文。")).toBeInTheDocument();
    expect(screen.getByText("默认与回退：en-US。支持：en-US、zh-CN 与 zh-TW 回退 readiness。")).toBeInTheDocument();
    expect(screen.getAllByText(/zh-TW/).length).toBeGreaterThan(0);
  });

  it("keeps User App and Admin/Ops reachable from navigation", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "User App" }));
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect Wallet" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Admin/Ops" }));
    expect(screen.getByRole("heading", { name: "Review queue" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Template Governance" })).toBeInTheDocument();
  });
});
