import type {
  CampaignAnalyticsReviewBreakdown,
} from "../domain/campaignAnalytics";
import type {
  AdminReviewDecisionValue,
  AdminReviewJsonObject,
} from "./adminReviewStore";

export type CampaignAnalyticsReviewState =
  | "approved"
  | "invalid"
  | "needsReview"
  | "rejected"
  | "stale"
  | "unreviewed";

export interface CampaignAnalyticsReviewDecisionCandidate {
  readonly decidedAt: string;
  readonly decision: AdminReviewDecisionValue;
  readonly id: string;
  readonly snapshotFingerprint: string;
  readonly snapshotManifest: AdminReviewJsonObject;
  readonly version: number;
}

export interface CampaignAnalyticsCurrentReviewIdentity {
  readonly fingerprint: string;
  readonly manifest?: AdminReviewJsonObject;
}

export interface CampaignAnalyticsReviewResolution<TDecision> {
  readonly latestDecision?: TDecision;
  readonly state: CampaignAnalyticsReviewState;
}

export interface CampaignAnalyticsReviewBucketCounts {
  readonly approved: number;
  readonly invalid: number;
  readonly needsReview: number;
  readonly rejected: number;
  readonly stale: number;
  readonly unreviewed: number;
}

const compareCanonicalText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

export const sortCampaignAnalyticsReviewDecisions = <
  TDecision extends CampaignAnalyticsReviewDecisionCandidate,
>(decisions: readonly TDecision[]): TDecision[] => [...decisions].sort((left, right) =>
  right.version - left.version
  || compareCanonicalText(right.decidedAt, left.decidedAt)
  || compareCanonicalText(left.id, right.id));

const manifestsEqual = (
  left: AdminReviewJsonObject,
  right: AdminReviewJsonObject,
): boolean => canonicalJson(left) === canonicalJson(right);

const canonicalJson = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }

  const record = value as Readonly<Record<string, unknown>>;
  return `{${Object.keys(record).sort(compareCanonicalText).map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
};

const currentDecisionState: Readonly<Record<AdminReviewDecisionValue, CampaignAnalyticsReviewState>> = {
  approved: "approved",
  needs_review: "needsReview",
  rejected: "rejected",
};

export const resolveCampaignAnalyticsReviewDecision = <
  TDecision extends CampaignAnalyticsReviewDecisionCandidate,
>(
  current: CampaignAnalyticsCurrentReviewIdentity,
  decisions: readonly TDecision[],
): CampaignAnalyticsReviewResolution<TDecision> => {
  const latestDecision = sortCampaignAnalyticsReviewDecisions(decisions)[0];
  if (!latestDecision) {
    return Object.freeze({ state: "unreviewed" });
  }
  if (
    latestDecision.snapshotFingerprint !== current.fingerprint
    || (current.manifest !== undefined
      && !manifestsEqual(latestDecision.snapshotManifest, current.manifest))
  ) {
    return Object.freeze({ latestDecision, state: "stale" });
  }

  return Object.freeze({
    latestDecision,
    state: currentDecisionState[latestDecision.decision],
  });
};

export const createCampaignAnalyticsReviewBreakdown = (
  counts: CampaignAnalyticsReviewBucketCounts,
  totalParticipants: number,
): CampaignAnalyticsReviewBreakdown => Object.freeze({
  approved: counts.approved,
  invalid: counts.invalid,
  needsReview: counts.needsReview,
  rejected: counts.rejected,
  stale: counts.stale,
  totalParticipants,
  unreviewed: counts.unreviewed,
});
