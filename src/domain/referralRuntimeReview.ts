import type {
  CampaignDbExportProjection,
  CampaignDbExportRow,
  CampaignDbReferralBindingRecord,
} from "../server/campaignDbRepository";
import { getLocalizedText } from "./locale";
import {
  EXPORT_CSV_COLUMNS,
  type CampaignShellDetail,
  type ExportPreviewRow,
  type ExportReadinessState,
  type ExportRowStatus,
  type LocalizedText,
  type ParticipantSnapshot,
  type SupportedLocale,
} from "./types";

export interface ReferralRuntimeReviewSafety {
  contractWriteEnabled: false;
  liveWalletVerificationEnabled: false;
  localReviewOnly: true;
  productionDbMigrationEnabled: false;
  productionReferralApiEnabled: false;
  providerRiskCallEnabled: false;
  queueSchedulerEnabled: false;
  rewardCustodyEnabled: false;
  rewardDistributionEnabled: false;
  storageWriteEnabled: false;
}

export interface ReferralRuntimeReviewExportRow {
  eligible: boolean;
  evidenceHashes: readonly string[];
  exportBatchId: string;
  missingTasks: readonly string[];
  referrerAddress: string;
  riskFlags: readonly string[];
  rowStatus: ExportRowStatus;
  taskRecordSummary: readonly string[];
  walletAddress: string;
}

export interface ParticipantReferralRuntimeSummary {
  antiFarmRule: string;
  bindingStatus: "qualified" | "risk_review" | "pending" | "unbound";
  boundary: string;
  eligibilityImpact: string;
  exportImpact: string;
  inviteeWalletAddress: string;
  nextAction: string;
  qualifiedActionCompleted: boolean;
  qualifiedInvitees: number;
  rawInvites: number;
  referralPoints: number;
  referrerAddress: string;
  riskFlags: readonly string[];
}

export interface AdminReferralRuntimeSummary {
  backendReadModel: string;
  bindingRecordCount: number;
  exportRowsMissingReferrer: number;
  exportRowsWithReferrer: number;
  futureHandoff: string;
  pendingBindingCount: number;
  productionDeferred: boolean;
  qualifiedBindingCount: number;
  readinessState: ExportReadinessState;
  referrerAddressColumnCovered: boolean;
  riskReviewBindingCount: number;
  topBlocker: string;
}

export interface ReferralRuntimeReviewModel {
  admin: AdminReferralRuntimeSummary;
  ariaLabel: string;
  boundary: string;
  exportRows: readonly ReferralRuntimeReviewExportRow[];
  participant: ParticipantReferralRuntimeSummary;
  safety: ReferralRuntimeReviewSafety;
}

export interface CreateReferralRuntimeReviewModelInput {
  backendReadiness?: {
    campaignDbVerticalSlice?: {
      referralBindingReadModel?: {
        futureHandoff?: string;
        mode?: string;
        productionDeferred?: boolean;
        referralBindingRecordCount?: number;
        status?: string;
      };
    };
  };
  campaign: CampaignShellDetail;
  exportProjection?: CampaignDbExportProjection;
  participant: ParticipantSnapshot;
  referralBindings?: readonly CampaignDbReferralBindingRecord[];
}

const ariaLabel: LocalizedText = {
  "en-US": "Referral runtime review",
  "zh-CN": "推荐运行时审核",
  "zh-TW": "推薦 runtime review",
};

const boundaryCopy: LocalizedText = {
  "en-US":
    "Local referral runtime review only. No production referral API, production DB migration, live wallet verification, provider risk call, contract write, storage write, queue or scheduler execution, reward custody, or reward distribution is enabled.",
  "zh-CN":
    "仅本地推荐运行时审核。不会启用生产 Referral API、生产 DB migration、实时钱包验证、provider 风险调用、合约写入、存储写入、queue 或 scheduler 执行、奖励托管或发奖。",
  "zh-TW":
    "Local referral runtime review only. No production referral API, production DB migration, live wallet verification, provider risk call, contract write, storage write, queue or scheduler execution, reward custody, or reward distribution is enabled.",
};

const pendingAction: LocalizedText = {
  "en-US": "Keep the referral pending until a qualified invitee completes valid campaign tasks.",
  "zh-CN": "在合格被邀请人完成有效活动任务前，保持推荐待定。",
  "zh-TW": "Keep the referral pending until a qualified invitee completes valid campaign tasks.",
};

