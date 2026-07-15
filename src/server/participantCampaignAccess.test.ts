import { describe, expect, it } from "vitest";
import {
  evaluateOwnerCampaignDetailAccess,
  evaluateParticipantCampaignAccess,
  resolveParticipantCampaignTaskAccess,
  type ParticipantCampaignAccessDecision,
} from "./participantCampaignAccess";

const campaign = (
  status: string,
  overrides: Partial<{ campaignId: string; deleted: boolean }> = {},
) => ({
  campaignId: "campaign-preview-A",
  deleted: false,
  status,
  ...overrides,
});

const participantAccess = (
  status: string,
  previewCampaignIds: readonly string[] = ["campaign-preview-A"],
) => evaluateParticipantCampaignAccess({
  audience: "issued_participant",
  campaign: campaign(status),
  previewCampaignIds,
});

describe("Participant Campaign access policy", () => {
  it.each(["scheduled", "live", "paused", "ended", "exported", "archived"])(
    "allows public lifecycle status %s without authentication",
    (status) => {
      expect(evaluateParticipantCampaignAccess({
        audience: "anonymous",
        campaign: campaign(status),
        previewCampaignIds: [],
      })).toEqual({
        campaignId: "campaign-preview-A",
        code: "CAMPAIGN_ACCESS_PUBLIC",
        outcome: "allowed",
        persistedStatus: status,
        visibility: "public",
      });
    },
  );

  it.each(["draft", "ai_draft", "human_review"])(
    "hides repository %s from anonymous list and detail",
    (status) => {
      expect(evaluateParticipantCampaignAccess({
        audience: "anonymous",
        campaign: campaign(status),
        previewCampaignIds: ["campaign-preview-A"],
      })).toEqual({
        code: "INVALID_CAMPAIGN",
        outcome: "hidden",
      });
    },
  );

  it("defaults unknown lifecycle statuses to hidden", () => {
    expect(participantAccess("future_unreviewed_status")).toEqual({
      code: "INVALID_CAMPAIGN",
      outcome: "hidden",
    });
  });

  it("fails closed for empty, other-ID, removed, missing, deleted, and changed Campaign access", () => {
    const empty = participantAccess("draft", []);
    const otherId = participantAccess("draft", ["campaign-preview-B"]);
    const allowedBeforeRemoval = participantAccess("draft");
    const removed = participantAccess("draft", []);
    const changedStatus = participantAccess("future_unreviewed_status");
    const missing = evaluateParticipantCampaignAccess({
      audience: "issued_participant",
      campaign: undefined,
      previewCampaignIds: ["campaign-preview-A"],
    });
    const deleted = evaluateParticipantCampaignAccess({
      audience: "issued_participant",
      campaign: campaign("draft", { deleted: true }),
      previewCampaignIds: ["campaign-preview-A"],
    });

    expect(empty).toMatchObject({ code: "INVALID_CAMPAIGN", outcome: "hidden" });
    expect(otherId).toMatchObject({ code: "INVALID_CAMPAIGN", outcome: "hidden" });
    expect(allowedBeforeRemoval).toMatchObject({ outcome: "allowed" });
    expect(removed).toMatchObject({ code: "INVALID_CAMPAIGN", outcome: "hidden" });
    expect(changedStatus).toMatchObject({ code: "INVALID_CAMPAIGN", outcome: "hidden" });
    expect(missing).toEqual({ code: "INVALID_CAMPAIGN", outcome: "invalid" });
    expect(deleted).toEqual({ code: "INVALID_CAMPAIGN", outcome: "invalid" });
  });

  it.each(["draft", "ai_draft", "human_review"])(
    "marks allowlisted %s as Participant preview without rewriting persisted status",
    (status) => {
      const decision = participantAccess(status);

      expect(decision).toEqual({
        campaignId: "campaign-preview-A",
        code: "CAMPAIGN_ACCESS_PREVIEW",
        outcome: "allowed",
        persistedStatus: status,
        visibility: "participant_preview",
      });
      expect(decision.persistedStatus).not.toBe("live");
    },
  );

  it.each(["draft", "ai_draft", "human_review"])(
    "allows issued Participant wildcard preview for %s without rewriting persisted status",
    (status) => {
      const decision = participantAccess(status, ["*"]);

      expect(decision).toEqual({
        campaignId: "campaign-preview-A",
        code: "CAMPAIGN_ACCESS_PREVIEW",
        outcome: "allowed",
        persistedStatus: status,
        visibility: "participant_preview",
      });
      expect(decision.persistedStatus).not.toBe("live");
    },
  );

  it("keeps wildcard preview closed to anonymous, deleted, invalid-status, and mixed policy input", () => {
    const anonymous = evaluateParticipantCampaignAccess({
      audience: "anonymous",
      campaign: campaign("draft"),
      previewCampaignIds: ["*"],
    });
    const deleted = evaluateParticipantCampaignAccess({
      audience: "issued_participant",
      campaign: campaign("draft", { deleted: true }),
      previewCampaignIds: ["*"],
    });
    const invalidStatus = participantAccess("future_unreviewed_status", ["*"]);
    const mixed = participantAccess("draft", ["*", "campaign-preview-A"]);

    expect(anonymous).toEqual({ code: "INVALID_CAMPAIGN", outcome: "hidden" });
    expect(deleted).toEqual({ code: "INVALID_CAMPAIGN", outcome: "invalid" });
    expect(invalidStatus).toEqual({ code: "INVALID_CAMPAIGN", outcome: "hidden" });
    expect(mixed).toEqual({ code: "INVALID_CAMPAIGN", outcome: "hidden" });
  });

  it("ignores client preview claims outside the narrow server policy input", () => {
    const untrustedInput = {
      audience: "issued_participant",
      campaign: campaign("draft"),
      clientPreviewCampaignId: "campaign-preview-A",
      previewCampaignIds: [],
      query: { previewCampaignId: "campaign-preview-A" },
    } as Parameters<typeof evaluateParticipantCampaignAccess>[0] & Record<string, unknown>;

    expect(evaluateParticipantCampaignAccess(untrustedInput)).toEqual({
      code: "INVALID_CAMPAIGN",
      outcome: "hidden",
    });
  });

  it("keeps Owner detail behind authentication and a later resource owner check", () => {
    expect(evaluateOwnerCampaignDetailAccess({
      authenticatedOwner: false,
      campaign: campaign("draft"),
    })).toEqual({ code: "INVALID_CAMPAIGN", outcome: "hidden" });
    expect(evaluateOwnerCampaignDetailAccess({
      authenticatedOwner: true,
      campaign: campaign("draft"),
    })).toEqual({
      code: "CAMPAIGN_OWNER_CHECK_REQUIRED",
      outcome: "allowed",
      persistedStatus: "draft",
      requiresOwnerCheck: true,
    });
  });

  it("does not accept an Owner-only route decision for Participant Task access", () => {
    let lookupCount = 0;
    const ownerDecision = evaluateOwnerCampaignDetailAccess({
      authenticatedOwner: true,
      campaign: campaign("draft"),
    });
    const decision = resolveParticipantCampaignTaskAccess({
      campaignAccess: ownerDecision,
      campaignId: "campaign-preview-A",
      loadTask: () => {
        lookupCount += 1;
        return { campaignId: "campaign-preview-A", taskId: "task-A" };
      },
      taskId: "task-A",
    });

    expect(decision).toEqual({ code: "INVALID_CAMPAIGN", outcome: "hidden" });
    expect(lookupCount).toBe(0);
  });

  it("does not reuse an allowed Campaign decision for another Campaign's Task", () => {
    let lookupCount = 0;
    const decision = resolveParticipantCampaignTaskAccess({
      campaignAccess: participantAccess("draft"),
      campaignId: "campaign-preview-B",
      loadTask: () => {
        lookupCount += 1;
        return { campaignId: "campaign-preview-B", taskId: "task-B" };
      },
      taskId: "task-B",
    });

    expect(decision).toEqual({ code: "INVALID_CAMPAIGN", outcome: "hidden" });
    expect(lookupCount).toBe(0);
  });

  it("rejects hidden Campaigns before Task lookup or mutation", () => {
    let lookupCount = 0;
    let mutationCount = 0;
    const campaignAccess: ParticipantCampaignAccessDecision = {
      code: "INVALID_CAMPAIGN",
      outcome: "hidden",
    };
    const decision = resolveParticipantCampaignTaskAccess({
      campaignAccess,
      campaignId: "campaign-preview-A",
      loadTask: () => {
        lookupCount += 1;
        return { campaignId: "campaign-preview-A", taskId: "task-A" };
      },
      taskId: "task-A",
    });

    if (decision.outcome === "allowed") {
      mutationCount += 1;
    }

    expect(decision).toEqual({ code: "INVALID_CAMPAIGN", outcome: "hidden" });
    expect(lookupCount).toBe(0);
    expect(mutationCount).toBe(0);
  });

  it.each([
    ["missing Task", undefined],
    ["Task belongs to another Campaign", { campaignId: "campaign-preview-B", taskId: "task-A" }],
    ["Task ID differs", { campaignId: "campaign-preview-A", taskId: "task-B" }],
  ])("returns stable invalid-task with no write for %s", (_case, loadedTask) => {
    let mutationCount = 0;
    const decision = resolveParticipantCampaignTaskAccess({
      campaignAccess: participantAccess("draft"),
      campaignId: "campaign-preview-A",
      loadTask: () => loadedTask,
      taskId: "task-A",
    });

    if (decision.outcome === "allowed") {
      mutationCount += 1;
    }

    expect(decision).toEqual({ code: "INVALID_TASK", outcome: "invalid" });
    expect(mutationCount).toBe(0);
  });

  it("allows a canonical Task only after Campaign visibility succeeds", () => {
    let lookupCount = 0;
    const decision = resolveParticipantCampaignTaskAccess({
      campaignAccess: participantAccess("draft"),
      campaignId: "campaign-preview-A",
      loadTask: () => {
        lookupCount += 1;
        return { campaignId: "campaign-preview-A", taskId: "task-A" };
      },
      taskId: "task-A",
    });

    expect(decision).toEqual({ code: "TASK_ACCESS_ALLOWED", outcome: "allowed" });
    expect(lookupCount).toBe(1);
  });
});
