import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  AccountType,
  LocalizedText,
  SupportedLocale,
  WalletSource,
} from "../domain/types";
import type { ApiRuntimeRouteId } from "./routes";
import type { CampaignOsPersistenceConfig, CampaignOsPersistenceMode } from "./config";

export type PersistenceRecordKind =
  | "wallet_session"
  | "campaign_draft"
  | "task_draft"
  | "verification_attempt"
  | "i18n_draft"
  | "export_preview";

export type PersistenceSummaryValue = boolean | number | string | string[];
export type PersistenceSummary = Record<string, PersistenceSummaryValue>;

export interface CampaignOsPersistenceRecordInput {
  accountType?: AccountType;
  campaignId?: string;
  kind: PersistenceRecordKind;
  locale?: SupportedLocale;
  routeId: ApiRuntimeRouteId;
  summary?: PersistenceSummary;
  taskId?: string;
  traceId: string;
  walletAddress?: string;
  walletSource?: WalletSource;
}

export interface CampaignOsPersistenceRecord extends CampaignOsPersistenceRecordInput {
  createdAt: string;
  id: string;
  summary: PersistenceSummary;
}

export type PersistenceCountsByKind = Record<PersistenceRecordKind, number>;

export interface PersistenceSnapshot {
  countsByKind: PersistenceCountsByKind;
  latestRecords: CampaignOsPersistenceRecord[];
  mode: CampaignOsPersistenceMode;
  recordCount: number;
}

export interface PersistenceHealth extends PersistenceSnapshot {
  adapterLabel: string;
  adapterPortId: string;
  boundary: LocalizedText;
  durable: boolean;
  localOnly: true;
  noMigrationRunner: true;
  noProductionDatabase: true;
  noSecretHandling: true;
  status: "ok" | "unavailable";
}

export interface CampaignOsRepository {
  health(): Promise<PersistenceHealth>;
  initialize(): Promise<void>;
  record(input: CampaignOsPersistenceRecordInput): Promise<CampaignOsPersistenceRecord>;
  reset?(): Promise<void>;
  snapshot(): Promise<PersistenceSnapshot>;
}

interface JsonStoreDocument {
  records: CampaignOsPersistenceRecord[];
  updatedAt: string;
  version: 1;
}

const recordKinds: PersistenceRecordKind[] = [
  "wallet_session",
  "campaign_draft",
  "task_draft",
  "verification_attempt",
  "i18n_draft",
  "export_preview",
];

const forbiddenKeyFragments = [
  "apikey",
  "bearer",
  "mnemonic",
  "objectkey",
  "password",
  "privatekey",
  "secret",
  "seedphrase",
  "signature",
  "signedurl",
  "token",
];

const emptyCounts = (): PersistenceCountsByKind =>
  Object.fromEntries(recordKinds.map((kind) => [kind, 0])) as PersistenceCountsByKind;

const hasForbiddenKey = (key: string) => {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");

  return forbiddenKeyFragments.some((fragment) => normalized.includes(fragment));
};

const sanitizeSummaryValue = (value: unknown): PersistenceSummaryValue | undefined => {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    const strings = value.filter((item): item is string => typeof item === "string");

    return strings.length > 0 ? strings : undefined;
  }

  return undefined;
};

export const sanitizePersistenceSummary = (summary: Record<string, unknown> = {}): PersistenceSummary =>
  Object.fromEntries(
    Object.entries(summary)
      .filter(([key]) => !hasForbiddenKey(key))
      .map(([key, value]) => [key, sanitizeSummaryValue(value)])
      .filter((entry): entry is [string, PersistenceSummaryValue] => entry[1] !== undefined),
  );

export const persistenceBoundary: LocalizedText = {
  "en-US":
    "Local Campaign OS persistence boundary only. No production database, migration runner, provider call, wallet signature, contract write, storage-backed export, reward custody, or reward distribution is executed.",
  "zh-CN":
    "仅本地 Campaign OS 持久化边界。不会执行生产数据库、migration runner、provider 调用、钱包签名、合约写入、storage-backed 导出、奖励托管或发奖。",
  "zh-TW":
    "僅本地 Campaign OS 持久化邊界。不會執行生產資料庫、migration runner、provider 呼叫、錢包簽名、合約寫入、storage-backed 匯出、獎勵託管或發獎。",
};

let recordSequence = 0;

const createRecordId = (kind: PersistenceRecordKind) => {
  recordSequence += 1;

  return `${kind}-${Date.now().toString(36)}-${recordSequence}`;
};

const createRecord = (input: CampaignOsPersistenceRecordInput): CampaignOsPersistenceRecord => ({
  ...input,
  createdAt: new Date().toISOString(),
  id: createRecordId(input.kind),
  summary: sanitizePersistenceSummary(input.summary),
});

