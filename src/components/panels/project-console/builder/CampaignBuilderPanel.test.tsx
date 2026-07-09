import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CampaignCreationApiBridgeState } from "../../../../api/campaignCreationApiBridge";
import { projectConsoleCopy } from "../copy";
import { CampaignBuilderPanel } from "./CampaignBuilderPanel";

describe("CampaignBuilderPanel", () => {
  const originalApiBaseUrl = import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL;

  beforeEach(() => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "";
  });

  afterEach(() => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = originalApiBaseUrl;
  });

  it("renders the default English draft overview and wallet policy", () => {
    render(<CampaignBuilderPanel copy={projectConsoleCopy["en-US"]} locale="en-US" />);

    expect(screen.getByRole("heading", { name: "Draft overview" })).toBeInTheDocument();
    expect(screen.getByText("Awaken Summer Sprint")).toBeInTheDocument();
    expect(screen.getByText("Default and fallback: en-US. Supported: en-US, zh-CN, and zh-TW fallback readiness.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Any wallet" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "AA only" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "EOA only" })).toBeInTheDocument();
    expect(screen.getByLabelText("AI Campaign Planner")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recommendation" })).toBeInTheDocument();
    expect(screen.getByText("Campaign structure")).toBeInTheDocument();
    expect(screen.getAllByText("Wallet policy").length).toBeGreaterThan(0);
    expect(screen.getByText("Language plan")).toBeInTheDocument();
    expect(screen.getByText("Task strategy")).toBeInTheDocument();
    expect(screen.getByText("Risk hints")).toBeInTheDocument();
    expect(screen.getByText("Contract recommendation")).toBeInTheDocument();
    expect(screen.getByText("Use Any wallet for conversion")).toBeInTheDocument();
    expect(screen.getByText("Recommend Portkey AA for onboarding")).toBeInTheDocument();
    expect(screen.getByText("Default language is English")).toBeInTheDocument();
    expect(screen.getByText("Recommend Off-chain MVP")).toBeInTheDocument();
    expect(screen.getByText("Keep contract claim blocked")).toBeInTheDocument();
    expect(screen.getAllByText(/No live AI provider/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/no automatic publish/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("zh-TW").length).toBeGreaterThan(0);

    const launchDecision = within(screen.getByLabelText("AI Planner Launch Decision"));
    expect(launchDecision.getByRole("heading", { name: "AI Planner Launch Decision" })).toBeInTheDocument();
    expect(launchDecision.getByText("Awaken Liquidity Challenge")).toBeInTheDocument();
    expect(launchDecision.getByText("Connect wallet")).toBeInTheDocument();
    expect(launchDecision.getByText("Bridge with eBridge")).toBeInTheDocument();
    expect(launchDecision.getByText("Swap on Awaken")).toBeInTheDocument();
    expect(launchDecision.getByText("Share campaign post")).toBeInTheDocument();
    expect(launchDecision.getByText("contract-impact")).toBeInTheDocument();
    expect(launchDecision.getByText("i18n-human-review")).toBeInTheDocument();
    expect(launchDecision.getByText("localized-reward-disclaimer")).toBeInTheDocument();
    expect(launchDecision.getByText("Project owner")).toBeInTheDocument();
    expect(launchDecision.getByText("Internal operator")).toBeInTheDocument();
    expect(launchDecision.getByText("Contract reviewer")).toBeInTheDocument();
    expect(launchDecision.getByText(/No live AI provider/)).toBeInTheDocument();
    expect(launchDecision.getByText(/no automatic publish/)).toBeInTheDocument();
    expect(launchDecision.getByText(/no reward distribution/)).toBeInTheDocument();

    const creationWorkflow = within(screen.getByLabelText("Campaign Creation Workflow Readiness"));
    expect(creationWorkflow.getByRole("heading", { name: "Campaign Creation Workflow Readiness" })).toBeInTheDocument();
    expect(creationWorkflow.getByText("Campaign Goal")).toBeInTheDocument();
    expect(creationWorkflow.getByText("Wallet & Locale Setup")).toBeInTheDocument();
    expect(creationWorkflow.getByText("Task Builder")).toBeInTheDocument();
    expect(creationWorkflow.getByText("Rewards & Eligibility")).toBeInTheDocument();
    expect(creationWorkflow.getByText("i18n Content Review")).toBeInTheDocument();
    expect(creationWorkflow.getByText("Contract Impact Review")).toBeInTheDocument();
    expect(creationWorkflow.getByText("Admin Review")).toBeInTheDocument();
    expect(creationWorkflow.getByText("Publish")).toBeInTheDocument();
    expect(creationWorkflow.getAllByText("Project owner").length).toBeGreaterThan(0);
    expect(creationWorkflow.getAllByText("Internal operator").length).toBeGreaterThan(0);
    expect(creationWorkflow.getAllByText("Contract reviewer").length).toBeGreaterThan(0);
    expect(creationWorkflow.getAllByText("contract-impact").length).toBeGreaterThan(0);
    expect(creationWorkflow.getAllByText("localized-reward-disclaimer").length).toBeGreaterThan(0);
    expect(creationWorkflow.getByText(/No live campaign creation/)).toBeInTheDocument();
    expect(creationWorkflow.getByText(/no automatic publish/)).toBeInTheDocument();
    expect(creationWorkflow.getByText(/no contract execution/)).toBeInTheDocument();
    expect(creationWorkflow.getByText(/no reward distribution/)).toBeInTheDocument();
  });

  it("renders localized zh-CN builder copy", () => {
    render(<CampaignBuilderPanel copy={projectConsoleCopy["zh-CN"]} locale="zh-CN" />);

    expect(screen.getByRole("heading", { name: "草稿概览" })).toBeInTheDocument();
    expect(screen.getByText("Awaken 夏季冲刺活动")).toBeInTheDocument();
    expect(screen.getByText("默认与回退：en-US。支持：en-US、zh-CN 与 zh-TW 回退 readiness。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "任意钱包" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "仅 AA 钱包" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "仅 EOA 钱包" })).toBeInTheDocument();
    expect(screen.getByLabelText("AI 活动策划")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "推荐" })).toBeInTheDocument();
    expect(screen.getByText("活动结构")).toBeInTheDocument();
    expect(screen.getAllByText("钱包策略").length).toBeGreaterThan(0);
    expect(screen.getByText("语言计划")).toBeInTheDocument();
    expect(screen.getByText("任务策略")).toBeInTheDocument();
    expect(screen.getByText("风险提示")).toBeInTheDocument();
    expect(screen.getByText("合约建议")).toBeInTheDocument();
    expect(screen.getByText("使用任意钱包提升转化")).toBeInTheDocument();
    expect(screen.getByText("推荐 Portkey AA 新手引导")).toBeInTheDocument();
    expect(screen.getByText("默认语言为英文")).toBeInTheDocument();
    expect(screen.getByText("推荐 Off-chain MVP")).toBeInTheDocument();
    expect(screen.getByText("保持合约领取阻断")).toBeInTheDocument();
    expect(screen.getAllByText(/不会执行实时 AI provider/).length).toBeGreaterThan(0);

    const launchDecision = within(screen.getByLabelText("AI Planner 发布决策"));
    expect(launchDecision.getByRole("heading", { name: "AI Planner 发布决策" })).toBeInTheDocument();
    expect(launchDecision.getByText("Awaken 流动性挑战")).toBeInTheDocument();
    expect(launchDecision.getByText("连接钱包")).toBeInTheDocument();
    expect(launchDecision.getByText("使用 eBridge 跨链")).toBeInTheDocument();
    expect(launchDecision.getByText("在 Awaken Swap")).toBeInTheDocument();
    expect(launchDecision.getByText("分享活动动态")).toBeInTheDocument();
    expect(launchDecision.getByText("contract-impact")).toBeInTheDocument();
    expect(launchDecision.getByText("i18n-human-review")).toBeInTheDocument();
    expect(launchDecision.getByText("localized-reward-disclaimer")).toBeInTheDocument();
    expect(launchDecision.getByText("项目方")).toBeInTheDocument();
    expect(launchDecision.getByText("内部运营")).toBeInTheDocument();
    expect(launchDecision.getByText("合约审核人")).toBeInTheDocument();
    expect(launchDecision.getByText(/不会执行实时 AI provider/)).toBeInTheDocument();
    expect(launchDecision.getAllByText(/自动发布/).length).toBeGreaterThan(0);
    expect(launchDecision.getAllByText(/奖励发放/).length).toBeGreaterThan(0);

    const creationWorkflow = within(screen.getByLabelText("活动创建流程 Readiness"));
    expect(creationWorkflow.getByRole("heading", { name: "活动创建流程 Readiness" })).toBeInTheDocument();
    expect(creationWorkflow.getByText("活动目标")).toBeInTheDocument();
    expect(creationWorkflow.getByText("钱包与语言设置")).toBeInTheDocument();
    expect(creationWorkflow.getByText("任务构建器")).toBeInTheDocument();
    expect(creationWorkflow.getByText("奖励与资格")).toBeInTheDocument();
    expect(creationWorkflow.getByText("i18n 内容审核")).toBeInTheDocument();
    expect(creationWorkflow.getByText("合约影响审核")).toBeInTheDocument();
    expect(creationWorkflow.getByText("管理员审核")).toBeInTheDocument();
    expect(creationWorkflow.getByText("发布")).toBeInTheDocument();
    expect(creationWorkflow.getAllByText("项目方").length).toBeGreaterThan(0);
    expect(creationWorkflow.getAllByText("内部运营").length).toBeGreaterThan(0);
    expect(creationWorkflow.getAllByText("合约审核人").length).toBeGreaterThan(0);
    expect(creationWorkflow.getByText(/不会创建实时活动/)).toBeInTheDocument();
    expect(creationWorkflow.getAllByText(/自动发布/).length).toBeGreaterThan(0);
    expect(creationWorkflow.getAllByText(/奖励发放/).length).toBeGreaterThan(0);
  });

  it("shows API-backed create/list metadata after creating a local review draft", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    const apiState: CampaignCreationApiBridgeState = {
      boundary: {
        "en-US": "Local API review only; no production database, wallet signature, contract write, reward custody, or reward distribution is executed.",
        "zh-CN": "Local API review only.",
        "zh-TW": "Local API review only.",
      },
      campaignCount: 4,
      configured: true,
      createdDraftId: "draft-api-visible-1234567890",
      diagnostics: [],
      listContainsCreatedDraft: true,
      loading: false,
      persistence: {
        kind: "campaign_draft",
        recordId: "record-api-visible",
      },
      repository: {
        createdViaRepository: true,
        draftId: "draft-api-visible-1234567890",
        storeId: "campaign-db",
      },
      source: "api_runtime",
      status: "created",
      traceId: "trace-project-console-visible-1234567890",
    };
    const bridgeRunner = vi.fn(async () => apiState);

    render(
      <CampaignBuilderPanel
        bridgeRunner={bridgeRunner}
        copy={projectConsoleCopy["en-US"]}
        locale="en-US"
      />,
    );

    const review = screen.getByRole("complementary", { name: "Local API campaign creation review" });
    fireEvent.click(within(review).getByRole("button", { name: "Create local API draft" }));

    await waitFor(() => expect(within(review).getByText("draft-api-visible-1234567890")).toBeInTheDocument());
    expect(bridgeRunner).toHaveBeenCalledWith(expect.objectContaining({
      draft: expect.objectContaining({
        contractMode: "OFF_CHAIN_MVP",
        duration: "2026-07-01T00:00:00Z/2026-07-21T00:00:00Z",
        ownerAddress: "ELF_local_review_owner",
        projectId: "awaken",
        walletPolicy: "ANY",
      }),
      seededCampaignCount: 1,
    }));
    expect(within(review).getAllByText("API runtime").length).toBeGreaterThan(0);
    expect(within(review).getByText("trace-project-console-visible-1234567890")).toBeInTheDocument();
    expect(within(review).getByText("createdViaRepository: true")).toBeInTheDocument();
    expect(within(review).getByText("campaign-db")).toBeInTheDocument();
    expect(within(review).getByText("record-api-visible")).toBeInTheDocument();
    expect(within(review).getByText("4")).toBeInTheDocument();
    expect(within(review).getByText("Created draft confirmed in refreshed list")).toBeInTheDocument();
    expect(screen.getByText("Awaken Summer Sprint")).toBeInTheDocument();
  });

  it("shows seeded fallback when local API config is missing while preserving builder content", () => {
    render(<CampaignBuilderPanel copy={projectConsoleCopy["en-US"]} locale="en-US" />);

    const review = screen.getByRole("complementary", { name: "Local API campaign creation review" });

    expect(within(review).getAllByText("Seeded fallback").length).toBeGreaterThan(0);
    expect(within(review).getByText("Local API base URL is not configured; seeded builder review remains available.")).toBeInTheDocument();
    expect(within(review).getByRole("button", { name: "Create local API draft" })).toBeDisabled();
    expect(within(review).getByText("No API draft yet")).toBeInTheDocument();
    expect(screen.getByText("Awaken Summer Sprint")).toBeInTheDocument();
    expect(screen.getByLabelText("Campaign Creation Workflow Readiness")).toBeInTheDocument();
  });

  it("shows sanitized error fallback diagnostics without blanking seeded content", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    const bridgeRunner = vi.fn(async (): Promise<CampaignCreationApiBridgeState> => ({
      boundary: {
        "en-US": "Local API review only; no production database, wallet signature, contract write, reward custody, or reward distribution is executed.",
        "zh-CN": "Local API review only.",
        "zh-TW": "Local API review only.",
      },
      campaignCount: 1,
      configured: true,
      diagnostics: [
        {
          code: "API_REQUEST_FAILED",
          message: {
            "en-US": "The local API request failed, so the seeded campaign builder remains visible.",
            "zh-CN": "The local API request failed, so the seeded campaign builder remains visible.",
            "zh-TW": "The local API request failed, so the seeded campaign builder remains visible.",
          },
          safeDetails: {
            reason: "redacted credential from redacted private path",
          },
          severity: "error",
        },
      ],
      loading: false,
      source: "error_fallback",
      status: "error",
      traceId: "trace-error-safe",
    }));

    const { container } = render(
      <CampaignBuilderPanel
        bridgeRunner={bridgeRunner}
        copy={projectConsoleCopy["en-US"]}
        locale="en-US"
      />,
    );
    const review = screen.getByRole("complementary", { name: "Local API campaign creation review" });

    fireEvent.click(within(review).getByRole("button", { name: "Create local API draft" }));

    await waitFor(() => expect(within(review).getAllByText("Error fallback").length).toBeGreaterThan(0));
    expect(within(review).getByText(/The local API request failed/)).toBeInTheDocument();
    expect(within(review).getByText(/redacted credential from redacted private path/)).toBeInTheDocument();
    expect(within(review).getByText("trace-error-safe")).toBeInTheDocument();
    expect(screen.getByText("Awaken Summer Sprint")).toBeInTheDocument();

    const renderedText = container.textContent?.toLowerCase() ?? "";
    for (const forbidden of ["private key", "seed phrase", "bearer token", "raw signature", "provider payload", "campaign-os-kitty"]) {
      expect(renderedText).not.toContain(forbidden);
    }
  });
});
