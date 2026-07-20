import "@testing-library/jest-dom/vitest";
import { act } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  CampaignAnalyticsApiFailure,
  CampaignAnalyticsApiResult,
} from "../../../api/campaignAnalyticsApiBridge";
import {
  CAMPAIGN_ANALYTICS_TASK_ROW_LIMIT,
  CAMPAIGN_ANALYTICS_VERSION,
  getCampaignAnalyticsMetricDefinition,
  type CampaignAnalyticsMetric,
  type CampaignAnalyticsMetricId,
  type CampaignAnalyticsSnapshot,
  type CampaignAnalyticsSnapshotStatus,
} from "../../../domain/campaignAnalytics";
import {
  CampaignAnalyticsWorkspace,
  type CampaignAnalyticsWorkspaceCopy,
  type CampaignAnalyticsWorkspaceLoader,
} from "./CampaignAnalyticsWorkspace";

const copy: CampaignAnalyticsWorkspaceCopy = {
  accountTypeBreakdown: "Account type breakdown",
  asOf: "As of",
  campaignRequired: "Select a Campaign to load durable analytics.",
  completionBreakdown: "Completion breakdown",
  completionLabels: {
    completed: "Completed",
    failed: "Failed",
    manualReview: "Manual review",
    pending: "Pending",
    verified: "Verified",
  },
  empty: "No durable activity yet",
  emptyDetail: "Durable sources are available and currently report zero activity.",
  error: "Campaign analytics unavailable",
  errorCode: "Error code",
  errorDetail: "The analytics region could not be loaded. Other Campaign workflows remain available.",
  inactive: "Analytics is inactive.",
  loading: "Loading campaign analytics",
  loadingAction: "Loading analytics",
  localeBreakdown: "Locale breakdown",
  metrics: "Campaign metrics",
  noBreakdown: "No breakdown rows",
  nonRetryable: "Reconnect or change access before retrying.",
  partial: "Partial durable analytics",
  partialDetail: "Available metrics are shown; unsupported sources remain unavailable.",
  ratioDetail: "Numerator / denominator",
  ready: "Durable analytics ready",
  reconnectRequired: "Reconnect an issued Session to load durable analytics.",
  refreshAction: "Refresh analytics",
  retryAction: "Retry analytics",
  retryable: "This request can be retried.",
  reviewBreakdown: "Review breakdown",
  reviewLabels: {
    approved: "Approved",
    invalid: "Invalid",
    needsReview: "Needs review",
    rejected: "Rejected",
    stale: "Stale",
    totalParticipants: "Total participants",
    unreviewed: "Unreviewed",
  },
  sessionRequired: "Connect an issued Session to load durable analytics.",
  taskActivity: "Activity participants",
  taskBreakdown: "Task breakdown",
  taskOptional: "Optional",
  taskRate: "Completion rate",
  taskRequired: "Required",
  taskTruncated: "Additional Task rows are not included in this bounded snapshot.",
  taskVerified: "Verified participants",
  title: "Campaign Analytics",
  traceId: "Trace ID",
  traceUnavailable: "Not available",
  unavailable: "Unavailable",
  unavailableReasons: {
    SOURCE_INTEGRITY_UNAVAILABLE: "Durable source integrity is unavailable.",
    SOURCE_NOT_COLLECTED: "This source is not collected.",
    SOURCE_OUT_OF_SCOPE: "This source is outside the current scope.",
  },
  units: {
    count: "count",
    points: "points",
    ratio: "percent",
  },
};

const availableMetric = (
  id: CampaignAnalyticsMetricId,
  value: number,
  ratio?: { denominator: number; numerator: number },
): CampaignAnalyticsMetric => ({
  availability: "available",
  definition: getCampaignAnalyticsMetricDefinition(id),
  ...(ratio ?? {}),
  value,
});

