import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { projectConsoleCopy } from "../copy";
import { CampaignBuilderPanel } from "./CampaignBuilderPanel";

describe("CampaignBuilderPanel", () => {
  it("renders the default English draft overview and wallet policy", () => {
    render(<CampaignBuilderPanel copy={projectConsoleCopy["en-US"]} locale="en-US" />);

    expect(screen.getByRole("heading", { name: "Draft overview" })).toBeInTheDocument();
    expect(screen.getByText("Awaken Summer Sprint")).toBeInTheDocument();
    expect(screen.getByText("Default and fallback: en-US. Supported: en-US and zh-CN.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Any wallet" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "AA only" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "EOA only" })).toBeInTheDocument();
    expect(screen.queryByText("zh-TW")).not.toBeInTheDocument();
  });

  it("renders localized zh-CN builder copy", () => {
    render(<CampaignBuilderPanel copy={projectConsoleCopy["zh-CN"]} locale="zh-CN" />);

    expect(screen.getByRole("heading", { name: "草稿概览" })).toBeInTheDocument();
    expect(screen.getByText("Awaken 夏季冲刺活动")).toBeInTheDocument();
    expect(screen.getByText("默认与回退：en-US。支持：en-US 和 zh-CN。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "任意钱包" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "仅 AA 钱包" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "仅 EOA 钱包" })).toBeInTheDocument();
  });
});
