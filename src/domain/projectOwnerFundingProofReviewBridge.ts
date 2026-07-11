import type { CampaignShellDetail, LocalizedText } from "./types";

const text = (enUS: string, zhCN: string, zhTW = enUS): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
});

export type ProjectOwnerFundingProofSource = "seeded_runtime" | "server_runtime";
export type ProjectOwnerFundingProofStatus = "blocked" | "review_required" | "local_ready";
export type ProjectOwnerFundingProofPackageStatus = "missing" | "partial" | "ready_disabled";
export type ProjectOwnerFundingProofItemState = "blocked" | "review_required" | "ready";
export type ProjectOwnerFundingProofSubmittedByRole = "internal_operator" | "project_owner" | "system_seed";
export type ProjectOwnerFundingProofReviewState =
  | "accepted_for_handoff"
  | "in_review"
  | "missing"
  | "submitted";
export type ProjectOwnerFundingProofOwnerRole =
  | "finance_reviewer"
  | "internal_operator"
  | "legal_reviewer"
  | "project_owner";
export type ProjectOwnerFundingProofRisk = "high" | "low" | "medium";
export type ProjectOwnerFundingProofDiagnosticSeverity = "error" | "info" | "warning";
export type ProjectOwnerFundingProofDiagnosticSource =
  | "boundary"
  | "evidence"
  | "export"
  | "redaction"
  | "runtime"
  | "safety"
  | (string & {});
export type ProjectOwnerFundingProofDiagnosticCode =
  | "PROJECT_OWNER_FUNDING_PROOF_AMOUNT_SUMMARY_MISSING"
  | "PROJECT_OWNER_FUNDING_PROOF_DISCLAIMER_SIGNOFF_MISSING"
  | "PROJECT_OWNER_FUNDING_PROOF_EXPORT_LINKAGE_MISSING"
  | "PROJECT_OWNER_FUNDING_PROOF_FINANCE_REVIEW_MISSING"
  | "PROJECT_OWNER_FUNDING_PROOF_LIVE_EXECUTION_DISABLED"
  | "PROJECT_OWNER_FUNDING_PROOF_OPERATOR_REVIEW_MISSING"
  | "PROJECT_OWNER_FUNDING_PROOF_PROVIDER_STATEMENT_MISSING"
  | "PROJECT_OWNER_FUNDING_PROOF_RECIPIENT_HASH_MISSING"
  | "PROJECT_OWNER_FUNDING_PROOF_REFERENCE_MISSING"
  | "PROJECT_OWNER_FUNDING_PROOF_UNSAFE_DIAGNOSTIC_REDACTED";

export type ProjectOwnerFundingProofItemId = (typeof projectOwnerFundingProofReviewItemIds)[number];

export interface ProjectOwnerFundingProofDiagnostic {
  code: ProjectOwnerFundingProofDiagnosticCode;
  field: string;
  message: string;
  safeDetails?: unknown;
  severity: ProjectOwnerFundingProofDiagnosticSeverity;
  source: ProjectOwnerFundingProofDiagnosticSource;
}

export interface ProjectOwnerFundingProofPackageInput extends Record<string, unknown> {
  amountSummaryRef?: string;
  disclaimerSignoffRef?: string;
  exportBatchId?: string;
  financeReviewRef?: string;
  operatorReviewRef?: string;
  proofReference?: string;
  recipientListHashRef?: string;
  reviewState?: ProjectOwnerFundingProofReviewState;
  rewardProviderStatementRef?: string;
  submittedByRole?: ProjectOwnerFundingProofSubmittedByRole;
}

export interface ProjectOwnerFundingProofPackage {
  amountSummaryRef?: string;
  disclaimerSignoffRef?: string;
  exportBatchId?: string;
  financeReviewRef?: string;
  missingEvidenceKeys: readonly string[];
  operatorReviewRef?: string;
  productionReady: false;
  proofReference?: string;
  recipientListHashRef?: string;
  requiredEvidenceKeys: readonly string[];
  reviewState: ProjectOwnerFundingProofReviewState;
  rewardProviderStatementRef?: string;
  status: ProjectOwnerFundingProofPackageStatus;
  submittedByRole: ProjectOwnerFundingProofSubmittedByRole;
  topBlocker: LocalizedText;
}

