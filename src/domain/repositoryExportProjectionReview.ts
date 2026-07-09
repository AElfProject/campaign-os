import type {
  CampaignDbExportProjection,
  CampaignDbExportTaskRecord,
} from "../server/campaignDbRepository";
import { getLocalizedText } from "./locale";
import {
  EXPORT_CSV_COLUMNS,
  type AccountType,
  type ExportCsvColumn,
  type ExportReadinessState,
  type ExportRowStatus,
  type LocalizedText,
  type SupportedLocale,
  type WalletSource,
} from "./types";

export type RepositoryExportProjectionColumnCoverageStatus =
  | "covered"
  | "review_required"
  | "blocked";

export interface RepositoryExportProjectionTopBlocker {
  label: string;
  nextAction: string;
  state: ExportReadinessState;
}

export interface RepositoryExportProjectionSummary {
  acknowledgedItems: number;
  blockedRows: number;
  previewModeCount: number;
  readyRows: number;
  requiredAcknowledgements: number;
  reviewRequiredRows: number;
  totalRows: number;
}

export interface RepositoryExportProjectionColumnCoverage {
  column: ExportCsvColumn;
  detail: string;
  source: "repository_projection" | "readiness_projection" | "deferred";
  status: RepositoryExportProjectionColumnCoverageStatus;
}

export interface RepositoryExportProjectionPreviewRow {
  accountType: AccountType;
  eligible: boolean;
  evidenceHashes: readonly string[];
  exportBatchId: string;
  localePreference: SupportedLocale;
  missingTasks: readonly string[];
  rank?: number;
  referrerAddress: string;
  riskFlags: readonly string[];
  rowStatus: ExportRowStatus;
  taskEvidence: readonly RepositoryExportProjectionTaskEvidence[];
  taskRecordSummary: readonly string[];
  totalPoints: number;
  walletAddress: string;
  walletSource: WalletSource;
}

export interface RepositoryExportProjectionTaskEvidence {
  evidenceHash?: string;
  evidenceId?: string;
  evidenceRef?: string;
  liveContractExecuted: false;
  liveProviderExecuted: false;
  liveRewardExecuted: false;
  liveStorageExecuted: false;
  status: CampaignDbExportTaskRecord["status"];
  taskId: string;
  templateCode: string;
}

export interface RepositoryExportProjectionSafety {
  contractRootWriteEnabled: false;
  contractTransactionEnabled: false;
  downloadAvailable: false;
  generatesFile: false;
  localReviewOnly: true;
  queueExecutionEnabled: false;
  rewardCustodyEnabled: false;
  rewardDistributionEnabled: false;
  schedulerExecutionEnabled: false;
  signedUrlEnabled: false;
  storageWriteEnabled: false;
  walletSigningEnabled: false;
}

export interface RepositoryExportProjectionReviewModel {
  ariaLabel: string;
  campaignId: string;
  columnCoverage: readonly RepositoryExportProjectionColumnCoverage[];
  exportBatchId: string;
  nextAction: string;
  previewRows: readonly RepositoryExportProjectionPreviewRow[];
  readinessState: ExportReadinessState;
  repositoryLabel: string;
  safety: RepositoryExportProjectionSafety;
  summary: RepositoryExportProjectionSummary;
  topBlocker: RepositoryExportProjectionTopBlocker;
}

const repositoryProjectionAriaLabel: LocalizedText = {
  "en-US": "Repository export projection review",
  "zh-CN": "Repository 导出投影审核",
  "zh-TW": "Repository export projection review",
};

const localize = (text: LocalizedText, locale: SupportedLocale) =>
  getLocalizedText(text, locale);

const missingAcknowledgementCopy = (
  missingCount: number,
): LocalizedText => ({
  "en-US": `${missingCount} required export acknowledgements are still pending.`,
  "zh-CN": `还有 ${missingCount} 个必需导出确认项待处理。`,
  "zh-TW": `${missingCount} required export acknowledgements are still pending.`,
});

const missingAcknowledgementActionCopy = (
  missingCount: number,
): LocalizedText => ({
  "en-US": `Complete ${missingCount} required acknowledgement${missingCount === 1 ? "" : "s"} before approving the repository export projection.`,
  "zh-CN": `批准 repository 导出投影前先完成 ${missingCount} 个必需确认项。`,
  "zh-TW": `Complete ${missingCount} required acknowledgement${missingCount === 1 ? "" : "s"} before approving the repository export projection.`,
});

