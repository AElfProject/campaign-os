import "@testing-library/jest-dom/vitest";
import { act, StrictMode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../../../app/App";
import { campaignDetail, walletSessions, type NormalizedWalletSession } from "../../../domain";
import { loadCampaignDiscoveryApiBridgeState } from "../../../api/campaignDiscoveryApiBridge";
import type {
  ParticipantCampaignFeedItem,
  ParticipantJourneyDurableSession,
  ParticipantJourneyApiBridge,
  ParticipantJourneyFailure,
  ParticipantJourneyProjection,
  ParticipantJourneyResult,
  ParticipantVerifyResult,
} from "../../../api/participantJourneyApiBridge";
import { submitUserParticipationApiReview } from "../../../api/userParticipationApiBridge";
import { UserAppPanel } from "./UserAppPanel";

vi.mock("../../../api/campaignDiscoveryApiBridge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../api/campaignDiscoveryApiBridge")>();

  return {
    ...actual,
    loadCampaignDiscoveryApiBridgeState: vi.fn(actual.loadCampaignDiscoveryApiBridgeState),
  };
});

vi.mock("../../../api/userParticipationApiBridge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../api/userParticipationApiBridge")>();

  return {
    ...actual,
    submitUserParticipationApiReview: vi.fn(actual.submitUserParticipationApiReview),
  };
});

