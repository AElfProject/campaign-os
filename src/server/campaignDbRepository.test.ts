import { readFile } from "node:fs/promises";
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

  it("resets records and event lifecycle deterministically", async () => {
    const repository = createCampaignDbRepository();

    await repository.createDraft(validDraftInput());
    await repository.reset();

    expect(await repository.health()).toMatchObject({
      eventCount: 0,
      recordCount: 0,
    });
    await expect(repository.list()).resolves.toEqual([]);
  });

  it.each([
    ["defaultLocale", { defaultLocale: "zh-CN" }, "CAMPAIGN_DB_UNSUPPORTED_DEFAULT_LOCALE"],
    ["supportedLocales", { supportedLocales: ["en-US", "fr-FR"] }, "CAMPAIGN_DB_UNSUPPORTED_LOCALE"],
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
  });

  it("keeps repository code provider-decoupled", async () => {
    const source = await readFile("src/server/campaignDbRepository.ts", "utf8");

    expect(source).not.toContain("etransfer");
    expect(source).not.toContain("awaken");
    expect(source).not.toMatch(/service\s*===/);
    expect(source).not.toMatch(/provider\s*===/);
  });
});
