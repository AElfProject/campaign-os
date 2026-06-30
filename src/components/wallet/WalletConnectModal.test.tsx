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

    expect(adapterRecommended).toBeInTheDocument();
    expect(adapterEoa).toBeInTheDocument();
    expect(adapterDegraded).toBeInTheDocument();
    expect(adapterInternal).toBeInTheDocument();
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
    expect(within(dialog).getByText("Campaign OS 永遠不會索要私鑰、助記詞、恢復短語或密碼匯出。")).toBeInTheDocument();
    expect(within(dialog).getAllByText("僅 seeded 預覽：不會連接即時錢包 SDK，不會請求真實簽名，不會發起交易，也不會讀寫合約。").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("鏈不匹配：請切換到 AELF mainnet 後再繼續活動驗證。")).toBeInTheDocument();
    expect(within(dialog).getByText("不支援的錢包：請為該 seeded 活動流程選擇 Portkey AA、Portkey EOA App、Portkey EOA Extension 或 NightElf。")).toBeInTheDocument();
    expect(within(dialog).getByText("缺少簽名：確認提示內容後只簽署 seeded 驗證訊息；此預覽不會請求真實簽名。")).toBeInTheDocument();
    expect(within(dialog).getByText("帳戶類型限制：如果活動只允許 AA 或只允許 EOA，請切換到該活動策略接受的錢包類型。")).toBeInTheDocument();

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
    expect(within(dialog).getByText(/no live wallet SDK connection/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Future EOA adapter is maintenance-only/)).toBeInTheDocument();
    expect(within(dialog).getAllByText(/Next action:/).length).toBeGreaterThan(0);
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
