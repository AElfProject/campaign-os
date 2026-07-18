import "@testing-library/jest-dom/vitest";
import { act, StrictMode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminDurableReviewApiBridge } from "../api/adminDurableReviewApiBridge";
import type {
  LiveWalletAuthenticationApiBridge,
  LiveWalletAuthenticationChallenge,
  LiveWalletAuthenticationFailure,
  LiveWalletAuthenticationSession,
} from "../api/liveWalletAuthenticationApiBridge";
import { submitWalletSessionApiPreview, type WalletSessionApiBridgeState } from "../api/walletSessionApiBridge";
import type {
  OwnerCampaignDetailResult,
  OwnerCampaignId,
  OwnerCampaignListResult,
  OwnerCampaignResult,
  OwnerTaskPreviewResult,
  OwnerTaskResult,
  ProjectOwnerCampaignApiBridge,
} from "../api/projectOwnerCampaignApiBridge";
import type {
  ParticipantCampaignListResult,
  ParticipantJourneyApiBridge,
  ParticipantJourneyFailure,
  ParticipantJourneyProjection,
  ParticipantJourneyResult,
  ParticipantVerifyResult,
} from "../api/participantJourneyApiBridge";
import type { StageReviewIdentity } from "../components/wallet/WalletConnectModal";
import {
  EXPORT_CSV_COLUMNS,
  walletSessions,
  type NormalizedWalletSession,
} from "../domain";
import {
  browserLocalePromptDismissedStorageKey,
  localePreferenceStorageKey,
} from "../i18n/useLocale";
import type {
  WalletClient,
  WalletClientAdapterAvailability,
  WalletClientEvent,
} from "../wallet/walletClient";
import {
  App,
  createDefaultLiveWalletAppComposition,
  type LiveWalletAppComposition,
} from "./App";

vi.mock("../api/walletSessionApiBridge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/walletSessionApiBridge")>();

  return {
    ...actual,
    submitWalletSessionApiPreview: vi.fn(actual.submitWalletSessionApiPreview),
  };
});

