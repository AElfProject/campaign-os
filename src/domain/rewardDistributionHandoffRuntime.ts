import type { CampaignShellDetail, ExportPreviewRow, LocalizedText } from "./types";

const text = (enUS: string, zhCN: string, zhTW = enUS): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
});

export type RewardDistributionHandoffRuntimeSource = "seeded_runtime" | "server_runtime";
export type RewardDistributionHandoffRuntimeStatus = "blocked" | "review_required" | "local_ready";
export type RewardDistributionHandoffItemState = "blocked" | "review_required" | "ready";
export type RewardDistributionHandoffEvidenceStatus = "missing" | "partial" | "ready_disabled";
export type RewardDistributionHandoffOwnerRole =
  | "ai_worker"
  | "finance_reviewer"
  | "internal_operator"
  | "legal_reviewer"
  | "project_owner";
export type RewardDistributionHandoffDiagnosticSeverity = "error" | "info" | "warning";
export type RewardDistributionHandoffDiagnosticSource =
  | "boundary"
  | "config"
  | "evidence"
  | "export"
  | "queue"
  | "redaction"
  | "reconciliation"
  | "runtime"
  | "safety"
  | (string & {});
export type RewardDistributionHandoffDiagnosticCode =
  | "REWARD_DISTRIBUTION_FUNDING_PROOF_MISSING"
  | "REWARD_DISTRIBUTION_OPERATOR_APPROVAL_MISSING"
  | "REWARD_DISTRIBUTION_QUEUE_HANDOFF_MISSING"
  | "REWARD_DISTRIBUTION_DEAD_LETTER_POLICY_MISSING"
  | "REWARD_DISTRIBUTION_IDEMPOTENCY_POLICY_MISSING"
  | "REWARD_DISTRIBUTION_RECONCILIATION_MISSING"
  | "REWARD_DISTRIBUTION_OFF_SWITCH_MISSING"
  | "REWARD_DISTRIBUTION_ROLLBACK_RUNBOOK_MISSING"
  | "REWARD_DISTRIBUTION_LIVE_EXECUTION_DISABLED"
  | "REWARD_DISTRIBUTION_EXPORT_LINKAGE_MISSING"
  | "REWARD_DISTRIBUTION_RECIPIENT_REVIEW_REQUIRED"
  | "REWARD_DISTRIBUTION_UNSAFE_DIAGNOSTIC_REDACTED";

export type RewardDistributionHandoffItemId = (typeof rewardDistributionRequiredItemIds)[number];

export interface RewardDistributionHandoffRuntimeDiagnostic {
  code: RewardDistributionHandoffDiagnosticCode;
  field: string;
  message: string;
  safeDetails?: unknown;
  severity: RewardDistributionHandoffDiagnosticSeverity;
  source: RewardDistributionHandoffDiagnosticSource;
}

export interface RewardDistributionHandoffEvidenceInput {
  deadLetterPolicyRef?: string;
  fundingProofRef?: string;
  idempotencyPolicyRef?: string;
  offSwitchRef?: string;
  operatorApprovalRef?: string;
  queueHandoffRef?: string;
  reconciliationReportRef?: string;
  rollbackRunbookRef?: string;
}

export interface RewardDistributionHandoffEvidence {
  deadLetterPolicyRef?: string;
  fundingProofRef?: string;
  idempotencyPolicyRef?: string;
  missingEvidenceKeys: readonly string[];
  offSwitchRef?: string;
  operatorApprovalRef?: string;
  productionReady: false;
  queueHandoffRef?: string;
  reconciliationReportRef?: string;
  requiredEvidenceKeys: readonly string[];
  rollbackRunbookRef?: string;
  status: RewardDistributionHandoffEvidenceStatus;
  topBlocker: LocalizedText;
}

export interface RewardDistributionExportLinkage {
  campaignId: string;
  derivedFrom: "seeded_export_preview";
  eligibleRecipientCount: number;
  exportBatchIds: readonly string[];
  exportReadyRecipientCount: number;
  evidenceHashCount: number;
  localPreviewOnly: true;
  recipientCount: number;
  riskFlaggedRecipientCount: number;
  rowStatusCounts: Record<string, number>;
}

export interface RewardDistributionHandoffItem {
  boundary: LocalizedText;
  evidenceRef?: string;
  id: RewardDistributionHandoffItemId;
  label: LocalizedText;
  liveExecutionEnabled: false;
  nextAction: LocalizedText;
  ownerRole: RewardDistributionHandoffOwnerRole;
  requiredBeforeProduction: true;
  state: RewardDistributionHandoffItemState;
}

export interface RewardDistributionHandoffNoLiveSideEffects {
  liveClaim: false;
  liveContractWrite: false;
  livePayout: false;
  liveProviderCall: false;
  liveQueuePublishing: false;
  liveRewardCustody: false;
  liveRewardDistribution: false;
  liveSchedulerExecution: false;
  liveWalletSignature: false;
  liveWorkerExecution: false;
}

