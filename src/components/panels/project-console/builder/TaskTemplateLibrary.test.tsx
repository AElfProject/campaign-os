import "@testing-library/jest-dom/vitest";
import { useEffect, useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  taskTemplateLibrary,
  type TaskTemplate,
} from "../../../../domain";
import type {
  OwnerCampaignDetailSuccess,
  OwnerTaskPreview,
  OwnerTaskPreviewSuggestion,
} from "../../../../api/projectOwnerCampaignApiBridge";
import {
  createOwnerCampaignAddPendingTargetKey,
  createOwnerCampaignAdoptPendingTargetKey,
  ownerCampaignGeneratePendingTargetKey,
  type OwnerCampaignTaskIntentContract,
  type OwnerCampaignWorkflowError,
  type OwnerCampaignRequestOperation,
  type OwnerCampaignTaskPendingTargetKey,
} from "../ownerCampaignWorkflow";
import { TaskTemplateLibrary } from "./TaskTemplateLibrary";

const ownerContext: OwnerCampaignTaskIntentContract["ownerContext"] = {
  accountType: "AA",
  address: "ELF_issued_owner_7F3A",
  sessionId: "session-issued-owner",
  sessionKey: "session-issued-owner|ELF_issued_owner_7F3A",
  walletSource: "PORTKEY_AA",
};

const canonicalTask = {
  campaignId: "campaign-canonical" as never,
  evidenceRule: { source: "AELFSCAN" },
  id: "task-canonical-001" as never,
  points: 120,
  required: true,
  templateCode: "bridge-ebridge",
  verificationType: "ON_CHAIN",
  walletCompatibility: "ANY",
};

const detail: OwnerCampaignDetailSuccess = {
  campaign: {
    id: "campaign-canonical" as never,
    projectId: "awaken",
    status: "draft",
  },
  httpStatus: 200,
  ok: true,
  tasks: [canonicalTask],
  traceId: "trace-detail-success",
};

const suggestion = (
  overrides: Partial<OwnerTaskPreviewSuggestion> = {},
): OwnerTaskPreviewSuggestion => ({
  adoptable: true,
  campaignId: "campaign-canonical" as never,
  evidenceRule: { category: "wallet", source: "WALLET_SESSION" },
  id: "suggestion-wallet-connect" as never,
  points: 40,
  required: true,
  templateCode: "wallet-connect",
  verificationType: "WALLET",
  walletCompatibility: "ANY",
  ...overrides,
});

const unknownTemplate = (): TaskTemplate => ({
  ...taskTemplateLibrary[0],
  id: "tpl-unknown-provider-task",
  title: {
    "en-US": "Unknown provider task",
    "zh-CN": "未知 provider 任务",
    "zh-TW": "未知 provider 任務",
  },
});

const preview = (
  suggestions: readonly OwnerTaskPreviewSuggestion[],
): OwnerTaskPreview => ({
  campaignId: "campaign-canonical" as never,
  humanReviewRequired: true,
  suggestions,
});

const createWorkflow = (
  overrides: Partial<OwnerCampaignTaskIntentContract> = {},
): OwnerCampaignTaskIntentContract => ({
  activeCampaignId: "campaign-canonical",
  commandsDisabled: false,
  detail,
  error: null,
  issuedSessionReady: true,
  onAdd: vi.fn(),
  onAdopt: vi.fn(),
  onGenerate: vi.fn(),
  onReconnect: vi.fn(),
  onRetryDetail: vi.fn(),
  ownerContext,
  pendingCommand: null,
  pendingTargetKey: null,
  preview: null,
  status: "ready",
  tasks: detail.tasks,
  ...overrides,
});

const workflowError = (
  httpStatus: 400 | 401 | 403 | 503,
): OwnerCampaignWorkflowError => {
  const byStatus = {
    400: {
      code: "INVALID_REQUEST",
      message: "Owner campaign request was invalid.",
      reconnectRequired: false,
      retryable: false,
    },
    401: {
      code: "AUTH_SESSION_REQUIRED",
      message: "Wallet session is no longer valid. Reconnect and try again.",
      reconnectRequired: true,
      retryable: false,
    },
    403: {
      code: "AUTH_FORBIDDEN",
      message: "This wallet is not authorized to manage this campaign.",
      reconnectRequired: false,
      retryable: false,
    },
    503: {
      code: "PERSISTENCE_UNAVAILABLE",
      message: "Campaign data is temporarily unavailable.",
      reconnectRequired: false,
      retryable: true,
    },
  } as const;

  return {
    ...byStatus[httpStatus],
    httpStatus,
    operation: httpStatus === 503 ? "detail" : "add",
    traceId: `trace-owner-${httpStatus}`,
  };
};

