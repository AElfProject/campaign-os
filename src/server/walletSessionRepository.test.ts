import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { NormalizedWalletSession } from "../domain/types";
import {
  WalletSessionRepositoryError,
  createWalletSessionRecord,
  createWalletSessionRepository,
} from "./walletSessionRepository";

const statusMessage = {
  "en-US": "Wallet session is ready for local review.",
};

const productionReadiness: NonNullable<NormalizedWalletSession["productionReadiness"]> = {
  blockedDependencyIds: [
    "live_wallet_proof_verifier",
    "session_signing_key",
    "secret_manager",
    "production_session_store",
  ],
  liveSigningReady: false,
  liveVerifierReady: false,
  productionReady: false,
  productionRequired: false,
  productionSessionStoreReady: false,
  secretManagerReady: false,
  signingKeyReady: false,
};

const walletSession = (
  overrides: Partial<NormalizedWalletSession> = {},
): NormalizedWalletSession => ({
  accountType: "AA",
  address: "2F4WalletSessionAA",
  capabilities: ["SIGN_MESSAGE", "CONTRACT_VIEW"],
  chainId: "tDVV",
  connectedAt: "2026-07-09T00:00:00.000Z",
  displayAddress: "2F4...nAA",
  id: "wallet-session-aa",
  issuer: {
    artifactType: "local_session_reference",
    cookieIssued: false,
    diagnosticCodes: [],
    issuerMode: "local_opaque",
    jwtIssued: false,
    liveSigningExecuted: false,
    referenceId: "local-session-ref:session-aa-001:2026-07-09T00:00:00.000Z",
    ttlSeconds: 3600,
    valid: true,
  },
  lastSeenAt: "2026-07-09T00:00:00.000Z",
  network: "testnet",
  normalUserRecommended: true,
  productionReadiness: { ...productionReadiness },
  proof: {
    diagnosticCodes: [],
    liveVerificationExecuted: false,
    proofType: "wallet_signature",
    status: "verified",
    trustLevel: "verified_local",
  },
  sessionId: "session-aa-001",
  signatureStatus: "signed",
  statusMessage,
  verificationStatus: "verified",
  walletName: "Portkey",
  walletSource: "PORTKEY_AA",
  walletTypeVerified: true,
  ...overrides,
});

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

