import { describe, expect, it } from "vitest";
import type { ExportArtifact } from "../domain/types";
import {
  createExportArtifactRegistry,
  exportArtifactRegistryForbiddenFields,
} from "./exportArtifactRegistry";

const boundary = {
  "en-US": "Local export artifact only.",
  "zh-CN": "仅本地导出 artifact。",
  "zh-TW": "Local export artifact only.",
};

const artifactFixture = (): ExportArtifact => ({
  batchId: "export-awaken-sprint-preview",
  campaignId: "camp-awaken-sprint",
  extension: "csv",
  fileName: "camp-awaken-sprint-export-awaken-sprint-preview-local-review.csv",
  format: "csv",
  metadata: {
    blockedRows: 0,
    checksum: "local-1234abcd",
    checksumAlgorithm: "fnv1a32-local-review",
    columns: ["campaign_id", "wallet_address", "export_batch_id"],
    generatedMode: "local_review_only",
    payloadBytes: 256,
    readyRows: 1,
    reviewRequiredRows: 3,
    totalRows: 4,
  },
  mimeType: "text/csv;charset=utf-8",
  payload: "campaign_id,wallet_address,export_batch_id\ncamp-awaken-sprint,2F4Wallet,export-awaken-sprint-preview",
  safety: {
    boundary,
    localOnly: true,
    noContractRoot: true,
    noContractTransaction: true,
    noDownloadUrl: true,
    noRewardCustody: true,
    noRewardDistribution: true,
    noStorageWrite: true,
    rewardDistributionOwner: "campaign_project",
    verifiedRecordsOnly: true,
  },
});

const registryContext = {
  createdAt: "2026-07-09T00:00:00.000Z",
  routeId: "campaigns.export.preview",
  traceId: "trace-export-registry",
  ttlHours: 24,
};

const expectSuccess = (
  result: ReturnType<ReturnType<typeof createExportArtifactRegistry>["register"]>,
) => {
  expect(result.ok).toBe(true);

  if (!result.ok) {
    throw new Error("Expected registry registration to succeed.");
  }

  return result.record;
};

const forbiddenAuditResponseMarkers = [
  "csvPreview",
  "jsonPreview",
  "downloadUrl",
  "storageKey",
  "objectKey",
  "signedUrl",
  "providerPayload",
  "contractRoot",
  "transactionId",
  "walletSignature",
  "rewardCustody",
  "rewardDistribution",
];

