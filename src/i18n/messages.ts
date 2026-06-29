import type { SupportedLocale } from "../domain";

export const messages: Record<SupportedLocale, Record<string, string>> = {
  "en-US": {
    "app.brand": "aelf Campaign OS",
    "surface.projectConsole": "Project Console",
    "surface.userApp": "User App",
    "surface.adminOps": "Admin/Ops",
    "action.connectWallet": "Connect Wallet",
    "action.exportWinners": "Export winners",
    "wallet.choose": "Choose how you want to join this campaign.",
    "wallet.recommended": "Recommended for new users",
    "wallet.privateKeyWarning": "Campaign OS never asks for your private key.",
    "locale.english": "English",
    "locale.chinese": "Simplified Chinese",
    "locale.traditionalChinese": "Traditional Chinese",
    "status.fallback": "This locale falls back to English until reviewed.",
    "contract.offChain": "No contract migration required for MVP.",
    "export.disclaimer": "Export winners does not distribute rewards.",
  },
  "zh-CN": {
    "app.brand": "aelf Campaign OS",
    "surface.projectConsole": "项目控制台",
    "surface.userApp": "用户应用",
    "surface.adminOps": "管理员/Ops",
    "action.connectWallet": "连接钱包",
    "action.exportWinners": "导出 winners",
    "wallet.choose": "选择参与本活动的钱包方式。",
    "wallet.recommended": "推荐新用户使用",
    "wallet.privateKeyWarning": "Campaign OS 永远不会索要私钥。",
    "locale.english": "英语",
    "locale.chinese": "简体中文",
    "locale.traditionalChinese": "繁体中文",
    "status.fallback": "该语言在审核前回退展示英文。",
    "contract.offChain": "MVP 不需要合约迁移。",
    "export.disclaimer": "导出 winners 不等于发奖。",
  },
  "zh-TW": {
    "app.brand": "aelf Campaign OS",
    "surface.projectConsole": "專案控制台",
    "surface.userApp": "使用者應用",
    "surface.adminOps": "管理員/Ops",
    "action.connectWallet": "連接錢包",
    "action.exportWinners": "匯出 winners",
    "wallet.choose": "選擇參與本活動的錢包方式。",
    "wallet.recommended": "推薦新使用者使用",
    "wallet.privateKeyWarning": "Campaign OS 永遠不會索要私鑰。",
    "locale.english": "英文",
    "locale.chinese": "簡體中文",
    "locale.traditionalChinese": "繁體中文",
    "status.fallback": "此語言在審核前會回退顯示英文。",
    "contract.offChain": "MVP 不需要合約遷移。",
    "export.disclaimer": "匯出 winners 不等於發獎。",
  },
};

export type MessageKey = keyof (typeof messages)["en-US"];

export const translate = (locale: SupportedLocale, key: MessageKey) =>
  messages[locale][key] ?? messages["en-US"][key] ?? key;