interface ControlledHarnessProps {
  completePending?: boolean;
  onAdd?: OwnerCampaignTaskIntentContract["onAdd"];
  onAdopt?: OwnerCampaignTaskIntentContract["onAdopt"];
  onGenerate?: OwnerCampaignTaskIntentContract["onGenerate"];
  previewValue?: OwnerTaskPreview | null;
}

const ControlledHarness = ({
  completePending = false,
  onAdd = vi.fn(),
  onAdopt = vi.fn(),
  onGenerate = vi.fn(),
  previewValue = null,
}: ControlledHarnessProps) => {
  const [pending, setPending] = useState<{
    operation: OwnerCampaignRequestOperation;
    targetKey: OwnerCampaignTaskPendingTargetKey;
  } | null>(null);

  useEffect(() => {
    if (completePending) {
      setPending(null);
    }
  }, [completePending]);

  return (
    <TaskTemplateLibrary
      locale="en-US"
      ownerWorkflow={createWorkflow({
        commandsDisabled: Boolean(pending),
        onAdd: (input) => {
          onAdd(input);
          setPending({
            operation: "add",
            targetKey: createOwnerCampaignAddPendingTargetKey(input),
          });
        },
        onAdopt: (item) => {
          onAdopt(item);
          setPending({
            operation: "adopt",
            targetKey: createOwnerCampaignAdoptPendingTargetKey(item),
          });
        },
        onGenerate: (input) => {
          onGenerate(input);
          setPending({
            operation: "preview",
            targetKey: ownerCampaignGeneratePendingTargetKey,
          });
        },
        pendingCommand: pending?.operation ?? null,
        pendingTargetKey: pending?.targetKey ?? null,
        preview: previewValue,
        status: pending ? "mutation_pending" : "ready",
      })}
    />
  );
};

const renderLibrary = (
  ownerWorkflow = createWorkflow(),
  templates?: TaskTemplate[],
) => render(
  <TaskTemplateLibrary
    locale="en-US"
    ownerWorkflow={ownerWorkflow}
    templates={templates}
  />,
);

const fillGenerateForm = () => {
  fireEvent.change(screen.getByLabelText("Campaign goal"), {
    target: { value: "Increase qualified participation" },
  });
  fireEvent.change(screen.getByLabelText("Product"), {
    target: { value: "Awaken" },
  });
  fireEvent.change(screen.getByLabelText("Target users"), {
    target: { value: "AA users, EOA traders" },
  });
};

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