const coveredColumnDetail = (column: ExportCsvColumn): LocalizedText => ({
  "en-US": `${column} is covered by the repository export projection.`,
  "zh-CN": `${column} 已由 repository 导出投影覆盖。`,
  "zh-TW": `${column} is covered by the repository export projection.`,
});

const missingColumnDetail = (column: ExportCsvColumn): LocalizedText => ({
  "en-US": `${column} is required for the v0.2 CSV contract and must be resolved before approval.`,
  "zh-CN": `${column} 是 v0.2 CSV contract 的必需列，批准前必须处理。`,
  "zh-TW": `${column} is required for the v0.2 CSV contract and must be resolved before approval.`,
});

const reviewColumnDetail = (column: ExportCsvColumn): LocalizedText => ({
  "en-US": `${column} is not marked present by readiness coverage and needs reviewer confirmation.`,
  "zh-CN": `${column} 未被 readiness coverage 标记为已存在，需要审核确认。`,
  "zh-TW": `${column} is not marked present by readiness coverage and needs reviewer confirmation.`,
});

const assertRepositoryProjection = (projection: CampaignDbExportProjection) => {
  if (
    projection.repository.createdViaRepository !== true ||
    projection.repository.storeId !== "campaign-db"
  ) {
    throw new Error("Repository export projection review requires a campaign-db repository-created projection.");
  }

  if (!projection.exportBatchId || projection.exportBatchId.trim().length === 0) {
    throw new Error("Repository export projection review requires an export batch id.");
  }
};

const createSummary = (
  projection: CampaignDbExportProjection,
): RepositoryExportProjectionSummary => ({
  acknowledgedItems: projection.exportReadiness.summary.acknowledgedItems,
  blockedRows: projection.exportReadiness.summary.blockedRows,
  previewModeCount: projection.exportReadiness.summary.previewModeCount,
  readyRows: projection.exportReadiness.summary.readyRows,
  requiredAcknowledgements: projection.exportReadiness.summary.requiredAcknowledgements,
  reviewRequiredRows: projection.exportReadiness.summary.reviewRequiredRows,
  totalRows: projection.exportReadiness.summary.totalRows,
});

const readinessStateFor = (
  summary: RepositoryExportProjectionSummary,
): ExportReadinessState => {
  if (summary.blockedRows > 0) {
    return "blocked";
  }

  if (
    summary.reviewRequiredRows > 0 ||
    summary.acknowledgedItems < summary.requiredAcknowledgements
  ) {
    return "review_required";
  }

  return "ready";
};

const createTopBlocker = (
  projection: CampaignDbExportProjection,
  readinessState: ExportReadinessState,
  summary: RepositoryExportProjectionSummary,
  locale: SupportedLocale,
): RepositoryExportProjectionTopBlocker => {
  const activeBlockedReason = projection.exportReadiness.rowStatusCoverage.find(
    (reason) => reason.rowStatus === "blocked" && reason.affectedRows > 0,
  );
  const activeReviewReason = projection.exportReadiness.rowStatusCoverage.find(
    (reason) => reason.rowStatus === "review_required" && reason.affectedRows > 0,
  );
  const reason = activeBlockedReason ?? activeReviewReason;

  if (reason) {
    return {
      label: localize(reason.label, locale),
      nextAction: localize(reason.nextAction, locale),
      state: reason.rowStatus,
    };
  }

  const missingAcknowledgements = Math.max(
    0,
    summary.requiredAcknowledgements - summary.acknowledgedItems,
  );

  if (missingAcknowledgements > 0) {
    return {
      label: localize(missingAcknowledgementCopy(missingAcknowledgements), locale),
      nextAction: localize(missingAcknowledgementActionCopy(missingAcknowledgements), locale),
      state: "review_required",
    };
  }

  return {
    label: localize(projection.exportReadiness.nextAction, locale),
    nextAction: localize(projection.exportReadiness.nextAction, locale),
    state: readinessState,
  };
};

