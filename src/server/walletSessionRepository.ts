import type {
  AccountType,
  NormalizedWalletSession,
  WalletCapability,
  WalletNetwork,
  WalletSessionIssuerSummary,
  WalletSessionProductionReadinessSummary,
  WalletSessionProofSummary,
  WalletSignatureStatus,
  WalletSource,
  WalletVerificationStatus,
} from "../domain/types";
import {
  createWalletSessionDurableStore,
  type WalletSessionDurableStore,
  type WalletSessionDurableStoreManifest,
} from "./walletSessionDurableStore";

export type WalletSessionRepositoryMode = "deterministic_test" | "durable_test" | "production_required";
export type WalletSessionRepositoryStatus = "ready" | "blocked";
export type WalletSessionDiagnosticSeverity = "error" | "warning" | "info";
export type WalletSessionDiagnosticCode =
  | "WALLET_SESSION_DURABLE_STORE_PATH_REQUIRED"
  | "WALLET_SESSION_DURABLE_STORE_READ_FAILED"
  | "WALLET_SESSION_DURABLE_STORE_WRITE_FAILED"
  | "WALLET_SESSION_DURABLE_STORE_PRODUCTION_REQUIRED"
  | "WALLET_SESSION_REPOSITORY_PRODUCTION_REQUIRED"
  | "WALLET_SESSION_REQUIRED_FIELD_MISSING";

export interface WalletSessionDiagnostic {
  code: WalletSessionDiagnosticCode;
  field: string;
  message: string;
  severity: WalletSessionDiagnosticSeverity;
}

export interface WalletSessionProofRecord {
  diagnosticCodes: string[];
  liveVerificationExecuted: false;
  proofType: WalletSessionProofSummary["proofType"];
  status: WalletSessionProofSummary["status"];
  trustLevel: WalletSessionProofSummary["trustLevel"];
}

export interface WalletSessionIssuerRecord {
  artifactType: WalletSessionIssuerSummary["artifactType"];
  cookieIssued: false;
  diagnosticCodes: string[];
  issuerMode: WalletSessionIssuerSummary["issuerMode"];
  jwtIssued: false;
  liveSigningExecuted: false;
  referenceId: string;
  ttlSeconds: number;
  valid: boolean;
}

export interface WalletSessionProductionReadinessRecord {
  blockedDependencyIds: string[];
  liveSigningReady: boolean;
  liveVerifierReady: boolean;
  productionReady: false;
  productionRequired: boolean;
  productionSessionStoreReady: boolean;
  secretManagerReady: boolean;
  signingKeyReady: boolean;
}

export interface WalletSessionRecord {
  accountType: AccountType;
  capabilities: WalletCapability[];
  chainId: NormalizedWalletSession["chainId"];
  connectedAt: string;
  displayAddress: string;
  issuer?: WalletSessionIssuerRecord;
  lastSeenAt: string;
  network: WalletNetwork;
  productionReadiness: WalletSessionProductionReadinessRecord;
  proof?: WalletSessionProofRecord;
  recordId: string;
  repository: {
    adapterId: string;
    repositoryId: "wallet-session-repository-runtime";
    sequence: number;
    storeId: "wallet-sessions";
  };
  sessionId: string;
  signatureStatus: WalletSignatureStatus;
  verificationStatus: WalletVerificationStatus;
  walletAddress: string;
  walletName: string;
  walletSource: WalletSource;
  walletTypeVerified: boolean;
}

export interface WalletSessionRepositoryHealth {
  adapterId: string;
  blockedDependencyIds: string[];
  boundedListLimit: number;
  cookieIssued: false;
  diagnosticCodes: WalletSessionDiagnosticCode[];
  diagnostics: WalletSessionDiagnostic[];
  fallbackUsed: false;
  id: "wallet-session-repository-runtime";
  jwtIssued: false;
  liveProofVerificationExecuted: false;
  liveWalletSdkExecuted: false;
  productionReady: false;
  recordCount: number;
  secretStored: false;
  selectedMode: WalletSessionRepositoryMode;
  status: WalletSessionRepositoryStatus;
  storeId: "wallet-sessions";
  validation: {
    issues: WalletSessionDiagnostic[];
    valid: boolean;
  };
  walletSessionStore?: WalletSessionDurableStoreManifest;
}

export interface WalletSessionRepositoryListFilter {
  limit?: number;
  walletAddress?: string;
  walletSource?: WalletSource | string;
}

export interface WalletSessionRepositoryContext {
  traceId?: string;
}

