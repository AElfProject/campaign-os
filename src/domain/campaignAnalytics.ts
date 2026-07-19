import type { LocalizedText } from "./types";

export const CAMPAIGN_ANALYTICS_VERSION = "campaign-analytics-v1" as const;
export const CAMPAIGN_ANALYTICS_DICTIONARY_VERSION = "metric-dictionary-v1" as const;
export const CAMPAIGN_ANALYTICS_TASK_ROW_LIMIT = 50 as const;
export const CAMPAIGN_ANALYTICS_MAX_SERIALIZED_BYTES = 512 * 1024;

export type CampaignAnalyticsVersion = typeof CAMPAIGN_ANALYTICS_VERSION;
export type CampaignAnalyticsDictionaryVersion = typeof CAMPAIGN_ANALYTICS_DICTIONARY_VERSION;
export type CampaignAnalyticsSnapshotStatus = "ready" | "empty" | "partial";
export type CampaignAnalyticsAvailability = "available" | "unavailable";
export type CampaignAnalyticsUnit = "count" | "points" | "ratio";
export type CampaignAnalyticsTimeBoundary = "snapshot_as_of";
export type CampaignAnalyticsUnavailableReason =
  | "SOURCE_NOT_COLLECTED"
  | "SOURCE_OUT_OF_SCOPE"
  | "SOURCE_INTEGRITY_UNAVAILABLE";
export type CampaignAnalyticsSourceUnavailableReason = Exclude<
  CampaignAnalyticsUnavailableReason,
  "SOURCE_INTEGRITY_UNAVAILABLE"
>;
export type CampaignAnalyticsDenominatorId =
  | "participant_task_opportunities"
  | "referral_bindings"
  | "participants";

export type CampaignAnalyticsMetricId =
  | "participants.unique"
  | "tasks.total"
  | "tasks.with_activity"
  | "completions.verified"
  | "completions.rate"
  | "points.awarded"
  | "points.participants_with_points"
  | "points.participants_without_points"
  | "referrals.total"
  | "referrals.qualified"
  | "referrals.conversion"
  | "risk.flagged_participants"
  | "risk.flagged_rate"
  | "events.page_views"
  | "events.impressions"
  | "events.clicks"
  | "events.wallet_connects"
  | "retention.day_7"
  | "retention.day_30"
  | "conversion.external_product";

export type CampaignAnalyticsSourceId =
  | "campaign"
  | "participant"
  | "task_completion_evidence"
  | "admin_review"
  | "points_projection"
  | "referral_binding"
  | "browser_events"
  | "retention_events"
  | "external_product_events";

export interface CampaignAnalyticsMetricDefinition {
  readonly id: CampaignAnalyticsMetricId;
  readonly version: CampaignAnalyticsDictionaryVersion;
  readonly label: LocalizedText;
  readonly description: LocalizedText;
  readonly unit: CampaignAnalyticsUnit;
  readonly source: CampaignAnalyticsSourceId;
  readonly dedupeKey: string;
  readonly denominator: CampaignAnalyticsDenominatorId | null;
  readonly timeBoundary: CampaignAnalyticsTimeBoundary;
}

export interface AvailableCampaignAnalyticsMetric {
  readonly availability: "available";
  readonly definition: CampaignAnalyticsMetricDefinition;
  readonly value: number;
  readonly numerator?: number;
  readonly denominator?: number;
}

export interface UnavailableCampaignAnalyticsMetric {
  readonly availability: "unavailable";
  readonly definition: CampaignAnalyticsMetricDefinition;
  readonly reasonCode: CampaignAnalyticsUnavailableReason;
}

export type CampaignAnalyticsMetric =
  | AvailableCampaignAnalyticsMetric
  | UnavailableCampaignAnalyticsMetric;

export interface CampaignAnalyticsTaskAggregate {
  readonly taskId: string;
  readonly templateCode: string;
  readonly required: boolean;
  readonly activityParticipants: number;
  readonly verifiedParticipants: number;
}

export interface CampaignAnalyticsTaskRow extends CampaignAnalyticsTaskAggregate {
  readonly participantDenominator: number;
  readonly completionRate: number;
}

export interface CampaignAnalyticsTaskBreakdown {
  readonly rows: readonly CampaignAnalyticsTaskRow[];
  readonly totalRows: number;
  readonly truncated: boolean;
  readonly rowLimit: typeof CAMPAIGN_ANALYTICS_TASK_ROW_LIMIT;
}

export interface CampaignAnalyticsCompletionBreakdown {
  readonly pending: number;
  readonly completed: number;
  readonly failed: number;
  readonly manualReview: number;
  readonly verified: number;
}

export interface CampaignAnalyticsReviewBreakdown {
  readonly approved: number;
  readonly rejected: number;
  readonly needsReview: number;
  readonly stale: number;
  readonly invalid: number;
  readonly unreviewed: number;
  readonly totalParticipants: number;
}

export type CampaignAnalyticsAccountType = "AA" | "EOA" | "UNKNOWN";

export interface CampaignAnalyticsDimensionAggregate {
  readonly id: string;
  readonly count: number;
}

export interface CampaignAnalyticsDimensionRow extends CampaignAnalyticsDimensionAggregate {
  readonly percentage: number;
}

export interface AvailableCampaignAnalyticsSourceCapability {
  readonly source: CampaignAnalyticsSourceId;
  readonly availability: "available";
  readonly schemaVersion?: string;
}

export interface UnavailableCampaignAnalyticsSourceCapability {
  readonly source: CampaignAnalyticsSourceId;
  readonly availability: "unavailable";
  readonly reasonCode: CampaignAnalyticsSourceUnavailableReason;
}

