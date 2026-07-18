import { createHash } from "node:crypto";
import {
  projectVerifiedWalletSubjectForPersistence,
  restoreVerifiedWalletSubjectFromPersistence,
  type DurableWalletSessionRecord,
  type PersistedVerifiedWalletSubject,
  type WalletAuthenticationChallengeSnapshot,
  type WalletAuthenticationClock,
  type WalletAuthenticationStore,
} from "./walletAuthentication";

const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;
const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;
const DEFAULT_TRACE_ID = "wallet-auth-store";

const challengeFields = new Set([
  "adapterId",
  "caHash",
  "chainId",
  "expiresAt",
  "id",
  "issuedAt",
  "messageDigest",
  "network",
  "nonceDigest",
  "requestedWalletAddress",
  "status",
  "traceId",
  "verificationAttempts",
  "version",
]);

const sessionFields = new Set([
  "absoluteExpiresAt",
  "capabilities",
  "challengeId",
  "credentialBoundary",
  "credentialDigest",
  "csrfTokenDigest",
  "id",
  "idleExpiresAt",
  "issuedAt",
  "lastSeenAt",
  "membershipRevision",
  "roleIds",
  "status",
  "subject",
  "version",
]);

export type WalletAuthenticationStoreErrorCode =
  | "WALLET_AUTH_STORE_ARGUMENT_INVALID"
  | "WALLET_AUTH_STORE_CLOSED"
  | "WALLET_AUTH_STORE_CONFIG_INVALID"
  | "WALLET_AUTH_STORE_CONFLICT"
  | "WALLET_AUTH_STORE_RATE_LIMITED"
  | "WALLET_AUTH_STORE_UNAVAILABLE";

export type WalletAuthenticationStoreOperation =
  | "assertFence"
  | "close"
  | "consumeChallenge"
  | "expireChallenges"
  | "expireSessions"
  | "issueChallenge"
  | "listSessions"
  | "loadChallenge"
  | "recordChallengeFailure"
  | "resolveSession"
  | "revokeSession"
  | "revokeSubjectSessions"
  | "rotateSession"
  | "touchSession";

const SAFE_ERROR_MESSAGES: Readonly<Record<WalletAuthenticationStoreErrorCode, string>> =
  Object.freeze({
    WALLET_AUTH_STORE_ARGUMENT_INVALID: "Wallet authentication store input is invalid.",
    WALLET_AUTH_STORE_CLOSED: "Wallet authentication store is closed.",
    WALLET_AUTH_STORE_CONFIG_INVALID: "Wallet authentication store configuration is invalid.",
    WALLET_AUTH_STORE_CONFLICT: "Wallet authentication store record conflicts with existing data.",
    WALLET_AUTH_STORE_RATE_LIMITED: "Wallet authentication store rate limit was reached.",
    WALLET_AUTH_STORE_UNAVAILABLE: "Wallet authentication store is unavailable.",
  });

export class WalletAuthenticationStoreError extends Error {
  readonly code: WalletAuthenticationStoreErrorCode;
  readonly field: string;
  readonly operation: WalletAuthenticationStoreOperation;
  readonly retryable: boolean;
  readonly traceId: string;

  constructor(options: {
    code: WalletAuthenticationStoreErrorCode;
    field: string;
    operation: WalletAuthenticationStoreOperation;
    retryable: boolean;
    traceId: string;
  }) {
    super(SAFE_ERROR_MESSAGES[options.code]);
    this.name = "WalletAuthenticationStoreError";
    this.code = options.code;
    this.field = options.field;
    this.operation = options.operation;
    this.retryable = options.retryable;
    this.traceId = safeTraceId(options.traceId);
    delete this.stack;
  }
}

export interface WalletAuthenticationStorePolicy {
  readonly maxActiveChallengesPerSubject: number;
  readonly maxActiveSessionsPerSubject: number;
  readonly maxVerificationAttemptsPerChallenge: number;
  readonly maxVerificationAttemptsPerWindow: number;
  readonly sessionCapStrategy: "deny" | "revoke_oldest";
  readonly touchIntervalMs: number;
  readonly verificationRateWindowMs: number;
}

export const defaultWalletAuthenticationStorePolicy: WalletAuthenticationStorePolicy =
  Object.freeze({
    maxActiveChallengesPerSubject: 5,
    maxActiveSessionsPerSubject: 5,
    maxVerificationAttemptsPerChallenge: 3,
    maxVerificationAttemptsPerWindow: 20,
    sessionCapStrategy: "revoke_oldest",
    touchIntervalMs: 60_000,
    verificationRateWindowMs: 5 * 60_000,
  });

export interface IssueWalletAuthenticationChallengeInput {
  readonly challenge: WalletAuthenticationChallengeSnapshot;
  readonly clientFingerprintDigest?: string;
  readonly traceId: string;
}

export type IssueWalletAuthenticationChallengeResult =
  | Readonly<{ challenge: WalletAuthenticationChallengeSnapshot; status: "issued" }>
  | Readonly<{ retryAfterMs: number; status: "active_limit" | "rate_limited" }>
  | Readonly<{ status: "conflict" }>;

export interface RecordWalletAuthenticationChallengeFailureInput {
  readonly challengeId: string;
  readonly terminalCode: string;
  readonly traceId: string;
}

export type RecordWalletAuthenticationChallengeFailureResult = Readonly<{
  retryAfterMs?: number;
  status: "not_found" | "rate_limited" | "recorded" | "terminal";
}>;

