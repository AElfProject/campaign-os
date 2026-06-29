import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublishGateDecisionCenter } from "./PublishGateDecisionCenter";

describe("PublishGateDecisionCenter", () => {
  it("renders the English publish gate decision surface from the domain read model", () => {
    render(<PublishGateDecisionCenter locale="en-US" />);

    expect(screen.getByRole("heading", { name: "Publish Gate Decision Center" })).toBeInTheDocument();
    expect(screen.getAllByText("Launch gate").length).toBeGreaterThan(0);
    expect(screen.getByText("Approval routing")).toBeInTheDocument();
    expect(screen.getByText(/no real publish/i)).toBeInTheDocument();
    expect(screen.getByText("Any wallet allows AA and EOA users to participate.")).toBeInTheDocument();
    expect(screen.getByText("Contract claim mode requires high-impact manual review.")).toBeInTheDocument();
    expect(
      screen.getByText("Exporting winners does not distribute rewards disclaimer is accepted."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("localizes the decision center to zh-CN", () => {
    render(<PublishGateDecisionCenter locale="zh-CN" />);

    expect(screen.getByRole("heading", { name: "发布门禁决策中心" })).toBeInTheDocument();
    expect(screen.getAllByText("发布门禁").length).toBeGreaterThan(0);
    expect(screen.getAllByText("项目方").length).toBeGreaterThan(0);
    expect(screen.getAllByText("内部运营").length).toBeGreaterThan(0);
    expect(screen.getAllByText("合约审核人").length).toBeGreaterThan(0);
    expect(screen.getByText("合约领取模式需要高影响人工审核。")).toBeInTheDocument();
    expect(screen.getByText("导出 winners 不等于发奖的声明已确认。")).toBeInTheDocument();
    expect(screen.getByText(/不执行真实发布/)).toBeInTheDocument();
  });

  it("localizes the decision center chrome to zh-TW", () => {
    render(<PublishGateDecisionCenter locale="zh-TW" />);

    expect(screen.getByRole("heading", { name: "發布門禁決策中心" })).toBeInTheDocument();
    expect(screen.getAllByText("發布門禁").length).toBeGreaterThan(0);
    expect(screen.getAllByText("專案方").length).toBeGreaterThan(0);
    expect(screen.getAllByText("內部營運").length).toBeGreaterThan(0);
    expect(screen.getAllByText("合約審核人").length).toBeGreaterThan(0);
    expect(screen.getByText(/高影响门禁/)).toBeInTheDocument();
  });

  it("shows project owner, internal operator, and contract reviewer approval route cards", () => {
    render(<PublishGateDecisionCenter locale="en-US" />);

    const approvalRouting = screen.getByLabelText("Approval routing");

    expect(within(approvalRouting).getAllByText("Project owner").length).toBeGreaterThan(0);
    expect(within(approvalRouting).getAllByText("Internal operator").length).toBeGreaterThan(0);
    expect(within(approvalRouting).getAllByText("Contract reviewer").length).toBeGreaterThan(0);
    expect(within(approvalRouting).getByText("contract-impact")).toBeInTheDocument();
    expect(within(approvalRouting).getByText("risk-referral-controls")).toBeInTheDocument();
    expect(within(approvalRouting).getByText("wallet-policy")).toBeInTheDocument();
  });
});
