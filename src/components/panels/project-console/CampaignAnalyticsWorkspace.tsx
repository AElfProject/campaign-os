import { RefreshCw } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type {
  CampaignAnalyticsApiFailure,
  CampaignAnalyticsApiResult,
  CampaignAnalyticsSurface,
} from "../../../api/campaignAnalyticsApiBridge";
import { getLocalizedText } from "../../../domain";
import type {
  CampaignAnalyticsCompletionBreakdown,
  CampaignAnalyticsMetric,
  CampaignAnalyticsReviewBreakdown,
  CampaignAnalyticsSnapshot,
  CampaignAnalyticsUnavailableReason,
  CampaignAnalyticsUnit,
} from "../../../domain/campaignAnalytics";
import type { SupportedLocale } from "../../../domain/types";

export type CampaignAnalyticsWorkspaceIdleReason =
  | "campaign_required"
  | "inactive"
  | "reconnect_required"
  | "session_required";

export interface CampaignAnalyticsWorkspaceRequest {
  readonly campaignId: string;
  readonly signal: AbortSignal;
}

export type CampaignAnalyticsWorkspaceLoader = (
  request: CampaignAnalyticsWorkspaceRequest,
) => Promise<CampaignAnalyticsApiResult>;

const normalizeRequestIdentityPart = (value: string): string | null => {
  const normalized = value.trim();
  return normalized.length > 0
    && normalized.length <= 256
    && !/[\u0000-\u001f\u007f-\u009f]/u.test(normalized)
    ? normalized
    : null;
};

export const createCampaignAnalyticsRequestIdentity = (
  surface: CampaignAnalyticsSurface,
  campaignId: string | null,
  sessionEpoch: string | null,
): string | null => {
  if (!campaignId || !sessionEpoch) {
    return null;
  }

  const parts = [surface, campaignId, sessionEpoch]
    .map(normalizeRequestIdentityPart);
  return parts.every((part): part is string => part !== null)
    ? parts.map((part) => `${part.length}:${part}`).join("|")
    : null;
};

export interface CampaignAnalyticsWorkspaceCopy {
  readonly accountTypeBreakdown: string;
  readonly asOf: string;
  readonly campaignRequired: string;
  readonly completionBreakdown: string;
  readonly completionLabels: Readonly<Record<keyof CampaignAnalyticsCompletionBreakdown, string>>;
  readonly empty: string;
  readonly emptyDetail: string;
  readonly error: string;
  readonly errorCode: string;
  readonly errorDetail: string;
  readonly inactive: string;
  readonly loading: string;
  readonly loadingAction: string;
  readonly localeBreakdown: string;
  readonly metrics: string;
  readonly noBreakdown: string;
  readonly nonRetryable: string;
  readonly partial: string;
  readonly partialDetail: string;
  readonly ratioDetail: string;
  readonly ready: string;
  readonly reconnectRequired: string;
  readonly refreshAction: string;
  readonly retryAction: string;
  readonly retryable: string;
  readonly reviewBreakdown: string;
  readonly reviewLabels: Readonly<Record<keyof CampaignAnalyticsReviewBreakdown, string>>;
  readonly sessionRequired: string;
  readonly taskActivity: string;
  readonly taskBreakdown: string;
  readonly taskOptional: string;
  readonly taskRate: string;
  readonly taskRequired: string;
  readonly taskTruncated: string;
  readonly taskVerified: string;
  readonly title: string;
  readonly traceId: string;
  readonly traceUnavailable: string;
  readonly unavailable: string;
  readonly unavailableReasons: Readonly<Record<CampaignAnalyticsUnavailableReason, string>>;
  readonly units: Readonly<Record<CampaignAnalyticsUnit, string>>;
}

export interface CampaignAnalyticsWorkspaceProps {
  readonly active: boolean;
  readonly campaignId: string | null;
  readonly copy: CampaignAnalyticsWorkspaceCopy;
  readonly idleReason: CampaignAnalyticsWorkspaceIdleReason;
  readonly loader: CampaignAnalyticsWorkspaceLoader;
  readonly locale: SupportedLocale;
  readonly requestIdentity: string | null;
}

interface RequestContext {
  readonly campaignId: string;
  readonly loader: CampaignAnalyticsWorkspaceLoader;
  readonly requestIdentity: string;
}

