import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../../app/App";

describe("User App shell", () => {
  it("renders participant campaign detail, wallet options, tasks, and eligibility", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect Wallet" })).toBeInTheDocument();
    expect(screen.getByText("Campaign OS never asks for private keys or seed phrases.")).toBeInTheDocument();
    expect(screen.getByText("Wallet connection is limited to connection and message signing in this shell.")).toBeInTheDocument();
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
    expect(screen.getByText("Manual review")).toBeInTheDocument();
    expect(screen.getByText("Referral context")).toBeInTheDocument();
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

  it("switches User App copy manually to zh-CN", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "zh-CN" } });
    fireEvent.click(screen.getByRole("button", { name: "用户应用" }));

    expect(screen.getByRole("heading", { name: "Awaken 冲刺活动" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "连接钱包" })).toBeInTheDocument();
    expect(screen.getByText("Campaign OS 永远不会索要私钥或助记词。")).toBeInTheDocument();
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
    expect(screen.getByText("人工审核")).toBeInTheDocument();
    expect(screen.getByText("推荐关系")).toBeInTheDocument();
    expect(screen.getByText("合格被邀请人")).toBeInTheDocument();
    expect(screen.getByText("排行榜预览")).toBeInTheDocument();
    expect(screen.getByText("仅注册不会计分；被邀请人必须完成有效任务后才会产生推荐积分。")).toBeInTheDocument();
    expect(screen.queryByText("zh-TW")).not.toBeInTheDocument();
  });
});
