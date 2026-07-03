import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../../app/App";
import { campaignDetail, EXPORT_CSV_COLUMNS } from "../../../domain";
import { ProjectConsole } from "./ProjectConsole";

const getProjectWorkspaceNav = () =>
  screen.getByRole("navigation", { name: "Project Console workspace navigation" });

const clickWorkspace = (name: string) => {
  fireEvent.click(within(getProjectWorkspaceNav()).getByRole("button", { name }));
};

describe("Project Console shell", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("renders Campaigns as the default workspace with seeded operational data", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "Project Console" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const nav = getProjectWorkspaceNav();
    for (const workspace of ["Campaigns", "States", "Create", "Templates", "Participants", "AI Content", "Analytics", "Export", "Verification Rules", "Closeout", "Settings"]) {
      expect(within(nav).getByRole("button", { name: workspace })).toBeInTheDocument();
    }
    expect(within(nav).getByRole("button", { name: "Campaigns" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
    expect(screen.getByText("Connected wallets")).toBeInTheDocument();
    expect(screen.getByText("AA · Portkey")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Campaign Command Center" })).toBeInTheDocument();
    expect(screen.getByText("4 campaigns")).toBeInTheDocument();
    expect(screen.getByText("Review live analytics")).toBeInTheDocument();
    expect(screen.getByText("Review launch readiness")).toBeInTheDocument();
    expect(screen.getByText("Approve export preview")).toBeInTheDocument();
    expect(screen.getByText("Archive final report")).toBeInTheDocument();
    expect(screen.getByText("Forest NFT Quest")).toBeInTheDocument();
    expect(screen.getByText("TMRWDAO Governance Streak")).toBeInTheDocument();
    expect(screen.getByText("eBridge Onboarding Wave")).toBeInTheDocument();
    const lifecycleOperations = screen.getByLabelText("Lifecycle operations");
    expect(
      within(lifecycleOperations).getByRole("heading", { name: "Lifecycle operations" }),
    ).toBeInTheDocument();
    expect(within(lifecycleOperations).getByText("Current status")).toBeInTheDocument();
    expect(within(lifecycleOperations).getByText("Live")).toBeInTheDocument();
    expect(within(lifecycleOperations).getAllByText(/launch blockers/).length).toBeGreaterThan(0);
    expect(within(lifecycleOperations).getAllByText("Owner action").length).toBeGreaterThan(0);
    expect(within(lifecycleOperations).getByText("Publish campaign")).toBeInTheDocument();
    expect(within(lifecycleOperations).getByText("Mark export readiness")).toBeInTheDocument();
    expect(within(lifecycleOperations).getByText("Archive campaign")).toBeInTheDocument();
    expect(within(lifecycleOperations).getByText(/Lifecycle local-only boundary/)).toBeInTheDocument();
    expect(within(lifecycleOperations).getByText(/No live backend, scheduler, wallet signing/)).toBeInTheDocument();
    const launchBundles = screen.getByLabelText("Launch Console campaign bundles");
    expect(
      within(launchBundles).getByRole("heading", { name: "Launch Console campaign bundles" }),
    ).toBeInTheDocument();
    expect(within(launchBundles).getByText("Pre-launch bundle")).toBeInTheDocument();
    expect(within(launchBundles).getByText("Launch bundle")).toBeInTheDocument();
    expect(within(launchBundles).getByText("Post-launch bundle")).toBeInTheDocument();
    expect(within(launchBundles).getByText("Wallet connect readiness")).toBeInTheDocument();
    expect(within(launchBundles).getByText("Verified ecosystem action")).toBeInTheDocument();
    expect(within(launchBundles).getByText("Winner export preview")).toBeInTheDocument();
    expect(within(launchBundles).getByText("Create campaign draft")).toBeInTheDocument();
    expect(within(launchBundles).getAllByText("verify_task").length).toBeGreaterThan(0);
    expect(within(launchBundles).getAllByText("Local only").length).toBeGreaterThan(0);
    expect(within(launchBundles).getAllByText(/No live Launch Console/).length).toBeGreaterThan(0);
    expect(within(launchBundles).getAllByText(/no automatic campaign creation or publish/).length).toBeGreaterThan(0);
    expect(within(launchBundles).getAllByText(/no external API/i).length).toBeGreaterThan(0);
    expect(within(launchBundles).queryByText(/automatically creates campaigns/i)).not.toBeInTheDocument();
    expect(within(launchBundles).queryByText(/publishes through a live Launch Console/i)).not.toBeInTheDocument();
    const portfolioReadiness = screen.getByLabelText("Project portfolio readiness");
    expect(
      within(portfolioReadiness).getByRole("heading", { name: "Project portfolio readiness" }),
    ).toBeInTheDocument();
    for (const metric of [
      "Campaigns created",
      "Active projects",
      "Campaign setup time",
      "Reward budget committed",
      "Winner exports",
      "Repeat project usage",
    ]) {
      expect(within(portfolioReadiness).getByText(metric)).toBeInTheDocument();
    }
    expect(within(portfolioReadiness).getAllByText("Commercial readiness").length).toBeGreaterThan(0);
    expect(within(portfolioReadiness).getByText("Partner campaign fee")).toBeInTheDocument();
    expect(within(portfolioReadiness).getByText("Premium analytics")).toBeInTheDocument();
    expect(within(portfolioReadiness).getByText(/No live billing, payment, invoice, CRM, reward custody/)).toBeInTheDocument();
    expect(within(portfolioReadiness).getAllByText(/Reward budget is project or partner committed only/).length).toBeGreaterThan(0);
    expect(within(portfolioReadiness).queryByText(/invoice id/i)).not.toBeInTheDocument();
    expect(within(portfolioReadiness).queryByText(/payment id/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Analytics & Export Decision" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Task template library" })).not.toBeInTheDocument();
  });

  it("renders AI draft and human review lifecycle states with review-safe owner actions", () => {
    const aiDraftCampaign = {
      ...campaignDetail,
      status: "ai_draft",
    } satisfies typeof campaignDetail;

    const { rerender } = render(
      <ProjectConsole campaign={aiDraftCampaign} locale="en-US" />,
    );

    const aiDraftCommandCenter = screen.getByLabelText("Campaign Command Center");
    const aiDraftLifecycle = screen.getByLabelText("Lifecycle operations");

    expect(within(aiDraftCommandCenter).getByText("AI Draft")).toBeInTheDocument();
    expect(within(aiDraftLifecycle).getByText("AI Draft")).toBeInTheDocument();
    expect(within(aiDraftLifecycle).getByText(/AI Draft\s*->\s*Human Review/)).toBeInTheDocument();
    expect(within(aiDraftLifecycle).getAllByText("Submit for human review").length).toBeGreaterThan(0);
    expect(
      within(aiDraftLifecycle).getAllByText(/Confirm reward, eligibility, risk, i18n, and contract review/).length,
    ).toBeGreaterThan(0);

    rerender(
      <ProjectConsole
        campaign={{ ...campaignDetail, status: "human_review" }}
        locale="en-US"
      />,
    );

    const humanReviewCommandCenter = screen.getByLabelText("Campaign Command Center");
    const humanReviewLifecycle = screen.getByLabelText("Lifecycle operations");

    expect(within(humanReviewCommandCenter).getByText("Human Review")).toBeInTheDocument();
    expect(within(humanReviewLifecycle).getByText("Human Review")).toBeInTheDocument();
    expect(within(humanReviewLifecycle).getAllByText("Schedule campaign").length).toBeGreaterThan(0);
    expect(within(humanReviewLifecycle).getAllByText("Publish campaign").length).toBeGreaterThan(0);
    expect(
      within(humanReviewLifecycle).getAllByText(/Complete human review and launch gates before scheduling/).length,
    ).toBeGreaterThan(0);
    expect(
      within(humanReviewLifecycle).getAllByText(/Complete launch-blocking checks before go-live/).length,
    ).toBeGreaterThan(0);
  });

  it("switches to States workspace and renders state component delivery coverage", () => {
    render(<App />);

    clickWorkspace("States");

    const nav = getProjectWorkspaceNav();
    expect(within(nav).getByRole("button", { name: "States" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const gallery = screen.getByLabelText("State Components Delivery Gallery");
    expect(
      within(gallery).getByRole("heading", { name: "State Components Delivery Gallery" }),
    ).toBeInTheDocument();
    expect(within(gallery).getByText("State families")).toBeInTheDocument();
    expect(within(gallery).getByText("Covered states")).toBeInTheDocument();
    expect(within(gallery).getByText("Review-required states")).toBeInTheDocument();
    expect(within(gallery).getByText("Blocked states")).toBeInTheDocument();

    for (const family of [
      "Campaign",
      "Task Verification",
      "Eligibility",
      "i18n Content",
      "Wallet/QA",
      "Export/Modal",
      "Toast/Notification",
      "Blocked Publish",
    ]) {
      expect(within(gallery).getByRole("heading", { name: family })).toBeInTheDocument();
    }

    for (const stateLabel of ["Loading", "Empty", "Error", "Missing", "AI Draft", "Reviewed", "Published", "Fallback"]) {
      expect(within(gallery).getByText(stateLabel)).toBeInTheDocument();
    }

    expect(within(gallery).getByText(/No live sync is running/)).toBeInTheDocument();
    expect(within(gallery).getByText(/Clear filters, add seeded participants/)).toBeInTheDocument();
    expect(within(gallery).getByText(/Retry the local preview, check seeded data/)).toBeInTheDocument();
    expect(within(gallery).getByText("Failed")).toBeInTheDocument();
    expect(within(gallery).getByText(/Retry verification, go to bridge, complete swap/)).toBeInTheDocument();
    expect(within(gallery).getAllByText(/Export winners does not distribute rewards/).length).toBeGreaterThan(0);
    expect(within(gallery).getAllByText(/Final rewards are handled by the campaign project/).length).toBeGreaterThan(0);
    expect(within(gallery).getByText(/Contract claim mode requires admin approval/)).toBeInTheDocument();
    expect(within(gallery).getByText(/v0.1 full UI design screen 15 state delivery/)).toBeInTheDocument();
    expect(within(gallery).getByText(/v0.2 interaction design i18n state requirements/)).toBeInTheDocument();
    expect(within(gallery).getByText(/No live backend or API call/)).toBeInTheDocument();
    expect(within(gallery).getByText(/no wallet signing/)).toBeInTheDocument();
    expect(within(gallery).getByText(/no export file generation/)).toBeInTheDocument();
    expect(within(gallery).getByText(/no contract write/)).toBeInTheDocument();
    expect(within(gallery).getByText(/no reward custody/)).toBeInTheDocument();
    expect(
      within(gallery).queryByRole("button", {
        name: /publish|export|contract|reward|crawl|sync|sign/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("switches to Participants workspace and renders seeded operations boundaries", () => {
    render(<App />);

    clickWorkspace("Participants");

    const nav = getProjectWorkspaceNav();
    expect(within(nav).getByRole("button", { name: "Participants" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const participants = screen.getByLabelText("Participant operations");
    expect(
      within(participants).getByRole("heading", { name: "Participant operations" }),
    ).toBeInTheDocument();
    expect(within(participants).getByLabelText("Participant summary")).toBeInTheDocument();
    expect(within(participants).getByText("Wallet mix")).toBeInTheDocument();
    expect(within(participants).getByText("Locale mix")).toBeInTheDocument();
    expect(within(participants).getByText("2F4...9aB")).toBeInTheDocument();
    expect(within(participants).getByText("3E9...7cD")).toBeInTheDocument();
    expect(within(participants).getByText("5N1...4fA")).toBeInTheDocument();
    expect(within(participants).getByText("7P8...2bE")).toBeInTheDocument();
    expect(within(participants).getAllByText("Export ready").length).toBeGreaterThan(0);
    expect(within(participants).getAllByText("Review required").length).toBeGreaterThan(0);
    expect(within(participants).getAllByText("Blocked").length).toBeGreaterThan(0);
    expect(within(participants).getAllByText("Pending").length).toBeGreaterThan(0);
    expect(within(participants).getByText("manual_review_queue")).toBeInTheDocument();
    expect(within(participants).getByText("referral_velocity_review")).toBeInTheDocument();
    expect(within(participants).getAllByText(/does not distribute rewards/).length).toBeGreaterThan(0);
    expect(within(participants).queryByRole("button", { name: /distribute|reward/i })).not.toBeInTheDocument();

    const serviceReadiness = screen.getByLabelText("Points / Ranking / Referral Service Readiness");
    expect(
      within(serviceReadiness).getByRole("heading", {
        name: "Points / Ranking / Referral Service Readiness",
      }),
    ).toBeInTheDocument();
    for (const lane of [
      "Points ledger",
      "Ranking",
      "Referral",
      "Pixiepoints/backend handoff",
    ]) {
      expect(within(serviceReadiness).getByRole("heading", { name: lane })).toBeInTheDocument();
    }
    expect(within(serviceReadiness).getByText("Raw invites")).toBeInTheDocument();
    expect(within(serviceReadiness).getByText("Qualified invitees")).toBeInTheDocument();
    expect(within(serviceReadiness).getAllByText(/qualified invitees/).length).toBeGreaterThan(0);
    expect(within(serviceReadiness).getByText(/Raw invites: 22/)).toBeInTheDocument();
    expect(within(serviceReadiness).getByText(/Only qualified invitees/)).toBeInTheDocument();
    expect(within(serviceReadiness).getAllByText(/no live points ledger/).length).toBeGreaterThan(0);
    expect(within(serviceReadiness).getAllByText(/no live Referral backend/).length).toBeGreaterThan(0);
    expect(within(serviceReadiness).getAllByText(/does not distribute rewards/).length).toBeGreaterThan(0);
    expect(within(serviceReadiness).getAllByText(/review input/).length).toBeGreaterThan(0);
    expect(
      within(serviceReadiness).queryByRole("button", { name: /write|settle|claim|reward|contract/i }),
    ).not.toBeInTheDocument();
  });

  it("switches to Settings workspace and keeps readiness read-only", () => {
    render(<App />);

    clickWorkspace("Settings");

    const nav = getProjectWorkspaceNav();
    expect(within(nav).getByRole("button", { name: "Settings" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const settings = screen.getByLabelText("Settings readiness");
    expect(
      within(settings).getByRole("heading", { name: "Settings readiness" }),
    ).toBeInTheDocument();
    expect(within(settings).getByLabelText("Settings summary")).toBeInTheDocument();
    for (const group of [
      "Wallet policy",
      "Contract mode",
      "Reward responsibility",
      "i18n fallback",
      "Verification and risk posture",
      "Export policy",
      "Publish prerequisites",
    ]) {
      expect(within(settings).getByText(group)).toBeInTheDocument();
    }
    expect(within(settings).getAllByText("Ready").length).toBeGreaterThan(0);
    expect(within(settings).getAllByText("Review required").length).toBeGreaterThan(0);
    expect(within(settings).getAllByText("Blocked").length).toBeGreaterThan(0);
    expect(within(settings).getByText(/Read-only seeded\/local campaign settings readiness/)).toBeInTheDocument();
    expect(within(settings).getByText(/No live settings save/)).toBeInTheDocument();
    expect(within(settings).getAllByText(/reward distribution/).length).toBeGreaterThan(0);
    expect(within(settings).queryByRole("button", { name: /save|update|publish/i })).not.toBeInTheDocument();
  });

  it("switches to Closeout workspace and keeps retrospective review local-only", () => {
    render(<App />);

    clickWorkspace("Closeout");

    const nav = getProjectWorkspaceNav();
    expect(within(nav).getByRole("button", { name: "Closeout" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const closeout = screen.getByLabelText("Post-campaign retrospective");
    expect(
      within(closeout).getByRole("heading", { name: "Post-campaign retrospective" }),
    ).toBeInTheDocument();
    expect(within(closeout).getByLabelText("Closeout summary")).toBeInTheDocument();
    expect(within(closeout).getByLabelText("Closeout gates")).toBeInTheDocument();
    for (const gate of [
      "Analytics summary",
      "AI winner report review",
      "Export readiness",
      "Risk review",
      "Reward responsibility acknowledgement",
      "Final report archive",
      "Next-campaign recommendation",
    ]) {
      expect(within(closeout).getByText(gate)).toBeInTheDocument();
    }
    expect(within(closeout).getByLabelText("AI retrospective")).toBeInTheDocument();
    expect(within(closeout).getByText("Winner report")).toBeInTheDocument();
    expect(within(closeout).getByText("Human review required")).toBeInTheDocument();
    expect(within(closeout).getAllByText(/Reward responsibility/).length).toBeGreaterThan(0);
    expect(within(closeout).getAllByText(/No live analytics/).length).toBeGreaterThan(0);
    expect(within(closeout).getAllByText(/no reward custody or distribution/).length).toBeGreaterThan(0);
    expect(within(closeout).getAllByText(/does not distribute rewards/).length).toBeGreaterThan(0);
    expect(
      within(closeout).queryByRole("button", {
        name: /distribute|claim|archive|export file|contract/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("switches to Create workspace and preserves the builder flow", () => {
    render(<App />);

    clickWorkspace("Create");

    const nav = getProjectWorkspaceNav();
    expect(within(nav).getByRole("button", { name: "Create" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    for (const step of ["Goal", "Tasks", "Rewards & Eligibility", "i18n", "Contract", "Publish readiness"]) {
      expect(screen.getAllByText(step).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText("Campaign Builder").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AI Campaign Planner").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Draft overview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Any wallet" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Rewards and eligibility setup" })).toBeInTheDocument();
    expect(screen.getByText("Campaign project")).toBeInTheDocument();
    expect(screen.getByText("Task points")).toBeInTheDocument();
    expect(screen.getByText("Top N")).toBeInTheDocument();
    expect(
      screen.getAllByText("High-reward social-heavy campaigns need risk review.").length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "i18n, contract, and review gates" })).toBeInTheDocument();
    expect(screen.getByLabelText("Translation Manager")).toBeInTheDocument();
    expect(screen.getAllByText("English source content").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Chinese AI draft").length).toBeGreaterThan(0);
    const rewardReviewGate = screen.getByLabelText("Reward disclaimer review");
    expect(within(rewardReviewGate).getByText("Review every localized reward disclaimer before publish.")).toBeInTheDocument();
    expect(within(rewardReviewGate).getAllByText("Blocks publish").length).toBeGreaterThan(0);
    expect(within(rewardReviewGate).getByText("Localized reward disclaimer is missing and blocks publish.")).toBeInTheDocument();
    expect(within(rewardReviewGate).getAllByText("Rewards are provided by the campaign project. Export winners does not distribute rewards.").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("AI generated translation cannot auto-publish before human review.").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("Chinese draft falls back to English until a project owner completes human review."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Compare with English")).toBeInTheDocument();
    expect(screen.getByText("Source and draft comparison")).toBeInTheDocument();
    expect(screen.getAllByText("Translation draft · zh-CN").length).toBeGreaterThan(0);
    for (const action of ["Generate with AI", "Compare with English", "Mark reviewed", "Publish revision", "Use English fallback"]) {
      expect(screen.getByRole("button", { name: action })).toBeInTheDocument();
    }
    expect(screen.getByLabelText("Contract Impact Review")).toBeInTheDocument();
    expect(screen.getByText("Safe default for MVP; no contract migration is required.")).toBeInTheDocument();
    expect(screen.getByText("Future / planned")).toBeInTheDocument();
    expect(screen.getByText("High-impact manual review blocker")).toBeInTheDocument();
    expect(
      screen.getByText("This review workbench does not distribute rewards, take reward custody, or execute contract transactions."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Publish readiness" })).toBeInTheDocument();
    expect(
      screen.getAllByText("Contract claim mode requires high-impact manual review.").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Switch to Off-chain MVP or complete contract reviewer approval.").length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Publish Gate Decision Center" })).toBeInTheDocument();
    expect(screen.getAllByText("Launch gate").length).toBeGreaterThan(0);
    expect(screen.getByText("Approval routing")).toBeInTheDocument();
    expect(screen.getByText("Any wallet allows AA and EOA users to participate.")).toBeInTheDocument();
    expect(screen.getByText(/No real publish/i)).toBeInTheDocument();
    expect(screen.getAllByText("Task Builder Preview").length).toBeGreaterThan(0);
    expect(screen.getByText("i18n Translation Review")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Task template library" })).not.toBeInTheDocument();
  });

  it("switches to Verification Rules workspace and renders rule review boundaries", () => {
    render(<App />);

    clickWorkspace("Verification Rules");

    const nav = getProjectWorkspaceNav();
    expect(within(nav).getByRole("button", { name: "Verification Rules" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const workspace = screen.getByLabelText("Verification Rules workspace");
    expect(within(workspace).getByRole("heading", { name: "Verification Rules" })).toBeInTheDocument();
    expect(within(workspace).getAllByText("7").length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText("Total paths").length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText("Seeded/local coverage").length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText("Missing live evidence").length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText("Blocked paths").length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText("Manual review paths").length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText("Provider launch blockers").length).toBeGreaterThan(0);

    expect(within(workspace).getAllByText("AeFinder on-chain verification").length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText("Social API verification").length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText("Manual review").length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText("Referral qualification").length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText("needs verified invitee").length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText(/qualified invitees/).length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText(/Fallback/).length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText(/Feature gate/).length).toBeGreaterThan(0);
    expect(within(workspace).getByText(/No live provider API call/)).toBeInTheDocument();
    expect(within(workspace).getByText(/wallet signing/)).toBeInTheDocument();
    expect(within(workspace).getByText(/contract root write/)).toBeInTheDocument();
    expect(within(workspace).getByText(/export file generation/)).toBeInTheDocument();
    expect(within(workspace).getByText(/reward distribution/)).toBeInTheDocument();
    expect(
      within(workspace).queryByRole("button", {
        name: /sign|contract|export|reward|distribute|claim|write/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("switches to Templates workspace and keeps template compatibility signals", () => {
    render(<App />);

    clickWorkspace("Templates");

    expect(screen.getByRole("heading", { name: "Campaign Template Pack" })).toBeInTheDocument();
    for (const presetName of [
      "aelf Onboarding Campaign",
      "Awaken Liquidity Challenge",
      "NFT Holder Quest",
      "DAO Governance Campaign",
      "AI Agent Coin Launch Campaign",
    ]) {
      expect(screen.getByText(presetName)).toBeInTheDocument();
    }
    expect(screen.getByText(/no live provider verification/i)).toBeInTheDocument();
    expect(screen.getByText(/automatic campaign creation/i)).toBeInTheDocument();
    expect(screen.getByText(/reward custody/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Campaign OS provides preset guidance/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Task template library" })).toBeInTheDocument();
    for (const category of [
      "wallet",
      "bridge",
      "swap",
      "liquidity",
      "nft",
      "schrodinger",
      "dao",
      "daipp",
      "pay",
      "forecast",
      "social",
      "invite",
    ]) {
      expect(screen.getByText(category)).toBeInTheDocument();
    }
    expect(screen.getAllByText("AA + EOA").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/zh-TW/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Task Builder Preview" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Publish Gate Decision Center" })).not.toBeInTheDocument();
  });

  it("switches to AI Content workspace and preserves review-only AI boundaries", () => {
    render(<App />);

    clickWorkspace("AI Content");

    const aiOptimizationSummary = screen.getByLabelText("AI Optimization summary");
    expect(
      within(aiOptimizationSummary).getByRole("heading", { name: "AI Optimization summary" }),
    ).toBeInTheDocument();
    expect(within(aiOptimizationSummary).getByText("Recommended action")).toBeInTheDocument();
    expect(within(aiOptimizationSummary).getByText("Owner-safe next action")).toBeInTheDocument();
    expect(
      within(aiOptimizationSummary).getAllByText("Review input / no auto-execution").length,
    ).toBeGreaterThan(0);
    expect(within(aiOptimizationSummary).getByText("Clarify bridge confirmation steps")).toBeInTheDocument();
    expect(within(aiOptimizationSummary).getByText(/Operator can review this recommendation/)).toBeInTheDocument();
    expect(within(aiOptimizationSummary).getByText(/No live AI provider/)).toBeInTheDocument();
    expect(within(aiOptimizationSummary).getAllByText(/automatic risk scoring/).length).toBeGreaterThan(0);
    expect(within(aiOptimizationSummary).getAllByText(/export/).length).toBeGreaterThan(0);
    expect(within(aiOptimizationSummary).getAllByText(/reward distribution/).length).toBeGreaterThan(0);
    expect(within(aiOptimizationSummary).getAllByText(/wallet action/).length).toBeGreaterThan(0);
    expect(within(aiOptimizationSummary).getAllByText(/contract execution/).length).toBeGreaterThan(0);
    expect(within(aiOptimizationSummary).queryByText(/shared funding/i)).not.toBeInTheDocument();
    expect(within(aiOptimizationSummary).queryByText(/\bban\b/i)).not.toBeInTheDocument();
    expect(within(aiOptimizationSummary).queryByText(/anti-sybil/i)).not.toBeInTheDocument();
    expect(within(aiOptimizationSummary).queryByText(/Risk signal/i)).not.toBeInTheDocument();

    const aiOpsKpiConsole = screen.getByLabelText("AI Ops KPI Adoption Console");
    expect(
      within(aiOpsKpiConsole).getByRole("heading", { name: "AI Ops KPI Adoption Console" }),
    ).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText("Total KPIs")).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText("Ready KPIs")).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText("Review KPIs")).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText("Blocked KPIs")).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText("Strongest signal")).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText("Top next action")).toBeInTheDocument();
    for (const metric of [
      "AI-generated campaign drafts",
      "AI content accepted rate",
      "Manual edit time saved",
      "AI reports generated",
      "Optimization suggestions adopted",
    ]) {
      expect(within(aiOpsKpiConsole).getByRole("heading", { name: metric })).toBeInTheDocument();
    }
    expect(within(aiOpsKpiConsole).getAllByText(/Value:/).length).toBeGreaterThan(0);
    expect(within(aiOpsKpiConsole).getAllByText(/Owner:/).length).toBeGreaterThan(0);
    expect(within(aiOpsKpiConsole).getAllByText(/Source:/).length).toBeGreaterThan(0);
    expect(within(aiOpsKpiConsole).getAllByText(/Evidence:/).length).toBeGreaterThan(0);
    expect(within(aiOpsKpiConsole).getAllByText(/Next action:/).length).toBeGreaterThan(0);
    expect(within(aiOpsKpiConsole).getByText(/Human acceptance before publish/)).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText(/Adoption requires human review/)).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText(/no automatic campaign rule changes/)).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText("KPI boundary")).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText(/No live AI provider/)).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText(/analytics SDK write/)).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText(/wallet action/)).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText(/contract transaction/)).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText(/reward distribution/)).toBeInTheDocument();
    expect(
      within(aiOpsKpiConsole).queryByRole("button", {
        name: /generate|accept|publish|export|wallet|contract|reward/i,
      }),
    ).not.toBeInTheDocument();

    const aiContentPack = screen.getByLabelText("AI Content Pack");
    expect(within(aiContentPack).getByRole("heading", { name: "AI Content Pack" })).toBeInTheDocument();
    expect(
      within(aiContentPack).getByText("Project-owner review of generated campaign copy, release intent, and quality gates."),
    ).toBeInTheDocument();
    expect(within(aiContentPack).getByText("Total artifacts")).toBeInTheDocument();
    expect(within(aiContentPack).getAllByText("Human approved").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getAllByText("AI drafts").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getAllByText("Copy ready").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getByText("Quality blockers")).toBeInTheDocument();
    expect(within(aiContentPack).getByText(/Seeded\/local content pack only/)).toBeInTheDocument();
    for (const artifact of [
      "X / Twitter thread",
      "Telegram announcement",
      "Discord message",
      "FAQ",
      "Tutorial",
      "Daily report",
      "Winner report",
    ]) {
      expect(within(aiContentPack).getByText(artifact)).toBeInTheDocument();
    }
    expect(within(aiContentPack).getAllByText("Human review required").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getAllByText("Schedule ready").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getAllByText("Publish blocked").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getAllByText("en-US published").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getAllByText(/zh-CN/).length).toBeGreaterThan(0);
    expect(within(aiContentPack).getByRole("heading", { name: "Quality gates" })).toBeInTheDocument();
    expect(within(aiContentPack).getByText("Reward responsibility")).toBeInTheDocument();
    expect(within(aiContentPack).getByText("Winner rules")).toBeInTheDocument();
  });

  it("switches to Analytics workspace without rendering export controls", () => {
    render(<App />);

    clickWorkspace("Analytics");

    expect(screen.getByRole("heading", { name: "Analytics & Export Decision" })).toBeInTheDocument();
    const advancedAnalytics = screen.getByLabelText("Advanced Analytics readiness");
    expect(
      within(advancedAnalytics).getByRole("heading", { name: "Advanced Analytics readiness" }),
    ).toBeInTheDocument();
    expect(within(advancedAnalytics).getByText("Cohorts")).toBeInTheDocument();
    expect(within(advancedAnalytics).getByText("Day 7 retention")).toBeInTheDocument();
    expect(within(advancedAnalytics).getByText("Day 30 retention")).toBeInTheDocument();
    expect(within(advancedAnalytics).getByText("Real user quality")).toBeInTheDocument();
    expect(within(advancedAnalytics).getByText("Cost per verified action")).toBeInTheDocument();
    expect(within(advancedAnalytics).getByText("Product conversion")).toBeInTheDocument();
    expect(within(advancedAnalytics).getByText("Premium analytics readiness")).toBeInTheDocument();
    for (const cohort of [
      "New AA users",
      "EOA power users",
      "Referral-driven users",
      "Risk review cohort",
    ]) {
      expect(within(advancedAnalytics).getByText(cohort)).toBeInTheDocument();
    }
    for (const product of ["eBridge", "Awaken", "Forest", "TMRWDAO", "daipp", "Pay", "Forecast", "Portfolio"]) {
      expect(within(advancedAnalytics).getByText(product)).toBeInTheDocument();
    }
    for (const report of [
      "Cohort report",
      "Retention report",
      "Real user quality",
      "Conversion report",
      "Risk report",
    ]) {
      expect(within(advancedAnalytics).getAllByText(report).length).toBeGreaterThan(0);
    }
    expect(within(advancedAnalytics).getByText(/No live analytics SDK/)).toBeInTheDocument();
    expect(within(advancedAnalytics).getByText(/event warehouse/)).toBeInTheDocument();
    expect(within(advancedAnalytics).getByText(/billing/)).toBeInTheDocument();
    expect(screen.getByText("Largest drop-off")).toBeInTheDocument();
    expect(screen.getAllByText("Wallet connect conversion").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Task completion").length).toBeGreaterThan(0);
    expect(screen.getByText("AA / EOA split")).toBeInTheDocument();
    expect(screen.getByText("Locale coverage")).toBeInTheDocument();

    const localeAnalytics = screen.getByLabelText("Locale analytics readiness");
    expect(
      within(localeAnalytics).getByRole("heading", { name: "Locale analytics readiness" }),
    ).toBeInTheDocument();
    for (const locale of ["en-US", "zh-CN", "zh-TW"]) {
      expect(within(localeAnalytics).getByRole("heading", { name: locale })).toBeInTheDocument();
    }
    for (const metric of [
      "Campaign views",
      "Wallet connect conversion",
      "Task completion",
      "Referral conversion",
      "Translation fallback rate",
      "AI draft accepted rate",
      "Manual edit time",
    ]) {
      expect(within(localeAnalytics).getAllByText(metric).length).toBeGreaterThan(0);
    }
    expect(within(localeAnalytics).getByText(/No live analytics SDK/)).toBeInTheDocument();
    expect(screen.queryByText("Ready rows")).not.toBeInTheDocument();
    expect(screen.queryByText(EXPORT_CSV_COLUMNS.join(","))).not.toBeInTheDocument();
  });

  it("switches to Export workspace and keeps CSV, service, and API boundaries", () => {
    render(<App />);

    clickWorkspace("Export");

    expect(screen.getByRole("heading", { name: "Export Decision" })).toBeInTheDocument();
    expect(screen.getAllByText("Ready rows").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Review-required rows").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Blocked rows").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1 / 3 / 0").length).toBeGreaterThan(0);
    expect(screen.getByText("CSV columns")).toBeInTheDocument();
    expect(screen.getAllByText(EXPORT_CSV_COLUMNS.join(",")).length).toBeGreaterThan(0);
    expect(screen.getByText(/Campaign OS exports verified records only/)).toBeInTheDocument();
    expect(screen.getByText(/Local export artifact only/)).toBeInTheDocument();
    const localArtifact = screen.getByLabelText("Local export artifact");
    expect(within(localArtifact).getByText("camp-awaken-sprint-export-awaken-sprint-preview-local-review.csv")).toBeInTheDocument();
    expect(within(localArtifact).getByText("CSV")).toBeInTheDocument();
    expect(within(localArtifact).getByText(/Artifact batch: export-awaken-sprint-preview/)).toBeInTheDocument();
    expect(within(localArtifact).getByText("Checksum")).toBeInTheDocument();
    expect(within(localArtifact).getByText(/^local-[0-9a-f]{8}$/)).toBeInTheDocument();
    expect(within(localArtifact).getByText("Payload bytes")).toBeInTheDocument();
    expect(within(localArtifact).getByText(/Artifact rows: 1 \/ 3 \/ 0/)).toBeInTheDocument();
    expect(within(localArtifact).getAllByText("No download URL").length).toBeGreaterThan(0);
    expect(within(localArtifact).getAllByText("No storage write").length).toBeGreaterThan(0);
    expect(within(localArtifact).getAllByText("No contract root").length).toBeGreaterThan(0);
    expect(within(localArtifact).getAllByText("No reward distribution").length).toBeGreaterThan(0);
    expect(within(localArtifact).getByText(/no download URL, storage write, contract root/)).toBeInTheDocument();
    expect(within(localArtifact).queryByText(/Download ready/i)).not.toBeInTheDocument();
    expect(within(localArtifact).queryByText(/Stored/i)).not.toBeInTheDocument();
    expect(within(localArtifact).queryByText(/Contract root generated/i)).not.toBeInTheDocument();
    expect(within(localArtifact).queryByText(/Rewards distributed/i)).not.toBeInTheDocument();

    const fulfillmentReadiness = screen.getByLabelText("Export fulfillment readiness");
    expect(
      within(fulfillmentReadiness).getByRole("heading", { name: "Export fulfillment readiness" }),
    ).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getByText("Handoff status")).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getByText("Owner approved")).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getByText("1 / 3 / 0")).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getByText("camp-awaken-sprint-export-awaken-sprint-preview-csv-local-fulfillment")).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getByText("camp-awaken-sprint-export-awaken-sprint-preview-json-local-fulfillment")).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getAllByText(/^local-[0-9a-f]{8}$/).length).toBeGreaterThan(1);
    expect(within(fulfillmentReadiness).getAllByText("No download URL").length).toBeGreaterThan(0);
    expect(within(fulfillmentReadiness).getAllByText("No storage write").length).toBeGreaterThan(0);
    expect(within(fulfillmentReadiness).getAllByText("No contract root").length).toBeGreaterThan(0);
    expect(within(fulfillmentReadiness).getAllByText("No reward distribution").length).toBeGreaterThan(0);
    expect(within(fulfillmentReadiness).getAllByText(/storage-backed export/).length).toBeGreaterThan(0);
    expect(within(fulfillmentReadiness).getAllByText(/Local export fulfillment handoff only/).length).toBeGreaterThan(0);
    expect(
      within(fulfillmentReadiness).queryByRole("button", {
        name: /download|storage|claim|reward|contract/i,
      }),
    ).not.toBeInTheDocument();

    const exportReadiness = screen.getByLabelText("Export confirmation readiness");
    expect(
      within(exportReadiness).getByRole("heading", { name: "Export confirmation readiness" }),
    ).toBeInTheDocument();
    expect(within(exportReadiness).getAllByText("CSV preview").length).toBeGreaterThan(0);
    expect(within(exportReadiness).getAllByText("JSON preview").length).toBeGreaterThan(0);
    expect(within(exportReadiness).getByText("Required export fields")).toBeInTheDocument();
    expect(within(exportReadiness).getAllByText("wallet_address").length).toBeGreaterThan(0);
    expect(within(exportReadiness).getAllByText("locale_preference").length).toBeGreaterThan(0);
    expect(within(exportReadiness).getAllByText("Row reason coverage").length).toBeGreaterThan(0);
    expect(within(exportReadiness).getByText("Eligible verified row")).toBeInTheDocument();
    expect(within(exportReadiness).getByText("Risk review required")).toBeInTheDocument();
    expect(within(exportReadiness).getByText("Project acknowledgements")).toBeInTheDocument();
    expect(within(exportReadiness).getByText("Project owns final reward distribution")).toBeInTheDocument();
    expect(within(exportReadiness).getByText("No real export file")).toBeInTheDocument();
    expect(within(exportReadiness).getByText("Contract root readiness")).toBeInTheDocument();
    expect(within(exportReadiness).getByText("No contract root")).toBeInTheDocument();
    expect(within(exportReadiness).getByText("Eligibility root")).toBeInTheDocument();
    expect(within(exportReadiness).getByText("Winners root")).toBeInTheDocument();
    expect(within(exportReadiness).getByText("Contract claim")).toBeInTheDocument();
    expect(within(exportReadiness).getByText(/No real CSV or JSON file/)).toBeInTheDocument();

    const serviceFacade = screen.getByLabelText("Local API Service Facade");
    expect(
      within(serviceFacade).getByRole("heading", { name: "Local API Service Facade" }),
    ).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Service coverage")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Total services")).toBeInTheDocument();
    expect(within(serviceFacade).getAllByText("Ready").length).toBeGreaterThan(0);
    expect(within(serviceFacade).getByText("10 Local only")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Review required")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Blocked")).toBeInTheDocument();
    for (const coverage of ["wallet coverage", "task verification", "eligibility", "i18n", "analytics", "export", "content", "summary"]) {
      expect(within(serviceFacade).getAllByText(coverage).length).toBeGreaterThan(0);
    }
    expect(within(serviceFacade).getByText("generateI18nDraft")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("addTask")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("exportWinners")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("requestAgentWalletAction")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Verification coverage")).toBeInTheDocument();
    expect(within(serviceFacade).getAllByText("Provider readiness").length).toBeGreaterThan(0);
    expect(within(serviceFacade).getByText("Evidence categories")).toBeInTheDocument();
    expect(within(serviceFacade).getAllByText("MANUAL_REVIEW").length).toBeGreaterThan(0);
    expect(
      within(serviceFacade).getByRole("heading", { name: "Verification pipeline readiness" }),
    ).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Seeded/local coverage")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Live evidence")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Task outcome coverage")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Eligibility impact")).toBeInTheDocument();
    for (const path of [
      "AeFinder on-chain verification",
      "AelfScan on-chain verification",
      "dApp API verification",
      "Social API verification",
      "Wallet session verification",
      "Manual review",
      "Referral qualification",
    ]) {
      expect(within(serviceFacade).getAllByText(path).length).toBeGreaterThan(0);
    }
    expect(
      within(serviceFacade).getByText("Eligibility depends on required task verification, qualified invitees, risk review, and manual-review outcomes."),
    ).toBeInTheDocument();
    expect(
      within(serviceFacade).getAllByText(/No live backend\/API, wallet signature, secret storage, real export file, reward distribution, or contract root write/).length,
    ).toBeGreaterThan(0);
    expect(within(serviceFacade).getByText(/No live API, wallet SDK, provider, secret storage/)).toBeInTheDocument();
    expect(
      within(serviceFacade).getAllByText(/No live AeFinder, AelfScan, dApp API, social API, wallet SDK, reward distribution, export file, secret storage, or contract write/).length,
    ).toBeGreaterThan(0);

    const walletAdapterReadiness = screen.getByLabelText("aelf-web-login adapter readiness");
    expect(
      within(walletAdapterReadiness).getByRole("heading", {
        name: "aelf-web-login adapter readiness",
      }),
    ).toBeInTheDocument();
    expect(within(walletAdapterReadiness).getByText("Configured adapters")).toBeInTheDocument();
    expect(within(walletAdapterReadiness).getByText(/Enabled preview/)).toBeInTheDocument();
    expect(within(walletAdapterReadiness).getByText("Missing live evidence")).toBeInTheDocument();
    expect(within(walletAdapterReadiness).getByText("Release blockers")).toBeInTheDocument();
    expect(within(walletAdapterReadiness).getByText("Portkey AA")).toBeInTheDocument();
    expect(within(walletAdapterReadiness).getByText("Portkey EOA App / Discover")).toBeInTheDocument();
    expect(within(walletAdapterReadiness).getByText("Future EOA adapter")).toBeInTheDocument();
    expect(within(walletAdapterReadiness).queryByText("Agent Skill wallet")).not.toBeInTheDocument();
    expect(within(walletAdapterReadiness).getAllByText(/Feature gate: enabled preview/).length).toBeGreaterThan(0);
    expect(within(walletAdapterReadiness).getAllByText(/Live evidence: missing/).length).toBeGreaterThan(0);
    expect(within(walletAdapterReadiness).getByText(/Future EOA adapter is maintenance-only/)).toBeInTheDocument();
    expect(within(walletAdapterReadiness).getByText(/Show Future EOA adapter as maintenance/)).toBeInTheDocument();
    expect(within(walletAdapterReadiness).getByText(/no live wallet SDK connection/)).toBeInTheDocument();

    const liveConnectorBoundary = screen.getByLabelText("Live wallet connector boundary");
    expect(
      within(liveConnectorBoundary).getByRole("heading", {
        name: "Live wallet connector boundary",
      }),
    ).toBeInTheDocument();
    expect(within(liveConnectorBoundary).getByText("Connector candidates")).toBeInTheDocument();
    expect(within(liveConnectorBoundary).getAllByText("Missing live evidence").length).toBeGreaterThan(0);
    expect(within(liveConnectorBoundary).getByText("Portkey AA live connector")).toBeInTheDocument();
    expect(within(liveConnectorBoundary).getByText("Portkey Discover EOA live connector")).toBeInTheDocument();
    expect(
      within(liveConnectorBoundary).getAllByText(/@aelf-web-login\/wallet-adapter-portkey-aa/).length,
    ).toBeGreaterThan(0);
    expect(within(liveConnectorBoundary).getByText(/Configuration gate required/)).toBeInTheDocument();
    expect(
      within(liveConnectorBoundary).getByText(/Live wallet connector execution is disabled by default/),
    ).toBeInTheDocument();
    expect(within(liveConnectorBoundary).queryByText(/production wallet connection is available/i)).not.toBeInTheDocument();

    const providerRegistry = screen.getByLabelText("Provider evidence registry");
    expect(
      within(providerRegistry).getByRole("heading", { name: "Provider evidence registry" }),
    ).toBeInTheDocument();
    expect(within(providerRegistry).getByText("Registry entries")).toBeInTheDocument();
    expect(within(providerRegistry).getByText("Missing live evidence")).toBeInTheDocument();
    expect(within(providerRegistry).getByText("Local-only paths")).toBeInTheDocument();
    expect(within(providerRegistry).getByText("Review-required paths")).toBeInTheDocument();
    expect(within(providerRegistry).getByText("Unavailable paths")).toBeInTheDocument();
    expect(within(providerRegistry).getAllByText("Launch blockers").length).toBeGreaterThan(0);
    expect(within(providerRegistry).getByText("AeFinder on-chain verification")).toBeInTheDocument();
    expect(within(providerRegistry).getByText("Social API verification")).toBeInTheDocument();
    expect(within(providerRegistry).getAllByText(/Feature gate/).length).toBeGreaterThan(0);
    expect(within(providerRegistry).getAllByText(/Fallback/).length).toBeGreaterThan(0);
    expect(within(providerRegistry).getByText(/No live API, wallet SDK, provider credential/)).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "API / Skill Contracts" })).toBeInTheDocument();
    expect(screen.getByText("Read-only contract registry for future agents and APIs.")).toBeInTheDocument();
    expect(screen.getByText("Total contracts")).toBeInTheDocument();
    expect(screen.getByText("create_campaign")).toBeInTheDocument();
    expect(screen.getByText("agent_wallet_action")).toBeInTheDocument();
    expect(screen.getByText("verify_task")).toBeInTheDocument();
    expect(screen.getByText("export_winners")).toBeInTheDocument();
    expect(screen.getByText("add_campaign_task")).toBeInTheDocument();
    expect(screen.getByText("generate_i18n_draft")).toBeInTheDocument();
    expect(screen.getByText("Agent Skill wallet action readiness")).toBeInTheDocument();
    expect(screen.getByText("agentId")).toBeInTheDocument();
    expect(screen.getByText("actionIntent")).toBeInTheDocument();
    expect(screen.getByText("humanApprovalState")).toBeInTheDocument();
    expect(screen.getByText("noPrivateKeyBoundary")).toBeInTheDocument();
    expect(screen.getByText("noSignatureExecution")).toBeInTheDocument();
    expect(screen.getByText("noTransactionExecution")).toBeInTheDocument();
    expect(screen.getByText("ownerAddress")).toBeInTheDocument();
    expect(screen.getByText("metadataUri")).toBeInTheDocument();
    expect(screen.getByText("rewardDisclaimerHash")).toBeInTheDocument();
    expect(screen.getAllByText("templateCode").length).toBeGreaterThan(0);
    expect(screen.getAllByText("evidenceRule").length).toBeGreaterThan(0);
    expect(screen.getAllByText("walletAddress").length).toBeGreaterThan(0);
    expect(screen.getAllByText("accountType").length).toBeGreaterThan(0);
    expect(screen.getByText("txId")).toBeInTheDocument();
    expect(screen.getByText("completedAt")).toBeInTheDocument();
    expect(screen.getAllByText("contentKeys").length).toBeGreaterThan(0);
    expect(screen.getByText("contractRootMode")).toBeInTheDocument();
    expect(
      screen.getAllByText("LOCAL_SEEDED, AEFINDER, AELFSCAN, DAPP_API, SOCIAL_API, WALLET_SESSION, MANUAL").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/does not call live APIs/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Locale analytics readiness")).not.toBeInTheDocument();
  });

  it("switches major Project Console copy manually to zh-CN", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "zh-CN" } });

    expect(screen.getByRole("heading", { name: "活动运营工作台" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "项目控制台" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const nav = screen.getByRole("navigation", { name: "项目控制台工作区导航" });
    for (const workspace of ["活动", "创建", "模板", "参与者", "AI 内容", "分析", "导出", "复盘", "设置"]) {
      expect(within(nav).getByRole("button", { name: workspace })).toBeInTheDocument();
    }
    expect(within(nav).getByRole("button", { name: "活动" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Awaken 冲刺活动" })).toBeInTheDocument();
    expect(screen.getByText("已连接钱包")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "活动指挥中心" })).toBeInTheDocument();
    expect(screen.getByText("4 个活动")).toBeInTheDocument();
    expect(screen.getByText("查看实时活动数据")).toBeInTheDocument();
    expect(screen.getByText("审核发布准备度")).toBeInTheDocument();
    expect(screen.getByText("批准导出预览")).toBeInTheDocument();
    expect(screen.getByText("归档最终报告")).toBeInTheDocument();
    const zhLifecycleOperations = screen.getByLabelText("Lifecycle 操作");
    expect(
      within(zhLifecycleOperations).getByRole("heading", { name: "Lifecycle 操作" }),
    ).toBeInTheDocument();
    expect(within(zhLifecycleOperations).getByText("当前状态")).toBeInTheDocument();
    expect(within(zhLifecycleOperations).getAllByText("项目方动作").length).toBeGreaterThan(0);
    expect(within(zhLifecycleOperations).getByText(/不会执行实时后端/)).toBeInTheDocument();
    const zhLaunchBundles = screen.getByLabelText("Launch Console 活动包");
    expect(
      within(zhLaunchBundles).getByRole("heading", { name: "Launch Console 活动包" }),
    ).toBeInTheDocument();
    expect(within(zhLaunchBundles).getByText("预热活动包")).toBeInTheDocument();
    expect(within(zhLaunchBundles).getByText("上线活动包")).toBeInTheDocument();
    expect(within(zhLaunchBundles).getByText("上线后活动包")).toBeInTheDocument();
    expect(within(zhLaunchBundles).getAllByText("本地预览").length).toBeGreaterThan(0);
    expect(within(zhLaunchBundles).getByText(/不会连接真实 Launch Console/)).toBeInTheDocument();
    const zhPortfolioReadiness = screen.getByLabelText("项目组合 readiness");
    expect(
      within(zhPortfolioReadiness).getByRole("heading", { name: "项目组合 readiness" }),
    ).toBeInTheDocument();
    for (const metric of [
      "已创建活动",
      "活跃项目",
      "活动配置耗时",
      "已承诺奖励预算",
      "Winners 导出",
      "项目重复使用",
    ]) {
      expect(within(zhPortfolioReadiness).getByText(metric)).toBeInTheDocument();
    }
    expect(within(zhPortfolioReadiness).getAllByText("商业化 readiness").length).toBeGreaterThan(0);
    expect(within(zhPortfolioReadiness).getByText("合作伙伴活动服务费")).toBeInTheDocument();
    expect(within(zhPortfolioReadiness).getByText("Premium analytics")).toBeInTheDocument();
    expect(within(zhPortfolioReadiness).getByText(/不会执行实时 billing、支付、发票、CRM、奖励托管/)).toBeInTheDocument();
    expect(within(zhPortfolioReadiness).getAllByText(/Campaign OS 不托管奖励、不发奖/).length).toBeGreaterThan(0);

    fireEvent.click(within(nav).getByRole("button", { name: "参与者" }));
    const zhParticipants = screen.getByLabelText("参与者运营");
    expect(
      within(zhParticipants).getByRole("heading", { name: "参与者运营" }),
    ).toBeInTheDocument();
    expect(within(zhParticipants).getByLabelText("参与者摘要")).toBeInTheDocument();
    expect(within(zhParticipants).getByText("钱包分布")).toBeInTheDocument();
    expect(within(zhParticipants).getByText("语言分布")).toBeInTheDocument();
    expect(within(zhParticipants).getByText("manual_review_queue")).toBeInTheDocument();
    expect(within(zhParticipants).getAllByText(/不执行发奖/).length).toBeGreaterThan(0);
    const zhServiceReadiness = screen.getByLabelText("Points / Ranking / Referral Service readiness");
    expect(
      within(zhServiceReadiness).getByRole("heading", {
        name: "Points / Ranking / Referral Service readiness",
      }),
    ).toBeInTheDocument();
    expect(within(zhServiceReadiness).getByRole("heading", { name: "积分账本" })).toBeInTheDocument();
    expect(within(zhServiceReadiness).getByRole("heading", { name: "Ranking" })).toBeInTheDocument();
    expect(within(zhServiceReadiness).getByRole("heading", { name: "Referral" })).toBeInTheDocument();
    expect(within(zhServiceReadiness).getByRole("heading", { name: "Pixiepoints/backend 交接" })).toBeInTheDocument();
    expect(within(zhServiceReadiness).getByText("Raw invites")).toBeInTheDocument();
    expect(within(zhServiceReadiness).getByText("合格邀请")).toBeInTheDocument();
    expect(within(zhServiceReadiness).getByText(/Raw invites: 22/)).toBeInTheDocument();
    expect(within(zhServiceReadiness).getAllByText(/不接入实时积分账本/).length).toBeGreaterThan(0);
    expect(within(zhServiceReadiness).getAllByText(/不接入实时 Referral backend/).length).toBeGreaterThan(0);
    expect(within(zhServiceReadiness).getAllByText(/不发放奖励/).length).toBeGreaterThan(0);

    fireEvent.click(within(nav).getByRole("button", { name: "创建" }));
    for (const step of ["目标", "任务", "奖励与资格", "i18n", "合约", "发布准备度"]) {
      expect(screen.getAllByText(step).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText("活动构建器").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "草稿概览" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "任意钱包" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { name: "奖励与资格设置" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "多语言、合约与审核门禁" })).toBeInTheDocument();
    expect(screen.getByLabelText("翻译管理")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "发布门禁决策中心" })).toBeInTheDocument();
    expect(screen.getByText(/不执行真实发布/)).toBeInTheDocument();

    fireEvent.click(within(nav).getByRole("button", { name: "模板" }));
    expect(screen.getByRole("heading", { name: "活动模板包" })).toBeInTheDocument();
    expect(screen.getByText("aelf 新手引导活动")).toBeInTheDocument();
    expect(screen.getByText("Awaken 流动性挑战")).toBeInTheDocument();
    expect(screen.getByText(/不会执行实时 provider 验证/)).toBeInTheDocument();
    expect(screen.getAllByText(/Campaign OS 只提供模板指引/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "任务模板库" })).toBeInTheDocument();
    expect(screen.getAllByText("连接钱包").length).toBeGreaterThan(0);

    fireEvent.click(within(nav).getByRole("button", { name: "分析" }));
    expect(screen.getByRole("heading", { name: "分析与导出决策" })).toBeInTheDocument();
    const zhAdvancedAnalytics = screen.getByLabelText("高级分析 readiness");
    expect(
      within(zhAdvancedAnalytics).getByRole("heading", { name: "高级分析 readiness" }),
    ).toBeInTheDocument();
    expect(within(zhAdvancedAnalytics).getByText("Day 7 留存")).toBeInTheDocument();
    expect(within(zhAdvancedAnalytics).getByText("Day 30 留存")).toBeInTheDocument();
    expect(within(zhAdvancedAnalytics).getByText("产品转化")).toBeInTheDocument();
    expect(within(zhAdvancedAnalytics).getByText("Premium analytics readiness")).toBeInTheDocument();
    expect(within(zhAdvancedAnalytics).getByText(/事件仓库/)).toBeInTheDocument();
    expect(screen.getByText("最大流失点")).toBeInTheDocument();
    const localeAnalytics = screen.getByLabelText("语言 analytics 就绪状态");
    expect(within(localeAnalytics).getAllByText("活动浏览").length).toBeGreaterThan(0);
    expect(within(localeAnalytics).getAllByText("钱包连接转化").length).toBeGreaterThan(0);
    expect(within(localeAnalytics).getAllByText("任务完成").length).toBeGreaterThan(0);
    expect(within(localeAnalytics).getAllByText("邀请转化").length).toBeGreaterThan(0);
    expect(within(localeAnalytics).getAllByText("翻译回退率").length).toBeGreaterThan(0);
    expect(within(localeAnalytics).getByText(/未接入实时 analytics SDK/)).toBeInTheDocument();

    fireEvent.click(within(nav).getByRole("button", { name: "导出" }));
    expect(screen.getByRole("heading", { name: "导出决策" })).toBeInTheDocument();
    expect(screen.getAllByText("就绪行").length).toBeGreaterThan(0);
    expect(screen.getAllByText("需复核行").length).toBeGreaterThan(0);
    expect(screen.getAllByText("阻断行").length).toBeGreaterThan(0);
    expect(screen.getAllByText(EXPORT_CSV_COLUMNS.join(",")).length).toBeGreaterThan(0);
    expect(screen.getByText(/只导出已验证记录/)).toBeInTheDocument();
    const exportArtifact = screen.getByLabelText("本地导出 artifact");
    expect(within(exportArtifact).getByText("camp-awaken-sprint-export-awaken-sprint-preview-local-review.csv")).toBeInTheDocument();
    expect(within(exportArtifact).getByText(/Artifact 批次: export-awaken-sprint-preview/)).toBeInTheDocument();
    expect(within(exportArtifact).getByText("不生成下载链接")).toBeInTheDocument();
    expect(within(exportArtifact).getByText("不写入存储")).toBeInTheDocument();
    expect(within(exportArtifact).getByText("不生成合约 root")).toBeInTheDocument();
    expect(within(exportArtifact).getByText("不发奖")).toBeInTheDocument();
    expect(within(exportArtifact).getByText(/仅本地导出 artifact/)).toBeInTheDocument();
    const fulfillmentReadiness = screen.getByLabelText("导出履约 readiness");
    expect(
      within(fulfillmentReadiness).getByRole("heading", { name: "导出履约 readiness" }),
    ).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getByText("项目方已批准")).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getByText("本地 package readiness")).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getByText("不生成下载链接")).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getByText("不写入存储")).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getByText("不生成合约 root")).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getByText("不发奖")).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getByText(/storage-backed 导出/)).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getAllByText(/本地导出履约交接/).length).toBeGreaterThan(0);
    const exportReadiness = screen.getByLabelText("导出确认 readiness");
    expect(
      within(exportReadiness).getByRole("heading", { name: "导出确认 readiness" }),
    ).toBeInTheDocument();
    expect(within(exportReadiness).getAllByText("CSV 预览").length).toBeGreaterThan(0);
    expect(within(exportReadiness).getAllByText("JSON 预览").length).toBeGreaterThan(0);
    expect(within(exportReadiness).getByText("必需导出字段")).toBeInTheDocument();
    expect(within(exportReadiness).getByText("项目方确认项")).toBeInTheDocument();
    expect(within(exportReadiness).getAllByText("Root 与 claim 执行阻断").length).toBeGreaterThan(0);
    expect(within(exportReadiness).getByText(/不会生成真实 CSV 或 JSON 文件/)).toBeInTheDocument();
    const serviceFacade = screen.getByLabelText("本地 API Service Facade");
    expect(
      within(serviceFacade).getByRole("heading", { name: "本地 API Service Facade" }),
    ).toBeInTheDocument();
    const providerRegistry = screen.getByLabelText("Provider 证据登记表");
    expect(
      within(providerRegistry).getByRole("heading", { name: "Provider 证据登记表" }),
    ).toBeInTheDocument();
    expect(within(providerRegistry).getByText("登记条目")).toBeInTheDocument();
    expect(within(providerRegistry).getByText("缺失真实 evidence")).toBeInTheDocument();
    expect(within(providerRegistry).getByText(/不会调用实时 API/)).toBeInTheDocument();
    const liveConnectorBoundary = screen.getByLabelText("Live wallet connector boundary");
    expect(within(liveConnectorBoundary).getByText("Connector 候选")).toBeInTheDocument();
    expect(within(liveConnectorBoundary).getAllByText("已关闭 / 需审核").length).toBeGreaterThan(0);
    expect(within(liveConnectorBoundary).getByText(/Live wallet connector 默认关闭/)).toBeInTheDocument();
    expect(screen.getByText("面向未来 agent 与 API 的只读 contract registry。")).toBeInTheDocument();
    expect(screen.getByText("创建活动草稿")).toBeInTheDocument();
    expect(screen.getByText("验证任务")).toBeInTheDocument();
    expect(screen.getByText("导出 winners")).toBeInTheDocument();
    expect(screen.getAllByText(/不会调用实时 API/).length).toBeGreaterThan(0);

    fireEvent.click(within(nav).getByRole("button", { name: "复盘" }));
    const zhCloseout = screen.getByLabelText("活动后复盘");
    expect(
      within(zhCloseout).getByRole("heading", { name: "活动后复盘" }),
    ).toBeInTheDocument();
    expect(within(zhCloseout).getByLabelText("Closeout 摘要")).toBeInTheDocument();
    expect(within(zhCloseout).getByLabelText("Closeout 门禁")).toBeInTheDocument();
    expect(within(zhCloseout).getByLabelText("AI 复盘")).toBeInTheDocument();
    expect(within(zhCloseout).getAllByText(/Winner 报告/).length).toBeGreaterThan(0);
    expect(within(zhCloseout).getAllByText(/奖励责任/).length).toBeGreaterThan(0);
    expect(within(zhCloseout).getAllByText(/不接入实时 analytics/).length).toBeGreaterThan(0);
    expect(within(zhCloseout).getAllByText(/不托管或发放奖励/).length).toBeGreaterThan(0);
    expect(within(zhCloseout).queryByRole("button", { name: /发奖|claim|archive|export file|contract/i })).not.toBeInTheDocument();

    fireEvent.click(within(nav).getByRole("button", { name: "设置" }));
    const zhSettings = screen.getByLabelText("设置 readiness");
    expect(
      within(zhSettings).getByRole("heading", { name: "设置 readiness" }),
    ).toBeInTheDocument();
    expect(within(zhSettings).getByLabelText("设置摘要")).toBeInTheDocument();
    expect(within(zhSettings).getByText("钱包策略")).toBeInTheDocument();
    expect(within(zhSettings).getByText("奖励责任")).toBeInTheDocument();
    expect(within(zhSettings).getByText("导出策略")).toBeInTheDocument();
    expect(within(zhSettings).getByText(/不会保存真实设置/)).toBeInTheDocument();

    fireEvent.click(within(nav).getByRole("button", { name: "AI 内容" }));
    const aiContentPack = screen.getByLabelText("AI 内容包");
    expect(within(aiContentPack).getByRole("heading", { name: "AI 内容包" })).toBeInTheDocument();
    expect(within(aiContentPack).getByText("质量阻断")).toBeInTheDocument();
    expect(within(aiContentPack).getByText("奖励责任")).toBeInTheDocument();
  });

  it("keeps User App and Admin/Ops reachable from navigation", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "User App" }));
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect Wallet" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Admin/Ops" }));
    expect(screen.getByRole("heading", { name: "Review queue" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Template Governance" })).toBeInTheDocument();
  });
});
