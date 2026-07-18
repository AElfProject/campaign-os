import { createHash, randomBytes as nodeRandomBytes } from "node:crypto";
import {
  isVerifiedWalletSubject,
  issueResolvedWalletSessionAuthority,
  projectVerifiedWalletSubjectForPersistence,
  restoreVerifiedWalletSubjectFromPersistence,
  type DurableWalletSessionRecord,
  type ResolvedWalletSessionAuthority,
  type VerifiedWalletSubject,
  type WalletAuthenticationChallengeSnapshot,
  type WalletAuthenticationClock,
  type WalletAuthenticationRandom,
  type WalletProofVerificationRequest,
} from "./walletAuthentication";
import type {
  WalletAuthenticationConfig,
  WalletVerifierBinding,
} from "./walletAuthenticationConfig";
import {
  WalletAuthenticationChallengeError,
  issueCanonicalWalletAuthenticationChallenge,
  verifyCanonicalWalletAuthenticationChallenge,
  type CanonicalWalletAuthenticationChallengeSnapshot,
  type WalletAuthenticationChallengeProjection,
} from "./walletAuthenticationChallenge";
import {
  projectWalletAuthenticationSession,
  walletAuthenticationSubjectKey,
  type DurableWalletAuthenticationStore,
  type WalletAuthenticationSessionProjection,
} from "./walletAuthenticationStore";
import type { WalletVerifierRegistry } from "./walletVerifierRegistry";

const DEFAULT_TRACE_ID = "wallet-auth-runtime";
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;
const SESSION_ID_RANDOM_BYTES = 32;
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const REQUEST_ID_PATTERN = /^war_[A-Za-z0-9_-]{43}$/;
const issuedFinalWriteCoordinators = new WeakSet<object>();

export type WalletAuthenticationRuntimeDiagnosticCode =
  | "WALLET_AUTH_RUNTIME_ABORTED"
  | "WALLET_AUTH_RUNTIME_CLEANUP_FAILED"
  | "WALLET_AUTH_RUNTIME_CONFIG_INVALID"
  | "WALLET_AUTH_RUNTIME_CONFLICT"
  | "WALLET_AUTH_RUNTIME_CSRF_REJECTED"
  | "WALLET_AUTH_RUNTIME_DISABLED"
  | "WALLET_AUTH_RUNTIME_FENCE_STALE"
  | "WALLET_AUTH_RUNTIME_INPUT_INVALID"
  | "WALLET_AUTH_RUNTIME_MEMBERSHIP_UNAVAILABLE"
  | "WALLET_AUTH_RUNTIME_ORIGIN_REJECTED"
  | "WALLET_AUTH_RUNTIME_PROOF_REJECTED"
  | "WALLET_AUTH_RUNTIME_PROOF_UNAVAILABLE"
  | "WALLET_AUTH_RUNTIME_RATE_LIMITED"
  | "WALLET_AUTH_RUNTIME_SESSION_UNAUTHORIZED"
  | "WALLET_AUTH_RUNTIME_SHUTDOWN_TIMEOUT"
  | "WALLET_AUTH_RUNTIME_STOPPED"
  | "WALLET_AUTH_RUNTIME_STORE_UNAVAILABLE";

export interface WalletAuthenticationRuntimeDiagnostic {
  readonly code: WalletAuthenticationRuntimeDiagnosticCode;
  readonly field: string;
  readonly retryable: boolean;
  readonly traceId: string;
}

export interface WalletAuthenticationCredentialMaterial {
  readonly credentialDigest: string;
  readonly csrfTokenDigest: string;
  dispose(): void;
  expose(): Readonly<{ credential: string; csrfToken: string }>;
}

export interface WalletAuthenticationCredentialPort {
  readonly kind: "session_credential";
  close(): void | Promise<void>;
  deriveCsrf(input: Readonly<{
    credentialDigest: string;
    sessionId: string;
    traceId: string;
    version: number;
  }>): Promise<Readonly<{ csrfToken: string; csrfTokenDigest: string }>>;
  digestCredential(credential: string, traceId: string): Promise<string>;
  issueSessionSecrets(input: Readonly<{
    sessionId: string;
    traceId: string;
    version: number;
  }>): Promise<WalletAuthenticationCredentialMaterial>;
  matchesDigest(left: string, right: string, traceId: string): boolean;
  verifyCsrf(input: Readonly<{
    credentialDigest: string;
    presentedToken: string;
    sessionId: string;
    traceId: string;
    version: number;
  }>): Promise<boolean>;
}

export type WalletAuthenticationCookieParseResult =
  | Readonly<{ credential: string; status: "accepted" }>
  | Readonly<{ status: "rejected" }>;

export type WalletAuthenticationCsrfHeaderResult =
  | Readonly<{ status: "accepted"; token: string }>
  | Readonly<{ status: "rejected" }>;

export interface WalletAuthenticationRequestSecurityPort {
  clearCookie(traceId: string): string;
  parseCredentialCookie(
    header: string | undefined,
    traceId: string,
  ): WalletAuthenticationCookieParseResult;
  readCsrfHeader(
    header: string | readonly string[] | undefined,
    traceId: string,
  ): WalletAuthenticationCsrfHeaderResult;
  requireOrigin(origin: string | undefined, traceId: string): boolean;
  serializeCredentialCookie(
    credential: string,
    maxAgeSeconds: number,
    traceId: string,
  ): string;
}

export type WalletAuthenticationMembershipResolution =
  | Readonly<{
    capabilities: readonly string[];
    membershipRevision: string;
    roleIds: readonly string[];
    status: "resolved";
  }>
  | Readonly<{ status: "revoked" | "unavailable" }>;

export interface WalletAuthenticationMembershipResolver {
  resolve(
    subject: VerifiedWalletSubject,
    signal?: AbortSignal,
  ): Promise<WalletAuthenticationMembershipResolution>;
}

export interface WalletAuthenticationRuntimeResource {
  readonly kind: string;
  close(): void | Promise<void>;
}

export type WalletAuthenticationFinalWriteCommitResult<TValue> =
  | Readonly<{ status: "committed"; value: TValue }>
  | Readonly<{ status: "stale" }>;

export interface WalletAuthenticationFinalWriteCommitInput<TValue> {
    credentialDigest: string;
    fence: WalletAuthenticationAuthorizationFence;
    now: Date;
    signal: AbortSignal;
    traceId: string;
    write: () => Promise<TValue> | TValue;
}

export interface WalletAuthenticationAtomicFinalWritePort {
  readonly kind: "wallet_auth_atomic_final_write";
  commitIfCurrent<TValue>(
    input: Readonly<WalletAuthenticationFinalWriteCommitInput<TValue>>,
  ): Promise<WalletAuthenticationFinalWriteCommitResult<TValue>>;
}

export interface WalletAuthenticationFinalWriteCoordinator {
  readonly kind: "wallet_auth_final_write";
  commit<TValue>(
    input: Readonly<WalletAuthenticationFinalWriteCommitInput<TValue>>,
  ): Promise<WalletAuthenticationFinalWriteCommitResult<TValue>>;
}

export const createWalletAuthenticationFinalWriteCoordinator = (
  atomicPort: WalletAuthenticationAtomicFinalWritePort,
): WalletAuthenticationFinalWriteCoordinator => {
  if (
    atomicPort === null
    || typeof atomicPort !== "object"
    || atomicPort.kind !== "wallet_auth_atomic_final_write"
    || typeof atomicPort.commitIfCurrent !== "function"
  ) {
    throw new TypeError("Invalid wallet authentication atomic final-write port.");
  }
  const coordinator: WalletAuthenticationFinalWriteCoordinator = Object.freeze({
    commit: async <TValue>(
      input: Readonly<WalletAuthenticationFinalWriteCommitInput<TValue>>,
    ): Promise<WalletAuthenticationFinalWriteCommitResult<TValue>> => {
      const result = await atomicPort.commitIfCurrent(input);
      if (result?.status === "stale") {
        return Object.freeze({ status: "stale" as const });
      }
      if (result?.status !== "committed" || !("value" in result)) {
        throw new TypeError("Invalid wallet authentication atomic final-write result.");
      }
      return Object.freeze({ status: "committed" as const, value: result.value });
    },
    kind: "wallet_auth_final_write" as const,
  });
  issuedFinalWriteCoordinators.add(coordinator);
  return coordinator;
};

export interface CreateWalletAuthenticationRuntimeOptions {
  readonly audience: string;
  readonly clock?: WalletAuthenticationClock;
  readonly config: WalletAuthenticationConfig;
  readonly credentialPort: WalletAuthenticationCredentialPort;
  readonly domain: string;
  readonly finalWriteCoordinator: WalletAuthenticationFinalWriteCoordinator;
  readonly membershipResolver: WalletAuthenticationMembershipResolver;
  readonly random?: WalletAuthenticationRandom;
  readonly requestSecurity: WalletAuthenticationRequestSecurityPort;
  readonly resources?: readonly WalletAuthenticationRuntimeResource[];
  readonly shutdownTimeoutMs?: number;
  readonly store: DurableWalletAuthenticationStore;
  readonly uri: string;
  readonly verifierRegistry: Pick<WalletVerifierRegistry, "verify">;
}