export interface WalletSessionRepositoryMetadata {
  adapterId: string;
  created: boolean;
  recordId: string;
  repositoryId: "wallet-session-repository-runtime";
  sessionId: string;
  storeId: "wallet-sessions";
  upserted: true;
  walletAddress: string;
}

export interface WalletSessionRepositoryUpsertResult {
  metadata: WalletSessionRepositoryMetadata;
  record: WalletSessionRecord;
}

export interface WalletSessionRepository {
  close(): Promise<void>;
  getBySessionId(
    sessionId: string,
    context?: WalletSessionRepositoryContext,
  ): Promise<WalletSessionRecord | undefined>;
  health(): Promise<WalletSessionRepositoryHealth>;
  list(
    filter?: WalletSessionRepositoryListFilter,
    context?: WalletSessionRepositoryContext,
  ): Promise<WalletSessionRecord[]>;
  reset(): Promise<void>;
  upsertSession(
    session: NormalizedWalletSession,
    context?: WalletSessionRepositoryContext,
  ): Promise<WalletSessionRepositoryUpsertResult>;
}

export interface CreateWalletSessionRepositoryOptions {
  boundedListLimit?: number;
  durableStore?: WalletSessionDurableStore;
  durableStoreFilePath?: string;
  mode?: WalletSessionRepositoryMode;
  now?: () => string;
  requestedDriverId?: string;
}

export interface CreateWalletSessionRecordOptions {
  adapterId: string;
  existingRecord?: WalletSessionRecord;
  now?: () => string;
  sequence: number;
  storeId: "wallet-sessions";
}

export class WalletSessionRepositoryError extends Error {
  readonly diagnostics: WalletSessionDiagnostic[];

  constructor(message: string, diagnostics: WalletSessionDiagnostic[]) {
    super(message);
    this.name = "WalletSessionRepositoryError";
    this.diagnostics = diagnostics;
  }
}

const DEFAULT_BOUNDED_LIST_LIMIT = 100;
const defaultNow = () => "2026-07-09T00:00:00.000Z";
const productionDependencyIds = [
  "live_wallet_provider",
  "live_wallet_proof_verifier",
  "session_signing_key",
  "secret_manager",
  "production_session_store",
] as const;
const secretLikeKeyFragments = [
  "apikey",
  "bearer",
  "cookie",
  "jwt",
  "mnemonic",
  "nonce",
  "objectkey",
  "password",
  "privatekey",
  "rawsignature",
  "secret",
  "seedphrase",
  "signature",
  "signedurl",
  "token",
  "url",
];

const diagnostic = (
  code: WalletSessionDiagnosticCode,
  field: string,
  message: string,
  severity: WalletSessionDiagnosticSeverity = "error",
): WalletSessionDiagnostic => ({
  code,
  field,
  message,
  severity,
});

const normalizeSecretKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const hasSecretLikeValue = (value: string) => {
  const normalizedValue = normalizeSecretKey(value);

  return value.includes("://") ||
    value.includes("@") ||
    secretLikeKeyFragments.some((fragment) => normalizedValue.includes(fragment));
};

const sanitizeDiagnosticValue = (value: string | undefined) => {
  if (value === undefined) {
    return undefined;
  }

  return hasSecretLikeValue(value) ? "[redacted]" : value;
};