const qualifiedAction: LocalizedText = {
  "en-US": "Referral is qualified in the local review model; keep production reward fulfillment project-owned.",
  "zh-CN": "推荐已在本地审核模型中合格；生产奖励履约仍由项目方负责。",
  "zh-TW": "Referral is qualified in the local review model; keep production reward fulfillment project-owned.",
};

const riskAction: LocalizedText = {
  "en-US": "Review referral risk flags before export approval.",
  "zh-CN": "导出批准前先审核推荐风险标记。",
  "zh-TW": "Review referral risk flags before export approval.",
};

const unboundAction: LocalizedText = {
  "en-US": "No local referral binding is attached to this participant yet.",
  "zh-CN": "该参与者尚未关联本地推荐绑定。",
  "zh-TW": "No local referral binding is attached to this participant yet.",
};

const eligibilityImpactCopy = (
  missingTasks: readonly string[],
  riskFlags: readonly string[],
): LocalizedText => {
  if (riskFlags.length > 0) {
    return {
      "en-US": "Referral risk review is required before eligibility can be treated as clean.",
      "zh-CN": "推荐风险审核完成前，资格不能视为完全清晰。",
      "zh-TW": "Referral risk review is required before eligibility can be treated as clean.",
    };
  }

  if (missingTasks.length > 0) {
    return {
      "en-US": `Eligibility is still blocked by missing tasks: ${missingTasks.join(", ")}.`,
      "zh-CN": `资格仍被缺失任务阻断：${missingTasks.join(", ")}。`,
      "zh-TW": `Eligibility is still blocked by missing tasks: ${missingTasks.join(", ")}.`,
    };
  }

  return {
    "en-US": "Referral context does not block local eligibility.",
    "zh-CN": "推荐上下文不会阻断本地资格。",
    "zh-TW": "Referral context does not block local eligibility.",
  };
};

const exportImpactCopy = (
  referrerAddress: string,
  rowStatus?: ExportRowStatus,
): LocalizedText => {
  if (!referrerAddress) {
    return {
      "en-US": "Export row has no referrer_address yet.",
      "zh-CN": "导出行尚未包含 referrer_address。",
      "zh-TW": "Export row has no referrer_address yet.",
    };
  }

  return {
    "en-US": `Export projection includes referrer_address and row status ${rowStatus ?? "pending"}.`,
    "zh-CN": `导出投影已包含 referrer_address，行状态为 ${rowStatus ?? "pending"}。`,
    "zh-TW": `Export projection includes referrer_address and row status ${rowStatus ?? "pending"}.`,
  };
};

const referralRuntimeReviewSafety: ReferralRuntimeReviewSafety = {
  contractWriteEnabled: false,
  liveWalletVerificationEnabled: false,
  localReviewOnly: true,
  productionDbMigrationEnabled: false,
  productionReferralApiEnabled: false,
  providerRiskCallEnabled: false,
  queueSchedulerEnabled: false,
  rewardCustodyEnabled: false,
  rewardDistributionEnabled: false,
  storageWriteEnabled: false,
};

const localize = (text: LocalizedText, locale: SupportedLocale) =>
  getLocalizedText(text, locale);

const normalizeTaskRecord = (record: string | { templateCode: string; status: string; pointsAwarded: number }) =>
  typeof record === "string" ? record : `${record.templateCode}:${record.status}:${record.pointsAwarded}`;

const exportRowsFor = (
  campaign: CampaignShellDetail,
  exportProjection?: CampaignDbExportProjection,
): Array<CampaignDbExportRow | ExportPreviewRow> =>
  exportProjection?.rows ?? campaign.exportPreview.rows;

const rowSeverity = (rowStatus: ExportRowStatus) =>
  rowStatus === "blocked" ? 0 : rowStatus === "review_required" ? 1 : 2;

const sortRows = <TRow extends CampaignDbExportRow | ExportPreviewRow>(rows: readonly TRow[]) =>
  [...rows].sort((left, right) =>
    rowSeverity(left.rowStatus) - rowSeverity(right.rowStatus) ||
    (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER) ||
    left.walletAddress.localeCompare(right.walletAddress),
  );

