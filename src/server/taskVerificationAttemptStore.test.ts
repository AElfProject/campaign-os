import { describe, expect, it, vi } from "vitest";
import type {
  CampaignDbParticipantRecord,
  CampaignDbTaskCompletion,
  CampaignDbTaskEvidenceRecord,
} from "./campaignDbRepository";
import {
  createCanonicalTaskVerificationRevision,
  deriveTaskVerificationIdentity,
  issueTrustedTaskVerificationIdentityInput,
  transitionTaskVerificationAttempt,
} from "./taskVerification";
import {
  TaskVerificationAttemptStoreError,
  createMemoryTaskVerificationAttemptStore,
  decodeTaskVerificationAttemptRecords,
  encodeTaskVerificationAttemptRecords,
  type TaskVerificationAttemptFinalizeWrite,
} from "./taskVerificationAttemptStore";

const TRACE_ID = "trace-attempt-store";
const DIGEST_A = "a".repeat(64);
const DIGEST_B = "b".repeat(64);
const DIGEST_C = "c".repeat(64);

const identity = () => deriveTaskVerificationIdentity(
  issueTrustedTaskVerificationIdentityInput({
    binding: {
      bindingId: "binding-on-chain-default",
      bindingRevision: 1,
    },
    issuedSubject: {
      accountType: "EOA",
      sessionRef: "session-attempt-store",
      walletAddress: "ELF_AttemptWallet_AELF",
      walletSource: "PORTKEY_EOA_EXTENSION",
    },
    task: createCanonicalTaskVerificationRevision({
      campaignId: "campaign-attempt-store",
      evidenceRule: { expectedStatus: "confirmed", source: "AELFSCAN" },
      points: 120,
      required: true,
      revision: 1,
      taskId: "task-attempt-store",
      traceId: TRACE_ID,
      updatedAt: "2026-07-16T00:00:00.000Z",
      verificationType: "ON_CHAIN",
      walletPolicy: "ANY",
    }),
    traceId: TRACE_ID,
  }),
);

const beginInput = () => ({
  identity: identity(),
  leaseDurationMs: 1_000,
  maxAttempts: 3,
  providerRef: "provider-aelf-indexer",
  traceId: TRACE_ID,
  verificationType: "ON_CHAIN" as const,
});

const completedTransition = (traceId = TRACE_ID) => transitionTaskVerificationAttempt({
  bindingEnabled: true,
  currentStatus: "running",
  diagnosticCodes: ["PROVIDER_MATCH_CONFIRMED"],
  evidence: {
    diagnosticCodes: ["PROVIDER_MATCH_CONFIRMED"],
    evidenceHash: DIGEST_B,
    evidenceRef: "provider-evidence:attempt-store",
    evidenceSource: "AELFSCAN",
    traceId,
  },
  positiveMatch: true,
  targetStatus: "completed",
  traceId,
  transportExecuted: true,
});

const completion = (): CampaignDbTaskCompletion => ({
  accountType: "EOA",
  campaignId: "campaign-attempt-store",
  completedAt: "2026-07-16T00:00:01.000Z",
  createdAt: "2026-07-16T00:00:01.000Z",
  evidenceHash: DIGEST_B,
  evidenceId: "evidence-attempt-store",
  evidenceSource: "AELFSCAN",
  id: "completion-attempt-store",
  pointsAwarded: 120,
  status: "completed",
  taskId: "task-attempt-store",
  updatedAt: "2026-07-16T00:00:01.000Z",
  walletAddress: "ELF_AttemptWallet_AELF",
  walletSource: "PORTKEY_EOA_EXTENSION",
});

