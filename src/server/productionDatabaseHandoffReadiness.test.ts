import { describe, expect, it } from "vitest";
import { createServerProductionDatabaseHandoffReadiness } from "./productionDatabaseHandoffReadiness";

describe("createServerProductionDatabaseHandoffReadiness", () => {
  it("summarizes production DB handoff blockers while preserving local MVP readiness", () => {
    const handoff = createServerProductionDatabaseHandoffReadiness();

    expect(handoff).toMatchObject({
      id: "campaign-os-production-database-handoff-readiness",
      localMvpReady: true,
      productionReady: false,
      source: "server_runtime",
      status: "blocked",
      valid: true,
    });
    expect(handoff.packageBinding).toMatchObject({
      importPosture: "metadata_only_no_import",
      packageName: "pg",
      packageRef: "npm:pg",
    });
    expect(handoff.requiredReferences.map((reference) => reference.key)).toEqual(
      expect.arrayContaining([
        "CAMPAIGN_OS_DATABASE_PACKAGE",
        "CAMPAIGN_OS_DATABASE_PACKAGE_BINDING",
        "CAMPAIGN_OS_DATABASE_PROVIDER",
        "CAMPAIGN_OS_DATABASE_URL",
        "CAMPAIGN_OS_DATABASE_SECRET_REF",
        "CAMPAIGN_OS_DATABASE_POOL_POLICY",
        "CAMPAIGN_OS_DATABASE_MIGRATION_APPROVAL",
        "CAMPAIGN_OS_DATABASE_ROLLBACK_BACKUP_PLAN",
        "CAMPAIGN_OS_DATABASE_OBSERVABILITY_REF",
        "CAMPAIGN_OS_DATABASE_RUNBOOK_URL",
        "CAMPAIGN_OS_DATABASE_LIVE_ENABLEMENT",
      ]),
    );
    expect(handoff.summary.blockedCount).toBeGreaterThan(0);
    expect(handoff.summary.deferredCount).toBeGreaterThan(0);
    expect(handoff.storeCoverage.map((store) => store.storeId)).toEqual(
      expect.arrayContaining([
        "campaign-db",
        "i18n-content-db",
        "points-ledger",
        "risk-event-db",
        "task-evidence-db",
        "wallet-session-db",
      ]),
    );
    expect(handoff.migrationGate).toMatchObject({
      id: "campaign-os-database-migration-executor-handoff",
      liveExecutionEnabled: false,
      rollbackReady: false,
      status: "blocked",
    });
    expect(Object.values(handoff.safety).every((value) => value === false)).toBe(true);
  });

  it("keeps complete reference metadata local-ready but not production-ready", () => {
    const env = {
      CAMPAIGN_OS_DATABASE_LIVE_ENABLEMENT: "live-enable-ref:prod-db-v0.2",
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
    };
    const handoff = createServerProductionDatabaseHandoffReadiness({
      env,
      profileId: "production-required",
    });

    const referenceStatusByKey = Object.fromEntries(
      handoff.requiredReferences.map((reference) => [reference.key, reference.status]),
    );

    expect(referenceStatusByKey.CAMPAIGN_OS_DATABASE_URL).toBe("ready");
    expect(referenceStatusByKey.CAMPAIGN_OS_DATABASE_SECRET_REF).toBe("ready");
    expect(referenceStatusByKey.CAMPAIGN_OS_DATABASE_MIGRATION_APPROVAL).toBe("ready");
    expect(referenceStatusByKey.CAMPAIGN_OS_DATABASE_RUNBOOK_URL).toBe("ready");
    expect(handoff.productionReady).toBe(false);
    expect(handoff.safety.dbClientConstructed).toBe(false);
    expect(handoff.safety.liveConnectionAttempted).toBe(false);
    expect(handoff.safety.liveQueryExecutionEnabled).toBe(false);
    expect(handoff.safety.liveMigrationExecutionEnabled).toBe(false);
  });

  it("redacts unsafe env and diagnostics from serialized handoff output", () => {
    const unsafeEnv = {
      CAMPAIGN_OS_DATABASE_MNEMONIC: "seed phrase words",
      CAMPAIGN_OS_DATABASE_OBJECT_KEY: "s3://bucket/private/object",
      CAMPAIGN_OS_DATABASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----abc",
      CAMPAIGN_OS_DATABASE_SIGNATURE: "signature=abc",
      CAMPAIGN_OS_DATABASE_SIGNED_URL: "https://files.invalid/db.sql?X-Amz-Signature=abc",
      CAMPAIGN_OS_DATABASE_TOKEN: "token=secret",
      CAMPAIGN_OS_DATABASE_URL: "postgres://user:password@db.internal/campaign",
    };
    const handoff = createServerProductionDatabaseHandoffReadiness({
      diagnostics: [
        {
          code: "UNSAFE_DIAGNOSTIC",
          field: "/Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/private",
          message: `failed to connect ${unsafeEnv.CAMPAIGN_OS_DATABASE_URL}`,
          severity: "error",
        },
      ],
      env: unsafeEnv,
      profileId: "production-required",
    });
    const serialized = JSON.stringify(handoff);

    expect(serialized).not.toContain(unsafeEnv.CAMPAIGN_OS_DATABASE_URL);
    expect(serialized).not.toContain(unsafeEnv.CAMPAIGN_OS_DATABASE_PRIVATE_KEY);
    expect(serialized).not.toContain(unsafeEnv.CAMPAIGN_OS_DATABASE_TOKEN);
    expect(serialized).not.toContain(unsafeEnv.CAMPAIGN_OS_DATABASE_MNEMONIC);
    expect(serialized).not.toContain(unsafeEnv.CAMPAIGN_OS_DATABASE_SIGNATURE);
    expect(serialized).not.toContain("campaign-os-kitty/private");
    expect(serialized).toContain("CAMPAIGN_OS_DATABASE_URL");
  });
});
