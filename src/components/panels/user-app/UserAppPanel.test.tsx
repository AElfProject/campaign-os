import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../../app/App";
import { campaignDetail } from "../../../domain";
import { UserAppPanel } from "./UserAppPanel";

describe("User App shell", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("renders local campaign detail navigation and targets existing sections without URL mutation", () => {
    render(<UserAppPanel locale="en-US" />);

    const nav = screen.getByRole("navigation", { name: "User campaign detail navigation" });
    const navButtons = within(nav).getAllByRole("button");
    const initialUrl = window.location.href;

    expect(navButtons.map((button) => button.textContent)).toEqual([
      "Campaigns",
      "Points",
      "Referrals",
      "Eligibility",
    ]);
    expect(within(nav).getByRole("button", { name: "Campaigns" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(within(nav).getByRole("button", { name: "Points" }));
    expect(within(nav).getByRole("button", { name: "Points" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("article", { name: "Points section" })).toHaveFocus();
    expect(window.location.href).toBe(initialUrl);

    fireEvent.click(within(nav).getByRole("button", { name: "Referrals" }));
    expect(within(nav).getByRole("button", { name: "Referrals" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("article", { name: "Referrals section" })).toHaveFocus();
    expect(window.location.href).toBe(initialUrl);

    fireEvent.click(within(nav).getByRole("button", { name: "Eligibility" }));
    expect(within(nav).getByRole("button", { name: "Eligibility" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Eligibility checker" })).toHaveFocus();
    expect(window.location.href).toBe(initialUrl);

    fireEvent.click(within(nav).getByRole("button", { name: "Campaigns" }));
    expect(within(nav).getByRole("button", { name: "Campaigns" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Campaigns section" })).toHaveFocus();
    expect(window.location.href).toBe(initialUrl);
  });

  it("localizes local campaign detail navigation labels", () => {
    const { rerender } = render(<UserAppPanel locale="zh-CN" />);

    const zhCNNav = screen.getByRole("navigation", { name: "用户活动详情导航" });
    expect(within(zhCNNav).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "活动",
      "积分",
      "推荐",
      "资格",
    ]);

    rerender(<UserAppPanel locale="zh-TW" />);

    const zhTWNav = screen.getByRole("navigation", { name: "用戶活動詳情導覽" });
    expect(within(zhTWNav).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "活動",
      "積分",
      "推薦",
      "資格",
    ]);
  });

  it("renders participant campaign detail, wallet options, tasks, and eligibility", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    expect(screen.getByRole("heading", { name: "Campaign Feed" })).toBeInTheDocument();
    expect(screen.getByText("Find live aelf campaigns, points, time left, core tasks, and eligibility entry points.")).toBeInTheDocument();
    expect(screen.getAllByText("Forest NFT Quest").length).toBeGreaterThan(0);
    expect(screen.getAllByText("TMRWDAO Governance Streak").length).toBeGreaterThan(0);
    expect(screen.getByText("Local Campaign Discovery API readiness only; no live marketplace, App Hub backend, Portfolio, or Forecast service is connected.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mobile entry for campaigns, points, pay, forecast, and portfolio." })).toBeInTheDocument();
    expect(screen.getByText("Seeded mobile hub preview; no Telegram Mini App, payment, forecast, or portfolio service is connected.")).toBeInTheDocument();
    expect(screen.getByText("What should I do today?")).toBeInTheDocument();
    expect(screen.getAllByText("Ecosystem next actions").length).toBeGreaterThan(0);
    expect(screen.getByText("Finish the campaign gate before the next ecosystem action.")).toBeInTheDocument();
    expect(screen.getByText("Seeded/local ecosystem recommendations only. No live Pay, Forecast, or Portfolio service, wallet SDK, payment, prediction, portfolio sync, contract view, or contract send is connected.")).toBeInTheDocument();
    expect(screen.getAllByText("Pay").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Portfolio").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Forecast").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Use Pay after the campaign step is clear").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Try Forecast with eligibility context").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Check Portfolio before the next campaign").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No live Pay service, wallet SDK, payment transaction, contract view, or contract send is executed.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No live Forecast service, prediction transaction, wallet SDK, contract view, or contract send is executed.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No live Portfolio service, wallet SDK, portfolio sync, contract view, or contract send is executed.").length).toBeGreaterThan(0);
    const portfolioHistory = screen.getByRole("region", { name: "Portfolio Campaign History" });
    expect(within(portfolioHistory).getByRole("heading", { name: "Portfolio Campaign History" })).toBeInTheDocument();
    expect(within(portfolioHistory).getByText("Current and historical campaign checkpoints for points, eligibility, wallet, locale, and export review.")).toBeInTheDocument();
    expect(within(portfolioHistory).getByText("Awaken Sprint")).toBeInTheDocument();
    expect(within(portfolioHistory).getByText("Forest NFT Quest")).toBeInTheDocument();
    expect(within(portfolioHistory).getByText("TMRWDAO Governance Streak")).toBeInTheDocument();
    expect(within(portfolioHistory).getAllByText("Wallet").length).toBeGreaterThan(0);
    expect(within(portfolioHistory).getAllByText("Locale").length).toBeGreaterThan(0);
    expect(within(portfolioHistory).getAllByText("Eligibility").length).toBeGreaterThan(0);
    expect(within(portfolioHistory).getAllByText("Points").length).toBeGreaterThan(0);
    expect(within(portfolioHistory).getAllByText("Winner / export").length).toBeGreaterThan(0);
    expect(within(portfolioHistory).getAllByText("Blocked before export").length).toBeGreaterThan(0);
    expect(within(portfolioHistory).getAllByText("Seeded/local Portfolio campaign history only. No live Portfolio service, no Portfolio sync, no wallet SDK, no contract view, no contract send, no export file, no reward custody, and no reward distribution is executed.").length).toBeGreaterThan(0);
    expect(within(portfolioHistory).getByText("Seeded/local Portfolio campaign history only. No live Portfolio service, Portfolio sync, wallet SDK, contract view/send, export file, reward custody, or reward distribution is connected.")).toBeInTheDocument();
    const participantWorkspace = screen.getByRole("region", { name: "My Tasks / Points / Referral" });
    expect(within(participantWorkspace).getByRole("heading", { name: "My Tasks / Points / Referral" })).toBeInTheDocument();
    expect(within(participantWorkspace).getByText("One workspace for required task progress, seeded points, rank, and qualified referral contribution.")).toBeInTheDocument();
    expect(within(participantWorkspace).getAllByText("My Tasks").length).toBeGreaterThan(0);
    expect(within(participantWorkspace).getAllByText("My Points").length).toBeGreaterThan(0);
    expect(within(participantWorkspace).getAllByText("Referral summary").length).toBeGreaterThan(0);
    expect(within(participantWorkspace).getAllByText("Qualified referrals").length).toBeGreaterThan(0);
    expect(within(participantWorkspace).getAllByText("Pending / ready tasks").length).toBeGreaterThan(0);
    expect(within(participantWorkspace).getByText("Complete missing required task")).toBeInTheDocument();
    expect(within(participantWorkspace).getByText("Review task status")).toBeInTheDocument();
    expect(within(participantWorkspace).getByText(/Raw signups do not count/)).toBeInTheDocument();
    expect(within(participantWorkspace).getByText(/not settled by a live points ledger/)).toBeInTheDocument();
    expect(within(participantWorkspace).getByText(/no live Referral registry write/)).toBeInTheDocument();
    expect(within(participantWorkspace).getByText(/reward custody/)).toBeInTheDocument();
    expect(within(participantWorkspace).getByText(/reward distribution is executed/)).toBeInTheDocument();
    expect(screen.getByText("Complete Bridge via eBridge before this ecosystem action.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect Wallet" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Check eligibility" }).length).toBeGreaterThan(0);
    const shareReadiness = screen.getByRole("region", { name: "Share card readiness" });
    expect(within(shareReadiness).getAllByText("https://campaign.local/en-US/campaigns/awaken-sprint").length).toBeGreaterThan(0);
    expect(within(shareReadiness).getAllByText("https://campaign.local/zh-CN/campaigns/awaken-sprint").length).toBeGreaterThan(0);
    expect(within(shareReadiness).getAllByText("https://campaign.local/zh-TW/campaigns/awaken-sprint").length).toBeGreaterThan(0);
    expect(within(shareReadiness).getByText("Awaken Sprint")).toBeInTheDocument();
    expect(within(shareReadiness).getByText(/No SSR, crawler guarantee, social API/)).toBeInTheDocument();
    expect(screen.getByText("Campaign OS never asks for private keys or seed phrases.")).toBeInTheDocument();
    expect(screen.getByText("Wallet connection is limited to connection and message signing in this shell.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Wallet session status" })).toBeInTheDocument();
    expect(screen.getAllByText("Wallet type verified").length).toBeGreaterThan(0);
    expect(screen.getByText("Seeded preview only; no live wallet SDK connection or transaction signing is executed.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Wallet Connection Diagnostics" })).toBeInTheDocument();
    expect(screen.getByText("Seeded AA + EOA coverage for campaign wallet QA.")).toBeInTheDocument();
    expect(screen.getByText("Recommended AA path")).toBeInTheDocument();
    expect(screen.getByText("Supported EOA paths")).toBeInTheDocument();
    expect(screen.getByText("Connection issue coverage")).toBeInTheDocument();
    expect(screen.getByText("Wallet QA checklist")).toBeInTheDocument();
    expect(screen.getByText("Portkey AA connect")).toBeInTheDocument();
    expect(screen.getByText("EOA extension connect")).toBeInTheDocument();
    expect(screen.getByText("Wrong-chain error")).toBeInTheDocument();
    expect(screen.getByText("Unsupported wallet error")).toBeInTheDocument();
    expect(screen.getByText("Missing signature recovery")).toBeInTheDocument();
    expect(screen.getByText("Account policy restriction")).toBeInTheDocument();
    expect(screen.getByText("Supported; AA is recommended, not mandatory.")).toBeInTheDocument();
    expect(screen.getByText(/Diagnostics are seeded QA evidence/)).toBeInTheDocument();
    expect(screen.getAllByText("Address-only, wallet type unknown").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Unsupported wallet").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Wrong chain or network").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Missing verification signature").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Account type restricted").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Internal Agent Skill wallet").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Recommended" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "EOA wallets" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Advanced / Agent" })).toBeInTheDocument();

    const recommendedWallets = within(screen.getByTestId("wallet-group-recommended"));
    expect(recommendedWallets.getByText("Portkey AA Wallet")).toBeInTheDocument();
    expect(recommendedWallets.getAllByText("Recommended").length).toBeGreaterThan(0);

    const eoaWallets = within(screen.getByTestId("wallet-group-eoa"));
    expect(eoaWallets.getByText("Portkey EOA App")).toBeInTheDocument();
    expect(eoaWallets.getByText("Portkey EOA Extension")).toBeInTheDocument();
    expect(eoaWallets.getByText("NightElf Wallet")).toBeInTheDocument();

    const advancedWallets = within(screen.getByTestId("wallet-group-advanced"));
    expect(advancedWallets.getByText("Agent Skill Wallet")).toBeInTheDocument();
    expect(advancedWallets.getAllByText("Internal/advanced").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bridge via eBridge").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Eligibility checker").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Not eligible").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bridge via eBridge").length).toBeGreaterThan(1);
    expect(screen.getByText("Complete the missing required tasks before export eligibility.")).toBeInTheDocument();
    expect(screen.getByText("Task verification states")).toBeInTheDocument();
    expect(screen.getAllByText("Pending verification").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Failed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Manual review").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Referral context").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Raw signups do not count; invitees must complete valid tasks before referral points are awarded.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Qualified invitees").length).toBeGreaterThan(0);
    expect(screen.getByText("Leaderboard preview")).toBeInTheDocument();
    expect(screen.getAllByText("AA · Portkey").length).toBeGreaterThan(0);
    expect(screen.getAllByText("EOA · NightElf").length).toBeGreaterThan(0);
    expect(screen.getAllByText("EOA · Extension").length).toBeGreaterThan(0);
    expect(screen.getAllByText("referral_velocity_review").length).toBeGreaterThan(0);
    expect(screen.getByText("Seeded shell preview; points and rank are not a live ledger.")).toBeInTheDocument();
    expect(screen.getAllByText("Rewards are provided by the campaign project. Export winners does not distribute rewards.").length).toBeGreaterThan(0);

    const exportStatus = screen.getByRole("region", { name: "Winners export status" });
    expect(within(exportStatus).getByRole("heading", { name: "Winners export status" })).toBeInTheDocument();
    expect(within(exportStatus).getAllByText("Blocked before export").length).toBeGreaterThan(0);
    expect(within(exportStatus).getByText(/export-awaken-sprint-preview/)).toBeInTheDocument();
    expect(within(exportStatus).getByText(/3E9\.\.\.7cD/)).toBeInTheDocument();
    expect(within(exportStatus).getByText("EOA · Extension")).toBeInTheDocument();
    expect(within(exportStatus).getByText("zh-CN")).toBeInTheDocument();
    expect(within(exportStatus).getByText("bridge_ebridge")).toBeInTheDocument();
    expect(within(exportStatus).getByText("task-bridge:pending:aelfscan")).toBeInTheDocument();
    expect(within(exportStatus).getByText("demo-task-bridge-3E9")).toBeInTheDocument();
    expect(within(exportStatus).getByText("Final reward distribution is handled by the campaign project.")).toBeInTheDocument();
    expect(within(exportStatus).getByText(/Complete missing required tasks/)).toBeInTheDocument();
  });

  it("opens and closes the seeded wallet connect modal in en-US", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    expect(screen.queryByRole("dialog", { name: "Connect Wallet" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Connect Wallet" }));

    const dialog = screen.getByRole("dialog", { name: "Connect Wallet" });

    expect(within(dialog).getByTestId("wallet-modal-group-recommended")).toBeInTheDocument();
    expect(within(dialog).getByTestId("wallet-modal-group-eoa")).toBeInTheDocument();
    expect(within(dialog).getByTestId("wallet-modal-group-advanced")).toBeInTheDocument();

    const recommendedWallets = within(within(dialog).getByTestId("wallet-modal-group-recommended"));
    expect(recommendedWallets.getByText("Portkey AA Wallet")).toBeInTheDocument();
    expect(recommendedWallets.getAllByText("Recommended").length).toBeGreaterThan(0);

    const eoaWallets = within(within(dialog).getByTestId("wallet-modal-group-eoa"));
    expect(eoaWallets.getByText("Portkey EOA App")).toBeInTheDocument();
    expect(eoaWallets.getByText("Portkey EOA Extension")).toBeInTheDocument();
    expect(eoaWallets.getByText("NightElf Wallet")).toBeInTheDocument();

    const advancedWallets = within(within(dialog).getByTestId("wallet-modal-group-advanced"));
    expect(advancedWallets.getByText("Agent Skill Wallet")).toBeInTheDocument();
    expect(advancedWallets.getByText("Internal/advanced")).toBeInTheDocument();

    expect(within(dialog).getByText("Campaign OS never asks for private keys, seed phrases, recovery phrases, or password exports.")).toBeInTheDocument();
    expect(within(dialog).getAllByText("Seeded preview only: no live wallet SDK, no real signature, no transaction, and no contract read/write is executed.").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("Wrong chain: switch to AELF mainnet before continuing with campaign verification.")).toBeInTheDocument();
    expect(within(dialog).getByText("Unsupported wallet: choose Portkey AA, Portkey EOA App, Portkey EOA Extension, or NightElf for this seeded campaign flow.")).toBeInTheDocument();
    expect(within(dialog).getByText("Missing signature: sign the seeded verification message only after confirming the prompt; this preview does not request a real signature.")).toBeInTheDocument();
    expect(within(dialog).getByText("Account type restriction: if a campaign allows only AA or only EOA, switch to a wallet type accepted by that campaign policy.")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Close wallet connect modal" }));

    expect(screen.queryByRole("dialog", { name: "Connect Wallet" })).not.toBeInTheDocument();
  });

  it("renders archived campaigns as terminal user app statuses", () => {
    const [participant] = campaignDetail.participants;
    const archivedCampaign = {
      ...campaignDetail,
      status: "archived",
    } satisfies typeof campaignDetail;

    render(
      <UserAppPanel
        campaign={archivedCampaign}
        locale="en-US"
        participant={participant}
      />,
    );

    const archivedBadges = screen.getAllByText("Archived");

    expect(archivedBadges.length).toBeGreaterThan(0);
    expect(archivedBadges[0]).toHaveStyle({ color: "#991b1b" });
    expect(
      screen.getAllByText(
        "Campaign has ended; winner export review is closed for this seeded view.",
      ).length,
    ).toBeGreaterThan(0);
  });

  it("switches User App copy manually to zh-CN", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "zh-CN" } });
    fireEvent.click(screen.getByRole("button", { name: "用户应用" }));

    expect(screen.getByRole("heading", { name: "活动 Feed" })).toBeInTheDocument();
    expect(screen.getByText("展示进行中的 aelf 活动、可获得积分、剩余时间、核心任务与资格入口。")).toBeInTheDocument();
    expect(screen.getAllByText("Forest NFT 任务").length).toBeGreaterThan(0);
    expect(screen.getAllByText("TMRWDAO 治理连续任务").length).toBeGreaterThan(0);
    expect(screen.getByText("仅本地 Campaign Discovery API readiness；不会连接实时 marketplace、App Hub 后端、Portfolio 或 Forecast 服务。")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "移动端入口，聚合活动、积分、Pay、Forecast 与 Portfolio。" })).toBeInTheDocument();
    expect(screen.getByText("仅 seeded 移动端 Hub 预览；未接入 Telegram Mini App、支付、Forecast 或 Portfolio 服务。")).toBeInTheDocument();
    expect(screen.getByText("今天该做什么？")).toBeInTheDocument();
    expect(screen.getAllByText("生态下一步").length).toBeGreaterThan(0);
    expect(screen.getByText("先完成活动门槛，再进入下一个生态行动。")).toBeInTheDocument();
    expect(screen.getByText("仅 seeded/本地生态推荐。不会连接真实 Pay、Forecast 或 Portfolio 服务、钱包 SDK、支付、预测、Portfolio 同步、合约读取或合约发送。")).toBeInTheDocument();
    expect(screen.getAllByText("明确活动步骤后再使用 Pay").length).toBeGreaterThan(0);
    expect(screen.getAllByText("结合资格上下文探索 Forecast").length).toBeGreaterThan(0);
    expect(screen.getAllByText("进入下一个活动前查看 Portfolio").length).toBeGreaterThan(0);
    expect(screen.getAllByText("不会连接真实 Pay 服务、钱包 SDK、支付交易、合约读取或合约发送。").length).toBeGreaterThan(0);
    expect(screen.getAllByText("不会连接真实 Forecast 服务、预测交易、钱包 SDK、合约读取或合约发送。").length).toBeGreaterThan(0);
    expect(screen.getAllByText("不会连接真实 Portfolio 服务、钱包 SDK、Portfolio 同步、合约读取或合约发送。").length).toBeGreaterThan(0);
    const portfolioHistory = screen.getByRole("region", { name: "Portfolio 活动历史" });
    expect(within(portfolioHistory).getByRole("heading", { name: "Portfolio 活动历史" })).toBeInTheDocument();
    expect(within(portfolioHistory).getByText("查看当前与历史活动的积分、资格、钱包、语言与导出审核检查点。")).toBeInTheDocument();
    expect(within(portfolioHistory).getAllByText("钱包").length).toBeGreaterThan(0);
    expect(within(portfolioHistory).getAllByText("语言").length).toBeGreaterThan(0);
    expect(within(portfolioHistory).getAllByText("资格").length).toBeGreaterThan(0);
    expect(within(portfolioHistory).getAllByText("获奖 / 导出").length).toBeGreaterThan(0);
    expect(within(portfolioHistory).getByText("仅 seeded/本地 Portfolio 活动历史。不会连接真实 Portfolio 服务、Portfolio 同步、钱包 SDK、合约读取/发送、导出文件、奖励托管或发奖。")).toBeInTheDocument();
    expect(within(portfolioHistory).getAllByText("Awaken 冲刺活动").length).toBeGreaterThan(0);
    expect(within(portfolioHistory).getByText("Forest NFT 任务")).toBeInTheDocument();
    expect(within(portfolioHistory).getByText("TMRWDAO 治理连续任务")).toBeInTheDocument();
    const participantWorkspace = screen.getByRole("region", { name: "我的任务 / 积分 / 推荐" });
    expect(within(participantWorkspace).getByRole("heading", { name: "我的任务 / 积分 / 推荐" })).toBeInTheDocument();
    expect(within(participantWorkspace).getByText("在一个工作台查看必做任务进度、seeded 积分、排名与合格推荐贡献。")).toBeInTheDocument();
    expect(within(participantWorkspace).getAllByText("我的任务").length).toBeGreaterThan(0);
    expect(within(participantWorkspace).getAllByText("我的积分").length).toBeGreaterThan(0);
    expect(within(participantWorkspace).getAllByText("推荐摘要").length).toBeGreaterThan(0);
    expect(within(participantWorkspace).getAllByText("合格推荐").length).toBeGreaterThan(0);
    expect(within(participantWorkspace).getAllByText("待处理 / 待开始任务").length).toBeGreaterThan(0);
    expect(within(participantWorkspace).getByText("完成缺失的必做任务")).toBeInTheDocument();
    expect(within(participantWorkspace).getByText("审核任务状态")).toBeInTheDocument();
    expect(within(participantWorkspace).getByText(/仅注册不会计分/)).toBeInTheDocument();
    expect(within(participantWorkspace).getByText(/不是由实时 points ledger 结算/)).toBeInTheDocument();
    expect(within(participantWorkspace).getByText(/不会执行实时 Referral registry 写入/)).toBeInTheDocument();
    expect(within(participantWorkspace).getByText(/不是实时账本/)).toBeInTheDocument();
    expect(within(participantWorkspace).getByText(/奖励托管或发奖/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Awaken 冲刺活动" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "连接钱包" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "检查资格" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("region", { name: "分享卡片就绪状态" })).toBeInTheDocument();
    expect(screen.getAllByText("https://campaign.local/zh-CN/campaigns/awaken-sprint").length).toBeGreaterThan(0);
    expect(screen.getByText(/未接入 SSR、crawler 保证、social API/)).toBeInTheDocument();
    expect(screen.getByText("Campaign OS 永远不会索要私钥或助记词。")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "钱包会话状态" })).toBeInTheDocument();
    expect(screen.getAllByText("钱包类型已验证").length).toBeGreaterThan(0);
    expect(screen.getByText("仅 seeded 预览；不会执行实时钱包 SDK 连接或交易签名。")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "钱包连接诊断" })).toBeInTheDocument();
    expect(screen.getByText("用于活动钱包 QA 的 seeded AA + EOA 覆盖。")).toBeInTheDocument();
    expect(screen.getByText("推荐 AA 路径")).toBeInTheDocument();
    expect(screen.getByText("受支持的 EOA 路径")).toBeInTheDocument();
    expect(screen.getByText("连接问题覆盖")).toBeInTheDocument();
    expect(screen.getByText("钱包 QA 清单")).toBeInTheDocument();
    expect(screen.getByText("Portkey AA 连接")).toBeInTheDocument();
    expect(screen.getByText("EOA 插件连接")).toBeInTheDocument();
    expect(screen.getByText("错误链错误")).toBeInTheDocument();
    expect(screen.getByText("不支持钱包错误")).toBeInTheDocument();
    expect(screen.getByText("缺少签名恢复")).toBeInTheDocument();
    expect(screen.getByText("账户策略限制")).toBeInTheDocument();
    expect(screen.getByText("支持 EOA；AA 是推荐路径，不是强制要求。")).toBeInTheDocument();
    expect(screen.getByText(/诊断是 seeded QA 证据/)).toBeInTheDocument();
    expect(screen.getAllByText("仅地址，钱包类型未知").length).toBeGreaterThan(0);
    expect(screen.getAllByText("不支持的钱包").length).toBeGreaterThan(0);
    expect(screen.getAllByText("链或网络不匹配").length).toBeGreaterThan(0);
    expect(screen.getAllByText("缺少验证签名").length).toBeGreaterThan(0);
    expect(screen.getAllByText("钱包类型受限").length).toBeGreaterThan(0);
    expect(screen.getAllByText("内部 Agent Skill 钱包").length).toBeGreaterThan(0);
    expect(screen.getByText("钱包选项")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "推荐" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "EOA 钱包" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "高级 / Agent" })).toBeInTheDocument();
    expect(within(screen.getByTestId("wallet-group-recommended")).getByText("Portkey AA Wallet")).toBeInTheDocument();
    expect(within(screen.getByTestId("wallet-group-eoa")).getByText("NightElf Wallet")).toBeInTheDocument();
    expect(within(screen.getByTestId("wallet-group-advanced")).getByText("Agent Skill Wallet")).toBeInTheDocument();
    expect(screen.getAllByText("内部/高级").length).toBeGreaterThan(0);
    expect(screen.getAllByText("通过 eBridge 跨链").length).toBeGreaterThan(0);
    expect(screen.getAllByText("资格检查器").length).toBeGreaterThan(0);
    expect(screen.getAllByText("不符合资格").length).toBeGreaterThan(0);
    expect(screen.getByText("完成缺失的必做任务后再进入导出资格。")).toBeInTheDocument();
    expect(screen.getByText("任务验证状态")).toBeInTheDocument();
    expect(screen.getAllByText("等待验证").length).toBeGreaterThan(0);
    expect(screen.getAllByText("失败").length).toBeGreaterThan(0);
    expect(screen.getAllByText("人工审核").length).toBeGreaterThan(0);
    expect(screen.getAllByText("推荐关系").length).toBeGreaterThan(0);
    expect(screen.getAllByText("合格被邀请人").length).toBeGreaterThan(0);
    expect(screen.getByText("排行榜预览")).toBeInTheDocument();
    const exportStatus = screen.getByRole("region", { name: "Winners 导出状态" });
    expect(within(exportStatus).getByRole("heading", { name: "Winners 导出状态" })).toBeInTheDocument();
    expect(within(exportStatus).getAllByText("导出前阻断").length).toBeGreaterThan(0);
    expect(within(exportStatus).getByText(/导出批次/)).toBeInTheDocument();
    expect(within(exportStatus).getByText("任务记录")).toBeInTheDocument();
    expect(within(exportStatus).getByText("证据哈希")).toBeInTheDocument();
    expect(within(exportStatus).getByText("最终奖励发放由活动项目方处理。")).toBeInTheDocument();
    expect(within(exportStatus).getByText(/请先完成缺失的必做任务/)).toBeInTheDocument();
    expect(screen.getAllByText("仅注册不会计分；被邀请人必须完成有效任务后才会产生推荐积分。").length).toBeGreaterThan(0);
  });

  it("opens the seeded wallet connect modal in zh-CN", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "zh-CN" } });
    fireEvent.click(screen.getByRole("button", { name: "用户应用" }));
    fireEvent.click(screen.getByRole("button", { name: "连接钱包" }));

    const dialog = screen.getByRole("dialog", { name: "连接钱包" });

    expect(within(dialog).getByTestId("wallet-modal-group-recommended")).toBeInTheDocument();
    expect(within(dialog).getByTestId("wallet-modal-group-eoa")).toBeInTheDocument();
    expect(within(dialog).getByTestId("wallet-modal-group-advanced")).toBeInTheDocument();
    expect(within(dialog).getByText("Campaign OS 永远不会索要私钥、助记词、恢复短语或密码导出。")).toBeInTheDocument();
    expect(within(dialog).getAllByText("仅 seeded 预览：不会连接实时钱包 SDK，不会请求真实签名，不会发起交易，也不会读写合约。").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("链不匹配：请切换到 AELF mainnet 后再继续活动验证。")).toBeInTheDocument();
    expect(within(dialog).getByText("不支持的钱包：请为该 seeded 活动流程选择 Portkey AA、Portkey EOA App、Portkey EOA Extension 或 NightElf。")).toBeInTheDocument();
    expect(within(dialog).getByText("缺少签名：确认提示内容后只签署 seeded 验证消息；此预览不会请求真实签名。")).toBeInTheDocument();
    expect(within(dialog).getByText("账户类型限制：如果活动只允许 AA 或只允许 EOA，请切换到该活动策略接受的钱包类型。")).toBeInTheDocument();
  });

  it("supports the eligibility checker workflow with seeded and unknown addresses", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    const checker = screen.getByRole("region", { name: "Eligibility checker" });

    expect(within(checker).getByLabelText("Eligibility address")).toHaveValue("3E9...7cD");
    expect(within(checker).getByText("Not eligible")).toBeInTheDocument();
    expect(within(checker).getByText("EOA · Extension")).toBeInTheDocument();
    expect(within(checker).getByText("1/2")).toBeInTheDocument();
    expect(within(checker).getByText("50%")).toBeInTheDocument();
    expect(within(checker).getByText("Bridge via eBridge")).toBeInTheDocument();
    expect(within(checker).getByText(/ON_CHAIN/)).toBeInTheDocument();
    expect(within(checker).getByText(/AA \+ EOA/)).toBeInTheDocument();
    expect(within(checker).getByText("referral_velocity_review")).toBeInTheDocument();

    fireEvent.click(within(checker).getByRole("button", { name: /5N1...4fA/ }));

    expect(within(checker).getByText("Risk flagged")).toBeInTheDocument();
    expect(within(checker).getByText("manual_review_queue")).toBeInTheDocument();
    expect(within(checker).getByText(/manual risk review/i)).toBeInTheDocument();

    fireEvent.change(within(checker).getByLabelText("Eligibility address"), {
      target: { value: "ELF_UNKNOWN_ADDRESS" },
    });
    fireEvent.click(within(checker).getByRole("button", { name: "Check address eligibility" }));

    expect(within(checker).getByText("Pending verification")).toBeInTheDocument();
    expect(within(checker).getByText("Unknown · Other")).toBeInTheDocument();
    expect(within(checker).getByText("Wallet type remains unknown until supported wallet/session verification.")).toBeInTheDocument();
    expect(within(checker).getByText(/cannot infer AA or EOA/)).toBeInTheDocument();
    expect(within(checker).getByText(/Connect or verify/)).toBeInTheDocument();
  });

  it("runs local task verification actions without changing eligibility or export projections", () => {
    render(<UserAppPanel locale="en-US" />);

    const taskVerification = screen.getByRole("heading", { name: "Task verification states" }).closest("section");
    const exportStatus = screen.getByRole("region", { name: "Winners export status" });
    const eligibility = screen.getByRole("region", { name: "Eligibility checker" });

    expect(taskVerification).not.toBeNull();
    expect(within(eligibility).getByText("Not eligible")).toBeInTheDocument();
    expect(within(exportStatus).getAllByText("Blocked before export").length).toBeGreaterThan(0);
    expect(within(exportStatus).getByText("task-bridge:pending:aelfscan")).toBeInTheDocument();

    fireEvent.click(within(taskVerification!).getByRole("button", { name: "Verify task" }));

    const verifyResult = within(taskVerification!).getByRole("article", {
      name: "Latest local action: Bridge via eBridge",
    });
    expect(within(verifyResult).getByText("Local attempt: local-verify-task-bridge")).toBeInTheDocument();
    expect(within(verifyResult).getByText("Action: Verify task")).toBeInTheDocument();
    expect(within(verifyResult).getByText(/No live provider is called by this action/)).toBeInTheDocument();
    expect(within(verifyResult).getByText(/does not approve eligibility/)).toBeInTheDocument();

    fireEvent.click(within(taskVerification!).getByRole("button", { name: "Retry verification" }));
    const retryResult = within(taskVerification!).getByRole("article", {
      name: "Latest local action: Swap on Awaken",
    });
    expect(within(retryResult).getByText("Local attempt: local-retry-task-swap")).toBeInTheDocument();
    expect(within(retryResult).getAllByText(/provider path/i).length).toBeGreaterThan(0);
    expect(within(retryResult).queryByText("Completed")).not.toBeInTheDocument();

    fireEvent.click(within(taskVerification!).getByRole("button", { name: "Submit proof" }));
    const proofResult = within(taskVerification!).getByRole("article", {
      name: "Latest local action: Follow social channel",
    });
    expect(within(proofResult).getByText("Proof type: screenshot")).toBeInTheDocument();
    expect(within(proofResult).getByText("No upload executed")).toBeInTheDocument();

    fireEvent.click(within(taskVerification!).getByRole("button", { name: "View review queue" }));
    const reviewResult = within(taskVerification!).getByRole("article", {
      name: "Latest local action: Agent review smoke check",
    });
    expect(within(reviewResult).getByText("Review queue: review-task-agent-review-3E9")).toBeInTheDocument();
    expect(within(reviewResult).getAllByText(/requires human review/i).length).toBeGreaterThan(0);

    expect(within(taskVerification!).getByRole("button", { name: "Already verified" })).toBeDisabled();
    expect(within(taskVerification!).getByText("Evidence hashes: demo-task-connect-wallet-3E9")).toBeInTheDocument();
    expect(within(eligibility).getByText("Not eligible")).toBeInTheDocument();
    expect(within(exportStatus).getAllByText("Blocked before export").length).toBeGreaterThan(0);
    expect(within(exportStatus).getByText("task-bridge:pending:aelfscan")).toBeInTheDocument();
  });

  it("renders localized local task action labels and boundaries", () => {
    render(<UserAppPanel locale="zh-CN" />);

    const taskVerification = screen.getByRole("heading", { name: "任务验证状态" }).closest("section");

    expect(taskVerification).not.toBeNull();
    expect(within(taskVerification!).getByRole("button", { name: "验证任务" })).toBeInTheDocument();
    expect(within(taskVerification!).getByRole("button", { name: "重试验证" })).toBeInTheDocument();
    expect(within(taskVerification!).getByRole("button", { name: "提交证明" })).toBeInTheDocument();
    expect(within(taskVerification!).getByRole("button", { name: "查看审核队列" })).toBeInTheDocument();
    expect(within(taskVerification!).getByRole("button", { name: "已验证" })).toBeDisabled();

    fireEvent.click(within(taskVerification!).getByRole("button", { name: "提交证明" }));

    const proofResult = within(taskVerification!).getByRole("article", {
      name: "最新本地动作: 关注社交频道",
    });
    expect(within(proofResult).getByText("证明类型: screenshot")).toBeInTheDocument();
    expect(within(proofResult).getByText("未执行上传")).toBeInTheDocument();
    expect(within(proofResult).getByText(/不会批准资格、导出 winners 或发放奖励/)).toBeInTheDocument();
  });

  it("switches leaderboard modes with active state and mode-specific values", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    const leaderboard = screen.getByRole("region", { name: "Leaderboard preview" });
    const referralMode = within(leaderboard).getByRole("button", { name: "Referral" });

    expect(within(leaderboard).getByRole("button", { name: "Total Points" })).toHaveAttribute("aria-pressed", "true");
    expect(within(leaderboard).getByText("Total Points ranks 4 seeded participants.")).toBeInTheDocument();

    fireEvent.click(referralMode);

    expect(referralMode).toHaveAttribute("aria-pressed", "true");
    expect(within(leaderboard).getByText("Referral ranks 4 seeded participants.")).toBeInTheDocument();
    expect(within(leaderboard).getByText("Ranks qualified referral value, not raw signup counts.")).toBeInTheDocument();
    expect(within(leaderboard).getByText(/Only qualified invitees who complete valid tasks count/)).toBeInTheDocument();
    expect(within(leaderboard).getByText("80 / 4")).toBeInTheDocument();
    expect(within(leaderboard).getAllByText("low").length).toBeGreaterThan(0);
    expect(within(leaderboard).getByText(/Seeded\/local leaderboard preview only/)).toBeInTheDocument();
  });

  it("renders zh-CN checker and leaderboard controls", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "zh-CN" } });
    fireEvent.click(screen.getByRole("button", { name: "用户应用" }));

    const checker = screen.getByRole("region", { name: "资格检查器" });
    const leaderboard = screen.getByRole("region", { name: "排行榜预览" });

    expect(within(checker).getByLabelText("资格地址")).toHaveValue("3E9...7cD");
    expect(within(checker).getByRole("button", { name: "检查地址资格" })).toBeInTheDocument();
    fireEvent.change(within(checker).getByLabelText("资格地址"), {
      target: { value: "ELF_UNKNOWN_ADDRESS" },
    });
    fireEvent.click(within(checker).getByRole("button", { name: "检查地址资格" }));
    expect(within(checker).getByText("钱包类型会保持未知，直到通过受支持的钱包/会话验证。")).toBeInTheDocument();
    expect(within(leaderboard).getByRole("button", { name: "邀请" })).toBeInTheDocument();
    expect(within(leaderboard).getByText("当前模式")).toBeInTheDocument();
    expect(within(leaderboard).getByText(/仅 seeded\/本地排行榜预览/)).toBeInTheDocument();
  });

  it("renders zh-TW task readiness as active fallback state in the panel", () => {
    render(<UserAppPanel locale="zh-TW" />);

    expect(screen.getByRole("heading", { name: "活動 Feed" })).toBeInTheDocument();
    expect(screen.getAllByText(/語言 readiness/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/回退|缺失/).length).toBeGreaterThan(0);
    const shareReadiness = screen.getByRole("region", { name: "分享卡片 readiness" });
    expect(within(shareReadiness).getAllByText("https://campaign.local/zh-TW/campaigns/awaken-sprint").length).toBeGreaterThan(0);
    expect(within(shareReadiness).getByText("英文回退")).toBeInTheDocument();
    expect(within(shareReadiness).getAllByText(/English fallback|英文回退/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Forest NFT 任務").length).toBeGreaterThan(0);
    expect(screen.getAllByText("TMRWDAO 治理連續任務").length).toBeGreaterThan(0);
  });
});
