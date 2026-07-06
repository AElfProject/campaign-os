import { describe, expect, it } from "vitest";
import {
  backendAttachMap,
  createBackendServiceReadinessReport,
} from "./backendService";

const productionAreas = [
  "production-persistence",
  "auth-session",
  "provider-adapters",
  "worker-queue",
  "scheduler",
  "contract-writer",
  "object-storage-export",
  "reward-custody",
  "reward-distribution",
  "analytics-warehouse",
];

describe("backend service readiness report", () => {
  it("aggregates local backend scaffold readiness without duplicating route ownership", () => {
    const report = createBackendServiceReadinessReport();

    expect(report.validation).toEqual({
      issues: [],
      valid: true,
    });
    expect(report.entrypoint).toMatchObject({
      foundationValidationValid: true,
      id: "campaign-os-backend-service",
      profileId: "local-review",
      runtimeName: "campaign-os-api-runtime",
      supportMode: "local_seeded",
      version: "0.2.0-local",
    });
    expect(report.entrypoint.routeCount).toBe(report.apiFoundation.coverage.routeCount);
    expect(report.apiFoundation.servicePorts.validation.valid).toBe(true);
    expect(report.apiFoundation.validation.valid).toBe(true);
    expect(report.topology.validation.valid).toBe(true);
  });

  it("publishes attach points for all deferred production backend areas", () => {
    expect(backendAttachMap.map((item) => item.area)).toEqual(productionAreas);

    const report = createBackendServiceReadinessReport();

    for (const attachPoint of report.attachMap) {
      expect(attachPoint.attachPoint).not.toHaveLength(0);
      expect(attachPoint.blockedBy.length).toBeGreaterThan(0);
      expect(attachPoint.currentStatus).not.toBe("local-only");
      expect(attachPoint.requiredBeforeProduction).toBe(true);
    }
  });

  it("keeps production persistence and migration runner inactive in local review", () => {
    const report = createBackendServiceReadinessReport();

    expect(report.persistenceAdapters.activeAdapter).toMatchObject({
      id: "campaign-os-memory-adapter",
      kind: "memory",
      status: "active",
    });
    expect(report.persistenceAdapters.adapters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "campaign-os-production-db-adapter",
          kind: "production_deferred",
          status: "deferred",
        }),
      ]),
    );
    expect(report.migration).toMatchObject({
      noLiveMigrationCommand: true,
      noMigrationRunner: true,
      runnerStatus: "disabled_local_review",
    });
  });

  it("surfaces fail-closed diagnostics for invalid backend config", () => {
    const report = createBackendServiceReadinessReport({
      configOptions: {
        env: {
          CAMPAIGN_OS_BACKEND_PROFILE: "production-live",
          CAMPAIGN_OS_ENABLE_CONTRACT_WRITER: "true",
          CAMPAIGN_OS_PERSISTENCE_MODE: "postgres",
        },
      },
    });

    expect(report.validation.valid).toBe(false);
    expect(report.validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "BACKEND_CONFIG_BLOCKED",
          field: "config",
          severity: "error",
        }),
      ]),
    );
    expect(report.config.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "UNKNOWN_BACKEND_PROFILE" }),
        expect.objectContaining({ code: "UNSUPPORTED_PERSISTENCE_MODE" }),
      ]),
    );
  });

  it("uses readable labels and does not expose private artifact paths", () => {
    const report = createBackendServiceReadinessReport();
    const serialized = JSON.stringify(report);

    expect(serialized).toContain("Campaign OS Backend Service");
    expect(serialized).not.toContain("kitty-specs");
    expect(serialized).not.toContain("docs/current");
    expect(serialized).not.toContain("evidence/");
    expect(serialized).not.toContain("sync/");
  });
});