interface IdleState {
  readonly kind: "idle";
  readonly reason: CampaignAnalyticsWorkspaceIdleReason;
}

interface LoadingState extends RequestContext {
  readonly kind: "loading";
  readonly snapshot?: CampaignAnalyticsSnapshot;
}

interface SnapshotState extends RequestContext {
  readonly kind: "empty" | "partial" | "ready";
  readonly snapshot: CampaignAnalyticsSnapshot;
}

interface ErrorState extends RequestContext {
  readonly failure: CampaignAnalyticsApiFailure;
  readonly kind: "error";
}

type CampaignAnalyticsWorkspaceState = IdleState | LoadingState | SnapshotState | ErrorState;

interface ActiveRequest extends RequestContext {
  readonly controller: AbortController;
  readonly epoch: number;
}

interface FocusTransferTarget extends RequestContext {
  readonly epoch: number;
  readonly target: "action" | "failure";
}

const completionKeys = [
  "pending",
  "completed",
  "failed",
  "manualReview",
  "verified",
] as const satisfies readonly (keyof CampaignAnalyticsCompletionBreakdown)[];

const reviewKeys = [
  "approved",
  "rejected",
  "needsReview",
  "stale",
  "invalid",
  "unreviewed",
  "totalParticipants",
] as const satisfies readonly (keyof CampaignAnalyticsReviewBreakdown)[];

const unexpectedFailure = (): CampaignAnalyticsApiFailure => ({
  code: "CAMPAIGN_ANALYTICS_BRIDGE_REQUEST_FAILED",
  ok: false,
  operation: "request",
  retryable: true,
});

const idleMessage = (
  reason: CampaignAnalyticsWorkspaceIdleReason,
  copy: CampaignAnalyticsWorkspaceCopy,
): string => {
  if (reason === "campaign_required") {
    return copy.campaignRequired;
  }
  if (reason === "reconnect_required") {
    return copy.reconnectRequired;
  }
  if (reason === "session_required") {
    return copy.sessionRequired;
  }
  return copy.inactive;
};

const numberFormatter = (locale: SupportedLocale) => new Intl.NumberFormat(locale, {
  maximumFractionDigits: 2,
});

const percentFormatter = (locale: SupportedLocale) => new Intl.NumberFormat(locale, {
  maximumFractionDigits: 1,
  style: "percent",
});

const formatMetricValue = (
  metric: Extract<CampaignAnalyticsMetric, { availability: "available" }>,
  locale: SupportedLocale,
): string => metric.definition.unit === "ratio"
  ? percentFormatter(locale).format(metric.value)
  : numberFormatter(locale).format(metric.value);

const stateMatchesContext = (
  state: CampaignAnalyticsWorkspaceState,
  context: RequestContext,
): state is LoadingState | SnapshotState | ErrorState => state.kind !== "idle"
  && state.campaignId === context.campaignId
  && state.requestIdentity === context.requestIdentity
  && state.loader === context.loader;

const snapshotFromState = (
  state: CampaignAnalyticsWorkspaceState,
): CampaignAnalyticsSnapshot | null => state.kind === "empty"
  || state.kind === "partial"
  || state.kind === "ready"
  ? state.snapshot
  : state.kind === "loading"
    ? state.snapshot ?? null
    : null;

const completionRows = (
  snapshotValue: CampaignAnalyticsSnapshot,
  copy: CampaignAnalyticsWorkspaceCopy,
) => completionKeys.map((key) => ({
  id: key,
  label: copy.completionLabels[key],
  value: snapshotValue.completionBreakdown[key],
}));

const reviewRows = (
  snapshotValue: CampaignAnalyticsSnapshot,
  copy: CampaignAnalyticsWorkspaceCopy,
) => reviewKeys.map((key) => ({
  id: key,
  label: copy.reviewLabels[key],
  value: snapshotValue.reviewBreakdown[key],
}));

