import { describe, expect, it } from "vitest";
import { campaignDetail } from "./fixtures";
import {
  analyticsIngestionRuntimeNoLiveSideEffects,
  createAnalyticsIngestionRuntimeReadiness,
  sanitizeAnalyticsIngestionRuntimeValue,
} from "./analyticsIngestionRuntime";

describe("createAnalyticsIngestionRuntimeReadiness", () => {
  it("creates deterministic local analytics ingestion readiness", () => {
    const first = createAnalyticsIngestionRuntimeReadiness({ campaign: campaignDetail });
    const second = createAnalyticsIngestionRuntimeReadiness({ campaign: campaignDetail });

    expect(first).toEqual(second);
    expect(first.campaignId).toBe(campaignDetail.id);
    expect(first.source).toBe("seeded_runtime");
    expect(first.status).toBe("blocked");
    expect(first.productionReady).toBe(false);
    expect(first.valid).toBe(true);
    expect(first.boundary["en-US"]).toContain("No live analytics SDK");
  });

  it("covers required event groups and metric lineage rows", () => {
    const readiness = createAnalyticsIngestionRuntimeReadiness({ campaign: campaignDetail });

    expect(readiness.eventCatalog.map((group) => group.id)).toEqual([
      "ai_ops_report",
      "campaign_closeout",
      "campaign_lifecycle",
      "export_readiness",
      "i18n_content_review",
      "points_ranking",
      "referral_risk",
      "task_verification",
      "wallet_session",
    ]);
    expect(readiness.metricLineage.map((row) => row.id)).toEqual([
      "ai_ops_report_inputs",
      "eligible_winners",
      "export_readiness",
      "locale_split",
      "participants",
      "referral_conversion",
      "risk_queue",
      "verified_actions",
      "wallet_split",
    ]);
    expect(readiness.summary.eventGroupCount).toBe(9);
    expect(readiness.summary.metricLineageCount).toBe(9);
    expect(readiness.summary.totalParticipants).toBe(campaignDetail.participants.length);
    expect(readiness.summary.eligibleWinners).toBe(campaignDetail.metrics.exportReadyWinners);
  });

  it("fails closed when warehouse handoff is absent or partial", () => {
    const absent = createAnalyticsIngestionRuntimeReadiness({ campaign: campaignDetail });
    const partial = createAnalyticsIngestionRuntimeReadiness({
      campaign: campaignDetail,
      warehouseHandoff: {
        approvalRef: "approval-ref:analytics-review",
        schemaRef: "schema-ref:analytics-events",
      },
    });

    expect(absent.warehouseHandoff).toMatchObject({
      status: "missing",
      productionReady: false,
      liveWarehouseWriteEnabled: false,
      eventWarehouseWriteAttempted: false,
    });
    expect(partial.warehouseHandoff).toMatchObject({
      status: "partial",
      productionReady: false,
      liveWarehouseWriteEnabled: false,
      eventWarehouseWriteAttempted: false,
    });
    expect(absent.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "ANALYTICS_WAREHOUSE_HANDOFF_MISSING",
        "ANALYTICS_LIVE_EXECUTION_DISABLED",
      ]),
    );
    expect(partial.diagnosticCodes).toContain("ANALYTICS_WAREHOUSE_HANDOFF_INCOMPLETE");
  });

  it("allows optional seeded count overrides without changing safety posture", () => {
    const readiness = createAnalyticsIngestionRuntimeReadiness({
      campaign: campaignDetail,
      seededCounts: {
        eligibleWinners: 7,
        eventGroupCounts: { wallet_session: 99 },
        exportRows: 5,
        metricInputCounts: { participants: 42 },
        riskReviewQueue: 2,
        verifiedActions: 13,
      },
    });

    expect(readiness.eventCatalog.find((group) => group.id === "wallet_session")?.eventCount).toBe(99);
    expect(readiness.metricLineage.find((row) => row.id === "participants")?.inputCount).toBe(42);
    expect(readiness.summary).toMatchObject({
      eligibleWinners: 7,
      exportRows: 5,
      riskReviewQueue: 2,
      totalParticipants: 42,
      verifiedActions: 13,
    });
    expect(readiness.productionReady).toBe(false);
    expect(Object.values(readiness.noLiveSideEffects).every((value) => value === false)).toBe(true);
  });

  it("keeps all live side-effect flags false", () => {
    const readiness = createAnalyticsIngestionRuntimeReadiness({ campaign: campaignDetail });

    expect(readiness.noLiveSideEffects).toEqual(analyticsIngestionRuntimeNoLiveSideEffects);
    expect(Object.values(readiness.noLiveSideEffects).every((value) => value === false)).toBe(true);
  });

  it("redacts hostile diagnostic values from serialized output", () => {
    const readiness = createAnalyticsIngestionRuntimeReadiness({
      campaign: campaignDetail,
      diagnostics: [
        {
          code: "ANALYTICS_UNSAFE_DIAGNOSTIC_REDACTED",
          field: "warehouse.endpoint",
          message:
            "Bearer analytics-secret-token hit https://warehouse.invalid/collect?token=unsafe and tenant/raw/events.json",
          safeDetails: {
            endpoint: "https://warehouse.invalid/v1/ingest",
            objectKey: "tenant/raw/events.json",
            path: "/Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/evidence/private.csv",
            providerPayload: "raw provider payload {\"token\":\"unsafe\"}",
            signature: "wallet-signature",
            stack: "Error: boom\n    at warehouse.ingest",
          },
          severity: "warning",
          source: "warehouse",
        },
      ],
    });
    const serialized = JSON.stringify(readiness);

    expect(serialized).toContain("[REDACTED:CREDENTIAL]");
    expect(serialized).toContain("[REDACTED:ENDPOINT]");
    expect(serialized).toContain("[REDACTED:OBJECT_KEY]");
    expect(serialized).toContain("[REDACTED:PRIVATE_PATH]");
    expect(serialized).toContain("[REDACTED:PROVIDER_PAYLOAD]");
    expect(serialized).toContain("[REDACTED:WALLET_SIGNATURE]");
    expect(serialized).toContain("[REDACTED:STACK]");
    expect(serialized).not.toContain("analytics-secret-token");
    expect(serialized).not.toContain("warehouse.invalid");
    expect(serialized).not.toContain("campaign-os-kitty");
    expect(serialized).not.toContain("tenant/raw/events");
    expect(serialized).not.toContain("wallet-signature");
  });

  it("sanitizes nested values without mutating safe references", () => {
    expect(sanitizeAnalyticsIngestionRuntimeValue({
      approvalRef: "approval-ref:analytics-review",
      endpoint: "https://warehouse.invalid/v1/ingest",
      nested: ["Bearer leaked-token", "warehouse/raw/events.json"],
      schemaRef: "schema-ref:analytics-v1",
      signedUrl: "https://warehouse.invalid/events.json?signature=unsafe",
    })).toEqual({
      approvalRef: "approval-ref:analytics-review",
      endpoint: "[REDACTED:ENDPOINT]",
      nested: ["[REDACTED:CREDENTIAL]", "[REDACTED:OBJECT_KEY]"],
      schemaRef: "schema-ref:analytics-v1",
      signedUrl: "[REDACTED:ENDPOINT]",
    });
  });
});
