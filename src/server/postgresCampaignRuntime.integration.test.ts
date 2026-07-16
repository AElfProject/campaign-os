// @vitest-environment node

import { createHash, randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createCampaignOsApiRuntime } from "./apiRuntime";
import { resolveCampaignOsCampaignDbConfig } from "./config";
import {
  loadPostgresMigrations,
  runPostgresMigrations,
  type PostgresMigrationPool,
} from "./postgresMigration";
import {
  createProviderHttpExecutionMaterialResolver,
  type ProviderHttpExecutionMaterialResolver,
} from "./providerHttpExecutionMaterial";
import {
  createProviderHttpFetchTransport,
  type ProviderHttpFetchTransport,
} from "./providerHttpFetchTransport";
import { createProviderHttpRuntimeSummary } from "./providerHttpRuntimeRegistry";
import {
  startProviderVerificationSandbox,
  type ProviderVerificationSandboxHandle,
  type ProviderVerificationSandboxScenario,
} from "./providerVerificationSandbox";
import {
  startCampaignOsApiServer,
  type CampaignOsApiServerHandle,
} from "./server";
import type { ParticipantJourneyProjection } from "./participantJourney";
import {
  resolveTaskVerificationConfig,
  type TaskVerificationBinding,
} from "./taskVerificationConfig";

const TEST_DATABASE_URL = process.env.CAMPAIGN_OS_TEST_DATABASE_URL?.trim();
const REQUIRE_POSTGRES_TESTS = process.env.CAMPAIGN_OS_REQUIRE_POSTGRES_TESTS?.trim() === "1";
const REQUIRE_PROVIDER_TESTS = process.env.CAMPAIGN_OS_REQUIRE_PROVIDER_TESTS?.trim() === "1";

if (REQUIRE_POSTGRES_TESTS && !TEST_DATABASE_URL) {
  throw new Error(
    "PostgreSQL acceptance requires CAMPAIGN_OS_TEST_DATABASE_URL when CAMPAIGN_OS_REQUIRE_POSTGRES_TESTS=1.",
  );
}
if (REQUIRE_PROVIDER_TESTS && !REQUIRE_POSTGRES_TESTS) {
  throw new Error(
    "Provider acceptance requires CAMPAIGN_OS_REQUIRE_POSTGRES_TESTS=1 when CAMPAIGN_OS_REQUIRE_PROVIDER_TESTS=1.",
  );
}
if (REQUIRE_PROVIDER_TESTS && !TEST_DATABASE_URL) {
  throw new Error(
    "Provider acceptance requires CAMPAIGN_OS_TEST_DATABASE_URL when CAMPAIGN_OS_REQUIRE_PROVIDER_TESTS=1.",
  );
}

const integrationSuite = TEST_DATABASE_URL ? describe : describe.skip;

const STAGE_PROVIDER_URL_ENV = "CAMPAIGN_OS_STAGE_PROVIDER_URL";
const CONTROLLED_ON_CHAIN_BINDING_ID = "postgres-stage-on-chain";
const CONTROLLED_DAPP_API_BINDING_ID = "postgres-stage-dapp-api";
const CONTROLLED_ON_CHAIN_BINDING = Object.freeze({
  degradationPolicy: "pending",
  enabled: true,
  endpointEnvKey: STAGE_PROVIDER_URL_ENV,
  endpointId: "aefinder-aelfscan-indexer-query",
  evidenceSource: "AELFSCAN",
  id: CONTROLLED_ON_CHAIN_BINDING_ID,
  maxAttempts: 3,
  maxResponseBytes: 16_384,
  providerFamily: "aefinder",
  providerGroupId: "aefinder-aelfscan-indexers",
  requestMappingId: "provider-http-request-map:on-chain-indexer-v1",
  responseMappingId: "provider-http-response-map:on-chain-indexer-v1",
  revision: 1,
  timeoutMs: 1_000,
  verificationType: "ON_CHAIN",
} satisfies TaskVerificationBinding);
const CONTROLLED_DAPP_API_BINDING = Object.freeze({
  degradationPolicy: "pending",
  enabled: true,
  endpointEnvKey: STAGE_PROVIDER_URL_ENV,
  endpointId: "dapp-api-verification-status",
  evidenceSource: "DAPP_API",
  id: CONTROLLED_DAPP_API_BINDING_ID,
  maxAttempts: 3,
  maxResponseBytes: 16_384,
  providerFamily: "ebridge",
  providerGroupId: "dapp-api-adapters",
  requestMappingId: "provider-http-request-map:dapp-api-status-v1",
  responseMappingId: "provider-http-response-map:dapp-api-status-v1",
  revision: 1,
  timeoutMs: 1_000,
  verificationType: "DAPP_API",
} satisfies TaskVerificationBinding);
const CONTROLLED_TASK_VERIFICATION_BINDINGS = Object.freeze([
  CONTROLLED_ON_CHAIN_BINDING,
  CONTROLLED_DAPP_API_BINDING,
]);
const CONTROLLED_TASK_VERIFICATION_PROVIDER_RUNTIME = createProviderHttpRuntimeSummary({
  env: {
    CAMPAIGN_OS_PROVIDER_HTTP_CREDENTIAL_REF: "credential-ref:postgres-controlled-provider",
    CAMPAIGN_OS_PROVIDER_HTTP_ENDPOINT_REF: "config-ref:postgres-controlled-endpoint",
    CAMPAIGN_OS_PROVIDER_HTTP_ENDPOINT_REGISTRY_REF: "config-ref:postgres-controlled-registry",
    CAMPAIGN_OS_PROVIDER_HTTP_HEADER_REF: "header-ref:postgres-controlled-auth",
    CAMPAIGN_OS_PROVIDER_HTTP_IDEMPOTENCY_REF: "idem-ref:postgres-controlled-provider",
    CAMPAIGN_OS_PROVIDER_HTTP_LEASE_REF: "lease-ref:postgres-controlled-provider",
    CAMPAIGN_OS_PROVIDER_HTTP_QUEUE_WORKER_HANDOFF: "config-ref:postgres-controlled-worker",
    CAMPAIGN_OS_PROVIDER_HTTP_REDACTION_POLICY: "policy-ref:postgres-controlled-redaction",
    CAMPAIGN_OS_PROVIDER_HTTP_RESPONSE_MAPPING_POLICY: "policy-ref:postgres-controlled-response",
    CAMPAIGN_OS_PROVIDER_HTTP_RUNBOOK_REF: "runbook-ref:postgres-controlled-provider",
    CAMPAIGN_OS_PROVIDER_HTTP_RUNTIME_ENABLEMENT: "explicitly-enabled",
    CAMPAIGN_OS_PROVIDER_HTTP_TIMEOUT_POLICY: "timeout-policy:1000ms",
    CAMPAIGN_OS_PROVIDER_HTTP_TRANSPORT_SEAM: "config-ref:postgres-controlled-transport",
  },
  profileId: "production-required",
  transportProvided: true,
});
const controlledOnChainEvidenceRule = (
  rule: Record<string, string | number | boolean>,
): Record<string, string | number | boolean> => {
  const minimum = typeof rule.minimum === "number"
    ? rule.minimum
    : typeof rule.minAmount === "number"
      ? rule.minAmount
      : undefined;

  return {
    chainId: typeof rule.chainId === "string" ? rule.chainId : "AELF",
    ...(typeof rule.contractAddress === "string"
      ? { contractAddress: rule.contractAddress }
      : {}),
    ...(typeof rule.eventName === "string" ? { eventName: rule.eventName } : {}),
    expectedField: "verified",
    expectedType: "boolean",
    expectedValue: true,
    ...(typeof rule.methodName === "string" ? { methodName: rule.methodName } : {}),
    ...(minimum !== undefined ? { minimum } : {}),
    providerBindingId: CONTROLLED_ON_CHAIN_BINDING_ID,
    source: "AELFSCAN",
  };
};
const controlledDappApiEvidenceRule = (
  rule: Record<string, string | number | boolean>,
): Record<string, string | number | boolean> => ({
  action: typeof rule.action === "string" ? rule.action : "completed",
  expectedField: "eligible",
  expectedType: "boolean",
  expectedValue: true,
  providerBindingId: CONTROLLED_DAPP_API_BINDING_ID,
  source: "DAPP_API",
});

interface ApiEnvelope<T> {
  data?: T;
  error?: {
    code?: string;
    details?: {
      diagnosticCode?: string;
      operation?: string;
      routeId?: string;
      [key: string]: unknown;
    };
  };
  ok: boolean;
  traceId?: string;
}

interface CampaignCreateData {
  payload: {
    contractMode: string;
    duration: string;
    endTime: string;
    goal: string;
    id: string;
    ownerAddress: string;
    projectId: string;
    required?: boolean;
    rewardDescription: string;
    startTime: string;
    status: string;
    supportedLocales: string[];
    walletPolicy: string;
  };
}

interface CampaignListData {
  payload: {
    campaignDb?: { draftCount: number };
    details?: DetailData["payload"][];
    items: Array<{
      id: string;
      repository?: {
        createdViaRepository: true;
        repositoryId: string;
        storeId: "campaign-db";
      };
      status?: string;
      tags?: Array<Record<string, string>>;
      visibility?: "participant_preview" | "public";
    }>;
    participantPreview?: {
      campaignCount: number;
      enabled: boolean;
    };
    summary?: { totalCampaigns: number };
  };
}

interface TaskCreateData {
  campaignDbTask: { taskId: string };
  payload: {
    campaignId: string;
    evidenceRule: Record<string, string | number | boolean>;
    id: string;
    points: number;
    required: boolean;
    templateCode: string;
    verificationType: string;
    walletCompatibility: string;
  };
}

interface GeneratedTasksData {
  payload: {
    campaignId: string;
    humanReviewRequired: boolean;
    taskList: Array<{
      adoptability: "adoptable" | "unsupported";
      evidenceRule: Record<string, string | number | boolean>;
      id: string;
      points: number;
      required: boolean;
      templateCode: string;
      unsupportedReason?: string;
      verificationType: string;
      walletCompatibility: string;
    }>;
  };
}

interface WalletSessionData {
  payload: {
    accountType: string;
    address: string;
    id: string;
    issuer?: {
      issuerMode?: string;
      valid?: boolean;
    };
    proof?: {
      status?: string;
      trustLevel?: string;
    };
    sessionId: string;
    walletSource: string;
  };
}

interface EligibilityData {
  payload: {
    campaignId?: string;
    eligible: boolean;
    missingTasks: string[];
    repository?: ParticipantJourneyProjection["repository"];
    riskFlags: string[];
    score: number;
    status?: string;
    walletAddress?: string;
  };
}

interface ParticipantJourneyData {
  payload: ParticipantJourneyProjection & {
    visibility: "participant_preview" | "public";
  };
}

interface RankingData {
  payload: {
    campaignId: string;
    eligibility: ParticipantJourneyProjection["eligibility"];
    participant: ParticipantJourneyProjection["participant"];
    ranking: ParticipantJourneyProjection["ranking"];
    repository: ParticipantJourneyProjection["repository"];
    source: "repository_projection";
    status: "ready";
    visibility: "participant_preview" | "public";
  };
}

interface ExportData {
  payload: {
    campaignId: string;
    readyRows: number;
    rows: Array<{
      referrerAddress: string;
      walletAddress: string;
    }>;
  };
}

interface DetailData {
  payload: {
    item: {
      id: string;
      tags: Array<Record<string, string>>;
      title: Record<string, string>;
    };
    tasks: Array<{
      points: number;
      required: boolean;
      taskId: string;
      title: Record<string, string>;
      verificationType: string;
    }>;
  };
}

interface HealthData {
  apiService: {
    workerExecutionEnabled: boolean;
  };
  backendService: {
    providerClientReadiness: {
      liveProviderCallsAttempted: boolean;
      providerClientsEnabled: boolean;
      providerHttpRuntime: {
        liveHttpCallsAttempted: boolean;
      };
      queueHandoff: unknown;
    };
  };
  campaignDatabase: {
    campaignStore?: {
      appliedMigrationIds?: string[];
      migrationStatus: string;
      mode: string;
      schemaVersion?: string;
      status: string;
    };
    liveConnectionAttempted: boolean;
    liveQueryExecutionEnabled: boolean;
    selectedMode: string;
    status: string;
  };
  persistence: {
    countsByKind: Record<string, number>;
    recordCount: number;
  };
  taskVerificationRuntime: {
    enabled: boolean;
    providerStatus: string;
    requiredSchemaVersion: string;
    schemaStatus: string;
    status: string;
  };
}

interface VerificationData {
  campaignDb: ParticipantJourneyProjection["repository"];
  campaignDbCompletion: {
    completionId: string;
    createdViaRepository: true;
    evidenceId: string;
    repositoryId: string;
    storeId: "campaign-db";
    taskId: string;
  };
  campaignDbEvidence: {
    completionId: string;
    createdViaRepository: true;
    evidenceHash: string;
    evidenceId: string;
    evidenceRef: string;
    evidenceSource: string;
    liveProviderExecuted: boolean;
    repositoryId: string;
    storeId: "campaign-db";
    taskId: string;
  };
  payload: {
    campaignId: string;
    evidenceHash: string;
    evidenceRef: string;
    liveProviderExecuted: boolean;
    outcome: string;
    pointsAwarded: number;
    providerFamily: string;
    status: string;
    taskId: string;
    transportExecuted: boolean;
    verificationAttemptId: string;
    walletAddress: string;
  };
}

interface AttemptOnlyVerificationData {
  payload: {
    campaignId: string;
    diagnosticCodes: string[];
    outcome: "failed" | "manual_review" | "pending";
    pointsAwarded: 0;
    status: "failed" | "manual_review" | "pending";
    taskId: string;
    verificationAttemptId: string;
    walletAddress: string;
  };
}

type AdminDecisionValue = "approved" | "needs_review" | "rejected";

interface AdminCampaignListData {
  campaigns: Array<{
    campaignId: string;
    ownerAddress: string;
    participantCount: number;
    projectId: string;
    status: string;
    taskCount: number;
  }>;
  repository: {
    adapterId: string;
    durable: boolean;
    repositoryId: string;
    storeId: string;
  };
}

interface AdminDecisionSummary {
  decidedAt: string;
  decision: AdminDecisionValue;
  decisionId: string;
  operatorRole: string;
  operatorSubject: string;
  reasonCode: string;
  snapshotFingerprint: string;
  version: number;
}

interface AdminDecisionDetail extends AdminDecisionSummary {
  note: string | null;
  payloadHash: string;
  traceId: string;
}

interface AdminQueueData {
  campaignId: string;
  items: Array<{
    campaignId: string;
    coverage: {
      completedTasks: number;
      evidenceCount: number;
      requiredTasks: number;
      totalTasks: number;
    };
    currentDecision: AdminDecisionSummary | null;
    currentFingerprint: string;
    eligible: boolean;
    participantId: string;
    rank: number | null;
    reviewState: string;
    riskFlags: string[];
    totalPoints: number;
    walletAddress: string;
  }>;
  summary: Record<string, number>;
}

interface AdminReviewDetailData {
  campaignId: string;
  currentDecision: AdminDecisionDetail | null;
  history: AdminDecisionDetail[];
  participantId: string;
  reviewState: string;
  snapshot: {
    campaignId: string;
    completions: Array<{ id: string; taskId: string }>;
    evidence: Array<{
      completionId: string | null;
      evidenceHash: string;
      evidenceRef: string | null;
      id: string;
      liveProviderExecuted?: true;
      taskId: string;
      verificationAttemptId?: string;
    }>;
    fingerprint: string;
    fingerprintVersion: string;
    participantId: string;
    tasks: Array<{ id: string }>;
  };
}

interface AdminDecisionReceiptData {
  campaignId: string;
  created: boolean;
  decisionId: string;
  participantId: string;
  snapshotFingerprint: string;
  version: number;
}

interface AdminWinnerRow {
  campaignId: string;
  decisionId: string;
  decisionVersion: number;
  evidenceHashes: string[];
  participantId: string;
  rank: number | null;
  snapshotFingerprint: string;
  totalPoints: number;
  walletAddress: string;
}

interface AdminWinnerData {
  campaignId: string;
  rows: AdminWinnerRow[];
  sourceFingerprint: string;
  sourceVersion: string;
}

interface AdminArtifactMetadata {
  artifactId: string;
  campaignId: string;
  contentBytes: number;
  contentHash: string;
  createdAt: string;
  creatorRole: string;
  creatorSubject: string;
  fileName: string;
  format: "csv" | "json";
  mimeType: string;
  rowCount: number;
  sourceFingerprint: string;
  sourceVersion: string;
  traceId: string;
}

interface AdminArtifactReceiptData {
  artifact: AdminArtifactMetadata;
  created: boolean;
}

interface AdminArtifactListData {
  artifacts: AdminArtifactMetadata[];
  campaignId: string;
}

interface AdminArtifactDetailData {
  artifact: AdminArtifactMetadata;
  sourceManifest: Record<string, unknown> & { rows?: AdminWinnerRow[] };
}

interface AdminDownloadResult {
  bytes: Buffer;
  contentDisposition: string | null;
  contentHash: string | null;
  contentLength: string | null;
  mimeType: string | null;
  status: number;
}

const isLoopback = (hostname: string) => {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  return normalized === "localhost" || normalized === "::1" || normalized.startsWith("127.");
};

interface ApiResult<T> {
  envelope: ApiEnvelope<T>;
  status: number;
}

interface NegativeApiContract {
  diagnosticCode: string;
  field: string;
  outerCode: string;
  status: number;
  traceId: string;
}

interface ParticipantJourneyRowCounts {
  completionRows: number;
  evidenceRows: number;
  participantRows: number;
}

interface AdminDurableRowCounts {
  artifactRows: number;
  decisionRows: number;
}

interface IssuedWalletSession {
  data: WalletSessionData;
  headers: (
    traceId: string,
    overrides?: Record<string, string>,
  ) => Record<string, string>;
}

type IssuedSessionRole = "participant" | "project_owner" | "review_operator";

const percentile95 = (samples: readonly number[]) => {
  const sorted = [...samples].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);

  return sorted[index] ?? Number.POSITIVE_INFINITY;
};

const summarizeTimings = (samples: readonly number[]) => {
  const sorted = [...samples].sort((left, right) => left - right);
  const percentile = (ratio: number) =>
    sorted[Math.max(0, Math.ceil(sorted.length * ratio) - 1)] ?? Number.POSITIVE_INFINITY;

  return {
    maxMs: sorted[sorted.length - 1] ?? Number.POSITIVE_INFINITY,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    samples: sorted.length,
  };
};

const timestampMillis = (value: unknown) =>
  value instanceof Date ? value.getTime() : Date.parse(String(value));