export interface ProjectOwnerFundingProofItem {
  boundary: LocalizedText;
  evidenceKey: ProjectOwnerFundingProofEvidenceKey;
  evidenceRef?: string;
  id: ProjectOwnerFundingProofItemId;
  label: LocalizedText;
  liveExecutionEnabled: false;
  nextAction: LocalizedText;
  ownerRole: ProjectOwnerFundingProofOwnerRole;
  requiredBeforeProduction: true;
  risk: ProjectOwnerFundingProofRisk;
  state: ProjectOwnerFundingProofItemState;
}

export interface ProjectOwnerFundingProofSafetyFlags {
  liveContractWrite: false;
  liveFundingTransfer: false;
  liveObjectStorageWrite: false;
  liveProviderCall: false;
  liveQueuePublishing: false;
  liveRewardCustody: false;
  liveRewardDistribution: false;
  liveSchedulerExecution: false;
  liveWalletSignature: false;
  liveWorkerExecution: false;
}

export interface ProjectOwnerFundingProofSummary {
  blockedItemCount: number;
  exportBatchId?: string;
  readyItemCount: number;
  requiredItemCount: number;
  reviewRequiredItemCount: number;
  status: ProjectOwnerFundingProofStatus;
  topBlocker: LocalizedText;
  topNextAction: LocalizedText;
}

export interface CreateProjectOwnerFundingProofReviewBridgeOptions {
  campaign: CampaignShellDetail;
  diagnostics?: readonly ProjectOwnerFundingProofDiagnostic[];
  proofPackage?: ProjectOwnerFundingProofPackageInput;
  source?: ProjectOwnerFundingProofSource;
  traceId?: string;
}

export interface ProjectOwnerFundingProofReviewBridge {
  boundary: LocalizedText;
  campaignId: string;
  diagnosticCodes: readonly ProjectOwnerFundingProofDiagnosticCode[];
  diagnostics: readonly ProjectOwnerFundingProofDiagnostic[];
  items: readonly ProjectOwnerFundingProofItem[];
  productionReady: false;
  proofPackage: ProjectOwnerFundingProofPackage;
  requiredEvidenceKeys: readonly ProjectOwnerFundingProofEvidenceKey[];
  safety: ProjectOwnerFundingProofSafetyFlags;
  source: ProjectOwnerFundingProofSource;
  status: ProjectOwnerFundingProofStatus;
  summary: ProjectOwnerFundingProofSummary;
  traceId?: string;
  valid: true;
}

export const projectOwnerFundingProofReviewItemIds = [
  "funding-proof-reference",
  "reward-provider-statement",
  "amount-currency-summary",
  "export-batch-linkage",
  "recipient-list-integrity",
  "reward-disclaimer-signoff",
  "finance-review",
  "operator-review",
] as const;

export const projectOwnerFundingProofRequiredEvidenceKeys = [
  "CAMPAIGN_OS_REWARD_FUNDING_PROOF_REF",
  "CAMPAIGN_OS_REWARD_PROVIDER_STATEMENT_REF",
  "CAMPAIGN_OS_REWARD_AMOUNT_SUMMARY_REF",
  "CAMPAIGN_OS_REWARD_EXPORT_BATCH_REF",
  "CAMPAIGN_OS_REWARD_RECIPIENT_LIST_HASH_REF",
  "CAMPAIGN_OS_REWARD_DISCLAIMER_SIGNOFF_REF",
  "CAMPAIGN_OS_REWARD_FINANCE_REVIEW_REF",
  "CAMPAIGN_OS_REWARD_OPERATOR_REVIEW_REF",
] as const;

export type ProjectOwnerFundingProofEvidenceKey = (typeof projectOwnerFundingProofRequiredEvidenceKeys)[number];

export const projectOwnerFundingProofSafetyFlags: ProjectOwnerFundingProofSafetyFlags = {
  liveContractWrite: false,
  liveFundingTransfer: false,
  liveObjectStorageWrite: false,
  liveProviderCall: false,
  liveQueuePublishing: false,
  liveRewardCustody: false,
  liveRewardDistribution: false,
  liveSchedulerExecution: false,
  liveWalletSignature: false,
  liveWorkerExecution: false,
};

