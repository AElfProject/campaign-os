import type { CSSProperties } from "react";
import {
  sanitizeContractWriterRuntimeApiText,
  type ContractWriterRuntimeApiBridgeState,
  type ContractWriterRuntimeApiSource,
  type ContractWriterRuntimeApiStatus,
} from "../../../api/contractWriterRuntimeApiBridge";
import { getLocalizedText, type SupportedLocale } from "../../../domain";
import type { ContractWriterNoLiveSideEffects } from "../../../domain/contractWriterRuntime";
import { PublishStateBadge } from "../../badges/Badges";

type ContractWriterBadgeState = "blocker" | "ready" | "warning";
type ContractWriterPanelLocale = Extract<SupportedLocale, "en-US" | "zh-CN" | "zh-TW">;

interface ContractWriterRuntimePanelProps {
  apiConfigured: boolean;
  locale: SupportedLocale;
  onReview?: () => void;
  reviewInFlight?: boolean;
  state: ContractWriterRuntimeApiBridgeState;
}

const labelsEnUs = {
  apiRuntime: "API runtime",
  approvalGates: "Approval gates",
  configHandoff: "Config handoff",
  configured: "Local API base URL configured; review reads the contract writer readiness route only.",
  diagnostics: "Diagnostics",
  errorFallback: "Error fallback",
  loading: "Loading contract writer readiness",
  missingConfig: "missing config keys",
  nextAction: "Next action",
  noAbiGeneration: "No ABI generation",
  noContractWrite: "No contract write",
  noDiagnostics: "No diagnostics",
  noExportWrite: "No export write",
  noObjectStorageWrite: "No object storage write",
  noProductionDatabaseMutation: "No production DB mutation",
  noQueuePublishing: "No queue publishing",
  noRewardCustody: "No reward custody",
  noRewardDistribution: "No reward distribution",
  noRootWrite: "No root write",
  noSchedulerExecution: "No scheduler execution",
  noSignerExecution: "No signer execution",
  noTrace: "No API trace yet",
  noWalletSignature: "No wallet signature",
  none: "None",
  notConfigured: "No local API base URL configured; seeded contract writer readiness remains visible and no fetch is sent.",
  operationCatalog: "Operation catalog",
  operations: "operations",
  refreshAction: "Refresh readiness",
  refreshingAction: "Refreshing readiness...",
  regionLabel: "Contract Writer Runtime review",
  requiredConfigKeys: "Required config keys",
  reviewRequired: "Review required",
  safety: "No-live safety",
  sanitizedDiagnostics: "Contract writer sanitized diagnostics",
  seededFallback: "Seeded fallback",
  status: "Writer readiness",
  statusBlocked: "Blocked",
  statusError: "Error",
  statusFallback: "Fallback",
  statusLoading: "Loading",
  statusLocalReady: "Local ready",
  subtitle: "Review-only companion contract writer handoff, config blockers, operation coverage, and disabled live execution controls.",
  topBlocker: "Top blocker",
  traceId: "Trace ID",
};

