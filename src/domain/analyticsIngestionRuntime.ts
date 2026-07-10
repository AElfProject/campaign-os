import type { CampaignShellDetail, LocalizedText } from "./types";

const text = (enUS: string, zhCN: string, zhTW = enUS): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
});

export type AnalyticsIngestionRuntimeSource = "seeded_runtime" | "server_runtime";
export type AnalyticsIngestionRuntimeStatus = "blocked" | "review_required" | "local_ready";
export type AnalyticsIngestionWarehouseHandoffStatus = "missing" | "partial" | "ready_disabled";
export type AnalyticsIngestionDiagnosticSeverity = "error" | "info" | "warning";
export type AnalyticsIngestionDiagnosticSource =
  | "event_catalog"
  | "metric_lineage"
  | "redaction"
  | "runtime"
  | "safety"
  | "warehouse"
  | (string & {});
export type AnalyticsIngestionDiagnosticCode =
  | "ANALYTICS_EVENT_ENVELOPE_REVIEW_REQUIRED"
  | "ANALYTICS_LIVE_EXECUTION_DISABLED"
  | "ANALYTICS_UNSAFE_DIAGNOSTIC_REDACTED"
  | "ANALYTICS_WAREHOUSE_HANDOFF_INCOMPLETE"
  | "ANALYTICS_WAREHOUSE_HANDOFF_MISSING";
export type AnalyticsIngestionEventGroupId =
  | "ai_ops_report"
  | "campaign_closeout"
  | "campaign_lifecycle"
  | "export_readiness"
  | "i18n_content_review"
  | "points_ranking"
  | "referral_risk"
  | "task_verification"
  | "wallet_session";
export type AnalyticsIngestionMetricLineageId =
  | "ai_ops_report_inputs"
  | "eligible_winners"
  | "export_readiness"
  | "locale_split"
  | "participants"
  | "referral_conversion"
  | "risk_queue"
  | "verified_actions"
  | "wallet_split";

export interface AnalyticsIngestionRuntimeDiagnostic {
  code: AnalyticsIngestionDiagnosticCode;
  field: string;
  message: string;
  safeDetails?: unknown;
  severity: AnalyticsIngestionDiagnosticSeverity;
  source: AnalyticsIngestionDiagnosticSource;
}

export interface AnalyticsIngestionEventGroup {
  boundary: LocalizedText;
  eventCount: number;
  id: AnalyticsIngestionEventGroupId;
  label: LocalizedText;
  localOnly: true;
  schemaState: "local_review";
}

export interface AnalyticsIngestionMetricLineageRow {
  id: AnalyticsIngestionMetricLineageId;
  inputCount: number;
  label: LocalizedText;
  lineage: LocalizedText;
  outputMetric: string;
  sourceEventGroupIds: readonly AnalyticsIngestionEventGroupId[];
}

export interface AnalyticsIngestionWarehouseHandoffInput {
  approvalRef?: string;
  enabled?: boolean;
  eventEnvelopeSchemaRef?: string;
  ingestionJobRef?: string;
  operatorRunbookRef?: string;
  redactionPolicyRef?: string;
  schemaRef?: string;
  warehouseRef?: string;
}

export interface AnalyticsIngestionWarehouseHandoff {
  approvalRef?: string;
  eventEnvelopeSchemaRef?: string;
  eventWarehouseWriteAttempted: false;
  ingestionJobRef?: string;
  liveWarehouseWriteEnabled: false;
  missingConfigKeys: readonly string[];
  operatorRunbookRef?: string;
  productionReady: false;
  redactionPolicyRef?: string;
  requiredConfigKeys: readonly string[];
  status: AnalyticsIngestionWarehouseHandoffStatus;
  topBlocker: LocalizedText;
  warehouseRef?: string;
}

export interface AnalyticsIngestionSeededCountsInput {
  aiOpsReportCount?: number;
  eligibleWinners?: number;
  eventGroupCounts?: Partial<Record<AnalyticsIngestionEventGroupId, number>>;
  exportRows?: number;
  metricInputCounts?: Partial<Record<AnalyticsIngestionMetricLineageId, number>>;
  riskReviewQueue?: number;
  totalParticipants?: number;
  verifiedActions?: number;
}

