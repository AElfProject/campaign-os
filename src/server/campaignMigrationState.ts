import type { MigrationManifest } from "./migrationManifest";

export const CAMPAIGN_DB_STORE_ID = "campaign-db" as const;
export const CAMPAIGN_DB_SCHEMA_VERSION = "v0.2.0" as const;
export const CAMPAIGN_DB_M177_MIGRATION_ID = "001-campaign-db-v0-2-0" as const;

export type CampaignMigrationStatus = "pending" | "applied" | "blocked";
export type CampaignMigrationDiagnosticCode =
  | "CAMPAIGN_MIGRATION_REQUIRED_MISSING"
  | "CAMPAIGN_MIGRATION_PENDING"
  | "CAMPAIGN_MIGRATION_BLOCKED";

export interface CampaignMigrationDiagnostic {
  code: CampaignMigrationDiagnosticCode;
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface CampaignMigrationState {
  appliedMigrationIds: string[];
  blockedMigrationIds: string[];
  diagnosticCodes: CampaignMigrationDiagnosticCode[];
  diagnostics: CampaignMigrationDiagnostic[];
  liveExecutionEnabled: false;
  pendingMigrationIds: string[];
  requiredMigrationIds: string[];
  rollbackAvailable: false;
  schemaVersion: typeof CAMPAIGN_DB_SCHEMA_VERSION;
  status: CampaignMigrationStatus;
  storeId: typeof CAMPAIGN_DB_STORE_ID;
  validation: {
    issues: CampaignMigrationDiagnostic[];
    valid: boolean;
  };
}

export interface CreateCampaignMigrationStateOptions {
  appliedMigrationIds?: readonly string[];
  blockedMigrationIds?: readonly string[];
  migration?: MigrationManifest;
  productionRequired?: boolean;
  requiredMigrationIds?: readonly string[];
}

const unique = (values: readonly string[]) => Array.from(new Set(values.filter(Boolean)));

const diagnostic = (
  code: CampaignMigrationDiagnosticCode,
  field: string,
  message: string,
  severity: CampaignMigrationDiagnostic["severity"] = "error",
): CampaignMigrationDiagnostic => ({
  code,
  field,
  message,
  severity,
});

const campaignMigrationIdsFromManifest = (
  migration: MigrationManifest | undefined,
) => {
  const ids = migration?.migrations
    .filter((item) => item.stores.includes(CAMPAIGN_DB_STORE_ID))
    .map((item) => item.id);

  return ids && ids.length > 0 ? ids : [CAMPAIGN_DB_M177_MIGRATION_ID];
};

export const validateCampaignMigrationState = (
  state: Omit<CampaignMigrationState, "diagnosticCodes" | "diagnostics" | "validation">,
): CampaignMigrationDiagnostic[] => {
  const issues: CampaignMigrationDiagnostic[] = [];

  if (state.requiredMigrationIds.length === 0) {
    issues.push(diagnostic(
      "CAMPAIGN_MIGRATION_REQUIRED_MISSING",
      "requiredMigrationIds",
      "Campaign DB migration state must declare at least one required migration.",
    ));
  }

  if (state.blockedMigrationIds.length > 0) {
    issues.push(diagnostic(
      "CAMPAIGN_MIGRATION_BLOCKED",
      "blockedMigrationIds",
      "Campaign DB migration state is blocked for required migration ids.",
    ));
  }

  if (state.status === "pending" && state.pendingMigrationIds.length > 0) {
    issues.push(diagnostic(
      "CAMPAIGN_MIGRATION_PENDING",
      "pendingMigrationIds",
      "Campaign DB migration state still has pending required migration ids.",
      "warning",
    ));
  }

  return issues;
};

export const createCampaignMigrationState = ({
  appliedMigrationIds,
  blockedMigrationIds = [],
  migration,
  productionRequired = false,
  requiredMigrationIds,
}: CreateCampaignMigrationStateOptions = {}): CampaignMigrationState => {
  const requiredIds = unique(requiredMigrationIds ?? campaignMigrationIdsFromManifest(migration));
  const explicitAppliedIds = appliedMigrationIds !== undefined;
  const appliedIds = unique(
    appliedMigrationIds ?? (productionRequired ? [] : requiredIds),
  ).filter((id) => requiredIds.includes(id));
  const blockedIds = unique([
    ...blockedMigrationIds,
    ...(productionRequired && !explicitAppliedIds ? requiredIds : []),
  ]).filter((id) => requiredIds.includes(id));
  const pendingIds = requiredIds.filter((id) => !appliedIds.includes(id) && !blockedIds.includes(id));
  const status: CampaignMigrationStatus =
    blockedIds.length > 0 ? "blocked" : pendingIds.length > 0 ? "pending" : "applied";
  const baseState = {
    appliedMigrationIds: appliedIds,
    blockedMigrationIds: blockedIds,
    liveExecutionEnabled: false,
    pendingMigrationIds: pendingIds,
    requiredMigrationIds: requiredIds,
    rollbackAvailable: false,
    schemaVersion: CAMPAIGN_DB_SCHEMA_VERSION,
    status,
    storeId: CAMPAIGN_DB_STORE_ID,
  } satisfies Omit<CampaignMigrationState, "diagnosticCodes" | "diagnostics" | "validation">;
  const diagnostics = validateCampaignMigrationState(baseState);
  const validationIssues = diagnostics.filter((issue) => issue.severity === "error");

  return {
    ...baseState,
    diagnosticCodes: diagnostics.map((issue) => issue.code),
    diagnostics,
    validation: {
      issues: validationIssues,
      valid: validationIssues.length === 0,
    },
  };
};
