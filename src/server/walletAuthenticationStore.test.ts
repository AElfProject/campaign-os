import { describe, expect, it } from "vitest";
import {
  issueVerifiedWalletSubject,
  projectVerifiedWalletSubjectForPersistence,
  type DurableWalletSessionRecord,
  type WalletAuthenticationChallengeSnapshot,
} from "./walletAuthentication";
import {
  WalletAuthenticationStoreError,
  createMemoryWalletAuthenticationStoreForTests,
  projectWalletAuthenticationSession,
  walletAuthenticationSubjectKey,
} from "./walletAuthenticationStore";

const START = new Date("2026-07-18T06:00:00.000Z");
const digest = (value: string) => value.repeat(64);

const challenge = (
  sequence = 1,
  overrides: Partial<WalletAuthenticationChallengeSnapshot> = {},
): WalletAuthenticationChallengeSnapshot => ({
  adapterId: "portkey-discover-eoa",
  chainId: "AELF",
  expiresAt: new Date(START.getTime() + 5 * 60_000).toISOString(),
  id: `wallet-challenge-${sequence}`,
  issuedAt: START.toISOString(),
  messageDigest: digest(sequence % 2 === 0 ? "b" : "a"),
  network: "testnet",
  nonceDigest: digest(sequence % 2 === 0 ? "d" : "c"),
  requestedWalletAddress: "ELF_participant_wallet",
  status: "issued",
  traceId: `trace-challenge-${sequence}`,
  verificationAttempts: 0,
  version: "campaign-os-wallet-auth/v1",
  ...overrides,
});

const persistedSubject = () => projectVerifiedWalletSubjectForPersistence(
  issueVerifiedWalletSubject({
    accountType: "EOA",
    adapterId: "portkey-discover-eoa",
    chainId: "AELF",
    network: "testnet",
    proofDigest: digest("e"),
    proofMethod: "AELF_EOA_RECOVERABLE",
    signerAddress: "ELF_participant_wallet",
    verifiedAt: START.toISOString(),
    walletAddress: "ELF_participant_wallet",
    walletSource: "PORTKEY_EOA_APP",
  }),
);

const session = (
  sequence = 1,
  overrides: Partial<DurableWalletSessionRecord> = {},
): DurableWalletSessionRecord => ({
  absoluteExpiresAt: new Date(START.getTime() + 8 * 60 * 60_000).toISOString(),
  capabilities: ["campaign:read", "task:verify"],
  challengeId: `wallet-challenge-${sequence}`,
  credentialBoundary: "wallet-auth-cookie/v1",
  credentialDigest: digest(sequence % 2 === 0 ? "2" : "1"),
  csrfTokenDigest: digest(sequence % 2 === 0 ? "4" : "3"),
  id: `wallet-session-${sequence}`,
  idleExpiresAt: new Date(START.getTime() + 30 * 60_000).toISOString(),
  issuedAt: START.toISOString(),
  lastSeenAt: START.toISOString(),
  membershipRevision: "membership-revision-1",
  roleIds: ["participant"],
  status: "active",
  subject: persistedSubject(),
  version: 1,
  ...overrides,
});