export interface RewardDistributionHandoffRuntimeSummary {
  blockedItemCount: number;
  evidenceHashCount: number;
  exportReadyRecipientCount: number;
  itemCount: number;
  missingEvidenceCount: number;
  readyItemCount: number;
  recipientCount: number;
  reviewRequiredItemCount: number;
  topBlocker: LocalizedText;
  topNextAction: LocalizedText;
}

export interface CreateRewardDistributionHandoffReadinessOptions {
  campaign: CampaignShellDetail;
  diagnostics?: readonly RewardDistributionHandoffRuntimeDiagnostic[];
  evidence?: RewardDistributionHandoffEvidenceInput;
  source?: RewardDistributionHandoffRuntimeSource;
  traceId?: string;
}

export interface RewardDistributionHandoffReadiness {
  boundary: LocalizedText;
  campaignId: string;
  diagnosticCodes: readonly RewardDistributionHandoffDiagnosticCode[];
  diagnostics: readonly RewardDistributionHandoffRuntimeDiagnostic[];
  evidenceHandoff: RewardDistributionHandoffEvidence;
  exportLinkage: RewardDistributionExportLinkage;
  items: readonly RewardDistributionHandoffItem[];
  noLiveSideEffects: RewardDistributionHandoffNoLiveSideEffects;
  productionReady: false;
  requiredEvidenceKeys: readonly string[];
  source: RewardDistributionHandoffRuntimeSource;
  status: RewardDistributionHandoffRuntimeStatus;
  summary: RewardDistributionHandoffRuntimeSummary;
  traceId?: string;
  valid: true;
}

export const rewardDistributionRequiredItemIds = [
  "project-owner-funding-proof",
  "winner-export-linkage",
  "recipient-list-integrity",
  "operator-approval",
  "queue-handoff",
  "dead-letter-policy",
  "idempotency-policy",
  "reconciliation-report",
  "off-switch",
  "rollback-runbook",
  "no-custody-no-distribution-boundary",
] as const;

export const rewardDistributionHandoffRequiredEvidenceKeys = [
  "CAMPAIGN_OS_REWARD_DISTRIBUTION_FUNDING_PROOF_REF",
  "CAMPAIGN_OS_REWARD_DISTRIBUTION_OPERATOR_APPROVAL_REF",
  "CAMPAIGN_OS_REWARD_DISTRIBUTION_QUEUE_HANDOFF_REF",
  "CAMPAIGN_OS_REWARD_DISTRIBUTION_DEAD_LETTER_POLICY_REF",
  "CAMPAIGN_OS_REWARD_DISTRIBUTION_IDEMPOTENCY_POLICY_REF",
  "CAMPAIGN_OS_REWARD_DISTRIBUTION_RECONCILIATION_REF",
  "CAMPAIGN_OS_REWARD_DISTRIBUTION_OFF_SWITCH_REF",
  "CAMPAIGN_OS_REWARD_DISTRIBUTION_ROLLBACK_RUNBOOK_REF",
] as const;

export const rewardDistributionHandoffBoundary = text(
  "Local reward distribution handoff readiness only. No reward custody, reward distribution, payout, claim, provider call, wallet signature, contract write, queue publishing, scheduler execution, or worker execution is performed.",
  "仅本地 reward distribution handoff readiness。不会执行奖励托管、发奖、payout、claim、provider 调用、钱包签名、合约写入、队列发布、调度执行或 worker 执行。",
  "僅本地 reward distribution handoff readiness。不會執行獎勵託管、發獎、payout、claim、provider 呼叫、錢包簽名、合約寫入、隊列發布、排程執行或 worker 執行。",
);

const handoffItemBoundary = text(
  "Review-only handoff prerequisite. It records evidence and ownership without executing custody, payout, claim, provider, wallet, contract, queue, scheduler, or worker behavior.",
  "仅审核 handoff 前置项。这里只记录 evidence 与责任归属，不执行托管、payout、claim、provider、wallet、contract、queue、scheduler 或 worker 行为。",
  "僅審核 handoff 前置項。这里只記錄 evidence 與責任歸屬，不執行託管、payout、claim、provider、wallet、contract、queue、scheduler 或 worker 行為。",
);

export const rewardDistributionHandoffNoLiveSideEffects: RewardDistributionHandoffNoLiveSideEffects = {
  liveClaim: false,
  liveContractWrite: false,
  livePayout: false,
  liveProviderCall: false,
  liveQueuePublishing: false,
  liveRewardCustody: false,
  liveRewardDistribution: false,
  liveSchedulerExecution: false,
  liveWalletSignature: false,
  liveWorkerExecution: false,
};

const topNextAction = text(
  "Review funding proof, winner export linkage, recipient integrity, operator approval, queue handoff, dead-letter policy, idempotency, reconciliation, off-switch, and rollback runbook before any future reward distribution implementation.",
  "任何未来 reward distribution 实现前，请审核资金证明、winner export linkage、recipient 完整性、operator approval、queue handoff、dead-letter policy、idempotency、reconciliation、off-switch 与 rollback runbook。",
  "任何未來 reward distribution 實作前，請審核資金證明、winner export linkage、recipient 完整性、operator approval、queue handoff、dead-letter policy、idempotency、reconciliation、off-switch 與 rollback runbook。",
);