describe("export artifact registry", () => {
  it("registers deterministic local review artifact metadata", () => {
    const registry = createExportArtifactRegistry();
    const first = expectSuccess(registry.register(artifactFixture(), registryContext));
    const repeated = expectSuccess(registry.register(artifactFixture(), registryContext));

    expect(first).toEqual(repeated);
    expect(first).toMatchObject({
      artifactId: "export-artifact-local-d7d4fb3a",
      batchId: "export-awaken-sprint-preview",
      campaignId: "camp-awaken-sprint",
      checksum: "local-1234abcd",
      checksumAlgorithm: "fnv1a32-local-review",
      createdAt: "2026-07-09T00:00:00.000Z",
      expiresAt: "2026-07-10T00:00:00.000Z",
      fileName: "camp-awaken-sprint-export-awaken-sprint-preview-local-review.csv",
      format: "csv",
      mimeType: "text/csv;charset=utf-8",
      payloadBytes: 256,
      readyRows: 1,
      reviewRequiredRows: 3,
      routeId: "campaigns.export.preview",
      traceId: "trace-export-registry",
    });
    expect(first.retention).toMatchObject({
      mode: "local_review_ttl",
      productionStorageBacked: false,
      purgeRequired: true,
      ttlHours: 24,
    });
    expect(first.auditEvents.map((event) => event.type)).toEqual([
      "registered_local_artifact",
      "storage_disabled",
    ]);
  });

  it("keeps every live side effect disabled", () => {
    const record = expectSuccess(createExportArtifactRegistry().register(artifactFixture(), registryContext));

    expect(record.safety).toMatchObject({
      contractRootWriteEnabled: false,
      downloadUrlEnabled: false,
      forbiddenFieldsAbsent: true,
      localReviewOnly: true,
      objectKeyEnabled: false,
      providerCallEnabled: false,
      queueExecutionEnabled: false,
      rewardCustodyEnabled: false,
      rewardDistributionEnabled: false,
      schedulerExecutionEnabled: false,
      signedUrlEnabled: false,
      storageWriteEnabled: false,
      walletSigningEnabled: false,
    });
  });

  it("rejects forbidden live fields without echoing unsafe values", () => {
    const unsafeArtifact = {
      ...artifactFixture(),
      signedUrl: "https://storage.invalid/export.csv?X-Amz-Signature=secret",
    };
    const result = createExportArtifactRegistry().register(unsafeArtifact, registryContext);

    expect(result.ok).toBe(false);

    if (result.ok) {
      throw new Error("Expected unsafe artifact to fail.");
    }

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "EXPORT_ARTIFACT_REGISTRY_UNSAFE_FIELD",
        field: "signedUrl",
        severity: "error",
      }),
    ]);
    expect(JSON.stringify(result.diagnostics)).not.toContain("X-Amz-Signature");
    expect(result.safety.forbiddenFieldsAbsent).toBe(false);
  });

  it("rejects missing required fields", () => {
    const brokenArtifact = {
      ...artifactFixture(),
      metadata: {
        ...artifactFixture().metadata,
        checksum: "",
      },
    };
    const result = createExportArtifactRegistry().register(brokenArtifact, registryContext);

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({
          code: "EXPORT_ARTIFACT_REGISTRY_REQUIRED_FIELD_MISSING",
          field: "metadata.checksum",
        }),
      );
    }
  });

  it("does not serialize forbidden live fields in successful records", () => {
    const record = expectSuccess(createExportArtifactRegistry().register(artifactFixture(), registryContext));
    const serialized = JSON.stringify(record);

    for (const forbidden of exportArtifactRegistryForbiddenFields) {
      expect(serialized).not.toContain(`"${forbidden}":`);
    }
    expect(serialized).not.toContain("X-Amz-Signature");
    expect(serialized).not.toContain("tenant/raw");
  });

  it("registers small artifacts under the focused performance budget", () => {
    const registry = createExportArtifactRegistry();
    const startedAt = performance.now();
    const record = expectSuccess(registry.register(artifactFixture(), registryContext));
    const elapsedMs = performance.now() - startedAt;

    expect(record.artifactId).toMatch(/^export-artifact-local-[0-9a-f]{8}$/);
    expect(elapsedMs).toBeLessThan(20);
  });

  it("lists zero-count audit records for campaigns without registrations", () => {
    const result = createExportArtifactRegistry().list({
      campaignId: "camp-empty",
      now: "2026-07-09T12:00:00.000Z",
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected empty audit list to succeed.");
    }

    expect(result.payload).toMatchObject({
      campaignId: "camp-empty",
      filters: {},
      records: [],
      summary: {
        activeRecords: 0,
        blockedRows: 0,
        expiredRecords: 0,
        readyRows: 0,
        reviewRequiredRows: 0,
        totalRecords: 0,
        totalRows: 0,
      },
    });
    expect(result.payload.safety.localReviewOnly).toBe(true);
  });

  it("upserts registrations into a queryable campaign audit list", () => {
    const registry = createExportArtifactRegistry();
    const record = expectSuccess(registry.register(artifactFixture(), registryContext));
    const repeated = expectSuccess(registry.register(artifactFixture(), registryContext));
    const list = registry.list({
      campaignId: "camp-awaken-sprint",
      now: "2026-07-09T12:00:00.000Z",
    });

    expect(repeated.artifactId).toBe(record.artifactId);
    expect(list.ok).toBe(true);

    if (!list.ok) {
      throw new Error("Expected audit list to succeed.");
    }

    expect(list.payload.records).toHaveLength(1);
    expect(list.payload.records[0]).toMatchObject({
      artifactId: record.artifactId,
      batchId: "export-awaken-sprint-preview",
      campaignId: "camp-awaken-sprint",
      traceId: "trace-export-registry",
    });
    expect(list.payload.summary).toMatchObject({
      activeRecords: 1,
      blockedRows: 0,
      expiredRecords: 0,
      readyRows: 1,
      reviewRequiredRows: 3,
      totalRecords: 1,
      totalRows: 4,
    });
  });

  it("filters audit records by batch, artifact, trace, format, and retention state", () => {
    const registry = createExportArtifactRegistry();
    const active = expectSuccess(registry.register(artifactFixture(), registryContext));
    const expired = expectSuccess(registry.register(
      {
        ...artifactFixture(),
        batchId: "export-awaken-sprint-expired",
        metadata: {
          ...artifactFixture().metadata,
          checksum: "local-expired",
        },
      },
      {
        ...registryContext,
        createdAt: "2026-07-07T00:00:00.000Z",
        traceId: "trace-export-expired",
      },
    ));

    const filtered = registry.list({
      artifactId: active.artifactId,
      batchId: "export-awaken-sprint-preview",
      campaignId: "camp-awaken-sprint",
      format: "csv",
      now: "2026-07-09T12:00:00.000Z",
      retentionState: "active",
      traceId: "trace-export-registry",
    });
    const expiredList = registry.list({
      campaignId: "camp-awaken-sprint",
      now: "2026-07-09T12:00:00.000Z",
      retentionState: "expired",
    });

    expect(filtered.ok).toBe(true);
    expect(expiredList.ok).toBe(true);

    if (!filtered.ok || !expiredList.ok) {
      throw new Error("Expected filtered audit lists to succeed.");
    }

    expect(filtered.payload.records.map((record) => record.artifactId)).toEqual([active.artifactId]);
    expect(expiredList.payload.records.map((record) => record.artifactId)).toEqual([expired.artifactId]);
  });

  it("gets a single audit record by campaign and artifact id", () => {
    const registry = createExportArtifactRegistry();
    const record = expectSuccess(registry.register(artifactFixture(), registryContext));
    const detail = registry.get({
      artifactId: record.artifactId,
      campaignId: "camp-awaken-sprint",
    });

    expect(detail.ok).toBe(true);

    if (!detail.ok) {
      throw new Error("Expected artifact detail to succeed.");
    }

    expect(detail.payload).toMatchObject({
      artifactId: record.artifactId,
      campaignId: "camp-awaken-sprint",
      record: {
        artifactId: record.artifactId,
        checksum: "local-1234abcd",
      },
    });
  });

  it("fails closed for invalid audit filters and missing artifact details", () => {
    const registry = createExportArtifactRegistry();
    const record = expectSuccess(registry.register(artifactFixture(), registryContext));
    const invalidFormat = registry.list({
      campaignId: "camp-awaken-sprint",
      format: "xml",
    });
    const missing = registry.get({
      artifactId: record.artifactId,
      campaignId: "camp-other",
    });

    expect(invalidFormat.ok).toBe(false);
    expect(missing.ok).toBe(false);

    if (!invalidFormat.ok) {
      expect(invalidFormat.diagnostics).toContainEqual(
        expect.objectContaining({
          code: "EXPORT_ARTIFACT_REGISTRY_INVALID_FILTER",
          field: "format",
        }),
      );
    }
    if (!missing.ok) {
      expect(missing.diagnostics).toContainEqual(
        expect.objectContaining({
          code: "EXPORT_ARTIFACT_REGISTRY_ARTIFACT_NOT_FOUND",
          field: "artifactId",
        }),
      );
    }
  });

  it("keeps audit list and detail responses free of payload and live side-effect markers", () => {
    const registry = createExportArtifactRegistry();
    const record = expectSuccess(registry.register(artifactFixture(), registryContext));
    const list = registry.list({ campaignId: "camp-awaken-sprint" });
    const detail = registry.get({
      artifactId: record.artifactId,
      campaignId: "camp-awaken-sprint",
    });

    expect(list.ok).toBe(true);
    expect(detail.ok).toBe(true);

    const serialized = JSON.stringify({ detail, list });

    for (const marker of forbiddenAuditResponseMarkers) {
      expect(serialized).not.toContain(`"${marker}":`);
    }
    expect(serialized).not.toContain("2F4Wallet");
    expect(serialized).not.toContain("X-Amz-Signature");
  });

  it("lists fifty local audit records under the focused performance budget", () => {
    const registry = createExportArtifactRegistry();

    for (let index = 0; index < 50; index += 1) {
      expectSuccess(registry.register(
        {
          ...artifactFixture(),
          batchId: `export-batch-${index.toString().padStart(2, "0")}`,
          metadata: {
            ...artifactFixture().metadata,
            checksum: `local-${index.toString().padStart(2, "0")}`,
          },
        },
        {
          ...registryContext,
          traceId: `trace-${index.toString().padStart(2, "0")}`,
        },
      ));
    }

    const startedAt = performance.now();
    const list = registry.list({
      campaignId: "camp-awaken-sprint",
      now: "2026-07-09T12:00:00.000Z",
    });
    const elapsedMs = performance.now() - startedAt;

    expect(list.ok).toBe(true);

    if (!list.ok) {
      throw new Error("Expected audit list to succeed.");
    }

    expect(list.payload.records).toHaveLength(50);
    expect(list.payload.summary.totalRecords).toBe(50);
    expect(elapsedMs).toBeLessThan(25);
  });
});