export type CampaignAnalyticsSourceCapability =
  | AvailableCampaignAnalyticsSourceCapability
  | UnavailableCampaignAnalyticsSourceCapability;

export interface CampaignAnalyticsParticipantAggregate {
  readonly unique: number;
  readonly riskFlagged: number;
  readonly accountTypes: readonly CampaignAnalyticsDimensionAggregate[];
  readonly locales: readonly CampaignAnalyticsDimensionAggregate[];
}

export interface CampaignAnalyticsPointsAggregate {
  readonly completionAwarded: number;
  readonly participantAwarded: number;
  readonly participantsWithPoints: number;
  readonly participantsWithoutPoints: number;
}

export interface AvailableCampaignAnalyticsReferralAggregate {
  readonly availability: "available";
  readonly total: number;
  readonly qualified: number;
}

export interface UnavailableCampaignAnalyticsReferralAggregate {
  readonly availability: "unavailable";
  readonly reasonCode: CampaignAnalyticsSourceUnavailableReason;
}

export type CampaignAnalyticsReferralAggregate =
  | AvailableCampaignAnalyticsReferralAggregate
  | UnavailableCampaignAnalyticsReferralAggregate;

type DurableCampaignAnalyticsSourceId = Exclude<
  CampaignAnalyticsSourceId,
  "browser_events" | "retention_events" | "external_product_events"
>;

export interface CampaignAnalyticsAggregateInput {
  readonly campaignId: string;
  readonly asOf: string;
  readonly traceId: string;
  readonly supportedLocales: readonly string[];
  readonly participants: CampaignAnalyticsParticipantAggregate;
  readonly tasks: readonly CampaignAnalyticsTaskAggregate[];
  readonly completions: CampaignAnalyticsCompletionBreakdown;
  readonly review: CampaignAnalyticsReviewBreakdown;
  readonly points: CampaignAnalyticsPointsAggregate;
  readonly referrals: CampaignAnalyticsReferralAggregate;
  readonly sourceSchemaVersions?: Readonly<Partial<Record<DurableCampaignAnalyticsSourceId, string>>>;
}

export interface CampaignAnalyticsSnapshot {
  readonly version: CampaignAnalyticsVersion;
  readonly campaignId: string;
  readonly asOf: string;
  readonly status: CampaignAnalyticsSnapshotStatus;
  readonly metrics: readonly CampaignAnalyticsMetric[];
  readonly taskBreakdown: CampaignAnalyticsTaskBreakdown;
  readonly completionBreakdown: CampaignAnalyticsCompletionBreakdown;
  readonly reviewBreakdown: CampaignAnalyticsReviewBreakdown;
  readonly accountTypeBreakdown: readonly CampaignAnalyticsDimensionRow[];
  readonly localeBreakdown: readonly CampaignAnalyticsDimensionRow[];
  readonly sourceCapabilities: readonly CampaignAnalyticsSourceCapability[];
  readonly traceId: string;
}

export type CampaignAnalyticsErrorCode =
  | "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID"
  | "CAMPAIGN_ANALYTICS_NOT_FOUND"
  | "CAMPAIGN_ANALYTICS_SCHEMA_NOT_READY"
  | "CAMPAIGN_ANALYTICS_UNAVAILABLE"
  | "CAMPAIGN_ANALYTICS_TIMEOUT"
  | "CAMPAIGN_ANALYTICS_ROW_CORRUPTION"
  | "CAMPAIGN_ANALYTICS_INTEGRITY_FAILED"
  | "CAMPAIGN_ANALYTICS_BOUND_EXCEEDED"
  | "CAMPAIGN_ANALYTICS_CLOSED"
  | "CAMPAIGN_ANALYTICS_CLEANUP_FAILED";

export type CampaignAnalyticsOperation =
  | "lookup_metric_definition"
  | "project_snapshot"
  | "serialize_snapshot";

export class CampaignAnalyticsProjectionError extends Error {
  readonly code: CampaignAnalyticsErrorCode;
  readonly field?: string;
  readonly operation: CampaignAnalyticsOperation;
  readonly retryable: boolean;

  constructor(options: {
    code: CampaignAnalyticsErrorCode;
    operation: CampaignAnalyticsOperation;
    field?: string;
    retryable?: boolean;
  }) {
    super(options.code);
    this.name = "CampaignAnalyticsProjectionError";
    this.code = options.code;
    this.operation = options.operation;
    this.retryable = options.retryable ?? false;

    if (options.field) {
      this.field = options.field;
    }
  }
}

const localized = (enUS: string, zhCN: string, zhTW = zhCN): LocalizedText =>
  deepFreeze({
    "en-US": enUS,
    "zh-CN": zhCN,
    "zh-TW": zhTW,
  });

const definition = (
  id: CampaignAnalyticsMetricId,
  unit: CampaignAnalyticsUnit,
  source: CampaignAnalyticsSourceId,
  dedupeKey: string,
  denominator: CampaignAnalyticsDenominatorId | null,
  label: LocalizedText,
  description: LocalizedText,
): CampaignAnalyticsMetricDefinition =>
  deepFreeze({
    id,
    version: CAMPAIGN_ANALYTICS_DICTIONARY_VERSION,
    label,
    description,
    unit,
    source,
    dedupeKey,
    denominator,
    timeBoundary: "snapshot_as_of",
  });