describe("User App shell", () => {
  const originalApiBaseUrl = import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL;
  const mockedLoadBridgeState = vi.mocked(loadCampaignDiscoveryApiBridgeState);
  const mockedSubmitUserParticipationReview = vi.mocked(submitUserParticipationApiReview);

  const getUserAppConnectWalletButton = (name: string) => {
    const header = screen.queryByRole("banner");
    const buttons = screen.getAllByRole("button", { name });
    const userAppButton = buttons.find((button) => !header?.contains(button));

    expect(userAppButton).toBeDefined();

    return userAppButton as HTMLElement;
  };

  const clickBridgeTaskApiReview = async () => {
    const taskVerification = screen.getByRole("heading", { name: "Task verification states" }).closest("section");

    expect(taskVerification).not.toBeNull();

    const bridgeTask = within(taskVerification as HTMLElement)
      .getAllByRole("listitem")
      .find((item) => within(item).queryByText("Bridge via eBridge"));

    expect(bridgeTask).toBeDefined();

    await act(async () => {
      fireEvent.click(within(bridgeTask as HTMLElement).getByRole("button", { name: "Review with API" }));
    });
  };

  beforeEach(() => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "";
    mockedLoadBridgeState.mockReset();
    mockedSubmitUserParticipationReview.mockReset();
  });

  afterEach(() => {
    window.localStorage.clear();
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = originalApiBaseUrl;
  });

  it("renders disabled seeded fallback bridge state while preserving seeded campaign cards", () => {
    render(<UserAppPanel locale="en-US" />);

    const bridge = screen.getByRole("complementary", { name: "Campaign Discovery API bridge status" });

    expect(mockedLoadBridgeState).not.toHaveBeenCalled();
    expect(within(bridge).getByText("Seeded fallback")).toBeInTheDocument();
    expect(within(bridge).getByText("Campaign count")).toBeInTheDocument();
    expect(within(bridge).getByText("3")).toBeInTheDocument();
    expect(within(bridge).getByText("Local API not configured")).toBeInTheDocument();
    expect(within(bridge).getByText("No API trace")).toBeInTheDocument();
    expect(within(bridge).getByText(/No production service/)).toBeInTheDocument();
    expect(screen.getAllByText("Forest NFT Quest").length).toBeGreaterThan(0);
    expect(screen.getAllByText("TMRWDAO Governance Streak").length).toBeGreaterThan(0);
  });

  it("renders seeded fallback user participation API state when API base URL is absent", () => {
    render(<UserAppPanel locale="en-US" />);

    const bridge = screen.getByRole("complementary", { name: "User Participation API review status" });

    expect(mockedSubmitUserParticipationReview).not.toHaveBeenCalled();
    expect(within(bridge).getAllByText("Seeded fallback").length).toBeGreaterThan(0);
    expect(bridge).toHaveTextContent("API_BASE_URL_MISSING: No local participation API base URL is configured, so the seeded User App remains visible.");
    expect(within(bridge).getByText(/Local-only API review boundary/)).toBeInTheDocument();
    expect(within(bridge).getByText(/No live provider or indexer call/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Eligibility checker" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "API not configured" }).length).toBeGreaterThan(0);
  });

  it("renders API-backed bridge state with trace ID and route readiness", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5174";
    mockedLoadBridgeState.mockResolvedValueOnce({
      boundary: {
        "en-US": "Local API review only; no production side effects are executed.",
        "zh-CN": "Local API review only; no production side effects are executed.",
        "zh-TW": "Local API review only; no production side effects are executed.",
      },
      campaignCount: 1,
      campaigns: [
        {
          ...campaignDetail,
          campaignType: { "en-US": "API campaign", "zh-CN": "API campaign", "zh-TW": "API campaign" },
          consumerSurfaces: ["user_app"],
          coreTasks: [],
          cta: {
            kind: "start",
            label: { "en-US": "Start", "zh-CN": "Start", "zh-TW": "Start" },
            reason: { "en-US": "API campaign", "zh-CN": "API campaign", "zh-TW": "API campaign" },
          },
          points: 42,
          tags: [],
          timeWindow: { "en-US": "Local API", "zh-CN": "Local API", "zh-TW": "Local API" },
        },
      ],
      configured: true,
      healthStatus: "ready",
      loading: false,
      readinessSummary: "ready; 18 routes",
      routeCount: 18,
      source: "api",
      traceId: "trace-api-visible",
    });

    render(<UserAppPanel locale="en-US" />);

    const bridge = await screen.findByRole("complementary", { name: "Campaign Discovery API bridge status" });

    expect(mockedLoadBridgeState).toHaveBeenCalledWith(expect.objectContaining({
      config: expect.objectContaining({
        baseUrl: "http://127.0.0.1:5174",
        tracePrefix: "user-app-campaign-discovery",
      }),
    }));
    await waitFor(() => expect(within(bridge).getByText("API runtime")).toBeInTheDocument());
    expect(within(bridge).getByText("trace-api-visible")).toBeInTheDocument();
    expect(within(bridge).getByText("ready; 18 routes")).toBeInTheDocument();
    expect(within(bridge).getByText("1")).toBeInTheDocument();
    expect(screen.getAllByText("Awaken Sprint").length).toBeGreaterThan(0);
  });

  it("clicks API review action and renders verification plus eligibility result", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5174";
    mockedLoadBridgeState.mockResolvedValueOnce({
      boundary: {
        "en-US": "Local API review only; no production side effects are executed.",
        "zh-CN": "Local API review only; no production side effects are executed.",
        "zh-TW": "Local API review only; no production side effects are executed.",
      },
      campaignCount: 0,
      campaigns: [],
      configured: true,
      loading: false,
      source: "error_fallback",
    });
    mockedSubmitUserParticipationReview.mockResolvedValueOnce({
      boundary: {
        "en-US": "Local user participation API review only. No live provider or indexer call, wallet signature, contract write, export file, storage write, reward custody, or reward distribution is executed.",
        "zh-CN": "Local user participation API review only.",
        "zh-TW": "Local user participation API review only.",
      },
      configured: true,
      diagnostics: [],
      eligibility: {
        accountType: "EOA",
        campaignId: campaignDetail.id,
        eligible: false,
        localePreference: "zh-CN",
        missingTasks: ["task-swap"],
        riskFlags: ["referral_velocity_review"],
        score: 160,
        status: "pending",
        walletAddress: "3E9...7cD",
        walletSource: "PORTKEY_EOA_EXTENSION",
        walletTypeVerified: true,
      },
      loading: false,
      request: {
        accountType: "EOA",
        campaignId: campaignDetail.id,
        taskId: "task-bridge",
        walletAddress: "3E9...7cD",
        walletSource: "PORTKEY_EOA_EXTENSION",
      },
      source: "api_runtime",
      status: "eligibility_checked",
      traceId: "trace-participation-visible",
      verification: {
        accountType: "EOA",
        campaignId: campaignDetail.id,
        evidenceHash: "api-evidence-hash",
        evidenceSource: "DAPP_API",
        pointsAwarded: 120,
        pointsAvailable: 120,
        riskFlags: [],
        status: "completed",
        taskId: "task-bridge",
        walletAddress: "3E9...7cD",
        walletSource: "PORTKEY_EOA_EXTENSION",
      },
    });

    render(<UserAppPanel locale="en-US" />);

    await clickBridgeTaskApiReview();

    await waitFor(() => expect(mockedSubmitUserParticipationReview).toHaveBeenCalledWith({
      config: {
        baseUrl: "http://127.0.0.1:5174",
        tracePrefix: "user-app-participation-review",
      },
      request: {
        accountType: "EOA",
        campaignId: campaignDetail.id,
        taskId: "task-bridge",
        walletAddress: "3E9...7cD",
        walletSource: "PORTKEY_EOA_EXTENSION",
      },
    }));

    const bridge = await screen.findByRole("complementary", { name: "User Participation API review status" });

    expect(within(bridge).getByText("API runtime")).toBeInTheDocument();
    expect(within(bridge).getByText("trace-participation-visible")).toBeInTheDocument();
    expect(within(bridge).getByText("completed · Points awarded: 120/120")).toBeInTheDocument();
    expect(within(bridge).getByText("pending · Score: 160 · Wallet type verified: Eligible")).toBeInTheDocument();
    expect(within(bridge).getByText("api-evidence-hash")).toBeInTheDocument();
    expect(within(bridge).getByText("task-swap")).toBeInTheDocument();
    expect(within(bridge).getByText("referral_velocity_review")).toBeInTheDocument();
    expect(bridge).toHaveTextContent("No diagnostics");
  });

  it("shows partial state when eligibility refresh fails after verification", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5174";
    mockedLoadBridgeState.mockResolvedValueOnce({
      boundary: {
        "en-US": "Local API review only.",
        "zh-CN": "Local API review only.",
        "zh-TW": "Local API review only.",
      },
      campaignCount: 0,
      campaigns: [],
      configured: true,
      loading: false,
      source: "error_fallback",
    });
    mockedSubmitUserParticipationReview.mockResolvedValueOnce({
      boundary: {
        "en-US": "Local user participation API review only. No live provider or indexer call, wallet signature, contract write, export file, storage write, reward custody, or reward distribution is executed.",
        "zh-CN": "Local user participation API review only.",
        "zh-TW": "Local user participation API review only.",
      },
      configured: true,
      diagnostics: [{
        code: "API_ELIGIBILITY_FAILED",
        message: {
          "en-US": "Task verification completed, but the local eligibility refresh did not return a usable result.",
          "zh-CN": "Task verification completed.",
          "zh-TW": "Task verification completed.",
        },
        safeDetails: { endpoint: "/api/campaigns/camp-awaken-sprint/eligibility", status: 500 },
        severity: "error",
      }],
      loading: false,
      request: {
        accountType: "EOA",
        campaignId: campaignDetail.id,
        taskId: "task-bridge",
        walletAddress: "3E9...7cD",
        walletSource: "PORTKEY_EOA_EXTENSION",
      },
      source: "api_runtime",
      status: "partial",
      traceId: "trace-partial-visible",
      verification: {
        accountType: "EOA",
        campaignId: campaignDetail.id,
        pointsAwarded: 40,
        riskFlags: [],
        status: "manual_review",
        taskId: "task-bridge",
        walletAddress: "3E9...7cD",
        walletSource: "PORTKEY_EOA_EXTENSION",
      },
    });

    render(<UserAppPanel locale="en-US" />);

    await clickBridgeTaskApiReview();

    const bridge = await screen.findByRole("complementary", { name: "User Participation API review status" });

    await waitFor(() => expect(within(bridge).getByText("Partial success")).toBeInTheDocument());
    expect(within(bridge).getByText("manual_review · Points awarded: 40/-")).toBeInTheDocument();
    expect(within(bridge).getByText(/API_ELIGIBILITY_FAILED/)).toBeInTheDocument();
    expect(within(bridge).getByText("Task verification completed, but eligibility refresh needs follow-up.")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Eligibility checker" })).toBeInTheDocument();
  });

  it("shows sanitized diagnostics for unsafe API errors", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5174";
    mockedLoadBridgeState.mockResolvedValueOnce({
      boundary: {
        "en-US": "Local API review only.",
        "zh-CN": "Local API review only.",
        "zh-TW": "Local API review only.",
      },
      campaignCount: 0,
      campaigns: [],
      configured: true,
      loading: false,
      source: "error_fallback",
    });
    mockedSubmitUserParticipationReview.mockResolvedValueOnce({
      boundary: {
        "en-US": "Local user participation API review only. No live provider or indexer call, wallet signature, contract write, export file, storage write, reward custody, or reward distribution is executed.",
        "zh-CN": "Local user participation API review only.",
        "zh-TW": "Local user participation API review only.",
      },
      configured: true,
      diagnostics: [{
        code: "API_VERIFY_FAILED",
        message: {
          "en-US": "The local task verification route did not return a usable result.",
          "zh-CN": "The local task verification route did not return a usable result.",
          "zh-TW": "The local task verification route did not return a usable result.",
        },
        safeDetails: {
          error: "redacted signature and redacted key at redacted private path?redacted-query",
          endpoint: "/api/tasks/task-bridge/verify",
        },
        severity: "error",
      }],
      loading: false,
      request: {
        accountType: "EOA",
        campaignId: campaignDetail.id,
        taskId: "task-bridge",
        walletAddress: "3E9...7cD",
        walletSource: "PORTKEY_EOA_EXTENSION",
      },
      source: "error_fallback",
      status: "error",
      traceId: "trace-error-visible",
    });

    render(<UserAppPanel locale="en-US" />);

    await clickBridgeTaskApiReview();

    const bridge = await screen.findByRole("complementary", { name: "User Participation API review status" });

    await waitFor(() => expect(within(bridge).getAllByText("Error fallback").length).toBeGreaterThan(0));
    expect(within(bridge).getByText(/API_VERIFY_FAILED/)).toBeInTheDocument();
    expect(within(bridge).getByText("The seeded User App remains visible because the API review could not finish safely.")).toBeInTheDocument();

    const bridgeText = bridge.textContent?.toLowerCase() ?? "";
    for (const unsafe of ["raw signature", "private key", "seed phrase", "bearer token", "campaign-os-kitty", "token=secret"]) {
      expect(bridgeText).not.toContain(unsafe);
    }
  });

  it("renders sanitized error fallback diagnostics without private paths or live action controls", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5174";
    mockedLoadBridgeState.mockResolvedValueOnce({
      boundary: {
        "en-US": "Local API review only; no production side effects are executed.",
        "zh-CN": "Local API review only; no production side effects are executed.",
        "zh-TW": "Local API review only; no production side effects are executed.",
      },
      campaignCount: 4,
      campaigns: [],
      configured: true,
      diagnostic: {
        code: "API_CAMPAIGNS_FAILED",
        message: {
          "en-US": "The local campaign discovery route did not return usable campaign data.",
          "zh-CN": "The local campaign discovery route did not return usable campaign data.",
          "zh-TW": "The local campaign discovery route did not return usable campaign data.",
        },
        safeDetails: {
          endpoint: "/api/campaigns",
          status: 500,
        },
      },
      loading: false,
      readinessSummary: "ready; 18 routes",
      routeCount: 18,
      source: "error_fallback",
      traceId: "trace-error-visible",
    });

    render(<UserAppPanel locale="en-US" />);

    const bridge = await screen.findByRole("complementary", { name: "Campaign Discovery API bridge status" });

    await waitFor(() => expect(within(bridge).getByText("Error fallback")).toBeInTheDocument());
    expect(within(bridge).getByText("Diagnostic: The local campaign discovery route did not return usable campaign data.")).toBeInTheDocument();
    expect(within(bridge).getByText("trace-error-visible")).toBeInTheDocument();
    expect(screen.getAllByText("Forest NFT Quest").length).toBeGreaterThan(0);

    const bridgeText = bridge.textContent?.toLowerCase() ?? "";
    for (const unsafe of ["private key", "seed phrase", "bearer token", "kitty-specs", "evidence/"]) {
      expect(bridgeText).not.toContain(unsafe);
    }
    expect(
      within(bridge).queryByRole("button", {
        name: /connectwallet|signature|provider call|contract write|reward custody|reward distribution/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("renders local campaign detail navigation and targets existing sections without URL mutation", () => {
    render(<UserAppPanel locale="en-US" />);

    const nav = screen.getByRole("navigation", { name: "User campaign detail navigation" });
    const navButtons = within(nav).getAllByRole("button");
    const initialUrl = window.location.href;

    expect(navButtons.map((button) => button.textContent)).toEqual([
      "Campaigns",
      "Points",
      "Referrals",
      "Eligibility",
    ]);
    expect(within(nav).getByRole("button", { name: "Campaigns" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(within(nav).getByRole("button", { name: "Points" }));
    expect(within(nav).getByRole("button", { name: "Points" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("article", { name: "Points section" })).toHaveFocus();
    expect(window.location.href).toBe(initialUrl);

    fireEvent.click(within(nav).getByRole("button", { name: "Referrals" }));
    expect(within(nav).getByRole("button", { name: "Referrals" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("article", { name: "Referrals section" })).toHaveFocus();
    expect(window.location.href).toBe(initialUrl);

    fireEvent.click(within(nav).getByRole("button", { name: "Eligibility" }));
    expect(within(nav).getByRole("button", { name: "Eligibility" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Eligibility checker" })).toHaveFocus();
    expect(window.location.href).toBe(initialUrl);

    fireEvent.click(within(nav).getByRole("button", { name: "Campaigns" }));
    expect(within(nav).getByRole("button", { name: "Campaigns" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Campaigns section" })).toHaveFocus();
    expect(window.location.href).toBe(initialUrl);
  });

  it("localizes local campaign detail navigation labels", () => {
    const { rerender } = render(<UserAppPanel locale="zh-CN" />);

    const zhCNNav = screen.getByRole("navigation", { name: "用户活动详情导航" });
    expect(within(zhCNNav).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "活动",
      "积分",
      "推荐",
      "资格",
    ]);

    rerender(<UserAppPanel locale="zh-TW" />);

    const zhTWNav = screen.getByRole("navigation", { name: "用戶活動詳情導覽" });
    expect(within(zhTWNav).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "活動",
      "積分",
      "推薦",
      "資格",
    ]);
  });

  it("renders participant campaign detail, wallet options, tasks, and eligibility", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    expect(screen.getByRole("heading", { name: "Campaign Feed" })).toBeInTheDocument();
    expect(screen.getByText("Find live aelf campaigns, points, time left, core tasks, and eligibility entry points.")).toBeInTheDocument();
    expect(screen.getAllByText("Forest NFT Quest").length).toBeGreaterThan(0);
    expect(screen.getAllByText("TMRWDAO Governance Streak").length).toBeGreaterThan(0);
    expect(screen.getByText("Local Campaign Discovery API readiness only; no live marketplace, App Hub backend, Portfolio, or Forecast service is connected.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mobile entry for campaigns, points, pay, forecast, and portfolio." })).toBeInTheDocument();
    expect(screen.getByText("Seeded mobile hub preview; no Telegram Mini App, payment, forecast, or portfolio service is connected.")).toBeInTheDocument();
    expect(screen.getByText("What should I do today?")).toBeInTheDocument();
    const mobileHubReadiness = screen.getByRole("region", { name: "Mobile Hub readiness" });
    expect(within(mobileHubReadiness).getByRole("heading", { name: "Mobile Hub readiness" })).toBeInTheDocument();
    expect(within(mobileHubReadiness).getByText("Local readiness for Mobile and Telegram Mini App Hub lanes.")).toBeInTheDocument();
    expect(within(mobileHubReadiness).getByText("Total lanes")).toBeInTheDocument();
    expect(within(mobileHubReadiness).getByText("Ready lanes")).toBeInTheDocument();
    expect(within(mobileHubReadiness).getByText("Review lanes")).toBeInTheDocument();
    expect(within(mobileHubReadiness).getByText("Blocked lanes")).toBeInTheDocument();
    expect(within(mobileHubReadiness).getAllByText("Not connected").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getByText("Finish the campaign gate before mobile shortcuts.")).toBeInTheDocument();
    expect(within(mobileHubReadiness).getByText(/Complete Bridge via eBridge before opening Pay or Forecast shortcuts/)).toBeInTheDocument();
    expect(within(mobileHubReadiness).getByText(/Owner next action: Resolve blocking campaign gates/)).toBeInTheDocument();
    expect(within(mobileHubReadiness).getAllByText("Campaign feed").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText("Assets overview").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText("Forecast feed").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText("Pay shortcut").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText("Invite referral").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText("Telegram shell").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText("Evidence basis").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText("Related signal").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText("CTA").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText("Next action").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText(/No live Telegram SDK/).length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText(/Bot API/).length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText(/OAuth/).length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText(/No live Pay service/).length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText(/payment transaction/).length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText(/No live Forecast service/).length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText(/prediction transaction/).length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText(/No live Portfolio service/).length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText(/Portfolio sync/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Finish the campaign gate before mobile shortcuts.").length).toBeGreaterThan(0);
    const marketplaceReadiness = screen.getByRole("region", { name: "Campaign Marketplace Readiness" });
    expect(within(marketplaceReadiness).getByRole("heading", { name: "Campaign Marketplace Readiness" })).toBeInTheDocument();
    expect(within(marketplaceReadiness).getByText("One local view for App Hub, Portfolio, and Forecast campaign readiness.")).toBeInTheDocument();
    expect(within(marketplaceReadiness).getAllByText("App Hub ready").length).toBeGreaterThan(0);
    expect(within(marketplaceReadiness).getAllByText("Portfolio ready").length).toBeGreaterThan(0);
    expect(within(marketplaceReadiness).getAllByText("Forecast ready").length).toBeGreaterThan(0);
    expect(within(marketplaceReadiness).getByText("Blocked rows")).toBeInTheDocument();
    expect(within(marketplaceReadiness).getByText("Review rows")).toBeInTheDocument();
    expect(within(marketplaceReadiness).getByText("Local preview")).toBeInTheDocument();
    expect(within(marketplaceReadiness).getByText(/Owner next action: Resolve blocking campaign gates/)).toBeInTheDocument();
    expect(within(marketplaceReadiness).getAllByText("Awaken Sprint").length).toBeGreaterThan(0);
    expect(within(marketplaceReadiness).getByText("Forest NFT Quest")).toBeInTheDocument();
    expect(within(marketplaceReadiness).getByText("TMRWDAO Governance Streak")).toBeInTheDocument();
    expect(within(marketplaceReadiness).getAllByText("Seeded/local Campaign Marketplace readiness only. No live marketplace API, App Hub backend, Portfolio sync, Forecast prediction, Pay transaction, wallet SDK/provider call, storage write, contract view/send/write, claim, export file, reward custody, or reward distribution is connected.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ecosystem next actions").length).toBeGreaterThan(0);
    expect(screen.getByText("Finish the campaign gate before the next ecosystem action.")).toBeInTheDocument();
    expect(screen.getByText("Seeded/local ecosystem recommendations only. No live Pay, Forecast, or Portfolio service, wallet SDK, payment, prediction, portfolio sync, contract view, or contract send is connected.")).toBeInTheDocument();
    expect(screen.getAllByText("Pay").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Portfolio").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Forecast").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Use Pay after the campaign step is clear").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Try Forecast with eligibility context").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Check Portfolio before the next campaign").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No live Pay service, wallet SDK, payment transaction, contract view, or contract send is executed.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No live Forecast service, prediction transaction, wallet SDK, contract view, or contract send is executed.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No live Portfolio service, wallet SDK, portfolio sync, contract view, or contract send is executed.").length).toBeGreaterThan(0);
    const portfolioHistory = screen.getByRole("region", { name: "Portfolio Campaign History" });
    expect(within(portfolioHistory).getByRole("heading", { name: "Portfolio Campaign History" })).toBeInTheDocument();
    expect(within(portfolioHistory).getByText("Current and historical campaign checkpoints for points, eligibility, wallet, locale, and export review.")).toBeInTheDocument();
    expect(within(portfolioHistory).getByText("Awaken Sprint")).toBeInTheDocument();
    expect(within(portfolioHistory).getByText("Forest NFT Quest")).toBeInTheDocument();
    expect(within(portfolioHistory).getByText("TMRWDAO Governance Streak")).toBeInTheDocument();
    expect(within(portfolioHistory).getAllByText("Wallet").length).toBeGreaterThan(0);
    expect(within(portfolioHistory).getAllByText("Locale").length).toBeGreaterThan(0);
    expect(within(portfolioHistory).getAllByText("Eligibility").length).toBeGreaterThan(0);
    expect(within(portfolioHistory).getAllByText("Points").length).toBeGreaterThan(0);
    expect(within(portfolioHistory).getAllByText("Winner / export").length).toBeGreaterThan(0);
    expect(within(portfolioHistory).getAllByText("Blocked before export").length).toBeGreaterThan(0);
    expect(within(portfolioHistory).getAllByText("Seeded/local Portfolio campaign history only. No live Portfolio service, no Portfolio sync, no wallet SDK, no contract view, no contract send, no export file, no reward custody, and no reward distribution is executed.").length).toBeGreaterThan(0);
    expect(within(portfolioHistory).getByText("Seeded/local Portfolio campaign history only. No live Portfolio service, Portfolio sync, wallet SDK, contract view/send, export file, reward custody, or reward distribution is connected.")).toBeInTheDocument();
    const participantWorkspace = screen.getByRole("region", { name: "My Tasks / Points / Referral" });
    expect(within(participantWorkspace).getByRole("heading", { name: "My Tasks / Points / Referral" })).toBeInTheDocument();
    expect(within(participantWorkspace).getByText("One workspace for required task progress, seeded points, rank, and qualified referral contribution.")).toBeInTheDocument();
    expect(within(participantWorkspace).getAllByText("My Tasks").length).toBeGreaterThan(0);
    expect(within(participantWorkspace).getAllByText("My Points").length).toBeGreaterThan(0);
    expect(within(participantWorkspace).getAllByText("Referral summary").length).toBeGreaterThan(0);
    expect(within(participantWorkspace).getAllByText("Qualified referrals").length).toBeGreaterThan(0);
    expect(within(participantWorkspace).getAllByText("Pending / ready tasks").length).toBeGreaterThan(0);
    expect(within(participantWorkspace).getByText("Complete missing required task")).toBeInTheDocument();
    expect(within(participantWorkspace).getByText("Review task status")).toBeInTheDocument();
    expect(within(participantWorkspace).getAllByText(/Raw signups do not count/).length).toBeGreaterThan(0);
    expect(within(participantWorkspace).getByText(/not settled by a live points ledger/)).toBeInTheDocument();
    expect(within(participantWorkspace).getByText(/no live Referral registry write/)).toBeInTheDocument();
    expect(within(participantWorkspace).getAllByText(/reward custody/).length).toBeGreaterThan(0);
    expect(within(participantWorkspace).getByText(/reward distribution is executed/)).toBeInTheDocument();
    const referralRuntimeReview = screen.getByRole("article", { name: "Referral runtime review" });
    expect(within(referralRuntimeReview).getAllByText("Referral runtime review").length).toBeGreaterThan(0);
    expect(within(referralRuntimeReview).getByText("Binding status")).toBeInTheDocument();
    expect(within(referralRuntimeReview).getByText("Referrer address")).toBeInTheDocument();
    expect(within(referralRuntimeReview).getByText("REF...3E9")).toBeInTheDocument();
    expect(within(referralRuntimeReview).getAllByText("referral_velocity_review").length).toBeGreaterThan(0);
    expect(within(referralRuntimeReview).getByText(/Export projection includes referrer_address/)).toBeInTheDocument();
    expect(within(referralRuntimeReview).getByText(/Referral risk review is required/)).toBeInTheDocument();
    expect(within(referralRuntimeReview).getByText(/No production referral API/)).toBeInTheDocument();
    expect(within(referralRuntimeReview).getByText(/reward distribution is enabled/)).toBeInTheDocument();
    expect(
      within(referralRuntimeReview).queryByRole("button", {
        name: /production referral|migrate|wallet signing|contract write|reward|distribution|payout/i,
      }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("Complete Bridge via eBridge before this ecosystem action.").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
    expect(getUserAppConnectWalletButton("Connect Wallet")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Check eligibility" }).length).toBeGreaterThan(0);
    const shareReadiness = screen.getByRole("region", { name: "Share card readiness" });
    expect(within(shareReadiness).getAllByText("https://campaign.local/en-US/campaigns/awaken-sprint").length).toBeGreaterThan(0);
    expect(within(shareReadiness).getAllByText("https://campaign.local/zh-CN/campaigns/awaken-sprint").length).toBeGreaterThan(0);
    expect(within(shareReadiness).getAllByText("https://campaign.local/zh-TW/campaigns/awaken-sprint").length).toBeGreaterThan(0);
    expect(within(shareReadiness).getByText("Awaken Sprint")).toBeInTheDocument();
    expect(within(shareReadiness).getByText(/No SSR, crawler guarantee, social API/)).toBeInTheDocument();
    expect(screen.getByText("Campaign OS never asks for private keys or seed phrases.")).toBeInTheDocument();
    expect(screen.getByText("Wallet connection is limited to connection and message signing in this shell.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Wallet session status" })).toBeInTheDocument();
    expect(screen.getAllByText("Wallet type verified").length).toBeGreaterThan(0);
    expect(screen.getByText("Seeded preview only; no live wallet SDK connection or transaction signing is executed.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Wallet Connection Diagnostics" })).toBeInTheDocument();
    expect(screen.getByText("Seeded AA + EOA coverage for campaign wallet QA.")).toBeInTheDocument();
    expect(screen.getByText("Recommended AA path")).toBeInTheDocument();
    expect(screen.getByText("Supported EOA paths")).toBeInTheDocument();
    expect(screen.getByText("Connection issue coverage")).toBeInTheDocument();
    expect(screen.getByText("Wallet QA checklist")).toBeInTheDocument();
    expect(screen.getByText("Portkey AA connect")).toBeInTheDocument();
    expect(screen.getByText("EOA extension connect")).toBeInTheDocument();
    expect(screen.getByText("Wrong-chain error")).toBeInTheDocument();
    expect(screen.getByText("Unsupported wallet error")).toBeInTheDocument();
    expect(screen.getByText("Missing signature recovery")).toBeInTheDocument();
    expect(screen.getByText("Account policy restriction")).toBeInTheDocument();
    expect(screen.getByText("Supported; AA is recommended, not mandatory.")).toBeInTheDocument();
    expect(screen.getByText(/Diagnostics are seeded QA evidence/)).toBeInTheDocument();
    expect(screen.getAllByText("Address-only, wallet type unknown").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Unsupported wallet").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Wrong chain or network").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Missing verification signature").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Account type restricted").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Internal Agent Skill wallet").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Recommended" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "EOA wallets" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Advanced / Agent" })).toBeInTheDocument();

    const recommendedWallets = within(screen.getByTestId("wallet-group-recommended"));
    expect(recommendedWallets.getByText("Portkey AA Wallet")).toBeInTheDocument();
    expect(recommendedWallets.getAllByText("Recommended").length).toBeGreaterThan(0);

    const eoaWallets = within(screen.getByTestId("wallet-group-eoa"));
    expect(eoaWallets.getByText("Portkey EOA App")).toBeInTheDocument();
    expect(eoaWallets.getByText("Portkey EOA Extension")).toBeInTheDocument();
    expect(eoaWallets.getByText("NightElf Wallet")).toBeInTheDocument();

    const advancedWallets = within(screen.getByTestId("wallet-group-advanced"));
    expect(advancedWallets.getByText("Agent Skill Wallet")).toBeInTheDocument();
    expect(advancedWallets.getAllByText("Internal/advanced").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bridge via eBridge").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Eligibility checker").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Not eligible").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bridge via eBridge").length).toBeGreaterThan(1);
    expect(screen.getByText("Complete the missing required tasks before export eligibility.")).toBeInTheDocument();
    expect(screen.getByText("Task verification states")).toBeInTheDocument();
    expect(screen.getAllByText("Pending verification").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Failed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Manual review").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Referral context").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Raw signups do not count; invitees must complete valid tasks before referral points are awarded.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Qualified invitees").length).toBeGreaterThan(0);
    expect(screen.getByText("Leaderboard preview")).toBeInTheDocument();
    expect(screen.getAllByText("AA · Portkey").length).toBeGreaterThan(0);
    expect(screen.getAllByText("EOA · NightElf").length).toBeGreaterThan(0);
    expect(screen.getAllByText("EOA · Extension").length).toBeGreaterThan(0);
    expect(screen.getAllByText("referral_velocity_review").length).toBeGreaterThan(0);
    expect(screen.getByText("Seeded shell preview; points and rank are not a live ledger.")).toBeInTheDocument();
    expect(screen.getAllByText("Rewards are provided by the campaign project. Export winners does not distribute rewards.").length).toBeGreaterThan(0);

    const exportStatus = screen.getByRole("region", { name: "Winners export status" });
    expect(within(exportStatus).getByRole("heading", { name: "Winners export status" })).toBeInTheDocument();
    expect(within(exportStatus).getAllByText("Blocked before export").length).toBeGreaterThan(0);
    expect(within(exportStatus).getByText(/export-awaken-sprint-preview/)).toBeInTheDocument();
    expect(within(exportStatus).getByText(/3E9\.\.\.7cD/)).toBeInTheDocument();
    expect(within(exportStatus).getByText("EOA · Extension")).toBeInTheDocument();
    expect(within(exportStatus).getByText("zh-CN")).toBeInTheDocument();
    expect(within(exportStatus).getByText("bridge_ebridge")).toBeInTheDocument();
    expect(within(exportStatus).getByText("task-bridge:pending:aelfscan")).toBeInTheDocument();
    expect(within(exportStatus).getByText("demo-task-bridge-3E9")).toBeInTheDocument();
    expect(within(exportStatus).getByText("Final reward distribution is handled by the campaign project.")).toBeInTheDocument();
    expect(within(exportStatus).getByText(/Complete missing required tasks/)).toBeInTheDocument();
  });

  it("opens and closes the seeded wallet connect modal in en-US", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    expect(screen.queryByRole("dialog", { name: "Connect Wallet" })).not.toBeInTheDocument();

    fireEvent.click(getUserAppConnectWalletButton("Connect Wallet"));

    const dialog = screen.getByRole("dialog", { name: "Connect Wallet" });

    expect(within(dialog).getByTestId("wallet-modal-group-recommended")).toBeInTheDocument();
    expect(within(dialog).getByTestId("wallet-modal-group-eoa")).toBeInTheDocument();
    expect(within(dialog).getByTestId("wallet-modal-group-advanced")).toBeInTheDocument();

    const recommendedWallets = within(within(dialog).getByTestId("wallet-modal-group-recommended"));
    expect(recommendedWallets.getByText("Portkey AA Wallet")).toBeInTheDocument();
    expect(recommendedWallets.getAllByText("Recommended").length).toBeGreaterThan(0);

    const eoaWallets = within(within(dialog).getByTestId("wallet-modal-group-eoa"));
    expect(eoaWallets.getByText("Portkey EOA App")).toBeInTheDocument();
    expect(eoaWallets.getByText("Portkey EOA Extension")).toBeInTheDocument();
    expect(eoaWallets.getByText("NightElf Wallet")).toBeInTheDocument();

    const advancedWallets = within(within(dialog).getByTestId("wallet-modal-group-advanced"));
    expect(advancedWallets.getByText("Agent Skill Wallet")).toBeInTheDocument();
    expect(advancedWallets.getByText("Internal/advanced")).toBeInTheDocument();

    expect(within(dialog).getByText("Campaign OS never asks for private keys, seed phrases, recovery phrases, or password exports.")).toBeInTheDocument();
    expect(within(dialog).getAllByText("Seeded preview only: no live wallet SDK, no real signature, no transaction, and no contract read/write is executed.").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("Wrong chain: switch to AELF mainnet before continuing with campaign verification.")).toBeInTheDocument();
    expect(within(dialog).getByText("Unsupported wallet: choose Portkey AA, Portkey EOA App, Portkey EOA Extension, or NightElf for this seeded campaign flow.")).toBeInTheDocument();
    expect(within(dialog).getByText("Missing signature: sign the seeded verification message only after confirming the prompt; this preview does not request a real signature.")).toBeInTheDocument();
    expect(within(dialog).getByText("Account type restriction: if a campaign allows only AA or only EOA, switch to a wallet type accepted by that campaign policy.")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Close wallet connect modal" }));

    expect(screen.queryByRole("dialog", { name: "Connect Wallet" })).not.toBeInTheDocument();
  });

  it("keeps the seeded preview owner mounted when participant lifecycle epoch changes", () => {
    const { rerender } = render(
      <UserAppPanel locale="en-US" participantLifecycleEpoch={1} />,
    );

    fireEvent.click(getUserAppConnectWalletButton("Connect Wallet"));
    expect(screen.getByRole("dialog", { name: "Connect Wallet" })).toBeInTheDocument();

    rerender(<UserAppPanel locale="en-US" participantLifecycleEpoch={2} />);

    expect(screen.getByRole("dialog", { name: "Connect Wallet" })).toBeInTheDocument();
  });

  it("renders archived campaigns as terminal user app statuses", () => {
    const [participant] = campaignDetail.participants;
    const archivedCampaign = {
      ...campaignDetail,
      status: "archived",
    } satisfies typeof campaignDetail;

    render(
      <UserAppPanel
        campaign={archivedCampaign}
        locale="en-US"
        participant={participant}
      />,
    );

    const archivedBadges = screen.getAllByText("Archived");

    expect(archivedBadges.length).toBeGreaterThan(0);
    expect(archivedBadges[0]).toHaveStyle({ color: "#991b1b" });
    expect(
      screen.getAllByText(
        "Campaign has ended; winner export review is closed for this seeded view.",
      ).length,
    ).toBeGreaterThan(0);
  });

  it("renders AI review campaign statuses as non-live participant states", () => {
    const [participant] = campaignDetail.participants;
    const aiDraftCampaign = {
      ...campaignDetail,
      status: "ai_draft",
    } satisfies typeof campaignDetail;

    const { rerender } = render(
      <UserAppPanel
        campaign={aiDraftCampaign}
        locale="en-US"
        participant={participant}
      />,
    );

    const aiDraftFeed = screen.getByRole("heading", { name: "Campaign Feed" }).closest("section");
    const aiDraftFeedCard = within(aiDraftFeed as HTMLElement)
      .getAllByRole("article")
      .find((card) => within(card).queryByText("Awaken Sprint"));

    expect(aiDraftFeed).not.toBeNull();
    expect(aiDraftFeedCard).not.toBeUndefined();
    expect(within(aiDraftFeedCard as HTMLElement).getByText("AI Draft")).toBeInTheDocument();
    expect(within(aiDraftFeedCard as HTMLElement).getByRole("button", { name: "Review required" })).toBeDisabled();
    expect(within(aiDraftFeedCard as HTMLElement).queryByRole("button", { name: "Continue tasks" })).not.toBeInTheDocument();
    expect(within(aiDraftFeedCard as HTMLElement).queryByRole("button", { name: "Start" })).not.toBeInTheDocument();

    rerender(
      <UserAppPanel
        campaign={{ ...campaignDetail, status: "human_review" }}
        locale="en-US"
        participant={participant}
      />,
    );

    const humanReviewFeed = screen.getByRole("heading", { name: "Campaign Feed" }).closest("section");
    const humanReviewFeedCard = within(humanReviewFeed as HTMLElement)
      .getAllByRole("article")
      .find((card) => within(card).queryByText("Awaken Sprint"));

    expect(humanReviewFeed).not.toBeNull();
    expect(humanReviewFeedCard).not.toBeUndefined();
    expect(within(humanReviewFeedCard as HTMLElement).getByText("Human Review")).toBeInTheDocument();
    expect(within(humanReviewFeedCard as HTMLElement).getByRole("button", { name: "Review required" })).toBeDisabled();
    expect(within(humanReviewFeedCard as HTMLElement).queryByRole("button", { name: "Continue tasks" })).not.toBeInTheDocument();
    expect(within(humanReviewFeedCard as HTMLElement).queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
    expect(screen.getByText("2 Coming Soon")).toBeInTheDocument();
  });

  it("switches User App copy manually to zh-CN", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "zh-CN" } });
    fireEvent.click(screen.getByRole("button", { name: "用户应用" }));

    expect(screen.getByRole("heading", { name: "活动 Feed" })).toBeInTheDocument();
    expect(screen.getByText("展示进行中的 aelf 活动、可获得积分、剩余时间、核心任务与资格入口。")).toBeInTheDocument();
    expect(screen.getAllByText("Forest NFT 任务").length).toBeGreaterThan(0);
    expect(screen.getAllByText("TMRWDAO 治理连续任务").length).toBeGreaterThan(0);
    expect(screen.getByText("仅本地 Campaign Discovery API readiness；不会连接实时 marketplace、App Hub 后端、Portfolio 或 Forecast 服务。")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "移动端入口，聚合活动、积分、Pay、Forecast 与 Portfolio。" })).toBeInTheDocument();
    expect(screen.getByText("仅 seeded 移动端 Hub 预览；未接入 Telegram Mini App、支付、Forecast 或 Portfolio 服务。")).toBeInTheDocument();
    expect(screen.getByText("今天该做什么？")).toBeInTheDocument();
    const mobileHubReadiness = screen.getByRole("region", { name: "Mobile Hub 准备度" });
    expect(within(mobileHubReadiness).getByRole("heading", { name: "Mobile Hub 准备度" })).toBeInTheDocument();
    expect(within(mobileHubReadiness).getByText("Mobile 与 Telegram Mini App Hub lane 的本地准备度。")).toBeInTheDocument();
    expect(within(mobileHubReadiness).getByText("总 lane 数")).toBeInTheDocument();
    expect(within(mobileHubReadiness).getByText("就绪 lane")).toBeInTheDocument();
    expect(within(mobileHubReadiness).getByText("需审核 lane")).toBeInTheDocument();
    expect(within(mobileHubReadiness).getByText("阻断 lane")).toBeInTheDocument();
    expect(within(mobileHubReadiness).getAllByText("未连接").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getByText("先完成活动门槛，再打开移动端快捷入口。")).toBeInTheDocument();
    expect(within(mobileHubReadiness).getByText(/先完成通过 eBridge 跨链，再在本地 Mobile Hub 预览中打开 Pay 或 Forecast 快捷入口/)).toBeInTheDocument();
    expect(within(mobileHubReadiness).getByText(/Owner 下一步: 先解决阻断活动门槛/)).toBeInTheDocument();
    expect(within(mobileHubReadiness).getAllByText("Campaign feed").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText("资产概览").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText("Forecast feed").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText("Pay shortcut").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText("邀请推荐").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText("Telegram shell").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText("证据依据").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText("关联信号").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText("CTA").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText("下一步").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText(/不会执行实时 Telegram SDK/).length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText(/Bot API/).length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText(/OAuth/).length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText(/真实 Pay 服务/).length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText(/支付交易/).length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText(/真实 Forecast 服务/).length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText(/预测交易/).length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText(/真实 Portfolio 服务/).length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText(/Portfolio 同步/).length).toBeGreaterThan(0);
    const marketplaceReadiness = screen.getByRole("region", { name: "Campaign Marketplace readiness" });
    expect(within(marketplaceReadiness).getByRole("heading", { name: "Campaign Marketplace readiness" })).toBeInTheDocument();
    expect(within(marketplaceReadiness).getByText("统一查看 App Hub、Portfolio 与 Forecast 的本地活动 readiness。")).toBeInTheDocument();
    expect(within(marketplaceReadiness).getAllByText("App Hub 就绪").length).toBeGreaterThan(0);
    expect(within(marketplaceReadiness).getAllByText("Portfolio 就绪").length).toBeGreaterThan(0);
    expect(within(marketplaceReadiness).getAllByText("Forecast 就绪").length).toBeGreaterThan(0);
    expect(within(marketplaceReadiness).getByText(/Owner 下一步: 先解决阻断活动门槛/)).toBeInTheDocument();
    expect(within(marketplaceReadiness).getAllByText("仅 seeded/本地 Campaign Marketplace readiness。不会连接实时 marketplace API、App Hub 后端、Portfolio 同步、Forecast 预测、Pay 交易、钱包 SDK\/provider 调用、storage 写入、合约读取\/发送\/写入、导出文件、奖励托管或发奖。").length).toBeGreaterThan(0);
    expect(screen.getAllByText("生态下一步").length).toBeGreaterThan(0);
    expect(screen.getByText("先完成活动门槛，再进入下一个生态行动。")).toBeInTheDocument();
    expect(screen.getByText("仅 seeded/本地生态推荐。不会连接真实 Pay、Forecast 或 Portfolio 服务、钱包 SDK、支付、预测、Portfolio 同步、合约读取或合约发送。")).toBeInTheDocument();
    expect(screen.getAllByText("明确活动步骤后再使用 Pay").length).toBeGreaterThan(0);
    expect(screen.getAllByText("结合资格上下文探索 Forecast").length).toBeGreaterThan(0);
    expect(screen.getAllByText("进入下一个活动前查看 Portfolio").length).toBeGreaterThan(0);
    expect(screen.getAllByText("不会连接真实 Pay 服务、钱包 SDK、支付交易、合约读取或合约发送。").length).toBeGreaterThan(0);
    expect(screen.getAllByText("不会连接真实 Forecast 服务、预测交易、钱包 SDK、合约读取或合约发送。").length).toBeGreaterThan(0);
    expect(screen.getAllByText("不会连接真实 Portfolio 服务、钱包 SDK、Portfolio 同步、合约读取或合约发送。").length).toBeGreaterThan(0);
    const portfolioHistory = screen.getByRole("region", { name: "Portfolio 活动历史" });
    expect(within(portfolioHistory).getByRole("heading", { name: "Portfolio 活动历史" })).toBeInTheDocument();
    expect(within(portfolioHistory).getByText("查看当前与历史活动的积分、资格、钱包、语言与导出审核检查点。")).toBeInTheDocument();
    expect(within(portfolioHistory).getAllByText("钱包").length).toBeGreaterThan(0);
    expect(within(portfolioHistory).getAllByText("语言").length).toBeGreaterThan(0);
    expect(within(portfolioHistory).getAllByText("资格").length).toBeGreaterThan(0);
    expect(within(portfolioHistory).getAllByText("获奖 / 导出").length).toBeGreaterThan(0);
    expect(within(portfolioHistory).getByText("仅 seeded/本地 Portfolio 活动历史。不会连接真实 Portfolio 服务、Portfolio 同步、钱包 SDK、合约读取/发送、导出文件、奖励托管或发奖。")).toBeInTheDocument();
    expect(within(portfolioHistory).getAllByText("Awaken 冲刺活动").length).toBeGreaterThan(0);
    expect(within(portfolioHistory).getByText("Forest NFT 任务")).toBeInTheDocument();
    expect(within(portfolioHistory).getByText("TMRWDAO 治理连续任务")).toBeInTheDocument();
    const participantWorkspace = screen.getByRole("region", { name: "我的任务 / 积分 / 推荐" });
    expect(within(participantWorkspace).getByRole("heading", { name: "我的任务 / 积分 / 推荐" })).toBeInTheDocument();
    expect(within(participantWorkspace).getByText("在一个工作台查看必做任务进度、seeded 积分、排名与合格推荐贡献。")).toBeInTheDocument();
    expect(within(participantWorkspace).getAllByText("我的任务").length).toBeGreaterThan(0);
    expect(within(participantWorkspace).getAllByText("我的积分").length).toBeGreaterThan(0);
    expect(within(participantWorkspace).getAllByText("推荐摘要").length).toBeGreaterThan(0);
    expect(within(participantWorkspace).getAllByText("合格推荐").length).toBeGreaterThan(0);
    expect(within(participantWorkspace).getAllByText("待处理 / 待开始任务").length).toBeGreaterThan(0);
    expect(within(participantWorkspace).getByText("完成缺失的必做任务")).toBeInTheDocument();
    expect(within(participantWorkspace).getByText("审核任务状态")).toBeInTheDocument();
    expect(within(participantWorkspace).getAllByText(/仅注册不会计分/).length).toBeGreaterThan(0);
    expect(within(participantWorkspace).getByText(/不是由实时 points ledger 结算/)).toBeInTheDocument();
    expect(within(participantWorkspace).getByText(/不会执行实时 Referral registry 写入/)).toBeInTheDocument();
    expect(within(participantWorkspace).getByText(/不是实时账本/)).toBeInTheDocument();
    expect(within(participantWorkspace).getAllByText(/奖励托管或发奖/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Awaken 冲刺活动" })).toBeInTheDocument();
    expect(getUserAppConnectWalletButton("连接钱包")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "检查资格" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("region", { name: "分享卡片就绪状态" })).toBeInTheDocument();
    expect(screen.getAllByText("https://campaign.local/zh-CN/campaigns/awaken-sprint").length).toBeGreaterThan(0);
    expect(screen.getByText(/未接入 SSR、crawler 保证、social API/)).toBeInTheDocument();
    expect(screen.getByText("Campaign OS 永远不会索要私钥或助记词。")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "钱包会话状态" })).toBeInTheDocument();
    expect(screen.getAllByText("钱包类型已验证").length).toBeGreaterThan(0);
    expect(screen.getByText("仅 seeded 预览；不会执行实时钱包 SDK 连接或交易签名。")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "钱包连接诊断" })).toBeInTheDocument();
    expect(screen.getByText("用于活动钱包 QA 的 seeded AA + EOA 覆盖。")).toBeInTheDocument();
    expect(screen.getByText("推荐 AA 路径")).toBeInTheDocument();
    expect(screen.getByText("受支持的 EOA 路径")).toBeInTheDocument();
    expect(screen.getByText("连接问题覆盖")).toBeInTheDocument();
    expect(screen.getByText("钱包 QA 清单")).toBeInTheDocument();
    expect(screen.getByText("Portkey AA 连接")).toBeInTheDocument();
    expect(screen.getByText("EOA 插件连接")).toBeInTheDocument();
    expect(screen.getByText("错误链错误")).toBeInTheDocument();
    expect(screen.getByText("不支持钱包错误")).toBeInTheDocument();
    expect(screen.getByText("缺少签名恢复")).toBeInTheDocument();
    expect(screen.getByText("账户策略限制")).toBeInTheDocument();
    expect(screen.getByText("支持 EOA；AA 是推荐路径，不是强制要求。")).toBeInTheDocument();
    expect(screen.getByText(/诊断是 seeded QA 证据/)).toBeInTheDocument();
    expect(screen.getAllByText("仅地址，钱包类型未知").length).toBeGreaterThan(0);
    expect(screen.getAllByText("不支持的钱包").length).toBeGreaterThan(0);
    expect(screen.getAllByText("链或网络不匹配").length).toBeGreaterThan(0);
    expect(screen.getAllByText("缺少验证签名").length).toBeGreaterThan(0);
    expect(screen.getAllByText("钱包类型受限").length).toBeGreaterThan(0);
    expect(screen.getAllByText("内部 Agent Skill 钱包").length).toBeGreaterThan(0);
    expect(screen.getByText("钱包选项")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "推荐" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "EOA 钱包" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "高级 / Agent" })).toBeInTheDocument();
    expect(within(screen.getByTestId("wallet-group-recommended")).getByText("Portkey AA Wallet")).toBeInTheDocument();
    expect(within(screen.getByTestId("wallet-group-eoa")).getByText("NightElf Wallet")).toBeInTheDocument();
    expect(within(screen.getByTestId("wallet-group-advanced")).getByText("Agent Skill Wallet")).toBeInTheDocument();
    expect(screen.getAllByText("内部/高级").length).toBeGreaterThan(0);
    expect(screen.getAllByText("通过 eBridge 跨链").length).toBeGreaterThan(0);
    expect(screen.getAllByText("资格检查器").length).toBeGreaterThan(0);
    expect(screen.getAllByText("不符合资格").length).toBeGreaterThan(0);
    expect(screen.getByText("完成缺失的必做任务后再进入导出资格。")).toBeInTheDocument();
    expect(screen.getByText("任务验证状态")).toBeInTheDocument();
    expect(screen.getAllByText("等待验证").length).toBeGreaterThan(0);
    expect(screen.getAllByText("失败").length).toBeGreaterThan(0);
    expect(screen.getAllByText("人工审核").length).toBeGreaterThan(0);
    expect(screen.getAllByText("推荐关系").length).toBeGreaterThan(0);
    expect(screen.getAllByText("合格被邀请人").length).toBeGreaterThan(0);
    expect(screen.getByText("排行榜预览")).toBeInTheDocument();
    const exportStatus = screen.getByRole("region", { name: "Winners 导出状态" });
    expect(within(exportStatus).getByRole("heading", { name: "Winners 导出状态" })).toBeInTheDocument();
    expect(within(exportStatus).getAllByText("导出前阻断").length).toBeGreaterThan(0);
    expect(within(exportStatus).getByText(/导出批次/)).toBeInTheDocument();
    expect(within(exportStatus).getByText("任务记录")).toBeInTheDocument();
    expect(within(exportStatus).getByText("证据哈希")).toBeInTheDocument();
    expect(within(exportStatus).getByText("最终奖励发放由活动项目方处理。")).toBeInTheDocument();
    expect(within(exportStatus).getByText(/请先完成缺失的必做任务/)).toBeInTheDocument();
    expect(screen.getAllByText("仅注册不会计分；被邀请人必须完成有效任务后才会产生推荐积分。").length).toBeGreaterThan(0);
  });

  it("opens the seeded wallet connect modal in zh-CN", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "zh-CN" } });
    fireEvent.click(screen.getByRole("button", { name: "用户应用" }));
    fireEvent.click(getUserAppConnectWalletButton("连接钱包"));

    const dialog = screen.getByRole("dialog", { name: "连接钱包" });

    expect(within(dialog).getByTestId("wallet-modal-group-recommended")).toBeInTheDocument();
    expect(within(dialog).getByTestId("wallet-modal-group-eoa")).toBeInTheDocument();
    expect(within(dialog).getByTestId("wallet-modal-group-advanced")).toBeInTheDocument();
    expect(within(dialog).getByText("Campaign OS 永远不会索要私钥、助记词、恢复短语或密码导出。")).toBeInTheDocument();
    expect(within(dialog).getAllByText("仅 seeded 预览：不会连接实时钱包 SDK，不会请求真实签名，不会发起交易，也不会读写合约。").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("链不匹配：请切换到 AELF mainnet 后再继续活动验证。")).toBeInTheDocument();
    expect(within(dialog).getByText("不支持的钱包：请为该 seeded 活动流程选择 Portkey AA、Portkey EOA App、Portkey EOA Extension 或 NightElf。")).toBeInTheDocument();
    expect(within(dialog).getByText("缺少签名：确认提示内容后只签署 seeded 验证消息；此预览不会请求真实签名。")).toBeInTheDocument();
    expect(within(dialog).getByText("账户类型限制：如果活动只允许 AA 或只允许 EOA，请切换到该活动策略接受的钱包类型。")).toBeInTheDocument();
  });

  it("supports the eligibility checker workflow with seeded and unknown addresses", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    const checker = screen.getByRole("region", { name: "Eligibility checker" });

    expect(within(checker).getByLabelText("Eligibility address")).toHaveValue("3E9...7cD");
    expect(within(checker).getByText("Not eligible")).toBeInTheDocument();
    expect(within(checker).getByText("EOA · Extension")).toBeInTheDocument();
    expect(within(checker).getByText("Verified wallet session")).toBeInTheDocument();
    expect(within(checker).getByText("zh-CN")).toBeInTheDocument();
    expect(within(checker).getByText("1/2")).toBeInTheDocument();
    expect(within(checker).getByText("50%")).toBeInTheDocument();
    expect(within(checker).getByText("Bridge via eBridge")).toBeInTheDocument();
    expect(within(checker).getByText(/ON_CHAIN/)).toBeInTheDocument();
    expect(within(checker).getByText(/AA \+ EOA/)).toBeInTheDocument();
    expect(within(checker).getByText("referral_velocity_review")).toBeInTheDocument();

    fireEvent.click(within(checker).getByRole("button", { name: /5N1...4fA/ }));

    expect(within(checker).getByText("Risk flagged")).toBeInTheDocument();
    expect(within(checker).getByText("manual_review_queue")).toBeInTheDocument();
    expect(within(checker).getByText(/manual risk review/i)).toBeInTheDocument();

    fireEvent.change(within(checker).getByLabelText("Eligibility address"), {
      target: { value: "ELF_UNKNOWN_ADDRESS" },
    });
    fireEvent.click(within(checker).getByRole("button", { name: "Check address eligibility" }));

    expect(within(checker).getByText("Pending verification")).toBeInTheDocument();
    expect(within(checker).getByText("Unknown · Other")).toBeInTheDocument();
    expect(within(checker).getByText("Address-only inspection")).toBeInTheDocument();
    expect(within(checker).getByText("Wallet type remains unknown until supported wallet/session verification.")).toBeInTheDocument();
    expect(within(checker).getByText(/cannot infer AA or EOA/)).toBeInTheDocument();
    expect(within(checker).getByText(/Connect or verify/)).toBeInTheDocument();
  });

  it("runs local task verification actions without changing eligibility or export projections", () => {
    render(<UserAppPanel locale="en-US" />);

    const taskVerification = screen.getByRole("heading", { name: "Task verification states" }).closest("section");
    const exportStatus = screen.getByRole("region", { name: "Winners export status" });
    const eligibility = screen.getByRole("region", { name: "Eligibility checker" });

    expect(taskVerification).not.toBeNull();
    expect(within(eligibility).getByText("Not eligible")).toBeInTheDocument();
    expect(within(exportStatus).getAllByText("Blocked before export").length).toBeGreaterThan(0);
    expect(within(exportStatus).getByText("task-bridge:pending:aelfscan")).toBeInTheDocument();

    fireEvent.click(within(taskVerification!).getByRole("button", { name: "Verify task" }));

    const verifyResult = within(taskVerification!).getByRole("article", {
      name: "Latest local action: Bridge via eBridge",
    });
    expect(within(verifyResult).getByText("Local attempt: local-verify-task-bridge")).toBeInTheDocument();
    expect(within(verifyResult).getByText("Action: Verify task")).toBeInTheDocument();
    expect(within(verifyResult).getByText(/No live provider is called by this action/)).toBeInTheDocument();
    expect(within(verifyResult).getByText(/does not approve eligibility/)).toBeInTheDocument();

    fireEvent.click(within(taskVerification!).getByRole("button", { name: "Retry verification" }));
    const retryResult = within(taskVerification!).getByRole("article", {
      name: "Latest local action: Swap on Awaken",
    });
    expect(within(retryResult).getByText("Local attempt: local-retry-task-swap")).toBeInTheDocument();
    expect(within(retryResult).getAllByText(/provider path/i).length).toBeGreaterThan(0);
    expect(within(retryResult).queryByText("Completed")).not.toBeInTheDocument();

    fireEvent.click(within(taskVerification!).getByRole("button", { name: "Submit proof" }));
    const proofResult = within(taskVerification!).getByRole("article", {
      name: "Latest local action: Follow social channel",
    });
    expect(within(proofResult).getByText("Proof type: screenshot")).toBeInTheDocument();
    expect(within(proofResult).getByText("No upload executed")).toBeInTheDocument();

    fireEvent.click(within(taskVerification!).getByRole("button", { name: "View review queue" }));
    const reviewResult = within(taskVerification!).getByRole("article", {
      name: "Latest local action: Agent review smoke check",
    });
    expect(within(reviewResult).getByText("Review queue: review-task-agent-review-3E9")).toBeInTheDocument();
    expect(within(reviewResult).getAllByText(/requires human review/i).length).toBeGreaterThan(0);

    expect(within(taskVerification!).getByRole("button", { name: "Already verified" })).toBeDisabled();
    expect(within(taskVerification!).getByText("Evidence hashes: demo-task-connect-wallet-3E9")).toBeInTheDocument();
    expect(within(eligibility).getByText("Not eligible")).toBeInTheDocument();
    expect(within(exportStatus).getAllByText("Blocked before export").length).toBeGreaterThan(0);
    expect(within(exportStatus).getByText("task-bridge:pending:aelfscan")).toBeInTheDocument();
  });

  it("renders localized local task action labels and boundaries", () => {
    render(<UserAppPanel locale="zh-CN" />);

    const taskVerification = screen.getByRole("heading", { name: "任务验证状态" }).closest("section");

    expect(taskVerification).not.toBeNull();
    expect(within(taskVerification!).getByRole("button", { name: "验证任务" })).toBeInTheDocument();
    expect(within(taskVerification!).getByRole("button", { name: "重试验证" })).toBeInTheDocument();
    expect(within(taskVerification!).getByRole("button", { name: "提交证明" })).toBeInTheDocument();
    expect(within(taskVerification!).getByRole("button", { name: "查看审核队列" })).toBeInTheDocument();
    expect(within(taskVerification!).getByRole("button", { name: "已验证" })).toBeDisabled();

    fireEvent.click(within(taskVerification!).getByRole("button", { name: "提交证明" }));

    const proofResult = within(taskVerification!).getByRole("article", {
      name: "最新本地动作: 关注社交频道",
    });
    expect(within(proofResult).getByText("证明类型: screenshot")).toBeInTheDocument();
    expect(within(proofResult).getByText("未执行上传")).toBeInTheDocument();
    expect(within(proofResult).getByText(/不会批准资格、导出 winners 或发放奖励/)).toBeInTheDocument();
  });

  it("switches leaderboard modes with active state and mode-specific values", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    const leaderboard = screen.getByRole("region", { name: "Leaderboard preview" });
    const referralMode = within(leaderboard).getByRole("button", { name: "Referral" });

    expect(within(leaderboard).getByRole("button", { name: "Total Points" })).toHaveAttribute("aria-pressed", "true");
    expect(within(leaderboard).getByText("Total Points ranks 4 seeded participants.")).toBeInTheDocument();

    fireEvent.click(referralMode);

    expect(referralMode).toHaveAttribute("aria-pressed", "true");
    expect(within(leaderboard).getByText("Referral ranks 4 seeded participants.")).toBeInTheDocument();
    expect(within(leaderboard).getByText("Ranks qualified referral value, not raw signup counts.")).toBeInTheDocument();
    expect(within(leaderboard).getByText(/Only qualified invitees who complete valid tasks count/)).toBeInTheDocument();
    expect(within(leaderboard).getByText("80 / 4")).toBeInTheDocument();
    expect(within(leaderboard).getAllByText("low").length).toBeGreaterThan(0);
    expect(within(leaderboard).getByText(/Seeded\/local leaderboard preview only/)).toBeInTheDocument();
  });

  it("renders zh-CN checker and leaderboard controls", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "zh-CN" } });
    fireEvent.click(screen.getByRole("button", { name: "用户应用" }));

    const checker = screen.getByRole("region", { name: "资格检查器" });
    const leaderboard = screen.getByRole("region", { name: "排行榜预览" });

    expect(within(checker).getByLabelText("资格地址")).toHaveValue("3E9...7cD");
    expect(within(checker).getByRole("button", { name: "检查地址资格" })).toBeInTheDocument();
    fireEvent.change(within(checker).getByLabelText("资格地址"), {
      target: { value: "ELF_UNKNOWN_ADDRESS" },
    });
    fireEvent.click(within(checker).getByRole("button", { name: "检查地址资格" }));
    expect(within(checker).getByText("钱包类型会保持未知，直到通过受支持的钱包/会话验证。")).toBeInTheDocument();
    expect(within(leaderboard).getByRole("button", { name: "邀请" })).toBeInTheDocument();
    expect(within(leaderboard).getByText("当前模式")).toBeInTheDocument();
    expect(within(leaderboard).getByText(/仅 seeded\/本地排行榜预览/)).toBeInTheDocument();
  });

  it("renders zh-TW task readiness as active fallback state in the panel", () => {
    render(<UserAppPanel locale="zh-TW" />);

    expect(screen.getByRole("heading", { name: "活動 Feed" })).toBeInTheDocument();
    const mobileHubReadiness = screen.getByRole("region", { name: "Mobile Hub 準備度" });
    expect(within(mobileHubReadiness).getByRole("heading", { name: "Mobile Hub 準備度" })).toBeInTheDocument();
    expect(within(mobileHubReadiness).getByText("Mobile 與 Telegram Mini App Hub lane 的本地準備度。")).toBeInTheDocument();
    expect(within(mobileHubReadiness).getAllByText("資產概覽").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText("邀請推薦").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText("Seeded 預覽").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getAllByText("未連接").length).toBeGreaterThan(0);
    expect(within(mobileHubReadiness).getByText("先完成活動門檻，再開啟行動端快捷入口。")).toBeInTheDocument();
    expect(within(mobileHubReadiness).getAllByText(/未執行即時 Telegram SDK/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/語言 readiness/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/回退|缺失/).length).toBeGreaterThan(0);
    const shareReadiness = screen.getByRole("region", { name: "分享卡片 readiness" });
    expect(within(shareReadiness).getAllByText("https://campaign.local/zh-TW/campaigns/awaken-sprint").length).toBeGreaterThan(0);
    expect(within(shareReadiness).getByText("英文回退")).toBeInTheDocument();
    expect(within(shareReadiness).getAllByText(/English fallback|英文回退/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Forest NFT 任務").length).toBeGreaterThan(0);
    expect(screen.getAllByText("TMRWDAO 治理連續任務").length).toBeGreaterThan(0);
  });
});

