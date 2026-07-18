import { createHash } from "node:crypto";
import type {
  ConsumeChallengeAndCreateSessionInput,
  DurableWalletSessionRecord,
  RotateWalletSessionInput,
  WalletAuthenticationChallengeSnapshot,
  WalletAuthenticationClock,
  WalletAuthenticationStore,
} from "./walletAuthentication";
import {
  WalletAuthenticationStoreError,
  copyDurableWalletSession,
  copyWalletAuthenticationChallenge,
  isWalletAuthenticationDigest,
  normalizeWalletAuthenticationStorePolicy,
  projectWalletAuthenticationSession,
  walletAuthenticationSubjectKey,
  type DurableWalletAuthenticationStore,
  type IssueWalletAuthenticationChallengeInput,
  type IssueWalletAuthenticationChallengeResult,
  type RecordWalletAuthenticationChallengeFailureInput,
  type RecordWalletAuthenticationChallengeFailureResult,
  type WalletAuthenticationStoreErrorCode,
  type WalletAuthenticationStoreOperation,
  type WalletAuthenticationStorePolicy,
} from "./walletAuthenticationStore";

const DEFAULT_TRACE_ID = "wallet-auth-postgres";
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;
const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

const CHALLENGE_COLUMNS = `
  id,
  version,
  wallet_address,
  subject_key,
  adapter_id,
  chain_id,
  network,
  ca_hash,
  nonce_digest,
  message_digest,
  client_fingerprint_digest,
  status,
  state_version,
  verification_attempts,
  rate_window_started_at,
  rate_attempt_count,
  issued_at,
  expires_at,
  consumed_at,
  terminal_at,
  terminal_code,
  trace_id,
  created_at,
  updated_at
`;

const SESSION_COLUMNS = `
  id,
  credential_digest,
  csrf_token_digest,
  challenge_id,
  subject_key,
  wallet_address,
  account_type,
  wallet_source,
  chain_id,
  network,
  adapter_id,
  proof_method,
  signer_address,
  ca_hash,
  proof_digest,
  verified_at,
  credential_boundary,
  role_ids,
  capabilities,
  status,
  version,
  membership_revision,
  issued_at,
  last_seen_at,
  idle_expires_at,
  absolute_expires_at,
  revoked_at,
  revocation_code,
  last_trace_id,
  created_at,
  updated_at
`;

export interface PostgresWalletAuthenticationQueryResult {
  readonly rows: Array<Record<string, unknown>>;
}

export interface PostgresWalletAuthenticationClient {
  query(text: string, values?: unknown[]): Promise<PostgresWalletAuthenticationQueryResult>;
  release(destroy?: boolean): void;
}

export interface PostgresWalletAuthenticationPool {
  connect(): Promise<PostgresWalletAuthenticationClient>;
  end(): Promise<void>;
  query(text: string, values?: unknown[]): Promise<PostgresWalletAuthenticationQueryResult>;
}

export interface CreatePostgresWalletAuthenticationStoreOptions {
  readonly clock: WalletAuthenticationClock;
  readonly ownsPool?: boolean;
  readonly policy?: Partial<WalletAuthenticationStorePolicy>;
  readonly pool: PostgresWalletAuthenticationPool;
  readonly shutdownTimeoutMs?: number;
}

export interface CreateRequiredPostgresWalletAuthenticationStoreOptions
  extends Omit<CreatePostgresWalletAuthenticationStoreOptions, "pool"> {
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly poolFactory: (databaseUrl: string) => PostgresWalletAuthenticationPool;
}

interface DriverErrorLike {
  readonly code?: unknown;
}

const safeTraceId = (value: unknown): string =>
  typeof value === "string"
    && value.length > 0
    && value.length <= 128
    && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
    ? value
    : DEFAULT_TRACE_ID;

const safeId = (value: unknown, maximum = 160): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= maximum
  && SAFE_ID_PATTERN.test(value)
  && !/[\u0000-\u001f\u007f]/.test(value);

const storeError = (
  code: WalletAuthenticationStoreErrorCode,
  field: string,
  operation: WalletAuthenticationStoreOperation,
  traceId = DEFAULT_TRACE_ID,
  retryable = false,
): WalletAuthenticationStoreError => new WalletAuthenticationStoreError({
  code,
  field,
  operation,
  retryable,
  traceId,
});

const driverCode = (error: unknown): string | undefined => {
  if (error === null || typeof error !== "object") {
    return undefined;
  }
  const code = (error as DriverErrorLike).code;
  return typeof code === "string" ? code : undefined;
};

const mapDriverError = (
  error: unknown,
  operation: WalletAuthenticationStoreOperation,
  traceId: string,
): WalletAuthenticationStoreError => {
  const code = driverCode(error);
  if (code === "23505") {
    return storeError("WALLET_AUTH_STORE_CONFLICT", "database", operation, traceId);
  }
  return storeError(
    "WALLET_AUTH_STORE_UNAVAILABLE",
    "database",
    operation,
    traceId,
    code === "40001" || code === "40P01" || code === "53300" || code === "57P01",
  );
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const readField = (row: Record<string, unknown>, field: string): unknown => {
  if (!Object.prototype.hasOwnProperty.call(row, field)) {
    throw storeError("WALLET_AUTH_STORE_UNAVAILABLE", field, "resolveSession");
  }
  return row[field];
};

const readString = (row: Record<string, unknown>, field: string): string => {
  const value = readField(row, field);
  if (typeof value !== "string") {
    throw storeError("WALLET_AUTH_STORE_UNAVAILABLE", field, "resolveSession");
  }
  return value;
};

const readOptionalString = (
  row: Record<string, unknown>,
  field: string,
): string | undefined => {
  const value = readField(row, field);
  if (value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw storeError("WALLET_AUTH_STORE_UNAVAILABLE", field, "resolveSession");
  }
  return value;
};

const readInteger = (row: Record<string, unknown>, field: string): number => {
  const value = readField(row, field);
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw storeError("WALLET_AUTH_STORE_UNAVAILABLE", field, "resolveSession");
  }
  return value;
};

const readInstant = (row: Record<string, unknown>, field: string): string => {
  const value = readField(row, field);
  const parsed = value instanceof Date
    ? value
    : typeof value === "string"
      ? new Date(value)
      : new Date(Number.NaN);
  if (!Number.isFinite(parsed.getTime())) {
    throw storeError("WALLET_AUTH_STORE_UNAVAILABLE", field, "resolveSession");
  }
  return parsed.toISOString();
};

const readStringArray = (row: Record<string, unknown>, field: string): readonly string[] => {
  const value = readField(row, field);
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw storeError("WALLET_AUTH_STORE_UNAVAILABLE", field, "resolveSession");
  }
  return Object.freeze([...value]);
};

