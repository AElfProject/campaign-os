import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  seededCampaignDraft,
  type CampaignDraft,
} from "../../../../domain";
import type {
  OwnerCampaignBuilderIntentContract,
  OwnerCampaignWorkflowError,
} from "../ownerCampaignWorkflow";
import { projectConsoleCopy } from "../copy";
import { CampaignBuilderPanel } from "./CampaignBuilderPanel";

const ownerContext: OwnerCampaignBuilderIntentContract["ownerContext"] = {
  accountType: "AA",
  address: "ELF_issued_owner_7F3A",
  sessionId: "session-issued-owner",
  sessionKey: "session-issued-owner|ELF_issued_owner_7F3A",
  walletSource: "PORTKEY_AA",
};

const createWorkflow = (
  overrides: Partial<OwnerCampaignBuilderIntentContract> = {},
): OwnerCampaignBuilderIntentContract => ({
  activeCampaignId: null,
  createPending: false,
  createResult: null,
  error: null,
  issuedSessionReady: true,
  onCreate: vi.fn(),
  onReconnect: vi.fn(),
  onRetryDetail: vi.fn(),
  ownerContext,
  status: "empty",
  ...overrides,
});

const workflowError = (
  overrides: Partial<OwnerCampaignWorkflowError> = {},
): OwnerCampaignWorkflowError => ({
  code: "PERSISTENCE_UNAVAILABLE",
  httpStatus: 503,
  message: "Campaign data is temporarily unavailable.",
  operation: "detail",
  reconnectRequired: false,
  retryable: true,
  traceId: "trace-owner-detail-503",
  ...overrides,
});

const renderBuilder = (
  ownerWorkflow = createWorkflow(),
  draft: CampaignDraft = seededCampaignDraft,
) => render(
  <CampaignBuilderPanel
    copy={projectConsoleCopy["en-US"]}
    draft={draft}
    locale="en-US"
    ownerWorkflow={ownerWorkflow}
  />,
);

const activateNativeButton = (button: HTMLElement, key: "Enter" | " ") => {
  const code = key === "Enter" ? "Enter" : "Space";

  button.focus();
  const keyDownAccepted = fireEvent.keyDown(button, { code, key });
  if (key === "Enter" && keyDownAccepted) {
    fireEvent.click(button);
  }
  const keyUpAccepted = fireEvent.keyUp(button, { code, key });
  if (key === " " && keyDownAccepted && keyUpAccepted) {
    fireEvent.click(button);
  }
};

