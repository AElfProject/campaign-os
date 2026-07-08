import { readFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
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

  it("resets records and event lifecycle deterministically", async () => {
    const repository = createCampaignDbRepository();
    const campaign = await repository.createDraft(validDraftInput());

    await repository.addTaskDraft(validTaskDraftInput(campaign.id));
    await repository.reset();

    expect(await repository.health()).toMatchObject({
      eventCount: 0,
      recordCount: 0,
      taskRecordCount: 0,
    });
    await expect(repository.list()).resolves.toEqual([]);
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
      await firstRepository.addTaskDraft({
        ...validTaskDraftInput(created.id),
        templateCode: "vote_tmrwdao",
      });

      const reopenedRepository = createCampaignDbRepository({
        durableStoreFilePath,
        mode: "durable_test",
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
      });
      await expect(reopenedRepository.list({ projectId: "project-m177" })).resolves.toEqual([
        expect.objectContaining({
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
          durable: true,
          mode: "durable_test",
          recordCount: 1,
          status: "ready",
          taskRecordCount: 1,
        }),
        recordCount: 1,
        selectedMode: "durable_test",
        status: "ready",
        taskRecordCount: 1,
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