export interface AnalyticsIngestionNoLiveSideEffects {
  liveAnalyticsSdkExecuted: false;
  liveBrowserTrackingEnabled: false;
  liveContractWrite: false;
  liveEventIngestionEnabled: false;
  liveEventWarehouseWrite: false;
  liveExportFileWrite: false;
  liveFingerprintingEnabled: false;
  liveProfilingEnabled: false;
  liveProviderCallExecuted: false;
  liveProductionDatabaseMutation: false;
  liveRewardCustody: false;
  liveRewardDistribution: false;
  liveWalletSignature: false;
}

export interface AnalyticsIngestionRuntimeSummary {
  aiOpsReportCount: number;
  eligibleWinners: number;
  eventGroupCount: number;
  exportRows: number;
  metricLineageCount: number;
  riskReviewQueue: number;
  topBlocker: LocalizedText;
  topNextAction: LocalizedText;
  totalEvents: number;
  totalParticipants: number;
  verifiedActions: number;
}

export interface CreateAnalyticsIngestionRuntimeReadinessOptions {
  campaign: CampaignShellDetail;
  diagnostics?: readonly AnalyticsIngestionRuntimeDiagnostic[];
  seededCounts?: AnalyticsIngestionSeededCountsInput;
  source?: AnalyticsIngestionRuntimeSource;
  traceId?: string;
  warehouseHandoff?: AnalyticsIngestionWarehouseHandoffInput;
}

export interface AnalyticsIngestionRuntimeReadiness {
  boundary: LocalizedText;
  campaignId: string;
  diagnosticCodes: readonly AnalyticsIngestionDiagnosticCode[];
  diagnostics: readonly AnalyticsIngestionRuntimeDiagnostic[];
  eventCatalog: readonly AnalyticsIngestionEventGroup[];
  metricLineage: readonly AnalyticsIngestionMetricLineageRow[];
  noLiveSideEffects: AnalyticsIngestionNoLiveSideEffects;
  productionReady: false;
  source: AnalyticsIngestionRuntimeSource;
  status: AnalyticsIngestionRuntimeStatus;
  summary: AnalyticsIngestionRuntimeSummary;
  traceId?: string;
  valid: boolean;
  warehouseHandoff: AnalyticsIngestionWarehouseHandoff;
}

export const analyticsIngestionRuntimeBoundary = text(
  "Local analytics ingestion runtime readiness only. No live analytics SDK, event warehouse write, browser tracking, profiling, fingerprinting, provider call, production database mutation, export write, contract write, wallet signature, reward custody, or reward distribution is executed.",
  "仅本地 analytics ingestion runtime readiness。不会执行实时 analytics SDK、事件仓库写入、浏览器追踪、画像、指纹识别、provider 调用、生产数据库变更、导出写入、合约写入、钱包签名、奖励托管或发奖。",
);

export const analyticsIngestionRuntimeNoLiveSideEffects: AnalyticsIngestionNoLiveSideEffects = {
  liveAnalyticsSdkExecuted: false,
  liveBrowserTrackingEnabled: false,
  liveContractWrite: false,
  liveEventIngestionEnabled: false,
  liveEventWarehouseWrite: false,
  liveExportFileWrite: false,
  liveFingerprintingEnabled: false,
  liveProfilingEnabled: false,
  liveProviderCallExecuted: false,
  liveProductionDatabaseMutation: false,
  liveRewardCustody: false,
  liveRewardDistribution: false,
  liveWalletSignature: false,
};

export const analyticsIngestionWarehouseRequiredConfigKeys = [
  "CAMPAIGN_OS_ANALYTICS_WAREHOUSE_REF",
  "CAMPAIGN_OS_ANALYTICS_EVENT_ENVELOPE_SCHEMA_REF",
  "CAMPAIGN_OS_ANALYTICS_REDACTION_POLICY_REF",
  "CAMPAIGN_OS_ANALYTICS_INGESTION_JOB_REF",
  "CAMPAIGN_OS_ANALYTICS_OPERATOR_RUNBOOK_REF",
  "CAMPAIGN_OS_ANALYTICS_APPROVAL_REF",
] as const;

