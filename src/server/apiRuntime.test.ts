import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { campaignDetail } from "../domain/fixtures";
import { createCampaignOsApiRuntime, type ApiRuntimeResponse } from "./apiRuntime";
import { createBackendServiceReadinessReport } from "./backendService";
import type { CampaignDbRepository } from "./campaignDbRepository";
import {
  createCampaignOsJsonRepository,
  createCampaignOsMemoryRepository,
  persistenceBoundary,
  type CampaignOsRepository,
} from "./persistence";
import { startCampaignOsApiServer } from "./server";

interface LocalServiceEnvelope<TPayload> {
  boundary: unknown;
  payload: TPayload;
}

interface CampaignListPayload {
  items?: Array<{
    coreTasks?: Array<{
      points: number;
      required: boolean;
      taskId: string;
      verificationType: string;
    }>;
    id: string;
    status: string;
  }>;
  summary: {
    totalCampaigns: number;
  };
}

interface CampaignDetailPayload {
  item: {
    id: string;
    status?: string;
  };
  tasks?: Array<{
    points: number;
    required: boolean;
    taskId: string;
    verificationType: string;
  }>;
}

interface EligibilityPayload {
  eligible: boolean;
  walletAddress: string;
}

interface AnalyticsPayload {
  exportBatchId: string;
  readyRows: number;
  reviewRequiredRows: number;
}

interface WalletSessionPayload {
  issuer?: {
    cookieIssued: false;
    issuerMode: string;
    jwtIssued: false;
    liveSigningExecuted: false;
    valid?: boolean;
  };
  productionReadiness?: {
    blockedDependencyIds: string[];
    productionReady: false;
  };
  proof?: {
    diagnosticCodes: string[];
    liveVerificationExecuted: false;
    status: string;
    trustLevel: string;
  };
  signatureStatus?: string;
  sessionId: string;
  verificationStatus?: string;
  walletSource: string;
  walletTypeVerified?: boolean;
}

interface CampaignDraftPayload {
  id: string;
  projectId?: string;
  publishReadiness: {
    ready: boolean;
  };
  status?: string;
}

interface TaskDraftPayload {
  campaignId: string;
  id: string;
  points?: number;
  required?: boolean;
  templateCode?: string;
  verificationType?: string;
  walletCompatibility?: string;
}

interface VerificationPayload {
  accountType?: string;
  evidenceSource: string;
  evidenceHash?: string;
  pointsAwarded: number;
  pointsAvailable?: number;
  status: string;
  taskId?: string;
  walletAddress?: string;
  walletSource?: string;
}

interface I18nDraftPayload {
  humanReviewRequired: boolean;
  sourceLocale: string;
  targetLocale: string;
}

interface ExportPreviewPayload {
  campaignId: string;
  contractRootMode: string;
  format: string;
  readyRows: number;
}

interface CampaignLifecyclePayload {
  campaignId: string;
  currentStatus: string;
  operations: Array<{ id: string }>;
  summary: {
    totalOperations: number;
  };
  supportedStatuses: string[];
}

interface LaunchReadinessPayload {
  campaignId: string;
  bundles: Array<{ stage: string }>;
  handoffs: unknown[];
  summary: {
    totalBundles: number;
  };
}

interface ExportReadinessPayload {
  campaignId: string;
  contractRootReadiness: Array<{
    mode: string;
    readiness: string;
    safeDefault: boolean;
  }>;
  previewModes: unknown[];
  summary: {
    previewModeCount: number;
  };
}

interface ProviderReadinessPayload {
  campaignId: string;
  pipeline: {
    paths: unknown[];
    summary: {
      totalPaths: number;
    };
  };
  providerEvidenceRegistry: {
    entries: unknown[];
    summary: {
      totalEntries: number;
    };
  };
}

interface CampaignDbLimitedLifecyclePayload {
  campaignId: string;
  code: "CAMPAIGN_DB_DRAFT_LIFECYCLE_LIMITED";
  diagnostic: {
    code: "CAMPAIGN_DB_DRAFT_LIFECYCLE_LIMITED";
    fullSeededLifecycleAvailable: false;
  };
  fullSeededLifecycleAvailable: false;
  publishReadiness: {
    ready: boolean;
  };
  source: "campaign_db_draft";
  status: string;
  supportedLocales: string[];
  walletPolicy: string;
}

interface AgentWalletActionPayload {
  actionState: string;
  allowedOperation: string;
  auditTrail: {
    executionAttempted: false;
    sensitiveMaterialHandled: false;
    walletSource: "AGENT_SKILL";
  };
  noContractWrite: true;
  noExportFile: true;
  noPrivateKeyBoundary: true;
  noRewardDistribution: true;
  noSignatureExecution: true;
  noTransactionExecution: true;
}

interface GeneratedCampaignTasksPayload {
  humanReviewRequired: boolean;
  pointRules: unknown[];
  taskList: unknown[];
  walletCompatibility: unknown[];
}

interface CampaignPostsPayload {
  artifacts: unknown[];
  humanReviewRequired: boolean;
}

interface CampaignSummaryPayload {
  localeMetrics: unknown[];
  period: string;
  referralWalletRiskMetrics: unknown[];
  reportCards: unknown[];
  riskSummary: unknown[];
  walletLocaleMetrics: unknown[];
  walletTypeMetrics: unknown[];
}

const forbiddenResponseKeys = [
  "privatekey",
  "mnemonic",
  "seedphrase",
  "password",
  "bearer",
  "token",
  "signature",
  "signedurl",
  "objectkey",
  "secret",
];

const allowedSafetyKeys = new Set([
  "noContractWrite",
  "noExportFile",
  "noPrivateKeyBoundary",
  "noRewardDistribution",
  "noSignatureExecution",
  "noTransactionExecution",
]);

const collectKeys = (value: unknown, keys: string[] = []): string[] => {
  if (!value || typeof value !== "object") {
    return keys;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectKeys(item, keys);
    }

    return keys;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (!allowedSafetyKeys.has(key)) {
      keys.push(key.toLowerCase());
    }
    collectKeys(nested, keys);
  }

  return keys;
};

const expectNoForbiddenResponseKeys = (value: unknown) => {
  const keys = collectKeys(value);

  for (const forbiddenKey of forbiddenResponseKeys) {
    expect(keys).not.toContain(forbiddenKey);
  }
};

const expectNoForbiddenFragments = (value: unknown, fragments: readonly string[]) => {
  const serialized = JSON.stringify(value).toLowerCase();

  for (const fragment of fragments) {
    expect(serialized).not.toContain(fragment.toLowerCase());
  }
};

const expectSuccessData = <TPayload = unknown>(response: ApiRuntimeResponse<unknown>) => {
  expect(response.status).toBe(200);
  expect(response.body.ok).toBe(true);

  if (!response.body.ok) {
    throw new Error("Expected API runtime success envelope.");
  }

  expect(response.body.traceId).not.toHaveLength(0);
  expect(response.body.runtime).toMatchObject({
    mode: "local_seeded",
    name: "campaign-os-api-runtime",
  });
  expect(response.body.safety).toMatchObject({
    localOnly: true,
    noLiveApi: true,
    noMigrationRunner: true,
    noProductionDatabase: true,
    noWalletSignature: true,
    noContractWrite: true,
    noRewardDistribution: true,
  });
  expectNoForbiddenResponseKeys(response.body);

  return response.body.data as TPayload;
};

const projectOwnerAuthHeaders = (
  ownerAddress: string,
  extraHeaders: Record<string, string> = {},
) => ({
  "x-campaign-os-account-type": "AA",
  "x-campaign-os-credential-boundary": "ordinary_user_wallet",
  "x-campaign-os-proof-status": "verified",
  "x-campaign-os-roles": "project_owner",
  "x-campaign-os-session-id": `sess-${ownerAddress}`,
  "x-campaign-os-wallet-address": ownerAddress,
  "x-campaign-os-wallet-source": "PORTKEY_AA",
  ...extraHeaders,
});

const createFailingRepository = (): CampaignOsRepository => ({
  health: async () => {
    throw new Error("repository unavailable");
  },
  initialize: async () => undefined,
  record: async () => {
    throw new Error("repository unavailable");
  },
  snapshot: async () => {
    throw new Error("repository unavailable");
  },
});

const createFailingCampaignDbRepository = (): CampaignDbRepository => ({
  addTaskDraft: async () => {
    throw new Error("campaign DB repository unavailable");
  },
  checkEligibility: async () => {
    throw new Error("campaign DB repository unavailable");
  },
  createDraft: async () => {
    throw new Error("campaign DB repository unavailable");
  },
  getById: async () => {
    throw new Error("campaign DB repository unavailable");
  },
  getEvents: () => [],
  health: async () => {
    throw new Error("campaign DB repository unavailable");
  },
  list: async () => {
    throw new Error("campaign DB repository unavailable");
  },
  reset: async () => {
    throw new Error("campaign DB repository unavailable");
  },
  upsertTaskCompletion: async () => {
    throw new Error("campaign DB repository unavailable");
  },
});

const createInitializationTrackingRepository = () => {
  const repository = createCampaignOsMemoryRepository();
  let initializeCount = 0;

  return {
    repository: {
      ...repository,
      initialize: async () => {
        initializeCount += 1;
        await repository.initialize();
      },
    } satisfies CampaignOsRepository,
    getInitializeCount: () => initializeCount,
  };
};

