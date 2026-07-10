import { describe, expect, it } from "vitest";
import {
  createObjectStorageExportReadiness,
  objectStorageExportRequiredConfigKeys,
  objectStorageExportRuntimeNoLiveSafety,
  sanitizeObjectStorageExportRuntimeValue,
} from "./objectStorageExportRuntime";

describe("object storage export runtime readiness", () => {
  it("fails closed when object storage config is absent", () => {
    const readiness = createObjectStorageExportReadiness();

    expect(readiness).toMatchObject({
      id: "campaign-os-object-storage-export-runtime",
      status: "blocked",
      providerStatus: "not_configured",
      supportMode: "local_review",
      productionReady: false,
      valid: true,
      requiredConfigKeys: objectStorageExportRequiredConfigKeys,
      safety: objectStorageExportRuntimeNoLiveSafety,
      manifestSummary: {
        artifactCount: 0,
        auditTraceId: "object-storage-export-local-review",
        classification: "local_manifest_only",
        containsDownloadUrl: false,
        containsObjectKey: false,
        containsSignedUrl: false,
        exportBatchId: "local-export-review",
        formats: [],
        retentionClass: "review_only",
      },
    });
    expect(readiness.diagnosticCodes).toEqual([
      "OBJECT_STORAGE_PROVIDER_MISSING",
      "OBJECT_STORAGE_BUCKET_MISSING",
      "OBJECT_STORAGE_CREDENTIAL_REF_MISSING",
      "OBJECT_STORAGE_SIGNED_URL_POLICY_MISSING",
      "OBJECT_STORAGE_RETENTION_POLICY_MISSING",
      "OBJECT_STORAGE_APPROVAL_REQUIRED",
      "OBJECT_STORAGE_LIVE_EXECUTION_DISABLED",
    ]);
    expect(readiness.blockerCount).toBe(7);
    expect(Object.values(readiness.safety).filter((value) => value === true)).toEqual([
      true,
      true,
      true,
    ]);
  });

  it("keeps partial configuration blocked and redacts unsafe diagnostic values", () => {
    const readiness = createObjectStorageExportReadiness({
      approvalGranted: false,
      config: {
        bucketRef: "/Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/evidence/private.csv",
        credentialRef: "plain-secret-token",
        providerRef: "provider.object-storage.local",
        retentionPolicyRef: "policy-ref:review",
        signedUrlPolicyRef: "https://storage.invalid/export.csv?X-Amz-Signature=abc123",
      },
      diagnostics: [
        {
          code: "OBJECT_STORAGE_BUCKET_MISSING",
          field: "bucketRef",
          message:
            "bucket /private/tmp/raw.csv has objectKey tenant/raw/winners.csv and bearer token leaked",
          safeDetails: {
            privatePath: "/Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/secret",
            providerPayload: { rawSignature: "wallet-signature", stack: "Error: boom\n    at x.y" },
            signedUrl: "https://storage.invalid/file.json?signature=unsafe",
          },
          severity: "warning",
        },
      ],
      manifest: {
        artifacts: [
          { batchId: "batch-z", format: "json" },
          { batchId: "batch-z", format: "csv" },
        ],
        traceId: "trace-partial",
      },
    });

    const serialized = JSON.stringify(readiness);

    expect(readiness.status).toBe("blocked");
    expect(readiness.providerStatus).toBe("approval_required");
    expect(readiness.manifestSummary).toMatchObject({
      artifactCount: 2,
      auditTraceId: "trace-partial",
      exportBatchId: "batch-z",
      formats: ["csv", "json"],
    });
    expect(serialized).toContain("[REDACTED:PRIVATE_PATH]");
    expect(serialized).toContain("[REDACTED:SIGNED_URL]");
    expect(serialized).toContain("[REDACTED:OBJECT_KEY]");
    expect(serialized).toContain("[REDACTED:CREDENTIAL]");
    expect(serialized).toContain("[REDACTED:STACK]");
    expect(serialized).not.toContain("campaign-os-kitty");
    expect(serialized).not.toContain("X-Amz-Signature");
    expect(serialized).not.toContain("tenant/raw/winners");
    expect(serialized).not.toContain("plain-secret-token");
    expect(serialized).not.toContain("wallet-signature");
  });

  it("creates deterministic manifest summaries from local artifacts", () => {
    const input = {
      approvalGranted: true,
      config: {
        bucketRef: "config-ref:storage-bucket",
        credentialRef: "secret-ref:object-storage",
        providerRef: "provider.object-storage.local",
        retentionPolicyRef: "policy-ref:retention-review",
        signedUrlPolicyRef: "policy-ref:signed-url-disabled",
      },
      manifest: {
        artifacts: [
          { batchId: "batch-b", format: "json" },
          { batchId: "batch-a", format: "csv" },
          { batchId: "batch-a", format: "csv" },
        ],
        retentionClass: "short_lived" as const,
        traceId: "trace-local-ready",
      },
    };

    const first = createObjectStorageExportReadiness(input);
    const second = createObjectStorageExportReadiness(input);

    expect(first).toEqual(second);
    expect(first.status).toBe("local_ready");
    expect(first.providerStatus).toBe("ready_for_provider_binding");
    expect(first.blockerCount).toBe(1);
    expect(first.diagnosticCodes).toEqual(["OBJECT_STORAGE_LIVE_EXECUTION_DISABLED"]);
    expect(first.manifestSummary).toEqual({
      artifactCount: 3,
      auditTraceId: "trace-local-ready",
      classification: "local_manifest_only",
      containsDownloadUrl: false,
      containsObjectKey: false,
      containsSignedUrl: false,
      exportBatchId: "batch-a",
      formats: ["csv", "json"],
      retentionClass: "short_lived",
    });
  });

  it("sanitizes hostile nested values without mutating safe references", () => {
    expect(sanitizeObjectStorageExportRuntimeValue({
      bucketRef: "config-ref:storage-bucket",
      credentialRef: "secret-ref:object-storage",
      downloadUrl: "https://storage.invalid/object.csv?token=unsafe",
      nested: [
        "s3://private-bucket/raw/winners.json",
        "raw provider payload {\"token\":\"unsafe\"}",
      ],
    })).toEqual({
      bucketRef: "config-ref:storage-bucket",
      credentialRef: "secret-ref:object-storage",
      downloadUrl: "[REDACTED:SIGNED_URL]",
      nested: [
        "[REDACTED:OBJECT_KEY]",
        "[REDACTED:PROVIDER_PAYLOAD]",
      ],
    });
  });
});