const labels = {
  "en-US": labelsEnUs,
  "zh-CN": {
    apiRuntime: "API runtime",
    approvalGates: "Approval gates",
    configHandoff: "Config handoff",
    configured: "已配置本地 API base URL；评审只读取 contract writer readiness route。",
    diagnostics: "诊断",
    errorFallback: "错误回退",
    loading: "正在加载 contract writer readiness",
    missingConfig: "个缺失配置 key",
    nextAction: "下一步",
    noAbiGeneration: "不生成 ABI",
    noContractWrite: "不写合约",
    noDiagnostics: "无诊断",
    noExportWrite: "不写导出文件",
    noObjectStorageWrite: "不写对象存储",
    noProductionDatabaseMutation: "不变更生产数据库",
    noQueuePublishing: "不发布队列",
    noRewardCustody: "不托管奖励",
    noRewardDistribution: "不发奖",
    noRootWrite: "不写 root",
    noSchedulerExecution: "不执行调度",
    noSignerExecution: "不执行 signer",
    noTrace: "暂无 API trace",
    noWalletSignature: "不请求钱包签名",
    none: "无",
    notConfigured: "未配置本地 API base URL；seeded contract writer readiness 保持可见，且不会发送 fetch。",
    operationCatalog: "Operation catalog",
    operations: "个 operation",
    refreshAction: "刷新 readiness",
    refreshingAction: "正在刷新 readiness...",
    regionLabel: "Contract Writer Runtime 评审",
    requiredConfigKeys: "必需配置键",
    reviewRequired: "需要评审",
    safety: "No-live 安全",
    sanitizedDiagnostics: "Contract writer 已清洗诊断",
    seededFallback: "Seeded 回退",
    status: "Writer readiness",
    statusBlocked: "阻断",
    statusError: "错误",
    statusFallback: "回退",
    statusLoading: "加载中",
    statusLocalReady: "本地就绪",
    subtitle: "只读评审 companion contract writer handoff、配置阻断、operation 覆盖与已禁用实时执行控件。",
    topBlocker: "最高优先级阻断",
    traceId: "Trace ID",
  },
  "zh-TW": {
    apiRuntime: "API runtime",
    approvalGates: "Approval gates",
    configHandoff: "Config handoff",
    configured: "已設定本地 API base URL；評審只讀取 contract writer readiness route。",
    diagnostics: "診斷",
    errorFallback: "錯誤回退",
    loading: "正在載入 contract writer readiness",
    missingConfig: "個缺失設定鍵",
    nextAction: "下一步",
    noAbiGeneration: "不生成 ABI",
    noContractWrite: "不寫合約",
    noDiagnostics: "無診斷",
    noExportWrite: "不寫匯出檔案",
    noObjectStorageWrite: "不寫物件儲存",
    noProductionDatabaseMutation: "不變更生產資料庫",
    noQueuePublishing: "不發布佇列",
    noRewardCustody: "不託管獎勵",
    noRewardDistribution: "不發獎",
    noRootWrite: "不寫 root",
    noSchedulerExecution: "不執行調度",
    noSignerExecution: "不執行 signer",
    noTrace: "暫無 API trace",
    noWalletSignature: "不請求錢包簽名",
    none: "無",
    notConfigured: "未設定本地 API base URL；seeded contract writer readiness 保持可見，且不會送出 fetch。",
    operationCatalog: "Operation catalog",
    operations: "個 operation",
    refreshAction: "刷新 readiness",
    refreshingAction: "正在刷新 readiness...",
    regionLabel: "Contract Writer Runtime 評審",
    requiredConfigKeys: "必要設定鍵",
    reviewRequired: "需要評審",
    safety: "No-live 安全",
    sanitizedDiagnostics: "Contract writer 已清洗診斷",
    seededFallback: "Seeded 回退",
    status: "Writer readiness",
    statusBlocked: "阻斷",
    statusError: "錯誤",
    statusFallback: "回退",
    statusLoading: "載入中",
    statusLocalReady: "本地就緒",
    subtitle: "只讀評審 companion contract writer handoff、設定阻斷、operation 覆蓋與已停用的即時執行控制。",
    topBlocker: "最高優先級阻斷",
    traceId: "Trace ID",
  },
} satisfies Record<ContractWriterPanelLocale, typeof labelsEnUs>;

const panelStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  boxSizing: "border-box",
  display: "grid",
  gap: 14,
  maxWidth: "100%",
  minWidth: 0,
  padding: 16,
};

const headingRowStyle: CSSProperties = {
  alignItems: "start",
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  justifyContent: "space-between",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
  minWidth: 0,
};

const cardStyle: CSSProperties = {
  background: "#f8fbff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  boxSizing: "border-box",
  display: "grid",
  gap: 6,
  minHeight: 100,
  minWidth: 0,
  padding: 14,
};

const statLabelStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0,
  margin: 0,
  textTransform: "uppercase",
};

const statValueStyle: CSSProperties = {
  color: "#071426",
  fontSize: 22,
  fontWeight: 900,
  lineHeight: 1.12,
  margin: 0,
};

const bodyTextStyle: CSSProperties = {
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.45,
  margin: 0,
};

const wrapTextStyle: CSSProperties = {
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const compactListStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  margin: 0,
  padding: 0,
};

const chipStyle: CSSProperties = {
  background: "#eef6ff",
  border: "1px solid #bfdbfe",
  borderRadius: 8,
  color: "#1e3a8a",
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1.2,
  listStyle: "none",
  maxWidth: "100%",
  padding: "6px 8px",
  ...wrapTextStyle,
};

const boundaryStyle: CSSProperties = {
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  borderRadius: 8,
  color: "#9a3412",
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.45,
  margin: 0,
  padding: 12,
  ...wrapTextStyle,
};

const actionButtonStyle: CSSProperties = {
  alignSelf: "start",
  background: "#071426",
  border: "1px solid #071426",
  borderRadius: 8,
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 800,
  minHeight: 38,
  padding: "0 12px",
  width: "fit-content",
};

