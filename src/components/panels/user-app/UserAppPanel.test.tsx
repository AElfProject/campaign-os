import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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
    expect(screen.getByText("Portkey AA Wallet")).toBeInTheDocument();
    expect(screen.getByText("Portkey EOA App")).toBeInTheDocument();
    expect(screen.getByText("Portkey EOA Extension")).toBeInTheDocument();
    expect(screen.getByText("NightElf Wallet")).toBeInTheDocument();
    expect(screen.getByText("Agent Skill Wallet")).toBeInTheDocument();
    expect(screen.getByText("Internal/advanced")).toBeInTheDocument();
    expect(screen.getByText("Bridge via eBridge")).toBeInTheDocument();
    expect(screen.getByText("Eligibility checker")).toBeInTheDocument();
    expect(screen.getByText("referral_velocity_review")).toBeInTheDocument();
    expect(screen.getByText("Seeded shell preview; points and rank are not a live ledger.")).toBeInTheDocument();
  });

  it("switches User App copy manually to zh-CN", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "zh-CN" } });
    fireEvent.click(screen.getByRole("button", { name: "用户应用" }));

    expect(screen.getByRole("heading", { name: "Awaken 冲刺活动" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "连接钱包" })).toBeInTheDocument();
    expect(screen.getByText("Campaign OS 永远不会索要私钥或助记词。")).toBeInTheDocument();
    expect(screen.getByText("钱包选项")).toBeInTheDocument();
    expect(screen.getByText("通过 eBridge 跨链")).toBeInTheDocument();
    expect(screen.getByText("资格检查器")).toBeInTheDocument();
    expect(screen.getByText("不符合资格")).toBeInTheDocument();
    expect(screen.getByText("完成缺失的必做任务后再进入导出资格。")).toBeInTheDocument();
  });
});
