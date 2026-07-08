import {
  campaignLifecycleStatuses,
  supportedLocales,
  type CampaignStatus,
  type ContractMode,
  type SupportedLocale,
  type VerificationType,
  type WalletCompatibility,
  type WalletPolicy,
} from "../domain/types";
import {
  createCampaignDurableStore,
  type CampaignDurableStore,
  type CampaignDurableStoreManifest,
} from "./campaignDurableStore";

export type CampaignDbRepositoryMode = "deterministic_test" | "durable_test" | "production_deferred";
export type CampaignDbRepositoryStatus = "ready" | "blocked";
export type CampaignDbRepositoryEventType =
  | "transaction.begin"
  | "transaction.commit"
  | "command.planned"
  | "command.insert"
  | "query.lookup"
  | "query.list"
  | "diagnostic";
export type CampaignDbDiagnosticSeverity = "error" | "warning" | "info";
export type CampaignDbDiagnosticCode =
  | "CAMPAIGN_DURABLE_STORE_PATH_REQUIRED"
  | "CAMPAIGN_DURABLE_STORE_READ_FAILED"
  | "CAMPAIGN_DURABLE_STORE_WRITE_FAILED"
  | "CAMPAIGN_DURABLE_STORE_PRODUCTION_REQUIRED"
  | "CAMPAIGN_DB_REQUIRED_FIELD_MISSING"
  | "CAMPAIGN_DB_UNSUPPORTED_DEFAULT_LOCALE"
  | "CAMPAIGN_DB_UNSUPPORTED_LOCALE"
  | "CAMPAIGN_DB_UNSUPPORTED_WALLET_POLICY"
  | "CAMPAIGN_DB_UNSUPPORTED_CONTRACT_MODE"
  | "CAMPAIGN_DB_UNSUPPORTED_STATUS"
  | "CAMPAIGN_DB_INVALID_TIME_WINDOW"
  | "CAMPAIGN_DB_TASK_CAMPAIGN_NOT_FOUND"
  | "CAMPAIGN_DB_TASK_INVALID_EVIDENCE_RULE"
  | "CAMPAIGN_DB_TASK_INVALID_POINTS"
  | "CAMPAIGN_DB_TASK_REQUIRED_FIELD_MISSING"
  | "CAMPAIGN_DB_TASK_UNSUPPORTED_VERIFICATION_TYPE"
  | "CAMPAIGN_DB_TASK_UNSUPPORTED_WALLET_COMPATIBILITY"
  | "CAMPAIGN_DB_PRODUCTION_DEFERRED";

export interface CampaignDbDiagnostic {
  code: CampaignDbDiagnosticCode;
  field: string;
  message: string;
  severity: CampaignDbDiagnosticSeverity;
}

export interface CampaignDbPublishReadiness {
  blockers: string[];
  ready: boolean;
  warnings: string[];
}

export interface CampaignDbDraft {
  contractMode: ContractMode;
  createdAt: string;
  defaultLocale: "en-US";
  duration: string;
  endTime: string;
  goal: string;
  id: string;
  metadataHash?: string;
  metadataUri?: string;
  ownerAddress: string;
  projectId: string;
  publishReadiness: CampaignDbPublishReadiness;
  rewardDescription: string;
  rewardDisclaimerHash?: string;
  startTime: string;
  status: CampaignStatus;
  supportedLocales: SupportedLocale[];
  updatedAt: string;
  walletPolicy: WalletPolicy;
}

export interface CampaignDbCreateDraftInput {
  contractMode?: ContractMode | string;
  defaultLocale?: SupportedLocale | string;
  duration: string;
  endTime: string;
  goal: string;
  metadataHash?: string;
  metadataUri?: string;
  ownerAddress: string;
  projectId: string;
  publishReadiness?: CampaignDbPublishReadiness;
  rewardDescription: string;
  rewardDisclaimerHash?: string;
  startTime: string;
  status?: CampaignStatus | string;
  supportedLocales?: readonly (SupportedLocale | string)[];
  walletPolicy?: WalletPolicy | string;
}

