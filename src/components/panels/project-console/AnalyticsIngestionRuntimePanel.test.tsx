import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  analyticsIngestionRuntimeApiBoundary,
  createAnalyticsIngestionRuntimeApiLoadingState,
  createAnalyticsIngestionRuntimeApiSeededFallbackState,
  type AnalyticsIngestionRuntimeApiBridgeState,
} from "../../../api/analyticsIngestionRuntimeApiBridge";
import { campaignDetail } from "../../../domain";
import { AnalyticsIngestionRuntimePanel } from "./AnalyticsIngestionRuntimePanel";
import { projectConsoleCopy } from "./copy";

const copy = projectConsoleCopy["en-US"];

const apiBackedState = (): AnalyticsIngestionRuntimeApiBridgeState => {
  const state = createAnalyticsIngestionRuntimeApiSeededFallbackState(
    campaignDetail.id,
    "trace-analytics-panel",
  );

  return {
    ...state,
    boundary: analyticsIngestionRuntimeApiBoundary,
    configured: true,
    diagnostics: [],
    routeCount: 35,
    source: "api_runtime",
    status: "blocked",
    traceId: "trace-analytics-panel",
    readiness: {
      ...state.readiness,
      source: "server_runtime",
      status: "blocked",
      traceId: "trace-analytics-panel",
    },
  };
};

const renderPanel = (
  state: AnalyticsIngestionRuntimeApiBridgeState,
  apiConfigured = true,
  reviewInFlight = false,
) => {
  const onReview = vi.fn();

  render(
    <AnalyticsIngestionRuntimePanel
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

describe("AnalyticsIngestionRuntimePanel", () => {
  it("renders seeded fallback readiness, event catalog, metric lineage, and no-live boundary", () => {
    const state: AnalyticsIngestionRuntimeApiBridgeState = {
      ...createAnalyticsIngestionRuntimeApiSeededFallbackState(campaignDetail.id),
      diagnostics: [
        {
          code: "API_BASE_URL_MISSING",
          message: {
            "en-US": "No local analytics ingestion readiness API base URL is configured, so seeded review data is shown.",
          },
          severity: "info",
        },
      ],
    };

    renderPanel(state, false);

    const panel = screen.getByLabelText("Analytics Ingestion Runtime review");

    expect(within(panel).getAllByText("Seeded fallback").length).toBeGreaterThan(0);
    expect(within(panel).getByText("No API trace yet")).toBeInTheDocument();
    expect(within(panel).getByText(/No local API base URL configured/)).toBeInTheDocument();
    expect(within(panel).getByText("Campaign lifecycle: 1")).toBeInTheDocument();
    expect(within(panel).getByText("Participants: participants")).toBeInTheDocument();
    expect(within(panel).getByText("CAMPAIGN_OS_ANALYTICS_WAREHOUSE_REF")).toBeInTheDocument();
    expect(within(panel).getByText("No live analytics SDK")).toBeInTheDocument();
    expect(within(panel).getByText("No warehouse write")).toBeInTheDocument();
    expect(within(panel).getByText("No browser tracking")).toBeInTheDocument();
    expect(within(panel).getByText("No profiling")).toBeInTheDocument();
    expect(within(panel).getByText("No fingerprinting")).toBeInTheDocument();
    expect(within(panel).getByText(/Local analytics ingestion runtime API bridge only/)).toBeInTheDocument();
  });

  it("renders API-backed source, trace, blockers, and review action", () => {
    const { onReview } = renderPanel(apiBackedState());
    const panel = screen.getByLabelText("Analytics Ingestion Runtime review");

    expect(within(panel).getByText("API runtime")).toBeInTheDocument();
    expect(within(panel).getByText("trace-analytics-panel")).toBeInTheDocument();
    expect(within(panel).getAllByText(/ANALYTICS_WAREHOUSE_HANDOFF_MISSING/).length).toBeGreaterThan(0);
    expect(within(panel).getByText("Participants: participants")).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Review analytics ingestion" })).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("button", { name: "Review analytics ingestion" }));

    expect(onReview).toHaveBeenCalledTimes(1);
  });

  it("sanitizes unsafe diagnostics before display", () => {
    const state: AnalyticsIngestionRuntimeApiBridgeState = {
      ...apiBackedState(),
      diagnostics: [
        {
          code: "API_REQUEST_FAILED",
          message: {
            "en-US":
              "Request failed with private key, seed phrase, bearer token, signed URL, download URL, object key, storage key, warehouse key, raw signature, provider payload, stack trace, and /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/raw?token=secret.",
          },
          severity: "error",
        },
      ],
      source: "error_fallback",
      status: "error",
    };

    renderPanel(state);

    const diagnostics = within(screen.getByLabelText("Analytics Ingestion Runtime review"))
      .getByLabelText("Analytics ingestion sanitized diagnostics");
    const diagnosticsText = diagnostics.textContent?.toLowerCase() ?? "";

    for (const unsafe of [
      "private key",
      "seed phrase",
      "bearer token",
      "signed url",
      "download url",
      "object key",
      "storage key",
      "warehouse key",
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

  it("keeps seeded data visible while loading and disables the review action", () => {
    const loadingState = createAnalyticsIngestionRuntimeApiLoadingState(campaignDetail.id);
    const { onReview } = renderPanel(loadingState, true, true);

    const panel = screen.getByLabelText("Analytics Ingestion Runtime review");

    expect(within(panel).getByText("Loading ingestion readiness")).toBeInTheDocument();
    expect(within(panel).getByText("Campaign lifecycle: 1")).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Reviewing analytics ingestion..." })).toBeDisabled();
    expect(onReview).not.toHaveBeenCalled();
  });

  it("wraps long warehouse references and avoids live operation controls", () => {
    const longKey =
      "CAMPAIGN_OS_ANALYTICS_EXTREMELY_LONG_WAREHOUSE_CONFIGURATION_KEY_FOR_MOBILE_WRAPPING";
    const state: AnalyticsIngestionRuntimeApiBridgeState = {
      ...apiBackedState(),
      readiness: {
        ...apiBackedState().readiness,
        warehouseHandoff: {
          ...apiBackedState().readiness.warehouseHandoff,
          requiredConfigKeys: [longKey],
        },
      },
    };

    renderPanel(state);

    const panel = screen.getByLabelText("Analytics Ingestion Runtime review");

    expect(within(panel).getByText(longKey)).toBeInTheDocument();
    for (const name of [/send/i, /track/i, /warehouse write/i, /profile/i, /fingerprint/i, /reward custody/i, /reward distribution/i]) {
      expect(within(panel).queryByRole("button", { name })).not.toBeInTheDocument();
      expect(within(panel).queryByRole("link", { name })).not.toBeInTheDocument();
    }
  });
});
