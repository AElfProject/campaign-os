import { createServer, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NormalizedWalletSession } from "../domain/types";
import { createCampaignOsApiRuntime } from "./apiRuntime";
import { createBackendServiceReadinessReport } from "./backendService";
import { startCampaignOsApiServer } from "./server";
import {
  createServerRuntimeReadiness,
  withServerRuntimeReadiness,
} from "./serverReadiness";
import { resolveApiServerRuntimeContract } from "./serverRuntime";

const secretLeakFragments = [
  "authorization: bearer",
  "bearer sample-bearer-token",
  "campaign_os_database_url=",
  "connectionstring=",
  "mnemonic",
  "sample-mnemonic-phrase",
  "objectkey=",
  "object-key-sample",
  "password=",
  "privatekey=",
  "private-key-sample",
  "real-db-password",
  "rawsignature=",
  "raw-signature-sample",
  "seedphrase=",
  "seed-phrase-sample",
  "signedurl=",
  "https://storage.invalid/signed-url",
  "postgres://real-user:real-db-password@db.invalid/campaign-os",
];

const expectSanitizedReadinessPayload = (payload: unknown) => {
  const serialized = JSON.stringify(payload).toLowerCase();

  for (const fragment of secretLeakFragments) {
    expect(serialized).not.toContain(fragment);
  }
};

interface IssuedWalletAuthSession {
  accountType: NormalizedWalletSession["accountType"];
  address: string;
  proofStatus: "verified";
  sessionId: string;
  walletSource: NormalizedWalletSession["walletSource"];
}

const issueWalletSession = async (
  baseUrl: string,
  ownerAddress: string,
  traceId: string,
): Promise<IssuedWalletAuthSession> => {
  const response = await fetch(`${baseUrl}/api/wallet/session`, {
    body: JSON.stringify({
      address: ownerAddress,
      adapterName: "PortkeyDiscoverWallet",
      chainId: "AELF",
      network: "mainnet",
      nonce: `nonce-${traceId}`,
      proofEvaluatedAt: "2026-07-07T04:00:00.000Z",
      proofIssuedAt: "2026-07-07T03:59:00.000Z",
      signature: "test-wallet-signature",
    }),
    headers: {
      "content-type": "application/json",
      "x-campaign-os-trace-id": traceId,
    },
    method: "POST",
  });
  const envelope = await response.json() as {
    data?: { payload?: NormalizedWalletSession };
    ok?: boolean;
  };
  const session = envelope.data?.payload;

  expect(response.status).toBe(200);
  expect(response.headers.get("x-campaign-os-trace-id")).toBe(traceId);
  expect(envelope).toMatchObject({
    ok: true,
    data: {
      payload: {
        address: ownerAddress,
        issuer: { valid: true },
        proof: { status: "verified" },
      },
    },
  });

  if (!session || session.proof?.status !== "verified") {
    throw new Error("Expected the wallet session route to return a verified issued session.");
  }

  return {
    accountType: session.accountType,
    address: session.address,
    proofStatus: "verified",
    sessionId: session.sessionId,
    walletSource: session.walletSource,
  };
};

const walletAuthHeaders = (
  session: IssuedWalletAuthSession,
  roleId = "project_owner",
  extraHeaders: Record<string, string> = {},
) => ({
  "x-campaign-os-account-type": session.accountType,
  "x-campaign-os-credential-boundary": "ordinary_user_wallet",
  "x-campaign-os-proof-status": session.proofStatus,
  "x-campaign-os-roles": roleId,
  "x-campaign-os-session-id": session.sessionId,
  "x-campaign-os-wallet-address": session.address,
  "x-campaign-os-wallet-source": session.walletSource,
  ...extraHeaders,
});

interface TestDurableCampaignServer {
  stop(): Promise<void>;
  url: string;
}

const writeJsonResponse = (
  response: ServerResponse,
  status: number,
  headers: Record<string, string>,
  body: unknown,
) => {
  response.writeHead(status, headers);
  response.end(JSON.stringify(body));
};

const isRuntimeMetadataPath = (path: string | undefined) => {
  const pathname = new URL(path || "/", "http://127.0.0.1").pathname;

  return pathname === "/api/health" || pathname === "/api/contracts";
};

const startTestDurableCampaignServer = async (
  durableStoreFilePath: string,
): Promise<TestDurableCampaignServer> => {
  await mkdir(join(durableStoreFilePath, ".."), { recursive: true });

  const runtimeContract = resolveApiServerRuntimeContract({ port: 0 });
  const backendServiceReadiness = createBackendServiceReadinessReport({
    campaignStore: {
      durable: true,
      mode: "durable_test",
    },
    configOptions: {
      host: runtimeContract.host,
      port: runtimeContract.port,
      profileId: runtimeContract.profileId,
      version: runtimeContract.runtimeVersion,
    },
  });
  const runtime = createCampaignOsApiRuntime({
    backendServiceReadiness: () => backendServiceReadiness,
    campaignDbRepositoryOptions: {
      boundedListLimit: 2,
      durableStoreFilePath,
      mode: "durable_test",
    },
  });
  const server: Server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];

    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const runtimeResponse = await runtime.handle({
      body: chunks.length > 0 ? Buffer.concat(chunks).toString("utf8") : undefined,
      headers: request.headers,
      method: request.method ?? "GET",
      path: request.url ?? "/",
    });
    const responseBody = isRuntimeMetadataPath(request.url)
      ? withServerRuntimeReadiness(
        runtimeResponse.body,
        createServerRuntimeReadiness({
          backendReadiness: backendServiceReadiness,
          contract: runtimeContract,
        }),
      )
      : runtimeResponse.body;

    writeJsonResponse(response, runtimeResponse.status, runtimeResponse.headers, responseBody);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, runtimeContract.host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address() as AddressInfo;

  return {
    stop: () => new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    }),
    url: `http://${runtimeContract.host}:${address.port}`,
  };
};

