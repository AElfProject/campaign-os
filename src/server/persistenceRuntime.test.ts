import { describe, expect, it } from "vitest";
import {
  createConnectionConfigSummary,
  createProductionPersistenceRuntimeContract,
  productionPersistenceDeferredDependencies,
  productionPersistenceFoundationId,
} from "./persistenceRuntime";
import { productionDatabaseRequiredStoreIds } from "./productionDatabase";

const collectStringValues = (value: unknown, values: string[] = []): string[] => {
  if (typeof value === "string") {
    values.push(value);
    return values;
  }

  if (!value || typeof value !== "object") {
    return values;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringValues(item, values);
    }

    return values;
  }

  for (const nestedValue of Object.values(value)) {
    collectStringValues(nestedValue, values);
  }

  return values;
};

describe("production persistence runtime", () => {
  it("resolves a local review boundary without live persistence", () => {
    const contract = createProductionPersistenceRuntimeContract({ env: {} });

    expect(contract).toMatchObject({
      activeDriverId: "campaign-os-memory-adapter",
      adapterKind: "memory",
      foundationId: productionPersistenceFoundationId,
      id: "campaign-os-production-persistence-runtime",
      liveConnectionAttempted: false,
      profileId: "local-review",
      productionReady: false,
      schemaVersion: "v0.2.0",
      status: "active_local",
      valid: true,
    });
    expect(contract.providerDecision).toMatchObject({
      selectedDriverId: "campaign-os-deterministic-test-driver",
      selectedProviderId: "campaign-os-deterministic-test-db",
      status: "local-review",
    });
    expect(contract.driverDecision).toMatchObject({
      activeDriverId: "campaign-os-memory-adapter",
      adapterKind: "memory",
      status: "active",
    });
    expect(contract.schemaManifest).toMatchObject({
      id: "campaign-os-production-db-schema-v0.2",
      requiredStoreIds: productionDatabaseRequiredStoreIds,
      storeCount: 6,
    });
    expect(contract.connection).toMatchObject({
      missingKeys: [],
      requiredKeys: [],
      safeLabel: "not_configured",
      state: "not_configured",
    });
    expect(contract.transaction).toMatchObject({
      mode: "none",
      supported: false,
    });
    expect(contract.queryCapability).toMatchObject({
      adHocRawSqlEnabled: false,
      liveQueryExecutionEnabled: false,
      parameterizedQueries: true,
      repositoryContractCount: expect.any(Number),
      transactionMode: "none",
    });
    expect(contract.deferredDependencies.map((dependency) => dependency.id)).toEqual(
      productionPersistenceDeferredDependencies.map((dependency) => dependency.id),
    );
    expect(contract.stores.map((store) => store.id)).toEqual(productionDatabaseRequiredStoreIds);
    for (const store of contract.stores) {
      expect(store).toMatchObject({
        migrationRequired: true,
        operationCapability: {
          adHocRawSqlEnabled: false,
          migrationPlanRequired: true,
          parameterizedQueries: true,
          transactions: true,
        },
        readiness: "contract_ready",
        schemaVersion: "v0.2.0",
      });
      expect(store.entities.length).toBeGreaterThan(0);
      expect(store.ownerServiceId).not.toHaveLength(0);
      expect(store.operationCapability.operations).toEqual(
        expect.arrayContaining(["select", "insert", "update", "upsert", "migration_plan"]),
      );
    }
  });

  it("fails closed for production-required when production persistence config is missing", () => {
    const contract = createProductionPersistenceRuntimeContract({
      env: {
        CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
      },
    });

    expect(contract.valid).toBe(false);
    expect(contract.status).toBe("blocked");
    expect(contract.activeDriverId).toBe("campaign-os-production-db-adapter");
    expect(contract.adapterKind).toBe("production_deferred");
    expect(contract.productionReady).toBe(false);
    expect(contract.providerDecision).toMatchObject({
      selectedDriverId: "campaign-os-production-driver-deferred",
      selectedProviderId: "campaign-os-provider-deferred",
      status: "blocked",
    });
    expect(contract.driverDecision).toMatchObject({
      activeDriverId: "campaign-os-production-db-adapter",
      status: "blocked",
      valid: false,
    });
    expect(contract.providerDecision.valid).toBe(false);
    expect(contract.connection.missingKeys).toContain("CAMPAIGN_OS_DATABASE_URL");
    expect(contract.productionBlockers.map((dependency) => dependency.id)).toEqual(
      expect.arrayContaining([
        "db-provider-selection",
        "driver-package",
        "connection-config",
        "secret-manager",
        "connection-pool",
        "migration-executor",
        "migration-lock",
        "backup-restore-plan",
        "observability-exporter",
      ]),
    );
    expect(contract.queryCapability).toMatchObject({
      adHocRawSqlEnabled: false,
      liveQueryExecutionEnabled: false,
      transactionMode: "deferred_live",
    });
    expect(contract.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PRODUCTION_PERSISTENCE_CONFIG_REQUIRED",
          field: "CAMPAIGN_OS_DATABASE_URL",
          severity: "error",
        }),
      ]),
    );
  });

  it("keeps configured production-required persistence boundary-ready while blockers remain explicit", () => {
    const contract = createProductionPersistenceRuntimeContract({
      env: {
        CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
        CAMPAIGN_OS_DATABASE_URL: "postgres://user:password@db.example/prod",
      },
    });

    expect(contract.status).toBe("boundary_ready");
    expect(contract.valid).toBe(true);
    expect(contract.productionReady).toBe(false);
    expect(contract.providerDecision.valid).toBe(false);
    expect(contract.driverDecision.valid).toBe(false);
    expect(contract.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "PRODUCTION_PERSISTENCE_SECRET_REDACTED",
        "PRODUCTION_PERSISTENCE_LIVE_CONNECTION_DEFERRED",
      ]),
    );
    expect(contract.diagnostics).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "driverId",
        }),
      ]),
    );
  });

  it("redacts secret-like connection values from serialized summaries", () => {
    const secretValues = {
      CAMPAIGN_OS_DATABASE_URL: "postgres://user:pass@db.internal/campaign",
      CAMPAIGN_OS_DATABASE_PASSWORD: "plain-password",
      CAMPAIGN_OS_DATABASE_TOKEN: "token-value",
      CAMPAIGN_OS_DATABASE_BEARER: "Bearer abc",
      CAMPAIGN_OS_DATABASE_PRIVATE_KEY: "private-key",
      CAMPAIGN_OS_DATABASE_SIGNED_URL: "https://signed.example/upload?sig=abc",
      CAMPAIGN_OS_DATABASE_OBJECT_KEY: "object-key",
      CAMPAIGN_OS_DATABASE_MNEMONIC: "seed phrase words",
      CAMPAIGN_OS_DATABASE_SIGNATURE: "wallet-signature",
    };

    const summary = createConnectionConfigSummary({
      env: secretValues,
      profileId: "production-required",
    });
    const contract = createProductionPersistenceRuntimeContract({
      env: {
        ...secretValues,
        CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
        CAMPAIGN_OS_PERSISTENCE_DRIVER: "campaign-os-production-db-adapter",
      },
    });
    const strings = collectStringValues(summary);
    const serializedContract = JSON.stringify(contract);

    expect(summary).toMatchObject({
      configuredKeys: expect.arrayContaining([
        "CAMPAIGN_OS_DATABASE_URL",
        "CAMPAIGN_OS_DATABASE_PASSWORD",
        "CAMPAIGN_OS_DATABASE_TOKEN",
        "CAMPAIGN_OS_DATABASE_BEARER",
        "CAMPAIGN_OS_DATABASE_PRIVATE_KEY",
        "CAMPAIGN_OS_DATABASE_SIGNED_URL",
        "CAMPAIGN_OS_DATABASE_OBJECT_KEY",
        "CAMPAIGN_OS_DATABASE_MNEMONIC",
        "CAMPAIGN_OS_DATABASE_SIGNATURE",
      ]),
      safeLabel: "[redacted]",
      state: "configured_redacted",
    });
    expect(summary.redactedFields).toEqual(expect.arrayContaining(summary.configuredKeys));

    for (const secretValue of Object.values(secretValues)) {
      expect(strings).not.toContain(secretValue);
      expect(serializedContract).not.toContain(secretValue);
    }
  });

  it("reports unsupported requested drivers without leaking raw values", () => {
    const contract = createProductionPersistenceRuntimeContract({
      env: {
        CAMPAIGN_OS_PERSISTENCE_DRIVER: "postgres://user:secret@db.internal/campaign",
      },
    });
    const strings = collectStringValues(contract);

    expect(contract.valid).toBe(false);
    expect(contract.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PRODUCTION_PERSISTENCE_DRIVER_UNSUPPORTED",
          field: "CAMPAIGN_OS_PERSISTENCE_DRIVER",
          message: expect.stringContaining("[redacted]"),
          severity: "error",
        }),
      ]),
    );
    expect(strings).not.toContain("postgres://user:secret@db.internal/campaign");
  });
});
