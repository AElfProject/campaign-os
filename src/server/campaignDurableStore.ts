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
import {
  compareParticipantRankRows,
  toParticipantRankRow,
  withoutParticipantRank,
  type ParticipantRankRow,
} from "./participantJourney";

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

export interface CampaignDurableStoreParticipantJourneySnapshotInput {
  campaignId: string;
  walletAddress: string;
}

export interface CampaignDurableStoreParticipantJourneySnapshot {
  campaign: CampaignDbDraft | undefined;
  completions: CampaignDbTaskCompletion[];
  evidence: CampaignDbTaskEvidenceRecord[];
  participant: CampaignDbParticipantRecord | undefined;
  rankingParticipants: ParticipantRankRow[];
  tasks: CampaignDbTaskDraft[];
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
  getParticipantJourneySnapshot(
    input: CampaignDurableStoreParticipantJourneySnapshotInput,
    context?: CampaignDurableStoreOperationContext,
  ): Promise<CampaignDurableStoreParticipantJourneySnapshot>;
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

const cloneRecord = <T>(value: T): T => structuredClone(value);

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
    throw new TypeError("Campaign durable store document is invalid.");
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
  let recordsById = new Map<string, CampaignDbDraft>();
  let participantRecordsById = new Map<string, CampaignDbParticipantRecord>();
  let participantRecordIds = new Set<string>();
  let referralBindingRecordsById = new Map<string, CampaignDbReferralBindingRecord>();
  let taskCompletionsById = new Map<string, CampaignDbTaskCompletion>();
  let taskEvidenceById = new Map<string, CampaignDbTaskEvidenceRecord>();
  let taskRecordsById = new Map<string, CampaignDbTaskDraft>();
  const startupDiagnostics: CampaignDurableStoreDiagnostic[] = [];
  let hydrationDiagnostic: CampaignDurableStoreDiagnostic | undefined;
  let initialized = false;
  let initializationPromise: Promise<void> | undefined;
  let journeyOperationTail = Promise.resolve();
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
      hydrationDiagnostic = undefined;
      return { ...EMPTY_DOCUMENT };
    }

    try {
      const document = parseDocument(await readFile(filePath, "utf8"));
      hydrationDiagnostic = undefined;

      return document;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        hydrationDiagnostic = undefined;
        return { ...EMPTY_DOCUMENT };
      }

      const issue = diagnostic(
        "CAMPAIGN_DURABLE_STORE_READ_FAILED",
        "filePath",
        "Campaign durable store could not read persisted campaign drafts.",
      );
      hydrationDiagnostic = issue;

      throw new CampaignDurableStoreError("Campaign durable store read failed.", [issue]);
    }
  };

  const hydrateDocument = async () => {
    const document = await readDocument();
    const hydratedRecordsById = new Map<string, CampaignDbDraft>();
    const hydratedParticipantRecordsById = new Map<string, CampaignDbParticipantRecord>();
    const hydratedParticipantRecordIds = new Set<string>();
    const hydratedReferralBindingRecordsById = new Map<string, CampaignDbReferralBindingRecord>();
    const hydratedTaskCompletionsById = new Map<string, CampaignDbTaskCompletion>();
    const hydratedTaskEvidenceById = new Map<string, CampaignDbTaskEvidenceRecord>();
    const hydratedTaskRecordsById = new Map<string, CampaignDbTaskDraft>();

    for (const draft of document.records) {
      hydratedRecordsById.set(draft.id, draft);
    }

    for (const participant of document.participantRecords) {
      hydratedParticipantRecordsById.set(`${participant.campaignId}::${participant.walletAddress}`, participant);
      hydratedParticipantRecordIds.add(participant.id);
    }

    for (const binding of document.referralBindingRecords) {
      hydratedReferralBindingRecordsById.set(`${binding.campaignId}::${binding.inviteeWalletAddress}`, binding);
    }

    for (const taskDraft of document.taskRecords) {
      hydratedTaskRecordsById.set(taskDraft.id, taskDraft);
    }

    for (const completion of document.completionRecords) {
      hydratedTaskCompletionsById.set(completion.id, completion);
    }

    for (const evidence of document.taskEvidenceRecords) {
      hydratedTaskEvidenceById.set(evidence.id, evidence);
    }

    recordsById = hydratedRecordsById;
    participantRecordsById = hydratedParticipantRecordsById;
    participantRecordIds = hydratedParticipantRecordIds;
    referralBindingRecordsById = hydratedReferralBindingRecordsById;
    taskCompletionsById = hydratedTaskCompletionsById;
    taskEvidenceById = hydratedTaskEvidenceById;
    taskRecordsById = hydratedTaskRecordsById;
  };

  const ensureInitialized = async () => {
    if (initialized) {
      return;
    }

    initializationPromise ??= (async () => {
      try {
        await hydrateDocument();
        initialized = true;
      } catch (error) {
        initialized = false;
        throw error;
      } finally {
        initializationPromise = undefined;
      }
    })();

    await initializationPromise;
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
    ...(hydrationDiagnostic ? [hydrationDiagnostic] : []),
    ...productionRequiredDiagnostics(),
  ];

  const runJourneyExclusive = async <T>(operation: () => Promise<T>): Promise<T> => {
    const previous = journeyOperationTail;
    let release: () => void = () => undefined;
    journeyOperationTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;

    try {
      return await operation();
    } finally {
      release();
    }
  };

  const findCompletionByLogicalKey = (
    campaignId: string,
    taskId: string,
    walletAddress: string,
  ) => Array.from(taskCompletionsById.values()).find((completion) =>
    completion.campaignId === campaignId
    && completion.taskId === taskId
    && completion.walletAddress === walletAddress);

  const findEvidenceByLogicalKey = (
    campaignId: string,
    taskId: string,
    walletAddress: string,
  ) => Array.from(taskEvidenceById.values()).find((evidence) =>
    evidence.campaignId === campaignId
    && evidence.taskId === taskId
    && evidence.walletAddress === walletAddress);

  const completedPointsForWallet = (campaignId: string, walletAddress: string) => {
    const byTaskId = new Map<string, CampaignDbTaskCompletion>();

    for (const completion of sortTaskCompletions(Array.from(taskCompletionsById.values()))) {
      if (
        completion.campaignId === campaignId
        && completion.walletAddress === walletAddress
        && completion.status === "completed"
        && !byTaskId.has(completion.taskId)
      ) {
        byTaskId.set(completion.taskId, completion);
      }
    }

    return Array.from(byTaskId.values()).reduce(
      (total, completion) => total + completion.pointsAwarded,
      0,
    );
  };

  const availableVerificationId = (
    requestedId: string,
    prefix: string,
    ids: Pick<Map<string, unknown> | Set<string>, "has" | "size">,
  ) => {
    if (!ids.has(requestedId)) {
      return requestedId;
    }

    let sequence = ids.size + 1;
    let candidate = `${prefix}${sequence.toString().padStart(4, "0")}`;

    while (ids.has(candidate)) {
      sequence += 1;
      candidate = `${prefix}${sequence.toString().padStart(4, "0")}`;
    }

    return candidate;
  };

  const upsertTaskVerification = (
    input: CampaignDurableStoreTaskVerificationWrite,
  ): Promise<CampaignDurableStoreTaskVerificationResult> => runJourneyExclusive(async () => {
    await ensureInitialized();
    const previousCompletions = new Map(taskCompletionsById);
    const previousEvidence = new Map(taskEvidenceById);
    const previousParticipants = new Map(participantRecordsById);
    const previousParticipantIds = new Set(participantRecordIds);
    const existingCompletion = findCompletionByLogicalKey(
      input.completion.campaignId,
      input.completion.taskId,
      input.completion.walletAddress,
    );
    const existingEvidence = findEvidenceByLogicalKey(
      input.evidence.campaignId,
      input.evidence.taskId,
      input.evidence.walletAddress,
    );
    const participantRecordKey = `${input.participant.campaignId}::${input.participant.walletAddress}`;
    const existingParticipant = participantRecordsById.get(participantRecordKey);
    const evidenceId = existingEvidence?.id ?? availableVerificationId(
      input.evidence.id,
      "campaign-db-task-evidence-",
      taskEvidenceById,
    );
    const completionId = existingCompletion?.id ?? availableVerificationId(
      input.completion.id,
      "campaign-db-task-completion-",
      taskCompletionsById,
    );
    const completion: CampaignDbTaskCompletion = {
      ...input.completion,
      createdAt: existingCompletion?.createdAt ?? input.completion.createdAt,
      evidenceHash: input.evidence.evidenceHash,
      evidenceId,
      id: completionId,
    };
    const evidence: CampaignDbTaskEvidenceRecord = {
      ...input.evidence,
      completionId,
      createdAt: existingEvidence?.createdAt ?? input.evidence.createdAt,
      id: evidenceId,
      pointsAwarded: completion.pointsAwarded,
    };

    taskCompletionsById.set(completion.id, completion);
    taskEvidenceById.set(evidence.id, evidence);

    const participant: CampaignDbParticipantRecord = {
      ...withoutParticipantRank(input.participant),
      createdAt: existingParticipant?.createdAt ?? input.participant.createdAt,
      id: existingParticipant?.id ?? availableVerificationId(
        input.participant.id,
        "campaign-db-participant-",
        participantRecordIds,
      ),
      localePreference: existingParticipant?.localePreference ?? input.participant.localePreference,
      riskFlags: existingParticipant?.riskFlags ?? input.participant.riskFlags,
      totalPoints: completedPointsForWallet(completion.campaignId, completion.walletAddress),
      walletSignatureStatus: existingParticipant?.walletSignatureStatus
        ?? input.participant.walletSignatureStatus,
      ...(existingParticipant?.walletVerifiedAt === undefined
        ? {}
        : { walletVerifiedAt: existingParticipant.walletVerifiedAt }),
    };
    participantRecordsById.set(participantRecordKey, participant);
    participantRecordIds.add(participant.id);

    try {
      await writeDocument();
    } catch (error) {
      taskCompletionsById.clear();
      taskEvidenceById.clear();
      participantRecordsById.clear();
      participantRecordIds.clear();
      for (const [id, record] of previousCompletions) {
        taskCompletionsById.set(id, record);
      }
      for (const [id, record] of previousEvidence) {
        taskEvidenceById.set(id, record);
      }
      for (const [id, record] of previousParticipants) {
        participantRecordsById.set(id, record);
      }
      for (const id of previousParticipantIds) {
        participantRecordIds.add(id);
      }
      throw error;
    }

    return {
      completion: cloneRecord(completion),
      evidence: cloneRecord(evidence),
      participant: cloneRecord(participant),
    };
  });

  return {
    close: () => runJourneyExclusive(async () => {
      await ensureInitialized();
      await writeDocument();
    }),
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
    getParticipantJourneySnapshot: ({ campaignId, walletAddress }) => runJourneyExclusive(async () => {
      await ensureInitialized();
      const campaign = recordsById.get(campaignId);

      if (!campaign) {
        return {
          campaign: undefined,
          completions: [],
          evidence: [],
          participant: undefined,
          rankingParticipants: [],
          tasks: [],
        };
      }

      const tasks = sortTaskDrafts(Array.from(taskRecordsById.values()))
        .filter((task) => task.campaignId === campaignId);
      const completions = sortTaskCompletions(Array.from(taskCompletionsById.values()))
        .filter((completion) => completion.campaignId === campaignId)
        .filter((completion) => completion.walletAddress === walletAddress);
      const evidence = sortTaskEvidence(Array.from(taskEvidenceById.values()))
        .filter((record) => record.campaignId === campaignId)
        .filter((record) => record.walletAddress === walletAddress);
      const rankingParticipants = Array.from(participantRecordsById.values())
        .filter((participant) => participant.campaignId === campaignId)
        .map(toParticipantRankRow)
        .sort(compareParticipantRankRows);

      return cloneRecord({
        campaign,
        completions,
        evidence,
        participant: participantRecordsById.get(`${campaignId}::${walletAddress}`),
        rankingParticipants,
        tasks,
      });
    }),
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
    reset: () => runJourneyExclusive(async () => {
      await ensureInitialized();
      recordsById.clear();
      participantRecordsById.clear();
      participantRecordIds.clear();
      referralBindingRecordsById.clear();
      taskCompletionsById.clear();
      taskEvidenceById.clear();
      taskRecordsById.clear();
      initialized = true;

      if (filePath && durable) {
        await rm(filePath, { force: true });
      }
    }),
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
    upsertTaskVerification,
    upsertReferralBinding: async (binding) => {
      await ensureInitialized();
      referralBindingRecordsById.set(`${binding.campaignId}::${binding.inviteeWalletAddress}`, binding);
      await writeDocument();

      return binding;
    },
    upsertParticipant: async (participant) => {
      await ensureInitialized();
      participantRecordsById.set(`${participant.campaignId}::${participant.walletAddress}`, participant);
      participantRecordIds.add(participant.id);
      await writeDocument();

      return participant;
    },
  };
};
