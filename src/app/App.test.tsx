import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EXPORT_CSV_COLUMNS } from "../domain";
import {
  browserLocalePromptDismissedStorageKey,
  localePreferenceStorageKey,
} from "../i18n/useLocale";
import { App } from "./App";

describe("Campaign OS app shell", () => {
  const exportColumnContract = EXPORT_CSV_COLUMNS.join(",");
  const defaultDocumentTitle = "aelf Campaign OS";
  const getProductNavigation = () =>
    screen.getByRole("navigation", { name: "Campaign OS product navigation" });
  const getProjectWorkspaceNavigation = () =>
    screen.getByRole("navigation", { name: "Project Console workspace navigation" });

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

  afterEach(() => {
    window.localStorage.clear();
    setNavigatorLanguages(["en-US"]);
    pushRoute("/");
    removeDynamicMetadata();
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
    expect(screen.getByText("2F4...9aB")).toBeInTheDocument();
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

    expect(screen.getByRole("button", { name: "Connect Wallet" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Connect Wallet" }));

    const dialog = screen.getByRole("dialog", { name: "連接錢包" });

    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByText("擴充套件未安裝：請安裝或開啟你的 EOA 錢包擴充套件。"),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByText("Extension not installed: Install or open your EOA wallet extension."),
    ).not.toBeInTheDocument();
  });

  it("falls back safely for unsupported URL locales", () => {
    pushRoute("/ja-JP/campaigns/awaken-sprint");

    render(<App />);

    expect(screen.getByRole("heading", { name: "Campaign operations shell" })).toBeInTheDocument();
    expect(screen.getByLabelText("Language")).toHaveValue("en-US");
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

    fireEvent.click(screen.getByRole("button", { name: "Connect Wallet" }));

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
