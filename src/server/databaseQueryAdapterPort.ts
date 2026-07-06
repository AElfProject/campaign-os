import type { BackendStoreId } from "./persistenceAdapterPort";
import {
  productionDatabaseRequiredStoreIds,
  productionDatabaseStoreRegistry,
  type ProductionDatabaseStoreRegistryEntry,
} from "./productionDatabase";

export type DatabaseStoreAdapterStatus = "mapped" | "deferred" | "blocked";
export type DatabaseQueryCapability = "read" | "write" | "transaction" | "migration_plan";
export type DatabaseQueryOperation = "select" | "count" | "lookup";
export type DatabaseCommandOperation = "insert" | "update" | "delete" | "upsert";
export type DatabaseDriverEventType =
  | "query.planned"
  | "command.planned"
  | "transaction.begin"
  | "transaction.commit"
  | "transaction.rollback"
  | "diagnostic";
export type DatabaseTransactionState = "active" | "committed" | "rolled_back";
export type DatabaseTransactionMode = "deterministic_test" | "deferred_live";
export type DatabaseQueryAdapterDiagnosticCode =
  | "DATABASE_QUERY_STORE_UNSUPPORTED"
  | "DATABASE_QUERY_STORE_MISSING_MAPPING"
  | "DATABASE_QUERY_STORE_DUPLICATE_MAPPING"
  | "DATABASE_QUERY_STORE_MISSING_OWNER"
  | "DATABASE_QUERY_STORE_MISSING_SCHEMA"
  | "DATABASE_QUERY_STORE_MISSING_ENTITIES"
  | "DATABASE_QUERY_STORE_MISSING_PRIMARY_KEY"
  | "DATABASE_QUERY_TRANSACTION_ALREADY_ACTIVE"
  | "DATABASE_QUERY_TRANSACTION_NOT_ACTIVE"
  | "DATABASE_QUERY_TRANSACTION_ALREADY_CLOSED";