export const campaignAnalyticsMetricDictionary: readonly CampaignAnalyticsMetricDefinition[] =
  deepFreeze([
    definition(
      "participants.unique",
      "count",
      "participant",
      "campaign_id+participant_subject",
      null,
      localized("Unique participants", "独立参与者", "獨立參與者"),
      localized(
        "Unique canonical participant subjects in this Campaign snapshot.",
        "当前 Campaign 快照中的 canonical 独立参与者。",
        "目前 Campaign 快照中的 canonical 獨立參與者。",
      ),
    ),
    definition(
      "tasks.total",
      "count",
      "campaign",
      "campaign_id+task_id",
      null,
      localized("Total tasks", "任务总数", "任務總數"),
      localized("Unique canonical Tasks in this Campaign.", "当前 Campaign 的 canonical Task 总数。", "目前 Campaign 的 canonical Task 總數。"),
    ),
    definition(
      "tasks.with_activity",
      "count",
      "task_completion_evidence",
      "campaign_id+task_id",
      null,
      localized("Tasks with activity", "有参与记录的任务", "有參與記錄的任務"),
      localized("Distinct Tasks with at least one completion-state fact.", "至少有一条 Completion 状态事实的独立 Task。", "至少有一筆 Completion 狀態事實的獨立 Task。"),
    ),
    definition(
      "completions.verified",
      "count",
      "task_completion_evidence",
      "campaign_id+participant_subject+task_id",
      null,
      localized("Verified completions", "已验证完成", "已驗證完成"),
      localized("Unique Participant-Task pairs with canonical verified completion evidence.", "具有 canonical 已验证完成证据的独立参与者-任务组合。", "具有 canonical 已驗證完成證據的獨立參與者-任務組合。"),
    ),
    definition(
      "completions.rate",
      "ratio",
      "task_completion_evidence",
      "campaign_id+participant_subject+task_id",
      "participant_task_opportunities",
      localized("Verified completion rate", "验证完成率", "驗證完成率"),
      localized("Verified Participant-Task pairs divided by Participants multiplied by Tasks.", "已验证参与者-任务组合除以参与者数乘以任务数。", "已驗證參與者-任務組合除以參與者數乘以任務數。"),
    ),
    definition(
      "points.awarded",
      "points",
      "points_projection",
      "campaign_id+confirmed_ledger_entry_id",
      null,
      localized("Awarded points", "已发放积分", "已發放積分"),
      localized("Points from canonical confirmed ledger facts.", "来自 canonical confirmed ledger 事实的积分。", "來自 canonical confirmed ledger 事實的積分。"),
    ),
    definition(
      "points.participants_with_points",
      "count",
      "points_projection",
      "campaign_id+participant_subject",
      null,
      localized("Participants with points", "获得积分的参与者", "獲得積分的參與者"),
      localized("Unique Participants with a positive confirmed points total.", "confirmed 积分总数大于零的独立参与者。", "confirmed 積分總數大於零的獨立參與者。"),
    ),
    definition(
      "points.participants_without_points",
      "count",
      "points_projection",
      "campaign_id+participant_subject",
      null,
      localized("Participants without points", "未获得积分的参与者", "未獲得積分的參與者"),
      localized("Unique Participants with a zero confirmed points total.", "confirmed 积分总数为零的独立参与者。", "confirmed 積分總數為零的獨立參與者。"),
    ),
    definition(
      "referrals.total",
      "count",
      "referral_binding",
      "campaign_id+referral_binding_id",
      null,
      localized("Referral bindings", "邀请绑定总数", "邀請綁定總數"),
      localized("Durable referral bindings attributed to this Campaign.", "归属于当前 Campaign 的 durable 邀请绑定。", "歸屬於目前 Campaign 的 durable 邀請綁定。"),
    ),
    definition(
      "referrals.qualified",
      "count",
      "referral_binding",
      "campaign_id+referral_binding_id",
      null,
      localized("Qualified referrals", "合格邀请", "合格邀請"),
      localized("Referral bindings that satisfy the canonical qualification rule.", "满足 canonical qualification 规则的邀请绑定。", "符合 canonical qualification 規則的邀請綁定。"),
    ),
    definition(
      "referrals.conversion",
      "ratio",
      "referral_binding",
      "campaign_id+referral_binding_id",
      "referral_bindings",
      localized("Referral conversion", "邀请转化率", "邀請轉化率"),
      localized("Qualified referral bindings divided by all attributable bindings.", "合格邀请绑定除以全部可归属绑定。", "合格邀請綁定除以全部可歸屬綁定。"),
    ),
    definition(
      "risk.flagged_participants",
      "count",
      "participant",
      "campaign_id+participant_subject",
      null,
      localized("Flagged participants", "风险标记参与者", "風險標記參與者"),
      localized("Unique Participants with at least one canonical risk flag.", "至少有一个 canonical 风险标记的独立参与者。", "至少有一個 canonical 風險標記的獨立參與者。"),
    ),
    definition(
      "risk.flagged_rate",
      "ratio",
      "participant",
      "campaign_id+participant_subject",
      "participants",
      localized("Flagged participant rate", "风险标记率", "風險標記率"),
      localized("Flagged Participants divided by all unique Participants.", "风险标记参与者除以全部独立参与者。", "風險標記參與者除以全部獨立參與者。"),
    ),
    definition(
      "events.page_views",
      "count",
      "browser_events",
      "campaign_id+event_id",
      null,
      localized("Page views", "页面浏览量", "頁面瀏覽量"),
      localized("Campaign page-view events; not collected in M245.", "Campaign 页面浏览事件；M245 不采集。", "Campaign 頁面瀏覽事件；M245 不採集。"),
    ),
    definition(
      "events.impressions",
      "count",
      "browser_events",
      "campaign_id+event_id",
      null,
      localized("Impressions", "曝光量", "曝光量"),
      localized("Campaign impression events; not collected in M245.", "Campaign 曝光事件；M245 不采集。", "Campaign 曝光事件；M245 不採集。"),
    ),
    definition(
      "events.clicks",
      "count",
      "browser_events",
      "campaign_id+event_id",
      null,
      localized("Clicks", "点击量", "點擊量"),
      localized("Campaign click events; not collected in M245.", "Campaign 点击事件；M245 不采集。", "Campaign 點擊事件；M245 不採集。"),
    ),
    definition(
      "events.wallet_connects",
      "count",
      "browser_events",
      "campaign_id+event_id",
      null,
      localized("Wallet connects", "钱包连接次数", "錢包連線次數"),
      localized("Wallet-connect analytics events; not collected in M245.", "钱包连接 analytics 事件；M245 不采集。", "錢包連線 analytics 事件；M245 不採集。"),
    ),
    definition(
      "retention.day_7",
      "ratio",
      "retention_events",
      "campaign_id+participant_subject+cohort_day",
      "participants",
      localized("Day 7 retention", "第 7 天留存", "第 7 天留存"),
      localized("Seven-day Participant retention; not collected in M245.", "参与者第 7 天留存；M245 不采集。", "參與者第 7 天留存；M245 不採集。"),
    ),
    definition(
      "retention.day_30",
      "ratio",
      "retention_events",
      "campaign_id+participant_subject+cohort_day",
      "participants",
      localized("Day 30 retention", "第 30 天留存", "第 30 天留存"),
      localized("Thirty-day Participant retention; not collected in M245.", "参与者第 30 天留存；M245 不采集。", "參與者第 30 天留存；M245 不採集。"),
    ),
    definition(
      "conversion.external_product",
      "ratio",
      "external_product_events",
      "campaign_id+external_event_id",
      "participants",
      localized("External product conversion", "外部产品转化率", "外部產品轉化率"),
      localized("External product conversion events; not collected in M245.", "外部产品转化事件；M245 不采集。", "外部產品轉化事件；M245 不採集。"),
    ),
  ]);