export const createRewardDistributionHandoffReadiness = ({
  campaign,
  diagnostics = [],
  evidence,
  source = "seeded_runtime",
  traceId,
}: CreateRewardDistributionHandoffReadinessOptions): RewardDistributionHandoffReadiness => {
  const evidenceHandoff = createEvidenceHandoff(evidence);
  const exportLinkage = createExportLinkage(campaign);
  const items = createHandoffItems(evidenceHandoff, exportLinkage);
  const diagnosticCodes = createDiagnosticCodes(evidenceHandoff, exportLinkage, items);
  const baseDiagnostics = diagnosticCodes.map(createDiagnostic);

  return {
    boundary: rewardDistributionHandoffBoundary,
    campaignId: campaign.id,
    diagnosticCodes,
    diagnostics: [
      ...baseDiagnostics,
      ...diagnostics.map(sanitizeDiagnostic),
    ],
    evidenceHandoff,
    exportLinkage,
    items,
    noLiveSideEffects: rewardDistributionHandoffNoLiveSideEffects,
    productionReady: false,
    requiredEvidenceKeys: rewardDistributionHandoffRequiredEvidenceKeys,
    source,
    status: createRuntimeStatus(evidenceHandoff, exportLinkage),
    summary: createSummary(items, evidenceHandoff, exportLinkage),
    ...(traceId ? { traceId: sanitizeRewardDistributionHandoffRuntimeText(traceId) } : {}),
    valid: true,
  };
};

const createEvidenceHandoff = (
  input: RewardDistributionHandoffEvidenceInput | undefined,
): RewardDistributionHandoffEvidence => {
  const safeInput = sanitizeEvidenceInput(input);
  const missingEvidenceKeys = missingEvidenceKeysFor(safeInput);
  const hasAnyEvidence = Object.values(safeInput).some((value) => typeof value === "string" && value.length > 0);
  const status: RewardDistributionHandoffEvidenceStatus = !hasAnyEvidence
    ? "missing"
    : missingEvidenceKeys.length > 0
      ? "partial"
      : "ready_disabled";

  return {
    ...safeInput,
    missingEvidenceKeys,
    productionReady: false,
    requiredEvidenceKeys: rewardDistributionHandoffRequiredEvidenceKeys,
    status,
    topBlocker: topEvidenceBlocker(status),
  };
};

const sanitizeEvidenceInput = (
  input: RewardDistributionHandoffEvidenceInput | undefined,
): Partial<RewardDistributionHandoffEvidenceInput> => ({
  deadLetterPolicyRef: normalizeSafeReference(input?.deadLetterPolicyRef),
  fundingProofRef: normalizeSafeReference(input?.fundingProofRef),
  idempotencyPolicyRef: normalizeSafeReference(input?.idempotencyPolicyRef),
  offSwitchRef: normalizeSafeReference(input?.offSwitchRef),
  operatorApprovalRef: normalizeSafeReference(input?.operatorApprovalRef),
  queueHandoffRef: normalizeSafeReference(input?.queueHandoffRef),
  reconciliationReportRef: normalizeSafeReference(input?.reconciliationReportRef),
  rollbackRunbookRef: normalizeSafeReference(input?.rollbackRunbookRef),
});

const missingEvidenceKeysFor = (
  input: Partial<RewardDistributionHandoffEvidenceInput>,
): string[] => [
  ["fundingProofRef", "CAMPAIGN_OS_REWARD_DISTRIBUTION_FUNDING_PROOF_REF"],
  ["operatorApprovalRef", "CAMPAIGN_OS_REWARD_DISTRIBUTION_OPERATOR_APPROVAL_REF"],
  ["queueHandoffRef", "CAMPAIGN_OS_REWARD_DISTRIBUTION_QUEUE_HANDOFF_REF"],
  ["deadLetterPolicyRef", "CAMPAIGN_OS_REWARD_DISTRIBUTION_DEAD_LETTER_POLICY_REF"],
  ["idempotencyPolicyRef", "CAMPAIGN_OS_REWARD_DISTRIBUTION_IDEMPOTENCY_POLICY_REF"],
  ["reconciliationReportRef", "CAMPAIGN_OS_REWARD_DISTRIBUTION_RECONCILIATION_REF"],
  ["offSwitchRef", "CAMPAIGN_OS_REWARD_DISTRIBUTION_OFF_SWITCH_REF"],
  ["rollbackRunbookRef", "CAMPAIGN_OS_REWARD_DISTRIBUTION_ROLLBACK_RUNBOOK_REF"],
]
  .filter(([field]) => !input[field as keyof RewardDistributionHandoffEvidenceInput])
  .map(([, key]) => key);

