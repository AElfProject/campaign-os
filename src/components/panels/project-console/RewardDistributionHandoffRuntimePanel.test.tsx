import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  createRewardDistributionHandoffRuntimeApiLoadingState,
  createRewardDistributionHandoffRuntimeApiSeededFallbackState,
  rewardDistributionHandoffRuntimeApiBoundary,
  type RewardDistributionHandoffRuntimeApiBridgeState,
} from "../../../api/rewardDistributionHandoffRuntimeApiBridge";
import { campaignDetail } from "../../../domain";
import { projectConsoleCopy } from "./copy";
import { RewardDistributionHandoffRuntimePanel } from "./RewardDistributionHandoffRuntimePanel";

const copy = projectConsoleCopy["en-US"];

const apiBackedState = (): RewardDistributionHandoffRuntimeApiBridgeState => {
  const state = createRewardDistributionHandoffRuntimeApiSeededFallbackState(
    campaignDetail.id,
    "trace-reward-handoff-panel",
  );

  return {
    ...state,
    boundary: rewardDistributionHandoffRuntimeApiBoundary,
    configured: true,
    diagnostics: [],
    routeCount: 37,
    source: "api_runtime",
    status: "blocked",
    traceId: "trace-reward-handoff-panel",
    readiness: {
      ...state.readiness,
      source: "server_runtime",
      status: "blocked",
      traceId: "trace-reward-handoff-panel",
    },
  };
};

const renderPanel = (
  state: RewardDistributionHandoffRuntimeApiBridgeState,
  apiConfigured = true,
  reviewInFlight = false,
) => {
  const onReview = vi.fn();

  render(
    <RewardDistributionHandoffRuntimePanel
      apiConfigured={apiConfigured}
      copy={copy}
      locale="en-US"
      onReview={onReview}
      reviewInFlight={reviewInFlight}
      state={state}
    />,
  );

  return { onReview };
};