const mapChallengeRow = (row: Record<string, unknown>): WalletAuthenticationChallengeSnapshot =>
  copyWalletAuthenticationChallenge({
    adapterId: readString(row, "adapter_id"),
    ...(readOptionalString(row, "ca_hash") === undefined
      ? {}
      : { caHash: readOptionalString(row, "ca_hash") }),
    chainId: readString(row, "chain_id"),
    expiresAt: readInstant(row, "expires_at"),
    id: readString(row, "id"),
    issuedAt: readInstant(row, "issued_at"),
    messageDigest: readString(row, "message_digest"),
    network: readString(row, "network"),
    nonceDigest: readString(row, "nonce_digest"),
    requestedWalletAddress: readString(row, "wallet_address"),
    status: readString(row, "status"),
    traceId: readString(row, "trace_id"),
    verificationAttempts: readInteger(row, "verification_attempts"),
    version: readString(row, "version"),
  });

const mapSessionRow = (row: Record<string, unknown>): DurableWalletSessionRecord =>
  copyDurableWalletSession({
    absoluteExpiresAt: readInstant(row, "absolute_expires_at"),
    capabilities: readStringArray(row, "capabilities"),
    challengeId: readString(row, "challenge_id"),
    credentialBoundary: readString(row, "credential_boundary"),
    credentialDigest: readString(row, "credential_digest"),
    csrfTokenDigest: readString(row, "csrf_token_digest"),
    id: readString(row, "id"),
    idleExpiresAt: readInstant(row, "idle_expires_at"),
    issuedAt: readInstant(row, "issued_at"),
    lastSeenAt: readInstant(row, "last_seen_at"),
    membershipRevision: readString(row, "membership_revision"),
    roleIds: readStringArray(row, "role_ids"),
    status: readString(row, "status"),
    subject: {
      accountType: readString(row, "account_type"),
      adapterId: readString(row, "adapter_id"),
      ...(readOptionalString(row, "ca_hash") === undefined
        ? {}
        : { caHash: readOptionalString(row, "ca_hash") }),
      chainId: readString(row, "chain_id"),
      network: readString(row, "network"),
      proofDigest: readString(row, "proof_digest"),
      proofMethod: readString(row, "proof_method"),
      signerAddress: readString(row, "signer_address"),
      verifiedAt: readInstant(row, "verified_at"),
      walletAddress: readString(row, "wallet_address"),
      walletSource: readString(row, "wallet_source"),
    },
    version: readInteger(row, "version"),
  });

const challengeSubjectKey = (challenge: WalletAuthenticationChallengeSnapshot): string =>
  createHash("sha256")
    .update([
      "campaign-os-wallet-auth-challenge-subject/v1",
      challenge.requestedWalletAddress,
      challenge.chainId,
      challenge.network,
    ].join("\n"), "utf8")
    .digest("hex");

const challengeRateLockKeys = (
  subjectKey: string,
  fingerprintDigest?: string,
): readonly string[] => Object.freeze([
  `campaign-os-wallet-auth-rate-subject/v1:${subjectKey}`,
  ...(fingerprintDigest
    ? [`campaign-os-wallet-auth-rate-fingerprint/v1:${fingerprintDigest}`]
    : []),
].sort());

const sessionMatchesChallenge = (
  challenge: WalletAuthenticationChallengeSnapshot,
  session: DurableWalletSessionRecord,
): boolean => session.subject.walletAddress === challenge.requestedWalletAddress
  && session.subject.chainId === challenge.chainId
  && session.subject.network === challenge.network
  && session.subject.adapterId === challenge.adapterId
  && session.subject.caHash === challenge.caHash;

const readClock = (
  clock: WalletAuthenticationClock,
  operation: WalletAuthenticationStoreOperation,
  traceId: string,
): Date => {
  try {
    const value = clock.now();
    if (value instanceof Date && Number.isFinite(value.getTime())) {
      return new Date(value);
    }
  } catch {
    // The safe typed error below excludes the clock failure.
  }
  throw storeError("WALLET_AUTH_STORE_UNAVAILABLE", "clock", operation, traceId, true);
};

const normalizeDate = (
  value: unknown,
  operation: WalletAuthenticationStoreOperation,
  traceId: string,
): Date => {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw storeError("WALLET_AUTH_STORE_ARGUMENT_INVALID", "now", operation, traceId);
  }
  return new Date(value);
};

const normalizeShutdownTimeout = (value: number | undefined): number => {
  const resolved = value ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;
  if (!Number.isSafeInteger(resolved) || resolved < 1 || resolved > 10_000) {
    throw storeError("WALLET_AUTH_STORE_CONFIG_INVALID", "shutdownTimeoutMs", "close");
  }
  return resolved;
};

type DeadlineResult<TValue> =
  | Readonly<{ status: "settled"; value: TValue }>
  | Readonly<{ status: "timed_out" }>;

