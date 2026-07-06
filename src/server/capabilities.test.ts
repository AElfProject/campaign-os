import { describe, expect, it } from "vitest";
import {
  apiRuntimeCapabilities,
  apiRuntimeCapabilityById,
  apiRuntimeServiceGroupById,
  apiRuntimeServiceGroups,
  createApiRuntimeCapabilityCatalog,
} from "./index";
import type { ApiRuntimeCapabilityId, ApiRuntimeServiceGroupId } from "./contracts";

const expectedCapabilityIds = [
  "local_api_runtime",
  "local_persistence_adapter",
  "production_database",
  "migration_runner",
  "auth_session",
  "provider_adapters",
  "worker_queue",
  "scheduler",
  "contract_writer",
  "object_storage_export",
  "reward_custody",
  "reward_distribution",
  "sensitive_material_boundary",
] satisfies ApiRuntimeCapabilityId[];

const expectedServiceGroupIds = [
  "runtime",
  "service_registry",
  "wallet_session",
  "campaign",
  "task",
  "verification",
  "eligibility",
  "analytics",
  "i18n",
  "export",
] satisfies ApiRuntimeServiceGroupId[];

describe("API runtime capabilities", () => {
  it("declares local and deferred production capabilities", () => {
    expect(apiRuntimeCapabilities.map((capability) => capability.id)).toEqual(expectedCapabilityIds);
    expect(apiRuntimeCapabilityById.production_database).toMatchObject({
      requiredForProduction: true,
      status: "deferred",
    });
    expect(apiRuntimeCapabilityById.migration_runner).toMatchObject({
      requiredForProduction: true,
      status: "disabled",
    });
    expect(apiRuntimeCapabilityById.contract_writer).toMatchObject({
      requiredForProduction: true,
      status: "disabled",
    });
    expect(apiRuntimeCapabilityById.reward_distribution.status).toBe("disabled");
  });

  it("summarizes readiness without hiding deferred production dependencies", () => {
    const catalog = createApiRuntimeCapabilityCatalog();

    expect(catalog.items).toHaveLength(expectedCapabilityIds.length);
    expect(catalog.summary.totalCapabilities).toBe(expectedCapabilityIds.length);
    expect(catalog.summary.readyCount).toBeGreaterThanOrEqual(1);
    expect(catalog.summary.deferredCount).toBeGreaterThanOrEqual(1);
    expect(catalog.summary.disabledCount).toBeGreaterThanOrEqual(1);
    expect(catalog.summary.blockedCount).toBe(0);
  });

  it("declares service groups with production dependency references", () => {
    expect(apiRuntimeServiceGroups.map((group) => group.id)).toEqual(expectedServiceGroupIds);

    for (const group of apiRuntimeServiceGroups) {
      expect(group.label["en-US"]).not.toHaveLength(0);
      expect(group.summary["zh-CN"]).not.toHaveLength(0);
      expect(["ready", "local_only", "review_required", "blocked"]).toContain(group.readiness);

      for (const dependencyId of group.deferredDependencies) {
        expect(apiRuntimeCapabilityById[dependencyId]).toBeDefined();
      }
    }

    expect(apiRuntimeServiceGroupById.wallet_session.deferredDependencies).toEqual(
      expect.arrayContaining(["auth_session", "production_database"]),
    );
    expect(apiRuntimeServiceGroupById.export.deferredDependencies).toEqual(
      expect.arrayContaining(["object_storage_export", "contract_writer"]),
    );
  });
});
