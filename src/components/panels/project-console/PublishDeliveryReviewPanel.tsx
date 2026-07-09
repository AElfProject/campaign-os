import type { CSSProperties } from "react";
import {
  sanitizePublishDeliveryReviewApiText,
  type PublishDeliveryReviewApiBridgeState,
  type PublishDeliveryReviewApiSource,
  type PublishDeliveryReviewApiStatus,
} from "../../../api/publishDeliveryReviewApiBridge";
import { getLocalizedText, type SupportedLocale } from "../../../domain";
import { PublishStateBadge } from "../../badges/Badges";

type PublishDeliveryBadgeState = "blocker" | "ready" | "warning";

interface PublishDeliveryReviewPanelProps {
  apiConfigured: boolean;
  locale: SupportedLocale;
  onReview: () => void;
  reviewInFlight: boolean;
  state: PublishDeliveryReviewApiBridgeState;
}

const labels = {
  "en-US": {
    apiRuntime: "API runtime",
    backend: "Backend readiness",
    blockerWarningPassed: "Blockers / warnings / passed",
    boundary: "Local-review boundary",
    checklist: "Delivery checklist",
    configured: "Local API base URL configured; review reads the publish-delivery route only.",
    diagnostics: "Diagnostics",
    errorFallback: "Error fallback",
    evidenceHashCoverage: "Evidence hash coverage",
    fallback: "Fallback",
    handoffs: "handoffs",
    launchBundles: "Launch bundles",
    launchState: "Launch state",
    loading: "Loading",
    noContractWrite: "No contract write",
    noDiagnostics: "No diagnostics",
    noLiveExecution: "No live provider execution",
    noProductionPublish: "No production publish",
    noRewardCustody: "No reward custody",
    noRewardDistribution: "No reward distribution",
    noTrace: "No API trace yet",
    notConfigured: "No local API base URL configured; seeded joint review remains visible and no fetch is sent.",
    panelTitle: "Publish Delivery Review Bridge",
    productionReady: "productionReady=false",
    repositoryEvidence: "Repository evidence",
    reviewAction: "Review local bridge",
    reviewing: "Reviewing local bridge...",
    seededFallback: "Seeded fallback",
    status: "Status",
    subtitle: "Compact front-end/back-end MVP sign-off view for publish, delivery, repository evidence, and backend blockers.",
    traceId: "Trace ID",
  },
  "zh-CN": {
    apiRuntime: "API runtime",
    backend: "Backend readiness",
    blockerWarningPassed: "阻断 / 警告 / 通过",
    boundary: "本地 review 边界",
    checklist: "Delivery checklist",
    configured: "已配置本地 API base URL；评审只读取 publish-delivery route。",
    diagnostics: "诊断",
    errorFallback: "错误回退",
    evidenceHashCoverage: "证据 hash 覆盖",
    fallback: "回退",
    handoffs: "handoffs",
    launchBundles: "Launch bundles",
    launchState: "Launch state",
    loading: "加载中",
    noContractWrite: "不写合约",
    noDiagnostics: "无诊断",
    noLiveExecution: "不执行实时 provider",
    noProductionPublish: "不执行生产发布",
    noRewardCustody: "不托管奖励",
    noRewardDistribution: "不发奖",
    noTrace: "暂无 API trace",
    notConfigured: "未配置本地 API base URL；seeded 联合 review 保持可见，且不会发送 fetch。",
    panelTitle: "Publish Delivery Review Bridge",
    productionReady: "productionReady=false",
    repositoryEvidence: "Repository evidence",
    reviewAction: "评审本地 bridge",
    reviewing: "正在评审本地 bridge...",
    seededFallback: "Seeded fallback",
    status: "状态",
    subtitle: "用于发布、交付、repository evidence 与 backend blockers 的紧凑前后端 MVP 签核视图。",
    traceId: "Trace ID",
  },
  "zh-TW": {
    apiRuntime: "API runtime",
    backend: "Backend readiness",
    blockerWarningPassed: "阻斷 / 警告 / 通過",
    boundary: "本地 review 邊界",
    checklist: "Delivery checklist",
    configured: "已設定本地 API base URL；評審只讀取 publish-delivery route。",
    diagnostics: "診斷",
    errorFallback: "錯誤回退",
    evidenceHashCoverage: "證據 hash 覆蓋",
    fallback: "回退",
    handoffs: "handoffs",
    launchBundles: "Launch bundles",
    launchState: "Launch state",
    loading: "載入中",
    noContractWrite: "不寫合約",
    noDiagnostics: "無診斷",
    noLiveExecution: "不執行即時 provider",
    noProductionPublish: "不執行生產發布",
    noRewardCustody: "不託管獎勵",
    noRewardDistribution: "不發獎",
    noTrace: "暫無 API trace",
    notConfigured: "未設定本地 API base URL；seeded 聯合 review 保持可見，且不會送出 fetch。",
    panelTitle: "Publish Delivery Review Bridge",
    productionReady: "productionReady=false",
    repositoryEvidence: "Repository evidence",
    reviewAction: "評審本地 bridge",
    reviewing: "正在評審本地 bridge...",
    seededFallback: "Seeded fallback",
    status: "狀態",
    subtitle: "用於發布、交付、repository evidence 與 backend blockers 的緊湊前後端 MVP 簽核視圖。",
    traceId: "Trace ID",
  },
} satisfies Record<"en-US" | "zh-CN" | "zh-TW", Record<string, string>>;

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