const eventGroupLabels: Record<AnalyticsIngestionEventGroupId, LocalizedText> = {
  ai_ops_report: text("AI Ops report", "AI Ops 报告"),
  campaign_closeout: text("Campaign closeout", "活动收尾"),
  campaign_lifecycle: text("Campaign lifecycle", "活动生命周期"),
  export_readiness: text("Export readiness", "导出准备度"),
  i18n_content_review: text("i18n content review", "多语言内容审核"),
  points_ranking: text("Points and ranking", "积分与排名"),
  referral_risk: text("Referral and risk", "邀请与风险"),
  task_verification: text("Task verification", "任务验证"),
  wallet_session: text("Wallet session", "钱包会话"),
};

const eventGroupBoundaries: Record<AnalyticsIngestionEventGroupId, LocalizedText> = {
  ai_ops_report: text(
    "AI Ops report inputs are local review records; no AI provider or analytics warehouse write is executed.",
    "AI Ops 报告输入仅为本地审核记录；不会执行 AI provider 或 analytics warehouse 写入。",
  ),
  campaign_closeout: text(
    "Closeout events are readiness markers only and do not trigger reward settlement.",
    "收尾事件仅是准备度标记，不触发奖励结算。",
  ),
  campaign_lifecycle: text(
    "Lifecycle events describe seeded campaign state only.",
    "生命周期事件仅描述 seeded 活动状态。",
  ),
  export_readiness: text(
    "Export readiness events are review metadata and do not write export files.",
    "导出准备度事件是审核元数据，不写入导出文件。",
  ),
  i18n_content_review: text(
    "Content review events stay local and do not publish content.",
    "内容审核事件保持本地，不发布内容。",
  ),
  points_ranking: text(
    "Points and ranking events are off-chain read models and do not write ledgers.",
    "积分与排名事件是 off-chain read model，不写入账本。",
  ),
  referral_risk: text(
    "Referral and risk events are review signals and do not enforce penalties.",
    "邀请与风险事件是审核信号，不执行处罚。",
  ),
  task_verification: text(
    "Task verification events are derived from local task state and do not call providers.",
    "任务验证事件由本地任务状态派生，不调用 provider。",
  ),
  wallet_session: text(
    "Wallet session events are normalized local records and do not request signatures.",
    "钱包会话事件是标准化本地记录，不请求签名。",
  ),
};

const metricLabels: Record<AnalyticsIngestionMetricLineageId, LocalizedText> = {
  ai_ops_report_inputs: text("AI Ops report inputs", "AI Ops 报告输入"),
  eligible_winners: text("Eligible winners", "合格 winners"),
  export_readiness: text("Export readiness", "导出准备度"),
  locale_split: text("Locale split", "语言拆分"),
  participants: text("Participants", "参与者"),
  referral_conversion: text("Referral conversion", "邀请转化"),
  risk_queue: text("Risk queue", "风险队列"),
  verified_actions: text("Verified actions", "已验证行为"),
  wallet_split: text("Wallet split", "钱包拆分"),
};

const metricSourceGroups: Record<AnalyticsIngestionMetricLineageId, readonly AnalyticsIngestionEventGroupId[]> = {
  ai_ops_report_inputs: ["ai_ops_report", "task_verification", "referral_risk"],
  eligible_winners: ["points_ranking", "export_readiness"],
  export_readiness: ["export_readiness", "points_ranking"],
  locale_split: ["wallet_session", "i18n_content_review"],
  participants: ["wallet_session", "campaign_lifecycle"],
  referral_conversion: ["referral_risk", "task_verification"],
  risk_queue: ["referral_risk"],
  verified_actions: ["task_verification"],
  wallet_split: ["wallet_session"],
};

