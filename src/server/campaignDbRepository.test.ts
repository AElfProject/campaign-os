import { mkdir, readFile } from "node:fs/promises";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { supportedLocales } from "../domain/types";
import {
  CampaignDbRepositoryError,
  createCampaignDbRepository,
  sanitizeCampaignDbDiagnosticValue,
} from "./campaignDbRepository";

const validDraftInput = () => ({
  duration: "2026-07-07 to 2026-07-14",
  endTime: "2026-07-14T00:00:00.000Z",
  goal: "Validate Campaign DB vertical slice",
  ownerAddress: "2F4M176Owner",
  projectId: "project-m176",
  rewardDescription: "M176 smoke reward",
  startTime: "2026-07-07T00:00:00.000Z",
});

const validTaskDraftInput = (campaignId: string) => ({
  campaignId,
  evidenceRule: { minAmount: 1, source: "AELFSCAN" },
  points: 120,
  required: true,
  templateCode: "bridge_ebridge",
  verificationType: "ON_CHAIN" as const,
  walletCompatibility: "ANY" as const,
});

const validCompletionInput = (campaignId: string, taskId: string) => ({
  accountType: "EOA" as const,
  campaignId,
  evidenceHash: "evidence-hash:bridge-ebridge",
  evidenceSource: "AELFSCAN" as const,
  status: "completed" as const,
  taskId,
  walletAddress: "2F4CompletionWallet",
  walletSource: "PORTKEY_EOA_EXTENSION" as const,
});

const validReferralBindingInput = (campaignId: string) => ({
  campaignId,
  inviteeAccountType: "EOA" as const,
  inviteeWalletAddress: "2F4InviteeWallet",
  inviteeWalletSource: "PORTKEY_EOA_EXTENSION" as const,
  referrerAccountType: "AA" as const,
  referrerWalletAddress: "2F4ReferrerWallet",
  referrerWalletSource: "PORTKEY_AA" as const,
});

const hasOwnKeyDeep = (value: unknown, key: string): boolean => {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasOwnKeyDeep(item, key));
  }

  const record = value as Record<string, unknown>;

  return Object.prototype.hasOwnProperty.call(record, key)
    || Object.values(record).some((item) => hasOwnKeyDeep(item, key));
};