const localeLabels = (locale: SupportedLocale) =>
  labels[locale === "zh-CN" || locale === "zh-TW" ? locale : "en-US"];

const sourceLabel = (source: PublishDeliveryReviewApiSource, locale: SupportedLocale) => {
  const copy = localeLabels(locale);
  const sourceLabels: Record<PublishDeliveryReviewApiSource, string> = {
    api_runtime: copy.apiRuntime,
    error_fallback: copy.errorFallback,
    loading: copy.loading,
    seeded_fallback: copy.seededFallback,
  };

  return sourceLabels[source];
};

const statusLabel = (status: PublishDeliveryReviewApiStatus, locale: SupportedLocale) => {
  const copy = localeLabels(locale);
  const statusLabels: Record<PublishDeliveryReviewApiStatus, string> = {
    blocked: "Blocked",
    error: "Error",
    fallback: copy.fallback,
    loading: copy.loading,
    ready: "Ready",
    warning: "Warning",
  };

  return statusLabels[status];
};

const badgeState = (status: PublishDeliveryReviewApiStatus): PublishDeliveryBadgeState =>
  status === "ready" ? "ready" : status === "blocked" || status === "error" ? "blocker" : "warning";

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const sanitizePanelDiagnosticText = (value: unknown) =>
  sanitizePublishDeliveryReviewApiText(value)
    .replace(
      /\b(redacted bearer credential|redacted credential|password=redacted)\s*=\s*[^&\s"'<>]+/gi,
      "$1",
    )
    .replace(/\/Users\/[^"'\s<>]+/gi, "redacted local path");

export function PublishDeliveryReviewPanel({
  apiConfigured,
  locale,
  onReview,
  reviewInFlight,
  state,
}: PublishDeliveryReviewPanelProps) {
  const copy = localeLabels(locale);
  const { review } = state;
  const diagnostics = [
    ...state.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      message: getLocalizedText(diagnostic.message, locale),
      severity: diagnostic.severity,
    })),
    ...review.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      message: getLocalizedText(diagnostic.message, locale),
      severity: diagnostic.severity,
    })),
  ];

  return (
    <article aria-label={copy.panelTitle} style={panelStyle}>
      <div style={headingRowStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={statLabelStyle}>{copy.status}</p>
          <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
            {copy.panelTitle}
          </h3>
          <p style={bodyTextStyle}>{copy.subtitle}</p>
          <p style={{ ...bodyTextStyle, marginTop: 4 }}>
            {apiConfigured ? copy.configured : copy.notConfigured}
          </p>
        </div>
        <span style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
          <PublishStateBadge label={sourceLabel(state.source, locale)} state={badgeState(state.status)} />
          <PublishStateBadge label={statusLabel(state.status, locale)} state={badgeState(state.status)} />
        </span>
      </div>

      <div style={gridStyle}>
        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.traceId}</p>
          <p style={{ ...statValueStyle, fontSize: 15, ...wrapTextStyle }}>
            {state.traceId ?? review.traceId ?? copy.noTrace}
          </p>
          <p style={bodyTextStyle}>x-campaign-os-trace-id</p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.launchState}</p>
          <p style={{ ...statValueStyle, fontSize: 18 }}>{review.launchState}</p>
          <p style={bodyTextStyle}>{review.ready ? "ready=true" : "ready=false"}</p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.blockerWarningPassed}</p>
          <p style={{ ...statValueStyle, fontSize: 18 }}>
            {review.summary.blockerCount} / {review.summary.warningCount} / {review.summary.passedCount}
          </p>
          <p style={bodyTextStyle}>{getLocalizedText(review.summary.topNextAction, locale)}</p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.checklist}</p>
          <p style={statValueStyle}>
            {review.summary.checklistCoveredCount} / {review.summary.checklistTotalCount}
          </p>
          <p style={bodyTextStyle}>{getLocalizedText(review.deliveryChecklist.topNextAction, locale)}</p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.launchBundles}</p>
          <p style={statValueStyle}>{review.summary.launchBundleCount}</p>
          <p style={bodyTextStyle}>
            {review.summary.handoffReviewRequiredCount} {copy.handoffs}
          </p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.repositoryEvidence}</p>
          <p style={statValueStyle}>{review.summary.repositoryEvidenceCount}</p>
          <p style={bodyTextStyle}>
            {copy.evidenceHashCoverage}: {formatPercent(review.summary.exportEvidenceHashCoverage)}
          </p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.backend}</p>
          <p style={{ ...statValueStyle, fontSize: 18 }}>{copy.productionReady}</p>
          <p style={bodyTextStyle}>
            {review.summary.productionBlockerCount} blockers / {review.backendRuntime.status}
          </p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.diagnostics}</p>
          <p style={statValueStyle}>{diagnostics.length}</p>
          <p style={bodyTextStyle}>{diagnostics.length ? copy.diagnostics : copy.noDiagnostics}</p>
        </article>
      </div>

      <button
        disabled={reviewInFlight}
        onClick={onReview}
        style={{
          ...actionButtonStyle,
          cursor: reviewInFlight ? "wait" : "pointer",
          opacity: reviewInFlight ? 0.72 : 1,
        }}
        type="button"
      >
        {reviewInFlight ? copy.reviewing : copy.reviewAction}
      </button>

      <ul style={compactListStyle}>
        {[
          copy.noProductionPublish,
          copy.noLiveExecution,
          copy.noContractWrite,
          copy.noRewardCustody,
          copy.noRewardDistribution,
        ].map((item) => (
          <li key={item} style={chipStyle}>
            {item}
          </li>
        ))}
      </ul>

      {diagnostics.length > 0 && (
        <div aria-label={copy.diagnostics} style={{ display: "grid", gap: 8 }}>
          <p style={statLabelStyle}>{copy.diagnostics}</p>
          {diagnostics.slice(0, 4).map((diagnostic) => (
            <p
              key={`${diagnostic.code}-${diagnostic.severity}-${diagnostic.message}`}
              style={{
                ...boundaryStyle,
                color: diagnostic.severity === "error" ? "#991b1b" : "#9a3412",
              }}
            >
              {diagnostic.code}: {sanitizePanelDiagnosticText(diagnostic.message)}
            </p>
          ))}
        </div>
      )}

      <p style={boundaryStyle}>
        {copy.boundary}: {getLocalizedText(state.boundary, locale)}
      </p>
    </article>
  );
}