export const createAnalyticsIngestionRuntimeReadiness = ({
  campaign,
  diagnostics = [],
  seededCounts,
  source = "seeded_runtime",
  traceId,
  warehouseHandoff,
}: CreateAnalyticsIngestionRuntimeReadinessOptions): AnalyticsIngestionRuntimeReadiness => {
  const eventCatalog = createEventCatalog(campaign, seededCounts);
  const metricLineage = createMetricLineage(campaign, seededCounts);
  const handoff = createWarehouseHandoff(warehouseHandoff);
  const diagnosticCodes = createDiagnosticCodes(handoff);
  const baseDiagnostics = diagnosticCodes.map((code) => createDiagnostic(code));
  const sanitizedDiagnostics = diagnostics.map(sanitizeDiagnostic);
  const status = createStatus(handoff);

  return {
    boundary: analyticsIngestionRuntimeBoundary,
    campaignId: campaign.id,
    diagnosticCodes,
    diagnostics: [...baseDiagnostics, ...sanitizedDiagnostics],
    eventCatalog,
    metricLineage,
    noLiveSideEffects: analyticsIngestionRuntimeNoLiveSideEffects,
    productionReady: false,
    source,
    status,
    summary: createSummary(campaign, eventCatalog, metricLineage, handoff, seededCounts),
    ...(traceId ? { traceId: sanitizeAnalyticsIngestionRuntimeText(traceId) } : {}),
    valid: true,
    warehouseHandoff: handoff,
  };
};

const createEventCatalog = (
  campaign: CampaignShellDetail,
  seededCounts: AnalyticsIngestionSeededCountsInput | undefined,
): AnalyticsIngestionEventGroup[] =>
  (Object.keys(eventGroupLabels) as AnalyticsIngestionEventGroupId[])
    .sort()
    .map((id) => ({
      boundary: eventGroupBoundaries[id],
      eventCount: eventCountByGroup(id, campaign, seededCounts),
      id,
      label: eventGroupLabels[id],
      localOnly: true,
      schemaState: "local_review",
    }));

const eventCountByGroup = (
  id: AnalyticsIngestionEventGroupId,
  campaign: CampaignShellDetail,
  seededCounts: AnalyticsIngestionSeededCountsInput | undefined,
): number => {
  const override = normalizeCount(seededCounts?.eventGroupCounts?.[id]);

  if (override !== undefined) {
    return override;
  }

  switch (id) {
    case "ai_ops_report":
      return campaign.aiOpsReports.length;
    case "campaign_closeout":
      return campaign.status === "ended" || campaign.status === "exported" || campaign.status === "archived"
        ? 1
        : campaign.reviewItems.filter((item) => item.type === "EXPORT_READY").length;
    case "campaign_lifecycle":
      return 1;
    case "export_readiness":
      return campaign.exportPreview.rows.length;
    case "i18n_content_review":
      return campaign.contentRevisions.length;
    case "points_ranking":
      return campaign.participants.length;
    case "referral_risk":
      return campaign.riskSignals.length;
    case "task_verification":
      return campaign.participants.length * campaign.tasks.length;
    case "wallet_session":
      return campaign.walletSessions.length;
  }
};

const createMetricLineage = (
  campaign: CampaignShellDetail,
  seededCounts: AnalyticsIngestionSeededCountsInput | undefined,
): AnalyticsIngestionMetricLineageRow[] =>
  (Object.keys(metricLabels) as AnalyticsIngestionMetricLineageId[])
    .sort()
    .map((id) => ({
      id,
      inputCount: metricInputCount(id, campaign, seededCounts),
      label: metricLabels[id],
      lineage: metricLineageText(id),
      outputMetric: id.replace(/_/g, "."),
      sourceEventGroupIds: metricSourceGroups[id],
    }));