export const projectOwnerFundingProofBoundary = text(
  "Local review-only funding proof bridge. No reward custody, reward distribution, funding transfer, payout, claim, provider call, wallet signature, contract write, object storage write, queue publishing, scheduler execution, or worker execution is performed.",
  "仅本地、仅审核的资金证明 bridge。不会执行奖励托管、发奖、资金转移、payout、claim、provider 调用、钱包签名、合约写入、对象存储写入、队列发布、调度执行或 worker 执行。",
  "僅本地、僅審核的資金證明 bridge。不會執行獎勵託管、發獎、資金轉移、payout、claim、provider 呼叫、錢包簽名、合約寫入、物件儲存寫入、隊列發布、排程執行或 worker 執行。",
);

const itemBoundary = text(
  "Review-only funding proof prerequisite. It records safe metadata references without uploading files, storing objects, verifying funds, custodying rewards, or distributing rewards.",
  "仅审核资金证明前置项。这里只记录安全 metadata 引用，不上传文件、不存储对象、不验证真实资金、不托管奖励、不发奖。",
  "僅審核資金證明前置項。这里只記錄安全 metadata 引用，不上傳檔案、不儲存物件、不驗證真實資金、不託管獎勵、不發獎。",
);

const topNextAction = text(
  "Review proof reference, provider statement, amount summary, export linkage, recipient integrity, disclaimer signoff, finance review, and operator review before any future reward distribution implementation.",
  "任何未来 reward distribution 实现前，请审核资金证明引用、provider statement、金额摘要、export linkage、recipient 完整性、disclaimer signoff、finance review 与 operator review。",
  "任何未來 reward distribution 實作前，請審核資金證明引用、provider statement、金額摘要、export linkage、recipient 完整性、disclaimer signoff、finance review 與 operator review。",
);

export const createProjectOwnerFundingProofReviewBridge = ({
  campaign,
  diagnostics = [],
  proofPackage,
  source = "seeded_runtime",
  traceId,
}: CreateProjectOwnerFundingProofReviewBridgeOptions): ProjectOwnerFundingProofReviewBridge => {
  const normalizedPackage = createProofPackage(proofPackage);
  const items = createItems(normalizedPackage);
  const status = createStatus(normalizedPackage);
  const diagnosticCodes = createDiagnosticCodes(normalizedPackage);
  const baseDiagnostics = diagnosticCodes.map(createDiagnostic);

  return {
    boundary: projectOwnerFundingProofBoundary,
    campaignId: campaign.id,
    diagnosticCodes,
    diagnostics: [
      ...baseDiagnostics,
      ...diagnostics.map(sanitizeDiagnostic),
    ],
    items,
    productionReady: false,
    proofPackage: normalizedPackage,
    requiredEvidenceKeys: projectOwnerFundingProofRequiredEvidenceKeys,
    safety: projectOwnerFundingProofSafetyFlags,
    source,
    status,
    summary: createSummary(items, normalizedPackage, status),
    ...(traceId ? { traceId: sanitizeProjectOwnerFundingProofReviewText(traceId) } : {}),
    valid: true,
  };
};

const createProofPackage = (
  input: ProjectOwnerFundingProofPackageInput | undefined,
): ProjectOwnerFundingProofPackage => {
  const safeInput = sanitizeProofPackageInput(input);
  const missingEvidenceKeys = missingEvidenceKeysFor(safeInput);
  const hasAnyEvidence = proofReferenceFields.some((field) => Boolean(safeInput[field]));
  const status: ProjectOwnerFundingProofPackageStatus = !hasAnyEvidence
    ? "missing"
    : missingEvidenceKeys.length > 0
      ? "partial"
      : "ready_disabled";

  return {
    ...safeInput,
    missingEvidenceKeys,
    productionReady: false,
    requiredEvidenceKeys: projectOwnerFundingProofRequiredEvidenceKeys,
    reviewState: normalizeReviewState(input?.reviewState, status),
    status,
    submittedByRole: normalizeSubmittedByRole(input?.submittedByRole),
    topBlocker: topPackageBlocker(status),
  };
};

const proofReferenceFields = [
  "proofReference",
  "rewardProviderStatementRef",
  "amountSummaryRef",
  "exportBatchId",
  "recipientListHashRef",
  "disclaimerSignoffRef",
  "financeReviewRef",
  "operatorReviewRef",
] as const satisfies readonly (keyof ProjectOwnerFundingProofPackageInput)[];

