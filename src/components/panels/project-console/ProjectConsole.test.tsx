import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../../app/App";

describe("Project Console shell", () => {
  it("renders the default English Project Console with seeded operational data", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "Project Console" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Awaken Sprint")).toBeInTheDocument();
    expect(screen.getByText("Connected wallets")).toBeInTheDocument();
    expect(screen.getByText("AA · Portkey")).toBeInTheDocument();
    expect(screen.getByText("AI Campaign Planner")).toBeInTheDocument();
    expect(screen.getAllByText("Task Builder Preview")).toHaveLength(2);
    expect(screen.getByText("Rewards & Eligibility")).toBeInTheDocument();
    expect(screen.getByText("i18n Translation Review")).toBeInTheDocument();
    expect(screen.getByText("Contract Impact Review")).toBeInTheDocument();
    expect(screen.getByText("Analytics and Export")).toBeInTheDocument();
    expect(screen.getByText("Export winners does not distribute rewards.")).toBeInTheDocument();
  });

  it("switches major Project Console copy manually to zh-CN", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "zh-CN" } });

    expect(screen.getByRole("heading", { name: "活动运营工作台" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "项目控制台" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Awaken 冲刺活动")).toBeInTheDocument();
    expect(screen.getByText("已连接钱包")).toBeInTheDocument();
    expect(screen.getByText("AI 活动策划")).toBeInTheDocument();
    expect(screen.getAllByText("任务构建预览")).toHaveLength(2);
    expect(screen.getByText("奖励与资格")).toBeInTheDocument();
    expect(screen.getByText("合约影响审核")).toBeInTheDocument();
    expect(screen.getByText("符合资格")).toBeInTheDocument();
    expect(screen.getByText("缺失任务")).toBeInTheDocument();
    expect(screen.getByText("导出 winners 不等于发奖。")).toBeInTheDocument();
    expect(screen.getByText("中文内容在审核前回退展示英文。")).toBeInTheDocument();
  });

  it("keeps User App and Admin/Ops as visible navigation placeholders", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "User App" }));
    expect(screen.getByRole("heading", { name: "User App" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Admin/Ops" }));
    expect(screen.getByRole("heading", { name: "Admin/Ops" })).toBeInTheDocument();
  });
});
