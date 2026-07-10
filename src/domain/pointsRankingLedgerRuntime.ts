import {
  createParticipationReadModel,
  deriveParticipantTaskStates,
} from "./campaign";
import type {
  CampaignShellDetail,
  LocalizedText,
  ParticipantSnapshot,
  PointsLedgerNoLiveSideEffects,
  PointsLedgerRuntimeDiagnostic,
  PointsLedgerRuntimeEvent,
  PointsLedgerRuntimeSection,
  PointsRankingLedgerRuntime,
  PointsRankingLedgerRuntimeSummary,
  PointsRankingSnapshotRow,
  PointsRankingSnapshotSection,
  TaskVerificationStatus,
  VerificationEvidenceSource,
} from "./types";

const text = (enUS: string, zhCN: string, zhTW = enUS): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
});

export const pointsRankingLedgerRuntimeBoundary = text(
  "Local points ranking ledger runtime only. No production Pixiepoints ledger write, backend ledger write, provider/indexer execution, wallet signature, contract root write, export file write, reward custody, or reward distribution is executed.",
  "仅本地 points ranking ledger runtime。不会执行生产 Pixiepoints 账本写入、后端账本写入、provider/indexer 执行、钱包签名、合约 root 写入、导出文件写入、奖励托管或发奖。",
);

const ledgerBoundary = text(
  "Ledger events are derived from seeded task state for review only. No production Pixiepoints or backend ledger write is executed.",
  "Ledger event 仅由 seeded 任务状态派生供审核使用。不会执行生产 Pixiepoints 或后端账本写入。",
);

const rankingBoundary = text(
  "Ranking rows are deterministic off-chain review inputs; they do not approve winners, reward custody, or reward distribution.",
  "Ranking 行是 deterministic off-chain 审核输入；不会批准 winners、奖励托管或发奖。",
);

const rootNextAction = text(
  "Review evidence hashes and eligibility rows before any future CampaignPointsLedgerV2 or eligibility root publication. This preview performs no contract write, no reward custody, and no reward distribution.",
  "未来发布 CampaignPointsLedgerV2 或 eligibility root 前，先审核 evidence hash 与资格行。本 preview 不执行合约写入、奖励托管或发奖。",
);

const topNextAction = text(
  "Review local ledger events, ranking rows, and eligibility root preview before MVP sign-off; production ledger writes and rewards remain disabled.",
  "MVP 签核前先审核本地 ledger event、ranking 行与 eligibility root preview；生产账本写入与奖励仍保持禁用。",
);

const noLiveSideEffects = (): PointsLedgerNoLiveSideEffects => ({
  liveBackendLedgerWrite: false,
  liveContractWrite: false,
  liveEligibilityRootPublished: false,
  liveExportFileWritten: false,
  liveIndexerExecuted: false,
  livePixiepointsLedgerWrite: false,
  liveProviderExecuted: false,
  liveRewardCustody: false,
  liveRewardDistribution: false,
  liveWalletSignature: false,
});

const evidenceSourceLabel = (source: VerificationEvidenceSource) => source;

const countStatus = (
  events: readonly PointsLedgerRuntimeEvent[],
  statuses: readonly TaskVerificationStatus[],
) => events.filter((event) => statuses.includes(event.status)).length;

const deterministicHash = (value: string) => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
};

const eventIdFor = (
  campaignId: string,
  walletAddress: string,
  taskId: string,
  status: TaskVerificationStatus,
) => `${campaignId}:${walletAddress}:${taskId}:${status}`;

const createLedgerEventsForParticipant = (
  campaign: CampaignShellDetail,
  participant: ParticipantSnapshot,
): PointsLedgerRuntimeEvent[] => {
  const taskStates = deriveParticipantTaskStates([...campaign.tasks], participant);

  return taskStates.map((state) => {
    const task = campaign.tasks.find((candidate) => candidate.id === state.taskId);

    return {
      accountType: participant.accountType,
      campaignId: campaign.id,
      eventId: eventIdFor(campaign.id, participant.walletAddress, state.taskId, state.status),
      evidenceHash: state.evidence.evidenceHash,
      evidenceSource: evidenceSourceLabel(state.canonicalEvidenceSource),
      localePreference: participant.localePreference,
      pointsAwarded: state.pointsAwarded,
      pointsAvailable: state.pointsAvailable,
      riskFlags: Array.from(new Set([...participant.riskFlags, ...state.riskFlags])).sort(),
      status: state.status,
      taskId: state.taskId,
      templateCode: state.templateCode,
      verificationType: task?.verificationType ?? "MANUAL",
      walletAddress: participant.walletAddress,
      walletSource: participant.walletSource,
    };
  });
};

const createLedgerSection = (
  campaign: CampaignShellDetail,
): PointsLedgerRuntimeSection => {
  const events = campaign.participants.flatMap((participant) =>
    createLedgerEventsForParticipant(campaign, participant),
  );

  return {
    boundary: ledgerBoundary,
    completedEvents: countStatus(events, ["completed"]),
    events,
    failedEvents: countStatus(events, ["failed"]),
    manualReviewEvents: countStatus(events, ["manual_review"]),
    pendingEvents: countStatus(events, ["ready", "pending"]),
    totalEvents: events.length,
  };
};

const templateCodesForMissingTasks = (
  campaign: CampaignShellDetail,
  missingTaskIds: readonly string[],
) =>
  missingTaskIds.map((taskId) =>
    campaign.tasks.find((task) => task.id === taskId)?.templateCode ?? taskId,
  );

