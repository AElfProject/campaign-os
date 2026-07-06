import { describe, expect, it } from "vitest";
import {
  DeterministicDatabaseDriver,
  createDatabaseQueryAdapterSummary,
  databaseStoreMappings,
  repositoryOperationContracts,
  validateDatabaseStoreMappings,
  validateRepositoryOperationContracts,
  type DatabaseStoreMapping,
} from "./databaseQueryAdapterPort";
import { productionDatabaseRequiredStoreIds } from "./productionDatabase";

describe("database query adapter port", () => {
  it("maps every required v0.2 relational store exactly once", () => {
    expect(databaseStoreMappings.map((mapping) => mapping.id)).toEqual(
      productionDatabaseRequiredStoreIds,
    );
    expect(new Set(databaseStoreMappings.map((mapping) => mapping.id)).size).toBe(
      productionDatabaseRequiredStoreIds.length,
    );
    expect(validateDatabaseStoreMappings()).toEqual([]);

    for (const mapping of databaseStoreMappings) {
      expect(mapping.adapterStatus).toBe("mapped");
      expect(mapping.entities.length).toBeGreaterThan(0);
      expect(mapping.ownerServiceId).not.toHaveLength(0);
      expect(mapping.primaryKeys.length).toBeGreaterThan(0);
      expect(mapping.required).toBe(true);
      expect(mapping.schemaVersion).toMatch(/^v\d+\.\d+\.\d+$/);
      expect(mapping.tableNamespace).toBe(mapping.id.replace(/-/g, "_"));
    }
  });

  it("maps required v0.2 entities to repository operation contracts", () => {
    const contractByEntity = new Map(
      repositoryOperationContracts.map((contract) => [contract.entity, contract]),
    );

    expect(validateRepositoryOperationContracts()).toEqual([]);
    expect(contractByEntity.get("Campaign")).toMatchObject({
      ownerServiceId: "campaign-service",
      storeId: "campaign-db",
    });
    expect(contractByEntity.get("NormalizedWalletSession")).toMatchObject({
      ownerServiceId: "wallet-session-service",
      storeId: "wallet-session-db",
    });
    expect(contractByEntity.get("TaskCompletion")).toMatchObject({
      ownerServiceId: "verification-service",
      storeId: "task-evidence-db",
    });
    expect(contractByEntity.get("I18nContentRevision")).toMatchObject({
      ownerServiceId: "i18n-content-service",
      storeId: "i18n-content-db",
    });
    expect(contractByEntity.get("RiskEvent")).toMatchObject({
      ownerServiceId: "risk-intelligence-service",
      storeId: "risk-event-db",
    });
    expect(contractByEntity.get("PointsLedgerEntry")).toMatchObject({
      ownerServiceId: "points-ranking-service",
      storeId: "points-ledger",
    });

    for (const contract of repositoryOperationContracts) {
      expect(contract.operations).toEqual(
        expect.arrayContaining(["read", "write"]),
      );
      expect(contract.operations.length).toBeGreaterThan(0);
      expect(contract.rawSqlAllowed).toBe(false);
      expect(productionDatabaseRequiredStoreIds).toContain(contract.storeId);
    }
  });

  it("reports validation diagnostics for missing and duplicate store mappings", () => {
    const duplicateMapping: DatabaseStoreMapping = {
      ...databaseStoreMappings[0],
    };
    const incompleteMapping: DatabaseStoreMapping = {
      ...databaseStoreMappings[1],
      entities: [],
      ownerServiceId: "",
      primaryKeys: [],
      schemaVersion: "",
    };
    const issues = validateDatabaseStoreMappings([
      duplicateMapping,
      duplicateMapping,
      incompleteMapping,
      ...databaseStoreMappings.slice(2),
    ]);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DATABASE_QUERY_STORE_DUPLICATE_MAPPING",
          field: "campaign-db",
        }),
        expect.objectContaining({
          code: "DATABASE_QUERY_STORE_MISSING_OWNER",
          field: "wallet-session-db",
        }),
        expect.objectContaining({
          code: "DATABASE_QUERY_STORE_MISSING_SCHEMA",
          field: "wallet-session-db",
        }),
        expect.objectContaining({
          code: "DATABASE_QUERY_STORE_MISSING_ENTITIES",
          field: "wallet-session-db",
        }),
        expect.objectContaining({
          code: "DATABASE_QUERY_STORE_MISSING_PRIMARY_KEY",
          field: "wallet-session-db",
        }),
      ]),
    );
  });

  it("creates a deterministic no-live-query summary", () => {
    const summary = createDatabaseQueryAdapterSummary();

    expect(summary).toMatchObject({
      adHocRawSqlEnabled: false,
      deterministicTestMode: true,
      driverId: "campaign-os-deterministic-test-driver",
      id: "campaign-os-database-query-adapter-port",
      liveQueryExecutionEnabled: false,
      mappedStoreCount: productionDatabaseRequiredStoreIds.length,
      parameterizedQueries: true,
      repositoryContractCount: repositoryOperationContracts.length,
      supportedStoreIds: productionDatabaseRequiredStoreIds,
      transactionMode: "deterministic_test",
    });
    expect(summary.capabilities).toEqual(["read", "write", "transaction", "migration_plan"]);
  });

  it("plans store-scoped query and command events without live execution", () => {
    const driver = new DeterministicDatabaseDriver();
    const queryResult = driver.planQuery({
      entity: "Campaign",
      filters: {
        campaignId: "campaign-1",
      },
      operation: "select",
      storeId: "campaign-db",
      traceId: "trace-query",
    });
    const commandResult = driver.planCommand({
      entity: "TaskCompletion",
      operation: "upsert",
      payloadSummary: {
        completionCount: 1,
      },
      storeId: "task-evidence-db",
      traceId: "trace-command",
    });

    expect(queryResult).toMatchObject({
      diagnostics: [],
      event: {
        entity: "Campaign",
        id: "database-driver-event-1",
        operation: "select",
        sequence: 1,
        storeId: "campaign-db",
        type: "query.planned",
      },
    });
    expect(commandResult).toMatchObject({
      diagnostics: [],
      event: {
        entity: "TaskCompletion",
        id: "database-driver-event-2",
        operation: "upsert",
        sequence: 2,
        storeId: "task-evidence-db",
        type: "command.planned",
      },
    });
    expect(driver.summary().liveQueryExecutionEnabled).toBe(false);
    expect(JSON.stringify(driver.getEvents()).toLowerCase()).not.toContain("select *");
  });

  it("captures deterministic transaction begin and commit events", () => {
    const driver = new DeterministicDatabaseDriver();
    const begin = driver.beginTransaction("uow-commit");
    const query = driver.planQuery({
      entity: "NormalizedWalletSession",
      operation: "lookup",
      storeId: "wallet-session-db",
      traceId: "trace-wallet",
    });
    const commit = driver.commitTransaction("uow-commit");

    expect(begin.unitOfWork).toMatchObject({
      id: "uow-commit",
      liveCommitEnabled: false,
      mode: "deterministic_test",
      state: "active",
    });
    expect(query.event.transactionId).toBe("uow-commit");
    expect(commit.unitOfWork).toMatchObject({
      id: "uow-commit",
      state: "committed",
    });
    expect(driver.getEvents().map((event) => event.type)).toEqual([
      "transaction.begin",
      "query.planned",
      "transaction.commit",
    ]);
    expect(driver.getEvents().map((event) => event.sequence)).toEqual([1, 2, 3]);
  });

  it("captures deterministic rollback events", () => {
    const driver = new DeterministicDatabaseDriver();

    driver.beginTransaction("uow-rollback");
    driver.planCommand({
      entity: "PointsLedgerEntry",
      operation: "insert",
      storeId: "points-ledger",
      traceId: "trace-ledger",
    });
    const rollback = driver.rollbackTransaction("uow-rollback");

    expect(rollback.unitOfWork).toMatchObject({
      id: "uow-rollback",
      state: "rolled_back",
    });
    expect(driver.getEvents().map((event) => event.type)).toEqual([
      "transaction.begin",
      "command.planned",
      "transaction.rollback",
    ]);
  });

  it("emits diagnostics for invalid transaction transitions and unsupported stores", () => {
    const driver = new DeterministicDatabaseDriver();
    const commitBeforeBegin = driver.commitTransaction("missing-uow");
    const begin = driver.beginTransaction("active-uow");
    const duplicateBegin = driver.beginTransaction("second-uow");
    const commit = driver.commitTransaction("active-uow");
    const commitAgain = driver.commitTransaction("active-uow");
    const unsupportedStore = driver.planQuery({
      entity: "ExportPreview",
      operation: "select",
      storeId: "export-store",
      traceId: "trace-export",
    });

    expect(begin.diagnostics).toEqual([]);
    expect(commit.diagnostics).toEqual([]);
    expect(commitBeforeBegin.diagnostics).toEqual([
      expect.objectContaining({
        code: "DATABASE_QUERY_TRANSACTION_NOT_ACTIVE",
      }),
    ]);
    expect(duplicateBegin.diagnostics).toEqual([
      expect.objectContaining({
        code: "DATABASE_QUERY_TRANSACTION_ALREADY_ACTIVE",
      }),
    ]);
    expect(commitAgain.diagnostics).toEqual([
      expect.objectContaining({
        code: "DATABASE_QUERY_TRANSACTION_ALREADY_CLOSED",
      }),
    ]);
    expect(unsupportedStore.diagnostics).toEqual([
      expect.objectContaining({
        code: "DATABASE_QUERY_STORE_UNSUPPORTED",
        field: "export-store",
      }),
    ]);
    expect(driver.getEvents().filter((event) => event.type === "diagnostic")).toHaveLength(4);
    expect(driver.getDiagnostics().map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "DATABASE_QUERY_TRANSACTION_NOT_ACTIVE",
        "DATABASE_QUERY_TRANSACTION_ALREADY_ACTIVE",
        "DATABASE_QUERY_TRANSACTION_ALREADY_CLOSED",
        "DATABASE_QUERY_STORE_UNSUPPORTED",
      ]),
    );
  });
});
