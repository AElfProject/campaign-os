import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  WalletSessionDiagnostic,
  WalletSessionDiagnosticCode,
  WalletSessionRecord,
  WalletSessionRepositoryMode,
  WalletSessionRepositoryStatus,
} from "./walletSessionRepository";

export type WalletSessionDurableStoreMode = Extract<
  WalletSessionRepositoryMode,
  "durable_test" | "production_required"
>;

export interface WalletSessionDurableStoreManifest {
  boundedListLimit: number;
  diagnosticCodes: WalletSessionDiagnosticCode[];
  diagnostics: WalletSessionDiagnostic[];
  durable: true;
  fallbackUsed: false;
  mode: WalletSessionDurableStoreMode;
  recordCount: number;
  status: WalletSessionRepositoryStatus;
  storeId: "wallet-sessions";
}

export interface WalletSessionDurableStoreListOptions {
  limit?: number;
  walletAddress?: string;
  walletSource?: string;
}

export interface WalletSessionDurableStore {
  close(): Promise<void>;
  getBySessionId(sessionId: string): Promise<WalletSessionRecord | undefined>;
  list(filter?: WalletSessionDurableStoreListOptions): Promise<WalletSessionRecord[]>;
  manifest(): Promise<WalletSessionDurableStoreManifest>;
  reset(): Promise<void>;
  upsert(record: WalletSessionRecord): Promise<WalletSessionRecord>;
}

export interface CreateWalletSessionDurableStoreOptions {
  boundedListLimit?: number;
  filePath?: string;
  mode?: WalletSessionDurableStoreMode;
}

interface WalletSessionDurableStoreDocument {
  records: WalletSessionRecord[];
  updatedAt: string;
  version: 1;
}

export class WalletSessionDurableStoreError extends Error {
  readonly diagnostics: WalletSessionDiagnostic[];

  constructor(message: string, diagnostics: WalletSessionDiagnostic[]) {
    super(message);
    this.name = "WalletSessionDurableStoreError";
    this.diagnostics = diagnostics;
  }
}

const DEFAULT_BOUNDED_LIST_LIMIT = 100;
const EMPTY_DOCUMENT: WalletSessionDurableStoreDocument = {
  records: [],
  updatedAt: "1970-01-01T00:00:00.000Z",
  version: 1,
};

const diagnostic = (
  code: WalletSessionDiagnosticCode,
  field: string,
  message: string,
): WalletSessionDiagnostic => ({
  code,
  field,
  message,
  severity: "error",
});

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

const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const isRecordObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const sanitizePersistedRecord = (value: unknown): WalletSessionRecord | undefined => {
  if (!isRecordObject(value)) {
    return undefined;
  }

  const repository = isRecordObject(value.repository) ? value.repository : {};
  const productionReadiness = isRecordObject(value.productionReadiness)
    ? value.productionReadiness
    : {};

  if (
    typeof value.sessionId !== "string" ||
    typeof value.walletAddress !== "string" ||
    typeof value.recordId !== "string"
  ) {
    return undefined;
  }

  return {
    accountType: value.accountType as WalletSessionRecord["accountType"],
    capabilities: stringArray(value.capabilities) as WalletSessionRecord["capabilities"],
    chainId: value.chainId as WalletSessionRecord["chainId"],
    connectedAt: typeof value.connectedAt === "string" ? value.connectedAt : "1970-01-01T00:00:00.000Z",
    displayAddress: typeof value.displayAddress === "string" ? value.displayAddress : value.walletAddress,
    ...(isRecordObject(value.issuer)
      ? {
        issuer: {
          artifactType: value.issuer.artifactType as WalletSessionRecord["issuer"] extends infer T
            ? T extends { artifactType: infer U } ? U : never
            : never,
          cookieIssued: false,
          diagnosticCodes: stringArray(value.issuer.diagnosticCodes),
          issuerMode: value.issuer.issuerMode as NonNullable<WalletSessionRecord["issuer"]>["issuerMode"],
          jwtIssued: false,
          liveSigningExecuted: false,
          referenceId: typeof value.issuer.referenceId === "string" ? value.issuer.referenceId : "",
          ttlSeconds: typeof value.issuer.ttlSeconds === "number" ? value.issuer.ttlSeconds : 0,
          valid: value.issuer.valid === true,
        },
      }
      : {}),
    lastSeenAt: typeof value.lastSeenAt === "string" ? value.lastSeenAt : "1970-01-01T00:00:00.000Z",
    network: value.network as WalletSessionRecord["network"],
    productionReadiness: {
      blockedDependencyIds: stringArray(productionReadiness.blockedDependencyIds),
      liveSigningReady: productionReadiness.liveSigningReady === true,
      liveVerifierReady: productionReadiness.liveVerifierReady === true,
      productionReady: false,
      productionRequired: productionReadiness.productionRequired === true,
      productionSessionStoreReady: productionReadiness.productionSessionStoreReady === true,
      secretManagerReady: productionReadiness.secretManagerReady === true,
      signingKeyReady: productionReadiness.signingKeyReady === true,
    },
    ...(isRecordObject(value.proof)
      ? {
        proof: {
          diagnosticCodes: stringArray(value.proof.diagnosticCodes),
          liveVerificationExecuted: false,
          proofType: value.proof.proofType as NonNullable<WalletSessionRecord["proof"]>["proofType"],
          status: value.proof.status as NonNullable<WalletSessionRecord["proof"]>["status"],
          trustLevel: value.proof.trustLevel as NonNullable<WalletSessionRecord["proof"]>["trustLevel"],
        },
      }
      : {}),
    recordId: value.recordId,
    repository: {
      adapterId: typeof repository.adapterId === "string" ? repository.adapterId : "wallet-session-durable-test-adapter",
      repositoryId: "wallet-session-repository-runtime",
      sequence: typeof repository.sequence === "number" ? repository.sequence : 0,
      storeId: "wallet-sessions",
    },
    sessionId: value.sessionId,
    signatureStatus: value.signatureStatus as WalletSessionRecord["signatureStatus"],
    verificationStatus: value.verificationStatus as WalletSessionRecord["verificationStatus"],
    walletAddress: value.walletAddress,
    walletName: typeof value.walletName === "string" ? value.walletName : "",
    walletSource: value.walletSource as WalletSessionRecord["walletSource"],
    walletTypeVerified: value.walletTypeVerified === true,
  };
};