export interface DatabaseQueryAdapterDiagnostic {
  code: DatabaseQueryAdapterDiagnosticCode;
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface DatabaseStoreMapping {
  adapterStatus: DatabaseStoreAdapterStatus;
  entities: string[];
  id: BackendStoreId;
  label: string;
  ownerServiceId: string;
  primaryKeys: string[];
  required: boolean;
  schemaVersion: string;
  tableNamespace: string;
}

export interface DatabaseQueryAdapterSummary {
  capabilities: DatabaseQueryCapability[];
  deterministicTestMode: boolean;
  diagnosticCodes: DatabaseQueryAdapterDiagnosticCode[];
  driverId: string;
  id: string;
  liveQueryExecutionEnabled: false;
  mappedStoreCount: number;
  supportedStoreIds: BackendStoreId[];
}

export interface DatabasePlanScope {
  entity: string;
  storeId: BackendStoreId;
  traceId: string;
}

export interface DatabaseQueryPlan extends DatabasePlanScope {
  filters?: Record<string, string | number | boolean>;
  limit?: number;
  operation: DatabaseQueryOperation;
}

export interface DatabaseCommandPlan extends DatabasePlanScope {
  operation: DatabaseCommandOperation;
  payloadSummary?: Record<string, string | number | boolean>;
}

export interface DatabaseTransactionUnitOfWork {
  id: string;
  liveCommitEnabled: false;
  mode: DatabaseTransactionMode;
  state: DatabaseTransactionState;
}

export interface DatabaseDriverEvent {
  diagnostic?: DatabaseQueryAdapterDiagnostic;
  entity?: string;
  id: string;
  operation?: DatabaseCommandOperation | DatabaseQueryOperation;
  sequence: number;
  storeId?: BackendStoreId;
  transactionId?: string;
  type: DatabaseDriverEventType;
}

export interface DatabaseQueryAdapterResult {
  diagnostics: DatabaseQueryAdapterDiagnostic[];
  event: DatabaseDriverEvent;
}

export interface DatabaseTransactionResult extends DatabaseQueryAdapterResult {
  unitOfWork?: DatabaseTransactionUnitOfWork;
}

export interface DatabaseQueryAdapterPort {
  beginTransaction(unitOfWorkId?: string): DatabaseTransactionResult;
  commitTransaction(unitOfWorkId?: string): DatabaseTransactionResult;
  getDiagnostics(): DatabaseQueryAdapterDiagnostic[];
  getEvents(): DatabaseDriverEvent[];
  planCommand(plan: DatabaseCommandPlan): DatabaseQueryAdapterResult;
  planQuery(plan: DatabaseQueryPlan): DatabaseQueryAdapterResult;
  rollbackTransaction(unitOfWorkId?: string): DatabaseTransactionResult;
  summary(): DatabaseQueryAdapterSummary;
}

const primaryKeysForStore = (store: ProductionDatabaseStoreRegistryEntry): string[] => {
  if (store.id === "points-ledger") {
    return ["ledgerEntryId"];
  }

  if (store.id === "wallet-session-db") {
    return ["walletAddress", "chainId"];
  }

  return ["id"];
};

export const databaseStoreMappings: DatabaseStoreMapping[] = productionDatabaseStoreRegistry.map((store) => ({
  adapterStatus: "mapped",
  entities: [...store.entities],
  id: store.id,
  label: store.label,
  ownerServiceId: store.ownerServiceId,
  primaryKeys: primaryKeysForStore(store),
  required: true,
  schemaVersion: store.schemaVersion,
  tableNamespace: store.id.replace(/-/g, "_"),
}));

const diagnostic = (
  code: DatabaseQueryAdapterDiagnosticCode,
  field: string,
  message: string,
  severity: DatabaseQueryAdapterDiagnostic["severity"] = "error",
): DatabaseQueryAdapterDiagnostic => ({
  code,
  field,
  message,
  severity,
});

export const validateDatabaseStoreMappings = (
  mappings: readonly DatabaseStoreMapping[] = databaseStoreMappings,
): DatabaseQueryAdapterDiagnostic[] => {
  const issues: DatabaseQueryAdapterDiagnostic[] = [];
  const seenStoreIds = new Set<BackendStoreId>();

  for (const requiredStoreId of productionDatabaseRequiredStoreIds) {
    const matchingMappings = mappings.filter((mapping) => mapping.id === requiredStoreId);

    if (matchingMappings.length === 0) {
      issues.push(
        diagnostic(
          "DATABASE_QUERY_STORE_MISSING_MAPPING",
          requiredStoreId,
          `Required database store '${requiredStoreId}' is not mapped.`,
        ),
      );
      continue;
    }

    if (matchingMappings.length > 1) {
      issues.push(
        diagnostic(
          "DATABASE_QUERY_STORE_DUPLICATE_MAPPING",
          requiredStoreId,
          `Required database store '${requiredStoreId}' has duplicate mappings.`,
        ),
      );
    }
  }

  for (const mapping of mappings) {
    if (seenStoreIds.has(mapping.id)) {
      continue;
    }

    seenStoreIds.add(mapping.id);

    if (!mapping.ownerServiceId) {
      issues.push(
        diagnostic(
          "DATABASE_QUERY_STORE_MISSING_OWNER",
          mapping.id,
          `Database store '${mapping.id}' is missing ownerServiceId.`,
        ),
      );
    }

    if (!mapping.schemaVersion) {
      issues.push(
        diagnostic(
          "DATABASE_QUERY_STORE_MISSING_SCHEMA",
          mapping.id,
          `Database store '${mapping.id}' is missing schemaVersion.`,
        ),
      );
    }

    if (mapping.entities.length === 0) {
      issues.push(
        diagnostic(
          "DATABASE_QUERY_STORE_MISSING_ENTITIES",
          mapping.id,
          `Database store '${mapping.id}' does not declare entity coverage.`,
        ),
      );
    }

    if (mapping.primaryKeys.length === 0) {
      issues.push(
        diagnostic(
          "DATABASE_QUERY_STORE_MISSING_PRIMARY_KEY",
          mapping.id,
          `Database store '${mapping.id}' does not declare primary keys.`,
        ),
      );
    }
  }

  return issues;
};

export const createDatabaseQueryAdapterSummary = ({
  diagnostics = validateDatabaseStoreMappings(),
  driverId = "campaign-os-deterministic-test-driver",
  mappings = databaseStoreMappings,
}: {
  diagnostics?: readonly DatabaseQueryAdapterDiagnostic[];
  driverId?: string;
  mappings?: readonly DatabaseStoreMapping[];
} = {}): DatabaseQueryAdapterSummary => ({
  capabilities: ["read", "write", "transaction", "migration_plan"],
  deterministicTestMode: true,
  diagnosticCodes: diagnostics.map((item) => item.code),
  driverId,
  id: "campaign-os-database-query-adapter-port",
  liveQueryExecutionEnabled: false,
  mappedStoreCount: mappings.length,
  supportedStoreIds: mappings.map((mapping) => mapping.id),
});

export interface CreateDeterministicDatabaseDriverOptions {
  driverId?: string;
  mappings?: readonly DatabaseStoreMapping[];
}

export class DeterministicDatabaseDriver implements DatabaseQueryAdapterPort {
  private activeTransactionId?: string;
  private readonly closedTransactions = new Map<string, DatabaseTransactionState>();
  private readonly diagnostics: DatabaseQueryAdapterDiagnostic[];
  private readonly driverId: string;
  private readonly events: DatabaseDriverEvent[] = [];
  private readonly mappingByStoreId: Map<BackendStoreId, DatabaseStoreMapping>;
  private sequence = 0;