const evidence = (): CampaignDbTaskEvidenceRecord => ({
  accountType: "EOA",
  campaignId: "campaign-attempt-store",
  capturedAt: "2026-07-16T00:00:01.000Z",
  completionId: "completion-attempt-store",
  createdAt: "2026-07-16T00:00:01.000Z",
  diagnosticCodes: ["PROVIDER_MATCH_CONFIRMED"],
  evidenceHash: DIGEST_B,
  evidenceRef: "provider-evidence:attempt-store",
  evidenceSource: "AELFSCAN",
  id: "evidence-attempt-store",
  liveContractExecuted: false,
  liveProviderExecuted: true,
  liveRewardExecuted: false,
  liveStorageExecuted: false,
  pointsAwarded: 120,
  status: "completed",
  taskId: "task-attempt-store",
  updatedAt: "2026-07-16T00:00:01.000Z",
  walletAddress: "ELF_AttemptWallet_AELF",
  walletSource: "PORTKEY_EOA_EXTENSION",
});

const participant = (): CampaignDbParticipantRecord => ({
  accountType: "EOA",
  campaignId: "campaign-attempt-store",
  createdAt: "2026-07-16T00:00:01.000Z",
  id: "participant-attempt-store",
  localePreference: "en-US",
  riskFlags: [],
  totalPoints: 120,
  updatedAt: "2026-07-16T00:00:01.000Z",
  walletAddress: "ELF_AttemptWallet_AELF",
  walletSignatureStatus: "signed",
  walletSource: "PORTKEY_EOA_EXTENSION",
  walletTypeVerified: true,
});

const finalizeWrite = (): TaskVerificationAttemptFinalizeWrite => ({
  completion: completion(),
  evidence: evidence(),
  participant: participant(),
});

const acquire = async (
  store: ReturnType<typeof createMemoryTaskVerificationAttemptStore>,
) => {
  const result = await store.begin(beginInput());
  expect(result.kind).toBe("acquired");
  if (result.kind !== "acquired") {
    throw new Error("Expected acquired attempt owner.");
  }
  return result;
};

