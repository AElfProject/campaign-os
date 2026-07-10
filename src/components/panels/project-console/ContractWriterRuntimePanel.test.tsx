import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  contractWriterRuntimeApiBoundary,
  createContractWriterRuntimeApiLoadingState,
  createContractWriterRuntimeApiSeededFallbackState,
  type ContractWriterRuntimeApiBridgeState,
} from "../../../api/contractWriterRuntimeApiBridge";
import { campaignDetail } from "../../../domain";
import { ContractWriterRuntimePanel } from "./ContractWriterRuntimePanel";

const apiBackedState = (): ContractWriterRuntimeApiBridgeState => {
  const state = createContractWriterRuntimeApiSeededFallbackState(
    campaignDetail.id,
    "trace-contract-writer-panel",
  );

  return {
    ...state,
    boundary: contractWriterRuntimeApiBoundary,
    configured: true,
    diagnostics: [],
    routeCount: 36,
    source: "api_runtime",
    status: "blocked",
    traceId: "trace-contract-writer-panel",
    readiness: {
      ...state.readiness,
      source: "server_runtime",
      status: "blocked",
      traceId: "trace-contract-writer-panel",
    },
  };
};

const renderPanel = (
  state: ContractWriterRuntimeApiBridgeState,
  apiConfigured = true,
  reviewInFlight = false,
) => {
  const onReview = vi.fn();

  render(
    <ContractWriterRuntimePanel
      apiConfigured={apiConfigured}
      locale="en-US"
      onReview={onReview}
      reviewInFlight={reviewInFlight}
      state={state}
    />,
  );

  return { onReview };
};

