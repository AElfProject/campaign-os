import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import type {
  CampaignDbDraft,
  CampaignDbParticipantRecord,
  CampaignDbReferralBindingRecord,
  CampaignDbTaskCompletion,
  CampaignDbTaskDraft,
  CampaignDbTaskEvidenceRecord,
} from "./campaignDbRepository";
import {
  PostgresCampaignStoreError,
  createPostgresCampaignDurableStore,
  type PostgresCampaignStorePool,
  type PostgresCampaignStoreQueryResult,
} from "./postgresCampaignDurableStore";

interface QueryCall {
  text: string;
  values: readonly unknown[];
}

type Assert<T extends true> = T;
type PgPoolIsCompatible = Assert<Pool extends PostgresCampaignStorePool ? true : false>;
const pgPoolCompatibility: PgPoolIsCompatible = true;

const normalizeSql = (value: string) => value.replace(/\s+/g, " ").trim();

class TranscriptPool implements PostgresCampaignStorePool {
  readonly calls: QueryCall[] = [];
  readonly release = vi.fn(() => {
    if (this.releaseError) {
      throw this.releaseError;
    }
  });
  readonly connect = vi.fn(async () => ({
    query: (text: string, values: readonly unknown[] = []) => this.query(text, values),
    release: this.release,
  }));
  readonly end = vi.fn(async () => {
    if (this.endError) {
      throw this.endError;
    }
  });

  constructor(
    private readonly respond: (
      call: QueryCall,
      index: number,
    ) => PostgresCampaignStoreQueryResult | Promise<PostgresCampaignStoreQueryResult> = () => ({ rows: [] }),
    private readonly endError?: Error,
    private readonly releaseError?: Error,
  ) {}

  async query(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<PostgresCampaignStoreQueryResult> {
    const call = { text: normalizeSql(text), values };
    this.calls.push(call);

    return await this.respond(call, this.calls.length - 1);
  }
}

const timestamp = (value = "2026-07-07T00:00:00.000Z") => new Date(value);

const campaign = (overrides: Partial<CampaignDbDraft> = {}): CampaignDbDraft => ({
  contractMode: "OFF_CHAIN_MVP",
  createdAt: "2026-07-07T00:00:00.000Z",
  defaultLocale: "en-US",
  duration: "14 days",
  endTime: "2026-08-15T00:00:00.000Z",
  goal: "Launch the PostgreSQL Campaign runtime",
  id: "campaign-postgres-0001",
  metadataHash: "metadata-hash-0001",
  metadataUri: "ipfs://metadata-0001",
  ownerAddress: "2F4PostgresOwner",
  projectId: "project-postgres",
  publishReadiness: {
    blockers: [],
    ready: true,
    warnings: ["human-review-required"],
  },
  rewardDescription: "Points only",
  rewardDisclaimerHash: "disclaimer-hash-0001",
  startTime: "2026-08-01T00:00:00.000Z",
  status: "draft",
  supportedLocales: ["en-US", "zh-CN"],
  updatedAt: "2026-07-07T00:00:01.000Z",
  walletPolicy: "ANY",
  ...overrides,
});

const campaignRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  contract_mode: "OFF_CHAIN_MVP",
  created_at: timestamp(),
  default_locale: "en-US",
  duration: "14 days",
  end_time: timestamp("2026-08-15T00:00:00.000Z"),
  goal: "Launch the PostgreSQL Campaign runtime",
  id: "campaign-postgres-0001",
  metadata_hash: "metadata-hash-0001",
  metadata_uri: "ipfs://metadata-0001",
  owner_address: "2F4PostgresOwner",
  project_id: "project-postgres",
  publish_readiness: {
    blockers: [],
    ready: true,
    warnings: ["human-review-required"],
  },
  reward_description: "Points only",
  reward_disclaimer_hash: "disclaimer-hash-0001",
  start_time: timestamp("2026-08-01T00:00:00.000Z"),
  status: "draft",
  supported_locales: ["en-US", "zh-CN"],
  updated_at: timestamp("2026-07-07T00:00:01.000Z"),
  wallet_policy: "ANY",
  ...overrides,
});

const task = (overrides: Partial<CampaignDbTaskDraft> = {}): CampaignDbTaskDraft => ({
  campaignId: "campaign-postgres-0001",
  createdAt: "2026-07-07T00:00:02.000Z",
  evidenceRule: { minAmount: 1, source: "AELFSCAN" },
  id: "task-postgres-0001",
  points: 120,
  required: true,
  templateCode: "bridge_ebridge",
  updatedAt: "2026-07-07T00:00:03.000Z",
  verificationType: "ON_CHAIN",
  walletCompatibility: "ANY",
  ...overrides,
});

const taskRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  campaign_id: "campaign-postgres-0001",
  created_at: timestamp("2026-07-07T00:00:02.000Z"),
  evidence_rule: { minAmount: 1, source: "AELFSCAN" },
  id: "task-postgres-0001",
  points: 120,
  required: true,
  template_code: "bridge_ebridge",
  updated_at: timestamp("2026-07-07T00:00:03.000Z"),
  verification_type: "ON_CHAIN",
  wallet_compatibility: "ANY",
  ...overrides,
});

const participant = (
  overrides: Partial<CampaignDbParticipantRecord> = {},
): CampaignDbParticipantRecord => ({
  accountType: "EOA",
  campaignId: "campaign-postgres-0001",
  createdAt: "2026-07-07T00:00:04.000Z",
  id: "participant-request-id",
  localePreference: "zh-CN",
  rank: 3,
  riskFlags: ["manual-review"],
  totalPoints: 120,
  updatedAt: "2026-07-07T00:00:05.000Z",
  walletAddress: "2F4ParticipantWallet",
  walletSignatureStatus: "signed",
  walletSource: "PORTKEY_EOA_EXTENSION",
  walletTypeVerified: true,
  walletVerifiedAt: "2026-07-07T00:00:04.500Z",
  ...overrides,
});

const participantRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  account_type: "EOA",
  campaign_id: "campaign-postgres-0001",
  created_at: timestamp("2026-07-01T00:00:00.000Z"),
  id: "participant-persisted-id",
  locale_preference: "zh-CN",
  rank: 3,
  risk_flags: ["manual-review"],
  total_points: 120,
  updated_at: timestamp("2026-07-07T00:00:05.000Z"),
  wallet_address: "2F4ParticipantWallet",
  wallet_signature_status: "signed",
  wallet_source: "PORTKEY_EOA_EXTENSION",
  wallet_type_verified: true,
  wallet_verified_at: timestamp("2026-07-07T00:00:04.500Z"),
  ...overrides,
});

const completion = (
  overrides: Partial<CampaignDbTaskCompletion> = {},
): CampaignDbTaskCompletion => ({
  accountType: "EOA",
  campaignId: "campaign-postgres-0001",
  completedAt: "2026-07-07T00:00:06.000Z",
  createdAt: "2026-07-07T00:00:04.000Z",
  evidenceHash: "completion-evidence-hash",
  evidenceId: "provider-evidence-0001",
  evidenceSource: "AELFSCAN",
  id: "completion-request-id",
  pointsAwarded: 120,
  status: "completed",
  taskId: "task-postgres-0001",
  updatedAt: "2026-07-07T00:00:06.000Z",
  walletAddress: "2F4ParticipantWallet",
  walletSource: "PORTKEY_EOA_EXTENSION",
  ...overrides,
});

const completionRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  account_type: "EOA",
  campaign_id: "campaign-postgres-0001",
  completed_at: timestamp("2026-07-07T00:00:06.000Z"),
  created_at: timestamp("2026-07-01T00:00:00.000Z"),
  evidence_hash: "completion-evidence-hash",
  evidence_id: "provider-evidence-0001",
  evidence_source: "AELFSCAN",
  id: "completion-persisted-id",
  points_awarded: 120,
  status: "completed",
  task_id: "task-postgres-0001",
  updated_at: timestamp("2026-07-07T00:00:06.000Z"),
  wallet_address: "2F4ParticipantWallet",
  wallet_source: "PORTKEY_EOA_EXTENSION",
  ...overrides,
});

const evidence = (
  overrides: Partial<CampaignDbTaskEvidenceRecord> = {},
): CampaignDbTaskEvidenceRecord => ({
  accountType: "EOA",
  campaignId: "campaign-postgres-0001",
  capturedAt: "2026-07-07T00:00:07.000Z",
  completionId: "completion-persisted-id",
  createdAt: "2026-07-07T00:00:04.000Z",
  diagnosticCodes: ["local-review"],
  evidenceHash: "task-evidence-hash",
  evidenceRef: "aelfscan://transaction/0001",
  evidenceSource: "AELFSCAN",
  id: "evidence-request-id",
  liveContractExecuted: false,
  liveProviderExecuted: false,
  liveRewardExecuted: false,
  liveStorageExecuted: false,
  pointsAwarded: 120,
  status: "completed",
  taskId: "task-postgres-0001",
  updatedAt: "2026-07-07T00:00:07.000Z",
  walletAddress: "2F4ParticipantWallet",
  walletSource: "PORTKEY_EOA_EXTENSION",
  ...overrides,
});

const evidenceRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  account_type: "EOA",
  campaign_id: "campaign-postgres-0001",
  captured_at: timestamp("2026-07-07T00:00:07.000Z"),
  completion_id: "completion-persisted-id",
  created_at: timestamp("2026-07-01T00:00:00.000Z"),
  diagnostic_codes: ["local-review"],
  evidence_hash: "task-evidence-hash",
  evidence_ref: "aelfscan://transaction/0001",
  evidence_source: "AELFSCAN",
  id: "evidence-persisted-id",
  live_contract_executed: false,
  live_provider_executed: false,
  live_reward_executed: false,
  live_storage_executed: false,
  points_awarded: 120,
  status: "completed",
  task_id: "task-postgres-0001",
  updated_at: timestamp("2026-07-07T00:00:07.000Z"),
  wallet_address: "2F4ParticipantWallet",
  wallet_source: "PORTKEY_EOA_EXTENSION",
  ...overrides,
});

const referral = (
  overrides: Partial<CampaignDbReferralBindingRecord> = {},
): CampaignDbReferralBindingRecord => ({
  campaignId: "campaign-postgres-0001",
  createdAt: "2026-07-07T00:00:08.000Z",
  id: "referral-request-id",
  inviteeAccountType: "EOA",
  inviteeWalletAddress: "2F4InviteeWallet",
  inviteeWalletSource: "PORTKEY_EOA_EXTENSION",
  qualifiedActionCompleted: true,
  qualifiedActionCompletedAt: "2026-07-07T00:00:09.000Z",
  qualifiedActionEvidenceHash: "qualified-action-hash",
  referrerAccountType: "AA",
  referrerWalletAddress: "ELF_referrer_wallet",
  referrerWalletSource: "PORTKEY_AA",
  riskFlags: ["reviewed"],
  status: "qualified",
  updatedAt: "2026-07-07T00:00:09.000Z",
  ...overrides,
});

const referralRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  campaign_id: "campaign-postgres-0001",
  created_at: timestamp("2026-07-01T00:00:00.000Z"),
  id: "referral-persisted-id",
  invitee_account_type: "EOA",
  invitee_wallet_address: "2F4InviteeWallet",
  invitee_wallet_source: "PORTKEY_EOA_EXTENSION",
  qualified_action_completed: true,
  qualified_action_completed_at: timestamp("2026-07-07T00:00:09.000Z"),
  qualified_action_evidence_hash: "qualified-action-hash",
  referrer_account_type: "AA",
  referrer_wallet_address: "ELF_referrer_wallet",
  referrer_wallet_source: "PORTKEY_AA",
  risk_flags: ["reviewed"],
  status: "qualified",
  updated_at: timestamp("2026-07-07T00:00:09.000Z"),
  ...overrides,
});

const expectParameterized = (call: QueryCall, expectedValues: readonly unknown[]) => {
  expect(call.values).toEqual(expectedValues);

  for (const value of expectedValues) {
    if (typeof value === "string" && value.length > 0) {
      expect(call.text).not.toContain(`'${value.replace(/'/g, "''")}'`);
    }
  }
};

type VerificationFaultPoint =
  | "BEGIN"
  | "advisory_lock"
  | "initial_evidence"
  | "completion"
  | "linked_evidence"
  | "points_sum"
  | "participant"
  | "COMMIT";

interface VerificationRows {
  completions: Map<string, Record<string, unknown>>;
  evidence: Map<string, Record<string, unknown>>;
  participants: Map<string, Record<string, unknown>>;
}

interface VerificationTransaction {
  active: boolean;
  evidenceWriteCount: number;
  pending: VerificationRows;
  releaseLock?: () => void;
}

interface StatefulVerificationPoolOptions {
  faultPoint?: VerificationFaultPoint;
  loseFirstCommitResponse?: boolean;
}

const emptyVerificationRows = (): VerificationRows => ({
  completions: new Map(),
  evidence: new Map(),
  participants: new Map(),
});

const verificationRecordKey = (values: readonly unknown[]) =>
  JSON.stringify([values[1], values[2], values[3]]);
const verificationParticipantKey = (values: readonly unknown[]) =>
  JSON.stringify([values[1], values[2]]);
const asDatabaseDate = (value: unknown, fallback: string) =>
  value instanceof Date ? value : timestamp(typeof value === "string" ? value : fallback);
const asOptionalDatabaseDate = (value: unknown) => value === null || value === undefined
  ? null
  : asDatabaseDate(value, "2026-07-07T00:00:00.000Z");
const asJsonbValue = (value: unknown) => typeof value === "string"
  ? JSON.parse(value) as unknown
  : value;

class StatefulVerificationPool implements PostgresCampaignStorePool {
  readonly calls: QueryCall[] = [];
  readonly committed = emptyVerificationRows();
  readonly connect = vi.fn(async () => {
    const transaction: VerificationTransaction = {
      active: false,
      evidenceWriteCount: 0,
      pending: emptyVerificationRows(),
    };

    return {
      query: (text: string, values: readonly unknown[] = []) =>
        this.queryTransaction(transaction, text, values),
      release: () => {
        if (transaction.active) {
          this.releasedWhileActiveCount += 1;
        }
        transaction.releaseLock?.();
        transaction.releaseLock = undefined;
        this.release();
      },
    };
  });
  readonly end = vi.fn(async () => undefined);
  readonly release = vi.fn(() => undefined);
  readonly options: StatefulVerificationPoolOptions;
  commitSucceededCount = 0;
  lockAcquisitionCount = 0;
  maxActiveLockHolders = 0;
  releasedWhileActiveCount = 0;
  rollbackAttemptCount = 0;
  private readonly activeLockHolders = new Map<string, number>();
  private readonly lockTails = new Map<string, Promise<void>>();

  constructor(options: StatefulVerificationPoolOptions = {}) {
    this.options = options;
  }