export interface WalletAuthenticationSessionProjection {
  readonly absoluteExpiresAt: string;
  readonly accountType: DurableWalletSessionRecord["subject"]["accountType"];
  readonly capabilities: readonly string[];
  readonly chainId: DurableWalletSessionRecord["subject"]["chainId"];
  readonly idleExpiresAt: string;
  readonly issuedAt: string;
  readonly network: DurableWalletSessionRecord["subject"]["network"];
  readonly roleIds: readonly string[];
  readonly sessionId: string;
  readonly status: "active";
  readonly walletAddress: string;
  readonly walletSource: DurableWalletSessionRecord["subject"]["walletSource"];
}

export interface WalletAuthenticationAuthorizationFenceInput {
  readonly credentialDigest: string;
  readonly membershipRevision: string;
  readonly now: Date;
  readonly sessionId: string;
  readonly traceId: string;
  readonly version: number;
}

export type WalletAuthenticationAuthorizationFenceResult = Readonly<{
  status: "active" | "inactive" | "stale";
}>;

export interface DurableWalletAuthenticationStore extends WalletAuthenticationStore {
  readonly kind: "memory_test" | "postgresql";
  assertActiveAuthorizationFence(
    input: WalletAuthenticationAuthorizationFenceInput,
  ): Promise<WalletAuthenticationAuthorizationFenceResult>;
  issueChallengeWithPolicy(
    input: IssueWalletAuthenticationChallengeInput,
  ): Promise<IssueWalletAuthenticationChallengeResult>;
  listActiveSessions(input: Readonly<{
    now: Date;
    subjectKey: string;
    traceId: string;
  }>): Promise<readonly WalletAuthenticationSessionProjection[]>;
  logoutSession(input: Readonly<{
    credentialDigest: string;
    traceId: string;
  }>): Promise<Readonly<{ status: "revoked" | "already_terminal" | "not_found" }>>;
  recordChallengeFailureWithPolicy(
    input: RecordWalletAuthenticationChallengeFailureInput,
  ): Promise<RecordWalletAuthenticationChallengeFailureResult>;
}

interface MemoryChallengeRow {
  fingerprintDigest?: string;
  snapshot: WalletAuthenticationChallengeSnapshot;
  subjectKey: string;
  terminalCode?: string;
  terminalAt?: string;
}

interface MemorySessionRow {
  record: DurableWalletSessionRecord;
  revocationCode?: string;
  revokedAt?: string;
  subjectKey: string;
}

export interface CreateMemoryWalletAuthenticationStoreForTestsOptions {
  readonly clock: WalletAuthenticationClock;
  readonly mode: "unit_test";
  readonly policy?: Partial<WalletAuthenticationStorePolicy>;
}

const failStore = (
  code: WalletAuthenticationStoreErrorCode,
  field: string,
  operation: WalletAuthenticationStoreOperation,
  traceId = DEFAULT_TRACE_ID,
  retryable = false,
): never => {
  throw new WalletAuthenticationStoreError({ code, field, operation, retryable, traceId });
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const hasOnlyFields = (value: Record<string, unknown>, fields: ReadonlySet<string>): boolean =>
  Reflect.ownKeys(value).every((key) => typeof key === "string" && fields.has(key));

const safeTraceId = (value: unknown): string =>
  typeof value === "string"
    && value.length > 0
    && value.length <= 128
    && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
    ? value
    : DEFAULT_TRACE_ID;

const isSafeId = (value: unknown, maximum = 160): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= maximum
  && SAFE_ID_PATTERN.test(value)
  && !/[\u0000-\u001f\u007f]/.test(value);

const isSafeInstant = (value: unknown): value is string =>
  typeof value === "string"
  && value.length <= 32
  && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString() === value;

export const isWalletAuthenticationDigest = (value: unknown): value is string =>
  typeof value === "string" && DIGEST_PATTERN.test(value);

const copySafeIds = (
  values: unknown,
  field: string,
  operation: WalletAuthenticationStoreOperation,
  traceId: string,
): readonly string[] => {
  if (
    !Array.isArray(values)
    || values.length > 64
    || new Set(values).size !== values.length
    || values.some((value) => !isSafeId(value, 128))
  ) {
    return failStore("WALLET_AUTH_STORE_ARGUMENT_INVALID", field, operation, traceId);
  }
  return Object.freeze([...values]);
};

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
    // The safe typed error below excludes the clock error.
  }
  return failStore("WALLET_AUTH_STORE_UNAVAILABLE", "clock", operation, traceId, true);
};

const normalizeDate = (
  value: unknown,
  field: string,
  operation: WalletAuthenticationStoreOperation,
  traceId: string,
): Date => {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    return failStore("WALLET_AUTH_STORE_ARGUMENT_INVALID", field, operation, traceId);
  }
  return new Date(value);
};

