import { describe, expect, it } from "vitest";
import {
  createConnectionConfigSummary,
  createProductionPersistenceRuntimeContract,
  productionPersistenceDeferredDependencies,
} from "./persistenceRuntime";

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
      id: "campaign-os-production-persistence-runtime",
      liveConnectionAttempted: false,
      profileId: "local-review",
      schemaVersion: "v0.2.0",
      status: "active_local",
      valid: true,
    });
    expect(contract.connection).toMatchObject({
      missingKeys: [],
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
    expect(contract.connection.missingKeys).toContain("CAMPAIGN_OS_DATABASE_URL");
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
    const strings = collectStringValues(summary);

    expect(summary).toMatchObject({
      configuredKeys: expect.arrayContaining(Object.keys(secretValues)),
      safeLabel: "[redacted]",
      state: "configured_redacted",
    });
    expect(summary.redactedFields).toEqual(expect.arrayContaining(Object.keys(secretValues)));

    for (const secretValue of Object.values(secretValues)) {
      expect(strings).not.toContain(secretValue);
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
