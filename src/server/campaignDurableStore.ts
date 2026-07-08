import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  CampaignDbDraft,
  CampaignDbDiagnostic,
  CampaignDbTaskCompletion,
  CampaignDbTaskDraft,
} from "./campaignDbRepository";

export type CampaignDurableStoreMode = "local_seeded" | "durable_test" | "production_required";
export type CampaignDurableStoreStatus = "ready" | "blocked";
export type CampaignDurableStoreDiagnosticCode =
  | "CAMPAIGN_DURABLE_STORE_PATH_REQUIRED"
  | "CAMPAIGN_DURABLE_STORE_READ_FAILED"
  | "CAMPAIGN_DURABLE_STORE_WRITE_FAILED"
  | "CAMPAIGN_DURABLE_STORE_PRODUCTION_REQUIRED";

export interface CampaignDurableStoreDiagnostic {
  code: CampaignDurableStoreDiagnosticCode;
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
}

export class CampaignDurableStoreError extends Error {
  readonly diagnostics: CampaignDurableStoreDiagnostic[];

  constructor(message: string, diagnostics: CampaignDurableStoreDiagnostic[]) {
    super(message);
    this.name = "CampaignDurableStoreError";
    this.diagnostics = diagnostics;
  }
}

export interface CampaignDurableStoreManifest {
  boundedListLimit: number;
  diagnosticCodes: CampaignDurableStoreDiagnosticCode[];
  diagnostics: CampaignDurableStoreDiagnostic[];
  durable: boolean;
  fallbackUsed: false;
  mode: CampaignDurableStoreMode;
  completionRecordCount: number;
  recordCount: number;
  status: CampaignDurableStoreStatus;
  storeId: "campaign-db";
  taskRecordCount: number;
}

export interface CampaignDurableStoreListOptions {
  limit?: number;
  ownerAddress?: string;
  projectId?: string;
  status?: string;
}

export interface CampaignDurableStore {
  close(): Promise<void>;
  create(draft: CampaignDbDraft): Promise<CampaignDbDraft>;
  createTaskDraft(taskDraft: CampaignDbTaskDraft): Promise<CampaignDbTaskDraft>;
  getById(campaignId: string): Promise<CampaignDbDraft | undefined>;
  list(filter?: CampaignDurableStoreListOptions): Promise<CampaignDbDraft[]>;
  listTaskCompletionsByCampaignId(campaignId: string): Promise<CampaignDbTaskCompletion[]>;
  listTaskDraftsByCampaignId(campaignId: string): Promise<CampaignDbTaskDraft[]>;
  manifest(): Promise<CampaignDurableStoreManifest>;
  reset(): Promise<void>;
  upsertTaskCompletion(completion: CampaignDbTaskCompletion): Promise<CampaignDbTaskCompletion>;
}

export interface CreateCampaignDurableStoreOptions {
  boundedListLimit?: number;
  filePath?: string;
  mode?: CampaignDurableStoreMode;
}

interface CampaignDurableStoreDocument {
  completionRecords: CampaignDbTaskCompletion[];
  records: CampaignDbDraft[];
  taskRecords: CampaignDbTaskDraft[];
  updatedAt: string;
  version: 1;
}

const DEFAULT_BOUNDED_LIST_LIMIT = 100;
const EMPTY_DOCUMENT: CampaignDurableStoreDocument = {
  completionRecords: [],
  records: [],
  taskRecords: [],
  updatedAt: "1970-01-01T00:00:00.000Z",
  version: 1,
};

const diagnostic = (
  code: CampaignDurableStoreDiagnosticCode,
  field: string,
  message: string,
): CampaignDurableStoreDiagnostic => ({
  code,
  field,
  message,
  severity: "error",
});

export const toCampaignDbDiagnostics = (
  issues: readonly CampaignDurableStoreDiagnostic[],
): CampaignDbDiagnostic[] =>
  issues.map((issue) => ({
    code: issue.code as CampaignDbDiagnostic["code"],
    field: issue.field,
    message: issue.message,
    severity: issue.severity,
  }));

const clampLimit = (limit: number | undefined, max: number) => {
  if (!Number.isFinite(limit ?? max)) {
    return max;
  }

  return Math.max(1, Math.min(Math.trunc(limit ?? max), max));
};

const sortDrafts = (records: readonly CampaignDbDraft[]) =>
  [...records].sort((left, right) => {
    const createdAtComparison = left.createdAt.localeCompare(right.createdAt);

    return createdAtComparison === 0 ? left.id.localeCompare(right.id) : createdAtComparison;
  });

const sortTaskDrafts = (records: readonly CampaignDbTaskDraft[]) =>
  [...records].sort((left, right) => {
    const campaignComparison = left.campaignId.localeCompare(right.campaignId);

    return campaignComparison === 0 ? left.id.localeCompare(right.id) : campaignComparison;
  });

const sortTaskCompletions = (records: readonly CampaignDbTaskCompletion[]) =>
  [...records].sort((left, right) => {
    const campaignComparison = left.campaignId.localeCompare(right.campaignId);

    if (campaignComparison !== 0) {
      return campaignComparison;
    }

    const walletComparison = left.walletAddress.localeCompare(right.walletAddress);

    return walletComparison === 0 ? left.taskId.localeCompare(right.taskId) : walletComparison;
  });

