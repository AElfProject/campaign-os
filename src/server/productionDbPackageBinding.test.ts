import { describe, expect, it } from "vitest";
import {
  SUPPORTED_PRODUCTION_DB_PACKAGE_BINDING_PROFILES,
  createProductionDbPackageBinding,
  getProductionDbPackageBindingRegistration,
  productionDbPackageNoLiveFlags,
  productionDbPackageProductionPreconditions,
  redactProductionDbPackageValue,
} from "./productionDbPackageBinding";
import { productionDatabaseRequiredStoreIds } from "./productionDatabase";

const productionReadyPackageBindingEnv = {
  CAMPAIGN_OS_DATABASE_LIVE_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_DATABASE_MIGRATION_APPROVAL: "migration-approval-ref:prod-db-v0.2",
  CAMPAIGN_OS_DATABASE_OBSERVABILITY_REF: "observability-ref:prod-db",
  CAMPAIGN_OS_DATABASE_PACKAGE: "pg",
  CAMPAIGN_OS_DATABASE_PACKAGE_BINDING: "campaign-os-postgresql-package-binding-production",
  CAMPAIGN_OS_DATABASE_POOL_POLICY: "pool-policy:fail-closed",
  CAMPAIGN_OS_DATABASE_PROVIDER: "campaign-os-postgresql-provider-deferred",
  CAMPAIGN_OS_DATABASE_ROLLBACK_BACKUP_PLAN: "rollback-backup-plan-ref:prod-db-v0.2",
  CAMPAIGN_OS_DATABASE_RUNBOOK_URL: "runbook-ref:production-db-package-binding",
  CAMPAIGN_OS_DATABASE_SECRET_REF: "secret-manager-ref:prod-db",
  CAMPAIGN_OS_DATABASE_URL: "connection-ref:prod-db",
} satisfies Record<string, unknown>;

const missingProductionDiagnosticCodes = [
  "PRODUCTION_DB_PACKAGE_REFERENCE_MISSING",
  "PRODUCTION_DB_PACKAGE_BINDING_MISSING",
  "PRODUCTION_DB_PROVIDER_SELECTION_MISSING",
  "PRODUCTION_DB_CONNECTION_REFERENCE_MISSING",
  "PRODUCTION_DB_SECRET_MANAGER_REFERENCE_MISSING",
  "PRODUCTION_DB_CONNECTION_POOL_POLICY_MISSING",
  "PRODUCTION_DB_MIGRATION_APPROVAL_MISSING",
  "PRODUCTION_DB_ROLLBACK_BACKUP_MISSING",
  "PRODUCTION_DB_OBSERVABILITY_MISSING",
  "PRODUCTION_DB_RUNBOOK_MISSING",
  "PRODUCTION_DB_LIVE_ENABLEMENT_MISSING",
];

