import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WalletSessionApiBridgeState } from "../../api/walletSessionApiBridge";
import { createAelfWebLoginAdapterReadiness, walletOptions, walletSessions } from "../../domain";
import { WalletConnectModal } from "./WalletConnectModal";

describe("WalletConnectModal locale coverage", () => {
  const apiBridgeState = (overrides: Partial<WalletSessionApiBridgeState> = {}): WalletSessionApiBridgeState => ({
    boundary: {
      "en-US":
        "Local wallet session API bridge only. No live wallet SDK connection, real signature prompt, transaction, contract read/write, production auth token, reward custody, or reward distribution is executed.",
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
    session: {
      ...walletSessions[0],
      issuer: {
        artifactType: "local_session_reference",
        cookieIssued: false,
        diagnosticCodes: ["AUTH_ISSUER_LOCAL_ONLY"],
        issuerMode: "local_opaque",
        jwtIssued: false,
        liveSigningExecuted: false,
        referenceId: "session-ref:sess-aa-001",
        ttlSeconds: 1800,
        valid: true,
      },
      productionReadiness: {
        blockedDependencyIds: ["live_wallet_proof_verifier"],
        liveSigningReady: false,
        liveVerifierReady: false,
        productionReady: false,
        productionRequired: true,
        productionSessionStoreReady: false,
        secretManagerReady: false,
        signingKeyReady: false,
      },
      proof: {
        diagnosticCodes: ["AUTH_PROOF_LOCAL_ONLY"],
        liveVerificationExecuted: false,
        proofType: "wallet_signature",
        status: "verified",
        trustLevel: "verified_local",
      },
    },
    source: "api_runtime",
    status: "connected",
    traceId: "trace-wallet-modal",
    ...overrides,
  });

  it("renders Traditional Chinese wallet safety and recovery copy", () => {
    const onClose = vi.fn();

    render(<WalletConnectModal locale="zh-TW" onClose={onClose} options={walletOptions} />);

    const dialog = screen.getByRole("dialog", { name: "連接錢包" });

    const adapterRecommended = within(dialog).getByTestId("wallet-modal-adapter-recommended");
    const adapterEoa = within(dialog).getByTestId("wallet-modal-adapter-eoa");
    const adapterDegraded = within(dialog).getByTestId("wallet-modal-adapter-degraded");
    const adapterInternal = within(dialog).getByTestId("wallet-modal-adapter-internal");
    const connectorBoundary = within(dialog).getByTestId("wallet-modal-live-connector-boundary");

    expect(adapterRecommended).toBeInTheDocument();
    expect(adapterEoa).toBeInTheDocument();
    expect(adapterDegraded).toBeInTheDocument();
    expect(adapterInternal).toBeInTheDocument();
    expect(connectorBoundary).toBeInTheDocument();
    expect(connectorBoundary).toHaveTextContent("Portkey AA live connector");
    expect(connectorBoundary).toHaveTextContent("@aelf-web-login/wallet-adapter-portkey-aa");
    expect(connectorBoundary).toHaveTextContent("Live wallet connector 預設關閉");
    expect(within(adapterRecommended).getByText("Portkey AA")).toBeInTheDocument();
    expect(within(adapterRecommended).queryByText("Agent Skill 錢包")).not.toBeInTheDocument();
    expect(within(adapterEoa).getByText("Portkey EOA App / Discover")).toBeInTheDocument();
    expect(within(adapterDegraded).getByText("未來 EOA adapter")).toBeInTheDocument();
    expect(within(adapterDegraded).getByText(/維護狀態/)).toBeInTheDocument();
    expect(within(adapterInternal).getByText("Agent Skill 錢包")).toBeInTheDocument();
    expect(within(adapterInternal).getByText(/內部自動化/)).toBeInTheDocument();
    expect(within(dialog).getByTestId("wallet-modal-group-recommended")).toBeInTheDocument();
    expect(within(dialog).getByTestId("wallet-modal-group-eoa")).toBeInTheDocument();
    expect(within(dialog).getByTestId("wallet-modal-group-advanced")).toBeInTheDocument();
    expect(within(dialog).getByText("連接即表示你同意僅為驗證簽署訊息。")).toBeInTheDocument();
    expect(within(dialog).getByText("Campaign OS 永遠不會索要你的私鑰。")).toBeInTheDocument();
    expect(within(dialog).getByText("Campaign OS 永遠不會索要私鑰、助記詞、恢復短語或密碼匯出。")).toBeInTheDocument();
    expect(within(dialog).getAllByText("僅 seeded 預覽：不會連接即時錢包 SDK，不會請求真實簽名，不會發起交易，也不會讀寫合約。").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("鏈不匹配：請切換到 AELF mainnet 後再繼續活動驗證。")).toBeInTheDocument();
    expect(within(dialog).getByText("不支援的錢包：請為該 seeded 活動流程選擇 Portkey AA、Portkey EOA App、Portkey EOA Extension 或 NightElf。")).toBeInTheDocument();
    expect(within(dialog).getByText("擴充套件未安裝：請安裝或開啟你的 EOA 錢包擴充套件。")).toBeInTheDocument();
    expect(within(dialog).getByText("缺少簽名：確認提示內容後只簽署 seeded 驗證訊息；此預覽不會請求真實簽名。")).toBeInTheDocument();
    expect(within(dialog).getByText("帳戶類型限制：如果活動只允許 AA 或只允許 EOA，請切換到該活動策略接受的錢包類型。")).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /connectWallet|getSignature|sendTransaction/i })).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "關閉錢包連接彈窗" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps Agent Skill out of normal-user adapter groups", () => {
    render(
      <WalletConnectModal
        adapterReadiness={createAelfWebLoginAdapterReadiness(walletSessions)}
        locale="en-US"
        onClose={vi.fn()}
        options={walletOptions}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Connect Wallet" });
    expect(within(dialog).getByText("Choose how you want to join this campaign.")).toBeInTheDocument();
    expect(
      within(dialog).getByText("By connecting, you agree to sign messages only for verification."),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Campaign OS never asks for your private key.")).toBeInTheDocument();
    const normalUserGroups = [
      within(dialog).getByTestId("wallet-modal-adapter-recommended"),
      within(dialog).getByTestId("wallet-modal-adapter-eoa"),
      within(dialog).getByTestId("wallet-modal-adapter-degraded"),
    ];

    for (const group of normalUserGroups) {
      expect(within(group).queryByText("Agent Skill wallet")).not.toBeInTheDocument();
    }

    expect(within(dialog).getByTestId("wallet-modal-adapter-internal")).toHaveTextContent(
      "Agent Skill wallet",
    );
    expect(within(dialog).getAllByText(/no live wallet SDK connection/).length).toBeGreaterThan(0);
    expect(
      within(dialog).getAllByText(/Live wallet connector execution is disabled by default/).length,
    ).toBeGreaterThan(0);
    const connectorBoundary = within(dialog).getByTestId("wallet-modal-live-connector-boundary");
    expect(connectorBoundary).toHaveTextContent("Connector candidates: 4");
    expect(connectorBoundary).toHaveTextContent("Disabled/review-required: 4");
    expect(connectorBoundary).toHaveTextContent("Portkey Discover EOA live connector");
    expect(connectorBoundary).toHaveTextContent("@aelf-web-login/wallet-adapter-portkey-discover");
    expect(within(dialog).getByText(/Future EOA adapter is maintenance-only/)).toBeInTheDocument();
    expect(within(dialog).getAllByText(/Next action:/).length).toBeGreaterThan(0);
    expect(
      within(dialog).getByText("Extension not installed: Install or open your EOA wallet extension."),
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /connectWallet|getSignature|sendTransaction/i })).not.toBeInTheDocument();
  });

  it("renders Simplified Chinese extension install recovery copy", () => {
    render(<WalletConnectModal locale="zh-CN" onClose={vi.fn()} options={walletOptions} />);

    const dialog = screen.getByRole("dialog", { name: "连接钱包" });

    expect(within(dialog).getByText("连接即表示你同意仅为验证签署消息。")).toBeInTheDocument();
    expect(within(dialog).getByText("Campaign OS 永远不会索要你的私钥。")).toBeInTheDocument();
    expect(within(dialog).getByText("插件未安装：请安装或打开你的 EOA 钱包插件。")).toBeInTheDocument();
    expect(within(dialog).getByText("链不匹配：请切换到 AELF mainnet 后再继续活动验证。")).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /connectWallet|getSignature|sendTransaction/i })).not.toBeInTheDocument();
  });

  it("renders bridge capability through the existing wallet capability rows", () => {
    render(<WalletConnectModal locale="en-US" onClose={vi.fn()} options={walletOptions} />);

    const dialog = screen.getByRole("dialog", { name: "Connect Wallet" });
    const recommendedOptions = within(dialog).getByTestId("wallet-modal-group-recommended");
    const eoaOptions = within(dialog).getByTestId("wallet-modal-group-eoa");

    expect(within(recommendedOptions).getByText(/Capabilities: .*EBRIDGE/)).toBeInTheDocument();
    expect(within(eoaOptions).getAllByText(/Capabilities: .*EBRIDGE/)).toHaveLength(2);
    expect(within(dialog).getByTestId("wallet-modal-group-advanced")).not.toHaveTextContent("EBRIDGE");
  });

  it("renders wallet session API review metadata without live wallet actions", () => {
    render(
      <WalletConnectModal
        locale="en-US"
        onClose={vi.fn()}
        onPreviewConnect={vi.fn()}
        options={walletOptions}
        walletSessionBridgeState={apiBridgeState()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Connect Wallet" });
    const review = within(dialog).getByRole("region", { name: "Wallet session API review" });

    expect(within(review).getAllByText("API runtime").length).toBeGreaterThan(0);
    expect(within(review).getByText("trace-wallet-modal")).toBeInTheDocument();
    expect(within(review).getByText("verified")).toBeInTheDocument();
    expect(within(review).getByText("verified_local")).toBeInTheDocument();
    expect(within(review).getByText("local_opaque")).toBeInTheDocument();
    expect(within(review).getByText("wallet-session:sess-aa-001")).toBeInTheDocument();
    expect(within(review).getAllByText("sess-aa-001").length).toBeGreaterThan(0);
    expect(within(review).getByText(/No live wallet SDK connection/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /connectWallet|getSignature|sendTransaction/i })).not.toBeInTheDocument();
  });

  it("renders wallet session API loading and sanitized diagnostics", () => {
    render(
      <WalletConnectModal
        locale="en-US"
        onClose={vi.fn()}
        onPreviewConnect={vi.fn()}
        options={walletOptions}
        walletSessionBridgeState={apiBridgeState({
          diagnostics: [{
            code: "API_REQUEST_FAILED",
            message: {
              "en-US": "The local wallet session API request failed, so no API-backed wallet session was applied.",
              "zh-CN": "本地 wallet session API 请求失败，因此未应用 API-backed 钱包会话。",
              "zh-TW": "本地 wallet session API 請求失敗，因此未套用 API-backed 錢包會話。",
            },
            safeDetails: { reason: "redacted provider data" },
            severity: "error",
          }],
          loading: true,
          repository: undefined,
          session: undefined,
          source: "error_fallback",
          status: "error",
          traceId: "trace-error",
        })}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Connect Wallet" });
    const review = within(dialog).getByRole("region", { name: "Wallet session API review" });

    expect(within(review).getAllByText("Error fallback").length).toBeGreaterThan(0);
    expect(within(review).getAllByText("Loading wallet session preview").length).toBeGreaterThan(0);
    expect(within(review).getByText(/API_REQUEST_FAILED/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Loading wallet session preview" })).toBeDisabled();
    expect(dialog.textContent?.toLowerCase()).not.toContain("raw signature");
    expect(dialog.textContent?.toLowerCase()).not.toContain("private key in");
  });

  it("renders a controlled stage review identity menu with only the approved identities", () => {
    const onReviewIdentityChange = vi.fn();
    const onPreviewConnect = vi.fn();
    const { rerender } = render(
      <WalletConnectModal
        locale="en-US"
        onClose={vi.fn()}
        onPreviewConnect={onPreviewConnect}
        onReviewIdentityChange={onReviewIdentityChange}
        options={walletOptions}
        selectedReviewIdentity="owner"
        stageReviewMode
      />,
    );

    const identityMenu = screen.getByRole("combobox", { name: "Review identity" });

    expect(identityMenu).toHaveValue("owner");
    expect(within(identityMenu).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Owner",
      "Participant A",
      "Participant B",
      "Admin",
    ]);
    expect(screen.queryByRole("textbox", { name: /fixture|address|role/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("wallet-modal-live-connector-boundary")).not.toBeInTheDocument();
    expect(screen.queryByTestId("wallet-modal-adapter-recommended")).not.toBeInTheDocument();
    expect(screen.queryByTestId("wallet-modal-group-recommended")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Seeded wallet recovery guidance")).not.toBeInTheDocument();

    identityMenu.focus();
    fireEvent.keyDown(identityMenu, { key: "ArrowDown" });
    fireEvent.change(identityMenu, { target: { value: "participant-a" } });

    expect(identityMenu).toHaveFocus();
    expect(onReviewIdentityChange).toHaveBeenCalledWith("participant-a");

    rerender(
      <WalletConnectModal
        locale="en-US"
        onClose={vi.fn()}
        onPreviewConnect={onPreviewConnect}
        onReviewIdentityChange={onReviewIdentityChange}
        options={walletOptions}
        selectedReviewIdentity="participant-a"
        stageReviewMode
      />,
    );

    expect(screen.getByRole("combobox", { name: "Review identity" })).toHaveValue("participant-a");
    fireEvent.click(screen.getByRole("button", { name: "Connect as Participant A" }));
    expect(onPreviewConnect).toHaveBeenCalledWith("participant-a");
  });

  it("moves focus into the dialog, traps keyboard focus, and restores the trigger", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Open wallet modal";
    document.body.append(trigger);
    trigger.focus();

    const { unmount } = render(
      <WalletConnectModal
        locale="en-US"
        onClose={vi.fn()}
        onPreviewConnect={vi.fn()}
        onReviewIdentityChange={vi.fn()}
        options={walletOptions}
        selectedReviewIdentity="participant-a"
        stageReviewMode
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Connect Wallet" });
    const closeButton = within(dialog).getByRole("button", {
      name: "Close wallet connect modal",
    });
    const connectButton = within(dialog).getByRole("button", {
      name: "Connect as Participant A",
    });

    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(connectButton).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab" });
    expect(closeButton).toHaveFocus();

    unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it("defaults unknown stage identities to Owner without exposing arbitrary values", () => {
    const onReviewIdentityChange = vi.fn();

    render(
      <WalletConnectModal
        locale="en-US"
        onClose={vi.fn()}
        onPreviewConnect={vi.fn()}
        onReviewIdentityChange={onReviewIdentityChange}
        options={walletOptions}
        selectedReviewIdentity={"operator" as "owner"}
        stageReviewMode
      />,
    );

    const identityMenu = screen.getByRole("combobox", { name: "Review identity" });

    expect(identityMenu).toHaveValue("owner");
    fireEvent.change(identityMenu, { target: { value: "arbitrary-role" } });
    expect(onReviewIdentityChange).toHaveBeenCalledWith("owner");
  });

  it("keeps the legacy preview action when stage review mode is off and supports Escape", () => {
    const onClose = vi.fn();

    render(
      <WalletConnectModal
        locale="en-US"
        onClose={onClose}
        onPreviewConnect={vi.fn()}
        options={walletOptions}
        stageReviewMode={false}
      />,
    );

    expect(screen.queryByRole("combobox", { name: "Review identity" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use seeded wallet preview" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
