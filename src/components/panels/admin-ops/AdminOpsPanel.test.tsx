import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../../app/App";
import { campaignDetail, EXPORT_CSV_COLUMNS } from "../../../domain";
import { AdminOpsPanel } from "./AdminOpsPanel";

const exportColumnContract = EXPORT_CSV_COLUMNS.join(",");

const expectVisibleText = (text: string | RegExp) => {
  expect(screen.getAllByText(text).length).toBeGreaterThan(0);
};

describe("Admin/Ops shell", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("renders review gates, contract boundaries, and export preview", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Admin/Ops" }));

    expect(screen.getByRole("heading", { name: "Review queue" })).toBeInTheDocument();
    expectVisibleText("Chinese copy needs human review");
    expectVisibleText("Off-chain MVP: no contract migration required");
    const lifecycleReview = screen.getByLabelText("Lifecycle operation review");
    expect(
      within(lifecycleReview).getByRole("heading", { name: "Lifecycle operation review" }),
    ).toBeInTheDocument();
    expect(within(lifecycleReview).getByText("Path-level pause, resume, end, export, and archive review before any future production execution.")).toBeInTheDocument();
    expect(within(lifecycleReview).getByText("Generate AI draft")).toBeInTheDocument();
    expect(within(lifecycleReview).getByText("Submit for human review")).toBeInTheDocument();
    expect(within(lifecycleReview).getByText("Pause campaign")).toBeInTheDocument();
    expect(within(lifecycleReview).getByText("Resume campaign")).toBeInTheDocument();
    expect(within(lifecycleReview).getByText("End campaign")).toBeInTheDocument();
    expect(within(lifecycleReview).getByText("Mark export readiness")).toBeInTheDocument();
    expect(within(lifecycleReview).getByText("Archive campaign")).toBeInTheDocument();
    expect(within(lifecycleReview).getAllByText("Gate group").length).toBeGreaterThan(0);
    expect(within(lifecycleReview).getAllByText("Affected outcomes").length).toBeGreaterThan(0);
    expect(within(lifecycleReview).getAllByText("Blocking checks").length).toBeGreaterThan(0);
    expect(within(lifecycleReview).getByText(/no live mutation/)).toBeInTheDocument();
    expect(within(lifecycleReview).getByText(/no scheduler action/)).toBeInTheDocument();
    expect(within(lifecycleReview).getByText(/no contract write/)).toBeInTheDocument();
    expect(within(lifecycleReview).getByText(/no export file generation/)).toBeInTheDocument();
    expect(within(lifecycleReview).getByText(/no reward distribution/)).toBeInTheDocument();
    const launchBundleReview = screen.getByLabelText("Launch Console bundle review");
    expect(
      within(launchBundleReview).getByRole("heading", { name: "Launch Console bundle review" }),
    ).toBeInTheDocument();
    expect(within(launchBundleReview).getByText("Launch-blocking gates")).toBeInTheDocument();
    expect(within(launchBundleReview).getAllByText("Handoff readiness").length).toBeGreaterThan(0);
    expect(within(launchBundleReview).getAllByText("Pre-launch bundle").length).toBeGreaterThan(0);
    expect(within(launchBundleReview).getAllByText("Launch bundle").length).toBeGreaterThan(0);
    expect(within(launchBundleReview).getAllByText("Post-launch bundle").length).toBeGreaterThan(0);
    expect(within(launchBundleReview).getByText("Social API verification")).toBeInTheDocument();
    expect(within(launchBundleReview).getByText(/Seeded\/local provider evidence registry only/)).toBeInTheDocument();
    expect(within(launchBundleReview).getByText("Create campaign draft")).toBeInTheDocument();
    expect(within(launchBundleReview).getByText("verify_task")).toBeInTheDocument();
    expect(within(launchBundleReview).getAllByText("Review required").length).toBeGreaterThan(0);
    expect(within(launchBundleReview).getAllByText("Local only").length).toBeGreaterThan(0);
    expect(within(launchBundleReview).getAllByText("Launch blocking").length).toBeGreaterThan(0);
    expect(within(launchBundleReview).getAllByText(/No live Launch Console/).length).toBeGreaterThan(0);
    expect(within(launchBundleReview).getAllByText(/no external API/i).length).toBeGreaterThan(0);
    expect(within(launchBundleReview).getAllByText(/no wallet signing/i).length).toBeGreaterThan(0);
    expect(within(launchBundleReview).getAllByText(/no contract write/i).length).toBeGreaterThan(0);
    expect(within(launchBundleReview).getAllByText(/no export file/i).length).toBeGreaterThan(0);
    expect(within(launchBundleReview).getAllByText(/no reward distribution/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Delivery Checklist Readiness" })).toBeInTheDocument();
    expectVisibleText("v0.2 delivery audit");
    expectVisibleText("Product Checklist");
    expectVisibleText("Architecture Checklist");
    expectVisibleText("UI Checklist");
    expectVisibleText("Contract Checklist");
    expectVisibleText("QA Checklist");
    expectVisibleText("Covered");
    expectVisibleText("Needs review");
    expectVisibleText("Deferred");
    expectVisibleText("AA + EOA wallet support");
    expectVisibleText("Wallet modal has Recommended, EOA, and Advanced sections");
    expectVisibleText("Normalized wallet session schema");
    expectVisibleText("Reward disclaimer per locale");
    expectVisibleText("MVP locale coverage");
    expectVisibleText(/Traditional Chinese/);
    expectVisibleText(/P1 locale/);
    expect(screen.getByRole("heading", { name: "P1 locale expansion readiness" })).toBeInTheDocument();
    expectVisibleText(/Runtime support remains limited to en-US, zh-CN, and zh-TW/);
    expectVisibleText("6 Deferred");
    for (const localeCode of ["ko-KR", "ja-JP", "vi-VN", "id-ID", "tr-TR", "es-ES"]) {
      expectVisibleText(localeCode);
    }
    expectVisibleText("Korean");
    expectVisibleText(/Create reviewed campaign content source for ko-KR/);
    expectVisibleText(/Open a dedicated ja-JP activation mission/);
    expectVisibleText("Contract impact review before publish");
    expectVisibleText("Portkey AA connect tested");
    expectVisibleText("Wrong chain error tested");
    expectVisibleText("Export CSV columns tested");
    expectVisibleText("Contract claim mode requires admin approval");
    expectVisibleText("Reward custody excluded from MVP");
    expectVisibleText(/This console does not execute live wallet SDK/);
    expectVisibleText(/No live wallet SDK, API call, contract transaction, export file/);
    expect(screen.getByRole("heading", { name: "Wallet Provider QA Readiness" })).toBeInTheDocument();
    expectVisibleText("Live provider evidence gate");
    expectVisibleText("Total scenarios");
    expectVisibleText("Seeded ready");
    expectVisibleText("Live evidence ready");
    expectVisibleText("Missing live evidence");
    expectVisibleText("Release blockers");
    expectVisibleText("Portkey AA connect");
    expectVisibleText("EOA extension connect");
    expectVisibleText("Wrong-chain recovery");
    expectVisibleText("Unsupported wallet recovery");
    expect(screen.getAllByText("Seeded evidence").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Live evidence").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Release impact").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Missing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Needs review").length).toBeGreaterThan(0);
    expectVisibleText(/Live Portkey AA provider evidence is not attached yet/);
    expectVisibleText(/Live wrong-chain recovery evidence is not attached yet/);
    expectVisibleText(/no live wallet SDK connection/);
    expectVisibleText(/real signature/);
    expectVisibleText(/transaction/);
    expectVisibleText(/contract call/);
    expectVisibleText(/reward distribution/);
    const walletAdapterReadiness = screen
      .getByRole("heading", { name: "aelf-web-login adapter readiness" })
      .closest("section");
    expect(walletAdapterReadiness).not.toBeNull();
    expect(within(walletAdapterReadiness as HTMLElement).getByText("Configured adapters")).toBeInTheDocument();
    expect(within(walletAdapterReadiness as HTMLElement).getByText("Enabled preview")).toBeInTheDocument();
    expect(within(walletAdapterReadiness as HTMLElement).getByText("Maintenance")).toBeInTheDocument();
    expect(within(walletAdapterReadiness as HTMLElement).getByText("Internal only")).toBeInTheDocument();
    expect(within(walletAdapterReadiness as HTMLElement).getAllByText("Feature gate").length).toBeGreaterThan(0);
    expect(within(walletAdapterReadiness as HTMLElement).getAllByText("Fallback").length).toBeGreaterThan(0);
    expect(within(walletAdapterReadiness as HTMLElement).getByText(/wallet\.adapters\.portkeyAa\.enabled/)).toBeInTheDocument();
    expect(within(walletAdapterReadiness as HTMLElement).getByText(/wallet\.adapters\.agentSkill\.internalOnly/)).toBeInTheDocument();
    expect(within(walletAdapterReadiness as HTMLElement).getByText("Agent Skill wallet")).toBeInTheDocument();
    expect(within(walletAdapterReadiness as HTMLElement).getByText(/internal automation/)).toBeInTheDocument();
    expect(within(walletAdapterReadiness as HTMLElement).getByText(/private key, seed phrase/)).toBeInTheDocument();
    expect(within(walletAdapterReadiness as HTMLElement).getByText(/Future EOA adapter is maintenance-only/)).toBeInTheDocument();
    const liveConnectorReleaseReview = screen
      .getByRole("heading", { name: "Live wallet connector release review" })
      .closest("section");
    expect(liveConnectorReleaseReview).not.toBeNull();
    expect(within(liveConnectorReleaseReview as HTMLElement).getByText("Connector candidates")).toBeInTheDocument();
    expect(within(liveConnectorReleaseReview as HTMLElement).getByText("Disabled / review-required")).toBeInTheDocument();
    expect(within(liveConnectorReleaseReview as HTMLElement).getByText("No production enablement")).toBeInTheDocument();
    expect(within(liveConnectorReleaseReview as HTMLElement).getByText("Portkey AA live connector")).toBeInTheDocument();
    expect(within(liveConnectorReleaseReview as HTMLElement).getByText("Portkey Discover EOA live connector")).toBeInTheDocument();
    expect(within(liveConnectorReleaseReview as HTMLElement).getByText("@aelf-web-login/wallet-adapter-portkey-aa")).toBeInTheDocument();
    expect(within(liveConnectorReleaseReview as HTMLElement).getAllByText(/candidate:0\.4\.0-alpha\.21/).length).toBeGreaterThan(0);
    expect(within(liveConnectorReleaseReview as HTMLElement).getAllByText("Dependency risk").length).toBeGreaterThan(0);
    expect(within(liveConnectorReleaseReview as HTMLElement).getAllByText("high").length).toBeGreaterThan(0);
    expect(within(liveConnectorReleaseReview as HTMLElement).getByText("Live QA required")).toBeInTheDocument();
    expect(within(liveConnectorReleaseReview as HTMLElement).getAllByText("Review approval required").length).toBeGreaterThan(0);
    expect(within(liveConnectorReleaseReview as HTMLElement).getAllByText(/no live wallet SDK connection/).length).toBeGreaterThan(0);
    expect(within(liveConnectorReleaseReview as HTMLElement).getAllByText(/signature prompt/).length).toBeGreaterThan(0);
    expect(within(liveConnectorReleaseReview as HTMLElement).getAllByText(/transaction/).length).toBeGreaterThan(0);
    expect(within(liveConnectorReleaseReview as HTMLElement).getAllByText(/contract call/).length).toBeGreaterThan(0);
    expect(within(liveConnectorReleaseReview as HTMLElement).getAllByText(/reward custody/).length).toBeGreaterThan(0);
    expect(within(liveConnectorReleaseReview as HTMLElement).getAllByText(/reward distribution/).length).toBeGreaterThan(0);
    expect(within(liveConnectorReleaseReview as HTMLElement).getAllByText(/export generation/).length).toBeGreaterThan(0);
    expect(within(liveConnectorReleaseReview as HTMLElement).getByText("Blocked operations")).toBeInTheDocument();
    expect(within(liveConnectorReleaseReview as HTMLElement).getByText("connectWallet")).toBeInTheDocument();
    expect(within(liveConnectorReleaseReview as HTMLElement).getByText("getSignature")).toBeInTheDocument();
    expect(within(liveConnectorReleaseReview as HTMLElement).getByText("sendTransaction")).toBeInTheDocument();
    expect(within(liveConnectorReleaseReview as HTMLElement).queryByText(/production-ready/i)).not.toBeInTheDocument();
    expect(within(liveConnectorReleaseReview as HTMLElement).queryByText(/live connector execution is enabled/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Provider evidence registry" })).toBeInTheDocument();
    const providerRegistry = screen
      .getByRole("heading", { name: "Provider evidence registry" })
      .closest("section");
    expect(providerRegistry).not.toBeNull();
    expect(within(providerRegistry as HTMLElement).getAllByText("Live evidence missing").length).toBeGreaterThan(0);
    expect(within(providerRegistry as HTMLElement).getAllByText("Adapter readiness").length).toBeGreaterThan(0);
    expect(within(providerRegistry as HTMLElement).getAllByText("Feature gate").length).toBeGreaterThan(0);
    expect(within(providerRegistry as HTMLElement).getAllByText("Fallback").length).toBeGreaterThan(0);
    expect(within(providerRegistry as HTMLElement).getAllByText("Affected outcomes").length).toBeGreaterThan(0);
    expect(within(providerRegistry as HTMLElement).getByText("Social API verification")).toBeInTheDocument();
    expect(within(providerRegistry as HTMLElement).getAllByText("blocked").length).toBeGreaterThan(0);
    expect(within(providerRegistry as HTMLElement).getByText("AeFinder on-chain verification")).toBeInTheDocument();
    expect(within(providerRegistry as HTMLElement).getAllByText("unavailable").length).toBeGreaterThan(0);
    expect(within(providerRegistry as HTMLElement).getByText("Manual review")).toBeInTheDocument();
    expect(within(providerRegistry as HTMLElement).getAllByText("review required").length).toBeGreaterThan(0);
    expect(within(providerRegistry as HTMLElement).getByText("Wallet provider QA")).toBeInTheDocument();
    expect(within(providerRegistry as HTMLElement).getAllByText("local only").length).toBeGreaterThan(0);
    expect(within(providerRegistry as HTMLElement).getAllByText(/providers\..+\.enabled/).length).toBeGreaterThan(0);
    expect(within(providerRegistry as HTMLElement).getAllByText(/Attach live provider QA evidence/).length).toBeGreaterThan(0);
    expect(within(providerRegistry as HTMLElement).getByText(/No live API, wallet SDK, provider credential/)).toBeInTheDocument();
    const serviceGovernance = screen.getByLabelText("Service Registry Governance");
    expect(
      within(serviceGovernance).getByRole("heading", { name: "Service Registry Governance" }),
    ).toBeInTheDocument();
    expect(within(serviceGovernance).getAllByText("Service summary").length).toBeGreaterThan(0);
    expect(within(serviceGovernance).getAllByText("15").length).toBeGreaterThan(0);
    expect(within(serviceGovernance).getAllByText("Enabled preview").length).toBeGreaterThan(0);
    expect(within(serviceGovernance).getAllByText("Maintenance").length).toBeGreaterThan(0);
    expect(within(serviceGovernance).getAllByText("Review required").length).toBeGreaterThan(0);
    expect(within(serviceGovernance).getAllByText("Offline").length).toBeGreaterThan(0);
    expect(within(serviceGovernance).getAllByText("Release blockers").length).toBeGreaterThan(0);
    expect(within(serviceGovernance).getAllByText("High-impact blockers").length).toBeGreaterThan(0);
    expect(within(serviceGovernance).getByText("Grouped services")).toBeInTheDocument();
    expect(within(serviceGovernance).getAllByText("Wallet signing").length).toBeGreaterThan(0);
    expect(within(serviceGovernance).getAllByText("Contract root writer").length).toBeGreaterThan(0);
    expect(within(serviceGovernance).getByText(/No-live boundary:/)).toBeInTheDocument();
    expect(within(serviceGovernance).getAllByText(/No live SDK/).length).toBeGreaterThan(0);
    expect(within(serviceGovernance).getAllByText(/Fallback:/).length).toBeGreaterThan(0);
    expectVisibleText("Admin Contract Review Center");
    expectVisibleText("V2 companion needed");
    expect(screen.getByText("No for MVP; recommended for P1 transparency.")).toBeInTheDocument();
    expectVisibleText("Metadata hash");
    expect(screen.getByText("Optional for MVP; planned for CampaignRegistryV2 metadata URI/hash.")).toBeInTheDocument();
    expectVisibleText("Verifier role");
    expect(screen.getByText("Backend verifier only; no contract write authority in MVP.")).toBeInTheDocument();
    expectVisibleText("Reward custody");
    expect(screen.getByText("Project-owned; None in Campaign OS.")).toBeInTheDocument();
    expectVisibleText("High-impact checklist");
    expectVisibleText("Contract claim gate");
    expectVisibleText("Blocked until high-impact manual review");
    expectVisibleText("Do not enable claim mode in the MVP shell.");
    expectVisibleText("Contract evolution");
    expectVisibleText("CampaignRegistryV2 metadata hash");
    expectVisibleText("Points and referral roots");
    expectVisibleText("Optional contract claim");
    expectVisibleText(/No live contract transaction/);
    expectVisibleText(/no reward custody/);
    expectVisibleText("Contract Interface Matrix Console");
    expectVisibleText("Companion contracts");
    expectVisibleText("Contract methods");
    expectVisibleText("Change matrix");
    expectVisibleText("Current MVP");
    expectVisibleText("Recommended V2");
    expectVisibleText("Priority / phase");
    expectVisibleText(/No ABI generation/);
    expectVisibleText(/No live contract transaction/);
    expectVisibleText(/No reward custody \/ no reward distribution/);
    expectVisibleText("CampaignRegistryV2");
    expectVisibleText("CampaignPointsLedgerV2");
    expectVisibleText("ReferralRegistryV2");
    expectVisibleText("EligibilityRootRegistryV2");
    expectVisibleText("CreateCampaign");
    expectVisibleText("CommitPointsBatch");
    expectVisibleText("BindReferral");
    expectVisibleText("SetEligibilityRoot");
    expectVisibleText("VerifyEligibilityProof");
    expectVisibleText("Rewards");
    expectVisibleText("Multilingual content");
    expectVisibleText("Wallet type");
    expectVisibleText("Risk flags");
    expectVisibleText(/Campaign OS does not custody or distribute rewards/);
    const contractTransparencyMonitor = screen.getByLabelText("Contract Transparency Monitor");
    expect(
      within(contractTransparencyMonitor).getByRole("heading", { name: "Contract Transparency Monitor" }),
    ).toBeInTheDocument();
    expect(within(contractTransparencyMonitor).getAllByText("Total lanes").length).toBeGreaterThan(0);
    expect(within(contractTransparencyMonitor).getByText("Closeout context")).toBeInTheDocument();
    expect(within(contractTransparencyMonitor).getByText("Transparency lanes")).toBeInTheDocument();
    expect(within(contractTransparencyMonitor).getByText("Off-chain MVP")).toBeInTheDocument();
    expect(within(contractTransparencyMonitor).getByText("Export root readiness")).toBeInTheDocument();
    expect(within(contractTransparencyMonitor).getByText("Points batch root")).toBeInTheDocument();
    expect(within(contractTransparencyMonitor).getByText("Referral binding root")).toBeInTheDocument();
    expect(within(contractTransparencyMonitor).getByText("Eligibility root")).toBeInTheDocument();
    expect(within(contractTransparencyMonitor).getByText("Verifier role")).toBeInTheDocument();
    expect(within(contractTransparencyMonitor).getByText("Reward custody / claim")).toBeInTheDocument();
    expect(within(contractTransparencyMonitor).getAllByText(/Next action:/).length).toBeGreaterThan(0);
    expect(within(contractTransparencyMonitor).getAllByText(/Contract Interface Matrix Console/).length).toBeGreaterThan(0);
    expect(within(contractTransparencyMonitor).getByText(/Reward custody and contract claim execution are blocked/)).toBeInTheDocument();
    expect(within(contractTransparencyMonitor).getAllByText(/No live contract transaction/).length).toBeGreaterThan(0);
    expect(within(contractTransparencyMonitor).getAllByText(/root generation/).length).toBeGreaterThan(0);
    expect(within(contractTransparencyMonitor).getAllByText(/reward custody/).length).toBeGreaterThan(0);
    expect(within(contractTransparencyMonitor).queryByText(/https?:\/\//i)).not.toBeInTheDocument();
    expect(within(contractTransparencyMonitor).queryByText(/Download ready/i)).not.toBeInTheDocument();
    expectVisibleText("Chinese AI draft/fallback");
    expectVisibleText("No auto-publish: human review is required before Chinese draft can ship.");
    expect(screen.getByRole("heading", { name: "Template Governance" })).toBeInTheDocument();
    expectVisibleText("Template Manager");
    expectVisibleText("12 templates");
    expectVisibleText("Localization review");
    expectVisibleText("Risk review");
    expectVisibleText(/No live template registry/);
    expectVisibleText("Bridge with eBridge");
    expectVisibleText("Share campaign post");
    expectVisibleText("EOA only");
    expect(screen.getByRole("heading", { name: "AI Content Pack Workbench" })).toBeInTheDocument();
    expectVisibleText("7 artifacts");
    expectVisibleText("No auto-publish boundary");
    expectVisibleText("X / Twitter thread");
    expectVisibleText("Telegram announcement");
    expectVisibleText("Discord message");
    expectVisibleText("FAQ");
    expectVisibleText("Tutorial");
    expectVisibleText("Daily report");
    expectVisibleText("Winner report");
    expectVisibleText("Publish blocked");
    expectVisibleText("Copy ready");
    expectVisibleText("Reward responsibility");
    expectVisibleText("Winner rules");
    expectVisibleText("Localization readiness");
    expectVisibleText("Reviewer: legal_ops");
    expectVisibleText("Reviewer: community_ops");
    const telegramCard = screen.getByText("Telegram announcement").closest("article");
    expect(telegramCard).not.toBeNull();
    expect(within(telegramCard as HTMLElement).getAllByText("Human review required").length).toBeGreaterThan(0);
    expectVisibleText(/No live AI provider/);
    expectVisibleText("CONTRACT CLAIM");
    expectVisibleText("Contract claim is blocked pending high-impact manual review.");
    expectVisibleText("Analytics overview");
    const advancedAnalyticsReview = screen.getByLabelText("Advanced analytics review");
    expect(
      within(advancedAnalyticsReview).getByRole("heading", { name: "Advanced analytics review" }),
    ).toBeInTheDocument();
    expect(within(advancedAnalyticsReview).getByText("Premium report readiness")).toBeInTheDocument();
    expect(within(advancedAnalyticsReview).getByText("Day 7 retention")).toBeInTheDocument();
    expect(within(advancedAnalyticsReview).getByText("Day 30 retention")).toBeInTheDocument();
    expect(within(advancedAnalyticsReview).getByText("Evidence gap")).toBeInTheDocument();
    expect(within(advancedAnalyticsReview).getAllByText("Owner role").length).toBeGreaterThan(0);
    for (const report of [
      "Cohort report",
      "Retention report",
      "Real user quality",
      "Conversion report",
      "Risk report",
    ]) {
      expect(within(advancedAnalyticsReview).getAllByText(report).length).toBeGreaterThan(0);
    }
    for (const cohort of ["New AA users", "EOA power users", "Referral-driven users"]) {
      expect(within(advancedAnalyticsReview).getByText(cohort)).toBeInTheDocument();
    }
    for (const product of ["eBridge", "Awaken", "Forest", "TMRWDAO"]) {
      expect(within(advancedAnalyticsReview).getByText(product)).toBeInTheDocument();
    }
    expect(within(advancedAnalyticsReview).getAllByText(/No live analytics SDK/).length).toBeGreaterThan(0);
    expect(within(advancedAnalyticsReview).getAllByText(/event warehouse/).length).toBeGreaterThan(0);
    expect(within(advancedAnalyticsReview).getAllByText(/billing/).length).toBeGreaterThan(0);
    expect(within(advancedAnalyticsReview).getAllByText(/automatic enforcement/).length).toBeGreaterThan(0);
    expectVisibleText("Verified actions");
    expectVisibleText("Conversion funnel");
    expectVisibleText("Wallet connect");
    expectVisibleText("Wallet split");
    expectVisibleText("Locale split");
    expectVisibleText("Risk dashboard");
    expect(screen.getByRole("heading", { name: "Risk Intelligence" })).toBeInTheDocument();
    const riskIntelligenceSection = screen
      .getByRole("heading", { name: "Risk Intelligence" })
      .closest("section");
    expect(riskIntelligenceSection).not.toBeNull();
    expect(within(riskIntelligenceSection as HTMLElement).getAllByText("Anti-sybil review surface").length).toBeGreaterThan(0);
    expect(within(riskIntelligenceSection as HTMLElement).getByText("Wallet age review")).toBeInTheDocument();
    expect(within(riskIntelligenceSection as HTMLElement).getByText("Funding source clustering")).toBeInTheDocument();
    expect(within(riskIntelligenceSection as HTMLElement).getByText("Referral tree concentration")).toBeInTheDocument();
    expect(within(riskIntelligenceSection as HTMLElement).getByText("Device/session similarity")).toBeInTheDocument();
    expect(within(riskIntelligenceSection as HTMLElement).getByText("Task pattern similarity")).toBeInTheDocument();
    expect(within(riskIntelligenceSection as HTMLElement).getByText("Minimum meaningful action")).toBeInTheDocument();
    expect(within(riskIntelligenceSection as HTMLElement).getByText("Manual review queue")).toBeInTheDocument();
    expect(
      within(riskIntelligenceSection as HTMLElement).getByText(
        "Risk flags are review inputs and do not automatically ban, exclude, export, or distribute rewards.",
      ),
    ).toBeInTheDocument();
    expect(within(riskIntelligenceSection as HTMLElement).getAllByText("Evidence coverage").length).toBeGreaterThan(0);
    expect(within(riskIntelligenceSection as HTMLElement).getAllByText("Export impact").length).toBeGreaterThan(0);
    expect(within(riskIntelligenceSection as HTMLElement).getAllByText("Owner role").length).toBeGreaterThan(0);
    expect(within(riskIntelligenceSection as HTMLElement).getAllByText(/Next action:/).length).toBeGreaterThan(0);
    expect(within(riskIntelligenceSection as HTMLElement).getByText(/Wallet, on-chain, and dApp API/)).toBeInTheDocument();
    expect(within(riskIntelligenceSection as HTMLElement).getByText(/Referral-heavy winners stay review-required/)).toBeInTheDocument();
    expectVisibleText("Bot/sybil review");
    expectVisibleText("AI Ops reports");
    expect(screen.getByRole("heading", { name: "AI Optimization action queue" })).toBeInTheDocument();
    const actionQueueSection = screen
      .getByRole("heading", { name: "AI Optimization action queue" })
      .closest("section");
    expect(actionQueueSection).not.toBeNull();
    expect(within(actionQueueSection as HTMLElement).getByText(/Total actions/)).toBeInTheDocument();
    expect(within(actionQueueSection as HTMLElement).getByText(/Ready$/)).toBeInTheDocument();
    expect(within(actionQueueSection as HTMLElement).getAllByText("Ready to review").length).toBeGreaterThan(0);
    expect(within(actionQueueSection as HTMLElement).getAllByText("Review required").length).toBeGreaterThan(0);
    expect(within(actionQueueSection as HTMLElement).getAllByText("Blocked").length).toBeGreaterThan(0);
    expect(within(actionQueueSection as HTMLElement).getAllByText("Owner role").length).toBeGreaterThan(0);
    expect(within(actionQueueSection as HTMLElement).getAllByText("Source metrics").length).toBeGreaterThan(0);
    expect(within(actionQueueSection as HTMLElement).getByText(/Main drop-off: Largest drop-off/)).toHaveStyle(
      "white-space: normal; overflow-wrap: anywhere;",
    );
    expect(within(actionQueueSection as HTMLElement).getAllByText(/Guardrail:/).length).toBeGreaterThan(0);
    expect(within(actionQueueSection as HTMLElement).getAllByText(/Evidence:/).length).toBeGreaterThan(0);
    expect(within(actionQueueSection as HTMLElement).getAllByText(/Next action:/).length).toBeGreaterThan(0);
    expect(within(actionQueueSection as HTMLElement).getAllByText(/No live AI provider/).length).toBeGreaterThan(0);
    expect(within(actionQueueSection as HTMLElement).getAllByText(/risk scoring/).length).toBeGreaterThan(0);
    expect(within(actionQueueSection as HTMLElement).getAllByText(/export file/).length).toBeGreaterThan(0);
    expect(within(actionQueueSection as HTMLElement).getAllByText(/wallet action/).length).toBeGreaterThan(0);
    expect(within(actionQueueSection as HTMLElement).getAllByText(/contract transaction/).length).toBeGreaterThan(0);
    expect(within(actionQueueSection as HTMLElement).getAllByText(/reward custody/).length).toBeGreaterThan(0);
    expect(within(actionQueueSection as HTMLElement).getAllByText(/reward distribution/).length).toBeGreaterThan(0);
    const handoffSection = screen.getByLabelText("AI report handoff");
    expect(within(handoffSection).getByRole("heading", { name: "AI report handoff" })).toBeInTheDocument();
    expect(within(handoffSection).getByText("Reviewer-ready seeded/local report packages with accountable owners and guardrails.")).toBeInTheDocument();
    expect(within(handoffSection).getByText("6 Total handoffs")).toBeInTheDocument();
    expect(within(handoffSection).getAllByText("Review required").length).toBeGreaterThan(0);
    expect(within(handoffSection).getAllByText("Blocked").length).toBeGreaterThan(0);
    expect(within(handoffSection).getAllByText("Owner role").length).toBeGreaterThan(0);
    expect(within(handoffSection).getAllByText("Review state").length).toBeGreaterThan(0);
    expect(within(handoffSection).getAllByText("Source metrics").length).toBeGreaterThan(0);
    expect(within(handoffSection).getAllByText(/Source evidence:/).length).toBeGreaterThan(0);
    expect(within(handoffSection).getAllByText(/Guardrail:/).length).toBeGreaterThan(0);
    expect(within(handoffSection).getAllByText(/Next action:/).length).toBeGreaterThan(0);
    expect(within(handoffSection).getByText("Clarify bridge confirmation steps")).toBeInTheDocument();
    expect(within(handoffSection).getByText("Hold export until risk review completes")).toBeInTheDocument();
    expect(within(handoffSection).getByText("Prepare winner export brief")).toBeInTheDocument();
    expect(within(handoffSection).getAllByText("risk reviewer").length).toBeGreaterThan(0);
    expect(within(handoffSection).getAllByText("growth lead").length).toBeGreaterThan(0);
    expect(within(handoffSection).getAllByText(/No live AI provider/).length).toBeGreaterThan(0);
    expect(within(handoffSection).getAllByText(/risk scoring/).length).toBeGreaterThan(0);
    expect(within(handoffSection).getAllByText(/wallet action/).length).toBeGreaterThan(0);
    expect(within(handoffSection).getAllByText(/reward distribution/).length).toBeGreaterThan(0);
    const competitorWatchSection = screen.getByLabelText("Competitor Watch");
    expect(within(competitorWatchSection).getByRole("heading", { name: "Competitor Watch" })).toBeInTheDocument();
    expect(within(competitorWatchSection).getByText("Seeded/local competitor observation for AI Ops positioning without live scraping or external execution.")).toBeInTheDocument();
    expect(within(competitorWatchSection).getByText("4 Total signals")).toBeInTheDocument();
    expect(within(competitorWatchSection).getByText("5 Differentiators")).toBeInTheDocument();
    expect(within(competitorWatchSection).getAllByText("Generic quest growth platforms").length).toBeGreaterThan(0);
    expect(within(competitorWatchSection).getAllByText("On-chain activation platforms").length).toBeGreaterThan(0);
    expect(within(competitorWatchSection).getAllByText("Community intelligence systems").length).toBeGreaterThan(0);
    expect(within(competitorWatchSection).getAllByText("Growth infrastructure suites").length).toBeGreaterThan(0);
    expect(within(competitorWatchSection).getAllByText("Owner role").length).toBeGreaterThan(0);
    expect(within(competitorWatchSection).getAllByText("Review state").length).toBeGreaterThan(0);
    expect(within(competitorWatchSection).getAllByText(/Observed pattern:/).length).toBeGreaterThan(0);
    expect(within(competitorWatchSection).getAllByText(/aelf implication:/).length).toBeGreaterThan(0);
    expect(within(competitorWatchSection).getAllByText(/Evidence basis:/).length).toBeGreaterThan(0);
    expect(within(competitorWatchSection).getAllByText(/Guardrail:/).length).toBeGreaterThan(0);
    expect(within(competitorWatchSection).getAllByText(/Next action:/).length).toBeGreaterThan(0);
    expect(within(competitorWatchSection).getAllByText("wallet support").length).toBeGreaterThan(0);
    expect(within(competitorWatchSection).getAllByText("ecosystem conversion").length).toBeGreaterThan(0);
    expect(within(competitorWatchSection).getAllByText("project owned rewards").length).toBeGreaterThan(0);
    expect(within(competitorWatchSection).getAllByText(/No live scraping/).length).toBeGreaterThan(0);
    expect(within(competitorWatchSection).getAllByText(/no live AI provider/).length).toBeGreaterThan(0);
    expect(within(competitorWatchSection).getAllByText(/no reward distribution/).length).toBeGreaterThan(0);
    expectVisibleText("Daily AI Ops summary");
    expectVisibleText("Human review required");
    expectVisibleText("Ecosystem metrics");
    expectVisibleText("TMRWDAO");
    expectVisibleText("Export winners does not distribute rewards.");
    expectVisibleText(exportColumnContract);
    expectVisibleText("Campaign OS exports verified records only.");
    expectVisibleText("Final reward distribution is handled by the campaign project.");
    expect(screen.getByText("Risk flags and eligibility results are review inputs; Campaign OS does not distribute rewards.")).toBeInTheDocument();
    expectVisibleText("Export batch: export-awaken-sprint-preview");
    const localArtifact = screen.getByLabelText("Local export artifact");
    expect(within(localArtifact).getByText("camp-awaken-sprint-export-awaken-sprint-preview-local-review.csv")).toBeInTheDocument();
    expect(within(localArtifact).getByText("CSV")).toBeInTheDocument();
    expect(within(localArtifact).getByText(/Artifact batch: export-awaken-sprint-preview/)).toBeInTheDocument();
    expect(within(localArtifact).getByText("Checksum")).toBeInTheDocument();
    expect(within(localArtifact).getByText(/^local-[0-9a-f]{8}$/)).toBeInTheDocument();
    expect(within(localArtifact).getByText("Payload bytes")).toBeInTheDocument();
    expect(within(localArtifact).getByText(/Artifact rows: 1 \/ 3 \/ 0/)).toBeInTheDocument();
    expect(within(localArtifact).getByText("No download URL")).toBeInTheDocument();
    expect(within(localArtifact).getByText("No storage write")).toBeInTheDocument();
    expect(within(localArtifact).getByText("No contract root")).toBeInTheDocument();
    expect(within(localArtifact).getByText("No reward distribution")).toBeInTheDocument();
    expect(within(localArtifact).getByText(/No download URL, storage write, contract root/)).toBeInTheDocument();
    expect(within(localArtifact).queryByText(/Download ready/i)).not.toBeInTheDocument();
    expect(within(localArtifact).queryByText(/Stored/i)).not.toBeInTheDocument();
    expect(within(localArtifact).queryByText(/Contract root generated/i)).not.toBeInTheDocument();
    expect(within(localArtifact).queryByText(/Rewards distributed/i)).not.toBeInTheDocument();
    expectVisibleText("3E9...7cD");
    expectVisibleText("PORTKEY_EOA_EXTENSION");
    expectVisibleText("zh-CN");
    expectVisibleText("review_required");
    expectVisibleText("REF...3E9");
    expectVisibleText("referral_velocity_review");
    expectVisibleText(/task-bridge:pending:aelfscan/);
    expectVisibleText(/task-social:failed:social_api/);
    expectVisibleText(/demo-task-bridge-3E9/);
    expectVisibleText(/demo-task-social-3E9/);
    expectVisibleText("zh-CN / zh-TW AI draft/fallback");
    expect(screen.getAllByText(/zh-TW/).length).toBeGreaterThan(0);
  });

  it("renders AI review lifecycle operation cards without production mutation copy", () => {
    render(
      <AdminOpsPanel
        campaign={{ ...campaignDetail, status: "ai_draft" }}
        locale="en-US"
      />,
    );

    const lifecycleReview = screen.getByLabelText("Lifecycle operation review");

    expect(within(lifecycleReview).getByText(/Draft\s*->\s*AI Draft/)).toBeInTheDocument();
    expect(within(lifecycleReview).getByText(/AI Draft\s*->\s*Human Review/)).toBeInTheDocument();
    expect(within(lifecycleReview).getByText("Generate AI draft")).toBeInTheDocument();
    expect(within(lifecycleReview).getByText("Submit for human review")).toBeInTheDocument();
    expect(within(lifecycleReview).getByText("Schedule campaign")).toBeInTheDocument();
    expect(within(lifecycleReview).getByText("Publish campaign")).toBeInTheDocument();
    expect(
      within(lifecycleReview).getAllByText(/AI-generated campaign setup must be reviewed by a human/).length,
    ).toBeGreaterThan(0);
    expect(
      within(lifecycleReview).getByText(/Review only: no live mutation, no scheduler action/),
    ).toBeInTheDocument();
    expect(within(lifecycleReview).queryByText(/production mutation is enabled/i)).not.toBeInTheDocument();
  });

  it("switches Admin/Ops copy manually to zh-CN", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "zh-CN" } });
    fireEvent.click(screen.getByRole("button", { name: "管理员/Ops" }));

    expect(screen.getByRole("heading", { name: "审核队列" })).toBeInTheDocument();
    const zhLifecycleReview = screen.getByLabelText("Lifecycle 操作审核");
    expect(
      within(zhLifecycleReview).getByRole("heading", { name: "Lifecycle 操作审核" }),
    ).toBeInTheDocument();
    expect(within(zhLifecycleReview).getByText(/按路径审核暂停、恢复、结束、导出与归档/)).toBeInTheDocument();
    expect(within(zhLifecycleReview).getByText("暂停活动")).toBeInTheDocument();
    expect(within(zhLifecycleReview).getByText("恢复活动")).toBeInTheDocument();
    expect(within(zhLifecycleReview).getByText("结束活动")).toBeInTheDocument();
    expect(within(zhLifecycleReview).getByText("标记导出 readiness")).toBeInTheDocument();
    expect(within(zhLifecycleReview).getByText("归档活动")).toBeInTheDocument();
    expect(within(zhLifecycleReview).getByText(/不会执行实时变更/)).toBeInTheDocument();
    expect(within(zhLifecycleReview).getByText(/scheduler 动作/)).toBeInTheDocument();
    expect(within(zhLifecycleReview).getAllByText(/合约写入/).length).toBeGreaterThan(0);
    expect(within(zhLifecycleReview).getAllByText(/导出文件生成/).length).toBeGreaterThan(0);
    expect(within(zhLifecycleReview).getAllByText(/发奖/).length).toBeGreaterThan(0);
    const zhLaunchBundleReview = screen.getByLabelText("Launch Console 活动包审核");
    expect(
      within(zhLaunchBundleReview).getByRole("heading", { name: "Launch Console 活动包审核" }),
    ).toBeInTheDocument();
    expect(within(zhLaunchBundleReview).getByText("上线阻断门禁")).toBeInTheDocument();
    expect(within(zhLaunchBundleReview).getAllByText("Handoff readiness").length).toBeGreaterThan(0);
    expect(within(zhLaunchBundleReview).getAllByText("预热活动包").length).toBeGreaterThan(0);
    expect(within(zhLaunchBundleReview).getAllByText("上线活动包").length).toBeGreaterThan(0);
    expect(within(zhLaunchBundleReview).getAllByText("上线后活动包").length).toBeGreaterThan(0);
    expect(within(zhLaunchBundleReview).getAllByText("本地预览").length).toBeGreaterThan(0);
    expect(within(zhLaunchBundleReview).getByText(/不会连接真实 Launch Console/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "交付清单 Readiness" })).toBeInTheDocument();
    expectVisibleText("v0.2 交付审计");
    expectVisibleText("产品清单");
    expectVisibleText("架构清单");
    expectVisibleText("UI 清单");
    expectVisibleText("合约清单");
    expectVisibleText("QA 清单");
    expectVisibleText("已覆盖");
    expectVisibleText("需要复核");
    expectVisibleText("已后置");
    expectVisibleText("AA + EOA 钱包支持");
    expectVisibleText("钱包弹窗包含 Recommended、EOA 与 Advanced 分区");
    expectVisibleText("归一化钱包 session schema");
    expectVisibleText("每个语言的奖励免责声明");
    expectVisibleText("发布前合约影响审核");
    expectVisibleText("Portkey AA 连接测试");
    expectVisibleText("错误链错误状态测试");
    expectVisibleText("导出 CSV 字段测试");
    expectVisibleText("Contract claim 模式需要管理员批准");
    expectVisibleText("奖励托管排除在 MVP 外");
    expectVisibleText(/这个控制台不会执行实时钱包 SDK/);
    expectVisibleText(/不会执行实时钱包 SDK、API 调用、合约交易、导出文件/);
    expect(screen.getByRole("heading", { name: "钱包 Provider QA Readiness" })).toBeInTheDocument();
    expectVisibleText("真实 provider 证据门禁");
    expectVisibleText("场景总数");
    expectVisibleText("Seeded 就绪");
    expectVisibleText("真实证据就绪");
    expectVisibleText("缺失真实证据");
    expectVisibleText("发布阻断");
    expectVisibleText("Portkey AA 连接");
    expectVisibleText("EOA 插件连接");
    expectVisibleText("错误链恢复");
    expectVisibleText("不支持钱包恢复");
    expect(screen.getAllByText("Seeded 证据").length).toBeGreaterThan(0);
    expect(screen.getAllByText("真实证据").length).toBeGreaterThan(0);
    expect(screen.getAllByText("发布影响").length).toBeGreaterThan(0);
    expect(screen.getAllByText("缺失").length).toBeGreaterThan(0);
    expectVisibleText(/尚未附上真实 Portkey AA provider 证据/);
    expectVisibleText(/不会执行实时钱包 SDK 连接、真实签名、交易、合约调用/);
    const zhLiveConnectorReleaseReview = screen
      .getByRole("heading", { name: "Live 钱包 connector 发布审核" })
      .closest("section");
    expect(zhLiveConnectorReleaseReview).not.toBeNull();
    expect(within(zhLiveConnectorReleaseReview as HTMLElement).getByText("Connector 候选")).toBeInTheDocument();
    expect(within(zhLiveConnectorReleaseReview as HTMLElement).getByText("已关闭 / 需审核")).toBeInTheDocument();
    expect(within(zhLiveConnectorReleaseReview as HTMLElement).getByText("不启用生产连接")).toBeInTheDocument();
    expect(within(zhLiveConnectorReleaseReview as HTMLElement).getByText("需要 live QA")).toBeInTheDocument();
    expect(within(zhLiveConnectorReleaseReview as HTMLElement).getAllByText("需要审核批准").length).toBeGreaterThan(0);
    expect(within(zhLiveConnectorReleaseReview as HTMLElement).getByText("@aelf-web-login/wallet-adapter-portkey-aa")).toBeInTheDocument();
    expect(within(zhLiveConnectorReleaseReview as HTMLElement).getAllByText(/candidate:0\.4\.0-alpha\.21/).length).toBeGreaterThan(0);
    expect(within(zhLiveConnectorReleaseReview as HTMLElement).getAllByText("依赖风险").length).toBeGreaterThan(0);
    expect(within(zhLiveConnectorReleaseReview as HTMLElement).getAllByText(/不会执行实时钱包 SDK 连接、签名提示、交易、合约调用/).length).toBeGreaterThan(0);
    expect(within(zhLiveConnectorReleaseReview as HTMLElement).getByText("已阻断操作")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Provider 证据登记表" })).toBeInTheDocument();
    const zhProviderRegistry = screen
      .getByRole("heading", { name: "Provider 证据登记表" })
      .closest("section");
    expect(zhProviderRegistry).not.toBeNull();
    expect(within(zhProviderRegistry as HTMLElement).getAllByText("缺失真实 evidence").length).toBeGreaterThan(0);
    expect(within(zhProviderRegistry as HTMLElement).getAllByText("配置门禁").length).toBeGreaterThan(0);
    expect(within(zhProviderRegistry as HTMLElement).getAllByText("Fallback").length).toBeGreaterThan(0);
    expect(within(zhProviderRegistry as HTMLElement).getByText("社交 API 验证")).toBeInTheDocument();
    expect(within(zhProviderRegistry as HTMLElement).getByText("钱包 provider QA")).toBeInTheDocument();
    expect(within(zhProviderRegistry as HTMLElement).getByText(/不会调用实时 API/)).toBeInTheDocument();
    const zhServiceGovernance = screen.getByLabelText("Service Registry 治理");
    expect(
      within(zhServiceGovernance).getByRole("heading", { name: "Service Registry 治理" }),
    ).toBeInTheDocument();
    expect(within(zhServiceGovernance).getAllByText("服务摘要").length).toBeGreaterThan(0);
    expect(within(zhServiceGovernance).getAllByText("预览启用").length).toBeGreaterThan(0);
    expect(within(zhServiceGovernance).getAllByText("维护中").length).toBeGreaterThan(0);
    expect(within(zhServiceGovernance).getAllByText("需要审核").length).toBeGreaterThan(0);
    expect(within(zhServiceGovernance).getAllByText("已下线").length).toBeGreaterThan(0);
    expect(within(zhServiceGovernance).getAllByText("高影响阻断").length).toBeGreaterThan(0);
    expect(within(zhServiceGovernance).getAllByText("钱包签名").length).toBeGreaterThan(0);
    expect(within(zhServiceGovernance).getAllByText("合约 root 写入器").length).toBeGreaterThan(0);
    expect(within(zhServiceGovernance).getByText(/无实时执行边界:/)).toBeInTheDocument();
    expect(within(zhServiceGovernance).getAllByText(/不会执行实时 SDK/).length).toBeGreaterThan(0);
    expect(within(zhServiceGovernance).getAllByText(/Fallback:/).length).toBeGreaterThan(0);
    expectVisibleText("AI 内容审核");
    expectVisibleText("分析概览");
    const zhAdvancedAnalyticsReview = screen.getByLabelText("高级分析审核");
    expect(
      within(zhAdvancedAnalyticsReview).getByRole("heading", { name: "高级分析审核" }),
    ).toBeInTheDocument();
    expect(within(zhAdvancedAnalyticsReview).getByText("Premium report readiness")).toBeInTheDocument();
    expect(within(zhAdvancedAnalyticsReview).getByText("Day 7 留存")).toBeInTheDocument();
    expect(within(zhAdvancedAnalyticsReview).getByText("Day 30 留存")).toBeInTheDocument();
    expect(within(zhAdvancedAnalyticsReview).getByText("Evidence gap")).toBeInTheDocument();
    expect(within(zhAdvancedAnalyticsReview).getAllByText("负责人角色").length).toBeGreaterThan(0);
    expect(within(zhAdvancedAnalyticsReview).getAllByText(/事件仓库/).length).toBeGreaterThan(0);
    expect(within(zhAdvancedAnalyticsReview).getAllByText(/billing/).length).toBeGreaterThan(0);
    expect(within(zhAdvancedAnalyticsReview).getAllByText(/自动处罚/).length).toBeGreaterThan(0);
    expectVisibleText("转化漏斗");
    expectVisibleText("钱包拆分");
    expectVisibleText("语言拆分");
    expectVisibleText("风险看板");
    expect(screen.getByRole("heading", { name: "风险智能审核" })).toBeInTheDocument();
    const zhRiskIntelligenceSection = screen
      .getByRole("heading", { name: "风险智能审核" })
      .closest("section");
    expect(zhRiskIntelligenceSection).not.toBeNull();
    expect(within(zhRiskIntelligenceSection as HTMLElement).getAllByText("反女巫审核界面").length).toBeGreaterThan(0);
    expect(within(zhRiskIntelligenceSection as HTMLElement).getByText("钱包年龄审核")).toBeInTheDocument();
    expect(within(zhRiskIntelligenceSection as HTMLElement).getByText("资金来源聚类")).toBeInTheDocument();
    expect(within(zhRiskIntelligenceSection as HTMLElement).getByText("邀请树集中度")).toBeInTheDocument();
    expect(within(zhRiskIntelligenceSection as HTMLElement).getByText("设备/会话相似度")).toBeInTheDocument();
    expect(within(zhRiskIntelligenceSection as HTMLElement).getByText("任务模式相似度")).toBeInTheDocument();
    expect(within(zhRiskIntelligenceSection as HTMLElement).getByText("最低有效行为")).toBeInTheDocument();
    expect(within(zhRiskIntelligenceSection as HTMLElement).getAllByText("人工审核队列").length).toBeGreaterThan(0);
    expect(within(zhRiskIntelligenceSection as HTMLElement).getAllByText("证据覆盖").length).toBeGreaterThan(0);
    expect(within(zhRiskIntelligenceSection as HTMLElement).getAllByText("导出影响").length).toBeGreaterThan(0);
    expect(within(zhRiskIntelligenceSection as HTMLElement).getAllByText("负责人角色").length).toBeGreaterThan(0);
    expect(within(zhRiskIntelligenceSection as HTMLElement).getAllByText(/下一步:/).length).toBeGreaterThan(0);
    expectVisibleText("机器人/女巫审核");
    expectVisibleText("AI Ops 报告");
    expect(screen.getByRole("heading", { name: "AI Optimization 动作队列" })).toBeInTheDocument();
    const zhActionQueueSection = screen
      .getByRole("heading", { name: "AI Optimization 动作队列" })
      .closest("section");
    expect(zhActionQueueSection).not.toBeNull();
    expect(within(zhActionQueueSection as HTMLElement).getByText(/总动作/)).toBeInTheDocument();
    expect(within(zhActionQueueSection as HTMLElement).getAllByText("可审核").length).toBeGreaterThan(0);
    expect(within(zhActionQueueSection as HTMLElement).getAllByText("需要审核").length).toBeGreaterThan(0);
    expect(within(zhActionQueueSection as HTMLElement).getAllByText("已阻断").length).toBeGreaterThan(0);
    expect(within(zhActionQueueSection as HTMLElement).getAllByText("负责人角色").length).toBeGreaterThan(0);
    expect(within(zhActionQueueSection as HTMLElement).getAllByText("来源指标").length).toBeGreaterThan(0);
    expect(within(zhActionQueueSection as HTMLElement).getAllByText(/防护栏:/).length).toBeGreaterThan(0);
    expect(within(zhActionQueueSection as HTMLElement).getAllByText(/证据:/).length).toBeGreaterThan(0);
    expect(within(zhActionQueueSection as HTMLElement).getAllByText(/下一步:/).length).toBeGreaterThan(0);
    expect(within(zhActionQueueSection as HTMLElement).getAllByText(/不会执行实时 AI/).length).toBeGreaterThan(0);
    expect(within(zhActionQueueSection as HTMLElement).getAllByText(/风险评分/).length).toBeGreaterThan(0);
    expect(within(zhActionQueueSection as HTMLElement).getAllByText(/导出文件/).length).toBeGreaterThan(0);
    expect(within(zhActionQueueSection as HTMLElement).getAllByText(/钱包动作/).length).toBeGreaterThan(0);
    expect(within(zhActionQueueSection as HTMLElement).getAllByText(/合约交易/).length).toBeGreaterThan(0);
    expect(within(zhActionQueueSection as HTMLElement).getAllByText(/奖励托管/).length).toBeGreaterThan(0);
    expect(within(zhActionQueueSection as HTMLElement).getAllByText(/发奖/).length).toBeGreaterThan(0);
    const zhHandoffSection = screen.getByLabelText("AI 报告 handoff");
    expect(within(zhHandoffSection).getByRole("heading", { name: "AI 报告 handoff" })).toBeInTheDocument();
    expect(within(zhHandoffSection).getByText("面向审核人的 seeded/本地报告交接包，包含负责人和防护栏。")).toBeInTheDocument();
    expect(within(zhHandoffSection).getByText("6 总 handoff")).toBeInTheDocument();
    expect(within(zhHandoffSection).getAllByText("需要审核").length).toBeGreaterThan(0);
    expect(within(zhHandoffSection).getAllByText("已阻断").length).toBeGreaterThan(0);
    expect(within(zhHandoffSection).getAllByText("负责人角色").length).toBeGreaterThan(0);
    expect(within(zhHandoffSection).getAllByText("审核状态").length).toBeGreaterThan(0);
    expect(within(zhHandoffSection).getAllByText("来源指标").length).toBeGreaterThan(0);
    expect(within(zhHandoffSection).getAllByText(/来源证据:/).length).toBeGreaterThan(0);
    expect(within(zhHandoffSection).getAllByText(/防护栏:/).length).toBeGreaterThan(0);
    expect(within(zhHandoffSection).getAllByText(/下一步:/).length).toBeGreaterThan(0);
    expect(within(zhHandoffSection).getByText("说明跨链确认步骤")).toBeInTheDocument();
    expect(within(zhHandoffSection).getByText("风险审核完成前暂缓导出")).toBeInTheDocument();
    expect(within(zhHandoffSection).getByText("准备 winners 导出说明")).toBeInTheDocument();
    expect(within(zhHandoffSection).getAllByText(/不会执行实时 AI/).length).toBeGreaterThan(0);
    expect(within(zhHandoffSection).getAllByText(/风险评分/).length).toBeGreaterThan(0);
    expect(within(zhHandoffSection).getAllByText(/钱包动作/).length).toBeGreaterThan(0);
    expect(within(zhHandoffSection).getAllByText(/发奖/).length).toBeGreaterThan(0);
    const zhCompetitorWatchSection = screen.getByLabelText("竞品观察");
    expect(within(zhCompetitorWatchSection).getByRole("heading", { name: "竞品观察" })).toBeInTheDocument();
    expect(within(zhCompetitorWatchSection).getByText("面向 AI Ops 定位的 seeded/本地竞品观察，不执行实时抓取或外部动作。")).toBeInTheDocument();
    expect(within(zhCompetitorWatchSection).getByText("4 信号总数")).toBeInTheDocument();
    expect(within(zhCompetitorWatchSection).getByText("5 差异化点")).toBeInTheDocument();
    expect(within(zhCompetitorWatchSection).getAllByText("通用任务增长平台").length).toBeGreaterThan(0);
    expect(within(zhCompetitorWatchSection).getAllByText("链上激励激活平台").length).toBeGreaterThan(0);
    expect(within(zhCompetitorWatchSection).getAllByText("社区智能与贡献者系统").length).toBeGreaterThan(0);
    expect(within(zhCompetitorWatchSection).getAllByText("增长基础设施套件").length).toBeGreaterThan(0);
    expect(within(zhCompetitorWatchSection).getAllByText("负责人角色").length).toBeGreaterThan(0);
    expect(within(zhCompetitorWatchSection).getAllByText("审核状态").length).toBeGreaterThan(0);
    expect(within(zhCompetitorWatchSection).getAllByText(/观察到的模式:/).length).toBeGreaterThan(0);
    expect(within(zhCompetitorWatchSection).getAllByText(/aelf 启示:/).length).toBeGreaterThan(0);
    expect(within(zhCompetitorWatchSection).getAllByText(/证据依据:/).length).toBeGreaterThan(0);
    expect(within(zhCompetitorWatchSection).getAllByText(/防护栏:/).length).toBeGreaterThan(0);
    expect(within(zhCompetitorWatchSection).getAllByText(/下一步:/).length).toBeGreaterThan(0);
    expect(within(zhCompetitorWatchSection).getAllByText(/实时抓取/).length).toBeGreaterThan(0);
    expect(within(zhCompetitorWatchSection).getAllByText(/实时 AI provider/).length).toBeGreaterThan(0);
    expect(within(zhCompetitorWatchSection).getAllByText(/奖励发放/).length).toBeGreaterThan(0);
    expectVisibleText("生态指标");
    expectVisibleText("禁止自动发布：中文草稿发布前必须经过人工审核。");
    expect(screen.getByRole("heading", { name: "模板治理" })).toBeInTheDocument();
    expectVisibleText("模板管理");
    expectVisibleText("12 个模板");
    expectVisibleText("本地化审核");
    expectVisibleText("风险审核");
    expectVisibleText(/不会连接实时模板 registry/);
    expectVisibleText("使用 eBridge 跨链");
    expectVisibleText("分享活动动态");
    expectVisibleText("仅 EOA");
    expect(screen.getByRole("heading", { name: "AI 内容包工作台" })).toBeInTheDocument();
    expectVisibleText("7 个内容");
    expectVisibleText("禁止自动发布边界");
    expectVisibleText("X / Twitter 长帖");
    expectVisibleText("Telegram 公告");
    expectVisibleText("Discord 消息");
    expectVisibleText("FAQ");
    expectVisibleText("教程");
    expectVisibleText("日报");
    expectVisibleText("Winner 报告");
    expectVisibleText("发布已阻断");
    expectVisibleText("可复制");
    expectVisibleText("奖励责任");
    expectVisibleText("Winner 规则");
    expectVisibleText("本地化准备度");
    expectVisibleText("审核人: legal_ops");
    expectVisibleText("审核人: community_ops");
    const zhTelegramCard = screen.getByText("Telegram 公告").closest("article");
    expect(zhTelegramCard).not.toBeNull();
    expect(within(zhTelegramCard as HTMLElement).getAllByText("需要人工审核").length).toBeGreaterThan(0);
    expectVisibleText(/不会连接实时 AI/);
    expectVisibleText("管理员合约审核中心");
    expectVisibleText("是否需要 V2 companion");
    expectVisibleText("MVP 不需要；建议 P1 用于透明度增强。");
    expectVisibleText("Metadata hash");
    expectVisibleText("MVP 可选；计划用于 CampaignRegistryV2 metadata URI/hash。");
    expectVisibleText("Verifier role");
    expectVisibleText("仅 backend verifier；MVP 没有合约写权限。");
    expectVisibleText("奖励托管");
    expectVisibleText("项目方持有；Campaign OS 不托管。");
    expectVisibleText("高影响审核清单");
    expectVisibleText("合约领取门禁");
    expectVisibleText("高影响人工审核前保持阻断");
    expectVisibleText("不要在 MVP shell 启用领取模式。");
    expectVisibleText("合约演进路线");
    expectVisibleText("CampaignRegistryV2 metadata hash");
    expectVisibleText("Points 与 referral roots");
    expectVisibleText("可选合约领取");
    expectVisibleText(/不执行真实合约交易/);
    expectVisibleText("合约接口矩阵控制台");
    expectVisibleText("Companion contracts");
    expectVisibleText("合约方法");
    expectVisibleText("变更矩阵");
    expectVisibleText("当前 MVP");
    expectVisibleText("建议 V2");
    expectVisibleText("优先级 / 阶段");
    expectVisibleText(/不会生成 ABI/);
    expectVisibleText(/不会执行真实合约交易/);
    expectVisibleText(/不托管奖励 \/ 不发奖/);
    expectVisibleText("CampaignRegistryV2");
    expectVisibleText("CampaignPointsLedgerV2");
    expectVisibleText("ReferralRegistryV2");
    expectVisibleText("EligibilityRootRegistryV2");
    expectVisibleText("CreateCampaign");
    expectVisibleText("CommitPointsBatch");
    expectVisibleText("BindReferral");
    expectVisibleText("SetEligibilityRoot");
    expectVisibleText("VerifyEligibilityProof");
    expectVisibleText("奖励");
    expectVisibleText("多语言内容");
    expectVisibleText("钱包类型");
    expectVisibleText("风险标记");
    expectVisibleText(/Campaign OS 不托管也不发放奖励/);
    const zhContractTransparencyMonitor = screen.getByLabelText("合约透明度监控");
    expect(
      within(zhContractTransparencyMonitor).getByRole("heading", { name: "合约透明度监控" }),
    ).toBeInTheDocument();
    expect(within(zhContractTransparencyMonitor).getAllByText("总 lanes").length).toBeGreaterThan(0);
    expect(within(zhContractTransparencyMonitor).getByText("Closeout 上下文")).toBeInTheDocument();
    expect(within(zhContractTransparencyMonitor).getByText("透明度 lanes")).toBeInTheDocument();
    expect(within(zhContractTransparencyMonitor).getByText("链下 MVP")).toBeInTheDocument();
    expect(within(zhContractTransparencyMonitor).getByText("导出 root readiness")).toBeInTheDocument();
    expect(within(zhContractTransparencyMonitor).getByText("积分批次 root")).toBeInTheDocument();
    expect(within(zhContractTransparencyMonitor).getByText("邀请绑定 root")).toBeInTheDocument();
    expect(within(zhContractTransparencyMonitor).getByText("资格 root")).toBeInTheDocument();
    expect(within(zhContractTransparencyMonitor).getByText("奖励托管 / claim")).toBeInTheDocument();
    expect(within(zhContractTransparencyMonitor).getAllByText(/下一步:/).length).toBeGreaterThan(0);
    expect(within(zhContractTransparencyMonitor).getAllByText(/合约接口矩阵控制台/).length).toBeGreaterThan(0);
    expect(within(zhContractTransparencyMonitor).getByText(/奖励托管与合约 claim 执行已阻断/)).toBeInTheDocument();
    expect(within(zhContractTransparencyMonitor).getAllByText(/不会执行真实合约交易/).length).toBeGreaterThan(0);
    expect(within(zhContractTransparencyMonitor).getAllByText(/生成 root/).length).toBeGreaterThan(0);
    expect(within(zhContractTransparencyMonitor).getAllByText(/托管奖励/).length).toBeGreaterThan(0);
    expectVisibleText("合约影响审核");
    expectVisibleText("Contract claim 已阻断，等待高影响人工审核。");
    expectVisibleText("导出 winners 不等于发奖。");
    expectVisibleText(exportColumnContract);
    expectVisibleText("Campaign OS 仅导出已验证记录。");
    expectVisibleText("最终奖励发放由活动项目方处理。");
    expectVisibleText("风险标记与资格结果仅作为审核输入；Campaign OS 不执行发奖。");
    const exportArtifact = screen.getByLabelText("本地导出 artifact");
    expect(within(exportArtifact).getByText("camp-awaken-sprint-export-awaken-sprint-preview-local-review.csv")).toBeInTheDocument();
    expect(within(exportArtifact).getByText(/Artifact 批次: export-awaken-sprint-preview/)).toBeInTheDocument();
    expect(within(exportArtifact).getByText("不生成下载链接")).toBeInTheDocument();
    expect(within(exportArtifact).getByText("不写入存储")).toBeInTheDocument();
    expect(within(exportArtifact).getByText("不生成合约 root")).toBeInTheDocument();
    expect(within(exportArtifact).getByText("不发奖")).toBeInTheDocument();
    expect(within(exportArtifact).getByText(/仅本地审核 artifact/)).toBeInTheDocument();
    expectVisibleText("zh-CN / zh-TW AI draft/fallback");
    expect(screen.getAllByText(/zh-TW/).length).toBeGreaterThan(0);
  });

  it("renders Advanced Analytics review copy explicitly in zh-TW", () => {
    render(<AdminOpsPanel locale="zh-TW" />);

    const serviceGovernance = screen.getByLabelText("Service Registry 治理");
    expect(
      within(serviceGovernance).getByRole("heading", { name: "Service Registry 治理" }),
    ).toBeInTheDocument();
    expect(within(serviceGovernance).getAllByText("服務摘要").length).toBeGreaterThan(0);
    expect(within(serviceGovernance).getAllByText("預覽啟用").length).toBeGreaterThan(0);
    expect(within(serviceGovernance).getAllByText("維護中").length).toBeGreaterThan(0);
    expect(within(serviceGovernance).getAllByText("需要審核").length).toBeGreaterThan(0);
    expect(within(serviceGovernance).getAllByText("已下線").length).toBeGreaterThan(0);
    expect(within(serviceGovernance).getAllByText("高影響阻斷").length).toBeGreaterThan(0);
    expect(within(serviceGovernance).getAllByText("錢包簽名").length).toBeGreaterThan(0);
    expect(within(serviceGovernance).getAllByText("合約 root 寫入器").length).toBeGreaterThan(0);
    expect(within(serviceGovernance).getByText(/無即時執行邊界:/)).toBeInTheDocument();
    expect(within(serviceGovernance).getAllByText(/不會執行即時 SDK/).length).toBeGreaterThan(0);
    expect(within(serviceGovernance).getAllByText(/Fallback:/).length).toBeGreaterThan(0);

    const advancedAnalyticsReview = screen.getByLabelText("進階分析審核");
    expect(
      within(advancedAnalyticsReview).getByRole("heading", { name: "進階分析審核" }),
    ).toBeInTheDocument();
    expect(within(advancedAnalyticsReview).getByText("Premium 報告 readiness")).toBeInTheDocument();
    expect(within(advancedAnalyticsReview).getByText("Day 7 留存")).toBeInTheDocument();
    expect(within(advancedAnalyticsReview).getByText("Day 30 留存")).toBeInTheDocument();
    expect(within(advancedAnalyticsReview).getByText("證據缺口")).toBeInTheDocument();
    expect(within(advancedAnalyticsReview).getAllByText("信號僅作為審核輸入").length).toBeGreaterThan(0);
    expect(within(advancedAnalyticsReview).getAllByText(/事件倉庫/).length).toBeGreaterThan(0);
    expect(within(advancedAnalyticsReview).getAllByText(/billing/).length).toBeGreaterThan(0);
    expect(within(advancedAnalyticsReview).getAllByText(/自動處罰/).length).toBeGreaterThan(0);
  });
});