describe("task verification attempt store", () => {
  it("issues exactly one process-only owner for twenty concurrent begin calls", async () => {
    const store = createMemoryTaskVerificationAttemptStore({
      attemptId: () => "attempt-concurrent",
      now: () => "2026-07-16T00:00:00.000Z",
      ownerToken: () => "owner-token-concurrent",
    });

    const results = await Promise.all(Array.from({ length: 20 }, () => store.begin(beginInput())));

    expect(results.filter((result) => result.kind === "acquired")).toHaveLength(1);
    expect(results.filter((result) => result.kind === "in_progress")).toHaveLength(19);
    const acquired = results.find((result) => result.kind === "acquired");
    expect(acquired).toMatchObject({
      attempt: {
        attemptCount: 1,
        dispatchState: "not_started",
        fence: 1,
        id: "attempt-concurrent",
        status: "running",
      },
      kind: "acquired",
    });
    expect(JSON.stringify(acquired)).not.toContain("owner-token-concurrent");
    expect(await store.listSafe()).toHaveLength(1);
  });

  it("reclaims only an expired not-started lease and immediately stales the old owner", async () => {
    let now = "2026-07-16T00:00:00.000Z";
    let tokenSequence = 0;
    const store = createMemoryTaskVerificationAttemptStore({
      attemptId: () => "attempt-reclaim",
      now: () => now,
      ownerToken: () => `owner-token-${++tokenSequence}`,
    });
    const first = await acquire(store);

    now = "2026-07-16T00:00:01.001Z";
    const second = await store.begin(beginInput());

    expect(second).toMatchObject({
      attempt: { attemptCount: 2, fence: 2 },
      kind: "acquired",
    });
    if (second.kind !== "acquired") {
      throw new Error("Expected reclaimed owner.");
    }
    await expect(store.markTransportStarted({
      owner: first.owner,
      requestDigest: DIGEST_A,
      traceId: TRACE_ID,
    })).resolves.toMatchObject({ kind: "stale_owner" });
    await expect(store.markTransportStarted({
      owner: second.owner,
      requestDigest: DIGEST_A,
      traceId: TRACE_ID,
    })).resolves.toMatchObject({ kind: "marked" });
  });

  it("turns an expired started dispatch into outcome-unknown manual review without a new owner", async () => {
    let now = "2026-07-16T00:00:00.000Z";
    const store = createMemoryTaskVerificationAttemptStore({
      attemptId: () => "attempt-uncertain",
      now: () => now,
      ownerToken: () => "owner-token-uncertain",
    });
    const first = await acquire(store);
    await store.markTransportStarted({
      owner: first.owner,
      requestDigest: DIGEST_A,
      traceId: TRACE_ID,
    });

    now = "2026-07-16T00:00:01.001Z";
    const recovered = await store.begin(beginInput());

    expect(recovered).toMatchObject({
      attempt: {
        diagnosticCodes: ["TASK_VERIFICATION_OUTCOME_UNKNOWN"],
        dispatchState: "started",
        retryPosture: "manual_review",
        status: "manual_review",
      },
      kind: "recovery_required",
    });
    expect(recovered).not.toHaveProperty("owner");
    expect(await store.begin(beginInput())).toMatchObject({ kind: "existing_terminal" });
  });

  it("blocks retry when the ownership budget is exhausted before dispatch", async () => {
    let nowMs = Date.parse("2026-07-16T00:00:00.000Z");
    const store = createMemoryTaskVerificationAttemptStore({
      attemptId: () => "attempt-budget",
      now: () => new Date(nowMs).toISOString(),
      ownerToken: () => `owner-token-${nowMs}`,
    });
    const input = { ...beginInput(), maxAttempts: 2 };

    expect(await store.begin(input)).toMatchObject({ kind: "acquired" });
    nowMs += 1_001;
    expect(await store.begin(input)).toMatchObject({
      attempt: { attemptCount: 2, fence: 2 },
      kind: "acquired",
    });
    nowMs += 1_001;
    expect(await store.begin(input)).toMatchObject({
      attempt: { retryPosture: "blocked", status: "manual_review" },
      kind: "blocked",
    });
  });

  it("commits dispatch before a first-terminal-wins finalize and returns exact replay", async () => {
    const persistFinalization = vi.fn(async (_write: TaskVerificationAttemptFinalizeWrite) => ({
      completion: completion(),
      evidence: evidence(),
      participant: participant(),
    }));
    const store = createMemoryTaskVerificationAttemptStore({
      attemptId: () => "attempt-finalize",
      now: () => "2026-07-16T00:00:00.000Z",
      ownerToken: () => "owner-token-finalize",
      persistFinalization,
    });
    const acquired = await acquire(store);

    await expect(store.finalize({
      completedAt: "2026-07-16T00:00:01.000Z",
      owner: acquired.owner,
      providerCode: "MATCH_CONFIRMED",
      responseDigest: DIGEST_C,
      retryPosture: "none",
      traceId: TRACE_ID,
      transition: completedTransition(),
      write: finalizeWrite(),
    })).resolves.toMatchObject({ kind: "blocked" });
    expect(persistFinalization).not.toHaveBeenCalled();

    expect(await store.markTransportStarted({
      owner: acquired.owner,
      requestDigest: DIGEST_A,
      traceId: TRACE_ID,
    })).toMatchObject({ kind: "marked" });
    expect(await store.markTransportStarted({
      owner: acquired.owner,
      requestDigest: DIGEST_A,
      traceId: TRACE_ID,
    })).toMatchObject({ kind: "already_marked_same_owner" });

    const finalization = {
      completedAt: "2026-07-16T00:00:01.000Z",
      owner: acquired.owner,
      providerCode: "MATCH_CONFIRMED",
      responseDigest: DIGEST_C,
      retryPosture: "none" as const,
      traceId: TRACE_ID,
      transition: completedTransition(),
      write: finalizeWrite(),
    };
    const first = await store.finalize(finalization);
    const replay = await store.finalize(finalization);
    const conflict = await store.finalize({ ...finalization, responseDigest: DIGEST_A });

    expect(first).toMatchObject({
      attempt: {
        dispatchState: "result_observed",
        evidenceHash: DIGEST_B,
        responseDigest: DIGEST_C,
        status: "completed",
      },
      kind: "committed",
    });
    expect(replay).toEqual({ ...first, kind: "terminal_replay" });
    expect(conflict).toMatchObject({ kind: "conflict" });
    expect(persistFinalization).toHaveBeenCalledTimes(1);

    const replayTraceId = "trace-attempt-store-replay";
    const restarted = createMemoryTaskVerificationAttemptStore({
      initialRecords: store.exportPersistenceRecords(),
    });
    const beginReplay = await restarted.begin({
      ...beginInput(),
      maxAttempts: 1,
      providerRef: "provider-deactivated-after-completion",
      traceId: replayTraceId,
    });
    expect(beginReplay).toEqual({
      attempt: first.attempt,
      kind: "existing_terminal",
    });
    await expect(restarted.finalize({
      ...finalization,
      traceId: replayTraceId,
      transition: completedTransition(replayTraceId),
    })).resolves.toMatchObject({
      attempt: { id: "attempt-finalize", status: "completed" },
      kind: "terminal_replay",
    });
    await expect(restarted.finalize({
      ...finalization,
      traceId: replayTraceId,
      transition: completedTransition(replayTraceId),
      write: {
        ...finalizeWrite(),
        evidence: {
          ...evidence(),
          evidenceRef: "provider-evidence:tampered-replay",
        },
      },
    })).resolves.toMatchObject({ kind: "conflict" });
  });

  it("rolls back the terminal attempt when canonical projection persistence fails", async () => {
    const store = createMemoryTaskVerificationAttemptStore({
      attemptId: () => "attempt-fault",
      now: () => "2026-07-16T00:00:00.000Z",
      ownerToken: () => "owner-token-fault",
      persistFinalization: async () => {
        throw new Error("private persistence detail");
      },
    });
    const acquired = await acquire(store);
    await store.markTransportStarted({
      owner: acquired.owner,
      requestDigest: DIGEST_A,
      traceId: TRACE_ID,
    });

    await expect(store.finalize({
      completedAt: "2026-07-16T00:00:01.000Z",
      owner: acquired.owner,
      providerCode: "MATCH_CONFIRMED",
      responseDigest: DIGEST_C,
      retryPosture: "none",
      traceId: TRACE_ID,
      transition: completedTransition(),
      write: finalizeWrite(),
    })).rejects.toMatchObject({
      code: "TASK_VERIFICATION_ATTEMPT_PERSISTENCE_FAILED",
      traceId: TRACE_ID,
    });
    await expect(store.get("attempt-fault", { traceId: TRACE_ID })).resolves.toMatchObject({
      dispatchState: "started",
      status: "running",
    });
  });

  it("rejects caller-mutated canonical write identity before persistence", async () => {
    const persistFinalization = vi.fn();
    const store = createMemoryTaskVerificationAttemptStore({
      attemptId: () => "attempt-mutated-write",
      now: () => "2026-07-16T00:00:00.000Z",
      ownerToken: () => "owner-token-mutated-write",
      persistFinalization,
    });
    const acquired = await acquire(store);
    await store.markTransportStarted({
      owner: acquired.owner,
      requestDigest: DIGEST_A,
      traceId: TRACE_ID,
    });

    await expect(store.finalize({
      completedAt: "2026-07-16T00:00:01.000Z",
      owner: acquired.owner,
      providerCode: "MATCH_CONFIRMED",
      responseDigest: DIGEST_C,
      retryPosture: "none",
      traceId: TRACE_ID,
      transition: completedTransition(),
      write: {
        ...finalizeWrite(),
        participant: {
          ...participant(),
          walletAddress: "ELF_OtherWallet_AELF",
        },
      },
    })).rejects.toMatchObject({
      code: "TASK_VERIFICATION_ATTEMPT_INPUT_INVALID",
      field: "write.identity",
    });
    expect(persistFinalization).not.toHaveBeenCalled();
    await expect(store.get("attempt-mutated-write", { traceId: TRACE_ID })).resolves.toMatchObject({
      dispatchState: "started",
      status: "running",
    });
  });

  it("round-trips bounded persistence records and rejects unknown or unsafe fields", async () => {
    const store = createMemoryTaskVerificationAttemptStore({
      attemptId: () => "attempt-codec",
      now: () => "2026-07-16T00:00:00.000Z",
      ownerToken: () => "owner-token-codec",
    });
    await acquire(store);
    const encoded = encodeTaskVerificationAttemptRecords(store.exportPersistenceRecords());
    const dottedWalletRecord = {
      ...store.exportPersistenceRecords()[0],
      walletAddress: "8A2...1eF",
    };

    expect(decodeTaskVerificationAttemptRecords(encoded)).toEqual(store.exportPersistenceRecords());
    expect(decodeTaskVerificationAttemptRecords(JSON.stringify([dottedWalletRecord])))
      .toEqual([dottedWalletRecord]);
    expect(encoded).not.toContain("owner-token-codec");
    expect(() => decodeTaskVerificationAttemptRecords(JSON.stringify([{
      ...store.exportPersistenceRecords()[0],
      rawToken: "must-not-survive",
    }]))).toThrow(TaskVerificationAttemptStoreError);
    expect(() => decodeTaskVerificationAttemptRecords(encoded.replace(
      "provider-aelf-indexer",
      "provider-aelf-indexer\\u0000unsafe",
    ))).toThrow(TaskVerificationAttemptStoreError);
    expect(() => decodeTaskVerificationAttemptRecords(JSON.stringify([{
      ...store.exportPersistenceRecords()[0],
      retryPosture: "manual_review",
    }]))).toThrow(TaskVerificationAttemptStoreError);
    expect(() => decodeTaskVerificationAttemptRecords(JSON.stringify([{
      ...store.exportPersistenceRecords()[0],
      completedAt: "2026-07-16T00:00:01.000Z",
      dispatchState: "result_observed",
      finalizationDigest: DIGEST_C,
      providerCode: "MATCH_CONFIRMED",
      requestDigest: DIGEST_A,
      responseDigest: DIGEST_C,
      transportFinishedAt: "2026-07-16T00:00:01.000Z",
      transportStartedAt: "2026-07-16T00:00:00.500Z",
    }]))).toThrow(TaskVerificationAttemptStoreError);
  });

  it("blocks a persisted idempotency identity with mutated subject facts", async () => {
    const original = createMemoryTaskVerificationAttemptStore({
      attemptId: () => "attempt-subject-mismatch",
      now: () => "2026-07-16T00:00:00.000Z",
      ownerToken: () => "owner-token-subject-mismatch",
    });
    await original.begin(beginInput());
    const [record] = original.exportPersistenceRecords();
    const reopened = createMemoryTaskVerificationAttemptStore({
      initialRecords: [{
        ...record!,
        accountType: "AA",
        walletSource: "PORTKEY_AA",
      }],
      now: () => "2026-07-16T00:00:00.500Z",
    });

    await expect(reopened.begin(beginInput())).resolves.toMatchObject({ kind: "blocked" });
  });

  it("waits for active persistence during close and rejects every operation afterward", async () => {
    let releasePersistence: (() => void) | undefined;
    const persistenceGate = new Promise<void>((resolve) => {
      releasePersistence = resolve;
    });
    const store = createMemoryTaskVerificationAttemptStore({
      attemptId: () => "attempt-close",
      now: () => "2026-07-16T00:00:00.000Z",
      ownerToken: () => "owner-token-close",
      persistRecords: async () => persistenceGate,
    });
    const begin = store.begin(beginInput());
    await vi.waitFor(() => expect(store.activeOperationCount()).toBe(1));
    const close = store.close();

    await expect(store.begin(beginInput())).rejects.toMatchObject({
      code: "TASK_VERIFICATION_ATTEMPT_STORE_CLOSED",
    });
    releasePersistence?.();
    await expect(begin).resolves.toMatchObject({ kind: "acquired" });
    await expect(close).resolves.toBeUndefined();
    await expect(store.get("attempt-close", { traceId: TRACE_ID })).rejects.toMatchObject({
      code: "TASK_VERIFICATION_ATTEMPT_STORE_CLOSED",
    });
  });
});