const topEvidenceBlocker = (status: RewardDistributionHandoffEvidenceStatus): LocalizedText => {
  if (status === "missing") {
    return text(
      "Reward distribution handoff evidence is missing; keep reward custody, payouts, claims, providers, wallet signing, contracts, queues, schedulers, and workers disabled.",
      "Reward distribution handoff evidence 缺失；继续禁用奖励托管、payout、claim、provider、钱包签名、合约、队列、调度与 worker。",
      "Reward distribution handoff evidence 缺失；繼續禁用獎勵託管、payout、claim、provider、錢包簽名、合約、隊列、排程與 worker。",
    );
  }

  if (status === "partial") {
    return text(
      "Reward distribution handoff evidence is incomplete; review funding proof, approvals, queue, dead-letter, idempotency, reconciliation, off-switch, and rollback references.",
      "Reward distribution handoff evidence 不完整；请审核 funding proof、approval、queue、dead-letter、idempotency、reconciliation、off-switch 与 rollback 引用。",
      "Reward distribution handoff evidence 不完整；請審核 funding proof、approval、queue、dead-letter、idempotency、reconciliation、off-switch 與 rollback 引用。",
    );
  }

  return text(
    "Reward distribution handoff evidence is present for local review; live custody, payouts, claims, providers, wallet signing, contracts, queues, schedulers, and workers remain disabled.",
    "Reward distribution handoff evidence 已可本地审核；真实托管、payout、claim、provider、钱包签名、合约、队列、调度与 worker 仍保持禁用。",
    "Reward distribution handoff evidence 已可本地審核；真實託管、payout、claim、provider、錢包簽名、合約、隊列、排程與 worker 仍保持禁用。",
  );
};

const createExportLinkage = (campaign: CampaignShellDetail): RewardDistributionExportLinkage => {
  const rows = [...campaign.exportPreview.rows].sort(compareExportRows);
  const exportBatchIds = Array.from(new Set(rows.map((row) => row.exportBatchId).filter(Boolean))).sort();
  const evidenceHashes = Array.from(new Set(rows.flatMap((row) => row.evidenceHashes))).sort();

  return {
    campaignId: campaign.exportPreview.campaignId || campaign.id,
    derivedFrom: "seeded_export_preview",
    eligibleRecipientCount: rows.filter((row) => row.eligible).length,
    exportBatchIds,
    exportReadyRecipientCount: rows.filter((row) => row.rowStatus === "ready").length,
    evidenceHashCount: evidenceHashes.length,
    localPreviewOnly: true,
    recipientCount: rows.length,
    riskFlaggedRecipientCount: rows.filter((row) => row.riskFlags.length > 0).length,
    rowStatusCounts: rows.reduce<Record<string, number>>((counts, row) => ({
      ...counts,
      [row.rowStatus]: (counts[row.rowStatus] ?? 0) + 1,
    }), {}),
  };
};

const compareExportRows = (left: ExportPreviewRow, right: ExportPreviewRow): number => {
  const rankDelta = (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER);

  if (rankDelta !== 0) {
    return rankDelta;
  }

  return left.walletAddress.localeCompare(right.walletAddress);
};

