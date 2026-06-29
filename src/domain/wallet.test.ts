import { describe, expect, it } from "vitest";
import {
  createWalletConnectionDiagnostics,
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
});