const durableRepository = {
  adapterId: "campaign-db-adapter",
  createdViaRepository: true as const,
  repositoryId: "participant-journey-repository",
  storeId: "campaign-db" as const,
};

const durableSession = (overrides: Partial<NormalizedWalletSession> = {}): NormalizedWalletSession => ({
  ...walletSessions[0],
  issuer: {
    artifactType: "local_session_reference",
    cookieIssued: false,
    diagnosticCodes: [],
    issuerMode: "local_opaque",
    jwtIssued: false,
    liveSigningExecuted: false,
    referenceId: "issued-participant-session",
    ttlSeconds: 900,
    valid: true,
  },
  proof: {
    diagnosticCodes: [],
    liveVerificationExecuted: false,
    proofType: "wallet_signature",
    status: "verified",
    trustLevel: "verified_local",
  },
  ...overrides,
});

const liveDurableSession = (
  overrides: Partial<ParticipantJourneyDurableSession> = {},
): ParticipantJourneyDurableSession => ({
  absoluteExpiresAt: "2026-07-19T01:00:00.000Z",
  accountType: "EOA",
  capabilities: ["PARTICIPATE_CAMPAIGN"],
  chainId: "AELF",
  idleExpiresAt: "2026-07-18T22:00:00.000Z",
  issuedAt: "2026-07-18T21:00:00.000Z",
  network: "testnet",
  roles: ["participant"],
  sessionId: "live-participant-session",
  status: "active",
  walletAddress: "ELF_7A91C24F8899AABBCCDDEEFF0011223344556677",
  walletSource: "PORTKEY_EOA_EXTENSION",
  ...overrides,
});

