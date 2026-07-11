import { describe, expect, it } from "vitest";
import {
  createProductionDatabaseHandoffReadiness,
  productionDatabaseNoLiveFlags,
  sanitizeProductionDatabaseHandoffText,
  type ProductionDatabaseMigrationGateReview,
  type ProductionDatabasePackageBindingReview,
  type ProductionDatabaseRequiredReference,
  type ProductionDatabaseStoreCoverage,
} from "./productionDatabaseHandoffReadiness";

const packageBinding: ProductionDatabasePackageBindingReview = {
  bindingId: "campaign-os-postgresql-package-binding-local",
  blockerCount: 2,
  driverId: "campaign-os-node-postgres-driver-deferred",
  importPosture: "metadata_only_no_import",
  mode: "dry_run",
  packageName: "pg",
  packageRef: "npm:pg",
  providerId: "campaign-os-postgresql-provider-deferred",
  providerKind: "managed-postgresql-compatible",
  status: "local_ready",
};

const requiredReferences: ProductionDatabaseRequiredReference[] = [
  {
    area: "secrets",
    id: "production-db-secret-manager-reference",
    key: "CAMPAIGN_OS_DATABASE_SECRET_REF",
    message: "Secret manager reference is required before live database integration.",
    redacted: true,
    requiredBeforeProduction: true,
    status: "blocked",
  },
  {
    area: "runbook",
    id: "production-db-runbook",
    key: "CAMPAIGN_OS_DATABASE_RUNBOOK_URL",
    message: "Operator runbook reference is required before live database integration.",
    redacted: true,
    requiredBeforeProduction: true,
    status: "deferred",
  },
];

const storeCoverage: ProductionDatabaseStoreCoverage[] = [
  {
    coverageStatus: "mapped",
    label: "Campaign DB",
    migrationRequired: true,
    ownerServiceId: "campaign-service",
    schemaVersion: "v0.2.0",
    storeId: "campaign-db",
  },
];

const migrationGate: ProductionDatabaseMigrationGateReview = {
  approvalStatus: "missing",
  blockedMigrationIds: ["campaign-os-production-db-schema-v0.2"],
  id: "campaign-os-database-migration-executor-handoff",
  liveExecutionEnabled: false,
  pendingMigrationIds: ["campaign-os-production-db-schema-v0.2"],
  rollbackPlanStatus: "missing",
  rollbackReady: false,
  status: "blocked",
};

describe("createProductionDatabaseHandoffReadiness", () => {
  it("creates a deterministic blocked handoff while preserving local MVP readiness", () => {
    const first = createProductionDatabaseHandoffReadiness({
      migrationGate,
      packageBinding,
      requiredReferences,
      storeCoverage,
      traceId: "trace-production-db-handoff",
    });
    const second = createProductionDatabaseHandoffReadiness({
      migrationGate,
      packageBinding,
      requiredReferences: [...requiredReferences].reverse(),
      storeCoverage,
      traceId: "trace-production-db-handoff",
    });

    expect(first).toMatchObject({
      id: "campaign-os-production-database-handoff-readiness",
      localMvpReady: true,
      productionReady: false,
      source: "seeded_fallback",
      status: "blocked",
      traceId: "trace-production-db-handoff",
      valid: true,
    });
    expect(first.requiredReferences.map((reference) => reference.id)).toEqual(
      second.requiredReferences.map((reference) => reference.id),
    );
    expect(first.summary).toMatchObject({
      blockedCount: 1,
      deferredCount: 1,
      readyCount: 0,
      requiredReferenceCount: 2,
      status: "blocked",
      storeCoverageCount: 1,
    });
  });

  it("keeps complete-looking local metadata review-only and production disabled", () => {
    const handoff = createProductionDatabaseHandoffReadiness({
      migrationGate: {
        ...migrationGate,
        approvalStatus: "approved",
        blockedMigrationIds: [],
        rollbackPlanStatus: "ready",
        rollbackReady: true,
        status: "local_ready",
      },
      packageBinding: {
        ...packageBinding,
        blockerCount: 0,
      },
      requiredReferences: requiredReferences.map((reference) => ({
        ...reference,
        status: "ready",
      })),
      storeCoverage,
    });

    expect(handoff.status).toBe("local_ready");
    expect(handoff.productionReady).toBe(false);
    expect(handoff.safety).toEqual(productionDatabaseNoLiveFlags);
    expect(Object.values(handoff.safety).every((value) => value === false)).toBe(true);
  });

  it("redacts unsafe diagnostic values without redacting safe config keys", () => {
    const handoff = createProductionDatabaseHandoffReadiness({
      diagnostics: [
        {
          code: "UNSAFE_DB_VALUE",
          field: "CAMPAIGN_OS_DATABASE_URL",
          message: "failed postgres://user:password@db.internal/campaign token=secret",
          safeDetails: {
            path: "/Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/kitty-specs/private",
            key: "CAMPAIGN_OS_DATABASE_SECRET_REF",
          },
          severity: "error",
        },
      ],
      migrationGate,
      packageBinding,
      requiredReferences,
      storeCoverage,
    });
    const serialized = JSON.stringify(handoff);

    expect(handoff.diagnostics[0]).toMatchObject({
      code: "PRODUCTION_DATABASE_HANDOFF_UNSAFE_DIAGNOSTIC_REDACTED",
      field: "CAMPAIGN_OS_DATABASE_URL",
      message: "Unsafe production database handoff diagnostic value was redacted.",
    });
    expect(serialized).not.toContain("postgres://user:password");
    expect(serialized).not.toContain("token=secret");
    expect(serialized).not.toContain("campaign-os-kitty/kitty-specs");
    expect(serialized).toContain("CAMPAIGN_OS_DATABASE_SECRET_REF");
  });
});

describe("sanitizeProductionDatabaseHandoffText", () => {
  it("keeps safe keys and redacts unsafe DB-like values", () => {
    expect(sanitizeProductionDatabaseHandoffText("CAMPAIGN_OS_DATABASE_URL")).toBe(
      "CAMPAIGN_OS_DATABASE_URL",
    );
    expect(sanitizeProductionDatabaseHandoffText("Bearer abc")).toBe(
      "[redacted-production-database-handoff-value]",
    );
    expect(sanitizeProductionDatabaseHandoffText("-----BEGIN PRIVATE KEY-----abc")).toBe(
      "[redacted-production-database-handoff-value]",
    );
    expect(sanitizeProductionDatabaseHandoffText("https://files.invalid/db.sql?X-Amz-Signature=abc")).toBe(
      "[redacted-production-database-handoff-value]",
    );
  });
});
