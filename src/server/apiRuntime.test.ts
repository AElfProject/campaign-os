import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { campaignDetail } from "../domain/fixtures";
import { projectOwnerFundingProofRequiredEvidenceKeys } from "../domain/projectOwnerFundingProofReviewBridge";
import { rewardDistributionHandoffRequiredEvidenceKeys } from "../domain/rewardDistributionHandoffRuntime";
import { createCampaignOsApiRuntime, type ApiRuntimeResponse } from "./apiRuntime";
import { createBackendServiceReadinessReport } from "./backendService";
import {
  CampaignDbRepositoryError,
  createCampaignDbRepository,
  type CampaignDbRepository,
} from "./campaignDbRepository";
import { PostgresCampaignStoreError } from "./postgresCampaignDurableStore";
import { createWalletSessionRepository } from "./walletSessionRepository";
import {
  createCampaignOsJsonRepository,
  createCampaignOsMemoryRepository,
  persistenceBoundary,
  type CampaignOsRepository,
} from "./persistence";
import { startCampaignOsApiServer } from "./server";

const productionDatabaseRequiredReferenceKeys = [
  "CAMPAIGN_OS_DATABASE_PACKAGE",
  "CAMPAIGN_OS_DATABASE_PACKAGE_BINDING",
  "CAMPAIGN_OS_DATABASE_PROVIDER",
  "CAMPAIGN_OS_DATABASE_URL",
  "CAMPAIGN_OS_DATABASE_SECRET_REF",
  "CAMPAIGN_OS_DATABASE_POOL_POLICY",
  "CAMPAIGN_OS_DATABASE_MIGRATION_APPROVAL",
  "CAMPAIGN_OS_DATABASE_ROLLBACK_BACKUP_PLAN",
  "CAMPAIGN_OS_DATABASE_OBSERVABILITY_REF",
  "CAMPAIGN_OS_DATABASE_RUNBOOK_URL",
  "CAMPAIGN_OS_DATABASE_LIVE_ENABLEMENT",
] as const;

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
  campaignDbEvidence?: Array<{
    completionId?: string;
    evidenceHash: string;
    evidenceId: string;
    liveContractExecuted: false;
    liveProviderExecuted: false;
    liveRewardExecuted: false;
    liveStorageExecuted: false;
    taskId: string;
  }>;
  eligible: boolean;
  score?: number;
  status?: string;
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

interface WalletSessionRepositoryMetadataPayload {
  adapterId: string;
  created: boolean;
  recordId: string;
  repositoryId: "wallet-session-repository-runtime";
  sessionId: string;
  storeId: "wallet-sessions";
  upserted: true;
  walletAddress: string;
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
  evidence?: {
    evidenceHash?: string;
    evidenceId?: string;
    live: false;
  };
  evidenceId?: string;
  evidenceSource: string;
  evidenceHash?: string;
  liveContractExecuted?: false;
  liveProviderExecuted?: false;
  liveRewardExecuted?: false;
  liveStorageExecuted?: false;
  pointsAwarded: number;
  pointsAvailable?: number;
  status: string;
  taskId?: string;
  walletAddress?: string;
  walletSource?: string;
}

interface I18nDraftPayload {
  aiDraft?: boolean;
  campaignId?: string;
  contentKeys?: string[];
  draft?: Record<string, string>;
  fallbackToEnglish?: boolean;
  humanReviewRequired: boolean;
  sourceLocale: string;
  targetLocale: string;
}