const durableFeedItem = (
  campaignId: string,
  label: string,
): ParticipantCampaignFeedItem => ({
  campaignId,
  projectId: "awaken",
  repository: durableRepository,
  status: "draft",
  taskCount: 1,
  title: { "en-US": label, "zh-CN": label, "zh-TW": label },
  visibility: "participant_preview",
  walletPolicy: "ANY",
});

const durableCampaignCommandName = (campaignId: string, label: string) =>
  `Select ${label} (${campaignId})`;
const campaignAlphaCommandName = durableCampaignCommandName("campaign-alpha", "Campaign Alpha");
const campaignBetaCommandName = durableCampaignCommandName("campaign-beta", "Campaign Beta");

const durableJourney = ({
  campaignId,
  completionId = null,
  evidenceId = null,
  points = 0,
  rank = null,
  riskFlags = [],
  status = "not_started",
}: {
  campaignId: string;
  completionId?: string | null;
  evidenceId?: string | null;
  points?: number;
  rank?: number | null;
  riskFlags?: readonly string[];
  status?: "completed" | "failed" | "manual_review" | "not_started" | "pending";
}): ParticipantJourneyProjection => {
  const session = durableSession();
  const taskId = `task-${campaignId}`;
  const completed = status === "completed";

  return {
    campaign: {
      campaignId,
      endTime: "2026-08-31T00:00:00.000Z",
      goal: "Verify the durable participant path",
      projectId: "awaken",
      rewardDescription: "Review points",
      startTime: "2026-07-01T00:00:00.000Z",
      status: "draft",
      taskCount: 1,
      walletPolicy: "ANY",
    },
    diagnostics: riskFlags.map((code) => ({ code, scope: "participant" as const })),
    eligibility: {
      accountType: session.accountType,
      campaignId,
      eligible: completed,
      localePreference: "en-US",
      missingTasks: completed ? [] : [taskId],
      riskFlags,
      score: points,
      status: completed ? "eligible" : "pending",
      walletAddress: session.address,
      walletSource: session.walletSource,
      walletTypeVerified: true,
    },
    participant: {
      accountType: session.accountType,
      campaignId,
      localePreference: "en-US",
      participantId: `participant-${campaignId}`,
      riskFlags,
      totalPoints: points,
      walletAddress: session.address,
      walletSource: session.walletSource,
      walletTypeVerified: true,
    },
    ranking: {
      campaignId,
      participantCount: completed ? 4 : 1,
      rank,
      source: "repository_projection",
      totalPoints: points,
      walletAddress: session.address,
    },
    repository: durableRepository,
    tasks: [{
      action: completed ? "completed" : "verify",
      blockedReason: null,
      campaignId,
      completionId,
      evidenceId,
      evidenceSource: completed ? "DAPP_API" : null,
      pointsAvailable: 25,
      pointsAwarded: completed ? points : 0,
      required: true,
      status,
      taskId,
      templateCode: "DURABLE_REVIEW",
      updatedAt: completed ? "2026-07-14T10:00:00.000Z" : null,
      verificationType: "DAPP_API",
      walletCompatibility: "ANY",
    }],
  };
};