export interface IssueWalletAuthenticationRuntimeChallengeInput {
  readonly adapterId: string;
  readonly caHash?: string;
  readonly chainId: WalletVerifierBinding["chainIds"][number];
  readonly clientFingerprintDigest?: string;
  readonly network: WalletVerifierBinding["network"];
  readonly requestedWalletAddress: string;
  readonly signal?: AbortSignal;
  readonly traceId: string;
}

export type IssueWalletAuthenticationRuntimeChallengeResult =
  | Readonly<{ challenge: WalletAuthenticationChallengeProjection; status: "issued" }>
  | WalletAuthenticationRuntimeFailure;

export interface VerifyWalletAuthenticationRuntimeProofInput {
  readonly adapterProof?: Readonly<Record<string, unknown>>;
  readonly challengeId: string;
  readonly message: string;
  readonly nonce: string;
  readonly publicKey?: Uint8Array;
  readonly signal?: AbortSignal;
  readonly signature: Uint8Array;
  readonly traceId: string;
}

export interface WalletAuthenticationSessionResponse {
  readonly csrfToken: string;
  readonly session: WalletAuthenticationSessionProjection;
}

export interface WalletAuthenticationSessionDelivery {
  readonly response: WalletAuthenticationSessionResponse;
  readonly status: "authenticated" | "rotated";
  takeSetCookieHeader(): string;
}

export type VerifyWalletAuthenticationRuntimeProofResult =
  | WalletAuthenticationSessionDelivery
  | WalletAuthenticationRuntimeFailure;

export interface WalletAuthenticationSessionRequestInput {
  readonly cookieHeader?: string;
  readonly origin?: string;
  readonly signal?: AbortSignal;
  readonly traceId: string;
}

export interface WalletAuthenticationMutationRequestInput
  extends WalletAuthenticationSessionRequestInput {
  readonly csrfHeader?: string | readonly string[];
}

export type CurrentWalletAuthenticationSessionResult =
  | Readonly<{
    response: WalletAuthenticationSessionResponse;
    status: "active";
  }>
  | WalletAuthenticationRuntimeFailure;

export type RotateWalletAuthenticationRuntimeSessionResult =
  | (WalletAuthenticationSessionDelivery & Readonly<{ status: "rotated" }>)
  | WalletAuthenticationRuntimeFailure;

export interface WalletAuthenticationLogoutResult {
  readonly status: "already_terminal" | "logged_out";
  takeClearCookieHeader(): string;
}

export type WalletAuthenticationRuntimeLogoutResult =
  | WalletAuthenticationLogoutResult
  | WalletAuthenticationRuntimeFailure;

export interface WalletAuthenticationAuthorizationFence {
  readonly capabilityDigest: string;
  readonly membershipRevision: string;
  readonly sessionId: string;
  readonly subjectKey: string;
  readonly version: number;
}

export type ResolveWalletAuthenticationAuthorizationResult =
  | Readonly<{
    authority: ResolvedWalletSessionAuthority;
    fence: WalletAuthenticationAuthorizationFence;
    status: "authorized";
  }>
  | WalletAuthenticationRuntimeFailure;

export interface RevalidateWalletAuthenticationFenceInput<TValue> {
  readonly fence: WalletAuthenticationAuthorizationFence;
  readonly signal?: AbortSignal;
  readonly traceId: string;
  readonly write: (input: Readonly<{
    authority: ResolvedWalletSessionAuthority;
    signal: AbortSignal;
  }>) => Promise<TValue> | TValue;
}

export type RevalidateWalletAuthenticationFenceResult<TValue> =
  | Readonly<{ status: "committed"; value: TValue }>
  | Readonly<{ diagnostic: WalletAuthenticationRuntimeDiagnostic; status: "failed" | "stale" }>;

export interface WalletAuthenticationRuntimeStopResult {
  readonly diagnosticCodes: readonly WalletAuthenticationRuntimeDiagnosticCode[];
  readonly diagnostics: readonly WalletAuthenticationRuntimeDiagnostic[];
  readonly status: "cleanup_failed" | "drained" | "timed_out";
}

export interface WalletAuthenticationRuntimeState {
  readonly accepting: boolean;
  readonly activeOperationCount: number;
  readonly controllerCount: number;
}

export interface WalletAuthenticationRuntimeFailure {
  readonly diagnostic: WalletAuthenticationRuntimeDiagnostic;
  readonly status: "blocked" | "conflict" | "forbidden" | "rate_limited" | "rejected" | "unauthorized" | "unavailable";
}

interface ResolvedRuntimeSession {
  readonly authority: ResolvedWalletSessionAuthority;
  readonly credentialDigest: string;
  readonly csrfToken: string;
  readonly record: DurableWalletSessionRecord;
}

interface FencePrivateState {
  readonly credentialDigest: string;
}

type RuntimeOperation = "current" | "fence" | "issue" | "logout" | "revoke" | "rotate" | "verify";

const safeTraceId = (value: unknown): string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= 128
  && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
    ? value
    : DEFAULT_TRACE_ID;

const diagnostic = (
  code: WalletAuthenticationRuntimeDiagnosticCode,
  field: string,
  traceId: string,
  retryable = false,
): WalletAuthenticationRuntimeDiagnostic => Object.freeze({
  code,
  field: SAFE_ID_PATTERN.test(field) ? field : "runtime",
  retryable,
  traceId: safeTraceId(traceId),
});

const failure = (
  status: WalletAuthenticationRuntimeFailure["status"],
  code: WalletAuthenticationRuntimeDiagnosticCode,
  field: string,
  traceId: string,
  retryable = false,
): WalletAuthenticationRuntimeFailure => Object.freeze({
  diagnostic: diagnostic(code, field, traceId, retryable),
  status,
});

const stopped = (traceId: string): WalletAuthenticationRuntimeFailure => failure(
  "blocked",
  "WALLET_AUTH_RUNTIME_STOPPED",
  "runtime",
  traceId,
);

const aborted = (traceId: string): WalletAuthenticationRuntimeFailure => failure(
  "unavailable",
  "WALLET_AUTH_RUNTIME_ABORTED",
  "signal",
  traceId,
  true,
);

const safeId = (value: unknown, maximum = 160): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= maximum
  && SAFE_ID_PATTERN.test(value);

const safeDigest = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

const safeIds = (values: readonly string[]): readonly string[] | undefined => {
  if (
    !Array.isArray(values)
    || values.length === 0
    || values.length > 64
    || new Set(values).size !== values.length
    || values.some((value) => !safeId(value, 128))
  ) {
    return undefined;
  }
  return Object.freeze([...values]);
};

const INVALID_PLAIN_DATA: unique symbol = Symbol("invalid-wallet-auth-plain-data");
const ADAPTER_PROOF_MAX_DEPTH = 4;
const ADAPTER_PROOF_MAX_ENTRIES = 128;
const ADAPTER_PROOF_MAX_KEYS_PER_OBJECT = 32;

const isPlainRecord = (value: unknown): value is Readonly<Record<string, unknown>> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
};