describe("wallet authentication store contract", () => {
  it("issues defensive challenge snapshots and rejects invalid or duplicate persistence facts", async () => {
    const store = createMemoryWalletAuthenticationStoreForTests({
      clock: { now: () => new Date(START) },
      mode: "unit_test",
    });
    const source = challenge();
    const issued = await store.issueChallengeWithPolicy({
      challenge: source,
      clientFingerprintDigest: digest("f"),
      traceId: source.traceId,
    });

    expect(issued).toMatchObject({ status: "issued" });
    expect(issued.status === "issued" && issued.challenge).not.toBe(source);
    expect(issued.status === "issued" && Object.isFrozen(issued.challenge)).toBe(true);
    expect(await store.loadChallenge(source.id)).toEqual(source);
    await expect(store.issueChallenge(source)).rejects.toMatchObject({
      code: "WALLET_AUTH_STORE_CONFLICT",
      field: "challenge",
    });
    await expect(store.issueChallenge(challenge(2, { expiresAt: START.toISOString() })))
      .rejects.toBeInstanceOf(WalletAuthenticationStoreError);
    await store.close();
  });

  it("bounds active challenges and verification attempts by subject and fingerprint", async () => {
    const store = createMemoryWalletAuthenticationStoreForTests({
      clock: { now: () => new Date(START) },
      mode: "unit_test",
      policy: {
        maxActiveChallengesPerSubject: 2,
        maxVerificationAttemptsPerChallenge: 2,
        maxVerificationAttemptsPerWindow: 10,
        verificationRateWindowMs: 5 * 60_000,
      },
    });
    const fingerprint = digest("f");

    expect(await store.issueChallengeWithPolicy({
      challenge: challenge(1),
      clientFingerprintDigest: fingerprint,
      traceId: "trace-rate-1",
    })).toMatchObject({ status: "issued" });
    expect(await store.issueChallengeWithPolicy({
      challenge: challenge(2),
      clientFingerprintDigest: fingerprint,
      traceId: "trace-rate-2",
    })).toMatchObject({ status: "issued" });
    expect(await store.issueChallengeWithPolicy({
      challenge: challenge(3, {
        messageDigest: digest("5"),
        nonceDigest: digest("6"),
      }),
      clientFingerprintDigest: fingerprint,
      traceId: "trace-rate-3",
    })).toMatchObject({ status: "active_limit" });

    expect(await store.recordChallengeFailureWithPolicy({
      challengeId: "wallet-challenge-1",
      terminalCode: "INVALID_PROOF",
      traceId: "trace-failure-1",
    })).toMatchObject({ status: "recorded" });
    expect(await store.recordChallengeFailureWithPolicy({
      challengeId: "wallet-challenge-1",
      terminalCode: "INVALID_PROOF",
      traceId: "trace-failure-2",
    })).toMatchObject({ status: "terminal" });
    expect(await store.loadChallenge("wallet-challenge-1")).toMatchObject({
      status: "rejected",
      verificationAttempts: 2,
    });
    await store.close();
  });

  it("cannot bypass the subject rate window by changing fingerprints and resets on time", async () => {
    let now = new Date(START);
    const store = createMemoryWalletAuthenticationStoreForTests({
      clock: { now: () => new Date(now) },
      mode: "unit_test",
      policy: {
        maxVerificationAttemptsPerChallenge: 10,
        maxVerificationAttemptsPerWindow: 2,
        verificationRateWindowMs: 60_000,
      },
    });
    await store.issueChallengeWithPolicy({
      challenge: challenge(1),
      clientFingerprintDigest: digest("f"),
      traceId: "trace-subject-rate-1",
    });
    await store.issueChallengeWithPolicy({
      challenge: challenge(2),
      clientFingerprintDigest: digest("9"),
      traceId: "trace-subject-rate-2",
    });

    expect(await store.recordChallengeFailureWithPolicy({
      challengeId: "wallet-challenge-1",
      terminalCode: "INVALID_PROOF",
      traceId: "trace-subject-rate-failure-1",
    })).toMatchObject({ status: "recorded" });
    expect(await store.recordChallengeFailureWithPolicy({
      challengeId: "wallet-challenge-2",
      terminalCode: "INVALID_PROOF",
      traceId: "trace-subject-rate-failure-2",
    })).toMatchObject({ status: "recorded" });
    expect(await store.recordChallengeFailureWithPolicy({
      challengeId: "wallet-challenge-1",
      terminalCode: "INVALID_PROOF",
      traceId: "trace-subject-rate-limit-plus-one",
    })).toMatchObject({ status: "rate_limited" });

    now = new Date(START.getTime() + 61_000);
    expect(await store.recordChallengeFailureWithPolicy({
      challengeId: "wallet-challenge-2",
      terminalCode: "INVALID_PROOF",
      traceId: "trace-subject-rate-reset",
    })).toMatchObject({ status: "recorded" });
    await store.close();
  });

  it("allows N fingerprint attempts and limits N plus one across different subjects", async () => {
    const store = createMemoryWalletAuthenticationStoreForTests({
      clock: { now: () => new Date(START) },
      mode: "unit_test",
      policy: {
        maxVerificationAttemptsPerChallenge: 10,
        maxVerificationAttemptsPerWindow: 2,
      },
    });
    const fingerprint = digest("f");
    await store.issueChallengeWithPolicy({
      challenge: challenge(1),
      clientFingerprintDigest: fingerprint,
      traceId: "trace-fingerprint-rate-1",
    });
    await store.issueChallengeWithPolicy({
      challenge: challenge(2, { requestedWalletAddress: "ELF_other_wallet" }),
      clientFingerprintDigest: fingerprint,
      traceId: "trace-fingerprint-rate-2",
    });

    expect(await store.recordChallengeFailureWithPolicy({
      challengeId: "wallet-challenge-1",
      terminalCode: "INVALID_PROOF",
      traceId: "trace-fingerprint-attempt-1",
    })).toMatchObject({ status: "recorded" });
    expect(await store.recordChallengeFailureWithPolicy({
      challengeId: "wallet-challenge-2",
      terminalCode: "INVALID_PROOF",
      traceId: "trace-fingerprint-attempt-2",
    })).toMatchObject({ status: "recorded" });
    expect(await store.recordChallengeFailureWithPolicy({
      challengeId: "wallet-challenge-2",
      terminalCode: "INVALID_PROOF",
      traceId: "trace-fingerprint-attempt-3",
    })).toMatchObject({ status: "rate_limited" });
    await store.close();
  });

  it("consumes a challenge and creates at most one session under 20-way concurrency", async () => {
    const store = createMemoryWalletAuthenticationStoreForTests({
      clock: { now: () => new Date(START) },
      mode: "unit_test",
    });
    await store.issueChallenge(challenge());
    const input = {
      challengeId: "wallet-challenge-1",
      expectedChallengeVersion: "campaign-os-wallet-auth/v1",
      session: session(),
      traceId: "trace-consume",
    } as const;

    const outcomes = await Promise.all(
      Array.from({ length: 20 }, () => store.consumeChallengeAndCreateSession(input)),
    );

    expect(outcomes.filter((outcome) => outcome.status === "created")).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === "conflict")).toHaveLength(19);
    expect(await store.loadChallenge("wallet-challenge-1")).toMatchObject({ status: "consumed" });
    expect(await store.resolveActiveSession(digest("1"))).toMatchObject({
      id: "wallet-session-1",
      status: "active",
    });
    await store.close();
  });

  it("rejects an initial session whose version or verified subject does not match the challenge", async () => {
    const store = createMemoryWalletAuthenticationStoreForTests({
      clock: { now: () => new Date(START) },
      mode: "unit_test",
    });
    await store.issueChallenge(challenge());

    await expect(store.consumeChallengeAndCreateSession({
      challengeId: "wallet-challenge-1",
      expectedChallengeVersion: "campaign-os-wallet-auth/v1",
      session: session(1, { version: 2 }),
      traceId: "trace-session-version",
    })).rejects.toMatchObject({
      code: "WALLET_AUTH_STORE_ARGUMENT_INVALID",
      field: "session",
    });
    await expect(store.consumeChallengeAndCreateSession({
      challengeId: "wallet-challenge-1",
      expectedChallengeVersion: "campaign-os-wallet-auth/v1",
      session: session(1, {
        subject: { ...persistedSubject(), walletAddress: "ELF_other_wallet" },
      }),
      traceId: "trace-session-subject",
    })).rejects.toMatchObject({
      code: "WALLET_AUTH_STORE_ARGUMENT_INVALID",
      field: "session",
    });
    expect(await store.loadChallenge("wallet-challenge-1")).toMatchObject({ status: "issued" });
    await store.close();
  });

  it("throttles touch, rotates both digests, checks fences and revokes idempotently", async () => {
    let now = new Date(START);
    const store = createMemoryWalletAuthenticationStoreForTests({
      clock: { now: () => new Date(now) },
      mode: "unit_test",
      policy: { touchIntervalMs: 60_000 },
    });
    await store.issueChallenge(challenge());
    await store.consumeChallengeAndCreateSession({
      challengeId: "wallet-challenge-1",
      expectedChallengeVersion: "campaign-os-wallet-auth/v1",
      session: session(),
      traceId: "trace-lifecycle",
    });

    expect(await store.touchSession({
      credentialDigest: digest("1"),
      now,
      traceId: "trace-touch-1",
      version: 1,
    })).toEqual({ status: "throttled" });
    now = new Date(START.getTime() + 61_000);
    expect(await store.touchSession({
      credentialDigest: digest("1"),
      now,
      traceId: "trace-touch-2",
      version: 1,
    })).toEqual({ status: "touched" });

    expect(await store.rotateSession({
      credentialDigest: digest("1"),
      nextCredentialDigest: digest("7"),
      nextCsrfTokenDigest: digest("8"),
      traceId: "trace-rotate",
      version: 1,
    })).toEqual({ status: "rotated" });
    expect(await store.resolveActiveSession(digest("1"))).toBeUndefined();
    expect(await store.resolveActiveSession(digest("7"))).toMatchObject({ version: 2 });
    expect(await store.assertActiveAuthorizationFence({
      credentialDigest: digest("7"),
      membershipRevision: "membership-revision-1",
      now,
      sessionId: "wallet-session-1",
      traceId: "trace-fence",
      version: 2,
    })).toEqual({ status: "active" });

    expect(await store.logoutSession({
      credentialDigest: digest("1"),
      traceId: "trace-logout-stale-credential",
    })).toEqual({ status: "already_terminal" });

    expect(await store.logoutSession({
      credentialDigest: digest("7"),
      traceId: "trace-logout-1",
    })).toEqual({ status: "revoked" });
    expect(await store.logoutSession({
      credentialDigest: digest("7"),
      traceId: "trace-logout-2",
    })).toEqual({ status: "already_terminal" });
    expect(await store.logoutSession({
      credentialDigest: digest("9"),
      traceId: "trace-logout-unknown",
    })).toEqual({ status: "already_terminal" });
    expect(await store.revokeSession({
      reasonCode: "ADMIN_REVOKE",
      sessionId: "wallet-session-1",
      traceId: "trace-revoke-terminal",
    })).toEqual({ status: "already_terminal" });
    expect(await store.revokeSession({
      reasonCode: "ADMIN_REVOKE",
      sessionId: "wallet-session-missing",
      traceId: "trace-revoke-unknown",
    })).toEqual({ status: "already_terminal" });
    expect(await store.resolveActiveSession(digest("7"))).toBeUndefined();
    await store.close();
  });

  it("normalizes direct logout and revoke of expired active rows to the terminal result", async () => {
    let now = new Date(START);
    const store = createMemoryWalletAuthenticationStoreForTests({
      clock: { now: () => new Date(now) },
      mode: "unit_test",
    });
    await store.issueChallenge(challenge(1));
    await store.issueChallenge(challenge(2));
    await store.consumeChallengeAndCreateSession({
      challengeId: "wallet-challenge-1",
      expectedChallengeVersion: "campaign-os-wallet-auth/v1",
      session: session(1),
      traceId: "trace-expired-idempotency-create-1",
    });
    await store.consumeChallengeAndCreateSession({
      challengeId: "wallet-challenge-2",
      expectedChallengeVersion: "campaign-os-wallet-auth/v1",
      session: session(2),
      traceId: "trace-expired-idempotency-create-2",
    });
    now = new Date(START.getTime() + 31 * 60_000);

    expect(await store.logoutSession({
      credentialDigest: digest("1"),
      traceId: "trace-expired-idempotency-logout",
    })).toEqual({ status: "already_terminal" });
    expect(await store.revokeSession({
      reasonCode: "ADMIN_REVOKE",
      sessionId: "wallet-session-2",
      traceId: "trace-expired-idempotency-revoke",
    })).toEqual({ status: "already_terminal" });
    expect(await store.resolveActiveSession(digest("1"))).toBeUndefined();
    expect(await store.resolveActiveSession(digest("2"))).toBeUndefined();
    await store.close();
  });

  it("enforces a deterministic subject session cap and exposes only safe projections", async () => {
    const store = createMemoryWalletAuthenticationStoreForTests({
      clock: { now: () => new Date(START) },
      mode: "unit_test",
      policy: {
        maxActiveSessionsPerSubject: 1,
        sessionCapStrategy: "revoke_oldest",
      },
    });
    await store.issueChallenge(challenge(1));
    await store.issueChallenge(challenge(2));
    await store.consumeChallengeAndCreateSession({
      challengeId: "wallet-challenge-1",
      expectedChallengeVersion: "campaign-os-wallet-auth/v1",
      session: session(1),
      traceId: "trace-cap-1",
    });
    await store.consumeChallengeAndCreateSession({
      challengeId: "wallet-challenge-2",
      expectedChallengeVersion: "campaign-os-wallet-auth/v1",
      session: session(2),
      traceId: "trace-cap-2",
    });

    expect(await store.resolveActiveSession(digest("1"))).toBeUndefined();
    const active = await store.listActiveSessions({
      now: START,
      subjectKey: walletAuthenticationSubjectKey(session(2).subject),
      traceId: "trace-list",
    });
    expect(active).toHaveLength(1);
    expect(active[0]).toEqual(projectWalletAuthenticationSession(session(2)));
    expect(JSON.stringify(active[0])).not.toMatch(/credential|csrf|proof|signer|membership|version/i);
    expect(Object.isFrozen(active[0]?.capabilities)).toBe(true);
    await store.close();
  });

  it("closes idempotently and rejects every new operation with a safe typed error", async () => {
    const store = createMemoryWalletAuthenticationStoreForTests({
      clock: { now: () => new Date(START) },
      mode: "unit_test",
    });
    const firstClose = store.close();
    expect(store.close()).toBe(firstClose);
    await firstClose;

    await expect(store.loadChallenge("wallet-challenge-1")).rejects.toMatchObject({
      code: "WALLET_AUTH_STORE_CLOSED",
      field: "store",
      retryable: false,
      traceId: "wallet-auth-store",
    });
  });
});