const createHandoffItems = (
  handoff: RewardDistributionHandoffEvidence,
  exportLinkage: RewardDistributionExportLinkage,
): RewardDistributionHandoffItem[] => [
  handoffItem(
    "project-owner-funding-proof",
    "Project owner funding proof",
    "项目方资金证明",
    "專案方資金證明",
    "project_owner",
    handoff.fundingProofRef ? "ready" : "blocked",
    "Attach project-owned reward budget proof before any future distribution implementation.",
    "任何未来发奖实现前，先补齐项目方自有奖励预算证明。",
    "任何未來發獎實作前，先補齊專案方自有獎勵預算證明。",
    handoff.fundingProofRef,
  ),
  handoffItem(
    "winner-export-linkage",
    "Winner export linkage",
    "Winner export linkage",
    "Winner export linkage",
    "ai_worker",
    exportLinkage.recipientCount > 0 && exportLinkage.exportBatchIds.length > 0 ? "ready" : "blocked",
    "Use seeded winner export preview rows as review input; do not require or create a real export file.",
    "使用 seeded winner export preview 行作为审核输入；不要求也不创建真实导出文件。",
    "使用 seeded winner export preview 行作為審核輸入；不要求也不建立真實匯出檔案。",
  ),
  handoffItem(
    "recipient-list-integrity",
    "Recipient list integrity",
    "Recipient list 完整性",
    "Recipient list 完整性",
    "legal_reviewer",
    recipientIntegrityState(exportLinkage),
    "Review eligibility, risk flags, evidence hashes, and export-ready rows before treating recipients as stable handoff input.",
    "将 recipients 作为稳定 handoff 输入前，先审核资格、风险标记、evidence hash 与 export-ready 行。",
    "將 recipients 作為穩定 handoff 輸入前，先審核資格、風險標記、evidence hash 與 export-ready 行。",
  ),
  handoffItem(
    "operator-approval",
    "Operator approval",
    "Operator approval",
    "Operator approval",
    "internal_operator",
    handoff.operatorApprovalRef ? "ready" : "blocked",
    "Attach internal operator approval before any reward handoff leaves review-only mode.",
    "任何 reward handoff 离开仅审核模式前，先补齐内部 operator approval。",
    "任何 reward handoff 離開僅審核模式前，先補齊內部 operator approval。",
    handoff.operatorApprovalRef,
  ),
  handoffItem(
    "queue-handoff",
    "Queue handoff",
    "Queue handoff",
    "Queue handoff",
    "internal_operator",
    handoff.queueHandoffRef ? "ready" : "blocked",
    "Review queue ownership, payload shape, retry policy, and consumer boundary without publishing messages.",
    "在不发布消息的前提下审核 queue ownership、payload shape、retry policy 与 consumer boundary。",
    "在不發布訊息的前提下審核 queue ownership、payload shape、retry policy 與 consumer boundary。",
    handoff.queueHandoffRef,
  ),
  handoffItem(
    "dead-letter-policy",
    "Dead-letter policy",
    "Dead-letter policy",
    "Dead-letter policy",
    "internal_operator",
    handoff.deadLetterPolicyRef ? "ready" : "blocked",
    "Define dead-letter triage, replay authority, and alerting before any future queue consumer.",
    "任何未来 queue consumer 前，先定义 dead-letter triage、replay authority 与 alerting。",
    "任何未來 queue consumer 前，先定義 dead-letter triage、replay authority 與 alerting。",
    handoff.deadLetterPolicyRef,
  ),
  handoffItem(
    "idempotency-policy",
    "Idempotency policy",
    "Idempotency policy",
    "Idempotency policy",
    "internal_operator",
    handoff.idempotencyPolicyRef ? "ready" : "blocked",
    "Review idempotency keys and duplicate suppression before enabling any payout or claim workflow.",
    "启用任何 payout 或 claim workflow 前，先审核 idempotency key 与重复抑制策略。",
    "啟用任何 payout 或 claim workflow 前，先審核 idempotency key 與重複抑制策略。",
    handoff.idempotencyPolicyRef,
  ),
  handoffItem(
    "reconciliation-report",
    "Reconciliation report",
    "Reconciliation report",
    "Reconciliation report",
    "finance_reviewer",
    handoff.reconciliationReportRef ? "ready" : "blocked",
    "Attach reconciliation expectations for funded amount, winner rows, attempted payouts, failures, and operator sign-off.",
    "补齐 funded amount、winner rows、attempted payouts、failures 与 operator sign-off 的 reconciliation 预期。",
    "補齊 funded amount、winner rows、attempted payouts、failures 與 operator sign-off 的 reconciliation 預期。",
    handoff.reconciliationReportRef,
  ),
  handoffItem(
    "off-switch",
    "Off-switch",
    "Off-switch",
    "Off-switch",
    "internal_operator",
    handoff.offSwitchRef ? "ready" : "blocked",
    "Confirm a fail-closed off-switch before any future distribution worker can be considered.",
    "考虑任何未来 distribution worker 前，先确认 fail-closed off-switch。",
    "考慮任何未來 distribution worker 前，先確認 fail-closed off-switch。",
    handoff.offSwitchRef,
  ),
  handoffItem(
    "rollback-runbook",
    "Rollback runbook",
    "Rollback runbook",
    "Rollback runbook",
    "internal_operator",
    handoff.rollbackRunbookRef ? "ready" : "blocked",
    "Review rollback, pause, retry, reconciliation correction, and user communication steps.",
    "审核 rollback、pause、retry、reconciliation correction 与用户沟通步骤。",
    "審核 rollback、pause、retry、reconciliation correction 與使用者溝通步驟。",
    handoff.rollbackRunbookRef,
  ),
  handoffItem(
    "no-custody-no-distribution-boundary",
    "No custody and no distribution boundary",
    "无托管/不发奖边界",
    "無託管/不發獎邊界",
    "legal_reviewer",
    "review_required",
    "Confirm UI, API, diagnostics, and handoff copy never imply Campaign OS holds funds or distributes rewards.",
    "确认 UI、API、diagnostics 与 handoff 文案不会暗示 Campaign OS 托管资金或执行发奖。",
    "確認 UI、API、diagnostics 與 handoff 文案不會暗示 Campaign OS 託管資金或執行發獎。",
  ),
];

const recipientIntegrityState = (
  exportLinkage: RewardDistributionExportLinkage,
): RewardDistributionHandoffItemState => {
  if (exportLinkage.recipientCount === 0 || exportLinkage.evidenceHashCount === 0) {
    return "blocked";
  }

  return exportLinkage.riskFlaggedRecipientCount > 0 || exportLinkage.exportReadyRecipientCount < exportLinkage.recipientCount
    ? "review_required"
    : "ready";
};

