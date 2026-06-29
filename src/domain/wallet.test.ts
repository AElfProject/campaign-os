import { describe, expect, it } from "vitest";
import {
  createWalletConnectionDiagnostics,
  createWalletProviderQaReadinessGate,
  deriveEligibilityWalletStatus,
  normalizeWalletSessions,
  walletAdapterFixtures,
} from "./index";

describe("wallet locale coverage", () => {
  it("exposes zh-TW strings for wallet diagnostics and seeded status copy", () => {
    const sessions = normalizeWalletSessions(walletAdapterFixtures);
    const diagnostics = createWalletConnectionDiagnostics(sessions);

    expect(diagnostics.boundary["zh-TW"]).toContain("seeded");
    expect(diagnostics.groups.every((group) => group.title["zh-TW"])).toBe(true);
    expect(diagnostics.groups.every((group) => group.description["zh-TW"])).toBe(true);
    expect(diagnostics.qaChecklist.every((item) => item.label["zh-TW"] && item.evidence["zh-TW"])).toBe(true);

    const issueItems = diagnostics.groups.flatMap((group) => group.items);

    expect(issueItems.every((item) => item.statusMessage["zh-TW"])).toBe(true);
    expect(issueItems.every((item) => item.nextAction["zh-TW"])).toBe(true);
    expect(issueItems.every((item) => item.qaScenario["zh-TW"])).toBe(true);
    expect(issueItems.map((item) => item.verificationStatus)).toContain("wrong_chain");
  });

  it("keeps eligibility wallet status localized for zh-TW without changing policy semantics", () => {
    const restrictedSession = normalizeWalletSessions(walletAdapterFixtures).find(
      (session) => session.verificationStatus === "account_restricted",
    );

    expect(restrictedSession).toBeDefined();

    const walletStatus = deriveEligibilityWalletStatus(restrictedSession!, "AA_ONLY", [
      "task-bridge",
    ]);

    expect(walletStatus.eligible).toBe(false);
    expect(walletStatus.verificationStatus).toBe("account_restricted");
    expect(walletStatus.statusMessage["zh-TW"]).toContain("錢包");
    const { nextAction } = walletStatus;

    expect(nextAction).toBeDefined();
    expect(nextAction?.["zh-TW"]).toContain("錢包");
    expect(walletStatus.missingTasks).toEqual(["task-bridge"]);
  });

  it("creates a provider QA readiness gate without promoting seeded coverage to live evidence", () => {
    const sessions = normalizeWalletSessions(walletAdapterFixtures);
    const gate = createWalletProviderQaReadinessGate(sessions);
    const scenariosById = Object.fromEntries(gate.scenarios.map((scenario) => [scenario.id, scenario]));

    expect(gate.scenarios.map((scenario) => scenario.id)).toEqual([
      "portkey-aa-connect",
      "eoa-extension-connect",
      "wrong-chain-error",
      "unsupported-wallet-error",
    ]);
    expect(gate.summary).toEqual({
      totalScenarios: 4,
      seededReadyScenarios: 4,
      liveEvidenceReadyScenarios: 0,
      missingLiveEvidenceScenarios: 4,
      releaseBlockers: 0,
    });
    expect(scenariosById["portkey-aa-connect"]).toMatchObject({
      seededStatus: "ready",
      liveEvidenceStatus: "missing",
      releaseImpact: "needs_review",
      matchedSessionIds: ["sess-aa-001"],
    });
    expect(scenariosById["eoa-extension-connect"].matchedSessionIds).toEqual(["sess-eoa-001"]);
    expect(scenariosById["wrong-chain-error"].matchedSessionIds).toEqual(["sess-wrong-chain-001"]);
    expect(scenariosById["unsupported-wallet-error"].matchedSessionIds).toEqual([
      "sess-unsupported-001",
    ]);
    expect(gate.boundary["en-US"]).toContain("no live wallet SDK connection");
    expect(gate.boundary["en-US"]).toContain("real signature");
    expect(gate.boundary["en-US"]).toContain("reward custody");
    expect(gate.boundary["zh-CN"]).toContain("真实签名");
    expect(gate.boundary["zh-TW"]).toContain("真實簽名");
  });

  it("ignores address-only and internal-agent sessions for provider QA scenario matches", () => {
    const sessions = normalizeWalletSessions(
      walletAdapterFixtures.filter((fixture) =>
        ["sess-unknown-001", "sess-agent-skill-001"].includes(fixture.id),
      ),
    );
    const gate = createWalletProviderQaReadinessGate(sessions, {
      "portkey-aa-connect": "ready",
    });

    expect(gate.summary).toMatchObject({
      seededReadyScenarios: 0,
      liveEvidenceReadyScenarios: 1,
      missingLiveEvidenceScenarios: 3,
    });
    expect(gate.scenarios.every((scenario) => scenario.matchedSessionIds.length === 0)).toBe(true);
    expect(gate.scenarios.find((scenario) => scenario.id === "portkey-aa-connect")).toMatchObject({
      seededStatus: "missing",
      liveEvidenceStatus: "ready",
      releaseImpact: "ready",
    });
  });
});