describe("Campaign OS app shell", () => {
  const exportColumnContract = EXPORT_CSV_COLUMNS.join(",");
  const defaultDocumentTitle = "aelf Campaign OS";
  const originalApiBaseUrl = import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL;
  const originalStageReviewEnabled = import.meta.env.VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED;
  const mockedSubmitWalletSessionApiPreview = vi.mocked(submitWalletSessionApiPreview);
  const getProductNavigation = () =>
    screen.getByRole("navigation", { name: "Campaign OS product navigation" });
  const getProjectWorkspaceNavigation = () =>
    screen.getByRole("navigation", { name: "Project Console workspace navigation" });
  const getHeader = () => screen.getByRole("banner");
  const getHeaderConnectWalletButton = () =>
    within(getHeader()).getByRole("button", { name: "Connect Wallet" });
  const getUserAppConnectWalletButton = () => {
    const buttons = screen.getAllByRole("button", { name: "Connect Wallet" });

    return buttons[buttons.length - 1];
  };
  const expectFreshHeaderWalletPreviewRequest = (
    request: Parameters<typeof submitWalletSessionApiPreview>[0]["request"],
    expectedFixture: { adapterName: string; fixtureId: string } = {
      adapterName: "PortkeyAAWallet",
      fixtureId: "sess-aa-001",
    },
  ) => {
    expect(request).toMatchObject({
      ...expectedFixture,
      proofEvaluatedAt: expect.any(String),
      proofIssuedAt: expect.any(String),
      signature: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      ),
    });

    const evaluatedAt = Date.parse(request?.proofEvaluatedAt ?? "");
    const issuedAt = Date.parse(request?.proofIssuedAt ?? "");

    expect(Number.isFinite(evaluatedAt)).toBe(true);
    expect(evaluatedAt - issuedAt).toBe(1_000);
    expect(Math.abs(Date.now() - evaluatedAt)).toBeLessThan(10_000);
  };

  const setNavigatorLanguages = (languages: readonly string[]) => {
    Object.defineProperty(window.navigator, "languages", {
      configurable: true,
      value: languages,
    });
    Object.defineProperty(window.navigator, "language", {
      configurable: true,
      value: languages[0] ?? "en-US",
    });
  };

  const pushRoute = (path: string) => {
    window.history.pushState({}, "", path);
  };

  const readMetaContent = (selector: string) =>
    document.head.querySelector<HTMLMetaElement>(selector)?.content;

  const removeDynamicMetadata = () => {
    document.title = defaultDocumentTitle;
    for (const selector of [
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[property="og:image"]',
      'meta[property="og:url"]',
      'meta[name="twitter:card"]',
      'meta[name="twitter:title"]',
      'meta[name="twitter:description"]',
      'meta[name="twitter:image"]',
    ]) {
      document.head.querySelector(selector)?.remove();
    }
    const description = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');

    if (description) {
      description.content =
        "aelf Campaign OS app shell for campaign operations, wallet-aware tasks, and review workflows.";
    }
  };

  const issuedWalletSession = (sessionId: string): NormalizedWalletSession => {
    const session = walletSessions.find((candidate) => candidate.sessionId === sessionId);

    if (!session) {
      throw new Error(`Missing wallet session fixture: ${sessionId}`);
    }

    return {
      ...session,
      issuer: {
        artifactType: "local_session_reference",
        cookieIssued: false,
        diagnosticCodes: [],
        issuerMode: "local_opaque",
        jwtIssued: false,
        liveSigningExecuted: false,
        referenceId: `issued-${sessionId}`,
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
    };
  };

  const walletSessionBridgeState = (overrides: Partial<WalletSessionApiBridgeState> = {}): WalletSessionApiBridgeState => ({
    boundary: {
      "en-US": "Local wallet session API bridge only. No live wallet SDK connection is executed.",
      "zh-CN": "仅用于本地 wallet session API bridge。",
      "zh-TW": "僅用於本地 wallet session API bridge。",
    },
    configured: true,
    diagnostics: [],
    loading: false,
    repository: {
      recordId: "wallet-session:sess-aa-001",
      repositoryId: "wallet-session-repository-runtime",
      sessionId: "sess-aa-001",
      upserted: true,
    },
    request: {
      adapterName: "PortkeyAAWallet",
      fixtureId: "sess-aa-001",
    },
    session: issuedWalletSession("sess-aa-001"),
    source: "api_runtime",
    status: "connected",
    traceId: "trace-header-wallet",
    ...overrides,
  });

  const stageReviewFixtures = {
    admin: { adapterName: "PortkeyAAWallet", fixtureId: "sess-aa-001" },
    owner: { adapterName: "PortkeyAAWallet", fixtureId: "sess-aa-001" },
    "participant-a": { adapterName: "PortkeyDiscoverWallet", fixtureId: "sess-eoa-app-001" },
    "participant-b": { adapterName: "PortkeyExtensionWallet", fixtureId: "sess-eoa-001" },
  } as const satisfies Readonly<Record<StageReviewIdentity, {
    adapterName: string;
    fixtureId: string;
  }>>;
  const stageReviewIdentityLabels = {
    admin: "Admin",
    owner: "Owner",
    "participant-a": "Participant A",
    "participant-b": "Participant B",
  } as const satisfies Readonly<Record<StageReviewIdentity, string>>;
  const stageReviewIdentities = ["owner", "participant-a", "participant-b", "admin"] as const;
  const stageReviewBridgeIdentities = ["owner", "participant-a", "admin"] as const;

  const fixtureWalletSessionBridgeState = ({
    adapterName = "PortkeyDiscoverWallet",
    fixtureId = "sess-eoa-app-001",
  }: {
    adapterName?: string;
    fixtureId?: string;
  } = {}): WalletSessionApiBridgeState => {
    const session = issuedWalletSession(fixtureId);

    return walletSessionBridgeState({
      repository: {
        recordId: `wallet-session:${session.sessionId}`,
        repositoryId: "wallet-session-repository-runtime",
        sessionId: session.sessionId,
        upserted: true,
      },
      request: {
        adapterName,
        fixtureId,
      },
      session,
      traceId: `trace-${fixtureId}`,
    });
  };

  const withWalletSessionResponseProjection = (
    requestState: WalletSessionApiBridgeState,
    responseSession: NormalizedWalletSession,
  ): WalletSessionApiBridgeState => ({
    ...requestState,
    repository: {
      ...requestState.repository,
      recordId: `wallet-session:${responseSession.sessionId}`,
      sessionId: responseSession.sessionId,
    },
    session: responseSession,
  });

  const expectStageConnectionFailClosed = async ({
    identity,
    responseState,
  }: {
    identity: StageReviewIdentity;
    responseState: WalletSessionApiBridgeState;
  }) => {
    const expectedFixture = stageReviewFixtures[identity];
    const label = stageReviewIdentityLabels[identity];

    import.meta.env.VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED = "1";
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    mockedSubmitWalletSessionApiPreview.mockResolvedValueOnce(responseState);
    const ownerBridge = appOwnerBridge();
    const participantBridge = appParticipantBridge();
    const adminBridge = appAdminBridge();

    render(
      <App
        adminDurableReviewBridge={adminBridge}
        ownerCampaignBridge={ownerBridge}
        participantJourneyBridge={participantBridge}
      />,
    );

    fireEvent.click(getHeaderConnectWalletButton());
    if (identity !== "owner") {
      fireEvent.change(screen.getByRole("combobox", { name: "Review identity" }), {
        target: { value: identity },
      });
    }
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: `Connect as ${label}` }));
    });

    expect(responseState.request).toEqual(expectedFixture);
    expect(responseState.repository).toMatchObject({
      recordId: `wallet-session:${responseState.session!.sessionId}`,
      sessionId: responseState.session!.sessionId,
    });
    expectFreshHeaderWalletPreviewRequest(
      mockedSubmitWalletSessionApiPreview.mock.calls[0]?.[0].request,
      expectedFixture,
    );
    expect(await screen.findByRole("dialog", { name: "Connect Wallet" })).toBeInTheDocument();
    expect(getHeaderConnectWalletButton()).toBeInTheDocument();
    expect(ownerBridge.recoverCampaigns).not.toHaveBeenCalled();
    expect(participantBridge.listCampaigns).not.toHaveBeenCalled();
    expect(adminBridge.listCampaigns).not.toHaveBeenCalled();
  };

  const stageReviewProjectionFields = [
    "address",
    "accountType",
    "chainId",
    "network",
    "walletSource",
  ] as const;
  type StageReviewProjectionField = (typeof stageReviewProjectionFields)[number];
  const mismatchStageReviewProjection = (
    session: NormalizedWalletSession,
    field: StageReviewProjectionField,
  ): NormalizedWalletSession => {
    switch (field) {
      case "address":
        return { ...session, address: `${session.address}-mismatch` };
      case "accountType":
        return { ...session, accountType: session.accountType === "AA" ? "EOA" : "AA" };
      case "chainId":
        return { ...session, chainId: `${session.chainId}-mismatch` };
      case "network":
        return { ...session, network: session.network === "mainnet" ? "testnet" : "mainnet" };
      case "walletSource":
        return { ...session, walletSource: "NIGHTELF" };
    }
  };

  beforeEach(() => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "";
    import.meta.env.VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED = "0";
    mockedSubmitWalletSessionApiPreview.mockReset();
    mockedSubmitWalletSessionApiPreview.mockImplementation(async (input) => {
      const actual = await vi.importActual<typeof import("../api/walletSessionApiBridge")>(
        "../api/walletSessionApiBridge",
      );

      return actual.submitWalletSessionApiPreview(input);
    });
  });

  afterEach(() => {
    window.localStorage.clear();
    setNavigatorLanguages(["en-US"]);
    pushRoute("/");
    removeDynamicMetadata();
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = originalApiBaseUrl;
    import.meta.env.VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED = originalStageReviewEnabled;
  });

  it("renders the default English shell with all surfaces exposed", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Campaign operations shell" })).toBeInTheDocument();
    const productNavigation = getProductNavigation();
    expect(
      within(productNavigation).getAllByRole("button").map((button) => button.textContent),
    ).toEqual(["Campaigns", "Create", "Analytics", "Export"]);
    expect(within(productNavigation).getByRole("button", { name: "Campaigns" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Project Console" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "User App" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Admin/Ops" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "简体中文" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "繁體中文" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "日本語" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "한국어" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Tiếng Việt" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Bahasa Indonesia" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Turkish" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Spanish" })).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Project Console workspace navigation" }),
    ).toBeInTheDocument();
    expect(within(getProjectWorkspaceNavigation()).getByRole("button", { name: "States" })).toBeInTheDocument();
    expect(within(getProjectWorkspaceNavigation()).getByRole("button", { name: "Campaigns" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
    expect(screen.getByText("Connected wallets")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Campaign Command Center" })).toBeInTheDocument();
    expect(getHeaderConnectWalletButton()).toBeInTheDocument();
    expect(within(getHeader()).queryByText("AA · Portkey")).not.toBeInTheDocument();
  });

  it("keeps the single seeded preview flow for unknown stage review flag values", () => {
    import.meta.env.VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED = "true";
    render(<App />);

    fireEvent.click(getHeaderConnectWalletButton());

    expect(screen.queryByRole("combobox", { name: "Review identity" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use seeded wallet preview" })).toBeInTheDocument();
  });

  it("keeps stage review navigation on durable product destinations only", () => {
    import.meta.env.VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED = "1";
    render(<App />);

    const productNavigation = getProductNavigation();

    expect(within(productNavigation).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Campaigns",
      "Create",
    ]);
    expect(within(productNavigation).queryByRole("button", { name: "Analytics" })).not.toBeInTheDocument();
    expect(within(productNavigation).queryByRole("button", { name: "Export" })).not.toBeInTheDocument();
  });

  it("fails stage review closed when the API runtime is unavailable", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED = "1";
    render(<App />);

    fireEvent.click(getHeaderConnectWalletButton());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Connect as Owner" }));
    });

    const dialog = await screen.findByRole("dialog", { name: "Connect Wallet" });

    expect(within(dialog).getByRole("region", { name: "Wallet session API review" })).toBeInTheDocument();
    expect(within(getHeader()).queryByRole("button", { name: /Manage wallet connection/ })).not.toBeInTheDocument();
    expect(getHeaderConnectWalletButton()).toBeInTheDocument();
  });

  it("keeps the stage User App durable and blocked when the API runtime is unavailable", () => {
    import.meta.env.VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED = "1";
    const participantBridge = appParticipantBridge();

    render(<App participantJourneyBridge={participantBridge} />);
    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    expect(document.querySelector('[data-participant-mode="durable"]')).toBeInTheDocument();
    expect(screen.getByText("An API-issued wallet session is required.")).toBeInTheDocument();
    expect(screen.queryByText("Eligibility checker")).not.toBeInTheDocument();
    expect(participantBridge.listCampaigns).not.toHaveBeenCalled();
  });

  it("binds an Owner stage session to Project Console only", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED = "1";
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    mockedSubmitWalletSessionApiPreview.mockResolvedValueOnce(walletSessionBridgeState());
    const ownerBridge = appOwnerBridge();
    const participantBridge = appParticipantBridge();
    const adminBridge = appAdminBridge();

    render(
      <App
        adminDurableReviewBridge={adminBridge}
        ownerCampaignBridge={ownerBridge}
        participantJourneyBridge={participantBridge}
      />,
    );

    fireEvent.click(getHeaderConnectWalletButton());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Connect as Owner" }));
    });

    await waitFor(() => expect(ownerBridge.recoverCampaigns).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "User App" }));
    expect(screen.getByText("An API-issued wallet session is required.")).toBeInTheDocument();
    expect(participantBridge.listCampaigns).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Admin/Ops" }));
    expect(await screen.findByText("Reconnect required")).toBeInTheDocument();
    expect(adminBridge.listCampaigns).not.toHaveBeenCalled();
  });

  it.each([
    ["Participant A", "participant-a", "PortkeyDiscoverWallet", "sess-eoa-app-001"],
    ["Participant B", "participant-b", "PortkeyExtensionWallet", "sess-eoa-001"],
  ])("binds %s stage session to User App only", async (
    label,
    identity,
    adapterName,
    sessionId,
  ) => {
    import.meta.env.VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED = "1";
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    const participantState = fixtureWalletSessionBridgeState({
      adapterName,
      fixtureId: sessionId,
    });
    mockedSubmitWalletSessionApiPreview.mockResolvedValueOnce(participantState);
    const ownerBridge = appOwnerBridge();
    const participantBridge = appParticipantBridge();
    const adminBridge = appAdminBridge();

    render(
      <App
        adminDurableReviewBridge={adminBridge}
        ownerCampaignBridge={ownerBridge}
        participantJourneyBridge={participantBridge}
      />,
    );

    fireEvent.click(getHeaderConnectWalletButton());
    fireEvent.change(screen.getByRole("combobox", { name: "Review identity" }), {
      target: { value: identity },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: `Connect as ${label}` }));
    });

    await waitFor(() => expect(participantBridge.listCampaigns).toHaveBeenCalledTimes(1));
    expect(participantBridge.listCampaigns).toHaveBeenCalledWith(expect.objectContaining({
      session: participantState.session,
    }));

    fireEvent.click(screen.getByRole("button", { name: "Project Console" }));
    expect(ownerBridge.recoverCampaigns).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Admin/Ops" }));
    expect(await screen.findByText("Reconnect required")).toBeInTheDocument();
    expect(adminBridge.listCampaigns).not.toHaveBeenCalled();
  });

  it("starts the Admin bridge only after an explicit Admin stage connection", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED = "1";
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    mockedSubmitWalletSessionApiPreview.mockResolvedValueOnce(walletSessionBridgeState({
      traceId: "trace-admin-wallet",
    }));
    const ownerBridge = appOwnerBridge();
    const participantBridge = appParticipantBridge();
    const adminBridge = appAdminBridge();

    render(
      <App
        adminDurableReviewBridge={adminBridge}
        ownerCampaignBridge={ownerBridge}
        participantJourneyBridge={participantBridge}
      />,
    );

    fireEvent.click(getHeaderConnectWalletButton());
    fireEvent.change(screen.getByRole("combobox", { name: "Review identity" }), {
      target: { value: "admin" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Connect as Admin" }));
    });

    await waitFor(() => expect(adminBridge.listCampaigns).toHaveBeenCalledTimes(1));
    expect(adminBridge.listCampaigns).toHaveBeenCalledWith(
      expect.objectContaining({ session: walletSessionBridgeState().session }),
      { limit: 100 },
    );

    fireEvent.click(screen.getByRole("button", { name: "Project Console" }));
    expect(ownerBridge.recoverCampaigns).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "User App" }));
    expect(screen.getByText("An API-issued wallet session is required.")).toBeInTheDocument();
    expect(participantBridge.listCampaigns).not.toHaveBeenCalled();
  });

  it("accepts an API-issued opaque session only when its wallet projection matches the selected fixture", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED = "1";
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    const opaqueOwnerSession: NormalizedWalletSession = {
      ...issuedWalletSession("sess-aa-001"),
      id: "opaque-owner-session",
      sessionId: "opaque-owner-session",
    };
    mockedSubmitWalletSessionApiPreview.mockResolvedValueOnce(walletSessionBridgeState({
      repository: {
        recordId: "wallet-session:opaque-owner-session",
        repositoryId: "wallet-session-repository-runtime",
        sessionId: opaqueOwnerSession.sessionId,
        upserted: true,
      },
      session: opaqueOwnerSession,
    }));
    render(<App />);

    fireEvent.click(getHeaderConnectWalletButton());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Connect as Owner" }));
    });

    expect(await within(getHeader()).findByRole("button", {
      name: "Manage wallet connection: AA · Portkey 2F4...9aB",
    })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Connect Wallet" })).not.toBeInTheDocument();
  });

  it.each([
    {
      identity: "owner" as const,
      label: "Owner",
      mutate: (session: NormalizedWalletSession): NormalizedWalletSession => ({
        ...session,
        proof: { ...session.proof!, status: "stale" },
      }),
      risk: "stale proof",
    },
    {
      identity: "admin" as const,
      label: "Admin",
      mutate: (session: NormalizedWalletSession): NormalizedWalletSession => ({
        ...session,
        proof: { ...session.proof!, trustLevel: "untrusted" },
      }),
      risk: "untrusted proof",
    },
    {
      identity: "owner" as const,
      label: "Owner",
      mutate: (session: NormalizedWalletSession): NormalizedWalletSession => ({
        ...session,
        signatureStatus: "missing",
      }),
      risk: "missing signature",
    },
    {
      identity: "admin" as const,
      label: "Admin",
      mutate: (session: NormalizedWalletSession): NormalizedWalletSession => ({
        ...session,
        capabilities: session.capabilities.filter((capability) => capability !== "SIGN_MESSAGE"),
      }),
      risk: "missing SIGN_MESSAGE capability",
    },
    {
      identity: "owner" as const,
      label: "Owner",
      mutate: (session: NormalizedWalletSession): NormalizedWalletSession => ({
        ...session,
        walletTypeVerified: false,
      }),
      risk: "unverified wallet type",
    },
  ])("keeps $label Stage connection fail-closed for $risk", async ({
    identity,
    label,
    mutate,
  }) => {
    import.meta.env.VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED = "1";
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    const baseState = walletSessionBridgeState();
    mockedSubmitWalletSessionApiPreview.mockResolvedValueOnce(walletSessionBridgeState({
      session: mutate(baseState.session!),
    }));
    const ownerBridge = appOwnerBridge();
    const participantBridge = appParticipantBridge();
    const adminBridge = appAdminBridge();

    render(
      <App
        adminDurableReviewBridge={adminBridge}
        ownerCampaignBridge={ownerBridge}
        participantJourneyBridge={participantBridge}
      />,
    );

    fireEvent.click(getHeaderConnectWalletButton());
    if (identity !== "owner") {
      fireEvent.change(screen.getByRole("combobox", { name: "Review identity" }), {
        target: { value: identity },
      });
    }
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: `Connect as ${label}` }));
    });

    expect(await screen.findByRole("dialog", { name: "Connect Wallet" })).toBeInTheDocument();
    expect(getHeaderConnectWalletButton()).toBeInTheDocument();
    expect(ownerBridge.recoverCampaigns).not.toHaveBeenCalled();
    expect(participantBridge.listCampaigns).not.toHaveBeenCalled();
    expect(adminBridge.listCampaigns).not.toHaveBeenCalled();
  });

  it.each([
    ["owner", "participant-a"],
    ["participant-a", "participant-b"],
    ["participant-b", "participant-a"],
    ["admin", "participant-a"],
  ] as const)("rejects the %s Stage connection when the API returns the %s fixture", async (
    identity,
    responseIdentity,
  ) => {
    const requestState = fixtureWalletSessionBridgeState(stageReviewFixtures[identity]);
    const responseFixtureId = stageReviewFixtures[responseIdentity].fixtureId;
    const responseState = withWalletSessionResponseProjection(
      requestState,
      issuedWalletSession(responseFixtureId),
    );

    expect(responseState.session?.sessionId).toBe(responseFixtureId);
    await expectStageConnectionFailClosed({
      identity,
      responseState,
    });
  });

  it.each(
    stageReviewBridgeIdentities.flatMap((identity) =>
      stageReviewProjectionFields.map((field) => ({
        field,
        identity,
      }))),
  )("keeps the $identity Stage connection fail-closed when only $field mismatches", async ({
    field,
    identity,
  }) => {
    const requestState = fixtureWalletSessionBridgeState(stageReviewFixtures[identity]);
    const expectedSession = requestState.session!;
    const responseSession = mismatchStageReviewProjection(expectedSession, field);
    const mismatchedFields = stageReviewProjectionFields.filter(
      (projectionField) => responseSession[projectionField] !== expectedSession[projectionField],
    );

    expect(mismatchedFields).toEqual([field]);
    await expectStageConnectionFailClosed({
      identity,
      responseState: withWalletSessionResponseProjection(requestState, responseSession),
    });
  });

  it.each(stageReviewIdentities.map((identity) => ({
    identity,
    label: stageReviewIdentityLabels[identity],
  })))(
    "maps the $label stage identity only to its approved fixture",
    async ({ identity, label }) => {
      import.meta.env.VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED = "1";
      render(<App />);

      fireEvent.click(getHeaderConnectWalletButton());
      const identityMenu = screen.getByRole("combobox", { name: "Review identity" });

      if (identity !== "owner") {
        fireEvent.change(identityMenu, { target: { value: identity } });
      }

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: `Connect as ${label}` }));
      });

      const request = mockedSubmitWalletSessionApiPreview.mock.calls[0]?.[0].request;
      const expectedFixture = stageReviewFixtures[identity];

      expectFreshHeaderWalletPreviewRequest(request, expectedFixture);
      expect(Object.keys(request ?? {}).sort()).toEqual([
        "adapterName",
        "fixtureId",
        "proofEvaluatedAt",
        "proofIssuedAt",
        "signature",
      ]);
    },
  );

  it("clears the connected identity when switching and creates fresh Owner/Admin proofs", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED = "1";
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    mockedSubmitWalletSessionApiPreview
      .mockResolvedValueOnce(walletSessionBridgeState())
      .mockResolvedValueOnce(walletSessionBridgeState({ traceId: "trace-admin-wallet" }));
    render(<App />);

    fireEvent.click(getHeaderConnectWalletButton());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Connect as Owner" }));
    });

    const connectedOwner = await within(getHeader()).findByRole("button", {
      name: "Manage wallet connection: AA · Portkey 2F4...9aB",
    });
    const ownerRequest = mockedSubmitWalletSessionApiPreview.mock.calls[0]?.[0].request;

    fireEvent.click(connectedOwner);
    fireEvent.change(screen.getByRole("combobox", { name: "Review identity" }), {
      target: { value: "admin" },
    });

    expect(within(getHeader()).queryByRole("button", { name: /Manage wallet connection/ })).not.toBeInTheDocument();
    expect(getHeaderConnectWalletButton()).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Connect as Admin" }));
    });

    const adminRequest = mockedSubmitWalletSessionApiPreview.mock.calls[1]?.[0].request;

    expectFreshHeaderWalletPreviewRequest(ownerRequest);
    expectFreshHeaderWalletPreviewRequest(adminRequest);
    expect(adminRequest?.signature).not.toBe(ownerRequest?.signature);
    expect(adminRequest?.proofEvaluatedAt).not.toBe(ownerRequest?.proofEvaluatedAt);
    expect(screen.getByRole("button", { name: "Admin/Ops" })).toHaveAttribute("aria-pressed", "true");
  });

  it("creates a fresh Participant lifecycle when the role selector returns from Owner or Admin", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED = "1";
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    const participantState = fixtureWalletSessionBridgeState();
    mockedSubmitWalletSessionApiPreview
      .mockResolvedValueOnce(participantState)
      .mockResolvedValueOnce(walletSessionBridgeState())
      .mockResolvedValueOnce(participantState)
      .mockResolvedValueOnce(walletSessionBridgeState({ traceId: "trace-admin-wallet" }))
      .mockResolvedValueOnce(participantState);
    const participantBridge = appParticipantBridge();
    const connectAs = async (identity: StageReviewIdentity) => {
      const appHeader = document.querySelector<HTMLElement>("[data-app-header]");

      expect(appHeader).not.toBeNull();
      const action = within(appHeader as HTMLElement).getByRole("button", {
        name: /Connect Wallet|Manage wallet connection/,
      });
      const label = stageReviewIdentityLabels[identity];

      fireEvent.click(action);
      fireEvent.change(screen.getByRole("combobox", { name: "Review identity" }), {
        target: { value: identity },
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: `Connect as ${label}` }));
      });
    };

    render(<App participantJourneyBridge={participantBridge} />);

    await connectAs("participant-a");
    await waitFor(() => expect(participantBridge.listCampaigns).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "User App" }));
    expect(participantBridge.listCampaigns).toHaveBeenCalledTimes(1);

    await connectAs("owner");
    expect(screen.getByRole("button", { name: "Project Console" }))
      .toHaveAttribute("aria-pressed", "true");
    expect(participantBridge.listCampaigns).toHaveBeenCalledTimes(1);

    await connectAs("participant-a");
    await waitFor(() => expect(participantBridge.listCampaigns).toHaveBeenCalledTimes(2));

    await connectAs("admin");
    expect(screen.getByRole("button", { name: "Admin/Ops" }))
      .toHaveAttribute("aria-pressed", "true");
    expect(participantBridge.listCampaigns).toHaveBeenCalledTimes(2);

    await connectAs("participant-a");
    await waitFor(() => expect(participantBridge.listCampaigns).toHaveBeenCalledTimes(3));
    expect(screen.getByRole("button", { name: "User App" }))
      .toHaveAttribute("aria-pressed", "true");
  });

  it("ignores a late identity response after switching to a newer stage connection", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED = "1";
    let resolveOwnerResponse!: (state: WalletSessionApiBridgeState) => void;
    const ownerResponse = new Promise<WalletSessionApiBridgeState>((resolve) => {
      resolveOwnerResponse = resolve;
    });
    const participantState = fixtureWalletSessionBridgeState();
    mockedSubmitWalletSessionApiPreview
      .mockImplementationOnce(async () => ownerResponse)
      .mockResolvedValueOnce(participantState);

    render(<App />);
    fireEvent.click(getHeaderConnectWalletButton());
    fireEvent.click(screen.getByRole("button", { name: "Connect as Owner" }));

    await waitFor(() => expect(mockedSubmitWalletSessionApiPreview).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByRole("combobox", { name: "Review identity" }), {
      target: { value: "participant-a" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Connect as Participant A" }));
    });

    const participantWallet = await within(getHeader()).findByRole("button", {
      name: "Manage wallet connection: EOA · Portkey App 8A2...1eF",
    });

    const headerStyle = screen.getByTestId("stage-review-header-style") as HTMLStyleElement;
    const headerRules = Array.from(headerStyle.sheet?.cssRules ?? []) as CSSStyleRule[];
    const walletRule = headerRules.find(
      (rule) => rule.selectorText === "[data-app-controls] > button",
    );
    const identityRule = headerRules.find(
      (rule) => rule.selectorText === "[data-app-controls] > button > span",
    );
    const separatorRule = headerRules.find(
      (rule) => rule.selectorText === '[data-app-controls] > button > span[aria-hidden="true"]',
    );

    expect(walletRule?.style.getPropertyValue("flex-direction")).toBe("column");
    expect(walletRule?.style.getPropertyValue("gap")).toBe("2px");
    expect(walletRule?.style.getPropertyPriority("flex-direction")).toBe("important");
    expect(identityRule?.style.getPropertyValue("white-space")).toBe("nowrap");
    expect(separatorRule?.style.getPropertyValue("display")).toBe("none");
    expect(participantWallet.querySelector('span[aria-hidden="true"]')).toBeInTheDocument();

    await act(async () => {
      resolveOwnerResponse(walletSessionBridgeState());
      await ownerResponse;
    });

    expect(within(getHeader()).getByRole("button", {
      name: "Manage wallet connection: EOA · Portkey App 8A2...1eF",
    })).toBeInTheDocument();
    expect(within(getHeader()).queryByRole("button", {
      name: "Manage wallet connection: AA · Portkey 2F4...9aB",
    })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "User App" })).toHaveAttribute("aria-pressed", "true");
  });

  it("opens the Header wallet modal and connects the local seeded preview wallet", async () => {
    render(<App />);

    fireEvent.click(getHeaderConnectWalletButton());

    const dialog = screen.getByRole("dialog", { name: "Connect Wallet" });

    expect(within(dialog).getByTestId("wallet-modal-group-recommended")).toBeInTheDocument();
    expect(within(dialog).getByTestId("wallet-modal-group-eoa")).toBeInTheDocument();
    expect(within(dialog).getByTestId("wallet-modal-group-advanced")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Use seeded wallet preview" }));
    });

    await waitFor(() => expect(within(getHeader()).getByRole("button", {
      name: "Manage wallet connection: AA · Portkey 2F4...9aB",
    })).toBeInTheDocument());
    const connectedWallet = within(getHeader()).getByRole("button", {
      name: "Manage wallet connection: AA · Portkey 2F4...9aB",
    });

    expect(connectedWallet).toHaveTextContent("AA · Portkey");
    expect(connectedWallet).toHaveTextContent("2F4...9aB");
    expect(mockedSubmitWalletSessionApiPreview).toHaveBeenCalledWith(expect.objectContaining({
      config: expect.objectContaining({
        baseUrl: "",
        tracePrefix: "header-wallet-session",
      }),
      request: expect.any(Object),
    }));
    const firstRequest = mockedSubmitWalletSessionApiPreview.mock.calls[0]?.[0].request;

    expectFreshHeaderWalletPreviewRequest(firstRequest);
    expect(screen.queryByRole("dialog", { name: "Connect Wallet" })).not.toBeInTheDocument();

    fireEvent.click(connectedWallet);

    expect(screen.getByRole("dialog", { name: "Connect Wallet" })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Use seeded wallet preview" }));
    });

    const secondRequest = mockedSubmitWalletSessionApiPreview.mock.calls[1]?.[0].request;

    expectFreshHeaderWalletPreviewRequest(secondRequest);
    expect(secondRequest?.signature).not.toBe(firstRequest?.signature);
  });

  it("connects the Header wallet through the local API runtime and renders review metadata", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    mockedSubmitWalletSessionApiPreview.mockResolvedValueOnce(walletSessionBridgeState());

    render(<App />);

    fireEvent.click(getHeaderConnectWalletButton());

    const dialog = screen.getByRole("dialog", { name: "Connect Wallet" });

    expect(within(dialog).getAllByText("Seeded fallback").length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Use seeded wallet preview" }));
    });

    await waitFor(() => expect(mockedSubmitWalletSessionApiPreview).toHaveBeenCalledWith(expect.objectContaining({
      config: expect.objectContaining({
        baseUrl: "http://127.0.0.1:5184",
        tracePrefix: "header-wallet-session",
      }),
      request: expect.any(Object),
    })));
    expectFreshHeaderWalletPreviewRequest(
      mockedSubmitWalletSessionApiPreview.mock.calls[0]?.[0].request,
    );
    expect(within(getHeader()).getByRole("button", {
      name: "Manage wallet connection: AA · Portkey 2F4...9aB",
    })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Connect Wallet" })).not.toBeInTheDocument();
  });

  it("keeps the Header wallet modal open and does not update the badge when the API result is invalid", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    mockedSubmitWalletSessionApiPreview.mockResolvedValueOnce(walletSessionBridgeState({
      diagnostics: [{
        code: "API_RESPONSE_INVALID",
        message: {
          "en-US": "The local wallet session API response shape was not recognized.",
          "zh-CN": "本地 wallet session API 响应结构无法识别。",
          "zh-TW": "本地 wallet session API 回應結構無法識別。",
        },
        severity: "error",
      }],
      repository: undefined,
      session: undefined,
      source: "error_fallback",
      status: "error",
      traceId: "trace-invalid-wallet",
    }));

    render(<App />);

    fireEvent.click(getHeaderConnectWalletButton());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Use seeded wallet preview" }));
    });

    const dialog = await screen.findByRole("dialog", { name: "Connect Wallet" });
    const review = within(dialog).getByRole("region", { name: "Wallet session API review" });

    expect(within(getHeader()).queryByRole("button", {
      name: /Manage wallet connection/,
    })).not.toBeInTheDocument();
    expect(within(getHeader()).getByRole("button", { name: "Connect Wallet" })).toBeInTheDocument();
    expect(within(review).getAllByText("Error fallback").length).toBeGreaterThan(0);
    expect(within(review).getByText(/API_RESPONSE_INVALID/)).toBeInTheDocument();
  });

  it("routes product navigation to seeded Project Console destinations", () => {
    render(<App />);

    const productNavigation = getProductNavigation();

    fireEvent.click(within(productNavigation).getByRole("button", { name: "Create" }));

    expect(within(productNavigation).getByRole("button", { name: "Create" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getAllByText("Campaign Builder").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Draft overview" })).toBeInTheDocument();

    fireEvent.click(within(productNavigation).getByRole("button", { name: "Analytics" }));

    expect(within(productNavigation).getByRole("button", { name: "Analytics" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Analytics & Export Decision" })).toBeInTheDocument();
    expect(screen.getByLabelText("Advanced Analytics readiness")).toBeInTheDocument();

    fireEvent.click(within(productNavigation).getByRole("button", { name: "Export" }));

    expect(within(productNavigation).getByRole("button", { name: "Export" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { name: "API / Skill Contracts" })).toBeInTheDocument();
    expect(screen.getByText("Read-only contract registry for future agents and APIs.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Project Console" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("Language")).toHaveValue("en-US");
    expect(getHeaderConnectWalletButton()).toBeInTheDocument();
  });

  it("keeps secondary workspaces reachable after product navigation", () => {
    render(<App />);

    fireEvent.click(within(getProductNavigation()).getByRole("button", { name: "Analytics" }));
    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    expect(screen.getByRole("button", { name: "User App" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("Eligibility checker").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Admin/Ops" }));

    expect(screen.getByRole("button", { name: "Admin/Ops" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Human review gate" })).toBeInTheDocument();

    fireEvent.click(within(getProductNavigation()).getByRole("button", { name: "Campaigns" }));

    expect(screen.getByRole("button", { name: "Project Console" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
  });

  it("prompts Chinese browser users without changing the English default", () => {
    setNavigatorLanguages(["zh-CN"]);

    render(<App />);

    expect(screen.getByRole("heading", { name: "Campaign operations shell" })).toBeInTheDocument();
    expect(
      screen.getByText("Your browser language is Chinese. Switch to 简体中文?"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Language")).toHaveValue("en-US");

    fireEvent.click(screen.getByRole("button", { name: "Switch to 简体中文" }));

    expect(screen.getByRole("heading", { name: "活动运营工作台" })).toBeInTheDocument();
    expect(screen.getByLabelText("语言")).toHaveValue("zh-CN");
    expect(window.localStorage.getItem(localePreferenceStorageKey)).toBe("zh-CN");
    expect(
      screen.queryByText("Your browser language is Chinese. Switch to 简体中文?"),
    ).not.toBeInTheDocument();
  });

  it("dismisses the Chinese browser prompt without switching locale", () => {
    setNavigatorLanguages(["zh-Hans-CN"]);

    render(<App />);

    expect(
      screen.getByText("Your browser language is Chinese. Switch to 简体中文?"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Keep English" }));

    expect(screen.getByRole("heading", { name: "Campaign operations shell" })).toBeInTheDocument();
    expect(screen.getByLabelText("Language")).toHaveValue("en-US");
    expect(window.localStorage.getItem(browserLocalePromptDismissedStorageKey)).toBe("true");
    expect(
      screen.queryByText("Your browser language is Chinese. Switch to 简体中文?"),
    ).not.toBeInTheDocument();
  });

  it("restores saved zh-CN preference without showing the browser prompt", () => {
    setNavigatorLanguages(["zh-CN"]);
    window.localStorage.setItem(localePreferenceStorageKey, "zh-CN");

    render(<App />);

    expect(screen.getByRole("heading", { name: "活动运营工作台" })).toBeInTheDocument();
    expect(screen.getByLabelText("语言")).toHaveValue("zh-CN");
    expect(
      screen.queryByText("Your browser language is Chinese. Switch to 简体中文?"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "繁體中文" })).toBeInTheDocument();
  });

  it("uses supported URL locale before stored locale on initial load", () => {
    window.localStorage.setItem(localePreferenceStorageKey, "en-US");
    pushRoute("/zh-CN/campaigns/awaken-sprint");

    render(<App />);

    expect(screen.getByRole("heading", { name: "活动运营工作台" })).toBeInTheDocument();
    expect(screen.getByLabelText("语言")).toHaveValue("zh-CN");
    expect(screen.getByRole("heading", { name: "Awaken 冲刺活动" })).toBeInTheDocument();
  });

  it("initializes zh-TW from the URL while campaign content falls back safely", () => {
    pushRoute("/zh-TW/campaigns/awaken-sprint");

    render(<App />);

    expect(screen.getByRole("heading", { name: "活動營運工作台" })).toBeInTheDocument();
    expect(screen.getByLabelText("語言")).toHaveValue("zh-TW");
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
  });

  it("preserves the zh-TW URL locale for User App share readiness while content falls back", () => {
    pushRoute("/zh-TW/campaigns/awaken-sprint");

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "使用者應用" }));

    const shareReadiness = screen.getByRole("region", { name: "Share card readiness" });
    const canonicalUrlCard = within(shareReadiness)
      .getByText("Canonical URL")
      .closest("article");

    expect(canonicalUrlCard).not.toBeNull();
    expect(
      within(canonicalUrlCard as HTMLElement).getByText(
        "https://campaign.local/zh-TW/campaigns/awaken-sprint",
      ),
    ).toBeInTheDocument();
    expect(within(shareReadiness).getByText("English fallback")).toBeInTheDocument();
    expect(
      within(shareReadiness).getByText(
        "This locale uses English fallback until localized campaign content is reviewed.",
      ),
    ).toBeInTheDocument();
    expect(
      within(canonicalUrlCard as HTMLElement).queryByText(
        "https://campaign.local/en-US/campaigns/awaken-sprint",
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
  });

  it("uses the active zh-TW locale for the User App wallet modal while content falls back", () => {
    pushRoute("/zh-TW/campaigns/awaken-sprint");

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "使用者應用" }));

    expect(getUserAppConnectWalletButton()).toBeInTheDocument();

    fireEvent.click(getUserAppConnectWalletButton());

    const dialog = screen.getByRole("dialog", { name: "連接錢包" });

    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByText("擴充套件未安裝：請安裝或開啟你的 EOA 錢包擴充套件。"),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByText("Extension not installed: Install or open your EOA wallet extension."),
    ).not.toBeInTheDocument();
  });

  it("initializes ja-JP from the URL while business content falls back safely", () => {
    pushRoute("/ja-JP/campaigns/awaken-sprint");

    render(<App />);

    expect(screen.getByRole("heading", { name: "Campaign operations shell" })).toBeInTheDocument();
    expect(screen.getByLabelText("Language")).toHaveValue("ja-JP");
    expect(screen.getByRole("option", { name: "日本語" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
  });

  it("initializes ko-KR from the URL while business content falls back safely", () => {
    pushRoute("/ko-KR/campaigns/awaken-sprint");

    render(<App />);

    expect(screen.getByRole("heading", { name: "Campaign operations shell" })).toBeInTheDocument();
    expect(screen.getByLabelText("Language")).toHaveValue("ko-KR");
    expect(screen.getByRole("option", { name: "한국어" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
  });

  it("initializes vi-VN from the URL while business content falls back safely", () => {
    pushRoute("/vi-VN/campaigns/awaken-sprint");

    render(<App />);

    expect(screen.getByRole("heading", { name: "Campaign operations shell" })).toBeInTheDocument();
    expect(screen.getByLabelText("Language")).toHaveValue("vi-VN");
    expect(screen.getByRole("option", { name: "Tiếng Việt" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
  });

  it("initializes id-ID from the URL while business content falls back safely", () => {
    pushRoute("/id-ID/campaigns/awaken-sprint");

    render(<App />);

    expect(screen.getByRole("heading", { name: "Campaign operations shell" })).toBeInTheDocument();
    expect(screen.getByLabelText("Language")).toHaveValue("id-ID");
    expect(screen.getByRole("option", { name: "Bahasa Indonesia" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
  });

  it("initializes tr-TR from the URL while business content falls back safely", () => {
    pushRoute("/tr-TR/campaigns/awaken-sprint");

    render(<App />);

    expect(screen.getByRole("heading", { name: "Campaign operations shell" })).toBeInTheDocument();
    expect(screen.getByLabelText("Language")).toHaveValue("tr-TR");
    expect(screen.getByRole("option", { name: "Turkish" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
  });

  it("initializes es-ES from the URL while business content falls back safely", () => {
    pushRoute("/es-ES/campaigns/awaken-sprint");

    render(<App />);

    expect(screen.getByRole("heading", { name: "Campaign operations shell" })).toBeInTheDocument();
    expect(screen.getByLabelText("Language")).toHaveValue("es-ES");
    expect(screen.getByRole("option", { name: "Spanish" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
  });

  it("updates campaign metadata from the active share card without duplicate tags", () => {
    pushRoute("/zh-CN/campaigns/awaken-sprint");

    const { rerender } = render(<App />);

    expect(document.title).toBe("Awaken Sprint | aelf Campaign OS");
    expect(readMetaContent('meta[name="description"]')).toBe(
      "Complete wallet-aware aelf ecosystem tasks.",
    );
    expect(readMetaContent('meta[property="og:url"]')).toBe(
      "https://campaign.local/zh-CN/campaigns/awaken-sprint",
    );
    expect(readMetaContent('meta[property="og:image"]')).toBe(
      "https://campaign.local/share-cards/awaken-sprint-zh-CN.png",
    );
    expect(readMetaContent('meta[name="twitter:card"]')).toBe("summary_large_image");

    rerender(<App />);

    expect(document.head.querySelectorAll('meta[property="og:url"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('meta[name="twitter:card"]')).toHaveLength(1);
  });

  it("switches major shell copy manually to zh-CN", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "zh-CN" } });

    expect(screen.getByRole("heading", { name: "活动运营工作台" })).toBeInTheDocument();
    const productNavigation = screen.getByRole("navigation", { name: "Campaign OS product navigation" });
    expect(
      within(productNavigation).getAllByRole("button").map((button) => button.textContent),
    ).toEqual(["活动", "创建", "分析", "导出"]);
    expect(screen.getByRole("button", { name: "项目控制台" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "用户应用" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "管理员/Ops" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Awaken 冲刺活动" })).toBeInTheDocument();
    expect(screen.getByText("已连接钱包")).toBeInTheDocument();
  });

  it("switches the app shell manually to zh-TW while campaign content falls back safely", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "zh-TW" } });

    expect(screen.getByRole("heading", { name: "活動營運工作台" })).toBeInTheDocument();
    const productNavigation = screen.getByRole("navigation", { name: "Campaign OS product navigation" });
    expect(
      within(productNavigation).getAllByRole("button").map((button) => button.textContent),
    ).toEqual(["活動", "建立", "分析", "匯出"]);
    expect(screen.getByRole("button", { name: "專案控制台" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "使用者應用" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "管理員/Ops" })).toBeInTheDocument();
    expect(screen.getByLabelText("語言")).toHaveValue("zh-TW");
    expect(window.localStorage.getItem(localePreferenceStorageKey)).toBe("zh-TW");
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
  });

  it("switches the app shell manually to ja-JP while preserving English business fallback", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "ja-JP" } });

    expect(screen.getByRole("heading", { name: "Campaign operations shell" })).toBeInTheDocument();
    expect(screen.getByLabelText("Language")).toHaveValue("ja-JP");
    expect(window.localStorage.getItem(localePreferenceStorageKey)).toBe("ja-JP");
    expect(screen.getByRole("option", { name: "日本語" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
  });

  it("switches the app shell manually to ko-KR while preserving English business fallback", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "ko-KR" } });

    expect(screen.getByRole("heading", { name: "Campaign operations shell" })).toBeInTheDocument();
    expect(screen.getByLabelText("Language")).toHaveValue("ko-KR");
    expect(window.localStorage.getItem(localePreferenceStorageKey)).toBe("ko-KR");
    expect(screen.getByRole("option", { name: "한국어" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
  });

  it("switches the app shell manually to vi-VN while preserving English business fallback", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "vi-VN" } });

    expect(screen.getByRole("heading", { name: "Campaign operations shell" })).toBeInTheDocument();
    expect(screen.getByLabelText("Language")).toHaveValue("vi-VN");
    expect(window.localStorage.getItem(localePreferenceStorageKey)).toBe("vi-VN");
    expect(screen.getByRole("option", { name: "Tiếng Việt" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
  });

  it("switches the app shell manually to id-ID while preserving English business fallback", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "id-ID" } });

    expect(screen.getByRole("heading", { name: "Campaign operations shell" })).toBeInTheDocument();
    expect(screen.getByLabelText("Language")).toHaveValue("id-ID");
    expect(window.localStorage.getItem(localePreferenceStorageKey)).toBe("id-ID");
    expect(screen.getByRole("option", { name: "Bahasa Indonesia" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
  });

  it("switches the app shell manually to tr-TR while preserving English business fallback", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "tr-TR" } });

    expect(screen.getByRole("heading", { name: "Campaign operations shell" })).toBeInTheDocument();
    expect(screen.getByLabelText("Language")).toHaveValue("tr-TR");
    expect(window.localStorage.getItem(localePreferenceStorageKey)).toBe("tr-TR");
    expect(screen.getByRole("option", { name: "Turkish" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
  });

  it("switches the app shell manually to es-ES while preserving English business fallback", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "es-ES" } });

    expect(screen.getByRole("heading", { name: "Campaign operations shell" })).toBeInTheDocument();
    expect(screen.getByLabelText("Language")).toHaveValue("es-ES");
    expect(window.localStorage.getItem(localePreferenceStorageKey)).toBe("es-ES");
    expect(screen.getByRole("option", { name: "Spanish" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
  });

  it("preserves ja-JP share readiness while wallet modal copy falls back to English", () => {
    pushRoute("/ja-JP/campaigns/awaken-sprint");

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    const shareReadiness = screen.getByRole("region", { name: "Share card readiness" });
    const canonicalUrlCard = within(shareReadiness)
      .getByText("Canonical URL")
      .closest("article");

    expect(canonicalUrlCard).not.toBeNull();
    expect(
      within(canonicalUrlCard as HTMLElement).getByText(
        "https://campaign.local/ja-JP/campaigns/awaken-sprint",
      ),
    ).toBeInTheDocument();
    expect(within(shareReadiness).getByText("English fallback")).toBeInTheDocument();

    fireEvent.click(getUserAppConnectWalletButton());

    expect(screen.getByRole("dialog", { name: "Connect Wallet" })).toBeInTheDocument();
    expect(
      screen.getByText("Extension not installed: Install or open your EOA wallet extension."),
    ).toBeInTheDocument();
  });

  it("preserves ko-KR share readiness while wallet modal copy falls back to English", () => {
    pushRoute("/ko-KR/campaigns/awaken-sprint");

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    const shareReadiness = screen.getByRole("region", { name: "Share card readiness" });
    const canonicalUrlCard = within(shareReadiness)
      .getByText("Canonical URL")
      .closest("article");

    expect(canonicalUrlCard).not.toBeNull();
    expect(
      within(canonicalUrlCard as HTMLElement).getByText(
        "https://campaign.local/ko-KR/campaigns/awaken-sprint",
      ),
    ).toBeInTheDocument();
    expect(within(shareReadiness).getByText("English fallback")).toBeInTheDocument();

    fireEvent.click(getUserAppConnectWalletButton());

    expect(screen.getByRole("dialog", { name: "Connect Wallet" })).toBeInTheDocument();
    expect(
      screen.getByText("Extension not installed: Install or open your EOA wallet extension."),
    ).toBeInTheDocument();
  });

  it("preserves vi-VN share readiness while wallet modal copy falls back to English", () => {
    pushRoute("/vi-VN/campaigns/awaken-sprint");

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    const shareReadiness = screen.getByRole("region", { name: "Share card readiness" });
    const canonicalUrlCard = within(shareReadiness)
      .getByText("Canonical URL")
      .closest("article");

    expect(canonicalUrlCard).not.toBeNull();
    expect(
      within(canonicalUrlCard as HTMLElement).getByText(
        "https://campaign.local/vi-VN/campaigns/awaken-sprint",
      ),
    ).toBeInTheDocument();
    expect(within(shareReadiness).getByText("English fallback")).toBeInTheDocument();

    fireEvent.click(getUserAppConnectWalletButton());

    expect(screen.getByRole("dialog", { name: "Connect Wallet" })).toBeInTheDocument();
    expect(
      screen.getByText("Extension not installed: Install or open your EOA wallet extension."),
    ).toBeInTheDocument();
  });

  it("preserves id-ID share readiness while wallet modal copy falls back to English", () => {
    pushRoute("/id-ID/campaigns/awaken-sprint");

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    const shareReadiness = screen.getByRole("region", { name: "Share card readiness" });
    const canonicalUrlCard = within(shareReadiness)
      .getByText("Canonical URL")
      .closest("article");

    expect(canonicalUrlCard).not.toBeNull();
    expect(
      within(canonicalUrlCard as HTMLElement).getByText(
        "https://campaign.local/id-ID/campaigns/awaken-sprint",
      ),
    ).toBeInTheDocument();
    expect(within(shareReadiness).getByText("English fallback")).toBeInTheDocument();

    fireEvent.click(getUserAppConnectWalletButton());

    expect(screen.getByRole("dialog", { name: "Connect Wallet" })).toBeInTheDocument();
    expect(
      screen.getByText("Extension not installed: Install or open your EOA wallet extension."),
    ).toBeInTheDocument();
  });

  it("preserves tr-TR share readiness while wallet modal copy falls back to English", () => {
    pushRoute("/tr-TR/campaigns/awaken-sprint");

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    const shareReadiness = screen.getByRole("region", { name: "Share card readiness" });
    const canonicalUrlCard = within(shareReadiness)
      .getByText("Canonical URL")
      .closest("article");

    expect(canonicalUrlCard).not.toBeNull();
    expect(
      within(canonicalUrlCard as HTMLElement).getByText(
        "https://campaign.local/tr-TR/campaigns/awaken-sprint",
      ),
    ).toBeInTheDocument();
    expect(within(shareReadiness).getByText("English fallback")).toBeInTheDocument();

    fireEvent.click(getUserAppConnectWalletButton());

    expect(screen.getByRole("dialog", { name: "Connect Wallet" })).toBeInTheDocument();
    expect(
      screen.getByText("Extension not installed: Install or open your EOA wallet extension."),
    ).toBeInTheDocument();
  });

  it("preserves es-ES share readiness while wallet modal copy falls back to English", () => {
    pushRoute("/es-ES/campaigns/awaken-sprint");

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    const shareReadiness = screen.getByRole("region", { name: "Share card readiness" });
    const canonicalUrlCard = within(shareReadiness)
      .getByText("Canonical URL")
      .closest("article");

    expect(canonicalUrlCard).not.toBeNull();
    expect(
      within(canonicalUrlCard as HTMLElement).getByText(
        "https://campaign.local/es-ES/campaigns/awaken-sprint",
      ),
    ).toBeInTheDocument();
    expect(within(shareReadiness).getByText("English fallback")).toBeInTheDocument();

    fireEvent.click(getUserAppConnectWalletButton());

    expect(screen.getByRole("dialog", { name: "Connect Wallet" })).toBeInTheDocument();
    expect(
      screen.getByText("Extension not installed: Install or open your EOA wallet extension."),
    ).toBeInTheDocument();
  });

  it("keeps zh-TW browser language as prompt-only on first load", () => {
    setNavigatorLanguages(["zh-TW"]);

    render(<App />);

    expect(screen.getByRole("heading", { name: "Campaign operations shell" })).toBeInTheDocument();
    expect(screen.getByLabelText("Language")).toHaveValue("en-US");
    expect(
      screen.getByText("Your browser language is Chinese. Switch to 简体中文?"),
    ).toBeInTheDocument();
  });

  it("exposes Campaign Builder core flow from the Project Console", () => {
    render(<App />);

    fireEvent.click(within(getProductNavigation()).getByRole("button", { name: "Create" }));

    expect(screen.getAllByText("Campaign Builder").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Draft overview" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Default and fallback: en-US. Supported: en-US, zh-CN, and zh-TW fallback readiness.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Draft setup combines AI brief and structured campaign fields").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Rewards and eligibility setup" })).toBeInTheDocument();
    expect(screen.getAllByText("Rewards are provided by the campaign project. Campaign OS does not distribute rewards.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Exporting winners does not distribute rewards.").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "i18n, contract, and review gates" })).toBeInTheDocument();
    expect(screen.getByText("English source content")).toBeInTheDocument();
    expect(screen.getByText("Chinese AI draft")).toBeInTheDocument();
    expect(screen.getByText("Off-chain MVP")).toBeInTheDocument();
    expect(screen.getByText("V2 companion")).toBeInTheDocument();
    expect(screen.getByText("Contract claim")).toBeInTheDocument();
    expect(screen.getByText("High-impact manual review blocker")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Publish readiness" })).toBeInTheDocument();
    expect(
      screen.getAllByText("Contract claim mode requires high-impact manual review.").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Switch to Off-chain MVP or complete contract reviewer approval.")).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "Chinese draft falls back to English until a project owner completes human review.",
      ).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Task Builder Preview").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rewards & Eligibility").length).toBeGreaterThan(0);
    expect(screen.getAllByText("i18n Translation Review").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Contract Impact Review").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Templates" }));
    expect(screen.getByRole("heading", { name: "Task template library" })).toBeInTheDocument();
    for (const category of ["wallet", "bridge", "swap", "nft", "dao", "daipp", "social", "invite"]) {
      expect(screen.getByText(category)).toBeInTheDocument();
    }

    fireEvent.click(within(getProductNavigation()).getByRole("button", { name: "Export" }));
    expect(screen.getByRole("heading", { name: "API / Skill Contracts" })).toBeInTheDocument();
    expect(screen.getByText("Read-only contract registry for future agents and APIs.")).toBeInTheDocument();
    expect(screen.getByText("create_campaign")).toBeInTheDocument();
    expect(screen.getByText("summarize_campaign")).toBeInTheDocument();
    expect(screen.getByText(/does not call live APIs/i)).toBeInTheDocument();
  });

  it("updates Campaign Builder core copy when manually switched to zh-CN", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "zh-CN" } });
    fireEvent.click(within(getProductNavigation()).getByRole("button", { name: "创建" }));

    expect(screen.getAllByText("活动构建器").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "草稿概览" })).toBeInTheDocument();
    expect(
      screen.getByText("默认与回退：en-US。支持：en-US、zh-CN 与 zh-TW 回退 readiness。"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("草稿设置结合 AI 简报与结构化活动字段").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "奖励与资格设置" })).toBeInTheDocument();
    expect(screen.getAllByText("奖励由活动项目方提供。Campaign OS 不负责自动发奖。").length).toBeGreaterThan(0);
    expect(screen.getAllByText("导出获奖名单不等于发放奖励。").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "多语言、合约与审核门禁" })).toBeInTheDocument();
    expect(screen.getByText("英文源内容")).toBeInTheDocument();
    expect(screen.getByText("中文 AI 草稿")).toBeInTheDocument();
    expect(screen.getByText("V2 辅助合约")).toBeInTheDocument();
    expect(screen.getByText("合约领取")).toBeInTheDocument();
    expect(screen.getByText("高影响人工审核阻断")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "发布准备度" })).toBeInTheDocument();
    expect(screen.getAllByText("合约领取模式需要高影响人工审核。").length).toBeGreaterThan(0);
    expect(screen.getByText("切换到 Off-chain MVP，或完成合约审核人批准。")).toBeInTheDocument();
    expect(screen.getAllByText("任务构建预览").length).toBeGreaterThan(0);
    expect(screen.getAllByText("奖励与资格").length).toBeGreaterThan(0);
    expect(screen.getAllByText("i18n 翻译审核").length).toBeGreaterThan(0);
    expect(screen.getAllByText("合约影响审核").length).toBeGreaterThan(0);
    expect(screen.getByRole("option", { name: "繁體中文" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "模板" }));
    expect(screen.getByRole("heading", { name: "任务模板库" })).toBeInTheDocument();
    expect(screen.getAllByText("连接钱包").length).toBeGreaterThan(0);

    fireEvent.click(within(getProductNavigation()).getByRole("button", { name: "导出" }));
    expect(screen.getByRole("heading", { name: "API / Skill Contracts" })).toBeInTheDocument();
    expect(screen.getByText("面向未来 agent 与 API 的只读 contract registry。")).toBeInTheDocument();
    expect(screen.getByText("创建活动草稿")).toBeInTheDocument();
    expect(screen.getByText("总结活动")).toBeInTheDocument();
    expect(screen.getAllByText(/不会调用实时 API/).length).toBeGreaterThan(0);
  });

  it("exposes wallet options and export disclaimer across user and admin surfaces", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    expect(screen.getAllByText("Portkey AA Wallet").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Portkey EOA App").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Portkey EOA Extension").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Wallet Connection Diagnostics" })).toBeInTheDocument();
    expect(screen.getByText("Wallet QA checklist")).toBeInTheDocument();
    expect(screen.getByText("Supported; AA is recommended, not mandatory.")).toBeInTheDocument();
    expect(screen.getAllByText("AA + EOA").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Wallet session status" })).toBeInTheDocument();
    expect(screen.getAllByText("Eligibility checker").length).toBeGreaterThan(0);
    expect(screen.getByText("Task verification states")).toBeInTheDocument();
    expect(screen.getAllByText(/Provider readiness/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Fallback reason/).length).toBeGreaterThan(0);
    expect(screen.getByText(/review-task-agent-review-3E9/)).toBeInTheDocument();
    expect(screen.getAllByText(/queued for manual review/).length).toBeGreaterThan(0);
    expect(screen.getByText("Referral context")).toBeInTheDocument();
    expect(screen.getByText("Leaderboard preview")).toBeInTheDocument();
    expect(screen.getByText("Qualified invitees")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "繁體中文" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Admin/Ops" }));

    expect(screen.getByRole("heading", { name: "Human review gate" })).toBeInTheDocument();
    expect(screen.getByLabelText("Task evidence Review queue")).toBeInTheDocument();
    expect(screen.getAllByText(/review-task-agent-review-3E9/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/review required/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Template Governance" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AI Content Pack Workbench" })).toBeInTheDocument();
    expect(screen.getAllByText("Publish blocked").length).toBeGreaterThan(0);
    expect(screen.getByText("Export winners does not distribute rewards.")).toBeInTheDocument();
    expect(screen.getByText(exportColumnContract)).toBeInTheDocument();
    expect(screen.getByText("Campaign OS exports verified records only.")).toBeInTheDocument();
  });

  it("opens the User App wallet connect modal from the app shell", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    expect(screen.queryByRole("dialog", { name: "Connect Wallet" })).not.toBeInTheDocument();

    fireEvent.click(getUserAppConnectWalletButton());

    const dialog = screen.getByRole("dialog", { name: "Connect Wallet" });

    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Campaign OS never asks for private keys, seed phrases, recovery phrases, or password exports.")).toBeInTheDocument();
    expect(screen.getAllByText("Seeded preview only: no live wallet SDK, no real signature, no transaction, and no contract read/write is executed.").length).toBeGreaterThan(0);
    expect(screen.getByRole("option", { name: "繁體中文" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close wallet connect modal" }));

    expect(screen.queryByRole("dialog", { name: "Connect Wallet" })).not.toBeInTheDocument();
  });

  it("keeps Mission 6 Admin/Ops live while other shell surfaces remain reachable", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Campaign operations shell" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "繁體中文" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Admin/Ops" }));

    expect(screen.getByText("Legacy local Admin preview")).toBeInTheDocument();
    expect(screen.getByText("Analytics overview")).toBeInTheDocument();
    expect(screen.getByText("Risk dashboard")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Anti-Sybil v2 graph intelligence" })).toBeInTheDocument();
    const antiSybilSection = screen
      .getByRole("heading", { name: "Anti-Sybil v2 graph intelligence" })
      .closest("section");
    expect(antiSybilSection).not.toBeNull();
    expect(within(antiSybilSection as HTMLElement).getByText("Funding graph")).toBeInTheDocument();
    expect(within(antiSybilSection as HTMLElement).getByText("Invite tree")).toBeInTheDocument();
    expect(within(antiSybilSection as HTMLElement).getByText("Behavior cluster")).toBeInTheDocument();
    expect(within(antiSybilSection as HTMLElement).getByText(/No live graph provider/)).toBeInTheDocument();
    expect(within(antiSybilSection as HTMLElement).getByText(/reward distribution/)).toBeInTheDocument();
    expect(screen.getByText("Bot/sybil review")).toBeInTheDocument();
    expect(screen.getByText("AI Ops reports")).toBeInTheDocument();
    expect(screen.getByText("Ecosystem metrics")).toBeInTheDocument();
    expect(screen.getByText("Export batch: export-awaken-sprint-preview")).toBeInTheDocument();
    expect(screen.getAllByText(/demo-task-bridge-3E9/).length).toBeGreaterThan(0);
    expect(screen.getByRole("option", { name: "繁體中文" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Project Console" }));
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "User App" }));
    expect(screen.getAllByText("Eligibility checker").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ecosystem next actions").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No live Pay service, wallet SDK, payment transaction, contract view, or contract send is executed.").length).toBeGreaterThan(0);
  });
});

const appOwnerSessionA: NormalizedWalletSession = {
  ...walletSessions[0],
  issuer: {
    artifactType: "local_session_reference",
    cookieIssued: false,
    diagnosticCodes: [],
    issuerMode: "local_opaque",
    jwtIssued: false,
    liveSigningExecuted: false,
    referenceId: "issued-app-owner-session-a",
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
};
const appOwnerSessionB: NormalizedWalletSession = {
  ...appOwnerSessionA,
  address: "ELF_APP_OWNER_B",
  displayAddress: "ELF...ERB",
  id: "normalized-app-owner-b",
  sessionId: "app-owner-session-b",
};

const appWalletSessionState = (
  session: NormalizedWalletSession,
): WalletSessionApiBridgeState => ({
  boundary: {
    "en-US": "Local wallet session API bridge only.",
    "zh-CN": "Local wallet session API bridge only.",
    "zh-TW": "Local wallet session API bridge only.",
  },
  configured: true,
  diagnostics: [],
  loading: false,
  repository: {
    recordId: `wallet-session:${session.sessionId}`,
    repositoryId: "wallet-session-repository-runtime",
    sessionId: session.sessionId,
    upserted: true,
  },
  request: {
    adapterName: "PortkeyAAWallet",
    fixtureId: "sess-aa-001",
  },
  session,
  source: "api_runtime",
  status: "connected",
  traceId: `trace-${session.sessionId}`,
});

const appOwnerList = (campaignIds: readonly string[]): OwnerCampaignListResult => ({
  campaigns: campaignIds.map((campaignId) => ({
    id: campaignId as OwnerCampaignId,
    ownerAddress: appOwnerSessionA.address,
    projectId: "awaken",
    status: "draft",
  })),
  httpStatus: 200,
  ok: true,
  traceId: "trace-app-recover",
});

const appOwnerDetail = (campaignId: string): OwnerCampaignDetailResult => ({
  campaign: {
    id: campaignId as OwnerCampaignId,
    ownerAddress: appOwnerSessionA.address,
    projectId: "awaken",
    status: "draft",
  },
  httpStatus: 200,
  ok: true,
  tasks: [],
  traceId: `trace-app-detail-${campaignId}`,
});

const appOwnerFailure = () => ({
  code: "INVALID_REQUEST",
  diagnostic: { code: "INVALID_REQUEST", message: "Not used by this test." },
  httpStatus: 400,
  ok: false as const,
  reconnectRequired: false,
  retryable: false,
  traceId: "trace-app-unused",
});

const appOwnerBridge = (
  overrides: Partial<ProjectOwnerCampaignApiBridge> = {},
): ProjectOwnerCampaignApiBridge => ({
  addTask: vi.fn(async (): Promise<OwnerTaskResult> => appOwnerFailure()),
  createCampaign: vi.fn(async (): Promise<OwnerCampaignResult> => appOwnerFailure()),
  generateTaskPreview: vi.fn(async (): Promise<OwnerTaskPreviewResult> => appOwnerFailure()),
  getCampaignDetail: vi.fn(async (campaignId): Promise<OwnerCampaignDetailResult> =>
    appOwnerDetail(campaignId)),
  recoverCampaigns: vi.fn(async (): Promise<OwnerCampaignListResult> => appOwnerList([])),
  ...overrides,
});

const appParticipantFailure = (): ParticipantJourneyFailure => ({
  code: "BRIDGE_INVALID_INPUT",
  httpStatus: 400,
  ok: false,
  phase: "config",
  reconnectRequired: false,
  retryable: false,
  source: "durable",
  status: "blocked",
  traceId: "trace-app-participant-unused",
});

const appParticipantFeed = (
  campaignId: string,
  title: string,
): ParticipantCampaignListResult => ({
  campaigns: [{
    campaignId,
    projectId: "awaken",
    repository: {
      adapterId: "campaign-db-adapter",
      createdViaRepository: true,
      repositoryId: "campaign-db-repository-runtime",
      storeId: "campaign-db",
    },
    status: "draft",
    taskCount: 0,
    title: { "en-US": title, "zh-CN": title, "zh-TW": title },
    visibility: "participant_preview",
  }],
  httpStatus: 200,
  ok: true,
  source: "durable",
  status: "success",
  traceId: `trace-app-participant-${campaignId}`,
});

const appParticipantJourney = (
  campaignId: string,
  session: NormalizedWalletSession,
  completed = false,
): ParticipantJourneyProjection => {
  const taskId = `task-${campaignId}`;

  return {
    campaign: {
      campaignId,
      endTime: "2026-08-31T00:00:00.000Z",
      goal: "Exercise session authority rotation",
      projectId: "awaken",
      rewardDescription: "Review points",
      startTime: "2026-07-01T00:00:00.000Z",
      status: "draft",
      taskCount: 1,
      walletPolicy: "ANY",
    },
    diagnostics: [],
    eligibility: {
      accountType: session.accountType,
      campaignId,
      eligible: completed,
      localePreference: "en-US",
      missingTasks: completed ? [] : [taskId],
      riskFlags: [],
      score: completed ? 25 : 0,
      status: completed ? "eligible" : "pending",
      walletAddress: session.address,
      walletSource: session.walletSource,
      walletTypeVerified: true,
    },
    participant: {
      accountType: session.accountType,
      campaignId,
      localePreference: "en-US",
      participantId: completed ? `participant-${campaignId}` : null,
      riskFlags: [],
      totalPoints: completed ? 25 : 0,
      walletAddress: session.address,
      walletSource: session.walletSource,
      walletTypeVerified: true,
    },
    ranking: {
      campaignId,
      participantCount: completed ? 1 : 0,
      rank: completed ? 1 : null,
      source: "repository_projection",
      totalPoints: completed ? 25 : 0,
      walletAddress: session.address,
    },
    repository: {
      adapterId: "campaign-db-adapter",
      createdViaRepository: true,
      repositoryId: "campaign-db-repository-runtime",
      storeId: "campaign-db",
    },
    tasks: [{
      action: completed ? "completed" : "verify",
      blockedReason: null,
      campaignId,
      completionId: completed ? `completion-${campaignId}` : null,
      evidenceId: completed ? `evidence-${campaignId}` : null,
      evidenceSource: completed ? "DAPP_API" : null,
      pointsAvailable: 25,
      pointsAwarded: completed ? 25 : 0,
      required: true,
      status: completed ? "completed" : "not_started",
      taskId,
      templateCode: "APP_SESSION_ROTATION",
      updatedAt: completed ? "2026-07-15T00:00:00.000Z" : null,
      verificationType: "DAPP_API",
      walletCompatibility: "ANY",
    }],
  };
};

const appParticipantJourneyResult = (
  campaignId: string,
  session: NormalizedWalletSession,
  completed = false,
): ParticipantJourneyResult => ({
  httpStatus: 200,
  journey: appParticipantJourney(campaignId, session, completed),
  ok: true,
  source: "durable",
  status: "success",
  traceId: `trace-app-journey-${campaignId}-${completed ? "completed" : "initial"}`,
});

const appParticipantVerifyResult = (
  campaignId: string,
  session: NormalizedWalletSession,
): ParticipantVerifyResult => {
  const taskId = `task-${campaignId}`;

  return {
    httpStatus: 200,
    ok: true,
    source: "durable",
    status: "success",
    traceId: `trace-app-verify-${campaignId}`,
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
      repository: {
        adapterId: "campaign-db-adapter",
        createdViaRepository: true,
        repositoryId: "campaign-db-repository-runtime",
        storeId: "campaign-db",
      },
    },
  };
};

const appParticipantBridge = (
  overrides: Partial<ParticipantJourneyApiBridge> = {},
): ParticipantJourneyApiBridge => ({
  getJourney: vi.fn(async () => appParticipantFailure()),
  listCampaigns: vi.fn<ParticipantJourneyApiBridge["listCampaigns"]>(async () => ({
    campaigns: [],
    httpStatus: 200,
    ok: true,
    source: "durable",
    status: "success",
    traceId: "trace-app-participant-feed",
  })),
  verifyTask: vi.fn(async () => appParticipantFailure()),
  ...overrides,
});

const appAdminFailure = () => ({
  bridgeCode: "BRIDGE_REQUEST_FAILED" as const,
  code: "BRIDGE_REQUEST_FAILED" as const,
  ok: false as const,
  phase: "request" as const,
  reconnectRequired: false,
  retryable: true,
  traceId: "trace-app-admin-failed",
});

const appAdminBridge = (
  overrides: Partial<AdminDurableReviewApiBridge> = {},
): AdminDurableReviewApiBridge => ({
  downloadArtifact: vi.fn(async () => appAdminFailure()),
  generateArtifact: vi.fn(async () => appAdminFailure()),
  getArtifactDetail: vi.fn(async () => appAdminFailure()),
  getReviewDetail: vi.fn(async () => appAdminFailure()),
  listArtifacts: vi.fn(async () => appAdminFailure()),
  listCampaigns: vi.fn(async () => appAdminFailure()),
  listReviews: vi.fn(async () => appAdminFailure()),
  listWinners: vi.fn(async () => appAdminFailure()),
  submitDecision: vi.fn(async () => appAdminFailure()),
  ...overrides,
});

describe("App Owner campaign authority", () => {
  const submitWalletSession = vi.mocked(submitWalletSessionApiPreview);
  const originalApiBaseUrl = import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL;

  beforeEach(() => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    submitWalletSession.mockReset();
  });

  afterEach(() => {
    window.localStorage.clear();
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = originalApiBaseUrl;
  });

  const connectHeaderWallet = async () => {
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Connect Wallet" }));
    const dialog = screen.getByRole("dialog", { name: "Connect Wallet" });

    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Use seeded wallet preview" }));
    });
  };

  it("passes the API-normalized wallet session to Project Console recovery", async () => {
    submitWalletSession.mockResolvedValueOnce(appWalletSessionState(appOwnerSessionA));
    const bridge = appOwnerBridge();

    render(<App ownerCampaignBridge={bridge} />);
    await connectHeaderWallet();

    await waitFor(() => expect(bridge.recoverCampaigns).toHaveBeenCalledTimes(1));
    expect(bridge.recoverCampaigns).toHaveBeenCalledWith(
      "awaken",
      expect.objectContaining({ session: appOwnerSessionA }),
    );
  });

  it("passes the same API-issued wallet session and durable mode to User App", async () => {
    submitWalletSession.mockResolvedValueOnce(appWalletSessionState(appOwnerSessionA));
    const participantBridge = appParticipantBridge();

    render(<App participantJourneyBridge={participantBridge} />);
    await connectHeaderWallet();
    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    await waitFor(() => expect(participantBridge.listCampaigns).toHaveBeenCalledTimes(1));
    expect(participantBridge.listCampaigns).toHaveBeenCalledWith(expect.objectContaining({
      mode: "durable",
      selectedCampaignId: null,
      session: appOwnerSessionA,
      signal: expect.any(AbortSignal),
    }));
  });

  it("passes the same API-issued wallet session to the Admin durable review bridge", async () => {
    submitWalletSession.mockResolvedValueOnce(appWalletSessionState(appOwnerSessionA));
    const adminBridge = appAdminBridge();

    render(<App adminDurableReviewBridge={adminBridge} />);
    await connectHeaderWallet();
    fireEvent.click(screen.getByRole("button", { name: "Admin/Ops" }));

    await waitFor(() => expect(adminBridge.listCampaigns).toHaveBeenCalledTimes(1));
    expect(adminBridge.listCampaigns).toHaveBeenCalledWith(
      expect.objectContaining({
        session: appOwnerSessionA,
        signal: expect.any(AbortSignal),
      }),
      { limit: 100 },
    );
  });

  it("keeps Admin durable review blocked for an invalid issued-session projection", async () => {
    const invalidIssuedSession: NormalizedWalletSession = {
      ...appOwnerSessionA,
      issuer: {
        ...appOwnerSessionA.issuer!,
        referenceId: "invalid-app-admin-session",
        valid: false,
      },
      sessionId: "invalid-app-admin-session",
    };
    submitWalletSession.mockResolvedValueOnce(appWalletSessionState(invalidIssuedSession));
    const adminBridge = appAdminBridge();

    render(<App adminDurableReviewBridge={adminBridge} />);
    await connectHeaderWallet();
    fireEvent.click(screen.getByRole("button", { name: "Admin/Ops" }));

    expect(await screen.findByRole("heading", { name: "Durable Evidence Review" })).toBeInTheDocument();
    expect(screen.getByText("Reconnect required")).toBeInTheDocument();
    expect(adminBridge.listCampaigns).not.toHaveBeenCalled();
  });

  it("replaces the Participant UI owner when the API reissues the same canonical session", async () => {
    submitWalletSession
      .mockResolvedValueOnce(appWalletSessionState(appOwnerSessionA))
      .mockResolvedValueOnce(appWalletSessionState(appOwnerSessionA));
    const listCampaigns = vi.fn<ParticipantJourneyApiBridge["listCampaigns"]>(async () =>
      appParticipantFeed("campaign-session-a", "Session A Campaign"));
    const getJourney = vi.fn<ParticipantJourneyApiBridge["getJourney"]>(async () =>
      appParticipantJourneyResult("campaign-session-a", appOwnerSessionA));
    const verifyTask = vi.fn<ParticipantJourneyApiBridge["verifyTask"]>(async () => ({
      code: "PROVIDER_UNAVAILABLE",
      httpStatus: 503,
      ok: false,
      phase: "request",
      reconnectRequired: false,
      retryable: true,
      source: "durable",
      status: "degraded",
      traceId: "trace-app-stale-same-session",
    }));
    const participantBridge = appParticipantBridge({ getJourney, listCampaigns, verifyTask });

    render(<App participantJourneyBridge={participantBridge} />);
    await connectHeaderWallet();
    fireEvent.click(screen.getByRole("button", { name: "User App" }));
    fireEvent.click(await screen.findByRole("button", {
      name: "Select Session A Campaign (campaign-session-a)",
    }));
    fireEvent.click(await screen.findByRole("button", {
      name: "Verify Task task-campaign-session-a",
    }));
    expect(await screen.findByText("PROVIDER_UNAVAILABLE")).toBeInTheDocument();
    expect(screen.getByText("trace-app-stale-same-session")).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", {
      name: /Manage wallet connection/,
    }));
    const dialog = screen.getByRole("dialog", { name: "Connect Wallet" });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Use seeded wallet preview" }));
    });

    await waitFor(() => expect(listCampaigns).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("PROVIDER_UNAVAILABLE")).not.toBeInTheDocument();
    expect(screen.queryByText("trace-app-stale-same-session")).not.toBeInTheDocument();
    expect(await screen.findByRole("button", {
      name: "Select Session A Campaign (campaign-session-a)",
    })).toBeInTheDocument();
  });

  it("clears session A journey diagnostics before session B feed resolves", async () => {
    let resolveSessionBFeed!: (result: ParticipantCampaignListResult) => void;
    const sessionBFeed = new Promise<ParticipantCampaignListResult>((resolve) => {
      resolveSessionBFeed = resolve;
    });
    submitWalletSession
      .mockResolvedValueOnce(appWalletSessionState(appOwnerSessionA))
      .mockResolvedValueOnce(appWalletSessionState(appOwnerSessionB));
    const listCampaigns = vi.fn<ParticipantJourneyApiBridge["listCampaigns"]>((context) =>
      context.session?.sessionId === appOwnerSessionA.sessionId
        ? Promise.resolve(appParticipantFeed("campaign-session-a", "Session A Campaign"))
        : sessionBFeed);
    const getJourney = vi.fn<ParticipantJourneyApiBridge["getJourney"]>(async () =>
      appParticipantJourneyResult("campaign-session-a", appOwnerSessionA));
    const verifyTask = vi.fn<ParticipantJourneyApiBridge["verifyTask"]>(async () => ({
      code: "AUTH_SESSION_INVALID",
      httpStatus: 401,
      ok: false,
      phase: "auth",
      reconnectRequired: true,
      retryable: false,
      source: "durable",
      status: "blocked",
      traceId: "trace-app-session-a-invalid",
    }));
    const participantBridge = appParticipantBridge({ getJourney, listCampaigns, verifyTask });

    render(<App participantJourneyBridge={participantBridge} />);
    await connectHeaderWallet();
    fireEvent.click(screen.getByRole("button", { name: "User App" }));
    expect(await screen.findByRole("button", {
      name: "Select Session A Campaign (campaign-session-a)",
    })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {
      name: "Select Session A Campaign (campaign-session-a)",
    }));
    fireEvent.click(await screen.findByRole("button", {
      name: "Verify Task task-campaign-session-a",
    }));
    expect(await screen.findByText("AUTH_SESSION_INVALID")).toBeInTheDocument();
    expect(screen.getByText("trace-app-session-a-invalid")).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", {
      name: /Manage wallet connection/,
    }));
    const dialog = screen.getByRole("dialog", { name: "Connect Wallet" });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Use seeded wallet preview" }));
    });

    await waitFor(() => expect(listCampaigns).toHaveBeenCalledTimes(2));
    expect(listCampaigns.mock.calls[1][0].session).toBe(appOwnerSessionB);
    expect(screen.queryByRole("button", {
      name: "Select Session A Campaign (campaign-session-a)",
    })).not.toBeInTheDocument();
    expect(screen.queryByText("AUTH_SESSION_INVALID")).not.toBeInTheDocument();
    expect(screen.queryByText("trace-app-session-a-invalid")).not.toBeInTheDocument();
    expect(screen.getByText("Loading Campaign feed")).toBeInTheDocument();

    await act(async () => {
      resolveSessionBFeed(appParticipantFeed("campaign-session-b", "Session B Campaign"));
      await sessionBFeed;
    });

    expect(await screen.findByRole("button", {
      name: "Select Session B Campaign (campaign-session-b)",
    })).toBeInTheDocument();
  });

  it("aborts and ignores session A read-after-write refresh after session B connects", async () => {
    let resolveSessionARefresh!: (result: ParticipantJourneyResult) => void;
    let resolveSessionBFeed!: (result: ParticipantCampaignListResult) => void;
    const sessionARefresh = new Promise<ParticipantJourneyResult>((resolve) => {
      resolveSessionARefresh = resolve;
    });
    const sessionBFeed = new Promise<ParticipantCampaignListResult>((resolve) => {
      resolveSessionBFeed = resolve;
    });
    submitWalletSession
      .mockResolvedValueOnce(appWalletSessionState(appOwnerSessionA))
      .mockResolvedValueOnce(appWalletSessionState(appOwnerSessionB));
    const listCampaigns = vi.fn<ParticipantJourneyApiBridge["listCampaigns"]>((context) =>
      context.session?.sessionId === appOwnerSessionA.sessionId
        ? Promise.resolve(appParticipantFeed("campaign-session-a", "Session A Campaign"))
        : sessionBFeed);
    const getJourney = vi
      .fn<ParticipantJourneyApiBridge["getJourney"]>()
      .mockResolvedValueOnce(appParticipantJourneyResult("campaign-session-a", appOwnerSessionA))
      .mockImplementationOnce(() => sessionARefresh);
    const verifyTask = vi.fn<ParticipantJourneyApiBridge["verifyTask"]>(async () =>
      appParticipantVerifyResult("campaign-session-a", appOwnerSessionA));
    const participantBridge = appParticipantBridge({ getJourney, listCampaigns, verifyTask });

    render(<App participantJourneyBridge={participantBridge} />);
    await connectHeaderWallet();
    fireEvent.click(screen.getByRole("button", { name: "User App" }));
    fireEvent.click(await screen.findByRole("button", {
      name: "Select Session A Campaign (campaign-session-a)",
    }));
    fireEvent.click(await screen.findByRole("button", {
      name: "Verify Task task-campaign-session-a",
    }));

    await waitFor(() => expect(verifyTask).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getJourney).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", {
      name: "Refreshing journey (task-campaign-session-a)",
    })).toBeDisabled();
    expect(screen.getByText("trace-app-verify-campaign-session-a")).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", {
      name: /Manage wallet connection/,
    }));
    const dialog = screen.getByRole("dialog", { name: "Connect Wallet" });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Use seeded wallet preview" }));
    });

    await waitFor(() => expect(listCampaigns).toHaveBeenCalledTimes(2));
    expect(getJourney.mock.calls[1][0].signal?.aborted).toBe(true);
    expect(screen.queryByText("trace-app-verify-campaign-session-a")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Participant journey" })).not.toBeInTheDocument();
    expect(screen.getByText("Loading Campaign feed")).toBeInTheDocument();

    await act(async () => {
      resolveSessionARefresh(appParticipantJourneyResult(
        "campaign-session-a",
        appOwnerSessionA,
        true,
      ));
      await sessionARefresh;
    });
    expect(screen.queryByText("completion-campaign-session-a")).not.toBeInTheDocument();
    expect(screen.queryByText("campaign-session-a")).not.toBeInTheDocument();

    await act(async () => {
      resolveSessionBFeed(appParticipantFeed("campaign-session-b", "Session B Campaign"));
      await sessionBFeed;
    });
    expect(await screen.findByRole("button", {
      name: "Select Session B Campaign (campaign-session-b)",
    })).toBeInTheDocument();
    expect(screen.queryByText("completion-campaign-session-a")).not.toBeInTheDocument();
  });

  it("keeps protected Participant feed blocked until an issued session is ready", () => {
    const participantBridge = appParticipantBridge();

    render(<App participantJourneyBridge={participantBridge} />);
    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    expect(participantBridge.listCampaigns).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Reconnect wallet" }));
    expect(screen.getByRole("dialog", { name: "Connect Wallet" })).toBeInTheDocument();
  });

  it.each([
    [
      "stale proof",
      (): NormalizedWalletSession => ({
        ...appOwnerSessionA,
        proof: { ...appOwnerSessionA.proof!, status: "stale", trustLevel: "untrusted" },
      }),
    ],
    [
      "internal agent credential",
      (): NormalizedWalletSession => ({
        ...appOwnerSessionA,
        capabilities: ["CONTRACT_VIEW", "INTERNAL_AUTOMATION"],
        proof: {
          ...appOwnerSessionA.proof!,
          proofType: "agent_context",
          trustLevel: "internal_only",
        },
        verificationStatus: "internal_agent",
        walletSource: "AGENT_SKILL",
        walletTypeVerified: false,
      }),
    ],
  ])("does not start the protected Participant feed for %s", async (_name, sessionFactory) => {
    const invalidParticipantSession = sessionFactory();
    submitWalletSession.mockResolvedValueOnce(appWalletSessionState(invalidParticipantSession));
    const participantBridge = appParticipantBridge();

    render(<App participantJourneyBridge={participantBridge} />);
    await connectHeaderWallet();
    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    await waitFor(() => expect(
      screen.getByRole("button", { name: "Reconnect wallet" }),
    ).toBeInTheDocument());
    expect(participantBridge.listCampaigns).not.toHaveBeenCalled();
  });

  it("does not grant Owner workflow authority to an invalid issued-session projection", async () => {
    const invalidIssuedSession: NormalizedWalletSession = {
      ...appOwnerSessionA,
      issuer: {
        ...appOwnerSessionA.issuer!,
        referenceId: "invalid-app-owner-session",
        valid: false,
      },
      sessionId: "invalid-app-owner-session",
    };
    submitWalletSession.mockResolvedValueOnce(appWalletSessionState(invalidIssuedSession));
    const bridge = appOwnerBridge();

    render(<App ownerCampaignBridge={bridge} />);
    await connectHeaderWallet();

    const workflow = await screen.findByRole("region", { name: "Owner campaign workflow" });
    expect(within(workflow).getByText("Wallet session required")).toBeInTheDocument();
    expect(bridge.recoverCampaigns).not.toHaveBeenCalled();
  });

  it("clears session A active Campaign before starting session B recovery", async () => {
    let resolveSessionB!: (result: OwnerCampaignListResult) => void;
    const sessionBRecovery = new Promise<OwnerCampaignListResult>((resolve) => {
      resolveSessionB = resolve;
    });
    submitWalletSession
      .mockResolvedValueOnce(appWalletSessionState(appOwnerSessionA))
      .mockResolvedValueOnce(appWalletSessionState(appOwnerSessionB));
    const recoverCampaigns = vi.fn(
      async (_projectId: string, context: { session: NormalizedWalletSession }) =>
        context.session.sessionId === appOwnerSessionA.sessionId
          ? appOwnerList(["campaign-session-a"])
          : sessionBRecovery,
    );
    const bridge = appOwnerBridge({ recoverCampaigns });

    render(<App ownerCampaignBridge={bridge} />);
    await connectHeaderWallet();

    const workflow = await screen.findByRole("region", { name: "Owner campaign workflow" });
    await waitFor(() => expect(within(workflow).getByText("campaign-session-a")).toBeInTheDocument());

    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", {
      name: /Manage wallet connection/,
    }));
    const dialog = screen.getByRole("dialog", { name: "Connect Wallet" });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Use seeded wallet preview" }));
    });

    await waitFor(() => expect(recoverCampaigns).toHaveBeenCalledTimes(2));
    expect(within(workflow).queryByText("campaign-session-a")).not.toBeInTheDocument();
    expect(within(workflow).getByText("Recovering campaigns")).toBeInTheDocument();

    await act(async () => {
      resolveSessionB(appOwnerList([]));
      await sessionBRecovery;
    });
  });
});