describe("ContractWriterRuntimePanel", () => {
  it("renders seeded fallback readiness, config blockers, operation catalog, and no-live safety", () => {
    const state: ContractWriterRuntimeApiBridgeState = {
      ...createContractWriterRuntimeApiSeededFallbackState(campaignDetail.id),
      diagnostics: [
        {
          code: "API_BASE_URL_MISSING",
          message: {
            "en-US": "No local contract writer readiness API base URL is configured, so seeded review data is shown.",
          },
          severity: "info",
        },
      ],
    };

    renderPanel(state, false);

    const panel = screen.getByLabelText("Contract Writer Runtime review");

    expect(within(panel).getAllByText("Seeded fallback").length).toBeGreaterThan(0);
    expect(within(panel).getByText("No API trace yet")).toBeInTheDocument();
    expect(within(panel).getByText(/No local API base URL configured/)).toBeInTheDocument();
    expect(within(panel).getByText("CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT_REF")).toBeInTheDocument();
    expect(within(panel).getAllByText("CampaignRegistryV2").length).toBeGreaterThan(0);
    expect(within(panel).getAllByText("CampaignPointsLedgerV2").length).toBeGreaterThan(0);
    expect(within(panel).getAllByText("ReferralRegistryV2").length).toBeGreaterThan(0);
    expect(within(panel).getAllByText("EligibilityRootRegistryV2").length).toBeGreaterThan(0);
    expect(within(panel).getByText("CreateCampaign")).toBeInTheDocument();
    expect(within(panel).getByText("CommitPointsBatch")).toBeInTheDocument();
    expect(within(panel).getByText("BindReferral")).toBeInTheDocument();
    expect(within(panel).getByText("SetEligibilityRoot")).toBeInTheDocument();
    expect(within(panel).getAllByText(/CONTRACT_WRITER_CONFIG_MISSING/).length).toBeGreaterThan(0);
    expect(within(panel).getAllByText(/CONTRACT_WRITER_LIVE_EXECUTION_DISABLED/).length).toBeGreaterThan(0);
    expect(within(panel).getByText("No signer execution")).toBeInTheDocument();
    expect(within(panel).getByText("No wallet signature")).toBeInTheDocument();
    expect(within(panel).getByText("No contract write")).toBeInTheDocument();
    expect(within(panel).getByText("No queue publishing")).toBeInTheDocument();
    expect(within(panel).getByText("No reward custody")).toBeInTheDocument();
    expect(within(panel).getByText("No reward distribution")).toBeInTheDocument();
    expect(within(panel).getByText(/Local contract writer runtime readiness only/)).toBeInTheDocument();
  });

  it("renders API-backed source, trace, operation catalog, and review action", () => {
    const { onReview } = renderPanel(apiBackedState());
    const panel = screen.getByLabelText("Contract Writer Runtime review");

    expect(within(panel).getByText("API runtime")).toBeInTheDocument();
    expect(within(panel).getByText("Blocked")).toBeInTheDocument();
    expect(within(panel).getByText("trace-contract-writer-panel")).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Refresh readiness" })).toBeInTheDocument();
    expect(within(panel).getAllByText("CampaignRegistryV2").length).toBeGreaterThan(0);
    expect(within(panel).getAllByText("CampaignPointsLedgerV2").length).toBeGreaterThan(0);

    fireEvent.click(within(panel).getByRole("button", { name: "Refresh readiness" }));

    expect(onReview).toHaveBeenCalledTimes(1);
  });

  it("sanitizes unsafe API diagnostics before display", () => {
    const state: ContractWriterRuntimeApiBridgeState = {
      ...apiBackedState(),
      diagnostics: [
        {
          code: "API_REQUEST_FAILED",
          message: {
            "en-US":
              "Request failed with private key, seed phrase, bearer token, signed URL, object key, storage key, raw signature, wallet signature, provider payload, stack trace, and /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/raw?token=secret.",
          },
          severity: "error",
        },
      ],
      source: "error_fallback",
      status: "error",
    };

    renderPanel(state);

    const diagnostics = within(screen.getByLabelText("Contract Writer Runtime review"))
      .getByLabelText("Contract writer sanitized diagnostics");
    const diagnosticsText = diagnostics.textContent?.toLowerCase() ?? "";

    for (const unsafe of [
      "private key",
      "seed phrase",
      "bearer token",
      "signed url",
      "object key",
      "storage key",
      "raw signature",
      "provider payload",
      "stack trace",
      "campaign-os-kitty",
      "token=secret",
    ]) {
      expect(diagnosticsText).not.toContain(unsafe);
    }
    expect(diagnosticsText).toContain("redacted:private_key");
    expect(diagnosticsText).toContain("redacted:provider_payload");
  });

  it("keeps seeded data visible while loading and disables the review action", () => {
    const loadingState = createContractWriterRuntimeApiLoadingState(campaignDetail.id);
    const { onReview } = renderPanel(loadingState, true, true);
    const panel = screen.getByLabelText("Contract Writer Runtime review");

    expect(within(panel).getByText("Loading contract writer readiness")).toBeInTheDocument();
    expect(within(panel).getAllByText("CampaignRegistryV2").length).toBeGreaterThan(0);
    expect(within(panel).getByRole("button", { name: "Refreshing readiness..." })).toBeDisabled();
    expect(onReview).not.toHaveBeenCalled();
  });

  it("wraps long config copy and avoids live execution controls", () => {
    const longKey = "CAMPAIGN_OS_CONTRACT_WRITER_EXTREMELY_LONG_REQUIRED_CONFIGURATION_KEY_FOR_MOBILE_WRAPPING";
    const state: ContractWriterRuntimeApiBridgeState = {
      ...apiBackedState(),
      readiness: {
        ...apiBackedState().readiness,
        configHandoff: {
          ...apiBackedState().readiness.configHandoff,
          requiredConfigKeys: [longKey],
        },
      },
    };

    renderPanel(state);

    const panel = screen.getByLabelText("Contract Writer Runtime review");

    expect(within(panel).getByText(longKey)).toBeInTheDocument();
    for (const name of [/sign/i, /write/i, /publish/i, /claim/i, /distribute/i, /reward/i, /custody/i, /contract/i]) {
      expect(within(panel).queryByRole("button", { name })).not.toBeInTheDocument();
      expect(within(panel).queryByRole("link", { name })).not.toBeInTheDocument();
    }
  });
});
