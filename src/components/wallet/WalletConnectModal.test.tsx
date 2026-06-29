import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { walletOptions } from "../../domain";
import { WalletConnectModal } from "./WalletConnectModal";

describe("WalletConnectModal locale coverage", () => {
  it("renders Traditional Chinese wallet safety and recovery copy", () => {
    const onClose = vi.fn();

    render(<WalletConnectModal locale="zh-TW" onClose={onClose} options={walletOptions} />);

    const dialog = screen.getByRole("dialog", { name: "連接錢包" });

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
});