describe("backend scaffold HTTP smoke", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("serves health and contracts envelopes with trace IDs over the local server", async () => {
    const server = await startCampaignOsApiServer({ logger: false, port: 0 });

    try {
      expect(server.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);

      const health = await fetch(`${server.url}/api/health`, {
        headers: { "x-campaign-os-trace-id": "trace-backend-smoke-health" },
      });
      const contracts = await fetch(`${server.url}/api/contracts`, {
        headers: { "x-campaign-os-trace-id": "trace-backend-smoke-contracts" },
      });
      const healthPayload = await health.json();
      const contractsPayload = await contracts.json();

      expect(health.status).toBe(200);
      expect(contracts.status).toBe(200);
      expect(health.headers.get("content-type")).toContain("application/json");
      expect(contracts.headers.get("content-type")).toContain("application/json");
      expect(health.headers.get("x-campaign-os-trace-id")).toBe("trace-backend-smoke-health");
      expect(contracts.headers.get("x-campaign-os-trace-id")).toBe("trace-backend-smoke-contracts");
      expect(healthPayload).toMatchObject({
        ok: true,
        traceId: "trace-backend-smoke-health",
        runtime: expect.objectContaining({
          name: "campaign-os-api-runtime",
          mode: "local_seeded",
        }),
        data: {
          apiService: expect.objectContaining({
            deployableBoundaryReady: true,
            id: "campaign-os-api-service",
            liveConnectionAttempted: false,
            liveSideEffectsEnabled: false,
            productionReady: false,
            status: "ready",
          }),
          backendService: expect.objectContaining({
            apiService: expect.objectContaining({
              blockedDependencyIds: expect.arrayContaining([
                "live-database-driver",
                "project-membership-store",
                "contract-writer",
              ]),
              deferredDependencyIds: expect.arrayContaining([
                "verification-worker",
                "provider-adapters",
                "deployment-config",
              ]),
              productionReady: false,
              status: "ready",
            }),
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
              protectedRouteCount: expect.any(Number),
              roleCount: 5,
              status: "local_seeded",
              valid: true,
              verificationMode: "local_only",
            }),
            databaseReadiness: expect.objectContaining({
              adapterStatus: "contract_ready",
              migrationPlanStatus: "dry_run_ready",
              requiredStoreCount: 6,
              valid: true,
            }),
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
            authSessionFoundation: expect.objectContaining({
              blockerCount: 0,
              liveSideEffectsEnabled: false,
              liveSigningExecuted: false,
              liveVerificationExecuted: false,
              productionReady: false,
              status: "local_ready",
              valid: true,
            }),
            entrypointId: "campaign-os-backend-service",
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
              valid: true,
            }),
            profileId: "local-review",
            traceId: "trace-backend-smoke-health",
          }),
          serverRuntime: expect.objectContaining({
            profileId: "local-review",
            readiness: expect.objectContaining({
              backendRuntimeBootstrap: expect.objectContaining({
                deferredDependencyIds: expect.arrayContaining([
                  "deployment-config",
                  "production-database-driver",
                  "database-migration-executor",
                  "auth-middleware",
                  "provider-adapters",
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
                readiness: expect.objectContaining({
                  databaseAdapterRuntime: expect.objectContaining({
                    liveConnectionAttempted: false,
                    liveQueryExecutionEnabled: false,
                    status: "active_local",
                    valid: true,
                  }),
                  persistenceRuntime: expect.objectContaining({
                    liveConnectionAttempted: false,
                    liveExecutionEnabled: false,
                    status: "active_local",
                    valid: true,
                  }),
                }),
                requestGuard: expect.objectContaining({
                  guardedFailureEnvelope: true,
                  traceHeaderName: "x-campaign-os-trace-id",
                }),
                shutdown: expect.objectContaining({
                  shutdownTimeoutMs: 5_000,
                  state: "running",
                }),
                startup: expect.objectContaining({
                  host: "127.0.0.1",
                  profileId: "local-review",
                  valid: true,
                }),
                status: "ready",
                tracePolicy: {
                  failureEnvelopeTraceId: true,
                  startupLogIncludesTracePolicy: true,
                  successEnvelopeTraceId: true,
                  traceHeaderName: "x-campaign-os-trace-id",
                },
                valid: true,
              }),
              backend: expect.objectContaining({
                valid: true,
              }),
              campaignDbVerticalSlice: expect.objectContaining({
                diagnosticCodes: [],
                noLive: {
                  connectionAttempted: false,
                  migrationExecutionEnabled: false,
                  queryExecutionEnabled: false,
                  writeExecutionEnabled: false,
                },
                status: "ready",
                storeId: "campaign-db",
                validation: expect.objectContaining({
                  valid: true,
                }),
              }),
              database: expect.objectContaining({
                adapterStatus: "contract_ready",
                migrationPlanStatus: "dry_run_ready",
                valid: true,
              }),
              databaseAdapterRuntime: expect.objectContaining({
                liveConnectionAttempted: false,
                liveQueryExecutionEnabled: false,
                migrationExecutor: expect.objectContaining({
                  liveExecutionCount: 0,
                  liveExecutionEnabled: false,
                  migrationGateStatus: "ready",
                }),
                productionDbRuntime: expect.objectContaining({
                  liveConnectionAttempted: false,
                  liveQueryExecutionEnabled: false,
                  migrationGateStatus: "not_required_for_fixture",
                  status: "ready",
                  valid: true,
                }),
                profileId: "local-review",
                status: "active_local",
                valid: true,
              }),
              persistenceRuntime: expect.objectContaining({
                activeDriverId: "campaign-os-memory-adapter",
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
              providerIndexerFoundation: expect.objectContaining({
                blockerCount: 0,
                noLiveFlags: expect.objectContaining({
                  liveAiCallsEnabled: false,
                  liveAnalyticsIngestionEnabled: false,
                  liveContractCallsEnabled: false,
                  liveIndexerCallsEnabled: false,
                  liveObjectStorageEnabled: false,
                  liveProviderCallsEnabled: false,
                  liveSocialCallsEnabled: false,
                  workerExecutionEnabled: false,
                }),
                productionReady: false,
                profileId: "local-review",
                providerGroupCount: 10,
                status: "local_ready",
                valid: true,
                verificationSourceCoverage: expect.objectContaining({
                  summaryCount: 5,
                }),
                verificationSourceHandoff: expect.objectContaining({
                  liveExecutionEnabled: false,
                  supportedVerificationTypes: ["WALLET", "ON_CHAIN", "DAPP_API", "SOCIAL", "MANUAL"],
                  valid: true,
                }),
              }),
            }),
            requestGuard: expect.objectContaining({
              guardedFailureEnvelope: true,
              traceHeaderName: "x-campaign-os-trace-id",
            }),
            status: "ready",
          }),
          status: "ok",
        },
      });
      expect(contractsPayload).toMatchObject({
        ok: true,
        traceId: "trace-backend-smoke-contracts",
        runtime: expect.objectContaining({
          name: "campaign-os-api-runtime",
          mode: "local_seeded",
        }),
        data: {
          backendService: expect.objectContaining({
            apiService: expect.objectContaining({
              deployableBoundaryReady: true,
              liveConnectionAttempted: false,
              productionReady: false,
              status: "ready",
            }),
            authSession: expect.objectContaining({
              agentCredentialBoundary: {
                agentSkillCanSubstituteUserWallet: false,
                separatedFromUserWalletSession: true,
              },
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
                  enforcementStatus: "local_enforced",
                  requiredRoles: ["participant"],
                  routeId: "tasks.verify",
                }),
              ]),
              status: "local_seeded",
              validation: expect.objectContaining({
                valid: true,
              }),
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
              validation: expect.objectContaining({
                valid: true,
              }),
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
              productionDbRuntime: expect.objectContaining({
                connection: expect.objectContaining({
                  safeLabel: "deterministic_fixture",
                  state: "ready",
                }),
                driver: expect.objectContaining({
                  deterministicFixture: true,
                  productionReady: false,
                }),
                id: "campaign-os-production-db-runtime-v1",
                liveConnectionAttempted: false,
                liveQueryExecutionEnabled: false,
                migrationGate: expect.objectContaining({
                  liveExecutionEnabled: false,
                  status: "not_required_for_fixture",
                }),
                ownerStores: expect.arrayContaining(["campaign-db", "points-ledger"]),
                queryCapability: expect.objectContaining({
                  adHocRawSqlEnabled: false,
                  liveQueryExecutionEnabled: false,
                  parameterizedQueries: true,
                  transactions: true,
                }),
                schemaManifestId: "campaign-os-production-db-schema-v0.2",
                status: "ready",
                valid: true,
              }),
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
              stores: expect.arrayContaining([
                expect.objectContaining({
                  id: "campaign-db",
                  required: true,
                  runtimeState: "covered",
                }),
              ]),
              valid: true,
            }),
            deferredProductionCapabilities: expect.arrayContaining([
              "auth_session",
              "production_database",
              "provider_adapters",
              "worker_queue",
              "scheduler",
              "contract_writer",
              "reward_distribution",
            ]),
            reportShape: expect.objectContaining({
              sections: expect.arrayContaining([
                "apiService",
                "authSession",
                "databaseAdapterRuntime",
                "databaseReadiness",
                "persistenceFoundation",
                "persistenceRuntime",
              ]),
              valid: true,
            }),
          }),
          serverRuntime: expect.objectContaining({
            readiness: expect.objectContaining({
              apiService: expect.objectContaining({
                deployableBoundaryReady: true,
                productionReady: false,
                status: "ready",
              }),
              authEnforcement: expect.objectContaining({
                agentCredentialSubstitutionDisabled: true,
                campaignMutationRouteCount: 1,
                localEnforcedRouteCount: 10,
                locallyEnforcedRouteIds: [
                  "campaigns.create",
                  "campaigns.owner.list",
                  "campaigns.owner.detail",
                  "campaigns.tasks.add",
                  "campaigns.tasks.generate",
                  "campaigns.participant.list",
                  "campaigns.participant.journey",
                  "campaigns.eligibility",
                  "campaigns.points.ranking.ledger.runtime",
                  "tasks.verify",
                ],
                mode: "local_enforced",
                productionProofVerifierReady: false,
                productionProjectOwnershipSourceReady: false,
                productionSessionIssuerReady: false,
                readOnlyRouteCompatibility: expect.objectContaining({
                  runtimeMetadataUnauthenticated: true,
                }),
                remainingDeferredProductionDependencyIds: expect.arrayContaining([
                  "live_wallet_proof_verifier",
                  "jwt_or_session_cookie",
                  "project_ownership_source",
                ]),
              }),
              authSession: expect.objectContaining({
                foundation: expect.objectContaining({
                  blockerCount: 0,
                  productionReady: false,
                  status: "local_ready",
                  valid: true,
                }),
              }),
              backendRuntimeBootstrap: expect.objectContaining({
                deferredDependencies: expect.arrayContaining([
                  expect.objectContaining({
                    id: "production-database-driver",
                    requiredBeforeProduction: true,
                    status: "blocked",
                  }),
                  expect.objectContaining({
                    id: "auth-middleware",
                    requiredBeforeProduction: true,
                    status: "blocked",
                  }),
                  expect.objectContaining({
                    id: "worker-ingress",
                    requiredBeforeProduction: true,
                    status: "deferred",
                  }),
                  expect.objectContaining({
                    id: "analytics-warehouse",
                    requiredBeforeProduction: true,
                    status: "deferred",
                  }),
                ]),
                diagnosticCodes: [],
                readiness: expect.objectContaining({
                  databaseAdapterRuntime: expect.objectContaining({
                    liveConnectionAttempted: false,
                    liveQueryExecutionEnabled: false,
                    status: "active_local",
                    valid: true,
                  }),
                  persistenceRuntime: expect.objectContaining({
                    liveConnectionAttempted: false,
                    liveExecutionEnabled: false,
                    status: "active_local",
                    valid: true,
                  }),
                }),
                status: "ready",
                tracePolicy: expect.objectContaining({
                  failureEnvelopeTraceId: true,
                  successEnvelopeTraceId: true,
                  traceHeaderName: "x-campaign-os-trace-id",
                }),
                valid: true,
              }),
              persistenceFoundation: expect.objectContaining({
                liveConnectionAttempted: false,
                liveMigrationExecutionEnabled: false,
                status: "metadata_ready",
                storeCoverageCount: 6,
                valid: true,
              }),
              providerIndexerFoundation: expect.objectContaining({
                blockerCount: 0,
                noLiveFlags: expect.objectContaining({
                  liveAiCallsEnabled: false,
                  liveAnalyticsIngestionEnabled: false,
                  liveContractCallsEnabled: false,
                  liveIndexerCallsEnabled: false,
                  liveObjectStorageEnabled: false,
                  liveProviderCallsEnabled: false,
                  liveSocialCallsEnabled: false,
                  workerExecutionEnabled: false,
                }),
                productionReady: false,
                profileId: "local-review",
                providerGroupCount: 10,
                status: "local_ready",
                valid: true,
                verificationSourceCoverage: expect.objectContaining({
                  summaryCount: 5,
                }),
                verificationSourceHandoff: expect.objectContaining({
                  liveExecutionEnabled: false,
                  supportedVerificationTypes: ["WALLET", "ON_CHAIN", "DAPP_API", "SOCIAL", "MANUAL"],
                  valid: true,
                }),
              }),
            }),
          }),
        },
      });
      expectSanitizedReadinessPayload(healthPayload.data.backendService);
      expectSanitizedReadinessPayload(contractsPayload.data.backendService);
      expectSanitizedReadinessPayload(healthPayload.data.serverRuntime);
      expectSanitizedReadinessPayload(contractsPayload.data.serverRuntime);
    } finally {
      await server.stop();
    }
  });

  it("creates and reads Campaign DB drafts through HTTP without external services", async () => {
    const server = await startCampaignOsApiServer({ logger: false, port: 0 });

    try {
      const ownerSession = await issueWalletSession(
        server.url,
        "smoke-owner-001",
        "trace-campaign-db-http-session",
      );
      const create = await fetch(`${server.url}/api/campaigns`, {
        body: JSON.stringify({
          duration: "2026-09-01/2026-09-14",
          endTime: "2026-09-14T23:59:59Z",
          goal: "Smoke Campaign DB draft",
          ownerAddress: "smoke-owner-001",
          projectId: "smoke-project",
          rewardDescription: "Smoke rewards stay local-review only.",
          startTime: "2026-09-01T00:00:00Z",
        }),
        headers: {
          "content-type": "application/json",
          ...walletAuthHeaders(ownerSession, "project_owner", {
            "x-campaign-os-trace-id": "trace-campaign-db-http-create",
          }),
        },
        method: "POST",
      });
      const createPayload = await create.json();
      const draftId = createPayload.data?.payload?.id;
      const detail = await fetch(`${server.url}/api/campaigns/${draftId}`, {
        headers: { "x-campaign-os-trace-id": "trace-campaign-db-http-detail" },
      });
      const list = await fetch(
        `${server.url}/api/campaigns?projectId=smoke-project&ownerAddress=smoke-owner-001&status=draft`,
        {
          headers: { "x-campaign-os-trace-id": "trace-campaign-db-http-list" },
        },
      );
      const detailPayload = await detail.json();
      const listPayload = await list.json();

      expect(create.status).toBe(200);
      expect(detail.status).toBe(200);
      expect(list.status).toBe(200);
      expect(create.headers.get("x-campaign-os-trace-id")).toBe("trace-campaign-db-http-create");
      expect(detail.headers.get("x-campaign-os-trace-id")).toBe("trace-campaign-db-http-detail");
      expect(list.headers.get("x-campaign-os-trace-id")).toBe("trace-campaign-db-http-list");
      expect(createPayload).toMatchObject({
        ok: true,
        data: {
          campaignDb: {
            createdViaRepository: true,
            draftId: "campaign-db-draft-0001",
            storeId: "campaign-db",
          },
          payload: {
            id: "campaign-db-draft-0001",
            projectId: "smoke-project",
            status: "draft",
          },
          persistence: {
            kind: "campaign_draft",
            recordId: expect.any(String),
          },
        },
        traceId: "trace-campaign-db-http-create",
      });
      expect(draftId).toBe("campaign-db-draft-0001");
      expect(detailPayload).toMatchObject({
        ok: true,
        data: {
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
        },
      });
      expect(listPayload).toMatchObject({
        ok: true,
        data: {
          payload: {
            campaignDb: {
              draftCount: 1,
              storeId: "campaign-db",
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
          },
        },
      });
      expectSanitizedReadinessPayload(createPayload);
      expectSanitizedReadinessPayload(detailPayload);
      expectSanitizedReadinessPayload(listPayload);
    } finally {
      await server.stop();
    }
  });

  it("validates durable Campaign DB HTTP create/read/list/readiness smoke with bounded listing", async () => {
    const tempDir = join(tmpdir(), `campaign-os-durable-smoke-${Date.now()}`);
    const server = await startTestDurableCampaignServer(join(tempDir, "campaign-drafts.json"));

    try {
      const ownerSession = await issueWalletSession(
        server.url,
        "durable-smoke-owner",
        "trace-durable-smoke-owner-session",
      );
      const otherOwnerSession = await issueWalletSession(
        server.url,
        "durable-smoke-other",
        "trace-durable-smoke-other-session",
      );
      const createBody = {
        contractMode: "OFF_CHAIN_MVP",
        defaultLocale: "en-US",
        duration: "2026-10-01/2026-10-11",
        endTime: "2026-10-11T23:59:59Z",
        goal: "Durable smoke auth rejection",
        ownerAddress: "durable-smoke-owner",
        projectId: "durable-smoke-project",
        rewardDescription: "Durable smoke rewards stay local-review only.",
        startTime: "2026-10-01T00:00:00Z",
        supportedLocales: ["en-US", "zh-CN", "zh-TW"],
        walletPolicy: "ANY",
      };
      const missingAuth = await fetch(`${server.url}/api/campaigns`, {
        body: JSON.stringify(createBody),
        headers: {
          "content-type": "application/json",
          "x-campaign-os-trace-id": "trace-durable-smoke-auth-missing",
        },
        method: "POST",
      });
      const participantAuth = await fetch(`${server.url}/api/campaigns`, {
        body: JSON.stringify(createBody),
        headers: {
          "content-type": "application/json",
          ...walletAuthHeaders(ownerSession, "participant", {
            "x-campaign-os-trace-id": "trace-durable-smoke-auth-participant",
          }),
        },
        method: "POST",
      });
      const ownerMismatch = await fetch(`${server.url}/api/campaigns`, {
        body: JSON.stringify(createBody),
        headers: {
          "content-type": "application/json",
          ...walletAuthHeaders(otherOwnerSession, "project_owner", {
            "x-campaign-os-trace-id": "trace-durable-smoke-auth-owner-mismatch",
          }),
        },
        method: "POST",
      });
      const listAfterRejectedAuth = await fetch(
        `${server.url}/api/campaigns?projectId=durable-smoke-project&ownerAddress=durable-smoke-owner&status=draft`,
        {
          headers: { "x-campaign-os-trace-id": "trace-durable-smoke-list-after-auth-failures" },
        },
      );
      const missingAuthPayload = await missingAuth.json();
      const participantAuthPayload = await participantAuth.json();
      const ownerMismatchPayload = await ownerMismatch.json();
      const listAfterRejectedAuthPayload = await listAfterRejectedAuth.json();

      expect(missingAuth.status).toBe(401);
      expect(participantAuth.status).toBe(403);
      expect(ownerMismatch.status).toBe(403);
      expect(missingAuth.headers.get("x-campaign-os-trace-id")).toBe("trace-durable-smoke-auth-missing");
      expect(participantAuth.headers.get("x-campaign-os-trace-id")).toBe("trace-durable-smoke-auth-participant");
      expect(ownerMismatch.headers.get("x-campaign-os-trace-id")).toBe("trace-durable-smoke-auth-owner-mismatch");
      expect(missingAuthPayload).toMatchObject({
        ok: false,
        traceId: "trace-durable-smoke-auth-missing",
        error: {
          code: "AUTH_SESSION_REQUIRED",
          details: {
            routeId: "campaigns.create",
          },
        },
      });
      expect(participantAuthPayload).toMatchObject({
        ok: false,
        traceId: "trace-durable-smoke-auth-participant",
        error: {
          code: "AUTH_FORBIDDEN",
          details: {
            diagnosticCode: "AUTH_ROLE_FORBIDDEN",
            routeId: "campaigns.create",
          },
        },
      });
      expect(ownerMismatchPayload).toMatchObject({
        ok: false,
        traceId: "trace-durable-smoke-auth-owner-mismatch",
        error: {
          code: "AUTH_FORBIDDEN",
          details: {
            diagnosticCode: "AUTH_OWNER_MISMATCH",
            routeId: "campaigns.create",
          },
        },
      });
      expect(listAfterRejectedAuthPayload).toMatchObject({
        ok: true,
        data: {
          payload: {
            campaignDb: {
              draftCount: 0,
            },
          },
        },
      });

      const createDraft = async (index: number) => {
        const response = await fetch(`${server.url}/api/campaigns`, {
          body: JSON.stringify({
            contractMode: "OFF_CHAIN_MVP",
            defaultLocale: "en-US",
            duration: `2026-10-0${index}/2026-10-1${index}`,
            endTime: `2026-10-1${index}T23:59:59Z`,
            goal: `Durable smoke draft ${index}`,
            ownerAddress: "durable-smoke-owner",
            projectId: "durable-smoke-project",
            rewardDescription: "Durable smoke rewards stay local-review only.",
            startTime: `2026-10-0${index}T00:00:00Z`,
            supportedLocales: ["en-US", "zh-CN", "zh-TW"],
            walletPolicy: "ANY",
          }),
          headers: {
            "content-type": "application/json",
            ...walletAuthHeaders(ownerSession, "project_owner", {
              "x-campaign-os-trace-id": `trace-durable-smoke-create-${index}`,
            }),
          },
          method: "POST",
        });
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(response.headers.get("x-campaign-os-trace-id")).toBe(`trace-durable-smoke-create-${index}`);
        expect(payload).toMatchObject({
          ok: true,
          data: {
            campaignDb: {
              createdViaRepository: true,
              draftId: `campaign-db-draft-000${index}`,
              storeId: "campaign-db",
            },
            payload: {
              id: `campaign-db-draft-000${index}`,
              projectId: "durable-smoke-project",
              status: "draft",
            },
          },
        });

        return payload.data.payload.id as string;
      };

      const firstDraftId = await createDraft(1);
      await createDraft(2);
      await createDraft(3);

      const detail = await fetch(`${server.url}/api/campaigns/${firstDraftId}`, {
        headers: { "x-campaign-os-trace-id": "trace-durable-smoke-detail" },
      });
      const list = await fetch(
        `${server.url}/api/campaigns?projectId=durable-smoke-project&ownerAddress=durable-smoke-owner&status=draft&limit=2`,
        {
          headers: { "x-campaign-os-trace-id": "trace-durable-smoke-list" },
        },
      );
      const health = await fetch(`${server.url}/api/health`, {
        headers: { "x-campaign-os-trace-id": "trace-durable-smoke-health" },
      });
      const detailPayload = await detail.json();
      const listPayload = await list.json();
      const healthPayload = await health.json();
      const repositoryDraftIds = listPayload.data.payload.items
        .map((item: { id: string }) => item.id)
        .filter((id: string) => id.startsWith("campaign-db-draft-"));

      expect(detail.status).toBe(200);
      expect(list.status).toBe(200);
      expect(health.status).toBe(200);
      expect(detailPayload).toMatchObject({
        ok: true,
        data: {
          campaignDb: {
            adapterId: "campaign-db-durable-test-adapter",
            createdViaRepository: true,
            storeId: "campaign-db",
          },
          payload: {
            item: {
              id: "campaign-db-draft-0001",
              status: "draft",
            },
          },
        },
      });
      expect(listPayload).toMatchObject({
        ok: true,
        data: {
          payload: {
            campaignDb: {
              draftCount: 2,
              storeId: "campaign-db",
            },
          },
        },
      });
      expect(repositoryDraftIds).toEqual(["campaign-db-draft-0001", "campaign-db-draft-0002"]);
      expect(healthPayload).toMatchObject({
        ok: true,
        data: {
          serverRuntime: expect.objectContaining({
            readiness: expect.objectContaining({
              campaignDbVerticalSlice: expect.objectContaining({
                campaignStore: expect.objectContaining({
                  durable: true,
                  fallbackUsed: false,
                  mode: "durable_test",
                  status: "ready",
                  storeId: "campaign-db",
                }),
                migrationState: expect.objectContaining({
                  appliedMigrationIds: ["001-campaign-db-v0-2-0"],
                  liveExecutionEnabled: false,
                  status: "applied",
                  storeId: "campaign-db",
                }),
                status: "ready",
              }),
            }),
            status: "ready",
          }),
        },
      });
      expectSanitizedReadinessPayload(healthPayload);
    } finally {
      await server.stop();
      await rm(tempDir, { force: true, recursive: true });
    }
  });

  it("guards HTTP preflight and bad POST requests before local handlers", async () => {
    const server = await startCampaignOsApiServer({
      logger: false,
      maxBodyBytes: 16,
      port: 0,
    });

    try {
      const preflight = await fetch(`${server.url}/api/campaigns`, {
        headers: {
          "access-control-request-method": "POST",
          origin: "http://localhost:5173",
          "x-campaign-os-trace-id": "trace-smoke-preflight",
        },
        method: "OPTIONS",
      });
      const badPost = await fetch(`${server.url}/api/campaigns`, {
        body: "not-json",
        headers: {
          "content-type": "text/plain",
          "x-campaign-os-trace-id": "trace-smoke-bad-post",
        },
        method: "POST",
      });
      const badPostPayload = await badPost.json();

      expect(preflight.status).toBe(204);
      expect(preflight.headers.get("x-campaign-os-trace-id")).toBe("trace-smoke-preflight");
      expect(preflight.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
      expect(await preflight.text()).toBe("");

      expect(badPost.status).toBe(400);
      expect(badPost.headers.get("x-campaign-os-trace-id")).toBe("trace-smoke-bad-post");
      expect(badPostPayload).toMatchObject({
        ok: false,
        traceId: "trace-smoke-bad-post",
        error: {
          code: "INVALID_REQUEST",
          details: {
            field: "content-type",
          },
        },
      });
    } finally {
      await server.stop();
    }
  });

  it("keeps production-required readiness smoke payloads blocked and sanitized", async () => {
    vi.stubEnv("CAMPAIGN_OS_AUTH_SECRET", "bearer sample-bearer-token");
    vi.stubEnv("CAMPAIGN_OS_BACKEND_PROFILE", "production-required");
    vi.stubEnv("CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT", "https://writer.invalid/private-key-sample");
    vi.stubEnv("CAMPAIGN_OS_DATABASE_URL", "postgres://real-user:real-db-password@db.invalid/campaign-os");
    vi.stubEnv("CAMPAIGN_OS_PROVIDER_REGISTRY_URL", "https://providers.invalid/object-key-sample");
    vi.stubEnv("CAMPAIGN_OS_WORKER_QUEUE_URL", "https://queue.invalid/raw-signature-sample");

    const server = await startCampaignOsApiServer({ logger: false, port: 0 });

    try {
      const health = await fetch(`${server.url}/api/health`, {
        headers: {
          authorization: "Bearer sample-bearer-token",
          "x-campaign-os-trace-id": "trace-production-readiness-smoke",
        },
      });
      const contracts = await fetch(`${server.url}/api/contracts`, {
        headers: {
          authorization: "Bearer sample-bearer-token",
          "x-campaign-os-trace-id": "trace-production-contracts-smoke",
        },
      });
      const healthPayload = await health.json();
      const contractsPayload = await contracts.json();

      expect(health.status).toBe(200);
      expect(contracts.status).toBe(200);
      expect(healthPayload).toMatchObject({
        ok: true,
        data: {
          apiService: expect.objectContaining({
            diagnosticCodes: expect.arrayContaining(["API_SERVICE_PRODUCTION_BLOCKED"]),
            deployableBoundaryReady: false,
            liveConnectionAttempted: false,
            liveSideEffectsEnabled: false,
            productionReady: false,
            status: "blocked",
          }),
          backendService: expect.objectContaining({
            apiService: expect.objectContaining({
              diagnosticCodes: expect.arrayContaining(["API_SERVICE_PRODUCTION_BLOCKED"]),
              deployableBoundaryReady: false,
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
            databaseReadiness: expect.objectContaining({
              adapterStatus: "blocked",
              migrationPlanStatus: "blocked",
              valid: false,
            }),
            authSessionFoundation: expect.objectContaining({
              blockerCount: 8,
              liveSideEffectsEnabled: false,
              liveSigningExecuted: false,
              liveVerificationExecuted: false,
              productionReady: false,
              status: "blocked",
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
              profileId: "production-required",
              productionDbRuntime: expect.objectContaining({
                connectionState: "configured_redacted",
                diagnosticCodes: expect.arrayContaining([
                  "PRODUCTION_DB_DRIVER_DEFERRED",
                  "PRODUCTION_DB_SECRET_REDACTED",
                  "PRODUCTION_DB_MIGRATION_GATE_BLOCKED",
                ]),
                liveConnectionAttempted: false,
                liveQueryExecutionEnabled: false,
                migrationGateStatus: "blocked",
                status: "blocked",
                valid: false,
              }),
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
            profileId: "production-required",
            validation: expect.objectContaining({
              valid: false,
            }),
          }),
          serverRuntime: expect.objectContaining({
            profileId: "production-required",
            readiness: expect.objectContaining({
              backendRuntimeBootstrap: expect.objectContaining({
                diagnosticCodes: expect.arrayContaining([
                  "BACKEND_RUNTIME_BOOTSTRAP_PRODUCTION_BLOCKED",
                  "BACKEND_RUNTIME_BOOTSTRAP_SERVER_RUNTIME_INVALID",
                  "BACKEND_RUNTIME_BOOTSTRAP_BACKEND_READINESS_INVALID",
                ]),
                readiness: expect.objectContaining({
                  databaseAdapterRuntime: expect.objectContaining({
                    liveConnectionAttempted: false,
                    liveQueryExecutionEnabled: false,
                    status: "blocked",
                    valid: false,
                  }),
                  persistenceRuntime: expect.objectContaining({
                    liveConnectionAttempted: false,
                    liveExecutionEnabled: false,
                  }),
                }),
                status: "blocked",
                valid: false,
              }),
              backend: expect.objectContaining({
                valid: false,
              }),
              database: expect.objectContaining({
                adapterStatus: "blocked",
                migrationPlanStatus: "blocked",
                valid: false,
              }),
              databaseAdapterRuntime: expect.objectContaining({
                liveConnectionAttempted: false,
                liveQueryExecutionEnabled: false,
                migrationExecutor: expect.objectContaining({
                  liveExecutionCount: 0,
                  liveExecutionEnabled: false,
                  migrationGateStatus: "blocked",
                }),
                productionDbRuntime: expect.objectContaining({
                  liveConnectionAttempted: false,
                  liveQueryExecutionEnabled: false,
                  migrationGateStatus: "blocked",
                  status: "blocked",
                  valid: false,
                }),
                profileId: "production-required",
                status: "blocked",
                valid: false,
              }),
              persistenceRuntime: expect.objectContaining({
                activeDriverId: "campaign-os-production-db-adapter",
                liveConnectionAttempted: false,
                migrationGate: expect.objectContaining({
                  liveExecutionCount: 0,
                  liveExecutionEnabled: false,
                  mode: "live_blocked",
                  status: "blocked",
                }),
                profileId: "production-required",
                status: "boundary_ready",
              }),
            }),
            status: "blocked",
          }),
        },
      });
      expect(contractsPayload).toMatchObject({
        ok: true,
        data: {
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
              profileId: "production-required",
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
                  productionReady: false,
                }),
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
                }),
                schemaManifestId: "campaign-os-production-db-schema-v0.2",
                status: "blocked",
                valid: false,
              }),
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
          serverRuntime: expect.objectContaining({
            readiness: expect.objectContaining({
              backendRuntimeBootstrap: expect.objectContaining({
                deferredDependencyIds: expect.arrayContaining([
                  "production-database-driver",
                  "auth-middleware",
                  "contract-writer",
                  "reward-custody",
                  "reward-distribution",
                ]),
                diagnosticCodes: expect.arrayContaining([
                  "BACKEND_RUNTIME_BOOTSTRAP_PRODUCTION_BLOCKED",
                  "BACKEND_RUNTIME_BOOTSTRAP_SERVER_RUNTIME_INVALID",
                  "BACKEND_RUNTIME_BOOTSTRAP_BACKEND_READINESS_INVALID",
                ]),
                requestGuard: expect.objectContaining({
                  guardedFailureEnvelope: true,
                  traceHeaderName: "x-campaign-os-trace-id",
                }),
                shutdown: expect.objectContaining({
                  state: "running",
                }),
                startup: expect.objectContaining({
                  blockedAttachPointCount: expect.any(Number),
                  profileId: "production-required",
                  valid: false,
                }),
                status: "blocked",
                tracePolicy: expect.objectContaining({
                  failureEnvelopeTraceId: true,
                  successEnvelopeTraceId: true,
                  traceHeaderName: "x-campaign-os-trace-id",
                }),
                valid: false,
              }),
            }),
          }),
        },
      });
      expectSanitizedReadinessPayload(healthPayload.data.backendService);
      expectSanitizedReadinessPayload(contractsPayload.data.backendService);
      expectSanitizedReadinessPayload(healthPayload.data.serverRuntime);
      expectSanitizedReadinessPayload(contractsPayload.data.serverRuntime);
    } finally {
      await server.stop();
    }
  });
});
