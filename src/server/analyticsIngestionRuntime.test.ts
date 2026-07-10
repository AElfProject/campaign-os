import { describe, expect, it } from "vitest";
import { campaignDetail } from "../domain/fixtures";
import { createServerAnalyticsIngestionRuntimeReadiness } from "./analyticsIngestionRuntime";

describe("createServerAnalyticsIngestionRuntimeReadiness", () => {
  it("creates campaign-scoped analytics ingestion readiness without live side effects", () => {
    const readiness = createServerAnalyticsIngestionRuntimeReadiness({
      campaign: campaignDetail,
      traceId: "trace-analytics-runtime-test",
    });

    expect(readiness).toMatchObject({
      campaignId: "camp-awaken-sprint",
      source: "server_runtime",
      status: "blocked",
      traceId: "trace-analytics-runtime-test",
      productionReady: false,
      valid: true,
    });
    expect(readiness.summary.eventGroupCount).toBe(9);
    expect(readiness.summary.metricLineageCount).toBe(9);
    expect(readiness.summary.totalEvents).toBeGreaterThan(0);
    expect(readiness.eventCatalog.find((group) => group.id === "task_verification")?.eventCount)
      .toBe(campaignDetail.participants.length * campaignDetail.tasks.length);
    expect(Object.values(readiness.noLiveSideEffects).every((value) => value === false)).toBe(true);
  });

  it("redacts server diagnostics before returning readiness", () => {
    const readiness = createServerAnalyticsIngestionRuntimeReadiness({
      campaign: campaignDetail,
      diagnostics: [
        {
          code: "ANALYTICS_UNSAFE_DIAGNOSTIC_REDACTED",
          field: "server.analytics",
          message: "endpoint https://warehouse.invalid/collect bearer server-secret-token",
          safeDetails: {
            rawPayload: "provider response { token: 'unsafe' }",
            stackTrace: "Error: leak\n    at server.analytics",
          },
          severity: "warning",
          source: "server",
        },
      ],
    });
    const serialized = JSON.stringify(readiness);

    expect(readiness.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "ANALYTICS_UNSAFE_DIAGNOSTIC_REDACTED",
    );
    expect(serialized).toContain("[REDACTED:ENDPOINT]");
    expect(serialized).toContain("[REDACTED:CREDENTIAL]");
    expect(serialized).toContain("[REDACTED:PROVIDER_PAYLOAD]");
    expect(serialized).toContain("[REDACTED:STACK]");
    expect(serialized).not.toContain("warehouse.invalid");
    expect(serialized).not.toContain("server-secret-token");
  });
});