interface ExportPreviewPayload {
  artifact?: {
    batchId?: string;
    campaignId?: string;
    checksum?: string;
    columns: string[];
    csvPreview?: string;
    fileName?: string;
    format: string;
    generatedMode: string;
    jsonPreview?: Array<Record<string, unknown>>;
    localPreviewMode: boolean;
    metadata?: {
      checksum: string;
      checksumAlgorithm?: string;
      payloadBytes?: number;
    };
    mimeType?: string;
    payload?: string;
    safety: {
      noDownloadUrl: true;
      noStorageWrite: true;
      noContractRoot: true;
      noRewardDistribution: true;
    };
  };
  artifactRegistry?: {
    artifactId: string;
    auditEvents: Array<{
      routeId: string;
      traceId: string;
      type: string;
    }>;
    checksum: string;
    expiresAt: string;
    retention: {
      mode: "local_review_ttl";
      productionStorageBacked: false;
      purgeRequired: true;
      ttlHours: number;
    };
    routeId: string;
    safety: {
      contractRootWriteEnabled: false;
      downloadUrlEnabled: false;
      forbiddenFieldsAbsent: true;
      localReviewOnly: true;
      objectKeyEnabled: false;
      providerCallEnabled: false;
      queueExecutionEnabled: false;
      rewardCustodyEnabled: false;
      rewardDistributionEnabled: false;
      schedulerExecutionEnabled: false;
      signedUrlEnabled: false;
      storageWriteEnabled: false;
      walletSigningEnabled: false;
    };
    traceId: string;
  };
  blockedRows?: number;
  campaignId: string;
  contractRootMode: string;
  eligibilityRootPacket?: {
    contractWriteEnabled: false;
    eligibleWalletCount: number;
    evidenceHashes: string[];
    exportBatchId: string;
    generatedMode: "local_review_only";
    mode: "eligibility_root";
    publicationStatus: "not_published";
    rootHash: string;
    rootId: string;
    rootVersion: number;
    rows: Array<{
      accountType: string;
      eligible: boolean;
      evidenceHashes: string[];
      localePreference: string;
      missingTasks: string[];
      rank?: number;
      riskFlags: string[];
      totalPoints: number;
      walletAddress: string;
      walletSource: string;
    }>;
    safety: {
      claimExecutionEnabled: false;
      contractWriteExecuted: false;
      providerCallExecuted: false;
      rewardCustodyEnabled: false;
      rewardDistributionEnabled: false;
      signedUrlGenerated: false;
      storageWriteExecuted: false;
      walletSignatureRequested: false;
    };
    totalRows: number;
  };
  exportBatchId?: string;
  format: string;
  readyRows: number;
  reviewRequiredRows?: number;
  rows?: Array<{
    accountType: string;
    eligible: boolean;
    evidenceHashes: string[];
    exportBatchId: string;
    localePreference: string;
    missingTasks: string[];
    rank?: number;
    rowStatus: string;
    taskRecords: Array<{
      evidenceHash?: string;
      evidenceId?: string;
      liveContractExecuted?: false;
      liveProviderExecuted?: false;
      liveRewardExecuted?: false;
      liveStorageExecuted?: false;
      pointsAwarded: number;
      required: boolean;
      status: string;
      taskId: string;
      templateCode: string;
    }>;
    totalPoints: number;
    walletAddress: string;
    walletSource: string;
  }>;
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

interface DeliveryReadinessPayload {
  campaignId: string;
  closeout: {
    rows: Array<{
      handoffTarget: string;
      itemId: string;
      queueId: string;
    }>;
    summary: {
      ready: boolean;
      topHandoffTarget: string;
      topQueueId: string;
      topRowId: string | null;
    };
  };
  groups: Array<{
    id: string;
    items: Array<{
      evidence: Record<string, string>;
      id: string;
      status: string;
    }>;
  }>;
  summary: {
    ready: boolean;
    totalItems: number;
  };
  traceability: {
    rows: Array<{
      itemId: string;
      proofLevel: string;
      status: string;
    }>;
    summary: {
      ready: boolean;
    };
  };
}

interface CompanionContractReadinessPayload {
  campaignId: string;
  categories: Array<{
    id: string;
    evidenceItems: Array<{
      kind: string;
      status: string;
    }>;
    status: string;
  }>;
  summary: {
    ready: boolean;
    totalCategories: number;
  };
}

interface ContractTransparencyPayload {
  campaignId: string;
  closeoutContext: {
    status: string;
    topGateId: string;
  };
  lanes: Array<{
    blocksExecution: boolean;
    id: string;
    readiness: string;
  }>;
  summary: {
    totalLanes: number;
    topLaneId: string;
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
    blockedRows?: number;
    previewModeCount: number;
    readyRows?: number;
    reviewRequiredRows?: number;
    totalRows?: number;
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

interface PublishDeliveryReviewPayload {
  backendRuntime: {
    noLiveSideEffects: Record<string, false>;
    productionDependencyBlockers: Array<{ code: string; field: string; message: string }>;
    productionReady: false;
    routeCoverage: {
      readyCount: number;
      reviewRequiredCount: number;
      routeCount: number;
    };
    status: string;
    tracePolicy: {
      failureEnvelopeTraceId: true;
      successEnvelopeTraceId: true;
      traceHeaderName: "x-campaign-os-trace-id";
    };
  };
  boundary: {
    "en-US": string;
  };
  campaignId: string;
  deliveryChecklist: {
    groups: Array<{
      groupId: string;
      totalItems: number;
    }>;
    totalItems: number;
  };
  diagnostics: Array<{ code: string; source: string }>;
  launchBundles: {
    bundles: Array<{ stage: string }>;
    summary: {
      handoffRequiredCount: number;
      totalBundles: number;
    };
  };
  publishGate: {
    counts: {
      blockers: number;
      passed: number;
      total: number;
      warnings: number;
    };
  };
  repositoryEvidence: {
    available: boolean;
    completedEvidenceCount: number;
    createdViaRepository?: boolean;
    evidenceHashCoverage: number;
    exportRowsWithEvidence: number;
    failedEvidenceCount: number;
    manualReviewEvidenceCount: number;
    noLiveSideEffects: {
      liveContractExecuted: false;
      liveProviderExecuted: false;
      liveRewardExecuted: false;
      liveStorageExecuted: false;
    };
    repositoryId?: string;
    storeId?: string;
    taskEvidenceCount: number;
  };
  source: string;
  status: string;
  summary: {
    checklistTotalCount: number;
    handoffReviewRequiredCount: number;
    launchBundleCount: number;
    productionBlockerCount: number;
    repositoryEvidenceCount: number;
  };
  traceId?: string;
}

interface PointsRankingLedgerRuntimePayload {
  campaignId: string;
  diagnostics: Array<{ code: string; source: string }>;
  eligibilityRoot: {
    contractRootMode: "none";
    eligibleWalletCount: number;
    generationMode: "local_preview";
    rootHash: string;
    rootId: string;
    totalRows: number;
  };
  ledger: {
    events: Array<{
      accountType: string;
      evidenceHash: string;
      evidenceSource: string;
      localePreference: string;
      pointsAwarded: number;
      riskFlags: string[];
      status: string;
      taskId: string;
      templateCode: string;
      verificationType: string;
      walletAddress: string;
      walletSource: string;
    }>;
    totalEvents: number;
  };
  noLiveSideEffects: Record<string, false>;
  ranking: {
    rows: Array<{
      accountType: string;
      eligible: boolean;
      evidenceHashes: string[];
      localePreference: string;
      missingTasks: string[];
      rank: number;
      riskFlags: string[];
      totalPoints: number;
      walletAddress: string;
      walletSource: string;
    }>;
  };
  source: "api_runtime" | "seeded_runtime" | "fallback";
  status: string;
  summary: {
    eligibleWallets: number;
    rankedWallets: number;
    totalLedgerEvents: number;
    totalPoints: number;
  };
  traceId?: string;
}

interface AnalyticsIngestionRuntimePayload {
  campaignId: string;
  diagnosticCodes: string[];
  eventCatalog: Array<{
    eventCount: number;
    id: string;
    localOnly: true;
    schemaState: "local_review";
  }>;
  metricLineage: Array<{
    id: string;
    inputCount: number;
    outputMetric: string;
  }>;
  noLiveSideEffects: Record<string, false>;
  productionReady: false;
  source: "server_runtime";
  status: string;
  summary: {
    eventGroupCount: number;
    metricLineageCount: number;
    totalEvents: number;
  };
  traceId?: string;
  warehouseHandoff: {
    eventWarehouseWriteAttempted: false;
    liveWarehouseWriteEnabled: false;
    productionReady: false;
    requiredConfigKeys: string[];
    status: string;
  };
}

interface ContractWriterRuntimePayload {
  approvalGates: Array<{
    id: string;
    requiredBeforeProduction: true;
    status: string;
  }>;
  campaignId: string;
  configHandoff: {
    missingConfigKeys: string[];
    productionReady: false;
    requiredConfigKeys: string[];
    status: string;
  };
  diagnosticCodes: string[];
  noLiveSideEffects: Record<string, false>;
  operationCatalog: Array<{
    contractName: string;
    operations: Array<{
      liveWriteEnabled: false;
      methodName: string;
      requiresIdempotency: true;
      requiresOperatorApproval: true;
      requiresSignerPolicy: true;
    }>;
  }>;
  productionReady: false;
  source: "server_runtime";
  status: string;
  summary: {
    contractGroupCount: number;
    operationCount: number;
    requiredConfigCount: number;
  };
  traceId?: string;
}

interface RewardDistributionHandoffRuntimePayload {
  campaignId: string;
  diagnosticCodes: string[];
  evidenceHandoff: {
    missingEvidenceKeys: string[];
    productionReady: false;
    requiredEvidenceKeys: string[];
    status: string;
  };
  exportLinkage: {
    derivedFrom: "seeded_export_preview";
    exportBatchIds: string[];
    localPreviewOnly: true;
    recipientCount: number;
  };
  items: Array<{
    id: string;
    liveExecutionEnabled: false;
    ownerRole: string;
    requiredBeforeProduction: true;
    state: string;
  }>;
  noLiveSideEffects: Record<string, false>;
  productionReady: false;
  requiredEvidenceKeys: string[];
  source: "server_runtime";
  status: string;
  summary: {
    itemCount: number;
    missingEvidenceCount: number;
    recipientCount: number;
  };
  traceId?: string;
}

interface ProjectOwnerFundingProofReviewPayload {
  campaignId: string;
  diagnosticCodes: string[];
  items: Array<{
    id: string;
    liveExecutionEnabled: false;
    requiredBeforeProduction: true;
    state: string;
  }>;
  productionReady: false;
  proofPackage: {
    missingEvidenceKeys: string[];
    productionReady: false;
    requiredEvidenceKeys: string[];
    reviewState: string;
    status: string;
    submittedByRole: string;
  };
  requiredEvidenceKeys: string[];
  safety: Record<string, false>;
  source: "server_runtime";
  status: string;
  summary: {
    blockedItemCount: number;
    readyItemCount: number;
    requiredItemCount: number;
    reviewRequiredItemCount: number;
    status: string;
  };
  traceId?: string;
  valid: true;
}

interface ProductionDatabaseHandoffReadinessPayload {
  diagnosticCodes: string[];
  id: "campaign-os-production-database-handoff-readiness";
  localMvpReady: true;
  migrationGate: {
    liveExecutionEnabled: false;
    status: string;
  };
  packageBinding: {
    bindingId: string;
    importPosture: "metadata_only_no_import";
    packageName: "pg";
    packageRef: "npm:pg";
  };
  productionReady: false;
  requiredReferences: Array<{
    key: string;
    redacted: true;
    requiredBeforeProduction: true;
    status: string;
  }>;
  safety: Record<string, false>;
  source: "server_runtime";
  status: string;
  storeCoverage: Array<{
    coverageStatus: string;
    migrationRequired: boolean;
    storeId: string;
  }>;
  summary: {
    requiredReferenceCount: number;
    status: string;
    storeCoverageCount: number;
  };
  traceId?: string;
  valid: true;
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

interface ExportArtifactAuditPayload {
  artifactId?: string;
  campaignId: string;
  filters?: {
    artifactId?: string;
    batchId?: string;
    format?: string;
    retentionState?: string;
    traceId?: string;
  };
  record?: {
    artifactId: string;
    batchId: string;
    campaignId: string;
    checksum: string;
    routeId: string;
    safety: {
      downloadUrlEnabled: false;
      localReviewOnly: true;
      storageWriteEnabled: false;
    };
    traceId: string;
  };
  records?: Array<{
    artifactId: string;
    batchId: string;
    campaignId: string;
    checksum: string;
    routeId: string;
    traceId: string;
  }>;
  safety: {
    downloadUrlEnabled: false;
    localReviewOnly: true;
    storageWriteEnabled: false;
  };
  summary?: {
    activeRecords: number;
    blockedRows: number;
    expiredRecords: number;
    readyRows: number;
    reviewRequiredRows: number;
    totalRecords: number;
    totalRows: number;
  };
}

interface LocalExportFileHandoffPayload {
  artifactId: string;
  auditDetail: {
    batchId: string;
    checksum: string;
    checksumAlgorithm: string;
    fileName: string;
    payloadBytes: number;
    previewRouteId: string;
    previewTraceId: string;
    retentionState: "active" | "expired";
    source: "deterministic_local_export";
  };
  campaignId: string;
  handoff: {
    artifactId: string;
    batchId: string;
    campaignId: string;
    checksum: string;
    checksumAlgorithm: string;
    fileName: string;
    format: "csv" | "json";
    mimeType: string;
    payload: string;
    payloadBytes: number;
    retention: {
      createdAt: string;
      expiresAt: string;
      mode: "local_review_ttl";
      productionStorageBacked: false;
      purgeRequired: boolean;
      state: "active" | "expired";
      ttlHours: number;
    };
    rowCounts: {
      blockedRows: number;
      readyRows: number;
      reviewRequiredRows: number;
      totalRows: number;
    };
    safety: {
      downloadUrlEnabled: false;
      localReviewOnly: true;
      signedUrlEnabled: false;
      storageWriteEnabled: false;
    };
    traceId: string;
  };
  safety: {
    downloadUrlEnabled: false;
    localReviewOnly: true;
    signedUrlEnabled: false;
    storageWriteEnabled: false;
  };
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
  "contractRootWriteEnabled",
  "downloadUrlEnabled",
  "objectKeyEnabled",
  "noContractWrite",
  "noExportFile",
  "noPrivateKeyBoundary",
  "noRewardDistribution",
  "noSignatureExecution",
  "noTransactionExecution",
  "providerCallEnabled",
  "queueExecutionEnabled",
  "rewardCustodyEnabled",
  "rewardDistributionEnabled",
  "schedulerExecutionEnabled",
  "signedUrlEnabled",
  "storageWriteEnabled",
  "walletSigningEnabled",
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

const expectNoForbiddenOwnKeys = (value: unknown, unsafeKeys: readonly string[]) => {
  const keys = collectKeys(value);

  for (const unsafeKey of unsafeKeys) {
    expect(keys).not.toContain(unsafeKey.toLowerCase());
  }
};

const expectNoForbiddenFragments = (value: unknown, fragments: readonly string[]) => {
  const serialized = JSON.stringify(value).toLowerCase();

  for (const fragment of fragments) {
    expect(serialized).not.toContain(fragment.toLowerCase());
  }
};

const stableTestHash = (input: string) => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
};

const expectedExportArtifactRegistryId = (
  payload: ExportPreviewPayload,
  routeId: string,
  traceId: string,
) => {
  if (!payload.artifact?.campaignId || !(payload.artifact.batchId ?? payload.exportBatchId)) {
    throw new Error("Expected export preview artifact to include registry identity fields.");
  }

  const batchId = payload.artifact.batchId ?? payload.exportBatchId;
  const checksum = payload.artifact.metadata?.checksum ?? payload.artifact.checksum;

  if (!checksum) {
    throw new Error("Expected export preview artifact to include registry checksum.");
  }

  return `export-artifact-local-${stableTestHash([
    payload.artifact.campaignId,
    batchId,
    payload.artifact.format,
    checksum,
    routeId,
    traceId,
  ].join("|"))}`;
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
  listTaskEvidence: async () => {
    throw new Error("campaign DB repository unavailable");
  },
  reset: async () => {
    throw new Error("campaign DB repository unavailable");
  },
  upsertTaskCompletion: async () => {
    throw new Error("campaign DB repository unavailable");
  },
  upsertTaskEvidence: async () => {
    throw new Error("campaign DB repository unavailable");
  },
  upsertTaskVerification: async () => {
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
    const expectedLocalProductionBackendReadiness = expect.objectContaining({
      deployHandoff: expect.objectContaining({
        contractsEndpoint: "/api/contracts",
        healthEndpoint: "/api/health",
        runtimeTarget: "api_service",
        smokeCommand: "npm run server:smoke",
        startCommand: "npm run server:start",
      }),
      noLiveSideEffects: expect.objectContaining({
        contractWriteExecuted: false,
        productionDatabaseConnected: false,
        providerNetworkExecuted: false,
        rewardDistributionExecuted: false,
        schedulerExecuted: false,
      }),
      productionReady: false,
      profile: expect.objectContaining({
        id: "local-review",
        missingRequiredConfigKeys: [],
        requiredConfigKeys: [],
        secretValuesExposed: false,
      }),
      routeCoverage: expect.objectContaining({
        missingApiSkillIds: [],
        requiredApiSkillCount: expect.any(Number),
        routeIds: expect.arrayContaining([
          "runtime.health",
          "runtime.contracts",
          "campaigns.publish.delivery.review",
          "campaigns.points.ranking.ledger.runtime",
          "campaigns.reward.distribution.handoff.readiness",
          "campaigns.reward.funding-proof.review",
          "campaigns.reward.funding-proof.review.submit",
          "campaigns.export.storage.readiness",
          "backend.production-database.handoff-readiness",
        ]),
        runtimeRouteCount: expect.any(Number),
      }),
      status: "ready",
      tracePolicy: expect.objectContaining({
        failureEnvelopeTraceId: true,
        startupLogIncludesTracePolicy: true,
        successEnvelopeTraceId: true,
        traceHeaderName: "x-campaign-os-trace-id",
      }),
    });
    expect(healthData).toMatchObject({
      productionBackendReadiness: expectedLocalProductionBackendReadiness,
    });
    expect(contractData).toMatchObject({
      productionBackendReadiness: expectedLocalProductionBackendReadiness,
      routes: expect.arrayContaining([
        expect.objectContaining({
          id: "campaigns.publish.delivery.review",
          method: "GET",
          path: "/api/campaigns/:campaignId/publish-delivery-review",
          readiness: "review_required",
        }),
        expect.objectContaining({
          id: "campaigns.points.ranking.ledger.runtime",
          method: "GET",
          path: "/api/campaigns/:campaignId/points-ranking-ledger-runtime",
          readiness: "review_required",
        }),
        expect.objectContaining({
          id: "campaigns.analytics.ingestion.readiness",
          method: "GET",
          path: "/api/campaigns/:campaignId/analytics/ingestion-readiness",
          readiness: "review_required",
        }),
        expect.objectContaining({
          id: "campaigns.contract.writer.readiness",
          method: "GET",
          path: "/api/campaigns/:campaignId/contract-writer/readiness",
          readiness: "review_required",
        }),
        expect.objectContaining({
          id: "campaigns.reward.distribution.handoff.readiness",
          method: "GET",
          path: "/api/campaigns/:campaignId/reward-distribution/handoff-readiness",
          readiness: "review_required",
        }),
        expect.objectContaining({
          id: "campaigns.reward.funding-proof.review",
          method: "GET",
          path: "/api/campaigns/:campaignId/reward-distribution/funding-proof-review",
          readiness: "review_required",
        }),
        expect.objectContaining({
          id: "campaigns.reward.funding-proof.review.submit",
          method: "POST",
          path: "/api/campaigns/:campaignId/reward-distribution/funding-proof-review",
          readiness: "review_required",
        }),
        expect.objectContaining({
          id: "campaigns.export.storage.readiness",
          method: "GET",
          path: "/api/campaigns/:campaignId/export/storage-readiness",
          readiness: "review_required",
        }),
        expect.objectContaining({
          boundary: expect.objectContaining({
            "en-US": expect.stringContaining("No live API"),
          }),
          id: "backend.production-database.handoff-readiness",
          method: "GET",
          path: "/api/backend/production-database/handoff-readiness",
          readiness: "review_required",
          riskLevel: "high",
          serviceGroup: "runtime",
          supportMode: "local_seeded",
        }),
      ]),
    });
    expect(healthData).toMatchObject({
      apiFoundation: expect.objectContaining({
        coverage: expect.objectContaining({
          implementedLocalCount: 12,
          notYetImplementedCount: 0,
          productionShapedDeferredCount: 2,
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
            routeIds: ["campaigns.points.ranking.ledger.runtime"],
            serviceId: "points-ranking-service",
            state: "implemented_local",
            surfaceId: "points-ranking",
          }),
          expect.objectContaining({
            routeIds: expect.arrayContaining([
              "runtime.health",
              "runtime.contracts",
            ]),
            serviceId: "runtime-observability",
            state: "implemented_local",
            surfaceId: "runtime-observability",
          }),
          expect.objectContaining({
            routeIds: expect.arrayContaining([
              "campaigns.lifecycle",
              "campaigns.launch.readiness",
              "campaigns.delivery.readiness",
              "campaigns.publish.delivery.review",
            ]),
            serviceId: "campaign-service",
            state: "implemented_local",
            surfaceId: "campaign",
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

  it("serves deterministic local eligibility root export packets without live side effects", async () => {
    const runtime = createCampaignOsApiRuntime();
    const requestBody = {
      contractRootMode: "eligibility_root",
      format: "json",
      includeLocalePreference: true,
      includeRiskFlags: true,
      includeWalletType: true,
    };
    const first = await runtime.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/export`,
      headers: { "x-campaign-os-trace-id": "trace-eligibility-root-preview" },
      body: JSON.stringify(requestBody),
    });
    const second = await runtime.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/export`,
      headers: { "x-campaign-os-trace-id": "trace-eligibility-root-preview-repeat" },
      body: JSON.stringify(requestBody),
    });
    const payload = expectSuccessData<LocalServiceEnvelope<ExportPreviewPayload>>(first).payload;
    const repeatedPayload = expectSuccessData<LocalServiceEnvelope<ExportPreviewPayload>>(second).payload;

    expect(payload).toMatchObject({
      campaignId: campaignDetail.id,
      contractRootMode: "eligibility_root",
      eligibilityRootPacket: {
        contractWriteEnabled: false,
        exportBatchId: expect.any(String),
        generatedMode: "local_review_only",
        mode: "eligibility_root",
        publicationStatus: "not_published",
        rootHash: expect.stringMatching(/^local-root-/),
        rootVersion: 1,
        safety: {
          claimExecutionEnabled: false,
          contractWriteExecuted: false,
          providerCallExecuted: false,
          rewardCustodyEnabled: false,
          rewardDistributionEnabled: false,
          signedUrlGenerated: false,
          storageWriteExecuted: false,
          walletSignatureRequested: false,
        },
      },
    });
    expect(payload.eligibilityRootPacket?.rootHash).toBe(repeatedPayload.eligibilityRootPacket?.rootHash);
    expect(payload.eligibilityRootPacket?.rows.length).toBe(payload.rows?.length);
    expect(payload.eligibilityRootPacket?.eligibleWalletCount).toBe(
      payload.eligibilityRootPacket?.rows.filter((row) => row.eligible).length,
    );
    expectNoForbiddenResponseKeys(first.body);
    expectNoForbiddenOwnKeys(first.body, ["privateKey", "signedPayload", "storageKey", "transactionId"]);
  });

  it("queries local export artifact audit records after seeded preview registration", async () => {
    const runtime = createCampaignOsApiRuntime();
    const emptyList = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/export-artifacts`,
    });
    const preview = await runtime.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/export`,
      headers: { "x-campaign-os-trace-id": "trace-seeded-export-audit-preview" },
      body: JSON.stringify({
        contractRootMode: "none",
        format: "json",
        includeLocalePreference: true,
        includeRiskFlags: true,
        includeWalletType: true,
      }),
    });
    const previewPayload = expectSuccessData<LocalServiceEnvelope<ExportPreviewPayload>>(preview).payload;
    const artifactId = previewPayload.artifactRegistry?.artifactId;

    if (!artifactId) {
      throw new Error("Expected seeded export preview to register an artifact id.");
    }

    const repeatedPreview = await runtime.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/export`,
      headers: { "x-campaign-os-trace-id": "trace-seeded-export-audit-preview" },
      body: JSON.stringify({
        contractRootMode: "none",
        format: "json",
        includeLocalePreference: true,
        includeRiskFlags: true,
        includeWalletType: true,
      }),
    });
    const repeatedPreviewPayload = expectSuccessData<LocalServiceEnvelope<ExportPreviewPayload>>(
      repeatedPreview,
    ).payload;

    expect(repeatedPreviewPayload.artifactRegistry?.artifactId).toBe(artifactId);

    const csvPreview = await runtime.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/export`,
      headers: { "x-campaign-os-trace-id": "trace-seeded-export-audit-preview-csv" },
      body: JSON.stringify({
        contractRootMode: "none",
        format: "csv",
        includeLocalePreference: true,
        includeRiskFlags: true,
        includeWalletType: true,
      }),
    });
    const csvPreviewPayload = expectSuccessData<LocalServiceEnvelope<ExportPreviewPayload>>(csvPreview).payload;
    const csvArtifactId = csvPreviewPayload.artifactRegistry?.artifactId;

    if (!csvArtifactId) {
      throw new Error("Expected seeded CSV export preview to register an artifact id.");
    }

    const jsonArtifact = previewPayload.artifact;
    const csvArtifact = csvPreviewPayload.artifact;
    const jsonArtifactChecksum = jsonArtifact?.metadata?.checksum ?? jsonArtifact?.checksum;
    const jsonArtifactChecksumAlgorithm = jsonArtifact?.metadata?.checksumAlgorithm ?? "fnv1a32-local-review";
    const jsonArtifactPayload = jsonArtifact?.payload;
    const csvArtifactChecksum = csvArtifact?.metadata?.checksum ?? csvArtifact?.checksum;
    const csvArtifactPayload = csvArtifact?.payload;
    const jsonPreviewRowCount = previewPayload.rows?.length;

    if (
      !jsonArtifact
      || !csvArtifact
      || !jsonArtifactChecksum
      || !jsonArtifactPayload
      || !csvArtifactChecksum
      || !csvArtifactPayload
      || jsonPreviewRowCount === undefined
    ) {
      throw new Error("Expected export preview artifacts to include checksum and payload for file handoff.");
    }

    const list = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/export-artifacts?format=json&traceId=trace-seeded-export-audit-preview`,
    });
    const detail = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/export-artifacts/${encodeURIComponent(artifactId)}`,
    });
    const jsonFile = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/export-artifacts/${encodeURIComponent(artifactId)}/file?format=json`,
      headers: { "x-campaign-os-trace-id": "trace-seeded-export-json-file" },
    });
    const csvFile = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/export-artifacts/${encodeURIComponent(csvArtifactId)}/file?format=csv`,
      headers: { "x-campaign-os-trace-id": "trace-seeded-export-csv-file" },
    });
    const expiredFile = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/export-artifacts/${encodeURIComponent(artifactId)}/file?format=json&now=2026-07-10T00%3A00%3A00.001Z`,
    });
    const mismatchedFormatFile = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/export-artifacts/${encodeURIComponent(artifactId)}/file?format=csv`,
    });
    const unsupportedFormatFile = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/export-artifacts/${encodeURIComponent(artifactId)}/file?format=xlsx`,
    });
    const unsupportedModeFile = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/export-artifacts/${encodeURIComponent(artifactId)}/file?format=json&mode=contract_claim`,
    });
    const unsafeFile = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/export-artifacts/${encodeURIComponent(artifactId)}/file?format=json&signedUrl=https%3A%2F%2Funsafe.example%2Ffile`,
    });
    const invalidFilter = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/export-artifacts?format=xml`,
    });
    const missingDetail = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/export-artifacts/export-artifact-local-missing`,
    });
    const missingFile = await runtime.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/export-artifacts/export-artifact-local-missing/file?format=json`,
    });

    expect(expectSuccessData<LocalServiceEnvelope<ExportArtifactAuditPayload>>(emptyList).payload).toMatchObject({
      campaignId: campaignDetail.id,
      records: [],
      summary: {
        activeRecords: 0,
        blockedRows: 0,
        expiredRecords: 0,
        readyRows: 0,
        reviewRequiredRows: 0,
        totalRecords: 0,
        totalRows: 0,
      },
    });
    expect(expectSuccessData<LocalServiceEnvelope<ExportArtifactAuditPayload>>(list).payload).toMatchObject({
      campaignId: campaignDetail.id,
      filters: {
        format: "json",
        traceId: "trace-seeded-export-audit-preview",
      },
      records: [
        expect.objectContaining({
          artifactId,
          campaignId: campaignDetail.id,
          routeId: "campaigns.export.preview",
          traceId: "trace-seeded-export-audit-preview",
        }),
      ],
      safety: expect.objectContaining({
        downloadUrlEnabled: false,
        localReviewOnly: true,
        storageWriteEnabled: false,
      }),
      summary: expect.objectContaining({
        totalRecords: 1,
      }),
    });
    expect(expectSuccessData<LocalServiceEnvelope<ExportArtifactAuditPayload>>(detail).payload).toMatchObject({
      artifactId,
      campaignId: campaignDetail.id,
      record: expect.objectContaining({
        artifactId,
        campaignId: campaignDetail.id,
        routeId: "campaigns.export.preview",
        traceId: "trace-seeded-export-audit-preview",
      }),
    });
    expect(expectSuccessData<LocalServiceEnvelope<LocalExportFileHandoffPayload>>(jsonFile).payload)
      .toMatchObject({
        artifactId,
        auditDetail: {
          batchId: jsonArtifact.batchId,
          checksum: jsonArtifactChecksum,
          checksumAlgorithm: jsonArtifactChecksumAlgorithm,
          fileName: expect.any(String),
          previewRouteId: "campaigns.export.preview",
          previewTraceId: "trace-seeded-export-audit-preview",
          retentionState: "active",
          source: "deterministic_local_export",
        },
        campaignId: campaignDetail.id,
        handoff: {
          artifactId,
          batchId: jsonArtifact.batchId,
          campaignId: campaignDetail.id,
          checksum: jsonArtifactChecksum,
          checksumAlgorithm: jsonArtifactChecksumAlgorithm,
          fileName: expect.any(String),
          format: "json",
          mimeType: "application/json;charset=utf-8",
          payload: jsonArtifactPayload,
          retention: expect.objectContaining({
            mode: "local_review_ttl",
            productionStorageBacked: false,
            purgeRequired: true,
            state: "active",
            ttlHours: 24,
          }),
          rowCounts: expect.objectContaining({
            totalRows: jsonPreviewRowCount,
          }),
          safety: expect.objectContaining({
            downloadUrlEnabled: false,
            localReviewOnly: true,
            signedUrlEnabled: false,
            storageWriteEnabled: false,
          }),
          traceId: "trace-seeded-export-json-file",
        },
        safety: expect.objectContaining({
          downloadUrlEnabled: false,
          localReviewOnly: true,
          signedUrlEnabled: false,
          storageWriteEnabled: false,
        }),
      });
    expect(expectSuccessData<LocalServiceEnvelope<LocalExportFileHandoffPayload>>(csvFile).payload)
      .toMatchObject({
        artifactId: csvArtifactId,
        campaignId: campaignDetail.id,
        handoff: {
          artifactId: csvArtifactId,
          checksum: csvArtifactChecksum,
          fileName: expect.any(String),
          format: "csv",
          mimeType: "text/csv;charset=utf-8",
          payload: csvArtifactPayload,
          traceId: "trace-seeded-export-csv-file",
        },
      });
    expect(invalidFilter.status).toBe(400);
    expect(invalidFilter.body.ok).toBe(false);
    expect(missingDetail.status).toBe(400);
    expect(missingDetail.body.ok).toBe(false);
    expect(expiredFile.status).toBe(400);
    expect(expiredFile.body.ok).toBe(false);
    expect(JSON.stringify(expiredFile.body)).toContain("LOCAL_EXPORT_FILE_EXPIRED");
    expect(mismatchedFormatFile.status).toBe(400);
    expect(mismatchedFormatFile.body.ok).toBe(false);
    expect(unsupportedFormatFile.status).toBe(400);
    expect(unsupportedFormatFile.body.ok).toBe(false);
    expect(unsupportedModeFile.status).toBe(400);
    expect(unsupportedModeFile.body.ok).toBe(false);
    expect(unsafeFile.status).toBe(400);
    expect(unsafeFile.body.ok).toBe(false);
    expectNoForbiddenFragments(unsafeFile.body, ["https://unsafe.example/file"]);
    expect(missingFile.status).toBe(400);
    expect(missingFile.body.ok).toBe(false);

    for (const response of [
      emptyList,
      preview,
      repeatedPreview,
      csvPreview,
      list,
      detail,
      invalidFilter,
      missingDetail,
      expiredFile,
      mismatchedFormatFile,
      unsupportedFormatFile,
      unsupportedModeFile,
      unsafeFile,
      missingFile,
    ]) {
      expectNoForbiddenResponseKeys(response.body);
      expectNoForbiddenOwnKeys(response.body, [
        "downloadUrl",
        "signedUrl",
        "storageKey",
        "objectKey",
        "providerPayload",
        "walletSignature",
        "rewardDistribution",
      ]);
      expectNoForbiddenFragments(response.body, ["2F4Wallet", "csvPreview", "jsonPreview", "https://", "X-Amz-Signature"]);
    }
    for (const response of [jsonFile, csvFile]) {
      expectNoForbiddenResponseKeys(response.body);
      expectNoForbiddenOwnKeys(response.body, [
        "downloadUrl",
        "signedUrl",
        "storageKey",
        "objectKey",
        "providerPayload",
        "walletSignature",
        "rewardDistribution",
      ]);
      expectNoForbiddenFragments(response.body, ["csvPreview", "jsonPreview", "https://", "X-Amz-Signature"]);
    }
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

  it("distinguishes staging-scaffold production backend readiness metadata", async () => {
    const stagingRuntime = createCampaignOsApiRuntime({
      runtimeConfigOptions: {
        env: {
          CAMPAIGN_OS_BACKEND_PROFILE: "staging-scaffold",
        },
      },
    });
    const health = await stagingRuntime.handle({
      method: "GET",
      path: "/api/health",
    });
    const contracts = await stagingRuntime.handle({
      method: "GET",
      path: "/api/contracts",
    });

    const expectedStagingReadiness = expect.objectContaining({
      diagnostics: expect.arrayContaining([
        expect.objectContaining({
          code: "PRODUCTION_BACKEND_STAGING_SCAFFOLD",
          severity: "info",
        }),
      ]),
      productionReady: false,
      profile: expect.objectContaining({
        id: "staging-scaffold",
        missingRequiredConfigKeys: [],
        requiredConfigKeys: [],
        requiresSecrets: false,
        secretValuesExposed: false,
        status: "scaffold",
      }),
      status: "scaffold",
    });

    expect(expectSuccessData(health)).toMatchObject({
      productionBackendReadiness: expectedStagingReadiness,
    });
    expect(expectSuccessData(contracts)).toMatchObject({
      productionBackendReadiness: expectedStagingReadiness,
    });
  });

  it("surfaces production-required database readiness as blocked without exposing secrets", async () => {
    const productionRuntime = createCampaignOsApiRuntime({
      runtimeConfigOptions: {
        env: {
          CAMPAIGN_OS_AUTH_SECRET: "runtime-auth-secret",
          CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
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
    const expectedProductionBackendReadiness = expect.objectContaining({
      diagnostics: expect.arrayContaining([
        expect.objectContaining({
          code: "PRODUCTION_BACKEND_PROFILE_BLOCKED",
          safeDetails: expect.objectContaining({
            missingRequiredConfigKeyCount: 1,
            requiredConfigKeyCount: 5,
          }),
          severity: "error",
        }),
        expect.objectContaining({
          code: "PRODUCTION_BACKEND_MISSING_CONFIG",
          safeDetails: expect.objectContaining({
            missingRequiredConfigKeys: "CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT",
          }),
          severity: "error",
        }),
      ]),
      noLiveSideEffects: expect.objectContaining({
        contractWriteExecuted: false,
        productionDatabaseConnected: false,
        providerNetworkExecuted: false,
        rewardDistributionExecuted: false,
        schedulerExecuted: false,
      }),
      productionReady: false,
      profile: expect.objectContaining({
        configuredRequiredConfigKeys: expect.arrayContaining([
          "CAMPAIGN_OS_AUTH_SECRET",
          "CAMPAIGN_OS_DATABASE_URL",
          "CAMPAIGN_OS_PROVIDER_REGISTRY_URL",
          "CAMPAIGN_OS_WORKER_QUEUE_URL",
        ]),
        id: "production-required",
        missingRequiredConfigKeys: ["CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT"],
        requiredConfigKeys: expect.arrayContaining([
          "CAMPAIGN_OS_AUTH_SECRET",
          "CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT",
          "CAMPAIGN_OS_DATABASE_URL",
          "CAMPAIGN_OS_PROVIDER_REGISTRY_URL",
          "CAMPAIGN_OS_WORKER_QUEUE_URL",
        ]),
        requiresSecrets: true,
        secretValuesExposed: false,
        status: "blocked",
      }),
      routeCoverage: expect.objectContaining({
        missingApiSkillIds: [],
      }),
      status: "blocked",
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
      productionBackendReadiness: expectedProductionBackendReadiness,
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
      productionBackendReadiness: expectedProductionBackendReadiness,
    });
    expect(JSON.stringify(health.body)).not.toContain("runtime-auth-secret");
    expect(JSON.stringify(contracts.body)).not.toContain("postgres://db.invalid/campaign-os");
    expect(JSON.stringify(contracts.body)).not.toContain("https://providers.invalid");
    expect(JSON.stringify(contracts.body)).not.toContain("https://queue.invalid");
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
    const deliveryReadiness = await runtimeWithPersistence.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/delivery-readiness`,
    });
    const publishDeliveryReview = await runtimeWithPersistence.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/publish-delivery-review`,
      headers: { "x-campaign-os-trace-id": "trace-publish-delivery-review-seeded" },
    });
    const pointsRankingLedgerRuntime = await runtimeWithPersistence.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/points-ranking-ledger-runtime`,
      headers: { "x-campaign-os-trace-id": "trace-points-ranking-ledger-runtime" },
    });
    const companionContractReadiness = await runtimeWithPersistence.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/companion-contract-readiness`,
    });
    const contractTransparency = await runtimeWithPersistence.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/contract-transparency`,
    });
    const exportReadiness = await runtimeWithPersistence.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/export-readiness`,
    });
    const objectStorageExportReadiness = await runtimeWithPersistence.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/export/storage-readiness`,
      headers: { "x-campaign-os-trace-id": "trace-object-storage-export-readiness" },
    });
    const analyticsIngestionReadiness = await runtimeWithPersistence.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/analytics/ingestion-readiness`,
      headers: { "x-campaign-os-trace-id": "trace-analytics-ingestion-readiness" },
    });
    const contractWriterReadiness = await runtimeWithPersistence.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/contract-writer/readiness`,
      headers: { "x-campaign-os-trace-id": "trace-contract-writer-readiness" },
    });
    const rewardDistributionHandoffReadiness = await runtimeWithPersistence.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/reward-distribution/handoff-readiness`,
      headers: { "x-campaign-os-trace-id": "trace-reward-distribution-handoff-readiness" },
    });
    const fundingProofReview = await runtimeWithPersistence.handle({
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/reward-distribution/funding-proof-review`,
      headers: { "x-campaign-os-trace-id": "trace-funding-proof-review" },
    });
    const productionDatabaseHandoffReadiness = await runtimeWithPersistence.handle({
      method: "GET",
      path: "/api/backend/production-database/handoff-readiness",
      headers: { "x-campaign-os-trace-id": "trace-production-db-handoff-runtime" },
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
    expect(expectSuccessData<LocalServiceEnvelope<DeliveryReadinessPayload>>(deliveryReadiness).payload).toMatchObject({
      campaignId: campaignDetail.id,
      closeout: {
        rows: expect.arrayContaining([
          expect.objectContaining({
            handoffTarget: "live_wallet_qa",
            itemId: "qa-portkey-aa-connect",
            queueId: "needs_review",
          }),
        ]),
        summary: expect.objectContaining({
          ready: false,
          topHandoffTarget: "live_wallet_qa",
          topQueueId: "needs_review",
          topRowId: "closeout:qa:qa-portkey-aa-connect",
        }),
      },
      groups: expect.arrayContaining([
        expect.objectContaining({
          id: "qa",
          items: expect.arrayContaining([
            expect.objectContaining({
              evidence: expect.objectContaining({
                "en-US": expect.stringContaining("Live Portkey AA provider evidence is not attached yet"),
              }),
              id: "qa-portkey-aa-connect",
              status: "needs_review",
            }),
          ]),
        }),
      ]),
      traceability: {
        rows: expect.arrayContaining([
          expect.objectContaining({
            itemId: "qa-portkey-aa-connect",
            proofLevel: "live_evidence_required",
            status: "needs_review",
          }),
        ]),
        summary: expect.any(Object),
      },
    });
    expect(expectSuccessData<LocalServiceEnvelope<PublishDeliveryReviewPayload>>(publishDeliveryReview)).toMatchObject({
      boundary: expect.objectContaining({
        "en-US": expect.stringContaining("Local front-end/back-end publish delivery review bridge"),
      }),
      payload: {
        backendRuntime: expect.objectContaining({
          productionReady: false,
          productionDependencyBlockers: expect.arrayContaining([
            expect.objectContaining({ code: "PRODUCTION_DEPENDENCY_DEFERRED" }),
          ]),
          tracePolicy: {
            failureEnvelopeTraceId: true,
            successEnvelopeTraceId: true,
            traceHeaderName: "x-campaign-os-trace-id",
          },
        }),
        campaignId: campaignDetail.id,
        deliveryChecklist: expect.objectContaining({
          groups: expect.arrayContaining([
            expect.objectContaining({ groupId: "product" }),
            expect.objectContaining({ groupId: "architecture" }),
            expect.objectContaining({ groupId: "ui" }),
            expect.objectContaining({ groupId: "contract" }),
            expect.objectContaining({ groupId: "qa" }),
          ]),
        }),
        launchBundles: expect.objectContaining({
          bundles: expect.arrayContaining([
            expect.objectContaining({ stage: "pre_launch" }),
            expect.objectContaining({ stage: "launch" }),
            expect.objectContaining({ stage: "post_launch" }),
          ]),
        }),
        publishGate: expect.objectContaining({
          counts: expect.objectContaining({
            total: expect.any(Number),
          }),
        }),
        repositoryEvidence: expect.objectContaining({
          available: false,
          noLiveSideEffects: {
            liveContractExecuted: false,
            liveProviderExecuted: false,
            liveRewardExecuted: false,
            liveStorageExecuted: false,
          },
        }),
        summary: expect.objectContaining({
          launchBundleCount: 3,
          productionBlockerCount: expect.any(Number),
        }),
        traceId: "trace-publish-delivery-review-seeded",
      },
    });
    expect(Object.values(
      expectSuccessData<LocalServiceEnvelope<PublishDeliveryReviewPayload>>(publishDeliveryReview)
        .payload.backendRuntime.noLiveSideEffects,
    ).every((value) => value === false)).toBe(true);
    expect(expectSuccessData<LocalServiceEnvelope<PointsRankingLedgerRuntimePayload>>(
      pointsRankingLedgerRuntime,
    )).toMatchObject({
      boundary: expect.objectContaining({
        "en-US": expect.stringContaining("Local points/ranking ledger runtime review route"),
      }),
      payload: {
        campaignId: campaignDetail.id,
        eligibilityRoot: expect.objectContaining({
          contractRootMode: "none",
          generationMode: "local_preview",
          totalRows: 4,
        }),
        ledger: expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({
              accountType: "EOA",
              evidenceHash: expect.any(String),
              evidenceSource: "SOCIAL_API",
              localePreference: "zh-CN",
              riskFlags: ["referral_velocity_review"],
              status: "failed",
              taskId: "task-social",
              verificationType: "SOCIAL",
              walletAddress: "3E9...7cD",
              walletSource: "PORTKEY_EOA_EXTENSION",
            }),
          ]),
          totalEvents: 20,
        }),
        ranking: expect.objectContaining({
          rows: expect.arrayContaining([
            expect.objectContaining({
              accountType: "AA",
              eligible: true,
              localePreference: "en-US",
              rank: 1,
              totalPoints: 270,
              walletSource: "PORTKEY_AA",
            }),
          ]),
        }),
        source: "api_runtime",
        summary: expect.objectContaining({
          eligibleWallets: 1,
          rankedWallets: 4,
          totalLedgerEvents: 20,
          totalPoints: 740,
        }),
        traceId: "trace-points-ranking-ledger-runtime",
      },
    });
    expect(Object.values(
      expectSuccessData<LocalServiceEnvelope<PointsRankingLedgerRuntimePayload>>(pointsRankingLedgerRuntime)
        .payload.noLiveSideEffects,
    ).every((value) => value === false)).toBe(true);
    expect(expectSuccessData<LocalServiceEnvelope<{
      blockerCount: number;
      campaignId: string;
      diagnosticCodes: string[];
      manifestSummary: {
        artifactCount: number;
        containsDownloadUrl: false;
        containsObjectKey: false;
        containsSignedUrl: false;
        exportBatchId: string;
        formats: string[];
      };
      productionReady: false;
      providerStatus: string;
      requiredConfigKeys: string[];
      safety: Record<string, boolean>;
      source: string;
      status: string;
      traceId: string;
    }>>(objectStorageExportReadiness)).toMatchObject({
      boundary: expect.objectContaining({
        "en-US": expect.stringContaining("Local object storage export readiness review route"),
      }),
      payload: {
        blockerCount: expect.any(Number),
        campaignId: campaignDetail.id,
        diagnosticCodes: expect.arrayContaining([
          "OBJECT_STORAGE_APPROVAL_REQUIRED",
          "OBJECT_STORAGE_LIVE_EXECUTION_DISABLED",
        ]),
        manifestSummary: {
          artifactCount: 1,
          containsDownloadUrl: false,
          containsObjectKey: false,
          containsSignedUrl: false,
          exportBatchId: "export-awaken-sprint-preview",
          formats: ["csv"],
        },
        productionReady: false,
        providerStatus: "not_configured",
        requiredConfigKeys: expect.arrayContaining([
          "CAMPAIGN_OS_OBJECT_STORAGE_PROVIDER_REF",
          "CAMPAIGN_OS_OBJECT_STORAGE_APPROVAL_REF",
        ]),
        safety: expect.objectContaining({
          downloadEnabled: false,
          liveUploadEnabled: false,
          objectKeyCreated: false,
          providerCallAttempted: false,
          signedUrlCreated: false,
        }),
        source: "api_runtime",
        status: "blocked",
        traceId: "trace-object-storage-export-readiness",
      },
    });
    expect(JSON.stringify(expectSuccessData(objectStorageExportReadiness))).not.toContain("signed-url");
    expect(JSON.stringify(expectSuccessData(objectStorageExportReadiness))).not.toContain("object-key");
    expect(expectSuccessData<LocalServiceEnvelope<AnalyticsIngestionRuntimePayload>>(
      analyticsIngestionReadiness,
    )).toMatchObject({
      boundary: expect.objectContaining({
        "en-US": expect.stringContaining("Local analytics ingestion readiness"),
      }),
      payload: {
        campaignId: campaignDetail.id,
        diagnosticCodes: expect.arrayContaining([
          "ANALYTICS_EVENT_ENVELOPE_REVIEW_REQUIRED",
          "ANALYTICS_LIVE_EXECUTION_DISABLED",
          "ANALYTICS_WAREHOUSE_HANDOFF_MISSING",
        ]),
        eventCatalog: expect.arrayContaining([
          expect.objectContaining({ id: "campaign_lifecycle", localOnly: true, schemaState: "local_review" }),
          expect.objectContaining({ id: "wallet_session", localOnly: true, schemaState: "local_review" }),
          expect.objectContaining({ id: "task_verification", localOnly: true, schemaState: "local_review" }),
        ]),
        metricLineage: expect.arrayContaining([
          expect.objectContaining({ id: "participants" }),
          expect.objectContaining({ id: "verified_actions" }),
          expect.objectContaining({ id: "eligible_winners" }),
        ]),
        noLiveSideEffects: expect.objectContaining({
          liveAnalyticsSdkExecuted: false,
          liveEventIngestionEnabled: false,
          liveEventWarehouseWrite: false,
          liveProviderCallExecuted: false,
        }),
        productionReady: false,
        source: "server_runtime",
        status: "blocked",
        summary: expect.objectContaining({
          eventGroupCount: 9,
          metricLineageCount: 9,
          totalEvents: expect.any(Number),
        }),
        traceId: "trace-analytics-ingestion-readiness",
        warehouseHandoff: expect.objectContaining({
          eventWarehouseWriteAttempted: false,
          liveWarehouseWriteEnabled: false,
          productionReady: false,
          requiredConfigKeys: expect.arrayContaining([
            "CAMPAIGN_OS_ANALYTICS_WAREHOUSE_REF",
            "CAMPAIGN_OS_ANALYTICS_APPROVAL_REF",
          ]),
          status: "missing",
        }),
      },
    });
    expect(Object.values(
      expectSuccessData<LocalServiceEnvelope<AnalyticsIngestionRuntimePayload>>(analyticsIngestionReadiness)
        .payload.noLiveSideEffects,
    ).every((value) => value === false)).toBe(true);
    expect(JSON.stringify(expectSuccessData(analyticsIngestionReadiness))).not.toContain("campaign-os-kitty");
    expect(JSON.stringify(expectSuccessData(analyticsIngestionReadiness))).not.toContain("bearer");
    expect(expectSuccessData<LocalServiceEnvelope<ContractWriterRuntimePayload>>(
      contractWriterReadiness,
    )).toMatchObject({
      boundary: expect.objectContaining({
        "en-US": expect.stringContaining("Local contract writer runtime readiness"),
      }),
      payload: {
        campaignId: campaignDetail.id,
        configHandoff: expect.objectContaining({
          productionReady: false,
          requiredConfigKeys: expect.arrayContaining([
            "CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT_REF",
            "CAMPAIGN_OS_CONTRACT_WRITER_SIGNER_POLICY_REF",
            "CAMPAIGN_OS_CONTRACT_WRITER_OPERATOR_APPROVAL_REF",
          ]),
          status: "missing",
        }),
        diagnosticCodes: expect.arrayContaining([
          "CONTRACT_WRITER_CONFIG_MISSING",
          "CONTRACT_WRITER_LIVE_EXECUTION_DISABLED",
          "CONTRACT_WRITER_OPERATION_REVIEW_REQUIRED",
        ]),
        noLiveSideEffects: expect.objectContaining({
          liveAbiGeneration: false,
          liveContractWrite: false,
          liveQueuePublishing: false,
          liveRewardCustody: false,
          liveRewardDistribution: false,
          liveSignerExecution: false,
          liveWalletSignature: false,
        }),
        operationCatalog: expect.arrayContaining([
          expect.objectContaining({
            contractName: "CampaignRegistryV2",
            operations: expect.arrayContaining([
              expect.objectContaining({
                liveWriteEnabled: false,
                methodName: "CreateCampaign",
                requiresIdempotency: true,
                requiresOperatorApproval: true,
                requiresSignerPolicy: true,
              }),
            ]),
          }),
          expect.objectContaining({ contractName: "CampaignPointsLedgerV2" }),
          expect.objectContaining({ contractName: "ReferralRegistryV2" }),
          expect.objectContaining({ contractName: "EligibilityRootRegistryV2" }),
        ]),
        productionReady: false,
        source: "server_runtime",
        status: "blocked",
        summary: expect.objectContaining({
          contractGroupCount: 4,
          operationCount: 20,
          requiredConfigCount: 9,
        }),
        traceId: "trace-contract-writer-readiness",
      },
    });
    expect(Object.values(
      expectSuccessData<LocalServiceEnvelope<ContractWriterRuntimePayload>>(contractWriterReadiness)
        .payload.noLiveSideEffects,
    ).every((value) => value === false)).toBe(true);
    expect(JSON.stringify(expectSuccessData(contractWriterReadiness))).not.toContain("campaign-os-kitty");
    expect(JSON.stringify(expectSuccessData(contractWriterReadiness))).not.toContain("bearer");
    expect(expectSuccessData<LocalServiceEnvelope<RewardDistributionHandoffRuntimePayload>>(
      rewardDistributionHandoffReadiness,
    )).toMatchObject({
      boundary: expect.objectContaining({
        "en-US": expect.stringContaining("Local reward distribution handoff readiness"),
      }),
      payload: {
        campaignId: campaignDetail.id,
        diagnosticCodes: expect.arrayContaining([
          "REWARD_DISTRIBUTION_FUNDING_PROOF_MISSING",
          "REWARD_DISTRIBUTION_LIVE_EXECUTION_DISABLED",
          "REWARD_DISTRIBUTION_OPERATOR_APPROVAL_MISSING",
          "REWARD_DISTRIBUTION_QUEUE_HANDOFF_MISSING",
        ]),
        evidenceHandoff: expect.objectContaining({
          productionReady: false,
          requiredEvidenceKeys: expect.arrayContaining([...rewardDistributionHandoffRequiredEvidenceKeys]),
          status: "missing",
        }),
        exportLinkage: expect.objectContaining({
          derivedFrom: "seeded_export_preview",
          localPreviewOnly: true,
          recipientCount: 4,
        }),
        items: expect.arrayContaining([
          expect.objectContaining({
            id: "project-owner-funding-proof",
            liveExecutionEnabled: false,
            ownerRole: "project_owner",
            requiredBeforeProduction: true,
            state: "blocked",
          }),
          expect.objectContaining({
            id: "winner-export-linkage",
            liveExecutionEnabled: false,
            state: "ready",
          }),
          expect.objectContaining({
            id: "no-custody-no-distribution-boundary",
            liveExecutionEnabled: false,
            state: "review_required",
          }),
        ]),
        noLiveSideEffects: expect.objectContaining({
          liveClaim: false,
          liveContractWrite: false,
          livePayout: false,
          liveProviderCall: false,
          liveQueuePublishing: false,
          liveRewardCustody: false,
          liveRewardDistribution: false,
          liveSchedulerExecution: false,
          liveWalletSignature: false,
          liveWorkerExecution: false,
        }),
        productionReady: false,
        requiredEvidenceKeys: expect.arrayContaining([...rewardDistributionHandoffRequiredEvidenceKeys]),
        source: "server_runtime",
        status: "blocked",
        summary: expect.objectContaining({
          itemCount: 11,
          missingEvidenceCount: rewardDistributionHandoffRequiredEvidenceKeys.length,
          recipientCount: 4,
        }),
        traceId: "trace-reward-distribution-handoff-readiness",
      },
    });
    expect(Object.values(
      expectSuccessData<LocalServiceEnvelope<RewardDistributionHandoffRuntimePayload>>(rewardDistributionHandoffReadiness)
        .payload.noLiveSideEffects,
    ).every((value) => value === false)).toBe(true);
    expect(JSON.stringify(expectSuccessData(rewardDistributionHandoffReadiness))).not.toContain("providerPayload");
    expect(JSON.stringify(expectSuccessData(rewardDistributionHandoffReadiness))).not.toContain("transactionId");
    expect(JSON.stringify(expectSuccessData(rewardDistributionHandoffReadiness))).not.toContain("campaign-os-kitty");
    expect(JSON.stringify(expectSuccessData(rewardDistributionHandoffReadiness))).not.toContain("bearer");
    expect(expectSuccessData<LocalServiceEnvelope<ProjectOwnerFundingProofReviewPayload>>(
      fundingProofReview,
    )).toMatchObject({
      boundary: expect.objectContaining({
        "en-US": expect.stringContaining("Local review-only project owner funding proof bridge"),
      }),
      payload: {
        campaignId: campaignDetail.id,
        diagnosticCodes: expect.arrayContaining([
          "PROJECT_OWNER_FUNDING_PROOF_REFERENCE_MISSING",
          "PROJECT_OWNER_FUNDING_PROOF_EXPORT_LINKAGE_MISSING",
          "PROJECT_OWNER_FUNDING_PROOF_OPERATOR_REVIEW_MISSING",
          "PROJECT_OWNER_FUNDING_PROOF_LIVE_EXECUTION_DISABLED",
        ]),
        items: expect.arrayContaining([
          expect.objectContaining({
            id: "funding-proof-reference",
            liveExecutionEnabled: false,
            requiredBeforeProduction: true,
            state: "blocked",
          }),
          expect.objectContaining({
            id: "operator-review",
            liveExecutionEnabled: false,
            requiredBeforeProduction: true,
            state: "blocked",
          }),
        ]),
        productionReady: false,
        proofPackage: expect.objectContaining({
          missingEvidenceKeys: expect.arrayContaining([...projectOwnerFundingProofRequiredEvidenceKeys]),
          productionReady: false,
          requiredEvidenceKeys: expect.arrayContaining([...projectOwnerFundingProofRequiredEvidenceKeys]),
          status: "missing",
        }),
        requiredEvidenceKeys: expect.arrayContaining([...projectOwnerFundingProofRequiredEvidenceKeys]),
        safety: expect.objectContaining({
          liveContractWrite: false,
          liveFundingTransfer: false,
          liveObjectStorageWrite: false,
          liveProviderCall: false,
          liveQueuePublishing: false,
          liveRewardCustody: false,
          liveRewardDistribution: false,
          liveSchedulerExecution: false,
          liveWalletSignature: false,
          liveWorkerExecution: false,
        }),
        source: "server_runtime",
        status: "blocked",
        summary: expect.objectContaining({
          blockedItemCount: 8,
          readyItemCount: 0,
          requiredItemCount: 8,
          reviewRequiredItemCount: 0,
          status: "blocked",
        }),
        traceId: "trace-funding-proof-review",
        valid: true,
      },
    });
    expect(Object.values(
      expectSuccessData<LocalServiceEnvelope<ProjectOwnerFundingProofReviewPayload>>(fundingProofReview)
        .payload.safety,
    ).every((value) => value === false)).toBe(true);
    expect(JSON.stringify(expectSuccessData(fundingProofReview))).not.toContain("providerPayload");
    expect(JSON.stringify(expectSuccessData(fundingProofReview))).not.toContain("signedUrl");
    expect(JSON.stringify(expectSuccessData(fundingProofReview))).not.toContain("transactionId");
    expect(JSON.stringify(expectSuccessData(fundingProofReview))).not.toContain("campaign-os-kitty");
    expect(JSON.stringify(expectSuccessData(fundingProofReview))).not.toContain("bearer");
    expect(expectSuccessData<LocalServiceEnvelope<ProductionDatabaseHandoffReadinessPayload>>(
      productionDatabaseHandoffReadiness,
    )).toMatchObject({
      boundary: expect.objectContaining({
        "en-US": expect.stringContaining("No live API"),
      }),
      payload: {
        id: "campaign-os-production-database-handoff-readiness",
        localMvpReady: true,
        migrationGate: expect.objectContaining({
          liveExecutionEnabled: false,
        }),
        packageBinding: expect.objectContaining({
          bindingId: expect.any(String),
          importPosture: "metadata_only_no_import",
          packageName: "pg",
          packageRef: "npm:pg",
        }),
        productionReady: false,
        requiredReferences: expect.arrayContaining(
          productionDatabaseRequiredReferenceKeys.map((key) => expect.objectContaining({
            key,
            redacted: true,
            requiredBeforeProduction: true,
          })),
        ),
        source: "server_runtime",
        status: expect.stringMatching(/^(blocked|review_required|local_ready)$/),
        storeCoverage: expect.arrayContaining([
          expect.objectContaining({
            migrationRequired: expect.any(Boolean),
            storeId: expect.any(String),
          }),
        ]),
        summary: expect.objectContaining({
          requiredReferenceCount: productionDatabaseRequiredReferenceKeys.length,
          storeCoverageCount: expect.any(Number),
        }),
        traceId: "trace-production-db-handoff-runtime",
        valid: true,
      },
    });
    expect(Object.values(
      expectSuccessData<LocalServiceEnvelope<ProductionDatabaseHandoffReadinessPayload>>(
        productionDatabaseHandoffReadiness,
      ).payload.safety,
    ).every((value) => value === false)).toBe(true);
    expect(JSON.stringify(expectSuccessData(productionDatabaseHandoffReadiness))).not.toContain("postgres://");
    expect(JSON.stringify(expectSuccessData(productionDatabaseHandoffReadiness))).not.toContain("campaign-os-kitty");
    expect(JSON.stringify(expectSuccessData(productionDatabaseHandoffReadiness))).not.toContain("bearer");
    expect(expectSuccessData<LocalServiceEnvelope<CompanionContractReadinessPayload>>(
      companionContractReadiness,
    ).payload).toMatchObject({
      campaignId: campaignDetail.id,
      categories: expect.arrayContaining([
        expect.objectContaining({
          id: "campaign-registry-methods-events",
          evidenceItems: expect.arrayContaining([
            expect.objectContaining({ kind: "method" }),
            expect.objectContaining({ kind: "event" }),
          ]),
        }),
      ]),
      summary: {
        ready: true,
        totalCategories: expect.any(Number),
      },
    });
    expect(expectSuccessData<LocalServiceEnvelope<ContractTransparencyPayload>>(contractTransparency).payload)
      .toMatchObject({
        campaignId: campaignDetail.id,
        closeoutContext: expect.objectContaining({
          status: expect.any(String),
          topGateId: expect.any(String),
        }),
        lanes: expect.arrayContaining([
          expect.objectContaining({
            blocksExecution: false,
            id: "off-chain-mvp",
            readiness: "ready",
          }),
          expect.objectContaining({
            blocksExecution: true,
            id: "reward-custody-claim",
            readiness: "blocked",
          }),
        ]),
        summary: {
          totalLanes: expect.any(Number),
          topLaneId: expect.any(String),
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
    for (const response of [
      lifecycle,
      launchReadiness,
      deliveryReadiness,
      publishDeliveryReview,
      pointsRankingLedgerRuntime,
      analyticsIngestionReadiness,
      rewardDistributionHandoffReadiness,
      fundingProofReview,
      productionDatabaseHandoffReadiness,
      companionContractReadiness,
      contractTransparency,
      exportReadiness,
      providerReadiness,
    ]) {
      expectNoForbiddenResponseKeys(response.body);
      expectNoForbiddenFragments(response.body, [
        "fileUrl",
        "mutationId",
        "privateKey",
        "rawSignature",
        "signedUrl",
        "storageKey",
        "transactionId",
      ]);
    }
  });

  it("normalizes funding proof review metadata through a local-only POST route", async () => {
    const response = await runtime.handle({
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/reward-distribution/funding-proof-review`,
      headers: { "x-campaign-os-trace-id": "trace-funding-proof-review-submit" },
      body: {
        amountSummaryRef: "amount-summary-ref:awaken-sprint-reward-budget",
        disclaimerSignoffRef: "disclaimer-signoff-ref:en-us-reviewed",
        exportBatchId: "export-batch-awaken-sprint-preview",
        financeReviewRef: "finance-review-ref:pending",
        operatorReviewRef: "operator-review-ref:pending",
        proofReference: "proof-ref:project-owner-budget-ticket",
        recipientListHashRef: "recipient-list-hash-ref:preview",
        rewardProviderStatementRef: "provider-statement-ref:project-owned",
        signedUrl: "https://proof.invalid/file?signedUrl=unsafe",
        submittedByRole: "project_owner",
        transactionId: "funding-transfer-transaction-123",
        walletSignature: "raw-signature-sample",
      },
    });

    expect(response.status).toBe(200);
    expect(expectSuccessData<LocalServiceEnvelope<ProjectOwnerFundingProofReviewPayload>>(response)).toMatchObject({
      boundary: expect.objectContaining({
        "en-US": expect.stringContaining("Local review-only project owner funding proof"),
      }),
      payload: {
        campaignId: campaignDetail.id,
        diagnosticCodes: ["PROJECT_OWNER_FUNDING_PROOF_LIVE_EXECUTION_DISABLED"],
        items: expect.arrayContaining([
          expect.objectContaining({
            id: "funding-proof-reference",
            state: "ready",
          }),
          expect.objectContaining({
            id: "operator-review",
            state: "review_required",
          }),
        ]),
        productionReady: false,
        proofPackage: expect.objectContaining({
          missingEvidenceKeys: [],
          productionReady: false,
          reviewState: "in_review",
          status: "ready_disabled",
          submittedByRole: "project_owner",
        }),
        status: "local_ready",
        summary: expect.objectContaining({
          blockedItemCount: 0,
          readyItemCount: 7,
          requiredItemCount: 8,
          reviewRequiredItemCount: 1,
          status: "local_ready",
        }),
        traceId: "trace-funding-proof-review-submit",
        valid: true,
      },
    });
    expect(Object.values(
      expectSuccessData<LocalServiceEnvelope<ProjectOwnerFundingProofReviewPayload>>(response).payload.safety,
    ).every((value) => value === false)).toBe(true);
    expect(JSON.stringify(expectSuccessData(response))).not.toContain("proof.invalid");
    expect(JSON.stringify(expectSuccessData(response))).not.toContain("transaction-123");
    expect(JSON.stringify(expectSuccessData(response))).not.toContain("raw-signature-sample");
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
        path: "/api/campaigns/missing-campaign/delivery-readiness",
      }),
      runtime.handle({
        method: "GET",
        path: "/api/campaigns/missing-campaign/publish-delivery-review",
      }),
      runtime.handle({
        method: "GET",
        path: "/api/campaigns/missing-campaign/points-ranking-ledger-runtime",
      }),
      runtime.handle({
        method: "GET",
        path: "/api/campaigns/missing-campaign/analytics/ingestion-readiness",
      }),
      runtime.handle({
        method: "GET",
        path: "/api/campaigns/missing-campaign/contract-writer/readiness",
      }),
      runtime.handle({
        method: "GET",
        path: "/api/campaigns/missing-campaign/reward-distribution/handoff-readiness",
      }),
      runtime.handle({
        method: "GET",
        path: "/api/campaigns/missing-campaign/reward-distribution/funding-proof-review",
      }),
      runtime.handle({
        method: "POST",
        path: "/api/campaigns/missing-campaign/reward-distribution/funding-proof-review",
        body: {
          proofReference: "proof-ref:missing-campaign",
        },
      }),
      runtime.handle({
        method: "GET",
        path: "/api/campaigns/missing-campaign/companion-contract-readiness",
      }),
      runtime.handle({
        method: "GET",
        path: "/api/campaigns/missing-campaign/contract-transparency",
      }),
      runtime.handle({
        method: "GET",
        path: "/api/campaigns/missing-campaign/export-readiness",
      }),
      runtime.handle({
        method: "GET",
        path: "/api/campaigns/missing-campaign/export/storage-readiness",
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

  it("generates i18n drafts for repository-created campaigns through the runtime route", async () => {
    const runtimeWithCampaignDbRepository = createCampaignOsApiRuntime();
    const create = await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: "/api/campaigns",
      headers: projectOwnerAuthHeaders("repo-owner-i18n", {
        "x-campaign-os-trace-id": "trace-campaign-db-i18n-create",
      }),
      body: JSON.stringify({
        contractMode: "OFF_CHAIN_MVP",
        defaultLocale: "en-US",
        duration: "2026-08-01/2026-08-14",
        endTime: "2026-08-14T23:59:59Z",
        goal: "Localize repository campaign",
        ownerAddress: "repo-owner-i18n",
        projectId: "repo-project-i18n",
        rewardDescription: "100 ELF local review rewards",
        rewardDisclaimerHash: "reward-disclaimer-hash-i18n",
        startTime: "2026-08-01T00:00:00Z",
        supportedLocales: ["en-US", "zh-CN"],
        walletPolicy: "ANY",
      }),
    });
    const created = expectSuccessData<LocalServiceEnvelope<CampaignDraftPayload> & {
      campaignDb: {
        draftId: string;
        storeId: string;
      };
    }>(create);
    const i18nDraft = await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: `/api/campaigns/${created.campaignDb.draftId}/i18n/generate`,
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-i18n-generate" },
      body: JSON.stringify({
        contentKeys: ["title", "description", "rewardDisclaimer", "faq"],
        sourceLocale: "en-US",
        targetLocale: "zh-CN",
      }),
    });
    const payload = expectSuccessData<LocalServiceEnvelope<I18nDraftPayload> & {
      campaignDb: {
        createdViaRepository: boolean;
        storeId: string;
      };
      persistence: {
        kind: string;
        recordId: string;
      };
    }>(i18nDraft);

    expect(payload).toMatchObject({
      campaignDb: {
        createdViaRepository: true,
        storeId: "campaign-db",
      },
      payload: {
        aiDraft: true,
        campaignId: created.campaignDb.draftId,
        contentKeys: ["title", "description", "rewardDisclaimer", "faq"],
        draft: {
          description: "Localize repository campaign. Reward context: 100 ELF local review rewards.",
          faq: "Campaign details, eligibility, and rewards remain subject to project owner review.",
          rewardDisclaimer: "Rewards for 100 ELF local review rewards require human review before publish. Disclaimer hash: reward-disclaimer-hash-i18n.",
          title: "Localize repository campaign",
        },
        fallbackToEnglish: true,
        humanReviewRequired: true,
        sourceLocale: "en-US",
        targetLocale: "zh-CN",
      },
      persistence: {
        kind: "i18n_draft",
        recordId: expect.any(String),
      },
    });
    expect(i18nDraft.body.traceId).toBe("trace-campaign-db-i18n-generate");
  });

  it("rejects invalid repository i18n draft requests without persistence records", async () => {
    const repository = createCampaignOsMemoryRepository();
    const runtimeWithCampaignDbRepository = createCampaignOsApiRuntime({ repository });
    const create = await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: "/api/campaigns",
      headers: projectOwnerAuthHeaders("repo-owner-i18n-invalid"),
      body: JSON.stringify({
        duration: "2026-08-01/2026-08-14",
        endTime: "2026-08-14T23:59:59Z",
        goal: "Reject invalid repository campaign i18n",
        ownerAddress: "repo-owner-i18n-invalid",
        projectId: "repo-project-i18n-invalid",
        rewardDescription: "Repository-backed rewards remain local-review only.",
        startTime: "2026-08-01T00:00:00Z",
        supportedLocales: ["en-US", "zh-CN"],
      }),
    });
    const created = expectSuccessData<LocalServiceEnvelope<CampaignDraftPayload> & {
      campaignDb: {
        draftId: string;
      };
    }>(create);
    const unsupportedTarget = await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: `/api/campaigns/${created.campaignDb.draftId}/i18n/generate`,
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-i18n-unsupported" },
      body: JSON.stringify({
        contentKeys: ["title"],
        sourceLocale: "en-US",
        targetLocale: "zh-TW",
      }),
    });
    const emptyContentKeys = await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: `/api/campaigns/${created.campaignDb.draftId}/i18n/generate`,
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-i18n-empty-keys" },
      body: JSON.stringify({
        contentKeys: [],
        sourceLocale: "en-US",
        targetLocale: "zh-CN",
      }),
    });
    const snapshot = await repository.snapshot();

    expect(unsupportedTarget).toMatchObject({
      status: 400,
      body: {
        ok: false,
        traceId: "trace-campaign-db-i18n-unsupported",
        error: {
          code: "UNSUPPORTED_LOCALE",
          details: { locale: "zh-TW" },
        },
      },
    });
    expect(emptyContentKeys).toMatchObject({
      status: 400,
      body: {
        ok: false,
        traceId: "trace-campaign-db-i18n-empty-keys",
        error: {
          code: "INVALID_REQUEST",
          details: {
            field: "contentKeys",
          },
        },
      },
    });
    expect(snapshot.countsByKind.i18n_draft).toBe(0);
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
    const publishDeliveryReview = await runtimeWithCampaignDbRepository.handle({
      method: "GET",
      path: `/api/campaigns/${created.payload.id}/publish-delivery-review`,
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-publish-delivery-review" },
    });
    const exportReadiness = await runtimeWithCampaignDbRepository.handle({
      method: "GET",
      path: `/api/campaigns/${created.payload.id}/export-readiness`,
    });
    const providerReadiness = await runtimeWithCampaignDbRepository.handle({
      method: "GET",
      path: `/api/campaigns/${created.payload.id}/provider-readiness`,
    });

    for (const response of [lifecycle, launchReadiness, providerReadiness]) {
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
    expect(expectSuccessData<LocalServiceEnvelope<ExportReadinessPayload> & {
      campaignDb: {
        createdViaRepository: true;
        storeId: string;
      };
    }>(exportReadiness)).toMatchObject({
      campaignDb: {
        createdViaRepository: true,
        storeId: "campaign-db",
      },
      payload: {
        batchId: "campaign-db-export-campaign-db-draft-0001",
        campaignId: "campaign-db-draft-0001",
        contractRootReadiness: expect.arrayContaining([
          expect.objectContaining({
            mode: "none",
            readiness: "ready",
            safeDefault: true,
          }),
          expect.objectContaining({
            mode: "winners_root",
            readiness: "blocked",
            safeDefault: false,
          }),
        ]),
        previewModes: expect.arrayContaining([
          expect.objectContaining({
            downloadAvailable: false,
            generatesFile: false,
            mode: "csv",
            readiness: "ready",
          }),
          expect.objectContaining({
            downloadAvailable: false,
            generatesFile: false,
            mode: "json",
            readiness: "ready",
          }),
        ]),
        summary: {
          blockedRows: 0,
          previewModeCount: 2,
          readyRows: 0,
          reviewRequiredRows: 0,
          totalRows: 0,
        },
      },
    });
    expect(expectSuccessData<LocalServiceEnvelope<PublishDeliveryReviewPayload>>(publishDeliveryReview)).toMatchObject({
      payload: {
        campaignId: created.payload.id,
        diagnostics: expect.arrayContaining([
          expect.objectContaining({
            code: "CAMPAIGN_DB_DRAFT_REVIEW_SCAFFOLD",
            source: "campaignDb",
          }),
        ]),
        repositoryEvidence: expect.objectContaining({
          available: true,
          createdViaRepository: true,
          repositoryId: "campaign-db-repository-runtime",
          storeId: "campaign-db",
          taskEvidenceCount: 0,
        }),
        traceId: "trace-campaign-db-publish-delivery-review",
      },
    });
    expectNoForbiddenResponseKeys(exportReadiness.body);
    expectNoForbiddenFragments(exportReadiness.body, ["fileUrl", "mutationId", "signedUrl", "transactionId"]);
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
      campaignDbCompletion: { completionId: string; evidenceId: string; storeId: string };
      campaignDbEvidence: {
        completionId: string;
        evidenceHash: string;
        evidenceId: string;
        liveContractExecuted: false;
        liveProviderExecuted: false;
        liveRewardExecuted: false;
        liveStorageExecuted: false;
        storeId: string;
      };
      persistence: { kind: string };
    }>(optionalVerification)).toMatchObject({
      campaignDbCompletion: {
        completionId: "campaign-db-task-completion-0001",
        evidenceId: "campaign-db-task-evidence-0001",
        storeId: "campaign-db",
      },
      campaignDbEvidence: {
        completionId: "campaign-db-task-completion-0001",
        evidenceHash: `evidence-hash:${optionalTaskPayload.campaignDbTask.taskId}`,
        evidenceId: "campaign-db-task-evidence-0001",
        liveContractExecuted: false,
        liveProviderExecuted: false,
        liveRewardExecuted: false,
        liveStorageExecuted: false,
        storeId: "campaign-db",
      },
      payload: {
        accountType: "EOA",
        campaignId: created.payload.id,
        evidence: {
          evidenceHash: `evidence-hash:${optionalTaskPayload.campaignDbTask.taskId}`,
          evidenceId: "campaign-db-task-evidence-0001",
          live: false,
        },
        evidenceHash: `evidence-hash:${optionalTaskPayload.campaignDbTask.taskId}`,
        evidenceId: "campaign-db-task-evidence-0001",
        evidenceSource: "SOCIAL_API",
        liveContractExecuted: false,
        liveProviderExecuted: false,
        liveRewardExecuted: false,
        liveStorageExecuted: false,
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
      campaignDbEvidence: [
        expect.objectContaining({
          completionId: "campaign-db-task-completion-0001",
          evidenceHash: `evidence-hash:${optionalTaskPayload.campaignDbTask.taskId}`,
          evidenceId: "campaign-db-task-evidence-0001",
          liveContractExecuted: false,
          liveProviderExecuted: false,
          liveRewardExecuted: false,
          liveStorageExecuted: false,
          taskId: optionalTaskPayload.campaignDbTask.taskId,
        }),
      ],
      eligible: false,
      missingTasks: ["bridge_ebridge"],
      score: 50,
      status: "not_eligible",
    });
    expect(expectSuccessData<LocalServiceEnvelope<VerificationPayload> & {
      campaignDbCompletion: { completionId: string; evidenceId: string };
      campaignDbEvidence: { completionId: string; evidenceId: string };
    }>(requiredVerification)).toMatchObject({
      campaignDbCompletion: {
        completionId: "campaign-db-task-completion-0002",
        evidenceId: "campaign-db-task-evidence-0002",
      },
      campaignDbEvidence: {
        completionId: "campaign-db-task-completion-0002",
        evidenceId: "campaign-db-task-evidence-0002",
      },
      payload: {
        evidenceHash: `evidence-hash:${requiredTaskPayload.campaignDbTask.taskId}`,
        evidenceId: "campaign-db-task-evidence-0002",
        evidenceSource: "AELFSCAN",
        pointsAwarded: 120,
        pointsAvailable: 120,
        status: "completed",
      },
    });
    expect(expectSuccessData<LocalServiceEnvelope<EligibilityPayload>>(eligible).payload).toMatchObject({
      campaignDbEvidence: expect.arrayContaining([
        expect.objectContaining({
          completionId: "campaign-db-task-completion-0001",
          evidenceId: "campaign-db-task-evidence-0001",
          taskId: optionalTaskPayload.campaignDbTask.taskId,
        }),
        expect.objectContaining({
          completionId: "campaign-db-task-completion-0002",
          evidenceId: "campaign-db-task-evidence-0002",
          taskId: requiredTaskPayload.campaignDbTask.taskId,
        }),
      ]),
      eligible: true,
      missingTasks: [],
      score: 170,
      status: "eligible",
    });
    expectNoForbiddenResponseKeys(optionalVerification.body);
    expectNoForbiddenFragments(optionalVerification.body, ["raw-secret", "privateKey", "signedUrl"]);
  });

  it("projects repository campaign export preview and readiness through API runtime", async () => {
    const repository = createCampaignOsMemoryRepository();
    const runtimeWithCampaignDbRepository = createCampaignOsApiRuntime({ repository });
    const create = await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: "/api/campaigns",
      headers: projectOwnerAuthHeaders("repo-owner-export", {
        "x-campaign-os-trace-id": "trace-campaign-db-export-create",
      }),
      body: JSON.stringify({
        duration: "2026-08-01/2026-08-14",
        endTime: "2026-08-14T23:59:59Z",
        goal: "Export repository completion",
        ownerAddress: "repo-owner-export",
        projectId: "repo-project-export",
        rewardDescription: "Repository export rewards remain local-review only.",
        startTime: "2026-08-01T00:00:00Z",
      }),
    });
    const created = expectSuccessData<LocalServiceEnvelope<CampaignDraftPayload>>(create);
    const requiredTask = await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: `/api/campaigns/${created.payload.id}/tasks`,
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-export-required-task" },
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
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-export-optional-task" },
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

    await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: `/api/tasks/${optionalTaskPayload.campaignDbTask.taskId}/verify`,
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-export-optional-verify" },
      body: JSON.stringify({
        accountType: "EOA",
        campaignId: created.payload.id,
        walletAddress: "2F4ExportWallet",
        walletSource: "PORTKEY_EOA_EXTENSION",
      }),
    });
    const blockedPreview = await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: `/api/campaigns/${created.payload.id}/export`,
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-export-blocked-preview" },
      body: JSON.stringify({
        contractRootMode: "none",
        format: "json",
        includeLocalePreference: true,
        includeRiskFlags: true,
        includeWalletType: true,
      }),
    });

    const requiredVerification = await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: `/api/tasks/${requiredTaskPayload.campaignDbTask.taskId}/verify`,
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-export-required-verify" },
      body: JSON.stringify({
        accountType: "EOA",
        campaignId: created.payload.id,
        walletAddress: "2F4ExportWallet",
        walletSource: "PORTKEY_EOA_EXTENSION",
      }),
    });
    const repeatedRequiredVerification = await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: `/api/tasks/${requiredTaskPayload.campaignDbTask.taskId}/verify`,
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-export-required-reverify" },
      body: JSON.stringify({
        accountType: "EOA",
        campaignId: created.payload.id,
        walletAddress: "2F4ExportWallet",
        walletSource: "PORTKEY_EOA_EXTENSION",
      }),
    });
    const readyPreview = await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: `/api/campaigns/${created.payload.id}/export`,
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-export-ready-preview" },
      body: JSON.stringify({
        contractRootMode: "none",
        format: "json",
        includeLocalePreference: true,
        includeRiskFlags: true,
        includeWalletType: true,
      }),
    });
    const repeatedReadyPreview = await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: `/api/campaigns/${created.payload.id}/export`,
      body: JSON.stringify({
        contractRootMode: "none",
        format: "json",
        includeLocalePreference: true,
        includeRiskFlags: true,
        includeWalletType: true,
      }),
    });
    const readiness = await runtimeWithCampaignDbRepository.handle({
      method: "GET",
      path: `/api/campaigns/${created.payload.id}/export-readiness`,
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-export-readiness" },
    });
    const blockedPreviewData = expectSuccessData<LocalServiceEnvelope<ExportPreviewPayload> & {
      campaignDb: { createdViaRepository: true; storeId: string };
    }>(blockedPreview);
    const readyPreviewData = expectSuccessData<LocalServiceEnvelope<ExportPreviewPayload> & {
      campaignDb: { createdViaRepository: true; storeId: string };
      persistence: { kind: string };
    }>(readyPreview);
    const repeatedReadyPreviewData = expectSuccessData<LocalServiceEnvelope<ExportPreviewPayload>>(
      repeatedReadyPreview,
    );
    const readinessData = expectSuccessData<LocalServiceEnvelope<ExportReadinessPayload> & {
      campaignDb: { createdViaRepository: true; storeId: string };
    }>(readiness);
    const auditList = await runtimeWithCampaignDbRepository.handle({
      method: "GET",
      path: `/api/campaigns/${created.payload.id}/export-artifacts?artifactId=${encodeURIComponent(
        readyPreviewData.payload.artifactRegistry?.artifactId ?? "",
      )}`,
    });
    const auditDetail = await runtimeWithCampaignDbRepository.handle({
      method: "GET",
      path: `/api/campaigns/${created.payload.id}/export-artifacts/${encodeURIComponent(
        readyPreviewData.payload.artifactRegistry?.artifactId ?? "",
      )}`,
    });
    const auditListData = expectSuccessData<LocalServiceEnvelope<ExportArtifactAuditPayload>>(auditList);
    const auditDetailData = expectSuccessData<LocalServiceEnvelope<ExportArtifactAuditPayload>>(auditDetail);
    const snapshot = await repository.snapshot();
    const requiredVerificationData = expectSuccessData<LocalServiceEnvelope<VerificationPayload> & {
      campaignDbCompletion: { completionId: string; evidenceId: string };
      campaignDbEvidence: { completionId: string; evidenceHash: string; evidenceId: string };
    }>(requiredVerification);
    const repeatedRequiredVerificationData = expectSuccessData<LocalServiceEnvelope<VerificationPayload> & {
      campaignDbCompletion: { completionId: string; evidenceId: string };
      campaignDbEvidence: { completionId: string; evidenceId: string };
    }>(repeatedRequiredVerification);

    expect(blockedPreviewData).toMatchObject({
      campaignDb: {
        createdViaRepository: true,
        storeId: "campaign-db",
      },
      payload: {
        blockedRows: 1,
        campaignId: created.payload.id,
        contractRootMode: "none",
        format: "json",
        readyRows: 0,
        reviewRequiredRows: 0,
        rows: [
          expect.objectContaining({
            missingTasks: ["bridge_ebridge"],
            rowStatus: "blocked",
            totalPoints: 50,
            walletAddress: "2F4ExportWallet",
          }),
        ],
      },
    });
    expect(readyPreviewData).toMatchObject({
      campaignDb: {
        createdViaRepository: true,
        storeId: "campaign-db",
      },
      payload: {
        artifact: expect.objectContaining({
          checksum: expect.stringMatching(/^local-/),
          format: "json",
          generatedMode: "local_review_only",
          localPreviewMode: true,
          safety: expect.objectContaining({
            noDownloadUrl: true,
            noStorageWrite: true,
            noContractRoot: true,
            noRewardDistribution: true,
          }),
        }),
        artifactRegistry: expect.objectContaining({
          artifactId: expect.any(String),
          auditEvents: expect.arrayContaining([
            expect.objectContaining({
              routeId: "campaigns.export.preview",
              traceId: "trace-campaign-db-export-ready-preview",
              type: "registered_local_artifact",
            }),
            expect.objectContaining({
              routeId: "campaigns.export.preview",
              traceId: "trace-campaign-db-export-ready-preview",
              type: "storage_disabled",
            }),
          ]),
          retention: expect.objectContaining({
            mode: "local_review_ttl",
            productionStorageBacked: false,
            purgeRequired: true,
            ttlHours: 24,
          }),
          routeId: "campaigns.export.preview",
          safety: expect.objectContaining({
            contractRootWriteEnabled: false,
            downloadUrlEnabled: false,
            forbiddenFieldsAbsent: true,
            localReviewOnly: true,
            objectKeyEnabled: false,
            providerCallEnabled: false,
            queueExecutionEnabled: false,
            rewardCustodyEnabled: false,
            rewardDistributionEnabled: false,
            schedulerExecutionEnabled: false,
            signedUrlEnabled: false,
            storageWriteEnabled: false,
            walletSigningEnabled: false,
          }),
          traceId: "trace-campaign-db-export-ready-preview",
        }),
        blockedRows: 0,
        campaignId: created.payload.id,
        contractRootMode: "none",
        exportBatchId: `campaign-db-export-${created.payload.id}`,
        format: "json",
        readyRows: 1,
        reviewRequiredRows: 0,
        rows: [
          expect.objectContaining({
            accountType: "EOA",
            eligible: true,
            evidenceHashes: [
              `evidence-hash:${requiredTaskPayload.campaignDbTask.taskId}`,
              `evidence-hash:${optionalTaskPayload.campaignDbTask.taskId}`,
            ],
            localePreference: "en-US",
            missingTasks: [],
            rank: 1,
            rowStatus: "ready",
            totalPoints: 170,
            walletAddress: "2F4ExportWallet",
            walletSource: "PORTKEY_EOA_EXTENSION",
          }),
        ],
      },
      persistence: {
        kind: "export_preview",
      },
    });
    expect(requiredVerificationData).toMatchObject({
      campaignDbCompletion: {
        completionId: "campaign-db-task-completion-0002",
        evidenceId: "campaign-db-task-evidence-0002",
      },
      campaignDbEvidence: {
        completionId: "campaign-db-task-completion-0002",
        evidenceHash: `evidence-hash:${requiredTaskPayload.campaignDbTask.taskId}`,
        evidenceId: "campaign-db-task-evidence-0002",
      },
    });
    expect(repeatedRequiredVerificationData.campaignDbCompletion).toEqual(requiredVerificationData.campaignDbCompletion);
    expect(repeatedRequiredVerificationData.campaignDbEvidence).toEqual(requiredVerificationData.campaignDbEvidence);
    expect(readyPreviewData.payload.rows).toHaveLength(1);
    expect(readyPreviewData.payload.rows?.[0]?.taskRecords).toEqual([
      expect.objectContaining({
        evidenceHash: `evidence-hash:${requiredTaskPayload.campaignDbTask.taskId}`,
        evidenceId: "campaign-db-task-evidence-0002",
        liveContractExecuted: false,
        liveProviderExecuted: false,
        liveRewardExecuted: false,
        liveStorageExecuted: false,
        pointsAwarded: 120,
        taskId: requiredTaskPayload.campaignDbTask.taskId,
      }),
      expect.objectContaining({
        evidenceHash: `evidence-hash:${optionalTaskPayload.campaignDbTask.taskId}`,
        evidenceId: "campaign-db-task-evidence-0001",
        liveContractExecuted: false,
        liveProviderExecuted: false,
        liveRewardExecuted: false,
        liveStorageExecuted: false,
        pointsAwarded: 50,
        taskId: optionalTaskPayload.campaignDbTask.taskId,
      }),
    ]);
    expect(readyPreviewData.payload.artifactRegistry?.checksum).toBe(readyPreviewData.payload.artifact?.checksum);
    expect(readyPreviewData.payload.artifactRegistry?.artifactId).toBe(
      expectedExportArtifactRegistryId(
        readyPreviewData.payload,
        "campaigns.export.preview",
        "trace-campaign-db-export-ready-preview",
      ),
    );
    expect(repeatedReadyPreviewData.payload.rows).toEqual(readyPreviewData.payload.rows);
    expect(repeatedReadyPreviewData.payload.artifact?.checksum).toBe(readyPreviewData.payload.artifact?.checksum);
    expect(repeatedReadyPreviewData.payload.artifactRegistry?.checksum).toBe(
      readyPreviewData.payload.artifactRegistry?.checksum,
    );
    expect(repeatedReadyPreviewData.payload.artifactRegistry?.artifactId).not.toBe(
      readyPreviewData.payload.artifactRegistry?.artifactId,
    );
    expect(repeatedReadyPreviewData.payload.artifactRegistry?.traceId).toBe(repeatedReadyPreview.body.traceId);
    expect(readinessData).toMatchObject({
      campaignDb: {
        createdViaRepository: true,
        storeId: "campaign-db",
      },
      payload: {
        batchId: `campaign-db-export-${created.payload.id}`,
        campaignId: created.payload.id,
        contractRootReadiness: expect.arrayContaining([
          expect.objectContaining({ mode: "none", readiness: "ready", safeDefault: true }),
          expect.objectContaining({ mode: "contract_claim", readiness: "blocked", safeDefault: false }),
        ]),
        previewModes: expect.arrayContaining([
          expect.objectContaining({ downloadAvailable: false, generatesFile: false, mode: "csv" }),
          expect.objectContaining({ downloadAvailable: false, generatesFile: false, mode: "json" }),
        ]),
        summary: {
          blockedRows: 0,
          previewModeCount: 2,
          readyRows: 1,
          reviewRequiredRows: 0,
          totalRows: 1,
        },
      },
    });
    expect(auditListData.payload).toMatchObject({
      campaignId: created.payload.id,
      filters: {
        artifactId: readyPreviewData.payload.artifactRegistry?.artifactId,
      },
      records: [
        expect.objectContaining({
          artifactId: readyPreviewData.payload.artifactRegistry?.artifactId,
          batchId: `campaign-db-export-${created.payload.id}`,
          campaignId: created.payload.id,
          routeId: "campaigns.export.preview",
          traceId: "trace-campaign-db-export-ready-preview",
        }),
      ],
      safety: expect.objectContaining({
        downloadUrlEnabled: false,
        localReviewOnly: true,
        storageWriteEnabled: false,
      }),
      summary: expect.objectContaining({
        totalRecords: 1,
      }),
    });
    expect(auditDetailData.payload).toMatchObject({
      artifactId: readyPreviewData.payload.artifactRegistry?.artifactId,
      campaignId: created.payload.id,
      record: expect.objectContaining({
        artifactId: readyPreviewData.payload.artifactRegistry?.artifactId,
        batchId: `campaign-db-export-${created.payload.id}`,
        routeId: "campaigns.export.preview",
        traceId: "trace-campaign-db-export-ready-preview",
      }),
    });
    expect(snapshot.countsByKind.export_preview).toBe(3);
    expect(snapshot.latestRecords[0]).toMatchObject({
      campaignId: created.payload.id,
      kind: "export_preview",
      summary: expect.objectContaining({
        blockedRows: 0,
        contractRootMode: "none",
        format: "json",
        readyRows: 1,
        reviewRequiredRows: 0,
      }),
    });
    for (const response of [blockedPreview, readyPreview, repeatedReadyPreview, readiness, auditList, auditDetail]) {
      expectNoForbiddenResponseKeys(response.body);
      expectNoForbiddenOwnKeys(response.body, [
        "downloadUrl",
        "signedUrl",
        "storageKey",
        "objectKey",
        "contractRoot",
        "transactionId",
        "signature",
        "rewardDistribution",
      ]);
      expectNoForbiddenFragments(response.body, [
        "kitty-specs",
        "docs/current",
        "evidence/",
        "sync/",
      ]);
    }
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

  it("keeps unknown repository campaign verification and eligibility failures structured", async () => {
    const repository = createCampaignOsMemoryRepository();
    const runtimeWithCampaignDbRepository = createCampaignOsApiRuntime({ repository });
    const missingCampaignId = "missing-repository-campaign";
    const verification = await runtimeWithCampaignDbRepository.handle({
      method: "POST",
      path: "/api/tasks/missing-repository-task/verify",
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-missing-campaign-verify" },
      body: JSON.stringify({
        accountType: "EOA",
        campaignId: missingCampaignId,
        walletAddress: "2F4CompletionWallet",
        walletSource: "PORTKEY_EOA_EXTENSION",
      }),
    });
    const eligibility = await runtimeWithCampaignDbRepository.handle({
      method: "GET",
      path: `/api/campaigns/${missingCampaignId}/eligibility?address=${encodeURIComponent("2F4CompletionWallet")}&accountType=EOA&walletSource=PORTKEY_EOA_EXTENSION`,
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-missing-campaign-eligibility" },
    });

    expect(verification).toMatchObject({
      status: 404,
      body: {
        ok: false,
        traceId: "trace-campaign-db-missing-campaign-verify",
        error: {
          code: "INVALID_CAMPAIGN",
          details: { campaignId: missingCampaignId },
        },
      },
    });
    expect(eligibility).toMatchObject({
      status: 404,
      body: {
        ok: false,
        traceId: "trace-campaign-db-missing-campaign-eligibility",
        error: {
          code: "INVALID_CAMPAIGN",
          details: { campaignId: missingCampaignId },
        },
      },
    });
    expect(await repository.snapshot()).toMatchObject({
      recordCount: 0,
    });
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
    expect(expectSuccessData<LocalServiceEnvelope<WalletSessionPayload> & {
      persistence: unknown;
      walletSessionRepository: WalletSessionRepositoryMetadataPayload;
    }>(
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
      walletSessionRepository: {
        adapterId: "wallet-session-deterministic-adapter",
        created: true,
        recordId: "wallet-session:sess-eoa-app-001",
        repositoryId: "wallet-session-repository-runtime",
        sessionId: "sess-eoa-app-001",
        storeId: "wallet-sessions",
        upserted: true,
        walletAddress: "8A2...1eF",
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
      artifactRegistry: expect.objectContaining({
        auditEvents: expect.arrayContaining([
          expect.objectContaining({
            routeId: "campaigns.export.preview",
            type: "registered_local_artifact",
          }),
          expect.objectContaining({
            routeId: "campaigns.export.preview",
            type: "storage_disabled",
          }),
        ]),
        retention: expect.objectContaining({
          mode: "local_review_ttl",
          productionStorageBacked: false,
          purgeRequired: true,
          ttlHours: 24,
        }),
        routeId: "campaigns.export.preview",
        safety: expect.objectContaining({
          contractRootWriteEnabled: false,
          downloadUrlEnabled: false,
          forbiddenFieldsAbsent: true,
          localReviewOnly: true,
          objectKeyEnabled: false,
          providerCallEnabled: false,
          queueExecutionEnabled: false,
          rewardCustodyEnabled: false,
          rewardDistributionEnabled: false,
          schedulerExecutionEnabled: false,
          signedUrlEnabled: false,
          storageWriteEnabled: false,
          walletSigningEnabled: false,
        }),
      }),
      campaignId: campaignDetail.id,
      contractRootMode: "none",
      format: "json",
      readyRows: expect.any(Number),
    });
    const seededExportPayload = expectSuccessData<LocalServiceEnvelope<ExportPreviewPayload>>(exportPreview).payload;
    expect(seededExportPayload.artifactRegistry?.checksum).toBe(seededExportPayload.artifact?.metadata?.checksum);
    expect(seededExportPayload.artifactRegistry?.traceId).toBe(exportPreview.body.traceId);
    expect(seededExportPayload.artifactRegistry?.artifactId).toBe(
      expectedExportArtifactRegistryId(
        seededExportPayload,
        "campaigns.export.preview",
        exportPreview.body.traceId,
      ),
    );
    expect(seededExportPayload.artifactRegistry?.expiresAt).toBe("2026-07-10T00:00:00.000Z");
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

  it("stores wallet sessions in the dedicated repository with upsert semantics", async () => {
    const walletSessionRepository = createWalletSessionRepository();
    const runtimeWithWalletSessionRepository = createCampaignOsApiRuntime({
      walletSessionRepository,
    });

    const first = await runtimeWithWalletSessionRepository.handle({
      method: "POST",
      path: "/api/wallet/session",
      body: JSON.stringify({
        adapterName: "PortkeyDiscoverWallet",
        fixtureId: "sess-eoa-app-001",
        proofEvaluatedAt: "2026-07-07T04:00:00.000Z",
        proofIssuedAt: "2026-07-07T03:59:00.000Z",
        signature: "raw-route-signature",
      }),
    });
    const second = await runtimeWithWalletSessionRepository.handle({
      method: "POST",
      path: "/api/wallet/session",
      body: JSON.stringify({
        adapterName: "PortkeyDiscoverWallet",
        fixtureId: "sess-eoa-app-001",
        proofEvaluatedAt: "2026-07-07T04:05:00.000Z",
        proofIssuedAt: "2026-07-07T04:04:00.000Z",
        signature: "raw-route-signature-refresh",
      }),
    });
    const health = await walletSessionRepository.health();
    const record = await walletSessionRepository.getBySessionId("sess-eoa-app-001");

    expect(expectSuccessData<LocalServiceEnvelope<WalletSessionPayload> & {
      walletSessionRepository: WalletSessionRepositoryMetadataPayload;
    }>(first).walletSessionRepository).toMatchObject({
      created: true,
      recordId: "wallet-session:sess-eoa-app-001",
      repositoryId: "wallet-session-repository-runtime",
      sessionId: "sess-eoa-app-001",
      storeId: "wallet-sessions",
      upserted: true,
      walletAddress: "8A2...1eF",
    });
    expect(expectSuccessData<LocalServiceEnvelope<WalletSessionPayload> & {
      walletSessionRepository: WalletSessionRepositoryMetadataPayload;
    }>(second).walletSessionRepository).toMatchObject({
      created: false,
      recordId: "wallet-session:sess-eoa-app-001",
      sessionId: "sess-eoa-app-001",
    });
    expect(health).toMatchObject({
      recordCount: 1,
      selectedMode: "deterministic_test",
      status: "ready",
    });
    expect(record).toMatchObject({
      connectedAt: "2026-06-21T08:00:00.000Z",
      lastSeenAt: "2026-07-07T04:05:00.000Z",
      productionReadiness: {
        productionReady: false,
      },
      proof: {
        liveVerificationExecuted: false,
        status: "verified",
      },
      sessionId: "sess-eoa-app-001",
      walletAddress: "8A2...1eF",
      walletSource: "PORTKEY_EOA_APP",
    });
    expectNoForbiddenFragments(record, [
      "raw-route-signature",
      "raw-route-signature-refresh",
    ]);
  });

  it("stores unsupported wallet sessions as sanitized repository review records", async () => {
    const walletSessionRepository = createWalletSessionRepository();
    const runtimeWithWalletSessionRepository = createCampaignOsApiRuntime({
      walletSessionRepository,
    });
    const unsupported = await runtimeWithWalletSessionRepository.handle({
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

    const payload = expectSuccessData<LocalServiceEnvelope<WalletSessionPayload> & {
      walletSessionRepository: WalletSessionRepositoryMetadataPayload;
    }>(unsupported);
    const records = await walletSessionRepository.list({ walletAddress: payload.walletSessionRepository.walletAddress });

    expect(payload.walletSessionRepository).toMatchObject({
      recordId: expect.stringContaining("wallet-session:"),
      repositoryId: "wallet-session-repository-runtime",
      upserted: true,
    });
    expect(records).toEqual([
      expect.objectContaining({
        productionReadiness: expect.objectContaining({
          productionReady: false,
        }),
        proof: expect.objectContaining({
          liveVerificationExecuted: false,
          status: "blocked",
          trustLevel: "blocked",
        }),
        verificationStatus: "unsupported_wallet",
        walletTypeVerified: false,
      }),
    ]);
    expectNoForbiddenFragments(records, ["nonce-unsupported-wallet", "raw-unsupported-signature"]);
  });

  it("reloads dedicated wallet session repository records in durable-test mode", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "campaign-os-wallet-session-runtime-"));

    try {
      const filePath = join(tempDir, "wallet-sessions.json");
      const firstRuntime = createCampaignOsApiRuntime({
        walletSessionRepositoryOptions: {
          durableStoreFilePath: filePath,
          mode: "durable_test",
        },
      });

      await firstRuntime.handle({
        method: "POST",
        path: "/api/wallet/session",
        body: JSON.stringify({
          adapterName: "PortkeyDiscoverWallet",
          fixtureId: "sess-eoa-app-001",
          signature: "durable-raw-signature",
        }),
      });

      const reopenedRepository = createWalletSessionRepository({
        durableStoreFilePath: filePath,
        mode: "durable_test",
      });

      await expect(reopenedRepository.getBySessionId("sess-eoa-app-001")).resolves.toMatchObject({
        recordId: "wallet-session:sess-eoa-app-001",
        sessionId: "sess-eoa-app-001",
        walletAddress: "8A2...1eF",
      });
      await expect(reopenedRepository.health()).resolves.toMatchObject({
        recordCount: 1,
        selectedMode: "durable_test",
        status: "ready",
      });
      expectNoForbiddenFragments(
        await reopenedRepository.getBySessionId("sess-eoa-app-001"),
        ["durable-raw-signature"],
      );
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
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

  it("reports durable local persistence health across runtime recreation", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "campaign-os-runtime-health-json-"));

    try {
      const runtimeConfigOptions = {
        persistence: {
          localDataDir: tempDir,
          mode: "local_json" as const,
        },
      };
      const firstRuntime = createCampaignOsApiRuntime({ runtimeConfigOptions });

      const walletSession = await firstRuntime.handle({
        method: "POST",
        path: "/api/wallet/session",
        headers: { "x-campaign-os-trace-id": "trace-durable-wallet" },
        body: JSON.stringify({
          adapterName: "PortkeyDiscoverWallet",
          fixtureId: "sess-eoa-app-001",
          nonce: "nonce-durable-health",
          signature: "raw-durable-health-signature",
        }),
      });
      const verification = await firstRuntime.handle({
        method: "POST",
        path: "/api/tasks/task-bridge/verify",
        headers: { "x-campaign-os-trace-id": "trace-durable-verification" },
        body: JSON.stringify({
          accountType: "AA",
          campaignId: campaignDetail.id,
          walletAddress: "2F4...9aB",
          walletSource: "PORTKEY_AA",
        }),
      });
      const exportPreview = await firstRuntime.handle({
        method: "POST",
        path: `/api/campaigns/${campaignDetail.id}/export`,
        headers: { "x-campaign-os-trace-id": "trace-durable-export-preview" },
        body: JSON.stringify({
          contractRootMode: "none",
          format: "json",
          includeLocalePreference: true,
          includeRiskFlags: true,
          includeWalletType: true,
        }),
      });
      const firstHealth = await firstRuntime.handle({
        method: "GET",
        path: "/api/health",
        headers: { "x-campaign-os-trace-id": "trace-durable-health-first" },
      });
      const recreatedRuntime = createCampaignOsApiRuntime({ runtimeConfigOptions });
      const recreatedHealth = await recreatedRuntime.handle({
        method: "GET",
        path: "/api/health",
        headers: { "x-campaign-os-trace-id": "trace-durable-health-recreated" },
      });

      expect(expectSuccessData<LocalServiceEnvelope<WalletSessionPayload> & {
        persistence: unknown;
      }>(walletSession).persistence).toMatchObject({
        kind: "wallet_session",
      });
      expect(expectSuccessData<LocalServiceEnvelope<VerificationPayload> & {
        persistence: unknown;
      }>(verification).persistence).toMatchObject({
        kind: "verification_attempt",
      });
      expect(expectSuccessData<LocalServiceEnvelope<ExportPreviewPayload> & {
        persistence: unknown;
      }>(exportPreview)).toMatchObject({
        payload: expect.objectContaining({
          artifactRegistry: expect.objectContaining({
            routeId: "campaigns.export.preview",
            safety: expect.objectContaining({
              localReviewOnly: true,
              objectKeyEnabled: false,
              signedUrlEnabled: false,
              storageWriteEnabled: false,
            }),
          }),
          format: "json",
        }),
        persistence: {
          kind: "export_preview",
          recordId: expect.any(String),
        },
      });

      const expectedPersistenceHealth = {
        adapterLabel: expect.stringMatching(/^local_json:/),
        adapterPortId: "campaign-os-local-json-adapter",
        countsByKind: expect.objectContaining({
          export_preview: 1,
          verification_attempt: 1,
          wallet_session: 1,
        }),
        durable: true,
        localOnly: true,
        mode: "local_json",
        noMigrationRunner: true,
        noProductionDatabase: true,
        noSecretHandling: true,
        recordCount: 3,
        status: "ok",
      };

      expect(expectSuccessData(firstHealth)).toMatchObject({
        persistence: expectedPersistenceHealth,
      });
      expect(expectSuccessData(recreatedHealth)).toMatchObject({
        backendService: expect.objectContaining({
          databaseAdapterRuntime: expect.objectContaining({
            liveConnectionAttempted: false,
            liveQueryExecutionEnabled: false,
            productionDbRuntime: expect.objectContaining({
              driverProductionReady: false,
            }),
          }),
          persistenceRuntime: expect.objectContaining({
            liveExecutionEnabled: false,
            status: "active_local",
          }),
        }),
        persistence: expectedPersistenceHealth,
      });
      expect(expectSuccessData<{
        persistence: {
          latestRecords: Array<{ kind: string }>;
        };
      }>(recreatedHealth).persistence.latestRecords.map((record) => record.kind)).toEqual(
        expect.arrayContaining(["wallet_session", "verification_attempt", "export_preview"]),
      );
      expectNoForbiddenFragments(recreatedHealth.body, [
        tempDir,
        "nonce-durable-health",
        "raw-durable-health-signature",
        "campaign-os-kitty",
        "/docs/current",
        "/kitty-specs",
        "/evidence/",
        "/sync/",
      ]);
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
  });

  it("fails closed when durable local runtime configuration is incomplete", async () => {
    const blockedRuntime = createCampaignOsApiRuntime({
      runtimeConfigOptions: {
        env: {
          CAMPAIGN_OS_PERSISTENCE_MODE: "local_json",
        },
      },
    });

    const health = await blockedRuntime.handle({
      method: "GET",
      path: "/api/health",
      headers: { "x-campaign-os-trace-id": "trace-durable-config-blocked" },
    });

    expect(health.status).toBe(400);
    expect(health.body).toMatchObject({
      ok: false,
      traceId: "trace-durable-config-blocked",
      error: {
        code: "INVALID_REQUEST",
        details: {
          diagnosticCodes: ["MISSING_LOCAL_PERSISTENCE_DIR"],
          fallbackUsed: false,
          field: "runtimeConfig.persistence.localDataDir",
          persistenceMode: "local_json",
          status: "blocked",
        },
      },
    });
    expectNoForbiddenFragments(health.body, [
      "memory",
      "campaign-os-kitty",
      "/docs/current",
      "/kitty-specs",
      "/evidence/",
      "/sync/",
    ]);
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

  it("keeps committed Campaign DB writes successful when the independent audit repository is unavailable", async () => {
    const runtimeWithFailingAudit = createCampaignOsApiRuntime({
      repository: createFailingRepository(),
    });
    const create = await runtimeWithFailingAudit.handle({
      method: "POST",
      path: "/api/campaigns",
      headers: projectOwnerAuthHeaders("audit-owner-001", {
        "x-campaign-os-trace-id": "trace-audit-create-unavailable",
      }),
      body: JSON.stringify({
        duration: "2026-08-01/2026-08-14",
        endTime: "2026-08-14T23:59:59Z",
        goal: "Keep the durable Campaign result authoritative",
        ownerAddress: "audit-owner-001",
        projectId: "audit-project-001",
        rewardDescription: "Audit failure must not reverse the business write.",
        startTime: "2026-08-01T00:00:00Z",
      }),
    });
    const created = expectSuccessData<LocalServiceEnvelope<CampaignDraftPayload> & {
      persistence: {
        code: string;
        kind: string;
        operation: string;
        status: string;
        traceId: string;
      };
    }>(create);
    const task = await runtimeWithFailingAudit.handle({
      method: "POST",
      path: `/api/campaigns/${created.payload.id}/tasks`,
      headers: { "x-campaign-os-trace-id": "trace-audit-task-unavailable" },
      body: JSON.stringify({
        evidenceRule: { minAmount: 1, source: "AELFSCAN" },
        points: 25,
        required: true,
        templateCode: "bridge_ebridge",
        verificationType: "ON_CHAIN",
        walletCompatibility: "ANY",
      }),
    });
    const taskResult = expectSuccessData<LocalServiceEnvelope<TaskDraftPayload> & {
      campaignDbTask: { taskId: string };
      persistence: { code: string; kind: string; status: string; traceId: string };
    }>(task);
    const verification = await runtimeWithFailingAudit.handle({
      method: "POST",
      path: `/api/tasks/${taskResult.campaignDbTask.taskId}/verify`,
      headers: { "x-campaign-os-trace-id": "trace-audit-verification-unavailable" },
      body: JSON.stringify({
        accountType: "EOA",
        campaignId: created.payload.id,
        walletAddress: "2F4AuditWallet",
        walletSource: "PORTKEY_EOA_EXTENSION",
      }),
    });
    const detail = await runtimeWithFailingAudit.handle({
      method: "GET",
      path: `/api/campaigns/${created.payload.id}`,
      headers: { "x-campaign-os-trace-id": "trace-audit-detail" },
    });

    expect(created.persistence).toEqual({
      code: "PERSISTENCE_UNAVAILABLE",
      kind: "campaign_draft",
      operation: "record",
      status: "unavailable",
      traceId: "trace-audit-create-unavailable",
    });
    expect(taskResult.persistence).toMatchObject({
      code: "PERSISTENCE_UNAVAILABLE",
      kind: "task_draft",
      status: "unavailable",
      traceId: "trace-audit-task-unavailable",
    });
    expect(expectSuccessData<LocalServiceEnvelope<VerificationPayload> & {
      campaignDbCompletion: { completionId: string };
      persistence: { code: string; kind: string; status: string; traceId: string };
    }>(verification)).toMatchObject({
      campaignDbCompletion: { completionId: expect.any(String) },
      persistence: {
        code: "PERSISTENCE_UNAVAILABLE",
        kind: "verification_attempt",
        status: "unavailable",
        traceId: "trace-audit-verification-unavailable",
      },
    });
    expect(expectSuccessData<LocalServiceEnvelope<CampaignDetailPayload>>(detail).payload).toMatchObject({
      item: { id: created.payload.id },
      tasks: [expect.objectContaining({ taskId: taskResult.campaignDbTask.taskId })],
    });
    await runtimeWithFailingAudit.close();
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

  it("composes one PostgreSQL Campaign pool and closes runtime resources once", async () => {
    let backgroundErrorListener: ((error: unknown) => void) | undefined;
    const onError = vi.fn((listener: (error: unknown) => void) => {
      backgroundErrorListener = listener;
    });
    const pool = {
      end: vi.fn(async () => undefined),
      onError,
      query: vi.fn(async () => ({ rows: [] })),
    };
    const poolFactory = vi.fn(() => pool);
    const errorLog = vi.fn();
    const walletSessionRepository = createWalletSessionRepository();
    const walletClose = vi.spyOn(walletSessionRepository, "close");
    const composedRuntime = createCampaignOsApiRuntime({
      campaignDbPoolFactory: poolFactory,
      logger: { error: errorLog },
      runtimeConfigOptions: {
        env: {
          CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
          CAMPAIGN_OS_DATABASE_SSL_MODE: "disable",
          CAMPAIGN_OS_DATABASE_URL: "postgres://local-user:local-password@127.0.0.1/campaign_os_test",
        },
      },
      walletSessionRepository,
    });

    expect(poolFactory).toHaveBeenCalledTimes(1);
    expect(poolFactory).toHaveBeenCalledWith(expect.objectContaining({
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 10_000,
      max: 10,
      ssl: false,
    }));
    expect(onError).toHaveBeenCalledTimes(1);
    backgroundErrorListener?.(new Error(
      "postgres://runtime-user:runtime-password@db.internal/campaign_os private query value",
    ));
    const backgroundErrorLog = errorLog.mock.calls.flat().join("\n");

    expect(backgroundErrorLog).toContain("code=CAMPAIGN_DB_POOL_BACKGROUND_ERROR");
    expect(backgroundErrorLog).toMatch(/traceId=[0-9a-f-]{36}/);
    expect(backgroundErrorLog).not.toContain("runtime-password");
    expect(backgroundErrorLog).not.toContain("db.internal");
    expect(backgroundErrorLog).not.toContain("private query value");
    const firstClose = composedRuntime.close();
    const secondClose = composedRuntime.close();

    expect(firstClose).toBe(secondClose);
    await firstClose;
    expect(pool.end).toHaveBeenCalledTimes(1);
    expect(walletClose).toHaveBeenCalledTimes(1);
  });

  it("maps repository i18n infrastructure diagnostics to a safe 503", async () => {
    const baseRepository = createCampaignDbRepository();
    const campaign = await baseRepository.createDraft({
      duration: "2026-08-01/2026-08-14",
      endTime: "2026-08-14T23:59:59Z",
      goal: "Classify repository i18n infrastructure failure",
      ownerAddress: "repo-owner-i18n-infrastructure",
      projectId: "repo-project-i18n-infrastructure",
      rewardDescription: "Repository-backed i18n infrastructure review.",
      startTime: "2026-08-01T00:00:00Z",
      supportedLocales: ["en-US", "zh-CN"],
    });
    const generateI18nDraft = vi.fn(async () => {
      throw new CampaignDbRepositoryError(
        "PostgreSQL Campaign store schema is not ready.",
        [{
          code: "POSTGRES_CAMPAIGN_STORE_SCHEMA_NOT_READY",
          field: "schemaVersion",
          message: "PostgreSQL Campaign store schema is not ready.",
          severity: "error",
        }],
      );
    });
    const i18nRuntime = createCampaignOsApiRuntime({
      campaignDbRepository: {
        ...baseRepository,
        generateI18nDraft,
      },
    });
    const response = await i18nRuntime.handle({
      body: JSON.stringify({
        contentKeys: ["title"],
        sourceLocale: "en-US",
        targetLocale: "zh-CN",
      }),
      headers: { "x-campaign-os-trace-id": "trace-campaign-db-i18n-infrastructure" },
      method: "POST",
      path: `/api/campaigns/${campaign.id}/i18n/generate`,
    });

    expect(generateI18nDraft).toHaveBeenCalledTimes(1);
    expect(response).toMatchObject({
      status: 503,
      body: {
        error: {
          code: "PERSISTENCE_UNAVAILABLE",
          details: {
            diagnosticCode: "POSTGRES_CAMPAIGN_STORE_SCHEMA_NOT_READY",
            operation: "campaignDb.generateI18nDraft",
          },
        },
        ok: false,
        traceId: "trace-campaign-db-i18n-infrastructure",
      },
    });
    await i18nRuntime.close();
  });

  it("keeps the default local runtime from constructing a PostgreSQL pool", async () => {
    const poolFactory = vi.fn();
    const localRuntime = createCampaignOsApiRuntime({
      campaignDbPoolFactory: poolFactory,
      runtimeConfigOptions: { env: {} },
    });

    const response = await localRuntime.handle({
      headers: { "x-campaign-os-trace-id": "trace-default-local-campaign-db" },
      method: "GET",
      path: "/api/health",
    });

    expect(response.status).toBe(200);
    expect(poolFactory).not.toHaveBeenCalled();
    await localRuntime.close();
  });

  it("keeps PostgreSQL Campaign reads authoritative without seeded shadow records", async () => {
    const authoritativeRuntime = createCampaignOsApiRuntime({
      campaignDbRepository: createCampaignDbRepository(),
      runtimeConfigOptions: {
        env: {
          CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
          CAMPAIGN_OS_DATABASE_SSL_MODE: "disable",
          CAMPAIGN_OS_DATABASE_URL: "postgres://local-user:local-password@127.0.0.1/campaign_os_test",
        },
      },
    });

    const list = await authoritativeRuntime.handle({
      headers: { "x-campaign-os-trace-id": "trace-postgres-authoritative-list" },
      method: "GET",
      path: "/api/campaigns",
    });
    const detail = await authoritativeRuntime.handle({
      headers: { "x-campaign-os-trace-id": "trace-postgres-authoritative-detail" },
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}`,
    });
    const addTask = await authoritativeRuntime.handle({
      body: JSON.stringify({
        evidenceRule: { minAmount: 1, source: "AELFSCAN" },
        points: 10,
        required: true,
        templateCode: "bridge_ebridge",
        verificationType: "ON_CHAIN",
        walletCompatibility: "ANY",
      }),
      headers: {
        "content-type": "application/json",
        "x-campaign-os-trace-id": "trace-postgres-authoritative-task",
      },
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/tasks`,
    });
    const eligibility = await authoritativeRuntime.handle({
      headers: { "x-campaign-os-trace-id": "trace-postgres-authoritative-eligibility" },
      method: "GET",
      path: `/api/campaigns/${campaignDetail.id}/eligibility?address=${encodeURIComponent("2F4SeededShadow")}&accountType=EOA&walletSource=PORTKEY_EOA_EXTENSION`,
    });
    const exportPreview = await authoritativeRuntime.handle({
      body: JSON.stringify({
        contractRootMode: "none",
        format: "json",
      }),
      headers: { "x-campaign-os-trace-id": "trace-postgres-authoritative-export" },
      method: "POST",
      path: `/api/campaigns/${campaignDetail.id}/export`,
    });

    expect(expectSuccessData<LocalServiceEnvelope<CampaignListPayload>>(list).payload.items).toEqual([]);
    expect(detail.status).toBe(404);
    expect(addTask.status).toBe(404);
    expect(eligibility.status).toBe(404);
    expect(exportPreview.status).toBe(404);
    await authoritativeRuntime.close();
  });

  it("preserves safe PostgreSQL health classification and the request Trace ID", async () => {
    const repository = createCampaignDbRepository();
    const health = vi.fn(async () => {
      throw new PostgresCampaignStoreError({
        code: "POSTGRES_CAMPAIGN_STORE_QUERY_FAILED",
        field: "database",
        operation: "manifest",
        traceId: "trace-postgres-health",
      });
    });
    const healthRuntime = createCampaignOsApiRuntime({
      campaignDbRepository: { ...repository, health },
    });
    const response = await healthRuntime.handle({
      headers: { "x-campaign-os-trace-id": "trace-postgres-health" },
      method: "GET",
      path: "/api/health",
    });

    expect(health).toHaveBeenCalledWith({ traceId: "trace-postgres-health" });
    expect(response).toMatchObject({
      status: 503,
      body: {
        error: {
          code: "PERSISTENCE_UNAVAILABLE",
          details: {
            diagnosticCode: "POSTGRES_CAMPAIGN_STORE_QUERY_FAILED",
            operation: "campaignDb.health",
          },
        },
        ok: false,
        traceId: "trace-postgres-health",
      },
    });
    await healthRuntime.close();
  });

  it("loads the PostgreSQL driver lazily instead of through a static runtime import", async () => {
    const source = await readFile(join(process.cwd(), "src/server/apiRuntime.ts"), "utf8");
    const sourceFile = ts.createSourceFile(
      "apiRuntime.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const prohibitedLoads: string[] = [];
    const visit = (node: ts.Node) => {
      if (
        ts.isImportDeclaration(node)
        && ts.isStringLiteral(node.moduleSpecifier)
        && node.moduleSpecifier.text === "pg"
      ) {
        prohibitedLoads.push("static import");
      }
      if (
        ts.isCallExpression(node)
        && ts.isIdentifier(node.expression)
        && node.expression.text === "require"
        && node.arguments.length === 1
        && ts.isStringLiteral(node.arguments[0])
        && node.arguments[0].text === "pg"
      ) {
        prohibitedLoads.push("require");
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    expect(prohibitedLoads).toEqual([]);
  });

  it("waits for every runtime resource to close even when one close rejects", async () => {
    let releaseCampaignClose: (() => void) | undefined;
    const campaignClose = vi.fn(() => new Promise<void>((resolve) => {
      releaseCampaignClose = resolve;
    }));
    const walletClose = vi.fn(async () => {
      throw new Error("wallet close failed");
    });
    const closeRuntime = createCampaignOsApiRuntime({
      campaignDbRepository: {
        ...createCampaignDbRepository(),
        close: campaignClose,
      },
      walletSessionRepository: {
        ...createWalletSessionRepository(),
        close: walletClose,
      },
    });
    let settled = false;
    const closePromise = closeRuntime.close().finally(() => {
      settled = true;
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);
    expect(campaignClose).toHaveBeenCalledTimes(1);
    expect(walletClose).toHaveBeenCalledTimes(1);

    releaseCampaignClose?.();
    await expect(closePromise).rejects.toMatchObject({
      body: {
        code: "PERSISTENCE_UNAVAILABLE",
        details: { operation: "walletSessionRepository.close" },
      },
    });
    expect(settled).toBe(true);
  });

  it("blocks invalid explicit PostgreSQL config without constructing a pool", async () => {
    const poolFactory = vi.fn();
    const blockedRuntime = createCampaignOsApiRuntime({
      campaignDbPoolFactory: poolFactory,
      runtimeConfigOptions: {
        env: {
          CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
        },
      },
    });
    const response = await blockedRuntime.handle({
      headers: { "x-campaign-os-trace-id": "trace-postgres-config-blocked" },
      method: "GET",
      path: "/api/health",
    });

    expect(poolFactory).not.toHaveBeenCalled();
    expect(response).toMatchObject({
      status: 400,
      body: {
        error: {
          code: "INVALID_REQUEST",
          details: {
            diagnosticCodes: ["CAMPAIGN_DB_DATABASE_URL_REQUIRED"],
            fallbackUsed: false,
            field: "CAMPAIGN_OS_DATABASE_URL",
            persistenceMode: "postgres",
            status: "blocked",
          },
        },
        ok: false,
        traceId: "trace-postgres-config-blocked",
      },
    });
    await blockedRuntime.close();
  });
});