const supportedPanelLocale = (locale: SupportedLocale): ContractWriterPanelLocale =>
  locale === "zh-CN" || locale === "zh-TW" ? locale : "en-US";

const sourceLabel = (
  source: ContractWriterRuntimeApiSource,
  copy: typeof labelsEnUs,
) => {
  const sourceLabels: Record<ContractWriterRuntimeApiSource, string> = {
    api_runtime: copy.apiRuntime,
    error_fallback: copy.errorFallback,
    loading: copy.loading,
    seeded_fallback: copy.seededFallback,
  };

  return sourceLabels[source];
};

const statusLabel = (
  status: ContractWriterRuntimeApiStatus,
  copy: typeof labelsEnUs,
) => {
  const statusLabels: Record<ContractWriterRuntimeApiStatus, string> = {
    blocked: copy.statusBlocked,
    error: copy.statusError,
    fallback: copy.statusFallback,
    loading: copy.statusLoading,
    local_ready: copy.statusLocalReady,
    review_required: copy.reviewRequired,
  };

  return statusLabels[status];
};

const badgeState = (
  status: ContractWriterRuntimeApiStatus,
): ContractWriterBadgeState =>
  status === "review_required" || status === "local_ready"
    ? "ready"
    : status === "blocked" || status === "error"
      ? "blocker"
      : "warning";

