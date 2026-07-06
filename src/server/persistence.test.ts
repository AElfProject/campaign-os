import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { resolveCampaignOsRuntimeConfig } from "./config";
import {
  createCampaignOsDeterministicTestRepository,
  createCampaignOsJsonRepository,
  createCampaignOsMemoryRepository,
  createCampaignOsRepository,
  resolveRepositoryAdapterFactoryDecision,
  sanitizePersistenceSummary,
  type CampaignOsPersistenceRecord,
  type PersistenceSummary,
} from "./persistence";

const forbiddenKeys = [
  "apikey",
  "bearer",
  "mnemonic",
  "objectkey",
  "password",
  "privatekey",
  "secret",
  "seedphrase",
  "signature",
  "signedurl",
  "token",
];

const collectKeys = (value: unknown, keys: string[] = []): string[] => {
  if (!value || typeof value !== "object") {
    return keys;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectKeys(item, keys);
    }

    return keys;
  }

  for (const [key, nested] of Object.entries(value)) {
    keys.push(key.toLowerCase().replace(/[^a-z0-9]/g, ""));
    collectKeys(nested, keys);
  }

  return keys;
};

const expectNoForbiddenKeys = (value: unknown) => {
  const keys = collectKeys(value);

  for (const forbiddenKey of forbiddenKeys) {
    expect(keys).not.toContain(forbiddenKey);
  }
};

const sampleRecord = (summary: PersistenceSummary = {}) => ({
  campaignId: "camp-awaken-sprint",
  kind: "campaign_draft" as const,
  routeId: "campaigns.create" as const,
  summary,
  traceId: "trace-persistence-test",
  walletAddress: "2F4...9aB",
});

