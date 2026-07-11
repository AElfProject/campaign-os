import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  createProductionDatabaseHandoffReadinessApiSeededFallbackState,
  type ProductionDatabaseHandoffReadinessApiState,
} from "../../../api/productionDatabaseHandoffReadinessApiBridge";
import { projectConsoleCopy } from "./copy";
import { ProductionDatabaseHandoffReadinessPanel } from "./ProductionDatabaseHandoffReadinessPanel";

const copy = projectConsoleCopy["en-US"];

const apiBackedState = (): ProductionDatabaseHandoffReadinessApiState => {
  const state = createProductionDatabaseHandoffReadinessApiSeededFallbackState(
    "trace-production-database-panel",
  );

  return {
    ...state,
    configured: true,
    diagnostics: [],
    routeCount: 40,
    source: "api_runtime",
    traceId: "trace-production-database-panel",
    handoff: {
      ...state.handoff,
      source: "server_runtime",
      traceId: "trace-production-database-panel",
    },
  };
};

const renderPanel = (
  state: ProductionDatabaseHandoffReadinessApiState,
  apiConfigured = true,
  reviewInFlight = false,
) => {
  const onReview = vi.fn();

  render(
    <ProductionDatabaseHandoffReadinessPanel
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

describe("ProductionDatabaseHandoffReadinessPanel", () => {
  it("renders seeded fallback metadata without an API base URL", () => {
    const state: ProductionDatabaseHandoffReadinessApiState = {
      ...createProductionDatabaseHandoffReadinessApiSeededFallbackState(),
      diagnostics: [
        {
          code: "API_BASE_URL_MISSING",
          message: {
            "en-US": "No local production database handoff API base URL is configured, so seeded review data is shown.",
          },
          severity: "info",
        },
      ],
    };

    renderPanel(state, false);

    const panel = screen.getByLabelText("Production Database Handoff Readiness review");

    expect(within(panel).getAllByText("Seeded fallback").length).toBeGreaterThan(0);
    expect(within(panel).getByText("No API trace yet")).toBeInTheDocument();
    expect(within(panel).getByText(/No local API base URL configured/)).toBeInTheDocument();
    expect(within(panel).getByText("Local MVP ready")).toBeInTheDocument();
    expect(within(panel).getByText("Production DB activation disabled")).toBeInTheDocument();
    expect(within(panel).getByText("CAMPAIGN_OS_DATABASE_PACKAGE")).toBeInTheDocument();
    expect(within(panel).getByText("CAMPAIGN_OS_DATABASE_SECRET_REF")).toBeInTheDocument();
    expect(within(panel).getByText("Campaign DB / campaign-db")).toBeInTheDocument();
    expect(within(panel).getByText("No database client")).toBeInTheDocument();
    expect(within(panel).getByText("No secret reveal")).toBeInTheDocument();
  });

  it("renders API-backed source, trace id, package binding, migration gate, rollback, and review action", () => {
    const { onReview } = renderPanel(apiBackedState());
    const panel = screen.getByLabelText("Production Database Handoff Readiness review");

    expect(within(panel).getByText("API runtime")).toBeInTheDocument();
    expect(within(panel).getByText("Blocked")).toBeInTheDocument();
    expect(within(panel).getByText("trace-production-database-panel")).toBeInTheDocument();
    expect(within(panel).getByText("pg (npm:pg)")).toBeInTheDocument();
    expect(within(panel).getByText(/campaign-os-postgresql-provider-deferred/)).toBeInTheDocument();
    expect(within(panel).getByText("metadata_only_no_import")).toBeInTheDocument();
    expect(within(panel).getAllByText("production-db-schema-cutover").length).toBeGreaterThan(0);
    expect(within(panel).getByText("Rollback plan not ready")).toBeInTheDocument();
    expect(within(panel).getByText("Migration required")).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Review DB handoff metadata" })).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("button", { name: "Review DB handoff metadata" }));

    expect(onReview).toHaveBeenCalledTimes(1);
  });

  it("sanitizes unsafe diagnostics before display", () => {
    const state: ProductionDatabaseHandoffReadinessApiState = {
      ...apiBackedState(),
      diagnostics: [
        {
          code: "API_REQUEST_FAILED",
          message: {
            "en-US":
              "Request failed with postgres://root:secret@db.example/app, bearer token, stack trace, and /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/raw?token=secret.",
          },
          safeDetails: {
            rawUrl: "https://db.example.invalid/raw?token=secret",
            localPath: "/private/tmp/campaign-os-kitty/unsafe",
          },
          severity: "error",
        },
      ],
    };

    renderPanel(state);

    const diagnostics = within(screen.getByLabelText("Production Database Handoff Readiness review"))
      .getByLabelText("Production database handoff sanitized diagnostics");
    const diagnosticsText = diagnostics.textContent?.toLowerCase() ?? "";

    for (const unsafe of [
      "postgres://",
      "root:secret",
      "bearer token",
      "stack trace",
      "/users/aelf",
      "/private/tmp",
      "token=secret",
      "campaign-os-kitty/raw",
    ]) {
      expect(diagnosticsText).not.toContain(unsafe);
    }
    expect(diagnosticsText).toContain("redacted-production-database-handoff-value");
    expect(diagnosticsText).toContain("redacted:endpoint");
    expect(diagnosticsText).toContain("redacted:private_path");
  });

  it("keeps long reference keys reviewable and avoids live database operation controls", () => {
    const longKey =
      "CAMPAIGN_OS_DATABASE_EXTREMELY_LONG_REQUIRED_REFERENCE_KEY_FOR_MOBILE_WRAPPING_AND_REVIEW";
    const state = apiBackedState();

    renderPanel({
      ...state,
      handoff: {
        ...state.handoff,
        requiredReferences: [
          ...state.handoff.requiredReferences,
          {
            area: "connection",
            id: "long-production-database-reference",
            key: longKey,
            message: "Long production database reference key is required before production activation.",
            redacted: true,
            requiredBeforeProduction: true,
            status: "blocked",
          },
        ],
      },
    });

    const panel = screen.getByLabelText("Production Database Handoff Readiness review");

    expect(within(panel).getByText(longKey)).toBeInTheDocument();
    for (const name of [
      /connect db/i,
      /run migration/i,
      /query/i,
      /write/i,
      /transaction/i,
      /reveal secret/i,
      /enable production/i,
      /import driver/i,
    ]) {
      expect(within(panel).queryByRole("button", { name })).not.toBeInTheDocument();
      expect(within(panel).queryByRole("link", { name })).not.toBeInTheDocument();
    }
  });
});