const sanitizeProofPackageInput = (
  input: ProjectOwnerFundingProofPackageInput | undefined,
): Partial<ProjectOwnerFundingProofPackageInput> => ({
  amountSummaryRef: normalizeSafeReference(input?.amountSummaryRef),
  disclaimerSignoffRef: normalizeSafeReference(input?.disclaimerSignoffRef),
  exportBatchId: normalizeSafeReference(input?.exportBatchId),
  financeReviewRef: normalizeSafeReference(input?.financeReviewRef),
  operatorReviewRef: normalizeSafeReference(input?.operatorReviewRef),
  proofReference: normalizeSafeReference(input?.proofReference),
  recipientListHashRef: normalizeSafeReference(input?.recipientListHashRef),
  rewardProviderStatementRef: normalizeSafeReference(input?.rewardProviderStatementRef),
});

const missingEvidenceKeysFor = (
  input: Partial<ProjectOwnerFundingProofPackageInput>,
): ProjectOwnerFundingProofEvidenceKey[] => [
  ["proofReference", "CAMPAIGN_OS_REWARD_FUNDING_PROOF_REF"],
  ["rewardProviderStatementRef", "CAMPAIGN_OS_REWARD_PROVIDER_STATEMENT_REF"],
  ["amountSummaryRef", "CAMPAIGN_OS_REWARD_AMOUNT_SUMMARY_REF"],
  ["exportBatchId", "CAMPAIGN_OS_REWARD_EXPORT_BATCH_REF"],
  ["recipientListHashRef", "CAMPAIGN_OS_REWARD_RECIPIENT_LIST_HASH_REF"],
  ["disclaimerSignoffRef", "CAMPAIGN_OS_REWARD_DISCLAIMER_SIGNOFF_REF"],
  ["financeReviewRef", "CAMPAIGN_OS_REWARD_FINANCE_REVIEW_REF"],
  ["operatorReviewRef", "CAMPAIGN_OS_REWARD_OPERATOR_REVIEW_REF"],
]
  .filter(([field]) => !input[field as keyof ProjectOwnerFundingProofPackageInput])
  .map(([, key]) => key as ProjectOwnerFundingProofEvidenceKey);

const normalizeReviewState = (
  state: ProjectOwnerFundingProofReviewState | undefined,
  status: ProjectOwnerFundingProofPackageStatus,
): ProjectOwnerFundingProofReviewState => {
  if (state === "accepted_for_handoff" || state === "in_review" || state === "submitted") {
    return state;
  }

  if (status === "ready_disabled") {
    return "in_review";
  }

  return status === "missing" ? "missing" : "submitted";
};

const normalizeSubmittedByRole = (
  role: ProjectOwnerFundingProofSubmittedByRole | undefined,
): ProjectOwnerFundingProofSubmittedByRole => (
  role === "internal_operator" || role === "project_owner" ? role : "system_seed"
);

const topPackageBlocker = (status: ProjectOwnerFundingProofPackageStatus): LocalizedText => {
  if (status === "missing") {
    return text(
      "Project owner funding proof metadata is missing; keep reward custody, distribution, funding transfer, storage upload, wallet signing, contract writes, providers, queues, schedulers, and workers disabled.",
      "项目方资金证明 metadata 缺失；继续禁用奖励托管、发奖、资金转移、存储上传、钱包签名、合约写入、provider、队列、调度与 worker。",
      "專案方資金證明 metadata 缺失；繼續禁用獎勵託管、發獎、資金轉移、儲存上傳、錢包簽名、合約寫入、provider、隊列、排程與 worker。",
    );
  }

  if (status === "partial") {
    return text(
      "Funding proof metadata is incomplete; review proof reference, provider statement, amount summary, export linkage, recipient hash, disclaimer, finance, and operator references.",
      "Funding proof metadata 不完整；请审核 proof reference、provider statement、金额摘要、export linkage、recipient hash、disclaimer、finance 与 operator 引用。",
      "Funding proof metadata 不完整；請審核 proof reference、provider statement、金額摘要、export linkage、recipient hash、disclaimer、finance 與 operator 引用。",
    );
  }

  return text(
    "Funding proof metadata is present for local review; live funding transfer, custody, distribution, storage upload, providers, wallet signing, contracts, queues, schedulers, and workers remain disabled.",
    "Funding proof metadata 已可本地审核；真实资金转移、托管、发奖、存储上传、provider、钱包签名、合约、队列、调度与 worker 仍保持禁用。",
    "Funding proof metadata 已可本地審核；真實資金轉移、託管、發獎、儲存上傳、provider、錢包簽名、合約、隊列、排程與 worker 仍保持禁用。",
  );
};