export interface CampaignDbTaskDraft {
  campaignId: string;
  createdAt: string;
  evidenceRule: Record<string, string | number | boolean>;
  id: string;
  points: number;
  required: boolean;
  templateCode: string;
  updatedAt: string;
  verificationType: VerificationType;
  walletCompatibility: WalletCompatibility;
}

export interface CampaignDbAddTaskDraftInput {
  campaignId: string;
  evidenceRule: Record<string, string | number | boolean>;
  points: number;
  required: boolean;
  templateCode: string;
  verificationType: VerificationType | string;
  walletCompatibility: WalletCompatibility | string;
}

export interface CampaignDbOperationContext {
  traceId?: string;
}

export interface CampaignDbReadProjection extends CampaignDbDraft {
  repository: {
    adapterId: string;
    createdViaRepository: true;
    repositoryId: string;
    storeId: "campaign-db";
      transactionId?: string;
  };
  tasks: CampaignDbTaskDraft[];
}

export interface CampaignDbListFilter {
  limit?: number;
  ownerAddress?: string;
  projectId?: string;
  status?: CampaignStatus | string;
}

export interface CampaignDbRepositoryEvent {
  entity: "Campaign" | "CampaignTask";
  id: string;
  liveExecution: false;
  operation: string;
  sequence: number;
  storeId: "campaign-db";
  traceId?: string;
  transactionId?: string;
  type: CampaignDbRepositoryEventType;
}

export interface CampaignDbRepositoryHealth {
  adapterId: string;
  campaignStore?: CampaignDurableStoreManifest;
  diagnosticCodes: CampaignDbDiagnosticCode[];
  diagnostics: CampaignDbDiagnostic[];
  eventCount: number;
  fallbackUsed: false;
  id: "campaign-db-repository-runtime";
  liveConnectionAttempted: false;
  liveMigrationExecutionEnabled: false;
  liveQueryExecutionEnabled: false;
  productionReady: false;
  recordCount: number;
  selectedMode: CampaignDbRepositoryMode;
  status: CampaignDbRepositoryStatus;
  storeId: "campaign-db";
  taskRecordCount: number;
  validation: {
    issues: CampaignDbDiagnostic[];
    valid: boolean;
  };
}

export interface CampaignDbRepository {
  addTaskDraft(
    input: CampaignDbAddTaskDraftInput,
    context?: CampaignDbOperationContext,
  ): Promise<CampaignDbTaskDraft>;
  createDraft(
    input: CampaignDbCreateDraftInput,
    context?: CampaignDbOperationContext,
  ): Promise<CampaignDbDraft>;
  getById(
    campaignId: string,
    context?: CampaignDbOperationContext,
  ): Promise<CampaignDbReadProjection | undefined>;
  getEvents(): CampaignDbRepositoryEvent[];
  health(): Promise<CampaignDbRepositoryHealth>;
  list(
    filter?: CampaignDbListFilter,
    context?: CampaignDbOperationContext,
  ): Promise<CampaignDbReadProjection[]>;
  reset(): Promise<void>;
}

export interface CreateCampaignDbRepositoryOptions {
  boundedListLimit?: number;
  durableStore?: CampaignDurableStore;
  durableStoreFilePath?: string;
  mode?: CampaignDbRepositoryMode;
  now?: () => string;
  requestedDriverId?: string;
}

export class CampaignDbRepositoryError extends Error {
  readonly diagnostics: CampaignDbDiagnostic[];

  constructor(message: string, diagnostics: CampaignDbDiagnostic[]) {
    super(message);
    this.name = "CampaignDbRepositoryError";
    this.diagnostics = diagnostics;
  }
}

const defaultNow = () => "2026-07-06T00:00:00.000Z";
const walletPolicies = ["ANY", "AA_ONLY", "EOA_ONLY"] as const satisfies readonly WalletPolicy[];
const verificationTypes = ["WALLET", "ON_CHAIN", "DAPP_API", "SOCIAL", "MANUAL"] as const satisfies readonly VerificationType[];
const contractModes = [
  "OFF_CHAIN_MVP",
  "V2_COMPANION",
  "CONTRACT_CLAIM",
] as const satisfies readonly ContractMode[];
const secretLikeKeyFragments = [
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
  "url",
];

