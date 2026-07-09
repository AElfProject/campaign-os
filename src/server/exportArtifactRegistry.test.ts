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
});
