import type { LocalizedText } from "./types";

const text = (enUS: string, zhCN: string, zhTW = enUS): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
});

export type ProductionDatabaseHandoffSource = "seeded_fallback" | "server_runtime";
export type ProductionDatabaseHandoffStatus = "blocked" | "local_ready" | "review_required";
export type ProductionDatabaseRequiredReferenceArea =
  | "activation"
  | "binding"
  | "connection"
  | "migration"
  | "observability"
  | "package"
  | "pooling"
  | "provider"
  | "rollback"
  | "runbook"
  | "secrets";
export type ProductionDatabaseRequiredReferenceStatus = "blocked" | "deferred" | "ready";
export type ProductionDatabaseStoreCoverageStatus = "blocked" | "deferred" | "mapped";
export type ProductionDatabaseMigrationGateStatus = "blocked" | "local_ready" | "review_required";
export type ProductionDatabaseDiagnosticSeverity = "error" | "info" | "warning";
export type ProductionDatabaseDiagnosticCode =
  | "PRODUCTION_DATABASE_HANDOFF_UNSAFE_DIAGNOSTIC_REDACTED"
  | (string & {});

export interface ProductionDatabaseHandoffDiagnostic {
  code: ProductionDatabaseDiagnosticCode;
  field: string;
  message: string;
  safeDetails?: unknown;
  severity: ProductionDatabaseDiagnosticSeverity;
}

export interface ProductionDatabasePackageBindingReview {
  bindingId: string;
  blockerCount: number;
  driverId: string;
  importPosture: "metadata_only_no_import";
  mode: string;
  packageName: string;
  packageRef: string;
  providerId: string;
  providerKind: string;
  status: string;
}

export interface ProductionDatabaseRequiredReference {
  area: ProductionDatabaseRequiredReferenceArea;
  id: string;
  key: string;
  message: string;
  redacted: true;
  requiredBeforeProduction: true;
  status: ProductionDatabaseRequiredReferenceStatus;
}

export interface ProductionDatabaseStoreCoverage {
  coverageStatus: ProductionDatabaseStoreCoverageStatus;
  label: string;
  migrationRequired: boolean;
  ownerServiceId: string;
  schemaVersion: string;
  storeId: string;
}

export interface ProductionDatabaseMigrationGateReview {
  approvalStatus: string;
  blockedMigrationIds: readonly string[];
  id: string;
  liveExecutionEnabled: false;
  pendingMigrationIds: readonly string[];
  rollbackPlanStatus: string;
  rollbackReady: boolean;
  status: ProductionDatabaseMigrationGateStatus;
}

export interface ProductionDatabaseNoLiveFlags {
  dbClientConstructed: false;
  liveConnectionAttempted: false;
  liveContractWritesEnabled: false;
  liveMigrationExecutionEnabled: false;
  liveProductionMutationEnabled: false;
  liveProviderCallsEnabled: false;
  liveQueryExecutionEnabled: false;
  liveRewardCustodyEnabled: false;
  liveRewardDistributionEnabled: false;
  liveStorageWritesEnabled: false;
  liveTransactionExecutionEnabled: false;
  secretValueExposed: false;
}

export interface ProductionDatabaseHandoffSummary {
  blockedCount: number;
  deferredCount: number;
  readyCount: number;
  requiredReferenceCount: number;
  status: ProductionDatabaseHandoffStatus;
  storeCoverageCount: number;
  topBlocker: LocalizedText;
  topNextAction: LocalizedText;
}

export interface CreateProductionDatabaseHandoffReadinessOptions {
  diagnostics?: readonly ProductionDatabaseHandoffDiagnostic[];
  localMvpReady?: boolean;
  migrationGate: ProductionDatabaseMigrationGateReview;
  packageBinding: ProductionDatabasePackageBindingReview;
  requiredReferences: readonly ProductionDatabaseRequiredReference[];
  safety?: ProductionDatabaseNoLiveFlags;
  source?: ProductionDatabaseHandoffSource;
  storeCoverage: readonly ProductionDatabaseStoreCoverage[];
  traceId?: string;
}

