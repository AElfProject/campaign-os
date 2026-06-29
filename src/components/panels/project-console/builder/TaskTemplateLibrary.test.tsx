import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TaskTemplateLibrary } from "./TaskTemplateLibrary";

describe("TaskTemplateLibrary", () => {
  it("renders all required task template categories", () => {
    render(<TaskTemplateLibrary locale="en-US" />);

    for (const category of ["wallet", "bridge", "swap", "nft", "dao", "daipp", "social", "invite"]) {
      expect(screen.getByText(category)).toBeInTheDocument();
    }
  });

  it("shows verification, wallet compatibility, points, locale readiness, and risk", () => {
    render(<TaskTemplateLibrary locale="en-US" />);

    expect(screen.getByText("Connect wallet")).toBeInTheDocument();
    expect(screen.getByText("8 of 8 templates")).toBeInTheDocument();
    expect(screen.getByText("WALLET")).toBeInTheDocument();
    expect(screen.getAllByText("AA + EOA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Default points")).toHaveLength(8);
    expect(screen.getByText("40")).toBeInTheDocument();
    expect(screen.getAllByText("zh-CN ai_draft").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/zh-TW/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("high").length).toBeGreaterThan(0);
  });

  it("localizes template titles for zh-CN", () => {
    render(<TaskTemplateLibrary locale="zh-CN" />);

    expect(screen.getByText("任务模板库")).toBeInTheDocument();
    expect(screen.getByText("连接钱包")).toBeInTheDocument();
    expect(screen.getAllByText("默认积分")).toHaveLength(8);
  });

  it("filters templates by verification type through accessible controls", () => {
    render(<TaskTemplateLibrary locale="en-US" />);

    fireEvent.click(screen.getByLabelText("On-chain"));

    expect(screen.getByText("3 of 8 templates")).toBeInTheDocument();
    expect(screen.getByText("Bridge with eBridge")).toBeInTheDocument();
    expect(screen.getByText("Hold campaign NFT")).toBeInTheDocument();
    expect(screen.getByText("Vote in DAO proposal")).toBeInTheDocument();
    expect(screen.queryByText("Connect wallet")).not.toBeInTheDocument();
    expect(screen.queryByText("Swap on Awaken")).not.toBeInTheDocument();
  });

  it("composes wallet, verification, and language filters", () => {
    render(<TaskTemplateLibrary locale="en-US" />);

    fireEvent.click(screen.getByLabelText("EOA"));
    fireEvent.click(screen.getByLabelText("On-chain"));
    fireEvent.click(screen.getByLabelText("Chinese fallback"));

    expect(screen.getByText("1 of 8 templates")).toBeInTheDocument();
    expect(screen.getByText("Vote in DAO proposal")).toBeInTheDocument();
    expect(screen.queryByText("Invite a qualified friend")).not.toBeInTheDocument();
    expect(screen.getByText("EOA only")).toBeInTheDocument();
    expect(screen.getAllByText("Chinese fallback").length).toBeGreaterThanOrEqual(1);
  });

  it("shows an empty state and resets filters", () => {
    render(<TaskTemplateLibrary locale="en-US" />);

    fireEvent.click(screen.getByLabelText("Any"));
    fireEvent.click(screen.getByLabelText("Manual"));
    fireEvent.click(screen.getByLabelText("Chinese reviewed"));

    expect(screen.getByText("0 of 8 templates")).toBeInTheDocument();
    expect(screen.getByText("No task templates match the selected filters.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));

    expect(screen.getByText("8 of 8 templates")).toBeInTheDocument();
    expect(screen.getByText("Connect wallet")).toBeInTheDocument();
    expect(screen.getByText("Invite a qualified friend")).toBeInTheDocument();
  });

  it("localizes filter controls and state for zh-CN while retaining zh-TW readiness badges", () => {
    render(<TaskTemplateLibrary locale="zh-CN" />);
    const filters = screen.getByRole("group", { name: "筛选" });

    expect(within(filters).getByText("钱包兼容性")).toBeInTheDocument();
    expect(within(filters).getByLabelText("链上")).toBeInTheDocument();
    expect(within(filters).getByLabelText("中文回退")).toBeInTheDocument();
    expect(screen.getByText("8 / 8 个模板")).toBeInTheDocument();

    fireEvent.click(within(filters).getByLabelText("人工"));

    expect(screen.getByText("0 / 8 个模板")).toBeInTheDocument();
    expect(screen.getByText("没有任务模板匹配当前筛选条件。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重置筛选" }));
    expect(screen.getAllByText(/zh-TW/).length).toBeGreaterThan(0);
  });
});
