import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  createPointsRankingLedgerRuntimeApiLoadingState,
  createPointsRankingLedgerRuntimeApiSeededFallbackState,
  pointsRankingLedgerRuntimeApiBoundary,
  type PointsRankingLedgerRuntimeApiBridgeState,
} from "../../../api/pointsRankingLedgerRuntimeApiBridge";
import { campaignDetail } from "../../../domain";
import { projectConsoleCopy } from "./copy";
import { PointsRankingLedgerRuntimePanel } from "./PointsRankingLedgerRuntimePanel";

const copy = projectConsoleCopy["en-US"];

const apiBackedState = (): PointsRankingLedgerRuntimeApiBridgeState => {
  const state = createPointsRankingLedgerRuntimeApiSeededFallbackState(campaignDetail.id, "trace-ledger-panel");

  return {
    ...state,
    boundary: pointsRankingLedgerRuntimeApiBoundary,
    configured: true,
    diagnostics: [],
    routeCount: 33,
    source: "api_runtime",
    status: "review_required",
    traceId: "trace-ledger-panel",
    runtime: {
      ...state.runtime,
      source: "api_runtime",
      status: "review_required",
      traceId: "trace-ledger-panel",
    },
    review: {
      ...state.review,
      source: "api_runtime",
      status: "review_required",
      traceId: "trace-ledger-panel",
    },
  };
};

const renderPanel = (
  state: PointsRankingLedgerRuntimeApiBridgeState,
  apiConfigured = true,
  reviewInFlight = false,
) => {
  const onReview = vi.fn();

  render(
    <PointsRankingLedgerRuntimePanel
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

describe("PointsRankingLedgerRuntimePanel", () => {
  it("renders seeded fallback summary, ledger events, ranking, root preview, and no-live boundary", () => {
    const state: PointsRankingLedgerRuntimeApiBridgeState = {
      ...createPointsRankingLedgerRuntimeApiSeededFallbackState(campaignDetail.id),
      diagnostics: [
        {
          code: "API_BASE_URL_MISSING",
          message: {
            "en-US": "No local points ranking ledger runtime API base URL is configured, so seeded review data is shown.",
          },
          severity: "info",
        },
      ],
    };

    renderPanel(state, false);

    const panel = screen.getByLabelText("Points Ranking Ledger Runtime review");

    expect(within(panel).getAllByText("Seeded fallback").length).toBeGreaterThan(0);
    expect(within(panel).getByText("No API trace yet")).toBeInTheDocument();
    expect(within(panel).getByText(/No local API base URL configured/)).toBeInTheDocument();
    expect(within(panel).getByText("Ledger events")).toBeInTheDocument();
    expect(within(panel).getAllByText("Ranking snapshot").length).toBeGreaterThan(0);
    expect(within(panel).getAllByText("Eligibility root preview").length).toBeGreaterThan(0);
    expect(within(panel).getByText("Contract root mode")).toBeInTheDocument();
    expect(within(panel).getAllByText("none").length).toBeGreaterThan(0);
    expect(within(panel).getByText("No Pixiepoints ledger write")).toBeInTheDocument();
    expect(within(panel).getByText("No backend ledger write")).toBeInTheDocument();
    expect(within(panel).getByText("No contract root write")).toBeInTheDocument();
    expect(within(panel).getByText("No reward distribution")).toBeInTheDocument();
    expect(within(panel).getByText(/Local points ranking ledger runtime API bridge only/)).toBeInTheDocument();
  });

  it("renders API-backed source, trace, ledger, ranking, and eligibility details", () => {
    renderPanel(apiBackedState());

    const panel = screen.getByLabelText("Points Ranking Ledger Runtime review");

    expect(within(panel).getByText("API runtime")).toBeInTheDocument();
    expect(within(panel).getAllByText("Review required").length).toBeGreaterThan(0);
    expect(within(panel).getByText("trace-ledger-panel")).toBeInTheDocument();
    expect(within(panel).getAllByText(/camp-awaken-sprint/).length).toBeGreaterThan(0);
    expect(within(panel).getByText(/local-root-/)).toBeInTheDocument();
    expect(within(panel).getByText(/local_preview/)).toBeInTheDocument();
    expect(within(panel).getByText(/eligibility-root-preview/)).toBeInTheDocument();
    expect(within(panel).getAllByText(/Points awarded/).length).toBeGreaterThan(0);
  });

  it("sanitizes unsafe diagnostics before display", () => {
    const state: PointsRankingLedgerRuntimeApiBridgeState = {
      ...apiBackedState(),
      diagnostics: [
        {
          code: "API_REQUEST_FAILED",
          message: {
            "en-US":
              "Request failed with private key, seed phrase, bearer token, signed URL, object key, storage key, raw signature, provider payload, stack trace, and /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/raw?token=secret.",
          },
          severity: "error",
        },
      ],
      source: "error_fallback",
      status: "error",
    };

    renderPanel(state);

    const diagnostics = within(screen.getByLabelText("Points Ranking Ledger Runtime review"))
      .getByLabelText("Sanitized diagnostics");
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
    expect(diagnosticsText).toContain("redacted key");
    expect(diagnosticsText).toContain("redacted provider data");
  });

  it("keeps seeded data visible while loading and wires the review action", () => {
    const loadingState = createPointsRankingLedgerRuntimeApiLoadingState(campaignDetail.id);
    const { onReview } = renderPanel(loadingState, true, true);

    const panel = screen.getByLabelText("Points Ranking Ledger Runtime review");

    expect(within(panel).getByText("Loading ledger runtime")).toBeInTheDocument();
    expect(within(panel).getByText("Ledger events")).toBeInTheDocument();
    expect(within(panel).getAllByText("Ranking snapshot").length).toBeGreaterThan(0);
    expect(within(panel).getByRole("button", { name: "Reviewing ledger runtime..." })).toBeDisabled();

    expect(onReview).not.toHaveBeenCalled();
  });

  it("calls the review handler from the local runtime action", () => {
    const { onReview } = renderPanel(apiBackedState());

    fireEvent.click(screen.getByRole("button", { name: "Review ledger runtime" }));

    expect(onReview).toHaveBeenCalledTimes(1);
  });
});