describe("Campaign OS API runtime", () => {
  const runtime = createCampaignOsApiRuntime();

  it("returns health, contract, and service metadata through uniform envelopes", async () => {
    const health = await runtime.handle({
      method: "GET",
      path: "/api/health",
      headers: { "x-campaign-os-trace-id": "trace-health" },
    });
    const contracts = await runtime.handle({ method: "GET", path: "/api/contracts" });
    const services = await runtime.handle({ method: "GET", path: "/api/services" });

    const healthData = expectSuccessData(health);
    const contractData = expectSuccessData(contracts);
    const serviceData = expectSuccessData(services);

    expect(health.body.traceId).toBe("trace-health");
    expect(health.headers["x-campaign-os-trace-id"]).toBe("trace-health");
    expect(healthData).toMatchObject({
      apiFoundation: expect.objectContaining({
        coverage: expect.objectContaining({
          implementedLocalCount: 11,
          notYetImplementedCount: 0,
          productionShapedDeferredCount: 3,
          routeCount: expect.any(Number),
          surfaceCount: 14,
          validationIssueCount: 0,
        }),
        envelopes: expect.objectContaining({
          error: expect.arrayContaining([
            expect.objectContaining({
              id: "api.response.error.v1",
              traceIdField: "traceId",
            }),
          ]),
          success: expect.arrayContaining([
            expect.objectContaining({
              id: "api.response.success.v1",
              routeIdField: "routeId",
              serviceIdField: "serviceId",
              supportModeField: "supportMode",
              traceIdField: "traceId",
            }),
          ]),
        }),
        routes: expect.arrayContaining([
          expect.objectContaining({
            errorEnvelopeId: "api.response.error.v1",
            responseEnvelopeId: "api.response.success.v1",
            routeId: "runtime.health",
            serviceId: "runtime-observability",
            supportMode: "local_seeded",
          }),
        ]),
        servicePorts: expect.objectContaining({
          coverage: expect.objectContaining({
            routeOwnershipCount: expect.any(Number),
            validationIssueCount: 0,
          }),
          validation: expect.objectContaining({
            valid: true,
          }),
        }),
        surfaces: expect.arrayContaining([
          expect.objectContaining({
            serviceId: "points-ranking-service",
            state: "production_shaped_deferred",
            surfaceId: "points-ranking",
          }),
          expect.objectContaining({
            routeIds: expect.arrayContaining(["runtime.health", "runtime.contracts"]),
            serviceId: "runtime-observability",
            state: "implemented_local",
            surfaceId: "runtime-observability",
          }),
        ]),
        validation: expect.objectContaining({
          issues: [],
          valid: true,
        }),
      }),
      backendService: expect.objectContaining({
        activation: expect.objectContaining({
          deploymentHandoff: expect.objectContaining({
            contractsEndpoint: "/api/contracts",
            healthEndpoint: "/api/health",
            runtimeTarget: "api_service",
            smokeCommand: "npm run server:smoke",
            startCommand: "npm run server:start",
          }),
          id: "campaign-os-backend-runtime-activation",
          liveSideEffectsEnabled: false,
          productionReady: false,
        }),
        adapterStatus: "active",
        apiFoundationValidationIssueCount: 0,
        authSession: expect.objectContaining({
          foundation: expect.objectContaining({
            blockerCount: 0,
            liveSideEffectsEnabled: false,
            liveSigningExecuted: false,
            liveVerificationExecuted: false,
            productionReady: false,
            status: "local_ready",
            valid: true,
          }),
          profileId: "local-review",
          proofStatus: "local_seeded",
          protectedRouteCount: expect.any(Number),
          roleCount: 5,
          status: "local_seeded",
          valid: true,
          verificationMode: "local_only",
        }),
        backendRuntimeBootstrap: expect.objectContaining({
          deferredDependencyIds: expect.arrayContaining([
            "production-database-driver",
            "auth-middleware",
            "worker-ingress",
            "scheduler",
            "contract-writer",
            "object-storage-export",
            "observability-exporter",
            "analytics-warehouse",
            "reward-custody",
            "reward-distribution",
          ]),
          diagnosticCodes: [],
          profileId: "local-review",
          status: "ready",
          tracePolicy: expect.objectContaining({
            failureEnvelopeTraceId: true,
            successEnvelopeTraceId: true,
            traceHeaderName: "x-campaign-os-trace-id",
          }),
          valid: true,
        }),
        entrypoint: expect.objectContaining({
          id: "campaign-os-backend-service",
          profileId: "local-review",
          runtimeName: "campaign-os-api-runtime",
          supportMode: "local_seeded",
        }),
        entrypointId: "campaign-os-backend-service",
        databaseAdapterRuntime: expect.objectContaining({
          connectionPool: expect.objectContaining({
            configuredKeyCount: 0,
            safeLabel: "not_configured",
            state: "not_configured",
          }),
          driverId: "campaign-os-deterministic-test-driver",
          liveConnectionAttempted: false,
          liveQueryExecutionEnabled: false,
          migrationExecutor: expect.objectContaining({
            executorStatus: "not_configured",
            handoffStatus: "not_configured",
            handoffValid: true,
            liveExecutionCount: 0,
            liveExecutionEnabled: false,
            migrationGateStatus: "ready",
          }),
          profileId: "local-review",
            providerId: "campaign-os-deterministic-test-db",
            queryAdapter: expect.objectContaining({
              deterministicTestMode: true,
              liveQueryExecutionEnabled: false,
            }),
            productionDbRuntime: expect.objectContaining({
              connectionState: "ready",
              driverId: "campaign-os-deterministic-test-driver",
              id: "campaign-os-production-db-runtime-v1",
              liveConnectionAttempted: false,
              liveQueryExecutionEnabled: false,
              migrationGateStatus: "not_required_for_fixture",
              ownerStoreCount: 6,
              profileId: "local-review",
              providerId: "campaign-os-deterministic-test-db",
              schemaManifestId: "campaign-os-production-db-schema-v0.2",
              status: "ready",
              valid: true,
            }),
            requiredStoreCount: 6,
            status: "active_local",
            valid: true,
          }),
        databaseReadiness: expect.objectContaining({
          adapterStatus: "contract_ready",
          migrationPlanStatus: "dry_run_ready",
          requiredStoreCount: 6,
        }),
        migrationRunnerStatus: "disabled_local_review",
        persistenceFoundation: expect.objectContaining({
          diagnosticCodes: ["DATABASE_MIGRATION_LIVE_EXECUTION_DISABLED"],
          liveConnectionAttempted: false,
          liveMigrationExecutionEnabled: false,
          liveQueryExecutionEnabled: false,
          migrationDryRun: expect.objectContaining({
            noLiveMigrationCommand: true,
            status: "dry_run_ready",
          }),
          productionReady: false,
          status: "metadata_ready",
          storeCoverageCount: 6,
          valid: true,
        }),
        persistenceRuntime: expect.objectContaining({
          activeDriverId: "campaign-os-memory-adapter",
          adapterKind: "memory",
          connection: expect.objectContaining({
            configuredKeyCount: 0,
            safeLabel: "not_configured",
            state: "not_configured",
          }),
          deferredDependencyIds: expect.arrayContaining([
            "db-provider-selection",
            "driver-package",
            "connection-pool",
            "migration-executor",
            "migration-lock",
            "backup-restore-plan",
            "secret-manager",
            "object-storage-export",
            "analytics-warehouse",
          ]),
          diagnosticCodes: [],
          diagnostics: [],
          liveConnectionAttempted: false,
          migrationGate: expect.objectContaining({
            diagnosticCodes: [],
            liveExecutionCount: 0,
            liveExecutionEnabled: false,
            mode: "dry_run_only",
            status: "ready",
          }),
          profileId: "local-review",
          requiredStoreCount: 6,
          status: "active_local",
          stores: expect.arrayContaining([
            expect.objectContaining({
              id: "campaign-db",
              required: true,
              runtimeState: "covered",
            }),
          ]),
          valid: true,
        }),
        providerClientReadiness: expect.objectContaining({
          activationInventory: expect.objectContaining({
            activationStatus: "disabled",
            blockedConfigKeys: [],
            blockerIds: [],
            redacted: true,
          }),
          activationStatus: "disabled",
          blockerCount: 0,
          diagnosticCodes: [],
          liveProviderCallsAttempted: false,
          productionReady: false,
          providerHttpRuntime: expect.objectContaining({
            activationStatus: "disabled",
            endpointCount: 13,
            liveHttpCallsAttempted: false,
            productionReady: false,
            runtimeId: "campaign-os-provider-http-client-runtime",
            status: "disabled",
            transportProvided: false,
            valid: true,
          }),
          providerClientsEnabled: false,
          providerClientsProvided: false,
          queueHandoff: expect.objectContaining({
            consumeReadinessStatus: "disabled",
            queueId: "verification-jobs",
          }),
          redacted: true,
          registry: expect.objectContaining({
            clientCount: 0,
            providerGroups: expect.arrayContaining([
              "aefinder-aelfscan-indexers",
              "dapp-api-adapters",
              "manual-review",
              "social-api-adapters",
              "wallet-auth-session",
            ]),
          }),
          requiredConfigKeys: expect.arrayContaining([
            "CAMPAIGN_OS_PROVIDER_CLIENT_ENABLEMENT",
            "CAMPAIGN_OS_PROVIDER_REGISTRY_URL",
            "CAMPAIGN_OS_PROVIDER_ENDPOINT_REF",
            "CAMPAIGN_OS_PROVIDER_CREDENTIAL_REF",
            "CAMPAIGN_OS_PROVIDER_CLIENT_SEAM",
            "CAMPAIGN_OS_PROVIDER_CONSUME_READINESS_HANDOFF",
            "CAMPAIGN_OS_PROVIDER_REDACTION_POLICY",
          ]),
          status: "disabled",
          valid: true,
        }),
        profile: expect.objectContaining({
          id: "local-review",
          supportMode: "local_seeded",
        }),
        profileId: "local-review",
        traceId: "trace-health",
        validation: expect.objectContaining({
          issueCount: 0,
          valid: true,
        }),
      }),
      capabilities: expect.objectContaining({
        summary: expect.objectContaining({
          deferredCount: expect.any(Number),
          disabledCount: expect.any(Number),
          totalCapabilities: expect.any(Number),
        }),
      }),
      mode: "local_seeded",
      persistence: expect.objectContaining({
        mode: "memory",
        noProductionDatabase: true,
        recordCount: expect.any(Number),
        status: "ok",
      }),
      routeCount: expect.any(Number),
      serviceGroups: expect.arrayContaining([
        expect.objectContaining({
          id: "wallet_session",
          deferredDependencies: expect.arrayContaining(["auth_session", "production_database"]),
        }),
      ]),
      serviceReadiness: expect.objectContaining({
        totalServices: expect.any(Number),
      }),
      status: "ok",
      topology: expect.objectContaining({
        coverage: expect.objectContaining({
          invalidReferenceCount: 0,
          serviceCount: 13,
          unassignedRouteIds: [],
        }),
        profileReadiness: expect.objectContaining({
          "local-review": expect.objectContaining({
            externalNetworkAllowed: false,
            secretRequired: false,
          }),
        }),
        validation: expect.objectContaining({
          valid: true,
        }),
      }),
    });
    expect(contractData).toMatchObject({
      activation: expect.objectContaining({
        deploymentHandoff: expect.objectContaining({
          environmentKeys: expect.arrayContaining([
            expect.objectContaining({
              key: "CAMPAIGN_OS_DATABASE_URL",
              redacted: true,
              status: "blocked",
            }),
            expect.objectContaining({
              key: "CAMPAIGN_OS_AUTH_SECRET",
              redacted: true,
              status: "blocked",
            }),
          ]),
          requiredBeforeProduction: expect.arrayContaining([
            "live-database-driver",
            "migration-executor",
            "wallet-proof-verifier",
            "session-issuer",
            "contract-writer",
            "reward-custody",
            "reward-distribution",
          ]),
          startCommand: "npm run server:start",
        }),
        productionDependencyBlockers: expect.arrayContaining([
          expect.objectContaining({
            id: "live-database-driver",
            status: "blocked",
          }),
          expect.objectContaining({
            id: "provider-adapters",
            status: "deferred",
          }),
        ]),
        runtimeTarget: "node-http-api-service",
      }),
      apiFoundation: expect.objectContaining({
        coverage: expect.objectContaining({
          routeCount: expect.any(Number),
          surfaceCount: 14,
          validationIssueCount: 0,
        }),
        requestContracts: expect.arrayContaining([
          expect.objectContaining({
            id: "wallet.session.create.request",
            routeId: "wallet.session.create",
          }),
        ]),
        routes: expect.arrayContaining([
          expect.objectContaining({
            operationId: "createWalletSession",
            routeId: "wallet.session.create",
            serviceId: "wallet-session-service",
            supportMode: "local_seeded",
          }),
        ]),
        servicePorts: expect.objectContaining({
          ports: expect.arrayContaining([
            expect.objectContaining({
              id: "wallet-session-port",
              productionAdapterStatus: "local_seeded",
              requiresExternalNetwork: false,
              requiresSecret: false,
              serviceId: "wallet-session-service",
            }),
          ]),
          validation: expect.objectContaining({
            valid: true,
          }),
        }),
        validation: expect.objectContaining({
          issues: [],
          valid: true,
        }),
      }),
      backendService: expect.objectContaining({
        attachMapAreas: expect.arrayContaining([
          expect.objectContaining({
            area: "production-persistence",
            currentStatus: "blocked",
            requiredBeforeProduction: true,
          }),
          expect.objectContaining({
            area: "auth-session",
            currentStatus: "local-only",
            requiredBeforeProduction: true,
          }),
          expect.objectContaining({
            area: "contract-writer",
            currentStatus: "blocked",
            requiredBeforeProduction: true,
          }),
        ]),
        configContract: expect.objectContaining({
          persistenceMode: "memory",
          profileId: "local-review",
          valid: true,
        }),
        authSession: expect.objectContaining({
          agentCredentialBoundary: {
            agentSkillCanSubstituteUserWallet: false,
            separatedFromUserWalletSession: true,
          },
          foundation: expect.objectContaining({
            id: "campaign-os-production-auth-session-foundation",
            liveSideEffectsEnabled: false,
            productionReady: false,
            protectedRouteCoverage: expect.objectContaining({
              locallyEnforcedRouteIds: ["campaigns.create"],
            }),
            status: "local_ready",
            valid: true,
          }),
          profileId: "local-review",
          protectedRoutes: expect.arrayContaining([
            expect.objectContaining({
              enforcementStatus: "metadata_only",
              routeId: "wallet.session.create",
            }),
            expect.objectContaining({
              enforcementStatus: "local_enforced",
              requiredRoles: ["project_owner"],
              routeId: "campaigns.create",
            }),
            expect.objectContaining({
              enforcementStatus: "enforcement_deferred",
              requiredRoles: ["project_owner", "internal_operator"],
              routeId: "campaigns.export.preview",
            }),
            expect.objectContaining({
              enforcementStatus: "enforcement_deferred",
              requiredRoles: ["participant"],
              routeId: "tasks.verify",
            }),
          ]),
          rolePolicy: expect.objectContaining({
            leastPrivilegeDefault: true,
            roleCount: 5,
          }),
          authContracts: expect.objectContaining({
            liveSideEffectsEnabled: false,
            productionReady: false,
            proofVerifier: expect.objectContaining({
              localContractReady: true,
              liveVerificationExecuted: false,
              productionReady: false,
            }),
            sessionIssuer: expect.objectContaining({
              liveSigningExecuted: false,
              localContractReady: true,
              productionReady: false,
            }),
          }),
          sessionContract: expect.objectContaining({
            agentCredentialSeparated: true,
            walletSources: expect.arrayContaining(["PORTKEY_AA", "NIGHTELF", "AGENT_SKILL", "OTHER"]),
          }),
          status: "local_seeded",
          validation: expect.objectContaining({
            issueCount: 0,
            valid: true,
          }),
        }),
        backendRuntimeBootstrap: expect.objectContaining({
          deferredDependencyIds: expect.arrayContaining([
            "production-database-driver",
            "auth-middleware",
            "worker-ingress",
            "scheduler",
            "contract-writer",
            "object-storage-export",
            "observability-exporter",
            "analytics-warehouse",
            "reward-custody",
            "reward-distribution",
          ]),
          diagnosticCodes: [],
          profileId: "local-review",
          status: "ready",
          tracePolicy: expect.objectContaining({
            failureEnvelopeTraceId: true,
            successEnvelopeTraceId: true,
            traceHeaderName: "x-campaign-os-trace-id",
          }),
          valid: true,
        }),
        deferredProductionCapabilities: expect.arrayContaining([
          "auth_session",
          "production_database",
          "worker_queue",
          "contract_writer",
          "reward_distribution",
        ]),
        entrypoint: expect.objectContaining({
          id: "campaign-os-backend-service",
          supportMode: "local_seeded",
        }),
        migrationManifest: expect.objectContaining({
          noLiveMigrationCommand: true,
          noMigrationRunner: false,
          runnerStatus: "disabled_local_review",
        }),
        databaseAdapterRuntime: expect.objectContaining({
          connectionPoolState: "not_configured",
          deferredDependencies: expect.arrayContaining([
            expect.objectContaining({
              id: "driver-package-selection",
              requiredBeforeProduction: true,
              status: "deferred",
            }),
            expect.objectContaining({
              id: "secret-manager",
              requiredBeforeProduction: true,
              status: "deferred",
            }),
          ]),
          liveConnectionAttempted: false,
          liveQueryExecutionEnabled: false,
          migrationExecutor: expect.objectContaining({
            liveExecutionCount: 0,
            liveExecutionEnabled: false,
            migrationGateStatus: "ready",
          }),
          profileId: "local-review",
          status: "active_local",
          stores: expect.arrayContaining([
            expect.objectContaining({
              id: "campaign-db",
              adapterStatus: "mapped",
              required: true,
            }),
          ]),
          valid: true,
        }),
        databaseReadiness: expect.objectContaining({
          adapter: expect.objectContaining({
            id: "campaign-os-production-db-adapter",
            status: "contract_ready",
          }),
          migrationPlan: expect.objectContaining({
            dryRun: true,
            liveExecutionEnabled: false,
            status: "dry_run_ready",
          }),
          requiredStores: expect.arrayContaining([
            expect.objectContaining({
              id: "campaign-db",
              schemaVersion: "v0.2.0",
            }),
          ]),
        }),
        persistenceAdapterPort: expect.objectContaining({
          activeAdapter: expect.objectContaining({
            id: "campaign-os-memory-adapter",
            kind: "memory",
            status: "active",
          }),
          valid: true,
        }),
        persistenceFoundation: expect.objectContaining({
          liveConnectionAttempted: false,
          liveMigrationExecutionEnabled: false,
          productionReady: false,
          status: "metadata_ready",
          storeCoverageCount: 6,
          valid: true,
        }),
        persistenceRuntime: expect.objectContaining({
          activeDriverId: "campaign-os-memory-adapter",
          adapterKind: "memory",
          connectionState: "not_configured",
          deferredDependencies: expect.arrayContaining([
            expect.objectContaining({
              id: "db-provider-selection",
              requiredBeforeProduction: true,
              status: "deferred",
            }),
            expect.objectContaining({
              id: "secret-manager",
              requiredBeforeProduction: true,
              status: "deferred",
            }),
          ]),
          liveConnectionAttempted: false,
          migrationGate: expect.objectContaining({
            liveExecutionCount: 0,
            liveExecutionEnabled: false,
            mode: "dry_run_only",
            status: "ready",
          }),
          profileId: "local-review",
          status: "active_local",
          valid: true,
        }),
        providerClientReadiness: expect.objectContaining({
          activationStatus: "disabled",
          blockerCount: 0,
          liveProviderCallsAttempted: false,
          productionReady: false,
          providerClientsEnabled: false,
          providerClientsProvided: false,
          queueHandoff: expect.objectContaining({
            consumeReadinessStatus: "disabled",
          }),
          redacted: true,
          registry: expect.objectContaining({
            clientCount: 0,
          }),
          status: "disabled",
          valid: true,
        }),
        reportShape: expect.objectContaining({
          sections: expect.arrayContaining([
            "entrypoint",
            "config",
            "attachMap",
            "authSession",
            "backendRuntimeBootstrap",
            "databaseReadiness",
            "persistenceFoundation",
            "persistenceRuntime",
            "providerClientReadiness",
            "validation",
          ]),
          valid: true,
        }),
      }),
      capabilities: expect.objectContaining({
        summary: expect.objectContaining({
          deferredCount: expect.any(Number),
          disabledCount: expect.any(Number),
        }),
      }),
      coverage: expect.objectContaining({
        coveredSkillIds: expect.arrayContaining(["create_wallet_session", "export_winners"]),
      }),
      persistence: expect.objectContaining({
        boundary: persistenceBoundary,
        health: expect.objectContaining({
          localOnly: true,
          noMigrationRunner: true,
          noProductionDatabase: true,
        }),
      }),
      routes: expect.arrayContaining([
        expect.objectContaining({ id: "runtime.health", path: "/api/health", serviceGroup: "runtime" }),
      ]),
      serviceGroups: expect.arrayContaining([
        expect.objectContaining({ id: "export", deferredDependencies: expect.arrayContaining(["contract_writer"]) }),
      ]),
      topology: expect.objectContaining({
        deploymentUnits: expect.arrayContaining([
          expect.objectContaining({ id: "api-runtime", productionTarget: "api_service" }),
        ]),
        services: expect.arrayContaining([
          expect.objectContaining({
            id: "campaign-service",
            routeIds: expect.arrayContaining(["campaigns.list", "campaigns.create", "campaigns.detail"]),
          }),
        ]),
      }),
    });
    expect(serviceData).toMatchObject({
      summary: expect.objectContaining({
        totalServices: expect.any(Number),
      }),
    });
  });

  it("keeps backend readiness validation off representative business routes", async () => {
    let readinessCallCount = 0;
    const runtimeWithoutHotPathReadiness = createCampaignOsApiRuntime({
      backendServiceReadiness: () => {
        readinessCallCount += 1;
        throw new Error("backend readiness should only run on runtime metadata routes");
      },
    });

    const detail = await runtimeWithoutHotPathReadiness.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}`,
    });
    const eligibility = await runtimeWithoutHotPathReadiness.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/eligibility?address=${encodeURIComponent("2F4...9aB")}`,
    });
    const exportPreview = await runtimeWithoutHotPathReadiness.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/export`,
      body: JSON.stringify({
        contractRootMode: "none",
        format: "json",
      }),
    });

    expect(expectSuccessData<LocalServiceEnvelope<CampaignDetailPayload>>(detail).payload.item.id).toBe(
      campaignDetail.id,
    );
    expect(expectSuccessData<LocalServiceEnvelope<EligibilityPayload>>(eligibility).payload).toMatchObject({
      eligible: true,
      walletAddress: "2F4...9aB",
    });
    expect(expectSuccessData<LocalServiceEnvelope<ExportPreviewPayload>>(exportPreview).payload).toMatchObject({
      campaignId: campaignDetail.id,
      contractRootMode: "none",
      format: "json",
    });
    expect(readinessCallCount).toBe(0);
  });

  it("uses one backend readiness report per runtime metadata response", async () => {
    let readinessCallCount = 0;
    const readiness = createBackendServiceReadinessReport();
    const runtimeWithReadinessSpy = createCampaignOsApiRuntime({
      backendServiceReadiness: () => {
        readinessCallCount += 1;

        return readiness;
      },
    });

    await runtimeWithReadinessSpy.handle({
      method: "GET",
      path: "/api/health",
    });
    await runtimeWithReadinessSpy.handle({
      method: "GET",
      path: "/api/contracts",
    });
    await runtimeWithReadinessSpy.handle({
      method: "GET",
      path: "/api/health",
    });
    await runtimeWithReadinessSpy.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}`,
    });

    expect(readinessCallCount).toBe(3);
  });

  it("propagates caller trace ids and generates success trace ids", async () => {
    const traced = await runtime.handle({
      method: "GET",
      path: "/api/health",
      headers: { "x-campaign-os-trace-id": "trace-success-caller" },
    });
    const generated = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}`,
    });

    expect(traced.status).toBe(200);
    expect(traced.headers["x-campaign-os-trace-id"]).toBe("trace-success-caller");
    expect(traced.body.traceId).toBe("trace-success-caller");
    expect(expectSuccessData(traced)).toMatchObject({
      apiService: expect.objectContaining({
        id: "campaign-os-api-service",
        productionReady: false,
        status: "ready",
      }),
      backendService: expect.objectContaining({
        apiService: expect.objectContaining({
          deployableBoundaryReady: true,
          liveConnectionAttempted: false,
          liveSideEffectsEnabled: false,
          productionReady: false,
          status: "ready",
        }),
        backendRuntimeBootstrap: expect.objectContaining({
          tracePolicy: expect.objectContaining({
            traceHeaderName: "x-campaign-os-trace-id",
          }),
        }),
      }),
    });
    expect(generated.status).toBe(200);
    expect(generated.body.traceId).toMatch(/^campaign-os-trace-/);
    expect(generated.headers["x-campaign-os-trace-id"]).toBe(generated.body.traceId);
  });

  it("does not mark unsupported backend config as production ready in health metadata", async () => {
    const invalidBackendRuntime = createCampaignOsApiRuntime({
      runtimeConfigOptions: {
        env: {
          CAMPAIGN_OS_BACKEND_PROFILE: "production-live",
          CAMPAIGN_OS_ENABLE_CONTRACT_WRITER: "true",
          CAMPAIGN_OS_PERSISTENCE_MODE: "memory",
        },
      },
    });
    const health = await invalidBackendRuntime.handle({
      method: "GET",
      path: "/api/health",
      headers: { "x-campaign-os-trace-id": "trace-invalid-backend-profile" },
    });
    const healthData = expectSuccessData(health);

    expect(healthData).toMatchObject({
      backendService: expect.objectContaining({
        profile: expect.objectContaining({
          id: "production-required",
          status: "blocked",
        }),
        profileId: "production-required",
        validation: expect.objectContaining({
          valid: false,
        }),
      }),
    });
    expectNoForbiddenResponseKeys(health.body);
  });

  it("surfaces production-required database readiness as blocked without exposing secrets", async () => {
    const productionRuntime = createCampaignOsApiRuntime({
      runtimeConfigOptions: {
        env: {
          CAMPAIGN_OS_AUTH_SECRET: "runtime-auth-secret",
          CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
          CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT: "https://writer.invalid",
          CAMPAIGN_OS_DATABASE_URL: "postgres://db.invalid/campaign-os",
          CAMPAIGN_OS_PROVIDER_REGISTRY_URL: "https://providers.invalid",
          CAMPAIGN_OS_WORKER_QUEUE_URL: "https://queue.invalid",
        },
      },
    });
    const health = await productionRuntime.handle({
      method: "GET",
      path: "/api/health",
    });
    const contracts = await productionRuntime.handle({
      method: "GET",
      path: "/api/contracts",
    });

    expect(expectSuccessData(health)).toMatchObject({
      apiService: expect.objectContaining({
        diagnosticCodes: expect.arrayContaining(["API_SERVICE_PRODUCTION_BLOCKED"]),
        deployableBoundaryReady: false,
        productionReady: false,
        status: "blocked",
      }),
      backendService: expect.objectContaining({
        apiService: expect.objectContaining({
          diagnosticCodes: expect.arrayContaining(["API_SERVICE_PRODUCTION_BLOCKED"]),
          liveConnectionAttempted: false,
          liveSideEffectsEnabled: false,
          productionReady: false,
          status: "blocked",
        }),
        authSession: expect.objectContaining({
          foundation: expect.objectContaining({
            blockerCount: 8,
            liveSideEffectsEnabled: false,
            liveSigningExecuted: false,
            liveVerificationExecuted: false,
            productionReady: false,
            status: "blocked",
            valid: false,
          }),
          status: "blocked",
          valid: false,
          verificationMode: "production_required",
        }),
        backendRuntimeBootstrap: expect.objectContaining({
          diagnosticCodes: expect.arrayContaining([
            "BACKEND_RUNTIME_BOOTSTRAP_PRODUCTION_BLOCKED",
            "BACKEND_RUNTIME_BOOTSTRAP_SERVER_RUNTIME_INVALID",
            "BACKEND_RUNTIME_BOOTSTRAP_BACKEND_READINESS_INVALID",
          ]),
          profileId: "production-required",
          status: "blocked",
          valid: false,
        }),
        databaseReadiness: expect.objectContaining({
          adapterStatus: "blocked",
          migrationPlanStatus: "blocked",
          valid: false,
        }),
        databaseAdapterRuntime: expect.objectContaining({
          connectionPool: expect.objectContaining({
            configuredKeyCount: 1,
            safeLabel: "[redacted]",
            state: "configured_redacted",
          }),
          diagnosticCodes: expect.arrayContaining([
            "DATABASE_DRIVER_PRODUCTION_DEFERRED",
            "DATABASE_ADAPTER_SECRET_REDACTED",
            "DATABASE_ADAPTER_PRECONDITION_DEFERRED",
          ]),
          liveConnectionAttempted: false,
          liveQueryExecutionEnabled: false,
          migrationExecutor: expect.objectContaining({
            executorStatus: "blocked",
            handoffStatus: "blocked",
            handoffValid: false,
            liveExecutionCount: 0,
            liveExecutionEnabled: false,
            migrationGateStatus: "blocked",
          }),
          productionDbRuntime: expect.objectContaining({
            connectionState: "configured_redacted",
            diagnosticCodes: expect.arrayContaining([
              "PRODUCTION_DB_DRIVER_DEFERRED",
              "PRODUCTION_DB_SECRET_REDACTED",
              "PRODUCTION_DB_MIGRATION_GATE_BLOCKED",
            ]),
            driverId: "campaign-os-production-driver-deferred",
            liveConnectionAttempted: false,
            liveQueryExecutionEnabled: false,
            migrationGateStatus: "blocked",
            profileId: "production-required",
            status: "blocked",
            valid: false,
          }),
          profileId: "production-required",
          status: "blocked",
          valid: false,
        }),
        persistenceRuntime: expect.objectContaining({
          activeDriverId: "campaign-os-production-db-adapter",
          adapterKind: "production_deferred",
          connection: expect.objectContaining({
            configuredKeyCount: 1,
            safeLabel: "[redacted]",
            state: "configured_redacted",
          }),
          diagnosticCodes: expect.arrayContaining([
            "PRODUCTION_PERSISTENCE_SECRET_REDACTED",
            "PRODUCTION_PERSISTENCE_LIVE_CONNECTION_DEFERRED",
          ]),
          liveConnectionAttempted: false,
          migrationGate: expect.objectContaining({
            approval: "missing",
            diagnosticCodes: expect.arrayContaining([
              "MIGRATION_EXECUTION_APPROVAL_MISSING",
              "MIGRATION_EXECUTION_DRIVER_DEFERRED",
            ]),
            liveExecutionCount: 0,
            liveExecutionEnabled: false,
            mode: "live_blocked",
            status: "blocked",
          }),
          profileId: "production-required",
          requiredStoreCount: 6,
          status: "boundary_ready",
        }),
        validation: expect.objectContaining({
          valid: false,
        }),
      }),
    });
    expect(expectSuccessData(contracts)).toMatchObject({
      apiService: expect.objectContaining({
        attachMap: expect.arrayContaining([
          expect.objectContaining({ id: "live-database-driver", status: "blocked" }),
          expect.objectContaining({ id: "provider-adapters", status: "deferred" }),
        ]),
        productionReady: false,
        status: "blocked",
      }),
      backendService: expect.objectContaining({
        apiService: expect.objectContaining({
          deployableBoundaryReady: false,
          productionReady: false,
          status: "blocked",
        }),
        authSession: expect.objectContaining({
          foundation: expect.objectContaining({
            blockerCount: 8,
            productionReady: false,
            status: "blocked",
            valid: false,
          }),
          status: "blocked",
          validation: expect.objectContaining({
            valid: false,
          }),
        }),
        backendRuntimeBootstrap: expect.objectContaining({
          diagnosticCodes: expect.arrayContaining([
            "BACKEND_RUNTIME_BOOTSTRAP_PRODUCTION_BLOCKED",
            "BACKEND_RUNTIME_BOOTSTRAP_SERVER_RUNTIME_INVALID",
            "BACKEND_RUNTIME_BOOTSTRAP_BACKEND_READINESS_INVALID",
          ]),
          profileId: "production-required",
          status: "blocked",
          valid: false,
        }),
        databaseReadiness: expect.objectContaining({
          adapter: expect.objectContaining({
            status: "blocked",
          }),
          migrationPlan: expect.objectContaining({
            status: "blocked",
          }),
          validation: expect.objectContaining({
            valid: false,
          }),
        }),
        databaseAdapterRuntime: expect.objectContaining({
          connectionPoolState: "configured_redacted",
          liveConnectionAttempted: false,
          liveQueryExecutionEnabled: false,
          migrationExecutor: expect.objectContaining({
            handoffStatus: "blocked",
            liveExecutionCount: 0,
            liveExecutionEnabled: false,
            migrationGateStatus: "blocked",
          }),
          productionDbRuntime: expect.objectContaining({
            connection: expect.objectContaining({
              safeLabel: "[redacted]",
              state: "configured_redacted",
            }),
            diagnostics: expect.arrayContaining([
              expect.objectContaining({
                code: "PRODUCTION_DB_SECRET_REDACTED",
                field: "CAMPAIGN_OS_DATABASE_URL",
              }),
              expect.objectContaining({
                code: "PRODUCTION_DB_MIGRATION_GATE_BLOCKED",
              }),
            ]),
            driver: expect.objectContaining({
              driverId: "campaign-os-production-driver-deferred",
              productionReady: false,
            }),
            id: "campaign-os-production-db-runtime-v1",
            liveConnectionAttempted: false,
            liveQueryExecutionEnabled: false,
            migrationGate: expect.objectContaining({
              liveExecutionEnabled: false,
              status: "blocked",
            }),
            ownerStores: expect.arrayContaining(["campaign-db", "points-ledger"]),
            queryCapability: expect.objectContaining({
              adHocRawSqlEnabled: false,
              liveQueryExecutionEnabled: false,
              parameterizedQueries: true,
              transactions: true,
            }),
            schemaManifestId: "campaign-os-production-db-schema-v0.2",
            status: "blocked",
            valid: false,
          }),
          profileId: "production-required",
          status: "blocked",
          stores: expect.arrayContaining([
            expect.objectContaining({
              id: "points-ledger",
              adapterStatus: "blocked",
              required: true,
            }),
          ]),
          valid: false,
        }),
        persistenceRuntime: expect.objectContaining({
          activeDriverId: "campaign-os-production-db-adapter",
          adapterKind: "production_deferred",
          connectionState: "configured_redacted",
          liveConnectionAttempted: false,
          migrationGate: expect.objectContaining({
            liveExecutionCount: 0,
            liveExecutionEnabled: false,
            mode: "live_blocked",
            status: "blocked",
          }),
          profileId: "production-required",
          status: "boundary_ready",
          valid: true,
        }),
      }),
    });
    expect(JSON.stringify(health.body)).not.toContain("runtime-auth-secret");
    expect(JSON.stringify(contracts.body)).not.toContain("postgres://db.invalid/campaign-os");
    expectNoForbiddenResponseKeys(health.body);
    expectNoForbiddenResponseKeys(contracts.body);
  });

  it("calls seeded campaign read endpoints through the local service facade", async () => {
    const list = await runtime.handle({
      method: "GET",
      path: `/api/campaigns?walletAddress=${encodeURIComponent("3E9...7cD")}`,
    });
    const detail = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}?walletAddress=${encodeURIComponent("3E9...7cD")}`,
    });
    const eligibility = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/eligibility?address=${encodeURIComponent("2F4...9aB")}`,
    });
    const analytics = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/analytics`,
    });

    expect(expectSuccessData<LocalServiceEnvelope<CampaignListPayload>>(list).payload.summary.totalCampaigns).toBe(3);
    expect(expectSuccessData<LocalServiceEnvelope<CampaignDetailPayload>>(detail).payload.item.id).toBe(campaignDetail.id);
    expect(expectSuccessData<LocalServiceEnvelope<EligibilityPayload>>(eligibility).payload).toMatchObject({
      eligible: true,
      walletAddress: "2F4...9aB",
    });
    expect(expectSuccessData<LocalServiceEnvelope<AnalyticsPayload>>(analytics).payload).toMatchObject({
      exportBatchId: "export-awaken-sprint-preview",
      readyRows: expect.any(Number),
      reviewRequiredRows: expect.any(Number),
    });
  });

  it("serves seeded lifecycle and readiness GET routes without persistence side effects", async () => {
    const repository = createCampaignOsMemoryRepository();
    const runtimeWithPersistence = createCampaignOsApiRuntime({ repository });
    const lifecycle = await runtimeWithPersistence.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/lifecycle`,
    });
    const launchReadiness = await runtimeWithPersistence.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/launch-readiness`,
    });
    const exportReadiness = await runtimeWithPersistence.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/export-readiness`,
    });
    const providerReadiness = await runtimeWithPersistence.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/provider-readiness`,
    });
    const health = await runtimeWithPersistence.handle({
      method: "GET",
      path: "/api/health",
    });
    const snapshot = await repository.snapshot();

    expect(expectSuccessData<LocalServiceEnvelope<CampaignLifecyclePayload>>(lifecycle).payload).toMatchObject({
      campaignId: campaignDetail.id,
      currentStatus: "live",
      operations: expect.arrayContaining([
        expect.objectContaining({ id: "publish-campaign" }),
        expect.objectContaining({ id: "export-campaign" }),
      ]),
      summary: {
        totalOperations: expect.any(Number),
      },
      supportedStatuses: expect.arrayContaining(["draft", "live", "paused", "exported"]),
    });
    expect(expectSuccessData<LocalServiceEnvelope<LaunchReadinessPayload>>(launchReadiness).payload).toMatchObject({
      campaignId: campaignDetail.id,
      bundles: expect.arrayContaining([
        expect.objectContaining({ stage: "pre_launch" }),
        expect.objectContaining({ stage: "launch" }),
        expect.objectContaining({ stage: "post_launch" }),
      ]),
      handoffs: expect.any(Array),
      summary: {
        totalBundles: 3,
      },
    });
    expect(expectSuccessData<LocalServiceEnvelope<ExportReadinessPayload>>(exportReadiness).payload).toMatchObject({
      campaignId: campaignDetail.id,
      contractRootReadiness: expect.arrayContaining([
        expect.objectContaining({
          mode: "none",
          readiness: "ready",
          safeDefault: true,
        }),
        expect.objectContaining({
          mode: "contract_claim",
          readiness: "blocked",
          safeDefault: false,
        }),
      ]),
      previewModes: expect.any(Array),
      summary: {
        previewModeCount: expect.any(Number),
      },
    });
    expect(expectSuccessData<LocalServiceEnvelope<ProviderReadinessPayload>>(providerReadiness).payload).toMatchObject({
      campaignId: campaignDetail.id,
      pipeline: {
        paths: expect.any(Array),
        summary: {
          totalPaths: expect.any(Number),
        },
      },
      providerEvidenceRegistry: {
        entries: expect.any(Array),
        summary: {
          totalEntries: expect.any(Number),
        },
      },
    });
    expect(expectSuccessData(health)).toMatchObject({
      persistence: expect.objectContaining({
        recordCount: 0,
        countsByKind: expect.objectContaining({
          export_preview: 0,
        }),
      }),
    });
    expect(snapshot).toMatchObject({
      recordCount: 0,
      countsByKind: expect.objectContaining({
        export_preview: 0,
      }),
    });
    for (const response of [lifecycle, launchReadiness, exportReadiness, providerReadiness]) {
      expectNoForbiddenResponseKeys(response.body);
      expectNoForbiddenFragments(response.body, [
        "fileUrl",
        "mutationId",
        "signedUrl",
        "transactionId",
      ]);
    }
  });

  it("keeps lifecycle and readiness routes fail-closed for unknown campaign ids", async () => {
    const responses = await Promise.all([
      runtime.handle({
        method: "GET",
        path: "/api/campaigns/missing-campaign/lifecycle",
        headers: { "x-campaign-os-trace-id": "trace-missing-lifecycle" },
      }),
      runtime.handle({
        method: "GET",
        path: "/api/campaigns/missing-campaign/launch-readiness",
      }),
      runtime.handle({
        method: "GET",
        path: "/api/campaigns/missing-campaign/export-readiness",
      }),
      runtime.handle({
        method: "GET",
        path: "/api/campaigns/missing-campaign/provider-readiness",
      }),
    ]);

    expect(responses[0]).toMatchObject({
      status: 404,
      body: {
        ok: false,
        traceId: "trace-missing-lifecycle",
        error: {
          code: "INVALID_CAMPAIGN",
          details: {
            campaignId: "missing-campaign",
          },
        },
      },
    });
    for (const response of responses) {
      expect(response.status).toBe(404);
      expect(response.body.ok).toBe(false);
      if (!response.body.ok) {
        expect(response.body.error).toMatchObject({
          code: "INVALID_CAMPAIGN",
          details: {
            campaignId: "missing-campaign",
          },
        });
      }
      expectNoForbiddenResponseKeys(response.body);
    }
  });

  it("calls AI Ops and Agent Skill API routes through deterministic local handlers", async () => {
    const agentWalletAction = await runtime.handle({
      method: "POST",
      path: "/api/agent-wallet/actions/review",
      headers: { "x-campaign-os-trace-id": "trace-agent-wallet-action" },
      body: JSON.stringify({
        actionIntent: "balance_query",
        agentId: "agent_portkey_eoa_001",
        campaignId: campaignDetail.id,
        chainId: "AELF",
        evidencePurpose: "operator_readiness_review",
        humanApprovalState: "pending_review",
        network: "mainnet",
        operatorRole: "internal_operator",
        taskId: "task-bridge",
        walletSource: "AGENT_SKILL",
      }),
    });
    const generatedTasks = await runtime.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/tasks/generate`,
      body: JSON.stringify({
        goal: "Activate Awaken traders",
        product: "Awaken",
        targetUsers: ["AA wallet users", "new traders"],
        walletPolicy: "ANY",
      }),
    });
    const generatedPosts = await runtime.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/posts/generate`,
      body: JSON.stringify({
        channel: "x",
        contentKeys: ["socialPost", "faq"],
        sourceLocale: "en-US",
        targetLocales: ["zh-CN", "zh-TW"],
      }),
    });
    const summary = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/summary?period=daily`,
    });

    expect(agentWalletAction.body.traceId).toBe("trace-agent-wallet-action");
    expect(expectSuccessData<LocalServiceEnvelope<AgentWalletActionPayload>>(agentWalletAction).payload).toMatchObject({
      actionState: "review_required",
      allowedOperation: "readiness_review_only",
      auditTrail: {
        executionAttempted: false,
        sensitiveMaterialHandled: false,
        walletSource: "AGENT_SKILL",
      },
      noContractWrite: true,
      noExportFile: true,
      noPrivateKeyBoundary: true,
      noRewardDistribution: true,
      noSignatureExecution: true,
      noTransactionExecution: true,
    });
    expect(expectSuccessData<LocalServiceEnvelope<GeneratedCampaignTasksPayload>>(generatedTasks).payload).toMatchObject({
      humanReviewRequired: true,
      pointRules: expect.any(Array),
      taskList: expect.any(Array),
      walletCompatibility: expect.any(Array),
    });
    expect(expectSuccessData<LocalServiceEnvelope<CampaignPostsPayload>>(generatedPosts).payload).toMatchObject({
      artifacts: expect.any(Array),
      humanReviewRequired: true,
    });
    expect(expectSuccessData<LocalServiceEnvelope<CampaignSummaryPayload>>(summary).payload).toMatchObject({
      localeMetrics: expect.any(Array),
      period: "daily",
      referralWalletRiskMetrics: expect.any(Array),
      reportCards: expect.any(Array),
      riskSummary: expect.any(Array),
      walletLocaleMetrics: expect.any(Array),
      walletTypeMetrics: expect.any(Array),
    });
  });

  it("routes campaign create, detail, and list through the Campaign DB repository in one runtime", async () => {
    let readinessCallCount = 0;
    const runtimeWithCampaignDbRepository = createCampaignOsApiRuntime({
      backendServiceReadiness: () => {
        readinessCallCount += 1;
        throw new Error("backend readiness should not run on campaign create/read/list");
      },
    });
    const create = await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: "/api/campaigns",
      headers: projectOwnerAuthHeaders("repo-owner-001", {
        "x-campaign-os-trace-id": "trace-campaign-db-create",
      }),
      body: JSON.stringify({
        duration: "2026-08-01/2026-08-14",
        endTime: "2026-08-14T23:59:59Z",
        goal: "Route repository draft",
        ownerAddress: "repo-owner-001",
        projectId: "repo-project",
        rewardDescription: "Repository-backed rewards remain local-review only.",
        startTime: "2026-08-01T00:00:00Z",
      }),
    });
    const created = expectSuccessData<LocalServiceEnvelope<CampaignDraftPayload> & {
      campaignDb: {
        draftId: string;
        storeId: string;
      };
      persistence: {
        kind: string;
        recordId: string;
      };
    }>(create);
    const detail = await runtimeWithCampaignDbRepository.handle({
      method: "GET",
      path: `/api/campaigns/${created.payload.id}`,
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-detail" },
    });
    const list = await runtimeWithCampaignDbRepository.handle({
      method: "GET",
      path: "/api/campaigns?projectId=repo-project&ownerAddress=repo-owner-001&status=draft",
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-list" },
    });

    expect(create.body.traceId).toBe("trace-campaign-db-create");
    expect(created).toMatchObject({
      campaignDb: {
        draftId: "campaign-db-draft-0001",
        storeId: "campaign-db",
      },
      payload: {
        id: "campaign-db-draft-0001",
        projectId: "repo-project",
        publishReadiness: { ready: true },
        status: "draft",
      },
      persistence: {
        kind: "campaign_draft",
        recordId: expect.any(String),
      },
    });
    expect(expectSuccessData<LocalServiceEnvelope<CampaignDetailPayload> & {
      campaignDb: {
        createdViaRepository: boolean;
        storeId: string;
      };
    }>(detail)).toMatchObject({
      campaignDb: {
        createdViaRepository: true,
        storeId: "campaign-db",
      },
      payload: {
        item: {
          id: "campaign-db-draft-0001",
          status: "draft",
        },
      },
    });
    expect(expectSuccessData<LocalServiceEnvelope<CampaignListPayload> & {
      payload: CampaignListPayload & {
        campaignDb: {
          draftCount: number;
        };
      };
    }>(list).payload).toMatchObject({
      campaignDb: {
        draftCount: 1,
      },
      items: expect.arrayContaining([
        expect.objectContaining({
          id: "campaign-db-draft-0001",
          status: "draft",
        }),
      ]),
      summary: {
        totalCampaigns: 1,
      },
    });
    expect(readinessCallCount).toBe(0);
  });

  it("returns limited lifecycle/readiness projections for repository-created drafts", async () => {
    const runtimeWithCampaignDbRepository = createCampaignOsApiRuntime();
    const create = await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: "/api/campaigns",
      headers: projectOwnerAuthHeaders("repo-owner-lifecycle", {
        "x-campaign-os-trace-id": "trace-campaign-db-lifecycle-create",
      }),
      body: JSON.stringify({
        contractMode: "OFF_CHAIN_MVP",
        defaultLocale: "en-US",
        duration: "2026-08-01/2026-08-14",
        endTime: "2026-08-14T23:59:59Z",
        goal: "Inspect repository draft lifecycle",
        ownerAddress: "repo-owner-lifecycle",
        projectId: "repo-project-lifecycle",
        rewardDescription: "Repository-backed lifecycle remains limited.",
        startTime: "2026-08-01T00:00:00Z",
        supportedLocales: ["en-US", "zh-CN"],
        walletPolicy: "AA_ONLY",
      }),
    });
    const created = expectSuccessData<LocalServiceEnvelope<CampaignDraftPayload>>(create);
    const lifecycle = await runtimeWithCampaignDbRepository.handle({
      method: "GET",
      path: `/api/campaigns/${created.payload.id}/lifecycle`,
    });
    const launchReadiness = await runtimeWithCampaignDbRepository.handle({
      method: "GET",
      path: `/api/campaigns/${created.payload.id}/launch-readiness`,
    });
    const exportReadiness = await runtimeWithCampaignDbRepository.handle({
      method: "GET",
      path: `/api/campaigns/${created.payload.id}/export-readiness`,
    });
    const providerReadiness = await runtimeWithCampaignDbRepository.handle({
      method: "GET",
      path: `/api/campaigns/${created.payload.id}/provider-readiness`,
    });

    for (const response of [lifecycle, launchReadiness, exportReadiness, providerReadiness]) {
      expect(expectSuccessData<LocalServiceEnvelope<CampaignDbLimitedLifecyclePayload> & {
        campaignDb: {
          createdViaRepository: true;
          storeId: string;
        };
      }>(response)).toMatchObject({
        campaignDb: {
          createdViaRepository: true,
          storeId: "campaign-db",
        },
        payload: {
          campaignId: "campaign-db-draft-0001",
          code: "CAMPAIGN_DB_DRAFT_LIFECYCLE_LIMITED",
          diagnostic: {
            code: "CAMPAIGN_DB_DRAFT_LIFECYCLE_LIMITED",
            fullSeededLifecycleAvailable: false,
          },
          fullSeededLifecycleAvailable: false,
          publishReadiness: { ready: true },
          source: "campaign_db_draft",
          status: "draft",
          supportedLocales: ["en-US", "zh-CN"],
          walletPolicy: "AA_ONLY",
        },
      });
      expectNoForbiddenResponseKeys(response.body);
      expectNoForbiddenFragments(response.body, ["fileUrl", "mutationId", "signedUrl", "transactionId"]);
    }
  });

  it("persists repository-created campaign task drafts in Campaign DB projections", async () => {
    const runtimeWithCampaignDbRepository = createCampaignOsApiRuntime();
    const create = await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: "/api/campaigns",
      headers: projectOwnerAuthHeaders("repo-owner-task", {
        "x-campaign-os-trace-id": "trace-campaign-db-task-create",
      }),
      body: JSON.stringify({
        duration: "2026-08-01/2026-08-14",
        endTime: "2026-08-14T23:59:59Z",
        goal: "Persist repository task draft",
        ownerAddress: "repo-owner-task",
        projectId: "repo-project-task",
        rewardDescription: "Repository-backed task rewards remain local-review only.",
        startTime: "2026-08-01T00:00:00Z",
      }),
    });
    const created = expectSuccessData<LocalServiceEnvelope<CampaignDraftPayload>>(create);
    const taskDraft = await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: `/api/campaigns/${created.payload.id}/tasks`,
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-task-add" },
      body: JSON.stringify({
        evidenceRule: { source: "AELFSCAN", minAmount: 1 },
        points: 120,
        required: true,
        templateCode: "bridge_ebridge",
        verificationType: "ON_CHAIN",
        walletCompatibility: "ANY",
      }),
    });
    const detail = await runtimeWithCampaignDbRepository.handle({
      method: "GET",
      path: `/api/campaigns/${created.payload.id}`,
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-task-detail" },
    });
    const list = await runtimeWithCampaignDbRepository.handle({
      method: "GET",
      path: "/api/campaigns?projectId=repo-project-task&ownerAddress=repo-owner-task&status=draft",
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-task-list" },
    });

    expect(expectSuccessData<LocalServiceEnvelope<TaskDraftPayload> & {
      campaignDbTask: {
        createdViaRepository: boolean;
        storeId: string;
        taskId: string;
      };
      persistence: {
        kind: string;
        recordId: string;
      };
    }>(taskDraft)).toMatchObject({
      campaignDbTask: {
        createdViaRepository: true,
        storeId: "campaign-db",
        taskId: "campaign-db-task-draft-0001",
      },
      payload: {
        campaignId: "campaign-db-draft-0001",
        id: "local-task-bridge_ebridge",
        points: 120,
        required: true,
        templateCode: "bridge_ebridge",
        verificationType: "ON_CHAIN",
        walletCompatibility: "ANY",
      },
      persistence: {
        kind: "task_draft",
        recordId: expect.any(String),
      },
    });
    expect(expectSuccessData<LocalServiceEnvelope<CampaignDetailPayload>>(detail).payload).toMatchObject({
      item: {
        id: "campaign-db-draft-0001",
        coreTasks: [
          expect.objectContaining({
            points: 120,
            required: true,
            taskId: "campaign-db-task-draft-0001",
            verificationType: "ON_CHAIN",
          }),
        ],
      },
      tasks: [
        expect.objectContaining({
          points: 120,
          required: true,
          taskId: "campaign-db-task-draft-0001",
          verificationType: "ON_CHAIN",
        }),
      ],
    });
    expect(expectSuccessData<LocalServiceEnvelope<CampaignListPayload> & {
      payload: CampaignListPayload & {
        campaignDb: {
          draftCount: number;
          taskDraftCount: number;
        };
      };
    }>(list).payload).toMatchObject({
      campaignDb: {
        draftCount: 1,
        taskDraftCount: 1,
      },
      items: [
        expect.objectContaining({
          coreTasks: [
            expect.objectContaining({
              taskId: "campaign-db-task-draft-0001",
            }),
          ],
          id: "campaign-db-draft-0001",
        }),
      ],
    });
    expectNoForbiddenResponseKeys(taskDraft.body);
  });

  it("persists repository task completion and projects eligibility through API runtime", async () => {
    const runtimeWithCampaignDbRepository = createCampaignOsApiRuntime();
    const create = await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: "/api/campaigns",
      headers: projectOwnerAuthHeaders("repo-owner-completion", {
        "x-campaign-os-trace-id": "trace-campaign-db-completion-create",
      }),
      body: JSON.stringify({
        duration: "2026-08-01/2026-08-14",
        endTime: "2026-08-14T23:59:59Z",
        goal: "Persist repository completion",
        ownerAddress: "repo-owner-completion",
        projectId: "repo-project-completion",
        rewardDescription: "Repository-backed completion rewards remain local-review only.",
        startTime: "2026-08-01T00:00:00Z",
      }),
    });
    const created = expectSuccessData<LocalServiceEnvelope<CampaignDraftPayload>>(create);
    const requiredTask = await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: `/api/campaigns/${created.payload.id}/tasks`,
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-completion-required-task" },
      body: JSON.stringify({
        evidenceRule: { source: "AELFSCAN", minAmount: 1 },
        points: 120,
        required: true,
        templateCode: "bridge_ebridge",
        verificationType: "ON_CHAIN",
        walletCompatibility: "ANY",
      }),
    });
    const optionalTask = await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: `/api/campaigns/${created.payload.id}/tasks`,
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-completion-optional-task" },
      body: JSON.stringify({
        evidenceRule: { action: "share" },
        points: 50,
        required: false,
        templateCode: "share_campaign",
        verificationType: "SOCIAL",
        walletCompatibility: "ANY",
      }),
    });
    const requiredTaskPayload = expectSuccessData<LocalServiceEnvelope<TaskDraftPayload> & {
      campaignDbTask: { taskId: string };
    }>(requiredTask);
    const optionalTaskPayload = expectSuccessData<LocalServiceEnvelope<TaskDraftPayload> & {
      campaignDbTask: { taskId: string };
    }>(optionalTask);
    const missingEligibility = await runtimeWithCampaignDbRepository.handle({
      method: "GET",
      path: `/api/campaigns/${created.payload.id}/eligibility?address=${encodeURIComponent("2F4CompletionWallet")}&accountType=EOA&walletSource=PORTKEY_EOA_EXTENSION`,
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-completion-missing-eligibility" },
    });
    const optionalVerification = await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: `/api/tasks/${optionalTaskPayload.campaignDbTask.taskId}/verify`,
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-completion-optional-verify" },
      body: JSON.stringify({
        accountType: "EOA",
        campaignId: created.payload.id,
        walletAddress: "2F4CompletionWallet",
        walletSource: "PORTKEY_EOA_EXTENSION",
      }),
    });
    const optionalEligibility = await runtimeWithCampaignDbRepository.handle({
      method: "GET",
      path: `/api/campaigns/${created.payload.id}/eligibility?address=${encodeURIComponent("2F4CompletionWallet")}&accountType=EOA&walletSource=PORTKEY_EOA_EXTENSION`,
    });
    const requiredVerification = await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: `/api/tasks/${requiredTaskPayload.campaignDbTask.taskId}/verify`,
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-completion-required-verify" },
      body: JSON.stringify({
        accountType: "EOA",
        campaignId: created.payload.id,
        walletAddress: "2F4CompletionWallet",
        walletSource: "PORTKEY_EOA_EXTENSION",
      }),
    });
    const eligible = await runtimeWithCampaignDbRepository.handle({
      method: "GET",
      path: `/api/campaigns/${created.payload.id}/eligibility?address=${encodeURIComponent("2F4CompletionWallet")}&accountType=EOA&walletSource=PORTKEY_EOA_EXTENSION`,
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-completion-eligible" },
    });

    expect(expectSuccessData<LocalServiceEnvelope<EligibilityPayload>>(missingEligibility).payload).toMatchObject({
      accountType: "EOA",
      eligible: false,
      missingTasks: ["bridge_ebridge"],
      score: 0,
      status: "not_eligible",
      walletAddress: "2F4CompletionWallet",
      walletSource: "PORTKEY_EOA_EXTENSION",
      walletTypeVerified: true,
    });
    expect(expectSuccessData<LocalServiceEnvelope<VerificationPayload> & {
      campaignDbCompletion: { completionId: string; storeId: string };
      persistence: { kind: string };
    }>(optionalVerification)).toMatchObject({
      campaignDbCompletion: {
        completionId: "campaign-db-task-completion-0001",
        storeId: "campaign-db",
      },
      payload: {
        accountType: "EOA",
        campaignId: created.payload.id,
        evidenceSource: "SOCIAL_API",
        pointsAwarded: 50,
        pointsAvailable: 50,
        status: "completed",
        taskId: optionalTaskPayload.campaignDbTask.taskId,
        walletAddress: "2F4CompletionWallet",
        walletSource: "PORTKEY_EOA_EXTENSION",
      },
      persistence: { kind: "verification_attempt" },
    });
    expect(expectSuccessData<LocalServiceEnvelope<EligibilityPayload>>(optionalEligibility).payload).toMatchObject({
      eligible: false,
      missingTasks: ["bridge_ebridge"],
      score: 50,
      status: "not_eligible",
    });
    expect(expectSuccessData<LocalServiceEnvelope<VerificationPayload> & {
      campaignDbCompletion: { completionId: string };
    }>(requiredVerification)).toMatchObject({
      campaignDbCompletion: {
        completionId: "campaign-db-task-completion-0002",
      },
      payload: {
        evidenceSource: "AELFSCAN",
        pointsAwarded: 120,
        pointsAvailable: 120,
        status: "completed",
      },
    });
    expect(expectSuccessData<LocalServiceEnvelope<EligibilityPayload>>(eligible).payload).toMatchObject({
      eligible: true,
      missingTasks: [],
      score: 170,
      status: "eligible",
    });
    expectNoForbiddenResponseKeys(optionalVerification.body);
    expectNoForbiddenFragments(optionalVerification.body, ["raw-secret", "privateKey", "signedUrl"]);
  });

  it("returns structured errors for unknown repository task verification", async () => {
    const runtimeWithCampaignDbRepository = createCampaignOsApiRuntime();
    const create = await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: "/api/campaigns",
      headers: projectOwnerAuthHeaders("repo-owner-missing-task"),
      body: JSON.stringify({
        duration: "2026-08-01/2026-08-14",
        endTime: "2026-08-14T23:59:59Z",
        goal: "Reject missing repository task",
        ownerAddress: "repo-owner-missing-task",
        projectId: "repo-project-missing-task",
        rewardDescription: "Repository-backed task verification remains bounded.",
        startTime: "2026-08-01T00:00:00Z",
      }),
    });
    const created = expectSuccessData<LocalServiceEnvelope<CampaignDraftPayload>>(create);
    const missingTask = await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: "/api/tasks/missing-repository-task/verify",
      body: JSON.stringify({
        accountType: "EOA",
        campaignId: created.payload.id,
        walletAddress: "2F4CompletionWallet",
        walletSource: "PORTKEY_EOA_EXTENSION",
      }),
    });

    expect(missingTask.status).toBe(404);
    expect(missingTask.body.ok).toBe(false);
    if (!missingTask.body.ok) {
      expect(missingTask.body.error).toMatchObject({
        code: "INVALID_TASK",
        details: { taskId: "missing-repository-task" },
      });
    }
  });

  it("persists campaign draft API records across durable Campaign DB runtime recreation", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "campaign-os-campaign-db-"));

    try {
      const durableStoreFilePath = join(tempDir, "campaign-drafts.json");
      const firstRuntime = createCampaignOsApiRuntime({
        campaignDbRepositoryOptions: {
          durableStoreFilePath,
          mode: "durable_test",
        },
      });
      const create = await firstRuntime.handle({
        method: "POST",
        path: "/api/campaigns",
        headers: projectOwnerAuthHeaders("repo-owner-durable", {
          "x-campaign-os-trace-id": "trace-durable-campaign-create",
        }),
        body: JSON.stringify({
          contractMode: "OFF_CHAIN_MVP",
          defaultLocale: "en-US",
          duration: "2026-08-01/2026-08-14",
          endTime: "2026-08-14T23:59:59Z",
          goal: "Persist durable repository draft",
          ownerAddress: "repo-owner-durable",
          projectId: "repo-project-durable",
          rewardDescription: "Repository-backed rewards remain local-review only.",
          startTime: "2026-08-01T00:00:00Z",
          supportedLocales: ["en-US", "zh-CN", "zh-TW"],
          walletPolicy: "ANY",
        }),
      });
      const created = expectSuccessData<LocalServiceEnvelope<CampaignDraftPayload> & {
        campaignDb: {
          draftId: string;
          storeId: string;
        };
      }>(create);
      const secondRuntime = createCampaignOsApiRuntime({
        campaignDbRepositoryOptions: {
          durableStoreFilePath,
          mode: "durable_test",
        },
      });
      const detail = await secondRuntime.handle({
        method: "GET",
        path: `/api/campaigns/${created.payload.id}`,
        headers: { "x-campaign-os-trace-id": "trace-durable-campaign-detail" },
      });
      const list = await secondRuntime.handle({
        method: "GET",
        path: "/api/campaigns?projectId=repo-project-durable&ownerAddress=repo-owner-durable&status=draft",
        headers: { "x-campaign-os-trace-id": "trace-durable-campaign-list" },
      });

      expect(create.body.traceId).toBe("trace-durable-campaign-create");
      expect(created.campaignDb).toMatchObject({
        draftId: "campaign-db-draft-0001",
        storeId: "campaign-db",
      });
      expect(expectSuccessData<LocalServiceEnvelope<CampaignDetailPayload> & {
        campaignDb: {
          adapterId: string;
          createdViaRepository: boolean;
        };
      }>(detail)).toMatchObject({
        campaignDb: {
          adapterId: "campaign-db-durable-test-adapter",
          createdViaRepository: true,
        },
        payload: {
          item: {
            id: "campaign-db-draft-0001",
            status: "draft",
          },
        },
      });
      expect(expectSuccessData<LocalServiceEnvelope<CampaignListPayload> & {
        payload: CampaignListPayload & {
          campaignDb: {
            draftCount: number;
          };
        };
      }>(list).payload).toMatchObject({
        campaignDb: {
          draftCount: 1,
        },
        items: expect.arrayContaining([
          expect.objectContaining({
            id: "campaign-db-draft-0001",
            status: "draft",
          }),
        ]),
        summary: {
          totalCampaigns: 1,
        },
      });
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
  });

  it("rejects invalid durable campaign drafts without partial persistence", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "campaign-os-campaign-db-invalid-"));

    try {
      const durableStoreFilePath = join(tempDir, "campaign-drafts.json");
      const runtime = createCampaignOsApiRuntime({
        campaignDbRepositoryOptions: {
          durableStoreFilePath,
          mode: "durable_test",
        },
      });
      const invalid = await runtime.handle({
        method: "POST",
        path: "/api/campaigns",
        headers: projectOwnerAuthHeaders("repo-owner-invalid", {
          "x-campaign-os-trace-id": "trace-durable-campaign-invalid",
        }),
        body: JSON.stringify({
          contractMode: "OFF_CHAIN_MVP",
          defaultLocale: "en-US",
          duration: "2026-08-01/2026-08-14",
          endTime: "2026-08-14T23:59:59Z",
          goal: "Reject missing en-US supported locale",
          ownerAddress: "repo-owner-invalid",
          projectId: "repo-project-invalid",
          rewardDescription: "Repository-backed rewards remain local-review only.",
          startTime: "2026-08-01T00:00:00Z",
          supportedLocales: ["zh-CN"],
          walletPolicy: "ANY",
        }),
      });
      const list = await runtime.handle({
        method: "GET",
        path: "/api/campaigns?projectId=repo-project-invalid",
        headers: { "x-campaign-os-trace-id": "trace-durable-campaign-invalid-list" },
      });

      expect(invalid).toMatchObject({
        status: 400,
        body: {
          ok: false,
          traceId: "trace-durable-campaign-invalid",
          error: {
            code: "INVALID_REQUEST",
            details: {
              field: "supportedLocales",
            },
          },
        },
      });
      expect(expectSuccessData<LocalServiceEnvelope<CampaignListPayload> & {
        payload: CampaignListPayload & {
          campaignDb: {
            draftCount: number;
          };
        };
      }>(list).payload).toMatchObject({
        campaignDb: {
          draftCount: 0,
        },
        summary: {
          totalCampaigns: 3,
        },
      });
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
  });

  it("requires local project owner auth before campaign draft mutation", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "campaign-os-campaign-auth-"));

    try {
      const durableStoreFilePath = join(tempDir, "campaign-drafts.json");
      const runtime = createCampaignOsApiRuntime({
        campaignDbRepositoryOptions: {
          durableStoreFilePath,
          mode: "durable_test",
        },
      });
      const createBody = {
        contractMode: "OFF_CHAIN_MVP",
        defaultLocale: "en-US",
        duration: "2026-08-01/2026-08-14",
        endTime: "2026-08-14T23:59:59Z",
        goal: "Require project owner auth",
        ownerAddress: "auth-owner-001",
        projectId: "auth-project",
        rewardDescription: "Repository-backed rewards remain local-review only.",
        startTime: "2026-08-01T00:00:00Z",
        supportedLocales: ["en-US"],
        walletPolicy: "ANY",
      };
      const missing = await runtime.handle({
        method: "POST",
        path: "/api/campaigns",
        headers: {
          authorization: "Bearer raw-secret-token",
          "x-campaign-os-trace-id": "trace-auth-missing",
        },
        body: JSON.stringify(createBody),
      });
      const participant = await runtime.handle({
        method: "POST",
        path: "/api/campaigns",
        headers: projectOwnerAuthHeaders("auth-owner-001", {
          "x-campaign-os-roles": "participant",
          "x-campaign-os-trace-id": "trace-auth-participant",
        }),
        body: JSON.stringify(createBody),
      });
      const ownerMismatch = await runtime.handle({
        method: "POST",
        path: "/api/campaigns",
        headers: projectOwnerAuthHeaders("auth-owner-other", {
          "x-campaign-os-trace-id": "trace-auth-owner-mismatch",
        }),
        body: JSON.stringify(createBody),
      });
      const malformed = await runtime.handle({
        method: "POST",
        path: "/api/campaigns",
        headers: projectOwnerAuthHeaders("auth-owner-001", {
          "x-campaign-os-roles": "project_owner,unsupported_role",
          "x-campaign-os-trace-id": "trace-auth-malformed",
        }),
        body: JSON.stringify(createBody),
      });
      const reviewOperator = await runtime.handle({
        method: "POST",
        path: "/api/campaigns",
        headers: projectOwnerAuthHeaders("auth-owner-001", {
          "x-campaign-os-roles": "review_operator",
          "x-campaign-os-trace-id": "trace-auth-review-operator",
        }),
        body: JSON.stringify(createBody),
      });
      const aiWorker = await runtime.handle({
        method: "POST",
        path: "/api/campaigns",
        headers: projectOwnerAuthHeaders("auth-owner-001", {
          "x-campaign-os-credential-boundary": "internal_agent_credential",
          "x-campaign-os-proof-status": "local_seeded",
          "x-campaign-os-roles": "ai_worker",
          "x-campaign-os-trace-id": "trace-auth-ai-worker",
          "x-campaign-os-wallet-source": "AGENT_SKILL",
        }),
        body: JSON.stringify(createBody),
      });
      const listAfterFailures = await runtime.handle({
        method: "GET",
        path: "/api/campaigns?projectId=auth-project",
        headers: { "x-campaign-os-trace-id": "trace-auth-list-after-failures" },
      });
      const authorized = await runtime.handle({
        method: "POST",
        path: "/api/campaigns",
        headers: projectOwnerAuthHeaders("auth-owner-001", {
          "x-campaign-os-trace-id": "trace-auth-authorized",
        }),
        body: JSON.stringify(createBody),
      });

      expect(missing).toMatchObject({
        status: 401,
        body: {
          ok: false,
          traceId: "trace-auth-missing",
          error: {
            code: "AUTH_SESSION_REQUIRED",
            details: {
              diagnosticCode: "AUTH_SESSION_REQUIRED",
              routeId: "campaigns.create",
            },
          },
        },
      });
      expect(malformed).toMatchObject({
        status: 401,
        body: {
          ok: false,
          traceId: "trace-auth-malformed",
          error: {
            code: "AUTH_SESSION_INVALID",
            details: {
              diagnosticCode: "AUTH_SESSION_INVALID",
              routeId: "campaigns.create",
            },
          },
        },
      });
      expect(participant).toMatchObject({
        status: 403,
        body: {
          ok: false,
          traceId: "trace-auth-participant",
          error: {
            code: "AUTH_FORBIDDEN",
            details: {
              diagnosticCode: "AUTH_ROLE_FORBIDDEN",
              routeId: "campaigns.create",
            },
          },
        },
      });
      expect(reviewOperator).toMatchObject({
        status: 403,
        body: {
          ok: false,
          traceId: "trace-auth-review-operator",
          error: {
            code: "AUTH_FORBIDDEN",
            details: {
              diagnosticCode: "AUTH_ROLE_FORBIDDEN",
              routeId: "campaigns.create",
            },
          },
        },
      });
      expect(aiWorker).toMatchObject({
        status: 403,
        body: {
          ok: false,
          traceId: "trace-auth-ai-worker",
          error: {
            code: "AUTH_FORBIDDEN",
            details: {
              diagnosticCode: "AUTH_AGENT_CREDENTIAL_FORBIDDEN",
              routeId: "campaigns.create",
            },
          },
        },
      });
      expect(ownerMismatch).toMatchObject({
        status: 403,
        body: {
          ok: false,
          traceId: "trace-auth-owner-mismatch",
          error: {
            code: "AUTH_FORBIDDEN",
            details: {
              diagnosticCode: "AUTH_OWNER_MISMATCH",
              routeId: "campaigns.create",
            },
          },
        },
      });
      expect(expectSuccessData<LocalServiceEnvelope<CampaignListPayload> & {
        payload: CampaignListPayload & {
          campaignDb: {
            draftCount: number;
          };
        };
      }>(listAfterFailures).payload).toMatchObject({
        campaignDb: {
          draftCount: 0,
        },
      });
      expect(expectSuccessData<LocalServiceEnvelope<CampaignDraftPayload>>(authorized).payload).toMatchObject({
        id: "campaign-db-draft-0001",
        projectId: "auth-project",
      });

      for (const response of [missing, malformed, participant, reviewOperator, aiWorker, ownerMismatch]) {
        expectNoForbiddenResponseKeys(response.body);
        expect(JSON.stringify(response.body).toLowerCase()).not.toContain("raw-secret-token");
      }
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
  });

  it("calls seeded POST endpoints with sanitized local persistence records", async () => {
    const repository = createCampaignOsMemoryRepository();
    const runtimeWithPersistence = createCampaignOsApiRuntime({ repository });
    const walletSession = await runtime.handle({
      method: "POST",
      path: "/api/wallet/session",
      body: JSON.stringify({
        adapterName: "PortkeyDiscoverWallet",
        fixtureId: "sess-eoa-app-001",
        nonce: "nonce-route-proof",
        proofEvaluatedAt: "2026-07-07T04:00:00.000Z",
        proofIssuedAt: "2026-07-07T03:59:00.000Z",
        signature: "raw-route-signature",
      }),
    });
    const persistedWalletSession = await runtimeWithPersistence.handle({
      method: "POST",
      path: "/api/wallet/session",
      body: JSON.stringify({
        adapterName: "PortkeyDiscoverWallet",
        fixtureId: "sess-eoa-app-001",
        nonce: "nonce-persisted-proof",
        proofEvaluatedAt: "2026-07-07T04:00:00.000Z",
        proofIssuedAt: "2026-07-07T03:59:00.000Z",
        signature: "should-not-persist",
      }),
    });
    const campaignDraft = await runtimeWithPersistence.handle({
      method: "POST",
      path: "/api/campaigns",
      headers: projectOwnerAuthHeaders("2F4...9aB"),
      body: JSON.stringify({
        duration: "2026-07-01/2026-07-14",
        endTime: "2026-07-14T23:59:59Z",
        goal: "Activate Awaken traders",
        ownerAddress: "2F4...9aB",
        projectId: "awaken",
        rewardDescription: "Rewards remain project owned.",
        signaturePayload: "should-not-persist",
        startTime: "2026-07-01T00:00:00Z",
      }),
    });
    const taskDraft = await runtimeWithPersistence.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/tasks`,
      body: JSON.stringify({
        evidenceRule: { source: "AELFSCAN", minAmount: 1 },
        points: 120,
        required: true,
        templateCode: "bridge_ebridge",
        verificationType: "ON_CHAIN",
        walletCompatibility: "ANY",
      }),
    });
    const verification = await runtimeWithPersistence.handle({
      method: "POST",
      path: "/api/tasks/task-bridge/verify",
      body: JSON.stringify({
        accountType: "AA",
        campaignId: campaignDetail.id,
        walletAddress: "2F4...9aB",
        walletSource: "PORTKEY_AA",
      }),
    });
    const i18nDraft = await runtimeWithPersistence.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/i18n/generate`,
      body: JSON.stringify({
        contentKeys: ["title", "description"],
        sourceLocale: "en-US",
        targetLocale: "zh-CN",
      }),
    });
    const exportPreview = await runtimeWithPersistence.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/export`,
      body: JSON.stringify({
        contractRootMode: "none",
        format: "json",
        includeLocalePreference: true,
        includeRiskFlags: true,
        includeWalletType: true,
      }),
    });
    const health = await runtimeWithPersistence.handle({
      method: "GET",
      path: "/api/health",
    });
    const snapshot = await repository.snapshot();

    expect(expectSuccessData<LocalServiceEnvelope<WalletSessionPayload>>(walletSession).payload).toMatchObject({
      issuer: {
        cookieIssued: false,
        issuerMode: "local_opaque",
        jwtIssued: false,
        liveSigningExecuted: false,
      },
      productionReadiness: {
        blockedDependencyIds: expect.arrayContaining([
          "live_wallet_proof_verifier",
          "session_signing_key",
          "secret_manager",
          "production_session_store",
        ]),
        productionReady: false,
      },
      proof: {
        diagnosticCodes: expect.arrayContaining(["AUTH_PROOF_SENSITIVE_INPUT_REDACTED"]),
        liveVerificationExecuted: false,
        status: "verified",
        trustLevel: "verified_local",
      },
      sessionId: "sess-eoa-app-001",
      walletSource: "PORTKEY_EOA_APP",
    });
    expect(expectSuccessData<LocalServiceEnvelope<WalletSessionPayload> & { persistence: unknown }>(
      persistedWalletSession,
    )).toMatchObject({
      payload: {
        issuer: expect.objectContaining({
          issuerMode: "local_opaque",
          liveSigningExecuted: false,
        }),
        proof: expect.objectContaining({
          liveVerificationExecuted: false,
          status: "verified",
          trustLevel: "verified_local",
        }),
        sessionId: "sess-eoa-app-001",
        walletSource: "PORTKEY_EOA_APP",
      },
      persistence: {
        kind: "wallet_session",
        recordId: expect.any(String),
      },
    });
    expect(expectSuccessData<LocalServiceEnvelope<CampaignDraftPayload>>(campaignDraft).payload).toMatchObject({
      id: "campaign-db-draft-0001",
      publishReadiness: { ready: true },
    });
    expect(expectSuccessData<LocalServiceEnvelope<TaskDraftPayload>>(taskDraft).payload).toMatchObject({
      campaignId: campaignDetail.id,
      id: "local-task-bridge_ebridge",
    });
    expect(expectSuccessData<LocalServiceEnvelope<VerificationPayload>>(verification).payload).toMatchObject({
      evidenceSource: "aelfscan",
      pointsAwarded: 120,
      status: "completed",
    });
    expect(expectSuccessData<LocalServiceEnvelope<I18nDraftPayload>>(i18nDraft).payload).toMatchObject({
      humanReviewRequired: true,
      sourceLocale: "en-US",
      targetLocale: "zh-CN",
    });
    expect(expectSuccessData<LocalServiceEnvelope<ExportPreviewPayload>>(exportPreview).payload).toMatchObject({
      campaignId: campaignDetail.id,
      contractRootMode: "none",
      format: "json",
      readyRows: expect.any(Number),
    });
    expect(expectSuccessData(health)).toMatchObject({
      persistence: expect.objectContaining({
        recordCount: 6,
        countsByKind: expect.objectContaining({
          campaign_draft: 1,
          export_preview: 1,
          i18n_draft: 1,
          task_draft: 1,
          verification_attempt: 1,
          wallet_session: 1,
        }),
      }),
    });
    expect(snapshot.recordCount).toBe(6);
    expect(snapshot.latestRecords.map((record) => record.kind)).toEqual(
      expect.arrayContaining([
        "wallet_session",
        "campaign_draft",
        "task_draft",
        "verification_attempt",
        "i18n_draft",
        "export_preview",
      ]),
    );
    expectNoForbiddenResponseKeys(snapshot);
    expectNoForbiddenFragments(walletSession.body, ["nonce-route-proof", "raw-route-signature"]);
    expectNoForbiddenFragments(snapshot, ["nonce-persisted-proof", "should-not-persist"]);
    expect(snapshot.latestRecords.find((record) => record.kind === "wallet_session")).toMatchObject({
      summary: {
        issuerMode: "local_opaque",
        liveSigningExecuted: false,
        liveVerificationExecuted: false,
        productionReady: false,
        proofStatus: "verified",
        proofTrustLevel: "verified_local",
      },
    });
  });

  it("persists write route records across local JSON runtime recreation", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "campaign-os-runtime-json-"));

    try {
      const config = {
        adapterLabel: "local_json:runtime-test",
        localDataDir: tempDir,
        mode: "local_json" as const,
      };
      const firstRepository = createCampaignOsJsonRepository(config);
      const firstRuntime = createCampaignOsApiRuntime({ repository: firstRepository });

      await firstRuntime.handle({
        method: "POST",
        path: "/api/wallet/session",
        body: JSON.stringify({
          adapterName: "PortkeyDiscoverWallet",
          fixtureId: "sess-eoa-app-001",
        }),
      });

      const secondRepository = createCampaignOsJsonRepository(config);
      await secondRepository.initialize();
      const snapshot = await secondRepository.snapshot();

      expect(snapshot).toMatchObject({
        mode: "local_json",
        recordCount: 1,
        countsByKind: {
          wallet_session: 1,
        },
      });
      expect(snapshot.latestRecords[0]).toMatchObject({
        kind: "wallet_session",
        walletAddress: "8A2...1eF",
        walletSource: "PORTKEY_EOA_APP",
      });
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
  });

  it("fails closed for missing or stale wallet proof route metadata", async () => {
    const missingSignature = await runtime.handle({
      method: "POST",
      path: "/api/wallet/session",
      body: JSON.stringify({
        address: "2F4...9aB",
        adapterName: "PortkeyDiscoverWallet",
        chainId: "AELF",
        network: "mainnet",
        nonce: "nonce-missing-signature",
        proofEvaluatedAt: "2026-07-07T04:00:00.000Z",
        proofIssuedAt: "2026-07-07T03:59:00.000Z",
      }),
    });
    const staleProof = await runtime.handle({
      method: "POST",
      path: "/api/wallet/session",
      body: JSON.stringify({
        address: "2F4...9aB",
        adapterName: "PortkeyDiscoverWallet",
        chainId: "AELF",
        network: "mainnet",
        nonce: "nonce-stale-proof",
        proofEvaluatedAt: "2026-07-07T04:00:00.000Z",
        proofIssuedAt: "2026-07-07T03:50:00.000Z",
        signature: "raw-stale-signature",
      }),
    });

    expect(expectSuccessData<LocalServiceEnvelope<WalletSessionPayload>>(missingSignature).payload).toMatchObject({
      issuer: expect.objectContaining({
        issuerMode: "local_opaque",
        valid: true,
      }),
      proof: {
        diagnosticCodes: expect.arrayContaining(["AUTH_PROOF_SIGNATURE_MISSING"]),
        liveVerificationExecuted: false,
        status: "signature_unverified",
        trustLevel: "untrusted",
      },
      signatureStatus: "missing",
      verificationStatus: "missing_signature",
      walletTypeVerified: false,
    });
    expect(expectSuccessData<LocalServiceEnvelope<WalletSessionPayload>>(staleProof).payload).toMatchObject({
      issuer: expect.objectContaining({
        issuerMode: "local_opaque",
      }),
      proof: {
        diagnosticCodes: expect.arrayContaining(["AUTH_PROOF_STALE"]),
        liveVerificationExecuted: false,
        status: "stale",
        trustLevel: "untrusted",
      },
    });
    expectNoForbiddenFragments(missingSignature.body, ["nonce-missing-signature"]);
    expectNoForbiddenFragments(staleProof.body, ["nonce-stale-proof", "raw-stale-signature"]);
  });

  it("keeps address-only and unsupported wallet proof metadata fail-closed", async () => {
    const addressOnly = await runtime.handle({
      method: "POST",
      path: "/api/wallet/session",
      body: JSON.stringify({
        fixtureId: "sess-unknown-001",
      }),
    });
    const unsupported = await runtime.handle({
      method: "POST",
      path: "/api/wallet/session",
      body: JSON.stringify({
        address: "2F4...9aB",
        adapterName: "UnsupportedWallet",
        chainId: "AELF",
        network: "mainnet",
        nonce: "nonce-unsupported-wallet",
        proofEvaluatedAt: "2026-07-07T04:00:00.000Z",
        proofIssuedAt: "2026-07-07T03:59:00.000Z",
        signature: "raw-unsupported-signature",
      }),
    });

    expect(expectSuccessData<LocalServiceEnvelope<WalletSessionPayload>>(addressOnly).payload).toMatchObject({
      proof: {
        diagnosticCodes: expect.arrayContaining(["AUTH_PROOF_ADDRESS_ONLY"]),
        liveVerificationExecuted: false,
        status: "proof_required",
        trustLevel: "untrusted",
      },
      verificationStatus: "address_only",
      walletTypeVerified: false,
    });
    expect(expectSuccessData<LocalServiceEnvelope<WalletSessionPayload>>(unsupported).payload).toMatchObject({
      proof: {
        diagnosticCodes: expect.arrayContaining(["AUTH_PROOF_CHAIN_UNSUPPORTED"]),
        liveVerificationExecuted: false,
        status: "blocked",
        trustLevel: "blocked",
      },
      verificationStatus: "unsupported_wallet",
      walletTypeVerified: false,
    });
    expectNoForbiddenFragments(unsupported.body, ["nonce-unsupported-wallet", "raw-unsupported-signature"]);
  });

  it("initializes the repository once before runtime health and write operations", async () => {
    const tracked = createInitializationTrackingRepository();
    const runtimeWithTrackedRepository = createCampaignOsApiRuntime({
      repository: tracked.repository,
    });

    await runtimeWithTrackedRepository.handle({
      method: "GET",
      path: "/api/health",
    });
    await runtimeWithTrackedRepository.handle({
      method: "POST",
      path: "/api/wallet/session",
      body: JSON.stringify({
        adapterName: "PortkeyDiscoverWallet",
        fixtureId: "sess-eoa-app-001",
      }),
    });

    expect(tracked.getInitializeCount()).toBe(1);
  });

  it("fails closed when persistence is unavailable for health or write routes", async () => {
    const failingRuntime = createCampaignOsApiRuntime({
      repository: createFailingRepository(),
    });
    const health = await failingRuntime.handle({
      method: "GET",
      path: "/api/health",
      headers: { "x-campaign-os-trace-id": "trace-persistence-health" },
    });
    const walletSession = await failingRuntime.handle({
      method: "POST",
      path: "/api/wallet/session",
      headers: { "x-campaign-os-trace-id": "trace-persistence-write" },
      body: JSON.stringify({
        adapterName: "PortkeyDiscoverWallet",
        fixtureId: "sess-eoa-app-001",
      }),
    });

    expect(health).toMatchObject({
      status: 503,
      body: {
        ok: false,
        traceId: "trace-persistence-health",
        error: {
          code: "PERSISTENCE_UNAVAILABLE",
          details: {
            operation: "health",
          },
        },
      },
    });
    expect(walletSession).toMatchObject({
      status: 503,
      body: {
        ok: false,
        traceId: "trace-persistence-write",
        error: {
          code: "PERSISTENCE_UNAVAILABLE",
          details: {
            operation: "record",
          },
        },
      },
    });
    expectNoForbiddenResponseKeys(health.body);
    expectNoForbiddenResponseKeys(walletSession.body);
  });

  it("fails closed with trace IDs when the Campaign DB repository is unavailable", async () => {
    const failingRuntime = createCampaignOsApiRuntime({
      campaignDbRepository: createFailingCampaignDbRepository(),
    });
    const create = await failingRuntime.handle({
      method: "POST",
      path: "/api/campaigns",
      headers: projectOwnerAuthHeaders("repo-owner-002", {
        "x-campaign-os-trace-id": "trace-campaign-db-create-failure",
      }),
      body: JSON.stringify({
        duration: "2026-08-01/2026-08-14",
        endTime: "2026-08-14T23:59:59Z",
        goal: "Fail repository draft",
        ownerAddress: "repo-owner-002",
        projectId: "repo-project",
        rewardDescription: "Repository-backed rewards remain local-review only.",
        startTime: "2026-08-01T00:00:00Z",
      }),
    });
    const detail = await failingRuntime.handle({
      method: "GET",
      path: "/api/campaigns/campaign-db-draft-404",
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-detail-failure" },
    });
    const list = await failingRuntime.handle({
      method: "GET",
      path: "/api/campaigns?projectId=repo-project",
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-list-failure" },
    });

    expect(create).toMatchObject({
      status: 503,
      body: {
        ok: false,
        traceId: "trace-campaign-db-create-failure",
        error: {
          code: "PERSISTENCE_UNAVAILABLE",
          details: {
            operation: "campaignDb.createDraft",
          },
        },
      },
    });
    expect(detail).toMatchObject({
      status: 503,
      body: {
        ok: false,
        traceId: "trace-campaign-db-detail-failure",
        error: {
          code: "PERSISTENCE_UNAVAILABLE",
          details: {
            operation: "campaignDb.getById",
          },
        },
      },
    });
    expect(list).toMatchObject({
      status: 503,
      body: {
        ok: false,
        traceId: "trace-campaign-db-list-failure",
        error: {
          code: "PERSISTENCE_UNAVAILABLE",
          details: {
            operation: "campaignDb.list",
          },
        },
      },
    });

    for (const response of [create, detail, list]) {
      expectNoForbiddenResponseKeys(response.body);
      expect(response.headers["content-type"]).toBe("application/json; charset=utf-8");
      expect(response.headers["x-campaign-os-trace-id"]).toBe(response.body.traceId);
    }
  });

  it("fails closed for invalid runtime configuration", async () => {
    const invalidRuntime = createCampaignOsApiRuntime({
      runtimeConfigOptions: {
        persistence: {
          mode: "unsupported" as never,
        },
      },
    });
    const health = await invalidRuntime.handle({
      method: "GET",
      path: "/api/health",
      headers: { "x-campaign-os-trace-id": "trace-invalid-config" },
    });

    expect(health).toMatchObject({
      status: 400,
      body: {
        ok: false,
        traceId: "trace-invalid-config",
        error: {
          code: "INVALID_REQUEST",
          details: {
            field: "runtimeConfig.persistence.mode",
          },
        },
      },
    });
    expectNoForbiddenResponseKeys(health.body);
  });

  it("fails closed for invalid routes, methods, JSON, locales, and export modes", async () => {
    const unknown = await runtime.handle({ method: "GET", path: "/api/missing" });
    const wrongMethod = await runtime.handle({ method: "DELETE", path: "/api/health" });
    const malformed = await runtime.handle({
      method: "POST",
      path: "/api/campaigns",
      body: "{",
    });
    const unsupportedLocale = await runtime.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/i18n/generate`,
      body: JSON.stringify({
        contentKeys: ["title"],
        sourceLocale: "en-US",
        targetLocale: "fr-FR",
      }),
    });
    const unsupportedExport = await runtime.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/export`,
      body: JSON.stringify({
        contractRootMode: "winners_root",
        format: "json",
        includeLocalePreference: true,
        includeRiskFlags: true,
        includeWalletType: true,
      }),
    });
    const missingCampaign = await runtime.handle({
      method: "GET",
      path: "/api/campaigns/missing-campaign",
    });
    const missingTask = await runtime.handle({
      method: "POST",
      path: "/api/tasks/missing-task/verify",
      body: JSON.stringify({
        accountType: "AA",
        campaignId: campaignDetail.id,
        walletAddress: "2F4...9aB",
        walletSource: "PORTKEY_AA",
      }),
    });
    const invalidCreate = await runtime.handle({
      method: "POST",
      path: "/api/campaigns",
      headers: projectOwnerAuthHeaders("2F4...9aB"),
      body: JSON.stringify({
        projectId: "awaken",
      }),
    });
    const invalidRepositoryCreate = await runtime.handle({
      method: "POST",
      path: "/api/campaigns",
      headers: projectOwnerAuthHeaders("2F4...9aB"),
      body: JSON.stringify({
        contractMode: "LIVE_CONTRACT",
        duration: "2026-07-01/2026-07-14",
        endTime: "2026-07-14T23:59:59Z",
        goal: "Reject unsupported repository contract mode",
        ownerAddress: "2F4...9aB",
        projectId: "awaken",
        rewardDescription: "Rewards remain project owned.",
        startTime: "2026-07-01T00:00:00Z",
      }),
    });
    const validationRepository = createCampaignOsMemoryRepository();
    const validationRuntime = createCampaignOsApiRuntime({ repository: validationRepository });
    const invalidWalletSource = await runtime.handle({
      method: "POST",
      path: "/api/tasks/task-bridge/verify",
      body: JSON.stringify({
        accountType: "AA",
        campaignId: campaignDetail.id,
        walletAddress: "2F4...9aB",
        walletSource: "RAW_PRIVATE_KEY",
      }),
    });
    const invalidPersistedWalletSource = await validationRuntime.handle({
      method: "POST",
      path: "/api/tasks/task-bridge/verify",
      body: JSON.stringify({
        accountType: "AA",
        campaignId: campaignDetail.id,
        walletAddress: "2F4...9aB",
        walletSource: "RAW_PRIVATE_KEY",
      }),
    });
    const invalidAgentWalletAction = await runtime.handle({
      method: "POST",
      path: "/api/agent-wallet/actions/review",
      headers: { "x-campaign-os-trace-id": "trace-invalid-agent-wallet-action" },
      body: JSON.stringify({
        actionIntent: "balance_query",
        campaignId: campaignDetail.id,
        taskId: "task-bridge",
        walletSource: "AGENT_SKILL",
      }),
    });
    const invalidGeneratedTasks = await runtime.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/tasks/generate`,
      body: JSON.stringify({
        goal: "Activate Awaken traders",
        product: "Awaken",
        targetUsers: "AA wallet users",
        walletPolicy: "ANY",
      }),
    });
    const invalidGeneratedPosts = await runtime.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/posts/generate`,
      body: JSON.stringify({
        channel: "x",
        contentKeys: ["unsupported"],
        sourceLocale: "en-US",
      }),
    });
    const invalidSummary = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/summary?period=monthly`,
    });

    expect(unknown).toMatchObject({
      status: 404,
      body: {
        ok: false,
        error: { code: "ROUTE_NOT_FOUND" },
      },
    });
    expect(wrongMethod).toMatchObject({
      status: 405,
      body: {
        ok: false,
        error: { code: "METHOD_NOT_ALLOWED" },
      },
    });
    expect(malformed).toMatchObject({
      status: 400,
      body: {
        ok: false,
        error: { code: "MALFORMED_JSON" },
      },
    });
    expect(unsupportedLocale).toMatchObject({
      status: 400,
      body: {
        ok: false,
        error: { code: "UNSUPPORTED_LOCALE" },
      },
    });
    expect(unsupportedExport).toMatchObject({
      status: 400,
      body: {
        ok: false,
        error: { code: "UNSUPPORTED_EXPORT_MODE" },
      },
    });
    expect(missingCampaign).toMatchObject({
      status: 404,
      body: {
        ok: false,
        error: { code: "INVALID_CAMPAIGN" },
      },
    });
    expect(missingTask).toMatchObject({
      status: 404,
      body: {
        ok: false,
        error: { code: "INVALID_TASK" },
      },
    });
    expect(invalidCreate).toMatchObject({
      status: 400,
      body: {
        ok: false,
        error: { code: "INVALID_REQUEST" },
      },
    });
    expect(invalidRepositoryCreate).toMatchObject({
      status: 400,
      body: {
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          details: {
            field: "contractMode",
          },
        },
      },
    });
    expect(invalidWalletSource).toMatchObject({
      status: 400,
      body: {
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          details: {
            field: "walletSource",
          },
        },
      },
    });
    expect(invalidPersistedWalletSource).toMatchObject({
      status: 400,
      body: {
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          details: {
            field: "walletSource",
          },
        },
      },
    });
    expect(invalidAgentWalletAction).toMatchObject({
      status: 400,
      body: {
        ok: false,
        traceId: "trace-invalid-agent-wallet-action",
        error: {
          code: "INVALID_REQUEST",
          details: {
            field: "agentId",
          },
        },
      },
    });
    expect(invalidGeneratedTasks).toMatchObject({
      status: 400,
      body: {
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          details: {
            field: "targetUsers",
          },
        },
      },
    });
    expect(invalidGeneratedPosts).toMatchObject({
      status: 400,
      body: {
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          details: {
            field: "contentKeys",
          },
        },
      },
    });
    expect(invalidSummary).toMatchObject({
      status: 400,
      body: {
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          details: {
            field: "period",
          },
        },
      },
    });
    expect(await validationRepository.snapshot()).toMatchObject({
      recordCount: 0,
    });

    for (const response of [
      unknown,
      wrongMethod,
      malformed,
      unsupportedLocale,
      unsupportedExport,
      missingCampaign,
      missingTask,
      invalidCreate,
      invalidRepositoryCreate,
      invalidWalletSource,
      invalidPersistedWalletSource,
      invalidAgentWalletAction,
      invalidGeneratedTasks,
      invalidGeneratedPosts,
      invalidSummary,
    ]) {
      expectNoForbiddenResponseKeys(response.body);
      expect(response.body.traceId).not.toHaveLength(0);
      expect(response.headers["content-type"]).toBe("application/json; charset=utf-8");
      expect(response.body.runtime.mode).toBe("local_seeded");
      expect(response.body.safety).toMatchObject({
        noLiveApi: true,
        noProductionDatabase: true,
        noWalletSignature: true,
      });
    }
  });

  it("serves JSON over the Node HTTP adapter with a clean stop hook", async () => {
    const server = await startCampaignOsApiServer({ logger: false, port: 0 });

    try {
      const response = await fetch(`${server.url}/api/health`, {
        headers: { "x-campaign-os-trace-id": "trace-http-smoke" },
      });
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(response.headers.get("x-campaign-os-trace-id")).toBe("trace-http-smoke");
      expect(payload).toMatchObject({
        ok: true,
        traceId: "trace-http-smoke",
        data: {
          status: "ok",
        },
      });
    } finally {
      await server.stop();
    }
  });
});