const diagnostic = (
  code: CampaignDbDiagnosticCode,
  field: string,
  message: string,
  severity: CampaignDbDiagnosticSeverity = "error",
): CampaignDbDiagnostic => ({
  code,
  field,
  message,
  severity,
});

const isNonEmptyString = (value: string | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0;

const normalizeSecretKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

const hasSecretLikeKey = (key: string) => {
  const normalizedKey = normalizeSecretKey(key);

  return secretLikeKeyFragments.some((fragment) => normalizedKey.includes(fragment));
};

const hasSecretLikeValue = (value: string) => {
  const normalizedValue = normalizeSecretKey(value);

  return value.includes("://") ||
    value.includes("@") ||
    secretLikeKeyFragments.some((fragment) => normalizedValue.includes(fragment));
};

export const sanitizeCampaignDbDiagnosticValue = (
  key: string,
  value: string | undefined,
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return hasSecretLikeKey(key) || hasSecretLikeValue(value) ? "[redacted]" : value;
};

const isSupportedLocale = (value: string): value is SupportedLocale =>
  (supportedLocales as readonly string[]).includes(value);

const isWalletPolicy = (value: string): value is WalletPolicy =>
  (walletPolicies as readonly string[]).includes(value);

const isVerificationType = (value: string): value is VerificationType =>
  (verificationTypes as readonly string[]).includes(value);

const isContractMode = (value: string): value is ContractMode =>
  (contractModes as readonly string[]).includes(value);

const isCampaignStatus = (value: string): value is CampaignStatus =>
  (campaignLifecycleStatuses as readonly string[]).includes(value);

const requireString = (
  input: CampaignDbCreateDraftInput,
  field: keyof Pick<
    CampaignDbCreateDraftInput,
    "duration" | "endTime" | "goal" | "ownerAddress" | "projectId" | "rewardDescription" | "startTime"
  >,
  issues: CampaignDbDiagnostic[],
) => {
  const value = input[field];

  if (!isNonEmptyString(value)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_REQUIRED_FIELD_MISSING",
      field,
      `Campaign DB draft field '${field}' is required.`,
    ));

    return "";
  }

  return value.trim();
};

const normalizeDefaultLocale = (
  defaultLocale: string | undefined,
  issues: CampaignDbDiagnostic[],
): "en-US" => {
  const locale = defaultLocale ?? "en-US";

  if (locale !== "en-US") {
    issues.push(diagnostic(
      "CAMPAIGN_DB_UNSUPPORTED_DEFAULT_LOCALE",
      "defaultLocale",
      "Campaign DB draft defaultLocale must be en-US.",
    ));
  }

  return "en-US";
};

const normalizeSupportedLocales = (
  requestedLocales: readonly (SupportedLocale | string)[] | undefined,
  issues: CampaignDbDiagnostic[],
): SupportedLocale[] => {
  const locales = requestedLocales ?? supportedLocales;

  if (
    locales.length === 0 ||
    locales.some((locale) => !isSupportedLocale(locale)) ||
    !locales.includes("en-US")
  ) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_UNSUPPORTED_LOCALE",
      "supportedLocales",
      "Campaign DB draft supportedLocales must contain supported locale values and include en-US.",
    ));

    return [...supportedLocales];
  }

  return Array.from(new Set(locales.filter(isSupportedLocale)));
};

const normalizeWalletPolicy = (
  walletPolicy: string | undefined,
  issues: CampaignDbDiagnostic[],
): WalletPolicy => {
  const policy = walletPolicy ?? "ANY";

  if (!isWalletPolicy(policy)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_UNSUPPORTED_WALLET_POLICY",
      "walletPolicy",
      "Campaign DB draft walletPolicy is unsupported.",
    ));

    return "ANY";
  }

  return policy;
};

