import { describe, expect, it } from "vitest";
import {
  resolveBackendConfigContract,
  resolveCampaignOsRuntimeConfig,
  sanitizeBackendConfigDiagnosticValue,
} from "./config";
import { queueProviderAdapterProductionPreconditions } from "./queueProviderAdapter";
import { schedulerRuntimeProductionPreconditions } from "./schedulerRuntime";

const collectStringValues = (value: unknown, values: string[] = []): string[] => {
  if (typeof value === "string") {
    values.push(value);
    return values;
  }

  if (!value || typeof value !== "object") {
    return values;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringValues(item, values);
    }

    return values;
  }

  for (const nestedValue of Object.values(value)) {
    collectStringValues(nestedValue, values);
  }

  return values;
};

describe("backend config contract", () => {
  it("resolves a zero-config local review contract", () => {
    const contract = resolveBackendConfigContract({ env: {} });

    expect(contract).toMatchObject({
      host: "127.0.0.1",
      persistenceMode: "memory",
      port: 5174,
      profileId: "local-review",
      requestedProfileId: "local-review",
      valid: true,
      version: "0.2.0-local",
    });
    expect(contract.profile).toMatchObject({
      externalNetworkAllowed: false,
      requiresSecrets: false,
      status: "ready",
    });
    expect(contract.productionReadiness).toMatchObject({
      missingConfigKeys: [],
      status: "ready",
    });
    expect(contract.productionReadiness.deferredCapabilities).toEqual(
      expect.arrayContaining([
        "production_database",
        "auth_session",
        "provider_adapters",
        "contract_writer",
      ]),
    );
    expect(contract.productionReadiness.requiredConfigKeys).toEqual(
      expect.arrayContaining([
        "CAMPAIGN_OS_QUEUE_PROVIDER",
        "CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT",
        "CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS",
        "CAMPAIGN_OS_SCHEDULER_PROVIDER",
        "CAMPAIGN_OS_SCHEDULER_ENDPOINT",
        "CAMPAIGN_OS_SCHEDULER_LEASE_STORE_URL",
        "CAMPAIGN_OS_OPERATOR_AUTHORIZATION_POLICY",
        "CAMPAIGN_OS_WORKER_QUEUE_URL",
        "CAMPAIGN_OS_WORKER_RETRY_POLICY",
        "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL",
        "CAMPAIGN_OS_WORKER_LEASE_STORE_URL",
        "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
        "CAMPAIGN_OS_PROVIDER_REGISTRY_URL",
        "CAMPAIGN_OS_DEGRADATION_POLICY",
        "CAMPAIGN_OS_DEAD_LETTER_QUEUE",
      ]),
    );
  });

  it("resolves staging scaffold without enabling live dependencies", () => {
    const contract = resolveBackendConfigContract({
      env: {
        CAMPAIGN_OS_API_HOST: "0.0.0.0",
        CAMPAIGN_OS_API_PORT: "4188",
        CAMPAIGN_OS_API_VERSION: "0.2.0-staging-scaffold",
        CAMPAIGN_OS_BACKEND_PROFILE: "staging-scaffold",
        CAMPAIGN_OS_PERSISTENCE_DIR: "/tmp/campaign-os",
        CAMPAIGN_OS_PERSISTENCE_MODE: "local_json",
      },
    });

    expect(contract).toMatchObject({
      host: "0.0.0.0",
      persistenceDirectory: "/tmp/campaign-os",
      persistenceMode: "local_json",
      port: 4188,
      profileId: "staging-scaffold",
      valid: true,
      version: "0.2.0-staging-scaffold",
    });
    expect(contract.productionReadiness.status).toBe("scaffold");
    expect(contract.profile.externalNetworkAllowed).toBe(false);
  });

  it("fails closed for unknown profile and unsupported persistence mode", () => {
    const contract = resolveBackendConfigContract({
      env: {
        CAMPAIGN_OS_BACKEND_PROFILE: "production-live",
        CAMPAIGN_OS_PERSISTENCE_MODE: "postgres",
      },
    });

    expect(contract.valid).toBe(false);
    expect(contract.profileId).toBe("production-required");
    expect(contract.requestedProfileId).toBe("production-live");
    expect(contract.persistenceMode).toBe("memory");
    expect(contract.productionReadiness.status).toBe("blocked");
    expect(contract.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNKNOWN_BACKEND_PROFILE",
          severity: "error",
        }),
        expect.objectContaining({
          code: "UNSUPPORTED_PERSISTENCE_MODE",
          field: "persistenceMode",
          severity: "error",
        }),
      ]),
    );
  });

  it("blocks production-required profile when required production config is missing", () => {
    const contract = resolveBackendConfigContract({
      env: {
        CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
        CAMPAIGN_OS_DATABASE_URL: "postgres://redacted.invalid/campaign-os",
      },
    });

    expect(contract.valid).toBe(false);
    expect(contract.profileId).toBe("production-required");
    expect(contract.profile.requiresSecrets).toBe(true);
    expect(contract.productionReadiness.status).toBe("blocked");
    expect(contract.productionReadiness.missingConfigKeys).toEqual(
      expect.arrayContaining([
        "CAMPAIGN_OS_AUTH_SECRET",
        "CAMPAIGN_OS_PROVIDER_REGISTRY_URL",
        "CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT",
        "CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS",
        "CAMPAIGN_OS_SCHEDULER_PROVIDER",
        "CAMPAIGN_OS_SCHEDULER_ENDPOINT",
        "CAMPAIGN_OS_SCHEDULER_LEASE_STORE_URL",
        "CAMPAIGN_OS_OPERATOR_AUTHORIZATION_POLICY",
        "CAMPAIGN_OS_WORKER_QUEUE_URL",
        "CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT",
      ]),
    );
    expect(contract.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_PRODUCTION_CONFIG",
          field: "CAMPAIGN_OS_AUTH_SECRET",
          severity: "error",
        }),
        expect.objectContaining({
          code: "MISSING_PRODUCTION_CONFIG",
          field: "CAMPAIGN_OS_SCHEDULER_PROVIDER",
          severity: "error",
        }),
        expect.objectContaining({
          code: "MISSING_PRODUCTION_CONFIG",
          field: "CAMPAIGN_OS_OPERATOR_AUTHORIZATION_POLICY",
          severity: "error",
        }),
      ]),
    );
  });

  it("reports scheduler runtime production precondition keys without exposing env values", () => {
    const schedulerRuntimeConfigKeys = [
      ...new Set(schedulerRuntimeProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys)),
    ];
    const secretSchedulerValues = {
      CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
      CAMPAIGN_OS_OPERATOR_AUTHORIZATION_POLICY: "operator-policy-secret",
      CAMPAIGN_OS_SCHEDULER_ENDPOINT: "https://scheduler.invalid/hook?scheduler-pass=secret",
      CAMPAIGN_OS_SCHEDULER_LEASE_STORE_URL: "https://lease.invalid/store?lease-token=secret",
      CAMPAIGN_OS_SCHEDULER_PROVIDER: "provider-secret",
    };
    const contract = resolveBackendConfigContract({ env: secretSchedulerValues });

    expect(contract.productionReadiness.requiredConfigKeys).toEqual(
      expect.arrayContaining(schedulerRuntimeConfigKeys),
    );
    expect(contract.productionReadiness.missingConfigKeys).toEqual(
      expect.arrayContaining([
        "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL",
        "CAMPAIGN_OS_WORKER_QUEUE_URL",
        "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
        "CAMPAIGN_OS_DEGRADATION_POLICY",
        "CAMPAIGN_OS_DEAD_LETTER_QUEUE",
      ]),
    );
    expect(contract.productionReadiness.missingConfigKeys).not.toEqual(
      expect.arrayContaining([
        "CAMPAIGN_OS_OPERATOR_AUTHORIZATION_POLICY",
        "CAMPAIGN_OS_SCHEDULER_ENDPOINT",
        "CAMPAIGN_OS_SCHEDULER_LEASE_STORE_URL",
        "CAMPAIGN_OS_SCHEDULER_PROVIDER",
      ]),
    );
    expect(sanitizeBackendConfigDiagnosticValue("CAMPAIGN_OS_SCHEDULER_PROVIDER", "provider-secret")).toBe(
      "[redacted]",
    );
    expect(
      sanitizeBackendConfigDiagnosticValue(
        "CAMPAIGN_OS_OPERATOR_AUTHORIZATION_POLICY",
        "operator-policy-secret",
      ),
    ).toBe("[redacted]");
    expect(collectStringValues(contract)).not.toContain("provider-secret");
    expect(collectStringValues(contract)).not.toContain("operator-policy-secret");
    expect(collectStringValues(contract)).not.toContain("scheduler-pass");
    expect(collectStringValues(contract)).not.toContain("lease-token");
  });

  it("reports queue provider adapter production precondition keys without exposing env values", () => {
    const queueProviderAdapterConfigKeys = [
      ...new Set(queueProviderAdapterProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys)),
    ];
    const secretQueueProviderValues = {
      CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
      CAMPAIGN_OS_QUEUE_PROVIDER: "production-queue-provider",
      CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS: "provider-credential-secret",
      CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT: "https://queue-provider.invalid/hook?queue-provider-token=secret",
    };
    const contract = resolveBackendConfigContract({ env: secretQueueProviderValues });

    expect(contract.productionReadiness.requiredConfigKeys).toEqual(
      expect.arrayContaining(queueProviderAdapterConfigKeys),
    );
    expect(contract.productionReadiness.missingConfigKeys).not.toEqual(
      expect.arrayContaining([
        "CAMPAIGN_OS_QUEUE_PROVIDER",
        "CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS",
        "CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT",
      ]),
    );
    expect(
      sanitizeBackendConfigDiagnosticValue(
        "CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS",
        "provider-credential-secret",
      ),
    ).toBe("[redacted]");
    expect(
      sanitizeBackendConfigDiagnosticValue(
        "CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT",
        "https://queue-provider.invalid/hook?queue-provider-token=secret",
      ),
    ).toBe("[redacted]");
    expect(collectStringValues(contract)).not.toContain("provider-credential-secret");
    expect(collectStringValues(contract)).not.toContain("queue-provider-token");
  });

  it("blocks accidental production capability enablement in local review", () => {
    const contract = resolveBackendConfigContract({
      env: {
        CAMPAIGN_OS_ENABLE_CONTRACT_WRITER: "true",
        CAMPAIGN_OS_ENABLE_PRODUCTION_DATABASE: "1",
        CAMPAIGN_OS_ENABLE_PROVIDER_ADAPTERS: "true",
      },
    });

    expect(contract.valid).toBe(false);
    expect(contract.productionReadiness.status).toBe("blocked");
    expect(contract.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PRODUCTION_CAPABILITY_ENABLEMENT_BLOCKED",
          field: "CAMPAIGN_OS_ENABLE_CONTRACT_WRITER",
          severity: "error",
        }),
        expect.objectContaining({
          code: "PRODUCTION_CAPABILITY_ENABLEMENT_BLOCKED",
          field: "CAMPAIGN_OS_ENABLE_PRODUCTION_DATABASE",
          severity: "error",
        }),
        expect.objectContaining({
          code: "PRODUCTION_CAPABILITY_ENABLEMENT_BLOCKED",
          field: "CAMPAIGN_OS_ENABLE_PROVIDER_ADAPTERS",
          severity: "error",
        }),
      ]),
    );
  });

  it("fails closed when production worker scheduler flags are enabled before runtime support exists", () => {
    const contract = resolveBackendConfigContract({
      env: {
        CAMPAIGN_OS_ENABLE_SCHEDULER: "true",
        CAMPAIGN_OS_ENABLE_WORKER_QUEUE: "1",
      },
    });

    expect(contract.valid).toBe(false);
    expect(contract.productionReadiness.status).toBe("blocked");
    expect(contract.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PRODUCTION_CAPABILITY_ENABLEMENT_BLOCKED",
          field: "CAMPAIGN_OS_ENABLE_SCHEDULER",
          severity: "error",
        }),
        expect.objectContaining({
          code: "PRODUCTION_CAPABILITY_ENABLEMENT_BLOCKED",
          field: "CAMPAIGN_OS_ENABLE_WORKER_QUEUE",
          severity: "error",
        }),
      ]),
    );
  });

  it("redacts secret-like diagnostic values", () => {
    expect(sanitizeBackendConfigDiagnosticValue("CAMPAIGN_OS_AUTH_SECRET", "super-secret")).toBe(
      "[redacted]",
    );
    expect(sanitizeBackendConfigDiagnosticValue("CAMPAIGN_OS_API_HOST", "127.0.0.1")).toBe(
      "127.0.0.1",
    );

    const contract = resolveBackendConfigContract({
      env: {
        CAMPAIGN_OS_AUTH_SECRET: "super-secret",
        CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
      },
    });

    expect(collectStringValues(contract)).not.toContain("super-secret");
  });

  it("redacts provider-related config diagnostic values", () => {
    expect(
      sanitizeBackendConfigDiagnosticValue(
        "CAMPAIGN_OS_PROVIDER_CREDENTIALS",
        "provider-api-key-secret",
      ),
    ).toBe("[redacted]");
    expect(
      sanitizeBackendConfigDiagnosticValue(
        "CAMPAIGN_OS_SOCIAL_API_TOKEN",
        "social-token-secret",
      ),
    ).toBe("[redacted]");
    expect(
      sanitizeBackendConfigDiagnosticValue(
        "CAMPAIGN_OS_PROVIDER_REGISTRY_URL",
        "https://user:password@providers.invalid?token=secret",
      ),
    ).toBe("[redacted]");

    const contract = resolveBackendConfigContract({
      env: {
        CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
        CAMPAIGN_OS_PROVIDER_REGISTRY_URL: "https://user:password@providers.invalid?token=secret",
      },
    });

    expect(collectStringValues(contract)).not.toContain(
      "https://user:password@providers.invalid?token=secret",
    );
  });

  it("redacts worker scheduler endpoint and store diagnostic values", () => {
    const queueUrl = "https://user:queue-secret@queue.invalid/jobs?token=worker-token";
    const schedulerEndpoint = "https://scheduler.invalid/run?scheduler-pass=secret";
    const idempotencyStoreUrl = "https://store.invalid/idempotency?token=idempotency-secret";
    const deadLetterQueueUrl = "https://queue.invalid/dead-letter?token=dead-letter-secret";

    expect(sanitizeBackendConfigDiagnosticValue("CAMPAIGN_OS_WORKER_QUEUE_URL", queueUrl)).toBe(
      "[redacted]",
    );
    expect(sanitizeBackendConfigDiagnosticValue("CAMPAIGN_OS_DEAD_LETTER_QUEUE", deadLetterQueueUrl)).toBe(
      "[redacted]",
    );
    expect(
      sanitizeBackendConfigDiagnosticValue("CAMPAIGN_OS_SCHEDULER_ENDPOINT", schedulerEndpoint),
    ).toBe("[redacted]");
    expect(
      sanitizeBackendConfigDiagnosticValue("CAMPAIGN_OS_IDEMPOTENCY_STORE_URL", idempotencyStoreUrl),
    ).toBe("[redacted]");

    const contract = resolveBackendConfigContract({
      env: {
        CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
        CAMPAIGN_OS_DEAD_LETTER_QUEUE: deadLetterQueueUrl,
        CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: idempotencyStoreUrl,
        CAMPAIGN_OS_SCHEDULER_ENDPOINT: schedulerEndpoint,
        CAMPAIGN_OS_WORKER_QUEUE_URL: queueUrl,
      },
    });

    expect(collectStringValues(contract)).not.toContain(queueUrl);
    expect(collectStringValues(contract)).not.toContain(deadLetterQueueUrl);
    expect(collectStringValues(contract)).not.toContain(schedulerEndpoint);
    expect(collectStringValues(contract)).not.toContain(idempotencyStoreUrl);
  });

  it("redacts connection-like production persistence driver values", () => {
    const contract = resolveBackendConfigContract({
      env: {
        CAMPAIGN_OS_PERSISTENCE_DRIVER: "postgres://user:secret@db.internal/campaign",
      },
    });

    expect(contract.productionPersistence.requestedDriverId).toBe("[redacted]");
    expect(collectStringValues(contract)).not.toContain("postgres://user:secret@db.internal/campaign");
  });

  it("preserves the existing runtime config defaults and local JSON behavior", () => {
    expect(resolveCampaignOsRuntimeConfig({ env: {} })).toEqual({
      persistence: {
        adapterLabel: "memory",
        localDataDir: undefined,
        mode: "memory",
      },
      version: "0.2.0-local",
    });

    expect(
      resolveCampaignOsRuntimeConfig({
        env: {
          CAMPAIGN_OS_API_VERSION: "0.2.1-test",
          CAMPAIGN_OS_PERSISTENCE_DIR: "/tmp/campaign-os-review-state",
          CAMPAIGN_OS_PERSISTENCE_MODE: "local_json",
        },
      }),
    ).toEqual({
      persistence: {
        adapterLabel: "local_json:campaign-os-review-state",
        localDataDir: "/tmp/campaign-os-review-state",
        mode: "local_json",
      },
      version: "0.2.1-test",
    });
  });
});
