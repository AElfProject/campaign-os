import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../../app/App";

describe("Admin/Ops shell", () => {
  it("renders review gates, contract boundaries, and export preview", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Admin/Ops" }));

    expect(screen.getByRole("heading", { name: "Review queue" })).toBeInTheDocument();
    expect(screen.getByText("Chinese copy needs human review")).toBeInTheDocument();
    expect(screen.getByText("Off-chain MVP: no contract migration required")).toBeInTheDocument();
    expect(screen.getByText("Chinese AI draft/fallback")).toBeInTheDocument();
    expect(screen.getByText("No auto-publish: human review is required before Chinese draft can ship.")).toBeInTheDocument();
    expect(screen.getByText("CONTRACT CLAIM")).toBeInTheDocument();
    expect(screen.getByText("Contract claim is blocked pending high-impact manual review.")).toBeInTheDocument();
    expect(screen.getByText("Export winners does not distribute rewards.")).toBeInTheDocument();
    expect(screen.getByText("3E9...7cD")).toBeInTheDocument();
    expect(screen.getByText("referral_velocity_review")).toBeInTheDocument();
  });

  it("switches Admin/Ops copy manually to zh-CN", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "zh-CN" } });
    fireEvent.click(screen.getByRole("button", { name: "管理员/Ops" }));

    expect(screen.getByRole("heading", { name: "审核队列" })).toBeInTheDocument();
    expect(screen.getByText("AI 内容审核")).toBeInTheDocument();
    expect(screen.getByText("禁止自动发布：中文草稿发布前必须经过人工审核。")).toBeInTheDocument();
    expect(screen.getByText("合约影响审核")).toBeInTheDocument();
    expect(screen.getByText("Contract claim 已阻断，等待高影响人工审核。")).toBeInTheDocument();
    expect(screen.getByText("导出 winners 不等于发奖。")).toBeInTheDocument();
  });
});