const normalizeContractMode = (
  contractMode: string | undefined,
  issues: CampaignDbDiagnostic[],
): ContractMode => {
  const mode = contractMode ?? "OFF_CHAIN_MVP";

  if (!isContractMode(mode)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_UNSUPPORTED_CONTRACT_MODE",
      "contractMode",
      "Campaign DB draft contractMode is unsupported.",
    ));

    return "OFF_CHAIN_MVP";
  }

  return mode;
};

const normalizeStatus = (
  status: string | undefined,
  issues: CampaignDbDiagnostic[],
): CampaignStatus => {
  const draftStatus = status ?? "draft";

  if (!isCampaignStatus(draftStatus)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_UNSUPPORTED_STATUS",
      "status",
      "Campaign DB draft status is unsupported.",
    ));

    return "draft";
  }

  return draftStatus;
};

const validateTimeWindow = (
  startTime: string,
  endTime: string,
  issues: CampaignDbDiagnostic[],
) => {
  const start = Date.parse(startTime);
  const end = Date.parse(endTime);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_INVALID_TIME_WINDOW",
      "timeWindow",
      "Campaign DB draft startTime and endTime must be valid, and endTime must be later than startTime.",
    ));
  }
};

const validateCreateDraftInput = (
  input: CampaignDbCreateDraftInput,
): Omit<CampaignDbDraft, "createdAt" | "id" | "updatedAt"> => {
  const issues: CampaignDbDiagnostic[] = [];
  const duration = requireString(input, "duration", issues);
  const endTime = requireString(input, "endTime", issues);
  const goal = requireString(input, "goal", issues);
  const ownerAddress = requireString(input, "ownerAddress", issues);
  const projectId = requireString(input, "projectId", issues);
  const rewardDescription = requireString(input, "rewardDescription", issues);
  const startTime = requireString(input, "startTime", issues);
  const defaultLocale = normalizeDefaultLocale(input.defaultLocale, issues);
  const supportedLocaleSet = normalizeSupportedLocales(input.supportedLocales, issues);
  const walletPolicy = normalizeWalletPolicy(input.walletPolicy, issues);
  const contractMode = normalizeContractMode(input.contractMode, issues);
  const status = normalizeStatus(input.status, issues);

  validateTimeWindow(startTime, endTime, issues);

  if (issues.length > 0) {
    throw new CampaignDbRepositoryError("Invalid Campaign DB draft input.", issues);
  }

  return {
    contractMode,
    defaultLocale,
    duration,
    endTime,
    goal,
    ...(input.metadataHash ? { metadataHash: input.metadataHash } : {}),
    ...(input.metadataUri ? { metadataUri: input.metadataUri } : {}),
    ownerAddress,
    projectId,
    publishReadiness: input.publishReadiness ?? {
      blockers: [],
      ready: true,
      warnings: [],
    },
    rewardDescription,
    ...(input.rewardDisclaimerHash ? { rewardDisclaimerHash: input.rewardDisclaimerHash } : {}),
    startTime,
    status,
    supportedLocales: supportedLocaleSet,
    walletPolicy,
  };
};

const requireTaskString = (
  input: CampaignDbAddTaskDraftInput,
  field: keyof Pick<CampaignDbAddTaskDraftInput, "campaignId" | "templateCode">,
  issues: CampaignDbDiagnostic[],
) => {
  const value = input[field];

  if (!isNonEmptyString(value)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_TASK_REQUIRED_FIELD_MISSING",
      field,
      `Campaign DB task draft field '${field}' is required.`,
    ));

    return "";
  }

  return value.trim();
};

const normalizeTaskWalletCompatibility = (
  walletCompatibility: string,
  issues: CampaignDbDiagnostic[],
): WalletCompatibility => {
  if (!isWalletPolicy(walletCompatibility)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_TASK_UNSUPPORTED_WALLET_COMPATIBILITY",
      "walletCompatibility",
      "Campaign DB task draft walletCompatibility is unsupported.",
    ));

    return "ANY";
  }

  return walletCompatibility;
};