const copyAdapterProofValue = (
  value: unknown,
  budget: { bytes: number; entries: number },
  depth: number,
): unknown | typeof INVALID_PLAIN_DATA => {
  if (depth > ADAPTER_PROOF_MAX_DEPTH || budget.entries >= ADAPTER_PROOF_MAX_ENTRIES) {
    return INVALID_PLAIN_DATA;
  }
  budget.entries += 1;

  if (value === null || typeof value === "boolean") {
    budget.bytes -= 1;
    return budget.bytes >= 0 ? value : INVALID_PLAIN_DATA;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return INVALID_PLAIN_DATA;
    }
    budget.bytes -= 8;
    return budget.bytes >= 0 ? value : INVALID_PLAIN_DATA;
  }
  if (typeof value === "string") {
    budget.bytes -= Buffer.byteLength(value, "utf8");
    return budget.bytes >= 0 ? value : INVALID_PLAIN_DATA;
  }
  if (Array.isArray(value)) {
    if (value.length > ADAPTER_PROOF_MAX_ENTRIES) {
      return INVALID_PLAIN_DATA;
    }
    const copied: unknown[] = [];
    for (const entry of value) {
      const safeEntry = copyAdapterProofValue(entry, budget, depth + 1);
      if (safeEntry === INVALID_PLAIN_DATA) {
        return INVALID_PLAIN_DATA;
      }
      copied.push(safeEntry);
    }
    return Object.freeze(copied);
  }
  if (!isPlainRecord(value)) {
    return INVALID_PLAIN_DATA;
  }

  let keys: readonly (string | symbol)[];
  try {
    keys = Reflect.ownKeys(value);
  } catch {
    return INVALID_PLAIN_DATA;
  }
  if (
    keys.length > ADAPTER_PROOF_MAX_KEYS_PER_OBJECT
    || keys.some((key) => typeof key !== "string"
      || key.length === 0
      || key.length > 64
      || key === "__proto__"
      || key === "constructor"
      || key === "prototype"
      || !/^[A-Za-z][A-Za-z0-9_.-]*$/.test(key))
  ) {
    return INVALID_PLAIN_DATA;
  }

  const copied: Record<string, unknown> = {};
  for (const key of keys as readonly string[]) {
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch {
      return INVALID_PLAIN_DATA;
    }
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      return INVALID_PLAIN_DATA;
    }
    budget.bytes -= Buffer.byteLength(key, "utf8");
    if (budget.bytes < 0) {
      return INVALID_PLAIN_DATA;
    }
    const safeValue = copyAdapterProofValue(descriptor.value, budget, depth + 1);
    if (safeValue === INVALID_PLAIN_DATA) {
      return INVALID_PLAIN_DATA;
    }
    Object.defineProperty(copied, key, {
      configurable: false,
      enumerable: true,
      value: safeValue,
      writable: false,
    });
  }
  return Object.freeze(copied);
};

const captureAdapterProof = (
  value: unknown,
  maximumBytes: number,
): Readonly<Record<string, unknown>> | undefined | typeof INVALID_PLAIN_DATA => {
  if (value === undefined) {
    return undefined;
  }
  if (!isPlainRecord(value) || !Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
    return INVALID_PLAIN_DATA;
  }
  const copied = copyAdapterProofValue(value, {
    bytes: Math.min(maximumBytes, 16_384),
    entries: 0,
  }, 0);
  return copied === INVALID_PLAIN_DATA || !isPlainRecord(copied)
    ? INVALID_PLAIN_DATA
    : copied;
};

const defaultClock: WalletAuthenticationClock = Object.freeze({ now: () => new Date() });
const defaultRandom: WalletAuthenticationRandom = Object.freeze({
  randomBytes: (size: number) => Uint8Array.from(nodeRandomBytes(size)),
});

const readClock = (clock: WalletAuthenticationClock): Date | undefined => {
  try {
    const value = clock.now();
    return value instanceof Date && Number.isFinite(value.getTime())
      ? new Date(value)
      : undefined;
  } catch {
    return undefined;
  }
};

const readSessionId = (random: WalletAuthenticationRandom): string | undefined => {
  try {
    const value = random.randomBytes(SESSION_ID_RANDOM_BYTES);
    if (
      !(value instanceof Uint8Array)
      || value.byteLength !== SESSION_ID_RANDOM_BYTES
      || value.every((byte) => byte === 0)
    ) {
      return undefined;
    }
    return `was_${Buffer.from(value).toString("base64url")}`;
  } catch {
    return undefined;
  }
};

const normalizeShutdownTimeout = (value: number | undefined): number =>
  Number.isSafeInteger(value) && Number(value) >= 1 && Number(value) <= 10_000
    ? Number(value)
    : DEFAULT_SHUTDOWN_TIMEOUT_MS;

