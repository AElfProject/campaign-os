import { describe, expect, it } from "vitest";
import {
  CAMPAIGN_OS_CAMPAIGN_ID_MAX_LENGTH,
  CAMPAIGN_OS_ADMIN_OPERATOR_MAX_CAMPAIGN_IDS_PER_MEMBERSHIP,
  CAMPAIGN_OS_ADMIN_OPERATOR_MAX_MEMBERSHIPS,
  CAMPAIGN_OS_ADMIN_OPERATOR_MAX_ROLES_PER_MEMBERSHIP,
  CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON_ENV,
  CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON_MAX_BYTES,
  CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_NORMALIZED_MAX_BYTES,
  CAMPAIGN_OS_ADMIN_OPERATOR_ROLE_MAX_LENGTH,
  CAMPAIGN_OS_ADMIN_OPERATOR_SUBJECT_MAX_LENGTH,
  CAMPAIGN_OS_ADMIN_REVIEW_ENABLED_ENV,
  CampaignOsAdminReviewConfigError,
  CampaignOsCampaignDbConfigError,
  CampaignOsParticipantPreviewConfigError,
  createCampaignOsParticipantPreviewMetadata,
  isCanonicalCampaignId,
  resolveCampaignOsAdminReviewConfig,
  resolveBackendConfigContract,
  resolveCampaignOsCampaignDbConfig,
  resolveCampaignOsParticipantPreviewConfig,
  resolveCampaignOsRuntimeConfig,
  sanitizeBackendConfigDiagnosticValue,
} from "./config";
import { queueProviderAdapterProductionPreconditions } from "./queueProviderAdapter";
import { queueProviderDriverProductionPreconditions } from "./queueProviderDriver";
import { queueProviderSdkBindingProductionPreconditions } from "./queueProviderSdkBinding";
import { queueProviderPackageProductionPreconditions } from "./queueProviderPackageBinding";
import { redisBrokerConnectionProductionPreconditions } from "./redisBrokerConnectionReadiness";
import { observabilityExporterProductionPreconditions } from "./observabilityExporter";
import { schedulerRuntimeProductionPreconditions } from "./schedulerRuntime";
import { workerLeaseStoreProductionPreconditions } from "./workerLeaseStore";

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
        "CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER",
        "CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT",
        "CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS",
        "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_BINDING",
        "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE",
        "CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE",
        "CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING",
        "CAMPAIGN_OS_QUEUE_PROVIDER_KIND",
        "CAMPAIGN_OS_REDIS_BROKER_HEALTH_CHECK_ENABLEMENT",
        "CAMPAIGN_OS_REDIS_CIRCUIT_BREAKER_POLICY",
        "CAMPAIGN_OS_REDIS_CONNECTION_TIMEOUT_MS",
        "CAMPAIGN_OS_REDIS_CREDENTIALS",
        "CAMPAIGN_OS_REDIS_DATABASE",
        "CAMPAIGN_OS_REDIS_RETRY_BACKOFF_POLICY",
        "CAMPAIGN_OS_REDIS_TLS_POLICY",
        "CAMPAIGN_OS_REDIS_URL",
        "CAMPAIGN_OS_SCHEDULER_PROVIDER",
        "CAMPAIGN_OS_SCHEDULER_ENDPOINT",
        "CAMPAIGN_OS_SCHEDULER_LEASE_STORE_URL",
        "CAMPAIGN_OS_OPERATOR_AUTHORIZATION_POLICY",
        "CAMPAIGN_OS_WORKER_QUEUE_URL",
        "CAMPAIGN_OS_WORKER_RETRY_POLICY",
        "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL",
        "CAMPAIGN_OS_WORKER_LEASE_STORE",
        "CAMPAIGN_OS_WORKER_LEASE_STORE_URL",
        "CAMPAIGN_OS_WORKER_LEASE_CREDENTIALS",
        "CAMPAIGN_OS_CLOCK_SOURCE",
        "CAMPAIGN_OS_WORKER_LEASE_HEARTBEAT_SECONDS",
        "CAMPAIGN_OS_WORKER_LEASE_TTL_SECONDS",
        "CAMPAIGN_OS_WORKER_LEASE_RELEASE_POLICY",
        "CAMPAIGN_OS_WORKER_LEASE_STALE_RECOVERY_POLICY",
        "CAMPAIGN_OS_WORKER_LEASE_FENCING_POLICY",
        "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
        "CAMPAIGN_OS_OBSERVABILITY_EXPORTER",
        "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_CREDENTIALS",
        "CAMPAIGN_OS_OBSERVABILITY_SINK",
        "CAMPAIGN_OS_OBSERVABILITY_METRIC_NAMESPACE",
        "CAMPAIGN_OS_OBSERVABILITY_RETENTION_DAYS",
        "CAMPAIGN_OS_OBSERVABILITY_TRACE_COLLECTOR_URL",
        "CAMPAIGN_OS_OBSERVABILITY_LOG_SINK_URL",
        "CAMPAIGN_OS_OBSERVABILITY_ALERT_ROUTING",
        "CAMPAIGN_OS_OBSERVABILITY_RETRY_DEAD_LETTER_POLICY",
        "CAMPAIGN_OS_OBSERVABILITY_REDACTION_POLICY",
        "CAMPAIGN_OS_OBSERVABILITY_RUNBOOK_URL",
        "CAMPAIGN_OS_PROVIDER_REGISTRY_URL",
        "CAMPAIGN_OS_OPERATOR_RUNBOOK_URL",
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

  it("blocks local durable persistence when the review state directory is missing", () => {
    const contract = resolveBackendConfigContract({
      env: {
        CAMPAIGN_OS_PERSISTENCE_MODE: "local_json",
      },
    });

    expect(contract).toMatchObject({
      persistenceDirectory: undefined,
      persistenceMode: "local_json",
      valid: false,
    });
    expect(contract.productionReadiness.status).toBe("blocked");
    expect(contract.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_LOCAL_PERSISTENCE_DIR",
          field: "CAMPAIGN_OS_PERSISTENCE_DIR",
          severity: "error",
        }),
      ]),
    );
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
        "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_BINDING",
        "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE",
        "CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT",
        "CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS",
        "CAMPAIGN_OS_SCHEDULER_PROVIDER",
        "CAMPAIGN_OS_SCHEDULER_ENDPOINT",
        "CAMPAIGN_OS_SCHEDULER_LEASE_STORE_URL",
        "CAMPAIGN_OS_OPERATOR_AUTHORIZATION_POLICY",
        "CAMPAIGN_OS_WORKER_QUEUE_URL",
        "CAMPAIGN_OS_WORKER_LEASE_STORE",
        "CAMPAIGN_OS_WORKER_LEASE_CREDENTIALS",
        "CAMPAIGN_OS_CLOCK_SOURCE",
        "CAMPAIGN_OS_WORKER_LEASE_HEARTBEAT_SECONDS",
        "CAMPAIGN_OS_WORKER_LEASE_TTL_SECONDS",
        "CAMPAIGN_OS_WORKER_LEASE_RELEASE_POLICY",
        "CAMPAIGN_OS_WORKER_LEASE_STALE_RECOVERY_POLICY",
        "CAMPAIGN_OS_WORKER_LEASE_FENCING_POLICY",
        "CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT",
        "CAMPAIGN_OS_OBSERVABILITY_EXPORTER",
        "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_CREDENTIALS",
        "CAMPAIGN_OS_OBSERVABILITY_SINK",
        "CAMPAIGN_OS_OBSERVABILITY_METRIC_NAMESPACE",
        "CAMPAIGN_OS_OBSERVABILITY_TRACE_COLLECTOR_URL",
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
    const queueProviderDriverConfigKeys = [
      ...new Set(queueProviderDriverProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys)),
    ];
    const queueProviderSdkBindingConfigKeys = [
      ...new Set(
        queueProviderSdkBindingProductionPreconditions
          .flatMap((precondition) => precondition.requiredConfigKeys)
          .map((key) =>
            key === "CAMPAIGN_OS_QUEUE_PROVIDER_BINDING" ? "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_BINDING" : key
          ),
      ),
    ];
    const queueProviderPackageConfigKeys = [
      ...new Set(queueProviderPackageProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys)),
    ];
    const redisBrokerConnectionConfigKeys = [
      ...new Set(redisBrokerConnectionProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys)),
    ];
    const secretQueueProviderValues = {
      CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
      CAMPAIGN_OS_DEAD_LETTER_QUEUE: "dead-letter-ref:queue-package",
      CAMPAIGN_OS_DEGRADATION_POLICY: "degradation:manual-review",
      CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "idempotency-store-ref:queue-package",
      CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT: "explicitly-enabled",
      CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "observability-ref:queue-package",
      CAMPAIGN_OS_OPERATOR_RUNBOOK_URL: "https://runbooks.invalid/package?token=package-runbook-secret",
      CAMPAIGN_OS_QUEUE_PROVIDER: "production-queue-provider",
      CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS: "provider-credential-secret",
      CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER: "production-provider-driver",
      CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT: "https://queue-provider.invalid/hook?queue-provider-token=secret",
      CAMPAIGN_OS_QUEUE_PROVIDER_KIND: "redis-compatible",
      CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE: "bullmq",
      CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING: "bullmq-redis-package-binding-production",
      CAMPAIGN_OS_QUEUE_PROVIDER_SDK_BINDING: "production-provider-sdk-binding",
      CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE: "package-ref:@provider/queue-sdk",
      CAMPAIGN_OS_REDIS_BROKER_HEALTH_CHECK_ENABLEMENT: "explicitly-enabled",
      CAMPAIGN_OS_REDIS_CIRCUIT_BREAKER_POLICY: "circuit:closed",
      CAMPAIGN_OS_REDIS_CONNECTION_TIMEOUT_MS: "500",
      CAMPAIGN_OS_REDIS_CREDENTIALS: "redis-credential-ref:queue-package",
      CAMPAIGN_OS_REDIS_DATABASE: "redis-db:0",
      CAMPAIGN_OS_REDIS_RETRY_BACKOFF_POLICY: "retry:exponential",
      CAMPAIGN_OS_REDIS_TLS_POLICY: "tls:required",
      CAMPAIGN_OS_REDIS_URL: "redis://redis-user:redis-pass@redis.invalid:6379/0?token=redis-secret",
      CAMPAIGN_OS_WORKER_LEASE_STORE_URL: "lease-store-ref:queue-package",
      CAMPAIGN_OS_WORKER_QUEUE_URL: "queue-ref:queue-package",
      CAMPAIGN_OS_WORKER_RETRY_POLICY: "retry:exponential",
    };
    const contract = resolveBackendConfigContract({ env: secretQueueProviderValues });

    expect(contract.productionReadiness.requiredConfigKeys).toEqual(
      expect.arrayContaining(queueProviderAdapterConfigKeys),
    );
    expect(contract.productionReadiness.requiredConfigKeys).toEqual(
      expect.arrayContaining(queueProviderDriverConfigKeys),
    );
    expect(contract.productionReadiness.requiredConfigKeys).toEqual(
      expect.arrayContaining(queueProviderSdkBindingConfigKeys),
    );
    expect(contract.productionReadiness.requiredConfigKeys).toEqual(
      expect.arrayContaining(queueProviderPackageConfigKeys),
    );
    expect(contract.productionReadiness.requiredConfigKeys).toEqual(
      expect.arrayContaining(redisBrokerConnectionConfigKeys),
    );
    expect(contract.productionReadiness.missingConfigKeys).not.toEqual(
      expect.arrayContaining([
        "CAMPAIGN_OS_QUEUE_PROVIDER",
        "CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS",
        "CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER",
        "CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT",
        "CAMPAIGN_OS_QUEUE_PROVIDER_KIND",
        "CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE",
        "CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING",
        "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_BINDING",
        "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE",
        "CAMPAIGN_OS_REDIS_BROKER_HEALTH_CHECK_ENABLEMENT",
        "CAMPAIGN_OS_REDIS_CIRCUIT_BREAKER_POLICY",
        "CAMPAIGN_OS_REDIS_CONNECTION_TIMEOUT_MS",
        "CAMPAIGN_OS_REDIS_CREDENTIALS",
        "CAMPAIGN_OS_REDIS_DATABASE",
        "CAMPAIGN_OS_REDIS_RETRY_BACKOFF_POLICY",
        "CAMPAIGN_OS_REDIS_TLS_POLICY",
        "CAMPAIGN_OS_REDIS_URL",
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
    expect(collectStringValues(contract)).not.toContain("@provider/queue-sdk");
    expect(collectStringValues(contract)).not.toContain("redis-pass");
    expect(collectStringValues(contract)).not.toContain("redis-secret");
    expect(collectStringValues(contract)).not.toContain("package-runbook-secret");
  });

  it("reports worker lease store production precondition keys without exposing env values", () => {
    const workerLeaseStoreConfigKeys = [
      ...new Set(workerLeaseStoreProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys)),
    ];
    const secretWorkerLeaseValues = {
      CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
      CAMPAIGN_OS_CLOCK_SOURCE: "clock-secret-source",
      CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "https://store.invalid/idempotency?token=lease-idempotency-secret",
      CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "https://observability.invalid/hook?token=lease-observability-secret",
      CAMPAIGN_OS_WORKER_LEASE_CREDENTIALS: "worker-lease-credential-secret",
      CAMPAIGN_OS_WORKER_LEASE_FENCING_POLICY: "fencing-token-secret",
      CAMPAIGN_OS_WORKER_LEASE_HEARTBEAT_SECONDS: "30",
      CAMPAIGN_OS_WORKER_LEASE_RELEASE_POLICY: "release-secret-policy",
      CAMPAIGN_OS_WORKER_LEASE_STALE_RECOVERY_POLICY: "stale-recovery-secret",
      CAMPAIGN_OS_WORKER_LEASE_STORE: "production-lease-store",
      CAMPAIGN_OS_WORKER_LEASE_STORE_URL: "https://lease.invalid/store?token=worker-lease-secret",
      CAMPAIGN_OS_WORKER_LEASE_TTL_SECONDS: "120",
    };
    const contract = resolveBackendConfigContract({ env: secretWorkerLeaseValues });

    expect(contract.productionReadiness.requiredConfigKeys).toEqual(
      expect.arrayContaining(workerLeaseStoreConfigKeys),
    );
    expect(contract.productionReadiness.missingConfigKeys).not.toEqual(
      expect.arrayContaining(workerLeaseStoreConfigKeys),
    );
    expect(
      sanitizeBackendConfigDiagnosticValue(
        "CAMPAIGN_OS_WORKER_LEASE_CREDENTIALS",
        "worker-lease-credential-secret",
      ),
    ).toBe("[redacted]");
    expect(
      sanitizeBackendConfigDiagnosticValue(
        "CAMPAIGN_OS_WORKER_LEASE_STORE_URL",
        "https://lease.invalid/store?token=worker-lease-secret",
      ),
    ).toBe("[redacted]");
    expect(collectStringValues(contract)).not.toContain("worker-lease-credential-secret");
    expect(collectStringValues(contract)).not.toContain("worker-lease-secret");
    expect(collectStringValues(contract)).not.toContain("lease-idempotency-secret");
    expect(collectStringValues(contract)).not.toContain("lease-observability-secret");
  });

  it("reports observability exporter production precondition keys without exposing env values", () => {
    const observabilityExporterConfigKeys = [
      ...new Set(observabilityExporterProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys)),
    ];
    const observabilityEndpoint = "https://observability.invalid/export?token=observability-secret";
    const traceCollector = "https://trace.invalid/collect?token=trace-secret";
    const logSink = "https://logs.invalid/write?token=log-secret";
    const secretObservabilityValues = {
      CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
      CAMPAIGN_OS_OBSERVABILITY_ALERT_ROUTING: "alert-routing-secret",
      CAMPAIGN_OS_OBSERVABILITY_EXPORTER: "production-observability-exporter",
      CAMPAIGN_OS_OBSERVABILITY_EXPORTER_CREDENTIALS: "observability-credential-secret",
      CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: observabilityEndpoint,
      CAMPAIGN_OS_OBSERVABILITY_LOG_SINK_URL: logSink,
      CAMPAIGN_OS_OBSERVABILITY_METRIC_NAMESPACE: "campaign-os-runtime",
      CAMPAIGN_OS_OBSERVABILITY_REDACTION_POLICY: "strict-redaction",
      CAMPAIGN_OS_OBSERVABILITY_RETENTION_DAYS: "30",
      CAMPAIGN_OS_OBSERVABILITY_RETRY_DEAD_LETTER_POLICY: "retry-dead-letter-secret",
      CAMPAIGN_OS_OBSERVABILITY_RUNBOOK_URL: "https://runbooks.invalid/observability?token=runbook-secret",
      CAMPAIGN_OS_OBSERVABILITY_SINK: "production-metrics-sink",
      CAMPAIGN_OS_OBSERVABILITY_TRACE_COLLECTOR_URL: traceCollector,
    };
    const contract = resolveBackendConfigContract({ env: secretObservabilityValues });

    expect(contract.productionReadiness.requiredConfigKeys).toEqual(
      expect.arrayContaining(observabilityExporterConfigKeys),
    );
    expect(contract.productionReadiness.missingConfigKeys).not.toEqual(
      expect.arrayContaining(observabilityExporterConfigKeys),
    );
    expect(sanitizeBackendConfigDiagnosticValue("CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL", observabilityEndpoint)).toBe(
      "[redacted]",
    );
    expect(
      sanitizeBackendConfigDiagnosticValue(
        "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_CREDENTIALS",
        "observability-credential-secret",
      ),
    ).toBe("[redacted]");
    expect(collectStringValues(contract)).not.toContain(observabilityEndpoint);
    expect(collectStringValues(contract)).not.toContain(traceCollector);
    expect(collectStringValues(contract)).not.toContain(logSink);
    expect(collectStringValues(contract)).not.toContain("observability-credential-secret");
    expect(collectStringValues(contract)).not.toContain("alert-routing-secret");
    expect(collectStringValues(contract)).not.toContain("retry-dead-letter-secret");
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

    expect(() =>
      resolveCampaignOsRuntimeConfig({
        env: {
          CAMPAIGN_OS_PERSISTENCE_MODE: "local_json",
        },
      }),
    ).toThrow("local_json persistence requires CAMPAIGN_OS_PERSISTENCE_DIR");
  });
});

