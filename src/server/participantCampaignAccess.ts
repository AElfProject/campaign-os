export const participantCampaignDraftStatuses = [
  "draft",
  "ai_draft",
  "human_review",
] as const;

export const participantCampaignPublicStatuses = [
  "scheduled",
  "live",
  "paused",
  "ended",
  "exported",
  "archived",
] as const;

export const participantCampaignPreviewAllDraftsSentinel = "*" as const;

export type ParticipantCampaignAccessAudience = "anonymous" | "issued_participant";
export type ParticipantCampaignAccessOutcome = "allowed" | "hidden" | "invalid";
export type ParticipantCampaignVisibility = "public" | "participant_preview";
export type ParticipantCampaignAccessCode =
  | "CAMPAIGN_ACCESS_PUBLIC"
  | "CAMPAIGN_ACCESS_PREVIEW"
  | "CAMPAIGN_OWNER_CHECK_REQUIRED"
  | "INVALID_CAMPAIGN";
export type ParticipantCampaignTaskAccessCode = "INVALID_CAMPAIGN" | "INVALID_TASK" | "TASK_ACCESS_ALLOWED";

export interface ParticipantCampaignAccessRecord {
  campaignId: string;
  deleted?: boolean;
  status: string;
}

export interface ParticipantCampaignAccessDecision {
  campaignId?: string;
  code: ParticipantCampaignAccessCode;
  outcome: ParticipantCampaignAccessOutcome;
  persistedStatus?: string;
  requiresOwnerCheck?: true;
  visibility?: ParticipantCampaignVisibility;
}

export interface EvaluateParticipantCampaignAccessInput {
  audience: ParticipantCampaignAccessAudience;
  campaign?: ParticipantCampaignAccessRecord | null;
  previewCampaignIds: readonly string[];
}

export interface EvaluateOwnerCampaignDetailAccessInput {
  authenticatedOwner: boolean;
  campaign?: ParticipantCampaignAccessRecord | null;
}

export interface ParticipantCampaignTaskRecord {
  campaignId: string;
  taskId: string;
}

export interface ParticipantCampaignTaskAccessDecision {
  code: ParticipantCampaignTaskAccessCode;
  outcome: ParticipantCampaignAccessOutcome;
}

export interface ResolveParticipantCampaignTaskAccessInput {
  campaignAccess: ParticipantCampaignAccessDecision;
  campaignId: string;
  loadTask: () => ParticipantCampaignTaskRecord | null | undefined;
  taskId: string;
}

const draftStatusSet = new Set<string>(participantCampaignDraftStatuses);
const publicStatusSet = new Set<string>(participantCampaignPublicStatuses);

const accessDecision = (
  decision: ParticipantCampaignAccessDecision,
): ParticipantCampaignAccessDecision => Object.freeze(decision);

const taskAccessDecision = (
  decision: ParticipantCampaignTaskAccessDecision,
): ParticipantCampaignTaskAccessDecision => Object.freeze(decision);

const invalidCampaignDecision = (
  outcome: Extract<ParticipantCampaignAccessOutcome, "hidden" | "invalid">,
) => accessDecision({ code: "INVALID_CAMPAIGN", outcome });

const isParticipantCampaignPreviewConfigured = (
  campaignId: string,
  previewCampaignIds: readonly string[],
) => {
  if (previewCampaignIds.includes(participantCampaignPreviewAllDraftsSentinel)) {
    return previewCampaignIds.length === 1;
  }

  return previewCampaignIds.includes(campaignId);
};

export const evaluateParticipantCampaignAccess = ({
  audience,
  campaign,
  previewCampaignIds,
}: EvaluateParticipantCampaignAccessInput): ParticipantCampaignAccessDecision => {
  if (!campaign || campaign.deleted || campaign.campaignId.trim().length === 0) {
    return invalidCampaignDecision("invalid");
  }

  if (publicStatusSet.has(campaign.status)) {
    return accessDecision({
      campaignId: campaign.campaignId,
      code: "CAMPAIGN_ACCESS_PUBLIC",
      outcome: "allowed",
      persistedStatus: campaign.status,
      visibility: "public",
    });
  }

  if (
    draftStatusSet.has(campaign.status)
    && audience === "issued_participant"
    && isParticipantCampaignPreviewConfigured(campaign.campaignId, previewCampaignIds)
  ) {
    return accessDecision({
      campaignId: campaign.campaignId,
      code: "CAMPAIGN_ACCESS_PREVIEW",
      outcome: "allowed",
      persistedStatus: campaign.status,
      visibility: "participant_preview",
    });
  }

  return invalidCampaignDecision("hidden");
};

export const evaluateOwnerCampaignDetailAccess = ({
  authenticatedOwner,
  campaign,
}: EvaluateOwnerCampaignDetailAccessInput): ParticipantCampaignAccessDecision => {
  if (!campaign || campaign.deleted || campaign.campaignId.trim().length === 0) {
    return invalidCampaignDecision("invalid");
  }

  if (!authenticatedOwner) {
    return invalidCampaignDecision("hidden");
  }

  return accessDecision({
    code: "CAMPAIGN_OWNER_CHECK_REQUIRED",
    outcome: "allowed",
    persistedStatus: campaign.status,
    requiresOwnerCheck: true,
  });
};

export const resolveParticipantCampaignTaskAccess = ({
  campaignAccess,
  campaignId,
  loadTask,
  taskId,
}: ResolveParticipantCampaignTaskAccessInput): ParticipantCampaignTaskAccessDecision => {
  if (campaignAccess.outcome !== "allowed" || campaignAccess.visibility === undefined) {
    return taskAccessDecision({
      code: "INVALID_CAMPAIGN",
      outcome: campaignAccess.outcome === "invalid" ? "invalid" : "hidden",
    });
  }

  if (campaignId.trim().length === 0) {
    return taskAccessDecision({ code: "INVALID_CAMPAIGN", outcome: "invalid" });
  }

  if (campaignAccess.campaignId !== campaignId) {
    return taskAccessDecision({ code: "INVALID_CAMPAIGN", outcome: "hidden" });
  }

  if (taskId.trim().length === 0) {
    return taskAccessDecision({ code: "INVALID_TASK", outcome: "invalid" });
  }

  const task = loadTask();

  if (!task || task.campaignId !== campaignId || task.taskId !== taskId) {
    return taskAccessDecision({ code: "INVALID_TASK", outcome: "invalid" });
  }

  return taskAccessDecision({ code: "TASK_ACCESS_ALLOWED", outcome: "allowed" });
};
