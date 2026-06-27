import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../../app/App";

describe("User App shell", () => {
  it("renders participant campaign detail, wallet options, tasks, and eligibility", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    expect(screen.getByRole("heading", { name: "Campaign Feed" })).toBeInTheDocument();
    expect(screen.getByText("Find live aelf campaigns, points, time left, core tasks, and eligibility entry points.")).toBeInTheDocument();
    expect(screen.getByText("Forest NFT Quest")).toBeInTheDocument();
    expect(screen.getByText("TMRWDAO Governance Streak")).toBeInTheDocument();
    expect(screen.getByText("Seeded campaign feed preview; campaign discovery is not a live marketplace API.")).toBeInTheDocument();
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
    expect(screen.getByText("Complete Bridge via eBridge before this ecosystem action.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect Wallet" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Check eligibility" }).length).toBeGreaterThan(0);
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
    expect(screen.getByText("Pending verification")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getAllByText("Manual review").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Referral context").length).toBeGreaterThan(0);
    expect(screen.getByText("Raw signups do not count; invitees must complete valid tasks before referral points are awarded.")).toBeInTheDocument();
    expect(screen.getByText("Qualified invitees")).toBeInTheDocument();
    expect(screen.getByText("Leaderboard preview")).toBeInTheDocument();
    expect(screen.getAllByText("AA · Portkey").length).toBeGreaterThan(0);
    expect(screen.getAllByText("EOA · NightElf").length).toBeGreaterThan(0);
    expect(screen.getAllByText("EOA · Extension").length).toBeGreaterThan(0);
    expect(screen.getAllByText("referral_velocity_review").length).toBeGreaterThan(0);
    expect(screen.getByText("Seeded shell preview; points and rank are not a live ledger.")).toBeInTheDocument();
    expect(screen.getAllByText("Rewards are provided by the campaign project. Export winners does not distribute rewards.").length).toBeGreaterThan(0);
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

  it("switches User App copy manually to zh-CN", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "zh-CN" } });
    fireEvent.click(screen.getByRole("button", { name: "用户应用" }));

    expect(screen.getByRole("heading", { name: "活动 Feed" })).toBeInTheDocument();
    expect(screen.getByText("展示进行中的 aelf 活动、可获得积分、剩余时间、核心任务与资格入口。")).toBeInTheDocument();
    expect(screen.getByText("Forest NFT 任务")).toBeInTheDocument();
    expect(screen.getByText("TMRWDAO 治理连续任务")).toBeInTheDocument();
    expect(screen.getByText("仅 seeded 活动 Feed 预览；活动发现未接入实时 marketplace API。")).toBeInTheDocument();
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
    expect(screen.getByRole("heading", { name: "Awaken 冲刺活动" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "连接钱包" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "检查资格" }).length).toBeGreaterThan(0);
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
    expect(screen.getByText("等待验证")).toBeInTheDocument();
    expect(screen.getByText("失败")).toBeInTheDocument();
    expect(screen.getAllByText("人工审核").length).toBeGreaterThan(0);
    expect(screen.getAllByText("推荐关系").length).toBeGreaterThan(0);
    expect(screen.getByText("合格被邀请人")).toBeInTheDocument();
    expect(screen.getByText("排行榜预览")).toBeInTheDocument();
    expect(screen.getByText("仅注册不会计分；被邀请人必须完成有效任务后才会产生推荐积分。")).toBeInTheDocument();
    expect(screen.queryByText("zh-TW")).not.toBeInTheDocument();
  });

  it("opens the seeded wallet connect modal in zh-CN without zh-TW copy", () => {
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
    expect(screen.queryByText("zh-TW")).not.toBeInTheDocument();
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
    expect(screen.queryByText("zh-TW")).not.toBeInTheDocument();
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

  it("renders zh-CN checker and leaderboard controls without zh-TW", () => {
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
    expect(screen.queryByText("zh-TW")).not.toBeInTheDocument();
  });
});