const metricDefinitionById = new Map(
  campaignAnalyticsMetricDictionary.map((item) => [item.id, item] as const),
);

export const getCampaignAnalyticsMetricDefinition = (
  metricId: CampaignAnalyticsMetricId,
): CampaignAnalyticsMetricDefinition => {
  const result = metricDefinitionById.get(metricId);

  if (!result) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
      "lookup_metric_definition",
      "metricId",
    );
  }

  return result;
};

const supportedAccountTypes: readonly CampaignAnalyticsAccountType[] = ["AA", "EOA", "UNKNOWN"];
const durableSourceIds: readonly DurableCampaignAnalyticsSourceId[] = [
  "campaign",
  "participant",
  "task_completion_evidence",
  "admin_review",
  "points_projection",
  "referral_binding",
];

const identifierPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const localePattern = /^[A-Za-z0-9][A-Za-z0-9-]{0,34}$/;
const sensitiveInputKeyPattern = /(?:walletaddress|rawaddress|session|challenge|signature|proof|cookie|csrf|authorization|credential|privatekey|databaseurl|endpoint|accesstoken|refreshtoken|sql|stack)/i;

export const createCampaignAnalyticsSnapshot = (
  input: CampaignAnalyticsAggregateInput,
): CampaignAnalyticsSnapshot => {
  assertNoSensitiveInputKeys(input);
  assertExactKeys(input, [
    "campaignId",
    "asOf",
    "traceId",
    "supportedLocales",
    "participants",
    "tasks",
    "completions",
    "review",
    "points",
    "referrals",
    "sourceSchemaVersions",
  ], "");

  const campaignId = normalizeIdentifier(input.campaignId, "campaignId");
  const asOf = normalizeTimestamp(input.asOf, "asOf");
  const traceId = normalizeIdentifier(input.traceId, "traceId");
  const supportedLocales = normalizeSupportedLocales(input.supportedLocales);
  const participants = normalizeParticipants(input.participants, supportedLocales);
  const tasks = normalizeTasks(input.tasks, participants.unique);
  const opportunities = checkedMultiply(
    participants.unique,
    tasks.length,
    "participantTaskOpportunities",
  );
  const activityFromTasks = checkedSum(
    tasks.map((task) => task.activityParticipants),
    "tasks.activityParticipants",
  );
  const completions = normalizeCompletions(
    input.completions,
    opportunities,
    activityFromTasks,
  );
  const verifiedFromTasks = checkedSum(
    tasks.map((task) => task.verifiedParticipants),
    "tasks.verifiedParticipants",
  );

  if (verifiedFromTasks !== completions.verified) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_INTEGRITY_FAILED",
      "project_snapshot",
      "completions.verified",
    );
  }

  const review = normalizeReview(input.review, participants.unique);
  const points = normalizePoints(input.points, participants.unique);
  const referrals = normalizeReferrals(input.referrals);
  const sourceSchemaVersions = normalizeSourceSchemaVersions(input.sourceSchemaVersions);
  const taskBreakdown = createTaskBreakdown(tasks, participants.unique);
  const accountTypeBreakdown = createDimensionBreakdown(
    participants.accountTypes,
    participants.unique,
  );
  const localeBreakdown = createDimensionBreakdown(participants.locales, participants.unique);
  const sourceCapabilities = createSourceCapabilities(referrals, sourceSchemaVersions);
  const metrics = createMetrics({
    completions,
    opportunities,
    participants,
    points,
    referrals,
    tasks,
  });
  const status = createSnapshotStatus(metrics, participants.unique);
  const snapshot: CampaignAnalyticsSnapshot = {
    version: CAMPAIGN_ANALYTICS_VERSION,
    campaignId,
    asOf,
    status,
    metrics,
    taskBreakdown,
    completionBreakdown: completions,
    reviewBreakdown: review,
    accountTypeBreakdown,
    localeBreakdown,
    sourceCapabilities,
    traceId,
  };

  assertCampaignAnalyticsSnapshotWithinByteLimit(
    snapshot,
    CAMPAIGN_ANALYTICS_MAX_SERIALIZED_BYTES,
  );

  return deepFreeze(snapshot);
};

