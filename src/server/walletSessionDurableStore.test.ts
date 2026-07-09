import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createWalletSessionRecord,
  type WalletSessionRecord,
} from "./walletSessionRepository";
import {
  WalletSessionDurableStoreError,
  createWalletSessionDurableStore,
} from "./walletSessionDurableStore";

const sessionRecord = (
  sessionId: string,
  walletAddress: string,
): WalletSessionRecord => createWalletSessionRecord({
  accountType: "EOA",
  address: walletAddress,
  capabilities: ["SIGN_MESSAGE", "ADDRESS_ONLY"],
  chainId: "AELF",
  connectedAt: "2026-07-09T00:00:00.000Z",
  displayAddress: `${walletAddress.slice(0, 3)}...${walletAddress.slice(-3)}`,
  id: `wallet-session-${sessionId}`,
  lastSeenAt: "2026-07-09T00:00:00.000Z",
  network: "mainnet",
  normalUserRecommended: true,
  productionReadiness: {
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
  },
  proof: {
    diagnosticCodes: [],
    liveVerificationExecuted: false,
    proofType: "address_only",
    status: "proof_required",
    trustLevel: "untrusted",
  },
  sessionId,
  signatureStatus: "missing",
  statusMessage: {
    "en-US": "Address-only session needs proof before production.",
  },
  verificationStatus: "address_only",
  walletName: "Portkey EOA",
  walletSource: "PORTKEY_EOA_EXTENSION",
  walletTypeVerified: false,
}, {
  adapterId: "wallet-session-durable-test-adapter",
  sequence: 1,
  storeId: "wallet-sessions",
});

const withTempStorePath = async <T>(operation: (filePath: string) => Promise<T>) => {
  const directory = await mkdtemp(join(tmpdir(), "campaign-os-wallet-session-store-"));

  try {
    return await operation(join(directory, "wallet-sessions.json"));
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
};

describe("Wallet session durable store", () => {
  it("starts from an empty document when the durable-test file is missing", async () => {
    await withTempStorePath(async (filePath) => {
      const store = createWalletSessionDurableStore({ filePath, mode: "durable_test" });

      await expect(store.getBySessionId("missing-session")).resolves.toBeUndefined();
      await expect(store.list()).resolves.toEqual([]);
      await expect(store.manifest()).resolves.toMatchObject({
        diagnosticCodes: [],
        durable: true,
        mode: "durable_test",
        recordCount: 0,
        status: "ready",
        storeId: "wallet-sessions",
      });
    });
  });

  it("persists records in deterministic wallet-address and session-id order", async () => {
    await withTempStorePath(async (filePath) => {
      const store = createWalletSessionDurableStore({
        boundedListLimit: 5,
        filePath,
        mode: "durable_test",
      });

      await store.upsert(sessionRecord("session-002", "2F4WalletB"));
      await store.upsert(sessionRecord("session-001", "2F4WalletA"));
      await store.close();

      const raw = await readFile(filePath, "utf8");
      const document = JSON.parse(raw) as { records: WalletSessionRecord[] };

      expect(document.records.map((record) => record.sessionId)).toEqual([
        "session-001",
        "session-002",
      ]);

      const reopened = createWalletSessionDurableStore({ filePath, mode: "durable_test" });

      await expect(reopened.list()).resolves.toEqual([
        expect.objectContaining({ sessionId: "session-001", walletAddress: "2F4WalletA" }),
        expect.objectContaining({ sessionId: "session-002", walletAddress: "2F4WalletB" }),
      ]);
      await expect(reopened.list({ limit: 1 })).resolves.toEqual([
        expect.objectContaining({ sessionId: "session-001" }),
      ]);
      await expect(reopened.list({ walletAddress: "2F4WalletB" })).resolves.toEqual([
        expect.objectContaining({ sessionId: "session-002" }),
      ]);
    });
  });

  it("reports malformed documents without leaking raw durable content", async () => {
    await withTempStorePath(async (filePath) => {
      await writeFile(filePath, "not-json raw-signature-leak secret-token-leak", "utf8");

      const store = createWalletSessionDurableStore({ filePath, mode: "durable_test" });
      const manifest = await store.manifest();

      expect(manifest).toMatchObject({
        diagnosticCodes: ["WALLET_SESSION_DURABLE_STORE_READ_FAILED"],
        recordCount: 0,
        status: "blocked",
      });
      expect(JSON.stringify(manifest).toLowerCase()).not.toContain("raw-signature-leak");
      expect(JSON.stringify(manifest).toLowerCase()).not.toContain("secret-token-leak");
      await expect(store.list()).resolves.toEqual([]);
    });
  });

  it("throws and records diagnostics when durable writes fail", async () => {
    const store = createWalletSessionDurableStore({
      filePath: "/dev/null/wallet-sessions.json",
      mode: "durable_test",
    });

    await expect(store.upsert(sessionRecord("session-write-fail", "2F4WalletFail"))).rejects
      .toBeInstanceOf(WalletSessionDurableStoreError);
    await expect(store.manifest()).resolves.toMatchObject({
      diagnosticCodes: expect.arrayContaining(["WALLET_SESSION_DURABLE_STORE_WRITE_FAILED"]),
      status: "blocked",
    });
  });

  it("reports production-required mode as blocked without local fallback", async () => {
    const store = createWalletSessionDurableStore({ mode: "production_required" });

    await expect(store.manifest()).resolves.toMatchObject({
      diagnosticCodes: expect.arrayContaining([
        "WALLET_SESSION_DURABLE_STORE_PATH_REQUIRED",
        "WALLET_SESSION_DURABLE_STORE_PRODUCTION_REQUIRED",
      ]),
      durable: true,
      fallbackUsed: false,
      mode: "production_required",
      status: "blocked",
    });
  });
});