describe("RewardDistributionHandoffRuntimePanel", () => {
  it("renders seeded fallback readiness, evidence blockers, export linkage, item rows, and no-live boundary", () => {
    const state: RewardDistributionHandoffRuntimeApiBridgeState = {
      ...createRewardDistributionHandoffRuntimeApiSeededFallbackState(campaignDetail.id),
      diagnostics: [
        {
          code: "API_BASE_URL_MISSING",
          message: {
            "en-US": "No local reward distribution handoff readiness API base URL is configured, so seeded review data is shown.",
          },
          severity: "info",
        },
      ],
    };

    renderPanel(state, false);

    const panel = screen.getByLabelText("Reward Distribution Handoff Runtime review");

    expect(within(panel).getAllByText("Seeded fallback").length).toBeGreaterThan(0);
    expect(within(panel).getByText("No API trace yet")).toBeInTheDocument();
    expect(within(panel).getByText(/No local API base URL configured/)).toBeInTheDocument();
    expect(within(panel).getByText("missing")).toBeInTheDocument();
    expect(within(panel).getByText("export-awaken-sprint-preview")).toBeInTheDocument();
    expect(within(panel).getByText("CAMPAIGN_OS_REWARD_DISTRIBUTION_FUNDING_PROOF_REF")).toBeInTheDocument();
    expect(within(panel).getByText("Project owner funding proof")).toBeInTheDocument();
    expect(within(panel).getByText("Winner export linkage")).toBeInTheDocument();
    expect(within(panel).getByText("No custody and no distribution boundary")).toBeInTheDocument();
    expect(within(panel).getByText("No payout")).toBeInTheDocument();
    expect(within(panel).getByText("No claim")).toBeInTheDocument();
    expect(within(panel).getByText("No provider call")).toBeInTheDocument();
    expect(within(panel).getByText("No reward custody")).toBeInTheDocument();
    expect(within(panel).getByText("No reward distribution")).toBeInTheDocument();
    expect(within(panel).getByText(/Local reward distribution handoff readiness API bridge only/)).toBeInTheDocument();
  });

  it("renders API-backed source, trace, summary, and review action", () => {
    const { onReview } = renderPanel(apiBackedState());
    const panel = screen.getByLabelText("Reward Distribution Handoff Runtime review");

    expect(within(panel).getByText("API runtime")).toBeInTheDocument();
    expect(within(panel).getByText("Blocked")).toBeInTheDocument();
    expect(within(panel).getByText("trace-reward-handoff-panel")).toBeInTheDocument();
    expect(within(panel).getAllByText(/REWARD_DISTRIBUTION_FUNDING_PROOF_MISSING/).length).toBeGreaterThan(0);
    expect(within(panel).getByText("4 recipients")).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Review handoff readiness" })).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("button", { name: "Review handoff readiness" }));

    expect(onReview).toHaveBeenCalledTimes(1);
  });

  it("sanitizes unsafe diagnostics before display", () => {
    const state: RewardDistributionHandoffRuntimeApiBridgeState = {
      ...apiBackedState(),
      diagnostics: [
        {
          code: "API_REQUEST_FAILED",
          message: {
            "en-US":
              "Request failed with privateKey, seedPhrase, bearer token, signature, transactionId, payoutId, custodyId, distributionTx, providerPayload, walletSignature, contractWrite, claimTransaction, stack trace, and /private/reward-handoff/raw?token=secret.",
          },
          severity: "error",
        },
      ],
      source: "error_fallback",
      status: "error",
    };

    renderPanel(state);

    const diagnostics = within(screen.getByLabelText("Reward Distribution Handoff Runtime review"))
      .getByLabelText("Reward distribution handoff sanitized diagnostics");
    const diagnosticsText = diagnostics.textContent?.toLowerCase() ?? "";

    for (const unsafe of [
      "privatekey",
      "seedphrase",
      "bearer token",
      "transactionid",
      "payoutid",
      "custodyid",
      "distributiontx",
      "providerpayload",
      "walletsignature",
      "contractwrite",
      "claimtransaction",
      "stack trace",
      "/private/reward-handoff",
      "token=secret",
    ]) {
      expect(diagnosticsText).not.toContain(unsafe);
    }
    expect(diagnosticsText).toContain("redacted:private_key");
    expect(diagnosticsText).toContain("redacted:provider_payload");
  });

  it("keeps seeded data visible while loading and disables the review action", () => {
    const loadingState = createRewardDistributionHandoffRuntimeApiLoadingState(campaignDetail.id);
    const { onReview } = renderPanel(loadingState, true, true);
    const panel = screen.getByLabelText("Reward Distribution Handoff Runtime review");

    expect(within(panel).getByText("Loading handoff readiness")).toBeInTheDocument();
    expect(within(panel).getByText("Project owner funding proof")).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Reviewing handoff readiness..." })).toBeDisabled();
    expect(onReview).not.toHaveBeenCalled();
  });

  it("wraps long evidence copy and avoids live operation controls", () => {
    const longKey =
      "CAMPAIGN_OS_REWARD_DISTRIBUTION_EXTREMELY_LONG_REQUIRED_EVIDENCE_KEY_FOR_MOBILE_WRAPPING";
    const state: RewardDistributionHandoffRuntimeApiBridgeState = {
      ...apiBackedState(),
      readiness: {
        ...apiBackedState().readiness,
        requiredEvidenceKeys: [longKey],
        evidenceHandoff: {
          ...apiBackedState().readiness.evidenceHandoff,
          requiredEvidenceKeys: [longKey],
        },
      },
    };

    renderPanel(state);

    const panel = screen.getByLabelText("Reward Distribution Handoff Runtime review");

    expect(within(panel).getByText(longKey)).toBeInTheDocument();
    for (const name of [
      /payout/i,
      /claim/i,
      /custody/i,
      /sign/i,
      /contract write/i,
      /provider call/i,
      /queue publish/i,
      /scheduler/i,
      /worker/i,
      /distribute/i,
    ]) {
      expect(within(panel).queryByRole("button", { name })).not.toBeInTheDocument();
      expect(within(panel).queryByRole("link", { name })).not.toBeInTheDocument();
    }
  });
});