describe("Campaign OS persistence boundary", () => {
  it("resolves zero-config memory mode and explicit local JSON config", () => {
    expect(resolveCampaignOsRuntimeConfig({ env: {} })).toEqual({
      persistence: {
        adapterLabel: "memory",
        localDataDir: undefined,
        mode: "memory",
      },
      version: "0.2.0-local",
    });

    expect(
      resolveCampaignOsRuntimeConfig({
        env: {
          CAMPAIGN_OS_API_VERSION: "0.2.1-test",
          CAMPAIGN_OS_PERSISTENCE_DIR: "/tmp/campaign-os-review-state",
          CAMPAIGN_OS_PERSISTENCE_MODE: "local_json",
        },
      }),
    ).toEqual({
      persistence: {
        adapterLabel: "local_json:campaign-os-review-state",
        localDataDir: "/tmp/campaign-os-review-state",
        mode: "local_json",
      },
      version: "0.2.1-test",
    });
  });

  it("records sanitized data in memory and reports counts by kind", async () => {
    const repository = createCampaignOsMemoryRepository();
    await repository.initialize();

    const record = await repository.record(
      sampleRecord({
        privateKey: "should-not-persist",
        ready: true,
        rewardDescription: "Project-owned rewards.",
        signature: "should-not-persist",
      }),
    );
    const snapshot = await repository.snapshot();
    const health = await repository.health();

    expect(record.summary).toEqual({
      ready: true,
      rewardDescription: "Project-owned rewards.",
    });
    expect(snapshot).toMatchObject({
      mode: "memory",
      recordCount: 1,
      countsByKind: {
        campaign_draft: 1,
      },
    });
    expect(health).toMatchObject({
      adapterLabel: "memory",
      adapterPortId: "campaign-os-memory-adapter",
      durable: false,
      localOnly: true,
      noProductionDatabase: true,
      status: "ok",
    });
    expectNoForbiddenKeys(snapshot);
    expectNoForbiddenKeys(health);
  });

  it("persists local JSON records across repository recreation", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "campaign-os-persistence-"));

    try {
      const config = {
        adapterLabel: "local_json:test",
        localDataDir: tempDir,
        mode: "local_json" as const,
      };
      const firstRepository = createCampaignOsJsonRepository(config);
      await firstRepository.initialize();
      await firstRepository.record({
        kind: "wallet_session",
        routeId: "wallet.session.create",
        summary: {
          accountType: "EOA",
          signaturePayload: "should-not-persist",
          walletSource: "PORTKEY_EOA_APP",
        },
        traceId: "trace-json-one",
        walletAddress: "8A2...1eF",
        walletSource: "PORTKEY_EOA_APP",
      });

      const secondRepository = createCampaignOsJsonRepository(config);
      await secondRepository.initialize();
      const snapshot = await secondRepository.snapshot();

      expect(snapshot).toMatchObject({
        mode: "local_json",
        recordCount: 1,
        countsByKind: {
          wallet_session: 1,
        },
      });
      expect(snapshot.latestRecords[0]).toMatchObject<Partial<CampaignOsPersistenceRecord>>({
        kind: "wallet_session",
        routeId: "wallet.session.create",
        traceId: "trace-json-one",
        walletAddress: "8A2...1eF",
      });
      expect(snapshot.latestRecords[0].summary).toEqual({
        accountType: "EOA",
        walletSource: "PORTKEY_EOA_APP",
      });
      expectNoForbiddenKeys(snapshot);
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
  });

  it("sanitizes existing local JSON records before exposing snapshots", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "campaign-os-persistence-existing-"));

    try {
      await writeFile(
        join(tempDir, "campaign-os-persistence.json"),
        JSON.stringify({
          records: [
            {
              createdAt: "2026-07-06T09:00:00.000Z",
              id: "existing-record",
              kind: "export_preview",
              routeId: "campaigns.export.preview",
              summary: {
                objectKey: "exports/private.csv",
                readyRows: 2,
                signedUrl: "https://storage.invalid/private",
              },
              traceId: "trace-existing",
            },
          ],
          updatedAt: "2026-07-06T09:00:00.000Z",
          version: 1,
        }),
        "utf8",
      );

      const repository = createCampaignOsJsonRepository({
        adapterLabel: "local_json:existing",
        localDataDir: tempDir,
        mode: "local_json",
      });
      await repository.initialize();

      const snapshot = await repository.snapshot();

      expect(snapshot.latestRecords[0].summary).toEqual({
        readyRows: 2,
      });
      expectNoForbiddenKeys(snapshot);
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
  });

  it("creates repositories from runtime persistence config", async () => {
    const memory = createCampaignOsRepository({
      adapterLabel: "memory",
      mode: "memory",
    });
    await memory.initialize();

    expect(await memory.health()).toMatchObject({
      adapterPortId: "campaign-os-memory-adapter",
      mode: "memory",
      status: "ok",
    });
  });

  it("resolves explicit adapter factory decisions", () => {
    expect(resolveRepositoryAdapterFactoryDecision({ mode: "memory" })).toMatchObject({
      blocked: false,
      fallbackUsed: false,
      repositoryKind: "memory_repository",
      selectedDriverId: "campaign-os-memory-adapter",
      selectedMode: "memory",
    });

    expect(
      resolveRepositoryAdapterFactoryDecision({
        mode: "local_json",
        productionDriverId: "campaign-os-deterministic-test-adapter",
      }),
    ).toMatchObject({
      repositoryKind: "deterministic_test_repository",
      selectedDriverId: "campaign-os-deterministic-test-adapter",
      selectedMode: "deterministic_test",
    });
  });

  it("does not fallback to local adapters for production-required production driver", async () => {
    const repository = createCampaignOsRepository({
      adapterLabel: "production",
      mode: "memory",
      productionDriverId: "campaign-os-production-db-adapter",
    });

    await expect(repository.initialize()).rejects.toThrow("Production persistence adapter is deferred");
    await expect(repository.record(sampleRecord())).rejects.toThrow("Production persistence adapter is deferred");
    await expect(repository.snapshot()).rejects.toThrow("Production persistence adapter is deferred");
    await expect(repository.health()).resolves.toMatchObject({
      adapterPortId: "campaign-os-production-db-adapter",
      localOnly: true,
      noProductionDatabase: true,
      status: "unavailable",
    });
  });

  it("supports deterministic test adapter reset and transaction seam", async () => {
    const repository = createCampaignOsDeterministicTestRepository();

    await repository.initialize();
    if (!repository.withTransaction) {
      throw new Error("Expected deterministic repository to expose withTransaction.");
    }
    await repository.withTransaction(async (unitOfWork) => {
      expect(unitOfWork.id).toBe("deterministic-test-unit-of-work");
      await repository.record(sampleRecord({ ready: true }));
    });

    expect(await repository.snapshot()).toMatchObject({
      mode: "memory",
      recordCount: 1,
    });
    if (!repository.reset) {
      throw new Error("Expected deterministic repository to expose reset.");
    }
    await repository.reset();
    expect(await repository.snapshot()).toMatchObject({
      recordCount: 0,
    });
  });

  it("omits unsupported and forbidden summary values", () => {
    expect(
      sanitizePersistenceSummary({
        contentKeys: ["title", "description"],
        nested: { ignored: true },
        objectKey: "storage/private.csv",
        points: 120,
        token: "bearer",
      }),
    ).toEqual({
      contentKeys: ["title", "description"],
      points: 120,
    });
  });
});