export interface ProductionDatabaseHandoffReadiness {
  boundary: LocalizedText;
  diagnosticCodes: readonly ProductionDatabaseDiagnosticCode[];
  diagnostics: readonly ProductionDatabaseHandoffDiagnostic[];
  id: "campaign-os-production-database-handoff-readiness";
  localMvpReady: boolean;
  migrationGate: ProductionDatabaseMigrationGateReview;
  packageBinding: ProductionDatabasePackageBindingReview;
  productionReady: false;
  requiredReferences: readonly ProductionDatabaseRequiredReference[];
  safety: ProductionDatabaseNoLiveFlags;
  source: ProductionDatabaseHandoffSource;
  status: ProductionDatabaseHandoffStatus;
  storeCoverage: readonly ProductionDatabaseStoreCoverage[];
  summary: ProductionDatabaseHandoffSummary;
  traceId?: string;
  valid: true;
}

export const productionDatabaseHandoffBoundary = text(
  "Local production database handoff review only. No live API, database connection, DB client construction, query, write, transaction, migration execution, secret reveal, provider call, contract write, storage write, reward custody, or reward distribution is performed.",
  "仅本地 production database handoff review。不会执行实时 API、数据库连接、DB client 构造、查询、写入、事务、migration 执行、secret 暴露、provider 调用、合约写入、storage 写入、奖励托管或发奖。",
  "僅本地 production database handoff review。不會執行即時 API、資料庫連線、DB client 建構、查詢、寫入、交易、migration 執行、secret 暴露、provider 呼叫、合約寫入、storage 寫入、獎勵託管或發獎。",
);

export const productionDatabaseNoLiveFlags: ProductionDatabaseNoLiveFlags = {
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
  secretValueExposed: false,
};

const redactedValue = "[redacted-production-database-handoff-value]";
const unsafeTextPattern =
  /postgres(?:ql)?:\/\/|mysql:\/\/|mongodb(?:\+srv)?:\/\/|bearer\s+\S+|token=|password=|private[-_\s]?key|mnemonic|seed phrase|signature=|signed[-_\s]?url|x-amz-signature|object[-_\s]?key|\/Users\/[^\s]+campaign-os-kitty|kitty-specs\/|\.kittify\/|stack trace|at\s+\S+\s+\(/i;
const safeConfigKeyPattern = /^CAMPAIGN_OS_DATABASE_[A-Z0-9_]+$/;

export const sanitizeProductionDatabaseHandoffText = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  if (safeConfigKeyPattern.test(trimmed)) {
    return trimmed;
  }

  return unsafeTextPattern.test(trimmed) ? redactedValue : trimmed;
};

const sanitizeDetails = (value: unknown): unknown => {
  if (typeof value === "string") {
    return sanitizeProductionDatabaseHandoffText(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeDetails);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      sanitizeProductionDatabaseHandoffText(key),
      sanitizeDetails(item),
    ]),
  );
};

export const sanitizeProductionDatabaseHandoffDiagnostic = (
  diagnostic: ProductionDatabaseHandoffDiagnostic,
): ProductionDatabaseHandoffDiagnostic => {
  const field = sanitizeProductionDatabaseHandoffText(diagnostic.field);
  const message = sanitizeProductionDatabaseHandoffText(diagnostic.message);
  const redacted = field === redactedValue || message === redactedValue;

  return {
    code: redacted
      ? "PRODUCTION_DATABASE_HANDOFF_UNSAFE_DIAGNOSTIC_REDACTED"
      : diagnostic.code,
    field,
    message: redacted
      ? "Unsafe production database handoff diagnostic value was redacted."
      : message,
    ...(diagnostic.safeDetails === undefined ? {} : { safeDetails: sanitizeDetails(diagnostic.safeDetails) }),
    severity: diagnostic.severity,
  };
};

