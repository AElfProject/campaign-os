import { describe, expect, it } from "vitest";
import { translate } from "./messages";

describe("i18n messages", () => {
  it("provides English and Chinese UI copy", () => {
    expect(translate("en-US", "action.connectWallet")).toBe("Connect Wallet");
    expect(translate("zh-CN", "action.connectWallet")).toBe("连接钱包");
  });

  it("keeps export responsibility explicit in both locales", () => {
    expect(translate("en-US", "export.disclaimer")).toContain("does not distribute rewards");
    expect(translate("zh-CN", "export.disclaimer")).toContain("不等于发奖");
  });
});