  constructor({
    driverId = "campaign-os-deterministic-test-driver",
    mappings = databaseStoreMappings,
  }: CreateDeterministicDatabaseDriverOptions = {}) {
    this.driverId = driverId;
    this.diagnostics = validateDatabaseStoreMappings(mappings);
    this.mappingByStoreId = new Map(mappings.map((mapping) => [mapping.id, mapping]));
  }

  beginTransaction(unitOfWorkId = `deterministic-uow-${this.sequence + 1}`): DatabaseTransactionResult {
    if (this.activeTransactionId) {
      return this.emitDiagnostic(
        "DATABASE_QUERY_TRANSACTION_ALREADY_ACTIVE",
        unitOfWorkId,
        `Cannot begin transaction '${unitOfWorkId}' while transaction '${this.activeTransactionId}' is active.`,
      );
    }

    if (this.closedTransactions.has(unitOfWorkId)) {
      return this.emitDiagnostic(
        "DATABASE_QUERY_TRANSACTION_ALREADY_CLOSED",
        unitOfWorkId,
        `Transaction '${unitOfWorkId}' is already ${this.closedTransactions.get(unitOfWorkId)}.`,
      );
    }

    this.activeTransactionId = unitOfWorkId;
    const unitOfWork: DatabaseTransactionUnitOfWork = {
      id: unitOfWorkId,
      liveCommitEnabled: false,
      mode: "deterministic_test",
      state: "active",
    };
    const event = this.emitEvent({
      transactionId: unitOfWorkId,
      type: "transaction.begin",
    });

    return {
      diagnostics: [],
      event,
      unitOfWork,
    };
  }

  commitTransaction(unitOfWorkId = this.activeTransactionId): DatabaseTransactionResult {
    const invalidResult = this.validateActiveTransaction(unitOfWorkId);

    if (invalidResult) {
      return invalidResult;
    }

    const transactionId = unitOfWorkId as string;
    const event = this.emitEvent({
      transactionId,
      type: "transaction.commit",
    });
    const unitOfWork = this.closeTransaction(transactionId, "committed");

    return {
      diagnostics: [],
      event,
      unitOfWork,
    };
  }

  getDiagnostics(): DatabaseQueryAdapterDiagnostic[] {
    return [...this.diagnostics];
  }

  getEvents(): DatabaseDriverEvent[] {
    return this.events.map((event) => ({ ...event }));
  }

  planCommand(plan: DatabaseCommandPlan): DatabaseQueryAdapterResult {
    const invalidStore = this.validateMappedStore(plan.storeId);

    if (invalidStore) {
      return invalidStore;
    }

    return {
      diagnostics: [],
      event: this.emitEvent({
        entity: plan.entity,
        operation: plan.operation,
        storeId: plan.storeId,
        transactionId: this.activeTransactionId,
        type: "command.planned",
      }),
    };
  }