describe("TaskTemplateLibrary", () => {
  it("renders all required task template categories and canonical detail tasks", () => {
    renderLibrary();

    for (const category of [
      "wallet",
      "bridge",
      "swap",
      "liquidity",
      "nft",
      "schrodinger",
      "dao",
      "daipp",
      "pay",
      "forecast",
      "social",
      "invite",
    ]) {
      expect(screen.getByText(category)).toBeInTheDocument();
    }

    const canonicalTasks = screen.getByRole("region", { name: "Canonical campaign tasks" });
    expect(within(canonicalTasks).getByText("task-canonical-001")).toBeInTheDocument();
  });

  it("retains localized filters and template metadata", () => {
    render(
      <TaskTemplateLibrary
        locale="zh-CN"
        ownerWorkflow={createWorkflow()}
      />,
    );
    const filters = screen.getByRole("group", { name: "筛选" });

    expect(screen.getByText("任务模板库")).toBeInTheDocument();
    expect(screen.getByText("连接钱包")).toBeInTheDocument();
    expect(within(filters).getByLabelText("链上")).toBeInTheDocument();
    expect(screen.getAllByText(/zh-TW/).length).toBeGreaterThan(0);
  });

  it("composes filters, renders an empty state, and resets", () => {
    renderLibrary();

    fireEvent.click(screen.getByLabelText("Any"));
    fireEvent.click(screen.getByLabelText("Manual"));
    fireEvent.click(screen.getByLabelText("Chinese reviewed"));

    expect(screen.getByText("0 of 12 templates")).toBeInTheDocument();
    expect(screen.getByText("No task templates match the selected filters.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));

    expect(screen.getByText("12 of 12 templates")).toBeInTheDocument();
    expect(screen.getByText("Connect wallet")).toBeInTheDocument();
  });

  it("emits one mapped Manual Add intent and waits for controlled detail refresh", () => {
    const onAdd = vi.fn();
    render(<ControlledHarness onAdd={onAdd} />);
    const canonicalTasks = screen.getByRole("region", { name: "Canonical campaign tasks" });
    const addButton = screen.getByRole("button", { name: "Add Connect wallet" });

    fireEvent.click(addButton);
    fireEvent.click(addButton);

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith({
      evidenceRule: {
        category: "wallet",
        source: "WALLET_SESSION",
        templateId: "tpl-wallet-connect",
      },
      points: 40,
      required: true,
      templateCode: "wallet-connect",
      verificationType: "WALLET",
      walletCompatibility: "ANY",
    });
    expect(within(canonicalTasks).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.queryByText(/suggestion-wallet-connect/, { selector: "[data-task-id]" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Adding Connect wallet");
  });

  it("guards repeated Add events before the parent pending target renders", () => {
    const onAdd = vi.fn();
    const { rerender } = renderLibrary(createWorkflow({ onAdd }));
    const addButton = () => screen.getByRole("button", { name: "Add Connect wallet" });

    fireEvent.click(addButton());
    fireEvent.click(addButton());

    expect(onAdd).toHaveBeenCalledTimes(1);

    rerender(
      <TaskTemplateLibrary
        locale="en-US"
        ownerWorkflow={createWorkflow({
          commandsDisabled: true,
          onAdd,
          pendingCommand: "add",
          pendingTargetKey: "add:wallet-connect",
          status: "mutation_pending",
        })}
      />,
    );
    rerender(
      <TaskTemplateLibrary
        locale="en-US"
        ownerWorkflow={createWorkflow({ onAdd })}
      />,
    );
    fireEvent.click(addButton());

    expect(onAdd).toHaveBeenCalledTimes(2);
  });

  it("disables Add without an active campaign, issued session, or while another command is pending", () => {
    const { rerender } = renderLibrary(createWorkflow({
      activeCampaignId: null,
      commandsDisabled: true,
      detail: null,
      status: "empty",
      tasks: [],
    }));
    const addButton = () => screen.getByRole("button", { name: "Add Connect wallet" });

    expect(addButton()).toBeDisabled();
    expect(addButton()).toHaveAccessibleDescription("Select an active campaign before adding tasks.");

    rerender(
      <TaskTemplateLibrary
        locale="en-US"
        ownerWorkflow={createWorkflow({
          commandsDisabled: true,
          issuedSessionReady: false,
          ownerContext: null,
          status: "no_session",
        })}
      />,
    );
    expect(addButton()).toBeDisabled();
    expect(addButton()).toHaveAccessibleDescription("Reconnect an issued wallet session to manage tasks.");

    rerender(
      <TaskTemplateLibrary
        locale="en-US"
        ownerWorkflow={createWorkflow({
          commandsDisabled: true,
          pendingCommand: "preview",
          pendingTargetKey: "generate",
          status: "mutation_pending",
        })}
      />,
    );
    expect(addButton()).toBeDisabled();
    expect(addButton()).toHaveAccessibleDescription("Another campaign command is pending.");
  });

  it("fails closed for an unknown template mapping", () => {
    renderLibrary(createWorkflow(), [unknownTemplate()]);

    const button = screen.getByRole("button", { name: "Add Unknown provider task" });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription("UNSUPPORTED_PERSISTENCE_TYPE");
  });

  it("fails closed when a known template ID conflicts with registered persistence semantics", () => {
    const conflictingTemplate: TaskTemplate = {
      ...taskTemplateLibrary[0],
      title: {
        "en-US": "Conflicting wallet template",
        "zh-CN": "冲突钱包模板",
        "zh-TW": "衝突錢包模板",
      },
      verificationType: "REFERRAL",
    };
    renderLibrary(createWorkflow(), [conflictingTemplate]);

    const button = screen.getByRole("button", { name: "Add Conflicting wallet template" });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription("UNSUPPORTED_PERSISTENCE_TYPE");
  });

  it("dispatches Generate once and never changes the controlled Task list", () => {
    const onGenerate = vi.fn();
    render(<ControlledHarness onGenerate={onGenerate} />);
    fillGenerateForm();
    const canonicalTasks = screen.getByRole("region", { name: "Canonical campaign tasks" });
    const generateButton = screen.getByRole("button", { name: "Generate task preview" });

    fireEvent.click(generateButton);
    fireEvent.click(generateButton);

    expect(onGenerate).toHaveBeenCalledTimes(1);
    expect(onGenerate).toHaveBeenCalledWith({
      goal: "Increase qualified participation",
      product: "Awaken",
      targetUsers: ["AA users", "EOA traders"],
      walletPolicy: "ANY",
    });
    expect(within(canonicalTasks).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Generating task preview");
  });

  it("guards repeated Generate events before the parent pending target renders", () => {
    const onGenerate = vi.fn();
    renderLibrary(createWorkflow({ onGenerate }));
    fillGenerateForm();
    const generateButton = screen.getByRole("button", { name: "Generate task preview" });

    fireEvent.click(generateButton);
    fireEvent.click(generateButton);

    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it("renders controlled preview suggestions and dispatches one supported Adopt", () => {
    const onAdopt = vi.fn();
    render(
      <ControlledHarness
        onAdopt={onAdopt}
        previewValue={preview([suggestion()])}
      />,
    );
    const adoptButton = screen.getByRole("button", { name: "Adopt wallet-connect" });

    fireEvent.click(adoptButton);
    fireEvent.click(adoptButton);

    expect(onAdopt).toHaveBeenCalledTimes(1);
    expect(onAdopt).toHaveBeenCalledWith(suggestion());
    expect(screen.getByText("suggestion-wallet-connect")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Canonical campaign tasks" }))
      .toHaveTextContent("task-canonical-001");
    expect(screen.getByRole("status")).toHaveTextContent("Adopting wallet-connect");
  });

  it("guards repeated Adopt events before the parent pending target renders", () => {
    const onAdopt = vi.fn();
    renderLibrary(createWorkflow({ onAdopt, preview: preview([suggestion()]) }));
    const adoptButton = screen.getByRole("button", { name: "Adopt wallet-connect" });

    fireEvent.click(adoptButton);
    fireEvent.click(adoptButton);

    expect(onAdopt).toHaveBeenCalledTimes(1);
  });

  it("locks all task commands synchronously from the first dispatch", () => {
    const onAdd = vi.fn();
    const onAdopt = vi.fn();
    const onGenerate = vi.fn();
    renderLibrary(createWorkflow({
      onAdd,
      onAdopt,
      onGenerate,
      preview: preview([suggestion()]),
    }));
    fillGenerateForm();
    const connectButton = screen.getByRole("button", { name: "Add Connect wallet" });
    const bridgeButton = screen.getByRole("button", { name: "Add Bridge with eBridge" });
    const generateButton = screen.getByRole("button", { name: "Generate task preview" });
    const adoptButton = screen.getByRole("button", { name: "Adopt wallet-connect" });

    fireEvent.click(connectButton);

    expect(connectButton).toBeDisabled();
    expect(bridgeButton).toBeDisabled();
    expect(generateButton).toBeDisabled();
    expect(adoptButton).toBeDisabled();

    fireEvent.click(connectButton);
    fireEvent.click(bridgeButton);
    fireEvent.click(generateButton);
    fireEvent.click(adoptButton);

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ templateCode: "wallet-connect" }));
    expect(onGenerate).not.toHaveBeenCalled();
    expect(onAdopt).not.toHaveBeenCalled();
  });

  it("keeps global single-flight through controlled pending and unlocks only after completion", () => {
    const onAdd = vi.fn();
    const onAdopt = vi.fn();
    const onGenerate = vi.fn();
    const harnessProps = {
      onAdd,
      onAdopt,
      onGenerate,
      previewValue: preview([suggestion()]),
    };
    const { rerender } = render(<ControlledHarness {...harnessProps} />);
    fillGenerateForm();

    fireEvent.click(screen.getByRole("button", { name: "Add Connect wallet" }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Add Connect wallet" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add Connect wallet" }))
      .toHaveTextContent("Adding Connect wallet");
    expect(screen.getByRole("button", { name: "Add Bridge with eBridge" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Generate task preview" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Adopt wallet-connect" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Generate task preview" }));
    fireEvent.click(screen.getByRole("button", { name: "Adopt wallet-connect" }));
    expect(onGenerate).not.toHaveBeenCalled();
    expect(onAdopt).not.toHaveBeenCalled();

    rerender(<ControlledHarness {...harnessProps} completePending />);

    expect(screen.getByRole("button", { name: "Add Connect wallet" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Generate task preview" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Adopt wallet-connect" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Generate task preview" }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onGenerate).toHaveBeenCalledTimes(1);
    expect(onAdopt).not.toHaveBeenCalled();
  });

  it("disables REFERRAL and unknown suggestions with stable reasons", () => {
    const referral = suggestion({
      adoptable: false,
      id: "suggestion-referral" as never,
      rejectionCode: "REFERRAL_TASK_ADD_UNSUPPORTED",
      templateCode: "invite-friend",
      verificationType: "REFERRAL",
    });
    const unknown = suggestion({
      id: "suggestion-unknown" as never,
      templateCode: "unknown-template",
      verificationType: "UNRECOGNIZED",
    });
    renderLibrary(createWorkflow({ preview: preview([referral, unknown]) }));

    const referralButton = screen.getByRole("button", { name: "Adopt invite-friend" });
    const unknownButton = screen.getByRole("button", { name: "Adopt unknown-template" });
    expect(referralButton).toBeDisabled();
    expect(referralButton).toHaveAccessibleDescription("REFERRAL_TASK_ADD_UNSUPPORTED");
    expect(unknownButton).toBeDisabled();
    expect(unknownButton).toHaveAccessibleDescription("UNSUPPORTED_PERSISTENCE_TYPE");
  });

  it.each([
    {
      expectedGlobalReason: "Reconnect an issued wallet session to manage tasks.",
      name: "no-session",
      overrides: {
        commandsDisabled: true,
        issuedSessionReady: false,
        ownerContext: null,
        status: "no_session" as const,
      },
    },
    {
      expectedGlobalReason: "Another campaign command is pending.",
      name: "controlled-pending",
      overrides: {
        commandsDisabled: true,
        pendingCommand: "preview" as const,
        pendingTargetKey: "generate" as const,
        status: "mutation_pending" as const,
      },
    },
  ])("associates global and persistence reasons in the $name state", ({
    expectedGlobalReason,
    overrides,
  }) => {
    const referral = suggestion({
      adoptable: false,
      id: "suggestion-referral-combined" as never,
      rejectionCode: "REFERRAL_TASK_ADD_UNSUPPORTED",
      templateCode: "invite-friend",
      verificationType: "REFERRAL",
    });
    const unknown = suggestion({
      id: "suggestion-unknown-combined" as never,
      templateCode: "unknown-template",
      verificationType: "UNRECOGNIZED",
    });
    renderLibrary(
      createWorkflow({ ...overrides, preview: preview([referral, unknown]) }),
      [unknownTemplate()],
    );

    const referralButton = screen.getByRole("button", { name: "Adopt invite-friend" });
    const unknownSuggestionButton = screen.getByRole("button", { name: "Adopt unknown-template" });
    const unknownTemplateButton = screen.getByRole("button", { name: "Add Unknown provider task" });

    expect(referralButton).toHaveAccessibleDescription(
      `${expectedGlobalReason} REFERRAL_TASK_ADD_UNSUPPORTED`,
    );
    expect(unknownSuggestionButton).toHaveAccessibleDescription(
      `${expectedGlobalReason} UNSUPPORTED_PERSISTENCE_TYPE`,
    );
    expect(unknownTemplateButton).toHaveAccessibleDescription(
      `${expectedGlobalReason} UNSUPPORTED_PERSISTENCE_TYPE`,
    );
    expect(referralButton.getAttribute("aria-describedby")?.split(" ")).toHaveLength(2);
    expect(unknownSuggestionButton.getAttribute("aria-describedby")?.split(" ")).toHaveLength(2);
    expect(unknownTemplateButton.getAttribute("aria-describedby")?.split(" ")).toHaveLength(2);
  });

  it("renders an explicit empty preview without implying Task creation", () => {
    renderLibrary(createWorkflow({ preview: preview([]) }));

    expect(screen.getByText("No suggestions were returned for this preview.")).toBeInTheDocument();
    expect(screen.queryByText(/task created/i)).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Canonical campaign tasks" }))
      .toHaveTextContent("task-canonical-001");
  });

  it.each([
    {
      expected: "Reconnect an issued wallet session to manage tasks.",
      overrides: {
        activeCampaignId: null,
        commandsDisabled: true,
        issuedSessionReady: false,
        ownerContext: null,
        status: "no_session" as const,
      },
      state: "no session",
    },
    {
      expected: "Select an active campaign before adding tasks.",
      overrides: {
        activeCampaignId: null,
        commandsDisabled: true,
        detail: null,
        status: "empty" as const,
        tasks: [],
      },
      state: "no active campaign",
    },
    {
      expected: "Recovering owner campaigns.",
      overrides: {
        activeCampaignId: null,
        commandsDisabled: true,
        detail: null,
        pendingCommand: "recover" as const,
        status: "recovering" as const,
        tasks: [],
      },
      state: "recovering",
    },
    {
      expected: "Adding Connect wallet",
      overrides: {
        commandsDisabled: true,
        pendingCommand: "add" as const,
        pendingTargetKey: "add:wallet-connect" as const,
        status: "mutation_pending" as const,
      },
      state: "pending",
    },
    {
      expected: "Campaign detail is degraded; last-good tasks remain visible.",
      overrides: {
        commandsDisabled: true,
        error: workflowError(503),
        status: "degraded" as const,
      },
      state: "degraded",
    },
    {
      expected: "Task workflow error",
      overrides: {
        activeCampaignId: null,
        commandsDisabled: true,
        detail: null,
        error: workflowError(400),
        status: "error" as const,
        tasks: [],
      },
      state: "error",
    },
  ])("announces the controlled $state state", ({ expected, overrides }) => {
    renderLibrary(createWorkflow(overrides));

    expect(screen.getByRole("status")).toHaveTextContent(expected);
  });

  it.each([400, 401, 403, 503] as const)(
    "renders controlled safe HTTP %s errors with Trace ID and last-good tasks",
    (httpStatus) => {
      const error = workflowError(httpStatus);
      renderLibrary(createWorkflow({
        commandsDisabled: true,
        error,
        status: httpStatus === 503 ? "degraded" : "error",
      }));

      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent(error.code);
      expect(alert).toHaveTextContent(`HTTP ${httpStatus}`);
      expect(alert).toHaveTextContent(`trace-owner-${httpStatus}`);
      expect(alert).toHaveTextContent(error.message);
      expect(screen.getByRole("region", { name: "Canonical campaign tasks" }))
        .toHaveTextContent("task-canonical-001");
    },
  );

  it("recovers a corrected 400 through detail refresh before explicit resubmission", () => {
    const onAdd = vi.fn();
    const onAdopt = vi.fn();
    const onGenerate = vi.fn();
    const onReconnect = vi.fn();
    const onRetryDetail = vi.fn();
    const { rerender } = renderLibrary(createWorkflow({
      commandsDisabled: true,
      error: workflowError(400),
      onAdd,
      onAdopt,
      onGenerate,
      onReconnect,
      onRetryDetail,
      status: "degraded",
    }));
    fillGenerateForm();
    fireEvent.change(screen.getByLabelText("Campaign goal"), {
      target: { value: "Corrected qualified participation goal" },
    });
    expect(screen.getByRole("button", { name: "Generate task preview" })).toBeDisabled();

    const retryButton = screen.getByRole("button", { name: "Retry campaign detail" });
    activateNativeButton(retryButton, "Enter");
    fireEvent.click(retryButton);

    expect(retryButton).toHaveFocus();
    expect(onRetryDetail).toHaveBeenCalledTimes(1);
    expect(onReconnect).not.toHaveBeenCalled();
    expect(onAdd).not.toHaveBeenCalled();
    expect(onAdopt).not.toHaveBeenCalled();
    expect(onGenerate).not.toHaveBeenCalled();
    expect(screen.getByRole("region", { name: "Canonical campaign tasks" }))
      .toHaveTextContent("task-canonical-001");

    rerender(
      <TaskTemplateLibrary
        locale="en-US"
        ownerWorkflow={createWorkflow({
          commandsDisabled: true,
          onAdd,
          onAdopt,
          onGenerate,
          onReconnect,
          onRetryDetail,
          pendingCommand: "detail",
          status: "loading_detail",
        })}
      />,
    );
    expect(screen.getByRole("region", { name: "Canonical campaign tasks" }))
      .toHaveTextContent("task-canonical-001");

    rerender(
      <TaskTemplateLibrary
        locale="en-US"
        ownerWorkflow={createWorkflow({
          onAdd,
          onAdopt,
          onGenerate,
          onReconnect,
          onRetryDetail,
        })}
      />,
    );
    const generateButton = screen.getByRole("button", { name: "Generate task preview" });
    activateNativeButton(generateButton, " ");

    expect(generateButton).toHaveFocus();
    expect(onGenerate).toHaveBeenCalledTimes(1);
    expect(onRetryDetail).toHaveBeenCalledTimes(1);
    expect(onReconnect).not.toHaveBeenCalled();
    expect(onAdd).not.toHaveBeenCalled();
    expect(onAdopt).not.toHaveBeenCalled();
  });

  it("recovers a 401 through reconnect without replaying a task command", () => {
    const onAdd = vi.fn();
    const onAdopt = vi.fn();
    const onGenerate = vi.fn();
    const onReconnect = vi.fn();
    const onRetryDetail = vi.fn();
    const { rerender } = renderLibrary(createWorkflow({
      commandsDisabled: true,
      error: workflowError(401),
      onAdd,
      onAdopt,
      onGenerate,
      onReconnect,
      onRetryDetail,
      status: "degraded",
    }));
    const reconnectButton = screen.getByRole("button", { name: "Reconnect wallet" });

    activateNativeButton(reconnectButton, " ");

    expect(reconnectButton).toHaveFocus();
    expect(onReconnect).toHaveBeenCalledTimes(1);
    expect(onRetryDetail).not.toHaveBeenCalled();
    expect(onAdd).not.toHaveBeenCalled();
    expect(onAdopt).not.toHaveBeenCalled();
    expect(onGenerate).not.toHaveBeenCalled();
    expect(screen.getByRole("region", { name: "Canonical campaign tasks" }))
      .toHaveTextContent("task-canonical-001");

    rerender(
      <TaskTemplateLibrary
        locale="en-US"
        ownerWorkflow={createWorkflow({
          onAdd,
          onAdopt,
          onGenerate,
          onReconnect,
          onRetryDetail,
        })}
      />,
    );

    expect(screen.getByRole("button", { name: "Add Connect wallet" })).toBeEnabled();
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it("recovers a 403 through safe reconnect context without exposing diagnostics", () => {
    const onAdd = vi.fn();
    const onAdopt = vi.fn();
    const onGenerate = vi.fn();
    const onReconnect = vi.fn();
    const onRetryDetail = vi.fn();
    const { rerender } = renderLibrary(createWorkflow({
      commandsDisabled: true,
      error: workflowError(403),
      onAdd,
      onAdopt,
      onGenerate,
      onReconnect,
      onRetryDetail,
      status: "degraded",
    }));
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("AUTH_FORBIDDEN");
    expect(alert).not.toHaveTextContent(/diagnostic|safeDetails|stack/i);
    const reconnectButton = screen.getByRole("button", { name: "Reconnect wallet" });

    activateNativeButton(reconnectButton, "Enter");

    expect(reconnectButton).toHaveFocus();
    expect(onReconnect).toHaveBeenCalledTimes(1);
    expect(onRetryDetail).not.toHaveBeenCalled();
    expect(onAdd).not.toHaveBeenCalled();
    expect(onAdopt).not.toHaveBeenCalled();
    expect(onGenerate).not.toHaveBeenCalled();
    expect(screen.getByRole("region", { name: "Canonical campaign tasks" }))
      .toHaveTextContent("task-canonical-001");

    rerender(
      <TaskTemplateLibrary
        locale="en-US"
        ownerWorkflow={createWorkflow({
          onAdd,
          onAdopt,
          onGenerate,
          onReconnect,
          onRetryDetail,
        })}
      />,
    );

    expect(screen.getByRole("button", { name: "Add Connect wallet" })).toBeEnabled();
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it("recovers a 503 by retrying detail without replaying mutation", () => {
    const onAdd = vi.fn();
    const onAdopt = vi.fn();
    const onGenerate = vi.fn();
    const onReconnect = vi.fn();
    const onRetryDetail = vi.fn();
    const { rerender } = renderLibrary(createWorkflow({
      commandsDisabled: true,
      error: workflowError(503),
      onAdd,
      onAdopt,
      onGenerate,
      onReconnect,
      onRetryDetail,
      status: "degraded",
    }));
    const retryButton = screen.getByRole("button", { name: "Retry campaign detail" });

    activateNativeButton(retryButton, " ");
    fireEvent.click(retryButton);

    expect(retryButton).toHaveFocus();
    expect(onRetryDetail).toHaveBeenCalledTimes(1);
    expect(onReconnect).not.toHaveBeenCalled();
    expect(onAdd).not.toHaveBeenCalled();
    expect(onAdopt).not.toHaveBeenCalled();
    expect(onGenerate).not.toHaveBeenCalled();
    expect(screen.getByRole("region", { name: "Canonical campaign tasks" }))
      .toHaveTextContent("task-canonical-001");

    rerender(
      <TaskTemplateLibrary
        locale="en-US"
        ownerWorkflow={createWorkflow({
          commandsDisabled: true,
          onAdd,
          onAdopt,
          onGenerate,
          onReconnect,
          onRetryDetail,
          pendingCommand: "detail",
          status: "loading_detail",
        })}
      />,
    );
    expect(screen.getByRole("region", { name: "Canonical campaign tasks" }))
      .toHaveTextContent("task-canonical-001");

    rerender(
      <TaskTemplateLibrary
        locale="en-US"
        ownerWorkflow={createWorkflow({
          onAdd,
          onAdopt,
          onGenerate,
          onReconnect,
          onRetryDetail,
        })}
      />,
    );

    expect(screen.getByRole("button", { name: "Add Connect wallet" })).toBeEnabled();
    expect(onRetryDetail).toHaveBeenCalledTimes(1);
    expect(onAdd).not.toHaveBeenCalled();
    expect(onAdopt).not.toHaveBeenCalled();
    expect(onGenerate).not.toHaveBeenCalled();
  });

  it("adds through native Enter activation with one dispatch and continuous focus", () => {
    const onAdd = vi.fn();
    renderLibrary(createWorkflow({ onAdd }));
    const addButton = screen.getByRole("button", { name: "Add Connect wallet" });

    activateNativeButton(addButton, "Enter");

    expect(addButton).toHaveFocus();
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("generates through native Space activation with one dispatch and continuous focus", () => {
    const onGenerate = vi.fn();
    renderLibrary(createWorkflow({ onGenerate }));
    fillGenerateForm();
    const generateButton = screen.getByRole("button", { name: "Generate task preview" });

    activateNativeButton(generateButton, " ");

    expect(generateButton).toHaveFocus();
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it("adopts through native Enter activation with one dispatch and continuous focus", () => {
    const onAdopt = vi.fn();
    renderLibrary(createWorkflow({ onAdopt, preview: preview([suggestion()]) }));
    const adoptButton = screen.getByRole("button", { name: "Adopt wallet-connect" });

    activateNativeButton(adoptButton, "Enter");

    expect(adoptButton).toHaveFocus();
    expect(onAdopt).toHaveBeenCalledTimes(1);
  });

  it("uses accessible native controls and stable responsive styles", () => {
    renderLibrary(createWorkflow({ preview: preview([suggestion()]) }));
    fillGenerateForm();
    const addButton = screen.getByRole("button", { name: "Add Connect wallet" });
    const generateButton = screen.getByRole("button", { name: "Generate task preview" });
    const adoptButton = screen.getByRole("button", { name: "Adopt wallet-connect" });

    addButton.focus();
    expect(addButton).toHaveFocus();
    expect(addButton).toHaveAttribute("type", "button");
    expect(addButton).toHaveStyle({ outlineOffset: "2px" });
    expect(generateButton).toHaveAttribute("type", "submit");
    expect(generateButton).toHaveStyle({ width: "220px" });
    expect(adoptButton).toHaveAttribute("type", "button");
    expect(adoptButton).toHaveStyle({ width: "100%" });
    expect(screen.getByLabelText("Task template library")).toHaveStyle({ minWidth: "0" });
    expect(addButton).toHaveStyle({ minHeight: "40px", width: "100%" });
  });
});