interface MetricProjectionContext {
  readonly completions: CampaignAnalyticsCompletionBreakdown;
  readonly opportunities: number;
  readonly participants: CampaignAnalyticsParticipantAggregate;
  readonly points: CampaignAnalyticsPointsAggregate;
  readonly referrals: CampaignAnalyticsReferralAggregate;
  readonly tasks: readonly CampaignAnalyticsTaskAggregate[];
}

const createMetrics = (context: MetricProjectionContext): readonly CampaignAnalyticsMetric[] =>
  campaignAnalyticsMetricDictionary.map((item): CampaignAnalyticsMetric => {
    switch (item.id) {
      case "participants.unique":
        return availableMetric(item, context.participants.unique);
      case "tasks.total":
        return availableMetric(item, context.tasks.length);
      case "tasks.with_activity":
        return availableMetric(
          item,
          context.tasks.filter((task) => task.activityParticipants > 0).length,
        );
      case "completions.verified":
        return availableMetric(item, context.completions.verified);
      case "completions.rate":
        return ratioMetric(item, context.completions.verified, context.opportunities);
      case "points.awarded":
        return availableMetric(item, context.points.completionAwarded);
      case "points.participants_with_points":
        return availableMetric(item, context.points.participantsWithPoints);
      case "points.participants_without_points":
        return availableMetric(item, context.points.participantsWithoutPoints);
      case "referrals.total":
        return context.referrals.availability === "available"
          ? availableMetric(item, context.referrals.total)
          : unavailableMetric(item, context.referrals.reasonCode);
      case "referrals.qualified":
        return context.referrals.availability === "available"
          ? availableMetric(item, context.referrals.qualified)
          : unavailableMetric(item, context.referrals.reasonCode);
      case "referrals.conversion":
        return context.referrals.availability === "available"
          ? ratioMetric(item, context.referrals.qualified, context.referrals.total)
          : unavailableMetric(item, context.referrals.reasonCode);
      case "risk.flagged_participants":
        return availableMetric(item, context.participants.riskFlagged);
      case "risk.flagged_rate":
        return ratioMetric(item, context.participants.riskFlagged, context.participants.unique);
      case "events.page_views":
      case "events.impressions":
      case "events.clicks":
      case "events.wallet_connects":
      case "retention.day_7":
      case "retention.day_30":
      case "conversion.external_product":
        return unavailableMetric(item, "SOURCE_NOT_COLLECTED");
    }
  });

const availableMetric = (
  item: CampaignAnalyticsMetricDefinition,
  value: number,
): AvailableCampaignAnalyticsMetric => ({
  availability: "available",
  definition: item,
  value,
});

const ratioMetric = (
  item: CampaignAnalyticsMetricDefinition,
  numerator: number,
  denominator: number,
): AvailableCampaignAnalyticsMetric => ({
  availability: "available",
  definition: item,
  value: denominator === 0 ? 0 : numerator / denominator,
  numerator,
  denominator,
});

const unavailableMetric = (
  item: CampaignAnalyticsMetricDefinition,
  reasonCode: CampaignAnalyticsUnavailableReason,
): UnavailableCampaignAnalyticsMetric => ({
  availability: "unavailable",
  definition: item,
  reasonCode,
});

const createSnapshotStatus = (
  metrics: readonly CampaignAnalyticsMetric[],
  participantCount: number,
): CampaignAnalyticsSnapshotStatus => {
  if (participantCount === 0) {
    return "empty";
  }

  return metrics.some((metric) => metric.availability === "unavailable")
    ? "partial"
    : "ready";
};

const normalizeParticipants = (
  value: CampaignAnalyticsParticipantAggregate,
  supportedLocales: readonly string[],
): CampaignAnalyticsParticipantAggregate => {
  assertExactKeys(value, ["unique", "riskFlagged", "accountTypes", "locales"], "participants");
  const unique = normalizeCount(value.unique, "participants.unique");
  const riskFlagged = normalizeCount(value.riskFlagged, "participants.riskFlagged");

  if (riskFlagged > unique) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_INTEGRITY_FAILED",
      "project_snapshot",
      "participants.riskFlagged",
    );
  }

  const accountTypes = normalizeDimensions(
    value.accountTypes,
    "participants.accountTypes",
    (id) => supportedAccountTypes.includes(id as CampaignAnalyticsAccountType),
    unique,
  );
  const supportedLocaleSet = new Set(supportedLocales);
  const locales = normalizeDimensions(
    value.locales,
    "participants.locales",
    (id) => supportedLocaleSet.has(id),
    unique,
  );

  return { accountTypes, locales, riskFlagged, unique };
};