const createItems = (
  proofPackage: ProjectOwnerFundingProofPackage,
): ProjectOwnerFundingProofItem[] => [
  item(
    "funding-proof-reference",
    "CAMPAIGN_OS_REWARD_FUNDING_PROOF_REF",
    "Funding proof reference",
    "资金证明引用",
    "資金證明引用",
    "project_owner",
    proofPackage.proofReference ? "ready" : "blocked",
    "Attach a safe project-owned funding proof reference, not a file upload or signed URL.",
    "补齐安全的项目方资金证明引用，不上传文件，也不使用 signed URL。",
    "補齊安全的專案方資金證明引用，不上傳檔案，也不使用 signed URL。",
    "high",
    proofPackage.proofReference,
  ),
  item(
    "reward-provider-statement",
    "CAMPAIGN_OS_REWARD_PROVIDER_STATEMENT_REF",
    "Reward provider statement",
    "奖励提供方声明",
    "獎勵提供方聲明",
    "project_owner",
    proofPackage.rewardProviderStatementRef ? "ready" : "blocked",
    "Confirm rewards are project-owned or partner-owned and not described as automatic aelf funding.",
    "确认奖励由项目方或合作方负责，不描述为 aelf 自动出资。",
    "確認獎勵由專案方或合作方負責，不描述為 aelf 自動出資。",
    "high",
    proofPackage.rewardProviderStatementRef,
  ),
  item(
    "amount-currency-summary",
    "CAMPAIGN_OS_REWARD_AMOUNT_SUMMARY_REF",
    "Amount and currency summary",
    "金额与币种摘要",
    "金額與幣種摘要",
    "finance_reviewer",
    proofPackage.amountSummaryRef ? "ready" : "blocked",
    "Attach a safe amount/currency summary reference for finance review.",
    "补齐供 finance review 使用的安全金额/币种摘要引用。",
    "補齊供 finance review 使用的安全金額/幣種摘要引用。",
    "medium",
    proofPackage.amountSummaryRef,
  ),
  item(
    "export-batch-linkage",
    "CAMPAIGN_OS_REWARD_EXPORT_BATCH_REF",
    "Export batch linkage",
    "Export batch 关联",
    "Export batch 關聯",
    "internal_operator",
    proofPackage.exportBatchId ? "ready" : "blocked",
    "Link the funding proof review to a winner export batch; export remains review input only.",
    "将资金证明审核关联到 winner export batch；export 仍只是审核输入。",
    "將資金證明審核關聯到 winner export batch；export 仍只是審核輸入。",
    "high",
    proofPackage.exportBatchId,
  ),
  item(
    "recipient-list-integrity",
    "CAMPAIGN_OS_REWARD_RECIPIENT_LIST_HASH_REF",
    "Recipient list integrity",
    "Recipient list 完整性",
    "Recipient list 完整性",
    "internal_operator",
    proofPackage.recipientListHashRef ? "ready" : "blocked",
    "Attach a safe recipient list hash reference before the proof package can be handed off.",
    "proof package 可交接前，先补齐安全的 recipient list hash 引用。",
    "proof package 可交接前，先補齊安全的 recipient list hash 引用。",
    "high",
    proofPackage.recipientListHashRef,
  ),
  item(
    "reward-disclaimer-signoff",
    "CAMPAIGN_OS_REWARD_DISCLAIMER_SIGNOFF_REF",
    "Reward disclaimer signoff",
    "奖励免责声明签核",
    "獎勵免責聲明簽核",
    "legal_reviewer",
    proofPackage.disclaimerSignoffRef ? "ready" : "blocked",
    "Confirm reward disclaimer copy is reviewed before funding proof handoff.",
    "资金证明交接前，确认奖励免责声明文案已审核。",
    "資金證明交接前，確認獎勵免責聲明文案已審核。",
    "medium",
    proofPackage.disclaimerSignoffRef,
  ),
  item(
    "finance-review",
    "CAMPAIGN_OS_REWARD_FINANCE_REVIEW_REF",
    "Finance review",
    "Finance review",
    "Finance review",
    "finance_reviewer",
    proofPackage.financeReviewRef ? "ready" : "blocked",
    "Record finance reviewer handoff before any production funding flow is considered.",
    "考虑任何生产 funding flow 前，先记录 finance reviewer handoff。",
    "考慮任何生產 funding flow 前，先記錄 finance reviewer handoff。",
    "high",
    proofPackage.financeReviewRef,
  ),
  item(
    "operator-review",
    "CAMPAIGN_OS_REWARD_OPERATOR_REVIEW_REF",
    "Operator review",
    "Operator review",
    "Operator review",
    "internal_operator",
    proofPackage.operatorReviewRef ? "review_required" : "blocked",
    "Operator review remains manual even when metadata exists; do not approve payout or distribution here.",
    "即使 metadata 已存在，operator review 仍需人工审核；这里不批准 payout 或发奖。",
    "即使 metadata 已存在，operator review 仍需人工審核；這裡不批准 payout 或發獎。",
    "high",
    proofPackage.operatorReviewRef,
  ),
];

