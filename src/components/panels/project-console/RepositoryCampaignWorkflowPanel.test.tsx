import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  repositoryCampaignWorkflowApiBoundary,
  type RepositoryCampaignWorkflowBridgeState,
} from "../../../api/repositoryCampaignWorkflowApiBridge";
import { projectConsoleCopy } from "./copy";
import { RepositoryCampaignWorkflowPanel } from "./RepositoryCampaignWorkflowPanel";

const noLiveSideEffects = {
  contractWriteExecuted: false,
  objectKeyCreated: false,
  providerCallExecuted: false,
  rawProviderPayloadExposed: false,
  rewardCustodyExecuted: false,
  rewardDistributionExecuted: false,
  signedUrlCreated: false,
  storageWriteExecuted: false,
  walletSignatureExecuted: false,
} as const;

const readyState = (): RepositoryCampaignWorkflowBridgeState => ({
  boundary: repositoryCampaignWorkflowApiBoundary,
  campaign: {
    contractMode: "OFF_CHAIN_MVP",
    createdDraftId: "campaign-db-draft-0001",
    defaultLocale: "en-US",
    listCampaignCount: 1,
    listContainsCreatedDraft: true,
    ownerAddress: "ELF_local_review_project_owner",
    persistence: { kind: "campaign_draft", recordId: "campaign-db-record-0001" },
    projectId: "repo-workflow-review",
    repository: {
      createdViaRepository: true,
      repositoryId: "campaign-db-repository-runtime",
      storeId: "campaign-db",
    },
    status: "draft",
    supportedLocales: ["en-US", "zh-CN", "zh-TW"],
    walletPolicy: "ANY",
  },
  configured: true,
  diagnostics: [],
  eligibility: {
    afterOptional: {
      accountType: "EOA",
      eligible: false,
      evidenceHashes: [`evidence-hash:campaign-db-task-draft-0002`],
      localePreference: "en-US",
      missingTasks: ["bridge_ebridge"],
      riskFlags: ["required_task_missing"],
      score: 50,
      status: "not_eligible",
      walletAddress: "2F4RepositoryWorkflowWallet",
      walletSource: "PORTKEY_EOA_EXTENSION",
      walletTypeVerified: true,
    },
    afterRequired: {
      accountType: "EOA",
      eligible: true,
      evidenceHashes: [
        `evidence-hash:campaign-db-task-draft-0001`,
        `evidence-hash:campaign-db-task-draft-0002`,
      ],
      localePreference: "en-US",
      missingTasks: [],
      riskFlags: [],
      score: 170,
      status: "eligible",
      walletAddress: "2F4RepositoryWorkflowWallet",
      walletSource: "PORTKEY_EOA_EXTENSION",
      walletTypeVerified: true,
    },
    beforeRequired: {
      accountType: "EOA",
      eligible: false,
      evidenceHashes: [],
      missingTasks: ["bridge_ebridge"],
      riskFlags: ["required_task_missing"],
      score: 0,
      status: "not_eligible",
      walletAddress: "2F4RepositoryWorkflowWallet",
      walletSource: "PORTKEY_EOA_EXTENSION",
      walletTypeVerified: true,
    },
  },
  exportReview: {
    audit: {
      detailFound: true,
      recordCount: 1,
      safety: {
        downloadUrlEnabled: false,
        localReviewOnly: true,
        storageWriteEnabled: false,
      },
    },
    blockedPreview: {
      blockedRows: 1,
      contractRootMode: "none",
      readyRows: 0,
      reviewRequiredRows: 0,
      rowStatuses: ["blocked"],
      totalRows: 1,
    },
    readiness: {
      blockedRows: 0,
      contractRootModes: ["none", "contract_claim"],
      previewModes: ["json", "csv"],
      readyRows: 1,
      reviewRequiredRows: 0,
      totalRows: 1,
    },
    readyPreview: {
      artifactChecksum: "local-export-checksum-ready",
      artifactId: "export-artifact-local-review-001",
      blockedRows: 0,
      contractRootMode: "none",
      readyRows: 1,
      reviewRequiredRows: 0,
      rowStatuses: ["ready"],
      totalRows: 1,
    },
  },
  health: {
    routeCount: 34,
    status: "ready",
    traceId: "trace-health",
  },
  liveSideEffects: noLiveSideEffects,
  loading: false,
  source: "api_runtime",
  status: "ready",
  tasks: {
    optional: {
      evidenceRule: { action: "share" },
      points: 50,
      required: false,
      taskId: "campaign-db-task-draft-0002",
      templateCode: "share_campaign",
      verificationType: "SOCIAL",
      walletCompatibility: "ANY",
    },
    required: {
      evidenceRule: { minAmount: 1, source: "AELFSCAN" },
      points: 120,
      required: true,
      taskId: "campaign-db-task-draft-0001",
      templateCode: "bridge_ebridge",
      verificationType: "ON_CHAIN",
      walletCompatibility: "ANY",
    },
  },
  traceId: "trace-audit-detail",
  traceIds: [
    "trace-create",
    "trace-required-task",
    "trace-optional-verify",
    "trace-ready-export",
    "trace-audit-detail",
  ],
  verification: {
    optional: {
      evidenceHash: "evidence-hash:campaign-db-task-draft-0002",
      evidenceSource: "SOCIAL_API",
      liveContractExecuted: false,
      liveProviderExecuted: false,
      liveRewardExecuted: false,
      liveStorageExecuted: false,
      pointsAwarded: 50,
      pointsAvailable: 50,
      status: "completed",
      taskId: "campaign-db-task-draft-0002",
      walletAddress: "2F4RepositoryWorkflowWallet",
      walletSource: "PORTKEY_EOA_EXTENSION",
    },
    required: {
      evidenceHash: "evidence-hash:campaign-db-task-draft-0001",
      evidenceSource: "AELFSCAN",
      liveContractExecuted: false,
      liveProviderExecuted: false,
      liveRewardExecuted: false,
      liveStorageExecuted: false,
      pointsAwarded: 120,
      pointsAvailable: 120,
      status: "completed",
      taskId: "campaign-db-task-draft-0001",
      walletAddress: "2F4RepositoryWorkflowWallet",
      walletSource: "PORTKEY_EOA_EXTENSION",
    },
  },
  workflowStepCount: 15,
  workflowSteps: [
    { endpoint: "/api/health", method: "GET", status: "completed", stepId: "health", traceId: "trace-health" },
    { endpoint: "/api/campaigns", method: "POST", status: "completed", stepId: "campaign-create", traceId: "trace-create" },
    { endpoint: "/api/campaigns/:campaignId/export", method: "POST", status: "completed", stepId: "ready-export", traceId: "trace-ready-export" },
  ],
});

