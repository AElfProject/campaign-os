import { describe, expect, it } from "vitest";
import {
  EXPORT_CSV_COLUMNS,
  campaignDetail,
  createCampaignOsLocalService,
  serviceBoundary,
  walletAdapterFixtures,
} from "./index";

const service = createCampaignOsLocalService();
const activatedRuntimeLocales = ["en-US", "zh-CN", "zh-TW", "ja-JP", "ko-KR", "vi-VN", "id-ID", "tr-TR", "es-ES"] as const;

const hasOwnKeyDeep = (value: unknown, key: string): boolean => {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasOwnKeyDeep(item, key));
  }

  const record = value as Record<string, unknown>;

  return Object.prototype.hasOwnProperty.call(record, key)
    || Object.values(record).some((item) => hasOwnKeyDeep(item, key));
};

describe("Campaign OS local API service facade", () => {
  it("returns explicit success and error envelopes with bilingual boundaries", () => {
    const success = service.getCoverageSummary();
    const failure = service.checkEligibility({
      campaignId: "missing-campaign",
      walletAddress: "2F4...9aB",
    });

    expect(success.ok).toBe(true);
    expect(success.payload).toBeDefined();
    expect(success.error).toBeUndefined();
    expect(success.boundary["en-US"]).toContain("No live API");
    expect(success.boundary["zh-CN"]).toContain("不会调用实时 API");
    expect(failure.ok).toBe(false);
    expect(failure.payload).toBeUndefined();
    expect(failure.error).toMatchObject({ code: "CAMPAIGN_NOT_FOUND", field: "campaignId" });
  });

  it("normalizes seeded wallet sessions without exposing credentials", () => {
    const sessions = Object.fromEntries(
      walletAdapterFixtures.map((fixture) => [
        fixture.id,
        service.createWalletSession({
          adapterName: fixture.adapterName,
          fixtureId: fixture.id,
        }),
      ]),
    );

    expect(sessions["sess-aa-001"].payload).toMatchObject({
      accountType: "AA",
      accounts: { AELF: "2F4...9aB" },
      capabilities: expect.arrayContaining(["EBRIDGE"]),
      publicKey: "PUB_AA_SEEDED_001",
      walletSource: "PORTKEY_AA",
      verificationStatus: "verified",
      walletTypeVerified: true,
    });
    expect(sessions["sess-eoa-app-001"].payload).toMatchObject({
      accountType: "EOA",
      accounts: { AELF: "8A2...1eF" },
      capabilities: expect.arrayContaining(["EBRIDGE"]),
      publicKey: "PUB_EOA_APP_SEEDED_001",
      walletSource: "PORTKEY_EOA_APP",
      verificationStatus: "verified",
    });
    expect(sessions["sess-eoa-001"].payload).toMatchObject({
      capabilities: expect.arrayContaining(["EBRIDGE"]),
      walletSource: "PORTKEY_EOA_EXTENSION",
      walletTypeVerified: true,
    });
    expect(sessions["sess-nightelf-001"].payload).toMatchObject({
      walletSource: "NIGHTELF",
      walletTypeVerified: true,
    });
    expect(sessions["sess-agent-skill-001"].payload).toMatchObject({
      capabilities: expect.not.arrayContaining(["EBRIDGE"]),
      walletSource: "AGENT_SKILL",
      verificationStatus: "internal_agent",
      walletTypeVerified: false,
    });
    expect(sessions["sess-unsupported-001"].payload).toMatchObject({
      capabilities: expect.not.arrayContaining(["EBRIDGE"]),
      verificationStatus: "unsupported_wallet",
      walletTypeVerified: false,
    });
    expect(sessions["sess-wrong-chain-001"].payload).toMatchObject({
      verificationStatus: "wrong_chain",
      walletTypeVerified: false,
    });
    expect(sessions["sess-missing-signature-001"].payload).toMatchObject({
      signatureStatus: "missing",
      verificationStatus: "missing_signature",
    });
    expect(sessions["sess-account-restricted-001"].payload).toMatchObject({
      verificationStatus: "account_restricted",
      walletTypeVerified: false,
    });
    expect(sessions["sess-unknown-001"].payload).toMatchObject({
      accountType: "UNKNOWN",
      capabilities: expect.not.arrayContaining(["EBRIDGE"]),
      verificationStatus: "address_only",
    });
    expect(JSON.stringify(sessions).toLowerCase()).not.toContain("private key");
    expect(JSON.stringify(sessions).toLowerCase()).not.toContain("seed phrase");
    expect(JSON.stringify(sessions).toLowerCase()).not.toContain("bearer ");
  });

  it("normalizes direct wallet session requests with fail-closed local statuses", () => {
    const verified = service.createWalletSession({
      address: "2F4...9aB",
      adapterName: "PortkeyDiscoverWallet",
      chainId: "AELF",
      network: "mainnet",
      signature: "local-signature-presence",
    });
    const missingSignature = service.createWalletSession({
      address: "2F4...9aB",
      adapterName: "PortkeyDiscoverWallet",
      chainId: "AELF",
      network: "mainnet",
    });
    const wrongChain = service.createWalletSession({
      address: "2F4...9aB",
      adapterName: "PortkeyDiscoverWallet",
      chainId: "tDVV",
      network: "testnet",
      signature: "local-signature-presence",
    });
    const unsupported = service.createWalletSession({
      address: "2F4...9aB",
      adapterName: "UnsupportedWallet",
      chainId: "AELF",
      network: "mainnet",
      signature: "local-signature-presence",
    });

    expect(verified).toMatchObject({
      ok: true,
      payload: {
        accountType: "EOA",
        address: "2F4...9aB",
        chainId: "AELF",
        network: "mainnet",
        signatureStatus: "signed",
        verificationStatus: "verified",
        walletSource: "PORTKEY_EOA_APP",
        walletTypeVerified: true,
      },
    });
    expect(verified.payload).not.toHaveProperty("accounts");
    expect(verified.payload).not.toHaveProperty("publicKey");
    expect(missingSignature).toMatchObject({
      ok: true,
      payload: {
        signatureStatus: "missing",
        verificationStatus: "missing_signature",
        walletTypeVerified: false,
      },
    });
    expect(wrongChain).toMatchObject({
      ok: true,
      payload: {
        chainId: "tDVV",
        network: "testnet",
        verificationStatus: "wrong_chain",
        walletTypeVerified: false,
      },
    });
    expect(unsupported).toMatchObject({
      ok: true,
      payload: {
        accountType: "UNKNOWN",
        capabilities: expect.not.arrayContaining(["EBRIDGE"]),
        verificationStatus: "unsupported_wallet",
        walletSource: "OTHER",
        walletTypeVerified: false,
      },
    });

    for (const response of [verified, missingSignature, wrongChain, unsupported]) {
      for (const unsafe of ["signature", "privateKey", "token", "secret", "signedPayload"]) {
        expect(hasOwnKeyDeep(response, unsafe)).toBe(false);
      }
    }
  });

  it("creates campaign and task payloads with locale, wallet, contract, and evidence metadata", () => {
    const campaign = service.createCampaign({
      duration: "2026-07-01/2026-07-14",
      goal: "Activate Awaken traders",
      ownerAddress: "2F4...9aB",
      projectId: "awaken",
      rewardDescription: "Rewards remain project owned.",
      startTime: "2026-07-01T00:00:00Z",
      endTime: "2026-07-14T23:59:59Z",
    });
    const explicitCampaign = service.createCampaign({
      contractMode: "V2_COMPANION",
      defaultLocale: "en-US",
      endTime: "2026-08-14T23:59:59Z",
      metadataHash: "sha256:campaign-metadata",
      metadataUri: "ipfs://campaign-metadata",
      duration: "  2026-08-01/2026-08-14  ",
      goal: "  Grow Forest liquidity  ",
      ownerAddress: "3E9...7cD",
      projectId: "forest",
      rewardDescription: "Rewards remain project owned with reviewed disclaimer.",
      rewardDisclaimerHash: "sha256:reward-disclaimer",
      startTime: "2026-08-01T00:00:00Z",
      status: "scheduled",
      supportedLocales: ["zh-TW", "en-US", "zh-CN", "ja-JP", "ko-KR", "vi-VN", "id-ID", "tr-TR", "es-ES"],
      walletPolicy: "AA_ONLY",
    });
    const task = service.addTask({
      campaignId: campaignDetail.id,
      evidenceRule: { source: "AELFSCAN", minAmount: 1 },
      points: 120,
      required: true,
      templateCode: "bridge_ebridge",
      verificationType: "ON_CHAIN",
      walletCompatibility: "ANY",
    });
    const unsupportedLocaleResponse = service.createCampaign({
      duration: "2026-07-01/2026-07-14",
      goal: "Activate Awaken traders",
      ownerAddress: "2F4...9aB",
      projectId: "awaken",
      rewardDescription: "Rewards remain project owned.",
      startTime: "2026-07-01T00:00:00Z",
      endTime: "2026-07-14T23:59:59Z",
      supportedLocales: ["en-US", "zh-CN", "fr-FR" as never],
    });
    const invalidTask = service.addTask({
      campaignId: campaignDetail.id,
      evidenceRule: { source: "LOCAL_SEEDED" },
      points: -1,
      required: true,
      templateCode: "",
      verificationType: "MANUAL",
      walletCompatibility: "ANY",
    });

    expect(campaign.payload).toMatchObject({
      contractMode: "OFF_CHAIN_MVP",
      defaultLocale: "en-US",
      duration: "2026-07-01/2026-07-14",
      endTime: "2026-07-14T23:59:59Z",
      goal: "Activate Awaken traders",
      ownerAddress: "2F4...9aB",
      supportedLocales: activatedRuntimeLocales,
      startTime: "2026-07-01T00:00:00Z",
      status: "draft",
      walletPolicy: "ANY",
    });
    expect(campaign.payload).not.toHaveProperty("metadataUri");
    expect(explicitCampaign.payload).toMatchObject({
      contractMode: "V2_COMPANION",
      defaultLocale: "en-US",
      duration: "2026-08-01/2026-08-14",
      endTime: "2026-08-14T23:59:59Z",
      goal: "Grow Forest liquidity",
      metadataHash: "sha256:campaign-metadata",
      metadataUri: "ipfs://campaign-metadata",
      ownerAddress: "3E9...7cD",
      rewardDisclaimerHash: "sha256:reward-disclaimer",
      startTime: "2026-08-01T00:00:00Z",
      status: "scheduled",
      supportedLocales: activatedRuntimeLocales,
      walletPolicy: "AA_ONLY",
    });
    expect(campaign.payload?.publishReadiness.ready).toBe(true);
    expect(task.payload).toMatchObject({
      campaignId: campaignDetail.id,
      evidenceRule: { source: "AELFSCAN", minAmount: 1 },
      points: 120,
      required: true,
      templateCode: "bridge_ebridge",
      verificationType: "ON_CHAIN",
      walletCompatibility: "ANY",
    });
    expect(unsupportedLocaleResponse).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "UNSUPPORTED_LOCALE", field: "supportedLocales" }),
    });
    expect(invalidTask).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "INVALID_REQUEST", field: "templateCode" }),
    });
  });

  it("generates seeded campaign task suggestions with point and wallet contract fields", () => {
    const generated = service.generateCampaignTasks({
      campaignId: campaignDetail.id,
      goal: "Activate Awaken traders",
      product: "Awaken",
      targetUsers: ["new AA users", "existing EOA traders"],
      walletPolicy: "ANY",
    });

    expect(generated.ok).toBe(true);
    expect(generated.payload).toMatchObject({
      campaignId: campaignDetail.id,
      humanReviewRequired: true,
      taskList: expect.any(Array),
      pointRules: expect.any(Array),
      walletCompatibility: expect.any(Array),
    });
    expect(generated.payload?.taskList.length).toBeGreaterThan(0);
    expect(generated.payload?.pointRules).toHaveLength(generated.payload?.taskList.length ?? 0);
    expect(generated.payload?.walletCompatibility).toHaveLength(generated.payload?.taskList.length ?? 0);
    expect(generated.payload?.taskList[0]).toMatchObject({
      campaignId: campaignDetail.id,
      evidenceRule: expect.objectContaining({
        product: "Awaken",
        source: "LOCAL_SEEDED",
      }),
      instructionKey: expect.stringMatching(/^task\..+\.instruction$/),
      points: expect.any(Number),
      required: expect.any(Boolean),
      templateCode: expect.any(String),
      titleKey: expect.stringMatching(/^task\..+\.title$/),
      walletCompatibility: expect.any(String),
    });
    expect(generated.payload?.boundary["en-US"]).toContain("No live task generation provider");
    expect(generated.boundary["en-US"]).toContain("No live API");
    for (const unsafeKey of [["private", "Key"], ["tok", "en"], ["sec", "ret"]].map((parts) => parts.join(""))) {
      expect(hasOwnKeyDeep(generated.payload, unsafeKey)).toBe(false);
    }
    expect(service.getCoverageSummary().payload?.serviceNames).toContain("generateCampaignTasks");
    expect(typeof service.addTask).toBe("function");
  });

  it("lists and reads seeded campaign discovery without live service fields", () => {
    const discovery = service.listCampaigns({
      consumerSurface: "app_hub",
      walletAddress: campaignDetail.participants[1].walletAddress,
    });
    const detail = service.getCampaignDetail({
      campaignId: campaignDetail.id,
      consumerSurface: "user_app",
      walletAddress: campaignDetail.participants[1].walletAddress,
    });
    const missingDetail = service.getCampaignDetail({
      campaignId: "missing-campaign",
    });

    expect(discovery).toMatchObject({
      ok: true,
      payload: {
        campaignId: campaignDetail.id,
        summary: {
          totalCampaigns: 3,
          appHubReadyCount: 3,
          portfolioReadyCount: 3,
          forecastReadyCount: 2,
        },
      },
    });
    expect(discovery.payload?.items.map((item) => item.id)).toEqual([
      "camp-awaken-sprint",
      "camp-forest-nft-path",
      "camp-tmrwdao-streak",
    ]);
    expect(discovery.payload?.items[0]).toMatchObject({
      cta: expect.objectContaining({ kind: "continue_tasks" }),
      status: "live",
    });
    expect(detail).toMatchObject({
      ok: true,
      payload: {
        item: expect.objectContaining({ id: campaignDetail.id }),
        tasks: expect.arrayContaining([
          expect.objectContaining({ taskId: "task-connect-wallet" }),
          expect.objectContaining({ taskId: "task-bridge" }),
        ]),
      },
    });
    expect(detail.payload?.boundary["en-US"]).toContain("No live marketplace API");
    expect(detail.payload?.rewardBoundary["en-US"]).toContain("Export winners does not distribute rewards");
    expect(missingDetail).toMatchObject({
      ok: false,
      error: { code: "CAMPAIGN_NOT_FOUND", field: "campaignId" },
    });

    for (const response of [discovery, detail]) {
      expect(JSON.stringify(response).toLowerCase()).not.toContain("private key");
      expect(JSON.stringify(response).toLowerCase()).not.toContain("seed phrase");
      expect(JSON.stringify(response).toLowerCase()).not.toContain("bearer ");
    }
  });

  it("filters generated campaign tasks by wallet policy", () => {
    const aaOnly = service.generateCampaignTasks({
      campaignId: campaignDetail.id,
      goal: "Onboard AA users",
      product: "Portkey",
      targetUsers: ["AA users"],
      walletPolicy: "AA_ONLY",
    });
    const eoaOnly = service.generateCampaignTasks({
      campaignId: campaignDetail.id,
      goal: "Retain EOA traders",
      product: "Awaken",
      targetUsers: ["EOA users"],
      walletPolicy: "EOA_ONLY",
    });
    const anyWallet = service.generateCampaignTasks({
      campaignId: campaignDetail.id,
      goal: "Grow all wallet users",
      product: "aelf",
      targetUsers: ["AA users", "EOA users"],
      walletPolicy: "ANY",
    });

    expect(aaOnly.ok).toBe(true);
    expect(eoaOnly.ok).toBe(true);
    expect(anyWallet.ok).toBe(true);
    expect(aaOnly.payload?.walletCompatibility.map((row) => row.walletCompatibility)).not.toContain("EOA_ONLY");
    expect(eoaOnly.payload?.walletCompatibility.map((row) => row.walletCompatibility)).not.toContain("AA_ONLY");
    expect(anyWallet.payload?.walletCompatibility.map((row) => row.walletCompatibility)).toEqual(
      expect.arrayContaining(["EOA_ONLY"]),
    );
  });

  it("fails closed for invalid generated campaign task requests", () => {
    const validRequest = {
      campaignId: campaignDetail.id,
      goal: "Activate Awaken traders",
      product: "Awaken",
      targetUsers: ["new users"],
      walletPolicy: "ANY" as const,
    };
    const invalidResponses = [
      {
        response: service.generateCampaignTasks({
          ...validRequest,
          campaignId: "missing-campaign",
        }),
        expected: { code: "CAMPAIGN_NOT_FOUND", field: "campaignId" },
      },
      {
        response: service.generateCampaignTasks({
          ...validRequest,
          goal: "  ",
        }),
        expected: { code: "INVALID_REQUEST", field: "goal" },
      },
      {
        response: service.generateCampaignTasks({
          ...validRequest,
          product: "",
        }),
        expected: { code: "INVALID_REQUEST", field: "product" },
      },
      {
        response: service.generateCampaignTasks({
          ...validRequest,
          targetUsers: [" ", ""],
        }),
        expected: { code: "INVALID_REQUEST", field: "targetUsers" },
      },
      {
        response: service.generateCampaignTasks({
          ...validRequest,
          walletPolicy: "AA_AND_EOA" as never,
        }),
        expected: { code: "INVALID_REQUEST", field: "walletPolicy" },
      },
    ];

    for (const { response, expected } of invalidResponses) {
      expect(response).toMatchObject({
        ok: false,
        error: expect.objectContaining(expected),
      });
      expect(response.payload).toBeUndefined();
    }
  });

  it("fails closed for invalid create campaign request fields", () => {
    const validCreateCampaignRequest = {
      duration: "2026-07-01/2026-07-14",
      endTime: "2026-07-14T23:59:59Z",
      goal: "Activate Awaken traders",
      ownerAddress: "2F4...9aB",
      projectId: "awaken",
      rewardDescription: "Rewards remain project owned.",
      startTime: "2026-07-01T00:00:00Z",
    };
    const invalidResponses = [
      {
        response: service.createCampaign({
          ...validCreateCampaignRequest,
          ownerAddress: "  ",
        }),
        expected: { code: "INVALID_REQUEST", field: "ownerAddress" },
      },
      {
        response: service.createCampaign({
          ...validCreateCampaignRequest,
          status: "published" as never,
        }),
        expected: { code: "INVALID_REQUEST", field: "status" },
      },
      {
        response: service.createCampaign({
          ...validCreateCampaignRequest,
          defaultLocale: "zh-CN",
        }),
        expected: { code: "UNSUPPORTED_LOCALE", field: "defaultLocale" },
      },
      {
        response: service.createCampaign({
          ...validCreateCampaignRequest,
          supportedLocales: ["en-US", "zh-CN"],
        }),
        expected: { code: "UNSUPPORTED_LOCALE", field: "supportedLocales" },
      },
      {
        response: service.createCampaign({
          ...validCreateCampaignRequest,
          startTime: "not-a-date",
        }),
        expected: { code: "INVALID_REQUEST", field: "timeWindow" },
      },
      {
        response: service.createCampaign({
          ...validCreateCampaignRequest,
          endTime: "2026-07-01T00:00:00Z",
        }),
        expected: { code: "INVALID_REQUEST", field: "timeWindow" },
      },
      {
        response: service.createCampaign({
          ...validCreateCampaignRequest,
          goal: "  ",
        }),
        expected: { code: "INVALID_REQUEST", field: "goal" },
      },
      {
        response: service.createCampaign({
          ...validCreateCampaignRequest,
          duration: "  ",
        }),
        expected: { code: "INVALID_REQUEST", field: "duration" },
      },
      {
        response: service.createCampaign({
          ...validCreateCampaignRequest,
          duration: "2026-07-02/2026-07-14",
        }),
        expected: { code: "INVALID_REQUEST", field: "duration" },
      },
      {
        response: service.createCampaign({
          ...validCreateCampaignRequest,
          duration: "2026-07-01/2026-07-15",
        }),
        expected: { code: "INVALID_REQUEST", field: "duration" },
      },
    ];

    for (const { response, expected } of invalidResponses) {
      expect(response).toMatchObject({
        ok: false,
        error: expect.objectContaining(expected),
      });
      expect(response.payload).toBeUndefined();
    }
  });

  it("verifies task states and eligibility while preserving wallet provenance", () => {
    const completed = service.verifyTask({
      accountType: "AA",
      campaignId: campaignDetail.id,
      taskId: "task-bridge",
      walletAddress: "2F4...9aB",
      walletSource: "PORTKEY_AA",
    });
    const pending = service.verifyTask({
      accountType: "EOA",
      campaignId: campaignDetail.id,
      taskId: "task-swap",
      walletAddress: "3E9...7cD",
      walletSource: "PORTKEY_EOA_EXTENSION",
    });
    const failed = service.verifyTask({
      accountType: "EOA",
      campaignId: campaignDetail.id,
      taskId: "task-social",
      walletAddress: "3E9...7cD",
      walletSource: "PORTKEY_EOA_EXTENSION",
    });
    const manualReview = service.verifyTask({
      accountType: "EOA",
      campaignId: campaignDetail.id,
      taskId: "task-agent-review",
      walletAddress: "3E9...7cD",
      walletSource: "PORTKEY_EOA_EXTENSION",
    });
    const mismatchedVerifyAccountType = service.verifyTask({
      accountType: "AA",
      campaignId: campaignDetail.id,
      taskId: "task-swap",
      walletAddress: "3E9...7cD",
      walletSource: "PORTKEY_EOA_EXTENSION",
    });
    const mismatchedVerifyWalletSource = service.verifyTask({
      accountType: "EOA",
      campaignId: campaignDetail.id,
      taskId: "task-swap",
      walletAddress: "3E9...7cD",
      walletSource: "PORTKEY_AA",
    });
    const notEligible = service.checkEligibility({
      campaignId: campaignDetail.id,
      walletAddress: "3E9...7cD",
    });
    const notEligibleWithWalletProvenance = service.checkEligibility({
      accountType: "EOA",
      campaignId: campaignDetail.id,
      walletAddress: "3E9...7cD",
      walletSource: "PORTKEY_EOA_EXTENSION",
    });
    const partialAccountType = service.checkEligibility({
      accountType: "EOA",
      campaignId: campaignDetail.id,
      walletAddress: "3E9...7cD",
    });
    const partialWalletSource = service.checkEligibility({
      campaignId: campaignDetail.id,
      walletAddress: "3E9...7cD",
      walletSource: "PORTKEY_EOA_EXTENSION",
    });
    const mismatchedAccountType = service.checkEligibility({
      accountType: "AA",
      campaignId: campaignDetail.id,
      walletAddress: "3E9...7cD",
      walletSource: "PORTKEY_EOA_EXTENSION",
    });
    const mismatchedWalletSource = service.checkEligibility({
      accountType: "EOA",
      campaignId: campaignDetail.id,
      walletAddress: "3E9...7cD",
      walletSource: "PORTKEY_AA",
    });
    const eligible = service.checkEligibility({
      campaignId: campaignDetail.id,
      walletAddress: "2F4...9aB",
    });
    const riskFlagged = service.checkEligibility({
      campaignId: campaignDetail.id,
      walletAddress: "5N1...4fA",
    });
    const pendingEligibility = service.checkEligibility({
      campaignId: campaignDetail.id,
      walletAddress: "7P8...2bE",
    });
    const missingTask = service.verifyTask({
      accountType: "AA",
      campaignId: campaignDetail.id,
      taskId: "missing-task",
      walletAddress: "2F4...9aB",
      walletSource: "PORTKEY_AA",
    });
    const missingParticipant = service.checkEligibility({
      campaignId: campaignDetail.id,
      walletAddress: "missing-wallet",
    });

    expect(completed.payload).toMatchObject({
      accountType: "AA",
      canonicalEvidenceSource: "AELFSCAN",
      evidence: expect.objectContaining({
        evidenceHash: "demo-task-bridge-2F4",
        evidenceId: "demo-task-bridge-2F4",
        live: false,
        source: "AELFSCAN",
      }),
      evidenceSource: "aelfscan",
      manualReview: expect.objectContaining({
        queued: false,
        severity: "info",
      }),
      nextAction: expect.objectContaining({
        "en-US": expect.stringContaining("verified"),
        "zh-CN": expect.stringContaining("已验证"),
      }),
      pointsAwarded: 120,
      provider: expect.objectContaining({
        providerId: "aelfscan",
        readiness: "local_only",
      }),
      riskFlags: [],
      status: "completed",
      walletSource: "PORTKEY_AA",
    });
    expect(pending.payload).toMatchObject({
      evidenceSource: "dapp_api",
      pointsAwarded: 0,
      provider: expect.objectContaining({ readiness: "unavailable" }),
      status: "pending",
    });
    expect(failed.payload).toMatchObject({
      evidenceSource: "social_api",
      pointsAwarded: 0,
      provider: expect.objectContaining({ readiness: "blocked" }),
      status: "failed",
    });
    expect(manualReview.payload).toMatchObject({
      evidenceSource: "manual",
      manualReview: expect.objectContaining({
        queued: true,
        queueId: "review-task-agent-review-3E9",
      }),
      pointsAwarded: 0,
      provider: expect.objectContaining({ readiness: "review_required" }),
      status: "manual_review",
    });
    expect(manualReview.payload?.nextAction["en-US"]).toContain("manual review");
    for (const invalidTaskWalletProvenance of [
      mismatchedVerifyAccountType,
      mismatchedVerifyWalletSource,
    ]) {
      expect(invalidTaskWalletProvenance).toMatchObject({
        ok: false,
        error: expect.objectContaining({
          code: "INVALID_REQUEST",
          field: "walletProvenance",
        }),
      });
      expect(invalidTaskWalletProvenance.payload).toBeUndefined();
    }
    expect(notEligible.payload).toMatchObject({
      accountType: "EOA",
      eligible: false,
      localePreference: "zh-CN",
      missingTasks: ["bridge_ebridge"],
      riskFlags: ["referral_velocity_review"],
      status: "not_eligible",
      walletSource: "PORTKEY_EOA_EXTENSION",
      walletTypeVerified: true,
    });
    expect(notEligibleWithWalletProvenance.payload).toMatchObject({
      accountType: "EOA",
      eligible: false,
      localePreference: "zh-CN",
      missingTasks: ["bridge_ebridge"],
      riskFlags: ["referral_velocity_review"],
      status: "not_eligible",
      walletSource: "PORTKEY_EOA_EXTENSION",
      walletTypeVerified: true,
    });
    for (const invalidWalletProvenance of [
      partialAccountType,
      partialWalletSource,
      mismatchedAccountType,
      mismatchedWalletSource,
    ]) {
      expect(invalidWalletProvenance).toMatchObject({
        ok: false,
        error: expect.objectContaining({
          code: "INVALID_REQUEST",
          field: "walletProvenance",
        }),
      });
      expect(invalidWalletProvenance.payload).toBeUndefined();
    }
    expect(eligible.payload).toMatchObject({ eligible: true, status: "eligible" });
    expect(riskFlagged.payload).toMatchObject({ eligible: false, status: "risk_flagged" });
    expect(pendingEligibility.payload).toMatchObject({ eligible: false, status: "pending" });
    expect(missingTask).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "TASK_NOT_FOUND", field: "taskId" }),
    });
    expect(missingParticipant).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "PARTICIPANT_NOT_FOUND", field: "walletAddress" }),
    });
  });

  it("reviews Agent Skill wallet action readiness without live execution", () => {
    const request = {
      actionIntent: "balance_query" as const,
      agentId: "agent-portkey-eoa-001",
      campaignId: campaignDetail.id,
      chainId: "AELF",
      evidencePurpose: "operator_readiness_review",
      humanApprovalState: "pending_review" as const,
      network: "mainnet" as const,
      operatorRole: "internal_operator" as const,
      taskId: "task-agent-review",
      walletSource: "AGENT_SKILL" as const,
    };
    const readiness = service.requestAgentWalletAction(request);
    const readinessAgain = service.requestAgentWalletAction(request);

    expect(readiness.ok).toBe(true);
    expect(readiness).toEqual(readinessAgain);
    expect(readiness.payload).toMatchObject({
      actionState: "review_required",
      allowedOperation: "readiness_review_only",
      auditTrail: {
        agentId: "agent-portkey-eoa-001",
        campaignId: campaignDetail.id,
        executionAttempted: false,
        sensitiveMaterialHandled: false,
        taskId: "task-agent-review",
      },
      noContractWrite: true,
      noExportFile: true,
      noPrivateKeyBoundary: true,
      noRewardDistribution: true,
      noSignatureExecution: true,
      noTransactionExecution: true,
      walletSource: "AGENT_SKILL",
    });
    expect(readiness.payload?.blockedReason["en-US"]).toContain("review-only");
    expect(readiness.payload?.nextReviewAction["en-US"]).toContain("operator review");
    expect(readiness.boundary["en-US"]).toContain("No live API");
  });

  it("blocks dangerous Agent Skill wallet action intents instead of executing them", () => {
    const blocked = service.requestAgentWalletAction({
      actionIntent: "transfer",
      agentId: "agent-portkey-eoa-001",
      campaignId: campaignDetail.id,
      chainId: "AELF",
      evidencePurpose: "operator_readiness_review",
      humanApprovalState: "approved",
      network: "mainnet",
      operatorRole: "internal_operator",
      taskId: "task-agent-review",
      walletSource: "AGENT_SKILL",
    });

    expect(blocked.ok).toBe(true);
    expect(blocked.payload).toMatchObject({
      actionState: "blocked",
      allowedOperation: "blocked_no_execution",
      auditTrail: {
        executionAttempted: false,
        sensitiveMaterialHandled: false,
      },
      noContractWrite: true,
      noExportFile: true,
      noPrivateKeyBoundary: true,
      noRewardDistribution: true,
      noSignatureExecution: true,
      noTransactionExecution: true,
    });
    expect(blocked.payload?.blockedReason["en-US"]).toContain("blocked");
    expect(blocked.payload?.nextReviewAction["en-US"]).toContain("runbook");
  });

  it("fails closed for invalid Agent Skill wallet action provenance", () => {
    const validRequest = {
      actionIntent: "qa_smoke_test" as const,
      agentId: "agent-portkey-eoa-001",
      campaignId: campaignDetail.id,
      chainId: "AELF",
      evidencePurpose: "operator_readiness_review",
      humanApprovalState: "pending_review" as const,
      network: "mainnet" as const,
      operatorRole: "internal_operator" as const,
      taskId: "task-agent-review",
      walletSource: "AGENT_SKILL" as const,
    };
    const invalidResponses = [
      {
        response: service.requestAgentWalletAction({
          ...validRequest,
          campaignId: "missing-campaign",
        }),
        expected: { code: "CAMPAIGN_NOT_FOUND", field: "campaignId" },
      },
      {
        response: service.requestAgentWalletAction({
          ...validRequest,
          taskId: "missing-task",
        }),
        expected: { code: "TASK_NOT_FOUND", field: "taskId" },
      },
      {
        response: service.requestAgentWalletAction({
          ...validRequest,
          walletSource: "PORTKEY_AA",
        }),
        expected: { code: "INVALID_REQUEST", field: "walletSource" },
      },
      {
        response: service.requestAgentWalletAction({
          ...validRequest,
          humanApprovalState: undefined,
        }),
        expected: { code: "INVALID_REQUEST", field: "humanApprovalState" },
      },
      {
        response: service.requestAgentWalletAction({
          ...validRequest,
          humanApprovalState: "not_requested",
        }),
        expected: { code: "INVALID_REQUEST", field: "humanApprovalState" },
      },
      {
        response: service.requestAgentWalletAction({
          ...validRequest,
          chainId: "tDVV",
        }),
        expected: { code: "INVALID_REQUEST", field: "chainId" },
      },
      {
        response: service.requestAgentWalletAction({
          ...validRequest,
          actionIntent: "unknown_future_intent",
        }),
        expected: { code: "INVALID_REQUEST", field: "actionIntent" },
      },
    ];

    for (const { response, expected } of invalidResponses) {
      expect(response).toMatchObject({
        ok: false,
        error: expect.objectContaining(expected),
      });
      expect(response.payload).toBeUndefined();
    }
  });

  it("keeps Agent Skill wallet action payloads free of secrets and private paths", () => {
    const responses = [
      service.requestAgentWalletAction({
        actionIntent: "contract_view_review",
        agentId: "agent-portkey-eoa-001",
        campaignId: campaignDetail.id,
        chainId: "AELF",
        evidencePurpose: "operator_readiness_review",
        humanApprovalState: "approved",
        network: "mainnet",
        operatorRole: "contract_reviewer",
        taskId: "task-agent-review",
        walletSource: "AGENT_SKILL",
      }),
      service.requestAgentWalletAction({
        actionIntent: "contract_send",
        agentId: "agent-portkey-eoa-001",
        campaignId: campaignDetail.id,
        chainId: "AELF",
        evidencePurpose: "operator_readiness_review",
        humanApprovalState: "approved",
        network: "mainnet",
        operatorRole: "contract_reviewer",
        taskId: "task-agent-review",
        walletSource: "AGENT_SKILL",
      }),
    ];
    const payloadJson = JSON.stringify(responses);

    for (const response of responses) {
      expect(response.ok).toBe(true);
      expect(response.payload?.auditTrail.executionAttempted).toBe(false);
      expect(response.payload?.auditTrail.sensitiveMaterialHandled).toBe(false);
    }
    for (const unsafe of [
      "private key",
      "seed phrase",
      "bearer",
      "raw signature",
      "signedPayload",
      "transactionId",
      "downloadUrl",
      "contractRoot",
      "kitty-specs",
      "docs/current",
    ]) {
      expect(payloadJson).not.toContain(unsafe);
      expect(payloadJson.toLowerCase()).not.toContain(unsafe.toLowerCase());
    }
  });

  it("executes local task verification actions without live side effects", () => {
    const eoaRequest = {
      accountType: "EOA" as const,
      campaignId: campaignDetail.id,
      walletAddress: "3E9...7cD",
      walletSource: "PORTKEY_EOA_EXTENSION" as const,
    };
    const completed = service.executeTaskVerificationAction({
      accountType: "AA",
      campaignId: campaignDetail.id,
      kind: "completed",
      taskId: "task-bridge",
      walletAddress: "2F4...9aB",
      walletSource: "PORTKEY_AA",
    });
    const repeatedCompleted = service.executeTaskVerificationAction({
      accountType: "AA",
      campaignId: campaignDetail.id,
      kind: "completed",
      taskId: "task-bridge",
      walletAddress: "2F4...9aB",
      walletSource: "PORTKEY_AA",
    });
    const verify = service.executeTaskVerificationAction({
      ...eoaRequest,
      kind: "verify",
      taskId: "task-bridge",
    });
    const retry = service.executeTaskVerificationAction({
      ...eoaRequest,
      kind: "retry",
      taskId: "task-swap",
    });
    const submitProof = service.executeTaskVerificationAction({
      ...eoaRequest,
      kind: "submit_proof",
      proofType: "screenshot",
      taskId: "task-social",
    });
    const viewReview = service.executeTaskVerificationAction({
      ...eoaRequest,
      kind: "view_review",
      taskId: "task-agent-review",
    });
    const reviewProof = service.executeTaskVerificationAction({
      ...eoaRequest,
      kind: "submit_proof",
      proofType: "manual_note",
      taskId: "task-agent-review",
    });

    expect(completed.payload).toMatchObject({
      accountType: "AA",
      attemptLabel: "local-completed-task-bridge",
      campaignId: campaignDetail.id,
      canonicalEvidenceSource: "AELFSCAN",
      evidenceHash: "demo-task-bridge-2F4",
      kind: "completed",
      pointsAwarded: 120,
      status: "completed",
      taskId: "task-bridge",
      walletAddress: "2F4...9aB",
      walletSource: "PORTKEY_AA",
    });
    expect(repeatedCompleted.payload?.pointsAwarded).toBe(120);
    expect(repeatedCompleted.payload).not.toHaveProperty("totalPoints");
    expect(verify.payload).toMatchObject({
      attemptLabel: "local-verify-task-bridge",
      kind: "verify",
      pointsAwarded: 0,
      provider: expect.objectContaining({ readiness: "unavailable" }),
      status: "pending",
    });
    expect(retry.payload).toMatchObject({
      attemptLabel: "local-retry-task-swap",
      evidenceSource: "dapp_api",
      kind: "retry",
      pointsAwarded: 0,
      status: "pending",
    });
    expect(submitProof.payload).toMatchObject({
      attemptLabel: "local-submit_proof-task-social",
      kind: "submit_proof",
      pointsAwarded: 0,
      proof: {
        localOnly: true,
        proofType: "screenshot",
        uploadExecuted: false,
      },
      status: "failed",
    });
    expect(viewReview.payload).toMatchObject({
      attemptLabel: "local-view_review-task-agent-review",
      kind: "view_review",
      manualReview: expect.objectContaining({ queued: true }),
      provider: expect.objectContaining({ readiness: "review_required" }),
      status: "manual_review",
    });
    expect(reviewProof.payload).toMatchObject({
      kind: "submit_proof",
      proof: expect.objectContaining({ proofType: "manual_note", uploadExecuted: false }),
      status: "manual_review",
    });

    const serializedResults = JSON.stringify([
      completed.payload,
      verify.payload,
      retry.payload,
      submitProof.payload,
      viewReview.payload,
      reviewProof.payload,
    ]);

    for (const unsafe of [
      "downloadUrl",
      "uploadUrl",
      "contractRoot",
      "apiKey",
      "raw signature",
      "signedPayload",
      "transactionId",
      "kitty-specs",
      "docs/current",
    ]) {
      expect(serializedResults).not.toContain(unsafe);
    }
  });

  it("fails closed for invalid local task verification actions", () => {
    const eoaRequest = {
      accountType: "EOA" as const,
      campaignId: campaignDetail.id,
      walletAddress: "3E9...7cD",
      walletSource: "PORTKEY_EOA_EXTENSION" as const,
    };
    const invalidResponses = [
      {
        response: service.executeTaskVerificationAction({
          ...eoaRequest,
          kind: "submit_proof",
          taskId: "task-social",
        }),
        expected: { code: "INVALID_REQUEST", field: "proofType" },
      },
      {
        response: service.executeTaskVerificationAction({
          ...eoaRequest,
          kind: "submit_proof",
          proofType: "raw_signature" as never,
          taskId: "task-social",
        }),
        expected: { code: "INVALID_REQUEST", field: "proofType" },
      },
      {
        response: service.executeTaskVerificationAction({
          ...eoaRequest,
          kind: "completed",
          taskId: "task-swap",
        }),
        expected: { code: "INVALID_REQUEST", field: "kind" },
      },
      {
        response: service.executeTaskVerificationAction({
          ...eoaRequest,
          accountType: "AA",
          kind: "retry",
          taskId: "task-swap",
        }),
        expected: { code: "INVALID_REQUEST", field: "walletProvenance" },
      },
      {
        response: service.executeTaskVerificationAction({
          campaignId: campaignDetail.id,
          kind: "retry",
          taskId: "task-swap",
          walletAddress: "3E9...7cD",
          walletSource: "PORTKEY_EOA_EXTENSION",
        } as never),
        expected: { code: "INVALID_REQUEST", field: "walletProvenance" },
      },
      {
        response: service.executeTaskVerificationAction({
          ...eoaRequest,
          kind: "retry",
          taskId: "missing-task",
        }),
        expected: { code: "TASK_NOT_FOUND", field: "taskId" },
      },
      {
        response: service.executeTaskVerificationAction({
          ...eoaRequest,
          kind: "retry",
          taskId: "task-swap",
          walletAddress: "missing-wallet",
        }),
        expected: { code: "PARTICIPANT_NOT_FOUND", field: "walletAddress" },
      },
    ];

    for (const { response, expected } of invalidResponses) {
      expect(response).toMatchObject({
        ok: false,
        error: expect.objectContaining(expected),
      });
      expect(response.payload).toBeUndefined();
    }
  });

  it("generates i18n drafts for Chinese targets and rejects unsupported locales", () => {
    const zhCnDraft = service.generateI18nDraft({
      campaignId: campaignDetail.id,
      contentKeys: ["title", "description", "rewardDisclaimer"],
      sourceLocale: "en-US",
      targetLocale: "zh-CN",
    });
    const zhTwDraft = service.generateI18nDraft({
      campaignId: campaignDetail.id,
      contentKeys: ["title", "description", "rewardDisclaimer"],
      sourceLocale: "en-US",
      targetLocale: "zh-TW",
    });
    const jaJpDraft = service.generateI18nDraft({
      campaignId: campaignDetail.id,
      contentKeys: ["title"],
      sourceLocale: "en-US",
      targetLocale: "ja-JP",
    });
    const koKrDraft = service.generateI18nDraft({
      campaignId: campaignDetail.id,
      contentKeys: ["title"],
      sourceLocale: "en-US",
      targetLocale: "ko-KR",
    });
    const viVnDraft = service.generateI18nDraft({
      campaignId: campaignDetail.id,
      contentKeys: ["title"],
      sourceLocale: "en-US",
      targetLocale: "vi-VN",
    });
    const idIdDraft = service.generateI18nDraft({
      campaignId: campaignDetail.id,
      contentKeys: ["title"],
      sourceLocale: "en-US",
      targetLocale: "id-ID",
    });
    const trTrDraft = service.generateI18nDraft({
      campaignId: campaignDetail.id,
      contentKeys: ["title"],
      sourceLocale: "en-US",
      targetLocale: "tr-TR",
    });
    const esEsDraft = service.generateI18nDraft({
      campaignId: campaignDetail.id,
      contentKeys: ["title"],
      sourceLocale: "en-US",
      targetLocale: "es-ES",
    });
    const unsupported = service.generateI18nDraft({
      campaignId: campaignDetail.id,
      contentKeys: ["title"],
      sourceLocale: "en-US",
      targetLocale: "fr-FR" as never,
    });

    expect(zhCnDraft.payload).toMatchObject({
      aiDraft: true,
      fallbackToEnglish: true,
      humanReviewRequired: true,
      sourceLocale: "en-US",
      targetLocale: "zh-CN",
    });
    expect(zhCnDraft.payload?.draft.rewardDisclaimer).toContain("不等于发奖");
    expect(zhCnDraft.payload?.noAutoPublishNotice["en-US"]).toContain("cannot auto-publish");
    expect(zhTwDraft.payload).toMatchObject({
      aiDraft: false,
      fallbackToEnglish: true,
      humanReviewRequired: true,
      sourceLocale: "en-US",
      targetLocale: "zh-TW",
    });
    expect(zhTwDraft.payload?.draft.title).toBe("Awaken Sprint");
    expect(zhTwDraft.payload?.noAutoPublishNotice["zh-TW"]).toContain("AI generated translation");
    expect(jaJpDraft.payload).toMatchObject({
      aiDraft: false,
      fallbackToEnglish: true,
      humanReviewRequired: true,
      sourceLocale: "en-US",
      targetLocale: "ja-JP",
    });
    expect(jaJpDraft.payload?.draft.title).toBe("Awaken Sprint");
    expect(koKrDraft.payload).toMatchObject({
      aiDraft: false,
      fallbackToEnglish: true,
      humanReviewRequired: true,
      sourceLocale: "en-US",
      targetLocale: "ko-KR",
    });
    expect(koKrDraft.payload?.draft.title).toBe("Awaken Sprint");
    expect(viVnDraft.payload).toMatchObject({
      aiDraft: false,
      fallbackToEnglish: true,
      humanReviewRequired: true,
      sourceLocale: "en-US",
      targetLocale: "vi-VN",
    });
    expect(viVnDraft.payload?.draft.title).toBe("Awaken Sprint");
    expect(idIdDraft.payload).toMatchObject({
      aiDraft: false,
      fallbackToEnglish: true,
      humanReviewRequired: true,
      sourceLocale: "en-US",
      targetLocale: "id-ID",
    });
    expect(idIdDraft.payload?.draft.title).toBe("Awaken Sprint");
    expect(trTrDraft.payload).toMatchObject({
      aiDraft: false,
      fallbackToEnglish: true,
      humanReviewRequired: true,
      sourceLocale: "en-US",
      targetLocale: "tr-TR",
    });
    expect(trTrDraft.payload?.draft.title).toBe("Awaken Sprint");
    expect(esEsDraft.payload).toMatchObject({
      aiDraft: false,
      fallbackToEnglish: true,
      humanReviewRequired: true,
      sourceLocale: "en-US",
      targetLocale: "es-ES",
    });
    expect(esEsDraft.payload?.draft.title).toBe("Awaken Sprint");
    expect(unsupported).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "UNSUPPORTED_LOCALE", field: "targetLocale" }),
    });
  });

  it("executes local i18n review actions without live provider or publish side effects", () => {
    const reviewed = service.executeI18nReviewAction({
      actionId: "mark_reviewed",
      campaignId: campaignDetail.id,
      reviewer: "project_owner",
      targetLocale: "zh-CN",
    });
    const japaneseCompare = service.executeI18nReviewAction({
      actionId: "compare_with_english",
      campaignId: campaignDetail.id,
      targetLocale: "ja-JP",
    });
    const unsupportedAction = service.executeI18nReviewAction({
      actionId: "publish_live_backend" as never,
      campaignId: campaignDetail.id,
      targetLocale: "zh-CN",
    });

    expect(reviewed).toMatchObject({
      ok: true,
      payload: expect.objectContaining({
        action: expect.objectContaining({ id: "mark_reviewed", state: "completed" }),
        auditTrail: expect.objectContaining({
          contractWriteExecuted: false,
          exportFileGenerated: false,
          externalProviderCalled: false,
          publishMutationExecuted: false,
          rewardDistributed: false,
          storageWriteExecuted: false,
          walletActionExecuted: false,
        }),
        targetLocale: "zh-CN",
      }),
    });
    expect(reviewed.payload?.translationManager.rewardDisclaimers.find((row) => row.locale === "zh-CN")).toMatchObject({
      blocksPublish: false,
      reviewState: "reviewed",
    });
    expect(reviewed.payload?.boundary["en-US"]).toContain("No live AI provider");
    expect(reviewed.boundary["en-US"]).toContain("No live API");
    expect(japaneseCompare).toMatchObject({
      ok: true,
      payload: expect.objectContaining({
        action: expect.objectContaining({ id: "compare_with_english" }),
        targetLocale: "ja-JP",
      }),
    });
    expect(unsupportedAction).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "INVALID_REQUEST", field: "actionId" }),
    });
  });

  it("returns analytics, campaign posts, summaries, and export previews without live outputs", () => {
    const analytics = service.getCampaignAnalytics({ campaignId: campaignDetail.id });
    const advancedAnalytics = service.getAdvancedAnalyticsReadiness({ campaignId: campaignDetail.id });
    const missingAdvancedAnalytics = service.getAdvancedAnalyticsReadiness({
      campaignId: "missing-campaign",
    });
    const posts = service.generateCampaignPosts({
      campaignId: campaignDetail.id,
      channel: "x",
      sourceLocale: "en-US",
      targetLocales: ["zh-CN", "zh-TW"],
    });
    const defaultLocalePosts = service.generateCampaignPosts({
      campaignId: campaignDetail.id,
      channel: "telegram",
    });
    const zhCnPosts = service.generateCampaignPosts({
      campaignId: campaignDetail.id,
      channel: "telegram",
      sourceLocale: "en-US",
      targetLocales: ["zh-CN"],
    });
    const titleKeyPosts = service.generateCampaignPosts({
      campaignId: campaignDetail.id,
      channel: "telegram",
      contentKeys: ["title"],
    });
    const faqPosts = service.generateCampaignPosts({
      campaignId: campaignDetail.id,
      channel: "x",
      contentKeys: ["faq"],
    });
    const titleAndFaqPosts = service.generateCampaignPosts({
      campaignId: campaignDetail.id,
      channel: "telegram",
      contentKeys: ["title", "faq"],
    });
    const unsupportedSourcePosts = service.generateCampaignPosts({
      campaignId: campaignDetail.id,
      channel: "x",
      sourceLocale: "zh-CN",
      targetLocales: ["zh-TW"],
    });
    const emptyTargetPosts = service.generateCampaignPosts({
      campaignId: campaignDetail.id,
      channel: "x",
      sourceLocale: "en-US",
      targetLocales: [],
    });
    const englishTargetPosts = service.generateCampaignPosts({
      campaignId: campaignDetail.id,
      channel: "x",
      sourceLocale: "en-US",
      targetLocales: ["en-US"],
    });
    const unsupportedTargetPosts = service.generateCampaignPosts({
      campaignId: campaignDetail.id,
      channel: "x",
      sourceLocale: "en-US",
      targetLocales: ["fr-FR" as never],
    });
    const emptyContentKeysPosts = service.generateCampaignPosts({
      campaignId: campaignDetail.id,
      channel: "x",
      contentKeys: [],
    });
    const unsupportedContentKeyPosts = service.generateCampaignPosts({
      campaignId: campaignDetail.id,
      channel: "x",
      contentKeys: ["blogPost" as never],
    });
    const summary = service.summarizeCampaign({ campaignId: campaignDetail.id, period: "daily" });
    const exportPreview = service.exportWinners({
      campaignId: campaignDetail.id,
      contractRootMode: "none",
      format: "csv",
      includeLocalePreference: true,
      includeRiskFlags: true,
      includeWalletType: true,
    });
    const unsafeExport = service.exportWinners({
      campaignId: campaignDetail.id,
      contractRootMode: "eligibility_root" as never,
      format: "csv",
      includeLocalePreference: true,
      includeRiskFlags: true,
      includeWalletType: true,
    });
    const jsonExportPreview = service.exportWinners({
      campaignId: campaignDetail.id,
      contractRootMode: "none",
      format: "json",
      includeLocalePreference: true,
      includeRiskFlags: true,
      includeWalletType: true,
    });
    const repeatedJsonExportPreview = service.exportWinners({
      campaignId: campaignDetail.id,
      contractRootMode: "none",
      format: "json",
      includeLocalePreference: true,
      includeRiskFlags: true,
      includeWalletType: true,
    });
    const missingWalletTypeExport = service.exportWinners({
      campaignId: campaignDetail.id,
      contractRootMode: "none",
      format: "csv",
      includeLocalePreference: true,
      includeRiskFlags: true,
      includeWalletType: false,
    });
    const missingLocaleExport = service.exportWinners({
      campaignId: campaignDetail.id,
      contractRootMode: "none",
      format: "csv",
      includeLocalePreference: false,
      includeRiskFlags: true,
      includeWalletType: true,
    });
    const missingRiskExport = service.exportWinners({
      campaignId: campaignDetail.id,
      contractRootMode: "none",
      format: "csv",
      includeLocalePreference: true,
      includeRiskFlags: false,
      includeWalletType: true,
    });
    const exportReadiness = service.getExportConfirmationReadiness({
      campaignId: campaignDetail.id,
    });

    expect(analytics.payload?.walletSplit.map((split) => split.label).sort()).toEqual(["AA", "EOA"]);
    expect(analytics.payload?.localeSplit.map((split) => split.label).sort()).toEqual([
      "en-US",
      "es-ES",
      "id-ID",
      "ja-JP",
      "ko-KR",
      "tr-TR",
      "vi-VN",
      "zh-CN",
      "zh-TW",
    ]);
    expect(JSON.stringify(analytics.payload?.localeSplit)).toContain("ja-JP");
    expect(JSON.stringify(analytics.payload?.localeSplit)).toContain("ko-KR");
    expect(JSON.stringify(analytics.payload?.localeSplit)).toContain("vi-VN");
    expect(JSON.stringify(analytics.payload?.localeSplit)).toContain("id-ID");
    expect(JSON.stringify(analytics.payload?.localeSplit)).toContain("tr-TR");
    expect(JSON.stringify(analytics.payload?.localeSplit)).toContain("es-ES");
    expect(JSON.stringify(analytics.payload?.localeSplit)).toContain("zh-TW");
    expect(advancedAnalytics.ok).toBe(true);
    expect(advancedAnalytics.payload).toMatchObject({
      campaignId: campaignDetail.id,
      cohorts: expect.any(Array),
      productConversions: expect.any(Array),
      premiumReports: expect.any(Array),
    });
    expect(advancedAnalytics.payload?.cohorts.length).toBeGreaterThanOrEqual(4);
    expect(advancedAnalytics.payload?.retentionWindows.map((window) => window.id)).toEqual(["day7", "day30"]);
    expect(advancedAnalytics.payload?.productConversions.map((row) => row.productName["en-US"])).toEqual([
      "eBridge",
      "Awaken",
      "Forest",
      "TMRWDAO",
      "daipp",
      "Pay",
      "Forecast",
      "Portfolio",
    ]);
    expect(advancedAnalytics.payload?.premiumReports.map((report) => report.id)).toEqual([
      "cohort_report",
      "retention_report",
      "real_user_quality",
      "conversion_report",
      "risk_report",
    ]);
    expect(advancedAnalytics.payload?.boundary["en-US"]).toContain("No live analytics");
    expect(advancedAnalytics.payload?.boundary["en-US"]).toContain("event warehouse");
    expect(advancedAnalytics.payload?.boundary["en-US"]).toContain("billing");
    expect(advancedAnalytics.boundary["en-US"]).toContain("No live API");
    expect(missingAdvancedAnalytics).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "CAMPAIGN_NOT_FOUND", field: "campaignId" }),
    });
    for (const unsafe of [
      "apiKey",
      "token",
      "privateKey",
      "signedPayload",
      "transactionId",
      "contractRoot",
      "fileUrl",
      "webhookSecret",
      "billingCustomerId",
      "ipAddress",
      "deviceFingerprint",
      "mutationId",
    ]) {
      expect(hasOwnKeyDeep(advancedAnalytics, unsafe)).toBe(false);
    }
    expect(posts.payload?.artifacts.length).toBeGreaterThan(0);
    expect(posts.payload?.humanReviewRequired).toBe(true);
    expect(posts.payload?.noAutoPublishNotice["zh-TW"]).toContain("AI generated translation");
    expect(defaultLocalePosts.payload?.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ channel: "telegram" }),
      ]),
    );
    expect(defaultLocalePosts.payload?.humanReviewRequired).toBe(true);
    expect(zhCnPosts.payload?.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ channel: "telegram" }),
      ]),
    );
    expect(zhCnPosts.payload?.humanReviewRequired).toBe(true);
    expect(titleKeyPosts.payload?.artifacts).toEqual([
      expect.objectContaining({ channel: "telegram", id: "content-telegram-announcement" }),
    ]);
    expect(faqPosts.payload?.artifacts).toEqual([
      expect.objectContaining({ channel: "support", id: "content-faq", type: "faq" }),
    ]);
    expect(titleAndFaqPosts.payload?.artifacts.map((artifact) => artifact.id)).toEqual([
      "content-telegram-announcement",
      "content-faq",
    ]);
    for (const invalidPosts of [
      {
        response: unsupportedSourcePosts,
        expected: { code: "UNSUPPORTED_LOCALE", field: "sourceLocale" },
      },
      {
        response: emptyTargetPosts,
        expected: { code: "UNSUPPORTED_LOCALE", field: "targetLocales" },
      },
      {
        response: englishTargetPosts,
        expected: { code: "UNSUPPORTED_LOCALE", field: "targetLocales" },
      },
      {
        response: unsupportedTargetPosts,
        expected: { code: "UNSUPPORTED_LOCALE", field: "targetLocales" },
      },
      {
        response: emptyContentKeysPosts,
        expected: { code: "INVALID_REQUEST", field: "contentKeys" },
      },
      {
        response: unsupportedContentKeyPosts,
        expected: { code: "INVALID_REQUEST", field: "contentKeys" },
      },
    ]) {
      expect(invalidPosts.response).toMatchObject({
        ok: false,
        error: expect.objectContaining(invalidPosts.expected),
      });
      expect(invalidPosts.response.payload).toBeUndefined();
    }
    expect(summary.payload).toMatchObject({
      campaignId: campaignDetail.id,
      localeMetrics: expect.any(Array),
      period: "daily",
      referralWalletRiskMetrics: expect.any(Array),
      riskSummary: expect.any(Array),
      walletLocaleMetrics: expect.any(Array),
      walletTypeMetrics: expect.any(Array),
    });
    expect(summary.payload?.referralWalletRiskMetrics).toEqual([
      {
        conversionRate: 0.56,
        id: "referral-wallet-risk-aa-low-risk",
        invitedCount: 9,
        label: "AA / low risk",
        participantCount: 2,
        qualifiedInvitees: 5,
        riskTier: "low_risk",
        walletType: "AA",
      },
      {
        conversionRate: 0.38,
        id: "referral-wallet-risk-eoa-needs-review",
        invitedCount: 13,
        label: "EOA / needs review",
        participantCount: 2,
        qualifiedInvitees: 5,
        riskTier: "needs_review",
        walletType: "EOA",
      },
    ]);
    for (const unsafe of [
      "riskScore",
      "walletGraph",
      "deviceFingerprint",
      "ipAddress",
      "privateKey",
      "signedPayload",
      "transactionId",
      "downloadUrl",
      "contractRoot",
    ]) {
      expect(hasOwnKeyDeep(summary.payload, unsafe)).toBe(false);
    }
    expect(summary.payload?.walletLocaleMetrics).toEqual([
      {
        count: 1,
        id: "wallet-locale-aa-en-us",
        label: "AA / en-US",
        locale: "en-US",
        percentage: 25,
        walletType: "AA",
      },
      {
        count: 0,
        id: "wallet-locale-aa-zh-cn",
        label: "AA / zh-CN",
        locale: "zh-CN",
        percentage: 0,
        walletType: "AA",
      },
      {
        count: 1,
        id: "wallet-locale-aa-zh-tw",
        label: "AA / zh-TW",
        locale: "zh-TW",
        percentage: 25,
        walletType: "AA",
      },
      {
        count: 0,
        id: "wallet-locale-aa-ja-jp",
        label: "AA / ja-JP",
        locale: "ja-JP",
        percentage: 0,
        walletType: "AA",
      },
      {
        count: 0,
        id: "wallet-locale-aa-ko-kr",
        label: "AA / ko-KR",
        locale: "ko-KR",
        percentage: 0,
        walletType: "AA",
      },
      {
        count: 0,
        id: "wallet-locale-aa-vi-vn",
        label: "AA / vi-VN",
        locale: "vi-VN",
        percentage: 0,
        walletType: "AA",
      },
      {
        count: 0,
        id: "wallet-locale-aa-id-id",
        label: "AA / id-ID",
        locale: "id-ID",
        percentage: 0,
        walletType: "AA",
      },
      {
        count: 0,
        id: "wallet-locale-aa-tr-tr",
        label: "AA / tr-TR",
        locale: "tr-TR",
        percentage: 0,
        walletType: "AA",
      },
      {
        count: 0,
        id: "wallet-locale-aa-es-es",
        label: "AA / es-ES",
        locale: "es-ES",
        percentage: 0,
        walletType: "AA",
      },
      {
        count: 1,
        id: "wallet-locale-eoa-en-us",
        label: "EOA / en-US",
        locale: "en-US",
        percentage: 25,
        walletType: "EOA",
      },
      {
        count: 1,
        id: "wallet-locale-eoa-zh-cn",
        label: "EOA / zh-CN",
        locale: "zh-CN",
        percentage: 25,
        walletType: "EOA",
      },
      {
        count: 0,
        id: "wallet-locale-eoa-zh-tw",
        label: "EOA / zh-TW",
        locale: "zh-TW",
        percentage: 0,
        walletType: "EOA",
      },
      {
        count: 0,
        id: "wallet-locale-eoa-ja-jp",
        label: "EOA / ja-JP",
        locale: "ja-JP",
        percentage: 0,
        walletType: "EOA",
      },
      {
        count: 0,
        id: "wallet-locale-eoa-ko-kr",
        label: "EOA / ko-KR",
        locale: "ko-KR",
        percentage: 0,
        walletType: "EOA",
      },
      {
        count: 0,
        id: "wallet-locale-eoa-vi-vn",
        label: "EOA / vi-VN",
        locale: "vi-VN",
        percentage: 0,
        walletType: "EOA",
      },
      {
        count: 0,
        id: "wallet-locale-eoa-id-id",
        label: "EOA / id-ID",
        locale: "id-ID",
        percentage: 0,
        walletType: "EOA",
      },
      {
        count: 0,
        id: "wallet-locale-eoa-tr-tr",
        label: "EOA / tr-TR",
        locale: "tr-TR",
        percentage: 0,
        walletType: "EOA",
      },
      {
        count: 0,
        id: "wallet-locale-eoa-es-es",
        label: "EOA / es-ES",
        locale: "es-ES",
        percentage: 0,
        walletType: "EOA",
      },
    ]);
    expect(exportPreview.payload?.columns).toEqual(EXPORT_CSV_COLUMNS);
    expect(exportPreview.payload).toMatchObject({
      artifact: expect.objectContaining({
        format: "csv",
        metadata: expect.objectContaining({
          columns: EXPORT_CSV_COLUMNS,
          generatedMode: "local_review_only",
          readyRows: 1,
          reviewRequiredRows: 3,
          totalRows: 4,
        }),
        safety: expect.objectContaining({
          localOnly: true,
          noDownloadUrl: true,
          noStorageWrite: true,
          noContractRoot: true,
          noRewardDistribution: true,
        }),
      }),
      blockedRows: 0,
      contractRootMode: "none",
      format: "csv",
      readyRows: 1,
      reviewRequiredRows: 3,
    });
    expect(exportPreview.payload?.artifact.payload.split("\n")[0]).toBe(EXPORT_CSV_COLUMNS.join(","));
    expect(exportPreview.payload?.artifact.payload).toContain("task-bridge:pending:aelfscan");
    expect(exportPreview.payload?.artifact.payload).toContain("demo-task-bridge-3E9");
    expect(exportPreview.payload?.rows[1]).toMatchObject({
      evidenceHashes: expect.arrayContaining(["demo-task-bridge-3E9"]),
      localePreference: "zh-CN",
      rowStatus: "review_required",
      taskRecords: expect.arrayContaining(["task-bridge:pending:aelfscan"]),
      walletSource: "PORTKEY_EOA_EXTENSION",
    });
    expect(JSON.stringify(exportPreview.payload)).not.toContain("downloadUrl");
    expect(exportPreview.payload).not.toHaveProperty("contractRoot");
    expect(exportPreview.payload?.confirmation.noDistributionBoundary["en-US"]).toContain(
      "does not distribute rewards",
    );
    expect(exportPreview.payload?.exportReadiness.previewModes.map((mode) => mode.mode)).toEqual(["csv", "json"]);
    expect(exportPreview.payload?.exportFulfillmentReadiness).toMatchObject({
      batchId: "export-awaken-sprint-preview",
      summary: {
        acknowledgedItems: 5,
        blockedRows: 0,
        ownerApproved: true,
        packageCount: 2,
        readyPackages: 2,
        readyRows: 1,
        requiredAcknowledgements: 5,
        reviewRequiredRows: 3,
        status: "ready",
      },
      safety: {
        forbiddenFieldsAbsent: true,
        noContractRoot: true,
        noContractTransaction: true,
        noDownloadUrl: true,
        noRewardCustody: true,
        noRewardDistribution: true,
        noStorageWrite: true,
      },
    });
    expect(exportPreview.payload?.exportFulfillmentReadiness.packages.map((pack) => pack.format)).toEqual([
      "csv",
      "json",
    ]);
    expect(exportPreview.payload?.exportFulfillmentReadiness.packages[0]).toMatchObject({
      downloadAvailable: false,
      includedColumns: EXPORT_CSV_COLUMNS,
      storageBacked: false,
    });
    expect(jsonExportPreview.payload).toMatchObject({
      artifact: expect.objectContaining({
        format: "json",
        metadata: expect.objectContaining({
          checksum: expect.stringMatching(/^local-[0-9a-f]{8}$/),
          payloadBytes: expect.any(Number),
          totalRows: 4,
        }),
      }),
      contractRootMode: "none",
      format: "json",
      readyRows: 1,
      reviewRequiredRows: 3,
    });
    expect(JSON.parse(jsonExportPreview.payload?.artifact.payload ?? "{}")).toMatchObject({
      columns: EXPORT_CSV_COLUMNS,
      rows: expect.arrayContaining([
        expect.objectContaining({
          account_type: "EOA",
          locale_preference: "zh-CN",
          risk_flags: ["referral_velocity_review"],
          wallet_source: "PORTKEY_EOA_EXTENSION",
        }),
      ]),
    });
    expect(repeatedJsonExportPreview.payload?.artifact.payload).toBe(jsonExportPreview.payload?.artifact.payload);
    expect(repeatedJsonExportPreview.payload?.artifact.metadata.checksum).toBe(
      jsonExportPreview.payload?.artifact.metadata.checksum,
    );
    expect(jsonExportPreview.payload?.exportReadiness.previewModes.find((mode) => mode.mode === "json")).toMatchObject({
      downloadAvailable: false,
      generatesFile: false,
      readiness: "ready",
    });
    expect(exportReadiness.payload?.acknowledgements.map((item) => item.id)).toEqual([
      "verified-records-only",
      "project-owned-reward-distribution",
      "no-reward-custody",
      "no-reward-distribution",
      "no-real-export-file",
    ]);
    expect(exportReadiness.payload?.contractRootReadiness.find((mode) => mode.mode === "contract_claim")).toMatchObject({
      readiness: "blocked",
      approvalRequired: true,
    });
    expect(hasOwnKeyDeep(jsonExportPreview.payload, "downloadUrl")).toBe(false);
    expect(hasOwnKeyDeep(jsonExportPreview.payload, "storageKey")).toBe(false);
    expect(hasOwnKeyDeep(jsonExportPreview.payload, "contractRoot")).toBe(false);
    expect(hasOwnKeyDeep(jsonExportPreview.payload, "transactionId")).toBe(false);
    expect(hasOwnKeyDeep(jsonExportPreview.payload, "privateKey")).toBe(false);
    expect(hasOwnKeyDeep(jsonExportPreview.payload, "signedPayload")).toBe(false);
    expect(hasOwnKeyDeep(jsonExportPreview.payload, "ipAddress")).toBe(false);
    expect(hasOwnKeyDeep(jsonExportPreview.payload, "deviceFingerprint")).toBe(false);
    expect(missingWalletTypeExport).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "INVALID_REQUEST", field: "includeWalletType" }),
    });
    expect(missingLocaleExport).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "INVALID_REQUEST", field: "includeLocalePreference" }),
    });
    expect(missingRiskExport).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "INVALID_REQUEST", field: "includeRiskFlags" }),
    });
    expect(unsafeExport).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "UNSUPPORTED_EXPORT_MODE", field: "contractRootMode" }),
    });
  });

  it("returns lifecycle operations without mutation or secret fields", () => {
    const lifecycle = service.getCampaignLifecycleOperations({
      campaignId: campaignDetail.id,
    });
    const missingLifecycle = service.getCampaignLifecycleOperations({
      campaignId: "missing-campaign",
    });
    const payloadJson = JSON.stringify(lifecycle.payload);

    expect(lifecycle.ok).toBe(true);
    expect(lifecycle.payload).toMatchObject({
      campaignId: campaignDetail.id,
      currentStatus: "live",
      supportedStatuses: expect.arrayContaining([
        "draft",
        "ai_draft",
        "human_review",
        "scheduled",
        "live",
        "paused",
        "ended",
        "exported",
        "archived",
      ]),
      summary: expect.objectContaining({
        launchBlockingCount: expect.any(Number),
        reviewRequiredCount: expect.any(Number),
        totalOperations: expect.any(Number),
      }),
      operations: expect.any(Array),
    });
    expect(lifecycle.payload?.operations.map((operation) => operation.id)).toEqual(
      expect.arrayContaining([
        "schedule-campaign",
        "generate-ai-draft",
        "submit-human-review",
        "publish-campaign",
        "pause-campaign",
        "resume-campaign",
        "end-campaign",
        "export-campaign",
        "archive-campaign",
      ]),
    );
    expect(lifecycle.payload?.boundary["en-US"]).toContain("No live backend");
    expect(lifecycle.boundary["en-US"]).toContain("No live API");
    expect(payloadJson).not.toContain("signedPayload");
    expect(payloadJson).not.toContain("transactionId");
    expect(payloadJson).not.toContain("contractRoot");
    expect(payloadJson).not.toContain("fileUrl");
    expect(payloadJson).not.toContain("mutationId");
    expect(payloadJson.toLowerCase()).not.toContain("private key");
    expect(payloadJson.toLowerCase()).not.toContain("access_token");
    expect(missingLifecycle).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "CAMPAIGN_NOT_FOUND", field: "campaignId" }),
    });
  });

  it("returns Launch Console campaign bundles without live side effects", () => {
    const bundles = service.getLaunchConsoleCampaignBundles({
      campaignId: campaignDetail.id,
    });
    const missingBundles = service.getLaunchConsoleCampaignBundles({
      campaignId: "missing-campaign",
    });
    const payloadJson = JSON.stringify(bundles.payload);

    expect(bundles.ok).toBe(true);
    expect(bundles.payload).toMatchObject({
      campaignId: campaignDetail.id,
      summary: expect.objectContaining({
        totalBundles: 3,
        launchBlockingCount: expect.any(Number),
        handoffRequiredCount: expect.any(Number),
      }),
      bundles: expect.any(Array),
      handoffs: expect.any(Array),
    });
    expect(bundles.payload?.bundles.map((bundle) => bundle.stage)).toEqual([
      "pre_launch",
      "launch",
      "post_launch",
    ]);
    expect(bundles.payload?.handoffs.map((handoff) => handoff.id)).toEqual([
      "create_campaign",
      "generate_campaign_tasks",
      "verify_task",
      "check_eligibility",
      "export_winners",
      "generate_campaign_posts",
      "summarize_campaign",
    ]);
    expect(bundles.payload?.boundary["en-US"]).toContain("No live Launch Console");
    expect(bundles.boundary["en-US"]).toContain("No live API");
    expect(payloadJson).not.toContain("apiKey");
    expect(hasOwnKeyDeep(bundles.payload, "token")).toBe(false);
    expect(hasOwnKeyDeep(bundles.payload, "accessToken")).toBe(false);
    expect(hasOwnKeyDeep(bundles.payload, "oauthToken")).toBe(false);
    expect(payloadJson).not.toContain("signedPayload");
    expect(payloadJson).not.toContain("transactionId");
    expect(payloadJson).not.toContain("contractRoot");
    expect(payloadJson).not.toContain("fileUrl");
    expect(payloadJson).not.toContain("webhookSecret");
    expect(payloadJson).not.toContain("mutationId");
    expect(payloadJson.toLowerCase()).not.toContain("private key");
    expect(missingBundles).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "CAMPAIGN_NOT_FOUND", field: "campaignId" }),
    });
  });

  it("summarizes service coverage across API and field groups", () => {
    const coverage = service.getCoverageSummary();
    const antiSybilReadiness = service.getAntiSybilV2GraphReadiness({
      campaignId: campaignDetail.id,
    });
    const pipeline = service.getVerificationPipelineReadiness({
      campaignId: campaignDetail.id,
    });
    const providerRegistry = service.getProviderEvidenceRegistry({
      campaignId: campaignDetail.id,
    });
    const missingPipeline = service.getVerificationPipelineReadiness({
      campaignId: "missing-campaign",
    });
    const missingProviderRegistry = service.getProviderEvidenceRegistry({
      campaignId: "missing-campaign",
    });
    const missingAntiSybilReadiness = service.getAntiSybilV2GraphReadiness({
      campaignId: "missing-campaign",
    });

    expect(coverage.payload).toMatchObject({
      blockedCount: 0,
      coveredApiGroups: expect.arrayContaining([
        "wallet_session",
        "campaign_creation",
        "campaign_discovery",
        "task_generation",
        "task_verification",
        "eligibility",
        "analytics",
        "export",
        "content_generation",
        "campaign_summary",
      ]),
      coveredFieldGroups: expect.arrayContaining([
        "wallet",
        "locale",
        "contract",
        "export",
        "evidence",
        "analytics",
        "campaign",
        "task",
        "content",
        "risk",
      ]),
      serviceNames: expect.arrayContaining([
        "addTask",
        "listCampaigns",
        "getCampaignDetail",
        "requestAgentWalletAction",
        "executeTaskVerificationAction",
        "generateI18nDraft",
        "executeI18nReviewAction",
        "getAdvancedAnalyticsReadiness",
        "getCampaignLifecycleOperations",
        "getLaunchConsoleCampaignBundles",
        "getAntiSybilV2GraphReadiness",
      ]),
      sampleResponseIds: expect.arrayContaining([
        "addTask",
        "listCampaigns",
        "getCampaignDetail",
        "requestAgentWalletAction",
        "executeTaskVerificationAction",
        "generateI18nDraft",
        "executeI18nReviewAction",
        "getAdvancedAnalyticsReadiness",
        "getCampaignLifecycleOperations",
        "getLaunchConsoleCampaignBundles",
        "getAntiSybilV2GraphReadiness",
      ]),
      totalServices: 23,
    });
    expect(coverage.payload?.boundary["en-US"]).toContain("advanced analytics readiness");
    expect(coverage.payload?.boundary["en-US"]).toContain("No live analytics SDK");
    expect(coverage.payload?.sampleResponseIds).toEqual(
      expect.arrayContaining([
        "createWalletSession",
        "requestAgentWalletAction",
        "generateI18nDraft",
        "executeI18nReviewAction",
        "verifyTask",
        "executeTaskVerificationAction",
        "checkEligibility",
        "getAdvancedAnalyticsReadiness",
        "getVerificationPipelineReadiness",
        "getProviderEvidenceRegistry",
        "getExportConfirmationReadiness",
        "getLaunchConsoleCampaignBundles",
        "getAntiSybilV2GraphReadiness",
        "exportWinners",
      ]),
    );
    expect(coverage.payload?.verificationBoundary["en-US"]).toContain("No live AeFinder");
    expect(antiSybilReadiness).toMatchObject({
      ok: true,
      payload: expect.objectContaining({
        campaignId: campaignDetail.id,
        summary: expect.objectContaining({
          totalFamilies: 3,
          overallReadiness: expect.any(String),
        }),
      }),
    });
    expect(antiSybilReadiness.payload?.signalFamilies.map((family) => family.id)).toEqual([
      "funding_graph",
      "invite_tree",
      "behavior_cluster",
    ]);
    expect(antiSybilReadiness.payload?.affectedOutcomes.map((outcome) => outcome.id)).toEqual(
      expect.arrayContaining([
        "referral_scoring",
        "leaderboard_trust",
        "winner_export_review",
        "ai_optimization",
      ]),
    );
    expect(antiSybilReadiness.payload?.boundary["en-US"]).toContain("No live graph provider");
    expect(pipeline.payload).toMatchObject({
      summary: expect.objectContaining({
        totalPaths: 7,
        liveEvidenceReadyPaths: 0,
      }),
      taskOutcomeCoverage: expect.objectContaining({
        completedCount: 10,
        failedCount: 1,
        manualReviewCount: 3,
        pendingCount: 6,
      }),
      eligibilityImpact: expect.objectContaining({
        missingRequiredTasks: ["bridge_ebridge"],
        referralQualificationStatus: "needs_verified_invitee",
      }),
    });
    expect(pipeline.payload?.paths.map((path) => path.id)).toEqual([
      "aefinder-on-chain",
      "aelfscan-on-chain",
      "dapp-api",
      "social-api",
      "wallet-session",
      "manual-review",
      "referral-qualification",
    ]);
    expect(JSON.stringify(pipeline.payload)).not.toContain("contractRoot");
    expect(JSON.stringify(pipeline.payload)).not.toContain("downloadUrl");
    expect(providerRegistry.payload).toMatchObject({
      campaignId: campaignDetail.id,
      summary: expect.objectContaining({
        liveEvidenceReadyEntries: 0,
        missingLiveEvidenceEntries: expect.any(Number),
        totalEntries: expect.any(Number),
      }),
    });
    expect(providerRegistry.payload?.entries.map((entry) => entry.category)).toEqual(
      expect.arrayContaining([
        "verification",
        "wallet",
        "analytics_export",
        "ai_content",
        "manual_review",
        "contract_export",
      ]),
    );
    expect(providerRegistry.payload?.adapterContracts.every((contract) => !contract.readyForProduction)).toBe(true);
    expect(
      providerRegistry.payload?.entries.every((entry) => entry.featureGate.degradesGracefully),
    ).toBe(true);
    expect(JSON.stringify(providerRegistry.payload)).not.toContain("contractRoot");
    expect(JSON.stringify(providerRegistry.payload)).not.toContain("downloadUrl");
    expect(JSON.stringify(providerRegistry.payload).toLowerCase()).not.toContain("private key");
    expect(missingPipeline).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "CAMPAIGN_NOT_FOUND", field: "campaignId" }),
    });
    expect(missingProviderRegistry).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "CAMPAIGN_NOT_FOUND", field: "campaignId" }),
    });
    expect(missingAntiSybilReadiness).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "CAMPAIGN_NOT_FOUND", field: "campaignId" }),
    });
    expect(serviceBoundary["en-US"]).toContain("No live API");
  });
});