const normalizeDimensions = (
  values: readonly CampaignAnalyticsDimensionAggregate[],
  field: string,
  isAllowedId: (id: string) => boolean,
  participantCount: number,
): readonly CampaignAnalyticsDimensionAggregate[] => {
  assertArray(values, field);
  const seen = new Set<string>();
  const normalized = values.map((value) => {
    assertExactKeys(value, ["id", "count"], field);
    const id = normalizeDimensionId(value.id, `${field}.id`);
    const count = normalizeCount(value.count, `${field}.count`);

    if (!isAllowedId(id) || seen.has(id)) {
      throw projectionError(
        "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
        "project_snapshot",
        `${field}.id`,
      );
    }

    seen.add(id);
    return { count, id };
  });
  const total = checkedSum(normalized.map((item) => item.count), `${field}.count`);

  if (total > participantCount) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_INTEGRITY_FAILED",
      "project_snapshot",
      `${field}.count`,
    );
  }

  return normalized.sort(compareById);
};

const normalizeTasks = (
  values: readonly CampaignAnalyticsTaskAggregate[],
  participantCount: number,
): readonly CampaignAnalyticsTaskAggregate[] => {
  assertArray(values, "tasks");
  const seen = new Set<string>();
  const tasks = values.map((value) => {
    assertExactKeys(
      value,
      ["taskId", "templateCode", "required", "activityParticipants", "verifiedParticipants"],
      "tasks",
    );
    const taskId = normalizeIdentifier(value.taskId, "tasks.taskId");
    const templateCode = normalizeIdentifier(value.templateCode, "tasks.templateCode");

    if (typeof value.required !== "boolean") {
      throw projectionError(
        "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
        "project_snapshot",
        "tasks.required",
      );
    }

    const activityParticipants = normalizeCount(
      value.activityParticipants,
      "tasks.activityParticipants",
    );
    const verifiedParticipants = normalizeCount(
      value.verifiedParticipants,
      "tasks.verifiedParticipants",
    );

    if (seen.has(taskId)) {
      throw projectionError(
        "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
        "project_snapshot",
        "tasks.taskId",
      );
    }

    if (
      activityParticipants > participantCount
      || verifiedParticipants > activityParticipants
    ) {
      throw projectionError(
        "CAMPAIGN_ANALYTICS_INTEGRITY_FAILED",
        "project_snapshot",
        "tasks.verifiedParticipants",
      );
    }

    seen.add(taskId);
    return {
      activityParticipants,
      required: value.required,
      taskId,
      templateCode,
      verifiedParticipants,
    };
  });

  return tasks.sort(compareById);
};

const normalizeCompletions = (
  value: CampaignAnalyticsCompletionBreakdown,
  opportunities: number,
  activityFromTasks: number,
): CampaignAnalyticsCompletionBreakdown => {
  assertExactKeys(value, ["pending", "completed", "failed", "manualReview", "verified"], "completions");
  const result = {
    pending: normalizeCount(value.pending, "completions.pending"),
    completed: normalizeCount(value.completed, "completions.completed"),
    failed: normalizeCount(value.failed, "completions.failed"),
    manualReview: normalizeCount(value.manualReview, "completions.manualReview"),
    verified: normalizeCount(value.verified, "completions.verified"),
  };
  const totalStates = checkedSum(
    [result.pending, result.completed, result.failed, result.manualReview],
    "completions.total",
  );

  if (
    result.verified > result.completed
    || totalStates > opportunities
    || totalStates !== activityFromTasks
  ) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_INTEGRITY_FAILED",
      "project_snapshot",
      result.verified > result.completed ? "completions.verified" : "completions.total",
    );
  }

  return result;
};

const normalizeReview = (
  value: CampaignAnalyticsReviewBreakdown,
  participantCount: number,
): CampaignAnalyticsReviewBreakdown => {
  assertExactKeys(
    value,
    ["approved", "rejected", "needsReview", "stale", "invalid", "unreviewed", "totalParticipants"],
    "review",
  );
  const result = {
    approved: normalizeCount(value.approved, "review.approved"),
    rejected: normalizeCount(value.rejected, "review.rejected"),
    needsReview: normalizeCount(value.needsReview, "review.needsReview"),
    stale: normalizeCount(value.stale, "review.stale"),
    invalid: normalizeCount(value.invalid, "review.invalid"),
    unreviewed: normalizeCount(value.unreviewed, "review.unreviewed"),
    totalParticipants: normalizeCount(value.totalParticipants, "review.totalParticipants"),
  };
  const bucketTotal = checkedSum(
    [
      result.approved,
      result.rejected,
      result.needsReview,
      result.stale,
      result.invalid,
      result.unreviewed,
    ],
    "review.buckets",
  );

  if (result.totalParticipants !== participantCount || bucketTotal !== result.totalParticipants) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_INTEGRITY_FAILED",
      "project_snapshot",
      "review.buckets",
    );
  }

  return result;
};