const normalizeTaskVerificationType = (
  verificationType: string,
  issues: CampaignDbDiagnostic[],
): VerificationType => {
  if (!isVerificationType(verificationType)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_TASK_UNSUPPORTED_VERIFICATION_TYPE",
      "verificationType",
      "Campaign DB task draft verificationType is unsupported.",
    ));

    return "MANUAL";
  }

  return verificationType;
};

const normalizeTaskPoints = (
  points: number,
  issues: CampaignDbDiagnostic[],
) => {
  if (!Number.isFinite(points) || !Number.isInteger(points) || points <= 0) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_TASK_INVALID_POINTS",
      "points",
      "Campaign DB task draft points must be a positive integer.",
    ));

    return 0;
  }

  return points;
};

const normalizeTaskEvidenceRule = (
  evidenceRule: Record<string, string | number | boolean>,
  issues: CampaignDbDiagnostic[],
) => {
  const invalid =
    !evidenceRule ||
    typeof evidenceRule !== "object" ||
    Array.isArray(evidenceRule) ||
    Object.keys(evidenceRule).length === 0 ||
    Object.entries(evidenceRule).some(([key, value]) =>
      hasSecretLikeKey(key) ||
      (typeof value === "string" && hasSecretLikeValue(value)) ||
      (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean")
    );

  if (invalid) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_TASK_INVALID_EVIDENCE_RULE",
      "evidenceRule",
      "Campaign DB task draft evidenceRule must be a non-empty plain record with safe primitive values.",
    ));

    return {};
  }

  return { ...evidenceRule };
};

const validateAddTaskDraftInput = (
  input: CampaignDbAddTaskDraftInput,
  campaignExists: boolean,
): Omit<CampaignDbTaskDraft, "createdAt" | "id" | "updatedAt"> => {
  const issues: CampaignDbDiagnostic[] = [];
  const campaignId = requireTaskString(input, "campaignId", issues);
  const templateCode = requireTaskString(input, "templateCode", issues);
  const walletCompatibility = normalizeTaskWalletCompatibility(input.walletCompatibility, issues);
  const verificationType = normalizeTaskVerificationType(input.verificationType, issues);
  const points = normalizeTaskPoints(input.points, issues);
  const evidenceRule = normalizeTaskEvidenceRule(input.evidenceRule, issues);

  if (campaignId && !campaignExists) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_TASK_CAMPAIGN_NOT_FOUND",
      "campaignId",
      `Campaign DB draft '${sanitizeCampaignDbDiagnosticValue("campaignId", campaignId)}' was not found.`,
    ));
  }

  if (typeof input.required !== "boolean") {
    issues.push(diagnostic(
      "CAMPAIGN_DB_TASK_REQUIRED_FIELD_MISSING",
      "required",
      "Campaign DB task draft required flag must be boolean.",
    ));
  }

  if (issues.length > 0) {
    throw new CampaignDbRepositoryError("Invalid Campaign DB task draft input.", issues);
  }

  return {
    campaignId,
    evidenceRule,
    points,
    required: input.required,
    templateCode,
    verificationType,
    walletCompatibility,
  };
};

const createProductionDeferredDiagnostic = (
  requestedDriverId: string | undefined,
): CampaignDbDiagnostic => diagnostic(
  "CAMPAIGN_DB_PRODUCTION_DEFERRED",
  "requestedDriverId",
  `Campaign DB production driver '${sanitizeCampaignDbDiagnosticValue(
    "requestedDriverId",
    requestedDriverId,
  ) ?? "not_configured"}' is deferred and cannot fallback to local repositories.`,
);

