import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  CampaignDbDraft,
  CampaignDbDiagnostic,
  CampaignDbParticipantRecord,
  CampaignDbReferralBindingRecord,
  CampaignDbTaskCompletion,
  CampaignDbTaskEvidenceListFilter,
  CampaignDbTaskEvidenceRecord,
  CampaignDbTaskDraft,
} from "./campaignDbRepository";

export type CampaignDurableStoreMode =
  | "local_seeded"
  | "durable_test"
  | "production_required"
  | "postgres";
export type CampaignDurableStoreStatus = "ready" | "blocked";
export type CampaignDurableStoreDiagnosticCode =
  | "CAMPAIGN_DURABLE_STORE_PATH_REQUIRED"
  | "CAMPAIGN_DURABLE_STORE_READ_FAILED"
  | "CAMPAIGN_DURABLE_STORE_WRITE_FAILED"
  | "CAMPAIGN_DURABLE_STORE_PRODUCTION_REQUIRED"
  | "POSTGRES_CAMPAIGN_STORE_ARGUMENT_INVALID"
  | "POSTGRES_CAMPAIGN_STORE_CLEANUP_FAILED"
  | "POSTGRES_CAMPAIGN_STORE_CLOSED"
  | "POSTGRES_CAMPAIGN_STORE_CONFLICT"
  | "POSTGRES_CAMPAIGN_STORE_CONSTRAINT_FAILED"
  | "POSTGRES_CAMPAIGN_STORE_QUERY_FAILED"
  | "POSTGRES_CAMPAIGN_STORE_RESET_FORBIDDEN"
  | "POSTGRES_CAMPAIGN_STORE_ROW_INVALID"
  | "POSTGRES_CAMPAIGN_STORE_SCHEMA_NOT_READY";

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
  adapterId?: "campaign-db-local-adapter" | "campaign-db-postgresql-adapter";
  appliedMigrationIds?: string[];
  boundedListLimit: number;
  diagnosticCodes: CampaignDurableStoreDiagnosticCode[];
  diagnostics: CampaignDurableStoreDiagnostic[];
  durable: boolean;
  fallbackUsed: false;
  migrationStatus?: "ready" | "blocked";
  mode: CampaignDurableStoreMode;
  completionRecordCount: number;
  participantRecordCount: number;
  referralBindingRecordCount: number;
  recordCount: number;
  schemaId?: "campaign_os";
  schemaVersion?: string;
  status: CampaignDurableStoreStatus;
  storeId: "campaign-db";
  taskEvidenceRecordCount: number;
  taskRecordCount: number;
}

export interface CampaignDurableStoreListOptions {
  limit?: number;
  ownerAddress?: string;
  projectId?: string;
  status?: string;
}

export interface CampaignDurableStoreOperationContext {
  traceId?: string;
}

export interface CampaignDurableStoreEntityListOptions {
  limit?: number;
}

export interface CampaignDurableStoreParticipantListOptions
  extends CampaignDurableStoreEntityListOptions {
  walletAddress?: string;
}

export interface CampaignDurableStoreCompletionListOptions
  extends CampaignDurableStoreEntityListOptions {
  taskId?: string;
  walletAddress?: string;
}

export interface CampaignDurableStoreReferralListOptions
  extends CampaignDurableStoreEntityListOptions {
  inviteeWalletAddress?: string;
  referrerWalletAddress?: string;
}

export interface CampaignDurableStoreTaskVerificationWrite {
  completion: CampaignDbTaskCompletion;
  evidence: CampaignDbTaskEvidenceRecord;
  participant: CampaignDbParticipantRecord;
}

export interface CampaignDurableStoreTaskVerificationResult {
  completion: CampaignDbTaskCompletion;
  evidence: CampaignDbTaskEvidenceRecord;
  participant: CampaignDbParticipantRecord;
}

