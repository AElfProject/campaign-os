import { describe, expect, it, vi } from "vitest";
import {
  createExportArtifactDeliveryApiLoadingState,
  sanitizeExportArtifactDeliveryApiText,
  submitExportArtifactDeliveryApiReview,
  type ExportArtifactDeliveryApiFetch,
  type ExportArtifactDeliveryRequest,
} from "./exportArtifactDeliveryApiBridge";

const request: ExportArtifactDeliveryRequest = {
  campaignId: "camp-awaken-sprint",
  contractRootMode: "none",
  format: "json",
  includeLocalePreference: true,
  includeRiskFlags: true,
  includeWalletType: true,
};

const response = (
  body: unknown,
  options: { ok?: boolean; status?: number; traceId?: string } = {},
): Response => ({
  headers: new Headers(options.traceId ? { "x-campaign-os-trace-id": options.traceId } : {}),
  json: vi.fn(async () => body),
  ok: options.ok ?? true,
  status: options.status ?? 200,
} as unknown as Response);

const previewPayload = {
  artifact: {
    batchId: "export-awaken-sprint-preview",
    campaignId: request.campaignId,
    fileName: "camp-awaken-sprint-export-awaken-sprint-preview-local-review.json",
    format: "json",
    metadata: {
      blockedRows: 0,
      checksum: "sha256-local-artifact",
      checksumAlgorithm: "sha256",
      columns: ["wallet_address", "wallet_type", "locale_preference"],
      generatedMode: "local_review_only",
      payloadBytes: 512,
      readyRows: 3,
      reviewRequiredRows: 1,
      totalRows: 4,
    },
    mimeType: "application/json",
    safety: {
      localOnly: true,
      noContractRoot: true,
      noContractTransaction: true,
      noDownloadUrl: true,
      noRewardCustody: true,
      noRewardDistribution: true,
      noStorageWrite: true,
      verifiedRecordsOnly: true,
    },
  },
  artifactRegistry: {
    artifactId: "export-artifact-local-camp-awaken-sprint",
    auditEvents: [
      {
        id: "audit-event-1",
        routeId: "campaigns.export.preview",
        traceId: "trace-export-preview-header",
        type: "registered_local_artifact",
      },
      {
        id: "audit-event-2",
        routeId: "campaigns.export.preview",
        traceId: "trace-export-preview-header",
        type: "storage_disabled",
      },
    ],
    batchId: "export-awaken-sprint-preview",
    campaignId: request.campaignId,
    checksum: "sha256-local-artifact",
    checksumAlgorithm: "sha256",
    expiresAt: "2026-07-10T00:00:00.000Z",
    retention: {
      mode: "local_review_ttl",
      productionStorageBacked: false,
      purgeRequired: true,
      ttlHours: 24,
    },
    routeId: "campaigns.export.preview",
    safety: {
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
    },
    traceId: "trace-export-preview-header",
  },
  blockedRows: 0,
  campaignId: request.campaignId,
  columns: ["wallet_address", "wallet_type", "locale_preference"],
  contractRootMode: "none",
  disclaimer: "Export winners does not distribute rewards.",
  exportBatchId: "export-awaken-sprint-preview",
  format: "json",
  readyRows: 3,
  reviewRequiredRows: 1,
};

const auditListPayload = {
  boundary: {
    "en-US": "Local export artifact registry only.",
    "zh-CN": "仅本地导出 artifact registry。",
    "zh-TW": "Local export artifact registry only.",
  },
  campaignId: request.campaignId,
  filters: {
    artifactId: "export-artifact-local-camp-awaken-sprint",
    batchId: "export-awaken-sprint-preview",
    traceId: "trace-export-preview-header",
  },
  records: [
    {
      artifactId: "export-artifact-local-camp-awaken-sprint",
      batchId: "export-awaken-sprint-preview",
      campaignId: request.campaignId,
      checksum: "sha256-local-artifact",
      retention: {
        mode: "local_review_ttl",
        productionStorageBacked: false,
        purgeRequired: true,
        ttlHours: 24,
      },
      routeId: "campaigns.export.preview",
      safety: {
        downloadUrlEnabled: false,
        localReviewOnly: true,
        storageWriteEnabled: false,
      },
      traceId: "trace-export-preview-header",
    },
  ],
  safety: {
    downloadUrlEnabled: false,
    localReviewOnly: true,
    storageWriteEnabled: false,
  },
  summary: {
    activeRecords: 1,
    blockedRows: 0,
    expiredRecords: 0,
    readyRows: 3,
    reviewRequiredRows: 1,
    totalRecords: 1,
    totalRows: 4,
  },
};