const item = (
  id: ProjectOwnerFundingProofItemId,
  evidenceKey: ProjectOwnerFundingProofEvidenceKey,
  enUSLabel: string,
  zhCNLabel: string,
  zhTWLabel: string,
  ownerRole: ProjectOwnerFundingProofOwnerRole,
  state: ProjectOwnerFundingProofItemState,
  enUSNextAction: string,
  zhCNNextAction: string,
  zhTWNextAction: string,
  risk: ProjectOwnerFundingProofRisk,
  evidenceRef?: string,
): ProjectOwnerFundingProofItem => ({
  boundary: itemBoundary,
  evidenceKey,
  ...(evidenceRef ? { evidenceRef } : {}),
  id,
  label: text(enUSLabel, zhCNLabel, zhTWLabel),
  liveExecutionEnabled: false,
  nextAction: text(enUSNextAction, zhCNNextAction, zhTWNextAction),
  ownerRole,
  requiredBeforeProduction: true,
  risk,
  state,
});

const createStatus = (
  proofPackage: ProjectOwnerFundingProofPackage,
): ProjectOwnerFundingProofStatus => {
  if (proofPackage.status === "missing" || proofPackage.status === "partial") {
    return "blocked";
  }

  return "local_ready";
};

const createSummary = (
  items: readonly ProjectOwnerFundingProofItem[],
  proofPackage: ProjectOwnerFundingProofPackage,
  status: ProjectOwnerFundingProofStatus,
): ProjectOwnerFundingProofSummary => ({
  blockedItemCount: items.filter((item) => item.state === "blocked").length,
  ...(proofPackage.exportBatchId ? { exportBatchId: proofPackage.exportBatchId } : {}),
  readyItemCount: items.filter((item) => item.state === "ready").length,
  requiredItemCount: items.length,
  reviewRequiredItemCount: items.filter((item) => item.state === "review_required").length,
  status,
  topBlocker: proofPackage.topBlocker,
  topNextAction,
});

const createDiagnosticCodes = (
  proofPackage: ProjectOwnerFundingProofPackage,
): ProjectOwnerFundingProofDiagnosticCode[] => unique([
  ...(!proofPackage.proofReference ? ["PROJECT_OWNER_FUNDING_PROOF_REFERENCE_MISSING" as const] : []),
  ...(!proofPackage.rewardProviderStatementRef ? ["PROJECT_OWNER_FUNDING_PROOF_PROVIDER_STATEMENT_MISSING" as const] : []),
  ...(!proofPackage.amountSummaryRef ? ["PROJECT_OWNER_FUNDING_PROOF_AMOUNT_SUMMARY_MISSING" as const] : []),
  ...(!proofPackage.exportBatchId ? ["PROJECT_OWNER_FUNDING_PROOF_EXPORT_LINKAGE_MISSING" as const] : []),
  ...(!proofPackage.recipientListHashRef ? ["PROJECT_OWNER_FUNDING_PROOF_RECIPIENT_HASH_MISSING" as const] : []),
  ...(!proofPackage.disclaimerSignoffRef ? ["PROJECT_OWNER_FUNDING_PROOF_DISCLAIMER_SIGNOFF_MISSING" as const] : []),
  ...(!proofPackage.financeReviewRef ? ["PROJECT_OWNER_FUNDING_PROOF_FINANCE_REVIEW_MISSING" as const] : []),
  ...(!proofPackage.operatorReviewRef ? ["PROJECT_OWNER_FUNDING_PROOF_OPERATOR_REVIEW_MISSING" as const] : []),
  "PROJECT_OWNER_FUNDING_PROOF_LIVE_EXECUTION_DISABLED" as const,
]);

