import { describe, expect, it } from "vitest";
import {
  createCampaignAnalyticsReviewBreakdown,
  resolveCampaignAnalyticsReviewDecision,
  sortCampaignAnalyticsReviewDecisions,
  type CampaignAnalyticsReviewDecisionCandidate,
} from "./campaignAnalyticsReviewProjection";

const fingerprint = (character: string) => character.repeat(64);

const manifest = (overrides: Record<string, unknown> = {}) => ({
  campaign: { id: "campaign-analytics-1", updatedAt: "2026-07-19T00:00:00.000Z" },
  completions: [{ id: "completion-1", updatedAt: "2026-07-19T00:00:00.000Z" }],
  evidence: [{ id: "evidence-1", updatedAt: "2026-07-19T00:00:00.000Z" }],
  participant: {
    id: "participant-1",
    rank: 1,
    updatedAt: "2026-07-19T00:00:00.000Z",
  },
  tasks: [{ id: "task-1", updatedAt: "2026-07-19T00:00:00.000Z" }],
  version: "review-snapshot-v1",
  ...overrides,
});

const decision = (
  overrides: Partial<CampaignAnalyticsReviewDecisionCandidate> = {},
): CampaignAnalyticsReviewDecisionCandidate => ({
  decidedAt: "2026-07-19T00:00:00.000Z",
  decision: "approved",
  id: "decision-1",
  snapshotFingerprint: fingerprint("a"),
  snapshotManifest: manifest(),
  version: 1,
  ...overrides,
});

describe("campaign analytics review projection", () => {
  it("uses version, decided time, and canonical id for deterministic latest ordering", () => {
    const ordered = sortCampaignAnalyticsReviewDecisions([
      decision({ id: "decision-z", version: 1 }),
      decision({
        decidedAt: "2026-07-19T01:00:00.000Z",
        id: "decision-b",
        version: 2,
      }),
      decision({
        decidedAt: "2026-07-19T01:00:00.000Z",
        id: "decision-a",
        version: 2,
      }),
      decision({
        decidedAt: "2026-07-18T23:00:00.000Z",
        id: "decision-new-version",
        version: 3,
      }),
    ]);

    expect(ordered.map(({ id }) => id)).toEqual([
      "decision-new-version",
      "decision-a",
      "decision-b",
      "decision-z",
    ]);
  });

  it.each([
    ["approved", "approved"],
    ["rejected", "rejected"],
    ["needs_review", "needsReview"],
  ] as const)("maps a current %s decision to the %s bucket", (value, expected) => {
    expect(resolveCampaignAnalyticsReviewDecision(
      { fingerprint: fingerprint("a"), manifest: manifest() },
      [decision({ decision: value })],
    )).toMatchObject({ state: expected });
  });

  it("requires the full manifest as well as the fingerprint to remain current", () => {
    const revisedCompletion = manifest({
      completions: [{ id: "completion-1", updatedAt: "2026-07-19T00:00:01.000Z" }],
    });

    expect(resolveCampaignAnalyticsReviewDecision(
      { fingerprint: fingerprint("a"), manifest: revisedCompletion },
      [decision()],
    )).toMatchObject({ state: "stale" });
  });

  it("treats a newer timestamp with a mismatched snapshot as stale", () => {
    const latest = decision({
      decidedAt: "2026-07-19T03:00:00.000Z",
      id: "decision-newer",
      snapshotFingerprint: fingerprint("b"),
      version: 2,
    });

    expect(resolveCampaignAnalyticsReviewDecision(
      { fingerprint: fingerprint("a"), manifest: manifest() },
      [decision(), latest],
    )).toEqual({ latestDecision: latest, state: "stale" });
  });

  it("projects the six bounded buckets without participant identity", () => {
    expect(createCampaignAnalyticsReviewBreakdown({
      approved: 2,
      invalid: 1,
      needsReview: 3,
      rejected: 4,
      stale: 5,
      unreviewed: 6,
    }, 21)).toEqual({
      approved: 2,
      invalid: 1,
      needsReview: 3,
      rejected: 4,
      stale: 5,
      totalParticipants: 21,
      unreviewed: 6,
    });
  });
});