const metricInputCount = (
  id: AnalyticsIngestionMetricLineageId,
  campaign: CampaignShellDetail,
  seededCounts: AnalyticsIngestionSeededCountsInput | undefined,
): number => {
  const directOverride = normalizeCount(seededCounts?.metricInputCounts?.[id]);

  if (directOverride !== undefined) {
    return directOverride;
  }

  switch (id) {
    case "ai_ops_report_inputs":
      return campaign.aiOpsReports.reduce(
        (total, report) => total + 1 + report.recommendations.length,
        0,
      );
    case "eligible_winners":
      return normalizeCount(seededCounts?.eligibleWinners) ?? campaign.metrics.exportReadyWinners;
    case "export_readiness":
      return normalizeCount(seededCounts?.exportRows) ?? campaign.exportPreview.rows.length;
    case "locale_split":
      return unique(campaign.participants.map((participant) => participant.localePreference)).length;
    case "participants":
      return normalizeCount(seededCounts?.totalParticipants) ?? campaign.participants.length;
    case "referral_conversion":
      return campaign.conversionFunnel.find((step) => step.id === "qualified-invite")?.count ?? 0;
    case "risk_queue":
      return normalizeCount(seededCounts?.riskReviewQueue) ?? campaign.metrics.riskReviewQueue;
    case "verified_actions":
      return normalizeCount(seededCounts?.verifiedActions)
        ?? campaign.participants.reduce((total, participant) => total + participant.completedTaskIds.length, 0);
    case "wallet_split":
      return unique(campaign.participants.map((participant) => participant.accountType)).length;
  }
};

const metricLineageText = (id: AnalyticsIngestionMetricLineageId): LocalizedText => {
  switch (id) {
    case "ai_ops_report_inputs":
      return text("AI Ops report cards and recommendations remain local review inputs.", "AI Ops 报告卡与建议保持为本地审核输入。");
    case "eligible_winners":
      return text("Eligible winner count is sourced from local export readiness, not reward execution.", "合格 winner 数来自本地导出准备度，不来自发奖执行。");
    case "export_readiness":
      return text("Export rows describe readiness and do not write files.", "导出行描述准备度，不写文件。");
    case "locale_split":
      return text("Locale split is derived from participant preferences and content review state.", "语言拆分由参与者偏好与内容审核状态派生。");
    case "participants":
      return text("Participant counts come from seeded local campaign records.", "参与者数量来自 seeded 本地活动记录。");
    case "referral_conversion":
      return text("Referral conversion uses seeded funnel and risk review records.", "邀请转化使用 seeded 漏斗与风险审核记录。");
    case "risk_queue":
      return text("Risk queue count stays advisory until human review.", "风险队列数量在人工审核前保持建议状态。");
    case "verified_actions":
      return text("Verified action count is derived from local task completion state.", "已验证行为数量由本地任务完成状态派生。");
    case "wallet_split":
      return text("Wallet split is derived from normalized wallet session and participant records.", "钱包拆分由标准化钱包会话与参与者记录派生。");
  }
};

const createWarehouseHandoff = (
  input: AnalyticsIngestionWarehouseHandoffInput | undefined,
): AnalyticsIngestionWarehouseHandoff => {
  const safeInput = sanitizeWarehouseInput(input);
  const missingConfigKeys = missingWarehouseConfigKeys(safeInput);
  const status = createWarehouseStatus(safeInput, missingConfigKeys);

  return {
    ...safeInput,
    eventWarehouseWriteAttempted: false,
    liveWarehouseWriteEnabled: false,
    missingConfigKeys,
    productionReady: false,
    requiredConfigKeys: analyticsIngestionWarehouseRequiredConfigKeys,
    status,
    topBlocker: topWarehouseBlocker(status),
  };
};

const sanitizeWarehouseInput = (
  input: AnalyticsIngestionWarehouseHandoffInput | undefined,
): Partial<AnalyticsIngestionWarehouseHandoffInput> => ({
  approvalRef: normalizeSafeReference(input?.approvalRef),
  eventEnvelopeSchemaRef: normalizeSafeReference(input?.eventEnvelopeSchemaRef ?? input?.schemaRef),
  ingestionJobRef: normalizeSafeReference(input?.ingestionJobRef),
  operatorRunbookRef: normalizeSafeReference(input?.operatorRunbookRef),
  redactionPolicyRef: normalizeSafeReference(input?.redactionPolicyRef),
  warehouseRef: normalizeSafeReference(input?.warehouseRef),
});

