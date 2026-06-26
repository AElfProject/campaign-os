import type {
  CampaignShellDetail,
  CampaignTask,
  ContentRevision,
  ExportPreview,
  ExportPreviewRow,
  ParticipantSnapshot,
  ParticipantTaskState,
  PublishReadiness,
} from "./types";

export const computeMissingTasks = (
  tasks: CampaignTask[],
  participant: ParticipantSnapshot,
) => tasks.filter((task) => task.required && !participant.completedTaskIds.includes(task.id));

export const deriveParticipantTaskStates = (
  tasks: CampaignTask[],
  participant: ParticipantSnapshot,
): ParticipantTaskState[] =>
  tasks.map((task) => {
    const completed = participant.completedTaskIds.includes(task.id);

    return {
      taskId: task.id,
      templateCode: task.templateCode,
      completed,
      missingRequired: task.required && !completed,
      points: task.points,
      walletCompatibility: task.walletCompatibility,
    };
  });

export const createExportPreview = (
  campaignId: string,
  participants: ParticipantSnapshot[],
  tasks: CampaignTask[],
): ExportPreview => ({
  campaignId,
  disclaimer: "Export winners does not distribute rewards.",
  rows: participants.map<ExportPreviewRow>((participant) => ({
    walletAddress: participant.walletAddress,
    accountType: participant.accountType,
    walletSource: participant.walletSource,
    localePreference: participant.localePreference,
    totalPoints: participant.totalPoints,
    rank: participant.rank,
    eligible: participant.eligible,
    missingTasks: computeMissingTasks(tasks, participant).map((task) => task.templateCode),
    riskFlags: participant.riskFlags,
  })),
});

export const computePublishReadiness = (
  campaign: Pick<CampaignShellDetail, "contractMode">,
  contentRevisions: ContentRevision[],
): PublishReadiness => {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const englishContent = contentRevisions.find((revision) => revision.locale === "en-US");
  const chineseContent = contentRevisions.find((revision) => revision.locale === "zh-CN");

  if (campaign.contractMode === "CONTRACT_CLAIM") {
    blockers.push("Contract claim mode requires high-impact manual review.");
  }

  if (!englishContent?.rewardDisclaimer?.trim()) {
    blockers.push("English reward disclaimer is required before publish.");
  }

  if (chineseContent && chineseContent.status !== "human_reviewed" && chineseContent.status !== "published") {
    warnings.push("Chinese content falls back to English until reviewed.");
  }

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
  };
};
