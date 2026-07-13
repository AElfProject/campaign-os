import {
  createProductionDatabaseHandoffReadiness,
  productionDatabaseNoLiveFlags,
  sanitizeProductionDatabaseHandoffText,
  type ProductionDatabaseHandoffDiagnostic,
  type ProductionDatabaseHandoffReadiness,
  type ProductionDatabaseMigrationGateReview,
  type ProductionDatabasePackageBindingReview,
  type ProductionDatabaseRequiredReference,
  type ProductionDatabaseStoreCoverage,
  type ProductionDatabaseNoLiveFlags,
} from "../domain/productionDatabaseHandoffReadiness";
import type { BackendRuntimeProfileId } from "./backendProfiles";
import { createProductionDatabaseAdapterRuntimeContract } from "./databaseAdapterRuntime";
import { createDatabaseMigrationExecutorHandoff } from "./databaseMigrationHandoff";
import { createMigrationExecutionGate } from "./migrationExecutionGate";
import { createMigrationRunnerPlan } from "./migrationRunner";
import { createConnectionConfigSummary } from "./persistenceRuntime";
import { createProductionDbPackageBinding } from "./productionDbPackageBinding";

export interface CreateServerProductionDatabaseHandoffReadinessOptions {
  diagnostics?: readonly ProductionDatabaseHandoffDiagnostic[];
  env?: Record<string, string | undefined>;
  localMvpReady?: boolean;
  profileId?: BackendRuntimeProfileId;
  traceId?: string;
}

export const createServerProductionDatabaseHandoffReadiness = ({
  diagnostics = [],
  env = {},
  localMvpReady = true,
  profileId = "production-required",
  traceId,
}: CreateServerProductionDatabaseHandoffReadinessOptions = {}): ProductionDatabaseHandoffReadiness => {
  const adapterRuntime = createProductionDatabaseAdapterRuntimeContract({
    env,
    profileId,
  });
  const packageBinding = createProductionDbPackageBinding({
    env,
    profileId,
  });
  const migrationGate = createMigrationExecutionGate({
    connection: createConnectionConfigSummary({ env, profileId }),
    migrationPlan: createMigrationRunnerPlan({ profileId }),
    profileId,
  });
  const migrationHandoff = createDatabaseMigrationExecutorHandoff({
    adapterRuntime,
    migrationGate,
    profileId,
  });
  const combinedDiagnostics = [
    ...packageBinding.diagnostics.map(mapDiagnostic),
    ...adapterRuntime.productionDbRuntime.diagnostics.map(mapDiagnostic),
    ...adapterRuntime.diagnostics.map(mapDiagnostic),
    ...migrationHandoff.diagnostics.map(mapDiagnostic),
    ...diagnostics,
  ];

  return createProductionDatabaseHandoffReadiness({
    diagnostics: combinedDiagnostics,
    localMvpReady,
    migrationGate: mapMigrationGate(migrationHandoff),
    packageBinding: mapPackageBinding(packageBinding),
    requiredReferences: packageBinding.preconditions.map((precondition) => ({
      area: precondition.area,
      id: precondition.id,
      key: precondition.requiredConfigKeys[0] ?? precondition.field,
      message: precondition.message,
      redacted: true,
      requiredBeforeProduction: true,
      status: preconditionStatus(precondition.diagnosticCode, precondition.status, packageBinding.diagnosticCodes),
    })),
    safety: createSafetyFlags(packageBinding.noLiveFlags),
    source: "server_runtime",
    storeCoverage: packageBinding.storeCoverage.map(mapStoreCoverage),
    traceId,
  });
};

const preconditionStatus = (
  diagnosticCode: string,
  fallbackStatus: "blocked" | "deferred",
  diagnosticCodes: readonly string[],
): ProductionDatabaseRequiredReference["status"] =>
  diagnosticCodes.includes(diagnosticCode)
    ? fallbackStatus
    : "ready";

const mapPackageBinding = (
  packageBinding: ReturnType<typeof createProductionDbPackageBinding>,
): ProductionDatabasePackageBindingReview => ({
  bindingId: packageBinding.bindingId,
  blockerCount: packageBinding.blockerCount,
  driverId: packageBinding.driverId,
  importPosture: packageBinding.definition.importPosture,
  mode: packageBinding.mode,
  packageName: packageBinding.definition.packageName,
  packageRef: packageBinding.definition.packageRef,
  providerId: packageBinding.providerId,
  providerKind: packageBinding.definition.providerKind,
  status: packageBinding.status,
});

const mapStoreCoverage = (
  store: ReturnType<typeof createProductionDbPackageBinding>["storeCoverage"][number],
): ProductionDatabaseStoreCoverage => ({
  coverageStatus: store.coveredByBinding ? "mapped" : "blocked",
  label: store.label,
  migrationRequired: store.migrationRequired,
  ownerServiceId: store.ownerServiceId,
  schemaVersion: store.schemaVersion,
  storeId: store.storeId,
});

const mapMigrationGate = (
  migrationHandoff: ReturnType<typeof createDatabaseMigrationExecutorHandoff>,
): ProductionDatabaseMigrationGateReview => ({
  approvalStatus: migrationHandoff.approvalStatus,
  blockedMigrationIds: [...migrationHandoff.blockedMigrationIds],
  id: migrationHandoff.id,
  liveExecutionEnabled: false,
  pendingMigrationIds: [...migrationHandoff.pendingMigrationIds],
  rollbackPlanStatus: migrationHandoff.rollbackPlanStatus,
  rollbackReady: migrationHandoff.rollbackReadiness.ready,
  status: migrationHandoff.executorStatus === "blocked" || migrationHandoff.migrationGateStatus === "blocked"
    ? "blocked"
    : migrationHandoff.executorStatus === "deferred"
      ? "review_required"
      : "local_ready",
});

const createSafetyFlags = (
  packageNoLiveFlags: ReturnType<typeof createProductionDbPackageBinding>["noLiveFlags"],
): ProductionDatabaseNoLiveFlags => ({
  ...productionDatabaseNoLiveFlags,
  dbClientConstructed: packageNoLiveFlags.dbClientConstructed,
  liveConnectionAttempted: packageNoLiveFlags.liveConnectionAttempted,
  liveContractWritesEnabled: packageNoLiveFlags.liveContractWritesEnabled,
  liveMigrationExecutionEnabled: packageNoLiveFlags.liveMigrationExecutionEnabled,
  liveProductionMutationEnabled: packageNoLiveFlags.liveProductionMutationEnabled,
  liveProviderCallsEnabled: packageNoLiveFlags.liveProviderCallsEnabled,
  liveQueryExecutionEnabled: packageNoLiveFlags.liveQueryExecutionEnabled,
  liveRewardCustodyEnabled: packageNoLiveFlags.liveRewardCustodyEnabled,
  liveRewardDistributionEnabled: packageNoLiveFlags.liveRewardDistributionEnabled,
  liveStorageWritesEnabled: packageNoLiveFlags.liveStorageWritesEnabled,
  liveTransactionExecutionEnabled: packageNoLiveFlags.liveTransactionExecutionEnabled,
  secretValueExposed: packageNoLiveFlags.secretValueExposed,
});

const mapDiagnostic = (
  diagnostic: { code: string; field: string; message: string; severity: "error" | "info" | "warning" },
): ProductionDatabaseHandoffDiagnostic => ({
  code: diagnostic.code,
  field: sanitizeProductionDatabaseHandoffText(diagnostic.field),
  message: sanitizeProductionDatabaseHandoffText(diagnostic.message),
  severity: diagnostic.severity,
});