const createExportRows = (
  campaign: CampaignShellDetail,
  exportProjection?: CampaignDbExportProjection,
): ReferralRuntimeReviewExportRow[] =>
  sortRows(exportRowsFor(campaign, exportProjection)).map((row) => ({
    eligible: row.eligible,
    evidenceHashes: [...row.evidenceHashes],
    exportBatchId: row.exportBatchId,
    missingTasks: [...row.missingTasks],
    referrerAddress: row.referrerAddress,
    riskFlags: [...row.riskFlags],
    rowStatus: row.rowStatus,
    taskRecordSummary: row.taskRecords.map(normalizeTaskRecord),
    walletAddress: row.walletAddress,
  }));

const bindingForParticipant = (
  participant: ParticipantSnapshot,
  referralBindings: readonly CampaignDbReferralBindingRecord[],
) =>
  referralBindings.find((binding) =>
    binding.campaignId === participant.campaignId &&
    binding.inviteeWalletAddress === participant.walletAddress,
  );

const bindingStatusFor = (
  participant: ParticipantSnapshot,
  binding: CampaignDbReferralBindingRecord | undefined,
  exportRow: ReferralRuntimeReviewExportRow | undefined,
): ParticipantReferralRuntimeSummary["bindingStatus"] => {
  if (binding) {
    return binding.status;
  }

  if ((participant.referralSummary?.riskFlags.length ?? 0) > 0 || (exportRow?.riskFlags.length ?? 0) > 0) {
    return "risk_review";
  }

  if (participant.referrerAddress || exportRow?.referrerAddress) {
    return (participant.referralSummary?.qualifiedInvitees ?? 0) > 0 ? "qualified" : "pending";
  }

  return "unbound";
};

const nextActionFor = (
  status: ParticipantReferralRuntimeSummary["bindingStatus"],
): LocalizedText => {
  if (status === "qualified") {
    return qualifiedAction;
  }

  if (status === "risk_review") {
    return riskAction;
  }

  if (status === "pending") {
    return pendingAction;
  }

  return unboundAction;
};

const createParticipantSummary = (
  participant: ParticipantSnapshot,
  exportRows: readonly ReferralRuntimeReviewExportRow[],
  locale: SupportedLocale,
  referralBindings: readonly CampaignDbReferralBindingRecord[],
): ParticipantReferralRuntimeSummary => {
  const binding = bindingForParticipant(participant, referralBindings);
  const exportRow = exportRows.find((row) => row.walletAddress === participant.walletAddress);
  const referral = participant.referralSummary;
  const riskFlags = [...new Set([...(referral?.riskFlags ?? []), ...(binding?.riskFlags ?? []), ...(exportRow?.riskFlags ?? [])])].sort();
  const referrerAddress = binding?.referrerWalletAddress ?? exportRow?.referrerAddress ?? participant.referrerAddress;
  const bindingStatus = bindingStatusFor(participant, binding, exportRow);
  const antiFarmRule = referral?.antiFarmRule ?? {
    "en-US": "Raw signups do not count; invitees must complete valid campaign tasks.",
    "zh-CN": "仅注册不会计分；被邀请人必须完成有效活动任务。",
    "zh-TW": "Raw signups do not count; invitees must complete valid campaign tasks.",
  };

  return {
    antiFarmRule: localize(antiFarmRule, locale),
    bindingStatus,
    boundary: localize(boundaryCopy, locale),
    eligibilityImpact: localize(eligibilityImpactCopy(participant.missingTaskIds, riskFlags), locale),
    exportImpact: localize(exportImpactCopy(referrerAddress, exportRow?.rowStatus), locale),
    inviteeWalletAddress: participant.walletAddress,
    nextAction: localize(nextActionFor(bindingStatus), locale),
    qualifiedActionCompleted: binding?.qualifiedActionCompleted ?? (referral?.qualifiedInvitees ?? 0) > 0,
    qualifiedInvitees: referral?.qualifiedInvitees ?? 0,
    rawInvites: referral?.invitedCount ?? 0,
    referralPoints: referral?.referralPoints ?? 0,
    referrerAddress,
    riskFlags,
  };
};