const handoffItem = (
  id: RewardDistributionHandoffItemId,
  enUSLabel: string,
  zhCNLabel: string,
  zhTWLabel: string,
  ownerRole: RewardDistributionHandoffOwnerRole,
  state: RewardDistributionHandoffItemState,
  enUSNextAction: string,
  zhCNNextAction: string,
  zhTWNextAction: string,
  evidenceRef?: string,
): RewardDistributionHandoffItem => ({
  boundary: handoffItemBoundary,
  ...(evidenceRef ? { evidenceRef } : {}),
  id,
  label: text(enUSLabel, zhCNLabel, zhTWLabel),
  liveExecutionEnabled: false,
  nextAction: text(enUSNextAction, zhCNNextAction, zhTWNextAction),
  ownerRole,
  requiredBeforeProduction: true,
  state,
});

const createRuntimeStatus = (
  handoff: RewardDistributionHandoffEvidence,
  exportLinkage: RewardDistributionExportLinkage,
): RewardDistributionHandoffRuntimeStatus => {
  if (handoff.status === "missing" || handoff.status === "partial" || exportLinkage.recipientCount === 0) {
    return "blocked";
  }

  return "local_ready";
};

const createDiagnosticCodes = (
  handoff: RewardDistributionHandoffEvidence,
  exportLinkage: RewardDistributionExportLinkage,
  items: readonly RewardDistributionHandoffItem[],
): RewardDistributionHandoffDiagnosticCode[] => unique([
  ...(!handoff.fundingProofRef ? ["REWARD_DISTRIBUTION_FUNDING_PROOF_MISSING" as const] : []),
  ...(!handoff.operatorApprovalRef ? ["REWARD_DISTRIBUTION_OPERATOR_APPROVAL_MISSING" as const] : []),
  ...(!handoff.queueHandoffRef ? ["REWARD_DISTRIBUTION_QUEUE_HANDOFF_MISSING" as const] : []),
  ...(!handoff.deadLetterPolicyRef ? ["REWARD_DISTRIBUTION_DEAD_LETTER_POLICY_MISSING" as const] : []),
  ...(!handoff.idempotencyPolicyRef ? ["REWARD_DISTRIBUTION_IDEMPOTENCY_POLICY_MISSING" as const] : []),
  ...(!handoff.reconciliationReportRef ? ["REWARD_DISTRIBUTION_RECONCILIATION_MISSING" as const] : []),
  ...(!handoff.offSwitchRef ? ["REWARD_DISTRIBUTION_OFF_SWITCH_MISSING" as const] : []),
  ...(!handoff.rollbackRunbookRef ? ["REWARD_DISTRIBUTION_ROLLBACK_RUNBOOK_MISSING" as const] : []),
  ...(exportLinkage.recipientCount === 0 ? ["REWARD_DISTRIBUTION_EXPORT_LINKAGE_MISSING" as const] : []),
  ...(items.some((item) => item.id === "recipient-list-integrity" && item.state === "review_required")
    ? ["REWARD_DISTRIBUTION_RECIPIENT_REVIEW_REQUIRED" as const]
    : []),
  "REWARD_DISTRIBUTION_LIVE_EXECUTION_DISABLED" as const,
]);

const createDiagnostic = (
  code: RewardDistributionHandoffDiagnosticCode,
): RewardDistributionHandoffRuntimeDiagnostic => {
  const definitions: Record<RewardDistributionHandoffDiagnosticCode, Omit<RewardDistributionHandoffRuntimeDiagnostic, "code">> = {
    REWARD_DISTRIBUTION_DEAD_LETTER_POLICY_MISSING: {
      field: "evidenceHandoff.deadLetterPolicyRef",
      message: "Reward distribution dead-letter policy reference is missing.",
      severity: "error",
      source: "queue",
    },
    REWARD_DISTRIBUTION_EXPORT_LINKAGE_MISSING: {
      field: "exportLinkage",
      message: "Seeded winner export preview linkage is missing.",
      severity: "error",
      source: "export",
    },
    REWARD_DISTRIBUTION_FUNDING_PROOF_MISSING: {
      field: "evidenceHandoff.fundingProofRef",
      message: "Project owner reward funding proof reference is missing.",
      severity: "error",
      source: "evidence",
    },
    REWARD_DISTRIBUTION_IDEMPOTENCY_POLICY_MISSING: {
      field: "evidenceHandoff.idempotencyPolicyRef",
      message: "Reward distribution idempotency policy reference is missing.",
      severity: "error",
      source: "queue",
    },
    REWARD_DISTRIBUTION_LIVE_EXECUTION_DISABLED: {
      field: "noLiveSideEffects",
      message: "Reward custody, reward distribution, payouts, claims, provider calls, wallet signing, contract writes, queue publishing, scheduler execution, and worker execution are disabled.",
      severity: "info",
      source: "safety",
    },
    REWARD_DISTRIBUTION_OFF_SWITCH_MISSING: {
      field: "evidenceHandoff.offSwitchRef",
      message: "Reward distribution off-switch reference is missing.",
      severity: "error",
      source: "safety",
    },
    REWARD_DISTRIBUTION_OPERATOR_APPROVAL_MISSING: {
      field: "evidenceHandoff.operatorApprovalRef",
      message: "Reward distribution operator approval reference is missing.",
      severity: "error",
      source: "evidence",
    },
    REWARD_DISTRIBUTION_QUEUE_HANDOFF_MISSING: {
      field: "evidenceHandoff.queueHandoffRef",
      message: "Reward distribution queue handoff reference is missing.",
      severity: "error",
      source: "queue",
    },
    REWARD_DISTRIBUTION_RECIPIENT_REVIEW_REQUIRED: {
      field: "exportLinkage",
      message: "Recipient list has risk or not-ready rows that require review before reward handoff.",
      severity: "warning",
      source: "export",
    },
    REWARD_DISTRIBUTION_RECONCILIATION_MISSING: {
      field: "evidenceHandoff.reconciliationReportRef",
      message: "Reward distribution reconciliation report reference is missing.",
      severity: "error",
      source: "reconciliation",
    },
    REWARD_DISTRIBUTION_ROLLBACK_RUNBOOK_MISSING: {
      field: "evidenceHandoff.rollbackRunbookRef",
      message: "Reward distribution rollback runbook reference is missing.",
      severity: "error",
      source: "runtime",
    },
    REWARD_DISTRIBUTION_UNSAFE_DIAGNOSTIC_REDACTED: {
      field: "diagnostics",
      message: "Unsafe reward distribution diagnostic values were redacted before serialization.",
      severity: "warning",
      source: "redaction",
    },
  };

  return { code, ...definitions[code] };
};

