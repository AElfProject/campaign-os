import { describe, expect, it } from "vitest";
import { apiRuntimeRoutes, createBackendServiceReadinessReport } from "./index";

const deferredCapabilityIds = [
  "production_database",
  "auth_session",
  "provider_adapters",
  "worker_queue",
  "scheduler",
  "contract_writer",
  "reward_custody",
  "reward_distribution",
];

const privatePathFragments = [
  "docs/current",
  "kitty-specs",
  "evidence/",
  "sync/",
  ".kittify",
  ".agents",
  "AGENTS.md",
];

const secretLikeFragments = [
  "authorization: bearer",
  "campaign_os_database_url=",
  "mnemonic",
  "privatekey=",
  "rawsignature=",
  "seedphrase=",
  "signedurl=",
];

describe("backend scaffold public guardrails", () => {
  it("keeps production backend capabilities deferred or blocked in local review", () => {
    const report = createBackendServiceReadinessReport();

    expect(report.validation.valid).toBe(true);
    expect(report.profile.id).toBe("local-review");
    expect(report.profile.deferredCapabilities).toEqual(
      expect.arrayContaining(deferredCapabilityIds),
    );
    expect(report.persistenceAdapters.activeAdapter).toMatchObject({
      kind: "memory",
      localOnly: true,
      status: "active",
    });
    expect(report.migration).toMatchObject({
      noLiveMigrationCommand: true,
      noMigrationRunner: false,
      runnerStatus: "disabled_local_review",
    });
    expect(report.databaseReadiness).toMatchObject({
      adapter: expect.objectContaining({
        status: "contract_ready",
      }),
      migrationPlan: expect.objectContaining({
        dryRun: true,
        liveExecutionEnabled: false,
        status: "dry_run_ready",
      }),
      validation: expect.objectContaining({
        valid: true,
      }),
    });

    for (const attachPoint of report.attachMap) {
      expect(attachPoint.requiredBeforeProduction).toBe(true);
      expect(["blocked", "deferred", "scaffold"]).toContain(attachPoint.currentStatus);
      expect(attachPoint.currentStatus).not.toBe("local-only");
      expect(attachPoint.note.toLowerCase()).not.toContain("active now");
    }
  });

  it("keeps readiness metadata free of private paths and obvious secret material", () => {
    const serialized = JSON.stringify(createBackendServiceReadinessReport()).toLowerCase();

    for (const privatePath of privatePathFragments) {
      expect(serialized).not.toContain(privatePath.toLowerCase());
    }

    for (const fragment of secretLikeFragments) {
      expect(serialized).not.toContain(fragment);
    }
  });

  it("keeps public route metadata local, offline, and non-mutating for production systems", () => {
    expect(apiRuntimeRoutes.length).toBeGreaterThan(0);

    for (const route of apiRuntimeRoutes) {
      expect(route.path).toMatch(/^\/api\//);
      expect(route.supportMode).toBe("local_seeded");
      expect(route.boundary["en-US"]).toContain("No live API");
      expect(route.productionDependencies).toEqual(expect.any(Array));
      expect(route.productionDependencies).toEqual(
        expect.not.arrayContaining(["production_ready"]),
      );
    }

    expect(apiRuntimeRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "runtime.health",
          readiness: "ready",
          serviceGroup: "runtime",
        }),
        expect.objectContaining({
          id: "runtime.contracts",
          readiness: "ready",
          serviceGroup: "runtime",
        }),
      ]),
    );
  });
});