const parseDocument = (raw: string): CampaignDurableStoreDocument => {
  const parsed = JSON.parse(raw) as Partial<CampaignDurableStoreDocument>;

  if (parsed.version !== 1 || !Array.isArray(parsed.records)) {
    return { ...EMPTY_DOCUMENT };
  }

  return {
    completionRecords: Array.isArray(parsed.completionRecords) ? parsed.completionRecords : [],
    records: parsed.records,
    taskRecords: Array.isArray(parsed.taskRecords) ? parsed.taskRecords : [],
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : EMPTY_DOCUMENT.updatedAt,
    version: 1,
  };
};

export const createCampaignDurableStore = ({
  boundedListLimit = DEFAULT_BOUNDED_LIST_LIMIT,
  filePath,
  mode = "local_seeded",
}: CreateCampaignDurableStoreOptions = {}): CampaignDurableStore => {
  const recordsById = new Map<string, CampaignDbDraft>();
  const taskCompletionsById = new Map<string, CampaignDbTaskCompletion>();
  const taskRecordsById = new Map<string, CampaignDbTaskDraft>();
  const startupDiagnostics: CampaignDurableStoreDiagnostic[] = [];
  let initialized = false;
  const durable = mode === "durable_test" || mode === "production_required";

  if (durable && !filePath) {
    startupDiagnostics.push(diagnostic(
      "CAMPAIGN_DURABLE_STORE_PATH_REQUIRED",
      "filePath",
      "Campaign durable store requires an explicit file path in durable modes.",
    ));
  }

  const readDocument = async () => {
    if (!filePath || !durable) {
      return { ...EMPTY_DOCUMENT };
    }

    try {
      return parseDocument(await readFile(filePath, "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { ...EMPTY_DOCUMENT };
      }

      startupDiagnostics.push(diagnostic(
        "CAMPAIGN_DURABLE_STORE_READ_FAILED",
        "filePath",
        "Campaign durable store could not read persisted campaign drafts.",
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
    recordsById.clear();
    taskCompletionsById.clear();
    taskRecordsById.clear();

    for (const draft of document.records) {
      recordsById.set(draft.id, draft);
    }

    for (const taskDraft of document.taskRecords) {
      taskRecordsById.set(taskDraft.id, taskDraft);
    }

    for (const completion of document.completionRecords) {
      taskCompletionsById.set(completion.id, completion);
    }
  };

  const writeDocument = async () => {
    if (!filePath || !durable) {
      return;
    }

    const document: CampaignDurableStoreDocument = {
      completionRecords: sortTaskCompletions(Array.from(taskCompletionsById.values())),
      records: sortDrafts(Array.from(recordsById.values())),
      taskRecords: sortTaskDrafts(Array.from(taskRecordsById.values())),
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
        "CAMPAIGN_DURABLE_STORE_WRITE_FAILED",
        "filePath",
        "Campaign durable store could not persist campaign drafts.",
      );

      startupDiagnostics.push(issue);
      throw new CampaignDurableStoreError("Campaign durable store write failed.", [issue]);
    }
  };

  const productionRequiredDiagnostics = () =>
    mode === "production_required" && !durable
      ? [diagnostic(
        "CAMPAIGN_DURABLE_STORE_PRODUCTION_REQUIRED",
        "mode",
        "Production-required campaign store cannot use local/seeded fallback.",
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
    create: async (draft) => {
      await ensureInitialized();
      recordsById.set(draft.id, draft);
      await writeDocument();

      return draft;
    },
    createTaskDraft: async (taskDraft) => {
      await ensureInitialized();
      taskRecordsById.set(taskDraft.id, taskDraft);
      await writeDocument();

      return taskDraft;
    },
    getById: async (campaignId) => {
      await ensureInitialized();

      return recordsById.get(campaignId);
    },
    list: async (filter = {}) => {
      await ensureInitialized();
      const limit = clampLimit(filter.limit, boundedListLimit);

      return sortDrafts(Array.from(recordsById.values()))
        .filter((draft) => {
          if (filter.projectId && draft.projectId !== filter.projectId) {
            return false;
          }

          if (filter.ownerAddress && draft.ownerAddress !== filter.ownerAddress) {
            return false;
          }

          if (filter.status && draft.status !== filter.status) {
            return false;
          }

          return true;
        })
        .slice(0, limit);
    },
    listTaskDraftsByCampaignId: async (campaignId) => {
      await ensureInitialized();

      return sortTaskDrafts(Array.from(taskRecordsById.values()))
        .filter((taskDraft) => taskDraft.campaignId === campaignId);
    },
    listTaskCompletionsByCampaignId: async (campaignId) => {
      await ensureInitialized();

      return sortTaskCompletions(Array.from(taskCompletionsById.values()))
        .filter((completion) => completion.campaignId === campaignId);
    },
    manifest: async () => {
      await ensureInitialized();
      const diagnostics = currentDiagnostics();

      return {
        boundedListLimit,
        completionRecordCount: taskCompletionsById.size,
        diagnosticCodes: diagnostics.map((issue) => issue.code),
        diagnostics,
        durable,
        fallbackUsed: false,
        mode,
        recordCount: recordsById.size,
        status: diagnostics.length > 0 ? "blocked" : "ready",
        storeId: "campaign-db",
        taskRecordCount: taskRecordsById.size,
      };
    },
    reset: async () => {
      recordsById.clear();
      taskCompletionsById.clear();
      taskRecordsById.clear();
      initialized = true;

      if (filePath && durable) {
        await rm(filePath, { force: true });
      }
    },
    upsertTaskCompletion: async (completion) => {
      await ensureInitialized();
      taskCompletionsById.set(completion.id, completion);
      await writeDocument();

      return completion;
    },
  };
};
