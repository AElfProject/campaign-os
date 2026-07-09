import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  createPublishDeliveryReviewApiSeededFallbackState,
  publishDeliveryReviewApiBoundary,
  type PublishDeliveryReviewApiBridgeState,
} from "../../../api/publishDeliveryReviewApiBridge";
import { campaignDetail } from "../../../domain";
import { PublishDeliveryReviewPanel } from "./PublishDeliveryReviewPanel";

const apiBackedState = (): PublishDeliveryReviewApiBridgeState => {
  const state = createPublishDeliveryReviewApiSeededFallbackState(campaignDetail.id, "trace-publish-panel");

  return {
    ...state,
    boundary: publishDeliveryReviewApiBoundary,
    configured: true,
    diagnostics: [],
    routeCount: 32,
    source: "api_runtime",
    status: "blocked",
    traceId: "trace-publish-panel",
    review: {
      ...state.review,
      source: "api_runtime",
      status: "blocked",
      traceId: "trace-publish-panel",
    },
  };
};

const renderPanel = (state: PublishDeliveryReviewApiBridgeState, apiConfigured = true) => {
  const onReview = vi.fn();

  render(
    <PublishDeliveryReviewPanel
      apiConfigured={apiConfigured}
      locale="en-US"
      onReview={onReview}
      reviewInFlight={false}
      state={state}
    />,
  );

  return { onReview };
};

describe("PublishDeliveryReviewPanel", () => {
  it("renders API-backed publish delivery review fields", () => {
    renderPanel(apiBackedState());

    const panel = screen.getByLabelText("Publish Delivery Review Bridge");

    expect(within(panel).getByText("API runtime")).toBeInTheDocument();
    expect(within(panel).getByText("Blocked")).toBeInTheDocument();
    expect(within(panel).getByText("trace-publish-panel")).toBeInTheDocument();
    expect(within(panel).getByText("blocked")).toBeInTheDocument();
    expect(within(panel).getByText(/Blockers \/ warnings \/ passed/)).toBeInTheDocument();
    expect(within(panel).getByText("Delivery checklist")).toBeInTheDocument();
    expect(within(panel).getByText("Launch bundles")).toBeInTheDocument();
    expect(within(panel).getByText("Repository evidence")).toBeInTheDocument();
    expect(within(panel).getByText("productionReady=false")).toBeInTheDocument();
    expect(within(panel).getByText("No production publish")).toBeInTheDocument();
    expect(within(panel).getByText("No contract write")).toBeInTheDocument();
    expect(within(panel).getByText("No reward custody")).toBeInTheDocument();
    expect(within(panel).getByText("No reward distribution")).toBeInTheDocument();
  });

  it("renders seeded fallback with local-review boundary and diagnostic", () => {
    const state: PublishDeliveryReviewApiBridgeState = {
      ...createPublishDeliveryReviewApiSeededFallbackState(campaignDetail.id),
      diagnostics: [
        {
          code: "API_BASE_URL_MISSING",
          message: {
            "en-US": "No local publish delivery review API base URL is configured, so seeded review data is shown.",
          },
          severity: "info",
        },
      ],
    };

    renderPanel(state, false);

    const panel = screen.getByLabelText("Publish Delivery Review Bridge");

    expect(within(panel).getAllByText("Seeded fallback").length).toBeGreaterThan(0);
    expect(within(panel).getByText("No API trace yet")).toBeInTheDocument();
    expect(within(panel).getByText(/No local API base URL configured/)).toBeInTheDocument();
    expect(within(panel).getByText(/API_BASE_URL_MISSING/)).toBeInTheDocument();
    expect(within(panel).getByText(/Local front-end\/back-end publish delivery review bridge only/)).toBeInTheDocument();
  });

  it("sanitizes unsafe diagnostic text", () => {
    const state: PublishDeliveryReviewApiBridgeState = {
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

    const diagnostics = within(screen.getByLabelText("Publish Delivery Review Bridge")).getByLabelText("Diagnostics");
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

  it("does not render production action controls", () => {
    renderPanel(apiBackedState());

    const panel = screen.getByLabelText("Publish Delivery Review Bridge");

    expect(
      within(panel).queryByRole("button", {
        name: /publish|contract|reward|distribute|custody|provider/i,
      }),
    ).not.toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Review local bridge" })).toBeInTheDocument();
  });

  it("calls the review handler from the local review action", () => {
    const { onReview } = renderPanel(apiBackedState());

    fireEvent.click(screen.getByRole("button", { name: "Review local bridge" }));

    expect(onReview).toHaveBeenCalledTimes(1);
  });
});