const missingWarehouseConfigKeys = (
  input: Partial<AnalyticsIngestionWarehouseHandoffInput>,
): string[] => [
  ["warehouseRef", "CAMPAIGN_OS_ANALYTICS_WAREHOUSE_REF"],
  ["eventEnvelopeSchemaRef", "CAMPAIGN_OS_ANALYTICS_EVENT_ENVELOPE_SCHEMA_REF"],
  ["redactionPolicyRef", "CAMPAIGN_OS_ANALYTICS_REDACTION_POLICY_REF"],
  ["ingestionJobRef", "CAMPAIGN_OS_ANALYTICS_INGESTION_JOB_REF"],
  ["operatorRunbookRef", "CAMPAIGN_OS_ANALYTICS_OPERATOR_RUNBOOK_REF"],
  ["approvalRef", "CAMPAIGN_OS_ANALYTICS_APPROVAL_REF"],
]
  .filter(([field]) => !input[field as keyof AnalyticsIngestionWarehouseHandoffInput])
  .map(([, key]) => key);

const createWarehouseStatus = (
  input: Partial<AnalyticsIngestionWarehouseHandoffInput>,
  missingConfigKeys: readonly string[],
): AnalyticsIngestionWarehouseHandoffStatus => {
  const hasAnyConfig = Object.values(input).some((value) => typeof value === "string" && value.length > 0);

  if (!hasAnyConfig) {
    return "missing";
  }

  if (missingConfigKeys.length > 0) {
    return "partial";
  }

  return "ready_disabled";
};

const topWarehouseBlocker = (status: AnalyticsIngestionWarehouseHandoffStatus): LocalizedText => {
  if (status === "missing") {
    return text(
      "Analytics warehouse handoff is missing; keep ingestion local-review only.",
      "Analytics warehouse handoff 缺失；ingestion 保持仅本地审核。",
    );
  }

  if (status === "partial") {
    return text(
      "Analytics warehouse handoff is incomplete; review schema, redaction, runbook, job, warehouse, and approval references.",
      "Analytics warehouse handoff 不完整；请审核 schema、redaction、runbook、job、warehouse 与 approval 引用。",
    );
  }

  return text(
    "Warehouse handoff references are present for review; live ingestion and warehouse writes remain disabled.",
    "Warehouse handoff 引用已可审核；实时 ingestion 与 warehouse 写入仍保持禁用。",
  );
};

const createStatus = (
  warehouseHandoff: AnalyticsIngestionWarehouseHandoff,
): AnalyticsIngestionRuntimeStatus =>
  warehouseHandoff.status === "ready_disabled" ? "review_required" : "blocked";

const createDiagnosticCodes = (
  handoff: AnalyticsIngestionWarehouseHandoff,
): AnalyticsIngestionDiagnosticCode[] => unique([
  ...(handoff.status === "missing" ? ["ANALYTICS_WAREHOUSE_HANDOFF_MISSING" as const] : []),
  ...(handoff.status === "partial" ? ["ANALYTICS_WAREHOUSE_HANDOFF_INCOMPLETE" as const] : []),
  "ANALYTICS_EVENT_ENVELOPE_REVIEW_REQUIRED" as const,
  "ANALYTICS_LIVE_EXECUTION_DISABLED" as const,
]);