describe("production DB package binding foundation", () => {
  it("declares stable PostgreSQL-compatible package binding metadata", () => {
    const binding = createProductionDbPackageBinding();
    const registration = getProductionDbPackageBindingRegistration("campaign-os-postgresql-package-binding-local");

    expect(binding.id).toBe("campaign-os-production-db-package-binding-foundation");
    expect(SUPPORTED_PRODUCTION_DB_PACKAGE_BINDING_PROFILES).toEqual([
      "local-review",
      "staging-scaffold",
      "production-required",
    ]);
    expect(registration).toMatchObject({
      bindingId: "campaign-os-postgresql-package-binding-local",
      driverId: "campaign-os-node-postgres-driver-deferred",
      mode: "dry_run",
      providerId: "campaign-os-postgresql-provider-deferred",
      status: "local_ready",
    });
    expect(binding.definition).toMatchObject({
      browserBundleAllowed: false,
      driverKind: "node-postgres-compatible",
      family: "postgresql-compatible-relational",
      importPosture: "metadata_only_no_import",
      packageName: "pg",
      packageRef: "npm:pg",
      postgresqlCompatible: true,
      providerKind: "managed-postgresql-compatible",
      relationalCompatible: true,
      serverOnly: true,
    });
  });

  it("keeps local review deterministic, valid, fast, and no-live without DB services", () => {
    const startedAt = performance.now();
    const binding = createProductionDbPackageBinding({ profileId: "local-review" });
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(100);
    expect(binding.profileId).toBe("local-review");
    expect(binding.bindingId).toBe("campaign-os-postgresql-package-binding-local");
    expect(binding.mode).toBe("dry_run");
    expect(binding.status).toBe("local_ready");
    expect(binding.valid).toBe(true);
    expect(binding.productionReady).toBe(false);
    expect(binding.blockerCount).toBe(0);
    expect(binding.diagnosticCodes).toEqual([]);
    expect(binding.noLiveFlags).toEqual(productionDbPackageNoLiveFlags);
    expect(binding.healthCheck).toMatchObject({
      driverClientConstructionAttempted: false,
      liveDbHealthCheckAttempted: false,
      packageImportAttempted: false,
      status: "local_ok",
    });
    expect(binding.readiness).toMatchObject({
      browserBundleAllowed: false,
      dbClientConstructed: false,
      liveConnectionAttempted: false,
      liveContractWritesEnabled: false,
      liveMigrationExecutionEnabled: false,
      liveProductionMutationEnabled: false,
      liveProviderCallsEnabled: false,
      liveQueryExecutionEnabled: false,
      liveRewardCustodyEnabled: false,
      liveRewardDistributionEnabled: false,
      liveStorageWritesEnabled: false,
      liveTransactionExecutionEnabled: false,
      packageName: "pg",
      packageRef: "npm:pg",
      productionReady: false,
      providerId: "campaign-os-postgresql-provider-deferred",
      secretValueExposed: false,
      status: "local_ready",
      valid: true,
    });
  });

  it("reports staging scaffold as metadata-only and no-live", () => {
    const binding = createProductionDbPackageBinding({
      env: { CAMPAIGN_OS_DATABASE_URL: "connection-ref:staging-db" },
      profileId: "staging-scaffold",
    });

    expect(binding.bindingId).toBe("campaign-os-postgresql-package-binding-staging");
    expect(binding.mode).toBe("metadata_only");
    expect(binding.status).toBe("scaffolded");
    expect(binding.valid).toBe(true);
    expect(binding.productionReady).toBe(false);
    expect(binding.noLiveFlags).toEqual(productionDbPackageNoLiveFlags);
    expect(binding.readiness.liveConnectionAttempted).toBe(false);
    expect(binding.readiness.liveQueryExecutionEnabled).toBe(false);
    expect(binding.readiness.liveTransactionExecutionEnabled).toBe(false);
    expect(binding.readiness.liveMigrationExecutionEnabled).toBe(false);
    expect(binding.readiness.liveProductionMutationEnabled).toBe(false);
  });

  it("fails closed for production-required when production preconditions are missing", () => {
    const binding = createProductionDbPackageBinding({ profileId: "production-required" });

    expect(binding.status).toBe("blocked");
    expect(binding.valid).toBe(false);
    expect(binding.productionReady).toBe(false);
    expect(binding.blockerCount).toBe(productionDbPackageProductionPreconditions.length);
    expect(binding.diagnosticCodes).toEqual(missingProductionDiagnosticCodes);
    expect(binding.readiness.status).toBe("blocked");
    expect(binding.readiness.valid).toBe(false);
    expect(binding.readiness.productionReady).toBe(false);
    expect(binding.readiness.liveConnectionAttempted).toBe(false);
    expect(binding.readiness.liveProviderCallsEnabled).toBe(false);
  });

  it("covers all v0.2 production DB stores with package binding metadata", () => {
    const binding = createProductionDbPackageBinding();

    expect(binding.requiredStoreIds).toEqual(productionDatabaseRequiredStoreIds);
    expect(binding.storeCoverage.map((store) => store.storeId)).toEqual(productionDatabaseRequiredStoreIds);
    expect(binding.readiness.requiredStoreIds).toEqual(productionDatabaseRequiredStoreIds);
    expect(binding.readiness.storeCoverage.map((store) => store.storeId)).toEqual([
      "campaign-db",
      "wallet-session-db",
      "task-evidence-db",
      "i18n-content-db",
      "risk-event-db",
      "points-ledger",
    ]);
    expect(binding.storeCoverage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ coveredByBinding: true, label: "Campaign DB" }),
        expect.objectContaining({ coveredByBinding: true, label: "Wallet Session DB" }),
        expect.objectContaining({ coveredByBinding: true, label: "Task Evidence DB" }),
        expect.objectContaining({ coveredByBinding: true, label: "i18n Content DB" }),
        expect.objectContaining({ coveredByBinding: true, label: "Risk Event DB" }),
        expect.objectContaining({ coveredByBinding: true, label: "Points Ledger" }),
      ]),
    );
  });

  it("keeps package metadata scaffolded but not production-ready after references are present", () => {
    const binding = createProductionDbPackageBinding({
      env: productionReadyPackageBindingEnv,
      profileId: "production-required",
    });

    expect(binding.status).toBe("scaffolded");
    expect(binding.valid).toBe(true);
    expect(binding.mode).toBe("production_required");
    expect(binding.bindingId).toBe("campaign-os-postgresql-package-binding-production");
    expect(binding.providerId).toBe("campaign-os-postgresql-provider-deferred");
    expect(binding.driverId).toBe("campaign-os-node-postgres-driver-deferred");
    expect(binding.productionReady).toBe(false);
    expect(binding.readiness.productionReady).toBe(false);
    expect(binding.readiness.noLiveFlags).toEqual(productionDbPackageNoLiveFlags);
    expect(binding.readiness.liveConnectionAttempted).toBe(false);
    expect(binding.readiness.liveQueryExecutionEnabled).toBe(false);
    expect(binding.readiness.liveTransactionExecutionEnabled).toBe(false);
    expect(binding.readiness.liveMigrationExecutionEnabled).toBe(false);
    expect(binding.readiness.liveProductionMutationEnabled).toBe(false);
    expect(binding.readiness.liveProviderCallsEnabled).toBe(false);
    expect(binding.readiness.liveStorageWritesEnabled).toBe(false);
    expect(binding.readiness.liveContractWritesEnabled).toBe(false);
    expect(binding.readiness.liveRewardCustodyEnabled).toBe(false);
    expect(binding.readiness.liveRewardDistributionEnabled).toBe(false);
  });

  it("rejects unsupported package provider and driver values without leaking raw material", () => {
    const binding = createProductionDbPackageBinding({
      driverId: "unsupported-driver",
      env: {
        CAMPAIGN_OS_DATABASE_OBJECT_KEY: "s3://bucket/private/object",
        CAMPAIGN_OS_DATABASE_PACKAGE: "typeorm",
        CAMPAIGN_OS_DATABASE_PAYLOAD: "{\"database\":\"campaign\",\"password\":\"secret\"}",
        CAMPAIGN_OS_DATABASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----abc",
        CAMPAIGN_OS_DATABASE_PROVIDER_KIND: "raw-provider",
        CAMPAIGN_OS_DATABASE_SIGNATURE: "signature=abc",
        CAMPAIGN_OS_DATABASE_SIGNED_URL: "https://files.invalid/db.sql?X-Amz-Signature=abc",
        CAMPAIGN_OS_DATABASE_TOKEN: "token=secret",
        CAMPAIGN_OS_DATABASE_URL: "postgres://user:db-pass@db.internal/campaign?token=secret",
      },
      packageName: "typeorm",
      profileId: "staging-scaffold",
      providerId: "raw-provider",
      providerKind: "raw-provider",
    });
    const serialized = JSON.stringify(binding);

    expect(binding.valid).toBe(false);
    expect(binding.status).toBe("blocked");
    expect(binding.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "PRODUCTION_DB_PACKAGE_UNSUPPORTED",
        "PRODUCTION_DB_PROVIDER_UNSUPPORTED",
        "PRODUCTION_DB_DRIVER_UNSUPPORTED",
        "UNSAFE_PRODUCTION_DB_PACKAGE_BINDING_CONFIG",
      ]),
    );
    expect(binding.unsafeConfigKeys).toEqual([
      "CAMPAIGN_OS_DATABASE_OBJECT_KEY",
      "CAMPAIGN_OS_DATABASE_PAYLOAD",
      "CAMPAIGN_OS_DATABASE_PRIVATE_KEY",
      "CAMPAIGN_OS_DATABASE_SIGNATURE",
      "CAMPAIGN_OS_DATABASE_SIGNED_URL",
      "CAMPAIGN_OS_DATABASE_TOKEN",
      "CAMPAIGN_OS_DATABASE_URL",
    ]);
    expect(serialized).not.toContain("db-pass");
    expect(serialized).not.toContain("token=secret");
    expect(serialized).not.toContain("BEGIN PRIVATE KEY");
    expect(serialized).not.toContain("X-Amz-Signature");
    expect(serialized).not.toContain("s3://bucket/private/object");
    expect(serialized).not.toContain("\"database\":\"campaign\"");
  });

  it("redacts unsafe DB package values while preserving safe keys", () => {
    const redacted = redactProductionDbPackageValue({
      connectionUrl: "postgres://user:db-pass@db.internal/campaign",
      databasePayload: "{\"provider\":\"raw\",\"password\":\"secret\"}",
      mnemonic: "alpha beta gamma delta",
      objectKey: "s3://bucket/private/object",
      privateKey: "-----BEGIN PRIVATE KEY-----abc",
      providerResponse: "Bearer secret-token",
      safeConfigKey: "CAMPAIGN_OS_DATABASE_URL",
      signature: "signature=abc",
      signedUrl: "https://files.invalid/db.sql?X-Amz-Signature=abc",
    });

    expect(redacted).toEqual({
      connectionUrl: "[redacted]",
      databasePayload: "[redacted]",
      mnemonic: "[redacted]",
      objectKey: "[redacted]",
      privateKey: "[redacted]",
      providerResponse: "[redacted]",
      safeConfigKey: "CAMPAIGN_OS_DATABASE_URL",
      signature: "[redacted]",
      signedUrl: "[redacted]",
    });
  });

  it("does not expose a registration for unknown package bindings", () => {
    expect(getProductionDbPackageBindingRegistration("unknown-package-binding")).toBeUndefined();
  });
});