export const copyWalletAuthenticationChallenge = (
  source: unknown,
  operation: WalletAuthenticationStoreOperation = "loadChallenge",
  traceId = DEFAULT_TRACE_ID,
): WalletAuthenticationChallengeSnapshot => {
  if (
    !isPlainRecord(source)
    || !hasOnlyFields(source, challengeFields)
    || !isSafeId(source.id)
    || source.version !== "campaign-os-wallet-auth/v1"
    || !isSafeId(source.requestedWalletAddress, 256)
    || !isSafeId(source.adapterId, 64)
    || !isSafeId(source.chainId, 32)
    || (source.network !== "mainnet" && source.network !== "testnet")
    || (source.caHash !== undefined && !isSafeId(source.caHash, 256))
    || !isWalletAuthenticationDigest(source.nonceDigest)
    || !isWalletAuthenticationDigest(source.messageDigest)
    || !isSafeInstant(source.issuedAt)
    || !isSafeInstant(source.expiresAt)
    || Date.parse(source.expiresAt) <= Date.parse(source.issuedAt)
    || !["issued", "consumed", "rejected", "expired"].includes(String(source.status))
    || !Number.isSafeInteger(source.verificationAttempts)
    || Number(source.verificationAttempts) < 0
    || Number(source.verificationAttempts) > 1_000
    || safeTraceId(source.traceId) !== source.traceId
  ) {
    return failStore("WALLET_AUTH_STORE_ARGUMENT_INVALID", "challenge", operation, traceId);
  }

  return Object.freeze({
    adapterId: source.adapterId as WalletAuthenticationChallengeSnapshot["adapterId"],
    ...(source.caHash === undefined ? {} : { caHash: source.caHash as string }),
    chainId: source.chainId as WalletAuthenticationChallengeSnapshot["chainId"],
    expiresAt: source.expiresAt as string,
    id: source.id as string,
    issuedAt: source.issuedAt as string,
    messageDigest: source.messageDigest as string,
    network: source.network as WalletAuthenticationChallengeSnapshot["network"],
    nonceDigest: source.nonceDigest as string,
    requestedWalletAddress: source.requestedWalletAddress as string,
    status: source.status as WalletAuthenticationChallengeSnapshot["status"],
    traceId: source.traceId as string,
    verificationAttempts: source.verificationAttempts as number,
    version: "campaign-os-wallet-auth/v1",
  });
};

export const copyDurableWalletSession = (
  source: unknown,
  operation: WalletAuthenticationStoreOperation = "resolveSession",
  traceId = DEFAULT_TRACE_ID,
): DurableWalletSessionRecord => {
  if (
    !isPlainRecord(source)
    || !hasOnlyFields(source, sessionFields)
    || !isSafeId(source.id)
    || !isSafeId(source.challengeId)
    || !isWalletAuthenticationDigest(source.credentialDigest)
    || !isWalletAuthenticationDigest(source.csrfTokenDigest)
    || source.credentialDigest === source.csrfTokenDigest
    || !isSafeId(source.credentialBoundary, 128)
    || !isSafeId(source.membershipRevision)
    || source.status !== "active"
    || !Number.isSafeInteger(source.version)
    || Number(source.version) < 1
    || !isSafeInstant(source.issuedAt)
    || !isSafeInstant(source.lastSeenAt)
    || !isSafeInstant(source.idleExpiresAt)
    || !isSafeInstant(source.absoluteExpiresAt)
    || Date.parse(source.lastSeenAt) < Date.parse(source.issuedAt)
    || Date.parse(source.idleExpiresAt) <= Date.parse(source.lastSeenAt)
    || Date.parse(source.absoluteExpiresAt) < Date.parse(source.idleExpiresAt)
  ) {
    return failStore("WALLET_AUTH_STORE_ARGUMENT_INVALID", "session", operation, traceId);
  }

  let subject: PersistedVerifiedWalletSubject;
  try {
    subject = projectVerifiedWalletSubjectForPersistence(
      restoreVerifiedWalletSubjectFromPersistence(source.subject),
    );
  } catch {
    return failStore("WALLET_AUTH_STORE_ARGUMENT_INVALID", "session.subject", operation, traceId);
  }

  return Object.freeze({
    absoluteExpiresAt: source.absoluteExpiresAt as string,
    capabilities: copySafeIds(source.capabilities, "session.capabilities", operation, traceId),
    challengeId: source.challengeId as string,
    credentialBoundary: source.credentialBoundary as string,
    credentialDigest: source.credentialDigest as string,
    csrfTokenDigest: source.csrfTokenDigest as string,
    id: source.id as string,
    idleExpiresAt: source.idleExpiresAt as string,
    issuedAt: source.issuedAt as string,
    lastSeenAt: source.lastSeenAt as string,
    membershipRevision: source.membershipRevision as string,
    roleIds: copySafeIds(source.roleIds, "session.roleIds", operation, traceId),
    status: "active",
    subject,
    version: source.version as number,
  });
};

export const walletAuthenticationSubjectKey = (
  subject: Pick<PersistedVerifiedWalletSubject, "accountType" | "chainId" | "network" | "walletAddress">,
): string => createHash("sha256")
  .update([
    "campaign-os-wallet-auth-subject/v1",
    subject.walletAddress,
    subject.accountType,
    subject.chainId,
    subject.network,
  ].join("\n"), "utf8")
  .digest("hex");

const challengeSubjectKey = (challenge: WalletAuthenticationChallengeSnapshot): string =>
  createHash("sha256")
    .update([
      "campaign-os-wallet-auth-challenge-subject/v1",
      challenge.requestedWalletAddress,
      challenge.chainId,
      challenge.network,
    ].join("\n"), "utf8")
    .digest("hex");

const sessionMatchesChallenge = (
  challenge: WalletAuthenticationChallengeSnapshot,
  session: DurableWalletSessionRecord,
): boolean => session.subject.walletAddress === challenge.requestedWalletAddress
  && session.subject.chainId === challenge.chainId
  && session.subject.network === challenge.network
  && session.subject.adapterId === challenge.adapterId
  && session.subject.caHash === challenge.caHash;

