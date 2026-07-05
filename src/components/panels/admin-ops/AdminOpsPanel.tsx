import { useState, type CSSProperties } from "react";
import { CheckCircle2, FileCheck2, FolderOpen, RotateCcw, Save, XCircle, type LucideIcon } from "lucide-react";
import {
  campaignDetail,
  computePublishReadiness,
  createAdminOpsReadModel,
  createExportArtifact,
  createExportConfirmationReadinessGate,
  createLiveWalletConnectorBoundary,
  createResidualGapMissionQueue,
  createServiceDegradationGovernance,
  createWalletProviderEvidenceAllApprovedSampleSnapshot,
  createWalletProviderEvidenceReleaseApprovalSnapshot,
  createWalletProviderEvidenceActivation,
  createWalletProviderEvidenceRecoveryInitialUiState,
  executeWalletProviderEvidenceReviewAction,
  createParticipationReadModel,
  getLocalizedText,
  recoverWalletProviderEvidenceState,
  serializeWalletProviderEvidenceRecoverySnapshot,
  type AelfWebLoginAdapterLiveEvidenceStatus,
  type AelfWebLoginAdapterReadiness,
  type AiOpsReportHandoffStatus,
  type AiOptimizationActionStatus,
  type AiOptimizationMetricTone,
  type CampaignShellDetail,
  type CompetitorWatchDifferentiator,
  type CompetitorWatchReviewState,
  type ContractInterfaceReadiness,
  type ContractMode,
  type ContractReviewChecklistStatus,
  type CompanionContractEvidenceItemKind,
  type CompanionContractReadinessStatus,
  type DeliveryAcceptanceSeverity,
  type DeliveryAcceptanceStatus,
  type DeliveryChecklistCloseoutHandoffTarget,
  type DeliveryChecklistCloseoutQueueId,
  type DeliveryChecklistStatus,
  type DeliveryChecklistTraceabilityProofLevel,
  type ExportReadinessState,
  type AiContentArtifactLifecycle,
  type AiContentQualityGateStatus,
  type AdvancedAnalyticsReadinessState,
  type AntiSybilV2ReadinessState,
  type CampaignLifecycleOperation,
  type CampaignLifecycleOperationState,
  type CampaignLifecycleStatus,
  type ContractClaimPreapprovalGateState,
  type ContractTransparencyReadiness,
  type ExternalServiceLiveEvidenceStatus,
  type ExternalServiceRegistryEntry,
  type ExternalServiceReleaseImpact,
  type ExternalServiceState,
  type LaunchConsoleBundleStatus,
  type LaunchConsoleGateState,
  type LaunchConsoleHandoffReviewState,
  type LiveWalletConnectorLiveEvidenceStatus,
  type LiveWalletConnectorReadiness,
  type MetricTone,
  type P1LocaleActivationEvidenceState,
  type P1LocaleActivationStatus,
  type P1LocaleExpansionReadinessStatus,
  type ProviderFeatureGateState,
  type ProviderLiveEvidenceStatus,
  type ResidualGapMissionQueueStatus,
  type RiskIntelligenceReviewState,
  type SignalSeverity,
  type SupportedLocale,
  type TemplateGovernanceSignal,
  type TemplateGovernanceStatus,
  type WalletProviderEvidenceActivationFeatureGateState,
  type WalletProviderEvidenceActivationReviewerState,
  type WalletProviderEvidenceActivationState,
  type WalletProviderEvidenceArtifactType,
  type WalletProviderEvidenceApprovalRuleId,
  type WalletProviderEvidenceApprovalRuleState,
  type WalletProviderEvidenceApprovalState,
  type WalletProviderEvidenceReleaseImpact,
  type WalletProviderEvidenceRecoveryInitialUiState,
  type WalletProviderEvidenceRecoverySnapshot,
  type WalletProviderEvidenceRecoverySource,
  type WalletProviderEvidenceRecoveryStatus,
  type WalletProviderEvidenceRecoveryStorageState,
  type WalletProviderEvidenceReviewActionId,
  type WalletProviderEvidenceReviewActionResult,
  type WalletProviderEvidenceReviewArtifactReference,
  type WalletProviderEvidenceRequestStatus,
  type WalletProviderEvidenceReleaseState,
  type WalletProviderEvidenceReviewState,
  type WalletProviderEvidenceStatus,
  type WalletProviderQaScenarioId,
  type WalletProviderQaLiveEvidenceStatus,
  type WalletProviderQaReleaseImpact,
  type WalletProviderQaSeededStatus,
} from "../../../domain";
import {
  Badge,
  ContractModeBadge,
  LocaleStatusBadge,
  PublishStateBadge,
  ReviewSeverityBadge,
  WalletBadge,
} from "../../badges/Badges";
import { adminOpsCopy } from "./copy";

interface AdminOpsPanelProps {
  campaign?: CampaignShellDetail;
  locale: SupportedLocale;
}

type PublishState = "blocker" | "warning" | "ready";
type DeliveryChecklistCloseoutQueueFilter = "all" | DeliveryChecklistCloseoutQueueId;

const panelStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "grid",
  gap: 16,
  padding: 18,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
};

const compactGridStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(150px, 100%), 1fr))",
  minWidth: 0,
};

const cardStyle: CSSProperties = {
  background: "#f8fbff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "grid",
  gap: 10,
  minWidth: 0,
  padding: 14,
};

const rowStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  justifyContent: "space-between",
};

const companionEvidenceDetailHeaderStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  minWidth: 0,
};

const companionEvidenceDetailStyle: CSSProperties = {
  borderTop: "1px solid #dbe6f4",
  display: "grid",
  gap: 6,
  minWidth: 0,
  paddingTop: 8,
};

const companionEvidenceTitleStyle: CSSProperties = {
  color: "#071426",
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.35,
  minWidth: 0,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const companionEvidenceBadgeGroupStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  minWidth: 0,
};

const stackStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  minWidth: 0,
};

const labelStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0,
  margin: 0,
  minWidth: 0,
  overflowWrap: "anywhere",
  textTransform: "uppercase",
  wordBreak: "break-word",
};

const valueStyle: CSSProperties = {
  color: "#071426",
  fontSize: 28,
  fontWeight: 900,
  lineHeight: 1,
  margin: 0,
  minWidth: 0,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const mutedTextStyle: CSSProperties = {
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.45,
  margin: 0,
};

const wrapTextStyle: CSSProperties = {
  ...mutedTextStyle,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const tableStyle: CSSProperties = {
  borderCollapse: "collapse",
  minWidth: 980,
  width: "100%",
};

const exportTableStyle: CSSProperties = {
  ...tableStyle,
  minWidth: 1580,
};

const scrollContainerStyle: CSSProperties = {
  maxWidth: "100%",
  minWidth: 0,
  overflowX: "auto",
};

const contractCodeStyle: CSSProperties = {
  background: "#f8fbff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  color: "#071426",
  display: "block",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1.45,
  margin: 0,
  minWidth: 980,
  padding: 12,
  whiteSpace: "nowrap",
};

const codeListStyle: CSSProperties = {
  color: "#071426",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: 12,
  lineHeight: 1.45,
  wordBreak: "break-word",
};

const thStyle: CSSProperties = {
  borderBottom: "1px solid #dbe6f4",
  color: "#64748b",
  fontSize: 12,
  padding: "10px 8px",
  textAlign: "left",
  textTransform: "uppercase",
};

const tdStyle: CSSProperties = {
  borderBottom: "1px solid #eef2f7",
  color: "#071426",
  fontSize: 13,
  padding: "10px 8px",
  verticalAlign: "top",
};

const boundaryStyle: CSSProperties = {
  background: "#fffbeb",
  border: "1px solid #fcd34d",
  borderRadius: 8,
  color: "#92400e",
  fontWeight: 800,
  lineHeight: 1.45,
  margin: 0,
  padding: 12,
};

const sourceMetricListStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  minWidth: 0,
};

const sourceMetricChipStyle: CSSProperties = {
  alignItems: "flex-start",
  border: "1px solid",
  borderRadius: 8,
  boxSizing: "border-box",
  display: "inline-flex",
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.35,
  maxWidth: "100%",
  minWidth: 0,
  overflowWrap: "anywhere",
  padding: "6px 9px",
  whiteSpace: "normal",
  wordBreak: "break-word",
};

const chipListStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  minWidth: 0,
};

const chipStyle: CSSProperties = {
  ...sourceMetricChipStyle,
  background: "#eff6ff",
  borderColor: "#93c5fd",
  color: "#1e40af",
};

const actionButtonStyle: CSSProperties = {
  alignItems: "center",
  background: "#0f172a",
  border: "1px solid #0f172a",
  borderRadius: 8,
  color: "#ffffff",
  cursor: "pointer",
  display: "inline-flex",
  fontSize: 12,
  fontWeight: 850,
  gap: 7,
  justifyContent: "center",
  lineHeight: 1.2,
  minHeight: 36,
  minWidth: 0,
  overflowWrap: "anywhere",
  padding: "8px 10px",
  textAlign: "left",
  wordBreak: "break-word",
};

const disabledActionButtonStyle: CSSProperties = {
  ...actionButtonStyle,
  background: "#f8fafc",
  border: "1px solid #cbd5e1",
  color: "#64748b",
  cursor: "not-allowed",
};

const actionButtonGridStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(170px, 100%), 1fr))",
  minWidth: 0,
};

const walletProviderEvidenceRecoveryStorageKey = "campaign-os.wallet-provider-evidence.recovery";

const nowIso = () => new Date().toISOString();

const readWalletProviderEvidenceRecoverySnapshot = (
  storageKey = walletProviderEvidenceRecoveryStorageKey,
  defaultSnapshot: WalletProviderEvidenceRecoverySnapshot | null = createWalletProviderEvidenceReleaseApprovalSnapshot(),
): {
  snapshot: WalletProviderEvidenceRecoverySnapshot | null;
  storageState: WalletProviderEvidenceRecoveryStorageState;
} => {
  try {
    const rawSnapshot = window.localStorage.getItem(storageKey);

    return {
      snapshot: rawSnapshot ? JSON.parse(rawSnapshot) as WalletProviderEvidenceRecoverySnapshot : defaultSnapshot,
      storageState: "available",
    };
  } catch {
    return {
      snapshot: null,
      storageState: "read_failed",
    };
  }
};

const writeWalletProviderEvidenceRecoverySnapshot = (
  snapshot: WalletProviderEvidenceRecoverySnapshot,
  storageKey = walletProviderEvidenceRecoveryStorageKey,
): WalletProviderEvidenceRecoveryStorageState => {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));

    return "available";
  } catch {
    return "write_failed";
  }
};

const removeWalletProviderEvidenceRecoverySnapshot = (
  storageKey = walletProviderEvidenceRecoveryStorageKey,
): WalletProviderEvidenceRecoveryStorageState => {
  try {
    window.localStorage.removeItem(storageKey);

    return "available";
  } catch {
    return "unavailable";
  }
};

const sourceMetricToneStyles: Record<AiOptimizationMetricTone, CSSProperties> = {
  good: { background: "#ecfdf5", borderColor: "#86efac", color: "#166534" },
  warning: { background: "#fffbeb", borderColor: "#fcd34d", color: "#92400e" },
  risk: { background: "#fef2f2", borderColor: "#fca5a5", color: "#991b1b" },
};

const modeLabel = (mode: ContractMode) => mode.replace(/_/g, " ");

const metricToneState = (tone: MetricTone) =>
  tone === "critical" ? "blocker" : tone === "warning" ? "warning" : "ready";

const signalState = (severity: SignalSeverity) =>
  severity === "high" || severity === "blocked"
    ? "blocker"
    : severity === "medium"
      ? "warning"
      : "ready";

const riskReviewState = (state: RiskIntelligenceReviewState) =>
  state === "blocked" ? "blocker" : state === "review_required" || state === "monitor" ? "warning" : "ready";

const antiSybilReadinessState = (state: AntiSybilV2ReadinessState) =>
  state === "blocked" ? "blocker" : state === "review_required" ? "warning" : "ready";

const antiSybilReadinessLabel = (
  state: AntiSybilV2ReadinessState,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<AntiSybilV2ReadinessState, string> = {
    blocked: copy.riskIntelligenceReviewStateBlocked,
    ready: copy.readyActions,
    review_required: copy.riskIntelligenceReviewStateReviewRequired,
  };

  return labels[state];
};

const riskReviewStateLabel = (
  state: RiskIntelligenceReviewState,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<RiskIntelligenceReviewState, string> = {
    blocked: copy.riskIntelligenceReviewStateBlocked,
    clear: copy.riskIntelligenceReviewStateClear,
    monitor: copy.riskIntelligenceReviewStateMonitor,
    review_required: copy.riskIntelligenceReviewStateReviewRequired,
  };

  return labels[state];
};

const checklistStatusState = (status: ContractReviewChecklistStatus) =>
  status === "blocked" ? "blocker" : status === "warning" ? "warning" : "ready";

const contractInterfaceReadinessState = (readiness: ContractInterfaceReadiness) =>
  readiness === "blocker" ? "blocker" : readiness === "warning" ? "warning" : "ready";

const contractTransparencyReadinessState = (readiness: ContractTransparencyReadiness) =>
  readiness === "blocked"
    ? "blocker"
    : readiness === "review_required" || readiness === "local_only"
      ? "warning"
      : "ready";

const contractTransparencyReadinessLabel = (
  readiness: ContractTransparencyReadiness,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<ContractTransparencyReadiness, string> = {
    blocked: copy.blocked,
    local_only: copy.localOnlyReadiness,
    ready: copy.readyActions,
    review_required: copy.reviewRequired,
  };

  return labels[readiness];
};

const contractClaimPreapprovalGateState = (state: ContractClaimPreapprovalGateState) =>
  state === "blocked" ? "blocker" : state === "review_required" ? "warning" : "ready";

const contractClaimPreapprovalGateLabel = (
  state: ContractClaimPreapprovalGateState,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<ContractClaimPreapprovalGateState, string> = {
    blocked: copy.blocked,
    ready: copy.readyActions,
    review_required: copy.reviewRequired,
  };

  return labels[state];
};

const companionContractReadinessState = (status: CompanionContractReadinessStatus) =>
  status === "blocked_non_goal"
    ? "blocker"
    : status === "review_required" || status === "deferred_non_goal"
      ? "warning"
      : "ready";

const companionContractReadinessLabel = (
  status: CompanionContractReadinessStatus,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<CompanionContractReadinessStatus, string> = {
    blocked_non_goal: copy.blockedNonGoal,
    deferred_non_goal: copy.deferredNonGoal,
    proven: copy.proven,
    review_required: copy.reviewRequired,
  };

  return labels[status];
};

const companionEvidenceKindLabel = (
  kind: CompanionContractEvidenceItemKind,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<CompanionContractEvidenceItemKind, string> = {
    boundary: copy.rootHashBoundary,
    event: copy.eventEvidence,
    method: copy.methodEvidence,
    non_goal: copy.nonGoalEvidence,
    role: copy.rolePermissionEvidence,
    root_hash: copy.rootHashEvidence,
    schema_field: copy.schemaFieldEvidence,
    test: copy.testChecklistEvidence,
  };

  return labels[kind];
};

const deliveryChecklistStatusState = (status: DeliveryChecklistStatus) =>
  status === "blocked"
    ? "blocker"
    : status === "needs_review" || status === "deferred"
      ? "warning"
      : "ready";