  planQuery(plan: DatabaseQueryPlan): DatabaseQueryAdapterResult {
    const invalidStore = this.validateMappedStore(plan.storeId);

    if (invalidStore) {
      return invalidStore;
    }

    return {
      diagnostics: [],
      event: this.emitEvent({
        entity: plan.entity,
        operation: plan.operation,
        storeId: plan.storeId,
        transactionId: this.activeTransactionId,
        type: "query.planned",
      }),
    };
  }

  rollbackTransaction(unitOfWorkId = this.activeTransactionId): DatabaseTransactionResult {
    const invalidResult = this.validateActiveTransaction(unitOfWorkId);

    if (invalidResult) {
      return invalidResult;
    }

    const transactionId = unitOfWorkId as string;
    const event = this.emitEvent({
      transactionId,
      type: "transaction.rollback",
    });
    const unitOfWork = this.closeTransaction(transactionId, "rolled_back");

    return {
      diagnostics: [],
      event,
      unitOfWork,
    };
  }

  summary(): DatabaseQueryAdapterSummary {
    return createDatabaseQueryAdapterSummary({
      diagnostics: this.diagnostics,
      driverId: this.driverId,
      mappings: [...this.mappingByStoreId.values()],
    });
  }

  private closeTransaction(
    transactionId: string,
    state: Exclude<DatabaseTransactionState, "active">,
  ): DatabaseTransactionUnitOfWork {
    this.activeTransactionId = undefined;
    this.closedTransactions.set(transactionId, state);

    return {
      id: transactionId,
      liveCommitEnabled: false,
      mode: "deterministic_test",
      state,
    };
  }

  private emitDiagnostic(
    code: DatabaseQueryAdapterDiagnosticCode,
    field: string,
    message: string,
  ): DatabaseTransactionResult {
    const issue = diagnostic(code, field, message);
    this.diagnostics.push(issue);
    const event = this.emitEvent({
      diagnostic: issue,
      type: "diagnostic",
    });

    return {
      diagnostics: [issue],
      event,
    };
  }

  private emitEvent(
    event: Omit<DatabaseDriverEvent, "id" | "sequence">,
  ): DatabaseDriverEvent {
    this.sequence += 1;
    const nextEvent: DatabaseDriverEvent = {
      ...event,
      id: `database-driver-event-${this.sequence}`,
      sequence: this.sequence,
    };

    this.events.push(nextEvent);

    return nextEvent;
  }

  private validateActiveTransaction(
    unitOfWorkId: string | undefined,
  ): DatabaseTransactionResult | undefined {
    if (unitOfWorkId && this.closedTransactions.has(unitOfWorkId)) {
      return this.emitDiagnostic(
        "DATABASE_QUERY_TRANSACTION_ALREADY_CLOSED",
        unitOfWorkId,
        `Transaction '${unitOfWorkId}' is already ${this.closedTransactions.get(unitOfWorkId)}.`,
      );
    }

    if (!unitOfWorkId || !this.activeTransactionId) {
      return this.emitDiagnostic(
        "DATABASE_QUERY_TRANSACTION_NOT_ACTIVE",
        unitOfWorkId ?? "transaction",
        "No deterministic database transaction is active.",
      );
    }

    if (unitOfWorkId !== this.activeTransactionId) {
      return this.emitDiagnostic(
        "DATABASE_QUERY_TRANSACTION_NOT_ACTIVE",
        unitOfWorkId,
        `Transaction '${unitOfWorkId}' is not the active transaction.`,
      );
    }

    return undefined;
  }

  private validateMappedStore(
    storeId: BackendStoreId,
  ): DatabaseQueryAdapterResult | undefined {
    if (this.mappingByStoreId.has(storeId)) {
      return undefined;
    }

    const issue = diagnostic(
      "DATABASE_QUERY_STORE_UNSUPPORTED",
      storeId,
      `Database query adapter does not support store '${storeId}'.`,
    );
    this.diagnostics.push(issue);

    return {
      diagnostics: [issue],
      event: this.emitEvent({
        diagnostic: issue,
        storeId,
        type: "diagnostic",
      }),
    };
  }
}