const normalizePoints = (
  value: CampaignAnalyticsPointsAggregate,
  participantCount: number,
): CampaignAnalyticsPointsAggregate => {
  assertExactKeys(
    value,
    [
      "completionAwarded",
      "participantAwarded",
      "participantsWithPoints",
      "participantsWithoutPoints",
    ],
    "points",
  );
  const result = {
    completionAwarded: normalizeCount(
      value.completionAwarded,
      "points.completionAwarded",
    ),
    participantAwarded: normalizeCount(
      value.participantAwarded,
      "points.participantAwarded",
    ),
    participantsWithPoints: normalizeCount(
      value.participantsWithPoints,
      "points.participantsWithPoints",
    ),
    participantsWithoutPoints: normalizeCount(
      value.participantsWithoutPoints,
      "points.participantsWithoutPoints",
    ),
  };

  if (
    checkedSum(
      [result.participantsWithPoints, result.participantsWithoutPoints],
      "points.participantCounts",
    ) !== participantCount
  ) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_INTEGRITY_FAILED",
      "project_snapshot",
      "points.participantCounts",
    );
  }

  if (
    result.completionAwarded !== result.participantAwarded
    || result.completionAwarded < result.participantsWithPoints
    || (result.completionAwarded === 0) !== (result.participantsWithPoints === 0)
  ) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_INTEGRITY_FAILED",
      "project_snapshot",
      "points.awarded",
    );
  }

  return result;
};

const normalizeReferrals = (
  value: CampaignAnalyticsReferralAggregate,
): CampaignAnalyticsReferralAggregate => {
  assertRecord(value, "referrals");

  if (value.availability === "unavailable") {
    assertExactKeys(value, ["availability", "reasonCode"], "referrals");

    if (!isSourceUnavailableReason(value.reasonCode)) {
      throw projectionError(
        "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
        "project_snapshot",
        "referrals.reasonCode",
      );
    }

    return { availability: "unavailable", reasonCode: value.reasonCode };
  }

  if (value.availability !== "available") {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
      "project_snapshot",
      "referrals.availability",
    );
  }

  assertExactKeys(value, ["availability", "total", "qualified"], "referrals");
  const total = normalizeCount(value.total, "referrals.total");
  const qualified = normalizeCount(value.qualified, "referrals.qualified");

  if (qualified > total) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_INTEGRITY_FAILED",
      "project_snapshot",
      "referrals.qualified",
    );
  }

  return { availability: "available", qualified, total };
};

const normalizeSourceSchemaVersions = (
  value: CampaignAnalyticsAggregateInput["sourceSchemaVersions"],
): Readonly<Partial<Record<DurableCampaignAnalyticsSourceId, string>>> => {
  if (value === undefined) {
    return {};
  }

  assertExactKeys(value, durableSourceIds, "sourceSchemaVersions");
  return Object.fromEntries(
    Object.entries(value).map(([source, schemaVersion]) => [
      source,
      normalizeIdentifier(schemaVersion, `sourceSchemaVersions.${source}`),
    ]),
  );
};

const normalizeSupportedLocales = (value: readonly string[]): readonly string[] => {
  assertArray(value, "supportedLocales");

  if (value.length > 9) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_BOUND_EXCEEDED",
      "project_snapshot",
      "supportedLocales",
    );
  }

  const locales = value.map((locale) => normalizeDimensionId(locale, "supportedLocales"));

  if (new Set(locales).size !== locales.length) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
      "project_snapshot",
      "supportedLocales",
    );
  }

  return locales.sort(compareStrings);
};

const createTaskBreakdown = (
  tasks: readonly CampaignAnalyticsTaskAggregate[],
  participantCount: number,
): CampaignAnalyticsTaskBreakdown => ({
  rows: tasks.slice(0, CAMPAIGN_ANALYTICS_TASK_ROW_LIMIT).map((task) => ({
    ...task,
    participantDenominator: participantCount,
    completionRate: participantCount === 0 ? 0 : task.verifiedParticipants / participantCount,
  })),
  totalRows: tasks.length,
  truncated: tasks.length > CAMPAIGN_ANALYTICS_TASK_ROW_LIMIT,
  rowLimit: CAMPAIGN_ANALYTICS_TASK_ROW_LIMIT,
});

const createDimensionBreakdown = (
  values: readonly CampaignAnalyticsDimensionAggregate[],
  participantCount: number,
): readonly CampaignAnalyticsDimensionRow[] =>
  values.map((value) => ({
    ...value,
    percentage: participantCount === 0 ? 0 : value.count / participantCount,
  }));

const createSourceCapabilities = (
  referrals: CampaignAnalyticsReferralAggregate,
  schemaVersions: Readonly<Partial<Record<DurableCampaignAnalyticsSourceId, string>>>,
): readonly CampaignAnalyticsSourceCapability[] => [
  availableSourceCapability("campaign", schemaVersions.campaign),
  availableSourceCapability("participant", schemaVersions.participant),
  availableSourceCapability(
    "task_completion_evidence",
    schemaVersions.task_completion_evidence,
  ),
  availableSourceCapability("admin_review", schemaVersions.admin_review),
  availableSourceCapability("points_projection", schemaVersions.points_projection),
  referrals.availability === "available"
    ? availableSourceCapability("referral_binding", schemaVersions.referral_binding)
    : {
        source: "referral_binding",
        availability: "unavailable",
        reasonCode: referrals.reasonCode,
      },
  unavailableSourceCapability("browser_events"),
  unavailableSourceCapability("retention_events"),
  unavailableSourceCapability("external_product_events"),
];

const availableSourceCapability = (
  source: CampaignAnalyticsSourceId,
  schemaVersion: string | undefined,
): AvailableCampaignAnalyticsSourceCapability => ({
  source,
  availability: "available",
  ...(schemaVersion ? { schemaVersion } : {}),
});

const unavailableSourceCapability = (
  source: CampaignAnalyticsSourceId,
): UnavailableCampaignAnalyticsSourceCapability => ({
  source,
  availability: "unavailable",
  reasonCode: "SOURCE_NOT_COLLECTED",
});

export const serializeCampaignAnalyticsSnapshot = (
  snapshot: CampaignAnalyticsSnapshot,
): string => JSON.stringify(canonicalizeJsonValue(snapshot));