const createColumnCoverage = (
  projection: CampaignDbExportProjection,
  locale: SupportedLocale,
): RepositoryExportProjectionColumnCoverage[] => {
  const presentFields = new Set(projection.exportReadiness.fieldCoverage.presentFields);
  const missingFields = new Set(projection.exportReadiness.fieldCoverage.missingFields);

  return EXPORT_CSV_COLUMNS.map((column) => {
    if (presentFields.has(column)) {
      return {
        column,
        detail: localize(coveredColumnDetail(column), locale),
        source: "repository_projection" as const,
        status: "covered" as const,
      };
    }

    if (missingFields.has(column)) {
      return {
        column,
        detail: localize(missingColumnDetail(column), locale),
        source: "readiness_projection" as const,
        status: "blocked" as const,
      };
    }

    return {
      column,
      detail: localize(reviewColumnDetail(column), locale),
      source: "deferred" as const,
      status: "review_required" as const,
    };
  });
};

const taskRecordSummary = (record: CampaignDbExportTaskRecord) =>
  [
    `${record.templateCode}: ${record.status} / ${record.pointsAwarded}`,
    record.evidenceId ? `evidence=${record.evidenceId}` : undefined,
    record.evidenceHash ? `hash=${record.evidenceHash}` : undefined,
  ].filter(Boolean).join(" / ");

const taskEvidence = (record: CampaignDbExportTaskRecord): RepositoryExportProjectionTaskEvidence => ({
  ...(record.evidenceHash ? { evidenceHash: record.evidenceHash } : {}),
  ...(record.evidenceId ? { evidenceId: record.evidenceId } : {}),
  ...(record.evidenceRef ? { evidenceRef: record.evidenceRef } : {}),
  liveContractExecuted: record.liveContractExecuted ?? false,
  liveProviderExecuted: record.liveProviderExecuted ?? false,
  liveRewardExecuted: record.liveRewardExecuted ?? false,
  liveStorageExecuted: record.liveStorageExecuted ?? false,
  status: record.status,
  taskId: record.taskId,
  templateCode: record.templateCode,
});

const createPreviewRows = (
  projection: CampaignDbExportProjection,
): RepositoryExportProjectionPreviewRow[] =>
  projection.rows.map((row) => ({
    accountType: row.accountType,
    eligible: row.eligible,
    evidenceHashes: [...row.evidenceHashes],
    exportBatchId: row.exportBatchId,
    localePreference: row.localePreference,
    missingTasks: [...row.missingTasks],
    ...(row.rank === undefined ? {} : { rank: row.rank }),
    referrerAddress: row.referrerAddress,
    riskFlags: [...row.riskFlags],
    rowStatus: row.rowStatus,
    taskEvidence: row.taskRecords.map(taskEvidence),
    taskRecordSummary: row.taskRecords.map(taskRecordSummary),
    totalPoints: row.totalPoints,
    walletAddress: row.walletAddress,
    walletSource: row.walletSource,
  }));

const repositoryExportProjectionSafety: RepositoryExportProjectionSafety = {
  contractRootWriteEnabled: false,
  contractTransactionEnabled: false,
  downloadAvailable: false,
  generatesFile: false,
  localReviewOnly: true,
  queueExecutionEnabled: false,
  rewardCustodyEnabled: false,
  rewardDistributionEnabled: false,
  schedulerExecutionEnabled: false,
  signedUrlEnabled: false,
  storageWriteEnabled: false,
  walletSigningEnabled: false,
};

export const createRepositoryExportProjectionReviewModel = (
  projection: CampaignDbExportProjection,
  locale: SupportedLocale,
): RepositoryExportProjectionReviewModel => {
  assertRepositoryProjection(projection);

  const summary = createSummary(projection);
  const readinessState = readinessStateFor(summary);

  return {
    ariaLabel: localize(repositoryProjectionAriaLabel, locale),
    campaignId: projection.campaignId,
    columnCoverage: createColumnCoverage(projection, locale),
    exportBatchId: projection.exportBatchId,
    nextAction: localize(projection.exportReadiness.nextAction, locale),
    previewRows: createPreviewRows(projection),
    readinessState,
    repositoryLabel: `${projection.repository.storeId} / ${projection.repository.adapterId}`,
    safety: repositoryExportProjectionSafety,
    summary,
    topBlocker: createTopBlocker(projection, readinessState, summary, locale),
  };
};
