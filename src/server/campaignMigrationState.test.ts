import { describe, expect, it } from "vitest";
import {
  CAMPAIGN_DB_M177_MIGRATION_ID,
  CAMPAIGN_DB_SCHEMA_VERSION,
  createCampaignMigrationState,
} from "./campaignMigrationState";

describe("campaign migration state", () => {
  it("marks the M177 campaign schema migration as applied in local durable readiness", () => {
    const state = createCampaignMigrationState();

    expect(state).toMatchObject({
      appliedMigrationIds: [CAMPAIGN_DB_M177_MIGRATION_ID],
      blockedMigrationIds: [],
      diagnosticCodes: [],
      liveExecutionEnabled: false,
      pendingMigrationIds: [],
      requiredMigrationIds: [CAMPAIGN_DB_M177_MIGRATION_ID],
      rollbackAvailable: false,
      schemaVersion: CAMPAIGN_DB_SCHEMA_VERSION,
      status: "applied",
      storeId: "campaign-db",
      validation: {
        issues: [],
        valid: true,
      },
    });
  });

  it("reports pending required migration ids without enabling live execution", () => {
    const state = createCampaignMigrationState({
      appliedMigrationIds: [],
      requiredMigrationIds: [CAMPAIGN_DB_M177_MIGRATION_ID],
    });

    expect(state).toMatchObject({
      appliedMigrationIds: [],
      blockedMigrationIds: [],
      diagnosticCodes: ["CAMPAIGN_MIGRATION_PENDING"],
      liveExecutionEnabled: false,
      pendingMigrationIds: [CAMPAIGN_DB_M177_MIGRATION_ID],
      status: "pending",
      validation: {
        issues: [],
        valid: true,
      },
    });
  });

  it("fails closed for production-required state until campaign migration is applied", () => {
    const state = createCampaignMigrationState({
      productionRequired: true,
      requiredMigrationIds: [CAMPAIGN_DB_M177_MIGRATION_ID],
    });

    expect(state).toMatchObject({
      appliedMigrationIds: [],
      blockedMigrationIds: [CAMPAIGN_DB_M177_MIGRATION_ID],
      diagnosticCodes: ["CAMPAIGN_MIGRATION_BLOCKED"],
      liveExecutionEnabled: false,
      pendingMigrationIds: [],
      status: "blocked",
      validation: {
        issues: [
          expect.objectContaining({
            code: "CAMPAIGN_MIGRATION_BLOCKED",
            field: "blockedMigrationIds",
            severity: "error",
          }),
        ],
        valid: false,
      },
    });
  });
});