const sanitizeDiagnostic = (
  diagnostic: RewardDistributionHandoffRuntimeDiagnostic,
): RewardDistributionHandoffRuntimeDiagnostic => ({
  code: diagnostic.code,
  field: sanitizeRewardDistributionHandoffRuntimeText(diagnostic.field),
  message: sanitizeRewardDistributionHandoffRuntimeText(diagnostic.message),
  safeDetails: diagnostic.safeDetails === undefined
    ? undefined
    : sanitizeRewardDistributionHandoffRuntimeValue(diagnostic.safeDetails),
  severity: diagnostic.severity,
  source: sanitizeRewardDistributionHandoffRuntimeText(diagnostic.source),
});

const createSummary = (
  items: readonly RewardDistributionHandoffItem[],
  handoff: RewardDistributionHandoffEvidence,
  exportLinkage: RewardDistributionExportLinkage,
): RewardDistributionHandoffRuntimeSummary => ({
  blockedItemCount: items.filter((item) => item.state === "blocked").length,
  evidenceHashCount: exportLinkage.evidenceHashCount,
  exportReadyRecipientCount: exportLinkage.exportReadyRecipientCount,
  itemCount: items.length,
  missingEvidenceCount: handoff.missingEvidenceKeys.length,
  readyItemCount: items.filter((item) => item.state === "ready").length,
  recipientCount: exportLinkage.recipientCount,
  reviewRequiredItemCount: items.filter((item) => item.state === "review_required").length,
  topBlocker: handoff.topBlocker,
  topNextAction,
});

export const sanitizeRewardDistributionHandoffRuntimeValue = (value: unknown): unknown => {
  if (value instanceof Error) {
    return "[REDACTED:STACK]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeRewardDistributionHandoffRuntimeValue(item));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue], index) => [
        sanitizeRewardDistributionHandoffRuntimeKey(key, index),
        sanitizeRewardDistributionHandoffRuntimeField(key, nestedValue),
      ]),
    );
  }

  if (typeof value === "string") {
    return sanitizeRewardDistributionHandoffRuntimeText(value);
  }

  return value;
};

export const sanitizeRewardDistributionHandoffRuntimeText = (value: string): string => {
  if (isSafeReference(value)) {
    return value;
  }

  if (isStackTrace(value)) {
    return "[REDACTED:STACK]";
  }

  if (isProviderPayloadDocument(value)) {
    return "[REDACTED:PROVIDER_PAYLOAD]";
  }

  return value
    .replace(signedUrlPattern, "[REDACTED:SIGNED_URL]")
    .replace(endpointPattern, "[REDACTED:ENDPOINT]")
    .replace(providerPayloadPattern, "[REDACTED:PROVIDER_PAYLOAD]")
    .replace(privateKeyPattern, "[REDACTED:PRIVATE_KEY]")
    .replace(walletSignaturePattern, "[REDACTED:WALLET_SIGNATURE]")
    .replace(rewardExecutionRefPattern, "[REDACTED:REWARD_EXECUTION_REF]")
    .replace(credentialPattern, "[REDACTED:CREDENTIAL]");
};