const createDiagnostic = (
  code: ProjectOwnerFundingProofDiagnosticCode,
): ProjectOwnerFundingProofDiagnostic => {
  const definitions: Record<ProjectOwnerFundingProofDiagnosticCode, Omit<ProjectOwnerFundingProofDiagnostic, "code">> = {
    PROJECT_OWNER_FUNDING_PROOF_AMOUNT_SUMMARY_MISSING: {
      field: "proofPackage.amountSummaryRef",
      message: "Reward amount and currency summary reference is missing.",
      severity: "error",
      source: "evidence",
    },
    PROJECT_OWNER_FUNDING_PROOF_DISCLAIMER_SIGNOFF_MISSING: {
      field: "proofPackage.disclaimerSignoffRef",
      message: "Reward disclaimer signoff reference is missing.",
      severity: "error",
      source: "evidence",
    },
    PROJECT_OWNER_FUNDING_PROOF_EXPORT_LINKAGE_MISSING: {
      field: "proofPackage.exportBatchId",
      message: "Winner export batch linkage is missing.",
      severity: "error",
      source: "export",
    },
    PROJECT_OWNER_FUNDING_PROOF_FINANCE_REVIEW_MISSING: {
      field: "proofPackage.financeReviewRef",
      message: "Finance review reference is missing.",
      severity: "error",
      source: "evidence",
    },
    PROJECT_OWNER_FUNDING_PROOF_LIVE_EXECUTION_DISABLED: {
      field: "safety",
      message: "Funding transfer, reward custody, reward distribution, storage upload, provider calls, wallet signing, contract writes, queue publishing, scheduler execution, and worker execution are disabled.",
      severity: "info",
      source: "safety",
    },
    PROJECT_OWNER_FUNDING_PROOF_OPERATOR_REVIEW_MISSING: {
      field: "proofPackage.operatorReviewRef",
      message: "Internal operator review reference is missing.",
      severity: "error",
      source: "evidence",
    },
    PROJECT_OWNER_FUNDING_PROOF_PROVIDER_STATEMENT_MISSING: {
      field: "proofPackage.rewardProviderStatementRef",
      message: "Project-owned reward provider statement reference is missing.",
      severity: "error",
      source: "evidence",
    },
    PROJECT_OWNER_FUNDING_PROOF_RECIPIENT_HASH_MISSING: {
      field: "proofPackage.recipientListHashRef",
      message: "Recipient list integrity hash reference is missing.",
      severity: "error",
      source: "export",
    },
    PROJECT_OWNER_FUNDING_PROOF_REFERENCE_MISSING: {
      field: "proofPackage.proofReference",
      message: "Project owner reward funding proof reference is missing.",
      severity: "error",
      source: "evidence",
    },
    PROJECT_OWNER_FUNDING_PROOF_UNSAFE_DIAGNOSTIC_REDACTED: {
      field: "diagnostics",
      message: "Unsafe funding proof diagnostic fields were redacted.",
      severity: "warning",
      source: "redaction",
    },
  };

  return {
    code,
    ...definitions[code],
  };
};

const sanitizeDiagnostic = (
  diagnostic: ProjectOwnerFundingProofDiagnostic,
): ProjectOwnerFundingProofDiagnostic => ({
  code: diagnostic.code,
  field: sanitizeProjectOwnerFundingProofReviewText(diagnostic.field),
  message: sanitizeProjectOwnerFundingProofReviewText(diagnostic.message),
  ...(diagnostic.safeDetails === undefined ? {} : {
    safeDetails: sanitizeProjectOwnerFundingProofReviewValue(diagnostic.safeDetails),
  }),
  severity: diagnostic.severity,
  source: sanitizeProjectOwnerFundingProofReviewText(diagnostic.source) as ProjectOwnerFundingProofDiagnosticSource,
});

const normalizeSafeReference = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = sanitizeProjectOwnerFundingProofReviewText(value.trim());

  if (!normalized || normalized.includes("[REDACTED:")) {
    return undefined;
  }

  return normalized;
};

export const sanitizeProjectOwnerFundingProofReviewValue = (value: unknown): unknown => {
  if (typeof value === "string") {
    return sanitizeProjectOwnerFundingProofReviewText(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeProjectOwnerFundingProofReviewValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entryValue], index) => {
        const redaction = redactionForKeyOrValue(key, entryValue);

        if (redaction) {
          return [redactedKeyFor(key, redaction, index), redaction];
        }

        return [key, sanitizeProjectOwnerFundingProofReviewValue(entryValue)];
      }),
    );
  }

  return value;
};