const withTempStorePath = async <T>(operation: (filePath: string) => Promise<T>) => {
  const directory = await mkdtemp(join(tmpdir(), "campaign-os-wallet-session-repository-"));

  try {
    return await operation(join(directory, "wallet-sessions.json"));
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
};

describe("Wallet session repository", () => {
  it("starts ready in deterministic local mode with explicit no-live safety flags", async () => {
    const repository = createWalletSessionRepository();

    await expect(repository.health()).resolves.toMatchObject({
      adapterId: "wallet-session-deterministic-adapter",
      blockedDependencyIds: [],
      cookieIssued: false,
      diagnosticCodes: [],
      fallbackUsed: false,
      id: "wallet-session-repository-runtime",
      jwtIssued: false,
      liveProofVerificationExecuted: false,
      liveWalletSdkExecuted: false,
      productionReady: false,
      recordCount: 0,
      secretStored: false,
      selectedMode: "deterministic_test",
      status: "ready",
      storeId: "wallet-sessions",
      validation: {
        issues: [],
        valid: true,
      },
    });
  });

  it("blocks production-required mode instead of falling back to local storage", async () => {
    const repository = createWalletSessionRepository({
      mode: "production_required",
      requestedDriverId: "postgres-session-store-secret",
    });

    await expect(repository.health()).resolves.toMatchObject({
      blockedDependencyIds: expect.arrayContaining([
        "live_wallet_provider",
        "live_wallet_proof_verifier",
        "production_session_store",
        "secret_manager",
        "session_signing_key",
      ]),
      diagnosticCodes: ["WALLET_SESSION_REPOSITORY_PRODUCTION_REQUIRED"],
      productionReady: false,
      selectedMode: "production_required",
      status: "blocked",
    });
    await expect(repository.upsertSession(walletSession())).rejects.toBeInstanceOf(
      WalletSessionRepositoryError,
    );
  });

  it("returns deterministic empty lookup and list results", async () => {
    const repository = createWalletSessionRepository();

    await expect(repository.getBySessionId("missing-session")).resolves.toBeUndefined();
    await expect(repository.list()).resolves.toEqual([]);
    await expect(repository.list({ walletAddress: "2F4Missing" })).resolves.toEqual([]);
    await expect(repository.list({ walletSource: "PORTKEY_AA" })).resolves.toEqual([]);
  });

  it("upserts by session id, preserves first connectedAt, refreshes lastSeenAt and sorts lists", async () => {
    const repository = createWalletSessionRepository({
      boundedListLimit: 10,
      now: () => "2026-07-09T00:00:00.000Z",
    });

    const first = await repository.upsertSession(walletSession({
      connectedAt: "2026-07-09T00:00:00.000Z",
      lastSeenAt: "2026-07-09T00:00:00.000Z",
    }));
    const second = await repository.upsertSession(walletSession({
      lastSeenAt: "2026-07-09T00:05:00.000Z",
      walletName: "Portkey AA refreshed",
    }));
    await repository.upsertSession(walletSession({
      address: "2F4AnotherWallet",
      displayAddress: "2F4...her",
      sessionId: "session-aa-000",
      walletName: "NightElf",
      walletSource: "NIGHTELF",
    }));

    expect(first.metadata.created).toBe(true);
    expect(second.metadata.created).toBe(false);
    await expect(repository.health()).resolves.toMatchObject({
      recordCount: 2,
      status: "ready",
    });
    await expect(repository.getBySessionId("session-aa-001")).resolves.toMatchObject({
      connectedAt: "2026-07-09T00:00:00.000Z",
      lastSeenAt: "2026-07-09T00:05:00.000Z",
      sessionId: "session-aa-001",
      walletName: "Portkey AA refreshed",
    });
    await expect(repository.list()).resolves.toEqual([
      expect.objectContaining({
        sessionId: "session-aa-000",
        walletAddress: "2F4AnotherWallet",
      }),
      expect.objectContaining({
        sessionId: "session-aa-001",
        walletAddress: "2F4WalletSessionAA",
      }),
    ]);
    await expect(repository.list({ walletAddress: "2F4WalletSessionAA" })).resolves.toEqual([
      expect.objectContaining({ sessionId: "session-aa-001" }),
    ]);
    await expect(repository.list({ walletSource: "NIGHTELF" })).resolves.toEqual([
      expect.objectContaining({ sessionId: "session-aa-000" }),
    ]);
  });

  it("builds records from a normalized wallet-session whitelist and omits sensitive request fields", () => {
    const unsafeSession = {
      ...walletSession(),
      accounts: {
        token: "bearer-token-leak",
      },
      nonce: "nonce-secret-leak",
      privateKey: "private-key-leak",
      publicKey: "public-key-not-persisted",
      rawSignature: "raw-signature-leak",
      signature: "signature-leak",
    } as unknown as NormalizedWalletSession;

    const record = createWalletSessionRecord(unsafeSession, {
      adapterId: "wallet-session-deterministic-adapter",
      sequence: 1,
      storeId: "wallet-sessions",
    });
    const serialized = JSON.stringify(record).toLowerCase();

    expect(record).toMatchObject({
      accountType: "AA",
      capabilities: ["SIGN_MESSAGE", "CONTRACT_VIEW"],
      chainId: "tDVV",
      recordId: "wallet-session:session-aa-001",
      sessionId: "session-aa-001",
      walletAddress: "2F4WalletSessionAA",
      walletSource: "PORTKEY_AA",
    });
    expect(hasOwnKeyDeep(record, "accounts")).toBe(false);
    expect(hasOwnKeyDeep(record, "nonce")).toBe(false);
    expect(hasOwnKeyDeep(record, "privateKey")).toBe(false);
    expect(hasOwnKeyDeep(record, "publicKey")).toBe(false);
    expect(hasOwnKeyDeep(record, "rawSignature")).toBe(false);
    expect(hasOwnKeyDeep(record, "signature")).toBe(false);
    expect(serialized).not.toContain("bearer-token-leak");
    expect(serialized).not.toContain("nonce-secret-leak");
    expect(serialized).not.toContain("private-key-leak");
    expect(serialized).not.toContain("raw-signature-leak");
    expect(serialized).not.toContain("signature-leak");
  });

  it("persists durable-test records across repository recreation", async () => {
    await withTempStorePath(async (filePath) => {
      const firstRepository = createWalletSessionRepository({
        durableStoreFilePath: filePath,
        mode: "durable_test",
      });

      await firstRepository.upsertSession(walletSession());
      await firstRepository.close();

      const reopenedRepository = createWalletSessionRepository({
        durableStoreFilePath: filePath,
        mode: "durable_test",
      });

      await expect(reopenedRepository.getBySessionId("session-aa-001")).resolves.toMatchObject({
        recordId: "wallet-session:session-aa-001",
        sessionId: "session-aa-001",
        walletAddress: "2F4WalletSessionAA",
      });
      await expect(reopenedRepository.health()).resolves.toMatchObject({
        recordCount: 1,
        selectedMode: "durable_test",
        status: "ready",
        walletSessionStore: expect.objectContaining({
          durable: true,
          recordCount: 1,
          status: "ready",
        }),
      });
    });
  });
});