const readinessFor = ({
  exportRows,
  participant,
  riskReviewBindingCount,
}: {
  exportRows: readonly ReferralRuntimeReviewExportRow[];
  participant: ParticipantReferralRuntimeSummary;
  riskReviewBindingCount: number;
}): ExportReadinessState => {
  if (exportRows.some((row) => row.rowStatus === "blocked")) {
    return "blocked";
  }

  if (
    participant.bindingStatus === "risk_review" ||
    riskReviewBindingCount > 0 ||
    exportRows.some((row) => row.rowStatus === "review_required" || row.riskFlags.length > 0)
  ) {
    return "review_required";
  }

  return "ready";
};

const topBlockerFor = (
  readinessState: ExportReadinessState,
  rowsMissingReferrer: number,
  riskReviewBindingCount: number,
): LocalizedText => {
  if (rowsMissingReferrer > 0) {
    return {
      "en-US": `${rowsMissingReferrer} export rows are missing referrer_address.`,
      "zh-CN": `${rowsMissingReferrer} 条导出行缺少 referrer_address。`,
      "zh-TW": `${rowsMissingReferrer} export rows are missing referrer_address.`,
    };
  }

  if (riskReviewBindingCount > 0) {
    return {
      "en-US": `${riskReviewBindingCount} referral bindings require risk review.`,
      "zh-CN": `${riskReviewBindingCount} 条推荐绑定需要风险审核。`,
      "zh-TW": `${riskReviewBindingCount} referral bindings require risk review.`,
    };
  }

  if (readinessState === "blocked") {
    return {
      "en-US": "Complete missing required tasks before export approval.",
      "zh-CN": "导出批准前先完成缺失的必做任务。",
      "zh-TW": "Complete missing required tasks before export approval.",
    };
  }

  return {
    "en-US": "Referral runtime is local-review ready; keep production handoff deferred.",
    "zh-CN": "推荐运行时已可本地审核；生产 handoff 仍保持 deferred。",
    "zh-TW": "Referral runtime is local-review ready; keep production handoff deferred.",
  };
};

export const createReferralRuntimeReviewModel = ({
  backendReadiness,
  campaign,
  exportProjection,
  participant,
  referralBindings = [],
}: CreateReferralRuntimeReviewModelInput, locale: SupportedLocale): ReferralRuntimeReviewModel => {
  const exportRows = createExportRows(campaign, exportProjection);
  const participantSummary = createParticipantSummary(participant, exportRows, locale, referralBindings);
  const rowsWithReferrer = exportRows.filter((row) => row.referrerAddress.trim().length > 0).length;
  const rowsMissingReferrer = exportRows.length - rowsWithReferrer;
  const qualifiedBindingCount = referralBindings.filter((binding) => binding.status === "qualified").length;
  const riskReviewBindingCount =
    referralBindings.filter((binding) => binding.status === "risk_review" || binding.riskFlags.length > 0).length ||
    exportRows.filter((row) => row.riskFlags.some((flag) => flag.includes("referral"))).length;
  const pendingBindingCount = Math.max(0, referralBindings.length - qualifiedBindingCount - riskReviewBindingCount);
  const readinessState = readinessFor({ exportRows, participant: participantSummary, riskReviewBindingCount });
  const referralReadiness = backendReadiness?.campaignDbVerticalSlice?.referralBindingReadModel;

  return {
    admin: {
      backendReadModel: referralReadiness?.mode ?? "local Campaign DB referral binding read model",
      bindingRecordCount: referralReadiness?.referralBindingRecordCount ?? Math.max(referralBindings.length, rowsWithReferrer),
      exportRowsMissingReferrer: rowsMissingReferrer,
      exportRowsWithReferrer: rowsWithReferrer,
      futureHandoff: referralReadiness?.futureHandoff ?? "future Campaign DB referral binding table service",
      pendingBindingCount,
      productionDeferred: referralReadiness?.productionDeferred ?? true,
      qualifiedBindingCount: Math.max(qualifiedBindingCount, participantSummary.qualifiedActionCompleted ? 1 : 0),
      readinessState,
      referrerAddressColumnCovered: EXPORT_CSV_COLUMNS.includes("referrer_address") && rowsWithReferrer > 0,
      riskReviewBindingCount,
      topBlocker: localize(topBlockerFor(readinessState, rowsMissingReferrer, riskReviewBindingCount), locale),
    },
    ariaLabel: localize(ariaLabel, locale),
    boundary: localize(boundaryCopy, locale),
    exportRows,
    participant: participantSummary,
    safety: referralRuntimeReviewSafety,
  };
};