export const sanitizeProjectOwnerFundingProofReviewText = (value: string): string => {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (containsPrivateKey(trimmed)) {
    return "[REDACTED:PRIVATE_KEY]";
  }

  if (containsWalletSignature(trimmed)) {
    return "[REDACTED:WALLET_SIGNATURE]";
  }

  if (containsProviderPayload(trimmed)) {
    return "[REDACTED:PROVIDER_PAYLOAD]";
  }

  if (containsRewardExecutionReference(trimmed)) {
    return "[REDACTED:REWARD_EXECUTION_REF]";
  }

  if (containsEndpoint(trimmed)) {
    return "[REDACTED:ENDPOINT]";
  }

  if (containsCredential(trimmed)) {
    return "[REDACTED:CREDENTIAL]";
  }

  return trimmed;
};

const redactionForKeyOrValue = (key: string, value: unknown): string | undefined => {
  if (containsProviderPayload(key) || containsProviderPayloadValue(value)) {
    return "[REDACTED:PROVIDER_PAYLOAD]";
  }

  if (containsPrivateKey(key) || containsPrivateKeyValue(value)) {
    return "[REDACTED:PRIVATE_KEY]";
  }

  if (containsWalletSignature(key) || containsWalletSignatureValue(value)) {
    return "[REDACTED:WALLET_SIGNATURE]";
  }

  if (containsRewardExecutionReference(key) || containsRewardExecutionReferenceValue(value)) {
    return "[REDACTED:REWARD_EXECUTION_REF]";
  }

  if (containsEndpoint(key) || containsEndpointValue(value)) {
    return "[REDACTED:ENDPOINT]";
  }

  if (containsCredential(key) || containsCredentialValue(value)) {
    return "[REDACTED:CREDENTIAL]";
  }

  return undefined;
};

const redactedKeyFor = (key: string, redaction: string, index: number): string => {
  const suffix = `Field${index}`;

  if (redaction === "[REDACTED:PROVIDER_PAYLOAD]") {
    return `redactedProviderPayload${suffix}`;
  }

  if (redaction === "[REDACTED:PRIVATE_KEY]") {
    return `redactedPrivateKey${suffix}`;
  }

  if (redaction === "[REDACTED:WALLET_SIGNATURE]") {
    return `redactedWalletSignature${suffix}`;
  }

  if (redaction === "[REDACTED:REWARD_EXECUTION_REF]") {
    return `redactedRewardExecution${suffix}`;
  }

  if (redaction === "[REDACTED:ENDPOINT]") {
    return `redactedEndpoint${suffix}`;
  }

  if (redaction === "[REDACTED:CREDENTIAL]") {
    return `redactedCredential${suffix}`;
  }

  return `redacted${key.charAt(0).toUpperCase()}${key.slice(1)}${suffix}`;
};

const containsProviderPayloadValue = (value: unknown): boolean => (
  typeof value === "string" && containsProviderPayload(value)
);

const containsPrivateKeyValue = (value: unknown): boolean => (
  typeof value === "string" && containsPrivateKey(value)
);

const containsWalletSignatureValue = (value: unknown): boolean => (
  typeof value === "string" && containsWalletSignature(value)
);

const containsRewardExecutionReferenceValue = (value: unknown): boolean => (
  typeof value === "string" && containsRewardExecutionReference(value)
);

const containsEndpointValue = (value: unknown): boolean => (
  typeof value === "string" && containsEndpoint(value)
);

const containsCredentialValue = (value: unknown): boolean => (
  typeof value === "string" && containsCredential(value)
);

const containsProviderPayload = (value: string): boolean => /providerpayload|provider payload|raw provider/i.test(value);
const containsPrivateKey = (value: string): boolean => /privatekey|private key|seedphrase|seed phrase/i.test(value);
const containsWalletSignature = (value: string): boolean => /walletsignature|wallet-signature|signature/i.test(value);
const containsRewardExecutionReference = (value: string): boolean => (
  /payoutid|payout-|payout id|custodyid|custody-|custody id|distributiontx|distribution-tx|transactionid|transaction-|transaction id/i
    .test(value)
);
const containsEndpoint = (value: string): boolean => /https?:\/\/|signedurl|signed url/i.test(value);
const containsCredential = (value: string): boolean => /bearer|token|secret|password/i.test(value);

const unique = <T>(values: readonly T[]): T[] => Array.from(new Set(values));