export interface CampaignDurableStore {
  close(): Promise<void>;
  create(
    draft: CampaignDbDraft,
    context?: CampaignDurableStoreOperationContext,
  ): Promise<CampaignDbDraft>;
  createTaskDraft(
    taskDraft: CampaignDbTaskDraft,
    context?: CampaignDurableStoreOperationContext,
  ): Promise<CampaignDbTaskDraft>;
  getById(
    campaignId: string,
    context?: CampaignDurableStoreOperationContext,
  ): Promise<CampaignDbDraft | undefined>;
  getParticipant(
    campaignId: string,
    walletAddress: string,
    context?: CampaignDurableStoreOperationContext,
  ): Promise<CampaignDbParticipantRecord | undefined>;
  getReferralBinding(
    campaignId: string,
    inviteeWalletAddress: string,
    context?: CampaignDurableStoreOperationContext,
  ): Promise<CampaignDbReferralBindingRecord | undefined>;
  list(
    filter?: CampaignDurableStoreListOptions,
    context?: CampaignDurableStoreOperationContext,
  ): Promise<CampaignDbDraft[]>;
  listParticipantsByCampaignId(
    campaignId: string,
    filter?: CampaignDurableStoreParticipantListOptions,
    context?: CampaignDurableStoreOperationContext,
  ): Promise<CampaignDbParticipantRecord[]>;
  listReferralBindingsByCampaignId(
    campaignId: string,
    filter?: CampaignDurableStoreReferralListOptions,
    context?: CampaignDurableStoreOperationContext,
  ): Promise<CampaignDbReferralBindingRecord[]>;
  listTaskCompletionsByCampaignId(
    campaignId: string,
    filter?: CampaignDurableStoreCompletionListOptions,
    context?: CampaignDurableStoreOperationContext,
  ): Promise<CampaignDbTaskCompletion[]>;
  listTaskEvidence(
    filter: CampaignDbTaskEvidenceListFilter,
    context?: CampaignDurableStoreOperationContext,
  ): Promise<CampaignDbTaskEvidenceRecord[]>;
  listTaskDraftsByCampaignId(
    campaignId: string,
    filter?: CampaignDurableStoreEntityListOptions,
    context?: CampaignDurableStoreOperationContext,
  ): Promise<CampaignDbTaskDraft[]>;
  manifest(context?: CampaignDurableStoreOperationContext): Promise<CampaignDurableStoreManifest>;
  reset(): Promise<void>;
  upsertReferralBinding(
    binding: CampaignDbReferralBindingRecord,
    context?: CampaignDurableStoreOperationContext,
  ): Promise<CampaignDbReferralBindingRecord>;
  upsertParticipant(
    participant: CampaignDbParticipantRecord,
    context?: CampaignDurableStoreOperationContext,
  ): Promise<CampaignDbParticipantRecord>;
  upsertTaskEvidence(
    evidence: CampaignDbTaskEvidenceRecord,
    context?: CampaignDurableStoreOperationContext,
  ): Promise<CampaignDbTaskEvidenceRecord>;
  upsertTaskCompletion(
    completion: CampaignDbTaskCompletion,
    context?: CampaignDurableStoreOperationContext,
  ): Promise<CampaignDbTaskCompletion>;
  upsertTaskVerification?(
    input: CampaignDurableStoreTaskVerificationWrite,
    context?: CampaignDurableStoreOperationContext,
  ): Promise<CampaignDurableStoreTaskVerificationResult>;
}

export interface CreateCampaignDurableStoreOptions {
  boundedListLimit?: number;
  filePath?: string;
  mode?: Exclude<CampaignDurableStoreMode, "postgres">;
}

interface CampaignDurableStoreDocument {
  completionRecords: CampaignDbTaskCompletion[];
  participantRecords: CampaignDbParticipantRecord[];
  referralBindingRecords: CampaignDbReferralBindingRecord[];
  records: CampaignDbDraft[];
  taskEvidenceRecords: CampaignDbTaskEvidenceRecord[];
  taskRecords: CampaignDbTaskDraft[];
  updatedAt: string;
  version: 1;
}