export const createProductionDatabaseHandoffReadiness = ({
  diagnostics = [],
  localMvpReady = true,
  migrationGate,
  packageBinding,
  requiredReferences,
  safety = productionDatabaseNoLiveFlags,
  source = "seeded_fallback",
  storeCoverage,
  traceId,
}: CreateProductionDatabaseHandoffReadinessOptions): ProductionDatabaseHandoffReadiness => {
  const safeRequiredReferences = [...requiredReferences]
    .map((reference) => ({
      ...reference,
      id: sanitizeProductionDatabaseHandoffText(reference.id),
      key: sanitizeProductionDatabaseHandoffText(reference.key),
      message: sanitizeProductionDatabaseHandoffText(reference.message),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const safeStoreCoverage = [...storeCoverage]
    .map((store) => ({
      ...store,
      label: sanitizeProductionDatabaseHandoffText(store.label),
      ownerServiceId: sanitizeProductionDatabaseHandoffText(store.ownerServiceId),
      schemaVersion: sanitizeProductionDatabaseHandoffText(store.schemaVersion),
      storeId: sanitizeProductionDatabaseHandoffText(store.storeId),
    }))
    .sort((left, right) => left.storeId.localeCompare(right.storeId));
  const safeDiagnostics = diagnostics
    .map(sanitizeProductionDatabaseHandoffDiagnostic)
    .filter((diagnostic, index, all) =>
      all.findIndex((candidate) =>
        candidate.code === diagnostic.code
        && candidate.field === diagnostic.field
        && candidate.message === diagnostic.message,
      ) === index,
    );
  const status = resolveStatus(safeRequiredReferences, migrationGate, safeDiagnostics);

  return {
    boundary: productionDatabaseHandoffBoundary,
    diagnosticCodes: safeDiagnostics.map((diagnostic) => diagnostic.code),
    diagnostics: safeDiagnostics,
    id: "campaign-os-production-database-handoff-readiness",
    localMvpReady,
    migrationGate: {
      ...migrationGate,
      blockedMigrationIds: [...migrationGate.blockedMigrationIds],
      id: sanitizeProductionDatabaseHandoffText(migrationGate.id),
      pendingMigrationIds: [...migrationGate.pendingMigrationIds],
    },
    packageBinding: {
      ...packageBinding,
      bindingId: sanitizeProductionDatabaseHandoffText(packageBinding.bindingId),
      driverId: sanitizeProductionDatabaseHandoffText(packageBinding.driverId),
      packageName: sanitizeProductionDatabaseHandoffText(packageBinding.packageName),
      packageRef: sanitizeProductionDatabaseHandoffText(packageBinding.packageRef),
      providerId: sanitizeProductionDatabaseHandoffText(packageBinding.providerId),
      providerKind: sanitizeProductionDatabaseHandoffText(packageBinding.providerKind),
    },
    productionReady: false,
    requiredReferences: safeRequiredReferences,
    safety,
    source,
    status,
    storeCoverage: safeStoreCoverage,
    summary: createSummary(status, safeRequiredReferences, safeStoreCoverage),
    ...(traceId ? { traceId: sanitizeProductionDatabaseHandoffText(traceId) } : {}),
    valid: true,
  };
};

const resolveStatus = (
  requiredReferences: readonly ProductionDatabaseRequiredReference[],
  migrationGate: ProductionDatabaseMigrationGateReview,
  diagnostics: readonly ProductionDatabaseHandoffDiagnostic[],
): ProductionDatabaseHandoffStatus => {
  if (
    requiredReferences.some((reference) => reference.status === "blocked")
    || migrationGate.status === "blocked"
    || diagnostics.some((diagnostic) => diagnostic.severity === "error")
  ) {
    return "blocked";
  }

  if (
    requiredReferences.some((reference) => reference.status === "deferred")
    || migrationGate.status === "review_required"
    || diagnostics.some((diagnostic) => diagnostic.severity === "warning")
  ) {
    return "review_required";
  }

  return "local_ready";
};

const createSummary = (
  status: ProductionDatabaseHandoffStatus,
  requiredReferences: readonly ProductionDatabaseRequiredReference[],
  storeCoverage: readonly ProductionDatabaseStoreCoverage[],
): ProductionDatabaseHandoffSummary => {
  const blockedCount = requiredReferences.filter((reference) => reference.status === "blocked").length;
  const deferredCount = requiredReferences.filter((reference) => reference.status === "deferred").length;
  const readyCount = requiredReferences.filter((reference) => reference.status === "ready").length;

  return {
    blockedCount,
    deferredCount,
    readyCount,
    requiredReferenceCount: requiredReferences.length,
    status,
    storeCoverageCount: storeCoverage.length,
    topBlocker: blockedCount > 0
      ? text(
        "Production DB package/provider/secret/migration references are missing.",
        "缺少 production DB package、provider、secret 或 migration 引用。",
      )
      : deferredCount > 0
        ? text(
          "Production DB observability or runbook references remain deferred.",
          "Production DB observability 或 runbook 引用仍处于 deferred。",
        )
        : text(
          "Production DB handoff references are locally ready for review; production activation remains disabled.",
          "Production DB handoff 引用已可本地审核；production activation 仍禁用。",
        ),
    topNextAction: text(
      "Collect approved DB package/provider, secret manager, connection pool, migration approval, rollback/backup, observability, runbook, and live enablement references before a future production DB activation mission.",
      "在未来 production DB activation mission 前，收集已批准的 DB package/provider、secret manager、connection pool、migration approval、rollback/backup、observability、runbook 与 live enablement 引用。",
    ),
  };
};