export const CampaignAnalyticsWorkspace = ({
  active,
  campaignId,
  copy,
  idleReason,
  loader,
  locale,
  requestIdentity,
}: CampaignAnalyticsWorkspaceProps) => {
  const headingId = useId();
  const [refreshEpoch, setRefreshEpoch] = useState(0);
  const [state, setState] = useState<CampaignAnalyticsWorkspaceState>({
    kind: "idle",
    reason: idleReason,
  });
  const actionRef = useRef<HTMLButtonElement | null>(null);
  const epochRef = useRef(0);
  const failureRef = useRef<HTMLDivElement | null>(null);
  const focusTransferRequestedRef = useRef(false);
  const focusTransferTargetRef = useRef<FocusTransferTarget | null>(null);
  const activeRequestRef = useRef<ActiveRequest | null>(null);
  const context = active && campaignId && requestIdentity
    ? { campaignId, loader, requestIdentity }
    : null;

  useEffect(() => {
    const epoch = epochRef.current + 1;
    epochRef.current = epoch;

    if (!active || !campaignId || !requestIdentity) {
      activeRequestRef.current = null;
      focusTransferRequestedRef.current = false;
      focusTransferTargetRef.current = null;
      setState({ kind: "idle", reason: idleReason });
      return () => {
        if (epochRef.current === epoch) {
          epochRef.current += 1;
        }
      };
    }

    const controller = new AbortController();
    const request: ActiveRequest = {
      campaignId,
      controller,
      epoch,
      loader,
      requestIdentity,
    };
    activeRequestRef.current = request;
    const restoreFocus = focusTransferRequestedRef.current;
    focusTransferRequestedRef.current = false;
    focusTransferTargetRef.current = null;
    setState((currentState) => {
      const previousSnapshot = stateMatchesContext(currentState, request)
        ? snapshotFromState(currentState)
        : null;
      return previousSnapshot
        ? { campaignId, kind: "loading", loader, requestIdentity, snapshot: previousSnapshot }
        : { campaignId, kind: "loading", loader, requestIdentity };
    });

    const ownsCurrentRequest = () => activeRequestRef.current === request
      && epochRef.current === epoch
      && !controller.signal.aborted;
    const queueFocusTransfer = (target: FocusTransferTarget["target"]) => {
      const activeElement = document.activeElement;
      if (
        restoreFocus
        && (activeElement === actionRef.current || activeElement === document.body)
      ) {
        focusTransferTargetRef.current = {
          campaignId,
          epoch,
          loader,
          requestIdentity,
          target,
        };
      }
    };

    void Promise.resolve()
      .then(() => ownsCurrentRequest()
        ? loader({ campaignId, signal: controller.signal })
        : null)
      .then((result) => {
        if (!result || !ownsCurrentRequest()) {
          return;
        }
        if (result.ok) {
          queueFocusTransfer("action");
          setState({
            campaignId,
            kind: result.data.status,
            loader,
            requestIdentity,
            snapshot: result.data,
          });
          return;
        }
        queueFocusTransfer(result.retryable ? "action" : "failure");
        setState({ campaignId, failure: result, kind: "error", loader, requestIdentity });
      })
      .catch(() => {
        if (ownsCurrentRequest()) {
          queueFocusTransfer("action");
          setState({
            campaignId,
            failure: unexpectedFailure(),
            kind: "error",
            loader,
            requestIdentity,
          });
        }
      });

    return () => {
      if (activeRequestRef.current === request) {
        epochRef.current += 1;
        activeRequestRef.current = null;
      }
      if (!controller.signal.aborted) {
        controller.abort();
      }
    };
  }, [active, campaignId, idleReason, loader, refreshEpoch, requestIdentity]);

  const visibleState: CampaignAnalyticsWorkspaceState = context
    ? stateMatchesContext(state, context)
      ? state
      : { ...context, kind: "loading" }
    : { kind: "idle", reason: idleReason };
  const requestAvailable = context !== null;
  const actionLabel = visibleState.kind === "loading"
    ? copy.loadingAction
    : visibleState.kind === "error"
      ? copy.retryAction
      : copy.refreshAction;
  const showAction = requestAvailable
    && (visibleState.kind !== "error" || visibleState.failure.retryable);
  const snapshotValue = snapshotFromState(visibleState);

  useEffect(() => {
    const target = focusTransferTargetRef.current;
    if (!target || visibleState.kind === "loading") {
      return;
    }
    const targetMatchesContext = context
      && target.campaignId === context.campaignId
      && target.requestIdentity === context.requestIdentity
      && target.loader === context.loader
      && target.epoch === epochRef.current;
    const activeElement = document.activeElement;
    const focusCanBeRestored = activeElement === actionRef.current
      || activeElement === document.body;
    focusTransferTargetRef.current = null;
    if (!targetMatchesContext || !focusCanBeRestored) {
      return;
    }
    if (target.target === "failure") {
      failureRef.current?.focus();
      return;
    }
    actionRef.current?.focus();
  }, [visibleState]);

  return (
    <section
      aria-labelledby={headingId}
      className="campaign-analytics-workspace"
      data-state={visibleState.kind}
    >
      <header className="campaign-analytics-workspace__header">
        <div className="campaign-analytics-workspace__heading">
          <h3 id={headingId}>{copy.title}</h3>
          {snapshotValue ? (
            <p className="campaign-analytics-workspace__freshness">
              <span>{copy.asOf}</span>
              <time dateTime={snapshotValue.asOf}>{snapshotValue.asOf}</time>
            </p>
          ) : null}
        </div>
        <div className="campaign-analytics-workspace__action-slot">
          {showAction ? (
            <button
              aria-disabled={visibleState.kind === "loading"}
              aria-label={actionLabel}
              className="campaign-analytics-workspace__action"
              onClick={(event) => {
                if (visibleState.kind === "loading") {
                  return;
                }
                focusTransferRequestedRef.current = document.activeElement === event.currentTarget;
                setRefreshEpoch((value) => value + 1);
              }}
              ref={actionRef}
              type="button"
            >
              <RefreshCw aria-hidden="true" size={16} />
              <span>{actionLabel}</span>
            </button>
          ) : null}
        </div>
      </header>

      {visibleState.kind === "error" ? (
        <div
          aria-live="polite"
          className="campaign-analytics-workspace__status"
          ref={failureRef}
          role="alert"
          tabIndex={-1}
        >
          <strong>{copy.error}</strong>
          <span>{copy.errorDetail}</span>
          <dl className="campaign-analytics-workspace__diagnostic">
            <div>
              <dt>{copy.errorCode}</dt>
              <dd>{visibleState.failure.code}</dd>
            </div>
            <div>
              <dt>{copy.traceId}</dt>
              <dd>{visibleState.failure.traceId ?? copy.traceUnavailable}</dd>
            </div>
          </dl>
          <span>{visibleState.failure.retryable ? copy.retryable : copy.nonRetryable}</span>
        </div>
      ) : (
        <p aria-live="polite" className="campaign-analytics-workspace__status" role="status">
          {visibleState.kind === "idle"
            ? idleMessage(visibleState.reason, copy)
            : visibleState.kind === "loading"
              ? copy.loading
              : visibleState.kind === "empty"
                ? copy.empty
                : visibleState.kind === "partial"
                  ? copy.partial
                  : copy.ready}
        </p>
      )}

      {snapshotValue?.status === "empty" ? (
        <p className="campaign-analytics-workspace__state-detail">{copy.emptyDetail}</p>
      ) : snapshotValue?.status === "partial" ? (
        <p className="campaign-analytics-workspace__state-detail">{copy.partialDetail}</p>
      ) : null}

      {snapshotValue ? (
        <>
          <dl aria-label={copy.metrics} className="campaign-analytics-workspace__metrics">
            {snapshotValue.metrics.map((metric) => {
              const label = getLocalizedText(metric.definition.label, locale);
              return (
                <div
                  aria-label={label}
                  className="campaign-analytics-workspace__metric"
                  key={metric.definition.id}
                  role="group"
                >
                  <dt className="campaign-analytics-workspace__metric-definition">
                    <strong className="campaign-analytics-workspace__wrap">{label}</strong>
                    <span className="campaign-analytics-workspace__wrap">
                      {getLocalizedText(metric.definition.description, locale)}
                    </span>
                  </dt>
                  <dd className="campaign-analytics-workspace__metric-value">
                    {metric.availability === "available" ? (
                      <>
                        <span>
                          <data value={metric.value}>{formatMetricValue(metric, locale)}</data>
                          <small>{copy.units[metric.definition.unit]}</small>
                        </span>
                        {metric.definition.unit === "ratio"
                          && metric.numerator !== undefined
                          && metric.denominator !== undefined ? (
                            <span aria-label={copy.ratioDetail} className="campaign-analytics-workspace__ratio-detail">
                              {numberFormatter(locale).format(metric.numerator)} / {numberFormatter(locale).format(metric.denominator)}
                            </span>
                          ) : null}
                      </>
                    ) : (
                      <>
                        <strong className="campaign-analytics-workspace__unavailable">{copy.unavailable}</strong>
                        <span className="campaign-analytics-workspace__wrap">
                          {copy.unavailableReasons[metric.reasonCode]}
                        </span>
                      </>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>

          <div className="campaign-analytics-workspace__breakdowns">
            <section aria-label={copy.taskBreakdown} className="campaign-analytics-workspace__breakdown">
              <h4>{copy.taskBreakdown}</h4>
              {snapshotValue.taskBreakdown.rows.length === 0 ? (
                <p>{copy.noBreakdown}</p>
              ) : (
                <ul className="campaign-analytics-workspace__task-list">
                  {snapshotValue.taskBreakdown.rows.map((row) => (
                    <li className="campaign-analytics-workspace__task-row" key={row.taskId}>
                      <span className="campaign-analytics-workspace__task-identity">
                        <strong className="campaign-analytics-workspace__wrap">{row.templateCode}</strong>
                        <span className="campaign-analytics-workspace__wrap">{row.taskId}</span>
                        <small>{row.required ? copy.taskRequired : copy.taskOptional}</small>
                      </span>
                      <dl className="campaign-analytics-workspace__inline-facts">
                        <div><dt>{copy.taskActivity}</dt><dd>{numberFormatter(locale).format(row.activityParticipants)}</dd></div>
                        <div><dt>{copy.taskVerified}</dt><dd>{numberFormatter(locale).format(row.verifiedParticipants)}</dd></div>
                        <div>
                          <dt>{copy.taskRate}</dt>
                          <dd className="campaign-analytics-workspace__task-rate">
                            <span>{percentFormatter(locale).format(row.completionRate)}</span>
                            <span
                              aria-label={copy.ratioDetail}
                              className="campaign-analytics-workspace__ratio-detail"
                            >
                              {numberFormatter(locale).format(row.verifiedParticipants)} / {numberFormatter(locale).format(row.participantDenominator)}
                            </span>
                          </dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ul>
              )}
              {snapshotValue.taskBreakdown.truncated ? (
                <p className="campaign-analytics-workspace__notice">{copy.taskTruncated}</p>
              ) : null}
            </section>

            <section aria-label={copy.completionBreakdown} className="campaign-analytics-workspace__breakdown">
              <h4>{copy.completionBreakdown}</h4>
              <dl className="campaign-analytics-workspace__fact-list">
                {completionRows(snapshotValue, copy).map((row) => (
                  <div key={row.id}><dt>{row.label}</dt><dd>{numberFormatter(locale).format(row.value)}</dd></div>
                ))}
              </dl>
            </section>

            <section aria-label={copy.reviewBreakdown} className="campaign-analytics-workspace__breakdown">
              <h4>{copy.reviewBreakdown}</h4>
              <dl className="campaign-analytics-workspace__fact-list">
                {reviewRows(snapshotValue, copy).map((row) => (
                  <div key={row.id}><dt>{row.label}</dt><dd>{numberFormatter(locale).format(row.value)}</dd></div>
                ))}
              </dl>
            </section>

            <section aria-label={copy.accountTypeBreakdown} className="campaign-analytics-workspace__breakdown">
              <h4>{copy.accountTypeBreakdown}</h4>
              <dl className="campaign-analytics-workspace__fact-list">
                {snapshotValue.accountTypeBreakdown.map((row) => (
                  <div key={row.id}>
                    <dt className="campaign-analytics-workspace__wrap">{row.id}</dt>
                    <dd>{numberFormatter(locale).format(row.count)} / {percentFormatter(locale).format(row.percentage)}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section aria-label={copy.localeBreakdown} className="campaign-analytics-workspace__breakdown">
              <h4>{copy.localeBreakdown}</h4>
              <dl className="campaign-analytics-workspace__fact-list">
                {snapshotValue.localeBreakdown.map((row) => (
                  <div key={row.id}>
                    <dt className="campaign-analytics-workspace__wrap">{row.id}</dt>
                    <dd>{numberFormatter(locale).format(row.count)} / {percentFormatter(locale).format(row.percentage)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
};