const durableFailure = (
  overrides: Partial<ParticipantJourneyFailure> = {},
): ParticipantJourneyFailure => ({
  code: "BRIDGE_REQUEST_FAILED",
  httpStatus: 503,
  ok: false,
  phase: "request",
  reconnectRequired: false,
  retryable: true,
  source: "durable",
  status: "degraded",
  traceId: "trace-participant-failure",
  ...overrides,
});

const durableBridgeResponseIntegrityFailures = [
  { code: "BRIDGE_RESPONSE_INVALID", status: "blocked" },
  { code: "BRIDGE_RESPONSE_NON_JSON", status: "degraded" },
  { code: "BRIDGE_RESPONSE_EMPTY", status: "degraded" },
  { code: "BRIDGE_RESPONSE_OVERSIZE", status: "degraded" },
] as const;

const durableVerifySuccess = (campaignId: string): ParticipantVerifyResult => {
  const session = durableSession();
  const taskId = `task-${campaignId}`;

  return {
    httpStatus: 200,
    ok: true,
    source: "durable",
    status: "success",
    traceId: "trace-verify-command",
    verification: {
      completion: {
        accountType: session.accountType,
        campaignId,
        evidenceId: `evidence-${campaignId}`,
        id: `completion-${campaignId}`,
        pointsAwarded: 25,
        status: "completed",
        taskId,
        walletAddress: session.address,
        walletSource: session.walletSource,
      },
      evidence: {
        accountType: session.accountType,
        campaignId,
        completionId: `completion-${campaignId}`,
        id: `evidence-${campaignId}`,
        pointsAwarded: 25,
        status: "completed",
        taskId,
        walletAddress: session.address,
        walletSource: session.walletSource,
      },
      repository: durableRepository,
    },
  };
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
};

