import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
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
    expect(screen.getByText("WALLET")).toBeInTheDocument();
    expect(screen.getAllByText("AA + EOA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Default points")).toHaveLength(8);
    expect(screen.getByText("40")).toBeInTheDocument();
    expect(screen.getAllByText("zh-CN ai_draft").length).toBeGreaterThan(0);
    expect(screen.getAllByText("high").length).toBeGreaterThan(0);
  });

  it("localizes template titles for zh-CN", () => {
    render(<TaskTemplateLibrary locale="zh-CN" />);

    expect(screen.getByText("任务模板库")).toBeInTheDocument();
    expect(screen.getByText("连接钱包")).toBeInTheDocument();
    expect(screen.getAllByText("默认积分")).toHaveLength(8);
  });
});