const DEFAULT_BOUNDED_LIST_LIMIT = 100;
const EMPTY_DOCUMENT: CampaignDurableStoreDocument = {
  completionRecords: [],
  participantRecords: [],
  referralBindingRecords: [],
  records: [],
  taskEvidenceRecords: [],
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

const applyOptionalLimit = <T>(
  records: T[],
  limit: number | undefined,
  maximum: number,
) => limit === undefined ? records : records.slice(0, clampLimit(limit, maximum));

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

const sortTaskEvidence = (records: readonly CampaignDbTaskEvidenceRecord[]) =>
  [...records].sort((left, right) => {
    const campaignComparison = left.campaignId.localeCompare(right.campaignId);

    if (campaignComparison !== 0) {
      return campaignComparison;
    }

    const walletComparison = left.walletAddress.localeCompare(right.walletAddress);

    return walletComparison === 0 ? left.taskId.localeCompare(right.taskId) : walletComparison;
  });

const sortParticipants = (records: readonly CampaignDbParticipantRecord[]) =>
  [...records].sort((left, right) => {
    const campaignComparison = left.campaignId.localeCompare(right.campaignId);

    return campaignComparison === 0 ? left.walletAddress.localeCompare(right.walletAddress) : campaignComparison;
  });

const sortReferralBindings = (records: readonly CampaignDbReferralBindingRecord[]) =>
  [...records].sort((left, right) => {
    const campaignComparison = left.campaignId.localeCompare(right.campaignId);

    return campaignComparison === 0
      ? left.inviteeWalletAddress.localeCompare(right.inviteeWalletAddress)
      : campaignComparison;
  });

const parseDocument = (raw: string): CampaignDurableStoreDocument => {
  const parsed = JSON.parse(raw) as Partial<CampaignDurableStoreDocument>;

  if (parsed.version !== 1 || !Array.isArray(parsed.records)) {
    return { ...EMPTY_DOCUMENT };
  }

  return {
    completionRecords: Array.isArray(parsed.completionRecords) ? parsed.completionRecords : [],
    participantRecords: Array.isArray(parsed.participantRecords) ? parsed.participantRecords : [],
    referralBindingRecords: Array.isArray(parsed.referralBindingRecords) ? parsed.referralBindingRecords : [],
    records: parsed.records,
    taskEvidenceRecords: Array.isArray(parsed.taskEvidenceRecords) ? parsed.taskEvidenceRecords : [],
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
  const participantRecordsById = new Map<string, CampaignDbParticipantRecord>();
  const referralBindingRecordsById = new Map<string, CampaignDbReferralBindingRecord>();
  const taskCompletionsById = new Map<string, CampaignDbTaskCompletion>();
  const taskEvidenceById = new Map<string, CampaignDbTaskEvidenceRecord>();
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
    participantRecordsById.clear();
    referralBindingRecordsById.clear();
    taskCompletionsById.clear();
    taskEvidenceById.clear();
    taskRecordsById.clear();

    for (const draft of document.records) {
      recordsById.set(draft.id, draft);
    }

    for (const participant of document.participantRecords) {
      participantRecordsById.set(`${participant.campaignId}::${participant.walletAddress}`, participant);
    }

    for (const binding of document.referralBindingRecords) {
      referralBindingRecordsById.set(`${binding.campaignId}::${binding.inviteeWalletAddress}`, binding);
    }

    for (const taskDraft of document.taskRecords) {
      taskRecordsById.set(taskDraft.id, taskDraft);
    }

    for (const completion of document.completionRecords) {
      taskCompletionsById.set(completion.id, completion);
    }

    for (const evidence of document.taskEvidenceRecords) {
      taskEvidenceById.set(evidence.id, evidence);
    }
  };

  const writeDocument = async () => {
    if (!filePath || !durable) {
      return;
    }

    const document: CampaignDurableStoreDocument = {
      completionRecords: sortTaskCompletions(Array.from(taskCompletionsById.values())),
      participantRecords: sortParticipants(Array.from(participantRecordsById.values())),
      referralBindingRecords: sortReferralBindings(Array.from(referralBindingRecordsById.values())),
      records: sortDrafts(Array.from(recordsById.values())),
      taskEvidenceRecords: sortTaskEvidence(Array.from(taskEvidenceById.values())),
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
    getParticipant: async (campaignId, walletAddress) => {
      await ensureInitialized();

      return participantRecordsById.get(`${campaignId}::${walletAddress}`);
    },
    getReferralBinding: async (campaignId, inviteeWalletAddress) => {
      await ensureInitialized();

      return referralBindingRecordsById.get(`${campaignId}::${inviteeWalletAddress}`);
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
    listTaskDraftsByCampaignId: async (campaignId, filter = {}) => {
      await ensureInitialized();

      return applyOptionalLimit(
        sortTaskDrafts(Array.from(taskRecordsById.values()))
          .filter((taskDraft) => taskDraft.campaignId === campaignId),
        filter.limit,
        boundedListLimit,
      );
    },
    listTaskCompletionsByCampaignId: async (campaignId, filter = {}) => {
      await ensureInitialized();

      return applyOptionalLimit(
        sortTaskCompletions(Array.from(taskCompletionsById.values()))
          .filter((completion) => completion.campaignId === campaignId)
          .filter((completion) => !filter.taskId || completion.taskId === filter.taskId)
          .filter((completion) => !filter.walletAddress || completion.walletAddress === filter.walletAddress),
        filter.limit,
        boundedListLimit,
      );
    },
    listTaskEvidence: async (filter) => {
      await ensureInitialized();
      const maxLimit = taskEvidenceById.size || 1;
      const limit = clampLimit(filter.limit, maxLimit);

      return sortTaskEvidence(Array.from(taskEvidenceById.values()))
        .filter((evidence) => evidence.campaignId === filter.campaignId)
        .filter((evidence) => !filter.taskId || evidence.taskId === filter.taskId)
        .filter((evidence) => !filter.walletAddress || evidence.walletAddress === filter.walletAddress)
        .slice(0, limit);
    },
    listParticipantsByCampaignId: async (campaignId, filter = {}) => {
      await ensureInitialized();

      return applyOptionalLimit(
        sortParticipants(Array.from(participantRecordsById.values()))
          .filter((participant) => participant.campaignId === campaignId)
          .filter((participant) => !filter.walletAddress || participant.walletAddress === filter.walletAddress),
        filter.limit,
        boundedListLimit,
      );
    },
    listReferralBindingsByCampaignId: async (campaignId, filter = {}) => {
      await ensureInitialized();

      return applyOptionalLimit(
        sortReferralBindings(Array.from(referralBindingRecordsById.values()))
          .filter((binding) => binding.campaignId === campaignId)
          .filter((binding) =>
            !filter.inviteeWalletAddress || binding.inviteeWalletAddress === filter.inviteeWalletAddress)
          .filter((binding) =>
            !filter.referrerWalletAddress || binding.referrerWalletAddress === filter.referrerWalletAddress),
        filter.limit,
        boundedListLimit,
      );
    },
    manifest: async () => {
      await ensureInitialized();
      const diagnostics = currentDiagnostics();

      return {
        adapterId: "campaign-db-local-adapter",
        boundedListLimit,
        completionRecordCount: taskCompletionsById.size,
        diagnosticCodes: diagnostics.map((issue) => issue.code),
        diagnostics,
        durable,
        fallbackUsed: false,
        mode,
        participantRecordCount: participantRecordsById.size,
        referralBindingRecordCount: referralBindingRecordsById.size,
        recordCount: recordsById.size,
        status: diagnostics.length > 0 ? "blocked" : "ready",
        storeId: "campaign-db",
        taskEvidenceRecordCount: taskEvidenceById.size,
        taskRecordCount: taskRecordsById.size,
      };
    },
    reset: async () => {
      recordsById.clear();
      participantRecordsById.clear();
      referralBindingRecordsById.clear();
      taskCompletionsById.clear();
      taskEvidenceById.clear();
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
    upsertTaskEvidence: async (evidence) => {
      await ensureInitialized();
      taskEvidenceById.set(evidence.id, evidence);
      await writeDocument();

      return evidence;
    },
    upsertReferralBinding: async (binding) => {
      await ensureInitialized();
      referralBindingRecordsById.set(`${binding.campaignId}::${binding.inviteeWalletAddress}`, binding);
      await writeDocument();

      return binding;
    },
    upsertParticipant: async (participant) => {
      await ensureInitialized();
      participantRecordsById.set(`${participant.campaignId}::${participant.walletAddress}`, participant);
      await writeDocument();

      return participant;
    },
  };
};