const createSnapshot = (
  mode: CampaignOsPersistenceMode,
  records: readonly CampaignOsPersistenceRecord[],
): PersistenceSnapshot => {
  const countsByKind = emptyCounts();

  for (const record of records) {
    countsByKind[record.kind] += 1;
  }

  return {
    countsByKind,
    latestRecords: records.slice(-10).reverse(),
    mode,
    recordCount: records.length,
  };
};

const createHealth = ({
  adapterLabel,
  adapterPortId,
  durable,
  mode,
  records,
  status = "ok",
}: {
  adapterLabel: string;
  adapterPortId: string;
  durable: boolean;
  mode: CampaignOsPersistenceMode;
  records: readonly CampaignOsPersistenceRecord[];
  status?: PersistenceHealth["status"];
}): PersistenceHealth => ({
  ...createSnapshot(mode, records),
  adapterLabel,
  adapterPortId,
  boundary: persistenceBoundary,
  durable,
  localOnly: true,
  noMigrationRunner: true,
  noProductionDatabase: true,
  noSecretHandling: true,
  status,
});

export const createCampaignOsMemoryRepository = (
  config: Partial<CampaignOsPersistenceConfig> = {},
): CampaignOsRepository => {
  const records: CampaignOsPersistenceRecord[] = [];
  const adapterLabel = config.adapterLabel ?? "memory";

  return {
    initialize: async () => undefined,
    record: async (input) => {
      const record = createRecord(input);
      records.push(record);
      return record;
    },
    reset: async () => {
      records.length = 0;
    },
    snapshot: async () => createSnapshot("memory", records),
    health: async () =>
      createHealth({
        adapterLabel,
        adapterPortId: "campaign-os-memory-adapter",
        durable: false,
        mode: "memory",
        records,
      }),
  };
};

const emptyDocument = (): JsonStoreDocument => ({
  records: [],
  updatedAt: new Date().toISOString(),
  version: 1,
});

const isPersistenceRecordKind = (value: unknown): value is PersistenceRecordKind =>
  typeof value === "string" && recordKinds.includes(value as PersistenceRecordKind);

const parseRecord = (value: unknown): CampaignOsPersistenceRecord | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Partial<CampaignOsPersistenceRecord>;

  if (
    typeof record.id !== "string"
    || !isPersistenceRecordKind(record.kind)
    || typeof record.routeId !== "string"
    || typeof record.traceId !== "string"
    || typeof record.createdAt !== "string"
  ) {
    return undefined;
  }

  return {
    accountType: record.accountType,
    campaignId: record.campaignId,
    createdAt: record.createdAt,
    id: record.id,
    kind: record.kind,
    locale: record.locale,
    routeId: record.routeId as ApiRuntimeRouteId,
    summary: sanitizePersistenceSummary(record.summary),
    taskId: record.taskId,
    traceId: record.traceId,
    walletAddress: record.walletAddress,
    walletSource: record.walletSource,
  };
};

const parseDocument = (contents: string): JsonStoreDocument => {
  const parsed = JSON.parse(contents) as Partial<JsonStoreDocument>;

  return {
    records: Array.isArray(parsed.records)
      ? parsed.records
        .map(parseRecord)
        .filter((record): record is CampaignOsPersistenceRecord => Boolean(record))
      : [],
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    version: 1,
  };
};

export const createCampaignOsJsonRepository = ({
  adapterLabel = "local_json",
  localDataDir,
}: CampaignOsPersistenceConfig): CampaignOsRepository => {
  if (!localDataDir) {
    throw new Error("local_json persistence requires localDataDir.");
  }

  const filePath = join(localDataDir, "campaign-os-persistence.json");
  let document = emptyDocument();
  let initialized = false;

  const ensureInitialized = async () => {
    if (!initialized) {
      await repository.initialize();
    }
  };

  const persist = async () => {
    document = {
      ...document,
      updatedAt: new Date().toISOString(),
    };

    await mkdir(dirname(filePath), { recursive: true });

    const tempPath = `${filePath}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
    await rename(tempPath, filePath);
  };

  const repository: CampaignOsRepository = {
    initialize: async () => {
      await mkdir(dirname(filePath), { recursive: true });

      try {
        document = parseDocument(await readFile(filePath, "utf8"));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }

        document = emptyDocument();
        await persist();
      }

      initialized = true;
    },
    record: async (input) => {
      await ensureInitialized();

      const record = createRecord(input);
      document.records.push(record);
      await persist();

      return record;
    },
    reset: async () => {
      document = emptyDocument();
      await persist();
    },
    snapshot: async () => {
      await ensureInitialized();

      return createSnapshot("local_json", document.records);
    },
    health: async () => {
      await ensureInitialized();

      return createHealth({
        adapterLabel,
        adapterPortId: "campaign-os-local-json-adapter",
        durable: true,
        mode: "local_json",
        records: document.records,
      });
    },
  };

  return repository;
};

export const createCampaignOsRepository = (
  config: CampaignOsPersistenceConfig,
): CampaignOsRepository => {
  if (config.mode === "local_json") {
    return createCampaignOsJsonRepository(config);
  }

  return createCampaignOsMemoryRepository(config);
};