const isNonEmptyString = (value: string | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0;

const unique = <T>(values: readonly T[]) => Array.from(new Set(values));

const clampLimit = (limit: number | undefined, max: number) => {
  if (!Number.isFinite(limit ?? max)) {
    return max;
  }

  return Math.max(1, Math.min(Math.trunc(limit ?? max), max));
};

const sortRecords = (records: readonly WalletSessionRecord[]) =>
  [...records].sort((left, right) => {
    const walletComparison = left.walletAddress.localeCompare(right.walletAddress);

    return walletComparison === 0 ? left.sessionId.localeCompare(right.sessionId) : walletComparison;
  });

const requiredString = (
  value: string | undefined,
  field: string,
  issues: WalletSessionDiagnostic[],
) => {
  if (!isNonEmptyString(value)) {
    issues.push(diagnostic(
      "WALLET_SESSION_REQUIRED_FIELD_MISSING",
      field,
      `Wallet session field '${field}' is required before repository persistence.`,
    ));

    return "";
  }

  return value.trim();
};

const normalizeTimestamp = (
  value: string | undefined,
  fallback: string,
) => {
  if (!value) {
    return fallback;
  }

  const parsed = Date.parse(value);

  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
};

const copyProof = (proof: NormalizedWalletSession["proof"]): WalletSessionProofRecord | undefined =>
  proof
    ? {
      diagnosticCodes: [...proof.diagnosticCodes],
      liveVerificationExecuted: false,
      proofType: proof.proofType,
      status: proof.status,
      trustLevel: proof.trustLevel,
    }
    : undefined;

const copyIssuer = (issuer: NormalizedWalletSession["issuer"]): WalletSessionIssuerRecord | undefined =>
  issuer
    ? {
      artifactType: issuer.artifactType,
      cookieIssued: false,
      diagnosticCodes: [...issuer.diagnosticCodes],
      issuerMode: issuer.issuerMode,
      jwtIssued: false,
      liveSigningExecuted: false,
      referenceId: issuer.referenceId,
      ttlSeconds: issuer.ttlSeconds,
      valid: issuer.valid,
    }
    : undefined;

const defaultProductionReadiness = (): WalletSessionProductionReadinessRecord => ({
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
});

const copyProductionReadiness = (
  readiness: WalletSessionProductionReadinessSummary | undefined,
): WalletSessionProductionReadinessRecord => {
  if (!readiness) {
    return defaultProductionReadiness();
  }

  return {
    blockedDependencyIds: [...readiness.blockedDependencyIds],
    liveSigningReady: readiness.liveSigningReady,
    liveVerifierReady: readiness.liveVerifierReady,
    productionReady: false,
    productionRequired: readiness.productionRequired,
    productionSessionStoreReady: readiness.productionSessionStoreReady,
    secretManagerReady: readiness.secretManagerReady,
    signingKeyReady: readiness.signingKeyReady,
  };
};

export const createWalletSessionRecord = (
  session: NormalizedWalletSession,
  {
    adapterId,
    existingRecord,
    now = defaultNow,
    sequence,
    storeId,
  }: CreateWalletSessionRecordOptions,
): WalletSessionRecord => {
  const issues: WalletSessionDiagnostic[] = [];
  const sessionId = requiredString(session.sessionId, "sessionId", issues);
  const walletAddress = requiredString(session.address, "address", issues);

  if (issues.length > 0) {
    throw new WalletSessionRepositoryError("Invalid wallet session repository record.", issues);
  }

  const fallbackTimestamp = now();
  const connectedAt = existingRecord?.connectedAt ?? normalizeTimestamp(session.connectedAt, fallbackTimestamp);
  const lastSeenAt = normalizeTimestamp(session.lastSeenAt, fallbackTimestamp);

  return {
    accountType: session.accountType,
    capabilities: [...session.capabilities],
    chainId: session.chainId,
    connectedAt,
    displayAddress: session.displayAddress || walletAddress,
    ...(session.issuer ? { issuer: copyIssuer(session.issuer) } : {}),
    lastSeenAt,
    network: session.network,
    productionReadiness: copyProductionReadiness(session.productionReadiness),
    ...(session.proof ? { proof: copyProof(session.proof) } : {}),
    recordId: `wallet-session:${sessionId}`,
    repository: {
      adapterId,
      repositoryId: "wallet-session-repository-runtime",
      sequence,
      storeId,
    },
    sessionId,
    signatureStatus: session.signatureStatus,
    verificationStatus: session.verificationStatus,
    walletAddress,
    walletName: session.walletName,
    walletSource: session.walletSource,
    walletTypeVerified: session.walletTypeVerified,
  };
};

const productionRequiredDiagnostic = (requestedDriverId: string | undefined) =>
  diagnostic(
    "WALLET_SESSION_REPOSITORY_PRODUCTION_REQUIRED",
    "requestedDriverId",
    `Wallet session production repository '${
      sanitizeDiagnosticValue(requestedDriverId) ?? "not_configured"
    }' is required and cannot fallback to deterministic local storage.`,
  );

const toRepositoryDiagnostic = (issue: {
  code: WalletSessionDiagnosticCode;
  field: string;
  message: string;
  severity: WalletSessionDiagnosticSeverity;
}): WalletSessionDiagnostic => ({
  code: issue.code,
  field: issue.field,
  message: issue.message,
  severity: issue.severity,
});

export const createWalletSessionRepository = ({
  boundedListLimit = DEFAULT_BOUNDED_LIST_LIMIT,
  durableStore,
  durableStoreFilePath,
  mode = "deterministic_test",
  now = defaultNow,
  requestedDriverId,
}: CreateWalletSessionRepositoryOptions = {}): WalletSessionRepository => {
  const recordsBySessionId = new Map<string, WalletSessionRecord>();
  const adapterId =
    mode === "production_required"
      ? "wallet-session-production-adapter-required"
      : mode === "durable_test"
        ? "wallet-session-durable-test-adapter"
        : "wallet-session-deterministic-adapter";
  const activeDurableStore =
    mode === "durable_test"
      ? durableStore ??
        createWalletSessionDurableStore({
          boundedListLimit,
          filePath: durableStoreFilePath,
          mode: "durable_test",
        })
      : undefined;
  const productionDiagnostics =
    mode === "production_required" ? [productionRequiredDiagnostic(requestedDriverId)] : [];
  let sequence = 0;

  const assertWritable = () => {
    if (mode === "production_required") {
      throw new WalletSessionRepositoryError(
        "Wallet session production repository is required.",
        productionDiagnostics,
      );
    }
  };

  const getExistingBySessionId = async (sessionId: string) =>
    activeDurableStore
      ? await activeDurableStore.getBySessionId(sessionId)
      : recordsBySessionId.get(sessionId);

  const nextSequence = (existingRecord: WalletSessionRecord | undefined) => {
    if (existingRecord) {
      return existingRecord.repository.sequence;
    }

    sequence += 1;

    return sequence;
  };

  const durableDiagnostics = async () =>
    activeDurableStore
      ? (await activeDurableStore.manifest()).diagnostics.map(toRepositoryDiagnostic)
      : [];

  const recordCount = async () =>
    activeDurableStore ? (await activeDurableStore.manifest()).recordCount : recordsBySessionId.size;

  const health = async (): Promise<WalletSessionRepositoryHealth> => {
    const walletSessionStore = activeDurableStore ? await activeDurableStore.manifest() : undefined;
    const diagnostics = [...productionDiagnostics, ...await durableDiagnostics()];
    const blockedDependencyIds =
      mode === "production_required" ? [...productionDependencyIds] : [];

    return {
      adapterId,
      blockedDependencyIds,
      boundedListLimit,
      cookieIssued: false,
      diagnosticCodes: unique(diagnostics.map((issue) => issue.code)),
      diagnostics,
      fallbackUsed: false,
      id: "wallet-session-repository-runtime",
      jwtIssued: false,
      liveProofVerificationExecuted: false,
      liveWalletSdkExecuted: false,
      productionReady: false,
      recordCount: await recordCount(),
      secretStored: false,
      selectedMode: mode,
      status: diagnostics.some((issue) => issue.severity === "error") ? "blocked" : "ready",
      storeId: "wallet-sessions",
      validation: {
        issues: diagnostics,
        valid: diagnostics.length === 0,
      },
      ...(walletSessionStore ? { walletSessionStore } : {}),
    };
  };

  return {
    close: async () => {
      await activeDurableStore?.close();
    },
    getBySessionId: async (sessionId) => getExistingBySessionId(sessionId),
    health,
    list: async (filter = {}) => {
      const limit = clampLimit(filter.limit, boundedListLimit);

      if (activeDurableStore) {
        return await activeDurableStore.list(filter);
      }

      return sortRecords(Array.from(recordsBySessionId.values()))
        .filter((record) => {
          if (filter.walletAddress && record.walletAddress !== filter.walletAddress) {
            return false;
          }

          if (filter.walletSource && record.walletSource !== filter.walletSource) {
            return false;
          }

          return true;
        })
        .slice(0, limit);
    },
    reset: async () => {
      recordsBySessionId.clear();
      sequence = 0;
      await activeDurableStore?.reset();
    },
    upsertSession: async (session) => {
      assertWritable();

      const existingRecord = await getExistingBySessionId(session.sessionId);
      const record = createWalletSessionRecord(session, {
        adapterId,
        existingRecord,
        now,
        sequence: nextSequence(existingRecord),
        storeId: "wallet-sessions",
      });

      if (activeDurableStore) {
        await activeDurableStore.upsert(record);
      } else {
        recordsBySessionId.set(record.sessionId, record);
      }

      return {
        metadata: {
          adapterId,
          created: !existingRecord,
          recordId: record.recordId,
          repositoryId: "wallet-session-repository-runtime",
          sessionId: record.sessionId,
          storeId: "wallet-sessions",
          upserted: true,
          walletAddress: record.walletAddress,
        },
        record,
      };
    },
  };
};
