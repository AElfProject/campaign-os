import { describe, expect, it } from "vitest";
import { createDeliveryChecklistReadinessConsole, createLaunchConsoleCampaignBundles } from "./campaign";
import { createPublishGateDecisionCenter, seededCampaignDraft } from "./builder";
import { campaignDetail } from "./fixtures";
import { createPublishDeliveryReview } from "./publishDeliveryReview";

const createSeededReview = () =>
  createPublishDeliveryReview({
    backendRuntime: {
      productionDependencyBlockers: [
        {
          code: "PRODUCTION_DATABASE_DEFERRED",
          field: "database",
          message: "Production database remains deferred for local MVP review.",
          severity: "error",
        },
      ],
      productionReady: false,
      profileId: "local-review",
      routeCoverage: {
        blockedCount: 0,
        readyCount: 3,
        reviewRequiredCount: 2,
        routeCount: 5,
      },
      status: "blocked",
    },
    campaignId: campaignDetail.id,
    deliveryChecklist: createDeliveryChecklistReadinessConsole(),
    launchBundles: createLaunchConsoleCampaignBundles(campaignDetail),
    publishGate: createPublishGateDecisionCenter(seededCampaignDraft),
    traceId: "test-trace-223",
  });

describe("createPublishDeliveryReview", () => {
  it("creates a deterministic seeded review payload", () => {
    const review = createSeededReview();
    const repeated = createSeededReview();

    expect(review.campaignId).toBe(campaignDetail.id);
    expect(review.source).toBe("api_runtime");
    expect(review.boundary["en-US"]).toContain("Local review bridge only");
    expect(review.traceId).toBe("test-trace-223");
    expect(repeated.summary).toEqual(review.summary);
    expect(repeated.deliveryChecklist.groups).toEqual(review.deliveryChecklist.groups);
  });

  it("populates publish gate counts and top next action", () => {
    const review = createSeededReview();

    expect(review.publishGate.counts.total).toBeGreaterThan(0);
    expect(review.publishGate.counts.blockers + review.publishGate.counts.warnings + review.publishGate.counts.passed)
      .toBe(review.publishGate.counts.total);
    expect(review.publishGate.approvalRoutes.length).toBeGreaterThan(0);
    expect(review.summary.topNextAction["en-US"]).not.toHaveLength(0);
  });

  it("includes v0.2 delivery checklist group coverage", () => {
    const review = createSeededReview();

    expect(review.deliveryChecklist.groups.map((group) => group.groupId)).toEqual([
      "product",
      "architecture",
      "ui",
      "contract",
      "qa",
    ]);
    expect(review.deliveryChecklist.totalItems).toBeGreaterThan(0);
    expect(review.deliveryChecklist.groups.every((group) => group.totalItems > 0)).toBe(true);
  });

  it("summarizes pre-launch, launch, and post-launch bundles", () => {
    const review = createSeededReview();

    expect(review.launchBundles.summary.totalBundles).toBe(3);
    expect(review.launchBundles.bundles.map((bundle) => bundle.stage)).toEqual([
      "pre_launch",
      "launch",
      "post_launch",
    ]);
    expect(review.summary.handoffReviewRequiredCount).toBe(review.launchBundles.summary.handoffRequiredCount);
  });

  it("keeps backend runtime and no-live side-effect flags production safe", () => {
    const review = createSeededReview();

    expect(review.backendRuntime.productionReady).toBe(false);
    expect(review.backendRuntime.status).toBe("blocked");
    expect(review.backendRuntime.productionDependencyBlockers).toHaveLength(1);
    expect(Object.values(review.backendRuntime.noLiveSideEffects).every((value) => value === false)).toBe(true);
    expect(Object.values(review.repositoryEvidence.noLiveSideEffects).every((value) => value === false)).toBe(true);
  });

  it("keeps repository evidence deterministic when provided", () => {
    const review = createPublishDeliveryReview({
      campaignId: campaignDetail.id,
      deliveryChecklist: createDeliveryChecklistReadinessConsole(),
      launchBundles: createLaunchConsoleCampaignBundles(campaignDetail),
      publishGate: createPublishGateDecisionCenter(seededCampaignDraft),
      repositoryEvidence: {
        available: true,
        completedEvidenceCount: 2,
        createdViaRepository: true,
        evidenceHashCoverage: 0.75,
        exportRowsWithEvidence: 3,
        failedEvidenceCount: 1,
        manualReviewEvidenceCount: 1,
        repositoryId: "campaign-db-repository-runtime",
        storeId: "campaign-db",
        taskEvidenceCount: 4,
      },
    });

    expect(review.repositoryEvidence).toMatchObject({
      available: true,
      completedEvidenceCount: 2,
      evidenceHashCoverage: 0.75,
      failedEvidenceCount: 1,
      manualReviewEvidenceCount: 1,
      taskEvidenceCount: 4,
    });
    expect(review.summary.repositoryEvidenceCount).toBe(4);
    expect(review.summary.exportEvidenceHashCoverage).toBe(0.75);
  });
});
