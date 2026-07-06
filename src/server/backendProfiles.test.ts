import { describe, expect, it } from "vitest";
import {
  backendRuntimeProfileById,
  backendRuntimeProfiles,
  deferredProductionBackendCapabilities,
  resolveBackendRuntimeProfile,
} from "./backendProfiles";

describe("backend runtime profiles", () => {
  it("defaults to the local review profile", () => {
    const resolution = resolveBackendRuntimeProfile();

    expect(resolution.valid).toBe(true);
    expect(resolution.profile).toMatchObject({
      externalNetworkAllowed: false,
      id: "local-review",
      requiresSecrets: false,
      status: "ready",
      supportMode: "local_seeded",
    });
    expect(resolution.profile.allowedCapabilities).toEqual([
      "local_api_runtime",
      "local_persistence_adapter",
      "sensitive_material_boundary",
    ]);
    expect(resolution.profile.deferredCapabilities).toEqual(deferredProductionBackendCapabilities);
  });

  it("keeps staging scaffold offline and production-shaped only", () => {
    expect(backendRuntimeProfileById["staging-scaffold"]).toMatchObject({
      externalNetworkAllowed: false,
      requiresSecrets: false,
      status: "scaffold",
    });
    expect(backendRuntimeProfileById["staging-scaffold"].deferredCapabilities).toEqual(
      expect.arrayContaining([
        "production_database",
        "migration_runner",
        "auth_session",
        "provider_adapters",
        "worker_queue",
        "scheduler",
        "contract_writer",
        "reward_distribution",
      ]),
    );
  });

  it("marks production-required as blocked until later backend missions provide config", () => {
    const production = backendRuntimeProfileById["production-required"];

    expect(production).toMatchObject({
      externalNetworkAllowed: true,
      id: "production-required",
      requiresSecrets: true,
      status: "blocked",
    });
    expect(production.requiredConfigKeys).toEqual(
      expect.arrayContaining([
        "CAMPAIGN_OS_DATABASE_URL",
        "CAMPAIGN_OS_AUTH_SECRET",
        "CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT",
      ]),
    );
  });

  it("fails closed for unknown profiles", () => {
    const resolution = resolveBackendRuntimeProfile("live-production");

    expect(resolution.valid).toBe(false);
    expect(resolution.profile.id).toBe("production-required");
    expect(resolution.diagnostics).toEqual([
      expect.objectContaining({
        code: "UNKNOWN_BACKEND_PROFILE",
        field: "profileId",
        severity: "error",
      }),
    ]);
  });

  it("keeps profile IDs unique", () => {
    const profileIds = backendRuntimeProfiles.map((profile) => profile.id);

    expect(new Set(profileIds).size).toBe(profileIds.length);
  });
});
