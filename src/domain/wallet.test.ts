import { describe, expect, it } from "vitest";
import {
  createAelfWebLoginAdapterReadiness,
  canonicalLiveWalletAccountTypes,
  canonicalLiveWalletChainIds,
  canonicalLiveWalletNetworks,
  canonicalLiveWalletSources,
  createLiveWalletConnectorBoundary,
  createWalletConnectionDiagnostics,
  createWalletProviderQaReadinessGate,
  deriveEligibilityWalletStatus,
  mapLiveWalletInfoToSessionCandidate,
  normalizeWalletSessions,
  isCanonicalLiveWalletAccountType,
  isCanonicalLiveWalletChainId,
  isCanonicalLiveWalletNetwork,
  isCanonicalLiveWalletSource,
  walletAdapterFixtures,
} from "./index";

describe("wallet locale coverage", () => {
  it("exports exhaustive canonical live-wallet guards without server credential models", () => {
    expect(canonicalLiveWalletAccountTypes).toEqual(["AA", "EOA"]);
    expect(canonicalLiveWalletSources).toEqual([
      "PORTKEY_AA",
      "PORTKEY_EOA_APP",
      "PORTKEY_EOA_EXTENSION",
      "NIGHTELF",
    ]);
    expect(canonicalLiveWalletChainIds).toEqual(["AELF", "tDVV", "tDVW"]);
    expect(canonicalLiveWalletNetworks).toEqual(["mainnet", "testnet"]);

    expect(isCanonicalLiveWalletAccountType("AA")).toBe(true);
    expect(isCanonicalLiveWalletAccountType("EOA")).toBe(true);
    expect(isCanonicalLiveWalletAccountType("UNKNOWN")).toBe(false);
    expect(isCanonicalLiveWalletSource("PORTKEY_AA")).toBe(true);
    expect(isCanonicalLiveWalletSource("AGENT_SKILL")).toBe(false);
    expect(isCanonicalLiveWalletSource("OTHER")).toBe(false);
    expect(isCanonicalLiveWalletChainId("AELF")).toBe(true);
    expect(isCanonicalLiveWalletChainId("ETH")).toBe(false);
    expect(isCanonicalLiveWalletNetwork("testnet")).toBe(true);
    expect(isCanonicalLiveWalletNetwork("unknown")).toBe(false);

    const exportedGuards = JSON.stringify({
      canonicalLiveWalletAccountTypes,
      canonicalLiveWalletChainIds,
      canonicalLiveWalletNetworks,
      canonicalLiveWalletSources,
    });
    expect(exportedGuards).not.toMatch(/credential|session|signature|package/i);
  });

  it("preserves documented public identity metadata for seeded AA and EOA sessions", () => {
    const sessions = normalizeWalletSessions(walletAdapterFixtures);
    const sessionsById = Object.fromEntries(sessions.map((session) => [session.id, session]));

    expect(sessionsById["sess-aa-001"]).toMatchObject({
      accounts: { AELF: "2F4...9aB" },
      publicKey: "PUB_AA_SEEDED_001",
    });
    expect(sessionsById["sess-eoa-app-001"]).toMatchObject({
      accounts: { AELF: "8A2...1eF" },
      publicKey: "PUB_EOA_APP_SEEDED_001",
    });
    expect(sessionsById["sess-unsupported-001"]).not.toHaveProperty("accounts");
    expect(sessionsById["sess-unknown-001"]).not.toHaveProperty("publicKey");

    const serialized = JSON.stringify(sessions);

    const unsafeKeys = [
      ["private", "Key"],
      ["seed", " phrase"],
      ["bear", "er "],
      ["signed", "Payload"],
      ["provider", "Credential"],
      ["raw", "Signature"],
    ].map((parts) => parts.join(""));

    for (const unsafe of unsafeKeys) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("preserves the documented EBRIDGE capability for bridge-capable AA and EOA sessions", () => {
    const sessions = normalizeWalletSessions(walletAdapterFixtures);
    const sessionsById = Object.fromEntries(sessions.map((session) => [session.id, session]));

    for (const sessionId of ["sess-aa-001", "sess-eoa-app-001", "sess-eoa-001"]) {
      expect(sessionsById[sessionId]?.capabilities).toContain("EBRIDGE");
    }

    for (const sessionId of ["sess-unsupported-001", "sess-unknown-001", "sess-agent-skill-001"]) {
      expect(sessionsById[sessionId]?.capabilities).not.toContain("EBRIDGE");
    }
  });

  it("creates a local aelf-web-login adapter readiness contract without live evidence promotion", () => {
    const sessions = normalizeWalletSessions(walletAdapterFixtures);
    const readiness = createAelfWebLoginAdapterReadiness(sessions);
    const entriesById = Object.fromEntries(readiness.entries.map((entry) => [entry.adapterId, entry]));

    expect(readiness.integrationId).toBe("aelf-web-login");
    expect(readiness.entries.map((entry) => entry.adapterId)).toEqual([
      "portkey-aa",
      "portkey-eoa-app",
      "portkey-eoa-extension",
      "nightelf",
      "future-eoa-adapter",
      "agent-skill-internal",
    ]);
    expect(readiness.summary).toMatchObject({
      totalAdapters: 6,
      configuredAdapters: 6,
      enabledPreviewAdapters: 4,
      disabledAdapters: 1,
      maintenanceAdapters: 1,
      publicUserAdapters: 5,
      internalOnlyAdapters: 1,
      seededReadyAdapters: 5,
      liveEvidenceReadyAdapters: 0,
      missingLiveEvidenceAdapters: 5,
      releaseBlockers: 0,
      recommendedAdapterId: "portkey-aa",
    });
    expect(entriesById["portkey-aa"]).toMatchObject({
      accountType: "AA",
      capabilities: expect.arrayContaining(["EBRIDGE"]),
      walletSource: "PORTKEY_AA",
      readiness: "local_only",
      liveEvidenceStatus: "missing",
      seededCoverageStatus: "ready",
      matchedSessionIds: ["sess-aa-001", "sess-account-restricted-001"],
    });
    expect(entriesById["portkey-eoa-app"]?.capabilities).toContain("EBRIDGE");
    expect(entriesById["portkey-eoa-extension"]?.capabilities).toContain("EBRIDGE");
    expect(entriesById["agent-skill-internal"]?.capabilities).not.toContain("EBRIDGE");
    expect(entriesById["future-eoa-adapter"]).toMatchObject({
      readiness: "maintenance",
      seededCoverageStatus: "missing",
      featureGate: expect.objectContaining({ state: "maintenance" }),
      fallback: expect.objectContaining({ mode: "maintenance" }),
    });
    expect(readiness.normalUserEntries.map((entry) => entry.adapterId)).not.toContain(
      "agent-skill-internal",
    );
    expect(readiness.internalEntries.map((entry) => entry.adapterId)).toEqual([
      "agent-skill-internal",
    ]);
    expect(readiness.boundary["en-US"]).toContain("no live wallet SDK connection");
    expect(readiness.boundary["zh-CN"]).toContain("不会连接实时钱包 SDK");
    expect(readiness.boundary["zh-TW"]).toContain("不會連接即時錢包 SDK");
    expect(
      readiness.entries
        .filter((entry) => entry.readiness !== "ready")
        .every((entry) => entry.fallback.reason["zh-TW"] && entry.nextAction["zh-CN"]),
    ).toBe(true);
  });

  it("keeps adapter readiness fail-closed and free of live wallet output fields", () => {
    const readiness = createAelfWebLoginAdapterReadiness(
      normalizeWalletSessions(walletAdapterFixtures),
      {
        "portkey-aa": "ready",
        "portkey-eoa-extension": "blocked",
      },
    );
    const entriesById = Object.fromEntries(readiness.entries.map((entry) => [entry.adapterId, entry]));
    expect(entriesById["portkey-aa"]).toMatchObject({
      liveEvidenceStatus: "ready",
      readiness: "ready",
      releaseImpact: "ready",
    });
    expect(entriesById["portkey-eoa-extension"]).toMatchObject({
      liveEvidenceStatus: "blocked",
      readiness: "blocked",
      releaseImpact: "release_blocker",
      fallback: expect.objectContaining({ blocksLaunch: true, mode: "blocked" }),
    });
    expect(readiness.summary.liveEvidenceReadyAdapters).toBe(1);
    expect(readiness.summary.releaseBlockers).toBe(1);

    for (const unsafe of [
      "privateKey",
      "seedPhrase",
      "recoveryPhrase",
      "oauthToken",
      "apiKey",
      "signature",
      "signedPayload",
      "transactionId",
      "contractRoot",
      "fileUrl",
      "downloadUrl",
      "rawProvider",
      "providerCredential",
    ]) {
      expect(Object.prototype.hasOwnProperty.call(readiness, unsafe)).toBe(false);
      expect(JSON.stringify(readiness)).not.toContain(`"${unsafe}"`);
    }
    expect(readiness.boundary["en-US"]).toContain("reward custody");
    expect(readiness.boundary["en-US"]).toContain("reward distribution");
  });

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
      "extension-not-installed-error",
      "wrong-chain-error",
      "unsupported-wallet-error",
    ]);
    expect(gate.summary).toEqual({
      totalScenarios: 5,
      seededReadyScenarios: 5,
      liveEvidenceReadyScenarios: 0,
      missingLiveEvidenceScenarios: 5,
      releaseBlockers: 0,
    });
    expect(scenariosById["portkey-aa-connect"]).toMatchObject({
      seededStatus: "ready",
      liveEvidenceStatus: "missing",
      releaseImpact: "needs_review",
      matchedSessionIds: ["sess-aa-001"],
    });
    expect(scenariosById["eoa-extension-connect"].matchedSessionIds).toEqual(["sess-eoa-001"]);
    expect(scenariosById["extension-not-installed-error"]).toMatchObject({
      seededStatus: "ready",
      liveEvidenceStatus: "missing",
      matchedSessionIds: ["sess-eoa-extension-missing-001"],
    });
    expect(scenariosById["extension-not-installed-error"].nextAction["en-US"]).toContain(
      "extension-not-installed",
    );
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
      missingLiveEvidenceScenarios: 4,
    });
    expect(gate.scenarios.every((scenario) => scenario.matchedSessionIds.length === 0)).toBe(true);
    expect(gate.scenarios.find((scenario) => scenario.id === "portkey-aa-connect")).toMatchObject({
      seededStatus: "missing",
      liveEvidenceStatus: "ready",
      releaseImpact: "ready",
    });
  });

  it("creates a disabled-by-default live wallet connector boundary without live SDK promotion", () => {
    const boundary = createLiveWalletConnectorBoundary();
    const entriesById = Object.fromEntries(boundary.entries.map((entry) => [entry.connectorId, entry]));

    expect(boundary.integrationId).toBe("aelf-web-login");
    expect(boundary.entries.map((entry) => entry.connectorId)).toEqual([
      "portkey-aa-live",
      "portkey-discover-eoa-live",
      "portkey-eoa-extension-live",
      "nightelf-live",
    ]);
    expect(boundary.summary).toMatchObject({
      totalConnectors: 4,
      disabledConnectors: 4,
      approvedConnectors: 0,
      missingLiveEvidenceConnectors: 4,
      releaseBlockers: 0,
    });
    expect(entriesById["portkey-aa-live"]).toMatchObject({
      accountType: "AA",
      adapterId: "portkey-aa",
      dependencyRisk: "high",
      featureGateState: "disabled",
      packageName: "@aelf-web-login/wallet-adapter-portkey-aa",
      packageVersionSource: "candidate:0.4.0-alpha.21",
      readiness: "disabled",
      releaseImpact: "needs_review",
      walletSource: "PORTKEY_AA",
    });
    expect(entriesById["portkey-discover-eoa-live"]).toMatchObject({
      accountType: "EOA",
      walletSource: "PORTKEY_EOA_APP",
    });
    expect(entriesById["portkey-eoa-extension-live"]?.capabilities).toContain("EBRIDGE");
    expect(entriesById["nightelf-live"]).toMatchObject({
      packageName: "@aelf-web-login/wallet-adapter-night-elf",
      walletSource: "NIGHTELF",
    });
    expect(boundary.packageCandidates.map((candidate) => candidate.packageName)).toEqual(
      expect.arrayContaining([
        "aelf-web-login",
        "@aelf-web-login/wallet-adapter-base",
        "@aelf-web-login/wallet-adapter-react",
      ]),
    );
    expect(boundary.forbiddenOperations.map((operation) => operation.name)).toEqual([
      "connectWallet",
      "getSignature",
      "callSendMethod",
      "callViewMethod",
      "sendMultiTransaction",
      "requestAccounts",
      "switchChain",
      "sendTransaction",
      "contractView",
      "contractSend",
    ]);
    expect(boundary.forbiddenOperations.every((operation) => operation.state === "blocked")).toBe(true);
    expect(boundary.boundary["en-US"]).toContain("disabled by default");
    expect(boundary.boundary["zh-CN"]).toContain("默认关闭");
    expect(boundary.boundary["zh-TW"]).toContain("預設關閉");
  });

  it("requires explicit gate evidence and approval before a connector can be future-ready", () => {
    const boundary = createLiveWalletConnectorBoundary({
      featureGates: {
        "portkey-aa-live": "approved",
        "portkey-eoa-extension-live": "blocked",
        "portkey-discover-eoa-live": "preview",
      },
      liveEvidence: {
        "portkey-aa-live": "ready",
        "portkey-eoa-extension-live": "blocked",
      },
      reviewApprovals: {
        "portkey-aa-live": true,
      },
    });
    const entriesById = Object.fromEntries(boundary.entries.map((entry) => [entry.connectorId, entry]));

    expect(entriesById["portkey-aa-live"]).toMatchObject({
      featureGateState: "approved",
      liveEvidenceStatus: "ready",
      readiness: "approved",
      releaseImpact: "future_ready",
    });
    expect(entriesById["portkey-discover-eoa-live"]).toMatchObject({
      featureGateState: "preview",
      liveEvidenceStatus: "missing",
      readiness: "review_required",
      releaseImpact: "needs_review",
    });
    expect(entriesById["portkey-eoa-extension-live"]).toMatchObject({
      featureGateState: "blocked",
      readiness: "blocked",
      releaseImpact: "release_blocker",
    });
    expect(boundary.summary).toMatchObject({
      approvedConnectors: 1,
      releaseBlockers: 1,
    });
  });

  it("maps live adapter wallet info into credential-free normalized session candidates", () => {
    const portkeyAa = mapLiveWalletInfoToSessionCandidate({
      adapterName: "PortkeyAAWallet",
      address: "ELF_2F49AB",
      chainId: "AELF",
      network: "mainnet",
      signaturePresent: true,
      walletName: "Portkey AA",
    });
    const discover = mapLiveWalletInfoToSessionCandidate({
      adapterName: "PortkeyDiscoverWallet",
      address: "ELF_8A21EF",
      chainId: "AELF",
      network: "mainnet",
      signaturePresent: true,
    });
    const extension = mapLiveWalletInfoToSessionCandidate({
      adapterName: "PortkeyExtensionWallet",
      address: "ELF_3E97CD",
      chainId: "AELF",
      network: "mainnet",
      signaturePresent: true,
    });
    const nightElf = mapLiveWalletInfoToSessionCandidate({
      adapterName: "NightElfWallet",
      address: "ELF_5N14FA",
      chainId: "AELF",
      network: "mainnet",
      signaturePresent: true,
    });

    expect(portkeyAa).toMatchObject({
      accountType: "AA",
      address: "ELF_2F49AB",
      signatureStatus: "signed",
      verificationStatus: "verified",
      walletSource: "PORTKEY_AA",
      walletTypeVerified: true,
    });
    expect(portkeyAa.capabilities).toEqual(
      expect.arrayContaining(["SIGN_MESSAGE", "VIEW_BALANCE", "CONTRACT_VIEW", "EBRIDGE"]),
    );
    expect(discover).toMatchObject({
      accountType: "EOA",
      walletSource: "PORTKEY_EOA_APP",
      walletTypeVerified: true,
    });
    expect(extension).toMatchObject({
      accountType: "EOA",
      walletSource: "PORTKEY_EOA_EXTENSION",
      walletTypeVerified: true,
    });
    expect(nightElf).toMatchObject({
      accountType: "EOA",
      walletSource: "NIGHTELF",
      walletTypeVerified: true,
    });
    expect(nightElf.capabilities).not.toContain("EBRIDGE");

    const serialized = JSON.stringify([portkeyAa, discover, extension, nightElf]);
    for (const unsafe of [
      "privateKey",
      "seedPhrase",
      "recoveryPhrase",
      "oauthToken",
      "apiKey",
      "rawSignature",
      "signedPayload",
      "providerCredential",
      "transactionId",
      "contractRoot",
      "downloadUrl",
      "fileUrl",
      "campaign-os-kitty",
      "kitty-specs",
      "docs/current",
    ]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("fails live wallet info mapping closed for unsupported or incomplete adapter data", () => {
    expect(
      mapLiveWalletInfoToSessionCandidate({
        adapterName: "PortkeyAAWallet",
        chainId: "AELF",
        network: "mainnet",
        signaturePresent: true,
      }),
    ).toMatchObject({
      accountType: "UNKNOWN",
      signatureStatus: "not_available",
      verificationStatus: "address_only",
      walletSource: "OTHER",
      walletTypeVerified: false,
    });
    expect(
      mapLiveWalletInfoToSessionCandidate({
        adapterName: "UnknownWallet",
        address: "ELF_UNKNOWN",
        chainId: "AELF",
        network: "mainnet",
        signaturePresent: true,
      }),
    ).toMatchObject({
      accountType: "UNKNOWN",
      verificationStatus: "unsupported_wallet",
      walletSource: "OTHER",
      walletTypeVerified: false,
    });
    expect(
      mapLiveWalletInfoToSessionCandidate({
        adapterName: "PortkeyExtensionWallet",
        chainId: "AELF",
        extensionAvailable: false,
        network: "mainnet",
        signaturePresent: true,
      }),
    ).toMatchObject({
      accountType: "EOA",
      signatureStatus: "not_available",
      verificationStatus: "extension_not_installed",
      walletSource: "PORTKEY_EOA_EXTENSION",
      walletTypeVerified: false,
      nextAction: expect.objectContaining({
        "en-US": expect.stringContaining("Install or open your EOA wallet extension"),
      }),
    });
    expect(
      mapLiveWalletInfoToSessionCandidate({
        adapterName: "PortkeyExtensionWallet",
        address: "ELF_WRONG",
        chainId: "tDVV",
        network: "testnet",
        signaturePresent: true,
      }),
    ).toMatchObject({
      verificationStatus: "wrong_chain",
      walletTypeVerified: false,
    });
    expect(
      mapLiveWalletInfoToSessionCandidate({
        adapterName: "NightElfWallet",
        address: "ELF_MISSING_SIGNATURE",
        chainId: "AELF",
        network: "mainnet",
        signaturePresent: false,
      }),
    ).toMatchObject({
      signatureStatus: "missing",
      verificationStatus: "missing_signature",
      walletTypeVerified: false,
    });
    expect(
      mapLiveWalletInfoToSessionCandidate({
        adapterName: "PortkeyAgentSkill",
        address: "ELF_AGENT",
        chainId: "AELF",
        internalAgent: true,
        network: "mainnet",
        signaturePresent: true,
      }),
    ).toMatchObject({
      verificationStatus: "internal_agent",
      walletSource: "AGENT_SKILL",
      walletTypeVerified: false,
    });
  });
});