export const projectWalletAuthenticationSession = (
  source: DurableWalletSessionRecord,
): WalletAuthenticationSessionProjection => {
  const session = copyDurableWalletSession(source, "resolveSession", DEFAULT_TRACE_ID);
  return Object.freeze({
    absoluteExpiresAt: session.absoluteExpiresAt,
    accountType: session.subject.accountType,
    capabilities: Object.freeze([...session.capabilities]),
    chainId: session.subject.chainId,
    idleExpiresAt: session.idleExpiresAt,
    issuedAt: session.issuedAt,
    network: session.subject.network,
    roleIds: Object.freeze([...session.roleIds]),
    sessionId: session.id,
    status: "active",
    walletAddress: session.subject.walletAddress,
    walletSource: session.subject.walletSource,
  });
};

export const normalizeWalletAuthenticationStorePolicy = (
  source: Partial<WalletAuthenticationStorePolicy> | undefined,
): WalletAuthenticationStorePolicy => {
  const policy = { ...defaultWalletAuthenticationStorePolicy, ...source };
  const boundedInteger = (value: number, field: string, minimum: number, maximum: number) => {
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
      return failStore("WALLET_AUTH_STORE_ARGUMENT_INVALID", field, "issueChallenge");
    }
    return value;
  };
  if (policy.sessionCapStrategy !== "deny" && policy.sessionCapStrategy !== "revoke_oldest") {
    return failStore("WALLET_AUTH_STORE_ARGUMENT_INVALID", "policy.sessionCapStrategy", "issueChallenge");
  }
  return Object.freeze({
    maxActiveChallengesPerSubject: boundedInteger(
      policy.maxActiveChallengesPerSubject,
      "policy.maxActiveChallengesPerSubject",
      1,
      100,
    ),
    maxActiveSessionsPerSubject: boundedInteger(
      policy.maxActiveSessionsPerSubject,
      "policy.maxActiveSessionsPerSubject",
      1,
      100,
    ),
    maxVerificationAttemptsPerChallenge: boundedInteger(
      policy.maxVerificationAttemptsPerChallenge,
      "policy.maxVerificationAttemptsPerChallenge",
      1,
      100,
    ),
    maxVerificationAttemptsPerWindow: boundedInteger(
      policy.maxVerificationAttemptsPerWindow,
      "policy.maxVerificationAttemptsPerWindow",
      1,
      1_000,
    ),
    sessionCapStrategy: policy.sessionCapStrategy,
    touchIntervalMs: boundedInteger(policy.touchIntervalMs, "policy.touchIntervalMs", 1, 60 * 60_000),
    verificationRateWindowMs: boundedInteger(
      policy.verificationRateWindowMs,
      "policy.verificationRateWindowMs",
      1_000,
      24 * 60 * 60_000,
    ),
  });
};

const replaceChallengeSnapshot = (
  row: MemoryChallengeRow,
  status: WalletAuthenticationChallengeSnapshot["status"],
  verificationAttempts = row.snapshot.verificationAttempts,
): void => {
  row.snapshot = Object.freeze({
    ...row.snapshot,
    status,
    verificationAttempts,
  });
};

const replaceSessionRecord = (
  row: MemorySessionRow,
  values: Partial<DurableWalletSessionRecord>,
): void => {
  row.record = Object.freeze({
    ...row.record,
    ...values,
    capabilities: Object.freeze([...(values.capabilities ?? row.record.capabilities)]),
    roleIds: Object.freeze([...(values.roleIds ?? row.record.roleIds)]),
    subject: row.record.subject,
  });
};