integrationSuite("PostgreSQL Campaign API runtime", () => {
  interface ProviderTransportStats {
    callCount: number;
  }

  const databaseName = `campaign_os_m239_${process.pid}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const adminOperatorAddress = `2F4PostgresReview${randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const shutdownTimings: number[] = [];
  const timings: number[] = [];
  const servers = new Set<CampaignOsApiServerHandle>();
  const transports = new Set<ProviderHttpFetchTransport>();
  const transportByServer = new WeakMap<CampaignOsApiServerHandle, ProviderHttpFetchTransport>();
  const transportStats = new WeakMap<ProviderHttpFetchTransport, ProviderTransportStats>();
  let adminPool: pg.Pool;
  let databaseUrl = "";
  let providerSandbox: ProviderVerificationSandboxHandle | undefined;
  let sslMode = "verify-full";

  const recordTiming = async <T>(
    operation: () => Promise<T>,
    timingSamples: number[] = timings,
  ) => {
    const startedAt = performance.now();

    try {
      return await operation();
    } finally {
      timingSamples.push(performance.now() - startedAt);
    }
  };

  const requestApi = async <T>(
    server: CampaignOsApiServerHandle,
    path: string,
    init: RequestInit = {},
    timingSamples: number[] = timings,
  ): Promise<ApiResult<T>> => recordTiming(async () => {
    const response = await fetch(`${server.url}${path}`, init);
    const envelope = await response.json() as ApiEnvelope<T>;

    return { envelope, status: response.status };
  }, timingSamples);

  const requestJson = async <T>(
    server: CampaignOsApiServerHandle,
    path: string,
    init: RequestInit = {},
    timingSamples: number[] = timings,
  ): Promise<T> => {
    const { envelope, status } = await requestApi<T>(server, path, init, timingSamples);

    if (status !== 200 || !envelope.ok || !envelope.data) {
      throw new Error(
        `PostgreSQL integration API request failed with status ${status}`
        + `, code ${envelope.error?.code ?? "unknown"}`
        + `, diagnostic ${envelope.error?.details?.diagnosticCode ?? "unknown"}`
        + `, and operation ${envelope.error?.details?.operation ?? "unknown"}.`,
      );
    }

    return envelope.data;
  };

  const requestAdminJson = async <T>(
    server: CampaignOsApiServerHandle,
    path: string,
    init: RequestInit = {},
    expectedStatuses: readonly number[] = [200],
    timingSamples: number[] = timings,
  ) => {
    const result = await requestApi<T>(server, path, init, timingSamples);

    if (
      !expectedStatuses.includes(result.status)
      || !result.envelope.ok
      || !result.envelope.data
    ) {
      throw new Error(
        `PostgreSQL Admin integration request failed with status ${result.status}`
        + ` and diagnostic ${result.envelope.error?.details?.diagnosticCode ?? "unknown"}.`,
      );
    }

    return {
      data: result.envelope.data,
      status: result.status,
      traceId: result.envelope.traceId,
    };
  };

  const requestAdminDownload = async (
    server: CampaignOsApiServerHandle,
    path: string,
    headers: Record<string, string>,
  ): Promise<AdminDownloadResult> => recordTiming(async () => {
    const response = await fetch(`${server.url}${path}`, { headers });

    return {
      bytes: Buffer.from(await response.arrayBuffer()),
      contentDisposition: response.headers.get("content-disposition"),
      contentHash: response.headers.get("x-campaign-os-content-sha256"),
      contentLength: response.headers.get("content-length"),
      mimeType: response.headers.get("content-type"),
      status: response.status,
    };
  });

  const issueWalletSession = async (
    server: CampaignOsApiServerHandle,
    input: {
      adapterName?:
        | "PortkeyAAWallet"
        | "PortkeyAgentSkill"
        | "PortkeyDiscoverWallet"
        | "PortkeyExtensionWallet";
      address?: string;
      fixtureId?: string;
      internalAgent?: boolean;
      productionRequired?: boolean;
      verifiedProofExpected?: boolean;
    },
    traceId: string,
    role: IssuedSessionRole,
  ): Promise<IssuedWalletSession> => {
    const now = Date.now();
    const body = input.fixtureId
      ? {
          fixtureId: input.fixtureId,
          productionRequired: input.productionRequired,
          proofEvaluatedAt: new Date(now).toISOString(),
          proofIssuedAt: new Date(now - 1_000).toISOString(),
          signature: randomUUID(),
        }
      : {
          adapterName: input.adapterName ?? "PortkeyAAWallet",
          address: input.address,
          chainId: "AELF",
          internalAgent: input.internalAgent,
          network: "mainnet",
          productionRequired: input.productionRequired,
          proofEvaluatedAt: new Date(now).toISOString(),
          proofIssuedAt: new Date(now - 1_000).toISOString(),
          signature: randomUUID(),
        };
    const data = await requestJson<WalletSessionData>(server, "/api/wallet/session", {
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        "x-campaign-os-trace-id": traceId,
      },
      method: "POST",
    });

    expect(data.payload.sessionId).toBe(data.payload.id);
    expect(data.payload.address).not.toHaveLength(0);
    if (!input.productionRequired && input.verifiedProofExpected !== false) {
      expect(data.payload.proof).toMatchObject({ status: "verified" });
      expect(data.payload.issuer).toMatchObject({ valid: true });
    }

    return {
      data,
      headers: (requestTraceId, overrides = {}) => ({
        "content-type": "application/json",
        "x-campaign-os-account-type": data.payload.accountType,
        "x-campaign-os-credential-boundary": "ordinary_user_wallet",
        "x-campaign-os-proof-status": data.payload.proof?.status ?? "proof_required",
        "x-campaign-os-roles": role,
        "x-campaign-os-session-id": data.payload.sessionId,
        "x-campaign-os-trace-id": requestTraceId,
        "x-campaign-os-wallet-address": data.payload.address,
        "x-campaign-os-wallet-source": data.payload.walletSource,
        ...overrides,
      }),
    };
  };

  const issueProjectOwnerSession = (
    server: CampaignOsApiServerHandle,
    input: Parameters<typeof issueWalletSession>[1],
    traceId: string,
  ) => issueWalletSession(server, input, traceId, "project_owner");

  const issueParticipantSession = (
    server: CampaignOsApiServerHandle,
    input: Parameters<typeof issueWalletSession>[1],
    traceId: string,
  ) => issueWalletSession(server, input, traceId, "participant");

  const issueAdminSession = (
    server: CampaignOsApiServerHandle,
    input: Parameters<typeof issueWalletSession>[1],
    traceId: string,
  ) => issueWalletSession(server, input, traceId, "review_operator");

  const startServer = async (
    selectedDatabaseUrl = databaseUrl,
    connectTimeoutMs = "5000",
  ) => {
    if (!providerSandbox) {
      throw new Error("Provider acceptance sandbox prerequisite is unavailable.");
    }
    const env: Record<string, string | undefined> = {
      CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON: JSON.stringify([{
        active: true,
        campaignIds: null,
        roleIds: ["review_operator"],
        subjectAddress: adminOperatorAddress,
      }]),
      CAMPAIGN_OS_ADMIN_REVIEW_ENABLED: "true",
      CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
      CAMPAIGN_OS_DATABASE_CONNECT_TIMEOUT_MS: connectTimeoutMs,
      CAMPAIGN_OS_DATABASE_IDLE_TIMEOUT_MS: "5000",
      CAMPAIGN_OS_DATABASE_POOL_MAX: "10",
      CAMPAIGN_OS_DATABASE_SSL_MODE: sslMode,
      CAMPAIGN_OS_DATABASE_URL: selectedDatabaseUrl,
      CAMPAIGN_OS_PARTICIPANT_PREVIEW_CAMPAIGN_IDS: "*",
      CAMPAIGN_OS_TASK_VERIFICATION_BINDINGS_JSON: JSON.stringify(
        CONTROLLED_TASK_VERIFICATION_BINDINGS,
      ),
      CAMPAIGN_OS_TASK_VERIFICATION_ENABLEMENT: "explicitly-enabled",
      [STAGE_PROVIDER_URL_ENV]: providerSandbox.verifyUrl,
    };
    const taskVerificationConfig = resolveTaskVerificationConfig({
      bindingsJson: env.CAMPAIGN_OS_TASK_VERIFICATION_BINDINGS_JSON,
      enablement: env.CAMPAIGN_OS_TASK_VERIFICATION_ENABLEMENT,
      env,
      environment: "local",
      providerHttpTransportProvided: true,
    });
    if (
      !taskVerificationConfig.enabled
      || !taskVerificationConfig.hasLiveBindings
      || !taskVerificationConfig.valid
    ) {
      throw new Error("Provider acceptance prerequisite configuration is invalid.");
    }
    const onChainResolver = createProviderHttpExecutionMaterialResolver({
      binding: CONTROLLED_ON_CHAIN_BINDING,
      environment: "local",
      lookup: { get: (key) => env[key] },
    });
    const dappApiResolver = createProviderHttpExecutionMaterialResolver({
      binding: CONTROLLED_DAPP_API_BINDING,
      environment: "local",
      lookup: { get: (key) => env[key] },
    });
    const materialResolver: ProviderHttpExecutionMaterialResolver = (
      plan,
      requestMaterial,
      context,
    ) => (plan.verificationType === "DAPP_API" ? dappApiResolver : onChainResolver)(
      plan,
      requestMaterial,
      context,
    );
    const stats: ProviderTransportStats = { callCount: 0 };
    const transport = createProviderHttpFetchTransport({
      drainTimeoutMs: 2_000,
      fetch: (input, init) => {
        stats.callCount += 1;
        return globalThis.fetch(input, init);
      },
      materialResolver,
    });
    transportStats.set(transport, stats);
    transports.add(transport);
    let server: CampaignOsApiServerHandle;
    try {
      server = await startCampaignOsApiServer({
        env,
        logger: false,
        port: 0,
        runtimeFactory: (options) => createCampaignOsApiRuntime({
          ...options,
          taskVerificationConfig,
          taskVerificationProviderRuntime: CONTROLLED_TASK_VERIFICATION_PROVIDER_RUNTIME,
        }),
        shutdownTimeoutMs: 10_000,
        taskVerificationTransport: transport,
      });
    } catch (error) {
      await transport.close();
      transports.delete(transport);
      throw error;
    }

    servers.add(server);
    transportByServer.set(server, transport);
    return server;
  };

  const stopServer = async (server: CampaignOsApiServerHandle) => {
    await recordTiming(() => server.stop(), shutdownTimings);
    servers.delete(server);
    const transport = transportByServer.get(server);
    if (transport) {
      const closeResult = await transport.close();
      const state = transport.state();
      if (
        closeResult.status !== "drained"
        || closeResult.activeCallCount !== 0
        || state.accepting
        || state.activeCallCount !== 0
      ) {
        throw new Error("Provider acceptance transport did not drain during server shutdown.");
      }
      transports.delete(transport);
    }
  };

  const requireServerTransport = (server: CampaignOsApiServerHandle) => {
    const transport = transportByServer.get(server);
    if (!transport) {
      throw new Error("Provider acceptance server transport is unavailable.");
    }
    return transport;
  };

  const requireServerTransportStats = (server: CampaignOsApiServerHandle) => {
    const stats = transportStats.get(requireServerTransport(server));
    if (!stats) {
      throw new Error("Provider acceptance transport stats are unavailable.");
    }
    return stats;
  };

  const waitForSandboxState = async (
    predicate: (sandbox: ProviderVerificationSandboxHandle) => boolean,
    timeoutMs = 2_000,
  ) => {
    const startedAt = performance.now();
    while (performance.now() - startedAt <= timeoutMs) {
      if (providerSandbox && predicate(providerSandbox)) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("Provider acceptance sandbox state did not settle within the deadline.");
  };

  const waitForRuntimeDatabaseConnectionsToClose = async () => {
    const startedAt = performance.now();
    let activeConnectionCount = Number.POSITIVE_INFINITY;

    while (performance.now() - startedAt <= 10_000) {
      const result = await adminPool.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM pg_stat_activity WHERE datname = $1",
        [databaseName],
      );
      activeConnectionCount = Number(result.rows[0]?.count ?? Number.POSITIVE_INFINITY);
      if (activeConnectionCount === 0) {
        return performance.now() - startedAt;
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw new Error(
      `PostgreSQL runtime pool did not close within 10000 ms (${activeConnectionCount} connections remain).`,
    );
  };

  const createAuditPool = () => {
    const config = resolveCampaignOsCampaignDbConfig({
      databaseUrl,
      env: {},
      mode: "postgres",
      sslMode,
    });

    if (config.mode !== "postgres") {
      throw new Error("PostgreSQL audit config did not resolve PostgreSQL mode.");
    }

    return new pg.Pool(config.pool);
  };

  const readParticipantJourneyRowCounts = async (): Promise<ParticipantJourneyRowCounts> => {
    const pool = createAuditPool();

    try {
      const result = await pool.query<{
        completion_count: string;
        evidence_count: string;
        participant_count: string;
      }>(`
        SELECT
          (SELECT COUNT(*)::text FROM campaign_os.campaign_participants) AS participant_count,
          (SELECT COUNT(*)::text FROM campaign_os.campaign_task_completions) AS completion_count,
          (SELECT COUNT(*)::text FROM campaign_os.campaign_task_evidence) AS evidence_count
      `);
      const row = result.rows[0];

      if (!row) {
        throw new Error("PostgreSQL acceptance row-count query returned no row.");
      }

      return {
        completionRows: Number(row.completion_count),
        evidenceRows: Number(row.evidence_count),
        participantRows: Number(row.participant_count),
      };
    } finally {
      await pool.end();
    }
  };

  const readAdminDurableRowCounts = async (
    campaignId: string,
  ): Promise<AdminDurableRowCounts> => {
    const pool = createAuditPool();

    try {
      const result = await pool.query<{
        artifact_count: string;
        decision_count: string;
      }>(`
        SELECT
          (SELECT COUNT(*)::text
             FROM campaign_os.campaign_review_decisions
            WHERE campaign_id = $1) AS decision_count,
          (SELECT COUNT(*)::text
             FROM campaign_os.campaign_export_artifacts
            WHERE campaign_id = $1) AS artifact_count
      `, [campaignId]);
      const row = result.rows[0];

      if (!row) {
        throw new Error("PostgreSQL Admin row-count query returned no row.");
      }

      return {
        artifactRows: Number(row.artifact_count),
        decisionRows: Number(row.decision_count),
      };
    } finally {
      await pool.end();
    }
  };

  const expectNegativeCaseNoParticipantJourneyWrite = async <T>(
    caseName: string,
    expected: NegativeApiContract,
    request: () => Promise<ApiResult<T>>,
  ) => {
    const before = await readParticipantJourneyRowCounts();
    const result = await request();
    const after = await readParticipantJourneyRowCounts();

    expect.soft(after, `${caseName}: Participant/Completion/Evidence row counts`).toEqual(before);
    expect.soft(result.status, `${caseName}: HTTP status`).toBe(expected.status);
    expect.soft(result.envelope.ok, `${caseName}: envelope ok`).toBe(false);
    expect.soft(result.envelope.error?.code, `${caseName}: outer code`).toBe(expected.outerCode);
    expect.soft(
      result.envelope.error?.details?.diagnosticCode,
      `${caseName}: diagnostic code`,
    ).toBe(expected.diagnosticCode);
    expect.soft(result.envelope.traceId, `${caseName}: Trace ID`).toBe(expected.traceId);
    expect.soft(result.envelope.error?.details?.field, `${caseName}: field`).toBe(expected.field);

    return result;
  };

  const readCampaignSnapshot = async (pool: pg.Pool, campaignId: string) => {
    const [campaigns, tasks, participants, completions, evidence, referrals, verificationAttempts] =
      await Promise.all([
      pool.query(
        `
          SELECT
            id,
            project_id,
            owner_address,
            status,
            default_locale,
            supported_locales,
            wallet_policy,
            contract_mode,
            goal,
            duration,
            reward_description,
            start_time,
            end_time,
            created_at,
            updated_at
          FROM campaign_os.campaigns
          WHERE id = $1
          ORDER BY id
        `,
        [campaignId],
      ),
      pool.query(
        `
          SELECT
            id,
            campaign_id,
            template_code,
            verification_type,
            wallet_compatibility,
            points,
            required,
            evidence_rule,
            created_at,
            updated_at
          FROM campaign_os.campaign_tasks
          WHERE campaign_id = $1
          ORDER BY id
        `,
        [campaignId],
      ),
      pool.query(
        `
          SELECT
            id,
            campaign_id,
            wallet_address,
            account_type,
            wallet_source,
            total_points,
            rank,
            risk_flags,
            wallet_type_verified,
            created_at,
            updated_at
          FROM campaign_os.campaign_participants
          WHERE campaign_id = $1
          ORDER BY wallet_address
        `,
        [campaignId],
      ),
      pool.query(
        `
          SELECT
            id,
            campaign_id,
            task_id,
            wallet_address,
            status,
            points_awarded,
            verification_attempt_id,
            created_at,
            updated_at
          FROM campaign_os.campaign_task_completions
          WHERE campaign_id = $1
          ORDER BY wallet_address, task_id
        `,
        [campaignId],
      ),
      pool.query(
        `
          SELECT
            id,
            campaign_id,
            task_id,
            wallet_address,
            completion_id,
            evidence_hash,
            evidence_ref,
            evidence_source,
            live_provider_executed,
            verification_attempt_id,
            created_at,
            updated_at
          FROM campaign_os.campaign_task_evidence
          WHERE campaign_id = $1
          ORDER BY wallet_address, task_id
        `,
        [campaignId],
      ),
      pool.query(
        `
          SELECT id, campaign_id, invitee_wallet_address, referrer_wallet_address, status, created_at, updated_at
          FROM campaign_os.campaign_referral_bindings
          WHERE campaign_id = $1
          ORDER BY invitee_wallet_address
        `,
        [campaignId],
      ),
      pool.query(
        `
          SELECT
            id,
            campaign_id,
            task_id,
            wallet_address,
            status,
            dispatch_state,
            attempt_count,
            max_attempts,
            external_dispatch_limit,
            evidence_hash,
            evidence_ref,
            evidence_source,
            completed_at,
            created_at,
            updated_at
          FROM campaign_os.verification_attempts
          WHERE campaign_id = $1
          ORDER BY wallet_address, task_id
        `,
        [campaignId],
      ),
    ]);

    return {
      campaigns: campaigns.rows,
      completions: completions.rows,
      evidence: evidence.rows,
      participants: participants.rows,
      referrals: referrals.rows,
      tasks: tasks.rows,
      verificationAttempts: verificationAttempts.rows,
    };
  };

  const readCampaignSnapshotFromDatabase = async (campaignId: string) => {
    const pool = createAuditPool();

    try {
      return await readCampaignSnapshot(pool, campaignId);
    } finally {
      await pool.end();
    }
  };

  beforeAll(async () => {
    providerSandbox = await startProviderVerificationSandbox({
      host: "127.0.0.1",
      oversizedResponseBytes: 64 * 1_024,
      port: 0,
      shutdownTimeoutMs: 1_000,
      streamChunkBytes: 4 * 1_024,
      streamIntervalMs: 2,
      timeoutFixtureMs: 10_000,
    });
    const baseUrl = new URL(TEST_DATABASE_URL!);
    sslMode = process.env.CAMPAIGN_OS_DATABASE_SSL_MODE?.trim()
      || (isLoopback(baseUrl.hostname) ? "disable" : "verify-full");
    const baseConfig = resolveCampaignOsCampaignDbConfig({
      databaseUrl: TEST_DATABASE_URL,
      env: {},
      mode: "postgres",
      sslMode,
    });

    if (baseConfig.mode !== "postgres") {
      throw new Error("PostgreSQL integration config did not resolve PostgreSQL mode.");
    }

    adminPool = new pg.Pool(baseConfig.pool);
    if (!/^[a-z0-9_]+$/.test(databaseName)) {
      throw new Error("Generated PostgreSQL integration database name is invalid.");
    }
    await adminPool.query(`CREATE DATABASE "${databaseName}"`);

    const isolatedUrl = new URL(TEST_DATABASE_URL!);
    isolatedUrl.pathname = `/${databaseName}`;
    isolatedUrl.search = "";
    databaseUrl = isolatedUrl.toString();
    const isolatedConfig = resolveCampaignOsCampaignDbConfig({
      databaseUrl,
      env: {},
      mode: "postgres",
      sslMode,
    });
    if (isolatedConfig.mode !== "postgres") {
      throw new Error("Isolated PostgreSQL integration config did not resolve PostgreSQL mode.");
    }

    const migrationPool = new pg.Pool(isolatedConfig.pool);
    const migrationAdapter: PostgresMigrationPool = {
      connect: async () => {
        const client = await migrationPool.connect();

        return {
          query: async (text, values = []) => {
            const result = await client.query(text, [...values]);

            return { rows: result.rows as Array<Record<string, unknown>> };
          },
          release: () => client.release(),
        };
      },
      end: async () => migrationPool.end(),
    };

    try {
      const migrations = await loadPostgresMigrations();

      expect(migrations.map(({ id }) => id)).toEqual([
        "0001_campaign_runtime",
        "0002_admin_review_export",
        "0003_admin_review_rank_projection",
        "0004_live_provider_task_verification",
      ]);
      const migration = await runPostgresMigrations({
        approved: true,
        migrations,
        mode: "apply",
        pool: migrationAdapter,
        traceId: "m239-postgres-runtime-integration-migration",
      });

      expect(migration.status).toBe("ready");
      expect(migration.appliedMigrationIds).toEqual([
        "0001_campaign_runtime",
        "0002_admin_review_export",
        "0003_admin_review_rank_projection",
        "0004_live_provider_task_verification",
      ]);
      expect(migration.pendingMigrationIds).toEqual([]);
    } finally {
      await migrationPool.end();
    }
  }, 60_000);

  afterAll(async () => {
    const cleanupErrors: unknown[] = [];
    const stopResults = await Promise.allSettled(
      Array.from(servers, (server) => server.stop()),
    );
    cleanupErrors.push(...stopResults
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => result.reason));
    servers.clear();

    const transportResults = await Promise.allSettled(
      Array.from(transports, (transport) => transport.close()),
    );
    cleanupErrors.push(...transportResults
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => result.reason));
    transports.clear();

    if (providerSandbox) {
      try {
        await providerSandbox.close();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }

    if (adminPool) {
      try {
        await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
      } catch (error) {
        cleanupErrors.push(error);
      }

      try {
        await adminPool.end();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }

    if (cleanupErrors.length > 0) {
      throw new Error(`PostgreSQL integration cleanup failed (${cleanupErrors.length} errors).`);
    }
  }, 60_000);

  it("executes the configured PostgreSQL acceptance suite instead of skipping", () => {
    expect(TEST_DATABASE_URL).toBeTruthy();
    if (REQUIRE_POSTGRES_TESTS) {
      expect(TEST_DATABASE_URL).toBeDefined();
    }
    if (REQUIRE_PROVIDER_TESTS) {
      expect(REQUIRE_POSTGRES_TESTS).toBe(true);
      expect(providerSandbox?.state()).toMatchObject({
        accepting: true,
        lifecycle: "listening",
      });
    }
  });

  it("recovers canonical Owner, Participant, Admin, and artifact facts after a full PostgreSQL restart", async () => {
    expect(CONTROLLED_TASK_VERIFICATION_PROVIDER_RUNTIME).toMatchObject({
      status: "activated",
      transportProvided: true,
      valid: true,
    });
    expect(CONTROLLED_TASK_VERIFICATION_BINDINGS).toHaveLength(2);
    expect(CONTROLLED_TASK_VERIFICATION_BINDINGS.every(
      ({ endpointEnvKey }) => endpointEnvKey === STAGE_PROVIDER_URL_ENV,
    )).toBe(true);
    const runtimeWriteWindowStartedAt = Date.now();
    const firstServer = await startServer();
    const firstTransport = requireServerTransport(firstServer);
    const sessionA = await issueProjectOwnerSession(
      firstServer,
      { fixtureId: "sess-aa-001" },
      "trace-pg-session-a",
    );
    const ownerAddress = sessionA.data.payload.address;
    const created = await requestJson<CampaignCreateData>(firstServer, "/api/campaigns", {
      body: JSON.stringify({
        contractMode: "OFF_CHAIN_MVP",
        defaultLocale: "en-US",
        duration: "2026-08-01/2026-08-14",
        endTime: "2026-08-14T23:59:59Z",
        goal: "Review PostgreSQL restart recovery",
        ownerAddress,
        projectId: "postgres-restart-project",
        rewardDescription: "PostgreSQL-backed review rewards.",
        startTime: "2026-08-01T00:00:00Z",
        supportedLocales: ["en-US", "zh-CN"],
        walletPolicy: "ANY",
      }),
      headers: sessionA.headers("trace-pg-runtime-create"),
      method: "POST",
    });
    const campaignId = created.payload.id;
    const task = await requestJson<TaskCreateData>(firstServer, `/api/campaigns/${campaignId}/tasks`, {
      body: JSON.stringify({
        evidenceRule: controlledOnChainEvidenceRule({ minAmount: 1, source: "AELFSCAN" }),
        points: 120,
        required: true,
        templateCode: "bridge_ebridge",
        verificationType: "ON_CHAIN",
        walletCompatibility: "ANY",
      }),
      headers: sessionA.headers("trace-pg-runtime-task"),
      method: "POST",
    });
    const taskId = task.campaignDbTask.taskId;
    expect(task.payload.evidenceRule).toMatchObject({
      expectedField: "verified",
      expectedType: "boolean",
      expectedValue: true,
      providerBindingId: CONTROLLED_ON_CHAIN_BINDING_ID,
      source: "AELFSCAN",
    });
    const previewDbBefore = await (async () => {
      const pool = createAuditPool();

      try {
        return await readCampaignSnapshot(pool, campaignId);
      } finally {
        await pool.end();
      }
    })();
    const previewHealthBefore = await requestJson<HealthData>(firstServer, "/api/health");
    expect(previewHealthBefore.campaignDatabase).toMatchObject({
      campaignStore: {
        appliedMigrationIds: expect.arrayContaining(["0004_live_provider_task_verification"]),
        migrationStatus: "ready",
        mode: "postgres",
        schemaVersion: "0004_live_provider_task_verification",
        status: "ready",
      },
      selectedMode: "postgres",
      status: "ready",
    });
    expect(previewHealthBefore.taskVerificationRuntime).toEqual({
      bindingCount: 2,
      enabled: true,
      providerStatus: "configured",
      requiredSchemaVersion: "0004_live_provider_task_verification",
      schemaStatus: "ready",
      status: "ready",
    });
    const generated = await requestJson<GeneratedTasksData>(
      firstServer,
      `/api/campaigns/${campaignId}/tasks/generate`,
      {
        body: JSON.stringify({
          goal: created.payload.goal,
          product: "Campaign OS",
          targetUsers: ["project owners"],
          walletPolicy: created.payload.walletPolicy,
        }),
        headers: sessionA.headers("trace-pg-runtime-generate"),
        method: "POST",
      },
    );
    const supportedSuggestion = generated.payload.taskList.find(
      (suggestion) => suggestion.adoptability === "adoptable"
        && suggestion.verificationType === "ON_CHAIN"
        && !suggestion.required,
    ) ?? generated.payload.taskList.find(
      (suggestion) => suggestion.adoptability === "adoptable"
        && suggestion.verificationType === "ON_CHAIN",
    );
    const referralSuggestion = generated.payload.taskList.find(
      (suggestion) => suggestion.verificationType === "REFERRAL",
    );

    expect(supportedSuggestion).toBeDefined();
    expect(referralSuggestion).toMatchObject({
      adoptability: "unsupported",
      unsupportedReason: "REFERRAL_TASK_ADD_UNSUPPORTED",
    });

    const referralBypass = await expectNegativeCaseNoParticipantJourneyWrite(
      "unsupported referral Task bypass",
      {
        diagnosticCode: "INVALID_REQUEST",
        field: "verificationType",
        outerCode: "INVALID_REQUEST",
        status: 400,
        traceId: "trace-pg-runtime-referral-bypass",
      },
      () => requestApi(
        firstServer,
        `/api/campaigns/${campaignId}/tasks`,
        {
          body: JSON.stringify({
            evidenceRule: referralSuggestion?.evidenceRule ?? { source: "REFERRAL" },
            points: referralSuggestion?.points ?? 25,
            required: referralSuggestion?.required ?? false,
            templateCode: referralSuggestion?.templateCode ?? "invite_friend",
            verificationType: "REFERRAL",
            walletCompatibility: referralSuggestion?.walletCompatibility ?? "ANY",
          }),
          headers: sessionA.headers("trace-pg-runtime-referral-bypass"),
          method: "POST",
        },
      ),
    );
    const previewHealthAfter = await requestJson<HealthData>(firstServer, "/api/health");
    const previewDbAfter = await (async () => {
      const pool = createAuditPool();

      try {
        return await readCampaignSnapshot(pool, campaignId);
      } finally {
        await pool.end();
      }
    })();

    expect(generated.payload).toMatchObject({
      campaignId,
      humanReviewRequired: true,
    });
    expect(previewDbAfter).toEqual(previewDbBefore);
    expect(previewHealthAfter.persistence).toEqual(previewHealthBefore.persistence);
    expect(previewHealthAfter.backendService.providerClientReadiness).toEqual(
      previewHealthBefore.backendService.providerClientReadiness,
    );
    expect(previewHealthAfter.apiService.workerExecutionEnabled).toBe(false);
    expect(previewHealthAfter.backendService.providerClientReadiness).toMatchObject({
      liveProviderCallsAttempted: false,
      providerClientsEnabled: false,
      providerHttpRuntime: { liveHttpCallsAttempted: false },
    });
    expect(referralBypass).toMatchObject({
      status: 400,
      envelope: {
        ok: false,
        traceId: "trace-pg-runtime-referral-bypass",
        error: {
          code: "INVALID_REQUEST",
          details: { field: "verificationType" },
        },
      },
    });

    if (!supportedSuggestion) {
      throw new Error("Expected at least one supported generated Task suggestion.");
    }
    const adoptedTask = await requestJson<TaskCreateData>(
      firstServer,
      `/api/campaigns/${campaignId}/tasks`,
      {
        body: JSON.stringify({
          evidenceRule: controlledDappApiEvidenceRule({ action: "completed" }),
          points: supportedSuggestion.points,
          required: false,
          templateCode: "provider_dapp_completed",
          verificationType: "DAPP_API",
          walletCompatibility: "ANY",
        }),
        headers: sessionA.headers("trace-pg-runtime-adopt"),
        method: "POST",
      },
    );
    const adoptedTaskId = adoptedTask.campaignDbTask.taskId;
    expect(adoptedTask.payload.evidenceRule).toMatchObject({
      providerBindingId: CONTROLLED_DAPP_API_BINDING_ID,
      source: "DAPP_API",
    });
    const policyCampaign = await requestJson<CampaignCreateData>(firstServer, "/api/campaigns", {
      body: JSON.stringify({
        duration: "2026-08-15/2026-08-28",
        endTime: "2026-08-28T23:59:59Z",
        goal: "Exercise Participant wallet policy",
        ownerAddress,
        projectId: "postgres-policy-project",
        rewardDescription: "This draft exercises wallet compatibility.",
        startTime: "2026-08-15T00:00:00Z",
        walletPolicy: "EOA_ONLY",
      }),
      headers: sessionA.headers("trace-pg-policy-create"),
      method: "POST",
    });
    const policyTask = await requestJson<TaskCreateData>(
      firstServer,
      `/api/campaigns/${policyCampaign.payload.id}/tasks`,
      {
        body: JSON.stringify({
          evidenceRule: controlledOnChainEvidenceRule({ minAmount: 1, source: "AELFSCAN" }),
          points: 10,
          required: true,
          templateCode: "policy_campaign_task",
          verificationType: "ON_CHAIN",
          walletCompatibility: "ANY",
        }),
        headers: sessionA.headers("trace-pg-policy-task"),
        method: "POST",
      },
    );
    const anonymousFeed = await requestJson<CampaignListData>(firstServer, "/api/campaigns");
    const anonymousDetail = await expectNegativeCaseNoParticipantJourneyWrite(
      "anonymous repository draft detail",
      {
        diagnosticCode: "INVALID_CAMPAIGN",
        field: "campaignId",
        outerCode: "INVALID_CAMPAIGN",
        status: 404,
        traceId: "trace-pg-anonymous-draft-detail",
      },
      () => requestApi<DetailData>(firstServer, `/api/campaigns/${campaignId}`, {
        headers: { "x-campaign-os-trace-id": "trace-pg-anonymous-draft-detail" },
      }),
    );

    expect(anonymousFeed.payload.items.map((item) => item.id)).not.toContain(campaignId);
    expect(anonymousFeed.payload.items.map((item) => item.id)).not.toContain(policyCampaign.payload.id);
    expect(anonymousDetail).toMatchObject({
      status: 404,
      envelope: {
        ok: false,
        traceId: "trace-pg-anonymous-draft-detail",
        error: { code: "INVALID_CAMPAIGN" },
      },
    });

    const participantSessionA1 = await issueParticipantSession(
      firstServer,
      {
        adapterName: "PortkeyExtensionWallet",
        address: "3E9PostgresParticipantA",
      },
      "trace-pg-participant-a1-session",
    );
    const participantSessionB1 = await issueParticipantSession(
      firstServer,
      {
        adapterName: "PortkeyDiscoverWallet",
        address: "8A2PostgresParticipantB",
      },
      "trace-pg-participant-b1-session",
    );
    const walletAddress = participantSessionA1.data.payload.address;
    const walletBAddress = participantSessionB1.data.payload.address;
    const internalAgentSession = await issueParticipantSession(
      firstServer,
      { fixtureId: "sess-agent-skill-001", verifiedProofExpected: false },
      "trace-pg-internal-agent-session",
    );
    const aaParticipantSession = await issueParticipantSession(
      firstServer,
      { adapterName: "PortkeyAAWallet", address: "2F4PostgresAaParticipant" },
      "trace-pg-aa-participant-session",
    );
    const participantFeed = await requestJson<CampaignListData>(
      firstServer,
      "/api/participant/campaigns",
      { headers: participantSessionA1.headers("trace-pg-participant-feed") },
    );
    const zeroJourneyA = await requestJson<ParticipantJourneyData>(
      firstServer,
      `/api/participant/campaigns/${campaignId}/journey`,
      { headers: participantSessionA1.headers("trace-pg-participant-a-zero") },
    );
    const zeroJourneyB = await requestJson<ParticipantJourneyData>(
      firstServer,
      `/api/participant/campaigns/${campaignId}/journey`,
      { headers: participantSessionB1.headers("trace-pg-participant-b-zero") },
    );
    const exactCompatibilityClaims = await requestJson<EligibilityData>(
      firstServer,
      `/api/campaigns/${campaignId}/eligibility`
        + `?walletAddress=${encodeURIComponent(walletAddress)}`
        + `&accountType=${encodeURIComponent(participantSessionA1.data.payload.accountType)}`
        + `&walletSource=${encodeURIComponent(participantSessionA1.data.payload.walletSource)}`
        + "&chainId=AELF&network=mainnet",
      { headers: participantSessionA1.headers("trace-pg-participant-exact-compatibility") },
    );

    expect(new Set(participantFeed.payload.items.map(({ id }) => id))).toEqual(
      new Set([campaignId, policyCampaign.payload.id]),
    );
    expect(participantFeed.payload.items.find(({ id }) => id === campaignId)).toMatchObject({
      repository: expect.objectContaining({
        createdViaRepository: true,
        storeId: "campaign-db",
      }),
      status: "draft",
      visibility: "participant_preview",
    });
    expect(participantFeed.payload.participantPreview).toEqual({ campaignCount: 1, enabled: true });
    expect(exactCompatibilityClaims.payload).toMatchObject({
      eligible: false,
      score: 0,
      walletAddress,
    });
    for (const [journey, address] of [
      [zeroJourneyA, walletAddress],
      [zeroJourneyB, walletBAddress],
    ] as const) {
      expect(journey.payload).toMatchObject({
        campaign: { campaignId, status: "draft", taskCount: 2 },
        eligibility: { eligible: false, score: 0, walletAddress: address },
        participant: { participantId: null, totalPoints: 0, walletAddress: address },
        ranking: { participantCount: 0, rank: null, totalPoints: 0, walletAddress: address },
        repository: { createdViaRepository: true, storeId: "campaign-db" },
        visibility: "participant_preview",
      });
      expect(new Set(journey.payload.tasks.map((item) => item.taskId))).toEqual(
        new Set([taskId, adoptedTaskId]),
      );
      expect(journey.payload.tasks.every((item) =>
        item.campaignId === campaignId
        && item.completionId === null
        && item.evidenceId === null
        && item.status === "not_started")).toBe(true);
    }

    const bodyWalletSubstitution = await expectNegativeCaseNoParticipantJourneyWrite(
      "body wallet substitution",
      {
        diagnosticCode: "AUTH_SUBJECT_MISMATCH",
        field: "walletAddress",
        outerCode: "AUTH_SUBJECT_MISMATCH",
        status: 403,
        traceId: "trace-pg-participant-body-substitution",
      },
      () => requestApi(firstServer, `/api/tasks/${taskId}/verify`, {
        body: JSON.stringify({ campaignId, walletAddress: walletBAddress }),
        headers: participantSessionA1.headers("trace-pg-participant-body-substitution"),
        method: "POST",
      }),
    );
    const queryWalletSubstitution = await expectNegativeCaseNoParticipantJourneyWrite(
      "query wallet substitution",
      {
        diagnosticCode: "AUTH_SUBJECT_MISMATCH",
        field: "walletAddress",
        outerCode: "AUTH_SUBJECT_MISMATCH",
        status: 403,
        traceId: "trace-pg-participant-query-substitution",
      },
      () => requestApi(
        firstServer,
        `/api/tasks/${taskId}/verify?walletAddress=${encodeURIComponent(walletBAddress)}`,
        {
          body: JSON.stringify({ campaignId }),
          headers: participantSessionA1.headers("trace-pg-participant-query-substitution"),
          method: "POST",
        },
      ),
    );
    const caseVariantSubstitution = await expectNegativeCaseNoParticipantJourneyWrite(
      "case-variant wallet substitution",
      {
        diagnosticCode: "AUTH_SUBJECT_MISMATCH",
        field: "walletAddress",
        outerCode: "AUTH_SUBJECT_MISMATCH",
        status: 403,
        traceId: "trace-pg-participant-case-variant",
      },
      () => requestApi(firstServer, `/api/tasks/${taskId}/verify`, {
        body: JSON.stringify({ campaignId, walletAddress: walletAddress.toLowerCase() }),
        headers: participantSessionA1.headers("trace-pg-participant-case-variant"),
        method: "POST",
      }),
    );
    const missingParticipantSession = await expectNegativeCaseNoParticipantJourneyWrite(
      "missing Participant session",
      {
        diagnosticCode: "AUTH_SESSION_REQUIRED",
        field: "x-campaign-os-session-id",
        outerCode: "AUTH_SESSION_REQUIRED",
        status: 401,
        traceId: "trace-pg-participant-missing-session",
      },
      () => requestApi(firstServer, `/api/tasks/${taskId}/verify`, {
        body: JSON.stringify({ campaignId }),
        headers: {
          "content-type": "application/json",
          "x-campaign-os-trace-id": "trace-pg-participant-missing-session",
        },
        method: "POST",
      }),
    );
    const unknownParticipantSession = await expectNegativeCaseNoParticipantJourneyWrite(
      "unknown Participant session",
      {
        diagnosticCode: "AUTH_SESSION_INVALID",
        field: "x-campaign-os-session-id",
        outerCode: "AUTH_SESSION_INVALID",
        status: 401,
        traceId: "trace-pg-participant-unknown-session",
      },
      () => requestApi(firstServer, `/api/tasks/${taskId}/verify`, {
        body: JSON.stringify({ campaignId }),
        headers: participantSessionA1.headers("trace-pg-participant-unknown-session", {
          "x-campaign-os-session-id": "unissued-participant-session",
        }),
        method: "POST",
      }),
    );
    const internalParticipantCredential = await expectNegativeCaseNoParticipantJourneyWrite(
      "internal Participant credential",
      {
        diagnosticCode: "AUTH_FORBIDDEN",
        field: "authSession.credentialBoundary",
        outerCode: "AUTH_FORBIDDEN",
        status: 403,
        traceId: "trace-pg-participant-internal-credential",
      },
      () => requestApi(firstServer, `/api/tasks/${taskId}/verify`, {
        body: JSON.stringify({ campaignId }),
        headers: internalAgentSession.headers("trace-pg-participant-internal-credential", {
          "x-campaign-os-credential-boundary": "internal_agent_credential",
        }),
        method: "POST",
      }),
    );
    const walletPolicyMismatch = await expectNegativeCaseNoParticipantJourneyWrite(
      "wallet policy mismatch",
      {
        diagnosticCode: "INVALID_REQUEST",
        field: "accountType",
        outerCode: "INVALID_REQUEST",
        status: 400,
        traceId: "trace-pg-participant-wallet-policy-mismatch",
      },
      () => requestApi(
        firstServer,
        `/api/tasks/${policyTask.campaignDbTask.taskId}/verify`,
        {
          body: JSON.stringify({ campaignId: policyCampaign.payload.id }),
          headers: aaParticipantSession.headers("trace-pg-participant-wallet-policy-mismatch"),
          method: "POST",
        },
      ),
    );
    const crossCampaignTask = await expectNegativeCaseNoParticipantJourneyWrite(
      "cross-Campaign Task",
      {
        diagnosticCode: "INVALID_TASK",
        field: "taskId",
        outerCode: "INVALID_TASK",
        status: 404,
        traceId: "trace-pg-participant-cross-campaign",
      },
      () => requestApi(
        firstServer,
        `/api/tasks/${policyTask.campaignDbTask.taskId}/verify`,
        {
          body: JSON.stringify({ campaignId }),
          headers: participantSessionA1.headers("trace-pg-participant-cross-campaign"),
          method: "POST",
        },
      ),
    );
    for (const result of [
      bodyWalletSubstitution,
      queryWalletSubstitution,
      caseVariantSubstitution,
      missingParticipantSession,
      unknownParticipantSession,
      internalParticipantCredential,
      walletPolicyMismatch,
      crossCampaignTask,
    ]) {
      expect(result.envelope.data).toBeUndefined();
    }

    const providerCompletedBeforeA = providerSandbox!.count("completed");
    const transportCallsBeforeA = requireServerTransportStats(firstServer).callCount;
    const firstConcurrentVerifications = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      requestJson<VerificationData>(firstServer, `/api/tasks/${taskId}/verify`, {
        body: JSON.stringify({ campaignId }),
        headers: participantSessionA1.headers(`trace-pg-participant-a-first-${index}`),
        method: "POST",
      })));
    expect(providerSandbox!.count("completed") - providerCompletedBeforeA).toBe(1);
    expect(requireServerTransportStats(firstServer).callCount - transportCallsBeforeA).toBe(1);
    const firstVerification = firstConcurrentVerifications[0]!;
    const sequentialRetry = await requestJson<VerificationData>(firstServer, `/api/tasks/${taskId}/verify`, {
      body: JSON.stringify({ campaignId }),
      headers: participantSessionA1.headers("trace-pg-participant-a-sequential-retry"),
      method: "POST",
    });
    expect(providerSandbox!.count("completed") - providerCompletedBeforeA).toBe(1);
    expect(requireServerTransportStats(firstServer).callCount - transportCallsBeforeA).toBe(1);
    const participantAVerifications = [...firstConcurrentVerifications, sequentialRetry];

    expect(new Set(participantAVerifications.map(
      (item) => item.campaignDbCompletion.completionId,
    )).size).toBe(1);
    expect(new Set(participantAVerifications.map(
      (item) => item.campaignDbEvidence.evidenceId,
    )).size).toBe(1);
    expect(new Set(participantAVerifications.map(
      (item) => item.payload.verificationAttemptId,
    )).size).toBe(1);
    expect(participantAVerifications.every((item) =>
      item.payload.campaignId === campaignId
      && item.payload.liveProviderExecuted
      && item.payload.outcome === "completed"
      && item.payload.pointsAwarded === task.payload.points
      && item.payload.providerFamily === "aefinder"
      && item.payload.taskId === taskId
      && item.payload.transportExecuted
      && item.payload.walletAddress === walletAddress)).toBe(true);
    expect(firstVerification.campaignDbEvidence).toMatchObject({
      evidenceHash: firstVerification.payload.evidenceHash,
      evidenceRef: firstVerification.payload.evidenceRef,
      evidenceSource: "AELFSCAN",
      liveProviderExecuted: true,
    });
    expect(firstVerification.payload.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(firstVerification)).not.toContain("evidence-hash:");
    const participantAJourneyBeforeB = await requestJson<ParticipantJourneyData>(
      firstServer,
      `/api/participant/campaigns/${campaignId}/journey`,
      { headers: participantSessionA1.headers("trace-pg-participant-a-populated") },
    );
    expect(participantAJourneyBeforeB.payload).toMatchObject({
      eligibility: { eligible: true, missingTasks: [], score: task.payload.points },
      participant: { totalPoints: task.payload.points, walletAddress },
      ranking: { participantCount: 1, rank: 1, totalPoints: task.payload.points, walletAddress },
    });
    expect(participantAJourneyBeforeB.payload.tasks.find((item) => item.taskId === taskId)).toMatchObject({
      completionId: firstVerification.campaignDbCompletion.completionId,
      evidenceId: firstVerification.campaignDbEvidence.evidenceId,
      liveProviderExecuted: true,
      pointsAwarded: task.payload.points,
      status: "completed",
      verificationAttemptId: firstVerification.payload.verificationAttemptId,
    });
    expect(participantAJourneyBeforeB.payload.tasks.find(
      (item) => item.taskId === adoptedTaskId,
    )).toMatchObject({ status: "not_started" });
    const participantBVerification = await requestJson<VerificationData>(firstServer, `/api/tasks/${taskId}/verify`, {
      body: JSON.stringify({ campaignId }),
      headers: participantSessionB1.headers("trace-pg-participant-b-verify"),
      method: "POST",
    });
    expect(providerSandbox!.count("completed") - providerCompletedBeforeA).toBe(2);
    expect(requireServerTransportStats(firstServer).callCount - transportCallsBeforeA).toBe(2);
    const participantJourneyA = await requestJson<ParticipantJourneyData>(
      firstServer,
      `/api/participant/campaigns/${campaignId}/journey`,
      { headers: participantSessionA1.headers("trace-pg-participant-a-final") },
    );
    const participantJourneyB = await requestJson<ParticipantJourneyData>(
      firstServer,
      `/api/participant/campaigns/${campaignId}/journey`,
      { headers: participantSessionB1.headers("trace-pg-participant-b-final") },
    );
    const participantBEligibility = await requestJson<EligibilityData>(
      firstServer,
      `/api/campaigns/${campaignId}/eligibility`,
      { headers: participantSessionB1.headers("trace-pg-participant-b-eligibility") },
    );
    expect(participantBVerification.campaignDbCompletion.completionId).not.toBe(
      firstVerification.campaignDbCompletion.completionId,
    );
    expect(participantBVerification.campaignDbEvidence.evidenceId).not.toBe(
      firstVerification.campaignDbEvidence.evidenceId,
    );
    expect(JSON.stringify(participantJourneyA.payload)).not.toContain(
      participantBVerification.campaignDbCompletion.completionId,
    );
    expect(JSON.stringify(participantJourneyA.payload)).not.toContain(
      participantBVerification.campaignDbEvidence.evidenceId,
    );
    expect(JSON.stringify(participantJourneyB.payload)).not.toContain(
      firstVerification.campaignDbCompletion.completionId,
    );
    expect(JSON.stringify(participantJourneyB.payload)).not.toContain(
      firstVerification.campaignDbEvidence.evidenceId,
    );
    expect(participantBVerification.payload).toMatchObject({
      campaignId,
      pointsAwarded: task.payload.points,
      status: "completed",
      taskId,
      walletAddress: walletBAddress,
    });
    expect(participantJourneyB.payload.participant).toMatchObject({
      riskFlags: [],
      totalPoints: task.payload.points,
      walletAddress: walletBAddress,
    });
    expect(participantJourneyB.payload.eligibility).toMatchObject({
      eligible: true,
      missingTasks: [],
      riskFlags: [],
      score: task.payload.points,
      status: "eligible",
      walletAddress: walletBAddress,
    });
    expect(participantJourneyB.payload.tasks.find((item) => item.taskId === taskId)).toMatchObject({
      action: "completed",
      completionId: participantBVerification.campaignDbCompletion.completionId,
      evidenceId: participantBVerification.campaignDbEvidence.evidenceId,
      pointsAwarded: task.payload.points,
      status: "completed",
    });
    expect(participantBEligibility.payload).toMatchObject({
      campaignId,
      eligible: true,
      missingTasks: [],
      riskFlags: [],
      score: task.payload.points,
      status: "eligible",
      walletAddress: walletBAddress,
    });
    expect(participantJourneyA.payload.ranking).toMatchObject({ participantCount: 2, rank: 1 });
    expect(participantJourneyB.payload.ranking).toMatchObject({ participantCount: 2, rank: 2 });
    expect(participantJourneyA.payload.participant.totalPoints).toBe(participantJourneyA.payload.ranking.totalPoints);
    expect(participantJourneyB.payload.participant.totalPoints).toBe(participantJourneyB.payload.ranking.totalPoints);
    const eligibility = await requestJson<EligibilityData>(
      firstServer,
      `/api/campaigns/${campaignId}/eligibility`,
      { headers: participantSessionA1.headers("trace-pg-participant-a-eligibility") },
    );
    const participantARanking = await requestJson<RankingData>(
      firstServer,
      `/api/campaigns/${campaignId}/points-ranking-ledger-runtime`,
      { headers: participantSessionA1.headers("trace-pg-participant-a-ranking") },
    );
    const exportPreview = await requestJson<ExportData>(firstServer, `/api/campaigns/${campaignId}/export`, {
      body: JSON.stringify({
        contractRootMode: "none",
        format: "json",
        includeLocalePreference: true,
        includeRiskFlags: true,
        includeWalletType: true,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(campaignId).toMatch(/^campaign-[0-9a-f-]{36}$/);
    expect(taskId).toMatch(/^campaign-task-[0-9a-f-]{36}$/);
    expect(adoptedTaskId).toMatch(/^campaign-task-[0-9a-f-]{36}$/);
    expect(adoptedTaskId).not.toBe(taskId);
    expect(task.payload.id).toBe(taskId);
    expect(adoptedTask.payload.id).toBe(adoptedTaskId);
    expect(eligibility.payload).toMatchObject({ eligible: true, missingTasks: [], score: 120 });
    expect(participantARanking.payload).toMatchObject({
      campaignId,
      participant: participantJourneyA.payload.participant,
      ranking: participantJourneyA.payload.ranking,
      source: "repository_projection",
      status: "ready",
    });
    expect(exportPreview.payload).toMatchObject({ campaignId, readyRows: 2 });

    const participantAId = participantJourneyA.payload.participant.participantId;
    const participantBId = participantJourneyB.payload.participant.participantId;
    if (!participantAId || !participantBId) {
      throw new Error("Canonical Participant identities were not persisted before Admin review.");
    }
    const participantFactsBeforeAdmin = await readCampaignSnapshotFromDatabase(campaignId);
    const adminSessionA1 = await issueAdminSession(
      firstServer,
      { address: adminOperatorAddress },
      "trace-pg-admin-a1-session",
    );
    expect(adminSessionA1.data.payload.address).toBe(adminOperatorAddress);
    const adminCampaignFeed = (await requestAdminJson<AdminCampaignListData>(
      firstServer,
      "/api/admin/campaigns?limit=10",
      { headers: adminSessionA1.headers("trace-pg-admin-campaign-feed") },
    )).data;
    expect(adminCampaignFeed).toEqual({
      campaigns: expect.arrayContaining([{
        campaignId,
        ownerAddress,
        participantCount: 2,
        projectId: created.payload.projectId,
        status: created.payload.status,
        taskCount: 2,
      }, {
        campaignId: policyCampaign.payload.id,
        ownerAddress,
        participantCount: 0,
        projectId: policyCampaign.payload.projectId,
        status: policyCampaign.payload.status,
        taskCount: 1,
      }]),
      repository: {
        adapterId: "campaign-db-postgresql-adapter",
        durable: true,
        repositoryId: "campaign-db-postgresql-runtime",
        storeId: "campaign-db",
      },
    });
    expect(adminCampaignFeed.campaigns).toHaveLength(2);

    const pendingAdminQueue = (await requestAdminJson<AdminQueueData>(
      firstServer,
      `/api/admin/campaigns/${campaignId}/reviews`,
      { headers: adminSessionA1.headers("trace-pg-admin-pending-queue") },
    )).data;
    const pendingA = pendingAdminQueue.items.find(({ participantId }) =>
      participantId === participantAId);
    const pendingB = pendingAdminQueue.items.find(({ participantId }) =>
      participantId === participantBId);
    expect(pendingAdminQueue).toMatchObject({
      campaignId,
      summary: {
        approvedCurrent: 0,
        needsReviewCurrent: 0,
        pendingReview: 2,
        rejectedCurrent: 0,
        stale: 0,
        total: 2,
      },
    });
    expect(pendingA).toMatchObject({
      coverage: { completedTasks: 1, evidenceCount: 1, requiredTasks: 1, totalTasks: 2 },
      currentDecision: null,
      eligible: true,
      rank: 1,
      reviewState: "pending_review",
      totalPoints: task.payload.points,
      walletAddress,
    });
    expect(pendingB).toMatchObject({
      coverage: { completedTasks: 1, evidenceCount: 1, requiredTasks: 1, totalTasks: 2 },
      currentDecision: null,
      eligible: true,
      rank: 2,
      reviewState: "pending_review",
      totalPoints: task.payload.points,
      walletAddress: walletBAddress,
    });

    const adminDetailA = (await requestAdminJson<AdminReviewDetailData>(
      firstServer,
      `/api/admin/campaigns/${campaignId}/reviews/${participantAId}`,
      { headers: adminSessionA1.headers("trace-pg-admin-a-detail") },
    )).data;
    const adminDetailB = (await requestAdminJson<AdminReviewDetailData>(
      firstServer,
      `/api/admin/campaigns/${campaignId}/reviews/${participantBId}`,
      { headers: adminSessionA1.headers("trace-pg-admin-b-detail") },
    )).data;
    expect(pendingA?.currentFingerprint).toBe(adminDetailA.snapshot.fingerprint);
    expect(pendingB?.currentFingerprint).toBe(adminDetailB.snapshot.fingerprint);
    for (const [detailData, participantId, verification] of [
      [
        adminDetailA,
        participantAId,
        firstVerification,
      ],
      [
        adminDetailB,
        participantBId,
        participantBVerification,
      ],
    ] as const) {
      expect(detailData).toMatchObject({
        campaignId,
        currentDecision: null,
        history: [],
        participantId,
        reviewState: "pending_review",
        snapshot: {
          campaignId,
          fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
          fingerprintVersion: "review-snapshot-v1",
          participantId,
        },
      });
      expect(detailData.snapshot.completions.map(({ id }) => id)).toEqual([
        verification.campaignDbCompletion.completionId,
      ]);
      expect(detailData.snapshot.evidence).toEqual([
        expect.objectContaining({
          completionId: verification.campaignDbCompletion.completionId,
          evidenceHash: verification.payload.evidenceHash,
          evidenceRef: verification.payload.evidenceRef,
          id: verification.campaignDbEvidence.evidenceId,
          liveProviderExecuted: true,
          taskId,
          verificationAttemptId: verification.payload.verificationAttemptId,
        }),
      ]);
      expect(new Set(detailData.snapshot.tasks.map(({ id }) => id))).toEqual(
        new Set([taskId, adoptedTaskId]),
      );
    }

    const approveBody = JSON.stringify({
      decision: "approved",
      note: "Canonical evidence verified.",
      reasonCode: "evidence_verified",
      snapshotFingerprint: adminDetailA.snapshot.fingerprint,
    });
    const approveIdempotencyKey = `approve-a-${randomUUID()}`;
    const approveRace = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      requestApi<AdminDecisionReceiptData>(
        firstServer,
        `/api/admin/campaigns/${campaignId}/reviews/${participantAId}/decisions`,
        {
          body: approveBody,
          headers: adminSessionA1.headers(`trace-pg-admin-a-decision-${index}`, {
            "Idempotency-Key": approveIdempotencyKey,
          }),
          method: "POST",
        },
      )));
    expect(approveRace.filter(({ status }) => status === 201)).toHaveLength(1);
    expect(approveRace.filter(({ status }) => status === 200)).toHaveLength(19);
    const approveReceipts = approveRace.map(({ envelope, status }) => {
      if (!envelope.ok || !envelope.data || (status !== 200 && status !== 201)) {
        throw new Error("Concurrent Admin decision did not return a success receipt.");
      }
      return envelope.data;
    });
    const createdApproveReceipt = approveReceipts.find(({ created }) => created);
    expect(createdApproveReceipt).toBeDefined();
    expect(approveReceipts.filter(({ created }) => created)).toHaveLength(1);
    expect(new Set(approveReceipts.map(({ decisionId }) => decisionId)).size).toBe(1);
    expect(new Set(approveReceipts.map(({ version }) => version))).toEqual(new Set([1]));
    expect(approveReceipts.every((receipt) =>
      receipt.campaignId === campaignId
      && receipt.participantId === participantAId
      && receipt.snapshotFingerprint === adminDetailA.snapshot.fingerprint)).toBe(true);

    const approveReplay = await requestAdminJson<AdminDecisionReceiptData>(
      firstServer,
      `/api/admin/campaigns/${campaignId}/reviews/${participantAId}/decisions`,
      {
        body: approveBody,
        headers: adminSessionA1.headers("trace-pg-admin-a-decision-replay", {
          "Idempotency-Key": approveIdempotencyKey,
        }),
        method: "POST",
      },
    );
    expect(approveReplay.status).toBe(200);
    expect(approveReplay.data).toEqual({ ...createdApproveReceipt, created: false });
    expect(await readAdminDurableRowCounts(campaignId)).toEqual({
      artifactRows: 0,
      decisionRows: 1,
    });

    const approveConflict = await requestApi<AdminDecisionReceiptData>(
      firstServer,
      `/api/admin/campaigns/${campaignId}/reviews/${participantAId}/decisions`,
      {
        body: JSON.stringify({
          decision: "needs_review",
          reasonCode: "manual_review_required",
          snapshotFingerprint: adminDetailA.snapshot.fingerprint,
        }),
        headers: adminSessionA1.headers("trace-pg-admin-a-decision-conflict", {
          "Idempotency-Key": approveIdempotencyKey,
        }),
        method: "POST",
      },
    );
    expect(approveConflict).toMatchObject({
      status: 409,
      envelope: {
        error: {
          code: "INVALID_REQUEST",
          details: {
            diagnosticCode: "ADMIN_REVIEW_DOMAIN_CONFLICT",
            field: "idempotencyKey",
          },
        },
        ok: false,
        traceId: "trace-pg-admin-a-decision-conflict",
      },
    });
    expect(await readAdminDurableRowCounts(campaignId)).toEqual({
      artifactRows: 0,
      decisionRows: 1,
    });

    const rejectB = await requestAdminJson<AdminDecisionReceiptData>(
      firstServer,
      `/api/admin/campaigns/${campaignId}/reviews/${participantBId}/decisions`,
      {
        body: JSON.stringify({
          decision: "rejected",
          note: "Canonical evidence requires rejection.",
          reasonCode: "evidence_invalid",
          snapshotFingerprint: adminDetailB.snapshot.fingerprint,
        }),
        headers: adminSessionA1.headers("trace-pg-admin-b-decision", {
          "Idempotency-Key": `reject-b-${randomUUID()}`,
        }),
        method: "POST",
      },
      [201],
    );
    expect(rejectB.data).toMatchObject({
      campaignId,
      created: true,
      participantId: participantBId,
      snapshotFingerprint: adminDetailB.snapshot.fingerprint,
      version: 1,
    });

    const reviewedAdminQueue = (await requestAdminJson<AdminQueueData>(
      firstServer,
      `/api/admin/campaigns/${campaignId}/reviews`,
      { headers: adminSessionA1.headers("trace-pg-admin-reviewed-queue") },
    )).data;
    expect(reviewedAdminQueue.items.find(({ participantId }) => participantId === participantAId))
      .toMatchObject({ currentDecision: { decision: "approved", version: 1 }, reviewState: "approved_current" });
    expect(reviewedAdminQueue.items.find(({ participantId }) => participantId === participantBId))
      .toMatchObject({ currentDecision: { decision: "rejected", version: 1 }, reviewState: "rejected_current" });
    expect(reviewedAdminQueue.summary).toEqual({
      approvedCurrent: 1,
      needsReviewCurrent: 0,
      pendingReview: 0,
      rejectedCurrent: 1,
      stale: 0,
      total: 2,
    });

    const decidedAdminDetailA = (await requestAdminJson<AdminReviewDetailData>(
      firstServer,
      `/api/admin/campaigns/${campaignId}/reviews/${participantAId}`,
      { headers: adminSessionA1.headers("trace-pg-admin-a-decided-detail") },
    )).data;
    const decidedAdminDetailB = (await requestAdminJson<AdminReviewDetailData>(
      firstServer,
      `/api/admin/campaigns/${campaignId}/reviews/${participantBId}`,
      { headers: adminSessionA1.headers("trace-pg-admin-b-decided-detail") },
    )).data;
    expect(decidedAdminDetailA.history).toEqual([decidedAdminDetailA.currentDecision]);
    expect(decidedAdminDetailB.history).toEqual([decidedAdminDetailB.currentDecision]);
    expect(decidedAdminDetailA.currentDecision).toMatchObject({
      decision: "approved",
      decisionId: createdApproveReceipt?.decisionId,
      operatorRole: "review_operator",
      operatorSubject: adminOperatorAddress,
      version: 1,
    });
    expect(decidedAdminDetailB.currentDecision).toMatchObject({
      decision: "rejected",
      decisionId: rejectB.data.decisionId,
      operatorRole: "review_operator",
      operatorSubject: adminOperatorAddress,
      version: 1,
    });

    const participantFactsAfterDecisions = await readCampaignSnapshotFromDatabase(campaignId);
    const participantJourneyAAfterDecisions = await requestJson<ParticipantJourneyData>(
      firstServer,
      `/api/participant/campaigns/${campaignId}/journey`,
      { headers: participantSessionA1.headers("trace-pg-participant-a-after-admin-decisions") },
    );
    const participantJourneyBAfterDecisions = await requestJson<ParticipantJourneyData>(
      firstServer,
      `/api/participant/campaigns/${campaignId}/journey`,
      { headers: participantSessionB1.headers("trace-pg-participant-b-after-admin-decisions") },
    );
    expect(participantFactsAfterDecisions).toEqual(participantFactsBeforeAdmin);
    expect(participantJourneyAAfterDecisions.payload).toEqual(participantJourneyA.payload);
    expect(participantJourneyBAfterDecisions.payload).toEqual(participantJourneyB.payload);

    const approvedWinners = (await requestAdminJson<AdminWinnerData>(
      firstServer,
      `/api/admin/campaigns/${campaignId}/winners`,
      { headers: adminSessionA1.headers("trace-pg-admin-winners") },
    )).data;
    expect(approvedWinners).toMatchObject({
      campaignId,
      rows: [{
        campaignId,
        decisionId: createdApproveReceipt?.decisionId,
        decisionVersion: 1,
        participantId: participantAId,
        rank: 1,
        snapshotFingerprint: adminDetailA.snapshot.fingerprint,
        totalPoints: task.payload.points,
        walletAddress,
      }],
      sourceFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      sourceVersion: "artifact-source-v1",
    });
    expect(JSON.stringify(approvedWinners.rows)).not.toContain(participantBId);
    expect(JSON.stringify(approvedWinners.rows)).not.toContain(walletBAddress);

    const csvRace = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      requestApi<AdminArtifactReceiptData>(
        firstServer,
        `/api/admin/campaigns/${campaignId}/artifacts`,
        {
          body: JSON.stringify({
            expectedSourceFingerprint: approvedWinners.sourceFingerprint,
            format: "csv",
          }),
          headers: adminSessionA1.headers(`trace-pg-admin-csv-${index}`),
          method: "POST",
        },
      )));
    expect(csvRace.filter(({ status }) => status === 201)).toHaveLength(1);
    expect(csvRace.filter(({ status }) => status === 200)).toHaveLength(19);
    const csvReceipts = csvRace.map(({ envelope, status }) => {
      if (!envelope.ok || !envelope.data || (status !== 200 && status !== 201)) {
        throw new Error("Concurrent CSV generation did not return a success receipt.");
      }
      return envelope.data;
    });
    expect(csvReceipts.filter(({ created }) => created)).toHaveLength(1);
    expect(new Set(csvReceipts.map(({ artifact }) => artifact.artifactId)).size).toBe(1);
    expect(new Set(csvReceipts.map(({ artifact }) => artifact.contentHash)).size).toBe(1);
    const csvArtifact = csvReceipts[0]!.artifact;
    expect(csvArtifact).toMatchObject({
      campaignId,
      format: "csv",
      mimeType: "text/csv;charset=utf-8",
      rowCount: 1,
      sourceFingerprint: approvedWinners.sourceFingerprint,
      sourceVersion: "artifact-source-v1",
    });

    const jsonArtifactRequest = {
      body: JSON.stringify({
        expectedSourceFingerprint: approvedWinners.sourceFingerprint,
        format: "json",
      }),
      headers: adminSessionA1.headers("trace-pg-admin-json-create"),
      method: "POST",
    } as const;
    const createdJsonArtifact = await requestAdminJson<AdminArtifactReceiptData>(
      firstServer,
      `/api/admin/campaigns/${campaignId}/artifacts`,
      jsonArtifactRequest,
      [201],
    );
    const replayedJsonArtifact = await requestAdminJson<AdminArtifactReceiptData>(
      firstServer,
      `/api/admin/campaigns/${campaignId}/artifacts`,
      {
        ...jsonArtifactRequest,
        headers: adminSessionA1.headers("trace-pg-admin-json-replay"),
      },
      [200],
    );
    expect(createdJsonArtifact.data).toMatchObject({
      artifact: {
        campaignId,
        format: "json",
        mimeType: "application/json;charset=utf-8",
        rowCount: 1,
        sourceFingerprint: approvedWinners.sourceFingerprint,
        sourceVersion: "artifact-source-v1",
      },
      created: true,
    });
    expect(replayedJsonArtifact.data).toEqual({
      artifact: createdJsonArtifact.data.artifact,
      created: false,
    });
    const jsonArtifact = createdJsonArtifact.data.artifact;
    expect(jsonArtifact.artifactId).not.toBe(csvArtifact.artifactId);
    expect(await readAdminDurableRowCounts(campaignId)).toEqual({
      artifactRows: 2,
      decisionRows: 2,
    });

    const artifactListBeforeRestart = (await requestAdminJson<AdminArtifactListData>(
      firstServer,
      `/api/admin/campaigns/${campaignId}/artifacts?limit=10`,
      { headers: adminSessionA1.headers("trace-pg-admin-artifact-list") },
    )).data;
    expect(artifactListBeforeRestart.campaignId).toBe(campaignId);
    expect(new Set(artifactListBeforeRestart.artifacts.map(({ artifactId }) => artifactId))).toEqual(
      new Set([csvArtifact.artifactId, jsonArtifact.artifactId]),
    );
    const csvArtifactDetailBeforeRestart = (await requestAdminJson<AdminArtifactDetailData>(
      firstServer,
      `/api/admin/campaigns/${campaignId}/artifacts/${csvArtifact.artifactId}`,
      { headers: adminSessionA1.headers("trace-pg-admin-csv-detail") },
    )).data;
    const jsonArtifactDetailBeforeRestart = (await requestAdminJson<AdminArtifactDetailData>(
      firstServer,
      `/api/admin/campaigns/${campaignId}/artifacts/${jsonArtifact.artifactId}`,
      { headers: adminSessionA1.headers("trace-pg-admin-json-detail") },
    )).data;
    expect(csvArtifactDetailBeforeRestart).toEqual({
      artifact: csvArtifact,
      sourceManifest: expect.objectContaining({ rows: approvedWinners.rows }),
    });
    expect(jsonArtifactDetailBeforeRestart).toEqual({
      artifact: jsonArtifact,
      sourceManifest: csvArtifactDetailBeforeRestart.sourceManifest,
    });

    const assertExactArtifactDownload = async (
      server: CampaignOsApiServerHandle,
      session: IssuedWalletSession,
      artifact: AdminArtifactMetadata,
      traceId: string,
    ) => {
      const download = await requestAdminDownload(
        server,
        `/api/admin/campaigns/${campaignId}/artifacts/${artifact.artifactId}/download`,
        session.headers(traceId),
      );
      const independentHash = createHash("sha256").update(download.bytes).digest("hex");

      expect(download.status).toBe(200);
      expect(download.bytes).toHaveLength(artifact.contentBytes);
      expect(download.contentLength).toBe(String(artifact.contentBytes));
      expect(download.contentHash).toBe(artifact.contentHash);
      expect(download.mimeType).toBe(artifact.mimeType);
      expect(download.contentDisposition).toBe(`attachment; filename="${artifact.fileName}"`);
      expect(independentHash).toBe(artifact.contentHash);
      expect(artifact.fileName).toMatch(new RegExp(`^[A-Za-z0-9._-]+\\.${artifact.format}$`));

      return download;
    };
    const csvDownloadBeforeRestart = await assertExactArtifactDownload(
      firstServer,
      adminSessionA1,
      csvArtifact,
      "trace-pg-admin-csv-download",
    );
    const jsonDownloadBeforeRestart = await assertExactArtifactDownload(
      firstServer,
      adminSessionA1,
      jsonArtifact,
      "trace-pg-admin-json-download",
    );
    const toAdminDownloadManifest = (download: AdminDownloadResult) => ({
      content: download.bytes.toString("base64"),
      contentDisposition: download.contentDisposition,
      contentHash: download.contentHash,
      contentLength: download.contentLength,
      mimeType: download.mimeType,
      status: download.status,
    });
    const csvContentBeforeRestart = csvDownloadBeforeRestart.bytes.toString("utf8");
    const jsonContentBeforeRestart = jsonDownloadBeforeRestart.bytes.toString("utf8");
    expect(csvContentBeforeRestart).toContain(participantAId);
    expect(csvContentBeforeRestart).toContain(walletAddress);
    expect(csvContentBeforeRestart).not.toContain(participantBId);
    expect(csvContentBeforeRestart).not.toContain(walletBAddress);
    expect(JSON.parse(jsonContentBeforeRestart)).toEqual({
      rows: approvedWinners.rows,
      source: { campaignId, fingerprint: approvedWinners.sourceFingerprint },
      version: approvedWinners.sourceVersion,
    });
    expect(jsonContentBeforeRestart).not.toContain(participantBId);
    expect(jsonContentBeforeRestart).not.toContain(walletBAddress);
    for (const content of [csvContentBeforeRestart, jsonContentBeforeRestart]) {
      expect(content).not.toContain("operatorSubject");
      expect(content).not.toContain("payloadHash");
    }
    expect(await readCampaignSnapshotFromDatabase(campaignId)).toEqual(participantFactsBeforeAdmin);

    const referralId = `referral-binding-${randomUUID()}`;
    const beforeRestartSnapshot = await (async () => {
      const pool = createAuditPool();

      try {
        await pool.query(
          `
            INSERT INTO campaign_os.campaign_referral_bindings (
              id,
              campaign_id,
              invitee_wallet_address,
              invitee_account_type,
              invitee_wallet_source,
              referrer_wallet_address,
              referrer_account_type,
              referrer_wallet_source,
              qualified_action_completed,
              qualified_action_completed_at,
              qualified_action_evidence_hash,
              status,
              risk_flags,
              created_at,
              updated_at
            )
            VALUES (
              $1, $2, $3, 'EOA', 'PORTKEY_EOA_EXTENSION', $4,
              'EOA', 'PORTKEY_EOA_EXTENSION', false, NULL, NULL,
              'pending', '[]'::jsonb, $5, $5
            )
          `,
          [
            referralId,
            campaignId,
            walletAddress,
            "2F4PostgresReferrerWallet",
            "2026-07-13T00:00:00.000Z",
          ],
        );

        return await readCampaignSnapshot(pool, campaignId);
      } finally {
        await pool.end();
      }
    })();

    expect(beforeRestartSnapshot).toMatchObject({
      campaigns: [expect.objectContaining({
        contract_mode: created.payload.contractMode,
        goal: created.payload.goal,
        id: campaignId,
        owner_address: ownerAddress,
        project_id: created.payload.projectId,
        wallet_policy: created.payload.walletPolicy,
      })],
      completions: expect.arrayContaining([
        expect.objectContaining({ task_id: taskId, wallet_address: walletAddress }),
        expect.objectContaining({ task_id: taskId, wallet_address: walletBAddress }),
      ]),
      evidence: expect.arrayContaining([
        expect.objectContaining({ task_id: taskId, wallet_address: walletAddress }),
        expect.objectContaining({ task_id: taskId, wallet_address: walletBAddress }),
      ]),
      participants: expect.arrayContaining([
        expect.objectContaining({ wallet_address: walletAddress }),
        expect.objectContaining({ wallet_address: walletBAddress }),
      ]),
      referrals: [expect.objectContaining({ id: referralId })],
      tasks: expect.arrayContaining([
        expect.objectContaining({
          id: taskId,
          points: task.payload.points,
          required: task.payload.required,
          template_code: task.payload.templateCode,
          verification_type: task.payload.verificationType,
        }),
        expect.objectContaining({
          id: adoptedTaskId,
          points: adoptedTask.payload.points,
          required: adoptedTask.payload.required,
          template_code: adoptedTask.payload.templateCode,
          verification_type: adoptedTask.payload.verificationType,
        }),
      ]),
      verificationAttempts: expect.arrayContaining([
        expect.objectContaining({ task_id: taskId, wallet_address: walletAddress }),
        expect.objectContaining({ task_id: taskId, wallet_address: walletBAddress }),
      ]),
    });
    expect(beforeRestartSnapshot.tasks).toHaveLength(2);
    const participantACompletionRows = beforeRestartSnapshot.completions.filter(
      (row) => row.wallet_address === walletAddress && row.task_id === taskId,
    );
    const participantAEvidenceRows = beforeRestartSnapshot.evidence.filter(
      (row) => row.wallet_address === walletAddress && row.task_id === taskId,
    );
    const participantAAttemptRows = beforeRestartSnapshot.verificationAttempts.filter(
      (row) => row.wallet_address === walletAddress && row.task_id === taskId,
    );
    expect(participantACompletionRows).toHaveLength(1);
    expect(participantAEvidenceRows).toHaveLength(1);
    expect(participantAAttemptRows).toHaveLength(1);
    expect(participantACompletionRows[0]).toMatchObject({
      id: firstVerification.campaignDbCompletion.completionId,
      points_awarded: task.payload.points,
      verification_attempt_id: firstVerification.payload.verificationAttemptId,
    });
    expect(participantAEvidenceRows[0]).toMatchObject({
      completion_id: firstVerification.campaignDbCompletion.completionId,
      evidence_hash: firstVerification.payload.evidenceHash,
      evidence_ref: firstVerification.payload.evidenceRef,
      evidence_source: "AELFSCAN",
      id: firstVerification.campaignDbEvidence.evidenceId,
      live_provider_executed: true,
      verification_attempt_id: firstVerification.payload.verificationAttemptId,
    });
    expect(participantAAttemptRows[0]).toMatchObject({
      attempt_count: 1,
      dispatch_state: "result_observed",
      evidence_hash: firstVerification.payload.evidenceHash,
      evidence_ref: firstVerification.payload.evidenceRef,
      evidence_source: "AELFSCAN",
      external_dispatch_limit: 1,
      id: firstVerification.payload.verificationAttemptId,
      max_attempts: CONTROLLED_ON_CHAIN_BINDING.maxAttempts,
      status: "completed",
    });
    expect(beforeRestartSnapshot.participants.find(
      (row) => row.wallet_address === walletAddress,
    )).toMatchObject({ total_points: task.payload.points });
    const runtimeWriteRows = [
      beforeRestartSnapshot.campaigns[0],
      beforeRestartSnapshot.tasks[0],
      beforeRestartSnapshot.tasks[1],
      ...beforeRestartSnapshot.participants,
      ...beforeRestartSnapshot.completions,
      ...beforeRestartSnapshot.evidence,
      ...beforeRestartSnapshot.verificationAttempts,
    ];
    const runtimeWriteWindowEndedAt = Date.now();

    for (const row of runtimeWriteRows) {
      const createdAt = timestampMillis(row?.created_at);
      const updatedAt = timestampMillis(row?.updated_at);

      expect(Number.isFinite(createdAt)).toBe(true);
      expect(Number.isFinite(updatedAt)).toBe(true);
      expect(createdAt).toBeGreaterThanOrEqual(runtimeWriteWindowStartedAt - 1_000);
      expect(createdAt).toBeLessThanOrEqual(runtimeWriteWindowEndedAt + 1_000);
      expect(updatedAt).toBeGreaterThanOrEqual(createdAt);
    }
    const finalizingShutdownCampaign = await requestJson<CampaignCreateData>(
      firstServer,
      "/api/campaigns",
      {
        body: JSON.stringify({
          duration: "2026-09-01/2026-09-14",
          endTime: "2026-09-14T23:59:59Z",
          goal: "Finalize provider work before PostgreSQL shutdown",
          ownerAddress,
          projectId: "postgres-provider-finalize-project",
          rewardDescription: "Provider graceful shutdown finalization fixture.",
          startTime: "2026-09-01T00:00:00Z",
          walletPolicy: "ANY",
        }),
        headers: sessionA.headers("trace-pg-finalize-campaign"),
        method: "POST",
      },
    );
    const finalizingShutdownTask = await requestJson<TaskCreateData>(
      firstServer,
      `/api/campaigns/${finalizingShutdownCampaign.payload.id}/tasks`,
      {
        body: JSON.stringify({
          evidenceRule: controlledOnChainEvidenceRule({
            methodName: "timeout",
            source: "AELFSCAN",
          }),
          points: 25,
          required: true,
          templateCode: "provider_finalize_before_pool_close",
          verificationType: "ON_CHAIN",
          walletCompatibility: "ANY",
        }),
        headers: sessionA.headers("trace-pg-finalize-task"),
        method: "POST",
      },
    );
    const shutdownCampaign = await requestJson<CampaignCreateData>(
      firstServer,
      "/api/campaigns",
      {
        body: JSON.stringify({
          duration: "2026-09-01/2026-09-14",
          endTime: "2026-09-14T23:59:59Z",
          goal: "Recover provider work interrupted after dispatch",
          ownerAddress,
          projectId: "postgres-provider-shutdown-project",
          rewardDescription: "Provider shutdown recovery fixture.",
          startTime: "2026-09-01T00:00:00Z",
          walletPolicy: "ANY",
        }),
        headers: sessionA.headers("trace-pg-shutdown-campaign"),
        method: "POST",
      },
    );
    const shutdownTask = await requestJson<TaskCreateData>(
      firstServer,
      `/api/campaigns/${shutdownCampaign.payload.id}/tasks`,
      {
        body: JSON.stringify({
          evidenceRule: controlledOnChainEvidenceRule({
            methodName: "timeout",
            source: "AELFSCAN",
          }),
          points: 25,
          required: true,
          templateCode: "provider_started_without_result",
          verificationType: "ON_CHAIN",
          walletCompatibility: "ANY",
        }),
        headers: sessionA.headers("trace-pg-shutdown-task"),
        method: "POST",
      },
    );
    const adminRestartManifest = Object.freeze({
      artifactDetails: {
        csv: (await requestAdminJson<AdminArtifactDetailData>(
          firstServer,
          `/api/admin/campaigns/${campaignId}/artifacts/${csvArtifact.artifactId}`,
          { headers: adminSessionA1.headers("trace-pg-admin-manifest-csv-detail") },
        )).data,
        json: (await requestAdminJson<AdminArtifactDetailData>(
          firstServer,
          `/api/admin/campaigns/${campaignId}/artifacts/${jsonArtifact.artifactId}`,
          { headers: adminSessionA1.headers("trace-pg-admin-manifest-json-detail") },
        )).data,
      },
      artifacts: (await requestAdminJson<AdminArtifactListData>(
        firstServer,
        `/api/admin/campaigns/${campaignId}/artifacts?limit=10`,
        { headers: adminSessionA1.headers("trace-pg-admin-manifest-artifacts") },
      )).data,
      campaignFeed: (await requestAdminJson<AdminCampaignListData>(
        firstServer,
        "/api/admin/campaigns?limit=10",
        { headers: adminSessionA1.headers("trace-pg-admin-manifest-campaigns") },
      )).data,
      decisionDetails: {
        participantA: (await requestAdminJson<AdminReviewDetailData>(
          firstServer,
          `/api/admin/campaigns/${campaignId}/reviews/${participantAId}`,
          { headers: adminSessionA1.headers("trace-pg-admin-manifest-a-detail") },
        )).data,
        participantB: (await requestAdminJson<AdminReviewDetailData>(
          firstServer,
          `/api/admin/campaigns/${campaignId}/reviews/${participantBId}`,
          { headers: adminSessionA1.headers("trace-pg-admin-manifest-b-detail") },
        )).data,
      },
      downloads: {
        csv: toAdminDownloadManifest(await assertExactArtifactDownload(
          firstServer,
          adminSessionA1,
          csvArtifact,
          "trace-pg-admin-manifest-csv-download",
        )),
        json: toAdminDownloadManifest(await assertExactArtifactDownload(
          firstServer,
          adminSessionA1,
          jsonArtifact,
          "trace-pg-admin-manifest-json-download",
        )),
      },
      durableRows: await readAdminDurableRowCounts(campaignId),
      queue: (await requestAdminJson<AdminQueueData>(
        firstServer,
        `/api/admin/campaigns/${campaignId}/reviews`,
        { headers: adminSessionA1.headers("trace-pg-admin-manifest-queue") },
      )).data,
      winners: (await requestAdminJson<AdminWinnerData>(
        firstServer,
        `/api/admin/campaigns/${campaignId}/winners`,
        { headers: adminSessionA1.headers("trace-pg-admin-manifest-winners") },
      )).data,
    });
    expect(adminRestartManifest.durableRows).toEqual({ artifactRows: 2, decisionRows: 2 });
    const timeoutCountBeforeShutdown = providerSandbox!.count("timeout");
    let finalizingShutdownVerificationSettled = false;
    const finalizingShutdownVerification = requestApi<AttemptOnlyVerificationData>(
      firstServer,
      `/api/tasks/${finalizingShutdownTask.campaignDbTask.taskId}/verify`,
      {
        body: JSON.stringify({ campaignId: finalizingShutdownCampaign.payload.id }),
        headers: participantSessionA1.headers("trace-pg-finalize-verify"),
        method: "POST",
      },
    ).finally(() => {
      finalizingShutdownVerificationSettled = true;
    });
    let shutdownVerificationSettled = false;
    const shutdownVerification = requestApi<AttemptOnlyVerificationData>(
      firstServer,
      `/api/tasks/${shutdownTask.campaignDbTask.taskId}/verify`,
      {
        body: JSON.stringify({ campaignId: shutdownCampaign.payload.id }),
        headers: participantSessionA1.headers("trace-pg-shutdown-verify"),
        method: "POST",
      },
    ).finally(() => {
      shutdownVerificationSettled = true;
    });
    await waitForSandboxState((sandbox) =>
      sandbox.count("timeout") === timeoutCountBeforeShutdown + 2
      && sandbox.state().activeRequestCount === 2);
    const shutdownFixturePool = createAuditPool();
    let shutdownAttemptId = "";
    try {
      const expired = await shutdownFixturePool.query<{ id: string }>(`
        UPDATE campaign_os.verification_attempts
        SET lease_expires_at = GREATEST(
          updated_at + interval '1 millisecond',
          clock_timestamp() + interval '50 milliseconds'
        )
        WHERE campaign_id = $1
          AND task_id = $2
          AND wallet_address = $3
          AND status = 'running'
          AND dispatch_state = 'started'
        RETURNING id
      `, [
        shutdownCampaign.payload.id,
        shutdownTask.campaignDbTask.taskId,
        walletAddress,
      ]);
      expect(expired.rows).toHaveLength(1);
      shutdownAttemptId = expired.rows[0]?.id ?? "";
    } finally {
      await shutdownFixturePool.end();
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    await stopServer(firstServer);
    const finalizingShutdownResult = await finalizingShutdownVerification;
    expect(finalizingShutdownResult).toMatchObject({
      status: 202,
      envelope: {
        data: {
          payload: {
            campaignId: finalizingShutdownCampaign.payload.id,
            outcome: "pending",
            pointsAwarded: 0,
            taskId: finalizingShutdownTask.campaignDbTask.taskId,
            walletAddress,
          },
        },
        ok: true,
      },
    });
    const shutdownResult = await shutdownVerification;
    expect(finalizingShutdownVerificationSettled).toBe(true);
    expect(shutdownVerificationSettled).toBe(true);
    expect(shutdownResult).toMatchObject({
      status: 200,
      envelope: {
        data: {
          payload: {
            campaignId: shutdownCampaign.payload.id,
            outcome: "manual_review",
            pointsAwarded: 0,
            taskId: shutdownTask.campaignDbTask.taskId,
            walletAddress,
          },
        },
        ok: true,
      },
    });
    expect(firstTransport.state()).toEqual({ accepting: false, activeCallCount: 0 });
    expect(providerSandbox!.state()).toMatchObject({
      activeRequestCount: 0,
      lifecycle: "listening",
      timerCount: 0,
    });
    const providerCountAfterRuntimeAStop = providerSandbox!.count();
    await expect(fetch(`${firstServer.url}/api/health`)).rejects.toBeInstanceOf(Error);
    expect(providerSandbox!.count()).toBe(providerCountAfterRuntimeAStop);
    expect(shutdownTimings[shutdownTimings.length - 1]).toBeLessThanOrEqual(10_000);
    expect(await waitForRuntimeDatabaseConnectionsToClose()).toBeLessThanOrEqual(10_000);

    const interruptedSnapshotPool = createAuditPool();
    try {
      const shutdownAttempts = await interruptedSnapshotPool.query<{
        dispatch_state: string;
        id: string;
        status: string;
      }>(`
        SELECT id, status, dispatch_state
        FROM campaign_os.verification_attempts
        WHERE id IN ($1, $2)
        ORDER BY id
      `, [
        finalizingShutdownResult.envelope.data!.payload.verificationAttemptId,
        shutdownAttemptId,
      ]);
      expect(shutdownAttempts.rows.find(
        ({ id }) => id === finalizingShutdownResult.envelope.data!.payload.verificationAttemptId,
      )).toEqual({
        dispatch_state: "result_observed",
        id: finalizingShutdownResult.envelope.data!.payload.verificationAttemptId,
        status: "pending",
      });
      expect(shutdownAttempts.rows.find(({ id }) => id === shutdownAttemptId)).toEqual({
        dispatch_state: "started",
        id: shutdownAttemptId,
        status: "running",
      });
    } finally {
      await interruptedSnapshotPool.end();
    }

    const secondServer = await startServer();
    const secondTransport = requireServerTransport(secondServer);
    expect(secondTransport).not.toBe(firstTransport);
    expect(secondTransport.state()).toEqual({ accepting: true, activeCallCount: 0 });
    const oldParticipantAAfterRestart = await expectNegativeCaseNoParticipantJourneyWrite(
      "Runtime B rejects stale Participant A1",
      {
        diagnosticCode: "AUTH_SESSION_INVALID",
        field: "x-campaign-os-session-id",
        outerCode: "AUTH_SESSION_INVALID",
        status: 401,
        traceId: "trace-pg-old-participant-a-after-restart",
      },
      () => requestApi(
        secondServer,
        `/api/participant/campaigns/${campaignId}/journey`,
        { headers: participantSessionA1.headers("trace-pg-old-participant-a-after-restart") },
      ),
    );
    const oldParticipantBAfterRestart = await expectNegativeCaseNoParticipantJourneyWrite(
      "Runtime B rejects stale Participant B1",
      {
        diagnosticCode: "AUTH_SESSION_INVALID",
        field: "x-campaign-os-session-id",
        outerCode: "AUTH_SESSION_INVALID",
        status: 401,
        traceId: "trace-pg-old-participant-b-after-restart",
      },
      () => requestApi(
        secondServer,
        `/api/participant/campaigns/${campaignId}/journey`,
        { headers: participantSessionB1.headers("trace-pg-old-participant-b-after-restart") },
      ),
    );
    const oldSessionAfterRestart = await expectNegativeCaseNoParticipantJourneyWrite(
      "Runtime B rejects stale Owner session",
      {
        diagnosticCode: "AUTH_SESSION_INVALID",
        field: "x-campaign-os-session-id",
        outerCode: "AUTH_SESSION_INVALID",
        status: 401,
        traceId: "trace-pg-old-session-after-restart",
      },
      () => requestApi(
        secondServer,
        "/api/projects/postgres-restart-project/campaigns?status=draft&limit=100",
        { headers: sessionA.headers("trace-pg-old-session-after-restart") },
      ),
    );
    const oldAdminAfterRestart = await expectNegativeCaseNoParticipantJourneyWrite(
      "Runtime B rejects stale Admin A1",
      {
        diagnosticCode: "AUTH_SESSION_INVALID",
        field: "x-campaign-os-session-id",
        outerCode: "AUTH_SESSION_INVALID",
        status: 401,
        traceId: "trace-pg-old-admin-after-restart",
      },
      () => requestApi(
        secondServer,
        `/api/admin/campaigns/${campaignId}/reviews`,
        { headers: adminSessionA1.headers("trace-pg-old-admin-after-restart") },
      ),
    );
    const sessionB = await issueProjectOwnerSession(
      secondServer,
      { fixtureId: "sess-aa-001" },
      "trace-pg-session-b",
    );
    expect(sessionB.data.payload.sessionId).not.toBe(sessionA.data.payload.sessionId);
    expect(sessionB.data.payload.address).toBe(ownerAddress);
    expect(sessionB.data.payload.proof).toMatchObject({
      status: "verified",
      trustLevel: "verified_local",
    });
    expect(sessionB.data.payload.issuer).toMatchObject({
      issuerMode: "local_opaque",
      valid: true,
    });
    const participantSessionA2 = await issueParticipantSession(
      secondServer,
      { adapterName: "PortkeyExtensionWallet", address: walletAddress },
      "trace-pg-participant-a2-session",
    );
    const participantSessionB2 = await issueParticipantSession(
      secondServer,
      { adapterName: "PortkeyDiscoverWallet", address: walletBAddress },
      "trace-pg-participant-b2-session",
    );
    const adminSessionA2 = await issueAdminSession(
      secondServer,
      { address: adminOperatorAddress },
      "trace-pg-admin-a2-session",
    );
    expect(adminSessionA2.data.payload).toMatchObject({
      accountType: adminSessionA1.data.payload.accountType,
      address: adminOperatorAddress,
      walletSource: adminSessionA1.data.payload.walletSource,
    });
    expect(adminSessionA2.data.payload.sessionId).not.toBe(adminSessionA1.data.payload.sessionId);

    for (const [freshSession, staleSession, address] of [
      [participantSessionA2, participantSessionA1, walletAddress],
      [participantSessionB2, participantSessionB1, walletBAddress],
    ] as const) {
      expect(freshSession.data.payload).toMatchObject({
        accountType: staleSession.data.payload.accountType,
        address,
        walletSource: staleSession.data.payload.walletSource,
      });
      expect(freshSession.data.payload.sessionId).not.toBe(staleSession.data.payload.sessionId);
    }
    const providerCountBeforeRuntimeBReplay = providerSandbox!.count();
    const transportCallsBeforeRuntimeBReplay = requireServerTransportStats(secondServer).callCount;
    const terminalReplay = await requestJson<VerificationData>(
      secondServer,
      `/api/tasks/${taskId}/verify`,
      {
        body: JSON.stringify({ campaignId }),
        headers: participantSessionA2.headers("trace-pg-runtime-b-terminal-replay"),
        method: "POST",
      },
    );
    expect(terminalReplay).toMatchObject({
      campaignDbCompletion: {
        completionId: firstVerification.campaignDbCompletion.completionId,
        evidenceId: firstVerification.campaignDbEvidence.evidenceId,
      },
      campaignDbEvidence: {
        evidenceHash: firstVerification.payload.evidenceHash,
        evidenceId: firstVerification.campaignDbEvidence.evidenceId,
        evidenceRef: firstVerification.payload.evidenceRef,
      },
      payload: {
        pointsAwarded: task.payload.points,
        status: "completed",
        verificationAttemptId: firstVerification.payload.verificationAttemptId,
      },
    });
    expect(providerSandbox!.count()).toBe(providerCountBeforeRuntimeBReplay);
    expect(requireServerTransportStats(secondServer).callCount).toBe(
      transportCallsBeforeRuntimeBReplay,
    );

    const unknownOutcomeRecovery = await requestJson<AttemptOnlyVerificationData>(
      secondServer,
      `/api/tasks/${shutdownTask.campaignDbTask.taskId}/verify`,
      {
        body: JSON.stringify({ campaignId: shutdownCampaign.payload.id }),
        headers: participantSessionA2.headers("trace-pg-runtime-b-outcome-unknown"),
        method: "POST",
      },
    );
    expect(unknownOutcomeRecovery.payload).toMatchObject({
      campaignId: shutdownCampaign.payload.id,
      outcome: "manual_review",
      pointsAwarded: 0,
      status: "manual_review",
      taskId: shutdownTask.campaignDbTask.taskId,
      verificationAttemptId: shutdownAttemptId,
      walletAddress,
    });
    expect(JSON.stringify(unknownOutcomeRecovery)).not.toContain("campaignDbEvidence");
    expect(providerSandbox!.count()).toBe(providerCountBeforeRuntimeBReplay);
    expect(requireServerTransportStats(secondServer).callCount).toBe(
      transportCallsBeforeRuntimeBReplay,
    );
    const unknownOutcomeJourney = await requestJson<ParticipantJourneyData>(
      secondServer,
      `/api/participant/campaigns/${shutdownCampaign.payload.id}/journey`,
      { headers: participantSessionA2.headers("trace-pg-runtime-b-outcome-unknown-journey") },
    );
    expect(unknownOutcomeJourney.payload.tasks.find(
      ({ taskId: journeyTaskId }) => journeyTaskId === shutdownTask.campaignDbTask.taskId,
    )).toMatchObject({
      completionId: null,
      evidenceId: null,
      pointsAwarded: 0,
      status: "manual_review",
      verificationAttemptId: shutdownAttemptId,
    });
    const recoveredAttemptPool = createAuditPool();
    try {
      const recoveredAttempt = await recoveredAttemptPool.query<{
        diagnostic_codes: string[];
        dispatch_state: string;
        id: string;
        retry_posture: string;
        status: string;
      }>(`
        SELECT id, status, dispatch_state, retry_posture, diagnostic_codes
        FROM campaign_os.verification_attempts
        WHERE id = $1
      `, [shutdownAttemptId]);
      expect(recoveredAttempt.rows).toEqual([{
        diagnostic_codes: ["TASK_VERIFICATION_OUTCOME_UNKNOWN"],
        dispatch_state: "started",
        id: shutdownAttemptId,
        retry_posture: "manual_review",
        status: "manual_review",
      }]);
    } finally {
      await recoveredAttemptPool.end();
    }
    const health = await requestJson<HealthData>(secondServer, "/api/health");
    const list = await requestJson<CampaignListData>(
      secondServer,
      "/api/projects/postgres-restart-project/campaigns?status=draft&limit=100",
      { headers: sessionB.headers("trace-pg-runtime-owner-recovery") },
    );
    const detail = await requestJson<DetailData>(
      secondServer,
      `/api/owner/campaigns/${campaignId}`,
      { headers: sessionB.headers("trace-pg-runtime-detail") },
    );
    const recoveredParticipantJourneyA = await requestJson<ParticipantJourneyData>(
      secondServer,
      `/api/participant/campaigns/${campaignId}/journey`,
      { headers: participantSessionA2.headers("trace-pg-participant-a-recovery") },
    );
    const recoveredParticipantJourneyB = await requestJson<ParticipantJourneyData>(
      secondServer,
      `/api/participant/campaigns/${campaignId}/journey`,
      { headers: participantSessionB2.headers("trace-pg-participant-b-recovery") },
    );
    const restartedEligibilityA = await requestJson<EligibilityData>(
      secondServer,
      `/api/campaigns/${campaignId}/eligibility`,
      { headers: participantSessionA2.headers("trace-pg-participant-a-recovered-eligibility") },
    );
    const restartedEligibilityB = await requestJson<EligibilityData>(
      secondServer,
      `/api/campaigns/${campaignId}/eligibility`,
      { headers: participantSessionB2.headers("trace-pg-participant-b-recovered-eligibility") },
    );
    const restartedRankingA = await requestJson<RankingData>(
      secondServer,
      `/api/campaigns/${campaignId}/points-ranking-ledger-runtime`,
      { headers: participantSessionA2.headers("trace-pg-participant-a-recovered-ranking") },
    );
    const restartedRankingB = await requestJson<RankingData>(
      secondServer,
      `/api/campaigns/${campaignId}/points-ranking-ledger-runtime`,
      { headers: participantSessionB2.headers("trace-pg-participant-b-recovered-ranking") },
    );
    const restartedExport = await requestJson<ExportData>(secondServer, `/api/campaigns/${campaignId}/export`, {
      body: JSON.stringify({ contractRootMode: "none", format: "json" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(oldSessionAfterRestart.envelope.data).toBeUndefined();
    expect(oldParticipantAAfterRestart.envelope.data).toBeUndefined();
    expect(oldParticipantBAfterRestart.envelope.data).toBeUndefined();
    expect(oldAdminAfterRestart.envelope.data).toBeUndefined();
    expect(health.campaignDatabase).toMatchObject({
      liveConnectionAttempted: true,
      liveQueryExecutionEnabled: true,
      selectedMode: "postgres",
      status: "ready",
    });
    expect(list.payload.items.map((item) => item.id)).toEqual([campaignId]);
    expect(list.payload.campaignDb).toEqual(expect.objectContaining({ draftCount: 1 }));
    expect(list.payload.summary).toEqual(expect.objectContaining({ totalCampaigns: 1 }));
    expect(detail.payload.item.id).toBe(campaignId);
    expect(JSON.stringify(detail.payload.item.tags)).toContain(created.payload.projectId);
    expect(detail.payload.item.title["en-US"]).toBe(created.payload.goal);
    expect(new Set(detail.payload.tasks.map((item) => item.taskId))).toEqual(
      new Set([taskId, adoptedTaskId]),
    );
    const recoveredManualTask = detail.payload.tasks.find((item) => item.taskId === taskId);
    const recoveredAdoptedTask = detail.payload.tasks.find((item) => item.taskId === adoptedTaskId);
    expect(recoveredManualTask).toMatchObject({
      points: task.payload.points,
      required: task.payload.required,
      title: { "en-US": task.payload.templateCode },
      verificationType: task.payload.verificationType,
    });
    expect(recoveredAdoptedTask).toMatchObject({
      points: adoptedTask.payload.points,
      required: adoptedTask.payload.required,
      title: { "en-US": adoptedTask.payload.templateCode },
      verificationType: adoptedTask.payload.verificationType,
    });
    expect(recoveredParticipantJourneyA.payload).toEqual(participantJourneyA.payload);
    expect(recoveredParticipantJourneyB.payload).toEqual(participantJourneyB.payload);
    for (const [journey, eligibilityAfterRestart, rankingAfterRestart, address] of [
      [recoveredParticipantJourneyA, restartedEligibilityA, restartedRankingA, walletAddress],
      [recoveredParticipantJourneyB, restartedEligibilityB, restartedRankingB, walletBAddress],
    ] as const) {
      expect(journey.payload.campaign.campaignId).toBe(campaignId);
      expect(new Set(journey.payload.tasks.map((item) => item.taskId))).toEqual(
        new Set([taskId, adoptedTaskId]),
      );
      expect(journey.payload.tasks.every((item) => item.campaignId === campaignId)).toBe(true);
      expect(journey.payload.participant).toMatchObject({
        totalPoints: task.payload.points,
        walletAddress: address,
      });
      expect(journey.payload.ranking).toMatchObject({
        participantCount: 2,
        totalPoints: task.payload.points,
        walletAddress: address,
      });
      expect(journey.payload.participant.totalPoints).toBe(journey.payload.ranking.totalPoints);
      expect(eligibilityAfterRestart.payload).toMatchObject(journey.payload.eligibility);
      expect(rankingAfterRestart.payload).toMatchObject({
        campaignId,
        eligibility: journey.payload.eligibility,
        participant: journey.payload.participant,
        ranking: journey.payload.ranking,
        source: "repository_projection",
      });
    }
    expect(recoveredParticipantJourneyA.payload.ranking.rank).toBe(1);
    expect(recoveredParticipantJourneyB.payload.ranking.rank).toBe(2);
    expect(recoveredParticipantJourneyB.payload.tasks.find((item) => item.taskId === taskId)).toMatchObject({
      action: "completed",
      completionId: participantBVerification.campaignDbCompletion.completionId,
      evidenceId: participantBVerification.campaignDbEvidence.evidenceId,
      pointsAwarded: task.payload.points,
      status: "completed",
    });
    expect(restartedEligibilityB.payload).toMatchObject({
      campaignId,
      eligible: true,
      missingTasks: [],
      riskFlags: [],
      score: task.payload.points,
      status: "eligible",
      walletAddress: walletBAddress,
    });
    expect(JSON.stringify(recoveredParticipantJourneyA.payload)).not.toContain(
      participantBVerification.campaignDbCompletion.completionId,
    );
    expect(JSON.stringify(recoveredParticipantJourneyA.payload)).not.toContain(
      participantBVerification.campaignDbEvidence.evidenceId,
    );
    expect(JSON.stringify(recoveredParticipantJourneyB.payload)).not.toContain(
      firstVerification.campaignDbCompletion.completionId,
    );
    expect(JSON.stringify(recoveredParticipantJourneyB.payload)).not.toContain(
      firstVerification.campaignDbEvidence.evidenceId,
    );
    expect(restartedExport.payload).toEqual(expect.objectContaining({ campaignId, readyRows: 2 }));
    expect(restartedExport.payload.rows).toContainEqual(expect.objectContaining({
      referrerAddress: "2F4PostgresReferrerWallet",
      walletAddress,
    }));
    const afterRestartSnapshot = await (async () => {
      const pool = createAuditPool();

      try {
        return await readCampaignSnapshot(pool, campaignId);
      } finally {
        await pool.end();
      }
    })();
    expect(afterRestartSnapshot).toEqual(beforeRestartSnapshot);
    const canonicalIdentitySurfaces = JSON.stringify({
      campaign: created.payload,
      database: afterRestartSnapshot,
      detail: detail.payload,
      manualTask: task.payload,
      adoptedTask: adoptedTask.payload,
      participantA: recoveredParticipantJourneyA.payload,
      participantB: recoveredParticipantJourneyB.payload,
      recovery: list.payload,
    }).toLowerCase();
    expect(canonicalIdentitySurfaces).not.toContain("local-task-");
    expect(canonicalIdentitySurfaces).not.toContain("synthetic");

    const adminRuntimeBManifest = {
      artifactDetails: {
        csv: (await requestAdminJson<AdminArtifactDetailData>(
          secondServer,
          `/api/admin/campaigns/${campaignId}/artifacts/${csvArtifact.artifactId}`,
          { headers: adminSessionA2.headers("trace-pg-admin-b-csv-detail") },
        )).data,
        json: (await requestAdminJson<AdminArtifactDetailData>(
          secondServer,
          `/api/admin/campaigns/${campaignId}/artifacts/${jsonArtifact.artifactId}`,
          { headers: adminSessionA2.headers("trace-pg-admin-b-json-detail") },
        )).data,
      },
      artifacts: (await requestAdminJson<AdminArtifactListData>(
        secondServer,
        `/api/admin/campaigns/${campaignId}/artifacts?limit=10`,
        { headers: adminSessionA2.headers("trace-pg-admin-b-artifacts") },
      )).data,
      campaignFeed: (await requestAdminJson<AdminCampaignListData>(
        secondServer,
        "/api/admin/campaigns?limit=10",
        { headers: adminSessionA2.headers("trace-pg-admin-b-campaigns") },
      )).data,
      decisionDetails: {
        participantA: (await requestAdminJson<AdminReviewDetailData>(
          secondServer,
          `/api/admin/campaigns/${campaignId}/reviews/${participantAId}`,
          { headers: adminSessionA2.headers("trace-pg-admin-b-a-detail") },
        )).data,
        participantB: (await requestAdminJson<AdminReviewDetailData>(
          secondServer,
          `/api/admin/campaigns/${campaignId}/reviews/${participantBId}`,
          { headers: adminSessionA2.headers("trace-pg-admin-b-b-detail") },
        )).data,
      },
      downloads: {
        csv: toAdminDownloadManifest(await assertExactArtifactDownload(
          secondServer,
          adminSessionA2,
          csvArtifact,
          "trace-pg-admin-b-csv-download",
        )),
        json: toAdminDownloadManifest(await assertExactArtifactDownload(
          secondServer,
          adminSessionA2,
          jsonArtifact,
          "trace-pg-admin-b-json-download",
        )),
      },
      durableRows: await readAdminDurableRowCounts(campaignId),
      queue: (await requestAdminJson<AdminQueueData>(
        secondServer,
        `/api/admin/campaigns/${campaignId}/reviews`,
        { headers: adminSessionA2.headers("trace-pg-admin-b-queue") },
      )).data,
      winners: (await requestAdminJson<AdminWinnerData>(
        secondServer,
        `/api/admin/campaigns/${campaignId}/winners`,
        { headers: adminSessionA2.headers("trace-pg-admin-b-winners") },
      )).data,
    };
    expect(adminRuntimeBManifest).toEqual(adminRestartManifest);

    const participantFactsBeforeStaleMutation = await readCampaignSnapshotFromDatabase(campaignId);
    const completedCountBeforeDappMutation = providerSandbox!.count("completed");
    const transportCallsBeforeDappMutation = requireServerTransportStats(secondServer).callCount;
    const participantAStaleMutation = await requestJson<VerificationData>(
      secondServer,
      `/api/tasks/${adoptedTaskId}/verify`,
      {
        body: JSON.stringify({ campaignId }),
        headers: participantSessionA2.headers("trace-pg-participant-a-stale-mutation"),
        method: "POST",
      },
    );
    expect(participantAStaleMutation.payload).toMatchObject({
      campaignId,
      pointsAwarded: adoptedTask.payload.points,
      status: "completed",
      taskId: adoptedTaskId,
      walletAddress,
    });
    expect(providerSandbox!.count("completed") - completedCountBeforeDappMutation).toBe(1);
    expect(requireServerTransportStats(secondServer).callCount - transportCallsBeforeDappMutation)
      .toBe(1);
    expect(participantAStaleMutation.campaignDbEvidence).toMatchObject({
      evidenceHash: participantAStaleMutation.payload.evidenceHash,
      evidenceRef: participantAStaleMutation.payload.evidenceRef,
      evidenceSource: "DAPP_API",
      liveProviderExecuted: true,
    });
    expect(participantAStaleMutation.campaignDbCompletion.completionId).not.toBe(
      firstVerification.campaignDbCompletion.completionId,
    );
    expect(participantAStaleMutation.campaignDbEvidence.evidenceId).not.toBe(
      firstVerification.campaignDbEvidence.evidenceId,
    );
    const participantFactsAfterStaleMutation = await readCampaignSnapshotFromDatabase(campaignId);
    expect(participantFactsAfterStaleMutation).not.toEqual(participantFactsBeforeStaleMutation);

    const staleAdminDetailA = (await requestAdminJson<AdminReviewDetailData>(
      secondServer,
      `/api/admin/campaigns/${campaignId}/reviews/${participantAId}`,
      { headers: adminSessionA2.headers("trace-pg-admin-stale-a-detail") },
    )).data;
    const staleAdminQueue = (await requestAdminJson<AdminQueueData>(
      secondServer,
      `/api/admin/campaigns/${campaignId}/reviews`,
      { headers: adminSessionA2.headers("trace-pg-admin-stale-queue") },
    )).data;
    const staleWinners = (await requestAdminJson<AdminWinnerData>(
      secondServer,
      `/api/admin/campaigns/${campaignId}/winners`,
      { headers: adminSessionA2.headers("trace-pg-admin-stale-winners") },
    )).data;
    const staleArtifactList = (await requestAdminJson<AdminArtifactListData>(
      secondServer,
      `/api/admin/campaigns/${campaignId}/artifacts?limit=10`,
      { headers: adminSessionA2.headers("trace-pg-admin-stale-artifacts") },
    )).data;
    expect(staleAdminDetailA).toMatchObject({
      currentDecision: { decision: "approved", version: 1 },
      reviewState: "stale",
      snapshot: {
        fingerprint: expect.not.stringMatching(adminDetailA.snapshot.fingerprint),
        fingerprintVersion: "review-snapshot-v1",
      },
    });
    expect(staleAdminQueue.items.find(
      ({ participantId }) => participantId === participantAId,
    )?.currentFingerprint).toBe(staleAdminDetailA.snapshot.fingerprint);
    expect(staleAdminDetailA.snapshot.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({
        completionId: participantAStaleMutation.campaignDbCompletion.completionId,
        evidenceHash: participantAStaleMutation.payload.evidenceHash,
        evidenceRef: participantAStaleMutation.payload.evidenceRef,
        id: participantAStaleMutation.campaignDbEvidence.evidenceId,
        liveProviderExecuted: true,
        taskId: adoptedTaskId,
        verificationAttemptId: participantAStaleMutation.payload.verificationAttemptId,
      }),
    ]));
    expect(staleAdminDetailA.history).toHaveLength(1);
    expect(staleAdminQueue.items.find(({ participantId }) => participantId === participantAId))
      .toMatchObject({ reviewState: "stale" });
    expect(staleAdminQueue.items.find(({ participantId }) => participantId === participantBId))
      .toMatchObject({ reviewState: "rejected_current" });
    expect(staleAdminQueue.summary).toEqual({
      approvedCurrent: 0,
      needsReviewCurrent: 0,
      pendingReview: 0,
      rejectedCurrent: 1,
      stale: 1,
      total: 2,
    });
    expect(staleWinners.rows).toEqual([]);
    expect(staleWinners.sourceFingerprint).not.toBe(approvedWinners.sourceFingerprint);
    expect(staleArtifactList).toEqual(adminRestartManifest.artifacts);
    expect(await readAdminDurableRowCounts(campaignId)).toEqual({
      artifactRows: 2,
      decisionRows: 2,
    });

    const participantJourneyABeforeRereview = await requestJson<ParticipantJourneyData>(
      secondServer,
      `/api/participant/campaigns/${campaignId}/journey`,
      { headers: participantSessionA2.headers("trace-pg-participant-a-before-rereview") },
    );
    expect(participantJourneyABeforeRereview.payload).toMatchObject({
      eligibility: { eligible: true, riskFlags: [] },
      participant: {
        participantId: participantAId,
        totalPoints: task.payload.points + adoptedTask.payload.points,
        walletAddress,
      },
      ranking: {
        participantCount: 2,
        rank: 1,
        totalPoints: task.payload.points + adoptedTask.payload.points,
        walletAddress,
      },
    });
    const rereviewA = await requestAdminJson<AdminDecisionReceiptData>(
      secondServer,
      `/api/admin/campaigns/${campaignId}/reviews/${participantAId}/decisions`,
      {
        body: JSON.stringify({
          decision: "approved",
          note: "Updated canonical evidence verified.",
          reasonCode: "evidence_verified",
          snapshotFingerprint: staleAdminDetailA.snapshot.fingerprint,
        }),
        headers: adminSessionA2.headers("trace-pg-admin-a-rereview", {
          "Idempotency-Key": `rereview-a-${randomUUID()}`,
        }),
        method: "POST",
      },
      [201],
    );
    expect(rereviewA.data).toMatchObject({
      campaignId,
      created: true,
      participantId: participantAId,
      snapshotFingerprint: staleAdminDetailA.snapshot.fingerprint,
      version: 2,
    });
    expect(rereviewA.data.decisionId).not.toBe(createdApproveReceipt?.decisionId);

    const restoredAdminDetailA = (await requestAdminJson<AdminReviewDetailData>(
      secondServer,
      `/api/admin/campaigns/${campaignId}/reviews/${participantAId}`,
      { headers: adminSessionA2.headers("trace-pg-admin-a-restored-detail") },
    )).data;
    const restoredAdminDetailB = (await requestAdminJson<AdminReviewDetailData>(
      secondServer,
      `/api/admin/campaigns/${campaignId}/reviews/${participantBId}`,
      { headers: adminSessionA2.headers("trace-pg-admin-b-restored-detail") },
    )).data;
    const restoredWinners = (await requestAdminJson<AdminWinnerData>(
      secondServer,
      `/api/admin/campaigns/${campaignId}/winners`,
      { headers: adminSessionA2.headers("trace-pg-admin-restored-winners") },
    )).data;
    expect(restoredAdminDetailA.reviewState).toBe("approved_current");
    expect(restoredAdminDetailA.currentDecision).toMatchObject({
      decision: "approved",
      decisionId: rereviewA.data.decisionId,
      snapshotFingerprint: staleAdminDetailA.snapshot.fingerprint,
      version: 2,
    });
    expect(restoredAdminDetailA.history.map(({ version }) => version)).toEqual([2, 1]);
    expect(restoredAdminDetailA.history[1]).toEqual(
      adminRestartManifest.decisionDetails.participantA.history[0],
    );
    expect(restoredAdminDetailB).toEqual(adminRestartManifest.decisionDetails.participantB);
    expect(restoredWinners).toMatchObject({
      campaignId,
      rows: [{
        campaignId,
        decisionId: rereviewA.data.decisionId,
        decisionVersion: 2,
        participantId: participantAId,
        rank: 1,
        snapshotFingerprint: staleAdminDetailA.snapshot.fingerprint,
        totalPoints: task.payload.points + adoptedTask.payload.points,
        walletAddress,
      }],
      sourceVersion: "artifact-source-v1",
    });
    expect(restoredWinners.sourceFingerprint).not.toBe(approvedWinners.sourceFingerprint);

    const participantJourneyAAfterRereview = await requestJson<ParticipantJourneyData>(
      secondServer,
      `/api/participant/campaigns/${campaignId}/journey`,
      { headers: participantSessionA2.headers("trace-pg-participant-a-after-rereview") },
    );
    expect(participantJourneyAAfterRereview.payload).toEqual(participantJourneyABeforeRereview.payload);
    expect(await readCampaignSnapshotFromDatabase(campaignId)).toEqual(participantFactsAfterStaleMutation);
    expect(await readAdminDurableRowCounts(campaignId)).toEqual({
      artifactRows: 2,
      decisionRows: 3,
    });

    const immutableArtifactList = (await requestAdminJson<AdminArtifactListData>(
      secondServer,
      `/api/admin/campaigns/${campaignId}/artifacts?limit=10`,
      { headers: adminSessionA2.headers("trace-pg-admin-immutable-artifacts") },
    )).data;
    const immutableCsvDetail = (await requestAdminJson<AdminArtifactDetailData>(
      secondServer,
      `/api/admin/campaigns/${campaignId}/artifacts/${csvArtifact.artifactId}`,
      { headers: adminSessionA2.headers("trace-pg-admin-immutable-csv-detail") },
    )).data;
    const immutableJsonDetail = (await requestAdminJson<AdminArtifactDetailData>(
      secondServer,
      `/api/admin/campaigns/${campaignId}/artifacts/${jsonArtifact.artifactId}`,
      { headers: adminSessionA2.headers("trace-pg-admin-immutable-json-detail") },
    )).data;
    const immutableCsvDownload = await assertExactArtifactDownload(
      secondServer,
      adminSessionA2,
      csvArtifact,
      "trace-pg-admin-immutable-csv-download",
    );
    const immutableJsonDownload = await assertExactArtifactDownload(
      secondServer,
      adminSessionA2,
      jsonArtifact,
      "trace-pg-admin-immutable-json-download",
    );
    expect(immutableArtifactList).toEqual(adminRestartManifest.artifacts);
    expect(immutableCsvDetail).toEqual(adminRestartManifest.artifactDetails.csv);
    expect(immutableJsonDetail).toEqual(adminRestartManifest.artifactDetails.json);
    expect(toAdminDownloadManifest(immutableCsvDownload)).toEqual(adminRestartManifest.downloads.csv);
    expect(toAdminDownloadManifest(immutableJsonDownload)).toEqual(adminRestartManifest.downloads.json);

    const otherWalletSession = await issueProjectOwnerSession(
      secondServer,
      { address: "2F4PostgresIsolatedOwner" },
      "trace-pg-other-wallet-session",
    );
    const otherWalletRecovery = await requestJson<CampaignListData>(
      secondServer,
      "/api/projects/postgres-restart-project/campaigns?status=draft&limit=100",
      { headers: otherWalletSession.headers("trace-pg-other-wallet-recovery") },
    );
    const otherWalletAdd = await expectNegativeCaseNoParticipantJourneyWrite(
      "non-owner Task mutation",
      {
        diagnosticCode: "AUTH_OWNER_MISMATCH",
        field: "ownerAddress",
        outerCode: "AUTH_FORBIDDEN",
        status: 403,
        traceId: "trace-pg-other-wallet-add",
      },
      () => requestApi(
        secondServer,
        `/api/campaigns/${campaignId}/tasks`,
        {
          body: JSON.stringify({
            evidenceRule: { source: "MANUAL" },
            points: 10,
            required: false,
            templateCode: "forbidden_other_wallet_add",
            verificationType: "MANUAL",
            walletCompatibility: "ANY",
          }),
          headers: otherWalletSession.headers("trace-pg-other-wallet-add"),
          method: "POST",
        },
      ),
    );
    const otherWalletGenerate = await expectNegativeCaseNoParticipantJourneyWrite(
      "non-owner Task generation",
      {
        diagnosticCode: "AUTH_OWNER_MISMATCH",
        field: "ownerAddress",
        outerCode: "AUTH_FORBIDDEN",
        status: 403,
        traceId: "trace-pg-other-wallet-generate",
      },
      () => requestApi(
        secondServer,
        `/api/campaigns/${campaignId}/tasks/generate`,
        {
          body: JSON.stringify({
            goal: created.payload.goal,
            product: "Campaign OS",
            targetUsers: ["project owners"],
            walletPolicy: created.payload.walletPolicy,
          }),
          headers: otherWalletSession.headers("trace-pg-other-wallet-generate"),
          method: "POST",
        },
      ),
    );
    const unknownSession = await expectNegativeCaseNoParticipantJourneyWrite(
      "unknown Owner session",
      {
        diagnosticCode: "AUTH_SESSION_INVALID",
        field: "x-campaign-os-session-id",
        outerCode: "AUTH_SESSION_INVALID",
        status: 401,
        traceId: "trace-pg-unknown-session",
      },
      () => requestApi(
        secondServer,
        "/api/projects/postgres-restart-project/campaigns?status=draft&limit=100",
        {
          headers: sessionB.headers("trace-pg-unknown-session", {
            "x-campaign-os-session-id": "unissued-wp05-session",
          }),
        },
      ),
    );
    const mismatchedSession = await expectNegativeCaseNoParticipantJourneyWrite(
      "mismatched Owner wallet header",
      {
        diagnosticCode: "AUTH_SESSION_INVALID",
        field: "x-campaign-os-wallet-address",
        outerCode: "AUTH_SESSION_INVALID",
        status: 401,
        traceId: "trace-pg-mismatched-session",
      },
      () => requestApi(
        secondServer,
        "/api/projects/postgres-restart-project/campaigns?status=draft&limit=100",
        {
          headers: sessionB.headers("trace-pg-mismatched-session", {
            "x-campaign-os-wallet-address": "2F4MismatchedOwnerClaim",
          }),
        },
      ),
    );
    const invalidIssuerSession = await issueProjectOwnerSession(
      secondServer,
      {
        address: "2F4InvalidIssuerOwner",
        productionRequired: true,
      },
      "trace-pg-invalid-issuer-session",
    );
    expect(invalidIssuerSession.data.payload.issuer).toMatchObject({
      issuerMode: "production_blocked",
      valid: false,
    });
    const invalidIssuer = await expectNegativeCaseNoParticipantJourneyWrite(
      "invalid Owner session issuer",
      {
        diagnosticCode: "AUTH_SESSION_INVALID",
        field: "authSession.issuer",
        outerCode: "AUTH_SESSION_INVALID",
        status: 401,
        traceId: "trace-pg-invalid-issuer",
      },
      () => requestApi(
        secondServer,
        "/api/projects/postgres-restart-project/campaigns?status=draft&limit=100",
        { headers: invalidIssuerSession.headers("trace-pg-invalid-issuer") },
      ),
    );
    const forbiddenRole = await expectNegativeCaseNoParticipantJourneyWrite(
      "forbidden Owner route role",
      {
        diagnosticCode: "AUTH_ROLE_FORBIDDEN",
        field: "authSession.roleIds",
        outerCode: "AUTH_FORBIDDEN",
        status: 403,
        traceId: "trace-pg-forbidden-role",
      },
      () => requestApi(
        secondServer,
        "/api/projects/postgres-restart-project/campaigns?status=draft&limit=100",
        {
          headers: sessionB.headers("trace-pg-forbidden-role", {
            "x-campaign-os-roles": "participant",
          }),
        },
      ),
    );
    const missingCampaign = await expectNegativeCaseNoParticipantJourneyWrite(
      "missing Campaign",
      {
        diagnosticCode: "INVALID_CAMPAIGN",
        field: "campaignId",
        outerCode: "INVALID_CAMPAIGN",
        status: 404,
        traceId: "trace-pg-missing-campaign",
      },
      () => requestApi(
        secondServer,
        "/api/campaigns/campaign-missing-wp05/tasks/generate",
        {
          body: JSON.stringify({
            goal: "Do not leak missing Campaign ownership",
            product: "Campaign OS",
            targetUsers: ["project owners"],
            walletPolicy: "ANY",
          }),
          headers: sessionB.headers("trace-pg-missing-campaign"),
          method: "POST",
        },
      ),
    );

    expect(otherWalletRecovery.payload).toMatchObject({
      campaignDb: { draftCount: 0 },
      items: [],
      summary: { totalCampaigns: 0 },
    });
    expect(JSON.stringify(missingCampaign.envelope)).not.toContain(ownerAddress);
    expect(JSON.stringify(missingCampaign.envelope)).not.toContain(otherWalletSession.data.payload.address);
    for (const result of [
      oldSessionAfterRestart,
      otherWalletAdd,
      otherWalletGenerate,
      unknownSession,
      mismatchedSession,
      invalidIssuer,
      forbiddenRole,
      missingCampaign,
    ]) {
      const serialized = JSON.stringify(result.envelope).toLowerCase();

      expect(result.envelope.data).toBeUndefined();
      expect(result.envelope.traceId).toMatch(/^trace-pg-/);
      expect(serialized).not.toContain("postgresql://");
      expect(serialized).not.toContain("stack");
      expect(serialized).not.toContain("password");
    }
    const afterNegativeSnapshot = await (async () => {
      const pool = createAuditPool();

      try {
        return await readCampaignSnapshot(pool, campaignId);
      } finally {
        await pool.end();
      }
    })();
    expect(afterNegativeSnapshot).toEqual(participantFactsAfterStaleMutation);

    const unavailableUrl = new URL(databaseUrl);
    unavailableUrl.port = "1";
    const unavailableServer = await startServer(unavailableUrl.toString(), "100");
    const unavailableOwnerSession = await issueProjectOwnerSession(
      unavailableServer,
      { address: "2F4UnavailableDatabaseOwner" },
      "trace-pg-unavailable-session",
    );
    const unavailableCreate = await expectNegativeCaseNoParticipantJourneyWrite(
      "PostgreSQL-unavailable Campaign create",
      {
        diagnosticCode: "POSTGRES_CAMPAIGN_STORE_QUERY_FAILED",
        field: "campaignDb",
        outerCode: "PERSISTENCE_UNAVAILABLE",
        status: 503,
        traceId: "trace-pg-unavailable-create",
      },
      () => requestApi(
        unavailableServer,
        "/api/campaigns",
        {
          body: JSON.stringify({
            duration: "2026-09-01/2026-09-14",
            endTime: "2026-09-14T23:59:59Z",
            goal: "Fail closed without PostgreSQL",
            ownerAddress: unavailableOwnerSession.data.payload.address,
            projectId: "postgres-unavailable-project",
            rewardDescription: "No fallback write is allowed.",
            startTime: "2026-09-01T00:00:00Z",
          }),
          headers: unavailableOwnerSession.headers("trace-pg-unavailable-create"),
          method: "POST",
        },
      ),
    );
    expect(unavailableCreate.envelope.data).toBeUndefined();
    expect(JSON.stringify(unavailableCreate.envelope).toLowerCase()).not.toContain("local-task-");
    const unavailableParticipantSession = await issueParticipantSession(
      unavailableServer,
      { adapterName: "PortkeyExtensionWallet", address: walletAddress },
      "trace-pg-unavailable-participant-session",
    );
    const unavailableJourney = await expectNegativeCaseNoParticipantJourneyWrite(
      "PostgreSQL-unavailable Participant journey",
      {
        diagnosticCode: "POSTGRES_CAMPAIGN_STORE_QUERY_FAILED",
        field: "campaignDb",
        outerCode: "PERSISTENCE_UNAVAILABLE",
        status: 503,
        traceId: "trace-pg-unavailable-participant-journey",
      },
      () => requestApi(
        unavailableServer,
        `/api/participant/campaigns/${campaignId}/journey`,
        { headers: unavailableParticipantSession.headers("trace-pg-unavailable-participant-journey") },
      ),
    );
    expect(JSON.stringify(unavailableJourney.envelope).toLowerCase()).not.toContain("local-task-");
    await stopServer(unavailableServer);
    const afterUnavailableSnapshot = await (async () => {
      const pool = createAuditPool();

      try {
        return await readCampaignSnapshot(pool, campaignId);
      } finally {
        await pool.end();
      }
    })();
    expect(afterUnavailableSnapshot).toEqual(participantFactsAfterStaleMutation);

    const concurrentSessions = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      issueProjectOwnerSession(
        secondServer,
        { address: `2F4ConcurrentOwner${index.toString().padStart(2, "0")}` },
        `trace-pg-concurrent-session-${index}`,
      )));
    const concurrentCampaigns = await Promise.all(concurrentSessions.map((session, index) => {
      const concurrentOwner = session.data.payload.address;

      return requestJson<CampaignCreateData>(secondServer, "/api/campaigns", {
        body: JSON.stringify({
          duration: "2026-09-01/2026-09-14",
          endTime: "2026-09-14T23:59:59Z",
          goal: `Concurrent PostgreSQL Campaign ${index}`,
          ownerAddress: concurrentOwner,
          projectId: `postgres-concurrent-project-${index}`,
          rewardDescription: "Concurrent PostgreSQL review rewards.",
          startTime: "2026-09-01T00:00:00Z",
        }),
        headers: session.headers(`trace-pg-concurrent-create-${index}`),
        method: "POST",
      });
    }));
    const concurrentCampaignIds = concurrentCampaigns.map((item) => item.payload.id);

    expect(new Set(concurrentCampaignIds).size).toBe(20);
    expect(concurrentCampaignIds).not.toContain(campaignId);

    const secondCampaignId = concurrentCampaignIds[0]!;
    const secondTask = await requestJson<TaskCreateData>(
      secondServer,
      `/api/campaigns/${secondCampaignId}/tasks`,
      {
        body: JSON.stringify({
          evidenceRule: controlledOnChainEvidenceRule({ minAmount: 1, source: "AELFSCAN" }),
          points: 120,
          required: true,
          templateCode: "bridge_ebridge",
          verificationType: "ON_CHAIN",
          walletCompatibility: "ANY",
        }),
        headers: concurrentSessions[0]!.headers("trace-pg-concurrent-task-required"),
        method: "POST",
      },
    );
    const secondTaskId = secondTask.campaignDbTask.taskId;
    const atomicTask = await requestJson<TaskCreateData>(
      secondServer,
      `/api/campaigns/${secondCampaignId}/tasks`,
      {
        body: JSON.stringify({
          evidenceRule: controlledOnChainEvidenceRule({ minAmount: 1, source: "AELFSCAN" }),
          points: 80,
          required: false,
          templateCode: "atomic_same_wallet_task",
          verificationType: "ON_CHAIN",
          walletCompatibility: "ANY",
        }),
        headers: concurrentSessions[0]!.headers("trace-pg-concurrent-task-optional"),
        method: "POST",
      },
    );
    const atomicTaskId = atomicTask.campaignDbTask.taskId;
    const atomicWallet = "2F4AtomicVerificationWallet";
    const atomicParticipantSession = await issueParticipantSession(
      secondServer,
      { adapterName: "PortkeyExtensionWallet", address: atomicWallet },
      "trace-pg-atomic-participant-session",
    );
    const atomicVerifications = await Promise.all(
      [secondTaskId, atomicTaskId].map((verificationTaskId, index) =>
        requestJson<VerificationData>(secondServer, `/api/tasks/${verificationTaskId}/verify`, {
          body: JSON.stringify({
            campaignId: secondCampaignId,
          }),
          headers: atomicParticipantSession.headers(`trace-pg-atomic-verify-${index}`),
          method: "POST",
        })),
    );

    expect(new Set(atomicVerifications.map(
      (item) => item.campaignDbCompletion.completionId,
    )).size).toBe(2);
    expect(new Set(atomicVerifications.map(
      (item) => item.campaignDbEvidence.evidenceId,
    )).size).toBe(2);

    const concurrentWallets = Array.from(
      { length: 10 },
      (_, index) => `2F4ConcurrentWallet${index.toString().padStart(2, "0")}`,
    );
    const concurrentParticipantSessions = await Promise.all(concurrentWallets.map((address, index) =>
      issueParticipantSession(
        secondServer,
        { adapterName: "PortkeyExtensionWallet", address },
        `trace-pg-concurrent-participant-session-${index}`,
      )));
    const verificationTargets = [
      ...concurrentWallets.map((wallet, index) => ({
        campaignId,
        session: concurrentParticipantSessions[index]!,
        taskId,
        wallet,
      })),
      ...concurrentWallets.map((wallet, index) => ({
        campaignId: secondCampaignId,
        session: concurrentParticipantSessions[index]!,
        taskId: secondTaskId,
        wallet,
      })),
    ];

    const verifications = await Promise.all(verificationTargets.map((target, index) =>
      requestJson<VerificationData>(secondServer, `/api/tasks/${target.taskId}/verify`, {
        body: JSON.stringify({
          campaignId: target.campaignId,
        }),
        headers: target.session.headers(`trace-pg-concurrent-verify-${index}`),
        method: "POST",
      })));
    expect(new Set(verifications.map((item) => item.campaignDbCompletion.completionId)).size).toBe(20);
    expect(new Set(verifications.map((item) => item.campaignDbEvidence.evidenceId)).size).toBe(20);

    const auditPool = createAuditPool();

    try {
      const campaignRows = await auditPool.query<{ id: string }>(
        "SELECT id FROM campaign_os.campaigns WHERE id = ANY($1::text[])",
        [concurrentCampaignIds],
      );
      const participantRows = await auditPool.query<{ campaign_id: string; count: string }>(
        `
          SELECT campaign_id, COUNT(*)::text AS count
          FROM campaign_os.campaign_participants
          WHERE campaign_id = ANY($1::text[])
            AND wallet_address LIKE '2F4ConcurrentWallet%'
          GROUP BY campaign_id
          ORDER BY campaign_id
        `,
        [[campaignId, secondCampaignId]],
      );
      const completionRows = await auditPool.query<{ campaign_id: string; count: string }>(
        `
          SELECT campaign_id, COUNT(*)::text AS count
          FROM campaign_os.campaign_task_completions
          WHERE campaign_id = ANY($1::text[])
            AND wallet_address LIKE '2F4ConcurrentWallet%'
          GROUP BY campaign_id
          ORDER BY campaign_id
        `,
        [[campaignId, secondCampaignId]],
      );
      const atomicRows = await auditPool.query<{
        completion_count: string;
        evidence_count: string;
        partial_evidence_count: string;
        total_points: number;
      }>(
        `
          SELECT
            participant.total_points,
            (
              SELECT COUNT(*)::text
              FROM campaign_os.campaign_task_completions AS completion
              WHERE completion.campaign_id = participant.campaign_id
                AND completion.wallet_address = participant.wallet_address
            ) AS completion_count,
            (
              SELECT COUNT(*)::text
              FROM campaign_os.campaign_task_evidence AS evidence
              WHERE evidence.campaign_id = participant.campaign_id
                AND evidence.wallet_address = participant.wallet_address
            ) AS evidence_count,
            (
              SELECT COUNT(*)::text
              FROM campaign_os.campaign_task_evidence AS evidence
              LEFT JOIN campaign_os.campaign_task_completions AS completion
                ON completion.campaign_id = evidence.campaign_id
                AND completion.task_id = evidence.task_id
                AND completion.wallet_address = evidence.wallet_address
                AND completion.id = evidence.completion_id
              WHERE evidence.campaign_id = participant.campaign_id
                AND evidence.wallet_address = participant.wallet_address
                AND completion.id IS NULL
            ) AS partial_evidence_count
          FROM campaign_os.campaign_participants AS participant
          WHERE participant.campaign_id = $1
            AND participant.wallet_address = $2
        `,
        [secondCampaignId, atomicWallet],
      );

      expect(campaignRows.rows).toHaveLength(20);
      expect(participantRows.rows.map((row) => Number(row.count))).toEqual([10, 10]);
      expect(completionRows.rows.map((row) => Number(row.count))).toEqual([10, 10]);
      expect(atomicRows.rows).toEqual([{
        completion_count: "2",
        evidence_count: "2",
        partial_evidence_count: "0",
        total_points: 200,
      }]);

      await auditPool.query(`
        INSERT INTO campaign_os.campaigns (
          id,
          project_id,
          owner_address,
          status,
          default_locale,
          supported_locales,
          wallet_policy,
          contract_mode,
          goal,
          duration,
          reward_description,
          reward_disclaimer_hash,
          metadata_uri,
          metadata_hash,
          start_time,
          end_time,
          publish_readiness,
          created_at,
          updated_at
        )
        SELECT
          '000-nfr-campaign-' || lpad(campaign_number::text, 3, '0'),
          'nfr-project-' || lpad(campaign_number::text, 3, '0'),
          '2F4NfrOwner' || lpad(campaign_number::text, 3, '0'),
          'draft',
          'en-US',
          '["en-US"]'::jsonb,
          'ANY',
          'OFF_CHAIN_MVP',
          'PostgreSQL NFR Campaign ' || campaign_number,
          '2026-10-01/2026-10-31',
          'PostgreSQL NFR review rewards.',
          NULL,
          NULL,
          NULL,
          '2026-10-01T00:00:00Z'::timestamptz,
          '2026-10-31T23:59:59Z'::timestamptz,
          '{"ready":true,"blockers":[],"warnings":[]}'::jsonb,
          '2026-07-13T00:00:00Z'::timestamptz,
          '2026-07-13T00:00:00Z'::timestamptz
        FROM generate_series(1, 100) AS campaigns(campaign_number)
      `);
      await auditPool.query(`
        INSERT INTO campaign_os.campaign_tasks (
          id,
          campaign_id,
          template_code,
          verification_type,
          wallet_compatibility,
          points,
          required,
          evidence_rule,
          created_at,
          updated_at
        )
        SELECT
          '000-nfr-task-'
            || lpad(campaign_number::text, 3, '0')
            || '-'
            || lpad(task_number::text, 2, '0'),
          '000-nfr-campaign-' || lpad(campaign_number::text, 3, '0'),
          'nfr_task_' || lpad(task_number::text, 2, '0'),
          'ON_CHAIN',
          'ANY',
          10,
          true,
          '{"minAmount":1,"source":"AELFSCAN"}'::jsonb,
          '2026-07-13T00:00:00Z'::timestamptz,
          '2026-07-13T00:00:00Z'::timestamptz
        FROM generate_series(1, 100) AS campaigns(campaign_number)
        CROSS JOIN generate_series(1, 10) AS tasks(task_number)
      `);
      await auditPool.query(`
        INSERT INTO campaign_os.campaign_participants (
          id,
          campaign_id,
          wallet_address,
          account_type,
          wallet_source,
          wallet_type_verified,
          wallet_signature_status,
          wallet_verified_at,
          locale_preference,
          total_points,
          rank,
          risk_flags,
          created_at,
          updated_at
        )
        SELECT
          '000-nfr-participant-' || lpad(participant_number::text, 3, '0'),
          '000-nfr-campaign-001',
          '2F4NfrParticipant' || lpad(participant_number::text, 3, '0'),
          'EOA',
          'PORTKEY_EOA_EXTENSION',
          true,
          'signed',
          '2026-07-13T00:00:00Z'::timestamptz,
          'en-US',
          100,
          NULL,
          '[]'::jsonb,
          '2026-07-13T00:00:00Z'::timestamptz,
          '2026-07-13T00:00:00Z'::timestamptz
        FROM generate_series(1, 100) AS participants(participant_number)
      `);
      await auditPool.query(`
        INSERT INTO campaign_os.campaign_task_completions (
          id,
          campaign_id,
          task_id,
          wallet_address,
          account_type,
          wallet_source,
          status,
          evidence_source,
          evidence_id,
          evidence_hash,
          points_awarded,
          completed_at,
          created_at,
          updated_at
        )
        SELECT
          '000-nfr-completion-'
            || lpad(participant_number::text, 3, '0')
            || '-'
            || lpad(task_number::text, 2, '0'),
          '000-nfr-campaign-001',
          '000-nfr-task-001-' || lpad(task_number::text, 2, '0'),
          '2F4NfrParticipant' || lpad(participant_number::text, 3, '0'),
          'EOA',
          'PORTKEY_EOA_EXTENSION',
          'completed',
          'AELFSCAN',
          '000-nfr-evidence-'
            || lpad(participant_number::text, 3, '0')
            || '-'
            || lpad(task_number::text, 2, '0'),
          'nfr-evidence-hash-'
            || lpad(participant_number::text, 3, '0')
            || '-'
            || lpad(task_number::text, 2, '0'),
          10,
          '2026-07-13T00:00:00Z'::timestamptz,
          '2026-07-13T00:00:00Z'::timestamptz,
          '2026-07-13T00:00:00Z'::timestamptz
        FROM generate_series(1, 100) AS participants(participant_number)
        CROSS JOIN generate_series(1, 10) AS tasks(task_number)
      `);
      await auditPool.query(`
        INSERT INTO campaign_os.campaign_task_evidence (
          id,
          campaign_id,
          task_id,
          wallet_address,
          completion_id,
          account_type,
          wallet_source,
          status,
          evidence_source,
          evidence_hash,
          evidence_ref,
          diagnostic_codes,
          points_awarded,
          captured_at,
          live_contract_executed,
          live_provider_executed,
          live_reward_executed,
          live_storage_executed,
          created_at,
          updated_at
        )
        SELECT
          '000-nfr-evidence-'
            || lpad(participant_number::text, 3, '0')
            || '-'
            || lpad(task_number::text, 2, '0'),
          '000-nfr-campaign-001',
          '000-nfr-task-001-' || lpad(task_number::text, 2, '0'),
          '2F4NfrParticipant' || lpad(participant_number::text, 3, '0'),
          '000-nfr-completion-'
            || lpad(participant_number::text, 3, '0')
            || '-'
            || lpad(task_number::text, 2, '0'),
          'EOA',
          'PORTKEY_EOA_EXTENSION',
          'completed',
          'AELFSCAN',
          'nfr-evidence-hash-'
            || lpad(participant_number::text, 3, '0')
            || '-'
            || lpad(task_number::text, 2, '0'),
          NULL,
          '[]'::jsonb,
          10,
          '2026-07-13T00:00:00Z'::timestamptz,
          false,
          false,
          false,
          false,
          '2026-07-13T00:00:00Z'::timestamptz,
          '2026-07-13T00:00:00Z'::timestamptz
        FROM generate_series(1, 100) AS participants(participant_number)
        CROSS JOIN generate_series(1, 10) AS tasks(task_number)
      `);
      const nfrDataset = await auditPool.query<{
        campaign_count: string;
        completion_count: string;
        evidence_count: string;
        participant_count: string;
        task_count: string;
      }>(`
        SELECT
          (
            SELECT COUNT(*)::text
            FROM campaign_os.campaigns
            WHERE id LIKE '000-nfr-campaign-%'
          ) AS campaign_count,
          (
            SELECT COUNT(*)::text
            FROM campaign_os.campaign_tasks
            WHERE id LIKE '000-nfr-task-%'
          ) AS task_count,
          (
            SELECT COUNT(*)::text
            FROM campaign_os.campaign_participants
            WHERE campaign_id = '000-nfr-campaign-001'
          ) AS participant_count,
          (
            SELECT COUNT(*)::text
            FROM campaign_os.campaign_task_completions
            WHERE campaign_id = '000-nfr-campaign-001'
          ) AS completion_count,
          (
            SELECT COUNT(*)::text
            FROM campaign_os.campaign_task_evidence
            WHERE campaign_id = '000-nfr-campaign-001'
          ) AS evidence_count
      `);

      expect(nfrDataset.rows[0]).toEqual({
        campaign_count: "100",
        completion_count: "1000",
        evidence_count: "1000",
        participant_count: "100",
        task_count: "1000",
      });
    } finally {
      await auditPool.end();
    }

    const nfrTimings = {
      adminDetail: [] as number[],
      adminQueue: [] as number[],
      create: [] as number[],
      detail: [] as number[],
      eligibility: [] as number[],
      generatePreview: [] as number[],
      participantJourney: [] as number[],
      ranking: [] as number[],
      recovery: [] as number[],
      taskAdd: [] as number[],
    };
    const nfrDatasetOwnerSession = await issueProjectOwnerSession(
      secondServer,
      { address: "2F4NfrOwner001" },
      "trace-pg-nfr-dataset-owner-session",
    );
    const nfrParticipantAddress = "2F4NfrParticipant001";
    const nfrParticipantSession = await issueParticipantSession(
      secondServer,
      { adapterName: "PortkeyExtensionWallet", address: nfrParticipantAddress },
      "trace-pg-nfr-participant-session",
    );
    const initialNfrJourney = await requestJson<ParticipantJourneyData>(
      secondServer,
      "/api/participant/campaigns/000-nfr-campaign-001/journey",
      { headers: nfrParticipantSession.headers("trace-pg-nfr-participant-initial") },
    );
    expect(initialNfrJourney.payload).toMatchObject({
      eligibility: { eligible: true, score: 100, walletAddress: nfrParticipantAddress },
      participant: { totalPoints: 100, walletAddress: nfrParticipantAddress },
      ranking: { participantCount: 100, rank: 1, totalPoints: 100 },
    });
    expect(initialNfrJourney.payload.tasks).toHaveLength(10);

    for (let index = 0; index < 20; index += 1) {
      await requestJson<CampaignCreateData>(secondServer, "/api/campaigns", {
        body: JSON.stringify({
          duration: "2026-11-01/2026-11-14",
          endTime: "2026-11-14T23:59:59Z",
          goal: `PostgreSQL NFR create ${index}`,
          ownerAddress,
          projectId: `postgres-nfr-create-${index}`,
          rewardDescription: "PostgreSQL NFR create rewards.",
          startTime: "2026-11-01T00:00:00Z",
        }),
        headers: sessionB.headers(`trace-pg-nfr-create-${index}`),
        method: "POST",
      }, nfrTimings.create);
      await requestJson<CampaignListData>(
        secondServer,
        "/api/projects/nfr-project-001/campaigns?status=draft&limit=100",
        { headers: nfrDatasetOwnerSession.headers(`trace-pg-nfr-recovery-${index}`) },
        nfrTimings.recovery,
      );
      await requestJson<ParticipantJourneyData>(
        secondServer,
        "/api/participant/campaigns/000-nfr-campaign-001/journey",
        { headers: nfrParticipantSession.headers(`trace-pg-nfr-journey-${index}`) },
        nfrTimings.participantJourney,
      );
      await requestJson<EligibilityData>(
        secondServer,
        "/api/campaigns/000-nfr-campaign-001/eligibility",
        { headers: nfrParticipantSession.headers(`trace-pg-nfr-eligibility-${index}`) },
        nfrTimings.eligibility,
      );
      await requestJson<RankingData>(
        secondServer,
        "/api/campaigns/000-nfr-campaign-001/points-ranking-ledger-runtime",
        { headers: nfrParticipantSession.headers(`trace-pg-nfr-ranking-${index}`) },
        nfrTimings.ranking,
      );
      await requestJson<DetailData>(
        secondServer,
        "/api/owner/campaigns/000-nfr-campaign-001",
        { headers: nfrDatasetOwnerSession.headers(`trace-pg-nfr-detail-${index}`) },
        nfrTimings.detail,
      );
      await requestJson<TaskCreateData>(
        secondServer,
        "/api/campaigns/000-nfr-campaign-001/tasks",
        {
          body: JSON.stringify({
            evidenceRule: { minAmount: index + 1, source: "AELFSCAN" },
            points: 10,
            required: false,
            templateCode: `nfr_incremental_${index}`,
            verificationType: "ON_CHAIN",
            walletCompatibility: "ANY",
          }),
          headers: nfrDatasetOwnerSession.headers(`trace-pg-nfr-task-${index}`),
          method: "POST",
        },
        nfrTimings.taskAdd,
      );
      await requestJson<GeneratedTasksData>(
        secondServer,
        "/api/campaigns/000-nfr-campaign-001/tasks/generate",
        {
          body: JSON.stringify({
            goal: "Measure PostgreSQL-backed Generate preview",
            product: "Campaign OS",
            targetUsers: ["project owners"],
            walletPolicy: "ANY",
          }),
          headers: nfrDatasetOwnerSession.headers(`trace-pg-nfr-generate-${index}`),
          method: "POST",
        },
        nfrTimings.generatePreview,
      );
      await requestAdminJson<AdminQueueData>(
        secondServer,
        "/api/admin/campaigns/000-nfr-campaign-001/reviews",
        { headers: adminSessionA2.headers(`trace-pg-nfr-admin-queue-${index}`) },
        [200],
        nfrTimings.adminQueue,
      );
      await requestAdminJson<AdminReviewDetailData>(
        secondServer,
        "/api/admin/campaigns/000-nfr-campaign-001/reviews/000-nfr-participant-001",
        { headers: adminSessionA2.headers(`trace-pg-nfr-admin-detail-${index}`) },
        [200],
        nfrTimings.adminDetail,
      );
    }

    for (const [operation, samples] of Object.entries(nfrTimings)) {
      expect(samples, `${operation} sample count`).toHaveLength(20);
      expect(percentile95(samples), `${operation} p95`).toBeLessThanOrEqual(500);
    }
    console.info(`WP06 PostgreSQL NFR timings ${JSON.stringify(Object.fromEntries(
      Object.entries(nfrTimings).map(([operation, samples]) => [operation, summarizeTimings(samples)]),
    ))}`);

    expect(timings.length).toBeGreaterThanOrEqual(50);
    expect(percentile95(timings)).toBeLessThanOrEqual(500);
    await stopServer(secondServer);
    expect(shutdownTimings.every((duration) => duration <= 10_000)).toBe(true);
    expect(servers.size).toBe(0);
    expect(await waitForRuntimeDatabaseConnectionsToClose()).toBeLessThanOrEqual(10_000);
  }, 120_000);

  it("persists every provider failure posture without Evidence or points across restart", async () => {
    const ownerAddress = `2F4PostureOwner${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const participantAddress = `3E9PostureParticipant${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const firstServer = await startServer();
    const firstOwnerSession = await issueProjectOwnerSession(
      firstServer,
      { adapterName: "PortkeyAAWallet", address: ownerAddress },
      "trace-pg-posture-owner-a",
    );
    const created = await requestJson<CampaignCreateData>(firstServer, "/api/campaigns", {
      body: JSON.stringify({
        contractMode: "OFF_CHAIN_MVP",
        defaultLocale: "en-US",
        duration: "2026-08-01/2026-08-14",
        endTime: "2026-08-14T23:59:59Z",
        goal: "Recover non-completed verification posture",
        ownerAddress,
        projectId: `postgres-posture-${randomUUID().replace(/-/g, "").slice(0, 12)}`,
        rewardDescription: "Posture-only verification acceptance.",
        startTime: "2026-08-01T00:00:00Z",
        supportedLocales: ["en-US"],
        walletPolicy: "ANY",
      }),
      headers: firstOwnerSession.headers("trace-pg-posture-campaign"),
      method: "POST",
    });
    const campaignId = created.payload.id;
    const outcomeCases = [
      {
        diagnosticCode: "PROVIDER_MATCH_NEGATIVE",
        expectedHttpStatus: 200,
        outcome: "failed",
        scenario: "negative",
      },
      {
        diagnosticCode: "PROVIDER_PENDING",
        expectedHttpStatus: 202,
        outcome: "pending",
        scenario: "pending",
      },
      {
        diagnosticCode: "PROVIDER_HTTP_TIMEOUT",
        expectedHttpStatus: 202,
        outcome: "pending",
        scenario: "timeout",
      },
      {
        diagnosticCode: "PROVIDER_HTTP_RATE_LIMITED",
        expectedHttpStatus: 202,
        outcome: "pending",
        scenario: "429",
      },
      {
        diagnosticCode: "PROVIDER_HTTP_PROVIDER_UNAVAILABLE",
        expectedHttpStatus: 202,
        outcome: "pending",
        scenario: "5xx",
      },
      {
        diagnosticCode: "PROVIDER_HTTP_MALFORMED_RESPONSE",
        expectedHttpStatus: 200,
        outcome: "manual_review",
        scenario: "malformed",
      },
      {
        diagnosticCode: "PROVIDER_HTTP_RESPONSE_TOO_LARGE",
        expectedHttpStatus: 200,
        outcome: "manual_review",
        scenario: "oversized",
      },
      {
        diagnosticCode: "PROVIDER_HTTP_RESPONSE_TOO_LARGE",
        expectedHttpStatus: 200,
        outcome: "manual_review",
        scenario: "chunked",
      },
    ] as const;
    const taskCases = await Promise.all(outcomeCases.map(async ({
      diagnosticCode,
      expectedHttpStatus,
      outcome,
      scenario,
    }) => {
      const createdTask = await requestJson<TaskCreateData>(
        firstServer,
        `/api/campaigns/${campaignId}/tasks`,
        {
          body: JSON.stringify({
            evidenceRule: controlledOnChainEvidenceRule({ methodName: scenario, source: "AELFSCAN" }),
            points: 40,
            required: true,
            templateCode: `provider_${scenario}`,
            verificationType: "ON_CHAIN",
            walletCompatibility: "ANY",
          }),
          headers: firstOwnerSession.headers(`trace-pg-posture-task-${outcome}`),
          method: "POST",
        },
      );

      return {
        diagnosticCode,
        expectedHttpStatus,
        outcome,
        scenario,
        taskId: createdTask.campaignDbTask.taskId,
      };
    }));
    const firstParticipantSession = await issueParticipantSession(
      firstServer,
      { adapterName: "PortkeyExtensionWallet", address: participantAddress },
      "trace-pg-posture-participant-a",
    );
    const attempts = new Map<string, string>();
    const scenarioCountsBefore = new Map<ProviderVerificationSandboxScenario, number>(
      outcomeCases.map(({ scenario }) => [scenario, providerSandbox!.count(scenario)]),
    );

    for (const taskCase of taskCases) {
      const transportCallsBeforeScenario = requireServerTransportStats(firstServer).callCount;
      const result = await requestApi<AttemptOnlyVerificationData>(
        firstServer,
        `/api/tasks/${taskCase.taskId}/verify`,
        {
          body: JSON.stringify({ campaignId }),
          headers: firstParticipantSession.headers(`trace-pg-posture-verify-${taskCase.scenario}`),
          method: "POST",
        },
      );

      expect(result.envelope).toMatchObject({ ok: true });
      expect(result.envelope.data?.payload.diagnosticCodes, taskCase.scenario).toEqual([
        taskCase.diagnosticCode,
      ]);
      expect(result.envelope.data?.payload).toMatchObject({
        campaignId,
        outcome: taskCase.outcome,
        pointsAwarded: 0,
        status: taskCase.outcome,
        taskId: taskCase.taskId,
        walletAddress: participantAddress,
      });
      expect(providerSandbox!.count(taskCase.scenario), taskCase.scenario).toBe(
        (scenarioCountsBefore.get(taskCase.scenario) ?? 0) + 1,
      );
      expect(
        requireServerTransportStats(firstServer).callCount - transportCallsBeforeScenario,
        taskCase.scenario,
      ).toBe(1);
      expect(result.status, taskCase.scenario).toBe(taskCase.expectedHttpStatus);
      const attemptId = result.envelope.data?.payload.verificationAttemptId;
      expect(attemptId).toEqual(expect.any(String));
      attempts.set(taskCase.taskId, attemptId ?? "");
      expect(JSON.stringify(result.envelope.data)).not.toContain("campaignDbCompletion");
      expect(JSON.stringify(result.envelope.data)).not.toContain("campaignDbEvidence");
    }

    const firstJourney = await requestJson<ParticipantJourneyData>(
      firstServer,
      `/api/participant/campaigns/${campaignId}/journey`,
      { headers: firstParticipantSession.headers("trace-pg-posture-journey-a") },
    );
    const firstPosture = new Map(firstJourney.payload.tasks.map((entry) => [entry.taskId, entry]));

    for (const taskCase of taskCases) {
      expect(firstPosture.get(taskCase.taskId)).toMatchObject({
        completionId: null,
        evidenceId: null,
        pointsAwarded: 0,
        status: taskCase.outcome,
        verificationAttemptId: attempts.get(taskCase.taskId),
      });
    }
    expect(firstJourney.payload).toMatchObject({
      eligibility: { eligible: false, score: 0 },
      participant: { participantId: null, totalPoints: 0 },
      ranking: { rank: null, totalPoints: 0 },
    });

    const auditPool = createAuditPool();
    try {
      const counts = await auditPool.query<{
        completion_count: string;
        evidence_count: string;
        participant_count: string;
      }>(`
        SELECT
          (SELECT COUNT(*)::text FROM campaign_os.campaign_participants
            WHERE campaign_id = $1 AND wallet_address = $2) AS participant_count,
          (SELECT COUNT(*)::text FROM campaign_os.campaign_task_completions
            WHERE campaign_id = $1 AND wallet_address = $2) AS completion_count,
          (SELECT COUNT(*)::text FROM campaign_os.campaign_task_evidence
            WHERE campaign_id = $1 AND wallet_address = $2) AS evidence_count
      `, [campaignId, participantAddress]);
      const durableAttempts = await auditPool.query<{ id: string; status: string; task_id: string }>(`
        SELECT id, status, task_id
        FROM campaign_os.verification_attempts
        WHERE campaign_id = $1 AND wallet_address = $2
        ORDER BY task_id COLLATE "C" ASC
      `, [campaignId, participantAddress]);

      expect(counts.rows[0]).toEqual({
        completion_count: "0",
        evidence_count: "0",
        participant_count: "0",
      });
      expect(durableAttempts.rows).toHaveLength(taskCases.length);
      expect(new Map(durableAttempts.rows.map((row) => [row.task_id, row]))).toEqual(
        new Map(taskCases.map((taskCase) => [taskCase.taskId, {
          id: attempts.get(taskCase.taskId),
          status: taskCase.outcome,
          task_id: taskCase.taskId,
        }])),
      );
    } finally {
      await auditPool.end();
    }

    await stopServer(firstServer);
    expect(await waitForRuntimeDatabaseConnectionsToClose()).toBeLessThanOrEqual(10_000);
    const secondServer = await startServer();
    const secondParticipantSession = await issueParticipantSession(
      secondServer,
      { adapterName: "PortkeyExtensionWallet", address: participantAddress },
      "trace-pg-posture-participant-b",
    );
    const recoveredJourney = await requestJson<ParticipantJourneyData>(
      secondServer,
      `/api/participant/campaigns/${campaignId}/journey`,
      { headers: secondParticipantSession.headers("trace-pg-posture-journey-b") },
    );
    const recoveredPosture = new Map(
      recoveredJourney.payload.tasks.map((entry) => [entry.taskId, entry]),
    );

    for (const taskCase of taskCases) {
      expect(recoveredPosture.get(taskCase.taskId)).toMatchObject({
        completionId: null,
        evidenceId: null,
        pointsAwarded: 0,
        status: taskCase.outcome,
        verificationAttemptId: attempts.get(taskCase.taskId),
      });
    }
    expect(recoveredJourney.payload).toMatchObject({
      eligibility: { eligible: false, score: 0 },
      participant: { participantId: null, totalPoints: 0 },
      ranking: { rank: null, totalPoints: 0 },
    });
    await stopServer(secondServer);
    expect(await waitForRuntimeDatabaseConnectionsToClose()).toBeLessThanOrEqual(10_000);
  }, 90_000);
});