const withTempStorePath = async <T>(operation: (filePath: string) => Promise<T>) => {
  const directory = await mkdtemp(join(tmpdir(), "campaign-os-repository-"));

  try {
    return await operation(join(directory, "campaign-drafts.json"));
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
};

describe("Campaign DB repository", () => {
  it("creates a draft with v0.2 fields and deterministic defaults", async () => {
    const repository = createCampaignDbRepository();

    const draft = await repository.createDraft(validDraftInput(), {
      traceId: "trace-create",
    });

    expect(draft).toMatchObject({
      id: "campaign-db-draft-0001",
      projectId: "project-m176",
      ownerAddress: "2F4M176Owner",
      status: "draft",
      defaultLocale: "en-US",
      supportedLocales: [...supportedLocales],
      walletPolicy: "ANY",
      contractMode: "OFF_CHAIN_MVP",
      startTime: "2026-07-07T00:00:00.000Z",
      endTime: "2026-07-14T00:00:00.000Z",
      goal: "Validate Campaign DB vertical slice",
      duration: "2026-07-07 to 2026-07-14",
      rewardDescription: "M176 smoke reward",
      publishReadiness: {
        blockers: [],
        ready: true,
        warnings: [],
      },
    });
    expect(draft.createdAt).toBe("2026-07-06T00:00:00.000Z");
    expect(draft.updatedAt).toBe(draft.createdAt);
  });

  it("gets and lists repository-created drafts through indexed filters", async () => {
    const repository = createCampaignDbRepository();
    const first = await repository.createDraft({
      ...validDraftInput(),
      ownerAddress: "owner-a",
      projectId: "project-a",
    });
    const second = await repository.createDraft({
      ...validDraftInput(),
      ownerAddress: "owner-b",
      projectId: "project-b",
      supportedLocales: ["en-US", "zh-CN"],
      walletPolicy: "AA_ONLY",
    });

    await expect(repository.getById(first.id)).resolves.toMatchObject({
      id: first.id,
      projectId: "project-a",
      repository: expect.objectContaining({
        adapterId: "campaign-db-deterministic-adapter",
        createdViaRepository: true,
        storeId: "campaign-db",
      }),
    });
    await expect(repository.getById("missing-campaign")).resolves.toBeUndefined();
    await expect(repository.list({ projectId: "project-b" })).resolves.toEqual([
      expect.objectContaining({ id: second.id }),
    ]);
    await expect(repository.list({ ownerAddress: "owner-a", status: "draft" })).resolves.toEqual([
      expect.objectContaining({ id: first.id }),
    ]);
  });

  it("adds task drafts to repository-created campaign projections", async () => {
    const repository = createCampaignDbRepository();
    const campaign = await repository.createDraft(validDraftInput());

    const task = await repository.addTaskDraft(validTaskDraftInput(campaign.id), {
      traceId: "trace-task-create",
    });

    expect(task).toMatchObject({
      id: "campaign-db-task-draft-0001",
      campaignId: campaign.id,
      evidenceRule: { minAmount: 1, source: "AELFSCAN" },
      points: 120,
      required: true,
      templateCode: "bridge_ebridge",
      verificationType: "ON_CHAIN",
      walletCompatibility: "ANY",
    });
    expect(task.createdAt).toBe("2026-07-06T00:00:00.000Z");
    expect(task.updatedAt).toBe(task.createdAt);
    await expect(repository.getById(campaign.id)).resolves.toMatchObject({
      id: campaign.id,
      tasks: [
        expect.objectContaining({
          id: "campaign-db-task-draft-0001",
          templateCode: "bridge_ebridge",
        }),
      ],
    });
    await expect(repository.list({ projectId: "project-m176" })).resolves.toEqual([
      expect.objectContaining({
        id: campaign.id,
        tasks: [
          expect.objectContaining({
            id: "campaign-db-task-draft-0001",
            campaignId: campaign.id,
          }),
        ],
      }),
    ]);
  });

  it("captures deterministic no-live transaction, command, and query events", async () => {
    const repository = createCampaignDbRepository();
    const draft = await repository.createDraft(validDraftInput(), {
      traceId: "trace-events",
    });
    await repository.getById(draft.id, { traceId: "trace-lookup" });
    await repository.list({ status: "draft" }, { traceId: "trace-list" });

    const health = await repository.health();

    expect(health).toMatchObject({
      id: "campaign-db-repository-runtime",
      storeId: "campaign-db",
      adapterId: "campaign-db-deterministic-adapter",
      selectedMode: "deterministic_test",
      status: "ready",
      recordCount: 1,
      eventCount: 6,
      liveConnectionAttempted: false,
      liveQueryExecutionEnabled: false,
      liveMigrationExecutionEnabled: false,
      productionReady: false,
      validation: { issues: [], valid: true },
    });
    expect(repository.getEvents().map((event) => event.type)).toEqual([
      "transaction.begin",
      "command.planned",
      "command.insert",
      "transaction.commit",
      "query.lookup",
      "query.list",
    ]);
    expect(repository.getEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entity: "Campaign",
          liveExecution: false,
          storeId: "campaign-db",
          traceId: "trace-events",
        }),
      ]),
    );
  });

  it("captures deterministic no-live task transaction events", async () => {
    const repository = createCampaignDbRepository();
    const campaign = await repository.createDraft(validDraftInput(), {
      traceId: "trace-campaign-events",
    });

    await repository.addTaskDraft(validTaskDraftInput(campaign.id), {
      traceId: "trace-task-events",
    });

    const health = await repository.health();

    expect(health).toMatchObject({
      eventCount: 8,
      liveConnectionAttempted: false,
      liveMigrationExecutionEnabled: false,
      liveQueryExecutionEnabled: false,
      productionReady: false,
      taskRecordCount: 1,
    });
    expect(repository.getEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entity: "CampaignTask",
          liveExecution: false,
          operation: "insert_campaign_task_draft",
          traceId: "trace-task-events",
          type: "command.insert",
        }),
      ]),
    );
  });

  it("stores task completions with wallet provenance and no-live events", async () => {
    const repository = createCampaignDbRepository();
    const campaign = await repository.createDraft(validDraftInput(), {
      traceId: "trace-completion-campaign",
    });
    const task = await repository.addTaskDraft(validTaskDraftInput(campaign.id), {
      traceId: "trace-completion-task",
    });

    const completion = await repository.upsertTaskCompletion!(validCompletionInput(campaign.id, task.id), {
      traceId: "trace-completion-upsert",
    });

    expect(completion).toMatchObject({
      accountType: "EOA",
      campaignId: campaign.id,
      completedAt: "2026-07-06T00:00:00.000Z",
      evidenceHash: "evidence-hash:bridge-ebridge",
      evidenceSource: "AELFSCAN",
      id: "campaign-db-task-completion-0001",
      pointsAwarded: 120,
      status: "completed",
      taskId: task.id,
      walletAddress: "2F4CompletionWallet",
      walletSource: "PORTKEY_EOA_EXTENSION",
    });
    await expect(repository.getById(campaign.id)).resolves.toMatchObject({
      completions: [
        expect.objectContaining({
          id: "campaign-db-task-completion-0001",
          taskId: task.id,
        }),
      ],
    });
    await expect(repository.health()).resolves.toMatchObject({
      completionRecordCount: 1,
      eventCount: 13,
      liveConnectionAttempted: false,
      liveMigrationExecutionEnabled: false,
      liveQueryExecutionEnabled: false,
      productionReady: false,
    });
    expect(repository.getEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entity: "TaskCompletion",
          liveExecution: false,
          operation: "insert_task_completion",
          traceId: "trace-completion-upsert",
          type: "command.insert",
        }),
      ]),
    );
  });

  it("upserts duplicate task completions without double scoring", async () => {
    const repository = createCampaignDbRepository();
    const campaign = await repository.createDraft(validDraftInput());
    const task = await repository.addTaskDraft(validTaskDraftInput(campaign.id));

    const first = await repository.upsertTaskCompletion!(validCompletionInput(campaign.id, task.id));
    const second = await repository.upsertTaskCompletion!({
      ...validCompletionInput(campaign.id, task.id),
      evidenceHash: "evidence-hash:bridge-ebridge-retry",
    });
    const eligibility = await repository.checkEligibility!({
      accountType: "EOA",
      campaignId: campaign.id,
      walletAddress: "2F4CompletionWallet",
      walletSource: "PORTKEY_EOA_EXTENSION",
    });

    expect(second.id).toBe(first.id);
    expect(second.evidenceHash).toBe("evidence-hash:bridge-ebridge-retry");
    expect(eligibility).toMatchObject({
      eligible: true,
      missingTasks: [],
      score: 120,
      status: "eligible",
    });
    await expect(repository.health()).resolves.toMatchObject({
      completionRecordCount: 1,
    });
  });

  it("projects eligibility from required and optional task completions", async () => {
    const repository = createCampaignDbRepository();
    const campaign = await repository.createDraft(validDraftInput());
    const requiredTask = await repository.addTaskDraft({
      ...validTaskDraftInput(campaign.id),
      points: 120,
      required: true,
      templateCode: "bridge_ebridge",
    });
    const optionalTask = await repository.addTaskDraft({
      ...validTaskDraftInput(campaign.id),
      evidenceRule: { action: "share" },
      points: 50,
      required: false,
      templateCode: "share_campaign",
      verificationType: "SOCIAL",
    });

    await expect(repository.checkEligibility!({
      accountType: "EOA",
      campaignId: campaign.id,
      walletAddress: "2F4CompletionWallet",
      walletSource: "PORTKEY_EOA_EXTENSION",
    })).resolves.toMatchObject({
      accountType: "EOA",
      eligible: false,
      localePreference: "en-US",
      missingTasks: ["bridge_ebridge"],
      riskFlags: [],
      score: 0,
      status: "not_eligible",
      walletAddress: "2F4CompletionWallet",
      walletSource: "PORTKEY_EOA_EXTENSION",
      walletTypeVerified: true,
    });

    await repository.upsertTaskCompletion!({
      ...validCompletionInput(campaign.id, optionalTask.id),
      evidenceHash: "evidence-hash:share-campaign",
      evidenceSource: "SOCIAL_API",
    });

    await expect(repository.checkEligibility!({
      accountType: "EOA",
      campaignId: campaign.id,
      walletAddress: "2F4CompletionWallet",
      walletSource: "PORTKEY_EOA_EXTENSION",
    })).resolves.toMatchObject({
      eligible: false,
      missingTasks: ["bridge_ebridge"],
      score: 50,
      status: "not_eligible",
    });

    await repository.upsertTaskCompletion!(validCompletionInput(campaign.id, requiredTask.id));

    await expect(repository.checkEligibility!({
      accountType: "EOA",
      campaignId: campaign.id,
      walletAddress: "2F4CompletionWallet",
      walletSource: "PORTKEY_EOA_EXTENSION",
    })).resolves.toMatchObject({
      eligible: true,
      missingTasks: [],
      score: 170,
      status: "eligible",
    });
  });

  it("keeps pending required completions in pending eligibility", async () => {
    const repository = createCampaignDbRepository();
    const campaign = await repository.createDraft(validDraftInput());
    const task = await repository.addTaskDraft(validTaskDraftInput(campaign.id));

    await repository.upsertTaskCompletion!({
      ...validCompletionInput(campaign.id, task.id),
      evidenceHash: "evidence-hash:pending",
      status: "pending",
    });

    await expect(repository.checkEligibility!({
      campaignId: campaign.id,
      walletAddress: "2F4CompletionWallet",
    })).resolves.toMatchObject({
      accountType: "UNKNOWN",
      eligible: false,
      missingTasks: ["bridge_ebridge"],
      score: 0,
      status: "pending",
      walletSource: "OTHER",
      walletTypeVerified: false,
    });
  });

  it("upserts campaign participants with wallet identity and campaign scoped uniqueness", async () => {
    const repository = createCampaignDbRepository();
    const firstCampaign = await repository.createDraft(validDraftInput());
    const secondCampaign = await repository.createDraft({
      ...validDraftInput(),
      projectId: "project-second",
    });

    const first = await repository.upsertParticipant!({
      accountType: "EOA",
      campaignId: firstCampaign.id,
      localePreference: "zh-CN",
      riskFlags: ["manual_review_queue"],
      walletAddress: "2F4ParticipantWallet",
      walletSignatureStatus: "signed",
      walletSource: "PORTKEY_EOA_EXTENSION",
      walletTypeVerified: true,
      walletVerifiedAt: "2026-07-07T01:00:00.000Z",
    }, {
      traceId: "trace-participant-upsert",
    });
    const updated = await repository.upsertParticipant!({
      accountType: "AA",
      campaignId: firstCampaign.id,
      localePreference: "ja-JP",
      riskFlags: [],
      walletAddress: "2F4ParticipantWallet",
      walletSignatureStatus: "signed",
      walletSource: "PORTKEY_AA",
      walletTypeVerified: true,
      walletVerifiedAt: "2026-07-07T02:00:00.000Z",
    });
    const secondCampaignParticipant = await repository.upsertParticipant!({
      accountType: "EOA",
      campaignId: secondCampaign.id,
      walletAddress: "2F4ParticipantWallet",
      walletSource: "NIGHTELF",
    });

    expect(first).toMatchObject({
      accountType: "EOA",
      campaignId: firstCampaign.id,
      id: "campaign-db-participant-0001",
      localePreference: "zh-CN",
      riskFlags: ["manual_review_queue"],
      totalPoints: 0,
      walletAddress: "2F4ParticipantWallet",
      walletSignatureStatus: "signed",
      walletSource: "PORTKEY_EOA_EXTENSION",
      walletTypeVerified: true,
      walletVerifiedAt: "2026-07-07T01:00:00.000Z",
    });
    expect(updated).toMatchObject({
      accountType: "AA",
      id: first.id,
      localePreference: "ja-JP",
      riskFlags: [],
      walletSource: "PORTKEY_AA",
      walletVerifiedAt: "2026-07-07T02:00:00.000Z",
    });
    expect(updated.createdAt).toBe(first.createdAt);
    expect(secondCampaignParticipant).toMatchObject({
      campaignId: secondCampaign.id,
      id: "campaign-db-participant-0002",
      localePreference: "en-US",
      walletSignatureStatus: "missing",
      walletTypeVerified: false,
    });
    await expect(repository.getParticipant!(firstCampaign.id, "2F4ParticipantWallet")).resolves.toMatchObject({
      id: first.id,
      walletSource: "PORTKEY_AA",
    });
    await expect(repository.listParticipants!({ campaignId: firstCampaign.id })).resolves.toEqual([
      expect.objectContaining({
        id: first.id,
        walletAddress: "2F4ParticipantWallet",
      }),
    ]);
    await expect(repository.health()).resolves.toMatchObject({
      participantRecordCount: 2,
    });
  });

  it.each([
    ["campaignId", { campaignId: "missing-campaign" }, "CAMPAIGN_DB_PARTICIPANT_CAMPAIGN_NOT_FOUND"],
    ["walletAddress", { walletAddress: "" }, "CAMPAIGN_DB_PARTICIPANT_REQUIRED_FIELD_MISSING"],
    ["accountType", { accountType: "BOT" }, "CAMPAIGN_DB_PARTICIPANT_UNSUPPORTED_ACCOUNT_TYPE"],
    ["walletSource", { walletSource: "UNSAFE_WALLET" }, "CAMPAIGN_DB_PARTICIPANT_UNSUPPORTED_WALLET_SOURCE"],
    ["localePreference", { localePreference: "fr-FR" }, "CAMPAIGN_DB_PARTICIPANT_UNSUPPORTED_LOCALE"],
    ["riskFlags", { riskFlags: ["manual_review", "https://secret.example/token=raw-secret"] }, "CAMPAIGN_DB_PARTICIPANT_INVALID_RISK_FLAGS"],
    ["walletVerifiedAt", { walletVerifiedAt: "" }, "CAMPAIGN_DB_PARTICIPANT_INVALID_WALLET_VERIFIED_AT"],
  ])("rejects invalid participant %s with stable diagnostics", async (_field, override, code) => {
    const repository = createCampaignDbRepository();
    const campaign = await repository.createDraft(validDraftInput());

    await expect(repository.upsertParticipant!({
      accountType: "EOA",
      campaignId: campaign.id,
      walletAddress: "2F4ParticipantWallet",
      walletSource: "PORTKEY_EOA_EXTENSION",
      ...override,
    })).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code,
          severity: "error",
        }),
      ],
    });
    await expect(repository.listParticipants!({ campaignId: campaign.id })).resolves.toEqual([]);
  });

  it("binds campaign referrals with wallet identity and campaign-scoped uniqueness", async () => {
    const repository = createCampaignDbRepository();
    const firstCampaign = await repository.createDraft(validDraftInput());
    const secondCampaign = await repository.createDraft({
      ...validDraftInput(),
      projectId: "project-referral-second",
    });

    const first = await repository.bindReferral!(validReferralBindingInput(firstCampaign.id), {
      traceId: "trace-referral-bind",
    });
    const secondCampaignBinding = await repository.bindReferral!({
      ...validReferralBindingInput(secondCampaign.id),
      referrerWalletAddress: "2F4SecondCampaignReferrer",
    });

    expect(first).toMatchObject({
      campaignId: firstCampaign.id,
      id: "campaign-db-referral-binding-0001",
      inviteeAccountType: "EOA",
      inviteeWalletAddress: "2F4InviteeWallet",
      inviteeWalletSource: "PORTKEY_EOA_EXTENSION",
      qualifiedActionCompleted: false,
      referrerAccountType: "AA",
      referrerWalletAddress: "2F4ReferrerWallet",
      referrerWalletSource: "PORTKEY_AA",
      riskFlags: [],
      status: "pending",
    });
    expect(first.createdAt).toBe("2026-07-06T00:00:00.000Z");
    expect(secondCampaignBinding).toMatchObject({
      campaignId: secondCampaign.id,
      id: "campaign-db-referral-binding-0002",
      inviteeWalletAddress: "2F4InviteeWallet",
      referrerWalletAddress: "2F4SecondCampaignReferrer",
    });
    await expect(repository.getReferralBinding!(firstCampaign.id, "2F4InviteeWallet")).resolves.toMatchObject({
      id: first.id,
      referrerWalletAddress: "2F4ReferrerWallet",
    });
    await expect(repository.listReferralBindings!({ campaignId: firstCampaign.id })).resolves.toEqual([
      expect.objectContaining({
        id: first.id,
        inviteeWalletAddress: "2F4InviteeWallet",
      }),
    ]);
    await expect(repository.health()).resolves.toMatchObject({
      referralBindingRecordCount: 2,
    });
    expect(repository.getEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entity: "ReferralBinding",
          liveExecution: false,
          operation: "insert_referral_binding",
          traceId: "trace-referral-bind",
          type: "command.insert",
        }),
      ]),
    );
  });

  it("rejects self-referral and duplicate invitee binding with stable diagnostics", async () => {
    const repository = createCampaignDbRepository();
    const campaign = await repository.createDraft(validDraftInput());

    await expect(repository.bindReferral!({
      ...validReferralBindingInput(campaign.id),
      inviteeWalletAddress: "2F4SameWallet",
      referrerWalletAddress: "2F4SameWallet",
    })).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code: "CAMPAIGN_DB_REFERRAL_SELF_REFERRAL_BLOCKED",
          severity: "error",
        }),
      ],
    });

    await repository.bindReferral!(validReferralBindingInput(campaign.id));

    await expect(repository.bindReferral!({
      ...validReferralBindingInput(campaign.id),
      referrerWalletAddress: "2F4AnotherReferrer",
    })).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code: "CAMPAIGN_DB_REFERRAL_DUPLICATE_BINDING",
          severity: "error",
        }),
      ],
    });
    await expect(repository.listReferralBindings!({ campaignId: campaign.id })).resolves.toHaveLength(1);
  });

  it.each([
    ["campaignId", { campaignId: "missing-campaign" }, "CAMPAIGN_DB_REFERRAL_CAMPAIGN_NOT_FOUND"],
    ["inviteeWalletAddress", { inviteeWalletAddress: "" }, "CAMPAIGN_DB_REFERRAL_REQUIRED_FIELD_MISSING"],
    ["referrerWalletAddress", { referrerWalletAddress: "" }, "CAMPAIGN_DB_REFERRAL_REQUIRED_FIELD_MISSING"],
    ["inviteeAccountType", { inviteeAccountType: "BOT" }, "CAMPAIGN_DB_REFERRAL_UNSUPPORTED_ACCOUNT_TYPE"],
    ["referrerAccountType", { referrerAccountType: "BOT" }, "CAMPAIGN_DB_REFERRAL_UNSUPPORTED_ACCOUNT_TYPE"],
    ["inviteeWalletSource", { inviteeWalletSource: "UNSAFE_WALLET" }, "CAMPAIGN_DB_REFERRAL_UNSUPPORTED_WALLET_SOURCE"],
    ["referrerWalletSource", { referrerWalletSource: "UNSAFE_WALLET" }, "CAMPAIGN_DB_REFERRAL_UNSUPPORTED_WALLET_SOURCE"],
    ["riskFlags", { riskFlags: ["same_device", "https://secret.example/token=raw-secret"] }, "CAMPAIGN_DB_REFERRAL_INVALID_RISK_FLAGS"],
  ])("rejects invalid referral binding %s with stable diagnostics", async (_field, override, code) => {
    const repository = createCampaignDbRepository();
    const campaign = await repository.createDraft(validDraftInput());

    await expect(repository.bindReferral!({
      ...validReferralBindingInput(campaign.id),
      ...override,
    })).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code,
          severity: "error",
        }),
      ],
    });
    await expect(repository.listReferralBindings!({ campaignId: campaign.id })).resolves.toEqual([]);
  });

  it("marks an existing referral binding qualified with safe evidence", async () => {
    const repository = createCampaignDbRepository();
    const campaign = await repository.createDraft(validDraftInput());
    const binding = await repository.bindReferral!({
      ...validReferralBindingInput(campaign.id),
      riskFlags: ["same_device_review"],
    });

    const qualified = await repository.markReferralQualified!({
      campaignId: campaign.id,
      inviteeWalletAddress: "2F4InviteeWallet",
      qualifiedActionEvidenceHash: "evidence-hash:invitee-bridge",
      riskFlags: ["same_funding_source_review"],
    }, {
      traceId: "trace-referral-qualified",
    });

    expect(qualified).toMatchObject({
      id: binding.id,
      qualifiedActionCompleted: true,
      qualifiedActionCompletedAt: "2026-07-06T00:00:00.000Z",
      qualifiedActionEvidenceHash: "evidence-hash:invitee-bridge",
      riskFlags: ["same_device_review", "same_funding_source_review"],
      status: "qualified",
    });
    expect(qualified.createdAt).toBe(binding.createdAt);
    expect(repository.getEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entity: "ReferralBinding",
          operation: "update_referral_qualification",
          traceId: "trace-referral-qualified",
          type: "command.update",
        }),
      ]),
    );
  });

  it.each([
    ["missing binding", { inviteeWalletAddress: "2F4MissingInvitee" }, "CAMPAIGN_DB_REFERRAL_BINDING_NOT_FOUND"],
    ["unsafe evidence", { qualifiedActionEvidenceHash: "https://secret.example/token=raw-secret" }, "CAMPAIGN_DB_REFERRAL_INVALID_EVIDENCE_HASH"],
    ["empty evidence", { qualifiedActionEvidenceHash: "" }, "CAMPAIGN_DB_REFERRAL_INVALID_EVIDENCE_HASH"],
  ])("rejects invalid referral qualification %s", async (_case, override, code) => {
    const repository = createCampaignDbRepository();
    const campaign = await repository.createDraft(validDraftInput());
    await repository.bindReferral!(validReferralBindingInput(campaign.id));

    await expect(repository.markReferralQualified!({
      campaignId: campaign.id,
      inviteeWalletAddress: "2F4InviteeWallet",
      qualifiedActionEvidenceHash: "evidence-hash:invitee-bridge",
      ...override,
    })).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code,
          severity: "error",
        }),
      ],
    });
  });

  it("projects deterministic repository export rows and readiness counts", async () => {
    const repository = createCampaignDbRepository();
    const campaign = await repository.createDraft(validDraftInput());
    const requiredTask = await repository.addTaskDraft({
      ...validTaskDraftInput(campaign.id),
      points: 120,
      required: true,
      templateCode: "bridge_ebridge",
    });
    const optionalTask = await repository.addTaskDraft({
      ...validTaskDraftInput(campaign.id),
      evidenceRule: { action: "share" },
      points: 50,
      required: false,
      templateCode: "share_campaign",
      verificationType: "SOCIAL",
    });

    await repository.upsertTaskCompletion!(validCompletionInput(campaign.id, requiredTask.id));
    await repository.upsertTaskCompletion!({
      ...validCompletionInput(campaign.id, optionalTask.id),
      evidenceHash: "evidence-hash:share-campaign",
      evidenceSource: "SOCIAL_API",
    });
    await repository.upsertTaskCompletion!({
      ...validCompletionInput(campaign.id, requiredTask.id),
      evidenceHash: "evidence-hash:wallet-b-required",
      walletAddress: "2F4SecondCompletionWallet",
    });
    await repository.upsertTaskCompletion!({
      ...validCompletionInput(campaign.id, requiredTask.id),
      evidenceHash: "evidence-hash:pending-required",
      status: "pending",
      walletAddress: "2F4PendingWallet",
    });
    await repository.upsertTaskCompletion!({
      ...validCompletionInput(campaign.id, optionalTask.id),
      evidenceHash: "evidence-hash:blocked-optional",
      evidenceSource: "SOCIAL_API",
      walletAddress: "2F4BlockedWallet",
    });

    const projection = await repository.projectExport!({
      campaignId: campaign.id,
      contractRootMode: "none",
      format: "csv",
    }, {
      traceId: "trace-export-projection",
    });
    const repeatedProjection = await repository.projectExport!({
      campaignId: campaign.id,
      contractRootMode: "none",
      format: "csv",
    });

    expect(projection).toMatchObject({
      blockedRows: 1,
      campaignId: campaign.id,
      contractRootMode: "none",
      exportBatchId: `campaign-db-export-${campaign.id}`,
      format: "csv",
      readyRows: 2,
      reviewRequiredRows: 1,
      repository: {
        adapterId: "campaign-db-deterministic-adapter",
        createdViaRepository: true,
        storeId: "campaign-db",
      },
    });
    expect(projection.rows.map((row) => ({
      rank: row.rank,
      rowStatus: row.rowStatus,
      totalPoints: row.totalPoints,
      walletAddress: row.walletAddress,
    }))).toEqual([
      {
        rank: 1,
        rowStatus: "ready",
        totalPoints: 170,
        walletAddress: "2F4CompletionWallet",
      },
      {
        rank: 2,
        rowStatus: "ready",
        totalPoints: 120,
        walletAddress: "2F4SecondCompletionWallet",
      },
      {
        rank: 3,
        rowStatus: "review_required",
        totalPoints: 0,
        walletAddress: "2F4PendingWallet",
      },
      {
        rank: undefined,
        rowStatus: "blocked",
        totalPoints: 50,
        walletAddress: "2F4BlockedWallet",
      },
    ]);
    expect(projection.rows[0]).toMatchObject({
      accountType: "EOA",
      eligible: true,
      evidenceHashes: ["evidence-hash:bridge-ebridge", "evidence-hash:share-campaign"],
      localePreference: "en-US",
      missingColumnValues: [],
      missingTasks: [],
      referrerAddress: "",
      riskFlags: [],
      walletSource: "PORTKEY_EOA_EXTENSION",
      walletTypeVerified: true,
    });
    expect(projection.rows[0].taskRecords).toEqual([
      expect.objectContaining({
        pointsAwarded: 120,
        pointsAvailable: 120,
        required: true,
        status: "completed",
        taskId: requiredTask.id,
        templateCode: "bridge_ebridge",
      }),
      expect.objectContaining({
        evidenceHash: "evidence-hash:share-campaign",
        pointsAwarded: 50,
        pointsAvailable: 50,
        required: false,
        status: "completed",
        taskId: optionalTask.id,
        templateCode: "share_campaign",
      }),
    ]);
    expect(projection.rows[2]).toMatchObject({
      missingTasks: ["bridge_ebridge"],
      rowStatus: "review_required",
      taskRecords: expect.arrayContaining([
        expect.objectContaining({
          pointsAwarded: 0,
          required: true,
          status: "pending",
          taskId: requiredTask.id,
        }),
      ]),
    });
    expect(projection.rows[3]).toMatchObject({
      missingTasks: ["bridge_ebridge"],
      rowStatus: "blocked",
      taskRecords: expect.arrayContaining([
        expect.objectContaining({
          pointsAwarded: 0,
          required: true,
          status: "missing",
          taskId: requiredTask.id,
        }),
      ]),
    });
    expect(projection.artifact).toMatchObject({
      checksumAlgorithm: "fnv1a32-local-review",
      columns: [
        "campaign_id",
        "wallet_address",
        "account_type",
        "wallet_source",
        "locale_preference",
        "total_points",
        "rank",
        "eligible",
        "missing_tasks",
        "risk_flags",
        "referrer_address",
        "task_records",
        "evidence_hashes",
        "export_batch_id",
      ],
      format: "csv",
      generatedMode: "local_review_only",
      localPreviewMode: true,
      mimeType: "text/csv;charset=utf-8",
      safety: {
        localOnly: true,
        noContractRoot: true,
        noContractTransaction: true,
        noDownloadUrl: true,
        noRewardCustody: true,
        noRewardDistribution: true,
        noStorageWrite: true,
      },
    });
    expect(projection.artifact.csvPreview).toContain("campaign_id,wallet_address,account_type");
    expect(repeatedProjection.rows).toEqual(projection.rows);
    expect(repeatedProjection.artifact.checksum).toBe(projection.artifact.checksum);
    expect(projection.exportReadiness).toMatchObject({
      batchId: `campaign-db-export-${campaign.id}`,
      summary: {
        blockedRows: 1,
        previewModeCount: 2,
        readyRows: 2,
        reviewRequiredRows: 1,
        totalRows: 4,
      },
    });
    expect(projection.exportReadiness.previewModes).toEqual([
      expect.objectContaining({ downloadAvailable: false, generatesFile: false, mode: "csv", readiness: "ready" }),
      expect.objectContaining({ downloadAvailable: false, generatesFile: false, mode: "json", readiness: "ready" }),
    ]);
    expect(projection.exportReadiness.contractRootReadiness).toEqual([
      expect.objectContaining({ mode: "none", readiness: "ready", safeDefault: true }),
      expect.objectContaining({ mode: "eligibility_root", readiness: "blocked", safeDefault: false }),
      expect.objectContaining({ mode: "winners_root", readiness: "blocked", safeDefault: false }),
      expect.objectContaining({ mode: "contract_claim", readiness: "blocked", safeDefault: false }),
    ]);
  });

  it("uses participant and referral records as eligibility and export identity source", async () => {
    const repository = createCampaignDbRepository();
    const campaign = await repository.createDraft(validDraftInput());
    const requiredTask = await repository.addTaskDraft({
      ...validTaskDraftInput(campaign.id),
      points: 120,
      required: true,
      templateCode: "bridge_ebridge",
    });
    const optionalTask = await repository.addTaskDraft({
      ...validTaskDraftInput(campaign.id),
      evidenceRule: { action: "share" },
      points: 50,
      required: false,
      templateCode: "share_campaign",
      verificationType: "SOCIAL",
    });

    await repository.upsertParticipant!({
      accountType: "AA",
      campaignId: campaign.id,
      localePreference: "zh-CN",
      riskFlags: ["manual_review_queue"],
      walletAddress: "2F4ParticipantIdentity",
      walletSignatureStatus: "signed",
      walletSource: "PORTKEY_AA",
      walletTypeVerified: true,
      walletVerifiedAt: "2026-07-07T03:00:00.000Z",
    });
    await repository.upsertParticipant!({
      accountType: "EOA",
      campaignId: campaign.id,
      localePreference: "ko-KR",
      walletAddress: "2F4CleanParticipant",
      walletSignatureStatus: "signed",
      walletSource: "PORTKEY_EOA_EXTENSION",
      walletTypeVerified: true,
      walletVerifiedAt: "2026-07-07T04:00:00.000Z",
    });
    await repository.upsertTaskCompletion!({
      ...validCompletionInput(campaign.id, requiredTask.id),
      accountType: "EOA",
      walletAddress: "2F4ParticipantIdentity",
      walletSource: "PORTKEY_EOA_EXTENSION",
    });
    await repository.upsertTaskCompletion!({
      ...validCompletionInput(campaign.id, optionalTask.id),
      evidenceHash: "evidence-hash:participant-share",
      evidenceSource: "SOCIAL_API",
      walletAddress: "2F4ParticipantIdentity",
    });
    await repository.upsertTaskCompletion!({
      ...validCompletionInput(campaign.id, requiredTask.id),
      evidenceHash: "evidence-hash:clean-required",
      walletAddress: "2F4CleanParticipant",
    });
    await repository.bindReferral!({
      ...validReferralBindingInput(campaign.id),
      inviteeAccountType: "EOA",
      inviteeWalletAddress: "2F4CleanParticipant",
      inviteeWalletSource: "PORTKEY_EOA_EXTENSION",
      referrerAccountType: "AA",
      referrerWalletAddress: "2F4ParticipantIdentity",
      referrerWalletSource: "PORTKEY_AA",
      riskFlags: ["same_funding_source_review"],
    });

    await expect(repository.checkEligibility!({
      accountType: "EOA",
      campaignId: campaign.id,
      walletAddress: "2F4ParticipantIdentity",
      walletSource: "PORTKEY_EOA_EXTENSION",
    })).resolves.toMatchObject({
      accountType: "AA",
      eligible: false,
      localePreference: "zh-CN",
      missingTasks: [],
      riskFlags: ["manual_review_queue"],
      score: 170,
      status: "risk_flagged",
      walletSource: "PORTKEY_AA",
      walletTypeVerified: true,
    });
    const projection = await repository.projectExport!({
      campaignId: campaign.id,
      format: "json",
    });

    expect(projection.rows.map((row) => ({
      accountType: row.accountType,
      localePreference: row.localePreference,
      rank: row.rank,
      referrerAddress: row.referrerAddress,
      riskFlags: row.riskFlags,
      rowStatus: row.rowStatus,
      totalPoints: row.totalPoints,
      walletAddress: row.walletAddress,
      walletSource: row.walletSource,
    }))).toEqual([
      {
        accountType: "AA",
        localePreference: "zh-CN",
        rank: 1,
        referrerAddress: "",
        riskFlags: ["manual_review_queue"],
        rowStatus: "review_required",
        totalPoints: 170,
        walletAddress: "2F4ParticipantIdentity",
        walletSource: "PORTKEY_AA",
      },
      {
        accountType: "EOA",
        localePreference: "ko-KR",
        rank: 2,
        referrerAddress: "2F4ParticipantIdentity",
        riskFlags: ["same_funding_source_review"],
        rowStatus: "review_required",
        totalPoints: 120,
        walletAddress: "2F4CleanParticipant",
        walletSource: "PORTKEY_EOA_EXTENSION",
      },
    ]);
  });

  it("exports participant-only records for local review before completions exist", async () => {
    const repository = createCampaignDbRepository();
    const campaign = await repository.createDraft(validDraftInput());
    await repository.addTaskDraft(validTaskDraftInput(campaign.id));
    await repository.upsertParticipant!({
      accountType: "UNKNOWN",
      campaignId: campaign.id,
      localePreference: "es-ES",
      walletAddress: "2F4AddressOnlyParticipant",
      walletSource: "OTHER",
    });

    const projection = await repository.projectExport!({
      campaignId: campaign.id,
      format: "csv",
    });

    expect(projection.rows).toEqual([
      expect.objectContaining({
        accountType: "UNKNOWN",
        eligible: false,
        localePreference: "es-ES",
        missingTasks: ["bridge_ebridge"],
        rowStatus: "blocked",
        totalPoints: 0,
        walletAddress: "2F4AddressOnlyParticipant",
        walletSource: "OTHER",
        walletTypeVerified: false,
      }),
    ]);
    expect(projection.rows[0]).not.toHaveProperty("rank");
    expect(projection.blockedRows).toBe(1);
    expect(projection.artifact.csvPreview).toContain("2F4AddressOnlyParticipant");
  });

  it("keeps duplicate completion upserts single-counted in export projection", async () => {
    const repository = createCampaignDbRepository();
    const campaign = await repository.createDraft(validDraftInput());
    const task = await repository.addTaskDraft(validTaskDraftInput(campaign.id));

    const first = await repository.upsertTaskCompletion!(validCompletionInput(campaign.id, task.id));
    const second = await repository.upsertTaskCompletion!({
      ...validCompletionInput(campaign.id, task.id),
      evidenceHash: "evidence-hash:bridge-ebridge-retry",
    });
    const projection = await repository.projectExport!({
      campaignId: campaign.id,
      format: "json",
    });

    expect(second.id).toBe(first.id);
    expect(projection.rows).toHaveLength(1);
    expect(projection.rows[0]).toMatchObject({
      evidenceHashes: ["evidence-hash:bridge-ebridge-retry"],
      totalPoints: 120,
    });
    expect(projection.rows[0].taskRecords).toHaveLength(1);
    expect(projection.artifact).toMatchObject({
      format: "json",
      jsonPreview: [
        expect.objectContaining({
          evidence_hashes: ["evidence-hash:bridge-ebridge-retry"],
          total_points: 120,
        }),
      ],
    });
  });

  it("returns empty local export projection for campaigns without completions", async () => {
    const repository = createCampaignDbRepository();
    const campaign = await repository.createDraft(validDraftInput());
    await repository.addTaskDraft(validTaskDraftInput(campaign.id));

    const projection = await repository.projectExport!({
      campaignId: campaign.id,
      format: "csv",
    });

    expect(projection.rows).toEqual([]);
    expect(projection).toMatchObject({
      blockedRows: 0,
      readyRows: 0,
      reviewRequiredRows: 0,
    });
    expect(projection.artifact.csvPreview).toBe(
      "campaign_id,wallet_address,account_type,wallet_source,locale_preference,total_points,rank,eligible,missing_tasks,risk_flags,referrer_address,task_records,evidence_hashes,export_batch_id",
    );
    expect(projection.exportReadiness.summary).toMatchObject({
      totalRows: 0,
      readyRows: 0,
      reviewRequiredRows: 0,
      blockedRows: 0,
    });
  });

  it("rejects unsafe repository export projection requests", async () => {
    const repository = createCampaignDbRepository();
    const campaign = await repository.createDraft(validDraftInput());

    await expect(repository.projectExport!({
      campaignId: campaign.id,
      contractRootMode: "winners_root",
    })).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code: "CAMPAIGN_DB_EXPORT_UNSUPPORTED_CONTRACT_ROOT_MODE",
          field: "contractRootMode",
        }),
      ],
    });
    await expect(repository.projectExport!({
      campaignId: campaign.id,
      format: "xlsx",
    })).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code: "CAMPAIGN_DB_EXPORT_UNSUPPORTED_FORMAT",
          field: "format",
        }),
      ],
    });
    await expect(repository.projectExport!({
      campaignId: campaign.id,
      includeRiskFlags: false,
    })).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code: "CAMPAIGN_DB_EXPORT_REQUIRED_COLUMN_DISABLED",
          field: "includeRiskFlags",
        }),
      ],
    });
    await expect(repository.projectExport!({
      campaignId: "missing-campaign",
    })).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code: "CAMPAIGN_DB_EXPORT_CAMPAIGN_NOT_FOUND",
          field: "campaignId",
        }),
      ],
    });
  });

  it("resets records and event lifecycle deterministically", async () => {
    const repository = createCampaignDbRepository();
    const campaign = await repository.createDraft(validDraftInput());
    const task = await repository.addTaskDraft(validTaskDraftInput(campaign.id));

    await repository.upsertTaskCompletion!(validCompletionInput(campaign.id, task.id));
    await repository.reset();

    expect(await repository.health()).toMatchObject({
      completionRecordCount: 0,
      eventCount: 0,
      recordCount: 0,
      taskRecordCount: 0,
    });
    await expect(repository.list()).resolves.toEqual([]);
  });

  it.each([
    ["campaignId", { campaignId: "missing-campaign" }, "CAMPAIGN_DB_COMPLETION_CAMPAIGN_NOT_FOUND"],
    ["taskId", { taskId: "missing-task" }, "CAMPAIGN_DB_COMPLETION_TASK_NOT_FOUND"],
    ["walletAddress", { walletAddress: "" }, "CAMPAIGN_DB_COMPLETION_REQUIRED_FIELD_MISSING"],
    ["accountType", { accountType: "BOT" }, "CAMPAIGN_DB_COMPLETION_UNSUPPORTED_ACCOUNT_TYPE"],
    ["walletSource", { walletSource: "UNSAFE_WALLET" }, "CAMPAIGN_DB_COMPLETION_UNSUPPORTED_WALLET_SOURCE"],
    ["status", { status: "ready" }, "CAMPAIGN_DB_COMPLETION_UNSUPPORTED_STATUS"],
    ["evidenceSource", { evidenceSource: "RAW_API" }, "CAMPAIGN_DB_COMPLETION_UNSUPPORTED_EVIDENCE_SOURCE"],
    ["evidenceHash", { evidenceHash: "https://secret.example/token=raw-secret" }, "CAMPAIGN_DB_COMPLETION_INVALID_EVIDENCE_HASH"],
  ])("rejects invalid completion %s with stable diagnostics", async (_field, override, code) => {
    const repository = createCampaignDbRepository();
    const campaign = await repository.createDraft(validDraftInput());
    const task = await repository.addTaskDraft(validTaskDraftInput(campaign.id));

    await expect(repository.upsertTaskCompletion!({
      ...validCompletionInput(campaign.id, task.id),
      ...override,
    } as ReturnType<typeof validCompletionInput>)).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code,
          severity: "error",
        }),
      ],
    });
    await expect(repository.checkEligibility!({
      campaignId: campaign.id,
      walletAddress: "2F4CompletionWallet",
    })).resolves.toMatchObject({
      score: 0,
    });
  });

  it.each([
    ["defaultLocale", { defaultLocale: "zh-CN" }, "CAMPAIGN_DB_UNSUPPORTED_DEFAULT_LOCALE"],
    ["supportedLocales", { supportedLocales: ["en-US", "fr-FR"] }, "CAMPAIGN_DB_UNSUPPORTED_LOCALE"],
    ["supportedLocales default", { supportedLocales: ["zh-CN"] }, "CAMPAIGN_DB_UNSUPPORTED_LOCALE"],
    ["walletPolicy", { walletPolicy: "PORTKEY_ONLY" }, "CAMPAIGN_DB_UNSUPPORTED_WALLET_POLICY"],
    ["contractMode", { contractMode: "LIVE_CONTRACT" }, "CAMPAIGN_DB_UNSUPPORTED_CONTRACT_MODE"],
    ["timeWindow", { endTime: "2026-07-06T00:00:00.000Z" }, "CAMPAIGN_DB_INVALID_TIME_WINDOW"],
  ])("rejects invalid %s input with stable diagnostics", async (_field, override, code) => {
    const repository = createCampaignDbRepository();

    await expect(repository.createDraft({
      ...validDraftInput(),
      ...override,
    })).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code,
          severity: "error",
        }),
      ],
    });
  });

  it.each([
    ["campaignId", { campaignId: "missing-campaign" }, "CAMPAIGN_DB_TASK_CAMPAIGN_NOT_FOUND"],
    ["templateCode", { templateCode: "" }, "CAMPAIGN_DB_TASK_REQUIRED_FIELD_MISSING"],
    ["walletCompatibility", { walletCompatibility: "PORTKEY_ONLY" }, "CAMPAIGN_DB_TASK_UNSUPPORTED_WALLET_COMPATIBILITY"],
    ["verificationType", { verificationType: "REFERRAL" }, "CAMPAIGN_DB_TASK_UNSUPPORTED_VERIFICATION_TYPE"],
    ["points", { points: 0 }, "CAMPAIGN_DB_TASK_INVALID_POINTS"],
    ["evidenceRule", { evidenceRule: [] }, "CAMPAIGN_DB_TASK_INVALID_EVIDENCE_RULE"],
  ])("rejects invalid task draft %s with stable diagnostics", async (_field, override, code) => {
    const repository = createCampaignDbRepository();
    const campaign = await repository.createDraft(validDraftInput());

    await expect(repository.addTaskDraft({
      ...validTaskDraftInput(campaign.id),
      ...override,
    } as ReturnType<typeof validTaskDraftInput>)).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code,
          severity: "error",
        }),
      ],
    });
    await expect(repository.getById(campaign.id)).resolves.toMatchObject({
      tasks: [],
    });
  });

  it("redacts secret-like diagnostic values", async () => {
    const repository = createCampaignDbRepository({
      mode: "production_deferred",
      requestedDriverId: "postgres://user:password@db.example/campaign?token=raw-secret",
    });

    const health = await repository.health();
    const serialized = JSON.stringify(health);

    expect(health).toMatchObject({
      diagnosticCodes: ["CAMPAIGN_DB_PRODUCTION_DEFERRED"],
      fallbackUsed: false,
      productionReady: false,
      selectedMode: "production_deferred",
      status: "blocked",
    });
    expect(serialized).toContain("[redacted]");
    expect(serialized).not.toContain("raw-secret");
    expect(serialized).not.toContain("password@db.example");
    expect(sanitizeCampaignDbDiagnosticValue("databaseToken", "abc123")).toBe("[redacted]");
    expect(sanitizeCampaignDbDiagnosticValue("driverId", "campaign-os-driver")).toBe("campaign-os-driver");
    await expect(repository.createDraft(validDraftInput())).rejects.toBeInstanceOf(CampaignDbRepositoryError);
    await expect(repository.addTaskDraft(validTaskDraftInput("campaign-db-draft-0001"))).rejects.toBeInstanceOf(
      CampaignDbRepositoryError,
    );
    await expect(repository.upsertTaskCompletion!(validCompletionInput(
      "campaign-db-draft-0001",
      "campaign-db-task-draft-0001",
    ))).rejects.toBeInstanceOf(CampaignDbRepositoryError);
    await expect(repository.projectExport!({
      campaignId: "campaign-db-draft-0001",
    })).rejects.toBeInstanceOf(CampaignDbRepositoryError);
    await expect(repository.getExportReadiness!({
      campaignId: "campaign-db-draft-0001",
    })).rejects.toBeInstanceOf(CampaignDbRepositoryError);
  });

  it("uses durable store mode to preserve drafts across repository instances", async () => {
    await withTempStorePath(async (durableStoreFilePath) => {
      const firstRepository = createCampaignDbRepository({
        durableStoreFilePath,
        mode: "durable_test",
      });
      const created = await firstRepository.createDraft({
        ...validDraftInput(),
        projectId: "project-m177",
        supportedLocales: ["en-US", "zh-CN"],
      });
      const task = await firstRepository.addTaskDraft({
        ...validTaskDraftInput(created.id),
        templateCode: "vote_tmrwdao",
      });
      await firstRepository.upsertTaskCompletion!({
        ...validCompletionInput(created.id, task.id),
        evidenceHash: "evidence-hash:vote-tmrwdao",
      });
      await firstRepository.upsertParticipant!({
        accountType: "EOA",
        campaignId: created.id,
        localePreference: "vi-VN",
        riskFlags: ["referral_velocity_review"],
        walletAddress: "2F4CompletionWallet",
        walletSignatureStatus: "signed",
        walletSource: "PORTKEY_EOA_EXTENSION",
        walletTypeVerified: true,
        walletVerifiedAt: "2026-07-07T05:00:00.000Z",
      });
      await firstRepository.bindReferral!({
        ...validReferralBindingInput(created.id),
        inviteeWalletAddress: "2F4CompletionWallet",
        referrerWalletAddress: "2F4DurableReferrer",
        riskFlags: ["same_device_review"],
      });

      const reopenedRepository = createCampaignDbRepository({
        durableStoreFilePath,
        mode: "durable_test",
      });
      await reopenedRepository.upsertTaskCompletion!({
        accountType: "AA",
        campaignId: created.id,
        evidenceHash: "evidence-hash:vote-tmrwdao-aa",
        evidenceSource: "AELFSCAN",
        status: "completed",
        taskId: task.id,
        walletAddress: "2F4SecondCompletionWallet",
        walletSource: "PORTKEY_AA",
      });

      await expect(reopenedRepository.getById(created.id)).resolves.toMatchObject({
        id: created.id,
        projectId: "project-m177",
        repository: expect.objectContaining({
          adapterId: "campaign-db-durable-test-adapter",
          createdViaRepository: true,
          storeId: "campaign-db",
        }),
        tasks: [
          expect.objectContaining({
            campaignId: created.id,
            id: "campaign-db-task-draft-0001",
            templateCode: "vote_tmrwdao",
          }),
        ],
        completions: [
          expect.objectContaining({
            campaignId: created.id,
            id: "campaign-db-task-completion-0001",
            taskId: "campaign-db-task-draft-0001",
            walletAddress: "2F4CompletionWallet",
          }),
          expect.objectContaining({
            campaignId: created.id,
            id: "campaign-db-task-completion-0002",
            taskId: "campaign-db-task-draft-0001",
            walletAddress: "2F4SecondCompletionWallet",
          }),
        ],
      });
      await expect(reopenedRepository.getParticipant!(created.id, "2F4CompletionWallet")).resolves.toMatchObject({
        campaignId: created.id,
        localePreference: "vi-VN",
        riskFlags: ["referral_velocity_review"],
        walletAddress: "2F4CompletionWallet",
        walletSignatureStatus: "signed",
        walletTypeVerified: true,
      });
      await expect(reopenedRepository.getReferralBinding!(created.id, "2F4CompletionWallet")).resolves.toMatchObject({
        campaignId: created.id,
        inviteeWalletAddress: "2F4CompletionWallet",
        referrerWalletAddress: "2F4DurableReferrer",
        riskFlags: ["same_device_review"],
      });
      await expect(reopenedRepository.checkEligibility!({
        accountType: "EOA",
        campaignId: created.id,
        walletAddress: "2F4CompletionWallet",
        walletSource: "PORTKEY_EOA_EXTENSION",
      })).resolves.toMatchObject({
        eligible: false,
        localePreference: "vi-VN",
        missingTasks: [],
        riskFlags: ["referral_velocity_review"],
        score: 120,
        status: "risk_flagged",
      });
      const exportProjection = await reopenedRepository.projectExport!({
        campaignId: created.id,
        format: "json",
      });

      expect(exportProjection).toMatchObject({
        campaignId: created.id,
        readyRows: 1,
        reviewRequiredRows: 1,
        blockedRows: 0,
      });
      expect(exportProjection.rows.map((row) => ({
        localePreference: row.localePreference,
        rank: row.rank,
        riskFlags: row.riskFlags,
        rowStatus: row.rowStatus,
        walletAddress: row.walletAddress,
      }))).toEqual([
        {
          localePreference: "en-US",
          rank: 1,
          rowStatus: "ready",
          riskFlags: [],
          walletAddress: "2F4SecondCompletionWallet",
        },
        {
          localePreference: "vi-VN",
          rank: 2,
          riskFlags: ["referral_velocity_review", "same_device_review"],
          rowStatus: "review_required",
          walletAddress: "2F4CompletionWallet",
        },
      ]);
      expect(exportProjection.artifact.jsonPreview).toEqual([
        expect.objectContaining({
          export_batch_id: `campaign-db-export-${created.id}`,
          wallet_address: "2F4SecondCompletionWallet",
        }),
        expect.objectContaining({
          export_batch_id: `campaign-db-export-${created.id}`,
          locale_preference: "vi-VN",
          referrer_address: "2F4DurableReferrer",
          risk_flags: ["referral_velocity_review", "same_device_review"],
          wallet_address: "2F4CompletionWallet",
        }),
      ]);
      await expect(reopenedRepository.list({ projectId: "project-m177" })).resolves.toEqual([
        expect.objectContaining({
          completions: expect.arrayContaining([
            expect.objectContaining({
              id: "campaign-db-task-completion-0001",
            }),
            expect.objectContaining({
              id: "campaign-db-task-completion-0002",
            }),
          ]),
          id: created.id,
          tasks: [
            expect.objectContaining({
              id: "campaign-db-task-draft-0001",
            }),
          ],
        }),
      ]);
      await expect(reopenedRepository.health()).resolves.toMatchObject({
        adapterId: "campaign-db-durable-test-adapter",
        campaignStore: expect.objectContaining({
          completionRecordCount: 2,
          participantRecordCount: 1,
          referralBindingRecordCount: 1,
          durable: true,
          mode: "durable_test",
          recordCount: 1,
          status: "ready",
          taskRecordCount: 1,
        }),
        completionRecordCount: 2,
        participantRecordCount: 1,
        referralBindingRecordCount: 1,
        recordCount: 1,
        selectedMode: "durable_test",
        status: "ready",
        taskRecordCount: 1,
      });
    });
  });

  it("keeps repository export projection free from live side-effect and private-artifact fields", async () => {
    const repository = createCampaignDbRepository();
    const campaign = await repository.createDraft(validDraftInput());
    const task = await repository.addTaskDraft(validTaskDraftInput(campaign.id));

    await repository.upsertTaskCompletion!(validCompletionInput(campaign.id, task.id));

    const projection = await repository.projectExport!({
      campaignId: campaign.id,
      format: "json",
    });
    const readiness = await repository.getExportReadiness!({
      campaignId: campaign.id,
    });
    const serialized = JSON.stringify({ projection, readiness });

    for (const key of [
      "downloadUrl",
      "signedUrl",
      "storageKey",
      "objectKey",
      "contractRoot",
      "transactionId",
      "signature",
      "rewardDistribution",
      "providerPayload",
    ]) {
      expect(hasOwnKeyDeep(projection, key)).toBe(false);
      expect(hasOwnKeyDeep(readiness, key)).toBe(false);
    }

    expect(serialized).not.toContain("kitty-specs");
    expect(serialized).not.toContain("docs/current");
    expect(serialized).not.toContain("evidence/");
    expect(serialized).not.toContain("sync/");
    expect(serialized).not.toContain("signedUrl");
    expect(serialized).not.toContain("objectKey");
  });

  it("loads old durable documents without completion records", async () => {
    await withTempStorePath(async (durableStoreFilePath) => {
      await mkdir(join(durableStoreFilePath, ".."), { recursive: true });
      await writeFile(durableStoreFilePath, `${JSON.stringify({
        records: [
          {
            contractMode: "OFF_CHAIN_MVP",
            createdAt: "2026-07-06T00:00:00.000Z",
            defaultLocale: "en-US",
            duration: "2026-07-07 to 2026-07-14",
            endTime: "2026-07-14T00:00:00.000Z",
            goal: "Old durable document",
            id: "campaign-db-draft-old",
            ownerAddress: "2F4OldOwner",
            projectId: "project-old",
            publishReadiness: {
              blockers: [],
              ready: true,
              warnings: [],
            },
            rewardDescription: "Old document reward",
            startTime: "2026-07-07T00:00:00.000Z",
            status: "draft",
            supportedLocales: ["en-US"],
            updatedAt: "2026-07-06T00:00:00.000Z",
            walletPolicy: "ANY",
          },
        ],
        taskRecords: [],
        updatedAt: "2026-07-06T00:00:00.000Z",
        version: 1,
      }, null, 2)}\n`, "utf8");

      const repository = createCampaignDbRepository({
        durableStoreFilePath,
        mode: "durable_test",
      });

      await expect(repository.getById("campaign-db-draft-old")).resolves.toMatchObject({
        completions: [],
        id: "campaign-db-draft-old",
        tasks: [],
      });
      await expect(repository.health()).resolves.toMatchObject({
        campaignStore: expect.objectContaining({
          completionRecordCount: 0,
          recordCount: 1,
          taskRecordCount: 0,
        }),
        completionRecordCount: 0,
      });
    });
  });

  it("does not persist invalid drafts in durable mode", async () => {
    await withTempStorePath(async (durableStoreFilePath) => {
      const repository = createCampaignDbRepository({
        durableStoreFilePath,
        mode: "durable_test",
      });

      await expect(repository.createDraft({
        ...validDraftInput(),
        defaultLocale: "zh-CN",
      })).rejects.toBeInstanceOf(CampaignDbRepositoryError);
      await expect(repository.list()).resolves.toEqual([]);
      await expect(repository.health()).resolves.toMatchObject({
        campaignStore: expect.objectContaining({
          recordCount: 0,
          taskRecordCount: 0,
        }),
        recordCount: 0,
        taskRecordCount: 0,
      });
    });
  });

  it("keeps durable listing bounded and ordered", async () => {
    await withTempStorePath(async (durableStoreFilePath) => {
      const repository = createCampaignDbRepository({
        boundedListLimit: 2,
        durableStoreFilePath,
        mode: "durable_test",
        now: () => "2026-07-07T00:00:00.000Z",
      });

      for (let index = 0; index < 5; index += 1) {
        await repository.createDraft({
          ...validDraftInput(),
          projectId: "project-bounded",
          startTime: `2026-08-0${index + 1}T00:00:00.000Z`,
          endTime: `2026-08-1${index + 1}T00:00:00.000Z`,
        });
      }

      const listed = await repository.list({ projectId: "project-bounded" });

      expect(listed.map((item) => item.id)).toEqual([
        "campaign-db-draft-0001",
        "campaign-db-draft-0002",
      ]);
    });
  });

  it("keeps repository code provider-decoupled", async () => {
    const source = await readFile("src/server/campaignDbRepository.ts", "utf8");

    expect(source).not.toContain("etransfer");
    expect(source).not.toContain("awaken");
    expect(source).not.toMatch(/service\s*===/);
    expect(source).not.toMatch(/provider\s*===/);
  });
});
