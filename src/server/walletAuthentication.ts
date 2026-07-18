import {
  isCanonicalLiveWalletAccountType,
  isCanonicalLiveWalletChainId,
  isCanonicalLiveWalletNetwork,
  isCanonicalLiveWalletSource,
  type CanonicalLiveWalletAccountType,
  type CanonicalLiveWalletChainId,
  type CanonicalLiveWalletNetwork,
  type CanonicalLiveWalletSource,
} from "../domain/wallet";

export type WalletProofMethod =
  | "AELF_EOA_RECOVERABLE"
  | "PORTKEY_AA_MANAGER_CA";
export type WalletSignatureEncoding = "AELF_RECOVERABLE_HEX";
export type WalletAuthenticationChallengeStatus =
  | "issued"
  | "consumed"
  | "rejected"
  | "expired";
export type DurableWalletSessionStatus = "active" | "revoked" | "expired";

export type WalletAuthenticationDiagnosticCode =
  | "WALLET_AUTH_VERIFIER_UNAVAILABLE"
  | "WALLET_AUTH_CA_RELATION_UNAVAILABLE"
  | "WALLET_AUTH_STORE_UNAVAILABLE"
  | "WALLET_AUTH_INPUT_INVALID"
  | "WALLET_AUTH_SUBJECT_ACCOUNT_TYPE_INVALID"
  | "WALLET_AUTH_SUBJECT_SOURCE_INVALID"
  | "WALLET_AUTH_SUBJECT_CHAIN_INVALID"
  | "WALLET_AUTH_SUBJECT_NETWORK_INVALID"
  | "WALLET_AUTH_SUBJECT_PROOF_METHOD_INVALID"
  | "WALLET_AUTH_SUBJECT_FIELD_INVALID"
  | "WALLET_AUTH_TRUSTED_SUBJECT_REQUIRED"
  | "WALLET_AUTH_SESSION_AUTHORITY_INVALID";

export interface WalletAuthenticationDiagnostic {
  readonly adapterId?: string;
  readonly code: WalletAuthenticationDiagnosticCode | `WALLET_AUTH_${string}`;
  readonly field: string;
  readonly severity: "error" | "warning";
  readonly traceId: string;
}

const WALLET_AUTH_DIAGNOSTIC_FALLBACK_FIELD = "diagnostic";
const WALLET_AUTH_DIAGNOSTIC_FALLBACK_TRACE_ID = "wallet-auth-diagnostic";

const isSafeDiagnosticAdapterId = (value: unknown): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= 64
  && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value);

const isSafeDiagnosticCode = (
  value: unknown,
): value is WalletAuthenticationDiagnostic["code"] =>
  typeof value === "string"
  && value.length <= 96
  && /^WALLET_AUTH_[A-Z0-9_]+$/.test(value);

const isSafeDiagnosticField = (value: unknown): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= 128
  && /^[A-Za-z][A-Za-z0-9_.\[\]-]*$/.test(value);

const isSafeDiagnosticTraceId = (value: unknown): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= 128
  && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value);

export const createWalletAuthenticationDiagnostic = ({
  adapterId,
  code,
  field,
  severity = "error",
  traceId,
}: Omit<WalletAuthenticationDiagnostic, "severity"> & {
  readonly severity?: WalletAuthenticationDiagnostic["severity"];
}): WalletAuthenticationDiagnostic => Object.freeze({
  ...(isSafeDiagnosticAdapterId(adapterId) ? { adapterId } : {}),
  code: isSafeDiagnosticCode(code) ? code : "WALLET_AUTH_INPUT_INVALID",
  field: isSafeDiagnosticField(field) ? field : WALLET_AUTH_DIAGNOSTIC_FALLBACK_FIELD,
  severity: severity === "warning" ? "warning" : "error",
  traceId: isSafeDiagnosticTraceId(traceId)
    ? traceId
    : WALLET_AUTH_DIAGNOSTIC_FALLBACK_TRACE_ID,
});

export class WalletAuthenticationAuthorityError extends Error {
  readonly code: WalletAuthenticationDiagnosticCode;
  readonly field: string;

  constructor(code: WalletAuthenticationDiagnosticCode, field: string) {
    super("Wallet authentication authority input is invalid.");
    this.name = "WalletAuthenticationAuthorityError";
    this.code = code;
    this.field = field;
  }
}

const verifiedWalletSubjectBrand: unique symbol = Symbol("VerifiedWalletSubject");
const resolvedWalletSessionAuthorityBrand: unique symbol = Symbol("ResolvedWalletSessionAuthority");
const issuedSubjects = new WeakSet<object>();
const issuedAuthorities = new WeakSet<object>();