const renderPanel = (
  state: RepositoryCampaignWorkflowBridgeState,
  {
    apiConfigured = true,
    locale = "en-US",
  }: {
    apiConfigured?: boolean;
    locale?: "en-US" | "zh-CN" | "zh-TW";
  } = {},
) => {
  const onReview = vi.fn();

  render(
    <RepositoryCampaignWorkflowPanel
      apiConfigured={apiConfigured}
      copy={projectConsoleCopy[locale]}
      locale={locale}
      onReview={onReview}
      reviewInFlight={false}
      state={state}
    />,
  );

  return { onReview };
};

describe("RepositoryCampaignWorkflowPanel", () => {
  it("renders ready API runtime workflow summary, steps, campaign, tasks, eligibility, export, trace ids, and boundary", () => {
    renderPanel(readyState());

    const panel = screen.getByLabelText("Repository Campaign Workflow Review");
    expect(within(panel).getByText("API runtime")).toBeInTheDocument();
    expect(within(panel).getByText("Ready")).toBeInTheDocument();
    expect(within(panel).getAllByText("campaign-db-draft-0001").length).toBeGreaterThan(0);
    expect(within(panel).getByText("campaign-db-repository-runtime")).toBeInTheDocument();
    expect(within(panel).getAllByText("campaign-db-task-draft-0001").length).toBeGreaterThan(0);
    expect(within(panel).getAllByText("campaign-db-task-draft-0002").length).toBeGreaterThan(0);
    expect(within(panel).getByText("ON_CHAIN")).toBeInTheDocument();
    expect(within(panel).getByText("SOCIAL")).toBeInTheDocument();
    expect(within(panel).getByText("Before required: ineligible / 0")).toBeInTheDocument();
    expect(within(panel).getByText("After optional: ineligible / 50")).toBeInTheDocument();
    expect(within(panel).getAllByText("After required: eligible / 170").length).toBeGreaterThan(0);
    expect(within(panel).getByText("export-artifact-local-review-001")).toBeInTheDocument();
    expect(within(panel).getByText("local-export-checksum-ready")).toBeInTheDocument();
    expect(within(panel).getByText("trace-ready-export")).toBeInTheDocument();
    expect(within(panel).getByText("15")).toBeInTheDocument();
    expect(within(panel).getByText(/Local repository campaign workflow API review only/)).toBeInTheDocument();
  });

  it("renders fallback diagnostics sanitized and keeps live controls absent", () => {
    const state: RepositoryCampaignWorkflowBridgeState = {
      ...readyState(),
      campaign: undefined,
      diagnostics: [
        {
          code: "API_BASE_URL_INVALID",
          message: {
            "en-US":
              "Invalid URL with private key, bearer token, signed URL, object key, provider payload, stack trace, and /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/raw?token=secret.",
          },
          severity: "warning",
        },
      ],
      source: "seeded_fallback",
      status: "fallback",
      traceId: undefined,
    };

    renderPanel(state, { apiConfigured: false });

    const panel = screen.getByLabelText("Repository Campaign Workflow Review");
    const diagnostics = within(panel).getByLabelText("Repository workflow diagnostics");
    const text = diagnostics.textContent?.toLowerCase() ?? "";

    expect(within(panel).getAllByText("Seeded fallback").length).toBeGreaterThan(0);
    expect(within(panel).getByText("No API trace yet")).toBeInTheDocument();
    for (const unsafe of [
      "private key",
      "bearer token",
      "signed url",
      "object key",
      "provider payload",
      "stack trace",
      "campaign-os-kitty",
      "token=secret",
    ]) {
      expect(text).not.toContain(unsafe);
    }
    expect(text).toContain("redacted key");
    expect(within(panel).queryByRole("button", { name: /provider|contract|storage|signed|reward|custody|distribute/i }))
      .not.toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Review workflow bridge" })).toBeInTheDocument();
  });

  it("renders long ids and trace ids in wrap-safe containers", () => {
    const longId =
      "campaign-db-task-draft-very-long-identifier-for-mobile-wrapping-000000000000000000000001";
    const longTrace =
      "trace-repository-workflow-review-very-long-trace-id-for-mobile-wrapping-000000000000000000000001";
    const state = readyState();

    state.tasks = {
      ...state.tasks,
      required: state.tasks?.required ? { ...state.tasks.required, taskId: longId } : undefined,
    };
    state.traceIds = [...state.traceIds, longTrace];

    renderPanel(state);

    expect(screen.getByText(longId)).toBeInTheDocument();
    expect(screen.getByText(longTrace)).toBeInTheDocument();
  });

  it("renders zh-CN copy without losing key statuses", () => {
    renderPanel(readyState(), { locale: "zh-CN" });

    const panel = screen.getByLabelText("Repository Campaign Workflow Review");
    expect(within(panel).getByText("Repository 活动工作流评审")).toBeInTheDocument();
    expect(within(panel).getByText("就绪")).toBeInTheDocument();
    expect(within(panel).getAllByText("已完成 required 后：eligible / 170").length).toBeGreaterThan(0);
  });

  it("calls the review handler from the review action", () => {
    const { onReview } = renderPanel(readyState());

    fireEvent.click(screen.getByRole("button", { name: "Review workflow bridge" }));

    expect(onReview).toHaveBeenCalledTimes(1);
  });
});