const canonicalizeJsonValue = (
  value: unknown,
  ancestors: WeakSet<object> = new WeakSet<object>(),
): unknown => {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    if (Number.isFinite(value)) {
      return value;
    }

    throw projectionError(
      "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
      "serialize_snapshot",
      "snapshot",
    );
  }

  if (typeof value !== "object" || ancestors.has(value)) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
      "serialize_snapshot",
      "snapshot",
    );
  }

  ancestors.add(value);

  try {
    if (Array.isArray(value)) {
      return value.map((item) => canonicalizeJsonValue(item, ancestors));
    }

    const result: Record<string, unknown> = {};

    for (const key of Object.keys(value).sort(compareStrings)) {
      const child = (value as Record<string, unknown>)[key];

      if (child !== undefined) {
        result[key] = canonicalizeJsonValue(child, ancestors);
      }
    }

    return result;
  } finally {
    ancestors.delete(value);
  }
};

export const measureCampaignAnalyticsSnapshotBytes = (
  snapshot: CampaignAnalyticsSnapshot,
): number => new TextEncoder().encode(serializeCampaignAnalyticsSnapshot(snapshot)).byteLength;

export const assertCampaignAnalyticsSnapshotWithinByteLimit = <T extends CampaignAnalyticsSnapshot>(
  snapshot: T,
  maxBytes = CAMPAIGN_ANALYTICS_MAX_SERIALIZED_BYTES,
): T => {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
      "serialize_snapshot",
      "maxBytes",
    );
  }

  if (measureCampaignAnalyticsSnapshotBytes(snapshot) > maxBytes) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_BOUND_EXCEEDED",
      "serialize_snapshot",
      "snapshot",
    );
  }

  return snapshot;
};

const normalizeCount = (value: number, field: string): number => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
      "project_snapshot",
      field,
    );
  }

  return value;
};

const checkedSum = (values: readonly number[], field: string): number => {
  let total = 0;

  for (const value of values) {
    total += value;

    if (!Number.isSafeInteger(total)) {
      throw projectionError(
        "CAMPAIGN_ANALYTICS_BOUND_EXCEEDED",
        "project_snapshot",
        field,
      );
    }
  }

  return total;
};

const checkedMultiply = (left: number, right: number, field: string): number => {
  const result = left * right;

  if (!Number.isSafeInteger(result)) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_BOUND_EXCEEDED",
      "project_snapshot",
      field,
    );
  }

  return result;
};

const normalizeIdentifier = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !identifierPattern.test(value)) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
      "project_snapshot",
      field,
    );
  }

  return value;
};

const normalizeDimensionId = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !localePattern.test(value)) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
      "project_snapshot",
      field,
    );
  }

  return value;
};

const normalizeTimestamp = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.length > 35) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
      "project_snapshot",
      field,
    );
  }

  const match = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value);

  if (!match) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
      "project_snapshot",
      field,
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (day > daysInMonth(year, month)) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
      "project_snapshot",
      field,
    );
  }

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
      "project_snapshot",
      field,
    );
  }

  return new Date(timestamp).toISOString();
};

const daysInMonth = (year: number, month: number): number => {
  if (month === 2) {
    const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return isLeapYear ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
};

function assertArray(value: unknown, field: string): asserts value is readonly unknown[] {
  if (!Array.isArray(value)) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
      "project_snapshot",
      field,
    );
  }
}

function assertRecord(
  value: unknown,
  field: string,
): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
      "project_snapshot",
      field,
    );
  }
}

function assertExactKeys(
  value: unknown,
  allowedKeys: readonly string[],
  field: string,
): asserts value is Record<string, unknown> {
  assertRecord(value, field || "input");
  const allowed = new Set(allowedKeys);

  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw projectionError(
        "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
        "project_snapshot",
        field ? `${field}.${key}` : key,
      );
    }
  }
}

const assertNoSensitiveInputKeys = (
  value: unknown,
  path = "",
  ancestors: WeakSet<object> = new WeakSet<object>(),
): void => {
  if (value === null || typeof value !== "object") {
    return;
  }

  if (ancestors.has(value)) {
    throw projectionError(
      "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
      "project_snapshot",
      path || "input",
    );
  }

  ancestors.add(value);

  try {
    if (Array.isArray(value)) {
      value.forEach((item) => assertNoSensitiveInputKeys(item, path, ancestors));
      return;
    }

    for (const [key, child] of Object.entries(value)) {
      const childPath = path ? `${path}.${key}` : key;

      if (sensitiveInputKeyPattern.test(key)) {
        throw projectionError(
          "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
          "project_snapshot",
          childPath,
        );
      }

      assertNoSensitiveInputKeys(child, childPath, ancestors);
    }
  } finally {
    ancestors.delete(value);
  }
};

const isSourceUnavailableReason = (
  value: unknown,
): value is CampaignAnalyticsSourceUnavailableReason =>
  value === "SOURCE_NOT_COLLECTED" || value === "SOURCE_OUT_OF_SCOPE";

const compareStrings = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const compareById = <T extends { readonly id?: string; readonly taskId?: string }>(
  left: T,
  right: T,
): number => compareStrings(left.id ?? left.taskId ?? "", right.id ?? right.taskId ?? "");

const projectionError = (
  code: CampaignAnalyticsErrorCode,
  operation: CampaignAnalyticsOperation,
  field: string,
): CampaignAnalyticsProjectionError =>
  new CampaignAnalyticsProjectionError({ code, field, operation });

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }

  return Object.freeze(value);
}