const createRankingRows = (
  campaign: CampaignShellDetail,
  events: readonly PointsLedgerRuntimeEvent[],
): PointsRankingSnapshotRow[] =>
  [...campaign.participants]
    .sort((left, right) => {
      const pointsDelta = right.totalPoints - left.totalPoints;

      if (pointsDelta !== 0) {
        return pointsDelta;
      }

      const seededRankDelta = (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER);

      if (seededRankDelta !== 0) {
        return seededRankDelta;
      }

      return left.walletAddress.localeCompare(right.walletAddress);
    })
    .map((participant, index) => {
      const participation = createParticipationReadModel(campaign, participant);
      const participantEvents = events.filter((event) => event.walletAddress === participant.walletAddress);
      const riskFlags = Array.from(new Set([
        ...participant.riskFlags,
        ...participantEvents.flatMap((event) => event.riskFlags),
        ...participation.referral.riskFlags,
      ])).sort();

      return {
        accountType: participant.accountType,
        eligible: participation.eligibility.status === "eligible" || participant.eligible,
        evidenceHashes: Array.from(new Set(participantEvents.map((event) => event.evidenceHash))).sort(),
        localePreference: participant.localePreference,
        missingTasks: templateCodesForMissingTasks(campaign, participation.eligibility.missingTaskIds),
        rank: index + 1,
        riskFlags,
        totalPoints: participant.totalPoints,
        walletAddress: participant.walletAddress,
        walletSource: participant.walletSource,
      };
    });

const createRankingSection = (
  campaign: CampaignShellDetail,
  ledger: PointsLedgerRuntimeSection,
): PointsRankingSnapshotSection => ({
  boundary: rankingBoundary,
  generatedFromLedgerEventCount: ledger.totalEvents,
  rows: createRankingRows(campaign, ledger.events),
});

const createEligibilityRoot = (campaignId: string, rows: readonly PointsRankingSnapshotRow[]) => {
  const evidenceHashes = Array.from(new Set(rows.flatMap((row) => row.evidenceHashes))).sort();
  const rootInput = rows
    .map((row) => [
      row.rank,
      row.walletAddress,
      row.totalPoints,
      row.eligible ? "eligible" : "not_eligible",
      row.missingTasks.join(","),
      row.riskFlags.join(","),
      row.evidenceHashes.join(","),
    ].join("|"))
    .join("\n");

  return {
    contractRootMode: "none" as const,
    eligibleWalletCount: rows.filter((row) => row.eligible).length,
    evidenceHashes,
    generationMode: "local_preview" as const,
    nextAction: rootNextAction,
    pointsTotal: rows.reduce((total, row) => total + row.totalPoints, 0),
    rootHash: `local-root-${deterministicHash(`${campaignId}\n${rootInput}`)}`,
    rootId: `eligibility-root-preview:${campaignId}:local-v1`,
    schemaVersion: "local-v1" as const,
    totalRows: rows.length,
  };
};

const createSummary = (
  ledger: PointsLedgerRuntimeSection,
  ranking: PointsRankingSnapshotSection,
): PointsRankingLedgerRuntimeSummary => ({
  completedEvents: ledger.completedEvents,
  eligibleWallets: ranking.rows.filter((row) => row.eligible).length,
  failedEvents: ledger.failedEvents,
  manualReviewEvents: ledger.manualReviewEvents,
  pendingEvents: ledger.pendingEvents,
  rankedWallets: ranking.rows.length,
  riskFlaggedWallets: ranking.rows.filter((row) => row.riskFlags.length > 0).length,
  topNextAction,
  totalLedgerEvents: ledger.totalEvents,
  totalPoints: ranking.rows.reduce((total, row) => total + row.totalPoints, 0),
});

const createDiagnostics = (): PointsLedgerRuntimeDiagnostic[] => [
  {
    code: "POINTS_LEDGER_LOCAL_REVIEW_ONLY",
    message: text(
      "Points events are local review records only; no production Pixiepoints or backend ledger write happened.",
      "Points event 仅为本地审核记录；没有发生生产 Pixiepoints 或后端账本写入。",
    ),
    severity: "info",
    source: "ledger",
  },
  {
    code: "ELIGIBILITY_ROOT_CONTRACT_WRITE_DISABLED",
    message: text(
      "Eligibility root is a deterministic preview; CampaignPointsLedgerV2 and contract root publication are deferred.",
      "Eligibility root 是 deterministic preview；CampaignPointsLedgerV2 与 contract root 发布均已延后。",
    ),
    severity: "info",
    source: "eligibilityRoot",
  },
];

export const createPointsRankingLedgerRuntime = (
  campaign: CampaignShellDetail,
  options: { source?: PointsRankingLedgerRuntime["source"]; traceId?: string } = {},
): PointsRankingLedgerRuntime => {
  const ledger = createLedgerSection(campaign);
  const ranking = createRankingSection(campaign, ledger);

  return {
    boundary: pointsRankingLedgerRuntimeBoundary,
    campaignId: campaign.id,
    diagnostics: createDiagnostics(),
    eligibilityRoot: createEligibilityRoot(campaign.id, ranking.rows),
    ledger,
    noLiveSideEffects: noLiveSideEffects(),
    ranking,
    source: options.source ?? "seeded_runtime",
    status: "review_required",
    summary: createSummary(ledger, ranking),
    ...(options.traceId ? { traceId: options.traceId } : {}),
  };
};
