import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  backendRuntimeReadinessApiBoundary,
  seededBackendRuntimeReadinessSummary,
  type BackendRuntimeReadinessApiBridgeState,
} from "../../../api/backendRuntimeReadinessApiBridge";
import { projectConsoleCopy } from "./copy";
import { BackendRuntimeReadinessPanel } from "./BackendRuntimeReadinessPanel";

const copy = projectConsoleCopy["en-US"];

const baseState = (): BackendRuntimeReadinessApiBridgeState => ({
  boundary: backendRuntimeReadinessApiBoundary,
  configured: true,
  diagnostics: [],
  loading: false,
  source: "api_runtime",
  status: "ready",
  summary: {
    ...seededBackendRuntimeReadinessSummary,
    futureProductionBlockerIds: ["reward-custody", "reward-distribution"],
    mvpReleaseBlockerIds: [],
    mvpReleaseReady: true,
  },
  traceId: "trace-backend-runtime-visible",
});

const renderPanel = (state: BackendRuntimeReadinessApiBridgeState, apiConfigured = true) => {
  const onReview = vi.fn();

  render(
    <BackendRuntimeReadinessPanel
      apiConfigured={apiConfigured}
      copy={copy}
      locale="en-US"
      onReview={onReview}
      reviewInFlight={false}
      state={state}
    />,
  );

  return { onReview };
};

describe("BackendRuntimeReadinessPanel", () => {
  it("renders API-backed backend readiness metadata", () => {
    const state = baseState();

    renderPanel(state);

    const panel = screen.getByLabelText("Backend Runtime Readiness review");
    expect(within(panel).getByText("API runtime")).toBeInTheDocument();
    expect(within(panel).getByText("trace-backend-runtime-visible")).toBeInTheDocument();
    expect(within(panel).getByText("local-review")).toBeInTheDocument();
    expect(within(panel).getByText("2 / 2")).toBeInTheDocument();
    expect(within(panel).getByText("npm run server:start")).toBeInTheDocument();
    expect(within(panel).getByText("npm run server:smoke")).toBeInTheDocument();
    expect(within(panel).getByText("/api/health")).toBeInTheDocument();
    expect(within(panel).getByText("/api/contracts")).toBeInTheDocument();
    expect(within(panel).getByText("database")).toBeInTheDocument();
    expect(within(panel).getByText("CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT_REF")).toBeInTheDocument();
    expect(within(panel).getByText("No contract write")).toBeInTheDocument();
    expect(within(panel).getByText(/No live provider call/)).toBeInTheDocument();
  });

  it("renders MVP release gate separately from future production blockers", () => {
    renderPanel(baseState());

    const panel = screen.getByLabelText("Backend Runtime Readiness review");

    expect(within(panel).getByText("MVP/local review gate")).toBeInTheDocument();
    expect(within(panel).getByText("Ready for local MVP review")).toBeInTheDocument();
    expect(within(panel).getByText("0 MVP blockers")).toBeInTheDocument();
    expect(within(panel).getByText("Future/full production blockers")).toBeInTheDocument();
    expect(within(panel).getByText("2 future blockers")).toBeInTheDocument();
    expect(within(panel).getAllByText("reward-custody").length).toBeGreaterThan(0);
    expect(within(panel).getAllByText("reward-distribution").length).toBeGreaterThan(0);
    expect(within(panel).queryByText("0 future blockers")).not.toBeInTheDocument();
    expect(within(panel).getByText("No reward custody")).toBeInTheDocument();
    expect(within(panel).getByText("No reward distribution")).toBeInTheDocument();
  });

  it("renders seeded fallback and missing API diagnostic without fetching", () => {
    const state: BackendRuntimeReadinessApiBridgeState = {
      ...baseState(),
      configured: false,
      diagnostics: [
        {
          code: "API_BASE_URL_MISSING",
          message: {
            "en-US": "No local backend readiness API base URL is configured, so seeded readiness is shown.",
          },
          severity: "info",
        },
      ],
      source: "seeded_fallback",
      status: "fallback",
      traceId: undefined,
    };

    renderPanel(state, false);

    const panel = screen.getByLabelText("Backend Runtime Readiness review");
    expect(within(panel).getAllByText("Seeded fallback").length).toBeGreaterThan(0);
    expect(within(panel).getByText("No API trace yet")).toBeInTheDocument();
    expect(within(panel).getByText(/No local API base URL configured/)).toBeInTheDocument();
    expect(
      within(panel).getByText("API_BASE_URL_MISSING: No local backend readiness API base URL is configured, so seeded readiness is shown."),
    ).toBeInTheDocument();
  });

  it("renders long route ids and config keys without throwing", () => {
    const longRouteId =
      "runtime.contracts.extraordinarily.long.route.identifier.with.many.segments.for.mobile-wrapping";
    const longConfigKey =
      "VITE_CAMPAIGN_OS_BACKEND_RUNTIME_READINESS_EXTREMELY_LONG_REQUIRED_CONFIGURATION_KEY";
    const state: BackendRuntimeReadinessApiBridgeState = {
      ...baseState(),
      summary: {
        ...seededBackendRuntimeReadinessSummary,
        profile: {
          ...seededBackendRuntimeReadinessSummary.profile,
          missingRequiredConfigKeys: [longConfigKey],
          requiredConfigKeys: [longConfigKey],
        },
        routeCoverage: {
          ...seededBackendRuntimeReadinessSummary.routeCoverage,
          missingApiSkillIds: ["api.skill.with.a.very.long.identifier"],
          routeIds: [longRouteId],
        },
      },
    };

    renderPanel(state);

    expect(screen.getByText(longRouteId)).toBeInTheDocument();
    expect(screen.getAllByText(longConfigKey).length).toBeGreaterThan(0);
  });

  it("sanitizes secret-like diagnostic values", () => {
    const state: BackendRuntimeReadinessApiBridgeState = {
      ...baseState(),
      diagnostics: [
        {
          code: "API_REQUEST_FAILED",
          message: {
            "en-US": "request failed with bearer abc123 and /Users/aelf/workspace/private-runtime/private.md",
          },
          severity: "error",
        },
      ],
      source: "error_fallback",
      status: "error",
    };

    renderPanel(state);

    expect(screen.queryByText(/abc123/)).not.toBeInTheDocument();
    expect(screen.queryByText(/private-runtime/)).not.toBeInTheDocument();
    expect(screen.getByText(/redacted bearer credential/)).toBeInTheDocument();
    expect(screen.getByText(/redacted local path/)).toBeInTheDocument();
  });

  it("calls review handler from the review action", () => {
    const { onReview } = renderPanel(baseState());

    fireEvent.click(screen.getByRole("button", { name: "Review backend runtime" }));

    expect(onReview).toHaveBeenCalledTimes(1);
  });
});
