import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("Campaign OS app shell", () => {
  it("renders the default English shell with all surfaces exposed", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Campaign operations shell" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Project Console" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "User App" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Admin/Ops" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
    expect(screen.getByText("Connected wallets")).toBeInTheDocument();
  });

  it("switches major shell copy manually to zh-CN", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "zh-CN" } });

    expect(screen.getByRole("heading", { name: "活动运营工作台" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "项目控制台" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "用户应用" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "管理员/Ops" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Awaken 冲刺活动" })).toBeInTheDocument();
    expect(screen.getByText("已连接钱包")).toBeInTheDocument();
  });

  it("exposes wallet options and export disclaimer across user and admin surfaces", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    expect(screen.getByText("Portkey AA Wallet")).toBeInTheDocument();
    expect(screen.getByText("Portkey EOA App")).toBeInTheDocument();
    expect(screen.getByText("Portkey EOA Extension")).toBeInTheDocument();
    expect(screen.getAllByText("AA + EOA").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Admin/Ops" }));

    expect(screen.getByText("Export winners does not distribute rewards.")).toBeInTheDocument();
  });
});