export interface VerifiedWalletSubjectInput {
  readonly accountType: CanonicalLiveWalletAccountType;
  readonly adapterId: string;
  readonly caHash?: string;
  readonly chainId: CanonicalLiveWalletChainId;
  readonly network: CanonicalLiveWalletNetwork;
  readonly proofDigest: string;
  readonly proofMethod: WalletProofMethod;
  readonly signerAddress: string;
  readonly verifiedAt: string;
  readonly walletAddress: string;
  readonly walletSource: CanonicalLiveWalletSource;
}

export interface VerifiedWalletSubject extends VerifiedWalletSubjectInput {
  readonly [verifiedWalletSubjectBrand]: true;
}

export interface PublicVerifiedWalletSubject {
  readonly accountType: CanonicalLiveWalletAccountType;
  readonly adapterId: string;
  readonly chainId: CanonicalLiveWalletChainId;
  readonly network: CanonicalLiveWalletNetwork;
  readonly walletAddress: string;
  readonly walletSource: CanonicalLiveWalletSource;
}

const safeId = (value: unknown, maximum = 160): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= maximum
  && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value);

const safeVersionedReference = (value: unknown, maximum = 160): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= maximum
  && /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(value);

const safeIsoInstant = (value: unknown): value is string =>
  typeof value === "string"
  && value.length <= 32
  && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString() === value;

const failAuthority = (
  code: WalletAuthenticationDiagnosticCode,
  field: string,
): never => {
  throw new WalletAuthenticationAuthorityError(code, field);
};

export const issueVerifiedWalletSubject = (
  input: VerifiedWalletSubjectInput,
): VerifiedWalletSubject => {
  if (!isCanonicalLiveWalletAccountType(input.accountType)) {
    return failAuthority("WALLET_AUTH_SUBJECT_ACCOUNT_TYPE_INVALID", "accountType");
  }

  if (!isCanonicalLiveWalletSource(input.walletSource)) {
    return failAuthority("WALLET_AUTH_SUBJECT_SOURCE_INVALID", "walletSource");
  }

  if (!isCanonicalLiveWalletChainId(input.chainId)) {
    return failAuthority("WALLET_AUTH_SUBJECT_CHAIN_INVALID", "chainId");
  }

  if (!isCanonicalLiveWalletNetwork(input.network)) {
    return failAuthority("WALLET_AUTH_SUBJECT_NETWORK_INVALID", "network");
  }

  const proofMethodMatchesAccount =
    (input.accountType === "EOA" && input.proofMethod === "AELF_EOA_RECOVERABLE")
    || (input.accountType === "AA" && input.proofMethod === "PORTKEY_AA_MANAGER_CA");

  if (!proofMethodMatchesAccount) {
    return failAuthority("WALLET_AUTH_SUBJECT_PROOF_METHOD_INVALID", "proofMethod");
  }

  if (
    !safeId(input.adapterId, 64)
    || !safeId(input.walletAddress, 256)
    || !safeId(input.signerAddress, 256)
    || !/^[a-f0-9]{64}$/.test(input.proofDigest)
    || !safeIsoInstant(input.verifiedAt)
    || (input.caHash !== undefined && !safeId(input.caHash, 256))
    || (input.accountType === "AA" && input.caHash === undefined)
    || (input.accountType === "EOA" && input.caHash !== undefined)
  ) {
    return failAuthority("WALLET_AUTH_SUBJECT_FIELD_INVALID", "subject");
  }

  const subject = {
    accountType: input.accountType,
    adapterId: input.adapterId,
    ...(input.caHash === undefined ? {} : { caHash: input.caHash }),
    chainId: input.chainId,
    network: input.network,
    proofDigest: input.proofDigest,
    proofMethod: input.proofMethod,
    signerAddress: input.signerAddress,
    verifiedAt: input.verifiedAt,
    walletAddress: input.walletAddress,
    walletSource: input.walletSource,
  } as VerifiedWalletSubject;
  Object.defineProperty(subject, verifiedWalletSubjectBrand, {
    enumerable: false,
    value: true,
  });
  issuedSubjects.add(subject);

  return Object.freeze(subject);
};

export const isVerifiedWalletSubject = (value: unknown): value is VerifiedWalletSubject =>
  typeof value === "object" && value !== null && issuedSubjects.has(value);

export const projectVerifiedWalletSubject = (
  subject: VerifiedWalletSubject,
): PublicVerifiedWalletSubject => {
  if (!isVerifiedWalletSubject(subject)) {
    return failAuthority("WALLET_AUTH_TRUSTED_SUBJECT_REQUIRED", "subject");
  }

  return Object.freeze({
    accountType: subject.accountType,
    adapterId: subject.adapterId,
    chainId: subject.chainId,
    network: subject.network,
    walletAddress: subject.walletAddress,
    walletSource: subject.walletSource,
  });
};