describe("CampaignBuilderPanel", () => {
  it("renders the draft overview and the issued owner supplied by props", () => {
    renderBuilder();

    expect(screen.getByRole("heading", { name: "Draft overview" })).toBeInTheDocument();
    expect(screen.getByText("Awaken Summer Sprint")).toBeInTheDocument();
    expect(screen.getByText("ELF_issued_owner_7F3A")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Any wallet" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("AI Campaign Planner")).toBeInTheDocument();
    expect(screen.getByLabelText("Campaign Creation Workflow Readiness")).toBeInTheDocument();
  });

  it("renders localized zh-CN builder content with the same controlled owner", () => {
    render(
      <CampaignBuilderPanel
        copy={projectConsoleCopy["zh-CN"]}
        locale="zh-CN"
        ownerWorkflow={createWorkflow()}
      />,
    );

    expect(screen.getByRole("heading", { name: "草稿概览" })).toBeInTheDocument();
    expect(screen.getByText("Awaken 夏季冲刺活动")).toBeInTheDocument();
    expect(screen.getByText("ELF_issued_owner_7F3A")).toBeInTheDocument();
    expect(screen.getByLabelText("AI 活动策划")).toBeInTheDocument();
    expect(screen.getByLabelText("活动创建流程 Readiness")).toBeInTheDocument();
  });

  it("emits one typed create intent for a valid controlled form", () => {
    const onCreate = vi.fn();
    renderBuilder(createWorkflow({ onCreate }));

    fireEvent.click(screen.getByRole("button", { name: "Create campaign" }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith({
      contractMode: "OFF_CHAIN_MVP",
      defaultLocale: "en-US",
      duration: "2026-07-01T00:00:00Z/2026-07-21T00:00:00Z",
      endTime: "2026-07-21T00:00:00Z",
      goal: "Awaken: Awaken Summer Sprint (activation)",
      ownerAddress: "ELF_issued_owner_7F3A",
      projectId: "awaken",
      rewardDescription: "Project-funded points and token reward pool.",
      startTime: "2026-07-01T00:00:00Z",
      status: "draft",
      supportedLocales: [
        "en-US",
        "zh-CN",
        "zh-TW",
        "ja-JP",
        "ko-KR",
        "vi-VN",
        "id-ID",
        "tr-TR",
        "es-ES",
      ],
      walletPolicy: "ANY",
    });
  });

  it("guards repeated create submits before controlled pending state renders", () => {
    const onCreate = vi.fn();
    const { rerender } = renderBuilder(createWorkflow({ onCreate }));
    const form = () => screen.getByRole("form", { name: "Owner campaign creation" });

    fireEvent.submit(form());
    fireEvent.submit(form());

    expect(onCreate).toHaveBeenCalledTimes(1);

    rerender(
      <CampaignBuilderPanel
        copy={projectConsoleCopy["en-US"]}
        locale="en-US"
        ownerWorkflow={createWorkflow({ createPending: true, onCreate, status: "creating" })}
      />,
    );
    rerender(
      <CampaignBuilderPanel
        copy={projectConsoleCopy["en-US"]}
        locale="en-US"
        ownerWorkflow={createWorkflow({ onCreate })}
      />,
    );
    fireEvent.submit(form());

    expect(onCreate).toHaveBeenCalledTimes(2);
  });

  it("disables create without an issued session, while pending, or for invalid form data", () => {
    const { rerender } = renderBuilder(createWorkflow({
      issuedSessionReady: false,
      ownerContext: null,
      status: "no_session",
    }));
    const createButton = () => screen.getByRole("button", { name: "Create campaign" });

    expect(createButton()).toBeDisabled();
    expect(createButton()).toHaveAttribute("aria-describedby", "owner-campaign-create-disabled-reason");

    rerender(
      <CampaignBuilderPanel
        copy={projectConsoleCopy["en-US"]}
        locale="en-US"
        ownerWorkflow={createWorkflow({ createPending: true, status: "creating" })}
      />,
    );
    expect(createButton()).toBeDisabled();

    rerender(
      <CampaignBuilderPanel
        copy={projectConsoleCopy["en-US"]}
        draft={{ ...seededCampaignDraft, projectName: "" }}
        locale="en-US"
        ownerWorkflow={createWorkflow()}
      />,
    );
    expect(createButton()).toBeDisabled();
    expect(screen.getByText("Complete the required campaign fields before creating.")).toBeInTheDocument();
  });

  it("announces recovery instead of presenting a disabled create command as ready", () => {
    renderBuilder(createWorkflow({ status: "recovering" }));
    const form = screen.getByRole("form", { name: "Owner campaign creation" });

    expect(within(form).getByRole("status")).toHaveTextContent("Recovering owner campaigns.");
    expect(within(form).getByRole("button", { name: "Create campaign" }))
      .toHaveAccessibleDescription("Recovering owner campaigns.");
  });

  it("renders only the latest canonical campaign identity supplied by props", () => {
    const firstWorkflow = createWorkflow({
      activeCampaignId: "campaign-canonical-first",
      createResult: {
        id: "campaign-canonical-first" as never,
        status: "draft",
      },
      status: "ready",
    });
    const { rerender } = renderBuilder(firstWorkflow);

    expect(screen.getByText("campaign-canonical-first")).toBeInTheDocument();

    rerender(
      <CampaignBuilderPanel
        copy={projectConsoleCopy["en-US"]}
        locale="en-US"
        ownerWorkflow={createWorkflow({
          activeCampaignId: "campaign-canonical-second",
          createResult: {
            id: "campaign-canonical-second" as never,
            status: "draft",
          },
          status: "ready",
        })}
      />,
    );

    expect(screen.getByText("campaign-canonical-second")).toBeInTheDocument();
    expect(screen.queryByText("campaign-canonical-first")).not.toBeInTheDocument();
  });

  it("retries detail without repeating create and retains last-good builder content", () => {
    const onCreate = vi.fn();
    const onRetryDetail = vi.fn();
    renderBuilder(createWorkflow({
      activeCampaignId: "campaign-last-good",
      error: workflowError(),
      onCreate,
      onRetryDetail,
      status: "degraded",
    }));

    const workflow = within(screen.getByRole("complementary", { name: "Owner campaign creation" }));
    expect(workflow.getByRole("alert")).toHaveTextContent("PERSISTENCE_UNAVAILABLE");
    expect(workflow.getByRole("alert")).toHaveTextContent("HTTP 503");
    expect(workflow.getByRole("alert")).toHaveTextContent("trace-owner-detail-503");
    expect(screen.getByText("Awaken Summer Sprint")).toBeInTheDocument();

    fireEvent.click(workflow.getByRole("button", { name: "Retry campaign detail" }));

    expect(onRetryDetail).toHaveBeenCalledTimes(1);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("creates through native Enter activation while retaining focus and live status", () => {
    const onCreate = vi.fn();
    renderBuilder(createWorkflow({ onCreate }));
    const form = screen.getByRole("form", { name: "Owner campaign creation" });
    const button = screen.getByRole("button", { name: "Create campaign" });

    activateNativeButton(button, "Enter");

    expect(button).toHaveFocus();
    expect(button).toHaveStyle({ outlineOffset: "2px" });
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(within(form).getByRole("status")).toHaveTextContent("Ready to create campaign");
  });
});