export const createCampaignDbRepository = ({
  boundedListLimit,
  durableStore,
  durableStoreFilePath,
  mode = "deterministic_test",
  now = defaultNow,
  requestedDriverId,
}: CreateCampaignDbRepositoryOptions = {}): CampaignDbRepository => {
  const recordsById = new Map<string, CampaignDbDraft>();
  const taskRecordsById = new Map<string, CampaignDbTaskDraft>();
  const events: CampaignDbRepositoryEvent[] = [];
  const adapterId =
    mode === "production_deferred"
      ? "campaign-db-production-adapter-deferred"
      : mode === "durable_test"
        ? "campaign-db-durable-test-adapter"
      : "campaign-db-deterministic-adapter";
  const activeDurableStore =
    mode === "durable_test"
      ? durableStore ??
        createCampaignDurableStore({
          boundedListLimit,
          filePath: durableStoreFilePath,
          mode: "durable_test",
        })
      : undefined;
  let idSequence = 0;
  let taskIdSequence = 0;
  let eventSequence = 0;
  let transactionSequence = 0;

  const productionDiagnostics =
    mode === "production_deferred" ? [createProductionDeferredDiagnostic(requestedDriverId)] : [];

  const assertWritable = () => {
    if (mode === "production_deferred") {
      throw new CampaignDbRepositoryError(
        "Campaign DB production repository is deferred.",
        productionDiagnostics,
      );
    }
  };

  const nextCampaignId = () => {
    idSequence += 1;

    return `campaign-db-draft-${idSequence.toString().padStart(4, "0")}`;
  };

  const nextTaskId = () => {
    taskIdSequence += 1;

    return `campaign-db-task-draft-${taskIdSequence.toString().padStart(4, "0")}`;
  };

  const nextTransactionId = () => {
    transactionSequence += 1;

    return `campaign-db-uow-${transactionSequence.toString().padStart(4, "0")}`;
  };

  const appendEvent = ({
    entity = "Campaign",
    operation,
    traceId,
    transactionId,
    type,
  }: {
    entity?: CampaignDbRepositoryEvent["entity"];
    operation: string;
    traceId?: string;
    transactionId?: string;
    type: CampaignDbRepositoryEventType;
  }) => {
    eventSequence += 1;
    events.push({
      entity,
      id: `campaign-db-event-${eventSequence.toString().padStart(4, "0")}`,
      liveExecution: false,
      operation,
      sequence: eventSequence,
      storeId: "campaign-db",
      ...(traceId ? { traceId } : {}),
      ...(transactionId ? { transactionId } : {}),
      type,
    });
  };

  const listTaskDraftsByCampaignId = async (campaignId: string) =>
    activeDurableStore
      ? await activeDurableStore.listTaskDraftsByCampaignId(campaignId)
      : Array.from(taskRecordsById.values())
        .filter((task) => task.campaignId === campaignId)
        .sort((left, right) => left.id.localeCompare(right.id));

  const toProjection = async (draft: CampaignDbDraft): Promise<CampaignDbReadProjection> => ({
    ...draft,
    repository: {
      adapterId,
      createdViaRepository: true,
      repositoryId: "campaign-db-repository-runtime",
      storeId: "campaign-db",
    },
    tasks: await listTaskDraftsByCampaignId(draft.id),
  });

  const resolveRecordCount = async () =>
    activeDurableStore ? (await activeDurableStore.manifest()).recordCount : recordsById.size;

  const resolveTaskRecordCount = async () =>
    activeDurableStore ? (await activeDurableStore.manifest()).taskRecordCount : taskRecordsById.size;

  const durableDiagnostics = async () =>
    activeDurableStore
      ? (await activeDurableStore.manifest()).diagnostics.map((issue) => ({
        code: issue.code as CampaignDbDiagnosticCode,
        field: issue.field,
        message: issue.message,
        severity: issue.severity,
      }))
      : [];

  const health = async (): Promise<CampaignDbRepositoryHealth> => {
    const campaignStore = activeDurableStore ? await activeDurableStore.manifest() : undefined;
    const storeDiagnostics = await durableDiagnostics();
    const diagnostics = [...productionDiagnostics, ...storeDiagnostics];

    return {
      adapterId,
      ...(campaignStore ? { campaignStore } : {}),
      diagnosticCodes: diagnostics.map((issue) => issue.code),
      diagnostics,
      eventCount: events.length,
      fallbackUsed: false,
      id: "campaign-db-repository-runtime",
      liveConnectionAttempted: false,
      liveMigrationExecutionEnabled: false,
      liveQueryExecutionEnabled: false,
      productionReady: false,
      recordCount: await resolveRecordCount(),
      selectedMode: mode,
      status: mode === "production_deferred" || diagnostics.some((issue) => issue.severity === "error")
        ? "blocked"
        : "ready",
      storeId: "campaign-db",
      taskRecordCount: await resolveTaskRecordCount(),
      validation: {
        issues: diagnostics,
        valid: diagnostics.length === 0,
      },
    };
  };

  return {
    addTaskDraft: async (input, context = {}) => {
      assertWritable();

      const campaign = activeDurableStore
        ? await activeDurableStore.getById(input.campaignId)
        : recordsById.get(input.campaignId);
      const validated = validateAddTaskDraftInput(input, Boolean(campaign));
      const transactionId = nextTransactionId();
      appendEvent({
        entity: "CampaignTask",
        operation: "begin_add_task_draft",
        traceId: context.traceId,
        transactionId,
        type: "transaction.begin",
      });
      appendEvent({
        entity: "CampaignTask",
        operation: "plan_insert_campaign_task_draft",
        traceId: context.traceId,
        transactionId,
        type: "command.planned",
      });

      const createdAt = now();
      const task: CampaignDbTaskDraft = {
        ...validated,
        createdAt,
        id: nextTaskId(),
        updatedAt: createdAt,
      };

      if (activeDurableStore) {
        await activeDurableStore.createTaskDraft(task);
      } else {
        taskRecordsById.set(task.id, task);
      }

      appendEvent({
        entity: "CampaignTask",
        operation: "insert_campaign_task_draft",
        traceId: context.traceId,
        transactionId,
        type: "command.insert",
      });
      appendEvent({
        entity: "CampaignTask",
        operation: "commit_add_task_draft",
        traceId: context.traceId,
        transactionId,
        type: "transaction.commit",
      });

      return task;
    },
    createDraft: async (input, context = {}) => {
      assertWritable();

      const transactionId = nextTransactionId();
      appendEvent({
        operation: "begin_create_draft",
        traceId: context.traceId,
        transactionId,
        type: "transaction.begin",
      });
      appendEvent({
        operation: "plan_insert_campaign_draft",
        traceId: context.traceId,
        transactionId,
        type: "command.planned",
      });

      const validated = validateCreateDraftInput(input);
      const createdAt = now();
      const draft: CampaignDbDraft = {
        ...validated,
        createdAt,
        id: nextCampaignId(),
        updatedAt: createdAt,
      };

      if (activeDurableStore) {
        await activeDurableStore.create(draft);
      } else {
        recordsById.set(draft.id, draft);
      }

      appendEvent({
        operation: "insert_campaign_draft",
        traceId: context.traceId,
        transactionId,
        type: "command.insert",
      });
      appendEvent({
        operation: "commit_create_draft",
        traceId: context.traceId,
        transactionId,
        type: "transaction.commit",
      });

      return draft;
    },
    getById: async (campaignId, context = {}) => {
      appendEvent({
        operation: "lookup_campaign_by_id",
        traceId: context.traceId,
        type: "query.lookup",
      });

      const draft = activeDurableStore
        ? await activeDurableStore.getById(campaignId)
        : recordsById.get(campaignId);

      return draft ? await toProjection(draft) : undefined;
    },
    getEvents: () => [...events],
    health,
    list: async (filter = {}, context = {}) => {
      appendEvent({
        operation: "list_campaign_drafts",
        traceId: context.traceId,
        type: "query.list",
      });

      const records = activeDurableStore
        ? await activeDurableStore.list(filter)
        : Array.from(recordsById.values());

      const filteredRecords = records
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
        .sort((left, right) => left.id.localeCompare(right.id));

      return Promise.all(filteredRecords.map(toProjection));
    },
    reset: async () => {
      recordsById.clear();
      taskRecordsById.clear();
      await activeDurableStore?.reset();
      events.length = 0;
      idSequence = 0;
      taskIdSequence = 0;
      eventSequence = 0;
      transactionSequence = 0;
    },
  };
};