const durableBridge = (
  overrides: Partial<ParticipantJourneyApiBridge> = {},
): ParticipantJourneyApiBridge => ({
  getJourney: vi.fn(async (context): Promise<ParticipantJourneyResult> => ({
    httpStatus: 200,
    journey: durableJourney({ campaignId: context.selectedCampaignId ?? "missing" }),
    ok: true,
    source: "durable",
    status: "success",
    traceId: "trace-participant-journey",
  })),
  listCampaigns: vi.fn<ParticipantJourneyApiBridge["listCampaigns"]>(async () => ({
    campaigns: [
      durableFeedItem("campaign-alpha", "Campaign Alpha"),
      durableFeedItem("campaign-beta", "Campaign Beta"),
    ],
    httpStatus: 200,
    ok: true,
    source: "durable",
    status: "success",
    traceId: "trace-participant-feed",
  })),
  verifyTask: vi.fn(async (_taskId, context) => durableVerifySuccess(context.selectedCampaignId ?? "missing")),
  ...overrides,
});

describe("Durable Participant User App", () => {
  beforeEach(() => {
    vi.mocked(loadCampaignDiscoveryApiBridgeState).mockClear();
    vi.mocked(submitUserParticipationApiReview).mockClear();
  });

  const renderDurable = (
    bridge: ParticipantJourneyApiBridge,
    session: NormalizedWalletSession | null = durableSession(),
  ) => render(
    <UserAppPanel
      bridge={bridge}
      locale="en-US"
      mode="durable"
      onReconnect={vi.fn()}
      session={session}
      sessionReady={Boolean(session)}
    />,
  );

  it("blocks protected feed access until the issued session is ready", () => {
    const bridge = durableBridge();
    const onReconnect = vi.fn();

    render(
      <UserAppPanel
        bridge={bridge}
        locale="en-US"
        mode="durable"
        onReconnect={onReconnect}
        session={null}
        sessionReady={false}
      />,
    );

    expect(bridge.listCampaigns).not.toHaveBeenCalled();
    expect(screen.getByRole("region", { name: "Public Campaign" })).toHaveTextContent("Awaken Sprint");
    fireEvent.click(screen.getByRole("button", { name: "Reconnect wallet" }));
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it("uses a live durable session without projecting its full address or legacy authority", async () => {
    const bridge = durableBridge();
    const session = liveDurableSession();

    render(
      <UserAppPanel
        bridge={bridge}
        liveSession={session}
        locale="en-US"
        mode="durable"
        onReconnect={vi.fn()}
        session={null}
        sessionReady
      />,
    );

    expect(screen.getByText("Verified EOA · ELF_7A91...556677")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(session.walletAddress);
    await waitFor(() => expect(bridge.listCampaigns).toHaveBeenCalledTimes(1));
    expect(vi.mocked(bridge.listCampaigns).mock.calls[0]?.[0]).toMatchObject({
      mode: "durable",
      session: null,
    });
  });

  it("fails closed when a live session is supplied without ready authority", () => {
    const bridge = durableBridge();
    const session = liveDurableSession();

    render(
      <UserAppPanel
        bridge={bridge}
        liveSession={session}
        locale="en-US"
        mode="durable"
        onReconnect={vi.fn()}
        session={null}
        sessionReady={false}
      />,
    );

    expect(screen.getByRole("region", { name: "Campaign feed" })).toHaveTextContent(
      "An API-issued wallet session is required.",
    );
    expect(document.body).not.toHaveTextContent(session.walletAddress);
    expect(bridge.listCampaigns).not.toHaveBeenCalled();
  });

  it("starts one effective protected feed request under React StrictMode", async () => {
    const bridge = durableBridge();

    render(
      <StrictMode>
        <UserAppPanel
          bridge={bridge}
          locale="en-US"
          mode="durable"
          onReconnect={vi.fn()}
          session={durableSession()}
          sessionReady
        />
      </StrictMode>,
    );

    expect(await screen.findByRole("button", { name: campaignAlphaCommandName })).toBeInTheDocument();
    expect(bridge.listCampaigns).toHaveBeenCalledTimes(1);
  });

  it("requires explicit canonical Campaign selection before loading repository journey", async () => {
    const bridge = durableBridge();

    renderDurable(bridge);

    expect(await screen.findByRole("button", { name: campaignAlphaCommandName })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: campaignBetaCommandName })).toBeInTheDocument();
    expect(bridge.getJourney).not.toHaveBeenCalled();
    expect(screen.getByRole("region", { name: "Public Campaign" })).toHaveTextContent("Awaken Sprint");
    expect(screen.queryByRole("region", { name: "Participant journey" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: campaignAlphaCommandName }));

    await waitFor(() => expect(bridge.getJourney).toHaveBeenCalledTimes(1));
    expect(bridge.getJourney).toHaveBeenCalledWith(expect.objectContaining({
      mode: "durable",
      selectedCampaignId: "campaign-alpha",
      session: expect.objectContaining({ sessionId: durableSession().sessionId }),
      signal: expect.any(AbortSignal),
    }));
    const selected = screen.getByRole("button", { name: campaignAlphaCommandName });
    expect(selected).toHaveAttribute("aria-current", "true");
    expect(selected).toHaveAttribute("aria-pressed", "true");
    expect(selected).toBeDisabled();
    expect(selected).toHaveStyle({ background: "#dbeafe", borderColor: "#1c64f2" });
    expect(screen.getAllByText("Participant preview")).toHaveLength(2);
    expect(screen.getAllByText("draft").length).toBeGreaterThan(0);
    const journey = await screen.findByRole("region", { name: "Participant journey" });
    expect(within(journey).getByText("campaign-alpha")).toBeInTheDocument();
    expect(within(journey).getByText("Points").nextElementSibling).toHaveTextContent("0");
    expect(within(journey).getByText("Not ranked")).toBeInTheDocument();
    expect(within(journey).getByRole("button", { name: "Verify Task task-campaign-alpha" })).toBeEnabled();
  });

  it("uses native buttons without stealing focus when Task status changes", async () => {
    const refresh = deferred<ParticipantJourneyResult>();
    const getJourney = vi
      .fn<ParticipantJourneyApiBridge["getJourney"]>()
      .mockResolvedValueOnce({
        httpStatus: 200,
        journey: durableJourney({ campaignId: "campaign-alpha" }),
        ok: true,
        source: "durable",
        status: "success",
        traceId: "trace-keyboard-initial-journey",
      })
      .mockImplementationOnce(() => refresh.promise);
    const bridge = durableBridge({ getJourney });

    renderDurable(bridge);
    const campaign = await screen.findByRole("button", { name: campaignAlphaCommandName });
    expect(campaign).toHaveAttribute("type", "button");
    expect(campaign.onkeydown).toBeNull();
    campaign.focus();
    expect(campaign).toHaveFocus();

    fireEvent.click(campaign);

    await waitFor(() => expect(getJourney).toHaveBeenCalledTimes(1));
    const journeyRegion = await screen.findByRole("region", { name: "Participant journey" });
    const journeyHeading = within(journeyRegion).getByRole("heading", { name: "Campaign Alpha" });
    expect(journeyHeading).toHaveFocus();
    const task = await screen.findByRole("button", { name: "Verify Task task-campaign-alpha" });
    expect(task).toHaveAttribute("type", "button");
    expect(task.onkeydown).toBeNull();
    task.focus();
    expect(task).toHaveFocus();

    fireEvent.click(task);

    await waitFor(() => expect(bridge.verifyTask).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getJourney).toHaveBeenCalledTimes(2));
    const refreshing = screen.getByRole("button", {
      name: "Refreshing journey (task-campaign-alpha)",
    });
    expect(journeyHeading).not.toHaveFocus();
    expect(refreshing).toBeDisabled();
    expect(refreshing).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      refresh.resolve({
        httpStatus: 200,
        journey: durableJourney({ campaignId: "campaign-alpha" }),
        ok: true,
        source: "durable",
        status: "success",
        traceId: "trace-keyboard-refreshed-journey",
      });
      await refresh.promise;
    });
  });

  it("gives duplicate Campaign titles unique canonical accessible names", async () => {
    const bridge = durableBridge({
      listCampaigns: vi.fn(async () => ({
        campaigns: [
          durableFeedItem("campaign-alpha", "Shared Campaign"),
          durableFeedItem("campaign-beta", "Shared Campaign"),
        ],
        httpStatus: 200,
        ok: true as const,
        source: "durable" as const,
        status: "success" as const,
        traceId: "trace-duplicate-title-feed",
      })),
    });

    renderDurable(bridge);

    expect(await screen.findByRole("button", {
      name: durableCampaignCommandName("campaign-alpha", "Shared Campaign"),
    })).toBeInTheDocument();
    expect(screen.getByRole("button", {
      name: durableCampaignCommandName("campaign-beta", "Shared Campaign"),
    })).toBeInTheDocument();
  });

  it("gives completed Task commands unique canonical accessible names", async () => {
    const completedJourney = durableJourney({
      campaignId: "campaign-alpha",
      completionId: "completion-campaign-alpha",
      evidenceId: "evidence-campaign-alpha",
      points: 25,
      rank: 1,
      status: "completed",
    });
    const secondTask = {
      ...completedJourney.tasks[0],
      completionId: "completion-campaign-alpha-second",
      evidenceId: "evidence-campaign-alpha-second",
      taskId: "task-campaign-alpha-second",
    };
    const bridge = durableBridge({
      getJourney: vi.fn(async () => ({
        httpStatus: 200,
        journey: {
          ...completedJourney,
          campaign: { ...completedJourney.campaign, taskCount: 2 },
          tasks: [...completedJourney.tasks, secondTask],
        },
        ok: true as const,
        source: "durable" as const,
        status: "success" as const,
        traceId: "trace-completed-task-accessible-names",
      })),
    });

    renderDurable(bridge);
    fireEvent.click(await screen.findByRole("button", { name: campaignAlphaCommandName }));

    expect(await screen.findByRole("button", {
      name: "Task completed (task-campaign-alpha)",
    })).toBeDisabled();
    expect(screen.getByRole("button", {
      name: "Task completed (task-campaign-alpha-second)",
    })).toBeDisabled();
  });

  it("updates business state only after one authoritative read-after-write refresh", async () => {
    const refresh = deferred<ParticipantJourneyResult>();
    const getJourney = vi
      .fn<ParticipantJourneyApiBridge["getJourney"]>()
      .mockResolvedValueOnce({
        httpStatus: 200,
        journey: durableJourney({ campaignId: "campaign-alpha" }),
        ok: true,
        source: "durable",
        status: "success",
        traceId: "trace-initial-journey",
      })
      .mockImplementationOnce(() => refresh.promise);
    const bridge = durableBridge({ getJourney });

    renderDurable(bridge);
    fireEvent.click(await screen.findByRole("button", { name: campaignAlphaCommandName }));
    const verify = await screen.findByRole("button", { name: "Verify Task task-campaign-alpha" });
    fireEvent.click(verify);
    fireEvent.click(verify);

    await waitFor(() => expect(bridge.verifyTask).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getJourney).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", {
      name: "Refreshing journey (task-campaign-alpha)",
    })).toBeDisabled();
    expect(screen.getByRole("region", { name: "Participant journey" })).toHaveTextContent("Points0");
    expect(screen.getByText("Awarded points").nextElementSibling).toHaveTextContent("0");
    expect(screen.queryByText("completion-campaign-alpha")).not.toBeInTheDocument();

    await act(async () => {
      refresh.resolve({
        httpStatus: 200,
        journey: durableJourney({
          campaignId: "campaign-alpha",
          completionId: "completion-campaign-alpha",
          evidenceId: "evidence-campaign-alpha",
          points: 25,
          rank: 2,
          status: "completed",
        }),
        ok: true,
        source: "durable",
        status: "success",
        traceId: "trace-refreshed-journey",
      });
      await refresh.promise;
    });

    const journey = screen.getByRole("region", { name: "Participant journey" });
    expect(journey).toHaveTextContent("Points25");
    expect(journey).toHaveTextContent("Rank#2");
    expect(journey).toHaveTextContent("eligible");
    expect(within(journey).getByText("completion-campaign-alpha")).toBeInTheDocument();
    expect(within(journey).getByText("evidence-campaign-alpha")).toBeInTheDocument();
    expect(within(journey).getByText("Awarded points").nextElementSibling).toHaveTextContent("25");
    expect(getJourney).toHaveBeenCalledTimes(2);
  });

  it("keeps the last-good journey read-only when refresh fails and retries only the read", async () => {
    const getJourney = vi
      .fn<ParticipantJourneyApiBridge["getJourney"]>()
      .mockResolvedValueOnce({
        httpStatus: 200,
        journey: durableJourney({ campaignId: "campaign-alpha" }),
        ok: true,
        source: "durable",
        status: "success",
        traceId: "trace-initial-journey",
      })
      .mockResolvedValueOnce(durableFailure({ traceId: "trace-refresh-failed" }))
      .mockResolvedValueOnce({
        httpStatus: 200,
        journey: durableJourney({ campaignId: "campaign-alpha" }),
        ok: true,
        source: "durable",
        status: "success",
        traceId: "trace-retry-journey",
      });
    const bridge = durableBridge({ getJourney });

    renderDurable(bridge);
    fireEvent.click(await screen.findByRole("button", { name: campaignAlphaCommandName }));
    fireEvent.click(await screen.findByRole("button", { name: "Verify Task task-campaign-alpha" }));

    const retry = await screen.findByRole("button", { name: "Retry journey read" });
    expect(screen.getByRole("region", { name: "Participant journey" })).toHaveTextContent("Points0");
    expect(screen.getAllByText("trace-verify-command").length).toBeGreaterThan(0);
    expect(screen.getByText("trace-refresh-failed")).toBeInTheDocument();
    fireEvent.click(retry);

    await waitFor(() => expect(getJourney).toHaveBeenCalledTimes(3));
    expect(bridge.verifyTask).toHaveBeenCalledTimes(1);
  });

  it.each(durableBridgeResponseIntegrityFailures)(
    "keeps last-good visible without claiming refresh success after $code and retries only the read",
    async ({ code, status }) => {
      const getJourney = vi
        .fn<ParticipantJourneyApiBridge["getJourney"]>()
        .mockResolvedValueOnce({
          httpStatus: 200,
          journey: durableJourney({ campaignId: "campaign-alpha" }),
          ok: true,
          source: "durable",
          status: "success",
          traceId: "trace-integrity-initial-journey",
        })
        .mockResolvedValueOnce(durableFailure({
          bridgeCode: code,
          code,
          httpStatus: 200,
          phase: "response",
          retryable: false,
          status,
          traceId: `trace-${code.toLowerCase()}`,
        }))
        .mockResolvedValueOnce({
          httpStatus: 200,
          journey: durableJourney({
            campaignId: "campaign-alpha",
            completionId: "completion-after-safe-read",
            evidenceId: "evidence-after-safe-read",
            points: 25,
            rank: 1,
            status: "completed",
          }),
          ok: true,
          source: "durable",
          status: "success",
          traceId: "trace-integrity-safe-read-retry",
        });
      const bridge = durableBridge({ getJourney });

      renderDurable(bridge);
      fireEvent.click(await screen.findByRole("button", { name: campaignAlphaCommandName }));
      fireEvent.click(await screen.findByRole("button", { name: "Verify Task task-campaign-alpha" }));

      const retry = await screen.findByRole("button", { name: "Retry journey read" });
      const staleJourney = screen.getByRole("region", { name: "Participant journey" });
      expect(staleJourney).toHaveTextContent("Points0");
      expect(within(staleJourney).getByText("Awarded points").nextElementSibling).toHaveTextContent("0");
      expect(within(staleJourney).getByText("No completion")).toBeInTheDocument();
      expect(within(staleJourney).queryByText("completion-after-safe-read")).not.toBeInTheDocument();
      expect(within(staleJourney).getByRole("button", {
        name: "Verification temporarily unavailable (task-campaign-alpha)",
      })).toBeDisabled();
      expect(screen.getByRole("button", { name: campaignAlphaCommandName })).toBeDisabled();
      expect(screen.getByRole("button", { name: campaignBetaCommandName })).toBeEnabled();
      expect(screen.getByText(code)).toBeInTheDocument();
      expect(screen.getAllByText("trace-verify-command").length).toBeGreaterThan(0);

      fireEvent.click(retry);

      await waitFor(() => expect(getJourney).toHaveBeenCalledTimes(3));
      await waitFor(() => expect(staleJourney).toHaveTextContent("Points25"));
      expect(within(staleJourney).getByText("completion-after-safe-read")).toBeInTheDocument();
      expect(bridge.verifyTask).toHaveBeenCalledTimes(1);
      expect(vi.mocked(submitUserParticipationApiReview)).not.toHaveBeenCalled();
    },
  );

  it("removes last-good journey content when Campaign access is revoked", async () => {
    const getJourney = vi
      .fn<ParticipantJourneyApiBridge["getJourney"]>()
      .mockResolvedValueOnce({
        httpStatus: 200,
        journey: durableJourney({ campaignId: "campaign-alpha" }),
        ok: true,
        source: "durable",
        status: "success",
        traceId: "trace-initial-authorized-journey",
      })
      .mockResolvedValueOnce(durableFailure({
        code: "CAMPAIGN_ACCESS_DENIED",
        httpStatus: 403,
        phase: "identity",
        retryable: false,
        status: "blocked",
        traceId: "trace-access-revoked",
      }));
    const bridge = durableBridge({ getJourney });

    renderDurable(bridge);
    fireEvent.click(await screen.findByRole("button", { name: campaignAlphaCommandName }));
    fireEvent.click(await screen.findByRole("button", { name: "Verify Task task-campaign-alpha" }));

    expect(await screen.findByText("CAMPAIGN_ACCESS_DENIED")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry journey read" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verify Task task-campaign-alpha" })).not.toBeInTheDocument();
    expect(screen.queryByText("No completion")).not.toBeInTheDocument();
  });

  it("aborts and ignores a late feed response after the issued session changes", async () => {
    const sessionAFeed = deferred<Awaited<ReturnType<ParticipantJourneyApiBridge["listCampaigns"]>>>();
    const sessionB = durableSession({ address: "ELF_SESSION_B", sessionId: "participant-session-b" });
    const listCampaigns = vi
      .fn<ParticipantJourneyApiBridge["listCampaigns"]>()
      .mockImplementationOnce(() => sessionAFeed.promise)
      .mockResolvedValueOnce({
        campaigns: [durableFeedItem("campaign-beta", "Campaign Beta")],
        httpStatus: 200,
        ok: true,
        source: "durable",
        status: "success",
        traceId: "trace-session-b-feed",
      });
    const bridge = durableBridge({ listCampaigns });
    const { rerender } = renderDurable(bridge);
    await waitFor(() => expect(listCampaigns).toHaveBeenCalledTimes(1));
    const sessionASignal = vi.mocked(listCampaigns).mock.calls[0][0].signal;

    rerender(
      <UserAppPanel
        bridge={bridge}
        locale="en-US"
        mode="durable"
        onReconnect={vi.fn()}
        session={sessionB}
        sessionReady
      />,
    );

    expect(sessionASignal?.aborted).toBe(true);
    expect(await screen.findByRole("button", { name: campaignBetaCommandName })).toBeInTheDocument();
    await act(async () => {
      sessionAFeed.resolve({
        campaigns: [durableFeedItem("campaign-alpha", "Campaign Alpha")],
        httpStatus: 200,
        ok: true,
        source: "durable",
        status: "success",
        traceId: "trace-late-session-a-feed",
      });
      await sessionAFeed.promise;
    });

    expect(screen.queryByRole("button", { name: campaignAlphaCommandName })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: campaignBetaCommandName })).toBeInTheDocument();
  });

  it.each([
    {
      code: "AUTH_SESSION_INVALID",
      httpStatus: 401,
      reconnectRequired: true,
      retryable: false,
      status: "blocked",
      traceId: "trace-stale-epoch-401",
    },
    {
      code: "PROVIDER_UNAVAILABLE",
      httpStatus: 503,
      reconnectRequired: false,
      retryable: true,
      status: "degraded",
      traceId: "trace-stale-epoch-503",
    },
  ] as const)(
    "replaces the durable UI owner for a same-key issued session at a new epoch ($httpStatus)",
    async (staleFailure) => {
      const staleVerify = deferred<ParticipantVerifyResult>();
      const verifyTask = vi
        .fn<ParticipantJourneyApiBridge["verifyTask"]>()
        .mockImplementationOnce(() => staleVerify.promise);
      const bridge = durableBridge({ verifyTask });
      const session = durableSession();
      const replacementSession = durableSession();
      const { rerender } = render(
        <UserAppPanel
          bridge={bridge}
          locale="en-US"
          mode="durable"
          onReconnect={vi.fn()}
          participantLifecycleEpoch={7}
          session={session}
          sessionReady
        />,
      );

      fireEvent.click(await screen.findByRole("button", { name: campaignAlphaCommandName }));
      fireEvent.click(await screen.findByRole("button", {
        name: "Verify Task task-campaign-alpha",
      }));
      await waitFor(() => expect(verifyTask).toHaveBeenCalledTimes(1));
      const staleSignal = vi.mocked(verifyTask).mock.calls[0][1].signal;

      rerender(
        <UserAppPanel
          bridge={bridge}
          locale="en-US"
          mode="durable"
          onReconnect={vi.fn()}
          participantLifecycleEpoch={8}
          session={replacementSession}
          sessionReady
        />,
      );

      expect(staleSignal?.aborted).toBe(true);
      await waitFor(() => expect(bridge.listCampaigns).toHaveBeenCalledTimes(2));
      expect(await screen.findByRole("button", { name: campaignAlphaCommandName }))
        .toBeInTheDocument();

      await act(async () => {
        staleVerify.resolve(durableFailure(staleFailure));
        await staleVerify.promise;
      });

      expect(screen.queryByText(staleFailure.code)).not.toBeInTheDocument();
      expect(screen.queryByText(staleFailure.traceId)).not.toBeInTheDocument();
      expect(screen.queryByRole("region", { name: "Participant journey" }))
        .not.toBeInTheDocument();
    },
  );

  it("aborts Campaign A journey and rejects its late response when Campaign B is selected", async () => {
    const campaignAJourney = deferred<ParticipantJourneyResult>();
    const getJourney = vi.fn<ParticipantJourneyApiBridge["getJourney"]>((context) =>
      context.selectedCampaignId === "campaign-alpha"
        ? campaignAJourney.promise
        : Promise.resolve({
            httpStatus: 200,
            journey: durableJourney({ campaignId: "campaign-beta" }),
            ok: true,
            source: "durable",
            status: "success",
            traceId: "trace-campaign-beta-journey",
          }));
    const bridge = durableBridge({ getJourney });

    renderDurable(bridge);
    fireEvent.click(await screen.findByRole("button", { name: campaignAlphaCommandName }));
    await waitFor(() => expect(getJourney).toHaveBeenCalledTimes(1));
    const campaignASignal = vi.mocked(getJourney).mock.calls[0][0].signal;

    fireEvent.click(screen.getByRole("button", { name: campaignBetaCommandName }));

    expect(campaignASignal?.aborted).toBe(true);
    await waitFor(() => expect(getJourney).toHaveBeenCalledTimes(2));
    const journey = await screen.findByRole("region", { name: "Participant journey" });
    expect(within(journey).getByText("campaign-beta")).toBeInTheDocument();

    await act(async () => {
      campaignAJourney.resolve({
        httpStatus: 200,
        journey: durableJourney({ campaignId: "campaign-alpha", points: 999 }),
        ok: true,
        source: "durable",
        status: "success",
        traceId: "trace-late-campaign-alpha-journey",
      });
      await campaignAJourney.promise;
    });

    expect(within(journey).queryByText("campaign-alpha")).not.toBeInTheDocument();
    expect(journey).toHaveTextContent("Points0");
  });

  it("fails closed without seeded content and retries a protected feed read", async () => {
    const listCampaigns = vi
      .fn<ParticipantJourneyApiBridge["listCampaigns"]>()
      .mockResolvedValueOnce(durableFailure({
        code: "PERSISTENCE_UNAVAILABLE",
        safeDetails: {
          rawSignature: "SECRET_SIGNATURE_MUST_NOT_RENDER",
          stack: "PRIVATE_RUNTIME_PATH_MUST_NOT_RENDER",
        },
        traceId: "trace-feed-unavailable",
      }))
      .mockResolvedValueOnce({
        campaigns: [],
        httpStatus: 200,
        ok: true,
        source: "durable",
        status: "success",
        traceId: "trace-feed-retry",
      });
    const bridge = durableBridge({ listCampaigns });

    renderDurable(bridge);

    expect(await screen.findByText("PERSISTENCE_UNAVAILABLE")).toBeInTheDocument();
    expect(screen.getByText("trace-feed-unavailable")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Public Campaign" })).toHaveTextContent("Awaken Sprint");
    expect(within(screen.getByRole("region", { name: "Campaign feed" })).queryByText("Campaign Alpha")).not.toBeInTheDocument();
    expect(screen.queryByText("SECRET_SIGNATURE_MUST_NOT_RENDER")).not.toBeInTheDocument();
    expect(screen.queryByText("PRIVATE_RUNTIME_PATH_MUST_NOT_RENDER")).not.toBeInTheDocument();
    expect(vi.mocked(loadCampaignDiscoveryApiBridgeState)).not.toHaveBeenCalled();
    expect(vi.mocked(submitUserParticipationApiReview)).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Retry Campaign feed" }));

    await waitFor(() => expect(listCampaigns).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("No Campaigns are available for this wallet.")).toBeInTheDocument();
  });

  it("wraps a long safe diagnostic code without widening the panel", async () => {
    const longCode = `CAMPAIGN_${"ACCESS_".repeat(20)}DENIED`;
    const bridge = durableBridge({
      listCampaigns: vi.fn(async () => durableFailure({
        code: longCode,
        retryable: false,
        status: "blocked",
        traceId: "trace-long-diagnostic",
      })),
    });

    renderDurable(bridge);

    expect(await screen.findByText(longCode)).toHaveStyle({ minWidth: "0", overflowWrap: "anywhere" });
  });

  it("renders one reconnect command when the protected feed rejects the session", async () => {
    const onReconnect = vi.fn();
    const bridge = durableBridge({
      listCampaigns: vi.fn(async () => durableFailure({
        code: "AUTH_SESSION_INVALID",
        reconnectRequired: true,
        retryable: false,
        traceId: "trace-session-invalid",
      })),
    });

    render(
      <UserAppPanel
        bridge={bridge}
        locale="en-US"
        mode="durable"
        onReconnect={onReconnect}
        session={durableSession()}
        sessionReady
      />,
    );

    expect(await screen.findByText("AUTH_SESSION_INVALID")).toBeInTheDocument();
    const reconnectCommands = screen.getAllByRole("button", { name: "Reconnect wallet" });
    expect(reconnectCommands).toHaveLength(1);
    expect(reconnectCommands[0]).toHaveAttribute("type", "button");
    expect(reconnectCommands[0].onkeydown).toBeNull();
    reconnectCommands[0].focus();
    expect(reconnectCommands[0]).toHaveFocus();
    fireEvent.click(reconnectCommands[0]);
    expect(reconnectCommands[0]).toHaveFocus();
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it("keeps reconnect required and disables every stale-feed Campaign command", async () => {
    const onReconnect = vi.fn();
    const verifyTask = vi.fn<ParticipantJourneyApiBridge["verifyTask"]>(async () =>
      durableFailure({
        code: "AUTH_SESSION_INVALID",
        httpStatus: 401,
        phase: "auth",
        reconnectRequired: true,
        retryable: false,
        status: "blocked",
        traceId: "trace-stale-feed-reconnect",
      }));
    const bridge = durableBridge({ verifyTask });

    render(
      <UserAppPanel
        bridge={bridge}
        locale="en-US"
        mode="durable"
        onReconnect={onReconnect}
        session={durableSession()}
        sessionReady
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: campaignAlphaCommandName }));
    fireEvent.click(await screen.findByRole("button", { name: "Verify Task task-campaign-alpha" }));

    expect(await screen.findByText("AUTH_SESSION_INVALID")).toBeInTheDocument();
    const selectedCampaign = screen.getByRole("button", { name: campaignAlphaCommandName });
    const staleCampaign = screen.getByRole("button", { name: campaignBetaCommandName });
    expect(selectedCampaign).toBeDisabled();
    expect(staleCampaign).toBeDisabled();

    fireEvent.click(staleCampaign);

    expect(bridge.getJourney).toHaveBeenCalledTimes(1);
    expect(screen.getByText("AUTH_SESSION_INVALID")).toBeInTheDocument();
    const reconnect = screen.getByRole("button", { name: "Reconnect wallet" });
    fireEvent.click(reconnect);
    expect(onReconnect).toHaveBeenCalledTimes(1);
    expect(verifyTask).toHaveBeenCalledTimes(1);
  });

  it("does not refresh or invoke legacy verification after verify failure", async () => {
    const verifyTask = vi.fn<ParticipantJourneyApiBridge["verifyTask"]>(async () =>
      durableFailure({
        code: "TASK_VERIFICATION_REJECTED",
        retryable: false,
        traceId: "trace-verify-rejected",
      }));
    const bridge = durableBridge({ verifyTask });

    renderDurable(bridge);
    fireEvent.click(await screen.findByRole("button", { name: campaignAlphaCommandName }));
    fireEvent.click(await screen.findByRole("button", { name: "Verify Task task-campaign-alpha" }));

    expect(await screen.findByText("TASK_VERIFICATION_REJECTED")).toBeInTheDocument();
    expect(bridge.getJourney).toHaveBeenCalledTimes(1);
    expect(verifyTask).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("region", { name: "Participant journey" })).toHaveTextContent("Points0");
    expect(vi.mocked(submitUserParticipationApiReview)).not.toHaveBeenCalled();
  });

  it("aborts the active journey request when the durable surface unmounts", async () => {
    const pendingJourney = deferred<ParticipantJourneyResult>();
    const getJourney = vi.fn<ParticipantJourneyApiBridge["getJourney"]>(() => pendingJourney.promise);
    const bridge = durableBridge({ getJourney });
    const { unmount } = renderDurable(bridge);

    fireEvent.click(await screen.findByRole("button", { name: campaignAlphaCommandName }));
    await waitFor(() => expect(getJourney).toHaveBeenCalledTimes(1));
    const signal = vi.mocked(getJourney).mock.calls[0][0].signal;
    unmount();

    expect(signal?.aborted).toBe(true);
    await act(async () => {
      pendingJourney.resolve({
        httpStatus: 200,
        journey: durableJourney({ campaignId: "campaign-alpha" }),
        ok: true,
        source: "durable",
        status: "success",
        traceId: "trace-after-unmount",
      });
      await pendingJourney.promise;
    });
  });

  it.each([1280, 390])("keeps native Campaign and Task commands operable at %ipx", async (width) => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
    window.dispatchEvent(new Event("resize"));
    const bridge = durableBridge();

    renderDurable(bridge);
    const campaignButton = await screen.findByRole("button", { name: campaignAlphaCommandName });
    expect(campaignButton.tagName).toBe("BUTTON");
    expect(campaignButton).toHaveAttribute("type", "button");
    expect(campaignButton).toHaveStyle({ minHeight: "42px", overflowWrap: "anywhere" });
    campaignButton.focus();
    expect(campaignButton).toHaveFocus();
    fireEvent.click(campaignButton);

    const taskButton = await screen.findByRole("button", { name: "Verify Task task-campaign-alpha" });
    expect(taskButton.tagName).toBe("BUTTON");
    expect(taskButton).toHaveAttribute("type", "button");
    expect(taskButton).toHaveStyle({ minHeight: "42px", overflowWrap: "anywhere" });
    expect(screen.getByText("Not ranked")).toBeInTheDocument();
    expect(screen.getAllByText("task-campaign-alpha").length).toBeGreaterThan(0);
  });
});
