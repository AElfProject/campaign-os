import type {
  TaskTemplateAdoptionMode,
  TaskTemplateCanonicalObject,
  TaskTemplateCatalogStatus,
  TaskTemplateCatalogVersion,
} from "../domain/taskTemplateCatalog";
import type {
  VerificationType,
  WalletCompatibility,
} from "../domain/types";

export const TASK_TEMPLATE_CATALOG_DEFAULT_PAGE_SIZE = 24;
export const TASK_TEMPLATE_CATALOG_MAX_PAGE_SIZE = 100;
export const TASK_TEMPLATE_CATALOG_MAX_FILTER_VALUES = 16;
export const TASK_TEMPLATE_ADOPTION_IDEMPOTENCY_KEY_MAX_LENGTH = 128;
export const TASK_TEMPLATE_ADOPTION_IDEMPOTENCY_KEY_MIN_LENGTH = 8;
export const TASK_TEMPLATE_SNAPSHOT_VERSION = "task-template-snapshot-v1" as const;

export type TaskTemplateCatalogOperation = "adopt" | "close" | "detail" | "list";

export type TaskTemplateCatalogErrorCode =
  | "TASK_TEMPLATE_ARGUMENT_INVALID"
  | "TASK_TEMPLATE_CURSOR_INVALID"
  | "TASK_TEMPLATE_NOT_FOUND"
  | "TASK_TEMPLATE_STALE"
  | "TASK_TEMPLATE_ADOPTION_DEFERRED"
  | "TASK_TEMPLATE_MANUAL_REVIEW_REQUIRED"
  | "TASK_TEMPLATE_POLICY_MISMATCH"
  | "TASK_TEMPLATE_CORRUPT"
  | "TASK_TEMPLATE_SCHEMA_NOT_READY"
  | "TASK_TEMPLATE_CATALOG_UNAVAILABLE"
  | "TASK_TEMPLATE_ADOPTION_CONFLICT"
  | "TASK_TEMPLATE_CLOSED"
  | "TASK_TEMPLATE_CLEANUP_FAILED";

const SAFE_MESSAGES: Readonly<Record<TaskTemplateCatalogErrorCode, string>> = Object.freeze({
  TASK_TEMPLATE_ADOPTION_CONFLICT: "Task template adoption conflicts with an existing request.",
  TASK_TEMPLATE_ADOPTION_DEFERRED: "Task template adoption is not available yet.",
  TASK_TEMPLATE_ARGUMENT_INVALID: "Task template catalog argument is invalid.",
  TASK_TEMPLATE_CATALOG_UNAVAILABLE: "Task template catalog is unavailable.",
  TASK_TEMPLATE_CLEANUP_FAILED: "Task template catalog cleanup failed.",
  TASK_TEMPLATE_CLOSED: "Task template catalog is closed.",
  TASK_TEMPLATE_CORRUPT: "Task template catalog data is invalid.",
  TASK_TEMPLATE_CURSOR_INVALID: "Task template catalog cursor is invalid.",
  TASK_TEMPLATE_MANUAL_REVIEW_REQUIRED: "Task template requires manual review.",
  TASK_TEMPLATE_NOT_FOUND: "Task template catalog resource was not found.",
  TASK_TEMPLATE_POLICY_MISMATCH: "Task template adoption policy does not allow the request.",
  TASK_TEMPLATE_SCHEMA_NOT_READY: "Task template catalog schema is not ready.",
  TASK_TEMPLATE_STALE: "Task template is no longer adoptable.",
});

const RETRYABLE_CODES = new Set<TaskTemplateCatalogErrorCode>([
  "TASK_TEMPLATE_CATALOG_UNAVAILABLE",
  "TASK_TEMPLATE_CLEANUP_FAILED",
  "TASK_TEMPLATE_SCHEMA_NOT_READY",
]);

export class TaskTemplateCatalogError extends Error {
  readonly code: TaskTemplateCatalogErrorCode;
  readonly field: string;
  readonly operation: TaskTemplateCatalogOperation;
  readonly retryable: boolean;
  readonly traceId: string;

  constructor(options: {
    code: TaskTemplateCatalogErrorCode;
    field: string;
    operation: TaskTemplateCatalogOperation;
    traceId: string;
  }) {
    super(SAFE_MESSAGES[options.code]);
    this.name = "TaskTemplateCatalogError";
    this.code = options.code;
    this.field = options.field;
    this.operation = options.operation;
    this.retryable = RETRYABLE_CODES.has(options.code);
    this.traceId = options.traceId;
    delete this.stack;
  }
}

export interface TaskTemplateCatalogQuery {
  readonly categories?: readonly string[];
  readonly cursor?: string;
  readonly limit?: number;
  readonly locale?: string;
  readonly statuses?: readonly TaskTemplateCatalogStatus[];
  readonly verificationTypes?: readonly VerificationType[];
  readonly walletCompatibility?: readonly WalletCompatibility[];
}

export interface TaskTemplateCatalogReadContext {
  readonly historicalReadAllowed?: boolean;
  readonly traceId: string;
}

export interface TaskTemplateCatalogPage {
  readonly catalogSchemaVersion: "task-template-catalog-v1";
  readonly items: readonly TaskTemplateCatalogVersion[];
  readonly page: Readonly<{
    limit: number;
    nextCursor: string | null;
  }>;
  readonly snapshotAt: string;
  readonly totalActive: number;
}

export interface TaskTemplateAdoptionRequest {
  readonly campaignId: string;
  readonly idempotencyKey: string;
  readonly overrides?: Readonly<{
    points?: number;
    required?: boolean;
  }>;
  readonly template: Readonly<{
    templateCode: string;
    version: number;
  }>;
}

export interface TaskTemplateAdoptionAuthority {
  readonly ownerAddress: string;
  readonly traceId: string;
}

export interface TaskTemplateSnapshotV1 {
  readonly adoptionMode: Extract<TaskTemplateAdoptionMode, "direct">;
  readonly category: string;
  readonly evidenceRule: TaskTemplateCanonicalObject;
  readonly points: number;
  readonly required: boolean;
  readonly templateChecksum: string;
  readonly templateCode: string;
  readonly templateVersion: number;
  readonly verificationType: VerificationType;
  readonly version: typeof TASK_TEMPLATE_SNAPSHOT_VERSION;
  readonly walletCompatibility: WalletCompatibility;
}

export interface TaskTemplateAdoptedTask {
  readonly campaignId: string;
  readonly createdAt: string;
  readonly evidenceRule: TaskTemplateCanonicalObject;
  readonly points: number;
  readonly replayed: boolean;
  readonly required: boolean;
  readonly snapshot: TaskTemplateSnapshotV1;
  readonly taskId: string;
  readonly templateChecksum: string;
  readonly templateCode: string;
  readonly templateVersion: number;
  readonly updatedAt: string;
  readonly verificationType: VerificationType;
  readonly walletCompatibility: WalletCompatibility;
}

export interface TaskTemplateCatalogStore {
  adopt(
    request: TaskTemplateAdoptionRequest,
    authority: TaskTemplateAdoptionAuthority,
  ): Promise<TaskTemplateAdoptedTask>;
  close(context?: { readonly traceId: string }): Promise<void>;
  get(
    identity: { readonly templateCode: string; readonly version: number },
    context: TaskTemplateCatalogReadContext,
  ): Promise<TaskTemplateCatalogVersion | null>;
  list(
    query: TaskTemplateCatalogQuery,
    context: TaskTemplateCatalogReadContext,
  ): Promise<TaskTemplateCatalogPage>;
}
