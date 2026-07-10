import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  createObjectStorageExportRuntimeApiLoadingState,
  createObjectStorageExportRuntimeApiSeededFallbackState,
  objectStorageExportRuntimeApiBoundary,
  type ObjectStorageExportRuntimeApiBridgeState,
} from "../../../api/objectStorageExportRuntimeApiBridge";
import { campaignDetail } from "../../../domain";
import { projectConsoleCopy } from "./copy";
import { ObjectStorageExportRuntimePanel } from "./ObjectStorageExportRuntimePanel";

const copy = projectConsoleCopy["en-US"];

const apiBackedState = (): ObjectStorageExportRuntimeApiBridgeState => {
  const state = createObjectStorageExportRuntimeApiSeededFallbackState(campaignDetail.id, "trace-storage-panel");

  return {
    ...state,
    boundary: objectStorageExportRuntimeApiBoundary,
    configured: true,
    diagnostics: [],
    routeCount: 34,
    source: "api_runtime",
    status: "blocked",
    traceId: "trace-storage-panel",
    readiness: {
      ...state.readiness,
      source: "api_runtime",
      status: "blocked",
      traceId: "trace-storage-panel",
    },
  };
};

const renderPanel = (
  state: ObjectStorageExportRuntimeApiBridgeState,
  apiConfigured = true,
  reviewInFlight = false,
) => {
  const onReview = vi.fn();

  render(
    <ObjectStorageExportRuntimePanel
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

describe("ObjectStorageExportRuntimePanel", () => {
  it("renders seeded fallback readiness, manifest summary, blockers, and no-live boundary", () => {
    const state: ObjectStorageExportRuntimeApiBridgeState = {
      ...createObjectStorageExportRuntimeApiSeededFallbackState(campaignDetail.id),
      diagnostics: [
        {
          code: "API_BASE_URL_MISSING",
          message: {
            "en-US": "No local object storage export readiness API base URL is configured, so seeded review data is shown.",
          },
          severity: "info",
        },
      ],
    };

    renderPanel(state, false);

    const panel = screen.getByLabelText("Object Storage Export Runtime review");

    expect(within(panel).getAllByText("Seeded fallback").length).toBeGreaterThan(0);
    expect(within(panel).getByText("No API trace yet")).toBeInTheDocument();
    expect(within(panel).getByText(/No local API base URL configured/)).toBeInTheDocument();
    expect(within(panel).getByText("blocked")).toBeInTheDocument();
    expect(within(panel).getByText(/not_configured/)).toBeInTheDocument();
    expect(within(panel).getByText("export-awaken-sprint-preview")).toBeInTheDocument();
    expect(within(panel).getByText("csv")).toBeInTheDocument();
    expect(within(panel).getByText("No upload")).toBeInTheDocument();
    expect(within(panel).getByText("No download")).toBeInTheDocument();
    expect(within(panel).getByText("No signed URL")).toBeInTheDocument();
    expect(within(panel).getByText("No object key")).toBeInTheDocument();
    expect(within(panel).getByText("No provider call")).toBeInTheDocument();
    expect(within(panel).getByText(/Local object storage export readiness API bridge only/)).toBeInTheDocument();
  });

  it("renders API-backed source, trace, provider posture, and review action", () => {
    const { onReview } = renderPanel(apiBackedState());
    const panel = screen.getByLabelText("Object Storage Export Runtime review");

    expect(within(panel).getByText("API runtime")).toBeInTheDocument();
    expect(within(panel).getByText("trace-storage-panel")).toBeInTheDocument();
    expect(within(panel).getAllByText(/OBJECT_STORAGE_PROVIDER_MISSING/).length).toBeGreaterThan(0);
    expect(within(panel).getByText("CAMPAIGN_OS_OBJECT_STORAGE_PROVIDER_REF")).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Review storage readiness" })).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("button", { name: "Review storage readiness" }));

    expect(onReview).toHaveBeenCalledTimes(1);
  });

  it("sanitizes unsafe diagnostics before display", () => {
    const state: ObjectStorageExportRuntimeApiBridgeState = {
      ...apiBackedState(),
      diagnostics: [
        {
          code: "API_REQUEST_FAILED",
          message: {
            "en-US":
              "Request failed with private key, seed phrase, bearer token, signed URL, download URL, object key, storage key, raw signature, provider payload, stack trace, and /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/raw?token=secret.",
          },
          severity: "error",
        },
      ],
      source: "error_fallback",
      status: "error",
    };

    renderPanel(state);

    const diagnostics = within(screen.getByLabelText("Object Storage Export Runtime review"))
      .getByLabelText("Object storage export sanitized diagnostics");
    const diagnosticsText = diagnostics.textContent?.toLowerCase() ?? "";

    for (const unsafe of [
      "private key",
      "seed phrase",
      "bearer token",
      "signed url",
      "download url",
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

  it("keeps seeded data visible while loading and disables the review action", () => {
    const loadingState = createObjectStorageExportRuntimeApiLoadingState(campaignDetail.id);
    const { onReview } = renderPanel(loadingState, true, true);

    const panel = screen.getByLabelText("Object Storage Export Runtime review");

    expect(within(panel).getByText("Loading storage readiness")).toBeInTheDocument();
    expect(within(panel).getByText("export-awaken-sprint-preview")).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Reviewing storage readiness..." })).toBeDisabled();
    expect(onReview).not.toHaveBeenCalled();
  });

  it("wraps long readiness copy and avoids live operation controls", () => {
    const longKey =
      "CAMPAIGN_OS_OBJECT_STORAGE_EXTREMELY_LONG_REQUIRED_CONFIGURATION_KEY_FOR_MOBILE_WRAPPING";
    const longNextAction =
      "Confirm-this-very-long-provider-readiness-runbook-reference-before-any-future-live-object-storage-binding-is-approved";
    const state: ObjectStorageExportRuntimeApiBridgeState = {
      ...apiBackedState(),
      readiness: {
        ...apiBackedState().readiness,
        nextAction: longNextAction,
        requiredConfigKeys: [longKey],
      },
    };

    renderPanel(state);

    const panel = screen.getByLabelText("Object Storage Export Runtime review");

    expect(within(panel).getByText(longKey)).toBeInTheDocument();
    expect(within(panel).getByText(longNextAction)).toBeInTheDocument();
    for (const name of [/upload/i, /download/i, /signed URL/i, /provider execution/i, /contract write/i]) {
      expect(within(panel).queryByRole("button", { name })).not.toBeInTheDocument();
      expect(within(panel).queryByRole("link", { name })).not.toBeInTheDocument();
    }
  });
});