export interface ResolvedWalletSessionAuthorityInput {
  readonly absoluteExpiresAt: string;
  readonly capabilities: readonly string[];
  readonly credentialBoundary: string;
  readonly idleExpiresAt: string;
  readonly membershipRevision: string;
  readonly roleIds: readonly string[];
  readonly sessionId: string;
  readonly subject: VerifiedWalletSubject;
  readonly version: number;
}

export interface ResolvedWalletSessionAuthority extends ResolvedWalletSessionAuthorityInput {
  readonly [resolvedWalletSessionAuthorityBrand]: true;
}

export interface SafeWalletSessionProjection {
  readonly absoluteExpiresAt: string;
  readonly accountType: CanonicalLiveWalletAccountType;
  readonly capabilities: readonly string[];
  readonly idleExpiresAt: string;
  readonly roleIds: readonly string[];
  readonly sessionId: string;
  readonly status: "active";
  readonly walletAddress: string;
  readonly walletSource: CanonicalLiveWalletSource;
}

const freezeSafeIds = (values: readonly string[], field: string): readonly string[] => {
  if (
    values.length > 64
    || new Set(values).size !== values.length
    || values.some((value) => !safeId(value, 128))
  ) {
    return failAuthority("WALLET_AUTH_SESSION_AUTHORITY_INVALID", field);
  }

  return Object.freeze([...values]);
};

export const issueResolvedWalletSessionAuthority = (
  input: ResolvedWalletSessionAuthorityInput,
): ResolvedWalletSessionAuthority => {
  if (!isVerifiedWalletSubject(input.subject)) {
    return failAuthority("WALLET_AUTH_TRUSTED_SUBJECT_REQUIRED", "subject");
  }

  if (
    !safeId(input.sessionId, 160)
    || !safeVersionedReference(input.credentialBoundary, 128)
    || !safeId(input.membershipRevision, 160)
    || !Number.isSafeInteger(input.version)
    || input.version < 1
    || !safeIsoInstant(input.idleExpiresAt)
    || !safeIsoInstant(input.absoluteExpiresAt)
  ) {
    return failAuthority("WALLET_AUTH_SESSION_AUTHORITY_INVALID", "authority");
  }

  const authority = {
    absoluteExpiresAt: input.absoluteExpiresAt,
    capabilities: freezeSafeIds(input.capabilities, "capabilities"),
    credentialBoundary: input.credentialBoundary,
    idleExpiresAt: input.idleExpiresAt,
    membershipRevision: input.membershipRevision,
    roleIds: freezeSafeIds(input.roleIds, "roleIds"),
    sessionId: input.sessionId,
    subject: input.subject,
    version: input.version,
  } as ResolvedWalletSessionAuthority;
  Object.defineProperty(authority, resolvedWalletSessionAuthorityBrand, {
    enumerable: false,
    value: true,
  });
  issuedAuthorities.add(authority);

  return Object.freeze(authority);
};

export const isResolvedWalletSessionAuthority = (
  value: unknown,
): value is ResolvedWalletSessionAuthority =>
  typeof value === "object" && value !== null && issuedAuthorities.has(value);

export const projectResolvedWalletSession = (
  authority: ResolvedWalletSessionAuthority,
): SafeWalletSessionProjection => {
  if (!isResolvedWalletSessionAuthority(authority)) {
    return failAuthority("WALLET_AUTH_SESSION_AUTHORITY_INVALID", "authority");
  }

  return Object.freeze({
    absoluteExpiresAt: authority.absoluteExpiresAt,
    accountType: authority.subject.accountType,
    capabilities: Object.freeze([...authority.capabilities]),
    idleExpiresAt: authority.idleExpiresAt,
    roleIds: Object.freeze([...authority.roleIds]),
    sessionId: authority.sessionId,
    status: "active",
    walletAddress: authority.subject.walletAddress,
    walletSource: authority.subject.walletSource,
  });
};

export interface WalletAuthenticationChallengeSnapshot {
  readonly adapterId: string;
  readonly caHash?: string;
  readonly chainId: CanonicalLiveWalletChainId;
  readonly expiresAt: string;
  readonly id: string;
  readonly issuedAt: string;
  readonly messageDigest: string;
  readonly network: CanonicalLiveWalletNetwork;
  readonly nonceDigest: string;
  readonly requestedWalletAddress: string;
  readonly status: WalletAuthenticationChallengeStatus;
  readonly traceId: string;
  readonly verificationAttempts: number;
  readonly version: "campaign-os-wallet-auth/v1";
}

export interface DurableWalletSessionRecord {
  readonly absoluteExpiresAt: string;
  readonly capabilities: readonly string[];
  readonly challengeId: string;
  readonly credentialBoundary: string;
  readonly credentialDigest: string;
  readonly csrfTokenDigest: string;
  readonly id: string;
  readonly idleExpiresAt: string;
  readonly issuedAt: string;
  readonly lastSeenAt: string;
  readonly membershipRevision: string;
  readonly roleIds: readonly string[];
  readonly status: DurableWalletSessionStatus;
  readonly subject: PublicVerifiedWalletSubject;
  readonly version: number;
}

