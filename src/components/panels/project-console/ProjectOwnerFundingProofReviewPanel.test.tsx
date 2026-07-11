import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  createProjectOwnerFundingProofReviewBridgeApiLoadingState,
  createProjectOwnerFundingProofReviewBridgeApiSeededFallbackState,
  projectOwnerFundingProofReviewBridgeApiBoundary,
  type ProjectOwnerFundingProofReviewBridgeApiState,
} from "../../../api/projectOwnerFundingProofReviewBridgeApiBridge";
import { campaignDetail } from "../../../domain";
import { projectOwnerFundingProofRequiredEvidenceKeys } from "../../../domain/projectOwnerFundingProofReviewBridge";
import { projectConsoleCopy } from "./copy";
import { ProjectOwnerFundingProofReviewPanel } from "./ProjectOwnerFundingProofReviewPanel";

const copy = projectConsoleCopy["en-US"];

const apiBackedState = (): ProjectOwnerFundingProofReviewBridgeApiState => {
  const state = createProjectOwnerFundingProofReviewBridgeApiSeededFallbackState(
    campaignDetail.id,
    "trace-funding-proof-panel",
  );

  return {
    ...state,
    boundary: projectOwnerFundingProofReviewBridgeApiBoundary,
    configured: true,
    diagnostics: [],
    routeCount: 39,
    source: "api_runtime",
    status: "blocked",
    traceId: "trace-funding-proof-panel",
    review: {
      ...state.review,
      source: "server_runtime",
      status: "blocked",
      traceId: "trace-funding-proof-panel",
    },
  };
};