const createDiagnostic = (
  code: AnalyticsIngestionDiagnosticCode,
): AnalyticsIngestionRuntimeDiagnostic => {
  const definitions: Record<AnalyticsIngestionDiagnosticCode, Omit<AnalyticsIngestionRuntimeDiagnostic, "code">> = {
    ANALYTICS_EVENT_ENVELOPE_REVIEW_REQUIRED: {
      field: "eventCatalog",
      message: "Event envelopes are local review records until schema, redaction, and warehouse handoff are approved.",
      severity: "warning",
      source: "event_catalog",
    },
    ANALYTICS_LIVE_EXECUTION_DISABLED: {
      field: "noLiveSideEffects",
      message: "Live analytics SDK execution, browser tracking, profiling, fingerprinting, and warehouse writes are disabled.",
      severity: "info",
      source: "safety",
    },
    ANALYTICS_UNSAFE_DIAGNOSTIC_REDACTED: {
      field: "diagnostics",
      message: "Unsafe analytics diagnostic values were redacted before serialization.",
      severity: "warning",
      source: "redaction",
    },
    ANALYTICS_WAREHOUSE_HANDOFF_INCOMPLETE: {
      field: "warehouseHandoff",
      message: "Analytics warehouse handoff is incomplete.",
      severity: "error",
      source: "warehouse",
    },
    ANALYTICS_WAREHOUSE_HANDOFF_MISSING: {
      field: "warehouseHandoff",
      message: "Analytics warehouse handoff is missing.",
      severity: "error",
      source: "warehouse",
    },
  };

  return { code, ...definitions[code] };
};

const sanitizeDiagnostic = (
  diagnostic: AnalyticsIngestionRuntimeDiagnostic,
): AnalyticsIngestionRuntimeDiagnostic => ({
  code: diagnostic.code,
  field: sanitizeAnalyticsIngestionRuntimeText(diagnostic.field),
  message: sanitizeAnalyticsIngestionRuntimeText(diagnostic.message),
  safeDetails: diagnostic.safeDetails === undefined
    ? undefined
    : sanitizeAnalyticsIngestionRuntimeValue(diagnostic.safeDetails),
  severity: diagnostic.severity,
  source: sanitizeAnalyticsIngestionRuntimeText(diagnostic.source),
});

const createSummary = (
  campaign: CampaignShellDetail,
  eventCatalog: readonly AnalyticsIngestionEventGroup[],
  metricLineage: readonly AnalyticsIngestionMetricLineageRow[],
  handoff: AnalyticsIngestionWarehouseHandoff,
  seededCounts: AnalyticsIngestionSeededCountsInput | undefined,
): AnalyticsIngestionRuntimeSummary => ({
  aiOpsReportCount: normalizeCount(seededCounts?.aiOpsReportCount) ?? campaign.aiOpsReports.length,
  eligibleWinners: metricInput(metricLineage, "eligible_winners"),
  eventGroupCount: eventCatalog.length,
  exportRows: metricInput(metricLineage, "export_readiness"),
  metricLineageCount: metricLineage.length,
  riskReviewQueue: metricInput(metricLineage, "risk_queue"),
  topBlocker: handoff.topBlocker,
  topNextAction: text(
    "Review event catalog, metric lineage, and warehouse handoff before enabling production analytics ingestion.",
    "启用生产 analytics ingestion 前，请审核 event catalog、metric lineage 与 warehouse handoff。",
  ),
  totalEvents: eventCatalog.reduce((total, group) => total + group.eventCount, 0),
  totalParticipants: metricInput(metricLineage, "participants"),
  verifiedActions: metricInput(metricLineage, "verified_actions"),
});

const metricInput = (
  metricLineage: readonly AnalyticsIngestionMetricLineageRow[],
  id: AnalyticsIngestionMetricLineageId,
) => metricLineage.find((row) => row.id === id)?.inputCount ?? 0;

export const sanitizeAnalyticsIngestionRuntimeValue = (value: unknown): unknown => {
  if (value instanceof Error) {
    return "[REDACTED:STACK]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAnalyticsIngestionRuntimeValue(item));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        sanitizeAnalyticsIngestionRuntimeField(key, nestedValue),
      ]),
    );
  }

  if (typeof value === "string") {
    return sanitizeAnalyticsIngestionRuntimeText(value);
  }

  return value;
};

