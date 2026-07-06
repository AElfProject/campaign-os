import { describe, expect, it } from "vitest";
import {
  createProductionDbRuntime,
  createProductionDbRuntimeContract,
} from "./productionDbRuntime";
import { productionDatabaseRequiredStoreIds } from "./productionDatabase";

const secretEnv = {
  CAMPAIGN_OS_DATABASE_URL: "postgres://campaign_user:raw-password@db.internal/campaign",
  CAMPAIGN_OS_DATABASE_PASSWORD: "plain-password",
  CAMPAIGN_OS_DATABASE_TOKEN: "token-value",
  CAMPAIGN_OS_DATABASE_PRIVATE_KEY: "private-key-value",
  CAMPAIGN_OS_DATABASE_MNEMONIC: "seed phrase words",
  CAMPAIGN_OS_DATABASE_SIGNATURE: "wallet-signature",
};

describe("production DB runtime v1", () => {
  it("creates a local-review deterministic fixture contract without live DB side effects", () => {
    const contract = createProductionDbRuntimeContract({
      env: {},
      profileId: "local-review",
    });

    expect(contract).toMatchObject({
      driverId: "campaign-os-deterministic-test-driver",
      id: "campaign-os-production-db-runtime-v1",
      liveConnectionAttempted: false,
      liveQueryExecutionEnabled: false,
      profileId: "local-review",
      providerId: "campaign-os-deterministic-test-db",
      schemaManifestId: "campaign-os-production-db-schema-v0.2",
      status: "ready",
      valid: true,
    });
    expect(contract.connection).toMatchObject({
      attemptCount: 0,
      liveConnectionAttempted: false,
      safeLabel: "deterministic_fixture",
      state: "ready",
    });
    expect(contract.driver).toMatchObject({
      capability: {
        parameterizedQueries: true,
        pooling: false,
        requiresNetwork: false,
        requiresSecretManager: false,
        transactions: true,
      },
      deterministicFixture: true,
      productionReady: false,
    });
    expect(contract.ownerStores).toEqual(productionDatabaseRequiredStoreIds);
    expect(contract.queryCapability).toMatchObject({
      adHocRawSqlEnabled: false,
      liveQueryExecutionEnabled: false,
      parameterizedQueries: true,
      transactions: true,
    });
    expect(contract.migrationGate.status).toBe("not_required_for_fixture");
  });

  it("fails closed for production-required profile without production prerequisites", () => {
    const contract = createProductionDbRuntimeContract({
      env: {
        CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
      },
    });

    expect(contract.valid).toBe(false);
    expect(contract.status).toBe("blocked");
    expect(contract.driver.productionReady).toBe(false);
    expect(contract.connection).toMatchObject({
      liveConnectionAttempted: false,
      missingConfigKeys: ["CAMPAIGN_OS_DATABASE_URL"],
      state: "blocked",
    });
    expect(contract.migrationGate).toMatchObject({
      approvalRequired: true,
      liveExecutionEnabled: false,
      rollbackMetadataReady: false,
      status: "blocked",
    });
    expect(contract.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PRODUCTION_DB_CONFIG_REQUIRED",
          field: "CAMPAIGN_OS_DATABASE_URL",
          severity: "error",
        }),
        expect.objectContaining({
          code: "PRODUCTION_DB_DRIVER_DEFERRED",
          severity: "error",
        }),
        expect.objectContaining({
          code: "PRODUCTION_DB_MIGRATION_GATE_BLOCKED",
          severity: "error",
        }),
      ]),
    );
  });

  it("keeps init and close idempotent for deterministic fixture runtime metadata", () => {
    const runtime = createProductionDbRuntime({
      env: {},
      profileId: "local-review",
    });

    const initial = runtime.snapshot();
    const firstInit = runtime.init();
    const secondInit = runtime.init();
    const firstClose = runtime.close();
    const secondClose = runtime.close();

    expect(initial.connection.state).toBe("ready");
    expect(firstInit.connection.state).toBe("ready");
    expect(secondInit.connection.state).toBe("ready");
    expect(firstInit.connection.attemptCount).toBe(1);
    expect(secondInit.connection.attemptCount).toBe(1);
    expect(firstClose.connection.state).toBe("closed");
    expect(secondClose.connection.state).toBe("closed");
    expect(firstClose.connection.closeCount).toBe(1);
    expect(secondClose.connection.closeCount).toBe(1);
    expect(secondClose.status).toBe("closed");
  });

  it("represents configured, failed, and secret-safe states without leaking raw values", () => {
    const failureReason = `failed to connect to ${secretEnv.CAMPAIGN_OS_DATABASE_URL} with ${secretEnv.CAMPAIGN_OS_DATABASE_PASSWORD}`;
    const configured = createProductionDbRuntimeContract({
      env: {
        ...secretEnv,
        CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
      },
    });
    const failed = createProductionDbRuntimeContract({
      env: secretEnv,
      failureReason,
      profileId: "local-review",
    });
    const serialized = JSON.stringify({ configured, failed });

    expect(configured.connection).toMatchObject({
      configuredKeyCount: Object.keys(secretEnv).length,
      safeLabel: "[redacted]",
      state: "configured_redacted",
    });
    expect(failed.connection).toMatchObject({
      state: "failed",
    });
    expect(failed.status).toBe("failed");
    expect(serialized).toContain("[redacted]");
    expect(serialized).not.toContain(secretEnv.CAMPAIGN_OS_DATABASE_URL);
    expect(serialized).not.toContain(secretEnv.CAMPAIGN_OS_DATABASE_PASSWORD);
    expect(serialized).not.toContain(secretEnv.CAMPAIGN_OS_DATABASE_TOKEN);
    expect(serialized).not.toContain(secretEnv.CAMPAIGN_OS_DATABASE_PRIVATE_KEY);
    expect(serialized).not.toContain(secretEnv.CAMPAIGN_OS_DATABASE_MNEMONIC);
    expect(serialized).not.toContain(secretEnv.CAMPAIGN_OS_DATABASE_SIGNATURE);
    expect(serialized).not.toContain(failureReason);
  });
});
