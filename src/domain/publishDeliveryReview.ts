import type {
  DeliveryChecklistGroupId,
  DeliveryChecklistReadinessConsole,
  LaunchConsoleCampaignBundleSurface,
  LocalizedText,
  OwnerRole,
  PublishDeliveryReview,
  PublishDeliveryReviewBackendRuntimeSection,
  PublishDeliveryReviewChecklistGroupCoverage,
  PublishDeliveryReviewDiagnostic,
  PublishDeliveryReviewGateSection,
  PublishDeliveryReviewItem,
  PublishDeliveryReviewLaunchState,
  PublishDeliveryReviewRepositoryEvidenceSection,
  PublishDeliveryReviewSource,
  PublishDeliveryReviewStatus,
} from "./types";
import type { PublishGateDecisionCenter, PublishGateItem } from "./builder";

export const publishDeliveryReviewBoundary: LocalizedText = {
  "en-US":
    "Local review bridge only. No production publish, provider calls, wallet signatures, contract writes, storage writes, reward custody, reward distribution, queue execution, scheduler execution, or analytics warehouse writes are executed.",
  "zh-CN":
    "仅本地审核桥接。不会执行生产发布、provider 调用、钱包签名、合约写入、storage 写入、奖励托管、发奖、queue 执行、scheduler 执行或 analytics warehouse 写入。",
  "zh-TW":
    "Local review bridge only. No production publish, provider calls, wallet signatures, contract writes, storage writes, reward custody, reward distribution, queue execution, scheduler execution, or analytics warehouse writes are executed.",
};

const repositoryBoundary: LocalizedText = {
  "en-US":
    "Repository evidence is local-review metadata only; it does not write storage, contract roots, rewards, or provider state.",
  "zh-CN":
    "Repository evidence 仅为本地审核 metadata；不会写入 storage、contract root、奖励或 provider 状态。",
  "zh-TW":
    "Repository evidence is local-review metadata only; it does not write storage, contract roots, rewards, or provider state.",
};

const defaultNextAction: LocalizedText = {
  "en-US":
    "Review publish blockers, delivery checklist gaps, launch handoffs, repository evidence, and backend production blockers before MVP sign-off.",
  "zh-CN":
    "MVP 签核前先审核发布阻断、交付清单缺口、launch handoff、repository evidence 与 backend production blockers。",
  "zh-TW":
    "Review publish blockers, delivery checklist gaps, launch handoffs, repository evidence, and backend production blockers before MVP sign-off.",
};

const seededRepositoryDiagnostic: PublishDeliveryReviewDiagnostic = {
  code: "REPOSITORY_EVIDENCE_SEEDED_ONLY",
  message: {
    "en-US": "No Campaign DB repository evidence is attached to this seeded review payload.",
    "zh-CN": "该 seeded review payload 未附带 Campaign DB repository evidence。",
    "zh-TW": "No Campaign DB repository evidence is attached to this seeded review payload.",
  },
  severity: "info",
  source: "repositoryEvidence",
};

export interface PublishDeliveryReviewRepositoryEvidenceInput {
  available?: boolean;
  repositoryId?: string;
  storeId?: string;
  createdViaRepository?: boolean;
  taskEvidenceCount?: number;
  completedEvidenceCount?: number;
  manualReviewEvidenceCount?: number;
  failedEvidenceCount?: number;
  evidenceHashCoverage?: number;
  exportRowsWithEvidence?: number;
}

export interface PublishDeliveryReviewBackendRuntimeInput {
  productionReady?: boolean;
  status?: "ready" | "blocked" | "scaffold";
  profileId?: string;
  productionDependencyBlockers?: Array<{
    code: string;
    field: string;
    message: string;
    severity: "error" | "warning" | "info";
  }>;
  noLiveSideEffects?: Record<string, boolean>;
  routeCoverage?: {
    routeCount: number;
    reviewRequiredCount: number;
    readyCount: number;
    blockedCount: number;
  };
}

export interface CreatePublishDeliveryReviewInput {
  campaignId: string;
  deliveryChecklist: DeliveryChecklistReadinessConsole & { campaignId?: string };
  launchBundles: LaunchConsoleCampaignBundleSurface;
  publishGate: PublishGateDecisionCenter;
  backendRuntime?: PublishDeliveryReviewBackendRuntimeInput;
  diagnostics?: PublishDeliveryReviewDiagnostic[];
  lastReviewedAt?: string;
  repositoryEvidence?: PublishDeliveryReviewRepositoryEvidenceInput;
  source?: PublishDeliveryReviewSource;
  traceId?: string;
}

