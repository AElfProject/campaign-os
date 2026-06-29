import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublishReadinessPanel } from "./PublishReadinessPanel";

describe("PublishReadinessPanel", () => {
  it("renders blockers, warnings, and passed checks from readiness computation", () => {
    render(<PublishReadinessPanel locale="en-US" />);

    expect(screen.getByRole("heading", { name: "Publish readiness" })).toBeInTheDocument();
    expect(screen.getAllByText("Blockers").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Warnings").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Passed checks").length).toBeGreaterThan(0);
    expect(screen.getByText("Contract claim mode requires high-impact manual review.")).toBeInTheDocument();
    expect(screen.getByText("Switch to Off-chain MVP or complete contract reviewer approval.")).toBeInTheDocument();
    expect(screen.getByText("Review zh-CN and zh-TW content before presenting it as published content.")).toBeInTheDocument();
    expect(screen.getByText("Campaign basics are complete.")).toBeInTheDocument();
  });

  it("localizes readiness reasons, next actions, groups, and owner roles for zh-CN", () => {
    render(<PublishReadinessPanel locale="zh-CN" />);

    expect(screen.getByRole("heading", { name: "发布准备度" })).toBeInTheDocument();
    expect(screen.getAllByText("阻断项").length).toBeGreaterThan(0);
    expect(screen.getAllByText("警告").length).toBeGreaterThan(0);
    expect(screen.getAllByText("已通过检查").length).toBeGreaterThan(0);
    expect(screen.getByText("合约领取模式需要高影响人工审核。")).toBeInTheDocument();
    expect(screen.getByText("切换到 Off-chain MVP，或完成合约审核人批准。")).toBeInTheDocument();
    expect(screen.getByText("zh-CN 与 zh-TW 内容经人工审核后才可作为已发布内容展示。")).toBeInTheDocument();
    expect(screen.getAllByText("合约审核人").length).toBeGreaterThan(0);
  });

  it("localizes readiness chrome to zh-TW and keeps i18n fallback risk visible", () => {
    render(<PublishReadinessPanel locale="zh-TW" />);

    expect(screen.getByRole("heading", { name: "發布準備度" })).toBeInTheDocument();
    expect(screen.getAllByText("阻斷項").length).toBeGreaterThan(0);
    expect(screen.getAllByText("警告").length).toBeGreaterThan(0);
    expect(screen.getAllByText("已通過檢查").length).toBeGreaterThan(0);
    expect(screen.getAllByText("合約審核人").length).toBeGreaterThan(0);
    expect(screen.getByText("zh-CN 与 zh-TW 内容经人工审核后才可作为已发布内容展示。")).toBeInTheDocument();
  });

  it("keeps severity groups visually separated", () => {
    render(<PublishReadinessPanel locale="en-US" />);

    const blockersSection = screen.getByText("Contract claim mode requires high-impact manual review.").closest("article");
    const warningsSection = screen.getByText("Review zh-CN and zh-TW content before presenting it as published content.").closest("article");
    const passedSection = screen.getByText("Campaign basics are complete.").closest("article");

    expect(blockersSection).not.toBeNull();
    expect(warningsSection).not.toBeNull();
    expect(passedSection).not.toBeNull();
    expect(within(blockersSection as HTMLElement).getByText("Contract")).toBeInTheDocument();
    expect(within(warningsSection as HTMLElement).getByText("i18n")).toBeInTheDocument();
    expect(within(passedSection as HTMLElement).getByText("Basics")).toBeInTheDocument();
  });
});