const settleWithin = async <TValue>(
  promise: Promise<TValue>,
  timeoutMs: number,
): Promise<Readonly<{ status: "settled"; value: TValue }> | Readonly<{ status: "timed_out" }>> => {
  if (timeoutMs <= 0) {
    void promise.catch(() => undefined);
    return Object.freeze({ status: "timed_out" });
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise.then((value) => Object.freeze({ status: "settled" as const, value })),
      new Promise<Readonly<{ status: "timed_out" }>>((resolve) => {
        timer = setTimeout(() => resolve(Object.freeze({ status: "timed_out" })), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const storeChallenge = (
  snapshot: CanonicalWalletAuthenticationChallengeSnapshot,
): WalletAuthenticationChallengeSnapshot => Object.freeze({
  adapterId: snapshot.adapterId,
  ...(snapshot.caHash === undefined ? {} : { caHash: snapshot.caHash }),
  chainId: snapshot.chainId,
  expiresAt: snapshot.expiresAt,
  id: snapshot.id,
  issuedAt: snapshot.issuedAt,
  messageDigest: snapshot.messageDigest,
  network: snapshot.network,
  nonceDigest: snapshot.nonceDigest,
  requestedWalletAddress: snapshot.requestedWalletAddress,
  status: snapshot.status,
  traceId: snapshot.traceId,
  verificationAttempts: snapshot.verificationAttempts,
  version: snapshot.version,
});

const restoreCanonicalChallenge = (
  snapshot: WalletAuthenticationChallengeSnapshot,
  message: string,
  context: Readonly<{ audience: string; domain: string; uri: string }>,
): CanonicalWalletAuthenticationChallengeSnapshot | undefined => {
  if (typeof message !== "string" || message.includes("\r")) {
    return undefined;
  }
  const lines = message.split("\n");
  if (lines.length !== 14 || !lines[13]?.startsWith("Request ID: ")) {
    return undefined;
  }
  const requestId = lines[13].slice("Request ID: ".length);
  if (!REQUEST_ID_PATTERN.test(requestId)) {
    return undefined;
  }
  return Object.freeze({
    ...snapshot,
    audience: context.audience,
    domain: context.domain,
    requestId,
    uri: context.uri,
  });
};

const capabilityDigest = (values: readonly string[]): string => createHash("sha256")
  .update(["campaign-os-wallet-auth-capabilities/v1", ...[...values].sort()].join("\n"), "utf8")
  .digest("hex");

const safeProjection = (
  record: DurableWalletSessionRecord,
  roleIds: readonly string[],
  capabilities: readonly string[],
): WalletAuthenticationSessionProjection => Object.freeze({
  ...projectWalletAuthenticationSession(record),
  capabilities: Object.freeze([...capabilities]),
  roleIds: Object.freeze([...roleIds]),
});

const sessionDelivery = (
  status: WalletAuthenticationSessionDelivery["status"],
  response: WalletAuthenticationSessionResponse,
  setCookieHeader: string,
): WalletAuthenticationSessionDelivery => {
  let pendingHeader: string | undefined = setCookieHeader;
  return Object.freeze({
    response: Object.freeze({
      csrfToken: response.csrfToken,
      session: response.session,
    }),
    status,
    takeSetCookieHeader: () => {
      if (pendingHeader === undefined) {
        throw new Error("Wallet session cookie delivery is no longer available.");
      }
      const delivered = pendingHeader;
      pendingHeader = undefined;
      return delivered;
    },
  });
};

const logoutDelivery = (
  status: WalletAuthenticationLogoutResult["status"],
  clearCookieHeader: string,
): WalletAuthenticationLogoutResult => {
  let pendingHeader: string | undefined = clearCookieHeader;
  return Object.freeze({
    status,
    takeClearCookieHeader: () => {
      if (pendingHeader === undefined) {
        throw new Error("Wallet session cookie cleanup is no longer available.");
      }
      const delivered = pendingHeader;
      pendingHeader = undefined;
      return delivered;
    },
  });
};

const publicFailureFromProof = (
  status: "rejected" | "unavailable",
  traceId: string,
): WalletAuthenticationRuntimeFailure => status === "rejected"
  ? failure("rejected", "WALLET_AUTH_RUNTIME_PROOF_REJECTED", "proof", traceId)
  : failure("unavailable", "WALLET_AUTH_RUNTIME_PROOF_UNAVAILABLE", "verifier", traceId, true);

export class WalletAuthenticationRuntime {
  private readonly activeOperations = new Set<Promise<unknown>>();
  private readonly audience: string;
  private readonly clock: WalletAuthenticationClock;
  private readonly config: WalletAuthenticationConfig;
  private readonly controllers = new Set<AbortController>();
  private readonly credentialPort: WalletAuthenticationCredentialPort;
  private readonly domain: string;
  private readonly finalWriteCoordinator: WalletAuthenticationFinalWriteCoordinator;
  private readonly fenceState = new WeakMap<object, FencePrivateState>();
  private readonly membershipResolver: WalletAuthenticationMembershipResolver;
  private readonly operationListenerCleanup = new Map<AbortController, () => void>();
  private readonly random: WalletAuthenticationRandom;
  private readonly requestSecurity: WalletAuthenticationRequestSecurityPort;
  private readonly resources: readonly WalletAuthenticationRuntimeResource[];
  private readonly shutdownTimeoutMs: number;
  private readonly store: DurableWalletAuthenticationStore;
  private readonly uri: string;
  private readonly verifierRegistry: Pick<WalletVerifierRegistry, "verify">;
  private accepting = true;
  private stopPromise?: Promise<WalletAuthenticationRuntimeStopResult>;

  constructor(options: CreateWalletAuthenticationRuntimeOptions) {
    this.audience = options.audience;
    this.clock = options.clock ?? defaultClock;
    this.config = options.config;
    this.credentialPort = options.credentialPort;
    this.domain = options.domain;
    this.finalWriteCoordinator = options.finalWriteCoordinator;
    this.membershipResolver = options.membershipResolver;
    this.random = options.random ?? defaultRandom;
    this.requestSecurity = options.requestSecurity;
    this.resources = Object.freeze([...(options.resources ?? [])]);
    this.shutdownTimeoutMs = normalizeShutdownTimeout(
      options.shutdownTimeoutMs ?? options.config?.limits?.shutdownTimeoutMs,
    );
    this.store = options.store;
    this.uri = options.uri;
    this.verifierRegistry = options.verifierRegistry;
  }

  issueChallenge(
    input: IssueWalletAuthenticationRuntimeChallengeInput,
  ): Promise<IssueWalletAuthenticationRuntimeChallengeResult> {
    let externalSignal: AbortSignal | undefined;
    let traceId: string;
    try {
      traceId = safeTraceId(input?.traceId);
      externalSignal = input?.signal;
      if (externalSignal !== undefined && !(externalSignal instanceof AbortSignal)) {
        return Promise.resolve(failure(
          "rejected",
          "WALLET_AUTH_RUNTIME_INPUT_INVALID",
          "signal",
          traceId,
        ));
      }
    } catch {
      return Promise.resolve(failure(
        "rejected",
        "WALLET_AUTH_RUNTIME_INPUT_INVALID",
        "challenge",
        DEFAULT_TRACE_ID,
      ));
    }
    return this.runOperation("issue", traceId, externalSignal, async (signal) => {
      if (signal.aborted) {
        return aborted(traceId);
      }
      let adapterId: unknown;
      let caHash: unknown;
      let chainId: unknown;
      let clientFingerprintDigest: unknown;
      let network: unknown;
      let requestedWalletAddress: unknown;
      try {
        adapterId = input?.adapterId;
        caHash = input?.caHash;
        chainId = input?.chainId;
        clientFingerprintDigest = input?.clientFingerprintDigest;
        network = input?.network;
        requestedWalletAddress = input?.requestedWalletAddress;
      } catch {
        return failure("rejected", "WALLET_AUTH_RUNTIME_INPUT_INVALID", "challenge", traceId);
      }
      const preflight = this.bindingPreflight(adapterId, traceId);
      if ("diagnostic" in preflight) {
        return preflight;
      }
      const selected = preflight.binding;
      if (
        network !== selected.network
        || typeof chainId !== "string"
        || !selected.chainIds.some((candidate) => candidate === chainId)
        || typeof requestedWalletAddress !== "string"
        || requestedWalletAddress.length === 0
        || Buffer.byteLength(requestedWalletAddress, "utf8") > this.config.limits.challengeRequestMaxBytes
        || (selected.accountType === "EOA" && caHash !== undefined)
        || (selected.accountType === "AA" && !safeDigest(caHash))
        || (clientFingerprintDigest !== undefined && !safeDigest(clientFingerprintDigest))
      ) {
        return failure("rejected", "WALLET_AUTH_RUNTIME_INPUT_INVALID", "challenge", traceId);
      }

      let issued;
      try {
        issued = issueCanonicalWalletAuthenticationChallenge({
          audience: this.audience,
          binding: selected,
          ...(typeof caHash === "string" ? { caHash } : {}),
          chainId: chainId as WalletVerifierBinding["chainIds"][number],
          clock: this.clock,
          domain: this.domain,
          random: this.random,
          requestedWalletAddress,
          traceId,
          ttlSeconds: this.config.limits.challengeTtlSeconds,
          uri: this.uri,
        });
      } catch (error) {
        return error instanceof WalletAuthenticationChallengeError
          && error.code === "WALLET_AUTH_CHALLENGE_INPUT_INVALID"
          ? failure("rejected", "WALLET_AUTH_RUNTIME_INPUT_INVALID", "challenge", traceId)
          : failure("unavailable", "WALLET_AUTH_RUNTIME_CONFIG_INVALID", "challenge", traceId);
      }
      try {
        const stored = await this.store.issueChallengeWithPolicy({
          challenge: storeChallenge(issued.snapshot),
          ...(typeof clientFingerprintDigest !== "string"
            ? {}
            : { clientFingerprintDigest }),
          traceId,
        });
        if (stored.status === "issued") {
          if (signal.aborted) {
            const recordingFailure = await this.recordChallengeFailure(
              issued.snapshot.id,
              "RUNTIME_STOPPED",
              traceId,
            );
            return recordingFailure ?? aborted(traceId);
          }
          return Object.freeze({ challenge: issued.projection, status: "issued" as const });
        }
        if (stored.status === "rate_limited" || stored.status === "active_limit") {
          return failure(
            "rate_limited",
            "WALLET_AUTH_RUNTIME_RATE_LIMITED",
            "challenge",
            traceId,
            true,
          );
        }
        return failure("conflict", "WALLET_AUTH_RUNTIME_CONFLICT", "challenge", traceId);
      } catch {
        return failure("unavailable", "WALLET_AUTH_RUNTIME_STORE_UNAVAILABLE", "challenge", traceId, true);
      }
    });
  }

  verifyProof(
    input: VerifyWalletAuthenticationRuntimeProofInput,
  ): Promise<VerifyWalletAuthenticationRuntimeProofResult> {
    let externalSignal: AbortSignal | undefined;
    let traceId: string;
    try {
      traceId = safeTraceId(input?.traceId);
      externalSignal = input?.signal;
      if (externalSignal !== undefined && !(externalSignal instanceof AbortSignal)) {
        return Promise.resolve(failure(
          "rejected",
          "WALLET_AUTH_RUNTIME_INPUT_INVALID",
          "signal",
          traceId,
        ));
      }
    } catch {
      return Promise.resolve(failure(
        "rejected",
        "WALLET_AUTH_RUNTIME_INPUT_INVALID",
        "proof",
        DEFAULT_TRACE_ID,
      ));
    }
    return this.runOperation("verify", traceId, externalSignal, async (signal) => {
      if (signal.aborted) {
        return aborted(traceId);
      }
      const activationFailure = this.runtimePreflight(traceId);
      if (activationFailure) {
        return activationFailure;
      }
      let challengeId: unknown;
      let message: unknown;
      let nonce: unknown;
      let signature: unknown;
      let publicKey: unknown;
      let adapterProofInput: unknown;
      try {
        challengeId = input?.challengeId;
        message = input?.message;
        nonce = input?.nonce;
        signature = input?.signature;
        publicKey = input?.publicKey;
        adapterProofInput = input?.adapterProof;
      } catch {
        return failure("rejected", "WALLET_AUTH_RUNTIME_INPUT_INVALID", "proof", traceId);
      }
      const adapterProof = captureAdapterProof(
        adapterProofInput,
        this.config.limits.proofMaxBytes,
      );
      if (
        !safeId(challengeId)
        || typeof message !== "string"
        || Buffer.byteLength(message, "utf8") > this.config.limits.challengeRequestMaxBytes
        || typeof nonce !== "string"
        || Buffer.byteLength(nonce, "utf8") > this.config.limits.challengeRequestMaxBytes
        || !(signature instanceof Uint8Array)
        || signature.byteLength === 0
        || signature.byteLength > this.config.limits.proofMaxBytes
        || (publicKey !== undefined && (!(publicKey instanceof Uint8Array)
          || publicKey.byteLength === 0
          || publicKey.byteLength > this.config.limits.proofMaxBytes))
        || adapterProof === INVALID_PLAIN_DATA
      ) {
        return failure("rejected", "WALLET_AUTH_RUNTIME_INPUT_INVALID", "proof", traceId);
      }

      let snapshot: WalletAuthenticationChallengeSnapshot | undefined;
      try {
        snapshot = await this.store.loadChallenge(challengeId);
      } catch {
        return failure("unavailable", "WALLET_AUTH_RUNTIME_STORE_UNAVAILABLE", "challenge", traceId, true);
      }
      if (!snapshot || snapshot.status !== "issued") {
        return failure("rejected", "WALLET_AUTH_RUNTIME_PROOF_REJECTED", "challenge", traceId);
      }
      const preflight = this.bindingPreflight(snapshot.adapterId, traceId);
      if ("diagnostic" in preflight) {
        return preflight;
      }
      const canonical = restoreCanonicalChallenge(snapshot, message, {
        audience: this.audience,
        domain: this.domain,
        uri: this.uri,
      });
      if (!canonical) {
        const recordingFailure = await this.recordProofFailure(snapshot.id, traceId);
        if (recordingFailure) {
          return recordingFailure;
        }
        return publicFailureFromProof("rejected", traceId);
      }
      const canonicalResult = verifyCanonicalWalletAuthenticationChallenge({
        clock: this.clock,
        clockSkewSeconds: this.config.limits.clockSkewSeconds,
        message,
        nonce,
        snapshot: canonical,
        traceId,
      });
      if (canonicalResult.status !== "verified") {
        const recordingFailure = await this.recordProofFailure(snapshot.id, traceId);
        if (recordingFailure) {
          return recordingFailure;
        }
        return publicFailureFromProof("rejected", traceId);
      }

      const verificationRequest: WalletProofVerificationRequest = Object.freeze({
        ...(adapterProof === undefined ? {} : { adapterProof }),
        challenge: canonicalResult.challenge,
        ...(publicKey === undefined ? {} : { publicKey: Uint8Array.from(publicKey) }),
        signature: Uint8Array.from(signature),
        traceId,
      });
      let proof;
      try {
        proof = await this.verifierRegistry.verify({
          binding: preflight.binding,
          environment: this.config.environment,
          request: verificationRequest,
        }, signal);
      } catch {
        return publicFailureFromProof("unavailable", traceId);
      }
      if (
        proof === null
        || typeof proof !== "object"
        || (proof.status !== "verified" && proof.status !== "rejected" && proof.status !== "unavailable")
        || (proof.status === "verified" && !isVerifiedWalletSubject(proof.subject))
      ) {
        return publicFailureFromProof("unavailable", traceId);
      }
      if (proof.status !== "verified") {
        if (proof.status === "rejected") {
          const recordingFailure = await this.recordProofFailure(snapshot.id, traceId);
          if (recordingFailure) {
            return recordingFailure;
          }
        }
        return publicFailureFromProof(proof.status, traceId);
      }
      if (signal.aborted) {
        return aborted(traceId);
      }

      const membership = await this.resolveMembership(proof.subject, signal, traceId);
      if ("diagnostic" in membership) {
        return membership;
      }
      const now = readClock(this.clock);
      const sessionId = readSessionId(this.random);
      if (!now || !sessionId) {
        return failure("unavailable", "WALLET_AUTH_RUNTIME_CONFIG_INVALID", "random", traceId);
      }
      let material: WalletAuthenticationCredentialMaterial | undefined;
      let sessionCreated = false;
      try {
        material = await this.credentialPort.issueSessionSecrets({
          sessionId,
          traceId,
          version: 1,
        });
        if (!safeDigest(material.credentialDigest) || !safeDigest(material.csrfTokenDigest)) {
          material.dispose();
          return failure("unavailable", "WALLET_AUTH_RUNTIME_CONFIG_INVALID", "credential", traceId);
        }
        const finalMembership = await this.resolveMembership(proof.subject, signal, traceId);
        if ("diagnostic" in finalMembership) {
          material.dispose();
          return finalMembership;
        }
        if (finalMembership.membershipRevision !== membership.membershipRevision) {
          material.dispose();
          return failure(
            "unauthorized",
            "WALLET_AUTH_RUNTIME_SESSION_UNAUTHORIZED",
            "membership",
            traceId,
          );
        }
        const record: DurableWalletSessionRecord = Object.freeze({
          absoluteExpiresAt: new Date(
            now.getTime() + this.config.limits.absoluteTtlSeconds * 1_000,
          ).toISOString(),
          capabilities: finalMembership.capabilities,
          challengeId: snapshot.id,
          credentialBoundary: "wallet-auth-cookie/v1",
          credentialDigest: material.credentialDigest,
          csrfTokenDigest: material.csrfTokenDigest,
          id: sessionId,
          idleExpiresAt: new Date(
            now.getTime() + this.config.limits.idleTtlSeconds * 1_000,
          ).toISOString(),
          issuedAt: now.toISOString(),
          lastSeenAt: now.toISOString(),
          membershipRevision: finalMembership.membershipRevision,
          roleIds: finalMembership.roleIds,
          status: "active",
          subject: projectVerifiedWalletSubjectForPersistence(proof.subject),
          version: 1,
        });
        const consumed = await this.store.consumeChallengeAndCreateSession({
          challengeId: snapshot.id,
          expectedChallengeVersion: snapshot.version,
          session: record,
          traceId,
        });
        if (consumed.status !== "created") {
          material.dispose();
          return consumed.status === "conflict"
            ? failure("conflict", "WALLET_AUTH_RUNTIME_CONFLICT", "challenge", traceId)
            : failure("rejected", "WALLET_AUTH_RUNTIME_PROOF_REJECTED", "challenge", traceId);
        }
        sessionCreated = true;
        if (signal.aborted) {
          material.dispose();
          const cleanupFailed = await this.cleanupFailedDelivery(sessionId, traceId);
          return cleanupFailed ?? aborted(traceId);
        }
        const exposed = material.expose();
        const response = Object.freeze({
          csrfToken: exposed.csrfToken,
          session: safeProjection(
            record,
            finalMembership.roleIds,
            finalMembership.capabilities,
          ),
        });
        const cookie = this.requestSecurity.serializeCredentialCookie(
          exposed.credential,
          this.config.limits.absoluteTtlSeconds,
          traceId,
        );
        material.dispose();
        return sessionDelivery("authenticated", response, cookie);
      } catch {
        material?.dispose();
        if (sessionCreated) {
          const cleanupFailed = await this.cleanupFailedDelivery(sessionId, traceId);
          if (cleanupFailed) {
            return cleanupFailed;
          }
        }
        return failure("unavailable", "WALLET_AUTH_RUNTIME_STORE_UNAVAILABLE", "session", traceId, true);
      }
    });
  }

  currentSession(
    input: WalletAuthenticationSessionRequestInput,
  ): Promise<CurrentWalletAuthenticationSessionResult> {
    const traceId = safeTraceId(input?.traceId);
    return this.runOperation("current", traceId, input?.signal, async (signal) => {
      const resolved = await this.resolveRequestSession(input, signal, false);
      if ("diagnostic" in resolved) {
        return resolved;
      }
      try {
        const now = readClock(this.clock);
        if (!now) {
          return failure("unavailable", "WALLET_AUTH_RUNTIME_CONFIG_INVALID", "clock", traceId);
        }
        const touch = await this.store.touchSession({
          credentialDigest: resolved.credentialDigest,
          now,
          traceId,
          version: resolved.record.version,
        });
        if (touch.status === "not_found") {
          return failure("unauthorized", "WALLET_AUTH_RUNTIME_SESSION_UNAUTHORIZED", "session", traceId);
        }
        let record = resolved.record;
        if (touch.status === "touched") {
          const touchedRecord = await this.store.resolveActiveSession(resolved.credentialDigest);
          if (!touchedRecord) {
            return failure("unauthorized", "WALLET_AUTH_RUNTIME_SESSION_UNAUTHORIZED", "session", traceId);
          }
          record = touchedRecord;
        }
        return Object.freeze({
          response: Object.freeze({
            csrfToken: resolved.csrfToken,
            session: safeProjection(record, resolved.authority.roleIds, resolved.authority.capabilities),
          }),
          status: "active" as const,
        });
      } catch {
        return failure("unavailable", "WALLET_AUTH_RUNTIME_STORE_UNAVAILABLE", "session", traceId, true);
      }
    });
  }

  rotateSession(
    input: WalletAuthenticationMutationRequestInput,
  ): Promise<RotateWalletAuthenticationRuntimeSessionResult> {
    const traceId = safeTraceId(input?.traceId);
    return this.runOperation("rotate", traceId, input?.signal, async (signal) => {
      const resolved = await this.resolveRequestSession(input, signal, true);
      if ("diagnostic" in resolved) {
        return resolved;
      }
      let material: WalletAuthenticationCredentialMaterial | undefined;
      let sessionRotated = false;
      try {
        material = await this.credentialPort.issueSessionSecrets({
          sessionId: resolved.record.id,
          traceId,
          version: resolved.record.version + 1,
        });
        if (!safeDigest(material.credentialDigest) || !safeDigest(material.csrfTokenDigest)) {
          material.dispose();
          return failure("unavailable", "WALLET_AUTH_RUNTIME_CONFIG_INVALID", "credential", traceId);
        }
        const subject = restoreVerifiedWalletSubjectFromPersistence(resolved.record.subject);
        const membership = await this.resolveMembership(subject, signal, traceId);
        if ("diagnostic" in membership) {
          material.dispose();
          return membership;
        }
        if (membership.membershipRevision !== resolved.record.membershipRevision) {
          material.dispose();
          return failure(
            "unauthorized",
            "WALLET_AUTH_RUNTIME_SESSION_UNAUTHORIZED",
            "membership",
            traceId,
          );
        }
        const rotated = await this.store.rotateSession({
          credentialDigest: resolved.credentialDigest,
          nextCredentialDigest: material.credentialDigest,
          nextCsrfTokenDigest: material.csrfTokenDigest,
          traceId,
          version: resolved.record.version,
        });
        if (rotated.status !== "rotated") {
          material.dispose();
          return failure(
            rotated.status === "conflict" ? "conflict" : "unauthorized",
            rotated.status === "conflict"
              ? "WALLET_AUTH_RUNTIME_CONFLICT"
              : "WALLET_AUTH_RUNTIME_SESSION_UNAUTHORIZED",
            "session",
            traceId,
          );
        }
        sessionRotated = true;
        if (signal.aborted) {
          material.dispose();
          const cleanupFailed = await this.cleanupFailedDelivery(resolved.record.id, traceId);
          return cleanupFailed ?? aborted(traceId);
        }
        const current = await this.store.resolveActiveSession(material.credentialDigest);
        if (!current) {
          material.dispose();
          const cleanupFailed = await this.cleanupFailedDelivery(resolved.record.id, traceId);
          return cleanupFailed
            ?? failure("unavailable", "WALLET_AUTH_RUNTIME_STORE_UNAVAILABLE", "session", traceId, true);
        }
        const now = readClock(this.clock);
        const remainingLifetimeSeconds = now
          ? Math.floor((Date.parse(current.absoluteExpiresAt) - now.getTime()) / 1_000)
          : 0;
        if (remainingLifetimeSeconds < 1) {
          material.dispose();
          const cleanupFailed = await this.cleanupFailedDelivery(resolved.record.id, traceId);
          return cleanupFailed
            ?? failure("unauthorized", "WALLET_AUTH_RUNTIME_SESSION_UNAUTHORIZED", "session", traceId);
        }
        const exposed = material.expose();
        const delivery = sessionDelivery(
          "rotated",
          Object.freeze({
            csrfToken: exposed.csrfToken,
            session: safeProjection(current, resolved.authority.roleIds, resolved.authority.capabilities),
          }),
          this.requestSecurity.serializeCredentialCookie(
            exposed.credential,
            Math.min(this.config.limits.absoluteTtlSeconds, remainingLifetimeSeconds),
            traceId,
          ),
        ) as RotateWalletAuthenticationRuntimeSessionResult;
        material.dispose();
        return delivery;
      } catch {
        material?.dispose();
        if (sessionRotated) {
          const cleanupFailed = await this.cleanupFailedDelivery(resolved.record.id, traceId);
          if (cleanupFailed) {
            return cleanupFailed;
          }
        }
        return failure("unavailable", "WALLET_AUTH_RUNTIME_STORE_UNAVAILABLE", "session", traceId, true);
      }
    });
  }

  logout(
    input: WalletAuthenticationMutationRequestInput,
  ): Promise<WalletAuthenticationRuntimeLogoutResult> {
    const traceId = safeTraceId(input?.traceId);
    return this.runOperation("logout", traceId, input?.signal, async (signal) => {
      const activationFailure = this.runtimePreflight(traceId);
      if (activationFailure) {
        return activationFailure;
      }
      if (!this.requestSecurity.requireOrigin(input?.origin, traceId)) {
        return failure("forbidden", "WALLET_AUTH_RUNTIME_ORIGIN_REJECTED", "origin", traceId);
      }
      const parsed = this.requestSecurity.parseCredentialCookie(input?.cookieHeader, traceId);
      if (parsed.status !== "accepted") {
        return logoutDelivery("already_terminal", this.requestSecurity.clearCookie(traceId));
      }
      let credentialDigest: string;
      try {
        credentialDigest = await this.credentialPort.digestCredential(parsed.credential, traceId);
      } catch {
        return logoutDelivery("already_terminal", this.requestSecurity.clearCookie(traceId));
      }
      try {
        const record = await this.store.resolveActiveSession(credentialDigest);
        if (!record) {
          return logoutDelivery("already_terminal", this.requestSecurity.clearCookie(traceId));
        }
        const csrf = await this.credentialPort.deriveCsrf({
          credentialDigest,
          sessionId: record.id,
          traceId,
          version: record.version,
        });
        const header = this.requestSecurity.readCsrfHeader(input?.csrfHeader, traceId);
        const csrfValid = header.status === "accepted"
          && await this.credentialPort.verifyCsrf({
            credentialDigest,
            presentedToken: header.token,
            sessionId: record.id,
            traceId,
            version: record.version,
          });
        if (
          signal.aborted
          || !this.credentialPort.matchesDigest(csrf.csrfTokenDigest, record.csrfTokenDigest, traceId)
          || !csrfValid
        ) {
          return failure("forbidden", "WALLET_AUTH_RUNTIME_CSRF_REJECTED", "csrf", traceId);
        }
        const outcome = await this.store.revokeSession({
          reasonCode: "PARTICIPANT_LOGOUT",
          sessionId: record.id,
          traceId,
        });
        return logoutDelivery(
          outcome.status === "revoked" ? "logged_out" : "already_terminal",
          this.requestSecurity.clearCookie(traceId),
        );
      } catch {
        return failure("unavailable", "WALLET_AUTH_RUNTIME_STORE_UNAVAILABLE", "session", traceId, true);
      }
    });
  }

  revokeSession(input: Readonly<{
    reasonCode: string;
    sessionId: string;
    signal?: AbortSignal;
    traceId: string;
  }>): Promise<Readonly<{ status: "already_terminal" | "revoked" }> | WalletAuthenticationRuntimeFailure> {
    const traceId = safeTraceId(input?.traceId);
    return this.runOperation("revoke", traceId, input?.signal, async (signal) => {
      const activationFailure = this.runtimePreflight(traceId);
      if (activationFailure) {
        return activationFailure;
      }
      if (
        signal.aborted
        || !safeId(input?.sessionId)
        || typeof input.reasonCode !== "string"
        || !SAFE_CODE_PATTERN.test(input.reasonCode)
      ) {
        return signal.aborted
          ? aborted(traceId)
          : failure("rejected", "WALLET_AUTH_RUNTIME_INPUT_INVALID", "revoke", traceId);
      }
      try {
        const result = await this.store.revokeSession({
          reasonCode: input.reasonCode,
          sessionId: input.sessionId,
          traceId,
        });
        return Object.freeze({
          status: result.status === "revoked" ? "revoked" as const : "already_terminal" as const,
        });
      } catch {
        return failure("unavailable", "WALLET_AUTH_RUNTIME_STORE_UNAVAILABLE", "session", traceId, true);
      }
    });
  }

  revokeSubjectSessions(input: Readonly<{
    reasonCode: string;
    signal?: AbortSignal;
    subjectKey: string;
    traceId: string;
  }>): Promise<Readonly<{ revokedCount: number; status: "revoked" }> | WalletAuthenticationRuntimeFailure> {
    const traceId = safeTraceId(input?.traceId);
    return this.runOperation("revoke", traceId, input?.signal, async (signal) => {
      const activationFailure = this.runtimePreflight(traceId);
      if (activationFailure) {
        return activationFailure;
      }
      if (
        signal.aborted
        || !safeDigest(input?.subjectKey)
        || typeof input.reasonCode !== "string"
        || !SAFE_CODE_PATTERN.test(input.reasonCode)
      ) {
        return signal.aborted
          ? aborted(traceId)
          : failure("rejected", "WALLET_AUTH_RUNTIME_INPUT_INVALID", "revoke", traceId);
      }
      try {
        return Object.freeze({
          revokedCount: await this.store.revokeSubjectSessions({
            reasonCode: input.reasonCode,
            subjectKey: input.subjectKey,
            traceId,
          }),
          status: "revoked" as const,
        });
      } catch {
        return failure("unavailable", "WALLET_AUTH_RUNTIME_STORE_UNAVAILABLE", "session", traceId, true);
      }
    });
  }

  resolveAuthorization(
    input: WalletAuthenticationMutationRequestInput,
  ): Promise<ResolveWalletAuthenticationAuthorizationResult> {
    const traceId = safeTraceId(input?.traceId);
    return this.runOperation("fence", traceId, input?.signal, async (signal) => {
      const resolved = await this.resolveRequestSession(input, signal, true);
      if ("diagnostic" in resolved) {
        return resolved;
      }
      const fence: WalletAuthenticationAuthorizationFence = Object.freeze({
        capabilityDigest: capabilityDigest(resolved.authority.capabilities),
        membershipRevision: resolved.authority.membershipRevision,
        sessionId: resolved.authority.sessionId,
        subjectKey: walletAuthenticationSubjectKey(resolved.record.subject),
        version: resolved.authority.version,
      });
      this.fenceState.set(fence, { credentialDigest: resolved.credentialDigest });
      return Object.freeze({ authority: resolved.authority, fence, status: "authorized" as const });
    });
  }

  revalidateFenceBeforeWrite<TValue>(
    input: RevalidateWalletAuthenticationFenceInput<TValue>,
  ): Promise<RevalidateWalletAuthenticationFenceResult<TValue>> {
    const traceId = safeTraceId(input?.traceId);
    return this.runOperation("fence", traceId, input?.signal, async (signal) => {
      const activationFailure = this.runtimePreflight(traceId);
      if (activationFailure) {
        return Object.freeze({
          diagnostic: activationFailure.diagnostic,
          status: "failed" as const,
        });
      }
      const privateState = this.fenceState.get(input?.fence as object);
      if (!privateState || signal.aborted || typeof input?.write !== "function") {
        return Object.freeze({
          diagnostic: diagnostic("WALLET_AUTH_RUNTIME_FENCE_STALE", "fence", traceId),
          status: "stale" as const,
        });
      }
      try {
        const now = readClock(this.clock);
        if (!now) {
          throw new Error("clock unavailable");
        }
        const storeFence = await this.store.assertActiveAuthorizationFence({
          credentialDigest: privateState.credentialDigest,
          membershipRevision: input.fence.membershipRevision,
          now,
          sessionId: input.fence.sessionId,
          traceId,
          version: input.fence.version,
        });
        const record = await this.store.resolveActiveSession(privateState.credentialDigest);
        if (storeFence.status !== "active" || !record || signal.aborted) {
          return Object.freeze({
            diagnostic: diagnostic("WALLET_AUTH_RUNTIME_FENCE_STALE", "fence", traceId),
            status: "stale" as const,
          });
        }
        const subject = restoreVerifiedWalletSubjectFromPersistence(record.subject);
        const membership = await this.resolveMembership(subject, signal, traceId);
        if ("diagnostic" in membership) {
          return Object.freeze({
            diagnostic: membership.diagnostic,
            status: membership.status === "unavailable" ? "failed" as const : "stale" as const,
          });
        }
        const subjectKey = walletAuthenticationSubjectKey(record.subject);
        if (
          membership.membershipRevision !== input.fence.membershipRevision
          || subjectKey !== input.fence.subjectKey
          || capabilityDigest(membership.capabilities) !== input.fence.capabilityDigest
          || signal.aborted
        ) {
          return Object.freeze({
            diagnostic: diagnostic("WALLET_AUTH_RUNTIME_FENCE_STALE", "fence", traceId),
            status: "stale" as const,
          });
        }
        const authority = issueResolvedWalletSessionAuthority({
          absoluteExpiresAt: record.absoluteExpiresAt,
          capabilities: membership.capabilities,
          credentialBoundary: record.credentialBoundary,
          idleExpiresAt: record.idleExpiresAt,
          membershipRevision: membership.membershipRevision,
          roleIds: membership.roleIds,
          sessionId: record.id,
          subject,
          version: record.version,
        });
        const finalNow = readClock(this.clock);
        if (!finalNow || signal.aborted) {
          return Object.freeze({
            diagnostic: diagnostic("WALLET_AUTH_RUNTIME_FENCE_STALE", "fence", traceId),
            status: "stale" as const,
          });
        }
        const commit = await this.finalWriteCoordinator.commit(Object.freeze({
          credentialDigest: privateState.credentialDigest,
          fence: input.fence,
          now: finalNow,
          signal,
          traceId,
          write: () => input.write({ authority, signal }),
        }));
        if (commit.status === "stale") {
          return Object.freeze({
            diagnostic: diagnostic("WALLET_AUTH_RUNTIME_FENCE_STALE", "fence", traceId),
            status: "stale" as const,
          });
        }
        return Object.freeze({ status: "committed" as const, value: commit.value });
      } catch {
        return Object.freeze({
          diagnostic: diagnostic("WALLET_AUTH_RUNTIME_STORE_UNAVAILABLE", "fence", traceId, true),
          status: "failed" as const,
        });
      }
    }, () => Object.freeze({
      diagnostic: diagnostic("WALLET_AUTH_RUNTIME_STOPPED", "runtime", traceId),
      status: "failed" as const,
    }));
  }

  state(): WalletAuthenticationRuntimeState {
    return Object.freeze({
      accepting: this.accepting,
      activeOperationCount: this.activeOperations.size,
      controllerCount: this.controllers.size,
    });
  }

  stop(traceIdInput = DEFAULT_TRACE_ID): Promise<WalletAuthenticationRuntimeStopResult> {
    if (this.stopPromise) {
      return this.stopPromise;
    }
    const traceId = safeTraceId(traceIdInput);
    this.accepting = false;
    for (const controller of this.controllers) {
      controller.abort();
    }
    for (const cleanup of this.operationListenerCleanup.values()) {
      cleanup();
    }
    this.operationListenerCleanup.clear();
    this.controllers.clear();
    const startedAt = Date.now();
    const deadline = startedAt + this.shutdownTimeoutMs;
    this.stopPromise = (async () => {
      const diagnostics: WalletAuthenticationRuntimeDiagnostic[] = [];
      const drain = await settleWithin(
        Promise.allSettled([...this.activeOperations]),
        Math.max(1, Math.floor(this.shutdownTimeoutMs / 2)),
      );
      if (drain.status === "timed_out" && this.activeOperations.size > 0) {
        diagnostics.push(diagnostic(
          "WALLET_AUTH_RUNTIME_SHUTDOWN_TIMEOUT",
          "operations",
          traceId,
          true,
        ));
      }

      const closeOwnedResource = async (
        kind: string,
        close: () => void | Promise<void>,
      ): Promise<void> => {
        const safeKind = safeId(kind, 96) ? kind : "resource";
        try {
          const closed = await settleWithin(
            Promise.resolve().then(close),
            Math.max(0, deadline - Date.now()),
          );
          if (closed.status === "timed_out") {
            diagnostics.push(diagnostic(
              "WALLET_AUTH_RUNTIME_SHUTDOWN_TIMEOUT",
              safeKind,
              traceId,
              true,
            ));
          }
        } catch {
          diagnostics.push(diagnostic(
            "WALLET_AUTH_RUNTIME_CLEANUP_FAILED",
            safeKind,
            traceId,
          ));
        }
      };

      for (const resource of this.resources) {
        await closeOwnedResource(resource.kind, () => resource.close());
      }
      await closeOwnedResource(this.credentialPort.kind, () => this.credentialPort.close());
      await closeOwnedResource(this.store.kind, () => this.store.close());
      const diagnosticCodes = Object.freeze([
        ...new Set(diagnostics.map(({ code }) => code)),
      ]);
      return Object.freeze({
        diagnosticCodes,
        diagnostics: Object.freeze([...diagnostics]),
        status: diagnosticCodes.includes("WALLET_AUTH_RUNTIME_SHUTDOWN_TIMEOUT")
          ? "timed_out" as const
          : diagnosticCodes.includes("WALLET_AUTH_RUNTIME_CLEANUP_FAILED")
            ? "cleanup_failed" as const
          : "drained" as const,
      });
    })();
    return this.stopPromise;
  }

  private bindingPreflight(
    adapterId: unknown,
    traceId: string,
  ): Readonly<{ binding: WalletVerifierBinding }> | WalletAuthenticationRuntimeFailure {
    const activationFailure = this.runtimePreflight(traceId);
    if (activationFailure) {
      return activationFailure;
    }
    if (!safeId(adapterId, 64)) {
      return failure("blocked", "WALLET_AUTH_RUNTIME_CONFIG_INVALID", "config", traceId);
    }
    const resolution = this.config.resolveBinding(adapterId as string);
    if (resolution.status !== "resolved" || !resolution.binding.enabled) {
      return failure("blocked", "WALLET_AUTH_RUNTIME_DISABLED", "binding", traceId);
    }
    if (this.config.environment === "production" && !resolution.binding.productionApproved) {
      return failure("blocked", "WALLET_AUTH_RUNTIME_CONFIG_INVALID", "binding", traceId);
    }
    return Object.freeze({ binding: resolution.binding });
  }

  private runtimePreflight(traceId: string): WalletAuthenticationRuntimeFailure | undefined {
    if (!this.config || this.config.status === "disabled" || !this.config.enabled) {
      return failure("blocked", "WALLET_AUTH_RUNTIME_DISABLED", "config", traceId);
    }
    if (
      !this.config.valid
      || this.config.status !== "ready"
      || !this.config.csrf?.configured
      || !issuedFinalWriteCoordinators.has(this.finalWriteCoordinator)
      || (this.config.environment === "production" && (
        !this.config.productionReady
        || this.config.storeMode !== "postgres"
        || this.store?.kind !== "postgresql"
      ))
    ) {
      return failure("blocked", "WALLET_AUTH_RUNTIME_CONFIG_INVALID", "config", traceId);
    }
    return undefined;
  }

  private async cleanupFailedDelivery(
    sessionId: string,
    traceId: string,
  ): Promise<WalletAuthenticationRuntimeFailure | undefined> {
    try {
      await this.store.revokeSession({
        reasonCode: "SESSION_DELIVERY_FAILED",
        sessionId,
        traceId,
      });
      return undefined;
    } catch {
      return failure(
        "unavailable",
        "WALLET_AUTH_RUNTIME_CLEANUP_FAILED",
        "session",
        traceId,
        true,
      );
    }
  }

  private async recordProofFailure(
    challengeId: string,
    traceId: string,
  ): Promise<WalletAuthenticationRuntimeFailure | undefined> {
    return this.recordChallengeFailure(challengeId, "INVALID_PROOF", traceId);
  }

  private async recordChallengeFailure(
    challengeId: string,
    terminalCode: string,
    traceId: string,
  ): Promise<WalletAuthenticationRuntimeFailure | undefined> {
    try {
      await this.store.recordChallengeFailureWithPolicy({
        challengeId,
        terminalCode,
        traceId,
      });
      return undefined;
    } catch {
      return failure(
        "unavailable",
        "WALLET_AUTH_RUNTIME_STORE_UNAVAILABLE",
        "challenge",
        traceId,
        true,
      );
    }
  }

  private async resolveMembership(
    subject: VerifiedWalletSubject,
    signal: AbortSignal,
    traceId: string,
  ): Promise<Readonly<{
    capabilities: readonly string[];
    membershipRevision: string;
    roleIds: readonly string[];
  }> | WalletAuthenticationRuntimeFailure> {
    try {
      const resolution = await this.membershipResolver.resolve(subject, signal);
      if (signal.aborted) {
        return aborted(traceId);
      }
      if (resolution.status === "unavailable") {
        return failure(
          "unavailable",
          "WALLET_AUTH_RUNTIME_MEMBERSHIP_UNAVAILABLE",
          "membership",
          traceId,
          true,
        );
      }
      if (resolution.status === "revoked") {
        return failure(
          "unauthorized",
          "WALLET_AUTH_RUNTIME_SESSION_UNAUTHORIZED",
          "membership",
          traceId,
        );
      }
      if (resolution.status !== "resolved") {
        return failure(
          "unavailable",
          "WALLET_AUTH_RUNTIME_MEMBERSHIP_UNAVAILABLE",
          "membership",
          traceId,
          true,
        );
      }
      const roleIds = safeIds(resolution.roleIds);
      const capabilities = safeIds(resolution.capabilities);
      if (!roleIds || !capabilities || !safeId(resolution.membershipRevision)) {
        return failure(
          "unavailable",
          "WALLET_AUTH_RUNTIME_MEMBERSHIP_UNAVAILABLE",
          "membership",
          traceId,
          true,
        );
      }
      return Object.freeze({
        capabilities,
        membershipRevision: resolution.membershipRevision,
        roleIds,
      });
    } catch {
      return failure(
        "unavailable",
        "WALLET_AUTH_RUNTIME_MEMBERSHIP_UNAVAILABLE",
        "membership",
        traceId,
        true,
      );
    }
  }

  private async resolveRequestSession(
    input: WalletAuthenticationSessionRequestInput & Partial<WalletAuthenticationMutationRequestInput>,
    signal: AbortSignal,
    requireCsrf: boolean,
  ): Promise<ResolvedRuntimeSession | WalletAuthenticationRuntimeFailure> {
    const traceId = safeTraceId(input?.traceId);
    if (signal.aborted) {
      return aborted(traceId);
    }
    const activationFailure = this.runtimePreflight(traceId);
    if (activationFailure) {
      return activationFailure;
    }
    if (!this.requestSecurity.requireOrigin(input?.origin, traceId)) {
      return failure("forbidden", "WALLET_AUTH_RUNTIME_ORIGIN_REJECTED", "origin", traceId);
    }
    const cookie = this.requestSecurity.parseCredentialCookie(input?.cookieHeader, traceId);
    if (cookie.status !== "accepted") {
      return failure("unauthorized", "WALLET_AUTH_RUNTIME_SESSION_UNAUTHORIZED", "session", traceId);
    }
    let credentialDigest: string;
    try {
      credentialDigest = await this.credentialPort.digestCredential(cookie.credential, traceId);
      if (!safeDigest(credentialDigest)) {
        return failure("unauthorized", "WALLET_AUTH_RUNTIME_SESSION_UNAUTHORIZED", "session", traceId);
      }
    } catch {
      return failure("unauthorized", "WALLET_AUTH_RUNTIME_SESSION_UNAUTHORIZED", "session", traceId);
    }
    try {
      const record = await this.store.resolveActiveSession(credentialDigest);
      if (!record || signal.aborted) {
        return failure("unauthorized", "WALLET_AUTH_RUNTIME_SESSION_UNAUTHORIZED", "session", traceId);
      }
      const csrf = await this.credentialPort.deriveCsrf({
        credentialDigest,
        sessionId: record.id,
        traceId,
        version: record.version,
      });
      if (!this.credentialPort.matchesDigest(
        csrf.csrfTokenDigest,
        record.csrfTokenDigest,
        traceId,
      )) {
        return failure("unauthorized", "WALLET_AUTH_RUNTIME_SESSION_UNAUTHORIZED", "session", traceId);
      }
      if (requireCsrf) {
        const header = this.requestSecurity.readCsrfHeader(input.csrfHeader, traceId);
        if (
          header.status !== "accepted"
          || !await this.credentialPort.verifyCsrf({
            credentialDigest,
            presentedToken: header.token,
            sessionId: record.id,
            traceId,
            version: record.version,
          })
        ) {
          return failure("forbidden", "WALLET_AUTH_RUNTIME_CSRF_REJECTED", "csrf", traceId);
        }
      }
      const subject = restoreVerifiedWalletSubjectFromPersistence(record.subject);
      const membership = await this.resolveMembership(subject, signal, traceId);
      if ("diagnostic" in membership) {
        return membership;
      }
      if (membership.membershipRevision !== record.membershipRevision) {
        return failure("unauthorized", "WALLET_AUTH_RUNTIME_SESSION_UNAUTHORIZED", "membership", traceId);
      }
      const roleIds = Object.freeze(record.roleIds.filter((role) => membership.roleIds.includes(role)));
      const capabilities = Object.freeze(
        record.capabilities.filter((capability) => membership.capabilities.includes(capability)),
      );
      if (roleIds.length === 0 || capabilities.length === 0) {
        return failure("unauthorized", "WALLET_AUTH_RUNTIME_SESSION_UNAUTHORIZED", "membership", traceId);
      }
      const authority = issueResolvedWalletSessionAuthority({
        absoluteExpiresAt: record.absoluteExpiresAt,
        capabilities,
        credentialBoundary: record.credentialBoundary,
        idleExpiresAt: record.idleExpiresAt,
        membershipRevision: membership.membershipRevision,
        roleIds,
        sessionId: record.id,
        subject,
        version: record.version,
      });
      return Object.freeze({
        authority,
        credentialDigest,
        csrfToken: csrf.csrfToken,
        record,
      });
    } catch {
      return failure("unavailable", "WALLET_AUTH_RUNTIME_STORE_UNAVAILABLE", "session", traceId, true);
    }
  }

  private runOperation<TValue>(
    _operation: RuntimeOperation,
    traceId: string,
    externalSignal: AbortSignal | undefined,
    task: (signal: AbortSignal) => Promise<TValue>,
    stoppedValue: () => TValue = () => stopped(traceId) as TValue,
  ): Promise<TValue> {
    if (!this.accepting) {
      return Promise.resolve(stoppedValue());
    }
    const controller = new AbortController();
    const abort = () => controller.abort();
    let listenerAttached = false;
    if (externalSignal) {
      externalSignal.addEventListener("abort", abort, { once: true });
      listenerAttached = true;
    }
    const cleanupExternalListener = () => {
      if (listenerAttached) {
        externalSignal?.removeEventListener("abort", abort);
        listenerAttached = false;
      }
    };
    if (externalSignal?.aborted) {
      controller.abort();
    }
    this.controllers.add(controller);
    this.operationListenerCleanup.set(controller, cleanupExternalListener);
    let tracked: Promise<TValue>;
    const operation = Promise.resolve().then(() => task(controller.signal));
    tracked = operation.finally(() => {
      cleanupExternalListener();
      this.operationListenerCleanup.delete(controller);
      this.controllers.delete(controller);
      this.activeOperations.delete(tracked);
    });
    this.activeOperations.add(tracked);
    return tracked;
  }
}