const sanitizePanelText = (value: unknown) =>
  sanitizeContractWriterRuntimeApiText(value)
    .replace(
      /\b(redacted bearer credential|redacted credential|password=redacted)\s*=\s*[^&\s"'<>]+/gi,
      "$1",
    )
    .replace(/\/Users\/[^"'\s<>]+/gi, "redacted local path");

const listOrFallback = (items: readonly string[], fallback: string) => (items.length > 0 ? items : [fallback]);

const safetyItems = (copy: typeof labelsEnUs): Array<[keyof ContractWriterNoLiveSideEffects, string]> => [
  ["liveSignerExecution", copy.noSignerExecution],
  ["liveWalletSignature", copy.noWalletSignature],
  ["liveAbiGeneration", copy.noAbiGeneration],
  ["liveContractWrite", copy.noContractWrite],
  ["liveRootWrite", copy.noRootWrite],
  ["liveQueuePublishing", copy.noQueuePublishing],
  ["liveSchedulerExecution", copy.noSchedulerExecution],
  ["liveProductionDatabaseMutation", copy.noProductionDatabaseMutation],
  ["liveObjectStorageWrite", copy.noObjectStorageWrite],
  ["liveExportFileWrite", copy.noExportWrite],
  ["liveRewardCustody", copy.noRewardCustody],
  ["liveRewardDistribution", copy.noRewardDistribution],
];

export function ContractWriterRuntimePanel({
  apiConfigured,
  locale,
  onReview,
  reviewInFlight = false,
  state,
}: ContractWriterRuntimePanelProps) {
  const copy = labels[supportedPanelLocale(locale)];
  const readiness = state.readiness;
  const topBlocker = getLocalizedText(readiness.summary.topBlocker, locale);
  const topNextAction = getLocalizedText(readiness.summary.topNextAction, locale);
  const diagnostics = [
    ...state.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      message: getLocalizedText(diagnostic.message, locale),
      safeDetails: diagnostic.safeDetails,
      severity: diagnostic.severity,
    })),
    ...readiness.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      message: diagnostic.message,
      safeDetails: diagnostic.safeDetails,
      severity: diagnostic.severity,
    })),
  ];

  return (
    <article aria-label={copy.regionLabel} style={panelStyle}>
      <div style={headingRowStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={statLabelStyle}>{copy.status}</p>
          <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
            {copy.regionLabel}
          </h4>
          <p style={bodyTextStyle}>{copy.subtitle}</p>
          <p style={{ ...bodyTextStyle, marginTop: 4 }}>
            {apiConfigured ? copy.configured : copy.notConfigured}
          </p>
        </div>
        <span style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
          <PublishStateBadge label={sourceLabel(state.source, copy)} state={badgeState(state.status)} />
          <PublishStateBadge label={statusLabel(state.status, copy)} state={badgeState(state.status)} />
        </span>
      </div>

      <div style={gridStyle}>
        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.traceId}</p>
          <p style={{ ...statValueStyle, fontSize: 15, ...wrapTextStyle }}>
            {state.traceId ?? (state.source === "api_runtime" ? readiness.traceId : copy.noTrace)}
          </p>
          <p style={bodyTextStyle}>x-campaign-os-trace-id</p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.configHandoff}</p>
          <p style={{ ...statValueStyle, fontSize: 18, ...wrapTextStyle }}>
            {readiness.configHandoff.status}
          </p>
          <p style={bodyTextStyle}>
            {readiness.summary.missingConfigCount} {copy.missingConfig}
          </p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.operationCatalog}</p>
          <p style={statValueStyle}>{readiness.summary.contractGroupCount}</p>
          <p style={bodyTextStyle}>
            {readiness.summary.operationCount} {copy.operations}
          </p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.approvalGates}</p>
          <p style={statValueStyle}>{readiness.summary.approvedApprovalGateCount}/{readiness.summary.approvalGateCount}</p>
          <p style={bodyTextStyle}>{readiness.status}</p>
        </article>
      </div>

      <p style={boundaryStyle}>{getLocalizedText(readiness.boundary, locale)}</p>

      <div style={gridStyle}>
        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.topBlocker}</p>
          <p style={{ ...bodyTextStyle, ...wrapTextStyle }}>{topBlocker}</p>
        </article>
        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.nextAction}</p>
          <p style={{ ...bodyTextStyle, ...wrapTextStyle }}>{topNextAction}</p>
        </article>
      </div>

      <section aria-label={copy.operationCatalog} style={gridStyle}>
        {readiness.operationCatalog.map((group) => (
          <article key={group.contractId} style={cardStyle}>
            <p style={statLabelStyle}>{group.ownerRole}</p>
            <strong style={wrapTextStyle}>{group.contractName}</strong>
            <p style={bodyTextStyle}>
              {group.operations.length} {copy.operations} / {group.readiness}
            </p>
            <ul style={compactListStyle}>
              {group.operations.slice(0, 4).map((operation) => (
                <li key={operation.id} style={chipStyle}>
                  {operation.methodName}
                </li>
              ))}
            </ul>
            <p style={{ ...bodyTextStyle, ...wrapTextStyle }}>
              {copy.nextAction}: {getLocalizedText(group.nextAction, locale)}
            </p>
          </article>
        ))}
      </section>

      <div style={gridStyle}>
        <section aria-label={copy.requiredConfigKeys} style={cardStyle}>
          <p style={statLabelStyle}>{copy.requiredConfigKeys}</p>
          <ul style={compactListStyle}>
            {listOrFallback(readiness.configHandoff.requiredConfigKeys, copy.none).map((key) => (
              <li key={key} style={chipStyle}>
                {sanitizePanelText(key)}
              </li>
            ))}
          </ul>
        </section>

        <section aria-label={copy.approvalGates} style={cardStyle}>
          <p style={statLabelStyle}>{copy.approvalGates}</p>
          <ul style={compactListStyle}>
            {readiness.approvalGates.map((gate) => (
              <li key={gate.id} style={chipStyle}>
                {getLocalizedText(gate.label, locale)}: {gate.status}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-label={copy.safety} style={cardStyle}>
        <p style={statLabelStyle}>{copy.safety}</p>
        <ul style={compactListStyle}>
          {safetyItems(copy).map(([key, label]) => (
            <li key={key} style={chipStyle}>
              {readiness.noLiveSideEffects[key] === false ? label : `${copy.statusError}: ${label}`}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label={copy.sanitizedDiagnostics} style={cardStyle}>
        <p style={statLabelStyle}>{copy.diagnostics}</p>
        {diagnostics.length === 0 ? (
          <p style={bodyTextStyle}>{copy.noDiagnostics}</p>
        ) : (
          <ul style={{ display: "grid", gap: 8, margin: 0, padding: 0 }}>
            {diagnostics.map((diagnostic, index) => (
              <li key={`${diagnostic.code}-${index}`} style={{ ...bodyTextStyle, listStyle: "none", ...wrapTextStyle }}>
                <strong>{sanitizePanelText(diagnostic.code)}</strong>: {sanitizePanelText(diagnostic.message)}
                {diagnostic.safeDetails ? ` (${sanitizePanelText(diagnostic.safeDetails)})` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      {onReview ? (
        <button
          disabled={reviewInFlight}
          onClick={onReview}
          style={actionButtonStyle}
          type="button"
        >
          {reviewInFlight ? copy.refreshingAction : copy.refreshAction}
        </button>
      ) : null}
    </article>
  );
}