  async query(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<PostgresCampaignStoreQueryResult> {
    const transaction: VerificationTransaction = {
      active: false,
      evidenceWriteCount: 0,
      pending: emptyVerificationRows(),
    };

    return await this.queryTransaction(transaction, text, values);
  }

  private fail(point: VerificationFaultPoint) {
    if (this.options.faultPoint === point) {
      throw new Error(`private database failure at ${point}`);
    }
  }

  private releaseTransactionLock(transaction: VerificationTransaction) {
    transaction.releaseLock?.();
    transaction.releaseLock = undefined;
  }

  private async acquireTransactionLock(
    transaction: VerificationTransaction,
    key: string,
  ) {
    const previous = this.lockTails.get(key) ?? Promise.resolve();
    let releaseCurrent: () => void = () => undefined;
    const current = new Promise<void>((resolve) => {
      releaseCurrent = resolve;
    });
    const tail = previous.then(() => current);
    this.lockTails.set(key, tail);
    await previous;
    const activeHolderCount = (this.activeLockHolders.get(key) ?? 0) + 1;
    this.activeLockHolders.set(key, activeHolderCount);
    this.lockAcquisitionCount += 1;
    this.maxActiveLockHolders = Math.max(this.maxActiveLockHolders, activeHolderCount);
    transaction.releaseLock = () => {
      this.activeLockHolders.set(key, Math.max(0, activeHolderCount - 1));
      releaseCurrent();
    };
  }

  private upsertEvidence(
    transaction: VerificationTransaction,
    values: readonly unknown[],
  ): Record<string, unknown> {
    const key = verificationRecordKey(values);
    const existing = transaction.pending.evidence.get(key) ?? this.committed.evidence.get(key);
    const row = evidenceRow({
      account_type: values[5],
      campaign_id: values[1],
      captured_at: asDatabaseDate(values[13], "2026-07-07T00:00:07.000Z"),
      completion_id: values[4],
      created_at: existing?.created_at
        ?? asDatabaseDate(values[18], "2026-07-07T00:00:04.000Z"),
      diagnostic_codes: asJsonbValue(values[11]),
      evidence_hash: values[9],
      evidence_ref: values[10],
      evidence_source: values[8],
      id: existing?.id ?? values[0],
      live_contract_executed: values[14],
      live_provider_executed: values[15],
      live_reward_executed: values[16],
      live_storage_executed: values[17],
      points_awarded: values[12],
      status: values[7],
      task_id: values[2],
      updated_at: asDatabaseDate(values[19], "2026-07-07T00:00:07.000Z"),
      wallet_address: values[3],
      wallet_source: values[6],
    });
    transaction.pending.evidence.set(key, row);

    return row;
  }

  private upsertCompletion(
    transaction: VerificationTransaction,
    values: readonly unknown[],
  ): Record<string, unknown> {
    const key = verificationRecordKey(values);
    const existing = transaction.pending.completions.get(key) ?? this.committed.completions.get(key);
    const row = completionRow({
      account_type: values[4],
      campaign_id: values[1],
      completed_at: asOptionalDatabaseDate(values[11]),
      created_at: existing?.created_at
        ?? asDatabaseDate(values[12], "2026-07-07T00:00:04.000Z"),
      evidence_hash: values[9],
      evidence_id: values[8],
      evidence_source: values[7],
      id: existing?.id ?? values[0],
      points_awarded: values[10],
      status: values[6],
      task_id: values[2],
      updated_at: asDatabaseDate(values[13], "2026-07-07T00:00:06.000Z"),
      wallet_address: values[3],
      wallet_source: values[5],
    });
    transaction.pending.completions.set(key, row);

    return row;
  }

  private totalPoints(
    transaction: VerificationTransaction,
    campaignId: string,
    walletAddress: string,
  ) {
    const rows = new Map(this.committed.completions);
    for (const [key, row] of transaction.pending.completions) {
      rows.set(key, row);
    }

    return Array.from(rows.values())
      .filter((row) => row.campaign_id === campaignId)
      .filter((row) => row.wallet_address === walletAddress)
      .filter((row) => row.status === "completed")
      .reduce((total, row) => total + Number(row.points_awarded), 0);
  }

  private upsertParticipant(
    transaction: VerificationTransaction,
    values: readonly unknown[],
  ): Record<string, unknown> {
    const key = verificationParticipantKey(values);
    const existing = transaction.pending.participants.get(key) ?? this.committed.participants.get(key);
    const row = participantRow({
      account_type: values[3],
      campaign_id: values[1],
      created_at: existing?.created_at
        ?? asDatabaseDate(values[12], "2026-07-07T00:00:04.000Z"),
      id: existing?.id ?? values[0],
      locale_preference: existing?.locale_preference ?? values[8],
      rank: existing?.rank ?? values[10],
      risk_flags: existing?.risk_flags ?? asJsonbValue(values[11]),
      total_points: values[9],
      updated_at: asDatabaseDate(values[13], "2026-07-07T00:00:05.000Z"),
      wallet_address: values[2],
      wallet_signature_status: existing?.wallet_signature_status ?? values[6],
      wallet_source: values[4],
      wallet_type_verified: values[5],
      wallet_verified_at: existing?.wallet_verified_at ?? asOptionalDatabaseDate(values[7]),
    });
    transaction.pending.participants.set(key, row);

    return row;
  }

  private commit(transaction: VerificationTransaction) {
    this.assertPrimaryKeysUnique(
      this.committed.completions,
      transaction.pending.completions,
    );
    this.assertPrimaryKeysUnique(
      this.committed.evidence,
      transaction.pending.evidence,
    );
    this.assertPrimaryKeysUnique(
      this.committed.participants,
      transaction.pending.participants,
    );
    this.assertVerificationLinks(transaction);
    for (const [key, row] of transaction.pending.completions) {
      this.committed.completions.set(key, row);
    }
    for (const [key, row] of transaction.pending.evidence) {
      this.committed.evidence.set(key, row);
    }
    for (const [key, row] of transaction.pending.participants) {
      this.committed.participants.set(key, row);
    }
    transaction.pending = emptyVerificationRows();
    transaction.active = false;
    this.commitSucceededCount += 1;
    this.releaseTransactionLock(transaction);
  }

  private assertVerificationLinks(transaction: VerificationTransaction) {
    const completions = new Map(this.committed.completions);
    const evidence = new Map(this.committed.evidence);
    for (const [key, row] of transaction.pending.completions) {
      completions.set(key, row);
    }
    for (const [key, row] of transaction.pending.evidence) {
      evidence.set(key, row);
    }

    for (const [key, evidenceRowValue] of evidence) {
      const completionRowValue = completions.get(key);
      if (
        evidenceRowValue.completion_id !== null
        && evidenceRowValue.completion_id !== undefined
        && (
          completionRowValue === undefined
          || completionRowValue.id !== evidenceRowValue.completion_id
          || completionRowValue.evidence_id !== evidenceRowValue.id
        )
      ) {
        throw Object.assign(new Error("verification link constraint failed"), { code: "23503" });
      }
    }
  }

  private assertPrimaryKeysUnique(
    committed: ReadonlyMap<string, Record<string, unknown>>,
    pending: ReadonlyMap<string, Record<string, unknown>>,
  ) {
    const logicalKeyById = new Map<string, string>();

    for (const [key, row] of committed) {
      logicalKeyById.set(String(row.id), key);
    }
    for (const [key, row] of pending) {
      const id = String(row.id);
      const existingKey = logicalKeyById.get(id);

      if (existingKey !== undefined && existingKey !== key) {
        throw Object.assign(new Error("duplicate primary key"), { code: "23505" });
      }
      logicalKeyById.set(id, key);
    }
  }

  private async queryTransaction(
    transaction: VerificationTransaction,
    text: string,
    values: readonly unknown[],
  ): Promise<PostgresCampaignStoreQueryResult> {
    const call = { text: normalizeSql(text), values };
    this.calls.push(call);

    if (call.text === "BEGIN") {
      this.fail("BEGIN");
      transaction.active = true;
      transaction.evidenceWriteCount = 0;
      transaction.pending = emptyVerificationRows();
      return { rows: [] };
    }

    if (call.text.includes("pg_advisory_xact_lock")) {
      this.fail("advisory_lock");
      await this.acquireTransactionLock(
        transaction,
        JSON.stringify([values[0], values[1]]),
      );
      return { rows: [] };
    }

    if (call.text.startsWith("INSERT INTO campaign_os.campaign_task_evidence")) {
      const point = transaction.evidenceWriteCount === 0
        ? "initial_evidence"
        : "linked_evidence";
      this.fail(point);
      transaction.evidenceWriteCount += 1;
      return { rows: [this.upsertEvidence(transaction, values)] };
    }

    if (call.text.startsWith("INSERT INTO campaign_os.campaign_task_completions")) {
      this.fail("completion");
      return { rows: [this.upsertCompletion(transaction, values)] };
    }

    if (call.text.includes("SUM(points_awarded)")) {
      this.fail("points_sum");
      return {
        rows: [{ total_points: String(this.totalPoints(
          transaction,
          String(values[0]),
          String(values[1]),
        )) }],
      };
    }

    if (call.text.startsWith("INSERT INTO campaign_os.campaign_participants")) {
      this.fail("participant");
      return { rows: [this.upsertParticipant(transaction, values)] };
    }

    if (call.text === "COMMIT") {
      this.fail("COMMIT");
      this.commit(transaction);
      if (this.options.loseFirstCommitResponse && this.commitSucceededCount === 1) {
        throw new Error("commit completed but response was lost");
      }
      return { rows: [] };
    }

    if (call.text === "ROLLBACK") {
      this.rollbackAttemptCount += 1;
      transaction.pending = emptyVerificationRows();
      transaction.active = false;
      this.releaseTransactionLock(transaction);
      return { rows: [] };
    }

    return { rows: [] };
  }
}

describe("PostgreSQL Campaign durable store", () => {
  it("does not query or connect while the store is being constructed", () => {
    const pool = new TranscriptPool();

    createPostgresCampaignDurableStore({ pool });

    expect(pool.calls).toEqual([]);
    expect(pool.end).not.toHaveBeenCalled();
    expect(pgPoolCompatibility).toBe(true);
  });

  it("creates, gets, and filters Campaign rows with bounded stable SQL", async () => {
    const pool = new TranscriptPool((call) => ({
      rows: call.text.startsWith("INSERT") || call.text.includes("WHERE id = $1")
        ? [campaignRow()]
        : [campaignRow({ id: "campaign-postgres-list-0001" })],
    }));
    const store = createPostgresCampaignDurableStore({ boundedListLimit: 500, pool });
    const input = campaign();

    await expect(store.create(input)).resolves.toEqual(input);
    await expect(store.getById(input.id)).resolves.toEqual(input);
    await expect(store.list({
      limit: 999,
      ownerAddress: input.ownerAddress,
      projectId: input.projectId,
      status: input.status,
    })).resolves.toEqual([
      expect.objectContaining({ id: "campaign-postgres-list-0001" }),
    ]);

    expect(pool.calls[0]?.text).toMatch(/^INSERT INTO campaign_os\.campaigns/);
    expect(pool.calls[0]?.text).toContain("RETURNING");
    expect(pool.calls[0]?.text).toContain("$6::jsonb");
    expect(pool.calls[0]?.text).toContain("$17::jsonb");
    expectParameterized(pool.calls[0]!, [
      input.id,
      input.projectId,
      input.ownerAddress,
      input.status,
      input.defaultLocale,
      JSON.stringify(input.supportedLocales),
      input.walletPolicy,
      input.contractMode,
      input.goal,
      input.duration,
      input.rewardDescription,
      input.rewardDisclaimerHash,
      input.metadataUri,
      input.metadataHash,
      input.startTime,
      input.endTime,
      JSON.stringify(input.publishReadiness),
      input.createdAt,
      input.updatedAt,
    ]);
    expectParameterized(pool.calls[1]!, [input.id]);
    expect(pool.calls[2]?.text).toContain("project_id = $1");
    expect(pool.calls[2]?.text).toContain("owner_address = $2");
    expect(pool.calls[2]?.text).toContain("status = $3");
    expect(pool.calls[2]?.text).toContain("ORDER BY id ASC");
    expect(pool.calls[2]?.text).toContain("LIMIT $4");
    expectParameterized(pool.calls[2]!, [input.projectId, input.ownerAddress, input.status, 100]);
  });

  it("creates and lists Campaign Task rows through database-side bounds", async () => {
    const pool = new TranscriptPool((call) => ({
      rows: call.text.startsWith("INSERT") ? [taskRow()] : [taskRow()],
    }));
    const store = createPostgresCampaignDurableStore({ boundedListLimit: 25, pool });
    const input = task();

    await expect(store.createTaskDraft(input)).resolves.toEqual(input);
    await expect(store.listTaskDraftsByCampaignId(input.campaignId)).resolves.toEqual([input]);

    expect(pool.calls[0]?.text).toMatch(/^INSERT INTO campaign_os\.campaign_tasks/);
    expect(pool.calls[0]?.text).toContain("$8::jsonb");
    expectParameterized(pool.calls[0]!, [
      input.id,
      input.campaignId,
      input.templateCode,
      input.verificationType,
      input.walletCompatibility,
      input.points,
      input.required,
      JSON.stringify(input.evidenceRule),
      input.createdAt,
      input.updatedAt,
    ]);
    expect(pool.calls[1]?.text).toContain("WHERE campaign_id = $1 ORDER BY id ASC LIMIT $2");
    expectParameterized(pool.calls[1]!, [input.campaignId, 25]);
  });

  it("reads a coherent exact-wallet journey snapshot in one repeatable-read transaction", async () => {
    const walletAddress = "ELF_2F4SnapshotWallet";
    const pool = new TranscriptPool((call) => {
      if (call.text.includes("FROM campaign_os.campaigns")) {
        return { rows: [campaignRow()] };
      }

      if (call.text.includes("FROM campaign_os.campaign_tasks")) {
        return { rows: [taskRow()] };
      }

      if (
        call.text.includes("FROM campaign_os.campaign_participants") &&
        call.text.includes("ORDER BY total_points DESC")
      ) {
        return {
          rows: [
            participantRow({
              created_at: timestamp("2026-07-01T00:00:00.000Z"),
              id: "participant-rank-first",
              rank: 999,
              total_points: 200,
              wallet_address: "ELF_2F4RankFirst",
            }),
            participantRow({
              created_at: timestamp("2026-07-02T00:00:00.000Z"),
              id: "participant-subject",
              rank: 1,
              total_points: 120,
              wallet_address: walletAddress,
            }),
          ],
        };
      }

      if (call.text.includes("FROM campaign_os.campaign_participants")) {
        return { rows: [participantRow({ wallet_address: walletAddress })] };
      }

      if (call.text.includes("FROM campaign_os.campaign_task_completions")) {
        return { rows: [completionRow({ wallet_address: walletAddress })] };
      }

      if (call.text.includes("FROM campaign_os.campaign_task_evidence")) {
        return { rows: [evidenceRow({ wallet_address: walletAddress })] };
      }

      return { rows: [] };
    });
    const store = createPostgresCampaignDurableStore({ boundedListLimit: 100, pool });

    const snapshot = await store.getParticipantJourneySnapshot({
      campaignId: "campaign-postgres-0001",
      walletAddress,
    }, { traceId: "trace-postgres-snapshot" });

    expect(snapshot).toMatchObject({
      campaign: { id: "campaign-postgres-0001" },
      completions: [{ walletAddress }],
      evidence: [{ walletAddress }],
      participant: { walletAddress },
      tasks: [{ id: "task-postgres-0001" }],
    });
    expect(snapshot.rankingParticipants).toEqual([
      {
        campaignId: "campaign-postgres-0001",
        createdAt: "2026-07-01T00:00:00.000Z",
        id: "participant-rank-first",
        totalPoints: 200,
        walletAddress: "ELF_2F4RankFirst",
      },
      {
        campaignId: "campaign-postgres-0001",
        createdAt: "2026-07-02T00:00:00.000Z",
        id: "participant-subject",
        totalPoints: 120,
        walletAddress,
      },
    ]);
    expect(pool.calls.map((call) => call.text)).toEqual([
      "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
      expect.stringContaining("FROM campaign_os.campaigns"),
      expect.stringContaining("FROM campaign_os.campaign_tasks"),
      expect.stringContaining("FROM campaign_os.campaign_participants"),
      expect.stringContaining("FROM campaign_os.campaign_task_completions"),
      expect.stringContaining("FROM campaign_os.campaign_task_evidence"),
      expect.stringContaining("ORDER BY total_points DESC"),
      "COMMIT",
    ]);
    expectParameterized(pool.calls[1]!, ["campaign-postgres-0001"]);
    expectParameterized(pool.calls[2]!, ["campaign-postgres-0001", 100, 0]);
    expectParameterized(pool.calls[3]!, ["campaign-postgres-0001", walletAddress]);
    expectParameterized(pool.calls[4]!, ["campaign-postgres-0001", walletAddress, 100, 0]);
    expectParameterized(pool.calls[5]!, ["campaign-postgres-0001", walletAddress, 100, 0]);
    expectParameterized(pool.calls[6]!, ["campaign-postgres-0001", 100, 0]);
    expect(pool.calls[6]?.text).toContain("created_at ASC");
    expect(pool.calls[6]?.text).toContain("id COLLATE \"C\" ASC");
    expect(pool.calls[6]?.text).toContain("wallet_address COLLATE \"C\" ASC");
    expect(pool.calls.every((call) => !call.text.match(/UPDATE\s+campaign_os\.campaign_participants/i))).toBe(true);
    expect(pool.release).toHaveBeenCalledOnce();
  });

  it("paginates coherent journey records instead of truncating at the generic list bound", async () => {
    const walletAddress = "ELF_2F4PageSubject";
    const taskRows = Array.from({ length: 101 }, (_, index) => taskRow({
      id: `task-page-${index.toString().padStart(4, "0")}`,
    }));
    const completionRows = Array.from({ length: 101 }, (_, index) => completionRow({
      evidence_id: `evidence-page-${index.toString().padStart(4, "0")}`,
      id: `completion-page-${index.toString().padStart(4, "0")}`,
      task_id: `task-page-${index.toString().padStart(4, "0")}`,
      wallet_address: walletAddress,
    }));
    const evidenceRows = Array.from({ length: 101 }, (_, index) => evidenceRow({
      completion_id: `completion-page-${index.toString().padStart(4, "0")}`,
      id: `evidence-page-${index.toString().padStart(4, "0")}`,
      task_id: `task-page-${index.toString().padStart(4, "0")}`,
      wallet_address: walletAddress,
    }));
    const rankingRows = Array.from({ length: 101 }, (_, index) => participantRow({
      id: `participant-page-${index.toString().padStart(4, "0")}`,
      total_points: 101 - index,
      wallet_address: `ELF_2F4PageWallet${index.toString().padStart(4, "0")}`,
    }));
    const pool = new TranscriptPool((call) => {
      if (call.text.includes("FROM campaign_os.campaigns")) {
        return { rows: [campaignRow()] };
      }

      if (call.text.includes("FROM campaign_os.campaign_tasks")) {
        const offset = typeof call.values[2] === "number" ? call.values[2] : 0;

        return { rows: taskRows.slice(offset, offset + 100) };
      }

      if (call.text.includes("FROM campaign_os.campaign_task_completions")) {
        const offset = typeof call.values[3] === "number" ? call.values[3] : 0;

        return { rows: completionRows.slice(offset, offset + 100) };
      }

      if (call.text.includes("FROM campaign_os.campaign_task_evidence")) {
        const offset = typeof call.values[3] === "number" ? call.values[3] : 0;

        return { rows: evidenceRows.slice(offset, offset + 100) };
      }

      if (
        call.text.includes("FROM campaign_os.campaign_participants")
        && call.text.includes("ORDER BY total_points DESC")
      ) {
        const offset = typeof call.values[2] === "number" ? call.values[2] : 0;

        return { rows: rankingRows.slice(offset, offset + 100) };
      }

      return { rows: [] };
    });
    const store = createPostgresCampaignDurableStore({ boundedListLimit: 100, pool });

    const snapshot = await store.getParticipantJourneySnapshot({
      campaignId: "campaign-postgres-0001",
      walletAddress,
    });

    expect(snapshot.tasks).toHaveLength(101);
    expect(snapshot.completions).toHaveLength(101);
    expect(snapshot.evidence).toHaveLength(101);
    expect(snapshot.rankingParticipants).toHaveLength(101);
    expect(pool.calls.filter((call) =>
      call.text.includes("FROM campaign_os.campaign_tasks"))).toHaveLength(2);
    expect(pool.calls.filter((call) =>
      call.text.includes("FROM campaign_os.campaign_task_completions"))).toHaveLength(2);
    expect(pool.calls.filter((call) =>
      call.text.includes("FROM campaign_os.campaign_task_evidence"))).toHaveLength(2);
    expect(pool.calls.filter((call) =>
      call.text.includes("ORDER BY total_points DESC"))).toHaveLength(2);
    expect(pool.release).toHaveBeenCalledOnce();
  });

  it("commits a missing Campaign snapshot as an empty read without creating zero-state rows", async () => {
    const pool = new TranscriptPool((call) =>
      call.text.includes("FROM campaign_os.campaigns") ? { rows: [] } : { rows: [] });
    const store = createPostgresCampaignDurableStore({ pool });

    await expect(store.getParticipantJourneySnapshot({
      campaignId: "missing-campaign",
      walletAddress: "ELF_2F4MissingSnapshotWallet",
    }, { traceId: "trace-postgres-snapshot-missing" })).resolves.toEqual({
      campaign: undefined,
      completions: [],
      evidence: [],
      participant: undefined,
      rankingParticipants: [],
      tasks: [],
    });
    expect(pool.calls.map((call) => call.text)).toEqual([
      "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
      expect.stringContaining("FROM campaign_os.campaigns"),
      "COMMIT",
    ]);
    expect(pool.calls.some((call) => call.text.startsWith("INSERT") || call.text.startsWith("UPDATE"))).toBe(false);
    expect(pool.release).toHaveBeenCalledOnce();
  });

  it("rolls back snapshot query failures and maps release failures safely", async () => {
    const failingPool = new TranscriptPool((call) => {
      if (call.text.includes("FROM campaign_os.campaign_tasks")) {
        throw new Error("postgres://private-user:private-password@db.internal/private");
      }

      return call.text.includes("FROM campaign_os.campaigns")
        ? { rows: [campaignRow()] }
        : { rows: [] };
    });
    const failingStore = createPostgresCampaignDurableStore({ pool: failingPool });

    await expect(failingStore.getParticipantJourneySnapshot({
      campaignId: "campaign-postgres-0001",
      walletAddress: "ELF_2F4SnapshotWallet",
    }, { traceId: "trace-postgres-snapshot-failure" })).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_QUERY_FAILED",
      operation: "getParticipantJourneySnapshot",
      traceId: "trace-postgres-snapshot-failure",
    });
    expect(failingPool.calls[failingPool.calls.length - 1]?.text).toBe("ROLLBACK");
    expect(failingPool.release).toHaveBeenCalledOnce();

    const releasePool = new TranscriptPool(
      (call) => call.text.includes("FROM campaign_os.campaigns") ? { rows: [] } : { rows: [] },
      undefined,
      new Error("private release detail"),
    );
    const releaseStore = createPostgresCampaignDurableStore({ pool: releasePool });
    await expect(releaseStore.getParticipantJourneySnapshot({
      campaignId: "missing-campaign",
      walletAddress: "ELF_2F4SnapshotWallet",
    }, { traceId: "trace-postgres-snapshot-release" })).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_CLEANUP_FAILED",
      operation: "getParticipantJourneySnapshot",
      traceId: "trace-postgres-snapshot-release",
    });
  });

  it("gets, lists, and atomically upserts Participants while preserving immutable fields", async () => {
    const pool = new TranscriptPool(() => ({ rows: [participantRow()] }));
    const store = createPostgresCampaignDurableStore({ pool });
    const input = participant();

    await expect(store.getParticipant(input.campaignId, input.walletAddress)).resolves.toMatchObject({
      createdAt: "2026-07-01T00:00:00.000Z",
      id: "participant-persisted-id",
    });
    await expect(store.listParticipantsByCampaignId(input.campaignId)).resolves.toHaveLength(1);
    await expect(store.upsertParticipant(input)).resolves.toMatchObject({
      createdAt: "2026-07-01T00:00:00.000Z",
      id: "participant-persisted-id",
      totalPoints: 120,
    });

    const upsert = pool.calls[2]!;
    expect(upsert.text).toContain("ON CONFLICT (campaign_id, wallet_address) DO UPDATE");
    expect(upsert.text).not.toMatch(/DO UPDATE SET[^]*\bid\s*=/);
    expect(upsert.text).not.toMatch(/DO UPDATE SET[^]*\bcreated_at\s*=/);
    expect(upsert.text).toContain("RETURNING");
    expect(upsert.text).toContain("$12::jsonb");
    expectParameterized(upsert, [
      input.id,
      input.campaignId,
      input.walletAddress,
      input.accountType,
      input.walletSource,
      input.walletTypeVerified,
      input.walletSignatureStatus,
      input.walletVerifiedAt,
      input.localePreference,
      input.totalPoints,
      input.rank,
      JSON.stringify(input.riskFlags),
      input.createdAt,
      input.updatedAt,
    ]);
  });

  it("lists and atomically upserts Task Completions on the Campaign-scoped key", async () => {
    const pool = new TranscriptPool(() => ({ rows: [completionRow()] }));
    const store = createPostgresCampaignDurableStore({ pool });
    const input = completion();

    await expect(store.listTaskCompletionsByCampaignId(input.campaignId)).resolves.toHaveLength(1);
    await expect(store.upsertTaskCompletion(input)).resolves.toMatchObject({
      createdAt: "2026-07-01T00:00:00.000Z",
      id: "completion-persisted-id",
    });

    const upsert = pool.calls[1]!;
    expect(upsert.text).toContain("ON CONFLICT (campaign_id, task_id, wallet_address) DO UPDATE");
    expect(upsert.text).toContain("RETURNING");
    expectParameterized(upsert, [
      input.id,
      input.campaignId,
      input.taskId,
      input.walletAddress,
      input.accountType,
      input.walletSource,
      input.status,
      input.evidenceSource,
      input.evidenceId,
      input.evidenceHash,
      input.pointsAwarded,
      input.completedAt,
      input.createdAt,
      input.updatedAt,
    ]);
  });

  it("atomically persists verification records under a Campaign-wallet lock", async () => {
    const pool = new TranscriptPool((call) => {
      if (call.text.startsWith("INSERT INTO campaign_os.campaign_task_evidence")) {
        const completionId = call.values[4];

        return {
          rows: [evidenceRow({
            completion_id: completionId,
            id: "evidence-persisted-id",
          })],
        };
      }

      if (call.text.startsWith("INSERT INTO campaign_os.campaign_task_completions")) {
        return {
          rows: [completionRow({
            evidence_id: "evidence-persisted-id",
            id: "completion-persisted-id",
          })],
        };
      }

      if (call.text.includes("SUM(points_awarded)")) {
        return { rows: [{ total_points: "120" }] };
      }

      if (call.text.startsWith("INSERT INTO campaign_os.campaign_participants")) {
        return { rows: [participantRow({ rank: 999, total_points: 120 })] };
      }

      return { rows: [] };
    });
    const store = createPostgresCampaignDurableStore({ pool }) as ReturnType<
      typeof createPostgresCampaignDurableStore
    > & {
      upsertTaskVerification(input: {
        completion: CampaignDbTaskCompletion;
        evidence: CampaignDbTaskEvidenceRecord;
        participant: CampaignDbParticipantRecord;
      }, context?: { traceId?: string }): Promise<{
        completion: CampaignDbTaskCompletion;
        evidence: CampaignDbTaskEvidenceRecord;
        participant: CampaignDbParticipantRecord;
      }>;
    };

    const result = await store.upsertTaskVerification({
      completion: completion({ evidenceId: "evidence-request-id" }),
      evidence: evidence({ completionId: undefined }),
      participant: participant({ totalPoints: 0 }),
    }, { traceId: "trace-atomic-verification" });
    expect(result).toMatchObject({
      completion: { id: "completion-persisted-id" },
      evidence: { completionId: "completion-persisted-id", id: "evidence-persisted-id" },
      participant: { id: "participant-persisted-id", totalPoints: 120 },
    });
    expect(result.participant).not.toHaveProperty("rank");

    expect(pool.calls.map((call) => call.text)).toEqual([
      "BEGIN",
      expect.stringContaining("pg_advisory_xact_lock"),
      expect.stringMatching(/^INSERT INTO campaign_os\.campaign_task_evidence/),
      expect.stringMatching(/^INSERT INTO campaign_os\.campaign_task_completions/),
      expect.stringMatching(/^INSERT INTO campaign_os\.campaign_task_evidence/),
      expect.stringContaining("SUM(points_awarded)"),
      expect.stringMatching(/^INSERT INTO campaign_os\.campaign_participants/),
      "COMMIT",
    ]);
    expect(pool.calls[1]?.values).toEqual([
      "campaign-postgres-0001",
      "2F4ParticipantWallet",
    ]);
    expect(pool.calls[1]?.text).toContain("jsonb_build_array($1::text, $2::text)");
    const participantUpsert = pool.calls.find((call) =>
      call.text.startsWith("INSERT INTO campaign_os.campaign_participants"));
    expect(participantUpsert?.text).not.toContain("rank = EXCLUDED.rank");
    expect(participantUpsert?.text).not.toContain("risk_flags = EXCLUDED.risk_flags");
    expect(participantUpsert?.values[10]).toBeNull();
    expect(pool.calls.some((call) => call.text === "ROLLBACK")).toBe(false);
    expect(pool.connect).toHaveBeenCalledTimes(1);
    expect(pool.release).toHaveBeenCalledTimes(1);
  });

  it("rolls back atomic verification when an intermediate write fails", async () => {
    const pool = new TranscriptPool((call) => {
      if (call.text.startsWith("INSERT INTO campaign_os.campaign_task_evidence")) {
        return { rows: [evidenceRow({ completion_id: null })] };
      }

      if (call.text.startsWith("INSERT INTO campaign_os.campaign_task_completions")) {
        throw new Error("postgres://runtime-user:runtime-password@db.internal/campaign_os");
      }

      return { rows: [] };
    });
    const store = createPostgresCampaignDurableStore({ pool }) as ReturnType<
      typeof createPostgresCampaignDurableStore
    > & {
      upsertTaskVerification(input: {
        completion: CampaignDbTaskCompletion;
        evidence: CampaignDbTaskEvidenceRecord;
        participant: CampaignDbParticipantRecord;
      }, context?: { traceId?: string }): Promise<unknown>;
    };

    await expect(store.upsertTaskVerification({
      completion: completion(),
      evidence: evidence({ completionId: undefined }),
      participant: participant({ totalPoints: 0 }),
    }, { traceId: "trace-atomic-rollback" })).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_QUERY_FAILED",
      operation: "upsertTaskVerification",
      traceId: "trace-atomic-rollback",
    });
    expect(pool.calls[pool.calls.length - 1]?.text).toBe("ROLLBACK");
    expect(pool.calls.some((call) => call.text === "COMMIT")).toBe(false);
    expect(pool.release).toHaveBeenCalledTimes(1);
  });

  it("returns a safe cleanup failure when atomic verification rollback fails", async () => {
    const pool = new TranscriptPool((call) => {
      if (call.text.startsWith("INSERT INTO campaign_os.campaign_task_evidence")) {
        throw new Error("raw insert failure");
      }

      if (call.text === "ROLLBACK") {
        throw new Error("raw rollback failure");
      }

      return { rows: [] };
    });
    const store = createPostgresCampaignDurableStore({ pool }) as ReturnType<
      typeof createPostgresCampaignDurableStore
    > & {
      upsertTaskVerification(input: {
        completion: CampaignDbTaskCompletion;
        evidence: CampaignDbTaskEvidenceRecord;
        participant: CampaignDbParticipantRecord;
      }, context?: { traceId?: string }): Promise<unknown>;
    };

    await expect(store.upsertTaskVerification({
      completion: completion(),
      evidence: evidence({ completionId: undefined }),
      participant: participant({ totalPoints: 0 }),
    }, { traceId: "trace-atomic-cleanup" })).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_CLEANUP_FAILED",
      operation: "upsertTaskVerification",
      traceId: "trace-atomic-cleanup",
    });
    expect(pool.release).toHaveBeenCalledTimes(1);
  });

  it.each([
    "BEGIN",
    "advisory_lock",
    "initial_evidence",
    "completion",
    "linked_evidence",
    "points_sum",
    "participant",
    "COMMIT",
  ] as const)("rolls back every %s verification fault without committed partial rows", async (faultPoint) => {
    const pool = new StatefulVerificationPool({ faultPoint });
    const store = createPostgresCampaignDurableStore({ pool });

    await expect(store.upsertTaskVerification!({
      completion: completion(),
      evidence: evidence({ completionId: undefined }),
      participant: participant({ totalPoints: 0 }),
    }, { traceId: `trace-atomic-fault-${faultPoint}` })).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_QUERY_FAILED",
      operation: "upsertTaskVerification",
      traceId: `trace-atomic-fault-${faultPoint}`,
    });
    expect(pool.rollbackAttemptCount).toBe(1);
    expect(pool.commitSucceededCount).toBe(0);
    expect(pool.committed.completions.size).toBe(0);
    expect(pool.committed.evidence.size).toBe(0);
    expect(pool.committed.participants.size).toBe(0);
    expect(pool.release).toHaveBeenCalledOnce();
  });

  it("returns database-canonical identities across twenty concurrent retries", async () => {
    const pool = new StatefulVerificationPool();
    const store = createPostgresCampaignDurableStore({ pool });

    const results = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      store.upsertTaskVerification!({
        completion: completion({ id: `completion-request-${index}` }),
        evidence: evidence({ completionId: undefined, id: `evidence-request-${index}` }),
        participant: participant({ id: `participant-request-${index}`, totalPoints: 0 }),
      }, { traceId: `trace-postgres-concurrent-${index}` })));

    expect(new Set(results.map((result) => result.completion.id)).size).toBe(1);
    expect(new Set(results.map((result) => result.evidence.id)).size).toBe(1);
    expect(new Set(results.map((result) => result.participant.id)).size).toBe(1);
    expect(results.every((result) => result.participant.totalPoints === 120)).toBe(true);
    expect(pool.committed.completions.size).toBe(1);
    expect(pool.committed.evidence.size).toBe(1);
    expect(pool.committed.participants.size).toBe(1);
    expect(pool.commitSucceededCount).toBe(20);
    expect(pool.lockAcquisitionCount).toBe(20);
    expect(pool.maxActiveLockHolders).toBe(1);
    expect(pool.releasedWhileActiveCount).toBe(0);
    expect(pool.rollbackAttemptCount).toBe(0);
    expect(pool.connect).toHaveBeenCalledTimes(20);
    expect(pool.release).toHaveBeenCalledTimes(20);
  });

  it("derives Participant points from committed and pending completed Tasks", async () => {
    const pool = new StatefulVerificationPool();
    const store = createPostgresCampaignDurableStore({ pool });

    const first = await store.upsertTaskVerification!({
      completion: completion({
        id: "completion-points-a",
        pointsAwarded: 31,
        taskId: "task-points-a",
      }),
      evidence: evidence({
        completionId: undefined,
        id: "evidence-points-a",
        pointsAwarded: 31,
        taskId: "task-points-a",
      }),
      participant: participant({ id: "participant-points-a", totalPoints: 0 }),
    }, { traceId: "trace-points-a" });
    const second = await store.upsertTaskVerification!({
      completion: completion({
        id: "completion-points-b",
        pointsAwarded: 47,
        taskId: "task-points-b",
      }),
      evidence: evidence({
        completionId: undefined,
        id: "evidence-points-b",
        pointsAwarded: 47,
        taskId: "task-points-b",
      }),
      participant: participant({ id: "participant-points-b", totalPoints: 0 }),
    }, { traceId: "trace-points-b" });

    expect(first.participant.totalPoints).toBe(31);
    expect(second.participant.totalPoints).toBe(78);
    expect(second.participant.id).toBe(first.participant.id);
    expect(pool.committed.completions.size).toBe(2);
    expect(pool.committed.evidence.size).toBe(2);
    expect(pool.committed.participants.size).toBe(1);
    expect([...pool.committed.participants.values()][0]?.total_points).toBe(78);
  });

  it("keeps canonical verification rows independent across concurrent wallets", async () => {
    const pool = new StatefulVerificationPool();
    const store = createPostgresCampaignDurableStore({ pool });
    const wallets = ["ELF_2F4PostgresWalletA", "ELF_2F4PostgresWalletB"];

    const results = await Promise.all(wallets.flatMap((walletAddress) =>
      Array.from({ length: 10 }, (_, index) => store.upsertTaskVerification!({
        completion: completion({
          id: `completion-${walletAddress}-${index}`,
          walletAddress,
        }),
        evidence: evidence({
          completionId: undefined,
          id: `evidence-${walletAddress}-${index}`,
          walletAddress,
        }),
        participant: participant({
          id: `participant-${walletAddress}-${index}`,
          totalPoints: 0,
          walletAddress,
        }),
      }, { traceId: `trace-${walletAddress}-${index}` }))));

    for (const walletAddress of wallets) {
      const walletResults = results.filter(
        (result) => result.completion.walletAddress === walletAddress,
      );
      expect(new Set(walletResults.map((result) => result.completion.id))).toHaveLength(1);
      expect(new Set(walletResults.map((result) => result.evidence.id))).toHaveLength(1);
      expect(new Set(walletResults.map((result) => result.participant.id))).toHaveLength(1);
      expect(walletResults.every((result) => result.participant.totalPoints === 120)).toBe(true);
    }
    expect(results[0]?.completion.id).not.toBe(results[10]?.completion.id);
    expect(pool.committed.completions.size).toBe(2);
    expect(pool.committed.evidence.size).toBe(2);
    expect(pool.committed.participants.size).toBe(2);
    expect(pool.commitSucceededCount).toBe(20);
    expect(pool.lockAcquisitionCount).toBe(20);
    expect(pool.maxActiveLockHolders).toBe(1);
    expect(pool.releasedWhileActiveCount).toBe(0);
    expect(pool.rollbackAttemptCount).toBe(0);
    expect(pool.release).toHaveBeenCalledTimes(20);
  });

  it("rejects cross-wallet primary-key collisions without publishing partial rows", async () => {
    const pool = new StatefulVerificationPool();
    const store = createPostgresCampaignDurableStore({ pool });
    const firstWrite = {
      completion: completion({ id: "shared-completion-id" }),
      evidence: evidence({ completionId: undefined, id: "shared-evidence-id" }),
      participant: participant({ id: "shared-participant-id", totalPoints: 0 }),
    };
    await store.upsertTaskVerification!(firstWrite, { traceId: "trace-primary-key-first" });

    const secondWallet = "ELF_2F4PrimaryKeyWalletB";
    await expect(store.upsertTaskVerification!({
      completion: { ...firstWrite.completion, walletAddress: secondWallet },
      evidence: { ...firstWrite.evidence, walletAddress: secondWallet },
      participant: { ...firstWrite.participant, walletAddress: secondWallet },
    }, { traceId: "trace-primary-key-collision" })).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_CONFLICT",
      operation: "upsertTaskVerification",
      traceId: "trace-primary-key-collision",
    });
    expect(pool.committed.completions.size).toBe(1);
    expect(pool.committed.evidence.size).toBe(1);
    expect(pool.committed.participants.size).toBe(1);
    expect(pool.commitSucceededCount).toBe(1);
    expect(pool.rollbackAttemptCount).toBe(1);
    expect(pool.releasedWhileActiveCount).toBe(0);
    expect(pool.release).toHaveBeenCalledTimes(2);
  });

  it("reuses committed canonical identities when the first COMMIT response is lost", async () => {
    const pool = new StatefulVerificationPool({ loseFirstCommitResponse: true });
    const store = createPostgresCampaignDurableStore({ pool });
    const write = {
      completion: completion(),
      evidence: evidence({ completionId: undefined }),
      participant: participant({ totalPoints: 0 }),
    };

    await expect(store.upsertTaskVerification!(write, {
      traceId: "trace-postgres-lost-response-first",
    })).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_QUERY_FAILED",
      traceId: "trace-postgres-lost-response-first",
    });
    expect(pool.commitSucceededCount).toBe(1);
    expect(pool.rollbackAttemptCount).toBe(1);
    expect(pool.committed.completions.size).toBe(1);
    expect(pool.committed.evidence.size).toBe(1);
    expect(pool.committed.participants.size).toBe(1);
    const canonicalCompletionId = String([...pool.committed.completions.values()][0]?.id);
    const canonicalEvidenceId = String([...pool.committed.evidence.values()][0]?.id);
    const canonicalParticipantId = String([...pool.committed.participants.values()][0]?.id);

    await expect(store.upsertTaskVerification!({
      completion: { ...write.completion, id: "completion-second-request" },
      evidence: { ...write.evidence, id: "evidence-second-request" },
      participant: { ...write.participant, id: "participant-second-request" },
    }, { traceId: "trace-postgres-lost-response-retry" })).resolves.toMatchObject({
      completion: { id: canonicalCompletionId },
      evidence: { completionId: canonicalCompletionId, id: canonicalEvidenceId },
      participant: { id: canonicalParticipantId, totalPoints: 120 },
    });
    expect(pool.commitSucceededCount).toBe(2);
    expect(pool.committed.completions.size).toBe(1);
    expect(pool.committed.evidence.size).toBe(1);
    expect(pool.committed.participants.size).toBe(1);
    expect(pool.release).toHaveBeenCalledTimes(2);
    expect(pool.releasedWhileActiveCount).toBe(0);
  });

  it("filters and atomically upserts Task Evidence without application-side reads", async () => {
    const pool = new TranscriptPool(() => ({ rows: [evidenceRow()] }));
    const store = createPostgresCampaignDurableStore({ boundedListLimit: 10, pool });
    const input = evidence();

    await expect(store.listTaskEvidence({
      campaignId: input.campaignId,
      limit: 500,
      taskId: input.taskId,
      walletAddress: input.walletAddress,
    })).resolves.toHaveLength(1);
    await expect(store.upsertTaskEvidence(input)).resolves.toMatchObject({
      createdAt: "2026-07-01T00:00:00.000Z",
      id: "evidence-persisted-id",
    });

    expect(pool.calls[0]?.text).toContain("campaign_id = $1");
    expect(pool.calls[0]?.text).toContain("task_id = $2");
    expect(pool.calls[0]?.text).toContain("wallet_address = $3");
    expect(pool.calls[0]?.text).toContain("LIMIT $4");
    expectParameterized(pool.calls[0]!, [input.campaignId, input.taskId, input.walletAddress, 10]);
    const upsert = pool.calls[1]!;
    expect(upsert.text).toContain("ON CONFLICT (campaign_id, task_id, wallet_address) DO UPDATE");
    expect(upsert.text).toContain("RETURNING");
    expect(upsert.text).toContain("$12::jsonb");
    expectParameterized(upsert, [
      input.id,
      input.campaignId,
      input.taskId,
      input.walletAddress,
      input.completionId,
      input.accountType,
      input.walletSource,
      input.status,
      input.evidenceSource,
      input.evidenceHash,
      input.evidenceRef,
      JSON.stringify(input.diagnosticCodes),
      input.pointsAwarded,
      input.capturedAt,
      false,
      false,
      false,
      false,
      input.createdAt,
      input.updatedAt,
    ]);
  });

  it("gets, lists, and atomically upserts Referral Bindings by Campaign and invitee", async () => {
    const pool = new TranscriptPool(() => ({ rows: [referralRow()] }));
    const store = createPostgresCampaignDurableStore({ pool });
    const input = referral();

    await expect(store.getReferralBinding(input.campaignId, input.inviteeWalletAddress)).resolves.toHaveProperty(
      "id",
      "referral-persisted-id",
    );
    await expect(store.listReferralBindingsByCampaignId(input.campaignId)).resolves.toHaveLength(1);
    await expect(store.upsertReferralBinding(input)).resolves.toMatchObject({
      createdAt: "2026-07-01T00:00:00.000Z",
      id: "referral-persisted-id",
    });

    const upsert = pool.calls[2]!;
    expect(upsert.text).toContain("ON CONFLICT (campaign_id, invitee_wallet_address) DO UPDATE");
    expect(upsert.text).toContain("RETURNING");
    expect(upsert.text).toContain("$13::jsonb");
    expectParameterized(upsert, [
      input.id,
      input.campaignId,
      input.inviteeWalletAddress,
      input.inviteeAccountType,
      input.inviteeWalletSource,
      input.referrerWalletAddress,
      input.referrerAccountType,
      input.referrerWalletSource,
      input.qualifiedActionCompleted,
      input.qualifiedActionCompletedAt,
      input.qualifiedActionEvidenceHash,
      input.status,
      JSON.stringify(input.riskFlags),
      input.createdAt,
      input.updatedAt,
    ]);
  });

  it("keeps repeated and cross-Campaign upserts atomic while preserving stored identities", async () => {
    const persistedCreatedAt = timestamp("2026-07-01T00:00:00.000Z");
    const pool = new TranscriptPool((call) => {
      const campaignId = call.values[1] as string;

      if (call.text.includes("campaign_os.campaign_participants")) {
        return {
          rows: [participantRow({
            campaign_id: campaignId,
            created_at: persistedCreatedAt,
            id: `participant-persisted-${campaignId}`,
            risk_flags: JSON.parse(call.values[11] as string),
            total_points: call.values[9],
            updated_at: call.values[13],
          })],
        };
      }

      if (call.text.includes("campaign_os.campaign_task_completions")) {
        return {
          rows: [completionRow({
            campaign_id: campaignId,
            created_at: persistedCreatedAt,
            id: `completion-persisted-${campaignId}`,
            points_awarded: call.values[10],
            updated_at: call.values[13],
          })],
        };
      }

      if (call.text.includes("campaign_os.campaign_task_evidence")) {
        return {
          rows: [evidenceRow({
            campaign_id: campaignId,
            created_at: persistedCreatedAt,
            diagnostic_codes: JSON.parse(call.values[11] as string),
            id: `evidence-persisted-${campaignId}`,
            points_awarded: call.values[12],
            updated_at: call.values[19],
          })],
        };
      }

      return {
        rows: [referralRow({
          campaign_id: campaignId,
          created_at: persistedCreatedAt,
          id: `referral-persisted-${campaignId}`,
          risk_flags: JSON.parse(call.values[12] as string),
          updated_at: call.values[14],
        })],
      };
    });
    const store = createPostgresCampaignDurableStore({ pool });
    const firstCreatedAt = "2026-07-07T00:00:04.000Z";
    const repeatedCreatedAt = "2026-07-08T00:00:00.000Z";

    const firstParticipant = await store.upsertParticipant(participant({
      campaignId: "campaign-A",
      createdAt: firstCreatedAt,
      id: "participant-request-A1",
      totalPoints: 120,
    }));
    const repeatedParticipant = await store.upsertParticipant(participant({
      campaignId: "campaign-A",
      createdAt: repeatedCreatedAt,
      id: "participant-request-A2",
      riskFlags: ["repeat"],
      totalPoints: 240,
    }));
    const otherParticipant = await store.upsertParticipant(participant({
      campaignId: "campaign-B",
      id: "participant-request-B1",
    }));

    const firstCompletion = await store.upsertTaskCompletion(completion({
      campaignId: "campaign-A",
      createdAt: firstCreatedAt,
      id: "completion-request-A1",
      pointsAwarded: 120,
    }));
    const repeatedCompletion = await store.upsertTaskCompletion(completion({
      campaignId: "campaign-A",
      createdAt: repeatedCreatedAt,
      id: "completion-request-A2",
      pointsAwarded: 240,
    }));
    const otherCompletion = await store.upsertTaskCompletion(completion({
      campaignId: "campaign-B",
      id: "completion-request-B1",
    }));

    const firstEvidence = await store.upsertTaskEvidence(evidence({
      campaignId: "campaign-A",
      createdAt: firstCreatedAt,
      id: "evidence-request-A1",
      pointsAwarded: 120,
    }));
    const repeatedEvidence = await store.upsertTaskEvidence(evidence({
      campaignId: "campaign-A",
      createdAt: repeatedCreatedAt,
      diagnosticCodes: ["repeat"],
      id: "evidence-request-A2",
      pointsAwarded: 240,
    }));
    const otherEvidence = await store.upsertTaskEvidence(evidence({
      campaignId: "campaign-B",
      id: "evidence-request-B1",
    }));

    const firstReferral = await store.upsertReferralBinding(referral({
      campaignId: "campaign-A",
      createdAt: firstCreatedAt,
      id: "referral-request-A1",
      riskFlags: ["first"],
    }));
    const repeatedReferral = await store.upsertReferralBinding(referral({
      campaignId: "campaign-A",
      createdAt: repeatedCreatedAt,
      id: "referral-request-A2",
      riskFlags: ["repeat"],
    }));
    const otherReferral = await store.upsertReferralBinding(referral({
      campaignId: "campaign-B",
      id: "referral-request-B1",
    }));

    for (const [first, repeated, other] of [
      [firstParticipant, repeatedParticipant, otherParticipant],
      [firstCompletion, repeatedCompletion, otherCompletion],
      [firstEvidence, repeatedEvidence, otherEvidence],
      [firstReferral, repeatedReferral, otherReferral],
    ]) {
      expect(repeated.id).toBe(first.id);
      expect(repeated.createdAt).toBe(first.createdAt);
      expect(other.id).not.toBe(first.id);
      expect(other.campaignId).toBe("campaign-B");
    }
    expect(repeatedParticipant.totalPoints).toBe(240);
    expect(repeatedCompletion.pointsAwarded).toBe(240);
    expect(repeatedEvidence.pointsAwarded).toBe(240);
    expect(repeatedReferral.riskFlags).toEqual(["repeat"]);
    expect(pool.calls).toHaveLength(12);
    for (const call of pool.calls) {
      expect(call.text).toMatch(/^INSERT/);
      expect(call.text).toContain("ON CONFLICT (campaign_id");
    }
  });

  it("maps PostgreSQL NULL values to omitted optional domain fields", async () => {
    const pool = new TranscriptPool((call) => {
      if (call.text.includes("campaign_os.campaign_participants")) {
        return { rows: [participantRow({ rank: null, wallet_verified_at: null })] };
      }

      if (call.text.includes("campaign_os.campaign_task_completions")) {
        return {
          rows: [completionRow({
            completed_at: null,
            evidence_hash: null,
            evidence_id: null,
            status: "pending",
          })],
        };
      }

      if (call.text.includes("campaign_os.campaign_task_evidence")) {
        return { rows: [evidenceRow({ completion_id: null, evidence_ref: null })] };
      }

      if (call.text.includes("campaign_os.campaign_referral_bindings")) {
        return {
          rows: [referralRow({
            qualified_action_completed: false,
            qualified_action_completed_at: null,
            qualified_action_evidence_hash: null,
            status: "pending",
          })],
        };
      }

      return {
        rows: [campaignRow({
          metadata_hash: null,
          metadata_uri: null,
          reward_disclaimer_hash: null,
        })],
      };
    });
    const store = createPostgresCampaignDurableStore({ pool });

    const campaignResult = await store.getById("campaign-postgres-0001");
    expect(campaignResult).not.toHaveProperty("metadataHash");
    expect(campaignResult).not.toHaveProperty("metadataUri");
    expect(campaignResult).not.toHaveProperty("rewardDisclaimerHash");

    const participantResult = await store.getParticipant(
      "campaign-postgres-0001",
      "2F4ParticipantWallet",
    );
    expect(participantResult).not.toHaveProperty("rank");
    expect(participantResult).not.toHaveProperty("walletVerifiedAt");

    const [completionResult] = await store.listTaskCompletionsByCampaignId("campaign-postgres-0001");
    expect(completionResult).not.toHaveProperty("completedAt");
    expect(completionResult).not.toHaveProperty("evidenceHash");
    expect(completionResult).not.toHaveProperty("evidenceId");

    const [evidenceResult] = await store.listTaskEvidence({ campaignId: "campaign-postgres-0001" });
    expect(evidenceResult).not.toHaveProperty("completionId");
    expect(evidenceResult).not.toHaveProperty("evidenceRef");

    const referralResult = await store.getReferralBinding(
      "campaign-postgres-0001",
      "2F4InviteeWallet",
    );
    expect(referralResult).not.toHaveProperty("qualifiedActionCompletedAt");
    expect(referralResult).not.toHaveProperty("qualifiedActionEvidenceHash");
  });

  it("pushes Participant, Completion, and Referral filters into bounded SQL", async () => {
    const pool = new TranscriptPool((call) => {
      if (call.text.includes("campaign_os.campaign_participants")) {
        return { rows: [participantRow()] };
      }

      if (call.text.includes("campaign_os.campaign_task_completions")) {
        return { rows: [completionRow()] };
      }

      return { rows: [referralRow()] };
    });
    const store = createPostgresCampaignDurableStore({ boundedListLimit: 20, pool });

    await store.listParticipantsByCampaignId("campaign-postgres-0001", {
      limit: 5,
      walletAddress: "2F4ParticipantWallet",
    });
    await store.listTaskCompletionsByCampaignId("campaign-postgres-0001", {
      limit: 6,
      taskId: "task-postgres-0001",
      walletAddress: "2F4ParticipantWallet",
    });
    await store.listReferralBindingsByCampaignId("campaign-postgres-0001", {
      inviteeWalletAddress: "2F4InviteeWallet",
      limit: 7,
      referrerWalletAddress: "ELF_referrer_wallet",
    });

    expect(pool.calls[0]?.text).toContain("wallet_address = $2");
    expectParameterized(pool.calls[0]!, ["campaign-postgres-0001", "2F4ParticipantWallet", 5]);
    expect(pool.calls[1]?.text).toContain("task_id = $2");
    expect(pool.calls[1]?.text).toContain("wallet_address = $3");
    expectParameterized(pool.calls[1]!, [
      "campaign-postgres-0001",
      "task-postgres-0001",
      "2F4ParticipantWallet",
      6,
    ]);
    expect(pool.calls[2]?.text).toContain("invitee_wallet_address = $2");
    expect(pool.calls[2]?.text).toContain("referrer_wallet_address = $3");
    expectParameterized(pool.calls[2]!, [
      "campaign-postgres-0001",
      "2F4InviteeWallet",
      "ELF_referrer_wallet",
      7,
    ]);
  });

  it.each([
    [undefined, 30],
    [0, 1],
    [-10, 1],
    [1.9, 1],
    [Number.POSITIVE_INFINITY, 30],
    [500, 30],
  ])("clamps list limit %s to %s before query execution", async (requested, expected) => {
    const pool = new TranscriptPool();
    const store = createPostgresCampaignDurableStore({ boundedListLimit: 30, pool });

    await store.list({ limit: requested });

    expect(pool.calls[0]?.values).toEqual([expected]);
  });

  it("reports actual six-entity counts and migration state in its safe manifest", async () => {
    const pool = new TranscriptPool(() => ({
      rows: [{
        applied_migration_ids: ["0001_campaign_runtime"],
        campaign_count: "2",
        completion_count: "5",
        participant_count: "4",
        referral_binding_count: "7",
        task_count: "3",
        task_evidence_count: "6",
      }],
    }));
    const store = createPostgresCampaignDurableStore({ boundedListLimit: 42, pool });

    await expect(store.manifest()).resolves.toEqual({
      adapterId: "campaign-db-postgresql-adapter",
      appliedMigrationIds: ["0001_campaign_runtime"],
      boundedListLimit: 42,
      completionRecordCount: 5,
      diagnosticCodes: [],
      diagnostics: [],
      durable: true,
      fallbackUsed: false,
      migrationStatus: "ready",
      mode: "postgres",
      participantRecordCount: 4,
      recordCount: 2,
      referralBindingRecordCount: 7,
      schemaId: "campaign_os",
      schemaVersion: "0001_campaign_runtime",
      status: "ready",
      storeId: "campaign-db",
      taskEvidenceRecordCount: 6,
      taskRecordCount: 3,
    });
    expect(pool.calls[0]?.text).toContain("campaign_os.schema_migrations");
    expect(pool.calls[0]?.text).toContain("campaign_os.campaign_referral_bindings");
    expect(pool.calls[0]?.values).toEqual([]);
  });

  it("reports a migrated empty database as ready with zero actual counts", async () => {
    const pool = new TranscriptPool(() => ({
      rows: [{
        applied_migration_ids: ["0001_campaign_runtime"],
        campaign_count: "0",
        completion_count: "0",
        participant_count: "0",
        referral_binding_count: "0",
        task_count: "0",
        task_evidence_count: "0",
      }],
    }));
    const store = createPostgresCampaignDurableStore({ pool });

    await expect(store.manifest()).resolves.toMatchObject({
      completionRecordCount: 0,
      migrationStatus: "ready",
      participantRecordCount: 0,
      recordCount: 0,
      referralBindingRecordCount: 0,
      status: "ready",
      taskEvidenceRecordCount: 0,
      taskRecordCount: 0,
    });
  });

  it("blocks the manifest when the expected schema migration is absent", async () => {
    const pool = new TranscriptPool(() => ({
      rows: [{
        applied_migration_ids: [],
        campaign_count: 0,
        completion_count: 0,
        participant_count: 0,
        referral_binding_count: 0,
        task_count: 0,
        task_evidence_count: 0,
      }],
    }));
    const store = createPostgresCampaignDurableStore({ pool });

    await expect(store.manifest()).resolves.toMatchObject({
      diagnosticCodes: ["POSTGRES_CAMPAIGN_STORE_SCHEMA_NOT_READY"],
      migrationStatus: "blocked",
      status: "blocked",
    });
  });

  it("fails the manifest closed on connection failure instead of fabricating zero counts", async () => {
    const sensitiveDetail = "SENSITIVE_CONNECTION_DETAIL_MANIFEST_SENTINEL";
    const pool = new TranscriptPool(() => {
      throw new Error(sensitiveDetail);
    });
    const store = createPostgresCampaignDurableStore({ pool });

    const failure = store.manifest();

    await expect(failure).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_QUERY_FAILED",
      operation: "manifest",
    });
    await expect(failure).rejects.not.toHaveProperty(
      "message",
      expect.stringContaining(sensitiveDetail),
    );
  });

  it.each([
    ["9007199254740992"],
    ["-1"],
    [1.5],
  ])("rejects malformed manifest count %s", async (campaignCount) => {
    const pool = new TranscriptPool(() => ({
      rows: [{
        applied_migration_ids: ["0001_campaign_runtime"],
        campaign_count: campaignCount,
        completion_count: 0,
        participant_count: 0,
        referral_binding_count: 0,
        task_count: 0,
        task_evidence_count: 0,
      }],
    }));
    const store = createPostgresCampaignDurableStore({ pool });

    await expect(store.manifest()).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_ROW_INVALID",
      field: "campaign_count",
      operation: "manifest",
    });
  });

  it("closes an owned Pool once and rejects every operation after close without querying", async () => {
    const pool = new TranscriptPool();
    const store = createPostgresCampaignDurableStore({ pool });

    await store.close();
    await store.close();

    expect(pool.end).toHaveBeenCalledOnce();
    await expect(store.getById("campaign-after-close")).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_CLOSED",
      operation: "getById",
    });
    await expect(store.manifest()).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_CLOSED",
      operation: "manifest",
    });
    expect(pool.calls).toEqual([]);
  });

  it("can use a caller-owned Pool without closing it", async () => {
    const pool = new TranscriptPool();
    const store = createPostgresCampaignDurableStore({ ownsPool: false, pool });

    await store.close();

    expect(pool.end).not.toHaveBeenCalled();
  });

  it("returns the same close Promise for concurrent idempotent shutdown", async () => {
    const pool = new TranscriptPool();
    const store = createPostgresCampaignDurableStore({ pool });

    const first = store.close();
    const second = store.close();

    expect(first).toBe(second);
    await first;
    expect(pool.end).toHaveBeenCalledOnce();
  });

  it("blocks reset by default before issuing SQL and permits only explicit test reset", async () => {
    const blockedPool = new TranscriptPool();
    const blockedStore = createPostgresCampaignDurableStore({ pool: blockedPool });

    await expect(blockedStore.reset()).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_RESET_FORBIDDEN",
      operation: "reset",
    });
    expect(blockedPool.calls).toEqual([]);

    const testPool = new TranscriptPool();
    const testStore = createPostgresCampaignDurableStore({ allowTestReset: true, pool: testPool });

    await testStore.reset();

    expect(testPool.calls).toHaveLength(1);
    expect(testPool.calls[0]?.text).toMatch(/^TRUNCATE TABLE/);
    expect(testPool.calls[0]?.text).toContain("campaign_os.campaign_task_evidence");
    expect(testPool.calls[0]?.text).toContain("campaign_os.campaigns");
    expect(testPool.calls[0]?.values).toEqual([]);
  });

  it.each([
    ["enum", { status: "secret-invalid-status" }],
    ["JSON array type", { supported_locales: "[\"en-US\"]" }],
    ["duplicate JSON array", { supported_locales: ["en-US", "en-US"] }],
    ["timestamp", { created_at: "not-a-date" }],
    ["JSON object", { publish_readiness: { blockers: [], ready: "yes", warnings: [] } }],
  ])("rejects malformed Campaign row %s fields", async (_label, override) => {
    const pool = new TranscriptPool(() => ({ rows: [campaignRow(override)] }));
    const store = createPostgresCampaignDurableStore({ pool });

    await expect(store.getById("campaign-postgres-0001")).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_ROW_INVALID",
      operation: "getById",
    });
  });

  it("rejects malformed integers and oversized or non-string arrays", async () => {
    const malformedTaskPool = new TranscriptPool(() => ({ rows: [taskRow({ points: "120" })] }));
    await expect(createPostgresCampaignDurableStore({ pool: malformedTaskPool })
      .listTaskDraftsByCampaignId("campaign-postgres-0001")).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_ROW_INVALID",
    });

    const malformedParticipantPool = new TranscriptPool(() => ({
      rows: [participantRow({ risk_flags: Array.from({ length: 101 }, (_, index) => `risk-${index}`) })],
    }));
    await expect(createPostgresCampaignDurableStore({ pool: malformedParticipantPool })
      .listParticipantsByCampaignId("campaign-postgres-0001")).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_ROW_INVALID",
    });

    const nonStringEvidencePool = new TranscriptPool(() => ({
      rows: [evidenceRow({ diagnostic_codes: ["safe", 7] })],
    }));
    await expect(createPostgresCampaignDurableStore({ pool: nonStringEvidencePool })
      .listTaskEvidence({ campaignId: "campaign-postgres-0001" })).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_ROW_INVALID",
    });

    const nonObjectJsonPool = new TranscriptPool(() => ({
      rows: [taskRow({ evidence_rule: new Date() })],
    }));
    await expect(createPostgresCampaignDurableStore({ pool: nonObjectJsonPool })
      .listTaskDraftsByCampaignId("campaign-postgres-0001")).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_ROW_INVALID",
      field: "evidence_rule",
    });
  });

  it("rejects rows that violate Completion and Referral cross-field constraints", async () => {
    const malformedCompletionPool = new TranscriptPool(() => ({
      rows: [completionRow({ completed_at: null, status: "completed" })],
    }));
    await expect(createPostgresCampaignDurableStore({ pool: malformedCompletionPool })
      .listTaskCompletionsByCampaignId("campaign-postgres-0001")).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_ROW_INVALID",
      field: "completed_at",
    });

    for (const malformed of [
      referralRow({ referrer_wallet_address: "2F4InviteeWallet" }),
      referralRow({ qualified_action_completed: true, qualified_action_completed_at: null }),
      referralRow({
        qualified_action_completed: false,
        qualified_action_completed_at: null,
        status: "qualified",
      }),
    ]) {
      const pool = new TranscriptPool(() => ({ rows: [malformed] }));
      await expect(createPostgresCampaignDurableStore({ pool }).getReferralBinding(
        "campaign-postgres-0001",
        "2F4InviteeWallet",
      )).rejects.toMatchObject({
        code: "POSTGRES_CAMPAIGN_STORE_ROW_INVALID",
      });
    }
  });

  it("propagates a safe caller Trace ID and rejects an invalid Trace ID before querying", async () => {
    const sensitiveDetail = "SENSITIVE_CONNECTION_DETAIL_TRACE_SENTINEL";
    const failingPool = new TranscriptPool(() => {
      throw new Error(sensitiveDetail);
    });
    const store = createPostgresCampaignDurableStore({ pool: failingPool });

    await expect(store.getById("campaign-postgres-0001", {
      traceId: "trace-api-0001",
    })).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_QUERY_FAILED",
      traceId: "trace-api-0001",
    });

    const idlePool = new TranscriptPool();
    const idleStore = createPostgresCampaignDurableStore({ pool: idlePool });
    await expect(idleStore.getById("campaign-postgres-0001", {
      traceId: "invalid trace with spaces",
    })).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_ARGUMENT_INVALID",
      field: "traceId",
    });
    expect(idlePool.calls).toEqual([]);
  });

  it("maps driver and constraint failures to typed safe diagnostics", async () => {
    const sensitiveDetail = "SENSITIVE_CONNECTION_DETAIL_QUERY_SENTINEL";
    const conflictPool = new TranscriptPool(() => {
      throw Object.assign(new Error(sensitiveDetail), { code: "23505" });
    });
    const conflict = createPostgresCampaignDurableStore({ pool: conflictPool }).create(campaign());

    await expect(conflict).rejects.toBeInstanceOf(PostgresCampaignStoreError);
    await expect(conflict).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_CONFLICT",
      operation: "create",
    });
    await expect(conflict).rejects.not.toHaveProperty("message", expect.stringContaining(sensitiveDetail));

    const queryPool = new TranscriptPool(() => {
      throw new Error(sensitiveDetail);
    });
    const queryFailure = createPostgresCampaignDurableStore({ pool: queryPool })
      .getById("campaign-postgres-0001");

    await expect(queryFailure).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_QUERY_FAILED",
      operation: "getById",
    });
    await expect(queryFailure).rejects.not.toHaveProperty("message", expect.stringContaining(sensitiveDetail));

    const serializedFailure = await createPostgresCampaignDurableStore({
      pool: new TranscriptPool(() => {
        throw new Error(sensitiveDetail);
      }),
    }).getById("campaign-postgres-0001").catch((error: unknown) => error);
    expect(JSON.stringify(serializedFailure)).not.toContain(sensitiveDetail);
    expect(Object.keys(serializedFailure as object)).not.toContain("cause");
    expect(serializedFailure).not.toHaveProperty("cause");
  });

  it.each([
    ["23503", "POSTGRES_CAMPAIGN_STORE_CONSTRAINT_FAILED"],
    ["23502", "POSTGRES_CAMPAIGN_STORE_CONSTRAINT_FAILED"],
    ["23514", "POSTGRES_CAMPAIGN_STORE_CONSTRAINT_FAILED"],
    ["22P02", "POSTGRES_CAMPAIGN_STORE_CONSTRAINT_FAILED"],
    ["42P01", "POSTGRES_CAMPAIGN_STORE_SCHEMA_NOT_READY"],
    ["3F000", "POSTGRES_CAMPAIGN_STORE_SCHEMA_NOT_READY"],
    ["08006", "POSTGRES_CAMPAIGN_STORE_QUERY_FAILED"],
    ["57P01", "POSTGRES_CAMPAIGN_STORE_QUERY_FAILED"],
  ])("maps SQLSTATE %s to %s", async (driverCode, expectedCode) => {
    const pool = new TranscriptPool(() => {
      throw Object.assign(new Error("unsafe driver detail"), { code: driverCode });
    });
    const store = createPostgresCampaignDurableStore({ pool });

    await expect(store.getById("campaign-postgres-0001")).rejects.toMatchObject({
      code: expectedCode,
      operation: "getById",
    });
  });

  it("validates factory dependencies and schema identifiers defensively", () => {
    expect(() => createPostgresCampaignDurableStore({
      pool: null as unknown as PostgresCampaignStorePool,
    })).toThrow(expect.objectContaining({
      code: "POSTGRES_CAMPAIGN_STORE_ARGUMENT_INVALID",
      field: "pool",
    }));
    expect(() => createPostgresCampaignDurableStore({
      pool: new TranscriptPool(),
      schemaVersion: "unsafe schema version",
    })).toThrow(expect.objectContaining({
      code: "POSTGRES_CAMPAIGN_STORE_ARGUMENT_INVALID",
      field: "schemaVersion",
    }));
  });

  it("maps JSONB encoding failures before querying and preserves the caller Trace ID", async () => {
    const pool = new TranscriptPool();
    const input = task();
    const circularRule: Record<string, string | number | boolean> = {};
    (circularRule as Record<string, unknown>).self = circularRule;
    input.evidenceRule = circularRule;

    await expect(createPostgresCampaignDurableStore({ pool }).createTaskDraft(input, {
      traceId: "trace-jsonb-encode",
    })).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_ARGUMENT_INVALID",
      field: "evidenceRule",
      operation: "createTaskDraft",
      traceId: "trace-jsonb-encode",
    });
    expect(pool.calls).toEqual([]);
  });

  it("maps Pool cleanup failures without reopening or leaking connection details", async () => {
    const sensitiveDetail = "SENSITIVE_CONNECTION_DETAIL_CLOSE_SENTINEL";
    const pool = new TranscriptPool(undefined, new Error(sensitiveDetail));
    const store = createPostgresCampaignDurableStore({ pool });

    const failure = store.close();

    await expect(failure).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_CLEANUP_FAILED",
      operation: "close",
    });
    await expect(failure).rejects.not.toHaveProperty("message", expect.stringContaining(sensitiveDetail));
    await expect(failure).rejects.not.toHaveProperty("cause");
    await expect(store.close()).rejects.toMatchObject({
      code: "POSTGRES_CAMPAIGN_STORE_CLEANUP_FAILED",
    });
    expect(pool.end).toHaveBeenCalledOnce();
  });
});