const sanitizeRewardDistributionHandoffRuntimeKey = (key: string, index: number): string => {
  if (/private[-_]?key|mnemonic|seed[-_]?phrase/i.test(key)) {
    return `redactedPrivateKeyField${index}`;
  }

  if (/raw[-_]?signature|wallet[-_]?signature|signature|signed[-_]?payload/i.test(key)) {
    return `redactedWalletSignatureField${index}`;
  }

  if (/provider[-_]?(payload|response|request)|raw[-_]?(payload|body|request|response)/i.test(key)) {
    return `redactedProviderPayloadField${index}`;
  }

  if (/signed[-_]?url|download[-_]?url|endpoint|dsn|host|url/i.test(key)) {
    return `redactedEndpointField${index}`;
  }

  if (/transaction[-_]?id|payout[-_]?id|custody[-_]?id|distribution[-_]?tx|contract[-_]?write|claim[-_]?transaction/i.test(key)) {
    return `redactedRewardExecutionField${index}`;
  }

  if (/credential|authorization|api[-_]?key|bearer|secret|token/i.test(key)) {
    return `redactedCredentialField${index}`;
  }

  return sanitizeRewardDistributionHandoffRuntimeText(key);
};

const sanitizeRewardDistributionHandoffRuntimeField = (key: string, value: unknown): unknown => {
  if (typeof value === "string" && isSafeReference(value)) {
    return value;
  }

  if (/stack/i.test(key)) {
    return "[REDACTED:STACK]";
  }

  if (/private[-_]?key|mnemonic|seed[-_]?phrase/i.test(key)) {
    return "[REDACTED:PRIVATE_KEY]";
  }

  if (/raw[-_]?signature|wallet[-_]?signature|signature|signed[-_]?payload/i.test(key)) {
    return "[REDACTED:WALLET_SIGNATURE]";
  }

  if (/provider[-_]?(payload|response|request)|raw[-_]?(payload|body|request|response)/i.test(key)
    && typeof value === "string") {
    return "[REDACTED:PROVIDER_PAYLOAD]";
  }

  if (/signed[-_]?url|download[-_]?url|endpoint|dsn|host|url/i.test(key)) {
    return "[REDACTED:ENDPOINT]";
  }

  if (/transaction[-_]?id|payout[-_]?id|custody[-_]?id|distribution[-_]?tx|contract[-_]?write|claim[-_]?transaction/i.test(key)) {
    return "[REDACTED:REWARD_EXECUTION_REF]";
  }

  if (/credential|authorization|api[-_]?key|bearer|secret|token/i.test(key)) {
    return "[REDACTED:CREDENTIAL]";
  }

  return sanitizeRewardDistributionHandoffRuntimeValue(value);
};

const normalizeSafeReference = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 && isSafeReference(trimmed) ? trimmed : undefined;
};

const isSafeReference = (value: string) =>
  /^(approval-ref|enablement-ref|evidence-ref|idempotency-ref|policy-ref|queue-ref|reconciliation-ref|runbook-ref):[a-z0-9._:-]+$/i.test(
    value,
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isProviderPayloadDocument = (value: string) =>
  /^\s*(?:raw provider payload|provider[-_ ]?(?:payload|response|request)|raw[-_ ]?(?:payload|request|response))\b/i.test(
    value,
  );

const isStackTrace = (value: string) =>
  /\n\s+at\s+|Error:\s.*\n|^\s*at\s+\S+/i.test(value);

const unique = <T>(values: readonly T[]): T[] => Array.from(new Set(values));

const signedUrlPattern = /https?:\/\/[^"'\s<>]*(?:x-amz-signature|x-goog-signature|signature=|signed=)[^"'\s<>]*|\bsigned[-_ ]?url\b/gi;
const endpointPattern = /https?:\/\/[^"'\s<>]+/gi;
const providerPayloadPattern = /\bprovider[-_ ]?(?:payload|response|request)\b|\braw[-_ ]?(?:payload|request|response)\b|\braw provider payload\b/gi;
const privateKeyPattern = /\bprivate[-_ ]?key\b|\bmnemonic\b|\bseed[-_ ]?phrase\b/gi;
const credentialPattern = /\bapi[-_]?key\b|\bbearer\s+[^\s,.]+|\bcredential=[^\s,.]+|\bplain-secret[^\s,.]*|\bsecret[^\s,.]*|\btoken=[^\s,.]+|\baccess[-_]?token\b|\brefresh[-_]?token\b/gi;
const walletSignaturePattern = /\braw[-_]?signature\b|\bwallet[-_]?signature\b|\bwallet-signature\b|\bsigned[-_]?payload\b|\bsignature\b/gi;
const rewardExecutionRefPattern = /\btransaction[-_ ]?id\b\s*[^\s,.]*|\bpayout[-_ ]?id\b\s*[^\s,.]*|\bcustody[-_ ]?id\b\s*[^\s,.]*|\bdistribution[-_ ]?tx\b\s*[^\s,.]*|\bclaim[-_ ]?transaction\b\s*[^\s,.]*|\bcontract[-_ ]?write\b\s*[^\s,.]*|\bpayout-[a-z0-9._:-]+|\bcustody-[a-z0-9._:-]+|\bdistribution-tx-[a-z0-9._:-]+|\btransaction-[a-z0-9._:-]+|\bclaim-transaction-[a-z0-9._:-]+/gi;