describe("Campaign DB runtime config", () => {
  it("keeps the default Campaign DB local without a connection secret", () => {
    const config = resolveCampaignOsCampaignDbConfig({ env: {} });

    expect(config).toEqual({
      adapterLabel: "campaign-db-deterministic-adapter",
      mode: "local",
    });
    expect(collectStringValues(config)).not.toEqual(
      expect.arrayContaining([expect.stringContaining("postgres://")]),
    );
  });

  it("resolves an explicit loopback PostgreSQL pool with bounded defaults", () => {
    const config = resolveCampaignOsCampaignDbConfig({
      env: {
        CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
        CAMPAIGN_OS_DATABASE_URL: "postgres://local-user:local-password@127.0.0.1:5432/campaign_os_test",
        CAMPAIGN_OS_DATABASE_SSL_MODE: "disable",
      },
    });

    expect(config).toMatchObject({
      adapterLabel: "campaign-db-postgresql-adapter",
      mode: "postgres",
      pool: {
        connectionTimeoutMillis: 5_000,
        idleTimeoutMillis: 10_000,
        max: 10,
        ssl: false,
      },
    });
  });

  it("defaults non-loopback PostgreSQL connections to certificate verification", () => {
    const config = resolveCampaignOsCampaignDbConfig({
      env: {
        CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
        CAMPAIGN_OS_DATABASE_URL: "postgres://runtime-user:runtime-password@db.internal/campaign_os",
      },
    });

    expect(config.mode).toBe("postgres");
    if (config.mode !== "postgres") {
      throw new Error("Expected PostgreSQL Campaign DB config.");
    }
    expect(config.pool.ssl).toEqual({ rejectUnauthorized: true });
  });

  it.each([
    [
      "missing URL",
      { CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres" },
      "CAMPAIGN_DB_DATABASE_URL_REQUIRED",
      "CAMPAIGN_OS_DATABASE_URL",
    ],
    [
      "remote TLS disable",
      {
        CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
        CAMPAIGN_OS_DATABASE_SSL_MODE: "disable",
        CAMPAIGN_OS_DATABASE_URL: "postgres://runtime-user:runtime-password@db.internal/campaign_os",
      },
      "CAMPAIGN_DB_SSL_MODE_INVALID",
      "CAMPAIGN_OS_DATABASE_SSL_MODE",
    ],
    [
      "invalid IPv4 loopback lookalike",
      {
        CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
        CAMPAIGN_OS_DATABASE_SSL_MODE: "disable",
        CAMPAIGN_OS_DATABASE_URL: "postgres://runtime-user:runtime-password@127.999.1.1/campaign_os",
      },
      "CAMPAIGN_DB_SSL_MODE_INVALID",
      "CAMPAIGN_OS_DATABASE_SSL_MODE",
    ],
    [
      "invalid SSL mode",
      {
        CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
        CAMPAIGN_OS_DATABASE_SSL_MODE: "unsafe",
        CAMPAIGN_OS_DATABASE_URL: "postgres://runtime-user:runtime-password@127.0.0.1/campaign_os",
      },
      "CAMPAIGN_DB_SSL_MODE_INVALID",
      "CAMPAIGN_OS_DATABASE_SSL_MODE",
    ],
    [
      "oversized pool",
      {
        CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
        CAMPAIGN_OS_DATABASE_POOL_MAX: "21",
        CAMPAIGN_OS_DATABASE_URL: "postgres://runtime-user:runtime-password@127.0.0.1/campaign_os",
      },
      "CAMPAIGN_DB_POOL_SETTING_INVALID",
      "CAMPAIGN_OS_DATABASE_POOL_MAX",
    ],
  ])("fails closed for %s without echoing config values", (_case, env, code, field) => {
    let thrown: unknown;

    try {
      resolveCampaignOsCampaignDbConfig({ env });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(CampaignOsCampaignDbConfigError);
    expect(thrown).toMatchObject({ code, field });
    expect(JSON.stringify(thrown)).not.toContain("runtime-password");
    expect(JSON.stringify(thrown)).not.toContain("db.internal");
  });
});

describe("Participant Campaign preview config", () => {
  const envKey = "CAMPAIGN_OS_PARTICIPANT_PREVIEW_CAMPAIGN_IDS";

  it.each([
    ["missing", {}],
    ["undefined", { [envKey]: undefined }],
    ["blank", { [envKey]: "  \t  " }],
  ])("keeps preview disabled when the env value is %s", (_case, env) => {
    const config = resolveCampaignOsParticipantPreviewConfig({ env });

    expect(config.campaignIds).toEqual([]);
    expect(createCampaignOsParticipantPreviewMetadata(config)).toEqual({
      campaignCount: 0,
      enabled: false,
    });
  });

  it("trims, exact-deduplicates, and preserves first-seen order", () => {
    const config = resolveCampaignOsParticipantPreviewConfig({
      env: {
        [envKey]: " campaign-preview-A, campaign-preview-b, campaign-preview-A, campaign-preview-a ",
      },
    });

    expect(config.campaignIds).toEqual([
      "campaign-preview-A",
      "campaign-preview-b",
      "campaign-preview-a",
    ]);
  });

  it("accepts a standalone wildcard without broadening canonical API Campaign IDs", () => {
    const config = resolveCampaignOsParticipantPreviewConfig({
      env: { [envKey]: "  *  " },
    });

    expect(config.campaignIds).toEqual(["*"]);
    expect(isCanonicalCampaignId("*")).toBe(false);
  });

  it.each([
    ["wildcard first", "*,campaign-preview-a"],
    ["wildcard last", "campaign-preview-a,*"],
    ["array option", ["campaign-preview-a", "*"]],
  ])("fails closed with a typed error when %s mixes wildcard and explicit IDs", (_case, campaignIds) => {
    let thrown: unknown;

    try {
      resolveCampaignOsParticipantPreviewConfig({ campaignIds });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(CampaignOsParticipantPreviewConfigError);
    expect(thrown).toMatchObject({
      code: "CAMPAIGN_PREVIEW_CONFIG_ID_INVALID",
      field: envKey,
    });
  });

  it.each([
    ["empty segment", "campaign-preview-a,,campaign-preview-b"],
    ["embedded whitespace", "campaign preview"],
    ["oversized ID", "x".repeat(129)],
    ["control character", "campaign-preview-\u0000hidden"],
    ["unsafe semicolon", "campaign-preview-a;campaign-preview-b"],
    ["unsafe path delimiter", "campaign-preview-a/campaign-preview-b"],
  ])("rejects %s without echoing the raw value", (_case, rawValue) => {
    let thrown: unknown;

    try {
      resolveCampaignOsParticipantPreviewConfig({ env: { [envKey]: rawValue } });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(CampaignOsParticipantPreviewConfigError);
    expect(thrown).toMatchObject({
      code: "CAMPAIGN_PREVIEW_CONFIG_ID_INVALID",
      field: envKey,
    });
    expect(String(thrown)).not.toContain(rawValue);
    expect(JSON.stringify(thrown)).not.toContain(rawValue);
  });

  it("accepts 100 unique IDs, rejects 101, and does not count duplicates", () => {
    const oneHundredIds = Array.from(
      { length: 100 },
      (_, index) => `campaign-preview-${String(index).padStart(3, "0")}`,
    );
    const withDuplicates = oneHundredIds.flatMap((campaignId) => [campaignId, campaignId]);

    expect(resolveCampaignOsParticipantPreviewConfig({
      env: { [envKey]: withDuplicates.join(",") },
    }).campaignIds).toEqual(oneHundredIds);

    expect(() => resolveCampaignOsParticipantPreviewConfig({
      env: { [envKey]: [...oneHundredIds, "campaign-preview-100"].join(",") },
    })).toThrowError(expect.objectContaining({
      code: "CAMPAIGN_PREVIEW_CONFIG_LIMIT_EXCEEDED",
      field: envKey,
    }));
  });

  it("uses the explicit option instead of merging it with env authority", () => {
    const config = resolveCampaignOsParticipantPreviewConfig({
      campaignIds: "campaign-explicit-A,campaign-explicit-B",
      env: { [envKey]: "campaign-env-only" },
    });

    expect(config.campaignIds).toEqual(["campaign-explicit-A", "campaign-explicit-B"]);
  });

  it("returns immutable independent values and exposes count-only runtime metadata", () => {
    const first = resolveCampaignOsParticipantPreviewConfig({
      env: { [envKey]: "campaign-private-A,campaign-private-B" },
    });
    const metadata = createCampaignOsParticipantPreviewMetadata(first);

    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.campaignIds)).toBe(true);
    expect(() => (first.campaignIds as string[]).push("campaign-injected")).toThrow(TypeError);
    expect(metadata).toEqual({ campaignCount: 2, enabled: true });
    expect(Object.keys(metadata).sort()).toEqual(["campaignCount", "enabled"]);
    expect(JSON.stringify(metadata)).not.toContain("campaign-private");

    const second = resolveCampaignOsParticipantPreviewConfig({
      env: { [envKey]: "campaign-private-A,campaign-private-B" },
    });

    expect(second).not.toBe(first);
    expect(second.campaignIds).not.toBe(first.campaignIds);
    expect(second.campaignIds).toEqual(["campaign-private-A", "campaign-private-B"]);
  });
});

describe("Admin review operator config", () => {
  const enabledKey = CAMPAIGN_OS_ADMIN_REVIEW_ENABLED_ENV;
  const membershipsKey = CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON_ENV;
  const subjectAddress = "2YVwAdminOperatorCaseSensitive";

  const membership = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    active: true,
    campaignIds: ["campaign-admin-a"],
    roleIds: ["review_operator"],
    subjectAddress,
    ...overrides,
  });

  const resolve = (
    enabled: string | undefined,
    memberships: unknown = undefined,
  ) => resolveCampaignOsAdminReviewConfig({
    env: {
      ...(enabled === undefined ? {} : { [enabledKey]: enabled }),
      ...(memberships === undefined
        ? {}
        : {
            [membershipsKey]: typeof memberships === "string"
              ? memberships
              : JSON.stringify(memberships),
          }),
    },
  });

  it.each([
    ["missing", undefined],
    ["blank", " \t "],
    ["zero", "0"],
    ["false", "false"],
    ["trimmed false", " false "],
  ])("keeps Admin review default-off for %s", (_case, enabled) => {
    const config = resolve(enabled);

    expect(config).toMatchObject({
      enabled: false,
      memberships: [],
    });
    expect(config.sourceRevision).toMatch(/^admin-membership-sha256:[a-f0-9]{64}$/);
  });

  it.each(["1", "true", " 1 ", " true "]) (
    "enables Admin review only for explicit value %j",
    (enabled) => {
      expect(resolve(enabled)).toMatchObject({ enabled: true, memberships: [] });
    },
  );

  it.each(["yes", "on", "TRUE", "True", "01", "enabled", "false-ish"]) (
    "rejects unknown Admin review flag %j",
    (enabled) => {
      expect(() => resolve(enabled)).toThrowError(expect.objectContaining({
        code: "ADMIN_REVIEW_FLAG_INVALID",
        field: enabledKey,
      }));
    },
  );

  it("ignores membership authority while disabled and remains default-empty", () => {
    const rawMemberships = JSON.stringify([membership()]);
    const config = resolve("false", rawMemberships);

    expect(config.enabled).toBe(false);
    expect(config.memberships).toEqual([]);
    expect(JSON.stringify(config)).not.toContain(subjectAddress);
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["blank", " \n\t "],
  ])("keeps enabled Admin membership default-empty for %s JSON", (_case, raw) => {
    const config = resolve("true", raw);

    expect(config).toMatchObject({ enabled: true, memberships: [] });
  });

  it("normalizes valid entries without mutating parsed input", () => {
    const parsed = [membership({
      campaignIds: [" campaign-admin-b ", "campaign-admin-a", "campaign-admin-b"],
      roleIds: [" review_operator ", "internal_operator", "review_operator"],
      subjectAddress: `  ${subjectAddress}  `,
    })];
    const snapshot = structuredClone(parsed);
    const config = resolveCampaignOsAdminReviewConfig({
      enabled: true,
      membershipsJson: JSON.stringify(parsed),
      jsonParser: () => parsed,
    });

    expect(parsed).toEqual(snapshot);
    expect(config.memberships).toEqual([{
      active: true,
      campaignIds: ["campaign-admin-a", "campaign-admin-b"],
      roleIds: ["internal_operator", "review_operator"],
      subjectAddress,
    }]);
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.memberships)).toBe(true);
    expect(Object.isFrozen(config.memberships[0])).toBe(true);
    expect(Object.isFrozen(config.memberships[0]?.campaignIds)).toBe(true);
    expect(Object.isFrozen(config.memberships[0]?.roleIds)).toBe(true);
  });

  it("distinguishes explicit global scope from empty scope", () => {
    const config = resolve("true", [
      membership({ campaignIds: null, subjectAddress: "2YVwGlobalAdmin" }),
      membership({ campaignIds: [], subjectAddress: "2YVwNoScopeAdmin" }),
    ]);

    expect(config.memberships).toEqual([
      expect.objectContaining({ campaignIds: null, subjectAddress: "2YVwGlobalAdmin" }),
      expect.objectContaining({ campaignIds: [], subjectAddress: "2YVwNoScopeAdmin" }),
    ]);
  });

  it.each([
    ["top-level object", membership(), "ADMIN_MEMBERSHIP_SHAPE_INVALID", membershipsKey],
    ["top-level null", "null", "ADMIN_MEMBERSHIP_SHAPE_INVALID", membershipsKey],
    ["entry primitive", ["operator"], "ADMIN_MEMBERSHIP_SHAPE_INVALID", "memberships[]"],
    ["entry null", [null], "ADMIN_MEMBERSHIP_SHAPE_INVALID", "memberships[]"],
    ["unknown field", [membership({ token: "raw-token" })], "ADMIN_MEMBERSHIP_UNKNOWN_FIELD", "memberships[].unknownField"],
    ["missing active", [{ campaignIds: [], roleIds: ["review_operator"], subjectAddress }], "ADMIN_MEMBERSHIP_FIELD_INVALID", "memberships[].active"],
    ["missing campaigns", [{ active: true, roleIds: ["review_operator"], subjectAddress }], "ADMIN_MEMBERSHIP_FIELD_INVALID", "memberships[].campaignIds"],
    ["missing roles", [{ active: true, campaignIds: [], subjectAddress }], "ADMIN_MEMBERSHIP_FIELD_INVALID", "memberships[].roleIds"],
    ["missing subject", [{ active: true, campaignIds: [], roleIds: ["review_operator"] }], "ADMIN_MEMBERSHIP_FIELD_INVALID", "memberships[].subjectAddress"],
    ["coerced active", [membership({ active: "true" })], "ADMIN_MEMBERSHIP_FIELD_INVALID", "memberships[].active"],
    ["object roles", [membership({ roleIds: {} })], "ADMIN_MEMBERSHIP_FIELD_INVALID", "memberships[].roleIds"],
    ["object campaigns", [membership({ campaignIds: {} })], "ADMIN_MEMBERSHIP_FIELD_INVALID", "memberships[].campaignIds"],
  ])("rejects invalid membership shape: %s", (_case, value, code, field) => {
    let thrown: unknown;

    try {
      resolve("true", value);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(CampaignOsAdminReviewConfigError);
    expect(thrown).toMatchObject({ code, field });
  });

  it.each([
    ["postgres://runtime:password@db.internal/campaign?token=raw-token", "raw-token"],
    ["authorizationBearerSecret", "authorizationbearersecret"],
    ["SELECT * FROM operator_secrets", "operator_secrets"],
    ["Error at /Users/private/admin.ts:42", "/users/private"],
    ["/var/private/operator.json", "/var/private"],
    [`subjectAddress:${subjectAddress}`, subjectAddress.toLowerCase()],
  ])("does not echo attacker-controlled unknown field %j", (unknownField, forbiddenFragment) => {
    const entry = membership();
    entry[unknownField] = "attacker-controlled-value";
    let thrown: unknown;

    try {
      resolve("true", [entry]);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(CampaignOsAdminReviewConfigError);
    expect(thrown).toMatchObject({
      code: "ADMIN_MEMBERSHIP_UNKNOWN_FIELD",
      field: "memberships[].unknownField",
    });
    expect(JSON.stringify(thrown).toLowerCase()).not.toContain(forbiddenFragment);
  });

  it.each([
    ["empty", ""],
    ["whitespace", " \t "],
    ["control character", "2YVwAdmin\u0000Hidden"],
    ["newline", "2YVwAdmin\nHidden"],
    ["oversize", "A".repeat(CAMPAIGN_OS_ADMIN_OPERATOR_SUBJECT_MAX_LENGTH + 1)],
    ["non-string", 42],
  ])("rejects %s subject addresses", (_case, value) => {
    expect(() => resolve("true", [membership({ subjectAddress: value })])).toThrowError(
      expect.objectContaining({
        code: "ADMIN_MEMBERSHIP_FIELD_INVALID",
        field: "memberships[].subjectAddress",
      }),
    );
  });

  it("accepts subject length at the exact limit and preserves Base58 case", () => {
    const exactSubject = `A${"b".repeat(CAMPAIGN_OS_ADMIN_OPERATOR_SUBJECT_MAX_LENGTH - 1)}`;
    const config = resolve("true", [membership({ subjectAddress: ` ${exactSubject} ` })]);

    expect(config.memberships[0]?.subjectAddress).toBe(exactSubject);
  });

  it.each([
    ["empty", []],
    ["unknown", ["project_owner"]],
    ["non-string", [42]],
    ["empty string", [""]],
    ["oversize string", ["r".repeat(CAMPAIGN_OS_ADMIN_OPERATOR_ROLE_MAX_LENGTH + 1)]],
  ])("rejects %s operator roles", (_case, roleIds) => {
    expect(() => resolve("true", [membership({ roleIds })])).toThrowError(
      expect.objectContaining({
        code: "ADMIN_MEMBERSHIP_FIELD_INVALID",
        field: "memberships[].roleIds",
      }),
    );
  });

  it("bounds the raw role array before deduplication", () => {
    expect(resolve("true", [membership({
      roleIds: Array.from(
        { length: CAMPAIGN_OS_ADMIN_OPERATOR_MAX_ROLES_PER_MEMBERSHIP },
        () => "review_operator",
      ),
    })]).memberships[0]?.roleIds).toEqual(["review_operator"]);

    expect(() => resolve("true", [membership({
      roleIds: Array.from(
        { length: CAMPAIGN_OS_ADMIN_OPERATOR_MAX_ROLES_PER_MEMBERSHIP + 1 },
        () => "review_operator",
      ),
    })])).toThrowError(expect.objectContaining({
      code: "ADMIN_MEMBERSHIP_LIMIT_EXCEEDED",
      field: "memberships[].roleIds",
      limit: CAMPAIGN_OS_ADMIN_OPERATOR_MAX_ROLES_PER_MEMBERSHIP,
    }));
  });

  it.each([
    ["missing", undefined],
    ["non-string ID", [42]],
    ["empty ID", [""]],
    ["embedded whitespace", ["campaign admin"]],
    ["control character", ["campaign-admin\u0000hidden"]],
    ["unsafe path", ["campaign/admin"]],
    ["oversize ID", ["c".repeat(129)]],
  ])("rejects %s Campaign scope", (_case, campaignIds) => {
    const entry = membership();

    if (campaignIds === undefined) {
      delete entry.campaignIds;
    } else {
      entry.campaignIds = campaignIds;
    }

    expect(() => resolve("true", [entry])).toThrowError(expect.objectContaining({
      code: "ADMIN_MEMBERSHIP_FIELD_INVALID",
      field: "memberships[].campaignIds",
    }));
  });

  it("uses the canonical Campaign ID length at the exact boundary", () => {
    const atLimit = "c".repeat(CAMPAIGN_OS_CAMPAIGN_ID_MAX_LENGTH);
    const overLimit = `${atLimit}x`;

    expect(resolve("true", [membership({ campaignIds: [atLimit] })])
      .memberships[0]?.campaignIds).toEqual([atLimit]);
    expect(() => resolve("true", [membership({ campaignIds: [overLimit] })]))
      .toThrowError(expect.objectContaining({
        code: "ADMIN_MEMBERSHIP_FIELD_INVALID",
        field: "memberships[].campaignIds",
      }));
  });

  it("accepts the Campaign scope count limit and rejects limit plus one", () => {
    const atLimit = Array.from(
      { length: CAMPAIGN_OS_ADMIN_OPERATOR_MAX_CAMPAIGN_IDS_PER_MEMBERSHIP },
      (_, index) => `campaign-admin-${String(index).padStart(3, "0")}`,
    );

    expect(resolve("true", [membership({ campaignIds: atLimit })])
      .memberships[0]?.campaignIds).toHaveLength(atLimit.length);
    expect(() => resolve("true", [membership({
      campaignIds: [...atLimit, "campaign-admin-over-limit"],
    })])).toThrowError(expect.objectContaining({
      code: "ADMIN_MEMBERSHIP_LIMIT_EXCEEDED",
      field: "memberships[].campaignIds",
      limit: CAMPAIGN_OS_ADMIN_OPERATOR_MAX_CAMPAIGN_IDS_PER_MEMBERSHIP,
    }));
  });

  it("accepts the entry count limit and rejects limit plus one", () => {
    const atLimit = Array.from(
      { length: CAMPAIGN_OS_ADMIN_OPERATOR_MAX_MEMBERSHIPS },
      (_, index) => membership({ subjectAddress: `2YVwAdmin${String(index).padStart(3, "0")}` }),
    );

    expect(resolve("true", atLimit).memberships).toHaveLength(atLimit.length);
    expect(() => resolve("true", [
      ...atLimit,
      membership({ subjectAddress: "2YVwAdminOverLimit" }),
    ])).toThrowError(expect.objectContaining({
      code: "ADMIN_MEMBERSHIP_LIMIT_EXCEEDED",
      field: membershipsKey,
      limit: CAMPAIGN_OS_ADMIN_OPERATOR_MAX_MEMBERSHIPS,
    }));
  });

  it("accepts the raw JSON byte limit and rejects limit plus one", () => {
    const exactLimit = `[]${" ".repeat(CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON_MAX_BYTES - 2)}`;
    const overLimit = `${exactLimit} `;

    expect(resolve("true", exactLimit).memberships).toEqual([]);
    expect(() => resolve("true", overLimit)).toThrowError(expect.objectContaining({
      code: "ADMIN_MEMBERSHIP_LIMIT_EXCEEDED",
      field: membershipsKey,
      limit: CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON_MAX_BYTES,
    }));
  });

  it("accepts the normalized byte limit and rejects limit plus one", () => {
    const entries = Array.from(
      { length: CAMPAIGN_OS_ADMIN_OPERATOR_MAX_MEMBERSHIPS },
      (_, index) => membership({
        campaignIds: [`campaign-${String(index).padStart(3, "0")}`],
        subjectAddress: `2YVwAdmin${String(index).padStart(3, "0")}`,
      }),
    );
    const measure = () => new TextEncoder().encode(JSON.stringify(entries)).byteLength;
    const growTo = (target: number) => {
      for (const entry of entries) {
        while (
          measure() < target
          && String(entry.subjectAddress).length < CAMPAIGN_OS_ADMIN_OPERATOR_SUBJECT_MAX_LENGTH
        ) {
          entry.subjectAddress = `${entry.subjectAddress}A`;
        }
      }

      for (const entry of entries) {
        const campaignIds = entry.campaignIds as string[];

        while (measure() < target && campaignIds[0]!.length < 128) {
          campaignIds[0] = `${campaignIds[0]}x`;
        }
      }
    };

    growTo(CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_NORMALIZED_MAX_BYTES);
    expect(measure()).toBe(CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_NORMALIZED_MAX_BYTES);
    expect(resolve("true", entries).memberships).toHaveLength(entries.length);

    const expandable = entries.find((entry) =>
      (entry.campaignIds as string[])[0]!.length < 128
    );
    expect(expandable).toBeDefined();
    const campaignIds = expandable!.campaignIds as string[];
    campaignIds[0] = `${campaignIds[0]}x`;

    expect(() => resolve("true", entries)).toThrowError(expect.objectContaining({
      code: "ADMIN_MEMBERSHIP_LIMIT_EXCEEDED",
      field: "memberships.normalized",
      limit: CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_NORMALIZED_MAX_BYTES,
    }));
  });

  it("deduplicates semantic exact entries and rejects same-subject conflicts independent of order", () => {
    const first = membership({
      campaignIds: ["campaign-admin-b", "campaign-admin-a"],
      roleIds: ["review_operator", "internal_operator"],
    });
    const duplicate = membership({
      campaignIds: ["campaign-admin-a", "campaign-admin-b"],
      roleIds: ["internal_operator", "review_operator"],
    });
    const config = resolve("true", [first, duplicate]);

    expect(config.memberships).toHaveLength(1);

    const conflicting = membership({ active: false });
    for (const entries of [[first, conflicting], [conflicting, first]]) {
      expect(() => resolve("true", entries)).toThrowError(expect.objectContaining({
        code: "ADMIN_MEMBERSHIP_CONFLICT",
        field: "memberships[].subjectAddress",
      }));
    }
  });

  it("produces deterministic safe revisions from normalized config", () => {
    const first = resolve("true", [
      membership({ subjectAddress: "2YVwOperatorB" }),
      membership({ subjectAddress: "2YVwOperatorA" }),
    ]);
    const second = resolve("true", [
      membership({ subjectAddress: " 2YVwOperatorA " }),
      membership({ subjectAddress: "2YVwOperatorB" }),
    ]);

    expect(first.sourceRevision).toBe(second.sourceRevision);
    expect(first.memberships.map((entry) => entry.subjectAddress)).toEqual([
      "2YVwOperatorA",
      "2YVwOperatorB",
    ]);
    expect(first.sourceRevision).not.toContain("2YVw");
  });

  it("returns only safe diagnostics for malformed and opaque parser failures", () => {
    const rawAddress = "2YVwPrivateOperator";
    const forbiddenFragments = [
      rawAddress,
      "raw-token",
      "raw-signature",
      "postgres://runtime:password@db.internal/campaign",
      "/Users/private/review.json",
      "stack-private-marker",
    ];
    const malformed = `[{"subjectAddress":"${rawAddress}","token":"raw-token"`;
    const opaque = new Error(forbiddenFragments.slice(2).join(" "));
    opaque.stack = `stack-private-marker ${opaque.stack}`;
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;

    const failures = [
      () => resolve("true", malformed),
      () => resolveCampaignOsAdminReviewConfig({
        enabled: true,
        jsonParser: () => {
          throw opaque;
        },
        membershipsJson: malformed,
      }),
      () => resolveCampaignOsAdminReviewConfig({
        enabled: true,
        jsonParser: () => cyclic,
        membershipsJson: malformed,
      }),
    ];

    for (const fail of failures) {
      let thrown: unknown;

      try {
        fail();
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(CampaignOsAdminReviewConfigError);
      const serialized = JSON.stringify(thrown).toLowerCase();
      const rendered = String(thrown).toLowerCase();

      for (const fragment of forbiddenFragments) {
        expect(serialized).not.toContain(fragment.toLowerCase());
        expect(rendered).not.toContain(fragment.toLowerCase());
      }
    }
  });
});
