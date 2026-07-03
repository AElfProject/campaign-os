import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createAelfWebLoginAdapterReadiness, walletOptions, walletSessions } from "../../domain";
import { WalletConnectModal } from "./WalletConnectModal";

describe("WalletConnectModal locale coverage", () => {
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
});