export const createMemoryWalletAuthenticationStoreForTests = ({
  clock,
  mode,
  policy: policyOverrides,
}: CreateMemoryWalletAuthenticationStoreForTestsOptions): DurableWalletAuthenticationStore => {
  if (mode !== "unit_test" || !clock || typeof clock.now !== "function") {
    return failStore("WALLET_AUTH_STORE_ARGUMENT_INVALID", "options", "issueChallenge");
  }

  const policy = normalizeWalletAuthenticationStorePolicy(policyOverrides);
  const challenges = new Map<string, MemoryChallengeRow>();
  const challengeByMessageDigest = new Map<string, string>();
  const challengeByNonceDigest = new Map<string, string>();
  const challengeIdsBySubject = new Map<string, Set<string>>();
  const challengeIdsByFingerprint = new Map<string, Set<string>>();
  const verificationAttemptsByFingerprint = new Map<string, number[]>();
  const verificationAttemptsBySubject = new Map<string, number[]>();
  const sessions = new Map<string, MemorySessionRow>();
  const sessionIdByCredentialDigest = new Map<string, string>();
  const sessionIdByCsrfDigest = new Map<string, string>();
  const sessionIdByChallengeId = new Map<string, string>();
  const sessionIdsBySubject = new Map<string, Set<string>>();
  let closed = false;
  let closePromise: Promise<void> | undefined;

  const ensureOpen = (
    operation: WalletAuthenticationStoreOperation,
    traceId = DEFAULT_TRACE_ID,
  ): void => {
    if (closed) {
      failStore("WALLET_AUTH_STORE_CLOSED", "store", operation, traceId);
    }
  };

  const markChallengeExpired = (row: MemoryChallengeRow, now: Date): boolean => {
    if (row.snapshot.status === "issued" && Date.parse(row.snapshot.expiresAt) <= now.getTime()) {
      replaceChallengeSnapshot(row, "expired");
      row.terminalAt = now.toISOString();
      row.terminalCode = "CHALLENGE_EXPIRED";
      return true;
    }
    return row.snapshot.status === "expired";
  };

  const markSessionExpired = (row: MemorySessionRow, now: Date): boolean => {
    if (
      row.record.status === "active"
      && (Date.parse(row.record.idleExpiresAt) <= now.getTime()
        || Date.parse(row.record.absoluteExpiresAt) <= now.getTime())
    ) {
      replaceSessionRecord(row, { status: "expired", version: row.record.version + 1 });
      row.revokedAt = now.toISOString();
      row.revocationCode = "SESSION_EXPIRED";
      return true;
    }
    return row.record.status === "expired";
  };

  const revokeRow = (row: MemorySessionRow, reasonCode: string, now: Date): boolean => {
    if (row.record.status !== "active") {
      return false;
    }
    replaceSessionRecord(row, { status: "revoked", version: row.record.version + 1 });
    row.revokedAt = now.toISOString();
    row.revocationCode = reasonCode;
    return true;
  };

  const issueChallengeWithPolicy = async (
    input: IssueWalletAuthenticationChallengeInput,
  ): Promise<IssueWalletAuthenticationChallengeResult> => {
    const traceId = safeTraceId(input?.traceId);
    ensureOpen("issueChallenge", traceId);
    if (!isPlainRecord(input)) {
      return failStore("WALLET_AUTH_STORE_ARGUMENT_INVALID", "input", "issueChallenge", traceId);
    }
    const snapshot = copyWalletAuthenticationChallenge(input.challenge, "issueChallenge", traceId);
    if (snapshot.status !== "issued" || snapshot.verificationAttempts !== 0) {
      return failStore("WALLET_AUTH_STORE_ARGUMENT_INVALID", "challenge.status", "issueChallenge", traceId);
    }
    if (
      input.clientFingerprintDigest !== undefined
      && !isWalletAuthenticationDigest(input.clientFingerprintDigest)
    ) {
      return failStore(
        "WALLET_AUTH_STORE_ARGUMENT_INVALID",
        "clientFingerprintDigest",
        "issueChallenge",
        traceId,
      );
    }
    if (
      challenges.has(snapshot.id)
      || challengeByMessageDigest.has(snapshot.messageDigest)
      || challengeByNonceDigest.has(snapshot.nonceDigest)
    ) {
      return Object.freeze({ status: "conflict" });
    }

    const now = readClock(clock, "issueChallenge", traceId);
    if (Date.parse(snapshot.issuedAt) > now.getTime() || Date.parse(snapshot.expiresAt) <= now.getTime()) {
      return failStore("WALLET_AUTH_STORE_ARGUMENT_INVALID", "challenge.expiresAt", "issueChallenge", traceId);
    }
    const subjectKey = challengeSubjectKey(snapshot);
    const subjectChallengeIds = challengeIdsBySubject.get(subjectKey) ?? new Set<string>();
    let activeCount = 0;
    for (const id of subjectChallengeIds) {
      const row = challenges.get(id);
      if (row && !markChallengeExpired(row, now) && row.snapshot.status === "issued") {
        activeCount += 1;
      }
    }
    if (activeCount >= policy.maxActiveChallengesPerSubject) {
      return Object.freeze({
        retryAfterMs: Math.max(1, Date.parse(snapshot.expiresAt) - now.getTime()),
        status: "active_limit",
      });
    }

    if (input.clientFingerprintDigest) {
      const fingerprintIds = challengeIdsByFingerprint.get(input.clientFingerprintDigest)
        ?? new Set<string>();
      let activeFingerprintCount = 0;
      for (const id of fingerprintIds) {
        const row = challenges.get(id);
        if (row && !markChallengeExpired(row, now) && row.snapshot.status === "issued") {
          activeFingerprintCount += 1;
        }
      }
      if (activeFingerprintCount >= policy.maxActiveChallengesPerSubject) {
        return Object.freeze({
          retryAfterMs: Math.max(1, Date.parse(snapshot.expiresAt) - now.getTime()),
          status: "active_limit",
        });
      }
    }

    challenges.set(snapshot.id, {
      ...(input.clientFingerprintDigest
        ? { fingerprintDigest: input.clientFingerprintDigest }
        : {}),
      snapshot,
      subjectKey,
    });
    challengeByMessageDigest.set(snapshot.messageDigest, snapshot.id);
    challengeByNonceDigest.set(snapshot.nonceDigest, snapshot.id);
    subjectChallengeIds.add(snapshot.id);
    challengeIdsBySubject.set(subjectKey, subjectChallengeIds);
    if (input.clientFingerprintDigest) {
      const fingerprintIds = challengeIdsByFingerprint.get(input.clientFingerprintDigest)
        ?? new Set<string>();
      fingerprintIds.add(snapshot.id);
      challengeIdsByFingerprint.set(input.clientFingerprintDigest, fingerprintIds);
    }
    return Object.freeze({ challenge: copyWalletAuthenticationChallenge(snapshot), status: "issued" });
  };

  const issueChallenge: WalletAuthenticationStore["issueChallenge"] = async (challenge) => {
    const result = await issueChallengeWithPolicy({
      challenge,
      traceId: safeTraceId(challenge?.traceId),
    });
    if (result.status === "issued") {
      return result.challenge;
    }
    if (result.status === "conflict") {
      return failStore("WALLET_AUTH_STORE_CONFLICT", "challenge", "issueChallenge", challenge?.traceId);
    }
    return failStore(
      "WALLET_AUTH_STORE_RATE_LIMITED",
      "challenge",
      "issueChallenge",
      challenge?.traceId,
      true,
    );
  };

  const loadChallenge: WalletAuthenticationStore["loadChallenge"] = async (id) => {
    ensureOpen("loadChallenge");
    if (!isSafeId(id)) {
      return failStore("WALLET_AUTH_STORE_ARGUMENT_INVALID", "challengeId", "loadChallenge");
    }
    const row = challenges.get(id);
    if (!row) {
      return undefined;
    }
    markChallengeExpired(row, readClock(clock, "loadChallenge", row.snapshot.traceId));
    return copyWalletAuthenticationChallenge(row.snapshot);
  };

  const recordChallengeFailureWithPolicy = async (
    input: RecordWalletAuthenticationChallengeFailureInput,
  ): Promise<RecordWalletAuthenticationChallengeFailureResult> => {
    const traceId = safeTraceId(input?.traceId);
    ensureOpen("recordChallengeFailure", traceId);
    if (
      !isPlainRecord(input)
      || !isSafeId(input.challengeId)
      || typeof input.terminalCode !== "string"
      || !SAFE_CODE_PATTERN.test(input.terminalCode)
    ) {
      return failStore(
        "WALLET_AUTH_STORE_ARGUMENT_INVALID",
        "input",
        "recordChallengeFailure",
        traceId,
      );
    }
    const row = challenges.get(input.challengeId);
    if (!row) {
      return Object.freeze({ status: "not_found" });
    }
    const now = readClock(clock, "recordChallengeFailure", traceId);
    if (markChallengeExpired(row, now) || row.snapshot.status !== "issued") {
      return Object.freeze({ status: "terminal" });
    }

    const cutoff = now.getTime() - policy.verificationRateWindowMs;
    const subjectAttempts = (verificationAttemptsBySubject.get(row.subjectKey) ?? [])
      .filter((attempt) => attempt > cutoff);
    subjectAttempts.push(now.getTime());
    verificationAttemptsBySubject.set(row.subjectKey, subjectAttempts);
    const fingerprintAttempts = row.fingerprintDigest
      ? (verificationAttemptsByFingerprint.get(row.fingerprintDigest) ?? [])
        .filter((attempt) => attempt > cutoff)
      : [];
    if (row.fingerprintDigest) {
      fingerprintAttempts.push(now.getTime());
      verificationAttemptsByFingerprint.set(row.fingerprintDigest, fingerprintAttempts);
    }
    const nextAttempts = row.snapshot.verificationAttempts + 1;
    const rateLimited = subjectAttempts.length > policy.maxVerificationAttemptsPerWindow
      || fingerprintAttempts.length > policy.maxVerificationAttemptsPerWindow;
    const challengeLimited = nextAttempts >= policy.maxVerificationAttemptsPerChallenge;
    replaceChallengeSnapshot(row, rateLimited || challengeLimited ? "rejected" : "issued", nextAttempts);
    if (rateLimited || challengeLimited) {
      row.terminalAt = now.toISOString();
      row.terminalCode = rateLimited ? "RATE_LIMITED" : input.terminalCode;
    }
    if (rateLimited) {
      return Object.freeze({
        retryAfterMs: policy.verificationRateWindowMs,
        status: "rate_limited",
      });
    }
    return Object.freeze({ status: challengeLimited ? "terminal" : "recorded" });
  };

  const recordChallengeFailure: WalletAuthenticationStore["recordChallengeFailure"] = async (input) => {
    const result = await recordChallengeFailureWithPolicy(input);
    return Object.freeze({
      status: result.status === "rate_limited" ? "terminal" : result.status,
    });
  };

  const expireChallenges: WalletAuthenticationStore["expireChallenges"] = async (nowInput) => {
    ensureOpen("expireChallenges");
    const now = normalizeDate(nowInput, "now", "expireChallenges", DEFAULT_TRACE_ID);
    let expired = 0;
    for (const row of challenges.values()) {
      if (markChallengeExpired(row, now)) {
        expired += row.snapshot.status === "expired" && row.terminalAt === now.toISOString() ? 1 : 0;
      }
    }
    return expired;
  };

  const consumeChallengeAndCreateSession: WalletAuthenticationStore[
    "consumeChallengeAndCreateSession"
  ] = async (input) => {
    const traceId = safeTraceId(input?.traceId);
    ensureOpen("consumeChallenge", traceId);
    if (
      !isPlainRecord(input)
      || !isSafeId(input.challengeId)
      || input.expectedChallengeVersion !== "campaign-os-wallet-auth/v1"
    ) {
      return failStore("WALLET_AUTH_STORE_ARGUMENT_INVALID", "input", "consumeChallenge", traceId);
    }
    const candidate = copyDurableWalletSession(input.session, "consumeChallenge", traceId);
    if (candidate.challengeId !== input.challengeId) {
      return failStore(
        "WALLET_AUTH_STORE_ARGUMENT_INVALID",
        "session.challengeId",
        "consumeChallenge",
        traceId,
      );
    }
    const challengeRow = challenges.get(input.challengeId);
    if (!challengeRow) {
      return Object.freeze({ status: "not_found" });
    }
    const now = readClock(clock, "consumeChallenge", traceId);
    if (markChallengeExpired(challengeRow, now)) {
      return Object.freeze({ status: "expired" });
    }
    if (
      challengeRow.snapshot.status !== "issued"
      || challengeRow.snapshot.version !== input.expectedChallengeVersion
    ) {
      return Object.freeze({ status: "conflict" });
    }
    if (
      candidate.version !== 1
      || Date.parse(candidate.issuedAt) > now.getTime()
      || Date.parse(candidate.idleExpiresAt) <= now.getTime()
      || Date.parse(candidate.absoluteExpiresAt) <= now.getTime()
      || !sessionMatchesChallenge(challengeRow.snapshot, candidate)
    ) {
      return failStore(
        "WALLET_AUTH_STORE_ARGUMENT_INVALID",
        "session",
        "consumeChallenge",
        traceId,
      );
    }
    if (
      sessions.has(candidate.id)
      || sessionIdByCredentialDigest.has(candidate.credentialDigest)
      || sessionIdByCsrfDigest.has(candidate.csrfTokenDigest)
      || sessionIdByChallengeId.has(candidate.challengeId)
    ) {
      return Object.freeze({ status: "conflict" });
    }

    const subjectKey = walletAuthenticationSubjectKey(candidate.subject);
    const subjectSessionIds = sessionIdsBySubject.get(subjectKey) ?? new Set<string>();
    const activeRows = [...subjectSessionIds]
      .map((id) => sessions.get(id))
      .filter((row): row is MemorySessionRow => Boolean(row))
      .filter((row) => !markSessionExpired(row, now) && row.record.status === "active")
      .sort((left, right) => left.record.issuedAt.localeCompare(right.record.issuedAt)
        || left.record.id.localeCompare(right.record.id));
    if (activeRows.length >= policy.maxActiveSessionsPerSubject) {
      if (policy.sessionCapStrategy === "deny") {
        return Object.freeze({ status: "conflict" });
      }
      const revokeCount = activeRows.length - policy.maxActiveSessionsPerSubject + 1;
      for (const row of activeRows.slice(0, revokeCount)) {
        revokeRow(row, "SESSION_CAP_REPLACED", now);
      }
    }

    sessions.set(candidate.id, { record: candidate, subjectKey });
    sessionIdByCredentialDigest.set(candidate.credentialDigest, candidate.id);
    sessionIdByCsrfDigest.set(candidate.csrfTokenDigest, candidate.id);
    sessionIdByChallengeId.set(candidate.challengeId, candidate.id);
    subjectSessionIds.add(candidate.id);
    sessionIdsBySubject.set(subjectKey, subjectSessionIds);
    replaceChallengeSnapshot(challengeRow, "consumed");
    challengeRow.terminalAt = now.toISOString();
    challengeRow.terminalCode = "CHALLENGE_CONSUMED";
    return Object.freeze({ status: "created" });
  };

  const resolveActiveSession: WalletAuthenticationStore["resolveActiveSession"] = async (
    credentialDigest,
  ) => {
    ensureOpen("resolveSession");
    if (!isWalletAuthenticationDigest(credentialDigest)) {
      return failStore(
        "WALLET_AUTH_STORE_ARGUMENT_INVALID",
        "credentialDigest",
        "resolveSession",
      );
    }
    const sessionId = sessionIdByCredentialDigest.get(credentialDigest);
    const row = sessionId ? sessions.get(sessionId) : undefined;
    if (!row || row.record.credentialDigest !== credentialDigest) {
      return undefined;
    }
    if (markSessionExpired(row, readClock(clock, "resolveSession", DEFAULT_TRACE_ID))) {
      return undefined;
    }
    return row.record.status === "active"
      ? Object.freeze({
        ...row.record,
        capabilities: Object.freeze([...row.record.capabilities]),
        roleIds: Object.freeze([...row.record.roleIds]),
        subject: Object.freeze({ ...row.record.subject }),
      })
      : undefined;
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
      return failStore("WALLET_AUTH_STORE_ARGUMENT_INVALID", "input", "touchSession", traceId);
    }
    const now = normalizeDate(input.now, "now", "touchSession", traceId);
    const id = sessionIdByCredentialDigest.get(input.credentialDigest);
    const row = id ? sessions.get(id) : undefined;
    if (!row || row.record.status !== "active" || markSessionExpired(row, now)) {
      return Object.freeze({ status: "not_found" });
    }
    if (row.record.version !== input.version) {
      return Object.freeze({ status: "not_found" });
    }
    const elapsed = now.getTime() - Date.parse(row.record.lastSeenAt);
    if (elapsed < policy.touchIntervalMs) {
      return Object.freeze({ status: "throttled" });
    }
    const idleWindowMs = Date.parse(row.record.idleExpiresAt) - Date.parse(row.record.lastSeenAt);
    replaceSessionRecord(row, {
      idleExpiresAt: new Date(Math.min(
        now.getTime() + idleWindowMs,
        Date.parse(row.record.absoluteExpiresAt),
      )).toISOString(),
      lastSeenAt: now.toISOString(),
    });
    return Object.freeze({ status: "touched" });
  };

  const rotateSession: WalletAuthenticationStore["rotateSession"] = async (input) => {
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
      return failStore("WALLET_AUTH_STORE_ARGUMENT_INVALID", "input", "rotateSession", traceId);
    }
    const id = sessionIdByCredentialDigest.get(input.credentialDigest);
    const row = id ? sessions.get(id) : undefined;
    if (!row || row.record.status !== "active") {
      return Object.freeze({ status: "not_found" });
    }
    if (markSessionExpired(row, readClock(clock, "rotateSession", traceId))) {
      return Object.freeze({ status: "not_found" });
    }
    if (row.record.version !== input.version) {
      return Object.freeze({ status: "conflict" });
    }
    if (
      sessionIdByCredentialDigest.has(input.nextCredentialDigest)
      || sessionIdByCsrfDigest.has(input.nextCsrfTokenDigest)
    ) {
      return Object.freeze({ status: "conflict" });
    }
    sessionIdByCredentialDigest.delete(row.record.credentialDigest);
    sessionIdByCsrfDigest.delete(row.record.csrfTokenDigest);
    replaceSessionRecord(row, {
      credentialDigest: input.nextCredentialDigest,
      csrfTokenDigest: input.nextCsrfTokenDigest,
      version: row.record.version + 1,
    });
    sessionIdByCredentialDigest.set(row.record.credentialDigest, row.record.id);
    sessionIdByCsrfDigest.set(row.record.csrfTokenDigest, row.record.id);
    return Object.freeze({ status: "rotated" });
  };

  const revokeSession: WalletAuthenticationStore["revokeSession"] = async (input) => {
    const traceId = safeTraceId(input?.traceId);
    ensureOpen("revokeSession", traceId);
    if (
      !isPlainRecord(input)
      || !isSafeId(input.sessionId)
      || typeof input.reasonCode !== "string"
      || !SAFE_CODE_PATTERN.test(input.reasonCode)
    ) {
      return failStore("WALLET_AUTH_STORE_ARGUMENT_INVALID", "input", "revokeSession", traceId);
    }
    const row = sessions.get(input.sessionId);
    if (!row) {
      return Object.freeze({ status: "already_terminal" });
    }
    const now = readClock(clock, "revokeSession", traceId);
    if (markSessionExpired(row, now) || !revokeRow(row, input.reasonCode, now)) {
      return Object.freeze({ status: "already_terminal" });
    }
    return Object.freeze({ status: "revoked" });
  };

  const logoutSession: DurableWalletAuthenticationStore["logoutSession"] = async (input) => {
    const traceId = safeTraceId(input?.traceId);
    ensureOpen("revokeSession", traceId);
    if (!isPlainRecord(input) || !isWalletAuthenticationDigest(input.credentialDigest)) {
      return failStore(
        "WALLET_AUTH_STORE_ARGUMENT_INVALID",
        "credentialDigest",
        "revokeSession",
        traceId,
      );
    }
    const id = sessionIdByCredentialDigest.get(input.credentialDigest);
    if (!id) {
      return Object.freeze({ status: "already_terminal" });
    }
    return revokeSession({ reasonCode: "LOGOUT", sessionId: id, traceId });
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
      return failStore(
        "WALLET_AUTH_STORE_ARGUMENT_INVALID",
        "input",
        "revokeSubjectSessions",
        traceId,
      );
    }
    const now = readClock(clock, "revokeSubjectSessions", traceId);
    let count = 0;
    for (const id of sessionIdsBySubject.get(input.subjectKey) ?? []) {
      const row = sessions.get(id);
      if (row && revokeRow(row, input.reasonCode, now)) {
        count += 1;
      }
    }
    return count;
  };

  const expireSessions: WalletAuthenticationStore["expireSessions"] = async (nowInput) => {
    ensureOpen("expireSessions");
    const now = normalizeDate(nowInput, "now", "expireSessions", DEFAULT_TRACE_ID);
    let count = 0;
    for (const row of sessions.values()) {
      const wasActive = row.record.status === "active";
      if (wasActive && markSessionExpired(row, now)) {
        count += 1;
      }
    }
    return count;
  };

  const listActiveSessions: DurableWalletAuthenticationStore["listActiveSessions"] = async (
    input,
  ) => {
    const traceId = safeTraceId(input?.traceId);
    ensureOpen("listSessions", traceId);
    if (!isPlainRecord(input) || !isWalletAuthenticationDigest(input.subjectKey)) {
      return failStore("WALLET_AUTH_STORE_ARGUMENT_INVALID", "input", "listSessions", traceId);
    }
    const now = normalizeDate(input.now, "now", "listSessions", traceId);
    const projections: WalletAuthenticationSessionProjection[] = [];
    for (const id of sessionIdsBySubject.get(input.subjectKey) ?? []) {
      const row = sessions.get(id);
      if (row && !markSessionExpired(row, now) && row.record.status === "active") {
        projections.push(projectWalletAuthenticationSession(row.record));
      }
    }
    projections.sort((left, right) => left.issuedAt.localeCompare(right.issuedAt)
      || left.sessionId.localeCompare(right.sessionId));
    return Object.freeze(projections);
  };

  const assertActiveAuthorizationFence: DurableWalletAuthenticationStore[
    "assertActiveAuthorizationFence"
  ] = async (input) => {
    const traceId = safeTraceId(input?.traceId);
    ensureOpen("assertFence", traceId);
    if (
      !isPlainRecord(input)
      || !isWalletAuthenticationDigest(input.credentialDigest)
      || !isSafeId(input.sessionId)
      || !isSafeId(input.membershipRevision)
      || !Number.isSafeInteger(input.version)
      || input.version < 1
    ) {
      return failStore("WALLET_AUTH_STORE_ARGUMENT_INVALID", "input", "assertFence", traceId);
    }
    const now = normalizeDate(input.now, "now", "assertFence", traceId);
    const id = sessionIdByCredentialDigest.get(input.credentialDigest);
    const row = id ? sessions.get(id) : undefined;
    if (!row || row.record.status !== "active" || markSessionExpired(row, now)) {
      return Object.freeze({ status: "inactive" });
    }
    return Object.freeze({
      status: row.record.id === input.sessionId
        && row.record.version === input.version
        && row.record.membershipRevision === input.membershipRevision
        ? "active"
        : "stale",
    });
  };

  const close = (): Promise<void> => {
    if (closePromise) {
      return closePromise;
    }
    closed = true;
    closePromise = Promise.resolve();
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
    kind: "memory_test" as const,
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