const parseDocument = (raw: string): WalletSessionDurableStoreDocument => {
  const parsed = JSON.parse(raw) as Partial<WalletSessionDurableStoreDocument>;

  if (parsed.version !== 1 || !Array.isArray(parsed.records)) {
    throw new Error("Invalid wallet session durable store document.");
  }

  return {
    records: parsed.records
      .map(sanitizePersistedRecord)
      .filter((record): record is WalletSessionRecord => Boolean(record)),
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : EMPTY_DOCUMENT.updatedAt,
    version: 1,
  };
};

export const createWalletSessionDurableStore = ({
  boundedListLimit = DEFAULT_BOUNDED_LIST_LIMIT,
  filePath,
  mode = "durable_test",
}: CreateWalletSessionDurableStoreOptions = {}): WalletSessionDurableStore => {
  const recordsBySessionId = new Map<string, WalletSessionRecord>();
  const startupDiagnostics: WalletSessionDiagnostic[] = [];
  let initialized = false;

  if (!filePath) {
    startupDiagnostics.push(diagnostic(
      "WALLET_SESSION_DURABLE_STORE_PATH_REQUIRED",
      "filePath",
      "Wallet session durable store requires an explicit file path in durable modes.",
    ));
  }

  const readDocument = async () => {
    if (!filePath) {
      return { ...EMPTY_DOCUMENT };
    }

    try {
      return parseDocument(await readFile(filePath, "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { ...EMPTY_DOCUMENT };
      }

      startupDiagnostics.push(diagnostic(
        "WALLET_SESSION_DURABLE_STORE_READ_FAILED",
        "filePath",
        "Wallet session durable store could not read persisted wallet sessions.",
      ));

      return { ...EMPTY_DOCUMENT };
    }
  };

  const ensureInitialized = async () => {
    if (initialized) {
      return;
    }

    initialized = true;
    const document = await readDocument();
    recordsBySessionId.clear();

    for (const record of document.records) {
      recordsBySessionId.set(record.sessionId, record);
    }
  };

  const writeDocument = async () => {
    if (!filePath) {
      return;
    }

    const document: WalletSessionDurableStoreDocument = {
      records: sortRecords(Array.from(recordsBySessionId.values())),
      updatedAt: new Date(0).toISOString(),
      version: 1,
    };
    const tempPath = `${filePath}.tmp`;

    try {
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(tempPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
      await rename(tempPath, filePath);
    } catch {
      const issue = diagnostic(
        "WALLET_SESSION_DURABLE_STORE_WRITE_FAILED",
        "filePath",
        "Wallet session durable store could not persist wallet sessions.",
      );

      startupDiagnostics.push(issue);
      throw new WalletSessionDurableStoreError("Wallet session durable store write failed.", [issue]);
    }
  };

  const productionRequiredDiagnostics = () =>
    mode === "production_required"
      ? [diagnostic(
        "WALLET_SESSION_DURABLE_STORE_PRODUCTION_REQUIRED",
        "mode",
        "Production-required wallet session store cannot use local durable-test fallback.",
      )]
      : [];

  const currentDiagnostics = () => [
    ...startupDiagnostics,
    ...productionRequiredDiagnostics(),
  ];

  return {
    close: async () => {
      await writeDocument();
    },
    getBySessionId: async (sessionId) => {
      await ensureInitialized();

      return recordsBySessionId.get(sessionId);
    },
    list: async (filter = {}) => {
      await ensureInitialized();
      const limit = clampLimit(filter.limit, boundedListLimit);

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
    manifest: async () => {
      await ensureInitialized();
      const diagnostics = currentDiagnostics();

      return {
        boundedListLimit,
        diagnosticCodes: diagnostics.map((issue) => issue.code),
        diagnostics,
        durable: true,
        fallbackUsed: false,
        mode,
        recordCount: recordsBySessionId.size,
        status: diagnostics.length > 0 ? "blocked" : "ready",
        storeId: "wallet-sessions",
      };
    },
    reset: async () => {
      recordsBySessionId.clear();
      initialized = true;

      if (filePath) {
        await rm(filePath, { force: true });
      }
    },
    upsert: async (record) => {
      await ensureInitialized();
      recordsBySessionId.set(record.sessionId, record);
      await writeDocument();

      return record;
    },
  };
};