const deliveryChecklistTraceabilityCopy = {
  "en-US": {
    boundary: "Audit-only source-to-evidence matrix",
    deliveryChecklistTraceability: "Delivery Checklist Traceability",
    evidenceArtifacts: "Evidence artifacts",
    implementationRefs: "Implementation refs",
    missingEvidence: "Missing evidence refs",
    missingVerification: "Missing verification",
    proofLevel: "Proof level",
    riskNote: "Risk note",
    sourceDocs: "Source docs",
    traceabilitySubtitle: "docs/current to implementation evidence",
    verificationCommands: "Verification commands",
  },
  "zh-CN": {
    boundary: "仅审计的来源到证据矩阵",
    deliveryChecklistTraceability: "交付清单追踪矩阵",
    evidenceArtifacts: "证据 artifacts",
    implementationRefs: "实现引用",
    missingEvidence: "缺少证据引用",
    missingVerification: "缺少验证",
    proofLevel: "证明级别",
    riskNote: "风险说明",
    sourceDocs: "来源文档",
    traceabilitySubtitle: "docs/current 到实现证据",
    verificationCommands: "验证命令",
  },
  "zh-TW": {
    boundary: "僅審計的來源到證據矩陣",
    deliveryChecklistTraceability: "交付清單追蹤矩陣",
    evidenceArtifacts: "證據 artifacts",
    implementationRefs: "實作引用",
    missingEvidence: "缺少證據引用",
    missingVerification: "缺少驗證",
    proofLevel: "證明級別",
    riskNote: "風險說明",
    sourceDocs: "來源文件",
    traceabilitySubtitle: "docs/current 到實作證據",
    verificationCommands: "驗證命令",
  },
  "ja-JP": {
    boundary: "Audit-only source-to-evidence matrix",
    deliveryChecklistTraceability: "Delivery Checklist Traceability",
    evidenceArtifacts: "Evidence artifacts",
    implementationRefs: "Implementation refs",
    missingEvidence: "Missing evidence refs",
    missingVerification: "Missing verification",
    proofLevel: "Proof level",
    riskNote: "Risk note",
    sourceDocs: "Source docs",
    traceabilitySubtitle: "docs/current to implementation evidence",
    verificationCommands: "Verification commands",
  },
  "ko-KR": {
    boundary: "Audit-only source-to-evidence matrix",
    deliveryChecklistTraceability: "Delivery Checklist Traceability",
    evidenceArtifacts: "Evidence artifacts",
    implementationRefs: "Implementation refs",
    missingEvidence: "Missing evidence refs",
    missingVerification: "Missing verification",
    proofLevel: "Proof level",
    riskNote: "Risk note",
    sourceDocs: "Source docs",
    traceabilitySubtitle: "docs/current to implementation evidence",
    verificationCommands: "Verification commands",
  },
  "vi-VN": {
    boundary: "Audit-only source-to-evidence matrix",
    deliveryChecklistTraceability: "Delivery Checklist Traceability",
    evidenceArtifacts: "Evidence artifacts",
    implementationRefs: "Implementation refs",
    missingEvidence: "Missing evidence refs",
    missingVerification: "Missing verification",
    proofLevel: "Proof level",
    riskNote: "Risk note",
    sourceDocs: "Source docs",
    traceabilitySubtitle: "docs/current to implementation evidence",
    verificationCommands: "Verification commands",
  },
  "id-ID": {
    boundary: "Audit-only source-to-evidence matrix",
    deliveryChecklistTraceability: "Delivery Checklist Traceability",
    evidenceArtifacts: "Evidence artifacts",
    implementationRefs: "Implementation refs",
    missingEvidence: "Missing evidence refs",
    missingVerification: "Missing verification",
    proofLevel: "Proof level",
    riskNote: "Risk note",
    sourceDocs: "Source docs",
    traceabilitySubtitle: "docs/current to implementation evidence",
    verificationCommands: "Verification commands",
  },
  "tr-TR": {
    boundary: "Audit-only source-to-evidence matrix",
    deliveryChecklistTraceability: "Delivery Checklist Traceability",
    evidenceArtifacts: "Evidence artifacts",
    implementationRefs: "Implementation refs",
    missingEvidence: "Missing evidence refs",
    missingVerification: "Missing verification",
    proofLevel: "Proof level",
    riskNote: "Risk note",
    sourceDocs: "Source docs",
    traceabilitySubtitle: "docs/current to implementation evidence",
    verificationCommands: "Verification commands",
  },
  "es-ES": {
    boundary: "Audit-only source-to-evidence matrix",
    deliveryChecklistTraceability: "Delivery Checklist Traceability",
    evidenceArtifacts: "Evidence artifacts",
    implementationRefs: "Implementation refs",
    missingEvidence: "Missing evidence refs",
    missingVerification: "Missing verification",
    proofLevel: "Proof level",
    riskNote: "Risk note",
    sourceDocs: "Source docs",
    traceabilitySubtitle: "docs/current to implementation evidence",
    verificationCommands: "Verification commands",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

const deliveryChecklistCloseoutCopy = {
  "en-US": {
    allQueues: "All queues",
    closeoutBoundary: "Review-only closeout boundary",
    closeoutSubtitle: "Operator queue and handoff review",
    deliveryChecklistCloseout: "Delivery Checklist Closeout",
    handoffTarget: "Handoff target",
    missingEvidence: "Missing evidence",
    missingVerification: "Missing verification",
    queue: "Queue",
    rowsShown: "Rows shown",
    topAction: "Top action",
    topQueue: "Top queue",
    topRow: "Top row",
    unresolved: "Unresolved",
  },
  "zh-CN": {
    allQueues: "全部队列",
    closeoutBoundary: "仅审核 closeout 边界",
    closeoutSubtitle: "运营队列与交接审核",
    deliveryChecklistCloseout: "交付清单 Closeout",
    handoffTarget: "交接目标",
    missingEvidence: "缺少证据",
    missingVerification: "缺少验证",
    queue: "队列",
    rowsShown: "展示行",
    topAction: "最高优先级动作",
    topQueue: "最高优先级队列",
    topRow: "最高优先级行",
    unresolved: "未解决",
  },
  "zh-TW": {
    allQueues: "全部佇列",
    closeoutBoundary: "僅審核 closeout 邊界",
    closeoutSubtitle: "營運佇列與交接審核",
    deliveryChecklistCloseout: "交付清單 Closeout",
    handoffTarget: "交接目標",
    missingEvidence: "缺少證據",
    missingVerification: "缺少驗證",
    queue: "佇列",
    rowsShown: "顯示列",
    topAction: "最高優先級動作",
    topQueue: "最高優先級佇列",
    topRow: "最高優先級列",
    unresolved: "未解決",
  },
  "ja-JP": {
    allQueues: "All queues",
    closeoutBoundary: "Review-only closeout boundary",
    closeoutSubtitle: "Operator queue and handoff review",
    deliveryChecklistCloseout: "Delivery Checklist Closeout",
    handoffTarget: "Handoff target",
    missingEvidence: "Missing evidence",
    missingVerification: "Missing verification",
    queue: "Queue",
    rowsShown: "Rows shown",
    topAction: "Top action",
    topQueue: "Top queue",
    topRow: "Top row",
    unresolved: "Unresolved",
  },
  "ko-KR": {
    allQueues: "All queues",
    closeoutBoundary: "Review-only closeout boundary",
    closeoutSubtitle: "Operator queue and handoff review",
    deliveryChecklistCloseout: "Delivery Checklist Closeout",
    handoffTarget: "Handoff target",
    missingEvidence: "Missing evidence",
    missingVerification: "Missing verification",
    queue: "Queue",
    rowsShown: "Rows shown",
    topAction: "Top action",
    topQueue: "Top queue",
    topRow: "Top row",
    unresolved: "Unresolved",
  },
  "vi-VN": {
    allQueues: "All queues",
    closeoutBoundary: "Review-only closeout boundary",
    closeoutSubtitle: "Operator queue and handoff review",
    deliveryChecklistCloseout: "Delivery Checklist Closeout",
    handoffTarget: "Handoff target",
    missingEvidence: "Missing evidence",
    missingVerification: "Missing verification",
    queue: "Queue",
    rowsShown: "Rows shown",
    topAction: "Top action",
    topQueue: "Top queue",
    topRow: "Top row",
    unresolved: "Unresolved",
  },
  "id-ID": {
    allQueues: "All queues",
    closeoutBoundary: "Review-only closeout boundary",
    closeoutSubtitle: "Operator queue and handoff review",
    deliveryChecklistCloseout: "Delivery Checklist Closeout",
    handoffTarget: "Handoff target",
    missingEvidence: "Missing evidence",
    missingVerification: "Missing verification",
    queue: "Queue",
    rowsShown: "Rows shown",
    topAction: "Top action",
    topQueue: "Top queue",
    topRow: "Top row",
    unresolved: "Unresolved",
  },
  "tr-TR": {
    allQueues: "All queues",
    closeoutBoundary: "Review-only closeout boundary",
    closeoutSubtitle: "Operator queue and handoff review",
    deliveryChecklistCloseout: "Delivery Checklist Closeout",
    handoffTarget: "Handoff target",
    missingEvidence: "Missing evidence",
    missingVerification: "Missing verification",
    queue: "Queue",
    rowsShown: "Rows shown",
    topAction: "Top action",
    topQueue: "Top queue",
    topRow: "Top row",
    unresolved: "Unresolved",
  },
  "es-ES": {
    allQueues: "All queues",
    closeoutBoundary: "Review-only closeout boundary",
    closeoutSubtitle: "Operator queue and handoff review",
    deliveryChecklistCloseout: "Delivery Checklist Closeout",
    handoffTarget: "Handoff target",
    missingEvidence: "Missing evidence",
    missingVerification: "Missing verification",
    queue: "Queue",
    rowsShown: "Rows shown",
    topAction: "Top action",
    topQueue: "Top queue",
    topRow: "Top row",
    unresolved: "Unresolved",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

const p1LocaleExpansionStatusState = (
  status: P1LocaleExpansionReadinessStatus,
): PublishState => status === "ready" ? "ready" : "warning";

const p1LocaleExpansionStatusLabel = (
  status: P1LocaleExpansionReadinessStatus,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<P1LocaleExpansionReadinessStatus, string> = {
    deferred: copy.deferred,
    ready: copy.readyActions,
  };

  return labels[status];
};

const deliveryChecklistProofLevelState = (
  proofLevel: DeliveryChecklistTraceabilityProofLevel,
): PublishState =>
  proofLevel === "live_evidence_required"
    ? "blocker"
    : proofLevel === "future_scope"
      ? "warning"
      : "ready";

const deliveryChecklistProofLevelLabel = (
  proofLevel: DeliveryChecklistTraceabilityProofLevel,
) => readableCode(proofLevel);

const deliveryChecklistCloseoutQueueState = (
  queueId: DeliveryChecklistCloseoutQueueId,
): PublishState =>
  queueId === "blocked"
    ? "blocker"
    : queueId === "covered"
      ? "ready"
      : "warning";

const deliveryChecklistCloseoutQueueLabel = (
  queueId: DeliveryChecklistCloseoutQueueId,
  copy: typeof adminOpsCopy["en-US"],
  closeoutCopy: typeof deliveryChecklistCloseoutCopy["en-US"],
) => {
  const labels: Record<DeliveryChecklistCloseoutQueueId, string> = {
    blocked: copy.blocked,
    covered: copy.covered,
    deferred: copy.deferred,
    missing_evidence: closeoutCopy.missingEvidence,
    missing_verification: closeoutCopy.missingVerification,
    needs_review: copy.needsReview,
  };

  return labels[queueId];
};

const deliveryChecklistCloseoutHandoffTargetLabel = (
  target: DeliveryChecklistCloseoutHandoffTarget,
) => target;

const p1LocaleActivationStatusState = (
  status: P1LocaleActivationStatus,
): PublishState =>
  status === "blocked" ? "blocker" : status === "ready" ? "ready" : "warning";

const p1LocaleActivationStatusLabel = (
  status: P1LocaleActivationStatus,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<P1LocaleActivationStatus, string> = {
    blocked: copy.blocked,
    deferred: copy.deferred,
    ready: copy.readyActions,
    review_required: copy.reviewRequired,
  };

  return labels[status];
};

const p1LocaleActivationEvidenceState = (
  state: P1LocaleActivationEvidenceState,
): PublishState => state === "missing" ? "blocker" : state === "ready" ? "ready" : "warning";

const p1LocaleActivationEvidenceLabel = (
  state: P1LocaleActivationEvidenceState,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<P1LocaleActivationEvidenceState, string> = {
    missing: copy.missing,
    partial: copy.partial,
    ready: copy.readyActions,
  };

  return labels[state];
};

const deliveryAcceptanceStatusState = (status: DeliveryAcceptanceStatus) =>
  status === "blocked"
    ? "blocker"
    : status === "partial" || status === "needs_live_evidence" || status === "deferred"
      ? "warning"
      : "ready";

const residualGapMissionQueueStatusState = (
  status: ResidualGapMissionQueueStatus,
): PublishState =>
  status === "launch_blocking"
    ? "blocker"
    : status === "needs_live_evidence" || status === "review_required" || status === "backlog"
      ? "warning"
      : "ready";

const deliveryAcceptanceSeverityState = (
  severity: DeliveryAcceptanceSeverity,
): PublishState =>
  severity === "critical" || severity === "high"
    ? "blocker"
    : severity === "medium"
      ? "warning"
      : "ready";

const aiContentLifecycleState = (lifecycle: AiContentArtifactLifecycle) =>
  lifecycle === "ai_draft" || lifecycle === "edited" ? "warning" : "ready";

const aiContentGateState = (status: AiContentQualityGateStatus) =>
  status === "blocked" ? "blocker" : status === "warning" ? "warning" : "ready";

const readableCode = (value: string) => value.replace(/_/g, " ");

const exportReadinessState = (readiness: ExportReadinessState) =>
  readiness === "blocked" ? "blocker" : readiness === "review_required" ? "warning" : "ready";

const advancedAnalyticsReadinessState = (readiness: AdvancedAnalyticsReadinessState) =>
  readiness === "blocked" ? "blocker" : readiness === "ready" ? "ready" : "warning";

const advancedAnalyticsReadinessLabel = (
  readiness: AdvancedAnalyticsReadinessState,
  copy: typeof adminOpsCopy["en-US"],
) => {
  if (readiness === "ready") {
    return copy.readyActions;
  }

  if (readiness === "local_only") {
    return copy.localOnlyReadiness;
  }

  return readiness === "review_required" ? copy.reviewRequired : copy.blocked;
};

const lifecycleOperationState = (state: CampaignLifecycleOperationState) => {
  if (state === "blocked") {
    return "blocker";
  }

  return state === "review_required" || state === "not_applicable" ? "warning" : "ready";
};

const lifecycleOperationStateLabel = (
  state: CampaignLifecycleOperationState,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<CampaignLifecycleOperationState, string> = {
    allowed: copy.lifecycleAllowed,
    blocked: copy.blocked,
    not_applicable: copy.notApplicable,
    review_required: copy.reviewRequired,
  };

  return labels[state];
};

const lifecycleStatusLabel = (status: CampaignLifecycleStatus) => {
  const labels: Record<CampaignLifecycleStatus, string> = {
    archived: "Archived",
    ai_draft: "AI Draft",
    draft: "Draft",
    ended: "Ended",
    exported: "Exported",
    human_review: "Human Review",
    live: "Live",
    paused: "Paused",
    scheduled: "Scheduled",
  };

  return labels[status];
};

const lifecycleOwnerLabel = (ownerRole: CampaignLifecycleOperation["ownerRole"]) =>
  ownerRole.replace(/_/g, " ");

const launchConsoleReviewState = (
  state: LaunchConsoleBundleStatus | LaunchConsoleGateState | LaunchConsoleHandoffReviewState,
) => {
  if (state === "blocked") {
    return "blocker";
  }

  return state === "ready" || state === "passed" ? "ready" : "warning";
};

const launchConsoleReviewStateLabel = (
  state: LaunchConsoleBundleStatus | LaunchConsoleGateState | LaunchConsoleHandoffReviewState,
  copy: typeof adminOpsCopy["en-US"],
) => {
  if (state === "ready" || state === "passed") {
    return copy.readyActions;
  }

  if (state === "local_only") {
    return copy.localOnly;
  }

  if (state === "review_required") {
    return copy.reviewRequired;
  }

  return state === "warning" ? copy.warning : copy.blocked;
};

const aiOptimizationStatusState = (status: AiOptimizationActionStatus) =>
  status === "blocked"
    ? "blocker"
    : status === "review_required"
      ? "warning"
      : "ready";

const aiOptimizationStatusLabel = (
  status: AiOptimizationActionStatus,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<AiOptimizationActionStatus, string> = {
    adopted_preview: copy.adoptedPreview,
    blocked: copy.blocked,
    ready_to_review: copy.readyToReview,
    review_required: copy.reviewRequired,
  };

  return labels[status];
};

const aiReportHandoffState = (status: AiOpsReportHandoffStatus) =>
  status === "blocked" ? "blocker" : status === "review_required" ? "warning" : "ready";

const aiReportHandoffLabel = (
  status: AiOpsReportHandoffStatus,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<AiOpsReportHandoffStatus, string> = {
    blocked: copy.blocked,
    ready_to_review: copy.readyToReview,
    review_required: copy.reviewRequired,
  };

  return labels[status];
};

const competitorWatchReviewState = (status: CompetitorWatchReviewState) =>
  status === "blocked" ? "blocker" : status === "review_required" ? "warning" : "ready";

const competitorWatchReviewStateLabel = (
  status: CompetitorWatchReviewState,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<CompetitorWatchReviewState, string> = {
    blocked: copy.blocked,
    ready: copy.readyToReview,
    review_required: copy.reviewRequired,
  };

  return labels[status];
};

const competitorWatchDifferentiatorLabel = (differentiator: CompetitorWatchDifferentiator) =>
  readableCode(differentiator);

const providerReadinessState = (readiness: string) =>
  readiness === "blocked"
    ? "blocker"
    : readiness === "review_required" || readiness === "unavailable"
      ? "warning"
      : "ready";

const templateGovernanceState = (status: TemplateGovernanceStatus) =>
  status === "blocked" ? "blocker" : status === "warning" ? "warning" : "ready";

const templateSignalLabel = (
  signal: TemplateGovernanceSignal,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<TemplateGovernanceSignal, string> = {
    localization_review: copy.localizationReview,
    risk_review: copy.riskReview,
    verification_strength: copy.strongVerification,
    wallet_coverage: copy.walletCoverage,
  };

  return labels[signal];
};

const templateStatusLabel = (
  status: TemplateGovernanceStatus,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<TemplateGovernanceStatus, string> = {
    blocked: copy.templateStatusBlocked,
    ready: copy.templateStatusReady,
    warning: copy.templateStatusWarning,
  };

  return labels[status];
};

const deliveryChecklistStatusLabel = (
  status: DeliveryChecklistStatus,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<DeliveryChecklistStatus, string> = {
    blocked: copy.blocker,
    covered: copy.covered,
    deferred: copy.deferred,
    needs_review: copy.needsReview,
  };

  return labels[status];
};

const deliveryAcceptanceStatusLabel = (
  status: DeliveryAcceptanceStatus,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<DeliveryAcceptanceStatus, string> = {
    blocked: copy.blocked,
    deferred: copy.deferred,
    needs_live_evidence: copy.needsLiveEvidence,
    partial: copy.partial,
    proven: copy.proven,
  };

  return labels[status];
};

const residualGapMissionQueueStatusLabel = (
  status: ResidualGapMissionQueueStatus,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<ResidualGapMissionQueueStatus, string> = {
    backlog: copy.backlogItems,
    launch_blocking: copy.launchBlocking,
    needs_live_evidence: copy.needsLiveEvidence,
    review_required: copy.reviewRequired,
  };

  return labels[status];
};

const walletProviderQaSeededState = (status: WalletProviderQaSeededStatus) =>
  status === "ready" ? "ready" : "warning";

const walletProviderQaLiveState = (status: WalletProviderQaLiveEvidenceStatus) =>
  status === "ready" ? "ready" : status === "blocked" ? "blocker" : "warning";

const walletProviderQaImpactState = (impact: WalletProviderQaReleaseImpact) =>
  impact === "release_blocker" ? "blocker" : impact === "ready" ? "ready" : "warning";

const walletProviderEvidenceStatusState = (status: WalletProviderEvidenceStatus) => {
  if (status === "approved" || status === "not_applicable") {
    return "ready";
  }

  return status === "rejected" || status === "expired" ? "blocker" : "warning";
};

const walletProviderEvidenceReviewState = (state: WalletProviderEvidenceReviewState) => {
  if (state === "approved" || state === "not_applicable") {
    return "ready";
  }

  return state === "rejected" || state === "expired" ? "blocker" : "warning";
};

const walletProviderEvidenceReleaseImpactState = (impact: WalletProviderEvidenceReleaseImpact) =>
  impact === "blocked" ? "blocker" : impact === "review_required" ? "warning" : "ready";

const walletProviderEvidenceApprovalState = (state: WalletProviderEvidenceApprovalState) => {
  if (state === "approved" || state === "not_applicable") {
    return "ready";
  }

  return state === "blocked" ? "blocker" : "warning";
};

const walletProviderEvidenceReleaseState = (state: WalletProviderEvidenceReleaseState) => {
  if (state === "ready" || state === "not_applicable") {
    return "ready";
  }

  return state === "blocked" ? "blocker" : "warning";
};

const walletProviderEvidenceRequestState = (state: WalletProviderEvidenceRequestStatus) => {
  if (state === "ready" || state === "not_applicable") {
    return "ready";
  }

  return state === "blocked" ? "blocker" : "warning";
};

const walletProviderEvidenceActivationState = (state: WalletProviderEvidenceActivationState) => {
  if (state === "ready") {
    return "ready";
  }

  return state === "blocked" ? "blocker" : "warning";
};

const walletProviderEvidenceActivationFeatureGateState = (
  state: WalletProviderEvidenceActivationFeatureGateState,
) => {
  if (state === "approved") {
    return "ready";
  }

  return state === "blocked" || state === "disabled" ? "blocker" : "warning";
};

const walletProviderEvidenceActivationReviewerState = (
  state: WalletProviderEvidenceActivationReviewerState,
) => {
  if (state === "approved") {
    return "ready";
  }

  return state === "rejected" ? "blocker" : "warning";
};

const walletProviderEvidenceApprovalRuleState = (state: WalletProviderEvidenceApprovalRuleState) => {
  if (state === "passed" || state === "not_applicable") {
    return "ready";
  }

  return state === "blocked" ? "blocker" : "warning";
};

const providerLiveEvidenceState = (status: ProviderLiveEvidenceStatus) =>
  status === "blocked" ? "blocker" : status === "ready" ? "ready" : "warning";

const providerFeatureGateState = (state: ProviderFeatureGateState) =>
  state === "disabled" ? "blocker" : "warning";

const serviceStateLabel = (
  state: ExternalServiceState,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<ExternalServiceState, string> = {
    disabled: copy.disabledServices,
    enabled_preview: copy.enabledPreview,
    maintenance: copy.maintenanceServices,
    offline: copy.offlineServices,
    review_required: copy.reviewRequired,
  };

  return labels[state];
};

const serviceStateBadge = (entry: ExternalServiceRegistryEntry) => {
  if (entry.releaseImpact === "release_blocker" || entry.fallback.blocksLaunch || entry.state === "offline") {
    return "blocker";
  }

  return entry.state === "enabled_preview" && !entry.featureGate.reviewRequired ? "ready" : "warning";
};

const serviceReleaseImpactLabel = (
  impact: ExternalServiceReleaseImpact,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<ExternalServiceReleaseImpact, string> = {
    informational: copy.informational,
    needs_review: copy.needsReview,
    ready: copy.readyActions,
    release_blocker: copy.releaseBlocker,
  };

  return labels[impact];
};

const serviceReleaseImpactState = (impact: ExternalServiceReleaseImpact) =>
  impact === "release_blocker" ? "blocker" : impact === "ready" ? "ready" : "warning";

const serviceLiveEvidenceLabel = (
  status: ExternalServiceLiveEvidenceStatus,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<ExternalServiceLiveEvidenceStatus, string> = {
    blocked: copy.blocked,
    missing: copy.missing,
    not_applicable: copy.notApplicable,
    ready: copy.liveEvidenceReady,
  };

  return labels[status];
};

const serviceLiveEvidenceState = (status: ExternalServiceLiveEvidenceStatus) =>
  status === "blocked" ? "blocker" : status === "ready" ? "ready" : "warning";

const adapterReadinessState = (readiness: AelfWebLoginAdapterReadiness) => {
  if (readiness === "blocked" || readiness === "unavailable") {
    return "blocker";
  }

  return readiness === "ready" ? "ready" : "warning";
};

const adapterLiveEvidenceState = (status: AelfWebLoginAdapterLiveEvidenceStatus) => {
  if (status === "blocked") {
    return "blocker";
  }

  return status === "ready" ? "ready" : "warning";
};

const liveConnectorReadinessState = (readiness: LiveWalletConnectorReadiness) => {
  if (readiness === "blocked") {
    return "blocker";
  }

  return readiness === "approved" ? "ready" : "warning";
};

const liveConnectorEvidenceState = (status: LiveWalletConnectorLiveEvidenceStatus) => {
  if (status === "blocked") {
    return "blocker";
  }

  return status === "ready" ? "ready" : "warning";
};

const providerPathPriority = (entry: {
  adapterReadiness: string;
  liveEvidenceStatus: string;
  fallback: { blocksLaunch: boolean };
}) => {
  if (entry.adapterReadiness === "blocked" || entry.fallback.blocksLaunch) {
    return 0;
  }

  if (entry.adapterReadiness === "unavailable") {
    return 1;
  }

  if (entry.adapterReadiness === "review_required") {
    return 2;
  }

  if (entry.liveEvidenceStatus === "missing") {
    return 3;
  }

  return 4;
};

const walletProviderQaSeededLabel = (
  status: WalletProviderQaSeededStatus,
  copy: typeof adminOpsCopy["en-US"],
) => (status === "ready" ? copy.seededReady : copy.missing);

const walletProviderQaLiveLabel = (
  status: WalletProviderQaLiveEvidenceStatus,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<WalletProviderQaLiveEvidenceStatus, string> = {
    blocked: copy.blocked,
    missing: copy.missing,
    not_applicable: copy.notApplicable,
    ready: copy.liveEvidenceReady,
  };

  return labels[status];
};

const walletProviderQaImpactLabel = (
  impact: WalletProviderQaReleaseImpact,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<WalletProviderQaReleaseImpact, string> = {
    informational: copy.informational,
    needs_review: copy.needsReview,
    ready: copy.readyToReview,
    release_blocker: copy.releaseBlocker,
  };

  return labels[impact];
};

const walletProviderEvidenceStatusLabel = (
  status: WalletProviderEvidenceStatus,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<WalletProviderEvidenceStatus, string> = {
    approved: copy.walletProviderEvidenceStatusApproved,
    expired: copy.walletProviderEvidenceStatusExpired,
    missing: copy.walletProviderEvidenceStatusMissing,
    not_applicable: copy.walletProviderEvidenceStatusNotApplicable,
    rejected: copy.walletProviderEvidenceStatusRejected,
    submitted: copy.walletProviderEvidenceStatusSubmitted,
  };

  return labels[status];
};

const walletProviderEvidenceReviewLabel = (
  state: WalletProviderEvidenceReviewState,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<WalletProviderEvidenceReviewState, string> = {
    approved: copy.walletProviderEvidenceReviewApproved,
    expired: copy.walletProviderEvidenceReviewExpired,
    in_review: copy.walletProviderEvidenceReviewInReview,
    not_applicable: copy.walletProviderEvidenceReviewNotApplicable,
    not_started: copy.walletProviderEvidenceReviewNotStarted,
    rejected: copy.walletProviderEvidenceReviewRejected,
  };

  return labels[state];
};

const walletProviderEvidenceReleaseImpactLabel = (
  impact: WalletProviderEvidenceReleaseImpact,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<WalletProviderEvidenceReleaseImpact, string> = {
    blocked: copy.walletProviderEvidenceReleaseImpactBlocked,
    not_applicable: copy.walletProviderEvidenceReleaseImpactNotApplicable,
    ready: copy.walletProviderEvidenceReleaseImpactReady,
    review_required: copy.walletProviderEvidenceReleaseImpactReviewRequired,
  };

  return labels[impact];
};

const walletProviderEvidenceApprovalStateLabel = (
  state: WalletProviderEvidenceApprovalState,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<WalletProviderEvidenceApprovalState, string> = {
    approved: copy.walletProviderApprovalStateApproved,
    blocked: copy.walletProviderApprovalStateBlocked,
    not_applicable: copy.walletProviderApprovalStateNotApplicable,
    review_required: copy.walletProviderApprovalStateReviewRequired,
  };

  return labels[state];
};

const walletProviderEvidenceReleaseStateLabel = (
  state: WalletProviderEvidenceReleaseState,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<WalletProviderEvidenceReleaseState, string> = {
    blocked: copy.walletProviderReleaseStateBlocked,
    not_applicable: copy.walletProviderReleaseStateNotApplicable,
    ready: copy.walletProviderReleaseStateReady,
    review_required: copy.walletProviderReleaseStateReviewRequired,
  };

  return labels[state];
};

const walletProviderEvidenceRequestStatusLabel = (
  status: WalletProviderEvidenceRequestStatus,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<WalletProviderEvidenceRequestStatus, string> = {
    blocked: copy.walletProviderRequestStatusBlocked,
    not_applicable: copy.walletProviderRequestStatusNotApplicable,
    ready: copy.walletProviderRequestStatusReady,
    review_required: copy.walletProviderRequestStatusReviewRequired,
  };

  return labels[status];
};

const walletProviderEvidenceActivationStateLabel = (
  state: WalletProviderEvidenceActivationState,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<WalletProviderEvidenceActivationState, string> = {
    blocked: copy.walletProviderActivationStateBlocked,
    ready: copy.walletProviderActivationStateReady,
    review_required: copy.walletProviderActivationStateReviewRequired,
  };

  return labels[state];
};

const walletProviderEvidenceActivationFeatureGateLabel = (
  state: WalletProviderEvidenceActivationFeatureGateState,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<WalletProviderEvidenceActivationFeatureGateState, string> = {
    approved: copy.walletProviderActivationFeatureGateApproved,
    blocked: copy.walletProviderActivationFeatureGateBlocked,
    disabled: copy.walletProviderActivationFeatureGateDisabled,
    review_required: copy.walletProviderActivationFeatureGateReviewRequired,
  };

  return labels[state];
};

const walletProviderEvidenceActivationReviewerLabel = (
  state: WalletProviderEvidenceActivationReviewerState,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<WalletProviderEvidenceActivationReviewerState, string> = {
    approved: copy.walletProviderActivationReviewerApproved,
    pending: copy.walletProviderActivationReviewerPending,
    rejected: copy.walletProviderActivationReviewerRejected,
  };

  return labels[state];
};

const walletProviderEvidenceApprovalRuleStateLabel = (
  state: WalletProviderEvidenceApprovalRuleState,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<WalletProviderEvidenceApprovalRuleState, string> = {
    blocked: copy.walletProviderEvidenceApprovalRuleBlocked,
    needs_review: copy.walletProviderEvidenceApprovalRuleReview,
    not_applicable: copy.notApplicable,
    passed: copy.walletProviderEvidenceApprovalRulePassed,
  };

  return labels[state];
};

const walletProviderEvidenceArtifactTypeLabel = (
  artifactType: WalletProviderEvidenceArtifactType,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<WalletProviderEvidenceArtifactType, string> = {
    config_snapshot: copy.walletProviderEvidenceArtifactConfigSnapshot,
    qa_run: copy.walletProviderEvidenceArtifactQaRun,
    review_note: copy.walletProviderEvidenceArtifactReviewNote,
    runbook: copy.walletProviderEvidenceArtifactRunbook,
    screenshot: copy.walletProviderEvidenceArtifactScreenshot,
  };

  return labels[artifactType];
};

const walletProviderEvidenceReviewActionIcon: Record<WalletProviderEvidenceReviewActionId, LucideIcon> = {
  approve_evidence: CheckCircle2,
  reject_evidence: XCircle,
  reopen_evidence: RotateCcw,
  submit_evidence: FileCheck2,
};

const walletProviderEvidenceReviewActionLabel = (
  actionId: WalletProviderEvidenceReviewActionId,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<WalletProviderEvidenceReviewActionId, string> = {
    approve_evidence: copy.walletProviderReviewActionApprove,
    reject_evidence: copy.walletProviderReviewActionReject,
    reopen_evidence: copy.walletProviderReviewActionReopen,
    submit_evidence: copy.walletProviderReviewActionSubmit,
  };

  return labels[actionId];
};

const walletProviderEvidenceLocalReferences = (
  scenarioId: WalletProviderQaScenarioId,
  artifactIds: string[],
): WalletProviderEvidenceReviewArtifactReference[] => {
  const artifactTypeById = (artifactId: string): WalletProviderEvidenceArtifactType =>
    artifactId.endsWith("-qa-run")
      ? "qa_run"
      : artifactId.endsWith("-runbook")
        ? "runbook"
        : "screenshot";

  return artifactIds.map((artifactId) => ({
    artifactType: artifactTypeById(artifactId),
    reference: `local-wallet-qa/${scenarioId}/${artifactId}-review-reference`,
  }));
};

const walletProviderEvidenceResultState = (
  result: WalletProviderEvidenceReviewActionResult,
): PublishState => result.ok
  ? result.releaseReadiness.summary.ready
    ? "ready"
    : "warning"
    : "blocker";

const walletProviderEvidenceRecoverySourceLabel = (
  source: WalletProviderEvidenceRecoverySource,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<WalletProviderEvidenceRecoverySource, string> = {
    in_memory_action: copy.walletProviderRecoverySourceInMemoryAction,
    local_sample: copy.walletProviderRecoverySourceLocalSample,
    local_storage: copy.walletProviderRecoverySourceLocalStorage,
    seeded_default: copy.walletProviderRecoverySourceSeededDefault,
  };

  return labels[source];
};

const walletProviderEvidenceRecoveryStorageLabel = (
  state: WalletProviderEvidenceRecoveryStorageState,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<WalletProviderEvidenceRecoveryStorageState, string> = {
    available: copy.walletProviderRecoveryStorageAvailable,
    not_requested: copy.walletProviderRecoveryStorageNotRequested,
    read_failed: copy.walletProviderRecoveryStorageReadFailed,
    unavailable: copy.walletProviderRecoveryStorageUnavailable,
    write_failed: copy.walletProviderRecoveryStorageWriteFailed,
  };

  return labels[state];
};

const walletProviderEvidenceRecoveryStorageBadgeState = (
  state: WalletProviderEvidenceRecoveryStorageState,
): PublishState =>
  state === "available" || state === "not_requested"
    ? "ready"
    : state === "write_failed" || state === "read_failed"
      ? "warning"
      : "blocker";

const walletProviderEvidenceRecoveryStatusLabel = (
  status: WalletProviderEvidenceRecoveryStatus,
  copy: typeof adminOpsCopy["en-US"],
) => {
  if (status === "fallback_invalid_snapshot") {
    return copy.walletProviderRecoveryFallback;
  }

  if (status === "seeded_default") {
    return copy.walletProviderRecoverySourceSeededDefault;
  }

  return copy.walletProviderRecoveryRestored;
};

const walletCompatibilityLabel = (
  value: string,
  copy: typeof adminOpsCopy["en-US"],
) => {
  if (value === "ANY") {
    return copy.walletAny;
  }
  if (value === "AA_ONLY") {
    return copy.walletAaOnly;
  }

  return copy.walletEoaOnly;
};

export const AdminOpsPanel = ({
  campaign = campaignDetail,
  locale,
}: AdminOpsPanelProps) => {
  const copy = adminOpsCopy[locale];
  const adminOps = createAdminOpsReadModel(campaign);
  const [walletProviderEvidenceActionResult, setWalletProviderEvidenceActionResult] =
    useState<WalletProviderEvidenceReviewActionResult | null>(null);
  const [deliveryChecklistCloseoutFilter, setDeliveryChecklistCloseoutFilter] =
    useState<DeliveryChecklistCloseoutQueueFilter>("all");
  const [walletProviderEvidenceRecoveryUi, setWalletProviderEvidenceRecoveryUi] =
    useState<WalletProviderEvidenceRecoveryInitialUiState>(() =>
      createWalletProviderEvidenceRecoveryInitialUiState(
        readWalletProviderEvidenceRecoverySnapshot(),
        nowIso(),
      ));
  const exportReadiness = createExportConfirmationReadinessGate(campaign);
  const exportArtifact = createExportArtifact(campaign.exportPreview, "csv");
  const exportFulfillmentReadiness = adminOps.exportFulfillmentReadiness;
  const aiOptimization = adminOps.aiOptimization;
  const aiReportHandoff = adminOps.aiReportHandoff;
  const competitorWatch = adminOps.competitorWatch;
  const advancedAnalytics = adminOps.advancedAnalytics;
  const aiContentPack = adminOps.aiContentPack;
  const templateGovernance = adminOps.templateGovernance;
  const deliveryChecklist = adminOps.deliveryChecklistReadiness;
  const deliveryChecklistTraceability = deliveryChecklist.traceability;
  const traceCopy = deliveryChecklistTraceabilityCopy[locale];
  const deliveryChecklistCloseout = deliveryChecklist.closeout;
  const closeoutCopy = deliveryChecklistCloseoutCopy[locale];
  const deliveryChecklistCloseoutRows =
    deliveryChecklistCloseoutFilter === "all"
      ? deliveryChecklistCloseout.rows
      : deliveryChecklistCloseout.queues.find((queue) => queue.id === deliveryChecklistCloseoutFilter)?.rows ?? [];
  const deliveryChecklistCloseoutTopRow =
    deliveryChecklistCloseout.summary.topRowId === null
      ? null
      : deliveryChecklistCloseout.rows.find((row) => row.id === deliveryChecklistCloseout.summary.topRowId) ?? null;
  const p1LocaleActivationReadiness = adminOps.p1LocaleActivationReadiness;
  const walletProviderEvidenceRecovery = recoverWalletProviderEvidenceState(
    campaign,
    adminOps.walletProviderQaGate,
    walletProviderEvidenceRecoveryUi.snapshot,
    {
      source: walletProviderEvidenceRecoveryUi.source,
      storageKey: walletProviderEvidenceRecoveryStorageKey,
      storageState: walletProviderEvidenceRecoveryUi.storageState,
    },
  );
  const deliveryAcceptance = walletProviderEvidenceRecovery.deliveryAcceptance;
  const contractClaimPreapprovalPackage = adminOps.contractClaimPreapprovalPackage;
  const residualGapMissionQueue = createResidualGapMissionQueue(deliveryAcceptance, {
    contractClaimPreapprovalPackage,
  });
  const walletProviderEvidenceIntake = walletProviderEvidenceRecovery.intake;
  const walletProviderEvidenceApprovalAudit = walletProviderEvidenceRecovery.approvalAudit;
  const walletProviderEvidenceReleaseReadiness = walletProviderEvidenceRecovery.releaseReadiness;
  const walletProviderEvidenceCloseoutPackage = walletProviderEvidenceRecovery.closeoutPackage;
  const walletProviderEvidenceRequestPacket = walletProviderEvidenceRecovery.requestPacket;
  const walletProviderEvidenceActivation = createWalletProviderEvidenceActivation(
    walletProviderEvidenceRequestPacket,
    walletProviderEvidenceReleaseReadiness,
  );
  const lifecycleOperations = adminOps.lifecycleOperations;
  const launchConsoleBundles = adminOps.launchConsoleCampaignBundles;
  const launchBlockingGates = launchConsoleBundles.bundles.flatMap((bundle) =>
    bundle.gateEvidence
      .filter((gate) => gate.blocksLaunch || gate.state === "blocked" || gate.state === "review_required")
      .map((gate) => ({ bundle, gate })),
  );
  const riskIntelligence = adminOps.riskIntelligence;
  const antiSybilV2Readiness = adminOps.antiSybilV2GraphReadiness;
  const lifecycleReviewRows = lifecycleOperations.operations.filter((operation) =>
    [
      "generate-ai-draft",
      "submit-human-review",
      "schedule-campaign",
      "publish-campaign",
      "pause-campaign",
      "resume-campaign",
      "end-campaign",
      "export-campaign",
      "archive-campaign",
    ].includes(operation.id),
  );
  const providerEvidenceRegistry = adminOps.providerEvidenceRegistry;
  const walletAdapterReadiness = adminOps.aelfWebLoginAdapterReadiness;
  const liveWalletConnectorBoundary = createLiveWalletConnectorBoundary();
  const providerEvidenceRegistryEntries = [...providerEvidenceRegistry.entries].sort(
    (left, right) => providerPathPriority(left) - providerPathPriority(right),
  );
  const serviceGovernance = createServiceDegradationGovernance();
  const serviceSummaryItems = [
    {
      id: "total",
      label: copy.totalItems,
      state: "ready" as const,
      value: serviceGovernance.summary.totalServices,
    },
    {
      id: "enabled-preview",
      label: copy.enabledPreview,
      state: "ready" as const,
      value: serviceGovernance.summary.enabledPreviewServices,
    },
    {
      id: "disabled",
      label: copy.disabledServices,
      state: serviceGovernance.summary.disabledServices > 0 ? "warning" as const : "ready" as const,
      value: serviceGovernance.summary.disabledServices,
    },
    {
      id: "maintenance",
      label: copy.maintenanceServices,
      state: serviceGovernance.summary.maintenanceServices > 0 ? "warning" as const : "ready" as const,
      value: serviceGovernance.summary.maintenanceServices,
    },
    {
      id: "review-required",
      label: copy.reviewRequired,
      state: serviceGovernance.summary.reviewRequiredServices > 0 ? "warning" as const : "ready" as const,
      value: serviceGovernance.summary.reviewRequiredServices,
    },
    {
      id: "offline",
      label: copy.offlineServices,
      state: serviceGovernance.summary.offlineServices > 0 ? "blocker" as const : "ready" as const,
      value: serviceGovernance.summary.offlineServices,
    },
    {
      id: "release-blockers",
      label: copy.releaseBlockers,
      state: serviceGovernance.summary.releaseBlockers > 0 ? "blocker" as const : "ready" as const,
      value: serviceGovernance.summary.releaseBlockers,
    },
    {
      id: "high-impact-blockers",
      label: copy.highImpactBlockers,
      state: serviceGovernance.summary.highImpactBlockers > 0 ? "blocker" as const : "ready" as const,
      value: serviceGovernance.summary.highImpactBlockers,
    },
  ];
  const contractClaimReadiness = computePublishReadiness(
    { contractMode: "CONTRACT_CLAIM" },
    campaign.contentRevisions,
  );
  const contractReviewCenter = adminOps.contractReviewCenter;
  const contractInterfaceMatrix = adminOps.contractInterfaceMatrix;
  const contractTransparencyMonitor = adminOps.contractTransparencyMonitor;
  const companionContractReadiness = adminOps.companionContractReadiness;
  const columnContract = adminOps.exportBatch.columns.join(",");
  const verificationRows = campaign.participants.flatMap((participant) =>
    createParticipationReadModel(campaign, participant).taskStates.map((state) => ({
      participant,
      state,
    })),
  );
  const verificationProviderReadinessCounts = verificationRows.reduce<Record<string, number>>(
    (counts, row) => {
      counts[row.state.provider.readiness] = (counts[row.state.provider.readiness] ?? 0) + 1;
      return counts;
    },
    {},
  );
  const verificationManualReviewRows = verificationRows.filter((row) => row.state.manualReview.queued);
  const verificationRiskRows = verificationRows.filter((row) => row.state.riskFlags.length > 0);
  const verificationActionRows = verificationRows.filter(
    (row) =>
      row.state.status !== "completed" ||
      row.state.manualReview.queued ||
      row.state.riskFlags.length > 0 ||
      row.state.provider.readiness !== "local_only",
  );
  const warningCount = campaign.publishReadiness.warnings.length;
  const blockerCount = contractClaimReadiness.blockers.length;
  const contractReviewSummary = [
    {
      id: "contract-mode",
      label: copy.contractMode,
      value: modeLabel(contractReviewCenter.selectedMode),
      badge: (
        <ContractModeBadge
          label={modeLabel(contractReviewCenter.selectedMode)}
          mode={contractReviewCenter.selectedMode}
        />
      ),
    },
    {
      id: "v2-companion",
      label: copy.v2CompanionNeeded,
      value: getLocalizedText(contractReviewCenter.v2CompanionNeeded, locale),
    },
    {
      id: "metadata-hash",
      label: copy.metadataHash,
      value: getLocalizedText(contractReviewCenter.metadataHash, locale),
    },
    {
      id: "verifier-role",
      label: copy.verifierRole,
      value: getLocalizedText(contractReviewCenter.verifierRole, locale),
    },
    {
      id: "reward-custody",
      label: copy.rewardCustody,
      value: getLocalizedText(contractReviewCenter.rewardCustody, locale),
    },
  ];
  const contractTransparencySummary = [
    {
      id: "total",
      label: copy.totalLanes,
      value: contractTransparencyMonitor.summary.totalLanes,
      state: "ready" as const,
    },
    {
      id: "ready",
      label: copy.readyActions,
      value: contractTransparencyMonitor.summary.readyLanes,
      state: "ready" as const,
    },
    {
      id: "review-required",
      label: copy.reviewRequired,
      value: contractTransparencyMonitor.summary.reviewRequiredLanes,
      state: contractTransparencyMonitor.summary.reviewRequiredLanes > 0
        ? "warning" as const
        : "ready" as const,
    },
    {
      id: "blocked",
      label: copy.blocked,
      value: contractTransparencyMonitor.summary.blockedLanes,
      state: contractTransparencyMonitor.summary.blockedLanes > 0
        ? "blocker" as const
        : "ready" as const,
    },
    {
      id: "local-only",
      label: copy.localOnlyReadiness,
      value: contractTransparencyMonitor.summary.localOnlyLanes,
      state: contractTransparencyMonitor.summary.localOnlyLanes > 0
        ? "warning" as const
        : "ready" as const,
    },
  ];

  const contractClaimPreapprovalSummary = [
    {
      id: "total",
      label: copy.totalGates,
      value: contractClaimPreapprovalPackage.summary.totalGates,
      state: "ready" as const,
    },
    {
      id: "blocked",
      label: copy.blocked,
      value: contractClaimPreapprovalPackage.summary.blockedGates,
      state: contractClaimPreapprovalPackage.summary.blockedGates > 0 ? "blocker" as const : "ready" as const,
    },
    {
      id: "review-required",
      label: copy.reviewRequiredGates,
      value: contractClaimPreapprovalPackage.summary.reviewRequiredGates,
      state: contractClaimPreapprovalPackage.summary.reviewRequiredGates > 0
        ? "warning" as const
        : "ready" as const,
    },
  ];
  const contractClaimPreapprovalTopGate = contractClaimPreapprovalPackage.gates.find(
    (gate) => gate.id === contractClaimPreapprovalPackage.summary.topGateId,
  ) ?? contractClaimPreapprovalPackage.gates[0];

  const companionReadinessSummary = [
    {
      id: "total",
      label: copy.totalCategories,
      value: companionContractReadiness.summary.totalCategories,
      state: "ready" as const,
    },
    {
      id: "required",
      label: copy.requiredCategories,
      value: companionContractReadiness.summary.requiredCategories,
      state: "ready" as const,
    },
    {
      id: "proven",
      label: copy.provenCategories,
      value: companionContractReadiness.summary.provenCategories,
      state: companionContractReadiness.summary.ready ? "ready" as const : "warning" as const,
    },
    {
      id: "review-required",
      label: copy.reviewRequired,
      value: companionContractReadiness.summary.reviewRequiredCategories,
      state: companionContractReadiness.summary.reviewRequiredCategories > 0
        ? "warning" as const
        : "ready" as const,
    },
    {
      id: "deferred",
      label: copy.deferredNonGoals,
      value: companionContractReadiness.summary.deferredNonGoalCategories,
      state: companionContractReadiness.summary.deferredNonGoalCategories > 0
        ? "warning" as const
        : "ready" as const,
    },
    {
      id: "blocked",
      label: copy.blockedNonGoals,
      value: companionContractReadiness.summary.blockedExecutionCategories,
      state: companionContractReadiness.summary.blockedExecutionCategories > 0
        ? "blocker" as const
        : "ready" as const,
    },
  ];

  const deliveryAcceptanceSummaryItems = [
    {
      id: "solution-sets",
      label: copy.solutionSets,
      value: deliveryAcceptance.summary.solutionSetCount,
      state: "ready" as const,
    },
    {
      id: "total-rows",
      label: copy.totalRows,
      value: deliveryAcceptance.summary.totalRows,
      state: "ready" as const,
    },
    {
      id: "proven",
      label: copy.proven,
      value: deliveryAcceptance.summary.proven,
      state: "ready" as const,
    },
    {
      id: "partial",
      label: copy.partial,
      value: deliveryAcceptance.summary.partial,
      state: deliveryAcceptance.summary.partial > 0 ? "warning" as const : "ready" as const,
    },
    {
      id: "needs-live-evidence",
      label: copy.needsLiveEvidence,
      value: deliveryAcceptance.summary.needsLiveEvidence,
      state: deliveryAcceptance.summary.needsLiveEvidence > 0 ? "warning" as const : "ready" as const,
    },
    {
      id: "blocked",
      label: copy.blocked,
      value: deliveryAcceptance.summary.blocked,
      state: deliveryAcceptance.summary.blocked > 0 ? "blocker" as const : "ready" as const,
    },
    {
      id: "deferred",
      label: copy.deferred,
      value: deliveryAcceptance.summary.deferred,
      state: deliveryAcceptance.summary.deferred > 0 ? "warning" as const : "ready" as const,
    },
  ];

  const residualGapMissionQueueSummaryItems = [
    {
      id: "total-items",
      label: copy.totalItems,
      value: residualGapMissionQueue.summary.totalItems,
      state: residualGapMissionQueue.summary.totalItems > 0 ? "warning" as const : "ready" as const,
    },
    {
      id: "launch-blocking",
      label: copy.launchBlockingItems,
      value: residualGapMissionQueue.summary.launchBlockingItems,
      state: residualGapMissionQueue.summary.launchBlockingItems > 0 ? "blocker" as const : "ready" as const,
    },
    {
      id: "review-required",
      label: copy.reviewRequiredItems,
      value: residualGapMissionQueue.summary.reviewRequiredItems,
      state: residualGapMissionQueue.summary.reviewRequiredItems > 0 ? "warning" as const : "ready" as const,
    },
    {
      id: "backlog",
      label: copy.backlogItems,
      value: residualGapMissionQueue.summary.backlogItems,
      state: residualGapMissionQueue.summary.backlogItems > 0 ? "warning" as const : "ready" as const,
    },
    {
      id: "top-severity",
      label: copy.topSeverity,
      value: residualGapMissionQueue.summary.topSeverity,
      state: deliveryAcceptanceSeverityState(residualGapMissionQueue.summary.topSeverity),
    },
  ];

  const walletProviderEvidenceSummaryItems = [
    {
      id: "total-scenarios",
      label: copy.totalScenarios,
      state: "ready" as const,
      value: walletProviderEvidenceIntake.summary.totalScenarios,
    },
    {
      id: "approved",
      label: copy.walletProviderEvidenceApproved,
      state: "ready" as const,
      value: walletProviderEvidenceIntake.summary.approvedScenarios,
    },
    {
      id: "submitted-review",
      label: copy.walletProviderEvidenceSubmittedReviewRequired,
      state: walletProviderEvidenceIntake.summary.reviewRequiredScenarios > 0 ? "warning" as const : "ready" as const,
      value: Math.max(
        walletProviderEvidenceIntake.summary.submittedScenarios,
        walletProviderEvidenceIntake.summary.reviewRequiredScenarios,
      ),
    },
    {
      id: "missing-rejected-expired",
      label: copy.walletProviderEvidenceMissingRejectedExpired,
      state:
        walletProviderEvidenceIntake.summary.missingScenarios +
          walletProviderEvidenceIntake.summary.rejectedScenarios +
          walletProviderEvidenceIntake.summary.expiredScenarios >
        0
          ? "blocker" as const
          : "ready" as const,
      value:
        walletProviderEvidenceIntake.summary.missingScenarios +
        walletProviderEvidenceIntake.summary.rejectedScenarios +
        walletProviderEvidenceIntake.summary.expiredScenarios,
    },
    {
      id: "release-blockers",
      label: copy.releaseBlockers,
      state: walletProviderEvidenceIntake.summary.releaseBlockers > 0 ? "blocker" as const : "ready" as const,
      value: walletProviderEvidenceIntake.summary.releaseBlockers,
    },
  ];

  const walletProviderEvidenceApprovalSummaryItems = [
    {
      id: "approved-scenarios",
      label: copy.walletProviderEvidenceApprovedScenarios,
      state: walletProviderEvidenceApprovalAudit.summary.approvedScenarios > 0 ? "ready" as const : "warning" as const,
      value: walletProviderEvidenceApprovalAudit.summary.approvedScenarios,
    },
    {
      id: "review-required",
      label: copy.reviewRequired,
      state: walletProviderEvidenceApprovalAudit.summary.reviewRequiredScenarios > 0 ? "warning" as const : "ready" as const,
      value: walletProviderEvidenceApprovalAudit.summary.reviewRequiredScenarios,
    },
    {
      id: "blocked",
      label: copy.blocked,
      state: walletProviderEvidenceApprovalAudit.summary.blockedScenarios > 0 ? "blocker" as const : "ready" as const,
      value: walletProviderEvidenceApprovalAudit.summary.blockedScenarios,
    },
    {
      id: "complete-artifacts",
      label: copy.walletProviderEvidenceArtifactCoverage,
      state: walletProviderEvidenceApprovalAudit.summary.incompleteArtifactScenarios > 0
        ? "warning" as const
        : "ready" as const,
      value: `${walletProviderEvidenceApprovalAudit.summary.completeArtifactScenarios}/${walletProviderEvidenceApprovalAudit.summary.totalScenarios}`,
    },
  ];

  const walletProviderEvidenceReleaseSummaryItems = [
    {
      id: "gate-state",
      label: copy.walletProviderReleaseGateState,
      state: walletProviderEvidenceReleaseReadiness.summary.ready ? "ready" as const : "blocker" as const,
      value: walletProviderEvidenceReleaseReadiness.summary.ready
        ? copy.walletProviderReleaseStateReady
        : copy.walletProviderReleaseStateBlocked,
    },
    {
      id: "approved-required",
      label: copy.walletProviderApprovedRequiredScenarios,
      state: walletProviderEvidenceReleaseReadiness.summary.ready ? "ready" as const : "warning" as const,
      value: `${walletProviderEvidenceReleaseReadiness.summary.approvedRequiredScenarios}/${walletProviderEvidenceReleaseReadiness.summary.requiredScenarios}`,
    },
    {
      id: "review-required",
      label: copy.reviewRequired,
      state: walletProviderEvidenceReleaseReadiness.summary.reviewRequiredScenarios > 0
        ? "warning" as const
        : "ready" as const,
      value: walletProviderEvidenceReleaseReadiness.summary.reviewRequiredScenarios,
    },
    {
      id: "blocked",
      label: copy.blocked,
      state: walletProviderEvidenceReleaseReadiness.summary.blockedScenarios > 0
        ? "blocker" as const
        : "ready" as const,
      value: walletProviderEvidenceReleaseReadiness.summary.blockedScenarios,
    },
    {
      id: "release-blockers",
      label: copy.releaseBlockers,
      state: walletProviderEvidenceReleaseReadiness.summary.releaseBlockers > 0 ? "blocker" as const : "ready" as const,
      value: walletProviderEvidenceReleaseReadiness.summary.releaseBlockers,
    },
  ];

  const walletProviderEvidenceCloseoutSummaryItems = [
    {
      id: "approved-required",
      label: copy.walletProviderApprovedRequiredScenarios,
      state: walletProviderEvidenceCloseoutPackage.summary.ready ? "ready" as const : "warning" as const,
      value: `${walletProviderEvidenceCloseoutPackage.summary.approvedRequiredScenarios}/${walletProviderEvidenceCloseoutPackage.summary.requiredScenarios}`,
    },
    {
      id: "ready-for-review",
      label: copy.walletProviderCloseoutReadyForReview,
      state: walletProviderEvidenceCloseoutPackage.summary.readyForReviewScenarios > 0
        ? "ready" as const
        : "warning" as const,
      value: walletProviderEvidenceCloseoutPackage.summary.readyForReviewScenarios,
    },
    {
      id: "missing-artifacts",
      label: copy.walletProviderCloseoutMissingArtifacts,
      state: walletProviderEvidenceCloseoutPackage.summary.missingRequiredArtifacts > 0
        ? "blocker" as const
        : "ready" as const,
      value: walletProviderEvidenceCloseoutPackage.summary.missingRequiredArtifacts,
    },
    {
      id: "attached-evidence",
      label: copy.walletProviderCloseoutAttachedEvidence,
      state: walletProviderEvidenceCloseoutPackage.summary.attachedEvidenceReferences > 0
        ? "warning" as const
        : "blocker" as const,
      value: walletProviderEvidenceCloseoutPackage.summary.attachedEvidenceReferences,
    },
    {
      id: "closeout-blockers",
      label: copy.walletProviderCloseoutBlockers,
      state: walletProviderEvidenceCloseoutPackage.summary.closeoutBlockers > 0
        ? "blocker" as const
        : "ready" as const,
      value: walletProviderEvidenceCloseoutPackage.summary.closeoutBlockers,
    },
  ];

  const walletProviderEvidenceRequestSummaryItems = [
    {
      id: "ready-requests",
      label: copy.walletProviderRequestReadyRequests,
      state: walletProviderEvidenceRequestPacket.summary.ready ? "ready" as const : "warning" as const,
      value: `${walletProviderEvidenceRequestPacket.summary.readyRequests}/${walletProviderEvidenceRequestPacket.summary.totalRequests}`,
    },
    {
      id: "review-required-requests",
      label: copy.walletProviderRequestReviewRequiredRequests,
      state: walletProviderEvidenceRequestPacket.summary.reviewRequiredRequests > 0
        ? "warning" as const
        : "ready" as const,
      value: walletProviderEvidenceRequestPacket.summary.reviewRequiredRequests,
    },
    {
      id: "blocked-requests",
      label: copy.walletProviderRequestBlockedRequests,
      state: walletProviderEvidenceRequestPacket.summary.blockedRequests > 0
        ? "blocker" as const
        : "ready" as const,
      value: walletProviderEvidenceRequestPacket.summary.blockedRequests,
    },
    {
      id: "missing-artifacts",
      label: copy.walletProviderEvidenceMissingRequiredArtifacts,
      state: walletProviderEvidenceRequestPacket.summary.missingRequiredArtifacts > 0
        ? "blocker" as const
        : "ready" as const,
      value: walletProviderEvidenceRequestPacket.summary.missingRequiredArtifacts,
    },
    {
      id: "launch-blocking-requests",
      label: copy.walletProviderRequestLaunchBlockingRequests,
      state: walletProviderEvidenceRequestPacket.summary.launchBlockingRequests > 0
        ? "blocker" as const
        : "ready" as const,
      value: walletProviderEvidenceRequestPacket.summary.launchBlockingRequests,
    },
  ];

  const walletProviderEvidenceActivationSummaryItems = [
    {
      id: "total-scenarios",
      label: copy.walletProviderActivationTotalScenarios,
      state: "ready" as const,
      value: walletProviderEvidenceActivation.summary.totalScenarios,
    },
    {
      id: "ready-scenarios",
      label: copy.walletProviderActivationReadyScenarios,
      state: walletProviderEvidenceActivation.summary.ready ? "ready" as const : "warning" as const,
      value: walletProviderEvidenceActivation.summary.readyScenarios,
    },
    {
      id: "blocked-scenarios",
      label: copy.walletProviderActivationBlockedScenarios,
      state: walletProviderEvidenceActivation.summary.blockedScenarios > 0
        ? "blocker" as const
        : "ready" as const,
      value: walletProviderEvidenceActivation.summary.blockedScenarios,
    },
    {
      id: "review-required-scenarios",
      label: copy.walletProviderActivationReviewRequiredScenarios,
      state: walletProviderEvidenceActivation.summary.reviewRequiredScenarios > 0
        ? "warning" as const
        : "ready" as const,
      value: walletProviderEvidenceActivation.summary.reviewRequiredScenarios,
    },
    {
      id: "missing-artifacts",
      label: copy.walletProviderActivationMissingArtifacts,
      state: walletProviderEvidenceActivation.summary.missingArtifactTypeCount > 0
        ? "blocker" as const
        : "ready" as const,
      value: walletProviderEvidenceActivation.summary.missingArtifactTypeCount,
    },
    {
      id: "approved-gates",
      label: copy.walletProviderActivationApprovedFeatureGates,
      state: walletProviderEvidenceActivation.summary.approvedFeatureGates ===
        walletProviderEvidenceActivation.summary.totalScenarios
        ? "ready" as const
        : "warning" as const,
      value: walletProviderEvidenceActivation.summary.approvedFeatureGates,
    },
    {
      id: "reviewer-approved",
      label: copy.walletProviderActivationReviewerApprovedScenarios,
      state: walletProviderEvidenceActivation.summary.reviewerApprovedScenarios ===
        walletProviderEvidenceActivation.summary.totalScenarios
        ? "ready" as const
        : "warning" as const,
      value: walletProviderEvidenceActivation.summary.reviewerApprovedScenarios,
    },
  ];
  const runWalletProviderEvidenceReviewAction = (
    actionId: WalletProviderEvidenceReviewActionId,
    scenarioId: WalletProviderQaScenarioId,
    requiredArtifactIds: string[],
  ) => {
    const artifactReferences =
      actionId === "submit_evidence" || actionId === "reopen_evidence"
        ? walletProviderEvidenceLocalReferences(scenarioId, requiredArtifactIds)
        : undefined;
    const result = executeWalletProviderEvidenceReviewAction(
      campaign,
      walletProviderEvidenceIntake,
      adminOps.walletProviderQaGate,
      {
        actionId,
        artifactReferences,
        executedAt: "2026-07-03T21:45:00Z",
        reason:
          actionId === "reject_evidence"
            ? {
              "en-US": "Local reviewer rejected this evidence; replacement references are required before approval.",
              "zh-CN": "本地审核人已拒绝该证据；批准前需要替代引用。",
              "zh-TW": "本地審核人已拒絕該證據；批准前需要替代引用。",
            }
            : undefined,
        replaceEvidence: actionId === "reopen_evidence",
        reviewer: "internal_operator",
        scenarioId,
      },
    );

    setWalletProviderEvidenceActionResult(result);
    setWalletProviderEvidenceRecoveryUi({
      lastRecoveredAt: result.auditTrail.executedAt,
      snapshot: serializeWalletProviderEvidenceRecoverySnapshot(
        result.updatedIntake,
        "in_memory_action",
        result.auditTrail.executedAt,
      ),
      source: "in_memory_action",
      storageState: walletProviderEvidenceRecoveryUi.storageState,
    });
  };
  const loadWalletProviderEvidenceApprovedSample = () => {
    const recoveredAt = nowIso();

    setWalletProviderEvidenceActionResult(null);
    setWalletProviderEvidenceRecoveryUi({
      lastRecoveredAt: recoveredAt,
      snapshot: createWalletProviderEvidenceAllApprovedSampleSnapshot(recoveredAt),
      source: "local_sample",
      storageState: "available",
    });
  };
  const saveWalletProviderEvidenceRecoveryState = () => {
    const snapshot = serializeWalletProviderEvidenceRecoverySnapshot(
      walletProviderEvidenceIntake,
      "local_storage",
      nowIso(),
    );
    const storageState = writeWalletProviderEvidenceRecoverySnapshot(snapshot);

    setWalletProviderEvidenceRecoveryUi({
      lastRecoveredAt: snapshot.capturedAt,
      snapshot,
      source: "local_storage",
      storageState,
    });
  };
  const restoreWalletProviderEvidenceRecoveryState = () => {
    const stored = readWalletProviderEvidenceRecoverySnapshot();

    setWalletProviderEvidenceActionResult(null);
    setWalletProviderEvidenceRecoveryUi({
      lastRecoveredAt: nowIso(),
      snapshot: stored.snapshot,
      source: stored.snapshot ? "local_storage" : "seeded_default",
      storageState: stored.storageState,
    });
  };
  const resetWalletProviderEvidenceRecoveryState = () => {
    const storageState = removeWalletProviderEvidenceRecoverySnapshot();

    setWalletProviderEvidenceActionResult(null);
    setWalletProviderEvidenceRecoveryUi({
      lastRecoveredAt: nowIso(),
      snapshot: null,
      source: "seeded_default",
      storageState,
    });
  };
  const walletProviderEvidenceActionsByScenario = Object.fromEntries(
    walletProviderEvidenceRequestPacket.scenarios.map((scenario) => [
      scenario.id,
      executeWalletProviderEvidenceReviewAction(
        campaign,
        walletProviderEvidenceIntake,
        adminOps.walletProviderQaGate,
        {
          actionId: "__metadata_only__",
          scenarioId: scenario.id,
        },
      ).actions,
    ]),
  );
  const walletProviderEvidenceLatestActionNextAction = walletProviderEvidenceActionResult
    ? walletProviderEvidenceActionResult.updatedIntake.scenarios.find(
      (scenario) => scenario.id === walletProviderEvidenceActionResult.scenarioId,
    )?.nextAction ?? walletProviderEvidenceActionResult.nextAction
    : walletProviderEvidenceRecovery.nextAction;

  const riskIntelligenceSummaryItems = [
    {
      id: "total-dimensions",
      label: copy.riskIntelligenceTotalDimensions,
      value: riskIntelligence.summary.totalDimensions,
      state: "ready" as const,
    },
    {
      id: "review-required",
      label: copy.reviewRequired,
      value: riskIntelligence.summary.reviewRequiredCount,
      state: riskIntelligence.summary.reviewRequiredCount > 0 ? "warning" as const : "ready" as const,
    },
    {
      id: "blocked-export-hold",
      label: copy.riskIntelligenceBlockedExportHold,
      value: riskIntelligence.summary.blockedCount + riskIntelligence.summary.exportHoldCount,
      state:
        riskIntelligence.summary.blockedCount + riskIntelligence.summary.exportHoldCount > 0
          ? "blocker" as const
          : "ready" as const,
    },
    {
      id: "high-severity",
      label: copy.riskIntelligenceHighSeverity,
      value: riskIntelligence.summary.highSeverityCount,
      state: riskIntelligence.summary.highSeverityCount > 0 ? "blocker" as const : "ready" as const,
    },
    {
      id: "manual-review-queue",
      label: copy.riskIntelligenceManualQueue,
      value: riskIntelligence.summary.manualReviewQueueSize,
      state: riskIntelligence.summary.manualReviewQueueSize > 0 ? "warning" as const : "ready" as const,
    },
  ];

  const contractModes = [
    {
      badge: <ContractModeBadge label={copy.offChain} mode="OFF_CHAIN_MVP" />,
      description: copy.defaultSafe,
      key: "OFF_CHAIN_MVP",
    },
    {
      badge: <ContractModeBadge label={copy.v2Companion} mode="V2_COMPANION" />,
      description: copy.futurePlanned,
      key: "V2_COMPANION",
    },
    {
      badge: <ContractModeBadge label={copy.contractClaim} mode="CONTRACT_CLAIM" />,
      description: copy.contractClaimBlocked,
      key: "CONTRACT_CLAIM",
    },
  ];

  const companionContractReadinessSection = (
    <section aria-label={copy.companionContractReadiness} style={panelStyle}>
      <div style={rowStyle}>
        <div style={stackStyle}>
          <p style={labelStyle}>{copy.companionContracts}</p>
          <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
            {copy.companionContractReadiness}
          </h3>
          <p style={mutedTextStyle}>{copy.companionContractReadinessSubtitle}</p>
        </div>
        <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <PublishStateBadge
            label={companionContractReadiness.summary.ready ? copy.readyActions : copy.reviewRequired}
            state={companionContractReadiness.summary.ready ? "ready" : "warning"}
          />
          <PublishStateBadge
            label={companionContractReadiness.summary.topCategoryId}
            state={companionContractReadinessState(
              companionContractReadiness.categories.find(
                (category) => category.id === companionContractReadiness.summary.topCategoryId,
              )?.status ?? "review_required",
            )}
          />
        </span>
      </div>
      <div style={boundaryStyle}>
        <p style={{ margin: 0 }}>
          {copy.nonLiveBoundary}: {getLocalizedText(companionContractReadiness.boundary, locale)}
        </p>
        <p style={{ margin: "8px 0 0" }}>
          {copy.noAbiGeneration} · {copy.noLiveContractTransaction} · {copy.noRewardCustodyDistribution}
        </p>
      </div>
      <div style={compactGridStyle}>
        {companionReadinessSummary.map((item) => (
          <article key={item.id} style={cardStyle}>
            <div style={rowStyle}>
              <p style={labelStyle}>{item.label}</p>
              <PublishStateBadge label={String(item.value)} state={item.state} />
            </div>
            <p style={valueStyle}>{item.value}</p>
          </article>
        ))}
      </div>
      <div style={gridStyle}>
        {companionContractReadiness.categories.map((category) => (
          <article key={category.id} style={cardStyle}>
            <div style={rowStyle}>
              <div style={stackStyle}>
                <p style={labelStyle}>{category.contractName ?? copy.companionContracts}</p>
                <strong>{getLocalizedText(category.title, locale)}</strong>
              </div>
              <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Badge label={category.phase} tone="info" />
                <PublishStateBadge
                  label={companionContractReadinessLabel(category.status, copy)}
                  state={companionContractReadinessState(category.status)}
                />
                <Badge
                  label={category.requiredForPlan ? copy.requiredForPlan : copy.acceptedNonGoal}
                  tone={category.requiredForPlan ? "info" : "warning"}
                />
              </span>
            </div>
            <p style={wrapTextStyle}>
              {copy.evidenceSurface}: {getLocalizedText(category.evidenceSurface, locale)}
            </p>
            <p style={wrapTextStyle}>
              {copy.evidenceSummary}: {getLocalizedText(category.evidenceSummary, locale)}
            </p>
            <p style={wrapTextStyle}>
              {copy.ownerRole}: {readableCode(category.ownerRole)}
            </p>
            <div style={chipListStyle}>
              {category.evidenceItems.map((item) => (
                <span key={item.id} style={chipStyle} title={getLocalizedText(item.detail, locale)}>
                  {companionEvidenceKindLabel(item.kind, copy)}: {getLocalizedText(item.label, locale)}
                </span>
              ))}
            </div>
            <div style={stackStyle}>
              {category.evidenceItems.slice(0, 4).map((item) => (
                <div key={`${category.id}-${item.id}-detail`} style={companionEvidenceDetailStyle}>
                  <div style={companionEvidenceDetailHeaderStyle}>
                    <strong style={companionEvidenceTitleStyle}>{getLocalizedText(item.label, locale)}</strong>
                    <span style={companionEvidenceBadgeGroupStyle}>
                      <Badge label={companionEvidenceKindLabel(item.kind, copy)} tone="info" />
                      <PublishStateBadge
                        label={companionContractReadinessLabel(item.status, copy)}
                        state={companionContractReadinessState(item.status)}
                      />
                    </span>
                  </div>
                  <p style={wrapTextStyle}>
                    {copy.evidenceSource}: {getLocalizedText(item.source, locale)}
                  </p>
                  <p style={wrapTextStyle}>{getLocalizedText(item.detail, locale)}</p>
                </div>
              ))}
            </div>
            <p style={boundaryStyle}>{getLocalizedText(category.boundary, locale)}</p>
            <p style={wrapTextStyle}>
              {copy.nextAction}: {getLocalizedText(category.nextAction, locale)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section style={panelStyle}>
        <div style={rowStyle}>
          <div>
            <p style={labelStyle}>{copy.title}</p>
            <h2 style={{ fontSize: 30, lineHeight: 1.1, margin: "4px 0" }}>
              {copy.reviewQueue}
            </h2>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <PublishStateBadge label={`${blockerCount} ${copy.blocker}`} state="blocker" />
            <PublishStateBadge label={`${warningCount} ${copy.warning}`} state="warning" />
          </span>
        </div>
        <p style={boundaryStyle}>{copy.seededBoundary}</p>
        <div style={gridStyle}>
          {adminOps.reviewQueue.map((item) => (
            <article key={item.id} style={cardStyle}>
              <div style={rowStyle}>
                <strong>{item.title}</strong>
                <ReviewSeverityBadge label={item.severity} severity={item.severity} />
              </div>
              <p style={mutedTextStyle}>
                {copy.status}: {item.status}
              </p>
              <p style={mutedTextStyle}>
                {copy.owner}: {item.ownerRole}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={copy.lifecycleOperationReview} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.lifecycleIncidentBoundary}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.lifecycleOperationReview}
            </h3>
            <p style={mutedTextStyle}>{copy.lifecycleOperationReviewSubtitle}</p>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${lifecycleOperations.summary.totalOperations} ${copy.totalActions}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${lifecycleOperations.summary.blockedCount} ${copy.blocker}`}
              state={lifecycleOperations.summary.blockedCount > 0 ? "blocker" : "ready"}
            />
            <PublishStateBadge
              label={`${lifecycleOperations.summary.reviewRequiredCount} ${copy.reviewRequired}`}
              state={lifecycleOperations.summary.reviewRequiredCount > 0 ? "warning" : "ready"}
            />
            <PublishStateBadge
              label={`${lifecycleOperations.summary.exportSensitiveCount} ${copy.lifecycleExportSensitive}`}
              state={lifecycleOperations.summary.exportSensitiveCount > 0 ? "warning" : "ready"}
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{copy.lifecycleNoLiveSideEffects}</p>
          <p style={{ margin: "8px 0 0" }}>{getLocalizedText(lifecycleOperations.boundary, locale)}</p>
        </div>
        <div style={gridStyle}>
          {lifecycleReviewRows.map((operation) => (
            <article key={operation.id} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>
                    {lifecycleStatusLabel(operation.fromStatus)}{" -> "}
                    {lifecycleStatusLabel(operation.targetStatus)}
                  </p>
                  <strong>{getLocalizedText(operation.label, locale)}</strong>
                </div>
                <PublishStateBadge
                  label={lifecycleOperationStateLabel(operation.operationState, copy)}
                  state={lifecycleOperationState(operation.operationState)}
                />
              </div>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{copy.ownerRole}</p>
                  <p style={mutedTextStyle}>{lifecycleOwnerLabel(operation.ownerRole)}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.lifecycleGateGroup}</p>
                  <p style={mutedTextStyle}>{operation.gateGroup.replace(/-/g, " ")}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.affectedOutcomes}</p>
                  <p style={mutedTextStyle}>{operation.affectedOutcome.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.lifecycleBlockingChecks}</p>
                  <p style={mutedTextStyle}>{operation.blockingChecks.length}</p>
                </div>
              </div>
              <p style={mutedTextStyle}>{getLocalizedText(operation.reason, locale)}</p>
              {operation.blockingChecks.length > 0 ? (
                <div style={stackStyle}>
                  <p style={labelStyle}>{copy.lifecycleBlockingChecks}</p>
                  {operation.blockingChecks.map((check) => (
                    <div key={check.id} style={{ borderTop: "1px solid #dbe6f4", display: "grid", gap: 6, paddingTop: 8 }}>
                      <div style={rowStyle}>
                        <strong>{getLocalizedText(check.label, locale)}</strong>
                        <PublishStateBadge
                          label={check.state.replace(/_/g, " ")}
                          state={
                            check.state === "blocked"
                              ? "blocker"
                              : check.state === "warning" || check.state === "not_applicable"
                                ? "warning"
                                : "ready"
                          }
                        />
                      </div>
                      <p style={mutedTextStyle}>{getLocalizedText(check.reason, locale)}</p>
                      <p style={mutedTextStyle}>
                        {copy.nextAction}: {getLocalizedText(check.nextAction, locale)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
              <p style={mutedTextStyle}>
                {copy.nextAction}: {getLocalizedText(operation.nextAction, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={copy.launchBundleReview} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.launchBundleSummary}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.launchBundleReview}
            </h3>
            <p style={mutedTextStyle}>{copy.launchBundleReviewSubtitle}</p>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${launchConsoleBundles.summary.totalBundles} ${copy.totalItems}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${launchConsoleBundles.summary.launchBlockingCount} ${copy.launchBlocking}`}
              state={launchConsoleBundles.summary.launchBlockingCount > 0 ? "blocker" : "ready"}
            />
            <PublishStateBadge
              label={`${launchConsoleBundles.summary.handoffRequiredCount} ${copy.handoffReadiness}`}
              state={launchConsoleBundles.summary.handoffRequiredCount > 0 ? "warning" : "ready"}
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{copy.launchBundleNoSideEffects}</p>
          <p style={{ margin: "8px 0 0" }}>
            {getLocalizedText(launchConsoleBundles.boundary, locale)}
          </p>
        </div>
        <div style={compactGridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.reviewRequired}</p>
            <p style={valueStyle}>{launchConsoleBundles.summary.reviewRequiredCount}</p>
            <p style={mutedTextStyle}>{copy.launchBundleSummary}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.blocked}</p>
            <p style={valueStyle}>{launchConsoleBundles.summary.blockedCount}</p>
            <p style={mutedTextStyle}>{copy.launchBlocking}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.localOnly}</p>
            <p style={valueStyle}>{launchConsoleBundles.summary.localOnlyCount}</p>
            <p style={mutedTextStyle}>{copy.seededEvidence}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.handoffReadiness}</p>
            <p style={valueStyle}>{launchConsoleBundles.summary.handoffRequiredCount}</p>
            <p style={mutedTextStyle}>{copy.reviewRequired}</p>
          </article>
        </div>
        <div style={gridStyle}>
          <article style={cardStyle}>
            <div style={rowStyle}>
              <strong>{copy.launchBlockingGates}</strong>
              <PublishStateBadge
                label={`${launchBlockingGates.length} ${copy.launchBlocking}`}
                state={launchBlockingGates.length > 0 ? "blocker" : "ready"}
              />
            </div>
            <div style={stackStyle}>
              {launchBlockingGates.map(({ bundle, gate }) => (
                <div
                  key={`${bundle.id}-${gate.id}`}
                  style={{ borderTop: "1px solid #dbe6f4", display: "grid", gap: 6, paddingTop: 10 }}
                >
                  <div style={rowStyle}>
                    <div style={stackStyle}>
                      <p style={labelStyle}>{getLocalizedText(bundle.title, locale)}</p>
                      <strong>{getLocalizedText(gate.label, locale)}</strong>
                    </div>
                    <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <PublishStateBadge
                        label={launchConsoleReviewStateLabel(gate.state, copy)}
                        state={launchConsoleReviewState(gate.state)}
                      />
                      {gate.blocksLaunch ? (
                        <PublishStateBadge label={copy.launchBlocking} state="blocker" />
                      ) : null}
                    </span>
                  </div>
                  <p style={mutedTextStyle}>
                    {copy.evidenceReason}: {getLocalizedText(gate.reason, locale)}
                  </p>
                  <p style={mutedTextStyle}>
                    {copy.nextAction}: {getLocalizedText(gate.nextAction, locale)}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article style={cardStyle}>
            <div style={rowStyle}>
              <strong>{copy.handoffReadiness}</strong>
              <PublishStateBadge
                label={`${launchConsoleBundles.summary.handoffRequiredCount} ${copy.reviewRequired}`}
                state={launchConsoleBundles.summary.handoffRequiredCount > 0 ? "warning" : "ready"}
              />
            </div>
            <div style={stackStyle}>
              {launchConsoleBundles.handoffs.map((handoff) => (
                <div
                  key={handoff.id}
                  style={{ borderTop: "1px solid #dbe6f4", display: "grid", gap: 6, paddingTop: 10 }}
                >
                  <div style={rowStyle}>
                    <div style={stackStyle}>
                      <p style={labelStyle}>{handoff.id}</p>
                      <strong>{getLocalizedText(handoff.title, locale)}</strong>
                    </div>
                    <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <PublishStateBadge
                        label={launchConsoleReviewStateLabel(handoff.reviewState, copy)}
                        state={launchConsoleReviewState(handoff.reviewState)}
                      />
                      <Badge label={handoff.riskLevel} tone={handoff.riskLevel === "high" ? "warning" : "info"} />
                    </span>
                  </div>
                  <p style={mutedTextStyle}>
                    {copy.inputIntent}: {getLocalizedText(handoff.inputIntent, locale)}
                  </p>
                  <p style={mutedTextStyle}>
                    {copy.outputPreview}: {getLocalizedText(handoff.outputPreview, locale)}
                  </p>
                  <p style={mutedTextStyle}>
                    {copy.nextAction}: {getLocalizedText(handoff.nextAction, locale)}
                  </p>
                  <p style={wrapTextStyle}>{getLocalizedText(handoff.boundary, locale)}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
        <div style={gridStyle}>
          {launchConsoleBundles.bundles.map((bundle) => (
            <article key={bundle.id} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{readableCode(bundle.stage)}</p>
                  <strong>{getLocalizedText(bundle.title, locale)}</strong>
                </div>
                <PublishStateBadge
                  label={launchConsoleReviewStateLabel(bundle.status, copy)}
                  state={launchConsoleReviewState(bundle.status)}
                />
              </div>
              <p style={mutedTextStyle}>{getLocalizedText(bundle.objective, locale)}</p>
              <p style={mutedTextStyle}>
                {copy.ownerRole}: {readableCode(bundle.ownerRole)}
              </p>
              <p style={mutedTextStyle}>
                {copy.nextAction}: {getLocalizedText(bundle.nextAction, locale)}
              </p>
              <p style={wrapTextStyle}>{getLocalizedText(bundle.publicBoundary, locale)}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={`${copy.taskEvidence} ${copy.reviewQueue}`} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.taskEvidence}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.humanReviewGate}
            </h3>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <PublishStateBadge
              label={`${verificationManualReviewRows.length} ${copy.humanReviewRequired}`}
              state={verificationManualReviewRows.length > 0 ? "warning" : "ready"}
            />
            <PublishStateBadge
              label={`${verificationRiskRows.length} ${copy.riskFlags}`}
              state={verificationRiskRows.length > 0 ? "warning" : "ready"}
            />
          </span>
        </div>
        <p style={boundaryStyle}>{copy.seededLocalReadinessBoundary}</p>
        <div style={compactGridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.humanReviewRequired}</p>
            <p style={valueStyle}>{verificationManualReviewRows.length}</p>
            <p style={mutedTextStyle}>{copy.needsReview}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.riskFlags}</p>
            <p style={valueStyle}>{verificationRiskRows.length}</p>
            <p style={mutedTextStyle}>{copy.riskEligibilityBoundary}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.evidenceStatus}</p>
            <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {Object.entries(verificationProviderReadinessCounts).map(([readiness, count]) => (
                <PublishStateBadge
                  key={readiness}
                  label={`${count} ${readableCode(readiness)}`}
                  state={providerReadinessState(readiness)}
                />
              ))}
            </span>
          </article>
        </div>
        <div style={gridStyle}>
          {verificationActionRows.slice(0, 6).map(({ participant, state }) => (
            <article key={`${participant.walletAddress}-${state.taskId}`} style={cardStyle}>
              <div style={rowStyle}>
                <strong>{state.templateCode}</strong>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <PublishStateBadge
                    label={readableCode(state.status)}
                    state={state.status === "failed" ? "blocker" : state.status === "completed" ? "ready" : "warning"}
                  />
                  <PublishStateBadge
                    label={readableCode(state.provider.readiness)}
                    state={providerReadinessState(state.provider.readiness)}
                  />
                </span>
              </div>
              <p style={mutedTextStyle}>
                {copy.wallet}: {participant.walletAddress}
              </p>
              <p style={mutedTextStyle}>
                {copy.evidenceSource}: {getLocalizedText(state.evidence.sourceLabel, locale)} · {state.evidence.evidenceHash}
              </p>
              {state.provider.fallbackReason ? (
                <p style={mutedTextStyle}>
                  {copy.detail}: {getLocalizedText(state.provider.fallbackReason, locale)}
                </p>
              ) : null}
              {state.manualReview.queued ? (
                <p style={mutedTextStyle}>
                  {copy.humanReviewRequired}: {state.manualReview.queueId} ·{" "}
                  {state.manualReview.reason ? getLocalizedText(state.manualReview.reason, locale) : copy.needsReview}
                </p>
              ) : null}
              <p style={mutedTextStyle}>
                {copy.riskFlags}: {state.riskFlags.join(", ") || "-"}
              </p>
              <p style={mutedTextStyle}>
                {copy.nextAction}: {getLocalizedText(state.nextAction, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={copy.contractTransparencyMonitor} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.contractModes}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.contractTransparencyMonitor}
            </h3>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <PublishStateBadge
              label={contractTransparencyReadinessLabel(
                contractTransparencyMonitor.lanes.find(
                  (lane) => lane.id === contractTransparencyMonitor.summary.topLaneId,
                )?.readiness ?? "local_only",
                copy,
              )}
              state={contractTransparencyReadinessState(
                contractTransparencyMonitor.lanes.find(
                  (lane) => lane.id === contractTransparencyMonitor.summary.topLaneId,
                )?.readiness ?? "local_only",
              )}
            />
            <Badge
              label={`${contractTransparencyMonitor.summary.totalLanes} ${copy.totalLanes}`}
              tone="info"
            />
          </span>
        </div>
        <p style={boundaryStyle}>{getLocalizedText(contractTransparencyMonitor.boundary, locale)}</p>
        <div style={compactGridStyle}>
          {contractTransparencySummary.map((item) => (
            <article key={item.id} style={cardStyle}>
              <div style={rowStyle}>
                <p style={labelStyle}>{item.label}</p>
                <PublishStateBadge label={item.label} state={item.state} />
              </div>
              <p style={valueStyle}>{item.value}</p>
            </article>
          ))}
        </div>
        <article style={cardStyle}>
          <div style={rowStyle}>
            <div style={stackStyle}>
              <p style={labelStyle}>{copy.contractTransparencyCloseout}</p>
              <strong>{contractTransparencyMonitor.closeoutContext.topGateId}</strong>
            </div>
            <PublishStateBadge
              label={contractTransparencyReadinessLabel(
                contractTransparencyMonitor.closeoutContext.status,
                copy,
              )}
              state={contractTransparencyReadinessState(contractTransparencyMonitor.closeoutContext.status)}
            />
          </div>
          <p style={wrapTextStyle}>
            {copy.evidence}: {getLocalizedText(contractTransparencyMonitor.closeoutContext.evidence, locale)}
          </p>
          <p style={wrapTextStyle}>
            {copy.nextAction}: {getLocalizedText(contractTransparencyMonitor.closeoutContext.topAction, locale)}
          </p>
        </article>
        <div style={rowStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.contractTransparencyLanes}</h3>
          <Badge
            label={`${contractTransparencyMonitor.summary.blockedLanes} ${copy.blocker}`}
            tone={contractTransparencyMonitor.summary.blockedLanes > 0 ? "warning" : "info"}
          />
        </div>
        <div style={gridStyle}>
          {contractTransparencyMonitor.lanes.map((lane) => (
            <article key={lane.id} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{copy.phase}: {lane.phase}</p>
                  <strong>{getLocalizedText(lane.label, locale)}</strong>
                </div>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <PublishStateBadge
                    label={contractTransparencyReadinessLabel(lane.readiness, copy)}
                    state={contractTransparencyReadinessState(lane.readiness)}
                  />
                  {lane.blocksExecution ? <Badge label={copy.blockedActions} tone="warning" /> : null}
                </span>
              </div>
              <p style={wrapTextStyle}>
                {copy.ownerRole}: {readableCode(lane.ownerRole)}
              </p>
              <p style={wrapTextStyle}>
                {copy.linkedSurface}: {getLocalizedText(lane.sourceSurface, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.evidence}: {getLocalizedText(lane.sourceEvidence, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.nextAction}: {getLocalizedText(lane.nextAction, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.localOnlyBoundary}: {getLocalizedText(lane.boundary, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={copy.contractClaimPreapprovalPackage} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.contractClaimPreapprovalBoundary}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.contractClaimPreapprovalPackage}
            </h3>
            <p style={mutedTextStyle}>{copy.contractClaimPreapprovalSubtitle}</p>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <PublishStateBadge
              label={contractClaimPreapprovalPackage.overallState}
              state="blocker"
            />
            <PublishStateBadge
              label={copy.claimExecutionDisabled}
              state="blocker"
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>
            {copy.nonLiveBoundary}: {getLocalizedText(contractClaimPreapprovalPackage.boundary, locale)}
          </p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.futureBranch}: {contractClaimPreapprovalPackage.suggestedFutureBranch}
          </p>
        </div>
        <div style={compactGridStyle}>
          {contractClaimPreapprovalSummary.map((item) => (
            <article key={item.id} style={cardStyle}>
              <div style={rowStyle}>
                <p style={labelStyle}>{item.label}</p>
                <PublishStateBadge label={String(item.value)} state={item.state} />
              </div>
              <p style={valueStyle}>{item.value}</p>
            </article>
          ))}
        </div>
        {contractClaimPreapprovalTopGate ? (
          <article style={cardStyle}>
            <div style={rowStyle}>
              <div style={stackStyle}>
                <p style={labelStyle}>{copy.topBlocker}</p>
                <strong>{getLocalizedText(contractClaimPreapprovalTopGate.label, locale)}</strong>
              </div>
              <PublishStateBadge
                label={contractClaimPreapprovalGateLabel(contractClaimPreapprovalTopGate.state, copy)}
                state={contractClaimPreapprovalGateState(contractClaimPreapprovalTopGate.state)}
              />
            </div>
            <p style={wrapTextStyle}>
              {copy.evidence}: {getLocalizedText(contractClaimPreapprovalTopGate.evidenceNeeded, locale)}
            </p>
            <p style={wrapTextStyle}>
              {copy.nextAction}: {getLocalizedText(contractClaimPreapprovalTopGate.nextAction, locale)}
            </p>
          </article>
        ) : null}
        <div style={gridStyle}>
          {contractClaimPreapprovalPackage.gates.map((gate) => (
            <article key={gate.id} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{gate.id}</p>
                  <strong>{getLocalizedText(gate.label, locale)}</strong>
                </div>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <PublishStateBadge
                    label={contractClaimPreapprovalGateLabel(gate.state, copy)}
                    state={contractClaimPreapprovalGateState(gate.state)}
                  />
                  {gate.blocksClaimExecution ? <Badge label={copy.blockedActions} tone="warning" /> : null}
                </span>
              </div>
              <p style={wrapTextStyle}>
                {copy.ownerRole}: {readableCode(gate.ownerRole)}
              </p>
              <p style={wrapTextStyle}>
                {copy.linkedSurface}: {getLocalizedText(gate.sourceSurface, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.evidence}: {getLocalizedText(gate.evidenceNeeded, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.dependency}: {getLocalizedText(gate.dependency, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.nextAction}: {getLocalizedText(gate.nextAction, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.deliveryChecklistSubtitle}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.deliveryChecklistReadiness}
            </h3>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${deliveryChecklist.summary.totalItems} ${copy.totalItems}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${deliveryChecklist.summary.blockedItems} ${copy.blocker}`}
              state={deliveryChecklist.summary.blockedItems > 0 ? "blocker" : "ready"}
            />
            <PublishStateBadge
              label={`${deliveryChecklist.summary.needsReviewItems} ${copy.needsReview}`}
              state={deliveryChecklist.summary.needsReviewItems > 0 ? "warning" : "ready"}
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{copy.seededLocalReadinessBoundary}</p>
          <p style={{ margin: "8px 0 0" }}>
            {getLocalizedText(deliveryChecklist.boundary, locale)}
          </p>
        </div>
        <div style={compactGridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.totalItems}</p>
            <p style={valueStyle}>{deliveryChecklist.summary.totalItems}</p>
            <p style={mutedTextStyle}>{getLocalizedText(deliveryChecklist.summary.nextAction, locale)}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.covered}</p>
            <p style={valueStyle}>{deliveryChecklist.summary.coveredItems}</p>
            <p style={mutedTextStyle}>{copy.seededBoundary}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.needsReview}</p>
            <p style={valueStyle}>{deliveryChecklist.summary.needsReviewItems}</p>
            <p style={mutedTextStyle}>{copy.humanReviewRequired}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.blocker}</p>
            <p style={valueStyle}>{deliveryChecklist.summary.blockedItems}</p>
            <p style={mutedTextStyle}>{copy.noRewardCustodyDistribution}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.deferred}</p>
            <p style={valueStyle}>{deliveryChecklist.summary.deferredItems}</p>
            <p style={mutedTextStyle}>{copy.futurePlanned}</p>
          </article>
        </div>
        <div style={gridStyle}>
          <article style={cardStyle}>
            <div style={rowStyle}>
              <strong>{copy.blocker}</strong>
              <PublishStateBadge label={`${deliveryChecklist.blockers.length} ${copy.blocker}`} state="blocker" />
            </div>
            {deliveryChecklist.blockers.map((item) => (
              <div key={item.id} style={{ borderTop: "1px solid #dbe6f4", display: "grid", gap: 6, paddingTop: 10 }}>
                <strong>{getLocalizedText(item.label, locale)}</strong>
                <p style={mutedTextStyle}>{getLocalizedText(item.evidence, locale)}</p>
                <p style={mutedTextStyle}>{copy.nextAction}: {getLocalizedText(item.nextAction, locale)}</p>
              </div>
            ))}
          </article>
          <article style={cardStyle}>
            <div style={rowStyle}>
              <strong>{copy.needsReview}</strong>
              <PublishStateBadge label={`${deliveryChecklist.needsReview.length} ${copy.needsReview}`} state="warning" />
            </div>
            {deliveryChecklist.needsReview.slice(0, 6).map((item) => (
              <div key={item.id} style={{ borderTop: "1px solid #dbe6f4", display: "grid", gap: 6, paddingTop: 10 }}>
                <strong>{getLocalizedText(item.label, locale)}</strong>
                <p style={mutedTextStyle}>{getLocalizedText(item.surface, locale)}</p>
                <p style={mutedTextStyle}>{copy.nextAction}: {getLocalizedText(item.nextAction, locale)}</p>
              </div>
            ))}
          </article>
        </div>
        <div style={gridStyle}>
          {deliveryChecklist.groups.map((group) => (
            <article key={group.id} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{group.sourceReference}</p>
                  <strong>{getLocalizedText(group.title, locale)}</strong>
                </div>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <PublishStateBadge label={`${group.counts.covered} ${copy.covered}`} state="ready" />
                  <PublishStateBadge
                    label={`${group.counts.needsReview} ${copy.needsReview}`}
                    state={group.counts.needsReview > 0 ? "warning" : "ready"}
                  />
                  <PublishStateBadge
                    label={`${group.counts.blocked} ${copy.blocker}`}
                    state={group.counts.blocked > 0 ? "blocker" : "ready"}
                  />
                  <Badge label={`${group.counts.deferred} ${copy.deferred}`} tone="info" />
                </span>
              </div>
              <p style={mutedTextStyle}>{getLocalizedText(group.summary, locale)}</p>
              <div style={stackStyle}>
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      borderTop: "1px solid #dbe6f4",
                      display: "grid",
                      gap: 8,
                      paddingTop: 10,
                    }}
                  >
                    <div style={rowStyle}>
                      <strong>{getLocalizedText(item.label, locale)}</strong>
                      <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <PublishStateBadge
                          label={deliveryChecklistStatusLabel(item.status, copy)}
                          state={deliveryChecklistStatusState(item.status)}
                        />
                        {item.blocksDelivery ? (
                          <PublishStateBadge label={copy.publishBlocked} state="blocker" />
                        ) : null}
                      </span>
                    </div>
                    <div style={compactGridStyle}>
                      <div>
                        <p style={labelStyle}>{copy.linkedSurface}</p>
                        <p style={mutedTextStyle}>{getLocalizedText(item.surface, locale)}</p>
                      </div>
                      <div>
                        <p style={labelStyle}>{copy.ownerRole}</p>
                        <p style={mutedTextStyle}>{readableCode(item.ownerRole)}</p>
                      </div>
                      <div>
                        <p style={labelStyle}>{copy.sourceRequirement}</p>
                        <p style={mutedTextStyle}>{item.sourceRequirement}</p>
                      </div>
                    </div>
                    <p style={mutedTextStyle}>
                      {copy.evidence}: {getLocalizedText(item.evidence, locale)}
                    </p>
                    <p style={mutedTextStyle}>
                      {copy.nextAction}: {getLocalizedText(item.nextAction, locale)}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={closeoutCopy.deliveryChecklistCloseout} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{closeoutCopy.closeoutSubtitle}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {closeoutCopy.deliveryChecklistCloseout}
            </h3>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${deliveryChecklistCloseout.summary.totalRows} ${copy.totalItems}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${deliveryChecklistCloseout.summary.unresolvedRows} ${closeoutCopy.unresolved}`}
              state={deliveryChecklistCloseout.summary.unresolvedRows > 0 ? "warning" : "ready"}
            />
            <PublishStateBadge
              label={`${deliveryChecklistCloseout.summary.needsReviewRows} ${copy.needsReview}`}
              state={deliveryChecklistCloseout.summary.needsReviewRows > 0 ? "warning" : "ready"}
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{closeoutCopy.closeoutBoundary}</p>
          <p style={{ margin: "8px 0 0" }}>
            {getLocalizedText(deliveryChecklistCloseout.boundary, locale)}
          </p>
        </div>
        <div style={compactGridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.totalItems}</p>
            <p style={valueStyle}>{deliveryChecklistCloseout.summary.totalRows}</p>
            <p style={mutedTextStyle}>{closeoutCopy.rowsShown}: {deliveryChecklistCloseoutRows.length}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{closeoutCopy.unresolved}</p>
            <p style={valueStyle}>{deliveryChecklistCloseout.summary.unresolvedRows}</p>
            <p style={mutedTextStyle}>{copy.humanReviewRequired}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.needsReview}</p>
            <p style={valueStyle}>{deliveryChecklistCloseout.summary.needsReviewRows}</p>
            <p style={mutedTextStyle}>{deliveryChecklistCloseoutHandoffTargetLabel("live_wallet_qa")}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{closeoutCopy.missingVerification}</p>
            <p style={valueStyle}>{deliveryChecklistCloseout.summary.missingVerificationRows}</p>
            <p style={mutedTextStyle}>{deliveryChecklistCloseoutHandoffTargetLabel("evidence_traceability")}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{closeoutCopy.missingEvidence}</p>
            <p style={valueStyle}>{deliveryChecklistCloseout.summary.missingEvidenceRows}</p>
            <p style={mutedTextStyle}>{deliveryChecklistCloseoutHandoffTargetLabel("evidence_traceability")}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.deferred}</p>
            <p style={valueStyle}>{deliveryChecklistCloseout.summary.deferredRows}</p>
            <p style={mutedTextStyle}>{deliveryChecklistCloseoutHandoffTargetLabel("future_scope")}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.covered}</p>
            <p style={valueStyle}>{deliveryChecklistCloseout.summary.coveredRows}</p>
            <p style={mutedTextStyle}>{copy.seededBoundary}</p>
          </article>
        </div>
        <div aria-label="Delivery checklist closeout queue filters" style={chipListStyle}>
          <button
            type="button"
            onClick={() => setDeliveryChecklistCloseoutFilter("all")}
            style={deliveryChecklistCloseoutFilter === "all" ? actionButtonStyle : disabledActionButtonStyle}
          >
            {closeoutCopy.allQueues} · {deliveryChecklistCloseout.rows.length}
          </button>
          {deliveryChecklistCloseout.queues.map((queue) => (
            <button
              key={queue.id}
              type="button"
              onClick={() => setDeliveryChecklistCloseoutFilter(queue.id)}
              style={deliveryChecklistCloseoutFilter === queue.id ? actionButtonStyle : disabledActionButtonStyle}
            >
              {deliveryChecklistCloseoutQueueLabel(queue.id, copy, closeoutCopy)} · {queue.count}
            </button>
          ))}
        </div>
        <article style={cardStyle}>
          <div style={rowStyle}>
            <div style={stackStyle}>
              <p style={labelStyle}>{closeoutCopy.topAction}</p>
              <strong>{deliveryChecklistCloseoutTopRow ? getLocalizedText(deliveryChecklistCloseoutTopRow.label, locale) : closeoutCopy.allQueues}</strong>
            </div>
            <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <PublishStateBadge
                label={`${closeoutCopy.topQueue}: ${deliveryChecklistCloseoutQueueLabel(deliveryChecklistCloseout.summary.topQueueId, copy, closeoutCopy)}`}
                state={deliveryChecklistCloseoutQueueState(deliveryChecklistCloseout.summary.topQueueId)}
              />
              <Badge
                label={`${closeoutCopy.handoffTarget}: ${deliveryChecklistCloseoutHandoffTargetLabel(deliveryChecklistCloseout.summary.topHandoffTarget)}`}
                tone="info"
              />
            </span>
          </div>
          <p style={wrapTextStyle}>
            {closeoutCopy.topRow}: {deliveryChecklistCloseout.summary.topRowId ?? "-"}
          </p>
          <p style={wrapTextStyle}>
            {copy.nextAction}: {getLocalizedText(deliveryChecklistCloseout.summary.topNextAction, locale)}
          </p>
        </article>
        <div style={gridStyle}>
          {deliveryChecklistCloseoutRows.map((row) => (
            <article key={row.id} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{row.sourceRequirement}</p>
                  <strong>{getLocalizedText(row.label, locale)}</strong>
                </div>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <PublishStateBadge
                    label={deliveryChecklistCloseoutQueueLabel(row.queueId, copy, closeoutCopy)}
                    state={deliveryChecklistCloseoutQueueState(row.queueId)}
                  />
                  <PublishStateBadge
                    label={deliveryChecklistStatusLabel(row.status, copy)}
                    state={deliveryChecklistStatusState(row.status)}
                  />
                  <PublishStateBadge
                    label={deliveryChecklistProofLevelLabel(row.proofLevel)}
                    state={deliveryChecklistProofLevelState(row.proofLevel)}
                  />
                </span>
              </div>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{closeoutCopy.handoffTarget}</p>
                  <p style={wrapTextStyle}>
                    {getLocalizedText(row.handoffLabel, locale)} · {deliveryChecklistCloseoutHandoffTargetLabel(row.handoffTarget)}
                  </p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.ownerRole}</p>
                  <p style={wrapTextStyle}>{readableCode(row.ownerRole)}</p>
                </div>
                <div>
                  <p style={labelStyle}>{traceCopy.proofLevel}</p>
                  <p style={wrapTextStyle}>{deliveryChecklistProofLevelLabel(row.proofLevel)}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.linkedSurface}</p>
                  <p style={wrapTextStyle}>{getLocalizedText(row.surface, locale)}</p>
                </div>
              </div>
              <p style={wrapTextStyle}>
                {copy.evidence}: {getLocalizedText(row.evidence, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.nextAction}: {getLocalizedText(row.nextAction, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.nonLiveBoundary}: {getLocalizedText(row.boundary, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={traceCopy.deliveryChecklistTraceability} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{traceCopy.traceabilitySubtitle}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {traceCopy.deliveryChecklistTraceability}
            </h3>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${deliveryChecklistTraceability.summary.totalRows} ${copy.totalItems}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${deliveryChecklistTraceability.summary.reviewRequiredRows} ${copy.needsReview}`}
              state={deliveryChecklistTraceability.summary.reviewRequiredRows > 0 ? "warning" : "ready"}
            />
            <PublishStateBadge
              label={`${deliveryChecklistTraceability.summary.missingVerificationRows} ${traceCopy.missingVerification}`}
              state={deliveryChecklistTraceability.summary.missingVerificationRows > 0 ? "warning" : "ready"}
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{traceCopy.boundary}</p>
          <p style={{ margin: "8px 0 0" }}>
            {getLocalizedText(deliveryChecklistTraceability.boundary, locale)}
          </p>
        </div>
        <div style={compactGridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.covered}</p>
            <p style={valueStyle}>{deliveryChecklistTraceability.summary.verifiedRows}</p>
            <p style={mutedTextStyle}>{deliveryChecklistProofLevelLabel("focused_test")}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.needsReview}</p>
            <p style={valueStyle}>{deliveryChecklistTraceability.summary.reviewRequiredRows}</p>
            <p style={mutedTextStyle}>{deliveryChecklistProofLevelLabel("live_evidence_required")}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.deferred}</p>
            <p style={valueStyle}>{deliveryChecklistTraceability.summary.deferredRows}</p>
            <p style={mutedTextStyle}>{deliveryChecklistProofLevelLabel("future_scope")}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{traceCopy.missingEvidence}</p>
            <p style={valueStyle}>{deliveryChecklistTraceability.summary.missingEvidenceRows}</p>
            <p style={mutedTextStyle}>{getLocalizedText(deliveryChecklistTraceability.summary.nextAction, locale)}</p>
          </article>
        </div>
        <div style={gridStyle}>
          {deliveryChecklistTraceability.rows.map((row) => (
            <article key={row.id} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{row.sourceRequirement}</p>
                  <strong>{getLocalizedText(row.label, locale)}</strong>
                </div>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <PublishStateBadge
                    label={deliveryChecklistStatusLabel(row.status, copy)}
                    state={deliveryChecklistStatusState(row.status)}
                  />
                  <PublishStateBadge
                    label={deliveryChecklistProofLevelLabel(row.proofLevel)}
                    state={deliveryChecklistProofLevelState(row.proofLevel)}
                  />
                </span>
              </div>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{traceCopy.proofLevel}</p>
                  <p style={wrapTextStyle}>{deliveryChecklistProofLevelLabel(row.proofLevel)}</p>
                </div>
                <div>
                  <p style={labelStyle}>{traceCopy.sourceDocs}</p>
                  {row.sourceDocs.slice(0, 3).map((ref) => (
                    <p key={`${row.id}-${ref.path}`} style={wrapTextStyle}>
                      {ref.path}
                    </p>
                  ))}
                </div>
                <div>
                  <p style={labelStyle}>{traceCopy.implementationRefs}</p>
                  {row.implementationRefs.slice(0, 3).map((ref) => (
                    <p key={`${row.id}-${ref.path}`} style={wrapTextStyle}>
                      {ref.path}
                    </p>
                  ))}
                </div>
                <div>
                  <p style={labelStyle}>{traceCopy.verificationCommands}</p>
                  {row.verificationCommands.length > 0 ? row.verificationCommands.slice(0, 3).map((ref) => (
                    <p key={`${row.id}-${ref.path}`} style={wrapTextStyle}>
                      {ref.path}
                    </p>
                  )) : <p style={wrapTextStyle}>{traceCopy.missingVerification}</p>}
                </div>
                <div>
                  <p style={labelStyle}>{traceCopy.evidenceArtifacts}</p>
                  {row.evidenceArtifacts.length > 0 ? row.evidenceArtifacts.slice(0, 3).map((ref) => (
                    <p key={`${row.id}-${ref.path}`} style={wrapTextStyle}>
                      {ref.path}
                    </p>
                  )) : <p style={wrapTextStyle}>{traceCopy.missingEvidence}</p>}
                </div>
              </div>
              <p style={wrapTextStyle}>
                {traceCopy.riskNote}: {getLocalizedText(row.riskNote, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.nextAction}: {getLocalizedText(row.nextAction, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={copy.deliveryAcceptanceConsole} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.deliveryAcceptanceSubtitle}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.deliveryAcceptanceConsole}
            </h3>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${deliveryAcceptance.summary.solutionSetCount} ${copy.solutionSets}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${deliveryAcceptance.summary.needsLiveEvidence} ${copy.needsLiveEvidence}`}
              state={
                deliveryAcceptance.summary.needsLiveEvidence > 0
                  ? "warning"
                  : "ready"
              }
            />
            <PublishStateBadge
              label={`${deliveryAcceptance.summary.blocked} ${copy.blocked}`}
              state={deliveryAcceptance.summary.blocked > 0 ? "blocker" : "ready"}
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>
            {copy.nonLiveBoundary}: {getLocalizedText(deliveryAcceptance.boundary, locale)}
          </p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.nextMissionAction}: {getLocalizedText(deliveryAcceptance.summary.nextAction, locale)}
          </p>
        </div>
        <div style={compactGridStyle}>
          {deliveryAcceptanceSummaryItems.map((item) => (
            <article key={item.id} style={cardStyle}>
              <div style={rowStyle}>
                <p style={labelStyle}>{item.label}</p>
                <PublishStateBadge label={item.label} state={item.state} />
              </div>
              <p style={valueStyle}>{item.value}</p>
            </article>
          ))}
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.topSeverity}</p>
            <PublishStateBadge
              label={deliveryAcceptance.summary.topSeverity}
              state={deliveryAcceptanceSeverityState(deliveryAcceptance.summary.topSeverity)}
            />
            <p style={mutedTextStyle}>{copy.residualGaps}</p>
          </article>
        </div>
        <div style={gridStyle}>
          <article style={cardStyle}>
            <div style={rowStyle}>
              <strong>{copy.residualGaps}</strong>
              <PublishStateBadge
                label={`${deliveryAcceptance.topResidualGaps.length} ${copy.residualGaps}`}
                state={deliveryAcceptance.topResidualGaps.length > 0 ? "warning" : "ready"}
              />
            </div>
            {deliveryAcceptance.topResidualGaps.map((row) => (
              <div
                key={row.id}
                style={{ borderTop: "1px solid #dbe6f4", display: "grid", gap: 6, paddingTop: 10 }}
              >
                <div style={rowStyle}>
                  <strong>{getLocalizedText(row.title, locale)}</strong>
                  <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <PublishStateBadge
                      label={deliveryAcceptanceStatusLabel(row.status, copy)}
                      state={deliveryAcceptanceStatusState(row.status)}
                    />
                    <PublishStateBadge
                      label={row.severity}
                      state={deliveryAcceptanceSeverityState(row.severity)}
                    />
                    {row.launchBlocking ? (
                      <PublishStateBadge label={copy.launchBlocking} state="blocker" />
                    ) : null}
                  </span>
                </div>
                <p style={wrapTextStyle}>
                  {copy.evidenceSurface}: {getLocalizedText(row.evidenceSurface, locale)}
                </p>
                <p style={wrapTextStyle}>
                  {copy.nextMissionAction}: {getLocalizedText(row.nextMissionAction, locale)}
                </p>
              </div>
            ))}
          </article>
          {deliveryAcceptance.solutionSets.map((solutionSet) => (
            <article key={solutionSet.id} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>
                    {copy.solutionSet}: {solutionSet.sourceReference}
                  </p>
                  <strong>{getLocalizedText(solutionSet.title, locale)}</strong>
                </div>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <PublishStateBadge label={`${solutionSet.counts.proven} ${copy.proven}`} state="ready" />
                  <PublishStateBadge
                    label={`${solutionSet.counts.partial} ${copy.partial}`}
                    state={solutionSet.counts.partial > 0 ? "warning" : "ready"}
                  />
                  <PublishStateBadge
                    label={`${solutionSet.counts.needsLiveEvidence} ${copy.needsLiveEvidence}`}
                    state={solutionSet.counts.needsLiveEvidence > 0 ? "warning" : "ready"}
                  />
                  <PublishStateBadge
                    label={`${solutionSet.counts.blocked} ${copy.blocked}`}
                    state={solutionSet.counts.blocked > 0 ? "blocker" : "ready"}
                  />
                  <Badge label={`${solutionSet.counts.deferred} ${copy.deferred}`} tone="info" />
                </span>
              </div>
              <p style={mutedTextStyle}>{getLocalizedText(solutionSet.summary, locale)}</p>
              <div style={stackStyle}>
                {solutionSet.rows.map((row) => (
                  <div
                    key={row.id}
                    style={{
                      borderTop: "1px solid #dbe6f4",
                      display: "grid",
                      gap: 8,
                      paddingTop: 10,
                    }}
                  >
                    <div style={rowStyle}>
                      <strong>{getLocalizedText(row.title, locale)}</strong>
                      <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <PublishStateBadge
                          label={deliveryAcceptanceStatusLabel(row.status, copy)}
                          state={deliveryAcceptanceStatusState(row.status)}
                        />
                        <PublishStateBadge
                          label={row.severity}
                          state={deliveryAcceptanceSeverityState(row.severity)}
                        />
                        {row.launchBlocking ? (
                          <PublishStateBadge label={copy.launchBlocking} state="blocker" />
                        ) : null}
                      </span>
                    </div>
                    <div style={compactGridStyle}>
                      <div>
                        <p style={labelStyle}>{copy.sourceArea}</p>
                        <p style={mutedTextStyle}>{getLocalizedText(row.sourceArea, locale)}</p>
                      </div>
                      <div>
                        <p style={labelStyle}>{copy.evidenceSurface}</p>
                        <p style={mutedTextStyle}>{getLocalizedText(row.evidenceSurface, locale)}</p>
                      </div>
                      <div>
                        <p style={labelStyle}>{copy.ownerRole}</p>
                        <p style={mutedTextStyle}>{readableCode(row.ownerRole)}</p>
                      </div>
                    </div>
                    <p style={wrapTextStyle}>
                      {copy.evidenceSummary}: {getLocalizedText(row.evidenceSummary, locale)}
                    </p>
                    <p style={wrapTextStyle}>
                      {copy.nextMissionAction}: {getLocalizedText(row.nextMissionAction, locale)}
                    </p>
                    {row.boundary ? (
                      <p style={wrapTextStyle}>
                        {copy.nonLiveBoundary}: {getLocalizedText(row.boundary, locale)}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={copy.residualGapMissionQueue} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.residualGaps}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.residualGapMissionQueue}
            </h3>
            <p style={mutedTextStyle}>{copy.residualGapMissionQueueSubtitle}</p>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${residualGapMissionQueue.summary.totalItems} ${copy.totalItems}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${residualGapMissionQueue.summary.launchBlockingItems} ${copy.launchBlockingItems}`}
              state={
                residualGapMissionQueue.summary.launchBlockingItems > 0
                  ? "blocker"
                  : "ready"
              }
            />
            <PublishStateBadge
              label={`${residualGapMissionQueue.summary.backlogItems} ${copy.backlogItems}`}
              state={
                residualGapMissionQueue.summary.backlogItems > 0
                  ? "warning"
                  : "ready"
              }
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{copy.residualGapMissionQueueBoundary}</p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.nonLiveBoundary}: {getLocalizedText(residualGapMissionQueue.boundary, locale)}
          </p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.nextMissionAction}: {getLocalizedText(residualGapMissionQueue.summary.nextAction, locale)}
          </p>
        </div>
        <div style={compactGridStyle}>
          {residualGapMissionQueueSummaryItems.map((item) => (
            <article key={item.id} style={cardStyle}>
              <p style={labelStyle}>{item.label}</p>
              <p style={valueStyle}>{item.value}</p>
              <PublishStateBadge label={item.label} state={item.state} />
            </article>
          ))}
        </div>
        <div style={gridStyle}>
          {residualGapMissionQueue.items.map((item) => (
            <article key={item.id} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>
                    {copy.priority}: {item.priority}
                  </p>
                  <strong>{getLocalizedText(item.suggestedMissionTitle, locale)}</strong>
                </div>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <PublishStateBadge
                    label={residualGapMissionQueueStatusLabel(item.status, copy)}
                    state={residualGapMissionQueueStatusState(item.status)}
                  />
                  <PublishStateBadge
                    label={item.severity}
                    state={deliveryAcceptanceSeverityState(item.severity)}
                  />
                  {item.launchBlocking ? (
                    <PublishStateBadge label={copy.launchBlocking} state="blocker" />
                  ) : null}
                </span>
              </div>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{copy.suggestedBranch}</p>
                  <p style={codeListStyle}>{item.suggestedBranch}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.sourceGap}</p>
                  <p style={wrapTextStyle}>{getLocalizedText(item.sourceGap, locale)}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.ownerRole}</p>
                  <p style={mutedTextStyle}>{readableCode(item.ownerRole)}</p>
                </div>
              </div>
              <p style={wrapTextStyle}>
                {copy.dependency}: {getLocalizedText(item.dependency, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.evidenceNeeded}: {getLocalizedText(item.evidenceNeeded, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.launchImpact}: {getLocalizedText(item.launchImpact, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.nextAction}: {getLocalizedText(item.nextAction, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.nonLiveBoundary}: {getLocalizedText(item.boundary, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-label={copy.walletProviderQaReadiness}
        style={panelStyle}
      >
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.walletProviderQaSubtitle}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.walletProviderQaReadiness}
            </h3>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${adminOps.walletProviderQaGate.summary.totalScenarios} ${copy.totalScenarios}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${adminOps.walletProviderQaGate.summary.missingLiveEvidenceScenarios} ${copy.missingLiveEvidence}`}
              state={
                adminOps.walletProviderQaGate.summary.missingLiveEvidenceScenarios > 0
                  ? "warning"
                  : "ready"
              }
            />
            <PublishStateBadge
              label={`${adminOps.walletProviderQaGate.summary.releaseBlockers} ${copy.releaseBlockers}`}
              state={
                adminOps.walletProviderQaGate.summary.releaseBlockers > 0 ? "blocker" : "ready"
              }
            />
          </span>
        </div>
        <p style={boundaryStyle}>{getLocalizedText(adminOps.walletProviderQaGate.boundary, locale)}</p>
        <div style={compactGridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.totalScenarios}</p>
            <p style={valueStyle}>{adminOps.walletProviderQaGate.summary.totalScenarios}</p>
            <p style={mutedTextStyle}>{copy.walletProviderQaSubtitle}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.seededReady}</p>
            <p style={valueStyle}>{adminOps.walletProviderQaGate.summary.seededReadyScenarios}</p>
            <p style={mutedTextStyle}>{copy.seededEvidence}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.liveEvidenceReady}</p>
            <p style={valueStyle}>{adminOps.walletProviderQaGate.summary.liveEvidenceReadyScenarios}</p>
            <p style={mutedTextStyle}>{copy.liveEvidence}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.missingLiveEvidence}</p>
            <p style={valueStyle}>{adminOps.walletProviderQaGate.summary.missingLiveEvidenceScenarios}</p>
            <p style={mutedTextStyle}>{copy.humanReviewRequired}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.releaseBlockers}</p>
            <p style={valueStyle}>{adminOps.walletProviderQaGate.summary.releaseBlockers}</p>
            <p style={mutedTextStyle}>{copy.noRewardCustodyDistribution}</p>
          </article>
        </div>
        <div style={gridStyle}>
          {adminOps.walletProviderQaGate.scenarios.map((scenario) => (
            <article key={scenario.id} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{copy.walletProviderQaSubtitle}</p>
                  <strong>{getLocalizedText(scenario.label, locale)}</strong>
                </div>
                <PublishStateBadge
                  label={walletProviderQaImpactLabel(scenario.releaseImpact, copy)}
                  state={walletProviderQaImpactState(scenario.releaseImpact)}
                />
              </div>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{copy.seededEvidence}</p>
                  <PublishStateBadge
                    label={walletProviderQaSeededLabel(scenario.seededStatus, copy)}
                    state={walletProviderQaSeededState(scenario.seededStatus)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.liveEvidence}</p>
                  <PublishStateBadge
                    label={walletProviderQaLiveLabel(scenario.liveEvidenceStatus, copy)}
                    state={walletProviderQaLiveState(scenario.liveEvidenceStatus)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.releaseImpact}</p>
                  <PublishStateBadge
                    label={walletProviderQaImpactLabel(scenario.releaseImpact, copy)}
                    state={walletProviderQaImpactState(scenario.releaseImpact)}
                  />
                </div>
              </div>
              <p style={mutedTextStyle}>
                {copy.evidence}: {getLocalizedText(scenario.evidence, locale)}
              </p>
              <p style={mutedTextStyle}>
                {copy.nextAction}: {getLocalizedText(scenario.nextAction, locale)}
              </p>
              <p style={mutedTextStyle}>
                {copy.matchedSessions}: {scenario.matchedSessionIds.join(", ") || "-"}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={copy.walletProviderEvidenceIntake} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.evidenceIntake}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.walletProviderEvidenceIntake}
            </h3>
            <p style={mutedTextStyle}>{copy.walletProviderEvidenceIntakeSubtitle}</p>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${walletProviderEvidenceIntake.summary.totalScenarios} ${copy.totalScenarios}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${walletProviderEvidenceIntake.summary.reviewRequiredScenarios} ${copy.reviewRequired}`}
              state={walletProviderEvidenceIntake.summary.reviewRequiredScenarios > 0 ? "warning" : "ready"}
            />
            <PublishStateBadge
              label={`${walletProviderEvidenceIntake.summary.releaseBlockers} ${copy.releaseBlockers}`}
              state={walletProviderEvidenceIntake.summary.releaseBlockers > 0 ? "blocker" : "ready"}
            />
          </span>
        </div>
        <p style={boundaryStyle}>{getLocalizedText(walletProviderEvidenceIntake.boundary, locale)}</p>
        <div style={compactGridStyle}>
          {walletProviderEvidenceSummaryItems.map((item) => (
            <article key={item.id} style={cardStyle}>
              <p style={labelStyle}>{item.label}</p>
              <p style={valueStyle}>{item.value}</p>
              <PublishStateBadge label={item.label} state={item.state} />
            </article>
          ))}
        </div>
        <div style={gridStyle}>
          {walletProviderEvidenceIntake.scenarios.map((scenario) => (
            <article key={scenario.id} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{getLocalizedText(scenario.provider, locale)}</p>
                  <strong>{getLocalizedText(scenario.label, locale)}</strong>
                </div>
                <PublishStateBadge
                  label={walletProviderEvidenceReleaseImpactLabel(scenario.releaseImpact, copy)}
                  state={walletProviderEvidenceReleaseImpactState(scenario.releaseImpact)}
                />
              </div>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{copy.evidenceStatus}</p>
                  <PublishStateBadge
                    label={walletProviderEvidenceStatusLabel(scenario.evidenceStatus, copy)}
                    state={walletProviderEvidenceStatusState(scenario.evidenceStatus)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.reviewState}</p>
                  <PublishStateBadge
                    label={walletProviderEvidenceReviewLabel(scenario.reviewState, copy)}
                    state={walletProviderEvidenceReviewState(scenario.reviewState)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.releaseImpact}</p>
                  <PublishStateBadge
                    label={walletProviderEvidenceReleaseImpactLabel(scenario.releaseImpact, copy)}
                    state={walletProviderEvidenceReleaseImpactState(scenario.releaseImpact)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.walletProviderEvidenceReviewer}</p>
                  <p style={mutedTextStyle}>{readableCode(scenario.reviewerRole)}</p>
                </div>
              </div>
              <div style={stackStyle}>
                <p style={labelStyle}>{copy.walletProviderEvidenceExpectedArtifacts}</p>
                <div style={chipListStyle}>
                  {scenario.expectedArtifacts.map((artifact) => (
                    <span key={artifact.id} style={chipStyle}>
                      {getLocalizedText(artifact.label, locale)} ·{" "}
                      {walletProviderEvidenceArtifactTypeLabel(artifact.artifactType, copy)} ·{" "}
                      {artifact.required
                        ? copy.walletProviderEvidenceRequired
                        : copy.walletProviderEvidenceOptional}
                    </span>
                  ))}
                </div>
              </div>
              <div style={stackStyle}>
                <p style={labelStyle}>{copy.walletProviderEvidenceSubmittedArtifacts}</p>
                {scenario.submittedArtifacts.length > 0 ? (
                  <div style={sourceMetricListStyle}>
                    {scenario.submittedArtifacts.map((artifact) => (
                      <div key={artifact.id} style={sourceMetricChipStyle}>
                        <span>
                          {getLocalizedText(artifact.label, locale)} ·{" "}
                          {walletProviderEvidenceArtifactTypeLabel(artifact.artifactType, copy)}
                        </span>
                        {artifact.reference ? (
                          <span style={codeListStyle}>{artifact.reference}</span>
                        ) : null}
                        {artifact.capturedAt ? (
                          <span>
                            {copy.walletProviderEvidenceCaptured}: {artifact.capturedAt}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={mutedTextStyle}>{copy.walletProviderEvidenceNoSubmittedArtifacts}</p>
                )}
              </div>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{copy.walletProviderEvidenceServiceGate}</p>
                  <p style={wrapTextStyle}>{getLocalizedText(scenario.serviceGate, locale)}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.walletProviderEvidenceDegradationPath}</p>
                  <p style={wrapTextStyle}>{getLocalizedText(scenario.degradationPath, locale)}</p>
                </div>
              </div>
              <p style={wrapTextStyle}>
                {copy.nextAction}: {getLocalizedText(scenario.nextAction, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.nonLiveBoundary}: {getLocalizedText(scenario.boundary, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={copy.walletProviderEvidenceApprovalAudit} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.walletProviderEvidenceRuleResults}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.walletProviderEvidenceApprovalAudit}
            </h3>
            <p style={mutedTextStyle}>{copy.walletProviderEvidenceApprovalAuditSubtitle}</p>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${walletProviderEvidenceApprovalAudit.summary.totalScenarios} ${copy.totalScenarios}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${walletProviderEvidenceApprovalAudit.summary.reviewRequiredScenarios} ${copy.reviewRequired}`}
              state={walletProviderEvidenceApprovalAudit.summary.reviewRequiredScenarios > 0 ? "warning" : "ready"}
            />
            <PublishStateBadge
              label={`${walletProviderEvidenceApprovalAudit.summary.releaseBlockers} ${copy.releaseBlockers}`}
              state={walletProviderEvidenceApprovalAudit.summary.releaseBlockers > 0 ? "blocker" : "ready"}
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{getLocalizedText(walletProviderEvidenceApprovalAudit.boundary, locale)}</p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.walletProviderEvidenceTopScenario}: {walletProviderEvidenceApprovalAudit.summary.topScenarioId}
          </p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.walletProviderEvidenceTopFailedRule}:{" "}
            {walletProviderEvidenceApprovalAudit.summary.topFailedRuleId ?? copy.walletProviderEvidenceNoFailedRules}
          </p>
        </div>
        <div style={compactGridStyle}>
          {walletProviderEvidenceApprovalSummaryItems.map((item) => (
            <article key={item.id} style={cardStyle}>
              <p style={labelStyle}>{item.label}</p>
              <p style={valueStyle}>{item.value}</p>
              <PublishStateBadge label={item.label} state={item.state} />
            </article>
          ))}
        </div>
        <div style={gridStyle}>
          {walletProviderEvidenceApprovalAudit.scenarios.map((scenario) => (
            <article key={scenario.id} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{getLocalizedText(scenario.provider, locale)}</p>
                  <strong>{getLocalizedText(scenario.label, locale)}</strong>
                </div>
                <PublishStateBadge
                  label={walletProviderEvidenceApprovalStateLabel(scenario.approvalState, copy)}
                  state={walletProviderEvidenceApprovalState(scenario.approvalState)}
                />
              </div>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{copy.walletProviderEvidenceApprovalState}</p>
                  <PublishStateBadge
                    label={walletProviderEvidenceApprovalStateLabel(scenario.approvalState, copy)}
                    state={walletProviderEvidenceApprovalState(scenario.approvalState)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.walletProviderEvidenceArtifactCoverage}</p>
                  <p style={mutedTextStyle}>
                    {scenario.artifactCoverage.submittedRequiredCount}/{scenario.artifactCoverage.requiredCount}
                  </p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.releaseImpact}</p>
                  <PublishStateBadge
                    label={walletProviderEvidenceReleaseImpactLabel(scenario.releaseImpact, copy)}
                    state={walletProviderEvidenceReleaseImpactState(scenario.releaseImpact)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.walletProviderEvidenceReviewerDecision}</p>
                  <PublishStateBadge
                    label={walletProviderEvidenceReviewLabel(scenario.reviewerDecision.state, copy)}
                    state={walletProviderEvidenceReviewState(scenario.reviewerDecision.state)}
                  />
                </div>
              </div>
              <div style={stackStyle}>
                <p style={labelStyle}>{copy.walletProviderEvidenceMissingRequiredArtifacts}</p>
                {scenario.artifactCoverage.missingRequiredArtifactIds.length > 0 ? (
                  <div style={chipListStyle}>
                    {scenario.artifactCoverage.missingRequiredArtifactIds.map((artifactId) => (
                      <span key={artifactId} style={chipStyle}>{artifactId}</span>
                    ))}
                  </div>
                ) : (
                  <p style={mutedTextStyle}>{copy.walletProviderEvidenceNoMissingArtifacts}</p>
                )}
              </div>
              <div style={stackStyle}>
                <p style={labelStyle}>{copy.walletProviderEvidenceRuleResults}</p>
                <div style={sourceMetricListStyle}>
                  {scenario.rules.map((rule) => (
                    <div key={rule.id} style={sourceMetricChipStyle}>
                      <span style={codeListStyle}>{rule.id}</span>
                      <PublishStateBadge
                        label={walletProviderEvidenceApprovalRuleStateLabel(rule.state, copy)}
                        state={walletProviderEvidenceApprovalRuleState(rule.state)}
                      />
                      <span>{getLocalizedText(rule.evidence, locale)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p style={wrapTextStyle}>
                {copy.walletProviderEvidenceApprovalRuleBlocked}:{" "}
                {scenario.failedRuleIds.join(", ") || copy.walletProviderEvidenceNoFailedRules}
              </p>
              <p style={wrapTextStyle}>
                {copy.walletProviderEvidenceReviewerDecision}:{" "}
                {getLocalizedText(scenario.reviewerDecision.reason, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.nextAction}: {getLocalizedText(scenario.nextAction, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.nonLiveBoundary}: {getLocalizedText(scenario.boundary, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={copy.walletProviderEvidenceReleaseReadiness} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.walletProviderReleaseGateState}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.walletProviderEvidenceReleaseReadiness}
            </h3>
            <p style={mutedTextStyle}>{copy.walletProviderEvidenceReleaseReadinessSubtitle}</p>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${walletProviderEvidenceReleaseReadiness.summary.requiredScenarios} ${copy.walletProviderRequiredScenarios}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${walletProviderEvidenceReleaseReadiness.summary.approvedRequiredScenarios}/${walletProviderEvidenceReleaseReadiness.summary.requiredScenarios} ${copy.walletProviderApprovedRequiredScenarios}`}
              state={walletProviderEvidenceReleaseReadiness.summary.ready ? "ready" : "warning"}
            />
            <PublishStateBadge
              label={`${walletProviderEvidenceReleaseReadiness.summary.releaseBlockers} ${copy.releaseBlockers}`}
              state={walletProviderEvidenceReleaseReadiness.summary.releaseBlockers > 0 ? "blocker" : "ready"}
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{getLocalizedText(walletProviderEvidenceReleaseReadiness.boundary, locale)}</p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.walletProviderEvidenceTopScenario}: {walletProviderEvidenceReleaseReadiness.summary.topScenarioId}
          </p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.walletProviderEvidenceTopFailedRule}:{" "}
            {walletProviderEvidenceReleaseReadiness.summary.topFailedRuleId ??
              copy.walletProviderEvidenceNoFailedRules}
          </p>
        </div>
        <div style={compactGridStyle}>
          {walletProviderEvidenceReleaseSummaryItems.map((item) => (
            <article key={item.id} style={cardStyle}>
              <p style={labelStyle}>{item.label}</p>
              <p style={valueStyle}>{item.value}</p>
              <PublishStateBadge label={item.label} state={item.state} />
            </article>
          ))}
        </div>
        <div style={gridStyle}>
          {walletProviderEvidenceReleaseReadiness.scenarios.map((scenario) => (
            <article key={scenario.id} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{getLocalizedText(scenario.provider, locale)}</p>
                  <strong>{getLocalizedText(scenario.label, locale)}</strong>
                </div>
                <PublishStateBadge
                  label={walletProviderEvidenceReleaseStateLabel(scenario.releaseState, copy)}
                  state={walletProviderEvidenceReleaseState(scenario.releaseState)}
                />
              </div>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{copy.walletProviderReleaseState}</p>
                  <PublishStateBadge
                    label={walletProviderEvidenceReleaseStateLabel(scenario.releaseState, copy)}
                    state={walletProviderEvidenceReleaseState(scenario.releaseState)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.walletProviderEvidenceApprovalState}</p>
                  <PublishStateBadge
                    label={walletProviderEvidenceApprovalStateLabel(scenario.approvalState, copy)}
                    state={walletProviderEvidenceApprovalState(scenario.approvalState)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.walletProviderEvidenceArtifactCoverage}</p>
                  <p style={mutedTextStyle}>
                    {scenario.artifactCoverage.submittedRequiredCount}/{scenario.artifactCoverage.requiredCount}
                  </p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.walletProviderRequiredForRelease}</p>
                  <PublishStateBadge
                    label={scenario.requiredForRelease ? copy.required : copy.optional}
                    state={scenario.requiredForRelease ? "warning" : "ready"}
                  />
                </div>
              </div>
              <div style={stackStyle}>
                <p style={labelStyle}>{copy.walletProviderBlockingRules}</p>
                {scenario.failedRuleIds.length > 0 ? (
                  <div style={chipListStyle}>
                    {scenario.failedRuleIds.map((ruleId) => (
                      <span key={ruleId} style={chipStyle}>{ruleId}</span>
                    ))}
                  </div>
                ) : (
                  <p style={mutedTextStyle}>{copy.walletProviderEvidenceNoFailedRules}</p>
                )}
              </div>
              <p style={wrapTextStyle}>
                {copy.nextAction}: {getLocalizedText(scenario.nextAction, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.nonLiveBoundary}: {getLocalizedText(scenario.boundary, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={copy.walletProviderEvidenceCloseoutPackage} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.walletProviderCloseoutSignoffState}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.walletProviderEvidenceCloseoutPackage}
            </h3>
            <p style={mutedTextStyle}>{copy.walletProviderEvidenceCloseoutPackageSubtitle}</p>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <PublishStateBadge
              label={walletProviderEvidenceCloseoutPackage.summary.ready
                ? copy.walletProviderReleaseStateReady
                : copy.walletProviderReleaseStateBlocked}
              state={walletProviderEvidenceCloseoutPackage.summary.ready ? "ready" : "blocker"}
            />
            <PublishStateBadge
              label={`${walletProviderEvidenceCloseoutPackage.summary.closeoutBlockers} ${copy.walletProviderCloseoutBlockers}`}
              state={walletProviderEvidenceCloseoutPackage.summary.closeoutBlockers > 0 ? "blocker" : "ready"}
            />
            <Badge
              label={`${walletProviderEvidenceCloseoutPackage.summary.attachedEvidenceReferences} ${copy.walletProviderCloseoutAttachedEvidence}`}
              tone="info"
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{getLocalizedText(walletProviderEvidenceCloseoutPackage.boundary, locale)}</p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.walletProviderEvidenceTopScenario}: {walletProviderEvidenceCloseoutPackage.summary.topScenarioId}
          </p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.walletProviderEvidenceTopFailedRule}:{" "}
            {walletProviderEvidenceCloseoutPackage.summary.topFailedRuleId ??
              copy.walletProviderEvidenceNoFailedRules}
          </p>
        </div>
        <div style={compactGridStyle}>
          {walletProviderEvidenceCloseoutSummaryItems.map((item) => (
            <article key={item.id} style={cardStyle}>
              <p style={labelStyle}>{item.label}</p>
              <p style={valueStyle}>{item.value}</p>
              <PublishStateBadge label={item.label} state={item.state} />
            </article>
          ))}
        </div>
        <div style={gridStyle}>
          {walletProviderEvidenceCloseoutPackage.scenarios.map((scenario) => (
            <article key={scenario.id} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{getLocalizedText(scenario.provider, locale)}</p>
                  <strong>{getLocalizedText(scenario.label, locale)}</strong>
                </div>
                <PublishStateBadge
                  label={walletProviderEvidenceReleaseStateLabel(scenario.signoffState, copy)}
                  state={walletProviderEvidenceReleaseState(scenario.signoffState)}
                />
              </div>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{copy.walletProviderReleaseState}</p>
                  <PublishStateBadge
                    label={walletProviderEvidenceReleaseStateLabel(scenario.releaseState, copy)}
                    state={walletProviderEvidenceReleaseState(scenario.releaseState)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.walletProviderEvidenceApprovalState}</p>
                  <PublishStateBadge
                    label={walletProviderEvidenceApprovalStateLabel(scenario.approvalState, copy)}
                    state={walletProviderEvidenceApprovalState(scenario.approvalState)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.walletProviderCloseoutSignoffState}</p>
                  <PublishStateBadge
                    label={walletProviderEvidenceReleaseStateLabel(scenario.signoffState, copy)}
                    state={walletProviderEvidenceReleaseState(scenario.signoffState)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.walletProviderEvidenceArtifactCoverage}</p>
                  <p style={mutedTextStyle}>
                    {scenario.submittedRequiredArtifactCount}/{scenario.requiredArtifactCount}
                  </p>
                </div>
              </div>
              <div style={stackStyle}>
                <p style={labelStyle}>{copy.walletProviderCloseoutAttachedEvidence}</p>
                {scenario.attachedEvidenceReferences.length > 0 ? (
                  <div style={chipListStyle}>
                    {scenario.attachedEvidenceReferences.map((reference) => (
                      <span key={reference} style={chipStyle}>{reference}</span>
                    ))}
                  </div>
                ) : (
                  <p style={mutedTextStyle}>{copy.walletProviderCloseoutNoAttachedEvidence}</p>
                )}
              </div>
              <div style={stackStyle}>
                <p style={labelStyle}>{copy.walletProviderEvidenceMissingRequiredArtifacts}</p>
                {scenario.missingRequiredArtifactIds.length > 0 ? (
                  <div style={chipListStyle}>
                    {scenario.missingRequiredArtifactIds.map((artifactId) => (
                      <span key={artifactId} style={chipStyle}>{artifactId}</span>
                    ))}
                  </div>
                ) : (
                  <p style={mutedTextStyle}>{copy.walletProviderEvidenceNoMissingArtifacts}</p>
                )}
              </div>
              <div style={stackStyle}>
                <p style={labelStyle}>{copy.walletProviderBlockingRules}</p>
                {scenario.failedRuleIds.length > 0 ? (
                  <div style={chipListStyle}>
                    {scenario.failedRuleIds.map((ruleId) => (
                      <span key={ruleId} style={chipStyle}>{ruleId}</span>
                    ))}
                  </div>
                ) : (
                  <p style={mutedTextStyle}>{copy.walletProviderEvidenceNoFailedRules}</p>
                )}
              </div>
              <p style={wrapTextStyle}>
                {copy.nextAction}: {getLocalizedText(scenario.nextAction, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.nonLiveBoundary}: {getLocalizedText(scenario.boundary, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={copy.walletProviderEvidenceStateRecovery} style={panelStyle}>
          <div style={rowStyle}>
            <div style={stackStyle}>
              <p style={labelStyle}>{copy.walletProviderEvidenceStateRecoveryEyebrow}</p>
              <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
                {copy.walletProviderEvidenceStateRecovery}
              </h3>
              <p style={mutedTextStyle}>{copy.walletProviderEvidenceStateRecoverySubtitle}</p>
            </div>
            <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <PublishStateBadge
                label={walletProviderEvidenceRecoverySourceLabel(walletProviderEvidenceRecovery.source, copy)}
                state={walletProviderEvidenceRecovery.status === "fallback_invalid_snapshot" ? "warning" : "ready"}
              />
              <PublishStateBadge
                label={walletProviderEvidenceReleaseReadiness.summary.ready
                  ? copy.walletProviderReleaseStateReady
                  : copy.walletProviderReleaseStateBlocked}
                state={walletProviderEvidenceReleaseReadiness.summary.ready ? "ready" : "blocker"}
              />
            </span>
          </div>
          <div style={boundaryStyle}>
            <p style={{ margin: 0 }}>{copy.walletProviderEvidenceStateRecoveryBoundary}</p>
            <p style={{ margin: "8px 0 0" }}>
              {copy.nonLiveBoundary}: {getLocalizedText(walletProviderEvidenceRecovery.boundary, locale)}
            </p>
            {walletProviderEvidenceRecovery.validationErrors.length > 0 ? (
              <p style={{ margin: "8px 0 0" }}>
                {copy.walletProviderRecoveryFallback}:{" "}
                {getLocalizedText(walletProviderEvidenceRecovery.validationErrors[0].message, locale)}
              </p>
            ) : null}
          </div>
          <div style={compactGridStyle}>
            <article style={cardStyle}>
              <p style={labelStyle}>{copy.walletProviderRecoveryActiveSource}</p>
              <p style={valueStyle}>
                {walletProviderEvidenceRecoverySourceLabel(walletProviderEvidenceRecovery.source, copy)}
              </p>
              <PublishStateBadge
                label={walletProviderEvidenceRecoveryStatusLabel(walletProviderEvidenceRecovery.status, copy)}
                state={walletProviderEvidenceRecovery.status === "fallback_invalid_snapshot" ? "warning" : "ready"}
              />
            </article>
            <article style={cardStyle}>
              <p style={labelStyle}>{copy.walletProviderApprovedRequiredScenarios}</p>
              <p style={valueStyle}>
                {walletProviderEvidenceReleaseReadiness.summary.approvedRequiredScenarios}/
                {walletProviderEvidenceReleaseReadiness.summary.requiredScenarios}
              </p>
              <PublishStateBadge
                label={walletProviderEvidenceReleaseReadiness.summary.ready
                  ? copy.walletProviderReleaseStateReady
                  : copy.walletProviderReleaseStateBlocked}
                state={walletProviderEvidenceReleaseReadiness.summary.ready ? "ready" : "blocker"}
              />
            </article>
            <article style={cardStyle}>
              <p style={labelStyle}>{copy.walletProviderRecoveryStorageStatus}</p>
              <p style={valueStyle}>
                {walletProviderEvidenceRecoveryStorageLabel(walletProviderEvidenceRecovery.storage.state, copy)}
              </p>
              <PublishStateBadge
                label={walletProviderEvidenceRecoveryStorageLabel(walletProviderEvidenceRecovery.storage.state, copy)}
                state={walletProviderEvidenceRecoveryStorageBadgeState(walletProviderEvidenceRecovery.storage.state)}
              />
            </article>
            <article style={cardStyle}>
              <p style={labelStyle}>{copy.walletProviderRecoveryLastRecoveredAt}</p>
              <p style={valueStyle}>{walletProviderEvidenceRecoveryUi.lastRecoveredAt}</p>
              <p style={mutedTextStyle}>{getLocalizedText(walletProviderEvidenceRecovery.storage.message, locale)}</p>
            </article>
          </div>
          <div style={actionButtonGridStyle}>
            <button
              aria-label={copy.walletProviderRecoveryLoadApprovedSample}
              onClick={loadWalletProviderEvidenceApprovedSample}
              style={actionButtonStyle}
              type="button"
            >
              <FileCheck2 aria-hidden="true" size={15} strokeWidth={2.4} />
              {copy.walletProviderRecoveryLoadApprovedSample}
            </button>
            <button
              aria-label={copy.walletProviderRecoverySaveCurrentState}
              onClick={saveWalletProviderEvidenceRecoveryState}
              style={actionButtonStyle}
              type="button"
            >
              <Save aria-hidden="true" size={15} strokeWidth={2.4} />
              {copy.walletProviderRecoverySaveCurrentState}
            </button>
            <button
              aria-label={copy.walletProviderRecoveryRestoreSavedState}
              onClick={restoreWalletProviderEvidenceRecoveryState}
              style={actionButtonStyle}
              type="button"
            >
              <FolderOpen aria-hidden="true" size={15} strokeWidth={2.4} />
              {copy.walletProviderRecoveryRestoreSavedState}
            </button>
            <button
              aria-label={copy.walletProviderRecoveryResetLocalState}
              onClick={resetWalletProviderEvidenceRecoveryState}
              style={actionButtonStyle}
              type="button"
            >
              <RotateCcw aria-hidden="true" size={15} strokeWidth={2.4} />
              {copy.walletProviderRecoveryResetLocalState}
            </button>
          </div>
          <p style={wrapTextStyle}>
            {copy.nextAction}: {getLocalizedText(walletProviderEvidenceRecovery.nextAction, locale)}
          </p>
      </section>

      <section aria-label={copy.walletProviderEvidenceRequestPacket} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.walletProviderEvidenceRequestPacketEyebrow}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.walletProviderEvidenceRequestPacket}
            </h3>
            <p style={mutedTextStyle}>{copy.walletProviderEvidenceRequestPacketSubtitle}</p>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <PublishStateBadge
              label={walletProviderEvidenceRequestPacket.summary.ready
                ? copy.walletProviderRequestStatusReady
                : copy.walletProviderRequestStatusBlocked}
              state={walletProviderEvidenceRequestPacket.summary.ready ? "ready" : "blocker"}
            />
            <PublishStateBadge
              label={`${walletProviderEvidenceRequestPacket.summary.launchBlockingRequests} ${copy.walletProviderRequestLaunchBlockingRequests}`}
              state={walletProviderEvidenceRequestPacket.summary.launchBlockingRequests > 0 ? "blocker" : "ready"}
            />
            <Badge
              label={`${walletProviderEvidenceRequestPacket.summary.attachedEvidenceReferences} ${copy.walletProviderCloseoutAttachedEvidence}`}
              tone="info"
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{copy.walletProviderReviewActionsBoundary}</p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.walletProviderReviewActions}: {copy.walletProviderReviewActionsSubtitle}
          </p>
          {walletProviderEvidenceActionResult ? (
            <p style={{ margin: "8px 0 0" }}>
              {copy.walletProviderReviewLatestResult}:{" "}
              <strong>{walletProviderEvidenceActionResult.ok
                ? copy.walletProviderReviewActionSucceeded
                : copy.walletProviderReviewActionBlocked}</strong>{" "}
              · {copy.walletProviderReviewScenario}: {walletProviderEvidenceActionResult.scenarioId} ·{" "}
              {copy.walletProviderApprovedRequiredScenarios}:{" "}
              {walletProviderEvidenceActionResult.releaseReadiness.summary.approvedRequiredScenarios}/
              {walletProviderEvidenceActionResult.releaseReadiness.summary.requiredScenarios} ·{" "}
              {getLocalizedText(walletProviderEvidenceLatestActionNextAction, locale)}
            </p>
          ) : (
            <p style={{ margin: "8px 0 0" }}>{copy.walletProviderReviewNoLatestResult}</p>
          )}
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{getLocalizedText(walletProviderEvidenceRequestPacket.boundary, locale)}</p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.walletProviderEvidenceTopScenario}: {walletProviderEvidenceRequestPacket.summary.topScenarioId}
          </p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.walletProviderEvidenceTopFailedRule}:{" "}
            {walletProviderEvidenceRequestPacket.summary.topFailedRuleId ??
              copy.walletProviderEvidenceNoFailedRules}
          </p>
        </div>
        <div style={compactGridStyle}>
          {walletProviderEvidenceRequestSummaryItems.map((item) => (
            <article key={item.id} style={cardStyle}>
              <p style={labelStyle}>{item.label}</p>
              <p style={valueStyle}>{item.value}</p>
              <PublishStateBadge label={item.label} state={item.state} />
            </article>
          ))}
        </div>
        <div style={gridStyle}>
          {walletProviderEvidenceRequestPacket.scenarios.map((scenario) => (
            <article key={scenario.id} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>
                    {copy.walletProviderRequestPriority} {scenario.priority} ·{" "}
                    {getLocalizedText(scenario.provider, locale)}
                  </p>
                  <strong>{getLocalizedText(scenario.label, locale)}</strong>
                </div>
                <PublishStateBadge
                  label={walletProviderEvidenceRequestStatusLabel(scenario.requestStatus, copy)}
                  state={walletProviderEvidenceRequestState(scenario.requestStatus)}
                />
              </div>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{copy.walletProviderRequestStatus}</p>
                  <PublishStateBadge
                    label={walletProviderEvidenceRequestStatusLabel(scenario.requestStatus, copy)}
                    state={walletProviderEvidenceRequestState(scenario.requestStatus)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.walletProviderRequiredForRelease}</p>
                  <PublishStateBadge
                    label={scenario.requiredForRelease ? copy.required : copy.optional}
                    state={scenario.requiredForRelease ? "warning" : "ready"}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.walletProviderEvidenceArtifactCoverage}</p>
                  <p style={mutedTextStyle}>
                    {scenario.requiredArtifactIds.length - scenario.missingRequiredArtifactIds.length}/
                    {scenario.requiredArtifactIds.length}
                  </p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.walletProviderRequestTargetEvidencePath}</p>
                  <p style={codeListStyle}>{scenario.targetEvidencePath}</p>
                </div>
              </div>
              <div style={stackStyle}>
                <p style={labelStyle}>{copy.walletProviderEvidenceExpectedArtifacts}</p>
                <div style={chipListStyle}>
                  {scenario.requiredArtifactIds.map((artifactId) => (
                    <span key={artifactId} style={chipStyle}>{artifactId}</span>
                  ))}
                </div>
              </div>
              <div style={stackStyle}>
                <p style={labelStyle}>{copy.walletProviderEvidenceMissingRequiredArtifacts}</p>
                {scenario.missingRequiredArtifactIds.length > 0 ? (
                  <div style={chipListStyle}>
                    {scenario.missingRequiredArtifactIds.map((artifactId) => (
                      <span key={artifactId} style={chipStyle}>{artifactId}</span>
                    ))}
                  </div>
                ) : (
                  <p style={mutedTextStyle}>{copy.walletProviderEvidenceNoMissingArtifacts}</p>
                )}
              </div>
              <div style={stackStyle}>
                <p style={labelStyle}>{copy.walletProviderCloseoutAttachedEvidence}</p>
                {scenario.attachedEvidenceReferences.length > 0 ? (
                  <div style={chipListStyle}>
                    {scenario.attachedEvidenceReferences.map((reference) => (
                      <span key={reference} style={chipStyle}>{reference}</span>
                    ))}
                  </div>
                ) : (
                  <p style={mutedTextStyle}>{copy.walletProviderCloseoutNoAttachedEvidence}</p>
                )}
              </div>
              <div style={stackStyle}>
                <p style={labelStyle}>{copy.walletProviderBlockingRules}</p>
                {scenario.failedRuleIds.length > 0 ? (
                  <div style={chipListStyle}>
                    {scenario.failedRuleIds.map((ruleId) => (
                      <span key={ruleId} style={chipStyle}>{ruleId}</span>
                    ))}
                  </div>
                ) : (
                  <p style={mutedTextStyle}>{copy.walletProviderEvidenceNoFailedRules}</p>
                )}
              </div>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{copy.walletProviderRequestAcceptanceCriteria}</p>
                  <p style={wrapTextStyle}>{getLocalizedText(scenario.acceptanceCriteria, locale)}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.walletProviderRequestQaCaptureInstructions}</p>
                  <p style={wrapTextStyle}>{getLocalizedText(scenario.qaCaptureInstructions, locale)}</p>
                </div>
              </div>
              <p style={wrapTextStyle}>
                {copy.nextAction}: {getLocalizedText(scenario.nextAction, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.nonLiveBoundary}: {getLocalizedText(scenario.boundary, locale)}
              </p>
              <div style={stackStyle}>
                <p style={labelStyle}>{copy.walletProviderReviewActions}</p>
                <div style={actionButtonGridStyle}>
                  {([
                    "submit_evidence",
                    "approve_evidence",
                    "reject_evidence",
                    "reopen_evidence",
                  ] as WalletProviderEvidenceReviewActionId[]).map((actionId) => {
                    const scenarioActions = walletProviderEvidenceActionsByScenario[scenario.id];
                    const action = scenarioActions?.find((candidate) => candidate.id === actionId);
                    const disabled = action?.state === "blocked";
                    const Icon = walletProviderEvidenceReviewActionIcon[actionId];

                    return (
                      <button
                        aria-label={`${walletProviderEvidenceReviewActionLabel(actionId, copy)} · ${scenario.id}`}
                        disabled={disabled}
                        key={actionId}
                        onClick={() =>
                          runWalletProviderEvidenceReviewAction(
                            actionId,
                            scenario.id,
                            scenario.requiredArtifactIds,
                          )
                        }
                        style={disabled ? disabledActionButtonStyle : actionButtonStyle}
                        title={action ? getLocalizedText(action.blockedReason ?? action.nextAction, locale) : copy.walletProviderReviewActionsBoundary}
                        type="button"
                      >
                        <Icon aria-hidden="true" size={15} strokeWidth={2.4} />
                        {walletProviderEvidenceReviewActionLabel(actionId, copy)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={copy.walletProviderEvidenceActivation} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.walletProviderActivationState}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.walletProviderEvidenceActivation}
            </h3>
            <p style={mutedTextStyle}>{copy.walletProviderEvidenceActivationSubtitle}</p>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <PublishStateBadge
              label={walletProviderEvidenceActivation.summary.ready
                ? copy.walletProviderActivationStateReady
                : copy.walletProviderActivationStateBlocked}
              state={walletProviderEvidenceActivation.summary.ready ? "ready" : "blocker"}
            />
            <PublishStateBadge
              label={`${walletProviderEvidenceActivation.summary.readyScenarios}/${walletProviderEvidenceActivation.summary.totalScenarios} ${copy.walletProviderActivationReadyScenarios}`}
              state={walletProviderEvidenceActivation.summary.ready ? "ready" : "warning"}
            />
            <PublishStateBadge
              label={`${walletProviderEvidenceActivation.summary.blockedScenarios} ${copy.walletProviderActivationBlockedScenarios}`}
              state={walletProviderEvidenceActivation.summary.blockedScenarios > 0 ? "blocker" : "ready"}
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{copy.walletProviderEvidenceActivationBoundary}</p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.walletProviderEvidenceTopScenario}: {walletProviderEvidenceActivation.summary.topScenarioId}
          </p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.walletProviderActivationTopBlocker}:{" "}
            {walletProviderEvidenceActivation.summary.topBlockerId ??
              copy.walletProviderActivationNoBlockers}
          </p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.walletProviderActivationNextAction}:{" "}
            {getLocalizedText(walletProviderEvidenceActivation.nextAction, locale)}
          </p>
        </div>
        <div style={compactGridStyle}>
          {walletProviderEvidenceActivationSummaryItems.map((item) => (
            <article key={item.id} style={cardStyle}>
              <p style={labelStyle}>{item.label}</p>
              <p style={valueStyle}>{item.value}</p>
              <PublishStateBadge label={item.label} state={item.state} />
            </article>
          ))}
        </div>
        <div style={gridStyle}>
          {walletProviderEvidenceActivation.scenarios.map((scenario) => (
            <article key={scenario.id} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{scenario.id}</p>
                  <strong>{getLocalizedText(scenario.title, locale)}</strong>
                </div>
                <PublishStateBadge
                  label={walletProviderEvidenceActivationStateLabel(scenario.activationState, copy)}
                  state={walletProviderEvidenceActivationState(scenario.activationState)}
                />
              </div>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{copy.ownerRole}</p>
                  <p style={mutedTextStyle}>{readableCode(scenario.ownerRole)}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.walletProviderActivationLiveEvidence}</p>
                  <PublishStateBadge
                    label={walletProviderQaLiveLabel(scenario.liveEvidenceStatus, copy)}
                    state={walletProviderQaLiveState(scenario.liveEvidenceStatus)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.walletProviderActivationFeatureGate}</p>
                  <PublishStateBadge
                    label={walletProviderEvidenceActivationFeatureGateLabel(scenario.featureGateState, copy)}
                    state={walletProviderEvidenceActivationFeatureGateState(scenario.featureGateState)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.walletProviderActivationReviewerState}</p>
                  <PublishStateBadge
                    label={walletProviderEvidenceActivationReviewerLabel(scenario.reviewerState, copy)}
                    state={walletProviderEvidenceActivationReviewerState(scenario.reviewerState)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.walletProviderActivationReleaseState}</p>
                  <PublishStateBadge
                    label={walletProviderEvidenceReleaseStateLabel(scenario.releaseState, copy)}
                    state={walletProviderEvidenceReleaseState(scenario.releaseState)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.walletProviderActivationState}</p>
                  <PublishStateBadge
                    label={walletProviderEvidenceActivationStateLabel(scenario.activationState, copy)}
                    state={walletProviderEvidenceActivationState(scenario.activationState)}
                  />
                </div>
              </div>
              <div style={compactGridStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{copy.walletProviderActivationRequiredArtifacts}</p>
                  <div style={chipListStyle}>
                    {scenario.requiredArtifactTypes.map((artifactType) => (
                      <span key={artifactType} style={chipStyle}>
                        {walletProviderEvidenceArtifactTypeLabel(artifactType, copy)}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={stackStyle}>
                  <p style={labelStyle}>{copy.walletProviderActivationMissingArtifactTypes}</p>
                  {scenario.missingArtifactTypes.length > 0 ? (
                    <div style={chipListStyle}>
                      {scenario.missingArtifactTypes.map((artifactType) => (
                        <span key={artifactType} style={chipStyle}>
                          {walletProviderEvidenceArtifactTypeLabel(artifactType, copy)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={mutedTextStyle}>{copy.walletProviderActivationNoMissingArtifactTypes}</p>
                  )}
                </div>
              </div>
              <div style={stackStyle}>
                <p style={labelStyle}>{copy.walletProviderActivationSubmittedArtifacts}</p>
                {scenario.submittedArtifacts.length > 0 ? (
                  <div style={sourceMetricListStyle}>
                    {scenario.submittedArtifacts.map((artifact) => (
                      <div key={`${artifact.artifactType}-${artifact.reference}`} style={sourceMetricChipStyle}>
                        <span>{walletProviderEvidenceArtifactTypeLabel(artifact.artifactType, copy)}</span>
                        <PublishStateBadge
                          label={walletProviderEvidenceStatusLabel(artifact.status, copy)}
                          state={walletProviderEvidenceStatusState(artifact.status)}
                        />
                        <span style={codeListStyle}>{artifact.reference}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={mutedTextStyle}>{copy.walletProviderActivationNoSubmittedArtifacts}</p>
                )}
              </div>
              <div style={stackStyle}>
                <p style={labelStyle}>{copy.walletProviderActivationBlockers}</p>
                {scenario.blockerIds.length > 0 ? (
                  <div style={chipListStyle}>
                    {scenario.blockerIds.map((blockerId) => (
                      <span key={blockerId} style={chipStyle}>{blockerId}</span>
                    ))}
                  </div>
                ) : (
                  <p style={mutedTextStyle}>{copy.walletProviderActivationNoBlockers}</p>
                )}
              </div>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{copy.walletProviderActivationDependency}</p>
                  <p style={wrapTextStyle}>{getLocalizedText(scenario.dependency, locale)}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.evidenceNeeded}</p>
                  <p style={wrapTextStyle}>{getLocalizedText(scenario.evidenceNeeded, locale)}</p>
                </div>
              </div>
              <p style={wrapTextStyle}>
                {copy.walletProviderActivationNextAction}: {getLocalizedText(scenario.nextAction, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.nonLiveBoundary}: {getLocalizedText(scenario.boundary, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={copy.walletAdapterReadiness} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.walletAdapterReadinessSubtitle}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.walletAdapterReadiness}
            </h3>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${walletAdapterReadiness.summary.configuredAdapters} ${copy.walletAdapterConfigured}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${walletAdapterReadiness.summary.missingLiveEvidenceAdapters} ${copy.walletAdapterMissingLiveEvidence}`}
              state={walletAdapterReadiness.summary.missingLiveEvidenceAdapters > 0 ? "warning" : "ready"}
            />
            <PublishStateBadge
              label={`${walletAdapterReadiness.summary.releaseBlockers} ${copy.releaseBlockers}`}
              state={walletAdapterReadiness.summary.releaseBlockers > 0 ? "blocker" : "ready"}
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{getLocalizedText(walletAdapterReadiness.boundary, locale)}</p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.nextAction}: {getLocalizedText(walletAdapterReadiness.nextAction, locale)}
          </p>
        </div>
        <div style={compactGridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.walletAdapterConfigured}</p>
            <p style={valueStyle}>{walletAdapterReadiness.summary.configuredAdapters}</p>
            <p style={mutedTextStyle}>{copy.walletAdapterReadinessSubtitle}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.walletAdapterEnabledPreview}</p>
            <p style={valueStyle}>{walletAdapterReadiness.summary.enabledPreviewAdapters}</p>
            <p style={mutedTextStyle}>{copy.configGate}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.walletAdapterMaintenance}</p>
            <p style={valueStyle}>{walletAdapterReadiness.summary.maintenanceAdapters}</p>
            <p style={mutedTextStyle}>{copy.fallback}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.walletAdapterInternalOnly}</p>
            <p style={valueStyle}>{walletAdapterReadiness.summary.internalOnlyAdapters}</p>
            <p style={mutedTextStyle}>{copy.walletAdapterBoundary}</p>
          </article>
        </div>
        <div style={gridStyle}>
          {walletAdapterReadiness.entries.map((entry) => (
            <article key={entry.adapterId} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{entry.adapterName}</p>
                  <strong>{getLocalizedText(entry.displayName, locale)}</strong>
                </div>
                <PublishStateBadge
                  label={readableCode(entry.readiness)}
                  state={adapterReadinessState(entry.readiness)}
                />
              </div>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{copy.walletSource}</p>
                  <p style={mutedTextStyle}>{entry.walletSource}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.accountType}</p>
                  <p style={mutedTextStyle}>{entry.accountType}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.liveEvidence}</p>
                  <PublishStateBadge
                    label={readableCode(entry.liveEvidenceStatus)}
                    state={adapterLiveEvidenceState(entry.liveEvidenceStatus)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.featureGate}</p>
                  <PublishStateBadge
                    label={readableCode(entry.featureGate.state)}
                    state={entry.featureGate.state === "blocked" ? "blocker" : "warning"}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.fallback}</p>
                  <PublishStateBadge
                    label={readableCode(entry.fallback.mode)}
                    state={entry.fallback.blocksLaunch ? "blocker" : "warning"}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.matchedSessions}</p>
                  <p style={mutedTextStyle}>{entry.matchedSessionIds.join(", ") || "-"}</p>
                </div>
              </div>
              <p style={mutedTextStyle}>
                {copy.configGate}: {entry.featureGate.configKey} · {getLocalizedText(entry.featureGate.operatorMessage, locale)}
              </p>
              <p style={mutedTextStyle}>
                {copy.fallback}: {getLocalizedText(entry.fallback.reason, locale)}
              </p>
              <p style={mutedTextStyle}>
                {copy.nextAction}: {getLocalizedText(entry.nextAction, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={copy.liveConnectorReleaseReview} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.liveConnectorReleaseReviewSubtitle}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.liveConnectorReleaseReview}
            </h3>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${liveWalletConnectorBoundary.summary.totalConnectors} ${copy.liveConnectorCandidates}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${liveWalletConnectorBoundary.summary.missingLiveEvidenceConnectors} ${copy.liveConnectorMissingEvidence}`}
              state={
                liveWalletConnectorBoundary.summary.missingLiveEvidenceConnectors > 0
                  ? "warning"
                  : "ready"
              }
            />
            <PublishStateBadge
              label={`${liveWalletConnectorBoundary.summary.releaseBlockers} ${copy.liveConnectorReleaseBlockers}`}
              state={liveWalletConnectorBoundary.summary.releaseBlockers > 0 ? "blocker" : "ready"}
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{getLocalizedText(liveWalletConnectorBoundary.boundary, locale)}</p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.nextAction}: {getLocalizedText(liveWalletConnectorBoundary.nextAction, locale)}
          </p>
        </div>
        <div style={compactGridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.liveConnectorCandidates}</p>
            <p style={valueStyle}>{liveWalletConnectorBoundary.summary.totalConnectors}</p>
            <p style={mutedTextStyle}>{copy.liveConnectorCandidatePackages}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.liveConnectorDisabledReviewRequired}</p>
            <p style={valueStyle}>
              {liveWalletConnectorBoundary.summary.disabledConnectors +
                liveWalletConnectorBoundary.summary.reviewRequiredConnectors}
            </p>
            <p style={mutedTextStyle}>{copy.liveConnectorFeatureGateState}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.liveConnectorMissingEvidence}</p>
            <p style={valueStyle}>{liveWalletConnectorBoundary.summary.missingLiveEvidenceConnectors}</p>
            <p style={mutedTextStyle}>{copy.liveConnectorLiveQaRequired}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.liveConnectorReleaseBlockers}</p>
            <p style={valueStyle}>{liveWalletConnectorBoundary.summary.releaseBlockers}</p>
            <p style={mutedTextStyle}>{copy.liveConnectorNoProductionEnablement}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.liveConnectorReviewApprovalRequired}</p>
            <p style={valueStyle}>{liveWalletConnectorBoundary.summary.approvedConnectors}</p>
            <p style={mutedTextStyle}>{copy.liveConnectorReviewApprovalRequired}</p>
          </article>
        </div>
        <div style={gridStyle}>
          {liveWalletConnectorBoundary.entries.map((entry) => (
            <article key={entry.connectorId} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{entry.connectorId}</p>
                  <strong>{getLocalizedText(entry.displayName, locale)}</strong>
                </div>
                <PublishStateBadge
                  label={readableCode(entry.readiness)}
                  state={liveConnectorReadinessState(entry.readiness)}
                />
              </div>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{copy.liveConnectorCandidatePackage}</p>
                  <p style={wrapTextStyle}>{entry.packageName}</p>
                  <p style={wrapTextStyle}>{entry.packageVersionSource}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.liveConnectorDependencyRisk}</p>
                  <PublishStateBadge
                    label={entry.dependencyRisk}
                    state={entry.dependencyRisk === "high" ? "blocker" : "warning"}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.liveConnectorFeatureGateState}</p>
                  <PublishStateBadge
                    label={readableCode(entry.featureGateState)}
                    state={entry.featureGateState === "blocked" ? "blocker" : "warning"}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.liveEvidence}</p>
                  <PublishStateBadge
                    label={readableCode(entry.liveEvidenceStatus)}
                    state={liveConnectorEvidenceState(entry.liveEvidenceStatus)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.liveConnectorReadiness}</p>
                  <PublishStateBadge
                    label={readableCode(entry.readiness)}
                    state={liveConnectorReadinessState(entry.readiness)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.liveConnectorReleaseImpact}</p>
                  <PublishStateBadge
                    label={readableCode(entry.releaseImpact)}
                    state={entry.releaseImpact === "release_blocker" ? "blocker" : "warning"}
                  />
                </div>
              </div>
              <p style={mutedTextStyle}>
                {copy.liveConnectorFallbackReason}: {getLocalizedText(entry.fallback.reason, locale)}
              </p>
              <p style={mutedTextStyle}>
                {copy.nextAction}: {getLocalizedText(entry.nextAction, locale)}
              </p>
              <p style={mutedTextStyle}>
                {copy.liveConnectorNoProductionEnablement}: {getLocalizedText(entry.securityBoundary, locale)}
              </p>
            </article>
          ))}
        </div>
        <div style={gridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.liveConnectorCandidatePackages}</p>
            <div style={sourceMetricListStyle}>
              {liveWalletConnectorBoundary.packageCandidates.map((candidate) => (
                <span
                  key={candidate.packageName}
                  style={{
                    ...sourceMetricChipStyle,
                    ...sourceMetricToneStyles[
                      candidate.dependencyRisk === "high" ? "risk" : "warning"
                    ],
                  }}
                >
                  {candidate.packageName} ({candidate.packageVersionSource}) ·{" "}
                  {copy.liveConnectorDependencyRisk}: {candidate.dependencyRisk} ·{" "}
                  {getLocalizedText(candidate.role, locale)}
                </span>
              ))}
            </div>
            <p style={wrapTextStyle}>{getLocalizedText(liveWalletConnectorBoundary.packageVersionSource, locale)}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.liveConnectorForbiddenOperations}</p>
            <p style={mutedTextStyle}>{copy.liveConnectorOperationBoundary}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {liveWalletConnectorBoundary.forbiddenOperations.map((operation) => (
                <PublishStateBadge
                  key={operation.name}
                  label={operation.name}
                  state={operation.state === "blocked" ? "blocker" : "warning"}
                />
              ))}
            </div>
          </article>
        </div>
      </section>

      <section aria-label={copy.serviceRegistryGovernance} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.serviceRegistryGovernanceSubtitle}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.serviceRegistryGovernance}
            </h3>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${serviceGovernance.summary.totalServices} ${copy.totalItems}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${serviceGovernance.summary.releaseBlockers} ${copy.releaseBlockers}`}
              state={serviceGovernance.summary.releaseBlockers > 0 ? "blocker" : "ready"}
            />
            <PublishStateBadge
              label={`${serviceGovernance.needsReview.length} ${copy.reviewRequired}`}
              state={serviceGovernance.needsReview.length > 0 ? "warning" : "ready"}
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{copy.noLiveBoundary}: {getLocalizedText(serviceGovernance.boundary, locale)}</p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.ownerNextAction}: {getLocalizedText(serviceGovernance.topOwnerAction, locale)}
          </p>
        </div>
        <div style={compactGridStyle}>
          {serviceSummaryItems.map((item) => (
            <article key={item.id} style={cardStyle}>
              <div style={rowStyle}>
                <p style={labelStyle}>{item.label}</p>
                <PublishStateBadge label={item.label} state={item.state} />
              </div>
              <p style={valueStyle}>{item.value}</p>
              <p style={mutedTextStyle}>{copy.serviceSummary}</p>
            </article>
          ))}
        </div>
        <div style={gridStyle}>
          <article style={cardStyle}>
            <div style={rowStyle}>
              <strong>{copy.releaseBlockers}</strong>
              <PublishStateBadge
                label={`${serviceGovernance.blockers.length} ${copy.releaseBlockers}`}
                state={serviceGovernance.blockers.length > 0 ? "blocker" : "ready"}
              />
            </div>
            <div style={stackStyle}>
              {serviceGovernance.blockers.map((entry) => (
                <div key={entry.id} style={{ borderTop: "1px solid #dbe6f4", display: "grid", gap: 6, paddingTop: 10 }}>
                  <div style={rowStyle}>
                    <div style={stackStyle}>
                      <p style={labelStyle}>{entry.id}</p>
                      <strong>{getLocalizedText(entry.name, locale)}</strong>
                    </div>
                    <PublishStateBadge
                      label={serviceStateLabel(entry.state, copy)}
                      state={serviceStateBadge(entry)}
                    />
                  </div>
                  <p style={mutedTextStyle}>
                    {copy.releaseImpact}: {serviceReleaseImpactLabel(entry.releaseImpact, copy)}
                  </p>
                  <p style={wrapTextStyle}>
                    {copy.fallback}: {getLocalizedText(entry.fallback.reason, locale)}
                  </p>
                  <p style={wrapTextStyle}>
                    {copy.ownerNextAction}: {getLocalizedText(entry.operatorNextAction, locale)}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article style={cardStyle}>
            <div style={rowStyle}>
              <strong>{copy.maintenanceOfflineServices}</strong>
              <PublishStateBadge
                label={`${serviceGovernance.maintenanceOrOffline.length} ${copy.maintenanceOfflineServices}`}
                state={serviceGovernance.maintenanceOrOffline.length > 0 ? "warning" : "ready"}
              />
            </div>
            <div style={stackStyle}>
              {serviceGovernance.maintenanceOrOffline.map((entry) => (
                <div key={entry.id} style={{ borderTop: "1px solid #dbe6f4", display: "grid", gap: 6, paddingTop: 10 }}>
                  <div style={rowStyle}>
                    <strong>{getLocalizedText(entry.name, locale)}</strong>
                    <PublishStateBadge
                      label={serviceStateLabel(entry.state, copy)}
                      state={serviceStateBadge(entry)}
                    />
                  </div>
                  <p style={wrapTextStyle}>
                    {copy.fallback}: {getLocalizedText(entry.fallback.reason, locale)}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article style={cardStyle}>
            <div style={rowStyle}>
              <strong>{copy.servicesNeedReview}</strong>
              <PublishStateBadge
                label={`${serviceGovernance.needsReview.length} ${copy.reviewRequired}`}
                state={serviceGovernance.needsReview.length > 0 ? "warning" : "ready"}
              />
            </div>
            <div style={stackStyle}>
              {serviceGovernance.needsReview.slice(0, 8).map((entry) => (
                <div key={entry.id} style={{ borderTop: "1px solid #dbe6f4", display: "grid", gap: 6, paddingTop: 10 }}>
                  <div style={rowStyle}>
                    <strong>{getLocalizedText(entry.name, locale)}</strong>
                    <PublishStateBadge
                      label={serviceReleaseImpactLabel(entry.releaseImpact, copy)}
                      state={serviceReleaseImpactState(entry.releaseImpact)}
                    />
                  </div>
                  <p style={wrapTextStyle}>
                    {copy.nextAction}: {getLocalizedText(entry.operatorNextAction, locale)}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </div>
        <div style={rowStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.groupedServices}</h3>
          <Badge
            label={`${serviceGovernance.groups.length} ${copy.category}`}
            tone="info"
          />
        </div>
        <div style={gridStyle}>
          {serviceGovernance.groups.map((group) => (
            <article key={group.category} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{readableCode(group.category)}</p>
                  <strong>{getLocalizedText(group.label, locale)}</strong>
                </div>
                <Badge label={`${group.entries.length} ${copy.totalItems}`} tone="info" />
              </div>
              <div style={stackStyle}>
                {group.entries.map((entry) => (
                  <div key={entry.id} style={{ borderTop: "1px solid #dbe6f4", display: "grid", gap: 8, paddingTop: 10 }}>
                    <div style={rowStyle}>
                      <strong>{getLocalizedText(entry.name, locale)}</strong>
                      <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <PublishStateBadge
                          label={serviceStateLabel(entry.state, copy)}
                          state={serviceStateBadge(entry)}
                        />
                        <PublishStateBadge
                          label={serviceReleaseImpactLabel(entry.releaseImpact, copy)}
                          state={serviceReleaseImpactState(entry.releaseImpact)}
                        />
                      </span>
                    </div>
                    <div style={compactGridStyle}>
                      <div>
                        <p style={labelStyle}>{copy.ownerRole}</p>
                        <p style={mutedTextStyle}>{readableCode(entry.ownerRole)}</p>
                      </div>
                      <div>
                        <p style={labelStyle}>{copy.riskLevel}</p>
                        <p style={mutedTextStyle}>{entry.riskLevel}</p>
                      </div>
                      <div>
                        <p style={labelStyle}>{copy.liveEvidence}</p>
                        <PublishStateBadge
                          label={serviceLiveEvidenceLabel(entry.liveEvidenceStatus, copy)}
                          state={serviceLiveEvidenceState(entry.liveEvidenceStatus)}
                        />
                      </div>
                      <div>
                        <p style={labelStyle}>{copy.featureGate}</p>
                        <PublishStateBadge
                          label={serviceStateLabel(entry.featureGate.state, copy)}
                          state={entry.featureGate.enabled && !entry.featureGate.reviewRequired ? "ready" : "warning"}
                        />
                      </div>
                      <div>
                        <p style={labelStyle}>{copy.fallback}</p>
                        <PublishStateBadge
                          label={getLocalizedText(entry.fallback.label, locale)}
                          state={entry.fallback.blocksLaunch ? "blocker" : "warning"}
                        />
                      </div>
                      <div>
                        <p style={labelStyle}>{copy.serviceState}</p>
                        <p style={mutedTextStyle}>{entry.featureGate.key}</p>
                      </div>
                    </div>
                    <p style={wrapTextStyle}>
                      {copy.fallback}: {getLocalizedText(entry.fallback.reason, locale)}
                    </p>
                    <p style={wrapTextStyle}>
                      {copy.ownerNextAction}: {getLocalizedText(entry.operatorNextAction, locale)}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={copy.providerEvidenceRegistry} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.providerEvidenceRegistrySubtitle}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.providerEvidenceRegistry}
            </h3>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${providerEvidenceRegistry.summary.totalEntries} ${copy.totalItems}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${providerEvidenceRegistry.summary.missingLiveEvidenceEntries} ${copy.liveEvidenceMissing}`}
              state={providerEvidenceRegistry.summary.missingLiveEvidenceEntries > 0 ? "warning" : "ready"}
            />
            <PublishStateBadge
              label={`${providerEvidenceRegistry.summary.launchBlockers} ${copy.releaseBlockers}`}
              state={providerEvidenceRegistry.summary.launchBlockers > 0 ? "blocker" : "ready"}
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{getLocalizedText(providerEvidenceRegistry.boundary, locale)}</p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.nextAction}: {getLocalizedText(providerEvidenceRegistry.nextAction, locale)}
          </p>
        </div>
        <div style={compactGridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.totalItems}</p>
            <p style={valueStyle}>{providerEvidenceRegistry.summary.totalEntries}</p>
            <p style={mutedTextStyle}>{copy.providerEvidenceRegistrySubtitle}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.liveEvidenceMissing}</p>
            <p style={valueStyle}>{providerEvidenceRegistry.summary.missingLiveEvidenceEntries}</p>
            <p style={mutedTextStyle}>{copy.liveEvidence}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.localOnlyReadiness}</p>
            <p style={valueStyle}>{providerEvidenceRegistry.summary.localOnlyEntries}</p>
            <p style={mutedTextStyle}>{copy.seededEvidence}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.reviewRequired}</p>
            <p style={valueStyle}>{providerEvidenceRegistry.summary.reviewRequiredEntries}</p>
            <p style={mutedTextStyle}>{copy.humanReviewRequired}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.unavailableReadiness}</p>
            <p style={valueStyle}>{providerEvidenceRegistry.summary.unavailableEntries}</p>
            <p style={mutedTextStyle}>{copy.configGate}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.blocker}</p>
            <p style={valueStyle}>{providerEvidenceRegistry.summary.blockedEntries}</p>
            <p style={mutedTextStyle}>{copy.releaseBlockers}</p>
          </article>
        </div>
        <div style={gridStyle}>
          {providerEvidenceRegistryEntries.map((entry) => (
            <article key={entry.id} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{entry.providerId}</p>
                  <strong>{getLocalizedText(entry.label, locale)}</strong>
                </div>
                <PublishStateBadge
                  label={readableCode(entry.adapterReadiness)}
                  state={providerReadinessState(entry.adapterReadiness)}
                />
              </div>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{copy.category}</p>
                  <p style={mutedTextStyle}>{readableCode(entry.category)}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.liveEvidence}</p>
                  <PublishStateBadge
                    label={readableCode(entry.liveEvidenceStatus)}
                    state={providerLiveEvidenceState(entry.liveEvidenceStatus)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.adapterReadiness}</p>
                  <PublishStateBadge
                    label={readableCode(entry.adapterReadiness)}
                    state={providerReadinessState(entry.adapterReadiness)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.featureGate}</p>
                  <PublishStateBadge
                    label={readableCode(entry.featureGate.state)}
                    state={providerFeatureGateState(entry.featureGate.state)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.fallback}</p>
                  <PublishStateBadge
                    label={getLocalizedText(entry.fallback.label, locale)}
                    state={entry.fallback.blocksLaunch ? "blocker" : "warning"}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.ownerRole}</p>
                  <p style={mutedTextStyle}>{readableCode(entry.ownerRole)}</p>
                </div>
              </div>
              <div>
                <p style={labelStyle}>{copy.affectedOutcomes}</p>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {entry.affectedOutcomes.map((outcome, index) => (
                    <Badge key={`${entry.id}-${outcome}-${index}`} label={readableCode(outcome)} tone="info" />
                  ))}
                </span>
              </div>
              <p style={mutedTextStyle}>
                {copy.configGate}: {entry.featureGate.configKey} · {getLocalizedText(entry.featureGate.operatorMessage, locale)}
              </p>
              <p style={mutedTextStyle}>
                {copy.evidence}: {getLocalizedText(entry.evidenceRequired, locale)}
              </p>
              <p style={mutedTextStyle}>
                {copy.fallback}: {getLocalizedText(entry.fallback.description, locale)}
              </p>
              <p style={mutedTextStyle}>
                {copy.nextAction}: {getLocalizedText(entry.nextAction, locale)}
              </p>
            </article>
          ))}
        </div>
        <article aria-label={copy.p1LocaleActivationReadiness} style={cardStyle}>
          <div style={rowStyle}>
            <div style={stackStyle}>
              <p style={labelStyle}>{copy.p1LocaleActivationSubtitle}</p>
              <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: 0 }}>
                {copy.p1LocaleActivationReadiness}
              </h4>
            </div>
            <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Badge
                label={`${p1LocaleActivationReadiness.summary.totalCandidates} ${copy.localePreference}`}
                tone="info"
              />
              <PublishStateBadge
                label={`${p1LocaleActivationReadiness.summary.blockedCandidates} ${copy.blocked}`}
                state={p1LocaleActivationReadiness.summary.blockedCandidates > 0 ? "blocker" : "ready"}
              />
              <PublishStateBadge
                label={`${p1LocaleActivationReadiness.summary.reviewRequiredCandidates} ${copy.reviewRequired}`}
                state={p1LocaleActivationReadiness.summary.reviewRequiredCandidates > 0 ? "warning" : "ready"}
              />
            </span>
          </div>
          <div style={boundaryStyle}>
            <p style={{ margin: 0 }}>
              {copy.p1LocaleActivationClosedRuntimeBoundary}: {getLocalizedText(p1LocaleActivationReadiness.boundary, locale)}
            </p>
            <p style={{ margin: "8px 0 0" }}>
              {copy.p1LocaleActivationNextAction}: {getLocalizedText(p1LocaleActivationReadiness.nextAction, locale)}
            </p>
          </div>
          <div style={compactGridStyle}>
            <article style={cardStyle}>
              <p style={labelStyle}>{copy.p1LocaleActivationTotalCandidates}</p>
              <p style={valueStyle}>{p1LocaleActivationReadiness.summary.totalCandidates}</p>
              <p style={mutedTextStyle}>{copy.p1LocaleActivationCandidateList}</p>
            </article>
            <article style={cardStyle}>
              <p style={labelStyle}>{copy.p1LocaleActivationBlockedCandidates}</p>
              <p style={valueStyle}>{p1LocaleActivationReadiness.summary.blockedCandidates}</p>
              <p style={mutedTextStyle}>{p1LocaleActivationReadiness.summary.topBlockerId}</p>
            </article>
            <article style={cardStyle}>
              <p style={labelStyle}>{copy.p1LocaleActivationReviewRequiredCandidates}</p>
              <p style={valueStyle}>{p1LocaleActivationReadiness.summary.reviewRequiredCandidates}</p>
              <p style={mutedTextStyle}>{copy.reviewRequired}</p>
            </article>
            <article style={cardStyle}>
              <p style={labelStyle}>{copy.p1LocaleActivationReadyCandidates}</p>
              <p style={valueStyle}>{p1LocaleActivationReadiness.summary.readyCandidates}</p>
              <p style={mutedTextStyle}>{copy.readyActions}</p>
            </article>
            <article style={cardStyle}>
              <p style={labelStyle}>{copy.p1LocaleActivationRequiredEvidence}</p>
              <p style={valueStyle}>{p1LocaleActivationReadiness.summary.requiredEvidenceItems}</p>
              <p style={mutedTextStyle}>{copy.p1LocaleActivationSummary}</p>
            </article>
            <article style={cardStyle}>
              <p style={labelStyle}>{copy.p1LocaleActivationCompletedEvidence}</p>
              <p style={valueStyle}>{p1LocaleActivationReadiness.summary.completedEvidenceItems}</p>
              <p style={mutedTextStyle}>{copy.evidenceStatus}</p>
            </article>
            <article style={cardStyle}>
              <p style={labelStyle}>{copy.p1LocaleActivationRecommendedFirst}</p>
              <p style={valueStyle}>{p1LocaleActivationReadiness.summary.recommendedFirstLocale}</p>
              <p style={mutedTextStyle}>{copy.p1LocaleActivationNextAction}</p>
            </article>
          </div>
          <div style={gridStyle}>
            {p1LocaleActivationReadiness.candidates.map((candidate) => (
              <article key={candidate.locale} style={cardStyle}>
                <div style={rowStyle}>
                  <div style={stackStyle}>
                    <p style={labelStyle}>{candidate.locale}</p>
                    <strong>{getLocalizedText(candidate.label, locale)}</strong>
                  </div>
                  <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {candidate.recommendedFirst ? (
                      <Badge label={copy.p1LocaleActivationRecommendedFirst} tone="info" />
                    ) : null}
                    <PublishStateBadge
                      label={p1LocaleActivationStatusLabel(candidate.status, copy)}
                      state={p1LocaleActivationStatusState(candidate.status)}
                    />
                  </span>
                </div>
                <div style={compactGridStyle}>
                  <div>
                    <p style={labelStyle}>{copy.priority}</p>
                    <p style={mutedTextStyle}>{candidate.priority}</p>
                  </div>
                  <div>
                    <p style={labelStyle}>{copy.p1LocaleActivationContentOwner}</p>
                    <p style={mutedTextStyle}>{readableCode(candidate.ownerRole)}</p>
                  </div>
                  <div>
                    <p style={labelStyle}>{copy.p1LocaleActivationRoutingReadiness}</p>
                    <PublishStateBadge
                      label={p1LocaleActivationEvidenceLabel(candidate.routingReadiness, copy)}
                      state={p1LocaleActivationEvidenceState(candidate.routingReadiness)}
                    />
                  </div>
                  <div>
                    <p style={labelStyle}>{copy.p1LocaleActivationAnalyticsReadiness}</p>
                    <PublishStateBadge
                      label={p1LocaleActivationEvidenceLabel(candidate.analyticsReadiness, copy)}
                      state={p1LocaleActivationEvidenceState(candidate.analyticsReadiness)}
                    />
                  </div>
                  <div>
                    <p style={labelStyle}>{copy.p1LocaleActivationPublishGateReadiness}</p>
                    <PublishStateBadge
                      label={p1LocaleActivationEvidenceLabel(candidate.publishGateReadiness, copy)}
                      state={p1LocaleActivationEvidenceState(candidate.publishGateReadiness)}
                    />
                  </div>
                  <div>
                    <p style={labelStyle}>{copy.p1LocaleActivationContentOwnershipReadiness}</p>
                    <PublishStateBadge
                      label={p1LocaleActivationEvidenceLabel(candidate.contentOwnershipReadiness, copy)}
                      state={p1LocaleActivationEvidenceState(candidate.contentOwnershipReadiness)}
                    />
                  </div>
                  <div>
                    <p style={labelStyle}>{copy.p1LocaleActivationQaReadiness}</p>
                    <PublishStateBadge
                      label={p1LocaleActivationEvidenceLabel(candidate.qaReadiness, copy)}
                      state={p1LocaleActivationEvidenceState(candidate.qaReadiness)}
                    />
                  </div>
                </div>
                <p style={wrapTextStyle}>
                  {copy.p1LocaleActivationTargetMarket}: {getLocalizedText(candidate.targetMarket, locale)}
                </p>
                <p style={wrapTextStyle}>
                  {copy.p1LocaleActivationContentScope}: {getLocalizedText(candidate.contentScope, locale)}
                </p>
                <p style={wrapTextStyle}>
                  {copy.p1LocaleActivationQaScope}: {getLocalizedText(candidate.qaScope, locale)}
                </p>
                <div style={stackStyle}>
                  <p style={labelStyle}>{copy.p1LocaleActivationBlockers}</p>
                  <span style={chipListStyle}>
                    {candidate.blockerIds.map((blockerId) => (
                      <Badge key={`${candidate.locale}-${blockerId}`} label={blockerId} tone="warning" />
                    ))}
                  </span>
                </div>
                <div style={stackStyle}>
                  <p style={labelStyle}>{copy.p1LocaleActivationEvidenceReferences}</p>
                  <span style={chipListStyle}>
                    {candidate.evidenceReferences.map((reference) => (
                      <Badge key={`${candidate.locale}-${reference}`} label={reference} tone="info" />
                    ))}
                  </span>
                </div>
                <p style={wrapTextStyle}>
                  {copy.p1LocaleActivationClosedRuntimeBoundary}: {getLocalizedText(candidate.boundary, locale)}
                </p>
                <p style={wrapTextStyle}>
                  {copy.p1LocaleActivationNextAction}: {getLocalizedText(candidate.nextAction, locale)}
                </p>
              </article>
            ))}
          </div>
        </article>
        <article style={cardStyle}>
          <div style={rowStyle}>
            <div style={stackStyle}>
              <p style={labelStyle}>
                {getLocalizedText(deliveryChecklist.p1LocaleExpansion.summary.subtitle, locale)}
              </p>
              <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: 0 }}>
                {getLocalizedText(deliveryChecklist.p1LocaleExpansion.summary.title, locale)}
              </h4>
            </div>
            <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Badge
                label={`${deliveryChecklist.p1LocaleExpansion.summary.totalLocales} ${copy.localePreference}`}
                tone="info"
              />
              <PublishStateBadge
                label={`${deliveryChecklist.p1LocaleExpansion.summary.deferredLocales} ${copy.deferred}`}
                state="warning"
              />
              <PublishStateBadge
                label={`${deliveryChecklist.p1LocaleExpansion.summary.runtimeSupportedLocales} ${copy.covered}`}
                state="ready"
              />
            </span>
          </div>
          <div style={boundaryStyle}>
            <p style={{ margin: 0 }}>
              {getLocalizedText(deliveryChecklist.p1LocaleExpansion.summary.boundary, locale)}
            </p>
            <p style={{ margin: "8px 0 0" }}>
              {getLocalizedText(deliveryChecklist.p1LocaleExpansion.summary.nextAction, locale)}
            </p>
          </div>
          <div style={gridStyle}>
            {deliveryChecklist.p1LocaleExpansion.rows.map((row) => (
              <div key={row.code} style={cardStyle}>
                <div style={rowStyle}>
                  <div style={stackStyle}>
                    <p style={labelStyle}>{row.code}</p>
                    <strong>{getLocalizedText(row.displayName, locale)}</strong>
                  </div>
                  <PublishStateBadge
                    label={p1LocaleExpansionStatusLabel(row.status, copy)}
                    state={p1LocaleExpansionStatusState(row.status)}
                  />
                </div>
                <p style={mutedTextStyle}>{getLocalizedText(row.reason, locale)}</p>
                <div style={compactGridStyle}>
                  <div>
                    <p style={labelStyle}>{copy.ownerRole}</p>
                    <p style={mutedTextStyle}>{readableCode(row.ownerRole)}</p>
                  </div>
                  <div>
                    <p style={labelStyle}>{copy.status}</p>
                    <p style={mutedTextStyle}>
                      {getLocalizedText(deliveryChecklist.p1LocaleExpansion.summary.boundary, locale)}
                    </p>
                  </div>
                </div>
                <div style={stackStyle}>
                  <p style={labelStyle}>{copy.required}</p>
                  {row.prerequisites.slice(0, 2).map((prerequisite) => (
                    <p key={`${row.code}-${getLocalizedText(prerequisite, locale)}`} style={mutedTextStyle}>
                      {getLocalizedText(prerequisite, locale)}
                    </p>
                  ))}
                </div>
                <p style={mutedTextStyle}>
                  {copy.nextAction}: {getLocalizedText(row.nextAction, locale)}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.templateGovernanceSubtitle}</p>
            <h3 style={{ fontSize: 20, margin: 0 }}>{copy.templateGovernance}</h3>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${templateGovernance.summary.totalTemplates} ${copy.templates}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${templateGovernance.summary.warningCount} ${copy.warning}`}
              state={templateGovernance.summary.warningCount > 0 ? "warning" : "ready"}
            />
          </span>
        </div>
        <p style={boundaryStyle}>{getLocalizedText(templateGovernance.boundary, locale)}</p>
        <div style={compactGridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.templateStatusReady}</p>
            <p style={valueStyle}>{templateGovernance.summary.readyCount}</p>
            <p style={mutedTextStyle}>{copy.templateGovernanceBoundary}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.localizationReview}</p>
            <p style={valueStyle}>{templateGovernance.summary.localizationReviewCount}</p>
            <p style={mutedTextStyle}>zh-CN / zh-TW AI draft/fallback</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.riskReview}</p>
            <p style={valueStyle}>{templateGovernance.summary.highRiskCount}</p>
            <p style={mutedTextStyle}>social/referral</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.walletCoverage}</p>
            <p style={valueStyle}>
              {templateGovernance.summary.anyWalletCount}/{templateGovernance.summary.eoaOnlyCount}
            </p>
            <p style={mutedTextStyle}>
              {copy.walletAny} / {copy.walletEoaOnly}
            </p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.strongVerification}</p>
            <p style={valueStyle}>{templateGovernance.summary.strongVerificationCount}</p>
            <p style={mutedTextStyle}>ON_CHAIN / DAPP_API / WALLET / REFERRAL</p>
          </article>
        </div>
        <div style={gridStyle}>
          {templateGovernance.rows.map((row) => (
            <article key={row.templateId} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{row.category}</p>
                  <strong>{getLocalizedText(row.title, locale)}</strong>
                </div>
                <PublishStateBadge
                  label={templateStatusLabel(row.status, copy)}
                  state={templateGovernanceState(row.status)}
                />
              </div>
              <p style={mutedTextStyle}>{getLocalizedText(row.description, locale)}</p>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{copy.verification}</p>
                  <p style={mutedTextStyle}>{row.verificationType}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.defaultPoints}</p>
                  <p style={mutedTextStyle}>{row.defaultPoints}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.riskLevel}</p>
                  <p style={mutedTextStyle}>{row.riskLevel}</p>
                </div>
                <div>
                  <p style={labelStyle}>{row.requiredByDefault ? copy.required : copy.optional}</p>
                  <p style={mutedTextStyle}>{row.requiredByDefault ? copy.required : copy.optional}</p>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Badge label={walletCompatibilityLabel(row.walletCompatibility, copy)} tone="info" />
                {Object.entries(row.localeReadiness).map(([readinessLocale, status]) => (
                  <LocaleStatusBadge
                    key={readinessLocale}
                    label={`${readinessLocale} ${status}`}
                    status={status}
                  />
                ))}
                {row.reviewSignals.map((signal) => (
                  <ReviewSeverityBadge
                    key={`${row.templateId}-${signal}`}
                    label={templateSignalLabel(signal, copy)}
                    severity={signal === "risk_review" ? "warning" : "info"}
                  />
                ))}
              </div>
              <p style={mutedTextStyle}>{getLocalizedText(row.statusReason, locale)}</p>
              <p style={mutedTextStyle}>
                {copy.nextAction}: {getLocalizedText(row.nextAction, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.adminContractReviewCenter}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {getLocalizedText(contractReviewCenter.summary, locale)}
            </h3>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <PublishStateBadge
              label={contractReviewCenter.publishState}
              state={contractReviewCenter.publishState}
            />
            {contractReviewCenter.highImpactMode ? (
              <PublishStateBadge label={copy.contractClaim} state="blocker" />
            ) : (
              <ContractModeBadge label={copy.offChain} mode="OFF_CHAIN_MVP" />
            )}
          </span>
        </div>
        <p style={boundaryStyle}>{getLocalizedText(contractReviewCenter.boundary, locale)}</p>
        <div style={gridStyle}>
          {contractReviewSummary.map((item) => (
            <article key={item.id} style={cardStyle}>
              <div style={rowStyle}>
                <p style={labelStyle}>{item.label}</p>
                {item.badge}
              </div>
              <p style={mutedTextStyle}>{item.value}</p>
            </article>
          ))}
        </div>
        <div style={compactGridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.boundaryState}</p>
            <strong>{getLocalizedText(contractReviewCenter.mvpBoundary.status, locale)}</strong>
            <p style={mutedTextStyle}>{getLocalizedText(contractReviewCenter.mvpBoundary.custody, locale)}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.ownerRole}</p>
            <strong>{readableCode(contractReviewCenter.mvpBoundary.ownerRole)}</strong>
            <p style={mutedTextStyle}>
              {copy.rewardDistributionBoundary}:{" "}
              {getLocalizedText(contractReviewCenter.mvpBoundary.rewardDistribution, locale)}
            </p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.futureApprovalGates}</p>
            <div style={chipListStyle}>
              {contractReviewCenter.mvpBoundary.approvalGates.map((gate) => (
                <span key={getLocalizedText(gate, locale)} style={chipStyle}>
                  {getLocalizedText(gate, locale)}
                </span>
              ))}
            </div>
          </article>
        </div>
        <div style={rowStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.highImpactChecklist}</h3>
          <PublishStateBadge label={contractReviewCenter.publishState} state={contractReviewCenter.publishState} />
        </div>
        <p style={mutedTextStyle}>{getLocalizedText(contractReviewCenter.nextAction, locale)}</p>
        <div style={scrollContainerStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{copy.status}</th>
                <th style={thStyle}>{copy.contractMode}</th>
                <th style={thStyle}>{copy.currentValue}</th>
                <th style={thStyle}>{copy.requiredFor}</th>
                <th style={thStyle}>{copy.ownerRole}</th>
                <th style={thStyle}>{copy.detail}</th>
                <th style={thStyle}>{copy.nextAction}</th>
              </tr>
            </thead>
            <tbody>
              {contractReviewCenter.checklist.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>
                    <PublishStateBadge
                      label={item.status}
                      state={checklistStatusState(item.status)}
                    />
                  </td>
                  <td style={tdStyle}>
                    <strong>{getLocalizedText(item.label, locale)}</strong>
                  </td>
                  <td style={tdStyle}>{getLocalizedText(item.value, locale)}</td>
                  <td style={tdStyle}>{item.requiredFor}</td>
                  <td style={tdStyle}>{readableCode(item.ownerRole)}</td>
                  <td style={tdStyle}>{getLocalizedText(item.detail, locale)}</td>
                  <td style={tdStyle}>{getLocalizedText(item.nextAction, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={rowStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.contractEvolution}</h3>
        </div>
        <div style={gridStyle}>
          {contractReviewCenter.evolution.map((step) => (
            <article key={step.id} style={cardStyle}>
              <div style={rowStyle}>
                <Badge label={getLocalizedText(step.phase, locale)} tone="info" />
                <PublishStateBadge label={step.status} state={step.status} />
              </div>
              <strong>{getLocalizedText(step.title, locale)}</strong>
              <p style={mutedTextStyle}>{getLocalizedText(step.description, locale)}</p>
              <p style={mutedTextStyle}>
                {copy.contractSurface}: {getLocalizedText(step.contractSurface, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      {companionContractReadinessSection}

      <section style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.companionContracts}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.contractInterfaceMatrixConsole}
            </h3>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${contractInterfaceMatrix.summary.totalContracts} ${copy.totalContracts}`}
              tone="info"
            />
            <Badge
              label={`${contractInterfaceMatrix.summary.totalMethods} ${copy.totalMethods}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${contractInterfaceMatrix.summary.blockedRows} ${copy.blocker}`}
              state={contractInterfaceMatrix.summary.blockedRows > 0 ? "blocker" : "ready"}
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{getLocalizedText(contractInterfaceMatrix.summary.boundary, locale)}</p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.noAbiGeneration} · {copy.noLiveContractTransaction} ·{" "}
            {copy.noRewardCustodyDistribution}
          </p>
        </div>
        <div style={compactGridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.companionContracts}</p>
            <p style={valueStyle}>{contractInterfaceMatrix.summary.totalContracts}</p>
            <p style={mutedTextStyle}>CampaignRegistryV2 / Points / Referral / Eligibility</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.contractMethods}</p>
            <p style={valueStyle}>{contractInterfaceMatrix.summary.totalMethods}</p>
            <p style={mutedTextStyle}>{copy.noLiveContractTransaction}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.priorityPhase}</p>
            <p style={valueStyle}>{contractInterfaceMatrix.summary.p1Rows}</p>
            <p style={mutedTextStyle}>P1 {copy.changeMatrix}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.blocker}</p>
            <p style={valueStyle}>{contractInterfaceMatrix.summary.blockedRows}</p>
            <p style={mutedTextStyle}>{copy.noRewardCustodyDistribution}</p>
          </article>
        </div>
        <div style={gridStyle}>
          {contractInterfaceMatrix.groups.map((group) => (
            <article key={group.contractName} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{copy.companionContracts}</p>
                  <strong>{group.contractName}</strong>
                </div>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <Badge label={group.phase} tone="info" />
                  <PublishStateBadge
                    label={group.readiness}
                    state={contractInterfaceReadinessState(group.readiness)}
                  />
                </span>
              </div>
              <p style={mutedTextStyle}>{getLocalizedText(group.purpose, locale)}</p>
              <p style={mutedTextStyle}>
                {copy.onChainBoundary}: {getLocalizedText(group.boundary, locale)}
              </p>
              <p style={mutedTextStyle}>
                {copy.nextAction}: {getLocalizedText(group.nextAction, locale)}
              </p>
              <div style={stackStyle}>
                <p style={labelStyle}>{copy.contractMethods}</p>
                {group.methods.map((method) => (
                  <div
                    key={`${group.contractName}-${method.name}`}
                    style={{
                      borderTop: "1px solid #dbe6f4",
                      display: "grid",
                      gap: 8,
                      paddingTop: 10,
                    }}
                  >
                    <div style={rowStyle}>
                      <strong>{method.name}</strong>
                      <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <Badge label={method.phase} tone="info" />
                        <PublishStateBadge
                          label={method.readiness}
                          state={contractInterfaceReadinessState(method.readiness)}
                        />
                      </span>
                    </div>
                    <code style={codeListStyle}>{method.signature}</code>
                    <p style={mutedTextStyle}>{getLocalizedText(method.purpose, locale)}</p>
                    <p style={mutedTextStyle}>
                      {copy.onChainBoundary}: {getLocalizedText(method.boundary, locale)}
                    </p>
                    <p style={mutedTextStyle}>
                      {copy.nextAction}: {getLocalizedText(method.nextAction, locale)}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div style={rowStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.changeMatrix}</h3>
          <Badge
            label={`${contractInterfaceMatrix.summary.p1Rows} P1 / ${contractInterfaceMatrix.summary.blockedRows} ${copy.blocker}`}
            tone="warning"
          />
        </div>
        <div style={scrollContainerStyle}>
          <table style={{ ...tableStyle, minWidth: 1280 }}>
            <thead>
              <tr>
                <th style={thStyle}>{copy.category}</th>
                <th style={thStyle}>{copy.currentMvp}</th>
                <th style={thStyle}>{copy.recommendedV2}</th>
                <th style={thStyle}>{copy.priorityPhase}</th>
                <th style={thStyle}>{copy.ownerRole}</th>
                <th style={thStyle}>{copy.status}</th>
                <th style={thStyle}>{copy.detail}</th>
                <th style={thStyle}>{copy.nextAction}</th>
                <th style={thStyle}>{copy.onChainBoundary}</th>
              </tr>
            </thead>
            <tbody>
              {contractInterfaceMatrix.changeMatrix.map((row) => (
                <tr key={row.area["en-US"]}>
                  <td style={tdStyle}>
                    <strong>{getLocalizedText(row.area, locale)}</strong>
                  </td>
                  <td style={tdStyle}>{getLocalizedText(row.currentMvp, locale)}</td>
                  <td style={tdStyle}>{getLocalizedText(row.recommendedV2, locale)}</td>
                  <td style={tdStyle}>{row.priority}</td>
                  <td style={tdStyle}>{readableCode(row.ownerRole)}</td>
                  <td style={tdStyle}>
                    <PublishStateBadge
                      label={row.readiness}
                      state={contractInterfaceReadinessState(row.readiness)}
                    />
                  </td>
                  <td style={tdStyle}>{getLocalizedText(row.notes, locale)}</td>
                  <td style={tdStyle}>{getLocalizedText(row.nextAction, locale)}</td>
                  <td style={tdStyle}>{getLocalizedText(row.boundary, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={rowStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.analyticsOverview}</h3>
          <PublishStateBadge
            label={`${adminOps.exportBatch.readyCount}/${adminOps.exportBatch.rows.length} ${copy.exportReady}`}
            state={adminOps.exportBatch.blockedCount > 0 ? "warning" : "ready"}
          />
        </div>
        <div style={gridStyle}>
          {adminOps.analytics.map((metric) => (
            <article key={metric.id} style={cardStyle}>
              <div style={rowStyle}>
                <p style={labelStyle}>{getLocalizedText(metric.label, locale)}</p>
                <PublishStateBadge
                  label={metric.tone}
                  state={metricToneState(metric.tone)}
                />
              </div>
              <p style={valueStyle}>{metric.value}</p>
              <p style={mutedTextStyle}>{getLocalizedText(metric.trend, locale)}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={copy.advancedAnalyticsReview} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.advancedAnalyticsSummary}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.advancedAnalyticsReview}
            </h3>
            <p style={mutedTextStyle}>{copy.advancedAnalyticsReviewSubtitle}</p>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${advancedAnalytics.summary.totalCohorts} ${copy.advancedAnalyticsCohortReview}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${advancedAnalytics.summary.reviewRequiredCohorts} ${copy.reviewRequired}`}
              state={advancedAnalytics.summary.reviewRequiredCohorts > 0 ? "warning" : "ready"}
            />
            <PublishStateBadge
              label={`${advancedAnalytics.summary.premiumReadyReports}/${advancedAnalytics.premiumReports.length} ${copy.advancedAnalyticsPremiumReadiness}`}
              state="warning"
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{copy.advancedAnalyticsReviewerBoundary}</p>
          <p style={{ margin: "8px 0 0" }}>{getLocalizedText(advancedAnalytics.boundary, locale)}</p>
        </div>
        <div style={compactGridStyle}>
          {[
            {
              detail: `${advancedAnalytics.summary.readyCohorts} ${copy.readyActions} / ${advancedAnalytics.summary.reviewRequiredCohorts} ${copy.reviewRequired}`,
              label: copy.advancedAnalyticsCohortReview,
              value: advancedAnalytics.summary.totalCohorts,
            },
            {
              detail: copy.advancedAnalyticsRetentionReview,
              label: copy.advancedAnalyticsDay7Retention,
              value: `${Math.round(advancedAnalytics.summary.day7RetentionRate * 100)}%`,
            },
            {
              detail: copy.advancedAnalyticsRetentionReview,
              label: copy.advancedAnalyticsDay30Retention,
              value: `${Math.round(advancedAnalytics.summary.day30RetentionRate * 100)}%`,
            },
            {
              detail: copy.advancedAnalyticsQualityReview,
              label: copy.qualitySignal,
              value: `${advancedAnalytics.summary.averageRealUserScore}/100`,
            },
            {
              detail: copy.advancedAnalyticsConversionReview,
              label: copy.advancedAnalyticsProductCoverage,
              value: advancedAnalytics.summary.productConversionCoverage,
            },
            {
              detail: copy.advancedAnalyticsCostEfficiency,
              label: copy.advancedAnalyticsCostEfficiency,
              value: advancedAnalytics.summary.costPerVerifiedAction,
            },
          ].map((item) => (
            <article key={item.label} style={cardStyle}>
              <p style={labelStyle}>{item.label}</p>
              <p style={{ ...valueStyle, fontSize: 22, overflowWrap: "anywhere" }}>{item.value}</p>
              <p style={wrapTextStyle}>{item.detail}</p>
            </article>
          ))}
        </div>
        <article style={cardStyle}>
          <div style={rowStyle}>
            <div style={stackStyle}>
              <p style={labelStyle}>{copy.nextAction}</p>
              <strong>{getLocalizedText(advancedAnalytics.summary.nextAction, locale)}</strong>
            </div>
            <PublishStateBadge label={copy.advancedAnalyticsReviewInputsOnly} state="warning" />
          </div>
        </article>

        <section style={stackStyle}>
          <div style={rowStyle}>
            <h4 style={{ fontSize: 18, margin: 0 }}>{copy.advancedAnalyticsPremiumReadiness}</h4>
            <PublishStateBadge
              label={`${advancedAnalytics.summary.premiumReadyReports}/${advancedAnalytics.premiumReports.length} ${copy.localOnlyReadiness}`}
              state="warning"
            />
          </div>
          <div style={gridStyle}>
            {advancedAnalytics.premiumReports.map((report) => (
              <article key={report.id} style={cardStyle}>
                <div style={rowStyle}>
                  <strong>{getLocalizedText(report.label, locale)}</strong>
                  <PublishStateBadge
                    label={advancedAnalyticsReadinessLabel(report.readiness, copy)}
                    state={advancedAnalyticsReadinessState(report.readiness)}
                  />
                </div>
                <p style={wrapTextStyle}>
                  {copy.evidence}: {getLocalizedText(report.coverage, locale)}
                </p>
                <p style={wrapTextStyle}>
                  {copy.advancedAnalyticsEvidenceGap}: {getLocalizedText(report.gap, locale)}
                </p>
                <p style={labelStyle}>{copy.ownerRole}</p>
                <p style={wrapTextStyle}>{getLocalizedText(report.ownerRole, locale)}</p>
                <p style={wrapTextStyle}>
                  {copy.nextAction}: {getLocalizedText(report.nextAction, locale)}
                </p>
              </article>
            ))}
          </div>
        </section>

        <div style={gridStyle}>
          <article style={cardStyle}>
            <div style={rowStyle}>
              <h4 style={{ fontSize: 18, margin: 0 }}>{copy.advancedAnalyticsCohortReview}</h4>
              <PublishStateBadge
                label={`${advancedAnalytics.summary.reviewRequiredCohorts} ${copy.reviewRequired}`}
                state={advancedAnalytics.summary.reviewRequiredCohorts > 0 ? "warning" : "ready"}
              />
            </div>
            <div style={stackStyle}>
              {advancedAnalytics.cohorts.map((cohort) => (
                <div
                  key={cohort.id}
                  style={{ borderTop: "1px solid #dbe6f4", display: "grid", gap: 6, paddingTop: 10 }}
                >
                  <div style={rowStyle}>
                    <strong>{getLocalizedText(cohort.label, locale)}</strong>
                    <PublishStateBadge
                      label={advancedAnalyticsReadinessLabel(cohort.qualityState, copy)}
                      state={advancedAnalyticsReadinessState(cohort.qualityState)}
                    />
                  </div>
                  <p style={wrapTextStyle}>
                    {getLocalizedText(cohort.audienceSummary, locale)}
                  </p>
                  <p style={wrapTextStyle}>
                    {copy.advancedAnalyticsRetentionReview}: {getLocalizedText(cohort.retentionSignal, locale)}
                  </p>
                  <p style={wrapTextStyle}>
                    {copy.advancedAnalyticsConversionReview}: {getLocalizedText(cohort.conversionSignal, locale)}
                  </p>
                  <p style={wrapTextStyle}>
                    {copy.riskReview}: {getLocalizedText(cohort.riskReviewState, locale)}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article style={cardStyle}>
            <div style={rowStyle}>
              <h4 style={{ fontSize: 18, margin: 0 }}>{copy.advancedAnalyticsQualityReview}</h4>
              <PublishStateBadge
                label={advancedAnalyticsReadinessLabel(advancedAnalytics.realUserQuality.state, copy)}
                state={advancedAnalyticsReadinessState(advancedAnalytics.realUserQuality.state)}
              />
            </div>
            <p style={{ ...valueStyle, fontSize: 24 }}>{advancedAnalytics.realUserQuality.score}/100</p>
            <p style={wrapTextStyle}>{getLocalizedText(advancedAnalytics.realUserQuality.explanation, locale)}</p>
            <p style={wrapTextStyle}>
              {copy.nextAction}: {getLocalizedText(advancedAnalytics.realUserQuality.nextAction, locale)}
            </p>
            <p style={boundaryStyle}>{copy.advancedAnalyticsReviewInputsOnly}</p>
          </article>
        </div>

        <section style={stackStyle}>
          <div style={rowStyle}>
            <h4 style={{ fontSize: 18, margin: 0 }}>{copy.advancedAnalyticsConversionReview}</h4>
            <Badge
              label={`${advancedAnalytics.productConversions.length} ${copy.product}`}
              tone="info"
            />
          </div>
          <div style={scrollContainerStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{copy.product}</th>
                  <th style={thStyle}>{copy.category}</th>
                  <th style={thStyle}>{copy.conversion}</th>
                  <th style={thStyle}>{copy.readiness}</th>
                  <th style={thStyle}>{copy.advancedAnalyticsEvidenceGap}</th>
                  <th style={thStyle}>{copy.nextAction}</th>
                </tr>
              </thead>
              <tbody>
                {advancedAnalytics.productConversions.map((product) => (
                  <tr key={product.id}>
                    <td style={tdStyle}>
                      <strong>{getLocalizedText(product.productName, locale)}</strong>
                    </td>
                    <td style={tdStyle}>{getLocalizedText(product.actionFamily, locale)}</td>
                    <td style={tdStyle}>
                      {product.convertedCount.toLocaleString("en-US")} / {Math.round(product.conversionRate * 100)}%
                    </td>
                    <td style={tdStyle}>
                      <PublishStateBadge
                        label={advancedAnalyticsReadinessLabel(product.readiness, copy)}
                        state={advancedAnalyticsReadinessState(product.readiness)}
                      />
                    </td>
                    <td style={tdStyle}>{getLocalizedText(product.evidenceGap, locale)}</td>
                    <td style={tdStyle}>{getLocalizedText(product.nextAction, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <section style={gridStyle}>
        <article style={panelStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.conversionFunnel}</h3>
          <div style={stackStyle}>
            {adminOps.funnel.map((step) => (
              <div key={step.id} style={cardStyle}>
                <div style={rowStyle}>
                  <strong>{getLocalizedText(step.label, locale)}</strong>
                  <Badge label={`${step.conversionRate}% ${copy.conversion}`} tone="info" />
                </div>
                <p style={mutedTextStyle}>
                  {copy.count}: {step.count.toLocaleString("en-US")}
                </p>
                <p style={mutedTextStyle}>{getLocalizedText(step.dropOffNote, locale)}</p>
              </div>
            ))}
          </div>
        </article>

        <article style={panelStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.walletSplit}</h3>
          <div style={compactGridStyle}>
            {adminOps.walletSplit.map((row) => (
              <div key={row.id} style={cardStyle}>
                <p style={labelStyle}>{row.label}</p>
                <p style={valueStyle}>{row.percentage}%</p>
                <p style={mutedTextStyle}>{row.count} wallets</p>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize: 20, margin: "4px 0 0" }}>{copy.localeSplit}</h3>
          <div style={compactGridStyle}>
            {adminOps.localeSplit.map((row) => (
              <div key={row.id} style={cardStyle}>
                <p style={labelStyle}>{row.label}</p>
                <p style={valueStyle}>{row.percentage}%</p>
                <p style={mutedTextStyle}>{row.count} wallets</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section style={gridStyle}>
        <section style={panelStyle}>
          <div style={rowStyle}>
            <div style={stackStyle}>
              <p style={labelStyle}>{copy.aiContent}</p>
              <h3 style={{ fontSize: 20, margin: 0 }}>{copy.aiContentPackWorkbench}</h3>
            </div>
            <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Badge label={`${aiContentPack.summary.totalArtifacts} ${copy.artifacts}`} tone="ai" />
              <PublishStateBadge
                label={`${aiContentPack.summary.blockedReleaseActions} ${copy.publishBlocked}`}
                state={aiContentPack.summary.blockedReleaseActions > 0 ? "warning" : "ready"}
              />
            </span>
          </div>
          <p style={boundaryStyle}>{getLocalizedText(aiContentPack.boundary.body, locale)}</p>
          <div style={compactGridStyle}>
            <article style={cardStyle}>
              <p style={labelStyle}>{copy.enPublished}</p>
              <p style={mutedTextStyle}>
                {campaign.contentRevisions.find((revision) => revision.locale === "en-US")?.title}
              </p>
              <LocaleStatusBadge label="en-US published" status="published" />
            </article>
            <article style={cardStyle}>
              <p style={labelStyle}>{copy.zhDraft}</p>
              <p style={{ ...mutedTextStyle, color: "#92400e", fontWeight: 800 }}>
                {copy.autoPublishBlocked}
              </p>
              <ReviewSeverityBadge label={copy.humanReviewGate} severity="warning" />
            </article>
            <article style={cardStyle}>
              <p style={labelStyle}>{copy.humanApproved}</p>
              <p style={valueStyle}>{aiContentPack.summary.humanApproved}</p>
              <p style={mutedTextStyle}>{getLocalizedText(aiContentPack.summary.nextAction, locale)}</p>
            </article>
            <article style={cardStyle}>
              <p style={labelStyle}>{copy.humanReviewGate}</p>
              <p style={valueStyle}>{aiContentPack.summary.aiDrafts}</p>
              <p style={mutedTextStyle}>{copy.autoPublishBlocked}</p>
            </article>
            <article style={cardStyle}>
              <p style={labelStyle}>{copy.copyReady}</p>
              <p style={valueStyle}>{aiContentPack.summary.availableCopyActions}</p>
              <p style={mutedTextStyle}>{getLocalizedText(aiContentPack.boundary.title, locale)}</p>
            </article>
          </div>
          <div style={gridStyle}>
            {aiContentPack.artifacts.map((artifact) => (
              <article key={artifact.id} style={cardStyle}>
                <div style={rowStyle}>
                  <strong>{getLocalizedText(artifact.title, locale)}</strong>
                  <PublishStateBadge
                    label={readableCode(artifact.lifecycle)}
                    state={aiContentLifecycleState(artifact.lifecycle)}
                  />
                </div>
                <p style={mutedTextStyle}>{getLocalizedText(artifact.purpose, locale)}</p>
                <p style={mutedTextStyle}>{getLocalizedText(artifact.body, locale)}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <Badge label={artifact.channel} tone="info" />
                  <Badge label={`${copy.riskLevel}: ${artifact.riskLevel}`} tone={artifact.riskLevel === "high" ? "warning" : "neutral"} />
                  {Object.entries(artifact.localeStatus).map(([statusLocale, status]) => (
                    <LocaleStatusBadge
                      key={statusLocale}
                      label={`${statusLocale} ${status}`}
                      status={status}
                    />
                  ))}
                  <ReviewSeverityBadge
                    label={artifact.reviewer ? `${copy.reviewer}: ${artifact.reviewer}` : copy.humanReviewRequired}
                    severity={artifact.reviewer ? "info" : "warning"}
                  />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <PublishStateBadge
                    label={artifact.actionPolicy.copy === "available" ? copy.copyReady : copy.humanReviewRequired}
                    state={artifact.actionPolicy.copy === "available" ? "ready" : "warning"}
                  />
                  <PublishStateBadge
                    label={artifact.actionPolicy.schedule === "available" ? copy.scheduleReady : copy.publishBlocked}
                    state={artifact.actionPolicy.schedule === "available" ? "ready" : "warning"}
                  />
                  <PublishStateBadge
                    label={artifact.actionPolicy.publish === "available" ? copy.readiness : copy.publishBlocked}
                    state={artifact.actionPolicy.publish === "available" ? "ready" : "warning"}
                  />
                </div>
                <p style={mutedTextStyle}>{getLocalizedText(artifact.actionPolicy.nextAction, locale)}</p>
                {artifact.actionPolicy.blockedReason ? (
                  <p style={{ ...mutedTextStyle, color: "#92400e", fontWeight: 800 }}>
                    {getLocalizedText(artifact.actionPolicy.blockedReason, locale)}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
          <div style={rowStyle}>
            <h3 style={{ fontSize: 20, margin: 0 }}>{copy.qualityGates}</h3>
            <PublishStateBadge
              label={`${aiContentPack.summary.qualityGateBlockers} ${copy.blocker}`}
              state={aiContentPack.summary.qualityGateBlockers > 0 ? "blocker" : "ready"}
            />
          </div>
          <div style={gridStyle}>
            {aiContentPack.qualityGates.map((gate) => (
              <article key={gate.id} style={cardStyle}>
                <div style={rowStyle}>
                  <strong>{getLocalizedText(gate.label, locale)}</strong>
                  <PublishStateBadge label={gate.status} state={aiContentGateState(gate.status)} />
                </div>
                <p style={mutedTextStyle}>{getLocalizedText(gate.evidence, locale)}</p>
              </article>
            ))}
          </div>
        </section>

        <article style={panelStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.contractImpact}</h3>
          {contractModes.map((mode) => (
            <div key={mode.key} style={cardStyle}>
              <div style={rowStyle}>
                {mode.badge}
                <strong>{mode.description}</strong>
              </div>
              <span style={{ color: "#475569", fontSize: 13 }}>
                {mode.key === "CONTRACT_CLAIM"
                  ? contractClaimReadiness.blockers[0]
                  : modeLabel(mode.key as ContractMode)}
              </span>
            </div>
          ))}
        </article>
      </section>

      <section aria-label={copy.riskIntelligenceTitle} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.riskIntelligenceSubtitle}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.riskIntelligenceTitle}
            </h3>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {riskIntelligenceSummaryItems.map((item) => (
              <PublishStateBadge
                key={item.id}
                label={`${item.value} ${item.label}`}
                state={item.state}
              />
            ))}
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{copy.riskIntelligenceBoundary}</p>
          <p style={{ margin: "8px 0 0" }}>{getLocalizedText(riskIntelligence.boundary, locale)}</p>
        </div>
        <div style={compactGridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.riskIntelligenceTotalDimensions}</p>
            <p style={valueStyle}>{riskIntelligence.summary.totalDimensions}</p>
            <p style={wrapTextStyle}>{copy.riskIntelligenceSubtitle}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.reviewRequired}</p>
            <p style={valueStyle}>{riskIntelligence.summary.reviewRequiredCount}</p>
            <p style={wrapTextStyle}>{copy.humanReviewRequired}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.riskIntelligenceBlockedExportHold}</p>
            <p style={valueStyle}>{riskIntelligence.summary.exportHoldCount}</p>
            <p style={wrapTextStyle}>{copy.exportReady}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.riskIntelligenceHighSeverity}</p>
            <p style={valueStyle}>{riskIntelligence.summary.highSeverityCount}</p>
            <p style={wrapTextStyle}>{copy.riskReview}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.riskIntelligenceManualQueue}</p>
            <p style={valueStyle}>{riskIntelligence.summary.manualReviewQueueSize}</p>
            <p style={wrapTextStyle}>{copy.humanReviewGate}</p>
          </article>
        </div>
        <article style={cardStyle}>
          <div style={rowStyle}>
            <div style={stackStyle}>
              <p style={labelStyle}>{copy.riskIntelligenceMeaningfulCoverage}</p>
              <strong>{getLocalizedText(riskIntelligence.meaningfulAction.coverageLabel, locale)}</strong>
            </div>
            <Badge label={riskIntelligence.summary.meaningfulActionCoverage} tone="info" />
          </div>
          <p style={wrapTextStyle}>
            {getLocalizedText(riskIntelligence.meaningfulAction.qualityPolicy, locale)}
          </p>
          <p style={wrapTextStyle}>
            {copy.nextAction}: {getLocalizedText(riskIntelligence.meaningfulAction.nextAction, locale)}
          </p>
        </article>
        <div style={gridStyle}>
          {riskIntelligence.dimensions.map((dimension) => (
            <article key={dimension.id} style={{ ...cardStyle, alignContent: "start", minHeight: 360 }}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{copy.riskIntelligenceDimension}: {readableCode(dimension.category)}</p>
                  <strong style={{ overflowWrap: "anywhere" }}>
                    {getLocalizedText(dimension.label, locale)}
                  </strong>
                </div>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
                  <PublishStateBadge
                    label={riskReviewStateLabel(dimension.reviewState, copy)}
                    state={riskReviewState(dimension.reviewState)}
                  />
                  <PublishStateBadge
                    label={dimension.severity}
                    state={signalState(dimension.severity)}
                  />
                </span>
              </div>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{copy.riskIntelligenceReviewState}</p>
                  <p style={wrapTextStyle}>{riskReviewStateLabel(dimension.reviewState, copy)}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.ownerRole}</p>
                  <p style={wrapTextStyle}>{readableCode(dimension.ownerRole)}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.riskLevel}</p>
                  <p style={wrapTextStyle}>{dimension.severity}</p>
                </div>
              </div>
              <p style={wrapTextStyle}>
                {copy.riskIntelligenceAffectedCohort}: {getLocalizedText(dimension.affectedCohort, locale)}
              </p>
              <p style={labelStyle}>{copy.riskIntelligenceEvidenceCoverage}</p>
              <p style={wrapTextStyle}>{getLocalizedText(dimension.evidenceCoverage, locale)}</p>
              <p style={wrapTextStyle}>
                {copy.riskIntelligenceSourceSignal}: {getLocalizedText(dimension.sourceSignal, locale)}
              </p>
              <p style={labelStyle}>{copy.riskIntelligenceExportImpact}</p>
              <p style={wrapTextStyle}>{getLocalizedText(dimension.exportImpact, locale)}</p>
              <p style={wrapTextStyle}>
                {copy.riskIntelligenceRationale}: {getLocalizedText(dimension.rationale, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.nextAction}: {getLocalizedText(dimension.nextAction, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={copy.antiSybilV2Title} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.antiSybilV2Subtitle}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.antiSybilV2Title}
            </h3>
          </div>
          <PublishStateBadge
            label={antiSybilReadinessLabel(antiSybilV2Readiness.summary.overallReadiness, copy)}
            state={antiSybilReadinessState(antiSybilV2Readiness.summary.overallReadiness)}
          />
        </div>
        <div style={compactGridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.antiSybilV2TotalFamilies}</p>
            <p style={valueStyle}>{antiSybilV2Readiness.summary.totalFamilies}</p>
            <p style={wrapTextStyle}>{copy.antiSybilV2SignalFamilies}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.readyActions}</p>
            <p style={valueStyle}>{antiSybilV2Readiness.summary.readyCount}</p>
            <p style={wrapTextStyle}>{copy.antiSybilV2OverallReadiness}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.reviewRequired}</p>
            <p style={valueStyle}>{antiSybilV2Readiness.summary.reviewRequiredCount}</p>
            <p style={wrapTextStyle}>{copy.humanReviewRequired}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.blocked}</p>
            <p style={valueStyle}>{antiSybilV2Readiness.summary.blockedCount}</p>
            <p style={wrapTextStyle}>{copy.riskReview}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.antiSybilV2OverallReadiness}</p>
            <p style={valueStyle}>
              {antiSybilReadinessLabel(antiSybilV2Readiness.summary.overallReadiness, copy)}
            </p>
            <p style={wrapTextStyle}>{copy.antiSybilV2OwnerNextAction}</p>
          </article>
        </div>
        <article style={cardStyle}>
          <p style={labelStyle}>{copy.antiSybilV2OwnerNextAction}</p>
          <p style={wrapTextStyle}>
            {getLocalizedText(antiSybilV2Readiness.ownerNextAction, locale)}
          </p>
        </article>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{copy.antiSybilV2Boundary}</p>
          <p style={{ margin: "8px 0 0" }}>{getLocalizedText(antiSybilV2Readiness.boundary, locale)}</p>
        </div>
        <div style={gridStyle}>
          {antiSybilV2Readiness.signalFamilies.map((family) => (
            <article key={family.id} style={{ ...cardStyle, alignContent: "start" }}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{copy.antiSybilV2SignalFamilies}: {readableCode(family.id)}</p>
                  <strong style={{ overflowWrap: "anywhere" }}>
                    {getLocalizedText(family.label, locale)}
                  </strong>
                </div>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
                  <PublishStateBadge
                    label={antiSybilReadinessLabel(family.readiness, copy)}
                    state={antiSybilReadinessState(family.readiness)}
                  />
                  <PublishStateBadge label={family.severity} state={signalState(family.severity)} />
                </span>
              </div>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{copy.riskIntelligenceReviewState}</p>
                  <p style={wrapTextStyle}>{antiSybilReadinessLabel(family.readiness, copy)}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.ownerRole}</p>
                  <p style={wrapTextStyle}>{readableCode(family.ownerRole)}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.riskLevel}</p>
                  <p style={wrapTextStyle}>{family.severity}</p>
                </div>
              </div>
              <p style={wrapTextStyle}>
                {copy.riskIntelligenceAffectedCohort}: {getLocalizedText(family.affectedCohort, locale)}
              </p>
              <p style={labelStyle}>{copy.antiSybilV2EvidenceBasis}</p>
              <p style={wrapTextStyle}>{getLocalizedText(family.evidenceBasis, locale)}</p>
              <p style={wrapTextStyle}>
                {copy.riskIntelligenceSourceSignal}: {getLocalizedText(family.sourceSignals, locale)}
              </p>
              <p style={wrapTextStyle}>{getLocalizedText(family.reviewGuidance, locale)}</p>
              <p style={wrapTextStyle}>
                {copy.nextAction}: {getLocalizedText(family.nextAction, locale)}
              </p>
            </article>
          ))}
        </div>
        <div style={stackStyle}>
          <p style={labelStyle}>{copy.antiSybilV2AffectedOutcomes}</p>
          <div style={gridStyle}>
            {antiSybilV2Readiness.affectedOutcomes.map((outcome) => (
              <article key={outcome.id} style={cardStyle}>
                <div style={rowStyle}>
                  <strong>{getLocalizedText(outcome.label, locale)}</strong>
                  <PublishStateBadge
                    label={antiSybilReadinessLabel(outcome.state, copy)}
                    state={antiSybilReadinessState(outcome.state)}
                  />
                </div>
                <p style={wrapTextStyle}>{getLocalizedText(outcome.impact, locale)}</p>
                <p style={wrapTextStyle}>{copy.ownerRole}: {readableCode(outcome.ownerRole)}</p>
                <p style={wrapTextStyle}>
                  {copy.nextAction}: {getLocalizedText(outcome.nextAction, locale)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={stackStyle}>
          <p style={labelStyle}>{copy.riskIntelligenceSourceSignal}</p>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.riskDashboard}</h3>
        </div>
        <div style={gridStyle}>
          {adminOps.riskSignals.map((signal) => (
            <article key={signal.id} style={cardStyle}>
              <div style={rowStyle}>
                <strong>{getLocalizedText(signal.label, locale)}</strong>
                <PublishStateBadge
                  label={signal.severity}
                  state={signalState(signal.severity)}
                />
              </div>
              <p style={valueStyle}>{signal.value}</p>
              <p style={mutedTextStyle}>
                {copy.evidence}: {getLocalizedText(signal.evidence, locale)}
              </p>
              <p style={mutedTextStyle}>
                {copy.nextAction}: {getLocalizedText(signal.nextAction, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <h3 style={{ fontSize: 20, margin: 0 }}>{copy.aiOptimizationActionQueue}</h3>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${aiOptimization.summary.totalActions} ${copy.totalActions}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${aiOptimization.summary.readyCount} ${copy.readyActions}`}
              state="ready"
            />
            <PublishStateBadge
              label={`${aiOptimization.summary.reviewRequiredCount} ${copy.reviewRequiredActions}`}
              state={aiOptimization.summary.reviewRequiredCount > 0 ? "warning" : "ready"}
            />
            <PublishStateBadge
              label={`${aiOptimization.summary.blockedCount} ${copy.blockedActions}`}
              state={aiOptimization.summary.blockedCount > 0 ? "blocker" : "ready"}
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{copy.localOnlyBoundary}</p>
          <p style={{ margin: "8px 0 0" }}>
            {getLocalizedText(aiOptimization.boundary, locale)}
          </p>
        </div>
        <div style={gridStyle}>
          {aiOptimization.reports.map((report) => (
            <article key={report.id} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{copy.category}: {readableCode(report.category)}</p>
                  <strong>{getLocalizedText(report.title, locale)}</strong>
                </div>
                <Badge label={`${copy.generatedAt}: ${report.generatedAt}`} tone="ai" />
              </div>
              <p style={mutedTextStyle}>{getLocalizedText(report.summary, locale)}</p>
              {report.actions.map((action) => (
                <div
                  key={action.id}
                  style={{
                    borderTop: "1px solid #dbe6f4",
                    display: "grid",
                    gap: 10,
                    minWidth: 0,
                    paddingTop: 10,
                  }}
                >
                  <div style={rowStyle}>
                    <strong>{getLocalizedText(action.title, locale)}</strong>
                    <PublishStateBadge
                      label={aiOptimizationStatusLabel(action.status, copy)}
                      state={aiOptimizationStatusState(action.status)}
                    />
                  </div>
                  <div style={compactGridStyle}>
                    <div>
                      <p style={labelStyle}>{copy.actionStatus}</p>
                      <p style={mutedTextStyle}>{aiOptimizationStatusLabel(action.status, copy)}</p>
                    </div>
                    <div>
                      <p style={labelStyle}>{copy.ownerRole}</p>
                      <p style={mutedTextStyle}>{readableCode(action.ownerRole)}</p>
                    </div>
                    <div>
                      <p style={labelStyle}>{copy.confidence}</p>
                      <p style={mutedTextStyle}>
                        {action.confidence} · {copy.riskLevel}: {action.riskLevel}
                      </p>
                    </div>
                  </div>
                  <p style={mutedTextStyle}>
                    {copy.evidence}: {getLocalizedText(action.evidence, locale)}
                  </p>
                  <p style={mutedTextStyle}>
                    {copy.expectedImpact}: {getLocalizedText(action.expectedImpact, locale)}
                  </p>
                  <div style={stackStyle}>
                    <p style={labelStyle}>{copy.sourceMetrics}</p>
                    <span style={sourceMetricListStyle}>
                      {action.sourceMetrics.map((metric) => (
                        <span
                          key={metric.id}
                          style={{
                            ...sourceMetricChipStyle,
                            ...sourceMetricToneStyles[metric.tone],
                          }}
                          title={`${getLocalizedText(metric.label, locale)}: ${metric.value}`}
                        >
                          {getLocalizedText(metric.label, locale)}: {metric.value}
                        </span>
                      ))}
                    </span>
                  </div>
                  <p style={mutedTextStyle}>
                    {copy.guardrail}: {getLocalizedText(action.guardrail, locale)}
                  </p>
                  <p style={mutedTextStyle}>
                    {copy.nextAction}: {getLocalizedText(action.nextAction, locale)}
                  </p>
                </div>
              ))}
            </article>
          ))}
        </div>
      </section>

      <section aria-label={copy.aiReportHandoff} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <h3 style={{ fontSize: 20, margin: 0 }}>{copy.aiReportHandoff}</h3>
            <p style={mutedTextStyle}>{copy.aiReportHandoffSubtitle}</p>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${aiReportHandoff.summary.totalHandoffs} ${copy.totalHandoffs}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${aiReportHandoff.summary.readyToReviewCount} ${copy.readyToReview}`}
              state="ready"
            />
            <PublishStateBadge
              label={`${aiReportHandoff.summary.reviewRequiredCount} ${copy.reviewRequired}`}
              state={aiReportHandoff.summary.reviewRequiredCount > 0 ? "warning" : "ready"}
            />
            <PublishStateBadge
              label={`${aiReportHandoff.summary.blockedCount} ${copy.blocked}`}
              state={aiReportHandoff.summary.blockedCount > 0 ? "blocker" : "ready"}
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{copy.localOnlyBoundary}</p>
          <p style={{ margin: "8px 0 0" }}>
            {getLocalizedText(aiReportHandoff.boundary, locale)}
          </p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.nextAction}: {getLocalizedText(aiReportHandoff.summary.topNextAction, locale)}
          </p>
        </div>
        <div style={gridStyle}>
          {aiReportHandoff.handoffs.map((handoff) => (
            <article key={handoff.id} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{copy.category}: {readableCode(handoff.category)}</p>
                  <strong>{getLocalizedText(handoff.title, locale)}</strong>
                </div>
                <PublishStateBadge
                  label={aiReportHandoffLabel(handoff.reviewState, copy)}
                  state={aiReportHandoffState(handoff.reviewState)}
                />
              </div>
              <p style={mutedTextStyle}>{getLocalizedText(handoff.summary, locale)}</p>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{copy.generatedAt}</p>
                  <p style={mutedTextStyle}>{handoff.generatedAt}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.ownerRole}</p>
                  <p style={mutedTextStyle}>{readableCode(handoff.ownerRole)}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.reviewState}</p>
                  <p style={mutedTextStyle}>{aiReportHandoffLabel(handoff.reviewState, copy)}</p>
                </div>
              </div>
              <div style={stackStyle}>
                <p style={labelStyle}>{copy.sourceMetrics}</p>
                <span style={sourceMetricListStyle}>
                  {handoff.sourceMetrics.map((metric) => (
                    <span
                      key={metric.id}
                      style={{
                        ...sourceMetricChipStyle,
                        ...sourceMetricToneStyles[metric.tone],
                      }}
                      title={`${getLocalizedText(metric.label, locale)}: ${metric.value}`}
                    >
                      {getLocalizedText(metric.label, locale)}: {metric.value}
                    </span>
                  ))}
                </span>
              </div>
              <p style={wrapTextStyle}>
                {copy.sourceEvidence}: {getLocalizedText(handoff.sourceEvidence, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.guardrail}: {getLocalizedText(handoff.guardrail, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.nextAction}: {getLocalizedText(handoff.nextAction, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={copy.competitorWatch} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <h3 style={{ fontSize: 20, margin: 0 }}>{copy.competitorWatch}</h3>
            <p style={mutedTextStyle}>{copy.competitorWatchSubtitle}</p>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${competitorWatch.summary.totalSignals} ${copy.competitorWatchTotalSignals}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${competitorWatch.summary.readyCount} ${copy.readyToReview}`}
              state="ready"
            />
            <PublishStateBadge
              label={`${competitorWatch.summary.reviewRequiredCount} ${copy.reviewRequired}`}
              state={competitorWatch.summary.reviewRequiredCount > 0 ? "warning" : "ready"}
            />
            <PublishStateBadge
              label={`${competitorWatch.summary.blockedCount} ${copy.blocked}`}
              state={competitorWatch.summary.blockedCount > 0 ? "blocker" : "ready"}
            />
            <Badge
              label={`${competitorWatch.summary.differentiatorCount} ${copy.competitorWatchDifferentiators}`}
              tone="info"
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{copy.localOnlyBoundary}</p>
          <p style={{ margin: "8px 0 0" }}>
            {getLocalizedText(competitorWatch.boundary, locale)}
          </p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.nextAction}: {getLocalizedText(competitorWatch.summary.topNextAction, locale)}
          </p>
        </div>
        <div style={gridStyle}>
          {competitorWatch.signals.map((signal) => (
            <article key={signal.id} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{copy.category}: {readableCode(signal.category)}</p>
                  <strong>{getLocalizedText(signal.platformLabel, locale)}</strong>
                </div>
                <PublishStateBadge
                  label={competitorWatchReviewStateLabel(signal.reviewState, copy)}
                  state={competitorWatchReviewState(signal.reviewState)}
                />
              </div>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{copy.competitorWatchPlatform}</p>
                  <p style={mutedTextStyle}>{getLocalizedText(signal.platformLabel, locale)}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.ownerRole}</p>
                  <p style={mutedTextStyle}>{readableCode(signal.ownerRole)}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.reviewState}</p>
                  <p style={mutedTextStyle}>
                    {competitorWatchReviewStateLabel(signal.reviewState, copy)}
                  </p>
                </div>
              </div>
              <p style={wrapTextStyle}>
                {copy.competitorWatchObservedPattern}: {getLocalizedText(signal.observedPattern, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.competitorWatchAelfImplication}: {getLocalizedText(signal.aelfImplication, locale)}
              </p>
              <div style={stackStyle}>
                <p style={labelStyle}>{copy.competitorWatchDifferentiators}</p>
                <span style={chipListStyle}>
                  {signal.differentiators.map((differentiator) => (
                    <span key={differentiator} style={chipStyle} title={differentiator}>
                      {competitorWatchDifferentiatorLabel(differentiator)}
                    </span>
                  ))}
                </span>
              </div>
              <p style={wrapTextStyle}>
                {copy.competitorWatchEvidenceBasis}: {getLocalizedText(signal.evidenceBasis, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.guardrail}: {getLocalizedText(signal.guardrail, locale)}
              </p>
              <p style={wrapTextStyle}>
                {copy.nextAction}: {getLocalizedText(signal.nextAction, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section style={panelStyle}>
        <h3 style={{ fontSize: 20, margin: 0 }}>{copy.aiOpsReports}</h3>
        <div style={gridStyle}>
          {adminOps.aiReports.map((report) => (
            <article key={report.id} style={cardStyle}>
              <div style={rowStyle}>
                <strong>{getLocalizedText(report.title, locale)}</strong>
                <Badge label={`${copy.generatedAt}: ${report.generatedAt}`} tone="ai" />
              </div>
              <p style={mutedTextStyle}>{getLocalizedText(report.summary, locale)}</p>
              {report.recommendations.map((recommendation) => (
                <div
                  key={recommendation.id}
                  style={{
                    borderTop: "1px solid #dbe6f4",
                    display: "grid",
                    gap: 8,
                    paddingTop: 10,
                  }}
                >
                  <div style={rowStyle}>
                    <strong>{getLocalizedText(recommendation.title, locale)}</strong>
                    <PublishStateBadge
                      label={
                        recommendation.requiresHumanReview
                          ? copy.humanReviewRequired
                          : copy.noHumanReviewRequired
                      }
                      state={recommendation.requiresHumanReview ? "warning" : "ready"}
                    />
                  </div>
                  <p style={mutedTextStyle}>
                    {copy.expectedImpact}: {getLocalizedText(recommendation.expectedImpact, locale)}
                  </p>
                  <p style={mutedTextStyle}>
                    {copy.confidence}: {recommendation.confidence} · {copy.riskLevel}:{" "}
                    {recommendation.riskLevel}
                  </p>
                </div>
              ))}
            </article>
          ))}
        </div>
      </section>

      <section style={panelStyle}>
        <h3 style={{ fontSize: 20, margin: 0 }}>{copy.ecosystemMetrics}</h3>
        <div style={scrollContainerStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{copy.product}</th>
                <th style={thStyle}>{copy.count}</th>
                <th style={thStyle}>{copy.conversion}</th>
                <th style={thStyle}>{copy.qualitySignal}</th>
                <th style={thStyle}>{copy.nextAction}</th>
              </tr>
            </thead>
            <tbody>
              {adminOps.ecosystemMetrics.map((row) => (
                <tr key={row.product}>
                  <td style={tdStyle}>
                    <strong>{row.product}</strong>
                  </td>
                  <td style={tdStyle}>{row.verifiedActions.toLocaleString("en-US")}</td>
                  <td style={tdStyle}>{getLocalizedText(row.conversionImpact, locale)}</td>
                  <td style={tdStyle}>{getLocalizedText(row.qualitySignal, locale)}</td>
                  <td style={tdStyle}>{getLocalizedText(row.recommendedNextAction, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={rowStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.exportPreview}</h3>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <PublishStateBadge label={copy.exportReady} state="ready" />
            <Badge label={`${copy.exportBatch}: ${adminOps.exportBatch.batchId}`} tone="info" />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{copy.exportDisclaimer}</p>
          <p style={{ margin: "6px 0 0" }}>
            {getLocalizedText(adminOps.exportBatch.disclaimer, locale)}
          </p>
        </div>
        <div style={gridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.exportConfirmation}</p>
            <p style={mutedTextStyle}>{copy.verifiedRecordsOnly}</p>
            <p style={mutedTextStyle}>{copy.finalRewardOwner}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.blockersWarnings}</p>
            <p style={mutedTextStyle}>
              {getLocalizedText(adminOps.exportBatch.confirmation.noDistributionBoundary, locale)}
            </p>
            <p style={mutedTextStyle}>
              {getLocalizedText(adminOps.exportBatch.confirmation.riskBoundary, locale)}
            </p>
          </article>
        </div>
        <div aria-label={copy.exportConfirmationReadiness} style={cardStyle}>
          <div style={rowStyle}>
            <div>
              <p style={labelStyle}>{copy.exportConfirmationReadiness}</p>
              <h4 style={{ fontSize: 18, margin: "2px 0 0" }}>{copy.exportConfirmationReadiness}</h4>
            </div>
            <PublishStateBadge
              label={`${exportReadiness.summary.requiredAcknowledgements}/${exportReadiness.summary.acknowledgedItems} ${copy.exportAcknowledgements}`}
              state={
                exportReadiness.summary.requiredAcknowledgements === exportReadiness.summary.acknowledgedItems
                  ? "ready"
                  : "warning"
              }
            />
          </div>
          <div style={compactGridStyle}>
            {[
              { label: copy.readyRows, state: "ready" as const, value: exportReadiness.summary.readyRows },
              { label: copy.reviewRequired, state: "warning" as const, value: exportReadiness.summary.reviewRequiredRows },
              {
                label: copy.blocked,
                state: exportReadiness.summary.blockedRows > 0 ? "blocker" as const : "ready" as const,
                value: exportReadiness.summary.blockedRows,
              },
              { label: copy.exportPreviewModes, state: "ready" as const, value: exportReadiness.summary.previewModeCount },
            ].map(({ label, value, state }) => (
              <article key={label} style={{ ...cardStyle, minHeight: 0 }}>
                <p style={labelStyle}>{label}</p>
                <p style={{ ...valueStyle, fontSize: 20 }}>{value}</p>
                <PublishStateBadge label={String(value)} state={state} />
              </article>
            ))}
          </div>
          <div style={gridStyle}>
            <article style={{ ...cardStyle, minHeight: 0 }}>
              <p style={labelStyle}>{copy.exportPreviewModes}</p>
              <div style={sourceMetricListStyle}>
                {exportReadiness.previewModes.map((mode) => (
                  <div key={mode.mode} style={rowStyle}>
                    <span style={mutedTextStyle}>{getLocalizedText(mode.label, locale)}</span>
                    <PublishStateBadge
                      label={mode.generatesFile ? copy.exportRealFile : copy.exportLocalPreviewOnly}
                      state={mode.generatesFile ? "blocker" : "ready"}
                    />
                  </div>
                ))}
              </div>
            </article>
            <article style={{ ...cardStyle, minHeight: 0 }}>
              <p style={labelStyle}>{copy.exportProjectAcknowledgements}</p>
              <div style={sourceMetricListStyle}>
                {exportReadiness.acknowledgements.map((acknowledgement) => (
                  <div key={acknowledgement.id} style={rowStyle}>
                    <span style={mutedTextStyle}>{getLocalizedText(acknowledgement.label, locale)}</span>
                    <PublishStateBadge
                      label={acknowledgement.acknowledged ? copy.humanApproved : copy.reviewRequired}
                      state={acknowledgement.acknowledged ? "ready" : "warning"}
                    />
                  </div>
                ))}
              </div>
            </article>
          </div>
          <div style={gridStyle}>
            <article style={{ ...cardStyle, minHeight: 0 }}>
              <p style={labelStyle}>{copy.exportRequiredFields}</p>
              <code style={codeListStyle}>
                {exportReadiness.fieldCoverage.requiredFields.join(",")}
              </code>
            </article>
            <article style={{ ...cardStyle, minHeight: 0 }}>
              <p style={labelStyle}>{copy.exportRowReasonCoverage}</p>
              <div style={sourceMetricListStyle}>
                {exportReadiness.rowStatusCoverage.map((reason) => (
                  <div key={reason.reasonCode} style={rowStyle}>
                    <span style={mutedTextStyle}>{getLocalizedText(reason.label, locale)}</span>
                    <PublishStateBadge
                      label={`${reason.affectedRows} ${readableCode(reason.rowStatus)}`}
                      state={reason.rowStatus === "blocked" ? "blocker" : reason.rowStatus === "review_required" ? "warning" : "ready"}
                    />
                  </div>
                ))}
              </div>
            </article>
          </div>
          <div style={gridStyle}>
            {exportReadiness.contractRootReadiness.map((rootMode) => (
              <article key={rootMode.mode} style={{ ...cardStyle, minHeight: 0 }}>
                <div style={rowStyle}>
                  <strong>{getLocalizedText(rootMode.label, locale)}</strong>
                  <PublishStateBadge
                    label={readableCode(rootMode.readiness)}
                    state={exportReadinessState(rootMode.readiness)}
                  />
                </div>
                <p style={mutedTextStyle}>
                  {rootMode.safeDefault ? copy.exportSafeDefault : getLocalizedText(rootMode.nextAction, locale)}
                </p>
              </article>
            ))}
          </div>
          <p style={boundaryStyle}>{getLocalizedText(exportReadiness.boundary, locale)}</p>
        </div>
        <div style={stackStyle}>
          <p style={labelStyle}>{copy.exactColumnOrder}</p>
          <div style={scrollContainerStyle}>
            <code style={contractCodeStyle}>{columnContract}</code>
          </div>
        </div>
        <div aria-label={copy.exportFulfillmentReadiness} style={cardStyle}>
          <div style={rowStyle}>
            <div>
              <p style={labelStyle}>{copy.exportFulfillmentStatus}</p>
              <h4 style={{ fontSize: 18, margin: "2px 0 0" }}>{copy.exportFulfillmentReadiness}</h4>
              <p style={mutedTextStyle}>{copy.exportFulfillmentReadinessSubtitle}</p>
            </div>
            <PublishStateBadge
              label={readableCode(exportFulfillmentReadiness.summary.status)}
              state={exportReadinessState(exportFulfillmentReadiness.summary.status)}
            />
          </div>
          <div style={compactGridStyle}>
            <article style={{ ...cardStyle, minHeight: 0 }}>
              <p style={labelStyle}>{copy.exportFulfillmentRows}</p>
              <p style={{ ...valueStyle, fontSize: 20 }}>
                {exportFulfillmentReadiness.summary.readyRows} / {exportFulfillmentReadiness.summary.reviewRequiredRows} / {exportFulfillmentReadiness.summary.blockedRows}
              </p>
              <p style={wrapTextStyle}>
                {copy.exportFulfillmentBatch}: {exportFulfillmentReadiness.batchId}
              </p>
            </article>
            <article style={{ ...cardStyle, minHeight: 0 }}>
              <p style={labelStyle}>{copy.exportFulfillmentAcknowledgements}</p>
              <p style={{ ...valueStyle, fontSize: 20 }}>
                {exportFulfillmentReadiness.summary.acknowledgedItems}/{exportFulfillmentReadiness.summary.requiredAcknowledgements}
              </p>
              <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <PublishStateBadge
                  label={copy.exportFulfillmentOwnerApproved}
                  state={exportFulfillmentReadiness.summary.ownerApproved ? "ready" : "warning"}
                />
                <PublishStateBadge
                  label={copy.exportFulfillmentOperatorReviewed}
                  state={exportFulfillmentReadiness.summary.operatorReviewed ? "ready" : "warning"}
                />
              </span>
            </article>
            <article style={{ ...cardStyle, minHeight: 0 }}>
              <p style={labelStyle}>{copy.exportFulfillmentFutureStorage}</p>
              <p style={wrapTextStyle}>{getLocalizedText(exportFulfillmentReadiness.nextAction, locale)}</p>
            </article>
          </div>
          <div style={gridStyle}>
            <article style={{ ...cardStyle, minHeight: 0 }}>
              <p style={labelStyle}>{copy.exportFulfillmentPackages}</p>
              <div style={sourceMetricListStyle}>
                {exportFulfillmentReadiness.packages.map((pack) => (
                  <div key={pack.id} style={rowStyle}>
                    <span style={{ ...mutedTextStyle, overflowWrap: "anywhere" }}>
                      {pack.format.toUpperCase()} · {pack.fileName}
                    </span>
                    <PublishStateBadge
                      label={pack.handoffReady ? copy.exportLocalPreviewOnly : copy.reviewRequired}
                      state={pack.handoffReady ? "ready" : "warning"}
                    />
                  </div>
                ))}
              </div>
            </article>
            <article style={{ ...cardStyle, minHeight: 0 }}>
              <p style={labelStyle}>{copy.exportFulfillmentChecksum}</p>
              <div style={sourceMetricListStyle}>
                {exportFulfillmentReadiness.packages.map((pack) => (
                  <div key={`${pack.id}-checksum`} style={rowStyle}>
                    <span style={{ ...mutedTextStyle, overflowWrap: "anywhere" }}>{pack.checksum}</span>
                    <span style={mutedTextStyle}>
                      {copy.exportFulfillmentPayloadBytes}: {pack.payloadBytes.toLocaleString("en-US")}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          </div>
          <article style={{ ...cardStyle, minHeight: 0 }}>
            <div style={rowStyle}>
              <p style={labelStyle}>{copy.exportFulfillmentSafety}</p>
              <PublishStateBadge label={copy.exportLocalPreviewOnly} state="ready" />
            </div>
            <div style={sourceMetricListStyle}>
              {[
                copy.exportFulfillmentNoDownloadUrl,
                copy.exportFulfillmentNoStorageWrite,
                copy.exportFulfillmentNoContractRoot,
                copy.exportFulfillmentNoRewardDistribution,
              ].map((boundary) => (
                <div key={boundary} style={rowStyle}>
                  <span style={mutedTextStyle}>{boundary}</span>
                  <PublishStateBadge label={copy.covered} state="ready" />
                </div>
              ))}
            </div>
            <p style={boundaryStyle}>{getLocalizedText(exportFulfillmentReadiness.boundary, locale)}</p>
            <p style={boundaryStyle}>
              {copy.exportFulfillmentBoundary}: {getLocalizedText(exportFulfillmentReadiness.safety.boundary, locale)}
            </p>
          </article>
        </div>
        <article aria-label={copy.exportArtifact} style={cardStyle}>
          <div style={rowStyle}>
            <div style={stackStyle}>
              <p style={labelStyle}>{copy.exportArtifact}</p>
              <strong style={{ overflowWrap: "anywhere" }}>{exportArtifact.fileName}</strong>
            </div>
            <PublishStateBadge label={readableCode(exportArtifact.metadata.generatedMode)} state="ready" />
          </div>
          <div style={compactGridStyle}>
            <article style={{ ...cardStyle, minHeight: 0 }}>
              <p style={labelStyle}>{copy.exportArtifactFormat}</p>
              <p style={{ ...valueStyle, fontSize: 20 }}>{exportArtifact.format.toUpperCase()}</p>
              <p style={wrapTextStyle}>
                {copy.exportArtifactBatchId}: {exportArtifact.batchId}
              </p>
            </article>
            <article style={{ ...cardStyle, minHeight: 0 }}>
              <p style={labelStyle}>{copy.exportArtifactChecksum}</p>
              <p style={{ color: "#071426", fontSize: 13, fontWeight: 900, lineHeight: 1.35, margin: 0, overflowWrap: "anywhere" }}>
                {exportArtifact.metadata.checksum}
              </p>
              <p style={wrapTextStyle}>{exportArtifact.metadata.checksumAlgorithm}</p>
            </article>
            <article style={{ ...cardStyle, minHeight: 0 }}>
              <p style={labelStyle}>{copy.exportArtifactPayloadSize}</p>
              <p style={{ ...valueStyle, fontSize: 20 }}>
                {exportArtifact.metadata.payloadBytes.toLocaleString("en-US")}
              </p>
              <p style={wrapTextStyle}>
                {copy.exportArtifactRows}: {exportArtifact.metadata.readyRows} / {exportArtifact.metadata.reviewRequiredRows} / {exportArtifact.metadata.blockedRows}
              </p>
            </article>
          </div>
          <div style={sourceMetricListStyle}>
            {[
              copy.exportArtifactNoDownloadUrl,
              copy.exportArtifactNoStorageWrite,
              copy.exportArtifactNoContractRoot,
              copy.exportArtifactNoRewardDistribution,
            ].map((boundary) => (
              <div key={boundary} style={rowStyle}>
                <span style={mutedTextStyle}>{boundary}</span>
                <PublishStateBadge label={copy.localOnly} state="ready" />
              </div>
            ))}
          </div>
          <p style={boundaryStyle}>{getLocalizedText(exportArtifact.safety.boundary, locale)}</p>
          <p style={boundaryStyle}>{copy.exportArtifactBoundary}</p>
        </article>
        <div style={scrollContainerStyle}>
          <table style={exportTableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{copy.wallet}</th>
                <th style={thStyle}>{copy.accountType}</th>
                <th style={thStyle}>{copy.walletSource}</th>
                <th style={thStyle}>{copy.localePreference}</th>
                <th style={thStyle}>{copy.pointsRank}</th>
                <th style={thStyle}>{copy.walletTypeVerified}</th>
                <th style={thStyle}>{copy.status}</th>
                <th style={thStyle}>{copy.rowCompleteness}</th>
                <th style={thStyle}>{copy.missingTasks}</th>
                <th style={thStyle}>{copy.riskFlags}</th>
                <th style={thStyle}>{copy.referrerAddress}</th>
                <th style={thStyle}>{copy.taskRecords}</th>
                <th style={thStyle}>{copy.evidenceHashes}</th>
                <th style={thStyle}>{copy.exportBatch}</th>
              </tr>
            </thead>
            <tbody>
              {adminOps.exportBatch.rows.map((row) => (
                <tr key={row.walletAddress}>
                  <td style={tdStyle}>
                    <div style={stackStyle}>
                      <span>{row.walletAddress}</span>
                      <WalletBadge accountType={row.accountType} walletSource={row.walletSource} />
                    </div>
                  </td>
                  <td style={tdStyle}>{row.accountType}</td>
                  <td style={tdStyle}>{row.walletSource}</td>
                  <td style={tdStyle}>{row.localePreference}</td>
                  <td style={tdStyle}>
                    {row.totalPoints} / #{row.rank ?? "-"}
                  </td>
                  <td style={tdStyle}>{row.walletTypeVerified ? "true" : "false"}</td>
                  <td style={tdStyle}>
                    <PublishStateBadge
                      label={row.eligible ? "eligible" : "ineligible"}
                      state={row.eligible ? "ready" : "warning"}
                    />
                  </td>
                  <td style={tdStyle}>
                    <div style={stackStyle}>
                      <PublishStateBadge
                        label={row.rowStatus}
                        state={row.rowStatus === "ready" ? "ready" : "warning"}
                      />
                      <span style={mutedTextStyle}>
                        {row.missingColumnValues.join(", ") || "-"}
                      </span>
                    </div>
                  </td>
                  <td style={tdStyle}>{row.missingTasks.join(", ") || "-"}</td>
                  <td style={tdStyle}>{row.riskFlags.join(", ") || "-"}</td>
                  <td style={tdStyle}>{row.referrerAddress}</td>
                  <td style={tdStyle}>
                    <div style={stackStyle}>
                      {row.taskRecords.map((record) => (
                        <span key={record} style={codeListStyle}>
                          {record}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={stackStyle}>
                      {row.evidenceHashes.map((hash) => (
                        <span key={hash} style={codeListStyle}>
                          {hash}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={tdStyle}>{row.exportBatchId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