const unavailableMetric = (
  id: CampaignAnalyticsMetricId,
  reasonCode: "SOURCE_INTEGRITY_UNAVAILABLE" | "SOURCE_NOT_COLLECTED" | "SOURCE_OUT_OF_SCOPE",
): CampaignAnalyticsMetric => ({
  availability: "unavailable",
  definition: getCampaignAnalyticsMetricDefinition(id),
  reasonCode,
});

const snapshot = (
  status: CampaignAnalyticsSnapshotStatus,
  options: {
    campaignId?: string;
    metrics?: readonly CampaignAnalyticsMetric[];
    taskTruncated?: boolean;
  } = {},
): CampaignAnalyticsSnapshot => ({
  accountTypeBreakdown: [
    { count: 1, id: "AA", percentage: 1 / 3 },
    { count: 2, id: "EOA", percentage: 2 / 3 },
  ],
  asOf: "2026-07-19T02:00:00.000Z",
  campaignId: options.campaignId ?? "campaign-a",
  completionBreakdown: {
    completed: 2,
    failed: 1,
    manualReview: 1,
    pending: 3,
    verified: 1,
  },
  localeBreakdown: [
    { count: 2, id: "en-US", percentage: 2 / 3 },
    { count: 1, id: "zh-CN", percentage: 1 / 3 },
  ],
  metrics: options.metrics ?? [
    availableMetric("participants.unique", 3),
    availableMetric("completions.rate", 1 / 3, { denominator: 3, numerator: 1 }),
  ],
  reviewBreakdown: {
    approved: 1,
    invalid: 0,
    needsReview: 1,
    rejected: 0,
    stale: 0,
    totalParticipants: 3,
    unreviewed: 1,
  },
  sourceCapabilities: [],
  status,
  taskBreakdown: {
    rowLimit: CAMPAIGN_ANALYTICS_TASK_ROW_LIMIT,
    rows: [{
      activityParticipants: 3,
      completionRate: 1 / 3,
      participantDenominator: 3,
      required: true,
      taskId: "task-a",
      templateCode: "TOKEN_HOLDING",
      verifiedParticipants: 1,
    }],
    totalRows: options.taskTruncated ? 2 : 1,
    truncated: options.taskTruncated ?? false,
  },
  traceId: `trace-${options.campaignId ?? "campaign-a"}`,
  version: CAMPAIGN_ANALYTICS_VERSION,
});

const success = (data: CampaignAnalyticsSnapshot): CampaignAnalyticsApiResult => ({
  data,
  httpStatus: 200,
  ok: true,
  traceId: data.traceId,
});

const failure = (
  overrides: Partial<CampaignAnalyticsApiFailure> = {},
): CampaignAnalyticsApiFailure => ({
  code: "CAMPAIGN_ANALYTICS_UNAVAILABLE",
  ok: false,
  operation: "request",
  retryable: true,
  traceId: "trace-safe-failure",
  ...overrides,
});

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
};

const renderWorkspace = (
  loader: CampaignAnalyticsWorkspaceLoader,
  overrides: Partial<React.ComponentProps<typeof CampaignAnalyticsWorkspace>> = {},
) => render(
  <CampaignAnalyticsWorkspace
    active
    campaignId="campaign-a"
    copy={copy}
    idleReason="session_required"
    loader={loader}
    locale="en-US"
    requestIdentity="owner:campaign-a:issued-session-a"
    {...overrides}
  />,
);