const renderPanel = (
  state: ProjectOwnerFundingProofReviewBridgeApiState,
  apiConfigured = true,
  reviewInFlight = false,
) => {
  const onReview = vi.fn();

  render(
    <ProjectOwnerFundingProofReviewPanel
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

describe("ProjectOwnerFundingProofReviewPanel", () => {
  it("renders seeded fallback proof package blockers, evidence keys, item rows, and no-live boundary", () => {
    const state: ProjectOwnerFundingProofReviewBridgeApiState = {
      ...createProjectOwnerFundingProofReviewBridgeApiSeededFallbackState(campaignDetail.id),
      diagnostics: [
        {
          code: "API_BASE_URL_MISSING",
          message: {
            "en-US": "No local project owner funding proof review API base URL is configured, so seeded review data is shown.",
          },
          severity: "info",
        },
      ],
    };

    renderPanel(state, false);

    const panel = screen.getByLabelText("Project Owner Funding Proof Review Bridge review");

    expect(within(panel).getAllByText("Seeded fallback").length).toBeGreaterThan(0);
    expect(within(panel).getByText("No API trace yet")).toBeInTheDocument();
    expect(within(panel).getByText(/No local API base URL configured/)).toBeInTheDocument();
    expect(within(panel).getAllByText("missing").length).toBeGreaterThan(0);
    for (const key of projectOwnerFundingProofRequiredEvidenceKeys) {
      expect(within(panel).getByText(key)).toBeInTheDocument();
    }

    const proofPackage = within(panel).getByLabelText("Proof package");

    expect(within(proofPackage).getByText("Funding proof reference")).toBeInTheDocument();
    expect(within(proofPackage).getByText("Reward provider statement")).toBeInTheDocument();
    expect(within(proofPackage).getByText("Amount summary")).toBeInTheDocument();
    expect(within(proofPackage).getByText("Export batch")).toBeInTheDocument();
    expect(within(proofPackage).getByText("Recipient list hash")).toBeInTheDocument();
    expect(within(proofPackage).getByText("Disclaimer signoff")).toBeInTheDocument();
    expect(within(proofPackage).getByText("Finance review reference")).toBeInTheDocument();
    expect(within(proofPackage).getByText("Operator review reference")).toBeInTheDocument();
    expect(within(panel).getAllByText("Funding proof reference").length).toBeGreaterThan(0);
    expect(within(panel).getByText("Operator review")).toBeInTheDocument();
    expect(within(panel).getByText("No funding transfer")).toBeInTheDocument();
    expect(within(panel).getByText("No object storage write")).toBeInTheDocument();
    expect(within(panel).getByText("No reward distribution")).toBeInTheDocument();
    expect(within(panel).getByText(/Local project owner funding proof review API bridge only/)).toBeInTheDocument();
  });

  it("renders API-backed source, trace, package summary, and review action", () => {
    const { onReview } = renderPanel(apiBackedState());
    const panel = screen.getByLabelText("Project Owner Funding Proof Review Bridge review");

    expect(within(panel).getByText("API runtime")).toBeInTheDocument();
    expect(within(panel).getByText("Blocked")).toBeInTheDocument();
    expect(within(panel).getByText("trace-funding-proof-panel")).toBeInTheDocument();
    expect(within(panel).getAllByText(/PROJECT_OWNER_FUNDING_PROOF_REFERENCE_MISSING/).length).toBeGreaterThan(0);
    expect(within(panel).getByRole("button", { name: "Review funding proof" })).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("button", { name: "Review funding proof" }));

    expect(onReview).toHaveBeenCalledTimes(1);
  });

  it("sanitizes unsafe diagnostics before display", () => {
    const state: ProjectOwnerFundingProofReviewBridgeApiState = {
      ...apiBackedState(),
      diagnostics: [
        {
          code: "API_REQUEST_FAILED",
          message: {
            "en-US":
              "Request failed with privateKey, seedPhrase, bearer token, signature, transactionId, payoutId, custodyId, distributionTx, providerPayload, walletSignature, contractWrite, claimTransaction, stack trace, and /private/funding-proof/raw?token=secret.",
          },
          severity: "error",
        },
      ],
      source: "error_fallback",
      status: "error",
    };

    renderPanel(state);

    const diagnostics = within(screen.getByLabelText("Project Owner Funding Proof Review Bridge review"))
      .getByLabelText("Project owner funding proof sanitized diagnostics");
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
      "/private/funding-proof",
      "token=secret",
    ]) {
      expect(diagnosticsText).not.toContain(unsafe);
    }
    expect(diagnosticsText).toContain("redacted:private_key");
  });

  it("keeps seeded data visible while loading and disables the review action", () => {
    const loadingState = createProjectOwnerFundingProofReviewBridgeApiLoadingState(campaignDetail.id);
    const { onReview } = renderPanel(loadingState, true, true);
    const panel = screen.getByLabelText("Project Owner Funding Proof Review Bridge review");

    expect(within(panel).getByText("Loading funding proof")).toBeInTheDocument();
    expect(within(panel).getAllByText("Funding proof reference").length).toBeGreaterThan(0);
    expect(within(panel).getByRole("button", { name: "Reviewing funding proof..." })).toBeDisabled();
    expect(onReview).not.toHaveBeenCalled();
  });

  it("wraps long evidence keys and avoids live operation controls", () => {
    const longKey =
      "CAMPAIGN_OS_REWARD_EXTREMELY_LONG_FUNDING_PROOF_REQUIRED_EVIDENCE_KEY_FOR_MOBILE_WRAPPING";
    const state: ProjectOwnerFundingProofReviewBridgeApiState = {
      ...apiBackedState(),
      review: {
        ...apiBackedState().review,
        proofPackage: {
          ...apiBackedState().review.proofPackage,
          requiredEvidenceKeys: [longKey as never],
        },
        requiredEvidenceKeys: [longKey as never],
      },
    };

    renderPanel(state);

    const panel = screen.getByLabelText("Project Owner Funding Proof Review Bridge review");

    expect(within(panel).getByText(longKey)).toBeInTheDocument();
    for (const name of [
      /upload/i,
      /storage/i,
      /payout/i,
      /claim/i,
      /custody/i,
      /sign/i,
      /contract/i,
      /provider/i,
      /queue/i,
      /scheduler/i,
      /worker/i,
      /distribute/i,
    ]) {
      expect(within(panel).queryByRole("button", { name })).not.toBeInTheDocument();
      expect(within(panel).queryByRole("link", { name })).not.toBeInTheDocument();
    }
  });
});