const auditDetailPayload = {
  artifactId: "export-artifact-local-camp-awaken-sprint",
  boundary: {
    "en-US": "Local export artifact registry only.",
    "zh-CN": "仅本地导出 artifact registry。",
    "zh-TW": "Local export artifact registry only.",
  },
  campaignId: request.campaignId,
  record: {
    artifactId: "export-artifact-local-camp-awaken-sprint",
    auditEvents: previewPayload.artifactRegistry.auditEvents,
    batchId: "export-awaken-sprint-preview",
    campaignId: request.campaignId,
    checksum: "sha256-local-artifact",
    expiresAt: "2026-07-10T00:00:00.000Z",
    retention: previewPayload.artifactRegistry.retention,
    routeId: "campaigns.export.preview",
    safety: previewPayload.artifactRegistry.safety,
    traceId: "trace-export-preview-header",
  },
  safety: {
    downloadUrlEnabled: false,
    localReviewOnly: true,
    storageWriteEnabled: false,
  },
};

describe("export artifact delivery API bridge", () => {
  it("creates a loading state without touching the network", () => {
    const state = createExportArtifactDeliveryApiLoadingState(request);

    expect(state).toMatchObject({
      configured: true,
      loading: true,
      request,
      source: "loading",
      status: "loading",
    });
    expect(state.boundary["en-US"]).toContain("No download URL");
  });

  it("treats missing API config as seeded fallback and does not fetch", async () => {
    const fetchImpl = vi.fn() as unknown as ExportArtifactDeliveryApiFetch;

    const state = await submitExportArtifactDeliveryApiReview({
      config: { baseUrl: "   " },
      fetchImpl,
      request,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(state).toMatchObject({
      configured: false,
      diagnostics: [{ code: "API_BASE_URL_MISSING", severity: "info" }],
      loading: false,
      source: "seeded_fallback",
      status: "fallback",
    });
  });

  it("redacts invalid base URL details and unsafe fragments", async () => {
    const state = await submitExportArtifactDeliveryApiReview({
      config: {
        baseUrl: "ftp://api.invalid/path?token=sample-token&api_key=private-key-sample",
      },
      fetchImpl: vi.fn() as unknown as ExportArtifactDeliveryApiFetch,
      request,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
      configured: true,
      diagnostics: [{ code: "API_BASE_URL_INVALID", severity: "warning" }],
      source: "seeded_fallback",
      status: "fallback",
    });
    for (const unsafe of ["token=sample-token", "api_key", "private-key", "private key"]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("delivers preview, audit list, and audit detail from runtime envelopes", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({
        data: {
          campaignDb: {
            createdViaRepository: true,
            repositoryId: "campaign-db-repository-runtime",
            storeId: "campaign-db",
          },
          payload: previewPayload,
          persistence: {
            kind: "export_preview",
            recordId: "persist-export-preview-1",
          },
        },
        ok: true,
        traceId: "trace-export-preview-envelope",
      }, { traceId: "trace-export-preview-header" }))
      .mockResolvedValueOnce(response({
        data: {
          payload: auditListPayload,
        },
        ok: true,
        traceId: "trace-export-audit-list-envelope",
      }, { traceId: "trace-export-audit-list-header" }))
      .mockResolvedValueOnce(response({
        data: {
          payload: auditDetailPayload,
        },
        ok: true,
        traceId: "trace-export-audit-detail-envelope",
      }, { traceId: "trace-export-audit-detail-header" })) as unknown as ExportArtifactDeliveryApiFetch;

    const state = await submitExportArtifactDeliveryApiReview({
      config: {
        baseUrl: "http://127.0.0.1:5184/",
        headers: {
          "x-campaign-os-roles": "project_owner",
        },
        tracePrefix: "export-delivery-review",
      },
      fetchImpl,
      request,
    });

    expect(state).toMatchObject({
      artifactId: "export-artifact-local-camp-awaken-sprint",
      auditDetail: {
        artifactId: "export-artifact-local-camp-awaken-sprint",
        record: {
          auditEvents: [
            { type: "registered_local_artifact" },
            { type: "storage_disabled" },
          ],
          checksum: "sha256-local-artifact",
          retention: {
            productionStorageBacked: false,
            ttlHours: 24,
          },
          safety: {
            downloadUrlEnabled: false,
            queueExecutionEnabled: false,
            storageWriteEnabled: false,
            walletSigningEnabled: false,
          },
        },
      },
      auditList: {
        filters: {
          artifactId: "export-artifact-local-camp-awaken-sprint",
          batchId: "export-awaken-sprint-preview",
        },
        summary: {
          totalRecords: 1,
          totalRows: 4,
        },
      },
      diagnostics: [],
      persistence: {
        kind: "export_preview",
        recordId: "persist-export-preview-1",
      },
      preview: {
        artifact: {
          metadata: {
            checksum: "sha256-local-artifact",
            generatedMode: "local_review_only",
          },
          safety: {
            noDownloadUrl: true,
            noRewardDistribution: true,
            noStorageWrite: true,
          },
        },
        exportBatchId: "export-awaken-sprint-preview",
        readyRows: 3,
        reviewRequiredRows: 1,
      },
      registry: {
        artifactId: "export-artifact-local-camp-awaken-sprint",
        checksum: "sha256-local-artifact",
        retention: {
          productionStorageBacked: false,
          ttlHours: 24,
        },
        safety: {
          localReviewOnly: true,
          signedUrlEnabled: false,
          storageWriteEnabled: false,
        },
      },
      repository: {
        createdViaRepository: true,
        repositoryId: "campaign-db-repository-runtime",
        storeId: "campaign-db",
      },
      source: "api_runtime",
      status: "delivered",
      traceId: "trace-export-audit-detail-header",
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:5184/api/campaigns/camp-awaken-sprint/export",
      expect.objectContaining({
        body: JSON.stringify({
          contractRootMode: "none",
          format: "json",
          includeLocalePreference: true,
          includeRiskFlags: true,
          includeWalletType: true,
        }),
        headers: expect.objectContaining({
          accept: "application/json",
          "content-type": "application/json",
          "x-campaign-os-roles": "project_owner",
          "x-campaign-os-trace-id": expect.stringMatching(/^export-delivery-review-/),
        }),
        method: "POST",
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "http://127.0.0.1:5184/api/campaigns/camp-awaken-sprint/export-artifacts?artifactId=export-artifact-local-camp-awaken-sprint&batchId=export-awaken-sprint-preview&traceId=trace-export-preview-header",
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: "application/json",
          "x-campaign-os-trace-id": expect.stringMatching(/^export-delivery-review-/),
        }),
        method: "GET",
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      "http://127.0.0.1:5184/api/campaigns/camp-awaken-sprint/export-artifacts/export-artifact-local-camp-awaken-sprint",
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: "application/json",
          "x-campaign-os-trace-id": expect.stringMatching(/^export-delivery-review-/),
        }),
        method: "GET",
      }),
    );
  });

  it("keeps seeded fallback when the preview route fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response({
      error: {
        message:
          "provider payload leaked raw signature, private key, signed URL, object key, and /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/evidence/raw",
      },
      ok: false,
      traceId: "trace-export-preview-failed",
    }, { ok: false, status: 500, traceId: "trace-export-preview-failed" })) as unknown as ExportArtifactDeliveryApiFetch;

    const state = await submitExportArtifactDeliveryApiReview({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl,
      request,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
      diagnostics: [{
        code: "API_EXPORT_PREVIEW_FAILED",
        safeDetails: {
          endpoint: "/api/campaigns/camp-awaken-sprint/export",
          status: 500,
        },
      }],
      source: "error_fallback",
      status: "error",
      traceId: "trace-export-preview-failed",
    });
    for (const unsafe of ["provider payload", "raw signature", "private key", "signed url", "object key", "campaign-os-kitty"]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("keeps preview and registry visible when audit list fails", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({
        data: {
          payload: previewPayload,
        },
        ok: true,
        traceId: "trace-export-preview-envelope",
      }, { traceId: "trace-export-preview-header" }))
      .mockResolvedValueOnce(response({
        error: {
          message: "signed URL and storage key rejected",
        },
        ok: false,
        traceId: "trace-export-audit-list-failed",
      }, { ok: false, status: 400, traceId: "trace-export-audit-list-failed" })) as unknown as ExportArtifactDeliveryApiFetch;

    const state = await submitExportArtifactDeliveryApiReview({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl,
      request,
    });

    expect(state).toMatchObject({
      artifactId: "export-artifact-local-camp-awaken-sprint",
      diagnostics: [{ code: "API_AUDIT_LIST_FAILED" }],
      preview: {
        exportBatchId: "export-awaken-sprint-preview",
      },
      registry: {
        artifactId: "export-artifact-local-camp-awaken-sprint",
      },
      source: "api_runtime",
      status: "partial",
      traceId: "trace-export-audit-list-failed",
    });
    expect(state.auditList).toBeUndefined();
    expect(state.auditDetail).toBeUndefined();
  });

  it("keeps audit list visible when audit detail fails", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({
        data: {
          payload: previewPayload,
        },
        ok: true,
        traceId: "trace-export-preview-envelope",
      }, { traceId: "trace-export-preview-header" }))
      .mockResolvedValueOnce(response({
        data: {
          payload: auditListPayload,
        },
        ok: true,
        traceId: "trace-export-audit-list-envelope",
      }, { traceId: "trace-export-audit-list-header" }))
      .mockResolvedValueOnce(response({
        error: {
          message: "wallet signing payload rejected",
        },
        ok: false,
        traceId: "trace-export-audit-detail-failed",
      }, { ok: false, status: 404, traceId: "trace-export-audit-detail-failed" })) as unknown as ExportArtifactDeliveryApiFetch;

    const state = await submitExportArtifactDeliveryApiReview({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl,
      request,
    });

    expect(state).toMatchObject({
      auditList: {
        summary: {
          totalRecords: 1,
        },
      },
      diagnostics: [{ code: "API_AUDIT_DETAIL_FAILED" }],
      source: "api_runtime",
      status: "partial",
      traceId: "trace-export-audit-detail-failed",
    });
    expect(state.auditDetail).toBeUndefined();
  });

  it("returns a sanitized timeout diagnostic when the request is aborted", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new DOMException(
        "Request aborted with bearer token sample-token, password=secret, seed phrase sample, raw-signature, signed URL, and stack trace.",
        "AbortError",
      );
    }) as unknown as ExportArtifactDeliveryApiFetch;

    const state = await submitExportArtifactDeliveryApiReview({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl,
      request,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
      diagnostics: [{ code: "API_REQUEST_TIMEOUT" }],
      source: "error_fallback",
      status: "error",
    });
    for (const unsafe of ["sample-token", "password=secret", "seed phrase", "raw-signature", "signed url", "stack trace"]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("falls back safely when the preview payload shape is malformed", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response({
      data: {
        payload: {
          artifactRegistry: {
            artifactId: "missing-preview-fields",
          },
          campaignId: request.campaignId,
        },
      },
      ok: true,
      traceId: "trace-invalid-preview",
    })) as unknown as ExportArtifactDeliveryApiFetch;

    const state = await submitExportArtifactDeliveryApiReview({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl,
      request,
    });

    expect(state).toMatchObject({
      diagnostics: [{ code: "API_RESPONSE_INVALID" }],
      source: "error_fallback",
      status: "error",
      traceId: "trace-invalid-preview",
    });
  });

  it("redacts unsafe diagnostic fragments directly", () => {
    const sanitized = sanitizeExportArtifactDeliveryApiText(
      "private key and seed phrase in /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/raw?token=secret with provider payload, wallet signature, signed URL, object key, storage key, and stack trace",
    ).toLowerCase();

    for (const unsafe of [
      "private key",
      "seed phrase",
      "campaign-os-kitty",
      "token=secret",
      "provider payload",
      "wallet signature",
      "signed url",
      "object key",
      "storage key",
      "stack trace",
    ]) {
      expect(sanitized).not.toContain(unsafe);
    }
  });

  it("normalizes current fixture scale under 50 ms", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({
        data: {
          payload: {
            ...previewPayload,
            rows: Array.from({ length: 120 }, (_, index) => ({
              rowStatus: index % 7 === 0 ? "review_required" : "ready",
              walletAddress: `2F4Scale${index}`,
            })),
          },
        },
        ok: true,
        traceId: "trace-export-preview-envelope",
      }, { traceId: "trace-export-preview-header" }))
      .mockResolvedValueOnce(response({
        data: {
          payload: auditListPayload,
        },
        ok: true,
        traceId: "trace-export-audit-list-envelope",
      }))
      .mockResolvedValueOnce(response({
        data: {
          payload: auditDetailPayload,
        },
        ok: true,
        traceId: "trace-export-audit-detail-envelope",
      })) as unknown as ExportArtifactDeliveryApiFetch;
    const startedAt = performance.now();

    const state = await submitExportArtifactDeliveryApiReview({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl,
      request,
    });

    expect(state.status).toBe("delivered");
    expect(performance.now() - startedAt).toBeLessThan(50);
  });
});