describe("CampaignAnalyticsWorkspace", () => {
  it("announces loading without retaining a previous metric value", async () => {
    const pending = deferred<CampaignAnalyticsApiResult>();
    const loader = vi.fn(() => pending.promise);
    const view = renderWorkspace(loader);

    expect(screen.getByRole("heading", { name: copy.title })).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent(copy.loading);
    expect(screen.queryByText("Unique participants")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.loadingAction }))
      .toHaveAttribute("aria-disabled", "true");
    expect(loader).toHaveBeenCalledWith({
      campaignId: "campaign-a",
      signal: expect.any(AbortSignal),
    });

    view.unmount();
  });

  it("renders ready values, ratio facts, server freshness, and bounded breakdowns", async () => {
    renderWorkspace(vi.fn(async () => success(snapshot("ready", { taskTruncated: true }))));

    expect(await screen.findByRole("status")).toHaveTextContent(copy.ready);
    const participants = screen.getByRole("group", { name: "Unique participants" });
    expect(within(participants).getByText("3")).toBeInTheDocument();
    expect(within(participants).getByText(copy.units.count)).toBeInTheDocument();

    const rate = screen.getByRole("group", { name: "Verified completion rate" });
    expect(within(rate).getByText("33.3%")).toBeInTheDocument();
    expect(within(rate).getByText("1 / 3")).toHaveAccessibleName(copy.ratioDetail);

    expect(screen.getByText(copy.asOf).nextElementSibling).toHaveAttribute(
      "datetime",
      "2026-07-19T02:00:00.000Z",
    );
    const tasks = screen.getByRole("region", { name: copy.taskBreakdown });
    expect(within(tasks).getByText("TOKEN_HOLDING")).toBeInTheDocument();
    expect(within(tasks).getByText("1 / 3")).toHaveAccessibleName(copy.ratioDetail);
    expect(within(tasks).getByText(copy.taskTruncated)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: copy.completionBreakdown })).toHaveTextContent("3");
    expect(screen.getByRole("region", { name: copy.reviewBreakdown })).toHaveTextContent("Approved");
    expect(screen.getByRole("region", { name: copy.accountTypeBreakdown })).toHaveTextContent("EOA");
    expect(screen.getByRole("region", { name: copy.localeBreakdown })).toHaveTextContent("zh-CN");
  });

  it("keeps an empty workspace visible and presents available zero as zero", async () => {
    renderWorkspace(vi.fn(async () => success(snapshot("empty", {
      metrics: [availableMetric("participants.unique", 0)],
    }))));

    expect(await screen.findByRole("status")).toHaveTextContent(copy.empty);
    expect(screen.getByText(copy.emptyDetail)).toBeInTheDocument();
    const participants = screen.getByRole("group", { name: "Unique participants" });
    expect(within(participants).getByText("0")).toBeInTheDocument();
    expect(within(participants).queryByText(copy.unavailable)).not.toBeInTheDocument();
  });

  it("never formats an unavailable metric as zero or a percentage in a partial snapshot", async () => {
    renderWorkspace(vi.fn(async () => success(snapshot("partial", {
      metrics: [
        availableMetric("participants.unique", 0),
        unavailableMetric("events.page_views", "SOURCE_NOT_COLLECTED"),
      ],
    }))));

    expect(await screen.findByRole("status")).toHaveTextContent(copy.partial);
    expect(screen.getByText(copy.partialDetail)).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Unique participants" })).getByText("0"))
      .toBeInTheDocument();
    const pageViews = screen.getByRole("group", { name: "Page views" });
    expect(within(pageViews).getByText(copy.unavailable)).toBeInTheDocument();
    expect(within(pageViews).getByText(copy.unavailableReasons.SOURCE_NOT_COLLECTED))
      .toBeInTheDocument();
    expect(within(pageViews).queryByText("0")).not.toBeInTheDocument();
    expect(pageViews).not.toHaveTextContent("%");
  });

  it("shows only typed safe failure fields and preserves focus through a retry", async () => {
    const retry = deferred<CampaignAnalyticsApiResult>();
    const loader = vi
      .fn<CampaignAnalyticsWorkspaceLoader>()
      .mockResolvedValueOnce(failure())
      .mockImplementationOnce(() => retry.promise);
    renderWorkspace(loader);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(copy.errorDetail);
    expect(alert).toHaveTextContent("CAMPAIGN_ANALYTICS_UNAVAILABLE");
    expect(alert).toHaveTextContent("trace-safe-failure");
    expect(alert).toHaveTextContent(copy.retryable);
    expect(alert).not.toHaveTextContent(/stack|select \*|raw response|https?:\/\//i);

    const retryButton = screen.getByRole("button", { name: copy.retryAction });
    retryButton.focus();
    fireEvent.click(retryButton);

    const loadingButton = await screen.findByRole("button", { name: copy.loadingAction });
    expect(loadingButton).toHaveAttribute("aria-disabled", "true");
    expect(loadingButton).not.toBeDisabled();
    expect(loadingButton).toHaveFocus();

    await act(async () => {
      retry.resolve(success(snapshot("ready")));
      await retry.promise;
    });

    expect(await screen.findByRole("status")).toHaveTextContent(copy.ready);
    expect(screen.getByRole("button", { name: copy.refreshAction })).toHaveFocus();
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("keeps the last-good snapshot mounted during a same-identity refresh", async () => {
    const refresh = deferred<CampaignAnalyticsApiResult>();
    const loader = vi
      .fn<CampaignAnalyticsWorkspaceLoader>()
      .mockResolvedValueOnce(success(snapshot("ready")))
      .mockImplementationOnce(() => refresh.promise);
    renderWorkspace(loader);

    const participants = await screen.findByRole("group", { name: "Unique participants" });
    expect(within(participants).getByText("3")).toBeInTheDocument();

    const refreshButton = screen.getByRole("button", { name: copy.refreshAction });
    refreshButton.focus();
    fireEvent.click(refreshButton);

    expect(await screen.findByRole("status")).toHaveTextContent(copy.loading);
    expect(screen.getByRole("group", { name: "Unique participants" })).toHaveTextContent("3");
    expect(screen.getByRole("region", { name: copy.taskBreakdown })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.loadingAction }))
      .toHaveAttribute("aria-disabled", "true");

    await act(async () => {
      refresh.resolve(success(snapshot("ready", {
        metrics: [availableMetric("participants.unique", 5)],
      })));
      await refresh.promise;
    });

    expect(await screen.findByRole("status")).toHaveTextContent(copy.ready);
    expect(within(screen.getByRole("group", { name: "Unique participants" })).getByText("5"))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.refreshAction })).toHaveFocus();
  });

  it("moves retry focus to a non-retryable denial without falling back to the document body", async () => {
    const loader = vi
      .fn<CampaignAnalyticsWorkspaceLoader>()
      .mockResolvedValueOnce(failure())
      .mockResolvedValueOnce(failure({
        code: "AUTH_FORBIDDEN",
        retryable: false,
        traceId: "trace-safe-retry-denial",
      }));
    renderWorkspace(loader);

    const retryButton = await screen.findByRole("button", { name: copy.retryAction });
    retryButton.focus();
    fireEvent.click(retryButton);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("AUTH_FORBIDDEN"));
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("trace-safe-retry-denial");
    expect(alert).toHaveFocus();
    expect(document.body).not.toHaveFocus();
    expect(screen.queryByRole("button", { name: copy.retryAction })).not.toBeInTheDocument();
  });

  it("does not steal focus when another workflow is focused during a retry", async () => {
    const retry = deferred<CampaignAnalyticsApiResult>();
    const loader = vi
      .fn<CampaignAnalyticsWorkspaceLoader>()
      .mockResolvedValueOnce(failure())
      .mockImplementationOnce(() => retry.promise);
    render(
      <>
        <CampaignAnalyticsWorkspace
          active
          campaignId="campaign-a"
          copy={copy}
          idleReason="session_required"
          loader={loader}
          locale="en-US"
          requestIdentity="owner:campaign-a:issued-session-a"
        />
        <button type="button">Continue another workflow</button>
      </>,
    );

    const retryButton = await screen.findByRole("button", { name: copy.retryAction });
    retryButton.focus();
    fireEvent.click(retryButton);
    await screen.findByRole("button", { name: copy.loadingAction });

    const otherWorkflow = screen.getByRole("button", { name: "Continue another workflow" });
    otherWorkflow.focus();
    await act(async () => {
      retry.resolve(success(snapshot("ready")));
      await retry.promise;
    });

    expect(await screen.findByRole("status")).toHaveTextContent(copy.ready);
    expect(otherWorkflow).toHaveFocus();
  });

  it("distinguishes a non-retryable denial and does not expose prior totals", async () => {
    const first = vi
      .fn<CampaignAnalyticsWorkspaceLoader>()
      .mockResolvedValueOnce(success(snapshot("ready", {
        metrics: [availableMetric("participants.unique", 41)],
      })))
      .mockResolvedValueOnce(failure({
        code: "AUTH_FORBIDDEN",
        retryable: false,
        traceId: "trace-safe-denial",
      }));
    const view = renderWorkspace(first);

    expect(await screen.findByText("41")).toBeInTheDocument();
    view.rerender(
      <CampaignAnalyticsWorkspace
        active
        campaignId="campaign-b"
        copy={copy}
        idleReason="session_required"
        loader={first}
        locale="en-US"
        requestIdentity="admin:campaign-b:issued-session-a"
      />,
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("AUTH_FORBIDDEN");
    expect(alert).toHaveTextContent(copy.nonRetryable);
    expect(screen.queryByText("41")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: copy.retryAction })).not.toBeInTheDocument();
  });

  it("isolates a late failure across Campaign epochs", async () => {
    const campaignA = deferred<CampaignAnalyticsApiResult>();
    const campaignB = deferred<CampaignAnalyticsApiResult>();
    const calls: Array<{ campaignId: string; signal: AbortSignal }> = [];
    const loader = vi.fn<CampaignAnalyticsWorkspaceLoader>((request) => {
      calls.push(request);
      return request.campaignId === "campaign-a" ? campaignA.promise : campaignB.promise;
    });
    const view = renderWorkspace(loader);

    await waitFor(() => expect(loader).toHaveBeenCalledTimes(1));
    view.rerender(
      <CampaignAnalyticsWorkspace
        active
        campaignId="campaign-b"
        copy={copy}
        idleReason="session_required"
        loader={loader}
        locale="en-US"
        requestIdentity="owner:campaign-b:issued-session-b"
      />,
    );

    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    expect(calls[0].signal.aborted).toBe(true);
    await act(async () => {
      campaignB.resolve(success(snapshot("ready", {
        campaignId: "campaign-b",
        metrics: [availableMetric("participants.unique", 22)],
      })));
      await campaignB.promise;
    });
    expect(await screen.findByText("22")).toBeInTheDocument();

    await act(async () => {
      campaignA.resolve(failure({ traceId: "trace-late-campaign-a" }));
      await campaignA.promise;
    });
    expect(screen.getByText("22")).toBeInTheDocument();
    expect(screen.queryByText("trace-late-campaign-a")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("isolates a late success when the issued Session changes for the same Campaign", async () => {
    const sessionA = deferred<CampaignAnalyticsApiResult>();
    const sessionB = deferred<CampaignAnalyticsApiResult>();
    const calls: Array<{ campaignId: string; signal: AbortSignal }> = [];
    const loader = vi.fn<CampaignAnalyticsWorkspaceLoader>((request) => {
      calls.push(request);
      return calls.length === 1 ? sessionA.promise : sessionB.promise;
    });
    const view = renderWorkspace(loader);

    await waitFor(() => expect(loader).toHaveBeenCalledTimes(1));
    view.rerender(
      <CampaignAnalyticsWorkspace
        active
        campaignId="campaign-a"
        copy={copy}
        idleReason="session_required"
        loader={loader}
        locale="en-US"
        requestIdentity="owner:campaign-a:issued-session-b"
      />,
    );

    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    expect(calls[0].signal.aborted).toBe(true);
    await act(async () => {
      sessionB.resolve(success(snapshot("ready", {
        metrics: [availableMetric("participants.unique", 22)],
      })));
      await sessionB.promise;
    });
    expect(await screen.findByText("22")).toBeInTheDocument();

    await act(async () => {
      sessionA.resolve(success(snapshot("ready", {
        metrics: [availableMetric("participants.unique", 91)],
      })));
      await sessionA.promise;
    });
    expect(screen.getByText("22")).toBeInTheDocument();
    expect(screen.queryByText("91")).not.toBeInTheDocument();
  });

  it("does not let a superseded retry commit into a new Session epoch", async () => {
    const retry = deferred<CampaignAnalyticsApiResult>();
    const current = deferred<CampaignAnalyticsApiResult>();
    const calls: Array<{ campaignId: string; signal: AbortSignal }> = [];
    const loader = vi
      .fn<CampaignAnalyticsWorkspaceLoader>()
      .mockResolvedValueOnce(failure())
      .mockImplementationOnce((request) => {
        calls.push(request);
        return retry.promise;
      })
      .mockImplementationOnce((request) => {
        calls.push(request);
        return current.promise;
      });
    const view = renderWorkspace(loader);

    fireEvent.click(await screen.findByRole("button", { name: copy.retryAction }));
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    view.rerender(
      <CampaignAnalyticsWorkspace
        active
        campaignId="campaign-a"
        copy={copy}
        idleReason="session_required"
        loader={loader}
        locale="en-US"
        requestIdentity="owner:campaign-a:issued-session-b"
      />,
    );

    await waitFor(() => expect(loader).toHaveBeenCalledTimes(3));
    expect(calls[0].signal.aborted).toBe(true);
    await act(async () => {
      current.resolve(success(snapshot("ready", {
        metrics: [availableMetric("participants.unique", 17)],
      })));
      await current.promise;
    });
    expect(await screen.findByText("17")).toBeInTheDocument();

    await act(async () => {
      retry.resolve(failure({ traceId: "trace-superseded-retry" }));
      await retry.promise;
    });
    expect(screen.getByText("17")).toBeInTheDocument();
    expect(screen.queryByText("trace-superseded-retry")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("aborts on workspace exit and unmount without a stale commit or React warning", async () => {
    const pending = deferred<CampaignAnalyticsApiResult>();
    let signal: AbortSignal | undefined;
    const loader = vi.fn<CampaignAnalyticsWorkspaceLoader>((request) => {
      signal = request.signal;
      return pending.promise;
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const view = renderWorkspace(loader);

    await waitFor(() => expect(signal).toBeDefined());
    view.rerender(
      <CampaignAnalyticsWorkspace
        active={false}
        campaignId="campaign-a"
        copy={copy}
        idleReason="inactive"
        loader={loader}
        locale="en-US"
        requestIdentity={null}
      />,
    );
    expect(signal?.aborted).toBe(true);
    expect(await screen.findByRole("status")).toHaveTextContent(copy.inactive);

    await act(async () => {
      pending.resolve(success(snapshot("ready", {
        metrics: [availableMetric("participants.unique", 99)],
      })));
      await pending.promise;
    });
    expect(screen.queryByText("99")).not.toBeInTheDocument();

    view.unmount();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("aborts a pending request on unmount without a late state update", async () => {
    const pending = deferred<CampaignAnalyticsApiResult>();
    let signal: AbortSignal | undefined;
    const loader = vi.fn<CampaignAnalyticsWorkspaceLoader>((request) => {
      signal = request.signal;
      return pending.promise;
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const view = renderWorkspace(loader);

    await waitFor(() => expect(signal).toBeDefined());
    view.unmount();
    expect(signal?.aborted).toBe(true);

    await act(async () => {
      pending.resolve(success(snapshot("ready", {
        metrics: [availableMetric("participants.unique", 73)],
      })));
      await pending.promise;
    });
    expect(screen.queryByText("73")).not.toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