const clampCoverage = (value: number | undefined) => {
  if (value === undefined || Number.isNaN(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
};

const countStatus = <TStatus extends string>(
  items: readonly { status: TStatus }[],
  status: TStatus,
) => items.filter((item) => item.status === status).length;

const mapLaunchState = (state: PublishGateDecisionCenter["launchState"]): PublishDeliveryReviewLaunchState =>
  state === "blocker" ? "blocked" : state;

const mapStatus = ({
  backendRuntime,
  deliveryChecklist,
  launchState,
  repositoryEvidence,
  source,
}: {
  backendRuntime: PublishDeliveryReviewBackendRuntimeSection;
  deliveryChecklist: DeliveryChecklistReadinessConsole;
  launchState: PublishDeliveryReviewLaunchState;
  repositoryEvidence: PublishDeliveryReviewRepositoryEvidenceSection;
  source: PublishDeliveryReviewSource;
}): PublishDeliveryReviewStatus => {
  if (source === "error_fallback" || source === "seeded_fallback") {
    return "fallback";
  }

  if (
    launchState === "blocked" ||
    deliveryChecklist.summary.blockedItems > 0 ||
    backendRuntime.productionDependencyBlockers.length > 0
  ) {
    return "blocked";
  }

  if (
    launchState === "warning" ||
    deliveryChecklist.summary.needsReviewItems > 0 ||
    !repositoryEvidence.available
  ) {
    return "warning";
  }

  return "ready";
};

const reviewGateItem = (gate: PublishGateItem): PublishDeliveryReviewItem => ({
  id: gate.id,
  nextAction: gate.nextAction,
  ownerRole: gate.ownerRole,
  status: gate.status,
  title: gate.title,
});

const createPublishGateSection = (
  publishGate: PublishGateDecisionCenter,
): PublishDeliveryReviewGateSection => ({
  approvalRoutes: publishGate.approvalRoutes.map((route) => ({
    gateIds: route.gateIds,
    label: route.label,
    nextAction: route.nextAction,
    ownerRole: route.ownerRole,
    status: route.status,
  })),
  boundary: publishGate.boundary,
  counts: publishGate.counts,
  launchState: publishGate.launchState === "blocker" ? "blocked" : publishGate.launchState,
  ready: publishGate.ready,
  topBlockers: publishGate.gates.filter((gate) => gate.status === "blocker").slice(0, 3).map(reviewGateItem),
  topWarnings: publishGate.gates.filter((gate) => gate.status === "warning").slice(0, 3).map(reviewGateItem),
});

const ownerForChecklistGroup: Record<DeliveryChecklistGroupId, OwnerRole> = {
  architecture: "internal_operator",
  contract: "contract_reviewer",
  product: "project_owner",
  qa: "internal_operator",
  ui: "internal_operator",
};

const createChecklistGroupCoverage = (
  group: DeliveryChecklistReadinessConsole["groups"][number],
): PublishDeliveryReviewChecklistGroupCoverage => ({
  blockedItems: countStatus(group.items, "blocked"),
  groupId: group.id,
  ownerRole: ownerForChecklistGroup[group.id],
  passedItems: countStatus(group.items, "covered"),
  reviewRequiredItems: countStatus(group.items, "needs_review"),
  topNextAction: group.items.find((item) => item.status === "blocked" || item.status === "needs_review")?.nextAction ??
    group.summary,
  totalItems: group.items.length,
  warningItems: countStatus(group.items, "deferred"),
});

const createRepositoryEvidenceSection = (
  input: PublishDeliveryReviewRepositoryEvidenceInput | undefined,
): PublishDeliveryReviewRepositoryEvidenceSection => {
  const taskEvidenceCount = input?.taskEvidenceCount ?? 0;

  return {
    available: input?.available ?? taskEvidenceCount > 0,
    boundary: repositoryBoundary,
    completedEvidenceCount: input?.completedEvidenceCount ?? 0,
    createdViaRepository: input?.createdViaRepository,
    evidenceHashCoverage: clampCoverage(input?.evidenceHashCoverage),
    exportRowsWithEvidence: input?.exportRowsWithEvidence ?? 0,
    failedEvidenceCount: input?.failedEvidenceCount ?? 0,
    manualReviewEvidenceCount: input?.manualReviewEvidenceCount ?? 0,
    noLiveSideEffects: {
      liveContractExecuted: false,
      liveProviderExecuted: false,
      liveRewardExecuted: false,
      liveStorageExecuted: false,
    },
    repositoryId: input?.repositoryId,
    storeId: input?.storeId,
    taskEvidenceCount,
  };
};

const normalizeNoLiveFlags = (
  flags: Record<string, boolean> | undefined,
): Record<string, false> => {
  const defaults = {
    analyticsWarehouseWriteExecuted: false,
    contractWriteExecuted: false,
    migrationRunnerExecuted: false,
    productionDatabaseWriteExecuted: false,
    providerCallExecuted: false,
    queueExecutionExecuted: false,
    rewardCustodyExecuted: false,
    rewardDistributionExecuted: false,
    schedulerExecutionExecuted: false,
    storageWriteExecuted: false,
    walletSignatureExecuted: false,
  } satisfies Record<string, false>;

  return Object.fromEntries(
    Object.keys({ ...defaults, ...flags }).map((key) => [key, false]),
  ) as Record<string, false>;
};

const createBackendRuntimeSection = (
  input: PublishDeliveryReviewBackendRuntimeInput | undefined,
): PublishDeliveryReviewBackendRuntimeSection => {
  const blockers = input?.productionDependencyBlockers ?? [];
  const routeCoverage = input?.routeCoverage ?? {
    blockedCount: blockers.length,
    readyCount: 0,
    reviewRequiredCount: 0,
    routeCount: 0,
  };

  return {
    noLiveSideEffects: normalizeNoLiveFlags(input?.noLiveSideEffects),
    productionDependencyBlockers: blockers,
    productionReady: false,
    profileId: input?.profileId ?? "local-review",
    routeCoverage,
    status: input?.status ?? (blockers.length > 0 || input?.productionReady === false ? "blocked" : "scaffold"),
    tracePolicy: {
      failureEnvelopeTraceId: true,
      successEnvelopeTraceId: true,
      traceHeaderName: "x-campaign-os-trace-id",
    },
  };
};

export const createPublishDeliveryReview = ({
  backendRuntime,
  campaignId,
  deliveryChecklist,
  diagnostics,
  lastReviewedAt,
  launchBundles,
  publishGate,
  repositoryEvidence,
  source = "api_runtime",
  traceId,
}: CreatePublishDeliveryReviewInput): PublishDeliveryReview => {
  if (!campaignId.trim()) {
    throw new Error("Publish delivery review requires a non-empty campaignId.");
  }

  const repositoryEvidenceSection = createRepositoryEvidenceSection(repositoryEvidence);
  const backendRuntimeSection = createBackendRuntimeSection(backendRuntime);
  const launchState = mapLaunchState(publishGate.launchState);
  const status = mapStatus({
    backendRuntime: backendRuntimeSection,
    deliveryChecklist,
    launchState,
    repositoryEvidence: repositoryEvidenceSection,
    source,
  });
  const checklistGroups = deliveryChecklist.groups.map(createChecklistGroupCoverage);
  const reviewDiagnostics = [
    ...(repositoryEvidenceSection.available ? [] : [seededRepositoryDiagnostic]),
    ...(diagnostics ?? []),
  ];

  return {
    backendRuntime: backendRuntimeSection,
    boundary: publishDeliveryReviewBoundary,
    campaignId,
    deliveryChecklist: {
      blockedItems: deliveryChecklist.summary.blockedItems,
      boundary: deliveryChecklist.boundary,
      coveredItems: deliveryChecklist.summary.coveredItems,
      deferredItems: deliveryChecklist.summary.deferredItems,
      groups: checklistGroups,
      needsReviewItems: deliveryChecklist.summary.needsReviewItems,
      topNextAction: deliveryChecklist.summary.nextAction,
      totalItems: deliveryChecklist.summary.totalItems,
    },
    diagnostics: reviewDiagnostics,
    lastReviewedAt: lastReviewedAt ?? publishGate.lastReviewedAt,
    launchBundles: {
      boundary: launchBundles.boundary,
      bundles: launchBundles.bundles.map((bundle) => ({
        id: bundle.id,
        nextAction: bundle.nextAction,
        ownerRole: bundle.ownerRole,
        stage: bundle.stage,
        status: bundle.status,
        title: bundle.title,
      })),
      handoffs: launchBundles.handoffs.map((handoff) => ({
        id: handoff.id,
        nextAction: handoff.nextAction,
        readiness: handoff.readiness,
        reviewState: handoff.reviewState,
        riskLevel: handoff.riskLevel,
        title: handoff.title,
      })),
      nextAction: launchBundles.nextAction,
      summary: launchBundles.summary,
    },
    launchState,
    publishGate: createPublishGateSection(publishGate),
    ready: status === "ready",
    repositoryEvidence: repositoryEvidenceSection,
    source,
    status,
    summary: {
      blockerCount: publishGate.counts.blockers + deliveryChecklist.summary.blockedItems,
      checklistCoveredCount: deliveryChecklist.summary.coveredItems,
      checklistTotalCount: deliveryChecklist.summary.totalItems,
      exportEvidenceHashCoverage: repositoryEvidenceSection.evidenceHashCoverage,
      handoffReviewRequiredCount: launchBundles.summary.handoffRequiredCount,
      launchBundleCount: launchBundles.summary.totalBundles,
      passedCount: publishGate.counts.passed + deliveryChecklist.summary.coveredItems,
      productionBlockerCount: backendRuntimeSection.productionDependencyBlockers.length,
      repositoryEvidenceCount: repositoryEvidenceSection.taskEvidenceCount,
      topNextAction:
        publishGate.gates.find((gate) => gate.status === "blocker" || gate.status === "warning")?.nextAction ??
        deliveryChecklist.summary.nextAction ??
        launchBundles.nextAction ??
        defaultNextAction,
      warningCount:
        publishGate.counts.warnings +
        deliveryChecklist.summary.needsReviewItems +
        deliveryChecklist.summary.deferredItems,
    },
    traceId,
  };
};