const settleWithin = async <TValue>(
  promise: Promise<TValue>,
  timeoutMs: number,
): Promise<DeadlineResult<TValue>> => {
  if (timeoutMs <= 0) {
    void promise.catch(() => undefined);
    return Object.freeze({ status: "timed_out" });
  }
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise.then((value) => Object.freeze({ status: "settled" as const, value })),
      new Promise<Readonly<{ status: "timed_out" }>>((resolve) => {
        timeout = setTimeout(() => resolve(Object.freeze({ status: "timed_out" })), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

export const createPostgresWalletAuthenticationStore = ({
  clock,
  ownsPool = true,
  policy: policyOverrides,
  pool,
  shutdownTimeoutMs: requestedShutdownTimeoutMs,
}: CreatePostgresWalletAuthenticationStoreOptions): DurableWalletAuthenticationStore => {
  if (
    !pool
    || typeof pool.query !== "function"
    || typeof pool.connect !== "function"
    || typeof pool.end !== "function"
    || !clock
    || typeof clock.now !== "function"
  ) {
    throw storeError("WALLET_AUTH_STORE_CONFIG_INVALID", "options", "close");
  }
  const policy = normalizeWalletAuthenticationStorePolicy(policyOverrides);
  const shutdownTimeoutMs = normalizeShutdownTimeout(requestedShutdownTimeoutMs);
  const activeTransactions = new Set<Promise<unknown>>();
  const activeClients = new Set<PostgresWalletAuthenticationClient>();
  const forceReleasedClients = new WeakSet<object>();
  let closing = false;
  let closed = false;
  let closePromise: Promise<void> | undefined;

  const ensureOpen = (
    operation: WalletAuthenticationStoreOperation,
    traceId = DEFAULT_TRACE_ID,
    accepting = true,
  ): void => {
    if (closed || (accepting && closing)) {
      throw storeError("WALLET_AUTH_STORE_CLOSED", "store", operation, traceId);
    }
  };

  const queryWith = async (
    queryable: Pick<PostgresWalletAuthenticationPool, "query">,
    operation: WalletAuthenticationStoreOperation,
    text: string,
    values: unknown[],
    traceId: string,
  ): Promise<Array<Record<string, unknown>>> => {
    ensureOpen(operation, traceId, false);
    try {
      const result = await queryable.query(text, values);
      if (!result || !Array.isArray(result.rows) || result.rows.some((row) => !isPlainRecord(row))) {
        throw storeError("WALLET_AUTH_STORE_UNAVAILABLE", "rows", operation, traceId);
      }
      return result.rows;
    } catch (error) {
      if (error instanceof WalletAuthenticationStoreError) {
        throw error;
      }
      throw mapDriverError(error, operation, traceId);
    }
  };

  const query = (
    operation: WalletAuthenticationStoreOperation,
    text: string,
    values: unknown[],
    traceId: string,
  ): Promise<Array<Record<string, unknown>>> => {
    ensureOpen(operation, traceId);
    return queryWith(pool, operation, text, values, traceId);
  };

  const withTransaction = <TValue>(
    operation: WalletAuthenticationStoreOperation,
    traceId: string,
    execute: (client: PostgresWalletAuthenticationClient) => Promise<TValue>,
  ): Promise<TValue> => {
    ensureOpen(operation, traceId);
    const task = (async () => {
      let client: PostgresWalletAuthenticationClient | undefined;
      let began = false;
      try {
        try {
          client = await pool.connect();
          activeClients.add(client);
        } catch (error) {
          throw mapDriverError(error, operation, traceId);
        }
        await queryWith(client, operation, "BEGIN", [], traceId);
        began = true;
        const result = await execute(client);
        await queryWith(client, operation, "COMMIT", [], traceId);
        began = false;
        return result;
      } catch (error) {
        if (began && client && !forceReleasedClients.has(client)) {
          try {
            await client.query("ROLLBACK");
          } catch {
            throw storeError("WALLET_AUTH_STORE_UNAVAILABLE", "transaction", operation, traceId, true);
          }
        }
        throw error;
      } finally {
        if (client) {
          activeClients.delete(client);
          if (!forceReleasedClients.has(client)) {
            try {
              client.release();
            } catch {
              throw storeError("WALLET_AUTH_STORE_UNAVAILABLE", "client", operation, traceId, true);
            }
          }
        }
      }
    })();
    activeTransactions.add(task);
    void task.then(
      () => activeTransactions.delete(task),
      () => activeTransactions.delete(task),
    );
    return task;
  };

  const expireChallengeWith = async (
    queryable: Pick<PostgresWalletAuthenticationPool, "query">,
    challengeId: string,
    now: Date,
    traceId: string,
  ): Promise<void> => {
    await queryWith(
      queryable,
      "expireChallenges",
      `
        UPDATE campaign_os.wallet_auth_challenges
        SET
          status = 'expired',
          state_version = state_version + 1,
          terminal_at = $2,
          terminal_code = 'CHALLENGE_EXPIRED',
          trace_id = $3,
          updated_at = $2
        WHERE id = $1 AND status = 'issued' AND expires_at <= $2
      `,
      [challengeId, now.toISOString(), traceId],
      traceId,
    );
  };

  const issueChallengeWithPolicy = async (
    input: IssueWalletAuthenticationChallengeInput,
  ): Promise<IssueWalletAuthenticationChallengeResult> => {
    const traceId = safeTraceId(input?.traceId);
    ensureOpen("issueChallenge", traceId);
    if (!isPlainRecord(input)) {
      throw storeError("WALLET_AUTH_STORE_ARGUMENT_INVALID", "input", "issueChallenge", traceId);
    }
    const challenge = copyWalletAuthenticationChallenge(input.challenge, "issueChallenge", traceId);
    if (challenge.status !== "issued" || challenge.verificationAttempts !== 0) {
      throw storeError(
        "WALLET_AUTH_STORE_ARGUMENT_INVALID",
        "challenge.status",
        "issueChallenge",
        traceId,
      );
    }
    if (
      input.clientFingerprintDigest !== undefined
      && !isWalletAuthenticationDigest(input.clientFingerprintDigest)
    ) {
      throw storeError(
        "WALLET_AUTH_STORE_ARGUMENT_INVALID",
        "clientFingerprintDigest",
        "issueChallenge",
        traceId,
      );
    }
    const now = readClock(clock, "issueChallenge", traceId);
    if (Date.parse(challenge.issuedAt) > now.getTime() || Date.parse(challenge.expiresAt) <= now.getTime()) {
      throw storeError(
        "WALLET_AUTH_STORE_ARGUMENT_INVALID",
        "challenge.expiresAt",
        "issueChallenge",
        traceId,
      );
    }
    const subjectKey = challengeSubjectKey(challenge);
    const rateLockKeys = challengeRateLockKeys(subjectKey, input.clientFingerprintDigest);

    try {
      return await withTransaction("issueChallenge", traceId, async (client) => {
        for (const rateLockKey of rateLockKeys) {
          await queryWith(
            client,
            "issueChallenge",
            "SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))",
            [rateLockKey],
            traceId,
          );
        }
        await queryWith(
          client,
          "issueChallenge",
          `
            UPDATE campaign_os.wallet_auth_challenges
            SET
              status = 'expired',
              state_version = state_version + 1,
              terminal_at = $3,
              terminal_code = 'CHALLENGE_EXPIRED',
              trace_id = $4,
              updated_at = $3
            WHERE status = 'issued'
              AND expires_at <= $3
              AND (
                subject_key = $1
                OR ($2::text IS NOT NULL AND client_fingerprint_digest = $2)
              )
          `,
          [subjectKey, input.clientFingerprintDigest ?? null, now.toISOString(), traceId],
          traceId,
        );
        const countRows = await queryWith(
          client,
          "issueChallenge",
          `
            SELECT
              count(*) FILTER (WHERE subject_key = $1)::integer AS subject_count,
              count(*) FILTER (
                WHERE $2::text IS NOT NULL AND client_fingerprint_digest = $2
              )::integer AS fingerprint_count
            FROM campaign_os.wallet_auth_challenges
            WHERE status = 'issued'
              AND expires_at > $3
              AND (
                subject_key = $1
                OR ($2::text IS NOT NULL AND client_fingerprint_digest = $2)
              )
          `,
          [subjectKey, input.clientFingerprintDigest ?? null, now.toISOString()],
          traceId,
        );
        const activeCount = countRows[0]
          ? Math.max(
            readInteger(countRows[0], "subject_count"),
            readInteger(countRows[0], "fingerprint_count"),
          )
          : 0;
        if (activeCount >= policy.maxActiveChallengesPerSubject) {
          return Object.freeze({
            retryAfterMs: Math.max(1, Date.parse(challenge.expiresAt) - now.getTime()),
            status: "active_limit" as const,
          });
        }
        await queryWith(
          client,
          "issueChallenge",
          `
            INSERT INTO campaign_os.wallet_auth_challenges (
              id, version, wallet_address, subject_key, adapter_id, chain_id,
              network, ca_hash, nonce_digest, message_digest,
              client_fingerprint_digest, status, state_version,
              verification_attempts, rate_window_started_at, rate_attempt_count,
              issued_at, expires_at, consumed_at, terminal_at, terminal_code,
              trace_id, created_at, updated_at
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              $11, 'issued', 1, 0, $12, 0, $13, $14, NULL, NULL,
              NULL, $15, $13, $13
            )
          `,
          [
            challenge.id,
            challenge.version,
            challenge.requestedWalletAddress,
            subjectKey,
            challenge.adapterId,
            challenge.chainId,
            challenge.network,
            challenge.caHash ?? null,
            challenge.nonceDigest,
            challenge.messageDigest,
            input.clientFingerprintDigest ?? null,
            now.toISOString(),
            challenge.issuedAt,
            challenge.expiresAt,
            traceId,
          ],
          traceId,
        );
        return Object.freeze({ challenge, status: "issued" as const });
      });
    } catch (error) {
      if (
        error instanceof WalletAuthenticationStoreError
        && error.code === "WALLET_AUTH_STORE_CONFLICT"
      ) {
        return Object.freeze({ status: "conflict" });
      }
      throw error;
    }
  };

  const issueChallenge: WalletAuthenticationStore["issueChallenge"] = async (challenge) => {
    const result = await issueChallengeWithPolicy({ challenge, traceId: safeTraceId(challenge?.traceId) });
    if (result.status === "issued") {
      return result.challenge;
    }
    if (result.status === "conflict") {
      throw storeError("WALLET_AUTH_STORE_CONFLICT", "challenge", "issueChallenge", challenge?.traceId);
    }
    throw storeError(
      "WALLET_AUTH_STORE_RATE_LIMITED",
      "challenge",
      "issueChallenge",
      challenge?.traceId,
      true,
    );
  };

  const loadChallenge: WalletAuthenticationStore["loadChallenge"] = async (id) => {
    ensureOpen("loadChallenge");
    if (!safeId(id)) {
      throw storeError("WALLET_AUTH_STORE_ARGUMENT_INVALID", "challengeId", "loadChallenge");
    }
    const now = readClock(clock, "loadChallenge", DEFAULT_TRACE_ID);
    await expireChallengeWith(pool, id, now, DEFAULT_TRACE_ID);
    const rows = await query(
      "loadChallenge",
      `SELECT ${CHALLENGE_COLUMNS} FROM campaign_os.wallet_auth_challenges WHERE id = $1 LIMIT 1`,
      [id],
      DEFAULT_TRACE_ID,
    );
    return rows[0] ? mapChallengeRow(rows[0]) : undefined;
  };

  const recordChallengeFailureWithPolicy = async (
    input: RecordWalletAuthenticationChallengeFailureInput,
  ): Promise<RecordWalletAuthenticationChallengeFailureResult> => {
    const traceId = safeTraceId(input?.traceId);
    ensureOpen("recordChallengeFailure", traceId);
    if (
      !isPlainRecord(input)
      || !safeId(input.challengeId)
      || typeof input.terminalCode !== "string"
      || !SAFE_CODE_PATTERN.test(input.terminalCode)
    ) {
      throw storeError(
        "WALLET_AUTH_STORE_ARGUMENT_INVALID",
        "input",
        "recordChallengeFailure",
        traceId,
      );
    }
    const now = readClock(clock, "recordChallengeFailure", traceId);
    return withTransaction("recordChallengeFailure", traceId, async (client) => {
      const rows = await queryWith(
        client,
        "recordChallengeFailure",
        `SELECT ${CHALLENGE_COLUMNS} FROM campaign_os.wallet_auth_challenges WHERE id = $1 FOR UPDATE`,
        [input.challengeId],
        traceId,
      );
      const row = rows[0];
      if (!row) {
        return Object.freeze({ status: "not_found" as const });
      }
      const snapshot = mapChallengeRow(row);
      if (snapshot.status !== "issued") {
        return Object.freeze({ status: "terminal" as const });
      }
      if (Date.parse(snapshot.expiresAt) <= now.getTime()) {
        await expireChallengeWith(client, snapshot.id, now, traceId);
        return Object.freeze({ status: "terminal" as const });
      }
      const subjectKey = readString(row, "subject_key");
      const fingerprintDigest = readOptionalString(row, "client_fingerprint_digest");
      const rateLockKeys = challengeRateLockKeys(subjectKey, fingerprintDigest);
      for (const rateLockKey of rateLockKeys) {
        await queryWith(
          client,
          "recordChallengeFailure",
          "SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))",
          [rateLockKey],
          traceId,
        );
      }
      const rateRows = await queryWith(
        client,
        "recordChallengeFailure",
        `
          SELECT
            COALESCE(sum(rate_attempt_count) FILTER (
              WHERE subject_key = $1
            ), 0)::integer AS subject_attempts,
            COALESCE(sum(rate_attempt_count) FILTER (
              WHERE $2::text IS NOT NULL AND client_fingerprint_digest = $2
            ), 0)::integer AS fingerprint_attempts
          FROM campaign_os.wallet_auth_challenges
          WHERE (
              subject_key = $1
              OR ($2::text IS NOT NULL AND client_fingerprint_digest = $2)
            )
            AND rate_window_started_at > $3
        `,
        [
          subjectKey,
          fingerprintDigest ?? null,
          new Date(now.getTime() - policy.verificationRateWindowMs).toISOString(),
        ],
        traceId,
      );
      const aggregateAttempts = rateRows[0]
        ? Math.max(
          readInteger(rateRows[0], "subject_attempts"),
          readInteger(rateRows[0], "fingerprint_attempts"),
        )
        : 0;
      const nextChallengeAttempts = snapshot.verificationAttempts + 1;
      const rateLimited = aggregateAttempts + 1 > policy.maxVerificationAttemptsPerWindow;
      const challengeLimited = nextChallengeAttempts >= policy.maxVerificationAttemptsPerChallenge;
      const existingWindowStart = readInstant(row, "rate_window_started_at");
      const existingRateWindowActive = Date.parse(existingWindowStart)
        > now.getTime() - policy.verificationRateWindowMs;
      const nextWindowStart = existingRateWindowActive
        ? existingWindowStart
        : now.toISOString();
      const nextWindowEnd = new Date(
        Date.parse(nextWindowStart) + policy.verificationRateWindowMs,
      ).toISOString();
      const nextRowAttempts = existingRateWindowActive
        ? readInteger(row, "rate_attempt_count") + 1
        : 1;
      await queryWith(
        client,
        "recordChallengeFailure",
        `
          UPDATE campaign_os.wallet_auth_challenges
          SET
            status = $2,
            state_version = state_version + 1,
            verification_attempts = $3,
            rate_attempt_count = $4,
            rate_window_started_at = $5,
            terminal_at = $6,
            terminal_code = $7,
            trace_id = $8,
            updated_at = $9
          WHERE id = $1
        `,
        [
          snapshot.id,
          rateLimited || challengeLimited ? "rejected" : "issued",
          nextChallengeAttempts,
          nextRowAttempts,
          nextWindowStart,
          rateLimited || challengeLimited ? now.toISOString() : null,
          rateLimited ? "RATE_LIMITED" : challengeLimited ? input.terminalCode : null,
          traceId,
          now.toISOString(),
        ],
        traceId,
      );
      if (rateLimited) {
        return Object.freeze({
          retryAfterMs: Math.max(1, Date.parse(nextWindowEnd) - now.getTime()),
          status: "rate_limited" as const,
        });
      }
      return Object.freeze({ status: challengeLimited ? "terminal" as const : "recorded" as const });
    });
  };

  const recordChallengeFailure: WalletAuthenticationStore["recordChallengeFailure"] = async (input) => {
    const result = await recordChallengeFailureWithPolicy(input);
    return Object.freeze({ status: result.status === "rate_limited" ? "terminal" : result.status });
  };

  const expireChallenges: WalletAuthenticationStore["expireChallenges"] = async (nowInput) => {
    ensureOpen("expireChallenges");
    const now = normalizeDate(nowInput, "expireChallenges", DEFAULT_TRACE_ID);
    const rows = await query(
      "expireChallenges",
      `
        UPDATE campaign_os.wallet_auth_challenges
        SET
          status = 'expired',
          state_version = state_version + 1,
          terminal_at = $1,
          terminal_code = 'CHALLENGE_EXPIRED',
          trace_id = $2,
          updated_at = $1
        WHERE status = 'issued' AND expires_at <= $1
        RETURNING id
      `,
      [now.toISOString(), DEFAULT_TRACE_ID],
      DEFAULT_TRACE_ID,
    );
    return rows.length;
  };

  const consumeChallengeAndCreateSession = async (
    input: ConsumeChallengeAndCreateSessionInput,
  ): Promise<Readonly<{ status: "created" | "conflict" | "expired" | "not_found" }>> => {
    const traceId = safeTraceId(input?.traceId);
    ensureOpen("consumeChallenge", traceId);
    if (
      !isPlainRecord(input)
      || !safeId(input.challengeId)
      || input.expectedChallengeVersion !== "campaign-os-wallet-auth/v1"
    ) {
      throw storeError("WALLET_AUTH_STORE_ARGUMENT_INVALID", "input", "consumeChallenge", traceId);
    }
    const session = copyDurableWalletSession(input.session, "consumeChallenge", traceId);
    if (session.challengeId !== input.challengeId) {
      throw storeError(
        "WALLET_AUTH_STORE_ARGUMENT_INVALID",
        "session.challengeId",
        "consumeChallenge",
        traceId,
      );
    }
    const now = readClock(clock, "consumeChallenge", traceId);
    const subjectKey = walletAuthenticationSubjectKey(session.subject);

    try {
      return await withTransaction("consumeChallenge", traceId, async (client) => {
        const challengeRows = await queryWith(
          client,
          "consumeChallenge",
          `SELECT ${CHALLENGE_COLUMNS} FROM campaign_os.wallet_auth_challenges WHERE id = $1 FOR UPDATE`,
          [input.challengeId],
          traceId,
        );
        const challengeRow = challengeRows[0];
        if (!challengeRow) {
          return Object.freeze({ status: "not_found" as const });
        }
        const challenge = mapChallengeRow(challengeRow);
        if (Date.parse(challenge.expiresAt) <= now.getTime() && challenge.status === "issued") {
          await expireChallengeWith(client, challenge.id, now, traceId);
          return Object.freeze({ status: "expired" as const });
        }
        if (challenge.status !== "issued" || challenge.version !== input.expectedChallengeVersion) {
          return Object.freeze({ status: "conflict" as const });
        }
        if (
          session.version !== 1
          || Date.parse(session.issuedAt) > now.getTime()
          || Date.parse(session.idleExpiresAt) <= now.getTime()
          || Date.parse(session.absoluteExpiresAt) <= now.getTime()
          || !sessionMatchesChallenge(challenge, session)
        ) {
          throw storeError(
            "WALLET_AUTH_STORE_ARGUMENT_INVALID",
            "session",
            "consumeChallenge",
            traceId,
          );
        }

        await queryWith(
          client,
          "consumeChallenge",
          "SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))",
          [subjectKey],
          traceId,
        );
        await queryWith(
          client,
          "consumeChallenge",
          `
            UPDATE campaign_os.wallet_sessions
            SET
              status = 'expired',
              version = version + 1,
              revoked_at = $2,
              revocation_code = 'SESSION_EXPIRED',
              last_trace_id = $3,
              updated_at = $2
            WHERE subject_key = $1
              AND status = 'active'
              AND (idle_expires_at <= $2 OR absolute_expires_at <= $2)
          `,
          [subjectKey, now.toISOString(), traceId],
          traceId,
        );
        const activeRows = await queryWith(
          client,
          "consumeChallenge",
          `
            SELECT id
            FROM campaign_os.wallet_sessions
            WHERE subject_key = $1 AND status = 'active'
            ORDER BY issued_at, id
            FOR UPDATE
          `,
          [subjectKey],
          traceId,
        );
        if (activeRows.length >= policy.maxActiveSessionsPerSubject) {
          if (policy.sessionCapStrategy === "deny") {
            return Object.freeze({ status: "conflict" as const });
          }
          const revokeCount = activeRows.length - policy.maxActiveSessionsPerSubject + 1;
          const victimIds = activeRows.slice(0, revokeCount).map((row) => readString(row, "id"));
          await queryWith(
            client,
            "consumeChallenge",
            `
              UPDATE campaign_os.wallet_sessions
              SET
                status = 'revoked',
                version = version + 1,
                revoked_at = $2,
                revocation_code = 'SESSION_CAP_REPLACED',
                last_trace_id = $3,
                updated_at = $2
              WHERE id = ANY($1::text[]) AND status = 'active'
            `,
            [victimIds, now.toISOString(), traceId],
            traceId,
          );
        }

        await queryWith(
          client,
          "consumeChallenge",
          `
            UPDATE campaign_os.wallet_auth_challenges
            SET
              status = 'consumed',
              state_version = state_version + 1,
              consumed_at = $2,
              terminal_at = $2,
              terminal_code = 'CHALLENGE_CONSUMED',
              trace_id = $3,
              updated_at = $2
            WHERE id = $1 AND status = 'issued'
          `,
          [challenge.id, now.toISOString(), traceId],
          traceId,
        );
        await queryWith(
          client,
          "consumeChallenge",
          `
            INSERT INTO campaign_os.wallet_sessions (
              id, credential_digest, csrf_token_digest, challenge_id, subject_key,
              wallet_address, account_type, wallet_source, chain_id, network,
              adapter_id, proof_method, signer_address, ca_hash, proof_digest,
              verified_at, credential_boundary, role_ids, capabilities, status,
              version, membership_revision, issued_at, last_seen_at,
              idle_expires_at, absolute_expires_at, revoked_at, revocation_code,
              last_trace_id, created_at, updated_at
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15, $16, $17, $18::jsonb, $19::jsonb,
              'active', $20, $21, $22, $23, $24, $25, NULL, NULL,
              $26, $22, $22
            )
          `,
          [
            session.id,
            session.credentialDigest,
            session.csrfTokenDigest,
            session.challengeId,
            subjectKey,
            session.subject.walletAddress,
            session.subject.accountType,
            session.subject.walletSource,
            session.subject.chainId,
            session.subject.network,
            session.subject.adapterId,
            session.subject.proofMethod,
            session.subject.signerAddress,
            session.subject.caHash ?? null,
            session.subject.proofDigest,
            session.subject.verifiedAt,
            session.credentialBoundary,
            JSON.stringify(session.roleIds),
            JSON.stringify(session.capabilities),
            session.version,
            session.membershipRevision,
            session.issuedAt,
            session.lastSeenAt,
            session.idleExpiresAt,
            session.absoluteExpiresAt,
            traceId,
          ],
          traceId,
        );
        return Object.freeze({ status: "created" as const });
      });
    } catch (error) {
      if (
        error instanceof WalletAuthenticationStoreError
        && error.code === "WALLET_AUTH_STORE_CONFLICT"
      ) {
        return Object.freeze({ status: "conflict" });
      }
      throw error;
    }
  };

  const expireSessionByCredential = async (
    credentialDigest: string,
    now: Date,
    traceId: string,
  ): Promise<void> => {
    await query(
      "expireSessions",
      `
        UPDATE campaign_os.wallet_sessions
        SET
          status = 'expired',
          version = version + 1,
          revoked_at = $2,
          revocation_code = 'SESSION_EXPIRED',
          last_trace_id = $3,
          updated_at = $2
        WHERE credential_digest = $1
          AND status = 'active'
          AND (idle_expires_at <= $2 OR absolute_expires_at <= $2)
      `,
      [credentialDigest, now.toISOString(), traceId],
      traceId,
    );
  };

  const resolveActiveSession: WalletAuthenticationStore["resolveActiveSession"] = async (
    credentialDigest,
  ) => {
    ensureOpen("resolveSession");
    if (!isWalletAuthenticationDigest(credentialDigest)) {
      throw storeError(
        "WALLET_AUTH_STORE_ARGUMENT_INVALID",
        "credentialDigest",
        "resolveSession",
      );
    }
    const now = readClock(clock, "resolveSession", DEFAULT_TRACE_ID);
    await expireSessionByCredential(credentialDigest, now, DEFAULT_TRACE_ID);
    const rows = await query(
      "resolveSession",
      `
        SELECT ${SESSION_COLUMNS}
        FROM campaign_os.wallet_sessions
        WHERE credential_digest = $1 AND status = 'active'
        LIMIT 1
      `,
      [credentialDigest],
      DEFAULT_TRACE_ID,
    );
    return rows[0] ? mapSessionRow(rows[0]) : undefined;
  };

  const touchSession: WalletAuthenticationStore["touchSession"] = async (input) => {
    const traceId = safeTraceId(input?.traceId);
    ensureOpen("touchSession", traceId);
    if (
      !isPlainRecord(input)
      || !isWalletAuthenticationDigest(input.credentialDigest)
      || !Number.isSafeInteger(input.version)
      || input.version < 1
    ) {
      throw storeError("WALLET_AUTH_STORE_ARGUMENT_INVALID", "input", "touchSession", traceId);
    }
    const now = normalizeDate(input.now, "touchSession", traceId);
    await expireSessionByCredential(input.credentialDigest, now, traceId);
    const rows = await query(
      "touchSession",
      `
        UPDATE campaign_os.wallet_sessions
        SET
          idle_expires_at = LEAST(
            absolute_expires_at,
            $2::timestamptz + (idle_expires_at - last_seen_at)
          ),
          last_seen_at = $2,
          last_trace_id = $5,
          updated_at = $2
        WHERE credential_digest = $1
          AND status = 'active'
          AND version = $3
          AND last_seen_at <= $2::timestamptz - ($4 * interval '1 millisecond')
          AND idle_expires_at > $2
          AND absolute_expires_at > $2
        RETURNING id
      `,
      [
        input.credentialDigest,
        now.toISOString(),
        input.version,
        policy.touchIntervalMs,
        traceId,
      ],
      traceId,
    );
    if (rows.length === 1) {
      return Object.freeze({ status: "touched" });
    }
    const current = await query(
      "touchSession",
      `
        SELECT version
        FROM campaign_os.wallet_sessions
        WHERE credential_digest = $1 AND status = 'active'
        LIMIT 1
      `,
      [input.credentialDigest],
      traceId,
    );
    return Object.freeze({
      status: current[0] && readInteger(current[0], "version") === input.version
        ? "throttled" as const
        : "not_found" as const,
    });
  };

  const rotateSession = async (
    input: RotateWalletSessionInput,
  ): Promise<Readonly<{ status: "rotated" | "conflict" | "not_found" }>> => {
    const traceId = safeTraceId(input?.traceId);
    ensureOpen("rotateSession", traceId);
    if (
      !isPlainRecord(input)
      || !isWalletAuthenticationDigest(input.credentialDigest)
      || !isWalletAuthenticationDigest(input.nextCredentialDigest)
      || !isWalletAuthenticationDigest(input.nextCsrfTokenDigest)
      || input.nextCredentialDigest === input.nextCsrfTokenDigest
      || !Number.isSafeInteger(input.version)
      || input.version < 1
    ) {
      throw storeError("WALLET_AUTH_STORE_ARGUMENT_INVALID", "input", "rotateSession", traceId);
    }
    const now = readClock(clock, "rotateSession", traceId);
    try {
      return await withTransaction("rotateSession", traceId, async (client) => {
        const rows = await queryWith(
          client,
          "rotateSession",
          `
            SELECT id, status, version, idle_expires_at, absolute_expires_at
            FROM campaign_os.wallet_sessions
            WHERE credential_digest = $1
            FOR UPDATE
          `,
          [input.credentialDigest],
          traceId,
        );
        const row = rows[0];
        if (!row) {
          return Object.freeze({ status: "not_found" as const });
        }
        if (readString(row, "status") !== "active") {
          return Object.freeze({ status: "not_found" as const });
        }
        if (
          Date.parse(readInstant(row, "idle_expires_at")) <= now.getTime()
          || Date.parse(readInstant(row, "absolute_expires_at")) <= now.getTime()
        ) {
          await queryWith(
            client,
            "rotateSession",
            `
              UPDATE campaign_os.wallet_sessions
              SET
                status = 'expired',
                version = version + 1,
                revoked_at = $2,
                revocation_code = 'SESSION_EXPIRED',
                last_trace_id = $3,
                updated_at = $2
              WHERE id = $1 AND status = 'active'
            `,
            [readString(row, "id"), now.toISOString(), traceId],
            traceId,
          );
          return Object.freeze({ status: "not_found" as const });
        }
        if (readInteger(row, "version") !== input.version) {
          return Object.freeze({ status: "conflict" as const });
        }
        await queryWith(
          client,
          "rotateSession",
          `
            UPDATE campaign_os.wallet_sessions
            SET
              credential_digest = $2,
              csrf_token_digest = $3,
              version = version + 1,
              updated_at = $4,
              last_trace_id = $6
            WHERE id = $1 AND status = 'active' AND version = $5
          `,
          [
            readString(row, "id"),
            input.nextCredentialDigest,
            input.nextCsrfTokenDigest,
            now.toISOString(),
            input.version,
            traceId,
          ],
          traceId,
        );
        return Object.freeze({ status: "rotated" as const });
      });
    } catch (error) {
      if (
        error instanceof WalletAuthenticationStoreError
        && error.code === "WALLET_AUTH_STORE_CONFLICT"
      ) {
        return Object.freeze({ status: "conflict" });
      }
      throw error;
    }
  };

  const revokeBy = async (
    field: "credential_digest" | "id",
    value: string,
    reasonCode: string,
    traceId: string,
  ): Promise<Readonly<{ status: "revoked" | "already_terminal" | "not_found" }>> => {
    const now = readClock(clock, "revokeSession", traceId);
    return withTransaction("revokeSession", traceId, async (client) => {
      const rows = await queryWith(
        client,
        "revokeSession",
        `SELECT id, status FROM campaign_os.wallet_sessions WHERE ${field} = $1 FOR UPDATE`,
        [value],
        traceId,
      );
      const row = rows[0];
      if (!row) {
        return Object.freeze({ status: "already_terminal" as const });
      }
      if (readString(row, "status") !== "active") {
        return Object.freeze({ status: "already_terminal" as const });
      }
      await queryWith(
        client,
        "revokeSession",
        `
          UPDATE campaign_os.wallet_sessions
          SET
            status = 'revoked',
            version = version + 1,
            revoked_at = $2,
            revocation_code = $3,
            last_trace_id = $4,
            updated_at = $2
          WHERE id = $1 AND status = 'active'
        `,
        [readString(row, "id"), now.toISOString(), reasonCode, traceId],
        traceId,
      );
      return Object.freeze({ status: "revoked" as const });
    });
  };

  const revokeSession: WalletAuthenticationStore["revokeSession"] = async (input) => {
    const traceId = safeTraceId(input?.traceId);
    ensureOpen("revokeSession", traceId);
    if (
      !isPlainRecord(input)
      || !safeId(input.sessionId)
      || typeof input.reasonCode !== "string"
      || !SAFE_CODE_PATTERN.test(input.reasonCode)
    ) {
      throw storeError("WALLET_AUTH_STORE_ARGUMENT_INVALID", "input", "revokeSession", traceId);
    }
    return revokeBy("id", input.sessionId, input.reasonCode, traceId);
  };

  const logoutSession: DurableWalletAuthenticationStore["logoutSession"] = async (input) => {
    const traceId = safeTraceId(input?.traceId);
    ensureOpen("revokeSession", traceId);
    if (!isPlainRecord(input) || !isWalletAuthenticationDigest(input.credentialDigest)) {
      throw storeError(
        "WALLET_AUTH_STORE_ARGUMENT_INVALID",
        "credentialDigest",
        "revokeSession",
        traceId,
      );
    }
    return revokeBy("credential_digest", input.credentialDigest, "LOGOUT", traceId);
  };

  const revokeSubjectSessions: WalletAuthenticationStore["revokeSubjectSessions"] = async (
    input,
  ) => {
    const traceId = safeTraceId(input?.traceId);
    ensureOpen("revokeSubjectSessions", traceId);
    if (
      !isPlainRecord(input)
      || !isWalletAuthenticationDigest(input.subjectKey)
      || typeof input.reasonCode !== "string"
      || !SAFE_CODE_PATTERN.test(input.reasonCode)
    ) {
      throw storeError(
        "WALLET_AUTH_STORE_ARGUMENT_INVALID",
        "input",
        "revokeSubjectSessions",
        traceId,
      );
    }
    const now = readClock(clock, "revokeSubjectSessions", traceId);
    return withTransaction("revokeSubjectSessions", traceId, async (client) => {
      await queryWith(
        client,
        "revokeSubjectSessions",
        "SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))",
        [input.subjectKey],
        traceId,
      );
      const rows = await queryWith(
        client,
        "revokeSubjectSessions",
        `
          UPDATE campaign_os.wallet_sessions
          SET
            status = 'revoked',
            version = version + 1,
            revoked_at = $2,
            revocation_code = $3,
            last_trace_id = $4,
            updated_at = $2
          WHERE subject_key = $1 AND status = 'active'
          RETURNING id
        `,
        [input.subjectKey, now.toISOString(), input.reasonCode, traceId],
        traceId,
      );
      return rows.length;
    });
  };

  const expireSessions: WalletAuthenticationStore["expireSessions"] = async (nowInput) => {
    ensureOpen("expireSessions");
    const now = normalizeDate(nowInput, "expireSessions", DEFAULT_TRACE_ID);
    const rows = await query(
      "expireSessions",
      `
        UPDATE campaign_os.wallet_sessions
        SET
          status = 'expired',
          version = version + 1,
          revoked_at = $1,
          revocation_code = 'SESSION_EXPIRED',
          last_trace_id = $2,
          updated_at = $1
        WHERE status = 'active'
          AND (idle_expires_at <= $1 OR absolute_expires_at <= $1)
        RETURNING id
      `,
      [now.toISOString(), DEFAULT_TRACE_ID],
      DEFAULT_TRACE_ID,
    );
    return rows.length;
  };

  const listActiveSessions: DurableWalletAuthenticationStore["listActiveSessions"] = async (
    input,
  ) => {
    const traceId = safeTraceId(input?.traceId);
    ensureOpen("listSessions", traceId);
    if (!isPlainRecord(input) || !isWalletAuthenticationDigest(input.subjectKey)) {
      throw storeError("WALLET_AUTH_STORE_ARGUMENT_INVALID", "input", "listSessions", traceId);
    }
    const now = normalizeDate(input.now, "listSessions", traceId);
    await query(
      "listSessions",
      `
        UPDATE campaign_os.wallet_sessions
        SET
          status = 'expired',
          version = version + 1,
          revoked_at = $2,
          revocation_code = 'SESSION_EXPIRED',
          last_trace_id = $3,
          updated_at = $2
        WHERE subject_key = $1
          AND status = 'active'
          AND (idle_expires_at <= $2 OR absolute_expires_at <= $2)
      `,
      [input.subjectKey, now.toISOString(), traceId],
      traceId,
    );
    const rows = await query(
      "listSessions",
      `
        SELECT ${SESSION_COLUMNS}
        FROM campaign_os.wallet_sessions
        WHERE subject_key = $1 AND status = 'active'
        ORDER BY issued_at, id
        LIMIT $2
      `,
      [input.subjectKey, policy.maxActiveSessionsPerSubject],
      traceId,
    );
    return Object.freeze(rows.map((row) => projectWalletAuthenticationSession(mapSessionRow(row))));
  };

  const assertActiveAuthorizationFence: DurableWalletAuthenticationStore[
    "assertActiveAuthorizationFence"
  ] = async (input) => {
    const traceId = safeTraceId(input?.traceId);
    ensureOpen("assertFence", traceId);
    if (
      !isPlainRecord(input)
      || !isWalletAuthenticationDigest(input.credentialDigest)
      || !safeId(input.sessionId)
      || !safeId(input.membershipRevision)
      || !Number.isSafeInteger(input.version)
      || input.version < 1
    ) {
      throw storeError("WALLET_AUTH_STORE_ARGUMENT_INVALID", "input", "assertFence", traceId);
    }
    const now = normalizeDate(input.now, "assertFence", traceId);
    await expireSessionByCredential(input.credentialDigest, now, traceId);
    const rows = await query(
      "assertFence",
      `
        SELECT id, version, membership_revision
        FROM campaign_os.wallet_sessions
        WHERE credential_digest = $1 AND status = 'active'
        LIMIT 1
      `,
      [input.credentialDigest],
      traceId,
    );
    const row = rows[0];
    if (!row) {
      return Object.freeze({ status: "inactive" });
    }
    return Object.freeze({
      status: readString(row, "id") === input.sessionId
        && readInteger(row, "version") === input.version
        && readString(row, "membership_revision") === input.membershipRevision
        ? "active" as const
        : "stale" as const,
    });
  };

  const close = (): Promise<void> => {
    if (closePromise) {
      return closePromise;
    }
    closing = true;
    closePromise = (async () => {
      const startedAt = Date.now();
      const deadline = startedAt + shutdownTimeoutMs;
      let failureField: "pool" | "transaction" | undefined;
      if (activeTransactions.size > 0) {
        await settleWithin(
          Promise.allSettled([...activeTransactions]),
          Math.max(1, Math.floor(shutdownTimeoutMs / 2)),
        );
      }
      if (activeTransactions.size > 0) {
        for (const client of activeClients) {
          forceReleasedClients.add(client);
          try {
            client.release(true);
          } catch {
            // The connection is already unusable and the store is closing.
          }
        }
        const forcedDrain = await settleWithin(
          Promise.allSettled([...activeTransactions]),
          Math.max(0, deadline - Date.now()),
        );
        if (forcedDrain.status === "timed_out" && activeTransactions.size > 0) {
          failureField = "transaction";
        }
      }
      closed = true;
      if (ownsPool) {
        try {
          const poolClose = await settleWithin(
            pool.end(),
            Math.max(0, deadline - Date.now()),
          );
          if (poolClose.status === "timed_out" && !failureField) {
            failureField = "pool";
          }
        } catch {
          failureField ??= "pool";
        }
      }
      if (failureField) {
        throw storeError(
          "WALLET_AUTH_STORE_UNAVAILABLE",
          failureField,
          "close",
          DEFAULT_TRACE_ID,
          true,
        );
      }
    })();
    return closePromise;
  };

  return Object.freeze({
    assertActiveAuthorizationFence,
    close,
    consumeChallengeAndCreateSession,
    expireChallenges,
    expireSessions,
    issueChallenge,
    issueChallengeWithPolicy,
    kind: "postgresql" as const,
    listActiveSessions,
    loadChallenge,
    logoutSession,
    recordChallengeFailure,
    recordChallengeFailureWithPolicy,
    resolveActiveSession,
    revokeSession,
    revokeSubjectSessions,
    rotateSession,
    touchSession,
  });
};

export const createRequiredPostgresWalletAuthenticationStore = ({
  env = typeof process === "undefined" ? {} : process.env,
  poolFactory,
  ...options
}: CreateRequiredPostgresWalletAuthenticationStoreOptions): DurableWalletAuthenticationStore => {
  const value = env.CAMPAIGN_OS_DATABASE_URL?.trim();
  if (!value) {
    throw storeError(
      "WALLET_AUTH_STORE_CONFIG_INVALID",
      "CAMPAIGN_OS_DATABASE_URL",
      "close",
    );
  }
  try {
    const parsed = new URL(value);
    if (
      (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:")
      || !parsed.hostname
      || parsed.hash
    ) {
      throw new TypeError("Invalid PostgreSQL URL.");
    }
  } catch {
    throw storeError(
      "WALLET_AUTH_STORE_CONFIG_INVALID",
      "CAMPAIGN_OS_DATABASE_URL",
      "close",
    );
  }
  let pool: PostgresWalletAuthenticationPool;
  try {
    pool = poolFactory(value);
  } catch {
    throw storeError("WALLET_AUTH_STORE_CONFIG_INVALID", "poolFactory", "close");
  }
  return createPostgresWalletAuthenticationStore({ ...options, pool });
};