describe("App live Participant wallet authentication", () => {
  const originalApiBaseUrl = import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL;
  const originalLiveWalletAuthEnabled =
    import.meta.env.VITE_CAMPAIGN_OS_LIVE_WALLET_AUTH_ENABLED;
  const originalStageReviewEnabled = import.meta.env.VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED;
  const originalWalletAdaptersJson = import.meta.env.VITE_CAMPAIGN_OS_WALLET_ADAPTERS_JSON;
  const adapterId = "portkey-discover-eoa";
  const walletAddress = ["test", "participant", "wallet", "address"].join("-");
  const nonce = "n".repeat(43);
  const challengeMessage = [
    "aelf Campaign OS Wallet Authentication",
    "Version: campaign-os-wallet-auth/v1",
    "Domain: 127.0.0.1:5193",
    "URI: http://127.0.0.1:5193/",
    "Audience: campaign-os",
    `Wallet Address: ${walletAddress}`,
    `Adapter: ${adapterId}`,
    "Chain ID: AELF",
    "Network: testnet",
    "CA Hash: -",
    `Nonce: ${nonce}`,
    "Issued At: 2026-07-18T01:00:00.000Z",
    "Expires At: 2026-07-18T01:05:00.000Z",
    "Request ID: app-live-wallet-request",
  ].join("\n");
  const challenge: LiveWalletAuthenticationChallenge = {
    adapterId,
    challengeId: "challenge-app-live-wallet",
    chainId: "AELF",
    expiresAt: "2026-07-18T01:05:00.000Z",
    message: challengeMessage,
    network: "testnet",
    version: "campaign-os-wallet-auth/v1",
    walletAddress,
  };
  const liveSession: LiveWalletAuthenticationSession = {
    absoluteExpiresAt: "2026-07-18T09:00:00.000Z",
    accountType: "EOA",
    capabilities: ["PARTICIPATE_CAMPAIGN"],
    chainId: "AELF",
    idleExpiresAt: "2026-07-18T01:30:00.000Z",
    issuedAt: "2026-07-18T01:00:00.000Z",
    network: "testnet",
    roles: ["participant"],
    sessionId: "session-app-live-wallet",
    status: "active",
    walletAddress,
    walletSource: "PORTKEY_EOA_EXTENSION",
  };
  const availability: readonly WalletClientAdapterAvailability[] = [{
    adapterId,
    enabled: true,
    label: "Portkey EOA",
    recommended: true,
    status: "available",
  }];
  const disconnectedFailure = (): LiveWalletAuthenticationFailure => ({
    category: "unauthorized",
    code: "WALLET_AUTH_SESSION_MISSING",
    httpStatus: 401,
    ok: false,
    reconnectRequired: true,
    retryable: false,
    traceId: "trace-app-live-disconnected",
  });

  const createLiveBridge = (
    overrides: Partial<LiveWalletAuthenticationApiBridge> = {},
  ): LiveWalletAuthenticationApiBridge => ({
    clearLocalSession: vi.fn(),
    close: vi.fn(),
    getCurrentSession: vi.fn(async () => disconnectedFailure()),
    issueChallenge: vi.fn<LiveWalletAuthenticationApiBridge["issueChallenge"]>(async () => ({
      challenge,
      httpStatus: 201,
      ok: true,
      status: "challenge_issued",
      traceId: "trace-app-live-challenge",
    })),
    issueSession: vi.fn<LiveWalletAuthenticationApiBridge["issueSession"]>(async () => ({
      httpStatus: 201,
      ok: true,
      session: liveSession,
      status: "authenticated",
      traceId: "trace-app-live-authenticated",
    })),
    logout: vi.fn<LiveWalletAuthenticationApiBridge["logout"]>(async () => ({
      httpStatus: 200,
      localSessionCleared: true,
      ok: true,
      revoked: true,
      status: "logged_out",
      traceId: "trace-app-live-logout",
    })),
    rotateSession: vi.fn<LiveWalletAuthenticationApiBridge["rotateSession"]>(async () => ({
      httpStatus: 200,
      ok: true,
      session: liveSession,
      status: "rotated",
      traceId: "trace-app-live-rotate",
    })),
    ...overrides,
  });

  const createLiveClient = (
    overrides: Partial<WalletClient> = {},
  ): WalletClient => ({
    close: vi.fn(async () => undefined),
    connect: vi.fn<WalletClient["connect"]>(async () => ({
      adapterId,
      chainId: "AELF",
      network: "testnet",
      walletAddressHint: walletAddress,
    })),
    disconnect: vi.fn(async () => undefined),
    listAvailableWallets: vi.fn(async () => availability),
    signMessage: vi.fn(async () => ({
      publicKey: Uint8Array.from({ length: 33 }, (_, index) => index + 1),
      signature: Uint8Array.from({ length: 65 }, (_, index) => index + 1),
    })),
    subscribeAccountAndChain: vi.fn(() => () => undefined),
    ...overrides,
  });

  const createLiveComposition = (
    bridge: LiveWalletAuthenticationApiBridge,
    client: WalletClient,
  ): LiveWalletAppComposition => ({
    bridge,
    client,
    mode: "live_local_stage",
    options: [{
      accountType: "EOA",
      adapterId,
      label: "Portkey EOA",
      recommended: true,
      status: "available",
    }],
    status: "ready",
  });

  beforeEach(() => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "";
    import.meta.env.VITE_CAMPAIGN_OS_LIVE_WALLET_AUTH_ENABLED = "0";
    import.meta.env.VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED = "0";
    import.meta.env.VITE_CAMPAIGN_OS_WALLET_ADAPTERS_JSON = "";
    vi.mocked(submitWalletSessionApiPreview).mockClear();
  });

  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = originalApiBaseUrl;
    import.meta.env.VITE_CAMPAIGN_OS_LIVE_WALLET_AUTH_ENABLED = originalLiveWalletAuthEnabled;
    import.meta.env.VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED = originalStageReviewEnabled;
    import.meta.env.VITE_CAMPAIGN_OS_WALLET_ADAPTERS_JSON = originalWalletAdaptersJson;
  });

  it("composes the default browser wallet and live API bridge from browser-safe config", async () => {
    const composition = createDefaultLiveWalletAppComposition({
      browserGlobal: Object.freeze({
        Portkey: Object.freeze({
          isPortkey: true,
          on: vi.fn(),
          removeListener: vi.fn(),
          request: vi.fn(),
        }),
      }),
      env: {
        VITE_CAMPAIGN_OS_API_BASE_URL: "http://127.0.0.1:5194",
        VITE_CAMPAIGN_OS_LIVE_WALLET_AUTH_ENABLED: "1",
        VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED: "1",
        VITE_CAMPAIGN_OS_WALLET_ADAPTERS_JSON: JSON.stringify([{
          adapterId,
          enabled: true,
          label: "Portkey EOA",
          recommended: true,
        }]),
      },
    });

    expect(composition).toMatchObject({
      mode: "live_local_stage",
      options: [{
        accountType: "EOA",
        adapterId,
        label: "Portkey EOA",
        recommended: true,
        status: "available",
      }],
      status: "ready",
    });
    if (composition?.status === "ready") {
      composition.bridge.close();
      await composition.client.close();
    }
  });

  it("keeps default Vite startup in live unavailable mode when adapter config is invalid", () => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5194";
    import.meta.env.VITE_CAMPAIGN_OS_LIVE_WALLET_AUTH_ENABLED = "1";
    import.meta.env.VITE_CAMPAIGN_OS_STAGE_REVIEW_ENABLED = "1";
    import.meta.env.VITE_CAMPAIGN_OS_WALLET_ADAPTERS_JSON = "invalid-json";

    render(<App />);
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", {
      name: "Connect Wallet",
    }));

    const dialog = screen.getByRole("dialog", { name: "Connect Wallet" });
    expect(within(dialog).getByText("Wallet service unavailable")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Review identity")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", {
      name: "Use seeded wallet preview",
    })).not.toBeInTheDocument();
    expect(submitWalletSessionApiPreview).not.toHaveBeenCalled();
  });

  it("does not close a live composition during the StrictMode effect replay", async () => {
    const bridge = createLiveBridge();
    const client = createLiveClient();
    const view = render(
      <StrictMode>
        <App liveWalletAuthentication={createLiveComposition(bridge, client)} />
      </StrictMode>,
    );

    await waitFor(() => expect(bridge.getCurrentSession).toHaveBeenCalledTimes(2));
    expect(client.close).not.toHaveBeenCalled();
    expect(bridge.close).not.toHaveBeenCalled();

    view.unmount();
    await waitFor(() => expect(client.close).toHaveBeenCalledTimes(1));
    expect(bridge.close).toHaveBeenCalledTimes(1);
  });

  it("restores a durable cookie session into Participant UI without granting Owner or Admin authority", async () => {
    const bridge = createLiveBridge({
      getCurrentSession: vi.fn<LiveWalletAuthenticationApiBridge["getCurrentSession"]>(async () => ({
        httpStatus: 200,
        ok: true,
        session: liveSession,
        status: "restored",
        traceId: "trace-app-live-restored",
      })),
    });
    const client = createLiveClient();
    const participantBridge = appParticipantBridge();
    const ownerBridge = appOwnerBridge();
    const adminBridge = appAdminBridge();

    render(
      <App
        adminDurableReviewBridge={adminBridge}
        liveWalletAuthentication={createLiveComposition(bridge, client)}
        ownerCampaignBridge={ownerBridge}
        participantJourneyBridge={participantBridge}
      />,
    );

    await waitFor(() => expect(bridge.getCurrentSession).toHaveBeenCalledTimes(1));
    expect(within(screen.getByRole("banner")).getByRole("button", {
      name: /Verified EOA/,
    })).toHaveTextContent(/Verified EOA/);

    fireEvent.click(screen.getByRole("button", { name: "User App" }));
    expect((await screen.findAllByText(/Verified EOA/)).length).toBeGreaterThanOrEqual(2);
    await waitFor(() => expect(participantBridge.listCampaigns).toHaveBeenCalledTimes(1));
    expect(participantBridge.listCampaigns).toHaveBeenCalledWith(expect.objectContaining({
      mode: "durable",
      session: null,
    }));
    expect(ownerBridge.recoverCampaigns).not.toHaveBeenCalled();
    expect(adminBridge.listCampaigns).not.toHaveBeenCalled();
    expect(submitWalletSessionApiPreview).not.toHaveBeenCalled();
  });

  it("connects, signs the exact server challenge bytes, and authenticates through the live bridge", async () => {
    const bridge = createLiveBridge();
    const client = createLiveClient();

    render(<App liveWalletAuthentication={createLiveComposition(bridge, client)} />);

    await waitFor(() => expect(bridge.getCurrentSession).toHaveBeenCalledTimes(1));
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", {
      name: "Connect Wallet",
    }));
    const dialog = screen.getByRole("dialog", { name: "Connect Wallet" });
    expect(within(dialog).queryByLabelText("Review identity")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", {
      name: "Use seeded wallet preview",
    })).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Connect Portkey EOA" }));
    });

    await waitFor(() => expect(bridge.issueSession).toHaveBeenCalledTimes(1));
    expect(client.connect).toHaveBeenCalledWith(adapterId, expect.any(AbortSignal));
    expect(bridge.issueChallenge).toHaveBeenCalledWith({
      adapterId,
      chainId: "AELF",
      network: "testnet",
      walletAddress,
    }, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    const signedBytes = vi.mocked(client.signMessage).mock.calls[0]?.[0].exactMessageBytes;
    expect(signedBytes).toEqual(new TextEncoder().encode(challengeMessage));
    expect(bridge.issueSession).toHaveBeenCalledWith(expect.objectContaining({
      challengeId: challenge.challengeId,
      message: challengeMessage,
      nonce,
    }), expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(within(screen.getByRole("banner")).getByRole("button", {
      name: /Verified EOA/,
    })).toBeInTheDocument();
    expect(submitWalletSessionApiPreview).not.toHaveBeenCalled();
  });

  it("invalidates private Participant authority immediately on a wallet account event", async () => {
    let walletListener: ((event: WalletClientEvent) => void) | undefined;
    const bridge = createLiveBridge({
      getCurrentSession: vi.fn<LiveWalletAuthenticationApiBridge["getCurrentSession"]>(async () => ({
        httpStatus: 200,
        ok: true,
        session: liveSession,
        status: "restored",
        traceId: "trace-app-live-restored",
      })),
    });
    const client = createLiveClient({
      subscribeAccountAndChain: vi.fn((listener) => {
        walletListener = listener;
        return () => undefined;
      }),
    });

    render(<App liveWalletAuthentication={createLiveComposition(bridge, client)} />);
    await waitFor(() => expect(bridge.getCurrentSession).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "User App" }));
    expect((await screen.findAllByText(/Verified EOA/)).length).toBeGreaterThanOrEqual(2);

    act(() => walletListener?.({
      type: "account_changed",
      walletAddressHint: ["replacement", "wallet", "address"].join("-"),
    }));

    expect(await screen.findByRole("button", { name: "Reconnect wallet" })).toBeInTheDocument();
    expect(screen.queryByText(walletAddress)).not.toBeInTheDocument();
    expect(screen.getByText("Public Campaign")).toBeInTheDocument();
    expect(bridge.clearLocalSession).toHaveBeenCalledTimes(1);
  });

  it.each([
    [401, "WALLET_AUTH_SESSION_EXPIRED"],
    [403, "WALLET_AUTH_SESSION_REVOKED"],
  ])("clears Header and private Participant authority after an HTTP %i failure", async (
    httpStatus,
    code,
  ) => {
    const bridge = createLiveBridge({
      getCurrentSession: vi.fn<LiveWalletAuthenticationApiBridge["getCurrentSession"]>(async () => ({
        httpStatus: 200,
        ok: true,
        session: liveSession,
        status: "restored",
        traceId: "trace-app-live-restored",
      })),
    });
    const client = createLiveClient();
    const participantBridge = appParticipantBridge({
      listCampaigns: vi.fn<ParticipantJourneyApiBridge["listCampaigns"]>(async () => ({
        code,
        httpStatus,
        ok: false,
        phase: "auth",
        reconnectRequired: true,
        retryable: false,
        source: "durable",
        status: "blocked",
        traceId: `trace-app-live-${httpStatus}`,
      })),
    });

    render(
      <App
        liveWalletAuthentication={createLiveComposition(bridge, client)}
        participantJourneyBridge={participantBridge}
      />,
    );
    await waitFor(() => expect(bridge.getCurrentSession).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "User App" }));

    await waitFor(() => expect(
      screen.getByRole("button", { name: "Reconnect wallet" }),
    ).toBeInTheDocument());
    expect(within(screen.getByRole("banner")).getByRole("button", {
      name: "Connect Wallet",
    })).toBeInTheDocument();
    expect(screen.getByText("Public Campaign")).toBeInTheDocument();
    expect(screen.queryByText(walletAddress)).not.toBeInTheDocument();
    expect(bridge.clearLocalSession).toHaveBeenCalledTimes(1);
  });

  it("binds session rotation and logout to the ready wallet controls", async () => {
    const bridge = createLiveBridge({
      getCurrentSession: vi.fn<LiveWalletAuthenticationApiBridge["getCurrentSession"]>(async () => ({
        httpStatus: 200,
        ok: true,
        session: liveSession,
        status: "restored",
        traceId: "trace-app-live-restored",
      })),
    });
    const client = createLiveClient();

    render(<App liveWalletAuthentication={createLiveComposition(bridge, client)} />);
    await waitFor(() => expect(bridge.getCurrentSession).toHaveBeenCalledTimes(1));
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", {
      name: /Verified EOA/,
    }));
    let dialog = screen.getByRole("dialog", { name: "Connect Wallet" });

    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Refresh session" }));
    });
    await waitFor(() => expect(bridge.rotateSession).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("dialog", {
      name: "Connect Wallet",
    })).not.toBeInTheDocument());
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", {
      name: /Verified EOA/,
    }));
    dialog = screen.getByRole("dialog", { name: "Connect Wallet" });
    expect(within(dialog).getByText("Wallet verified")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Disconnect wallet" }));
    });
    await waitFor(() => expect(bridge.logout).toHaveBeenCalledTimes(1));
    expect(client.disconnect).toHaveBeenCalledTimes(1);
    expect(within(screen.getByRole("banner")).getByRole("button", {
      name: "Connect Wallet",
    })).toBeInTheDocument();
    dialog = screen.getByRole("dialog", { name: "Connect Wallet" });
    expect(within(dialog).getByText("Choose a wallet to continue")).toBeInTheDocument();
  });

  it("ignores a late authenticated session after the wallet epoch changes", async () => {
    let walletListener: ((event: WalletClientEvent) => void) | undefined;
    let resolveSession!: (
      result: Awaited<ReturnType<LiveWalletAuthenticationApiBridge["issueSession"]>>,
    ) => void;
    const pendingSession = new Promise<
      Awaited<ReturnType<LiveWalletAuthenticationApiBridge["issueSession"]>>
    >((resolve) => {
      resolveSession = resolve;
    });
    const issueSession = vi.fn<LiveWalletAuthenticationApiBridge["issueSession"]>(
      async () => pendingSession,
    );
    const bridge = createLiveBridge({ issueSession });
    const client = createLiveClient({
      subscribeAccountAndChain: vi.fn((listener) => {
        walletListener = listener;
        return () => undefined;
      }),
    });

    render(<App liveWalletAuthentication={createLiveComposition(bridge, client)} />);
    await waitFor(() => expect(bridge.getCurrentSession).toHaveBeenCalledTimes(1));
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", {
      name: "Connect Wallet",
    }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Connect Portkey EOA" }));
    });
    await waitFor(() => expect(issueSession).toHaveBeenCalledTimes(1));
    const requestSignal = issueSession.mock.calls[0]?.[1]?.signal;

    act(() => walletListener?.({ type: "disconnected" }));
    expect(requestSignal?.aborted).toBe(true);

    await act(async () => {
      resolveSession({
        httpStatus: 201,
        ok: true,
        session: liveSession,
        status: "authenticated",
        traceId: "trace-app-live-late-session",
      });
      await pendingSession;
    });

    expect(within(screen.getByRole("banner")).getByRole("button", {
      name: "Connect Wallet",
    })).toBeInTheDocument();
    expect(screen.queryByText(walletAddress)).not.toBeInTheDocument();
  });

  it("aborts restore and releases wallet and bridge resources on unmount", async () => {
    let restoreSignal: AbortSignal | undefined;
    let resolveRestore!: (result: ReturnType<typeof disconnectedFailure>) => void;
    const restore = new Promise<ReturnType<typeof disconnectedFailure>>((resolve) => {
      resolveRestore = resolve;
    });
    const bridge = createLiveBridge({
      getCurrentSession: vi.fn((context) => {
        restoreSignal = context?.signal;
        return restore;
      }),
    });
    const unsubscribe = vi.fn();
    const client = createLiveClient({
      subscribeAccountAndChain: vi.fn(() => unsubscribe),
    });
    const view = render(<App liveWalletAuthentication={createLiveComposition(bridge, client)} />);

    await waitFor(() => expect(bridge.getCurrentSession).toHaveBeenCalledTimes(1));
    view.unmount();

    expect(restoreSignal?.aborted).toBe(true);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(client.close).toHaveBeenCalledTimes(1));
    expect(bridge.close).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRestore(disconnectedFailure());
      await restore;
    });
  });
});