export const sanitizeAnalyticsIngestionRuntimeText = (value: string): string => {
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
    .replace(privatePathPattern, "[REDACTED:PRIVATE_PATH]")
    .replace(objectStorageKeyPattern, "[REDACTED:OBJECT_KEY]")
    .replace(providerPayloadPattern, "[REDACTED:PROVIDER_PAYLOAD]")
    .replace(credentialPattern, "[REDACTED:CREDENTIAL]")
    .replace(walletSignaturePattern, "[REDACTED:WALLET_SIGNATURE]");
};

const sanitizeAnalyticsIngestionRuntimeField = (key: string, value: unknown): unknown => {
  if (typeof value === "string" && isSafeReference(value)) {
    return value;
  }

  if (/stack/i.test(key)) {
    return "[REDACTED:STACK]";
  }

  if (/signed[-_]?url|download[-_]?url|endpoint|dsn|host|url/i.test(key)) {
    return "[REDACTED:ENDPOINT]";
  }

  if (/object[-_]?key|storage[-_]?key|bucket|warehouse[-_]?key/i.test(key)) {
    return "[REDACTED:OBJECT_KEY]";
  }

  if (/private[-_]?key|raw[-_]?signature|wallet[-_]?signature|signature/i.test(key)) {
    return "[REDACTED:WALLET_SIGNATURE]";
  }

  if (/credential|authorization|api[-_]?key|bearer|secret|token/i.test(key)) {
    return "[REDACTED:CREDENTIAL]";
  }

  if (/provider[-_]?(payload|response|request)|raw[-_]?(payload|body|request|response)/i.test(key)
    && typeof value === "string") {
    return "[REDACTED:PROVIDER_PAYLOAD]";
  }

  return sanitizeAnalyticsIngestionRuntimeValue(value);
};

const normalizeSafeReference = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 && isSafeReference(trimmed) ? trimmed : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isSafeReference = (value: string) =>
  /^(approval-ref|config-ref|evidence-ref|job-ref|metric-ref|policy-ref|runbook-ref|schema-ref|warehouse-ref):[a-z0-9._:-]+$/i.test(
    value,
  );

const isProviderPayloadDocument = (value: string) =>
  /^\s*(?:raw provider payload|provider[-_ ]?(?:payload|response|request)|raw[-_ ]?(?:payload|request|response))\b/i.test(
    value,
  );

const isStackTrace = (value: string) =>
  /\n\s+at\s+|Error:\s.*\n|^\s*at\s+\S+/i.test(value);

const unique = <T>(values: readonly T[]): T[] => Array.from(new Set(values));

const normalizeCount = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : undefined;

const signedUrlPattern = /https?:\/\/[^"'\s<>]*(?:x-amz-signature|x-goog-signature|signature=|signed=)[^"'\s<>]*|\bsigned[-_ ]?url\b/gi;
const endpointPattern = /https?:\/\/[^"'\s<>]+/gi;
const privatePathPattern = /\/Users\/[^"'\s<>]*|\/private\/[^"'\s<>]*|\bcampaign-os-kitty\b/gi;
const objectStorageKeyPattern = /\b(?:object[-_ ]?key|storage[-_ ]?key)\b(?:\s+[^\s,.]+)?|s3:\/\/[^"'\s<>]+|gs:\/\/[^"'\s<>]+|tenant\/raw\/[^"'\s<>]+|warehouse\/raw\/[^"'\s<>]+|\/raw\/[^"'\s<>]+|[A-Za-z0-9._/-]+\.(?:csv|json)(?:\?[^"'\s<>]+)?/gi;
const providerPayloadPattern = /\bprovider[-_ ]?(?:payload|response|request)\b|\braw[-_ ]?(?:payload|request|response)\b|\braw provider payload\b/gi;
const credentialPattern = /\bapi[-_]?key\b|\bbearer\s+[^\s,.]+|\bcredential=[^\s,.]+|\bplain-secret[^\s,.]*|\bsecret[^\s,.]*|\btoken=[^\s,.]+|\baccess[-_]?token\b|\brefresh[-_]?token\b/gi;
const walletSignaturePattern = /\braw[-_]?signature\b|\bwallet[-_]?signature\b|\bwallet-signature\b|\bsigned[-_]?payload\b/gi;