export interface WalletProofChallengeMaterial {
  readonly adapterId: string;
  readonly caHash?: string;
  readonly chainId: CanonicalLiveWalletChainId;
  readonly exactMessageBytes: Uint8Array;
  readonly network: CanonicalLiveWalletNetwork;
  readonly requestedWalletAddress: string;
}

export interface WalletProofVerificationRequest {
  readonly adapterProof?: Readonly<Record<string, unknown>>;
  readonly challenge: WalletProofChallengeMaterial;
  readonly publicKey?: Uint8Array;
  readonly signature: Uint8Array;
  readonly traceId: string;
}

export type WalletProofVerificationResult =
  | Readonly<{ status: "verified"; subject: VerifiedWalletSubject }>
  | Readonly<{ diagnostic: WalletAuthenticationDiagnostic; status: "rejected" | "unavailable" }>;

export interface WalletProofVerifier {
  readonly id: string;
  readonly proofMethod: WalletProofMethod;
  verify(
    request: WalletProofVerificationRequest,
    signal?: AbortSignal,
  ): Promise<WalletProofVerificationResult>;
}

export interface PortkeyCaRelationRequest {
  readonly caAddressHint: string;
  readonly caHash: string;
  readonly chainId: CanonicalLiveWalletChainId;
  readonly managerAddress: string;
  readonly traceId: string;
}

export type PortkeyCaRelationResult =
  | Readonly<{
    caAddress: string;
    caHash: string;
    chainId: CanonicalLiveWalletChainId;
    managerAddress: string;
    relationDigest: string;
    relationRevision: string;
    status: "verified";
  }>
  | Readonly<{
    diagnostic: WalletAuthenticationDiagnostic;
    retryable: boolean;
    status: "rejected" | "unavailable";
  }>;

export interface PortkeyCaRelationProvider {
  readonly id: string;
  verifyRelation(
    request: PortkeyCaRelationRequest,
    signal?: AbortSignal,
  ): Promise<PortkeyCaRelationResult>;
  close(): Promise<void>;
}

export interface WalletAuthenticationClock {
  now(): Date;
}

export interface WalletAuthenticationRandom {
  randomBytes(size: number): Uint8Array;
}

export interface WalletCredentialCrypto {
  digest(input: Uint8Array): Promise<Uint8Array>;
  hmac(key: Uint8Array, input: Uint8Array): Promise<Uint8Array>;
  timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean;
}

export interface ConsumeChallengeAndCreateSessionInput {
  readonly challengeId: string;
  readonly expectedChallengeVersion: string;
  readonly session: DurableWalletSessionRecord;
  readonly traceId: string;
}

export interface RotateWalletSessionInput {
  readonly credentialDigest: string;
  readonly nextCredentialDigest: string;
  readonly nextCsrfTokenDigest: string;
  readonly traceId: string;
  readonly version: number;
}

export interface WalletAuthenticationStore {
  issueChallenge(
    challenge: WalletAuthenticationChallengeSnapshot,
  ): Promise<WalletAuthenticationChallengeSnapshot>;
  loadChallenge(id: string): Promise<WalletAuthenticationChallengeSnapshot | undefined>;
  recordChallengeFailure(input: Readonly<{
    challengeId: string;
    terminalCode: string;
    traceId: string;
  }>): Promise<Readonly<{ status: "recorded" | "terminal" | "not_found" }>>;
  expireChallenges(now: Date): Promise<number>;
  consumeChallengeAndCreateSession(
    input: ConsumeChallengeAndCreateSessionInput,
  ): Promise<Readonly<{ status: "created" | "conflict" | "expired" | "not_found" }>>;
  resolveActiveSession(credentialDigest: string): Promise<DurableWalletSessionRecord | undefined>;
  touchSession(input: Readonly<{
    credentialDigest: string;
    now: Date;
    traceId: string;
    version: number;
  }>): Promise<Readonly<{ status: "touched" | "throttled" | "not_found" }>>;
  rotateSession(
    input: RotateWalletSessionInput,
  ): Promise<Readonly<{ status: "rotated" | "conflict" | "not_found" }>>;
  revokeSession(input: Readonly<{
    reasonCode: string;
    sessionId: string;
    traceId: string;
  }>): Promise<Readonly<{ status: "revoked" | "already_terminal" | "not_found" }>>;
  revokeSubjectSessions(input: Readonly<{
    reasonCode: string;
    subjectKey: string;
    traceId: string;
  }>): Promise<number>;
  expireSessions(now: Date): Promise<number>;
  close(): Promise<void>;
}
